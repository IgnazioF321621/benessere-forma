// Nutrition 020 (Ondata 4 · 13 ottobre 2026) — una regola sola per «in Zona» e per il «Giorno perfetto». Prima Oggi giudicava
// su 40/30/30 fisso con 5 punti di margine e Analisi sulle percentuali dell'obiettivo con 2: lo stesso giorno era «Nella Zona»
// in Oggi e «Quasi» in Analisi; con ipertrofia centrare il target cadeva sul bordo; il trofeo scattava con 900 kcal su 2300.
// Scelta di Ignazio: percentuali dell'obiettivo, entro 3 punti «in», entro 6 «quasi»; Giorno perfetto = Nella Zona e calorie
// entro il 10%. La regola sta in shared/nutrizione.js (statoZona, giornoPerfetto) e la usano Oggi, la card del pasto, Analisi
// e il dettaglio del giorno.
//   node tools/banco/prova_in_zona.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const { boot } = require('./banco');
const N = require('../../shared/nutrizione.js');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-13';
// pasto con le calorie date e le percentuali date (carbo/prot/grassi), ingredienti compresi
const macro = (kcal, pc, pp, pf) => ({ kcal, carbs: kcal*pc/100/4, protein: kcal*pp/100/4, fat: kcal*pf/100/9 });
const pasto = (id, slot, time, kcal, pc, pp, pf) => ({ user_id:U, id, date:OGGI, slot, time, description:id, notes:'', ...macro(kcal, pc, pp, pf) });
const RIC = { kcal:2300, pCarbo:38, pProt:34, pFat:28 };
(async () => {
  console.log('la regola, da sola (shared/nutrizione.js)');
  atteso('ricomposizione 38/34/28 · centrato → in', N.statoZona(macro(900, 38, 34, 28), RIC), 'in');
  atteso('ipertrofia 40/35/25 · centrato → in (prima cadeva sul bordo della regola di Oggi)', N.statoZona(macro(2000, 40, 35, 25), { pCarbo:40, pProt:35, pFat:25 }), 'in');
  atteso('scarto di 3 punti → in, di 4 → quasi, di 7 → fuori', [N.statoZona(macro(900, 41, 31, 28), RIC), N.statoZona(macro(900, 42, 30, 28), RIC), N.statoZona(macro(900, 45, 27, 28), RIC)], ['in', 'near', 'out']);
  atteso('meno di 5 g di macro → niente da giudicare', N.statoZona({ kcal:10, carbs:1, protein:1, fat:0.5 }, RIC), 'unset');
  atteso('senza percentuali nel target si ripiega su 40/30/30', N.statoZona(macro(900, 40, 30, 30), { kcal:2000 }), 'in');
  atteso('Giorno perfetto · 900 kcal su 2300 in zona → no; 2200 → sì; 2000 → no (13% sotto); 2520 → sì (entro il 10%)', [N.giornoPerfetto(macro(900, 38, 34, 28), RIC), N.giornoPerfetto(macro(2200, 38, 34, 28), RIC), N.giornoPerfetto(macro(2000, 38, 34, 28), RIC), N.giornoPerfetto(macro(2520, 38, 34, 28), RIC)], [false, true, false, true]);
  atteso('Giorno perfetto · calorie giuste ma fuori zona → no', N.giornoPerfetto(macro(2300, 45, 27, 28), RIC), false);
  atteso('le soglie dichiarate', [N.ZONA_PUNTI_IN, N.ZONA_PUNTI_QUASI, N.PERFETTO_SCARTO_KCAL], [3, 6, 0.10]);

  console.log('\nl\'app vera');
  // Oggi alle 21:30: un pranzo da 900 kcal perfettamente 38/34/28, una cena a 44/26/30 (per la vecchia regola di Oggi era «In Zona», ±5 su 40/30/30)
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, obiettivo:'ricomposizione', target_kcal:2300 }],
    meals:[pasto('pranzo-zona', 'pranzo', '13:00', 900, 38, 34, 28)], meal_items:[], fasting_days:[], supplements_log:[], supplements:[] };
  const b = boot(t, { now:OGGI + 'T21:30:00' });
  await b.avviato;
  const { win } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.catalog = []; ST.supps = []; ST.activeDay = OGGI;
  ST.profile = { id:U, first_name:'Ignazio', obiettivo:'ricomposizione', target_kcal:2300 };
  win.applyProfile(ST.profile);
  atteso('target dal profilo · 2300 kcal, 38/34/28', [ST.TARGET.kcal, ST.TARGET.pCarbo, ST.TARGET.pProt, ST.TARGET.pFat], [2300, 38, 34, 28]);
  await win.loadAllDays(); win.renderOggi();
  const pagina = () => d.getElementById('page-oggi');
  const pill = () => pagina().querySelector('.oggi-v3-zona-pill .oggi-v3-zona-label').textContent;
  const trofeo = () => !!pagina().querySelector('.badge-perfetto');
  atteso('Oggi · 900 kcal a 38/34/28 → «NELLA ZONA», ma niente trofeo (calorie lontane)', [pill(), trofeo(), !!win.getDay(OGGI).giornoPerfetto], ['NELLA ZONA', false, false]);
  atteso('Analisi · lo stesso giorno ha lo stesso verdetto', win._zoneStatusForDayKey(OGGI), 'inZone');
  // la cena fuori zona secondo la regola nuova (44/26/30: scarto 8 dalle proteine... 6 dai carbo, 8 dalle proteine → fuori)
  win.getDay(OGGI).meals.push({ id:'cena-fuori', local_id:'cena-fuori', slot:'cena', time:'20:00', description:'cena-fuori', items:[], ...macro(600, 44, 26, 30) });
  ST.mealExpanded = { 'pranzo-zona':true, 'cena-fuori':true };   // il distintivo si vede con la card aperta
  win.renderOggi();
  const badge = (id) => { const c = d.getElementById('sw-' + id); return c ? [...c.querySelectorAll('span')].map(s => s.textContent).find(x => /Zona/.test(x)) || null : null; };
  atteso('card del pasto · pranzo «In Zona», cena 44/26/30 «Fuori Zona» (prima era «In Zona» con 40/30/30 ±5)', [badge('pranzo-zona'), badge('cena-fuori')], ['In Zona', 'Fuori Zona']);
  const statoGiorno = win._zoneStatusForDayKey(OGGI);
  atteso('la giornata intera (1500 kcal, 40/31/29) · Oggi e Analisi dicono la stessa cosa', [pill(), statoGiorno], [{ in:'NELLA ZONA', near:'QUASI ZONA', out:'FUORI ZONA' }[N.statoZona(win.dayTotals(win.getDay(OGGI)), ST.TARGET)], { inZone:'inZone', almostZone:'almostZone', outOfZone:'outOfZone' }[statoGiorno]]);
  // una giornata vicina al target e in zona: il trofeo scatta (ore 21:30), e resta segnato sul giorno
  win.getDay(OGGI).meals.pop();
  win.getDay(OGGI).meals.push({ id:'cena-zona', local_id:'cena-zona', slot:'cena', time:'20:00', description:'cena-zona', items:[], ...macro(1300, 38, 34, 28) });
  win.renderOggi();
  atteso('2200 kcal a 38/34/28 alle 21:30 · «NELLA ZONA» e trofeo «Giorno Perfetto», segnato sul giorno', [pill(), trofeo(), win.getDay(OGGI).giornoPerfetto, /Tutti i macro centrati 38·34·28/.test(pagina().textContent)], ['NELLA ZONA', true, true, true]);
  // dettaglio del giorno: il margine scritto e' quello della regola
  win.openDayDetailScreen(OGGI); await attendi(5);
  const det = d.getElementById('daydetail-overlay');
  atteso('dettaglio del giorno · «38 · 34 · 28 ±3» e «NELLA ZONA»', [det.querySelector('.daydetail-summary-target').textContent, /NELLA ZONA/.test(det.textContent)], ['38 · 34 · 28 ±3', true]);

  // nel codice: nessun 40/30/30 fisso e nessuna tolleranza scritta a mano fuori dal modulo condiviso
  const src = fs.readFileSync(require('path').join(__dirname, '..', '..', 'app', 'nutrition.js'), 'utf8').replace(/\/\/.*$/gm, '');
  atteso('nel codice · niente fasce fisse 35-45 / 25-35 e niente ±2 fuori da shared/nutrizione.js', [/pC *>= *35/.test(src), /<= *2 *&&/.test(src), /\.statoZona\(/.test(src), /\.giornoPerfetto\(/.test(src)], [false, false, true, true]);
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
