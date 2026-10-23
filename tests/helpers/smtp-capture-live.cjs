// Ensaio remoto opt-in. Somente SMTP de captura, conta comum sintetica e staging fixo.
// Credenciais, corpos de mensagens e links de acesso permanecem exclusivamente em memoria.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{createClient}=require('@supabase/supabase-js');
const {configuration}=require('../../scripts/homologation-config.cjs');
async function run(capture,{origin='http://localhost:4174',onAccount=()=>{}}={}){
 const c=configuration();assert.equal(c.url,'https://zrczgghucwsaxqnyaapk.supabase.co');
 assert.ok(['http://localhost:4174','https://lucky-lamington-022ea1.netlify.app'].includes(origin),'CONFIRMED_AUTH_ORIGIN_REQUIRED');
 assert.equal(capture.imap.host,'imap.ethereal.email');assert.equal(capture.imap.port,993);assert.equal(capture.imap.secure,true);
 const tools=createRequire(path.resolve(__dirname,'../../package.json')),{ImapFlow}=tools('imapflow'),{simpleParser}=tools('mailparser');
 const report={status:'PENDENTE',target:new URL(c.url).hostname,scope:'Supabase Auth remoto com SMTP/IMAP Ethereal; nao comprova entrega externa ou interface HTTPS',checks:[],externalDelivery:false,productionModified:false};
 const output=path.resolve(__dirname,'../../test-results/homologation/'+(origin.startsWith('https:')?'smtp-https-redirect-result.json':'smtp-capture-live-result.json'));report.redirectOrigin=origin;
 const imap=new ImapFlow({host:capture.imap.host,port:993,secure:true,auth:{user:capture.user,pass:capture.pass},logger:false,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000});
 imap.on('error',()=>{});
 const client=createClient(c.url,c.publicConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),password=crypto.randomUUID()+crypto.randomUUID(),nextPassword=crypto.randomUUID()+crypto.randomUUID();
 const email='nortfood-smtp-'+crypto.randomUUID().slice(0,8)+'@example.test';const seen=new Set();
 async function mailLink(type){
  for(let attempt=0;attempt<24;attempt++){
   await imap.mailboxOpen('INBOX',{readOnly:true});
   const ids=await imap.search({to:email},{uid:true});
   for(const uid of ids){if(seen.has(uid))continue;const msg=await imap.fetchOne(uid,{source:true},{uid:true});const parsed=await simpleParser(msg.source,{maxHtmlLengthToParse:100000});
    assert.ok(parsed.to.value.some(v=>v.address===email),'SMTP_RECIPIENT_MISMATCH');
    const html=String(parsed.html||'');assert.match(html,/homologa[çc][aã]o/i,'STAGING_TEMPLATE_REQUIRED');
    const candidates=[...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1].replaceAll('&amp;','&'));
    const link=candidates.find(v=>{try{const u=new URL(v);return u.origin===c.url&&u.pathname==='/auth/v1/verify'&&u.searchParams.get('type')===type;}catch{return false;}});
    seen.add(uid);if(link)return link;
   }
   await new Promise(r=>setTimeout(r,2000));
  }throw Error('SMTP_MESSAGE_NOT_RECEIVED_'+type.toUpperCase());
 }
 async function consume(link){const r=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.ok([302,303].includes(r.status),'AUTH_VERIFY_REDIRECT_REQUIRED');const u=new URL(r.headers.get('location'));assert.equal(u.origin,origin);const tokens=new URLSearchParams(u.hash.slice(1));assert.ok(tokens.get('access_token')&&tokens.get('refresh_token'),'EMAIL_LINK_DID_NOT_CREATE_SESSION');const s=await client.auth.setSession({access_token:tokens.get('access_token'),refresh_token:tokens.get('refresh_token')});assert.equal(s.error,null);return u;}
 try{
  await imap.connect();report.checks.push('SMTP capture accessible over verified IMAP TLS');
  const signup=await client.auth.signUp({email,password,options:{emailRedirectTo:origin,data:{name:'CONTA SINTETICA SMTP — HOMOLOGACAO'}}});assert.equal(signup.error,null,'NORMAL_SIGNUP_FAILED');assert.ok(signup.data.user?.id);assert.equal(signup.data.session,null);report.userId=signup.data.user.id;
  const before=await client.auth.signInWithPassword({email,password});assert.ok(before.error,'UNCONFIRMED_LOGIN_MUST_FAIL');report.checks.push('Normal public signup accepted; unconfirmed login refused');
  const confirmation=await mailLink('signup');await consume(confirmation);const user=await client.auth.getUser();assert.equal(user.data.user.email,email);assert.ok(user.data.user.email_confirmed_at);assert.equal((await client.rpc('nf_context')).data?.is_admin,false);report.checks.push('Confirmation received via real SMTP capture and link confirmed common account');
  await client.auth.signOut();assert.equal((await client.auth.signInWithPassword({email,password})).error,null);await client.auth.signOut();report.checks.push('Confirmed account login and logout');
  const reset=await client.auth.resetPasswordForEmail(email,{redirectTo:origin});assert.equal(reset.error,null);const recovery=await mailLink('recovery');await consume(recovery);assert.equal((await client.auth.updateUser({password:nextPassword})).error,null);await client.auth.signOut();assert.ok((await client.auth.signInWithPassword({email,password})).error);assert.equal((await client.auth.signInWithPassword({email,password:nextPassword})).error,null);await client.auth.signOut();report.checks.push('Recovery received via SMTP; password changed; previous password refused');
  for(const link of [confirmation,recovery]){const r=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(20000)});const location=r.headers.get('location')||'';assert.ok(!new URLSearchParams(new URL(location).hash.slice(1)).has('access_token'),'REPLAY_CREATED_SESSION');}report.checks.push('Both email links refused after consumption');report.status='APROVADA';onAccount({email,password:nextPassword,id:report.userId});
 }catch(error){report.status='REPROVADA';report.reason=String(error.message).replace(/https?:\/\/\S+/g,'[URL omitida]');throw error;}
 finally{await client.auth.signOut().catch(()=>{});client.realtime.disconnect();await imap.logout().catch(()=>{});fs.writeFileSync(output,JSON.stringify(report,null,2));}
 return report;
}
module.exports={run};
