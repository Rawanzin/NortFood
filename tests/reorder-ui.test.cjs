// Real application/controller/planner in Chrome; only Supabase transport is synthetic.
// Every external HTTPS request is blocked. No remote Auth, order or payment is sent.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),esbuild=require('esbuild'),{chromium}=require('playwright'),{server}=require('../scripts/serve.cjs');
const ids={owner:'10000000-0000-4000-8000-000000000001',other:'10000000-0000-4000-8000-000000000002',store:'20000000-0000-4000-8000-000000000001',product:'30000000-0000-4000-8000-000000000001',cartProduct:'30000000-0000-4000-8000-000000000002',group:'40000000-0000-4000-8000-000000000001',option:'50000000-0000-4000-8000-000000000001',done:'60000000-0000-4000-8000-000000000001',active:'60000000-0000-4000-8000-000000000002',address:'70000000-0000-4000-8000-000000000001'};
let bundle;
async function fixtureCode(){
 if(!bundle)bundle=(await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,format:'iife'})).outputFiles[0].text;
 return bundle+`;{
  const ids=${JSON.stringify(ids)},api=window.NortFoodBackend;
  const store={id:ids.store,name:'Loja sintética de pedidos',description:'Somente integração controlada',status:'approved',is_open:true,paused:false,street:'Rua sintética da loja',number:'1',neighborhood:'Centro',city:'Porteirinha',state:'MG',opens_at:'00:00',closes_at:'23:59',working_days:[0,1,2,3,4,5,6],pickup_enabled:true,delivery_enabled:true,payment_methods:['cash'],minimum_cents:0,categories:[],zones:[{id:'80000000-0000-4000-8000-000000000001',neighborhood:'Centro',city:'Porteirinha',state:'MG',fee_cents:500,active:true}],products:[
   {id:ids.product,name:'Lanche atual controlado',description:'Produto sintético',category:'Lanches',price_cents:2000,available:true,archived:false,ingredients:['Cebola','Queijo'],groups:[{id:ids.group,name:'Adicionais',min_choices:0,max_choices:1,options:[{id:ids.option,name:'Bacon atual',price_cents:350}]}]},
   {id:ids.cartProduct,name:'Item anterior do carrinho',description:'Outro produto sintético',category:'Lanches',price_cents:1000,available:true,archived:false,ingredients:[],groups:[]}
  ]};
  const address={id:ids.address,user_id:ids.owner,label:'Casa sintética',street:'Rua sintética do cliente',number:'9',neighborhood:'Centro',city:'Porteirinha',state:'MG',is_primary:true,reference:'Portão de teste'};
  const order={id:ids.done,store_id:ids.store,store_name:store.name,customer_id:ids.owner,customer_name:'Cliente controlado A',customer_phone:'38999999999',fulfillment:'delivery',status:'delivered',version:5,payment_method:'cash',address_snapshot:address,notes:'Observação geral controlada',subtotal_cents:4400,delivery_cents:500,total_cents:4900,created_at:'2026-10-29T11:30:00Z',completed_at:'2026-10-29T12:15:00Z',items:[{id:'90000000-0000-4000-8000-000000000001',product_id:ids.product,name:'Lanche do snapshot',quantity:2,unit_price_cents:1900,options_cents:300,total_cents:4400,notes:'Bem passado controlado',removed_ingredients:['Cebola'],options:[{option_id:ids.option,name:'Bacon do snapshot',price_cents:300}]}],events:[{status:'pending',created_at:'2026-10-29T11:30:00Z'},{status:'delivered',created_at:'2026-10-29T12:15:00Z'}]};
  const active=structuredClone(order);active.id=ids.active;active.status='pending';active.version=0;active.completed_at=null;active.created_at='2026-10-29T14:30:00Z';active.events=[{status:'pending',created_at:active.created_at}];
  const state=window.__reorderFixture={ids,owner:ids.owner,revision:0,store,order,active,addresses:[address],rpcCalls:[],placeCalls:0,loadCalls:0,saveCalls:0,pauseNextLoad:false,loadPaused:false};
  api.configured=true;api.initialize=async()=>{};api.sessionRevision=()=>state.revision;
  api.context=async()=>({profile:{id:state.owner,name:state.owner===ids.owner?'Cliente controlado A':'Cliente controlado B',phone:'38999999999',notifications_enabled:true,terms_accepted_at:'2026-10-29T10:00:00Z'},user:{id:state.owner,email:state.owner===ids.owner?'cliente-a@example.test':'cliente-b@example.test',email_confirmed_at:'2026-10-29T10:00:00Z'},memberships:[],onboarding:{seller:true,customer:true},is_admin:false});
  api.load=async()=>{const owner=state.owner;state.loadCalls++;if(state.pauseNextLoad){state.pauseNextLoad=false;state.loadPaused=true;await new Promise(resolve=>{window.__releaseReorderLoad=resolve});state.loadPaused=false;}
   return structuredClone({catalog:[store],categories:[],snapshot:{addresses:owner===ids.owner?state.addresses:[],orders:owner===ids.owner?[state.order,state.active]:[],notifications:[],conversations:[],reviews:[],favorites:[],ledger:[],settlements:[]},pilotEnabled:false,storeDrafts:[],storeSetups:[]});};
  api.rpc=async(name,args)=>{state.rpcCalls.push({name,args});if(name==='nf_place_order')throw Error('NO_ORDER_WRITE_ALLOWED');if(name==='nf_order_detail')return state.owner===ids.owner?[state.order,state.active].find(row=>row.id===args.p_order)||null:null;return name==='nf_claim_store_invitation'?0:[];};
  api.place=async()=>{state.placeCalls++;throw Error('NO_ORDER_WRITE_ALLOWED')};api.image=async path=>path;api.avatarImage=async()=>'';api.confirmationResult=async()=>null;
  const controller=api.controller;
  api.controller=(bridge,adapter)=>{const save=bridge.saveCart;bridge.saveCart=(...args)=>{state.saveCalls++;return save(...args)};window.__reorderBridge=bridge;return window.__reorderController=controller(bridge,adapter);};
 }`;
}
async function harness(){
 const app=await server({config:{mode:'commercial',publicAccounts:true}});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());const code=await fixtureCode();await page.route('**/assets/nortfood-backend.js',route=>route.fulfill({contentType:'text/javascript',body:code}));
  await page.goto('http://127.0.0.1:'+app.address().port+'/#home');await page.waitForFunction(()=>window.__reorderBridge?.data().current?.id===window.__reorderFixture?.ids.owner);
  return {page,errors,close:async()=>{await browser.close();app.closeAllConnections();await new Promise(resolve=>app.close(resolve))}};
 }catch(error){await browser?.close();app.closeAllConnections();await new Promise(resolve=>app.close(resolve));throw error;}
}
const cart=page=>page.evaluate(()=>structuredClone(window.__reorderBridge.data().cart));
async function openOrders(page){await page.locator('[data-nav="orders"]').click();await page.locator('.nf-orders-page').waitFor();}
async function noOrderWrites(page){assert.equal(await page.evaluate(()=>window.__reorderFixture.placeCalls),0);assert.equal(await page.evaluate(()=>window.__reorderFixture.rpcCalls.filter(call=>call.name==='nf_place_order').length),0);}

test('Pedidos na aplicação: histórico/detalhes corretos, notas do snapshot e atualização de status por refresh controlado',async()=>{
 const h=await harness();try{const {page}=h;await openOrders(page);assert.equal(await page.locator('.nf-order-card').count(),2);assert.equal(await page.locator('.nf-orders-section').count(),2);assert.match(await page.locator('main').innerText(),/Lanche do snapshot/);assert.ok(!(await page.locator('main').innerText()).includes('Rua sintética do cliente'));
  await page.locator('[data-order-detail="'+ids.active+'"]').click();await page.locator('.order-detail').waitFor();assert.match(await page.locator('main').innerText(),/Aguardando confirmação/);assert.match(await page.locator('main').innerText(),/Bem passado controlado/);assert.match(await page.locator('main').innerText(),/Sem Cebola/);assert.equal(await page.locator('.nf-profile-menu').count(),0);assert.ok(!(await page.locator('main').innerText()).includes('Solicitar exclusão da conta'));
  await page.evaluate(async()=>{const state=window.__reorderFixture;state.active.status='preparing';state.active.version=2;state.active.events.push({status:'preparing',created_at:'2026-10-29T14:40:00Z'});await window.__reorderController.refresh('DATABASE_CHANGE')});assert.match(await page.locator('.order-detail h2').first().innerText(),/Em preparação/);
  await fs.mkdir('test-results/ux-20261029',{recursive:true});await page.screenshot({path:'test-results/ux-20261029/orders-details-controlled.png',fullPage:true});assert.deepEqual(await cart(page),[]);await noOrderWrites(page);assert.deepEqual(h.errors,[]);
 }finally{await h.close()}
});

test('Pedir novamente na aplicação: revisa notas/adicionais e preço atual, mudança exige segunda confirmação antes do carrinho',async()=>{
 const h=await harness();try{const {page}=h;await openOrders(page);await page.locator('[data-reorder-order="'+ids.done+'"]').click();await page.locator('[data-confirm-reorder]').waitFor();
  assert.match(await page.locator('.modal').innerText(),/Lanche atual controlado/);assert.match(await page.locator('.modal').innerText(),/Bacon atual/);assert.match(await page.locator('.modal').innerText(),/Bem passado controlado/);assert.match(await page.locator('.modal').innerText(),/Cebola/);assert.match(await page.locator('.modal').innerText(),/47,00/);assert.deepEqual(await cart(page),[]);await noOrderWrites(page);
  await page.evaluate(()=>{window.__reorderFixture.store.products[0].price_cents=2500});await page.locator('[data-confirm-reorder]').click();await page.waitForFunction(()=>document.querySelector('.modal')?.textContent.includes('57,00'));assert.deepEqual(await cart(page),[]);assert.equal(await page.locator('.drawer').count(),0);
  await fs.mkdir('test-results/ux-20261029',{recursive:true});await page.screenshot({path:'test-results/ux-20261029/reorder-proposal-controlled.png',fullPage:true});await page.locator('[data-confirm-reorder]').click();await page.locator('.drawer').waitFor();const rows=await cart(page);assert.equal(rows.length,1);assert.equal(rows[0].pid,ids.product);assert.equal(rows[0].qty,2);assert.equal(rows[0].extras[0].id,ids.option);assert.equal(rows[0].extras[0].price,3.5);assert.deepEqual(rows[0].removedIngredients,['Cebola']);assert.equal(rows[0].note,'Bem passado controlado');assert.match(await page.locator('#cartbody').innerText(),/Lanche atual controlado/);assert.match(await page.locator('#cartfoot').innerText(),/57,00/);await noOrderWrites(page);assert.deepEqual(h.errors,[]);
 }finally{await h.close()}
});

test('Pedir novamente na aplicação: carrinho existente só é substituído após aceite explícito',async()=>{
 const h=await harness();try{const {page}=h;await page.evaluate(()=>{const d=window.__reorderBridge.data();d.cart=[{pid:window.__reorderFixture.ids.cartProduct,qty:1,extras:[],note:'Carrinho atual preservado',removedIngredients:[],variantKey:'current'}];window.__reorderBridge.saveCart()});const before=await cart(page);await openOrders(page);await page.locator('[data-reorder-order="'+ids.done+'"]').click();await page.locator('[data-confirm-cart-replace]').waitFor();assert.deepEqual(await cart(page),before);
  await page.locator('[data-confirm-reorder]').click();await page.waitForFunction(()=>document.getElementById('toast')?.textContent.includes('Confirme a substituição'));assert.deepEqual(await cart(page),before);assert.equal(await page.locator('.drawer').count(),0);
  await page.locator('[data-confirm-cart-replace]').check();await page.locator('[data-confirm-reorder]').click();await page.locator('.drawer').waitFor();const rows=await cart(page);assert.equal(rows.length,1);assert.equal(rows[0].pid,ids.product);assert.equal(rows[0].qty,2);assert.ok(!rows.some(row=>row.pid===ids.cartProduct));await noOrderWrites(page);assert.deepEqual(h.errors,[]);
 }finally{await h.close()}
});

test('Pedir novamente na aplicação: troca de identidade durante conferência conserva o carrinho da nova conta',async()=>{
 const h=await harness();try{const {page}=h;await page.evaluate(()=>{const f=window.__reorderFixture,d=window.__reorderBridge.data();d.cartAccounts[f.ids.other]=[{pid:f.ids.cartProduct,qty:3,extras:[],note:'Carrinho exclusivo B',removedIngredients:[],variantKey:'account-b'}]});await openOrders(page);await page.locator('[data-reorder-order="'+ids.done+'"]').click();await page.locator('[data-confirm-reorder]').waitFor();await page.evaluate(()=>{window.__reorderFixture.pauseNextLoad=true});await page.locator('[data-confirm-reorder]').click();await page.waitForFunction(()=>window.__reorderFixture.loadPaused);
  await page.evaluate(async()=>{const f=window.__reorderFixture;f.owner=f.ids.other;f.revision++;const changed=window.__reorderController.refresh('SIGNED_IN');window.__releaseReorderLoad();await changed});await page.waitForFunction(()=>window.__reorderBridge.data().current?.id===window.__reorderFixture.ids.other);const rows=await cart(page);assert.equal(rows.length,1);assert.equal(rows[0].pid,ids.cartProduct);assert.equal(rows[0].qty,3);assert.equal(rows[0].note,'Carrinho exclusivo B');assert.equal(await page.locator('.drawer').count(),0);assert.equal(await page.locator('[data-confirm-reorder]').count(),0);await noOrderWrites(page);assert.deepEqual(h.errors,[]);
 }finally{await h.close()}
});
