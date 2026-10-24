import {storeView,orderView,statusNames,paymentNames,nextStatus} from './compatibility.js';
import {createDining} from './qr-menu.js';
import {createFinance} from './presentation/finance.js';
import {createAdmin} from './presentation/admin.js';
import {createCheckout} from './application/checkout.js';
import {createRefreshQueue} from './application/refresh-queue.js';
import {resolveCatalogImages} from './application/catalog-images.js';
import {snapshotView} from './application/snapshot.js';
import {sessionCommands} from './application/session-commands.js';
import {orderWhatsApp} from './application/whatsapp.js';
import {categoryKey} from '../assets/base-categories.js';
export function controller(bridge,api){
 const {esc,money,toast,modal,render}=bridge;
 const dining=createDining({...bridge,reload:()=>refresh()},api);window.NortFoodQR=dining;
 let authBusy=false,messageKeys=new WeakMap(),context=null,admin=null,reports={},historyRows=[],historyCursor=null,historyBusy=false,historyDone=false,storeDrafts=[],storeSetups=[];
 let identityRevision=api.sessionRevision?.(),invitationCheckedFor=null;
 let storage;try{storage=window.sessionStorage}catch{}
 const checkout=createCheckout({storage});
 const {financePage}=createFinance({data:()=>data(),getReports:()=>reports,money,esc});
 const {adminPage}=createAdmin({data:()=>data(),getContext:()=>context,getAdmin:()=>admin,bridge,financePage,esc});
 const data=()=>bridge.data();
 function invalidateIdentity(){
  // Switch carts while the previous identity is still known: never merge its cart into guest.
  const d=data();if(d.current)bridge.swapCart('guest');
  d.current=null;d.orders=[];d.stores=[];d.conversations=[];d.notifications=[];d.reviews=[];
  d.commissionLedger=[];d.commissionSettlements=[];d.favoriteAccounts={};
  invitationCheckedFor=null;context=null;admin=null;reports={};historyRows=[];historyCursor=null;historyDone=false;storeDrafts=[];storeSetups=[];
 }
 const enqueueRefresh=createRefreshQueue(performRefresh);
 function refresh(event='MANUAL'){
  const revision=api.sessionRevision?.();
  if(revision!==identityRevision){const hadIdentity=!!data().current;invalidateIdentity();identityRevision=revision;if(hadIdentity){bridge.connection('loading','Atualizando sessão…');render();}}
  return enqueueRefresh(event);
 }
 async function performRefresh(event){
  const revision=api.sessionRevision?.(),current=()=>api.sessionRevision?.()===revision;
  try{
   let nextContext=await api.context(),onboardingError=null;const onboardingNeeded=nextContext?.memberships?.length===0;
   // A confirmação do e-mail pode acontecer em outro dispositivo. O vínculo é criado
   // pelo servidor, de forma idempotente, sem depender da sessão da tela de cadastro.
   if(current()&&nextContext?.profile&&nextContext.user?.email_confirmed_at&&nextContext.memberships?.length===0&&invitationCheckedFor!==nextContext.user.id){const claimed=await api.rpc('nf_claim_store_invitation');if(!current())return;invitationCheckedFor=nextContext.user.id;if(claimed)nextContext=await api.context();}
   if(current()&&nextContext?.profile&&onboardingNeeded&&nextContext.user?.user_metadata?.requested_store_name){
    try{const meta=nextContext.user.user_metadata;await api.rpc(meta.requested_store_phone?'nf_complete_seller':'nf_create_store_draft',meta.requested_store_phone?{p_name:nextContext.profile.name,p_store_name:meta.requested_store_name,p_phone:meta.requested_store_phone,p_consent:!!nextContext.profile.terms_accepted_at}:{p_name:meta.requested_store_name});}catch(error){onboardingError='Sua conta está conectada. Não foi possível concluir a loja: '+error.message;}
    if(!current())return;nextContext=await api.context();
   }
   const loaded=await api.load();
   if(!current()){refresh('POLL').catch(()=>{});return;}
   const previous=data().current,owner=nextContext?.profile?.id||'guest';
   const projected=snapshotView(nextContext,loaded,previous,historyRows);
   const stores=loaded.catalog.map(storeView);
   const requested=location.hash.startsWith('#order-detail/')?location.hash.split('/')[1]:'';
   const [nextAdmin,detail]=await Promise.all([
    nextContext?.is_admin?api.rpc('nf_admin_dashboard'):null,
    projected.current&&/^[0-9a-f-]{36}$/i.test(requested)&&!projected.orders.some(o=>o.id===requested)?api.rpc('nf_order_detail',{p_order:requested}).catch(()=>null):null,
    resolveCatalogImages(stores,path=>api.image(path),current)
   ]);
   if(!current()){refresh('POLL').catch(()=>{});return;}
   // Everything above is prepared privately; publish one coherent identity after the final await.
   const d=data(),u=projected.current;
   if((previous?.id||'guest')!==owner){bridge.swapCart(owner);historyRows=[];historyCursor=null;historyDone=false;reports={};}
   const newOrder=u?.role==='seller'&&u.notifications_enabled!==false&&previous?.id===u.id&&event!=='BOOT'&&projected.latest.some(o=>o.store===u.storeId&&o.backendStatus==='pending'&&!d.orders.some(old=>old.id===o.id));
   if(u){u.onboardingError=onboardingError;try{const pending=JSON.parse(storage?.getItem('nortfood-google-store')||'null');if(pending&&Date.now()-pending.at<1800000&&!u.storeId){u.pendingStoreName=u.pendingStoreName||String(pending.name||'').slice(0,80);u.pendingStorePhone=u.pendingStorePhone||String(pending.phone||'').slice(0,22);}}catch{}}context=nextContext;admin=nextAdmin;d.stores=stores;d.current=u;storeDrafts=Array.isArray(loaded.storeDrafts)?loaded.storeDrafts:[];storeSetups=Array.isArray(loaded.storeSetups)?loaded.storeSetups:[];
   d.orders=projected.orders;if(detail)d.orders.push(orderView(detail,u));
   d.notifications=projected.notifications;d.conversations=projected.conversations;d.reviews=projected.reviews;
   d.commissionLedger=projected.commissionLedger;d.commissionSettlements=projected.commissionSettlements;
   d.favoriteAccounts[u?.email||'guest']=projected.favorites;
   if(u)d.preferences[u.email]={...d.preferences[u.email],notifications:u.notifications_enabled};
   if(projected.address)bridge.applyAddress(projected.address);
   if(loaded.categories)bridge.categories?.(loaded.categories);
   dining.sync(loaded.diningContext||null);
   if(newOrder)bridge.alertNewOrder?.();
   if(event==='PASSWORD_RECOVERY')bridge.setView('settings');
   if(u&&event==='SIGNED_IN'&&!authBusy&&document.querySelector('#auth-form,[data-auth-confirmation]')){bridge.closeModal();bridge.setView(authDestination(u));}
   bridge.connection('connected',loaded.pilotEnabled===false?'Você pode acessar sua conta e preparar sua loja. Pedidos aguardam a liberação da loja piloto.':'');
   if(!authBusy&&event!=='BOOT'&&!(event==='PASSWORD_RECOVERY'&&document.querySelector('#password-form'))&&(!document.querySelector('.modal,.drawer,#store-form,input:focus,textarea:focus,select:focus')||!['POLL','DATABASE_CHANGE'].includes(event))){const y=scrollY;render();if(['POLL','DATABASE_CHANGE'].includes(event))scrollTo(0,y)}
   if(event==='PASSWORD_RECOVERY')bridge.showRecovery?.();
  }catch(error){if(!current()){refresh('POLL').catch(()=>{});return;}bridge.connection('error',error.message);if(!['POLL','DATABASE_CHANGE'].includes(event))throw error}
 }

 function authDestination(u){let intent;try{intent=storage?.getItem('nortfood-auth-intent');storage?.removeItem('nortfood-auth-intent')}catch{}return u.role==='admin'?'admin':u.role==='seller'?'seller':intent==='seller'||u.pendingStoreName||!u.terms_accepted_at?'profile':'home';}
 async function run(operation,message){const commands=sessionCommands(api);await operation();commands.assertCurrent();bridge.closeModal();await refresh();commands.assertCurrent();if(message)toast(message)}
 function requireLogin(){if(!api.configured)throw new Error('Supabase não configurado. Pedidos comerciais estão bloqueados.');if(!data().current)throw new Error('Entre na sua conta para continuar.');}
 async function click(t){
  const d=data(),u=d.current,commands=sessionCommands(api);
  if(t.dataset.whatsappOrder || t.dataset.copyWhatsapp){
   requireLogin();
   const order=d.orders.find(o=>o.id===(t.dataset.whatsappOrder||t.dataset.copyWhatsapp));
   if(!order || !context || !(u.role==='customer'&&order.raw.customer_id===u.id || context.memberships?.some(m=>m.store_id===order.store)))throw new Error('Pedido indisponível para esta conta.');
   const store=d.stores.find(s=>s.id===order.store),summary=orderWhatsApp(order,store,{privateDetails:!!t.dataset.copyWhatsapp});
   if(!summary)throw new Error('A loja precisa ter um WhatsApp válido e aprovação antes deste contato.');
   if(t.dataset.copyWhatsapp){
    try{await navigator.clipboard.writeText(summary.message);toast('Resumo copiado. Confira o destinatário antes de colar e enviar.');}
    catch{throw new Error('O navegador não permitiu copiar. Você pode consultar o resumo nesta tela.');}
   }else{
    window.open(summary.url,'_blank','noopener,noreferrer');
    toast('Envie a mensagem no WhatsApp. Abertura do aplicativo não confirma envio nem aceite.');
   }
   return true;
  }
  if(t.dataset.retryCatalog!==undefined){bridge.connection('loading','Carregando estabelecimentos…');render();await refresh('MANUAL');return true;}
  if(t.dataset.saveStoreDraft!==undefined){
   requireLogin();const f=document.getElementById('store-form');if(!f)return true;
   const form=new FormData(f),payload={};
   for(const name of ['name','about','categories','phone','whatsapp','street','number','complement','neighborhood','city','hours','workingDays','pickupEnabled','deliveryEnabled','zones','estimateMinutes','minimumOrder','payments','deliveryInfo']){
    payload[name]=['categories','workingDays','payments'].includes(name)?form.getAll(name):['pickupEnabled','deliveryEnabled'].includes(name)?form.has(name):String(form.get(name)||'');
   }
   t.disabled=true;try{const old=storeDrafts.find(row=>row.store_id===u.storeId),version=await commands.rpc('nf_save_store_draft',{p_store:u.storeId,p_data:payload,p_version:old?.version||0});storeDrafts=storeDrafts.filter(row=>row.store_id!==u.storeId);storeDrafts.push({store_id:u.storeId,data:payload,version});toast('Rascunho salvo na sua conta. Imagens e localização são salvas em Salvar perfil.');}finally{t.disabled=false;}return true;
  }
  if(t.dataset.submitStore!==undefined){await run(()=>commands.rpc('nf_submit_store',{p_store:u.storeId}),'Loja enviada para análise. Ela ainda não está publicada.');return true;}
  if(await dining.click(t))return true;
  if(t.dataset.exportFinance!==undefined){if(!context?.is_admin)throw new Error('Acesso administrativo não autorizado.');const rows=[['tipo','loja','pedido','valor_centavos','data','referencia'],...d.commissionLedger.map(l=>[l.kind,l.store_id,l.order_id,l.amount_cents,l.created_at,l.reason]),...d.commissionSettlements.map(s=>['settlement',s.store_id,s.order_id,s.amount_cents,s.paid_at,s.reference])],csv=rows.map(row=>row.map(v=>{const raw=String(v??''),safe=typeof v==='number'?raw:/^\s*[=+@-]/.test(raw)?"'"+raw:raw;return '"'+safe.replaceAll('"','""')+'"'}).join(';')).join('\r\n'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='nortfood-comissoes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
  if(t.dataset.loadHistory!==undefined){requireLogin();if(historyBusy)return true;if(historyDone){toast('Nenhum pedido anterior.');return true}historyBusy=true;try{const owner=u.id,known=new Set(d.orders.map(o=>o.id));let added=0,pages=0;do{const rows=await commands.rpc('nf_order_history',{p_before:historyCursor?.created_at||null,p_before_id:historyCursor?.id||null,p_limit:50});if(data().current?.id!==owner)return true;const last=rows.at(-1);if(last)historyCursor={created_at:last.created_at,id:last.id};historyDone=rows.length<50;for(const row of rows)if(!known.has(row.id)){known.add(row.id);historyRows.push(orderView(row,u));added++}pages++;}while(!added&&!historyDone&&pages<10);await refresh();toast(added?'Pedidos anteriores carregados.':historyDone?'Nenhum pedido anterior.':'Histórico consultado. Continue para ver anteriores.');}finally{historyBusy=false}return true}
  if(t.dataset.reportPeriod){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),date=new Date(today+'T12:00:00Z');if(t.dataset.reportPeriod==='week')date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));if(t.dataset.reportPeriod==='month')date.setUTCDate(1);reports[u.storeId]=await commands.rpc('nf_report',{p_store:u.storeId,p_from:date.toISOString().slice(0,10),p_to:today});render();return true}
  if(t.dataset.action==='logout'){await api.logout();invalidateIdentity();bridge.setView('home');await refresh();return true}
  if(t.dataset.action==='google-auth'){if(bridge.authMode()==='register'&&!document.querySelector('#auth-form [name=consent]')?.checked)throw new Error('Aceite os termos antes de continuar com Google.');t.disabled=true;try{try{const f=document.getElementById('auth-form');if(bridge.authRole()==='seller')storage?.setItem('nortfood-google-store',JSON.stringify({name:f?.elements.storeName?.value||'',phone:f?.elements.phone?.value||'',at:Date.now()}));else storage?.removeItem('nortfood-google-store');}catch{}await api.google(bridge.authRole());}catch(error){const alert=document.getElementById('auth-error');if(alert)alert.textContent=error.message;throw error;}finally{t.disabled=false;}return true}
  if(t.dataset.confirmProductPrice){if(!confirm('Confirmo que o preço salvo deste produto está correto para a jarra de 750 ml. A disponibilidade ainda precisa ser ativada no cardápio.'))return true;await run(()=>commands.rpc('nf_confirm_product_price',{p_product:t.dataset.confirmProductPrice}),'Preço confirmado. Você pode revisar a disponibilidade.');return true;}
  if(t.dataset.action==='recover-password'){modal('<div class="modal-head"><h2>Recuperar acesso</h2><button class="close" data-action="close-modal">×</button></div><form id="recover-form" class="form"><label>E-mail<input name="email" type="email" required autocomplete="email"></label><button class="btn">Solicitar recuperação</button></form>');return true}
  if(t.dataset.fav||t.dataset.productFav){requireLogin();const kind=t.dataset.productFav?'products':'stores',id=t.dataset.productFav||t.dataset.fav,list=bridge.favorites(kind);await run(()=>commands.favorite(id,kind,list.includes(id)),'Favoritos atualizados no servidor.');return true}
  if(t.dataset.status||t.dataset.cancel||t.dataset.liveNext){requireLogin();const id=t.dataset.status||t.dataset.cancel||t.dataset.liveOrder,o=d.orders.find(o=>o.id===id);if(!o)throw new Error('Pedido indisponível.');const next=t.dataset.cancel?'cancelled':t.dataset.liveNext||Object.keys(statusNames).find(k=>statusNames[k]===t.dataset.next);await run(()=>commands.rpc('nf_transition',{p_order:id,p_next:next,p_version:o.version}),'Estado confirmado pelo servidor.');return true}
  if(t.dataset.confirmPayment){await run(()=>commands.rpc('nf_confirm_payment',{p_order:t.dataset.confirmPayment}),'Recebimento informado pela loja; não é confirmação bancária automática.');return true}
  if(t.dataset.productDelete!==undefined||t.dataset.productToggle!==undefined||t.dataset.productMove!==undefined){requireLogin();const s=d.stores.find(s=>s.id===u.storeId),index=Number(t.dataset.productDelete??t.dataset.productToggle??t.dataset.productMove),p=s?.products[index];if(!p)throw new Error('Produto indisponível.');if(t.dataset.productDelete!==undefined&&!confirm('Arquivar produto? Pedidos anteriores serão preservados.'))return true;await run(()=>t.dataset.productMove!==undefined?commands.rpc('nf_reorder_product',{p_id:p[9],p_direction:Number(t.dataset.step)}):commands.rpc('nf_product_action',{p_id:p[9],p_action:t.dataset.productDelete!==undefined?'archive':'toggle',p_position:null}),'Cardápio atualizado.');return true}
  if(t.dataset.action==='toggle-store'){requireLogin();const s=d.stores.find(s=>s.id===u.storeId);await run(()=>commands.rpc('nf_set_store_open',{p_store:s.id,p_open:!s.serverOpen,p_paused:false}),'Disponibilidade salva na loja.');return true}
  if(t.dataset.pauseStore!==undefined){requireLogin();const s=d.stores.find(s=>s.id===u.storeId);await run(()=>commands.rpc('nf_set_store_open',{p_store:s.id,p_open:s.openOverride,p_paused:!s.paused}),'Pausa atualizada.');return true}
  if(t.dataset.read||t.dataset.readAll!==undefined||t.dataset.chatRead){requireLogin();await run(()=>commands.rpc('nf_mark_read',{p_notification:t.dataset.read||null,p_conversation:t.dataset.chatRead||null}));return true}
  if(t.dataset.chatStore){requireLogin();if(u.role==='customer')await commands.rpc('nf_chat',{p_store:t.dataset.chatStore});bridge.setView('conversations');await refresh();return true}
  if(t.dataset.selectAddress){requireLogin();const a=bridge.addresses().find(a=>a.id===t.dataset.selectAddress);if(!a)throw new Error('Endereço inválido.');bridge.applyAddress(a);if(bridge.addressCheckout())bridge.showCheckoutPayment();else await run(()=>commands.rpc('nf_save_address',{p_id:a.id,p_data:{...a,is_primary:true}}),'Endereço principal atualizado.');return true}
  if(t.dataset.deleteAddress){if(!confirm('Excluir este endereço salvo? Pedidos anteriores manterão seu histórico.'))return true;await run(()=>commands.rpc('nf_delete_address',{p_id:t.dataset.deleteAddress}),'Endereço excluído.');return true}
  if(t.dataset.shopTab==='reviews'){const reviews=await commands.reviews(bridge.storeId());d.reviews=reviews.map(r=>({id:r.id,store:r.store_id,customer:r.customer_name,rating:r.rating,text:r.body,created:Date.parse(r.created_at)}));return false}
  if(t.dataset.adminStore){modal('<div class="modal-head"><h2>Alterar aprovação</h2><button class="close" data-action="close-modal">×</button></div><form id="admin-store-form" data-store="'+esc(t.dataset.adminStore)+'" class="form"><label>Estado<select name="status"><option value="approved">Aprovar / reativar</option><option value="suspended">Suspender</option><option value="rejected">Rejeitar</option></select></label><label>Justificativa<textarea name="reason" required minlength="3"></textarea></label><button class="btn">Registrar decisão</button></form>');return true}
  if(t.dataset.adminPilot!==undefined){const enable=!admin?.settings.pilot_enabled;if(enable&&!confirm('Ativar pedidos no servidor? Faça isso somente após validar o checklist do piloto e contratos.'))return true;const reason=prompt('Justificativa administrativa da mudança:');if(!reason||reason.trim().length<3)return true;await run(()=>commands.rpc('nf_admin_pilot',{p_enabled:enable,p_reason:reason}),'Estado operacional registrado na auditoria.');return true}
  if(t.dataset.adminCancel){const reason=prompt('Justificativa do cancelamento excepcional pelo suporte:');if(!reason||reason.trim().length<3)return true;await run(()=>commands.rpc('nf_admin_cancel',{p_order:t.dataset.adminCancel,p_reason:reason}),'Cancelamento registrado nos eventos e na auditoria.');return true}
  if(t.dataset.adminCommission){const id=t.dataset.adminCommission;modal('<div class="modal-head"><h2>Comissão do pedido</h2><button class="close" data-action="close-modal">×</button></div><form id="commission-form" data-order="'+esc(id)+'" data-key="'+crypto.randomUUID()+'" class="form"><label>Operação<select name="kind"><option value="settle">Registrar quitação recebida</option><option value="adjust">Ajuste compensatório</option></select></label><label>Valor em reais<input name="amount" required placeholder="5,00"></label><label>Referência do recebimento<input name="reference" maxlength="120"></label><label>Justificativa<textarea name="reason" required minlength="3"></textarea></label><button class="btn">Registrar no servidor</button></form>');return true}
  if(t.dataset.dataRequest){await run(()=>commands.rpc('nf_data_request',{p_kind:t.dataset.dataRequest,p_details:'Solicitado pela área da conta.'}),'Solicitação registrada para análise. Histórico comercial não foi apagado.');return true}
  if(t.dataset.switchStore){if(!context?.memberships.some(m=>m.store_id===t.dataset.switchStore))throw new Error('Loja não autorizada.');d.current.storeId=t.dataset.switchStore;render();return true}
  return false;
 }
 async function submit(f,form){
  if(!api.configured)throw new Error('Supabase não configurado. Operações comerciais bloqueadas.');
  const d=data(),u=d.current;if(f.id==='auth-form'){
   if(authBusy)return true;authBusy=true;try{
   const email=String(form.get('identifier')||'').trim(),password=String(form.get('password')||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Informe um e-mail válido.');
   if(bridge.authMode()==='register'){
    if(!form.get('consent'))throw new Error('Aceite os termos para cadastrar.');
    try{storage?.setItem('nortfood-auth-intent',bridge.authRole()==='seller'?'seller':'customer')}catch{}
    const name=String(form.get('name')||'').trim(),selling=bridge.authRole()==='seller',storeName=String(form.get('storeName')||'').trim(),phone=String(form.get('phone')||'').trim();if(!name||name.length>80)throw new Error('Informe seu nome (até 80 caracteres).');if(password!==String(form.get('confirmPassword')||''))throw new Error('As senhas não conferem.');if(selling&&(!storeName||!/^(?:55)?[1-9][0-9]{9,10}$/.test(phone.replace(/\D/g,''))))throw new Error('Informe o nome e um telefone comercial válido com DDD.');const signedIn=await api.register(email,password,name,selling?phone:'',selling?storeName:'');
    if(!signedIn){bridge.authConfirmation(email);return true;}
    toast('Conta cadastrada. Você já está conectado.');
   }
   else {await api.login(email,password,!!form.get('remember'));}
   await refresh();if(!d.current)await refresh('SIGNED_IN');
   if(!d.current)throw new Error('A conta foi autenticada, mas o perfil ainda não pôde ser carregado. Confira a conexão e tente novamente.');
   bridge.closeModal();bridge.setView(authDestination(d.current));render();return true;
   }finally{authBusy=false}
  }
  if(f.id==='resend-confirmation-form'){await api.resend(String(form.get('email')||''));toast('Se a conta aguarda confirmação, o provedor enviará um novo link.');return true;}
  if(f.id==='recover-form'){await api.recover(String(form.get('email')));bridge.closeModal();toast('Se o e-mail estiver cadastrado, o provedor enviará instruções.');return true}
  requireLogin();const commands=sessionCommands(api);
  if(f.id==='store-setup-form'){await run(()=>commands.rpc('nf_save_setup',{p_store:u.storeId,p_delivery:api.cents(form.get('deliveryReference')||0),p_replacement:api.cents(form.get('replacementReference')||0),p_owner_confirmed:!!form.get('ownerConfirmed')}),'Referências comerciais salvas. Frete cobrado depende dos bairros configurados.');return true;}
  if(await dining.submit(f,form))return true;
  if(f.id==='report-form'){reports[u.storeId]=await commands.rpc('nf_report',{p_store:u.storeId,p_from:String(form.get('from')),p_to:String(form.get('to'))});render();return true}
  if(f.dataset.adminCategory!==undefined){await run(()=>commands.rpc('nf_admin_category',{p_id:f.dataset.adminCategory||null,p_name:String(form.get('name')),p_active:!!form.get('active')}),'Categoria salva sem apagar relações históricas.');return true}
  if(f.dataset.adminRequest){await run(()=>commands.rpc('nf_admin_request',{p_id:f.dataset.adminRequest,p_status:String(form.get('status')),p_reason:String(form.get('reason'))}),'Solicitação atualizada e auditada.');return true}
  if(f.id==='password-form'){if(String(form.get('newPassword'))!==String(form.get('confirmPassword')))throw new Error('Senhas não conferem.');await run(()=>commands.password(String(form.get('newPassword'))),'Senha atualizada pelo provedor.');return true}
  if(f.id==='account-form'){if(f.dataset.checkoutContact!==undefined&&(String(form.get('name')||'').trim().length<2||!/^(55)?[1-9][0-9](?:9[0-9]{8}|[2-5][0-9]{7})$/.test(String(form.get('phone')||'').replace(/\D/g,''))))throw new Error('Confira seu nome e telefone brasileiro com DDD.');await commands.rpc('nf_update_profile',{p_name:String(form.get('name')),p_phone:String(form.get('phone')||''),p_notifications:!!u.notifications_enabled});if(String(form.get('email'))!==u.email){await commands.email(String(form.get('email')));toast('Confirme a alteração de e-mail pelo provedor.')}await refresh();bridge.closeModal();return true}
  if(f.id==='manual-address-form'||f.id==='delivery-address-form'){
   const coordinates=bridge.coordinates(),payload={label:String(form.get('label')||'Endereço'),street:String(form.get('street')),number:String(form.get('number')),complement:String(form.get('complement')||''),reference:String(form.get('reference')||''),neighborhood:String(form.get('neighborhood')||''),city:'Porteirinha',state:'MG',is_primary:true,...(f.id==='delivery-address-form'&&coordinates?{latitude:coordinates.lat,longitude:coordinates.lng}:{})};
   const id=await commands.rpc('nf_save_address',{p_id:bridge.editingAddress()||null,p_data:payload});await refresh();const a=bridge.addresses().find(x=>x.id===id);bridge.applyAddress(a);bridge.closeModal();if(bridge.addressCheckout())bridge.showCheckoutPayment();else{bridge.setView('addresses');render()}toast('Endereço confirmado no servidor.');return true;
  }
  if(f.id==='complete-profile-form'){await run(()=>commands.rpc('nf_complete_profile',{p_name:String(form.get('name')),p_consent:!!form.get('consent')}),'Dados da conta salvos.');bridge.setView('home');render();return true;}
  if(f.id==='store-request-form'){await run(()=>commands.rpc('nf_complete_seller',{p_name:String(form.get('responsibleName')),p_store_name:String(form.get('name')),p_phone:String(form.get('phone')),p_consent:!!form.get('consent')}),'Rascunho da loja criado. Prepare o perfil e o cardápio antes de solicitar aprovação.');try{storage?.removeItem('nortfood-google-store')}catch{}bridge.setView('seller');render();return true}
  if(f.id==='store-form'){
   const store=u.storeId,catalog=await commands.categories(),ids=[...new Set(form.getAll('categories').map(name=>(catalog.find(c=>c.name===name)||catalog.find(c=>categoryKey(c.name)===categoryKey(name)))?.id).filter(Boolean))],[opens,closes]=String(form.get('hours')).split('-');
   const zones=String(form.get('zones')||'').split(/\r?\n/).filter(x=>x.trim()).map(line=>{const [neighborhood,price]=line.split(':');return {neighborhood:neighborhood.trim(),fee_cents:api.cents(price),city:'Porteirinha'}});
   const payload={name:String(form.get('name')),description:String(form.get('about')||''),phone:String(form.get('phone')||''),whatsapp:String(form.get('whatsapp')||''),street:String(form.get('street')||''),number:String(form.get('number')||''),complement:String(form.get('complement')||''),neighborhood:String(form.get('neighborhood')||''),city:String(form.get('city')||'Porteirinha'),opens_at:opens,closes_at:closes,working_days:form.getAll('workingDays').map(Number),pickup_enabled:!!form.get('pickupEnabled'),delivery_enabled:!!form.get('deliveryEnabled'),minimum_cents:api.cents(form.get('minimumOrder')||0),estimate_minutes:form.get('estimateMinutes')?Number(form.get('estimateMinutes')):null,payment_methods:form.getAll('payments').map(label=>Object.keys(paymentNames).find(k=>paymentNames[k]===label)).filter(Boolean),delivery_info:String(form.get('deliveryInfo')||'')};
   Object.assign(payload,window.NortFoodLocation?.readPatch(f)||{});
   for(const name of ['logo','cover']){const file=f.elements[name]?.files?.[0];if(file)payload[name+'_url']=await commands.upload(store,file)}
   await commands.rpc('nf_save_store',{p_id:store,p_data:payload,p_categories:ids,p_zones:zones});
   const draft=storeDrafts.find(row=>row.store_id===store);
   if(draft)await commands.rpc('nf_save_store_draft',{p_store:store,p_data:{},p_version:draft.version});
   await refresh();toast((Object.hasOwn(payload,'latitude')?(payload.latitude===null?'Localização removida. ':'Localização salva. '):'')+'Perfil salvo no servidor.');render();return true;
  }
  if(f.id==='product-form'){
   const s=d.stores.find(s=>s.id===u.storeId),old=s.products[Number(f.dataset.index)],lines=String(form.get('extras')||'').split(/\r?\n/).filter(l=>l.trim()),options=lines.map(line=>{const match=line.match(/^(.+):([^:]+)$/);if(!match)throw new Error('Adicionais: use nome:preço.');return {name:match[1].trim(),price_cents:api.cents(match[2])}}),groups=options.length?[{name:String(form.get('groupName')||'Adicionais'),min_choices:Number(form.get('minChoices')||0),max_choices:Number(form.get('maxChoices')||options.length),options}]:[];
   const payload={ingredients:String(form.get('ingredients')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),name:String(form.get('name')),description:String(form.get('desc')),price_cents:api.cents(form.get('price')),category:String(form.get('category')),available:!!form.get('available'),notes_label:String(form.get('productNotes')||'')};const file=f.elements.image?.files?.[0];if(file)payload.image_url=await commands.upload(u.storeId,file);
   await run(()=>commands.rpc('nf_save_product',{p_store:u.storeId,p_id:old?.[9]||null,p_data:payload,p_groups:groups}),'Produto salvo com identidade permanente.');return true;
  }
  if(f.id==='checkout-form'){
   if(checkout.busy)return true;const owner=u.id,revision=api.sessionRevision?.();{
    const s=bridge.cartStore();if(!s)throw new Error('Carrinho vazio.');dining.validate(s);const a=bridge.addresses().find(a=>a.formatted===u.address),request={store_id:s.id,fulfillment:bridge.fulfillment(),address_id:bridge.fulfillment()==='delivery'?a?.id||null:null,table_token:bridge.fulfillment()==='dine_in'?dining.mode(s)?.token:null,payment_method:Object.keys(paymentNames).find(k=>paymentNames[k]===form.get('payment')),notes:String(form.get('notes')||''),expected_total_cents:Number(f.dataset.reviewedTotal),items:d.cart.map(row=>({product_id:row.pid,quantity:row.qty,option_ids:(row.extras||[]).map(x=>x.id),notes:row.note||'',...(row.removedIngredients?.length?{removed_ingredients:[...row.removedIngredients].sort()}: {})}))};
    let id;
    try{id=await checkout.place(owner,request,api)}catch(error){if(error.message.includes('valores mudaram'))await refresh();throw error}
    if(data().current?.id!==owner||api.sessionRevision?.()!==revision){toast('Pedido confirmado na conta que iniciou a compra. Entre nela para acompanhar.');return true;}
    d.cart=[];bridge.saveCart();bridge.closeModal();await refresh();
    if(data().current?.id===owner&&api.sessionRevision?.()===revision){bridge.selectOrder(id);bridge.setView('order-detail');render();toast('Pedido registrado no servidor. Aguarde a resposta da loja.');}return true;
   }
  }
  if(f.id==='conversation-start'){await commands.rpc('nf_chat',{p_store:String(form.get('storeId'))});await refresh();return true}
  if(f.dataset.conversation){let key=messageKeys.get(f);if(!key){key=crypto.randomUUID();messageKeys.set(f,key)}await run(()=>commands.rpc('nf_send_message',{p_conversation:f.dataset.conversation,p_body:String(form.get('message')),p_key:key}),'Mensagem registrada no servidor.');return true}
  if(f.id==='review-form'){await run(()=>commands.rpc('nf_review',{p_order:f.dataset.order,p_rating:Number(form.get('rating')),p_body:String(form.get('text'))}),'Avaliação registrada.');return true}
  if(f.id==='admin-store-form'){await run(()=>commands.rpc('nf_admin_store',{p_store:f.dataset.store,p_status:String(form.get('status')),p_reason:String(form.get('reason'))}),'Decisão auditada.');return true}
  if(f.id==='admin-rate-form'){await run(()=>commands.rpc('nf_admin_rate',{p_bps:api.cents(form.get('rate')),p_reason:String(form.get('reason'))}),'Taxa alterada para novos pedidos.');return true}
  if(f.id==='admin-store-limit-form'){await run(()=>commands.rpc('nf_admin_store_limit',{p_limit:Number(form.get('limit')),p_reason:String(form.get('reason'))}),'Limite de lojas atualizado e auditado.');return true}
  if(f.id==='commission-form'){let amount=String(form.get('amount')),negative=amount.startsWith('-');if(negative)amount=amount.slice(1);const value=api.cents(amount)*(negative?-1:1);await run(()=>commands.rpc(form.get('kind')==='settle'?'nf_admin_settle':'nf_admin_adjust',form.get('kind')==='settle'?{p_order:f.dataset.order,p_amount:value,p_key:f.dataset.key,p_reference:String(form.get('reference')),p_reason:String(form.get('reason'))}:{p_order:f.dataset.order,p_amount:value,p_reason:String(form.get('reason'))}),'Lançamento financeiro registrado.');return true}
  return false;
 }
 function orderActions(o){const statuses=nextStatus[o.backendStatus]||[],next=o.backendStatus==='preparing'&&o.fulfillment==='dine_in'?['ready_for_table']:o.backendStatus==='preparing'&&o.fulfillment==='pickup'?['ready_for_pickup']:statuses;return next.map(n=>'<button class="btn small" data-live-order="'+esc(o.id)+'" data-live-next="'+n+'">'+esc(statusNames[n])+'</button>').join('')+(!['cancelled','rejected'].includes(o.backendStatus)?'<button class="btn outline small" data-confirm-payment="'+esc(o.id)+'">'+(o.raw.payment_confirmed_at?'Recebimento informado':'Informar pagamento recebido')+'</button>':'')}
 function whatsappActions(order){
  const store=data().stores.find(s=>s.id===order?.store);
  if(!orderWhatsApp(order,store))return '';
  return '<section class="dash-card"><div class="dash-card-body"><h2>Contato pelo WhatsApp</h2><p>O pedido permanece registrado no NortFood. Aguarde o aceite da loja no acompanhamento. Abrir o WhatsApp não confirma envio, leitura ou aceite.</p><div class="detail-actions"><button class="btn outline" data-whatsapp-order="'+esc(order.id)+'">Abrir WhatsApp da loja</button><button class="btn outline" data-copy-whatsapp="'+esc(order.id)+'">Copiar resumo completo</button></div><small>O link inclui produtos e total registrado. Endereço e observações pessoais só entram no resumo completo que você escolher copiar e compartilhar.</small></div></section>';
 }
 return {initialDestination:()=>api.authReturned?.()&&data().current?authDestination(data().current):null,refresh,click,submit,orderActions,financePage,adminPage,whatsappActions,context:()=>context,setupFor:id=>storeSetups.find(row=>row.store_id===id),draftFor:id=>storeDrafts.find(row=>row.store_id===id)};
}
