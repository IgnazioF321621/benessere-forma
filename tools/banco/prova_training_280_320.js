// Ondata 4, Sessione H (Training, 13 ottobre 2026): le due colonne nuove del catalogo arrivano in seduta.
//   280 · negli esercizi a un lato per volta (`unilaterale = si`) la serie chiede due numeri, destro e
//         sinistro; in training_logs vanno reps_dx e reps_sx e in `reps` resta il lato più debole;
//         pillole, APPENA FATTA, «Ultima volta» e il dettaglio del giorno li mostrano «8 dx · 7 sx».
//   320 · in cima alle ripetizioni il coach nomina la via di `progressione` dell'esercizio (ritmo più
//         lento, più ripetizioni, carico in mano, …) invece di «aumenta il carico».
//   Il generatore legge `unilaterale` dal catalogo al posto della lista fissa e porta le due colonne nel jsonb.
//   node tools/banco/prova_training_280_320.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13', IERI = '2026-10-10';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Scheda «di prima» (generata prima del 13 ottobre: niente unilaterale/progressione nel jsonb) più due
// esercizi «nuovi» che le colonne le portano già nel jsonb (EX500, EX501).
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, rest:'3 min', exercises:[
  { codice:'EX001', name:'Panca elastico', sets:2, reps:'6-10', rest_sec:120 },
  { codice:'EX647', name:'Squat calcio laterale', sets:2, reps:'8-12', rest_sec:90 },
  { codice:'EX300', name:'Affondi', sets:2, reps:'8-12 per lato', rest_sec:90 },
  { codice:'EX072', name:'Plank', sets:2, reps:'20-40 sec', iso:true, durationBased:true, isTimed:true, rest_sec:60 },
  { codice:'EX500', name:'Step-up alto', sets:2, reps:'8-12', unilaterale:'si', progressione:'carico in mano', rest_sec:90 },
  { codice:'EX501', name:'Curl elastico', sets:2, reps:'10-15', unilaterale:'no', progressione:'elastico più duro', rest_sec:60 },
  { codice:'EX600', name:'Rematore elastico', sets:2, reps:'6-10', rest_sec:90 },
] } ] };
const catalogo = [
  { codice:'EX001', nome:'Panca elastico', unilaterale:'no', progressione:'carico' },
  { codice:'EX647', nome:'Squat calcio laterale', unilaterale:'si', progressione:'ritmo più lento' },
  { codice:'EX300', nome:'Affondi', unilaterale:'si', progressione:'più ripetizioni' },
  { codice:'EX072', nome:'Plank', unilaterale:'no', progressione:'tenuta più lunga' },
  { codice:'EX500', nome:'Step-up alto', unilaterale:'si', progressione:'carico in mano' },
  { codice:'EX501', nome:'Curl elastico', unilaterale:'no', progressione:'elastico più duro' },
  { codice:'EX600', nome:'Rematore elastico' },                       // riga senza le colonne (come prima del sync)
];
function fixture(o){
  o = o || {};
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    training_logs: o.training_logs || [
      // l'ultima volta dello squat calcio laterale: 9 a destra, 7 a sinistra (in reps il più debole)
      { id:'t1', user_id:U, session_id:'upperA', date:IERI, exercise_name:'Squat calcio laterale', exercise_code:'EX647', set_number:2, reps:7, reps_dx:9, reps_sx:7, resistance:null, band_color:null, rir_actual:1 },
      { id:'t2', user_id:U, session_id:'upperA', date:IERI, exercise_name:'Panca elastico', exercise_code:'EX001', set_number:2, reps:8, resistance:'20', band_color:null, rir_actual:2 },
    ],
    training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(o){
  const t = fixture(o);
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  b.win.callAI = async () => '';
  b.win.renderTraining();
  const doc = b.win.document;
  const scegli = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new b.win.Event('change', { bubbles:true })); };
  const righe = () => t.training_logs;
  return { ...b, ST, t, doc, scegli, righe };
}
(async () => {
  // 0 · il catalogo arriva in seduta: le due colonne per codice, anche per la scheda di prima
  {
    const a = await nuovo();
    const info = a.ST.catalogInfoByCodice;
    atteso('0 · loadActiveScheda tiene unilaterale e progressione per codice', [info.get('EX647'), info.get('EX600')], [{ unilaterale:'si', progressione:'ritmo più lento', pattern:null, gruppo_target:null, spiegazione:null }, undefined]);
    const ex = (n) => a.win.findExercise(n, 'upperA');
    atteso('0 · per lato: dal catalogo (EX647), dalla prescrizione (Affondi), dal jsonb (EX500); non la panca né alternato/no',
      ['Squat calcio laterale', 'Affondi', 'Step-up alto', 'Panca elastico', 'Curl elastico', 'Rematore elastico'].map(n => a.win._exPerLato(ex(n))), [true, true, true, false, false, false]);
    atteso('0 · la via di progressione: jsonb prima del catalogo, null se nessuno la sa', [a.win._exProgressione(ex('Step-up alto')), a.win._exProgressione(ex('Squat calcio laterale')), a.win._exProgressione(ex('Rematore elastico'))], ['carico in mano', 'ritmo più lento', null]);
  }
  // 280 · il registro chiede due numeri solo per lato
  {
    const a = await nuovo();
    a.win.openLogModal('upperA', 'Panca elastico', 1);
    atteso('280 · panca: una tendina sola, bozza come prima', [!!a.doc.getElementById('tl-reps'), !!a.doc.getElementById('tl-reps-sx'), a.ST.trainLogDraft], [true, false, { reps:'', rir:'' }]);
    a.ST.trainLogOpen = null;
    a.win.openLogModal('upperA', 'Squat calcio laterale', 1);
    const etichette = testo(a.doc.querySelector('#excard-Squat_calcio_laterale').innerHTML);
    atteso('280 · squat calcio laterale: tendine DX e SX, RIR accanto, bozza col lato sinistro', [!!a.doc.getElementById('tl-reps-sx'), /REPS DX/.test(etichette), /REPS SX/.test(etichette), a.ST.trainLogDraft], [true, true, true, { reps:'', rir:'', repsSx:'' }]);
    a.scegli('tl-reps', '10');
    atteso('280 · scelto il destro, il sinistro si riempie uguale (un tocco se i lati sono pari)', [a.doc.getElementById('tl-reps-sx').value, a.ST.trainLogDraft.repsSx], ['10', '10']);
    a.scegli('tl-reps-sx', '8'); a.scegli('tl-rir', '2');
    a.win.renderTraining();
    atteso('280 · dopo un ridisegno le due tendine ricordano 10 e 8', [a.doc.getElementById('tl-reps').value, a.doc.getElementById('tl-reps-sx').value], ['10', '8']);
    const prima = a.righe().length;
    await a.win.saveTrainingSet();
    const r = a.righe()[a.righe().length - 1];
    atteso('280 · la riga: reps = il lato più debole, reps_dx 10, reps_sx 8', [a.righe().length - prima, r.reps, r.reps_dx, r.reps_sx, r.exercise_code], [1, 8, 10, 8, 'EX647']);
    const k = `upperA_Squat calcio laterale_1_${OGGI}`;
    atteso('280 · in memoria la serie porta i due lati', [a.ST.trainLoggedSets[k].reps, a.ST.trainLoggedSets[k].repsDx, a.ST.trainLoggedSets[k].repsSx], [8, 10, 8]);
    const pill = testo(a.doc.querySelector('#excard-Squat_calcio_laterale .ex-set-pill-done').innerHTML);
    atteso('280 · la pillola dice «10 dx · 8 sx»', /S1 10 dx · 8 sx/.test(pill), true);
    atteso('280 · APPENA FATTA dice i due lati', a.win.getLastLoggedSetLabel('upperA', 'Squat calcio laterale'), 'S1 · 10 dx · 8 sx · RIR 2');
    atteso('280 · PROSSIMA ragiona sul lato debole e dice «per lato»', a.ST.aiSuggestions['upperA_Squat calcio laterale'], 'S2: corpo libero · 9 reps per lato · RIR 2');
    // senza il sinistro non si salva
    a.win.openLogModal('upperA', 'Squat calcio laterale', 2);
    a.scegli('tl-reps', '9'); a.ST.trainLogDraft.repsSx = ''; a.doc.getElementById('tl-reps-sx').value = '';
    const prima2 = a.righe().length;
    await a.win.saveTrainingSet();
    atteso('280 · senza il lato sinistro la serie non parte', [a.righe().length - prima2, !!a.ST.trainLogOpen], [0, true]);
    // la panca si salva come sempre, senza le colonne dei lati
    a.ST.trainLogOpen = null;
    a.win.openLogModal('upperA', 'Panca elastico', 1);
    a.scegli('tl-reps', '8'); a.scegli('tl-rir', '2'); a.ST.trainLogResist = 20;
    await a.win.saveTrainingSet();
    const rp = a.righe()[a.righe().length - 1];
    atteso('280 · la panca non scrive reps_dx/reps_sx', [rp.reps, 'reps_dx' in rp, 'reps_sx' in rp], [8, false, false]);
    // la correzione della pillola tiene i due lati
    a.win.editLog(k);
    atteso('280 · la matita apre destro e sinistro', [a.doc.getElementById('el-reps').value, a.doc.getElementById('el-reps-sx').value], ['10', '8']);
    a.doc.getElementById('el-reps').value = '11'; a.doc.getElementById('el-reps-sx').value = '9';
    await a.win.confirmEditLog(k);
    const upd = a.supa._calls.filter(c => c.table === 'training_logs' && c.op === 'update').pop();
    atteso('280 · la correzione scrive reps 9 (il più debole), reps_dx 11, reps_sx 9', [upd.payload.reps, upd.payload.reps_dx, upd.payload.reps_sx, a.ST.trainLoggedSets[k].repsDx], [9, 11, 9, 11]);
  }
  // 280 · «Ultima volta», rilettura dal cloud e dettaglio del giorno
  {
    const a = await nuovo();
    await a.win.loadLastLoggedSets('upperA');
    atteso('280 · «ultima volta» dice i due lati (e l\'obiettivo di oggi, Training 040, giudica il lato debole: 7 è sotto il minimo)', a.win.getProgressionSuggestion('Squat calcio laterale', 'upperA'), '🎯 Oggi S1: variante più facile · punta a 8 reps per lato · RIR 2 · ultima volta 9 dx · 7 sx · corpo libero · RIR 1');
    atteso('280 · per la panca com\'era, con l\'obiettivo davanti', a.win.getProgressionSuggestion('Panca elastico', 'upperA'), '🎯 Oggi S1: 20 lbs · 8 reps · RIR 2 · ultima volta 8r · 20 lbs · RIR 2');   // Training 440: la prima uguale
    a.win.openDayDetail(IERI);
    await new Promise(r => setTimeout(r, 20));
    const giorno = testo(a.doc.body.innerHTML);
    atteso('280 · il dettaglio del giorno mostra «9 dx · 7 sx»', /S2 9 dx · 7 sx/.test(giorno), true);
    a.win.editLogRow('t1');
    atteso('280 · la correzione nel dettaglio apre i due lati', [a.doc.getElementById('elr-reps').value, a.doc.getElementById('elr-reps-sx').value], ['9', '7']);
    a.win.closeDayDetail();
  }
  {
    const a = await nuovo({ training_logs: [
      { id:'t9', user_id:U, session_id:'upperA', date:OGGI, exercise_name:'Squat calcio laterale', exercise_code:'EX647', set_number:1, reps:8, reps_dx:10, reps_sx:8, resistance:null, band_color:null, rir_actual:2 },
    ] });
    await a.win.hydrateTrainingSetsFromCloud();
    const k = `upperA_Squat calcio laterale_1_${OGGI}`;
    atteso('280 · la serie di oggi riletta dal cloud porta i due lati', [a.ST.trainLoggedSets[k].reps, a.ST.trainLoggedSets[k].repsDx, a.ST.trainLoggedSets[k].repsSx], [8, 10, 8]);
  }
  // 320 · in cima alle ripetizioni il coach nomina la via dell'esercizio
  {
    const a = await nuovo();
    const sess = a.win.getTrainingSession('upperA');
    const sugg = (nome, reps, rir, resistance) => a.win.computeNextSetSuggestion({ sessionId:'upperA', exName:nome, setNum:1, reps, resistance, rir, exData:a.win.findExercise(nome, 'upperA'), sess, bandColor:null });
    atteso('320 · ritmo più lento (squat calcio laterale, dal catalogo): niente carico', sugg('Squat calcio laterale', 12, 2, ''), 'S2: corpo libero · ritmo più lento: 3 sec in discesa · riparti da 8 reps per lato · RIR 2');
    atteso('320 · più ripetizioni (affondi): si sale oltre il tetto', sugg('Affondi', 12, 2, ''), 'S2: corpo libero · più ripetizioni · sali a 13 reps per lato · RIR 2');
    atteso('320 · carico in mano (dal jsonb): a corpo libero si prende un peso', sugg('Step-up alto', 12, 2, ''), 'S2: carico in mano: 10 lbs · riparti da 8 reps per lato · RIR 2');
    atteso('320 · carico in mano con un peso già in mano: un passo in su', sugg('Step-up alto', 12, 2, '10'), 'S2: 20 lbs · riparti da 8 reps per lato · RIR 2');
    atteso('320 · elastico più duro (curl): un passo in su, nominato', sugg('Curl elastico', 15, 2, '20'), 'S2: elastico più duro: 30 lbs · riparti da 10 reps · RIR 2');
    atteso('320 · carico (panca): come prima', sugg('Panca elastico', 10, 2, '20'), 'S2: 30 lbs · riparti da 6 reps · RIR 2');
    atteso('320 · senza colonna (rematore): come prima', sugg('Rematore elastico', 10, 2, '20'), 'S2: 30 lbs · riparti da 6 reps · RIR 2');
    atteso('320 · tenuta più lunga (plank)', sugg('Plank', 40, 2, ''), 'S2: corpo libero · tenuta più lunga · sali a 45 sec · RIR 2');
    atteso('320 · sotto il tetto niente cambia: +1 sul lato debole', sugg('Squat calcio laterale', 9, 2, ''), 'S2: corpo libero · 10 reps per lato · RIR 2');
    atteso('320 · sotto il minimo a corpo libero resta «variante più facile» (Training 330)', /variante più facile/.test(sugg('Squat calcio laterale', 6, 1, '')), true);
    a.ST.trainSession = null; a.ST.trainTab = 'piano'; a.ST.trainComeCresciOpen = true; a.win.renderTraining();
    const info = testo(a.doc.body.innerHTML);
    atteso('320 · la spiegazione del ciclo (Programma) non dice più «aumenta il carico»', [/aumenta il carico/.test(info), /il coach ti dice quale/.test(info)], [false, true]);
  }
  // Il generatore: `unilaterale` dal catalogo al posto della lista fissa, e le colonne nel jsonb
  {
    const a = await nuovo();
    const u = a.win._trainGenUnilaterale;
    atteso('gen · si/alternato/no dal catalogo; la lista fissa solo senza colonna', [u({ codice:'EX999', unilaterale:'si' }), u({ codice:'EX047', unilaterale:'alternato' }), u({ codice:'EX047', unilaterale:'no' }), u({ codice:'EX047' }), u({ codice:'EX999' })], [true, false, false, true, false]);
    // una generazione vera sul catalogo della prova del blocco nuovo: tutti i «dominante ginocchia» per lato
    const src = fs.readFileSync(path.join(__dirname, 'prova_blocco_nuovo.js'), 'utf8');
    const m = src.match(/const base = [\s\S]*?\nconst catalogo = \[[\s\S]*?\n\];/);
    let catalogoBN = null; eval(m[0].replace('const base', 'var base').replace('const catalogo', 'catalogoBN')); // eslint-disable-line no-eval
    catalogoBN.forEach(c => { c.unilaterale = c.pattern === 'dominante ginocchia' ? 'si' : 'no'; c.progressione = c.pattern === 'dominante ginocchia' ? 'ritmo più lento' : 'carico'; });
    const t = fixture(); t.esercizi_catalog = catalogoBN; t.schede_utente = [];
    t.profiles[0] = { ...t.profiles[0], obiettivo:'ricomposizione', tipo_allenamento:'casa', attrezzatura:['elastico','sbarra'], giorni_allenamento:4, volume_sessione:'completo', note_salute:'Esperienza: avanzato' };
    const b = boot(t, { now: OGGI + 'T07:00:00' }); await b.avviato;
    const ST2 = b.win.eval('ST'); ST2.user = { id:U }; ST2.profile = t.profiles[0]; ST2.catalog = [];
    const gen = await b.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
    const ginocchia = [].concat(...gen.sessioni.map(s => s.exercises || [])).filter(e => ['EX040','EX041','EX042','EX043'].includes(e.codice));
    atteso('gen · ogni «dominante ginocchia» esce «per lato» con le due colonne nel jsonb', [ginocchia.length > 0, ginocchia.every(e => / per lato$/.test(e.reps) && e.unilaterale === 'si' && e.progressione === 'ritmo più lento')], [true, true]);
    const altri = [].concat(...gen.sessioni.map(s => s.exercises || [])).filter(e => e.codice && !['EX040','EX041','EX042','EX043'].includes(e.codice));
    atteso('gen · gli altri no, anche EX066/EX067 che stavano nella lista fissa', altri.every(e => !/ per lato$/.test(e.reps) && e.unilaterale === 'no'), true);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
