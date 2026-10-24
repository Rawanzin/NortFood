const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite');
test('Onboarding SQL real: rascunho atômico, retomada, convite verificado e isolamento',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
  for(const f of (await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await fs.readFile('supabase/migrations/'+f,'utf8'));
  const seller=randomUUID(),other=randomUUID(),owner=randomUUID();for(const [id,email]of [[seller,'seller@example.test'],[other,'other@example.test'],[owner,'owner@example.test']])await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,email,{name:'Pessoa de teste',role:'admin'}]);
  const as=async(id,fn)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}};
  const call=(name,args=[])=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args).then(r=>r.rows[0].v);
  const args=['Responsável de Teste','LOJA SINTÉTICA','(38) 99999-9999',true];
  await assert.rejects(()=>as(seller,()=>call('nf_complete_seller',[...args.slice(0,3),false])),/TERMS_REQUIRED/);
  await assert.rejects(()=>as(seller,()=>call('nf_complete_seller',[args[0],args[1],'123',true])),/INVALID_STORE_PHONE/);
  assert.equal((await db.query('select count(*)::int n from public.stores')).rows[0].n,0);
  const id=await as(seller,()=>call('nf_complete_seller',args));assert.equal(await as(seller,()=>call('nf_complete_seller',args)),id);
  const store=(await db.query('select * from public.stores where id=$1',[id])).rows[0];assert.equal(store.status,'draft');assert.equal(store.paused,true);assert.equal(store.phone,'38999999999');assert.equal(store.whatsapp,'');assert.deepEqual(store.payment_methods,[]);assert.equal(store.delivery_enabled,false);
  assert.equal((await as(seller,()=>call('nf_context'))).is_admin,false);assert.equal((await as(other,()=>call('nf_context'))).memberships.length,0);assert.deepEqual(await as(other,()=>call('nf_catalog')),[]);
  await as(other,()=>call('nf_complete_profile',['Cliente de teste',true]));assert.equal((await as(other,()=>call('nf_context'))).memberships.length,0);
  await assert.rejects(()=>as(null,()=>call('nf_complete_seller',args)),/permission denied/);
  const reserved=(await db.query("insert into public.stores(name,status,paused,payment_methods) values('Dan Burguer','draft',true,'{}') returning id")).rows[0].id;await db.query('insert into private.store_invitations(store_id,email) values($1,$2)',[reserved,'owner@example.test']);
  await assert.rejects(()=>as(other,()=>call('nf_create_store_draft',['DanBurguer'])),/STORE_RESERVED/);
  await assert.rejects(()=>as(owner,()=>call('nf_complete_seller',['Dono','Dan Burguer','38999999999',true])),/STORE_RESERVED/);
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[owner]);assert.equal(await as(owner,()=>call('nf_complete_seller',['Dono','Dan Burguer','38999999999',true])),reserved);assert.equal(await as(owner,()=>call('nf_complete_seller',['Dono','Dan Burguer','38999999999',true])),reserved);
  assert.equal((await db.query('select count(*)::int n from public.stores')).rows[0].n,2);assert.equal((await db.query('select pilot_enabled from public.platform_settings')).rows[0].pilot_enabled,false);
 }finally{await db.close();}
});
