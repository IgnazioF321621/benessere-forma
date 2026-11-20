// Training 400 (20 novembre 2026): ogni seduta sta in un'ora, preparazione compresa.
//   · la durata (ZTRotazione.durataSeduta) è tarata sui tempi veri: 3 s a ripetizione più 15 per registrare, il
//     recupero dopo ogni serie (anche l'ultima dell'esercizio), 20 s di cambio; in coppia i giri alternati;
//   · schedaEntroUnOra porta la scheda di Ignazio sotto i 60 minuti con le mosse in ordine, senza togliere esercizi;
//   · senza le coppie di spinta e tirata l'Upper A perde gli isolamenti: è il motivo della mossa 2;
//   · nella seduta, finita una serie di un esercizio in coppia, la pausa breve porta al compagno.
//   node tools/banco/prova_training_400.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const { scheda400 } = require('./dati_scheda_400');
const U = 'u1', OGGI = '2026-11-23';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(104), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
(async () => {
  const t = {
    profiles:[{ id:U, first_name:'X', m2_skipped:true, unit:'lbs', train_start_date:'2026-11-16', obiettivo:'ricomposizione', tipo_allenamento:'casa', attrezzatura:['elastico'], note_salute:'Esperienza: avanzato' }],
    schede_utente:[], esercizi_catalog: [], training_logs: [], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t, { now: OGGI + 'T07:00:00', locale: { zt_v5: '1' } });
  await b.avviato;
  const W = b.win, ST = W.eval('ST'), doc = W.document, R = W.ZTRotazione;
  const min = (sec) => Math.round(sec / 60);

  // ── la durata ──
  const ex = (o) => ({ name:'E', sets:3, reps:'8-12', rest_sec:90, ...o });
  atteso('una serie: 4-6 → 33 s · 8-12 → 51 s · 12-15 → 60 s · 12-15 per lato → 105 s · tenuta 20-40 → 40 s',
    [R.lavoroSerie(ex({ reps:'4-6' })), R.lavoroSerie(ex({})), R.lavoroSerie(ex({ reps:'12-15' })), R.lavoroSerie(ex({ reps:'12-15 per lato' })), R.lavoroSerie(ex({ reps:'20-40 sec' }))], [33, 51, 60, 105, 40]);
  const base = R.TEMPO.attivazione;
  atteso('un esercizio 3 × 8-12 a 90 s: tre serie, due recuperi (dopo l\'ultima della seduta niente), un cambio', R.durataSeduta({ exercises:[ex({})] }) - base, 3 * 51 + 2 * 90 + 20);
  atteso('due esercizi: il recupero dopo l\'ultima serie del primo si conta (è il recupero verso il secondo)', R.durataSeduta({ exercises:[ex({}), ex({ name:'F' })] }) - base, 6 * 51 + 5 * 90 + 40);
  const A = ex({ name:'A', reps:'12-15', rest_sec:75, iso:true, coppia:1 }), B = ex({ name:'B', reps:'12-15', rest_sec:75, iso:true, coppia:1 });
  atteso('in coppia, due isolamenti a 75 s: pausa 30 s (fra due serie dello stesso passano 30 + 60 + 30 = 120 s)', R.pausaCoppia(A, B, {}), 30);
  atteso('in coppia: tre giri (60 + 30 + 60 + 30), meno l\'ultima pausa, un cambio solo', R.durataSeduta({ exercises:[A, B] }) - base, 3 * 180 - 30 + 20);
  const P = ex({ name:'P', reps:'4-6', rest_sec:180, coppia:2 }), T = ex({ name:'T', reps:'4-6', rest_sec:180, coppia:2 });
  atteso('in coppia, due multiarticolari a 180 s: pausa 75 s (75 + 33 + 75 = 183 s fra due serie dello stesso)', R.pausaCoppia(P, T, {}), 75);
  atteso('in coppia a 90 s (8-12): la pausa non scende sotto i 45 s dei multiarticolari', R.pausaCoppia(ex({ coppia:3 }), ex({ name:'G', coppia:3 }), {}), 45);
  atteso('in coppia con serie diverse (4 e 3): la quarta del primo si fa da sola, col suo recupero', R.durataSeduta({ exercises:[{ ...A, sets:4 }, B, ex({ name:'Z' })] }) - R.durataSeduta({ exercises:[A, B, ex({ name:'Z' })] }), 60 + 75);

  // ── la scheda di Ignazio ──
  const s1 = scheda400();
  const d1 = W.schedaEntroUnOra(s1.sessioni, { obiettivo:'ricomposizione' });
  atteso('la scheda di Ignazio, minuti prima → dopo', d1.map(d => `${d.sid} ${min(d.prima)}→${min(d.dopo)}`), ['upperA 101→59', 'lowerA 75→57', 'upperB 80→59', 'lowerB 63→60']);
  atteso('nessuna seduta resta sopra l\'ora e nessun esercizio è stato tolto', [d1.some(d => d.sopra), s1.sessioni.map(s => s.exercises.length)], [false, [10, 7, 9, 7]]);
  atteso('Upper A: tre coppie di accessori, due di spinta e tirata, poi la quarta serie di tre isolamenti', d1[0].mosse,
    ['in coppia EX046 + EX135', 'in coppia EX439 + EX677', 'in coppia EX027 + EX030', 'in coppia EX511 + EX513 (spinta e tirata)', 'in coppia EX378 + EX482 (spinta e tirata)', 'EX677 da 4 a 3 serie', 'EX030 da 4 a 3 serie', 'EX027 da 4 a 3 serie']);
  atteso('Lower A: niente coppie di multiarticolari (gambe); le coppie di accessori, la quarta serie, il recupero a 150 s', d1[1].mosse,
    ['in coppia EX021 + EX133', 'in coppia EX043 + EX215', 'EX215 da 4 a 3 serie', 'EX043 da 4 a 3 serie', 'recupero dei multiarticolari da 180 a 150 s (EX644, EX647, EX656)']);
  atteso('Lower B: i due polpacci non vanno in coppia fra loro; basta una coppia e ci si ferma', [d1[3].mosse, s1.sessioni[3].exercises.filter(e => e.coppia).map(e => e.codice)], [['in coppia EX148 + EX164'], ['EX148', 'EX164']]);
  atteso('i cardini hanno le serie e le ripetizioni di prima', s1.sessioni.flatMap(s => s.exercises.filter(e => e.cardine).map(e => `${e.sets}×${e.reps}`)).filter(x => !/^3×/.test(x)), []);
  atteso('i due di una coppia sono vicini nella seduta', s1.sessioni.every(s => s.exercises.every((e, i) => !e.coppia || (s.exercises[i - 1] || {}).coppia === e.coppia || (s.exercises[i + 1] || {}).coppia === e.coppia)), true);
  const vol = (sc) => W.volumeContoMinimi(sc.sessioni, 'ricomposizione').map(c => c.serie);
  atteso('le serie per muscolo a settimana: da 10-12 a 9-12 (la quarta serie tolta)', [Math.min(...vol(scheda400())), Math.min(...vol(s1))], [10, 9]);
  atteso('una scheda già sotto l\'ora non cambia', W.schedaEntroUnOra(s1.sessioni, { obiettivo:'ricomposizione' }).map(d => d.mosse.length), [0, 0, 0, 0]);

  const s2 = scheda400();
  const d2 = W.schedaEntroUnOra(s2.sessioni, { obiettivo:'ricomposizione', coppieMulti:false });
  atteso('senza spinta e tirata in coppia: l\'Upper A sta nell\'ora solo perdendo i quattro isolamenti', [d2[0].sopra, d2[0].mosse.filter(m => /^via /.test(m)).length, Math.min(...vol(s2))], [false, 4, 3]);

  // ── la seduta: la pausa porta al compagno ──
  t.schede_utente.push({ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda:s1 });
  ST.user = { id:U, email:'x@y' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  W.callAI = async () => '';
  W.fetchExerciseMedia = async () => ({ status:'none' });
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  W.renderTraining();
  const sess = W.getTrainingSession('upperA');
  atteso('in alto la durata nuova: Upper A «circa 60 min»', W.minutiSeduta(sess), 60);
  atteso('sulla card: «In coppia con …», con la pausa', (doc.querySelector('#excard-Piegamenti_assistiti_elastico .ex-coppia-riga') || {}).textContent, '⇄ In coppia con Rematore manubri presa inversa panca inclinata: una serie a testa, 75 s di pausa');
  const fatta = (nome, n) => { ST.trainLoggedSets[`upperA_${nome}_${n}_${W.todayKey()}`] = { reps:5 }; };
  const fine = (nome, n) => { ST.trainCountdown = null; ST.trainExecOpen = { sessionId:'upperA', exName:nome, setNum:n }; W.trainExecFinishSet(); const cd = ST.trainCountdown; ST.trainLogOpen = null; return cd ? [cd.exName, cd.total, !!cd.coppia] : null; };
  const PIE = 'Piegamenti assistiti elastico', REM = 'Rematore manubri presa inversa panca inclinata';
  atteso('finita la serie 1 dei piegamenti: 75 s e tocca al rematore', fine(PIE, 1), [REM, 75, true]);
  W.renderTraining();
  atteso('il foglio del recupero dice «In coppia · pausa» e «ORA TOCCA A · SERIE 1»', [/In coppia · pausa/.test(doc.querySelector('.rest-hero-cd-label').textContent), /ORA TOCCA A · SERIE 1/.test(doc.querySelector('.rest-card-eyebrow').textContent)], [true, true]);
  fatta(PIE, 1);
  atteso('finita la serie 1 del rematore: 75 s e si torna ai piegamenti', fine(REM, 1), [PIE, 75, true]);
  fatta(REM, 1); fatta(PIE, 2); fatta(REM, 2); fatta(PIE, 3);
  atteso('finita l\'ultima del rematore (i piegamenti sono finiti): nessuna pausa di coppia', fine(REM, 3), null);
  const DIP = 'Dip macchina seduto';
  atteso('un esercizio tornato da solo: il recupero di sempre, verso la sua serie dopo', (() => { sess.exercises.forEach(e => { if(e.coppia === W.findExercise(DIP, 'upperA').coppia) delete e.coppia; }); return fine(DIP, 1); })(), [DIP, 180, false]);

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
