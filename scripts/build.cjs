const fs=require('node:fs/promises');const path=require('node:path');const esbuild=require('esbuild');
const {publicConfig}=require('./public-config.cjs');
(async()=>{
 await esbuild.build({entryPoints:['src/backend.js'],bundle:true,minify:true,format:'iife',target:'es2022',outfile:'assets/nortfood-backend.js'});
 await fs.mkdir('dist',{recursive:true});
 for(const file of ['index.html','app.js','styles.css','refinements.css'])await fs.copyFile(file,'dist/'+file);
 await fs.cp('assets','dist/assets',{recursive:true});
 const config=publicConfig(true),url=config.supabaseUrl,key=config.publishableKey;
 await fs.writeFile('dist/config.js','window.NORTFOOD_CONFIG = Object.freeze('+JSON.stringify(config)+');\n');
 await fs.copyFile('_headers','dist/_headers');
 console.log('Build estático concluído. '+(url&&key?'Configuração pública aplicada.':'Sem Supabase: pedidos permanecem bloqueados.'));
})().catch(e=>{console.error(e.message);process.exitCode=1});
