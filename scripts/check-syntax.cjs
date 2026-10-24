const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const files=['app.js','pwa.js','sw.js','theme.js','assets/delivery-address.js','assets/signup-flow.js'];
for(const dir of ['src','scripts','tests']){const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(?:cjs|mjs|js)$/.test(p))files.push(p)}};walk(dir)}
let failed=0;for(const file of files){const r=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});if(r.status!==0){console.error(file,r.stderr);failed++;}}
console.log(JSON.stringify({syntaxFiles:files.length,failed,note:'Syntax validation only; architecture and runtime behavior use separate checks.'}));if(failed)process.exitCode=1;
