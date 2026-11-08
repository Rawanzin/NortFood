const confirmationTypes=new Set(['signup','email','email_change']);

function verificationFailure(error){
 const code=error?.code||error?.error_code;
 if(['otp_expired','jwt_expired','session_expired'].includes(code))return {status:'expired',serverVerified:false};
 if(error?.status>=500||error?.name==='AuthRetryableFetchError'||error?.name==='TypeError'||['request_timeout','unexpected_failure'].includes(code))return {status:'unavailable',serverVerified:false};
 return {status:'invalid',serverVerified:false};
}

// Captura o retorno antes de o SDK consumir o fragmento. O token fica apenas
// nesta closure até a primeira verificação; nunca é retornado, gravado ou logado.
export function createConfirmationVerification({hash='',search='',getClient,identity}){
 const fragment=new URLSearchParams(hash.replace(/^#/,'')),query=new URLSearchParams(search);
 const type=fragment.get('type')||query.get('type');
 const errorCode=fragment.get('error_code')||query.get('error_code');
 const error=fragment.get('error')||query.get('error');
 const confirmation=confirmationTypes.has(type);
 const attempted=type!=='recovery'&&(confirmation||!type&&errorCode==='otp_expired');
 let token=confirmation?fragment.get('access_token'):null,pending=null,completed=false,cached=null,bound=null;
 fragment.delete('access_token');hash='';search='';
 const sameIdentity=()=>{const now=identity();return bound&&now.id===bound.id&&now.revision===bound.revision;};
 const read=()=>sameIdentity()&&cached?{...cached}:null;
 return async function confirmationResult(){
  if(!attempted)return null;
  if(completed)return read();
  if(pending){await pending;return read();}
  bound=identity();
  pending=(async()=>{
   try{
    if(error||errorCode){cached=verificationFailure({code:errorCode||error});return;}
    const client=getClient();
    if(!token||!client){cached={status:'invalid',serverVerified:false};return;}
    const verified=await client.auth.getUser(token);
    if(verified.error){cached=verificationFailure(verified.error);return;}
    const active=await client.auth.getSession();
    if(active.error){cached=verificationFailure(active.error);return;}
    const session=active.data?.session,serverUser=verified.data?.user;
    const valid=serverUser?.id&&serverUser.email_confirmed_at&&session?.access_token===token&&session.user?.id===serverUser.id&&bound.id===serverUser.id;
    cached=valid?{status:'verified',serverVerified:true}:{status:'invalid',serverVerified:false};
   }catch(error){cached=verificationFailure(error);}
   finally{token=null;completed=true;}
  })();
  await pending;return read();
 };
}
