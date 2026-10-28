// Metodo 210 (14 ottobre 2026): una pausa sola per tutti i moduli, con tre interruttori (allenamento,
// cibo, pesate e misure), accesi di default. La regola è una, in shared/quadro.js (pausaModuli,
// pausaInfo.moduli, pausaGiorniNel con modulo, pausaAttivaIl); la leggono Training, Home, Nutrition
// (serie dei giorni di fila), Body (promemoria pesata e check), Impostazioni e Pirsi (quadro e regole).
//   node tools/banco/prova_pausa_moduli.js
process.env.TZ = 'Europe/Rome';
const Q = require('../../shared/quadro.js');
const R = require('../../shared/coach_rules.js');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };

// ── Parte 1: la regola pura ──
{
  const base = { pausa_inizio:'2026-10-10', pausa_fine:'2026-10-20' };
  atteso('moduli · senza campo, o vuoto: tutti e tre accesi', [Q.pausaModuli(base), Q.pausaModuli({ ...base, pausa_moduli: [] })], [{ allenamento:true, cibo:true, pesate:true }, { allenamento:true, cibo:true, pesate:true }]);
  atteso('moduli · solo quelli elencati', Q.pausaModuli({ ...base, pausa_moduli: ['cibo', 'Pesate '] }), { allenamento:false, cibo:true, pesate:true });
  atteso('pausaInfo · porta i moduli', Q.pausaInfo({ ...base, pausa_moduli: ['allenamento'] }, OGGI).moduli, { allenamento:true, cibo:false, pesate:false });
  atteso('giorni nel periodo · col modulo fermo contano, col modulo acceso no; senza modulo come prima', [Q.pausaGiorniNel({ ...base, pausa_moduli:['cibo'] }, '2026-10-01', '2026-10-31', 'cibo'), Q.pausaGiorniNel({ ...base, pausa_moduli:['cibo'] }, '2026-10-01', '2026-10-31', 'allenamento'), Q.pausaGiorniNel({ ...base, pausa_moduli:['cibo'] }, '2026-10-01', '2026-10-31')], [11, 0, 11]);
  atteso('pausaAttivaIl · per giorno e modulo', [Q.pausaAttivaIl(base, '2026-10-15', 'cibo'), Q.pausaAttivaIl(base, '2026-10-21', 'cibo'), Q.pausaAttivaIl({ ...base, pausa_moduli:['allenamento'] }, '2026-10-15', 'cibo'), Q.pausaAttivaIl({ ...base, pausa_fine:null }, '2027-01-01', 'pesate')], [true, false, false, true]);
  // il quadro: ogni sezione ha i suoi giorni di pausa
  const vuoto = { weightLogs:[], bodyLogs:[], measurements:[], checks:[], meals:[], suppLogs:[], supps:[], catalog:[], sets:[], workouts:[], blood:[], errors:[] };
  const ctx = (prof) => ({ today:OGGI, nowTs:new Date(OGGI + 'T12:00:00').getTime(), profile:{ giorni_allenamento:4, train_start_date:'2026-09-01', target_kcal:2000, ...prof }, target:{ kcal:2000, protein:150 }, workPerGiro:4, deloads:[] });
  const raw = { ...vuoto, workouts:[{ date:'2026-10-05', session_type:'upperA', completed:true }], sets:[{ date:'2026-10-05', session_id:'upperA', rir_actual:2 }], weightLogs:[{ date:'2026-10-05', weight_kg:70 }], meals:[{ date:'2026-10-05', slot:'pranzo', kcal:600, protein:40, carbs:60, fat:20 }] };
  const pic = Q.computeWeeklyPicture(raw, '2026-10-05', ctx({ pausa_inizio:'2026-10-08', pausa_fine:'2026-10-20', pausa_moduli:['cibo', 'pesate'] }));
  atteso('quadro · pause_days per sezione: allenamento 0 (acceso), cibo 4, pesate 4', [pic.training.pause_days, pic.training.sessions_missed, pic.nutrition.pause_days, pic.weight.pause_days], [0, 3, 4, 4]);
  const pic2 = Q.computeWeeklyPicture(raw, '2026-10-05', ctx({ pausa_inizio:'2026-10-08', pausa_fine:'2026-10-20' }));
  atteso('quadro · senza elenco: tutti e tre', [pic2.training.pause_days, pic2.training.sessions_missed, pic2.nutrition.pause_days, pic2.weight.pause_days], [4, null, 4, 4]);
  // il check dei 42 giorni: i giorni di pausa dell'allenamento non contano, quelli del solo cibo sì
  const nowTs = new Date(OGGI + 'T12:00:00').getTime();
  atteso('check di fine blocco · pauseDays contano solo con la pausa dell\'allenamento', [!!Q.blockCheckReminder({ start: add(OGGI, -45), nowTs, checks:[], pauseDays: Q.pausaGiorniNel({ pausa_inizio: add(OGGI, -20), pausa_fine: add(OGGI, -11) }, add(OGGI, -45), OGGI, 'allenamento') }), !!Q.blockCheckReminder({ start: add(OGGI, -45), nowTs, checks:[], pauseDays: Q.pausaGiorniNel({ pausa_inizio: add(OGGI, -20), pausa_fine: add(OGGI, -11), pausa_moduli:['cibo'] }, add(OGGI, -45), OGGI, 'allenamento') })], [false, true]);
}
// ── Parte 1b: Pirsi ──
{
  const quadro = (k, o) => { const ws = add('2026-09-07', -7 * k); const all = [0,1,2,3,4,5,6].map(i => add(ws, i)); o = o || {}; return {
    weight: { weight_avg: o.peso, weight_n: 4, weight_last: o.peso, weight_trend_4w: null, weight_target: 70, ...(o.weight || {}) },
    nutrition: { kcal_target: 2200, protein_target: 150, kcal_avg: 2150, protein_avg: 150, supp_kcal_avg: 100, supp_protein_avg: 20, days_logged: 7, logged_dates: all, adherence_kcal: 0.86, days_partial: 0, partial: false, days_under_75: 0, ...(o.nutrition || {}) },
    training: { sessions_planned: 4, sessions_done: 4, sessions_missed: 0, recovery_done: 1, block_week: 2, is_deload: false, volume_sets: 60, avg_rir: 1.5, injury_days: 0, injury_active: false, ...(o.training || {}) },
    body: { last_check_date: '2026-08-20', days_since_check: 24, check_due: false, last_measurements: null, prev_check_date: null, ai_overall: null, ai_confidence: null, ai_check_date: null },
    blood: { last_test_date: '2026-06-01', days_since_test: 104, test_count: 2 },
    meta: { version: 2, week_start: ws, week_end: add(ws, 6), is_closed: true, errors: [] } }; };
  const profilo = { obiettivo: 'dimagrimento', goal_weight_kg: 70, target_kcal: 2200, target_protein: 150, target_carbs: 220, target_fat: 70, giorni_allenamento: 4, train_start_date: '2026-08-10' };
  const run = (pesi, per) => { const qs = pesi.map((w, k) => quadro(k, { peso: w, ...((per && per(k)) || {}) })); return R.buildProposals(qs[0], qs.slice(1), profilo, {}); };
  const kinds = (ps) => ps.map(p => p.kind);
  atteso('Pirsi · poche pesate: lo chiede; con la pausa delle pesate no', [kinds(run([74, 74.5, 75, 75.5], k => k === 0 ? { weight:{ weight_n: 1 } } : {})).includes('weigh_in'), kinds(run([74, 74.5, 75, 75.5], k => k === 0 ? { weight:{ weight_n: 1, pause_days: 5 } } : {})).includes('weigh_in')], [true, false]);
  atteso('Pirsi · pochi giorni registrati: lo chiede; con la pausa del cibo no', [kinds(run([74, 74.5, 75, 75.5], k => k === 0 ? { nutrition:{ days_logged: 2 } } : {})).includes('logging'), kinds(run([74, 74.5, 75, 75.5], k => k === 0 ? { nutrition:{ days_logged: 2, pause_days: 5 } } : {})).includes('logging')], [true, false]);
  const senza = run([76.0, 75.6, 75.2, 74.8]);
  const con = run([76.0, 75.6, 75.2, 74.8], k => k === 0 ? { nutrition:{ pause_days: 3 } } : {});
  const kcal = senza.find(p => p.kind === 'kcal');
  atteso('Pirsi · peso che sale a dimagrimento: propone un taglio; con la pausa del cibo non taglia e lo dice', [!!(kcal && kcal.change.target_kcal.to < kcal.change.target_kcal.from), kinds(con).includes('kcal'), con.some(p => p.kind === 'keep' && /in pausa anche col cibo/.test(p.reason))], [true, false, true]);
}

// ── Parte 2: l'app ──
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[ { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10' } ] } ] };
function fixture(o){
  o = o || {};
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', obiettivo:'ricomposizione', train_start_date: o.inizio || add(OGGI, -50), weight_tracking_mode:'daily',
      pausa_inizio: o.pausa_inizio || null, pausa_fine: o.pausa_fine || null, pausa_motivo: o.pausa_motivo || null, pausa_moduli: o.pausa_moduli || null }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico' }],
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[], body_checks:[], body_measurements:[],
  };
}
async function nuovo(o){
  const t = fixture(o);
  const b = boot(t, { now: OGGI + 'T08:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.weightLogs = []; ST.bodyChecks = []; ST.bodyMeasurements = []; ST.supps = [];
  ST.trainHomeData = { nextSession:'upperA', doneToday:false, inProgress:false, lastSession:null, streak:0 };
  const pasto = { slot:'pranzo', kcal:600, protein:40, carbs:60, fat:20 };
  ST.db.days = { [OGGI]: { meals:[pasto] }, [add(OGGI, -1)]: { meals:[] }, [add(OGGI, -2)]: { meals:[pasto] }, [add(OGGI, -3)]: { meals:[pasto] } };
  return { ...b, ST, t, doc: b.win.document };
}
(async () => {
  // tutto fermo
  {
    const a = await nuovo({ pausa_inizio: add(OGGI, -2), pausa_fine: add(OGGI, 5), pausa_motivo:'vacanza' });
    atteso('app · pausaAttivaPer: tutti e tre', ['allenamento', 'cibo', 'pesate'].map(m => a.win.pausaAttivaPer(m)), [true, true, true]);
    atteso('Home · prossima azione: «Sei in pausa», niente pasto, niente pesata', [a.win.getProssimaAzioneSimple().titolo, a.win.getDaFareOggi(a.win.getProssimaAzioneSimple()).length], ['Sei in pausa', 0]);
    atteso('Home · lo stato del giorno della card Training dice «in pausa fino a»', /IN PAUSA FINO A/.test(a.win._statoGiornoTraining(a.ST.trainHomeData)), true);
    atteso('Nutrition · la serie dei giorni di fila non si spezza sul giorno vuoto in pausa (oggi, ieri vuoto, l\'altro ieri, 3 giorni fa → 3)', a.win.calcStreak(), 3);
    atteso('Body · mai pesato ma promemoria pesata zitto; check dei 42 giorni zitto', [a.win._weightReminderShouldShow(), a.win.getBlockCheckReminder()], [false, null]);
    atteso('Training · in pausa la seduta proposta è la prossima della rotazione (Training 530: il debito non c\'è più)', a.win.sedutaProposta(), (a.ST.trainHomeData && a.ST.trainHomeData.nextSession) || null);
    a.win.openSettingsModal();
    atteso('Impostazioni · la riga dice la pausa coi moduli, il tasto dice Modifica', [a.doc.getElementById('set-pausa-stato').textContent, a.doc.getElementById('set-pausa-btn').textContent], [`Dal ${a.win._pausaFmt(add(OGGI, -2))} al ${a.win._pausaFmt(add(OGGI, 5))} (vacanza) · allenamento, cibo, pesate e misure`, 'Modifica ›']);
  }
  // solo l'allenamento fermo
  {
    const a = await nuovo({ inizio: add(OGGI, -10), pausa_inizio: add(OGGI, -2), pausa_fine: add(OGGI, 5), pausa_moduli:['allenamento'] });   // blocco a 10 giorni: nessun check dovuto di mezzo
    atteso('solo allenamento · pausaAttivaPer', ['allenamento', 'cibo', 'pesate'].map(m => a.win.pausaAttivaPer(m)), [true, false, false]);
    atteso('solo allenamento · la pesata torna prima (mai pesato, mattina), poi la colazione: non la seduta', [a.win._weightReminderShouldShow(), a.win.getProssimaAzioneSimple().titolo], [true, 'Pesati']);
    a.ST.weightLogs = [{ date: OGGI, weight_kg: 70 }];
    atteso('solo allenamento · pesata fatta: tocca alla colazione, non alla seduta', a.win.getProssimaAzioneSimple().titolo, 'Registra la colazione');
    a.ST.db.days[OGGI].meals.push({ slot:'colazione', kcal:300, protein:20, carbs:30, fat:10 });
    atteso('solo allenamento · con tutto fatto: «Allenamento in pausa», non la seduta', a.win.getProssimaAzioneSimple().titolo, 'Allenamento in pausa');
    atteso('solo allenamento · la serie dei giorni di fila si spezza sul giorno vuoto (1)', a.win.calcStreak(), 1);
    a.ST.profile.train_start_date = add(OGGI, -50);
    atteso('solo allenamento · il check dei 42 giorni parla (50 giorni, nessun check)', !!a.win.getBlockCheckReminder(), true);
  }
  // solo cibo e pesate fermi: Training va avanti
  {
    const a = await nuovo({ pausa_inizio: add(OGGI, -2), pausa_fine: add(OGGI, 5), pausa_moduli:['cibo', 'pesate'] });
    atteso('cibo e pesate · la seduta è la prossima azione, niente striscia in Training', [a.win.getProssimaAzioneSimple().titolo, a.win._renderPausaBar()], ['È ora di Upper A', '']);
    atteso('cibo e pesate · lo stato del giorno non dice «in pausa»', /IN PAUSA/.test(a.win._statoGiornoTraining(a.ST.trainHomeData)), false);
  }
  // il foglio: gli interruttori si salvano
  {
    const a = await nuovo();
    a.win.apriPausa();
    const m = a.doc.getElementById('pausa-modal');
    const stati = () => [...a.doc.querySelectorAll('.pausa-modulo')].map(c => c.getAttribute('aria-checked') === 'true');
    const testi = () => [...a.doc.querySelectorAll('.pausa-modulo .pausa-stato')].map(c => c.textContent.trim());
    atteso('foglio · sul body, tre interruttori veri (role=switch) accesi, con lo stato scritto', [!!m, stati(), testi()], [true, [true, true, true], ['· SI FERMA', '· SI FERMA', '· SI FERMA']]);
    a.doc.getElementById('pausa-inizio').value = add(OGGI, 3); a.doc.getElementById('pausa-fine').value = add(OGGI, 10);
    a.doc.querySelector('.pausa-modulo[data-modulo="cibo"]').click();
    atteso('foglio · un tocco spegne il cibo, scrive «va avanti», le date scritte restano', [stati(), testi()[1], a.doc.getElementById('pausa-inizio').value, a.doc.getElementById('pausa-fine').value], [[true, false, true], '· VA AVANTI', add(OGGI, 3), add(OGGI, 10)]);
    a.doc.querySelector('.pausa-modulo[data-modulo="cibo"]').click();
    atteso('foglio · un altro tocco lo riaccende', stati(), [true, true, true]);
    a.doc.querySelector('.pausa-modulo[data-modulo="cibo"]').click();
    // più motivi insieme: viaggio e lavoro
    a.doc.querySelector('.pausa-motivo[data-motivo="viaggio"]').click(); a.doc.querySelector('.pausa-motivo[data-motivo="lavoro"]').click(); a.doc.querySelector('.pausa-motivo[data-motivo="vacanza"]').click();
    atteso('motivi · più di uno insieme, segnati con la spunta', [...a.doc.querySelectorAll('.pausa-motivo.on')].map(c => c.dataset.motivo), ['viaggio', 'lavoro']);
    await a.win.salvaPausa();
    const upd = a.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').pop();
    atteso('foglio · salva le date, i moduli scelti e i motivi in elenco; il foglio si chiude', [upd.payload.pausa_moduli, upd.payload.pausa_inizio, upd.payload.pausa_motivo, !!a.doc.getElementById('pausa-modal')], [['allenamento', 'pesate'], add(OGGI, 3), 'viaggio,lavoro', false]);
    atteso('foglio · in memoria la pausa futura ha i suoi moduli', a.win.getPausa().moduli, { allenamento:true, cibo:false, pesate:true });
    atteso('motivi · il riassunto e la striscia li leggono: «viaggio e lavoro»', [a.win._pausaMotivoTesto('viaggio,lavoro'), a.win._pausaMotivoTesto('vacanza'), a.win._pausaMotivoTesto('vacanza,viaggio,lavoro'), a.win._pausaMotivoTesto('boh'), /viaggio e lavoro/.test(a.win._pausaRiassunto())], ['viaggio e lavoro', 'vacanza', 'vacanza, viaggio e lavoro', null, true]);
    a.win.apriPausa();
    atteso('motivi · riaprendo, i due motivi sono già segnati', [...a.doc.querySelectorAll('.pausa-motivo.on')].map(c => c.dataset.motivo), ['viaggio', 'lavoro']);
    [...a.doc.querySelectorAll('.pausa-modulo')].forEach(c => { if(c.getAttribute('aria-checked') === 'true') c.click(); });
    const prima = a.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').length;
    await a.win.salvaPausa();
    atteso('foglio · senza niente da fermare non si salva', [a.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').length - prima, !!a.doc.getElementById('pausa-modal')], [0, true]);
    a.win.chiudiPausa();
    await a.win.terminaPausa();
    const upd2 = a.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').pop();
    atteso('togli · una pausa futura si cancella, moduli compresi', upd2.payload, { pausa_inizio:null, pausa_fine:null, pausa_motivo:null, pausa_moduli:null });
  }
  const cron = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'worker', 'src', 'coach-cron.js'), 'utf8');
  atteso('Worker · il cron legge pausa_moduli nel profilo', /pausa_fine,pausa_moduli/.test(cron), true);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
