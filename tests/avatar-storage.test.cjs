const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite');
const {catalogSQL}=require('../scripts/catalog-import.cjs');
const migration='supabase/migrations/202610290013_profile_avatars.sql';
async function baseDatabase(){
 const db=new PGlite();await db.waitReady;
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,banned_until timestamptz,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
 for(const file of (await fs.readdir('supabase/migrations')).filter(file=>file.endsWith('.sql')&&!file.startsWith('202610290013_')).sort())await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
 return db;
}

test('Avatar SQL: migração aditiva preserva catálogo46/20/220, isola leitura/escrita e serializa setter/quotas',async()=>{
 const db=await baseDatabase();try{
  await db.exec(catalogSQL(JSON.parse(await fs.readFile('supabase/catalogs/dan-burguer.json','utf8'))));
  const before=(await db.query(`select (select jsonb_agg(to_jsonb(s) order by id) from public.stores s) stores,
   (select jsonb_agg(to_jsonb(p) order by id) from public.products p) products,
   (select jsonb_agg(to_jsonb(g) order by id) from public.product_option_groups g) groups,
   (select jsonb_agg(to_jsonb(o) order by id) from public.product_options o) options,
   (select to_jsonb(b) from storage.buckets b where id='store-media') media`)).rows[0];
  await db.exec(await fs.readFile(migration,'utf8'));
  assert.equal(before.products.length,46);assert.equal(before.groups.length,20);assert.equal(before.options.length,220);
  const after=(await db.query(`select (select jsonb_agg(to_jsonb(s) order by id) from public.stores s) stores,
   (select jsonb_agg(to_jsonb(p) order by id) from public.products p) products,
   (select jsonb_agg(to_jsonb(g) order by id) from public.product_option_groups g) groups,
   (select jsonb_agg(to_jsonb(o) order by id) from public.product_options o) options,
   (select to_jsonb(b) from storage.buckets b where id='store-media') media`)).rows[0];assert.deepEqual(after,before);
  const a=randomUUID(),b=randomUUID(),pathA=a+'/'+randomUUID()+'.webp',pathA2=a+'/'+randomUUID()+'.webp',pathB=b+'/'+randomUUID()+'.webp';
  for(const id of [a,b])await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{name:'Avatar sintético'}]);
  for(const path of [pathA,pathA2,pathB,a+'/../'+randomUUID()+'.webp'])await db.query("insert into storage.objects(bucket_id,name) values('profile-avatars',$1)",[path]);
  await db.exec(`grant usage on schema storage to anon,authenticated,service_role;grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
   create policy future_avatar_permissive on storage.objects for all to anon,authenticated using(true) with check(true);`);
  const as=async(role,id,fn)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);try{return await fn()}finally{await db.exec('reset role')}};
  const set=(role,id,path)=>as(role,id,()=>db.query('select public.nf_set_profile_avatar($1) previous',[path]).then(result=>result.rows[0].previous));
  for(const actor of ['',a])assert.equal((await as('anon',actor,()=>db.query("select name from storage.objects where bucket_id='profile-avatars'"))).rows.length,0);
  assert.deepEqual((await as('authenticated',a,()=>db.query("select name from storage.objects where bucket_id='profile-avatars' order by name"))).rows.map(row=>row.name),[pathA,pathA2].sort());
  assert.deepEqual((await as('authenticated',b,()=>db.query("select name from storage.objects where bucket_id='profile-avatars'"))).rows.map(row=>row.name),[pathB]);
  for(const role of ['anon','authenticated']){
   await assert.rejects(()=>as(role,a,()=>db.query("insert into storage.objects(bucket_id,name) values('profile-avatars',$1)",[a+'/'+randomUUID()+'.webp'])),/row-level security/);
   assert.equal((await as(role,a,()=>db.query("update storage.objects set name=name where bucket_id='profile-avatars' returning id"))).rows.length,0);
   assert.equal((await as(role,a,()=>db.query("delete from storage.objects where bucket_id='profile-avatars' returning id"))).rows.length,0);
   await assert.rejects(()=>as(role,a,()=>db.exec('truncate storage.objects')),/permission denied/);
  }
  await assert.rejects(()=>set('anon',a,pathA),/permission denied/);await assert.rejects(()=>set('service_role',a,pathA),/permission denied/);
  for(const path of [pathB,a+'/../'+randomUUID()+'.webp','https://fixture.test/'+pathA,a+'/'+randomUUID()+'.png',a+'/'+randomUUID()+'.webp?token=fixture'])await assert.rejects(()=>set('authenticated',a,path),/INVALID_AVATAR_PATH/);
  await assert.rejects(()=>set('authenticated',a,a+'/'+randomUUID()+'.webp'),/AVATAR_OBJECT_REQUIRED/);
  assert.equal(await set('authenticated',a,pathA),null);assert.equal(await set('authenticated',a,pathA2),pathA);
  assert.equal((await as('authenticated',a,()=>db.query('select public.nf_context() c'))).rows[0].c.profile.avatar_path,pathA2);
  assert.equal((await as('authenticated',b,()=>db.query('select avatar_path from public.profiles'))).rows.length,1);
  await assert.rejects(()=>as('authenticated',a,()=>db.query('update public.profiles set avatar_path=$1 where id=$2',[pathA,a])),/permission denied/);
  await assert.rejects(()=>db.query('update public.profiles set avatar_path=$1 where id=$2',[pathB,a]),/nf_profile_avatar_path_check/);
  assert.equal(await set('authenticated',a,null),pathA2);assert.equal((await db.query('select avatar_path from public.profiles where id=$1',[a])).rows[0].avatar_path,null);
  const caps=(await as('authenticated',a,()=>db.query('select public.nf_avatar_capabilities() c'))).rows[0].c;assert.deepEqual(caps,{enabled:true,maxBytes:1048576});
  await assert.rejects(()=>as('anon','',()=>db.query('select public.nf_avatar_capabilities()')),/permission denied/);
  const reserve=(role='service_role',user=a,bytes=100)=>as(role,'',()=>db.query('select public.nf_reserve_avatar_upload($1,$2)',[user,bytes]));
  for(const role of ['anon','authenticated'])await assert.rejects(()=>reserve(role),/permission denied/);
  await assert.rejects(()=>reserve('service_role',randomUUID()),/PROFILE_REQUIRED/);await assert.rejects(()=>reserve('service_role',a,1048577),/INVALID_UPLOAD/);
  for(let i=0;i<5;i++)await reserve();await assert.rejects(()=>reserve(),/AVATAR_UPLOAD_LIMIT/);await reserve('service_role',b);
  await db.query("update private.avatar_upload_reservations set created_at=now()-interval '2 minutes' where user_id=$1",[a]);await reserve();
  await db.query("insert into private.avatar_upload_reservations(user_id,bytes,created_at) select $1,100,now()-interval '3 minutes' from generate_series(1,24)",[a]);await assert.rejects(()=>reserve(),/AVATAR_UPLOAD_LIMIT/);
  for(const role of ['anon','authenticated','service_role']){await assert.rejects(()=>as(role,a,()=>db.query('select * from private.avatar_upload_reservations')),/permission denied/);await assert.rejects(()=>as(role,a,()=>db.exec('truncate private.avatar_upload_reservations')),/permission denied/);}
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='private.avatar_upload_reservations'::regclass")).rows[0].relrowsecurity,true);
  const functions=(await db.query("select p.proname,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('nf_set_profile_avatar','nf_reserve_avatar_upload','nf_avatar_capabilities')")).rows;assert.equal(functions.length,3);assert.ok(functions.every(fn=>fn.proconfig.includes('search_path=""')));
 }finally{await db.close()}
});

test('Avatar SQL: bucket conflitante provoca rollback sem alterar bucket/store-media/perfis',async()=>{
 const db=await baseDatabase();try{
  await db.query("insert into storage.buckets values('profile-avatars','profile-avatars',true,1048576,array['image/png'])");
  const sql=await fs.readFile(migration,'utf8');await assert.rejects(()=>db.exec(sql),/PROFILE_AVATAR_BUCKET_CONFIG_CONFLICT/);await db.exec('rollback');
  assert.equal((await db.query("select public from storage.buckets where id='profile-avatars'")).rows[0].public,true);
  assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_path'")).rows[0].n,0);
 }finally{await db.close()}
});

let magick;
async function decoder(){if(!magick){magick=await import('@imagemagick/magick-wasm');await magick.initializeImageMagick(await fs.readFile(require.resolve('@imagemagick/magick-wasm/magick.wasm')));const {configureDecoderLimits}=await import('../supabase/functions/upload-media/media-validation.mjs');configureDecoderLimits(magick.ResourceLimits);}return magick;}
async function image(format,width=32,height=32,metadata=false){const {ImageMagick,MagickColors,MagickFormat}=await decoder();return ImageMagick.read(MagickColors.Red,width,height,img=>{if(metadata)img.setProfile('xmp',new TextEncoder().encode('<x:xmpmeta xmlns:x="adobe:ns:meta/">FIXTURE_GPS_METADATA</x:xmpmeta>'));return img.write(MagickFormat[format],data=>new Uint8Array(data));});}

test('Avatar WASM real: PNG/JPEG/WebP viram WebP quadrado, sem metadados; MIME/dimensões/truncamento são rejeitados',async()=>{
 const {sanitizeAvatar}=await import('../supabase/functions/profile-avatar/handler.mjs'),{inspectImage}=await import('../supabase/functions/upload-media/media-validation.mjs'),{ImageMagick,MagickFormat}=await decoder();
 for(const [format,mime]of [['Png','image/png'],['Jpeg','image/jpeg'],['WebP','image/webp']]){
  const input=await image(format,32,32,true),output=sanitizeAvatar(input,mime,ImageMagick,MagickFormat);assert.deepEqual(inspectImage(output,'image/webp'),{width:32,height:32,mime:'image/webp'});assert.equal(ImageMagick.read(output,MagickFormat.WebP,img=>img.profileNames.length),0);assert.ok(!new TextDecoder().decode(output).includes('FIXTURE_GPS_METADATA'));
  assert.throws(()=>sanitizeAvatar(input,'image/gif',ImageMagick,MagickFormat));assert.throws(()=>sanitizeAvatar(input.subarray(0,input.length-8),mime,ImageMagick,MagickFormat));
  assert.throws(()=>sanitizeAvatar(input,mime==='image/png'?'image/jpeg':'image/png',ImageMagick,MagickFormat));
 }
 const boundary=sanitizeAvatar(await image('Png',512,512),'image/png',ImageMagick,MagickFormat);assert.equal(inspectImage(boundary,'image/webp').width,512);
 for(const [w,h]of [[513,513],[32,31]]){const input=await image('Png',w,h);assert.throws(()=>sanitizeAvatar(input,'image/png',ImageMagick,MagickFormat));}
});

async function harness(overrides={}){
 const {createAvatarHandler}=await import('../supabase/functions/profile-avatar/handler.mjs'),user=randomUUID(),old=user+'/'+randomUUID()+'.webp',next=randomUUID(),calls=[],removed=[],webp=await image('WebP');let current=old;
 const client={auth:{getUser:async token=>{calls.push('auth');assert.equal(token,'fixture-jwt');return {data:{user:{id:user}},error:overrides.authError||null}}},
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{avatar_path:current},error:overrides.readError||null})})})}),
  rpc:async(name,args)=>{calls.push('set');assert.equal(name,'nf_set_profile_avatar');if(overrides.commitError)return {error:{message:'fixture'}};const previous=current;current=args.p_path;if(overrides.commitLost)throw Error('response lost');return {data:overrides.foreignPrevious||previous,error:null}}};
 const admin={
  rpc:async(name,args)=>{calls.push('quota');assert.equal(name,'nf_reserve_avatar_upload');assert.equal(args.p_user,user);return {data:randomUUID(),error:overrides.quotaError||null}},
  storage:{from:name=>{
   assert.equal(name,'profile-avatars');return {
    upload:async(path,bytes,options)=>{calls.push('upload');assert.equal(path,user+'/'+next+'.webp');assert.equal(options.cacheControl,'0');assert.equal(options.upsert,false);assert.equal(options.contentType,'image/webp');return {error:overrides.uploadError||null}},
    remove:async paths=>{calls.push('remove');removed.push(...paths);return {error:null}}
   };
  }}
 };
 const handler=createAvatarHandler({allowedOrigins:['https://nortfood.pages.dev'],getConfig:()=>({url:'https://fixture.supabase.co',publishable:'public-fixture',secret:'secret-fixture'}),createClient:(_url,key)=>key==='public-fixture'?client:admin,sanitize:async()=>{calls.push('decode');if(overrides.decodeError)throw Error('invalid');return webp},randomUUID:()=>next});
 const request=async({method='POST',origin='https://nortfood.pages.dev',auth='Bearer fixture-jwt',extra=null,blob=null,body=null}={})=>{
  let payload=body;if(method==='POST'&&!body){payload=new FormData();payload.append('file',new Blob([blob||await image('Png')],{type:'image/png'}),'avatar.png');if(extra)payload.append(extra,'forged');}
  return handler(new Request('https://fixture.supabase.co/functions/v1/profile-avatar',{method,headers:{...(origin?{origin}:{}),...(auth?{authorization:auth}:{})},...(payload?{body:payload,...(payload instanceof ReadableStream?{duplex:'half'}:{})}:{})}));
 };
 return {request,calls,removed,user,old,path:user+'/'+next+'.webp',current:()=>current};
}

test('Avatar HTTP: CORS exato/auth real/form limitado; quota antes do decode e path gerado pelo servidor',async()=>{
 let h=await harness();let response=await h.request({method:'OPTIONS',auth:null});assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-methods'),'POST,DELETE,OPTIONS');assert.deepEqual(h.calls,[]);
 for(const origin of ['https://nortfood.pages.dev.evil.test',null]){h=await harness();assert.equal((await h.request({origin})).status,403);assert.deepEqual(h.calls,[]);}
 h=await harness();assert.equal((await h.request({auth:null})).status,401);assert.deepEqual(h.calls,[]);
 h=await harness({authError:{message:'expired'}});assert.equal((await h.request()).status,401);assert.deepEqual(h.calls,['auth']);
 for(const extra of ['user_id','store_id','path']){h=await harness();assert.equal((await h.request({extra})).status,400);assert.deepEqual(h.calls,['auth']);}
 h=await harness();response=await h.request();assert.equal(response.status,200);assert.deepEqual(await response.json(),{path:h.path});assert.equal(h.current(),h.path);assert.deepEqual(h.calls,['auth','quota','decode','upload','set','remove']);assert.deepEqual(h.removed,[h.old]);assert.equal(response.headers.get('cache-control'),'no-store');
 h=await harness();assert.equal((await h.request({blob:new Uint8Array(1048577)})).status,400);assert.deepEqual(h.calls,['auth']);
 h=await harness({quotaError:{message:'AVATAR_UPLOAD_LIMIT'}});assert.equal((await h.request()).status,429);assert.deepEqual(h.calls,['auth','quota']);
 h=await harness({decodeError:true});assert.equal((await h.request()).status,400);assert.deepEqual(h.calls,['auth','quota','decode']);
});

test('Avatar HTTP: falhas limpam só órfãos próprios; commit incerto preserva foto anexada; DELETE é do próprio perfil',async()=>{
 for(const patch of [{uploadError:{message:'fixture'}},{commitError:true}]){const h=await harness(patch);assert.equal((await h.request()).status,503);assert.deepEqual(h.removed,[h.path]);assert.equal(h.current(),h.old);}
 let h=await harness({commitLost:true});let response=await h.request();assert.equal(response.status,200);assert.deepEqual(await response.json(),{path:h.path});assert.equal(h.current(),h.path);assert.deepEqual(h.removed,[]);
 h=await harness({foreignPrevious:randomUUID()+'/'+randomUUID()+'.webp'});assert.equal((await h.request()).status,200);assert.deepEqual(h.removed,[]);
 h=await harness();response=await h.request({method:'DELETE'});assert.equal(response.status,200);assert.deepEqual(await response.json(),{path:null});assert.equal(h.current(),null);assert.deepEqual(h.removed,[h.old]);assert.deepEqual(h.calls,['auth','set','remove']);
 h=await harness();response=await h.request({method:'DELETE',body:new ReadableStream({start(controller){controller.close();}})});assert.equal(response.status,200);assert.deepEqual(h.removed,[h.old]);
 h=await harness();assert.equal((await h.request({method:'DELETE',body:'{"user_id":"forged"}'})).status,400);assert.deepEqual(h.calls,['auth']);
 h=await harness({commitError:true,readError:{message:'offline'}});assert.equal((await h.request()).status,503);assert.deepEqual(h.removed,[]);
});
