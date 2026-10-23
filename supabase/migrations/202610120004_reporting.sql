begin;
create function public.nf_report(p_store uuid,p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=private.require_user();start_time timestamptz:=p_from::timestamp at time zone 'America/Sao_Paulo';end_time timestamptz:=(p_to+1)::timestamp at time zone 'America/Sao_Paulo';begin
 if not private.can_store(p_store) then raise exception 'STORE_FORBIDDEN';end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_from>p_to or p_to-p_from>366 then raise exception 'INVALID_PERIOD';end if;
 return jsonb_build_object('from',p_from,'to',p_to,'completed',(select count(*) from public.orders where store_id=p_store and completed_at>=start_time and completed_at<end_time),'products_cents',(select coalesce(sum(subtotal_cents-discount_cents),0) from public.orders where store_id=p_store and completed_at>=start_time and completed_at<end_time),'delivery_cents',(select coalesce(sum(delivery_cents),0) from public.orders where store_id=p_store and completed_at>=start_time and completed_at<end_time),'generated_cents',(select coalesce(sum(amount_cents),0) from public.commission_ledger where store_id=p_store and kind='charge' and created_at>=start_time and created_at<end_time),'adjusted_cents',(select coalesce(sum(amount_cents),0) from public.commission_ledger where store_id=p_store and kind='adjustment' and created_at>=start_time and created_at<end_time),'paid_cents',(select coalesce(sum(amount_cents),0) from public.commission_settlements where store_id=p_store and paid_at>=start_time and paid_at<end_time),'balance_cents',(select coalesce(sum(amount_cents),0) from public.commission_ledger where store_id=p_store)-(select coalesce(sum(amount_cents),0) from public.commission_settlements where store_id=p_store),'overdue_cents',(select coalesce(sum(greatest(0,d.balance-coalesce((select sum(st.amount_cents) from public.commission_settlements st where st.order_id=d.order_id),0))),0) from (select l.order_id,sum(l.amount_cents) balance from public.commission_ledger l where l.store_id=p_store group by l.order_id having bool_or(l.kind='charge' and l.due_at<=now())) d));
end$$;
-- Assinatura única: 004 ainda não aplicada; não criar overload legado de dois argumentos.
create function public.nf_order_history(p_before timestamptz default null,p_limit integer default 50,p_before_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=private.require_user();begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT';end if;
 if (p_before is null)<>(p_before_id is null) or (p_before is not null and not isfinite(p_before)) then raise exception 'INVALID_CURSOR';end if;
 return (select coalesce(jsonb_agg(to_jsonb(o)-'payload'||jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('options',(select coalesce(jsonb_agg(to_jsonb(op)),'[]') from public.order_item_options op where op.order_item_id=i.id))),'[]') from public.order_items i where i.order_id=o.id),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at),'[]') from public.order_events e where e.order_id=o.id)) order by o.created_at desc,o.id desc),'[]') from (select * from public.orders where (customer_id=u or private.can_store(store_id)) and (p_before is null or (created_at,id)<(p_before,p_before_id)) order by created_at desc,id desc limit p_limit) o);
end$$;
create function public.nf_admin_request(p_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_admin();if p_status is null or p_status not in('processing','resolved') or coalesce(length(trim(p_reason)),0)<3 then raise exception 'INVALID_REQUEST_STATUS';end if;
 update public.data_requests set status=p_status,details=details||E'\nAdmin: '||left(p_reason,500) where id=p_id;if not found then raise exception 'REQUEST_NOT_FOUND';end if;perform private.audit('data_request',p_id,jsonb_build_object('status',p_status,'reason',p_reason));
end$$;
revoke all on function public.nf_report(uuid,date,date),public.nf_order_history(timestamptz,integer,uuid),public.nf_admin_request(uuid,text,text) from public,anon,authenticated;
grant execute on function public.nf_report(uuid,date,date),public.nf_order_history(timestamptz,integer,uuid),public.nf_admin_request(uuid,text,text) to authenticated;
create function public.nf_reorder_product(p_id uuid,p_direction integer) returns void language plpgsql security definer set search_path='' as $$declare s uuid;ordered uuid[];i integer;j integer;target uuid;begin
 select store_id into s from public.products where id=p_id;perform private.require_store(s);if p_direction not in(-1,1) or p_direction is null then raise exception 'INVALID_DIRECTION';end if;
 perform 1 from public.stores where id=s for update;
 select array_agg(id order by position,id) into ordered from public.products where store_id=s and not archived;
 i=array_position(ordered,p_id);j=i+p_direction;if i is null or j<1 or j>cardinality(ordered) then raise exception 'INVALID_POSITION';end if;
 target=ordered[j];ordered[j]=ordered[i];ordered[i]=target;
 update public.products p set position=x.n-1 from unnest(ordered) with ordinality x(id,n) where p.id=x.id;
end$$;
revoke all on function public.nf_reorder_product(uuid,integer) from public,anon,authenticated;
grant execute on function public.nf_reorder_product(uuid,integer) to authenticated;
create function public.nf_admin_cancel(p_order uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$declare o public.orders;begin
 perform private.require_admin();if coalesce(length(trim(p_reason)),0)<3 then raise exception 'REASON_REQUIRED';end if;select * into o from public.orders where id=p_order for update;
 if not found or o.status in('delivered','picked_up','cancelled','rejected') then raise exception 'INVALID_TRANSITION';end if;
 update public.orders set status='cancelled',version=version+1 where id=p_order;insert into public.order_events(order_id,actor_id,status,reason) values(p_order,auth.uid(),'cancelled',p_reason);insert into public.notifications(user_id,title,body,order_id) values(o.customer_id,'Pedido cancelado pelo suporte',p_reason,p_order);perform private.audit('support_cancellation',p_order,jsonb_build_object('previous_status',o.status,'reason',p_reason));
end$$;
revoke all on function public.nf_admin_cancel(uuid,text) from public,anon,authenticated;
grant execute on function public.nf_admin_cancel(uuid,text) to authenticated;
create function public.nf_order_detail(p_order uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_user();if not private.can_order(p_order) then raise exception 'ORDER_FORBIDDEN';end if;
 return (select to_jsonb(o)-'payload'||jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('options',(select coalesce(jsonb_agg(to_jsonb(op)),'[]') from public.order_item_options op where op.order_item_id=i.id))),'[]') from public.order_items i where i.order_id=o.id),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at),'[]') from public.order_events e where e.order_id=o.id)) from public.orders o where id=p_order);
end$$;
revoke all on function public.nf_order_detail(uuid) from public,anon,authenticated;
grant execute on function public.nf_order_detail(uuid) to authenticated;
commit;
