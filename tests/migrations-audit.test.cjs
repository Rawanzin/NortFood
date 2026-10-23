const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const crypto=require('node:crypto');const {PGlite}=require('@electric-sql/pglite');const {foundationFixture}=require('./helpers/foundation-fixture.cjs');
const uuid=()=>crypto.randomUUID();
async function base(){const db=new PGlite();await db.waitReady;await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant all on storage.objects to anon,authenticated;`);await foundationFixture(db);return db;}
async function apply(db,n){await db.exec(await fs.readFile('supabase/migrations/20261012000'+n+(['','','_operations.sql','_storage_realtime.sql','_reporting.sql'][n]),'utf8'));}
test('Auditoria de ACL, entradas hostis, Storage e integridade',async t=>{
 const db=await base();try{
 // Simula grants herdados perigosos e políticas Storage excessivamente amplas.
 await db.exec('grant all on all tables in schema public to public;grant select(status_reason) on public.stores to public;grant select(customer_id,order_id) on public.reviews to public;create policy broad_storage on storage.objects for all to anon,authenticated using(true) with check(true);create table public.external_feed(id integer primary key);create publication supabase_realtime for table public.external_feed;');
 const before=(await db.query("select count(*)::int n from public.platform_settings")).rows[0].n;
 for(const n of [2,3,4])await apply(db,n);
 const admin=uuid(),customer=uuid(),other=uuid(),seller=uuid();for(const id of [admin,customer,other,seller])await db.query('insert into auth.users values($1,$2)',[id,{name:'Teste',role:'admin'}]);await db.query('insert into private.admin_users(user_id) values($1)',[admin]);
 async function as(id,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}}
 const call=(name,args=[])=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args).then(r=>r.rows[0].v);
 const deny=(id,name,args,pattern)=>assert.rejects(()=>as(id,()=>call(name,args)),pattern);
 let store,product,order,cat;
 await t.test('ACL herdada neutralizada; RLS e admin privado preservados',async()=>{
  assert.equal((await db.query('select count(*)::int n from public.platform_settings')).rows[0].n,before);
  for(const role of ['anon','authenticated'])for(const priv of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) ok',[role,'private.admin_users',priv])).rows[0].ok,false);
  assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='private' and tablename='admin_users'")).rows[0].n,0);
  assert.equal((await as(admin,()=>call('nf_context'))).is_admin,true);assert.equal((await as(customer,()=>call('nf_context'))).is_admin,false);
  for(const role of ['anon','authenticated'])for(const table of ['orders','products','commission_ledger','profiles'])for(const priv of ['INSERT','UPDATE','DELETE','TRUNCATE'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) ok',[role,'public.'+table,priv])).rows[0].ok,false);
  assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' and c.relname<>'external_feed' and not relrowsecurity")).rows[0].n,0);
 });
 await t.test('RPCs SECURITY DEFINER com search_path fixo e superfície anônima mínima',async()=>{
  const functions=(await db.query("select p.oid,p.proname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and left(p.proname,3)='nf_'")).rows;
  assert.equal(functions.length,33);for(const f of functions){assert.equal(f.prosecdef,true);assert.ok(f.proconfig.includes('search_path=""'));assert.equal(f.anon,['nf_catalog','nf_operating_status'].includes(f.proname));}
  await deny(null,'nf_context',[],/permission denied/);await deny(customer,'nf_admin_rate',[1000,'Fraude'],/ADMIN_REQUIRED/);
 });
 await t.test('Motivos internos de loja não expostos pelo catálogo nem coluna direta',async()=>{
  store=await as(seller,()=>call('nf_request_store',['Loja']));cat=await as(admin,()=>call('nf_admin_category',[null,'Lanches',true]));await as(admin,()=>call('nf_admin_store',[store,'approved','Motivo interno sensível']));
  assert.equal('status_reason' in (await as(null,()=>call('nf_catalog')))[0],false);assert.equal('status_reason' in (await as(customer,()=>call('nf_catalog')))[0],false);assert.equal((await as(seller,()=>call('nf_catalog')))[0].status_reason,'Motivo interno sensível');
  await assert.rejects(()=>as(customer,()=>db.query('select status_reason from public.stores')),/permission denied/);
  await as(seller,()=>call('nf_save_store',[store,{name:'Loja',street:'Rua',number:'1',neighborhood:'Centro',city:'Porteirinha',opens_at:'00:00',closes_at:'23:59',working_days:[0,1,2,3,4,5,6],pickup_enabled:true,delivery_enabled:true,minimum_cents:0,payment_methods:['cash']},[cat],[]]));await as(seller,()=>call('nf_set_store_open',[store,true,false]));
 });
 await t.test('Entradas nulas e dados malformados não causam alterações parciais',async()=>{
  await deny(admin,'nf_admin_store',[store,'approved',null],/REASON_REQUIRED/);await deny(admin,'nf_admin_rate',[700,null],/REASON_REQUIRED/);await deny(admin,'nf_admin_pilot',[true,null],/REASON_REQUIRED/);await deny(admin,'nf_admin_category',[null,null,true],/INVALID_CATEGORY/);
  await deny(seller,'nf_save_product',[store,null,{name:'Inválido',price_cents:100},[{name:'Grupo',min_choices:0,max_choices:1}]],/INVALID_OPTION_GROUP/);assert.equal((await db.query('select count(*)::int n from public.products')).rows[0].n,0);
  product=await as(seller,()=>call('nf_save_product',[store,null,{name:'Produto',price_cents:1000},[]]));await as(admin,()=>call('nf_admin_pilot',[true,'Teste local']));
  const request={idempotency_key:uuid(),store_id:store,fulfillment:'pickup',payment_method:'cash',items:[{product_id:product,quantity:1,option_ids:[]}],expected_total_cents:1000};order=await as(customer,()=>call('nf_place_order',[request]));await deny(seller,'nf_transition',[order,'accepted',null,''],/ORDER_CONFLICT/);assert.equal((await db.query('select version from public.orders where id=$1',[order])).rows[0].version,0);
  await deny(seller,'nf_transition',[order,null,0,''],/INVALID_TRANSITION/);await deny(customer,'nf_place_order',[{...request,idempotency_key:uuid(),items:null}],/INVALID_CART/);
 });
 await t.test('Status, detalhes, pagamentos e histórico isolados por identidade',async()=>{
  await deny(other,'nf_order_detail',[order],/ORDER_FORBIDDEN/);assert.equal((await as(other,()=>call('nf_order_history',[null,50]))).length,0);await deny(other,'nf_confirm_payment',[order],/STORE_FORBIDDEN/);
  for(const [version,next] of ['accepted','preparing','ready_for_pickup','picked_up'].entries())await as(seller,()=>call('nf_transition',[order,next,version,'']));
  await as(customer,()=>call('nf_review',[order,4,'Bom']));await assert.rejects(()=>as(other,()=>db.query('select customer_id,order_id from public.reviews')),/permission denied/);assert.equal((await as(null,()=>db.query('select rating from public.reviews'))).rows[0].rating,4);
 });
 await t.test('Quitação rejeita motivo nulo e repetição com payload diferente',async()=>{
  await deny(admin,'nf_admin_settle',[order,10,uuid(),'Recibo',null],/REASON_REQUIRED/);const key=uuid();const id=await as(admin,()=>call('nf_admin_settle',[order,10,key,'Recibo','Recebido']));assert.equal(await as(admin,()=>call('nf_admin_settle',[order,10,key,'Recibo','Recebido'])),id);await deny(admin,'nf_admin_settle',[order,10,key,'Outra referência','Recebido'],/IDEMPOTENCY_CONFLICT/);await deny(admin,'nf_admin_settle',[order,null,key,'Recibo','Recebido'],/IDEMPOTENCY_CONFLICT/);
 });
 await t.test('Históricos imutáveis inclusive UPDATE, DELETE e TRUNCATE privilegiados',async()=>{
  for(const table of ['commission_ledger','commission_settlements','order_events','admin_audit_logs']){await assert.rejects(()=>db.exec('delete from public.'+table),/APPEND_ONLY_HISTORY/);await assert.rejects(()=>db.exec('truncate public.'+table+' cascade'),/APPEND_ONLY_HISTORY/);}
 });
 await t.test('Storage protege lojas privadas, caminhos inválidos e escritas mesmo com política ampla',async()=>{
  const pending=await as(other,()=>call('nf_request_store',['Privada']));for(const path of [store+'/public.png',pending+'/private.png','not-a-uuid/image.png'])await db.query("insert into storage.objects(bucket_id,name) values('store-media',$1)",[path]);
  assert.deepEqual((await as(null,()=>db.query("select name from storage.objects where bucket_id='store-media'"))).rows.map(r=>r.name),[store+'/public.png']);assert.equal((await as(other,()=>db.query("select name from storage.objects where bucket_id='store-media'"))).rows.length,2);
  for(const who of [null,seller,admin]){await assert.rejects(()=>as(who,()=>db.query("insert into storage.objects(bucket_id,name) values('store-media',$1)",[store+'/evil.png'])),/row-level security/);assert.equal((await as(who,()=>db.query("delete from storage.objects where bucket_id='store-media' returning id"))).rows.length,0);assert.equal((await as(who,()=>db.query("update storage.objects set name='evil' where bucket_id='store-media' returning id"))).rows.length,0);}
 });
 await t.test('Realtime adiciona somente tabelas previstas e preserva publicação existente',async()=>{
  assert.deepEqual((await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename")).rows.map(r=>r.tablename),['external_feed','messages','notifications','orders']);
  assert.equal((await as(other,()=>db.query('select id from public.orders'))).rows.length,0);assert.equal((await as(null,()=>db.query('select id from public.notifications').catch(e=>({denied:e.code})))).denied,'42501');
 });
 await t.test('Limites, serialização e idempotência de chat/solicitações preservados',async()=>{
  const c=await as(customer,()=>call('nf_chat',[store])),key=uuid();const id=await as(customer,()=>call('nf_send_message',[c,'Teste',key]));await db.query("insert into public.messages(conversation_id,sender_id,sender_name,body,client_key) select $1,$2,'Teste','Limite',gen_random_uuid() from generate_series(1,30)",[c,customer]);assert.equal(await as(customer,()=>call('nf_send_message',[c,'Teste',key])),id);await deny(customer,'nf_send_message',[c,'Nova',uuid()],/RATE_LIMIT/);
  for(const name of ['nf_place_order','nf_send_message','nf_request_store','nf_save_address','nf_data_request','nf_admin_settle'])assert.match((await db.query("select pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname=$1",[name])).rows[0].def,/pg_advisory_xact_lock/);
  const request=await as(customer,()=>call('nf_data_request',['access',null]));await deny(admin,'nf_admin_request',[request,'processing',null],/INVALID_REQUEST_STATUS/);await as(admin,()=>call('nf_admin_request',[request,'processing','Tratamento']));
 });
 await t.test('Relatório vencido inclui ajustes sem vencimento e quitações por pedido',async()=>{
  const old=uuid();await db.query(`insert into public.orders(id,customer_id,store_id,idempotency_key,payload,status,fulfillment,payment_method,customer_name,address_snapshot,store_name,subtotal_cents,delivery_cents,total_cents,commission_rate_bps,completed_at) select $1,customer_id,store_id,gen_random_uuid(),'{}','delivered',fulfillment,payment_method,customer_name,address_snapshot,store_name,subtotal_cents,delivery_cents,total_cents,commission_rate_bps,now() from public.orders where id=$2`,[old,order]);
  await db.query("insert into public.commission_ledger(store_id,order_id,kind,amount_cents,rate_bps,reason,due_at) values($1,$2,'charge',100,500,'Fixture',now()-interval '1 day'),($1,$2,'adjustment',-30,500,'Fixture',null)",[store,old]);await db.query("insert into public.commission_settlements(order_id,store_id,amount_cents,operation_key,reference,reason,actor_id) values($1,$2,20,$3,'Fixture','Fixture',$4)",[old,store,uuid(),admin]);
  const today=(await db.query("select (now() at time zone 'America/Sao_Paulo')::date d")).rows[0].d;assert.equal((await as(seller,()=>call('nf_report',[store,today,today]))).overdue_cents,50);await deny(seller,'nf_report',[store,'infinity','infinity'],/INVALID_PERIOD/);
 });
 }finally{await db.close()}
});
test('Bucket previamente público causa rollback sem alterar bucket ou dados',async()=>{const db=await base();try{await apply(db,2);await db.exec("insert into storage.buckets values('store-media','store-media',true,1048576,array['image/png','image/jpeg','image/webp'])");await assert.rejects(()=>apply(db,3),/STORE_MEDIA_BUCKET_CONFIG_CONFLICT/);await db.exec('rollback');assert.equal((await db.query("select public from storage.buckets where id='store-media'")).rows[0].public,true);assert.equal((await db.query("select count(*)::int n from pg_policies where policyname='nf_media_read'")).rows[0].n,0);}finally{await db.close()}});
