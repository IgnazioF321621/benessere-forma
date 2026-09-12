// Quadro settimanale — Lavoro C: storico in weekly_pictures.
// Backfill fino a 8 settimane, niente doppioni alla riapertura, valori salvati
// uguali al ricalcolo, settimana corrente mai salvata, lettura dalla tabella per
// le settimane passate, e tabella assente che non rompe niente.
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(52), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const senzaOra = (p) => { const c = JSON.parse(JSON.stringify(p)); delete c.meta.computed_at; return c; };

function fixture(win, settimaneProfilo){
  const cur = win.wpMonday();
  const d = (n) => win.wpAddDays(cur, n);
  const oggi = win.todayKey();
  const tables = {
    weight_logs: [], body_logs: [], body_measurements: [], body_checks: [], blood_tests: [], training_logs: [],
    meals: [], workouts: [], weekly_pictures: [],
  };
  for(let g = -84; g <= 6; g++){
    if(d(g) > oggi) break;
    if(g % 2 === 0) tables.weight_logs.push({ user_id:U, id:'wl'+g, date:d(g), weight_kg: 72 + g * 0.02 });
    tables.meals.push({ user_id:U, id:'m'+g, date:d(g), kcal: 1500 + (g % 5) * 100, protein: 90 });
    if([0,1,3,4].includes(((g % 7) + 7) % 7)) tables.workouts.push({ user_id:U, id:'w'+g, date:d(g), session_type:['upperA','lowerA','x','upperB','lowerB'][((g % 7) + 7) % 7], completed:true });
    tables.training_logs.push({ user_id:U, id:'t'+g, date:d(g), session_id:'upperA', rir_actual: 2 });
  }
  tables.body_checks.push({ user_id:U, id:'c1', status:'completed', created_at: new Date(d(-50) + 'T08:00:00').toISOString() });
  tables.body_measurements.push({ user_id:U, id:'bm1', check_id:'c1', created_at: new Date(d(-50) + 'T08:00:00').toISOString(), waist_cm: 88 });
  const profile = { id:U, target_kcal:2200, giorni_allenamento:4, goal_weight_kg:70, train_start_date: d(-70),
    created_at: new Date(d(-7 * settimaneProfilo) + 'T09:00:00').toISOString() };
  return { tables, profile, cur, d };
}
function avvia(tables, profile){
  const b = boot(tables);
  const ST = b.win.eval('ST');
  ST.user = { id:U }; ST.profile = profile; ST.TARGET = { kcal: profile.target_kcal }; ST.page = 'home';
  return b;
}

(async () => {
  // 1. prima apertura: 8 settimane chiuse salvate, la corrente no
  const { win: w0 } = boot({});
  const { tables, profile, cur, d } = fixture(w0, 20);
  let { win } = avvia(tables, profile);
  await win.weeklyPicturesBackfill();
  const settimane = tables.weekly_pictures.map(r => r.week_start).sort();
  atteso('prima apertura · righe salvate', tables.weekly_pictures.length, 8);
  atteso('prima apertura · settimane', settimane, [8,7,6,5,4,3,2,1].map(k => d(-7 * k)));
  atteso('settimana corrente mai salvata', settimane.includes(cur), false);

  // 2. valori salvati = ricalcolo dal vivo (tranne computed_at)
  let uguali = 0;
  for(const r of tables.weekly_pictures){
    const vivo = await win.buildWeeklyPicture(r.week_start);
    if(JSON.stringify(senzaOra(vivo)) === JSON.stringify(senzaOra(r.picture))) uguali++;
  }
  atteso('salvato = ricalcolo, settimane uguali', uguali, 8);

  // 3. riapertura (sessione nuova, stessa tabella): nessun doppione
  ({ win } = avvia(tables, profile));
  await win.weeklyPicturesBackfill();
  await win.weeklyPicturesBackfill();                         // due volte nella stessa sessione
  atteso('riapertura · righe', tables.weekly_pictures.length, 8);

  // 4. la settimana passata si legge dalla tabella, non si ricalcola
  const scorsa = d(-7);
  tables.weekly_pictures.find(r => r.week_start === scorsa).picture.meta.marcatore = 'dalla-tabella';
  ({ win } = avvia(tables, profile));
  const letta = await win.loadWeeklyPicture(scorsa);
  atteso('settimana scorsa letta dalla tabella', letta.meta.marcatore, 'dalla-tabella');
  const corrente = await win.loadWeeklyPicture(cur, { force:true });
  atteso('settimana corrente ricalcolata', [corrente.meta.week_start, corrente.meta.is_closed], [cur, false]);

  // 5. profilo nato 3 settimane fa: si salvano solo le settimane da allora
  const t2 = fixture(w0, 3);
  ({ win } = avvia(t2.tables, t2.profile));
  await win.weeklyPicturesBackfill();
  atteso('profilo recente · righe', t2.tables.weekly_pictures.length, 3);

  // 6. una settimana saltata dal backfill (oltre le 8) si salva quando la si apre
  ({ win } = avvia(tables, profile));
  await win.loadWeeklyPicture(d(-7 * 10));
  await new Promise(r => setTimeout(r, 20));
  atteso('settimana -10 aperta → salvata', tables.weekly_pictures.length, 9);

  // 7. tabella assente (migrazione non eseguita): niente eccezioni, il quadro si calcola lo stesso
  const t3 = fixture(w0, 20);
  const b3 = avvia(t3.tables, t3.profile);
  const supa = b3.win.eval('supa');
  const fromVero = supa.from;
  supa.from = (t) => t === 'weekly_pictures'
    ? new Proxy({}, { get: () => () => { const q = { eq:()=>q, in:()=>q, select:()=>q, upsert:()=>q, maybeSingle:()=>Promise.resolve({ data:null, error:{ code:'PGRST205', message:"Could not find the table 'public.weekly_pictures'" } }), then:(res)=>Promise.resolve({ data:null, error:{ code:'PGRST205', message:"Could not find the table 'public.weekly_pictures'" } }).then(res) }; return q; } })
    : fromVero(t);
  await b3.win.weeklyPicturesBackfill();
  const p3 = await b3.win.loadWeeklyPicture(t3.d(-7));
  atteso('tabella assente · quadro calcolato comunque', !!(p3 && p3.meta.week_start === t3.d(-7)), true);
  atteso('tabella assente · errori console (non avvisi)', b3.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
