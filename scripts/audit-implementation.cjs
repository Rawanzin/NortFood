const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const initial=path.join(root,'backups/modernization-20261021-1792612220855/manifest.json');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const excluded=new Set(['.git','.build','backups','node_modules','dist','dist-homologacao','dist-hostinger','test-results','playwright-report']);
async function main(){
  const snapshot=JSON.parse(await fs.readFile(initial,'utf8')),before=new Map(snapshot.files.map(file=>[file.path,file]));
  const current=new Map();
  async function walk(folder=''){
    for(const entry of await fs.readdir(path.join(root,folder),{withFileTypes:true})){
      if(!folder&&excluded.has(entry.name))continue;
      if(entry.isSymbolicLink())throw Error('AUDIT_SYMLINK_FORBIDDEN');
      const file=path.join(folder,entry.name).replaceAll('\\','/');
      if(entry.isDirectory())await walk(file);else{const buffer=await fs.readFile(path.join(root,file));current.set(file,{path:file,bytes:buffer.length,sha256:hash(buffer)});}
    }
  }
  await walk();
  const changes=[];
  for(const [file,now]of current)if(before.get(file)?.sha256!==now.sha256)changes.push({path:file,status:before.has(file)?'modified':'added',beforeBytes:before.get(file)?.bytes??null,bytes:now.bytes,sha256:now.sha256});
  for(const [file,old]of before)if(!current.has(file))changes.push({path:file,status:'removed',beforeBytes:old.bytes});
  const migrations=[...before.keys()].filter(file=>file.startsWith('supabase/migrations/'));
  const unchanged=file=>before.get(file)?.sha256===current.get(file)?.sha256;
  const report={checkedAt:new Date().toISOString(),baselineHead:snapshot.head,baselineFiles:snapshot.files.length,sourceFiles:current.size,
    environmentFilesUnchanged:['.env','.env.homologacao'].every(unchanged),
    migrationsUnchanged:migrations.every(unchanged),migrationCount:migrations.length,
    officialIconsUnchanged:['apple-touch-icon.png','favicon.ico','favicon-16x16.png','favicon-32x32.png','assets/icon-192.png','assets/icon-512.png'].every(unchanged),
    changes:changes.sort((a,b)=>a.path.localeCompare(b.path))};
  const target=path.join(root,'test-results/modernization-20261021/implementation-inventory.json');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,JSON.stringify(report,null,2));
  console.log(JSON.stringify({sourceFiles:current.size,changedFiles:changes.length,environmentFilesUnchanged:report.environmentFilesUnchanged,migrationsUnchanged:report.migrationsUnchanged,officialIconsUnchanged:report.officialIconsUnchanged,removed:changes.filter(file=>file.status==='removed').map(file=>file.path)}));
  if(!report.environmentFilesUnchanged||!report.migrationsUnchanged||!report.officialIconsUnchanged)process.exitCode=1;
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={main};
