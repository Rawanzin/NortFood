// Lido exclusivamente no servidor; nunca retornar ou registrar estes valores.
export function configuredOrigin(value){try{const u=new URL(value);return u.origin===value&&!u.username&&!u.password&&(u.protocol==='https:'||u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))?u.origin:'';}catch{return '';}}
export function runtimeConfig(env){
 const key=(dictionary,legacy)=>{
  const raw=env.get(dictionary);
  if(raw){try{const values=JSON.parse(raw);if(values&&typeof values==='object'&&!Array.isArray(values)&&typeof values.default==='string'&&values.default.trim())return values.default;}catch{throw Error('SERVER_CONFIGURATION_INVALID');}}
  const fallback=env.get(legacy);if(typeof fallback==='string'&&fallback.trim())return fallback;
  throw Error('SERVER_CONFIGURATION_MISSING');
 };
 const url=env.get('SUPABASE_URL');
 if(!url)throw Error('SERVER_CONFIGURATION_MISSING');
 const parsed=new URL(url);
 if(parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/'||!(parsed.protocol==='https:'||parsed.protocol==='http:'&&['localhost','127.0.0.1'].includes(parsed.hostname)))throw Error('SERVER_CONFIGURATION_INVALID');
 return {url,publishable:key('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),secret:key('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY')};
}
