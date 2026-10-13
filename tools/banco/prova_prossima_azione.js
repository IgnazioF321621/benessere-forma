// Home 010: «Prossima azione», la guida della giornata a un tocco. Sette regole in ordine, vince la prima:
// 1 seduta iniziata · 2 check dovuto · 3 pesata dovuta fino alle 11 · 4 seduta di oggi non fatta ·
// 5 pasto della fascia non registrato (colazione 6-10, pranzo 12-15, cena 19-22) · 6 riposo · 7 tutto fatto.
// Il pulsante apre il passo giusto. Orologio fermo a ore diverse. Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_prossima_azione.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(64), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };

// Stato preparato a mano, senza avvio automatico: nessun caricamento lo riscrive sotto la prova.
async function stato(ora, o){
  o = o || {};
  const b = boot({ profiles:[], meals:[], meal_items:[], fasting_days:[], supplements_log:[] }, { now:`${OGGI}T${ora}:00`, file: process.argv[2] });
  await b.avviato; await attendi(20);
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' };
  ST.profile = { id:U, first_name:'Ignazio', m2_skipped:true, train_start_date: o.allenamento === false ? null : (o.inizio || add(OGGI, -10)) };
  ST.bodyChecks = o.checks || [{ id:'c1', status:'completed', created_at: add(OGGI, -5) + 'T08:00:00Z' }];
  ST.bodyMeasurements = [];
  ST.weightLogs = o.pesate !== undefined ? o.pesate : [{ date: OGGI, weight_kg: 74 }];
  ST.trainHomeData = Object.assign({ notStarted:false, lastDate:null, lastSession:null, nextSession:'upperA', streak:0, doneToday:false, inProgress:false }, o.train || {});
  ST.db = ST.db || {}; ST.db.days = ST.db.days || {};
  ST.db.days[OGGI] = { key:OGGI, meals: o.pasti || [] };
  const pa = () => { const a = W.getProssimaAzioneSimple(); return [a.titolo, a.azione || null, a.arg || null]; };
  return { b, W, ST, pa };
}

(async () => {
  let s;
  s = await stato('08:00', { train:{ inProgress:true, lastSession:'upperA' } });
  atteso('1 · seduta iniziata e non chiusa', s.pa(), ['Riprendi Upper A', 'seduta', 'upperA']);
  s = await stato('08:00', { inizio: add(OGGI, -45), checks: [] });
  atteso('2 · check di fine blocco dovuto', s.pa(), ['È ora del check', 'check', null]);
  s = await stato('08:00', { allenamento:false, pesate:[] });
  atteso('3 · mai pesato, alle 8: pesati', s.pa(), ['Pesati', 'pesata', null]);
  s = await stato('11:30', { allenamento:false, pesate:[] });
  atteso('3 · dopo le 11 la pesata non si chiede più', s.pa()[1] === 'pesata', false);
  s = await stato('09:00');
  atteso('4 · seduta di oggi non fatta', s.pa(), ['È ora di Upper A', 'seduta', 'upperA']);
  atteso('4 · niente più «a digiuno»', /digiuno/.test(s.W.getProssimaAzioneSimple().dettaglio), false);
  s = await stato('09:00', { train:{ doneToday:true } });
  atteso('5 · seduta fatta, alle 9 senza colazione: registra la colazione', s.pa(), ['Registra la colazione', 'pasto', 'colazione']);
  s = await stato('13:00', { allenamento:false });
  atteso('5 · alle 13 senza pranzo: registra il pranzo', s.pa(), ['Registra il pranzo', 'pasto', 'pranzo']);
  s = await stato('13:00', { allenamento:false, pasti:[{ id:'m1', slot:'pranzo', kcal:600 }] });
  atteso('7 · pranzo registrato: giornata in ordine', s.pa(), ['Giornata in ordine', null, null]);
  s = await stato('23:00', { allenamento:false });
  atteso('5 · alle 23 non chiede più dei pasti', s.pa(), ['Giornata in ordine', null, null]);
  s = await stato('16:00', { train:{ nextSession:'rest' } });
  atteso('6 · giorno di riposo, fuori dalle fasce', s.pa(), ['Oggi riposo', null, null]);
  s = await stato('13:00', { train:{ nextSession:'rest' } });
  atteso('6 · riposo ma pranzo mancante: prima il pranzo', s.pa(), ['Registra il pranzo', 'pasto', 'pranzo']);

  // il pulsante apre il passo giusto
  s = await stato('13:00', { allenamento:false });
  s.ST.page = 'home'; s.W.renderHomeV2();
  const btn = s.W.document.querySelector('#page-home .home-v2-action-btn');
  atteso('pulsante nel riquadro: «Registra →»', btn ? [btn.textContent.trim(), btn.getAttribute('onclick')] : null, ['Registra →', "prossimaAzioneVai('pasto', 'pranzo')"]);
  if(btn) btn.click(); await attendi(20);
  atteso('il tocco apre Nutrition col form del pranzo', [s.ST.page, s.ST.logOpen, s.ST.logSlot], ['oggi', true, 'pranzo']);
  s = await stato('09:00');
  let aperta = null; s.W.openTrainingSession = (sid) => { aperta = sid; };
  s.W.prossimaAzioneVai('seduta', 'upperA'); await attendi(20);
  atteso('seduta: apre Training e la seduta', [s.ST.page, aperta], ['training', 'upperA']);
  s = await stato('08:00', { allenamento:false, pesate:[] });
  let pesata = 0; s.W.openWeighInSheet = () => { pesata++; };
  s.W.prossimaAzioneVai('pesata'); await attendi(20);
  atteso('pesata: apre il foglio della pesata', pesata, 1);
  s = await stato('08:00', { inizio: add(OGGI, -45), checks: [] });
  let check = 0; s.W.m2EntryIntro = () => { check++; };
  s.W.prossimaAzioneVai('check'); await attendi(20);
  atteso('check: tab Body sul Check e apre il check', [s.ST.page, s.ST.bodyTab, check], ['body', 'check', 1]);
  s = await stato('16:00', { train:{ nextSession:'rest' } });
  s.ST.page = 'home'; s.W.renderHomeV2();
  atteso('riposo: nessun pulsante', !!s.W.document.querySelector('#page-home .home-v2-action-btn'), false);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
