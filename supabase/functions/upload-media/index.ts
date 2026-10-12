import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
const allowedOrigin = Deno.env.get('APP_ORIGIN');
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = { 'Access-Control-Allow-Origin': allowedOrigin || '', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Vary': 'Origin' };
  const reply = (status: number, message: string) => new Response(JSON.stringify({ error: message }), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (!allowedOrigin || origin !== allowedOrigin) return reply(403, 'Origem não autorizada.');
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, 'Método inválido.');
  const authorization = req.headers.get('authorization') || '';
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return reply(401, 'Sessão expirada.');
  // Nunca aceita identidade/autorização fornecida no formulário.
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const store = form?.get('store_id');
  if (!(file instanceof File) || typeof store !== 'string' || !/^[0-9a-f-]{36}$/i.test(store)) return reply(400, 'Imagem ou loja inválida.');
  const { data: membership } = await client.from('store_memberships').select('store_id').eq('store_id', store).eq('user_id', user.id).maybeSingle();
  if (!membership) return reply(403, 'Sem permissão para esta loja.');
  if (file.size < 12 || file.size > 1048576) return reply(400, 'Use uma imagem de até 1 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes.slice(0,8).every((v,i) => v === [137,80,78,71,13,10,26,10][i]);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : '';
  if (!mime || mime !== file.type) return reply(400, 'Formato da imagem não corresponde ao conteúdo.');
  // Credencial administrativa existe somente no servidor. Sem caminho escolhido pelo cliente.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const objectPath = `${store}/${crypto.randomUUID()}.${png ? 'png' : jpeg ? 'jpg' : 'webp'}`;
  const uploaded = await admin.storage.from('store-media').upload(objectPath, bytes, { contentType: mime, upsert: false });
  if (uploaded.error) return reply(503, 'Não foi possível salvar a imagem.');
  return new Response(JSON.stringify({ path: objectPath }), { headers: { ...headers, 'Content-Type': 'application/json' } });
});
