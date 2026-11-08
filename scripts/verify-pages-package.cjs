// Compares the exact static package with the existing NortFood Pages site.
// GET only; canonical HTML redirects must stay on the verified origin.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {inspect} = require('./audit-release.cjs');
async function main() {
  const origin = new URL(process.argv[2] || 'https://nortfood.pages.dev');
  if (!/^https:\/\/(?:[a-f0-9]{8}\.)?nortfood\.pages\.dev\/$/.test(origin.href)) throw Error('EXACT_PAGES_ORIGIN_REQUIRED');
  const root = path.resolve(process.env.NORTFOOD_VERIFY_PACKAGE_ROOT || 'dist-pages'), local = inspect(root);
  if (!local.passed) throw Error('PUBLIC_PACKAGE_AUDIT_REQUIRED');
  const results = [];
  let cursor = 0;
  await Promise.all(Array.from({length:6}, async () => {
    while (cursor < local.inventory.length) {
      const file = local.inventory[cursor++];
      const route = file.path === 'index.html' ? '/' : '/' + file.path;
      let response = await fetch(new URL(route, origin), {redirect:'manual', signal:AbortSignal.timeout(20000)});
      let canonicalRedirect = null;
      if (file.path.endsWith('.html') && [301,308].includes(response.status)) {
        const next = new URL(response.headers.get('location') || '/', origin);
        const allowed = file.path === 'index.html' ? '/' : route.slice(0,-5);
        if (next.origin !== origin.origin || next.pathname !== allowed || next.search || next.hash) throw Error('UNEXPECTED_HTML_REDIRECT');
        canonicalRedirect = next.pathname;
        response = await fetch(next, {redirect:'error', signal:AbortSignal.timeout(20000)});
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      // An explicit visit to /404 is a static page (200). Missing routes must
      // return 404 and are checked separately below.
      const expected = file.path === '_headers' ? 404 : 200;
      const hashMatches = file.path === '_headers' || crypto.createHash('sha256').update(bytes).digest('hex') === file.sha256;
      results.push({path:file.path,status:response.status,expected,canonicalRedirect,hashMatches,passed:response.status===expected&&hashMatches});
    }
  }));
  const fallbackHash=local.inventory.find(file=>file.path==='404.html').sha256;
  for(const route of ['/pwa-verify-missing-20261029','/.env','/supabase/config.toml']) {
    const response=await fetch(new URL(route,origin),{redirect:'error',signal:AbortSignal.timeout(20000)});
    const bytes=Buffer.from(await response.arrayBuffer());
    const hashMatches=crypto.createHash('sha256').update(bytes).digest('hex')===fallbackHash;
    results.push({path:route,status:response.status,expected:404,hashMatches,passed:response.status===404&&hashMatches});
  }
  results.sort((a,b) => a.path.localeCompare(b.path));
  const report = {checkedAt:new Date().toISOString(),origin:origin.origin,localRelease:JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),passed:results.every(row=>row.passed),scope:'Exact public bytes and HTTP statuses only. No authenticated journey or commercial release.',results};
  await fs.mkdir('test-results/final-release-20261028',{recursive:true});
  await fs.writeFile('test-results/final-release-20261028/pages-package-live.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({origin:report.origin,checks:results.length,passed:report.passed,failed:results.filter(row=>!row.passed)},null,2));
  if (!report.passed) process.exitCode=1;
}
main().catch(() => {console.error('PAGES_PACKAGE_VERIFICATION_FAILED');process.exitCode=1;});
