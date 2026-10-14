// Training 160 (Ondata 5, 14 ottobre 2026): «Cambia per oggi». Attrezzo occupato o movimento che dà
// fastidio: si sostituisce l'esercizio solo per oggi, la scheda non cambia, le serie si salvano sotto
// l'esercizio scelto col suo codice. Chiude anche il limite della variante facile (330): dal foglio
// della variante si può dire «faccio questa oggi».
//   node tools/banco/prova_cambio_oggi.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const dormi = (ms) => new Promise(r => setTimeout(r, ms));

const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
  { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10', rest_sec:120, setup:['Vecchio'], execution:['Vecchio'], commonErrors:[], muscles:['pettorali'] },
  { codice:'EX020', name:'Rematore elastico', sets:3, reps:'6-10', rest_sec:90 },
  { codice:'EX060', name:'Curl elastico', sets:3, reps:'10-15', rest_sec:60, iso:true },
] } ] };
const catalogo = [
  { codice:'EX001', nome:'Panca elastico', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'intermedio', attrezzo:'elastico', luogo:'casa', alternativa:'EX003', setup:'Elastico dietro la schiena', esecuzione:'Spingi', errori:'', nota_sicurezza:'', muscoli:'pettorali;tricipiti', unilaterale:'no', progressione:'elastico più duro' },
  { codice:'EX003', nome:'Chest press elastico', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'intermedio', attrezzo:'elastico', luogo:'casa', setup:'Elastico ancorato dietro;Piedi saldi', esecuzione:'Spingi in avanti;Torna piano', errori:'Spalle in avanti', nota_sicurezza:'Controlla l ancoraggio', muscoli:'pettorali;tricipiti;deltoidi anteriori', unilaterale:'no', progressione:'elastico più duro' },
  { codice:'EX004', nome:'Piegamenti', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'principiante', attrezzo:'corpo libero', luogo:'casa;palestra', setup:'Mani sotto le spalle', esecuzione:'Scendi col petto', errori:'', nota_sicurezza:'', muscoli:'pettorali', unilaterale:'no', progressione:'più ripetizioni' },
  { codice:'EX002', nome:'Panca piana bilanciere', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'intermedio', attrezzo:'bilanciere', luogo:'palestra', setup:'', esecuzione:'', muscoli:'pettorali' },
  { codice:'EX005', nome:'Piegamenti agli anelli', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'avanzato', attrezzo:'anelli', luogo:'casa;palestra', setup:'', esecuzione:'', muscoli:'pettorali' },
  { codice:'EX006', nome:'Panca inclinata manubri', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'intermedio', attrezzo:'manubri', luogo:'palestra', surrogato_attrezzo:'elastico', nota_surrogato:'Elastico sotto i piedi, spingi in alto', setup:'Panca a 30 gradi', esecuzione:'Spingi', muscoli:'pettorali;deltoidi anteriori', unilaterale:'no', progressione:'carico' },
  { codice:'EX020', nome:'Rematore elastico', pattern:'tirata orizzontale', gruppo_target:'dorsali', livello:'intermedio', attrezzo:'elastico', luogo:'casa' },
  { codice:'EX060', nome:'Curl elastico', pattern:'isolamento', gruppo_target:'bicipiti', livello:'principiante', attrezzo:'elastico', luogo:'casa' },
  { codice:'EX061', nome:'Curl a martello elastico', pattern:'isolamento', gruppo_target:'bicipiti', livello:'intermedio', attrezzo:'elastico', luogo:'casa', setup:'In piedi', esecuzione:'Fletti', muscoli:'bicipiti;avambracci' },
  { codice:'EX062', nome:'Alzate laterali elastico', pattern:'isolamento', gruppo_target:'deltoidi laterali', livello:'principiante', attrezzo:'elastico', luogo:'casa' },
];
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', tipo_allenamento:'casa', attrezzatura:['elastico','corpo_libero'], note_salute:'Esperienza: avanzato' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(o){
  o = o || {};
  const t = fixture();
  const b = boot(t, { now: OGGI + 'T07:00:00', locale: o.locale || {} });
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
  const nomi = () => b.win.getTrainingSession('upperA').exercises.map(e => e.name);
  return { ...b, ST, t, doc, pagina, scegli, nomi };
}
(async () => {
  // 1 · la card ha «Cambia per oggi ›»; il foglio elenca solo chi si può fare, mai chi è già in seduta
  {
    const a = await nuovo();
    atteso('card · «Cambia per oggi ›» su ogni esercizio da fare', a.doc.querySelectorAll('.ex-cambia-oggi').length, 3);
    a.win.apriCambioOggi('upperA', 'Panca elastico');
    atteso('foglio · si apre e cerca', [!!a.doc.getElementById('cambio-oggi-sheet'), a.ST.cambioOggi.stato], [true, 'in-corso']);
    await dormi(30);
    const cand = a.ST.cambioOggi.candidati.map(c => [c.riga.codice, c.alternativa, c.piuFacile]);
    atteso('foglio · l\'alternativa del catalogo prima (ed è anche la variante facile del coach, 330), poi lo stesso schema; fuori bilanciere, anelli, chi è in seduta', cand, [['EX003', true, true], ['EX004', false, false], ['EX006', false, false]]);
    const f = testo(a.doc.getElementById('cambio-oggi-sheet').innerHTML);
    atteso('foglio · nomi, codici, etichette (alternativa, livello) e il tasto Scegli', [/Chest press elastico EX003/.test(f), /alternativa del catalogo/.test(f), /principiante/.test(f), a.doc.querySelectorAll('.co-scegli').length], [true, true, true, 3]);
    // scelta
    await a.win.cambiaPerOggi('upperA', 'Panca elastico', 'EX003');
    const e = a.win.findExercise('Chest press elastico', 'upperA');
    atteso('scelta · l\'esercizio di oggi prende il posto, coi parametri della seduta e i testi del catalogo', [a.nomi(), e.sets, e.reps, e.rest_sec, e.setup, e.alert, e.progressione, e.oggiAlPostoDi], [['Chest press elastico', 'Rematore elastico', 'Curl elastico'], 3, '6-10', 120, ['Elastico ancorato dietro', 'Piedi saldi'], 'Controlla l ancoraggio', 'elastico più duro', { codice:'EX001', name:'Panca elastico' }]);
    atteso('scelta · la card dice «oggi al posto di» con «torna a quello», il foglio è chiuso', [/OGGI AL POSTO DI Panca elastico/.test(a.pagina()), /torna a quello/.test(a.pagina()), !!a.doc.getElementById('cambio-oggi-sheet')], [true, true, false]);
    const salvato = JSON.parse(a.win.localStorage.getItem(`zt_cambi_oggi_${U}_${OGGI}`));
    atteso('scelta · vive sul telefono, per oggi, sotto il codice originale', [Object.keys(salvato), Object.keys(salvato.upperA), salvato.upperA.EX001.scelto.codice], [['upperA'], ['EX001'], 'EX003']);
    atteso('scelta · la scheda nel database non si tocca', a.supa._calls.filter(c => c.table === 'schede_utente' && c.op !== 'select').length, 0);
    // la serie va sotto l'esercizio scelto
    a.win.openLogModal('upperA', 'Chest press elastico', 1);
    a.scegli('tl-reps', '8'); a.scegli('tl-rir', '2'); a.ST.trainLogResist = 20;
    await a.win.saveTrainingSet();
    const r = a.t.training_logs[a.t.training_logs.length - 1];
    atteso('serie · salvata sotto l\'esercizio scelto, col suo codice', [r.exercise_name, r.exercise_code, r.set_number], ['Chest press elastico', 'EX003', 1]);
    a.win.annullaCambioOggi('upperA', 'Chest press elastico');
    atteso('serie · con una serie salvata non si torna indietro', [a.nomi()[0], /torna a quello/.test(a.pagina())], ['Chest press elastico', false]);
    // ricaricando l'app, il cambio di oggi è ancora lì
    const b = await nuovo({ locale: { [`zt_cambi_oggi_${U}_${OGGI}`]: salvato } });
    atteso('ricarico · il cambio di oggi torna al suo posto dopo la lettura della scheda', [b.nomi()[0], b.win.findExercise('Chest press elastico', 'upperA').oggiAlPostoDi.codice], ['Chest press elastico', 'EX001']);
    const c = await nuovo({ locale: { [`zt_cambi_oggi_${U}_2026-10-13`]: salvato } });
    atteso('domani · un cambio di ieri non vale più', c.nomi()[0], 'Panca elastico');
  }
  // 2 · torna indietro finché non hai salvato niente; a metà esercizio restano le serie rimaste
  {
    const a = await nuovo();
    a.win.apriCambioOggi('upperA', 'Curl elastico'); await dormi(30);
    atteso('isolamento · stesso gruppo soltanto (niente alzate laterali)', a.ST.cambioOggi.candidati.map(c => c.riga.codice), ['EX061']);
    await a.win.cambiaPerOggi('upperA', 'Curl elastico', 'EX061');
    atteso('isolamento · scelto, con iso e serie della seduta', [a.nomi()[2], a.win.findExercise('Curl a martello elastico', 'upperA').iso], ['Curl a martello elastico', true]);
    a.win.annullaCambioOggi('upperA', 'Curl a martello elastico');
    atteso('torna a quello · senza serie salvate si torna all\'originale e il telefono si svuota', [a.nomi()[2], a.win.localStorage.getItem(`zt_cambi_oggi_${U}_${OGGI}`)], ['Curl elastico', null]);
    // una serie già fatta sotto la panca, poi il cambio: all'esercizio nuovo restano 2 serie
    a.win.openLogModal('upperA', 'Panca elastico', 1);
    a.scegli('tl-reps', '8'); a.scegli('tl-rir', '2'); a.ST.trainLogResist = 20;
    await a.win.saveTrainingSet();
    await a.win.cambiaPerOggi('upperA', 'Panca elastico', 'EX004');
    atteso('a metà · all\'esercizio scelto restano le serie non fatte', [a.nomi()[0], a.win.findExercise('Piegamenti', 'upperA').sets], ['Piegamenti', 2]);
    // surrogato: la nota del surrogato al posto del setup, attrezzo mostrato quello di casa
    await a.win.cambiaPerOggi('upperA', 'Rematore elastico', 'EX006');
    const s = a.win.findExercise('Panca inclinata manubri', 'upperA');
    atteso('surrogato · nota del surrogato come setup, attrezzo elastico, marcato', [s.setup, s.eq, s.isSurrogato], [['Elastico sotto i piedi, spingi in alto'], 'elastico', true]);
  }
  // 3 · dalla variante facile del coach (330): «faccio questa oggi»
  {
    const a = await nuovo();
    const key = 'upperA_Panca elastico';
    a.ST.aiSuggestions[key] = 'S2: variante più facile · punta a 6 reps · RIR 2';
    a.win.renderTraining(); await dormi(40); a.win.renderTraining();
    const v = a.ST.variantiFacili[key];
    atteso('variante facile · trovata (l\'alternativa scritta a catalogo, regola 330)', [v.stato, v.variante.codice], ['pronta', 'EX003']);
    a.win.apriVarianteFacile(key);
    const foglio = a.doc.getElementById('variante-facile-sheet');
    atteso('variante facile · il foglio ha «Faccio questa oggi»', [!!foglio, !!(foglio && foglio.querySelector('#vf-cambia-oggi'))], [true, true]);
    foglio.querySelector('#vf-cambia-oggi').click();
    await dormi(30);
    atteso('variante facile · scelta: la seduta ha la variante al posto della panca, il foglio è chiuso', [a.nomi()[0], !!a.doc.getElementById('variante-facile-sheet')], ['Chest press elastico', false]);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
