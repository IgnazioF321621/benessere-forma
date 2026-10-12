// Difetto di Ignazio del 12 ottobre 2026 (Rilascio 36): nel foglio «Registra integratori» un «⋯ → Sospendi» toccato per sbaglio
// non si riusciva a rimediare nella stessa giornata. Ora: il sospeso RESTA nel suo pacchetto, in grigio, con «sospeso» e un
// «Riattiva» sulla stessa riga; dopo «Sospendi» un avviso con «Annulla» lo rimette con un tocco; il menù spiega in una riga
// cosa fa «Sospendi». La scrittura passa da scriviConCoda: senza rete va in coda e parte al ritorno della rete.
// Casi: sospendo → riattivo nello stesso giorno → spunto · Annulla dall'avviso · l'avviso sparisce da solo · senza rete.
//   node tools/banco/prova_registra_sospendi.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-12';
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
  supplements:[ supp('s1', 'Proteine', '06:30'), supp('s2', 'Fibre', '06:30'), supp('s3', 'Omega 3', '06:30'), supp('s7', 'Melatonina', '22:00') ],
  supplement_packages:[ { id:'pA', user_id:U, name:'Pack Mami', time:'06:30', emoji:'🥤', sort_order:0 } ],
  supplement_package_items:[ ['i1','pA','s1'], ['i2','pA','s2'], ['i3','pA','s3'] ].map(([id, p, s], i) => ({ id, user_id:U, package_id:p, supplement_id:s, sort_order:i })),
  supplements_log:[],
};
(async () => {
  const b = boot(t, { now:OGGI + 'T09:00:00' });
  await b.avviato;
  const { win, supa } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.catalog = []; ST.activeDay = OGGI; ST.page = 'oggi';
  await win.loadSupps(); await win.loadPackages(); await win.loadAllDays();
  win.renderOggi(); win.openSuppSheet(); await attendi(5);
  const foglio = () => d.getElementById('supp-sheet-body');
  const testo = (el) => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  const gruppo = (id) => foglio().querySelector(`[data-gruppo="${id}"]`);
  const riga = (id) => foglio().querySelector(`[data-supp="${id}"]`);
  const bottone = (el, testoB) => [...el.querySelectorAll('button')].find(x => x.textContent.trim() === testoB);
  const avviso = () => d.getElementById('rs-avviso');
  const attivo = (id) => ST.supps.find(s => s.local_id === id).active;
  const scritture = () => supa._calls.filter(c => c.table === 'supplements' && c.op === 'update').map(c => [c.payload.active, c.filters.find(f => f[1] === 'id')[2]]);
  const coda = () => JSON.parse(win.localStorage.getItem('zt_coda_' + U) || '[]');
  const presi = () => [...(win.getDay(OGGI).suppsTaken || [])].sort();

  // il menù spiega cosa fa «Sospendi»
  riga('s2').querySelector('.rs-piu').click(); await attendi(5);
  atteso('il menù della riga spiega «Sospendi» in una riga', testo(gruppo('pA').querySelector('.rs-menu-nota')), 'Sospendi: toglie il prodotto dalla tua giornata finché non lo riattivi. Resta qui, in grigio.');

  // 1 · sospendo per sbaglio → la riga resta nel pacchetto, in grigio, con «Riattiva»; l'avviso con «Annulla»
  bottone(gruppo('pA'), 'Sospendi').click(); await attendi(20);
  atteso('Sospendi · Fibre resta nel Pack Mami, in grigio, «sospeso», con «Riattiva» sulla riga; niente spunta né «⋯»', [!!riga('s2'), riga('s2').classList.contains('sospeso'), testo(riga('s2')), !!riga('s2').querySelector('.rs-piu'), !!riga('s2').querySelector('.rs-spunta.vuota')], [true, true, 'FibresospesoRiattiva', false, true]);
  atteso('Sospendi · scritto sospeso nel database; Oggi non lo mostra più; «Prendi tutto» conta 2 prodotti', [attivo('s2'), scritture(), [...gruppo('pA').querySelectorAll('[data-supp]:not(.sospeso)')].length], [false, [[false, 's2']], 2]);
  atteso('Sospendi · compare l\'avviso con «Annulla»', [!!avviso(), avviso() && testo(avviso())], [true, 'Fibre sospeso: non è più nella tua giornataAnnulla']);

  // 2 · Annulla dall'avviso → torna attivo, subito spuntabile
  avviso().querySelector('button').click(); await attendi(20);
  atteso('Annulla · Fibre torna attivo nel pacchetto, l\'avviso sparisce, scritto attivo nel database', [attivo('s2'), riga('s2').classList.contains('sospeso'), !!avviso(), scritture().slice(-1)], [true, false, false, [[true, 's2']]]);
  riga('s2').querySelector('.rs-spunta').click(); await attendi(20);
  atteso('Annulla · e si può spuntare subito, senza ricaricare', [presi(), riga('s2').classList.contains('on')], [['s2'], true]);
  riga('s2').querySelector('.rs-spunta').click(); await attendi(20);

  // 3 · sospendo → riattivo dalla riga nello stesso giorno → spunto
  riga('s3').querySelector('.rs-piu').click(); await attendi(5); bottone(gruppo('pA'), 'Sospendi').click(); await attendi(20);
  atteso('sospendo Omega 3 · riga in grigio, avviso presente', [riga('s3').classList.contains('sospeso'), !!avviso()], [true, true]);
  bottone(riga('s3'), 'Riattiva').click(); await attendi(20);
  atteso('Riattiva dalla riga · torna attivo, l\'avviso va via, c\'è il «grazie» nel toast', [attivo('s3'), riga('s3').classList.contains('sospeso'), !!avviso(), d.getElementById('toast').textContent], [true, false, false, '✅ Omega 3 torna nella tua giornata']);
  riga('s3').querySelector('.rs-spunta').click(); await attendi(20);
  atteso('Riattiva · e si spunta: registrato', [presi(), riga('s3').classList.contains('on')], [['s3'], true]);

  // 4 · l'avviso sparisce da solo dopo 6 secondi (qui si accorcia il tempo)
  riga('s1').querySelector('.rs-piu').click(); await attendi(5); bottone(gruppo('pA'), 'Sospendi').click(); await attendi(20);
  const av = avviso(); win.clearTimeout(av._timer); av._timer = win.setTimeout(win.rsAvvisoVia, 30); await attendi(60);
  atteso('l\'avviso sparisce da solo; Proteine resta sospeso finché non si riattiva', [!!avviso(), attivo('s1'), riga('s1').classList.contains('sospeso')], [false, false, true]);
  bottone(riga('s1'), 'Riattiva').click(); await attendi(20);

  // 5 · senza rete: sospendere e riattivare vanno in coda, a schermo cambia subito; al ritorno della rete partono
  t.__rete = false;
  const prima = supa._calls.filter(c => c.table === 'supplements' && c.op === 'update').length;
  riga('s7').querySelector('.rs-piu').click(); await attendi(5); bottone(gruppo('altri'), 'Sospendi').click(); await attendi(40);
  atteso('senza rete · Melatonina sospesa a schermo, la scrittura è in coda, nessun «errore»', [riga('s7').classList.contains('sospeso'), attivo('s7'), coda().length, /errore/i.test(testo(foglio()) + testo(avviso()))], [true, false, 1, false]);
  bottone(riga('s7'), 'Riattiva').click(); await attendi(40);
  atteso('senza rete · riattivata a schermo, due scritture in coda', [attivo('s7'), riga('s7').classList.contains('sospeso'), coda().length], [true, false, 2]);
  t.__rete = undefined;
  const primaRete = supa._calls.length;   // i tentativi falliti senza rete stanno comunque nell'elenco delle chiamate
  await win.svuotaCoda(); await attendi(20);
  const arrivate = supa._calls.slice(primaRete).filter(c => c.table === 'supplements' && c.op === 'update').map(c => [c.payload.active, c.filters.find(f => f[1] === 'id')[2]]).filter(x => x[1] === 's7');
  atteso('torna la rete · la coda si svuota, in ordine: sospesa poi riattivata', [coda().length, arrivate], [0, [[false, 's7'], [true, 's7']]]);

  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
