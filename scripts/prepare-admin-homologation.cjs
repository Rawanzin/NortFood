// Apenas prepara SQL revisavel. Nao abre conexao e nao concede privilegio.
const fs=require('node:fs'),path=require('node:path');
const operator={project:'zrczgghucwsaxqnyaapk',id:'6a4d5e61-5f98-41e2-a621-6064f11b39fe',email:'homologacao-admin-631cddb3@example.test'};
const identity=`if not exists(select 1 from auth.users where id='${operator.id}' and email='${operator.email}' and raw_user_meta_data->>'name'='OPERADOR SINTETICO — HOMOLOGACAO') then raise exception 'EXCLUSIVE_SYNTHETIC_OPERATOR_REQUIRED';end if;`;
function prepare(){return {operator,grant:`-- PENDENTE: exige autorizacao especifica. Somente NortFood-Homologacao ${operator.project}.
begin;set local statement_timeout='10s';
do $guard$ begin ${identity}
if exists(select 1 from private.admin_users where user_id='${operator.id}') then raise exception 'OPERATOR_ALREADY_PRIVILEGED_DO_NOT_TAKE_OWNERSHIP';end if;
end $guard$;
insert into private.admin_users(user_id) values('${operator.id}');
select 'TEMPORARY_SYNTHETIC_ADMIN_GRANTED' as result;commit;
`,revoke:`-- Revoga somente o privilegio sintetico aprovado; nao apaga conta nem historico.
begin;set local statement_timeout='10s';
do $guard$ begin ${identity} end $guard$;
delete from private.admin_users where user_id='${operator.id}';
select 'TEMPORARY_SYNTHETIC_ADMIN_REVOKED' as result;commit;
`};}
if(require.main===module){const p=prepare(),folder=path.resolve(__dirname,'../test-results/homologation');fs.mkdirSync(folder,{recursive:true});for(const name of ['grant','revoke'])fs.writeFileSync(path.join(folder,'admin-temporary-'+name+'.sql'),p[name]);fs.writeFileSync(path.join(folder,'admin-authorization-request.json'),JSON.stringify({status:'PENDENTE',...p.operator,scope:'Aprovacao de lojas e ajustes/quitacoes somente de fixtures; revogar ao terminar; sem usuarios reais'},null,2));console.log('SQL de concessao/revogacao preparado; nada executado no Supabase.');}
module.exports={prepare};
