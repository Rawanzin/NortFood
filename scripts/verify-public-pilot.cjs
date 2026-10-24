// Verificação somente de leitura: não cria contas, lojas, pedidos ou mensagens.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const labels=['Todos','Hambúrgueres','Pizzas','Açaí','Doces','Salgados','Sorvetes','Marmitas','Bebidas','Padarias','Mercados','Outros'];
async function main(){
 const origin=new URL(process.argv[2]||'https://nortfood.netlify.app');
 if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||!/^([a-z0-9]+--)?nortfood\.netlify\.app$/.test(origin.hostname))throw Error('OFFICIAL_SITE_OR_ITS_DEPLOY_REQUIRED');
 const folder=path.resolve('test-results/public-pilot-20261023',origin.hostname==='nortfood.netlify.app'?'official':'preview');await fs.mkdir(folder,{recursive:true});
 const get=async url=>{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,url);return response;};
 const configText=await (await get(new URL('/config.js',origin))).text(),config=JSON.parse(configText.match(/Object\.freeze\((\{.*\})\)/)[1]);
 assert.equal(config.publicAccounts,true);assert.notEqual(config.publicPreview,true);assert.equal(config.supabaseUrl,'https://zwkhqahivthzivmuirjr.supabase.co');
 const headers={apikey:config.publishableKey},read=async route=>{const r=await fetch(config.supabaseUrl+route,{headers});assert.equal(r.status,200);return r.json();};
 const [settings,categories,pilot,release]=await Promise.all([read('/auth/v1/settings'),read('/rest/v1/categories?select=id,name&active=eq.true'),read('/rest/v1/rpc/nf_operating_status'),get(new URL('/release.json',origin)).then(r=>r.json())]);
 for(const name of labels.slice(1))assert.ok(categories.some(c=>c.name===name),'Missing real base category '+name);
 const report={checkedAt:new Date().toISOString(),origin:origin.origin,release,publicAccountsUI:'APROVADO',customerSignup:settings.disable_signup?'PENDENTE: Supabase signup disabled':'PENDENTE: needs real confirmation email and session proof',commercialOrders:pilot?'Requires authenticated acceptance evidence':'BLOQUEADO no servidor',checks:[],errors:[]};
 let browser;try{
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'dark'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(origin.href);await page.waitForFunction(()=>document.querySelector('#app')&&!document.querySelector('#app').inert);await page.locator('.category').last().waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('NortFood em preparação'));assert.deepEqual(await page.locator('.category').evaluateAll(rows=>rows.map(row=>row.innerText)),labels);
  for(const width of [320,360,375,390,412,430,768,1365])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:844});if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
   assert.equal(await page.locator('html').getAttribute('data-theme'),theme);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator('.header .brand-logo').evaluate(img=>img.decode());assert.ok((await page.locator('.header .brand-logo').getAttribute('src')).includes('logo-'+theme));
   assert.equal(await page.locator('.header .brand-logo').evaluate(img=>getComputedStyle(img).filter),'none');
   report.checks.push({width,theme,overflow:false,logo:true,categories:12});
   if(width===390||width===1365)await page.screenshot({path:path.join(folder,'home-'+theme+'-'+width+'.png')});
  }
  for(const label of labels){await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.locator('.category.active').innerText(),label);}
  await page.locator('[data-action=auth]').first().click();await page.locator('#auth-form').waitFor();assert.equal(await page.locator('#auth-confirm-password,#auth-name').count(),2);assert.equal(await page.locator('#auth-password').getAttribute('minlength'),'8');
  assert.equal(await page.locator('[data-role=customer]').innerText(),'Pedir');await page.locator('[data-role=seller]').click();assert.equal(await page.locator('[data-role=seller]').innerText(),'Vender');assert.equal(await page.locator('#auth-store-name,#auth-phone').count(),2);
  await page.setViewportSize({width:320,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(settings.disable_signup)await page.waitForFunction(()=>document.querySelector('#auth-form [role=status]')?.textContent.includes('Novos cadastros aguardam'));
  await page.screenshot({path:path.join(folder,'seller-signup-320.png'),animations:'disabled'});
  await page.locator('[data-auth-mode=login]').click();await page.locator('[data-action=recover-password]').click();await page.locator('#recover-form').waitFor();assert.equal(await page.locator('#recover-form [type=email]').count(),1);
  await page.locator('[data-action=close-modal]').first().click();
  const beforeMap=page.url();let mapTiles=0;page.on('response',response=>{if(response.url().startsWith('https://tile.openstreetmap.org/')&&response.status()===200)mapTiles++;});await page.locator('[data-nearby-map]').click();await page.locator('[data-nearby-canvas].leaflet-container').waitFor();assert.equal(page.url(),beforeMap);assert.equal(context.pages().length,1);await page.locator('[data-nearby-empty]').waitFor();await page.locator('[data-nearby-canvas] img.leaflet-tile-loaded').first().waitFor({timeout:20000});await page.locator('#nearby-query').fill('Porteirinha, MG');await page.locator('[data-nearby-search] button').click();await page.locator('[data-nearby-results] button').first().waitFor({timeout:20000});assert.match(await page.locator('[data-nearby-results] button').first().innerText(),/Porteirinha/);await page.locator('[data-nearby-results] button').first().click();await page.waitForFunction(()=>{const images=[...document.querySelectorAll('[data-nearby-canvas] img.leaflet-tile')].filter(image=>/\/16\//.test(image.src));return images.length>=4&&images.every(image=>image.classList.contains('leaflet-tile-loaded'));},{},{timeout:20000});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(folder,'map-mobile-public.png')});report.map={modal:true,sameURL:true,newTabs:0,manualSearch:'APROVADO — Nominatim HTTPS real',physicalGPS:'NÃO TESTADO',tilesHTTP200:mapTiles};await page.keyboard.press('Escape');assert.equal(await page.locator('.nearby-modal').count(),0);
  const manifest=await (await get(new URL('/manifest.webmanifest',origin))).json();
  for(const icon of manifest.icons.filter(i=>i.purpose==='maskable')){
   const pixels=await page.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let red=0;for(let i=0;i<data.length;i+=4)if(data[i]>150&&data[i+1]<100&&data[i+2]<130)red++;return {corner:[...data.slice(0,4)],red,width:canvas.width};},new URL(icon.src,origin).href);
   assert.deepEqual(pixels.corner,[255,255,255,255]);assert.ok(pixels.red>pixels.width*pixels.width*.1);report.checks.push({maskable:icon.sizes,whiteBackground:true,officialRedSymbol:true});
  }
  await page.evaluate(()=>navigator.serviceWorker.ready);report.serviceWorker='Registrado em HTTPS; atualização e isolamento de cache cobertos pela suíte de navegador';report.physicalAndroid='NÃO TESTADO';
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{await browser?.close();await fs.writeFile(path.join(folder,'browser.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify({origin:origin.origin,release:release.release,passed:report.passed,checks:report.checks.length,auth:report.customerSignup,orders:report.commercialOrders,errors:report.errors}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
