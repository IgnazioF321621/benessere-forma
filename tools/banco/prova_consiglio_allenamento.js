// Nutrition 060 (Ondata 5 · 13 ottobre 2026) — il consiglio sul pasto sa se ti alleni: oggi lo dice il ritratto (Pirsi 020),
// DOMANI lo dice una riga nuova presa dalla rotazione gia' letta per la Home (nessuna lettura in piu'). I quattro difetti
// della card: (a) sforato → al coach arriva «OLTRE l'obiettivo di N», non «0 rimaste»; (b) su un giorno passato pasti e
// integratori sono di quel giorno; (c) il consiglio sparisce quando si registra o si toglie un pasto; (d) con la giornata
// in linea il pulsante resta. E «Registra questo» porta il consiglio nel form del pasto, sulla fascia del prossimo pasto.
//   node tools/banco/prova_consiglio_allenamento.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-13', IERI = '2026-10-12';
const pasto = (id, date, slot, time, description, kcal, p, c, f) => ({ user_id:U, id, date, slot, time, description, notes:null, kcal, protein:p, carbs:c, fat:f });
const t = {
  profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, obiettivo:'ricomposizione', target_kcal:2000, train_start_date:'2026-09-01' }],
  meals:[ pasto('m1', OGGI, 'colazione', '08:00', 'Yogurt · Avena', 400, 20, 50, 12), pasto('m2', IERI, 'pranzo', '13:00', 'Riso · Pollo', 600, 45, 70, 12), pasto('m3', IERI, 'cena', '20:00', 'Pizza', 900, 35, 110, 30) ],
  meal_items:[], fasting_days:[], supplements:[], supplement_packages:[], supplement_package_items:[], supplements_log:[], weekly_pictures:[],
};
(async () => {
  const b = boot(t, { now:OGGI + 'T12:00:00' });
  await b.avviato;
  const { win } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.catalog = []; ST.supps = []; ST.activeDay = OGGI; ST.page = 'oggi';
  ST.profile = { id:U, first_name:'Ignazio', obiettivo:'ricomposizione', target_kcal:2000, train_start_date:'2026-09-01' };
  win.applyProfile(ST.profile);
  await win.loadAllDays(); await win.loadExtrasAll();
  // il coach finto: tiene il prompt e risponde una frase
  const prompts = [];
  win.callAI = async (prompt) => { prompts.push(prompt); return 'Pranzo con riso e pollo, carboidrati per la seduta di domani.'; };
  const ultimo = () => prompts[prompts.length - 1] || '';
  const riga = (re) => (ultimo().split('\n').find(l => re.test(l)) || '').trim();
  const pagina = () => d.getElementById('page-oggi');
  const testo = (el) => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  const bottone = (cls) => pagina().querySelector('.' + cls);

  console.log('la regola «domani», da sola (sedutaDomani)');
  const hd = (o) => { ST.trainHomeData = Object.assign({ notStarted:false, lastDate:IERI, lastSession:'upperA', nextSession:'lowerA', streak:1, doneToday:false, inProgress:false }, o); };
  hd({});
  atteso('oggi Lower A da fare → domani il recupero (recoveryUpper), seduta da fare', win.sedutaDomani(), { state:'da_fare', label:[(win.getTrainingSession('recoveryUpper') || {}).name, (win.getTrainingSession('recoveryUpper') || {}).type].filter(Boolean).join(', ') });
  hd({ doneToday:true, lastSession:'lowerA', nextSession:'recoveryUpper' });
  atteso('oggi Lower A fatta → domani la prossima della rotazione', win.sedutaDomani().state, 'da_fare');
  hd({ inProgress:true, lastSession:'lowerA', nextSession:'recoveryUpper' });
  atteso('seduta in corso → domani la prossima', win.sedutaDomani().state, 'da_fare');
  ST.userSessionCycle = ['upperA', 'lowerA', 'upperB', 'lowerB', 'upperC'];   // scheda a 5 giorni: il ciclo canonico ha il riposo
  hd({ lastSession:'upperC', nextSession:'rest', doneToday:true });
  atteso('scheda a 5 giorni, Upper Pump fatta oggi → domani riposo', win.sedutaDomani(), { state:'riposo', label:'' });
  hd({ lastSession:'lowerB', nextSession:'upperC' });
  atteso('oggi Upper Pump da fare → domani riposo', win.sedutaDomani().state, 'riposo');
  ST.userSessionCycle = null;
  hd({ notStarted:true });
  atteso('programma non iniziato → niente', win.sedutaDomani(), null);
  hd({ errore:true });
  atteso('rotazione non letta → niente (nessuna lettura in piu\')', win.sedutaDomani(), null);
  ST.profile.pausa_inizio = OGGI; ST.profile.pausa_fine = '2026-10-20'; hd({});
  atteso('in pausa programmata → niente', win.sedutaDomani(), null);
  delete ST.profile.pausa_inizio; delete ST.profile.pausa_fine;
  const tsd = ST.profile.train_start_date; delete ST.profile.train_start_date;
  atteso('senza Training → niente', win.sedutaDomani(), null);
  ST.profile.train_start_date = tsd;

  console.log('\nl\'app vera · il prompt al coach');
  hd({});
  win.renderOggi();
  await win.fetchAdvice(); await attendi(5);
  atteso('il prompt dice la seduta di oggi (ritratto) e quella di domani (riga nuova)', [/seduta da fare: Lower A/.test(ultimo()), riga(/^DOMANI:/)], [true, 'DOMANI: seduta da fare (' + [(win.getTrainingSession('recoveryUpper') || {}).name, (win.getTrainingSession('recoveryUpper') || {}).type].filter(Boolean).join(', ') + ')']);
  atteso('(a) 400 kcal su 2000 → «1600 kcal rimaste»; i pasti di oggi', [riga(/^- Calorie/), /Yogurt · Avena/.test(ultimo()), /Riso · Pollo/.test(ultimo())], ['- Calorie: 1600 kcal rimaste', true, false]);
  atteso('il consiglio e\' a schermo con «Registra questo»', [ST.advice.slice(0, 6), !!bottone('oggi-v3-coach-registra')], ['Pranzo', true]);
  // (c) registrare un pasto toglie il consiglio
  win.openMealLogForm(); win.setLogSlot('pranzo'); await attendi(5);
  ST.smartForm.items = [{ tempId:'t1', name:'Riso', quantity:100, unit:'g', kcal:350, protein:7, carbs:78, fat:1, expanded:false, calculating:false, sortOrder:0, source:'manual' }];
  await win.smartSavePasto(); await attendi(5);
  atteso('(c) registrato un pasto → il consiglio di prima sparisce, resta il pulsante', [ST.advice, !!bottone('oggi-v3-coach-registra'), !!bottone('oggi-v3-coach-cta')], ['', false, true]);
  // (a) sforato: al coach arriva il numero, non «0 rimaste»
  win.getDay(OGGI).meals.push({ id:'big', local_id:'big', slot:'cena', time:'20:00', description:'Cena abbondante', items:[], kcal:1500, protein:60, carbs:150, fat:60 });
  win.renderOggi(); await win.fetchAdvice(); await attendi(5);
  atteso('(a) 2250 kcal su 2000 → «OLTRE l\'obiettivo di 250 kcal», niente «0 rimaste»; l\'istruzione lo dice', [riga(/^- Calorie/), /0 kcal rimaste/.test(ultimo()), /Se è OLTRE/.test(ultimo())], ['- Calorie: OLTRE l\'obiettivo di 250 kcal', false, true]);
  // (c) anche togliere un pasto
  await win.deleteMeal(OGGI, 'big'); await attendi(5);
  atteso('(c) tolto un pasto → il consiglio sparisce', ST.advice, '');
  // (d) giornata in linea: il pulsante resta
  win.getDay(OGGI).meals.length = 0;
  win.getDay(OGGI).meals.push({ id:'ok', local_id:'ok', slot:'pranzo', time:'13:00', description:'In linea', items:[], kcal:1200, protein:1200*0.34/4, carbs:1200*0.38/4, fat:1200*0.28/9 });
  win.renderOggi();
  atteso('(d) giornata in linea → «Tutto in linea» e il pulsante «Un consiglio comunque →»', [/Tutto in linea col piano/.test(testo(pagina())), testo(bottone('oggi-v3-coach-cta'))], [true, 'Un consiglio comunque →']);
  await win.fetchAdvice(); await attendi(5);
  atteso('(d) chiesto comunque, il consiglio compare', ST.advice.length > 0, true);
  // «Registra questo»: il testo entra nel form, sulla fascia del prossimo pasto
  const prossimo = ST.nextSlot;
  bottone('oggi-v3-coach-registra').click(); await attendi(5);
  atteso('«Registra questo» → form aperto sulla fascia del prossimo pasto col consiglio come testo da analizzare', [ST.logOpen, ST.logSlot === prossimo, d.getElementById('smart-freetext').value === ST.advice], [true, true, true]);
  ST.logOpen = false; win.smartResetForm();
  // (b) un giorno passato: pasti e integratori di quel giorno, niente «domani»
  ST.activeDay = IERI; win.renderOggi(); await win.fetchAdvice(); await attendi(5);
  atteso('(b) ieri aperto → i pasti sono di ieri, il bilancio dice che e\' un giorno passato, niente riga DOMANI', [/Riso · Pollo/.test(ultimo()), /Pizza/.test(ultimo()), /Yogurt · Avena/.test(ultimo()), /IN QUEL GIORNO/.test(ultimo()), /2026-10-12, un giorno passato/.test(ultimo()), riga(/^DOMANI:/)], [true, true, false, true, true, '']);
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
