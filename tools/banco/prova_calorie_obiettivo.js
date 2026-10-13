// Nutrition 030 + 040 + Body 020 (Ondata 4 · 13 ottobre 2026) — calorie e macro: una fonte sola, legata all'obiettivo; il peso
// non riscrive più le calorie in silenzio; una porta sola per pesarsi.
// Prima: il fabbisogno toglieva 300 kcal a tutti; obiettivo, dieta e intolleranze salvati sul telefono vincevano sul database;
// la pillola del peso in alto e il campo «Peso attuale» delle Impostazioni rifacevano i target da zero (cancellando una
// correzione di Pirsi). Qui: deficit o surplus per obiettivo (scelta di Ignazio); il database comanda; la pillola apre «Pesati
// ora», che salva la pesata e il peso del profilo senza toccare le calorie; le Impostazioni non riscrivono i target; le calorie
// si rifanno solo con «Ricalcola le calorie», coi numeri in chiaro e dopo un sì.
//   node tools/banco/prova_calorie_obiettivo.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(80), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-13';
(async () => {
  // Ignazio-tipo: 55 anni, 172 cm, 71,3 kg, molto attivo, ricomposizione, 2324 kcal nel profilo (corrette da Pirsi)
  const profilo = { id:U, first_name:'Ignazio', m2_skipped:true, sex:'M', age:55, height_cm:172, weight_kg:71.3, activity_level:'active',
    obiettivo:'ricomposizione', dieta:'pescetariano', intolleranze:['lattosio'], target_kcal:2324, target_protein:198, target_carbs:221, target_fat:72, goal_weight_kg:68 };
  const t = { profiles:[{ ...profilo }], meals:[], meal_items:[], fasting_days:[], supplements_log:[], supplements:[], weight_logs:[{ user_id:U, id:'w1', date:'2026-10-12', weight_kg:71.5 }], body_logs:[], body_checks:[], body_measurements:[] };
  const b = boot(t, { now:OGGI + 'T09:00:00' });
  await b.avviato;
  const { win, supa } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' };
  const errori = () => b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]);
  const scrittureProfilo = (da) => supa._calls.slice(da).filter(c => c.table === 'profiles' && c.op === 'update').map(c => c.payload);

  // 1 · Nutrition 030, punto 1: il punto di partenza dipende dall'obiettivo
  const tdee = win.calcTDEE('M', 55, 172, 71.3, 'active').tdee;
  const delta = (ob) => { const r = win.calcTDEE('M', 55, 172, 71.3, 'active', ob); return r.target - r.tdee; };
  atteso('fabbisogno (Mifflin-St Jeor, molto attivo) · 71,3 kg', tdee, Math.round((10*71.3 + 6.25*172 - 5*55 + 5) * 1.725));
  atteso('deficit o surplus per obiettivo', ['dimagrimento','ricomposizione','ipertrofia','forza_performance','longevita','mantenimento', null, 'perdita_peso', 'ricomposizione,ipertrofia'].map(delta), [-300, -200, 200, 100, 0, 0, -300, -300, -200]);
  const rIper = win.calcTDEE('M', 55, 172, 71.3, 'active', 'ipertrofia');
  atteso('macro dalle percentuali dell\'obiettivo (ipertrofia 40/35/25), non 40/30/30 fisso', [rIper.protein, rIper.carbs, rIper.fat], [Math.round(rIper.target*0.35/4), Math.round(rIper.target*0.40/4), Math.round(rIper.target*0.25/9)]);

  // 2 · Nutrition 030, punto 3: il database comanda, il telefono riempie solo i buchi
  win.localStorage.setItem('zt_prefs_' + U, JSON.stringify({ obiettivo:'dimagrimento', dieta:'onnivoro', intolleranze:['glutine'], unit:'kg' }));
  ST.profile = { ...profilo };
  win.applyProfile(ST.profile);
  atteso('preferenze sul telefono diverse dal profilo · vince il database, l\'unità resta del telefono', [ST.profile.obiettivo, ST.profile.dieta, ST.profile.intolleranze, ST.profile.unit], ['ricomposizione', 'pescetariano', ['lattosio'], 'kg']);
  atteso('target dal profilo (2324 kcal, 38/34/28), non dal telefono', [ST.TARGET.kcal, ST.TARGET.pCarbo, ST.TARGET.pProt, ST.TARGET.pFat], [2324, 38, 34, 28]);
  ST.profile = { ...profilo, obiettivo:null, dieta:null, intolleranze:null };
  win.applyProfile(ST.profile);
  atteso('profilo senza obiettivo e dieta · il telefono riempie i buchi', [ST.profile.obiettivo, ST.profile.dieta, ST.profile.intolleranze, ST.TARGET.pProt], ['dimagrimento', 'onnivoro', ['glutine'], 32]);
  ST.profile = { ...profilo }; win.applyProfile(ST.profile);

  // 3 · Body 020 / Nutrition 040: la pillola apre «Pesati ora»; la vecchia finestra non c'è più
  await win.loadBodyLogs();
  atteso('la vecchia finestra «Aggiorna peso» e le sue funzioni non ci sono più', [!!d.getElementById('weight-modal'), typeof win.saveWeight, typeof win.openWeightModal], [false, 'undefined', 'undefined']);
  const pillola = d.querySelector('.h-weight-btn');
  atteso('la pillola in alto apre «Pesati ora»', /openWeighInSheet/.test(pillola.getAttribute('onclick')), true);
  pillola.click(); await attendi(20);
  atteso('il foglio «Pesati ora» si apre col peso dell\'ultima pesata', [!!d.getElementById('pianov4-weighin-sheet'), ST.weighInSheet && ST.weighInSheet.value], [true, 71.5]);
  win.weighInAdjust(-0.4);
  const n0 = supa._calls.length;
  await win.confirmWeighIn(); await attendi(20);
  const pesata = supa._calls.slice(n0).find(c => c.table === 'weight_logs' && c.op === 'upsert');
  const prof = scrittureProfilo(n0);
  atteso('conferma · la pesata va in weight_logs e il peso nel profilo; le calorie non si toccano', [pesata && pesata.payload.weight_kg, prof.length, prof[0] && prof[0].weight_kg, prof.some(p => 'target_kcal' in p), ST.TARGET.kcal, ST.profile.weight_kg], [71.1, 1, 71.1, false, 2324, 71.1]);

  // 4 · Nutrition 040: le Impostazioni non riscrivono le calorie, nemmeno cambiando attività; il peso si legge e basta
  win.openSettingsModal(); await attendi(5);
  const pesoInp = d.getElementById('set-weight');
  atteso('Impostazioni · il peso è quello dell\'ultima pesata, spento, con la riga che dice dove si cambia', [pesoInp.value, pesoInp.disabled, d.getElementById('set-weight-nota') && d.getElementById('set-weight-nota').textContent], ['71.1', true, 'Si cambia da «Pesati ora»']);
  const bRic = d.getElementById('set-ricalcola');
  atteso('Impostazioni · il pulsante «Ricalcola le calorie» dice quante se ne usano oggi', bRic && bRic.textContent, 'Ricalcola le calorie dal fabbisogno · oggi 2.324 kcal');
  d.getElementById('set-activity').value = 'moderate';
  const n1 = supa._calls.length;
  await win._saveSettingsExecute(false); await attendi(20);
  const salv = scrittureProfilo(n1)[0] || {};
  atteso('Salva impostazioni con attività cambiata · target com\'erano, niente peso nel salvataggio', [salv.target_kcal, salv.activity_level, 'weight_kg' in salv, ST.TARGET.kcal], [2324, 'moderate', false, 2324]);

  // 5 · «Ricalcola le calorie»: numeri in chiaro, niente si scrive senza un sì
  win.openSettingsModal(); await attendi(5);
  const foglio = () => d.querySelector('.foglio-overlay');
  const bottone = (re) => [...d.querySelectorAll('.foglio-overlay button')].find(x => re.test(x.textContent));
  const rAtteso = win.calcTDEE('M', 55, 172, 71.1, 'moderate', 'ricomposizione');
  const n2 = supa._calls.length;
  win.ricalcolaCalorie(); await attendi(20);
  const testo = foglio() ? foglio().textContent : '';
  atteso('la domanda mostra fabbisogno, obiettivo con il suo −200 e le calorie di oggi', [/Ricalcolare le calorie\?/.test(testo), testo.includes(win.fmtNum(rAtteso.tdee) + ' kcal'), /Ricomposizione: −200 kcal → /.test(testo), testo.includes('→ ' + win.fmtNum(rAtteso.target) + ' kcal'), /Oggi usi 2\.324 kcal/.test(testo)], [true, true, true, true, true]);
  bottone(/Lascia com/).click(); await attendi(10);
  atteso('«Lascia com\'è» · niente scritto, target com\'era', [scrittureProfilo(n2).length, ST.TARGET.kcal, ST.profile.target_kcal], [0, 2324, 2324]);
  win.ricalcolaCalorie(); await attendi(20);
  bottone(/^Usa /).click(); await attendi(30);
  const scr = scrittureProfilo(n2);
  atteso('«Usa N kcal» · una scrittura con le calorie nuove e i macro dell\'obiettivo; il tab le usa', [scr.length >= 1, scr[0] && scr[0].target_kcal, scr[0] && scr[0].target_protein, ST.TARGET.kcal, ST.profile.target_kcal, d.getElementById('set-ricalcola').textContent], [true, rAtteso.target, rAtteso.protein, rAtteso.target, rAtteso.target, 'Ricalcola le calorie dal fabbisogno · oggi ' + win.fmtNum(rAtteso.target) + ' kcal']);

  // 6 · nel codice: nessun altro posto riscrive target_kcal in silenzio dal peso
  const corpo = fs.readFileSync(require('path').join(__dirname, '..', '..', 'app', 'body.js'), 'utf8') + fs.readFileSync(require('path').join(__dirname, '..', '..', 'app', 'impostazioni.js'), 'utf8');
  atteso('nel codice · calcTDEE si chiama solo in ricalcolaCalorie (Impostazioni) e nell\'onboarding', (corpo.match(/calcTDEE\(/g) || []).length, 1);
  atteso('zero errori in console', errori(), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
