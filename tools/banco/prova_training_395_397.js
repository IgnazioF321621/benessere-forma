// Training 395 · 396 · 397 (19 novembre 2026, tre feedback di Ignazio dalla seduta).
//   395 · nel recupero «Salta» e «riduci» stanno sulla stessa riga, uguali fra le serie e fra due esercizi, a sinistra
//         dell'insetto «Invia Feedback» (che copriva «riduci»).
//   396 · il menu «⋯» della card si chiude: un altro tocco sui puntini, la riga «Chiudi», un tocco fuori.
//   397 · negli esercizi a tempo (attivazione, riscaldamento) la GIF non si ridisegna a ogni secondo; il riquadro non si
//         chiude a metà; alla fine prima suona il bip, poi si chiude.
//   node tools/banco/prova_training_395_397.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-11-19';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(100), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const dormi = (ms) => new Promise(r => setTimeout(r, ms));
const APO = "Hip thrust all'indietro";
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Ipertrofia', rir:2, exercises:[
  { codice:'EX900', name:'Curl manubri', sets:3, reps:'8-12', rest_sec:60, eq:'manubri', progressione:'carico' },
  { codice:'EX901', name:APO, sets:3, reps:'8-12', rest_sec:60, eq:'corpo libero', progressione:'più ripetizioni' },
], warmup:[ { codice:'EX605', name:'Corsa sul posto', sets:2, reps:'15-20', warmup:true }, { codice:'EX717', name:'Estensione spalla elastico', sets:2, reps:'15-20', warmup:true } ] } ] };
(async () => {
  const t = {
    profiles:[{ id:U, first_name:'X', m2_skipped:true, unit:'lbs', train_start_date:'2026-11-03', tipo_allenamento:'casa', attrezzatura:['elastico','manubri'], note_salute:'Esperienza: avanzato' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda }],
    esercizi_catalog: [], training_logs: [], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t, { now: OGGI + 'T07:00:00', locale: { zt_v5: '1' } });
  await b.avviato;
  const W = b.win, ST = W.eval('ST'), doc = W.document;
  ST.user = { id:U, email:'x@y' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  W.callAI = async () => '';
  W.fetchExerciseMedia = async (nome, codice) => ({ status:'cached', cached_url:'https://esempio.test/' + (codice || 'x') + '.gif' });
  let stop = 0;
  W.eval('var __stop = 0; const __vecchioStop = playStopBeep; playStopBeep = function(){ __stop++; };');
  const stopSuonati = () => W.eval('__stop');
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  W.renderTraining();

  // ── 395 · «Salta» e «riduci» nel recupero ──
  const tasti = () => [...doc.querySelectorAll('.rest-hero-tasti button')].map(x => x.textContent.trim());
  W.startTrainingCountdown(90, 'Curl manubri', 'upperA');
  W.renderTraining();
  atteso('395 · recupero fra le serie: «Salta» e «riduci» nella stessa riga', tasti(), ['Salta ⏭', '⌄ riduci']);
  W.skipCountdown();
  W.startTrainingCountdown(90, APO, 'upperA', { traEsercizi:true, daEx:'Curl manubri' });
  W.renderTraining();
  atteso('395 · recupero fra due esercizi («Prossimo esercizio»): uguale', [tasti(), /Prossimo esercizio/.test(doc.querySelector('.rest-hero-cd-label').textContent)], [['Salta ⏭', '⌄ riduci'], true]);
  doc.querySelector('.rest-hero-skip').click();
  atteso('395 · «Salta» chiude il recupero', [!!ST.trainCountdown, !!doc.querySelector('.rest-modal-overlay')], [false, false]);

  // ── 396 · il menu «⋯» ──
  const menu = () => !!doc.querySelector('.ex5-menu');
  const puntini = (nome) => [...doc.querySelectorAll('.ex5-piu')].find(x => x.dataset.ex === nome);
  puntini(APO).click();
  atteso('396 · il tocco sui puntini apre il menu, anche con un apostrofo nel nome', [menu(), ST.ex5Menu], [true, APO]);
  puntini(APO).click();
  atteso('396 · un altro tocco sui puntini lo chiude', [menu(), ST.ex5Menu], [false, null]);
  puntini(APO).click();
  doc.querySelector('.ex5-menu-chiudi').click();
  atteso('396 · la riga «Chiudi» lo chiude', [menu(), ST.ex5Menu], [false, null]);
  puntini(APO).click();
  doc.querySelector('.ex5-menu').dispatchEvent(new W.MouseEvent('click', { bubbles:true }));
  atteso('396 · un tocco dentro il menu non lo chiude', menu(), true);
  doc.body.dispatchEvent(new W.MouseEvent('click', { bubbles:true }));
  atteso('396 · un tocco fuori lo chiude', [menu(), ST.ex5Menu], [false, null]);

  // ── 397 · attivazione: la GIF resta, il riquadro non si chiude a metà, prima il bip poi la chiusura ──
  ST.attivazioneGif = { 'slug:vacuum-addominale': { url:'https://esempio.test/vacuum.gif', status:'cached' } };
  ST.trainActivation = [true, true, true];   // le tre voci già spuntate a mano: prima il riquadro si chiudeva a metà
  ST.trainActivationCollapsed = false;
  W.renderTraining();
  W.activationFlowStart();
  const f = ST.trainActivationFlow;
  const scade = () => { f.endTime = W.Date.now() - 100; f.remaining = 1; W._activationFlowTick(); };
  scade();
  atteso('397 · finita la prima voce con le tre già spuntate: il riquadro resta aperto sul Vacuum', [ST.trainActivationCollapsed, f.active, f.currentIdx, f.running], [false, true, 1, true]);
  const img = doc.querySelector('.att-gif');
  atteso('397 · al Vacuum la GIF grande c\'è', img && img.getAttribute('src'), 'https://esempio.test/vacuum.gif');
  f.endTime = W.Date.now() + 100 * 1000; f.remaining = 101; W._activationFlowTick();
  f.endTime = W.Date.now() + 99 * 1000; W._activationFlowTick();
  atteso('397 · due secondi dopo l\'<img> è lo stesso nodo (non ridisegnato) e il tempo è aggiornato', [doc.querySelector('.att-gif') === img, doc.getElementById('att-tempo').textContent], [true, '01:39']);
  scade();   // fine Vacuum → Cat-Cow
  const primaStop = stopSuonati();
  scade();   // fine dell'ultima voce
  atteso('397 · a tempo scaduto: il bip di fine è suonato e il riquadro è ancora aperto', [stopSuonati() - primaStop, ST.trainActivationCollapsed, f.active, f.finendo, !!doc.getElementById('att-tempo')], [1, false, true, true, true]);
  W.activationFlowResume(); W.activationFlowSkip();
  atteso('397 · mentre aspetta di chiudersi i tasti non fanno ripartire niente', [f.running, f.currentIdx], [false, 2]);
  await dormi(1400);
  atteso('397 · poi si chiude', [ST.trainActivationCollapsed, f.active, f.finendo], [true, false, false]);

  // ── 397 · riscaldamento specifico ──
  ST.trainWarmupCollapsed = false; ST.attivazioneGif = { EX605: { url:'https://esempio.test/EX605.gif', status:'cached' }, EX717: { url:'https://esempio.test/EX717.gif', status:'cached' } };
  W.renderTraining();
  W.warmupFlowStart();
  const w = ST.trainWarmupFlow;
  W.renderTraining();
  const imgW = doc.querySelector('.warm-gif');
  w.endTime = W.Date.now() + 40 * 1000; w.remaining = 41; W._warmupFlowTick();
  w.endTime = W.Date.now() + 4 * 1000; W._warmupFlowTick();
  atteso('397 · riscaldamento: l\'<img> resta lo stesso nodo, il tempo si aggiorna (e negli ultimi 5 secondi cambia colore)', [doc.querySelector('.warm-gif') === imgW, doc.getElementById('warm-tempo').textContent, /184, ?76, ?42|B84C2A/i.test(doc.getElementById('warm-tempo').style.color)], [true, '00:04', true]);
  const scadeW = () => { w.endTime = W.Date.now() - 100; w.remaining = 1; W._warmupFlowTick(); };
  scadeW();   // fine prima voce → cambio posizione
  scadeW();   // fine cambio → seconda voce
  const primaStopW = stopSuonati();
  scadeW();   // fine dell'ultima voce
  atteso('397 · riscaldamento, a tempo scaduto: bip di fine suonato, riquadro ancora aperto', [stopSuonati() - primaStopW, ST.trainWarmupFlow === w, w.finendo, ST.trainWarmupCollapsed], [1, true, true, false]);
  await dormi(1400);
  atteso('397 · riscaldamento: poi si chiude', [ST.trainWarmupFlow, ST.trainWarmupCollapsed], [null, true]);

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
