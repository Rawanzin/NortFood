import { addressView, orderView, statusNames } from '../compatibility.js';

/** Pure translation of server data into the legacy UI contract. No DOM or storage. */
export function snapshotView(context, loaded, previous, history = []) {
  const profile = context?.profile;
  if (context && (!profile?.id || profile.id !== context.user?.id || !Array.isArray(context.memberships))) {
    throw new Error('Não foi possível validar a identidade. Entre novamente.');
  }
  const current = context ? {
    ...profile,
    email: context.user.email,
    authEmail: context.user.email,
    pendingStoreName: context.user.user_metadata?.requested_store_name || '',
    pendingStorePhone: context.user.user_metadata?.requested_store_phone || '',
    role: context.is_admin ? 'admin' : context.memberships.length ? 'seller' : 'customer',
    storeId: context.memberships.some(row => row.store_id === previous?.storeId) ? previous.storeId : context.memberships[0]?.store_id,
  } : null;
  const snapshot = current ? loaded.snapshot || {} : {};
  const sameOwner = !!current && previous?.id === current.id;
  if (current) current.savedAddresses = (snapshot.addresses || []).map(addressView);
  const address = current?.savedAddresses.find(row => row.id === (sameOwner ? previous.addressDetails?.id : null)) || current?.savedAddresses.find(row => row.is_primary) || current?.savedAddresses[0];
  const latest = (snapshot.orders || []).map(row => orderView(row, current));
  return {
    current, address, latest,
    orders: [...latest, ...(sameOwner ? history.filter(row => !latest.some(next => next.id === row.id)) : [])],
    commissionLedger: snapshot.ledger || [],
    commissionSettlements: snapshot.settlements || [],
    notifications: (snapshot.notifications || []).map(row => ({ id:row.id, email:current?.email, read:!!row.read_at, title:row.title, text:statusNames[row.body] || row.body, created:Date.parse(row.created_at) })),
    conversations: (snapshot.conversations || []).map(row => ({
      id:row.id, email:row.customer_id === current?.id ? current.email : row.customer_id,
      customer:row.customer_name, storeId:row.store_id,
      updated:Date.parse(row.messages.at(-1)?.created_at || row.created_at),
      messages:row.messages.map(message => ({ id:message.id, author:message.sender_name, text:message.body, role:message.sender_id === row.customer_id ? 'customer' : 'seller', created:Date.parse(message.created_at), unreadFor:message.sender_id !== current?.id && Date.parse(message.created_at) > Date.parse(row.read_at || '1970-01-01') ? current?.role : '' })),
    })),
    favorites: { stores:(snapshot.favorites || []).filter(row => row.store_id).map(row => row.store_id), products:(snapshot.favorites || []).filter(row => row.product_id).map(row => row.product_id) },
    reviews:(snapshot.reviews || []).map(row => ({ order:row.order_id, store:row.store_id, customer:row.customer_name, rating:row.rating, text:row.body, created:Date.parse(row.created_at) })),
  };
}
