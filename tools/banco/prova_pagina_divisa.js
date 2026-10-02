// Fondamenta 035: la pagina divisa in più file resta intera.
//  1) ogni file locale richiamato dalla pagina esiste ed è nell'elenco del service worker (e viceversa);
//     ogni file su disco in app/ e shared/ è richiamato (niente file orfani)
//  2) il service worker (sw.js vero, con rete e archivio finti): salva i file all'installazione,
//     in linea dà sempre la versione fresca, senza rete dà quella salvata, non tocca Supabase
//  3) con un file «prima» la pagina ricomposta è identica byte per byte:
//       git show <commit>:zona-tracker.html > /tmp/prima.html
//       node tools/banco/prova_pagina_divisa.js /tmp/prima.html
//     (vale per una tappa che sposta senza cambiare posto, come lo stile; quando il codice
//      cambia posto nella pagina il confronto giusto è quello delle righe: vedi --righe)
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { assembla, fileLocali, richiamiNonRiconosciuti, REPO } = require('./pagina');
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
  let inLinea = true, lenta = false; const chieste = [];
  const risposta = (corpo, ok = true) => ({ ok, corpo, clone(){ return risposta(corpo, ok); } });
  const cache = { put: async (k, r) => { archivio.set(typeof k === 'string' ? k : new URL(k.url).pathname, r); }, };
  const ctx = {
    URL, Promise, console, setTimeout, clearTimeout,
    self: { location: { origin: 'https://ignaziof321621.github.io' }, skipWaiting(){}, clients: { claim(){} }, addEventListener: (t, f) => { ascolti[t] = f; } },
    caches: { open: async () => cache, keys: async () => ['zt-v2'], delete: async () => true,
              match: async (k) => archivio.get(typeof k === 'string' ? k : new URL(k.url).pathname) },
    fetch: (r) => { const u = typeof r === 'string' ? r : new URL(r.url).pathname; chieste.push(u); if(lenta) return new Promise(() => {}); if(!inLinea) return Promise.reject(new Error('senza rete')); return Promise.resolve(u in rete ? risposta(rete[u]) : risposta('', false)); },
  };
  vm.createContext(ctx); vm.runInContext(swSrc, ctx);
  return {
    rete, archivio, chieste, staccaRete(){ inLinea = false; }, reteLenta(){ lenta = true; vm.runInContext('ATTESA_RETE_MS = 40', ctx); }, elenco: vm.runInContext('APP_FILES', ctx), cartella: vm.runInContext('BASE', ctx),
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
  atteso('tutti dentro app/ o shared/', locali.filter(f => !/^(app|shared)\//.test(f)), []);
  atteso('nessun richiamo locale scritto in una forma non riconosciuta', richiamiNonRiconosciuti(html), []);
  atteso('elenco del service worker = file richiamati', sw.elenco.slice().sort(), locali.slice().sort());
  // tappa 11 (controllo finale): un file su disco che la pagina non richiama non si salva senza rete e non serve a nessuno
  const suDisco = ['app', 'shared'].flatMap(d => fs.readdirSync(path.join(REPO, d)).map(f => d + '/' + f)).sort();
  atteso('ogni file su disco in app/ e shared/ è richiamato dalla pagina', suDisco.filter(f => !locali.includes(f)), []);
  atteso('nessuno stile rimasto dentro la pagina', (html.match(/<style[\s>]/g) || []).length, 0);
  const moduli = fs.readdirSync(path.join(REPO, 'shared')).filter(f => f.endsWith('.js')).map(f => 'shared/' + f).sort();
  atteso('tutti i moduli di shared/ richiamati dalla pagina', moduli.filter(m => !locali.includes(m)), []);
  atteso('nessuna copia dei moduli rimasta dentro la pagina', [/⟦MODULO /.test(html), /^(?:var|const) ZT\w+ = \(/m.test(html)], [false, false]);
  const ricomposta = assembla(PAGINA);
  atteso('la pagina si ricompone: niente richiami locali rimasti', fileLocali(ricomposta), []);
  // il rilascio aggiunge la coda «?v=…»: la pagina deve ricomporsi uguale
  {
    const os = require('os'); const tmp = path.join(os.tmpdir(), 'zt_pagina_con_coda.html');
    fs.writeFileSync(tmp, html.replace(/((?:href|src)="(?:app|shared)\/[^"?]+)"/g, '$1?v=20261002-0949"'));
    atteso('con la coda del rilascio la pagina ricomposta è la stessa', assembla(tmp) === ricomposta, true);
    atteso('…e i file richiamati sono gli stessi', fileLocali(fs.readFileSync(tmp, 'utf8')), locali);
    fs.unlinkSync(tmp);
  }

  // 2) service worker
  const B = 'https://ignaziof321621.github.io';
  sw.elenco.forEach(f => { sw.rete[sw.cartella + f] = 'v1 di ' + f; });
  await sw.installa();
  atteso('installazione: salvati tutti i file', [...sw.archivio.keys()].sort(), sw.elenco.map(f => sw.cartella + f).sort());
  const f0 = sw.cartella + sw.elenco[0];
  sw.rete[f0] = 'v2';
  atteso('in linea: versione fresca, non quella salvata', (await sw.chiedi(B + f0 + '?v=20261002-0949')).corpo, 'v2');
  await new Promise(r => setTimeout(r, 5));
  atteso('…e l\'archivio si aggiorna', sw.archivio.get(f0).corpo, 'v2');
  atteso('Supabase non viene intercettato', await sw.chiedi('https://qxiyeiahpoiliwpqslpr.supabase.co/rest/v1/meals'), 'non intercettata');
  sw.staccaRete();
  atteso('senza rete: versione salvata', (await sw.chiedi(B + f0)).corpo, 'v2');
  atteso('senza rete, chiesto con una coda diversa: lo trova lo stesso', (await sw.chiedi(B + f0 + '?v=20991231-2359')).corpo, 'v2');
  const fCodice = sw.cartella + sw.elenco.find(f => f.endsWith('.js'));
  atteso('senza rete: anche il codice salvato all\'installazione', (await sw.chiedi(B + fCodice + '?v=1')).corpo, 'v1 di ' + fCodice.replace(sw.cartella, ''));
  atteso('senza rete, file mai salvato: niente (non una risposta sbagliata)', await sw.chiedi(B + sw.cartella + 'app/inesistente.css'), undefined);
  // Fondamenta 120: rete lenta → entro il tempo massimo arriva la copia salvata; i caratteri si salvano
  {
    const s3 = avviaSW(); s3.elenco.forEach(f => { s3.rete[s3.cartella + f] = 'v1 di ' + f; }); await s3.installa();
    s3.reteLenta();
    const t0 = Date.now(); const r = await s3.chiedi(B + f0 + '?v=1'); const ms = Date.now() - t0;
    atteso('rete lenta: la copia salvata entro il tempo massimo', [r.corpo, ms < 1000], ['v1 di ' + sw.elenco[0], true]);
    const s4 = avviaSW(); s4.rete['/s/font.woff2'] = 'caratteri';
    const prima = await s4.chiedi('https://fonts.gstatic.com/s/font.woff2'); const n = s4.chieste.length;
    const seconda = await s4.chiedi('https://fonts.gstatic.com/s/font.woff2');
    atteso('caratteri di Google: salvati, la seconda volta senza rete', [prima.corpo, seconda.corpo, s4.chieste.length - n], ['caratteri', 'caratteri', 0]);
    s4.staccaRete();
    atteso('caratteri senza rete: dalla copia', (await s4.chiedi('https://fonts.gstatic.com/s/font.woff2')).corpo, 'caratteri');
  }
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
