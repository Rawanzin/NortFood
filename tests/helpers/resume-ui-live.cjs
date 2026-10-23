// Reutiliza somente identidades sinteticas da ultima fixture; nao cria administradores.
const {createClient}=require('@supabase/supabase-js'),{randomUUID}=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function resumeUI({root,config}){
 const folder=path.resolve(__dirname,'../../test-results/homologation'),fixture=JSON.parse(fs.readFileSync(path.join(folder,'fixture-request.json')));
 if(config.url!=='https://zrczgghucwsaxqnyaapk.supabase.co'||fixture.target!=='zrczgghucwsaxqnyaapk.supabase.co'||fixture.phase!=='cleanup'||!/^[a-f0-9]{8}$/.test(fixture.suffix))throw Error('RESUME_TARGET_FORBIDDEN');
 const {suffix,category}=fixture,store=fixture.stores[0],password=randomUUID()+randomUUID(),clients=[];
 const listed=await root.auth.admin.listUsers({perPage:1000});assert.ifError(listed.error);
 const users=['cliente','loja','outro'].map(name=>listed.data.users.find(u=>u.email===`nortfood-${name}-${suffix}@example.test`));assert.ok(users.every(Boolean),'Somente contas sinteticas exatas da fixture');
 async function login(user){const changed=await root.auth.admin.updateUserById(user.id,{password});assert.ifError(changed.error);const client=createClient(config.url,config.publicConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(client);const signed=await client.auth.signInWithPassword({email:user.email,password});assert.ifError(signed.error);return client;}
 async function rpc(c,name,args){const result=await c.rpc(name,args);if(result.error)throw result.error;return result.data;}
 let active;
 try{const customer=await login(users[0]),seller=await login(users[1]),context=await rpc(seller,'nf_context',{});assert.equal(context.is_admin,false);assert.ok(context.memberships.some(m=>m.store_id===store));
 active=await require('./staging-sql-fixture.cjs').stagingFixture({url:config.url,store,users:users.map(u=>u.id),category,suffix,rpc,customer,existingStore:true});await rpc(seller,'nf_set_store_open',{p_store:store,p_open:true,p_paused:false});const conversation=await rpc(customer,'nf_chat',{p_store:store});
 const marker=path.join(folder,'retry-ui.json');let passed=false;
 for(let attempt=1;attempt<=6;attempt++){
  const started=Date.now();try{delete require.cache[require.resolve('./authenticated-ui.cjs')];await require('./authenticated-ui.cjs').authenticatedUI({suffix,password,store,conversation,url:config.url});passed=true;console.log('UI_GATE_APROVADA');break;}catch(error){console.log('UI_ATTEMPT_FAILED '+attempt);fs.writeFileSync(path.join(folder,`ui-attempt-${suffix}-${attempt}.json`),fs.readFileSync(path.join(folder,'authenticated-ui-result.json')));if(attempt===6)throw error;}
  console.log('UI_RETRY_WAITING');let retry=false;for(let i=0;i<120;i++){try{if(fs.statSync(marker).mtimeMs>started){retry=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!retry)break;
 }if(!passed)throw Error('UI_GATE_PENDING_OR_FAILED');
 }finally{if(active)await active.cleanup();await Promise.allSettled(clients.map(c=>c.auth.signOut()));clients.forEach(c=>c.realtime.disconnect());}
}
module.exports={resumeUI};
