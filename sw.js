/* Public files only. Configuration, API calls and private responses never enter CacheStorage. */
const CACHE_VERSION = 'nortfood-public-__NORTFOOD_RELEASE__';
const SHELL = ['/offline.html', '/styles.css', '/theme.js', '/theme.css', '/pwa.css', '/favicon.ico', '/assets/icon-192.png'];
const PUBLIC_FILES = new Set([
  ...SHELL, '/app.js', '/refinements.css', '/theme.js', '/theme.css', '/pwa.js', '/site.webmanifest',
  '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png'
]);
const isSupabaseOrPrivate = request => {
  const url = new URL(request.url);
  return url.hostname.endsWith('.supabase.co') || request.headers.has('authorization') ||
    /^\/(?:config\.js|rest|auth|storage|functions|api)(?:\/|$)/i.test(url.pathname);
};
const isPublicAsset = request => {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin && !url.search &&
    !isSupabaseOrPrivate(request) && (PUBLIC_FILES.has(url.pathname) ||
      /^\/assets\/[a-z0-9/_-]+\.(?:css|js|png|jpe?g|svg|webp|ico|woff2?)$/i.test(url.pathname));
};
const cacheable = response => response.ok && !response.redirected &&
  !/\b(?:private|no-store)\b/i.test(response.headers.get('cache-control') || '');

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => Promise.all(SHELL.map(async file => {
    const response = await fetch(file, {cache: 'reload'});
    if (!response.ok) throw new Error('Public shell unavailable');
    if (cacheable(response)) await cache.put(file, response);
  }))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('nortfood-public-') && key !== CACHE_VERSION).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || isSupabaseOrPrivate(request)) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // No cached personalized HTML and no promise of offline ordering.
    event.respondWith(fetch(request).catch(async () =>
      await caches.open(CACHE_VERSION).then(cache => cache.match('/offline.html')).catch(() => null) ||
      new Response('Sem conexão. Reconecte para usar o NortFood.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
    return;
  }
  if (!isPublicAsset(request)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION).catch(() => null);
    try {
      const response = await fetch(request);
      if (cache) event.waitUntil((cacheable(response) ? cache.put(request, response.clone()) : cache.delete(request)).catch(() => {}));
      return response;
    } catch (error) {
      const cached = await cache?.match(request);
      if (cached) return cached;
      throw error;
    }
  })());
});
