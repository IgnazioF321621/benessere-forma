// Due segnalazioni di Ignazio dal telefono vero (22 ottobre 2026, Rilascio 49):
//   450 · la traccia audio del recupero (Training 420) prendeva il posto della sua musica sul blocco schermo
//         e i bip in secondo piano non suonavano comunque: tolta. Il recupero non crea <audio> e non tocca
//         la Media Session; restano i suoni Web Audio con l'app aperta (380)
//   460 · dopo una serie a RIR 1 con obiettivo RIR 2 il coach chiedeva di più. Il confronto è col RIR
//         OBIETTIVO dell'esercizio (rirObiettivo: quello dell'esercizio, poi della seduta): sotto
//         l'obiettivo si resta (stesse ripetizioni, stesso carico); la variante più difficile solo in cima al
//         range con RIR ≥ obiettivo
//   node tools/banco/prova_training_450_460.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-22';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// La Lower A vera di Ignazio (22 ottobre): seduta Forza a RIR 2, gli isolamenti a RIR 1
const scheda = { sessioni: [ { id:'lowerA', name:'Lower A', type:'Forza', rir:2, exercises:[
  { codice:'EX667', name:'Squat skater una gamba', sets:4, reps:'4-6', rir:2, rest_sec:120, unilaterale:'si', progressione:'ritmo più lento' },
  { codice:'EX545', name:'Piegamenti diamante', sets:4, reps:'4-6', rir:2, rest_sec:120, progressione:'variante più difficile' },
  { codice:'EX064', name:'Leg curl', sets:3, reps:'12-15', rir:1, rest_sec:75, iso:true, progressione:'carico' },
  { codice:'EX300', name:'Curl elastico', sets:3, reps:'8-12', rir:3, rest_sec:75, iso:true, progressione:'carico' },
  { codice:'EX008', name:'Trazioni sbarra assistite', sets:3, reps:'6-10', rest_sec:120 },
] } ] };
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', tipo_allenamento:'casa', attrezzatura:['elastico', 'corpo_libero'] }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[
      { codice:'EX667', nome:'Squat skater una gamba', unilaterale:'si', progressione:'ritmo più lento' },
      { codice:'EX545', nome:'Piegamenti diamante', pattern:'spinta orizzontale', livello:'intermedio', attrezzo:'corpo libero', luogo:'casa', progressione:'variante più difficile' },
      { codice:'EX694', nome:'Piegamenti mani incrociate', pattern:'spinta orizzontale', livello:'intermedio;avanzato', attrezzo:'corpo libero', luogo:'casa', alternativa:'EX545' },
      { codice:'EX064', nome:'Leg curl', progressione:'carico' }, { codice:'EX300', nome:'Curl elastico', progressione:'carico' },
      { codice:'EX008', nome:'Trazioni sbarra assistite' },
    ],
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
const aspetta = (ms) => new Promise(r => setTimeout(r, ms || 40));
async function nuovo(){
  const t = fixture();
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'lowerA'; ST.trainAnticipato = 'lowerA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  b.win.callAI = async () => '';
  b.win.fetchExerciseMedia = async () => ({ status:'missing' });
  b.win.renderTraining();
  await aspetta();
  const doc = b.win.document;
  const scegli = (id, val) => { const el = doc.getElementById(id); el.value = val; el.dispatchEvent(new b.win.Event('change', { bubbles:true })); };
  // come nell'app: «Fine serie» fa partire il recupero e apre il registro dentro il foglio
  const salva = async (nome, n, reps, rir, carico) => {
    b.win.openTrainExec('lowerA', nome, n);
    b.win.trainExecFinishSet();
    scegli('tl-reps', String(reps)); scegli('tl-rir', String(rir)); ST.trainLogResist = carico;
    await b.win.saveTrainingSet();
    await aspetta();
  };
  const prossima = (nome) => (ST.trainProssima || {})['lowerA_' + nome] || null;
  return { ...b, ST, t, doc, salva, prossima };
}

(async () => {
  // ── 450 · niente traccia audio ──
  {
    const a = await nuovo();
    let audioCreati = 0;
    const W = a.win;
    const origCrea = W.document.createElement.bind(W.document);
    W.document.createElement = (tag, ...r) => { if(/^(audio|video)$/i.test(String(tag))) audioCreati++; return origCrea(tag, ...r); };
    W.Audio = function(){ audioCreati++; return origCrea('audio'); };
    const sessione = { metadata: null, setActionHandler(){} };
    Object.defineProperty(W.navigator, 'mediaSession', { value: sessione, configurable:true });
    await a.salva('Squat skater una gamba', 1, 5, 2, 0);
    const cd = a.ST.trainCountdown;
    atteso('450 · parte il recupero', !!cd, true);
    cd.endTime = W.Date.now() + 4500; W.tickCountdown();
    cd.endTime = W.Date.now() - 100; W.tickCountdown();
    atteso('450 · dal recupero nessun <audio> o <video>, nessun mediaSession.metadata', [audioCreati, sessione.metadata], [0, null]);
    atteso('450 · nella pagina nessun elemento audio', a.doc.querySelectorAll('audio,video').length, 0);
    const radice = path.join(__dirname, '../..');
    const sorgenti = ['zona-tracker.html', ...fs.readdirSync(path.join(radice, 'app')).filter(f => /\.js$/.test(f)).map(f => 'app/' + f)];
    const chi = sorgenti.filter(f => /new Audio\(|mediaSession|createElement\(['"](audio|video)/.test(fs.readFileSync(path.join(radice, f), 'utf8')));
    atteso('450 · nessun file dell\'app crea un Audio o tocca la Media Session', chi, []);
  }
  // ── 460 · il RIR obiettivo dell'esercizio ──
  {
    const a = await nuovo();
    const W = a.win;
    atteso('460 · rirObiettivo: l\'esercizio prima della seduta (Leg curl 1 in seduta 2), poi la seduta', [W.rirObiettivo({ rir:1 }, { rir:2 }), W.rirObiettivo({}, { rir:2 }), W.rirObiettivo({ rir:null }, { rir:null })], [1, 2, null]);
    // il caso della segnalazione: skater, 4 per lato a RIR 1 con obiettivo 2
    await a.salva('Squat skater una gamba', 1, 4, 1, 0);
    let p = a.prossima('Squat skater una gamba');
    atteso('460 · skater a RIR 1 (obiettivo 2): si resta a 4 per lato, niente in più', p && [p.testo, p.reps], ['S2: corpo libero · resta a 4 reps per lato · RIR 2', 4]);
    // diamante in cima al range ma a RIR 1: niente variante più difficile
    await a.salva('Piegamenti diamante', 1, 6, 1, 0);
    p = a.prossima('Piegamenti diamante');
    atteso('460 · diamante 6 a RIR 1 (obiettivo 2): niente variante più difficile, resta a 6', p && [/variante più difficile/.test(p.testo), p.testo], [false, 'S2: corpo libero · resta a 6 reps · RIR 2']);
    await a.salva('Piegamenti diamante', 2, 6, 2, 0);
    p = a.prossima('Piegamenti diamante');
    atteso('460 · diamante 6 a RIR 2 (obiettivo 2, tetto): la variante più difficile, dal minimo', p && [/variante più difficile/.test(p.testo), p.reps, p.rir], [true, 4, 2]);
    // Leg curl: obiettivo 1, non quello della seduta
    await a.salva('Leg curl', 1, 15, 1, 20);
    p = a.prossima('Leg curl');
    atteso('460 · Leg curl 15 a RIR 1 (obiettivo 1, tetto): +10 lbs dal minimo, «RIR 1»', p && [p.testo, p.resistance], ['S2: 30 lbs · riparti da 12 reps · RIR 1', 30]);
    // Curl elastico: obiettivo 3, RIR 2 è meno margine
    await a.salva('Curl elastico', 1, 12, 2, 20);
    p = a.prossima('Curl elastico');
    atteso('460 · Curl 12 a RIR 2 (obiettivo 3): si resta, niente carico in più', p && [p.testo, p.resistance], ['S2: 20 lbs · resta a 12 reps · RIR 3', 20]);
    // trazioni: stessa regola, stessa banda
    await a.salva('Trazioni sbarra assistite', 1, 8, 1, null);
    a.ST.trainLogBandColor = null;
    const exT = W.findExercise('Trazioni sbarra assistite', 'lowerA');
    const sT = W.getTrainingSession('lowerA');
    const t = W.computeNextSetSuggestion({ sessionId:'lowerA', exName:'Trazioni sbarra assistite', setNum:1, reps:10, resistance:'', rir:1, exData:exT, sess:sT, bandColor:'Nera', struttura:true });
    atteso('460 · trazioni 10 a RIR 1 (obiettivo 2): stessa banda, nessuna banda più dura', t && [t.testo, t.bandColor], ['S2: banda Nera · resta a 10 reps · RIR 2', 'Nera']);
    // la card dice l'obiettivo dell'esercizio
    a.ST.trainCountdown = null; a.ST.trainLogOpen = null; a.ST.trainExecOpen = null; W.renderTraining();
    const pill = (nome) => { const el = a.doc.getElementById('excard-' + nome.replace(/[^a-zA-Z0-9]/g, '_')); const p = el && el.querySelector('.ex-rir-pill'); return p ? p.textContent : null; };
    atteso('460 · la pillola della card: Leg curl RIR 1, Curl RIR 3, skater RIR 2', [pill('Leg curl'), pill('Curl elastico'), pill('Squat skater una gamba')], ['RIR 1', 'RIR 3', 'RIR 2']);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
