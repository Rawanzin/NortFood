// Sessao descartavel: chave recebida por entrada protegida, nunca gravada ou impressa.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const {configuration}=require('./homologation-config.cjs');
const folder=path.resolve(__dirname,'../test-results/homologation');
async function main(){
 const c=configuration();
 if(c.url!=='https://zrczgghucwsaxqnyaapk.supabase.co')throw Error('STAGING_SESSION_TARGET_NOT_CONFIRMED');
 if(!['--service-fixtures','--resume-ui','--administrative-tests'].some(flag=>process.argv.includes(flag)))throw Error('EXPLICIT_SAFE_TEST_MODE_REQUIRED: testes administrativos permanecem pendentes');
 if(process.argv.includes('--administrative-tests')&&process.env.NORTFOOD_TEST_ADMIN_AUTHORIZED!=='yes')throw Error('SPECIFIC_ADMIN_AUTHORIZATION_REQUIRED');
 fs.mkdirSync(folder,{recursive:true});
 let key=process.env.NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY||'';
 delete process.env.NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY;
 if(process.argv.includes('--ipc')){
  const net=require('node:net'),pipe='\\\\.\\pipe\\nortfood-homologation-'+crypto.randomUUID();
  fs.writeFileSync(path.join(folder,'session-pipe.json'),JSON.stringify({pipe,target:new URL(c.url).hostname}));
  key=await new Promise((resolve,reject)=>{const server=net.createServer(socket=>{server.close();let value='';socket.setEncoding('utf8');socket.on('data',chunk=>{value+=chunk;if(value.length>4096){socket.destroy();reject(Error('IPC_PAYLOAD_INVALID'));}});socket.on('end',()=>resolve(value));socket.on('error',()=>reject(Error('IPC_FAILED')));});const timer=setTimeout(()=>{server.close();reject(Error('IPC_TIMEOUT'));},120000);server.on('close',()=>clearTimeout(timer));server.on('error',()=>reject(Error('IPC_FAILED')));server.listen(pipe,()=>console.log('IPC_LOCAL_READY'));});
 }
 let valid=/^sb_secret_[a-zA-Z0-9_-]{30,}$/.test(key);
 if(!valid){try{const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));valid=claims.role==='service_role'&&claims.ref==='zrczgghucwsaxqnyaapk';}catch{}}
 if(!valid)throw Error('PROTECTED_STAGING_SERVER_KEY_REQUIRED');
 if(process.argv.includes('--service-fixtures')){
  const child=spawn(process.execPath,[path.resolve(__dirname,'run-homologation.cjs')],{env:{...process.env,...c.values,NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY:key,NORTFOOD_TEST_SERVICE_FIXTURES:'yes'},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',b=>output+=b.toString());const code=await new Promise(resolve=>child.on('exit',resolve));output=output.split(key).join('[omitido]');fs.writeFileSync(path.join(folder,'session-result.log'),output);key='';console.log('API_GATE_EXIT '+code);process.exitCode=code??1;return;
 }
 const {createClient}=require('@supabase/supabase-js');
 const root=createClient(c.url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 if(process.argv.includes('--resume-ui')){await require('../tests/helpers/resume-ui-live.cjs').resumeUI({root,config:c});key='';return;}
 // Reutiliza exclusivamente a identidade descrita no pedido de autorizacao.
 // Nao cria outro operador nem concede cargo. Exige o privilegio ja autorizado.
 const {operator}=require('./prepare-admin-homologation.cjs').prepare();
 const {id,email}=operator,password=crypto.randomUUID()+crypto.randomUUID();
 const existing=await root.auth.admin.getUserById(id);
 if(existing.error||existing.data.user?.email!==email||existing.data.user?.user_metadata?.name!=='OPERADOR SINTETICO — HOMOLOGACAO')throw Error('EXCLUSIVE_SYNTHETIC_OPERATOR_REQUIRED');
 // private nao e exposto: a verificacao ocorre por nf_context apos login.
 // A flag impede iniciar o ensaio por engano antes da confirmacao humana.
 if(process.env.NORTFOOD_TEST_ADMIN_AUTHORIZED!=='yes')throw Error('SPECIFIC_ADMIN_AUTHORIZATION_REQUIRED');
 const renewed=await root.auth.admin.updateUserById(id,{password});
 if(renewed.error)throw Error('SYNTHETIC_OPERATOR_SESSION_FAILED');
 fs.writeFileSync(path.join(folder,'session-operator.json'),JSON.stringify({id,email,target:new URL(c.url).hostname,synthetic:true},null,2));
 const client=createClient(c.url,c.publicConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await client.auth.signInWithPassword({email,password});if(login.error)throw Error('TEST_OPERATOR_LOGIN_FAILED');
 console.log('TEST_OPERATOR_READY '+id);
 // Nao atribui poderes administrativos. Aguarda provisionamento autorizado separado.
 const ctx=await client.rpc('nf_context');const authorized=!ctx.error&&ctx.data?.is_admin===true;
 await client.auth.signOut();
 if(!authorized){console.log('PENDENTE: operador sintetico sem permissao administrativa; nenhum pedido criado.');return;}
 const env={...process.env,...c.values,NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY:key,NORTFOOD_TEST_ADMIN_EMAIL:email,NORTFOOD_TEST_ADMIN_PASSWORD:password};
 const child=spawn(process.execPath,[path.resolve(__dirname,'run-homologation.cjs')],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
 let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{output+=b.toString();});
 const code=await new Promise(resolve=>child.on('exit',resolve));
 for(const secret of [key,password])output=output.split(secret).join('[omitido]');
 fs.writeFileSync(path.join(folder,'session-result.log'),output);console.log('API_GATE_EXIT '+code);key='';process.exitCode=code??1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
