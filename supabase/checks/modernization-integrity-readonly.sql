-- Confirm project zrczgghucwsaxqnyaapk. Reads metadata, never business rows.
-- Save the integrity value from the JSON export as remote-integrity.json.
select jsonb_build_object(
  'unvalidated_constraints',(select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace where n.nspname in('public','private') and not c.convalidated),
  'invalid_indexes',(select count(*) from pg_index i join pg_class t on t.oid=i.indrelid
    join pg_namespace n on n.oid=t.relnamespace where n.nspname in('public','private') and (not i.indisvalid or not i.indisready)),
  'disabled_application_triggers',(select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and not t.tgisinternal and t.tgenabled='D'),
  'public_private_tables_without_rls',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in('public','private') and c.relkind='r' and not c.relrowsecurity)) as integrity;
