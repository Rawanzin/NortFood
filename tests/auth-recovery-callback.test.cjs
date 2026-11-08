const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild');
async function factory(){const built=await esbuild.build({entryPoints:['src/application/auth-recovery.js'],bundle:true,write:false,format:'cjs'});const box={module:{exports:{}},URLSearchParams};vm.runInNewContext(built.outputFiles[0].text,box);return box.module.exports.createRecoveryVerification;}
function scenario(create,{hash='#type=recovery&access_token=controlled-recovery-token'}={}){
 const state={identity:{id:'recovery-user',revision:1},user:{id:'recovery-user',email_confirmed_at:'2026-11-01T00:00:00Z'},token:'controlled-recovery-token',calls:[]};
 const client={auth:{getUser:async token=>{state.calls.push(['server-user',token]);return {data:{user:state.user},error:null};},getSession:async()=>{state.calls.push(['active-session']);return {data:{session:{access_token:state.token,user:state.user}},error:null};}}};
 const verify=create({hash,getClient:()=>client,identity:()=>({...state.identity})});return {verify,state,client};
}

test('Recovery missed by the listener requires exact callback token, server user and current session',async()=>{
 const create=await factory(),{verify,state}=scenario(create);assert.equal(await verify(),true);assert.deepEqual(state.calls,[['server-user','controlled-recovery-token'],['active-session']]);assert.equal(await verify(),false);assert.equal(state.calls.length,2);
 state.identity.revision++;assert.equal(await verify(),false);state.identity.revision=1;state.identity.id='other-user';assert.equal(await verify(),false);
});

test('Recovery type alone, unrelated callbacks, expired errors and forged tokens never authorize recovery',async()=>{
 const create=await factory();for(const hash of ['','#type=recovery','#type=signup&access_token=controlled-recovery-token','#type=recovery&access_token=controlled-recovery-token&error_code=otp_expired']){const {verify,state}=scenario(create,{hash});assert.equal(await verify(),false);assert.equal(state.calls.length,0);}
 const forged=scenario(create);forged.client.auth.getUser=async()=>({error:{code:'bad_jwt',status:401}});assert.equal(await forged.verify(),false);
 const old=scenario(create);old.state.token='older-valid-session';assert.equal(await old.verify(),false);
 const other=scenario(create);other.client.auth.getSession=async()=>({data:{session:{access_token:'controlled-recovery-token',user:{id:'other-user'}}}});assert.equal(await other.verify(),false);
 const unknown=scenario(create);unknown.state.identity.id='different-current-user';assert.equal(await unknown.verify(),false);
 const anonymous=scenario(create);anonymous.state.identity.id=null;assert.equal(await anonymous.verify(),false);assert.equal(anonymous.state.calls.length,0);
 const unconfirmed=scenario(create);unconfirmed.state.user.email_confirmed_at=null;assert.equal(await unconfirmed.verify(),false);
});

test('Recovery rejects missing sessions, service failures and identity changes while verification is pending',async()=>{
 const create=await factory(),missing=scenario(create);missing.client.auth.getSession=async()=>({data:{session:null}});assert.equal(await missing.verify(),false);
 const offline=scenario(create);offline.client.auth.getUser=async()=>{throw Error('NEVER_RETURN_ERROR_CONTENT');};assert.equal(await offline.verify(),false);assert.equal(await offline.verify(),false);
 const pending=scenario(create);let release;pending.client.auth.getUser=()=>new Promise(resolve=>{release=resolve;});const work=pending.verify();pending.state.identity.revision++;release({data:{user:pending.state.user},error:null});assert.equal(await work,false);
 const sessionPending=scenario(create);let releaseSession;sessionPending.client.auth.getSession=()=>new Promise(resolve=>{releaseSession=resolve;});const attempt=sessionPending.verify();await new Promise(resolve=>setImmediate(resolve));sessionPending.state.identity={id:'other-user',revision:2};releaseSession({data:{session:{access_token:'controlled-recovery-token',user:sessionPending.state.user}}});assert.equal(await attempt,false);
});

test('Concurrent recovery checks share one verification and identity revisions invalidate replay',async()=>{
 const create=await factory(),{verify,state}=scenario(create);assert.deepEqual(await Promise.all([verify(),verify()]),[true,true]);assert.equal(state.calls.length,2);state.identity={id:'other-user',revision:2};assert.equal(await verify(),false);state.identity={id:'recovery-user',revision:3};assert.equal(await verify(),false);
});
