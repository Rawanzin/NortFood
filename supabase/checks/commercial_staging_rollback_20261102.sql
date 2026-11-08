-- Run ONLY in zrczgghucwsaxqnyaapk after backup. Every fixture and change rolls
-- back. No password, email delivery, JWT bypass, grants or disabled RLS.
begin;
set local statement_timeout='30s';
do $test$
declare seller uuid:=gen_random_uuid();other uuid:=gen_random_uuid();customer uuid:=gen_random_uuid();outsider uuid:=gen_random_uuid();administrator uuid:=gen_random_uuid();
 st uuid;other_st uuid;p uuid;oid uuid;addr uuid;cat uuid;receipt jsonb;request jsonb;ctx jsonb;result jsonb:='[]';entry uuid;order_version integer:=0;next_status text;denied boolean;
begin
 if exists(select 1 from public.stores where id='40bac4d9-2e3c-4f1d-b33b-ab9628176136') then raise exception 'PROTECTED_PRODUCTION_STORE_PRESENT';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='202611020016') then raise exception 'STAGING_MIGRATION_REQUIRED';end if;
 if (select pilot_enabled from public.platform_settings where id) then raise exception 'STAGING_PILOT_ALREADY_ENABLED';end if;
 select id into cat from public.categories where active order by name limit 1;
 foreach entry in array array[seller,other,customer,outsider,administrator] loop
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(entry,'nortfood-rollback-'||entry::text||'@example.test',now(),'{"name":"TESTE TRANSACIONAL ISOLADO","role":"admin"}');
 end loop;
 insert into private.admin_users(user_id) values(administrator);
 foreach entry in array array[seller,other,customer,outsider] loop
  perform set_config('request.jwt.claim.sub',entry::text,true);execute 'set local role authenticated';
  ctx:=public.nf_context();if (ctx->>'is_admin')::boolean then raise exception 'METADATA_PRIVILEGE_ESCALATION';end if;
  receipt:=public.nf_complete_onboarding(jsonb_build_object('kind',case when entry in(seller,other) then 'seller' else 'customer' end,'name','TESTE TRANSACIONAL','phone','38999999999','store_name','TESTE ROLLBACK '||entry::text,'category_id',cat,'consent',true,'address',jsonb_build_object('street','Rua Sintética','number','10','neighborhood','Bairro Sintético','city','Porteirinha','state','MG','postal_code','39520-000')));
  if entry=seller then st:=(receipt->>'store_id')::uuid;elsif entry=other then other_st:=(receipt->>'store_id')::uuid;elsif entry=customer then addr:=(receipt->>'address_id')::uuid;end if;
  execute 'reset role';
 end loop;
 result:=result||'"onboarding_two_sellers_two_customers_without_admin_escalation"'::jsonb;
 perform set_config('request.jwt.claim.sub',seller::text,true);execute 'set local role authenticated';
 perform public.nf_save_store_draft(st,jsonb_build_object('state','SP','postal_code','01001-000','address_reference','REFERÊNCIA SINTÉTICA','primaryCategory',cat::text),0);
 if public.nf_store_drafts()->0->'data'->>'state'<>'SP' then raise exception 'DRAFT_NOT_PERSISTED';end if;
 perform public.nf_save_store(st,jsonb_build_object('name','TESTE ROLLBACK '||seller::text,'description','Somente fixture descartável','phone','38999999999','whatsapp','38999999999','street','Rua Sintética','number','10','neighborhood','Bairro Sintético','city','Porteirinha','state','MG','postal_code','39520000','primary_category_id',cat,'opens_at','00:00','closes_at','23:59','working_days','[0,1,2,3,4,5,6]'::jsonb,'pickup_enabled',true,'delivery_enabled',true,'minimum_cents',0,'estimate_minutes',20,'payment_methods','["cash"]'::jsonb),array[cat],'[{"neighborhood":"Bairro Sintético","city":"Porteirinha","state":"MG","fee_cents":500}]');
 p:=public.nf_save_product(st,null,'{"name":"PRODUTO SINTÉTICO","price_cents":1300,"category":"TESTE","available":true}','[{"name":"Adicionais","min_choices":0,"max_choices":1,"options":[{"name":"Queijo sintético","price_cents":250}]}]');
 perform public.nf_submit_store(st);execute 'reset role';
 result:=result||'"merchant_profile_full_address_draft_product_addons_and_submission"'::jsonb;
 perform set_config('request.jwt.claim.sub',other::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.nf_save_product(st,p,'{"name":"Fraude","price_cents":1}','[]');exception when others then if sqlerrm='STORE_FORBIDDEN' then denied:=true;else raise;end if;end;if not denied then raise exception 'CROSS_PRODUCT_ALLOWED';end if;
 denied:=false;begin perform public.nf_set_fulfillment(st,true,true);exception when others then if sqlerrm='STORE_FORBIDDEN' then denied:=true;else raise;end if;end;if not denied then raise exception 'CROSS_SETTINGS_ALLOWED';end if;
 denied:=false;begin perform public.nf_report(st,current_date,current_date);exception when others then if sqlerrm='STORE_FORBIDDEN' then denied:=true;else raise;end if;end;if not denied then raise exception 'CROSS_REPORT_ALLOWED';end if;
 denied:=false;begin perform public.nf_admin_pilot(true,'Fraude sintética');exception when others then if sqlerrm='ADMIN_REQUIRED' then denied:=true;else raise;end if;end;if not denied then raise exception 'PILOT_ESCALATION_ALLOWED';end if;execute 'reset role';
 result:=result||'"cross_store_product_settings_financial_report_and_admin_denied"'::jsonb;
 request:=jsonb_build_object('store_id',st,'idempotency_key',gen_random_uuid(),'fulfillment','delivery','address_id',addr,'payment_method','cash','expected_total_cents',1800,'items',jsonb_build_array(jsonb_build_object('product_id',p,'quantity',1,'option_ids','[]'::jsonb)));
 perform set_config('request.jwt.claim.sub',customer::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.nf_place_order(request);exception when others then if sqlerrm='PILOT_NOT_ENABLED' then denied:=true;else raise;end if;end;if not denied then raise exception 'DISABLED_PILOT_ORDER_ALLOWED';end if;execute 'reset role';
 perform set_config('request.jwt.claim.sub',administrator::text,true);execute 'set local role authenticated';
 perform public.nf_admin_store_limit((select count(*)::int+1 from public.stores where status='approved'),'Somente transação de teste');
 perform public.nf_admin_store(st,'approved','Somente transação sem commit');perform public.nf_admin_pilot(true,'Somente transação isolada que termina em rollback');execute 'reset role';
 perform set_config('request.jwt.claim.sub',seller::text,true);execute 'set local role authenticated';perform public.nf_set_store_open(st,true,false);execute 'reset role';
 perform set_config('request.jwt.claim.sub',customer::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.nf_place_order(request||'{"expected_total_cents":1}');exception when others then if sqlerrm='PRICE_CHANGED' then denied:=true;else raise;end if;end;if not denied then raise exception 'FRAUD_PRICE_ALLOWED';end if;
 oid:=public.nf_place_order(request);if public.nf_place_order(request)<>oid then raise exception 'IDEMPOTENCY_FAILED';end if;execute 'reset role';
 result:=result||'"disabled_pilot_price_tampering_and_idempotency_enforced"'::jsonb;
 perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 if exists(select 1 from public.orders where id=oid) then raise exception 'FOREIGN_CUSTOMER_ORDER_READABLE';end if;
 denied:=false;begin perform public.nf_transition(oid,'cancelled',999,'');exception when others then if sqlerrm='ORDER_FORBIDDEN' then denied:=true;else raise;end if;end;if not denied then raise exception 'FOREIGN_ORDER_TRANSITION_ALLOWED';end if;execute 'reset role';
 perform set_config('request.jwt.claim.sub',seller::text,true);execute 'set local role authenticated';
 if not exists(select 1 from public.orders where id=oid) then raise exception 'SELLER_CANNOT_RECEIVE';end if;
 foreach next_status in array array['accepted','preparing','ready','out_for_delivery','delivered'] loop perform public.nf_transition(oid,next_status,order_version,'');order_version:=order_version+1;end loop;
 if not exists(select 1 from public.commission_ledger where order_id=oid and amount_cents=65 and rate_bps=500) then raise exception 'COMMISSION_FAILED';end if;
 perform public.nf_set_fulfillment(st,false,false);execute 'reset role';
 perform set_config('request.jwt.claim.sub',customer::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.nf_place_order(request||jsonb_build_object('idempotency_key',gen_random_uuid()));exception when others then if sqlerrm='STORE_UNAVAILABLE' then denied:=true;else raise;end if;end;if not denied then raise exception 'DISABLED_FULFILLMENT_ALLOWED';end if;
 if not exists(select 1 from public.orders where id=oid and status='delivered') then raise exception 'HISTORICAL_ORDER_CHANGED';end if;execute 'reset role';
 result:=result||'"seller_receipt_delivery_all_states_commission_and_customer_isolation"'::jsonb||'"both_modalities_disabled_block_new_orders_preserve_completed_order"'::jsonb;
 perform set_config('nortfood.commercial_test',jsonb_build_object('passed',true,'scope','Hosted staging PostgreSQL/RLS with synthetic identities set by SQL; not real Auth/JWT/Realtime delivery','checks',result,'fixtures_rolled_back',true,'production_modified',false)::text,true);
end $test$;
select current_setting('nortfood.commercial_test')::jsonb as result;
rollback;
