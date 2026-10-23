const fs=require('node:fs');
function publicConfig(production=false){
 if(fs.existsSync('.env'))process.loadEnvFile('.env');
 const url=process.env.NORTFOOD_SUPABASE_URL||'',key=process.env.NORTFOOD_SUPABASE_PUBLISHABLE_KEY||'',appUrl=process.env.NORTFOOD_APP_URL||'';
 if(key){let allowed=key.startsWith('sb_publishable_');if(!allowed&&key.split('.').length===3){try{allowed=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon'}catch{}}
 if(!allowed)throw Error('Somente chave pública publishable/anon pode configurar o frontend. Nunca use service_role ou secret.');}
 if(url){let parsed;try{parsed=new URL(url)}catch{throw Error('URL Supabase inválida.')}const local=['localhost','127.0.0.1'].includes(parsed.hostname);if(parsed.protocol!=='https:'&&!(local&&!production&&parsed.protocol==='http:'))throw Error('Supabase deve usar HTTPS (HTTP somente em testes localhost).');if(parsed.username||parsed.password)throw Error('URL pública não pode conter credenciais.');if(parsed.pathname!=='/'||parsed.search||parsed.hash)throw Error('Use a Project URL raiz do Supabase, sem /rest/v1, /auth/v1, query ou fragmento.');}
 if(appUrl){let parsed;try{parsed=new URL(appUrl)}catch{throw Error('URL pública do NortFood inválida.')}if(parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash||!(parsed.protocol==='https:'||parsed.protocol==='http:'&&['localhost','127.0.0.1'].includes(parsed.hostname)))throw Error('URL pública do NortFood deve ser uma origem HTTPS, ou HTTP somente em localhost, sem credenciais, caminho, query ou fragmento.');}
 const result={mode:'commercial',supabaseUrl:url,publishableKey:key,appUrl:appUrl?new URL(appUrl).origin:''};
 if(process.env.NORTFOOD_PUBLIC_PREVIEW==='yes')result.publicPreview=true;
 if(process.env.NORTFOOD_ENABLE_INDEXING==='yes'){if(!require('./site-artifacts.cjs').publicOrigin(result))throw Error('Indexacao exige dominio HTTPS real.');result.indexingEnabled=true;}
 const measurementId=process.env.NORTFOOD_GA4_MEASUREMENT_ID||'';
 if(measurementId){if(!/^G-[A-Z0-9]{5,20}$/.test(measurementId))throw Error('Measurement ID do GA4 invalido.');if(process.env.NORTFOOD_GA4_AUTOMATIC_MEASUREMENT_DISABLED==='yes'&&require('./site-artifacts.cjs').publicOrigin(result))result.analyticsMeasurementId=measurementId;}
 return result;
}
module.exports={publicConfig};
