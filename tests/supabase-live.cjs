// Gate real: execute SOMENTE contra projeto de testes isolado já migrado.
const {createClient}=require('@supabase/supabase-js');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const url=process.env.NORTFOOD_TEST_SUPABASE_URL,key=process.env.NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY,publicKey=process.env.NORTFOOD_TEST_SUPABASE_PUBLISHABLE_KEY,adminEmail=process.env.NORTFOOD_TEST_ADMIN_EMAIL,adminPassword=process.env.NORTFOOD_TEST_ADMIN_PASSWORD;
if(!url||!key||!publicKey||!adminEmail||!adminPassword||process.env.NORTFOOD_TEST_CONFIRM_DISPOSABLE!=='yes'){console.error('NÃO EXECUTADO: configure projeto de testes isolado, três credenciais em variáveis locais e NORTFOOD_TEST_CONFIRM_DISPOSABLE=yes. Nunca usar produção.');process.exitCode=2;}
else (async()=>{
 let cleanupAdmin=null,cleanupStore=null;try{
 const root=createClient(url,key,{auth:{persistSession:false}}),suffix=randomUUID().slice(0,8),password=randomUUID()+randomUUID(),users=[];
 async function create(name){const email=`nortfood-${name}-${suffix}@example.test`;const r=await root.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name}});if(r.error)throw r.error;users.push(r.data.user.id);const c=createClient(url,publicKey,{auth:{persistSession:false}});const login=await c.auth.signInWithPassword({email,password});if(login.error)throw login.error;return c;}
 async function rpc(c,name,args){const r=await c.rpc(name,args);if(r.error)throw r.error;return r.data;}
 // O administrador é provisionado pelo SQL seguro antes do gate (sem cadastro público).
 const customer=await create('cliente'),seller=await create('loja'),stranger=await create('outro');
 const store=await rpc(seller,'nf_request_store',{p_name:'LOJA DE TESTE — NÃO PUBLICAR'});

 const admin=createClient(url,publicKey,{auth:{persistSession:false}});const logged=await admin.auth.signInWithPassword({email:adminEmail,password:adminPassword});if(logged.error)throw logged.error;
 assert.equal((await rpc(admin,'nf_context',{})).is_admin,true,'Administrador deve ser provisionado por SQL seguro antes deste teste.');cleanupAdmin=admin;cleanupStore=store;
 await rpc(admin,'nf_admin_pilot',{p_enabled:true,p_reason:'Gate exclusivo de testes isolados'});
 const category=await rpc(admin,'nf_admin_category',{p_id:null,p_name:'Teste '+suffix,p_active:true});
 await rpc(admin,'nf_admin_store',{p_store:store,p_status:'approved',p_reason:'Ambiente de teste isolado'});
 await rpc(seller,'nf_save_store',{p_id:store,p_data:{name:'TESTE '+suffix,description:'Nunca publicar',street:'Rua Teste',number:'1',neighborhood:'Centro',city:'Porteirinha',opens_at:'00:00',closes_at:'23:59',working_days:[0,1,2,3,4,5,6],pickup_enabled:true,delivery_enabled:true,minimum_cents:0,estimate_minutes:30,payment_methods:['cash'],delivery_info:'Entrega de teste'},p_categories:[category],p_zones:[{neighborhood:'Centro',city:'Porteirinha',fee_cents:499}]});
 const product=await rpc(seller,'nf_save_product',{p_store:store,p_id:null,p_data:{name:'Produto de teste',description:'Teste',price_cents:10000,category:'Teste',available:true},p_groups:[{name:'Opção',min_choices:1,max_choices:1,options:[{name:'Adicional',price_cents:100}]}]});
 await rpc(seller,'nf_set_store_open',{p_store:store,p_open:true,p_paused:false});
 const catalog=await rpc(customer,'nf_catalog',{}),option=catalog.find(s=>s.id===store).products.find(p=>p.id===product).groups[0].options[0].id;
 const address=await rpc(customer,'nf_save_address',{p_id:null,p_data:{label:'Teste',street:'Rua Cliente',number:'2',neighborhood:'Centro',city:'Porteirinha',state:'MG',is_primary:true}});
 const realtime=[];const customerChannel=customer.channel('live-gate-'+suffix).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},event=>realtime.push(event.new));
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Realtime não se conectou.')),15000);customerChannel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timeout);resolve()}})});
 const request={idempotency_key:randomUUID(),store_id:store,fulfillment:'delivery',address_id:address,payment_method:'cash',expected_total_cents:10599,items:[{product_id:product,quantity:1,option_ids:[option]}]};
 const order=await rpc(customer,'nf_place_order',{p_request:request});assert.equal(await rpc(customer,'nf_place_order',{p_request:request}),order);
 assert.ok((await rpc(seller,'nf_snapshot',{})).orders.some(o=>o.id===order));assert.equal((await stranger.from('orders').select('id').eq('id',order)).data.length,0);
 assert.ok((await stranger.rpc('nf_transition',{p_order:order,p_next:'delivered',p_version:0})).error);
 assert.ok((await seller.rpc('nf_admin_rate',{p_bps:2000,p_reason:'Fraude'})).error);
 for(const [version,status] of ['accepted','preparing','ready','out_for_delivery','delivered'].entries())await rpc(seller,'nf_transition',{p_order:order,p_next:status,p_version:version});
 const after=await rpc(customer,'nf_snapshot',{});assert.equal(after.orders.find(o=>o.id===order).status,'delivered');
 for(let i=0;i<30&&!realtime.some(e=>e.id===order&&e.status==='delivered');i++)await new Promise(r=>setTimeout(r,500));assert.ok(realtime.some(e=>e.id===order&&e.status==='delivered'),'Cliente deve receber mudança real via Realtime.');
 const ledger=(await rpc(admin,'nf_snapshot',{})).ledger.find(l=>l.order_id===order);assert.ok(ledger&&ledger.amount_cents===Math.round(10100*ledger.rate_bps/10000));
 const settlement=await rpc(admin,'nf_admin_settle',{p_order:order,p_amount:ledger.amount_cents,p_key:randomUUID(),p_reference:'TESTE '+suffix,p_reason:'Baixa simulada explícita em ambiente de teste'});assert.ok(settlement);
 const pickupRequest={...request,idempotency_key:randomUUID(),fulfillment:'pickup',address_id:null,expected_total_cents:10100};const pickup=await rpc(customer,'nf_place_order',{p_request:pickupRequest});for(const [version,status] of ['accepted','preparing','ready_for_pickup','picked_up'].entries())await rpc(seller,'nf_transition',{p_order:pickup,p_next:status,p_version:version});
 assert.equal((await rpc(customer,'nf_snapshot',{})).orders.find(o=>o.id===pickup).delivery_cents,0);
 for(const status of ['cancelled','rejected']){const id=await rpc(customer,'nf_place_order',{p_request:{...request,idempotency_key:randomUUID()}});await rpc(status==='cancelled'?customer:seller,'nf_transition',{p_order:id,p_next:status,p_version:0});assert.ok(!(await rpc(admin,'nf_snapshot',{})).ledger.some(l=>l.order_id===id));}
 await customer.auth.signOut();const email='nortfood-cliente-'+suffix+'@example.test';const newClient=createClient(url,publicKey,{auth:{persistSession:false}});await newClient.auth.signInWithPassword({email,password});assert.equal((await rpc(newClient,'nf_snapshot',{})).orders.find(o=>o.id===order).status,'delivered');
 await customer.removeChannel(customerChannel);await rpc(seller,'nf_set_store_open',{p_store:store,p_open:false,p_paused:true});await rpc(admin,'nf_admin_store',{p_store:store,p_status:'suspended',p_reason:'Teste concluído: não publicar a loja fictícia'});
 await rpc(admin,'nf_admin_pilot',{p_enabled:false,p_reason:'Gate de testes terminado. Não abrir pedidos reais.'});
 console.log('Gate de API real aprovado: Auth, RLS, pedido entre clientes independentes, Realtime, persistência, entrega, retirada, cancelamento, recusa e comissões. Validar ainda UI em dois navegadores, e-mail/recuperação, uploads e piloto físico. Dados de teste foram preservados e loja suspensa.');
 }finally{if(cleanupAdmin){const blocked=await cleanupAdmin.rpc('nf_admin_pilot',{p_enabled:false,p_reason:'Encerramento seguro do gate de testes'});const suspended=await cleanupAdmin.rpc('nf_admin_store',{p_store:cleanupStore,p_status:'suspended',p_reason:'Encerramento do teste: loja fictícia não publicável'});if(blocked.error||suspended.error)throw Error('Não foi possível bloquear o piloto/suspender a loja de teste. Verifique o painel administrativo antes de prosseguir.')}}
 // Não apagamos usuários vinculados a histórico comercial automaticamente.
})().catch(error=>{console.error('Gate falhou: '+error.message);process.exitCode=1});
