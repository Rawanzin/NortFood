// Composição SVG: preserva o PNG oficial transparente e o ícone principal.
// Ícones maskable precisam de fundo definido para não depender do preenchimento do SO.
const fs=require('node:fs');
for(const size of [192,512]){
 const png=fs.readFileSync('assets/icon-'+size+'.png').toString('base64');
 const inset=size*.1,inner=size*.8;
 fs.writeFileSync('assets/icon-'+size+'-maskable-v2.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#ffffff"/><image x="${inset}" y="${inset}" width="${inner}" height="${inner}" href="data:image/png;base64,${png}"/></svg>\n`);
}
