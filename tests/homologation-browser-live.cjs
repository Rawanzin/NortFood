// Prova real de visitante/erro de login contra a homologacao. Sem mocks nem fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {randomUUID}=require('node:crypto'),{chromium}=require('playwright');
const {configuration}=require('../scripts/homologation-config.cjs');
async function main(){
 const c=configuration(),folder=path.resolve(__dirname,'../test-results/homologation');
 const report={target:new URL(c.url).hostname,scope:'Visitante real e login negativo; nao comprova login positivo ou envio de e-mail',checks:[],status:'REPROVADA'};
 let browser;try{
  const config=await (await fetch('http://localhost:4174/config.js')).text();assert.ok(config.includes(c.url));assert.ok(!config.includes('sb_secret_'));assert.ok(!config.includes('zwkhqahivthzivmuirjr'));
  report.checks.push('Servidor local usa exclusivamente a configuracao publica de homologacao');
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],responses=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(c.url))responses.push({path:new URL(r.url()).pathname,status:r.status()});});
  await page.goto('http://localhost:4174/#settings');await page.waitForURL('**/#home');
  await page.waitForFunction(()=>window.NortFoodBackend?.configured===true);
  await page.waitForResponse(r=>r.url().includes('/rest/v1/rpc/nf_catalog')&&r.status()===200).catch(()=>{assert.ok(responses.some(r=>r.path.endsWith('/nf_catalog')&&r.status===200));});
  report.checks.push('Catalogo real remoto carregado sem dados demonstrativos; rota protegida normalizada para #home');
  await page.locator('[data-action="auth"]').first().click();await page.locator('#auth-form').waitFor();await page.locator('[data-auth-mode=login]').click();
  assert.equal(await page.locator('#auth-email').getAttribute('type'),'email');assert.equal(await page.locator('#auth-password').getAttribute('minlength'),'1');
  await page.locator('#auth-email').fill('inexistente-'+randomUUID()+'@example.test');await page.locator('#auth-password').fill(randomUUID()+randomUUID());
  const denied=page.waitForResponse(r=>r.url().includes('/auth/v1/token')&&r.request().method()==='POST');await page.locator('#auth-form button[type="submit"]').click();assert.equal((await denied).status(),400);
  await page.waitForFunction(()=>!!document.querySelector('#auth-error')?.textContent.trim());
  report.checks.push('Login de identidade inexistente recusado pelo Supabase e erro apresentado pela interface');
  await page.locator('[data-action="recover-password"]').click();await page.locator('#recover-form input[type="email"]').waitFor();
  report.checks.push('Formulario de recuperacao acessivel; nenhum e-mail solicitado neste teste');
  await page.locator('[data-action="close-modal"]').click();
  for(const width of [390,1365]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(folder,'visitante-remoto-'+width+'.png')});}
  assert.deepEqual(errors,[]);report.checks.push('Celular e desktop sem rolagem horizontal ou erros JavaScript');report.responses=responses;report.status='APROVADA';
 }catch(error){report.error=error.message;process.exitCode=1;}finally{if(browser)await browser.close();await fs.mkdir(folder,{recursive:true});await fs.writeFile(path.join(folder,'browser-live-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
}
main();
