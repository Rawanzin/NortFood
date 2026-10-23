const assert=require('node:assert/strict');
async function assertPalette(page,theme){
 const result=await page.evaluate(()=>{
  const rows=[];
  for(const selector of ['body','.header','.nf-dock','.store-card','.product','.modal','.drawer','.history-card','.dash-card','.empty','.faq-item','.profile-links button','.search input','.field input','.field select','.field textarea','.nf-pwa-update']){
   for(const e of document.querySelectorAll(selector)){
    if(!e.getBoundingClientRect().width)continue;
    const c=getComputedStyle(e);rows.push({selector,background:c.backgroundColor,color:c.color});
   }
  }
  return {theme:document.documentElement.dataset.theme,rows,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 assert.equal(result.theme,theme);assert.equal(result.overflow,false);
 for(const row of result.rows){
  const channels=row.background.match(/[\d.]+/g)?.map(Number)||[];
  if(channels.length===4&&channels[3]===0)continue;
  const average=channels.slice(0,3).reduce((a,b)=>a+b,0)/3;
  assert.ok(theme==='dark'?average<110:average>210,theme+' '+row.selector+' retained incorrect background '+row.background);
 }
 return result;
}
module.exports={assertPalette};
