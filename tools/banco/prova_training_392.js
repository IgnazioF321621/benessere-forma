// Training 392 (17 novembre 2026, decisione di Ignazio): la cima allargata dopo un salto di colore fallito.
// Con l'elastico si passa al colore dopo solo con tutte le serie in cima (Training 391). Se il colore dopo è troppo duro
// (sotto il minimo) si torna a quello di prima, e lì rifare «tutte in cima» riproponeva lo stesso salto. Ora, dopo un
// salto fallito, sul colore di prima si sale oltre la cima fino alla cima allargata (12 → 15), e il salto si ripropone
// solo con tutte le serie lì. Il salto fallito si legge dallo storico, senza colonne nuove.
// Dal Training 393 (19 novembre 2026) il colore è solo dell'assistenza: l'esercizio della prova è «Piegamenti assistiti
// elastico» (scala Viola · Nera · Rossa · Gialla · Corpo libero). Nei titoli dei controlli sono rimasti i colori della
// prima stesura (rosso, nero): valgono i dati e i testi attesi.
//   node tools/banco/prova_training_392.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-11-24';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(100), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const DIP = 'Piegamenti assistiti elastico', TRAZ = 'Trazioni sbarra assistite elastico', CURL = 'Curl manubri', FORZA = 'Rematore elastico';
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Ipertrofia', rir:2, exercises:[
  { codice:'EX378', name:DIP, sets:3, reps:'8-12', rest_sec:90, eq:'elastico', progressione:'meno assistenza' },   // dal Training 393 il colore è solo dell'assistenza
  { codice:'EX505', name:TRAZ, sets:3, reps:'4-6', rest_sec:120, eq:'sbarra', progressione:'meno assistenza' },
  { codice:'EX900', name:CURL, sets:3, reps:'8-12', rest_sec:60, eq:'manubri', progressione:'carico' },
  { codice:'EX020', name:FORZA, sets:3, reps:'4-6', rest_sec:120, eq:'elastico', progressione:'elastico più duro' },
] } ] };
(async () => {
  const t = {
    profiles:[{ id:U, first_name:'X', m2_skipped:true, unit:'lbs', train_start_date:'2026-11-03', tipo_allenamento:'casa', attrezzatura:['elastico','sbarra','manubri'], note_salute:'Esperienza: avanzato' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: scheda }],
    esercizi_catalog: [], training_logs: [], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'x@y' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  W.callAI = async () => '';
  const sess = W.getTrainingSession('upperA');
  // lo storico: una lista di sedute, dalla più vecchia alla più recente; ogni seduta [ripetizioni, colore] per serie.
  // L'ultima è «l'ultima seduta» (ST.lastSessionSets), tutte insieme lo storico (ST.storiaSerie).
  const storia = (nome, ...sedute) => {
    const righe = sedute.flatMap((serie, g) => serie.map(([reps, band_color], i) => ({ reps, band_color, rir_actual:2, set_number:i + 1, date:'2026-11-' + String(3 + g).padStart(2, '0') })));
    const ultimaData = righe.length ? righe[righe.length - 1].date : null;
    ST.storiaSerie = { [nome]: righe };
    ST.lastSessionSets = { [nome]: righe.filter(l => l.date === ultimaData) };
  };
  const oggi = (nome, serie) => { ST.trainLoggedSets = {}; serie.forEach(([reps, band_color], i) => { ST.trainLoggedSets[`upperA_${nome}_${i + 1}_${OGGI}`] = { reps, band_color, resistance: band_color, rir: 2 }; }); };
  const sugg = (nome, setNum, reps, rir, bandColor, primaSerie) => { const o = W.computeNextSetSuggestion({ sessionId:'upperA', exName:nome, setNum, reps, resistance:'', rir, exData:W.findExercise(nome, 'upperA'), sess, bandColor, struttura:true, primaSerie: !!primaSerie }); return [o.testo, o.bandColor, o.reps]; };
  const R12 = [[12, 'Nera'], [12, 'Nera'], [12, 'Nera']];

  // ── 1 · senza salto fallito niente cambia (Training 391) ──
  storia(DIP, R12); oggi(DIP, []);
  atteso('1 · tutte a 12 sul rosso, nessun salto fallito: si passa al nero dal minimo', sugg(DIP, 0, 12, 2, 'Nera', true), ['S1: banda Rossa (più dura) · riparti da 8 reps · RIR 2', 'Rossa', 8]);
  atteso('1 · dentro la seduta, in cima senza salto fallito: «resta a 12»', sugg(DIP, 1, 12, 2, 'Nera'), ['S2: banda Nera · resta a 12 reps · RIR 2', 'Nera', 12]);
  storia(DIP, [[12, 'Nera'], [12, 'Nera'], [13, 'Nera']]);
  atteso('1 · una ripetizione in più per conto proprio (12 · 12 · 13) non allarga niente: il nero arriva come prima (revisione)', sugg(DIP, 0, 13, 2, 'Nera', true)[1], 'Rossa');

  // ── 2 · il salto fallito, oggi: nero sotto il minimo, si torna al rosso e lì si sale oltre la cima ──
  storia(DIP, R12); oggi(DIP, [[6, 'Rossa']]);
  atteso('2 · nero a 6 (sotto il minimo): si torna al rosso', sugg(DIP, 1, 6, 1, 'Rossa'), ['S2: banda Nera (più aiuto) · punta a 8 reps · RIR 2', 'Nera', 8]);
  oggi(DIP, [[6, 'Rossa'], [12, 'Nera']]);
  atteso('2 · sul rosso a 12 dopo il salto fallito di oggi: si sale oltre la cima, fino a 15', sugg(DIP, 2, 12, 2, 'Nera'), ['S3: banda Nera · sali a 13 reps (fino a 15) · RIR 2', 'Nera', 13]);
  oggi(DIP, []);

  // ── 3 · la seduta dopo ──
  const FALLITA = [[6, 'Rossa'], [12, 'Nera'], [13, 'Nera']];
  storia(DIP, R12, FALLITA);
  atteso('3 · prima serie: si ripete la più forte sul rosso, il nero non si ripropone', sugg(DIP, 0, 13, 2, 'Nera', true), ['S1: banda Nera · 13 reps · RIR 2', 'Nera', 13]);
  atteso('3 · dentro la seduta: si sale ancora, 14 poi 15, e a 15 si resta', [sugg(DIP, 1, 13, 2, 'Nera')[0], sugg(DIP, 2, 14, 2, 'Nera')[0], sugg(DIP, 2, 15, 2, 'Nera')[0]], ['S2: banda Nera · sali a 14 reps (fino a 15) · RIR 2', 'S3: banda Nera · sali a 15 reps (fino a 15) · RIR 2', 'S3: banda Nera · resta a 15 reps · RIR 2']);

  // ── 4 · le sedute dopo ancora: il salto fallito resta nello storico ──
  storia(DIP, R12, FALLITA, R12);
  atteso('4 · una seduta piatta dopo (12 · 12 · 12): il nero non torna subito, la cima resta 15 (revisione)', [sugg(DIP, 0, 12, 2, 'Nera', true)[1], sugg(DIP, 1, 12, 2, 'Nera')[0]], ['Nera', 'S2: banda Nera · sali a 13 reps (fino a 15) · RIR 2']);
  storia(DIP, R12, FALLITA, [[14, 'Nera'], [14, 'Nera'], [13, 'Nera']]);
  atteso('4 · 14 · 14 · 13 sul rosso: non ancora', sugg(DIP, 0, 14, 2, 'Nera', true), ['S1: banda Nera · 14 reps · RIR 2', 'Nera', 14]);
  storia(DIP, R12, FALLITA, [[15, 'Nera'], [15, 'Nera'], [14, 'Nera']]);
  atteso('4 · 15 · 15 · 14: manca una serie, non ancora', sugg(DIP, 0, 15, 2, 'Nera', true)[1], 'Nera');
  const R15 = [[15, 'Nera'], [15, 'Nera'], [15, 'Nera']];
  storia(DIP, R12, FALLITA, R15);
  atteso('4 · 15 · 15 · 15: il nero si ripropone, dal minimo', sugg(DIP, 0, 15, 2, 'Nera', true), ['S1: banda Rossa (più dura) · riparti da 8 reps · RIR 2', 'Rossa', 8]);
  oggi(DIP, [[9, 'Rossa']]);
  atteso('4 · il nero riesce: sul nero la cima torna 12', [sugg(DIP, 1, 12, 2, 'Rossa')[0], sugg(DIP, 1, 9, 2, 'Rossa')[0]], ['S2: banda Rossa · resta a 12 reps · RIR 2', 'S2: banda Rossa · 10 reps · RIR 2']);
  oggi(DIP, []);
  // il salto riuscito cancella quello fallito: tornati sul rosso per lo scarico, la cima è quella di sempre
  storia(DIP, R12, FALLITA, R15, [[9, 'Rossa'], [9, 'Rossa'], [8, 'Rossa']], [[8, 'Nera'], [8, 'Nera'], [8, 'Nera']]);
  atteso('4 · dopo un nero riuscito e uno scarico sul rosso: niente cima allargata', sugg(DIP, 1, 12, 2, 'Nera')[0], 'S2: banda Nera · resta a 12 reps · RIR 2');
  // dopo STORIA_SEDUTE sedute il salto fallito esce dallo storico che si guarda
  atteso('4 · lo storico che si guarda è di 8 sedute', W.eval('STORIA_SEDUTE'), 8);

  // ── 5 · gli altri casi ──
  storia(DIP, [[10, 'Nera'], [9, 'Nera'], [7, 'Nera']], [[8, 'Viola'], [8, 'Viola'], [8, 'Viola']]);
  atteso('5 · stanchezza (10 · 9 · 7 sul rosso) e poi scarico sul giallo: non è un salto fallito, sul giallo la cima è 12 (revisione)', sugg(DIP, 1, 12, 2, 'Viola')[0], 'S2: banda Viola · resta a 12 reps · RIR 2');
  storia(DIP, FALLITA, [[8, 'Viola'], [8, 'Viola'], [8, 'Viola']]);
  atteso('5 · nero fallito e poi scarico sul giallo: sul giallo la cima resta 12 (conta solo il colore subito dopo, revisione)', sugg(DIP, 1, 12, 2, 'Viola')[0], 'S2: banda Viola · resta a 12 reps · RIR 2');
  storia(TRAZ, [[6, 'Rossa'], [6, 'Rossa'], [6, 'Rossa']], [[3, 'Gialla'], [6, 'Rossa'], [6, 'Rossa']]);
  atteso('5 · trazioni (assistenza, 4-6): dopo la gialla fallita la cima sulla rossa è 8', [sugg(TRAZ, 1, 6, 2, 'Rossa')[0], sugg(TRAZ, 0, 6, 2, 'Rossa', true)[1]], ['S2: banda Rossa · sali a 7 reps (fino a 8) · RIR 2', 'Rossa']);
  storia(TRAZ, [[3, 'Gialla'], [6, 'Rossa'], [6, 'Rossa']], [[8, 'Rossa'], [8, 'Rossa'], [8, 'Rossa']]);
  atteso('5 · trazioni, 8 · 8 · 8 sulla rossa: si ripropone la gialla', sugg(TRAZ, 0, 8, 2, 'Rossa', true)[1], 'Gialla');
  storia(DIP, [[13, 'Corpo libero'], [13, 'Corpo libero'], [12, 'Corpo libero']]);
  atteso('5 · in cima alla scala (viola) niente cima allargata: oltre il 12 si saliva già, senza tetto', sugg(DIP, 1, 15, 2, 'Corpo libero')[0], 'S2: a corpo libero · sali a 16 reps · RIR 2');
  storia(DIP, [[8, 'Rossa'], [12, 'Nera'], [12, 'Nera']]);
  atteso('5 · la prima serie sul nero nel range (8) non è un salto fallito', sugg(DIP, 1, 12, 2, 'Nera')[2], 12);
  storia(DIP, FALLITA);
  atteso('5 · col RIR sotto l\'obiettivo non si sale nemmeno con la cima allargata («resta»)', sugg(DIP, 1, 12, 1, 'Nera')[0], 'S2: banda Nera · resta a 12 reps · RIR 2');
  ST.lastSessionSets = { [CURL]: [{ reps:14, resistance:'20', rir_actual:2, set_number:1 }] }; ST.storiaSerie = {};
  atteso('5 · i carichi in numeri restano com\'erano', W.computeNextSetSuggestion({ sessionId:'upperA', exName:CURL, setNum:1, reps:12, resistance:'20', rir:2, exData:W.findExercise(CURL, 'upperA'), sess }), 'S2: 30 lbs · riparti da 8 reps · RIR 2');

  // ── 6 · dalla lettura vera: loadLastLoggedSets riempie lo storico, obiettivoPrimaSerie lo usa ──
  const riga = (date, n, reps, band_color) => ({ id:`${date}-${n}`, user_id:U, date, session_id:'upperA', exercise_name:DIP, exercise_code:'EX378', set_number:n, reps, resistance:null, band_color, rir_actual:2 });
  t.training_logs.push(riga('2026-11-03', 1, 12, 'Nera'), riga('2026-11-03', 2, 12, 'Nera'), riga('2026-11-03', 3, 12, 'Nera'),
    riga('2026-11-10', 1, 6, 'Rossa'), riga('2026-11-10', 2, 12, 'Nera'), riga('2026-11-10', 3, 12, 'Nera'),
    riga('2026-11-17', 1, 12, 'Nera'), riga('2026-11-17', 2, 12, 'Nera'), riga('2026-11-17', 3, 12, 'Nera'));
  ST.trainLoggedSets = {};
  await W.loadLastLoggedSets('upperA');
  const o = W.obiettivoPrimaSerie(DIP, 'upperA');
  atteso('6 · lo storico letto: tre sedute del Dip, l\'ultima è quella del 17', [[...new Set(ST.storiaSerie[DIP].map(l => l.date))].sort(), ST.lastSessionSets[DIP].length], [['2026-11-03', '2026-11-10', '2026-11-17'], 3]);
  atteso('6 · obiettivo di oggi: il rosso a 12, non il nero (il salto fallito del 10 è nello storico)', [o && o.testo, o && o.bandColor], ['S1: banda Nera · 12 reps · RIR 2', 'Nera']);

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
