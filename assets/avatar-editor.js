const MAX_INPUT=8*1024*1024,MAX_PIXELS=24000000,MAX_OUTPUT=524288;
const types=new Set(['image/jpeg','image/png','image/webp']);
export async function validateAvatarFile(file){
 if(!file||!types.has(file.type)||file.size<12||file.size>MAX_INPUT)throw Error('Escolha JPG, PNG ou WebP de até 8 MB.');
 const bytes=new Uint8Array(await file.slice(0,32).arrayBuffer());
 const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!(file.type==='image/png'&&png||file.type==='image/jpeg'&&jpeg||file.type==='image/webp'&&webp))throw Error('O conteúdo do arquivo não corresponde ao formato da imagem.');
 return file;
}
export function cropRegion(width,height,zoom=1,x=0,y=0){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width*height>MAX_PIXELS)throw Error('Escolha uma imagem de até 24 megapixels.');
 const scale=Math.max(1,Math.min(3,Number(zoom)||1)),side=Math.min(width,height)/scale;
 return {x:((width-side)/2)*(1+Math.max(-1,Math.min(1,Number(x)||0))),y:((height-side)/2)*(1+Math.max(-1,Math.min(1,Number(y)||0))),side};
}
export function avatarEditorHTML({enabled=false,hasPhoto=false}={}){
 return '<div class="modal-head"><h2>Foto de perfil</h2><button class="close" type="button" data-action="close-modal" aria-label="Fechar foto de perfil">×</button></div><form class="nf-avatar-editor" aria-label="Editar foto de perfil" novalidate><p>Escolha uma foto e ajuste o recorte. A imagem será exibida em um círculo.</p><input data-avatar-file type="file" accept="image/jpeg,image/png,image/webp" hidden><input data-avatar-camera type="file" accept="image/jpeg,image/png,image/webp" capture="user" hidden><div class="nf-avatar-picker"><button class="btn outline" type="button" data-avatar-gallery>Escolher foto</button><button class="btn outline" type="button" data-avatar-take>Usar câmera</button></div><div class="nf-avatar-preview"><canvas data-avatar-canvas width="512" height="512" aria-label="Prévia quadrada do recorte da foto"></canvas></div><div class="nf-avatar-controls"><label>Ampliar<input data-avatar-zoom type="range" min="1" max="3" step="0.05" value="1"></label><label>Ajuste horizontal<input data-avatar-x type="range" min="-1" max="1" step="0.02" value="0"></label><label>Ajuste vertical<input data-avatar-y type="range" min="-1" max="1" step="0.02" value="0"></label></div><p data-avatar-status role="status">'+(enabled?'JPG, PNG ou WebP de até 8 MB. A foto será reduzida e comprimida antes do envio.':'O envio de fotos está temporariamente indisponível. Você pode visualizar o recorte, mas ele ainda não será salvo.')+'</p><p data-avatar-error role="alert"></p><div class="nf-avatar-actions"><button type="button" class="btn" data-avatar-save disabled>Salvar foto</button>'+(hasPhoto?'<button type="button" class="btn outline" data-avatar-remove '+(enabled?'':'disabled')+'>Remover foto</button>':'')+'</div></form>';
}
export function mountAvatarEditor({root,enabled,getIdentity,save,remove,onSaved,onError}){
 const identity=getIdentity(),abort=new AbortController(),canvas=root.querySelector('[data-avatar-canvas]'),ctx=canvas.getContext('2d'),status=root.querySelector('[data-avatar-status]'),error=root.querySelector('[data-avatar-error]'),saveButton=root.querySelector('[data-avatar-save]');
 let bitmap=null,closed=false,busy=false,revision=0;
 const listen=(node,event,handler)=>node?.addEventListener(event,handler,{signal:abort.signal});
 const current=()=>!closed&&getIdentity()===identity;
 const fail=err=>{if(current()){error.textContent=err.message||'Não foi possível salvar a foto.';status.textContent=busy?'Envio encerrado sem confirmação. Confira sua foto e tente novamente.':'Sua foto não foi alterada. Escolha outro arquivo para continuar.';onError?.(err)}};
 const render=()=>{ctx.clearRect(0,0,512,512);if(!bitmap){ctx.fillStyle='#eeeeee';ctx.fillRect(0,0,512,512);return}const region=cropRegion(bitmap.width,bitmap.height,root.querySelector('[data-avatar-zoom]').value,root.querySelector('[data-avatar-x]').value,root.querySelector('[data-avatar-y]').value);ctx.drawImage(bitmap,region.x,region.y,region.side,region.side,0,0,512,512)};
 async function selected(file){if(busy)return;const started=++revision;error.textContent='';saveButton.disabled=true;let next;try{await validateAvatarFile(file);next=await createImageBitmap(file,{imageOrientation:'from-image'});cropRegion(next.width,next.height);if(!current()||started!==revision){next.close();return}bitmap?.close();bitmap=next;for(const [key,value]of [['zoom','1'],['x','0'],['y','0']])root.querySelector('[data-avatar-'+key+']').value=value;render();saveButton.disabled=!enabled;status.textContent=enabled?'Prévia pronta. Confira o recorte antes de salvar.':'Prévia pronta. O envio de fotos ainda está indisponível.';}catch(err){next?.close();fail(err)}}
 for(const input of root.querySelectorAll('[data-avatar-file],[data-avatar-camera]'))listen(input,'change',()=>{if(input.files?.[0])selected(input.files[0])});
 listen(root.querySelector('[data-avatar-gallery]'),'click',()=>root.querySelector('[data-avatar-file]').click());listen(root.querySelector('[data-avatar-take]'),'click',()=>root.querySelector('[data-avatar-camera]').click());
 for(const input of root.querySelectorAll('.nf-avatar-controls input'))listen(input,'input',()=>{if(!busy)render()});
 async function operation(action){if(!current()||busy)return;busy=true;error.textContent='';for(const button of root.querySelectorAll('button'))button.disabled=true;root.setAttribute('aria-busy','true');try{const result=await action();if(current())await onSaved(result)}catch(err){fail(err)}finally{busy=false;if(current()){root.removeAttribute('aria-busy');for(const button of root.querySelectorAll('button'))button.disabled=false;saveButton.disabled=!enabled||!bitmap;}}}
 listen(saveButton,'click',()=>{if(!bitmap||!enabled)return;operation(async()=>{render();status.textContent='Preparando sua foto…';let blob;for(const quality of [.84,.72,.6,.48]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.type!=='image/webp')blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob?.size<=MAX_OUTPUT)break}if(!blob||blob.size>MAX_OUTPUT||!types.has(blob.type))throw Error('Não foi possível reduzir a foto. Escolha outra imagem.');if(!current())throw Error('Sua sessão mudou. Entre novamente antes de salvar.');status.textContent='Enviando sua foto…';return save(blob)})});
 listen(root.querySelector('[data-avatar-remove]'),'click',()=>{if(enabled&&confirm('Remover sua foto de perfil?'))operation(()=>remove())});
 render();return {dispose(){closed=true;revision++;abort.abort();bitmap?.close();bitmap=null}};
}
