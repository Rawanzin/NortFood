begin;
-- Complementa o cadastro autenticado; não habilita Auth, loja nem pedidos.
alter table public.stores add column primary_category_id uuid references public.categories(id);
create table private.account_onboarding(
 user_id uuid not null references auth.users(id),kind text not null check(kind in('customer','seller')),
 address_id uuid references public.addresses(id),store_id uuid references public.stores(id),
 completed_at timestamptz not null default now(),primary key(user_id,kind)
);
alter table private.account_onboarding enable row level security;
revoke all on private.account_onboarding from public,anon,authenticated;

create or replace function public.nf_context() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.require_user();begin
 return jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=u),
 'memberships',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from public.store_memberships m where user_id=u),
 'is_admin',private.is_admin(),'onboarding',(select coalesce(jsonb_object_agg(o.kind,to_jsonb(o)-'user_id'),'{}') from private.account_onboarding o where o.user_id=u));
end$$;

create function public.nf_complete_onboarding(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();role_kind text:=p_data->>'kind';n text:=trim(p_data->>'name');
 phone_digits text:=regexp_replace(coalesce(p_data->>'phone',''),'[^0-9]','','g');a jsonb:=p_data->'address';
 aid uuid;sid uuid;cid uuid;receipt private.account_onboarding;st public.stores;begin
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>6000 or role_kind not in('customer','seller') or role_kind is null then raise exception 'INVALID_ONBOARDING';end if;
 perform pg_advisory_xact_lock(hashtextextended('nf:onboarding:'||u::text,0));
 select * into receipt from private.account_onboarding where user_id=u and kind=role_kind;
 if found then return to_jsonb(receipt)-'user_id';end if;
 if coalesce(length(n),0) not between 1 and 80 then raise exception 'INVALID_PROFILE_NAME';end if;
 if length(phone_digits) in(12,13) and left(phone_digits,2)='55' then phone_digits:=substr(phone_digits,3);end if;
 if phone_digits !~ '^[1-9][0-9](9[0-9]{8}|[2-5][0-9]{7})$' then raise exception 'INVALID_STORE_PHONE';end if;
 if p_data->'consent' is distinct from 'true'::jsonb then raise exception 'TERMS_REQUIRED';end if;
 if jsonb_typeof(a) is distinct from 'object'
 or coalesce(length(trim(a->>'street')),0) not between 1 and 180
 or coalesce(length(trim(a->>'number')),0) not between 1 and 30
 or coalesce(length(trim(a->>'neighborhood')),0) not between 1 and 80
 or coalesce(length(trim(a->>'city')),0) not between 1 and 80
 or upper(coalesce(a->>'state','')) not in('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
 or length(coalesce(a->>'complement',''))>100 or length(coalesce(a->>'reference',''))>120 then raise exception 'INVALID_ADDRESS';end if;
 a:=a||jsonb_build_object('label','Endereço principal','street',trim(a->>'street'),'number',trim(a->>'number'),'neighborhood',trim(a->>'neighborhood'),'city',trim(a->>'city'),'state',upper(a->>'state'),'is_primary',true);
 perform public.nf_ensure_profile();
 if role_kind='seller' then
  begin cid:=(p_data->>'category_id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_CATEGORIES';end;
  if cid is null or not exists(select 1 from public.categories where id=cid and active) then raise exception 'INVALID_CATEGORIES';end if;
  sid:=public.nf_complete_seller(n,p_data->>'store_name',phone_digits,true);
  select * into st from public.stores where id=sid for update;
  -- Preserva endereço/categorias já configurados, inclusive os dados oficiais da Dan.
  if st.street='' and st.number='' then
   update public.stores set street=a->>'street',number=a->>'number',complement=coalesce(a->>'complement',''),neighborhood=a->>'neighborhood',city=a->>'city',state=a->>'state' where id=sid;
  end if;
  if st.primary_category_id is null then
   insert into public.store_categories(store_id,category_id) values(sid,cid) on conflict do nothing;
   update public.stores set primary_category_id=cid where id=sid;
  end if;
 else
  perform public.nf_complete_profile(n,true);
  update public.profiles set phone=phone_digits where id=u;
  select id into aid from public.addresses where user_id=u and lower(trim(street))=lower(a->>'street') and lower(trim(number))=lower(a->>'number')
   and lower(trim(neighborhood))=lower(a->>'neighborhood') and lower(trim(city))=lower(a->>'city') and upper(state)=a->>'state'
   and coalesce(complement,'')=coalesce(a->>'complement','') order by is_primary desc,created_at limit 1;
  aid:=public.nf_save_address(aid,a);
 end if;
 insert into private.account_onboarding(user_id,kind,address_id,store_id) values(u,role_kind,aid,sid) returning * into receipt;
 return to_jsonb(receipt)-'user_id';
end$$;

-- A categoria principal permanece coerente quando o vendedor edita as categorias.
alter function public.nf_save_store(uuid,jsonb,uuid[],jsonb) set schema private;
alter function private.nf_save_store(uuid,jsonb,uuid[],jsonb) rename to save_store_onboarding_base;
revoke all on function private.save_store_onboarding_base(uuid,jsonb,uuid[],jsonb) from public,anon,authenticated;
create function public.nf_save_store(p_id uuid,p_data jsonb,p_categories uuid[],p_zones jsonb) returns void language plpgsql security definer set search_path='' as $$
declare cid uuid;begin
 perform private.require_store(p_id);
 if p_data?'primary_category_id' then
  begin cid:=nullif(p_data->>'primary_category_id','')::uuid;exception when invalid_text_representation then raise exception 'INVALID_CATEGORIES';end;
 else select primary_category_id into cid from public.stores where id=p_id;end if;
 if p_data?'primary_category_id' and (cid is null or not coalesce(cid=any(p_categories),false)) then raise exception 'INVALID_CATEGORIES';end if;
 if cid is null or not coalesce(cid=any(p_categories),false) then cid:=p_categories[1];end if;
 if cid is null or not exists(select 1 from public.categories where id=cid and active) then raise exception 'INVALID_CATEGORIES';end if;
 perform private.save_store_onboarding_base(p_id,p_data,p_categories,p_zones);
 update public.stores set primary_category_id=cid where id=p_id;
end$$;

create function private.validate_customer_contact() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles p where p.id=new.customer_id and p.terms_accepted_at is not null
  and regexp_replace(p.phone,'[^0-9]','','g') ~ '^(55)?[1-9][0-9](9[0-9]{8}|[2-5][0-9]{7})$') then raise exception 'CUSTOMER_PROFILE_INCOMPLETE';end if;
 return new;end$$;
create trigger nf_validate_customer_contact before insert on public.orders for each row execute function private.validate_customer_contact();
revoke all on function private.validate_customer_contact(),public.nf_complete_onboarding(jsonb),public.nf_save_store(uuid,jsonb,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.nf_complete_onboarding(jsonb),public.nf_save_store(uuid,jsonb,uuid[],jsonb) to authenticated;
commit;
