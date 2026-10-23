begin;
-- Migração nova e aditiva. Não reaplica 001–007 nem publica qualquer loja.
insert into public.categories(id,name) values
 ('c0000000-0000-4000-8000-000000000001','Hambúrgueres'),
 ('c0000000-0000-4000-8000-000000000002','Pizzas'),
 ('c0000000-0000-4000-8000-000000000003','Açaí'),
 ('c0000000-0000-4000-8000-000000000004','Doces'),
 ('c0000000-0000-4000-8000-000000000005','Salgados'),
 ('c0000000-0000-4000-8000-000000000006','Sorvetes'),
 ('c0000000-0000-4000-8000-000000000007','Marmitas'),
 ('c0000000-0000-4000-8000-000000000008','Bebidas'),
 ('c0000000-0000-4000-8000-000000000009','Padarias'),
 ('c0000000-0000-4000-8000-000000000010','Mercados'),
 ('c0000000-0000-4000-8000-000000000011','Outros') on conflict(name) do nothing;

alter table public.stores drop constraint stores_status_check;
alter table public.stores add constraint stores_status_check check(status in('draft','pending','approved','suspended','rejected'));
alter table public.platform_settings add column pilot_store_limit integer not null default 1 check(pilot_store_limit between 1 and 1000);
-- Preserva eventual operação anterior; no projeto auditado há zero lojas.
update public.platform_settings set pilot_store_limit=greatest(1,(select count(*)::integer from public.stores where status='approved'));
create function private.limit_approved_stores() returns trigger language plpgsql security definer set search_path='' as $$
declare cap integer;begin
 if new.status='approved' and (tg_op='INSERT' or old.status is distinct from 'approved') then
  select pilot_store_limit into cap from public.platform_settings where id=true for update;
  if (select count(*) from public.stores where status='approved' and id<>new.id)>=cap then raise exception 'PILOT_STORE_LIMIT';end if;
 end if;return new;end$$;
revoke all on function private.limit_approved_stores() from public,anon,authenticated;
create trigger nf_limit_approved_stores before insert or update of status on public.stores for each row execute function private.limit_approved_stores();

create table public.store_drafts(store_id uuid primary key references public.stores(id),data jsonb not null default '{}' check(jsonb_typeof(data)='object' and octet_length(data::text)<=20000),version integer not null default 1,updated_at timestamptz not null default now());
alter table public.store_drafts enable row level security;
revoke all on public.store_drafts from public,anon,authenticated;
grant select on public.store_drafts to authenticated;
create policy nf_store_draft_read on public.store_drafts for select to authenticated using(private.can_store(store_id));
create function public.nf_store_drafts() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_user();return (select coalesce(jsonb_agg(to_jsonb(d)),'[]') from public.store_drafts d where private.can_store(d.store_id));end$$;
create function public.nf_create_store_draft(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();s uuid;begin
 if coalesce(length(trim(p_name)),0) not between 1 and 80 then raise exception 'INVALID_STORE_NAME';end if;
 perform pg_advisory_xact_lock(hashtextextended('nf:store-request:'||u::text,0));
 select st.id into s from public.stores st join public.store_memberships m on m.store_id=st.id where m.user_id=u and lower(st.name)=lower(trim(p_name)) order by st.created_at limit 1;
 if s is not null then return s;end if;
 if (select count(*) from public.store_memberships where user_id=u)>=3 then raise exception 'STORE_REQUEST_LIMIT';end if;
 insert into public.stores(name,status,delivery_enabled,paused) values(trim(p_name),'draft',false,true) returning id into s;
 insert into public.store_memberships(store_id,user_id) values(s,u);
 return s;end$$;
create function public.nf_save_store_draft(p_store uuid,p_data jsonb,p_version integer) returns integer language plpgsql security definer set search_path='' as $$
declare v integer;begin
 perform private.require_store(p_store);
 perform 1 from public.stores where id=p_store for update;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>20000 then raise exception 'INVALID_STORE_DATA';end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k not in('name','about','categories','phone','whatsapp','street','number','complement','neighborhood','city','hours','workingDays','pickupEnabled','deliveryEnabled','zones','estimateMinutes','minimumOrder','payments','deliveryInfo')) then raise exception 'INVALID_STORE_DATA';end if;
 select version into v from public.store_drafts where store_id=p_store;
 if coalesce(v,0)<>coalesce(p_version,-1) then raise exception 'DRAFT_CONFLICT';end if;
 insert into public.store_drafts(store_id,data,version) values(p_store,p_data,1) on conflict(store_id) do update set data=excluded.data,version=public.store_drafts.version+1,updated_at=now() returning version into v;
 return v;end$$;
create function public.nf_submit_store(p_store uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.stores;begin
 perform private.require_store(p_store);select * into s from public.stores where id=p_store for update;
 if s.status not in('draft','rejected','pending') then raise exception 'INVALID_STORE_STATUS';end if;
 if trim(s.description)='' or trim(s.street)='' or trim(s.number)='' or trim(s.neighborhood)='' or trim(s.city)=''
 or regexp_replace(s.whatsapp,'[^0-9]','','g') !~ '^(55)?[1-9][0-9][2-9][0-9]{7,8}$'
 or not (s.pickup_enabled or s.delivery_enabled)
 or not exists(select 1 from public.store_categories where store_id=p_store)
 or not exists(select 1 from public.products where store_id=p_store and available and not archived)
 or (s.delivery_enabled and not exists(select 1 from public.delivery_zones where store_id=p_store and active)) then raise exception 'STORE_INCOMPLETE';end if;
 update public.stores set status='pending',status_reason='' where id=p_store;
 perform private.audit('store_submitted',p_store,'{}');end$$;
create function public.nf_admin_store_limit(p_limit integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_admin();perform 1 from public.platform_settings where id=true for update;
 if p_limit is null or p_limit<1 or p_limit>1000 or length(trim(coalesce(p_reason,'')))<3 then raise exception 'INVALID_PILOT_LIMIT';end if;
 if p_limit<(select count(*) from public.stores where status='approved') then raise exception 'PILOT_STORE_LIMIT';end if;
 update public.platform_settings set pilot_store_limit=p_limit where id=true;
 perform private.audit('pilot_store_limit',null,jsonb_build_object('limit',p_limit,'reason',p_reason));end$$;
-- Uma loja em rascunho precisa solicitar análise antes de ser aprovada.
alter function public.nf_admin_store(uuid,text,text) set schema private;
alter function private.nf_admin_store(uuid,text,text) rename to admin_store_base;
revoke all on function private.admin_store_base(uuid,text,text) from public,anon,authenticated;
create function public.nf_admin_store(p_store uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_admin();
 if p_status='approved' and exists(select 1 from public.stores where id=p_store and status='draft') then raise exception 'STORE_NOT_SUBMITTED';end if;
 perform private.admin_store_base(p_store,p_status,p_reason);end$$;
do $$declare f record;begin for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['nf_store_drafts','nf_create_store_draft','nf_save_store_draft','nf_submit_store','nf_admin_store_limit','nf_admin_store']) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to authenticated',f.sig);end loop;end$$;
commit;
