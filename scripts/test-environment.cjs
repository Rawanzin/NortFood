const PRODUCTION_SUPABASE_URL='https://zwkhqahivthzivmuirjr.supabase.co';
function assertDisposableTarget(testUrl,productionUrl,confirmation){
 if(confirmation!=='yes')throw Error('DISPOSABLE_CONFIRMATION_REQUIRED');
 const target=new URL(testUrl),local=['localhost','127.0.0.1','[::1]'].includes(target.hostname);
 if(target.username||target.password||target.search||target.hash||target.pathname!=='/'||!(target.protocol==='https:'||local&&target.protocol==='http:'))throw Error('INVALID_TEST_ENDPOINT');
 if(target.hostname==='zwkhqahivthzivmuirjr.supabase.co'||productionUrl&&target.origin===new URL(productionUrl).origin)throw Error('PRODUCTION_TESTS_FORBIDDEN');
 if(['pnbvtlcnhyzbparyzvbj.supabase.co','eljkzunnbwleooebopui.supabase.co'].includes(target.hostname))throw Error('PROTECTED_PROJECT_TESTS_FORBIDDEN');
 if(!local&&!productionUrl)throw Error('PRODUCTION_REFERENCE_REQUIRED');
 return target.origin;
}
module.exports={assertDisposableTarget,PRODUCTION_SUPABASE_URL};
