// TLS real em loopback. Nao comprova DNS, hospedagem publica ou confianca de navegador.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),https=require('node:https'),{spawnSync}=require('node:child_process');
const {server}=require('../scripts/serve.cjs');
test('HTTPS isolado valida certificado/hostname, serve headers e nao instala CA no sistema',async()=>{
 const openssl=process.env.NORTFOOD_TEST_OPENSSL||(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'nortfood-tls-test-')),key=path.join(directory,'key.pem'),cert=path.join(directory,'cert.pem');let app;
 try{
  const generated=spawnSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-days','1'],{windowsHide:true,encoding:'utf8'});assert.equal(generated.status,0,'OpenSSL instalado deve gerar certificado efemero de teste');
  const ca=await fs.readFile(cert),httpApp=await server({homologation:true,config:{mode:'commercial',appUrl:'https://localhost',supabaseUrl:'',publishableKey:''}});app=https.createServer({key:await fs.readFile(key),cert:ca,minVersion:'TLSv1.2'},httpApp.listeners('request')[0]);await new Promise(r=>app.listen(0,'127.0.0.1',r));
  const request=options=>new Promise((resolve,reject)=>{const req=https.get({hostname:'127.0.0.1',port:app.address().port,servername:'localhost',path:'/',...options},r=>{const authorized=r.socket.authorized,protocol=r.socket.getProtocol();let body='';r.on('data',b=>body+=b);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,authorized,protocol,body}));});req.on('error',reject);});
  await assert.rejects(()=>request({}),error=>['DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN'].includes(error.code));
  const actual=await request({ca});assert.equal(actual.status,200);assert.equal(actual.authorized,true);assert.match(actual.protocol,/TLSv1\.[23]/);assert.match(actual.headers['content-security-policy'],/frame-ancestors 'none'/);assert.match(actual.headers['x-robots-tag'],/noindex/);assert.doesNotMatch(actual.body,/sb_secret_/);
  await assert.rejects(()=>request({ca,servername:'outro-host.invalid'}),error=>error.code==='ERR_TLS_CERT_ALTNAME_INVALID');
  await fs.mkdir('test-results/beta',{recursive:true});await fs.writeFile('test-results/beta/https-local-result.json',JSON.stringify({status:'APROVADA',scope:'HTTPS real somente loopback; CA especifica por requisicao, sem mudar confianca global ou ignorar erros; nao aprova HTTPS publico',protocol:actual.protocol,checks:['Certificado sem CA recusado','CA especifica e hostname corretos validados','Hostname incorreto recusado','HTML e headers entregues por TLS'],publicHTTPS:'PENDENTE'},null,2));
 }finally{if(app){app.closeAllConnections();await new Promise(r=>app.close(r));}for(const file of [key,cert])await fs.unlink(file).catch(()=>{});await fs.rmdir(directory);}
});
