const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild');

async function factory(){const built=await esbuild.build({entryPoints:['src/application/auth-confirmation.js'],bundle:true,write:false,format:'cjs'});const box={module:{exports:{}},URLSearchParams};vm.runInNewContext(built.outputFiles[0].text,box);return box.module.exports.createConfirmationVerification;}
function scenario(create,options={}){
 const user={id:'confirmed-user',email_confirmed_at:'2026-10-29T12:00:00Z'},state={identity:{id:user.id,revision:1},user,token:'controlled-callback-token',calls:[]};
 const client={auth:{
  getUser:async token=>{state.calls.push(['verified-user',token]);return {data:{user:state.user},error:null}},
  getSession:async()=>{state.calls.push(['active-session']);return {data:{session:{access_token:state.token,user:state.user}},error:null}}
 }};
 const result=create({hash:'#type=signup&access_token=controlled-callback-token',getClient:()=>client,identity:()=>({...state.identity}),...options});
 return {result,state,client};
}

test('Confirmação exige usuário confirmado no servidor e o mesmo token/sessão',async()=>{
 const create=await factory();
 for(const type of ['signup','email','email_change']){
  const {result,state}=scenario(create,{hash:'#type='+type+'&access_token=controlled-callback-token'});const value=await result();
  assert.equal(value.status,'verified');assert.equal(value.serverVerified,true);assert.deepEqual(state.calls,[['verified-user','controlled-callback-token'],['active-session']]);
  assert.doesNotMatch(JSON.stringify(value),/controlled-callback-token|confirmed-user/);
  value.serverVerified=false;assert.equal((await result()).serverVerified,true);assert.equal(state.calls.length,2);
 }
});

test('Token forjado não aproveita uma sessão antiga confirmada',async()=>{
 const create=await factory(),{result,state,client}=scenario(create);state.token='older-valid-session';
 assert.equal((await result()).status,'invalid');assert.equal((await result()).serverVerified,false);
 const invalid=scenario(create);invalid.client.auth.getUser=async()=>({data:{user:null},error:{code:'bad_jwt',status:401}});assert.equal((await invalid.result()).status,'invalid');
 const unconfirmed=scenario(create);unconfirmed.state.user.email_confirmed_at=null;assert.equal((await unconfirmed.result()).status,'invalid');
 const other=scenario(create);other.client.auth.getSession=async()=>({data:{session:{access_token:'controlled-callback-token',user:{id:'other-user'}}}});assert.equal((await other.result()).status,'invalid');
});

test('Retorno expirado e erro de rede não mostram confirmação nem detalhes sensíveis',async()=>{
 const create=await factory(),expired=scenario(create,{hash:'#error=access_denied&error_code=otp_expired&error_description=NAO_EXIBIR'});
 assert.equal((await expired.result()).status,'expired');assert.equal(expired.state.calls.length,0);assert.doesNotMatch(JSON.stringify(await expired.result()),/NAO_EXIBIR/);
 const expiredJWT=scenario(create);expiredJWT.client.auth.getUser=async()=>({error:{code:'jwt_expired',status:401}});assert.equal((await expiredJWT.result()).status,'expired');
 const offline=scenario(create);offline.client.auth.getUser=async()=>{throw Object.assign(Error('SEGREDO_NAO_EXIBIR'),{name:'AuthRetryableFetchError'})};assert.equal((await offline.result()).status,'unavailable');assert.doesNotMatch(JSON.stringify(await offline.result()),/SEGREDO/);
});

test('Trocar identidade durante ou após a verificação invalida o resultado',async()=>{
 const create=await factory(),{result,state}=scenario(create);assert.equal((await result()).status,'verified');state.identity={id:'other-user',revision:2};assert.equal(await result(),null);state.identity={id:'confirmed-user',revision:3};assert.equal(await result(),null);
 const pending=scenario(create);let release;pending.client.auth.getUser=()=>new Promise(resolve=>{release=resolve});const attempt=pending.result();pending.state.identity={id:'other-user',revision:2};release({data:{user:pending.state.user},error:null});assert.equal(await attempt,null);
});

test('Sem callback e recuperação não disparam verificação de confirmação',async()=>{
 const create=await factory();for(const hash of ['','#home','#access_token=controlled-callback-token','#type=recovery&access_token=controlled-callback-token','#type=recovery&error_code=otp_expired','#type=magiclink&access_token=controlled-callback-token']){const {result,state}=scenario(create,{hash});assert.equal(await result(),null);assert.equal(state.calls.length,0);}
});

test('Chamadas concorrentes compartilham uma única verificação Auth',async()=>{
 const create=await factory(),{result,state}=scenario(create);const [first,second]=await Promise.all([result(),result()]);assert.equal(first.status,'verified');assert.equal(second.status,'verified');assert.equal(state.calls.length,2);
});
