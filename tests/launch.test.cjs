const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const esbuild=require('esbuild');
async function moduleFor(file){const result=await esbuild.build({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'});const context={module:{exports:{}},exports:{},console};vm.runInNewContext(result.outputFiles[0].text,context);return context.module.exports;}

test('WhatsApp uses persisted cents and approved store, without address or notes in URL',async()=>{
 const {orderWhatsApp,officialWhatsApp}=await moduleFor('src/application/whatsapp.js');
 const store={id:'store-a',status:'approved',name:'Loja autorizada',whatsapp:'(38) 99999-9999'};
 const order={id:'order-a',total:0.01,payment:'Dinheiro ao receber',address:'Rua privada, 10',notes:'Observação pessoal',raw:{id:'order-a',store_id:'store-a',total_cents:3450,fulfillment:'delivery',items:[{quantity:2,name:'Lanche',options:[{name:'Queijo'}],notes:'Nota particular'}]}};
 const summary=orderWhatsApp(order,store),url=new URL(summary.url),message=url.searchParams.get('text');
 assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/5538999999999');assert.match(message,/34,50/);assert.match(message,/2× Lanche/);assert.match(message,/Queijo/);
 for(const secret of [order.address,order.notes,'Nota particular'])assert.ok(!message.includes(secret));
 assert.match(orderWhatsApp(order,store,{privateDetails:true}).message,/Rua privada/);
 assert.equal(orderWhatsApp(order,{...store,id:'other'}),null);assert.equal(orderWhatsApp(order,{...store,status:'pending'}),null);assert.equal(orderWhatsApp({...order,raw:null},store),null);
 for(const phone of ['', '111', 'javascript:alert(1)', '5511000000000'])assert.equal(officialWhatsApp({...store,whatsapp:phone}),null);
 assert.equal(officialWhatsApp({...store,whatsapp:'+55 38 3333-4444'}),'553833334444');
});

test('Realtime lifecycle has no guest channel; identity changes, hidden tabs and disposal release resources',async()=>{
 const {createLiveUpdates}=await moduleFor('src/platform/live-updates.js');
 const events=()=>({listeners:new Map(),addEventListener(k,f){this.listeners.set(k,f)},removeEventListener(k){this.listeners.delete(k)}});
 const document={...events(),visibilityState:'visible'},window=events(),navigator={onLine:true},timers=new Map();let seq=0,user=null,created=0,removed=0;
 const client={channel(){created++;return {on(){return this},subscribe(){}}},removeChannel(){removed++;return Promise.resolve()}};
 const live=createLiveUpdates({client,getUser:()=>user,notify:()=>Promise.resolve(),document,window,navigator,setInterval:(fn,ms)=>{timers.set(++seq,ms);return seq},clearInterval:id=>timers.delete(id)});
 live.start();live.start();assert.equal(created,0);assert.deepEqual([...timers.values()],[60000]);
 user={id:'a'};live.identityChanged();assert.equal(created,1);assert.deepEqual([...timers.values()],[20000]);
 user={id:'b'};live.identityChanged();assert.equal(removed,1);assert.equal(timers.size,1);
 document.visibilityState='hidden';document.listeners.get('visibilitychange')();assert.equal(removed,2);assert.equal(timers.size,0);
 document.visibilityState='visible';document.listeners.get('visibilitychange')();assert.equal(created,3);
 user=null;live.identityChanged();assert.equal(removed,3);assert.equal(timers.size,1);
 live.stop();assert.equal(timers.size,0);assert.equal(window.listeners.size,0);assert.equal(document.listeners.size,0);
});

test('PWA cancellation is remembered and incompatible iOS browser does not receive install banner',async()=>{
 const {chromium}=require('playwright'),http=require('node:http');
 const code=fs.readFileSync('pwa.js');
 const app=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/pwa.js'?'text/javascript':'text/html');res.end(req.url==='/pwa.js'?code:'<!doctype html><script defer src="/pwa.js"></script><h1>NortFood</h1>')});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+app.address().port);
  await page.evaluate(()=>{const e=new Event('beforeinstallprompt');e.prompt=async()=>{};e.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(e)});
  await page.locator('.nf-pwa-install-action').click();await page.locator('.nf-pwa-install').waitFor({state:'detached'});
  await page.reload();await page.evaluate(()=>window.dispatchEvent(new Event('beforeinstallprompt')));assert.equal(await page.locator('.nf-pwa-install').count(),0);
  const ios=await browser.newContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile Safari/604.1'}),p=await ios.newPage();await p.goto('http://127.0.0.1:'+app.address().port);assert.equal(await p.locator('.nf-pwa-install').count(),0);
 }finally{await browser?.close();await new Promise(r=>app.close(r));}
});
