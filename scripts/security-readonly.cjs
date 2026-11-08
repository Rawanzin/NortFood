// Application contracts only: GET/OPTIONS, public key, no rows from private tables.
const fs = require('node:fs/promises');
const path = require('node:path');
async function main() {
  const origin = 'https://nortfood.pages.dev';
  const response = await fetch(origin + '/config.js', {signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw Error('PUBLIC_CONFIG_UNAVAILABLE');
  const source = await response.text();
  const match = source.match(/Object\.freeze\((\{[\s\S]*\})\);?/);
  if (!match) throw Error('PUBLIC_CONFIG_INVALID');
  const config = JSON.parse(match[1]);
  if (config.supabaseUrl !== 'https://zwkhqahivthzivmuirjr.supabase.co') throw Error('TARGET_MISMATCH');
  const targets = [
    {name:'principal', url:config.supabaseUrl, key:config.publishableKey},
    (() => {const c = require('./homologation-config.cjs').configuration(); return {name:'homologacao',url:c.url,key:c.publicConfig.publishableKey};})()
  ];
  const results = [];
  for (const target of targets) {
    const rows = [];
    async function probe(name, route, {method='GET',headers={}, expected, summarize}={}) {
      try {
        const r = await fetch(target.url + route, {method,headers:{apikey:target.key,...headers},redirect:'manual',signal:AbortSignal.timeout(15000)});
        const body = await r.json().catch(() => null);
        const row = {name,status:r.status, ...(expected === undefined ? {} : {expected,passed:r.status === expected}),
          ...(body?.code ? {code:body.code} : {}), ...(summarize ? summarize(body,r) : {})};
        rows.push(row);
      } catch { rows.push({name,error:'TRANSPORT_OR_CONTRACT_FAILURE',passed:false}); }
    }
    await probe('auth_settings','/auth/v1/settings',{expected:200,summarize:d=>({emailEnabled:d?.external?.email===true,googleEnabled:d?.external?.google===true,emailConfirmationRequired:d?.mailer_autoconfirm===false,signupEnabled:d?.disable_signup===false})});
    await probe('pilot','/rest/v1/rpc/nf_operating_status',{expected:200,summarize:d=>({pilotEnabled:d===true})});
    await probe('public_catalog','/rest/v1/rpc/nf_catalog',{expected:200,summarize:d=>({publicStoreCount:Array.isArray(d)?d.length:null})});
    for (const table of ['profiles','addresses','orders','order_items','messages','conversations','notifications','commission_ledger','commission_settlements','admin_audit_logs']) {
      await probe('anonymous_denied_'+table,'/rest/v1/'+table+'?select=*&limit=0',{expected:401});
    }
    for (const rpc of ['nf_snapshot','nf_context','nf_admin_dashboard']) await probe('anonymous_denied_'+rpc,'/rest/v1/rpc/'+rpc,{expected:401});
    await probe('private_schema_hidden','/rest/v1/admin_users?select=user_id&limit=0',{headers:{'Accept-Profile':'private'},expected:406});
    await probe('store_private_reason_denied','/rest/v1/stores?select=status_reason&limit=0',{expected:401});
    // This RPC intentionally requires an authenticated user. A 401 confirms
    // the anonymous contract; a 404 still flags the pending remote migration.
    await probe('anonymous_denied_avatar_rpc','/rest/v1/rpc/nf_avatar_capabilities',{expected:401});
    for (const fn of ['upload-media','profile-avatar']) {
      await probe(fn+'_pages_preflight','/functions/v1/'+fn,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'},expected:200,
        summarize:(d,r)=>({allowOriginMatches:r.headers.get('access-control-allow-origin')===origin})});
    }
    results.push({environment:target.name,host:new URL(target.url).hostname,results:rows});
  }
  const report = {checkedAt:new Date().toISOString(),scope:'GET/OPTIONS only; private tables use limit=0; no positive authenticated RLS proof, mail, writes or commercial orders.',results};
  const folder = path.resolve('test-results/etapa10-20261031');
  await fs.mkdir(folder,{recursive:true});
  await fs.writeFile(path.join(folder,'backend-readonly.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
if (require.main === module) main().catch(() => { console.error('READONLY_CHECK_FAILED; no credentials logged.'); process.exitCode=1; });
module.exports = {main};
