// Nutrition 050 (Ondata 5 · 13 ottobre 2026) — «I tuoi soliti»: i pasti e gli integratori extra che la persona ripete, a portata
// di mano per registrare in fretta. Nel form del pasto, sotto «Cosa hai mangiato?», una fila per la fascia scelta: prima i pasti
// visti piu' volte, poi i piu' recenti, al massimo 5; un tocco registra il pasto con gli ingredienti e i numeri dell'ultima volta,
// senza coach (stessa strada di «Salva pasto»: id del telefono, coda senza rete). Nel foglio «Registra integratori» la fila degli
// extra ripetuti, un tocco registra la riga come l'ultima volta. La regola e' pura (pastiSoliti, extraSoliti) e si prova da sola.
//   node tools/banco/prova_soliti.js
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
const OGGI = '2026-10-13';
const giorno = (n) => { const d = new Date(OGGI + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const pasto = (id, date, slot, time, description, kcal, p, c, f) => ({ user_id:U, id, date, slot, time, description, notes:null, kcal, protein:p, carbs:c, fat:f });
const ingr = (id, meal_id, name, quantity, kcal, p, c, f, sort_order) => ({ id, meal_id, user_id:U, name, quantity, unit:'g', kcal, protein:p, carbs:c, fat:f, source:'ai', sort_order });
const extra = (id, date, slot, name, codice, dose, kcal) => ({ id, user_id:U, date, slot, supplement_id:null, supplement_name:name, supplement_codice:codice, is_extra:true, dose, dose_unit:'cps', kcal, carbo:0, proteine:0, grassi:0, costo:1.5 });
// colazione «Yogurt · Avena · Noci» tre volte (10, 6 e 2 giorni fa, l'ultima con quantita' diverse), «Pane · Marmellata» una volta
// ieri, «Uova strapazzate» una volta 20 giorni fa; a pranzo «Riso · Pollo» due volte; un pasto vecchio senza ingredienti.
const t = {
  profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, obiettivo:'ricomposizione', target_kcal:2300 }],
  meals:[
    pasto('c1', giorno(10), 'colazione', '08:00', 'Yogurt · Avena · Noci', 400, 20, 45, 14),
    pasto('c2', giorno(6),  'colazione', '08:10', 'yogurt  · avena · noci', 410, 21, 46, 14),
    pasto('c3', giorno(2),  'colazione', '08:20', 'Yogurt · Avena · Noci', 450, 22, 50, 16),
    pasto('c4', giorno(1),  'colazione', '07:50', 'Pane · Marmellata', 300, 6, 60, 2),
    pasto('c5', giorno(20), 'colazione', '08:00', 'Uova strapazzate', 250, 18, 2, 18),
    pasto('p1', giorno(5),  'pranzo', '13:00', 'Riso · Pollo', 600, 45, 70, 12),
    pasto('p2', giorno(3),  'pranzo', '13:00', 'Riso · Pollo', 620, 46, 72, 12),
  ],
  meal_items:[
    ingr('i1', 'c1', 'Yogurt', 150, 90, 10, 6, 3, 0), ingr('i2', 'c1', 'Avena', 40, 150, 5, 27, 3, 1), ingr('i3', 'c1', 'Noci', 20, 160, 5, 12, 8, 2),
    ingr('i4', 'c2', 'Yogurt', 150, 90, 10, 6, 3, 0), ingr('i5', 'c2', 'Avena', 40, 150, 5, 27, 3, 1), ingr('i6', 'c2', 'Noci', 25, 170, 6, 13, 8, 2),
    ingr('i7', 'c3', 'Yogurt', 170, 100, 11, 7, 3, 0), ingr('i8', 'c3', 'Avena', 50, 180, 6, 31, 4, 1), ingr('i9', 'c3', 'Noci', 25, 170, 5, 12, 9, 2),
    ingr('i10', 'c4', 'Pane', 80, 200, 6, 40, 1, 0), ingr('i11', 'c4', 'Marmellata', 30, 100, 0, 20, 1, 1),
    ingr('i12', 'p1', 'Riso', 100, 350, 7, 78, 1, 0), ingr('i13', 'p1', 'Pollo', 150, 250, 38, 0, 11, 1),
    ingr('i14', 'p2', 'Riso', 100, 350, 7, 78, 1, 0), ingr('i15', 'p2', 'Pollo', 160, 270, 39, 0, 11, 1),
  ],
  fasting_days:[], supplements:[], supplement_packages:[], supplement_package_items:[],
  supplements_log:[ extra('x1', giorno(8), '16:00', 'Caffè verde', 'CV01', 1, 5), extra('x2', giorno(4), '16:30', 'Caffè verde', 'CV01', 2, 10), extra('x3', giorno(1), '22:00', 'Melatonina', null, 1, 0) ],
};
(async () => {
  const b = boot(t, { now:OGGI + 'T08:30:00' });
  await b.avviato;
  const { win, supa } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.catalog = []; ST.supps = []; ST.activeDay = OGGI; ST.page = 'oggi';
  ST.profile = { id:U, first_name:'Ignazio', obiettivo:'ricomposizione', target_kcal:2300 };
  win.applyProfile(ST.profile);
  await win.loadAllDays(); await win.loadExtrasAll(); await win.loadSupps(); await win.loadPackages();
  let inLinea = true;
  Object.defineProperty(win.navigator, 'onLine', { get: () => inLinea, configurable:true });
  const coda = () => JSON.parse(win.localStorage.getItem('zt_coda_' + U) || '[]');
  const testo = (el) => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  const pagina = () => d.getElementById('page-oggi');
  const chips = () => [...(pagina().querySelectorAll('#soliti-pasti .soliti-chip') || [])].map(c => testo(c.querySelector('.soliti-nome')) + ' | ' + testo(c.querySelector('.soliti-sotto')));
  const scritture = (tab) => supa._calls.filter(c => c.table === tab && c.op !== 'select').map(c => c.op);

  console.log('la regola, da sola');
  const sol = win.pastiSoliti(ST.db.days, 'colazione');
  atteso('colazione · prima chi si ripete (3 volte), poi i piu\' recenti; la chiave ignora maiuscole e spazi', sol.map(x => x.descrizione + ' ' + x.volte), ['Yogurt · Avena · Noci 3', 'Pane · Marmellata 1', 'Uova strapazzate 1']);
  atteso('il modello e\' l\'ultima volta: numeri e ingredienti di 2 giorni fa (Noci 25 g, 450 kcal), non la prima', [sol[0].ultimo, sol[0].kcal, sol[0].items.map(i => i.name + ' ' + i.quantity)], [giorno(2), 450, ['Yogurt 170', 'Avena 50', 'Noci 25']]);
  atteso('pranzo · una voce sola, 2 volte, 620 kcal', win.pastiSoliti(ST.db.days, 'pranzo').map(x => [x.descrizione, x.volte, x.kcal]), [['Riso · Pollo', 2, 620]]);
  atteso('cena · niente da ripetere', win.pastiSoliti(ST.db.days, 'cena'), []);
  const tanti = {}; for (let i = 0; i < 9; i++) tanti['2026-09-0' + (i + 1)] = { meals:[{ slot:'cena', description:'Cena ' + i, kcal:100, items:[] }] };
  atteso('al massimo 5 voci, le piu\' recenti', win.pastiSoliti(tanti, 'cena').map(x => x.descrizione), ['Cena 8', 'Cena 7', 'Cena 6', 'Cena 5', 'Cena 4']);
  atteso('pasto vecchio senza ingredienti → un ingrediente solo, 1 porzione, con i numeri del pasto', win.pastiSoliti({ a:{ meals:[{ slot:'cena', description:'Pizza', kcal:800, protein:30, carbs:100, fat:25, items:[] }] } }, 'cena')[0].items, [{ name:'Pizza', quantity:1, unit:'pz', kcal:800, protein:30, carbs:100, fat:25, source:'manual' }]);
  const ex = win.extraSoliti(ST.extrasByDay);
  atteso('extra · Caffè verde 2 volte (modello: l\'ultima, dose 2), poi Melatonina', ex.map(x => [x.modello.name, x.volte, x.modello.dose]), [['Caffè verde', 2, 2], ['Melatonina', 1, 1]]);

  console.log('\nl\'app vera · il form del pasto');
  win.renderOggi();
  atteso('form chiuso · niente fila', chips(), []);
  win.openMealLogForm(); win.setLogSlot('colazione'); await attendi(5);
  atteso('form aperto sulla colazione · la fila «I tuoi soliti», con calorie e quante volte', chips(), ['Yogurt · Avena · Noci | 400 kcal · 3×'.replace('400', '450'), 'Pane · Marmellata | 300 kcal', 'Uova strapazzate | 250 kcal']);
  atteso('il titolo dice la fascia', testo(pagina().querySelector('#soliti-pasti .soliti-titolo')), 'I tuoi soliti · Colazione');
  win.setLogSlot('pranzo'); await attendi(5);
  atteso('cambio fascia → la fila cambia', chips(), ['Riso · Pollo | 620 kcal · 2×']);
  win.setLogSlot('cena'); await attendi(5);
  atteso('fascia senza soliti → niente fila (il form resta com\'era)', [chips(), !!d.getElementById('smart-freetext')], [[], true]);
  win.setLogSlot('colazione'); await attendi(5);
  // un tocco: il pasto e' registrato subito, con gli ingredienti e i numeri dell'ultima volta
  supa._calls.length = 0;
  pagina().querySelector('#soliti-pasti .soliti-chip').click();
  for (let i = 0; i < 100 && ST.logOpen; i++) await attendi(5);
  const oggi = win.getDay(OGGI);
  const nuovo = oggi.meals[oggi.meals.length - 1];
  atteso('un tocco · pasto registrato oggi, colazione, 450 kcal, 3 ingredienti come l\'ultima volta; form chiuso', [oggi.meals.length, nuovo.slot, nuovo.kcal, nuovo.description, (nuovo.items || []).map(i => i.name + ' ' + i.quantity), ST.logOpen], [1, 'colazione', 450, 'Yogurt · Avena · Noci', ['Yogurt 170', 'Avena 50', 'Noci 25'], false]);
  atteso('scritto in meals e meal_items con l\'id del telefono, nessuna richiesta al coach', [scritture('meals'), scritture('meal_items'), /^[0-9a-f-]{36}$/.test(nuovo.id), b.logs.some(l => /ai|worker/i.test(String(l[1])) && /fetch/.test(String(l[0])))], [['insert'], ['insert'], true, false]);
  atteso('la card del pasto e\' in Oggi, i totali lo contano', [!!d.getElementById('sw-' + nuovo.id), win.dayTotals(oggi).kcal], [true, 450]);
  // in modifica di un pasto la fila non c'e'
  await win.smartOpenEdit(OGGI, nuovo.id); await attendi(5);
  atteso('modifica di un pasto → niente fila (non si registra un secondo pasto per sbaglio)', [ST.smartForm.editingMealId === nuovo.id, chips()], [true, []]);
  win.smartResetForm(); ST.logOpen = false; win.renderOggi();
  // senza rete: in coda, in memoria subito
  inLinea = false;
  win.openMealLogForm(); win.setLogSlot('pranzo'); await attendi(5);
  supa._calls.length = 0;
  pagina().querySelector('#soliti-pasti .soliti-chip').click();
  for (let i = 0; i < 100 && ST.logOpen; i++) await attendi(5);
  atteso('senza rete · pranzo in memoria subito, 2 in coda (pasto e ingredienti), nessuna richiesta', [oggi.meals.length, oggi.meals[1].description, coda().length, scritture('meals')], [2, 'Riso · Pollo', 2, []]);
  inLinea = true; win.localStorage.removeItem('zt_coda_' + U);

  console.log('\nl\'app vera · gli integratori extra');
  win.openSuppSheet(); await attendi(5);
  const foglio = () => d.getElementById('supp-sheet-body');
  const chipsX = () => [...foglio().querySelectorAll('#soliti-extra .soliti-chip')].map(c => testo(c.querySelector('.soliti-nome')) + ' | ' + testo(c.querySelector('.soliti-sotto')));
  atteso('nel foglio «Registra integratori» la fila degli extra ripetuti, sopra «+ Un altro prodotto»', chipsX(), ['Caffè verde | 2 cps · 2×', 'Melatonina | 1 cps']);
  supa._calls.length = 0;
  foglio().querySelector('#soliti-extra .soliti-chip').click();
  for (let i = 0; i < 100 && !(ST.extrasByDay[OGGI] || []).length; i++) await attendi(5);
  const x = (ST.extrasByDay[OGGI] || [])[0];
  const ins = supa._calls.find(c => c.table === 'supplements_log' && c.op === 'insert');
  const riga = ins && (Array.isArray(ins.payload) ? ins.payload[0] : ins.payload);
  atteso('un tocco · l\'extra di oggi come l\'ultima volta (dose 2, 10 kcal, codice), riga is_extra con l\'id del telefono, orario adesso', [x && x.name, x && x.dose, x && x.kcal, riga && riga.is_extra, riga && /^[0-9a-f-]{36}$/.test(riga.id), riga && riga.slot, riga && riga.supplement_codice], ['Caffè verde', 2, 10, true, true, '08:30', 'CV01']);
  atteso('Oggi lo mostra fra gli extra e lo conta', [ST.extras.length, win.dayTotals(win.getDay(OGGI)).kcal], [1, 1080]);
  win.closeSuppSheet();
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
