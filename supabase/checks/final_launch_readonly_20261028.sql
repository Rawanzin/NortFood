-- NortFood / principal zwkhqahivthzivmuirjr / 2026-10-28.
-- Execute somente depois de conferir a identidade do projeto na CLI.
-- SOMENTE LEITURA: nenhuma funcao da aplicacao e chamada; nenhum DDL/DML,
-- SET ROLE, criacao de conta/pedido ou alteracao de piloto e executada.
-- Resultado limitado a contagens, estado comercial e metadados de seguranca.
-- Nunca retorna emails, enderecos, telefones, tokens, payloads ou definicoes SQL.
-- Requer esquema NortFood 001-012 e acesso administrativo de leitura.
-- Ausencia de tabela/permissao deve falhar, sem criar objetos ou afrouxar ACL.
begin transaction isolation level repeatable read read only;

select 'audit_context' as section,
       to_char(transaction_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as checked_at_utc,
       current_setting('transaction_read_only') = 'on' as transaction_read_only,
       current_setting('transaction_isolation') as isolation_level;

select 'dan_identity' as section,
       count(*) as matching_existing_store_count,
       count(*) = 1 as existing_store_found
from public.stores
where id = '40bac4d9-2e3c-4f1d-b33b-ab9628176136'::uuid;

select 'dan_configuration' as section,
       s.status, s.paused, s.open_override,
       s.pickup_enabled, s.delivery_enabled, s.tables_enabled,
       nullif(trim(s.description), '') is not null as description_present,
       nullif(trim(s.street), '') is not null and nullif(trim(s.number), '') is not null as street_number_present,
       nullif(trim(s.neighborhood), '') is not null as neighborhood_present,
       nullif(trim(s.city), '') is not null and s.state ~ '^[A-Z]{2}$' as city_state_present,
       s.postal_code ~ '^[0-9]{8}$' as postal_code_present,
       s.latitude is not null and s.longitude is not null as coordinates_present,
       nullif(trim(s.phone), '') is not null as phone_present,
       regexp_replace(s.whatsapp, '[^0-9]', '', 'g') ~ '^(55)?[1-9][0-9](9[0-9]{8}|[2-5][0-9]{7})$' as whatsapp_has_brazilian_format,
       s.opens_at is not null and s.closes_at is not null as schedule_times_present,
       s.opens_at <> s.closes_at as schedule_distinct_times,
       cardinality(s.working_days) as working_days_count,
       cardinality(s.payment_methods) as payment_methods_count,
       cardinality(s.payment_methods) > 0 and s.payment_methods <@ array['cash','card','pix_on_receipt'] as payment_methods_configured,
       s.estimate_minutes is not null as preparation_estimate_present,
       s.minimum_cents >= 0 as minimum_order_nonnegative,
       nullif(trim(s.logo_url), '') is not null as logo_present,
       nullif(trim(s.cover_url), '') is not null as cover_present,
       (select count(*) from public.delivery_zones z where z.store_id = s.id) as delivery_zone_count,
       (select count(*) from public.delivery_zones z where z.store_id = s.id and z.active) as active_delivery_zone_count,
       exists(select 1 from public.store_setup st where st.store_id = s.id) as setup_exists,
       exists(select 1 from public.store_setup st where st.store_id = s.id and st.owner_confirmed_at is not null) as owner_confirmed,
       (select count(*) from public.store_memberships m where m.store_id = s.id) as membership_count,
       (select count(*) from public.store_memberships m where m.store_id = s.id and m.member_role = 'owner') as owner_membership_count,
       (select count(*) from public.store_memberships m where m.store_id = s.id and m.member_role = 'staff') as staff_membership_count,
       (select count(*) from private.store_invitations i where i.store_id = s.id) as invitation_count,
       (select count(*) from private.store_invitations i where i.store_id = s.id and i.claimed_by is not null and i.claimed_at is not null) as claimed_invitation_count
from public.stores s
where s.id = '40bac4d9-2e3c-4f1d-b33b-ab9628176136'::uuid;

with products as (
  select id, available, archived, image_url, price_cents, sale_restriction
  from public.products where store_id = '40bac4d9-2e3c-4f1d-b33b-ab9628176136'::uuid
), groups as (
  select g.id, g.active, p.archived from public.product_option_groups g join products p on p.id = g.product_id
), options as (
  select o.id, o.active, g.active as group_active, g.archived, o.price_cents
  from public.product_options o join groups g on g.id = o.group_id
), counts as (
  select (select count(*) from products) as products_total,
         (select count(*) from products where not archived) as products_not_archived,
         (select count(*) from products where available and not archived) as products_available,
         (select count(*) from products where nullif(trim(image_url), '') is not null) as products_with_images,
         (select count(*) from products where price_cents <= 0) as products_invalid_price,
         (select count(*) from products where sale_restriction = 'price_confirmation') as products_awaiting_price_confirmation,
         (select count(*) from products where sale_restriction = 'age_restricted') as products_age_restricted,
         (select count(*) from groups) as option_groups_total,
         (select count(*) from groups where active and not archived) as option_groups_active,
         (select count(*) from options) as options_total,
         (select count(*) from options where active and group_active and not archived) as options_active,
         (select count(*) from options where price_cents < 0) as options_invalid_price
)
select 'dan_catalog_counts' as section, counts.*,
       products_total = 46 and option_groups_total = 20 and options_total = 220 as original_total_counts_match,
       products_not_archived = 46 and option_groups_active = 20 and options_active = 220 as active_catalog_counts_match
from counts;

select 'platform_commercial_gate' as section,
       ps.pilot_enabled, ps.pilot_store_limit, ps.commission_rate_bps,
       ps.commission_basis, ps.commission_rate_bps = 500 as default_commission_is_5_percent,
       (select count(*) from public.stores where status = 'approved') as approved_store_count,
       (select count(*) from public.stores where status = 'approved') <= ps.pilot_store_limit as approved_stores_within_limit,
       (select count(*) from private.admin_users) as configured_admin_count
from public.platform_settings ps where ps.id = true;

select 'dan_orders_and_tables' as section,
       (select count(*) from public.orders where store_id = '40bac4d9-2e3c-4f1d-b33b-ab9628176136'::uuid) as order_count,
       (select count(*) from public.orders where store_id = '40bac4d9-2e3c-4f1d-b33b-ab9628176136'::uuid and commission_rate_bps <> 500) as orders_with_other_commission_snapshot_count,
       (select count(*) from public.dining_tables where store_id = '40bac4d9-2e3c-4f1d-b33b-ab9628176136'::uuid) as table_count,
       (select count(*) from public.dining_tables where store_id = '40bac4d9-2e3c-4f1d-b33b-ab9628176136'::uuid and active and not archived and accepting_orders) as accepting_table_count,
       (select count(*) from public.dining_tables where store_id = '40bac4d9-2e3c-4f1d-b33b-ab9628176136'::uuid and public_token is null) as tables_missing_public_token_count;

-- Retorna apenas versoes; nao inclui o campo statements do historico.
select 'migration_history' as section, version
from supabase_migrations.schema_migrations order by version;

select 'rls_summary' as section, n.nspname as schema_name,
       count(*) as table_count,
       count(*) filter(where c.relrowsecurity) as rls_enabled_count,
       count(*) filter(where not c.relrowsecurity) as rls_disabled_count,
       count(*) filter(where c.relforcerowsecurity) as rls_forced_count
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public','private') and c.relkind in ('r','p')
group by n.nspname order by n.nspname;

select 'rls_objects_without_rls' as section, n.nspname as schema_name, c.relname as table_name
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public','private') and c.relkind in ('r','p') and not c.relrowsecurity
order by n.nspname, c.relname;

select 'policy_inventory' as section, schemaname, tablename, policyname, roles, cmd, permissive
from pg_policies
where schemaname in ('public','private') or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- Permissoes efetivas incluem PUBLIC e papeis herdados. SELECT concedido ainda
-- depende de RLS; esta consulta nao tenta ler linhas como anon/authenticated.
with roles(role_name) as (values ('anon'::text), ('authenticated'::text))
select 'effective_table_privileges' as section, r.role_name,
       n.nspname as schema_name, c.relname as table_name,
       has_table_privilege(r.role_name, c.oid, 'SELECT') as table_select,
       has_any_column_privilege(r.role_name, c.oid, 'SELECT') as any_column_select,
       has_table_privilege(r.role_name, c.oid, 'INSERT') as can_insert,
       has_table_privilege(r.role_name, c.oid, 'UPDATE') as can_update,
       has_table_privilege(r.role_name, c.oid, 'DELETE') as can_delete,
       has_table_privilege(r.role_name, c.oid, 'TRUNCATE') as can_truncate,
       has_table_privilege(r.role_name, c.oid, 'TRIGGER') as can_trigger
from roles r cross join pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public','private') and c.relkind in ('r','p')
order by r.role_name, n.nspname, c.relname;

with roles(role_name) as (values ('anon'::text), ('authenticated'::text))
select 'effective_schema_privileges' as section, r.role_name, n.nspname as schema_name,
       has_schema_privilege(r.role_name, n.oid, 'USAGE') as can_use,
       has_schema_privilege(r.role_name, n.oid, 'CREATE') as can_create
from roles r cross join pg_namespace n
where n.nspname in ('public','private') order by r.role_name, n.nspname;

select 'function_security_inventory' as section,
       n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       p.prosecdef as security_definer, p.provolatile as volatility,
       exists(select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg where cfg in ('search_path=', 'search_path=""')) as has_fixed_empty_search_path,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       exists(select 1 from aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) acl where acl.grantee = 0 and acl.privilege_type = 'EXECUTE') as public_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prokind = 'f' and ((n.nspname = 'public' and left(p.proname,3) = 'nf_') or n.nspname = 'private')
order by n.nspname, p.proname, identity_arguments;

-- Sinais estruturais, nao uma prova semantica da implementacao remota.
-- Nao imprime pg_get_functiondef: somente resumo/hash e presenca de guardas.
with functions as (
 select p.proname, pg_get_functiondef(p.oid) as definition
 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prokind = 'f'
   and p.proname in ('nf_place_order','nf_transition','nf_admin_rate','nf_admin_pilot')
)
select 'order_guard_structural_signals' as section, proname as function_name,
       md5(definition) as definition_md5,
       position('private.require_user' in definition) > 0 as mentions_required_user,
       position('private.require_admin' in definition) > 0 as mentions_required_admin,
       position('pilot_enabled' in definition) > 0 as mentions_pilot_gate,
       position('pg_advisory_xact_lock' in definition) > 0 as mentions_transaction_advisory_lock,
       position('IDEMPOTENCY_CONFLICT' in definition) > 0 as mentions_idempotency_conflict,
       position('PRICE_CHANGED' in definition) > 0 as mentions_price_changed_guard,
       position('DELIVERY_OUTSIDE_ZONE' in definition) > 0 as mentions_delivery_zone_guard,
       position('commission_rate_bps' in definition) > 0 as mentions_commission_snapshot,
       position('ORDER_CONFLICT' in definition) > 0 as mentions_status_version_guard
from functions order by proname;

select 'integrity_indexes' as section, n.nspname as schema_name,
       t.relname as table_name, i.relname as index_name,
       x.indisunique as is_unique, x.indisvalid as is_valid
from pg_index x join pg_class i on i.oid = x.indexrelid
join pg_class t on t.oid = x.indrelid join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public' and t.relname in ('orders','commission_ledger','commission_settlements','dining_tables')
order by t.relname, i.relname;

select 'history_guard_triggers' as section, n.nspname as schema_name,
       c.relname as table_name, t.tgname as trigger_name, t.tgenabled as enabled_mode
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and n.nspname = 'public'
  and c.relname in ('orders','order_items','order_events','commission_ledger','commission_settlements','stores')
order by c.relname, t.tgname;

select 'store_media_bucket' as section,
       count(*) as matching_bucket_count,
       count(*) filter(where not public) as private_bucket_count,
       max(file_size_limit) as configured_file_size_limit_bytes,
       count(*) filter(where file_size_limit is not null and file_size_limit <= 1048576) as bucket_limit_at_most_1_mib_count
from storage.buckets where id = 'store-media';

rollback;
