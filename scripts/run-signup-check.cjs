// Worker opt-in. Recebe chave somente por stdin, nunca por argumento/arquivo/log.
const fs=require('node:fs'),path=require('node:path');
const folder=path.resolve(__dirname,'../test-results/signup-20261021');fs.mkdirSync(folder,{recursive:true});
let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',part=>{input+=part;if(input.length>4096){input='';process.exit(2);}});
process.stdin.on('end',async()=>{
 let key=input.trim();input='';const output=path.join(folder,'worker.json');
 fs.writeFileSync(output,JSON.stringify({status:'RUNNING',started:new Date().toISOString()}));
 try{await require('../tests/helpers/signup-accounts-live.cjs').run(key,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});fs.writeFileSync(output,JSON.stringify({status:'COMPLETED',finished:new Date().toISOString()}));}
 catch{fs.writeFileSync(output,JSON.stringify({status:'FAILED',finished:new Date().toISOString(),detail:'Consultar remote-accounts.json sanitizado.'}));process.exitCode=1;}
 finally{key='';}
});
