const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),esbuild=require('esbuild');

async function ui(){const built=await esbuild.build({entryPoints:[path.resolve('assets/auth-confirmation-ui.js')],bundle:true,format:'cjs',write:false});const box={module:{exports:{}}};vm.runInNewContext(built.outputFiles[0].text,box);return box.module.exports;}

test('Confirmação não exibe sucesso sem resultado Auth verificado no servidor',async()=>{
 const {confirmationResultHTML}=await ui();
 for(const result of [{},{status:'verified'},{status:'verified',serverVerified:false},{status:'verified',serverVerified:'true'},{status:'invalid',serverVerified:true}]){
  const html=confirmationResultHTML(result);assert.doesNotMatch(html,/E-mail confirmado!|data-confirmation-continue/);assert.match(html,/data-action="resend-confirmation"/);assert.match(html,/data-auth-mode="login"/);assert.match(html,/id="auth-confirmation-error"/);assert.doesNotMatch(html,/id="auth-error"/);
 }
 const success=confirmationResultHTML({status:'verified',serverVerified:true});assert.match(success,/E-mail confirmado!/);assert.match(success,/data-confirmation-continue/);assert.doesNotMatch(success,/Reenviar confirmação/);
});

test('Expiração e indisponibilidade têm mensagens úteis sem ecoar dados da URL',async()=>{
 const {confirmationResultHTML}=await ui();
 assert.match(confirmationResultHTML({status:'expired'}),/expirou ou já foi utilizado/);
 assert.match(confirmationResultHTML({status:'unavailable'}),/Confira sua conexão/);
 const html=confirmationResultHTML({status:'<script>alert(1)</script>',error_description:'TOKEN_PRIVADO_NAO_RENDERIZAR',email:'<img src=x onerror=alert(1)>'});assert.doesNotMatch(html,/<script>|TOKEN_PRIVADO_NAO_RENDERIZAR|onerror/);
});

test('Template PT-BR mantém o destino Supabase original e o assunto solicitado',async()=>{
 const template=await fs.readFile('supabase/templates/confirmation.html','utf8'),config=await fs.readFile('supabase/config.toml','utf8');
 for(const copy of ['Confirme seu endereço de e-mail','Olá!','Sua conta no NortFood está quase pronta.','Para concluir seu cadastro e começar a utilizar nossa plataforma, confirme seu endereço de e-mail clicando no botão abaixo.','CONFIRMAR MEU E-MAIL','Se o botão não funcionar, utilize o link de confirmação abaixo.','Se você não criou uma conta no NortFood, pode ignorar esta mensagem.'])assert.ok(template.includes(copy));
 assert.match(config,/\[auth\.email\.template\.confirmation\]\s*subject = "Confirme seu e-mail — NortFood"/);
 const links=[...template.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match=>match[1]);assert.deepEqual(links,['{{ .ConfirmationURL }}','{{ .ConfirmationURL }}']);assert.equal((template.match(/\{\{ \.ConfirmationURL \}\}/g)||[]).length,3);
 assert.match(template,/<a href="\{\{ \.ConfirmationURL \}\}"[^>]*background-color:#1769e0[^>]*>CONFIRMAR MEU E-MAIL<\/a>/);
 assert.match(template,/src="https:\/\/nortfood\.pages\.dev\/assets\/logo-light\.png"/);assert.doesNotMatch(template,/<script|<form|\.TokenHash|\.Token\s*\}\}|redirect_to=|access_token=/i);
});

test('Prévia local do e-mail em Chrome: desktop/mobile, imagens e link controlado', {timeout:60000}, async()=>{
 const http=require('node:http'),{chromium}=require('playwright');
 const template=await fs.readFile('supabase/templates/confirmation.html','utf8'),logo=await fs.readFile('assets/logo-light.png');
 const folder=path.resolve('test-results/auth-confirmation-ux-20261029');await fs.mkdir(folder,{recursive:true});
 let origin,previewClicks=0,browser;
 const app=http.createServer((request,response)=>{
  if(request.url==='/confirmation-preview'){previewClicks++;response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return response.end('<h1>Link local de teste</h1><p>Nenhuma conta ou confirmação real foi alterada.</p>');}
  const preview=template.replaceAll('{{ .ConfirmationURL }}',origin+'/confirmation-preview').replace(/(<body[^>]*>)/,'$1<div style="padding:12px 16px;background:#fff3cd;color:#5d4700;font:13px Arial;text-align:center;">Prévia local controlada · não é um e-mail recebido no Gmail</div>');
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end(preview);
 });
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+app.address().port;
 const report={previewOnly:true,gmailDeliveryValidated:false,realTokenUsed:false,remoteAuthRequests:0,checks:[]};
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
  await context.route('**/*',route=>{const requestURL=route.request().url();if(requestURL=== 'https://nortfood.pages.dev/assets/logo-light.png')return route.fulfill({contentType:'image/png',body:logo});if(new URL(requestURL).origin===origin)return route.continue();report.remoteAuthRequests++;return route.abort();});
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:width===1280?1000:1100});await page.goto(origin);await page.locator('img').evaluate(image=>image.decode());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.locator('h1').innerText(),'Confirme seu endereço de e-mail');
   assert.equal(await page.locator('a').first().getAttribute('href'),origin+'/confirmation-preview');assert.equal(await page.locator('a').last().getAttribute('href'),origin+'/confirmation-preview');
   assert.equal(await page.locator('a').first().evaluate(anchor=>getComputedStyle(anchor).backgroundColor),'rgb(23, 105, 224)');
   const alignment=await page.locator('a').first().evaluate(anchor=>{const r=anchor.getBoundingClientRect(),cell=anchor.closest('table').parentElement.getBoundingClientRect();return Math.abs(r.x+r.width/2-cell.x-cell.width/2)});assert.ok(alignment<=1,'CTA centralizado no cartão');
   assert.equal(await page.locator('a').last().evaluate(anchor=>getComputedStyle(anchor).color),'rgb(167, 25, 38)');
   assert.equal(await page.locator('img').evaluate(image=>image.naturalWidth>0),true);
   await page.screenshot({path:path.join(folder,'email-preview-'+width+'.png'),fullPage:true});
   report.checks.push({width,noOverflow:true,logoLoaded:true,blueCTA:true,sameControlledLink:true});
  }
  await page.locator('a').first().click();await page.getByRole('heading',{name:'Link local de teste'}).waitFor();assert.equal(previewClicks,1);assert.equal(report.remoteAuthRequests,0);report.controlledLinkClicked=true;
 }finally{await browser?.close();app.closeAllConnections();await new Promise(resolve=>app.close(resolve));await fs.writeFile(path.join(folder,'preview-report.json'),JSON.stringify(report,null,2));}
});
