// Tre segnalazioni di Ignazio dal tasto «Invia Feedback» (14 ottobre 2026):
//   370 · nel recupero fra due esercizi «APPENA FATTA» è la serie dell'esercizio PRIMA: ora lo dice col nome,
//         e il foglio si riduce a una striscia in cima alla seduta senza fermare il tempo (scelta di Ignazio)
//   380 · dopo un'altra app il bip non suonava: al rientro prima l'audio poi il tick; un bip che non può
//         suonare resta in sospeso e parte al primo tocco
//   360 · gli esercizi «alternato» (Crunch sforbiciata) dicono come si conta: 1 rip = dx + sx
//         (dal Training 520, 27 ottobre 2026, lo dicono sul bersaglio: «12-20 per lato», niente secondo badge)
//   node tools/banco/prova_feedback_training.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
  { codice:'EX001', name:'Panca elastico', sets:1, reps:'6-10', rest_sec:120 },
  { codice:'EX008', name:'Trazioni sbarra assistite', sets:2, reps:'6-10', rest_sec:120 },
  { codice:'EX136', name:'Crunch sforbiciata ampia', sets:2, reps:'12-20', rest_sec:60, iso:true },
] } ] };
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico', unilaterale:'no' }, { codice:'EX008', nome:'Trazioni sbarra assistite', unilaterale:'no' }, { codice:'EX136', nome:'Crunch sforbiciata ampia', unilaterale:'alternato', progressione:'più ripetizioni' }],
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(){
  const t = fixture();
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  b.win.callAI = async () => '';
  b.win.fetchExerciseMedia = async () => ({ status:'missing' });
  b.win.renderTraining();
  const doc = b.win.document;
  const pagina = () => testo(doc.getElementById('page-training').innerHTML);
  const scegli = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new b.win.Event('change', { bubbles:true })); };
  const conta = (nome) => { let n = 0; const orig = b.win[nome]; b.win[nome] = () => { n++; }; return () => { b.win[nome] = orig; return n; }; };
  return { ...b, ST, t, doc, pagina, scegli, conta };
}
(async () => {
  // 370 · fra due esercizi il riquadro dice di chi è la serie
  {
    const a = await nuovo();
    a.win.openLogModal('upperA', 'Panca elastico', 1);
    a.scegli('tl-reps', '6'); a.scegli('tl-rir', '2'); a.ST.trainLogResist = 90;
    await a.win.saveTrainingSet();     // la panca ha 1 serie: finito → recupero verso le trazioni
    a.win.renderTraining();            // (nell'app lo fa il primo tick del conto)
    const cd = a.ST.trainCountdown;
    atteso('370 · recupero fra due esercizi, verso le trazioni', [!!cd, cd && cd.traEsercizi, cd && cd.exName, cd && cd.daEx], [true, true, 'Trazioni sbarra assistite', 'Panca elastico']);
    const foglio = a.pagina();
    // Training 410 (scelta di Ignazio): la serie della Panca non serve più, resta solo il riquadro delle trazioni, largo
    atteso('410 · niente «FATTO · Panca elastico», solo «PRIMA SERIE · Trazioni», a tutta larghezza', [/FATTO|Panca elastico S1|APPENA FATTA/.test(foglio), /PRIMA SERIE · Trazioni sbarra assistite/.test(foglio), a.doc.querySelectorAll('.rest-row-cards--una .rest-card').length], [false, true, 1]);
    // la striscia: il foglio si riduce, il tempo continua
    atteso('370 · il foglio ha «riduci»', !!a.doc.querySelector('.rest-hero-riduci'), true);
    a.win.riduciCountdown();
    atteso('370 · ridotto: niente foglio, la striscia in cima con tempo e prossimo esercizio, il conto va avanti', [!!a.doc.querySelector('.rest-modal-overlay'), !!a.doc.getElementById('rest-striscia'), /2:00/.test(testo(a.doc.getElementById('rest-striscia').innerHTML)), /Trazioni/.test(testo(a.doc.getElementById('rest-striscia').innerHTML)), !!a.ST._countdownInterval], [false, true, true, true, true]);
    cd.endTime = a.win.Date.now() + 95 * 1000; a.win.tickCountdown();
    atteso('370 · il tick aggiorna la striscia (1:35)', a.doc.querySelector('.rest-striscia-num').textContent, '1:35');
    a.win.apriCountdown();
    atteso('370 · un tocco riapre il foglio con lo stesso conto', [!!a.doc.querySelector('.rest-modal-overlay'), !!a.doc.getElementById('rest-striscia'), a.doc.querySelector('.rest-hero-cd-num').textContent], [true, false, '1:35']);
    a.win.riduciCountdown();
    cd.endTime = a.win.Date.now() - 1000; a.win.tickCountdown();
    atteso('370 · a zero il foglio torna da solo (PRONTO!) anche se era ridotto', [cd.done, cd.ridotto, /PRONTO/i.test(a.pagina())], [true, false, true]);
  }
  // 380 · il bip dopo un'altra app
  {
    const a = await nuovo();
    a.win.openTrainExec('upperA', 'Trazioni sbarra assistite', 1);
    a.win.trainExecFinishSet();        // «Fine serie» della 1 di 2: parte il recupero e si apre il registro
    a.scegli('tl-reps', '6'); a.scegli('tl-rir', '2'); a.ST.trainLogBandColor = 'Nera';
    await a.win.saveTrainingSet();
    const cd = a.ST.trainCountdown;
    atteso('380 · recupero in corso', [!!cd, cd && cd.seconds], [true, 120]);
    // l'altra app: iOS lascia il contesto «interrupted»; il tempo scade mentre si è via
    a.win.playPrepBeep();                                  // crea il contesto
    a.win.eval("_audioCtx.state = 'interrupted'");
    cd.endTime = a.win.Date.now() - 2000;
    const stop = a.conta('playStopBeep');
    // al rientro: prima l'audio, poi il tick
    Object.defineProperty(a.doc, 'visibilityState', { value:'visible', configurable:true });
    a.doc.dispatchEvent(new a.win.Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 30));
    atteso('380 · al rientro il recupero è scaduto: PRONTO e lo STOP è stato chiesto subito', [cd.done, stop() >= 1], [true, true]);
  }
  {
    // il bip che non può suonare resta in sospeso e parte al primo tocco
    const a = await nuovo();
    a.win.playPrepBeep();
    a.win.eval("_audioCtx.state = 'interrupted'");
    a.win.playStopBeep();
    atteso('380 · contesto interrotto: il bip resta in sospeso', a.win.eval('_beepInSospeso'), true);
    await new Promise(r => setTimeout(r, 20));
    // il contesto nuovo è «running» nel banco: _riattivaAudio lo rifà e il bip in sospeso suona
    atteso('380 · rifatto il contesto, il bip in sospeso è partito', a.win.eval('_beepInSospeso'), false);
    // se invece il contesto nuovo resta sospeso finché non si tocca: parte al primo tocco
    a.win.eval("_beepInSospeso = true; _audioCtx.state = 'suspended'; _audioGestureUnlocked = false; _armaSbloccoGesto();");
    a.doc.dispatchEvent(new a.win.Event('touchstart', { bubbles:true }));
    await new Promise(r => setTimeout(r, 20));
    atteso('380 · al primo tocco il contesto riparte e il bip in sospeso suona', [a.win.eval('_audioCtx.state'), a.win.eval('_beepInSospeso')], ['running', false]);
  }
  // 360 · l'alternato dice come si conta (Training 520: «per lato» sul bersaglio, al posto di «1 rip = dx + sx»)
  {
    const a = await nuovo();
    atteso('360 · la card del Crunch sforbiciata dice «2 × 12-20 per lato», la panca no', [/2 × 12-20 per lato/.test(testo(a.doc.getElementById('excard-Crunch_sforbiciata_ampia').innerHTML)), /per lato/.test(testo(a.doc.getElementById('excard-Panca_elastico').innerHTML))], [true, false]);
    a.win.openTrainExec('upperA', 'Crunch sforbiciata ampia', 1);
    atteso('360 · anche nella schermata di esecuzione', /12-20 per lato/.test(testo(a.doc.querySelector('.train-exec-overlay').innerHTML)), true);
    a.win.trainExecBack();
    a.win.openLogModal('upperA', 'Crunch sforbiciata ampia', 1);
    atteso('360 · alternato: una tendina sola (le due DX/SX sono per «si»)', !!a.doc.getElementById('tl-reps-sx'), false);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
