// Gera somente SQL de schema para um Supabase NOVO; nao abre conexao SQL.
const fs=require('node:fs'),path=require('node:path'),{prepareHistory}=require('./prepare-migration-history.cjs');
const names=['202610120001_foundation.sql','202610120002_operations.sql','202610120003_storage_realtime.sql','202610120004_reporting.sql','202610150005_store_location.sql','202610170006_qr_tables.sql','202610190007_media_upload_limits.sql'];
function bootstrap(){const body=names.map(name=>{const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',name),'utf8').replace(/^\uFEFF/,'').replace(/^(?:\s*--[^\n]*(?:\n|$))*/,'').trimStart();if(!/^\s*begin;/i.test(sql)||!/commit;\s*$/i.test(sql))throw Error('MIGRATION_TRANSACTION_INVALID');return '\n-- '+name+'\n'+sql.replace(/^\s*begin;/i,'').replace(/commit;\s*$/i,'');}).join('\n');const history=prepareHistory().sql.replace(/^\s*begin;/i,'').replace(/commit;\s*$/i,'');return `-- SOMENTE EM PROJETO NOVO DE HOMOLOGACAO. NUNCA NO NORTFOOD PRINCIPAL.
-- Sem dados pessoais, dump de producao, usuarios ou pedidos de exemplo.
begin;
set local statement_timeout='120s';set local lock_timeout='10s';
do $fresh$ begin
 if exists(select 1 from pg_tables where schemaname in('public','private','supabase_migrations')) then raise exception 'HOMOLOGATION_TARGET_NOT_EMPTY';end if;
 if to_regclass('auth.users') is null or to_regclass('storage.objects') is null then raise exception 'SUPABASE_SERVICES_REQUIRED';end if;
 if exists(select 1 from auth.users) or exists(select 1 from storage.objects) then raise exception 'HOMOLOGATION_TARGET_HAS_DATA';end if;
 if not exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables) or exists(select 1 from pg_publication_tables where pubname='supabase_realtime') then raise exception 'HOMOLOGATION_REALTIME_NOT_EMPTY';end if;
end $fresh$;
${body}
${history}
notify pgrst,'reload schema';
select 'HOMOLOGATION_SCHEMA_READY_PILOT_DISABLED' as result;
commit;
`;}
module.exports={bootstrap,names};
if(require.main===module){try{const {publicConfig}=require('./homologation-config.cjs').configuration();const folder=path.resolve(__dirname,'../test-results/homologation');fs.mkdirSync(folder,{recursive:true});const target=path.join(folder,'bootstrap-'+Date.now()+'.sql');fs.writeFileSync(target,'-- Destino conferido: '+new URL(publicConfig.supabaseUrl).hostname+'\n'+bootstrap(),{flag:'wx'});console.log('SQL preparado, nao executado: '+target);}catch(error){console.error(error.message);process.exitCode=2;}}
