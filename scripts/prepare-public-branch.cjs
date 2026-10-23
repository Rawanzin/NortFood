// Makes a public source commit from CURRENT files without exporting internal history/reports.
// Does not checkout/reset the workspace or change the active index.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const git=(args,options={})=>cp.execFileSync('git',args,{encoding:'utf8',windowsHide:true,...options}).trim();
function main(){
 const branch='release/nortfood',remote='refs/remotes/origin/'+branch;
 const parent=cp.spawnSync('git',['rev-parse','--verify',remote],{encoding:'utf8',windowsHide:true});
 const base=parent.status===0?parent.stdout.trim():git(['rev-parse','refs/remotes/origin/main']);
 const roots=new Set(['index.html','app.js','styles.css','refinements.css','theme.js','theme.css','pwa.js','pwa.css','sw.js','offline.html','404.html','site.webmanifest','favicon.ico','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','.gitignore','.env.example','netlify.toml','_headers','_redirects']);
 const files=[...new Set(git(['ls-files','-c','-o','--exclude-standard','-z']).split('\0').filter(p=>p&&fs.existsSync(p)&&(roots.has(p)||/^(?:src|assets|scripts|tests|supabase)\//.test(p))))];
 for(const p of files){if(fs.lstatSync(p).isSymbolicLink())throw Error('SOURCE_SYMLINK_FORBIDDEN');if(/(?:^|\/)\.env(?:$|\.(?!example$))|\.(?:zip|dump)$/i.test(p))throw Error('PRIVATE_SOURCE_FILE:'+p);const b=fs.readFileSync(p);if(b.includes(0))continue;const s=b.toString();if(/(?:sb_secret_|sbp_|nfp_|ghp_)[\w-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(s))throw Error('SOURCE_SECRET_PATTERN:'+p);for(const m of s.matchAll(/eyJ[\w-]+\.([\w-]+)\.[\w-]+/g)){try{if(JSON.parse(Buffer.from(m[1],'base64url')).role==='service_role')throw Error('SOURCE_SERVICE_ROLE:'+p)}catch(e){if(e.message.startsWith('SOURCE_'))throw e}}}
 fs.mkdirSync('.build',{recursive:true});const index=path.resolve('.build/public-index-'+crypto.randomUUID()),env={...process.env,GIT_INDEX_FILE:index};
 try{
  git(['read-tree','--empty'],{env});git(['-c','core.safecrlf=false','add','--',...files],{env});
  const readme=git(['hash-object','-w','docs/DEPLOY_PUBLICO.md']);git(['update-index','--add','--cacheinfo','100644,'+readme+',README.md'],{env});
  const tree=git(['write-tree'],{env}),commit=git(['commit-tree',tree,'-p',base,'-m',process.argv[2]||'feat: publish existing NortFood as safe Netlify PWA']);
  git(['update-ref','refs/heads/'+branch,commit]);
  fs.mkdirSync('test-results/launch-20261023',{recursive:true});fs.writeFileSync('test-results/launch-20261023/public-source.json',JSON.stringify({branch,commit,parent:base,files:files.length,internalReportsExported:false},null,2));
  console.log(JSON.stringify({branch,commit,parent:base,files:files.length}));
 }finally{if(fs.existsSync(index))fs.unlinkSync(index)}
}
main();
