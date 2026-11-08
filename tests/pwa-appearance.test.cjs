// These tests exercise Chrome's real renderer, not native Android system UI.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const {server}=require('../scripts/serve.cjs');
const folder=path.resolve('test-results/etapa10-20261031/pwa');

test('PWA appearance: white startup, official red icons and theme hints persist without a red flash',async()=>{
 const app=await server({config:{mode:'demo'}});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));let browser;
 try{
  await fs.mkdir(folder,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  const origin='http://127.0.0.1:'+app.address().port;
  const manifest=await fetch(origin+'/site.webmanifest').then(r=>r.json());
  assert.equal(manifest.background_color,'#ffffff');assert.equal(manifest.theme_color,'#ffffff');
  // No JavaScript can repaint the startup in this context. This verifies the
  // source HTML/CSS before theme/bootstrap, not an OS-generated splash screen.
  const startup=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),first=await startup.newPage();
  await first.goto(origin);assert.equal(await first.locator('meta[name="theme-color"]').getAttribute('content'),'#ffffff');
  assert.equal(await first.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  await first.screenshot({path:path.join(folder,'before-javascript-mobile.png')});await startup.close();

  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[],checks=[];
  page.on('pageerror',error=>errors.push(error.message));await page.route('https://**/*',route=>route.abort());
  await page.goto(origin+'/?demo=1');await page.locator('.header').waitFor();
  for(const theme of ['dark','light']){
   await page.evaluate(theme=>NortFoodTheme.set(theme),theme);
   const expected=theme==='dark'?'#000000':'#ffffff';
   assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),expected);
   assert.equal(await page.locator('meta[name="color-scheme"]').getAttribute('content'),'only '+theme);
   assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).backgroundColor),theme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)');
   for(const width of [320,390,430,1365]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(folder,'theme-'+theme+'-mobile.png')});
   await page.reload();await page.locator('.header').waitFor();assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),expected);
   const other=await context.newPage();await other.goto(origin+'/?demo=1');await other.locator('.header').waitFor();assert.equal(await other.locator('meta[name="theme-color"]').getAttribute('content'),expected);await other.close();
   checks.push({theme,themeColor:expected,persistedAfterReload:true,newTab:true,responsiveWidths:[320,390,430,1365]});
  }
  // 404 and offline documents use the same saved preference.
  await page.evaluate(()=>NortFoodTheme.set('dark'));
  for(const route of ['/404.html','/offline.html']){await page.goto(origin+route);assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#000000');}
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(folder,'appearance.json'),JSON.stringify({manifest:{background:manifest.background_color,theme:manifest.theme_color,icons:manifest.icons},checks,errors,nativeAndroidSplashVerified:false,nativeAndroidNavigationVerified:false,notes:'Chrome desktop rendering; native Android verification remains required after publication/update or reinstall.'},null,2));
 }finally{await browser?.close();app.closeAllConnections();await new Promise(resolve=>app.close(resolve));}
});
