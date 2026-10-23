-- SOMENTE LEITURA. Preparado para conferência humana; não executado remotamente.
-- Não reaplicar 001. Estado esperado: 001 aplicada; 002, 003, 004 e 005 ausentes.
select current_user,rolsuper,rolbypassrls from pg_roles where rolname=current_user;
select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,
 pg_get_userbyid(c.relowner) owner
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where (n.nspname='public' or (n.nspname='private' and c.relname='admin_users'))
 and c.relkind='r' order by n.nspname,c.relname;
select role_name,has_schema_privilege(role_name,'private','USAGE') schema_usage,
 has_schema_privilege(role_name,'private','CREATE') schema_create,
 has_table_privilege(role_name,'private.admin_users','SELECT') admin_select,
 has_table_privilege(role_name,'private.admin_users','INSERT') admin_insert,
 has_table_privilege(role_name,'private.admin_users','UPDATE') admin_update,
 has_table_privilege(role_name,'private.admin_users','DELETE') admin_delete
from unnest(array['anon','authenticated']) role_name;
select n.nspname,p.proname,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='private' and p.proname='is_admin')
 or (n.nspname='public' and left(p.proname,3)='nf_') order by 1,2;
-- Antes de 002, nenhuma nf_* deve existir. is_admin e admin_users devem ter
-- o proprietário esperado, normalmente postgres; manter search_path vazio.
select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets where id='store-media';
select policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='storage' and tablename='objects';
select pubname,puballtables,pubinsert,pubupdate,pubdelete,pubtruncate,
 pg_get_userbyid(pubowner) owner
from pg_publication where pubname='supabase_realtime';
select schemaname,tablename from pg_publication_tables
where pubname='supabase_realtime' order by 1,2;
-- Confirmar também no painel: private fora dos esquemas expostos na Data API.
-- Antes da 005, essas colunas ainda não devem existir.
select column_name,data_type from information_schema.columns
where table_schema='public' and table_name='stores'
 and column_name in('latitude','longitude');
