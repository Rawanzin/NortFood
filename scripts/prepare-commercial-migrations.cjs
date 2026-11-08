// Produces a reviewed, atomic SQL plan; never connects to a remote database.
const fs=require('node:fs/promises'),assert=require('node:assert/strict'),crypto=require('node:crypto');
async function main(){
 for(const environment of ['staging','production']){
  const file='backups/commercial-20261102/'+environment+'-application.json',bytes=await fs.readFile(file),backup=JSON.parse(bytes),validation=JSON.parse(await fs.readFile(file.replace('.json','.validation.json')));
  assert.equal(validation.passed,true);assert.equal(validation.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  const versions=backup.migrations.map(m=>m.version).sort(),pending=(await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')&&!versions.includes(f.split('_')[0])).sort();
  assert.deepEqual(pending,validation.pendingMigrationsValidated);
  const q=s=>"'"+String(s).replaceAll("'","''")+"'";
  let sql=`-- ${environment}: generated only after private recovery validation. No pilot/store/order changes.\nbegin;\nset local statement_timeout='45s';\nselect pg_advisory_xact_lock(hashtextextended('nf:commercial-migrations:20261102',0));\ndo $guard$ begin\nif (select array_agg(version order by version) from supabase_migrations.schema_migrations) is distinct from array[${versions.map(q).join(',')}]::text[] then raise exception 'MIGRATION_HISTORY_CHANGED';end if;\nif (select pilot_enabled from public.platform_settings where id) then raise exception 'PILOT_MUST_REMAIN_DISABLED';end if;\n`;
  for(const schema of ['public','private'])for(const name of ['nf_transition','nf_create_store_draft','nf_save_store_draft','store_open']){
   const fn=backup.functions.find(f=>f.schema===schema&&f.name===name);if(!fn)continue;
   sql+=`if (select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=${q(schema)} and p.proname=${q(name)}) is distinct from ${q(crypto.createHash('md5').update(fn.definition).digest('hex'))} then raise exception 'FUNCTION_DRIFT_${name}';end if;\n`;
  }
  if(environment==='production'){
   const audit=JSON.parse(await fs.readFile('test-results/commercial-20261102/production-before.json'));
   sql+=`if (select md5(to_jsonb(s)::text) from public.stores s where id='40bac4d9-2e3c-4f1d-b33b-ab9628176136') is distinct from ${q(audit.dan.store_hash)} then raise exception 'PROTECTED_STORE_CHANGED';end if;\n`;
   sql+=`if (select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.id)::text,'')) from public.products p where store_id='40bac4d9-2e3c-4f1d-b33b-ab9628176136') is distinct from ${q(audit.dan.products_hash)} then raise exception 'PROTECTED_PRODUCTS_CHANGED';end if;\n`;
  }
  sql+='end $guard$;\n';
  for(const name of pending){
   const raw=await fs.readFile('supabase/migrations/'+name,'utf8'),body=raw.replace(/^\s*begin\s*;/i,'').replace(/commit\s*;\s*$/i,'');
   sql+='\n-- '+name+'\n'+body+`\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${q(name.split('_')[0])},${q(name.replace(/^\d+_|\.sql$/g,''))},array[${q(raw)}]);\n`;
  }
  sql+=`do $final$ begin if (select pilot_enabled from public.platform_settings where id) then raise exception 'PILOT_CHANGED';end if;end $final$;\ncommit;\nselect jsonb_build_object('result','COMMERCIAL_MIGRATIONS_APPLIED','pilot_enabled',(select pilot_enabled from public.platform_settings where id),'versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations)) as result;\n`;
  const out='backups/commercial-20261102/'+environment+'-pending.sql';await fs.writeFile(out,sql);console.log(JSON.stringify({environment,pending,bytes:Buffer.byteLength(sql),file:out}));
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
