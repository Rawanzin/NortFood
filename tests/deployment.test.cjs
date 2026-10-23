const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {PGlite}=require('@electric-sql/pglite'),{prepare}=require('../scripts/prepare-supabase-deployment.cjs');
async function base(){const db=new PGlite();await db.waitReady;await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create publication supabase_realtime;`);await db.exec(await fs.readFile('supabase/migrations/202610120001_foundation.sql','utf8'));return db;}
test('Deploy atomico 002-007: preserva registros, valida seguranca e recusa reaplicacao',async()=>{const db=await base();try{
 const id=(await db.query("insert into public.stores(name) values('Loja anterior ao deploy') returning id")).rows[0].id;
 await db.exec(prepare().sql);assert.equal((await db.query('select name from public.stores where id=$1',[id])).rows[0].name,'Loja anterior ao deploy');
 assert.equal((await db.query("select count(*)::int n from pg_publication_tables where pubname='supabase_realtime'")).rows[0].n,4);
 const history=require('../scripts/prepare-migration-history.cjs').prepareHistory();await db.exec(history.sql);await db.exec(history.sql);
 assert.equal((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,7);
 assert.equal((await db.query('select name from public.stores where id=$1',[id])).rows[0].name,'Loja anterior ao deploy');
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from supabase_migrations.schema_migrations'),/permission denied/);await db.exec('reset role');
 await assert.rejects(()=>db.exec(prepare().sql),/MIGRATIONS_ALREADY_PRESENT_OR_UNKNOWN_STATE/);await db.exec('rollback');
}finally{await db.close()}});
test('Deploy interrompido na ultima migracao desfaz integralmente o lote',async()=>{const db=await base();try{
 const sql=prepare().sql.replace('create table private.media_upload_reservations(','select nonexistent_deploy_safety_function(); create table private.media_upload_reservations(');
 await assert.rejects(()=>db.exec(sql),/nonexistent_deploy_safety_function/);await db.exec('rollback');
 assert.equal((await db.query("select to_regprocedure('public.nf_catalog()') v")).rows[0].v,null);
 assert.equal((await db.query("select count(*)::int n from storage.buckets where id='store-media'")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='stores' and column_name='latitude'")).rows[0].n,0);
}finally{await db.close()}});
