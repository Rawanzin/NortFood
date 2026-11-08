begin;
-- Funções e publicação Realtime: não altera modalidades, pedidos ou dados comerciais existentes.
create function public.nf_set_fulfillment(p_store uuid,p_delivery boolean,p_pickup boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.stores;
begin
 perform private.require_store(p_store);
 if p_delivery is null or p_pickup is null then raise exception 'INVALID_FULFILLMENT';end if;
 select * into s from public.stores where id=p_store for update;
 if not found then raise exception 'STORE_FORBIDDEN';end if;
 if p_pickup and (trim(s.street)='' or trim(s.number)='') then raise exception 'PICKUP_ADDRESS_REQUIRED';end if;
 update public.stores set delivery_enabled=p_delivery,pickup_enabled=p_pickup where id=p_store;
 return jsonb_build_object('delivery_enabled',p_delivery,'pickup_enabled',p_pickup);
end$$;
revoke all on function public.nf_set_fulfillment(uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.nf_set_fulfillment(uuid,boolean,boolean) to authenticated;

-- Ambas desativadas suspendem novos pedidos, sem modificar paused/open_override
-- nem interromper os pedidos que já foram recebidos.
create or replace function private.store_open(s public.stores) returns boolean
language plpgsql stable set search_path='' as $$
declare local_now timestamp:=now() at time zone 'America/Sao_Paulo';dow integer:=extract(dow from local_now);tm time:=local_now::time;
begin
 if s.status<>'approved' or s.paused or not(s.delivery_enabled or s.pickup_enabled) then return false;end if;
 if s.open_override is not null then return s.open_override;end if;
 if s.opens_at<s.closes_at then return dow=any(s.working_days) and tm>=s.opens_at and tm<s.closes_at;end if;
 return (dow=any(s.working_days) and tm>=s.opens_at) or (((dow+6)%7)=any(s.working_days) and tm<s.closes_at);
end$$;
revoke all on function private.store_open(public.stores) from public,anon,authenticated;
do $$declare t text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime' and puballtables) then raise exception 'REALTIME_PUBLICATION_SCOPE_CONFLICT';end if;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['stores','delivery_zones'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
  end loop;
 else raise warning 'SUPABASE_REALTIME_PUBLICATION_MISSING: conferir eventos antes do piloto';end if;
end$$;
commit;
