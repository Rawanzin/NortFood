// Chrome real contra HTTP local; todas solicitações externas são bloqueadas.
// O catálogo demonstrativo é sintético e não se conecta ao Supabase.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {chromium}=require('playwright'),{server}=require('../scripts/serve.cjs');
test('Etapa 10: XSS persistido simulado em loja/produto e busca não executa no Chrome',async()=>{
 const app=await server({config:{mode:'commercial'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',route=>route.abort());
  const origin='http://127.0.0.1:'+app.address().port,payload='<img id="security-xss" src=x onerror="window.__securityXss=1"><script>window.__securityXss=2</script>"\'&';
  await page.goto(origin+'/?demo=1#shop/brasa');await page.locator('.store-hero').waitFor();
  await page.evaluate(payload=>{
   const d=JSON.parse(localStorage.getItem('nortfood-v1')),s=d.stores.find(s=>s.id==='brasa');s.name=payload;s.about=payload;s.products[0][0]=payload;s.products[0][1]=payload;
   s.logo='javascript:window.__securityXss=3';s.cover='data:image/svg+xml,<svg onload="window.__securityXss=4"/>';
   localStorage.setItem('nortfood-v1',JSON.stringify(d));
  },payload);
  await page.reload();await page.locator('.store-hero').waitFor();
  assert.ok((await page.locator('.store-hero').innerText()).includes(payload));
  assert.equal(await page.locator('#security-xss,[onerror],[onload]').count(),0);assert.equal(await page.evaluate(()=>window.__securityXss),undefined);
  await page.locator('[data-product]').first().click();await page.locator('#product-options').waitFor();
  assert.ok((await page.locator('.modal').innerText()).includes(payload));assert.equal(await page.locator('#security-xss,[onerror],[onload]').count(),0);
  assert.equal(await page.evaluate(()=>window.__securityXss),undefined);
  await page.locator('[data-action="close-modal"]').first().click();await page.goto(origin+'/?demo=1#home');await page.locator('#search').waitFor();
  await page.locator('#search').fill(payload);await page.waitForTimeout(500);
  assert.equal(await page.locator('#search').inputValue(),payload);assert.equal(await page.locator('#security-xss,[onerror],[onload]').count(),0);
  assert.equal(await page.evaluate(()=>window.__securityXss),undefined);assert.deepEqual(errors,[]);
  const path=require('node:path'),dir=path.resolve(process.env.NORTFOOD_SECURITY_EVIDENCE||'test-results/etapa10-20261031/security');await fs.mkdir(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'xss-local-chrome.png'),fullPage:true});
 }finally{await browser?.close();app.closeAllConnections();await new Promise(r=>app.close(r))}
});
