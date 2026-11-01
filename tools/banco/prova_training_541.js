// Training 541 (1 novembre 2026): le sedute nel Calendario dell'iPhone, complete. Nell'evento gli esercizi, la durata
// stimata della seduta e un indirizzo che apre l'app su Training. La regola della durata sta in shared/rotazione.js
// (prova_rotazione.js) e la usa anche il Worker (worker/test/prova_calendario.mjs); qui l'app:
//   · le regole spostate in shared rispondono come prima (parseRepsRange, _contaPerLato, il riscaldamento, il Tabata
//     del giorno, i tempi del generatore 30 · 300 · 300 · 60);
//   · «Prossimo allenamento» nel tab Training dice «circa N min», lo stesso numero del Calendario;
//   · ?apri=training apre l'app su Training e toglie il parametro dall'indirizzo; senza, o con altro, la Home.
//   node tools/banco/prova_training_541.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const PRIVACY_OK = { zt_privacy_ok: /const PRIVACY_VERSIONE = '([^']+)'/.exec(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'app', 'comune.js'), 'utf8'))[1] };
const U = 'u1', OGGI = '2026-10-28';   // mercoledì
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const VERE = [['2026-10-05','upperA'], ['2026-10-07','lowerA'], ['2026-10-08','recoveryUpper'], ['2026-10-09','upperB'], ['2026-10-10','lowerB'],
  ['2026-10-12','upperA'], ['2026-10-13','lowerA'], ['2026-10-20','upperA'], ['2026-10-22','lowerA'], ['2026-10-23','upperB'], ['2026-10-25','rest'],
  ['2026-10-26','upperA'], ['2026-10-27','lowerA']];
const profilo = (extra) => ({ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', obiettivo:'ricomposizione', giorni_allenamento:4,
  usa_training:true, weight_kg:72, train_giorni:[1, 2, 3, 4, 5], train_orario:'07:30', ...(extra || {}) });
const tabelle = (p) => ({
  profiles:[p], schede_utente:[], esercizi_catalog:[],
  workouts: VERE.map(([date, s]) => ({ id:'w' + date + s, user_id:U, date, session_type:s, completed:true, created_at: `${date}T07:00:00+00:00` })),
  training_logs:[], training_notes:[], body_logs:[], weight_logs:[], body_measurements:[], body_checks:[], meals:[], meal_items:[], fasting_days:[],
  daily_log:[], app_errors:[], supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[], weekly_pictures:[], blood_tests:[], body_check_ai:[],
});

async function nuovo(extra){
  const t = tabelle(profilo(extra));
  const b = boot(t, { now: OGGI + 'T12:30:00' });
  await b.avviato;
  const W = b.win, ST = W.eval('ST'), d = W.document;
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  W.applyProfile(ST.profile);
  await W.computeTrainHomeData();
  await W.loadTrainingAllCompleted({ skipRender:true });
  await W.loadSessionLastCompletion({ skipRender:true });
  W.callAI = async () => '';
  const programma = () => { ST.page = 'training'; ST.trainTab = 'piano'; ST.trainSession = null; W.renderTraining(); return d.getElementById('page-training'); };
  return { ...b, W, ST, d, programma };
}

// La pagina che parte da sola con una persona già entrata e la copia locale, a un certo indirizzo.
function avvio(url){
  const p = profilo();
  const t = { ...tabelle(p), __sessione: { user:{ id:U, email:'ignazio.f@me.com' } } };
  const b = boot(t, { url, now: OGGI + 'T12:30:00', locale: { zt_cache: { profile: p, db:{ days:{} }, TARGET:{ kcal:1900, protein:143, carbs:190, fat:63 } }, ...PRIVACY_OK } });
  const d = b.win.document;
  return new Promise(res => {
    const t0 = Date.now();
    const giro = setInterval(() => {
      if(d.getElementById('app').classList.contains('visible') || Date.now() - t0 > 4000){
        clearInterval(giro);
        setTimeout(() => res({ pagina: b.win.eval('ST').page, indirizzo: b.win.location.search, errori: b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length }), 50);
      }
    }, 5);
  });
}

(async () => {
  // ── 1 · le regole spostate in shared rispondono come prima ──
  {
    const a = await nuovo();
    const W = a.W, R = W.ZTRotazione;
    const reps = ['4-6', '8-12 per lato', '20-40 sec', '30 sec per lato', '10 min', '', null, 'max'];
    atteso('1 · parseRepsRange nell\'app è la regola di shared', reps.every(r => JSON.stringify(W.parseRepsRange(r)) === JSON.stringify(R.leggiReps(r))), true);
    atteso('1 · i tempi del generatore non cambiano: 30 · 300 · 300 · 60, e restano 2 e 6 esercizi', JSON.parse(W.eval('JSON.stringify(_TRAIN_GEN_TIME_BUDGET)')),
      { set_execution_sec:30, warmup_sec:300, finisher_sec:300, buffer_sec:60, min_exercises_per_session:2, max_exercises_per_session:6 });
    atteso('1 · il riscaldamento: 60 s a voce, 10 fra le voci, 30 per lato + 5 (come prima)', [W.eval('WARMUP_WORK_SEC'), W.eval('WARMUP_REST_SEC'), W.eval('WARMUP_ISO_SIDE_SEC'), W.eval('WARMUP_ISO_PAUSE_SEC'),
      W._warmupDurataTotale([{ reps:'15-20' }, { reps:'30 sec' }, { reps:'30 sec per lato' }])], [60, 10, 30, 5, 60 + 30 + 65 + 20]);
    a.ST.catalogInfoByCodice = new W.Map([['EXA', { unilaterale:'si' }], ['EXB', { unilaterale:'alternato' }]]);
    atteso('1 · _contaPerLato con il catalogo dell\'app: si, alternato a ripetizioni, alternato a tempo, niente', [W._contaPerLato({ codice:'EXA', reps:'8-12' }), W._contaPerLato({ codice:'EXB', reps:'12-15' }), W._contaPerLato({ codice:'EXB', reps:'20-30 sec', isTimed:true }), W._contaPerLato({ codice:'EXC', reps:'8-12' })], [true, true, false, false]);
    a.ST.profile.tabata = 'giorni'; a.ST.profile.tabata_giorni = [4];
    atteso('1 · il Tabata del giorno: giovedì sì, mercoledì no; «coda» sempre; «a parte» mai', [W.tabataInCoda('2026-10-29'), W.tabataInCoda('2026-10-28'), (a.ST.profile.tabata = 'coda', W.tabataInCoda('2026-10-28')), (a.ST.profile.tabata = 'a_parte', W.tabataInCoda('2026-10-29'))], [true, false, true, false]);
    a.ST.profile.tabata = null;
  }
  // ── 2 · «Prossimo allenamento» dice la durata stimata, la stessa del Calendario ──
  {
    const a = await nuovo();
    const pg = a.programma();
    const sc = [...pg.querySelectorAll('[onclick]')].find(el => /PROSSIMO ALLENAMENTO/.test(el.textContent));
    const testo = sc ? sc.textContent.replace(/\s+/g, ' ').trim() : '';
    const sess = a.W.getTrainingSession('upperB');
    const R = a.W.ZTRotazione;
    const min = R.minutiSeduta(R.durataSeduta(sess, { unilaterale: ex => a.W._exInfoCatalogo(ex).unilaterale, tabata: false }));
    atteso('2 · mercoledì scelto, dopo Lower A: Upper B, «RIR · esercizi · circa N min»', [sc && sc.getAttribute('onclick'), new RegExp(`RIR \\d · \\d+ esercizi · circa ${min} min`).test(testo), min >= 30 && min <= 90], ["openTrainingSession('upperB')", true, true]);
    atteso('2 · minutiSeduta dell\'app = la regola di shared', a.W.minutiSeduta(sess), min);
  }
  // ── 3 · ?apri=training ──
  {
    const a = await nuovo();
    a.W.history.replaceState(null, '', '/benessere-forma/zona-tracker.html?apri=training&v=1#x');
    const p1 = a.W.paginaDiAvvio();
    atteso('3 · ?apri=training → Training, e il parametro esce dall\'indirizzo (gli altri restano)', [p1, a.W.location.search, a.W.location.hash], ['training', '?v=1', '#x']);
    a.W.history.replaceState(null, '', '/benessere-forma/zona-tracker.html?apri=boh');
    atteso('3 · ?apri=altro → Home, e il parametro esce lo stesso; senza parametro Home', [a.W.paginaDiAvvio(), a.W.location.search, a.W.paginaDiAvvio()], ['home', '', 'home']);
    const r1 = await avvio('https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?apri=training');
    atteso('3 · all\'avvio vero, con ?apri=training: l\'app si apre su Training, l\'indirizzo è pulito, zero errori', [r1.pagina, r1.indirizzo, r1.errori], ['training', '', 0]);
    const r2 = await avvio('https://ignaziof321621.github.io/benessere-forma/zona-tracker.html');
    atteso('3 · all\'avvio vero senza parametro: la Home, come prima', [r2.pagina, r2.errori], ['home', 0]);
    atteso('3 · l\'indirizzo del Calendario è quello che l\'app capisce', a.W.ZTRotazione.URL_TRAINING, 'https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?apri=training');
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})();
