const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Server remains authoritative for price, authorization and order creation.
 * Storage is a best-effort retry journal, never proof that an order exists.
 */
export function createCheckout({ storage, randomUUID = () => crypto.randomUUID() } = {}) {
  const attempts = new Map();
  let active = false;
  const keyFor = owner => 'nortfood-checkout-' + owner;
  function read(owner, canonical) {
    let saved;
    try { saved = JSON.parse(storage?.getItem(keyFor(owner)) || 'null'); } catch { /* corrupted/unavailable storage */ }
    // Accept the old envelope too, but never trust an altered stored payload.
    if (saved?.canonical !== canonical || !uuid.test(saved.request?.idempotency_key || '')) return null;
    const { idempotency_key, ...request } = saved.request;
    return JSON.stringify(request) === canonical ? saved : null;
  }
  return {
    get busy() { return active; },
    async place(owner, request, api) {
      if (active) throw new Error('Aguarde a confirmação do pedido em andamento.');
      active = true;
      try {
        const canonical = JSON.stringify(request);
        let attempt = attempts.get(owner);
        if (attempt?.canonical !== canonical) attempt = read(owner, canonical) || { canonical, request: { ...request, idempotency_key: randomUUID() } };
        attempts.set(owner, attempt);
        try { storage?.setItem(keyFor(owner), JSON.stringify(attempt)); } catch { /* continue with in-memory idempotency */ }
        let id;
        try { id = await api.place(attempt.request); }
        catch (error) {
          const existing = await api.recoverOrder(attempt.request.idempotency_key).catch(() => null);
          if (!existing) throw error;
          id = existing.id;
        }
        if (typeof id !== 'string' || !id) throw new Error('O servidor não confirmou o pedido. Tente novamente para consultar esta tentativa.');
        attempts.delete(owner);
        try { storage?.removeItem(keyFor(owner)); } catch { /* do not mask an accepted order */ }
        return id;
      } finally { active = false; }
    }
  };
}
