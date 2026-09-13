// Fase 3 — Lavoro A (cantiere 35): Tendenza e «Ultimi log» leggono anche le pesate rapide.
// Orologio fermo a domenica 13 settembre 2026. Ignazio-tipo: 13 pesate rapide, 1 body_logs,
// 2 check (uno nello stesso giorno di una pesata rapida). Prima/dopo: sul file vecchio deve dare KO.
//   node tools/banco/prova_body_tendenza.js
//   BANCO_FILE=/tmp/prima.html node tools/banco/prova_body_tendenza.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-09-13T09:00:00';
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(58), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const wl = (date, kg) => ({ user_id:U, id:'wl-' + date, date, weight_kg:kg });
const pesate = [
  ['2026-08-20', 72.9], ['2026-08-23', 72.7], ['2026-08-26', 72.8], ['2026-08-29', 72.5], ['2026-09-01', 72.6],
  ['2026-09-02', 72.6], ['2026-09-04', 72.2], ['2026-09-06', 72.3], ['2026-09-08', 72.4], ['2026-09-09', 72.4],
  ['2026-09-11', 72.0], ['2026-09-12', 72.2], ['2026-09-13', 72.1],
];
const tabelle = {
  weight_logs: pesate.map(([d, k]) => wl(d, k)),
  body_logs: [ { user_id:U, id:'bl1', date:'2026-09-04', weight_kg:71.75, waist_cm:86 } ],   // stesso giorno di una pesata rapida
  body_checks: [ { user_id:U, id:'c1', status:'completed', created_at:'2026-08-02T05:38:24Z' },
                 { user_id:U, id:'c2', status:'completed', created_at:'2026-09-08T05:38:24Z' } ],
  body_measurements: [ { user_id:U, id:'bm1', check_id:'c1', created_at:'2026-08-02T05:53:34Z', weight_kg:69.95, waist_cm:87 },
                       { user_id:U, id:'bm2', check_id:'c2', created_at:'2026-09-08T05:53:34Z', weight_kg:72.35, waist_cm:86 } ],
  meals:[], workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[],
};
(async () => {
  const { win, supa } = boot(tabelle, { now: NOW });
  const ST = win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, target_kcal:2200, goal_weight_kg:68, created_at:'2026-05-01T08:00:00Z' };
  ST.TARGET = { kcal:2200 };
  ST.page = 'body'; ST.bodyTab = 'tendenza'; ST.bodyTrendRange = 'all';
  await win.loadBodyLogs();

  // Grafico Peso (Tendenza, «Tutto»): un punto per giorno, 13 pesate + il check del 2 agosto = 14
  const tl = win.getUnifiedBodyTimeline();
  const puntiPeso = tl.filter(r => r.weight_kg != null);
  atteso('grafico peso · punti', puntiPeso.length, 14);
  atteso('grafico peso · giorni tutti diversi', new Set(puntiPeso.map(r => r.date)).size, 14);
  atteso('4 set · peso della pesata rapida, non del body_logs', puntiPeso.find(r => r.date === '2026-09-04').weight_kg, 72.2);
  atteso('4 set · il body_logs tiene la vita', tl.find(r => r.date === '2026-09-04').waist_cm, 86);
  atteso('8 set · check nello stesso giorno: peso del check a parte', (({weight_kg, check_weight_kg}) => [weight_kg, check_weight_kg])(tl.find(r => r.source === 'check' && r.date === '2026-09-08')), [null, 72.35]);
  const html = win.document.getElementById('page-body').innerHTML;
  const cardPeso = [...win.document.querySelectorAll('#page-body .trend-metric-card')].find(c => /^Peso$/.test(c.querySelector('.trend-metric-name').textContent));
  atteso('card Peso · valore', cardPeso && cardPeso.querySelector('.trend-metric-val').textContent, '72.1');
  atteso('card Peso · sparkline con 14 punti', cardPeso ? (cardPeso.querySelector('polyline').getAttribute('points').trim().split(/\s+/).length) : null, 14);

  // Media della settimana in corso sui punti del grafico = weight_avg del quadro (card Home)
  const ws = win.wpMonday();
  const settimana = puntiPeso.filter(r => r.date >= ws && r.date <= win.wpAddDays(ws, 6)).map(r => r.weight_kg);
  const mediaGrafico = Math.round(settimana.reduce((a, b) => a + b, 0) / settimana.length * 10) / 10;
  const pic = await win.buildWeeklyPicture(ws);
  atteso('media settimana grafico = quadro', [mediaGrafico, settimana.length], [pic.weight.weight_avg, pic.weight.weight_n]);

  // «Ultimi log» (tab Misure): le pesate rapide con la data
  ST.bodyTab = 'misure'; win.renderBody();
  const box = [...win.document.querySelectorAll('#page-body div')].find(d => d.firstElementChild && d.firstElementChild.textContent === 'Ultimi log');
  const righe = box ? [...box.children].slice(1).map(r => testo(r.innerHTML)) : [];
  atteso('Ultimi log · prime 3 righe', righe.slice(0, 3), ['dom 13 set 72.1 kg ×', 'sab 12 set 72.2 kg ×', 'ven 11 set 72 kg ×']);
  atteso('Ultimi log · check dell\'8 set col suo peso', righe.find(r => /8 set/.test(r) && /check/.test(r)), 'mar 8 set ✓ check 72.35 kg 86 cm → ×');

  // Cancellazione di una pesata rapida: weight_logs per data, niente body_logs
  const prima = supa._calls.length;
  const riga = tl.find(r => r.date === '2026-09-12');
  if(!riga){ atteso('pesata rapida del 12 set nella timeline', false, true); console.log(`\n${ko} KO`); process.exit(1); }
  win.confirmDeleteBodyLog('log', riga.id || '', '', riga.date);
  await win.deleteBodyLogConfirmed();
  const cancellazioni = supa._calls.slice(prima).filter(c => c.op === 'delete').map(c => [c.table, c.filters.map(f => f[1] + '=' + f[2]).join('&')]);
  atteso('× su una pesata rapida', cancellazioni, [['weight_logs', 'user_id=u1&date=2026-09-12']]);
  // Cancellazione del 4 settembre: body_logs e pesata rapida insieme
  const prima2 = supa._calls.length;
  const riga4 = tl.find(r => r.date === '2026-09-04' && r.source === 'log');
  win.confirmDeleteBodyLog('log', riga4.id || '', '', riga4.date);
  await win.deleteBodyLogConfirmed();
  const canc2 = supa._calls.slice(prima2).filter(c => c.op === 'delete').map(c => c.table);
  atteso('× sul 4 set · body_logs e weight_logs', canc2, ['body_logs', 'weight_logs']);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
