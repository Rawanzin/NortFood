// Contrato local de aprovacao do perimetro. Nao e prova de deploy remoto.
const {test}=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),fs=require('node:fs'),{target,blocked}=require('../scripts/check-protected-preview.cjs');
test('Preview exige HTTPS e recusa pagina publica, redirects arbitrarios e credenciais na origem',()=>{
 for(const u of ['http://teste.netlify.app','https://user:senha@teste.netlify.app','https://teste.netlify.app/path','https://evil.invalid','https://netlify.app.evil.invalid'])assert.throws(()=>target(u));
 const origin='https://qa-controlado.netlify.app';assert.equal(target(origin),origin);
 for(const status of [200,201,404,500])assert.equal(blocked(status,null,origin),false,'HTTP '+status+' nao comprova protecao');
 assert.equal(blocked(401,null,origin),true);assert.equal(blocked(403,null,origin),true);assert.equal(blocked(302,'https://app.netlify.com/login?return_to=qa',origin),true);assert.equal(blocked(302,'https://app.netlify.com/',origin),true);
 for(const location of ['https://app.netlify.com.evil.invalid/login','http://app.netlify.com/login','/home','https://app.netlify.com/drop'])assert.equal(blocked(302,location,origin),false);
});
test('Build de preview recusa outro Supabase antes de alterar artefatos existentes',()=>{
 const before=fs.readFileSync('dist-homologacao/config.js','utf8'),r=spawnSync(process.execPath,['scripts/build.cjs','--homologation'],{env:{...process.env,NORTFOOD_TEST_SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co'},encoding:'utf8',windowsHide:true});assert.equal(r.status,1);assert.match(r.stderr,/HOMOLOGATION_PREVIEW_TARGET_FORBIDDEN/);assert.equal(fs.readFileSync('dist-homologacao/config.js','utf8'),before);
});
