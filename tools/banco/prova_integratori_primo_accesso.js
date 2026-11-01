// Stile 040 (1 novembre 2026) — al primo accesso senza copia locale i «presi» dei giorni passati devono esserci.
// All'avvio lo storico (prima ondata) si legge prima degli integratori (seconda): le righe di supplements_log
// non trovavano il prodotto e i giorni passati restavano senza «presi» fino al rinfresco completo successivo,
// con l'anello degli integratori più basso del vero. rilegaIntegratori() le rilega dopo loadSupps, senza
// letture in più e senza cambiare le ondate.
//   node tools/banco/prova_integratori_primo_accesso.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const U = 'u1', OGGI = '2026-11-01';
const add = (k, n) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const IERI = add(OGGI, -1), TRE = add(OGGI, -3);
function tabelle(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, target_kcal:2300, target_protein:170, target_carbs:220, target_fat:75 }],
    supplements:[{ id:'s1', user_id:U, name:'Omega 3', slot:'08:00', sort_order:1, active:true, kcal:10, protein:0, carbs:0, fat:1 },
      { id:'s2', user_id:U, name:'Vitamina D', slot:'08:00', sort_order:2, active:true, kcal:0, protein:0, carbs:0, fat:0 }],
    supplements_log:[
      { id:'l1', user_id:U, date:IERI, supplement_id:'s1', supplement_name:'Omega 3', slot:'08:00', is_extra:false, created_at:IERI + 'T08:00:00Z' },
      { id:'l2', user_id:U, date:IERI, supplement_id:null, supplement_name:'Vitamina D', slot:'08:00', is_extra:false, created_at:IERI + 'T08:01:00Z' },   // riga vecchia: solo il nome
      { id:'l3', user_id:U, date:TRE, supplement_id:'s1', supplement_name:'Omega 3', slot:'08:00', is_extra:false, created_at:TRE + 'T08:00:00Z' },
      { id:'l4', user_id:U, date:OGGI, supplement_id:'s1', supplement_name:'Omega 3', slot:'08:00', is_extra:false, created_at:OGGI + 'T08:00:00Z' },
    ],
    meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[], nutrilite_catalog:[],
    __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } },
  };
}
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  // senza copia locale: è il primo accesso su questo telefono
  const b = boot(tabelle(), { now:OGGI + 'T12:00:00', locale:{ zt_privacy_ok:'x', zt_installa_visto:'1' } });
  await b.avviato;
  for(let i = 0; i < 500 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  await attendi(300);
  const ST = b.win.eval('ST');
  const presi = (k) => (ST.db.days[k] && ST.db.days[k].suppsTaken || []).slice().sort();
  atteso('primo accesso · ieri: presi Omega 3 (per id) e Vitamina D (per nome)', presi(IERI), ['s1', 's2']);
  atteso('primo accesso · tre giorni fa: preso Omega 3', presi(TRE), ['s1']);
  atteso('primo accesso · oggi: preso Omega 3', presi(OGGI), ['s1']);
  atteso('le righe di ieri hanno il prodotto, il nome e la dose', (ST.db.days[IERI].rawSuppLogs || []).map(l => [l.id, l.name, l.dose]), [['s1', 'Omega 3', 1], ['s2', 'Vitamina D', 1]]);
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
