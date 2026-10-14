// Body 170: «Ultimi log» esce da Body › Misure e va nelle Impostazioni › «Salute ed esami del sangue».
// Stesse righe (timeline unificata, peso da weighInsByDay), tocco su un check = dettaglio, × = elimina con il
// foglio di conferma dell'app. Nessuna lettura in più: aprendo la pagina si usano i dati già in memoria; se non
// ci sono, una sola lettura del corpo. loadBodyLogs non legge tabelle in più. Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_ultimi_log.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;

async function app(){
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], supplements_log:[], daily_log:[], rilevazioni:[], app_errors:[],
    weight_logs:[{ id:'w1', user_id:U, date:'2026-10-13', weight_kg:72.1 }],
    body_logs:[{ id:'bl1', user_id:U, date:'2026-10-13', weight_kg:73, waist_cm:85 }, { id:'bl2', user_id:U, date:'2026-10-10', weight_kg:72.6 }],
    body_measurements:[{ id:'m1', user_id:U, check_id:'c1', created_at:'2026-10-01T08:00:00Z', weight_kg:72.9, waist_cm:86 }],
    body_checks:[{ id:'c1', user_id:U, status:'completed', created_at:'2026-10-01T08:00:00Z' }], body_check_photos:[], blood_tests:[],
    __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } };
  const b = boot(t, { now:`${OGGI}T09:00:00`, file: process.argv[2], locale:{ zt_installa_visto:'1', ['zt_csa_' + U]: JSON.stringify({ giorno:OGGI, mostrati:[11, 15, 19], risposte:[] }) } });
  await b.avviato;
  for(let i = 0; i < 300 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  await attendi(80);
  b.t = t; b.W = b.win; b.d = b.win.document; b.ST = b.win.eval('ST');
  b.letture = () => b.supa._calls.filter(c => c.op === 'select').map(c => c.table);
  b.righe = () => { const box = b.d.getElementById('set-ultimi-log'); return box ? [...box.querySelectorAll('[style*="justify-content:space-between"]')].filter(r => r.querySelector('button[title="Elimina"]')) : []; };
  return b;
}

(async () => {
  const b = await app();
  const { W, d, ST } = b;
  // 1) Body › Misure senza la lista; loadBodyLogs legge le stesse tabelle di prima
  const n0 = b.letture().length;
  await W.loadBodyLogs();
  atteso('loadBodyLogs: corpo e pesate, niente di più', b.letture().slice(n0).sort(), ['body_checks', 'body_logs', 'body_measurements', 'weight_logs']);
  ST.page = 'body'; ST.bodyTab = 'misure'; W.renderBody();
  atteso('Body › Misure senza «Ultimi log»', /Ultimi log/.test(d.getElementById('page-body').textContent), false);

  // 2) Impostazioni › Salute: la lista, senza letture in più
  const n1 = b.letture().length;
  W.openSettingsModal(); W.setVai('salute'); await attendi(30);
  atteso('in «Salute»: «Ultimi log»', /Ultimi log/.test(testo(d.getElementById('set-ultimi-log'))), true);
  atteso('aperta la pagina: nessuna lettura del corpo', b.letture().slice(n1).filter(t => /^body_|^weight_logs$/.test(t)), []);
  const righe = b.righe().map(r => testo(r));
  atteso('le righe, la pesata rapida vince sul body_logs (L48)', righe, ['mar 13 ott 72.1 kg 85 cm ×', 'sab 10 ott 72.6 kg ×', 'gio 1 ott ✓ check 72.9 kg 86 cm → ×']);

  // 3) tocco sul check: il dettaglio
  let aperto = null; const vero = W.openBodyCheckDetail; W.openBodyCheckDetail = (id) => { aperto = id; };
  b.righe()[2].click();
  atteso('tocco sul check: si apre il dettaglio', aperto, 'c1');
  W.openBodyCheckDetail = vero;

  // 4) × su un check: Annulla non cancella, Elimina sì; la lista si aggiorna
  const foglio = () => d.querySelector('.foglio-overlay');
  const n2 = b.supa._calls.length;
  b.righe()[2].querySelector('button[title="Elimina"]').click(); await attendi(10);
  atteso('× sul check: il foglio di conferma, sopra le Impostazioni', [!!foglio(), testo(foglio() && foglio().querySelector('h3'))], [true, 'Elimina check fisico']);
  [...foglio().querySelectorAll('button')].find(x => x.textContent === 'Annulla').click(); await attendi(20);
  atteso('Annulla: niente cancellato, la lista resta', [b.supa._calls.slice(n2).filter(c => c.op === 'delete').length, b.righe().length], [0, 3]);
  b.righe()[1].querySelector('button[title="Elimina"]').click(); await attendi(10);
  foglio().querySelector('.foglio-ok').click(); await attendi(60);
  atteso('Elimina sul log del 10: body_logs per id', b.supa._calls.slice(n2).filter(c => c.op === 'delete').map(c => [c.table, c.filters.map(f => f[1] + '=' + f[2]).join('&')]), [['body_logs', 'id=bl2&user_id=u1']]);
  atteso('la lista nelle Impostazioni si aggiorna', b.righe().map(r => testo(r)).length, 2);
  atteso('le Impostazioni restano aperte su Salute', [d.getElementById('settings-modal').style.display, ST.setPagina], ['flex', 'salute']);

  // 5) dati del corpo non ancora letti: una lettura sola aprendo la pagina
  {
    const c = await app();
    c.ST.bodyLogs = null; c.ST.bodyMeasurements = null;
    const n = c.letture().length;
    c.W.openSettingsModal(); c.W.setVai('salute'); c.W.setIndietro(); c.W.setVai('salute'); await attendi(60);
    atteso('non letti: una lettura, poi la lista', [c.letture().slice(n).filter(t => t === 'body_logs').length, c.righe().length], [1, 3]);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
