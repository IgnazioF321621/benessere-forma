// Nutrition 100 (Ondata 4 · 13 ottobre 2026) — tornare a un giorno passato rimasto vuoto. Prima le frecce di Oggi
// saltavano solo fra i giorni con dati (ieri senza pasti non si poteva riaprire) e in Analisi i quadratini «nessun dato»
// non si toccavano. Qui: ‹ e › vanno giorno per giorno, con la data giusta in testa; indietro non oltre il primo giorno con
// dati (oltre il primo giorno letto, prima si legge il resto dello storico); avanti non oltre oggi; i quadratini vuoti del
// passato si aprono e da lì «Modifica giorno» porta a quel giorno in Oggi; il futuro no.
//   node tools/banco/prova_giorno_vuoto.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(74), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-13';   // martedì
const pasto = (id, date) => ({ user_id:U, id, date, slot:'pranzo', kcal:500, protein:20, carbs:60, fat:15, description:'riso e pollo', notes:'', time:'13:00' });
(async () => {
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }],
    meals:[pasto('m0', '2026-07-05'), pasto('m1', '2026-10-10'), pasto('m2', OGGI)],   // il 5 luglio e' fuori dai 90 giorni letti all'avvio
    meal_items:[], fasting_days:[], supplements_log:[], supplements:[] };
  const b = boot(t, { now:OGGI + 'T14:00:00' });
  await b.avviato;
  const { win } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.catalog = []; ST.supps = []; ST.activeDay = OGGI;
  ST.TARGET = { kcal:2000, protein:150, carbs:200, fat:67 };
  await win.loadAllDays();
  win.renderOggi();
  const nav = () => d.querySelector('#page-oggi .day-nav');
  const testa = () => ({ data: nav().querySelector('.day-date').textContent, oggi: !!nav().querySelector('.day-today'),
    prev: !nav().querySelectorAll('button')[0].disabled, next: !nav().querySelectorAll('button')[1].disabled });
  const stato = () => { const s = testa(); return [ST.activeDay, s.data, s.oggi, s.prev, s.next]; };
  const errori = () => b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]);

  // 1 · oggi: data di oggi, ‹ acceso, › spento
  atteso('oggi · data in testa, ‹ acceso, › spento', stato(), [OGGI, 'mar 13 ott', true, true, false]);
  await win.navDay(1); await attendi(5);
  atteso('› da oggi · non si va nel futuro', ST.activeDay, OGGI);

  // 2 · ‹ va a ieri anche se vuoto, con la data giusta e il pulsante per registrare
  await win.navDay(-1); await attendi(5);
  atteso('‹ · ieri, rimasto vuoto, si apre con la sua data', stato(), ['2026-10-12', 'lun 12 ott', false, true, true]);
  atteso('ieri · «+ Registra pasto» c\'è, nessun pasto', [/Registra pasto/.test(d.getElementById('page-oggi').textContent), (win.getDay('2026-10-12').meals || []).length], [true, 0]);
  await win.navDay(-1); await attendi(5);
  await win.navDay(-1); await attendi(5);
  atteso('‹ ‹ · il 10 ottobre, con il suo pasto', [ST.activeDay, (win.getDay('2026-10-10').meals || []).length], ['2026-10-10', 1]);
  await win.navDay(1); await attendi(5);
  atteso('› · torna all\'11, vuoto', stato(), ['2026-10-11', 'dom 11 ott', false, true, true]);

  // 3 · indietro non oltre il primo giorno con dati (a storico letto); un giorno vuoto aperto non conta come dato
  ST.activeDay = '2026-10-10'; ST.storicoCompleto = true; win.renderOggi();
  atteso('primo giorno con dati, storico letto · ‹ spento', stato(), ['2026-10-10', 'sab 10 ott', false, false, true]);
  await win.navDay(-1); await attendi(5);
  atteso('‹ sul primo giorno · si resta lì', ST.activeDay, '2026-10-10');

  // 4 · oltre il primo giorno letto: ‹ legge il resto dello storico, e si va avanti giorno per giorno
  // (si riparte da capo: storico a finestra, come all'avvio)
  const letturePasti = () => b.supa._calls.filter(c => c.table === 'meals' && c.op === 'select').length;
  ST.storicoCompleto = false; ST.storicoDa = '2026-07-15'; ST.activeDay = '2026-07-15';
  delete ST.db.days['2026-07-05'];
  const prima = letturePasti();
  await win.navDay(-1); await attendi(5);
  atteso('‹ oltre il primo giorno letto · legge il resto (una lettura dei pasti) e apre il 14 luglio, vuoto', [ST.activeDay, letturePasti() - prima, ST.storicoCompleto, (win.getDay('2026-07-05').meals || []).length], ['2026-07-14', 1, true, 1]);
  ST.activeDay = '2026-07-05'; win.renderOggi();
  await win.navDay(-1); await attendi(5);
  atteso('‹ sul 5 luglio (primo giorno con dati in assoluto) · si resta lì, ‹ spento', [ST.activeDay, testa().prev], ['2026-07-05', false]);

  // 5 · Analisi: i quadratini vuoti del passato si aprono, il futuro no
  ST.activeDay = OGGI; ST.page = 'analisi'; ST.analisi = { window:'SETTIMANA', dateOffset:0 };
  win.renderAnalisi(); await attendi(30);
  const celle = [...d.querySelectorAll('#page-analisi .analisi-v3-heatmap-cell')].filter(c => !c.classList.contains('empty'));
  const perGiorno = Object.fromEntries(celle.map(c => [(c.getAttribute('onclick') || '').match(/'(\d{4}-\d\d-\d\d)'/)?.[1] || null, c]));
  atteso('settimana · 7 quadratini: lun 12 (vuoto) e mar 13 (oggi) si aprono, da mer 14 in avanti no', [celle.length, !!perGiorno['2026-10-12'], !!perGiorno[OGGI], !!perGiorno['2026-10-14'], celle.filter(c => c.getAttribute('onclick')).length], [7, true, true, false, 2]);
  atteso('lun 12 · il quadratino è «nessun dato» ma si tocca', perGiorno['2026-10-12'].classList.contains('no-data'), true);
  perGiorno['2026-10-12'].click(); await attendi(5);
  const dettaglio = d.getElementById('daydetail-overlay');
  atteso('tocco su lun 12 · si apre il dettaglio di quel giorno, senza dati, con «Modifica giorno»', [ST.dayDetailScreen && ST.dayDetailScreen.date, !!dettaglio, /NESSUN DATO/.test(dettaglio ? dettaglio.textContent : ''), !!(dettaglio && dettaglio.querySelector('.daydetail-kebab:not(.hidden)'))], ['2026-10-12', true, true, true]);
  win.dayDetailToggleMenu(); await attendi(5);
  [...d.querySelectorAll('#daydetail-overlay button')].find(x => x.textContent === 'Modifica giorno').click();
  await attendi(260);
  atteso('«Modifica giorno» · Oggi si apre sul 12 ottobre', [ST.activeDay, ST.page, nav() && nav().querySelector('.day-date').textContent], ['2026-10-12', 'oggi', 'lun 12 ott']);

  atteso('zero errori in console', errori(), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
