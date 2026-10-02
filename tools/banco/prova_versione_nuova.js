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
  atteso('nel codice · controllo al ritorno in primo piano', /visibilitychange[\s\S]{0,120}controllaAggiornamenti/.test(blocco), true);
  atteso('zero errori in console', b.logs.concat(c.logs).filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
