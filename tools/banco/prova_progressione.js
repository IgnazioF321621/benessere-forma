// Training 100 (Ondata 5, 14 ottobre 2026): grafici di Progressione validi per tutti gli esercizi.
// La misura è quella dell'esercizio: carico (unità dal profilo) per chi un carico ce l'ha, gradino di
// banda per le trazioni, secondi per le tenute, ripetizioni per il corpo libero. Il quinto giorno
// (Upper Pump) sta nell'elenco «Per programma». Il testo non rimanda più a una scheda che non c'è.
//   node tools/banco/prova_progressione.js
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
const dormi = (ms) => new Promise(r => setTimeout(r, ms));

const scheda = { sessioni: [
  { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
    { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10' },
    { codice:'EX008', name:'Trazioni sbarra assistite', sets:3, reps:'6-10' },
    { codice:'EX072', name:'Plank', sets:2, reps:'20-40 sec', iso:true, durationBased:true, isTimed:true },
    { codice:'EX004', name:'Piegamenti', sets:3, reps:'8-12' },
  ] },
  { id:'lowerA', name:'Lower A', type:'Forza', rir:2, exercises:[ { codice:'EX040', name:'Squat elastico', sets:3, reps:'6-10' } ] },
  { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, exercises:[ { codice:'EX002', name:'Piegamenti stretti', sets:3, reps:'8-12' } ] },
  { id:'lowerB', name:'Lower B', type:'Ipertrofia', rir:1, exercises:[ { codice:'EX041', name:'Affondi', sets:3, reps:'8-12' } ] },
  { id:'upperC', name:'Upper Pump', type:'Pump', rir:0, exercises:[ { codice:'EX060', name:'Curl elastico', sets:3, reps:'15-20' } ] },
] };
const D = ['2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11'];
const log = (id, d, nome, codice, set, reps, resistance, band) => ({ id, user_id:U, session_id:'upperA', date:d, exercise_name:nome, exercise_code:codice, set_number:set, reps, resistance, band_color: band || null, rir_actual:2 });
function fixture(o){
  o = o || {};
  const logs = [];
  // panca: carico che sale 20 → 30 → 30 → 40
  [20, 30, 30, 40].forEach((w, i) => { logs.push(log(`p${i}a`, D[i], 'Panca elastico', 'EX001', 1, 8, String(w))); logs.push(log(`p${i}b`, D[i], 'Panca elastico', 'EX001', 2, 7, String(w))); });
  // trazioni: Viola → Nera → Nera → Rossa (meno assistenza)
  ['Viola', 'Nera', 'Nera', 'Rossa'].forEach((b, i) => logs.push(log(`t${i}`, D[i], 'Trazioni sbarra assistite', 'EX008', 1, 6, null, b)));
  // plank: 20 → 30 → 35 → 40 secondi
  [20, 30, 35, 40].forEach((sec, i) => logs.push(log(`k${i}`, D[i], 'Plank', 'EX072', 1, sec, null)));
  // piegamenti: 8 → 10 → 12 → 12 ripetizioni, a corpo libero
  [8, 10, 12, 12].forEach((r, i) => { logs.push(log(`g${i}a`, D[i], 'Piegamenti', 'EX004', 1, r, null)); logs.push(log(`g${i}b`, D[i], 'Piegamenti', 'EX004', 2, r - 1, null)); });
  logs.push(log('c0', D[3], 'Curl elastico', 'EX060', 1, 15, '10'));
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit: o.unit || 'kg', train_start_date:'2026-09-14' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico' }, { codice:'EX008', nome:'Trazioni sbarra assistite' }, { codice:'EX072', nome:'Plank' }, { codice:'EX004', nome:'Piegamenti' }, { codice:'EX060', nome:'Curl elastico' }],
    training_logs: logs,
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
  ST.page = 'training'; ST.trainTab = 'progressione'; ST.trainSession = null;
  b.win.renderTraining();
  const doc = b.win.document;
  const pagina = () => testo(doc.getElementById('page-training').innerHTML);
  const apri = async (nome, chip) => { ST.trainProgChart = chip || 'carico'; await b.win.loadTrainingLogs(nome); b.win.renderTraining(); };
  const svg = () => doc.querySelector('#page-training svg');
  const chips = () => [...doc.querySelectorAll('.prog-chip')].map(e => e.textContent.trim());
  const stat = () => [...doc.querySelectorAll('.prog-stat-card')].map(e => testo(e.innerHTML));
  return { ...b, ST, t, doc, pagina, apri, svg, chips, stat };
}
(async () => {
  const a = await nuovo();
  // la misura
  const m = (n) => { const x = a.win.progMisura(n, a.t.training_logs.filter(l => l.exercise_name === n)); return [x.tipo, x.unit, x.label]; };
  atteso('misura · carico con l\'unità del profilo (kg), banda per le trazioni, secondi per la tenuta, ripetizioni a corpo libero',
    [m('Panca elastico'), m('Trazioni sbarra assistite'), m('Plank'), m('Piegamenti')],
    [['carico', 'kg', 'CARICO'], ['banda', '', 'ASSISTENZA'], ['sec', 'sec', 'TENUTA'], ['reps', 'reps', 'RIPETIZIONI']]);
  const mb = a.win.progMisura('Trazioni sbarra assistite', []);
  atteso('misura · la scala delle bande: Viola 0 … corpo libero 4, e il nome dal numero', [mb.valore({ band_color:'Viola' }), mb.valore({ band_color:'Rossa' }), mb.valore({ band_color:'Corpo libero' }), mb.testo(3)], [0, 2, 4, 'Gialla']);
  // panca: carico in kg
  await a.apri('Panca elastico');
  atteso('panca · chip con 1RM, kg e non lbs, best 40 kg, trend +10', [a.chips(), /lbs/.test(a.pagina()), a.stat()[0], a.stat()[3]], [['Carico', '1RM Stimato', 'Volume Totale', 'Zone'], false, 'BEST CARICO 40 kg', 'TREND ↑ +10 kg']);
  atteso('panca · il grafico dice CARICO · 40 KG e parla di carico', [/CARICO · 40 KG/.test(testo(a.svg().innerHTML)), /il carico sale/i.test(a.pagina())], [true, true]);
  // trazioni: la banda
  await a.apri('Trazioni sbarra assistite');
  atteso('trazioni · niente 1RM, la chip si chiama Banda, best Rossa, ultima Rossa', [a.chips(), a.stat()[0], a.stat()[1]], [['Banda', 'Volume Totale', 'Zone'], 'BEST ASSISTENZA Rossa', 'ULTIMA Rossa']);
  atteso('trazioni · il grafico non è piatto: i gradini salgono, le tacche hanno i nomi delle bande', [/ASSISTENZA · Rossa/.test(testo(a.svg().innerHTML)), /Viola/.test(testo(a.svg().innerHTML)), /corpo/.test(testo(a.svg().innerHTML)), /meno assistenza/.test(a.pagina())], [true, true, true, true]);
  a.ST.trainProgChart = '1rm'; a.win.renderTraining();
  atteso('trazioni · chiedere il 1RM riporta alla banda', /ASSISTENZA · Rossa/.test(testo(a.svg().innerHTML)), true);
  // plank: secondi
  await a.apri('Plank');
  atteso('plank · tenuta in secondi, best 40, trend +12.5 sec', [a.chips()[0], a.stat()[0], a.stat()[3], /TENUTA · 40 SEC/.test(testo(a.svg().innerHTML))], ['Tenuta', 'BEST TENUTA 40 sec', 'TREND ↑ +12.5 sec', true]);
  await a.apri('Plank', 'volume');
  atteso('plank · il volume è in secondi totali', /VOLUME · 40 SEC/.test(testo(a.svg().innerHTML)), true);
  // piegamenti: ripetizioni
  await a.apri('Piegamenti');
  atteso('piegamenti · ripetizioni, best 12, ultima 12, trend +3', [a.chips()[0], a.stat()[0], a.stat()[1], a.stat()[3], /RIPETIZIONI · 12 REPS/.test(testo(a.svg().innerHTML))], ['Ripetizioni', 'BEST RIPETIZIONI 12 reps', 'ULTIMA 12 reps', 'TREND ↑ +3 reps', true]);
  await a.apri('Piegamenti', 'volume');
  atteso('piegamenti · volume = ripetizioni totali del giorno (12 + 11)', /VOLUME · 23 REPS/.test(testo(a.svg().innerHTML)), true);
  // l'elenco «Per programma» col quinto giorno
  a.ST.trainProgDropdownOpen = true; a.ST.trainProgDropdownTab = 'programma'; a.win.renderTraining();
  const elenco = a.pagina();
  atteso('elenco · Upper Pump c\'è, nell\'ordine della scheda, e il quinto giorno porta il suo esercizio', [/Upper Pump/.test(elenco), /Curl elastico/.test(elenco), elenco.indexOf('Upper Pump') > elenco.indexOf('Lower B')], [true, true, true]);
  a.ST.trainProgDropdownTab = 'esercizio'; await a.win.loadAllExerciseNamesWithLast(); a.win.renderTraining();
  const perEs = a.pagina();
  atteso('elenco · «Per esercizio»: l\'ultima serie con kg, la banda col nome, il corpo libero detto', [/8 reps · 40 kg/.test(perEs), /6 reps · Rossa/.test(perEs), /12 reps · corpo libero/.test(perEs)], [true, true, true]);
  a.ST.trainProgDropdownOpen = false;
  // il testo senza storico
  a.t.training_logs.length = 0;
  await a.apri('Squat elastico');
  atteso('testo · niente «tab Sessione»: dice di registrare le serie durante l\'allenamento', [/tab Sessione/.test(a.pagina()), /durante l'allenamento/.test(a.pagina())], [false, true]);
  // lbs per chi usa le libbre
  const b = await nuovo({ unit:'lbs' });
  await b.apri('Panca elastico');
  atteso('unità · con il profilo in libbre resta lbs', [b.stat()[0], /CARICO · 40 LBS/.test(testo(b.svg().innerHTML))], ['BEST CARICO 40 lbs', true]);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
