// Nutrition 220 (24 ottobre 2026) — modificare un pasto già inserito, soprattutto quantità e porzioni. Prima la quantità
// stava dentro l'ingrediente chiuso e cambiarla non cambiava calorie e macro finché non si chiedeva la stima al coach; un
// pasto vecchio senza ingredienti diventava un ingrediente con quantità 0; il campo orario mostrava l'ora di adesso e la
// salvava sopra quella del pasto; toccare la fascia mentre si modificava svuotava il form. Qui: quantità in vista, valori
// in proporzione subito e senza coach, porzione dell'intero pasto, pasti vecchi e giorni passati, orario e fascia tenuti,
// senza rete in coda.
//   node tools/banco/prova_modifica_pasto.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const Z = require('../../shared/nutrizione.js');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-24', IERI = '2026-10-23';

// ── regola pura ──
atteso('pura · 80 g → 160 g: valori per due', Z.valoriPerQuantita({ quantity:80, kcal:280, protein:6, carbs:60, fat:1 }, 160), { kcal:560, protein:12, carbs:120, fat:2 });
atteso('pura · 120 g → 50 g: in proporzione, al decimo', Z.valoriPerQuantita({ quantity:120, kcal:220, protein:14, carbs:0, fat:14 }, 50), { kcal:91.7, protein:5.8, carbs:0, fat:5.8 });
atteso('pura · base senza quantità: niente proporzione (decide il coach)', Z.valoriPerQuantita({ quantity:0, kcal:300 }, 100), null);
atteso('pura · porzione ½ e fattore negativo = zero', [Z.scalaValori({ kcal:500, protein:20, carbs:60, fat:15 }, 0.5), Z.scalaValori({ kcal:500 }, -1).kcal], [{ kcal:250, protein:10, carbs:30, fat:7.5 }, 0]);

(async () => {
  const t = {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }],
    meals:[{ user_id:U, id:'m1', date:OGGI, slot:'pranzo', kcal:500, protein:20, carbs:60, fat:15, description:'riso · pollo', notes:'', time:'13:00:00' },
           { user_id:U, id:'m2', date:IERI, slot:'cena', kcal:800, protein:40, carbs:90, fat:30, description:'pizza margherita', notes:'', time:'20:30:00' }],
    meal_items:[{ id:'g1', user_id:U, meal_id:'m1', name:'riso', quantity:80, unit:'g', kcal:280, protein:6, carbs:60, fat:1, source:'manual', sort_order:0 },
                { id:'g2', user_id:U, meal_id:'m1', name:'pollo', quantity:120, unit:'g', kcal:220, protein:14, carbs:0, fat:14, source:'manual', sort_order:1 }],
  };
  const b = boot(t, { now:OGGI + 'T15:00:00' });
  await b.avviato;
  const { win, supa } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.activeDay = OGGI;
  ST.TARGET = { kcal:2000, protein:150, carbs:200, fat:67 };
  await win.loadAllDays();
  win.showPage('oggi'); await attendi(5);
  const errori = () => b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]);
  const coda = () => JSON.parse(win.localStorage.getItem('zt_coda_' + U) || '[]');
  let chiamateCoach = 0;
  win.estimateSingleItem = async () => { chiamateCoach++; return { kcal:1, protein:0, carbs:0, fat:0 }; };
  win.estimateMealItems = async () => { chiamateCoach++; return { items:[] }; };
  const voce = (nome) => ST.smartForm.items.find(i => i.name === nome);
  const testo = (sel) => { const el = d.querySelector(sel); return el ? el.textContent.trim() : null; };

  // 1 · la matita apre il pasto: quantità in vista senza aprire l'ingrediente, orario del pasto
  ST.logTime = '09:15';   // l'ultima scelta fatta per un altro pasto
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  const riso = voce('riso'), pollo = voce('pollo');
  atteso('apertura · ingredienti chiusi ma quantità in vista per tutti e due', [riso.expanded, !!d.querySelector(`[data-row-qty="${riso.tempId}"]`), d.querySelector(`[data-row-qty="${pollo.tempId}"]`) && d.querySelector(`[data-row-qty="${pollo.tempId}"]`).value], [false, true, '120']);
  atteso('apertura · campo orario con l\'ora del pasto (13:00), non l\'ultima scelta', d.getElementById('log-time') && d.getElementById('log-time').value, '13:00');
  atteso('apertura · campo quantità a 16 px (l\'iPhone non ingrandisce)', /\.smart-qta-inp\{[^}]*font-size:16px/.test(require('fs').readFileSync(__dirname + '/../../app/stile.css', 'utf8')), true);

  // 2 · scrivo 160 g di riso: calorie e macro subito, il totale a schermo cambia senza ridisegnare, niente coach
  const campo = d.querySelector(`[data-row-qty="${riso.tempId}"]`);
  campo.value = '160'; campo.dispatchEvent(new win.Event('input', { bubbles:true }));
  atteso('scrivo 160 g · riso a 560 kcal, 12 P, 120 C, 2 G', [riso.quantity, riso.kcal, riso.protein, riso.carbs, riso.fat], [160, 560, 12, 120, 2]);
  atteso('scrivo 160 g · a schermo riga e totale aggiornati, il campo è lo stesso (non perde il fuoco)', [testo(`[data-row-kcal="${riso.tempId}"]`), testo('[data-smart-tot="kcal"]'), d.querySelector(`[data-row-qty="${riso.tempId}"]`) === campo], ['560 kcal', '780 kcal', true]);
  campo.value = '160,5'; campo.dispatchEvent(new win.Event('input', { bubbles:true }));
  atteso('la virgola italiana vale come punto', riso.quantity, 160.5);

  // 3 · − e +: passo di 10 g, dal valore fuori passo al passo vicino; tornando a 80 i valori sono esattamente quelli di prima
  win.smartQtaPasso(riso.tempId, 1);
  atteso('+ da 160,5 g · 170 g', [riso.quantity, riso.kcal], [170, 595]);
  for(let i = 0; i < 9; i++) win.smartQtaPasso(riso.tempId, -1);
  atteso('nove − · 80 g, valori di partenza senza arrotondamenti accumulati', [riso.quantity, riso.kcal, riso.protein, riso.carbs, riso.fat], [80, 280, 6, 60, 1]);
  for(let i = 0; i < 12; i++) win.smartQtaPasso(riso.tempId, -1);
  atteso('mai sotto lo zero', [riso.quantity, riso.kcal], [0, 0]);
  win.smartQtaPasso(riso.tempId, 1); win.smartQtaPasso(riso.tempId, 1);
  atteso('da zero si risale e i valori tornano in proporzione (20 g = 70 kcal)', [riso.quantity, riso.kcal], [20, 70]);
  for(let i = 0; i < 6; i++) win.smartQtaPasso(riso.tempId, 1);

  // 4 · porzione dell'intero pasto: ½ dimezza tutto, 1 rimette com'era
  win.smartPorzione(0.5);
  atteso('porzione ½ · riso 40 g 140 kcal, pollo 60 g 110 kcal, bottone ½ acceso', [riso.quantity, riso.kcal, pollo.quantity, pollo.kcal, d.querySelector('.smart-porz.on') && d.querySelector('.smart-porz.on').textContent], [40, 140, 60, 110, '½']);
  win.smartPorzione(1);
  atteso('porzione 1 · com\'era', [riso.quantity, riso.kcal, pollo.quantity, pollo.kcal], [80, 280, 120, 220]);
  win.smartQtaPasso(pollo.tempId, 1); win.smartQtaPasso(pollo.tempId, 1);   // 140 g di pollo
  win.smartPorzione(0.5);
  atteso('correzione e poi ½ · la correzione resta, scalata con le altre (pollo 70 g)', [pollo.quantity, pollo.kcal, riso.quantity], [70, 128.3, 40]);
  atteso('nessuna chiamata al coach in tutto questo', chiamateCoach, 0);

  // 5 · salvo: testata e ingredienti con i numeri nuovi, orario del pasto intatto, totale del giorno da shared/nutrizione.js
  const n0 = supa._calls.length;
  await win.smartSavePasto(); await attendi(5);
  const upd = supa._calls.slice(n0).find(c => c.table === 'meals' && c.op === 'update');
  const ins = supa._calls.slice(n0).find(c => c.table === 'meal_items' && c.op === 'insert');
  atteso('salvataggio · testata 268,3 kcal alle 13:00, ingredienti 40 g e 70 g', [upd && upd.payload.kcal, upd && upd.payload.time, ins && ins.payload.map(x => x.name + ' ' + x.quantity + x.unit + ' ' + x.kcal)], [268.3, '13:00', ['riso 40g 140', 'pollo 70g 128.3']]);
  atteso('salvataggio · il totale del giorno lo fa shared/nutrizione.js', win.dayTotals(win.getDay(OGGI)).kcal, Z.dayTotals(win.getDay(OGGI), { supps:[], catalog:[], extrasByDay:{} }).kcal);
  atteso('salvataggio · in Oggi il pasto dice 268.3 kcal', win.getDay(OGGI).meals[0].kcal, 268.3);

  // 6 · pasto vecchio senza ingredienti, di ieri: diventa «1 porzione», ½ dimezza; la fascia si cambia senza perdere niente
  ST.activeDay = IERI; win.renderOggi();
  ST.logTime = '13:00';
  await win.smartOpenEdit(IERI, 'm2'); await attendi(5);
  const pizza = voce('pizza margherita');
  atteso('pasto vecchio · un ingrediente da 1 porzione con i valori del pasto', [ST.smartForm.items.length, pizza.quantity, pizza.unit, pizza.kcal, d.getElementById('log-time').value], [1, 1, 'pz', 800, '20:30']);
  win.smartPorzione(0.5);
  atteso('pasto vecchio · ½ porzione = 400 kcal, 20 P, 45 C, 15 G', [pizza.quantity, pizza.kcal, pizza.protein, pizza.carbs, pizza.fat], [0.5, 400, 20, 45, 15]);
  win.smartQtaPasso(pizza.tempId, 1);
  atteso('pasto vecchio · + va di mezza porzione (1 = 800 kcal)', [pizza.quantity, pizza.kcal], [1, 800]);
  win.smartQtaPasso(pizza.tempId, -1);
  win.setLogSlot('snack_pomeriggio');
  atteso('cambio fascia mentre modifico · il form resta, la fascia nuova va salvata, l\'orario resta', [ST.smartForm.editingMealId, ST.smartForm.items.length, ST.smartForm.editingSlot, d.getElementById('log-time').value], ['m2', 1, 'snack_pomeriggio', '20:30']);

  // 7 · senza rete: tutto in coda, a schermo subito; al ritorno si scrive
  t.__rete = false;
  ST.activeDay = OGGI;   // nel frattempo si è tornati a oggi: il pasto resta quello di ieri
  const n1 = supa._calls.length;
  await win.smartSavePasto(); await attendi(5);
  const m2 = win.getDay(IERI).meals.find(m => m.id === 'm2');
  atteso('senza rete · in coda (ingredienti, testata, vecchi da togliere: nessuno), a schermo il pasto di ieri cambiato', [coda().map(o => o.op.tabella + ':' + o.op.tipo), m2.kcal, m2.slot, m2.time, win.getDay(OGGI).meals.length], [['meal_items:insert', 'meals:update'], 400, 'snack_pomeriggio', '20:30', 1]);
  t.__rete = true;
  await win.svuotaCoda(); await attendi(5);
  const updRete = supa._calls.slice(n1).find(c => c.table === 'meals' && c.op === 'update' && c.payload && c.payload.kcal === 400);
  atteso('rete tornata · la coda si svuota e scrive la testata', [coda().length, !!updRete, updRete && updRete.payload.slot], [0, true, 'snack_pomeriggio']);

  // 8 · un ingrediente nuovo: la quantità si scrive, i valori li stima il coach; poi la proporzione parte da lì
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  win.smartAddEmptyRow();
  const nuovo = ST.smartForm.items[ST.smartForm.items.length - 1];
  d.querySelector(`[data-row-name="${nuovo.tempId}"]`).value = 'olio'; win.smartUpdateField(nuovo.tempId, 'name', 'olio');
  const campoNuovo = d.querySelector(`[data-row-qty="${nuovo.tempId}"]`);
  campoNuovo.value = '10'; campoNuovo.dispatchEvent(new win.Event('input', { bubbles:true }));
  atteso('ingrediente nuovo · quantità senza valori: niente proporzione', [nuovo.quantity, nuovo.kcal], [10, 0]);
  win.estimateSingleItem = async () => { chiamateCoach++; return { kcal:90, protein:0, carbs:0, fat:10 }; };
  await win.smartRecalcRow(nuovo.tempId); await attendi(5);
  win.smartQtaPasso(nuovo.tempId, 1);
  atteso('ingrediente nuovo · stima del coach una volta, poi 20 g = 180 kcal da soli', [chiamateCoach, nuovo.quantity, nuovo.kcal, nuovo.fat], [1, 20, 180, 20]);
  win.smartResetForm();

  atteso('zero errori in console', errori(), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
