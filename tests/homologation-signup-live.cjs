// Cadastro publico real, sem Secret Key ou confirmacao administrativa.
// Somente identidade sintetica em dominio reservado; nao ha caixa postal para confirmar links.
const {createClient}=require('@supabase/supabase-js'),{randomUUID}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {configuration}=require('../scripts/homologation-config.cjs');
async function main(){
 const c=configuration();if(c.url!=='https://zrczgghucwsaxqnyaapk.supabase.co')throw Error('STAGING_TARGET_REQUIRED');
 const email='nortfood-cadastro-'+randomUUID().slice(0,8)+'@example.com',password=randomUUID()+randomUUID();
 const client=createClient(c.url,c.publicConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const report={target:new URL(c.url).hostname,scope:'Cadastro publico real com chave publishable, sem privilegios administrativos',status:'PENDENTE',emailConfirmation:'PENDENTE: caixa postal de testes/SMTP nao configurados',steps:[]};
 const safeError=e=>e?{status:e.status,code:e.code,message:String(e.message).split(password).join('[omitido]').split(email).join('[email sintetico]')}:null;
 try{
  const signup=await client.auth.signUp({email,password,options:{emailRedirectTo:'http://localhost:4174',data:{name:'TESTE SINTETICO DE CADASTRO',terms_version:'2026-10-draft'}}});
  report.steps.push({name:'signup',accepted:!signup.error,error:safeError(signup.error),userCreated:!!signup.data?.user,sessionGranted:!!signup.data?.session});
  if(signup.error){report.reason='Cadastro normal recusado; consultar erro original sanitizado. Nao alterar confirmacao/RLS para contornar.';return;}
  if(signup.data.session){report.reason='Sessao concedida antes de confirmar email: interrompido para revisao de seguranca';report.status='REPROVADA';process.exitCode=1;return;}
  report.syntheticUserId=signup.data.user?.id;
  const login=await client.auth.signInWithPassword({email,password});
  report.steps.push({name:'login_before_confirmation',blocked:!!login.error,error:safeError(login.error)});
  if(!login.error){report.status='REPROVADA';report.reason='Login permitido sem confirmacao: revisar antes de continuar';process.exitCode=1;return;}
  const snapshot=await client.rpc('nf_snapshot');report.steps.push({name:'private_snapshot_without_session',blocked:!!snapshot.error,code:snapshot.error?.code});
  const recovery=await client.auth.resetPasswordForEmail(email,{redirectTo:'http://localhost:4174/#settings'});
  report.steps.push({name:'recovery_request',accepted:!recovery.error,error:safeError(recovery.error),deliveryVerified:false});
  report.reason='Cadastro aceito sem sessao; login positivo e demais fluxos dependem da confirmacao real. Aceite da solicitacao nao comprova entrega de email.';
 }finally{
  await client.auth.signOut();client.realtime.disconnect();
  const target=path.resolve(__dirname,'../test-results/homologation/signup-live-result.json');fs.writeFileSync(target,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }
}
main().catch(e=>{console.error('Teste interrompido: '+e.message);process.exitCode=1;});
