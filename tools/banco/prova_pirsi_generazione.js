// Fase 3 — Lavoro E, lato app: il ripiego che genera le proposte se il cron non l'ha fatto,
// e lo scarico anticipato dentro la settimana del ciclo. Orologio fermo a domenica 13 set 2026.
//   node tools/banco/prova_pirsi_generazione.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const Q = require('../../shared/quadro.js');
const NOW = '2026-09-13T09:00:00';
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(60), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const base = () => ({ weight_logs:[], body_logs:[], body_measurements:[], body_checks:[], meals:[], supplements_log:[], supplements:[], nutrilite_catalog:[],
  workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[], coach_proposals:[] });
function avvia(tables){
  const b = boot(tables, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, obiettivo:'dimagrimento', goal_weight_kg:68, target_kcal:2200, target_protein:150, giorni_allenamento:4, created_at:'2026-05-01T08:00:00Z' };
  ST.TARGET = { kcal:2200, protein:150 };
  ST.page = 'home';
  return { ...b, ST };
}
(async () => {
  // 1. settimana chiusa senza proposte: l'app le genera (3 pesate, nessun pasto → logging e esami)
  let t = base();
  t.weight_logs = [ { user_id:U, id:'w1', date:'2026-09-01', weight_kg:72.6 }, { user_id:U, id:'w2', date:'2026-09-03', weight_kg:72.4 }, { user_id:U, id:'w3', date:'2026-09-05', weight_kg:72.2 } ];
  t.coach_proposals = [ { user_id:U, id:'old', week_start:'2026-08-24', kind:'check', status:'pending', title:'x', reason:'x', evidence:{} } ];
  let { win, supa, ST } = avvia(t);
  await win.ensureCoachProposals();
  const nuove = t.coach_proposals.filter(p => p.week_start === '2026-08-31');
  atteso('genera per la settimana chiusa 31 ago', nuove.map(p => [p.kind, p.status]), [['logging','pending'], ['blood_test','pending']]);
  atteso('ogni riga ha titolo, motivazione e numeri', nuove.every(p => p.title && p.reason && p.evidence && p.evidence.numeri.length), true);
  atteso('pending della settimana prima → expired (update inviato)', supa._calls.some(c => c.table === 'coach_proposals' && c.op === 'update' && c.payload.status === 'expired'), true);
  atteso('quadro della settimana chiusa salvato', t.weekly_pictures.map(r => r.week_start), ['2026-08-31']);
  // 2. seconda apertura: niente doppioni
  ({ win, supa, ST } = avvia(t));
  await win.ensureCoachProposals();
  atteso('seconda apertura · nessuna riga in più', t.coach_proposals.filter(p => p.week_start === '2026-08-31').length, 2);
  atteso('seconda apertura · nessun upsert', supa._calls.some(c => c.table === 'coach_proposals' && c.op === 'upsert'), false);
  // 3. il cron le ha già messe: l'app non genera
  t = base();
  t.coach_proposals = [ { user_id:U, id:'c1', week_start:'2026-08-31', kind:'keep', status:'pending', title:'x', reason:'x', evidence:{ numeri:[] } } ];
  ({ win, supa, ST } = avvia(t));
  await win.ensureCoachProposals();
  atteso('già generate dal cron · niente upsert', supa._calls.some(c => c.table === 'coach_proposals' && c.op === 'upsert'), false);
  // 4. tabella assente: nessun errore, nessuna generazione
  t = base(); t.__assenti = ['coach_proposals'];
  const b4 = avvia(t);
  await b4.win.ensureCoachProposals();
  atteso('tabella assente · niente upsert, niente eccezioni', [b4.supa._calls.some(c => c.op === 'upsert' && c.table === 'coach_proposals'), b4.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length], [false, 0]);
  // 5. quadro con una lettura fallita: niente proposte
  t = base(); t.__assenti = ['meals'];
  const b5 = avvia(t);
  await b5.win.ensureCoachProposals();
  atteso('lettura fallita · niente upsert', b5.supa._calls.some(c => c.op === 'upsert' && c.table === 'coach_proposals'), false);

  // 6. scarico anticipato: dal giorno dell'accettazione la settimana in corso è la 6, poi riparte da 1
  const w = (date, st) => ({ date, session_type: st });
  const giro = (d0) => [w(Q.addDays(d0,0),'upperA'), w(Q.addDays(d0,1),'lowerA'), w(Q.addDays(d0,3),'upperB'), w(Q.addDays(d0,4),'lowerB')];
  const storia = [...giro('2026-08-24'), ...giro('2026-08-31'), ...giro('2026-09-07')];   // 12 lavori = settimana 4
  const cwi = (asOf, deloads, completed) => { const x = Q.cycleWeekInfo({ completed: (completed || storia).filter(v => v.date <= asOf), today: asOf, workPerGiro: 4, deloads }); return [x.weekNum, x.isScarico]; };
  atteso('senza scarico · 13 set settimana 4', cwi('2026-09-13', []), [4, false]);
  atteso('scarico accettato il 13 set · settimana 6 da subito', cwi('2026-09-13', ['2026-09-13']), [6, true]);
  const dopo = [...storia, ...giro('2026-09-14')];
  atteso('14-17 set (4 lavori dopo) · ancora 6 il giorno dell\'ultimo', cwi('2026-09-18', ['2026-09-13'], dopo), [6, true]);
  atteso('il giorno dopo · settimana 1', cwi('2026-09-19', ['2026-09-13'], dopo), [1, false]);
  atteso('prima dell\'accettazione (quadro di una settimana passata) · niente scarico', cwi('2026-09-06', ['2026-09-13']), [3, false]);
  // e l'app lo legge da ST.coachDeloads
  ({ win, ST } = avvia(base()));
  ST.trainAllCompleted = storia; ST.coachDeloads = ['2026-09-13'];
  atteso('getCycleWeekInfo nell\'app · settimana 6', [win.getCycleWeekInfo().weekNum, win.getCycleWeekInfo().isScarico], [6, true]);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
