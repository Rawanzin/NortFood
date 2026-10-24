begin;
-- Aditiva e versionada. Não muda Auth, RLS, loja piloto nem pedidos existentes.
alter table public.addresses add column postal_code text not null default '' check(postal_code ~ '^([0-9]{8})?$');
alter table public.stores add column address_reference text not null default '' check(length(address_reference)<=120);
create or replace function public.nf_save_address(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();a uuid:=coalesce(p_id,gen_random_uuid());begin
 perform pg_advisory_xact_lock(hashtextextended('nf:address:'||u::text,0));
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'INVALID_ADDRESS';end if;
 if p_id is not null and not exists(select 1 from public.addresses where id=p_id and user_id=u) then raise exception 'ADDRESS_FORBIDDEN';end if;
 if coalesce(trim(p_data->>'postal_code'),'') !~ '^([0-9]{5}-?[0-9]{3})?$' then raise exception 'INVALID_POSTAL_CODE';end if;
 if coalesce((p_data->>'is_primary')::boolean,false) then update public.addresses set is_primary=false where user_id=u;end if;
 insert into public.addresses(id,user_id,label,street,number,complement,neighborhood,city,state,reference,latitude,longitude,is_primary,postal_code)
 values(a,u,left(p_data->>'label',40),p_data->>'street',p_data->>'number',left(coalesce(p_data->>'complement',''),100),p_data->>'neighborhood',coalesce(nullif(p_data->>'city',''),'Porteirinha'),coalesce(nullif(p_data->>'state',''),'MG'),left(coalesce(p_data->>'reference',''),120),(p_data->>'latitude')::numeric,(p_data->>'longitude')::numeric,coalesce((p_data->>'is_primary')::boolean,false),replace(coalesce(trim(p_data->>'postal_code'),''),'-',''))
 on conflict(id) do update set label=excluded.label,street=excluded.street,number=excluded.number,complement=excluded.complement,neighborhood=excluded.neighborhood,city=excluded.city,state=excluded.state,reference=excluded.reference,latitude=excluded.latitude,longitude=excluded.longitude,is_primary=excluded.is_primary,
 postal_code=case when p_data?'postal_code' then excluded.postal_code else public.addresses.postal_code end;return a;
end$$;

create or replace function public.nf_complete_onboarding(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if coalesce(trim(a->>'postal_code'),'') !~ '^([0-9]{5}-?[0-9]{3})?$' then raise exception 'INVALID_POSTAL_CODE';end if;
 a:=a||jsonb_build_object('postal_code',replace(coalesce(trim(a->>'postal_code'),''),'-',''));
 a:=a||jsonb_build_object('label','Endereço principal','street',trim(a->>'street'),'number',trim(a->>'number'),'neighborhood',trim(a->>'neighborhood'),'city',trim(a->>'city'),'state',upper(a->>'state'),'is_primary',true);
 perform public.nf_ensure_profile();
 if role_kind='seller' then
  begin cid:=(p_data->>'category_id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_CATEGORIES';end;
  if cid is null or not exists(select 1 from public.categories where id=cid and active) then raise exception 'INVALID_CATEGORIES';end if;
  sid:=public.nf_complete_seller(n,p_data->>'store_name',phone_digits,true);
  select * into st from public.stores where id=sid for update;
  -- Preserva endereço/categorias já configurados, inclusive os dados oficiais da Dan.
  if st.street='' and st.number='' then
   update public.stores set street=a->>'street',number=a->>'number',complement=coalesce(a->>'complement',''),neighborhood=a->>'neighborhood',city=a->>'city',state=a->>'state',postal_code=a->>'postal_code',address_reference=coalesce(a->>'reference','') where id=sid;
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

create or replace function public.nf_save_store(p_id uuid,p_data jsonb,p_categories uuid[],p_zones jsonb) returns void language plpgsql security definer set search_path='' as $$
declare cid uuid;begin
 perform private.require_store(p_id);
 if p_data?'primary_category_id' then
  begin cid:=nullif(p_data->>'primary_category_id','')::uuid;exception when invalid_text_representation then raise exception 'INVALID_CATEGORIES';end;
 else select primary_category_id into cid from public.stores where id=p_id;end if;
 if p_data?'primary_category_id' and (cid is null or not coalesce(cid=any(p_categories),false)) then raise exception 'INVALID_CATEGORIES';end if;
 if cid is null or not coalesce(cid=any(p_categories),false) then cid:=p_categories[1];end if;
 if cid is null or not exists(select 1 from public.categories where id=cid and active) then raise exception 'INVALID_CATEGORIES';end if;
 if p_data?'postal_code' and coalesce(trim(p_data->>'postal_code'),'') !~ '^([0-9]{5}-?[0-9]{3})?$' then raise exception 'INVALID_POSTAL_CODE';end if;
 if p_data?'address_reference' and length(coalesce(p_data->>'address_reference',''))>120 then raise exception 'INVALID_ADDRESS';end if;
 if p_data?'state' and upper(coalesce(p_data->>'state','')) not in('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') then raise exception 'INVALID_ADDRESS';end if;
 perform private.save_store_onboarding_base(p_id,p_data,p_categories,p_zones);
 update public.stores set primary_category_id=cid,
 postal_code=case when p_data?'postal_code' then replace(coalesce(trim(p_data->>'postal_code'),''),'-','') else postal_code end,
 address_reference=case when p_data?'address_reference' then coalesce(p_data->>'address_reference','') else address_reference end,
 state=case when p_data?'state' then upper(p_data->>'state') else state end where id=p_id;
end$$;

revoke all on function public.nf_save_address(uuid,jsonb),public.nf_complete_onboarding(jsonb),public.nf_save_store(uuid,jsonb,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.nf_save_address(uuid,jsonb),public.nf_complete_onboarding(jsonb),public.nf_save_store(uuid,jsonb,uuid[],jsonb) to authenticated;
commit;
