-- SOMENTE LEITURA: inventário de sinais de migração, não substitui histórico.
-- Nenhuma migração deve ser aplicada automaticamente com base só nestes sinais.
begin read only;
select current_user,current_database(),version();
select schemaname,tablename from pg_tables
where schemaname in('public','private','supabase_migrations') order by 1,2;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) arguments,
 pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname like 'nf\_%' escape '\')
 or (n.nspname='private' and p.proname in('is_admin','save_store_base')) order by 1,2,3;
select table_schema,table_name,column_name,data_type from information_schema.columns
where (table_schema='public' and table_name='stores' and column_name in('latitude','longitude','tables_enabled'))
 or (table_schema='public' and table_name='orders' and column_name in('table_id','table_snapshot')) order by 1,2,3;
select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) owner
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in('public','private') and c.relkind='r' order by 1,2;
select schemaname,tablename,policyname,roles,cmd,permissive from pg_policies
where schemaname in('public','private','storage') order by 1,2,3;
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id='store-media';
select pubname,puballtables,pubinsert,pubupdate,pubdelete,pubtruncate from pg_publication where pubname='supabase_realtime';
select schemaname,tablename from pg_publication_tables where pubname='supabase_realtime' order by 1,2;
rollback;
