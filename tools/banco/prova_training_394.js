// Training 394 (19 novembre 2026, feedback di Ignazio 5226495e): nella settimana leggera «Trazioni sbarra presa neutra»
// proponeva «banda Viola · 8 reps (rientro)» dopo 6 ripetizioni sulla Viola: due in più. Scarico e rientro riportavano le
// ripetizioni al minimo dell'intervallo e scendevano di una banda; sulla banda che aiuta di più la banda non scende, e
// restava il minimo. Ora, se la banda non può scendere, si tolgono ripetizioni: due terzi, almeno 1 (6 → 4).
//   node tools/banco/prova_training_394.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-11-19';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(100), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const TRAZ = 'Trazioni sbarra presa neutra', CURL = 'Curl manubri';
const scheda = { sessioni: [ { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, exercises:[
  { codice:'EX510', name:TRAZ, sets:3, reps:'8-12', rest_sec:90, eq:'sbarra', progressione:'meno assistenza' },
  { codice:'EX900', name:CURL, sets:3, reps:'8-12', rest_sec:60, eq:'manubri', progressione:'carico' },
] } ] };
(async () => {
  const t = {
    profiles:[{ id:U, first_name:'X', m2_skipped:true, unit:'lbs', train_start_date:'2026-11-17', tipo_allenamento:'casa', attrezzatura:['elastico','sbarra','manubri'], note_salute:'Esperienza: avanzato' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda }],
    esercizi_catalog: [], training_logs: [], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'x@y' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  W.callAI = async () => '';
  W.eval('getCycleWeekInfo = () => ({ weekNum: window.__w || 2, isScarico: window.__w === 6, workCount: 0, workPerGiro: 4, deloadFrom: null })');
  W.eval('getSoftReturn = () => window.__leggera || null');
  const ultima = (nome, reps, banda, resistance) => { const r = { reps, band_color: banda || null, resistance: resistance || null, rir_actual: 3, set_number: 1, date: '2026-10-30' }; ST.lastLoggedSets = { [nome]: r }; ST.lastSessionSets = { [nome]: [r] }; ST.storiaSerie = {}; };
  const ob = (nome) => { const o = W.obiettivoPrimaSerie(nome, 'upperB'); return o ? [o.testo, o.bandColor, o.reps] : null; };
  const LEGGERA = { active:true, leggera:true, ripresa:'2026-11-17', finoA:'2026-11-23' };

  // ── 1 · il caso del feedback: settimana leggera, 6 ripetizioni sulla Viola ──
  ultima(TRAZ, 6, 'Viola'); W.__leggera = LEGGERA; W.__w = 2;
  atteso('1 · rientro, 6 sulla Viola: resta la Viola e le ripetizioni scendono a 4 (prima: 8, due in più)', ob(TRAZ), ['S1: banda Viola · 4 reps · RIR 2 (rientro)', 'Viola', 4]);
  W.__leggera = null; W.__w = 6;
  atteso('1 · scarico, 6 sulla Viola: uguale, 4 ripetizioni', ob(TRAZ), ['S1: banda Viola · 4 reps · RIR 3 (scarico)', 'Viola', 4]);
  ultima(TRAZ, 12, 'Viola');
  atteso('1 · scarico, 12 sulla Viola: 8; con 1 sola ripetizione resta 1; con 2 → 1', [ob(TRAZ)[2], (ultima(TRAZ, 1, 'Viola'), ob(TRAZ)[2]), (ultima(TRAZ, 2, 'Viola'), ob(TRAZ)[2])], [8, 1, 1]);

  // ── 2 · quando la banda può scendere, come prima: una banda più d'aiuto, dal minimo ──
  ultima(TRAZ, 10, 'Rossa'); W.__w = 6;
  atteso('2 · scarico, 10 sulla Rossa: la Nera, dal minimo (com\'era)', ob(TRAZ), ['S1: banda Nera · 8 reps · RIR 3 (scarico)', 'Nera', 8]);
  W.__w = 2; W.__leggera = LEGGERA;
  atteso('2 · rientro, 10 sulla Rossa: la Nera, dal minimo (com\'era)', ob(TRAZ)[1], 'Nera');

  // ── 3 · fuori da scarico e rientro: sotto il minimo sulla Viola non si chiede il minimo che non si raggiunge ──
  W.__leggera = null; W.__w = 2;
  ultima(TRAZ, 6, 'Viola');
  atteso('3 · settimana normale, 6 sulla Viola con margine (RIR 3): 7, non «punta a 8»', ob(TRAZ), ['S1: banda Viola · 7 reps · RIR 1', 'Viola', 7]);
  const sess = W.getTrainingSession('upperB');
  const pr = (reps, rir, banda) => W.computeNextSetSuggestion({ sessionId:'upperB', exName:TRAZ, setNum:1, reps, resistance:'', rir, exData:W.findExercise(TRAZ, 'upperB'), sess, bandColor:banda });
  atteso('3 · dentro la seduta, 5 sulla Viola senza margine: si ripetono le 5; sulla Nera si scende alla Viola dal minimo', [pr(5, 1, 'Viola'), pr(5, 1, 'Nera')], ['S2: banda Viola · 5 reps · RIR 1', 'S2: banda Viola (più aiuto) · punta a 8 reps · RIR 1']);

  // ── 4 · i carichi in numeri non cambiano ──
  ultima(CURL, 10, null, '30'); W.__w = 6;
  atteso('4 · scarico coi manubri: −20 lbs dal minimo, come prima', ob(CURL), ['S1: 10 lbs · 8 reps · RIR 3 (scarico)', null, 8]);

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
