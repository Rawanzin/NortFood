// Gate real: execute SOMENTE contra projeto de testes isolado já migrado.
const {createClient}=require('@supabase/supabase-js');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const url=process.env.NORTFOOD_TEST_SUPABASE_URL,key=process.env.NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY,publicKey=process.env.NORTFOOD_TEST_SUPABASE_PUBLISHABLE_KEY,adminEmail=process.env.NORTFOOD_TEST_ADMIN_EMAIL,adminPassword=process.env.NORTFOOD_TEST_ADMIN_PASSWORD;
const serviceFixtures=process.env.NORTFOOD_TEST_SERVICE_FIXTURES==='yes';
if(!url||!key||!publicKey||!serviceFixtures&&(!adminEmail||!adminPassword)||process.env.NORTFOOD_TEST_CONFIRM_DISPOSABLE!=='yes'){console.error('NÃO EXECUTADO: configure projeto de testes isolado e credenciais protegidas. Nunca usar produção.');process.exitCode=2;}
else (async()=>{
 let cleanupFixture=null;const clients=[];const makeClient=accessKey=>{const c=createClient(url,accessKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});clients.push(c);return c;};try{
 // Mesmo com confirmacao "yes", nunca cria fixtures no projeto principal.
 const {assertDisposableTarget,PRODUCTION_SUPABASE_URL}=require('../scripts/test-environment.cjs');
 assertDisposableTarget(url,process.env.NORTFOOD_PRODUCTION_SUPABASE_URL||PRODUCTION_SUPABASE_URL,process.env.NORTFOOD_TEST_CONFIRM_DISPOSABLE);
 if(serviceFixtures&&url!=='https://zrczgghucwsaxqnyaapk.supabase.co')throw Error('SERVICE_FIXTURES_ONLY_IN_CONFIRMED_HOMOLOGATION');
 const root=makeClient(key),suffix=randomUUID().slice(0,8),password=randomUUID()+randomUUID(),users=[];
 if(process.env.NORTFOOD_TEST_AUTH_TOKENS==='yes')await require('./helpers/auth-tokens-live.cjs').authTokens({root,makeClient,publicKey,url,suffix});
 async function create(name){const email=`nortfood-${name}-${suffix}@example.test`;const r=await root.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name,...(name==='outro'?{role:'admin'}:{})}});if(r.error)throw r.error;users.push(r.data.user.id);const c=makeClient(publicKey);const login=await c.auth.signInWithPassword({email,password});if(login.error)throw login.error;return c;}
 async function rpc(c,name,args){const r=await c.rpc(name,args);if(r.error)throw r.error;return r.data;}
 // O administrador é provisionado pelo SQL seguro antes do gate (sem cadastro público).
 const admin=serviceFixtures?null:makeClient(publicKey);if(admin){const logged=await admin.auth.signInWithPassword({email:adminEmail,password:adminPassword});if(logged.error)throw logged.error;assert.equal((await rpc(admin,'nf_context',{})).is_admin,true,'Administrador exclusivo de homologacao necessario.');}
 const pilot=enabled=>rpc(admin,'nf_admin_pilot',{p_enabled:enabled,p_reason:'Gate exclusivo de homologacao'});
 const review=(id,status)=>rpc(admin,'nf_admin_store',{p_store:id,p_status:status,p_reason:'Fixture exclusiva de homologacao'});
 const ledgerRows=()=>rpc(admin||seller,'nf_snapshot',{}).then(s=>s.ledger);
 const preflight=await fetch(url+'/functions/v1/upload-media',{method:'OPTIONS',headers:{Origin:process.env.NORTFOOD_TEST_APP_ORIGIN||'http://localhost:4174','Access-Control-Request-Method':'POST'},signal:AbortSignal.timeout(20000)});assert.equal(preflight.status,200,'Implante upload-media no ambiente de testes antes do gate.');
 const customer=await create('cliente'),seller=await create('loja'),stranger=await create('outro');
 assert.equal((await rpc(stranger,'nf_context',{})).is_admin,false,'Metadados nao podem promover uma conta a administradora');
 const store=await rpc(seller,'nf_request_store',{p_name:'LOJA DE TESTE — NÃO PUBLICAR'});

 let sqlFixture=null,category;
 if(serviceFixtures){category=randomUUID();sqlFixture=await require('./helpers/staging-sql-fixture.cjs').stagingFixture({url,store,users,category,suffix,rpc,customer});cleanupFixture=()=>sqlFixture.cleanup();}
 else{cleanupFixture=async()=>{await pilot(false);await review(store,'suspended');};await pilot(true);category=await rpc(admin,'nf_admin_category',{p_id:null,p_name:'Teste '+suffix,p_active:true});await review(store,'approved');}
 await rpc(seller,'nf_save_store',{p_id:store,p_data:{name:'TESTE '+suffix,description:'Nunca publicar',street:'Rua Teste',number:'1',neighborhood:'Centro',city:'Porteirinha',opens_at:'00:00',closes_at:'23:59',working_days:[0,1,2,3,4,5,6],pickup_enabled:true,delivery_enabled:true,minimum_cents:0,estimate_minutes:30,payment_methods:['cash'],delivery_info:'Entrega de teste'},p_categories:[category],p_zones:[{neighborhood:'Centro',city:'Porteirinha',fee_cents:499}]});
 const product=await rpc(seller,'nf_save_product',{p_store:store,p_id:null,p_data:{name:'Produto de teste',description:'Teste',price_cents:10000,category:'Teste',available:true},p_groups:[{name:'Opção',min_choices:1,max_choices:1,options:[{name:'Adicional',price_cents:100}]}]});
 await rpc(seller,'nf_set_store_open',{p_store:store,p_open:true,p_paused:false});
 const catalog=await rpc(customer,'nf_catalog',{}),option=catalog.find(s=>s.id===store).products.find(p=>p.id===product).groups[0].options[0].id;
 const address=await rpc(customer,'nf_save_address',{p_id:null,p_data:{label:'Teste',street:'Rua Cliente',number:'2',neighborhood:'Centro',city:'Porteirinha',state:'MG',is_primary:true}});
 await customer.realtime.setAuth((await customer.auth.getSession()).data.session.access_token);const channelStates=[];const realtime=[],liveMessages=[],liveNotifications=[];const customerChannel=customer.channel('live-gate-'+suffix).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},event=>realtime.push(event.new)).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},event=>liveMessages.push(event.new)).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},event=>liveNotifications.push(event.new));
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Realtime não se conectou.')),15000);customerChannel.subscribe((status,error)=>{channelStates.push({status,error:error?.message||null});if(status==='SUBSCRIBED'){clearTimeout(timeout);resolve()}})});
 const request={idempotency_key:randomUUID(),store_id:store,fulfillment:'delivery',address_id:address,payment_method:'cash',expected_total_cents:10599,items:[{product_id:product,quantity:1,option_ids:[option]}]};
 const tampered={...request,idempotency_key:randomUUID(),expected_total_cents:1,items:[{...request.items[0],unit_price_cents:1}]};const refusedPrice=await customer.rpc('nf_place_order',{p_request:tampered});assert.equal(refusedPrice.error?.message,'PRICE_CHANGED','Servidor deve recalcular o preco');
 assert.equal((await stranger.rpc('nf_place_order',{p_request:{...request,idempotency_key:randomUUID()}})).error?.message,'ADDRESS_FORBIDDEN','Endereco de outro cliente nao pode ser usado');
 const order=await rpc(customer,'nf_place_order',{p_request:request});assert.equal(await rpc(customer,'nf_place_order',{p_request:request}),order);
 assert.ok((await rpc(seller,'nf_snapshot',{})).orders.some(o=>o.id===order));assert.equal((await stranger.from('orders').select('id').eq('id',order)).data.length,0);
 assert.ok((await stranger.rpc('nf_transition',{p_order:order,p_next:'delivered',p_version:0})).error);
 assert.ok((await seller.rpc('nf_admin_rate',{p_bps:2000,p_reason:'Fraude'})).error);
 for(const [version,status] of ['accepted','preparing','ready','out_for_delivery'].entries())await rpc(seller,'nf_transition',{p_order:order,p_next:status,p_version:version});
 const concurrent=await Promise.all([1,2].map(()=>seller.rpc('nf_transition',{p_order:order,p_next:'delivered',p_version:4})));assert.ok(concurrent.some(r=>!r.error));assert.ok(concurrent.every(r=>!r.error||r.error.message==='ORDER_CONFLICT'));
 const after=await rpc(customer,'nf_snapshot',{});assert.equal(after.orders.find(o=>o.id===order).status,'delivered');
 for(let i=0;i<30&&!realtime.some(e=>e.id===order&&e.status==='delivered');i++)await new Promise(r=>setTimeout(r,500));if(!realtime.some(e=>e.id===order&&e.status==='delivered'))console.log('REALTIME_DIAGNOSTIC '+JSON.stringify({states:channelStates,received:realtime.filter(e=>e.id===order).map(e=>e.status),allEvents:realtime.length}));assert.ok(realtime.some(e=>e.id===order&&e.status==='delivered'),'Cliente deve receber mudança real via Realtime.');
 const ledger=(await ledgerRows()).find(l=>l.order_id===order);assert.ok(ledger&&ledger.amount_cents===Math.round(10100*ledger.rate_bps/10000));
 assert.equal((await ledgerRows()).filter(l=>l.order_id===order&&l.kind==='charge').length,1,'Conclusoes simultaneas nao duplicam cobranca');
 if(admin){const firstAmount=Math.max(1,Math.floor(ledger.amount_cents/2)),settlementRequest={p_order:order,p_amount:firstAmount,p_key:randomUUID(),p_reference:'TESTE '+suffix,p_reason:'Baixa parcial de teste isolado'},settlement=await rpc(admin,'nf_admin_settle',settlementRequest);assert.ok(settlement);assert.equal(await rpc(admin,'nf_admin_settle',settlementRequest),settlement,'Baixa deve ser idempotente');if(firstAmount<ledger.amount_cents)await rpc(admin,'nf_admin_settle',{...settlementRequest,p_key:randomUUID(),p_amount:ledger.amount_cents-firstAmount,p_reason:'Saldo final de teste'});await rpc(admin,'nf_admin_adjust',{p_order:order,p_amount:10,p_reason:'Ajuste positivo de teste'});await rpc(admin,'nf_admin_adjust',{p_order:order,p_amount:-10,p_reason:'Reversao compensatoria de teste'});assert.equal((await ledgerRows()).find(l=>l.id===ledger.id).due_at,ledger.due_at,'Quitacoes e ajustes preservam vencimento original');}else console.log('PENDENTE: RPC administrativa de quitacao nao testada; contas sem cargo administrativo.');
 const pickupRequest={...request,idempotency_key:randomUUID(),fulfillment:'pickup',address_id:null,expected_total_cents:10100};const pickup=await rpc(customer,'nf_place_order',{p_request:pickupRequest});for(const [version,status] of ['accepted','preparing','ready_for_pickup','picked_up'].entries())await rpc(seller,'nf_transition',{p_order:pickup,p_next:status,p_version:version});
 assert.equal((await rpc(customer,'nf_snapshot',{})).orders.find(o=>o.id===pickup).delivery_cents,0);
 for(const status of ['cancelled','rejected']){const id=await rpc(customer,'nf_place_order',{p_request:{...request,idempotency_key:randomUUID()}});await rpc(status==='cancelled'?customer:seller,'nf_transition',{p_order:id,p_next:status,p_version:0});assert.ok(!(await ledgerRows()).some(l=>l.order_id===id));}
 // Provas adicionais reais: chat, notificacoes autenticadas, Storage e relatorio.
 const conversation=await rpc(customer,'nf_chat',{p_store:store});const message=await rpc(customer,'nf_send_message',{p_conversation:conversation,p_body:'TESTE ISOLADO '+suffix,p_key:randomUUID()});
 assert.ok((await rpc(seller,'nf_snapshot',{})).conversations.find(c=>c.id===conversation).messages.some(m=>m.id===message));
 const reply=await rpc(seller,'nf_send_message',{p_conversation:conversation,p_body:'RESPOSTA DE TESTE '+suffix,p_key:randomUUID()});
 assert.ok((await stranger.rpc('nf_send_message',{p_conversation:conversation,p_body:'Tentativa sem vinculo',p_key:randomUUID()})).error);
 for(let i=0;i<30&&!liveMessages.some(m=>m.id===reply);i++)await new Promise(r=>setTimeout(r,500));assert.ok(liveMessages.some(m=>m.id===reply),'Mensagem deve chegar por postgres_changes autenticado.');
 assert.ok(liveNotifications.some(n=>n.order_id===order),'Notificacao real de pedido deve chegar ao cliente autenticado.');
 const competingStore=await rpc(stranger,'nf_request_store',{p_name:'CONCORRENTE DE TESTE '+suffix});
 if(sqlFixture)sqlFixture.stores.push(competingStore);
 assert.ok((await stranger.rpc('nf_save_product',{p_store:store,p_id:product,p_data:{name:'Alteracao indevida',price_cents:1},p_groups:[]})).error);
 const original=(await rpc(customer,'nf_order_detail',{p_order:order})).items[0].unit_price_cents;
 await rpc(seller,'nf_save_product',{p_store:store,p_id:product,p_data:{name:'Produto editado no teste',price_cents:12000,category:'Teste',available:true},p_groups:[]});
 assert.equal((await rpc(customer,'nf_order_detail',{p_order:order})).items[0].unit_price_cents,original);
 const bytes=await require('./helpers/upload-fixture.cjs').uploadFixture();
 const uploadForm=()=>{const f=new FormData();f.append('store_id',store);f.append('file',new File([bytes],'homologacao.png',{type:'image/png'}));return f;};
 const origin=process.env.NORTFOOD_TEST_APP_ORIGIN||'http://localhost:4174';const uploaded=await seller.functions.invoke('upload-media',{body:uploadForm(),headers:{Origin:origin}});assert.ifError(uploaded.error);assert.ok(uploaded.data.path.startsWith(store+'/'));
 const signed=await customer.storage.from('store-media').createSignedUrl(uploaded.data.path,60);assert.ifError(signed.error);const image=await fetch(signed.data.signedUrl);assert.equal(image.status,200);assert.ok((await image.arrayBuffer()).byteLength>0);
 const unauthorizedUpload=await stranger.functions.invoke('upload-media',{body:uploadForm(),headers:{Origin:origin}});assert.ok(unauthorizedUpload.error);assert.equal(unauthorizedUpload.error.context.status,403);
 assert.ok((await customer.storage.from('store-media').upload(store+'/'+randomUUID()+'.png',bytes,{contentType:'image/png'})).error,'Cliente nao pode escrever diretamente no bucket.');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const report=await rpc(seller,'nf_report',{p_store:store,p_from:today,p_to:today});assert.equal(report.completed,2);assert.equal(report.products_cents,20200);assert.equal(Date.parse(ledger.due_at)-Date.parse(after.orders.find(o=>o.id===order).completed_at),7*24*60*60*1000);
 assert.ok((await stranger.rpc('nf_report',{p_store:store,p_from:today,p_to:today})).error);
 if(process.env.NORTFOOD_TEST_AUTHENTICATED_UI==='yes')await require('./helpers/authenticated-ui.cjs').authenticatedUI({suffix,password,store,conversation,url});
 if(admin)await review(competingStore,'suspended');
 const signedOut=await customer.auth.signOut();assert.ifError(signedOut.error);assert.ok((await customer.rpc('nf_snapshot')).error);const email='nortfood-cliente-'+suffix+'@example.test';const newClient=makeClient(publicKey);const signedIn=await newClient.auth.signInWithPassword({email,password});assert.ifError(signedIn.error);const refreshed=await newClient.auth.refreshSession();assert.ifError(refreshed.error);assert.equal(refreshed.data.user.id,signedIn.data.user.id);assert.equal((await rpc(newClient,'nf_snapshot',{})).orders.find(o=>o.id===order).status,'delivered');
 await customer.removeChannel(customerChannel);await rpc(seller,'nf_set_store_open',{p_store:store,p_open:false,p_paused:true});if(admin){await review(store,'suspended');await pilot(false);}
 console.log('Gate de API real aprovado: login de contas provisionadas, RLS, pedidos, Realtime autenticado, chat/notificacoes, produtos, upload/leitura assinada, relatorios e geracao de comissoes. Cadastro publico, confirmacao de e-mail, recuperacao e operacoes administrativas sem operador continuam PENDENTES. Interface autenticada: '+(process.env.NORTFOOD_TEST_AUTHENTICATED_UI==='yes'?'recorte de login, retirada, estados, chat e logout aprovado':'nao executada')+'. Dados de teste preservados.');
 }finally{try{if(cleanupFixture)await cleanupFixture();}finally{await Promise.allSettled(clients.map(c=>c.removeAllChannels()));clients.forEach(c=>c.realtime.disconnect());}}
 // Não apagamos usuários vinculados a histórico comercial automaticamente.
})().catch(error=>{let reason=String(error.message);for(const secret of [key,adminPassword].filter(Boolean))reason=reason.split(secret).join('[omitido]');console.error('Gate falhou: '+reason);process.exitCode=1});
