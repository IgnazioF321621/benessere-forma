// Body 180 — «4 giorni dall'ultima pesata» con il report Fitdays letto e mai salvato (segnalazione 0d3ff717).
//   1. I giorni dall'ultima pesata si contano da weighInsByDay (weight_logs > body_logs > check), non dalla
//      sola weight_logs: una pesata entrata con le misure o col check vale.
//   2. La lettura del report resta sul telefono (zt_fitdays_lettura_<utente>) finché «Salva misure» non riesce:
//      dopo un ricaricamento la card e le caselle tornano, col giorno del report; Nutrition dice «letto ma non
//      ancora salvato» con «Salva misure», la Home lo mette come Prossima azione; «Salva misure» e «Togli» la tolgono.
//   Orologio: martedì 27 ottobre 2026, 22:00, pesate ogni 3 giorni, ultima pesata il 23.
//   node tools/banco/prova_body_180.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-10-27T22:00:00';
const U = 'u1', OGGI = '2026-10-27';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(70), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const VALORI = { peso_kg: 70.6, bmi: 23.9, grasso_pct: 13.8, massa_grassa_kg: 9.7, massa_magra_kg: 60.9, frequenza_cardiaca_bpm: 90, indice_cuore: 3.6,
  massa_muscolare_kg: 56.9, muscolo_pct: 80.6, muscolo_scheletrico_pct: 41.8, massa_ossea_kg: 4, proteine_kg: 17.7, proteine_pct: 25.1,
  acqua_kg: 39.2, acqua_pct: 55.5, grasso_sottocutaneo_pct: 9.9, grasso_viscerale: 6, bmr_kcal: 1498, eta_corporea: 51, peso_standard_kg: 65.1,
  livello_obesita: 'Standard', tipo_corpo: 'Muscolo' };
const LETTURA = { riconosciuto: true, data_ora_testo: '06:12 27/10/2026', data_report: OGGI, valori: VALORI, letti: 22, note: '', meta: { model: 'gemini-3.1-flash-lite', prompt_version: '2026-10-13', campi_version: '2026-10-13', mime: 'image/jpeg' } };
const CHIAVE = 'zt_fitdays_lettura_' + U;

function avvia(opt = {}){
  const tabelle = {
    weight_logs: opt.weight_logs || [ { user_id:U, id:'wl1', date:'2026-10-23', weight_kg:71.2 } ],
    body_logs: opt.body_logs || [ { user_id:U, id:'bl1', date:'2026-10-23', waist_cm:87.5, bf_pct:14 } ],
    body_measurements: opt.body_measurements || [],
    body_checks: [], meals:[], workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[], fitdays_letture:[], supplements:[], supplements_log:[], coach_proposals:[],
    profiles:[ { id:U, weight_kg:71.2, weight_tracking_mode:'every3' } ],
  };
  const b = boot(tabelle, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, goal_weight_kg:68, weight_kg:71.2, weight_tracking_mode:'every3', obiettivo:'dimagrimento', created_at:'2026-05-01T08:00:00Z' };
  b.win.applyProfile(ST.profile);
  ST.page = opt.page || 'body'; ST.bodyTab = 'misure';
  if(opt.ls) Object.keys(opt.ls).forEach(k => b.win.localStorage.setItem(k, opt.ls[k]));
  b.supa.auth.getSession = async () => ({ data:{ session:{ user:{ id:U }, access_token:'token-finto' } } });
  const chiamate = [];
  const ctx = { ...b, ST, tabelle, chiamate };
  ctx.risposta = async () => ({ ok:true, status:200, json: async () => ({ ok:true, lettura: LETTURA }) });
  b.win.fetch = async (url, opts) => { chiamate.push({ url, opts }); return ctx.risposta(); };
  b.win.fitdaysPreparaFile = async (file) => ({ mime: 'image/jpeg', base64: 'QUJD'.repeat(40) });
  return ctx;
}
const campo = (b, id) => b.win.document.getElementById(id);
const banner = (b) => b.win.document.querySelector('.weight-reminder-banner');
const file = (b) => new b.win.File(['x'], 'report.jpg', { type: 'image/jpeg' });
const azione = (b) => { const a = b.win.getProssimaAzioneSimple(); return [a.titolo, a.azione || null, a.pulsante || null]; };
const voci = (b) => b.win.getDaFareOggi(b.win.getProssimaAzioneSimple()).map(v => v.etichetta);

(async () => {
  // 1. com'era: ultima pesata il 23 → 4 giorni, striscia in Nutrition
  let b = avvia({ page:'oggi' });
  await b.win.loadBodyLogs(); b.win.renderOggi();
  atteso('ultima pesata il 23 · 4 giorni, striscia «Pesati ora»', [b.win._weightReminderDaysSinceLast(), /Sono passati 4 giorni dall'ultima pesata/.test(testo(banner(b))), testo(banner(b) && banner(b).querySelector('.weight-reminder-cta'))], [4, true, 'Pesati ora']);

  // 2. la pesata conta anche se sta in body_logs o nel check (weighInsByDay)
  b = avvia({ page:'oggi', body_logs:[ { user_id:U, id:'bl2', date:'2026-10-26', weight_kg:70.8 } ] });
  await b.win.loadBodyLogs(); b.win.renderOggi();
  atteso('peso in body_logs del 26 · 1 giorno, niente striscia (soglia 3)', [b.win._weightReminderDaysSinceLast(), !!banner(b)], [1, false]);
  b = avvia({ page:'oggi', body_measurements:[ { user_id:U, id:'m1', created_at:'2026-10-27T06:30:00+01:00', weight_kg:70.9 } ] });
  await b.win.loadBodyLogs(); b.win.renderOggi();
  atteso('peso nel check di stamattina · 0 giorni, niente striscia', [b.win._weightReminderDaysSinceLast(), !!banner(b)], [0, false]);

  // 3. il report letto resta sul telefono finché non è salvato
  b = avvia({ ls:{ zt_report_ok:'1' } });
  await b.win.loadBodyLogs();
  await b.win.leggiReportFitdays({ files:[file(b)] }); await attendi(30);
  const salvata = JSON.parse(b.win.localStorage.getItem(CHIAVE) || 'null');
  atteso('lettura · caselle compilate e lettura ricordata sul telefono', [campo(b, 'bl-weight').value, salvata && salvata.date, salvata && salvata.letti], ['70.6', OGGI, 22]);

  // 4. la pagina si ricarica prima di «Salva misure» (il caso del 27 ottobre): niente è perso
  const ls = { zt_report_ok:'1', [CHIAVE]: b.win.localStorage.getItem(CHIAVE) };
  b = avvia({ page:'oggi', ls });
  await b.win.loadBodyLogs(); b.win.renderOggi();
  atteso('ricaricata · Nutrition: «letto ma non ancora salvato», tasto «Salva misure»', [/report Fitdays del mar 27 ott .*letto ma non ancora salvato/i.test(testo(banner(b))), testo(banner(b).querySelector('.weight-reminder-cta'))], [true, 'Salva misure']);
  atteso('ricaricata · Home: Prossima azione «Salva il report Fitdays», la pesata non si ripete', [azione(b), voci(b).includes('Pesata'), voci(b).includes('Report Fitdays da salvare')], [['Salva il report Fitdays', 'misure', 'Salva misure'], false, false]);
  b.win.prossimaAzioneVai('misure'); await attendi(40);   // showPage('body') rilegge i dati del corpo
  atteso('ricaricata · il tasto porta a Body › Misure', [b.ST.page, b.ST.bodyTab], ['body', 'misure']);
  b.win.renderBody();
  atteso('ricaricata · il modulo è al giorno del report, caselle e card di nuovo lì', [campo(b, 'bl-date').value, campo(b, 'bl-weight').value, campo(b, 'bl-bf').value, !!campo(b, 'fitdays-card')], [OGGI, '70.6', '13.8', true]);
  const prima = b.supa._calls.length;
  await b.win.saveBodyLog(); await attendi(30);
  const nuove = b.supa._calls.slice(prima);
  atteso('salva · weight_logs, body_logs e fitdays_letture del 27; lettura tolta dal telefono', [
    nuove.some(c => c.table === 'weight_logs' && c.op === 'upsert' && c.payload.date === OGGI && c.payload.weight_kg === 70.6),
    nuove.some(c => c.table === 'body_logs' && c.op === 'upsert' && c.payload.date === OGGI),
    nuove.some(c => c.table === 'fitdays_letture' && c.op === 'upsert' && c.payload.date === OGGI),
    b.win.localStorage.getItem(CHIAVE), b.ST.fitdaysLettura || null], [true, true, true, null, null]);
  b.ST.page = 'oggi'; b.win.renderOggi();
  atteso('salvata · 0 giorni, niente striscia, la Prossima azione non è più il report', [b.win._weightReminderDaysSinceLast(), !!banner(b), azione(b)[1] === 'misure'], [0, false, false]);

  // 5. «Togli» la scarta anche dal telefono; con la pesata di quel giorno già salvata non si insiste
  b = avvia({ ls });
  await b.win.loadBodyLogs(); b.win.renderBody();
  atteso('togli · prima: ricordata', !!b.win.localStorage.getItem(CHIAVE), true);
  b.win.fitdaysTogli();
  atteso('togli · dopo: niente sul telefono, niente in memoria, caselle vuote', [b.win.localStorage.getItem(CHIAVE), b.ST.fitdaysLettura || null, campo(b, 'bl-bf').value], [null, null, '']);
  b = avvia({ page:'oggi', ls, weight_logs:[ { user_id:U, id:'wl2', date:OGGI, weight_kg:70.6 } ] });
  await b.win.loadBodyLogs(); b.win.renderOggi();
  atteso('pesata del 27 già salvata · nessuna striscia, nessuna azione sul report', [!!banner(b), azione(b)[1] === 'misure'], [false, false]);

  // 6. in silenzio («Più tardi») o con le pesate in pausa il promemoria tace anche per il report
  b = avvia({ page:'oggi', ls:{ ...ls, zt_weight_reminder_dismiss_count:'1', zt_weight_reminder_dismissed_at: String(Date.now()) } });
  await b.win.loadBodyLogs(); b.win.renderOggi();
  atteso('«Più tardi» di poco fa · niente striscia', !!banner(b), false);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
