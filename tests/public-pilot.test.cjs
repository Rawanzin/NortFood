const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
test('Piloto PostgreSQL: categorias permanentes, rascunhos privados, uma loja e autorização administrativa',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
  for(const file of (await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
  const admin=randomUUID(),owner=randomUUID(),other=randomUUID();
  for(const id of [admin,owner,other])await db.query('insert into auth.users values($1,$2)',[id,{name:'Conta sintética',role:'admin'}]);
  await db.query('insert into private.admin_users(user_id) values($1)',[admin]);
  async function as(id,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}}
  const call=(name,args=[])=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args).then(r=>r.rows[0].v);
  assert.equal((await db.query('select count(*)::int n from public.categories')).rows[0].n,11);
  assert.equal((await db.query('select count(*)::int n from public.stores')).rows[0].n,0);
  assert.equal((await as(owner,()=>call('nf_context'))).is_admin,false);
  const store=await as(owner,()=>call('nf_create_store_draft',['Loja sintética A']));
  assert.equal(await as(owner,()=>call('nf_create_store_draft',['Loja sintética A'])),store);
  assert.deepEqual(await as(null,()=>call('nf_catalog')),[]);
  await assert.rejects(()=>as(admin,()=>call('nf_admin_store',[store,'approved','Teste local'])),/STORE_NOT_SUBMITTED/);
  await assert.rejects(()=>as(owner,()=>call('nf_submit_store',[store])),/STORE_INCOMPLETE/);
  assert.equal(await as(owner,()=>call('nf_save_store_draft',[store,{about:'Trabalho em andamento',payments:['cash']},0])),1);
  await assert.rejects(()=>as(owner,()=>call('nf_save_store_draft',[store,{about:'Conflito'},0])),/DRAFT_CONFLICT/);
  await assert.rejects(()=>as(other,()=>call('nf_save_store_draft',[store,{},1])),/STORE_FORBIDDEN/);
  assert.deepEqual(await as(other,()=>call('nf_store_drafts')),[]);
  await assert.rejects(()=>as(null,()=>call('nf_store_drafts')),/permission denied/);
  await assert.rejects(()=>as(owner,()=>call('nf_save_store_draft',[store,{role:'admin'},1])),/INVALID_STORE_DATA/);
  const cat='c0000000-0000-4000-8000-000000000001';
  await as(owner,()=>call('nf_save_store',[store,{name:'Loja sintética A',description:'Somente teste local',phone:'38999999999',whatsapp:'38999999999',street:'Rua sintética',number:'1',neighborhood:'Bairro sintético',city:'Porteirinha',opens_at:'10:00',closes_at:'22:00',working_days:[0,1,2,3,4,5,6],pickup_enabled:true,delivery_enabled:false,minimum_cents:0,estimate_minutes:20,payment_methods:['cash']},[cat],[]]));
  await as(owner,()=>call('nf_save_product',[store,null,{name:'Produto sintético',description:'Teste',price_cents:1200,category:'Hambúrgueres',available:true},[]]));
  await as(owner,()=>call('nf_submit_store',[store]));
  assert.deepEqual(await as(null,()=>call('nf_catalog')),[]);
  await assert.rejects(()=>as(owner,()=>call('nf_admin_store',[store,'approved','Fraude'])),/ADMIN_REQUIRED/);
  await as(admin,()=>call('nf_admin_store',[store,'approved','Fixture isolada autorizada']));
  const second=await as(other,()=>call('nf_request_store',['Loja sintética B']));
  await assert.rejects(()=>as(admin,()=>call('nf_admin_store',[second,'approved','Segunda loja'])),/PILOT_STORE_LIMIT/);
  assert.equal((await as(null,()=>call('nf_catalog'))).length,1);
  assert.equal(await as(null,()=>call('nf_operating_status')),false);
  await assert.rejects(()=>as(owner,()=>call('nf_admin_store_limit',[2,'Fraude'])),/ADMIN_REQUIRED/);
  await as(admin,()=>call('nf_admin_store',[store,'suspended','Pausa de teste']));
  assert.deepEqual(await as(null,()=>call('nf_catalog')),[]);
  assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' and not relrowsecurity")).rows[0].n,0);
 }finally{await db.close();}
});
