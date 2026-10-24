const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite');
test('Cadastro completo PostgreSQL: endereço privado, categoria, reentrada idempotente e edição posterior',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
  for(const f of (await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await fs.readFile('supabase/migrations/'+f,'utf8'));
  const customer=randomUUID(),seller=randomUUID(),other=randomUUID();for(const id of [customer,seller,other])await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{name:'Pessoa Sintética',role:'admin'}]);
  const as=async(id,fn)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}};
  const call=(name,args=[])=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args).then(r=>r.rows[0].v);
  const address={street:'Rua Sintética',number:'10',neighborhood:'Centro Sintético',city:'Porteirinha',state:'mg',postal_code:'39520-000',complement:'Fundos',reference:'Referência de teste'},payload={kind:'customer',name:'CLIENTE SINTÉTICO',phone:'(38) 99999-9999',address,consent:true};
  await assert.rejects(()=>as(null,()=>call('nf_complete_onboarding',[payload])),/permission denied/);
  for(const change of [{address:{...address,neighborhood:''}},{address:{...address,postal_code:'não é CEP'}},{phone:'123'},{consent:false}])await assert.rejects(()=>as(customer,()=>call('nf_complete_onboarding',[{...payload,...change}])));
  assert.equal((await db.query('select count(*)::int n from private.account_onboarding')).rows[0].n,0);
  const receipt=await as(customer,()=>call('nf_complete_onboarding',[payload]));assert.equal(receipt.kind,'customer');assert.ok(receipt.address_id);assert.equal(receipt.user_id,undefined);
  const ctx=await as(customer,()=>call('nf_context'));assert.equal(ctx.profile.phone,'38999999999');assert.equal(ctx.profile.name,payload.name);assert.equal(ctx.is_admin,false);assert.ok(ctx.onboarding.customer);assert.equal(ctx.memberships.length,0);
  assert.equal((await db.query('select postal_code from public.addresses where id=$1',[receipt.address_id])).rows[0].postal_code,'39520000');
  assert.equal((await as(other,()=>db.query('select * from public.addresses'))).rows.length,0);
  const edited={...address,label:'Principal',street:'Rua Sintética Editada',state:'MG',is_primary:true};await as(customer,()=>call('nf_save_address',[receipt.address_id,edited]));assert.equal((await as(customer,()=>call('nf_complete_onboarding',[payload]))).address_id,receipt.address_id);
  assert.equal((await db.query('select count(*)::int n from public.addresses')).rows[0].n,1);assert.equal((await db.query('select street from public.addresses')).rows[0].street,edited.street);
  await as(customer,()=>call('nf_save_address',[receipt.address_id,{...edited,postal_code:undefined}]));assert.equal((await db.query('select postal_code from public.addresses')).rows[0].postal_code,'39520000');
  await assert.rejects(()=>as(customer,()=>call('nf_save_address',[receipt.address_id,{...edited,postal_code:'ABCDE000'}])),/INVALID_POSTAL_CODE/);
  await assert.rejects(()=>as(other,()=>call('nf_save_address',[receipt.address_id,address])),/ADDRESS_FORBIDDEN/);
  const cid=(await db.query('select id from public.categories order by name limit 1')).rows[0].id,sellerData={...payload,kind:'seller',name:'VENDEDOR SINTÉTICO',store_name:'LOJA SINTÉTICA',category_id:cid};
  await assert.rejects(()=>as(seller,()=>call('nf_complete_onboarding',[{...sellerData,category_id:randomUUID()}])),/INVALID_CATEGORIES/);assert.equal((await db.query('select count(*)::int n from public.stores')).rows[0].n,0);
  const shop=await as(seller,()=>call('nf_complete_onboarding',[sellerData]));assert.equal((await as(seller,()=>call('nf_complete_onboarding',[{...sellerData,store_name:'Não duplicar'}]))).store_id,shop.store_id);
  const row=(await db.query('select * from public.stores')).rows[0];assert.equal(row.name,'LOJA SINTÉTICA');assert.equal(row.street,address.street);assert.equal(row.state,'MG');assert.equal(row.primary_category_id,cid);assert.equal(row.paused,true);assert.equal(row.status,'draft');assert.equal(row.whatsapp,'');assert.equal(row.postal_code,'39520000');assert.equal(row.address_reference,address.reference);
  const storeEdit={...row,postal_code:'39521-000',state:'SP',address_reference:'Referência atualizada'};await as(seller,()=>call('nf_save_store',[shop.store_id,storeEdit,[cid],[]]));
  const updated=(await db.query('select postal_code,state,address_reference from public.stores')).rows[0];assert.deepEqual(updated,{postal_code:'39521000',state:'SP',address_reference:'Referência atualizada'});
  await assert.rejects(()=>as(other,()=>call('nf_save_store',[shop.store_id,storeEdit,[cid],[]])),/STORE_FORBIDDEN/);
  await assert.rejects(()=>as(seller,()=>call('nf_save_store',[shop.store_id,{...storeEdit,postal_code:'CEP inválido'},[cid],[]])),/INVALID_POSTAL_CODE/);
  const anotherCategory=(await db.query('select id from public.categories where id<>$1 limit 1',[cid])).rows[0].id;
  await assert.rejects(()=>as(seller,()=>call('nf_save_store',[shop.store_id,{primary_category_id:anotherCategory},[cid],[]])),/INVALID_CATEGORIES/);
  assert.deepEqual(await as(other,()=>call('nf_catalog')),[]);assert.equal((await as(other,()=>call('nf_context'))).onboarding.customer,undefined);assert.equal((await db.query('select pilot_enabled from public.platform_settings')).rows[0].pilot_enabled,false);
 }finally{await db.close();}
});

test('Rascunho temporário não armazena senha, não cruza identidades e expira',async()=>{
 const {createOnboardingDraft}=await import('../src/platform/onboarding-draft.js');const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let now=1000;const draft=createOnboardingDraft(storage,()=>now),payload={kind:'customer',name:'SINTÉTICO',phone:'38999999999',address:{street:'Rua de Teste'},password:'NUNCA_PERSISTIR',confirmPassword:'NUNCA_PERSISTIR'};
 // Um recibo vinculado precisa ficar invisível a outro UID, não apenas marcar bound:false.
 draft.save('TEST@example.test',payload);assert.equal(JSON.stringify([...values.values()]).includes('NUNCA_PERSISTIR'),false);draft.bind('test@example.test','identity-a');assert.equal(draft.get('test@example.test','identity-a').bound,true);assert.equal(draft.get('test@example.test','identity-b'),null);assert.equal(draft.get('test@example.test'),null);assert.equal(draft.get('test@example.test','identity-a').address.street,payload.address.street);assert.equal(draft.get('other@example.test','identity-a'),null);
 now+=86400001;assert.equal(draft.get('test@example.test','identity-a'),null);
 draft.save('test@example.test',payload);const blocked={getItem:k=>storage.getItem(k),setItem(){throw Error('quota')},removeItem(){throw Error('blocked')}};const temp=createOnboardingDraft(blocked,()=>now);temp.save('other@example.test',{...payload,name:'OUTRA IDENTIDADE'});assert.equal(temp.get('other@example.test','identity-c').name,'OUTRA IDENTIDADE');temp.clear();assert.equal(temp.get('test@example.test','identity-a'),null);
});
