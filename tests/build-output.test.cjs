const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('Build promotion: failed promotion preserves old release, success removes stale files and content changes its version',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'nortfood-build-'));
  const helper=path.resolve('scripts/build-output.cjs');
  const code=`const fs=require('node:fs/promises'),assert=require('node:assert/strict'),path=require('node:path');
    process.chdir(process.argv[1]);const {stagingDirectory,promote,releaseId,removeOwned,validatePublicScripts}=require(process.argv[2]);
    (async()=>{await fs.mkdir('dist');await fs.writeFile('dist/old.txt','old');
      await fs.writeFile('bad.js','const = broken;');assert.throws(()=>validatePublicScripts(['bad.js']),/PUBLIC_SCRIPT_SYNTAX_INVALID/);assert.equal(await fs.readFile('dist/old.txt','utf8'),'old');
      await assert.rejects(()=>promote(path.resolve('.build/missing'),'dist'));assert.equal(await fs.readFile('dist/old.txt','utf8'),'old');
      const staged=await stagingDirectory('dist');await fs.writeFile(path.join(staged,'index.html'),'one');const before=await releaseId(staged);
      await fs.writeFile(path.join(staged,'index.html'),'two');assert.notEqual(await releaseId(staged),before);
      await promote(staged,'dist');await assert.rejects(()=>fs.access('dist/old.txt'));assert.equal(await fs.readFile('dist/index.html','utf8'),'two');
      await assert.rejects(()=>removeOwned(path.resolve('dist')),/OUTSIDE_STAGING/);
    })().catch(error=>{console.error(error);process.exitCode=1});`;
  try{const result=spawnSync(process.execPath,['-e',code,root,helper],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr)}
  finally{const resolved=path.resolve(root);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('nortfood-build-'))throw Error('UNSAFE_TEST_CLEANUP');await fs.rm(resolved,{recursive:true,force:true});}
});
test('Header path rules do not turn all JS, HTML and images into manifest MIME type',async()=>{
  const {headersFor}=require('../scripts/http-headers.cjs'),source=await fs.readFile('_headers','utf8');
  assert.equal(headersFor(source,'/')['Content-Type'],undefined);
  assert.equal(headersFor(source,'/config.js')['Cache-Control'],'no-store');
  assert.match(headersFor(source,'/sw.js')['Content-Type'],/javascript/);
  const {render}=require('../scripts/hostinger-config.cjs');
  for(const server of ['apache','nginx'])assert.doesNotMatch(render({server,appOrigin:'https://qa.nortfood.test',passwordFile:'/private/.htpasswd'}).text,/(?:Header always set|add_header) Content-Type/);
});
