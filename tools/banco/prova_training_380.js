// Training 380 (16 novembre 2026, decisione di Ignazio: «si riparte col massimo di tutto»): ogni blocco parte morbido e
// sale. Il RIR della settimana del blocco è una regola sola, ZTQuadro.rirSettimana: sulla base 2 RIR 3 · 2 · 2 · 1 · 1,
// scarico 3; mai sotto 1 (mai a cedimento), salvo una base già a 0 (Pump); la settimana leggera del rientro non si somma (vale la
// più alta). La usano la PROSSIMA, l'obiettivo della prima serie, la pillola e le testate; l'anteprima del blocco nuovo
// mostra la settimana leggera (serie a ⅔) e il RIR della prima settimana. Pirsi non legge il RIR 3 della settimana 1 come
// un calo.
//   node tools/banco/prova_training_380.js
process.env.TZ = 'Europe/Rome';
const Q = require('../../shared/quadro.js');
const R = require('../../shared/coach_rules.js');
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(92), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const sett = (base, o) => [1, 2, 3, 4, 5, 6].map(w => Q.rirSettimana(w, base, o));

// 1 · la regola
atteso('1 · base 2 (Forza, o nessuna): 3 · 2 · 2 · 1 · 1, scarico 3', [sett(2), sett(null)], [[3, 2, 2, 1, 1, 3], [3, 2, 2, 1, 1, 3]]);
atteso('1 · base 1 (Ipertrofia): 2 · 1 · 1 · 1 · 1 (mai sotto 1, mai a cedimento)', sett(1), [2, 1, 1, 1, 1, 3]);
atteso('1 · base 0 (Pump): 1 · 0 · 0 · 0 · 0, la base non si alza', sett(0), [1, 0, 0, 0, 0, 3]);
atteso('1 · settimana leggera + settimana 1: il massimo, non la somma (base 2 → 3, non 4)', [Q.rirSettimana(1, 2, { leggera: true }), Q.rirSettimana(1, 1, { leggera: true })], [3, 2]);
atteso('1 · settimana leggera a metà blocco: base +1 (base 2 settimana 4 → 3)', Q.rirSettimana(4, 2, { leggera: true }), 3);
atteso('1 · mai oltre 4', Q.rirSettimana(1, 4, { leggera: true }), 4);

// 2 · nell'app
(async () => {
  const U = 'u1', OGGI = '2026-11-17';
  const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
    { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10', rest_sec:120 },
    { codice:'EX060', name:'Curl elastico', sets:3, reps:'10-15', rest_sec:60, iso:true, rir:1 },
  ] }, { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, exercises:[
    { codice:'EX020', name:'Rematore elastico', sets:3, reps:'8-12', rest_sec:90 },
  ] } ] };
  const t0 = {
    profiles:[{ id:U, first_name:'X', m2_skipped:true, unit:'lbs', train_start_date:'2026-11-17', tipo_allenamento:'casa', attrezzatura:['elastico'], note_salute:'Esperienza: avanzato' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: [], training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t0, { now: OGGI + 'T07:00:00', rampaRir: true });
  await b.avviato;
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'x@y' }; ST.profile = t0.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  W.callAI = async () => '';
  const sess = W.getTrainingSession('upperA'), sessB = W.getTrainingSession('upperB');
  const [panca, curl] = sess.exercises;
  let settimana = 1, leggera = null;
  W.eval('getCycleWeekInfo = () => ({ weekNum: window.__w, isScarico: window.__w === 6, workCount: 0, workPerGiro: 4, deloadFrom: null })');
  W.eval('getSoftReturn = () => window.__leggera');
  const metti = (w, l) => { W.__w = w; W.__leggera = l || null; };
  const prossima = (ex, s, reps, rir) => W.computeNextSetSuggestion({ sessionId: s.id, exName: ex.name, setNum: 1, reps, resistance: 30, rir, exData: ex, sess: s, struttura: true });
  metti(1);
  atteso('2 · settimana 1: la PROSSIMA chiede RIR 3 (Forza), 2 (Ipertrofia), 2 al curl con RIR 1 suo', [prossima(panca, sess, 8, 3).rir, prossima(sessB.exercises[0], sessB, 10, 2).rir, prossima(curl, sess, 12, 2).rir], [3, 2, 2]);
  atteso('2 · settimana 1: a RIR 2 in cima alle ripetizioni non si sale (il RIR chiesto è 3)', /resta/.test(prossima(panca, sess, 10, 2).testo), true);
  metti(4);
  atteso('2 · settimana 4: RIR 1 (Forza), 1 (Ipertrofia), 1 al curl (mai a cedimento)', [prossima(panca, sess, 8, 1).rir, prossima(sessB.exercises[0], sessB, 10, 1).rir, prossima(curl, sess, 12, 1).rir], [1, 1, 1]);
  metti(6);
  atteso('2 · scarico: RIR 3', prossima(panca, sess, 8, 3).rir, 3);
  metti(1, { active: true, leggera: true, finoA: '2026-11-23' });
  atteso('2 · settimana 1 + settimana leggera: 3, non 4', prossima(panca, sess, 8, 3).rir, 3);
  // l'obiettivo della prima serie di oggi (Training 040/440) passa dalla stessa regola
  ST.lastLoggedSets = { 'Panca elastico': { reps: 8, resistance: '30', rir_actual: 2, date: '2026-11-10' } };
  ST.lastSessionSets = { 'Panca elastico': [ST.lastLoggedSets['Panca elastico']] };
  metti(1);
  const o1 = W.obiettivoPrimaSerie('Panca elastico', 'upperA');
  metti(4);
  const o4 = W.obiettivoPrimaSerie('Panca elastico', 'upperA');
  atteso('2 · obiettivo della prima serie: RIR 3 in settimana 1, 1 in settimana 4', [o1 && o1.rir, o4 && o4.rir], [3, 1]);
  ST.lastLoggedSets = {}; ST.lastSessionSets = {};
  metti(1);
  atteso('2 · le testate: RIR della seduta di oggi (Forza 3, Ipertrofia 2), recupero niente', [W.rirSedutaOggi(sess), W.rirSedutaOggi(sessB), W.rirSedutaOggi({ type:'Recupero', rir:null })], [3, 2, null]);
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  W.renderTraining();
  const pag = W.document.getElementById('page-training').textContent.replace(/\s+/g, ' ');
  atteso('2 · la card della seduta: «FORZA · RIR 3» e la pillola del curl RIR 2', [pag.includes('FORZA · RIR 3'), pag.includes('RIR 2')], [true, true]);

  // 3 · l'anteprima del blocco nuovo
  W.eval('rientroDiOggi = () => window.__rl');
  W.__rl = { leggera: true, finoA: '2026-11-23', prima: '2026-10-30' };
  const nuova = { sessioni: [
    { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[ { codice:'EX900', name:'Esercizio nuovo', sets:3, reps:'6-10' } ] },
    { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, exercises:[ { codice:'EX901', name:'Altro nuovo', sets:4, reps:'8-12' } ] } ], _pools: { poolPrincipali: [] } };
  ST.bloccoNuovo = { scheda: nuova, diff: W._diffBloccoNuovo(nuova, ST.schedaAttiva.scheda), partenze: {} };
  W.renderBloccoNuovoSheet();
  const anteprima = () => (W.document.getElementById('blocco-nuovo-sheet') || {}).textContent.replace(/\s+/g, ' ');
  const a1 = anteprima();
  atteso('3 · settimana leggera: la riga con la data e le serie a ⅔ (3 → 2, 4 → 3)', [/PRIMA SETTIMANA LEGGERA FINO AL .*23/i.test(a1), a1.includes('2 × 6-10'), a1.includes('3 × 8-12')], [true, true, true]);
  atteso('3 · il RIR della prima settimana per seduta: Forza 3, Ipertrofia 2 (leggera: il massimo)', [a1.includes('FORZA · RIR 3 LA PRIMA SETTIMANA'), a1.includes('IPERTROFIA · RIR 2 LA PRIMA SETTIMANA')], [true, true]);
  atteso('3 · la rampa detta in una riga', a1.includes('RIR 3 la prima settimana, poi 2 · 2 · 1 · 1'), true);
  W.__rl = null;
  W.renderBloccoNuovoSheet();
  const a2 = anteprima();
  atteso('3 · senza settimana leggera: niente riga, serie intere', [/SETTIMANA LEGGERA/.test(a2), a2.includes('3 × 6-10'), a2.includes('4 × 8-12')], [false, true, true]);

  // 3b · la settimana leggera promessa dall'anteprima resta dopo «Accetto» (revisione): stop di 25 giorni, una seduta nel
  // blocco di prima al rientro (lunedì 10), blocco nuovo accettato mercoledì 12. Con la sola ultima seduta prima del
  // blocco la regola vedeva uno stop di un giorno.
  {
    const t1 = JSON.parse(JSON.stringify(t0));
    t1.profiles[0].train_start_date = '2026-11-12';
    t1.workouts = [ { id:'w1', user_id:U, date:'2026-10-14', session_type:'lowerB', completed:true }, { id:'w2', user_id:U, date:'2026-10-15', session_type:'upperA', completed:true },
      { id:'w3', user_id:U, date:'2026-11-10', session_type:'upperB', completed:true } ];
    const b1 = boot(t1, { now: '2026-11-12T07:00:00', rampaRir: true });
    await b1.avviato;
    const S1 = b1.win.eval('ST');
    S1.user = { id:U, email:'x@y' }; S1.profile = t1.profiles[0]; S1.catalog = []; S1.activeDay = '2026-11-12';
    await b1.win.loadActiveScheda();
    await b1.win.loadTrainingAllCompleted({ skipRender: true });
    const r1 = b1.win.rientroDiOggi();
    atteso('3b · dopo «Accetto» la settimana leggera resta, fino al 16 (ripresa il 10)', [!!(r1 && r1.leggera), r1 && r1.finoA], [true, '2026-11-16']);
  }
  // 4 · Pirsi: il RIR alto della settimana 1 non è un calo; il RIR 1 delle settimane 4-5 non anticipa lo scarico
  const WS = '2026-11-16';
  const add = (key, d) => { const x = new Date(key + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  const quadro = (k, tr) => ({
    weight: { weight_avg: 75, weight_n: 4, weight_last: 75, weight_target: 75 },
    nutrition: { kcal_target: 2200, protein_target: 150, kcal_avg: 2150, protein_avg: 150, days_logged: 7, logged_dates: [0,1,2,3,4,5,6].map(i => add(add(WS, -7 * k), i)), adherence_kcal: 0.86, days_partial: 0, partial: false, days_under_75: 0 },
    training: { sessions_planned: 4, sessions_done: 4, sessions_missed: 0, recovery_done: 1, block_week: 2, is_deload: false, volume_sets: 60, avg_rir: 1.5, injury_days: 0, injury_active: false, pause_days: 0, feel: null, ...tr },
    body: { last_check_date: '2026-11-10', days_since_check: 7, check_due: false, last_measurements: null, prev_check_date: null, ai_overall: null, ai_confidence: null, ai_check_date: null, waist_avg: null, waist_n: 0, bf_avg: null, bf_n: 0 },
    blood: { last_test_date: null, days_since_test: null, test_count: 0 },
    meta: { version: 2, week_start: add(WS, -7 * k), week_end: add(add(WS, -7 * k), 6), is_closed: true, errors: [] },
  });
  const prof = { obiettivo: 'ricomposizione', target_kcal: 2200, target_protein: 150, giorni_allenamento: 4, train_start_date: '2026-11-17' };
  const kinds = (pic, hist) => R.buildProposals(pic, hist, prof).map(p => p.kind);
  const p1 = kinds(quadro(0, { block_week: 1, avg_rir: 3 }), [quadro(1, { block_week: 6, is_deload: true, avg_rir: 3 }), quadro(2, { block_week: 5, avg_rir: 1 })]);
  atteso('4 · settimana 1 a RIR 3: nessuna proposta sull\'allenamento', p1.filter(k => /deload|giorni|training/.test(k)), []);
  const p5 = kinds(quadro(0, { block_week: 5, avg_rir: 1 }), [quadro(1, { block_week: 4, avg_rir: 1 }), quadro(2, { block_week: 3, avg_rir: 1.8 })]);
  atteso('4 · settimane 4-5 come da rampa (RIR medio 1): niente scarico anticipato', p5.includes('deload'), false);
  const p0 = kinds(quadro(0, { block_week: 5, avg_rir: 0.3 }), [quadro(1, { block_week: 4, avg_rir: 0.3 }), quadro(2, { block_week: 3, avg_rir: 1.8 })]);
  atteso('4 · a cedimento davvero due settimane (0,3): lo scarico anticipato resta', p0.includes('deload'), true);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
