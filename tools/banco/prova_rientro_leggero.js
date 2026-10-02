// Fondamenta 100, tappa 5 — il rientro nell'app rilegge solo quello che cambia in poco tempo.
//   node tools/banco/prova_rientro_leggero.js
// Si prova: (1) cosa cambiato da un altro telefono entra (pasto nuovo, pasto cambiato o tolto, extra,
// digiuno, integratore preso oggi) e il risultato per gli ultimi 7 giorni e' identico a una lettura
// completa; (2) i giorni piu' vecchi non si toccano; (3) catalogo, integratori, pacchetti e scheda non
// vengono riletti; (4) dopo 30 minuti, a giorno cambiato o se la lettura fallisce si torna al completo.
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(72), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const OGGI = '2026-10-02';
const giornoFa = (n) => { const d = new Date(Date.UTC(2026, 9, 2)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const DA7 = giornoFa(7);
function dati() {
  const meals = [], items = [], log = [];
  for(let n = 0; n < 30; n++) {
    const data = giornoFa(n), id = 'm' + data;
    meals.push({ user_id:U, id, date:data, slot:'pranzo', kcal:600, protein:30, carbs:60, fat:20, description:'pasto ' + n, notes:'', time:'13:00' });
    [0, 1].forEach(k => items.push({ user_id:U, id:id + '-' + k, meal_id:id, name:'ing ' + k, quantity:100, unit:'g', kcal:100, protein:5, carbs:10, fat:3, source:'manual', sort_order:k }));
    log.push({ user_id:U, id:'s' + data, date:data, slot:'08:00', supplement_name:'Omega', is_extra:false });
    if(n % 3 === 0) log.push({ user_id:U, id:'e' + data, date:data, slot:'16:00', supplement_name:'Barretta', dose:1, dose_unit:'pz', kcal:150, carbo:15, proteine:10, grassi:5, costo:1, created_at:data + 'T16:00:00Z', is_extra:true });
  }
  return { meals, meal_items:items, fasting_days:[], supplements_log:log, supplements:[], esercizi_catalog:[], nutrilite_catalog:[], profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], training_logs:[], workout_sets:[] };
}
const stabile = (v) => Array.isArray(v) ? v.map(stabile) : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stabile(v[k])])) : v);
const recenti = (o, da) => stabile(Object.fromEntries(Object.keys(o).filter(k => k >= da).sort().map(k => [k, o[k]])));
const vecchi = (o, da) => JSON.stringify(stabile(Object.fromEntries(Object.keys(o).filter(k => k < da).sort().map(k => [k, o[k]]))));
async function nuovo(tables) {
  const b = boot(tables, { now:OGGI + 'T12:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.supps = []; ST.catalog = [];
  return { ...b, ST };
}
// il disegno della Home a fine rinfresco legge per conto suo il piano e le pesate: non sono del rinfresco
const DELLA_HOME = ['weekly_plans', 'weight_logs'];
const richiesteRinfresco = (a) => a.supa._calls.filter(c => !DELLA_HOME.includes(c.table)).length;
const tabelle = (a) => a.supa._calls.filter(c => c.op === 'select').map(c => c.table).sort();

(async () => {
  const t = dati();
  const a = await nuovo(t);
  await a.win.loadAllDays(); await a.win.loadExtrasAll();
  a.ST.activeDay = OGGI;
  a.ST.ultimoCompletoAt = a.win.Date.now(); a.ST.ultimoCompletoGiorno = OGGI;
  const vecchiPrima = vecchi(a.ST.db.days, DA7);

  // un altro telefono: pasto nuovo oggi, pasto di 3 giorni fa cambiato, pasto di 5 giorni fa tolto, extra, digiuno, integratore
  t.meals.push({ user_id:U, id:'nuovo', date:OGGI, slot:'cena', kcal:800, protein:40, carbs:80, fat:30, description:'cena', notes:'', time:'20:00' });
  t.meal_items.push({ user_id:U, id:'nuovo-0', meal_id:'nuovo', name:'riso', quantity:200, unit:'g', kcal:260, protein:5, carbs:56, fat:1, source:'manual', sort_order:0 });
  t.meals.find(m => m.id === 'm' + giornoFa(3)).kcal = 999;
  t.meals.splice(t.meals.findIndex(m => m.id === 'm' + giornoFa(5)), 1);
  t.meal_items = t.meal_items.filter(i => i.meal_id !== 'm' + giornoFa(5));
  t.supplements_log.push({ user_id:U, id:'e2', date:OGGI, slot:'18:00', supplement_name:'Gel', dose:1, dose_unit:'pz', kcal:90, carbo:22, proteine:0, grassi:0, costo:1, created_at:OGGI + 'T18:00:00Z', is_extra:true });
  t.supplements_log.push({ user_id:U, id:'s2', date:OGGI, slot:'20:00', supplement_name:'Magnesio', is_extra:false });
  t.fasting_days.push({ user_id:U, date:giornoFa(2) });
  // un cambiamento in un giorno vecchio (10 giorni fa): il rientro leggero non lo vede, e va bene
  t.meals.find(m => m.id === 'm' + giornoFa(10)).kcal = 1;

  a.supa._calls.length = 0;
  const ok = await a.win.loadRecentDays();
  atteso('rientro leggero · 4 letture (pasti, ingredienti, digiuni, integratori)', [ok, tabelle(a)], [true, ['fasting_days', 'meal_items', 'meals', 'supplements_log']]);

  // riferimento: lettura completa dello stesso stato del server
  const r = await nuovo(t);
  r.ST.storicoCompleto = true;
  await r.win.loadAllDays(); await r.win.loadExtrasAll(); await r.win.loadSupps(); await r.win.loadTodaySuppLog();
  atteso('ultimi 7 giorni · giorni identici alla lettura completa', JSON.stringify(recenti(a.ST.db.days, DA7)) === JSON.stringify(recenti(r.ST.db.days, DA7)), true);
  atteso('ultimi 7 giorni · extra identici alla lettura completa', JSON.stringify(recenti(a.ST.extrasByDay, DA7)) === JSON.stringify(recenti(r.ST.extrasByDay, DA7)), true);
  atteso('pasto nuovo, pasto cambiato, pasto tolto, digiuno', [a.ST.db.days[OGGI].meals.length, a.ST.db.days[giornoFa(3)].meals[0].kcal, !!(a.ST.db.days[giornoFa(5)] && a.ST.db.days[giornoFa(5)].meals.length), a.ST.db.days[giornoFa(2)].fasting], [2, 999, false, true]);
  atteso('integratore preso oggi e extra di oggi', [a.ST.db.days[OGGI].rawSuppLogs.map(s => s.name).sort(), a.ST.extrasByDay[OGGI].length], [['Magnesio', 'Omega'], 2]);
  atteso('ingredienti del pasto nuovo, senza il join dentro', a.ST.db.days[OGGI].meals.find(m => m.id === 'nuovo').items.map(i => Object.keys(i).includes('meals') ? 'join' : i.name), ['riso']);
  atteso('giorni piu\' vecchi di 7 giorni · non toccati', vecchi(a.ST.db.days, DA7) === vecchiPrima, true);

  // il rinfresco: leggero / completo
  async function giro(modifica) {
    const b = await nuovo(dati());
    await b.win.loadAllDays(); await b.win.loadExtrasAll();
    b.ST.ultimoCompletoAt = b.win.Date.now(); b.ST.ultimoCompletoGiorno = OGGI;
    if(modifica) modifica(b);
    b.supa._calls.length = 0;
    await b.win.refreshInBackground();
    return b;
  }
  let b = await giro();
  atteso('refresh dopo pochi minuti · 7 richieste, niente catalogo/integratori/pacchetti/scheda', [richiesteRinfresco(b), ['nutrilite_catalog', 'supplements', 'supplement_packages', 'supplement_package_items', 'schede_utente'].filter(x => tabelle(b).includes(x))], [7, []]);
  b = await giro(x => { x.ST.ultimoCompletoAt = x.win.Date.now() - 31 * 60 * 1000; });
  atteso('refresh dopo 31 minuti · completo (14 richieste)', richiesteRinfresco(b), 14);
  b = await giro(x => { x.ST.ultimoCompletoGiorno = giornoFa(1); });
  atteso('refresh a giorno cambiato · completo (14 richieste)', richiesteRinfresco(b), 14);
  b = await giro(x => { delete x.ST.ultimoCompletoAt; });
  atteso('refresh senza un completo precedente · completo (14 richieste)', richiesteRinfresco(b), 14);
  // dopo un completo si riparte da leggero
  atteso('dopo il completo il momento si aggiorna', Math.abs(b.ST.ultimoCompletoAt - b.win.Date.now()) < 60000 && b.ST.ultimoCompletoGiorno === OGGI, true);
  // lettura che fallisce: si ripiega sul completo, e i dati restano
  {
    const t2 = dati();
    const c = await nuovo(t2);
    await c.win.loadAllDays(); await c.win.loadExtrasAll();
    c.ST.ultimoCompletoAt = c.win.Date.now(); c.ST.ultimoCompletoGiorno = OGGI;
    const prima = Object.keys(c.ST.db.days).length;
    t2.__assenti = ['fasting_days'];
    c.supa._calls.length = 0;
    await c.win.refreshInBackground();
    atteso('lettura recente fallita · niente si perde, ripiego sul completo', [Object.keys(c.ST.db.days).length >= prima - 0, c.supa._calls.length > 7], [true, true]);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
