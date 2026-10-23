-- HOMOLOGACAO ONLY: verify project zrczgghucwsaxqnyaapk in the dashboard first.
-- Read-only metadata. No business rows, credentials, grants or schema changes.
begin read only;

select jsonb_pretty(jsonb_build_object(
  'database',current_database(),
  'postgres',current_setting('server_version'),
  'tables',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity) order by n.nspname,c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r'),
  'columns',(select jsonb_agg(jsonb_build_object('schema',table_schema,'table',table_name,'column',column_name,'type',udt_name,'nullable',is_nullable) order by table_schema,table_name,ordinal_position)
    from information_schema.columns where table_schema in('public','private')),
  'constraints',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',t.relname,'name',c.conname,'validated',c.convalidated,'definition',pg_get_constraintdef(c.oid)) order by n.nspname,t.relname,c.conname)
    from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname in('public','private')),
  'indexes',(select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',indexname,'definition',indexdef) order by schemaname,tablename,indexname) from pg_indexes where schemaname in('public','private')),
  'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname in('public','private','storage')),
  'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'security_definer',p.prosecdef,'settings',p.proconfig,'definition_md5',md5(pg_get_functiondef(p.oid)),'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute')) order by n.nspname,p.proname,p.oid)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f'),
  'column_grants',(select jsonb_agg(to_jsonb(g) order by table_schema,table_name,column_name,grantee,privilege_type) from information_schema.column_privileges g where table_schema in('public','private') and grantee in('anon','authenticated','PUBLIC')),
  'media_bucket',(select jsonb_agg(jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)) from storage.buckets where id='store-media'),
  'realtime',(select jsonb_agg(to_jsonb(p) order by pubname,schemaname,tablename) from pg_publication_tables p where pubname='supabase_realtime'),
  'migration_history_exists',to_regclass('supabase_migrations.schema_migrations') is not null
));

commit;

-- If migration_history_exists is true, the next separate read-only query is:
-- select version,name from supabase_migrations.schema_migrations order by version;
-- Do not run repair, reset, db push or any historical migration to collect metadata.
