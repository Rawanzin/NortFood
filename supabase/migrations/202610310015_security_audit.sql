begin;
-- Protege também clientes antigos da RPC legada. Não altera contas, convites,
-- lojas existentes, modalidades, pedidos ou configurações do piloto.
create or replace function public.nf_request_store(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();s uuid;begin
 if coalesce(length(trim(p_name)),0) not between 1 and 80 then raise exception 'INVALID_STORE_NAME';end if;
 perform pg_advisory_xact_lock(hashtextextended('nf:store-request:'||u::text,0));
 -- Saber o nome não comprova propriedade. O resgate verificado continua
 -- exclusivamente em nf_claim_store_invitation/nf_create_store_draft.
 if exists(select 1 from public.stores st join private.store_invitations i on i.store_id=st.id
  where lower(regexp_replace(st.name,'[^[:alnum:]]','','g'))=lower(regexp_replace(trim(p_name),'[^[:alnum:]]','','g')))
 then raise exception 'STORE_RESERVED';end if;
 if (select count(*) from public.store_memberships where user_id=u)>=3 then raise exception 'STORE_REQUEST_LIMIT';end if;
 insert into public.stores(name) values(trim(p_name)) returning id into s;
 insert into public.store_memberships(store_id,user_id) values(s,u);return s;
end$$;
revoke all on function public.nf_request_store(text) from public,anon,authenticated;
grant execute on function public.nf_request_store(text) to authenticated;

-- A versão otimista só é revelada a participantes do pedido. Impede distinguir
-- UUID inexistente de UUID alheio por ORDER_CONFLICT/INVALID_TRANSITION.
-- Mantém integralmente estados, bloqueios, comissões e assinatura existentes.
do $$declare definition text;anchor text:='if o.version is distinct from p_version then';begin
 select pg_get_functiondef('public.nf_transition(uuid,text,integer,text)'::regprocedure) into definition;
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1
 then raise exception 'TRANSITION_SECURITY_ANCHOR_MISMATCH';end if;
 execute replace(definition,anchor,
  'if o.customer_id<>u and not private.is_member(o.store_id) then raise exception ''ORDER_FORBIDDEN'';end if; '||anchor);
end$$;
revoke all on function public.nf_transition(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.nf_transition(uuid,text,integer,text) to authenticated;
commit;
