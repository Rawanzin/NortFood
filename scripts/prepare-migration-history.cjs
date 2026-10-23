// Concilia SOMENTE metadados. SQL dos arquivos e armazenado como TEXTO, nunca executado.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {prepare}=require('./prepare-supabase-deployment.cjs');
function prepareHistory(){
 const names=['202610120001_foundation.sql',...prepare().migrations.map(m=>m.name)];
 const records=names.map(file=>{const source=fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8');const [version,...name]=file.replace(/\.sql$/,'').split('_');const tag='$nf_history_'+version+'$';if(source.includes(tag))throw Error('Delimitador de texto conflitante');return {version,name:name.join('_'),source,tag,sha256:crypto.createHash('sha256').update(source).digest('hex').toUpperCase()};});
 const versions=records.map(r=>"'"+r.version+"'").join(',');
 const inserts=records.map(r=>`('${r.version}','${r.name}',array[${r.tag}${r.source}${r.tag}])`).join(',\n');
 const sql=`begin;
set local lock_timeout='15s';set local statement_timeout='60s';
select pg_advisory_xact_lock(hashtextextended('nortfood:migration-history',0));
do $guard$ begin
 if to_regprocedure('public.nf_catalog()') is null or to_regprocedure('public.nf_order_history(timestamp with time zone,integer,uuid)') is null or to_regprocedure('private.save_store_base(uuid,jsonb,uuid[],jsonb)') is null or to_regclass('public.dining_tables') is null or to_regprocedure('public.nf_reserve_media_upload(uuid,uuid,integer)') is null then raise exception 'APPLIED_MIGRATIONS_NOT_CONFIRMED';end if;
 if has_table_privilege('anon','private.admin_users','SELECT,INSERT,UPDATE,DELETE') then raise exception 'FOUNDATION_SECURITY_NOT_CONFIRMED';end if;
end $guard$;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations(version text not null primary key);
alter table supabase_migrations.schema_migrations add column if not exists statements text[];
alter table supabase_migrations.schema_migrations add column if not exists name text;
alter table supabase_migrations.schema_migrations enable row level security;
revoke all on schema supabase_migrations from public,anon,authenticated;
revoke all on supabase_migrations.schema_migrations from public,anon,authenticated;
do $history_guard$ begin
 if exists(select 1 from supabase_migrations.schema_migrations where version not in(${versions})) then raise exception 'UNKNOWN_MIGRATION_HISTORY_PRESERVED';end if;
end $history_guard$;
insert into supabase_migrations.schema_migrations(version,name,statements) values
${inserts}
on conflict(version) do nothing;
do $verify$ begin
 if (select count(*) from supabase_migrations.schema_migrations where version in(${versions}))<>7 then raise exception 'HISTORY_INCOMPLETE';end if;
end $verify$;
select version,name from supabase_migrations.schema_migrations order by version;
commit;
`;
 return {sql,records:records.map(({version,name,sha256})=>({version,name,sha256}))};
}
module.exports={prepareHistory};
if(require.main===module){const target=process.argv[2];if(!target)throw Error('Informe arquivo de saida');const result=prepareHistory();fs.writeFileSync(target,result.sql,{flag:'wx'});console.log(JSON.stringify(result.records));}
