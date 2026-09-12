// Quadro settimanale — Lavoro A: computeWeeklyPicture su casi costruiti a mano.
// Nessuna rete: il calcolo è separato dalla lettura proprio per poterlo provare così.
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');

const { win } = boot({});
const ST = win.eval('ST');
ST.user = { id:'u1' };
ST.profile = { goal_weight_kg:68, target_kcal:2000, giorni_allenamento:4, train_start_date:'2026-08-24' };

const WS = '2026-09-07';                       // lunedì
const vuoto = { weightLogs:[], bodyLogs:[], measurements:[], checks:[], meals:[], sets:[], workouts:[], blood:[], errors:[] };
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(46), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const calc = (raw, today) => win.computeWeeklyPicture({ ...vuoto, ...raw }, WS, { today: today || '2026-09-12', nowTs: new Date((today || '2026-09-12') + 'T12:00:00').getTime(), profile: ST.profile, target:{ kcal:2000, protein:150 } });

// 1. settimana vuota: medie null, conteggi 0, niente zeri inventati
let p = calc({});
atteso('vuota · peso media', p.weight.weight_avg, null);
atteso('vuota · pesate', p.weight.weight_n, 0);
atteso('vuota · kcal media', p.nutrition.kcal_avg, null);
atteso('vuota · aderenza', p.nutrition.adherence_kcal, null);
atteso('vuota · parziale', p.nutrition.partial, false);
atteso('vuota · RIR', p.training.avg_rir, null);
atteso('vuota · corpo', p.body.last_check_date, null);
atteso('vuota · completezza', p.meta.completeness, 0);

// 2. peso: 4 settimane in calo di 0,5 kg/sett, fonti con priorità weight_logs > body_logs
p = calc({
  weightLogs: [
    { date:'2026-08-17', weight_kg:71.5 },
    { date:'2026-08-24', weight_kg:71.0 },
    { date:'2026-08-31', weight_kg:70.5 },
    { date:'2026-09-08', weight_kg:70.0 }, { date:'2026-09-10', weight_kg:70.2 },
  ],
  bodyLogs: [ { date:'2026-09-10', weight_kg:99 } ],          // stesso giorno: vince weight_logs
});
atteso('peso · media settimana', p.weight.weight_avg, 70.1);
atteso('peso · pesate', p.weight.weight_n, 2);
atteso('peso · delta precedente', p.weight.weight_delta_prev, -0.4);
atteso('peso · tendenza kg/sett', p.weight.weight_trend_4w, -0.5);
atteso('peso · obiettivo', p.weight.weight_target, 68);

// 3. tendenza con 2 settimane sole → null
p = calc({ weightLogs: [ { date:'2026-09-01', weight_kg:70.5 }, { date:'2026-09-08', weight_kg:70 } ] });
atteso('peso · tendenza con 2 settimane', p.weight.weight_trend_4w, null);

// 4. nutrizione parziale: 3 giorni su 4 sotto il 75% di 2000
p = calc({ meals: [
  { date:'2026-09-07', kcal:900,  protein:50 },
  { date:'2026-09-08', kcal:1000, protein:60 },
  { date:'2026-09-09', kcal:1400, protein:70 },
  { date:'2026-09-10', kcal:1100, protein:40 }, { date:'2026-09-10', kcal:950, protein:40 },
]});
atteso('nutrizione · giorni', p.nutrition.days_logged, 4);
atteso('nutrizione · kcal media', p.nutrition.kcal_avg, 1338);
atteso('nutrizione · proteine medie', p.nutrition.protein_avg, 65);
atteso('nutrizione · aderenza ±10%', p.nutrition.adherence_kcal, 0.25);
atteso('nutrizione · parziale', p.nutrition.partial, true);

// 5. allenamento: settimana chiusa, 3 su 4, un recupero, un infortunio
p = calc({
  workouts: [
    { date:'2026-08-24', session_type:'upperA' }, { date:'2026-08-25', session_type:'lowerA' }, { date:'2026-08-27', session_type:'upperB' }, { date:'2026-08-28', session_type:'lowerB' },
    { date:'2026-09-07', session_type:'upperA' }, { date:'2026-09-08', session_type:'lowerA' }, { date:'2026-09-09', session_type:'recoveryUpper' },
    { date:'2026-09-10', session_type:'upperB' }, { date:'2026-09-11', session_type:'rest_injury' },
  ],
  sets: [ { date:'2026-09-07', rir_actual:2 }, { date:'2026-09-07', rir_actual:1 }, { date:'2026-09-08', rir_actual:null } ],
}, '2026-09-20');
atteso('training · fatte / previste / saltate', [p.training.sessions_done, p.training.sessions_planned, p.training.sessions_missed], [3, 4, 1]);
atteso('training · recuperi', p.training.recovery_done, 1);
atteso('training · serie / RIR', [p.training.volume_sets, p.training.avg_rir], [3, 1.5]);
atteso('training · settimana ciclo', [p.training.block_week, p.training.is_deload], [2, false]);
atteso('training · infortunio', [p.training.injury_days, p.training.injury_active], [1, true]);

// 6. settimana in corso: le saltate non si contano
p = calc({ workouts: [ { date:'2026-09-07', session_type:'upperA' } ] }, '2026-09-08');
atteso('training · in corso: saltate', p.training.sessions_missed, null);

// 7. corpo: ultimo check completato e differenze; il check in corso non conta
p = calc({
  checks: [
    { id:'c1', status:'completed',   created_at:'2026-07-04T05:00:00Z' },
    { id:'c2', status:'completed',   created_at:'2026-08-02T05:00:00Z' },
    { id:'c3', status:'in_progress', created_at:'2026-09-09T05:00:00Z' },
  ],
  measurements: [
    { check_id:'c1', created_at:'2026-07-04T05:00:00Z', waist_cm:89, hips_cm:88 },
    { check_id:'c2', created_at:'2026-08-02T05:00:00Z', waist_cm:87, hips_cm:92, chest_cm:95 },
  ],
}, '2026-09-12');
atteso('corpo · ultimo check', p.body.last_check_date, '2026-08-02');
atteso('corpo · vita', p.body.last_measurements.waist_cm, { value:87, delta:-2 });
atteso('corpo · petto senza precedente', p.body.last_measurements.chest_cm, { value:95, delta:null });
atteso('corpo · giorni dal check', p.body.days_since_check, 41);

// 8. check scaduto: blocco finito da tempo, ultimo check 60 giorni prima
ST.profile.train_start_date = '2026-06-01';
p = calc({ checks: [ { id:'c1', status:'completed', created_at:'2026-07-10T05:00:00Z' } ], measurements: [] }, '2026-09-12');
atteso('corpo · check da fare', p.body.check_due, true);
ST.profile.train_start_date = '2026-08-24';

// 9. lettura fallita: blocco null e errore dichiarato
p = calc({ meals: null, errors:['meals'] });
atteso('errore · nutrizione null', p.nutrition, null);
atteso('errore · dichiarato', p.meta.errors, ['meals']);

// 10. esami
p = calc({ blood: [ { test_date:'2026-03-01' }, { test_date:'2026-09-20' } ] }, '2026-09-12');
atteso('esami · futuri esclusi', [p.blood.test_count, p.blood.last_test_date], [1, '2026-03-01']);

console.log(ko ? `\n${ko} KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
