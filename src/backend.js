import { createClient } from '@supabase/supabase-js';
import money from './money.cjs';
import { controller } from './commercial.js';
import { createAuthStorage } from './auth-storage.mjs';
import { timedFetch } from './platform/http.js';
import { createSignedMedia } from './data/signed-media.js';
import { createCartStorage } from './platform/cart-storage.js';
import { createLiveUpdates } from './platform/live-updates.js';
import { passwordError } from '../assets/password-policy.js';
const config=window.NORTFOOD_CONFIG||{};
// Capturar somente o codigo de erro antes de o SDK consumir/limpar a URL de retorno.
const returnedAuthError=new URLSearchParams(location.hash?.slice(1)||'').get('error')||new URLSearchParams(location.search||'').get('error');
function publicKeyAllowed(key){try{if(key?.startsWith('sb_publishable_'))return true;if(key?.split('.').length===3)return JSON.parse(atob(key.split('.')[1].replaceAll('-','+').replaceAll('_','/'))).role==='anon';return false}catch{return false}}
const demo=['localhost','127.0.0.1',''].includes(location.hostname||'')&&new URLSearchParams(location.search||'').get('demo')==='1';
const configured=!demo&&location.protocol!=='file:'&&Boolean(config.supabaseUrl&&publicKeyAllowed(config.publishableKey));
let authStorage=null;if(configured){try{authStorage=createAuthStorage(window.localStorage,window.sessionStorage)}catch{authStorage=createAuthStorage(null,null)}}
// SPA estática: o SDK consome o fragmento antes do roteador. Não misturar callback PKCE sem troca de código.
const authReturned=/(?:^|[&#])access_token=/.test(location.hash||'');
const client=configured?createClient(config.supabaseUrl,config.publishableKey,{global:{fetch:timedFetch},auth:{storage:authStorage,flowType:'implicit',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},realtime:{params:{eventsPerSecond:5}}}):null;
const messages={TABLE_UNAVAILABLE:'Esta mesa não está recebendo pedidos. Consulte a equipe.',TABLE_FORBIDDEN:'Sem acesso a esta mesa.',TABLE_HAS_OPEN_ORDERS:'Conclua os pedidos da mesa antes de arquivar.',INVALID_TABLE:'Confira os dados da mesa.',TABLE_LIMIT:'Limite de mesas atingido.',PILOT_NOT_ENABLED:'Pedidos bloqueados: o piloto ainda não foi autorizado pelo administrador.',AUTH_REQUIRED:'Entre novamente para continuar.',STORE_FORBIDDEN:'Sem acesso a este estabelecimento.',ADMIN_REQUIRED:'Acesso administrativo não autorizado.',STORE_UNAVAILABLE:'A loja não está recebendo pedidos.',PRODUCT_UNAVAILABLE:'Um produto ficou indisponível. Revise o carrinho.',PRICE_CHANGED:'Os valores mudaram. Atualize o carrinho e confirme novamente.',IDEMPOTENCY_CONFLICT:'Esta tentativa já foi usada com outros dados. Revise o pedido.',MINIMUM_ORDER:'O subtotal não alcançou o pedido mínimo.',DELIVERY_OUTSIDE_ZONE:'A loja não atende esse bairro.',ADDRESS_FORBIDDEN:'Selecione um endereço da sua conta.',INVALID_OPTIONS:'Os adicionais foram alterados. Escolha novamente.',OPTION_LIMIT:'Confira a quantidade de opções obrigatórias.',ORDER_CONFLICT:'Outra pessoa atualizou o pedido. Recarregue antes de agir.',INVALID_TRANSITION:'Esta mudança de estado não é permitida.',RATE_LIMIT:'Muitas tentativas. Aguarde um minuto.',INVALID_SETTLEMENT:'O valor excede a comissão pendente.',REVIEW_FORBIDDEN:'Avalie somente um pedido concluído da sua conta.'};
Object.assign(messages,{PRODUCT_RESTRICTED:'Este produto aguarda liberação específica da loja ou verificação obrigatória.',INVALID_REMOVALS:'Os ingredientes mudaram. Confira as remoções.',INVALID_INGREDIENTS:'Confira a lista de ingredientes.',PILOT_STORE_LIMIT:'O piloto permite apenas a quantidade de lojas autorizada pelo administrador.',STORE_NOT_SUBMITTED:'A loja precisa enviar a solicitação de aprovação antes de ser publicada.',STORE_INCOMPLETE:'Complete descrição, WhatsApp, endereço, categorias, entrega ou retirada e ao menos um produto disponível antes de solicitar aprovação.',DRAFT_CONFLICT:'O rascunho foi atualizado em outra aba. Recarregue antes de salvar.',INVALID_STORE_STATUS:'Esta loja não está no estado esperado para a ação.'});
Object.assign(messages,{STORE_RESERVED:'Esta loja já possui um cadastro reservado. Entre com o e-mail verificado do responsável ou solicite ajuda ao administrador.',INVALID_STORE_NAME:'Informe o nome da loja (até 80 caracteres).',INVALID_STORE_PHONE:'Confira o telefone comercial com DDD.',INVALID_PROFILE_NAME:'Informe seu nome (até 80 caracteres).',TERMS_REQUIRED:'Aceite os termos e a política de privacidade.',STORE_REQUEST_LIMIT:'Sua conta atingiu o limite de rascunhos. Continue em uma loja existente.'});
function failure(error){const result=new Error(messages[error?.message]||'Não foi possível confirmar a operação. Confira a conexão e tente novamente.');result.code=error?.code||error?.message;return result;}
function authFailure(error){const known={email_not_confirmed:'Confirme seu e-mail antes de entrar. Você pode solicitar um novo link.',invalid_credentials:'Não foi possível entrar. Confira e-mail e senha.',user_already_exists:'Este e-mail já possui conta. Entre ou recupere sua senha.',email_exists:'Este e-mail já possui conta. Entre ou recupere sua senha.',email_address_not_authorized:'O envio de confirmação para este endereço ainda não está autorizado pelo provedor de e-mail.',over_email_send_rate_limit:'O limite de envio de e-mails foi atingido. Aguarde antes de solicitar outro link.',over_request_rate_limit:'Muitas tentativas. Aguarde e tente novamente.',signup_disabled:'Novos cadastros estão bloqueados no Supabase. A confirmação por e-mail ainda precisa ser habilitada.',weak_password:'Use uma senha com pelo menos 8 caracteres.',email_address_invalid:'Confira o endereço de e-mail.',otp_expired:'O link expirou ou já foi utilizado. Solicite outro link.'};const result=new Error(known[error?.code]||(error?.message==='Error sending confirmation email'?'A confirmação não pôde ser enviada pelo serviço de e-mail. Não tente criar outra conta; solicite outro link após a regularização do envio.':'Não foi possível confirmar o acesso. Confira a conexão e tente novamente.'));result.code=error?.code;return result;}
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
 authReturned:()=>authReturned,
 async initialize(onChange){if(!client)return;listener=onChange;const revision=authRevision;client.auth.onAuthStateChange((event,session)=>{setUser(session?.user);if(event==='PASSWORD_RECOVERY')recovering=true;if(event==='SIGNED_OUT')recovering=false;setTimeout(()=>{if(listener)listener(event).catch(()=>{});if(event==="PASSWORD_RECOVERY")window.dispatchEvent(new Event("nortfood:password-recovery"));},0)});const session=await client.auth.getSession?.();if(session?.error)throw authFailure(session.error);const result=await client.auth.getUser();if(result.error&&session?.data?.session)throw authFailure(result.error);if(revision===authRevision)setUser(result.data.user);this.subscribe();},
 async context(){if(!user)return null;const activeUser=user,revision=authRevision;let result=await rpc('nf_context');if(revision!==authRevision)return null;if(!result?.profile){await rpc('nf_ensure_profile');if(revision!==authRevision)return null;result=await rpc('nf_context');}return revision===authRevision?{...result,user:activeUser}:null;},
 async load(){
  const signedIn=!!user,token=new URLSearchParams(location.search).get('mesa');
  const [categories,catalog,snapshot,pilotEnabled,diningContext,storeDrafts,storeSetups]=await Promise.all([
   client.from('categories').select('id,name').eq('active',true),rpc('nf_catalog'),signedIn?rpc('nf_snapshot'):null,rpc('nf_operating_status'),
   /^[0-9a-f-]{36}$/i.test(token||'')?rpc('nf_table_context',{p_token:token}).catch(()=>null):null,
   signedIn?rpc('nf_store_drafts'):[],signedIn?rpc('nf_store_setup'):[]
  ]);
  if(categories.error)throw failure(categories.error);
  if(!Array.isArray(catalog)||!Array.isArray(categories.data)||typeof pilotEnabled!=='boolean')throw new Error('Resposta inválida do servidor. Atualize e tente novamente.');
  return {catalog,snapshot,pilotEnabled,categories:categories.data,diningContext,storeDrafts,storeSetups};
 },
 async login(email,password,remember=true){if(!client)throw new Error('Configure o Supabase para entrar.');authStorage.remember(remember);const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw authFailure(error);setUser(data.user);return data;},
 async register(email,password,name,phone='',storeName=''){if(!client)throw new Error('Configure o Supabase para cadastrar.');if(passwordError(password))throw new Error(passwordError(password));authStorage.remember(true);const {data,error}=await client.auth.signUp({email,password,options:{data:{name,phone:storeName?'':phone,terms_version:'2026-10-public-v2',...(storeName?{requested_store_name:String(storeName).trim().slice(0,80),requested_store_phone:phone}:{})},emailRedirectTo:config.appUrl||location.origin}});if(error)throw authFailure(error);if(data.user?.identities?.length===0)throw new Error('Se este e-mail já possui conta, entre ou recupere sua senha. Caso contrário, confira sua caixa de entrada.');setUser(data.user&&data.session?data.user:null);return Boolean(data.session);},
 async resend(email){if(!client)throw new Error('Configure o Supabase para confirmar a conta.');const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:config.appUrl||location.origin}});if(error)throw authFailure(error);},
 async signupAvailable(){if(!client)return null;try{const response=await timedFetch(config.supabaseUrl+'/auth/v1/settings',{headers:{apikey:config.publishableKey}});if(!response.ok)return null;const settings=await response.json();return settings.disable_signup===false;}catch{return null;}},
 async googleAvailable(){if(!client)return false;if(Date.now()-providerCheckedAt<300000&&googleEnabled!==null)return googleEnabled;try{const response=await timedFetch(config.supabaseUrl+'/auth/v1/settings',{headers:{apikey:config.publishableKey}});if(!response.ok)return null;const settings=await response.json();googleEnabled=settings.external?.google===true;providerCheckedAt=Date.now();return googleEnabled;}catch{return null;}},
 async google(intent='customer'){if(!client||await this.googleAvailable()!==true)throw new Error('Login com Google indisponível: o provedor precisa estar configurado no Supabase.');try{window.sessionStorage.setItem('nortfood-auth-intent',intent==='seller'?'seller':'customer')}catch{}authStorage.remember(true);const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:config.appUrl||location.origin}});if(error)throw authFailure(error);},
 async logout(){if(client){const {error}=await client.auth.signOut();if(error)throw failure(error)}setUser(null);media.clear();},
 async recover(email){if(!client)throw new Error('Configure o Supabase para recuperar acesso.');const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:config.appUrl||location.origin});if(error)throw authFailure(error);},
 async password(password){if(passwordError(password))throw new Error(passwordError(password));const result=await write(client.auth.updateUser({password}));recovering=false;return result;},
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
