const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');

function validatePublicScripts(files) {
  for (const file of files) {
    const result = spawnSync(process.execPath,['--check',path.resolve(file)],{encoding:'utf8',windowsHide:true});
    if (result.status !== 0) throw Error('PUBLIC_SCRIPT_SYNTAX_INVALID: ' + file);
  }
}

// Only build-owned directories may be removed, renamed or promoted.
const buildRoot = path.resolve('.build');
async function removeOwned(target) {
  const absolute = path.resolve(target);
  if (!absolute.startsWith(buildRoot + path.sep)) throw Error('BUILD_CLEANUP_OUTSIDE_STAGING');
  await fs.rm(absolute, {recursive:true,force:true});
}
async function stagingDirectory(output) {
  if (!['dist','dist-homologacao','dist-hostinger','dist-pages'].includes(output)) throw Error('INVALID_BUILD_TARGET');
  await fs.mkdir(buildRoot,{recursive:true});
  return fs.mkdtemp(path.join(buildRoot,output+'-'));
}
async function promote(staged, output) {
  if (!['dist','dist-homologacao','dist-hostinger','dist-pages'].includes(output) || !path.resolve(staged).startsWith(buildRoot + path.sep)) throw Error('INVALID_BUILD_TARGET');
  const destination = path.resolve(output);
  const previous = path.join(buildRoot,'previous-'+output+'-'+crypto.randomUUID());
  const stat = await fs.lstat(destination).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
  if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw Error('BUILD_OUTPUT_MUST_BE_DIRECTORY');
  if (stat) await fs.rename(destination,previous);
  try { await fs.rename(staged,destination); }
  catch (error) { if(stat)await fs.rename(previous,destination);throw error; }
  if (stat) await removeOwned(previous);
}
async function releaseId(directory) {
  const hash = crypto.createHash('sha256');
  async function walk(folder) {
    const entries = await fs.readdir(folder,{withFileTypes:true});
    for (const entry of entries.sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      const file = path.join(folder,entry.name);
      if(entry.isSymbolicLink())throw Error('BUILD_SYMLINK_FORBIDDEN');
      if(entry.isDirectory())await walk(file);
      else if(entry.name!=='sw.js'&&entry.name!=='release.json') {
        hash.update(path.relative(directory,file).replaceAll('\\','/')+'\0');
        hash.update(await fs.readFile(file));
      }
    }
  }
  await walk(directory);
  return hash.digest('hex').slice(0,20);
}
module.exports={stagingDirectory,promote,removeOwned,releaseId,validatePublicScripts};
