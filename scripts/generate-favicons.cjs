// All favicon generation uses the supplied official PNG master.
const {generate}=require('./generate-app-icons.cjs');
module.exports={generate};
if(require.main===module)generate().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
