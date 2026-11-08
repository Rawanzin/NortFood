// Real Chrome + actual PostgreSQL migrations/RLS; local identity adapter only.
// No hosted Auth proof, payment provider, external network or production writes.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),{randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite'),{chromium}=require('playwright'),esbuild=require('esbuild');
test('Merchant UI and PostgreSQL: full drafts, settings, products, checkout, seller receipt and completion in isolated sessions',{timeout:180000},async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/commercial-20261102/journey'),db=new PGlite();await fs.mkdir(out,{recursive:true});
 let browser,server,queue=Promise.resolve();const ids={seller:randomUUID(),other:randomUUID(),customer:randomUUID(),admin:randomUUID()},checks=[],calls=[],errors=[];
 const serial=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p};
 const as=async(role,fn)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[role]||'']);await db.exec('set role '+(ids[role]?'authenticated':'anon'));try{return await fn()}finally{await db.exec('reset role')}};
 const rpc=(role,name,args={})=>serial(()=>as(role,async()=>{assert.match(name,/^nf_[a-z_]+$/);const keys=Object.keys(args);for(const key of keys)assert.match(key,/^p_[a-z_]+$/);return (await db.query(`select public.${name}(${keys.map((k,i)=>k+'=> $'+(i+1)).join(',')}) as v`,Object.values(args))).rows[0].v}));
 try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,banned_until timestamptz,raw_user_meta_data jsonb not null default '{}',email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
  for(const f of (await fs.readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await fs.readFile('supabase/migrations/'+f,'utf8'));
  for(const [role,id]of Object.entries(ids))await db.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',[id,role+'@example.test',{name:'TESTE '+role,role:'admin'}]);
  await db.query('insert into private.admin_users(user_id) values($1)',[ids.admin]);
  const category='c0000000-0000-4000-8000-000000000001',address={street:'Rua Sintética',number:'10',neighborhood:'Centro',city:'Porteirinha',state:'MG',postal_code:'39520-000'};
  for(const role of ['seller','other','customer'])await rpc(role,'nf_complete_onboarding',{p_data:{kind:role==='customer'?'customer':'seller',name:'TESTE '+role,phone:'38999999999',store_name:'LOJA SINTÉTICA '+role,category_id:category,address,consent:true}});
  const store=(await rpc('seller','nf_context')).memberships[0].store_id;
  assert.equal(await rpc('anonymous','nf_operating_status'),false);
  await assert.rejects(()=>rpc('customer','nf_place_order',{p_request:{store_id:store,idempotency_key:randomUUID()}}),/PILOT_NOT_ENABLED/);
  checks.push('Pilot disabled rejects direct order RPC before the isolated fixture is enabled');
  const bundle=await esbuild.build({entryPoints:['src/backend.js'],bundle:true,minify:true,format:'iife',target:'es2022',external:['./pdf-export.js'],write:false});
  server=http.createServer(async(req,res)=>{try{
   const u=new URL(req.url,'http://localhost'),role=u.searchParams.get('identity')||'customer';assert.ok(['seller','other','customer','admin'].includes(role));
   if(u.pathname==='/fixture/rpc'){let raw='';for await(const part of req){raw+=part;if(raw.length>30000)throw Error('REQUEST_TOO_LARGE')};const {name,args}=JSON.parse(raw);calls.push(name);try{const result=await rpc(role,name,args);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:result}));}catch(e){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message}));}return;}
   if(u.pathname==='/fixture/context'){const ctx=await rpc(role,'nf_context');ctx.user={id:ids[role],email:role+'@example.test',email_confirmed_at:'2026-11-02',user_metadata:{}};res.setHeader('Content-Type','application/json');res.end(JSON.stringify(ctx));return;}
   if(u.pathname==='/fixture/categories'){const rows=await serial(()=>db.query('select id,name from public.categories where active order by name'));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(rows.rows));return;}
   const target=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!target.startsWith(root+path.sep))throw Error('PATH');let bytes=await fs.readFile(target);
   if(u.pathname==='/config.js')bytes='window.NORTFOOD_CONFIG={mode:"commercial"};';
   if(u.pathname==='/assets/nortfood-backend.js')bytes=bundle.outputFiles[0].text+`\n(()=>{const api=window.NortFoodBackend,role=new URLSearchParams(location.search).get('identity')||'customer',suffix='?identity='+role;const req=async(name,args={})=>{const r=await fetch('/fixture/rpc'+suffix,{method:'POST',body:JSON.stringify({name,args})}).then(r=>r.json());if(r.error)throw Error(r.error);return r.data};api.configured=true;api.sessionRevision=()=>1;api.initialize=async()=>{};api.context=()=>fetch('/fixture/context'+suffix).then(r=>r.json());api.rpc=req;api.place=request=>req('nf_place_order',{p_request:request});api.recoverOrder=async()=>null;api.categories=()=>fetch('/fixture/categories'+suffix).then(r=>r.json());api.load=async()=>({catalog:await req('nf_catalog'),snapshot:await req('nf_snapshot'),categories:await api.categories(),pilotEnabled:await req('nf_operating_status'),storeDrafts:await req('nf_store_drafts'),storeSetups:await req('nf_store_setup')});api.image=async()=>'';const create=api.controller;api.controller=(bridge,adapter)=>window.__commercialTest=create(bridge,adapter);})();`;
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(target)]||'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'chrome',headless:true});const seller=await browser.newPage({viewport:{width:390,height:844}}),customer=await browser.newPage({viewport:{width:390,height:844}}),admin=await browser.newPage({viewport:{width:1100,height:900}});
  for(const page of [seller,customer,admin]){page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());}
  await seller.goto(origin+'/?identity=seller#seller');await seller.locator('[data-tab=settings]').click();await seller.locator('#store-form').waitFor();
  const draft={state:'SP',postal_code:'01001-000',address_reference:'REFERÊNCIA SINTÉTICA',primaryCategory:category};for(const [key,value]of Object.entries(draft))await seller.locator('#store-form [name='+key+']').fill(value).catch(async()=>{await seller.locator('#store-form [name='+key+']').selectOption(value)});
  await seller.locator('[data-save-store-draft]').click();await seller.waitForFunction(()=>document.getElementById('toast').textContent.includes('Rascunho salvo'));
  await seller.reload();await seller.locator('[data-tab=settings]').click();for(const [key,value]of Object.entries(draft))assert.equal(await seller.locator('#store-form [name='+key+']').inputValue(),value);
  checks.push('Full address/category draft survives reload in mobile UI');
  for(const [key,value]of Object.entries({state:'MG',postal_code:'39520-000',about:'Somente teste isolado',whatsapp:'38999999999',hours:'00:00-23:59',estimateMinutes:'20'}))await seller.locator('#store-form [name='+key+']').fill(value);
  await seller.locator('#store-form [name=pickupEnabled]').check();await seller.locator('#store-form [name=deliveryEnabled]').uncheck();await seller.locator('#store-form [name=payments]').first().check();
  await seller.locator('#store-form button[type=submit]').click();await seller.waitForFunction(()=>document.getElementById('toast').textContent.includes('Perfil salvo'));
  checks.push('Profile, complete address, working hours, payment method and pickup persist via actual SQL');
  await seller.locator('[data-tab=products]').click();await seller.locator('[data-action=add-product]').first().click();await seller.locator('#product-form').waitFor();
  for(const [key,value]of Object.entries({name:'PRODUTO SINTÉTICO',desc:'Produto só de teste',price:'12.50',category:'Categoria sintética',extras:'Queijo:2,50'}))await seller.locator('#product-form [name='+key+']').fill(value);
  await seller.locator('#product-form [name=available]').check();await seller.locator('#product-form').getByRole('button',{name:'Adicionar produto',exact:true}).click();await seller.locator('#product-form').waitFor({state:'hidden'});
  const product=(await serial(()=>db.query('select * from public.products where store_id=$1',[store]))).rows[0];assert.equal(product.price_cents,1250);assert.equal(product.category,'Categoria sintética');
  await seller.locator('[data-product-edit="0"]').click();await seller.locator('#product-form [name=price]').fill('13.00');await seller.locator('#product-form').getByRole('button',{name:'Salvar alterações',exact:true}).click();await seller.locator('#product-form').waitFor({state:'hidden'});
  assert.equal((await serial(()=>db.query('select price_cents from public.products where id=$1',[product.id]))).rows[0].price_cents,1300);checks.push('Product, category, addon and edited price saved by actual merchant UI');
  await assert.rejects(()=>rpc('other','nf_save_product',{p_store:store,p_id:product.id,p_data:{name:'Fraude',price_cents:1},p_groups:[]}),/STORE_FORBIDDEN/);await assert.rejects(()=>rpc('other','nf_set_fulfillment',{p_store:store,p_delivery:true,p_pickup:true}),/STORE_FORBIDDEN/);await assert.rejects(()=>rpc('seller','nf_admin_pilot',{p_enabled:true,p_reason:'Tentativa sintética'}),/ADMIN_REQUIRED/);checks.push('Another seller cannot change store/product; seller cannot enable pilot');
  await seller.locator('[data-submit-store]').click();
  await seller.waitForFunction(()=>document.getElementById('toast').textContent.includes('enviada para análise'));
  await admin.goto(origin+'/?identity=admin#admin');
  await admin.locator('[data-admin-store="'+store+'"]').click();
  await admin.locator('#admin-store-form [name=reason]').fill('Aprovação sintética pelo painel');
  await admin.getByRole('button',{name:'Registrar decisão',exact:true}).click();
  await admin.waitForFunction(()=>document.getElementById('toast').textContent.includes('Decisão auditada'));
  checks.push('Seller submits the store and an independent administrator approves it from the UI');await rpc('admin','nf_admin_pilot',{p_enabled:true,p_reason:'Somente PostgreSQL local descartável'});await rpc('seller','nf_set_store_open',{p_store:store,p_open:true,p_paused:false});
  await customer.goto(origin+'/?identity=customer#shop/'+store);await customer.locator('[data-add]').first().click();await customer.locator('#product-options button.btn').click();await customer.locator('[data-action=cart]').click();await customer.locator('[data-action=checkout]').click();await customer.locator('[data-fulfillment=pickup]').click();await customer.locator('#checkout-form').waitFor();await customer.locator('#checkout-form button.btn').click();await customer.waitForFunction(()=>location.hash.startsWith('#order-detail/'));
  const order=(await serial(()=>db.query('select * from public.orders where store_id=$1',[store]))).rows[0];assert.ok(order);assert.equal(order.total_cents,1300);assert.equal(order.fulfillment,'pickup');checks.push('Authenticated fixture customer: product → cart → checkout → actual SQL order');
  await seller.locator('[data-tab=orders]').click();await seller.evaluate(()=>window.__commercialTest.refresh('DATABASE_CHANGE'));await seller.locator('[data-live-next]').first().waitFor();
  await seller.screenshot({path:path.join(out,'seller-received-mobile.png'),fullPage:true});
  for(const status of ['accepted','preparing','ready_for_pickup','picked_up']){await seller.locator('[data-live-next="'+status+'"]').click();await seller.waitForFunction(s=>!document.querySelector('[data-live-next="'+s+'"]'),status);}
  const completed=(await serial(()=>db.query('select status from public.orders where id=$1',[order.id]))).rows[0];assert.equal(completed.status,'picked_up');assert.equal((await serial(()=>db.query('select amount_cents from public.commission_ledger where order_id=$1',[order.id]))).rows[0].amount_cents,65);checks.push('Seller receives order and completes all pickup states; exact 5% commission recorded once');
  await customer.evaluate(()=>window.__commercialTest.refresh('DATABASE_CHANGE'));assert.match(await customer.locator('main').innerText(),/Retirado/);await customer.screenshot({path:path.join(out,'customer-completed-mobile.png'),fullPage:true});
  await seller.locator('[data-tab=sales]').first().click();
  for(const period of ['today','week','month']){
   await seller.locator('[data-report-period="'+period+'"]').click();
   await seller.getByText(/Líquido estimado:.*12,35/).waitFor();
  }
  await admin.evaluate(()=>window.__commercialTest.refresh('DATABASE_CHANGE'));
  await admin.locator('[data-order-detail="'+order.id+'"]').click();
  await admin.waitForFunction(()=>location.hash.startsWith('#order-detail/'));
  checks.push('Seller reports 1/7/30 days with net sales and administrator opens the stored order');
  for(const width of [320,390,768,1365]){await seller.setViewportSize({width,height:900});assert.equal(await seller.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}await seller.screenshot({path:path.join(out,'seller-desktop.png'),fullPage:true});checks.push('No horizontal overflow at 320/390/768/1365px');
  await rpc('admin','nf_admin_pilot',{p_enabled:false,p_reason:'Fixture local encerrada'});assert.equal(await rpc('anonymous','nf_operating_status'),false);assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify({passed:true,scope:'Real Chrome + real local PostgreSQL/RLS; controlled local identity adapter, no hosted Auth or Realtime proof',checks,calls,productionWrites:false,cleanup:'Disposable database closed; no fixtures persisted'},null,2));
 }catch(error){const pages=browser?.contexts().flatMap(c=>c.pages())||[];const ui=[];for(const page of pages){ui.push(await page.evaluate(()=>({toast:document.getElementById('toast')?.textContent,invalid:[...document.querySelectorAll(':invalid')].map(e=>({name:e.name,message:e.validationMessage})),form:document.getElementById('product-form')?.innerText})));await page.screenshot({path:path.join(out,'failure-'+ui.length+'.png'),fullPage:true});}await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({passed:false,error:error.message,checks,calls,ui},null,2));throw error;}
 finally{await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await db.close();}
});
