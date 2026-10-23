// Catálogo editorial permanente. Não representa lojas, produtos ou disponibilidade.
const entries = [
 ['burgers','Hambúrgueres','categoria-lanches.webp',['lanches','hamburguer','hamburgueres']],
 ['pizza','Pizzas','categoria-pizza.webp',['pizza','pizzas','pizzaria','pizzarias']],
 ['acai','Açaí','categoria-acai.webp',['acai']],
 ['sweets','Doces','categoria-doces.webp',['doces']],
 ['savory','Salgados','categoria-salgados.webp',['salgados']],
 ['ice-cream','Sorvetes','categoria-sorvetes.webp',['sorvete','sorvetes']],
 ['meals','Marmitas','categoria-refeicoes.webp',['marmita','marmitas']],
 ['drinks','Bebidas','categoria-bebidas.webp',['bebidas']],
 ['bakery','Padarias','categoria-salgados.webp',['padaria','padarias']],
 ['markets','Mercados','categoria-todos.webp',['mercado','mercados']],
 ['other','Outros','categoria-todos.webp',['outros']]
];
const normalize = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function categoryKey(value){const key=normalize(value);return entries.find(row=>row[3].includes(key))?.[0]||key;}
export const baseCategories=Object.freeze(entries.map(([key,label,file],i)=>Object.freeze({id:'c0000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),key,label,asset:'assets/optimized/'+file})));
export function mergeCategories(rows=[]){
 const result=[{id:'all',label:'Todos',asset:'assets/optimized/categoria-todos.webp'},...baseCategories.map(base=>{
  const row=rows.find(row=>categoryKey(row.name)===base.key);return {...base,id:row?.id||base.id};
 })];
 for(const row of rows)if(!baseCategories.some(base=>base.key===categoryKey(row.name)))result.push({id:row.id,label:row.name,asset:'assets/optimized/categoria-todos.webp'});
 return result;
}
