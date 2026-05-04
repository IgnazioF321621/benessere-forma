// Zona Tracker — Service Worker
// Strategia: network-first per il documento HTML, cache-first SOLO per la libreria JS su jsdelivr.
// Le chiamate REST a *.supabase.co non vengono intercettate (default browser, sempre network).

const CACHE = 'zt-v2';
const HTML_URL = '/benessere-forma/zona-tracker.html';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Navigazione verso l'app HTML → network-first, poi cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('zona-tracker.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => {
          // Salva la versione fresca in cache
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Libreria Supabase JS via CDN → cache-first (URL versionata, cambia raramente).
  // ATTENZIONE: non includere 'supabase' nell'hostname check, altrimenti
  // verrebbero cacheate anche le chiamate REST a *.supabase.co (DB) → bug cross-device.
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }
});
