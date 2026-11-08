// The SDK can consume an implicit recovery callback before the application
// subscribes. Capture its token privately, then recover the missed intent only
// after the exact token and active identity have both been verified.
export function createRecoveryVerification({hash='',getClient,identity}){
 const fragment=new URLSearchParams(hash.replace(/^#/,''));
 let token=fragment.get('type')==='recovery'&&!fragment.has('error')&&!fragment.has('error_code')?fragment.get('access_token'):null;
 let pending=null,completed=false,verified=false,bound=null;
 fragment.delete('access_token');hash='';
 const sameIdentity=()=>{const current=identity();return !!bound?.id&&current.id===bound.id&&current.revision===bound.revision;};
 return async function recoveryVerified(){
  // This intent is consumed once. Reinitializing the same session after a
  // successful password change must not reactivate recovery from an old URL.
  if(completed)return false;
  if(pending){await pending;return sameIdentity()&&verified;}
  if(!token)return false;
  bound={...identity()};
  pending=(async()=>{
   try{
    const client=getClient();if(!bound.id||!client)return;
    const result=await client.auth.getUser(token);
    if(result.error||!sameIdentity())return;
    const active=await client.auth.getSession();if(active.error||!sameIdentity())return;
    const serverUser=result.data?.user,session=active.data?.session;
    verified=!!(serverUser?.id===bound.id&&serverUser.email_confirmed_at&&session?.access_token===token&&session.user?.id===serverUser.id);
   }catch{verified=false;}
   finally{token=null;completed=true;}
  })();
  await pending;return sameIdentity()&&verified;
 };
}
