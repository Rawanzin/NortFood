const fs=require('node:fs'),crypto=require('node:crypto');
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function catalogSQL(catalog,{ownerEmail=''}={}){
 if(!catalog?.source||catalog.products?.length!==46||catalog.addons?.length!==11)throw Error('CATALOG_INCOMPLETE');
 if(ownerEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))throw Error('OWNER_EMAIL_INVALID');
 const names=catalog.products.map(p=>normalize(p[0]));if(new Set(names).size!==names.length)throw Error('DUPLICATE_PRODUCT');
 const products=catalog.products.map(([name,price,description,category,restriction],position)=>({name,price,description,category,restriction:restriction||null,position,
 ingredients:['Lanches','Mini Pizzas'].includes(category)?description.replace(/\.$/,'').split(/,\s*| e /).map(x=>x.trim()):[]}));
 const data={...catalog,products,ownerEmail},json=JSON.stringify(data),checksum=crypto.createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
 if(json.includes('$nfcatalog$'))throw Error('UNSAFE_DELIMITER');
 return `begin;
set local lock_timeout='5s';
do $import$
declare data jsonb:=$nfcatalog$${json}$nfcatalog$;s uuid;p uuid;g uuid;o uuid;row jsonb;extra jsonb;matches integer;receipt private.catalog_imports;begin
 perform pg_advisory_xact_lock(hashtextextended('nf:catalog:'||(data->>'source'),0));
 select * into receipt from private.catalog_imports where source_key=data->>'source';
 if found then if receipt.checksum<>'${checksum}' then raise exception 'CATALOG_SOURCE_CHANGED';end if;return;end if;
 select count(*) into matches from public.stores where regexp_replace(lower(name),'[^a-z0-9]','','g') in('danburguer','danburger');
 if matches>1 then raise exception 'AMBIGUOUS_STORE';end if;
 select id into s from public.stores where regexp_replace(lower(name),'[^a-z0-9]','','g') in('danburguer','danburger');
 if s is null then insert into public.stores(name,status,paused,pickup_enabled,delivery_enabled,payment_methods) values(data->'store'->>'name','draft',true,false,false,'{}') returning id into s;end if;
 if exists(select 1 from public.stores where id=s and status not in('draft','pending','rejected')) then raise exception 'STORE_REQUIRES_REVIEW';end if;
 update public.stores set name=data->'store'->>'name',description=data->'store'->>'description',phone=data->'store'->>'phone',whatsapp='',street=data->'store'->>'street',number=data->'store'->>'number',city=data->'store'->>'city',state=data->'store'->>'state',postal_code=data->'store'->>'postal_code',opens_at=(data->'store'->>'opens_at')::time,closes_at=(data->'store'->>'closes_at')::time,working_days=array(select jsonb_array_elements_text(data->'store'->'working_days')::integer),paused=true,pickup_enabled=false,delivery_enabled=false,payment_methods='{}',delivery_info='Cobertura e formas de atendimento aguardam confirmação.' where id=s;
 insert into public.store_setup(store_id,delivery_reference_cents,replacement_reference_cents,pending_notes) values(s,200,300,data->>'pending') on conflict(store_id) do nothing;
 insert into public.store_categories(store_id,category_id) select s,id from public.categories where name in('Hambúrgueres','Pizzas','Bebidas') and active on conflict do nothing;
 if data->>'ownerEmail'<>'' then insert into private.store_invitations(store_id,email) values(s,lower(data->>'ownerEmail')) on conflict(store_id) do nothing;end if;
 for row in select * from jsonb_array_elements(data->'products') loop
  select count(*) into matches from public.products where store_id=s and lower(trim(name))=lower(trim(row->>'name'));
  if matches>1 then raise exception 'AMBIGUOUS_PRODUCT: %',row->>'name';end if;
  select id into p from public.products where store_id=s and lower(trim(name))=lower(trim(row->>'name'));
  if p is null then insert into public.products(store_id,name,price_cents,available) values(s,row->>'name',(row->>'price')::integer,false) returning id into p;end if;
  update public.products set description=row->>'description',price_cents=(row->>'price')::integer,category=row->>'category',ingredients=array(select jsonb_array_elements_text(row->'ingredients')),sale_restriction=row->>'restriction',available=false,position=(row->>'position')::integer where id=p;
  if row->>'category'='Lanches' then
   select count(*) into matches from public.product_option_groups where product_id=p and name='Adicionais' and active;
   if matches>1 then raise exception 'AMBIGUOUS_ADDON_GROUP';end if;
   select id into g from public.product_option_groups where product_id=p and name='Adicionais' and active;
   if g is null then insert into public.product_option_groups(product_id,name,min_choices,max_choices) values(p,'Adicionais',0,11) returning id into g;end if;
   for extra in select * from jsonb_array_elements(data->'addons') loop
    select count(*) into matches from public.product_options where group_id=g and lower(name)=lower(extra->>0) and active;
    if matches>1 then raise exception 'AMBIGUOUS_ADDON';end if;
    select id into o from public.product_options where group_id=g and lower(name)=lower(extra->>0) and active;
    if o is null then insert into public.product_options(group_id,name,price_cents) values(g,extra->>0,(extra->>1)::integer);else update public.product_options set price_cents=(extra->>1)::integer where id=o;end if;
   end loop;
  end if;
 end loop;
 insert into private.catalog_imports(source_key,store_id,checksum) values(data->>'source',s,'${checksum}');
end $import$;
select c.source_key,c.store_id,(select count(*) from public.products p where p.store_id=c.store_id) products from private.catalog_imports c where source_key='${catalog.source.replaceAll("'","''")}';
commit;\n`;
}
module.exports={catalogSQL};
if(require.main===module){const catalog=JSON.parse(fs.readFileSync(process.argv[2]||'supabase/catalogs/dan-burguer.json','utf8'));const target=process.argv[3];if(!target||!target.replaceAll('\\','/').startsWith('.build/'))throw Error('PRIVATE_BUILD_OUTPUT_REQUIRED');fs.mkdirSync('.build',{recursive:true});fs.writeFileSync(target,catalogSQL(catalog,{ownerEmail:process.env.NORTFOOD_IMPORT_OWNER_EMAIL||''}));console.log('Importação transacional preparada; nenhuma operação remota executada.');}
