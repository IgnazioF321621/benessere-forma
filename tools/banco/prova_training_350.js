// Training 350 (Ondata 4, Sessione H, 13 ottobre 2026): la pausa programmata (vacanza, viaggio, lavoro).
// Decisioni di Ignazio: un periodo con le date (fine anche aperta) · il blocco si congela, oltre tre
// settimane al rientro si propone il blocco nuovo · Pirsi lo sa. La pausa sta nel profilo.
// Parte 1: la regola pura (shared/quadro.js) e Pirsi (shared/coach_rules.js), senza jsdom.
// Parte 2: l'app vera: card, foglio con le date, striscia, niente debito, blocco fermo, rientro.
//   node tools/banco/prova_training_350.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const Q = require('../../shared/quadro.js');
const R = require('../../shared/coach_rules.js');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };

// ── Parte 1a: pausaInfo e pausaGiorniNel ──
{
  const pi = (p) => Q.pausaInfo(p, OGGI);
  atteso('regola · senza pausa → null', [pi({}), pi({ pausa_fine:'2026-10-20' })], [null, null]);
  let p = pi({ pausa_inizio:'2026-10-20', pausa_fine:'2026-10-30', pausa_motivo:'vacanza' });
  atteso('regola · futura: 11 giorni, nessuno fatto', [p.attiva, p.futura, p.finita, p.giorniTotali, p.giorniFatti, p.giorniDalRientro, p.motivo], [false, true, false, 11, 0, null, 'vacanza']);
  p = pi({ pausa_inizio:'2026-10-10', pausa_fine:'2026-10-20' });
  atteso('regola · in corso: oggi è il 4° giorno', [p.attiva, p.futura, p.finita, p.giorniTotali, p.giorniFatti], [true, false, false, 11, 4]);
  p = pi({ pausa_inizio:'2026-10-10', pausa_fine:null });
  atteso('regola · aperta: attiva, totale sconosciuto', [p.attiva, p.giorniTotali, p.giorniFatti], [true, null, 4]);
  p = pi({ pausa_inizio:'2026-09-10', pausa_fine:'2026-10-04' });
  atteso('regola · finita: 25 giorni, tornato da 9', [p.attiva, p.finita, p.giorniTotali, p.giorniDalRientro], [false, true, 25, 9]);
  atteso('regola · fine prima dell\'inizio: la fine è l\'inizio', pi({ pausa_inizio:'2026-10-13', pausa_fine:'2026-10-01' }).giorniTotali, 1);
  const g = (p, a, b) => Q.pausaGiorniNel(p, a, b);
  const pz = { pausa_inizio:'2026-10-10', pausa_fine:'2026-10-20' };
  atteso('giorni nel periodo · tutta dentro, a cavallo, fuori, aperta fino al bordo', [g(pz, '2026-10-01', '2026-10-31'), g(pz, '2026-10-15', '2026-10-25'), g(pz, '2026-10-21', '2026-10-31'), g({ pausa_inizio:'2026-10-10' }, '2026-10-01', '2026-10-13'), g({}, '2026-10-01', '2026-10-31')], [11, 6, 0, 4, 0]);
  // il check dei 42 giorni: i giorni di pausa non contano
  const nowTs = new Date(OGGI + 'T12:00:00').getTime();
  atteso('check di fine blocco · 45 giorni dall\'inizio ma 10 di pausa: non ancora', [!!Q.blockCheckReminder({ start: add(OGGI, -45), nowTs, checks:[] }), Q.blockCheckReminder({ start: add(OGGI, -45), nowTs, checks:[], pauseDays: 10 })], [true, null]);
}
// ── Parte 1b: il quadro della settimana e Pirsi ──
{
  const WS = '2026-10-05', we = '2026-10-11';
  const vuoto = { weightLogs:[], bodyLogs:[], measurements:[], checks:[], meals:[], suppLogs:[], supps:[], catalog:[], sets:[], workouts:[], blood:[], errors:[] };
  const prof = { giorni_allenamento:4, train_start_date:'2026-09-01', pausa_inizio:'2026-10-08', pausa_fine:'2026-10-20' };
  const w = (d, s) => ({ date:d, session_type:s, completed:true });
  const raw = { ...vuoto, workouts:[w('2026-10-05','upperA'), w('2026-10-06','lowerA')], sets:[{ date:'2026-10-05', session_id:'upperA', rir_actual:2 }] };
  const ctx = { today:OGGI, nowTs:new Date(OGGI + 'T12:00:00').getTime(), profile:prof, target:null, workPerGiro:4, deloads:[] };
  const pic = Q.computeWeeklyPicture(raw, WS, ctx);
  atteso('quadro · la settimana ha 4 giorni di pausa, le «mancate» non si contano', [pic.training.pause_days, pic.training.sessions_done, pic.training.sessions_missed], [4, 2, null]);
  const pic0 = Q.computeWeeklyPicture(raw, WS, { ...ctx, profile:{ ...prof, pausa_inizio:null, pausa_fine:null } });
  atteso('quadro · senza pausa: 0 giorni e 2 mancate, come prima', [pic0.training.pause_days, pic0.training.sessions_missed], [0, 2]);
  // Pirsi: due settimane sotto le previste → «3 invece di 4»; con la pausa di mezzo no
  const quadro = (k, tr) => { const ws = add('2026-09-07', -7 * k); const all = [0,1,2,3,4,5,6].map(i => add(ws, i)); return {
    weight: { weight_avg: 75 - k * 0.5, weight_n: 4, weight_last: 75 - k * 0.5, weight_trend_4w: null, weight_target: 70 },
    nutrition: { kcal_target: 2200, protein_target: 150, kcal_avg: 2150, protein_avg: 150, supp_kcal_avg: 100, supp_protein_avg: 20, days_logged: 7, logged_dates: all, adherence_kcal: 0.86, days_partial: 0, partial: false, days_under_75: 0 },
    training: { sessions_planned: 4, sessions_done: 2, sessions_missed: 2, recovery_done: 1, block_week: 2, is_deload: false, volume_sets: 30, avg_rir: 1.5, injury_days: 0, injury_active: false, ...(tr || {}) },
    body: { last_check_date: '2026-08-20', days_since_check: 24, check_due: false, last_measurements: null, prev_check_date: null, ai_overall: null, ai_confidence: null, ai_check_date: null },
    blood: { last_test_date: '2026-06-01', days_since_test: 104, test_count: 2 },
    meta: { version: 2, week_start: ws, week_end: add(ws, 6), is_closed: true, errors: [] } }; };
  const profilo = { obiettivo: 'dimagrimento', goal_weight_kg: 70, target_kcal: 2200, target_protein: 150, target_carbs: 220, target_fat: 70, giorni_allenamento: 4, train_start_date: '2026-08-10' };
  const kinds = (tr0) => R.buildProposals(quadro(0, tr0), [quadro(1), quadro(2), quadro(3)], profilo, {}).map(p => p.kind);
  atteso('Pirsi · due settimane sotto le previste: propone meno giorni', kinds({}).includes('training_volume'), true);
  atteso('Pirsi · con giorni di pausa nella settimana: non lo propone', kinds({ pause_days: 3 }).includes('training_volume'), false);
}
// ── Parte 1c: il Worker legge le date della pausa ──
{
  const cron = fs.readFileSync(path.join(__dirname, '..', '..', 'worker', 'src', 'coach-cron.js'), 'utf8');
  atteso('Worker · il cron chiede pausa_inizio e pausa_fine nel profilo', /profiles\?select=[^'"]*pausa_inizio,pausa_fine/.test(cron), true);
}

// ── Parte 2: l'app ──
const scheda = { sessioni: [
  { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[ { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10' } ] },
  { id:'lowerA', name:'Lower A', type:'Forza', rir:2, exercises:[ { codice:'EX040', name:'Squat elastico', sets:3, reps:'6-10' } ] },
  { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, exercises:[ { codice:'EX002', name:'Piegamenti', sets:3, reps:'8-12' } ] },
  { id:'lowerB', name:'Lower B', type:'Ipertrofia', rir:1, exercises:[ { codice:'EX041', name:'Affondi', sets:3, reps:'8-12' } ] },
] };
function fixture(o){
  o = o || {};
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', giorni_allenamento:4, train_start_date: o.inizio || '2026-10-05', pausa_inizio: o.pausa_inizio || null, pausa_fine: o.pausa_fine || null, pausa_motivo: o.pausa_motivo || null }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico' }, { codice:'EX040', nome:'Squat elastico' }, { codice:'EX002', nome:'Piegamenti' }, { codice:'EX041', nome:'Affondi' }],
    // upperA fatta, poi upperB saltando lowerA: senza pausa è un debito
    workouts: o.workouts || [ { id:'w1', user_id:U, session_type:'upperA', date:'2026-10-06', completed:true }, { id:'w2', user_id:U, session_type:'upperB', date:'2026-10-08', completed:true } ],
    training_logs: o.training_logs || [],
    training_notes:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(o){
  const t = fixture(o);
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  await b.win.loadTrainingAllCompleted({ skipRender:true });
  ST.page = 'training'; ST.trainTab = 'piano'; ST.trainSession = null;
  b.win.callAI = async () => '';
  b.win.renderTraining();
  const doc = b.win.document;
  const pagina = () => testo(doc.getElementById('page-training').innerHTML);
  const scritture = () => b.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').map(c => c.payload);
  return { ...b, ST, t, doc, pagina, scritture };
}
(async () => {
  // 1 · senza pausa: la card «Imposta», il debito c'è, niente striscia
  {
    const a = await nuovo();
    atteso('app · la card fra i riposi extra, da impostare', [/Mi fermo per un periodo/.test(a.pagina()), /Imposta/.test(a.pagina()), !!a.doc.getElementById('pausa-bar')], [true, true, false]);
    atteso('app · senza pausa lowerA è in debito', a.win.computeTrainingDebt().debt, ['lowerA']);
    atteso('app · getPausa null', a.win.getPausa(), null);
    // il foglio: date, «non lo so ancora», motivo, salva
    a.win.apriPausa();
    atteso('foglio · si apre con oggi come partenza', [!!a.doc.getElementById('pausa-modal'), a.doc.getElementById('pausa-inizio').value, a.doc.getElementById('pausa-aperta').getAttribute('aria-checked')], [true, OGGI, 'false']);
    a.doc.getElementById('pausa-inizio').value = '2026-10-20'; a.doc.getElementById('pausa-fine').value = '2026-10-30';
    a.ST.pausaModal.motivi = ['viaggio'];
    await a.win.salvaPausa();
    atteso('foglio · scrive le tre colonne nel profilo, una riga per id', a.scritture().pop(), { pausa_inizio:'2026-10-20', pausa_fine:'2026-10-30', pausa_motivo:'viaggio', pausa_moduli:['allenamento', 'cibo', 'pesate'] });
    atteso('foglio · il profilo in memoria è aggiornato e il foglio chiuso', [a.ST.profile.pausa_inizio, a.ST.profile.pausa_fine, !!a.ST.pausaModal], ['2026-10-20', '2026-10-30', false]);
    atteso('striscia · pausa dichiarata per dopo, con «Togli»', [/PAUSA · VIAGGIO/.test(a.pagina()), /Pausa dal 20 ottobre al 30 ottobre/.test(a.pagina()), /Togli/.test(a.pagina())], [true, true, true]);
    atteso('app · una pausa futura non toglie il debito di oggi', a.win.computeTrainingDebt().debt, ['lowerA']);
    await a.win.terminaPausa();
    atteso('striscia · «Togli» su una pausa futura la cancella', [a.scritture().pop(), !!a.doc.getElementById('pausa-bar')], [{ pausa_inizio:null, pausa_fine:null, pausa_motivo:null, pausa_moduli:null }, false]);
    // fine prima dell'inizio: non si salva
    a.win.apriPausa();
    a.doc.getElementById('pausa-inizio').value = '2026-10-20'; a.doc.getElementById('pausa-fine').value = '2026-10-10';
    const n = a.scritture().length;
    await a.win.salvaPausa();
    atteso('foglio · ritorno prima della partenza: niente scrittura, foglio ancora aperto', [a.scritture().length - n, !!a.ST.pausaModal], [0, true]);
    // aperta
    a.doc.getElementById('pausa-fine').value = ''; a.doc.getElementById('pausa-aperta').click();
    await a.win.salvaPausa();
    atteso('foglio · «non lo so ancora»: fine nulla', a.scritture().pop(), { pausa_inizio:'2026-10-20', pausa_fine:null, pausa_motivo:'vacanza', pausa_moduli:['allenamento', 'cibo', 'pesate'] });
  }
  // 2 · in pausa: striscia, niente debito, «Rientro anticipato» chiude a ieri
  {
    const a = await nuovo({ pausa_inizio:'2026-10-10', pausa_fine:'2026-10-20', pausa_motivo:'vacanza' });
    atteso('in pausa · la striscia dice fino a quando, con «Rientro anticipato»', [/In pausa fino al 20 ottobre/.test(a.pagina()), /Rientro anticipato/.test(a.pagina()), /PAUSA · VACANZA/.test(a.pagina())], [true, true, true]);
    atteso('in pausa · nessun debito', a.win.computeTrainingDebt().debt, []);
    await a.win.terminaPausa();
    atteso('in pausa · «Rientro anticipato»: la pausa finisce ieri, oggi conta', [a.scritture().pop(), a.win.getPausa().finita, a.win.computeTrainingDebt().debt], [{ pausa_fine:'2026-10-12' }, true, ['lowerA']]);
  }
  // 3 · il blocco è fermo: i giorni di pausa non contano per la card dei 35 giorni
  {
    const a = await nuovo({ inizio: add(OGGI, -40), pausa_inizio: add(OGGI, -20), pausa_fine: add(OGGI, -11) });
    atteso('blocco · 40 giorni dall\'inizio meno 10 di pausa = 30: la card non c\'è', [a.win._giorniDaInizioBlocco(), !!a.doc.getElementById('blocco-nuovo-card')], [30, false]);
    const b = await nuovo({ inizio: add(OGGI, -40) });
    atteso('blocco · senza pausa, a 40 giorni la card c\'è', [b.win._giorniDaInizioBlocco(), !!b.doc.getElementById('blocco-nuovo-card')], [40, true]);
  }
  // 4 · tornato da una pausa lunga: la card del blocco nuovo e il rientro graduale che lo dice
  {
    const a = await nuovo({ inizio: add(OGGI, -50), pausa_inizio: add(OGGI, -26), pausa_fine: add(OGGI, -2), pausa_motivo:'lavoro',
      training_logs: [ { id:'t1', user_id:U, session_id:'upperA', date: add(OGGI, -27), exercise_name:'Panca elastico', exercise_code:'EX001', set_number:1, reps:8, resistance:'40', band_color:null, rir_actual:2 } ] });
    atteso('rientro · 25 giorni di pausa finiti: la card dice «rientro dopo 25 giorni di pausa»', [!!a.doc.getElementById('blocco-nuovo-card'), /RIENTRO DOPO 25 GIORNI DI PAUSA/.test(a.pagina()), /blocco pulito/.test(a.pagina())], [true, true, true]);
    await a.win.maybeProposeSoftReturn('upperA');
    atteso('rientro · il rientro graduale sa della pausa (27 giorni fermo, livello 1)', [a.ST.softReturnPrompt && a.ST.softReturnPrompt.daPausa, a.ST.softReturnPrompt && a.ST.softReturnPrompt.level], [25, 1]);
    a.ST.trainSession = 'upperA'; a.ST.trainAnticipato = 'upperA'; a.win.renderTraining();
    atteso('rientro · il banner dice «Bentornato: 25 giorni di pausa»', /Bentornato: 25 giorni di pausa, 27 senza allenarti/.test(a.pagina()), true);
    const b = await nuovo({ inizio: add(OGGI, -30), pausa_inizio: add(OGGI, -16), pausa_fine: add(OGGI, -2) });
    atteso('rientro · 15 giorni di pausa: il blocco riprende, niente card', !!b.doc.getElementById('blocco-nuovo-card'), false);
    const c = await nuovo({ inizio: add(OGGI, -1), pausa_inizio: add(OGGI, -26), pausa_fine: add(OGGI, -2) });
    atteso('rientro · blocco nuovo già partito dopo la pausa: niente card', !!c.doc.getElementById('blocco-nuovo-card'), false);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
