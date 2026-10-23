begin;
-- Aditiva após 002/003/004. Não altera a 001, nem coordenadas/histórico existentes.
alter table public.stores
 add column latitude double precision,
 add column longitude double precision,
 add constraint store_coordinates_pair check ((latitude is null)=(longitude is null)),
 add constraint store_coordinates_range check (latitude is null or
  (latitude between -90 and 90 and longitude between -180 and 180));
-- Os limites também rejeitam NaN e infinitos; zero é válido. RLS existente preservada.
grant select(latitude,longitude) on public.stores to anon,authenticated;

-- Preserva integralmente a edição existente, movendo sua implementação para private.
-- O endpoint público mantém a mesma assinatura; não cria overload ou substitui 001.
alter function public.nf_save_store(uuid,jsonb,uuid[],jsonb) set schema private;
alter function private.nf_save_store(uuid,jsonb,uuid[],jsonb) rename to save_store_base;
revoke all on function private.save_store_base(uuid,jsonb,uuid[],jsonb) from public,anon,authenticated;
create function public.nf_save_store(p_id uuid,p_data jsonb,p_categories uuid[],p_zones jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare lat double precision;lng double precision;
begin
 perform private.require_store(p_id);
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'INVALID_STORE_DATA';end if;
 perform 1 from public.stores where id=p_id for update;
 if (p_data ? 'latitude') or (p_data ? 'longitude') then
  if not ((p_data ? 'latitude') and (p_data ? 'longitude')) then raise exception 'INVALID_COORDINATES';end if;
  if (p_data->'latitude')='null'::jsonb and (p_data->'longitude')='null'::jsonb then
   lat=null;lng=null;
  else
   if jsonb_typeof(p_data->'latitude') is distinct from 'number' or jsonb_typeof(p_data->'longitude') is distinct from 'number' then raise exception 'INVALID_COORDINATES';end if;
   lat=(p_data->>'latitude')::double precision;lng=(p_data->>'longitude')::double precision;
   if not (lat between -90 and 90 and lng between -180 and 180) then raise exception 'INVALID_COORDINATES';end if;
  end if;
  update public.stores set latitude=lat,longitude=lng where id=p_id;
 end if;
 perform private.save_store_base(p_id,p_data,p_categories,p_zones);
end$$;
revoke all on function public.nf_save_store(uuid,jsonb,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.nf_save_store(uuid,jsonb,uuid[],jsonb) to authenticated;

-- Mesmo endereço congelado pela 002, acrescido da posição da loja no mesmo INSERT.
-- A RPC de checkout já mantém a linha da loja bloqueada para leitura até o commit.
create function private.pickup_location_snapshot() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.fulfillment='pickup' then
  new.address_snapshot=new.address_snapshot ||
   (select jsonb_build_object('latitude',s.latitude,'longitude',s.longitude)
    from public.stores s where s.id=new.store_id);
 end if;
 return new;
end$$;
revoke all on function private.pickup_location_snapshot() from public,anon,authenticated;
create trigger nf_pickup_location_snapshot before insert on public.orders
for each row execute function private.pickup_location_snapshot();
commit;
