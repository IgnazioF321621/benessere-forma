// Body 110 — distinguere «non caricato» da «vuoto».
// Se la rete cade, il tab Body dice «Non riesco a leggere i dati del corpo» con Riprova (non «Nessun dato»),
// la Home resta in attesa (non «primo checkpoint da fare»); con dati già in memoria una rilettura fallita li
// tiene e mostra una striscia; Riprova rilegge. La cancellazione del check passa da dbq.
//   node tools/banco/prova_body_lettura.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-10-13T09:00:00';
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const settle = () => new Promise(r => setTimeout(r, 30));

function avvia(){
  const tabelle = {
    weight_logs: [ { user_id:U, id:'wl1', date:'2026-10-12', weight_kg:72.4 } ],
    body_logs: [ { user_id:U, id:'bl1', date:'2026-10-11', waist_cm:86 } ],
    body_checks: [ { user_id:U, id:'c1', status:'completed', created_at:'2026-09-20T05:38:24Z' } ],
    body_measurements: [ { user_id:U, id:'bm1', check_id:'c1', created_at:'2026-09-20T05:53:34Z', weight_kg:72.9, waist_cm:87 } ],
    body_check_photos: [], meals:[], workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[], coach_proposals:[],
  };
  const b = boot(tabelle, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, goal_weight_kg:68, weight_kg:72.4, created_at:'2026-05-01T08:00:00Z' };
  return { ...b, ST, tabelle };
}
const pagina = (b) => b.win.document.getElementById('page-body');
const toast = (b) => testo(b.win.document.getElementById('toast'));

(async () => {
  // 1. prima apertura, rete muta: «non riesco a leggere», non «nessun dato»; la Home aspetta
  let b = avvia();
  b.tabelle.__rete = false;
  b.ST.page = 'body'; b.ST.bodyTab = 'misure';
  await b.win.loadBodyLogs();
  let t = testo(pagina(b));
  atteso('rete muta · il tab dice che non riesce a leggere, con Riprova', [/Non riesco a leggere i dati del corpo/.test(t), /Nessun dato/.test(t), !!pagina(b).querySelector('button[onclick="loadBodyLogs()"]')], [true, false, true]);
  atteso('rete muta · stato: lettura fallita, dati nulli (non vuoti)', [b.ST.bodyLetturaFallita, b.ST.bodyLogs, b.ST.bodyMeasurements, b.ST.bodyChecks], [true, null, null, null]);
  atteso('rete muta · un avviso solo', toast(b), '⚠️ Non riesco a leggere i dati del corpo');
  atteso('rete muta · la Home non dice «primo check da fare»', b.win.getNextCheckpointInfo().loading, true);
  b.ST.page = 'home'; b.win.renderHomeV2();
  const cardHome = testo(b.win.document.getElementById('page-home'));
  atteso('rete muta · card Body in Home in attesa', [/PRIMO CHECKPOINT DA FARE/.test(cardHome), /CARICAMENTO/.test(cardHome)], [false, true]);
  b.ST.page = 'body';

  // 2. Riprova con la rete tornata: i dati arrivano
  b.tabelle.__rete = undefined;
  pagina(b).querySelector('button[onclick="loadBodyLogs()"]') ? await b.win.loadBodyLogs() : null;
  await settle();
  t = testo(pagina(b));
  atteso('riprova · dati letti, niente avviso', [b.ST.bodyLetturaFallita, b.ST.bodyChecks.length, /Non riesco a leggere/.test(t), /non aggiornati/.test(t)], [false, 1, false, false]);
  atteso('riprova · la Home vede il check', [b.win.getNextCheckpointInfo().hasCheck, b.win.getNextCheckpointInfo().loading], [true, false]);

  // 3. dati in memoria e rilettura fallita: restano, con la striscia e Riprova
  b.tabelle.__rete = false;
  await b.win.loadBodyLogs();
  t = testo(pagina(b));
  atteso('rilettura fallita · i dati di prima restano', [b.ST.bodyLetturaFallita, b.ST.bodyChecks.length, b.ST.bodyLogs.length, b.ST.weightLogs.length], [true, 1, 1, 1]);
  atteso('rilettura fallita · striscia «non aggiornati» con Riprova, pagina piena', [/Dati del corpo non aggiornati/.test(t), !!pagina(b).querySelector('button[onclick="loadBodyLogs()"]'), /Misure col metro e bilancia/.test(t)], [true, true, true]);
  atteso('rilettura fallita · la Home ha ancora il check', b.win.getNextCheckpointInfo().hasCheck, true);

  // 4. senza rete (non rete muta): nessun toast, il testo lo dice
  b = avvia();
  Object.defineProperty(b.win.navigator, 'onLine', { get: () => false, configurable:true });
  b.tabelle.__rete = false;
  b.ST.page = 'body'; b.ST.bodyTab = 'misure';
  await b.win.loadBodyLogs();
  atteso('senza rete · il testo lo dice e non c\'è il toast', [/sei senza rete/.test(testo(pagina(b))), toast(b)], [true, '']);

  // 5. la cancellazione del check passa da dbq e, se rifiutata, lo dice
  b = avvia();
  b.ST.page = 'body'; b.ST.bodyTab = 'check';
  await b.win.loadBodyLogs();
  b.tabelle.__rifiuta = { body_checks: { code:'42501', message:'permission denied' } };
  b.ST.bodyDeleteConfirm = { kind:'check', checkId:'c1' };
  await b.win.deleteBodyLogConfirmed();
  const del = b.supa._calls.filter(c => c.table === 'body_checks' && c.op === 'delete');
  atteso('cancella check · delete filtrata per check e persona', del.map(c => (c.filters || []).map(f => f[1])), [['id', 'user_id']]);
  atteso('cancella check · errore detto, dati ancora lì', [/Errore eliminazione/.test(toast(b)), b.ST.bodyChecks.length], [true, 1]);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
