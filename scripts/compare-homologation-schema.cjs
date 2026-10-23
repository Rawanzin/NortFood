// Offline comparison of dashboard metadata exports. Never opens a remote connection.
const fs=require('node:fs/promises'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..');
const defaultEvidence=path.join(root,'test-results/modernization-20261021');
const functionKey=row=>row.schema+'.'+row.name+'('+row.arguments+')';
const fields={tables:r=>r.schema+'.'+r.table,columns:r=>r.schema+'.'+r.table+'.'+r.column,
  constraints:r=>r.schema+'.'+r.table+'.'+r.name,indexes:r=>r.schema+'.'+r.table+'.'+r.name,
  policies:r=>r.schemaname+'.'+r.tablename+'.'+r.policyname,functions:functionKey,
  column_grants:r=>[r.table_schema,r.table_name,r.column_name,r.grantee,r.privilege_type].join('.')};
const canonical=value=>JSON.stringify(value,Object.keys(value).sort());
function compare(kind,leftRows,rightRows){
  const normalize=row=>{if(kind!=='column_grants')return row;const {table_catalog,...value}=row;return value;};
  const left=new Map((leftRows||[]).map(row=>[fields[kind](row),normalize(row)]));
  const right=new Map((rightRows||[]).map(row=>[fields[kind](row),normalize(row)]));
  return {expected:left.size,actual:right.size,
    missing:[...left.keys()].filter(key=>!right.has(key)),
    extra:[...right.keys()].filter(key=>!left.has(key)),
    changed:[...left.keys()].filter(key=>right.has(key)&&canonical(left.get(key))!==canonical(right.get(key)))};
}
async function main(evidence=defaultEvidence){
  const read=async file=>JSON.parse(await fs.readFile(path.join(evidence,file+'.json'),'utf8'));
  const [remote,definitions,history,integrity]=await Promise.all(['remote-schema','remote-functions','remote-history','remote-integrity'].map(read));
  const db=new PGlite();
  try{
    await db.waitReady;
    await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
      create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;`);
    const files=(await fs.readdir(path.join(root,'supabase/migrations'))).filter(file=>file.endsWith('.sql')).sort();
    for(const file of files)await db.exec(await fs.readFile(path.join(root,'supabase/migrations',file),'utf8'));
    const query=await fs.readFile(path.join(root,'supabase/checks/modernization-readonly.sql'),'utf8');
    const local=JSON.parse((await db.query(query.slice(query.indexOf('select jsonb_pretty'),query.indexOf('\ncommit;')))).rows[0].jsonb_pretty);
    const localDefinitions=(await db.query(`select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' order by n.nspname,p.proname,p.oid`)).rows;
    const differences=Object.fromEntries(Object.keys(fields).map(kind=>[kind,compare(kind,local[kind],remote[kind])]));
    const actual=new Map(definitions.map(row=>[functionKey(row),row]));
    const exact=[],lineEndingsOnly=[],changed=[];
    for(const row of localDefinitions){
      const other=actual.get(functionKey(row));
      if(!other){changed.push(functionKey(row));continue;}
      if(row.definition===other.definition)exact.push(functionKey(row));
      else if(row.definition.replace(/\r\n/g,'\n')===other.definition.replace(/\r\n/g,'\n'))lineEndingsOnly.push(functionKey(row));
      else changed.push(functionKey(row));
    }
    const remoteByKey=new Map(remote.functions.map(row=>[functionKey(row),row]));
    const metadataChanges=[];
    for(const row of local.functions){
      const other=remoteByKey.get(functionKey(row));if(!other)continue;
      for(const field of ['security_definer','settings','anon_execute','authenticated_execute']){
        if(JSON.stringify(row[field])!==JSON.stringify(other[field]))metadataChanges.push({function:functionKey(row),field});
      }
    }
    const missingConstraints=new Set(differences.constraints.missing);
    const notNull=local.constraints.filter(row=>missingConstraints.has(fields.constraints(row)));
    const catalogVersionDifference=Number(local.postgres.split('.')[0])>=18&&Number(remote.postgres.split('.')[0])<18&&
      notNull.length===missingConstraints.size&&notNull.every(row=>/^NOT NULL /.test(row.definition))&&differences.columns.changed.length===0;
    const migrations=files.map(file=>{const match=file.match(/^(\d+)_(.*)\.sql$/);return {version:match[1],name:match[2]};});
    const expectedRealtime=['dining_tables','messages','notifications','orders'];
    const actualRealtime=(remote.realtime||[]).filter(row=>row.schemaname==='public').map(row=>row.tablename).sort();
    const matches=kind=>['missing','extra','changed'].every(field=>differences[kind][field].length===0);
    const result={checkedAt:new Date().toISOString(),target:'zrczgghucwsaxqnyaapk',
      scope:'Offline comparison of actual dashboard metadata exports with actual repository migrations in a clean PGlite; no remote writes or Auth service tests.',
      localPostgres:local.postgres,remotePostgres:remote.postgres,differences,
      classification:{functions:{expected:localDefinitions.length,actual:definitions.length,exact:exact.length,lineEndingsOnly:lineEndingsOnly.length,changed,metadataChanges,
        extra:definitions.filter(row=>!localDefinitions.some(item=>functionKey(item)===functionKey(row)))},
        constraints:{notNullCatalogEntries:notNull.length,postgresVersionRepresentationOnly:catalogVersionDifference},
        migrationsMatch:JSON.stringify(migrations.map(row=>[row.version,row.name]))===JSON.stringify(history.migrations.map(row=>[row.version,row.name])),
        mediaBucketMatches:JSON.stringify(local.media_bucket)===JSON.stringify(remote.media_bucket),
        realtimeTablesMatch:JSON.stringify(expectedRealtime)===JSON.stringify(actualRealtime),
        remoteIntegrity:integrity,remoteEventTriggers:history.event_triggers},
      applicationStructureMatches:['tables','columns','indexes','policies','column_grants'].every(matches)&&
        !differences.constraints.extra.length&&!differences.constraints.changed.length&&(matches('constraints')||catalogVersionDifference)&&
        !differences.functions.missing.length&&!changed.length&&!metadataChanges.length,
      limitations:['Extra remote functions and event triggers require review; applicationStructureMatches does not approve them.',
        'Realtime publication metadata is not a socket test. Auth/Storage dependencies in the local reference are shims.',
        'This comparison does not approve deployment, identity flows or data restoration.']};
    await fs.writeFile(path.join(evidence,'schema-comparison.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({applicationStructureMatches:result.applicationStructureMatches,functions:result.classification.functions.expected,
      exact:exact.length,lineEndingsOnly:lineEndingsOnly.length,changed:changed.length,extra:differences.functions.extra,
      notNullCatalogEntries:notNull.length,migrationsMatch:result.classification.migrationsMatch,
      mediaBucketMatches:result.classification.mediaBucketMatches,realtimeTablesMatch:result.classification.realtimeTablesMatch}));
    if(!result.applicationStructureMatches||!result.classification.migrationsMatch||!result.classification.mediaBucketMatches||!result.classification.realtimeTablesMatch)process.exitCode=1;
    return result;
  }finally{await db.close();}
}
if(require.main===module)main(process.argv[2]?path.resolve(process.argv[2]):defaultEvidence).catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={compare};
