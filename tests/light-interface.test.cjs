// Regressao local da reversao: navegador real, sem chamadas ao Supabase remoto.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const {server}=require('../scripts/serve.cjs');
test('Interface permanece clara com dispositivo escuro e preferencia antiga, sem recursos de alternancia',async()=>{
 for(const file of ['index.html','404.html','app.js'])assert.doesNotMatch(await fs.readFile(file,'utf8'),/NortFoodTheme|theme-bootstrap|theme\.css|data-theme-toggle/);
 const app=await server({config:{mode:'demo'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({colorScheme:'dark',viewport:{width:390,height:844}});
  await context.addInitScript(()=>localStorage.setItem('nortfood-theme','dark'));const page=await context.newPage(),errors=[],themeRequests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/theme(?:-bootstrap)?\.(?:js|css)/.test(r.url()))themeRequests.push(r.url());});
  const url='http://127.0.0.1:'+app.address().port;await page.goto(url);await page.locator('.header').waitFor();
  for(const device of ['dark','light']){await page.emulateMedia({colorScheme:device});for(const width of [320,360,390,430,768,1365]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.locator('[data-theme-toggle]').count(),0);assert.equal(await page.locator('.modal-theme-tools').count(),0);
   assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(251, 251, 250)');
   assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).colorScheme),'light');assert.equal(await page.locator('html').getAttribute('data-theme'),null);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.match(await page.locator('.header [data-brand-logo]').getAttribute('src'),/logo-light\.webp$/);
  }}
  await page.reload();await page.locator('.header').waitFor();assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(251, 251, 250)');
  assert.equal(await page.evaluate(()=>localStorage.getItem('nortfood-theme')),'dark','Preferencia antiga ignorada, sem apagar dados do navegador');
  for(const pathname of ['/404.html','/pagina-inexistente']){const response=await page.goto(url+pathname);assert.equal(response.status(),404);assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(251, 251, 250)');assert.match(await page.locator('h1').innerText(),/disponível/);}
  assert.deepEqual(themeRequests,[]);assert.deepEqual(errors,[]);
  await fs.mkdir(path.resolve('test-results/theme-revert'),{recursive:true});await page.goto(url);await page.locator('.header').waitFor();
  for(const width of [390,1365]){await page.setViewportSize({width,height:844});await page.screenshot({path:path.resolve('test-results/theme-revert/light-'+width+'.png')});}
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
test('Login, menus e carrinho preservam formulario e dados com aparencia original',async()=>{
 const app=await server({config:{mode:'demo'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({colorScheme:'dark',viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+app.address().port);await page.locator('.header').waitFor();
  await page.locator('[data-action="auth"]').first().click();await page.locator('#auth-email').fill('regressao-local@example.test');await page.locator('#auth-password').fill('somente-regressao-local');
  await page.emulateMedia({colorScheme:'light'});assert.equal(await page.locator('#auth-email').inputValue(),'regressao-local@example.test');assert.equal(await page.locator('#auth-password').inputValue(),'somente-regressao-local');assert.equal(await page.locator('.modal [data-theme-toggle]').count(),0);
  assert.equal(await page.locator('#auth-email').evaluate(e=>getComputedStyle(e).colorScheme),'light');await page.keyboard.press('Escape');
  await page.locator('[data-action="cart"]').first().click();assert.equal(await page.locator('.drawer').isVisible(),true);assert.equal(await page.locator('.drawer [data-theme-toggle]').count(),0);await page.locator('.drawer [data-action="close-cart"]').click();assert.equal(await page.locator('.drawer').count(),0);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
