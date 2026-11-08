import {boundedForm,inspectImage,sanitizeImage,MAX_BYTES} from '../upload-media/media-validation.mjs';
import {corsHeaders} from '../upload-media/runtime-config.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const bucket = 'profile-avatars';
export function ownedAvatarPath(user,path){
 return uuid.test(user || '') && typeof path==='string' && path.startsWith(user+'/') &&
  new RegExp('^'+user+'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$').test(path);
}

/** Full decode, metadata stripping and WebP re-encoding; never trust filename/MIME. */
export function sanitizeAvatar(bytes,mime,ImageMagick,MagickFormat){
 const header=inspectImage(bytes,mime);
 if(header.width!==header.height||header.width>512)throw Error('INVALID_AVATAR_DIMENSIONS');
 const decoded=sanitizeImage(bytes,mime,ImageMagick,MagickFormat);
 const format={'image/png':MagickFormat.Png,'image/jpeg':MagickFormat.Jpeg,'image/webp':MagickFormat.WebP}[mime];
 const output=ImageMagick.read(decoded,format,image=>{
  if(image.width!==header.width||image.height!==header.height)throw Error('INVALID_AVATAR_DIMENSIONS');
  image.autoOrient();image.strip();image.quality=86;
  return image.write(MagickFormat.WebP,data=>new Uint8Array(data));
 });
 if(output.length<12||output.length>MAX_BYTES)throw Error('INVALID_AVATAR_SIZE');
 const checked=inspectImage(output,'image/webp');
 if(checked.width!==checked.height||checked.width>512)throw Error('INVALID_AVATAR_DIMENSIONS');
 return output;
}

/** Dependencies are injected for security tests; the Deno wrapper supplies real SDK/decoder. */
export function createAvatarHandler({allowedOrigins,getConfig,createClient,sanitize,randomUUID=()=>crypto.randomUUID()}){
 return async req=>{
  const origin=req.headers.get('origin'),headers={...corsHeaders(origin,allowedOrigins),'Access-Control-Allow-Methods':'POST,DELETE,OPTIONS','Cache-Control':'no-store'};
  const reply=(status,payload)=>new Response(JSON.stringify(payload),{status,headers:{...headers,'Content-Type':'application/json'}});
  const error=(status,message)=>reply(status,{error:message});
  if(!origin||!allowedOrigins.includes(origin))return error(403,'Origem não autorizada.');
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(!['POST','DELETE'].includes(req.method))return error(405,'Método inválido.');
  const authorization=req.headers.get('authorization')||'';
  if(!/^Bearer\s+\S+$/i.test(authorization))return error(401,'Entre na sua conta para alterar a foto.');
  let client,admin,user;
  try{
   const config=getConfig();
   client=createClient(config.url,config.publishable,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   const verified=await client.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
   if(verified.error||!uuid.test(verified.data?.user?.id||''))return error(401,'Sessão expirada.');
   user=verified.data.user;
   admin=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false}});
  }catch{return error(503,'Serviço de fotos indisponível.');}

  const readCurrent=async()=>{
   try{const result=await client.from('profiles').select('avatar_path').eq('id',user.id).maybeSingle();
    return result.error||!result.data?{known:false}:{known:true,path:result.data.avatar_path};
   }catch{return {known:false};}
  };
  // Nunca apaga caminho estrangeiro, URL assinada ou objeto ainda referenciado.
  const cleanUnused=async path=>{
   if(!ownedAvatarPath(user.id,path))return;
   const current=await readCurrent();if(!current.known||current.path===path)return;
   try{await admin.storage.from(bucket).remove([path]);}catch{/* limpeza privada pode ser repetida depois */}
  };

  if(req.method==='DELETE'){
   // Alguns gateways representam um DELETE vazio como um stream sem bytes.
   if(req.body){
    const reader=req.body.getReader();
    try{
     while(true){
      const {done,value}=await reader.read();
      if(done)break;
      if(value.byteLength)return error(400,'A remoção da foto não aceita dados de outro perfil.');
     }
    }catch{
     return error(400,'Não foi possível ler a requisição de remoção.');
    }finally{
     void reader.cancel().catch(()=>{});
    }
   }
   const before=await readCurrent();let result;
   try{result=await client.rpc('nf_set_profile_avatar',{p_path:null});}catch{result={error:true};}
   if(result.error){const current=await readCurrent();if(!current.known||current.path!==null)return error(503,'Não foi possível remover a foto.');}
   const previous=result.error?(before.known?before.path:null):result.data;
   await cleanUnused(previous);
   return reply(200,{path:null});
  }

  let form,file;
  try{form=await boundedForm(req);const entries=[...form.entries()];file=form.get('file');
   if(entries.length!==1||entries[0][0]!=='file'||!(file instanceof File))return error(400,'Envie somente o arquivo da foto.');
  }catch{return error(400,'Arquivo inválido. Use uma imagem de até 1 MB.');}
  if(file.size<12||file.size>MAX_BYTES||!['image/png','image/jpeg','image/webp'].includes(file.type))return error(400,'Use PNG, JPEG ou WebP de até 1 MB.');
  let quota;
  try{quota=await admin.rpc('nf_reserve_avatar_upload',{p_user:user.id,p_bytes:file.size});}catch{return error(503,'Não foi possível autorizar o envio.');}
  if(quota.error)return error(quota.error.message==='AVATAR_UPLOAD_LIMIT'?429:503,quota.error.message==='AVATAR_UPLOAD_LIMIT'?'Limite de fotos atingido. Aguarde para tentar novamente.':'Não foi possível autorizar o envio.');
  let sanitized;
  try{sanitized=await sanitize(new Uint8Array(await file.arrayBuffer()),file.type);const info=inspectImage(sanitized,'image/webp');if(info.width!==info.height||info.width>512)throw Error();}
  catch{return error(400,'Use uma imagem quadrada válida de até 512 por 512 pixels.');}
  let path;
  try{path=user.id+'/'+randomUUID()+'.webp';if(!ownedAvatarPath(user.id,path))throw Error();}
  catch{return error(503,'Não foi possível preparar a foto.');}
  let uploaded;
  try{uploaded=await admin.storage.from(bucket).upload(path,sanitized,{contentType:'image/webp',upsert:false,cacheControl:'0'});}
  catch{uploaded={error:true};}
  if(uploaded.error){await cleanUnused(path);return error(503,'Não foi possível salvar a foto.');}
  let committed;
  try{committed=await client.rpc('nf_set_profile_avatar',{p_path:path});}catch{committed={error:true};}
  if(committed.error){
   const current=await readCurrent();
   if(current.known&&current.path===path)return reply(200,{path});
   await cleanUnused(path);
   return error(503,'Não foi possível atualizar a foto. Tente novamente.');
  }
  if(committed.data!==path)await cleanUnused(committed.data);
  return reply(200,{path});
 };
}
