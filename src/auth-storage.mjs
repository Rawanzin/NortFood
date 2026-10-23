// O SDK continua gerenciando tokens. Esta camada escolhe apenas a duracao local.
export function createAuthStorage(local,session){
 const safe=storage=>{const fallback=new Map();return {getItem(key){if(fallback.has(key))return fallback.get(key);try{return storage?.getItem(key)??null}catch{return null}},setItem(key,value){try{if(!storage)throw Error();storage.setItem(key,value);fallback.delete(key)}catch{fallback.set(key,value)}},removeItem(key){fallback.delete(key);try{storage?.removeItem(key)}catch{}}};};
 local=safe(local);session=safe(session);
 const preference='nortfood-auth-session-only';let remember=session.getItem(preference)!=='yes';
 return {
  remember(value){remember=!!value;if(remember)session.removeItem(preference);else session.setItem(preference,'yes');},
  getItem(key){return (remember?local:session).getItem(key);},
  setItem(key,value){(remember?local:session).setItem(key,value);(remember?session:local).removeItem(key);},
  removeItem(key){local.removeItem(key);session.removeItem(key);},
 };
}
