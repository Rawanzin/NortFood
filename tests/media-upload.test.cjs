const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const {randomUUID}=require('node:crypto');const {PGlite}=require('@electric-sql/pglite');

test('Configuração de upload aceita chaves modernas/legadas e falha fechada',async()=>{
 const {runtimeConfig,configuredOrigin}=await import('../supabase/functions/upload-media/runtime-config.mjs');const read=values=>runtimeConfig({get:k=>values[k]});
 for(const value of ['*','null','https://fixture.example/path','http://public.example','https://user:pass@fixture.example'])assert.equal(configuredOrigin(value),'');
 assert.equal(configuredOrigin('http://localhost:4173'),'http://localhost:4173');assert.equal(configuredOrigin('https://fixture.example'),'https://fixture.example');
 const modern={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEYS:'{"default":"sb_publishable_fixture"}',SUPABASE_SECRET_KEYS:'{"default":"sb_secret_fixture"}'};
 assert.equal(read(modern).publishable,'sb_publishable_fixture');assert.equal(read(modern).secret,'sb_secret_fixture');
 assert.equal(read({SUPABASE_URL:modern.SUPABASE_URL,SUPABASE_ANON_KEY:'anon-fixture',SUPABASE_SERVICE_ROLE_KEY:'service-fixture'}).secret,'service-fixture');
 assert.throws(()=>read({...modern,SUPABASE_SECRET_KEYS:'invalid'}),/SERVER_CONFIGURATION_INVALID/);
 assert.throws(()=>read({...modern,SUPABASE_SECRET_KEYS:'{}'}),/SERVER_CONFIGURATION_MISSING/);
 assert.throws(()=>read({...modern,SUPABASE_URL:modern.SUPABASE_URL+'/rest/v1'}),/SERVER_CONFIGURATION_INVALID/);
});
test('Imagens: decode WASM real, MIME, truncamento, pixels e multipart limitado',async()=>{
 const magick=await import('@imagemagick/magick-wasm'),{ImageMagick,MagickFormat,MagickColors}=magick;
 await magick.initializeImageMagick(await fs.readFile(require.resolve('@imagemagick/magick-wasm/magick.wasm')));
 const {inspectImage,sanitizeImage,boundedForm,MAX_BYTES,configureDecoderLimits}=await import('../supabase/functions/upload-media/media-validation.mjs');
 const tooWide=ImageMagick.read(MagickColors.Red,4097,1,img=>img.write(MagickFormat.Png,data=>new Uint8Array(data)));
 configureDecoderLimits(magick.ResourceLimits);
 for(const [mime,format]of [['image/png',MagickFormat.Png],['image/jpeg',MagickFormat.Jpeg],['image/webp',MagickFormat.WebP]]){
  const image=ImageMagick.read(MagickColors.Red,8,6,img=>img.write(format,data=>new Uint8Array(data)));
  assert.deepEqual(inspectImage(image,mime),{width:8,height:6,mime});const sanitized=sanitizeImage(image,mime,ImageMagick,MagickFormat);assert.equal(inspectImage(sanitized,mime).width,8);
  assert.throws(()=>sanitizeImage(image.subarray(0,image.length-8),mime,ImageMagick,MagickFormat));assert.throws(()=>inspectImage(image,'image/gif'));
 }
 assert.throws(()=>inspectImage(tooWide,'image/png'));
 const fakePng=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);assert.throws(()=>sanitizeImage(fakePng,'image/png',ImageMagick,MagickFormat));
 const form=new FormData();form.append('file',new Blob(['fixture'],{type:'image/png'}),'image.png');form.append('store_id',randomUUID());const parsed=await boundedForm(new Request('http://localhost',{method:'POST',body:form}));assert.equal(parsed.get('file').size,7);
 await assert.rejects(()=>boundedForm(new Request('http://localhost',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=x'},body:new Uint8Array(MAX_BYTES+32769)})),/REQUEST_TOO_LARGE/);
});
test('Quota de mídia: RPC exclusiva do servidor, membros, limites e transação',async()=>{
 const db=new PGlite();await db.waitReady;try{
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create publication supabase_realtime;`);
 for(const file of (await fs.readdir('supabase/migrations')).sort())await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
 const user=randomUUID(),other=randomUUID(),store=randomUUID();for(const id of [user,other])await db.query('insert into auth.users values($1,$2)',[id,{name:'Teste local'}]);await db.query('insert into public.stores(id,name) values($1,$2)',[store,'Loja local']);await db.query("insert into public.store_memberships values($1,$2,'owner')",[store,user]);
 async function reserve(role= 'service_role',actor=user,bytes=100){await db.exec('set role '+role);try{return await db.query('select public.nf_reserve_media_upload($1,$2,$3)',[store,actor,bytes])}finally{await db.exec('reset role')}}
 await assert.rejects(()=>reserve('anon'),/permission denied/);await assert.rejects(()=>reserve('authenticated'),/permission denied/);await assert.rejects(()=>reserve('service_role',other),/STORE_FORBIDDEN/);await assert.rejects(()=>reserve('service_role',user,1048577),/INVALID_UPLOAD/);
 for(let i=0;i<10;i++)await reserve();await assert.rejects(()=>reserve(),/UPLOAD_LIMIT/);assert.equal((await db.query('select count(*)::int n from private.media_upload_reservations')).rows[0].n,10);
 await db.query("update private.media_upload_reservations set created_at=now()-interval '2 minutes'");await reserve();
 await db.query("insert into private.media_upload_reservations(store_id,user_id,bytes,created_at) select $1,$2,100,now()-interval '2 hours' from generate_series(1,89)",[store,user]);await assert.rejects(()=>reserve(),/UPLOAD_LIMIT/);
 for(const role of ['anon','authenticated','service_role']){await db.exec('set role '+role);try{await assert.rejects(()=>db.query('select * from private.media_upload_reservations'),/permission denied/)}finally{await db.exec('reset role')}}
 assert.equal((await db.query("select relrowsecurity from pg_class where oid='private.media_upload_reservations'::regclass")).rows[0].relrowsecurity,true);
 await db.exec(await fs.readFile('supabase/checks/deployment_inventory.sql','utf8'));
 }finally{await db.close()}
});
