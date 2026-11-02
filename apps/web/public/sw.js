/* No pages, API responses, audio, transcripts, or authenticated data are cached. */
importScripts('/sw-assets.js');
self.addEventListener('install', event => {
 event.waitUntil((async () => {
  const cache = await caches.open(self.SMRITI_CACHE);
  await cache.addAll(self.SMRITI_ASSETS.map(path => new Request(path, { credentials: 'omit', cache: 'reload' })));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith('smriti-shell-') && name !== self.SMRITI_CACHE).map(name => caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch', event => {
 const req = event.request; const url = new URL(req.url);
 if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || req.headers.has('Authorization')) return;
 if (req.mode === 'navigate') {
  event.respondWith(fetch(req).catch(async () => {
   const cache = await caches.open(self.SMRITI_CACHE);
   return (await cache.match('/offline.html')) || new Response('Smriti is offline. Please reconnect.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })); return;
 }
 if (!url.search && self.SMRITI_ASSETS.includes(url.pathname)) {
  event.respondWith(caches.open(self.SMRITI_CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(req)));
 }
});
