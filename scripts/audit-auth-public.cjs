// Sem tokens privilegiados, sem conta criada e sem e-mail real enviado.
const fs=require('node:fs/promises'),crypto=require('node:crypto');
async function main(){
 const origin=process.env.NORTFOOD_VERIFY_URL||'https://nortfood.netlify.app';
 const root=await fetch(origin+'/release.json',{signal:AbortSignal.timeout(20000)}),release=await root.json();
 const configText=await(await fetch(origin+'/config.js',{signal:AbortSignal.timeout(20000)})).text();
 const config=JSON.parse(configText.slice(configText.indexOf('{'),configText.lastIndexOf('}')+1));
 if(new URL(config.supabaseUrl).hostname!=='zwkhqahivthzivmuirjr.supabase.co')throw Error('WRONG_PROJECT');
 const headers={apikey:config.publishableKey,'Content-Type':'application/json'},results=[];
 async function probe(name,route,options={}){const r=await fetch(config.supabaseUrl+route,{headers,redirect:'manual',signal:AbortSignal.timeout(20000),...options});const d=await r.json().catch(()=>({}));results.push({name,status:r.status,code:d.error_code||d.code||d.error,...(name==='settings'?{disable_signup:d.disable_signup,confirm_email:!d.mailer_autoconfirm,email:d.external?.email,google:d.external?.google}:{})});return d;}
 const settings=await probe('settings','/auth/v1/settings');
 await probe('google_authorize','/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(origin));
 const email='nortfood-negative-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomUUID()+crypto.randomUUID();
 await probe('wrong_credentials','/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
 if(settings.disable_signup===true)await probe('signup_disabled','/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password,data:{name:'TESTE NEGATIVO SEM CONTA'}})});
 const pilot=await probe('commercial_gate','/rest/v1/rpc/nf_operating_status');
 const report={checkedAt:new Date().toISOString(),origin,release,project:new URL(config.supabaseUrl).hostname,results,pilotEnabled:pilot,realAccountCreated:false,googleSessionValidated:false};
 await fs.mkdir('test-results/auth-definitive',{recursive:true});await fs.writeFile('test-results/auth-definitive/public-auth.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={main};
