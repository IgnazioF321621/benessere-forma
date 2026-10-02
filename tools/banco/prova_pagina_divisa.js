// Fondamenta 035: la pagina divisa in più file resta intera.
//  1) ogni file locale richiamato dalla pagina esiste ed è nell'elenco del service worker (e viceversa)
//  2) il service worker (sw.js vero, con rete e archivio finti): salva i file all'installazione,
//     in linea dà sempre la versione fresca, senza rete dà quella salvata, non tocca Supabase
//  3) con un file «prima» la pagina ricomposta è identica byte per byte:
//       git show <commit>:zona-tracker.html > /tmp/prima.html
//       node tools/banco/prova_pagina_divisa.js /tmp/prima.html
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { assembla, fileLocali, REPO } = require('./pagina');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(64), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const PAGINA = path.join(REPO, 'zona-tracker.html');
const html = fs.readFileSync(PAGINA, 'utf8');
const swSrc = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');

function avviaSW(){
  const rete = {}, archivio = new Map(), ascolti = {};
  let inLinea = true; const chieste = [];
  const risposta = (corpo, ok = true) => ({ ok, corpo, clone(){ return risposta(corpo, ok); } });
  const cache = { put: async (k, r) => { archivio.set(typeof k === 'string' ? k : new URL(k.url).pathname, r); }, };
  const ctx = {
    URL, Promise, console,
    self: { location: { origin: 'https://ignaziof321621.github.io' }, skipWaiting(){}, clients: { claim(){} }, addEventListener: (t, f) => { ascolti[t] = f; } },
    caches: { open: async () => cache, keys: async () => ['zt-v2'], delete: async () => true,
              match: async (k) => archivio.get(typeof k === 'string' ? k : new URL(k.url).pathname) },
    fetch: async (r) => { const u = typeof r === 'string' ? r : new URL(r.url).pathname; chieste.push(u); if(!inLinea) throw new Error('senza rete'); return u in rete ? risposta(rete[u]) : risposta('', false); },
  };
  vm.createContext(ctx); vm.runInContext(swSrc, ctx);
  return {
    rete, archivio, chieste, staccaRete(){ inLinea = false; }, elenco: vm.runInContext('APP_FILES', ctx), cartella: vm.runInContext('APP_DIR', ctx),
    async installa(){ let p; ascolti.install({ waitUntil: x => { p = x; } }); await p; },
    async chiedi(url, mode){ let p = null; ascolti.fetch({ request: { url, mode: mode || 'no-cors' }, respondWith: x => { p = x; } }); return p === null ? 'non intercettata' : (await p); },
  };
}

(async () => {
  // 1) pagina ↔ file ↔ elenco del service worker
  const locali = fileLocali(html);
  const sw = avviaSW();
  atteso('file locali richiamati dalla pagina', locali.length > 0, true);
  atteso('esistono tutti', locali.filter(f => !fs.existsSync(path.join(REPO, f))), []);
  atteso('tutti dentro app/', locali.filter(f => !f.startsWith('app/')), []);
  atteso('elenco del service worker = file richiamati', sw.elenco.map(f => 'app/' + f).sort(), locali.slice().sort());
  atteso('nessuno stile rimasto dentro la pagina', (html.match(/<style[\s>]/g) || []).length, 0);
  atteso('la pagina si ricompone', (assembla(PAGINA).match(/<style>/g) || []).length, 1);

  // 2) service worker
  const B = 'https://ignaziof321621.github.io';
  sw.elenco.forEach(f => { sw.rete[sw.cartella + f] = 'v1 di ' + f; });
  await sw.installa();
  atteso('installazione: salvati tutti i file', [...sw.archivio.keys()].sort(), sw.elenco.map(f => sw.cartella + f).sort());
  const f0 = sw.cartella + sw.elenco[0];
  sw.rete[f0] = 'v2';
  atteso('in linea: versione fresca, non quella salvata', (await sw.chiedi(B + f0)).corpo, 'v2');
  await new Promise(r => setTimeout(r, 5));
  atteso('…e l\'archivio si aggiorna', sw.archivio.get(f0).corpo, 'v2');
  atteso('Supabase non viene intercettato', await sw.chiedi('https://qxiyeiahpoiliwpqslpr.supabase.co/rest/v1/meals'), 'non intercettata');
  sw.staccaRete();
  atteso('senza rete: versione salvata', (await sw.chiedi(B + f0)).corpo, 'v2');
  atteso('senza rete, file mai salvato: niente (non una risposta sbagliata)', await sw.chiedi(B + sw.cartella + 'inesistente.css'), undefined);
  {
    const s2 = avviaSW(); s2.staccaRete(); let rotto = false;
    try { await s2.installa(); } catch(e){ rotto = true; }
    atteso('installazione senza rete: non si rompe', [rotto, s2.archivio.size], [false, 0]);
  }

  // 3) identica a prima
  const prima = process.argv[2];
  if(prima){
    const a = assembla(PAGINA), b = fs.readFileSync(prima, 'utf8');
    atteso('pagina ricomposta identica al file di prima, byte per byte', [a === b, a.length], [true, b.length]);
  } else console.log('  --  confronto byte per byte saltato (nessun file di prima passato)');

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
