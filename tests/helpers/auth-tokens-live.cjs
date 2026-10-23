// Auth remoto real, sem SMTP: nao comprova cadastro publico nem entrega de e-mail.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
async function authTokens({root,makeClient,publicKey,url,suffix}){
 if(url!=='https://zrczgghucwsaxqnyaapk.supabase.co')throw Error('AUTH_TOKEN_TARGET_FORBIDDEN');
 const report={target:new URL(url).hostname,status:'REPROVADA',scope:'Tokens reais gerados pela API administrativa; sem envio SMTP, cadastro publico ou caixa postal',checks:[]};
 let password=randomUUID()+randomUUID(),nextPassword=randomUUID()+randomUUID();
 const email='nortfood-token-'+suffix+'@example.test',client=makeClient(publicKey);
 try{
  const generated=await root.auth.admin.generateLink({type:'signup',email,password,options:{redirectTo:'http://localhost:4174/'}});assert.ifError(generated.error);const id=generated.data.user.id;assert.ok(!generated.data.user.email_confirmed_at);
  assert.ok((await client.auth.signInWithPassword({email,password})).error,'Conta nao confirmada nao pode entrar');report.checks.push('Conta sintetica nao confirmada recusada no login');
  const confirmed=await client.auth.verifyOtp({token_hash:generated.data.properties.hashed_token,type:'signup'});assert.ifError(confirmed.error);assert.equal(confirmed.data.user.id,id);assert.ok(confirmed.data.user.email_confirmed_at);report.checks.push('Token real de confirmacao produz sessao e confirma somente a conta sintetica');
  const replay=await makeClient(publicKey).auth.verifyOtp({token_hash:generated.data.properties.hashed_token,type:'signup'});assert.ok(replay.error,'Token de confirmacao nao pode ser reutilizado');report.checks.push('Reutilizacao do token de confirmacao recusada');await client.auth.signOut();
  const recovery=await root.auth.admin.generateLink({type:'recovery',email,options:{redirectTo:'http://localhost:4174/#settings'}});assert.ifError(recovery.error);const recovered=await client.auth.verifyOtp({token_hash:recovery.data.properties.hashed_token,type:'recovery'});assert.ifError(recovered.error);assert.equal(recovered.data.user.id,id);
  const changed=await client.auth.updateUser({password:nextPassword});assert.ifError(changed.error);assert.equal(changed.data.user.id,id);await client.auth.signOut();
  assert.ok((await client.auth.signInWithPassword({email,password})).error,'Senha anterior deve ser recusada');const fresh=await client.auth.signInWithPassword({email,password:nextPassword});assert.ifError(fresh.error);assert.equal(fresh.data.user.id,id);report.checks.push('Recuperacao real permite alterar senha; antiga recusada e nova aceita');await client.auth.signOut();
  assert.ok((await client.auth.verifyOtp({token_hash:recovery.data.properties.hashed_token,type:'recovery'})).error,'Token de recuperacao deve ser de uso unico');report.checks.push('Reutilizacao do token de recuperacao recusada');
  report.status='APROVADA';
 }catch(error){report.error='Auth token: '+(error.code||error.status||error.name||'ASSERTION_FAILED');throw Error(report.error);}finally{password='';nextPassword='';await fs.writeFile(path.resolve(__dirname,'../../test-results/homologation/auth-tokens-live-result.json'),JSON.stringify(report,null,2));}
}
module.exports={authTokens};
