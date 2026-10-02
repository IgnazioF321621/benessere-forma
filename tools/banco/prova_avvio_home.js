// Fondamenta 100, tappa 1 — l'apertura della Home: le proposte di Pirsi si leggono una volta
// per apertura, e la Home si disegna una volta per fotogramma invece di una volta per lettura.
//   node tools/banco/prova_avvio_home.js [cartella di prima]
// Con una cartella di prima (git archive di un commit precedente: zona-tracker.html, app/, shared/)
// la stessa prova gira anche sulla pagina vecchia: deve dare numeri peggiori, altrimenti non sta
// misurando quello che crede.
process.env.TZ = 'Europe/Rome';
const path = require('path');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const profilo = { id:U, first_name:'Ignazio', m2_skipped:true, train_start_date:'2026-08-24', obiettivo:'ricomposizione', usa_training:true, weight_kg:72 };
// Venerdì 2 ottobre 2026: la settimana in corso parte lunedì 28 settembre, quella appena chiusa lunedì 21.
const NOW = '2026-10-02T12:00:00';
const lunedi = (k) => { const d = new Date(Date.UTC(2026, 8, 28)); d.setUTCDate(d.getUTCDate() - 7 * k); return d.toISOString().slice(0, 10); };
// Dieci settimane chiuse già salvate alla versione corrente: niente storico da ricalcolare all'apertura.
const quadri = () => Array.from({ length: 10 }, (_, k) => k + 1).map(k => ({ user_id:U, week_start:lunedi(k), version:2, picture:{ meta:{ week_start:lunedi(k), version:2, is_closed:true, errors:[], computed_at:'2026-09-28T06:00:00Z' } } }));
const propostaFatta = () => [{ user_id:U, id:'c1', week_start:lunedi(1), kind:'keep', status:'pending', title:'x', reason:'x', evidence:{ numeri:[] } }];

// Apre l'app come a ogni apertura normale (copia locale presente) e conta: le letture di coach_proposals,
// le richieste di disegno della Home (renderHome) e i disegni veri (renderHomeV2).
// Con fotogrammi:'fermi' requestAnimationFrame non scorre: i disegni prenotati si contano, poi si
// sbloccano a mano con sblocca(); così il conteggio non dipende dalla velocità della macchina.
async function apertura(proposte, opz = {}){
  const b = boot({ profiles:[profilo], weekly_pictures:quadri(), coach_proposals:proposte, daily_log:[], app_errors:[] }, { now:NOW, file:opz.file });
  const win = b.win, ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' };
  const conta = { renderHome:0, renderHomeV2:0 };
  for(const fn of Object.keys(conta)){ const orig = win[fn]; win[fn] = function(...a){ conta[fn]++; return orig.apply(this, a); }; }
  const coda = [];
  if(opz.fotogrammi === 'fermi') win.requestAnimationFrame = (cb) => { coda.push(cb); return coda.length; };
  win.localStorage.setItem(win.eval('ZT_CACHE_KEY'), JSON.stringify({ profile: profilo, db:{ days:{} }, TARGET:{ kcal:1900, protein:143, carbs:190, fat:63 } }));
  await win.loadAndStart(); await attendi(500);
  const cp = b.supa._calls.filter(c => c.table === 'coach_proposals');
  const letture = cp.filter(c => c.op === 'select').length, scritture = cp.length - letture;
  const sblocca = () => { const cbs = coda.splice(0); cbs.forEach(cb => cb()); return cbs.length; };
  return { b, win, ST, conta, letture, scritture, coda, sblocca };
}

(async () => {
  // 1. apertura normale: le proposte della settimana chiusa ci sono già (il cron del lunedì le ha messe)
  let a = await apertura(propostaFatta(), { fotogrammi:'fermi' });
  atteso('apertura normale · coach_proposals letta una volta (3 richieste)', [a.letture, a.scritture], [3, 0]);
  atteso('apertura normale · le proposte sono in ST per tutti e due i chiamanti', [a.ST.coachProposals.map(p => p.id), a.ST.coachDeloads], [['c1'], []]);
  atteso('apertura normale · la Home è stata chiesta più volte', a.conta.renderHome >= 5, true);
  atteso('apertura normale · ma c\'è un solo disegno prenotato, non ancora fatto', [a.coda.length, a.conta.renderHomeV2], [1, 0]);
  const fatti = a.sblocca();
  const home = a.win.document.getElementById('page-home');
  atteso('al fotogramma · un disegno solo, e la Home c\'è', [fatti, a.conta.renderHomeV2, /Ignazio/.test(home.textContent), /La tua settimana/.test(home.textContent)], [1, 1, true, true]);
  a.win.renderHome(); a.win.renderHome(); a.win.renderHome();
  atteso('dopo il fotogramma · tre richieste, una prenotazione', a.coda.length, 1);
  atteso('dopo il fotogramma · un disegno', [a.sblocca(), a.conta.renderHomeV2], [1, 2]);
  atteso('zero errori in console', a.b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);

  // 2. le proposte della settimana chiusa mancano: l'app le genera, le salva e le rilegge (una rilettura voluta)
  a = await apertura([], { fotogrammi:'fermi' });
  atteso('da generare · due letture (apertura + rilettura dopo il salvataggio), un salvataggio', [a.letture, a.scritture], [6, 1]);
  atteso('da generare · un solo disegno prenotato', [a.coda.length, a.conta.renderHomeV2], [1, 0]);

  // 3. coi fotogrammi che scorrono davvero (jsdom a 60 al secondo): quanti disegni fa l'apertura
  a = await apertura(propostaFatta());
  console.log(`  --  coi fotogrammi veri: Home chiesta ${a.conta.renderHome} volte, disegnata ${a.conta.renderHomeV2}`);
  atteso('fotogrammi veri · meno disegni che richieste', a.conta.renderHomeV2 < a.conta.renderHome, true);

  // 4. la pagina di prima, stessi dati: deve fare peggio
  const prima = process.argv[2];
  if(prima){
    const file = path.join(prima, 'zona-tracker.html');
    const p1 = await apertura(propostaFatta(), { file, fotogrammi:'fermi' });
    const p2 = await apertura([], { file, fotogrammi:'fermi' });
    console.log(`  --  prima · apertura normale: coach_proposals ${p1.letture} letture · Home disegnata ${p1.conta.renderHomeV2} volte su ${p1.conta.renderHome} richieste, niente da sbloccare (${p1.coda.length})`);
    console.log(`  --  prima · da generare: coach_proposals ${p2.letture} letture, ${p2.scritture} scritture`);
    atteso('prima · la prova distingue: più letture e più disegni', [p1.letture > 3, p2.letture > 6, p1.conta.renderHomeV2 > 1], [true, true, true]);
  } else console.log('  --  confronto con la pagina di prima saltato (nessuna cartella passata)');

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
