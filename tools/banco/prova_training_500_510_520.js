// Training 500 · 510 · 520 (27 ottobre 2026, segnalazioni di Ignazio del 26 ottobre sul Rilascio 55) e un residuo
// della revisione del Rilascio 55:
//   500 · «non funziona il bip degli ultimi cinque secondi» (recupero) e «il bip degli ultimi secondi» (serie a tempo):
//         dal 470 i suoni vanno sopra la musica, e il tic (600 Hz, volume 0,35, 90 ms) sotto la musica spariva.
//   510 · «in Pallof non mi dà la resistenza o peso usata»: nelle tenute il registro non compilava il carico, la serie
//         si salvava senza e la volta dopo l'obiettivo diceva «corpo libero» per un esercizio con l'elastico.
//   520 · «non si capisce se ogni lato vale come una ripetizione o sinistro più destro vale una ripetizione»
//         (Russian twist, alternato): «per lato» sul bersaglio, nel registro e nei suggerimenti.
//   residuo (a) · «Cambia per oggi» non guardava le limitazioni della persona.
// Dati come quelli veri di Ignazio: Pallof EX023 («20-40 sec», elastico, unilaterale si, tenuta più lunga) il 12
// ottobre salvato senza carico, il 5 a 10 lbs; Russian twist EX103 (alternato, «12-15», 0 scritto); Calf raise una
// gamba EX557 (si, corpo libero, carico mai scritto).
//   node tools/banco/prova_training_500_510_520.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-26', PRIMA = '2026-10-12', PRIMA2 = '2026-10-05';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const dormi = (ms) => new Promise(r => setTimeout(r, ms || 20));

const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
  { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10', rest_sec:120, eq:'elastico' },
  { codice:'EX023', name:'Pallof press con elastico', sets:3, reps:'20-40 sec', iso:true, durationBased:true, isTimed:true, rest_sec:60, eq:'elastico' },
  { codice:'EX103', name:'Russian twist', sets:3, reps:'12-15', rest_sec:75, eq:'corpo libero' },
  { codice:'EX557', name:'Calf raise una gamba', sets:3, reps:'12-15', rest_sec:60, eq:'corpo libero' },
  { codice:'EX156', name:'Crunch isometrico barchetta', sets:3, reps:'20-40 sec', iso:true, durationBased:true, isTimed:true, rest_sec:60, eq:'corpo libero' },
] } ] };
const riga = (codice, nome, extra) => ({ codice, nome, pattern:'core', gruppo_target:'obliqui', livello:'intermedio', attrezzo:'corpo libero', luogo:'casa', setup:'', esecuzione:'', errori:'', nota_sicurezza:'', muscoli:'obliqui', unilaterale:'no', progressione:'più ripetizioni', zone_rischio:'nessuna', adattamento:'', ...(extra || {}) });
const catalogo = [
  riga('EX001', 'Panca elastico', { pattern:'spinta orizzontale', gruppo_target:'pettorali', attrezzo:'elastico', progressione:'carico' }),
  riga('EX023', 'Pallof press con elastico', { gruppo_target:'core anti-rotazione', attrezzo:'elastico', unilaterale:'si', progressione:'tenuta più lunga' }),
  // il Russian twist vero: lombare e cervicale fra le zone a rischio, alternativa EX108
  riga('EX103', 'Russian twist', { unilaterale:'alternato', zone_rischio:'lombare;cervicale', adattamento:'piedi a terra per facilitare, sollevati per intensificare', alternativa:'EX108' }),
  riga('EX557', 'Calf raise una gamba', { pattern:'isolamento', gruppo_target:'polpacci', unilaterale:'si' }),
  riga('EX156', 'Crunch isometrico barchetta', { gruppo_target:'addome', progressione:'tenuta più lunga' }),
  // le possibili sostitute del Russian twist per oggi, con le limitazioni di Ignazio (lombare, ginocchia)
  riga('EX108', 'Crunch obliquo', { zone_rischio:'cervicale', adattamento:'cervicale: non tirare il collo' }),                       // alternativa scritta, nessun conflitto
  riga('EX110', 'Piegamenti laterali elastico', { attrezzo:'elastico', zone_rischio:'lombare', adattamento:'lombare: riduci l\'ampiezza e resta dritto' }),   // conflitto, adattamento sulla zona → entra con l'avviso
  riga('EX111', 'Twist in piedi', { zone_rischio:'lombare', adattamento:'cervicale: non tirare il collo' }),                          // conflitto, adattamento su un'altra zona → fuori
  riga('EX112', 'Woodchop elastico', { attrezzo:'elastico', zone_rischio:'lombari' }),                                                // «lombari» = lombare, senza adattamento → fuori
  riga('EX113', 'Plank laterale dinamico', { zone_rischio:'spalle' }),                                                                 // nessun conflitto
];
const log = (id, data, nome, codice, set, reps, resistance, rir) => ({ id, user_id:U, session_id:'upperA', date:data, exercise_name:nome, exercise_code:codice, set_number:set, reps, resistance, band_color:null, rir_actual:rir });
function fixture(o){
  o = o || {};
  const pallof12 = ('pallof12' in o) ? o.pallof12 : null;   // il 12 ottobre vero: salvato senza carico
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-19', tipo_allenamento:'casa', attrezzatura:['elastico','corpo_libero'], note_salute:'ferritina bassa · Esperienza: avanzato · Limitazioni: lombare, ginocchia' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    training_logs:[
      log('p1', PRIMA2, 'Pallof press con elastico', 'EX023', 1, 20, '10', null), log('p2', PRIMA2, 'Pallof press con elastico', 'EX023', 2, 20, '10', null), log('p3', PRIMA2, 'Pallof press con elastico', 'EX023', 3, 25, '10', null),
      log('q1', PRIMA, 'Pallof press con elastico', 'EX023', 1, 25, pallof12, null), log('q2', PRIMA, 'Pallof press con elastico', 'EX023', 2, 25, pallof12, null), log('q3', PRIMA, 'Pallof press con elastico', 'EX023', 3, 30, pallof12, null),
      log('r1', PRIMA, 'Russian twist', 'EX103', 1, 12, '0', 2), log('r2', PRIMA, 'Russian twist', 'EX103', 2, 12, '0', 2),
      log('c1', PRIMA, 'Calf raise una gamba', 'EX557', 1, 12, null, 2),
      log('b1', PRIMA, 'Panca elastico', 'EX001', 1, 8, '40', 2),
    ],
    training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(o){
  const t = fixture(o);
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const W = b.win;
  const ST = W.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.aiCue = ST.aiCue || {};
  W.callAI = async () => '';
  W.fetchExerciseMedia = async () => ({ status:'missing' });
  await W.loadLastLoggedSets('upperA');
  W.renderTraining();
  // Un contesto audio che si ricorda di ogni suono: frequenza, volume, durata (Web Audio, come _suonaTono)
  const suoni = [];
  W.AudioContext = function(){
    const c = { currentTime:0, destination:{}, state:'running', ultimo:null,
      createOscillator(){ const osc = { frequency:{ value:0 }, type:'', connect(){}, start(t){ osc.t0 = t; }, stop(t){ suoni.push([osc.frequency.value, osc.vol, Math.round((t - osc.t0) * 1000) / 1000]); } }; c.ultimo = osc; return osc; },
      createGain(){ return { connect(){}, gain:{ setValueAtTime(v){ if(c.ultimo && c.ultimo.vol == null) c.ultimo.vol = v; }, linearRampToValueAtTime(){} } }; },
      resume(){ c.state = 'running'; return Promise.resolve(); }, close(){ c.state = 'closed'; return Promise.resolve(); } };
    return c;
  };
  W.webkitAudioContext = W.AudioContext;
  W.eval('_audioCtx = null');
  const doc = W.document;
  const card = (n) => testo((doc.getElementById('excard-' + n.replace(/[^a-zA-Z0-9]/g, '_')) || { innerHTML:'' }).innerHTML);
  const scegli = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new W.Event('change', { bubbles:true })); };
  return { ...b, W, ST, t, doc, suoni, card, scegli };
}

(async () => {
  // ── 500 · il tic degli ultimi secondi si sente sopra la musica ──
  {
    const a = await nuovo();
    const W = a.W;
    W.playPrepBeep(); W.playLongBeep(); W.playStopBeep();
    const [tic, lungo, stop] = a.suoni;
    atteso('500 · il tic: 2000 Hz, volume 0,8, 150 ms (era 600 Hz, 0,35, 90 ms)', tic, [2000, 0.8, 0.16]);
    atteso('500 · bip lungo e stop come prima (1100 Hz e 659 Hz)', [lungo, stop], [[1100, 0.8, 0.66], [659, 0.85, 0.73]]);
    atteso('500 · il tic non è più il suono più piano: almeno quanto il bip lungo', tic && lungo && tic[1] >= lungo[1], true);
    atteso('500 · e resta il più corto e il più acuto: non si confonde con gli altri due', tic && [tic[2] < lungo[2] && tic[2] < stop[2], tic[0] > lungo[0] && tic[0] > stop[0]], [true, true]);
    // il recupero: un tic a 5, 4, 3, 2, 1 e lo stop a zero
    a.suoni.length = 0;
    W.startTrainingCountdown(60, 'Panca elastico', 'upperA');
    const cd = a.ST.trainCountdown;
    for(let s = 5; s >= 1; s--){ cd.endTime = W.Date.now() + s * 1000 - 500; W.tickCountdown(); }
    cd.endTime = W.Date.now() - 100; W.tickCountdown();
    atteso('500 · recupero: cinque tic a 2000 Hz e poi lo stop', a.suoni.map(s => s[0]), [2000, 2000, 2000, 2000, 2000, 659]);
    W.skipCountdown();
    // la serie a tempo: 3, 2, 1 e lo stop
    a.suoni.length = 0;
    a.ST.trainExecOpen = null;
    W.execTimerStart(10);
    const tt = a.ST.trainExecTimer;
    for(let s = 3; s >= 1; s--){ tt.endTime = W.Date.now() + s * 1000 - 500; W._execTimerTick(); }
    tt.endTime = W.Date.now() - 100; W._execTimerTick();
    W.execTimerStop();
    atteso('500 · serie a tempo: tre tic a 2000 Hz e poi lo stop', a.suoni.map(s => s[0]), [2000, 2000, 2000, 659]);
    // nessuna strada nuova per il suono: sempre e solo Web Audio da _suonaTono (Training 450 e 470)
    const radice = path.join(__dirname, '../..');
    const sorgenti = ['zona-tracker.html', ...fs.readdirSync(path.join(radice, 'app')).filter(f => /\.js$/.test(f)).map(f => 'app/' + f)];
    const oscillatori = sorgenti.reduce((n, f) => n + (fs.readFileSync(path.join(radice, f), 'utf8').match(/createOscillator\(/g) || []).length, 0);
    const audio = sorgenti.filter(f => /new Audio\(|mediaSession|createElement\(['"](audio|video)/.test(fs.readFileSync(path.join(radice, f), 'utf8')));
    atteso('500 · un solo createOscillator in tutta l\'app, nessun <audio> né Media Session', [oscillatori, audio], [1, []]);
  }

  // ── 510 · il carico del Pallof ──
  {
    // il caso vero: l'ultima volta (12 ottobre) senza carico
    const a = await nuovo();
    const c = a.card('Pallof press con elastico');
    atteso('510 · Pallof senza carico l\'ultima volta: nessun «corpo libero» per un esercizio con l\'elastico', /corpo libero/.test(c), false);
    atteso('510 · la card dice l\'obiettivo e l\'ultima volta in secondi per lato', /Oggi S1: 30 sec per lato · RIR 2 · ultima volta 30 sec per lato/.test(c), true);
    a.W.openLogModal('upperA', 'Pallof press con elastico', 1, { timedTarget: 30 });
    atteso('510 · il registro resta su «—»: il carico non scritto non diventa uno 0', [a.ST.trainLogResist, a.doc.getElementById('tl-resist') && a.doc.getElementById('tl-resist').value], [null, '']);
    // la persona scrive 10 lbs: le serie dopo lo ritrovano
    a.scegli('tl-reps', '30'); a.ST.trainLogResist = 10;
    await a.W.saveTrainingSet(); await dormi();
    a.W.skipCountdown();
    a.W.openLogModal('upperA', 'Pallof press con elastico', 2, { timedTarget: 35 });
    atteso('510 · serie 2: il registro riprende i 10 lbs e la durata scelta', [a.ST.trainLogResist, a.doc.getElementById('tl-reps').value], [10, '35']);
    // un esercizio a corpo libero col carico mai scritto resta «corpo libero», come prima
    atteso('510 · Calf raise (corpo libero, carico mai scritto): «corpo libero» come prima', /Oggi S1: corpo libero · 12 reps per lato · RIR 2/.test(a.card('Calf raise una gamba')), true);
  }
  {
    // la volta dopo, col carico scritto: la tenuta compila il carico come le ripetizioni
    const a = await nuovo({ pallof12: '10' });
    atteso('510 · Pallof con 10 lbs l\'ultima volta: la card lo dice', /Oggi S1: 10 lbs · 30 sec per lato · RIR 2 · ultima volta 30 sec per lato · 10 lbs/.test(a.card('Pallof press con elastico')), true);
    // come nell'app: «▶ Avvia», il tempo, «Fine serie» → registro con la durata del picker
    a.W.openTrainExec('upperA', 'Pallof press con elastico', 1);
    a.W.execTimerSetTarget(30);
    a.W.execTimerLaunch();
    a.W.execTimerStop();
    a.ST.trainExecOpen.isoPhase = 'B';
    a.W.trainExecFinishSet();
    atteso('510 · tenuta, prima serie: il registro apre con 10 lbs (prima «—») e 30 secondi', [a.ST.trainLogResist, a.doc.getElementById('tl-reps') && a.doc.getElementById('tl-reps').value], [10, '30']);
    atteso('510 · …e la tendina del carico lo mostra', a.doc.getElementById('tl-resist') && a.doc.getElementById('tl-resist').value, '10');
  }

  // ── 520 · per lato, scritto sul bersaglio ──
  {
    const a = await nuovo();
    atteso('520 · card: Russian twist (alternato) «3 × 12-15 per lato»', /3 × 12-15 per lato/.test(a.card('Russian twist')), true);
    atteso('520 · card: Calf raise (un lato alla volta) «3 × 12-15 per lato», Pallof «3 × 20-40 sec per lato»', [/3 × 12-15 per lato/.test(a.card('Calf raise una gamba')), /3 × 20-40 sec per lato/.test(a.card('Pallof press con elastico'))], [true, true]);
    atteso('520 · card: Panca elastico e Crunch barchetta senza «per lato»', [/per lato/.test(a.card('Panca elastico')), /per lato/.test(a.card('Crunch isometrico barchetta'))], [false, false]);
    atteso('520 · niente più il secondo badge «1 rip = dx + sx»', /1 rip = dx \+ sx/.test(testo(a.doc.getElementById('page-training').innerHTML)), false);
    atteso('520 · Russian twist: «ultima volta 12 per lato»', /ultima volta 12 per lato · corpo libero/.test(a.card('Russian twist')), true);
    a.W.openTrainExec('upperA', 'Russian twist', 1);
    atteso('520 · schermata di esecuzione: «12-15 per lato»', /12-15 per lato/.test(testo(a.doc.querySelector('.train-exec-overlay').innerHTML)), true);
    a.W.trainExecBack();
    a.W.openLogModal('upperA', 'Russian twist', 1);
    const reg = testo(a.doc.getElementById('page-training').innerHTML);
    atteso('520 · registro dell\'alternato: «REPS PER LATO», una tendina sola (le due DX/SX restano dei «si»)', [/REPS PER LATO/.test(reg), !!a.doc.getElementById('tl-reps-sx')], [true, false]);
    a.scegli('tl-reps', '12'); a.scegli('tl-rir', '2'); a.ST.trainLogResist = 0;
    await a.W.saveTrainingSet(); await dormi();
    const p = (a.ST.trainProssima || {})['upperA_Russian twist'];
    atteso('520 · PROSSIMA dell\'alternato «per lato», con lo stesso conto di prima (13 = 13 a destra e 13 a sinistra)', p && [p.testo, p.reps], ['S2: corpo libero · 13 reps per lato · RIR 2', 13]);
    atteso('520 · «appena fatta» dice «12 per lato»', a.W.getLastLoggedSetLabel('upperA', 'Russian twist'), 'S1 · 12 per lato · corpo libero · RIR 2');
    a.W.skipCountdown();
    a.W.openLogModal('upperA', 'Calf raise una gamba', 1);
    atteso('520 · registro di un «si»: due tendine, REPS DX e REPS SX', [!!a.doc.getElementById('tl-reps-sx'), /REPS DX/.test(testo(a.doc.getElementById('page-training').innerHTML))], [true, true]);
    a.ST.trainLogOpen = null;
    a.W.openLogModal('upperA', 'Pallof press con elastico', 1, { timedTarget: 30 });
    atteso('520 · registro della tenuta un lato alla volta: «DURATA PER LATO (sec)»', /DURATA PER LATO \(sec\)/.test(testo(a.doc.getElementById('page-training').innerHTML)), true);
    a.ST.trainLogOpen = null;
    a.W.openTrainExec('upperA', 'Pallof press con elastico', 1);
    atteso('520 · schermata della tenuta: «DURATA TARGET PER LATO (sec)»', /DURATA TARGET PER LATO \(sec\)/.test(testo(a.doc.querySelector('.train-exec-overlay').innerHTML)), true);
    a.W.trainExecBack();
  }

  // ── residuo (a) · «Cambia per oggi» guarda le limitazioni (Ignazio: lombare, ginocchia) ──
  {
    const a = await nuovo();
    a.W.apriCambioOggi('upperA', 'Russian twist');
    await dormi(40);
    const cand = (a.ST.cambioOggi.candidati || []).map(c => c.riga.codice);
    atteso('a · candidati: l\'alternativa, poi chi non tocca la schiena, poi chi ha l\'adattamento per la schiena', cand, ['EX108', 'EX113', 'EX110']);
    atteso('a · fuori chi carica la schiena con un adattamento su un\'altra zona (EX111) o senza (EX112, «lombari»)', [cand.includes('EX111'), cand.includes('EX112')], [false, false]);
    await a.W.cambiaPerOggi('upperA', 'Russian twist', 'EX110');
    const nuovoEx = a.W.getTrainingSession('upperA').exercises.find(e => e.codice === 'EX110');
    atteso('a · scelto quello con l\'adattamento, arriva con l\'avviso per la schiena', !!(nuovoEx && /riduci l'ampiezza/.test(JSON.stringify(nuovoEx.alert || ''))), true);
    atteso('a · nessuna scrittura nel database (il cambio vive sul telefono)', a.t.esercizi_catalog.length, catalogo.length);
  }

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
