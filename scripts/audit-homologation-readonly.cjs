// Current anonymous contract, not an attestation of pg_catalog, RLS or migration history.
const fs = require('node:fs/promises');
const path = require('node:path');
const { configuration } = require('./homologation-config.cjs');
async function main() {
  const config = configuration();
  const results = [];
  const probes = [
    ['catalog', '/rest/v1/rpc/nf_catalog', 200, value => Array.isArray(value)],
    ['pilot_blocked', '/rest/v1/rpc/nf_operating_status', 200, value => value === false],
    ['auth_confirmation', '/auth/v1/settings', 200, value => value.mailer_autoconfirm === false],
    ['location_tables_contract', '/rest/v1/stores?select=id,latitude,longitude,tables_enabled&limit=0', 200],
    ['private_store_reason', '/rest/v1/stores?select=status_reason&limit=0', 401],
    ...['profiles','orders','messages','commission_ledger','commission_settlements','admin_audit_logs'].map(table => [table + '_anonymous_denied', '/rest/v1/' + table + '?select=*&limit=0', 401]),
    ['snapshot_denied', '/rest/v1/rpc/nf_snapshot', 401],
    ['context_denied', '/rest/v1/rpc/nf_context', 401],
    ['admin_denied', '/rest/v1/rpc/nf_admin_dashboard', 401],
  ];
  for (const [name,route,expected,validate] of probes) {
    try {
      const response = await fetch(config.url + route, {headers:{apikey:config.publicConfig.publishableKey},signal:AbortSignal.timeout(12000)});
      const validBody = validate ? validate(await response.json()) : true;
      results.push({name,status:response.status,expected,passed:response.status === expected && validBody});
    } catch { results.push({name,passed:false,error:'TRANSPORT_OR_CONTRACT_FAILURE'}); }
  }
  const report = {checkedAt:new Date().toISOString(),target:new URL(config.url).hostname,mode:'GET_ONLY',scope:'Anonymous remote HTTP contracts only; no writes, no positive identity or SQL inspection.',results,passed:results.every(row=>row.passed)};
  const destination = path.resolve(__dirname,'../test-results/modernization-20261021/remote-readonly.json');
  await fs.mkdir(path.dirname(destination),{recursive:true});
  await fs.writeFile(destination,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if (!report.passed) process.exitCode = 1;
}
if (require.main === module) main().catch(() => {console.error('READONLY_AUDIT_FAILED; no credentials or responses logged.');process.exitCode=1;});
module.exports={main};
