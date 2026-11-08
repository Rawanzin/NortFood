begin;
-- Aditiva. Nao modifica stores, catalogo, pedidos, comissoes ou store-media.
alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint nf_profile_avatar_path_check check (
 avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$')
);

-- Um bucket preexistente conflitante causa rollback; nunca converte arquivos.
do $$begin
 if exists(select 1 from storage.buckets where id='profile-avatars' and
  (name is distinct from 'profile-avatars' or public is distinct from false or file_size_limit is distinct from 1048576
   or allowed_mime_types is null or cardinality(allowed_mime_types)<>3
   or not (allowed_mime_types @> array['image/png','image/jpeg','image/webp'])))
 then raise exception 'PROFILE_AVATAR_BUCKET_CONFIG_CONFLICT';end if;
 if not exists(select 1 from pg_class where oid='storage.objects'::regclass and relrowsecurity)
 then raise exception 'STORAGE_RLS_REQUIRED';end if;
end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-avatars','profile-avatars',false,1048576,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;

-- A permissiva propria permite ler somente a propria imagem. Os guards AND
-- bloqueiam acesso cruzado e DML mesmo se outra politica permissiva surgir.
create policy nf_avatar_own_read on storage.objects for select to authenticated using (
 bucket_id='profile-avatars' and auth.uid() is not null
 and name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$')
);
create policy nf_avatar_anon_read_guard on storage.objects as restrictive for select to anon using(bucket_id<>'profile-avatars');
create policy nf_avatar_read_guard on storage.objects as restrictive for select to authenticated using (
 bucket_id<>'profile-avatars' or (auth.uid() is not null and
 name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'))
);
create policy nf_avatar_insert_guard on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'profile-avatars');
create policy nf_avatar_update_guard on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'profile-avatars') with check(bucket_id<>'profile-avatars');
create policy nf_avatar_delete_guard on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'profile-avatars');
-- TRUNCATE nao passa por RLS e nunca e uma operacao de cliente Storage.
revoke truncate on storage.objects from anon,authenticated;

create table private.avatar_upload_reservations(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 bytes integer not null check(bytes between 12 and 1048576),created_at timestamptz not null default now()
);
create index nf_avatar_upload_user_time on private.avatar_upload_reservations(user_id,created_at);
alter table private.avatar_upload_reservations enable row level security;
revoke all on private.avatar_upload_reservations from public,anon,authenticated,service_role;

create function public.nf_avatar_capabilities() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_user();
 return jsonb_build_object('enabled',true,'maxBytes',1048576);
end$$;

-- Nao aceita user_id. O objeto precisa existir no prefixo da identidade Auth.
-- Bloqueio de linha serializa trocas concorrentes e devolve o caminho anterior.
create function public.nf_set_profile_avatar(p_path text) returns text language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();previous text;begin
 select avatar_path into previous from public.profiles where id=u for update;
 if not found then raise exception 'PROFILE_REQUIRED';end if;
 if p_path is not null then
  if p_path !~ ('^' || u::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$')
  then raise exception 'INVALID_AVATAR_PATH';end if;
  perform 1 from storage.objects where bucket_id='profile-avatars' and name=p_path for share;
  if not found then raise exception 'AVATAR_OBJECT_REQUIRED';end if;
 end if;
 update public.profiles set avatar_path=p_path where id=u;
 return previous;
end$$;

-- Invocada apenas pela Edge Function depois de auth.getUser(), antes do decode.
-- Tentativas com imagem invalida/erro de upload continuam consumindo a cota.
create function public.nf_reserve_avatar_upload(p_user uuid,p_bytes integer) returns uuid language plpgsql security definer set search_path='' as $$
declare reservation uuid;begin
 if p_bytes is null or p_bytes not between 12 and 1048576 then raise exception 'INVALID_UPLOAD';end if;
 if p_user is null or not exists(select 1 from public.profiles where id=p_user) then raise exception 'PROFILE_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('nf:avatar:'||p_user::text,0));
 if (select count(*) from private.avatar_upload_reservations where user_id=p_user and created_at>now()-interval '1 minute')>=5
 or (select count(*) from private.avatar_upload_reservations where user_id=p_user and created_at>now()-interval '1 hour')>=30
 then raise exception 'AVATAR_UPLOAD_LIMIT';end if;
 insert into private.avatar_upload_reservations(user_id,bytes) values(p_user,p_bytes) returning id into reservation;
 return reservation;
end$$;

revoke all on function public.nf_avatar_capabilities(),public.nf_set_profile_avatar(text),public.nf_reserve_avatar_upload(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.nf_avatar_capabilities(),public.nf_set_profile_avatar(text) to authenticated;
grant execute on function public.nf_reserve_avatar_upload(uuid,integer) to service_role;
commit;
