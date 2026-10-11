// Home 030 (11 ottobre 2026): la card Training dice lo stato vero del giorno — sto caricando, non riesco
// a leggere, non iniziato, in corso (dalle serie di oggi), completata, prossima o riposo — entra
// direttamente nella seduta, mostra infortunio / rientro / scarico e i giorni di fila.
//   node tools/banco/prova_home_030.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-11';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(74), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const w = (date, s, completed = true) => ({ id: 'w' + date + s, user_id: U, date, session_type: s, completed });
function fixture(workouts){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', obiettivo:'ricomposizione' }],
    schede_utente:[], esercizi_catalog:[], workouts: workouts || [], training_logs:[], training_notes:[],
    body_logs:[], weight_logs:[], body_measurements:[], body_checks:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[], weekly_pictures:[], blood_tests:[], body_check_ai:[],
  };
}
async function nuovo(workouts, opts){
  const t = fixture(workouts);
  const b = boot(t, { now: OGGI + 'T09:00:00', locale: (opts && opts.locale) || {} });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  b.win.applyProfile(ST.profile);
  ST.page = 'home';
  const card = () => { b.win.renderHomeV2(); const el = b.win.document.getElementById('home-card-training'); return el ? { testo: el.textContent.replace(/\s+/g, ' ').trim(), tocco: el.getAttribute('onclick'), stato: (b.win.document.getElementById('home-card-training-stato') || {}).textContent || '' } : null; };
  return { ...b, ST, t, card };
}
(async () => {
  // 1) dato non ancora arrivato: «Sto caricando», non «Inizia il programma»
  {
    const a = await nuovo([]);
    a.ST.trainHomeData = null;
    const c = a.card();
    atteso('caricamento · la card dice che sta caricando', [/Sto caricando/.test(c.testo), /Inizia il programma/i.test(c.testo)], [true, false]);
  }
  // 2) lettura in errore: lo dice e il tocco riprova
  {
    const a = await nuovo([w('2026-10-06', 'upperA')]);
    a.t.__rete = false;
    await a.win.computeTrainHomeData();
    a.t.__rete = true;
    const c = a.card();
    atteso('errore · la card dice «non riesco a leggere» e il tocco riprova', [a.ST.trainHomeData.errore, /Non riesco a leggere/.test(c.testo), /riprovare/i.test(c.testo), c.tocco], [true, true, true, 'loadTrainingHomeData()']);
    atteso('errore · nessuna seduta inventata per il debito e per Pirsi', a.ST.trainHomeData.nextSession, null);
  }
  // 3) davvero non iniziato: la lettura ha risposto e non c'è niente; il tocco apre Upper A
  {
    const a = await nuovo([]);
    await a.win.computeTrainHomeData();
    const c = a.card();
    atteso('non iniziato · «Inizia il programma», tocco diretto su Upper A', [a.ST.trainHomeData.notStarted, /INIZIA IL PROGRAMMA/.test(c.testo), c.tocco], [true, true, "apriSessioneDallaHome('upperA')"]);
  }
  // 4) in corso: serie registrate oggi, sessione non chiusa
  {
    const a = await nuovo([w('2026-10-06', 'upperA'), w('2026-10-07', 'lowerA')]);
    a.ST.trainLoggedSets = { ['upperB_Panca_1_' + OGGI]: { reps: 8 }, ['upperB_Panca_2_' + OGGI]: { reps: 8 } };
    await a.win.computeTrainHomeData();
    const c = a.card();
    atteso('in corso · Upper B con 2 serie fatte, tocco diretto sulla seduta', [a.ST.trainHomeData.inProgress, a.ST.trainHomeData.lastSession, /IN CORSO · 2 SERIE FATTE/.test(c.testo), c.tocco], [true, 'upperB', true, "apriSessioneDallaHome('upperB')"]);
    a.win.apriSessioneDallaHome('upperB');
    atteso('tocco · si entra nel tab Training dentro la seduta Upper B', [a.ST.page, a.ST.trainSession], ['training', 'upperB']);
  }
  // 5) completata oggi: resta «completata», anche con le serie di oggi in memoria
  {
    const a = await nuovo([w('2026-10-06', 'upperA'), w(OGGI, 'lowerA')]);
    a.ST.trainLoggedSets = { ['lowerA_Squat_1_' + OGGI]: { reps: 8 } };
    await a.win.computeTrainHomeData();
    const c = a.card();
    atteso('completata · Lower A fatta oggi, resta «completata» e dice la prossima (il recupero)', [a.ST.trainHomeData.doneToday, a.ST.trainHomeData.inProgress, /COMPLETATA/.test(c.testo), /PROSSIMA: RECOVERY/.test(c.testo)], [true, false, true, true]);
  }
  // 6) prossima seduta: tocco diretto; serie di giorni di fila
  {
    const a = await nuovo([w('2026-10-09', 'upperA'), w('2026-10-10', 'lowerA')]);
    await a.win.computeTrainHomeData();
    const c = a.card();
    atteso('prossima · Recovery Day come da rotazione, tocco diretto', [/Sessione/.test(c.testo), c.tocco], [true, "apriSessioneDallaHome('recoveryUpper')"]);
  }
  {
    const a = await nuovo([w('2026-10-09', 'upperA'), w('2026-10-10', 'lowerA'), w(OGGI, 'recoveryUpper')]);
    await a.win.computeTrainHomeData();
    const c = a.card();
    atteso('giorni di fila · tre di seguito, scritto nello stato del giorno', [a.ST.trainHomeData.streak, /3 GIORNI DI FILA/.test(c.stato)], [3, true]);
  }
  // 7) stato del giorno: scarico, infortunio, rientro graduale
  {
    const a = await nuovo([w('2026-10-06', 'upperA')]);
    await a.win.computeTrainHomeData();
    a.ST.trainAllCompleted = [{ date: '2026-10-06', session_type: 'upperA' }];
    a.win.getCycleWeekInfo = () => ({ weekNum: 6, isScarico: true, workCount: 20, workPerGiro: 4 });
    atteso('scarico · «Settimana di scarico» nello stato del giorno', /SETTIMANA DI SCARICO/.test(a.card().stato), true);
  }
  {
    const a = await nuovo([w('2026-10-06', 'upperA')], { locale: { ['zt_injury_' + U]: JSON.stringify({ active: true, startDate: OGGI, endDate: add(OGGI, 2), zone: 'spalla' }) } });
    await a.win.computeTrainHomeData();
    atteso('infortunio · «Infortunio fino a …» nello stato del giorno', /INFORTUNIO FINO A/.test(a.card().stato), true);
  }
  {
    const a = await nuovo([w('2026-10-06', 'upperA')], { locale: { ['zt_soft_return_' + U]: JSON.stringify({ active: true, startDate: OGGI, level: 1 }) } });
    await a.win.computeTrainHomeData();
    const sr = a.win.getSoftReturn();
    atteso('rientro graduale · nello stato del giorno (se la chiave del rientro è quella)', [!!sr, sr ? /RIENTRO GRADUALE/.test(a.card().stato) : 'chiave diversa'], [true, true]);
  }
  console.log(ko ? ko + ' KO' : 'tutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
