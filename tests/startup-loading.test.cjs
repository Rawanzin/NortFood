const {test}=require('node:test'),assert=require('node:assert/strict'),esbuild=require('esbuild'),{chromium}=require('playwright');
const {server}=require('../scripts/serve.cjs');
test('Public shell loads before remote catalog; initial controls wait for identity and catalog errors offer retry',async()=>{
  const code=(await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,format:'iife',external:['./pdf-export.js'],plugins:[{name:'held-catalog',setup(build){build.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'sdk',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createClient=()=>window.__fixture'}));}}]})).outputFiles[0].text;
  const app=await server({config:{supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
    let releaseBackend;const backendGate=new Promise(resolve=>releaseBackend=resolve);
    await page.route('**/assets/nortfood-backend.js',async route=>{await backendGate;await route.fulfill({contentType:'text/javascript',body:code})});
    await page.addInitScript(()=>{
      let release;const gate=new Promise(resolve=>release=resolve);window.__release=release;let failed=true;
      const channel={on(){return this},subscribe(){return this}};
      window.__fixture={auth:{onAuthStateChange(){},getUser:async()=>({data:{user:null}})},channel:()=>channel,removeChannel(){},from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),rpc:async name=>{
        if(name==='nf_catalog'){await gate;if(failed){failed=false;return {error:{message:'offline'}}}return {data:[],error:null};}
        return {data:false,error:null};
      }};
    });
    await page.goto('http://127.0.0.1:'+app.address().port,{waitUntil:'domcontentloaded'});await page.locator('.hero-slide img').waitFor();
    assert.match(await page.locator('main').innerText(),/Carregando estabelecimentos/);assert.equal(await page.locator('#app').evaluate(element=>element.inert),true);
    releaseBackend();
    await page.evaluate(()=>window.__release());await page.locator('[data-retry-catalog]').waitFor();
    assert.equal(await page.locator('#app').evaluate(element=>element.inert),false);assert.match(await page.locator('.empty').innerText(),/Não foi possível carregar/);
    await page.locator('[data-retry-catalog]').click();await page.waitForFunction(()=>document.querySelector('.empty')?.textContent.includes('Nenhuma loja disponível'));
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();await new Promise(r=>app.close(r));}
});

test('Backend script failure releases controls and retry reloads the connection instead of leaving a dead button',async()=>{
 const app=await server({config:{supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({serviceWorkers:'block'});let attempts=0;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/nortfood-backend.js',route=>{attempts++;return route.abort('failed')});
  await page.goto('http://127.0.0.1:'+app.address().port);
  await page.locator('[data-retry-catalog]').waitFor();assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);assert.match(await page.locator('.empty').innerText(),/Não foi possível carregar/);
  await Promise.all([page.waitForNavigation(),page.locator('[data-retry-catalog]').click()]);await page.locator('[data-retry-catalog]').waitFor();assert.equal(attempts,2);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
