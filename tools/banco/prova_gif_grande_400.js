// Training 400 (14 ottobre 2026, richiesta di Ignazio): nella scheda dell'esercizio niente più immagine dei
// muscoli accanto alla GIF (la GIF i muscoli li mostra già in rosso), la GIF a tutta larghezza; senza GIF il
// riquadro «Immagine non ancora disponibile» (scelta di Ignazio), mai un buco.
//   node tools/banco/prova_gif_grande_400.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const GIF = 'https://qxiyeiahpoiliwpqslpr.supabase.co/storage/v1/object/public/biblioteca-gif/Schiena/thread.gif';
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
  { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10', rest_sec:120, execution:['Spingi'] },
] } ] };
async function nuovo(media){
  const t = {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico' }],
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  b.win.callAI = async () => '';
  b.win.cuePer = async () => '';
  let risolvi;
  b.win.fetchExerciseMedia = () => new Promise(r => { risolvi = () => r(media); });
  const doc = b.win.document;
  const scheda_ = () => doc.querySelector('.info-modal');
  return { ...b, ST, doc, scheda_, arriva: async () => { risolvi(); await new Promise(r => setTimeout(r, 20)); } };
}
(async () => {
  {
    const a = await nuovo({ status:'cached', cached_url: GIF });
    a.win.openExerciseAI('Panca elastico', 'upperA');
    atteso('in attesa: un riquadro solo, a tutta larghezza, che si carica', [a.scheda_().querySelectorAll('.ex-media-gif').length, !!a.scheda_().querySelector('.ex-media-gif.ex-media-skeleton')], [1, true]);
    await a.arriva();
    const imgs = [...a.scheda_().querySelectorAll('img')];
    atteso('con la GIF: un\'immagine sola, la GIF, a tutta larghezza', imgs.map(i => [i.getAttribute('src'), i.className]), [[GIF, 'ex-media-gif']]);
    atteso('niente immagine dei muscoli, niente griglia a due celle', [/Muscoli coinvolti/.test(a.scheda_().innerHTML.replace(/<h4>[^<]*<\/h4>/g, '')), !!a.scheda_().querySelector('.ex-media-grid')], [false, false]);
  }
  {
    const a = await nuovo({ status:'missing' });
    a.ST.trainSession = 'recoveryUpper';
    a.win.openExerciseAI('Rotazione toracica seduto dx', 'recoveryUpper');
    await a.arriva();
    const vuoto = a.scheda_().querySelector('.ex-media-vuoto');
    atteso('senza GIF (rotazione da seduto): il riquadro «Immagine non ancora disponibile», nessuna immagine', [vuoto && vuoto.textContent, a.scheda_().querySelectorAll('img').length], ['Immagine non ancora disponibile', 0]);
  }
  {
    const a = await nuovo({ status:'missing' });
    a.ST.trainSession = 'recoveryUpper';
    a.win.openExerciseAI('Hip CARs dx', 'recoveryUpper');
    await a.arriva();
    atteso('Hip CARs aveva la vecchia mappa dei muscoli: ora il riquadro, non la mappa', [a.scheda_().querySelectorAll('img').length, !!a.scheda_().querySelector('.ex-media-vuoto')], [0, true]);
  }
  // nessun file dell'app richiama più le immagini dei muscoli
  const radice = path.join(__dirname, '../..');
  const sorgenti = ['zona-tracker.html', 'sw.js', ...fs.readdirSync(path.join(radice, 'app')).map(f => 'app/' + f), ...fs.readdirSync(path.join(radice, 'shared')).map(f => 'shared/' + f)];
  const chi = sorgenti.filter(f => /-muscoli\.png|muscleImg/.test(fs.readFileSync(path.join(radice, f), 'utf8')));
  atteso('nessun file dell\'app nomina muscleImg o *-muscoli.png', chi, []);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
