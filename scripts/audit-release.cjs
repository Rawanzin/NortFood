const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function inspect(root='dist') {
 const files=[],issues=[];
 function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,entry.name),relative=path.relative(root,full).replaceAll('\\','/');if(entry.isSymbolicLink())throw Error('PUBLIC_SYMLINK_FORBIDDEN');if(entry.isDirectory()){if(/^(?:docs|backups|src|scripts|tests|supabase|node_modules|\.git|\.netlify)(?:\/|$)/.test(relative))issues.push('PRIVATE_DIRECTORY:'+relative);walk(full);}else{files.push({path:relative,bytes:fs.statSync(full).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')});if(/(?:^|\/)(?:\.env[^/]*|config\.local\.js)|\.(?:zip|dump|sql|ps1|map)$/i.test(relative))issues.push('PRIVATE_FILE:'+relative);if(/\.(?:js|json|html|css|txt|webmanifest)$/.test(relative)){const s=fs.readFileSync(full,'utf8');if(/(?:sb_secret_|sbp_|nfp_|ghp_)[\w-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(s))issues.push('SECRET_PATTERN:'+relative);for(const m of s.matchAll(/eyJ[\w-]+\.([\w-]+)\.[\w-]+/g)){try{if(JSON.parse(Buffer.from(m[1],'base64url')).role==='service_role')issues.push('SERVICE_ROLE:'+relative)}catch{}}}}}}
 walk(root);
 const configText=fs.readFileSync(path.join(root,'config.js'),'utf8'),match=configText.match(/Object\.freeze\((\{.*\})\)/);
 if(!match)issues.push('INVALID_PUBLIC_CONFIG');
 const config=match?JSON.parse(match[1]):{};
 if(config.supabaseUrl!=='https://zwkhqahivthzivmuirjr.supabase.co')issues.push('PRODUCTION_BACKEND_MISMATCH');
 if(!config.appUrl?.startsWith('https://'))issues.push('HTTPS_REQUIRED');
 if(config.publicPreview!==true&&config.publicAccounts!==true)issues.push('PUBLIC_ENTRY_CONFIGURATION_REQUIRED');
 const report={checkedAt:new Date().toISOString(),root:path.resolve(root),passed:issues.length===0,issues,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),inventory:files};
 return report;
}
if(require.main===module){try{const report=inspect(process.argv[2]||'dist');fs.mkdirSync('test-results/launch-20261023',{recursive:true});fs.writeFileSync('test-results/launch-20261023/public-package.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,inventory:undefined},null,2));if(!report.passed)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={inspect};
