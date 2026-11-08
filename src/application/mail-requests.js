// Local UX guard only. Supabase remains responsible for enforcing rate limits.
export function createMailRequests({now=()=>Date.now(),interval=60000}={}){
 const attempts=new Map(),key=(action,email)=>action+':'+email.trim().toLowerCase();
 const status=(action,email)=>{const item=attempts.get(key(action,email));return {pending:item?.pending===true,seconds:Math.max(0,Math.ceil(((item?.until||0)-now())/1000))};};
 const note=(action,email)=>{const k=key(action,email),old=attempts.get(k);if(!old?.pending)attempts.set(k,{pending:false,until:Math.max(old?.until||0,now()+interval)});};
 return {status,note,async run(action,email,request){
  const previous=status(action,email);
  if(previous.pending||previous.seconds){const error=new Error(previous.pending?'Uma solicitação já está em andamento. Aguarde a resposta.':'Aguarde '+previous.seconds+' segundos antes de solicitar outro e-mail. O limite do provedor pode exigir uma espera maior.');error.code='mail_retry_wait';throw error;}
  const item={pending:true,until:now()+interval};attempts.set(key(action,email),item);
  try{return await request();}finally{item.pending=false;item.until=now()+interval;}
 }};
}
