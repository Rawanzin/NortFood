const fs=require('node:fs/promises');
async function main(){
 const origin=new URL(process.argv[2]||'https://nortfood.netlify.app');
 if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||!origin.hostname.endsWith('.netlify.app'))throw Error('EXACT_NETLIFY_HTTPS_ORIGIN_REQUIRED');
 const results=[],run=async(name,path,expected,check=()=>true)=>{
  const r=await fetch(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(20000)}),body=await r.text();
  const passed=r.status===expected&&check(r,body);results.push({name,path,status:r.status,expected,passed});return body;
 };
 const html=await run('public_shell','/',200,(r,s)=>s.includes('<title>NortFood</title>')&&r.headers.get('x-content-type-options')==='nosniff'&&r.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
 const script=await run('public_config','/config.js',200,(r,s)=>r.headers.get('cache-control')==='no-store'&&s.includes('"publicPreview":true')&&s.includes('zwkhqahivthzivmuirjr')&&!s.includes('sb_secret_'));
 const match=script.match(/Object\.freeze\((\{.*\})\)/);if(!match)throw Error('PUBLIC_CONFIG_INVALID');const config=JSON.parse(match[1]);
 results.push({name:'canonical_matches_official_origin',passed:html.includes('rel="canonical" href="'+config.appUrl+'/"')&&config.appUrl==='https://nortfood.netlify.app'});
 await run('service_worker','/sw.js',200,(r,s)=>r.headers.get('cache-control')==='no-cache'&&!s.includes('__NORTFOOD_RELEASE__')&&s.includes('isSupabaseOrPrivate'));
 const manifest=JSON.parse(await run('manifest','/manifest.webmanifest',200,(r,s)=>r.headers.get('content-type')?.includes('manifest+json')));
 results.push({name:'standalone_manifest',passed:manifest.name==='NortFood'&&manifest.display==='standalone'&&manifest.id==='/'&&manifest.scope==='/'});
 for(const icon of manifest.icons){const r=await fetch(new URL(icon.src,origin));const b=Buffer.from(await r.arrayBuffer());results.push({name:'icon_'+icon.sizes+'_'+icon.purpose,passed:r.status===200&&b.subarray(1,4).toString()==='PNG'&&icon.sizes===b.readUInt32BE(16)+'x'+b.readUInt32BE(20)});}
 for(const path of ['/app.js','/styles.css','/refinements.css','/pwa.js','/offline.html','/assets/nortfood-backend.js','/assets/nortfood-og.png','/robots.txt','/sitemap.xml','/release.json'])await run('asset:'+path,path,200);
 for(const path of ['/.env','/.env.homologacao','/.git/config','/src/backend.js','/supabase/config.toml','/docs/PILOTO.md','/backups/test.sql','/nonexistent-launch-route'])await run('private_or_missing:'+path,path,404);
 const headers={apikey:config.publishableKey};
 for(const [name,route,expected,validate] of [
  ['pilot_blocked','/rest/v1/rpc/nf_operating_status',200,v=>v===false],
  ['catalog_is_real','/rest/v1/rpc/nf_catalog',200,v=>Array.isArray(v)],
  ['anonymous_orders_denied','/rest/v1/orders?select=id&limit=0',401],
  ['anonymous_profiles_denied','/rest/v1/profiles?select=id&limit=0',401],
  ['anonymous_messages_denied','/rest/v1/messages?select=id&limit=0',401],
  ['anonymous_admin_denied','/rest/v1/rpc/nf_admin_dashboard',401]
 ]){const r=await fetch(config.supabaseUrl+route,{headers,signal:AbortSignal.timeout(20000)});const data=await r.json();results.push({name,status:r.status,expected,passed:r.status===expected&&(!validate||validate(data))});}
 const http=await fetch(origin.href.replace('https:','http:'),{redirect:'manual'});results.push({name:'http_redirects_to_https',status:http.status,passed:[301,302,307,308].includes(http.status)&&http.headers.get('location')?.startsWith(origin.origin)});
 const report={checkedAt:new Date().toISOString(),origin:origin.origin,passed:results.every(r=>r.passed),scope:'Anonymous HTTPS/HTTP static/privacy/manifest/backend denial checks. No user or order created. Does not approve authenticated commercial journeys or physical installation.',results};
 await fs.mkdir('test-results/launch-20261023',{recursive:true});const label=origin.hostname==='nortfood.netlify.app'?'official':'preview';await fs.writeFile('test-results/launch-20261023/https-'+label+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({origin:report.origin,checks:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed)},null,2));if(!report.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
