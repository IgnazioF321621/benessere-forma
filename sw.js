// Zona Tracker — Service Worker
// Strategia: network-first (con un tempo massimo) per il documento HTML e per i file dell'app (app/ e shared/), cache-first per la libreria JS su jsdelivr e per i caratteri di Google Fonts.
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
  'shared/nutrizione.js',
  'shared/coach_rules.js',
  'shared/quadro.js',
  'shared/rotazione.js',
  'shared/ritratto.js',
  'shared/fitdays.js',
  'shared/esami.js',
  'shared/promemoria.js',
  'app/body.js',
  'app/nutrition.js',
  'app/home.js',
  'app/training_generatore.js',
  'app/training.js',
  'app/pirsi.js',
  'app/onboarding.js',
  'app/impostazioni.js',
  'app/segnala.js',
  'app/notifiche.js',
  'app/analisi.js',
];

// Rete prima, ma non all'infinito (Fondamenta 120, 2 ottobre 2026): con rete debole la pagina e i file
// dell'app aspettavano la rete senza un tempo massimo. Se c'e' una copia salvata e la rete non risponde
// entro ATTESA_RETE_MS, si usa la copia; la risposta della rete, se arriva dopo, aggiorna comunque l'archivio.
let ATTESA_RETE_MS = 3000;
function reteOCopia(request, chiave) {
  const dallaRete = fetch(request, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(chiave, clone)); }
    return res;
  });
  return caches.match(chiave).then(copia => {
    if (!copia) return dallaRete.catch(() => undefined);   // senza rete e senza copia: niente, non una risposta sbagliata
    return new Promise(resolve => {
      let deciso = false;
      const decidi = (r) => { if (!deciso) { deciso = true; resolve(r); } };
      const t = setTimeout(() => decidi(copia), ATTESA_RETE_MS);
      dallaRete.then(res => { clearTimeout(t); decidi(res.ok ? res : copia); }, () => { clearTimeout(t); decidi(copia); });
    });
  });
}
// Risorse che non cambiano mai a parita' di indirizzo: prima la copia, la rete solo la prima volta.
function copiaORete(request) {
  return caches.match(request).then(cached =>
    cached || fetch(request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(request, clone)); }
      return res;
    })
  );
}

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

  // Navigazione verso l'app HTML → rete prima (al massimo ATTESA_RETE_MS se c'e' una copia), poi copia.
  // La pagina è la stessa con qualunque parametro (?apri=training dal Calendario, Training 541): la copia si tiene e si
  // cerca per indirizzo senza parametri, così senza rete il link di un evento apre l'app invece dell'errore.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('zona-tracker.html')) {
    event.respondWith(reteOCopia(event.request, url.pathname.endsWith('zona-tracker.html') ? url.pathname : event.request));
    return;
  }

  // File dell'app (stile e codice) → come la pagina: sempre la versione fresca insieme alla pagina
  // fresca, quella salvata senza rete o quando la rete non risponde in tempo.
  if (url.origin === self.location.origin && APP_DIRS.some(d => url.pathname.startsWith(BASE + d))) {
    event.respondWith(reteOCopia(event.request, url.pathname));
    return;
  }

  // Caratteri di scrittura (Google Fonts: il foglio di stile e i file dei caratteri) → prima la copia:
  // senza rete l'app aveva i caratteri del telefono (Fondamenta 120).
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(copiaORete(event.request));
    return;
  }

  // Libreria Supabase JS via CDN → cache-first (URL versionata, cambia raramente).
  // ATTENZIONE: non includere 'supabase' nell'hostname check, altrimenti
  // verrebbero cacheate anche le chiamate REST a *.supabase.co (DB) → bug cross-device.
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(copiaORete(event.request));
    return;
  }
});

// ── Notifiche 170: il promemoria del pasto non registrato ──
// Il Worker manda l'avviso cifrato (src/webpush.js); qui si mostra com'e' arrivato: titolo, corpo, icona
// dell'app, un tag per pasto (un avviso nuovo sullo stesso pasto sostituisce quello di prima). Senza corpo
// leggibile si mostra un avviso generico: un push ricevuto va mostrato comunque, altrimenti il browser
// mostra il suo e puo' togliere il permesso.
self.addEventListener('push', event => {
  let dati = {};
  try { dati = event.data ? event.data.json() : {}; } catch (e) { dati = {}; }
  const titolo = dati.titolo || 'Zona Tracker';
  const opzioni = {
    body: dati.corpo || 'Hai un pasto da registrare.',
    icon: BASE + 'assets/icone/icona-192.png',
    badge: BASE + 'assets/icone/icona-192.png',
    tag: dati.tag || 'pasto',
    renotify: true,
    data: { url: dati.url || (BASE + 'zona-tracker.html?apri=oggi'), slot: dati.slot || null },
  };
  event.waitUntil(self.registration.showNotification(titolo, opzioni));
});

// Il tocco sull'avviso: la pagina aperta riceve {apri:'oggi'} (app/notifiche.js la porta sul tab Nutrition);
// senza pagina aperta se ne apre una con ?apri=oggi.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || (BASE + 'zona-tracker.html?apri=oggi');
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(finestre => {
    const nostra = finestre.find(w => w.url && w.url.indexOf(BASE + 'zona-tracker.html') !== -1);
    if (nostra) {
      try { nostra.postMessage({ apri: 'oggi' }); } catch (e) {}
      return nostra.focus ? nostra.focus() : null;
    }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
