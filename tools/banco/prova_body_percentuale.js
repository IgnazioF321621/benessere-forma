// Body 030 — la barra «% completato» conta solo il movimento nella direzione giusta.
// Partendo da 72 con obiettivo 68, salire a 74 dava «50% completato»: ora dà 0%. Vale in Misure e in Tendenza.
//   node tools/banco/prova_body_percentuale.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-10-13T09:00:00';
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const percentuali = (html) => (html.match(/(\d+)% completato/g) || []).map(s => Number(s.split('%')[0]));

function avvia(pesi, goal){
  const tabelle = {
    weight_logs: pesi.map(([date, kg], i) => ({ user_id:U, id:'wl' + i, date, weight_kg:kg })),
    body_logs: [], body_checks: [], body_measurements: [], meals:[], workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[],
  };
  const b = boot(tabelle, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, goal_weight_kg:goal, obiettivo:'dimagrimento', created_at:'2026-05-01T08:00:00Z' };
  ST.page = 'body'; ST.bodyTrendRange = 'all';
  return { ...b, ST };
}

(async () => {
  // ── la regola da sola ──
  let b = avvia([], 68);
  const pct = b.win.percentualeVersoObiettivo;
  atteso('regola esiste', typeof pct, 'function');
  atteso('dimagrire 72→68: a 74 è 0%, a 70 è 50%, a 68 è 100%, a 66 resta 100%', [pct(72, 74, 68), pct(72, 70, 68), pct(72, 68, 68), pct(72, 66, 68)], [0, 50, 100, 100]);
  atteso('crescere 70→75: a 72 è 40%, a 69 è 0%', [pct(70, 72, 75), pct(70, 69, 75)], [40, 0]);
  atteso('partenza già all\'obiettivo: 100% se ci sei, 0% se te ne vai', [pct(68, 68, 68), pct(68, 70, 68)], [100, 0]);
  atteso('numeri mancanti: 0%, senza eccezioni', [pct(null, 70, 68), pct(72, undefined, 68), pct(72, 70, 'x')], [0, 0, 0]);

  // ── Misure e Tendenza: partenza 72, oggi 74, obiettivo 68 ──
  b = avvia([['2026-10-01', 72], ['2026-10-13', 74]], 68);
  await b.win.loadBodyLogs();
  b.ST.bodyTab = 'misure'; b.win.renderBody();
  const misure = b.win.document.getElementById('page-body').innerHTML;
  atteso('Misure · allontanandosi: 0% completato (prima diceva 50%)', percentuali(misure), [0]);
  b.ST.bodyTab = 'tendenza'; b.win.renderBody();
  atteso('Tendenza · allontanandosi: 0% completato', percentuali(b.win.document.getElementById('page-body').innerHTML), [0]);

  // ── metà strada ──
  b = avvia([['2026-10-01', 72], ['2026-10-13', 70]], 68);
  await b.win.loadBodyLogs();
  b.ST.bodyTab = 'misure'; b.win.renderBody();
  const m2 = percentuali(b.win.document.getElementById('page-body').innerHTML);
  b.ST.bodyTab = 'tendenza'; b.win.renderBody();
  atteso('a metà strada: 50% in Misure e in Tendenza', [m2, percentuali(b.win.document.getElementById('page-body').innerHTML)], [[50], [50]]);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
