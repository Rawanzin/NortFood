// Bounded pattern scan of the current source tree. Never prints matched values.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
function scan() {
  const tracked = execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  const all = execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  const findings = [];
  for (const file of tracked) if (/(?:^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.example')) findings.push({file,rule:'ENV_TRACKED'});
  let scanned = 0;
  for (const file of new Set(all)) {
    if (/^(?:backups|test-results|\.agents|\.codex-attachments)\//.test(file) || !/\.(?:js|mjs|cjs|ts|json|toml|sql|html|md|yml|yaml|ps1|txt)$/.test(file)) continue;
    const source = fs.readFileSync(file,'utf8'); scanned++;
    const rules = [
      ['PRIVATE_KEY',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
      ['PRIVILEGED_TOKEN',/\b(?:sb_secret_|sbp_|ghp_|github_pat_)[A-Za-z0-9_-]{20,}/g]
    ];
    for (const [rule,pattern] of rules) for (const m of source.matchAll(pattern)) findings.push({file,line:source.slice(0,m.index).split('\n').length,rule});
    for (const m of source.matchAll(/eyJ[\w-]+\.([\w-]+)\.[\w-]+/g)) {
      try {if (JSON.parse(Buffer.from(m[1],'base64url')).role === 'service_role') findings.push({file,line:source.slice(0,m.index).split('\n').length,rule:'SERVICE_ROLE_JWT'});} catch {}
    }
  }
  const report = {checkedAt:new Date().toISOString(),scanned,passed:findings.length===0,findings,
    scope:'Current tracked/untracked source text; known private-key/token/service-role patterns and tracked env files. No Git-history, entropy or credential-validity scan; public anon/publishable keys are intended client configuration.'};
  fs.mkdirSync('test-results/etapa10-20261031/security',{recursive:true});
  fs.writeFileSync('test-results/etapa10-20261031/security/secrets.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if (!report.passed) process.exitCode=1;
  return report;
}
if (require.main === module) scan();
module.exports={scan};
