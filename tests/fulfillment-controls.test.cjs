const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {randomUUID:uuid}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');

test('Modalidades: quatro combinações, isolamento de lojas, API e pedidos anteriores',async t=>{
 const db=new PGlite();await db.waitReady;
 try{
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`);
 await require('./helpers/foundation-fixture.cjs').foundationFixture(db);
 for(const file of (await fs.readdir('supabase/migrations')).sort().filter(f=>!f.startsWith('202610120001_')))await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
 const admin=uuid(),owner=uuid(),other=uuid(),customer=uuid();
 for(const [id,name] of [[admin,'Admin teste'],[owner,'Vendedor A'],[other,'Vendedor B'],[customer,'Cliente teste']])await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{name,phone:'38999999999',terms_version:'2026-10-public-v2'}]);
 await db.query('insert into private.admin_users(user_id) values($1)',[admin]);
 async function as(id,fn){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}}
 const call=(name,args=[])=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args).then(r=>r.rows[0].value);
 const store=await as(owner,()=>call('nf_request_store',['Loja sintética A']));
 const second=await as(other,()=>call('nf_request_store',['Loja sintética B']));
 const cat=await as(admin,()=>call('nf_admin_category',[null,'Lanches',true]));
 await as(admin,()=>call('nf_admin_store',[store,'approved','Somente teste local']));
 await as(admin,()=>call('nf_admin_pilot',[true,'Somente banco descartável']));
 await as(owner,()=>call('nf_save_store',[store,{name:'Loja sintética A',street:'Rua sintética',number:'1',neighborhood:'Centro',city:'Porteirinha',opens_at:'00:00',closes_at:'23:59',working_days:[0,1,2,3,4,5,6],pickup_enabled:true,delivery_enabled:true,minimum_cents:0,payment_methods:['cash']},[cat],[{neighborhood:'Centro',city:'Porteirinha',fee_cents:500}]]));
 await as(owner,()=>call('nf_set_store_open',[store,true,false]));
 const product=await as(owner,()=>call('nf_save_product',[store,null,{name:'Produto sintético',price_cents:1000,category:'Lanches',available:true},[]]));
 const address=await as(customer,()=>call('nf_save_address',[null,{label:'Teste',street:'Rua fictícia',number:'2',neighborhood:'Centro',city:'Porteirinha',state:'MG'}]));
 const request=fulfillment=>({idempotency_key:uuid(),store_id:store,fulfillment,address_id:fulfillment==='delivery'?address:null,payment_method:'cash',expected_total_cents:fulfillment==='delivery'?1500:1000,items:[{product_id:product,quantity:1,option_ids:[]}]});
 let previous;
 await t.test('Sem login, cliente e outro vendedor não podem alterar a loja A',async()=>{
  for(const id of [null,customer,other])await assert.rejects(()=>as(id,()=>call('nf_set_fulfillment',[store,false,false])),/permission denied|STORE_FORBIDDEN/);
  await assert.rejects(()=>as(owner,()=>call('nf_set_fulfillment',[second,false,false])),/STORE_FORBIDDEN/);
  await assert.rejects(()=>as(owner,()=>call('nf_set_fulfillment',[store,null,true])),/INVALID_FULFILLMENT/);
 });
 await t.test('Entrega e retirada simultâneas: pedidos calculados no servidor',async()=>{
  previous=await as(customer,()=>call('nf_place_order',[request('delivery')]));
  const pickup=await as(customer,()=>call('nf_place_order',[request('pickup')]));
  assert.equal((await db.query('select delivery_cents from public.orders where id=$1',[pickup])).rows[0].delivery_cents,0);
 });
 await t.test('Somente retirada rejeita entrega por API; catálogo atualiza sem mudar taxas',async()=>{
  await as(owner,()=>call('nf_set_fulfillment',[store,false,true]));
  await assert.rejects(()=>as(customer,()=>call('nf_place_order',[request('delivery')])),/DELIVERY_UNAVAILABLE/);
  await as(customer,()=>call('nf_place_order',[request('pickup')]));
  const s=(await as(null,()=>call('nf_catalog'))).find(s=>s.id===store);assert.equal(s.delivery_enabled,false);assert.equal(s.pickup_enabled,true);assert.equal(s.is_open,true);assert.equal(s.zones[0].fee_cents,500);
 });
 await t.test('Somente entrega rejeita retirada por API',async()=>{
  await as(owner,()=>call('nf_set_fulfillment',[store,true,false]));
  await assert.rejects(()=>as(customer,()=>call('nf_place_order',[request('pickup')])),/PICKUP_UNAVAILABLE/);
  await as(customer,()=>call('nf_place_order',[request('delivery')]));
 });
 await t.test('Nenhuma modalidade fecha novos pedidos; preserva pedido, frete e comissão originais',async()=>{
  const before=(await db.query('select * from public.orders where id=$1',[previous])).rows[0];
  await as(owner,()=>call('nf_set_fulfillment',[store,false,false]));
  for(const fulfillment of ['delivery','pickup','dine_in'])await assert.rejects(()=>as(customer,()=>call('nf_place_order',[request(fulfillment)])),/STORE_UNAVAILABLE/);
  assert.equal((await as(null,()=>call('nf_catalog'))).find(s=>s.id===store).is_open,false);
  assert.deepEqual((await db.query('select * from public.orders where id=$1',[previous])).rows[0],before);
  await as(owner,()=>call('nf_transition',[previous,'accepted',0,'']));
  await as(owner,()=>call('nf_set_fulfillment',[store,true,true]));
  const after=(await db.query('select * from public.stores where id=$1',[store])).rows[0];assert.equal(after.open_override,true);assert.equal(after.paused,false);
 });
 }finally{await db.close();}
});
