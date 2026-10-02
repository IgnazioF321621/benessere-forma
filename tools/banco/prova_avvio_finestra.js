// Fondamenta 100, tappa 4 — all'avvio si legge solo lo storico recente (ultimi 90 giorni), il resto a richiesta.
//   node tools/banco/prova_avvio_finestra.js [cartella di prima]
// Si prova tre cose: (1) l'avvio legge molte meno righe e i numeri recenti sono quelli di prima;
// (2) chi ha bisogno del resto lo ottiene e il risultato finale è identico alla lettura intera di prima
// (serie di giorni di fila, ‹ nel tab Nutrition, Analisi a 3 mesi, rinfresco dopo l'apertura di Analisi);
// (3) se la lettura col join degli ingredienti non va, si ripiega e lo storico recente c'è comunque.
// Con una cartella di prima la stessa fotografia finale (giorni, pasti, ingredienti, extra) deve coincidere.
process.env.TZ = 'Europe/Rome';
const path = require('path');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(70), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-02';
const giornoFa = (n) => { const d = new Date(Date.UTC(2026, 9, 2)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const DA = giornoFa(90);   // primo giorno della finestra

// ── Dati: 200 giorni di storia. Pasto ogni giorno (due ingredienti, un terzo ogni 7), digiuno ogni 25 giorni,
// un integratore preso ogni giorno, un extra ogni 3 giorni. Per la serie di giorni di fila: 130 giorni di fila.
function dati(giorniDiFila) {
  const meals = [], items = [], fasting = [], log = [];
  const N = 200;
  for(let n = 0; n < N; n++) {
    const data = giornoFa(n);
    // buco a 150 giorni fa: interrompe la serie "normale"
    if(giorniDiFila == null && n === 150) continue;
    if(giorniDiFila != null && n >= giorniDiFila) continue;
    const id = 'm' + data;
    meals.push({ user_id:U, id, date:data, slot:'pranzo', kcal:600 + n, protein:30, carbs:60, fat:20, description:'pasto ' + n, notes:'', time:'13:00' });
    [0, 1].concat(n % 7 === 0 ? [2] : []).forEach(k => items.push({ user_id:U, id:id + '-' + k, meal_id:id, name:'ing ' + k, quantity:100, unit:'g', kcal:100, protein:5, carbs:10, fat:3, source:'manual', sort_order:k }));
    if(n % 25 === 0) fasting.push({ user_id:U, date:data });
    log.push({ user_id:U, id:'s' + data, date:data, slot:'08:00', supplement_name:'Omega', is_extra:false });
    if(n % 3 === 0) log.push({ user_id:U, id:'e' + data, date:data, slot:'16:00', supplement_name:'Barretta', supplement_codice:null, dose:1, dose_unit:'pz', kcal:150, carbo:15, proteine:10, grassi:5, costo:1, created_at:data + 'T16:00:00Z', is_extra:true });
  }
  meals.push({ user_id:'u2', id:'altro', date:giornoFa(5), slot:'cena', kcal:1, protein:0, carbs:0, fat:0 });
  return { meals, meal_items:items, fasting_days:fasting, supplements_log:log, supplements:[], esercizi_catalog:[], profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }] };
}
const tutteLeConsole = [];
async function nuovo(tables, file) {
  const b = boot(tables, { file, now:OGGI + 'T12:00:00' });
  tutteLeConsole.push(...[]); b.logs.push = ((orig) => function(...x){ tutteLeConsole.push(...x); return orig.apply(this, x); })(b.logs.push);
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U }; ST.profile = { id:U, first_name:'Ignazio' }; ST.supps = []; ST.catalog = [];
  return { ...b, ST };
}
// Fotografia stabile di quello che l'app tiene in memoria (chiavi ordinate: l'ordine di arrivo non conta).
const stabile = (v) => Array.isArray(v) ? v.map(stabile) : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stabile(v[k])])) : v);
const foto = (ST) => JSON.stringify(stabile({ db: ST.db, extra: ST.extrasByDay }));
const righe = (ST) => {
  const g = Object.values(ST.db.days);
  return {
    giorni: g.length,
    pasti: g.reduce((a, d) => a + d.meals.length, 0),
    ingredienti: g.reduce((a, d) => a + d.meals.reduce((b, m) => b + m.items.length, 0), 0),
    integratori: g.reduce((a, d) => a + (d.rawSuppLogs || []).length, 0),
    extra: Object.values(ST.extrasByDay || {}).reduce((a, e) => a + e.length, 0),
  };
};
const somma = (r) => r.pasti + r.ingredienti + r.integratori + r.extra;
const letture = (supa, tabella, op, colonna) => supa._calls.filter(c => c.op === 'select' && c.table === tabella && c.filters.some(f => f[0] === op && f[1] === colonna));

async function misura(file) {
  const r = {};
  // 1) avvio: finestra (sul file di prima: tutto)
  {
    const a = await nuovo(dati(), file);
    await a.win.loadAllDays(); await a.win.loadExtrasAll();
    r.avvio = righe(a.ST);
    r.avvioOggi = JSON.stringify(a.win.dayTotals(a.win.getDay(OGGI)));
    r.avvio30 = JSON.stringify(a.win.dayTotals(a.win.getDay(giornoFa(30))));
    r.oggiPasti = a.ST.db.days[OGGI].meals.length;
    r.piuVecchio = Object.keys(a.ST.db.days).sort()[0];
    r.joinMeals = a.supa._calls.filter(c => c.table === 'meal_items' && /!inner/.test(String(c.cols))).length;
    if(a.win.caricaStoricoCompleto) { await a.win.caricaStoricoCompleto(); }   // sul file di prima non esiste: gia' tutto
    r.finale = foto(a.ST);
    r.finaleRighe = righe(a.ST);
    r.completo = a.ST.storicoCompleto === true || !a.win.caricaStoricoCompleto;
  }
  return r;
}

(async () => {
  const nuova = await misura();
  const meal90 = nuova.avvio;
  console.log(`  --  all'avvio in memoria: ${meal90.giorni} giorni · ${meal90.pasti} pasti · ${meal90.ingredienti} ingredienti · ${meal90.integratori} integratori · ${meal90.extra} extra (${somma(meal90)} righe); finale ${somma(nuova.finaleRighe)} righe`);
  atteso('avvio · il giorno piu\' vecchio in memoria e\' quello della finestra', nuova.piuVecchio, DA);
  atteso('avvio · pasti: solo i 91 giorni (oggi + 90) della finestra', meal90.pasti, 91);
  atteso('avvio · ingredienti: solo quelli di quei pasti, senza il join dentro', meal90.ingredienti, 91 * 2 + 13);
  atteso('avvio · letto con il join (un ingrediente non ha una data propria)', nuova.joinMeals, 1);
  atteso('avvio · oggi: un pasto, totali con gli extra', [nuova.oggiPasti, nuova.avvioOggi], [1, JSON.stringify({ kcal:600 + 150, protein:40, carbs:75, fat:25 })]);
  atteso('dopo il resto · finestra + resto = 200 giorni, 199 pasti (buco a 150 giorni fa)', [nuova.finaleRighe.pasti, nuova.finaleRighe.giorni >= 199], [199, true]);

  // 2) il resto ricostruisce la stessa fotografia della lettura intera (stato 'completo')
  {
    const a = await nuovo(dati());
    a.ST.storicoCompleto = true;
    await a.win.loadAllDays(); await a.win.loadExtrasAll();
    atteso('lettura intera · stesso stato della finestra + resto', foto(a.ST) === nuova.finale, true);
    atteso('lettura intera · nessun filtro di data sulle letture (come prima)', letture(a.supa, 'meals', 'gte', 'date').length + letture(a.supa, 'meals', 'lt', 'date').length, 0);
  }

  // 3) il filtro di data c'e' sulle letture di avvio e non sul resto, e il resto legge solo il vecchio
  {
    const a = await nuovo(dati());
    await a.win.loadAllDays(); await a.win.loadExtrasAll();
    atteso('finestra · pasti, digiuni, integratori, extra filtrati dal giorno ' + DA, [letture(a.supa, 'meals', 'gte', 'date').length, letture(a.supa, 'fasting_days', 'gte', 'date').length, letture(a.supa, 'supplements_log', 'gte', 'date').length], [1, 1, 2]);
    atteso('finestra · ingredienti filtrati sul pasto', letture(a.supa, 'meal_items', 'gte', 'meals.date').length, 1);
    atteso('finestra · il resto non e\' stato letto', letture(a.supa, 'meals', 'lt', 'date').length, 0);
    const n0 = a.supa._calls.length;
    await a.win.caricaStoricoCompleto(); await a.win.caricaStoricoCompleto();
    const nuovi = a.supa._calls.slice(n0).filter(c => c.op === 'select');
    atteso('resto · una lettura sola anche chiamandolo due volte', nuovi.map(c => c.table).sort(), ['fasting_days', 'meal_items', 'meals', 'supplements_log', 'supplements_log']);
    atteso('resto · solo i giorni prima della finestra', nuovi.every(c => c.filters.some(f => f[0] === 'lt' && /date$/.test(f[1]) && f[2] === DA)), true);
    atteso('resto · segnato come completo', a.ST.storicoCompleto, true);
  }

  // 4) serie di giorni di fila: 130 giorni. Subito 91 (finestra), poi il numero si corregge da solo.
  {
    const a = await nuovo(dati(130));
    await a.win.loadAllDays(); await a.win.loadExtrasAll();
    a.win.eval('mostraStreak()');
    const el = a.win.document.getElementById('h-streak');
    const subito = el.textContent;
    await a.win.caricaStoricoCompleto(); await attendi(10);
    atteso('serie · subito il numero della finestra, poi quello vero', [subito, el.textContent], ['🔥 91', '🔥 130']);
    // una serie corta non scomoda il resto
    const b = await nuovo(dati(5));
    await b.win.loadAllDays();
    b.win.eval('mostraStreak()'); await attendi(10);
    atteso('serie corta (5 giorni) · il resto non viene letto', [b.win.document.getElementById('h-streak').textContent, letture(b.supa, 'meals', 'lt', 'date').length], ['🔥 5', 0]);
  }

  // 5) ‹ nel tab Nutrition: dal primo giorno letto legge il resto e va a quello prima
  {
    const a = await nuovo(dati());
    await a.win.loadAllDays(); await a.win.loadExtrasAll();
    a.ST.activeDay = DA; a.win.renderOggi();
    const bottone = () => a.win.document.querySelector('#page-oggi .day-nav button');
    atteso('‹ sul primo giorno letto · acceso', bottone().disabled, false);
    await a.win.navDay(-1);
    atteso('‹ · legge il resto e va al giorno prima', [a.ST.activeDay, a.ST.storicoCompleto], [giornoFa(91), true]);
    atteso('‹ · il giorno di 91 giorni fa ha il suo pasto', a.ST.db.days[giornoFa(91)].meals.length, 1);
    a.ST.activeDay = giornoFa(199); a.win.renderOggi();
    atteso('‹ sul giorno piu\' vecchio in assoluto · spento', bottone().disabled, true);
  }

  // 6) Analisi: settimana e mese non chiedono il resto, 3 mesi si': il disegno e' quello di prima
  {
    const a = await nuovo(dati());
    await a.win.loadAllDays(); await a.win.loadExtrasAll();
    a.ST.page = 'analisi';
    a.ST.analisi = { window:'SETTIMANA', dateOffset:0 }; a.win.renderAnalisi();
    a.ST.analisi = { window:'MESE', dateOffset:0 }; a.win.renderAnalisi();
    atteso('Analisi settimana e mese · il resto non viene letto', letture(a.supa, 'meals', 'lt', 'date').length, 0);
    a.ST.analisi = { window:'3MESI', dateOffset:0 }; a.win.renderAnalisi();
    const box = () => a.win.document.getElementById('analisi-content');
    atteso('Analisi 3 mesi · nell\'attesa si dice che si carica', /Carico lo storico/.test(box().innerHTML), true);
    for(let i = 0; i < 100 && /Carico lo storico/.test(box().innerHTML); i++) await attendi(10);
    const html = box().innerHTML;
    const rif = await nuovo(dati());
    rif.ST.storicoCompleto = true;
    await rif.win.loadAllDays(); await rif.win.loadExtrasAll();
    rif.ST.page = 'analisi'; rif.ST.analisi = { window:'3MESI', dateOffset:0 }; rif.win.renderAnalisi();
    atteso('Analisi 3 mesi · stesso disegno della lettura intera', [html === rif.win.document.getElementById('analisi-content').innerHTML, html.length > 1000], [true, true]);
    // dopo l'apertura di Analisi il rinfresco legge tutto (non butta il resto appena aperto)
    const n0 = a.supa._calls.length;
    await a.win.loadAllDays(); await a.win.loadExtrasAll();
    const nuovi = a.supa._calls.slice(n0).filter(c => c.op === 'select' && (c.table === 'meals' || c.table === 'supplements_log'));
    atteso('rinfresco dopo Analisi · legge tutto, senza filtri di data', [nuovi.length > 0, nuovi.some(c => c.filters.some(f => /date$/.test(f[1]) && (f[0] === 'gte' || f[0] === 'lt')))], [true, false]);
    atteso('rinfresco dopo Analisi · stesso stato di prima', foto(a.ST) === nuova.finale, true);
  }

  // 7) il join degli ingredienti non va: si ripiega, lo storico recente c'e' con i suoi ingredienti
  {
    const t = dati(); t.__joinRotto = true;
    const a = await nuovo(t);
    await a.win.loadAllDays();
    const r = righe(a.ST);
    atteso('join rotto · pasti e ingredienti della finestra comunque letti', [r.pasti, r.ingredienti], [91, 91 * 2 + 13]);
    atteso('join rotto · una lettura col join (fallita) e una intera di ripiego', a.supa._calls.filter(c => c.table === 'meal_items').length, 2);
  }

  // 8) il resto non si legge (errore): niente di rotto, la finestra resta, Analisi non si ripete all'infinito
  {
    const t = dati();
    const a = await nuovo(t);
    await a.win.loadAllDays(); await a.win.loadExtrasAll();
    t.__assenti = ['meal_items'];
    a.supa._calls.length = 0;
    const ok = await a.win.caricaStoricoCompleto();
    atteso('errore del resto · non segnato come completo, finestra intatta', [ok, a.ST.storicoCompleto, righe(a.ST).pasti], [false, false, 91]);
    a.ST.page = 'analisi'; a.ST.analisi = { window:'6MESI', dateOffset:0 }; a.win.renderAnalisi();
    for(let i = 0; i < 100 && /Carico lo storico/.test(a.win.document.getElementById('analisi-content').innerHTML); i++) await attendi(10);
    await attendi(30);
    atteso('errore del resto · Analisi si disegna lo stesso e la lettura non si ripete', [/Carico lo storico/.test(a.win.document.getElementById('analisi-content').innerHTML), a.supa._calls.filter(c => c.table === 'meals' && c.filters.some(f => f[0] === 'lt')).length], [false, 2]);
  }

  console.log('  --  voci di console osservate (avvisi compresi): ' + tutteLeConsole.length);
  atteso('zero errori in console', tutteLeConsole.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);

  const prima = process.argv[2];
  if(prima) {
    const p = await misura(path.join(prima, 'zona-tracker.html'));
    console.log(`  --  prima, all'avvio in memoria: ${p.avvio.giorni} giorni · ${p.avvio.pasti} pasti · ${p.avvio.ingredienti} ingredienti · ${p.avvio.integratori} integratori · ${p.avvio.extra} extra (${somma(p.avvio)} righe)`);
    atteso('prima · la prova distingue: l\'avvio leggeva tutto', [p.avvio.pasti, somma(p.avvio) > somma(meal90)], [199, true]);
    atteso('prima · numeri di oggi e di 30 giorni fa identici a adesso', [p.avvioOggi === nuova.avvioOggi, p.avvio30 === nuova.avvio30], [true, true]);
    atteso('prima · fotografia finale (giorni, pasti, ingredienti, extra) identica a finestra + resto', p.finale === nuova.finale, true);
  } else console.log('  --  confronto con la pagina di prima saltato (nessuna cartella passata)');
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
