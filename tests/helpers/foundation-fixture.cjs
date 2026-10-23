// Estado declarativo da 001 para banco LOCAL vazio. Não executa o arquivo como migração.
// Não usa conexão remota, BEGIN/COMMIT da 001 nem sua inserção de configurações.
const fs=require('node:fs/promises');
async function foundationFixture(db){
 const source=await fs.readFile('supabase/migrations/202610120001_foundation.sql','utf8');
 await db.exec('create schema private;revoke all on schema private from public;grant usage on schema private to anon,authenticated;');
 for(const statement of source.matchAll(/^create table [\s\S]*?;\r?\n/gm))await db.exec(statement[0]);
 for(const statement of source.matchAll(/^create (?:unique )?index .*;$/gm))await db.exec(statement[0]);
 for(const statement of source.matchAll(/^create function .*;$/gm))await db.exec(statement[0]);
 await db.exec('revoke all on all tables in schema private from public,anon,authenticated;alter table private.admin_users enable row level security;revoke all on all functions in schema private from public,anon,authenticated;grant execute on all functions in schema private to anon,authenticated;revoke all on function private.new_profile() from public,anon,authenticated;');
 for(const statement of source.matchAll(/^create trigger .*;$/gm))await db.exec(statement[0]);
 const tables=(await db.query("select tablename from pg_tables where schemaname='public'")).rows;
 for(const {tablename} of tables)await db.exec(`alter table public.${tablename} enable row level security;revoke all on public.${tablename} from anon,authenticated;grant select on public.${tablename} to authenticated;`);
 await db.exec('grant select on public.stores,public.categories,public.store_categories,public.products,public.product_option_groups,public.product_options,public.delivery_zones,public.reviews to anon;grant insert,delete on public.favorites to authenticated;');
 for(const statement of source.matchAll(/^create policy .*;$/gm))await db.exec(statement[0]);
 await db.exec('insert into public.platform_settings(id) values(true);');
}
module.exports={foundationFixture};
