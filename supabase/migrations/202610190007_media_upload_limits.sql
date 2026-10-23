begin;
-- Aditiva: nenhuma alteração dos registros anteriores ou das políticas Storage.
create table private.media_upload_reservations(
 id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id),
 user_id uuid not null references public.profiles(id),bytes integer not null check(bytes between 12 and 1048576),
 created_at timestamptz not null default now()
);
create index media_upload_reservations_store_time on private.media_upload_reservations(store_id,created_at);
alter table private.media_upload_reservations enable row level security;
revoke all on private.media_upload_reservations from public,anon,authenticated,service_role;
-- Somente a função de servidor autenticada pode reservar uma tentativa.
create function public.nf_reserve_media_upload(p_store uuid,p_user uuid,p_bytes integer) returns uuid
language plpgsql security definer set search_path='' as $$declare reservation uuid;begin
 if p_bytes is null or p_bytes not between 12 and 1048576 then raise exception 'INVALID_UPLOAD';end if;
 if not exists(select 1 from public.store_memberships where store_id=p_store and user_id=p_user) then raise exception 'STORE_FORBIDDEN';end if;
 perform pg_advisory_xact_lock(hashtextextended('nf:media:'||p_store::text,0));
 if (select count(*) from private.media_upload_reservations where store_id=p_store and created_at>now()-interval '1 minute')>=10
 or (select count(*) from private.media_upload_reservations where store_id=p_store and created_at>now()-interval '24 hours')>=100
 or (select count(*) from storage.objects where bucket_id='store-media' and split_part(name,'/',1)=p_store::text)>=500
 then raise exception 'UPLOAD_LIMIT';end if;
 insert into private.media_upload_reservations(store_id,user_id,bytes) values(p_store,p_user,p_bytes) returning id into reservation;
 return reservation;
end$$;
revoke all on function public.nf_reserve_media_upload(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.nf_reserve_media_upload(uuid,uuid,integer) to service_role;
commit;
