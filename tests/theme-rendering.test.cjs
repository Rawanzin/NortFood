const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{chromium}=require('playwright');
const {server}=require('../scripts/serve.cjs'),{assertPalette}=require('./theme-palette.cjs');
let magick;
async function imageReader(){if(!magick){magick=await import('@imagemagick/magick-wasm');await magick.initializeImageMagick(await fs.readFile(require.resolve('@imagemagick/magick-wasm/magick.wasm')));}return magick;}
async function paintedCorner(bytes){const m=await imageReader();return m.ImageMagick.read(bytes,im=>im.getPixels(p=>Array.from(p.getPixel(0,180))));}

for(const system of ['dark','light'])test('Painted themes follow selection with system '+system+(system==='dark'?' and Chrome Auto Dark':''),async()=>{
 const app=await server({config:{mode:'demo'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:system==='dark'?['--enable-features=WebContentsForceDark']:[]});
  const context=await browser.newContext({colorScheme:system,viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Control proves this browser actually applies automatic darkening to ordinary light pages.
  await page.setContent('<body style="margin:0;background:white;color:black;min-height:844px">Auto Dark control</body>');const control=(await paintedCorner(await page.screenshot()))[0];assert.ok(system==='dark'?control<100:control>235);
  const origin='http://127.0.0.1:'+app.address().port;await page.goto(origin+'/?demo=1');await page.locator('.header').waitFor();
  for(const theme of ['light','dark','light','dark','light']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
   await assertPalette(page,theme);
   assert.equal(await page.locator('.category.active .cat-icon').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
   const card=await page.locator('.category.active').evaluate(e=>getComputedStyle(e).backgroundColor);assert.equal(card,theme==='dark'?'rgb(59, 36, 42)':'rgb(255, 244, 244)');
   await page.locator('[data-brand-logo]').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
   for(const logo of await page.locator('[data-brand-logo]').all()){assert.ok((await logo.getAttribute('src')).endsWith('logo-'+theme+'.webp'));assert.equal(await logo.evaluate(e=>getComputedStyle(e).filter),'none');}
   const pixel=await paintedCorner(await page.screenshot());assert.ok(theme==='light'?pixel[0]>235:pixel[0]<60,'Painted pixels must match selected '+theme);
   assert.equal(await page.locator('meta[name="color-scheme"]').getAttribute('content'),'only '+theme);
   await page.screenshot({path:path.resolve('test-results/theme-final-20261023/'+system+'-system-'+theme+'.png')});
  }
  await page.reload();await page.locator('.header').waitFor();await assertPalette(page,'light');
  const reopened=await context.newPage();await reopened.goto(origin+'/?demo=1');await reopened.locator('.header').waitFor();await assertPalette(reopened,'light');assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});

test('Official category sources and optimized images retain real alpha, without a rectangular matte',async()=>{
 const m=await imageReader();
 for(const file of ['assets/categories/categoria-todos.png',...['todos','acai','lanches','pizza','doces','salgados','sorvetes','refeicoes','bebidas'].map(name=>'assets/optimized/categoria-'+name+'.webp')]){
  m.ImageMagick.read(await fs.readFile(file),image=>image.getPixels(p=>{
   const rgba=p.toByteArray(0,0,image.width,image.height,'RGBA');let transparent=0,visible=0;
   for(let i=3;i<rgba.length;i+=4){if(rgba[i]===0)transparent++;if(rgba[i]>200)visible++;}
   assert.equal(rgba[3],0);assert.ok(transparent>image.width*image.height*.1);assert.ok(visible>image.width*image.height*.1);
  }));
 }
});

test('Versioned theme URLs change with content and point to exact bytes, including 404',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'nortfood-theme-'));
 try{
  await fs.writeFile(path.join(root,'theme.js'),'one');await fs.writeFile(path.join(root,'theme.css'),'body{color:red}');
  const {themeAssets}=require('../scripts/theme-assets.cjs'),one=await themeAssets(root),html=one.render('<script src="theme.js"></script><link href="/theme.css">');
  assert.match(html,/\/assets\/theme\/theme-[a-f0-9]{16}\.js/);assert.ok(html.includes(one.urls.css));assert.equal(await fs.readFile(path.join(root,one.urls.js),'utf8'),'one');
  await fs.writeFile(path.join(root,'theme.js'),'two');const two=await themeAssets(root);assert.notEqual(two.urls.js,one.urls.js);assert.equal(two.urls.css,one.urls.css);
 }finally{
  if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(root).startsWith('nortfood-theme-'))throw Error('Unsafe test cleanup');
  await fs.rm(root,{recursive:true,force:true});
 }
});

test('Authentication form preserves entered data while both themes update modal, labels and input colors',async()=>{
 const app=await server({config:{mode:'demo'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:'+app.address().port+'/?demo=1');await page.locator('[data-action=auth]').first().click();
  await page.locator('#auth-email').fill('synthetic-theme@example.test');await page.locator('#auth-password').fill('only-local-fixture');
  for(const theme of ['dark','light']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.evaluate(()=>document.querySelector('[data-theme-toggle]').click());
   await assertPalette(page,theme);assert.equal(await page.locator('#auth-email').inputValue(),'synthetic-theme@example.test');assert.equal(await page.locator('#auth-password').inputValue(),'only-local-fixture');
   const heading=await page.locator('.auth-intro h2').evaluate(e=>getComputedStyle(e).color);assert.equal(heading,theme==='dark'?'rgb(243, 243, 244)':'rgb(37, 39, 43)');
   await page.screenshot({path:path.resolve('test-results/theme-final-20261023/auth-'+theme+'.png')});
  }
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
