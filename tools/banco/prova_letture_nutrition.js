// Nutrition 140 (Ondata 4 · 13 ottobre 2026) — letture e salvataggi senza controllo in Nutrition. Prima una lettura fallita
// di integratori, catalogo o pacchetti lasciava una lista vuota (le calorie degli integratori sparivano dal totale senza
// avviso); i digiuni e gli integratori dello storico non passavano da dbq; il cambio d'orario di un pasto scriveva con dbq
// silenzioso; la modifica di un pasto cancellava gli ingredienti e poi li reinseriva (se il secondo passo falliva, il pasto
// restava senza ingredienti). Qui: lettura fallita → quello che c'era resta; tutto da dbq; orario dalla coda; modifica del
// pasto nell'ordine nuovi → testata → via i vecchi, con ritorno indietro se un passo non va.
//   node tools/banco/prova_letture_nutrition.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
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
(async () => {
  const t = {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }],
    nutrilite_catalog:[{ id:'c1', codice:'OM3', nome:'Omega 3', kcal:10, proteine:0, carbo:0, grassi:1 }],
    supplements:[{ id:'s1', user_id:U, name:'Omega 3', slot:'08:00', grp:'Mattina', active:true, dose_die:1, sort_order:1, catalog_code:'OM3' },
                 { id:'s2', user_id:U, name:'Vitamina D', slot:'08:00', grp:'Mattina', active:true, dose_die:1, sort_order:2 }],
    supplement_packages:[{ id:'p1', user_id:U, name:'Mattina', slot:'08:00', sort_order:1 }],
    supplement_package_items:[{ id:'i1', user_id:U, package_id:'p1', supplement_id:'s1', sort_order:1 }, { id:'i2', user_id:U, package_id:'p1', supplement_id:'s2', sort_order:2 }],
    meals:[{ user_id:U, id:'m1', date:OGGI, slot:'pranzo', kcal:500, protein:20, carbs:60, fat:15, description:'riso e pollo', notes:'', time:'13:00' }],
    meal_items:[{ id:'g1', user_id:U, meal_id:'m1', name:'riso', quantity:80, unit:'g', kcal:280, protein:6, carbs:60, fat:1, source:'manual', sort_order:0 },
                { id:'g2', user_id:U, meal_id:'m1', name:'pollo', quantity:120, unit:'g', kcal:220, protein:14, carbs:0, fat:14, source:'manual', sort_order:1 }],
    fasting_days:[{ user_id:U, date:'2026-10-12' }],
    supplements_log:[{ user_id:U, id:'l1', date:'2026-10-12', supplement_id:'s1', supplement_name:'Omega 3', slot:'08:00', is_extra:false }],
  };
  const b = boot(t, { now:OGGI + 'T14:00:00' });
  await b.avviato;
  const { win, supa } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.activeDay = OGGI;
  ST.TARGET = { kcal:2000, protein:150, carbs:200, fat:67 };
  const errori = () => b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]);
  const chiamate = (tab, op) => supa._calls.filter(c => c.table === tab && (!op || c.op === op));

  // 1 · letture buone
  const esiti = [await win.loadCatalog(), await win.loadSupps(), await win.loadPackages(), await win.loadAllDays()];
  atteso('letture buone · dicono «letto» e riempiono catalogo, integratori, pacchetti, giorni', [esiti, ST.catalog.length, ST.supps.length, ST.packages.length, ST.packages[0].items.length, win.getDay('2026-10-12').fasting, win.getDay('2026-10-12').suppsTaken], [[true, true, true, true], 1, 2, 1, 2, true, ['s1']]);

  // 2 · tabella che non risponde: quello che c'era resta
  t.__assenti = ['supplements', 'nutrilite_catalog', 'supplement_package_items'];
  const esitiKo = [await win.loadCatalog(), await win.loadSupps(), await win.loadPackages()];
  atteso('tabelle che non rispondono · dicono «non letto» e non svuotano niente', [esitiKo, ST.catalog.length, ST.supps.length, ST.packages.length, ST.packages[0].items.length], [[false, false, false], 1, 2, 1, 2]);
  t.__assenti = ['fasting_days'];
  const giorniPrima = JSON.stringify(ST.db.days);
  atteso('digiuni non letti · lo storico non si riscrive', [await win.loadAllDays(), JSON.stringify(ST.db.days) === giorniPrima], [false, true]);
  t.__assenti = ['supplements_log'];
  atteso('integratori dello storico non letti · lo storico non si riscrive', [await win.loadAllDays(), JSON.stringify(ST.db.days) === giorniPrima], [false, true]);
  t.__assenti = [];
  t.__rete = false;
  atteso('senza rete · stessa cosa', [await win.loadSupps(), ST.supps.length], [false, 2]);
  t.__rete = true;
  atteso('rete tornata · si rilegge', [await win.loadSupps(), ST.supps.length], [true, 2]);
  ST.supps = undefined; t.__assenti = ['supplements'];
  atteso('primo avvio senza niente · una lettura fallita lascia almeno la lista vuota, non «undefined»', [await win.loadSupps(), Array.isArray(ST.supps), ST.supps.length], [false, true, 0]);
  t.__assenti = [];
  await win.loadSupps();

  // 3 · nel codice: quelle letture passano tutte da dbq (niente `await supa` nudo in quelle funzioni)
  const src = fs.readFileSync(require('path').join(__dirname, '..', '..', 'app', 'nutrition.js'), 'utf8');
  const corpo = (nome) => { const i = src.indexOf('function ' + nome + '('); const j = src.indexOf('\nasync function ', i + 1); const k = src.indexOf('\nfunction ', i + 1); return src.slice(i, Math.min(j < 0 ? 1e9 : j, k < 0 ? 1e9 : k)); };
  const nudi = ['loadSupps', 'loadCatalog', 'loadPackages', 'loadAllDays', 'loadRecentDays', 'loadExtrasAll', 'loadExtras', 'loadTodaySuppLog'].filter(f => /await (supa\b|_filtra\(|_storicoFiltro\()/.test(corpo(f).replace(/\/\/.*$/gm, '')));
  atteso('nel codice · nessuna di queste letture chiama Supabase senza dbq', nudi, []);

  // 4 · cambio d'orario del pasto: dalla coda
  win.renderOggi();
  t.__rete = false;
  await win.updateMealTime(OGGI, 'm1', '12:30'); await attendi(5);
  const coda = () => JSON.parse(win.localStorage.getItem('zt_coda_' + U) || '[]');
  atteso('orario senza rete · cambia a schermo e va in coda', [win.getDay(OGGI).meals[0].time, coda().map(x => x.operazione)], ['12:30', ['cambiare l\'orario del pasto']]);
  t.__rete = true;
  const primaCoda = chiamate('meals', 'update').length;
  await win.svuotaCoda(); await attendi(5);
  const u = chiamate('meals', 'update').slice(primaCoda);
  atteso('rete tornata · la coda scrive l\'orario', [coda().length, u.length, u[0] && u[0].payload.time], [0, 1, '12:30']);

  // 5 · modifica del pasto: nuovi ingredienti → testata → via i vecchi (mai un pasto senza ingredienti)
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  ST.smartForm.items = [{ tempId:1, name:'riso', quantity:100, unit:'g', kcal:350, protein:7, carbs:75, fat:1, source:'manual' }];
  const n0 = supa._calls.length;
  await win.smartSavePasto(); await attendi(5);
  const passi = supa._calls.slice(n0).filter(c => c.op !== 'select').map(c => c.table + ':' + c.op);
  const delVecchi = supa._calls.slice(n0).find(c => c.table === 'meal_items' && c.op === 'delete');
  const filtroOr = delVecchi && (delVecchi.filters.find(f => f[0] === 'or') || [])[2];
  atteso('modifica · tre passi nell\'ordine: ingredienti nuovi, pasto, ingredienti vecchi', passi, ['meal_items:insert', 'meals:update', 'meal_items:delete']);
  atteso('modifica · i vecchi si tolgono per id (g1, g2), non per pasto', [/id\.eq\."?g1"?/.test(filtroOr || ''), /id\.eq\."?g2"?/.test(filtroOr || ''), delVecchi && delVecchi.filters.some(f => f[1] === 'meal_id' && f[2] === 'm1')], [true, true, true]);
  const pasto = win.getDay(OGGI).meals[0];
  atteso('modifica · a schermo il pasto nuovo, con l\'ingrediente nuovo e il suo id', [pasto.kcal, pasto.items.length, pasto.items[0].name, !!pasto.items[0].id], [350, 1, 'riso', true]);

  // 6 · se la testata non si aggiorna, gli ingredienti nuovi si tolgono e il pasto resta com'era
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  ST.smartForm.items = [{ tempId:2, name:'pesce', quantity:150, unit:'g', kcal:200, protein:30, carbs:0, fat:8, source:'manual' }];
  t.__rifiuta = { meals: { code:'42501', message:'permission denied (finto banco)' } };
  const n1 = supa._calls.length;
  await win.smartSavePasto(); await attendi(5);
  const passi2 = supa._calls.slice(n1).filter(c => c.op !== 'select' && c.table !== 'app_errors').map(c => c.table + ':' + c.op);   // app_errors: dbq registra il rifiuto
  const idNuovo = (supa._calls.slice(n1).find(c => c.table === 'meal_items' && c.op === 'insert') || { payload:[{}] }).payload[0].id;
  const delNuovi = supa._calls.slice(n1).find(c => c.table === 'meal_items' && c.op === 'delete');
  atteso('testata rifiutata · ingredienti nuovi dentro, poi fuori; il pasto a schermo e\' quello di prima', [passi2, idNuovo && new RegExp('id\\.eq\\."?' + idNuovo).test((delNuovi.filters.find(f => f[0] === 'or') || [])[2] || ''), win.getDay(OGGI).meals[0].kcal, win.getDay(OGGI).meals[0].items[0].name], [['meal_items:insert', 'meals:update', 'meal_items:delete'], true, 350, 'riso']);
  atteso('testata rifiutata · la persona lo sa (foglio «Pasto non salvato»)', /Pasto non salvato/.test(d.body.textContent), true);
  t.__rifiuta = null;

  // 7 · richiesta della Regia (13 ottobre): gli id dei vecchi ingredienti si leggono dal database prima di scrivere,
  // perche' la memoria puo' averli parziali o senza id (copia locale vecchia): altrimenti i vecchi restano, doppi
  t.__rifiuta = null; t.__rete = true;
  t.meal_items.length = 0;
  t.meal_items.push({ id:'h1', user_id:U, meal_id:'m1', name:'riso', quantity:100, unit:'g', kcal:350, protein:7, carbs:75, fat:1, source:'manual', sort_order:0 },
                    { id:'h2', user_id:U, meal_id:'m1', name:'olio', quantity:10, unit:'g', kcal:90, protein:0, carbs:0, fat:10, source:'manual', sort_order:1 });
  win.getDay(OGGI).meals[0].items = [{ name:'riso', quantity:100, unit:'g', kcal:350 }];   // in memoria: un solo ingrediente, senza id
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  ST.smartForm.items = [{ tempId:3, name:'pasta', quantity:90, unit:'g', kcal:320, protein:11, carbs:65, fat:1, source:'manual' }];
  const n3 = supa._calls.length;
  await win.smartSavePasto(); await attendi(5);
  const lettura = supa._calls.slice(n3).find(c => c.table === 'meal_items' && c.op === 'select');
  const passi3 = supa._calls.slice(n3).filter(c => c.op !== 'select' && c.table !== 'app_errors').map(c => c.table + ':' + c.op);
  const del3 = supa._calls.slice(n3).find(c => c.table === 'meal_items' && c.op === 'delete');
  const or3 = del3 ? ((del3.filters.find(f => f[0] === 'or') || [])[2] || '') : '';
  atteso('memoria incompleta · si leggono gli id dal database (h1, h2) e si tolgono quelli, prima di scrivere', [!!lettura, lettura && supa._calls.indexOf(lettura) < supa._calls.indexOf(supa._calls.slice(n3).find(c => c.op === 'insert')), passi3, /"?h1"?/.test(or3), /"?h2"?/.test(or3)], [true, true, ['meal_items:insert', 'meals:update', 'meal_items:delete'], true, true]);
  // senza rete e con la memoria incompleta ci si ferma: niente scritto, la persona lo sa
  win.getDay(OGGI).meals[0].items = [{ name:'pasta', quantity:90, unit:'g', kcal:320 }];
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  ST.smartForm.items = [{ tempId:4, name:'farro', quantity:90, unit:'g', kcal:300, protein:10, carbs:60, fat:2, source:'manual' }];
  t.__rete = false;
  const n4 = supa._calls.length;
  await win.smartSavePasto(); await attendi(5);
  atteso('senza rete e memoria incompleta · nessuna scrittura, niente in coda, «Pasto non salvato»', [supa._calls.slice(n4).filter(c => c.op !== 'select' && c.table !== 'app_errors').length, coda().length, /Pasto non salvato/.test(d.body.textContent), win.getDay(OGGI).meals[0].items[0].name], [0, 0, true, 'pasta']);
  t.__rete = true;

  atteso('zero errori in console', errori(), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
