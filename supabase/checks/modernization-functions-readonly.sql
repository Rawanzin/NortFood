-- Confirm project zrczgghucwsaxqnyaapk. Export the single result as JSON.
-- Save its functions value as remote-functions.json for the offline comparison.
select jsonb_agg(jsonb_build_object(
  'schema',n.nspname,'name',p.proname,
  'arguments',pg_get_function_identity_arguments(p.oid),
  'definition',pg_get_functiondef(p.oid)) order by n.nspname,p.proname,p.oid) as functions
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in('public','private') and p.prokind='f';
