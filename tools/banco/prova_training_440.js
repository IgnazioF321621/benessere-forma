// Training 440 (23 ottobre 2026, idea di Ignazio e sua scelta coi pulsanti): la prima serie di ogni esercizio
// riparte dal carico massimo dell'ultima seduta, UGUALE — il carico più alto e, a quel carico, le ripetizioni
// migliori («100 lbs × 6») — e si sale dalle serie dopo. Una regola sola: computeNextSetSuggestion con
// primaSerie, sulla serie scelta da serieDaRipetere fra tutte quelle dell'ultima seduta (ST.lastSessionSets).
//   node tools/banco/prova_training_440.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-23', IERI = '2026-10-22', PRIMA = '2026-10-15';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const scheda = { sessioni: [ { id:'lowerA', name:'Lower A', type:'Forza', rir:2, exercises:[
  { codice:'EX644', name:'Reverse hyper elastico panca piana', sets:4, reps:'4-6', rir:2, rest_sec:120, progressione:'carico' },
  { codice:'EX064', name:'Leg curl', sets:3, reps:'12-15', rir:1, iso:true, rest_sec:75, progressione:'carico' },
  { codice:'EX008', name:'Trazioni sbarra assistite', sets:3, reps:'6-10', rest_sec:120 },
  { codice:'EX188', name:'Sit-up mani alla fronte', sets:3, reps:'12-15', rir:1, iso:true, rest_sec:60, progressione:'più ripetizioni' },
  { codice:'EX072', name:'Plank', sets:2, reps:'20-40 sec', iso:true, durationBased:true, isTimed:true, rest_sec:60, progressione:'tenuta più lunga' },
  { codice:'EX003', name:'Rematore elastico', sets:3, reps:'6-10', rest_sec:90, progressione:'carico' },
] } ] };
const log = (id, data, nome, codice, set, reps, resistance, rir, extra) => ({ id, user_id:U, session_id:'lowerA', date:data, exercise_name:nome, exercise_code:codice, set_number:set, reps, resistance, band_color:null, rir_actual:rir, ...(extra || {}) });
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: scheda.sessioni[0].exercises.map(e => ({ codice:e.codice, nome:e.name, unilaterale:'no', progressione:e.progressione || null })),
    training_logs:[
      // la seduta di prima non conta: conta solo l'ultima
      log('p1', PRIMA, 'Reverse hyper elastico panca piana', 'EX644', 1, 6, '120', 2),
      // il Reverse hyper vero di Ignazio, 22 ottobre
      log('r1', IERI, 'Reverse hyper elastico panca piana', 'EX644', 1, 6, '90', 2),
      log('r2', IERI, 'Reverse hyper elastico panca piana', 'EX644', 2, 4, '100', 2),
      log('r3', IERI, 'Reverse hyper elastico panca piana', 'EX644', 3, 5, '100', 2),
      log('r4', IERI, 'Reverse hyper elastico panca piana', 'EX644', 4, 6, '100', 2),
      // Leg curl vero: 15×10, 14×20, 15×20 (obiettivo RIR 1)
      log('l1', IERI, 'Leg curl', 'EX064', 1, 15, '10', 2), log('l2', IERI, 'Leg curl', 'EX064', 2, 14, '20', 2), log('l3', IERI, 'Leg curl', 'EX064', 3, 15, '20', 2),
      // trazioni: la banda più dura vince sulle ripetizioni
      log('t1', IERI, 'Trazioni sbarra assistite', 'EX008', 1, 10, null, 2, { band_color:'Nera' }),
      log('t2', IERI, 'Trazioni sbarra assistite', 'EX008', 2, 7, null, 2, { band_color:'Rossa' }),
      log('t3', IERI, 'Trazioni sbarra assistite', 'EX008', 3, 6, null, 1, { band_color:'Rossa' }),
      // corpo libero: le ripetizioni migliori (anche a RIR 1, sotto l'obiettivo: uguale, mai di più)
      log('s1', IERI, 'Sit-up mani alla fronte', 'EX188', 1, 12, '0', 2), log('s2', IERI, 'Sit-up mani alla fronte', 'EX188', 2, 13, '0', 1),
      // tenuta: i secondi più lunghi
      log('k1', IERI, 'Plank', 'EX072', 1, 35, null, null), log('k2', IERI, 'Plank', 'EX072', 2, 30, null, null),
      // la più pesante è sotto il minimo (4 su 6-10): si sceglie la più pesante nel range
      log('m1', IERI, 'Rematore elastico', 'EX003', 1, 8, '40', 2), log('m2', IERI, 'Rematore elastico', 'EX003', 2, 4, '60', 1),
    ],
    workouts:[], training_notes:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
(async () => {
  const t = fixture();
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'lowerA'; ST.trainAnticipato = 'lowerA'; ST.aiCue = ST.aiCue || {};
  W.callAI = async () => '';
  await W.loadLastLoggedSets('lowerA');
  const o = (n) => W.obiettivoPrimaSerie(n, 'lowerA');
  atteso('le serie dell\'ultima seduta ci sono tutte (4 del Reverse hyper), quella di prima no', (ST.lastSessionSets['Reverse hyper elastico panca piana'] || []).map(l => l.set_number + '×' + l.resistance).sort(), ['1×90', '2×100', '3×100', '4×100']);
  let x = o('Reverse hyper elastico panca piana');
  atteso('Reverse hyper (90×6, 100×4, 100×5, 100×6) → oggi 100 lbs × 6, uguale', x && [x.testo, x.resistance, x.reps], ['S1: 100 lbs · 6 reps · RIR 2', 100, 6]);
  x = o('Leg curl');
  atteso('Leg curl (15×10, 14×20, 15×20) → oggi 20 lbs × 15, obiettivo RIR 1', x && [x.testo, x.resistance, x.reps], ['S1: 20 lbs · 15 reps · RIR 1', 20, 15]);
  x = o('Trazioni sbarra assistite');
  atteso('trazioni (Nera×10, Rossa×7, Rossa×6) → oggi la banda più dura, Rossa × 7', x && [x.testo, x.bandColor, x.reps], ['S1: banda Rossa · 7 reps · RIR 2', 'Rossa', 7]);
  x = o('Sit-up mani alla fronte');
  atteso('corpo libero (12, 13 a RIR 1) → 13 uguale: mai di più dopo un RIR sotto l\'obiettivo', x && [x.testo, x.reps], ['S1: corpo libero · 13 reps · RIR 1', 13]);
  x = o('Plank');
  atteso('tenuta (35 s, 30 s) → 35 secondi', x && x.reps, 35);
  x = o('Rematore elastico');
  atteso('la più pesante sotto il minimo (60×4 su 6-10) non vale: la più pesante nel range, 40 × 8', x && [x.testo, x.resistance, x.reps], ['S1: 40 lbs · 8 reps · RIR 2', 40, 8]);
  // la card e il registro dicono lo stesso
  W.renderTraining();
  const riga = W.getProgressionSuggestion('Reverse hyper elastico panca piana', 'lowerA');
  atteso('la card: «Oggi S1: 100 lbs · 6 reps» e «ultima volta» è la serie più forte', riga, '🎯 Oggi S1: 100 lbs · 6 reps · RIR 2 · ultima volta 6r · 100 lbs · RIR 2');
  W.openLogModal('lowerA', 'Reverse hyper elastico panca piana', 1);
  atteso('il registro della prima serie è compilato 100 × 6', [W.document.getElementById('tl-reps').value, ST.trainLogResist], ['6', 100]);
  ST.trainLogOpen = null;
  // senza le serie della seduta (copia vecchia), l'ultima serie come prima
  ST.lastSessionSets = {};
  x = o('Reverse hyper elastico panca piana');
  atteso('senza l\'elenco delle serie si usa l\'ultima serie (100 × 6)', x && [x.resistance, x.reps], [100, 6]);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
