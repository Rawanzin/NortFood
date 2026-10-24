const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const {randomUUID:uuid}=require('node:crypto');const {PGlite}=require('@electric-sql/pglite');
test('Vencimento, cursor composto, cargos e localização com PostgreSQL local',async t=>{
 const db=new PGlite();await db.waitReady;
 try{
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create publication supabase_realtime;set time zone 'UTC';`);
 // Permitido somente neste banco descartável: 001 prepara a sequência real completa.
 for(const file of (await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
 const admin=uuid(),owner=uuid(),staff=uuid(),client=uuid(),other=uuid();for(const id of [admin,owner,staff,client,other])await db.query('insert into auth.users values($1,$2)',[id,{name:'Teste',role:'admin',phone:'38999999999',terms_version:'2026-10-public-v2'}]);await db.query('insert into private.admin_users(user_id) values($1)',[admin]);
 async function as(id,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}}
 const call=(name,args=[])=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args).then(r=>r.rows[0].v);
 const deny=(id,name,args,pattern)=>assert.rejects(()=>as(id,()=>call(name,args)),pattern||/FORBIDDEN|REQUIRED/);
 const store=await as(owner,()=>call('nf_request_store',['Loja Local'])),privateStore=await as(other,()=>call('nf_request_store',['Loja Privada']));await db.query("insert into public.store_memberships values($1,$2,'staff')",[store,staff]);
 const category=await as(admin,()=>call('nf_admin_category',[null,'Lanches',true]));await as(admin,()=>call('nf_admin_store',[store,'approved','Teste local']));await as(admin,()=>call('nf_admin_pilot',[true,'Teste local']));
 const data={name:'Loja Local',street:'Rua Original',number:'10',neighborhood:'Centro',city:'Porteirinha',opens_at:'00:00',closes_at:'23:59',working_days:[0,1,2,3,4,5,6],pickup_enabled:true,delivery_enabled:true,minimum_cents:0,payment_methods:['cash']};
 const save=(who,patch={},id=store)=>as(who,()=>call('nf_save_store',[id,{...data,...patch},[category],[]]));
 let product,order;
 await t.test('Salvar, preservar, editar, remover e aceitar zero; staff mantém poderes existentes',async()=>{
  await save(owner,{latitude:0,longitude:0});let row=(await db.query('select latitude,longitude from public.stores where id=$1',[store])).rows[0];assert.deepEqual(row,{latitude:0,longitude:0});
  await save(staff,{description:'Staff autorizado'});assert.equal((await db.query('select latitude from public.stores where id=$1',[store])).rows[0].latitude,0);
  await save(staff,{latitude:-15.74,longitude:-43.02});await save(owner,{latitude:null,longitude:null});assert.equal((await db.query('select longitude from public.stores where id=$1',[store])).rows[0].longitude,null);await save(owner,{latitude:-15.74,longitude:-43.02});
  assert.equal((await as(staff,()=>call('nf_context'))).is_admin,false);await deny(staff,'nf_admin_pilot',[false,'Fraude'],/ADMIN_REQUIRED/);
 });
 await t.test('Coordenadas inválidas e edição cruzada negadas, com rollback do perfil',async()=>{
  for(const patch of [{latitude:1},{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:null,longitude:0},{latitude:'NaN',longitude:0},{latitude:'Infinity',longitude:0},{latitude:'0',longitude:0},{latitude:{},longitude:0}])await assert.rejects(()=>save(owner,patch),/INVALID_COORDINATES/);
  for(const val of ['NaN','Infinity','-Infinity'])await assert.rejects(()=>db.query('update public.stores set latitude=$1,longitude=0 where id=$2',[val,store]),/check constraint/);
  await deny(other,'nf_save_store',[store,data,[category],[]],/STORE_FORBIDDEN/);await assert.rejects(()=>save(owner,{latitude:1,longitude:1},privateStore),/STORE_FORBIDDEN/);
  await assert.rejects(()=>as(owner,()=>call('nf_save_store',[store,{...data,latitude:10,longitude:20},[],[]])),/INVALID_CATEGORIES/);assert.equal((await db.query('select latitude from public.stores where id=$1',[store])).rows[0].latitude,-15.74);
  await save(owner,{status:'approved',user_id:other,member_role:'owner'});assert.equal((await db.query('select count(*)::int n from public.store_memberships where store_id=$1 and user_id=$2',[store,other])).rows[0].n,0);
 });
 await t.test('Visibilidade pública conforme RLS, endpoint único e base privada não executável',async()=>{
  const rows=(await as(null,()=>db.query('select id,latitude,longitude from public.stores'))).rows;assert.equal(rows.length,1);assert.equal(rows[0].latitude,-15.74);const catalog=await as(null,()=>call('nf_catalog'));assert.equal(catalog[0].longitude,-43.02);assert.equal(catalog.some(s=>s.id===privateStore),false);
  await assert.rejects(()=>as(client,()=>db.query('select status_reason from public.stores')),/permission denied/);
  await assert.rejects(()=>as(owner,()=>db.query('select private.save_store_base($1,$2,$3,$4)',[store,data,[category],[]])),/permission denied/);
  for(const name of ['nf_save_store','nf_order_history'])assert.equal((await db.query("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname=$1",[name])).rows[0].n,1);
 });
 await t.test('Retirada congela endereço e coordenadas; alterações futuras não mudam destino',async()=>{
  await as(owner,()=>call('nf_set_store_open',[store,true,false]));product=await as(owner,()=>call('nf_save_product',[store,null,{name:'Produto',price_cents:1000},[]]));
  order=await as(client,()=>call('nf_place_order',[{idempotency_key:uuid(),store_id:store,fulfillment:'pickup',payment_method:'cash',expected_total_cents:1000,items:[{product_id:product,quantity:1,option_ids:[]}]}]));
  await save(owner,{street:'Rua Nova',latitude:0,longitude:0});const old=(await as(client,()=>call('nf_order_detail',[order]))).address_snapshot;assert.equal(old.street,'Rua Original');assert.equal(old.latitude,-15.74);assert.equal(old.longitude,-43.02);
 });
 await t.test('Conclusão única vence completed_at + 7 dias; cancelamentos e valor zero não cobram',async()=>{
  for(const [v,next] of ['accepted','preparing','ready_for_pickup'].entries())await as(staff,()=>call('nf_transition',[order,next,v,'']));
  const attempts=await Promise.allSettled([as(staff,()=>call('nf_transition',[order,'picked_up',3,''])),as(staff,()=>call('nf_transition',[order,'picked_up',3,'']))]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  const charge=(await db.query("select l.amount_cents,l.due_at=o.completed_at+interval '7 days' exact,extract(epoch from l.due_at-o.completed_at)::integer seconds from public.orders o join public.commission_ledger l on l.order_id=o.id where o.id=$1",[order])).rows[0];assert.deepEqual(charge,{amount_cents:50,exact:true,seconds:604800});
  const due=(await db.query('select due_at from public.commission_ledger where order_id=$1',[order])).rows[0].due_at;await as(admin,()=>call('nf_admin_adjust',[order,10,'Ajuste positivo']));await as(admin,()=>call('nf_admin_settle',[order,20,uuid(),'Recibo','Pagamento parcial']));await as(admin,()=>call('nf_admin_adjust',[order,-5,'Ajuste negativo']));assert.deepEqual((await db.query("select due_at from public.commission_ledger where order_id=$1 and kind='charge'",[order])).rows[0].due_at,due);
  const make=()=>as(client,()=>call('nf_place_order',[{idempotency_key:uuid(),store_id:store,fulfillment:'pickup',payment_method:'cash',expected_total_cents:1000,items:[{product_id:product,quantity:1,option_ids:[]}]}]));const cancel=await make();await as(client,()=>call('nf_transition',[cancel,'cancelled',0,'']));const reject=await make();await as(owner,()=>call('nf_transition',[reject,'rejected',0,'']));assert.equal((await db.query('select count(*)::int n from public.commission_ledger where order_id=any($1::uuid[])',[[cancel,reject]])).rows[0].n,0);
  await as(admin,()=>call('nf_admin_rate',[0,'Isenção no teste']));const free=await make();for(const [v,next] of ['accepted','preparing','ready_for_pickup','picked_up'].entries())await as(owner,()=>call('nf_transition',[free,next,v,'']));assert.equal((await db.query('select count(*)::int n from public.commission_ledger where order_id=$1',[free])).rows[0].n,0);
 });
 await t.test('Paginação não omite nem duplica timestamps iguais e mantém isolamento',async()=>{
  const stamp='2026-01-01T12:00:00.123456Z',ids=[];for(let i=0;i<9;i++){const id=uuid();ids.push(id);await db.query(`insert into public.orders(id,customer_id,store_id,idempotency_key,payload,fulfillment,payment_method,customer_name,address_snapshot,store_name,subtotal_cents,total_cents,delivery_cents,commission_rate_bps,created_at) values($1,$2,$3,$4,'{}','pickup','cash','Teste','{}','Loja',1000,1000,0,500,$5)`,[id,client,store,uuid(),stamp]);}
  let cursor=null,found=[];for(let i=0;i<20;i++){const rows=await as(client,()=>call('nf_order_history',[cursor?.created_at||null,3,cursor?.id||null]));if(!rows.length)break;found.push(...rows.map(o=>o.id));cursor=rows.at(-1);}assert.equal(new Set(found).size,found.length);assert.deepEqual(found.filter(id=>ids.includes(id)),ids.sort().reverse());assert.equal((await as(other,()=>call('nf_order_history',[null,3,null]))).length,0);await deny(client,'nf_order_history',[stamp,3,null],/INVALID_CURSOR/);
 });
 await t.test('Saldo vencido antes, no instante e depois; pagamentos e ajustes preservam prazo',async()=>{
  await db.exec('begin');try{const fixtures=[];for(const shift of ['1 microsecond','0 seconds','-1 microsecond']){const id=uuid();fixtures.push(id);await db.query(`insert into public.orders(id,customer_id,store_id,idempotency_key,payload,fulfillment,payment_method,customer_name,address_snapshot,store_name,subtotal_cents,total_cents,delivery_cents,commission_rate_bps,status,completed_at) values($1,$2,$3,$4,'{}','pickup','cash','Teste','{}','Loja',2000,2000,0,500,'picked_up',now()-interval '7 days'+$5::interval)`,[id,client,store,uuid(),shift]);await db.query("insert into public.commission_ledger(store_id,order_id,kind,amount_cents,rate_bps,reason,due_at) select store_id,id,'charge',100,500,'Fixture',completed_at+interval '7 days' from public.orders where id=$1",[id]);}
   const today=(await db.query("select (now() at time zone 'America/Sao_Paulo')::date d")).rows[0].d;const report=()=>as(owner,()=>call('nf_report',[store,today,today]));assert.equal((await report()).overdue_cents,200);
   await as(admin,()=>call('nf_admin_settle',[fixtures[1],50,uuid(),'Parcial','Pagamento parcial']));await as(admin,()=>call('nf_admin_settle',[fixtures[2],100,uuid(),'Total','Pagamento total']));assert.equal((await report()).overdue_cents,50);
   await as(admin,()=>call('nf_admin_adjust',[fixtures[1],20,'Acréscimo permitido']));await as(admin,()=>call('nf_admin_adjust',[fixtures[1],-10,'Redução permitida']));assert.equal((await report()).overdue_cents,60);assert.equal((await db.query("select bool_and(l.due_at=o.completed_at+interval '7 days') ok from public.commission_ledger l join public.orders o on o.id=l.order_id where l.kind='charge'")).rows[0].ok,true);
   const example=(await db.query("select to_char(('2026-10-15 14:00:00-03'::timestamptz+interval '7 days') at time zone 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') d")).rows[0].d;assert.equal(example,'2026-10-22 14:00');
  }finally{await db.exec('rollback')}
 });
 }finally{await db.close()}
});
