// Hearth Lane app helper. Keeps the big art files (models, textures, sky light) on the device
// after the first download, so the game opens fast and heavier art stays cheap to load.
// Game code and live data always come fresh from the network.
const ART_CACHE = 'hl-art-v2'; // bumped 2026-11-16 so today's replaced models load fresh once
const ART = /\/(models|tex|hdr)\//; /* anywhere in the path: the game may live one folder down (GitHub Pages) */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('hl-art-') && k !== ART_CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !ART.test(url.pathname)) return;
  e.respondWith((async () => {
    const cache = await caches.open(ART_CACHE);
    const hit = await cache.match(e.request);
    /* Serve the saved copy right away, but check for a newer one in the background so a replaced model or texture
       shows up on the next visit (2026-11-16: an updated car never reached devices that had the old one saved). */
    const fresh = fetch(e.request).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || Response.error();
  })());
});
