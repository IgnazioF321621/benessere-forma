// Nutrition 010 (audit del 1 ottobre, Ondata 2 · 11 ottobre 2026) — «Giorno Detox» rompeva la pagina Nutrition: il ramo del digiuno
// leggeva `sTot`, un dato che non esiste, e la pagina Oggi restava vuota, senza nemmeno il pulsante per tornare indietro.
// Qui: si tocca «Giorno Detox» e la pagina si ridisegna (pulsante «Digiuno attivo», anello nuovo coi totali del giorno, integratori);
// si ricarica l'app con il digiuno già scritto e la pagina Oggi si riapre; si toglie il digiuno e torna il giorno normale.
//   node tools/banco/prova_detox.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(70), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-11';
const fixture = (digiuno) => ({
  profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, target_kcal:2000 }],
  meals:[], meal_items:[], supplements_log:[], supplements:[], extras:[],
  fasting_days: digiuno ? [{ user_id:U, date:OGGI }] : [],
});
async function apri(t){
  const b = boot(t, { now:OGGI + 'T09:00:00' });
  await b.avviato;
  const { win } = b; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.catalog = []; ST.supps = []; ST.activeDay = OGGI;
  ST.TARGET = { kcal:2000, protein:150, carbs:200, fat:67 };
  await win.loadAllDays();
  win.renderOggi();
  return b;
}
const pagina = (b) => b.win.document.getElementById('page-oggi') || b.win.document.querySelector('#page-nutrition, #page-oggi, [id^="page-"]');
const testo = (el) => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
const bottoneDetox = (b) => [...b.win.document.querySelectorAll('button')].find(x => /Giorno Detox|Digiuno attivo/.test(x.textContent));
const errori = (b) => b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]);

(async () => {
  // 1 · giorno normale, poi «Giorno Detox»
  const a = await apri(fixture(false));
  atteso('giorno normale · il pulsante dice «Giorno Detox»', testo(bottoneDetox(a)), 'Giorno Detox');
  const scritture = () => a.supa._calls.filter(c => c.table === 'fasting_days' && c.op !== 'select').length;   // all'avvio c'è solo la lettura
  const scritturePrima = scritture();
  bottoneDetox(a).click(); await attendi(30);
  const p = pagina(a);
  atteso('Detox · il giorno è segnato e scritto in fasting_days (una scrittura)', [a.win.getDay(OGGI).fasting, scritturePrima, scritture()], [true, 0, 1]);
  atteso('Detox · la pagina si ridisegna: pulsante «Digiuno attivo», frecce del giorno, scritta del digiuno', [testo(bottoneDetox(a)), !!p.querySelector('.day-nav'), /Giorno di recupero — Digiuno/.test(testo(p))], ['⚡ Digiuno attivo', true, true]);
  atteso('Detox · l\'anello nuovo coi totali del giorno (lo stesso del giorno normale), niente anelli vecchi', [!!p.querySelector('.oggi-v3-zona-pill'), !!p.querySelector('.sum-grid'), !!p.querySelector('.mbar')], [true, false, false]);
  atteso('Detox · gli integratori restano a portata di mano', /Integratori di oggi/.test(testo(p)), true);
  atteso('Detox · zero errori in console', errori(a), []);

  // 2 · ricaricamento: il digiuno è già nel database, la pagina Oggi si riapre
  const r = await apri(fixture(true));
  const pr = pagina(r);
  atteso('dopo un ricaricamento · il giorno è in digiuno e la pagina Oggi c\'è, col pulsante per tornare indietro', [r.win.getDay(OGGI).fasting, !!pr.querySelector('.day-nav'), testo(bottoneDetox(r))], [true, true, '⚡ Digiuno attivo']);
  atteso('dopo un ricaricamento · zero errori in console', errori(r), []);

  // 3 · si toglie il digiuno: torna il giorno normale
  bottoneDetox(r).click(); await attendi(30);
  atteso('«Digiuno attivo» toccato di nuovo · il giorno torna normale e la riga si toglie', [r.win.getDay(OGGI).fasting, testo(bottoneDetox(r)), r.supa._calls.filter(c => c.table === 'fasting_days' && c.op === 'delete').length], [false, 'Giorno Detox', 1]);
  atteso('giorno normale di nuovo · il pulsante «+ Registra pasto» c\'è', /Registra pasto/.test(testo(pagina(r))), true);

  // 4 · nel codice: `sTot` non esiste più, e gli anelli vecchi che usava solo il digiuno sono usciti
  const src = fs.readFileSync(require('path').join(__dirname, '..', '..', 'app', 'nutrition.js'), 'utf8').replace(/\/\/.*$/gm, '');
  atteso('nel codice · niente `sTot`, niente targetRing/miniRing/macroBar/zonaBalance', [/\bsTot\b/.test(src), /function (targetRing|miniRing|macroBar|zonaBalance)\(/.test(src)], [false, false]);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
