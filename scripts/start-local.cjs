// Somente homologacao. Reutiliza a instancia existente sem encerrar processos.
const ORIGIN='http://localhost:4174',TARGET='https://zrczgghucwsaxqnyaapk.supabase.co';
function parsePublicConfig(source){const match=String(source).trim().match(/^window\.NORTFOOD_CONFIG\s*=\s*Object\.freeze\((\{[\s\S]*\})\);?$/);if(!match)throw Error('LOCAL_SERVER_CONFIGURATION_INVALID');return JSON.parse(match[1]);}
async function start({fetchImpl=fetch,open=false}={}){
 const config=require('./homologation-config.cjs').configuration().publicConfig;if(config.supabaseUrl!==TARGET)throw Error('LOCAL_STAGING_TARGET_REQUIRED');
 let existing=false;
 try{const response=await fetchImpl(ORIGIN+'/config.js',{signal:AbortSignal.timeout(3000),cache:'no-store'});if(!response.ok)throw Error('LOCAL_PORT_IN_USE');const served=parsePublicConfig(await response.text());if(served.supabaseUrl!==TARGET||served.publishableKey!==config.publishableKey||served.appUrl!==ORIGIN)throw Error('LOCAL_PORT_WRONG_APPLICATION');existing=true;}
 catch(error){if(!['ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT'].includes(error.cause?.code))throw error;}
 const settings=await fetchImpl(TARGET+'/auth/v1/settings',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(12000)});if(!settings.ok)throw Error('SUPABASE_CONNECTION_NOT_VALIDATED');const auth=await settings.json();if(auth.external?.email!==true)throw Error('SUPABASE_EMAIL_AUTH_UNAVAILABLE');
 let app=null;if(!existing){app=await require('./serve.cjs').server({config,homologation:true});await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(4174,'127.0.0.1',resolve);});}
 console.log('NortFood HOMOLOGACAO: '+ORIGIN+' · conexao Auth validada. '+(existing?'Servidor existente reutilizado.':'Mantenha esta janela aberta.'));
 if(open&&process.platform==='win32'){
  const browser=require('node:child_process').spawn('explorer.exe',[ORIGIN],{windowsHide:true,stdio:'ignore'});
  browser.on('error',()=>console.error('Abra '+ORIGIN+' no navegador.'));browser.unref();
 }
 return {app,existing,origin:ORIGIN};
}
if(require.main===module)start({open:!process.argv.includes('--no-open')}).catch(error=>{const messages={LOCAL_PORT_WRONG_APPLICATION:'A porta 4174 pertence a outra configuracao. Nao foi alterada nem reiniciada.',LOCAL_PORT_IN_USE:'A porta 4174 esta em uso por outro servico.',SUPABASE_CONNECTION_NOT_VALIDATED:'A conexao com o Supabase nao foi validada. Confira a internet e a configuracao publica.',LOCAL_SERVER_CONFIGURATION_INVALID:'O servidor da porta 4174 nao forneceu uma configuracao NortFood valida.',SUPABASE_EMAIL_AUTH_UNAVAILABLE:'O provedor de e-mail nao esta habilitado no ambiente de homologacao.'};console.error(messages[error.message]||'Nao foi possivel iniciar a homologacao. Confira a configuracao local e a conexao; nenhum dado foi alterado.');process.exitCode=1;});
module.exports={start,parsePublicConfig,ORIGIN,TARGET};
