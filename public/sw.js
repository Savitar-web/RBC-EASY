/* The production build injects every shipped asset and a content-based revision. */
const { cache: CACHE, assets: PRECACHE } = self.__OFFLINE || { cache: 'rbc-easy-dev', assets: [] };
async function populate() {
  const cache = await caches.open(CACHE);
  // All assets must exist before this version replaces a working offline installation.
  const missing = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < PRECACHE.length) {
      const url = PRECACHE[cursor++];
      if (await cache.match(url, { ignoreVary: true })) continue;
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch { missing.push(url); }
    }
  }));
  if (missing.length) throw new Error('No se pudieron guardar ' + missing.length + ' archivos.');
  return { saved: PRECACHE, missing: [] };
}
self.addEventListener('install', event => event.waitUntil(populate().then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await self.clients.claim();
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith('rbc-easy-') && k !== CACHE).map(k => caches.delete(k)));
})()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_OFFLINE') return;
  event.waitUntil(populate().then(result => event.ports[0]?.postMessage(result))
    .catch(error => event.ports[0]?.postMessage({ error: error.message })));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Serve HTML and its matching versioned scripts together, even during a deployment.
    const cached = await cache.match(request.mode === 'navigate' ? '/index.html' : request, { ignoreVary: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      return response;
    } catch { return new Response('Contenido no disponible sin conexión', { status: 503 }); }
  })());
});
