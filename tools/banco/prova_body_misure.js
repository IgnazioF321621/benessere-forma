// Body 020 — «Misure col metro e bilancia»: il modulo ha una data (mai nel futuro), si pre-popola col giorno
// scelto, il peso va in weight_logs (la stessa riga di «Pesati ora»: una tabella sola per le pesate), metro e
// bilancia smart in body_logs; il profilo prende il peso solo se è la pesata più recente.
// Orologio: martedì 13 ottobre 2026, 9:00.
//   node tools/banco/prova_body_misure.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-10-13T09:00:00';
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(64), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const chiamate = (b, table, op) => b.supa._calls.filter(c => c.table === table && c.op === op);

function avvia(){
  const tabelle = {
    weight_logs: [ { user_id:U, id:'wl1', date:'2026-10-11', weight_kg:72.4 }, { user_id:U, id:'wl2', date:OGGI, weight_kg:72.1 } ],
    body_logs: [ { user_id:U, id:'bl1', date:'2026-10-11', waist_cm:86, notes:'dopo colazione' } ],
    body_checks: [], body_measurements: [], meals:[], workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[], profiles:[ { id:U, weight_kg:72.1 } ],
  };
  const b = boot(tabelle, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, goal_weight_kg:68, weight_kg:72.1, created_at:'2026-05-01T08:00:00Z' };
  ST.page = 'body'; ST.bodyTab = 'misure';
  return { ...b, ST, tabelle };
}
const campo = (b, id) => b.win.document.getElementById(id);
const scrivi = (b, id, v) => { const el = campo(b, id); if(el) el.value = v; };

(async () => {
  // 1. il modulo: titolo nuovo, data di oggi, non oltre oggi; pre-popolato con la pesata di oggi
  let b = avvia();
  await b.win.loadBodyLogs();
  const pagina = b.win.document.getElementById('page-body');
  atteso('modulo · titolo «Misure col metro e bilancia», niente «Log misure»', [/Misure col metro e bilancia/.test(pagina.textContent), /Log misure/.test(pagina.textContent)], [true, false]);
  atteso('modulo · la data è oggi e non va oltre oggi', [campo(b, 'bl-date').value, campo(b, 'bl-date').max], [OGGI, OGGI]);
  atteso('modulo · peso pre-popolato dalla pesata di oggi (weight_logs)', campo(b, 'bl-weight').value, '72.1');

  // 2. cambio giorno: si pre-popola con quel giorno (vita da body_logs, peso dalla pesata)
  b.win.bodyLogSetDate('2026-10-11');
  atteso('giorno 11 · vita e peso di quel giorno', [campo(b, 'bl-date').value, campo(b, 'bl-waist').value, campo(b, 'bl-weight').value], ['2026-10-11', '86', '72.4']);
  b.win.bodyLogSetDate('2026-10-20');
  atteso('giorno nel futuro · rifiutato, si torna a oggi', [campo(b, 'bl-date').value, testo(b.win.document.getElementById('toast'))], [OGGI, '⚠️ Scegli un giorno fino a oggi']);

  // 3. salvataggio su un giorno passato: peso in weight_logs, vita in body_logs senza peso, profilo intatto
  b.win.bodyLogSetDate('2026-10-10');
  scrivi(b, 'bl-weight', '73.0'); scrivi(b, 'bl-waist', '87.5');
  const prima = b.supa._calls.length;
  await b.win.saveBodyLog();
  const nuove = b.supa._calls.slice(prima);
  const pesata = nuove.find(c => c.table === 'weight_logs' && c.op === 'upsert');
  const misure = nuove.find(c => c.table === 'body_logs' && c.op === 'upsert');
  atteso('salva 10/10 · la pesata va in weight_logs con la data scelta', pesata && [pesata.payload.date, pesata.payload.weight_kg, pesata.upsertOpts.onConflict], ['2026-10-10', 73, 'user_id,date']);
  atteso('salva 10/10 · body_logs prende la vita e NON il peso', misure && [misure.payload.date, misure.payload.waist_cm, 'weight_kg' in misure.payload], ['2026-10-10', 87.5, false]);
  atteso('salva 10/10 · il profilo non prende un peso vecchio', [nuove.some(c => c.table === 'profiles' && c.op === 'update'), b.ST.profile.weight_kg], [false, 72.1]);
  atteso('salva 10/10 · avviso con la data', testo(b.win.document.getElementById('toast')), '✅ Misure salvate · sab 10 ott');

  // 4. oggi: il profilo prende il peso; solo peso → nessuna riga in body_logs
  b = avvia(); await b.win.loadBodyLogs();
  scrivi(b, 'bl-weight', '71.8');
  const prima2 = b.supa._calls.length;
  await b.win.saveBodyLog();
  const nuove2 = b.supa._calls.slice(prima2);
  atteso('salva oggi solo peso · weight_logs sì, body_logs no, profilo aggiornato', [nuove2.some(c => c.table === 'weight_logs' && c.op === 'upsert'), nuove2.some(c => c.table === 'body_logs' && c.op === 'upsert'), nuove2.find(c => c.table === 'profiles' && c.op === 'update')?.payload.weight_kg, b.ST.profile.weight_kg], [true, false, 71.8, 71.8]);

  // 5. niente numeri: non si scrive nulla
  b = avvia(); await b.win.loadBodyLogs();
  scrivi(b, 'bl-weight', ''); scrivi(b, 'bl-waist', '');
  const prima3 = b.supa._calls.length;
  await b.win.saveBodyLog();
  atteso('vuoto · nessuna scrittura, avviso', [b.supa._calls.length - prima3, testo(b.win.document.getElementById('toast'))], [0, '⚠️ Scrivi almeno un numero']);

  // 6. senza rete: la pesata va in coda e vale subito nel modulo e nel peso attuale
  b = avvia(); await b.win.loadBodyLogs();
  Object.defineProperty(b.win.navigator, 'onLine', { get: () => false, configurable:true });
  b.win.bodyLogSetDate('2026-10-12');
  scrivi(b, 'bl-weight', '72.6');
  await b.win.saveBodyLog();
  atteso('senza rete · pesata in coda e in memoria', [(b.ST.weightLogs || []).find(q => q.date === '2026-10-12')?.weight_kg, JSON.parse(b.win.localStorage.getItem('zt_coda_' + U) || '[]').length], [72.6, 1]);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
