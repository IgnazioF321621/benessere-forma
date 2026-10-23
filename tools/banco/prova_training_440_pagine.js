// Training 440, seguito della revisione del Rilascio 51 (23 ottobre 2026): loadLastLoggedSets legge
// training_logs a pagine da 1000, per data dalla più recente e set_number dal più alto. Si fermava appena ogni
// esercizio aveva la sua ultima serie: se l'ultima seduta di un esercizio cadeva a cavallo di due pagine, le
// serie con set_number basso (spesso le più pesanti) restavano fuori e la prima serie di oggi sceglieva fra
// serie incomplete. Ora si legge finché la data dell'ultima seduta di ognuno non è finita (_dataAperta),
// nella sessione e, per gli esercizi spostati, nelle altre sessioni.
//   node tools/banco/prova_training_440_pagine.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-24', IERI = '2026-10-23';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const RH = 'Reverse hyper elastico panca piana';
const scheda = { sessioni: [
  { id:'lowerA', name:'Lower A', type:'Forza', rir:2, exercises:[
    { codice:'EX644', name:RH, sets:4, reps:'4-6', rir:2, rest_sec:120, progressione:'carico' },
    { codice:'EX064', name:'Leg curl', sets:3, reps:'12-15', rir:1, iso:true, rest_sec:75, progressione:'carico' },
  ] },
  { id:'lowerB', name:'Lower B', type:'Ipertrofia', rir:1, exercises:[
    { codice:'EX644', name:RH, sets:4, reps:'4-6', rir:2, rest_sec:120, progressione:'carico' },   // spostato qui: le serie sono in lowerA
  ] },
] };
const riga = (id, sid, nome, codice, set, reps, resistance) => ({ id, user_id:U, session_id:sid, date:IERI, exercise_name:nome, exercise_code:codice, set_number:set, reps, resistance, band_color:null, rir_actual:2 });
function fixture(){
  // Ieri, nella stessa data: 997 righe di Leg curl con set_number 5…1001 vengono prima (set_number dal più alto),
  // poi il Reverse hyper 4, 3, 2 chiudono la prima pagina e la sua serie 1, la più pesante (110 × 6), è sulla seconda.
  const logs = [];
  for(let s = 5; s <= 1001; s++) logs.push(riga('l' + s, 'lowerA', 'Leg curl', 'EX064', s, 15, '20'));
  logs.push(riga('r4', 'lowerA', RH, 'EX644', 4, 6, '100'), riga('r3', 'lowerA', RH, 'EX644', 3, 5, '100'), riga('r2', 'lowerA', RH, 'EX644', 2, 4, '100'), riga('r1', 'lowerA', RH, 'EX644', 1, 6, '110'));
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX644', nome:RH, unilaterale:'no', progressione:'carico' }, { codice:'EX064', nome:'Leg curl', unilaterale:'no', progressione:'carico' }],
    training_logs: logs,
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
  ST.page = 'training'; W.callAI = async () => '';
  // nella sessione: la serie 1 sta sulla seconda pagina
  await W.loadLastLoggedSets('lowerA');
  atteso('stessa sessione · le 4 serie del Reverse hyper ci sono tutte, anche quella sulla seconda pagina', (ST.lastSessionSets[RH] || []).map(l => l.set_number).sort(), [1, 2, 3, 4]);
  let o = W.obiettivoPrimaSerie(RH, 'lowerA');
  atteso('stessa sessione · la prima serie di oggi è la più pesante, 110 × 6', o && [o.resistance, o.reps], [110, 6]);
  // in un'altra sessione (esercizio spostato): stessa cosa nel passaggio 3
  ST.trainSession = 'lowerB';
  await W.loadLastLoggedSets('lowerB');
  atteso('altra sessione · le 4 serie ci sono tutte', (ST.lastSessionSets[RH] || []).map(l => l.set_number).sort(), [1, 2, 3, 4]);
  o = W.obiettivoPrimaSerie(RH, 'lowerB');
  atteso('altra sessione · la prima serie di oggi è 110 × 6', o && [o.resistance, o.reps], [110, 6]);
  // _dataAperta da sola
  atteso('_dataAperta · la pagina finisce sulla data di un esercizio trovato: aperta', W._dataAperta({ a:{ date:'2026-10-23' } }, [{ date:'2026-10-23' }]), true);
  atteso('_dataAperta · la pagina finisce su una data più vecchia: chiusa', W._dataAperta({ a:{ date:'2026-10-23' } }, [{ date:'2026-10-20' }]), false);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
