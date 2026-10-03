// Fondamenta 150, dalla prova sul telefono — il cestino rosso che compare scorrendo un pasto chiede conferma
// come quello piccolo: nessun cestino cancella senza domanda.
//   node tools/banco/prova_cestino_pasto.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-03';
(async () => {
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[{ user_id:U, id:'m1', date:OGGI, slot:'pranzo', kcal:500, protein:20, carbs:60, fat:15, description:'riso e pollo', notes:'', time:'13:00' }], meal_items:[], fasting_days:[], supplements_log:[], supplements:[] };
  const b = boot(t, { now:OGGI + 'T14:00:00' });
  await b.avviato;
  const { win } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.catalog = []; ST.supps = []; ST.activeDay = OGGI;
  await win.loadAllDays();
  win.renderOggi();
  const pasti = () => (win.getDay(OGGI).meals || []).length;
  const foglio = () => d.querySelector('.foglio-overlay');
  const bottone = (testo) => [...d.querySelectorAll('.foglio-overlay button')].find(x => x.textContent === testo);
  const cancellazioni = () => b.supa._calls.filter(c => c.table === 'meals' && c.op === 'delete').length;
  const cestinoScorri = () => d.querySelector('#sw-m1 .swipe-delete-btn');
  const cestinoPiccolo = () => d.querySelector('#sw-m1 .meal-delete-btn');
  atteso('il pasto c\'è, con i due cestini', [pasti(), !!cestinoScorri(), !!cestinoPiccolo()], [1, true, true]);

  // cestino a scorrimento: la card e' scivolata, si tocca il cestino
  d.getElementById('si-m1').style.transform = 'translateX(-72px)';
  cestinoScorri().click(); await attendi(5);
  atteso('cestino a scorrimento · chiede, non cancella', [!!foglio(), foglio() && foglio().textContent.includes('Eliminare questo pasto?'), pasti(), cancellazioni()], [true, true, 1, 0]);
  bottone('Annulla').click(); await attendi(5);
  atteso('Annulla · il pasto resta e la card torna al suo posto', [pasti(), cancellazioni(), d.getElementById('si-m1').style.transform], [1, 0, 'translateX(0)']);
  cestinoScorri().click(); await attendi(5); bottone('Elimina').click(); await attendi(20);
  atteso('Elimina · il pasto va via, una cancellazione', [pasti(), cancellazioni()], [0, 1]);

  // cestino piccolo: stessa domanda
  t.meals.length = 0;   // il finto Supabase non toglie le righe cancellate: si parte da una tabella pulita
  t.meals.push({ user_id:U, id:'m2', date:OGGI, slot:'cena', kcal:400, protein:30, carbs:20, fat:10, description:'pesce', notes:'', time:'20:00' });
  await win.loadAllDays(); win.renderOggi();
  d.querySelector('#sw-m2 .meal-delete-btn').click(); await attendi(5);
  atteso('cestino piccolo · stessa domanda', [!!foglio(), pasti()], [true, 1]);
  bottone('Elimina').click(); await attendi(20);
  atteso('cestino piccolo · Elimina cancella', [pasti(), cancellazioni()], [0, 2]);

  // nel codice: nessun cestino chiama deleteMeal senza passare dalla domanda
  const src = fs.readFileSync('app/nutrition.js', 'utf8');
  atteso('nel codice · nessun onclick chiama deleteMeal direttamente', (src.match(/onclick="[^"]*\bdeleteMeal\(/g) || []).length, 0);
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
