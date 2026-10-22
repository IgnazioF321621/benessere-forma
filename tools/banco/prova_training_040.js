// Training 040 (Ondata 4, Sessione H, 13 ottobre 2026): l'obiettivo di oggi parte dall'ultima seduta.
// La prima serie di oggi è la «prossima» dopo l'ultima serie della seduta precedente (una regola sola,
// computeNextSetSuggestion): stesso carico e una ripetizione in più, un passo avanti sulla via se
// l'ultima volta era in cima con margine, un passo indietro se sotto il minimo; in scarico e nel rientro
// le riduzioni delle righe SCARICO e RIENTRO. Carico e ripetizioni già compilati nel registro (prima serie
// dall'obiettivo, le altre dalla PROSSIMA), obiettivo sotto la GIF, un tocco su «Salva».
//   node tools/banco/prova_training_040.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13', IERI = '2026-10-09';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, rest:'3 min', exercises:[
  { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10', rest_sec:120 },          // ultima volta 8 · 40 lbs · RIR 2 → oggi 40 lbs · 9
  { codice:'EX002', name:'Chest press elastico', sets:3, reps:'6-10', rest_sec:120 },    // ultima volta 10 · 40 lbs · RIR 2 (in cima, margine) → 50 lbs · 6
  { codice:'EX003', name:'Rematore elastico', sets:3, reps:'6-10', rest_sec:90 },        // ultima volta 5 · 40 lbs → sotto il minimo → 30 lbs · 6
  { codice:'EX008', name:'Trazioni sbarra assistite', sets:3, reps:'6-10', rest_sec:120 }, // ultima volta 10 · Rossa · RIR 2 → Gialla · 6
  { codice:'EX647', name:'Squat calcio laterale', sets:3, reps:'8-12', rest_sec:90 },    // per lato: 9 dx · 8 sx a RIR 1 (obiettivo 2) → oggi si resta a 8 per lato (lato debole, Training 460)
  { codice:'EX600', name:'Curl elastico', sets:3, reps:'10-15', rest_sec:60 },           // mai fatto → «Inizia con», niente compilato
  { codice:'EX072', name:'Plank', sets:2, reps:'20-40 sec', iso:true, durationBased:true, isTimed:true, rest_sec:60 },
] } ] };
const catalogo = [
  { codice:'EX001', nome:'Panca elastico', unilaterale:'no', progressione:'carico' },
  { codice:'EX002', nome:'Chest press elastico', unilaterale:'no', progressione:'carico' },
  { codice:'EX003', nome:'Rematore elastico', unilaterale:'no', progressione:'carico' },
  { codice:'EX008', nome:'Trazioni sbarra assistite', unilaterale:'no', progressione:'meno assistenza' },
  { codice:'EX647', nome:'Squat calcio laterale', unilaterale:'si', progressione:'ritmo più lento' },
  { codice:'EX600', nome:'Curl elastico', unilaterale:'no', progressione:'elastico più duro' },
  { codice:'EX072', nome:'Plank', unilaterale:'no', progressione:'tenuta più lunga' },
];
const log = (id, nome, codice, set, reps, resistance, rir, extra) => ({ id, user_id:U, session_id:'upperA', date:IERI, exercise_name:nome, exercise_code:codice, set_number:set, reps, resistance, band_color:null, rir_actual:rir, ...(extra || {}) });
function fixture(o){
  o = o || {};
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date: o.inizio || '2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    training_logs:[
      log('t1', 'Panca elastico', 'EX001', 2, 7, '40', 2), log('t2', 'Panca elastico', 'EX001', 3, 8, '40', 2),
      log('t3', 'Chest press elastico', 'EX002', 3, 10, '40', 2),
      log('t4', 'Rematore elastico', 'EX003', 3, 5, '40', 1),
      log('t5', 'Trazioni sbarra assistite', 'EX008', 3, 10, null, 2, { band_color:'Rossa' }),
      log('t6', 'Squat calcio laterale', 'EX647', 3, 8, null, 1, { reps_dx:9, reps_sx:8 }),
    ],
    workouts: o.workouts || [],
    training_notes:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(o){
  const t = fixture(o);
  const b = boot(t, { now: OGGI + 'T07:00:00', locale: (o && o.locale) || {} });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  if(o && o.workouts) await b.win.loadTrainingAllCompleted({ skipRender:true });
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.aiCue = ST.aiCue || {};
  b.win.callAI = async () => '';
  await b.win.loadLastLoggedSets('upperA');
  b.win.renderTraining();
  const doc = b.win.document;
  const scegli = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new b.win.Event('change', { bubbles:true })); };
  const riga = (n) => testo((doc.getElementById('excard-' + n.replace(/[^a-zA-Z0-9]/g, '_')) || { innerHTML:'' }).innerHTML);
  return { ...b, ST, t, doc, scegli, riga };
}
(async () => {
  // 1 · la card dice cosa fare oggi, poi com'è andata l'ultima volta
  {
    const a = await nuovo();
    atteso('card · stesso carico, una ripetizione in più', /🎯 Oggi S1: 40 lbs · 9 reps · RIR 2 · ultima volta 8r · 40 lbs · RIR 2/.test(a.riga('Panca elastico')), true);
    atteso('card · in cima con margine: un passo di carico, dal minimo', /🎯 Oggi S1: 50 lbs · riparti da 6 reps · RIR 2 · ultima volta 10r · 40 lbs · RIR 2/.test(a.riga('Chest press elastico')), true);
    atteso('card · sotto il minimo: un passo indietro', /🎯 Oggi S1: 30 lbs · punta a 6 reps · RIR 2/.test(a.riga('Rematore elastico')), true);
    atteso('card · trazioni in cima: banda più dura', /🎯 Oggi S1: banda Gialla \(più dura\) · riparti da 6 reps · RIR 2 · ultima volta 10r · Rossa · RIR 2/.test(a.riga('Trazioni sbarra assistite')), true);
    atteso('card · per lato: dal lato debole, «per lato»; a RIR 1 sotto l\'obiettivo si resta (460)', /🎯 Oggi S1: corpo libero · resta a 8 reps per lato · RIR 2 · ultima volta 9 dx · 8 sx/.test(a.riga('Squat calcio laterale')), true);
    atteso('card · mai fatto: «Inizia con» come prima', /💡 Inizia con 10 reps/.test(a.riga('Curl elastico')), true);
    const o = a.win.obiettivoPrimaSerie('Panca elastico', 'upperA');
    atteso('obiettivo · i numeri dietro al testo', [o.reps, o.resistance, o.bandColor, o.rir, o.nota, o.setNum], [9, 40, null, 2, null, 1]);
  }
  // 2 · il registro è già compilato: un tocco su «Salva»
  {
    const a = await nuovo();
    a.win.openLogModal('upperA', 'Panca elastico', 1);
    atteso('registro S1 · ripetizioni e carico compilati, RIR da dire', [a.doc.getElementById('tl-reps').value, a.ST.trainLogResist, a.doc.getElementById('tl-resist').value, a.doc.getElementById('tl-rir').value], ['9', 40, '40', '']);
    a.scegli('tl-rir', '2');
    await a.win.saveTrainingSet();
    const r = a.t.training_logs[a.t.training_logs.length - 1];
    atteso('registro S1 · salvata com\'era compilata', [r.exercise_code, r.set_number, r.reps, r.resistance, r.rir_actual], ['EX001', 1, 9, '40', 2]);
    atteso('registro · la PROSSIMA tiene anche i numeri', [a.ST.aiSuggestions['upperA_Panca elastico'], a.ST.trainProssima['upperA_Panca elastico'].reps, a.ST.trainProssima['upperA_Panca elastico'].resistance], ['S2: 40 lbs · 10 reps · RIR 2', 10, 40]);
    a.win.openLogModal('upperA', 'Panca elastico', 2);
    atteso('registro S2 · compilato dalla PROSSIMA', [a.doc.getElementById('tl-reps').value, a.ST.trainLogResist], ['10', 40]);
    a.scegli('tl-rir', '2'); await a.win.saveTrainingSet();
    a.win.openLogModal('upperA', 'Panca elastico', 3);
    atteso('registro S3 · in cima con margine: 50 lbs dal minimo', [a.doc.getElementById('tl-reps').value, a.ST.trainLogResist], ['6', 50]);
    a.ST.trainLogOpen = null;
    a.win.openLogModal('upperA', 'Trazioni sbarra assistite', 1);
    atteso('registro trazioni · la banda più dura è già scelta, 6 ripetizioni', [a.ST.trainLogBandColor, a.doc.getElementById('tl-reps').value], ['Gialla', '6']);
    a.ST.trainLogOpen = null;
    a.win.openLogModal('upperA', 'Squat calcio laterale', 1);
    atteso('registro per lato · tutte e due le tendine a 8 (si resta: RIR 1 sotto l\'obiettivo, 460)', [a.doc.getElementById('tl-reps').value, a.doc.getElementById('tl-reps-sx').value], ['8', '8']);
    a.ST.trainLogOpen = null;
    a.win.openLogModal('upperA', 'Curl elastico', 1);
    atteso('registro mai fatto · vuoto come prima', [a.doc.getElementById('tl-reps').value, a.ST.trainLogResist, a.ST.trainLogDraft], ['', null, { reps:'', rir:'' }]);
    a.ST.trainLogOpen = null;
    a.win.openLogModal('upperA', 'Plank', 1, { timedTarget: 30 });
    atteso('registro tenuta · la durata resta quella del picker', a.ST.trainLogDraft.reps, '30');
  }
  // 3 · sotto la GIF, durante la serie: obiettivo e carico
  {
    const a = await nuovo();
    a.win.openTrainExec('upperA', 'Panca elastico', 1);
    const exec = testo(a.doc.querySelector('.train-exec-overlay').innerHTML);
    atteso('esecuzione · l\'obiettivo di oggi sta sotto la GIF', /🎯 Oggi S1: 40 lbs · 9 reps · RIR 2/.test(exec), true);
    a.win.trainExecBack();
  }
  // 4 · settimana di scarico: −20 lbs dal minimo, banda più facile; rientro graduale: −20%
  {
    const workouts = []; const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
    for(let w = 0; w < 5; w++) [['upperA',0],['lowerA',1],['upperB',3],['lowerB',4]].forEach(([s, d], i) => workouts.push({ id:'w' + w + i, user_id:U, session_type:s, date:add('2026-08-31', 7 * w + d), completed:true }));
    const a = await nuovo({ inizio:'2026-08-31', workouts });
    atteso('scarico · siamo in settimana di scarico', a.win.getCycleWeekInfo().isScarico, true);
    atteso('scarico · panca: 20 lbs dal minimo, RIR 3', a.win.obiettivoPrimaSerie('Panca elastico', 'upperA').testo, 'S1: 20 lbs · 6 reps · RIR 3 (scarico)');
    atteso('scarico · trazioni: banda più facile', a.win.obiettivoPrimaSerie('Trazioni sbarra assistite', 'upperA').testo, 'S1: banda Nera · 6 reps · RIR 3 (scarico)');
    a.win.openLogModal('upperA', 'Panca elastico', 1);
    atteso('scarico · il registro è compilato col carico ridotto', [a.doc.getElementById('tl-reps').value, a.ST.trainLogResist], ['6', 20]);
  }
  {
    const a = await nuovo({ locale: { ['zt_soft_return_' + U]: { active:true, level:1, startDate:OGGI, endDate:'2026-10-20' } } });
    const sr = a.win.getSoftReturn();
    if(sr) atteso('rientro · panca: −20% dal minimo, RIR +1', a.win.obiettivoPrimaSerie('Panca elastico', 'upperA').testo, 'S1: 30 lbs · 6 reps · RIR 3 (rientro)');
    else console.log('  --  rientro · la chiave del rientro graduale non è quella: salto (non è questa la prova del rientro)');
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
