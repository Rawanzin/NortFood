const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const esbuild=require('esbuild');
const vm=require('node:vm');
const load=async file=>{
  const code=(await esbuild.build({entryPoints:[file],bundle:true,format:'cjs',platform:'node',write:false})).outputFiles[0].text;
  const scope={module:{exports:{}},exports:{},crypto,setTimeout,clearTimeout,AbortController,fetch};
  vm.runInNewContext(code,scope);return scope.module.exports;
};
const memory=()=>{const entries=new Map();return {getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('Checkout: corrupt journal and unavailable storage do not prevent confirmation',async()=>{
  const {createCheckout}=await load('src/application/checkout.js');
  for(const storage of [{getItem:()=>'{broken',setItem(){throw Error('quota')},removeItem(){throw Error('blocked')}},undefined]) {
    const checkout=createCheckout({storage});let called=0;
    assert.equal(await checkout.place('a',{items:['p']},{place:async()=>{called++;return 'order-id'}}),'order-id');
    assert.equal(called,1);
  }
});
test('Checkout: uncertain response is recovered and retry retains the same idempotency key across reload',async()=>{
  const {createCheckout}=await load('src/application/checkout.js'),storage=memory(),request={items:[{product_id:'p',quantity:1}],expected_total_cents:100};
  let key;
  const down={place:async payload=>{key=payload.idempotency_key;throw Error('timeout')},recoverOrder:async()=>null};
  await assert.rejects(()=>createCheckout({storage}).place('owner',request,down),/timeout/);
  let attempted=0;
  const api={place:async payload=>{attempted++;assert.equal(payload.idempotency_key,key);throw Error('lost response')},recoverOrder:async token=>{assert.equal(token,key);return {id:'registered'}}};
  assert.equal(await createCheckout({storage}).place('owner',request,api),'registered');
  assert.equal(storage.getItem('nortfood-checkout-owner'),null);assert.equal(attempted,1);
});
test('Checkout: altered journal payload and changed price cannot reuse the old attempt',async()=>{
  const {createCheckout}=await load('src/application/checkout.js'),storage=memory(),old=crypto.randomUUID(),request={items:['p'],expected_total_cents:200};
  storage.setItem('nortfood-checkout-a',JSON.stringify({canonical:JSON.stringify(request),request:{items:['other'],expected_total_cents:200,idempotency_key:old}}));
  await createCheckout({storage}).place('a',request,{place:async payload=>{assert.notEqual(payload.idempotency_key,old);assert.deepEqual(Array.from(payload.items),['p']);return 'confirmed'}});
});
test('Checkout: two submits in flight cannot create two orders; another owner receives a separate key',async()=>{
  const {createCheckout}=await load('src/application/checkout.js'),checkout=createCheckout({storage:memory()}),gate=deferred(),keys=[];
  const pending=checkout.place('a',{items:['p']},{place:async request=>{keys.push(request.idempotency_key);await gate.promise;return 'a-order'}});
  await assert.rejects(()=>checkout.place('a',{items:['p']},{}),/Aguarde/);
  gate.resolve();await pending;
  await checkout.place('b',{items:['p']},{place:async request=>{keys.push(request.idempotency_key);return 'b-order'}});
  assert.notEqual(keys[0],keys[1]);
});
test('Refresh queue: recovery is retained during boot, coalescing polls without concurrent requests',async()=>{
  const {createRefreshQueue}=await load('src/application/refresh-queue.js'),gate=deferred(),events=[];let running=0,max=0;
  const refresh=createRefreshQueue(async event=>{running++;max=Math.max(max,running);events.push(event);if(event==='BOOT')await gate.promise;running--;});
  const boot=refresh('BOOT');await new Promise(r=>setImmediate(r));
  const recovery=refresh('PASSWORD_RECOVERY');refresh('POLL');refresh('DATABASE_CHANGE');gate.resolve();await Promise.all([boot,recovery]);
  assert.deepEqual(events,['BOOT','PASSWORD_RECOVERY']);assert.equal(max,1);
});
test('Refresh queue: failures propagate and subsequent refreshes can recover',async()=>{
  const {createRefreshQueue}=await load('src/application/refresh-queue.js');let fail=true;
  const refresh=createRefreshQueue(async()=>{if(fail)throw Error('offline')});
  await assert.rejects(()=>refresh(),/offline/);fail=false;await refresh();
});
test('Signed media: concurrency is bounded and identity changes stop starting more requests',async()=>{
  const {resolveCatalogImages}=await load('src/application/catalog-images.js');let active=0,max=0,valid=true,count=0;
  const stores=[{logo:'logo',cover:'cover',products:Array.from({length:20},(_,i)=>[null,null,null,null,null,'image-'+i])}];
  await resolveCatalogImages(stores,async path=>{active++;max=Math.max(max,active);count++;await new Promise(r=>setTimeout(r,5));valid=false;active--;return 'signed:'+path},()=>valid);
  assert.equal(max,4);assert.equal(count,4);
});
test('Snapshot refuses mismatched identities and never exposes a snapshot to a guest',async()=>{
  const {snapshotView}=await load('src/application/snapshot.js');
  assert.throws(()=>snapshotView({profile:{id:'a'},user:{id:'b'},memberships:[]},{},null),/identidade/);
  const guest=snapshotView(null,{snapshot:{orders:[{secret:true}],addresses:[{secret:true}]}},null);
  assert.equal(guest.current,null);assert.equal(guest.orders.length,0);assert.equal(guest.address,undefined);
});
test('HTTP: signal already aborted is forwarded as aborted before starting the request',async()=>{
  const source=(await esbuild.build({entryPoints:['src/platform/http.js'],bundle:true,format:'cjs',write:false})).outputFiles[0].text;
  const scope={module:{exports:{}},exports:{},AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{assert.equal(options.signal.aborted,true);throw new DOMException('Aborted','AbortError')}};
  vm.runInNewContext(source,scope);const controller=new AbortController();controller.abort();
  await assert.rejects(()=>scope.module.exports.timedFetch('https://fixture.test',{signal:controller.signal}),{name:'AbortError'});
});

test('Signed URLs: an old session cannot repopulate the cache; requests are deduplicated and cache is bounded',async()=>{
  const {createSignedMedia}=await load('src/data/signed-media.js'),gate=deferred();let revision=0,calls=0;
  const media=createSignedMedia({revision:()=>revision,limit:2,sign:async path=>{calls++;if(path==='private')await gate.promise;return {data:{signedUrl:'signed:'+path}}}});
  const old=media.image('private');const same=media.image('private');revision++;media.clear();gate.resolve();assert.equal(await old,'');assert.equal(await same,'');assert.equal(calls,1);
  assert.equal(await media.image('private'),'signed:private');assert.equal(calls,2);
  await media.image('a');await media.image('b');await media.image('private');assert.equal(calls,5);
});
test('A command started in one identity cannot mutate or publish into a later session',async()=>{
  const {sessionCommands}=await load('src/application/session-commands.js'),gate=deferred();let revision=0,writes=0;
  const api={sessionRevision:()=>revision,rpc:async()=>{await gate.promise;return 'old-report'},email:async()=>{writes++}};
  const commands=sessionCommands(api),pending=commands.rpc();revision++;gate.resolve();
  await assert.rejects(()=>pending,/sessão mudou/);assert.throws(()=>commands.email('new@example.test'),/sessão mudou/);assert.equal(writes,0);
});

test('Cart persistence refuses malformed accounts and never selects a previous identity before authentication',async()=>{
  const {createCartStorage}=await load('src/platform/cart-storage.js'),storage=memory();
  storage.setItem('nortfood-cart-v2',JSON.stringify({owner:'previous',accounts:{previous:[{pid:'private',qty:1}],guest:[{pid:'guest',qty:2},null,{pid:'bad',qty:-1}],broken:{}}}));
  const saved=createCartStorage(storage).read();assert.equal(saved.owner,'guest');assert.equal(saved.accounts.previous[0].pid,'private');assert.equal(saved.accounts.guest.length,1);assert.equal(saved.accounts.broken,undefined);
  const blocked=createCartStorage({getItem(){throw Error('denied')},setItem(){throw Error('quota')}});assert.equal(blocked.read().owner,'guest');assert.equal(blocked.write({},'guest'),false);assert.equal(blocked.shouldWarn(),true);assert.equal(blocked.shouldWarn(),false);
});
test('Local demo never initializes a real Supabase client, even if public principal configuration is present',async()=>{
  const code=(await esbuild.build({entryPoints:['src/backend.js'],bundle:true,write:false,format:'iife',external:['./pdf-export.js'],plugins:[{name:'forbid-client',setup(build){build.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'sdk',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export function createClient(){throw Error("DEMO_MUST_NOT_INITIALIZE_CLIENT")}'}));}}]})).outputFiles[0].text;
  const scope={window:{NORTFOOD_CONFIG:{supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'}},location:{hostname:'localhost',protocol:'http:',hash:'',search:'?demo=1'},URLSearchParams};
  vm.runInNewContext(code,scope);assert.equal(scope.window.NortFoodBackend.configured,false);assert.equal(scope.window.NortFoodBackend.client,null);
});
