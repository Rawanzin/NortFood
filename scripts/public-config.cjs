const fs=require('node:fs');
function publicConfig(production=false){
 if(fs.existsSync('.env'))process.loadEnvFile('.env');
 const url=process.env.NORTFOOD_SUPABASE_URL||'',key=process.env.NORTFOOD_SUPABASE_PUBLISHABLE_KEY||'',appUrl=process.env.NORTFOOD_APP_URL||'';
 if(key){let allowed=key.startsWith('sb_publishable_');if(!allowed&&key.split('.').length===3){try{allowed=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon'}catch{}}
 if(!allowed)throw Error('Somente chave pública publishable/anon pode configurar o frontend. Nunca use service_role ou secret.');}
 if(url){let parsed;try{parsed=new URL(url)}catch{throw Error('URL Supabase inválida.')}const local=['localhost','127.0.0.1'].includes(parsed.hostname);if(parsed.protocol!=='https:'&&!(local&&!production&&parsed.protocol==='http:'))throw Error('Supabase deve usar HTTPS (HTTP somente em testes localhost).');if(parsed.username||parsed.password)throw Error('URL pública não pode conter credenciais.');}
 return {mode:'commercial',supabaseUrl:url,publishableKey:key,appUrl};
}
module.exports={publicConfig};
