begin transaction read only;
select jsonb_agg(to_jsonb(x) order by name) as preservation from (select 'public.orders' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.orders t
union all
select 'public.stores' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.stores t
union all
select 'public.reviews' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.reviews t
union all
select 'public.messages' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.messages t
union all
select 'public.products' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.products t
union all
select 'public.profiles' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t)-'avatar_path' order by (to_jsonb(t)-'avatar_path')::text)::text,'[]')) as md5 from public.profiles t
union all
select 'public.addresses' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.addresses t
union all
select 'public.favorites' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.favorites t
union all
select 'public.categories' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.categories t
union all
select 'public.order_items' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.order_items t
union all
select 'public.store_setup' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.store_setup t
union all
select 'private.admin_users' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from private.admin_users t
union all
select 'public.order_events' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.order_events t
union all
select 'public.store_drafts' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.store_drafts t
union all
select 'public.conversations' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.conversations t
union all
select 'public.data_requests' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.data_requests t
union all
select 'public.dining_tables' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.dining_tables t
union all
select 'public.notifications' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.notifications t
union all
select 'public.delivery_zones' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.delivery_zones t
union all
select 'public.product_options' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.product_options t
union all
select 'private.catalog_imports' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from private.catalog_imports t
union all
select 'public.admin_audit_logs' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.admin_audit_logs t
union all
select 'public.store_categories' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.store_categories t
union all
select 'public.commission_ledger' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.commission_ledger t
union all
select 'public.platform_settings' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.platform_settings t
union all
select 'public.store_memberships' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.store_memberships t
union all
select 'private.store_invitations' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from private.store_invitations t
union all
select 'public.conversation_reads' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.conversation_reads t
union all
select 'public.order_item_options' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.order_item_options t
union all
select 'private.account_onboarding' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from private.account_onboarding t
union all
select 'public.product_option_groups' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.product_option_groups t
union all
select 'public.commission_settlements' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from public.commission_settlements t
union all
select 'private.media_upload_reservations' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from private.media_upload_reservations t
union all
select 'private.avatar_upload_reservations' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t))::text)::text,'[]')) as md5 from private.avatar_upload_reservations t) x;
rollback;
