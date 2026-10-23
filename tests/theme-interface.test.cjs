const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const {server}=require('../scripts/serve.cjs');
test('Official logo follows system and selected theme at all supported widths, including 404',async()=>{
 const app=await server({config:{mode:'demo'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({colorScheme:'dark',viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const url='http://127.0.0.1:'+app.address().port;await page.goto(url+'/?demo=1');await page.locator('.header').waitFor();
  for(const theme of ['dark','light']){await page.emulateMedia({colorScheme:theme});await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);for(const width of [320,360,375,390,412,430,768,1365]){
   await page.setViewportSize({width,height:844});assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   for(const logo of await page.locator('[data-brand-logo]').all()){
    await logo.evaluate(img=>img.decode());assert.equal(await logo.evaluate(img=>img.complete&&img.naturalWidth>0&&!img.hidden),true);assert.match(await logo.getAttribute('src'),new RegExp('logo-'+theme+'\\.webp$'));assert.equal(await logo.evaluate(e=>getComputedStyle(e).filter),'none');
   }
  }}
  await page.getByRole('button',{name:'Usar tema escuro'}).click();await page.reload();await page.locator('.header').waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.equal(await page.evaluate(()=>localStorage.getItem('nortfood-theme')),'dark');
  await fs.mkdir(path.resolve('test-results/visual-pilot-20261023'),{recursive:true});
  for(const theme of ['dark','light']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
   for(const width of [320,390,1365]){await page.setViewportSize({width,height:844});await page.screenshot({path:path.resolve('test-results/visual-pilot-20261023/'+theme+'-'+width+'.png')});}
  }
  await page.goto(url+'/pagina-inexistente');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.match(await page.locator('h1').innerText(),/disponível/);
  await page.emulateMedia({colorScheme:'dark'});assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
test('Theme switch preserves typed credentials, cart and navigation without re-rendering forms',async()=>{
 const app=await server({config:{mode:'demo'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({colorScheme:'light',viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+app.address().port+'/?demo=1');await page.locator('.header').waitFor();await page.locator('[data-action="auth"]').first().click();
  await page.locator('#auth-email').fill('regressao-local@example.test');await page.locator('#auth-password').fill('somente-regressao-local');
  await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');assert.equal(await page.locator('#auth-email').inputValue(),'regressao-local@example.test');assert.equal(await page.locator('#auth-password').inputValue(),'somente-regressao-local');
  assert.match(await page.locator('.modal [data-brand-logo]').getAttribute('src'),/logo-dark\.webp$/);assert.equal(await page.locator('#auth-email').evaluate(e=>getComputedStyle(e).colorScheme),'dark only');await page.keyboard.press('Escape');
  await page.locator('[data-action="cart"]').first().click();assert.equal(await page.locator('.drawer').isVisible(),true);await page.emulateMedia({colorScheme:'light'});assert.equal(await page.locator('.drawer').isVisible(),true);
  await page.locator('.drawer [data-action="close-cart"]').click();assert.equal(await page.locator('.drawer').count(),0);await page.getByRole('tab',{name:'Buscar',exact:true}).click();assert.match(await page.locator('h1').innerText(),/Buscar/);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
