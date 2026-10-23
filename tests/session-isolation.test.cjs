const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
async function controller(bridge,api){
  const code=(await esbuild.build({entryPoints:['src/commercial.js'],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'dining',setup(build){build.onResolve({filter:/^\.\/qr-menu\.js$/},()=>({path:'fixture',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createDining=()=>({sync(){},validate(){},click:async()=>false,submit:async()=>false})'}));}}]})).outputFiles[0].text;
  const scope={module:{exports:{}},exports:{},crypto:require('node:crypto'),window:{},document:{querySelector:()=>null},location:{hash:''},scrollY:0,scrollTo(){},setTimeout};
  vm.runInNewContext(code,scope);return scope.module.exports.controller(bridge,api);
}
function harness(){
  const d={current:null,orders:[],preferences:{},favoriteAccounts:{},cart:[]},notices=[];
  return {d,bridge:{data:()=>d,esc:String,money:String,connection(){},render(){},swapCart(){},categories(){},toast:text=>notices.push(text),closeModal(){},setView(){},saveCart(){},selectOrder(){}},notices};
}
const context=(id,admin=false)=>({profile:{id},user:{id,email:id+'@example.test'},memberships:[],is_admin:admin});
test('A late signed image cannot commit the former administrator identity or private data',async()=>{
  const {d,bridge}=harness(),image=deferred();let revision=0,owner='old';
  const store={id:'store',name:'Store',opens_at:'11:00',closes_at:'22:00',payment_methods:[],products:[],logo_url:'private/logo.png'};
  const api={sessionRevision:()=>revision,context:async()=>context(owner,true),load:async()=>({catalog:[store],categories:[],snapshot:{},pilotEnabled:false}),rpc:async()=>({settings:{pilot_enabled:false}}),image:async()=>image.promise};
  const ctl=await controller(bridge,api),pending=ctl.refresh('BOOT');await new Promise(r=>setImmediate(r));owner='new';revision++;
  api.context=async()=>context(owner);api.load=async()=>({catalog:[],categories:[],snapshot:{},pilotEnabled:false});
  const next=ctl.refresh('SIGNED_IN');image.resolve('signed-private');await Promise.all([pending,next]);
  assert.equal(d.current.id,'new');assert.equal(ctl.context().is_admin,false);assert.equal(d.stores.length,0);assert.equal(d.orders.length,0);
});
test('Signing out clears private state before the network finishes, including when the new load fails',async()=>{
  const {d,bridge}=harness();let revision=0;const gate=deferred();
  const api={sessionRevision:()=>revision,context:async()=>context('a'),load:async()=>({catalog:[],snapshot:{},pilotEnabled:false})};
  const ctl=await controller(bridge,api);await ctl.refresh('BOOT');d.orders=[{id:'private'}];d.conversations=[{body:'private'}];revision++;
  api.context=async()=>null;api.load=async()=>{await gate.promise;throw Error('offline')};
  const pending=ctl.refresh('SIGNED_OUT');assert.equal(d.current,null);assert.equal(d.orders.length,0);assert.equal(d.conversations.length,0);assert.equal(ctl.context(),null);
  gate.resolve();await assert.rejects(()=>pending,/offline/);assert.equal(d.current,null);
});
test('Account switch during checkout never empties the new cart or opens the old order',async()=>{
  const {d,bridge,notices}=harness();d.current={id:'old'};d.cart=[{pid:'product',qty:1}];let revision=0;const gate=deferred();
  Object.assign(bridge,{cartStore:()=>({id:'store'}),addresses:()=>[],fulfillment:()=> 'pickup',saveCart(){throw Error('wrong cart cleared')},selectOrder(){throw Error('wrong order opened')}});
  const api={configured:true,sessionRevision:()=>revision,place:async()=>{await gate.promise;return 'confirmed-old'},recoverOrder:async()=>null};
  const ctl=await controller(bridge,api),values=new FormData();values.set('payment','Dinheiro ao receber');
  const pending=ctl.submit({id:'checkout-form',dataset:{reviewedTotal:'100'}},values);await new Promise(r=>setImmediate(r));
  d.current={id:'new'};d.cart=[{pid:'new-cart',qty:1}];revision++;gate.resolve();await pending;
  assert.equal(d.cart[0].pid,'new-cart');assert.match(notices[0],/conta que iniciou/);
});
