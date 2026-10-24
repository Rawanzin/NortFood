// Rascunhos temporários da aba: UI e recibos Auth separados na mesma chave.
// Somente um recibo de envio pode conservar o aceite e ser vinculado a um UID.
export function createOnboardingDraft(storage, now = () => Date.now()) {
 const key='nortfood-onboarding-v1',ttl=86400000,maxForms=6,maxPending=8,maxBytes=65536;
 const addressLimits={street:180,number:30,neighborhood:80,city:80,state:2,postal_code:10,complement:100,reference:120};
 let fallback=null,hasMemory=false,sequence=0;
 const limited=(value,max)=>String(value??'').trim().slice(0,max),emailOf=value=>limited(value,254).toLowerCase(),validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),kindOf=value=>value==='seller'?'seller':'customer',copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
 function payload(value={}){return {kind:kindOf(value.kind),name:limited(value.name,80),phone:limited(value.phone,30),store_name:limited(value.store_name,80),category_id:limited(value.category_id,36),consent:value.consent===true,address:Object.fromEntries(Object.entries(addressLimits).map(([name,max])=>[name,limited(value.address?.[name],max)]))};}
 function formValues(value={},email=''){return {name:limited(value.name,80),identifier:email||limited(value.identifier,254),phone:limited(value.phone,30),storeName:limited(value.storeName,80),categoryId:limited(value.categoryId,36),...Object.fromEntries(Object.entries(addressLimits).map(([name,max])=>[name,limited(value[name],max)]))};}
 const empty=()=>({version:2,pending:[],forms:[]});
 const utf8Length=value=>{let size=0;for(const char of value){const code=char.codePointAt(0);size+=code<=127?1:code<=2047?2:code<=65535?3:4;}return size;};
 function normalize(value){
  const time=now(),pendingSource=value?.version===2?value.pending:value?.data?[value]:[],result=empty();
  for(const row of Array.isArray(pendingSource)?pendingSource.slice(0,maxPending):[]){const email=emailOf(row?.email);if(!validEmail(email)||!Number.isFinite(row.expires)||row.expires<=time||!row.data||result.pending.some(item=>item.email===email))continue;result.pending.push({email,userId:limited(row.userId,128)||null,expires:row.expires,data:payload(row.data)});}
  for(const row of Array.isArray(value?.forms)?value.forms.slice(0,maxForms):[]){
   if(!row||!Number.isFinite(row.expires)||row.expires<=time||!row.id||!row.data)continue;const email=emailOf(row.email),kind=kindOf(row.kind);
   if(email&&!validEmail(email)||result.forms.some(item=>item.id===row.id||email&&item.kind===kind&&item.email===email))continue;
   result.forms.push({id:limited(row.id,80),kind,email,expires:row.expires,updated:Number.isFinite(row.updated)?row.updated:time,step:Math.max(0,Math.min(2,Number(row.step)||0)),data:formValues(row.data,email)});
  }return result;
 }
 function write(value){const next=value&&(value.pending.length||value.forms.length)?value:null,serialized=next?JSON.stringify(next):null;if(serialized&&utf8Length(serialized)>maxBytes)return false;fallback=copy(next);hasMemory=true;try{if(serialized)storage?.setItem(key,serialized);else storage?.removeItem(key)}catch{}return true;}
 function read(){let value=fallback;if(!hasMemory)try{const raw=storage?.getItem(key);value=raw&&raw.length<=maxBytes&&utf8Length(raw)<=maxBytes?JSON.parse(raw):null}catch{value=null}const result=normalize(value);if(!result.pending.length&&!result.forms.length)write(null);return result;}
 const hint=email=>{if(!email)return 'Sem e-mail confirmado';const [local,domain]=email.split('@');return local.slice(0,2)+'•••'+(local.length>3?local.slice(-1):'')+'@'+domain;};
 return {
  save(email,value){
   if(!value)return false;email=emailOf(email);if(!validEmail(email))return false;const state=read(),previous=state.pending.find(row=>row.email===email);
   // Digitação e novas tentativas nunca substituem um recibo já vinculado.
   if(previous?.userId)return true;state.pending=state.pending.filter(row=>row.email!==email);
   if(state.pending.length>=maxPending){const index=state.pending.findIndex(row=>!row.userId);if(index<0)return false;state.pending.splice(index,1);}
   state.pending.push({email,userId:null,expires:now()+ttl,data:payload(value)});return write(state);
  },
  bind(email,userId){const state=read(),row=state.pending.find(item=>item.email===emailOf(email));if(!row||!userId||row.userId&&row.userId!==userId)return false;row.userId=limited(userId,128);return write(state);},
  get(email,userId){const row=read().pending.find(item=>item.email===emailOf(email));if(!row||row.userId&&row.userId!==userId)return null;return {...copy(row.data),bound:!!userId&&row.userId===userId};},
  clearPending(email,userId){if(!email||!userId)return;const state=read();state.pending=state.pending.filter(row=>row.email!==emailOf(email)||row.userId!==userId);write(state);},
  saveForm(kind,email,values,step=0,id=''){
   if(!['customer','seller'].includes(kind))return null;const state=read();email=emailOf(email);if(!validEmail(email))email='';const data=formValues(values,email);if(!Object.values(data).some(Boolean))return null;
   let previous=email?state.forms.find(row=>row.kind===kind&&row.email===email):state.forms.find(row=>row.id===id&&row.kind===kind&&!row.email);
   // Conhecer o e-mail não autoriza restaurar/substituir o rascunho de outra sessão de formulário.
   if(previous&&previous.id!==id)return {id:previous.id,email,step:previous.step,conflict:true};
   if(!previous&&email)previous=state.forms.find(row=>row.id===id&&row.kind===kind&&!row.email);
   if(!previous){do{id='form-'+now().toString(36)+'-'+(++sequence)}while(state.forms.some(row=>row.id===id))}else id=previous.id;
   state.forms=state.forms.filter(row=>row.id!==id);const row={id,kind,email,expires:now()+ttl,updated:now(),step:Math.max(0,Math.min(2,Number(step)||0)),data};state.forms.unshift(row);state.forms.sort((a,b)=>b.updated-a.updated);state.forms=state.forms.slice(0,maxForms);if(!write(state))return null;return {id,email,step:row.step};
  },
  getForm(kind,email){email=emailOf(email);if(!validEmail(email)||!['customer','seller'].includes(kind))return null;return copy(read().forms.find(row=>row.kind===kind&&row.email===email)||null);},
  listForms(kind,email){if(!['customer','seller'].includes(kind))return [];const exact=emailOf(email);return read().forms.filter(row=>row.kind===kind&&(!exact||row.email===exact)).sort((a,b)=>b.updated-a.updated).map(row=>({id:row.id,kind:row.kind,emailHint:hint(row.email),step:row.step}));},
  resumeForm(id,kind){if(!['customer','seller'].includes(kind))return null;return copy(read().forms.find(row=>row.id===id&&row.kind===kind)||null);},
  clearForms({email,kind,id}={}){if(kind&&!['customer','seller'].includes(kind))return;const state=read(),before=state.forms.length;state.forms=state.forms.filter(row=>!((!email||row.email===emailOf(email)||!row.email&&emailOf(row.data.identifier)===emailOf(email))&&(!kind||row.kind===kind)&&(!id||row.id===id)));if(before!==state.forms.length)write(state);},
  clear(){write(null)},
 };
}
