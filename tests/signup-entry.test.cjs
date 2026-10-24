// Regressao local do ponto de entrada/configuracao; nao comprova SMTP remoto.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const {parsePublicConfig,start,ORIGIN,TARGET}=require('../scripts/start-local.cjs');
test('Login so encerra formulario e navega depois do perfil; evento SIGNED_IN nao disputa a tela',async()=>{
 const esbuild=require('esbuild'),vm=require('node:vm');const code=(await esbuild.build({entryPoints:['src/commercial.js'],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'dining-fixture',setup(b){b.onResolve({filter:/^\.\/qr-menu\.js$/},()=>({path:'dining',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createDining=()=>({sync(){}})'}));}}]})).outputFiles[0].text;
 const scope=vm.createContext({exports:{},module:{exports:{}},window:{},document:{querySelector:()=>({})},location:{hash:''},scrollY:0,scrollTo(){},setTimeout});vm.runInContext(code,scope);
 let release;const gate=new Promise(r=>release=r),d={current:null,preferences:{},orders:[],favoriteAccounts:{}},events=[];let ctl;
 const bridge={data:()=>d,esc:String,money:String,toast(){},modal(){},render:()=>events.push('render'),authMode:()=> 'login',authRole:()=> 'customer',swapCart(){},connection(){},closeModal:()=>{assert.equal(d.current?.id,'account');events.push('close');},setView:view=>events.push(view)};
 const api={configured:true,login:async()=>{ctl.refresh('SIGNED_IN');},context:async()=>{await gate;return {profile:{id:'account',terms_accepted_at:'2026-10-23'},user:{id:'account',email:'synthetic@example.test'},memberships:[],is_admin:false};},load:async()=>({catalog:[],snapshot:{}})};ctl=scope.module.exports.controller(bridge,api);
 const form=new FormData();form.set('identifier','synthetic@example.test');form.set('password','fixture-password');const pending=ctl.submit({id:'auth-form'},form);await new Promise(r=>setImmediate(r));assert.deepEqual(events,[]);release();await pending;assert.deepEqual(events,['close','home','render']);
});
test('Configuracao servida e JSON de dados; nao executa JavaScript nem aceita porta de outro projeto',async()=>{
 assert.deepEqual(parsePublicConfig('window.NORTFOOD_CONFIG=Object.freeze({"mode":"commercial"});'),{mode:'commercial'});
 assert.throws(()=>parsePublicConfig('window.NORTFOOD_CONFIG=Object.freeze({});process.exit();'));
 await assert.rejects(()=>start({fetchImpl:async()=>new Response('window.NORTFOOD_CONFIG=Object.freeze({"supabaseUrl":"https://outro.supabase.co"});')}),/LOCAL_PORT_WRONG_APPLICATION/);
});
test('Iniciador reutiliza configuracao correta e exige resposta real bem sucedida do Auth',async()=>{
 const c=require('../scripts/homologation-config.cjs').configuration().publicConfig,calls=[];
 const fetchImpl=async url=>{calls.push(url);return new Response(url.startsWith(ORIGIN)?'window.NORTFOOD_CONFIG=Object.freeze('+JSON.stringify(c)+');':JSON.stringify({external:{email:true}}));};
 const result=await start({fetchImpl});assert.equal(result.existing,true);assert.equal(result.app,null);assert.deepEqual(calls,[ORIGIN+'/config.js',TARGET+'/auth/v1/settings']);
 await assert.rejects(()=>start({fetchImpl:async url=>url.startsWith(ORIGIN)?fetchImpl(url):new Response('{}',{status:401})}),/SUPABASE_CONNECTION_NOT_VALIDATED/);
});
test('Build rejeita configuracao vazia antes de substituir a publicacao existente',()=>{
 const before=fs.readFileSync('dist/config.js');const r=spawnSync(process.execPath,['scripts/build.cjs'],{env:{...process.env,NORTFOOD_SUPABASE_URL:'',NORTFOOD_SUPABASE_PUBLISHABLE_KEY:''},encoding:'utf8',windowsHide:true});assert.equal(r.status,1);assert.match(r.stderr,/SUPABASE_PUBLIC_CONFIGURATION_REQUIRED/);assert.deepEqual(fs.readFileSync('dist/config.js'),before);
});
test('file:// explica a causa e aponta ao servidor, sem cadastro falso ou chamada Supabase',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage(),requests=[],errors=[];page.on('request',r=>{if(r.url().includes('.supabase.co'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve('index.html')).href+'#map');await page.getByRole('heading',{name:'Abra o NortFood pelo endereço local'}).waitFor();assert.equal(await page.getByRole('link',{name:'Abrir NortFood local'}).getAttribute('href'),ORIGIN+'/#map');assert.equal(await page.locator('#auth-form').count(),0);assert.equal(await page.evaluate(()=>window.NortFoodBackend.configured),false);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);fs.mkdirSync('test-results/signup-20261021',{recursive:true});await page.screenshot({path:path.resolve('test-results/signup-20261021/file-entry.png')});}finally{await browser.close();}
});
