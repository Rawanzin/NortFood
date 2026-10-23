/** Browser cart persistence contains no server identity, order or financial snapshot. */
export function createCartStorage(storage) {
  const key = 'nortfood-cart-v2';
  let warned = false;
  return {
    read() {
      const accounts = Object.create(null);
      try {
        const saved = JSON.parse(storage?.getItem(key) || '{}');
        if (saved?.accounts && typeof saved.accounts === 'object' && !Array.isArray(saved.accounts)) {
          for (const [owner, rows] of Object.entries(saved.accounts)) {
            if (owner === '__proto__' || !Array.isArray(rows)) continue;
            accounts[owner] = rows.filter(row => row && typeof row.pid === 'string' && Number.isInteger(row.qty) && row.qty >= 1 && row.qty <= 20).slice(0,40);
          }
        }
      } catch { /* a corrupt journal must not prevent browsing or login */ }
      // The previous account is never selected until the server authenticates it.
      return { accounts, owner:'guest' };
    },
    write(accounts, owner) {
      try {
        if (!storage) throw Error('storage unavailable');
        storage.setItem(key, JSON.stringify({ accounts, owner }));
        return true;
      } catch { return false; }
    },
    shouldWarn() { if (warned) return false; warned = true; return true; }
  };
}
