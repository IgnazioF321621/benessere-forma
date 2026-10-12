// Nutrition 210 · 190 · 120 (Ondata 3, Sessione G, 11 ottobre 2026, deciso con Ignazio) — il foglio «Registra integratori» a elenco:
// i pacchetti uno sotto l'altro con «Prendi tutto», le righe coi prodotti e la spunta che registra subito (senza «Conferma»),
// il «⋯» di ogni riga (Non oggi · Sostituisci con… · Sospendi), la riga «Sospesi» per riattivare, «Altri integratori» per chi è
// fuori dai pacchetti. Casi: una spunta, due spunte, pacchetto intero (e «Togli tutto»), togliere un prodotto, Non oggi,
// Sostituisci (solo oggi), Sospendi e Riattiva, senza rete (la spunta va in coda e parte al ritorno della rete). Niente «errore».
//   node tools/banco/prova_registra_integratori.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-11';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(72), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const supp = (id, name, slot, extra = {}) => ({ id, user_id:U, name, slot, active:true, quantity:1, sort_order:0, ...extra });
const t = {
  profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], nutrilite_catalog:[],
  supplements:[ supp('s1', 'Proteine', '06:30'), supp('s2', 'Fibre', '06:30', { quantity:2 }), supp('s3', 'Omega 3', '06:30'),
                supp('s4', 'Vitamina C', '13:30'), supp('s5', 'Ferro', '13:30'),
                supp('s6', 'Magnesio', '06:30', { active:false }),      // sospeso, nel Pack Mami
                supp('s7', 'Melatonina', '22:00') ],                      // fuori da ogni pacchetto
  supplement_packages:[ { id:'pA', user_id:U, name:'Pack Mami', time:'06:30', emoji:'🥤', sort_order:0 }, { id:'pB', user_id:U, name:'Pack Pranzo', time:'13:30', emoji:'🍽️', sort_order:1 } ],
  supplement_package_items:[ ['i1','pA','s1'], ['i2','pA','s2'], ['i3','pA','s3'], ['i6','pA','s6'], ['i4','pB','s4'], ['i5','pB','s5'] ].map(([id, p, s], i) => ({ id, user_id:U, package_id:p, supplement_id:s, sort_order:i })),
  supplements_log:[],
};
(async () => {
  const b = boot(t, { now:OGGI + 'T09:00:00' });
  await b.avviato;
  const { win, supa } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.catalog = []; ST.activeDay = OGGI; ST.page = 'oggi';
  await win.loadSupps(); await win.loadPackages(); await win.loadAllDays();
  win.renderOggi();
  const foglio = () => d.getElementById('supp-sheet-body');
  const testo = (el) => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  const gruppo = (id) => foglio().querySelector(`[data-gruppo="${id}"]`);
  const riga = (id) => foglio().querySelector(`[data-supp="${id}"]`);
  const presi = () => [...(win.getDay(OGGI).suppsTaken || [])].sort();
  const scritture = () => supa._calls.filter(c => c.table === 'supplements_log' && c.op !== 'select').map(c => c.op + ':' + (c.op === 'insert' ? (Array.isArray(c.payload) ? c.payload[0] : c.payload).supplement_id : (/supplement_id\.eq\."?([^",\s)]+)/.exec(c.filters.map(x => x.join(' ')).join(' ')) || [])[1]));
  const bottone = (el, testoB) => [...el.querySelectorAll('button')].find(x => x.textContent.trim() === testoB);
  const coda = () => JSON.parse(win.localStorage.getItem('zt_coda_' + U) || '[]');

  // il foglio si apre dal tasto di Oggi
  bottone(d.getElementById('page-oggi'), '+ Registra integratori').click(); await attendi(5);
  atteso('il foglio si apre, a elenco: due pacchetti in ordine di orario più «Altri integratori», niente «Come vuoi registrare?»', [d.getElementById('supp-sheet').style.display, [...foglio().querySelectorAll('[data-gruppo]')].map(g => g.dataset.gruppo), /Come vuoi registrare|Gruppo.*Singolo/.test(testo(foglio()))], ['flex', ['pA', 'pB', 'altri'], false]);
  atteso('Pack Mami · tre righe da prendere più il sospeso in coda, in grigio; «Prendi tutto»; la dose doppia si legge', [[...gruppo('pA').querySelectorAll('[data-supp]')].map(r => r.dataset.supp + (r.classList.contains('sospeso') ? ':sospeso' : '')), !!bottone(gruppo('pA'), 'Prendi tutto'), testo(riga('s2'))], [['s1', 's2', 's3', 's6:sospeso'], true, 'Fibre× 2 ⋯']);
  atteso('nessun gruppo scritto a mano: il titolo è il nome del pacchetto, con l\'orario', testo(gruppo('pA').querySelector('.rs-gruppo-nome')), 'Pack Mami06:30');

  // 1 · una spunta: si registra subito, con l'id del prodotto, senza «Conferma»
  riga('s1').querySelector('.rs-spunta').click(); await attendi(20);
  atteso('una spunta · preso subito, una riga in supplements_log con supplement_id, la riga è piena', [presi(), scritture(), riga('s1').classList.contains('on')], [['s1'], ['delete:s1', 'insert:s1'], true]);
  atteso('una spunta · Oggi si è ridisegnato con il prodotto preso', (win.getDay(OGGI).suppsTaken || []).length === 1 && d.getElementById('page-oggi').innerHTML.includes('Proteine'), true);

  // 2 · due spunte insieme (seconda e terza riga)
  riga('s2').querySelector('.rs-nome').click(); await attendi(5); riga('s3').querySelector('.rs-spunta').click(); await attendi(20);
  atteso('due spunte di seguito · tre presi; il pacchetto completo si ripiega in «3/3 ✓»', [presi(), !!gruppo('pA').classList.contains('fatto'), testo(gruppo('pA').querySelector('.rs-conto'))], [['s1', 's2', 's3'], true, '3/3 ✓']);
  gruppo('pA').querySelector('.rs-gruppo-testa').click(); await attendi(5);
  atteso('un tocco riapre il pacchetto completo: tre righe piene e «Togli tutto»', [gruppo('pA').querySelectorAll('[data-supp].on').length, !!bottone(gruppo('pA'), 'Togli tutto')], [3, true]);

  // 3 · togliere un prodotto: la spunta di nuovo
  riga('s2').querySelector('.rs-spunta').click(); await attendi(20);
  atteso('togliere un prodotto · una cancellazione, la riga torna vuota, «Prendi tutto» torna', [presi(), scritture().slice(-1), riga('s2').classList.contains('on'), !!bottone(gruppo('pA'), 'Prendi tutto')], [['s1', 's3'], ['delete:s2'], false, true]);

  // 4 · pacchetto intero
  const prima4 = supa._calls.length;
  bottone(gruppo('pB'), 'Prendi tutto').click(); await attendi(30);
  atteso('«Prendi tutto» · i due prodotti del Pack Pranzo registrati in un colpo, pacchetto ripiegato «2/2 ✓»', [presi(), supa._calls.slice(prima4).filter(c => c.table === 'supplements_log' && c.op === 'insert').length, testo(gruppo('pB').querySelector('.rs-conto'))], [['s1', 's3', 's4', 's5'], 2, '2/2 ✓']);
  gruppo('pB').querySelector('.rs-gruppo-testa').click(); await attendi(5);
  bottone(gruppo('pB'), 'Togli tutto').click(); await attendi(30);
  atteso('«Togli tutto» · i due prodotti tolti, due cancellazioni', [presi(), scritture().slice(-2)], [['s1', 's3'], ['delete:s4', 'delete:s5']]);

  // 5 · «⋯» → Non oggi: saltato, «Prendi tutto» non lo conta
  riga('s2').querySelector('.rs-piu').click(); await attendi(5);
  atteso('il menù della riga: Non oggi · Sostituisci con… · Sospendi', [...gruppo('pA').querySelectorAll('.rs-menu button')].map(x => x.textContent.trim()), ['Non oggi', 'Sostituisci con…', 'Sospendi']);
  bottone(gruppo('pA'), 'Non oggi').click(); await attendi(5);
  atteso('Non oggi · la riga è barrata «non oggi»; il pacchetto conta completo (2/3 ✓) e «Prendi tutto» non c\'è più', [riga('s2').classList.contains('saltato'), testo(riga('s2')).includes('non oggi'), win.getDay(OGGI).suppsSaltati, testo(gruppo('pA').querySelector('.rs-conto')), !!bottone(gruppo('pA'), 'Prendi tutto')], [true, true, ['s2'], '2/3 ✓', false]);
  riga('s2').querySelector('.rs-piu').click(); await attendi(5); bottone(gruppo('pA'), 'Rimetti oggi').click(); await attendi(5);
  atteso('Rimetti oggi · torna da prendere', [riga('s2').classList.contains('saltato'), win.getDay(OGGI).suppsSaltati, !!bottone(gruppo('pA'), 'Prendi tutto')], [false, [], true]);

  // 6 · Sostituisci con… (solo oggi): l'altro si registra, questo si salta, il pacchetto non cambia
  riga('s2').querySelector('.rs-piu').click(); await attendi(5); bottone(gruppo('pA'), 'Sostituisci con…').click(); await attendi(5);
  const scelte = [...gruppo('pA').querySelectorAll('.rs-lista .rs-scelta')].map(x => x.textContent.trim());
  atteso('Sostituisci · la lista offre gli altri attivi non presi (Vitamina C, Ferro, Melatonina), il catalogo e Annulla', scelte, ['Vitamina C', 'Ferro', 'Melatonina', 'Cerca nel catalogo…', 'Annulla']);
  bottone(gruppo('pA'), 'Ferro').click(); await attendi(20);
  atteso('Sostituisci · Ferro registrato, Fibre saltato solo oggi, pacchetti intatti', [presi(), win.getDay(OGGI).suppsSaltati, scritture().slice(-1), t.supplement_package_items.length, riga('s5').classList.contains('on')], [['s1', 's3', 's5'], ['s2'], ['insert:s5'], 6, true]);

  // 7 · Sospendi e Riattiva (dal 12 ottobre il sospeso resta nel suo pacchetto, in grigio, con «Riattiva» sulla riga; la prova completa è prova_registra_sospendi.js)
  riga('s3').querySelector('.rs-spunta').click(); await attendi(20);   // prima lo tolgo, così la sospensione è di un prodotto non preso
  riga('s3').querySelector('.rs-piu').click(); await attendi(5); bottone(gruppo('pA'), 'Sospendi').click(); await attendi(20);
  const sospesoDB = supa._calls.filter(c => c.table === 'supplements' && c.op === 'update').map(c => [c.payload.active, c.filters.find(f => f[1] === 'id')[2]]);
  atteso('Sospendi · Omega 3 resta nel Pack Mami in grigio con «sospeso» e «Riattiva», scritto sospeso nel database', [riga('s3').classList.contains('sospeso'), testo(riga('s3')), sospesoDB], [true, 'Omega 3sospesoRiattiva', [[false, 's3']]]);
  atteso('Sospendi · anche Magnesio, sospeso da prima, sta nel suo pacchetto con «Riattiva»', [!!riga('s6'), riga('s6') && riga('s6').classList.contains('sospeso'), !!foglio().querySelector('.rs-sospesi')], [true, true, false]);
  bottone(riga('s3'), 'Riattiva').click(); await attendi(20);
  atteso('Riattiva · Omega 3 torna da prendere nel Pack Mami, scritto attivo', [riga('s3').classList.contains('sospeso'), riga('s3').classList.contains('on'), !!riga('s3').querySelector('.rs-spunta:not(.vuota)'), sospesoDB.length + 1 === supa._calls.filter(c => c.table === 'supplements' && c.op === 'update').length], [false, false, true, true]);

  // 8 · senza rete: la spunta va in coda e si registra al ritorno della rete
  t.__rete = false;
  const prima8 = supa._calls.length;
  riga('s3').querySelector('.rs-spunta').click(); await attendi(40);
  atteso('senza rete · la riga è piena lo stesso, la scrittura è in coda', [riga('s3').classList.contains('on'), presi().includes('s3'), coda().length >= 1, /errore/i.test(testo(foglio()))], [true, true, true, false]);
  t.__rete = undefined;
  await win.svuotaCoda(); await attendi(20);
  atteso('torna la rete · la coda si svuota e Omega 3 arriva in supplements_log', [coda().length, supa._calls.slice(prima8).some(c => c.table === 'supplements_log' && c.op === 'insert' && (Array.isArray(c.payload) ? c.payload[0] : c.payload).supplement_id === 's3')], [0, true]);

  // «+ Un altro prodotto» apre il catalogo (come prima) e chiude il foglio
  bottone(foglio(), '+ Un altro prodotto').click(); await attendi(5);
  atteso('«+ Un altro prodotto» · chiude il foglio e apre il catalogo per registrare un extra', [d.getElementById('supp-sheet').style.display, ST.catalogContext && ST.catalogContext.mode], ['none', 'registerExtra']);

  // nel codice: il foglio vecchio a due modi è uscito, la parola «errore» non compare nei testi del foglio
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'nutrition.js'), 'utf8');
  const blocco = src.slice(src.indexOf('function openSuppSheet'), src.indexOf('async function deleteSuppLog'));
  atteso('nel codice · niente confirmSuppGroup / setSuppSheetMode / «Shake Mami» nel foglio, niente «errore»', [/confirmSuppGroup|setSuppSheetMode|confirmSuppSingle/.test(src), /Shake Mami/.test(blocco), /errore/i.test(blocco.replace(/\/\/.*$/gm, ''))], [false, false, false]);
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
