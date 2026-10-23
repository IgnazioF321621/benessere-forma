// Training 470 (23 ottobre 2026, due segnalazioni di Ignazio dal telefono, Rilascio 50):
//   «se tocco fine serie la musica si interrompe» e «il bip non c'è completamente», anche nel Blocco attivazione.
// La sessione audio della pagina diventa «ambient» prima di creare o riprendere il contesto (i bip suonano
// sopra la musica, non al posto suo); tutti i timer suonano da un posto solo (_suonaTono), che su un contesto
// «interrupted» lo rifà invece di suonare nel vuoto. Mai <audio> né Media Session (Training 450).
//   node tools/banco/prova_training_470.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-23';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const aspetta = (ms) => new Promise(r => setTimeout(r, ms || 20));
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
  { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10', rest_sec:90 },
] } ] };

async function nuovo(){
  const t = {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico' }],
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const W = b.win;
  // La sessione audio di Safari (16.4+) e un contesto che conta i suoni e dice con che sessione è nato
  const sessione = { type:'auto' };
  Object.defineProperty(W.navigator, 'audioSession', { value: sessione, configurable:true });
  const contesti = [];
  // come iPhone (revisione del Rilascio 51): un contesto rifatto parte «suspended»; `senzaTocco` dice se il
  // telefono lo lascia riprendere senza un tocco. Il primo contesto parte in corsa, come dopo lo sblocco.
  const telefono = { senzaTocco: true, tocco: false };
  W.AudioContext = function(){
    const c = { suoni:0, nato:sessione.type, currentTime:0, destination:{}, state: contesti.length ? 'suspended' : 'running',
      createOscillator(){ return { connect(){}, start(){ c.suoni++; }, stop(){}, frequency:{} }; },
      createGain(){ return { connect(){}, gain:{ setValueAtTime(){}, linearRampToValueAtTime(){} } }; },
      resume(){ c.ripresa = sessione.type; if(c.state !== 'closed' && (telefono.senzaTocco || telefono.tocco)) c.state = 'running'; return Promise.resolve(); },
      close(){ c.state = 'closed'; return Promise.resolve(); } };
    contesti.push(c); return c;
  };
  W.addEventListener('touchend', () => { telefono.tocco = true; }, true);   // sulla finestra: prima dello sblocco dell'app
  W.webkitAudioContext = W.AudioContext;
  W.eval('_audioCtx = null');
  return { ...b, W, sessione, contesti, telefono };
}

(async () => {
  {
    const a = await nuovo();
    a.W.playPrepBeep();
    atteso('il primo contesto nasce con la sessione «ambient» (prima era «auto»: fermava la musica)', [a.contesti.length, a.contesti[0] && a.contesti[0].nato, a.sessione.type], [1, 'ambient', 'ambient']);
    atteso('contesto in corsa: il tic suona', a.contesti[0].suoni, 1);
    // un'altra app riprende la musica: la sessione torna di default e il contesto si sospende
    a.sessione.type = 'auto'; a.contesti[0].state = 'suspended';
    a.W.dismissAudioBanner();
    await aspetta();
    atteso('il resume (il tocco su «Fine serie») avviene con la sessione «ambient»', a.contesti[0].ripresa, 'ambient');
  }
  {
    // il caso del bip «che non c'è proprio»: contesto rimasto «interrupted» dopo la musica
    const a = await nuovo();
    a.W.playPrepBeep();
    a.contesti[0].state = 'interrupted';
    a.W.playPrepBeep();
    await aspetta();
    atteso('contesto interrotto: i bip non suonano nel vuoto, il contesto si rifà', [a.contesti[0].suoni, a.contesti.length], [1, 2]);
    // revisione del Rilascio 51: se il telefono lascia riprendere senza tocco, il tic che ha scoperto
    // l'interruzione (uno solo, nessun altro bip dopo) suona sul contesto nuovo; prima rifai() diceva sempre
    // «no» e quel tic si perdeva
    atteso('il contesto nuovo si riprende subito e il tic che ha scoperto l\'interruzione suona lì', [a.contesti[1].state, a.contesti[1].suoni], ['running', 1]);
  }
  {
    // se invece iPhone vuole un tocco: quel tic si perde, i successivi suonano dopo il primo tocco
    const a = await nuovo();
    a.telefono.senzaTocco = false;
    a.W.playPrepBeep();
    a.contesti[0].state = 'interrupted';
    a.W.playPrepBeep();
    await aspetta();
    atteso('senza un tocco: contesto nuovo sospeso, nessun suono nel vuoto', [a.contesti.length, a.contesti[1].state, a.contesti[1].suoni], [2, 'suspended', 0]);
    a.W.document.dispatchEvent(new a.W.Event('touchend'));
    await aspetta();
    a.W.playPrepBeep();
    await aspetta();
    atteso('dopo il tocco il contesto nuovo corre e il tic suona lì', [a.contesti[1].state, a.contesti[1].suoni > 0], ['running', true]);
  }
  {
    // il bip di stop su contesto interrotto resta in sospeso e suona appena il contesto riparte (380, invariato)
    const a = await nuovo();
    a.telefono.senzaTocco = false;
    a.W.playPrepBeep();
    a.contesti[0].state = 'interrupted';
    a.W.playStopBeep();
    await aspetta();
    atteso('bip di stop su contesto interrotto, senza tocco: resta in sospeso', [a.W.eval('_beepInSospeso'), a.contesti[1].suoni], [true, 0]);
    a.W.document.dispatchEvent(new a.W.Event('touchend'));
    await aspetta(40);
    atteso('bip di stop in sospeso: suona al primo tocco sul contesto nuovo', a.contesti[1].suoni, 1);
  }
  {
    // tutti i timer suonano dallo stesso posto, e nessun file crea <audio> o tocca la Media Session
    const radice = path.join(__dirname, '../..');
    const sorgenti = ['zona-tracker.html', ...fs.readdirSync(path.join(radice, 'app')).filter(f => /\.js$/.test(f)).map(f => 'app/' + f)];
    const oscillatori = sorgenti.reduce((n, f) => n + (fs.readFileSync(path.join(radice, f), 'utf8').match(/createOscillator\(/g) || []).length, 0);
    atteso('un solo oscillatore in tutta l\'app: recupero, attivazione, riscaldamento, tenute e Tabata passano da _suonaTono', oscillatori, 1);
    const media = sorgenti.filter(f => /new Audio\(|mediaSession|createElement\(['"](audio|video)/.test(fs.readFileSync(path.join(radice, f), 'utf8')));
    atteso('nessun <audio>, nessuna Media Session', media, []);
  }
  {
    // il Blocco attivazione suona i tic negli ultimi 5 secondi e il bip a zero
    // (Vacuum addominale, lo screenshot di Ignazio): stessi tic, stesso contesto
    const a = await nuovo();
    a.W.eval("ST.page = 'training';");
    a.W.activationFlowStart();
    const prima = a.contesti[0] ? a.contesti[0].suoni : 0;
    const f = a.W.eval('ST.trainActivationFlow');
    f.endTime = a.W.Date.now() + 4500; a.W._activationFlowTick();
    f.endTime = a.W.Date.now() + 3500; a.W._activationFlowTick();
    await aspetta();
    atteso('Blocco attivazione: il bip di partenza e poi i tic negli ultimi secondi, sul contesto «ambient»', [prima >= 1, a.contesti[0].suoni - prima, a.contesti[0].nato], [true, 2, 'ambient']);
    a.W.eval('activationFlowPause && activationFlowPause()');
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
