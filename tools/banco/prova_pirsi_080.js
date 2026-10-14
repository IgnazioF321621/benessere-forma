// Pirsi 080 — regole del lunedì che incrociano cibo, allenamento e corpo (le quattro scelte da Ignazio il 14 ottobre 2026).
//   1. settimana di scarico: le calorie non si toccano · 2. infortunio: nessun taglio · 3. fatica alta (sedute «dure» o RIR
//   a cedimento) con calorie sotto l'obiettivo: «prima mangia», niente taglio e niente scarico · 4. peso fermo ma vita o
//   grasso % in calo: ricomposizione, non taglio. Più: la pesata scatta sotto 3 come dice il titolo, blocca sotto 2.
//   Il quadro (shared/quadro.js) porta feel (sensazione delle sedute, Training 060) e vita/grasso medi da body_logs.
//   node tools/banco/prova_pirsi_080.js
const R = require('../../shared/coach_rules.js');
const Q = require('../../shared/quadro.js');
let ko = 0, n = 0;
const atteso = (nome, got, exp) => {
  n++;
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(70), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const WS = '2026-10-05';
const add = (key, d) => { const x = new Date(key + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
function quadro(k, o = {}){
  const ws = add(WS, -7 * k);
  const all = [0,1,2,3,4,5,6].map(i => add(ws, i));
  return {
    weight: { weight_avg: 75, weight_n: 4, weight_last: 75, weight_target: 70, ...(o.weight || {}) },
    nutrition: { kcal_target: 2200, protein_target: 150, kcal_avg: 2150, protein_avg: 150, days_logged: 7, logged_dates: all, adherence_kcal: 0.86, days_partial: 0, partial: false, days_under_75: 0, ...(o.nutrition || {}) },
    training: { sessions_planned: 4, sessions_done: 4, sessions_missed: 0, recovery_done: 1, block_week: 2, is_deload: false, volume_sets: 60, avg_rir: 1.5, injury_days: 0, injury_active: false, pause_days: 0, feel: null, ...(o.training || {}) },
    body: { last_check_date: '2026-09-10', days_since_check: 30, check_due: false, last_measurements: null, prev_check_date: null, ai_overall: null, ai_confidence: null, ai_check_date: null, waist_avg: null, waist_n: 0, bf_avg: null, bf_n: 0, ...(o.body || {}) },
    blood: { last_test_date: '2026-06-01', days_since_test: 126, test_count: 2 },
    meta: { version: 2, week_start: ws, week_end: add(ws, 6), is_closed: true, errors: [] },
  };
}
// pesi[0] = settimana chiusa; per(k) sovrascrive per settimana
function storia(pesi, per = () => ({})){
  const qs = pesi.map((w, k) => { const x = per(k); return quadro(k, { ...x, weight: { weight_avg: w, weight_last: w, ...(x.weight || {}) } }); });
  return { pic: qs[0], hist: qs.slice(1) };
}
const profilo = (o = {}) => ({ obiettivo: 'dimagrimento', goal_weight_kg: 70, target_kcal: 2200, target_protein: 150, giorni_allenamento: 4, train_start_date: '2026-08-10', ...o });
const kinds = (ps) => ps.map(p => p.kind);
const run = (s, prof, opts) => R.buildProposals(s.pic, s.hist, prof || profilo(), opts);
const titolo = (ps, kind) => { const p = ps.find(x => x.kind === kind); return p ? p.title : null; };
const FERMO = [75.0, 75.1, 75.0, 75.1, 75.0];       // dimagrire, peso fermo da 2 settimane, aderenza alta → senza contesto: −150 kcal

// 0. il riferimento: senza contesto, peso fermo → taglio di 150
let p = run(storia(FERMO));
atteso('riferimento · peso fermo, dimagrire: −150 kcal', [kinds(p), titolo(p, 'kcal')], [['kcal'], 'Da 2.200 a 2.050 kcal al giorno']);
atteso('versione delle regole', p[0].evidence.rules_version, '2026-10-14');

// 1. settimana di scarico: le calorie non si toccano (né giù né su)
p = run(storia(FERMO, k => k === 0 ? { training: { is_deload: true, block_week: 6 } } : {}));
atteso('1 scarico · niente taglio, un keep che lo dice', [kinds(p).includes('kcal'), titolo(p, 'keep'), /scarico/.test(p.find(x => x.kind === 'keep').reason)], [false, 'Non cambio le calorie', true]);
p = run(storia([73.0, 73.0, 73.0, 73.0, 73.0], k => k === 0 ? { training: { is_deload: true, block_week: 6 } } : {}), profilo({ obiettivo: "ipertrofia" }));
atteso('1 scarico · nemmeno su (massa, peso che non sale)', [kinds(p).includes('kcal'), p.find(x => x.kind === 'keep').evidence.dati.contesto.scarico], [false, true]);

// 2. infortunio: nessun taglio; un'aggiunta sì
p = run(storia(FERMO, k => k === 0 ? { training: { injury_active: true, injury_days: 2 } } : {}));
atteso('2 infortunio · niente taglio', [kinds(p).includes('kcal'), /infortunio/.test(p.find(x => x.kind === 'keep').reason)], [false, true]);
p = run(storia([73.0, 73.8, 74.6, 75.4, 76.0], k => k === 0 ? { training: { injury_active: true, injury_days: 2 } } : {}));
atteso('2 infortunio · perdi troppo in fretta: +100 passa lo stesso', titolo(p, 'kcal'), 'Da 2.200 a 2.300 kcal al giorno');

// 3. fatica alta e calorie sotto l'obiettivo: prima mangia, niente taglio, niente scarico
const dure = { feel: { facile: 0, giusta: 1, dura: 3, n: 4 } };
p = run(storia(FERMO, k => k === 0 ? { training: dure, nutrition: { kcal_avg: 1900 } } : {}));
atteso('3 sedute dure + 1900 su 2200 · eat_first, niente taglio', [kinds(p), /3 su 4 dette «dure»/.test(p.find(x => x.kind === 'eat_first').reason)], [['keep', 'eat_first'], true]);
atteso('3 · i numeri della proposta', p.find(x => x.kind === 'eat_first').evidence.numeri.map(r => r.label), ['Sedute dure', 'RIR medio', 'Kcal medie']);
p = run(storia(FERMO, k => ({ training: { avg_rir: 0.3, ...(k === 0 ? {} : {}) }, nutrition: k === 0 ? { kcal_avg: 1900 } : {} })));
atteso('3 RIR a cedimento 2 sett. + poche calorie · eat_first, NIENTE scarico', [kinds(p).includes('eat_first'), kinds(p).includes('deload')], [true, false]);
p = run(storia(FERMO, k => ({ training: { avg_rir: 0.3 } })));
atteso('3 RIR a cedimento ma calorie a posto · lo scarico resta', [kinds(p).includes('eat_first'), kinds(p).includes('deload')], [false, true]);
p = run(storia(FERMO, k => k === 0 ? { training: { feel: { facile: 2, giusta: 1, dura: 1, n: 4 } }, nutrition: { kcal_avg: 1900 } } : {}));
atteso('3 una seduta dura su 4 · non è fatica: taglio normale', kinds(p), ['kcal']);
p = run(storia(FERMO, k => k === 0 ? { training: dure, nutrition: { kcal_avg: 1900, days_logged: 3, logged_dates: [WS, add(WS, 1), add(WS, 2)] } } : {}));
atteso('3 con 3 giorni registrati · le calorie «poche» non contano (dati sporchi)', kinds(p).includes('eat_first'), false);

// 4. peso fermo ma vita o grasso in calo: ricomposizione, non taglio
const vita = (k) => ({ body: { waist_avg: [86, 86.5, 87.5, 88, 88][k], waist_n: 2 } });
p = run(storia(FERMO, vita));
atteso('4 vita −1,5 cm in 2 sett. · non taglio', [kinds(p), /stai ricomponendo/.test(p[0].reason), p[0].evidence.dati.contesto.calo_vita], [['keep'], true, -1.5]);
p = run(storia(FERMO, k => ({ body: { bf_avg: [14, 14.2, 15, 15, 15][k], bf_n: 3 } })));
atteso('4 grasso −0,9 punti · non taglio', [kinds(p), /il grasso scende/.test(p[0].reason)], [['keep'], true]);
p = run(storia(FERMO, k => ({ body: { waist_avg: [87.6, 87.8, 88, 88, 88][k], waist_n: 2 } })));
atteso('4 vita −0,3 cm · non basta: taglio normale', kinds(p), ['kcal']);
p = run(storia(FERMO, k => k === 0 ? { body: { last_check_date: add(WS, 5), days_since_check: 1, last_measurements: { waist_cm: { value: 86, delta: -2 } } } } : {}));
atteso('4 vita al check −2 cm nella settimana · non taglio', [kinds(p), /la vita al check scende/.test(p[0].reason)], [['keep'], true]);
p = run(storia([76.0, 75.6, 75.0, 74.6, 74.0], vita));
atteso('4 peso che SALE con vita in calo · dimagrire: non taglio lo stesso (ricomposizione)', kinds(p), ['keep']);
p = run(storia([73.0, 73.8, 74.6, 75.4, 76.0], vita));
atteso('4 perdi troppo in fretta · +100 passa (è un\'aggiunta)', titolo(p, 'kcal'), 'Da 2.200 a 2.300 kcal al giorno');

// 5. pesate: 2 → si ricorda ma le calorie si decidono; 1 → blocca
p = run(storia(FERMO, k => k === 0 ? { weight: { weight_n: 2 } } : {}));
atteso('5 due pesate · weigh_in E la correzione', [kinds(p), /ne ho viste due/.test(p[0].reason)], [['weigh_in', 'kcal'], true]);
p = run(storia(FERMO, k => k === 0 ? { weight: { weight_n: 1 } } : {}));
atteso('5 una pesata · solo weigh_in', [kinds(p), /senza pesate non posso guidarti/.test(p[0].reason)], [['weigh_in'], true]);

// 6. il quadro: feel dalle sedute, vita e grasso medi da body_logs
const u = 'u1', today = add(WS, 8);
const raw = {
  errors: [],
  weightLogs: [0,2,4].map(i => ({ date: add(WS, i), weight_kg: 75 })), bodyLogs: [ { date: add(WS, 1), weight_kg: null, waist_cm: 87, bf_pct: 14.5 }, { date: add(WS, 4), waist_cm: 86, bf_pct: 14 }, { date: add(WS, -3), waist_cm: 90, bf_pct: 16 } ],
  measurements: [], checks: [], meals: [], suppLogs: [], supps: [], catalog: [], blood: [], readings: [],
  sets: [ { date: add(WS, 0), session_id: 'upperA', rir_actual: 1 } ],
  workouts: [ { date: add(WS, 0), session_type: 'upperA', completed: true, sensazione: 'dura' }, { date: add(WS, 2), session_type: 'lowerA', completed: true, sensazione: 'dura' },
              { date: add(WS, 4), session_type: 'upperB', completed: true, sensazione: 'giusta' }, { date: add(WS, 5), session_type: 'recovery', completed: true, sensazione: 'facile' },
              { date: add(WS, 6), session_type: 'lowerB', completed: true, sensazione: null } ],
};
const pic = Q.computeWeeklyPicture(raw, WS, { today, nowTs: new Date(today + 'T09:00:00').getTime(), profile: { giorni_allenamento: 4, train_start_date: '2026-08-10' }, workPerGiro: 4 });
atteso('quadro · feel: 2 dure, 1 giusta, i recuperi e le sedute senza risposta non contano', pic.training.feel, { facile: 0, giusta: 1, dura: 2, n: 3 });
atteso('quadro · vita e grasso medi della settimana (non quelli di prima)', [pic.body.waist_avg, pic.body.waist_n, pic.body.bf_avg, pic.body.bf_n], [86.5, 2, 14.3, 2]);
atteso('quadro · lettura: workouts chiede sensazione, body_logs vita e grasso', [Q.fetchSpec(u, WS, null).workouts.select, Q.fetchSpec(u, WS, null).bodyLogs.select], ['date, session_type, completed, sensazione', 'date, weight_kg, waist_cm, bf_pct']);
const pic2 = Q.computeWeeklyPicture({ ...raw, workouts: raw.workouts.map(w => ({ ...w, sensazione: null })), bodyLogs: [] }, WS, { today, profile: { giorni_allenamento: 4, train_start_date: '2026-08-10' }, workPerGiro: 4 });
atteso('quadro · senza risposte e senza metro: feel null, vita e grasso nulli', [pic2.training.feel, pic2.body.waist_avg, pic2.body.waist_n, pic2.body.bf_avg], [null, null, 0, null]);
// le regole col quadro vero: 2 dure su 3 e calorie sotto → eat_first
const nutrSotto = { nutrition: { kcal_avg: 1900 } };
p = R.buildProposals({ ...pic, nutrition: quadro(0, nutrSotto).nutrition, weight: quadro(0).weight }, storia(FERMO).hist, profilo());
atteso('quadro + regole · dal feel del quadro nasce eat_first', kinds(p).includes('eat_first'), true);

console.log(ko ? `\nKO: ${ko} su ${n}` : `\ntutto OK (${n} controlli)`);
process.exit(ko ? 1 : 0);
