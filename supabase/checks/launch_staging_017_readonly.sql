-- Read-only inventory of the recovered NortFood-Homologacao database.
-- Confirm the project reference zrczgghucwsaxqnyaapk in the dashboard first.
begin transaction read only;

select jsonb_build_object(
 'checked_at', now(),
 'versions', (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'pilot_enabled', (select pilot_enabled from public.platform_settings where id),
 'protected_production_store_present', exists (
  select 1 from public.stores where id='40bac4d9-2e3c-4f1d-b33b-ab9628176136'
 ),
 'store_count', (select count(*) from public.stores),
 'order_count', (select count(*) from public.orders),
 'migration_017_function_present', to_regprocedure('private.can_manage_store(uuid,uuid)') is not null,
 'auth_ban_column_present', exists (
  select 1 from pg_attribute
  where attrelid='auth.users'::regclass and attname='banned_until' and not attisdropped
 ),
 'buckets', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'public',public) order by id),'[]')
             from storage.buckets where id in ('store-media','profile-avatars')),
 'realtime', (select coalesce(jsonb_agg(tablename order by tablename),'[]')
              from pg_publication_tables where pubname='supabase_realtime' and schemaname='public')
) as inventory;

rollback;
