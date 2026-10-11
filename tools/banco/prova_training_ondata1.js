// Ondata 1, Sessione A (Training, 11 ottobre 2026): serie a ripetizioni in silenzio (030), ripetizioni e RIR
// con memoria (020), 3-2-1 sul cronometro della tenuta (300), audio «interrotto» rifatto al rientro (340),
// recupero anche fra un esercizio e l'altro (290), finestre della seduta alte quanto lo schermo vero (270, app/stile.css).
//   node tools/banco/prova_training_ondata1.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-11';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, rest:'3 min', exercises:[
  { codice:'EX001', name:'Panca elastico', sets:1, reps:'6-10', rest_sec:120 },
  { codice:'EX020', name:'Rematore elastico', sets:2, reps:'6-10', rest_sec:90 },
  { codice:'EX072', name:'Plank', sets:1, reps:'20-40 sec', iso:true, durationBased:true, isTimed:true, rest_sec:60 },
] } ] };
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico' }, { codice:'EX020', nome:'Rematore elastico' }, { codice:'EX072', nome:'Plank' }],
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
  b.win.renderTraining();
  const doc = b.win.document;
  const scegli = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new b.win.Event('change', { bubbles:true })); };
  const conta = (nome) => { let n = 0; const orig = b.win[nome]; b.win[nome] = () => { n++; }; return () => { b.win[nome] = orig; return n; }; };
  return { ...b, ST, t, doc, scegli, conta };
}
(async () => {
  // 030 · serie a ripetizioni: nessun conto nascosto, nessuno STOP; la tenuta invece parte da «Avvia»
  {
    const a = await nuovo();
    const stop = a.conta('playStopBeep');
    a.win.openTrainExec('upperA', 'Panca elastico', 1);
    atteso('030 · ripetizioni: il cronometro di esecuzione non parte', !!(a.ST.trainExecTimer && a.ST.trainExecTimer.running), false);
    a.win.trainExecBack();
    a.win.openTrainExec('upperA', 'Plank', 1);
    atteso('030 · tenuta: prima di «Avvia» niente cronometro', !!(a.ST.trainExecTimer && a.ST.trainExecTimer.running), false);
    a.win.execTimerLaunch();
    atteso('030 · tenuta: dopo «Avvia» il cronometro corre dal target', [a.ST.trainExecTimer.running, a.ST.trainExecTimer.remaining], [true, 20]);
    atteso('030 · nessuno STOP suonato finora', stop(), 0);
  }
  // 300 · 3-2-1 sul cronometro della tenuta, una volta per secondo, poi lo STOP
  {
    const a = await nuovo();
    a.win.openTrainExec('upperA', 'Plank', 1); a.win.execTimerLaunch();
    const prep = a.conta('playPrepBeep'), stop = a.conta('playStopBeep');
    const t = a.ST.trainExecTimer; const ora = a.win.Date.now();
    [5, 4, 3, 3, 2, 1, 0].forEach(s => { t.endTime = ora + s * 1000; a.win._execTimerTick(); });
    atteso('300 · tre tic (a 3, 2, 1) e uno STOP a zero; il 3 ripetuto non suona due volte', [prep(), stop()], [3, 1]);
  }
  // 020 · ripetizioni e RIR restano scelti anche dopo un ridisegno
  {
    const a = await nuovo();
    a.win.openLogModal('upperA', 'Rematore elastico', 1);
    a.scegli('tl-reps', '8'); a.scegli('tl-rir', '2');
    a.win.renderTraining();
    atteso('020 · dopo il ridisegno le tendine dicono ancora 8 e RIR 2', [a.doc.getElementById('tl-reps').value, a.doc.getElementById('tl-rir').value, a.ST.trainLogDraft], ['8', '2', { reps:'8', rir:'2' }]);
    a.ST.trainLogOpen = null; a.win.renderTraining();
    a.win.openLogModal('upperA', 'Rematore elastico', 1);
    atteso('020 · riaprendo il registro la bozza riparte vuota', [a.doc.getElementById('tl-reps').value, a.ST.trainLogDraft], ['', { reps:'', rir:'' }]);
    a.win.openLogModal('upperA', 'Plank', 1, { timedTarget: 30 });
    await new Promise(r => setTimeout(r, 30));
    atteso('020 · esercizio a tempo: la durata scelta nel picker resta anche dopo un ridisegno', (a.win.renderTraining(), a.doc.getElementById('tl-reps').value), '30');
  }
  // 290 · recupero anche fra un esercizio e l'altro, con GIF e consigli del prossimo
  {
    const a = await nuovo();
    a.win.openLogModal('upperA', 'Panca elastico', 1);
    a.scegli('tl-reps', '8'); a.scegli('tl-rir', '2');
    await a.win.saveTrainingSet();
    const cd = a.ST.trainCountdown;
    atteso('290 · ultima serie della Panca → parte il recupero verso il Rematore, 120 s (recupero della Panca)', [cd && cd.traEsercizi, cd && cd.exName, cd && cd.daEx, cd && cd.total], [true, 'Rematore elastico', 'Panca elastico', 120]);
    const testo = a.doc.querySelector('.rest-modal-overlay') ? a.doc.querySelector('.rest-modal-overlay').textContent.replace(/\s+/g, ' ') : '';
    atteso('290 · la finestra dice «Prossimo esercizio» e nomina il Rematore', [/Prossimo esercizio/.test(testo), /Rematore elastico/.test(testo)], [true, true]);
    a.win.skipCountdown();
    // serie intermedia del Rematore: recupero normale (come prima)
    a.win.openLogModal('upperA', 'Rematore elastico', 1); a.scegli('tl-reps', '8'); a.scegli('tl-rir', '2');
    a.ST.trainExecOpen = null;
    await a.win.saveTrainingSet();
    atteso('290 · serie intermedia: il recupero fra due serie resta quello di sempre', [!!a.ST.trainCountdown, a.ST.trainCountdown ? a.ST.trainCountdown.traEsercizi : null], [false, null]);
    // ultima serie dell'ultimo esercizio: sessione completa, nessun recupero
    a.win.openLogModal('upperA', 'Rematore elastico', 2); a.scegli('tl-reps', '8'); a.scegli('tl-rir', '2');
    await a.win.saveTrainingSet();
    a.win.openLogModal('upperA', 'Plank', 1, { timedTarget: 30 });
    await new Promise(r => setTimeout(r, 30));
    await a.win.saveTrainingSet();
    atteso('290 · dopo l\'ultimo esercizio nessun recupero', !!a.ST.trainCountdown, false);
  }
  // 340 · audio «interrotto» al rientro: contesto nuovo e sblocco riarmato
  {
    const a = await nuovo();
    let creati = 0;
    const fai = (state) => { creati++; return { createOscillator:()=>({connect(){},start(){},stop(){},frequency:{}}), createGain:()=>({connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){}}}), currentTime:0, destination:{}, state, resume(){ return Promise.resolve(); }, close(){ return Promise.resolve(); } }; };
    let stato = 'interrupted';
    a.win.AudioContext = function(){ return fai(stato); }; a.win.webkitAudioContext = a.win.AudioContext;
    a.win.eval('_audioCtx = null; _ensureAudioCtx();');
    atteso('340 · un contesto creato, in stato «interrupted»', [creati, a.win.eval('_audioCtx.state')], [1, 'interrupted']);
    stato = 'running';
    await a.win._riattivaAudio();
    atteso('340 · al rientro il contesto viene rifatto e lo sblocco al tocco è riarmato', [creati, a.win.eval('_audioCtx.state'), a.win.eval('_audioGestureUnlocked')], [2, 'running', false]);
    await a.win._riattivaAudio();
    atteso('340 · con l\'audio che corre non si rifà niente', creati, 2);
  }
  // 270 · le finestre della seduta misurano lo schermo vero (dvh, con ripiego) e rispettano l'area sicura
  {
    const css = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'stile.css'), 'utf8');
    const blocco = (sel) => { const i = css.indexOf('\n' + sel + '{'); return i === -1 ? '' : css.slice(i, css.indexOf('}', i)); };
    const rm = blocco('.rest-modal-container'), ex = blocco('.train-exec-overlay');
    atteso('270 · .rest-modal-container: max-height 100vh poi 100dvh, area sicura in basso', [/max-height:\s*100vh/.test(rm), /max-height:\s*100dvh/.test(rm), /padding-bottom:\s*env\(safe-area-inset-bottom\)/.test(rm), rm.indexOf('100vh') < rm.indexOf('100dvh')], [true, true, true, true]);
    atteso('270 · .train-exec-overlay: height 100vh poi 100dvh', [/height:\s*100vh/.test(ex), /height:\s*100dvh/.test(ex), ex.indexOf('100vh') < ex.indexOf('100dvh')], [true, true, true]);
    atteso('270 · nessun colore scritto a mano nelle righe aggiunte', /#[0-9a-fA-F]{3,6}|rgb\(/.test(rm.split('Training 270')[1] || '') || /#[0-9a-fA-F]{3,6}|rgb\(/.test(ex.split('Training 270')[1] || ''), false);
  }
  console.log(ko ? ko + ' KO' : 'tutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
