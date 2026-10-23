// Equivalent HTTP load runner. Loopback only; never contacts Supabase or Netlify.
const http=require('node:http'),fs=require('node:fs/promises'),{performance}=require('node:perf_hooks');
const {server}=require('./serve.cjs');
async function main(){
 const app=await server({root:require('node:path').resolve('dist'),config:{mode:'commercial',publicPreview:true}});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const agent=new http.Agent({keepAlive:true,maxSockets:1000}),origin='http://127.0.0.1:'+app.address().port;
 const scenarios=[];
 try{
  for(const users of [50,100,250,500,1000]){
   const durations=[],started=performance.now(),cpu=process.cpuUsage(),until=started+5000;let errors=0,bytes=0,peakRss=process.memoryUsage().rss;
   const probe=()=>new Promise(resolve=>{const time=performance.now();const req=http.get(origin+'/',{agent,timeout:15000},res=>{res.on('data',chunk=>{bytes+=chunk.length});res.on('end',()=>{if(res.statusCode!==200)errors++;durations.push(performance.now()-time);resolve();});res.on('error',()=>{errors++;resolve()})});req.on('timeout',()=>req.destroy());req.on('error',()=>{errors++;resolve()});});
   await Promise.all(Array.from({length:users},async()=>{do{await probe();peakRss=Math.max(peakRss,process.memoryUsage().rss)}while(performance.now()<until)}));
   durations.sort((a,b)=>a-b);const elapsed=performance.now()-started,used=process.cpuUsage(cpu),pct=p=>Math.round((durations[Math.min(durations.length-1,Math.floor(durations.length*p))]||0)*100)/100;
   const result={virtualUsers:users,scope:'Local static HTTP server, GET / only, no browser/API/Auth/Realtime/checkout, no external traffic',durationSeconds:Math.round(elapsed)/1000,requests:durations.length,errors,errorRate:errors/Math.max(1,durations.length+errors),requestsPerSecond:Math.round(durations.length/(elapsed/1000)*100)/100,p50Ms:pct(.5),p95Ms:pct(.95),p99Ms:pct(.99),bytes,cpuMs:(used.user+used.system)/1000,peakRssMiB:Math.round(peakRss/1048576)};
   scenarios.push(result);console.log(JSON.stringify(result));
  }
 }finally{agent.destroy();await new Promise(r=>app.close(r))}
 const report={checkedAt:new Date().toISOString(),target:origin,productionUsersValidated:0,backendConcurrencyValidated:false,limitations:'Loopback static reads only. Does not establish Netlify capacity, PostgreSQL throughput, Supabase free quotas, full journeys, device performance or 1000 real concurrent users.',scenarios};
 await fs.mkdir('test-results/launch-20261023',{recursive:true});await fs.writeFile('test-results/launch-20261023/load-local.json',JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
