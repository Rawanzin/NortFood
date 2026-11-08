const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite');
test('Private merchant drafts preserve the full address and category; optimistic locking and isolation remain enforced',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
  const files=(await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
  for(const file of files.filter(f=>!f.includes('0016_')))await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
  const owner=randomUUID(),other=randomUUID();for(const id of [owner,other])await db.query('insert into auth.users(id) values($1)',[id]);
  const as=async(id,fn)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}};
  const call=(name,args=[])=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args).then(r=>r.rows[0].v);
  const store=await as(owner,()=>call('nf_create_store_draft',['TESTE RASCUNHO COMPLETO']));
  const payload={name:'TESTE RASCUNHO COMPLETO',state:'SP',postal_code:'01001-000',address_reference:'Referência sintética',primaryCategory:'c0000000-0000-4000-8000-000000000001'};
  await assert.rejects(()=>as(owner,()=>call('nf_save_store_draft',[store,payload,0])),/INVALID_STORE_DATA/,'Proves the pre-fix server rejection');
  await db.exec(await fs.readFile('supabase/migrations/'+files.find(f=>f.includes('0016_')),'utf8'));
  assert.equal(await as(owner,()=>call('nf_save_store_draft',[store,payload,0])),1);
  assert.deepEqual((await as(owner,()=>call('nf_store_drafts')))[0].data,payload);
  await assert.rejects(()=>as(owner,()=>call('nf_save_store_draft',[store,payload,0])),/DRAFT_CONFLICT/);
  await assert.rejects(()=>as(other,()=>call('nf_save_store_draft',[store,payload,1])),/STORE_FORBIDDEN/);
  assert.deepEqual(await as(other,()=>call('nf_store_drafts')),[]);
  for(const extra of [{role:'admin'},{state:{admin:true}},{postal_code:'1'.repeat(11)},{primaryCategory:[]},{address_reference:'a'.repeat(121)}])await assert.rejects(()=>as(owner,()=>call('nf_save_store_draft',[store,{...payload,...extra},1])),/INVALID_STORE_DATA/);
  assert.equal((await db.query('select version from public.store_drafts where store_id=$1',[store])).rows[0].version,1);
  const saved=(await db.query('select * from public.stores where id=$1',[store])).rows[0];assert.equal(saved.state,'MG');assert.equal(saved.status,'draft');assert.equal(saved.paused,true);assert.equal(saved.delivery_enabled,false);
  assert.equal((await db.query('select pilot_enabled from public.platform_settings')).rows[0].pilot_enabled,false);
 }finally{await db.close();}
});
