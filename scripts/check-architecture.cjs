const fs=require('node:fs/promises'),path=require('node:path'),esbuild=require('esbuild');
async function main(){
  const result=await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,metafile:true,format:'iife',platform:'browser',external:['./pdf-export.js'],logLevel:'silent'});
  const inputs=result.metafile.inputs;
  const graph=Object.fromEntries(Object.entries(inputs).filter(([file])=>file.startsWith('src/')).map(([file,data])=>[file,data.imports.map(item=>item.path).filter(item=>item.startsWith('src/'))]));
  const visiting=new Set(),visited=new Set(),cycles=[];
  function walk(file,route=[]){if(visiting.has(file)){cycles.push([...route,file]);return;}if(visited.has(file))return;visiting.add(file);for(const next of graph[file]||[])walk(next,[...route,file]);visiting.delete(file);visited.add(file);}
  for(const file of Object.keys(graph))walk(file);
  const violations=[];
  for(const [file,imports]of Object.entries(graph)){
    if(file.startsWith('src/platform/')&&imports.some(value=>!value.startsWith('src/platform/')))violations.push(file+' imports a higher layer');
    if(file.startsWith('src/data/')&&imports.some(value=>!value.startsWith('src/data/')&&!value.startsWith('src/platform/')))violations.push(file+' imports a higher layer');
    if(file.startsWith('src/presentation/')&&imports.some(value=>value==='src/backend.js'||value==='src/commercial.js'))violations.push(file+' imports a composition root');
  }
  const report={checkedAt:new Date().toISOString(),modules:Object.keys(graph).length,cycles,violations,graph};
  const destination=path.resolve('test-results/modernization-20261021/architecture.json');await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,JSON.stringify(report,null,2));
  console.log(JSON.stringify({modules:report.modules,cycles:cycles.length,violations:violations.length}));if(cycles.length||violations.length)process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
