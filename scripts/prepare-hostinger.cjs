// Preparacao offline: nao possui cliente de deploy, banco, API Hostinger ou DNS.
const fs=require('node:fs/promises'),path=require('node:path'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),output=path.join(root,'dist-hostinger');
async function inventory(dir=output,prefix=''){
 const rows=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const name=prefix+e.name;if(e.isSymbolicLink())throw Error('HOSTINGER_SYMLINK_FORBIDDEN');if(e.isDirectory())rows.push(...await inventory(path.join(dir,e.name),name+'/'));else {const b=await fs.readFile(path.join(dir,e.name));rows.push({path:name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
async function prepare({server,appOrigin,passwordFile}={}){
 // Validar parametros ANTES de escrever. Sem origem, preparar somente candidato offline.
 const configured=Boolean(server||appOrigin||passwordFile),rules=configured?require('./hostinger-config.cjs').render({server,appOrigin,passwordFile}):null;
 // Nao carregar .env principal; o build isolado le somente .env.homologacao.
 const result=spawnSync(process.execPath,['scripts/build.cjs','--homologation','--hostinger'],{cwd:root,windowsHide:true,encoding:'utf8',env:{...process.env,NORTFOOD_HOMOLOGATION_PREVIEW_URL:appOrigin||''}});
 if(result.status!==0)throw Error('HOSTINGER_ISOLATED_BUILD_FAILED');
 const files=await inventory();
 const allowed=new Set(['index.html','offline.html','release.json','404.html','app.js','styles.css','refinements.css','pwa.css','pwa.js','sw.js','config.js','favicon.ico','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','site.webmanifest','manifest.webmanifest','robots.txt','sitemap.xml']);
 const asset=name=>name.startsWith('assets/')&&!/(?:^|\/)\./.test(name)&&/\.(?:js|css|png|jpe?g|webp|svg|ico|woff2|txt)$/i.test(name);
 if(files.some(f=>!asset(f.path)&&!allowed.has(f.path)))throw Error('HOSTINGER_UNEXPECTED_OUTPUT_FILE');
 for(const file of files.filter(f=>/\.(?:js|css|html|svg|txt)$/i.test(f.path))){
  const source=await fs.readFile(path.join(output,file.path),'utf8');
  if(/sb_secret_[A-Za-z0-9_-]{12,}/.test(source))throw Error('HOSTINGER_SECRET_IN_OUTPUT');
  for(const token of source.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){
   let claims;try{claims=JSON.parse(Buffer.from(token[1],'base64url'));}catch{continue;}
   if(claims.role==='service_role')throw Error('HOSTINGER_PRIVILEGED_TOKEN_IN_OUTPUT');
  }
 }
 const config=await fs.readFile(path.join(output,'config.js'),'utf8');
 if(!config.includes('https://zrczgghucwsaxqnyaapk.supabase.co')||/zwkhqahivthzivmuirjr|sb_secret_|service_role/.test(config))throw Error('HOSTINGER_STAGING_ONLY');
 const reportDir=path.join(root,'test-results/hostinger');await fs.mkdir(reportDir,{recursive:true});
 // Regras ficam FORA do document root: incluir apenas depois de verificar protecao remota.
 if(rules)await fs.writeFile(path.join(reportDir,rules.name+'.prepared'),rules.text);
 const report={status:'PENDENTE',scope:'Preparacao local; nao e publicacao ou homologacao remota',server:server||'NAO_IDENTIFICADO',origin:appOrigin||null,configuration:rules?'REGRAS_PREPARADAS_FORA_DO_WEBROOT':'PENDENTE_IDENTIFICAR_PLANO_E_ORIGEM',protection:'PENDENTE_VALIDACAO_REMOTA_ANTES_DE_UPLOAD',output,files};
 await fs.writeFile(path.join(reportDir,'package-manifest.json'),JSON.stringify(report,null,2));return report;
}
if(require.main===module){const args=process.argv.slice(2),get=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;prepare({server:get('--server'),appOrigin:get('--origin'),passwordFile:get('--auth-file')}).then(r=>console.log(JSON.stringify({status:r.status,server:r.server,origin:r.origin,files:r.files.length,output:r.output}))).catch(e=>{console.error(e.message);process.exitCode=1;});}
module.exports={prepare,inventory};
