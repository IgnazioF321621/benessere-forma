// Metodo 220: le Impostazioni a livelli. Un elenco di voci («Tutti i giorni»: Il tuo obiettivo, Cibo,
// Allenamento, Pausa, Come stai adesso? · «Altro»: Salute ed esami del sangue, Profilo e account, I tuoi dati
// e privacy, Crediti), ognuna con la riga di come è impostata; ogni voce apre la sua pagina col suo «Salva»,
// che salva e torna all'elenco; indietro senza salvare rimette i campi come nel profilo. Lo storico degli
// esami del sangue esce dal tab Body e sta in «Salute», letto solo lì. Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_impostazioni_livelli.js [file di prima]
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
const PROFILO = { id:U, first_name:'Ignazio', last_name:'Fiorito', m2_skipped:true, obiettivo:'dimagrimento', goal_weight_kg:68, activity_level:'moderate',
  dieta:'onnivoro', intolleranze:['lattosio'], giorni_allenamento:4, unit:'kg', target_kcal:1950, target_protein:150, target_carbs:180, target_fat:60 };
const ESAMI = [{ id:'b1', user_id:U, test_date:'2026-09-01', ferritin:80, vitamin_d:31 }];

(async () => {
  const t = { profiles:[PROFILO], meals:[], meal_items:[], fasting_days:[], supplements_log:[], daily_log:[], rilevazioni:[], app_errors:[],
    weight_logs:[{ id:'w', user_id:U, date:OGGI, weight_kg:72.1 }], body_logs:[], body_measurements:[], body_checks:[], blood_tests:ESAMI,
    __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } };
  const b = boot(t, { now:`${OGGI}T09:00:00`, file: process.argv[2], locale:{ zt_installa_visto:'1', ['zt_csa_' + U]: JSON.stringify({ giorno:OGGI, mostrati:[11, 15, 19], risposte:[] }) } });
  await b.avviato;
  for(let i = 0; i < 300 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  await attendi(100);
  const W = b.win, d = W.document, ST = W.eval('ST');
  const sangue = () => b.supa._calls.filter(c => c.table === 'blood_tests' && c.op === 'select').length;
  const visibili = () => [...d.querySelectorAll('#settings-modal .set-pagina')].filter(p => !p.hidden).map(p => p.dataset.pagina);

  // 1) il tab Body non legge e non mostra più lo storico degli esami
  const s0 = sangue();
  await W.loadBodyLogs();
  atteso('Home e Body non leggono più gli esami del sangue', sangue() - s0, 0);
  ST.page = 'body'; ST.bodyTab = 'check'; W.renderBody();
  atteso('tab Check senza la card degli esami', /Esami del sangue/.test(d.getElementById('page-body').textContent), false);

  // 2) l'elenco
  W.openSettingsModal();
  atteso('si apre sull\'elenco', [visibili(), testo(d.getElementById('set-titolo')), d.getElementById('set-indietro').hidden, d.getElementById('set-piede').hidden], [['elenco'], 'Impostazioni', true, true]);
  atteso('due gruppi', [...d.querySelectorAll('#settings-modal .set-gruppo')].map(testo), ['Tutti i giorni', 'Altro']);
  atteso('le voci, in ordine', [...d.querySelectorAll('#settings-modal .set-voce-titolo')].map(testo),
    ['Il tuo obiettivo', 'Cibo', 'Allenamento', 'Pausa', 'Come stai adesso?', 'Salute ed esami del sangue', 'Profilo e account', 'I tuoi dati e privacy', 'Crediti']);
  const sotto = (v) => testo(d.querySelector(`#settings-modal .set-voce[data-voce="${v}"] .set-voce-sotto`));
  const lblOb = W.eval('OBJ_ADAPT').dimagrimento.label;
  atteso('ogni voce dice com\'è impostata', [sotto('obiettivo'), sotto('cibo'), sotto('allenamento'), sotto('pausa'), sotto('come-stai'), sotto('profilo')],
    [`${lblOb} · 68 kg`, `${W.fmtNum(ST.TARGET.kcal)} kcal · onnivoro · 1 intolleranza`, '4 giorni a settimana · kg · Tabata spento', 'Nessuna pausa in programma', '11:00 · 15:00 · 19:00', 'Ignazio Fiorito']);

  // 3) una pagina: titolo, indietro, Salva; il resto nascosto
  W.setVai('obiettivo');
  atteso('«Il tuo obiettivo»: sola, con indietro e Salva', [visibili(), testo(d.getElementById('set-titolo')), d.getElementById('set-indietro').hidden, d.getElementById('set-piede').hidden], [['obiettivo'], 'Il tuo obiettivo', false, false]);
  const pag = (n) => d.querySelector(`#settings-modal .set-pagina[data-pagina="${n}"]`);
  atteso('dentro: obiettivo, peso obiettivo, attività, peso di oggi', [!!pag('obiettivo').querySelector('#set-obiettivo-grid'), !!pag('obiettivo').querySelector('#set-goal-weight'), !!pag('obiettivo').querySelector('#set-activity'), pag('obiettivo').querySelector('#set-weight').disabled], [true, true, true, true]);
  atteso('in Cibo: le calorie col Ricalcola, dieta, intolleranze', [!!pag('cibo').querySelector('#set-ricalcola'), !!pag('cibo').querySelector('#set-dieta'), !!pag('cibo').querySelector('#set-intol-pills')], [true, true, true]);
  atteso('in Allenamento: giorni, inizio, rigenera, unità, Tabata (Training 490)', ['#set-giorni-allenamento', '#set-train-start', '#set-rigenera-btn', '#set-unit', '#set-tabata'].map(q => !!pag('allenamento').querySelector(q)), [true, true, true, true, true]);
  atteso('in Profilo: nome, cognome, email, esci', [!!pag('profilo').querySelector('#set-fname'), !!pag('profilo').querySelector('#set-lname'), testo(pag('profilo').querySelector('#set-email')), /Esci/.test(testo(pag('profilo')))], [true, true, 'ignazio.f@me.com', true]);
  atteso('in I tuoi dati: scarica, dove vanno, elimina', ['#set-scarica-btn', '#set-elimina-btn'].map(q => !!pag('dati').querySelector(q)).concat(/Dove vanno/.test(testo(pag('dati')))), [true, true, true]);

  // 4) Salva: scrive, torna all'elenco aggiornato, la finestra resta aperta
  d.getElementById('set-goal-weight').value = '70';
  await W.saveSettings(); await attendi(30);
  const up = b.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update' && c.payload && 'goal_weight_kg' in c.payload).slice(-1)[0];
  atteso('Salva: scritto, di nuovo sull\'elenco, riga aggiornata', [up && up.payload.goal_weight_kg, visibili(), sotto('obiettivo'), d.getElementById('settings-modal').style.display], [70, ['elenco'], `${lblOb} · 70 kg`, 'flex']);

  // 5) indietro senza salvare: i campi tornano come nel profilo
  W.setVai('profilo'); d.getElementById('set-fname').value = 'Prova';
  W.setIndietro();
  atteso('indietro senza Salva: il nome torna com\'era', [visibili(), d.getElementById('set-fname').value], [['elenco'], 'Ignazio']);
  W.setVai('crediti');
  atteso('Crediti: niente Salva, aperti', [d.getElementById('set-piede').hidden, pag('crediti').querySelector('.settings-credits').classList.contains('expanded')], [true, true]);

  // 6) Salute: lo storico degli esami, letto solo qui e una volta
  const s1 = sangue();
  W.setVai('salute'); await attendi(30);
  atteso('Salute: storico letto qui, una lettura', [sangue() - s1, /Esami del sangue/.test(testo(d.getElementById('set-esami-storico')))], [1, true]);
  W.toggleBloodTest('b1'); await attendi(10);
  atteso('il dettaglio di un esame si apre nella pagina', /Ferritina/.test(testo(d.getElementById('set-esami-storico'))), true);
  W.setIndietro(); W.setVai('salute'); await attendi(20);
  atteso('riaperta: nessuna lettura in più', sangue() - s1, 1);

  // 7) Pausa e Come stai adesso aprono i loro fogli dall'elenco
  let pausa = 0, orari = 0; W.apriPausa = () => { pausa++; }; W.apriOrariComeStaiAdesso = () => { orari++; };
  W.setIndietro();
  d.querySelector('#settings-modal .set-voce[data-voce="pausa"]').click();
  d.querySelector('#settings-modal .set-voce[data-voce="come-stai"]').click();
  atteso('Pausa e Come stai adesso: i loro fogli', [pausa, orari], [1, 1]);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
