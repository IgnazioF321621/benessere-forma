// Fondamenta 070/080/090 — una tabella sola per le serie (training_logs), il codice al posto del nome
// (esercizi e integratori), scrivi-o-aggiorna per allenamenti e misure.
//   node tools/banco/prova_tabella_unica.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-03';
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Upper', rir:2, exercises:[
  { codice:'EX510', name:'Trazioni sbarra presa neutra VECCHIO', sets:4, reps:'6-10' },   // rinominato a catalogo
  { codice:'EX449', name:'Lat machine V-bar', sets:3, reps:'8-12' },
] } ] };
const catalogo = [ { codice:'EX510', nome:'Trazioni sbarra presa neutra' }, { codice:'EX449', nome:'Lat machine V-bar' } ];
const NUOVO = 'Trazioni sbarra presa neutra';
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-08-24' }],
    schede_utente:[{ user_id:U, attiva:true, blocco_n:3, scheda }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    // storico: una riga col nome vecchio e il codice (la migrazione l'ha messo), una senza codice col nome di oggi
    training_logs:[
      { id:'t1', user_id:U, session_id:'upperA', date:'2026-09-05', exercise_name:'Trazioni sbarra presa neutra VECCHIO', exercise_code:'EX510', set_number:3, reps:7, resistance:null, band_color:'Rossa', rir_actual:1 },
      { id:'t2', user_id:U, session_id:'upperA', date:'2026-09-01', exercise_name:'Lat machine V-bar', exercise_code:null, set_number:3, reps:10, resistance:'50', band_color:null, rir_actual:2 },
    ],
    training_notes:[ { id:'n1', user_id:U, exercise_name:'Trazioni sbarra presa neutra VECCHIO', exercise_code:'EX510', date:OGGI, note:'presa larga', updated_at:OGGI + 'T08:00:00Z' },
                     { id:'n0', user_id:U, exercise_name:'Trazioni sbarra presa neutra VECCHIO', exercise_code:'EX510', date:'2026-09-05', note:'vecchia', updated_at:'2026-09-05T08:00:00Z' } ],
    workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[{ id:'s1', user_id:U, name:'Omega 3 NUOVO', slot:'08:00', sort_order:1, active:true }],
    nutrilite_catalog:[],
    supplements_log:[ { id:'l1', user_id:U, date:OGGI, slot:'08:00', supplement_name:'Omega 3', supplement_id:'s1', is_extra:false } ],   // nome vecchio, id giusto
  };
}
async function nuovo(opts){
  const t = fixture();
  const b = boot(t, { now:OGGI + 'T12:00:00', ...(opts || {}) });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  await b.win.loadSupps();
  const scritture = (tab) => b.supa._calls.filter(c => c.op !== 'select' && c.table !== 'app_errors' && (!tab || c.table === tab));
  const chiamate = (tab) => b.supa._calls.filter(c => c.table === tab);
  const coda = () => JSON.parse(b.win.localStorage.getItem('zt_coda_' + U) || '[]');
  const input = (id, v) => { let el = b.win.document.getElementById(id); if(!el){ el = b.win.document.createElement('input'); el.id = id; b.win.document.body.appendChild(el); } el.value = v; };
  return { ...b, ST, t, scritture, chiamate, coda, input };
}
(async () => {
  // 1) salvare una serie: una riga sola, in training_logs, con l'id del telefono e il codice; niente workout_sets
  {
    const a = await nuovo();
    const sess = a.win.getTrainingSession('upperA');
    atteso('la scheda riallinea il nome al catalogo', sess.exercises[0].name, NUOVO);
    a.input('tl-reps', '8'); a.input('tl-rir', '2');
    a.ST.trainSession = 'upperA'; a.ST.trainLogOpen = { sessionId:'upperA', exName:NUOVO, setNum:1 }; a.ST.trainLogBandColor = 'Rossa';
    await a.win.saveTrainingSet();
    const ins = a.scritture();
    const riga = ins[0] && ins[0].payload;
    atteso('una scrittura sola: training_logs insert', ins.map(c => c.table + ':' + c.op), ['training_logs:insert']);
    atteso('la riga ha id del telefono, codice e nome', [/^[0-9a-f-]{36}$/.test(riga.id), riga.exercise_code, riga.exercise_name, riga.set_number, riga.reps, riga.band_color], [true, 'EX510', NUOVO, 1, 8, 'Rossa']);
    const k = 'upperA_' + NUOVO + '_1_' + OGGI;
    atteso('in memoria la serie conosce il suo id', a.ST.trainLoggedSets[k] && a.ST.trainLoggedSets[k].setId === riga.id, true);
    atteso('workout_sets mai interrogata', a.chiamate('workout_sets').length, 0);
    // modifica dalla sessione: un update per id
    a.input('el-reps', '9'); a.input('el-resist', 'Nera');
    await a.win.confirmEditLog(k);
    const upd = a.scritture('training_logs').filter(c => c.op === 'update');
    atteso('modifica · un update per id, niente seconda tabella', [upd.length, upd[0].filters.map(f => f[1]), upd[0].payload.reps, upd[0].payload.band_color], [1, ['id', 'user_id'], 9, 'Nera']);
    // cancellazione dal dettaglio del giorno: un delete per id
    a.ST.trainDayLogs = [{ ...riga, reps:9 }];
    a.ST.trainDeleteSetConfirm = { id: riga.id, label:'x' };
    await a.win.deleteSetConfirmed();
    const del = a.scritture('training_logs').filter(c => c.op === 'delete');
    atteso('cancellazione · un delete per id', [del.length, del[0].filters.map(f => f[1])], [1, ['id', 'user_id']]);
    atteso('ancora nessuna chiamata a workout_sets', a.chiamate('workout_sets').length, 0);
  }
  // 2) senza rete la serie va nella coda unica e parte da sola
  {
    const a = await nuovo();
    let inLinea = true;
    Object.defineProperty(a.win.navigator, 'onLine', { get: () => inLinea, configurable:true });
    inLinea = false;
    a.input('tl-reps', '6'); a.input('tl-rir', '1');
    a.ST.trainSession = 'upperA'; a.ST.trainLogOpen = { sessionId:'upperA', exName:'Lat machine V-bar', setNum:1 }; a.ST.trainLogResist = 50;
    await a.win.saveTrainingSet();
    atteso('senza rete · nessuna scrittura, 1 in coda, serie in memoria', [a.scritture().length, a.coda().length, !!a.ST.trainLoggedSets['upperA_Lat machine V-bar_1_' + OGGI]], [0, 1, true]);
    atteso('senza rete · la coda porta il codice', a.coda()[0].op.righe.exercise_code, 'EX449');
    inLinea = true;
    await a.win.svuotaCoda();
    atteso('rete tornata · la serie e\' in tabella', a.t.training_logs.filter(r => r.exercise_code === 'EX449' && r.date === OGGI).length, 1);
  }
  // 3) lo storico si trova per codice anche col nome vecchio, e per nome dove il codice manca
  {
    const a = await nuovo();
    await a.win.loadLastLoggedSets('upperA');
    const m = a.ST.lastLoggedSets;
    atteso('ultima volta · per codice (riga col nome vecchio)', m[NUOVO] && m[NUOVO].date, '2026-09-05');
    atteso('ultima volta · per nome (riga senza codice)', m['Lat machine V-bar'] && m['Lat machine V-bar'].date, '2026-09-01');
    // Progressione: per codice e per nome, unite
    a.ST.trainSession = 'upperA';
    await a.win.loadTrainingLogs(NUOVO);
    atteso('progressione · trova la riga col nome vecchio tramite il codice', (a.ST.trainProgLogs || []).map(l => l.id), ['t1']);
    await a.win.loadAllExerciseNamesWithLast();
    atteso('elenco esercizi · un nome solo per codice, quello di oggi', a.ST.allExerciseNamesCache, ['Lat machine V-bar', NUOVO]);
    await a.win.openDayDetail('2026-09-05', NUOVO);
    atteso('dettaglio del giorno · filtro per codice', (a.ST.trainDayLogs || []).map(l => l.id), ['t1']);
  }
  // 4) note: lette per codice, scritte col codice
  {
    const a = await nuovo();
    a.ST.trainSession = 'upperA';
    await a.win.loadTodayNotes('upperA');
    atteso('nota di oggi · legata all\'esercizio di oggi tramite il codice', a.ST.trainNotes[NUOVO] && a.ST.trainNotes[NUOVO].note, 'presa larga');
    atteso('note passate · contate per codice', a.ST.trainNoteHistoryCount[NUOVO], 1);
    await a.win.loadNoteHistory(NUOVO);
    atteso('storico note · trovato col codice', (a.ST.trainNotesHistory[NUOVO] || []).map(n => n.id), ['n0']);
    a.ST.trainNoteDraft = 'presa media';
    await a.win.saveTrainingNote(NUOVO);
    const up = a.scritture('training_notes').find(c => c.op === 'upsert');
    atteso('nota salvata · porta codice e nome', [up && up.payload.exercise_code, up && up.payload.exercise_name, up && up.upsertOpts.onConflict], ['EX510', NUOVO, 'user_id,exercise_name,date']);
  }
  // 5) integratori: la riga si lega al prodotto per id anche col nome vecchio; togliere cerca per id o nome
  {
    const a = await nuovo();
    await a.win.loadAllDays();
    atteso('integratore · preso oggi, legato per supplement_id col nome vecchio', a.win.getDay(OGGI).suppsTaken, ['s1']);
    atteso('integratore · il nome mostrato e\' quello di oggi', a.win.getDay(OGGI).rawSuppLogs.map(r => r.name), ['Omega 3 NUOVO']);
    await a.win.loadTodaySuppLog();
    atteso('integratori di oggi · stessa regola', a.win.getDay(OGGI).suppsTaken, ['s1']);
    await a.win.toggleSuppTaken('s1', 'Omega 3 NUOVO');   // tolgo
    const del = a.scritture('supplements_log').filter(c => c.op === 'delete')[0];
    atteso('togliere · un delete solo, per id del prodotto o per nome', del.filters.map(f => f[0] === 'or' ? f[2] : f[1]), ['user_id', 'date', 'supplement_id.eq."s1",supplement_name.eq."Omega 3 NUOVO"']);
    await a.win.toggleSuppTaken('s1', 'Omega 3 NUOVO');   // rimetto
    const ins = a.scritture('supplements_log').filter(c => c.op === 'insert')[0];
    atteso('mettere · la riga porta supplement_id e nome', [ins.payload.supplement_id, ins.payload.supplement_name], ['s1', 'Omega 3 NUOVO']);
    atteso('in memoria · preso', a.win.getDay(OGGI).suppsTaken, ['s1']);
  }
  // 6) allenamenti e misure: scrivi o aggiorna sopra i vincoli, mai due righe
  {
    const a = await nuovo();
    const w1 = await a.win.saveWorkoutRecord('upperA');
    a.ST.trainCompletedToday = {};
    const w2 = await a.win.saveWorkoutRecord('upperA');
    const ups = a.scritture('workouts').filter(c => c.op === 'upsert');
    atteso('allenamento · upsert su (persona, giorno, sessione), una riga sola, stesso id', [ups.length >= 1, ups[0].upsertOpts.onConflict, ups[0].upsertOpts.ignoreDuplicates, a.t.workouts.length, w1 === w2 && !!w1], [true, 'user_id,date,session_type', true, 1, true]);
    a.input('bl-weight', '72.4'); a.input('bl-waist', '81');
    await a.win.saveBodyLog();
    a.input('bl-weight', '72.1');
    await a.win.saveBodyLog();
    const bl = a.scritture('body_logs');
    atteso('misure · upsert su (persona, giorno), una riga sola aggiornata', [bl.map(c => c.op), bl[0].upsertOpts.onConflict, a.t.body_logs.length, a.t.body_logs[0].weight_kg, a.t.body_logs[0].waist_cm], [['upsert', 'upsert'], 'user_id,date', 1, 72.1, 81]);
  }
  // 7) la vecchia coda delle serie (WS-QUEUE) sparisce all'avvio
  {
    const t = fixture(); t.__sessione = { user:{ id:U, email:'ignazio.f@me.com' } };
    const b = boot(t, { now:OGGI + 'T12:00:00', locale:{ ['zt_ws_pending_' + U]: JSON.stringify([{ op:'insert', payload:{}, key:'x', ts:1 }]) } });
    await b.avviato; await attendi(200);
    atteso('vecchia coda · tolta all\'avvio', b.win.localStorage.getItem('zt_ws_pending_' + U), null);
  }
  // 8) nel codice: nessuna lettura o scrittura di workout_sets, niente WS-QUEUE
  {
    const radice = path.join(__dirname, '..', '..');
    const file = ['zona-tracker.html', 'app/comune.js', 'app/training.js', 'app/training_generatore.js', 'app/home.js', 'app/nutrition.js', 'app/body.js', 'shared/quadro.js', 'shared/nutrizione.js'];
    const trovati = [];
    file.forEach(f => { const s = fs.readFileSync(path.join(radice, f), 'utf8'); if(/from\('workout_sets'\)|wsWrite\(|_wsFlushQueue|_wsExec/.test(s)) trovati.push(f); });
    atteso('codice · nessuna chiamata a workout_sets, niente WS-QUEUE', trovati, []);
  }
  console.log(ko ? ko + ' KO' : 'tutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
