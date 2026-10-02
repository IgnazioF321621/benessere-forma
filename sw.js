// Zona Tracker — Service Worker
// Strategia: network-first per il documento HTML e per i file dell'app (app/ e shared/), cache-first SOLO per la libreria JS su jsdelivr.
// Le chiamate REST a *.supabase.co non vengono intercettate (default browser, sempre network).

const CACHE = 'zt-v2';
const HTML_URL = '/benessere-forma/zona-tracker.html';
// I file in cui è divisa la pagina (Fondamenta 035): lo stile in app/, i moduli condivisi
// col Worker in shared/. Vanno elencati TUTTI: si salvano all'installazione, così l'app si
// apre intera anche senza rete. Un file richiamato dalla pagina e assente da qui fa fallire
// tools/banco/prova_pagina_divisa.js.
// Si salvano e si ritrovano per percorso, SENZA la coda «?v=…» che il rilascio mette nella
// pagina: senza rete conta avere il file, non quale coda aveva l'indirizzo.
const BASE = '/benessere-forma/';
const APP_DIRS = ['app/', 'shared/'];
const APP_FILES = [
  'app/stile.css',
  'app/comune.js',
  'app/body.js',
  'app/nutrition.js',
  'app/home.js',
  'app/training_generatore.js',
  'app/training.js',
  'app/pirsi.js',
  'app/onboarding.js',
  'app/impostazioni.js',
  'shared/nutrizione.js',
  'shared/coach_rules.js',
  'shared/quadro.js',
  'shared/ritratto.js',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  // Se un file non si scarica l'installazione va avanti lo stesso: meglio un'app che
  // senza rete perde un pezzo di una versione nuova che non si installa mai.
  event.waitUntil(
    caches.open(CACHE).then(c => Promise.all(APP_FILES.map(f =>
      fetch(BASE + f, { cache: 'no-cache' }).then(res => { if (res.ok) return c.put(BASE + f, res); }).catch(() => {})
    )))
  );
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

  // File dell'app (stile e codice) → network-first come la pagina: sempre la versione
  // fresca insieme alla pagina fresca, quella salvata solo senza rete.
  if (url.origin === self.location.origin && APP_DIRS.some(d => url.pathname.startsWith(BASE + d))) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(url.pathname, clone));
          }
          return res;
        })
        .catch(() => caches.match(url.pathname))
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
