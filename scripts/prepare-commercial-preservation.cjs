// Outputs a read-only fingerprint query. No row data or credentials in SQL.
const fs=require('node:fs/promises');
(async()=>{
 const environment=process.argv[2]||'production';if(!['production','staging'].includes(environment))throw Error('KNOWN_ENVIRONMENT_REQUIRED');
 const validation=JSON.parse(await fs.readFile('backups/commercial-20261102/'+environment+'-application.validation.json'));
 if(!validation.passed)throw Error('VALIDATED_RECOVERY_POINT_REQUIRED');
 const queries=validation.tables.map(t=>{
  if(!/^(public|private)\.[a-z_]+$/.test(t.table)||!t.md5)throw Error('VALIDATED_TABLE_REQUIRED');
  const expression=t.table==='public.profiles'?"to_jsonb(t)-'avatar_path'":'to_jsonb(t)';
  return `select '${t.table}' as name,count(*)::int as rows,md5(coalesce(jsonb_agg(${expression} order by (${expression})::text)::text,'[]')) as md5 from ${t.table} t`;
 });
 await fs.writeFile('supabase/checks/commercial_preservation'+(environment==='staging'?'_staging':'')+'_20261102.sql','begin transaction read only;\nselect jsonb_agg(to_jsonb(x) order by name) as preservation from ('+queries.join('\nunion all\n')+') x;\nrollback;\n');
 console.log(JSON.stringify({readOnlyQueryPrepared:true,tables:queries.length,containsApplicationRows:false}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
