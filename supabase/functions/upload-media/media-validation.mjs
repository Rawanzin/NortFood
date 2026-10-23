export const MAX_BYTES=1048576,MAX_PIXELS=4194304,MAX_SIDE=4096;
export function configureDecoderLimits(limits){
 limits.width=4096n;limits.height=4096n;limits.area=4194304n;
 limits.memory=134217728n;limits.maxMemoryRequest=67108864n;limits.disk=0n;
 // ImageMagick uses temporary image lists even when decoding a single frame.
 limits.listLength=8n;
}
const fail=()=>{throw Error('INVALID_IMAGE')};
function dimensions(width,height,mime){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>MAX_SIDE||height>MAX_SIDE||width*height>MAX_PIXELS)fail();return {width,height,mime};}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let b=0;b<8;b++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function inspectImage(bytes,declaredMime){
 if(!(bytes instanceof Uint8Array)||bytes.length<12||bytes.length>MAX_BYTES)fail();
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),text=(offset,n)=>String.fromCharCode(...bytes.subarray(offset,offset+n));let result;
 if(bytes.subarray(0,8).every((b,i)=>b===[137,80,78,71,13,10,26,10][i])){
  let offset=8,idat=false,end=false;while(offset+12<=bytes.length){const size=view.getUint32(offset),type=text(offset+4,4);if(size>MAX_BYTES||offset+12+size>bytes.length)fail();if(crc32(bytes.subarray(offset+4,offset+8+size))!==view.getUint32(offset+8+size))fail();if(offset===8){if(type!=='IHDR'||size!==13)fail();result=dimensions(view.getUint32(offset+8),view.getUint32(offset+12),'image/png');}else if(type==='IHDR'||type==='acTL')fail();if(type==='IDAT')idat=true;offset+=12+size;if(type==='IEND'){if(size!==0||offset!==bytes.length)fail();end=true;break;}}
  if(!idat||!end)fail();
 }else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){
  if(bytes.at(-2)!==255||bytes.at(-1)!==217)fail();let offset=2;while(offset+4<=bytes.length){if(bytes[offset++]!==255)fail();while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===0xda||marker===0xd9)break;if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;const size=view.getUint16(offset);if(size<2||offset+size>bytes.length)fail();if([0xc0,0xc1,0xc2].includes(marker)){if(size<8)fail();result=dimensions(view.getUint16(offset+5),view.getUint16(offset+3),'image/jpeg');break;}offset+=size;}if(!result)fail();
 }else if(text(0,4)==='RIFF'&&text(8,4)==='WEBP'){
  if(view.getUint32(4,true)!==bytes.length-8)fail();let offset=12;while(offset+8<=bytes.length){const type=text(offset,4),size=view.getUint32(offset+4,true),start=offset+8;if(size>MAX_BYTES||start+size>bytes.length)fail();if(type==='ANIM'||type==='ANMF')fail();if(type==='VP8X'){if(size!==10||(bytes[start]&2))fail();const u24=p=>bytes[p]|bytes[p+1]<<8|bytes[p+2]<<16;result=dimensions(u24(start+4)+1,u24(start+7)+1,'image/webp');}else if(!result&&type==='VP8L'){if(size<5||bytes[start]!==0x2f)fail();const bits=view.getUint32(start+1,true);result=dimensions((bits&0x3fff)+1,((bits>>>14)&0x3fff)+1,'image/webp');}else if(!result&&type==='VP8 '){if(size<10||text(start+3,3)!=='\x9d\x01\x2a')fail();result=dimensions(view.getUint16(start+6,true)&0x3fff,view.getUint16(start+8,true)&0x3fff,'image/webp');}offset=start+size+(size%2);}if(offset!==bytes.length||!result)fail();
 }else fail();
 if(result.mime!==declaredMime)fail();return result;
}
export function sanitizeImage(bytes,mime,ImageMagick,MagickFormat){
 const header=inspectImage(bytes,mime),format={'image/png':MagickFormat.Png,'image/jpeg':MagickFormat.Jpeg,'image/webp':MagickFormat.WebP}[mime];
 // Decodificação completa e reencodificação removem metadados (inclusive GPS)
 // e qualquer conteúdo que não pertença aos pixels da imagem autorizada.
 const output=ImageMagick.read(bytes,format,image=>{if(image.width!==header.width||image.height!==header.height)fail();image.autoOrient();image.strip();return image.write(format,data=>new Uint8Array(data));});
 if(!output.length||output.length>MAX_BYTES)fail();inspectImage(output,mime);return output;
}
export async function boundedForm(req){
 const type=req.headers.get('content-type')||'';if(!/^multipart\/form-data;/i.test(type))throw Error('INVALID_FORM');
 const max=MAX_BYTES+32768,length=req.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>max))throw Error('REQUEST_TOO_LARGE');
 if(!req.body)throw Error('INVALID_FORM');const reader=req.body.getReader(),chunks=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw Error('REQUEST_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}
 const data=new Uint8Array(total);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}return new Response(data,{headers:{'Content-Type':type}}).formData();
}
