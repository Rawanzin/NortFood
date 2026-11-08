// Deterministic exports preserve the pixels/proportions of a supplied PNG master.
// --existing-brand explicitly permits the existing symbol as an interim source.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
async function generate({source,existingBrand=false}={}){
 if(!source&&!existingBrand)source='assets/app-icon-original.png';
 source=source||'assets/logo-light.png';const bytes=await fs.readFile(source),browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();
  const output=await page.evaluate(async({data,existingBrand})=>{
   const image=new Image();image.src=data;await image.decode();
   // Preserve full source, proportions and alpha; pad only with transparent pixels.
   const source=document.createElement('canvas');source.width=existingBrand?Math.round(image.width*.277):image.width;source.height=image.height;
   const ctx=source.getContext('2d');ctx.drawImage(image,0,0);
   let left=0,top=0,right=source.width-1,bottom=source.height-1;
   if(existingBrand){
    const rgba=ctx.getImageData(0,0,source.width,source.height).data;left=source.width;top=source.height;right=bottom=0;
    for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(rgba[(y*source.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(right<=left||bottom<=top)throw Error('Existing official symbol not found.');
    // Keep the official red symbol's original pixels. The white matte is
    // intentional: Android also uses this icon on the native splash screen.
   }
   if(!existingBrand){
    const rgba=ctx.getImageData(0,0,source.width,source.height).data;left=source.width;top=source.height;right=bottom=0;
    for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(rgba[(y*source.width+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(right<=left||bottom<=top)throw Error('Empty official PNG.');
   }
   const background='#ffffff';
   const images={};
   for(const size of [16,32,48,180,192,512])for(const maskable of size===192||size===512?[false,true]:[false]){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const draw=canvas.getContext('2d');
    const w=right-left+1,h=bottom-top+1;
    // Every corner of the complete symbol lies inside the central 80% safe circle.
    // A square supplied master retains its own margins for the regular icon.
    const scale=maskable?size*.56/Math.max(w,h):existingBrand?size*.84/Math.max(w,h):size/Math.max(image.width,image.height);
    draw.imageSmoothingEnabled=true;draw.imageSmoothingQuality='high';
    draw.drawImage(source,left,top,w,h,(size-w*scale)/2,(size-h*scale)/2,w*scale,h*scale);
    images[size+(maskable?'-maskable':'')]=canvas.toDataURL('image/png').split(',')[1];
   }
   return {images,background,width:image.width,height:image.height};
  },{data:'data:image/'+(path.extname(source).toLowerCase()==='.jpg'?'jpeg':path.extname(source).slice(1))+';base64,'+bytes.toString('base64'),existingBrand});
  const png=key=>Buffer.from(output.images[key],'base64'),folder='assets/app-icons';await fs.mkdir(folder,{recursive:true});
  const icons=[];
  for(const [size,key,purpose]of [[192,'192','any'],[192,'192-maskable','maskable'],[512,'512','any'],[512,'512-maskable','maskable']]){
   const content=png(key),hash=crypto.createHash('sha256').update(content).digest('hex').slice(0,12),name='icon-'+key+'-'+hash+'.png';
   await fs.writeFile(folder+'/'+name,content);icons.push({src:'/'+folder+'/'+name,sizes:size+'x'+size,type:'image/png',purpose});
  }
  for(const [file,key]of [['favicon-16x16.png','16'],['favicon-32x32.png','32'],['apple-touch-icon.png','180'],['assets/apple-touch-icon.png','180'],['assets/favicon-32.png','32'],['assets/icon-192.png','192'],['assets/icon-512.png','512'],['assets/icon-192-maskable.png','192-maskable'],['assets/icon-512-maskable.png','512-maskable']])await fs.writeFile(file,png(key));
  const sizes=[16,32,48],header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
  for(const [i,size]of sizes.entries()){const p=6+i*16,b=png(size);header[p]=header[p+1]=size;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(b.length,p+8);header.writeUInt32LE(offset,p+12);offset+=b.length;}
  await fs.writeFile('favicon.ico',Buffer.concat([header,...sizes.map(size=>png(size))]));
  const manifest=JSON.parse(await fs.readFile('site.webmanifest','utf8'));manifest.icons=icons;manifest.background_color=manifest.theme_color=output.background;await fs.writeFile('site.webmanifest',JSON.stringify(manifest,null,2)+'\n');
  const report={source,sourceSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),sourceWidth:output.width,sourceHeight:output.height,existingBrand,requestedAttachmentUsed:!existingBrand,background:'transparent',manifestBackground:output.background,icons};
  await fs.writeFile('docs/APP_ICON_SOURCE.json',JSON.stringify(report,null,2)+'\n');return report;
 }finally{await browser.close();}
}
module.exports={generate};
if(require.main===module){const index=process.argv.indexOf('--source');generate({source:index>=0?process.argv[index+1]:undefined,existingBrand:process.argv.includes('--existing-brand')}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});}
