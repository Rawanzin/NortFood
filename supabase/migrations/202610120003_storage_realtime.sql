begin;
-- Avaliações públicas não expõem UUID de cliente nem identificador de pedido.
revoke select on public.reviews from anon,authenticated;
grant select(id,store_id,customer_name,rating,body,created_at) on public.reviews to anon,authenticated;
-- Bucket privado; leitura pública de mídia apenas quando a loja está aprovada.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('store-media','store-media',false,1048576,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy nf_media_read on storage.objects for select using(bucket_id='store-media' and (private.public_store((storage.foldername(name))[1]::uuid) or private.can_store((storage.foldername(name))[1]::uuid)));
-- Uploads somente pela função de servidor que valida usuário, loja, MIME, tamanho e assinatura.
-- Não há política INSERT/UPDATE/DELETE de objetos para anon/authenticated.
create function private.immutable_history() returns trigger language plpgsql set search_path='' as $$begin raise exception 'APPEND_ONLY_HISTORY';end$$;
revoke all on function private.immutable_history() from public,anon,authenticated;
create trigger nf_ledger_immutable before update or delete on public.commission_ledger for each row execute function private.immutable_history();
create trigger nf_settlement_immutable before update or delete on public.commission_settlements for each row execute function private.immutable_history();
create trigger nf_events_immutable before update or delete on public.order_events for each row execute function private.immutable_history();
create trigger nf_audit_immutable before update or delete on public.admin_audit_logs for each row execute function private.immutable_history();
do $$declare t text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 foreach t in array array['orders','messages','notifications'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
 end loop;end if;
end$$;
commit;
