const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {siteArtifacts,renderHTML,renderHeaders}=require('./site-artifacts.cjs');
const {headersFor}=require('./http-headers.cjs');
async function server({root=process.cwd(),config,homologation=false}={}){
 const security=headersFor(renderHeaders(await fs.readFile(path.join(root,'_headers'),'utf8'),config),'/');
 if(homologation)security['X-Robots-Tag']='noindex, nofollow';
 const generated=siteArtifacts(config,{homologation});
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
 return http.createServer(async(req,res)=>{const send=(status,type,body,extra={})=>{const compression={};if(body.length>1024&&/javascript|html|css|xml|json|text\/plain/.test(type)&&/\bgzip\b/.test(req.headers['accept-encoding']||'')){body=require('node:zlib').gzipSync(body);compression['Content-Encoding']='gzip';compression.Vary='Accept-Encoding';}res.writeHead(status,{...security,'Content-Type':type,'Cache-Control':'no-cache',...compression,...extra});res.end(body);};try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/config.js')return send(200,types['.js'],'window.NORTFOOD_CONFIG=Object.freeze('+JSON.stringify(config)+');',{'Cache-Control':'no-store'});
  if(pathname==='/robots.txt')return send(200,'text/plain; charset=utf-8',generated.robots);
  if(pathname==='/sitemap.xml')return send(200,'application/xml; charset=utf-8',generated.sitemap);
  if(pathname==='/manifest.webmanifest')return send(200,types['.webmanifest'],await fs.readFile(path.join(root,'site.webmanifest')));
  const target=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)||/[/\\](?:\.git|node_modules|supabase|tests|test-results|backups|docs|src|scripts|\.env[^/\\]*)[/\\]?/i.test(target)||!types[path.extname(target)])throw Error('blocked');
  let content=await fs.readFile(target);if(target===path.join(root,'index.html'))content=renderHTML(content.toString(),config,{homologation});
  send(pathname==='/404.html'?404:200,types[path.extname(target)],content);
 }catch{send(404,types['.html'],await fs.readFile(path.join(root,'404.html')).catch(()=>Buffer.from('Página não encontrada.')),{'X-Robots-Tag':'noindex, nofollow'});}});
}
module.exports={server};
if(require.main===module){const homologation=process.argv.includes('--homologation'),port=homologation?4174:4173,config=homologation?require('./homologation-config.cjs').configuration().publicConfig:require('./public-config.cjs').publicConfig();server({config,homologation}).then(app=>app.listen(port,'127.0.0.1',()=>console.log('NortFood'+(homologation?' HOMOLOGACAO':'')+': http://localhost:'+port))).catch(e=>{console.error(e.message);process.exitCode=1;});}
