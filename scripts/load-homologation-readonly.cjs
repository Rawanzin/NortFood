// Bounded, read-only load on the explicitly configured isolated homologation.
// No production endpoint, signup, order, upload or Realtime subscription.
const fs=require('node:fs/promises'),{performance}=require('node:perf_hooks');
const {configuration}=require('./homologation-config.cjs');
async function main(){
 const c=configuration();if(c.url!=='https://zrczgghucwsaxqnyaapk.supabase.co')throw Error('ISOLATED_HOMOLOGATION_REQUIRED');
 const headers={apikey:c.publicConfig.publishableKey};
 const probe=async name=>{const r=await fetch(c.url+'/rest/v1/rpc/'+name,{headers,signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('HOMOLOGATION_PREFLIGHT_FAILED');return r.json()};
 if(await probe('nf_operating_status')!==false)throw Error('ACTIVE_PILOT_LOAD_FORBIDDEN');
 const catalog=await probe('nf_catalog');if(!Array.isArray(catalog)||catalog.length)throw Error('EMPTY_ISOLATED_CATALOG_REQUIRED');
 const cancellation=new AbortController(),latencies=[],codes={},started=performance.now();let errors=0,bytes=0,requests=0,stopReason=null;
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 await Promise.all(Array.from({length:50},async(_,index)=>{
  await delay(index*20);
  for(let round=0;round<10&&!cancellation.signal.aborted;round++){
   const scheduled=started+index*20+round*1000;await delay(Math.max(0,scheduled-performance.now()));if(cancellation.signal.aborted)break;
   const time=performance.now();requests++;
   try{
    const r=await fetch(c.url+'/rest/v1/rpc/nf_catalog',{headers,signal:AbortSignal.any([cancellation.signal,AbortSignal.timeout(3000)])});
    if(!r.ok){codes['HTTP_'+r.status]=(codes['HTTP_'+r.status]||0)+1;throw Error('HTTP_FAILURE')}
    const body=await r.text(),rows=JSON.parse(body);bytes+=Buffer.byteLength(body);if(!Array.isArray(rows)||rows.length)throw Error('UNEXPECTED_CATALOG');
    const duration=performance.now()-time;latencies.push(duration);
    if(duration>1500){stopReason='LATENCY_SAFETY_LIMIT';cancellation.abort()}
   }catch(e){errors++;codes[e.name||'ERROR']=(codes[e.name||'ERROR']||0)+1;stopReason=stopReason||'ERROR_SAFETY_LIMIT';cancellation.abort()}
  }
 }));
 latencies.sort((a,b)=>a-b);const duration=(performance.now()-started)/1000,pct=p=>Math.round((latencies[Math.min(latencies.length-1,Math.floor(latencies.length*p))]||0)*100)/100;
 const report={checkedAt:new Date().toISOString(),target:new URL(c.url).hostname,mode:'GET_ONLY',scope:'50 synthetic anonymous HTTP readers of nf_catalog only, one request per reader per second, ten rounds. No authenticated journeys or production traffic.',virtualReaders:50,maxRequests:500,requests,successfulResponses:latencies.length,errors,errorCodes:codes,errorRate:errors/Math.max(1,requests),stopReason,passed:errors===0&&requests===500&&!stopReason,durationSeconds:duration,requestsPerSecond:Math.round(latencies.length/duration*100)/100,p50Ms:pct(.5),p95Ms:pct(.95),p99Ms:pct(.99),responseBytes:bytes,remoteResourceConsumption:'NOT_MEASURED',otherRemoteLevels:{100:'NOT_TESTED',250:'NOT_TESTED',500:'NOT_TESTED',1000:'NOT_TESTED'},commercialConcurrencyValidated:false};
 await fs.mkdir('test-results/launch-20261023',{recursive:true});await fs.writeFile('test-results/launch-20261023/load-homologation-readonly.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
