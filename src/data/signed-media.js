/** Session-scoped, bounded cache. A late response can never refill a new session. */
export function createSignedMedia({ sign, revision, now = () => Date.now(), limit = 256 }) {
  const cache = new Map(), pending = new Map();
  return {
    clear() { cache.clear(); pending.clear(); },
    async image(path) {
      if (!path) return '';
      const saved = cache.get(path);
      if (saved?.until > now()) return saved.url;
      cache.delete(path);
      if (pending.has(path)) return pending.get(path);
      const started = revision();
      const promise = (async () => {
        try {
          const { data, error } = await sign(path);
          if (error || !data?.signedUrl || revision() !== started) return '';
          cache.set(path, { url:data.signedUrl, until:now() + 1500000 });
          while (cache.size > limit) cache.delete(cache.keys().next().value);
          return data.signedUrl;
        } catch { return ''; }
      })();
      pending.set(path, promise);
      try { return await promise; }
      finally { if (pending.get(path) === promise) pending.delete(path); }
    }
  };
}
