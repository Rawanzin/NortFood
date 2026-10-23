begin;
-- Avaliações públicas não expõem UUID de cliente nem identificador de pedido.
revoke select on public.reviews from public,anon,authenticated;
revoke select(customer_id,order_id) on public.reviews from public,anon,authenticated;
grant select(id,store_id,customer_name,rating,body,created_at) on public.reviews to anon,authenticated;
-- Bucket privado; leitura pública de mídia apenas quando a loja está aprovada.
-- Não converte silenciosamente um bucket existente nem altera/remove seus arquivos.
do $$begin
 if exists(select 1 from storage.buckets where id='store-media' and (public is distinct from false or name is distinct from 'store-media' or file_size_limit is distinct from 1048576 or allowed_mime_types is null or cardinality(allowed_mime_types)<>3 or not (allowed_mime_types @> array['image/png','image/jpeg','image/webp']))) then raise exception 'STORE_MEDIA_BUCKET_CONFIG_CONFLICT';end if;
 if not exists(select 1 from pg_class where oid='storage.objects'::regclass and relrowsecurity) then raise exception 'STORAGE_RLS_REQUIRED';end if;
end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('store-media','store-media',false,1048576,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create function private.media_store(p_name text) returns uuid language plpgsql immutable set search_path='' as $$declare folder text:=split_part(p_name,'/',1);begin
 if strpos(p_name,'/')>0 and folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return folder::uuid;end if;return null;
end$$;
revoke all on function private.media_store(text) from public,anon,authenticated;
grant execute on function private.media_store(text) to anon,authenticated;
create policy nf_media_read on storage.objects for select to anon,authenticated using(bucket_id='store-media' and (private.public_store(private.media_store(name)) or private.can_store(private.media_store(name))));
-- Políticas permissivas futuras não podem abrir leitura privada ou escrita nesse bucket.
create policy nf_media_read_guard on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>'store-media' or private.public_store(private.media_store(name)) or private.can_store(private.media_store(name)));
create policy nf_media_insert_guard on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'store-media');
create policy nf_media_update_guard on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'store-media') with check(bucket_id<>'store-media');
create policy nf_media_delete_guard on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'store-media');
-- Uploads somente pela função de servidor que valida usuário, loja, MIME, tamanho e assinatura.
-- Não há política INSERT/UPDATE/DELETE de objetos para anon/authenticated.
create function private.immutable_history() returns trigger language plpgsql set search_path='' as $$begin raise exception 'APPEND_ONLY_HISTORY';end$$;
revoke all on function private.immutable_history() from public,anon,authenticated;
create trigger nf_ledger_immutable before update or delete on public.commission_ledger for each row execute function private.immutable_history();
create trigger nf_settlement_immutable before update or delete on public.commission_settlements for each row execute function private.immutable_history();
create trigger nf_events_immutable before update or delete on public.order_events for each row execute function private.immutable_history();
create trigger nf_audit_immutable before update or delete on public.admin_audit_logs for each row execute function private.immutable_history();
-- Triggers por linha não interceptam TRUNCATE: proteção explícita de histórico.
create trigger nf_ledger_no_truncate before truncate on public.commission_ledger for each statement execute function private.immutable_history();
create trigger nf_settlement_no_truncate before truncate on public.commission_settlements for each statement execute function private.immutable_history();
create trigger nf_events_no_truncate before truncate on public.order_events for each statement execute function private.immutable_history();
create trigger nf_audit_no_truncate before truncate on public.admin_audit_logs for each statement execute function private.immutable_history();
do $$declare t text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 if exists(select 1 from pg_publication where pubname='supabase_realtime' and puballtables) then raise exception 'REALTIME_PUBLICATION_SCOPE_CONFLICT';end if;
 foreach t in array array['orders','messages','notifications'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
 end loop;else raise warning 'SUPABASE_REALTIME_PUBLICATION_MISSING: polling disponível; configurar Realtime antes do piloto';end if;
end$$;
commit;
