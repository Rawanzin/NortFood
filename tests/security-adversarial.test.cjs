// Ataques somente contra PostgreSQL WASM descartável e identidades fictícias.
// Não abre rede, não usa .env e não representa um teste remoto de JWT/PostgREST.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),{randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite');
const securityMigration='202610310015_security_audit.sql';
test('Etapa 10: autorização e manipulação financeira em banco descartável',async t=>{
 const db=new PGlite();await db.waitReady;
 try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
   create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}');
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
   create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
  for(const file of (await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')&&f!==securityMigration).sort())await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
  const ids={admin:randomUUID(),a:randomUUID(),b:randomUUID(),sellerA:randomUUID(),sellerB:randomUUID()};
  for(const [name,id]of Object.entries(ids))await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,name+'@example.test',{name:'Pessoa sintética '+name,role:'admin',is_admin:true,phone:'38999999999',terms_version:'2026-10-public-v2'}]);
  await db.query('insert into private.admin_users(user_id) values($1)',[ids.admin]);
  const as=async(id,fn)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}};
  const call=(name,args=[])=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args).then(r=>r.rows[0].v);
  const denied=(id,fn,re=/permission denied|FORBIDDEN|REQUIRED|INVALID_TRANSITION/)=>assert.rejects(()=>as(id,fn),re);
  const reserved=(await db.query("insert into public.stores(name,status,paused,payment_methods) values('Marca Sintética Reservada','draft',true,'{}') returning id")).rows[0].id;
  await db.query('insert into private.store_invitations(store_id,email) values($1,$2)',[reserved,'verified-owner@example.test']);
  let legacyDuplicate;
  await t.test('Reprodução anterior: RPC legado permite homônimo reservado',async()=>{
   legacyDuplicate=await as(ids.sellerB,()=>call('nf_request_store',['MarcaSintéticaReservada']));assert.notEqual(legacyDuplicate,reserved);
  });
  const storeA=await as(ids.sellerA,()=>call('nf_request_store',['Loja Sintética A']));
  const storeB=await as(ids.sellerB,()=>call('nf_request_store',['Loja Sintética B']));
  await as(ids.admin,()=>call('nf_admin_store_limit',[2,'Fixture de isolamento']));
  for(const s of [storeA,storeB])await as(ids.admin,()=>call('nf_admin_store',[s,'approved','Somente banco descartável']));
  const category=(await db.query('select id from public.categories limit 1')).rows[0].id;
  const data={name:'Loja Sintética A',description:'Fixture isolada',phone:'38999999999',whatsapp:'38999999999',street:'Rua Sintética',number:'1',neighborhood:'Centro',city:'Porteirinha',opens_at:'00:00',closes_at:'23:59',working_days:[0,1,2,3,4,5,6],pickup_enabled:true,delivery_enabled:true,minimum_cents:0,estimate_minutes:20,payment_methods:['cash']};
  await as(ids.sellerA,()=>call('nf_save_store',[storeA,data,[category],[{neighborhood:'Centro',fee_cents:500}]]));
  await as(ids.sellerA,()=>call('nf_set_store_open',[storeA,true,false]));
  await as(ids.admin,()=>call('nf_admin_pilot',[true,'Somente banco descartável']));
  const product=await as(ids.sellerA,()=>call('nf_save_product',[storeA,null,{name:'Produto sintético',price_cents:2000,available:true},[]]));
  const address=await as(ids.a,()=>call('nf_save_address',[null,{label:'Casa',street:'Rua Sintética',number:'2',neighborhood:'Centro',city:'Porteirinha',state:'MG'}]));
  const request=()=>({idempotency_key:randomUUID(),store_id:storeA,fulfillment:'delivery',address_id:address,payment_method:'cash',expected_total_cents:2500,items:[{product_id:product,quantity:1,option_ids:[]}]});
  const order=await as(ids.a,()=>call('nf_place_order',[request()]));
  await t.test('Reprodução anterior: versão do pedido alheio produz oráculo',async()=>{
   await denied(ids.b,()=>call('nf_transition',[order,'cancelled',99,'']),/ORDER_CONFLICT/);
  });
  const snapshot=()=>db.query(`select jsonb_build_object('stores',(select jsonb_agg(to_jsonb(x) order by id) from public.stores x),'orders',(select jsonb_agg(to_jsonb(x) order by id) from public.orders x),'products',(select jsonb_agg(to_jsonb(x) order by id) from public.products x),'memberships',(select jsonb_agg(to_jsonb(x) order by store_id,user_id) from public.store_memberships x),'invitations',(select jsonb_agg(to_jsonb(x) order by store_id) from private.store_invitations x)) value`).then(r=>r.rows[0].value);
  const before=await snapshot();await db.exec(await fs.readFile('supabase/migrations/'+securityMigration,'utf8'));
  await t.test('Migração 015 preserva integralmente registros, pedidos e vínculos',async()=>assert.deepEqual(await snapshot(),before));
  await t.test('Reteste: nome reservado bloqueado em ambas RPCs; conta não adquire vínculo real',async()=>{
   for(const rpc of ['nf_request_store','nf_create_store_draft'])await denied(ids.b,()=>call(rpc,['MarcaSintéticaReservada']),/STORE_RESERVED/);
   assert.equal((await db.query('select count(*)::int n from public.store_memberships where store_id=$1',[reserved])).rows[0].n,0);
   assert.deepEqual(await snapshot(),before);
  });
  await t.test('Reteste: versão/UUID alheios retornam ORDER_FORBIDDEN uniformemente',async()=>{
   for(const id of [order,randomUUID()])for(const version of [0,99])await denied(ids.b,()=>call('nf_transition',[id,'cancelled',version,'']),/ORDER_FORBIDDEN/);
   await denied(ids.a,()=>call('nf_transition',[order,'cancelled',99,'']),/ORDER_CONFLICT/);
  });
  await t.test('E-mail de convite forjado em user_metadata não adquire loja reservada',async()=>{
   await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data||$2::jsonb,email_confirmed_at=now() where id=$1",[ids.b,{email:'verified-owner@example.test',email_verified:true,store_id:reserved}]);
   assert.equal(await as(ids.b,()=>call('nf_claim_store_invitation')),0);
   assert.equal((await db.query('select count(*)::int n from public.store_memberships where store_id=$1',[reserved])).rows[0].n,0);
   assert.equal((await db.query('select claimed_by from private.store_invitations where store_id=$1',[reserved])).rows[0].claimed_by,null);
  });
  await t.test('RLS habilitado em todas tabelas públicas/privadas e objetos Storage',async()=>{
   const rows=(await db.query("select n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in('public','private') or n.nspname='storage' and c.relname='objects')")).rows;
   assert.ok(rows.length>=30);assert.ok(rows.every(r=>r.relrowsecurity));
  });
  await t.test('Funções SECURITY DEFINER usam search_path fixo e RPCs autenticadas sem EXECUTE anônimo',async()=>{
   const rows=(await db.query("select n.nspname,p.proname,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prosecdef")).rows;
   assert.ok(rows.length>40);assert.ok(rows.every(r=>r.proconfig?.includes('search_path=""')));
   assert.deepEqual(rows.filter(r=>r.nspname==='public'&&r.anon).map(r=>r.proname).sort(),['nf_catalog','nf_operating_status','nf_table_context']);
  });
  await t.test('Anônimo não lê contas, endereços, pedidos, histórico, financeiro ou admin',async()=>{
   for(const table of ['profiles','addresses','orders','order_items','messages','commission_ledger','commission_settlements','admin_audit_logs'])await assert.rejects(()=>as(null,()=>db.query('select * from public.'+table)),/permission denied/);
   for(const rpc of ['nf_context','nf_snapshot','nf_admin_dashboard','nf_order_history'])await denied(null,()=>call(rpc),/permission denied/);
  });
  await t.test('Metadados role/admin não concedem privilégio; escrita direta em ACL e settings negada',async()=>{
   assert.equal((await as(ids.a,()=>call('nf_context'))).is_admin,false);
   await denied(ids.a,()=>db.query('insert into private.admin_users(user_id) values($1)',[ids.a]));
   await denied(ids.a,()=>db.query('insert into public.store_memberships(store_id,user_id) values($1,$2)',[storeA,ids.a]));
   await denied(ids.a,()=>db.exec('update public.platform_settings set pilot_enabled=true,commission_rate_bps=0'));
   await denied(ids.a,()=>call('nf_admin_dashboard'));await denied(ids.a,()=>call('nf_admin_rate',[0,'Fraude']));
  });
  await t.test('Cliente B não lê nem altera dados do cliente A ou pedido A por ID',async()=>{
   for(const table of ['addresses','orders','order_items','order_events','conversations','notifications','messages'])assert.deepEqual((await as(ids.b,()=>db.query('select * from public.'+table))).rows,[]);
   await denied(ids.b,()=>call('nf_order_detail',[order]),/ORDER_FORBIDDEN/);
   await denied(ids.b,()=>call('nf_save_address',[address,{street:'Fraude',number:'1',neighborhood:'Centro'}]),/ADDRESS_FORBIDDEN/);
   await denied(ids.b,()=>call('nf_place_order',[request()]),/ADDRESS_FORBIDDEN/);
   await denied(ids.b,()=>call('nf_confirm_payment',[order]),/STORE_FORBIDDEN/);
  });
  await t.test('Vendedor B não controla catálogo, configuração, entrega, relatório ou pedidos A',async()=>{
   await denied(ids.sellerB,()=>call('nf_save_store',[storeA,data,[category],[]]),/STORE_FORBIDDEN/);
   await denied(ids.sellerB,()=>call('nf_save_product',[storeA,product,{name:'Fraude',price_cents:1},[]]),/STORE_FORBIDDEN/);
   await denied(ids.sellerB,()=>call('nf_product_action',[product,'archive',null]),/STORE_FORBIDDEN/);
   await denied(ids.sellerB,()=>call('nf_set_fulfillment',[storeA,false,false]),/STORE_FORBIDDEN/);
   await denied(ids.sellerB,()=>call('nf_report',[storeA,'2026-10-31','2026-10-31']),/STORE_FORBIDDEN/);
   await denied(ids.sellerB,()=>call('nf_transition',[order,'accepted',0,'']),/ORDER_FORBIDDEN/);
   assert.equal((await as(ids.sellerB,()=>call('nf_snapshot'))).orders.length,0);
  });
  await t.test('Total, preço unitário, frete, desconto, comissão e confirmação são do servidor',async()=>{
   const bad=request();bad.expected_total_cents=1;await denied(ids.a,()=>call('nf_place_order',[bad]),/PRICE_CHANGED/);
   const forged=request();Object.assign(forged,{discount_cents:2000,commission_rate_bps:0,delivery_cents:0,payment_confirmed_at:'2026-10-31T00:00:00Z',coupon:'FRAUDE'});forged.items[0].unit_price_cents=1;
   const id=await as(ids.a,()=>call('nf_place_order',[forged]));const row=(await db.query('select * from public.orders where id=$1',[id])).rows[0];
   assert.equal(row.total_cents,2500);assert.equal(row.discount_cents,0);assert.equal(row.delivery_cents,500);assert.equal(row.commission_rate_bps,500);assert.equal(row.payment_confirmed_at,null);
   for(const table of ['orders','order_items','commission_ledger'])await denied(ids.a,()=>db.exec('update public.'+table+' set '+(table==='orders'?'total_cents=1':table==='order_items'?'unit_price_cents=1':'amount_cents=1')));
  });
  await t.test('Quantidades/identificadores inválidos e SQL injection não criam pedidos',async()=>{
   const n=(await db.query('select count(*)::int n from public.orders')).rows[0].n;
   for(const quantity of [0,-1,21,null]){const bad=request();bad.items[0].quantity=quantity;await denied(ids.a,()=>call('nf_place_order',[bad]),/INVALID_QUANTITY/);}
   const bad=request();bad.store_id="' OR 1=1 --";await denied(ids.a,()=>call('nf_place_order',[bad]),/invalid input syntax/);
   const foreign=request();foreign.items[0].product_id=randomUUID();await denied(ids.a,()=>call('nf_place_order',[foreign]),/PRODUCT_UNAVAILABLE/);
   assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,n);
  });
  await t.test('Idempotência impede duplicar pedido e cupom não implementado não concede desconto',async()=>{
   const r=request();r.coupon='SEM-DESCONTO';const first=await as(ids.a,()=>call('nf_place_order',[r]));assert.equal(await as(ids.a,()=>call('nf_place_order',[r])),first);
   r.coupon='OUTRO';await denied(ids.a,()=>call('nf_place_order',[r]),/IDEMPOTENCY_CONFLICT/);
   assert.equal((await db.query('select discount_cents from public.orders where id=$1',[first])).rows[0].discount_cents,0);
  });
  await t.test('Status de pagamento não é confirmável por cliente; vendedor autorizado mantém fluxo',async()=>{
   await denied(ids.a,()=>call('nf_confirm_payment',[order]),/STORE_FORBIDDEN/);
   await denied(ids.sellerB,()=>call('nf_confirm_payment',[order]),/STORE_FORBIDDEN/);
   await as(ids.sellerA,()=>call('nf_confirm_payment',[order]));const row=(await db.query('select payment_confirmed_by from public.orders where id=$1',[order])).rows[0];assert.equal(row.payment_confirmed_by,ids.sellerA);
  });
  await t.test('Modalidades desligadas impedem API direta e preservam pedidos anteriores',async()=>{
   await as(ids.sellerA,()=>call('nf_set_fulfillment',[storeA,false,true]));await denied(ids.a,()=>call('nf_place_order',[request()]),/DELIVERY_UNAVAILABLE/);
   await as(ids.sellerA,()=>call('nf_set_fulfillment',[storeA,true,false]));const r=request();r.fulfillment='pickup';r.address_id=null;r.expected_total_cents=2000;await denied(ids.a,()=>call('nf_place_order',[r]),/PICKUP_UNAVAILABLE/);
   await as(ids.sellerA,()=>call('nf_set_fulfillment',[storeA,false,false]));await denied(ids.a,()=>call('nf_place_order',[request()]),/STORE_UNAVAILABLE/);
   assert.equal((await as(ids.a,()=>call('nf_order_detail',[order]))).total_cents,2500);
   await as(ids.sellerA,()=>call('nf_set_fulfillment',[storeA,true,true]));
  });
  await t.test('Chat é privado; remetente real vem de auth.uid e texto SQL/HTML fica como dados',async()=>{
   const c=await as(ids.a,()=>call('nf_chat',[storeA]));const payload='<img src=x onerror="alert(1)">\'; DROP TABLE public.orders; --';
   const m=await as(ids.a,()=>call('nf_send_message',[c,payload,randomUUID()]));const row=(await db.query('select body,sender_id from public.messages where id=$1',[m])).rows[0];assert.equal(row.body,payload);assert.equal(row.sender_id,ids.a);
   await denied(ids.b,()=>call('nf_send_message',[c,'Fraude',randomUUID()]),/CHAT_FORBIDDEN/);
   await denied(ids.sellerB,()=>call('nf_send_message',[c,'Fraude',randomUUID()]),/CHAT_FORBIDDEN/);
   assert.deepEqual((await as(ids.b,()=>db.query('select * from public.messages'))).rows,[]);
  });
  await t.test('Buckets privados e funções de reserva não acessíveis a anon/clientes',async()=>{
   assert.ok((await db.query('select public from storage.buckets')).rows.every(row=>row.public===false));
   await denied(ids.a,()=>call('nf_reserve_media_upload',[storeA,ids.sellerA,100]),/permission denied/);
   await denied(ids.a,()=>call('nf_reserve_avatar_upload',[ids.b,100]),/permission denied/);
   await denied(ids.a,()=>call('nf_set_profile_avatar',[ids.b+'/'+randomUUID()+'.webp']),/INVALID_AVATAR_PATH/);
  });
  await t.test('Storage: lojas em rascunho e avatar alheio não são lidos; escrita direta negada',async()=>{
   await db.exec('grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;');
   const publicImage=storeA+'/'+randomUUID()+'.png',draftImage=reserved+'/'+randomUUID()+'.png',avatarA=ids.a+'/'+randomUUID()+'.webp',avatarB=ids.b+'/'+randomUUID()+'.webp';
   for(const [bucket,name]of [['store-media',publicImage],['store-media',draftImage],['profile-avatars',avatarA],['profile-avatars',avatarB]])await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',[bucket,name]);
   assert.deepEqual((await as(null,()=>db.query('select name from storage.objects'))).rows.map(r=>r.name),[publicImage]);
   assert.deepEqual((await as(ids.a,()=>db.query('select name from storage.objects order by name'))).rows.map(r=>r.name),[avatarA,publicImage].sort());
   // Mesmo uma futura policy permissiva não deve abrir esses dois buckets.
   await db.exec('create policy synthetic_future_allow on storage.objects for all to anon,authenticated using(true) with check(true);');
   assert.deepEqual((await as(ids.a,()=>db.query('select name from storage.objects order by name'))).rows.map(r=>r.name),[avatarA,publicImage].sort());
   for(const id of [null,ids.a]){
    await assert.rejects(()=>as(id,()=>db.query("insert into storage.objects(bucket_id,name) values('store-media',$1)",[publicImage+'.evil'])),/row-level security/);
    await assert.rejects(()=>as(id,()=>db.query("insert into storage.objects(bucket_id,name) values('profile-avatars',$1)",[avatarA+'.evil'])),/row-level security/);
    assert.deepEqual((await as(id,()=>db.query("update storage.objects set name=name where bucket_id in('store-media','profile-avatars') returning id"))).rows,[]);
    assert.deepEqual((await as(id,()=>db.query("delete from storage.objects where bucket_id in('store-media','profile-avatars') returning id"))).rows,[]);
    await assert.rejects(()=>as(id,()=>db.exec('truncate storage.objects')),/permission denied/);
   }
  });
  await t.test('Favorites/reviews/rascunhos/configurações internas não cruzam identidades',async()=>{
   await as(ids.a,()=>db.query('insert into public.favorites(user_id,store_id) values($1,$2)',[ids.a,storeA]));
   assert.deepEqual((await as(ids.b,()=>db.query('select * from public.favorites'))).rows,[]);
   await denied(ids.b,()=>db.query('insert into public.favorites(user_id,store_id) values($1,$2)',[ids.a,storeA]),/row-level security/);
   await denied(ids.b,()=>call('nf_review',[order,1,'Fraude']),/REVIEW_FORBIDDEN/);
   await denied(ids.a,()=>db.query('select customer_id,order_id from public.reviews'),/permission denied/);
   await as(ids.sellerA,()=>call('nf_save_store_draft',[storeA,{about:'Rascunho privado'},0]));
   assert.deepEqual((await as(ids.sellerB,()=>db.query('select * from public.store_drafts where store_id=$1',[storeA]))).rows,[]);
   for(const table of ['admin_users','store_invitations','catalog_imports','account_onboarding','media_upload_reservations','avatar_upload_reservations'])await denied(ids.a,()=>db.query('select * from private.'+table),/permission denied/);
  });
  await t.test('Bloqueio de piloto permanece obrigatório no servidor',async()=>{
   await as(ids.admin,()=>call('nf_admin_pilot',[false,'Fim do teste isolado']));await denied(ids.a,()=>call('nf_place_order',[request()]),/PILOT_NOT_ENABLED/);
  });
  if(process.env.NORTFOOD_SECURITY_EVIDENCE){
   const path=require('node:path'),dir=path.resolve(process.env.NORTFOOD_SECURITY_EVIDENCE);await fs.mkdir(dir,{recursive:true});
   const tables=(await db.query("select n.nspname schema,c.relname name,c.relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in('public','private') or n.nspname='storage' and c.relname='objects') order by 1,2")).rows;
   const policies=(await db.query("select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in('public','private','storage') and policyname<>'synthetic_future_allow' order by 1,2,3")).rows;
   const functions=(await db.query("select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) arguments,p.prosecdef security_definer,p.proconfig configuration,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,has_function_privilege('service_role',p.oid,'EXECUTE') service_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') order by 1,2,3")).rows;
   const buckets=(await db.query('select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id')).rows;
   await fs.writeFile(path.join(dir,'local-security-inventory.json'),JSON.stringify({scope:'Disposable PGlite, no network or real identities',tables,policies,functions,buckets},null,2)+'\n');
  }
 }finally{await db.close()}
});
