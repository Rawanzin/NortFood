// Full application rendering with controlled Auth transport. No remote account,
// email or credential is used; this verifies callback/loader ordering locally.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),esbuild=require('esbuild'),{chromium}=require('playwright');
const {server}=require('../scripts/serve.cjs');

test('Callback expirado é preservado nas duas ordens do loader e falha do SDK libera a interface', {timeout:60000},async()=>{
 const code=(await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,format:'iife',external:['./pdf-export.js'],plugins:[{name:'callback-order-sdk',setup(build){build.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'sdk',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createClient=()=>window.__callbackClient;'}));}}]})).outputFiles[0].text;
 const app=await server({config:{supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture',publicAccounts:true,publicPreview:true}});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));let browser;
 const folder=path.resolve('test-results/etapa10-20261031/auth-callback'),checks=[];
 try{
  await fs.mkdir(folder,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const order of ['backend-first','app-first','backend-failed']){
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('https://fixture.supabase.co/**',route=>route.fulfill({contentType:'application/json',body:'{"disable_signup":false,"external":{"email":true,"google":false}}'}));
   await page.addInitScript(()=>{
    const channel={on(){return this},subscribe(){return this}};
    window.__callbackClient={auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){}},rpc:async name=>({data:name==='nf_catalog'?[]:name==='nf_operating_status'?false:null,error:null}),from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),channel:()=>channel,removeChannel(){}};
   });
   if(order==='backend-first')await page.route('**/app.js',async route=>{await page.waitForFunction(()=>!!window.NortFoodBackend);await route.continue();});
   await page.route('**/assets/nortfood-backend.js',async route=>{
    if(order==='backend-failed')return route.abort('failed');
    if(order==='app-first')await page.waitForFunction(()=>document.getElementById('app')?.inert===true);
    return route.fulfill({contentType:'text/javascript',body:code});
   });
   await page.goto('http://127.0.0.1:'+app.address().port+'/#error=access_denied&error_code=otp_expired&error_description=NAO_EXIBIR');
   const error=order==='backend-failed'?page.locator('#auth-form #auth-error'):page.locator('[data-auth-confirmation-result=expired] #auth-confirmation-error');
   await error.waitFor();assert.match(await error.innerText(),/expirou/);
   assert.equal(page.url().includes('error='),false);assert.equal(page.url().includes('error_code='),false);assert.equal(await page.getByText('NAO_EXIBIR').count(),0);
   assert.equal(await page.locator('#app').evaluate(element=>element.inert),false);assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(folder,order+'.png')});checks.push({order,expiredMessage:true,errorURLCleaned:true,privateErrorDescriptionHidden:true,interfaceReleased:true,pageErrors:errors});await context.close();
  }
  await fs.writeFile(path.join(folder,'result.json'),JSON.stringify({controlledLocalTransport:true,remoteAccountsUsed:false,checks},null,2));
 }finally{await browser?.close();app.closeAllConnections();await new Promise(resolve=>app.close(resolve));}
});
