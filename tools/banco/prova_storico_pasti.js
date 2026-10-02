// Fondamenta 010: lo storico dei pasti oltre le 1000 righe non si tronca più.
// 1100 pasti (uno al giorno, dal più vecchio) e 2300 ingredienti: prima della
// correzione gli ultimi 100 giorni sparivano e oltre metà ingredienti pure.
// Prima/dopo: sul file vecchio deve dare KO.
//   node tools/banco/prova_storico_pasti.js
//   BANCO_FILE=/tmp/prima.html node tools/banco/prova_storico_pasti.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(58), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const giorno = (i) => { const d = new Date(Date.UTC(2023, 0, 1 + i)); return d.toISOString().slice(0, 10); };
const N = 1100;
const meals = [], items = [];
for(let i = 0; i < N; i++){
  const id = 'm' + String(i).padStart(5, '0');
  meals.push({ user_id:U, id, date:giorno(i), slot:'pranzo', kcal:500, protein:30, carbs:50, fat:15, description:'pasto ' + i, notes:'', time:'13:00' });
  // due ingredienti per pasto, più un terzo ogni 11: 2300 in tutto, sort_order pieno di pari merito
  [0, 1].concat(i % 11 === 0 ? [2] : []).forEach(k =>
    items.push({ user_id:U, id:id + '-' + k, meal_id:id, name:'ing ' + k, quantity:100, unit:'g', kcal:100, protein:5, carbs:10, fat:3, source:'manual', sort_order:k }));
}
// un altro utente, per vedere che il filtro per persona regge alle pagine
meals.push({ user_id:'u2', id:'altro', date:giorno(5), slot:'cena', kcal:1, protein:0, carbs:0, fat:0 });
const catalogo = Array.from({ length: 1250 }, (_, i) => ({ codice:'EX' + String(i + 1).padStart(4, '0'), nome:'Esercizio ' + (i + 1) }));
const base = () => ({ meals:meals.slice(), meal_items:items.slice(), fasting_days:[], supplements_log:[], supplements:[], esercizi_catalog:catalogo });

(async () => {
  // 1) storico completo
  {
    const { win, supa } = boot(base());
    const ST = win.eval('ST');
    ST.user = { id:U }; ST.profile = { id:U }; ST.supps = [];
    // Dalla tappa 4 di Fondamenta 100 l'avvio legge solo gli ultimi 90 giorni: i pasti di questa prova
    // sono tutti piu' vecchi, quindi si legge la finestra (vuota) e poi il resto, come fa l'app.
    await win.loadAllDays();
    await win.caricaStoricoCompleto();
    const giorni = Object.keys(ST.db.days).filter(d => ST.db.days[d].meals.length);
    atteso('giorni con pasti', giorni.length, N);
    atteso('il pasto più recente c\'è', !!(ST.db.days[giorno(N - 1)] && ST.db.days[giorno(N - 1)].meals.length), true);
    const conIngr = giorni.reduce((n, d) => n + ST.db.days[d].meals.reduce((a, m) => a + m.items.length, 0), 0);
    atteso('ingredienti agganciati', conIngr, items.length);
    atteso('nessun pasto senza ingredienti', giorni.filter(d => ST.db.days[d].meals.some(m => !m.items.length)).length, 0);
    atteso('pasti di un\'altra persona', giorni.filter(d => ST.db.days[d].meals.some(m => m.id === 'altro')).length, 0);
    const letture = supa._calls.filter(c => c.op === 'select' && (c.table === 'meals' || c.table === 'meal_items'));
    atteso('letture con le pagine', letture.every(c => !!c.range), true);
    atteso('ordine senza pari merito (id in coda)', letture.every(c => c.orders.length && c.orders[c.orders.length - 1][0] === 'id'), true);
  }
  // 2) la lettura degli ingredienti fallisce: lo storico in memoria non si tocca
  {
    const t = base(); t.__assenti = ['meal_items'];
    const { win } = boot(t);
    const ST = win.eval('ST');
    ST.user = { id:U }; ST.profile = { id:U }; ST.supps = [];
    ST.db = { days: { '2026-10-01': { meals:[{ id:'buono', items:[{ id:'x' }] }] } } };
    await win.loadAllDays();
    atteso('ingredienti non letti: storico di prima intatto', Object.keys(ST.db.days), ['2026-10-01']);
  }
  // 3) catalogo oltre 1000: dbqAll legge tutto
  {
    const { win } = boot(base());
    const supa = win.eval('supa');
    const r = await win.dbqAll('leggere il catalogo', () => supa.from('esercizi_catalog').select('codice, nome').order('codice', { ascending:true }), { silenzioso:true });
    atteso('catalogo: righe lette', r.data && r.data.length, 1250);
    atteso('catalogo: codici tutti diversi', new Set((r.data || []).map(x => x.codice)).size, 1250);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.message); process.exit(1); });
