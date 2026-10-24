begin;
-- Aditiva: não cria contas, não libera vendas e não altera o catálogo.
-- Mesmo nome não comprova propriedade de uma loja já reservada por convite.
create or replace function public.nf_create_store_draft(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();s uuid;begin
 if coalesce(length(trim(p_name)),0) not between 1 and 80 then raise exception 'INVALID_STORE_NAME';end if;
 perform pg_advisory_xact_lock(hashtextextended('nf:store-request:'||u::text,0));
 perform public.nf_claim_store_invitation();
 select st.id into s from public.stores st join public.store_memberships m on m.store_id=st.id where m.user_id=u and lower(regexp_replace(st.name,'[^[:alnum:]]','','g'))=lower(regexp_replace(trim(p_name),'[^[:alnum:]]','','g')) order by st.created_at limit 1;
 if s is not null then return s;end if;
 if exists(select 1 from public.stores st join private.store_invitations i on i.store_id=st.id where lower(regexp_replace(st.name,'[^[:alnum:]]','','g'))=lower(regexp_replace(trim(p_name),'[^[:alnum:]]','','g'))) then raise exception 'STORE_RESERVED';end if;
 if (select count(*) from public.store_memberships where user_id=u)>=3 then raise exception 'STORE_REQUEST_LIMIT';end if;
 insert into public.stores(name,status,delivery_enabled,pickup_enabled,paused,payment_methods) values(trim(p_name),'draft',false,false,true,'{}') returning id into s;
 insert into public.store_memberships(store_id,user_id) values(s,u);
 return s;end$$;

create function public.nf_complete_seller(p_name text,p_store_name text,p_phone text,p_consent boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();s uuid;phone_digits text:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');begin
 if coalesce(length(trim(p_name)),0) not between 1 and 80 then raise exception 'INVALID_PROFILE_NAME';end if;
 if length(phone_digits) in(12,13) and left(phone_digits,2)='55' then phone_digits:=substr(phone_digits,3);end if;
 if phone_digits !~ '^[1-9][0-9]{9,10}$' then raise exception 'INVALID_STORE_PHONE';end if;
 if p_consent is distinct from true then raise exception 'TERMS_REQUIRED';end if;
 perform public.nf_ensure_profile();
 s:=public.nf_create_store_draft(p_store_name);
 update public.profiles set name=trim(p_name),terms_version='2026-10-public-v2',terms_accepted_at=coalesce(terms_accepted_at,now()) where id=u;
 -- Telefone comercial não é gravado como telefone pessoal nem WhatsApp confirmado.
 update public.stores set phone=phone_digits where id=s;
 return s;end$$;
create function public.nf_complete_profile(p_name text,p_consent boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();begin
 if coalesce(length(trim(p_name)),0) not between 1 and 80 then raise exception 'INVALID_PROFILE_NAME';end if;
 if p_consent is distinct from true then raise exception 'TERMS_REQUIRED';end if;
 perform public.nf_ensure_profile();
 update public.profiles set name=trim(p_name),terms_version='2026-10-public-v2',terms_accepted_at=coalesce(terms_accepted_at,now()) where id=u;
end$$;
revoke all on function public.nf_complete_seller(text,text,text,boolean),public.nf_create_store_draft(text),public.nf_complete_profile(text,boolean) from public,anon,authenticated;
grant execute on function public.nf_complete_seller(text,text,text,boolean),public.nf_create_store_draft(text),public.nf_complete_profile(text,boolean) to authenticated;
commit;
