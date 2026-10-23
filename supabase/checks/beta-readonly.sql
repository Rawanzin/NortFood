-- Somente contagens e metadados; nao retorna identidade, senha ou dados de pedidos.
begin read only;
select json_build_object(
 'auth_users',(select count(*) from auth.users),
 'platform_admins',(select count(*) from private.admin_users),
 'stores',(select count(*) from public.stores),
 'products',(select count(*) from public.products),
 'categories',(select count(*) from public.categories),
 'orders',(select count(*) from public.orders),
 'migration_versions',(select json_agg(version order by version) from supabase_migrations.schema_migrations),
 'tables_without_rls',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private','supabase_migrations') and c.relkind='r' and not c.relrowsecurity),
 'untrusted_definer_paths',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prosecdef and not coalesce('search_path=""'=any(p.proconfig) or 'search_path=pg_catalog'=any(p.proconfig),false)),
 'anon_private_admin_select',has_table_privilege('anon','private.admin_users','SELECT'),
 'authenticated_private_admin_select',has_table_privilege('authenticated','private.admin_users','SELECT'),
 'anon_internal_store_reason',has_column_privilege('anon','public.stores','status_reason','SELECT'),
 'bucket_public',(select public from storage.buckets where id='store-media'),
 'realtime_tables',(select json_agg(tablename order by tablename) from pg_publication_tables where pubname='supabase_realtime'),
 'pilot_enabled',(select pilot_enabled from public.platform_settings where id=true)
) as beta_audit;
rollback;
