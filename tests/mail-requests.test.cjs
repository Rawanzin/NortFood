const {test}=require('node:test'),assert=require('node:assert/strict'),esbuild=require('esbuild'),vm=require('node:vm');
async function fixture(){const result=await esbuild.build({entryPoints:['src/application/mail-requests.js'],bundle:true,write:false,format:'cjs'});const box={module:{exports:{}}};vm.runInNewContext(result.outputFiles[0].text,box);let time=0;return {guard:box.module.exports.createMailRequests({now:()=>time}),advance:ms=>time+=ms};}
test('Reenvio concorrente e modal reaberto não enviam outro e-mail; prazo não renova por clique bloqueado',async()=>{
 const {guard,advance}=await fixture();let release,calls=0;const request=()=>{calls++;return new Promise(resolve=>release=resolve);};
 const first=guard.run('resend','QA@example.test',request);await assert.rejects(()=>guard.run('resend',' qa@example.test ',request),/andamento/);assert.equal(calls,1);release();await first;
 await assert.rejects(()=>guard.run('resend','qa@example.test',request),/60 segundos/);advance(60000);let sent=0;await guard.run('resend','qa@example.test',async()=>sent++);assert.equal(sent,1);
});
test('Erro real do provedor é preservado, sem repetição automática ou falsa entrega',async()=>{
 const {guard,advance}=await fixture();let calls=0;const failure=Object.assign(new Error('Limite do provedor atingido'),{code:'over_email_send_rate_limit'});
 await assert.rejects(()=>guard.run('resend','qa@example.test',async()=>{calls++;throw failure;}),error=>error===failure);
 await assert.rejects(()=>guard.run('resend','qa@example.test',async()=>calls++),/limite do provedor/);assert.equal(calls,1);advance(60000);assert.equal(guard.status('resend','qa@example.test').seconds,0);
});
test('Recuperação e confirmação usam limites separados e não alteram sessão nem dados de cadastro',async()=>{
 const {guard}=await fixture();let calls=0;await guard.run('resend','a@example.test',async()=>calls++);await guard.run('recover','a@example.test',async()=>calls++);await guard.run('resend','b@example.test',async()=>calls++);assert.equal(calls,3);
});
test('Cadastro que solicitou confirmação inicia a espera do reenvio sem enviar outro e-mail',async()=>{
 const {guard,advance}=await fixture();let calls=0;guard.note('resend','pending@example.test');
 assert.equal(guard.status('resend','pending@example.test').seconds,60);
 await assert.rejects(()=>guard.run('resend','pending@example.test',async()=>calls++),/60 segundos/);
 assert.equal(calls,0);advance(60000);await guard.run('resend','pending@example.test',async()=>calls++);assert.equal(calls,1);
});
