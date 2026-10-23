// Real browser/ServiceWorker/CacheStorage lifecycle; no page.route or SDK mocks.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
test('PWA browser: install, update notice, draft preservation, activated new release and truthful offline page',async()=>{
  let release='test-one',browser;
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
  const app=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/pwa.css"><script defer src="/pwa.js"></script><h1>'+release+'</h1><form><label>Rascunho<input name="draft"></label></form></html>');return;}
    if(url.pathname==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end('window.__release='+JSON.stringify(release));return;}
    try {
      const allowed=['/sw.js','/offline.html','/styles.css','/pwa.css','/pwa.js','/favicon.ico','/assets/icon-192.png'];
      if(!allowed.includes(url.pathname))throw Error();
      let content=await fs.readFile('.'+url.pathname);if(url.pathname==='/sw.js')content=Buffer.from(content.toString().replace('__NORTFOOD_RELEASE__',release));
      res.writeHead(200,{'Content-Type':types[path.extname(url.pathname)],'Cache-Control':'no-cache'});res.end(content);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(r=>app.listen(0,'127.0.0.1',r));
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
    const origin='http://127.0.0.1:'+app.address().port,folder=path.resolve('test-results/modernization-20261021');await fs.mkdir(folder,{recursive:true});
    await page.goto(origin);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await page.evaluate(()=>fetch('/config.js'));await page.locator('[name=draft]').fill('Rascunho preservado');
    release='test-two';await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update()});
    await page.locator('.nf-pwa-update').waitFor();assert.equal(await page.locator('.nf-pwa-update span').innerText(),'Uma nova versão do NortFood está pronta.');assert.equal(await page.locator('[name=draft]').inputValue(),'Rascunho preservado');
    await page.evaluate(()=>document.querySelector('form').setAttribute('aria-busy','true'));await page.locator('[data-apply-update]').click();
    assert.match(await page.locator('.nf-pwa-update small').innerText(),/Aguarde/);assert.equal(await page.locator('h1').innerText(),'test-one');
    await page.screenshot({path:path.join(folder,'pwa-update-mobile.png')});
    await page.evaluate(()=>document.querySelector('form').removeAttribute('aria-busy'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('[data-apply-update]').click()]);
    assert.equal(await page.locator('h1').innerText(),'test-two');
    const cached=await page.evaluate(async()=>{const names=await caches.keys();return {names,paths:(await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).map(request=>new URL(request.url).pathname)))).flat()}});
    assert.deepEqual(cached.names,['nortfood-public-test-two']);assert.equal(cached.paths.includes('/config.js'),false);assert.equal(cached.paths.includes('/'),false);
    await context.setOffline(true);await page.reload();assert.equal(await page.locator('h1').innerText(),'Você está sem conexão');assert.equal(await page.locator('#checkout-form').count(),0);
    await page.screenshot({path:path.join(folder,'pwa-offline-mobile.png')});
    await context.setOffline(false);await page.locator('a').click();assert.equal(await page.locator('h1').innerText(),'test-two');
  }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
