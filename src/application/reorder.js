const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const terminal = new Set(['delivered','picked_up','served','cancelled','rejected']);
const cents = value => Number.isSafeInteger(value) && value >= 0;
const validText = (value, limit) => typeof value === 'string' && value.length <= limit;
const unique = values => new Set(values).size === values.length;
const productData = product => Array.isArray(product) ? product[11] : product;
const safeName = (item, fallback) => typeof item?.name === 'string' && item.name.trim() ? item.name.trim().slice(0,80) : fallback;

/** Build a cart proposal from a persisted order and the current public catalog.
 * Does not change the cart, choose address/payment/table, or place an order.
 * The server must validate the resulting checkout again when it is submitted.
 */
export function planReorder({order, stores = [], cart = [], currentTableToken = null} = {}) {
  const base = {ok:false,reason:'',storeId:null,storeName:'',rows:[],lines:[],subtotalCents:0,previousSubtotalCents:null,
    priceChanged:false,itemsChanged:false,warnings:[],requiresCartReplacement:Array.isArray(cart) && cart.length > 0,
    requiresConfirmation:true,orderNotes:''};
  const fail = reason => ({...base,reason});
  const raw = order?.raw;
  if (!raw || !uuid.test(raw.id || '') || raw.id !== order.id || !uuid.test(raw.store_id || '') || raw.store_id !== order.store ||
      !Array.isArray(raw.items) || !raw.items.length || raw.items.length > 40) {
    return fail('Não foi possível recuperar os itens deste pedido. Abra o cardápio da loja para escolher novamente.');
  }
  if (!terminal.has(raw.status) || order.backendStatus && order.backendStatus !== raw.status) {
    return fail('Acompanhe este pedido antes de fazer outro.');
  }
  const store = stores.find(row => row?.id === raw.store_id);
  if (!store || store.status !== 'approved' || store.paused !== false || store.serverOpen !== true) {
    return fail('Esta loja não está recebendo pedidos agora.');
  }
  if (currentTableToken) return fail('Saia do atendimento por mesa antes de montar este novo carrinho.');
  if (!Array.isArray(store.products)) return fail('O cardápio não pôde ser conferido. Atualize e tente novamente.');

  const rows = [], lines = [], warnings = [], currentProducts = new Map();
  let subtotal = 0, priceChanged = false;
  for (const product of store.products) {
    const data = productData(product);
    if (!data || !uuid.test(data.id || '') || Array.isArray(product) && product[9] !== data.id || currentProducts.has(data.id)) {
      return fail('O cardápio não pôde ser conferido. Atualize e tente novamente.');
    }
    currentProducts.set(data.id,data);
  }
  for (const [index,item] of raw.items.entries()) {
    const name = safeName(item,'Item ' + (index + 1));
    const skip = message => warnings.push(name + ': ' + message);
    const product = uuid.test(item?.product_id || '') ? currentProducts.get(item.product_id) : null;
    if (!product || product.available !== true || product.archived === true || product.sale_restriction) {
      skip('não está disponível no cardápio atual.');continue;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 || !cents(product.price_cents) || product.price_cents < 1 || product.price_cents > 1000000) {
      skip('a quantidade ou o preço precisa ser conferido no cardápio.');continue;
    }
    if (item.options !== undefined && !Array.isArray(item.options) || !Array.isArray(product.groups)) {
      skip('a personalização precisa ser conferida no cardápio.');continue;
    }
    const selected = Array.isArray(item.options) ? item.options : [];
    if (!unique(selected.map(option => option?.option_id)) || selected.some(option => !uuid.test(option?.option_id || ''))) {
      skip('os adicionais precisam ser escolhidos novamente.');continue;
    }
    const groups = Array.isArray(product.groups) ? product.groups.filter(group => group.active !== false) : [];
    const options = new Map();let invalidGroups = false;
    for (const group of groups) {
      if (!uuid.test(group.id || '') || !Number.isInteger(group.min_choices) || !Number.isInteger(group.max_choices) ||
          group.min_choices < 0 || group.min_choices > group.max_choices || group.max_choices < 1 || group.max_choices > 20 || !Array.isArray(group.options)) {
        invalidGroups = true;break;
      }
      for (const option of group.options.filter(option => option.active !== false)) {
        if (!uuid.test(option.id || '') || !cents(option.price_cents) || option.price_cents > 1000000 || options.has(option.id)) {invalidGroups = true;break;}
        options.set(option.id,{...option,groupId:group.id});
      }
    }
    if (invalidGroups || selected.some(option => !options.has(option.option_id))) {
      skip('os adicionais mudaram; escolha as opções no cardápio.');continue;
    }
    const chosen = selected.map(option => options.get(option.option_id));
    if (groups.some(group => {const count = chosen.filter(option => option.groupId === group.id).length;return count < group.min_choices || count > group.max_choices;})) {
      skip('os limites de escolhas mudaram; personalize o produto novamente.');continue;
    }
    const removed = item.removed_ingredients === undefined ? [] : item.removed_ingredients;
    if (!Array.isArray(removed) || removed.length > 30 || !unique(removed) || removed.some(value => !validText(value,80) || !Array.isArray(product.ingredients) || !product.ingredients.includes(value))) {
      skip('os ingredientes mudaram; confira as remoções no cardápio.');continue;
    }
    const note = item.notes || '';
    if (!validText(note,180)) {skip('a observação precisa ser revisada.');continue;}
    const extras = chosen.map(option => ({id:option.id,groupId:option.groupId,name:option.name,price:option.price_cents / 100}));
    const unitCents = product.price_cents + chosen.reduce((sum,option) => sum + option.price_cents,0);
    const lineCents = unitCents * item.quantity;
    if (!cents(lineCents) || lineCents > 10000000 || subtotal + lineCents > 10000000) {
      return fail('O valor deste carrinho excede o limite permitido. Escolha uma quantidade menor no cardápio.');
    }
    if (!cents(item.unit_price_cents) || !cents(item.options_cents) || unitCents !== item.unit_price_cents + item.options_cents) priceChanged = true;
    const removals = [...removed].sort();
    rows.push({pid:product.id,qty:item.quantity,extras,note,removedIngredients:removals,table_token:null,
      variantKey:JSON.stringify(extras.map(extra => extra.id).sort()) + '|' + note + (removals.length ? '|sem:' + JSON.stringify(removals) : '')});
    lines.push({productId:product.id,name:product.name,quantity:item.quantity,unitCents,totalCents:lineCents,
      options:chosen.map(option => ({id:option.id,name:option.name,priceCents:option.price_cents})),removedIngredients:[...removals],notes:note});
    subtotal += lineCents;
  }
  if (!rows.length) return {...fail('Os itens deste pedido precisam ser escolhidos novamente no cardápio.'),warnings,itemsChanged:true};
  if (base.requiresCartReplacement) warnings.push('Os itens do carrinho atual serão substituídos somente se você confirmar.');
  if (priceChanged) warnings.push('Há preços atualizados. Confira o subtotal antes de continuar.');
  if (rows.length !== raw.items.length) warnings.push('Somente os itens disponíveis e compatíveis entraram nesta seleção.');
  return {...base,ok:true,storeId:store.id,storeName:store.name,rows,lines,subtotalCents:subtotal,
    previousSubtotalCents:cents(raw.subtotal_cents) ? raw.subtotal_cents : null,priceChanged,itemsChanged:rows.length !== raw.items.length,
    warnings,orderNotes:validText(raw.notes || '',300) ? raw.notes || '' : ''};
}
