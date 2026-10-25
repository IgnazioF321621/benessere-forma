// Scheda tecnica dell'esercizio allineata al catalogo (13 ottobre 2026, dopo il Rilascio 38): il jsonb
// di schede_utente fotografa setup, esecuzione, errori, muscoli e nota di sicurezza alla generazione, e
// la correzione di EX647 nel catalogo non arrivava mai alla scheda in uso. loadActiveScheda ora riscrive
// quei campi in memoria con la stessa funzione del generatore (_trainGenTestiEsercizio): mai su DB.
//   node tools/banco/prova_testi_scheda.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
// Lo snapshot vecchio nel jsonb (com'era EX647 prima della correzione)
const VECCHIO = {
  codice:'EX647', name:'Squat calcio laterale', sets:3, reps:'8-12',
  setup:['In piedi, piedi larghi'], execution:['Scendi', 'Nel punto basso porta la mano verso il piede della gamba tesa, busto ruotato', 'Risali'],
  commonErrors:['Tallone che si stacca'], muscles:['quadricipiti'], alert:'Vecchia nota di sicurezza',
};
const scheda = () => ({ sessioni: [ { id:'lowerA', name:'Lower A', type:'Forza', rir:2,
  warmup:[ { codice:'EX083', name:'Slanci anca', sets:2, reps:'15-20', setup:['Vecchio setup'], execution:['Vecchia esecuzione'], commonErrors:[], muscles:['anca'], warmup:true } ],
  exercises:[
    JSON.parse(JSON.stringify(VECCHIO)),
    { codice:'EX002', name:'Panca piana bilanciere', sets:3, reps:'6-10', isSurrogato:true, setup:['Setup di palestra vecchio'], execution:['Spingi'], commonErrors:[], muscles:['pettorali'], alert:'Nota panca' },
    { codice:'EX999', name:'Esercizio sparito', sets:3, reps:'6-10', setup:['Resta'], execution:['Resta'], commonErrors:['Resta'], muscles:['resta'], alert:'Resta' },
    { codice:'EX050', name:'Stacco rumeno', sets:3, reps:'6-10', setup:['Setup vecchio'], execution:['Esecuzione vecchia'], commonErrors:['Errore vecchio'], muscles:['ischio'], alert:'Nota vecchia' },
  ],
  carry_conclusivo: { codice:'EX090', name:'Farmer walk', sets:3, reps:'30-40 m', setup:['Vecchio'], execution:['Vecchio'], commonErrors:[], muscles:['avambracci'], carry:true },
  finisher: { type:'tabata', exercises:[ { codice:'EX072', name:'Plank', setup:['Vecchio'], execution:['Vecchio'], commonErrors:[], muscles:['core'], alert:'Vecchia nota plank' } ] },
} ] });
const catalogo = [
  { codice:'EX647', nome:'Squat calcio laterale', setup:'In piedi, piedi a larghezza anche, braccia libere', esecuzione:'Scendi in accosciata piegando una gamba;Nel punto basso porta la mano verso il piede della gamba d\'appoggio, busto fermo (non ruota);Spingi dal tallone per risalire', errori:'Tallone della gamba piegata che si stacca;Busto che ruota verso la gamba tesa invece di restare fermo', nota_sicurezza:'Il tocco del piede d\'appoggio e la conseguenza della discesa, non il suo obiettivo', adattamento:'ginocchia: riduci la profondita', zone_rischio:'ginocchia;anca', muscoli:'quadricipiti;glutei;adduttori;core' },
  { codice:'EX002', nome:'Panca piana bilanciere', setup:'Sdraiato sulla panca, piedi a terra', esecuzione:'Spingi il bilanciere', errori:'Gomiti aperti', nota_sicurezza:'', surrogato_attrezzo:'panca+elastico', nota_surrogato:'Elastico sotto la panca, impugnature alle mani', muscoli:'pettorali;tricipiti' },
  { codice:'EX050', nome:'Stacco rumeno', setup:'', esecuzione:'', errori:'', nota_sicurezza:'', muscoli:'' },   // tutto vuoto: resta lo snapshot
  { codice:'EX083', nome:'Slanci anca', setup:'Nuovo setup', esecuzione:'Nuova esecuzione', errori:'', nota_sicurezza:'Nota warmup', muscoli:'anca;glutei' },
  { codice:'EX090', nome:'Farmer walk', setup:'Nuovo', esecuzione:'Cammina', errori:'', nota_sicurezza:'Nota carry', muscoli:'avambracci;trapezio' },
  { codice:'EX072', nome:'Plank', setup:'Gomiti sotto le spalle', esecuzione:'Tieni', errori:'Bacino che cade', nota_sicurezza:'Nuova nota plank', muscoli:'core' },
];
function fixture(o){
  o = o || {};
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', note_salute: o.note_salute || 'Esperienza: avanzato' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: scheda() }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
    ...(o.tabelle || {}),
  };
}
async function nuovo(o){
  const t = fixture(o);
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  const ex = (n) => b.win.findExercise(n, 'lowerA');
  const sess = b.win.getTrainingSession('lowerA');
  return { ...b, ST, t, ex, sess };
}
(async () => {
  // 1 · il testo nuovo del catalogo arriva alla scheda in uso, nel formato del generatore
  {
    const a = await nuovo();
    const e = a.ex('Squat calcio laterale');
    atteso('EX647 · l\'esecuzione è quella corretta, spezzata sui «;»', e.execution, ['Scendi in accosciata piegando una gamba', 'Nel punto basso porta la mano verso il piede della gamba d\'appoggio, busto fermo (non ruota)', 'Spingi dal tallone per risalire']);
    atteso('EX647 · errori, setup, muscoli nuovi', [e.commonErrors.length, e.setup, e.muscles], [2, ['In piedi, piedi a larghezza anche, braccia libere'], ['quadricipiti', 'glutei', 'adduttori', 'core']]);
    atteso('EX647 · alert = nota di sicurezza nuova (nessuna limitazione: niente adattamento)', e.alert, 'Il tocco del piede d\'appoggio e la conseguenza della discesa, non il suo obiettivo');
    atteso('EX647 · nel jsonb vecchio non resta traccia del testo vecchio', JSON.stringify(e).includes('busto ruotato'), false);
    // identico a una scheda rigenerata oggi: la stessa funzione
    const riga = a.win._trainGenPulisciRiga({ ...catalogo[0] });
    const t = a.win._trainGenTestiEsercizio(riga, { isSurrogato:false, cautionNote:'' });
    atteso('EX647 · uguale a ciò che il generatore scriverebbe oggi', [e.setup, e.execution, e.commonErrors, e.muscles, e.alert], [t.setup, t.execution, t.commonErrors, t.muscles, t.alert]);
    atteso('surrogato · la nota_surrogato prende il posto del setup, come alla generazione', a.ex('Panca piana bilanciere').setup, ['Elastico sotto la panca, impugnature alle mani']);
    atteso('surrogato · nota di sicurezza vuota a catalogo: resta l\'alert di prima', a.ex('Panca piana bilanciere').alert, 'Nota panca');
    atteso('campi vuoti a catalogo · resta lo snapshot', [a.ex('Stacco rumeno').setup, a.ex('Stacco rumeno').execution, a.ex('Stacco rumeno').alert], [['Setup vecchio'], ['Esecuzione vecchia'], 'Nota vecchia']);
    atteso('codice sparito dal catalogo · resta lo snapshot', a.ex('Esercizio sparito').execution, ['Resta']);
    // dalla revisione di 480+490 il riscaldamento ha l'avviso come il lavoro (nota di sicurezza e adattamento per le limitazioni)
    atteso('riscaldamento · elenchi nuovi e l\'avviso dal catalogo, come il lavoro', [a.sess.warmup[0].setup, a.sess.warmup[0].muscles, a.sess.warmup[0].alert], [['Nuovo setup'], ['anca', 'glutei'], 'Nota warmup']);
    atteso('carry · elenchi nuovi, niente alert', [a.sess.carry_conclusivo.execution, 'alert' in a.sess.carry_conclusivo], [['Cammina'], false]);
    atteso('finisher · testi e alert nuovi', [a.sess.finisher.exercises[0].commonErrors, a.sess.finisher.exercises[0].alert], [['Bacino che cade'], 'Nuova nota plank']);
    atteso('una lettura sola del catalogo in loadActiveScheda, coi campi dei testi', a.supa._calls.filter(c => c.table === 'esercizi_catalog').map(c => /setup, esecuzione, errori, nota_sicurezza/.test(c.cols)), [true]);
    atteso('il jsonb non si riscrive mai', a.supa._calls.filter(c => c.table === 'schede_utente' && c.op !== 'select').length, 0);
  }
  // 2 · con una limitazione sulle ginocchia l'adattamento entra nell'alert, come alla generazione
  {
    const a = await nuovo({ note_salute: 'Esperienza: avanzato · Limitazioni: ginocchia' });
    atteso('limitazione ginocchia · alert = nota di sicurezza · adattamento', a.ex('Squat calcio laterale').alert, 'Il tocco del piede d\'appoggio e la conseguenza della discesa, non il suo obiettivo · Ginocchia: riduci la profondita');
  }
  // 3 · catalogo irraggiungibile: tutto come nello snapshot
  {
    const a = await nuovo({ tabelle: { __assenti: ['esercizi_catalog'] } });
    const e = a.ex('Squat calcio laterale');
    atteso('catalogo irraggiungibile · lo snapshot resta intero', [e.execution[1], e.alert, e.name], ['Nel punto basso porta la mano verso il piede della gamba tesa, busto ruotato', 'Vecchia nota di sicurezza', 'Squat calcio laterale']);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
