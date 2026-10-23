const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function worker() {
  const listeners={},stores=new Map();let fetchImpl=async request=>new Response(new URL(request.url||request,'https://nortfood.test').pathname);
  const key=value=>typeof value==='string'?new URL(value,'https://nortfood.test').href:value.url;
  const caches={
    async open(name){if(!stores.has(name))stores.set(name,new Map());const rows=stores.get(name);return {
      async addAll(paths){for(const file of paths)rows.set(key(file),new Response(file));},
      async match(request){return rows.get(key(request))?.clone();},
      async put(request,response){rows.set(key(request),response.clone());},
      async delete(request){return rows.delete(key(request));}
    }},
    async keys(){return [...stores.keys()]},async delete(name){return stores.delete(name)}
  };
  const self={location:{origin:'https://nortfood.test'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>{self.skipped=true}};
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self,caches,fetch:(...args)=>fetchImpl(...args),URL,Response,Set,Promise});
  async function emit(name,extra={}){const waits=[];let response;listeners[name]({...extra,waitUntil:promise=>waits.push(promise),respondWith:promise=>response=promise});const result=await response;await Promise.all(waits);return result;}
  const request=(url,options={})=>({url:new URL(url,self.location.origin).href,method:'GET',mode:'cors',headers:new Headers(),...options});
  return {self,caches,stores,emit,request,network:fn=>fetchImpl=fn};
}
test('PWA: config, JSON, private HTML, query strings, APIs and authenticated assets never enter cache',async()=>{
  const w=worker();await w.emit('install');let calls=0;w.network(async()=>{calls++;return new Response('private')});
  for(const url of ['/config.js','/secret.json','/private.html','/api/data.js','/assets/secret.json','/assets/photo.png?token=secret','https://abc.supabase.co/a.js'])assert.equal(await w.emit('fetch',{request:w.request(url)}),undefined,url);
  assert.equal(await w.emit('fetch',{request:w.request('/app.js',{headers:new Headers({authorization:'Bearer fixture'})})}),undefined);
  assert.equal(calls,0);
  w.network(async()=>new Response('private',{headers:{'cache-control':'private, no-store'}}));
  const response=await w.emit('fetch',{request:w.request('/app.js')});assert.equal(await response.text(),'private');
  assert.equal(await (await w.caches.open((await w.caches.keys())[0])).match('/app.js'),undefined);
});
test('PWA: a new asset is fetched even when an old version is cached; offline uses only the latest public asset',async()=>{
  const w=worker();await w.emit('install');let version='one';w.network(async()=>new Response(version));
  assert.equal(await (await w.emit('fetch',{request:w.request('/app.js')})).text(),'one');version='two';
  assert.equal(await (await w.emit('fetch',{request:w.request('/app.js')})).text(),'two');w.network(async()=>{throw Error('offline')});
  assert.equal(await (await w.emit('fetch',{request:w.request('/app.js')})).text(),'two');
  const offline=await w.emit('fetch',{request:w.request('/?mesa=private',{mode:'navigate'})});assert.equal(await offline.text(),'/offline.html');
});
test('PWA: activation deletes only old NortFood caches and never forces update without a message',async()=>{
  const w=worker();await w.emit('install');await w.caches.open('nortfood-public-v1');await w.caches.open('another-app');await w.emit('activate');
  assert.equal((await w.caches.keys()).includes('nortfood-public-v1'),false);assert.ok((await w.caches.keys()).includes('another-app'));assert.equal(w.self.skipped,undefined);
  await w.emit('message',{data:{type:'SKIP_WAITING'}});assert.equal(w.self.skipped,true);
});
test('PWA: cache failures never hide a successful network response',async()=>{
  const w=worker();w.caches.open=async()=>{throw Error('storage denied')};w.network(async()=>new Response('current'));
  assert.equal(await (await w.emit('fetch',{request:w.request('/app.js')})).text(),'current');
  w.network(async()=>{throw Error('offline')});assert.equal((await w.emit('fetch',{request:w.request('/',{mode:'navigate'})})).status,503);
});
test('PWA: private/no-store responses are excluded from installation and evict an older cached asset',async()=>{
  const w=worker();w.network(async()=>new Response('protected',{headers:{'Cache-Control':'private, no-store'}}));await w.emit('install');
  const cache=await w.caches.open((await w.caches.keys())[0]);assert.equal(await cache.match('/offline.html'),undefined);
  await cache.put('/app.js',new Response('old'));await w.emit('fetch',{request:w.request('/app.js')});assert.equal(await cache.match('/app.js'),undefined);
});
