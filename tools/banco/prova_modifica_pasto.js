// Nutrition 220 (24 ottobre 2026) — modificare un pasto già inserito, soprattutto quantità e porzioni. Prima la quantità
// stava dentro l'ingrediente chiuso e cambiarla non cambiava calorie e macro finché non si chiedeva la stima al coach; un
// pasto vecchio senza ingredienti diventava un ingrediente con quantità 0; il campo orario mostrava l'ora di adesso e la
// salvava sopra quella del pasto; toccare la fascia mentre si modificava svuotava il form. Qui: quantità in vista, valori
// in proporzione subito e senza coach, porzione dell'intero pasto, pasti vecchi e giorni passati, orario e fascia tenuti,
// senza rete in coda. Sezioni 9 e 10: le due revisioni (Nutrition 220 corretta e Nutrition 230, casi rari).
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
           { user_id:U, id:'m2', date:IERI, slot:'cena', kcal:800, protein:40, carbs:90, fat:30, description:'pizza margherita', notes:'', time:'20:30:00' },
           { user_id:U, id:'m3', date:'2026-10-22', slot:'snack_mattina', kcal:300, protein:10, carbs:60, fat:2, description:'pasta', notes:'', time:'17:00:00' }],
    meal_items:[{ id:'g1', user_id:U, meal_id:'m1', name:'riso', quantity:80, unit:'g', kcal:280, protein:6, carbs:60, fat:1, source:'manual', sort_order:0 },
                { id:'g2', user_id:U, meal_id:'m1', name:'pollo', quantity:120, unit:'g', kcal:220, protein:14, carbs:0, fat:14, source:'manual', sort_order:1 },
                // come le 75 righe vere di aprile-maggio 2026: quantità 0 e calorie scritte
                { id:'g3', user_id:U, meal_id:'m3', name:'pasta', quantity:0, unit:'g', kcal:300, protein:10, carbs:60, fat:2, source:'manual', sort_order:0 }],
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
  const modificaPrima = !!d.querySelector('#sw-m1 button.meal-modifica[aria-label="Modifica pasto"]');
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  const riso = voce('riso'), pollo = voce('pollo');
  atteso('apertura · ingredienti chiusi ma quantità in vista per tutti e due', [riso.expanded, !!d.querySelector(`[data-row-qty="${riso.tempId}"]`), d.querySelector(`[data-row-qty="${pollo.tempId}"]`) && d.querySelector(`[data-row-qty="${pollo.tempId}"]`).value], [false, true, '120']);
  const oraCard = (id) => { const e = d.querySelector(`#sw-${id} input[type=time]`); return e ? e.value : null; };
  atteso('apertura (Nutrition 230) · la modifica è dentro la card del pasto, il modulo in cima resta chiuso', [!!d.querySelector('#sw-m1 [data-row-qty]'), d.querySelectorAll('[data-row-qty]').length, ST.logOpen, !!d.querySelector('.oggi-v3-cta-row')], [true, 2, false, true]);
  atteso('apertura · nella card l\'ora del pasto (13:00), non l\'ultima scelta', oraCard('m1'), '13:00');
  atteso('apertura · al posto della matita un bottone «Modifica», e in modifica non c\'è più', [modificaPrima, !d.querySelector('#sw-m1 .meal-modifica'), /Salva modifiche/.test(d.querySelector('#sw-m1').textContent), /Annulla/.test(d.querySelector('#sw-m1').textContent)], [true, true, true, true]);
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
  atteso('pasto vecchio · un ingrediente da 1 porzione con i valori del pasto', [ST.smartForm.items.length, pizza.quantity, pizza.unit, pizza.kcal, oraCard('m2')], [1, 1, 'pz', 800, '20:30']);
  win.smartPorzione(0.5);
  atteso('pasto vecchio · ½ porzione = 400 kcal, 20 P, 45 C, 15 G', [pizza.quantity, pizza.kcal, pizza.protein, pizza.carbs, pizza.fat], [0.5, 400, 20, 45, 15]);
  win.smartQtaPasso(pizza.tempId, 1);
  atteso('pasto vecchio · + va di mezza porzione (1 = 800 kcal)', [pizza.quantity, pizza.kcal], [1, 800]);
  win.smartQtaPasso(pizza.tempId, -1);
  win.setLogSlot('snack_pomeriggio');
  atteso('cambio fascia mentre modifico · il form resta, la fascia nuova va salvata, l\'orario resta', [ST.smartForm.editingMealId, ST.smartForm.items.length, ST.smartForm.editingSlot, oraCard('m2')], ['m2', 1, 'snack_pomeriggio', '20:30']);

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

  // 9 · revisione del 25 ottobre 2026: i sei difetti trovati, uno per uno
  const scrivi = (it, txt) => { const c = d.querySelector(`[data-row-qty="${it.tempId}"]`); let v = ''; for (const ch of txt) { v += ch; c.value = v; c.dispatchEvent(new win.Event('input', { bubbles:true })); } return c; };
  // 9a · ingrediente da 0 g con 300 kcal: vale 1 porzione, una cifra per volta non moltiplica
  await win.smartOpenEdit('2026-10-22', 'm3'); await attendi(5);
  const pasta = voce('pasta');
  atteso('0 g e 300 kcal · si apre come 1 porzione', [pasta.quantity, pasta.unit, testo(`[data-row-qty="${pasta.tempId}"] + span`)], [1, 'pz', 'porz.']);
  scrivi(pasta, '1'); const k1 = pasta.kcal;
  scrivi(pasta, '1,5'); const k15 = pasta.kcal;
  scrivi(pasta, '02'); const k2 = pasta.kcal;
  atteso('0 g e 300 kcal · «1» = 300, «1,5» = 450, «0» e poi «02» = 600 (prima 45.000)', [k1, k15, k2, pasta.quantity], [300, 450, 600, 2]);
  win.smartQtaPasso(pasta.tempId, 1);
  atteso('0 g e 300 kcal · + di fila va di mezza porzione (2½ = 750)', [pasta.quantity, pasta.kcal], [2.5, 750]);
  atteso('soliti · la riga da 0 g e il pasto vecchio si ripetono come 1 porzione', [win.pastiSoliti(ST.db.days, 'snack_mattina')[0].items.map(x => [x.quantity, x.unit, x.kcal])], [[[1, 'pz', 300]]]);
  win.smartResetForm();
  // 9b · porzione: si calcola sempre dalla quantità a porzione 1
  await win.smartOpenEdit('2026-10-22', 'm3'); await attendi(5);
  const p2 = voce('pasta');
  win.smartPorzione(0.75); const tre4 = [p2.quantity, p2.kcal];
  win.smartPorzione(1); const uno = [p2.quantity, p2.kcal];
  win.smartPorzione(1.5); const unoemezzo = [p2.quantity, p2.kcal];
  win.smartPorzione(0.75); win.smartPorzione(2); const due = [p2.quantity, p2.kcal];
  atteso('porzione · ¾ = 0,75 e 225, poi 1 = 1 e 300, 1½ = 450, ¾ e poi 2 = 600 (prima 0,8 · 1,1 · 880)', [tre4, uno, unoemezzo, due], [[0.75, 225], [1, 300], [1.5, 450], [2, 600]]);
  // 9c · Stima coach legge la virgola
  let chiesto = null;
  win.estimateSingleItem = async (nome, q, u) => { chiesto = [nome, q, u]; return { kcal:450, protein:15, carbs:90, fat:3 }; };
  p2.expanded = true; win.renderOggi(); await attendi(5);
  win.smartPorzione(1.5); p2.expanded = true; win.renderOggi(); await attendi(5);
  await win.smartRecalcRow(p2.tempId); await attendi(5);
  atteso('Stima coach · «1,5» va al coach come 1,5 pz, non 1', [chiesto, p2.quantity], [['pasta', 1.5, 'pz'], 1.5]);
  win.smartPorzione(0.5);
  atteso('Stima coach · poi ½ dalla stima nuova (1,5 pz = 450 → 0,5 pz = 150)', [p2.quantity, p2.kcal], [0.5, 150]);
  win.smartResetForm();
  // 9d · il campo quantità non ridisegna quando perde il fuoco: il tocco su «Salva pasto» arriva
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  const r2 = voce('riso');
  const campoR = scrivi(r2, '100');
  const salva = d.querySelector('button[onclick="smartSavePasto()"]');
  campoR.dispatchEvent(new win.Event('change', { bubbles:true }));
  atteso('campo quantità · uscendo dal campo il bottone Salva resta lo stesso (il primo tocco non si perde)', [!!salva && d.contains(salva), r2.kcal], [true, 350]);
  // 9e · Analizza dopo ½: la porzione torna a 1
  win.smartPorzione(0.5);
  win.estimateMealItems = async () => ({ items:[{ name:'riso', quantity:100, unit:'g', kcal:350, protein:7, carbs:77, fat:1 }] });
  win.smartFreeTextChange('riso 100 g');
  await win.smartAnalyze(); await attendi(5);
  const r3 = voce('riso');
  atteso('Analizza dopo ½ · porzione di nuovo 1, bottone 1 acceso', [ST.smartForm.porzione, testo('.smart-porz.on')], [1, '1']);
  win.smartPorzione(0.5);
  atteso('Analizza dopo ½ · poi ½ dimezza davvero (50 g, 175 kcal)', [r3.quantity, r3.kcal], [50, 175]);
  win.smartPorzione(1);
  // 9f · cambio unità: i valori non si convertono da soli, li stima il coach
  win.smartUpdateField(r3.tempId, 'unit', 'pz'); r3.expanded = true; win.renderOggi(); await attendi(5);
  scrivi(r3, '2');
  atteso('cambio unità · 100 g → 2 pz: i valori restano (350, non 7), la nota chiede la stima', [r3.quantity, r3.unit, r3.kcal, /unità cambiata/.test(d.getElementById('page-oggi').textContent)], [2, 'pz', 350, true]);
  win.estimateSingleItem = async () => ({ kcal:100, protein:2, carbs:22, fat:0 });
  await win.smartRecalcRow(r3.tempId); await attendi(5);
  win.smartQtaPasso(r3.tempId, 1);
  atteso('cambio unità · dopo la stima la proporzione riparte (2 pz = 100 → 2½ = 125)', [r3.quantity, r3.kcal], [2.5, 125]);
  win.smartResetForm();

  // 10 · Nutrition 230 (25 ottobre 2026): i casi rari della revisione bis
  const salvaVisibile = () => { const b = d.querySelector('button[onclick="smartSavePasto()"]'); const box = b && b.closest('[data-smart-vis]'); return !!b && (!box || box.style.display !== 'none'); };
  const porzioniVisibili = () => { const g = d.querySelector('.smart-porzioni'); const box = g && g.closest('[data-smart-vis]'); return !!g && (!box || box.style.display !== 'none'); };
  // 10a · ¾ di una porzione si salva 0,75 (non 0,8 con le calorie di 0,75) e riaprendo 1 porzione vale ancora 300
  await win.smartOpenEdit('2026-10-22', 'm3'); await attendi(5);
  win.smartPorzione(0.75);
  const n3 = supa._calls.length;
  await win.smartSavePasto(); await attendi(5);
  const insP = supa._calls.slice(n3).find(c => c.table === 'meal_items' && c.op === 'insert');
  const righeP = insP ? [].concat(insP.payload).map(r => [r.quantity, r.unit, r.kcal]) : null;
  await win.smartOpenEdit('2026-10-22', 'm3'); await attendi(5);
  const p3 = voce('pasta');
  win.smartQtaPasso(p3.tempId, 1);
  atteso('¾ porzione · si salva 0,75 pz e 225 kcal; riaperto, + porta a 1 = 300 (prima 0,8 e 750)', [righeP, p3.quantity, p3.kcal], [[[0.75, 'pz', 225]], 1, 300]);
  // 10b · pasto a zero e quantità riscritta: totale, «Salva pasto» e porzioni ricompaiono senza ridisegnare
  win.smartQtaPasso(p3.tempId, -1); win.smartQtaPasso(p3.tempId, -1);
  const salvaAZero = salvaVisibile();
  scrivi(p3, '1');
  atteso('a zero e riscritto · Salva sparisce a 0 e torna scrivendo 1 (300 kcal), porzioni anche', [salvaAZero, p3.kcal, salvaVisibile(), porzioniVisibili()], [false, 300, true, true]);
  win.smartResetForm();
  // 10c · unità cambiata e campo svuotato: l'unità resta quella scelta (m1 è salvato dalla sezione 5: riso 40 g 140, pollo 70 g 128,3)
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  let rs = voce('riso'), pl = voce('pollo');
  win.smartUpdateField(rs.tempId, 'unit', 'ml');
  const cv = d.querySelector(`[data-row-qty="${rs.tempId}"]`); cv.value = ''; cv.dispatchEvent(new win.Event('input', { bubbles:true }));   // cancellato col tasto indietro
  scrivi(rs, '350');
  atteso('unità cambiata e campo svuotato · resta ml, i valori fermi (non 350 pz)', [rs.quantity, rs.unit, rs.kcal, !!rs._porz], [350, 'ml', 140, false]);
  win.smartResetForm();
  // 10d · unità cambiata: la porzione dimezza lo stesso, e tornando all'unità di prima i valori seguono di nuovo
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  rs = voce('riso'); pl = voce('pollo');
  win.smartUpdateField(rs.tempId, 'unit', 'pz'); scrivi(rs, '2');
  win.smartPorzione(0.5);
  atteso('unità cambiata · ½ dimezza anche l\'ingrediente da stimare (1 pz, 70 kcal) e il pollo (35 g, 64,2)', [rs.quantity, rs.kcal, pl.quantity, pl.kcal], [1, 70, 35, 64.2]);
  win.smartResetForm();
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  rs = voce('riso');
  win.smartUpdateField(rs.tempId, 'unit', 'pz'); win.smartUpdateField(rs.tempId, 'unit', 'g'); win.renderOggi(); await attendi(5);
  scrivi(rs, '100');
  atteso('g → pz → g · 100 g = 350 kcal, niente stima da chiedere', [rs.quantity, rs.unit, rs.kcal, !!rs._daStimare], [100, 'g', 350, false]);
  win.smartResetForm();
  // 10e · porzione cambiata mentre il coach stima: la stima vale per 10 g e si scala ai 5 g di adesso
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  win.smartAddEmptyRow();
  const ol = ST.smartForm.items[ST.smartForm.items.length - 1];
  d.querySelector(`[data-row-name="${ol.tempId}"]`).value = 'olio'; win.smartUpdateField(ol.tempId, 'name', 'olio');
  scrivi(ol, '10');
  let rispondi;
  win.estimateSingleItem = () => new Promise(r => { rispondi = r; });
  const inCorso = win.smartRecalcRow(ol.tempId); await attendi(5);
  win.smartPorzione(0.5);
  rispondi({ kcal:90, protein:0, carbs:0, fat:10 }); await inCorso; await attendi(5);
  const durante = [ol.quantity, ol.kcal];
  win.smartPorzione(1);
  atteso('stima durante un cambio · 5 g = 45 kcal, poi porzione 1 = 10 g e 90 (prima 180)', [durante, [ol.quantity, ol.kcal]], [[5, 45], [10, 90]]);
  win.smartResetForm();

  // 10f · Annulla nella card chiude la modifica; «+ Registra pasto» mentre si modifica apre un pasto nuovo, vuoto
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  const annulla = [...d.querySelectorAll('#sw-m1 button')].find(b => b.textContent.trim() === 'Annulla');
  annulla.dispatchEvent(new win.MouseEvent('click', { bubbles:true })); await attendi(5);
  const dopoAnnulla = [ST.smartForm.editingMealId, d.querySelectorAll('[data-row-qty]').length, !!d.querySelector('#sw-m1 .meal-modifica')];
  await win.smartOpenEdit(OGGI, 'm1'); await attendi(5);
  win.openMealLogForm(); await attendi(5);
  atteso('Annulla nella card chiude la modifica; «+ Registra pasto» apre un pasto nuovo e vuoto', [dopoAnnulla, [ST.smartForm.editingMealId, ST.smartForm.items.length, ST.logOpen, !!d.querySelector('#sw-m1 [data-row-qty]')]], [[null, 0, true], [null, 0, true, false]]);
  win.smartResetForm(); ST.logOpen = false;

  atteso('zero errori in console', errori(), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
