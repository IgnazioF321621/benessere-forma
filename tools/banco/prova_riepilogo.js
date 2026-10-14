// Training 060 (Ondata 5, 14 ottobre 2026): il riepilogo di fine allenamento. Serie fatte su previste,
// tempo, confronto con la volta prima esercizio per esercizio (con la misura di ognuno), record,
// «com'è andata?» (facile · giusta · dura) con nota sulla riga dell'allenamento, tre passi dopo.
// Durante la seduta, ▲ sulla serie che supera l'ultima volta.
//   node tools/banco/prova_riepilogo.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14', PRIMA = '2026-10-07', VECCHIA = '2026-09-30';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
  { codice:'EX001', name:'Panca elastico', sets:2, reps:'6-10' },
  { codice:'EX008', name:'Trazioni sbarra assistite', sets:2, reps:'6-10' },
  { codice:'EX004', name:'Piegamenti', sets:2, reps:'8-12' },
  { codice:'EX060', name:'Curl elastico', sets:2, reps:'10-15' },
] } ] };
const log = (id, d, nome, codice, set, reps, resistance, band) => ({ id, user_id:U, session_id:'upperA', date:d, exercise_name:nome, exercise_code:codice, set_number:set, reps, resistance, band_color: band || null, rir_actual:2 });
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'kg', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico' }, { codice:'EX008', nome:'Trazioni sbarra assistite' }, { codice:'EX004', nome:'Piegamenti' }, { codice:'EX060', nome:'Curl elastico' }],
    training_logs:[
      // panca: il meglio di sempre 50 kg (due settimane fa), la volta prima 40 kg × 8
      log('a1', VECCHIA, 'Panca elastico', 'EX001', 1, 5, '50'),
      log('a2', PRIMA, 'Panca elastico', 'EX001', 1, 7, '40'), log('a3', PRIMA, 'Panca elastico', 'EX001', 2, 8, '40'),
      // trazioni: la volta prima Nera × 8
      log('b1', PRIMA, 'Trazioni sbarra assistite', 'EX008', 1, 8, null, 'Nera'),
      // piegamenti: la volta prima 12 (il meglio di sempre)
      log('c1', PRIMA, 'Piegamenti', 'EX004', 1, 12, null),
    ],
    training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(){
  const t = fixture();
  const b = boot(t, { now: OGGI + 'T07:30:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.aiCue = ST.aiCue || {};
  b.win.callAI = async () => '';
  await b.win.loadLastLoggedSets('upperA');
  b.win.renderTraining();
  const doc = b.win.document;
  const pagina = () => testo(doc.getElementById('page-training').innerHTML);
  const scegli = (id, v) => { const el = doc.getElementById(id); el.value = v; el.dispatchEvent(new b.win.Event('change', { bubbles:true })); };
  const salva = async (nome, set, reps, resist, banda) => {
    if(ST.trainCountdown && ST.trainCountdown.exName !== nome) b.win.skipCountdown();   // un recupero verso un altro esercizio
    b.win.openLogModal('upperA', nome, set);
    scegli('tl-reps', String(reps)); if(doc.getElementById('tl-rir')) scegli('tl-rir', '2');
    if(banda) ST.trainLogBandColor = banda; else ST.trainLogResist = resist;
    await b.win.saveTrainingSet();
  };
  return { ...b, ST, t, doc, pagina, scegli, salva };
}
(async () => {
  const a = await nuovo();
  a.ST.trainSessionStart = a.win.Date.now() - 41 * 60000;   // la seduta è iniziata 41 minuti fa
  // ▲ sulla serie che supera l'ultima volta
  await a.salva('Panca elastico', 1, 8, 40);          // pari alla volta prima: niente ▲
  await a.salva('Panca elastico', 2, 6, 50);          // 50 kg × 6: supera la volta prima, e batte il meglio di sempre (50 × 5)
  const pills = [...a.doc.querySelectorAll('#excard-Panca_elastico .ex-set-pill-done')].map(p => /▲/.test(p.innerHTML));
  atteso('▲ · solo sulla serie che supera l\'ultima volta', pills, [false, true]);
  await a.salva('Trazioni sbarra assistite', 1, 8, null, 'Rossa');   // banda più dura della volta prima: supera, ed è record
  await a.salva('Piegamenti', 1, 11, 0);                              // sotto la volta prima
  // una serie sola sulle trazioni, nessuna sul curl: 4 fatte su 8
  const wk = a.t.workouts.length;
  await a.win.completeSession('upperA');
  const r = a.ST.trainRiepilogo;
  atteso('riepilogo · si apre, la seduta è chiusa, l\'allenamento è salvato', [!!a.doc.getElementById('riepilogo-sessione'), a.ST.trainSession, a.t.workouts.length - wk, !!r.wid], [true, null, 1, true]);
  atteso('riepilogo · serie fatte su previste, tempo, record', [r.fatte, r.previste, r.minuti, r.record], [4, 8, 41, 2]);
  const per = (n) => { const x = r.righe.find(z => z.name === n); return [x.esito, x.record, x.oggi, x.prima]; };
  atteso('riepilogo · panca: su rispetto alla volta prima (50 × 6 contro 40 × 8) e record (50 × 5 era il meglio)', per('Panca elastico'), ['su', true, '50 kg × 6', '40 kg × 8']);
  atteso('riepilogo · trazioni: banda più dura, record', per('Trazioni sbarra assistite'), ['su', true, 'Rossa × 8', 'Nera × 8']);
  atteso('riepilogo · piegamenti: giù (11 contro 12)', per('Piegamenti'), ['giu', false, '11 reps', '12 reps']);
  atteso('riepilogo · curl: saltato', per('Curl elastico')[0], 'saltato');
  const html = a.pagina();
  atteso('riepilogo · a schermo: serie, tempo, record, i tre passi', [/SERIE 4 \/ 8/.test(html), /41 min/.test(html), /🏆 RECORD/.test(html), /Registra il pasto dopo l'allenamento/.test(html), /Pesati/.test(html), /Torna alla Home/.test(html)], [true, true, true, true, true, true]);
  atteso('riepilogo · «com\'è andata?» a tre pulsanti', a.doc.querySelectorAll('.riepilogo-sens').length, 3);
  // la sensazione e la nota vanno sulla riga dell'allenamento
  a.win._riepilogoScegli('dura');
  a.doc.getElementById('riepilogo-nota').value = 'Spalla un po\' stanca';
  await a.win.chiudiRiepilogo('home');
  const upd = a.supa._calls.filter(c => c.table === 'workouts' && c.op === 'update').pop();
  atteso('com\'è andata · scritta su workouts per id, con la nota, poi la Home', [upd && upd.payload, upd && upd.filters.map(f => f[1]), a.ST.trainRiepilogo, a.ST.page], [{ sensazione:'dura', note:'Spalla un po\' stanca' }, ['id', 'user_id'], null, 'home']);
  // senza risposta non si scrive niente
  const b = await nuovo();
  await b.salva('Panca elastico', 1, 8, 40);
  await b.win.completeSession('upperA');
  const prima = b.supa._calls.filter(c => c.table === 'workouts' && c.op === 'update').length;
  await b.win.chiudiRiepilogo('pasto');
  atteso('senza risposta · nessuna scrittura; «il pasto dopo» porta a Oggi', [b.supa._calls.filter(c => c.table === 'workouts' && c.op === 'update').length - prima, b.ST.page], [0, 'oggi']);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
