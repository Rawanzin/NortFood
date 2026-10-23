import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { ImageMagick, initializeImageMagick, MagickFormat, ResourceLimits } from 'npm:@imagemagick/magick-wasm@0.0.44';
import { boundedForm, inspectImage, sanitizeImage, configureDecoderLimits } from './media-validation.mjs';
import { runtimeConfig, configuredOrigin } from './runtime-config.mjs';
const allowedOrigin = configuredOrigin(Deno.env.get('APP_ORIGIN'));
let decoder: Promise<void> | undefined;
function initializeDecoder(){return decoder ||= Deno.readFile(new URL(import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.44/magick.wasm'))).then(initializeImageMagick).then(()=>{
  configureDecoderLimits(ResourceLimits);
});}
// Falha na inicializacao impede servir uma versao com processamento indisponivel.
// Carrega somente o modulo estatico; nenhuma imagem e processada antes de autenticar.
await initializeDecoder();
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = { 'Access-Control-Allow-Origin': allowedOrigin || '', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Vary': 'Origin' };
  const reply = (status: number, message: string) => new Response(JSON.stringify({ error: message }), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (!allowedOrigin || origin !== allowedOrigin) return reply(403, 'Origem não autorizada.');
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, 'Método inválido.');
  const authorization = req.headers.get('authorization') || '';
  if(!/^Bearer\s+\S+$/i.test(authorization))return reply(401,'Entre na sua conta para enviar imagens.');
  let config;try{config=runtimeConfig(Deno.env);}catch{return reply(503,'Serviço de imagens ainda não configurado.');}
  const client = createClient(config.url, config.publishable, { global: { headers: { Authorization: authorization } },auth:{persistSession:false,autoRefreshToken:false} });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return reply(401, 'Sessão expirada.');
  // Nunca aceita identidade/autorização fornecida no formulário.
  const form = await boundedForm(req).catch(() => null);
  const file = form?.get('file');
  const store = form?.get('store_id');
  if (!(file instanceof File) || typeof store !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(store)) return reply(400, 'Imagem ou loja inválida.');
  const { data: membership } = await client.from('store_memberships').select('store_id').eq('store_id', store).eq('user_id', user.id).maybeSingle();
  if (!membership) return reply(403, 'Sem permissão para esta loja.');
  if (file.size < 12 || file.size > 1048576) return reply(400, 'Use uma imagem de até 1 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type;
  try{inspectImage(bytes,mime)}catch{return reply(400,'Imagem inválida. Use PNG, JPEG ou WebP estático, até 1 MB e 4 megapixels.');}
  // Credencial administrativa existe somente no servidor. Sem caminho escolhido pelo cliente.
  const admin = createClient(config.url, config.secret,{auth:{persistSession:false,autoRefreshToken:false}});
  // Reserva atômica no banco: falhas de decode/upload consomem a tentativa;
  // não abre escrita direta nem depende de contadores locais da Edge Function.
  const quota=await admin.rpc('nf_reserve_media_upload',{p_store:store,p_user:user.id,p_bytes:bytes.length});
  if(quota.error)return reply(quota.error.message==='UPLOAD_LIMIT'?429:503,quota.error.message==='UPLOAD_LIMIT'?'Limite de imagens atingido. Aguarde ou contate o suporte.':'Não foi possível autorizar o envio da imagem.');
  let sanitized:Uint8Array;
  try{await initializeDecoder();}catch{decoder=undefined;return reply(503,'Processamento de imagens indisponível. Tente novamente mais tarde.');}
  try{sanitized=sanitizeImage(bytes,mime,ImageMagick,MagickFormat);}catch{return reply(400,'Não foi possível validar a imagem inteira. Use outro arquivo válido de até 1 MB.');}
  const extension=mime==='image/png'?'png':mime==='image/jpeg'?'jpg':'webp';
  const objectPath = `${store}/${crypto.randomUUID()}.${extension}`;
  const uploaded = await admin.storage.from('store-media').upload(objectPath, sanitized, { contentType: mime, upsert: false });
  if (uploaded.error) return reply(503, 'Não foi possível salvar a imagem.');
  return new Response(JSON.stringify({ path: objectPath }), { headers: { ...headers, 'Content-Type': 'application/json' } });
});
