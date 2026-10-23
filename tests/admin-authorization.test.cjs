const {test}=require('node:test'),assert=require('node:assert/strict'),{PGlite}=require('@electric-sql/pglite'),{prepare}=require('../scripts/prepare-admin-homologation.cjs');
test('Ensaio administrativo sem autorizacao para antes de pedir chave ou abrir conexao',()=>{
 const {spawnSync}=require('node:child_process');const env={...process.env};delete env.NORTFOOD_TEST_ADMIN_AUTHORIZED;delete env.NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY;
 const r=spawnSync(process.execPath,['scripts/homologation-session.cjs','--administrative-tests','--ipc'],{env,encoding:'utf8',timeout:5000,windowsHide:true});assert.equal(r.status,1);assert.match(r.stderr,/SPECIFIC_ADMIN_AUTHORIZATION_REQUIRED/);assert.doesNotMatch(r.stdout,/IPC_LOCAL_READY/);
});
test('Concessao sintetica exige identidade exata; revogacao preserva usuarios e outros administradores',async()=>{
 const db=new PGlite(),p=prepare();try{await db.waitReady;await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create schema private;create table private.admin_users(user_id uuid primary key references auth.users(id));alter table private.admin_users enable row level security;revoke all on private.admin_users from public,anon,authenticated;`);
 await assert.rejects(()=>db.exec(p.grant),/EXCLUSIVE_SYNTHETIC_OPERATOR_REQUIRED/);await db.exec('rollback');
 await db.query('insert into auth.users values($1,$2,$3)',[p.operator.id,p.operator.email,JSON.stringify({name:'OPERADOR SINTETICO — HOMOLOGACAO'})]);const other='11111111-1111-4111-8111-111111111111';await db.query("insert into auth.users values($1,'outro@example.test','{}')",[other]);await db.query('insert into private.admin_users values($1)',[other]);
 await db.exec(p.grant);assert.equal((await db.query('select count(*)::int n from private.admin_users')).rows[0].n,2);await assert.rejects(()=>db.exec(p.grant),/OPERATOR_ALREADY_PRIVILEGED/);await db.exec('rollback');
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from private.admin_users'),/permission denied/);await db.exec('reset role');
 await db.exec(p.revoke);assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,2);assert.deepEqual((await db.query('select user_id from private.admin_users')).rows.map(r=>r.user_id),[other]);await db.exec(p.revoke);assert.equal((await db.query('select count(*)::int n from private.admin_users')).rows[0].n,1);
 }finally{await db.close();}
});
