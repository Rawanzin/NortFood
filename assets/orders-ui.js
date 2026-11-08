const statusLabels = {
  pending:'Aguardando confirmação',accepted:'Confirmado',preparing:'Em preparação',ready:'Pronto para entrega',
  ready_for_pickup:'Pronto para retirada',out_for_delivery:'Saiu para entrega',ready_for_table:'Pronto para servir',
  delivered:'Concluído',picked_up:'Retirado',served:'Servido',cancelled:'Cancelado',rejected:'Recusado'
};
// Compatibility DTOs retain their existing internal labels and state machine.
const legacyStatus={'Recebido':'pending','Aceito':'accepted','Aguardando aceite':'pending','Pedido aceito':'accepted','Em preparo':'preparing','Em entrega':'out_for_delivery','Entregue':'delivered','Retirado':'picked_up','Servido':'served'};
const completed = new Set(['delivered','picked_up','served']);
const stopped = new Set(['cancelled','rejected']);
const active = new Set(['pending','accepted','preparing','ready','ready_for_pickup','out_for_delivery','ready_for_table']);
const escape = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const brl = value => Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const svg = (content,viewBox='0 0 24 24') => '<svg viewBox="'+viewBox+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+content+'</svg>';
const arrow = svg('<path d="m9 5 7 7-7 7"/>');
const bag = svg('<path d="M30 43h52l5 53H25l5-53Z"/><path d="M43 47V34a13 13 0 0 1 26 0v13"/><path d="m47 69 7 7 13-14"/>','0 0 112 112');

export function orderStatus(order) {
  let key = order?.backendStatus || order?.raw?.status;
  if (!key) key = Object.keys(statusLabels).find(value => statusLabels[value] === order?.status) ||
    legacyStatus[order?.status];
  return {key:key || 'unknown',label:statusLabels[key] || 'Status indisponível',active:active.has(key),
    terminal:completed.has(key) || stopped.has(key),completed:completed.has(key),stopped:stopped.has(key),
    tone:completed.has(key) ? 'complete' : stopped.has(key) ? 'stopped' : active.has(key) ? 'active' : 'neutral'};
}

export function canReorder(order,stores = []) {
  const state = orderStatus(order),store = stores.find(row => row?.id === order?.store),raw = order?.raw;
  return state.terminal && Array.isArray(raw?.items) && raw.items.length > 0 && raw.id === order.id && raw.store_id === order.store && raw.status === state.key &&
    !!store && store.status === 'approved' && store.paused === false && store.serverOpen === true;
}

function imageURL(value) {
  if (typeof value !== 'string' || !value) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {const url = new URL(value);return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';} catch {return '';}
}

function dateLabel(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return {text:'Data não disponível',iso:''};
  return {text:new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(date),iso:date.toISOString()};
}

function card(order,stores,money,esc,commercial) {
  const state = orderStatus(order),store = stores.find(row => row.id === order.store);
  const name = order.storeName || store?.name || 'Estabelecimento',logo = imageURL(store?.logo),date = dateLabel(order.created);
  const items = Array.isArray(order.items) ? order.items.filter(item => item && typeof item === 'object') : [],summary = items.slice(0,2).map(item => {
    const quantity = Number.isInteger(item.qty) && item.qty > 0 ? item.qty + '× ' : '';
    const options = (Array.isArray(item.extras) ? item.extras : []).map(extra => extra?.name).filter(Boolean);
    return '<li><span>'+esc(quantity + (item.name || 'Item do pedido'))+'</span>'+(options.length ? '<small>'+esc(options.join(', '))+'</small>' : '')+'</li>';
  }).join('');
  const firstProductId=order.raw?.items?.[0]?.product_id||order.items?.[0]?.productId,firstProduct=store?.products?.find(product=>(Array.isArray(product)?product[9]:product.id)===firstProductId),thumbnail=imageURL(Array.isArray(firstProduct)?firstProduct[5]:firstProduct?.image_url);
  const rawCents = order.raw?.total_cents;
  const amount = Number.isSafeInteger(rawCents) && rawCents >= 0 ? rawCents / 100 : !order.raw && Number.isFinite(order.total) && order.total >= 0 ? order.total : null;
  const status = '<span class="nf-order-status nf-order-status--'+state.tone+'"><span></span>'+esc(state.label)+'</span>';
  return '<article class="nf-order-card history-card" aria-label="'+esc('Pedido em '+name+' — '+state.label)+'">'+
    '<div class="nf-order-card-top"><div class="nf-order-store"><span class="nf-order-logo" aria-hidden="true"><span>'+esc(name.slice(0,1).toUpperCase())+'</span>'+(logo ? '<img src="'+esc(logo)+'" alt="" loading="lazy" decoding="async">' : '')+'</span><div><h3>'+esc(name)+'</h3><time'+(date.iso ? ' datetime="'+esc(date.iso)+'"' : '')+'>'+esc(date.text)+'</time></div></div>'+status+'</div>'+
    '<div class="nf-order-summary"><ul class="nf-order-items">'+(summary || '<li>Itens disponíveis nos detalhes do pedido.</li>')+'</ul>'+(thumbnail?'<img class="nf-order-thumb" src="'+esc(thumbnail)+'" alt="Imagem atual do produto" loading="lazy" decoding="async">':'')+'</div>'+
    (items.length > 2 ? '<p class="nf-order-more">e mais '+(items.length - 2)+' '+(items.length === 3 ? 'item' : 'itens')+'</p>' : '')+
    '<div class="nf-order-card-bottom"><div class="nf-order-total"><span>Total do pedido</span><strong>'+(amount === null ? 'Indisponível' : esc(money(amount)))+'</strong></div><div class="nf-order-actions"><button type="button" class="nf-order-detail" data-order-detail="'+esc(order.id)+'">Ver detalhes'+arrow+'</button>'+
    (commercial && canReorder(order,stores) ? '<button type="button" class="nf-order-repeat" data-reorder-order="'+esc(order.id)+'">Pedir novamente</button>' : '')+'</div></div></article>';
}

function empty(title,text,esc) {
  return '<section class="nf-orders-empty"><div class="nf-orders-empty-icon">'+bag+'</div><h2>'+esc(title)+'</h2><p>'+esc(text)+'</p><button type="button" class="nf-orders-explore" data-view="home">Explorar lojas</button></section>';
}

/** Pure HTML renderer for the existing orderView DTO. No data fetch or listeners. */
export function renderOrdersPage({orders = [],stores = [],scope = 'all',money = brl,esc = escape,commercial = true} = {}) {
  const rows = [...orders].filter(order => order && typeof order.id === 'string').sort((a,b) => (Number(b.created) || 0) - (Number(a.created) || 0));
  const filters = [['all','Todos'],['active','Em andamento'],['done','Concluídos'],['cancelled','Cancelados']];
  const heading = '<div class="nf-orders-heading"><h1>Meus pedidos</h1><p>Acompanhe o andamento e consulte seu histórico.</p></div>';
  if (!rows.length) return '<main class="wrap nf-orders-page">'+heading+empty('Você ainda não fez nenhum pedido.','Encontre uma loja perto de você e escolha o que vai pedir hoje.',esc)+'</main>';
  const selected = ['all','active','done','cancelled'].includes(scope) ? scope : 'all';
  const filtered = rows.filter(order => {const state = orderStatus(order);return selected === 'all' || selected === 'active' && state.active || selected === 'done' && state.completed || selected === 'cancelled' && state.stopped;});
  const tabs = '<nav class="nf-orders-filters" aria-label="Filtrar pedidos">'+filters.map(([value,label]) => '<button type="button" class="'+(value === selected ? 'is-active' : '')+'" aria-pressed="'+(value === selected)+'" data-order-scope="'+value+'">'+label+'</button>').join('')+'</nav>';
  const sections = [['active','Em andamento',filtered.filter(order => orderStatus(order).active)],['history','Histórico',filtered.filter(order => !orderStatus(order).active)]];
  const body = filtered.length ? sections.filter(([, ,list]) => list.length).map(([key,label,list]) => '<section class="nf-orders-section" aria-labelledby="nf-orders-'+key+'"><h2 id="nf-orders-'+key+'">'+label+'<span>'+list.length+'</span></h2><div class="nf-orders-list">'+list.map(order => card(order,stores,money,esc,commercial)).join('')+'</div></section>').join('') : empty(selected === 'active' ? 'Nenhum pedido em andamento.' : 'Nenhum pedido neste filtro.','Seus pedidos aparecem aqui assim que forem registrados.',esc);
  return '<main class="wrap nf-orders-page">'+heading+tabs+body+'</main>';
}
