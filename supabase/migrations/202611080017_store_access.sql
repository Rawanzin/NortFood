begin;

-- A associação continua registrada. O bloqueio vale também para um JWT ainda válido.
create function private.can_manage_store(p_store uuid, p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists (
  select 1
  from public.store_memberships m
  join public.stores s on s.id=m.store_id
  join auth.users u on u.id=m.user_id
  where m.store_id=p_store and m.user_id=p_user
   and s.status<>'suspended'
   and (u.banned_until is null or u.banned_until<=now())
 );
$$;
revoke all on function private.can_manage_store(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function private.is_member(s uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.can_manage_store(s,auth.uid());
$$;

-- Mantém os vínculos visíveis ao titular e indica quais ainda permitem gerir.
create or replace function public.nf_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 return jsonb_build_object(
  'profile',(select to_jsonb(p) from public.profiles p where p.id=u),
  'memberships',(select coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('can_manage',private.is_member(m.store_id))),'[]')
    from public.store_memberships m where m.user_id=u),
  'is_admin',private.is_admin(),
  'onboarding',(select coalesce(jsonb_object_agg(o.kind,to_jsonb(o)-'user_id'),'{}')
    from private.account_onboarding o where o.user_id=u)
 );
end$$;

-- As versões anteriores verificavam o vínculo diretamente nesses dois caminhos.
do $$
declare
 definition text;
 old_check text := 'if not exists(select 1 from public.store_memberships where store_id=p_store and user_id=p_user) then';
 self_order text := 'if private.is_member(s.id) then';
 self_chat text := 'or private.is_member(p_store) then';
 onboarding_step text := 's:=public.nf_create_store_draft(p_store_name);';
begin
 select pg_get_functiondef('public.nf_reserve_media_upload(uuid,uuid,integer)'::regprocedure) into definition;
 if strpos(definition,old_check)=0 then raise exception 'MEDIA_AUTHORIZATION_DEFINITION_CHANGED';end if;
 execute replace(definition,old_check,'if not private.can_manage_store(p_store,p_user) then');

 select pg_get_functiondef('public.nf_complete_seller(text,text,text,boolean)'::regprocedure) into definition;
 if strpos(definition,onboarding_step)=0 then raise exception 'SELLER_ONBOARDING_DEFINITION_CHANGED';end if;
 execute replace(definition,onboarding_step,onboarding_step||' perform private.require_store(s);');
 -- Uma associação sem permissão de gestão ainda é uma associação comercial.
 select pg_get_functiondef('public.nf_place_order(jsonb)'::regprocedure) into definition;
 if strpos(definition,self_order)=0 then raise exception 'SELF_ORDER_DEFINITION_CHANGED';end if;
 execute replace(definition,self_order,
  'if exists(select 1 from public.store_memberships where store_id=s.id and user_id=u) then');

 select pg_get_functiondef('public.nf_chat(uuid)'::regprocedure) into definition;
 if strpos(definition,self_chat)=0 then raise exception 'SELF_CHAT_DEFINITION_CHANGED';end if;
 execute replace(definition,self_chat,
  'or exists(select 1 from public.store_memberships where store_id=p_store and user_id=u) then');
end$$;

commit;
