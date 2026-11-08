begin;
-- Completes private drafts only. No changes to stores, orders or pilot settings.
create or replace function public.nf_save_store_draft(p_store uuid,p_data jsonb,p_version integer)
returns integer language plpgsql security definer set search_path='' as $$
declare v integer;begin
 perform private.require_store(p_store);
 perform 1 from public.stores where id=p_store for update;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>20000 then raise exception 'INVALID_STORE_DATA';end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k not in('name','about','categories','primaryCategory','phone','whatsapp','street','number','complement','neighborhood','city','state','postal_code','address_reference','hours','workingDays','pickupEnabled','deliveryEnabled','zones','estimateMinutes','minimumOrder','payments','deliveryInfo')) then raise exception 'INVALID_STORE_DATA';end if;
 -- Drafts may be incomplete. Bound new strings without accepting nested values.
 if exists(select 1 from (values ('state',2),('postal_code',10),('address_reference',120),('primaryCategory',36)) limits(key,max_length)
  where p_data?key and (jsonb_typeof(p_data->key) is distinct from 'string' or length(p_data->>key)>max_length)) then raise exception 'INVALID_STORE_DATA';end if;
 select version into v from public.store_drafts where store_id=p_store;
 if coalesce(v,0)<>coalesce(p_version,-1) then raise exception 'DRAFT_CONFLICT';end if;
 insert into public.store_drafts(store_id,data,version) values(p_store,p_data,1)
 on conflict(store_id) do update set data=excluded.data,version=public.store_drafts.version+1,updated_at=now() returning version into v;
 return v;
end$$;
revoke all on function public.nf_save_store_draft(uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.nf_save_store_draft(uuid,jsonb,integer) to authenticated;
commit;
