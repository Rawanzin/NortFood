// Recorta apenas o simbolo N existente na logo oficial. Nao desenha outra marca.
const fs=require('node:fs/promises'),{chromium}=require('playwright');
async function generate(){
 const bytes=await fs.readFile('assets/logo-light.png'),browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();
  const result=await page.evaluate(async data=>{
   const image=new Image();image.src=data;await image.decode();
   const source=document.createElement('canvas');source.width=Math.round(image.width*.277);source.height=image.height;
   const ctx=source.getContext('2d');ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,source.width,source.height).data;
   let left=source.width,right=0,top=source.height,bottom=0;
   for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(rgba[(y*source.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   if(right<=left||bottom<=top)throw Error('LOGO_SYMBOL_NOT_FOUND');
   const images={},maskableImages={};for(const size of [16,32,48,180,192,512]){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const draw=canvas.getContext('2d');
    const w=right-left+1,h=bottom-top+1,scale=size*.88/Math.max(w,h);
    draw.imageSmoothingEnabled=true;draw.imageSmoothingQuality='high';
    draw.drawImage(source,left,top,w,h,(size-w*scale)/2,(size-h*scale)/2,w*scale,h*scale);
    images[size]=canvas.toDataURL('image/png').split(',')[1];
    if(size===192||size===512){const safe=document.createElement('canvas');safe.width=safe.height=size;const safeDraw=safe.getContext('2d');const safeScale=size*.7/Math.max(w,h);safeDraw.imageSmoothingEnabled=true;safeDraw.imageSmoothingQuality='high';safeDraw.drawImage(source,left,top,w,h,(size-w*safeScale)/2,(size-h*safeScale)/2,w*safeScale,h*safeScale);maskableImages[size]=safe.toDataURL('image/png').split(',')[1];}
   }return {images,maskableImages,bounds:{left,top,right,bottom},source:{width:image.width,height:image.height}};
  },'data:image/png;base64,'+bytes.toString('base64'));
  const png=size=>Buffer.from(result.images[size],'base64');
  for(const [file,size]of [['favicon-16x16.png',16],['favicon-32x32.png',32],['apple-touch-icon.png',180],['assets/favicon-32.png',32],['assets/apple-touch-icon.png',180],['assets/icon-192.png',192],['assets/icon-512.png',512]])await fs.writeFile(file,png(size));
  await fs.writeFile('assets/icon-192-maskable.png',Buffer.from(result.maskableImages[192],'base64'));
  await fs.writeFile('assets/icon-512-maskable.png',Buffer.from(result.maskableImages[512],'base64'));
  const sizes=[16,32,48],header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
  for(const [i,size]of sizes.entries()){const p=6+i*16,b=png(size);header[p]=header[p+1]=size;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(b.length,p+8);header.writeUInt32LE(offset,p+12);offset+=b.length;}
  await fs.writeFile('favicon.ico',Buffer.concat([header,...sizes.map(png)]));
  return {sourceFile:'assets/logo-light.png',...result,images:undefined};
 }finally{await browser.close();}
}
if(require.main===module)generate().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={generate};
