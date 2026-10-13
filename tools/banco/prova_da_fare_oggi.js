// Home 060: «Anche da fare oggi» sotto «Prossima azione». Voci: integratori con l'orario passato e non
// presi (un gruppo per orario) · pesata dovuta fino alle 11 · pasti delle fasce già passate non registrati ·
// check di fine blocco. Niente scorta. La voce già mostrata come «Prossima azione» non si ripete.
// Ogni voce apre il suo passo. Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_da_fare_oggi.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const integratori = [
  { id:'s1', local_id:'s1', name:'Omega 3', slot:'08:00', active:true },
  { id:'s2', local_id:'s2', name:'Vitamina D', slot:'08:00', active:true },
  { id:'s3', local_id:'s3', name:'Magnesio', slot:'21:00', active:true },
  { id:'s4', local_id:'s4', name:'Sospeso', slot:'08:00', active:false },
];

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
  ST.trainHomeData = Object.assign({ notStarted:false, lastDate:null, lastSession:null, nextSession:'upperA', streak:0, doneToday:true, inProgress:false }, o.train || {});
  ST.supps = o.supps || [];
  ST.db = ST.db || {}; ST.db.days = ST.db.days || {};
  ST.db.days[OGGI] = { key:OGGI, meals: o.pasti || [], suppsTaken: o.presi || [] };
  const voci = () => typeof W.getDaFareOggi === 'function' ? W.getDaFareOggi(W.getProssimaAzioneSimple()).map(v => v.etichetta) : null;
  return { b, W, ST, voci };
}

(async () => {
  let s;
  // 1) alle 14, seduta fatta: colazione mancante (fascia passata), integratori delle 8 non presi; il pranzo è la Prossima azione
  s = await stato('14:00', { supps: integratori, presi: ['s2'] });
  atteso('alle 14: integratori delle 8 (1 non preso) e colazione', s.voci(), ['Integratori delle 08:00: 1 da segnare', 'Colazione non registrata']);
  atteso('la Prossima azione (il pranzo) non si ripete nella lista', s.W.getProssimaAzioneSimple().titolo, 'Registra il pranzo');
  // 2) gli integratori delle 21 non contano alle 14, i sospesi mai
  s = await stato('14:00', { supps: integratori, presi: ['s1', 's2'], pasti:[{ id:'m', slot:'colazione' }] });
  atteso('tutto preso e colazione fatta: lista vuota', s.voci(), []);
  // 3) alle 23: cena, pranzo e colazione mancanti, magnesio delle 21
  s = await stato('23:00', { supps: integratori, presi: ['s1', 's2'] });
  atteso('alle 23: magnesio e i tre pasti mancanti', s.voci(), ['Integratori delle 21:00: 1 da segnare', 'Colazione non registrata', 'Pranzo non registrato', 'Cena non registrata']);
  // 4) pesata e check: in lista quando la Prossima azione è un'altra
  s = await stato('08:30', { inizio: add(OGGI, -45), checks: [], pesate: [], train:{ doneToday:true } });
  atteso('alle 8:30 la Prossima azione è il check, la pesata va in lista', [s.W.getProssimaAzioneSimple().titolo, s.voci()], ['È ora del check', ['Pesata']]);
  s = await stato('11:30', { inizio: add(OGGI, -45), checks: [], pesate: [], train:{ inProgress:true, lastSession:'upperA', doneToday:false } });
  atteso('seduta in corso: il check va in lista, la pesata dopo le 11 no', s.voci(), ['Colazione non registrata', 'Check di fine blocco']);
  // 5) a schermo e il tocco
  s = await stato('14:00', { supps: integratori, presi: ['s2'] });
  s.ST.page = 'home'; s.W.renderHomeV2();
  const righe = [...s.W.document.querySelectorAll('#page-home .home-v2-dafare-voce')];
  atteso('a schermo: titolo e due voci toccabili', [s.W.document.querySelector('#page-home .home-v2-dafare-eb') && s.W.document.querySelector('#page-home .home-v2-dafare-eb').textContent, righe.map(r => r.getAttribute('onclick'))],
    ['Anche da fare oggi', ["prossimaAzioneVai('integratori', '08:00')", "prossimaAzioneVai('pasto', 'colazione')"]]);
  let foglio = 0; s.W.openSuppSheet = () => { foglio++; };
  if(righe[0]) righe[0].click(); await attendi(20);
  atteso('integratori: apre Nutrition e il foglio degli integratori', [s.ST.page, foglio], ['oggi', 1]);
  s.ST.page = 'home'; s.W.renderHomeV2();
  const col = s.W.document.querySelectorAll('#page-home .home-v2-dafare-voce')[1];
  if(col) col.click(); await attendi(20);
  atteso('colazione: apre il form del pasto sulla colazione', [s.ST.page, s.ST.logOpen, s.ST.logSlot], ['oggi', true, 'colazione']);
  s = await stato('14:00', { supps: integratori, presi: ['s1', 's2'], pasti:[{ id:'m', slot:'colazione' }] });
  s.ST.page = 'home'; s.W.renderHomeV2();
  atteso('lista vuota: niente riquadro «Anche da fare oggi»', !!s.W.document.querySelector('#page-home .home-v2-dafare'), false);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
