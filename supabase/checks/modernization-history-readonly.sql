-- Confirm project zrczgghucwsaxqnyaapk. No repair, DDL or migration reapplication.
-- Save the history value from the JSON export as remote-history.json.
select jsonb_build_object(
  'migrations',(select jsonb_agg(jsonb_build_object('version',version,'name',name) order by version)
    from supabase_migrations.schema_migrations),
  'event_triggers',(select jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,
    'enabled',e.evtenabled,'tags',e.evttags,'function',e.evtfoid::regprocedure::text))
    from pg_event_trigger e where e.evtfoid='public.rls_auto_enable()'::regprocedure),
  'rls_function_acl',(select jsonb_build_object('anon',has_function_privilege('anon',p.oid,'execute'),
    'authenticated',has_function_privilege('authenticated',p.oid,'execute'),'settings',p.proconfig)
    from pg_proc p where p.oid='public.rls_auto_enable()'::regprocedure)) as history;
