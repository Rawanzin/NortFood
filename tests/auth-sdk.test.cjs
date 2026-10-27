// SDK Supabase real em Chromium; HTTP Auth/RPC e links de e-mail são controlados.
// Nenhuma conta, mensagem ou alteração alcança o Supabase remoto.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright'),esbuild=require('esbuild');
const {server}=require('../scripts/serve.cjs');

test('SDK real: cadastro completo, link de confirmação, sessão, recuperação e logout', {timeout:90000}, async()=>{
 const code=(await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,format:'iife',external:['./pdf-export.js']})).outputFiles[0].text;
 const id=crypto.randomUUID(),email='sdk-controlled@example.test',date=new Date().toISOString();
 const user={id,aud:'authenticated',role:'authenticated',email,email_confirmed_at:null,confirmed_at:null,created_at:date,updated_at:date,app_metadata:{provider:'email',providers:['email']},user_metadata:{name:'Cliente SDK',phone:'38999999999',terms_version:'2026-10-public-v2'},identities:[{id:crypto.randomUUID(),user_id:id,provider:'email',identity_data:{email,sub:id},created_at:date,updated_at:date}]};
 const state={sessions:new Map(),signups:[],onboarding:[],recovery:[],resends:[],passwordUpdates:0,logouts:0};
 function session(){user.email_confirmed_at=date;user.confirmed_at=date;const exp=Math.floor(Date.now()/1000)+3600;const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',email,exp,iat:exp-3600,session_id:crypto.randomUUID()})).toString('base64url')+'.'+Buffer.from('controlled-signature-no-real-secret').toString('base64url');const value={access_token:token,refresh_token:crypto.randomUUID(),expires_in:3600,expires_at:exp,token_type:'bearer',user:{...user}};state.sessions.set(token,value);return value;}
 const app=await server({config:{mode:'commercial',supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_controlled',publicAccounts:true,publicPreview:true}});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+app.address().port;
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  await context.routeWebSocket(/wss:\/\/fixture\.supabase\.co\//,socket=>socket.close());
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===origin){if(url.pathname==='/assets/nortfood-backend.js')return route.fulfill({contentType:'text/javascript',body:code});return route.continue();}
   if(url.hostname!=='fixture.supabase.co')return route.abort();
   const reply=(body,status=200)=>route.fulfill({status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS'},body:status===204?undefined:JSON.stringify(body)});
   if(request.method()==='OPTIONS')return reply({});
   const body=request.postDataJSON()||{},active=state.sessions.get((request.headers().authorization||'').replace(/^Bearer /,''));
   if(url.pathname==='/auth/v1/settings')return reply({disable_signup:false,mailer_autoconfirm:false,external:{email:true,google:false}});
   if(url.pathname==='/auth/v1/signup'){state.signups.push(body);return reply(user);}
   if(url.pathname==='/auth/v1/resend'){state.resends.push(body);return reply({});}
   if(url.pathname==='/auth/v1/recover'){state.recovery.push({body,redirect:url.searchParams.get('redirect_to')});return reply({});}
   if(url.pathname==='/auth/v1/token'){
    if(body.email!==email&&url.searchParams.get('grant_type')!=='refresh_token')return reply({code:400,error_code:'invalid_credentials',msg:'Invalid login credentials'},400);
    if(!user.email_confirmed_at)return reply({code:400,error_code:'email_not_confirmed',msg:'Email not confirmed'},400);
    return reply(session());
   }
   if(url.pathname==='/auth/v1/user'){
    if(!active)return reply({code:401,error_code:'bad_jwt',msg:'Invalid session'},401);
    if(request.method()==='PUT'){assert.ok(body.password?.length>=8);state.passwordUpdates++;}return reply(user);
   }
   if(url.pathname==='/auth/v1/logout'){state.logouts++;state.sessions.clear();return reply(null,204);}
   if(url.pathname==='/rest/v1/categories')return reply([{id:'11111111-1111-4111-8111-111111111111',name:'Lanches'}]);
   const name=url.pathname.split('/').at(-1);
   if(name==='nf_catalog')return reply([]);if(name==='nf_operating_status')return reply(false);
   if(!active)return reply({code:'42501',message:'AUTH_REQUIRED'},401);
   if(name==='nf_context')return reply({profile:{id,name:'Cliente SDK',phone:'38999999999',terms_accepted_at:date},memberships:[],is_admin:false,onboarding:state.onboarding.length?{customer:{kind:'customer'}}:{}});
   if(name==='nf_complete_onboarding'){state.onboarding.push(body.p_data);return reply(id);}
   if(name==='nf_claim_store_invitation')return reply(0);
   if(['nf_store_drafts','nf_store_setup'].includes(name))return reply([]);
   if(name==='nf_snapshot')return reply({});
   throw Error('Unexpected controlled endpoint: '+url.pathname);
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);await page.waitForFunction(()=>window.NortFoodBackend&&!document.getElementById('app').inert);
  await page.locator('[data-action=auth]').first().click();await page.locator('#auth-name').fill('Cliente SDK');await page.locator('#auth-phone').fill('(38) 99999-9999');await page.locator('#auth-email').fill(email);await page.locator('[data-signup-next]').click();
  for(const [name,value]of Object.entries({street:'Rua Sintética SDK',number:'10',neighborhood:'Centro Sintético',city:'Porteirinha',postal_code:'39520000',reference:'Referência sintética'}))await page.locator('#auth-form [name='+name+']').fill(value);
  await page.locator('#auth-form [name=state]').fill('MG');await page.locator('[data-signup-next]').click();await page.locator('#auth-password').fill('controlled-fixture-password');await page.locator('#auth-confirm-password').fill('controlled-fixture-password');await page.locator('#auth-form [name=consent]').check();await page.locator('.auth-submit').click();await page.locator('[data-auth-confirmation]').waitFor();
  assert.equal(state.signups.length,1);assert.equal(state.signups[0].data.name,'Cliente SDK');assert.equal(await page.evaluate(()=>window.NortFoodBackend.context()),null);
  await page.locator('#resend-confirmation-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('[data-confirmation-status]')?.textContent.includes('Se a conta'));assert.equal(state.resends.length,1);assert.equal(state.resends[0].email,email);assert.equal(state.resends[0].type,'signup');
  const confirmed=session(),callback=new URLSearchParams({access_token:confirmed.access_token,refresh_token:confirmed.refresh_token,expires_in:'3600',token_type:'bearer',type:'signup'});
  await page.goto(origin+'/?sdk-callback=confirmation#'+callback);await page.waitForFunction(()=>document.querySelector('[data-action=auth]')===null&&!document.getElementById('app').inert);
  assert.equal(page.url().includes('access_token='),false);assert.equal(state.onboarding.length,1);assert.equal(state.onboarding[0].address.street,'Rua Sintética SDK');assert.equal(state.onboarding[0].address.reference,'Referência sintética');
  await page.reload();await page.waitForFunction(()=>window.NortFoodBackend&&!document.getElementById('app').inert);assert.equal((await page.evaluate(()=>window.NortFoodBackend.context())).user.id,id);
  await page.locator('[data-nav=profile]').click();await page.locator('[data-action=logout]').click();await page.locator('[data-action=auth]').first().waitFor();assert.ok(state.logouts>=1);assert.equal(await page.evaluate(()=>window.NortFoodBackend.context()),null);
  await page.locator('[data-action=auth]').first().click();await page.locator('[data-auth-mode=login]').click();await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill('controlled-fixture-password');await page.locator('[name=remember]').uncheck();await page.locator('.auth-submit').click();await page.locator('#auth-form').waitFor({state:'detached'});
  await page.reload();await page.waitForFunction(()=>window.NortFoodBackend&&!document.getElementById('app').inert);assert.equal((await page.evaluate(()=>window.NortFoodBackend.context())).user.id,id);
  const otherTab=await context.newPage();await otherTab.goto(origin);await otherTab.waitForFunction(()=>window.NortFoodBackend&&!document.getElementById('app').inert);assert.equal(await otherTab.evaluate(()=>window.NortFoodBackend.context()),null);await otherTab.close();
  await page.evaluate(email=>window.NortFoodBackend.recover(email),email);assert.equal(state.recovery.length,1);assert.equal(state.recovery[0].body.email,email);assert.equal(state.recovery[0].redirect,origin);
  const recovery=session(),recoveryLink=new URLSearchParams({access_token:recovery.access_token,refresh_token:recovery.refresh_token,expires_in:'3600',token_type:'bearer',type:'recovery'});await page.goto(origin+'/?sdk-callback=recovery#'+recoveryLink);await page.locator('#password-form').waitFor();assert.equal(page.url().includes('access_token='),false);
  await page.locator('#password-form [name=newPassword]').fill('different-controlled-password');await page.locator('#password-form [name=confirmPassword]').fill('different-controlled-password');await page.locator('#password-form button[type=submit]').click();await page.locator('#password-form').waitFor({state:'detached'});assert.equal(state.passwordUpdates,1);assert.equal(await page.evaluate(()=>window.NortFoodBackend.recoveryRequested()),false);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();app.closeAllConnections();await new Promise(resolve=>app.close(resolve));}
});
