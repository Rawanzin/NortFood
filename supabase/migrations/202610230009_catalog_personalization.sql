begin;
-- Aditiva: preserva produtos, pedidos, opções e políticas existentes.
alter table public.products add column ingredients text[] not null default '{}'
 check(cardinality(ingredients)<=30 and array_position(ingredients,null) is null);
alter table public.products add column sale_restriction text
 check(sale_restriction in('price_confirmation','age_restricted'));
alter table public.order_items add column removed_ingredients text[] not null default '{}';
alter table public.stores add column postal_code text not null default '' check(postal_code ~ '^([0-9]{8})?$');
alter table public.stores drop constraint stores_payment_methods_check;
alter table public.stores add constraint stores_payment_methods_check
 check(payment_methods <@ array['cash','card','pix_on_receipt'] and (status in('draft','rejected') or cardinality(payment_methods)>0));

create table public.store_setup(
 store_id uuid primary key references public.stores(id),
 delivery_reference_cents integer not null default 0 check(delivery_reference_cents>=0),
 replacement_reference_cents integer not null default 0 check(replacement_reference_cents>=0),
 owner_confirmed_at timestamptz,
 pending_notes text not null default '' check(length(pending_notes)<=2000));
alter table public.store_setup enable row level security;
revoke all on public.store_setup from public,anon,authenticated;
grant select on public.store_setup to authenticated;
create policy nf_store_setup_read on public.store_setup for select to authenticated using(private.can_store(store_id));
create function public.nf_store_setup() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_user();return(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.store_setup s where private.can_store(s.store_id));end$$;
create function public.nf_save_setup(p_store uuid,p_delivery integer,p_replacement integer,p_owner_confirmed boolean) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_store(p_store);
 if p_delivery is null or p_replacement is null or p_delivery not between 0 and 100000 or p_replacement not between 0 and 100000 then raise exception 'INVALID_STORE_DATA';end if;
 insert into public.store_setup(store_id,delivery_reference_cents,replacement_reference_cents,owner_confirmed_at) values(p_store,p_delivery,p_replacement,case when p_owner_confirmed then now() end)
 on conflict(store_id) do update set delivery_reference_cents=excluded.delivery_reference_cents,replacement_reference_cents=excluded.replacement_reference_cents,owner_confirmed_at=coalesce(public.store_setup.owner_confirmed_at,excluded.owner_confirmed_at);
 perform private.audit('store_setup_saved',p_store,'{}');end$$;

create table private.catalog_imports(source_key text primary key,store_id uuid not null references public.stores(id),checksum text not null,imported_at timestamptz not null default now());
alter table private.catalog_imports enable row level security;
revoke all on private.catalog_imports from public,anon,authenticated;
create table private.store_invitations(store_id uuid primary key references public.stores(id),email text not null,claimed_by uuid references auth.users(id),claimed_at timestamptz);
alter table private.store_invitations enable row level security;
revoke all on private.store_invitations from public,anon,authenticated;

create function public.nf_claim_store_invitation() returns integer language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();identity jsonb;n integer:=0;i record;begin
 select to_jsonb(a) into identity from auth.users a where id=u;
 -- Nunca confia em user_metadata.email nem em e-mail recebido do navegador.
 if nullif(identity->>'email_confirmed_at','') is null then return 0;end if;
 for i in select * from private.store_invitations where lower(email)=lower(identity->>'email') and claimed_by is null for update loop
  insert into public.store_memberships(store_id,user_id) values(i.store_id,u) on conflict do nothing;
  update private.store_invitations set claimed_by=u,claimed_at=now() where store_id=i.store_id;
  perform private.audit('store_invitation_claimed',i.store_id,'{}');n=n+1;
 end loop;return n;end$$;

create or replace function private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.profiles(id,name,phone,terms_accepted_at,terms_version) values(new.id,
 left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Cliente'),80),
 left(regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9]','','g'),30),
 case when new.raw_user_meta_data->>'terms_version' in('2026-10-draft','2026-10-public-v2') then now() end,
 case when new.raw_user_meta_data->>'terms_version' in('2026-10-draft','2026-10-public-v2') then new.raw_user_meta_data->>'terms_version' end) on conflict(id) do nothing;
 return new;end$$;
create function public.nf_ensure_profile() returns void language plpgsql security definer set search_path='' as $$declare u uuid:=private.require_user();begin
 insert into public.profiles(id,name) select a.id,left(coalesce(nullif(trim(a.raw_user_meta_data->>'name'),''),nullif(trim(a.raw_user_meta_data->>'full_name'),''),'Cliente'),80) from auth.users a where a.id=u on conflict(id) do nothing;
end$$;

-- Mantém o checkout transacional e sua recuperação idempotente; só acrescenta o snapshot.
do $$declare definition text;old_columns text:='total_cents,notes) values(oid,p.id,p.name';new_columns text:='total_cents,notes,removed_ingredients) values(oid,p.id,p.name';
 old_values text:='left(coalesce(line->>''notes'',''''),180)) returning id into itemid;';
 new_values text:='left(coalesce(line->>''notes'',''''),180),array(select jsonb_array_elements_text(coalesce(line->''removed_ingredients'',''[]'')))) returning id into itemid;';begin
 select pg_get_functiondef('public.nf_place_order(jsonb)'::regprocedure) into definition;
 if (length(definition)-length(replace(definition,old_columns,'')))/length(old_columns)<>1 or (length(definition)-length(replace(definition,old_values,'')))/length(old_values)<>1 then raise exception 'CHECKOUT_MIGRATION_ANCHOR_MISMATCH';end if;
 execute replace(replace(definition,old_columns,new_columns),old_values,new_values);
end$$;
create function private.validate_order_personalization() returns trigger language plpgsql security definer set search_path='' as $$declare p public.products;begin
 select * into p from public.products where id=new.product_id for share;
 if p.sale_restriction is not null then raise exception 'PRODUCT_RESTRICTED';end if;
 if cardinality(new.removed_ingredients)>30 or array_position(new.removed_ingredients,null) is not null
 or not(new.removed_ingredients<@p.ingredients)
 or cardinality(new.removed_ingredients)<>(select count(distinct x) from unnest(new.removed_ingredients)x) then raise exception 'INVALID_REMOVALS';end if;
 return new;end$$;
create trigger nf_order_personalization before insert on public.order_items for each row execute function private.validate_order_personalization();

-- O RPC de edição conserva os ingredientes quando versões antigas não enviam o campo.
alter function public.nf_save_product(uuid,uuid,jsonb,jsonb) set schema private;
alter function private.nf_save_product(uuid,uuid,jsonb,jsonb) rename to save_product_base;
revoke all on function private.save_product_base(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
create function public.nf_save_product(p_store uuid,p_id uuid,p_data jsonb,p_groups jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare p uuid;begin
 p:=private.save_product_base(p_store,p_id,p_data,p_groups);
 if p_data ? 'ingredients' then
  if jsonb_typeof(p_data->'ingredients') is distinct from 'array' or jsonb_array_length(p_data->'ingredients')>30 then raise exception 'INVALID_INGREDIENTS';end if;
  if exists(select 1 from jsonb_array_elements_text(p_data->'ingredients') x where length(trim(x)) not between 1 and 80) then raise exception 'INVALID_INGREDIENTS';end if;
  update public.products set ingredients=array(select distinct trim(x) from jsonb_array_elements_text(p_data->'ingredients')x) where id=p;
 end if;return p;end$$;
create function public.nf_confirm_product_price(p_product uuid) returns void language plpgsql security definer set search_path='' as $$declare p public.products;begin
 select * into p from public.products where id=p_product for update;perform private.require_store(p.store_id);
 if p.sale_restriction is distinct from 'price_confirmation' then raise exception 'PRODUCT_RESTRICTED';end if;
 update public.products set sale_restriction=null where id=p.id;
 perform private.audit('product_price_confirmed',p.id,jsonb_build_object('price_cents',p.price_cents));end$$;
do $$declare f record;begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['nf_claim_store_invitation','nf_ensure_profile','nf_save_product','nf_confirm_product_price','nf_store_setup','nf_save_setup']) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to authenticated',f.sig);end loop;end$$;
revoke all on function private.new_profile(),private.validate_order_personalization() from public,anon,authenticated;
commit;
