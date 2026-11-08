const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{chromium}=require('playwright'),{server}=require('../scripts/serve.cjs');
const folder='test-results/ux-map-20261029';
async function launch(){const app=await server({config:{}});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({channel:'chrome',headless:true});return {app,browser,origin:'http://127.0.0.1:'+app.address().port,async close(){await browser.close();app.closeAllConnections();await new Promise(resolve=>app.close(resolve));}};}
async function fixture(page,origin,theme='light'){
 await page.emulateMedia({colorScheme:theme==='light'?'dark':'light'});
 await page.addInitScript(theme=>{localStorage.setItem('nortfood-theme',theme);window.__gpsCalls=0;window.__gpsError=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success,error){window.__gpsCalls++;if(window.__gpsError)error({code:window.__gpsError});else success({coords:{latitude:-15.7439,longitude:-43.0247}});}}});},theme);
 await page.goto(origin+'/?demo=1#home',{waitUntil:'domcontentloaded'});await page.locator('[data-nearby-map]').waitFor();await page.addStyleTag({url:origin+'/assets/nearby-map.css'});
 await page.evaluate(()=>{
  window.__selectEvents=[];window.__confirmEvents=[];window.__queries=[];window.__openStore='';
  const modal=html=>{NortFoodNearby.dispose();document.querySelector('.modal-scrim')?.remove();document.body.insertAdjacentHTML('beforeend','<div class="modal-scrim"><section class="modal">'+html+'</section></div>');};
  window.__nearbyOptions={modal,selected:null,onStore:id=>{window.__openStore=id;document.querySelector('.modal-scrim')?.remove();},onSelect:point=>window.__selectEvents.push(point),onConfirm:point=>window.__confirmEvents.push(point),search:async query=>{window.__queries.push(query);return [{lat:'-15.7439',lon:'-43.0247',display_name:'Rua de teste, Centro, Porteirinha, MG'}];},stores:[
   {id:'active',name:'Loja ativa do teste',category:'Lanches',logo:'/assets/favicon-32.png',status:'approved',paused:false,serverOpen:true,latitude:-15.7439,longitude:-43.0247},
   {id:'closed',name:'Loja fora do horário',category:'Bebidas',status:'approved',paused:false,serverOpen:false,latitude:-15.7459,longitude:-43.0287},
   {id:'paused',name:'Pausada privada',status:'approved',paused:true,latitude:-15.7439,longitude:-43.0247},
   {id:'draft',name:'Rascunho privado',status:'draft',paused:false,latitude:-15.7439,longitude:-43.0247},
   {id:'suspended',name:'Suspensa privada',status:'suspended',paused:false,latitude:-15.7439,longitude:-43.0247},
   {id:'unpublished',name:'Não publicada',status:'approved',published:false,latitude:-15.7439,longitude:-43.0247},
   {id:'inactive',name:'Inativa privada',status:'approved',active:false,latitude:-15.7439,longitude:-43.0247},
   {id:'private',name:'Privada',status:'approved',public:false,latitude:-15.7439,longitude:-43.0247},
   {id:'invalid',name:'Sem coordenadas',status:'approved',latitude:null,longitude:null}
  ]};window.__storageBefore={local:JSON.stringify(localStorage),session:JSON.stringify(sessionStorage)};NortFoodNearby.open(window.__nearbyOptions);
 });
 await page.locator('[data-nearby-canvas].leaflet-container').waitFor();
}
async function contrast(page,selectors){return page.evaluate(selectors=>{
 const rgb=value=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);const luminance=color=>rgb(color).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
 const background=element=>{for(let next=element;next;next=next.parentElement){const value=getComputedStyle(next).backgroundColor;if(value!=='rgba(0, 0, 0, 0)'&&value!=='transparent')return value;}return 'rgb(255, 255, 255)';};
 const ratio=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);};
 return selectors.map(selector=>{const element=document.querySelector(selector);if(!element)throw Error('Missing contrast target '+selector);const style=getComputedStyle(element),bg=background(element);return {selector,color:style.color,background:bg,textRatio:ratio(style.color,bg),edgeRatio:ratio(style.borderTopColor,background(element.parentElement)),fillRatio:ratio(bg,background(element.parentElement)),box:element.getBoundingClientRect().toJSON()};});
 },selectors);}
test('Mapa: somente lojas públicas ativas; GPS, busca, popup e região persistem sem salvar endereço',{timeout:60000},async()=>{
 const runtime=await launch(),page=await runtime.browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{await fixture(page,runtime.origin);assert.equal(await page.locator('[data-nearby-store]').count(),2);assert.equal(await page.locator('[data-nearby-count]').innerText(),'2 lojas publicadas');assert.equal(await page.evaluate(()=>window.__gpsCalls),0);assert.equal(await page.locator('[data-nearby-confirm]').isDisabled(),true);
  await page.locator('.leaflet-marker-icon[title="Loja ativa do teste"]').click();const popup=page.locator('.nf-nearby-popup');await popup.waitFor();assert.match(await popup.innerText(),/Loja ativa do teste/);assert.match(await popup.innerText(),/Lanches/);assert.equal(await popup.locator('img').count(),1);await page.locator('.leaflet-popup-close-button').click();
  await page.evaluate(()=>window.__gpsError=1);await page.locator('[data-nearby-gps]').click();assert.match(await page.locator('[data-nearby-status]').innerText(),/Permissão negada/);assert.equal(await page.locator('[data-nearby-gps]').isEnabled(),true);
  await page.locator('[data-nearby-canvas]').click({position:{x:75,y:110}});assert.match(await page.locator('[data-nearby-status]').innerText(),/Ponto escolhido/);assert.ok(await page.evaluate(()=>NortFoodNearby.getSelected()));assert.equal(await page.locator('[data-nearby-confirm]').isEnabled(),true);
  for(const query of ['Rua de teste, Porteirinha','Centro, Porteirinha','Porteirinha, MG','39520-000']){await page.locator('#nearby-query').fill(query);await page.locator('[data-nearby-search] button').click();await page.locator('[data-nearby-results] button').click();}
  assert.deepEqual(await page.evaluate(()=>window.__queries),['Rua de teste, Porteirinha','Centro, Porteirinha','Porteirinha, MG','39520-000']);assert.equal(await page.locator('[data-nearby-confirm]').isEnabled(),true);assert.equal(await page.locator('[data-nearby-confirm]').innerText(),'Confirmar localização');
  await page.locator('[data-nearby-confirm]').click();const selected=await page.evaluate(()=>NortFoodNearby.getSelected());assert.deepEqual(selected,{lat:-15.7439,lng:-43.0247});assert.deepEqual(await page.evaluate(()=>window.__confirmEvents),[selected]);
  await page.evaluate(()=>{NortFoodNearby.dispose();document.querySelector('.modal-scrim').remove();const {selected,...options}=window.__nearbyOptions;NortFoodNearby.open(options);});await page.locator('[data-nearby-canvas].leaflet-container').waitFor();assert.equal(await page.locator('[data-nearby-confirm]').isEnabled(),true);assert.match(await page.locator('[data-nearby-status]').innerText(),/restaurada/);assert.deepEqual(await page.evaluate(()=>NortFoodNearby.getSelected()),selected);
  await page.evaluate(()=>{const point=NortFoodNearby.getSelected();point.lat=0;});assert.deepEqual(await page.evaluate(()=>NortFoodNearby.getSelected()),selected);
  await page.evaluate(()=>window.__gpsError=0);await page.locator('[data-nearby-gps]').click();assert.match(await page.locator('[data-nearby-status]').innerText(),/foi obtida/);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('nortfood-explored-region-v1')).point),selected);
  assert.deepEqual(await page.evaluate(()=>{const session={...sessionStorage};delete session['nortfood-explored-region-v1'];return {local:JSON.stringify(localStorage),session:JSON.stringify(session)}}),await page.evaluate(()=>window.__storageBefore));
  await page.locator('.leaflet-marker-icon[title="Loja ativa do teste"]').click();await page.locator('.nf-nearby-popup [data-nearby-menu]').click();assert.equal(await page.evaluate(()=>window.__openStore),'active');
  await page.reload();await page.locator('[data-nearby-map]').waitFor();assert.deepEqual(await page.evaluate(()=>NortFoodNearby.getSelected()),selected);assert.deepEqual(errors,[]);
 }finally{await runtime.close();}
});
test('Mapa: contraste real nos temas opostos ao sistema, controles e layout 320–1365px',{timeout:90000},async()=>{
 const runtime=await launch(),report={at:new Date().toISOString(),scope:'Chrome real, lojas e busca sintéticas locais, temas explícitos com SO oposto',checks:[],screenshots:[]},errors=[];
 try{await fs.mkdir(folder,{recursive:true});for(const theme of ['light','dark']){const page=await runtime.browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});page.on('pageerror',error=>errors.push(error.message));await fixture(page,runtime.origin,theme);await page.locator('[data-nearby-gps]').click();assert.equal(await page.locator('[data-nearby-confirm]').isEnabled(),true);
   for(const width of [320,375,390,430,1365]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const modal=page.locator('.nf-nearby-modal'),box=await modal.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);assert.equal(await modal.evaluate(element=>element.scrollWidth<=element.clientWidth),true);
    const values=await contrast(page,['.nf-nearby-head h2','.nf-nearby-head p','.nf-nearby-gps','.nf-nearby-search-row button','[data-nearby-confirm]','.nf-nearby-store-line h3','.nf-nearby-store-copy p','[data-nearby-status]','.nf-nearby-note','.nf-nearby-hint']);for(const result of values)assert.ok(result.textRatio>=4.5,theme+' '+width+' '+result.selector+' ratio '+result.textRatio);
    const controls=await contrast(page,['.nf-nearby-map-controls button','.nf-nearby-head .close','.nf-nearby-search-row button','[data-nearby-confirm]']);for(const result of controls){assert.ok(Math.max(result.fillRatio,result.edgeRatio)>=3,theme+' '+result.selector+' limite do controle '+JSON.stringify(result));assert.ok(result.box.width>=44&&result.box.height>=44);}
    report.checks.push({theme,width,text:values.map(({selector,textRatio})=>({selector,ratio:Number(textRatio.toFixed(2))})),controls:controls.map(({selector,edgeRatio,fillRatio})=>({selector,ratio:Number(Math.max(edgeRatio,fillRatio).toFixed(2))}))});
    if([320,390,1365].includes(width)){await page.locator('[data-nearby-canvas]').scrollIntoViewIfNeeded();await page.waitForTimeout(300);const filename=folder+'/map-'+theme+'-'+width+'.png';await page.screenshot({path:filename});report.screenshots.push(filename);}
   }
   await page.setViewportSize({width:390,height:844});await page.locator('.leaflet-marker-icon[title="Loja ativa do teste"]').click();await page.locator('.nf-nearby-popup').waitFor();for(const result of await contrast(page,['.nf-nearby-popup strong','.nf-nearby-popup small','.nf-nearby-popup .btn']))assert.ok(result.textRatio>=4.5,theme+' popup '+result.selector+' ratio '+result.textRatio);await page.close();
  }assert.deepEqual(errors,[]);report.passed=true;
 }catch(error){report.passed=false;report.failure=error.message;throw error;}finally{report.errors=errors;await fs.mkdir(folder,{recursive:true});await fs.writeFile(folder+'/visual-contrast.json',JSON.stringify(report,null,2));await runtime.close();}
});
