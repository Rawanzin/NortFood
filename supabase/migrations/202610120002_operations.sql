begin;
create function private.require_user() returns uuid language plpgsql stable security definer set search_path='' as $$begin if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;return auth.uid();end$$;
create function private.require_store(s uuid) returns void language plpgsql stable security definer set search_path='' as $$begin perform private.require_user();if not private.is_member(s) then raise exception 'STORE_FORBIDDEN';end if;end$$;
create function private.require_admin() returns void language plpgsql stable security definer set search_path='' as $$begin perform private.require_user();if not private.is_admin() then raise exception 'ADMIN_REQUIRED';end if;end$$;
create function private.store_open(s public.stores) returns boolean language plpgsql stable set search_path='' as $$declare local_now timestamp:=now() at time zone 'America/Sao_Paulo';dow integer:=extract(dow from local_now);tm time:=local_now::time;begin
 if s.status<>'approved' or s.paused then return false;end if;
 if s.open_override is not null then return s.open_override;end if;
 if s.opens_at<s.closes_at then return dow=any(s.working_days) and tm>=s.opens_at and tm<s.closes_at;end if;
 return (dow=any(s.working_days) and tm>=s.opens_at) or (((dow+6)%7)=any(s.working_days) and tm<s.closes_at);
end$$;
create function private.audit(action text,entity uuid,details jsonb) returns void language sql security definer set search_path='' as $$insert into public.admin_audit_logs(actor_id,action,entity_id,details) values(auth.uid(),action,entity,details)$$;
revoke all on function private.require_user(),private.require_store(uuid),private.require_admin(),private.store_open(public.stores),private.audit(text,uuid,jsonb) from public,anon,authenticated;

create function public.nf_context() returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=private.require_user();begin return jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=u),'memberships',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from public.store_memberships m where user_id=u),'is_admin',private.is_admin());end$$;
create function public.nf_catalog() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('is_open',private.store_open(s),
 'categories',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name)),'[]') from public.store_categories sc join public.categories c on c.id=sc.category_id where sc.store_id=s.id and c.active),
 'products',(select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('groups',(select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('options',(select coalesce(jsonb_agg(to_jsonb(op)),'[]') from public.product_options op where op.group_id=g.id and op.active))),'[]') from public.product_option_groups g where g.product_id=p.id and g.active)) order by p.position,p.id),'[]') from public.products p where p.store_id=s.id and not p.archived),
 'zones',(select coalesce(jsonb_agg(to_jsonb(z)),'[]') from public.delivery_zones z where z.store_id=s.id and z.active),
 'rating',(select round(avg(rating)::numeric,1) from public.reviews r where r.store_id=s.id),'review_count',(select count(*) from public.reviews r where r.store_id=s.id))), '[]') from public.stores s where s.status='approved' or private.can_store(s.id)$$;
create function public.nf_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=private.require_user();begin
 return jsonb_build_object('addresses',(select coalesce(jsonb_agg(to_jsonb(a) order by is_primary desc,created_at),'[]') from public.addresses a where user_id=u),
 'orders',(select coalesce(jsonb_agg(to_jsonb(o)-'payload'||jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('options',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.order_item_options x where x.order_item_id=i.id))),'[]') from public.order_items i where i.order_id=o.id),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at),'[]') from public.order_events e where e.order_id=o.id)) order by o.created_at desc),'[]') from (select * from public.orders where (customer_id=u or private.can_store(store_id)) and (status not in('delivered','picked_up','cancelled','rejected') or id in(select id from public.orders where (customer_id=u or private.can_store(store_id)) and status in('delivered','picked_up','cancelled','rejected') order by created_at desc limit 100)) order by created_at desc) o),
 'conversations',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('customer_name',(select name from public.profiles where id=c.customer_id),'read_at',(select read_at from public.conversation_reads where conversation_id=c.id and user_id=u),'messages',(select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at,m.id),'[]') from (select * from public.messages where conversation_id=c.id order by created_at desc,id desc limit 100) m))),'[]') from public.conversations c where c.customer_id=u or private.is_member(c.store_id)),
 'notifications',(select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]') from (select * from public.notifications where user_id=u order by created_at desc limit 100) n),
 'favorites',(select coalesce(jsonb_agg(to_jsonb(f)),'[]') from public.favorites f where user_id=u),
 'reviews',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.reviews r where customer_id=u),
 'ledger',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from public.commission_ledger l where private.can_store(store_id)),
 'settlements',(select coalesce(jsonb_agg(to_jsonb(st)),'[]') from public.commission_settlements st where private.can_store(store_id)));
end$$;
create function public.nf_request_store(p_name text) returns uuid language plpgsql security definer set search_path='' as $$declare u uuid:=private.require_user();s uuid;begin
 if length(trim(p_name)) not between 1 and 80 then raise exception 'INVALID_STORE_NAME';end if;
 if (select count(*) from public.store_memberships where user_id=u)>=3 then raise exception 'STORE_REQUEST_LIMIT';end if;
 insert into public.stores(name) values(trim(p_name)) returning id into s;insert into public.store_memberships(store_id,user_id) values(s,u);return s;
end$$;
create function public.nf_update_profile(p_name text,p_phone text,p_notifications boolean) returns void language plpgsql security definer set search_path='' as $$begin perform private.require_user();update public.profiles set name=trim(p_name),phone=left(coalesce(p_phone,''),30),notifications_enabled=p_notifications where id=auth.uid();end$$;
create function public.nf_save_address(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare u uuid:=private.require_user();a uuid:=coalesce(p_id,gen_random_uuid());begin
 if p_id is not null and not exists(select 1 from public.addresses where id=p_id and user_id=u) then raise exception 'ADDRESS_FORBIDDEN';end if;
 if coalesce((p_data->>'is_primary')::boolean,false) then update public.addresses set is_primary=false where user_id=u;end if;
 insert into public.addresses(id,user_id,label,street,number,complement,neighborhood,city,state,reference,latitude,longitude,is_primary)
 values(a,u,left(p_data->>'label',40),p_data->>'street',p_data->>'number',left(coalesce(p_data->>'complement',''),100),p_data->>'neighborhood',coalesce(nullif(p_data->>'city',''),'Porteirinha'),coalesce(nullif(p_data->>'state',''),'MG'),left(coalesce(p_data->>'reference',''),120),(p_data->>'latitude')::numeric,(p_data->>'longitude')::numeric,coalesce((p_data->>'is_primary')::boolean,false))
 on conflict(id) do update set label=excluded.label,street=excluded.street,number=excluded.number,complement=excluded.complement,neighborhood=excluded.neighborhood,city=excluded.city,state=excluded.state,reference=excluded.reference,latitude=excluded.latitude,longitude=excluded.longitude,is_primary=excluded.is_primary;return a;
end$$;
create function public.nf_delete_address(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin perform private.require_user();delete from public.addresses where id=p_id and user_id=auth.uid();if not found then raise exception 'ADDRESS_FORBIDDEN';end if;end$$;
create function public.nf_save_store(p_id uuid,p_data jsonb,p_categories uuid[],p_zones jsonb) returns void language plpgsql security definer set search_path='' as $$declare z jsonb;begin
 perform private.require_store(p_id);perform 1 from public.stores where id=p_id for update;
 if cardinality(p_categories)<1 or p_categories is null or exists(select 1 from unnest(p_categories) c where not exists(select 1 from public.categories where id=c and active)) then raise exception 'INVALID_CATEGORIES';end if;
 update public.stores set name=trim(p_data->>'name'),description=left(coalesce(p_data->>'description',''),500),phone=left(coalesce(p_data->>'phone',''),30),whatsapp=left(coalesce(p_data->>'whatsapp',''),30),street=left(coalesce(p_data->>'street',''),180),number=left(coalesce(p_data->>'number',''),30),complement=left(coalesce(p_data->>'complement',''),100),neighborhood=left(coalesce(p_data->>'neighborhood',''),80),city=coalesce(p_data->>'city','Porteirinha'),
 opens_at=(p_data->>'opens_at')::time,closes_at=(p_data->>'closes_at')::time,working_days=array(select jsonb_array_elements_text(p_data->'working_days')::integer),pickup_enabled=coalesce((p_data->>'pickup_enabled')::boolean,false),delivery_enabled=coalesce((p_data->>'delivery_enabled')::boolean,true),minimum_cents=(p_data->>'minimum_cents')::integer,estimate_minutes=(p_data->>'estimate_minutes')::integer,payment_methods=array(select jsonb_array_elements_text(p_data->'payment_methods')),delivery_info=left(coalesce(p_data->>'delivery_info',''),180),logo_url=coalesce(p_data->>'logo_url',logo_url),cover_url=coalesce(p_data->>'cover_url',cover_url) where id=p_id;
 delete from public.store_categories where store_id=p_id;insert into public.store_categories select p_id,c from (select distinct unnest(p_categories) c) a;
 update public.delivery_zones set active=false where store_id=p_id;
 for z in select * from jsonb_array_elements(p_zones) loop insert into public.delivery_zones(store_id,neighborhood,city,state,fee_cents) values(p_id,trim(z->>'neighborhood'),coalesce(z->>'city','Porteirinha'),'MG',(z->>'fee_cents')::integer) on conflict(store_id,neighborhood,city,state) do update set fee_cents=excluded.fee_cents,active=true;end loop;
end$$;
create function public.nf_set_store_open(p_store uuid,p_open boolean,p_paused boolean) returns void language plpgsql security definer set search_path='' as $$begin perform private.require_store(p_store);update public.stores set open_override=p_open,paused=p_paused where id=p_store;end$$;
create function public.nf_save_product(p_store uuid,p_id uuid,p_data jsonb,p_groups jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare p uuid:=coalesce(p_id,gen_random_uuid());g jsonb;op jsonb;gid uuid;begin
 perform private.require_store(p_store);
 if p_id is not null and not exists(select 1 from public.products where id=p_id and store_id=p_store) then raise exception 'PRODUCT_FORBIDDEN';end if;
 if p_id is not null then perform 1 from public.products where id=p_id for update;end if;
 insert into public.products(id,store_id,name,description,price_cents,category,available,notes_label,image_url) values(p,p_store,trim(p_data->>'name'),left(coalesce(p_data->>'description',''),300),(p_data->>'price_cents')::integer,left(coalesce(p_data->>'category','Outros'),40),coalesce((p_data->>'available')::boolean,true),left(coalesce(p_data->>'notes_label',''),180),p_data->>'image_url')
 on conflict(id) do update set name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,category=excluded.category,available=excluded.available,notes_label=excluded.notes_label,image_url=coalesce(excluded.image_url,public.products.image_url);
 update public.product_options set active=false where group_id in(select id from public.product_option_groups where product_id=p);update public.product_option_groups set active=false where product_id=p;
 for g in select * from jsonb_array_elements(p_groups) loop
 if jsonb_array_length(g->'options')>20 or (g->>'max_choices')::integer>jsonb_array_length(g->'options') then raise exception 'INVALID_OPTION_GROUP';end if;
 insert into public.product_option_groups(product_id,name,min_choices,max_choices) values(p,left(g->>'name',80),(g->>'min_choices')::integer,(g->>'max_choices')::integer) returning id into gid;
 for op in select * from jsonb_array_elements(g->'options') loop insert into public.product_options(group_id,name,price_cents) values(gid,left(op->>'name',80),(op->>'price_cents')::integer);end loop;
 end loop;return p;
end$$;
create function public.nf_product_action(p_id uuid,p_action text,p_position integer default null) returns void language plpgsql security definer set search_path='' as $$declare s uuid;begin select store_id into s from public.products where id=p_id for update;perform private.require_store(s);
 if p_action='archive' then update public.products set archived=true,available=false where id=p_id;
 elsif p_action='toggle' then update public.products set available=not available where id=p_id;
 elsif p_action='position' and p_position between 0 and 100000 then update public.products set position=p_position where id=p_id;else raise exception 'INVALID_PRODUCT_ACTION';end if;
end$$;

-- Chave idempotente bloqueada por transação. Nenhum total/preço do browser é autoridade.
create function public.nf_place_order(p_request jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare
 u uuid:=private.require_user();idem uuid:=(p_request->>'idempotency_key')::uuid;s public.stores;a public.addresses;z public.delivery_zones;p public.products;line jsonb;oid uuid;itemid uuid;qty integer;sub integer:=0;fee integer:=0;opts integer;selected uuid[];g public.product_option_groups;n integer;existing public.orders;opt public.product_options;rate integer;
begin
 if idem is null then raise exception 'IDEMPOTENCY_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||idem::text,0));
 select * into existing from public.orders where customer_id=u and idempotency_key=idem;
 if found then if existing.payload<>p_request then raise exception 'IDEMPOTENCY_CONFLICT';end if;return existing.id;end if;
 select commission_rate_bps into rate from public.platform_settings where id=true and pilot_enabled for share;if not found then raise exception 'PILOT_NOT_ENABLED';end if;
 if (select count(*) from public.orders where customer_id=u and created_at>now()-interval '1 minute')>=6 then raise exception 'RATE_LIMIT';end if;
 select * into s from public.stores where id=(p_request->>'store_id')::uuid for share;
 if not found or not private.store_open(s) then raise exception 'STORE_UNAVAILABLE';end if;
 if private.is_member(s.id) then raise exception 'SELF_ORDER_NOT_ALLOWED';end if;
 if p_request->>'fulfillment'='pickup' then if not s.pickup_enabled or s.street='' or s.number='' then raise exception 'PICKUP_UNAVAILABLE';end if;
 elsif p_request->>'fulfillment'='delivery' then
 if not s.delivery_enabled then raise exception 'DELIVERY_UNAVAILABLE';end if;
 select * into a from public.addresses where id=(p_request->>'address_id')::uuid and user_id=u for share;if not found then raise exception 'ADDRESS_FORBIDDEN';end if;
 select * into z from public.delivery_zones where store_id=s.id and active and lower(trim(neighborhood))=lower(trim(a.neighborhood)) and lower(trim(city))=lower(trim(a.city)) and state=a.state for share;if not found then raise exception 'DELIVERY_OUTSIDE_ZONE';end if;fee=z.fee_cents;
 else raise exception 'INVALID_FULFILLMENT';end if;
 if not (p_request->>'payment_method'=any(s.payment_methods)) then raise exception 'PAYMENT_UNAVAILABLE';end if;
 if jsonb_typeof(p_request->'items')<>'array' or jsonb_array_length(p_request->'items') not between 1 and 40 then raise exception 'INVALID_CART';end if;
 insert into public.orders(customer_id,store_id,idempotency_key,payload,fulfillment,payment_method,customer_name,address_snapshot,store_name,notes,subtotal_cents,delivery_cents,total_cents,commission_rate_bps)
 values(u,s.id,idem,p_request,p_request->>'fulfillment',p_request->>'payment_method',(select name from public.profiles where id=u),case when p_request->>'fulfillment'='pickup' then jsonb_build_object('street',s.street,'number',s.number,'complement',s.complement,'neighborhood',s.neighborhood,'city',s.city,'state',s.state) else to_jsonb(a)-'user_id' end,s.name,left(coalesce(p_request->>'notes',''),300),1,fee,1+fee,rate) returning id into oid;
 for line in select * from jsonb_array_elements(p_request->'items') loop
 select * into p from public.products where id=(line->>'product_id')::uuid and store_id=s.id and available and not archived for share;if not found then raise exception 'PRODUCT_UNAVAILABLE';end if;
 qty=(line->>'quantity')::integer;if qty not between 1 and 20 then raise exception 'INVALID_QUANTITY';end if;
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
 insert into public.notifications(user_id,title,body,order_id) select user_id,'Novo pedido','Um cliente registrou um pedido para sua loja.',oid from public.store_memberships where store_id=s.id;
 return oid;
end$$;
create function public.nf_transition(p_order uuid,p_next text,p_version integer,p_reason text default '') returns void language plpgsql security definer set search_path='' as $$declare u uuid:=private.require_user();o public.orders;allowed boolean:=false;charge integer;begin
 select * into o from public.orders where id=p_order for update;if not found then raise exception 'ORDER_FORBIDDEN';end if;
 if o.version<>p_version then raise exception 'ORDER_CONFLICT';end if;
 if o.customer_id=u and p_next='cancelled' and o.status='pending' then allowed=true;
 elsif private.is_member(o.store_id) then
 allowed=case o.status when 'pending' then p_next in('accepted','rejected') when 'accepted' then p_next='preparing' when 'preparing' then p_next=case when o.fulfillment='pickup' then 'ready_for_pickup' else 'ready' end when 'ready' then p_next='out_for_delivery' when 'ready_for_pickup' then p_next='picked_up' when 'out_for_delivery' then p_next='delivered' else false end;
 end if;if not allowed then raise exception 'INVALID_TRANSITION';end if;
 update public.orders set status=p_next,version=version+1,completed_at=case when p_next in('delivered','picked_up') then now() else completed_at end where id=p_order;
 insert into public.order_events(order_id,actor_id,status,reason) values(p_order,u,p_next,left(p_reason,300));
 insert into public.notifications(user_id,title,body,order_id) values(o.customer_id,'Pedido atualizado',p_next,p_order);
 if p_next in('delivered','picked_up') then charge=round((o.subtotal_cents-o.discount_cents)::numeric*o.commission_rate_bps/10000)::integer;if charge>0 then insert into public.commission_ledger(store_id,order_id,kind,amount_cents,rate_bps,reason) values(o.store_id,o.id,'charge',charge,o.commission_rate_bps,'Pedido concluído') on conflict(order_id) where kind='charge' do nothing;end if;end if;
end$$;
create function public.nf_confirm_payment(p_order uuid) returns void language plpgsql security definer set search_path='' as $$declare o public.orders;begin select * into o from public.orders where id=p_order for update;perform private.require_store(o.store_id);if o.status in('cancelled','rejected') then raise exception 'PAYMENT_UNAVAILABLE';end if;update public.orders set payment_confirmed_at=coalesce(payment_confirmed_at,now()),payment_confirmed_by=coalesce(payment_confirmed_by,auth.uid()) where id=p_order;end$$;
create function public.nf_chat(p_store uuid) returns uuid language plpgsql security definer set search_path='' as $$declare u uuid:=private.require_user();c uuid;begin select id into c from public.conversations where customer_id=u and store_id=p_store;if found then return c;end if;if not private.public_store(p_store) or private.is_member(p_store) then raise exception 'CHAT_UNAVAILABLE';end if;insert into public.conversations(customer_id,store_id) values(u,p_store) on conflict(customer_id,store_id) do nothing;select id into c from public.conversations where customer_id=u and store_id=p_store;return c;end$$;
create function public.nf_send_message(p_conversation uuid,p_body text,p_key uuid) returns uuid language plpgsql security definer set search_path='' as $$declare u uuid:=private.require_user();m uuid;c public.conversations;begin
 if not private.can_chat(p_conversation) then raise exception 'CHAT_FORBIDDEN';end if;
 if (select count(*) from public.messages where sender_id=u and created_at>now()-interval '1 minute')>=30 then raise exception 'RATE_LIMIT';end if;
 insert into public.messages(conversation_id,sender_id,sender_name,body,client_key) values(p_conversation,u,(select name from public.profiles where id=u),trim(p_body),p_key) on conflict(sender_id,client_key) do nothing returning id into m;
 if m is null then select id into m from public.messages where sender_id=u and client_key=p_key and conversation_id=p_conversation and body=trim(p_body);if m is null then raise exception 'IDEMPOTENCY_CONFLICT';end if;else
 select * into c from public.conversations where id=p_conversation;
 if c.customer_id=u then insert into public.notifications(user_id,title,body) select user_id,'Nova mensagem','Mensagem de um cliente na sua loja.' from public.store_memberships where store_id=c.store_id;else insert into public.notifications(user_id,title,body) values(c.customer_id,'Nova mensagem','A loja enviou uma mensagem.');end if;
 end if;return m;
end$$;
create function public.nf_mark_read(p_notification uuid default null,p_conversation uuid default null) returns void language plpgsql security definer set search_path='' as $$begin perform private.require_user();if p_conversation is not null then if not private.can_chat(p_conversation) then raise exception 'CHAT_FORBIDDEN';end if;insert into public.conversation_reads(conversation_id,user_id) values(p_conversation,auth.uid()) on conflict(conversation_id,user_id) do update set read_at=now();else update public.notifications set read_at=now() where user_id=auth.uid() and (p_notification is null or id=p_notification);end if;end$$;
create function public.nf_review(p_order uuid,p_rating integer,p_body text) returns void language plpgsql security definer set search_path='' as $$declare o public.orders;begin perform private.require_user();select * into o from public.orders where id=p_order and customer_id=auth.uid() and status in('delivered','picked_up');if not found then raise exception 'REVIEW_FORBIDDEN';end if;
 insert into public.reviews(order_id,customer_id,store_id,customer_name,rating,body) values(o.id,auth.uid(),o.store_id,o.customer_name,p_rating,trim(p_body)) on conflict(order_id) do update set rating=excluded.rating,body=excluded.body;end$$;
create function public.nf_data_request(p_kind text,p_details text) returns uuid language plpgsql security definer set search_path='' as $$declare r uuid;begin perform private.require_user();if exists(select 1 from public.data_requests where user_id=auth.uid() and kind=p_kind and status='pending') then raise exception 'REQUEST_ALREADY_PENDING';end if;insert into public.data_requests(user_id,kind,details) values(auth.uid(),p_kind,left(p_details,1000)) returning id into r;return r;end$$;
create function public.nf_admin_store(p_store uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin perform private.require_admin();if length(trim(p_reason))<3 then raise exception 'REASON_REQUIRED';end if;update public.stores set status=p_status,status_reason=p_reason where id=p_store;if not found then raise exception 'STORE_NOT_FOUND';end if;perform private.audit('store_status',p_store,jsonb_build_object('status',p_status,'reason',p_reason));end$$;
create function public.nf_admin_rate(p_bps integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin perform private.require_admin();if length(trim(p_reason))<3 then raise exception 'REASON_REQUIRED';end if;update public.platform_settings set commission_rate_bps=p_bps where id=true;perform private.audit('commission_rate',null,jsonb_build_object('rate_bps',p_bps,'reason',p_reason));end$$;
create function public.nf_admin_pilot(p_enabled boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin perform private.require_admin();if p_enabled is null or length(trim(p_reason))<3 then raise exception 'REASON_REQUIRED';end if;update public.platform_settings set pilot_enabled=p_enabled where id=true;perform private.audit('pilot_status',null,jsonb_build_object('enabled',p_enabled,'reason',p_reason));end$$;
create function public.nf_operating_status() returns boolean language sql stable security definer set search_path='' as $$select pilot_enabled from public.platform_settings where id=true$$;
create function public.nf_admin_category(p_id uuid,p_name text,p_active boolean) returns uuid language plpgsql security definer set search_path='' as $$declare c uuid:=coalesce(p_id,gen_random_uuid());begin perform private.require_admin();if length(trim(p_name)) not between 1 and 40 then raise exception 'INVALID_CATEGORY';end if;insert into public.categories(id,name,active) values(c,trim(p_name),p_active) on conflict(id) do update set name=excluded.name,active=excluded.active;perform private.audit('category',c,jsonb_build_object('name',p_name,'active',p_active));return c;end$$;
create function public.nf_admin_settle(p_order uuid,p_amount integer,p_key uuid,p_reference text,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$declare o public.orders;due integer;sid uuid;existing public.commission_settlements;begin
 perform private.require_admin();select * into o from public.orders where id=p_order for update;if not found then raise exception 'ORDER_NOT_FOUND';end if;
 select * into existing from public.commission_settlements where operation_key=p_key;if found then if existing.order_id<>p_order or existing.amount_cents<>p_amount then raise exception 'IDEMPOTENCY_CONFLICT';end if;return existing.id;end if;
 select coalesce(sum(amount_cents),0) into due from public.commission_ledger where order_id=p_order;due=due-(select coalesce(sum(amount_cents),0) from public.commission_settlements where order_id=p_order);
 if p_amount<=0 or p_amount>due or p_amount is null or p_key is null then raise exception 'INVALID_SETTLEMENT';end if;
 insert into public.commission_settlements(order_id,store_id,amount_cents,operation_key,reference,reason,actor_id) values(p_order,o.store_id,p_amount,p_key,trim(p_reference),p_reason,auth.uid()) returning id into sid;perform private.audit('commission_settlement',sid,jsonb_build_object('order_id',p_order,'amount_cents',p_amount,'reason',p_reason));return sid;
end$$;
create function public.nf_admin_adjust(p_order uuid,p_amount integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$declare o public.orders;balance integer;begin perform private.require_admin();if length(trim(p_reason))<3 or p_amount=0 or p_amount is null then raise exception 'REASON_REQUIRED';end if;select * into o from public.orders where id=p_order for update;if not found then raise exception 'ORDER_NOT_FOUND';end if;
 if o.status not in('delivered','picked_up') or not exists(select 1 from public.commission_ledger where order_id=p_order and kind='charge') then raise exception 'ORDER_NOT_ELIGIBLE';end if;
 select coalesce(sum(amount_cents),0) into balance from public.commission_ledger where order_id=p_order;balance=balance-(select coalesce(sum(amount_cents),0) from public.commission_settlements where order_id=p_order);
 if balance+p_amount<0 then raise exception 'ADJUSTMENT_EXCEEDS_BALANCE';end if;
 insert into public.commission_ledger(store_id,order_id,kind,amount_cents,rate_bps,reason,actor_id) values(o.store_id,o.id,'adjustment',p_amount,o.commission_rate_bps,p_reason,auth.uid());perform private.audit('commission_adjustment',p_order,jsonb_build_object('amount_cents',p_amount,'reason',p_reason));end$$;
create function public.nf_admin_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform private.require_admin();return jsonb_build_object('stores',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.stores s),'categories',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.categories c),'settings',(select to_jsonb(p) from public.platform_settings p),'requests',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.data_requests r),'audit',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select * from public.admin_audit_logs order by created_at desc limit 100) a));end$$;

-- Sem EXECUTE público implícito; catálogo é a única RPC anônima.
do $$declare f record;begin for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nf_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to authenticated',f.sig);end loop;end$$;
grant execute on function public.nf_catalog() to anon;
grant execute on function public.nf_operating_status() to anon;
commit;
