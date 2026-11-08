const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),vm=require('node:vm'),esbuild=require('esbuild');
async function load(file){const code=(await esbuild.build({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'})).outputFiles[0].text,scope={module:{exports:{}},exports:{},URL,Intl,Date};vm.runInNewContext(code,scope);return scope.module.exports;}
const clone=value=>JSON.parse(JSON.stringify(value));
const storeId='10000000-0000-4000-8000-000000000001',productId='20000000-0000-4000-8000-000000000001',groupId='30000000-0000-4000-8000-000000000001',optionId='40000000-0000-4000-8000-000000000001',orderId='50000000-0000-4000-8000-000000000001';
function fixture(){
 const product={id:productId,name:'Lanche sintético',price_cents:2000,available:true,archived:false,ingredients:['Cebola','Queijo'],groups:[{id:groupId,name:'Adicionais',min_choices:0,max_choices:1,options:[{id:optionId,name:'Bacon',price_cents:350}]}]};
 const item={product_id:productId,name:'Lanche anterior',quantity:2,unit_price_cents:1900,options_cents:300,total_cents:4400,options:[{option_id:optionId,name:'Bacon anterior',price_cents:300}],removed_ingredients:['Cebola'],notes:'Bem passado'};
 const order={id:orderId,store:storeId,storeName:'Loja sintética de teste',backendStatus:'delivered',created:Date.parse('2026-10-29T14:30:00Z'),items:[{name:item.name,qty:2,extras:[{name:'Bacon anterior'}]}],raw:{id:orderId,store_id:storeId,status:'delivered',subtotal_cents:4400,delivery_cents:500,total_cents:4900,items:[item],notes:'Confirmar na próxima compra'}};
 const stores=[{id:storeId,name:'Loja sintética de teste',logo:'/assets/logo-test.svg',status:'approved',paused:false,serverOpen:true,products:[[product.name,'',20,'','Lanches','',true,[],'',product.id,product.groups,product]]}];
 return {order,stores,cart:[]};
}

test('Pedir novamente usa UUIDs e preços atuais; é proposta pura e exige confirmação para trocar o carrinho',async()=>{
 const {planReorder}=await load('src/application/reorder.js'),data=fixture();data.cart=[{pid:'item-do-carrinho-atual',qty:1}];const before=clone(data),plan=planReorder(data);
 assert.equal(plan.ok,true);assert.equal(plan.subtotalCents,4700);assert.equal(plan.previousSubtotalCents,4400);assert.equal(plan.priceChanged,true);assert.equal(plan.requiresCartReplacement,true);assert.equal(plan.requiresConfirmation,true);
 assert.equal(plan.rows[0].pid,productId);assert.equal(plan.rows[0].qty,2);assert.equal(plan.rows[0].extras[0].id,optionId);assert.equal(plan.rows[0].extras[0].name,'Bacon');assert.equal(plan.rows[0].extras[0].price,3.5);assert.deepEqual(Array.from(plan.rows[0].removedIngredients),['Cebola']);assert.equal(plan.rows[0].note,'Bem passado');assert.equal(plan.rows[0].table_token,null);
 assert.equal(plan.lines[0].name,'Lanche sintético');assert.equal(plan.lines[0].totalCents,4700);assert.equal(plan.lines[0].options[0].priceCents,350);
 assert.equal(plan.payment,undefined);assert.equal(plan.address,undefined);assert.deepEqual(data,before);assert.match(plan.warnings.join(' '),/substituídos somente se você confirmar/);
});

test('Pedir novamente falha fechado para loja não publicada/fechada/pausada, pedido em andamento e contexto de mesa',async()=>{
 const {planReorder}=await load('src/application/reorder.js');
 for(const patch of [{status:'draft'},{status:'pending'},{status:'suspended'},{paused:true},{paused:undefined},{serverOpen:false},{serverOpen:undefined}]){const data=fixture();Object.assign(data.stores[0],patch);assert.equal(planReorder(data).ok,false,JSON.stringify(patch));}
 for(const status of ['pending','accepted','preparing','ready','out_for_delivery']){const data=fixture();data.order.raw.status=status;data.order.backendStatus=status;assert.equal(planReorder(data).ok,false,status);}
 assert.equal(planReorder({...fixture(),currentTableToken:'60000000-0000-4000-8000-000000000001'}).ok,false);
 const data=fixture();data.order.raw.id='outro-pedido';assert.equal(planReorder(data).ok,false);
});

test('Pedir novamente não substitui adicionais por nome; respeita estoque, restrições, remoções e limites atuais',async()=>{
 const {planReorder}=await load('src/application/reorder.js');
 const invalid=[data=>{data.stores[0].products[0][11].available=false},data=>{data.stores[0].products[0][11].sale_restriction='price_confirmation'},data=>{data.stores[0].products[0][11].archived=true},data=>{data.order.raw.items[0].product_id='99999999-0000-4000-8000-000000000001'},data=>{data.stores[0].products[0][11].groups[0].options[0].id='99999999-0000-4000-8000-000000000002'},data=>{data.stores[0].products[0][11].groups[0].min_choices=1;data.order.raw.items[0].options=[]},data=>{data.stores[0].products[0][11].ingredients=['Queijo']},data=>{data.order.raw.items[0].quantity=21},data=>{data.order.raw.items[0].quantity=1.5},data=>{data.order.raw.items[0].options.push(clone(data.order.raw.items[0].options[0]))},data=>{data.order.raw.items[0].removed_ingredients=['Cebola','Cebola']},data=>{data.stores[0].products[0][11].price_cents=-1}];
 for(const mutate of invalid){const data=fixture();mutate(data);const plan=planReorder(data);assert.equal(plan.ok,false);assert.equal(plan.rows.length,0);}
});

test('Pedir novamente informa itens omitidos e nunca monta carrinho vazio ou acima do limite do servidor',async()=>{
 const {planReorder}=await load('src/application/reorder.js'),data=fixture();data.order.raw.items.push({...clone(data.order.raw.items[0]),product_id:'99999999-0000-4000-8000-000000000001',name:'Item indisponível'});
 const plan=planReorder(data);assert.equal(plan.ok,true);assert.equal(plan.rows.length,1);assert.equal(plan.itemsChanged,true);assert.match(plan.warnings.join(' '),/Item indisponível/);
 const over=fixture();over.order.raw.items[0].quantity=20;over.stores[0].products[0][11].price_cents=1000000;assert.equal(planReorder(over).ok,false);
 const tooMany=fixture();tooMany.order.raw.items=Array.from({length:41},()=>clone(tooMany.order.raw.items[0]));assert.equal(planReorder(tooMany).ok,false);
});

test('Meus pedidos separa andamento/histórico e renderiza somente os snapshots e ações válidas',async()=>{
 const {renderOrdersPage,orderStatus,canReorder}=await load('assets/orders-ui.js'),data=fixture();
 const pending=clone(data.order);pending.id='50000000-0000-4000-8000-000000000002';pending.backendStatus='pending';pending.raw.status='pending';
 const html=renderOrdersPage({orders:[data.order,pending],stores:data.stores});assert.match(html,/Meus pedidos/);assert.match(html,/Em andamento/);assert.match(html,/Histórico/);assert.match(html,/Aguardando confirmação/);assert.match(html,/49,00/);assert.match(html,/Bacon anterior/);assert.match(html,/data-order-detail=/);assert.equal((html.match(/data-reorder-order=/g)||[]).length,1);
 assert.equal(orderStatus(data.order).completed,true);assert.equal(canReorder(pending,data.stores),false);data.stores[0].paused=true;assert.equal(canReorder(data.order,data.stores),false);
 const attack=clone(data.order);attack.storeName='<img src=x onerror=alert(1)>';attack.items[0].name='<script>alert(1)</script>';const escaped=renderOrdersPage({orders:[attack],stores:[]});assert.ok(!escaped.includes('<script>'));assert.ok(escaped.includes('&lt;script&gt;'));assert.ok(!escaped.includes('src=x onerror=alert(1)>'));
 const empty=renderOrdersPage();assert.match(empty,/Você ainda não fez nenhum pedido\./);assert.match(empty,/Explorar lojas/);assert.match(empty,/<svg/);assert.ok(!empty.includes('data-reorder-order'));
});

test('Meus pedidos funciona de 320 a 1440px nos temas claro/escuro, sem overflow ou ação fora da tela',async()=>{
 const {chromium}=require('playwright'),{renderOrdersPage}=await load('assets/orders-ui.js'),data=fixture(),browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage(),css=await fs.readFile('assets/orders.css','utf8'),theme=await fs.readFile('theme.css','utf8');
  const base=await fs.readFile('styles.css','utf8')+await fs.readFile('refinements.css','utf8');data.stores[0].logo='';
  for(const mode of ['light','dark'])for(const width of [320,360,375,390,430,768,1024,1440])for(const orders of [[],[data.order]]){
   await page.setViewportSize({width,height:900});await page.setContent('<!doctype html><html data-theme="'+mode+'"><head><style>'+base+theme+css+'</style></head><body>'+renderOrdersPage({orders,stores:data.stores})+'</body></html>');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,mode+' '+width);
   const buttons=await page.locator('.nf-orders-page button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height,right:r.right,left:r.left}}));
   assert.ok(buttons.every(rect=>rect.height>=44&&rect.left>=0&&rect.right<=width),mode+' '+width+' buttons');
  }
  await fs.mkdir('test-results/ux-20261029',{recursive:true});await page.setViewportSize({width:390,height:844});await page.setContent('<html data-theme="light"><style>'+base+theme+css+'</style>'+renderOrdersPage()+'</html>');await page.screenshot({path:'test-results/ux-20261029/orders-empty-mobile.png',fullPage:true});
  await page.setContent('<html data-theme="light"><style>'+base+theme+css+'</style>'+renderOrdersPage({orders:[data.order],stores:data.stores})+'</html>');await page.screenshot({path:'test-results/ux-20261029/orders-history-mobile.png',fullPage:true});
 }finally{await browser.close()}
});
