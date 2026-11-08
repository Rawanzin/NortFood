// SDK Supabase real e Chrome; HTTP Auth totalmente controlado, sem e-mail real.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http'),esbuild=require('esbuild'),{chromium}=require('playwright');

test('SDK real valida callback no servidor e rejeita token forjado/sessão antiga', {timeout:60000}, async()=>{
 const code=(await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,format:'iife',external:['./pdf-export.js']})).outputFiles[0].text;
 const now=new Date().toISOString(),id=crypto.randomUUID(),email='confirmation-controlled@example.test',tokens=new Map(),calls=[];
 const user={id,aud:'authenticated',role:'authenticated',email,email_confirmed_at:now,confirmed_at:now,created_at:now,updated_at:now,app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[]};
 function session(accepted=true){const exp=Math.floor(Date.now()/1000)+3600,head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',email,exp,iat:exp-3600,session_id:crypto.randomUUID()})).toString('base64url');const token=head+'.'+body+'.'+Buffer.from(crypto.randomUUID()).toString('base64url'),value={access_token:token,refresh_token:crypto.randomUUID(),expires_in:3600,expires_at:exp,token_type:'bearer',user};if(accepted)tokens.set(token,value);return value;}
 const app=http.createServer((request,response)=>{if(request.url.startsWith('/backend.js')){response.writeHead(200,{'Content-Type':'text/javascript'});return response.end(code);}response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end('<!doctype html><html><head><script>window.NORTFOOD_CONFIG={supabaseUrl:"https://fixture.supabase.co",publishableKey:"sb_publishable_controlled"}</script><script src="/backend.js"></script></head><body><p>Callback controlado</p><script>window.__ready=window.NortFoodBackend.initialize(async()=>{}).then(()=>true,()=>false)</script></body></html>');});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+app.address().port;let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  async function pageFor(fragment,{old}={}){
   const context=await browser.newContext({serviceWorkers:'block'});await context.routeWebSocket(/wss:\/\/fixture\.supabase\.co\//,socket=>socket.close());
   if(old)await context.addInitScript(session=>localStorage.setItem('sb-fixture-auth-token',JSON.stringify(session)),old);
   await context.route('https://fixture.supabase.co/**',route=>{
    const request=route.request(),url=new URL(request.url()),token=(request.headers().authorization||'').replace(/^Bearer /,'');
    const reply=(body,status=200)=>route.fulfill({status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(body)});
    if(request.method()==='OPTIONS')return reply({});
    if(url.pathname==='/auth/v1/user'){calls.push(tokens.has(token)?'accepted':'rejected');return tokens.has(token)?reply(user):reply({code:401,error_code:'bad_jwt',msg:'Invalid session'},401);}
    return reply({});
   });
   const page=await context.newPage();await page.goto(origin+'/'+fragment);await page.evaluate(()=>window.__ready);return {page,context};
  }
  const callback=value=>'#'+new URLSearchParams({access_token:value.access_token,refresh_token:value.refresh_token,expires_in:'3600',token_type:'bearer',type:'signup'});
  const valid=session(),positive=await pageFor(callback(valid));
  const result=await positive.page.evaluate(()=>window.NortFoodBackend.confirmationResult());assert.deepEqual(result,{status:'verified',serverVerified:true});assert.ok(calls.filter(value=>value==='accepted').length>=2);assert.equal(positive.page.url().includes('access_token='),false);await positive.context.close();
  const old=session(),forged=session(false),negative=await pageFor(callback(forged),{old});const rejected=await negative.page.evaluate(()=>window.NortFoodBackend.confirmationResult());assert.deepEqual(rejected,{status:'invalid',serverVerified:false});assert.ok(calls.includes('rejected'));await negative.context.close();
  const fresh=session(),mismatch=await pageFor(callback(fresh));await mismatch.page.evaluate(async old=>{const {error}=await window.NortFoodBackend.client.auth.setSession(old);if(error)throw Error('Failed controlled session switch')},old);assert.deepEqual(await mismatch.page.evaluate(()=>window.NortFoodBackend.confirmationResult()),{status:'invalid',serverVerified:false});await mismatch.context.close();
  const expired=await pageFor('#error=access_denied&error_code=otp_expired&error_description=NAO_EXIBIR');assert.deepEqual(await expired.page.evaluate(()=>window.NortFoodBackend.confirmationResult()),{status:'expired',serverVerified:false});await expired.context.close();
 }finally{await browser?.close();app.closeAllConnections();await new Promise(resolve=>app.close(resolve));}
});
