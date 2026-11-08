// Chrome renders the real application. Browser install events/OS identity are
// controlled here; these tests do not claim a physical Android/iOS installation.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const {server}=require('../scripts/serve.cjs');
const folder=path.resolve('test-results/modernization-20261030');
const android='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const ios='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
async function harness(options={}){
 const app=await server({config:{mode:'demo'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',...options}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',route=>route.abort());
  const origin='http://127.0.0.1:'+app.address().port;
  return {page,context,origin,errors,async open(route='home'){await page.goto(origin+'/?demo=1#'+route);await page.locator('main').waitFor();},async close(){await browser.close();app.closeAllConnections();await new Promise(r=>app.close(r));}};
 }catch(e){await browser?.close();app.closeAllConnections();await new Promise(r=>app.close(r));throw e;}
}
async function prompt(page,outcome='dismissed'){
 await page.evaluate(outcome=>{window.__installCalls=0;const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.__installCalls++;};event.userChoice=Promise.resolve({outcome});dispatchEvent(event);},outcome);
}

test('Instalação Android: convite dentro da home, prompt só após clique, dispensa persistente e appinstalled oculta o Perfil',async()=>{
 const h=await harness({userAgent:android});try{const {page}=h;await h.open();assert.equal(await page.locator('.nf-pwa-install').count(),0);await prompt(page);
  assert.equal(await page.evaluate(()=>window.__installCalls),0);assert.equal(await page.locator('.nf-pwa-install').evaluate(e=>getComputedStyle(e).position),'static');
  for(const theme of ['light','dark'])for(const width of [320,375,390,430,1365]){
   await page.setViewportSize({width,height:844});await page.evaluate(theme=>NortFoodTheme.set(theme),theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.ok((await page.locator('.nf-pwa-install-action').boundingBox()).height>=44);
  }
  await page.locator('.nf-pwa-install-action').click();assert.equal(await page.evaluate(()=>window.__installCalls),1);assert.equal(await page.locator('.nf-pwa-install').count(),0);
  await page.reload();await page.locator('main').waitFor();await prompt(page);assert.equal(await page.locator('.nf-pwa-install').count(),0);
  await page.locator('[data-nav="profile"]').click();await page.locator('.nf-profile').waitFor();const row=page.locator('.nf-profile [data-pwa-install]');assert.equal(await row.isVisible(),true);
  await row.click();assert.equal(await page.evaluate(()=>window.__installCalls),1);assert.equal(await page.locator('.nf-pwa-modal').count(),0);
  await prompt(page,'accepted');await row.click();assert.equal(await page.evaluate(()=>window.__installCalls),1);await page.evaluate(()=>dispatchEvent(new Event('appinstalled')));assert.equal(await row.isVisible(),false);
  await page.locator('[data-nav="home"]').click();assert.equal(await page.locator('.nf-pwa-install').count(),0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('iOS: Safari apresenta instruções acessíveis; outros navegadores orientam abrir o Safari e standalone não convida',async()=>{
 for(const [agent,safari]of [[ios,true],[ios.replace('Version/18.0','CriOS/130.0.0.0'),false]]){
  const h=await harness({userAgent:agent});try{const {page}=h;await h.open();assert.equal(await page.locator('.nf-pwa-install').count(),safari?1:0);
   await page.locator('[data-nav="profile"]').click();const row=page.locator('.nf-profile [data-pwa-install]');await row.click();
   assert.equal(await page.locator('[role="dialog"].nf-pwa-card').isVisible(),true);assert.match(await page.locator('.nf-pwa-card').innerText(),safari?/Compartilhar[\s\S]*Adicionar à Tela de Início/:/abra este site no Safari/);
   assert.equal(await page.locator('[data-pwa-close]').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Tab');assert.equal(await page.locator('[data-pwa-close]').evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press('Escape');assert.equal(await page.locator('.nf-pwa-modal').count(),0);assert.equal(await row.evaluate(e=>e===document.activeElement),true);
   await page.evaluate(()=>{Object.defineProperty(navigator,'standalone',{value:true});NortFoodPWA.sync();});assert.equal(await row.isVisible(),false);assert.deepEqual(h.errors,[]);
  }finally{await h.close();}
 }
});

test('Navegador sem prompt: Perfil oferece instruções e não afirma que o app foi instalado',async()=>{
 const h=await harness();try{const {page}=h;await h.open('profile');const row=page.locator('.nf-profile [data-pwa-install]');assert.match(await row.innerText(),/Tenha o NortFood na tela inicial do seu celular/);await row.click();assert.match(await page.locator('.nf-pwa-card').innerText(),/Chrome ou Edge/);
  await fs.mkdir(folder,{recursive:true});for(const width of [320,375,390,430,1365]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const bounds=await page.locator('.nf-pwa-card').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);}
  await page.screenshot({path:path.join(folder,'pwa-install-instructions-desktop.png')});assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('Ícones PNG: dimensões, fundo transparente, símbolo do PNG oficial e margem maskable dentro do círculo seguro',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage(),manifest=JSON.parse(await fs.readFile('site.webmanifest','utf8')),checks=[];
  for(const icon of manifest.icons){assert.equal(icon.type,'image/png');assert.match(icon.src,/[a-f0-9]{12}\.png$/);const bytes=await fs.readFile('.'+icon.src),data='data:image/png;base64,'+bytes.toString('base64');
   const result=await page.evaluate(async data=>{const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,image.width,image.height).data;let red=0,maxRadius=0,opaque=true;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const p=(y*image.width+x)*4;opaque&&=rgba[p+3]===255;if(rgba[p+3]>16){red++;maxRadius=Math.max(maxRadius,Math.hypot(x+.5-image.width/2,y+.5-image.height/2)/image.width);}}return {width:image.width,height:image.height,corner:[...rgba.slice(0,4)],red,opaque,maxRadius};},data);
   assert.equal(result.width,Number(icon.sizes.split('x')[0]));assert.equal(result.height,result.width);assert.deepEqual(result.corner,[0,0,0,0]);assert.equal(result.opaque,false);assert.ok(result.red>result.width*result.height*.03);if(icon.purpose==='maskable')assert.ok(result.maxRadius<=.4);checks.push({icon:icon.src,purpose:icon.purpose,...result});
  }
  await fs.mkdir(folder,{recursive:true});await fs.writeFile(path.join(folder,'app-icons.json'),JSON.stringify({checks,source:JSON.parse(await fs.readFile('docs/APP_ICON_SOURCE.json','utf8'))},null,2));
 }finally{await browser.close();}
});
