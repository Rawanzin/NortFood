import { createClient } from '@supabase/supabase-js';
import money from './money.cjs';
import { controller } from './commercial.js';
import { createAuthStorage } from './auth-storage.mjs';
import { timedFetch } from './platform/http.js';
import { createSignedMedia } from './data/signed-media.js';
import { createCartStorage } from './platform/cart-storage.js';
import { createLiveUpdates } from './platform/live-updates.js';
const config=window.NORTFOOD_CONFIG||{};
// Capturar somente o codigo de erro antes de o SDK consumir/limpar a URL de retorno.
const returnedAuthError=new URLSearchParams(location.hash?.slice(1)||'').get('error')||new URLSearchParams(location.search||'').get('error');
function publicKeyAllowed(key){try{if(key?.startsWith('sb_publishable_'))return true;if(key?.split('.').length===3)return JSON.parse(atob(key.split('.')[1].replaceAll('-','+').replaceAll('_','/'))).role==='anon';return false}catch{return false}}
const demo=['localhost','127.0.0.1',''].includes(location.hostname||'')&&new URLSearchParams(location.search||'').get('demo')==='1';
const configured=!demo&&location.protocol!=='file:'&&Boolean(config.supabaseUrl&&publicKeyAllowed(config.publishableKey));
let authStorage=null;if(configured){try{authStorage=createAuthStorage(window.localStorage,window.sessionStorage)}catch{authStorage=createAuthStorage(null,null)}}
const client=configured?createClient(config.supabaseUrl,config.publishableKey,{global:{fetch:timedFetch},auth:{storage:authStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},realtime:{params:{eventsPerSecond:5}}}):null;
const messages={TABLE_UNAVAILABLE:'Esta mesa não está recebendo pedidos. Consulte a equipe.',TABLE_FORBIDDEN:'Sem acesso a esta mesa.',TABLE_HAS_OPEN_ORDERS:'Conclua os pedidos da mesa antes de arquivar.',INVALID_TABLE:'Confira os dados da mesa.',TABLE_LIMIT:'Limite de mesas atingido.',PILOT_NOT_ENABLED:'Pedidos bloqueados: o piloto ainda não foi autorizado pelo administrador.',AUTH_REQUIRED:'Entre novamente para continuar.',STORE_FORBIDDEN:'Sem acesso a este estabelecimento.',ADMIN_REQUIRED:'Acesso administrativo não autorizado.',STORE_UNAVAILABLE:'A loja não está recebendo pedidos.',PRODUCT_UNAVAILABLE:'Um produto ficou indisponível. Revise o carrinho.',PRICE_CHANGED:'Os valores mudaram. Atualize o carrinho e confirme novamente.',IDEMPOTENCY_CONFLICT:'Esta tentativa já foi usada com outros dados. Revise o pedido.',MINIMUM_ORDER:'O subtotal não alcançou o pedido mínimo.',DELIVERY_OUTSIDE_ZONE:'A loja não atende esse bairro.',ADDRESS_FORBIDDEN:'Selecione um endereço da sua conta.',INVALID_OPTIONS:'Os adicionais foram alterados. Escolha novamente.',OPTION_LIMIT:'Confira a quantidade de opções obrigatórias.',ORDER_CONFLICT:'Outra pessoa atualizou o pedido. Recarregue antes de agir.',INVALID_TRANSITION:'Esta mudança de estado não é permitida.',RATE_LIMIT:'Muitas tentativas. Aguarde um minuto.',INVALID_SETTLEMENT:'O valor excede a comissão pendente.',REVIEW_FORBIDDEN:'Avalie somente um pedido concluído da sua conta.'};
function failure(error){return new Error(messages[error?.message]||'Não foi possível confirmar a operação. Confira a conexão e tente novamente.');}
function authFailure(error){const known={email_not_confirmed:'Confirme seu e-mail antes de entrar.',invalid_credentials:'Não foi possível entrar. Confira e-mail e senha.',over_email_send_rate_limit:'Aguarde antes de solicitar outro e-mail.',over_request_rate_limit:'Muitas tentativas. Aguarde e tente novamente.',signup_disabled:'Novos cadastros estão temporariamente indisponíveis.',weak_password:'Use uma senha forte com pelo menos 12 caracteres.',email_address_invalid:'Confira o endereço de e-mail.'};return new Error(known[error?.code]||(error?.message==='Error sending confirmation email'?'Não foi possível enviar a confirmação. Tente novamente mais tarde.':'Não foi possível confirmar o acesso. Confira a conexão e tente novamente.'));}
async function rpc(name,args={}){if(!client)throw new Error('Supabase ainda não configurado. Operações comerciais estão bloqueadas.');const {data,error}=await client.rpc(name,args);if(error)throw failure(error);return data;}
async function write(query){const {data,error}=await query;if(error)throw failure(error);return data;}
let user=null,refreshTimer=null,channel=null,listener=null,authRevision=0,recovering=false,googleEnabled=null,providerCheckedAt=0;const media=createSignedMedia({sign:path=>client.storage.from('store-media').createSignedUrl(path,1800),revision:()=>authRevision});
const liveUpdates=client?createLiveUpdates({client,getUser:()=>user,notify:event=>listener?.(event),document,window,navigator,setInterval,clearInterval}):null;
function setUser(next){const changed=user?.id!==next?.id;if(changed){authRevision++;media.clear();}user=next||null;if(changed)liveUpdates?.identityChanged();}
let cartStorage;try{cartStorage=createCartStorage(window.localStorage)}catch{cartStorage=createCartStorage(null)}
window.NortFoodBackend={
 cartStorage,
 configured,cents:money.cents,commission:money.commission,client,controller,
 sessionRevision:()=>authRevision,
 recoveryRequested:()=>recovering,
 authReturnError:()=>returnedAuthError,
 async initialize(onChange){if(!client)return;listener=onChange;const revision=authRevision;client.auth.onAuthStateChange((event,session)=>{setUser(session?.user);if(event==='PASSWORD_RECOVERY')recovering=true;if(event==='SIGNED_OUT')recovering=false;setTimeout(()=>{if(listener)listener(event).catch(()=>{});if(event==="PASSWORD_RECOVERY")window.dispatchEvent(new Event("nortfood:password-recovery"));},0)});const result=await client.auth.getUser();if(revision===authRevision)setUser(result.data.user);this.subscribe();},
 async context(){if(!user)return null;const activeUser=user,revision=authRevision,result=await rpc('nf_context');return revision===authRevision?{...result,user:activeUser}:null;},
 async load(){
  const signedIn=!!user,token=new URLSearchParams(location.search).get('mesa');
  const [categories,catalog,snapshot,pilotEnabled,diningContext]=await Promise.all([
   client.from('categories').select('id,name').eq('active',true),rpc('nf_catalog'),signedIn?rpc('nf_snapshot'):null,rpc('nf_operating_status'),
   /^[0-9a-f-]{36}$/i.test(token||'')?rpc('nf_table_context',{p_token:token}).catch(()=>null):null
  ]);
  if(categories.error)throw failure(categories.error);
  if(!Array.isArray(catalog)||!Array.isArray(categories.data)||typeof pilotEnabled!=='boolean')throw new Error('Resposta inválida do servidor. Atualize e tente novamente.');
  return {catalog,snapshot,pilotEnabled,categories:categories.data,diningContext};
 },
 async login(email,password,remember=true){if(!client)throw new Error('Configure o Supabase para entrar.');authStorage.remember(remember);const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw authFailure(error);setUser(data.user);return data;},
 async register(email,password,name,phone='',storeName=''){if(!client)throw new Error('Configure o Supabase para cadastrar.');if(password.length<12)throw new Error('Use uma senha com pelo menos 12 caracteres.');authStorage.remember(true);const {data,error}=await client.auth.signUp({email,password,options:{data:{name,phone,terms_version:'2026-10-draft',...(storeName?{requested_store_name:String(storeName).trim().slice(0,80)}:{})},emailRedirectTo:config.appUrl||location.origin}});if(error)throw authFailure(error);setUser(data.user&&data.session?data.user:null);return Boolean(data.session);},
 async googleAvailable(){if(!client)return false;if(Date.now()-providerCheckedAt<300000&&googleEnabled!==null)return googleEnabled;try{const response=await timedFetch(config.supabaseUrl+'/auth/v1/settings',{headers:{apikey:config.publishableKey}});if(!response.ok)return null;const settings=await response.json();googleEnabled=settings.external?.google===true;providerCheckedAt=Date.now();return googleEnabled;}catch{return null;}},
 async google(){if(!client||await this.googleAvailable()!==true)throw new Error('Login com Google indisponível: o provedor precisa estar configurado no Supabase.');authStorage.remember(true);const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:config.appUrl||location.origin}});if(error)throw authFailure(error);},
 async logout(){if(client){const {error}=await client.auth.signOut();if(error)throw failure(error)}setUser(null);media.clear();},
 async recover(email){if(!client)throw new Error('Configure o Supabase para recuperar acesso.');const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:config.appUrl||location.origin});if(error)throw failure(error);},
 async password(password){if(password.length<12)throw new Error('Use pelo menos 12 caracteres.');const result=await write(client.auth.updateUser({password}));recovering=false;return result;},
 async email(email){return write(client.auth.updateUser({email}));},
 rpc,
 async categories(){return write(client.from('categories').select('id,name').eq('active',true));},
 async reviews(store){return write(client.from('reviews').select('id,store_id,customer_name,rating,body,created_at').eq('store_id',store));},
 async favorite(id,kind,remove){if(!user)throw new Error('Entre para salvar seus favoritos.');const column=kind==='products'?'product_id':'store_id';return write(remove?client.from('favorites').delete().eq('user_id',user.id).eq(column,id):client.from('favorites').insert({user_id:user.id,[column]:id}));},
 async place(request){return rpc('nf_place_order',{p_request:request});},
 async recoverOrder(key){if(!client||!user)return null;return write(client.from('orders').select('id').eq('customer_id',user.id).eq('idempotency_key',key).maybeSingle());},
 async upload(store,file){if(!file)return null;const form=new FormData();form.append('store_id',store);form.append('file',file);const {data,error}=await client.functions.invoke('upload-media',{body:form});if(error)throw failure(error);return data.path;},
 async image(path){return media.image(path);},
 subscribe(){liveUpdates?.start();},
 dispose(){liveUpdates?.stop();},
};
