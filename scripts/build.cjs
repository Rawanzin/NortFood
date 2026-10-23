const fs=require('node:fs/promises');const path=require('node:path');const esbuild=require('esbuild');
const {publicConfig}=require('./public-config.cjs');
const {stagingDirectory,promote,removeOwned,releaseId,validatePublicScripts}=require('./build-output.cjs');
(async()=>{
 const homologation=process.argv.includes('--homologation'),hostinger=process.argv.includes('--hostinger');
 if(hostinger&&!homologation)throw Error('HOSTINGER_REQUIRES_ISOLATED_HOMOLOGATION');
 const output=hostinger?'dist-hostinger':homologation?'dist-homologacao':'dist';
 const config=homologation?{...require('./homologation-config.cjs').configuration().publicConfig,appUrl:process.env.NORTFOOD_HOMOLOGATION_PREVIEW_URL||''}:publicConfig(true),url=config.supabaseUrl,key=config.publishableKey;
 if(!url||!key)throw Error('SUPABASE_PUBLIC_CONFIGURATION_REQUIRED: configure URL e chave publica antes de gerar a publicacao.');
 if(homologation&&url!=='https://zrczgghucwsaxqnyaapk.supabase.co')throw Error('HOMOLOGATION_PREVIEW_TARGET_FORBIDDEN');
 if(homologation&&config.appUrl){const u=new URL(config.appUrl);if(u.protocol!=='https:'||u.origin!==config.appUrl||u.username||u.password)throw Error('HOMOLOGATION_PREVIEW_ORIGIN_INVALID');}
 validatePublicScripts(['app.js','pwa.js','sw.js','assets/local-entry.js','assets/backend-loader.js','assets/site-runtime.js','assets/ui-runtime.js','assets/store-location.js']);
 const bundles=await Promise.all([
 esbuild.build({entryPoints:['src/backend.js'],bundle:true,minify:true,format:'iife',target:'es2022',external:['./pdf-export.js'],outfile:'assets/nortfood-backend.js',write:false}),
 esbuild.build({entryPoints:['src/pdf-export.js'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'assets/pdf-export.js',write:false}),
 esbuild.build({entryPoints:['src/demo/catalog.js'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'assets/demo-catalog.js',write:false})]);
 const staged=await stagingDirectory(output);
 try{
 for(const file of ['index.html','offline.html','app.js','styles.css','refinements.css','pwa.css','pwa.js','sw.js'])await fs.copyFile(file,staged+'/'+file);
 await fs.cp('assets',staged+'/assets',{recursive:true});
 for(const bundle of bundles)for(const file of bundle.outputFiles)await fs.writeFile(path.join(staged,path.relative(process.cwd(),file.path)),file.contents);
 const site=require('./site-artifacts.cjs'),generated=site.siteArtifacts(config,{homologation});
 let html=site.renderHTML(await fs.readFile('index.html','utf8'),config,{homologation});if(homologation)html=html.replace('<body>','<body><aside role="note" style="padding:12px;text-align:center;background:#fff1f2;color:#991b1b;font-weight:700">HOMOLOGAÇÃO — Dados sintéticos. Não utilizar para pedidos reais.</aside>');await fs.writeFile(staged+'/index.html',html);
 await fs.writeFile(staged+'/robots.txt',generated.robots);await fs.writeFile(staged+'/sitemap.xml',generated.sitemap);
 for(const file of ['404.html','favicon.ico','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','site.webmanifest'])await fs.copyFile(file,staged+'/'+file);
 await fs.copyFile('site.webmanifest',staged+'/manifest.webmanifest');
 if(!hostinger)await fs.copyFile('_redirects',staged+'/_redirects');
 await fs.writeFile(staged+'/config.js','window.NORTFOOD_CONFIG = Object.freeze('+JSON.stringify(config)+');\n');
 if(!hostinger)await fs.writeFile(staged+'/_headers',site.renderHeaders(await fs.readFile('_headers','utf8'),config)+(homologation?'\n  X-Robots-Tag: noindex, nofollow\n':''));
 const release=await releaseId(staged);
 await fs.writeFile(staged+'/sw.js',(await fs.readFile(staged+'/sw.js','utf8')).replace('__NORTFOOD_RELEASE__',release));
 await fs.writeFile(staged+'/release.json',JSON.stringify({release,environment:homologation?'homologation':'principal',publicPreview:config.publicPreview===true,sourceCommit:process.env.COMMIT_REF||null,builtAt:new Date().toISOString()},null,2));
 await promote(staged,output);
 // Keep the existing local HTTP entry working with the same compiled sources.
 for(const bundle of bundles)for(const file of bundle.outputFiles)await fs.writeFile(file.path,file.contents);
 }catch(error){await removeOwned(staged);throw error;}
 console.log('Build estático concluído em '+output+'. '+(url&&key?'Configuração pública aplicada.':'Sem Supabase: pedidos permanecem bloqueados.'));
})().catch(e=>{console.error(e.message);process.exitCode=1});
