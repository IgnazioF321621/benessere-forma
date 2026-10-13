// Body 150 — il report Fitdays letto dal coach.
// Nel modulo «Misure col metro e bilancia» il tasto «Leggi il report Fitdays»: consenso prima che il file parta
// (Annulla → niente parte), il file va al Worker /fitdays-report (solo mime e base64: nessun nome, nessun profilo),
// la lettura compila le caselle (peso, grasso %, massa muscolare, grasso viscerale, età corporea) e porta il modulo
// al giorno del report; la card mostra i 22 indicatori; «Salva misure» scrive weight_logs, body_logs e la lettura
// completa in fitdays_letture (una per giorno); «Togli» la scarta; errori del Worker detti con parole; file sbagliato
// rifiutato prima di chiedere; report non riconosciuto non compila niente. Orologio: martedì 13 ottobre 2026, 9:00.
//   node tools/banco/prova_body_fitdays.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-10-13T09:00:00';
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const VALORI = {
  peso_kg: 70.95, bmi: 24, grasso_pct: 14, massa_grassa_kg: 9.9, massa_magra_kg: 61, frequenza_cardiaca_bpm: 92, indice_cuore: 3.6,
  massa_muscolare_kg: 57, muscolo_pct: 80.4, muscolo_scheletrico_pct: 41.7, massa_ossea_kg: 4, proteine_kg: 17.7, proteine_pct: 25,
  acqua_kg: 39.3, acqua_pct: 55.4, grasso_sottocutaneo_pct: 10, grasso_viscerale: 6, bmr_kcal: 1501, eta_corporea: 52, peso_standard_kg: 65.1,
  livello_obesita: 'Standard', tipo_corpo: 'Muscolo',
};
const LETTURA = { riconosciuto: true, data_ora_testo: '05:46 12/10/2026', data_report: '2026-10-12', valori: VALORI, letti: 22, note: '', meta: { model: 'gemini-3.1-flash-lite', prompt_version: '2026-10-13', campi_version: '2026-10-13', mime: 'image/jpeg' } };

function avvia(){
  const tabelle = {
    weight_logs: [ { user_id:U, id:'wl1', date:'2026-10-11', weight_kg:72.4 } ],
    body_logs: [ { user_id:U, id:'bl1', date:'2026-10-11', waist_cm:86 } ],
    body_checks: [], body_measurements: [], meals:[], workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[], fitdays_letture:[], profiles:[ { id:U, weight_kg:72.4 } ],
  };
  const b = boot(tabelle, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, goal_weight_kg:68, weight_kg:72.4, obiettivo:'dimagrimento', created_at:'2026-05-01T08:00:00Z' };
  ST.page = 'body'; ST.bodyTab = 'misure';
  b.supa.auth.getSession = async () => ({ data:{ session:{ user:{ id:U }, access_token:'token-finto' } } });
  const chiamate = [];
  const ctx = { ...b, ST, tabelle, chiamate };
  ctx.risposta = async () => ({ ok:true, status:200, json: async () => ({ ok:true, lettura: LETTURA }) });
  b.win.fetch = async (url, opts) => { chiamate.push({ url, opts }); return ctx.risposta(); };
  // La riduzione dell'immagine usa il canvas, che il banco non ha: il file pronto si finge
  b.win.fitdaysPreparaFile = async (file) => ({ mime: file.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg', base64: 'QUJD'.repeat(40) });
  return ctx;
}
const campo = (b, id) => b.win.document.getElementById(id);
const pagina = (b) => b.win.document.getElementById('page-body');
const toast = (b) => testo(b.win.document.getElementById('toast'));
const file = (b, tipo = 'image/jpeg', nome = 'report.jpg') => new b.win.File(['x'], nome, { type: tipo });
const bottone = (b, ok) => [...b.win.document.querySelectorAll('.foglio button')].find(x => ok ? x.classList.contains('foglio-ok') : !x.classList.contains('foglio-ok'));

(async () => {
  // 1. il tasto c'è, nel modulo Misure
  let b = avvia();
  await b.win.loadBodyLogs();
  atteso('modulo · tasto «Leggi il report Fitdays» con il file nascosto', [/Leggi il report Fitdays con Pirsi/.test(testo(pagina(b))), campo(b, 'bl-fitdays-file').getAttribute('accept')], [true, 'image/*,application/pdf']);

  // 2. consenso: Annulla → niente parte; Acconsento → parte, scelta ricordata
  let p = b.win.leggiReportFitdays({ files: [file(b)] }); await attendi(30);
  const foglio = b.win.document.querySelector('.foglio');
  atteso('prima lettura · si chiede il consenso, nulla è partito', [!!foglio, foglio && /Gemini/.test(foglio.textContent), b.chiamate.length], [true, true, 0]);
  bottone(b, false).click(); await p; await attendi(30);
  atteso('«Annulla» · niente parte, niente ricordato, nessuna lettura', [b.chiamate.length, b.win.localStorage.getItem('zt_report_ok'), b.ST.fitdaysLettura || null], [0, null, null]);
  p = b.win.leggiReportFitdays({ files: [file(b)] }); await attendi(30);
  bottone(b, true).click(); await p; await attendi(30);
  atteso('«Acconsento» · il file va al Worker, scelta ricordata', [b.chiamate.length, b.chiamate[0].url.endsWith('/fitdays-report'), b.win.localStorage.getItem('zt_report_ok')], [1, true, '1']);
  const corpo = JSON.parse(b.chiamate[0].opts.body);
  atteso('richiesta · solo persona, mime e file; token nell\'intestazione', [Object.keys(corpo).sort(), corpo.mime, b.chiamate[0].opts.headers.Authorization], [['data', 'mime', 'user_id'], 'image/jpeg', 'Bearer token-finto']);

  // 3. la lettura: il modulo va al giorno del report e le caselle si compilano; la card mostra i 22
  atteso('lettura · il modulo è al giorno del report, con avanzate aperte', [campo(b, 'bl-date').value, b.ST.bodyLogDate, b.ST.bodyAdvOpen], ['2026-10-12', '2026-10-12', true]);
  atteso('lettura · le cinque caselle compilate, la vita no', [campo(b, 'bl-weight').value, campo(b, 'bl-bf').value, campo(b, 'bl-muscle').value, campo(b, 'bl-visceral').value, campo(b, 'bl-bodyage').value, campo(b, 'bl-waist').value], ['70.95', '14', '57', '6', '52', '']);
  const card = campo(b, 'fitdays-card');
  atteso('lettura · la card: 22 su 22, l\'ora del report, massa magra, tipo di corpo', [/22 indicatori su 22/.test(testo(card)), /05:46 12\/10\/2026/.test(testo(card)), /Massa magra\s*61 kg/.test(testo(card)), /Tipo di corpo\s*Muscolo/.test(testo(card))], [true, true, true, true]);
  atteso('lettura · avviso', toast(b), '✅ Report letto: 22 indicatori · controlla e salva');

  // 4. la persona corregge il peso e salva: weight_logs, body_logs e la lettura completa
  campo(b, 'bl-weight').value = '71.0';
  const prima = b.supa._calls.length;
  await b.win.saveBodyLog();
  const nuove = b.supa._calls.slice(prima);
  const pesata = nuove.find(c => c.table === 'weight_logs' && c.op === 'upsert');
  const misure = nuove.find(c => c.table === 'body_logs' && c.op === 'upsert');
  const lettura = nuove.find(c => c.table === 'fitdays_letture' && c.op === 'upsert');
  atteso('salva · la pesata del 12 col numero corretto dalla persona', pesata && [pesata.payload.date, pesata.payload.weight_kg], ['2026-10-12', 71]);
  atteso('salva · body_logs con le caselle della bilancia, senza peso', misure && [misure.payload.date, misure.payload.bf_pct, misure.payload.muscle_kg, misure.payload.visceral_fat, misure.payload.body_age, 'weight_kg' in misure.payload], ['2026-10-12', 14, 57, 6, 52, false]);
  atteso('salva · la lettura completa in fitdays_letture, una per giorno', lettura && [lettura.payload.date, lettura.upsertOpts.onConflict, lettura.payload.model, lettura.payload.prompt_version, Object.keys(lettura.payload.result.valori).length, lettura.payload.result.valori.bmr_kcal, lettura.payload.result.letti], ['2026-10-12', 'user_id,date', 'gemini-3.1-flash-lite', '2026-10-13', 22, 1501, 22]);
  atteso('salva · la lettura è consumata, la card sparisce', [b.ST.fitdaysLettura || null, !!campo(b, 'fitdays-card')], [null, false]);

  // 5. «Togli» scarta la lettura: le caselle tornano a quel che c'era
  b = avvia(); b.win.localStorage.setItem('zt_report_ok', '1'); await b.win.loadBodyLogs();
  await b.win.leggiReportFitdays({ files: [file(b)] }); await attendi(30);
  atteso('togli · prima: compilato', campo(b, 'bl-bf').value, '14');
  b.win.fitdaysTogli();
  atteso('togli · dopo: caselle vuote, niente in memoria, niente scritto', [campo(b, 'bl-bf').value, b.ST.fitdaysLettura || null, b.supa._calls.some(c => c.table === 'fitdays_letture')], ['', null, false]);
  // senza lettura, Salva non scrive in fitdays_letture
  campo(b, 'bl-weight').value = '72';
  await b.win.saveBodyLog();
  atteso('salva senza lettura · niente in fitdays_letture', b.supa._calls.some(c => c.table === 'fitdays_letture'), false);

  // 6. il report del giorno nel futuro o senza data: resta il giorno del modulo
  b = avvia(); b.win.localStorage.setItem('zt_report_ok', '1'); await b.win.loadBodyLogs();
  b.risposta = async () => ({ ok:true, status:200, json: async () => ({ ok:true, lettura: { ...LETTURA, data_report: '2026-10-20', data_ora_testo: '05:46 20/10/2026' } }) });
  await b.win.leggiReportFitdays({ files: [file(b)] }); await attendi(30);
  atteso('data nel futuro · il modulo resta a oggi, caselle compilate', [campo(b, 'bl-date').value, campo(b, 'bl-weight').value], [OGGI, '70.95']);

  // 7. file sbagliato: rifiutato prima di chiedere; PDF ammesso
  b = avvia(); await b.win.loadBodyLogs();
  await b.win.leggiReportFitdays({ files: [file(b, 'text/plain', 'x.txt')] }); await attendi(30);
  atteso('file di testo · rifiutato, nessuna domanda, niente parte', [toast(b), !!b.win.document.querySelector('.foglio'), b.chiamate.length], ['⚠️ Scegli lo screenshot o il PDF del report Fitdays', false, 0]);
  b.win.localStorage.setItem('zt_report_ok', '1');
  await b.win.leggiReportFitdays({ files: [file(b, 'application/pdf', 'report.pdf')] }); await attendi(30);
  atteso('pdf · parte come PDF', [b.chiamate.length, JSON.parse(b.chiamate[0].opts.body).mime], [1, 'application/pdf']);

  // 8. errori del Worker e report non riconosciuto: detti con parole, niente compilato
  b = avvia(); b.win.localStorage.setItem('zt_report_ok', '1'); await b.win.loadBodyLogs();
  b.risposta = async () => ({ ok:false, status:429, json: async () => ({ error:{ kind:'rate-limit', status:429 } }) });
  await b.win.leggiReportFitdays({ files: [file(b)] }); await attendi(30);
  atteso('worker 429 · avviso, niente compilato', [toast(b), campo(b, 'bl-weight').value, b.ST.fitdaysBusy], ['⚠️ Troppe letture in questo momento: riprova tra un minuto', '', false]);
  b.risposta = async () => { throw Object.assign(new Error('timeout'), { name:'TimeoutError' }); };
  await b.win.leggiReportFitdays({ files: [file(b)] }); await attendi(30);
  atteso('tempo scaduto · avviso', toast(b), '⚠️ Ci ho messo troppo: riprova tra poco');
  b.risposta = async () => ({ ok:true, status:200, json: async () => ({ ok:true, lettura: { ...LETTURA, riconosciuto:false, letti:0, valori:{} } }) });
  await b.win.leggiReportFitdays({ files: [file(b)] }); await attendi(30);
  atteso('non riconosciuto · lo dice, niente compilato', [/Non mi sembra un report Fitdays/.test(toast(b)), campo(b, 'bl-weight').value, b.ST.fitdaysLettura || null], [true, '', null]);

  // 9. la regola pura del modulo condiviso
  const F = b.win.ZTFitdays;
  atteso('ZTFitdays · valida: fuori scala → null, virgola → punto', [F.valida({ peso_kg:'70,95', grasso_pct:99, tipo_corpo:' Muscolo ' }).valori.peso_kg, F.valida({ grasso_pct:99 }).valori.grasso_pct, F.valida({ tipo_corpo:' Muscolo ' }).valori.tipo_corpo], [70.95, null, 'Muscolo']);
  atteso('ZTFitdays · mostra', [F.mostra(F.CAMPI[0], 70.95), F.mostra(F.CAMPI[2], 14), F.mostra(F.CAMPI[21], 'Muscolo'), F.mostra(F.CAMPI[0], null)], ['70,95 kg', '14 %', 'Muscolo', '—']);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
