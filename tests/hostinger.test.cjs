// Contratos locais: nao comprovam plano Hostinger, Apache/Nginx ou publicacao remota.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto'),{chromium}=require('playwright');
const {render,origin,authFile}=require('../scripts/hostinger-config.cjs');
test('Hostinger nao escolhe servidor implicitamente e exige HTTPS sem credenciais',()=>{
 const values={appOrigin:'https://qa.nortfood.test',passwordFile:'/home/test/.private/nortfood.htpasswd'};
 assert.throws(()=>render(values),/SERVER_PROFILE/);
 for(const value of ['http://qa.nortfood.test','https://user:senha@qa.nortfood.test','https://qa.nortfood.test/sub','https://localhost'])assert.throws(()=>origin(value));
 for(const value of ['senha','/home/test/public_html/.htpasswd','/home/test/../public_html/x','/private/pass\nRequire all granted'])assert.throws(()=>authFile(value));
 for(const profile of ['apache','litespeed']){const r=render({...values,server:profile});assert.equal(r.name,'.htaccess');assert.match(r.text,/Require valid-user/);assert.match(r.text,/Require all denied/);assert.doesNotMatch(r.text,/Require all granted|RewriteRule.*index\.html/);assert.match(r.text,/ErrorDocument 404 \/404.html/);assert.match(r.text,/X-Robots-Tag "noindex, nofollow"/);assert.match(r.text,/Header always set Cache-Control "no-store"/);assert.match(r.text,/Content-Security-Policy.*frame-ancestors 'none'/);}
 const nginx=render({...values,server:'nginx'});assert.equal(nginx.name,'nortfood-staging.conf');assert.match(nginx.text,/auth_basic_user_file/);assert.match(nginx.text,/try_files \$uri \$uri\/ =404/);assert.doesNotMatch(nginx.text,/RewriteEngine|\.htaccess|Require valid-user/);
});
test('Pacote Hostinger isolado preserva configuracao principal e nao depende de arquivos Netlify',async()=>{
 const hash=buffer=>createHash('sha256').update(buffer).digest('hex'),before=new Map();
 for(const f of ['.env','dist/config.js','dist-homologacao/config.js','netlify.toml','_headers'])before.set(f,hash(await fs.readFile(f)));
 const run=spawnSync(process.execPath,['scripts/prepare-hostinger.cjs'],{encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr);
 for(const [f,digest]of before)assert.equal(hash(await fs.readFile(f)),digest,f+' nao pode mudar');
 const manifest=JSON.parse(await fs.readFile('test-results/hostinger/package-manifest.json','utf8'));assert.equal(manifest.status,'PENDENTE');assert.equal(manifest.server,'NAO_IDENTIFICADO');assert.equal(manifest.origin,null);
 assert.ok(manifest.files.length>25);assert.equal(manifest.files.some(f=>/^(_headers|netlify\.toml|\.htaccess|\.env|supabase\/|src\/|tests\/|backups\/|docs\/)/.test(f.path)),false);
 const config=await fs.readFile('dist-hostinger/config.js','utf8');assert.match(config,/zrczgghucwsaxqnyaapk/);assert.doesNotMatch(config,/zwkhqahivthzivmuirjr|sb_secret_|service_role|netlify\.app/);
 assert.match(await fs.readFile('dist-hostinger/index.html','utf8'),/HOMOLOGAÇÃO — Dados sintéticos/);assert.match(await fs.readFile('dist-hostinger/robots.txt','utf8'),/Disallow: \//);
 const bad=spawnSync(process.execPath,['scripts/build.cjs','--hostinger'],{encoding:'utf8',windowsHide:true});assert.equal(bad.status,1);assert.match(bad.stderr,/REQUIRES_ISOLATED/);
});
test('Icones oficiais tem dimensoes corretas, transparencia e ICO com 16/32/48',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});try{
  const page=await browser.newPage();const checks=[];
  for(const [file,size]of [['favicon-16x16.png',16],['favicon-32x32.png',32],['apple-touch-icon.png',180],['assets/icon-192.png',192],['assets/icon-512.png',512]]){
   const data='data:image/png;base64,'+(await fs.readFile(file)).toString('base64');
   const actual=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);const p=x.getImageData(0,0,i.width,i.height).data;let visible=0,red=0,left=i.width,right=0,top=i.height,bottom=0;for(let y=0;y<i.height;y++)for(let z=0;z<i.width;z++){const n=(y*i.width+z)*4;if(p[n+3]>16){visible++;left=Math.min(left,z);right=Math.max(right,z);top=Math.min(top,y);bottom=Math.max(bottom,y);if(p[n]>150&&p[n+1]<120)red++;}}return {width:i.width,height:i.height,cornerAlpha:p[3],visible,red,left,right,top,bottom};},data);
   assert.equal(actual.width,size);assert.equal(actual.height,size);assert.equal(actual.cornerAlpha,0);assert.ok(actual.red>actual.visible*.5);assert.ok(Math.abs(actual.left-(size-1-actual.right))<=2);assert.ok(Math.abs(actual.top-(size-1-actual.bottom))<=2);checks.push({file,...actual});
  }
  const ico=await fs.readFile('favicon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);for(const [i,size]of [16,32,48].entries())assert.equal(ico[6+i*16],size);
  const html=await fs.readFile('index.html','utf8');for(const file of ['favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png'])assert.ok(html.includes('/'+file));
  const manifest=JSON.parse(await fs.readFile('site.webmanifest'));assert.deepEqual(manifest.icons.map(i=>i.sizes),['192x192','192x192','512x512','512x512']);assert.ok(manifest.icons.some(i=>i.purpose==='maskable'&&i.src.includes('icon-192-maskable')));assert.ok(manifest.icons.some(i=>i.purpose==='maskable'&&i.src.includes('icon-512-maskable')));
  await fs.mkdir('test-results/hostinger',{recursive:true});await fs.writeFile('test-results/hostinger/icons-result.json',JSON.stringify({status:'APROVADO_LOCAL',checks},null,2));
  await page.setViewportSize({width:650,height:300});await page.setContent('<style>body{margin:0;display:flex}section{box-sizing:border-box;width:325px;height:300px;padding:30px;background:#fafafa}section+section{background:#222329;color:white}img{width:180px;height:180px}p{font:16px Arial}</style>'+['claro','escuro'].map(t=>'<section><p>Logo original — fundo '+t+'</p><img src="data:image/png;base64,'+Buffer.from([]).toString('base64')+'"></section>').join(''));
  const icon='data:image/png;base64,'+(await fs.readFile('assets/icon-192.png')).toString('base64');await page.locator('img').evaluateAll((images,src)=>Promise.all(images.map(i=>{i.src=src;return i.decode();})),icon);await page.screenshot({path:path.resolve('test-results/hostinger/favicons-preview.png')});
 }finally{await browser.close();}
});
