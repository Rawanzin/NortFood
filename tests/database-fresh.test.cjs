const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {PGlite}=require('@electric-sql/pglite');
test('Clean local PostgreSQL applies actual migrations 001–009, constraints, RLS and least-privilege grants',async()=>{
  const db=new PGlite();
  try{
    await db.waitReady;
    await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
      create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
    const files=(await fs.readdir('supabase/migrations')).filter(file=>file.endsWith('.sql')).sort();assert.equal(files.length,9);
    for(const file of files)await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
    const unprotected=await db.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' and not c.relrowsecurity");assert.equal(unprotected.rows.length,0);
    const invalid=await db.query("select conname from pg_constraint where not convalidated");assert.equal(invalid.rows.length,0);
    assert.equal((await db.query("select pilot_enabled from public.platform_settings")).rows[0].pilot_enabled,false);
    assert.equal((await db.query("select public from storage.buckets where id='store-media'")).rows[0].public,false);
    const anonymous=await db.query("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nf_%' and has_function_privilege('anon',p.oid,'execute') order by p.proname");
    assert.deepEqual(anonymous.rows.map(row=>row.proname),['nf_catalog','nf_operating_status','nf_table_context']);
    for(const table of ['orders','products','profiles','commission_ledger','commission_settlements'])assert.equal((await db.query("select has_table_privilege('authenticated',$1,'INSERT,UPDATE,DELETE,TRUNCATE') allowed",['public.'+table])).rows[0].allowed,false);
  }finally{await db.close();}
});
