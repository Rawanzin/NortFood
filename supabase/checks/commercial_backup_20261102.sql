-- Recovery point for application schema/data only. No Auth passwords/tokens,
-- Vault secrets or Storage file bytes. Export privately; never publish output.
begin transaction isolation level repeatable read read only;
do $backup$
declare snapshot jsonb; entry record; records jsonb; data jsonb := '{}';
begin
 for entry in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' order by n.nspname,c.relname loop
  execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from %I.%I t',entry.nspname,entry.relname) into records;
  data:=data||jsonb_build_object(entry.nspname||'.'||entry.relname,records);
 end loop;
 snapshot:=jsonb_build_object('scope','NortFood application recovery point; not full managed-service backup','taken_at',now(),'database',current_database(),'data',data,
 'auth_ids',(select coalesce(jsonb_agg(id),'[]') from auth.users),
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'definition',pg_get_functiondef(p.oid),'acl',p.proacl)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f'),
 'columns',(select jsonb_agg(to_jsonb(c)) from information_schema.columns c where table_schema in('public','private')),
 'constraints',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',con.conname,'definition',pg_get_constraintdef(con.oid))) from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private')),
 'indexes',(select jsonb_agg(to_jsonb(i)) from pg_indexes i where schemaname in('public','private')),
 'triggers',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'definition',pg_get_triggerdef(t.oid))) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in('public','private')),
 'policies',(select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname in('public','private','storage')),
 'grants',(select jsonb_agg(to_jsonb(g)) from information_schema.role_table_grants g where table_schema in('public','private')),
 'migrations',(select jsonb_agg(to_jsonb(m)) from supabase_migrations.schema_migrations m),
 'buckets',(select jsonb_agg(to_jsonb(b)) from storage.buckets b),
 'storage_objects',(select coalesce(jsonb_agg(to_jsonb(o)),'[]') from storage.objects o),
 'publications',(select jsonb_agg(to_jsonb(p)) from pg_publication_tables p where pubname='supabase_realtime'));
 perform set_config('nortfood.application_backup',snapshot::text,true);
end $backup$;
select current_setting('nortfood.application_backup') as backup;
rollback;
