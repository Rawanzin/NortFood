// Real application in Chrome, controlled SDK transport only; no real account or password.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),esbuild=require('esbuild'),{chromium}=require('playwright');
const {server}=require('../scripts/serve.cjs');
test('Recuperação preserva o formulário e seus campos ao reentrar na mesma sessão; troca de identidade limpa tudo',async()=>{
 const built=await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,format:'iife',external:['./pdf-export.js'],plugins:[{name:'focus-sdk-fixture',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'sdk',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createClient=()=>window.__focusFixture.client;'}));}}]});
 const code=built.outputFiles[0].text+'\nconst focusOriginalController=window.NortFoodBackend.controller;window.NortFoodBackend.controller=(...args)=>window.__focusController=focusOriginalController(...args);';
 const app=await server({config:{supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture',publicAccounts:true,publicPreview:true}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/nortfood-backend.js',r=>r.fulfill({contentType:'text/javascript',body:code}));
  await page.route('https://fixture.supabase.co/**',r=>r.fulfill({contentType:'application/json',body:'{"disable_signup":false,"external":{"email":true}}'}));
  await page.addInitScript(()=>{
   const state={user:null,listener:null},original={id:'40000000-0000-4000-8000-000000000001',email:'recovery@example.test',email_confirmed_at:'2026-11-02T00:00:00Z'},channel={on(){return this},subscribe(){return this}};
   const client={auth:{getSession:async()=>({data:{session:state.user?{user:state.user}:null}}),getUser:async()=>{if(!state.user){state.user=original;state.listener?.('PASSWORD_RECOVERY',{user:state.user});}return {data:{user:state.user}};},onAuthStateChange:fn=>{state.listener=fn;}},rpc:async name=>({data:name==='nf_context'&&state.user?{profile:{id:state.user.id,name:'Pessoa de teste'},memberships:[],is_admin:false,onboarding:{customer:{kind:'customer'}}}:name==='nf_catalog'?[]:name==='nf_operating_status'?false:{},error:null}),from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),channel:()=>channel,removeChannel(){}};
   window.__focusFixture={client,async emit(event,switchUser=false){if(switchUser)state.user={...original,id:'40000000-0000-4000-8000-000000000002',email:'other@example.test'};state.listener(event,{user:state.user});await new Promise(r=>setTimeout(r,0));await window.__focusController.refresh('POLL');}};
  });
  await page.goto('http://127.0.0.1:'+app.address().port+'/#settings');await page.locator('#password-form').waitFor();
  await page.locator('#password-form [name=newPassword]').fill('somente-fixture-local');await page.locator('#password-form [name=confirmPassword]').fill('somente-fixture-local');
  for(const event of ['SIGNED_IN','TOKEN_REFRESHED','SIGNED_IN']){
   await page.evaluate(event=>window.__focusFixture.emit(event),event);
   assert.equal(await page.locator('#password-form').count(),1,'Evento '+event+' da mesma conta não pode fechar a recuperação');
   assert.equal(await page.locator('#password-form [name=newPassword]').inputValue(),'somente-fixture-local');assert.equal(await page.locator('#password-form [name=confirmPassword]').inputValue(),'somente-fixture-local');
  }
  // Screenshot uses an empty, fictitious form; never a real credential.
  await page.locator('#password-form [name=newPassword]').fill('');await page.locator('#password-form [name=confirmPassword]').fill('');
  await fs.mkdir('test-results/email-environment-20261102',{recursive:true});await page.locator('.modal').screenshot({path:path.resolve('test-results/email-environment-20261102/recovery-focus-local.png')});
  await page.evaluate(()=>window.__focusFixture.emit('SIGNED_IN',true));assert.equal(await page.locator('#password-form').count(),0,'Outra identidade deve remover o formulário anterior');assert.deepEqual(errors,[]);
 }finally{await browser?.close();app.closeAllConnections();await new Promise(r=>app.close(r));}
});
