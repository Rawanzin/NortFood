// Exclusivamente loopback, cluster NOVO em pasta protegida. Nunca usa .env.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),net=require('node:net');
const {copyCounts}=require('./backup-copy-counts.cjs');
async function main(){
 const root=path.resolve(__dirname,'..'),backupRoot=path.join(root,'backups');
 const manifestPath=process.argv[2]&&path.resolve(process.argv[2]);if(!manifestPath)throw Error('Informe manifesto do backup validado.');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')),dump=path.resolve(manifest.dump);
 if(path.dirname(dump)!==backupRoot||!['VALIDADO','VALIDADO_COM_AVISOS'].includes(manifest.status)||crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex').toUpperCase()!==manifest.sha256)throw Error('Backup nao confirmado.');
 const bin=path.join(process.env.LOCALAPPDATA,'NortFood/tools/postgresql-17.11-3/pgsql/bin');
 if(!fs.existsSync(path.join(bin,'../share/postgres.bki')))throw Error('Distribuicao PostgreSQL completa ausente.');
 const work=path.join(backupRoot,'restore-isolated-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(work,{recursive:false});
 const password=crypto.randomBytes(32).toString('hex'),pwfile=path.join(work,'initial-password.tmp'),cluster=path.join(work,'cluster');
 const env={...process.env};for(const key of Object.keys(env))if(/^PG/.test(key))delete env[key];
 Object.assign(env,{PGHOST:'127.0.0.1',PGUSER:'nf_restore_admin',PGPASSWORD:password,PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'10',PGCLIENTENCODING:'UTF8'});
 const report={started_at:new Date().toISOString(),production_contacted:false,backup:dump,sha256:manifest.sha256,work};
 const redact=s=>String(s||'').split(password).join('[local secret omitted]');
 function run(name,args,{allowedFailure=false,input}={}){const r=cp.spawnSync(path.join(bin,name+'.exe'),args,{env,encoding:'utf8',windowsHide:true,input,stdio:name==='pg_ctl'?['ignore','ignore','ignore']:['pipe','pipe','pipe'],timeout:180000,maxBuffer:64*1024*1024});if(r.error)throw r.error;if(r.status!==0&&!allowedFailure)throw Error(name+' failed: '+redact(r.stderr));return {code:r.status,out:r.stdout||'',err:redact(r.stderr)};}
 const sql=(database,query)=>run('psql',['-X','--no-password','--quiet','--tuples-only','--no-align','--set=ON_ERROR_STOP=1','--dbname',database,'--file=-'],{input:query}).out.trim();
 let started=false;
 try{
  fs.writeFileSync(pwfile,password,{flag:'wx'});
  const init=run('initdb',['-D',cluster,'-U','nf_restore_admin','--auth=scram-sha-256','--pwfile',pwfile,'--encoding=UTF8','--no-locale']);fs.writeFileSync(path.join(work,'initdb.log'),redact(init.out+init.err));fs.unlinkSync(pwfile);
  const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));env.PGPORT=String(port);report.port=port;
  run('pg_ctl',['-D',cluster,'-l',path.join(work,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -c shared_preload_libraries=pg_stat_statements -c wal_level=logical`,'-w','-t','30','start']);started=true;
  report.local_identity=JSON.parse(sql('postgres',"select json_build_object('host',inet_server_addr(),'port',inet_server_port(),'database',current_database(),'user',current_user,'version',version())"));
  if(report.local_identity.host!=='127.0.0.1'||report.local_identity.port!==port||report.local_identity.user!=='nf_restore_admin')throw Error('Isolamento nao confirmado.');
  const inventory=JSON.parse(fs.readFileSync(dump.replace(/\.dump$/,'.inventory.json'),'utf8'));
  for(const role of inventory.roles){if(!/^[a-z_][a-z0-9_]*$/i.test(role))throw Error('Nome de role inesperado');sql('postgres',`do $$begin if not exists(select 1 from pg_roles where rolname='${role}') then create role "${role}" nologin;end if;end$$;`);}
  run('createdb',['--no-password','restore_full']);
  const raw=run('pg_restore',['--no-password','--no-owner','--no-acl','--exit-on-error','--dbname=restore_full',dump],{allowedFailure:true});report.unfiltered_restore={exit_code:raw.code,diagnostics:raw.err};fs.writeFileSync(path.join(work,'unfiltered-restore.log'),raw.err);
  const toc=run('pg_restore',['--list',dump]).out;
  // Vault e uma extensao gerenciada sem binario Windows. Nao cria substituto falso.
  const excluded=toc.split(/\r?\n/).filter(line=>/EXTENSION (?:- )?supabase_vault|TABLE DATA vault secrets/.test(line));
  report.excluded_managed_entries=excluded;
  const selected=toc.split(/\r?\n/).filter(line=>!excluded.includes(line)).join('\n'),tocPath=path.join(work,'compatible.list');fs.writeFileSync(tocPath,selected);
  run('createdb',['--no-password','restore_compatible']);
  const restored=run('pg_restore',['--no-password','--no-owner','--no-acl','--exit-on-error','--use-list',tocPath,'--dbname=restore_compatible',dump],{allowedFailure:true});report.compatible_restore={exit_code:restored.code,diagnostics:restored.err};fs.writeFileSync(path.join(work,'compatible-restore.log'),restored.err);
  if(restored.code!==0)throw Error('Restauracao compativel falhou: '+restored.err);
  // Conta linhas COPY em memoria; nunca exibe nem grava dados pessoais.
  const dataSql=run('pg_restore',['--data-only','--no-owner','--no-acl','--file=-',dump]).out;
  const counts=copyCounts(dataSql);
  const verified=[];for(const t of inventory.tables){const key=t.schema+'.'+t.name;let expected=counts.get(key);if(expected===undefined&&t.kind==='p'){const leaves=JSON.parse(sql('restore_compatible',`select coalesce(json_agg(n.nspname||'.'||c.relname),'[]') from pg_partition_tree('${key}'::regclass) p join pg_class c on c.oid=p.relid join pg_namespace n on n.oid=c.relnamespace where p.isleaf and c.relkind='r'`));if(leaves.some(name=>!counts.has(name)))throw Error('COPY de particao nao encontrado: '+key);expected=leaves.reduce((sum,name)=>sum+counts.get(name),0);}if(expected===undefined)throw Error('COPY nao encontrado: '+key);const count=Number(sql('restore_compatible',`select count(*) from "${t.schema}"."${t.name}"`));if(count!==expected)throw Error('Contagem divergente: '+key);verified.push({table:key,rows:count});}
  report.tables_verified=verified;report.table_count_verified=verified.length;report.vault_rows_not_restored=counts.get('vault.secrets')??null;
  report.invalid_constraints=Number(sql('restore_compatible','select count(*) from pg_constraint where not convalidated'));
  report.invalid_constraints_details=JSON.parse(sql('restore_compatible',"select coalesce(json_agg(json_build_object('schema',n.nspname,'table',c.relname,'constraint',con.conname)),'[]') from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where not con.convalidated"));
  report.application_tables_without_rls=Number(sql('restore_compatible',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' and not c.relrowsecurity"));
  if(process.argv.includes('--with-sql-flows'))report.native_flows=require('./native-beta-flows.cjs').nativeFlows(sql,root,inventory);
  if(process.argv.includes('--verify-cli')){
   if(!report.native_flows)throw Error('Verificacao CLI exige --with-sql-flows para preparar a base local atual.');
   const cli=process.env.NORTFOOD_TEST_CLI_BINARY;if(!cli||!fs.existsSync(cli))throw Error('Informe NORTFOOD_TEST_CLI_BINARY com executavel oficial.');
   sql('restore_compatible',require('./prepare-migration-history.cjs').prepareHistory().sql);
   const result=cp.spawnSync(cli,['migration','list','--db-url',`postgresql://nf_restore_admin@127.0.0.1:${port}/restore_compatible?sslmode=disable`],{cwd:root,env:{...env,SUPABASE_DB_PASSWORD:password,DO_NOT_TRACK:'1'},encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:1048576});
   report.cli_history={exit_code:result.status,output:redact(result.stdout),diagnostics:redact(result.stderr),target:'localhost isolated'};
   if(result.error||result.status!==0||!require('./prepare-migration-history.cjs').prepareHistory().records.every(r=>result.stdout.includes(r.version)))throw Error('CLI nao confirmou historico local: '+redact(result.stderr));
  }
  report.status=raw.code===0?'RESTORED_UNFILTERED':'RESTORED_64_TABLES_WITH_MANAGED_EXTENSION_LIMITATION';
 }catch(e){report.status=report.table_count_verified?'RESTORED_64_TABLES_CHECKS_INCOMPLETE':'RESTORE_INCOMPLETE';report.error=redact(e.message);process.exitCode=1;}
 finally{
  if(fs.existsSync(pwfile))fs.unlinkSync(pwfile);
  if(started){const stopped=run('pg_ctl',['-D',cluster,'-m','fast','-w','stop'],{allowedFailure:true});report.server_stopped=stopped.code===0;if(stopped.code!==0)process.exitCode=1;}
  report.finished_at=new Date().toISOString();fs.writeFileSync(path.join(work,'result.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,report:path.join(work,'result.json'),tables:report.table_count_verified,server_stopped:report.server_stopped,error:report.error},null,2));
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
