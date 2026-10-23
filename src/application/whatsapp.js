const money = cents => (cents / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});

// Brazilian store number supplied by the approved store, never a customer number.
export function officialWhatsApp(store) {
  if (store?.status !== 'approved') return null;
  let phone = String(store.whatsapp || '').replace(/\D/g, '');
  if (/^\d{10,11}$/.test(phone)) phone = '55' + phone;
  return /^55[1-9]\d(?:9\d{8}|[2-5]\d{7})$/.test(phone) ? phone : null;
}

export function orderWhatsApp(order, store, {privateDetails = false} = {}) {
  const raw = order?.raw, phone = officialWhatsApp(store);
  if (!phone || !raw || raw.store_id !== store.id || raw.id !== order.id ||
      !Number.isSafeInteger(raw.total_cents) || raw.total_cents < 0 || !Array.isArray(raw.items)) return null;
  const lines = ['Pedido NortFood #' + raw.id, store.name];
  for (const item of raw.items) {
    lines.push(item.quantity + '× ' + item.name);
    for (const option of item.options || []) lines.push('  + ' + option.name);
    if (privateDetails && item.notes) lines.push('  Observação: ' + item.notes);
  }
  lines.push('Total registrado: ' + money(raw.total_cents), 'Pagamento: ' + order.payment);
  lines.push(raw.fulfillment === 'delivery' ? 'Entrega' : raw.fulfillment === 'dine_in' ? 'Na mesa' : 'Retirada');
  if (privateDetails) {
    if (order.address) lines.push('Destino: ' + order.address);
    if (order.notes) lines.push('Observações: ' + order.notes);
  }
  lines.push('Aguardo a confirmação da loja no NortFood.');
  const message = lines.join('\n');
  return {phone,message,url:'https://wa.me/' + phone + '?text=' + encodeURIComponent(message)};
}
