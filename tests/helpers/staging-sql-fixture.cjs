// Protocolo de fixtures SQL reais. Nao atribui cargos nem altera grants/RLS.
const fs=require('node:fs'),path=require('node:path');
async function stagingFixture({url,store,users,category,suffix,rpc,customer,existingStore=false}){
 if(url!=='https://zrczgghucwsaxqnyaapk.supabase.co')throw Error('SQL_FIXTURE_TARGET_FORBIDDEN');
 for(const id of [store,category,...users])if(!/^[a-f0-9-]{36}$/.test(id))throw Error('SQL_FIXTURE_UUID_INVALID');
 if(!/^[a-f0-9]{8}$/.test(suffix))throw Error('SQL_FIXTURE_SUFFIX_INVALID');
 const secondCategory=require('node:crypto').randomUUID(),categories=[category,secondCategory],folder=path.resolve(__dirname,'../../test-results/homologation'),stores=[store];
 const submit=(phase,sql)=>{const file=path.join(folder,`fixture-${suffix}-${phase}.sql`);fs.writeFileSync(file,sql);fs.writeFileSync(path.join(folder,'fixture-request.json'),JSON.stringify({target:new URL(url).hostname,phase,suffix,file,stores,category},null,2));console.log('SQL_FIXTURE_'+phase.toUpperCase()+' '+suffix);};
 const ids=users.map(id=>`'${id}'::uuid`).join(',');
 const setup=`begin; set local statement_timeout='20s';
 do $guard$ begin
 if (select count(*) from auth.users where id in(${ids}) and email like 'nortfood-%@example.test')<>3 then raise exception 'SYNTHETIC_USERS_REQUIRED';end if;
 if not exists(select 1 from public.stores where id='${store}' and name='${existingStore?'TESTE '+suffix:'LOJA DE TESTE — NÃO PUBLICAR'}' and status ${existingStore?"in('approved','suspended')":"='pending'"}) then raise exception 'SYNTHETIC_PENDING_STORE_REQUIRED';end if;
 end $guard$;
 insert into public.categories(id,name,active) values('${category}','TESTE ${suffix}',true),('${secondCategory}','TESTE SECUNDARIA ${suffix}',true) on conflict(name) do update set active=true;
 update public.stores set status='approved',status_reason='FIXTURE HOMOLOGACAO — NAO PUBLICAR' where id='${store}';
 update public.platform_settings set pilot_enabled=true where id=true;
 select 'SQL_FIXTURE_READY_${suffix}' as result; commit;`;
 submit('setup',setup);
 let ready=false;for(let i=0;i<90;i++){const catalog=await rpc(customer,'nf_catalog',{});if(catalog.some(s=>s.id===store)&&await rpc(customer,'nf_operating_status',{})){ready=true;break;}await new Promise(r=>setTimeout(r,1000));}
 if(!ready)throw Error('SQL_FIXTURE_SETUP_PENDING');
 return {stores,categories,async cleanup(){
  const list=stores.map(id=>`'${id}'::uuid`).join(',');
  submit('cleanup',`begin; set local statement_timeout='20s';update public.platform_settings set pilot_enabled=false where id=true;update public.stores set status='suspended',paused=true,open_override=false,status_reason='TESTE ENCERRADO — NAO PUBLICAR' where id in(${list}) and (name like 'TESTE %' or name like 'CONCORRENTE DE TESTE %' or name='LOJA DE TESTE — NÃO PUBLICAR');update public.categories set active=false where name in('TESTE ${suffix}','TESTE SECUNDARIA ${suffix}');select 'SQL_FIXTURE_CLOSED_${suffix}' as result;commit;`);
  for(let i=0;i<90;i++){if(!await rpc(customer,'nf_operating_status',{})){const catalog=await rpc(customer,'nf_catalog',{});if(!catalog.some(s=>stores.includes(s.id)))return;}await new Promise(r=>setTimeout(r,1000));}
  throw Error('SQL_FIXTURE_CLEANUP_PENDING: desativar piloto e suspender lojas pelo SQL preparado');
 }};
}
module.exports={stagingFixture};
