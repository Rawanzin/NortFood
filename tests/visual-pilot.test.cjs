const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),esbuild=require('esbuild');
const {server}=require('../scripts/serve.cjs');
test('Four original 2:1 banners keep every pixel visible; controls stay outside artwork on mobile and desktop',async()=>{
 const app=await server({config:{mode:'demo'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+app.address().port+'/?demo=1');await page.locator('.hero-slide img').waitFor();await page.locator('[data-pause-banner]').click();
  for(const width of [320,360,375,390,412,430,768,1365]){
   await page.setViewportSize({width,height:844});
   for(let i=0;i<4;i++){
    await page.locator('[data-banner="'+i+'"]').click();await page.waitForFunction(i=>document.querySelector('.banner-carousel')?.dataset.slide===String(i),i);
    await page.locator('.hero-slide img').evaluate(img=>img.decode());
    const d=await page.locator('.hero-slide img').evaluate(img=>({natural:img.naturalWidth/img.naturalHeight,rendered:img.clientWidth/img.clientHeight,fit:getComputedStyle(img).objectFit,bottom:img.getBoundingClientRect().bottom}));
    assert.equal(d.natural,2);assert.ok(Math.abs(d.rendered-2)<.02);assert.equal(d.fit,'contain');assert.ok((await page.locator('.banner-controls').boundingBox()).y>=d.bottom-1);
    assert.equal(await page.locator('[data-banner="'+i+'"]').getAttribute('aria-current'),'true');
   }
   const banner=await page.locator('.banner-carousel').boundingBox(),section=await page.locator('.category-section').boundingBox();assert.ok(section.y-(banner.y+banner.height)<75);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.locator('[data-banner="2"]').click();await page.waitForFunction(()=>document.querySelector('.banner-carousel')?.dataset.slide==='2');await page.locator('.hero-slide').click();assert.match(await page.locator('#explore h2').innerText(),/Restaurantes/);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
test('Commercial categories use backend rows, preserve selection and filter store; empty database is explicit',async()=>{
 const code=(await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,format:'iife',external:['./pdf-export.js'],plugins:[{name:'synthetic-sdk',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'sdk',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createClient=()=>window.__fixture'}));}}]})).outputFiles[0].text;
 const app=await server({config:{supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture',publicPreview:true}});await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({serviceWorkers:'block',viewport:{width:320,height:844}});
  await page.route('**/assets/nortfood-backend.js',r=>r.fulfill({contentType:'text/javascript',body:code}));
  await page.addInitScript(()=>{
   const categories=[{id:'cat-a',name:'Lanches'},{id:'cat-b',name:'Saudável'},...Array.from({length:6},(_,i)=>({id:'cat-'+i,name:'Categoria de teste '+i}))];
   window.__fixture={auth:{onAuthStateChange(){},getUser:async()=>({data:{user:null}})},from:()=>({select:()=>({eq:async()=>({data:categories})})}),rpc:async name=>({data:name==='nf_catalog'?[{id:'store-a',name:'Loja sintética',status:'approved',opens_at:'11:00',closes_at:'22:00',categories:[{id:'cat-a',name:'Lanches'}],products:[],zones:[],payment_methods:['cash']}]:false})};
  });
  await page.goto('http://127.0.0.1:'+app.address().port);await page.locator('[data-cat="cat-a"]').waitFor();
  assert.equal(await page.locator('.categories .category').count(),19);assert.equal(await page.locator('.categories .category').first().innerText(),'Todos');assert.equal(await page.locator('.category-scroll.has-more').count(),1);
  await page.locator('[data-cat="cat-a"]').click();assert.equal(await page.locator('[data-cat="cat-a"]').getAttribute('class'),'category active');assert.equal(await page.locator('.store-card').count(),1);
  await page.locator('[data-cat="cat-b"]').click();assert.equal(await page.locator('.store-card').count(),0);assert.equal(await page.locator('[data-discovery-category]').inputValue(),'cat-b');
  const empty=await browser.newPage({serviceWorkers:'block'});await empty.route('**/assets/nortfood-backend.js',r=>r.fulfill({contentType:'text/javascript',body:code}));
  await empty.addInitScript(()=>{window.__fixture={auth:{onAuthStateChange(){},getUser:async()=>({data:{user:null}})},from:()=>({select:()=>({eq:async()=>({data:[]})})}),rpc:async name=>({data:name==='nf_catalog'?[]:false})}});
  await empty.goto('http://127.0.0.1:'+app.address().port);await empty.locator('[data-cat=all]').waitFor();assert.equal(await empty.locator('.categories .category').count(),12);await empty.locator('.category').filter({hasText:'Marmitas'}).click();assert.equal(await empty.locator('.store-card').count(),0);assert.match(await empty.locator('.empty').innerText(),/Ainda não há lojas disponíveis em Marmitas/);assert.equal(await empty.locator('.category.active').innerText(),'Marmitas');
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
