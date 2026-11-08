// Private local recovery validation. Never prints application rows or identities.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|\+00:00)$/.test(v)?v.replace(/Z$/,'+00:00').replace(/(\.\d*?[1-9])0+(?=\+)/,'$1').replace(/\.0+(?=\+)/,''):v;
async function main(){
 const input=path.resolve(process.argv[2]||'backups/commercial-20261102/production-application.json');
 assert.ok(input.startsWith(path.resolve('backups')+path.sep),'PRIVATE_BACKUP_PATH_REQUIRED');
 const bytes=await fs.readFile(input),backup=JSON.parse(bytes);
 assert.equal(backup.scope,'NortFood application recovery point; not full managed-service backup');
 assert.ok(backup.functions.length>50);assert.ok(backup.data['public.stores']);
 const db=new PGlite();try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,banned_until timestamptz,raw_user_meta_data jsonb not null default '{}',email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
  const versions=new Set(backup.migrations.map(m=>m.version));
  for(const file of (await fs.readdir('supabase/migrations')).filter(f=>versions.has(f.split('_')[0])).sort())await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
  // Disposable local database only: triggers are suspended to replay exact rows,
  // including immutable history. No remote connection exists in this script.
  await db.exec("set time zone 'UTC';set session_replication_role=replica");
  for(const id of backup.auth_ids)await db.query('insert into auth.users(id) values($1)',[id]);
  for(const [table,rows]of Object.entries(backup.data)){
   assert.match(table,/^(public|private)\.[a-z_]+$/);
   await db.exec('truncate '+table+' cascade');
  }
  // Constraint triggers are also deferred by replica; validate all FKs afterward.
  for(const [table,rows]of Object.entries(backup.data))if(rows.length)await db.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table},$1::jsonb)`,[JSON.stringify(rows)]);
  await db.exec('set session_replication_role=origin');
  const foreignKeys=(await db.query(`select n.nspname as schema_name,c.relname as child_table,pn.nspname as parent_schema,pc.relname as parent_table,
   array(select a.attname from unnest(k.conkey) with ordinality x(attnum,pos) join pg_attribute a on a.attrelid=k.conrelid and a.attnum=x.attnum order by x.pos) as child_columns,
   array(select a.attname from unnest(k.confkey) with ordinality x(attnum,pos) join pg_attribute a on a.attrelid=k.confrelid and a.attnum=x.attnum order by x.pos) as parent_columns
   from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace join pg_class pc on pc.oid=k.confrelid join pg_namespace pn on pn.oid=pc.relnamespace where k.contype='f' and n.nspname in('public','private')`)).rows;
  const ident=s=>'"'+s.replaceAll('"','""')+'"';
  for(const key of foreignKeys){
   const child=ident(key.schema_name)+'.'+ident(key.child_table),parent=ident(key.parent_schema)+'.'+ident(key.parent_table);
   const required=key.child_columns.map(c=>'c.'+ident(c)+' is not null').join(' and '),match=key.child_columns.map((c,i)=>'c.'+ident(c)+'=p.'+ident(key.parent_columns[i])).join(' and ');
   assert.equal((await db.query(`select exists(select 1 from ${child} c where ${required} and not exists(select 1 from ${parent} p where ${match})) as broken`)).rows[0].broken,false,'RESTORED_FOREIGN_KEY_'+key.child_table);
  }
  const checks=[];
  for(const [table,rows]of Object.entries(backup.data)){
   const actual=(await db.query(`select count(*)::int n from ${table}`)).rows[0].n;assert.equal(actual,rows.length,'ROW_COUNT_'+table);
   const fingerprint=rs=>JSON.stringify(rs.map(r=>JSON.stringify(canonical(r))).sort());
   const restored=(await db.query('select to_jsonb(t) as row from '+table+' t')).rows.map(r=>r.row);
   if(fingerprint(restored)!==fingerprint(rows)){
    const key=rows[0]?.id?'id':null,changed=new Set();
    for(let i=0;i<rows.length;i++){const old=rows[i],next=key?restored.find(r=>r[key]===old[key]):restored[i];for(const column of Object.keys(old))if(JSON.stringify(canonical(old[column]))!==JSON.stringify(canonical(next?.[column])))changed.add(column);}
    throw Error('EXACT_ROWS_'+table+': '+[...changed].join(','));
   }
   const fingerprintExpression=table==='public.profiles'?"to_jsonb(t)-'avatar_path'":"to_jsonb(t)";
   const md5=(await db.query(`select md5(coalesce(jsonb_agg(${fingerprintExpression} order by (${fingerprintExpression})::text)::text,'[]')) as hash from ${table} t`)).rows[0].hash;
   checks.push({table,rows:actual,exact:true,md5});
  }
  const applied=[];
  if(process.argv.includes('--validate-pending')){
   for(const file of (await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')&&!versions.has(f.split('_')[0])).sort()){
    await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));applied.push(file);
   }
   for(const table of ['public.stores','public.products','public.product_option_groups','public.product_options','public.orders','public.platform_settings']){
    const columns=backup.columns.filter(c=>c.table_schema+'.'+c.table_name===table).map(c=>c.column_name);
    const restored=(await db.query('select to_jsonb(t) as row from '+table+' t')).rows.map(r=>Object.fromEntries(columns.map(k=>[k,r.row[k]])));
    const sort=rs=>JSON.stringify(rs.map(r=>JSON.stringify(canonical(r))).sort());
    assert.equal(sort(restored),sort(backup.data[table]),'MIGRATION_PRESERVATION_'+table);
   }
  }
  const report={checkedAt:new Date().toISOString(),passed:true,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,tables:checks,foreignKeysValidated:foreignKeys.length,pendingMigrationsValidated:applied,scope:'Application data restored exactly in local disposable PostgreSQL. Auth passwords/sessions, Vault secrets and Storage bytes are outside this recovery point.'};
  await fs.writeFile(input.replace(/\.json$/,'.validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:true,tables:checks.length,rows:checks.reduce((n,c)=>n+c.rows,0),sha256:report.sha256,scope:report.scope}));
 }finally{await db.close();}
}
main().catch(e=>{console.error(e.message.split('\n')[0]);process.exitCode=1});
