-- NortFood: schema aditivo para projeto Supabase novo. Não importa contas/dados demonstrativos.
begin;
revoke create on schema public from public,anon,authenticated;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table private.admin_users(user_id uuid primary key references auth.users(id), created_at timestamptz not null default now());
create table public.profiles(id uuid primary key references auth.users(id), name text not null check(length(trim(name)) between 1 and 80), phone text not null default '', notifications_enabled boolean not null default true, terms_accepted_at timestamptz,terms_version text, created_at timestamptz not null default now());
create table public.stores(
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80), description text not null default '', phone text not null default '', whatsapp text not null default '',
 street text not null default '', number text not null default '', complement text not null default '', neighborhood text not null default '', city text not null default 'Porteirinha', state text not null default 'MG',
 logo_url text, cover_url text, status text not null default 'pending' check(status in('pending','approved','suspended','rejected')), status_reason text not null default '',
 open_override boolean, paused boolean not null default false, opens_at time not null default '11:00', closes_at time not null default '22:00', working_days integer[] not null default array[0,1,2,3,4,5,6] check(working_days <@ array[0,1,2,3,4,5,6] and cardinality(working_days)>0),
 pickup_enabled boolean not null default false, delivery_enabled boolean not null default true, minimum_cents integer not null default 0 check(minimum_cents>=0), estimate_minutes integer check(estimate_minutes between 1 and 240),
 payment_methods text[] not null default array['cash','card','pix_on_receipt'] check(payment_methods <@ array['cash','card','pix_on_receipt'] and cardinality(payment_methods)>0), delivery_info text not null default '', created_at timestamptz not null default now()
);
create table public.store_memberships(store_id uuid references public.stores(id), user_id uuid references public.profiles(id), member_role text not null default 'owner' check(member_role in('owner','staff')), primary key(store_id,user_id));
create index memberships_user_idx on public.store_memberships(user_id,store_id);
create table public.categories(id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true);
create table public.store_categories(store_id uuid references public.stores(id), category_id uuid references public.categories(id), primary key(store_id,category_id));
create table public.products(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id), name text not null check(length(trim(name)) between 1 and 80), description text not null default '', price_cents integer not null check(price_cents between 1 and 1000000), category text not null default 'Outros', image_url text, available boolean not null default true, archived boolean not null default false, position integer not null default 0, notes_label text not null default '', created_at timestamptz not null default now());
create index products_store_idx on public.products(store_id,position) where not archived;
create table public.product_option_groups(id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id), name text not null, min_choices integer not null default 0, max_choices integer not null check(max_choices between 1 and 20), active boolean not null default true, check(min_choices>=0 and min_choices<=max_choices));
create table public.product_options(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.product_option_groups(id), name text not null, price_cents integer not null default 0 check(price_cents between 0 and 1000000), active boolean not null default true);
create index options_group_idx on public.product_options(group_id);
create table public.addresses(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), label text not null default 'Casa',street text not null check(length(trim(street)) between 1 and 180),number text not null check(length(trim(number)) between 1 and 30),complement text not null default '', neighborhood text not null check(length(trim(neighborhood)) between 1 and 80), city text not null default 'Porteirinha',state text not null default 'MG',reference text not null default '',latitude numeric check(latitude between -90 and 90),longitude numeric check(longitude between -180 and 180),is_primary boolean not null default false,created_at timestamptz not null default now());
create index addresses_user_idx on public.addresses(user_id);
create unique index addresses_primary_idx on public.addresses(user_id) where is_primary;
create table public.delivery_zones(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id),neighborhood text not null check(length(trim(neighborhood))>0),city text not null default 'Porteirinha',state text not null default 'MG',fee_cents integer not null check(fee_cents between 0 and 100000),active boolean not null default true,unique(store_id,neighborhood,city,state));
create table public.orders(id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.profiles(id),store_id uuid not null references public.stores(id),idempotency_key uuid not null,payload jsonb not null,
 status text not null default 'pending' check(status in('pending','accepted','preparing','ready','ready_for_pickup','out_for_delivery','delivered','picked_up','cancelled','rejected')),
 fulfillment text not null check(fulfillment in('delivery','pickup')),payment_method text not null check(payment_method in('cash','card','pix_on_receipt')),payment_confirmed_at timestamptz, payment_confirmed_by uuid references public.profiles(id),
 customer_name text not null,customer_phone text not null default '',address_snapshot jsonb not null,store_name text not null,notes text not null default '',subtotal_cents integer not null check(subtotal_cents>0),discount_cents integer not null default 0 check(discount_cents=0),delivery_cents integer not null check(delivery_cents>=0),total_cents integer not null check(total_cents=subtotal_cents-discount_cents+delivery_cents),commission_rate_bps integer not null check(commission_rate_bps between 0 and 2000),version integer not null default 0,created_at timestamptz not null default now(),completed_at timestamptz,unique(customer_id,idempotency_key));
create index orders_store_created_idx on public.orders(store_id,created_at desc);
create index orders_customer_created_idx on public.orders(customer_id,created_at desc);
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),product_id uuid not null references public.products(id),name text not null,quantity integer not null check(quantity between 1 and 20),unit_price_cents integer not null,options_cents integer not null default 0,total_cents integer not null,notes text not null default '',check(total_cents=(unit_price_cents+options_cents)*quantity));
create index order_items_order_idx on public.order_items(order_id);
create table public.order_item_options(id uuid primary key default gen_random_uuid(),order_item_id uuid not null references public.order_items(id),option_id uuid not null references public.product_options(id),name text not null,price_cents integer not null);
create table public.order_events(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),actor_id uuid references public.profiles(id),status text not null,reason text not null default '',created_at timestamptz not null default now());
create index order_events_order_idx on public.order_events(order_id,created_at);
create table public.conversations(id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.profiles(id),store_id uuid not null references public.stores(id),created_at timestamptz not null default now(),unique(customer_id,store_id));
create table public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.conversations(id),sender_id uuid not null references public.profiles(id),sender_name text not null,body text not null check(length(trim(body)) between 1 and 1000),client_key uuid not null,created_at timestamptz not null default now(),unique(sender_id,client_key));
create index messages_conversation_idx on public.messages(conversation_id,created_at,id);
create table public.conversation_reads(conversation_id uuid references public.conversations(id),user_id uuid references public.profiles(id),read_at timestamptz not null default now(),primary key(conversation_id,user_id));
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),title text not null,body text not null,order_id uuid references public.orders(id),read_at timestamptz,created_at timestamptz not null default now());
create index notifications_user_idx on public.notifications(user_id,created_at desc);
create table public.reviews(id uuid primary key default gen_random_uuid(),order_id uuid not null unique references public.orders(id),customer_id uuid not null references public.profiles(id),store_id uuid not null references public.stores(id),customer_name text not null,rating integer not null check(rating between 1 and 5),body text not null check(length(trim(body)) between 1 and 500),created_at timestamptz not null default now());
create table public.favorites(user_id uuid references public.profiles(id),store_id uuid references public.stores(id),product_id uuid references public.products(id),check((store_id is null) <> (product_id is null)));
create unique index favorites_store_unique on public.favorites(user_id,store_id) where store_id is not null;
create unique index favorites_product_unique on public.favorites(user_id,product_id) where product_id is not null;
create table public.platform_settings(id boolean primary key default true check(id),pilot_enabled boolean not null default false,commission_rate_bps integer not null default 500 check(commission_rate_bps between 0 and 2000),commission_basis text not null default 'products_after_discounts' check(commission_basis='products_after_discounts'));
insert into public.platform_settings(id) values(true);
create table public.commission_ledger(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id),order_id uuid not null references public.orders(id),kind text not null check(kind in('charge','adjustment')),amount_cents integer not null check(amount_cents<>0),rate_bps integer not null,reason text not null,actor_id uuid references public.profiles(id),due_at timestamptz,created_at timestamptz not null default now());
create unique index commission_charge_once on public.commission_ledger(order_id) where kind='charge';
create index commission_store_idx on public.commission_ledger(store_id,created_at);
create table public.commission_settlements(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),store_id uuid not null references public.stores(id),amount_cents integer not null check(amount_cents>0),operation_key uuid not null unique,reference text not null check(length(trim(reference))>0),reason text not null,actor_id uuid not null references public.profiles(id),paid_at timestamptz not null default now());
create table public.admin_audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.profiles(id),action text not null,entity_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now());
create table public.data_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),kind text not null check(kind in('access','deletion')),details text not null default '',status text not null default 'pending' check(status in('pending','processing','resolved')),created_at timestamptz not null default now());

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.admin_users where user_id=(select auth.uid()))$$;
create function private.is_member(s uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.store_memberships where user_id=(select auth.uid()) and store_id=s)$$;
create function private.can_store(s uuid) returns boolean language sql stable security definer set search_path='' as $$select private.is_admin() or private.is_member(s)$$;
create function private.can_order(o uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.orders where id=o and (customer_id=(select auth.uid()) or private.can_store(store_id)))$$;
create function private.can_chat(c uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.conversations where id=c and (customer_id=(select auth.uid()) or private.is_member(store_id)))$$;
create function private.public_store(s uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.stores where id=s and status='approved')$$;
create function private.public_product(p uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.products where id=p and not archived and private.public_store(store_id))$$;
create function private.product_store(p uuid) returns uuid language sql stable security definer set search_path='' as $$select store_id from public.products where id=p$$;
create function private.group_product(g uuid) returns uuid language sql stable security definer set search_path='' as $$select product_id from public.product_option_groups where id=g$$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated,anon;

-- Trigger de Auth não lê papéis de user_metadata. Metadados não concedem privilégios.
create function private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,name,phone,terms_accepted_at,terms_version) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Cliente'),80),left(regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9]','','g'),30),case when new.raw_user_meta_data->>'terms_version'='2026-10-draft' then now() else null end,case when new.raw_user_meta_data->>'terms_version'='2026-10-draft' then '2026-10-draft' else null end); return new;end$$;
revoke all on function private.new_profile() from public,anon,authenticated;
create trigger nortfood_auth_profile after insert on auth.users for each row execute function private.new_profile();

do $$declare t text;begin
 foreach t in array array['profiles','stores','store_memberships','categories','store_categories','products','product_option_groups','product_options','addresses','delivery_zones','orders','order_items','order_item_options','order_events','conversations','messages','conversation_reads','notifications','reviews','favorites','platform_settings','commission_ledger','commission_settlements','admin_audit_logs','data_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end$$;
grant select on public.stores,public.categories,public.store_categories,public.products,public.product_option_groups,public.product_options,public.delivery_zones,public.reviews to anon;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()) or private.is_admin());
create policy visible_store on public.stores for select using(status='approved' or private.can_store(id));
create policy own_membership on public.store_memberships for select to authenticated using(user_id=(select auth.uid()) or private.can_store(store_id));
create policy public_categories on public.categories for select using(active or private.is_admin());
create policy visible_store_categories on public.store_categories for select using(private.public_store(store_id) or private.can_store(store_id));
create policy visible_product on public.products for select using((not archived and private.public_store(store_id)) or private.can_store(store_id));
create policy visible_groups on public.product_option_groups for select using((active and private.public_product(product_id)) or private.can_store(private.product_store(product_id)));
create policy visible_options on public.product_options for select using((active and private.public_product(private.group_product(group_id))) or private.can_store(private.product_store(private.group_product(group_id))));
create policy own_addresses on public.addresses for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy zones_visible on public.delivery_zones for select using((active and private.public_store(store_id)) or private.can_store(store_id));
create policy own_orders on public.orders for select to authenticated using(customer_id=(select auth.uid()) or private.can_store(store_id));
create policy own_items on public.order_items for select to authenticated using(private.can_order(order_id));
create policy own_item_options on public.order_item_options for select to authenticated using(exists(select 1 from public.order_items i where i.id=order_item_id and private.can_order(i.order_id)));
create policy own_events on public.order_events for select to authenticated using(private.can_order(order_id));
create policy own_conversations on public.conversations for select to authenticated using(private.can_chat(id));
create policy own_messages on public.messages for select to authenticated using(private.can_chat(conversation_id));
create policy own_reads on public.conversation_reads for select to authenticated using(user_id=(select auth.uid()));
create policy own_notifications on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy public_reviews on public.reviews for select using(private.public_store(store_id) or customer_id=(select auth.uid()) or private.can_store(store_id));
create policy own_favorites on public.favorites for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (store_id is null or private.public_store(store_id)) and (product_id is null or private.public_product(product_id)));
create policy admin_settings on public.platform_settings for select to authenticated using(private.is_admin());
create policy own_commission on public.commission_ledger for select to authenticated using(private.can_store(store_id));
create policy own_settlements on public.commission_settlements for select to authenticated using(private.can_store(store_id));
create policy admin_audits on public.admin_audit_logs for select to authenticated using(private.is_admin());
create policy own_requests on public.data_requests for select to authenticated using(user_id=(select auth.uid()) or private.is_admin());
grant insert,delete on public.favorites to authenticated;
-- Todas as demais escritas serão RPCs limitadas, não DML arbitrário pelo navegador.
commit;
