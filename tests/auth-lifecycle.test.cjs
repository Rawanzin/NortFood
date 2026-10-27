// Mocks de transporte do SDK para regressao de concorrencia do frontend.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild'),path=require('node:path');
async function backend(client,options={}){const result=await esbuild.build({entryPoints:[path.resolve(__dirname,'../src/backend.js')],bundle:true,write:false,format:'iife',platform:'browser',plugins:[{name:'auth-transport-fixture',setup(build){build.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'client',namespace:'fixture'}));build.onResolve({filter:/^\.\/commercial\.js$/},()=>({path:'controller',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='client'?'export const createClient=()=>window.__client':'export const controller=()=>({})'}));}}]});const window={addEventListener(){},removeEventListener(){},NORTFOOD_CONFIG:{supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture',appUrl:'http://localhost:4173'},__client:client,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}}};vm.runInNewContext(result.outputFiles[0].text,{window,document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{onLine:true},location:{origin:'http://localhost:4173',...options.location},AbortController,fetch:options.fetch||fetch,setTimeout:()=>0,clearTimeout,clearInterval(){},setInterval:()=>0,URLSearchParams});return window.NortFoodBackend;}
function transport(){let changed;const channel={on(){return this},subscribe(){return this}};const client={auth:{getUser:async()=>({data:{user:{id:'first',email:'first@example.test'}}}),onAuthStateChange:fn=>{changed=fn},signOut:async()=>{changed('SIGNED_OUT',null);return {error:null}}},channel:()=>channel,removeChannel:()=>Promise.resolve()};return {client,change:(...args)=>changed(...args)};}

test('Cadastro por e-mail respeita provedor e bloqueio global, mesmo com Google habilitado',async()=>{
 const {client}=transport();
 for(const [disabled,email,expected] of [[false,true,true],[true,true,false],[false,false,false]]){
  const api=await backend(client,{fetch:async()=>({ok:true,json:async()=>({disable_signup:disabled,external:{email,google:true}})})});
  assert.equal(await api.signupAvailable(),expected);
 }
 const offline=await backend(client,{fetch:async()=>{throw Error('offline')}});assert.equal(await offline.signupAvailable(),null);
});

test('Google verifica provedor real antes do redirecionamento e usa origem raiz',async()=>{
 const {client}=transport();let request;client.auth.signInWithOAuth=async r=>{request=r;return {data:{url:'https://accounts.google.com/'},error:null}};
 const api=await backend(client,{fetch:async()=>({ok:true,json:async()=>({external:{google:true}})})});await api.google();assert.equal(request.provider,'google');assert.equal(request.options.redirectTo,'http://localhost:4173');assert.equal(new URL(request.options.redirectTo).hash,'');
 const unavailable=await backend(client,{fetch:async()=>({ok:true,json:async()=>({external:{google:false}})})});request=null;await assert.rejects(()=>unavailable.google(),/provedor precisa/);assert.equal(request,null);
 const offline=await backend(client,{fetch:async()=>{throw Error('offline')}});assert.equal(await offline.googleAvailable(),null);
});

test('Cadastro autorizado mantem usuario na sessao e login informa confirmacao pendente',async()=>{
 const {client}=transport();client.auth.signUp=async()=>({data:{user:{id:'created'},session:{user:{id:'created'}}},error:null});client.rpc=async()=>({data:{profile:{id:'created'},memberships:[],is_admin:false},error:null});
 const api=await backend(client);assert.equal(await api.register('created@example.test','long-fixture-password','Cliente'),true);assert.equal((await api.context()).user.id,'created');
 client.auth.signInWithPassword=async()=>({data:{},error:{code:'email_not_confirmed'}});await assert.rejects(()=>api.login('pending@example.test','long-fixture-password'),/Confirme seu e-mail/);
});

test('Recuperacao reserva o fragmento para tokens Auth; evento de recuperacao escolhe a tela',async()=>{
 const {client,change}=transport();let redirect;client.auth.resetPasswordForEmail=async(email,options)=>{redirect=options.redirectTo;return {error:null}};const api=await backend(client);await api.initialize(async()=>{});await api.recover('common@example.test');assert.equal(new URL(redirect).hash,'','Fragmento de rota nao deve disputar espaco com o access_token retornado pelo Auth');assert.equal(new URL(redirect).origin,'http://localhost:4173');change('PASSWORD_RECOVERY',{user:{id:'recovery'}});assert.equal(api.recoveryRequested(),true);
});
test('Resposta de contexto antiga nao e combinada com nova identidade',async()=>{
 const {client,change}=transport();let resolve;client.rpc=()=>new Promise(r=>{resolve=r});const api=await backend(client);await api.initialize(async()=>{});const revision=api.sessionRevision();const pending=api.context();change('SIGNED_IN',{user:{id:'second',email:'second@example.test'}});resolve({data:{profile:{id:'first'},memberships:[],is_admin:false},error:null});assert.equal(await pending,null);assert.ok(api.sessionRevision()>revision);
});
test('Cadastro com confirmacao conserva nome solicitado, sem conceder cargo',async()=>{
 const {client}=transport();let signup;client.auth.signUp=async request=>{signup=request;return {data:{user:{id:'pending'},session:null},error:null}};const api=await backend(client);const signed=await api.register('owner@example.test','a-long-fixture-password','Nome','38999999999','  Loja apos confirmar  ');assert.equal(signed,false);assert.equal(signup.options.data.requested_store_name,'Loja apos confirmar');assert.equal(signup.options.data.role,undefined);assert.equal(signup.options.emailRedirectTo,'http://localhost:4173');assert.equal(await api.context(),null);
});

test('Repetir cadastro existente preserva rascunho vinculado e não o transfere a outra identidade',async()=>{
 const {client}=transport();let next={user:{id:'pending-original'},session:null};client.auth.signUp=async()=>({data:next,error:null});const api=await backend(client),email='pending@example.test',payload={kind:'customer',name:'Nome original',phone:'38999999999',consent:true,address:{street:'Rua Sintética Original',number:'10',neighborhood:'Bairro Sintético',city:'Porteirinha',state:'MG'}};
 await api.register(email,'fixture-password-original',payload.name,payload.phone,'',payload);assert.equal(api.pendingOnboarding(email,'pending-original').bound,true);
 next={user:{id:'obfuscated-existing',identities:[]},session:null};await assert.rejects(()=>api.register(email,'different-fixture-password','Nome repetido',payload.phone,'',{...payload,name:'Nome repetido',address:{...payload.address,street:'Rua que não deve sobrescrever'}}),/já possui conta/);
 const retained=api.pendingOnboarding(email,'pending-original');assert.equal(retained.bound,true);assert.equal(retained.name,payload.name);assert.equal(retained.address.street,payload.address.street);assert.equal(JSON.stringify(retained).includes('fixture-password'),false);
 // Antes retornava o payload original com bound:false: isso ainda vazava dados ao formulário.
 next={user:{id:'different-identity'},session:null};await api.register(email,'fixture-password-new','Outra identidade',payload.phone,'',payload);assert.equal(api.pendingOnboarding(email,'different-identity'),null);assert.equal(api.pendingOnboarding(email),null);assert.equal(api.pendingOnboarding(email,'pending-original').bound,true);assert.equal(api.pendingOnboarding(email,'pending-original').address.street,payload.address.street);
});

test('Cadastro de vendedor preserva dados de retomada e separa telefone comercial do pessoal',async()=>{
 const {client}=transport();let request;client.auth.signUp=async r=>{request=r;return {data:{user:{id:'pending'},session:null},error:null}};const api=await backend(client);await api.register('seller@example.test','12345678','Responsável','(38) 99999-9999','Loja real');assert.equal(request.options.data.name,'Responsável');assert.equal(request.options.data.phone,'');assert.equal(request.options.data.requested_store_phone,'(38) 99999-9999');assert.equal(request.options.data.requested_store_name,'Loja real');assert.equal(request.options.data.role,undefined);
 client.auth.signUp=async()=>({data:{},error:{code:'email_address_not_authorized'}});await assert.rejects(()=>api.register('test@example.test','senha de teste','Teste'),/provedor de e-mail/);
 client.auth.signUp=async()=>({data:{user:{identities:[]},session:null},error:null});await assert.rejects(()=>api.register('test@example.test','senha de teste','Teste'),/já possui conta/);
});

test('Inicialização aguarda o SDK recuperar sessão antes de verificar identidade no servidor',async()=>{
 const {client}=transport();const calls=[];client.auth.getSession=async()=>{calls.push('session');return {data:{session:{user:{id:'restored'}}},error:null}};client.auth.getUser=async()=>{calls.push('verified-user');return {data:{user:{id:'restored'}}}};const api=await backend(client);await api.initialize(async()=>{});assert.deepEqual(calls,['session','verified-user']);client.rpc=async()=>({data:{profile:{id:'restored'}},error:null});assert.equal((await api.context()).user.id,'restored');
});
test('Logout invalida revisao e contexto da identidade anterior',async()=>{
 const {client}=transport();const api=await backend(client);await api.initialize(async()=>{});const revision=api.sessionRevision();await api.logout();assert.ok(api.sessionRevision()>revision);assert.equal(await api.context(),null);
});
test('Recuperacao recebida durante inicializacao nao se perde antes de getUser',async()=>{
 const {client,change}=transport();client.auth.getUser=async()=>{change('PASSWORD_RECOVERY',{user:{id:'recovery',email:'recovery@example.test'}});return {data:{user:{id:'recovery'}}}};client.auth.updateUser=async()=>({data:{user:{id:'recovery'}},error:null});const api=await backend(client);await api.initialize(async()=>{});assert.equal(api.recoveryRequested(),true);await api.password('long-local-fixture-password');assert.equal(api.recoveryRequested(),false);
});
test('Lembrar de mim seleciona persistencia; sessao temporaria nao sobrevive a nova aba',async()=>{
 const {createAuthStorage}=await import('../src/auth-storage.mjs');const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
 const local=memory(),session=memory(),storage=createAuthStorage(local,session);storage.setItem('sdk-token','persistent-fixture');assert.equal(createAuthStorage(local,memory()).getItem('sdk-token'),'persistent-fixture');storage.remember(false);storage.setItem('sdk-token','temporary-fixture');assert.equal(local.getItem('sdk-token'),null);assert.equal(storage.getItem('sdk-token'),'temporary-fixture');assert.equal(createAuthStorage(local,session).getItem('sdk-token'),'temporary-fixture');assert.equal(createAuthStorage(local,memory()).getItem('sdk-token'),null);storage.removeItem('sdk-token');assert.equal(session.getItem('sdk-token'),null);
});
test('Navegador sem acesso a storage conserva somente memoria, sem quebrar inicializacao',async()=>{
 const {createAuthStorage}=await import('../src/auth-storage.mjs');const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};const store=createAuthStorage(blocked,blocked);assert.equal(store.getItem('sdk-token'),null);store.setItem('sdk-token','local-fixture');assert.equal(store.getItem('sdk-token'),'local-fixture');assert.equal(createAuthStorage(blocked,blocked).getItem('sdk-token'),null);store.removeItem('sdk-token');assert.equal(store.getItem('sdk-token'),null);
});

test('Retorno expirado conserva o código seguro antes de o SDK limpar o fragmento',async()=>{
 const {client}=transport();const api=await backend(client,{location:{hash:'#error=access_denied&error_code=otp_expired&error_description=NAO_EXIBIR',search:''}});
 assert.equal(api.authReturnError(),'access_denied');assert.equal(api.authReturnCode(),'otp_expired');
});

test('Trocar a identidade encerra a intenção de recuperação da conta anterior',async()=>{
 const {client,change}=transport();const api=await backend(client);await api.initialize(async()=>{});
 change('PASSWORD_RECOVERY',{user:{id:'recovering',email:'a@example.test'}});assert.equal(api.recoveryRequested(),true);
 change('TOKEN_REFRESHED',{user:{id:'recovering',email:'a@example.test'}});assert.equal(api.recoveryRequested(),true);
 change('SIGNED_IN',{user:{id:'other',email:'b@example.test'}});assert.equal(api.recoveryRequested(),false);
});

test('Reenvio e recuperação validam e normalizam o e-mail antes de enviar ao provedor',async()=>{
 const {client}=transport(),requests=[];client.auth.resend=async request=>{requests.push(request);return {error:null}};client.auth.resetPasswordForEmail=async(email,options)=>{requests.push({email,...options});return {error:null}};
 const api=await backend(client);await api.resend('  pending@example.test  ');await api.recover('  pending@example.test  ');
 assert.equal(requests[0].email,'pending@example.test');assert.equal(requests[1].email,'pending@example.test');assert.equal(requests[0].options.emailRedirectTo,'http://localhost:4173');assert.equal(requests[1].redirectTo,'http://localhost:4173');
 await assert.rejects(()=>api.resend('invalid'),/e-mail válido/);await assert.rejects(()=>api.recover('invalid'),/e-mail válido/);assert.equal(requests.length,2);
});

test('Falha ao atualizar senha mantém recuperação e mostra a causa permitida',async()=>{
 const {client,change}=transport();client.auth.updateUser=async()=>({data:null,error:{code:'same_password'}});const api=await backend(client);await api.initialize(async()=>{});change('PASSWORD_RECOVERY',{user:{id:'recovering'}});
 await assert.rejects(()=>api.password('long-fixture-password'),/diferente da senha atual/);assert.equal(api.recoveryRequested(),true);
});

test('API de rascunhos sobrevive erro, limpa UI no Auth aceito e preserva recibos de outras identidades',async()=>{
 const {client}=transport();client.auth.getUser=async()=>({data:{user:null}});const api=await backend(client);await api.initialize(async()=>{});
 const payload={kind:'customer',name:'CLIENTE A',phone:'38999999999',consent:true,address:{street:'Rua Sintética',number:'10',neighborhood:'Centro',city:'Porteirinha',state:'MG'}};
 const form={name:payload.name,identifier:'a@example.test',phone:payload.phone,street:payload.address.street,password:'NUNCA_SALVAR',confirmPassword:'NUNCA_SALVAR',consent:true};
 const saved=api.saveSignupDraft('customer','a@example.test',form,1);assert.ok(saved.id);assert.equal(api.getSignupDraft('seller','a@example.test'),null);assert.equal(JSON.stringify(api.getSignupDraft('customer','a@example.test')).includes('NUNCA_SALVAR'),false);
 client.auth.signUp=async()=>({data:{},error:{code:'signup_disabled'}});await assert.rejects(()=>api.register('a@example.test','12345678',payload.name,payload.phone,'',payload),/bloqueados/);assert.equal(api.getSignupDraft('customer','a@example.test').data.name,payload.name);
 client.auth.signUp=async()=>({data:{user:{id:'pending-a',email:'a@example.test'},session:null},error:null});await api.register('a@example.test','12345678',payload.name,payload.phone,'',payload);assert.equal(api.getSignupDraft('customer','a@example.test'),null);assert.equal(api.pendingOnboarding('a@example.test','pending-a').bound,true);
 api.saveSignupDraft('seller','b@example.test',{name:'VENDEDOR B',identifier:'b@example.test',storeName:'Loja B'},0);assert.equal(api.pendingOnboarding('a@example.test','pending-a').bound,true);
 client.auth.signInWithPassword=async()=>({data:{user:{id:'b-id',email:'b@example.test'}},error:null});await api.login('b@example.test','12345678');assert.equal(api.signupDrafts('seller').length,0);assert.equal(api.saveSignupDraft('customer','c@example.test',{name:'Não gravar após Auth'}),null);
 api.clearOnboarding();assert.equal(api.pendingOnboarding('a@example.test','pending-a').bound,true);await api.logout();assert.equal(api.pendingOnboarding('a@example.test','pending-a'),null);assert.equal(api.signupDrafts('customer').length,0);
});
