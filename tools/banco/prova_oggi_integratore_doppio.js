// Difetto del 12 ottobre 2026 (dopo il Rilascio 35): «All Plant Protein», registrato dal gruppo MAMI, compariva nella timeline
// di Oggi DUE volte, nel gruppo e di nuovo come «extra». La riga in supplements_log era una sola (orario 06:30), ma il
// prodotto aveva ormai lo slot 06:00 (cambiato dopo, con updateSuppSlotTime, che non tocca le righe già scritte) e in
// `supplements` c'era anche una riga inattiva con lo stesso nome: il confronto «nome uguale e orario uguale allo slot»
// non riconosceva la riga come coperta dal gruppo. Ora un log vale come coperto se il suo prodotto (per id, poi nome:
// suppForLog) è tra i presi del giorno, senza guardare l'orario; i veri extra, col nome fuori dalla libreria, restano extra.
// Casi: (1) orario della riga diverso dallo slot attuale; (2) due righe di `supplements` con lo stesso nome, l'inattiva
// prima; (3) un vero extra; (4) l'orario cambiato dal vivo (updateSuppSlotTime); (5) il dettaglio del giorno in sola lettura.
//   node tools/banco/prova_oggi_integratore_doppio.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-12';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(74), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const t = {
  profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meal_items:[],
  meals:[{ user_id:U, id:'m1', date:OGGI, slot:'colazione', kcal:300, protein:15, carbs:40, fat:8, description:'yogurt e avena', notes:'', time:'08:00' }],   // un pasto: così Oggi disegna la timeline (senza pasti disegna solo la card dei gruppi) fasting_days:[], nutrilite_catalog:[],
  supplement_packages:[], supplement_package_items:[],
  supplements:[
    { id:'a2', user_id:U, name:'All Plant Protein', slot:'06:15', grp:'', active:false, quantity:1, sort_order:0 },     // la riga inattiva omonima, PRIMA
    { id:'a1', user_id:U, name:'All Plant Protein', slot:'06:00', grp:'MAMI', active:true, quantity:1, sort_order:1 },  // quella vera, slot cambiato dopo
    { id:'b1', user_id:U, name:'Vitamina C', slot:'08:45', grp:'', active:true, quantity:1, sort_order:2 },
  ],
  supplements_log:[
    { id:'l1', user_id:U, date:OGGI, supplement_id:'a1', supplement_name:'All Plant Protein', slot:'06:30', is_extra:false },  // scritta quando lo slot era 06:30
    { id:'l2', user_id:U, date:OGGI, supplement_id:null, supplement_name:'Caffè verde', slot:'10:00', is_extra:false },        // un vero extra: nome fuori dalla libreria
  ],
};
(async () => {
  const b = boot(t, { now:OGGI + 'T09:00:00' });
  await b.avviato;
  const { win } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.catalog = []; ST.activeDay = OGGI; ST.page = 'oggi';
  await win.loadSupps(); await win.loadAllDays(); await win.loadTodaySuppLog();
  const pagina = () => d.getElementById('page-oggi');
  const volte = (el, nome) => (el.textContent.match(new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const nelGruppo = (id) => pagina().querySelectorAll(`[id="oggi-pills-${id}"]`).length;
  const extra = () => volte(pagina(), 'Integratori extra');   // la card di un extra sta chiusa: si contano le sue intestazioni
  const day = win.getDay(OGGI);
  atteso('al caricamento · la riga si lega al prodotto attivo per id (non all\'omonima inattiva), e tiene l\'id', [day.suppsTaken, day.rawSuppLogs.map(l => [l.id, l.name, l.time])], [['a1'], [['a1', 'All Plant Protein', '06:30'], [null, 'Caffè verde', '10:00']]]);

  ['06:00', '06:30', '06:45', '08:45', '10:00'].forEach(sl => win.localStorage.setItem('fascia_collapsed_' + sl, '0'));   // gruppi aperti, così i nomi si leggono
  win.renderOggi();
  atteso('Oggi · All Plant Protein compare UNA volta, nel gruppo, anche se l\'orario della riga (06:30) non è lo slot (06:00)', [volte(pagina(), 'All Plant Protein'), nelGruppo('a1'), nelGruppo('a2')], [1, 1, 0]);
  atteso('Oggi · una sola card «Integratori extra»: il vero extra (Caffè verde), non All Plant Protein', extra(), 1);
  atteso('Oggi · nessun «Sospeso» (il prodotto preso è quello attivo)', /Sospeso/.test(pagina().textContent), false);

  // l'orario del gruppo cambia dal vivo: le righe già scritte restano 06:30, il prodotto va a 06:45
  await win.updateSuppSlotTime('06:00', '06:45', 'a1'); await attendi(5);
  atteso('orario cambiato dal vivo (06:00 → 06:45) · ancora una volta sola, nel gruppo; l\'extra resta uno', [ST.supps.find(s => s.local_id === 'a1').slot, volte(pagina(), 'All Plant Protein'), nelGruppo('a1'), extra()], ['06:45', 1, 1, 1]);
  const spostate = b.supa._calls.filter(c => c.table === 'supplements_log' && c.op === 'update').map(c => [c.payload.slot, c.filters.map(x => x[1] + '=' + JSON.stringify(x[2])).join('&')]);
  atteso('orario cambiato dal vivo · le righe di oggi di quel prodotto seguono l\'orario nuovo, in memoria e nel database (solo oggi, non gli extra)', [day.rawSuppLogs.map(l => l.time), spostate], [['06:45', '10:00'], [['06:45', 'user_id="u1"&date="2026-10-12"&is_extra=false&supplement_id=["a1"]']]]);

  // il dettaglio del giorno in sola lettura (Analisi): stesso criterio
  win.openDayDetailScreen(OGGI); await attendi(5);
  const dettaglio = d.getElementById('daydetail-overlay');
  atteso('dettaglio del giorno · All Plant Protein nel pacchetto, una volta; un solo EXTRA (Caffè verde)', [!!dettaglio, volte(dettaglio, 'All Plant Protein'), volte(dettaglio, 'EXTRA'), volte(dettaglio, 'Caffè verde')], [true, 1, 1, 1]);
  win.closeDayDetailScreen(); await attendi(250);

  // una copia locale vecchia, senza l'id nel log: si va per nome preferendo la riga attiva
  day.rawSuppLogs = [{ name:'All Plant Protein', time:'06:30', dose:1 }, { name:'Caffè verde', time:'10:00', dose:1 }];
  win.renderOggi();
  atteso('copia locale vecchia (log senza id) · per nome si prende la riga attiva: una volta, nel gruppo', [volte(pagina(), 'All Plant Protein'), nelGruppo('a1'), extra()], [1, 1, 1]);

  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
