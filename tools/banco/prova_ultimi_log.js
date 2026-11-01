// Body 170 (14 ottobre 2026): «Ultimi log» era uscito da Body › Misure per le Impostazioni. Stile 040 (1 novembre
// 2026, scelta di Ignazio): torna in fondo a Body › Misure, e le Impostazioni non lo hanno più. Stesse righe
// (timeline unificata, peso da weighInsByDay), tocco su un check = dettaglio, × = elimina con il foglio di conferma
// dell'app; a veste accesa le righe sono tasti alti 52 px e il tocco apre la stessa correzione (dettaglio del check,
// foglio «Elimina log peso»): confirmDeleteBodyLog → deleteBodyLogConfirmed, nessuna seconda via. Nessuna lettura in più.
//   node tools/banco/prova_ultimi_log.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(70), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;

async function app(opts){
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], supplements_log:[], daily_log:[], rilevazioni:[], app_errors:[],
    weight_logs:[{ id:'w1', user_id:U, date:'2026-10-13', weight_kg:72.1 }],
    body_logs:[{ id:'bl1', user_id:U, date:'2026-10-13', weight_kg:73, waist_cm:85 }, { id:'bl2', user_id:U, date:'2026-10-10', weight_kg:72.6 }],
    body_measurements:[{ id:'m1', user_id:U, check_id:'c1', created_at:'2026-10-01T08:00:00Z', weight_kg:72.9, waist_cm:86 }],
    body_checks:[{ id:'c1', user_id:U, status:'completed', created_at:'2026-10-01T08:00:00Z' }], body_check_photos:[], blood_tests:[],
    __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } };
  const b = boot(t, { now:`${OGGI}T09:00:00`, file: process.argv[2], locale:{ zt_installa_visto:'1', ['zt_csa_' + U]: JSON.stringify({ giorno:OGGI, mostrati:[11, 15, 19], risposte:[] }), ...(opts || {}) } });
  await b.avviato;
  for(let i = 0; i < 300 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  await attendi(80);
  b.t = t; b.W = b.win; b.d = b.win.document; b.ST = b.win.eval('ST');
  b.letture = () => b.supa._calls.filter(c => c.op === 'select').map(c => c.table);
  b.pagina = () => b.d.getElementById('page-body');
  b.righe = () => [...b.pagina().querySelectorAll('[style*="justify-content:space-between"]')].filter(r => r.querySelector('button[title="Elimina"]'));
  b.righeV5 = () => [...b.pagina().querySelectorAll('.b5-log-riga')];
  return b;
}

(async () => {
  // ── veste spenta ──
  let b = await app();
  let { W, d, ST } = b;
  const n0 = b.letture().length;
  await W.loadBodyLogs();
  atteso('loadBodyLogs: corpo e pesate, niente di più', b.letture().slice(n0).sort(), ['body_checks', 'body_logs', 'body_measurements', 'weight_logs']);
  const n1 = b.letture().length;
  ST.page = 'body'; ST.bodyTab = 'misure'; W.renderBody();
  atteso('Body › Misure: «Ultimi log» in fondo al modulo, senza letture in più', [/Ultimi log/.test(testo(b.pagina())), b.pagina().textContent.indexOf('Ultimi log') > b.pagina().textContent.indexOf('Salva misure'), b.letture().slice(n1).filter(t => /^body_|^weight_logs$/.test(t))], [true, true, []]);
  atteso('le righe, la pesata rapida vince sul body_logs (L48)', b.righe().map(r => testo(r)), ['mar 13 ott 72.1 kg 85 cm ×', 'sab 10 ott 72.6 kg ×', 'gio 1 ott ✓ check 72.9 kg 86 cm → ×']);
  W.openSettingsModal(); W.setVai('salute'); await attendi(30);
  atteso('Impostazioni › Salute: niente «Ultimi log», niente riquadro', [/Ultimi log/.test(testo(d.getElementById('settings-modal'))), !!d.getElementById('set-ultimi-log')], [false, false]);
  W.setIndietro(); d.getElementById('settings-modal').style.display = 'none';

  // tocco sul check: il dettaglio
  let aperto = null; const vero = W.openBodyCheckDetail; W.openBodyCheckDetail = (id) => { aperto = id; };
  b.righe()[2].click();
  atteso('tocco sul check: si apre il dettaglio', aperto, 'c1');
  W.openBodyCheckDetail = vero;
  // × su un check: Annulla non cancella, Elimina su un log sì; la lista si aggiorna
  const foglio = () => d.querySelector('.foglio-overlay');
  const n2 = b.supa._calls.length;
  b.righe()[2].querySelector('button[title="Elimina"]').click(); await attendi(10);
  atteso('× sul check: il foglio di conferma', [!!foglio(), testo(foglio() && foglio().querySelector('h3'))], [true, 'Elimina check fisico']);
  [...foglio().querySelectorAll('button')].find(x => x.textContent === 'Annulla').click(); await attendi(20);
  atteso('Annulla: niente cancellato, la lista resta', [b.supa._calls.slice(n2).filter(c => c.op === 'delete').length, b.righe().length], [0, 3]);
  b.righe()[1].querySelector('button[title="Elimina"]').click(); await attendi(10);
  foglio().querySelector('.foglio-ok').click(); await attendi(60);
  atteso('Elimina sul log del 10: body_logs per id', b.supa._calls.slice(n2).filter(c => c.op === 'delete').map(c => [c.table, c.filters.map(f => f[1] + '=' + f[2]).join('&')]), [['body_logs', 'id=bl2&user_id=u1']]);
  atteso('la lista in Misure si aggiorna', [ST.page, ST.bodyTab, b.righe().length], ['body', 'misure', 2]);

  // ── veste accesa: righe toccabili, stessa correzione ──
  b = await app({ zt_v5:'1' }); ({ W, d, ST } = b);
  await W.loadBodyLogs();
  ST.page = 'body'; ST.bodyTab = 'misure'; W.renderBody();
  atteso('veste accesa: «Le ultime registrazioni» in fondo, tre righe-tasto, niente ×', [/Le ultime registrazioni/.test(testo(b.pagina())), b.righeV5().length, b.righe().length, b.righeV5().map(r => testo(r))],
    [true, 3, 0, ['mar 13 ott 72.1 kg · 85 cm›', 'sab 10 ott 72.6 kg›', 'gio 1 ott ✓ check 72.9 kg · 86 cm›']]);
  aperto = null; W.openBodyCheckDetail = (id) => { aperto = id; };
  b.righeV5()[2].click();
  atteso('veste accesa: tocco sul check = dettaglio', aperto, 'c1');
  W.openBodyCheckDetail = vero;
  const n3 = b.supa._calls.length;
  b.righeV5()[1].click(); await attendi(10);
  atteso('veste accesa: tocco su una misura = il foglio «Elimina log peso» di sempre', [!!foglio(), testo(foglio() && foglio().querySelector('h3'))], [true, 'Elimina log peso']);
  foglio().querySelector('.foglio-ok').click(); await attendi(60);
  atteso('veste accesa: la stessa scrittura (body_logs per id) e la lista aggiornata', [b.supa._calls.slice(n3).filter(c => c.op === 'delete').map(c => [c.table, c.filters.map(f => f[1] + '=' + f[2]).join('&')]), b.righeV5().length], [[['body_logs', 'id=bl2&user_id=u1']], 2]);
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
