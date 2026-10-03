// Fondamenta 140 — versione nuova: una striscia «tocca per aggiornare», mai una ricarica da sola,
// e durante un allenamento la striscia aspetta la chiusura della sessione.
//   node tools/banco/prova_versione_nuova.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = boot({ profiles:[] }, { now:'2026-10-02T12:00:00' });
  await b.avviato;
  const { win } = b; const d = win.document; const ST = win.eval('ST');
  let ricariche = 0;
  win.aggiornaApp = () => { ricariche++; };   // location.reload non si puo' intercettare in jsdom
  const striscia = () => d.getElementById('aggiorna-banner').classList.contains('visible');
  atteso('all\'inizio · niente striscia', striscia(), false);
  win.segnalaVersioneNuova();
  atteso('versione nuova · striscia visibile, nessuna ricarica da sola', [striscia(), ricariche], [true, 0]);
  d.getElementById('aggiorna-banner').click();
  atteso('tocco sulla striscia · ricarica', ricariche, 1);
  // durante un allenamento la striscia aspetta
  const c = boot({ profiles:[] }, { now:'2026-10-02T12:00:00' }); await c.avviato;
  const ST2 = c.win.eval('ST'); const d2 = c.win.document;
  ST2.trainSession = 'push';
  c.win.segnalaVersioneNuova();
  atteso('in allenamento · la striscia non compare', d2.getElementById('aggiorna-banner').classList.contains('visible'), false);
  ST2.trainSession = null; c.win.mostraAggiornamento();
  atteso('sessione chiusa · la striscia compare', d2.getElementById('aggiorna-banner').classList.contains('visible'), true);
  // nel codice: il service worker nuovo non ricarica piu' da solo
  const html = fs.readFileSync('zona-tracker.html', 'utf8');
  const blocco = html.slice(html.indexOf("navigator.serviceWorker.register("));
  atteso('nel codice · statechange segnala, non ricarica', [/statechange[\s\S]{0,200}segnalaVersioneNuova/.test(blocco), /statechange[\s\S]{0,200}location\.reload/.test(blocco)], [true, false]);
  atteso('nel codice · controllo al ritorno in primo piano', /visibilitychange[\s\S]{0,120}controllaAggiornamenti/.test(html.slice(html.indexOf('function controllaAggiornamenti'))), true);

  // Difetto trovato dopo il rilascio (3 ott 2026): il rilascio cambia solo zona-tracker.html, sw.js no.
  // Si legge la pagina dalla rete e si confronta APP_VERSION con quella in uso.
  const pagina = (versione) => `<html><script>const APP_VERSION = '${versione}';<\/script></html>`;
  async function conFetch(risposta) {
    const e = boot({ profiles:[] }, { now:'2026-10-02T12:00:00' }); await e.avviato;
    let chiamate = 0;
    e.win.fetch = (url, opt) => { chiamate++; return risposta(url, opt); };
    return { ...e, chiamate: () => chiamate, striscia: () => e.win.document.getElementById('aggiorna-banner').classList.contains('visible') };
  }
  const inUso = win.eval('APP_VERSION');
  let f = await conFetch(async (url, opt) => ({ ok:true, text: async () => pagina('2099.01.01 · 00:00'), _opt:opt }));
  let opzioni = null; const fetchOrig = f.win.fetch; f.win.fetch = (u, o) => { opzioni = o; return fetchOrig(u, o); };
  f.win.controllaAggiornamenti(); await attendi(20);
  atteso('versione diversa in rete, sw.js uguale · la striscia compare', [f.striscia(), f.chiamate(), opzioni && opzioni.cache], [true, 1, 'no-store']);
  f = await conFetch(async () => ({ ok:true, text: async () => pagina(inUso) }));
  f.win.controllaAggiornamenti(); await attendi(20);
  atteso('stessa versione in rete · niente striscia', f.striscia(), false);
  f = await conFetch(async () => { throw new TypeError('Failed to fetch'); });
  f.win.controllaAggiornamenti(); await attendi(20);
  atteso('senza rete · niente striscia, nessun errore', [f.striscia(), f.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length], [false, 0]);
  f = await conFetch(async () => ({ ok:false, text: async () => '' }));
  f.win.controllaAggiornamenti(); await attendi(20);
  atteso('pagina non letta (errore del server) · niente striscia', f.striscia(), false);
  // il ritorno in primo piano fa il controllo
  f = await conFetch(async () => ({ ok:true, text: async () => pagina('2099.01.01 · 00:00') }));
  Object.defineProperty(f.win.document, 'visibilityState', { get: () => 'visible', configurable:true });
  f.win.document.dispatchEvent(new f.win.Event('visibilitychange')); await attendi(20);
  atteso('ritorno in primo piano · controlla e segnala', [f.chiamate(), f.striscia()], [1, true]);
  // in allenamento la striscia aspetta anche per questa via
  f = await conFetch(async () => ({ ok:true, text: async () => pagina('2099.01.01 · 00:00') }));
  f.win.eval('ST').trainSession = 'push';
  f.win.controllaAggiornamenti(); await attendi(20);
  atteso('versione nuova in allenamento · la striscia aspetta', f.striscia(), false);
  atteso('zero errori in console', b.logs.concat(c.logs, f.logs).filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
