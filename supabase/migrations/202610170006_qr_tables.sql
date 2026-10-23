begin;
alter table public.stores add column tables_enabled boolean not null default false;
grant select(tables_enabled) on public.stores to anon,authenticated;
create table public.dining_tables(
 id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id),
 label text not null check(length(trim(label)) between 1 and 40),
 public_token uuid not null unique default gen_random_uuid(),active boolean not null default true,
 accepting_orders boolean not null default false,archived boolean not null default false,
 created_at timestamptz not null default now(),unique(store_id,label),unique(id,store_id),
 check(not accepting_orders or (active and not archived))
);
create index dining_tables_store_idx on public.dining_tables(store_id);
alter table public.dining_tables enable row level security;
revoke all on public.dining_tables from public,anon,authenticated;
grant select on public.dining_tables to authenticated;
create policy dining_tables_members on public.dining_tables for select to authenticated using(private.is_member(store_id));
alter table public.orders add column table_id uuid,add column table_snapshot jsonb not null default '{}',
 add constraint orders_table_store_fk foreign key(table_id,store_id) references public.dining_tables(id,store_id);
create index orders_table_idx on public.orders(table_id,created_at desc) where table_id is not null;
-- Substituição de CHECKs somente para ampliar valores; nenhuma linha é apagada.
alter table public.orders drop constraint orders_fulfillment_check,
 add constraint orders_fulfillment_check check(fulfillment in('delivery','pickup','dine_in')),
 drop constraint orders_status_check,
 add constraint orders_status_check check(status in('pending','accepted','preparing','ready','ready_for_pickup','out_for_delivery','delivered','picked_up','cancelled','rejected','ready_for_table','served')),
 add constraint orders_table_mode check((fulfillment='dine_in' and table_id is not null and table_snapshot ? 'label') or (fulfillment<>'dine_in' and table_id is null));

create function public.nf_table_context(p_token uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('token',t.public_token,'store_id',t.store_id,'label',t.label,
 'available',t.active and not t.archived and s.tables_enabled,
 'can_order',t.active and not t.archived and t.accepting_orders and s.tables_enabled and private.store_open(s) and (select pilot_enabled from public.platform_settings where id=true))
 from public.dining_tables t join public.stores s on s.id=t.store_id where t.public_token=p_token and s.status='approved'
$$;
revoke all on function public.nf_table_context(uuid) from public,anon,authenticated;
grant execute on function public.nf_table_context(uuid) to anon,authenticated;

create function public.nf_tables(p_store uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_store(p_store);
 return (select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('open_orders',(select count(*) from public.orders o where o.table_id=t.id and o.status not in('served','cancelled','rejected'))) order by t.created_at,t.id),'[]') from public.dining_tables t where t.store_id=p_store);
end$$;
create function public.nf_table_save(p_store uuid,p_id uuid,p_label text,p_active boolean,p_accepting boolean,p_archived boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare tid uuid:=coalesce(p_id,gen_random_uuid());begin
 perform private.require_store(p_store);perform 1 from public.stores where id=p_store for update;
 if coalesce(length(trim(p_label)),0) not between 1 and 40 or p_active is null or p_accepting is null or p_archived is null then raise exception 'INVALID_TABLE';end if;
 if p_id is null and (select count(*) from public.dining_tables where store_id=p_store)>=200 then raise exception 'TABLE_LIMIT';end if;
 if p_id is not null and not exists(select 1 from public.dining_tables where id=p_id and store_id=p_store) then raise exception 'TABLE_FORBIDDEN';end if;
 if p_archived and exists(select 1 from public.orders where table_id=tid and status not in('served','cancelled','rejected')) then raise exception 'TABLE_HAS_OPEN_ORDERS';end if;
 insert into public.dining_tables(id,store_id,label,active,accepting_orders,archived) values(tid,p_store,trim(p_label),p_active,p_accepting,p_archived)
 on conflict(id) do update set label=excluded.label,active=excluded.active,accepting_orders=excluded.accepting_orders,archived=excluded.archived;
 perform private.audit('table_saved',tid,jsonb_build_object('store_id',p_store,'label',trim(p_label),'active',p_active,'accepting',p_accepting,'archived',p_archived));return tid;
end$$;
create function public.nf_tables_enabled(p_store uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_store(p_store);if p_enabled is null then raise exception 'INVALID_TABLE';end if;
 update public.stores set tables_enabled=p_enabled where id=p_store;
 perform private.audit('tables_enabled',p_store,jsonb_build_object('enabled',p_enabled));
end$$;
revoke all on function public.nf_tables(uuid),public.nf_table_save(uuid,uuid,text,boolean,boolean,boolean),public.nf_tables_enabled(uuid,boolean) from public,anon,authenticated;
grant execute on function public.nf_tables(uuid),public.nf_table_save(uuid,uuid,text,boolean,boolean,boolean),public.nf_tables_enabled(uuid,boolean) to authenticated;

-- RPCs existentes são ampliadas abaixo, conservando assinatura, isolamento e grants.

create or replace function public.nf_place_order(p_request jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare
 u uuid:=private.require_user();idem uuid:=(p_request->>'idempotency_key')::uuid;s public.stores;a public.addresses;z public.delivery_zones;p public.products;line jsonb;oid uuid;itemid uuid;qty integer;sub bigint:=0;fee integer:=0;opts bigint;selected uuid[];g public.product_option_groups;n integer;existing public.orders;opt public.product_options;rate integer;t public.dining_tables;
begin
 if idem is null then raise exception 'IDEMPOTENCY_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||idem::text,0));
 select * into existing from public.orders where customer_id=u and idempotency_key=idem;
 if found then if existing.payload<>p_request then raise exception 'IDEMPOTENCY_CONFLICT';end if;return existing.id;end if;
 -- Serializa o limite por cliente, mesmo com chaves idempotentes diferentes.
 perform pg_advisory_xact_lock(hashtextextended('nf:order-rate:'||u::text,0));
 select commission_rate_bps into rate from public.platform_settings where id=true and pilot_enabled for share;if not found then raise exception 'PILOT_NOT_ENABLED';end if;
 if (select count(*) from public.orders where customer_id=u and created_at>now()-interval '1 minute')>=6 then raise exception 'RATE_LIMIT';end if;
 select * into s from public.stores where id=(p_request->>'store_id')::uuid for share;
 if not found or not private.store_open(s) then raise exception 'STORE_UNAVAILABLE';end if;
 if private.is_member(s.id) then raise exception 'SELF_ORDER_NOT_ALLOWED';end if;
 if p_request->>'fulfillment'='dine_in' then
 if not s.tables_enabled then raise exception 'TABLE_UNAVAILABLE';end if;
 select * into t from public.dining_tables where public_token=(p_request->>'table_token')::uuid and store_id=s.id and active and not archived and accepting_orders for share;
 if not found then raise exception 'TABLE_UNAVAILABLE';end if;
 elsif p_request->>'fulfillment'='pickup' then if not s.pickup_enabled or s.street='' or s.number='' then raise exception 'PICKUP_UNAVAILABLE';end if;
 elsif p_request->>'fulfillment'='delivery' then
 if not s.delivery_enabled then raise exception 'DELIVERY_UNAVAILABLE';end if;
 select * into a from public.addresses where id=(p_request->>'address_id')::uuid and user_id=u for share;if not found then raise exception 'ADDRESS_FORBIDDEN';end if;
 select * into z from public.delivery_zones where store_id=s.id and active and lower(trim(neighborhood))=lower(trim(a.neighborhood)) and lower(trim(city))=lower(trim(a.city)) and state=a.state for share;if not found then raise exception 'DELIVERY_OUTSIDE_ZONE';end if;fee=z.fee_cents;
 else raise exception 'INVALID_FULFILLMENT';end if;
 if (p_request->>'payment_method'=any(s.payment_methods)) is not true then raise exception 'PAYMENT_UNAVAILABLE';end if;
 if jsonb_typeof(p_request->'items') is distinct from 'array' then raise exception 'INVALID_CART';end if;
 if jsonb_array_length(p_request->'items') not between 1 and 40 then raise exception 'INVALID_CART';end if;
 insert into public.orders(customer_id,store_id,idempotency_key,payload,fulfillment,payment_method,customer_name,address_snapshot,store_name,notes,subtotal_cents,delivery_cents,total_cents,commission_rate_bps,table_id,table_snapshot)
 values(u,s.id,idem,p_request,p_request->>'fulfillment',p_request->>'payment_method',(select name from public.profiles where id=u),case when p_request->>'fulfillment'='pickup' then jsonb_build_object('street',s.street,'number',s.number,'complement',s.complement,'neighborhood',s.neighborhood,'city',s.city,'state',s.state) when p_request->>'fulfillment'='dine_in' then '{}'::jsonb else to_jsonb(a)-'user_id' end,s.name,left(coalesce(p_request->>'notes',''),300),1,fee,1+fee,rate,t.id,case when t.id is null then '{}'::jsonb else jsonb_build_object('id',t.id,'label',t.label) end) returning id into oid;
 for line in select * from jsonb_array_elements(p_request->'items') loop
 select * into p from public.products where id=(line->>'product_id')::uuid and store_id=s.id and available and not archived for share;if not found then raise exception 'PRODUCT_UNAVAILABLE';end if;
 qty=(line->>'quantity')::integer;if qty is null or qty not between 1 and 20 then raise exception 'INVALID_QUANTITY';end if;
 selected=array(select jsonb_array_elements_text(coalesce(line->'option_ids','[]'))::uuid);
 if cardinality(selected)<>(select count(distinct x) from unnest(selected) x) then raise exception 'DUPLICATE_OPTIONS';end if;
 if exists(select 1 from unnest(selected) x where not exists(select 1 from public.product_options op join public.product_option_groups gr on gr.id=op.group_id where op.id=x and op.active and gr.active and gr.product_id=p.id)) then raise exception 'INVALID_OPTIONS';end if;
 for g in select * from public.product_option_groups where product_id=p.id and active for share loop select count(*) into n from public.product_options where group_id=g.id and id=any(selected);if n<g.min_choices or n>g.max_choices then raise exception 'OPTION_LIMIT';end if;end loop;
 select coalesce(sum(price_cents),0) into opts from public.product_options where id=any(selected);
 sub=sub+(p.price_cents+opts)*qty;if sub>10000000 then raise exception 'ORDER_LIMIT';end if;
 insert into public.order_items(order_id,product_id,name,quantity,unit_price_cents,options_cents,total_cents,notes) values(oid,p.id,p.name,qty,p.price_cents,opts,(p.price_cents+opts)*qty,left(coalesce(line->>'notes',''),180)) returning id into itemid;
 for opt in select * from public.product_options where id=any(selected) loop insert into public.order_item_options(order_item_id,option_id,name,price_cents) values(itemid,opt.id,opt.name,opt.price_cents);end loop;
 end loop;
 if sub<s.minimum_cents then raise exception 'MINIMUM_ORDER';end if;
 if (p_request->>'expected_total_cents')::integer is distinct from sub+fee then raise exception 'PRICE_CHANGED';end if;
 update public.orders set subtotal_cents=sub,total_cents=sub+fee where id=oid;
 update public.orders set customer_phone=(select phone from public.profiles where id=u) where id=oid;
 insert into public.conversations(customer_id,store_id) values(u,s.id) on conflict(customer_id,store_id) do nothing;
 insert into public.order_events(order_id,actor_id,status) values(oid,u,'pending');
 insert into public.notifications(user_id,title,body,order_id) values(u,'Pedido registrado','Seu pedido foi registrado e aguarda resposta da loja.',oid);
 insert into public.notifications(user_id,title,body,order_id) select user_id,case when t.id is null then 'Novo pedido' else 'Novo pedido presencial — '||t.label end,case when t.id is null then 'Um cliente registrou um pedido para sua loja.' else 'Atendimento na mesa '||t.label end,oid from public.store_memberships where store_id=s.id;
 return oid;
end$$;

create or replace function public.nf_transition(p_order uuid,p_next text,p_version integer,p_reason text default '') returns void language plpgsql security definer set search_path='' set timezone='UTC' as $$declare u uuid:=private.require_user();o public.orders;allowed boolean:=false;charge integer;begin
 select * into o from public.orders where id=p_order for update;if not found then raise exception 'ORDER_FORBIDDEN';end if;
 if o.version is distinct from p_version then raise exception 'ORDER_CONFLICT';end if;
 if o.customer_id=u and p_next='cancelled' and o.status='pending' then allowed=true;
 elsif private.is_member(o.store_id) then
 allowed=case o.status when 'pending' then p_next in('accepted','rejected') when 'accepted' then p_next='preparing' when 'preparing' then p_next=case when o.fulfillment='dine_in' then 'ready_for_table' when o.fulfillment='pickup' then 'ready_for_pickup' else 'ready' end when 'ready' then p_next='out_for_delivery' when 'ready_for_table' then p_next='served' when 'ready_for_pickup' then p_next='picked_up' when 'out_for_delivery' then p_next='delivered' else false end;
 end if;if allowed is not true then raise exception 'INVALID_TRANSITION';end if;
 update public.orders set status=p_next,version=version+1,completed_at=case when p_next in('delivered','picked_up','served') then now() else completed_at end where id=p_order returning * into o;
 insert into public.order_events(order_id,actor_id,status,reason) values(p_order,u,p_next,left(coalesce(p_reason,''),300));
 insert into public.notifications(user_id,title,body,order_id) values(o.customer_id,'Pedido atualizado',p_next,p_order);
 if p_next in('delivered','picked_up','served') then charge=round((o.subtotal_cents-o.discount_cents)::numeric*o.commission_rate_bps/10000)::integer;if charge>0 then insert into public.commission_ledger(store_id,order_id,kind,amount_cents,rate_bps,reason,due_at) values(o.store_id,o.id,'charge',charge,o.commission_rate_bps,'Pedido concluído',o.completed_at+interval '7 days') on conflict(order_id) where kind='charge' do nothing;end if;end if;
end$$;

create or replace function public.nf_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=private.require_user();begin
 return jsonb_build_object('addresses',(select coalesce(jsonb_agg(to_jsonb(a) order by is_primary desc,created_at),'[]') from public.addresses a where user_id=u),
 'orders',(select coalesce(jsonb_agg(to_jsonb(o)-'payload'||jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('options',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.order_item_options x where x.order_item_id=i.id))),'[]') from public.order_items i where i.order_id=o.id),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at),'[]') from public.order_events e where e.order_id=o.id)) order by o.created_at desc,o.id desc),'[]') from (select * from public.orders where (customer_id=u or private.can_store(store_id)) and (status not in('delivered','picked_up','served','cancelled','rejected') or id in(select id from public.orders where (customer_id=u or private.can_store(store_id)) and status in('delivered','picked_up','served','cancelled','rejected') order by created_at desc,id desc limit 100)) order by created_at desc,id desc) o),
 'conversations',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('customer_name',(select name from public.profiles where id=c.customer_id),'read_at',(select read_at from public.conversation_reads where conversation_id=c.id and user_id=u),'messages',(select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at,m.id),'[]') from (select * from public.messages where conversation_id=c.id order by created_at desc,id desc limit 100) m))),'[]') from public.conversations c where c.customer_id=u or private.is_member(c.store_id)),
 'notifications',(select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]') from (select * from public.notifications where user_id=u order by created_at desc limit 100) n),
 'favorites',(select coalesce(jsonb_agg(to_jsonb(f)),'[]') from public.favorites f where user_id=u),
 'reviews',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.reviews r where customer_id=u),
 'ledger',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from public.commission_ledger l where private.can_store(store_id)),
 'settlements',(select coalesce(jsonb_agg(to_jsonb(st)),'[]') from public.commission_settlements st where private.can_store(store_id)));
end$$;

create or replace function public.nf_review(p_order uuid,p_rating integer,p_body text) returns void language plpgsql security definer set search_path='' as $$declare o public.orders;begin perform private.require_user();select * into o from public.orders where id=p_order and customer_id=auth.uid() and status in('delivered','picked_up','served');if not found then raise exception 'REVIEW_FORBIDDEN';end if;
 insert into public.reviews(order_id,customer_id,store_id,customer_name,rating,body) values(o.id,auth.uid(),o.store_id,o.customer_name,p_rating,trim(p_body)) on conflict(order_id) do update set rating=excluded.rating,body=excluded.body;end$$;

create or replace function public.nf_admin_adjust(p_order uuid,p_amount integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$declare o public.orders;balance bigint;begin perform private.require_admin();if coalesce(length(trim(p_reason)),0)<3 or p_amount=0 or p_amount is null then raise exception 'REASON_REQUIRED';end if;select * into o from public.orders where id=p_order for update;if not found then raise exception 'ORDER_NOT_FOUND';end if;
 if o.status not in('delivered','picked_up','served') or not exists(select 1 from public.commission_ledger where order_id=p_order and kind='charge') then raise exception 'ORDER_NOT_ELIGIBLE';end if;
 select coalesce(sum(amount_cents),0) into balance from public.commission_ledger where order_id=p_order;balance=balance-(select coalesce(sum(amount_cents),0) from public.commission_settlements where order_id=p_order);
 if balance::bigint+p_amount::bigint<0 then raise exception 'ADJUSTMENT_EXCEEDS_BALANCE';end if;
 insert into public.commission_ledger(store_id,order_id,kind,amount_cents,rate_bps,reason,actor_id) values(o.store_id,o.id,'adjustment',p_amount,o.commission_rate_bps,p_reason,auth.uid());perform private.audit('commission_adjustment',p_order,jsonb_build_object('amount_cents',p_amount,'reason',p_reason));end$$;

create or replace function public.nf_admin_cancel(p_order uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$declare o public.orders;begin
 perform private.require_admin();if coalesce(length(trim(p_reason)),0)<3 then raise exception 'REASON_REQUIRED';end if;select * into o from public.orders where id=p_order for update;
 if not found or o.status in('delivered','picked_up','served','cancelled','rejected') then raise exception 'INVALID_TRANSITION';end if;
 update public.orders set status='cancelled',version=version+1 where id=p_order;insert into public.order_events(order_id,actor_id,status,reason) values(p_order,auth.uid(),'cancelled',p_reason);insert into public.notifications(user_id,title,body,order_id) values(o.customer_id,'Pedido cancelado pelo suporte',p_reason,p_order);perform private.audit('support_cancellation',p_order,jsonb_build_object('previous_status',o.status,'reason',p_reason));
end$$;

-- CREATE OR REPLACE conserva ACLs; explicitamos novamente o acesso dos endpoints alterados.
revoke all on function public.nf_place_order(jsonb),public.nf_transition(uuid,text,integer,text),public.nf_snapshot(),public.nf_review(uuid,integer,text),public.nf_admin_adjust(uuid,integer,text),public.nf_admin_cancel(uuid,text) from public,anon,authenticated;
grant execute on function public.nf_place_order(jsonb),public.nf_transition(uuid,text,integer,text),public.nf_snapshot(),public.nf_review(uuid,integer,text),public.nf_admin_adjust(uuid,integer,text),public.nf_admin_cancel(uuid,text) to authenticated;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime' and puballtables) then raise exception 'REALTIME_PUBLICATION_SCOPE_CONFLICT';end if;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dining_tables') then alter publication supabase_realtime add table public.dining_tables;end if;
end$$;
commit;
