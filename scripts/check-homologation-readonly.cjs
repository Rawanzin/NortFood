// Somente consultas/operacoes recusadas; nunca cria usuarios, lojas ou pedidos.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {configuration}=require('./homologation-config.cjs');
async function main(){const c=configuration(),headers={apikey:c.publicConfig.publishableKey,'Content-Type':'application/json'},results=[];
 async function probe(name,route,status,extra={},method='GET',body){const r=await fetch(c.url+route,{method,headers:{...headers,...extra},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});results.push({name,status:r.status,expected:status,approved:r.status===status});assert.equal(r.status,status,name);return r;}
 await probe('catalog','/rest/v1/rpc/nf_catalog',200);
 const operating=await probe('pilot','/rest/v1/rpc/nf_operating_status',200);assert.equal(await operating.json(),false);
 const settings=await (await probe('auth_settings','/auth/v1/settings',200)).json();assert.equal(settings.disable_signup,false);assert.equal(settings.mailer_autoconfirm,false);
 await probe('coordinates_readable','/rest/v1/stores?select=id,latitude,longitude,tables_enabled&limit=0',200);
 await probe('status_reason_denied','/rest/v1/stores?select=status_reason&limit=0',401);
 await probe('history_denied','/rest/v1/rpc/nf_order_history',401);
 await probe('private_not_exposed','/rest/v1/admin_users?select=user_id&limit=0',406,{'Accept-Profile':'private'});
 for(const t of ['profiles','orders','messages','commission_ledger'])await probe(t+'_denied','/rest/v1/'+t+'?select=*&limit=0',401);
 await probe('upload_preflight','/functions/v1/upload-media',200,{Origin:'http://localhost:4174','Access-Control-Request-Method':'POST'},'OPTIONS');
 await probe('upload_without_identity','/functions/v1/upload-media',401,{Origin:'http://localhost:4174'},'POST',{});
 await probe('upload_foreign_origin','/functions/v1/upload-media',403,{Origin:'https://invalid.example'},'POST',{});
 const weak=await probe('weak_password_refused','/auth/v1/signup',422,{},'POST',{email:'weak-password-test@example.test',password:'12345678'});const weakBody=await weak.json();assert.match(weakBody.msg||weakBody.message||'',/12/);
 const report={target:new URL(c.url).hostname,status:'APROVADA',scope:'Consultas anonimas e validacoes negativas reais. Sem fixtures, login positivo ou entrega de e-mail.',results};const target=path.resolve(__dirname,'../test-results/homologation/readonly-result.json');fs.writeFileSync(target,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
main().catch(e=>{console.error('Verificacao reprovada: '+e.message);process.exitCode=1;});
