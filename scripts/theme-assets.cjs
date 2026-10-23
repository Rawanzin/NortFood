const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
// Fingerprints keep the theme controller and palette coherent across CDN/SW upgrades.
async function themeAssets(root){
 const urls={};await fs.mkdir(path.join(root,'assets/theme'),{recursive:true});
 for(const extension of ['js','css']){
  const bytes=await fs.readFile(path.join(root,'theme.'+extension));
  const name='theme-'+createHash('sha256').update(bytes).digest('hex').slice(0,16)+'.'+extension;
  await fs.writeFile(path.join(root,'assets/theme',name),bytes);urls[extension]='/assets/theme/'+name;
 }
 return {urls,render:html=>html.replace(/\b(src|href)="\/?theme\.(js|css)"/g,(_,attribute,extension)=>attribute+'="'+urls[extension]+'"')};
}
module.exports={themeAssets};
