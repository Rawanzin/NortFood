const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const files=['202610120002_operations.sql','202610120003_storage_realtime.sql','202610120004_reporting.sql','202610150005_store_location.sql','202610170006_qr_tables.sql','202610190007_media_upload_limits.sql'];
function prepare(){
 const migrations=files.map(name=>{const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8');if(!/^\s*begin;/i.test(sql)||!/commit;\s*$/i.test(sql))throw Error('Transacao externa inesperada: '+name);return {name,sha256:crypto.createHash('sha256').update(sql).digest('hex').toUpperCase(),body:sql.replace(/^\s*begin;/i,'').replace(/commit;\s*$/i,'')};});
 const before=`begin;
set local lock_timeout='15s'; set local statement_timeout='120s';
select pg_advisory_xact_lock(hashtextextended('nortfood:deploy:002-007',0));
do $nf_preflight$ declare t record; n bigint; counts jsonb:='{}'; begin
 if current_database()<>'postgres' or current_user<>'postgres' then raise exception 'WRONG_DATABASE_OR_ROLE';end if;
 if to_regclass('private.admin_users') is null or to_regprocedure('private.is_admin()') is null then raise exception 'FOUNDATION_REQUIRED';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nf\\_%' escape '\\') then raise exception 'MIGRATIONS_ALREADY_PRESENT_OR_UNKNOWN_STATE';end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='stores' and column_name in('latitude','longitude','tables_enabled')) then raise exception 'MIGRATION_COLUMNS_ALREADY_PRESENT';end if;
 if exists(select 1 from storage.buckets where id='store-media') then raise exception 'BUCKET_ALREADY_PRESENT_REVIEW_REQUIRED';end if;
 if not exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables and pg_get_userbyid(pubowner)='postgres') or exists(select 1 from pg_publication_tables where pubname='supabase_realtime') then raise exception 'REALTIME_STATE_REVIEW_REQUIRED';end if;
 if not exists(select 1 from pg_class where oid='private.admin_users'::regclass and relrowsecurity and pg_get_userbyid(relowner)='postgres') then raise exception 'ADMIN_SECURITY_REVIEW_REQUIRED';end if;
 for t in select n.nspname,c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' order by n.nspname,c.relname loop
  if not t.relrowsecurity or t.owner<>'postgres' then raise exception 'FOUNDATION_SECURITY_REVIEW_REQUIRED: %.%',t.nspname,t.relname;end if;
  execute format('lock table %I.%I in share row exclusive mode',t.nspname,t.relname);
  execute format('select count(*) from %I.%I',t.nspname,t.relname) into n;
  counts:=counts||jsonb_build_object(format('%I.%I',t.nspname,t.relname),n);
 end loop;
 perform set_config('nortfood.before_counts',counts::text,true);
end $nf_preflight$;
`;
 const after=`
do $nf_postflight$ declare t record; n bigint; begin
 for t in select key,value from jsonb_each_text(current_setting('nortfood.before_counts')::jsonb) loop
  execute 'select count(*) from '||t.key into n;
  if n<>t.value::bigint then raise exception 'EXISTING_ROW_COUNT_CHANGED: %',t.key;end if;
 end loop;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' and not c.relrowsecurity) then raise exception 'RLS_REQUIRED';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where ((n.nspname='public' and p.proname like 'nf\\_%' escape '\\') or n.nspname='private') and p.prosecdef and not coalesce('search_path=""'=any(p.proconfig),false)) then raise exception 'APPLICATION_SEARCH_PATH_INVALID';end if;
 if has_column_privilege('anon','public.stores','status_reason','SELECT') or has_column_privilege('authenticated','public.stores','status_reason','SELECT') then raise exception 'PRIVATE_STORE_COLUMN_EXPOSED';end if;
 if has_table_privilege('anon','private.admin_users','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','private.admin_users','SELECT,INSERT,UPDATE,DELETE') then raise exception 'ADMIN_TABLE_EXPOSED';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nf\\_%' escape '\\' and p.proname not in('nf_catalog','nf_operating_status','nf_table_context') and has_function_privilege('anon',p.oid,'EXECUTE')) then raise exception 'RPC_ANON_EXPOSED';end if;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='nf_order_history')<>1 then raise exception 'HISTORY_SIGNATURE_AMBIGUOUS';end if;
 if not exists(select 1 from storage.buckets where id='store-media' and public=false and file_size_limit=1048576) then raise exception 'PRIVATE_BUCKET_REQUIRED';end if;
 if has_function_privilege('authenticated','public.nf_reserve_media_upload(uuid,uuid,integer)','EXECUTE') or not has_function_privilege('service_role','public.nf_reserve_media_upload(uuid,uuid,integer)','EXECUTE') then raise exception 'UPLOAD_ACL_INVALID';end if;
 if (select count(*) from pg_publication_tables where pubname='supabase_realtime')<>4 or exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and (schemaname<>'public' or tablename not in('orders','messages','notifications','dining_tables'))) then raise exception 'REALTIME_SCOPE_INVALID';end if;
end $nf_postflight$;
notify pgrst,'reload schema';
select json_build_object('existing_counts_preserved',true,'applied','002-007','rpc_count',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nf\\_%' escape '\\'),'pilot_enabled',(select pilot_enabled from public.platform_settings where id=true));
commit;
`;
 return {sql:before+migrations.map(m=>'\n-- '+m.name+'\n'+m.body).join('\n')+after,migrations:migrations.map(({name,sha256})=>({name,sha256}))};
}
module.exports={prepare};
if(require.main===module){const result=prepare();if(!process.argv[2])throw Error('Informe caminho de saida');fs.writeFileSync(process.argv[2],result.sql,{flag:'wx'});console.log(JSON.stringify(result.migrations));}
