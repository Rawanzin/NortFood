// Geracao local apenas. Nunca detecta plano, altera DNS ou configura um servidor.
const fs=require('node:fs');
function origin(value){const u=new URL(value);if(u.protocol!=='https:'||u.origin!==value||u.username||u.password||/^(localhost|127\.)/.test(u.hostname))throw Error('HOSTINGER_HTTPS_ORIGIN_REQUIRED');return u;}
function authFile(value){
 if(!/^\/[A-Za-z0-9_./-]+$/.test(value)||value.split('/').includes('..')||/(?:^|\/)(?:public_html|dist|assets)(?:\/|$)/.test(value))throw Error('HOSTINGER_AUTH_FILE_MUST_BE_OUTSIDE_WEBROOT');
 return value;
}
function headers(){return {...require('./http-headers.cjs').headersFor(fs.readFileSync('_headers','utf8'),'/'),'X-Robots-Tag':'noindex, nofollow'};}
function render({server,appOrigin,passwordFile}){
 const u=origin(appOrigin),password=authFile(passwordFile),h=headers();
 if(['apache','litespeed'].includes(server))return {name:'.htaccess',text:`# NortFood HOMOLOGACAO. Apache 2.4 / LiteSpeed compativel, somente apos confirmar o plano.
# Mesclar com a protecao existente no hPanel; nunca sobrescrever regras de outro site.
Options -Indexes -MultiViews
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddType application/manifest+json .webmanifest
RewriteEngine On
# Sem fallback universal: rotas do app usam # e arquivos ausentes devem retornar 404.
RewriteRule (^|/)(\\.|backups/|supabase/|scripts/|src/|tests/|test-results/|node_modules/) - [F,L]
# HTTP fica bloqueado antes de qualquer desafio de senha. Ativar Force HTTPS no hPanel.
<If "%{HTTPS} == 'on'">
 AuthType Basic
 AuthName "NortFood - Homologacao privada"
 AuthUserFile "${password}"
 Require valid-user
</If>
<Else>
 Require all denied
</Else>
${Object.entries(h).map(([k,v])=>'Header always set '+k+' "'+v.replaceAll('"','\\"')+'"').join('\n')}
# Nomes nao versionados: revalidar scripts/config para evitar versoes antigas misturadas.
Header always set Cache-Control "private, no-cache, max-age=0, must-revalidate"
<FilesMatch "^(config\\.js|index\\.html|404\\.html)$">
 Header always set Cache-Control "no-store"
</FilesMatch>
<FilesMatch "\\.(png|jpe?g|webp|ico|woff2)$">
 Header always set Cache-Control "private, max-age=86400, must-revalidate"
</FilesMatch>
<IfModule mod_deflate.c>
 AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript application/json application/manifest+json image/svg+xml
</IfModule>
`};
 if(server==='nginx')return {name:'nortfood-staging.conf',text:`# VPS Nginx SOMENTE: incluir no bloco server HTTPS existente, com certificado valido.
# Nao e um nginx.conf completo. Nao colar em hPanel Web/Cloud ou em Apache.
server_name ${u.hostname};
index index.html;
auth_basic "NortFood - Homologacao privada";
auth_basic_user_file ${password};
${Object.entries(h).map(([k,v])=>'add_header '+k+' "'+v.replaceAll('"','\\"')+'" always;').join('\n')}
add_header Cache-Control "private, no-cache, max-age=0, must-revalidate" always;
error_page 404 /404.html;
location / { try_files $uri $uri/ =404; }
location ~ /\\. { deny all; }
location ~ ^/(backups|supabase|scripts|src|tests|test-results|node_modules)(/|$) { deny all; }
# HTTPS e root definidos pelo administrador no vhost; manter auth em TODOS os assets.
# Nao adicionar locations que anulem auth ou add_header por heranca.
`};
 throw Error('HOSTINGER_SERVER_PROFILE_NOT_CONFIRMED');
}
module.exports={origin,authFile,headers,render};
