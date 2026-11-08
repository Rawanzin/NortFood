// Preserve the exact currently verified public package before a direct Pages deploy.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
async function main(){
 const inventory=JSON.parse(await fs.readFile('test-results/launch-20261023/public-package.json','utf8'));
 if(!inventory.passed||!Array.isArray(inventory.inventory))throw Error('VERIFIED_INVENTORY_REQUIRED');
 const origin='https://af936ab3.nortfood.pages.dev';
 const folder=path.resolve('backups/etapa10-20261031-public-before/dist-pages');
 const results=[];
 await fs.mkdir(folder,{recursive:true});
 for(const file of inventory.inventory){
  if(file.path.includes('..')||path.isAbsolute(file.path))throw Error('INVALID_INVENTORY_PATH');
  let bytes;
  if(file.path==='_headers')bytes=await fs.readFile('_headers');
  else{
   const route=file.path==='index.html'?'/':'/'+file.path;
   const r=await fetch(origin+route,{signal:AbortSignal.timeout(20000)});
   if(!r.ok||new URL(r.url).origin!==origin)throw Error('PUBLIC_BACKUP_FETCH_FAILED');
   bytes=Buffer.from(await r.arrayBuffer());
  }
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  if(hash!==file.sha256)throw Error('PUBLIC_BACKUP_HASH_MISMATCH:'+file.path);
  const target=path.resolve(folder,file.path);
  if(!target.startsWith(folder+path.sep))throw Error('BACKUP_PATH_ESCAPE');
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);
  results.push({path:file.path,sha256:hash});
 }
 await fs.writeFile(path.join(folder,'../verification.json'),JSON.stringify({origin,checkedAt:new Date().toISOString(),files:results.length,results},null,2));
 console.log(JSON.stringify({status:'VERIFIED_PUBLIC_BACKUP',files:results.length,folder}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
