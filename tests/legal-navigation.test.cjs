// Regressao de UI LOCAL. Identidade controlada, sem Supabase remoto.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
async function fixture(run){const root=path.resolve(__dirname,'..');const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/config.js'){res.setHeader('Content-Type','text/javascript');res.end('window.NORTFOOD_CONFIG={}');return;}const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error();let body=await fs.readFile(file);if(pathname==='/assets/nortfood-backend.js')body=body.toString()+`;(()=>{const api=window.NortFoodBackend;api.configured=true;api.initialize=async()=>{};api.context=async()=>location.search.includes('customer')?{profile:{id:'local-ui-fixture',name:'Teste local',notifications_enabled:true},user:{id:'local-ui-fixture',email:'ui@example.test'},memberships:[],is_admin:false}:null;api.load=async()=>({catalog:[],categories:[],snapshot:{},pilotEnabled:false});})();`;res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});let browser;try{await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.NORTFOOD_BROWSER?{executablePath:process.env.NORTFOOD_BROWSER}:{channel:'chrome'})});await run(browser,'http://127.0.0.1:'+server.address().port);}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}}
test('Visitante: rota protegida normaliza URL e historico sem permitir retorno a settings',async()=>fixture(async(browser,base)=>{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#settings');await page.waitForURL('**/#home');assert.equal(await page.locator('[data-action=terms]').count(),0);
 await page.evaluate(()=>location.hash='help');await page.waitForURL('**/#help');
 await page.evaluate(()=>location.hash='settings');await page.waitForURL('**/#home');assert.equal(await page.evaluate(()=>history.state.nortfood.view),'home');
 await page.goBack();await page.waitForURL('**/#help');await page.goForward();await page.waitForURL('**/#home');
 for(const route of ['profile','orders','seller','admin']){await page.evaluate(route=>location.hash=route,route);await page.waitForURL('**/#home');}
 assert.deepEqual(errors,[]);
}));
test('Cliente: Termos abre pagina comercial identificada como rascunho e Voltar preserva settings',async()=>fixture(async(browser,base)=>{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?customer#settings');await page.waitForSelector('[data-action=terms]');
 assert.equal(new URL(page.url()).hash,'#settings');await page.locator('[data-action=terms]').click();await page.waitForURL(url=>url.hash==='#legal');
 const notice=await page.locator('#legal-draft-notice').innerText();assert.match(notice,/Rascunho para revisão/);assert.match(notice,/não aprovado juridicamente/);
 assert.ok((await page.locator('#legal-draft-notice').boundingBox()).y>=0,'Aviso de rascunho deve aparecer ao abrir os termos');
 const content=await page.locator('main').innerText();assert.match(content,/Porteirinha/);assert.match(content,/sete dias após a conclusão/);assert.match(content,/não possui entregadores próprios/);assert.doesNotMatch(content,/armazena dados somente neste navegador|Pedidos e mensagens não são enviados/);
 for(const width of [390,1365]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await fs.mkdir(path.resolve(__dirname,'../test-results/homologation'),{recursive:true});await page.screenshot({path:path.resolve(__dirname,'../test-results/homologation/termos-rascunho.png')});
 await page.goBack();await page.waitForURL(url=>url.hash==='#settings');assert.equal(await page.locator('[data-action=terms]').count(),1);assert.deepEqual(errors,[]);
}));
