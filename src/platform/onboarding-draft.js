// Rascunho temporário por identidade; nunca contém senha nem entra no cache do PWA.
export function createOnboardingDraft(storage,now=()=>Date.now()){
 const key='nortfood-onboarding-v1';let fallback=null,hasMemory=false;
 const read=()=>{let raw;try{raw=storage?.getItem(key)}catch{}let value;if(hasMemory)value=fallback;else try{value=JSON.parse(raw||'null')}catch{value=null}if(!value||!Number.isFinite(value.expires)||value.expires<=now()){try{storage?.removeItem(key)}catch{}fallback=null;hasMemory=true;return null;}return value;};
 const write=value=>{fallback=value;hasMemory=true;try{if(value)storage?.setItem(key,JSON.stringify(value));else storage?.removeItem(key)}catch{}};
 const limited=(value,max)=>String(value||'').trim().slice(0,max);
 return {
  save(email,payload){if(!payload)return;const normalizedEmail=limited(email,254).toLowerCase(),previous=read();
   // Repetir signUp não pode apagar os dados já vinculados à conta que aguarda confirmação.
   if(previous?.email===normalizedEmail&&previous.userId)return;
   const a=payload.address||{},data={kind:payload.kind==='seller'?'seller':'customer',name:limited(payload.name,80),phone:limited(payload.phone,30),store_name:limited(payload.store_name,80),category_id:limited(payload.category_id,36),consent:payload.consent===true,address:Object.fromEntries(['street','number','neighborhood','city','state','complement','reference'].map(k=>[k,limited(a[k],k==='street'?180:k==='reference'?120:k==='complement'?100:80)]))};write({email:normalizedEmail,userId:null,expires:now()+86400000,data});},
  bind(email,userId){const value=read();if(value?.email===String(email).toLowerCase()&&(!value.userId||value.userId===userId)){value.userId=userId;write(value);}},
  get(email,userId){const value=read();return value?.email===String(email||'').toLowerCase()?{...value.data,bound:!!userId&&value.userId===userId}:null;},
  clear(){write(null);},
 };
}
