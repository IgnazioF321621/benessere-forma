// Training 390 (17 novembre 2026, sei segnalazioni di Ignazio dalla prima seduta del blocco nuovo).
//   1 · gli esercizi fatti con l'elastico si misurano a COLORE, come le trazioni: niente libbre. Due versi: l'elastico come
//       resistenza (Gialla < Rossa < Nera < Viola, il più duro è il più difficile) e l'elastico che aiuta (piegamenti
//       assistiti, trazioni: il più leggero è il più difficile, «Corpo libero» in cima). Punto unico: bandaDi. Le serie
//       già scritte in numeri non si toccano e non si convertono.
//   2 · nella serie in corso la riga dell'obiettivo va a capo invece di uscire dallo schermo.
//   node tools/banco/prova_training_390.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-11-17';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(96), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ').trim();

const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Ipertrofia', rir:2, exercises:[
  { codice:'EX513', name:'Dip macchina seduto', sets:3, reps:'8-12', rest_sec:90, eq:'elastico', isSurrogato:true, progressione:'carico' },
  { codice:'EX378', name:'Piegamenti assistiti elastico', sets:3, reps:'8-12', rest_sec:90, eq:'elastico', progressione:'elastico più duro' },
  { codice:'EX076', name:'Rematore manubri panca piana', sets:3, reps:'8-12', rest_sec:90, eq:'elastico+panca', isSurrogato:true, progressione:'elastico più duro' },
  { codice:'EX900', name:'Curl manubri', sets:3, reps:'8-12', rest_sec:60, eq:'manubri', progressione:'carico' },
  { codice:'EX901', name:'Piegamenti', sets:3, reps:'8-12', rest_sec:60, eq:'corpo libero', progressione:'più ripetizioni' },
  { codice:'EX505', name:'Trazioni sbarra assistite elastico', sets:3, reps:'4-6', rest_sec:120, eq:'sbarra', progressione:'meno assistenza' },
] } ] };
// il catalogo di oggi: EX378 corretto nel foglio («meno assistenza»), la scheda ha ancora la via di prima
const catalogo = [
  { codice:'EX513', nome:'Dip macchina seduto', pattern:'spinta verticale', gruppo_target:'pettorali', attrezzo:'macchina', surrogato_attrezzo:'elastico', luogo:'casa;palestra', progressione:'carico' },
  { codice:'EX378', nome:'Piegamenti assistiti elastico', pattern:'spinta orizzontale', gruppo_target:'pettorali', attrezzo:'elastico', luogo:'casa', progressione:'meno assistenza' },
  { codice:'EX076', nome:'Rematore manubri panca piana', pattern:'tirata orizzontale', gruppo_target:'dorsali', attrezzo:'manubri;panca', surrogato_attrezzo:'elastico+panca', luogo:'casa;palestra', progressione:'elastico più duro' },
  { codice:'EX900', nome:'Curl manubri', pattern:'isolamento', gruppo_target:'bicipiti', attrezzo:'manubri', luogo:'casa', progressione:'carico' },
  { codice:'EX901', nome:'Piegamenti', pattern:'spinta orizzontale', gruppo_target:'pettorali', attrezzo:'corpo libero', luogo:'casa', progressione:'più ripetizioni' },
  { codice:'EX505', nome:'Trazioni sbarra assistite elastico', pattern:'tirata verticale', gruppo_target:'dorsali', attrezzo:'sbarra', surrogato_attrezzo:'elastico', luogo:'casa', progressione:'meno assistenza', nota_sicurezza:'Progressione: passa a un elastico piu sottile quando riesci a fare 10-12 ripetizioni pulite' },
];
// le serie di prima, in libbre, sul Dip (10 novembre)
const vecchie = [1, 2, 3].map(n => ({ id:'v' + n, user_id:U, date:'2026-11-10', session_id:'upperA', exercise_name:'Dip macchina seduto', exercise_code:'EX513', set_number:n, reps:10, resistance:'160', band_color:null, rir_actual:2 }));
async function nuovo(logs){
  const t = {
    profiles:[{ id:U, first_name:'X', m2_skipped:true, unit:'lbs', train_start_date:'2026-11-03', tipo_allenamento:'casa', attrezzatura:['elastico','panca','sbarra','manubri'], note_salute:'Esperienza: avanzato' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    training_logs: (logs || []).map(l => ({ ...l })), training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t, { now: OGGI + 'T07:00:00', locale: { zt_v5: '1' } });
  await b.avviato;
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'x@y' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.aiCue = ST.aiCue || {};
  W.callAI = async () => '';
  W.fetchExerciseMedia = async () => ({ status:'missing' });
  await W.loadLastLoggedSets('upperA');
  W.renderTraining();
  return { ...b, W, ST, t, doc: W.document };
}

(async () => {
  // ── 1 · chi si misura a banda, e in che verso ──
  const a = await nuovo(vecchie);
  const { W, ST } = a;
  const verso = (n) => W.bandaDi(n, 'upperA');
  atteso('1 · surrogato elastico (Dip macchina) e «elastico+panca» (Rematore): resistenza', [verso('Dip macchina seduto'), verso('Rematore manubri panca piana')], ['resistenza', 'resistenza']);
  atteso('1 · piegamenti assistiti: assistenza, dal catalogo di oggi anche se la scheda dice ancora «elastico più duro»', verso('Piegamenti assistiti elastico'), 'assistenza');
  atteso('1 · trazioni: assistenza, come sempre; manubri e corpo libero: niente banda', [verso('Trazioni sbarra assistite elastico'), verso('Curl manubri'), verso('Piegamenti')], ['assistenza', null, null]);
  atteso('1 · «elastico+manubri» no; via «elastico più duro» con la sola panca no, senza attrezzo scritto sì; la barra è l\'accessorio degli elastici', [W.bandaDi('X', null, { eq:'elastico+manubri' }), W.bandaDi('X', null, { eq:'panca', progressione:'elastico più duro' }), W.bandaDi('X', null, { progressione:'elastico più duro' }), W.bandaDi('X', null, { eq:'barra', progressione:'elastico più duro' }), W.bandaDi('X', null, { eq:'elastico;manubri', progressione:'carico' })], [null, null, 'resistenza', 'resistenza', null]);
  atteso('1 · le due scale, dal più facile al più duro', [W.scalaBanda('resistenza'), W.scalaBanda('assistenza')], [['Gialla', 'Rossa', 'Nera', 'Viola'], ['Viola', 'Nera', 'Rossa', 'Gialla', 'Corpo libero']]);

  // ── 2 · la PROSSIMA, nei due versi ──
  const sess = W.getTrainingSession('upperA');
  const pr = (nome, reps, rir, bandColor) => W.computeNextSetSuggestion({ sessionId:'upperA', exName:nome, setNum:1, reps, resistance:'', rir, exData:W.findExercise(nome, 'upperA'), sess, bandColor, struttura:true });
  const DIP = 'Dip macchina seduto', PIEG = 'Piegamenti assistiti elastico';
  atteso('2 · resistenza, in cima col RIR a posto, dentro la seduta: stesso elastico, niente salto di colore', [pr(DIP, 12, 2, 'Gialla').testo, pr(DIP, 12, 2, 'Gialla').bandColor], ['S2: elastico giallo · resta a 12 reps · RIR 2', 'Gialla']);
  // il colore dopo solo quando TUTTE le serie dell'ultima seduta sono in cima (decisione di Ignazio del 17/11)
  const prima1 = (nome, serie, banda) => { ST.lastSessionSets = { [nome]: serie.map(r => ({ reps:r, band_color:banda, rir_actual:2 })) }; const o = W.computeNextSetSuggestion({ sessionId:'upperA', exName:nome, setNum:0, reps:Math.max(...serie), resistance:'', rir:2, exData:W.findExercise(nome, 'upperA'), sess, bandColor:banda, struttura:true, primaSerie:true }); ST.lastSessionSets = {}; return [o.testo, o.bandColor]; };
  atteso('2 · prima serie, l\'ultima volta 12 · 12 · 12 sul giallo: si passa al rosso, dal minimo', prima1(DIP, [12, 12, 12], 'Gialla'), ['S1: elastico rosso (più duro) · riparti da 8 reps · RIR 2', 'Rossa']);
  atteso('2 · prima serie, l\'ultima volta 12 · 12 · 10: resta il giallo, si ripete la più forte', prima1(DIP, [12, 12, 10], 'Gialla'), ['S1: elastico giallo · 12 reps · RIR 2', 'Gialla']);
  atteso('2 · prima serie, solo due serie su tre fatte, tutte e due in cima: non basta', prima1(DIP, [12, 12], 'Gialla'), ['S1: elastico giallo · 12 reps · RIR 2', 'Gialla']);
  atteso('2 · assistenza, tutte in cima sulla rossa: meno aiuto, la gialla; trazioni uguale (4-6: 6 · 6 · 6)', [prima1(PIEG, [12, 12, 12], 'Rossa'), prima1('Trazioni sbarra assistite elastico', [6, 6, 6], 'Rossa')], [['S1: banda Gialla (più dura) · riparti da 8 reps · RIR 2', 'Gialla'], ['S1: banda Gialla (più dura) · riparti da 4 reps · RIR 2', 'Gialla']]);
  atteso('2 · già sul viola con tutte in cima: resta il viola', prima1(DIP, [12, 12, 12], 'Viola'), ['S1: elastico viola · 12 reps · RIR 2', 'Viola']);
  atteso('2 · resistenza, già sul viola: si sale di ripetizioni', pr(DIP, 12, 2, 'Viola').testo, 'S2: elastico viola · sali a 13 reps · RIR 2');
  atteso('2 · resistenza, sotto il minimo: l\'elastico più leggero; sul giallo si resta', [pr(DIP, 6, 1, 'Nera').testo, pr(DIP, 6, 1, 'Gialla').testo], ['S2: elastico rosso (più leggero) · punta a 8 reps · RIR 2', 'S2: elastico giallo · punta a 8 reps · RIR 2']);
  atteso('2 · resistenza, in mezzo: stesso elastico, una ripetizione in più', [pr(DIP, 10, 2, 'Rossa').testo, pr(DIP, 10, 2, 'Rossa').bandColor], ['S2: elastico rosso · 11 reps · RIR 2', 'Rossa']);
  atteso('2 · resistenza, senza un colore scritto: lo sceglie la persona, niente libbre', [pr(DIP, 12, 2, null).testo, pr(DIP, 12, 2, null).bandColor, pr(DIP, 12, 2, null).resistance], ['S2: scegli l\'elastico · resta a 12 reps · RIR 2', null, null]);
  atteso('2 · assistenza (piegamenti assistiti), in cima dentro la seduta: stessa banda', [pr(PIEG, 12, 2, 'Rossa').testo, pr(PIEG, 12, 2, 'Gialla').testo], ['S2: banda Rossa · resta a 12 reps · RIR 2', 'S2: banda Gialla · resta a 12 reps · RIR 2']);
  atteso('2 · assistenza, sotto il minimo: più aiuto', pr(PIEG, 6, 1, 'Rossa').testo, 'S2: banda Nera (più aiuto) · punta a 8 reps · RIR 2');
  atteso('2 · trazioni: in cima dentro la seduta stessa banda; sotto il minimo più aiuto, come prima', [pr('Trazioni sbarra assistite elastico', 6, 2, 'Rossa').testo, pr('Trazioni sbarra assistite elastico', 3, 1, 'Rossa').testo], ['S2: banda Rossa · resta a 6 reps · RIR 2', 'S2: banda Nera (più aiuto) · punta a 4 reps · RIR 2']);
  atteso('2 · manubri: in libbre, come prima', W.computeNextSetSuggestion({ sessionId:'upperA', exName:'Curl manubri', setNum:1, reps:12, resistance:'20', rir:2, exData:W.findExercise('Curl manubri', 'upperA'), sess }), 'S2: 30 lbs · riparti da 8 reps · RIR 2');

  atteso('2 · via «più ripetizioni» con l\'elastico: stesso elastico, si sale di ripetizioni (Training 320)', W.computeNextSetSuggestion({ sessionId:'upperA', exName:'Y', setNum:1, reps:12, resistance:'', rir:2, exData:{ sets:3, reps:'8-12', eq:'elastico', progressione:'più ripetizioni' }, sess, bandColor:'Gialla' }), 'S2: elastico giallo · più ripetizioni · sali a 13 reps · RIR 2');
  atteso('2 · una serie in numeri e una a colore non si confrontano (niente ▲ falso)', W._confrontaSerie('Dip macchina seduto', { reps:8, band_color:'Rossa' }, { reps:10, resistance:'160' }), 0);
  atteso('2 · fuori dalla scheda, con serie a colore: la misura resta la banda', W.progMisura('Esercizio uscito', [{ reps:10, resistance:'160' }, { reps:9, band_color:'Rossa' }]).tipo, 'banda');
  // ── 3 · le serie di prima, in libbre, restano storiche ──
  const o = W.obiettivoPrimaSerie(DIP, 'upperA');
  atteso('3 · obiettivo della prima serie dopo uno storico in libbre: le ripetizioni, e l\'elastico lo sceglie la persona', [o && o.testo, o && o.bandColor, o && o.resistance], ['S1: scegli l\'elastico · 10 reps · RIR 2', null, null]);
  const r5 = W.rigaNumeriV5(DIP, 'upperA');
  atteso('3 · la riga dei numeri dice l\'ultima volta com\'era, in libbre', [r5 && r5.ultima, /scegli l'elastico/.test((r5 && r5.testo) || '')], ['Ultima volta · 160 lbs × 10 · RIR 2', true]);
  atteso('3 · la misura con le sole serie in libbre resta il carico (grafico e riepilogo di prima)', W.progMisura(DIP, vecchie).tipo, 'carico');

  // ── 4 · il registro e il salvataggio ──
  W.openLogModal('upperA', DIP, 1);
  W.renderTraining();
  atteso('4 · il registro: «ELASTICO», i quattro colori, niente «Corpo libero», niente tendina delle libbre', [(a.doc.querySelector('.band-picker-resistenza label') || {}).textContent, [...a.doc.querySelectorAll('.band-picker-resistenza button')].map(b => b.textContent.trim()), !!a.doc.getElementById('tl-resist')], ['ELASTICO', ['Giallo', 'Rosso', 'Nero', 'Viola'], false]);
  const scegli = (id, v) => { const el = a.doc.getElementById(id); el.value = v; el.dispatchEvent(new W.Event('change', { bubbles:true })); };
  scegli('tl-reps', '10'); scegli('tl-rir', '2');
  const prima = a.t.training_logs.length;
  await W.saveTrainingSet();
  atteso('4 · senza un colore la serie non si salva', a.t.training_logs.length - prima, 0);
  ST.trainLogBandColor = 'Rossa';
  await W.saveTrainingSet();
  const riga = a.t.training_logs[a.t.training_logs.length - 1];
  atteso('4 · la serie si salva a colore: band_color scritto, resistance vuota', [riga.exercise_code, riga.band_color, riga.resistance, riga.reps], ['EX513', 'Rossa', null, 10]);
  atteso('4 · le tre serie di prima non sono state toccate', [a.t.training_logs.filter(l => l.date === '2026-11-10').map(l => [l.resistance, l.band_color]), a.supa._calls.filter(c => c.table === 'training_logs' && (c.op === 'update' || c.op === 'delete')).length], [[['160', null], ['160', null], ['160', null]], 0]);
  if(ST.trainCountdown) W.skipCountdown();
  W.openLogModal('upperA', DIP, 2);
  atteso('4 · la serie dopo riapre sull\'elastico appena usato', ST.trainLogBandColor, 'Rossa');
  ST.trainLogOpen = null;
  // da quando c'è una serie a colore la misura è la banda, e conta solo quelle
  const tutte = [...vecchie, { date: OGGI, reps: 10, resistance: null, band_color: 'Rossa' }, { date: OGGI, reps: 9, resistance: null, band_color: 'Nera' }];
  const m = W.progMisura(DIP, tutte);
  atteso('4 · misura dopo il passaggio: banda, verso resistenza, solo le serie a colore, la più forte è la nera', [m.tipo, m.verso, W._serieDellaMisura(m, tutte).length, W.bestSetOfDay(W._serieDellaMisura(m, tutte), m).band_color, m.testo(m.valore({ band_color:'Nera' }))], ['banda', 'resistenza', 2, 'Nera', 'elastico nero']);
  // piegamenti assistiti: il selettore è quello dell'assistenza, con «Corpo libero»
  W.openLogModal('upperA', PIEG, 1);
  W.renderTraining();
  atteso('4 · piegamenti assistiti: il selettore dell\'assistenza, con «Corpo libero»', [/ASSISTENZA/.test(testo(a.doc.getElementById('page-training').innerHTML)), /Corpo libero/.test(testo(a.doc.getElementById('page-training').innerHTML)), !!a.doc.querySelector('.band-picker-resistenza')], [true, true, false]);
  ST.trainLogOpen = null;

  // ── 5 · il testo che usciva dallo schermo ──
  const css = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'stile.css'), 'utf8');
  const regola = (css.match(/html\.v5 \.te5-numeri b\{[^}]*\}/) || [''])[0];
  atteso('5 · i numeri della serie in corso vanno a capo (niente nowrap)', [/nowrap/.test(regola), /overflow-wrap:break-word/.test(regola)], [false, true]);
  ST.trainProssima = { ['upperA_' + DIP]: pr(DIP, 12, 2, 'Gialla') };
  ST.aiSuggestions = ST.aiSuggestions || {};
  W.openTrainExec('upperA', DIP, 2);
  W.renderTraining();
  const frase = a.doc.querySelector('.te5-numeri.te5-frase');
  atteso('5 · la frase della PROSSIMA nella serie in corso ha la sua classe (più piccola, a capo)', !!frase || !!a.doc.querySelector('.te5-numeri'), true);

  // ── 6 · la nota di progressione prende la soglia dalla seduta ──
  const NOTA = 'Progressione: passa a un elastico piu sottile quando riesci a fare 10-12 ripetizioni pulite';
  atteso('6 · in una seduta a 4-6 la nota dice 6 ripetizioni, non 10-12', W._notaPerSeduta(NOTA, { reps:'4-6' }), 'Progressione: passa a un elastico piu sottile quando riesci a fare 6 ripetizioni pulite');
  atteso('6 · stesso intervallo: com\'è; a tempo o senza intervallo: com\'è', [W._notaPerSeduta(NOTA, { reps:'10-12' }) === NOTA, W._notaPerSeduta(NOTA, { reps:'20-40 sec' }) === NOTA, W._notaPerSeduta(NOTA, {}) === NOTA], [true, true, true]);
  atteso('6 · nella scheda letta: l\'avviso delle trazioni (4-6) dice 6 ripetizioni', /fare 6 ripetizioni pulite/.test(W.findExercise('Trazioni sbarra assistite elastico', 'upperA').alert || ''), true);

  // ── 7 · il bip dopo essere usciti dall'app: lo sblocco al tocco si riarma a ogni rientro ──
  const tocco = () => a.doc.dispatchEvent(new W.MouseEvent('mousedown', { bubbles:true }));
  W._ensureAudioCtx(); tocco();
  const ctx1 = W.eval('_audioCtx');
  atteso('7 · dopo il primo tocco lo sblocco è fatto', W.eval('_audioGestureUnlocked'), true);
  a.doc.dispatchEvent(new W.Event('visibilitychange'));
  atteso('7 · al rientro lo sblocco al tocco si riarma', [W.eval('_audioGestureUnlocked'), W.eval('_audioDopoRientro')], [false, true]);
  // un contesto che corre non si tocca (revisione): niente contesto nuovo, e l'inizio del tocco non conta
  a.doc.dispatchEvent(new W.Event('touchstart', { bubbles:true }));
  atteso('7 · l\'inizio del tocco (touchstart) dopo il rientro non fa niente: si aspetta la fine del tocco', W.eval('_audioGestureUnlocked'), false);
  tocco();
  atteso('7 · il contesto correva: il primo tocco non lo rifà', [W.eval('_audioCtx') === ctx1, W.eval('_audioGestureUnlocked')], [true, true]);
  // il contesto è rimasto fermo dopo il rientro: il primo tocco lo rifà dentro il gesto
  a.doc.dispatchEvent(new W.Event('visibilitychange'));
  await new Promise(r => setTimeout(r, 20));
  W.eval('_audioCtx').state = 'suspended';
  const ctxFermo = W.eval('_audioCtx');
  ctxFermo.resume = () => new Promise(() => {});   // iPhone: la ripresa senza un tocco non risponde
  tocco();
  const ctx2 = W.eval('_audioCtx');
  atteso('7 · il contesto era fermo: il primo tocco dopo il rientro lo rifà dentro il gesto', [ctx2 !== ctxFermo, ctxFermo.state, ctx2 && ctx2.state, W.eval('_audioDopoRientro')], [true, 'closed', 'running', false]);
  // «interrupted» al rientro: prima si prova a riprenderlo, non si butta subito
  const ctxI = W.eval('_audioCtx');
  ctxI.state = 'interrupted';
  const pI = W._riattivaAudio();
  atteso('7 · «interrupted» al rientro: il contesto non si butta subito', W.eval('_audioCtx') === ctxI, true);
  atteso('7 · …e se riparte resta lui', [await pI, W.eval('_audioCtx') === ctxI, ctxI.state], [true, true, 'running']);
  // la nota: solo nella frase della soglia
  atteso('6 · «lascia 2-3 ripetizioni di riserva» non si tocca; nel riscaldamento la nota resta com\'è', [W._notaPerSeduta('Lascia 2-3 ripetizioni di riserva', { reps:'4-6' }), W._notaPerSeduta(NOTA, { reps:'15-20', warmup:true }) === NOTA], ['Lascia 2-3 ripetizioni di riserva', true]);

  // ── 8 · il riscaldamento specifico: tre voci, al massimo 3 minuti, con le immagini ──
  {
    const R = require('../../shared/rotazione.js');
    const b = await nuovo(vecchie);
    const sei = ['EX605', 'EX601', 'EX829', 'EX717', 'EX416', 'EX788'].map((c, i) => ({ codice:c, name:'Voce ' + (i + 1), sets:2, reps: i === 5 ? '30 sec' : '15-20', warmup:true, alert: i === 0 ? 'ginocchia: marcia sul posto' : undefined }));
    b.t.schede_utente[0].scheda.sessioni[0].warmup = sei;
    b.W.fetchExerciseMedia = async (nome, codice) => ({ status:'cached', cached_url:'https://esempio.test/' + codice + '.gif' });
    await b.W.loadActiveScheda();
    const w = b.W.getTrainingSession('upperA').warmup;
    atteso('8 · una scheda di prima con 6 voci si legge a tre: la leggera, le scapole e la cuffia', w.map(x => x.codice), ['EX605', 'EX717', 'EX416']);
    atteso('8 · la scheda in memoria e quella salvata restano a 6 voci', [b.ST.schedaAttiva.scheda.sessioni[0].warmup.length, b.supa._calls.filter(c => c.table === 'schede_utente' && c.op !== 'select').length], [6, 0]);
    atteso('8 · tre voci da 50 secondi e 10 per cambiare: 170 secondi, sotto i 180', [b.W._warmupDurataTotale(w), R.riscaldamentoSec(sei), R.RISCALDAMENTO_MAX], [170, 170, 180]);
    atteso('8 · il generatore: tre voci per seduta', [b.W.eval('_TRAIN_GEN_WARM_VOCI.upper.length'), b.W.eval('_TRAIN_GEN_WARM_VOCI.lower.length')], [3, 3]);
    b.ST.trainSession = 'upperA'; b.ST.trainAnticipato = 'upperA';
    b.W.renderTraining();
    await new Promise(r => setTimeout(r, 30));
    b.W.renderTraining();
    const pg = b.doc.getElementById('page-training');
    atteso('8 · la card: «3 esercizi · 2 min 50 s in tutto»', /3 esercizi · 2 min 50 s in tutto/.test(pg.textContent.replace(/\s+/g, ' ')), true);
    atteso('8 · nella lista ogni voce ha la sua immagine, letta una volta sola col suo codice', [[...pg.querySelectorAll('.warm-gif-mini')].map(i => i.getAttribute('src')), pg.querySelectorAll('.ex-adattamento').length], [['https://esempio.test/EX605.gif', 'https://esempio.test/EX717.gif', 'https://esempio.test/EX416.gif'], 0]);
    b.W.warmupFlowStart(); b.W.renderTraining();
    const grande = b.doc.querySelector('.warm-gif');
    atteso('8 · mentre si esegue: l\'immagine grande della voce, e il suo adattamento', [grande && grande.getAttribute('src'), [...b.doc.querySelectorAll('.ex-adattamento')].length >= 1, b.ST.trainWarmupFlow.remaining], ['https://esempio.test/EX605.gif', true, 50]);
    b.W.warmupFlowEnd();
  }

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
