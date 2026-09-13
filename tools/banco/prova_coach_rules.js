// Fase 3 — Lavoro D: le regole di Pirsi (shared/coach_rules.js) su scenari costruiti a mano.
// Nessuna rete e nessun jsdom: il modulo è puro, si carica con require.
//   node tools/banco/prova_coach_rules.js
const R = require('../../shared/coach_rules.js');
let ko = 0, n = 0;
const atteso = (nome, got, exp) => {
  n++;
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const WS = '2026-09-07';
const add = (key, d) => { const x = new Date(key + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
// Un quadro di settimana k (0 = la chiusa, 1 = quella prima…) con valori "in ordine" sovrascrivibili
function quadro(k, o = {}){
  const ws = add(WS, -7 * k);
  const all = [0,1,2,3,4,5,6].map(i => add(ws, i));
  return {
    weight: o.weight === null ? null : { weight_avg: 75, weight_n: 4, weight_last: 75, weight_trend_4w: null, weight_target: 70, ...(o.weight || {}) },
    nutrition: o.nutrition === null ? null : { kcal_target: 2200, protein_target: 150, kcal_avg: 2150, protein_avg: 150, supp_kcal_avg: 100, supp_protein_avg: 20,
      days_logged: 7, logged_dates: all, adherence_kcal: 0.86, days_partial: 0, partial: false, days_under_75: 0, ...(o.nutrition || {}) },
    training: o.training === null ? null : { sessions_planned: 4, sessions_done: 4, sessions_missed: 0, recovery_done: 1, block_week: 2, is_deload: false, volume_sets: 60, avg_rir: 1.5, injury_days: 0, injury_active: false, ...(o.training || {}) },
    body: o.body === null ? null : { last_check_date: '2026-08-20', days_since_check: 24, check_due: false, last_measurements: null, prev_check_date: null, ai_overall: null, ai_confidence: null, ai_check_date: null, ...(o.body || {}) },
    blood: o.blood === null ? null : { last_test_date: '2026-06-01', days_since_test: 104, test_count: 2, ...(o.blood || {}) },
    meta: { version: 2, week_start: ws, week_end: add(ws, 6), is_closed: true, errors: [] },
  };
}
// Storia con medie peso date: pesi[0] = settimana chiusa, pesi[1] = una prima, …
function storia(pesi, per = () => ({})){
  const qs = pesi.map((w, k) => { const x = per(k); return quadro(k, { ...x, weight: { weight_avg: w, weight_last: w, ...(x.weight || {}) } }); });
  return { pic: qs[0], hist: qs.slice(1) };
}
const profilo = (o = {}) => ({ obiettivo: 'dimagrimento', goal_weight_kg: 70, target_kcal: 2200, target_protein: 150, target_carbs: 220, target_fat: 70, giorni_allenamento: 4, train_start_date: '2026-08-10', ...o });
const kinds = (ps) => ps.map(p => p.kind);
const cambio = (ps, kind) => { const p = ps.find(x => x.kind === kind); return p ? p.change : undefined; };
const run = (s, prof, opts) => R.buildProposals(s.pic, s.hist, prof || profilo(), opts);

// 1. tutto in linea: dimagrire a −0,5 kg/sett → un keep solo
let s = storia([74.0, 74.5, 75.0, 75.5, 76.0]);
let p = run(s);
atteso('1 tutto in linea · proposte', kinds(p), ['keep']);
atteso('1 tutto in linea · motivazione con il ritmo', /0,50 kg a settimana/.test(p[0].reason), true);

// 2. dati sporchi: 1 pesata e 3 giorni registrati, peso in salita → niente kcal
s = storia([76.0, 75.5, 75.0, 74.5, 74.0], k => k === 0 ? { weight: { weight_n: 1 }, nutrition: { days_logged: 3, logged_dates: ['2026-09-07','2026-09-09','2026-09-12'] } } : {});
p = run(s);
atteso('2 dati sporchi · weigh_in e logging, niente kcal', kinds(p), ['weigh_in', 'logging']);
atteso('2 dati sporchi · giorni mancanti per nome', p[1].reason, 'Registra i pasti anche nei giorni martedì, giovedì, venerdì e domenica: questa settimana ho visto solo 3 giorni.');

// 3. weigh_in da solo (nessuna pesata)
s = storia([null, 74.5, 75.0, 75.5], k => k === 0 ? { weight: { weight_n: 0, weight_last: null } } : {});
p = run(s);
atteso('3 nessuna pesata · weigh_in', kinds(p), ['weigh_in']);
atteso('3 nessuna pesata · frase del brief', p[0].reason.startsWith('Pesati almeno 3 volte a settimana, al mattino: senza pesate non posso guidarti.'), true);

// 4. logging per etichetta "parziale" con 6 giorni
s = storia([74.0, 74.5, 75.0, 75.5], k => k === 0 ? { nutrition: { days_logged: 6, days_partial: 4, partial: true } } : {});
p = run(s);
atteso('4 parziale · logging', kinds(p), ['logging']);

// 5. dimagrire troppo in fretta (−1 kg/sett) → kcal +100 e keep proteine
s = storia([72.0, 73.0, 74.0, 75.0]);
p = run(s);
atteso('5 troppo in fretta · kcal e keep', kinds(p), ['kcal', 'keep']);
atteso('5 troppo in fretta · +100', cambio(p, 'kcal'), { target_kcal: { from: 2200, to: 2300 } });

// 6. stallo per 2 settimane con aderenza ≥ 70% → −150
s = storia([75.0, 75.1, 75.0, 75.1, 75.0]);
p = run(s);
atteso('6 stallo 2 sett · −150', cambio(p, 'kcal'), { target_kcal: { from: 2200, to: 2050 } });
// 6b. stallo di 2 settimane ma aderenza 50% → nessun taglio, keep che lo dice
s = storia([75.0, 75.1, 75.0, 75.1, 75.0], k => k === 0 ? { nutrition: { adherence_kcal: 0.5 } } : {});
p = run(s);
atteso('6b stallo con aderenza bassa · niente kcal', kinds(p), ['keep']);
atteso('6b · motivazione', /solo nel 50%/.test(p[0].reason), true);
// 6c. stallo di una settimana sola → keep "aspetto"
s = storia([75.0, 75.0, 75.2, 75.6, 76.2]);
p = run(s);
atteso('6c stallo di una settimana · keep di attesa', [kinds(p), /una settimana sola/.test(p[0].reason)], [['keep'], true]);

// 7. dimagrire, peso che sale: aderenza ok → −200; aderenza bassa → logging
s = storia([76.0, 75.6, 75.2, 74.8]);
p = run(s);
atteso('7 sale con aderenza ok · −200', cambio(p, 'kcal'), { target_kcal: { from: 2200, to: 2000 } });
s = storia([76.0, 75.6, 75.2, 74.8], k => k === 0 ? { nutrition: { adherence_kcal: 0.4 } } : {});
p = run(s);
atteso('7b sale con aderenza bassa · logging invece di tagliare', [kinds(p), cambio(p, 'kcal')], [['logging'], undefined]);

// 8. massa: ferma 2 settimane → +150; oltre +0,5 → −100
s = storia([70.0, 70.0, 70.0, 70.0, 70.0]);
p = run(s, profilo({ obiettivo: 'ipertrofia', goal_weight_kg: 75 }));
atteso('8 massa ferma · +150', cambio(p, 'kcal'), { target_kcal: { from: 2200, to: 2350 } });
s = storia([72.2, 71.6, 71.0, 70.4]);
p = run(s, profilo({ obiettivo: 'ipertrofia', goal_weight_kg: 75 }));
atteso('8b massa troppo veloce · −100', cambio(p, 'kcal'), { target_kcal: { from: 2200, to: 2100 } });

// 9. mantenere: fuori da ±0,3 per 2 settimane nelle due direzioni
s = storia([72.0, 71.4, 70.8, 70.2, 69.6]);
p = run(s, profilo({ obiettivo: 'mantenimento' }));
atteso('9 mantenere, sale · −100', cambio(p, 'kcal'), { target_kcal: { from: 2200, to: 2100 } });
s = storia([69.6, 70.2, 70.8, 71.4, 72.0]);
p = run(s, profilo({ obiettivo: 'longevita' }));
atteso('9b mantenere, scende · +100', cambio(p, 'kcal'), { target_kcal: { from: 2200, to: 2300 } });

// 10. limiti duri 1.500-3.500
s = storia([75.0, 75.1, 75.0, 75.1, 75.0]);
p = run(s, profilo({ target_kcal: 1580 }));
atteso('10 limite basso · si ferma a 1.500', cambio(p, 'kcal'), { target_kcal: { from: 1580, to: 1500 } });
p = run(s, profilo({ target_kcal: 1500 }));
atteso('10b già a 1.500 · nessuna proposta kcal', kinds(p), ['keep']);
s = storia([70.0, 70.0, 70.0, 70.0, 70.0]);
p = run(s, profilo({ obiettivo: 'ipertrofia', goal_weight_kg: 75, target_kcal: 3450 }));
atteso('10c limite alto · si ferma a 3.500', cambio(p, 'kcal'), { target_kcal: { from: 3450, to: 3500 } });

// 11. una correzione kcal ogni 2 settimane
s = storia([75.0, 75.1, 75.0, 75.1, 75.0]);
p = run(s, profilo(), { proposals: [ { kind: 'kcal', status: 'accepted', week_start: '2026-08-31' } ] });
atteso('11 kcal accettata la settimana prima · keep, niente kcal', [kinds(p), /settimana scorsa/.test(p[0].reason)], [['keep'], true]);
p = run(s, profilo(), { proposals: [ { kind: 'kcal', status: 'accepted', week_start: '2026-08-24' } ] });
atteso('11b accettata due settimane prima · kcal di nuovo possibile', kinds(p), ['kcal']);
p = run(s, profilo(), { proposals: [ { kind: 'kcal', status: 'rejected', week_start: '2026-08-31' } ] });
atteso('11c rifiutata la settimana prima · non blocca', kinds(p), ['kcal']);

// 12. proteine sotto 1,6 g/kg per 2 settimane → 1,8 g/kg arrotondato a 5
s = storia([74.0, 74.5, 75.0, 75.5], k => k <= 1 ? { nutrition: { protein_avg: 100 } } : {});
p = run(s, profilo({ target_protein: 110 }));
atteso('12 proteine basse · 74 × 1,8 = 133 → 135', cambio(p, 'protein'), { target_protein: { from: 110, to: 135 } });
p = run(s, profilo({ target_protein: 198 }));
atteso('12b target già sopra 1,8 g/kg · nessuna proposta', kinds(p).includes('protein'), false);

// 13. volume: 2 settimane sotto le previste, niente infortuni → 3 invece di 4
s = storia([74.0, 74.5, 75.0, 75.5], k => k <= 1 ? { training: { sessions_done: k ? 2 : 3 } } : {});
p = run(s);
atteso('13 volume · proposta', [kinds(p), cambio(p, 'training_volume')], [['keep', 'training_volume'], { giorni_allenamento: { from: 4, to: 3 } }]);
atteso('13 volume · dice che la scheda a 3 giorni non c\'è', /non c'è ancora/.test(p[1].reason), true);
s = storia([74.0, 74.5, 75.0, 75.5], k => k <= 1 ? { training: { sessions_done: 2, injury_days: k ? 0 : 2 } } : {});
atteso('13b con un infortunio · nessuna proposta volume', kinds(run(s)).includes('training_volume'), false);

// 14. scarico: RIR ≤ 0,5 per 2 settimane; oppure infortunio + settimana ≥ 4
s = storia([74.0, 74.5, 75.0, 75.5], k => k <= 1 ? { training: { avg_rir: k ? 0.4 : 0.5 } } : {});
p = run(s);
atteso('14 RIR basso · deload a settimana 6', cambio(p, 'deload'), { cycle_week: { from: 2, to: 6 } });
s = storia([74.0, 74.5, 75.0, 75.5], k => k === 0 ? { training: { injury_active: true, injury_days: 2, block_week: 4 } } : {});
atteso('14b infortunio in settimana 4 · deload', kinds(run(s)).includes('deload'), true);
s = storia([74.0, 74.5, 75.0, 75.5], k => k === 0 ? { training: { injury_active: true, injury_days: 2, block_week: 3 } } : {});
atteso('14c infortunio in settimana 3 · niente deload', kinds(run(s)).includes('deload'), false);

// 15. settimana 6 senza check dopo il blocco → check
s = storia([74.0, 74.5, 75.0, 75.5], k => k === 0 ? { training: { block_week: 6, is_deload: true }, body: { days_since_check: 35 } } : {});
p = run(s);
atteso('15 fine blocco · check', [kinds(p), p.find(x => x.kind === 'check').reason.startsWith('Blocco finito: fai il check fisico prima di ripartire.')], [['keep', 'check'], true]);

// 16. check vecchio ≥ 42 giorni
s = storia([74.0, 74.5, 75.0, 75.5], k => k === 0 ? { body: { days_since_check: 42 } } : {});
atteso('16 check a 42 giorni', kinds(run(s)), ['keep', 'check']);
atteso('16b rifiutato 2 settimane fa · non si ripropone', kinds(run(s, profilo(), { proposals: [ { kind: 'check', status: 'rejected', week_start: '2026-08-24' } ] })), ['keep']);

// 17. esami: mai registrati, o ≥ 180 giorni
s = storia([74.0, 74.5, 75.0, 75.5], k => k === 0 ? { blood: { test_count: 0, last_test_date: null, days_since_test: null } } : {});
p = run(s);
atteso('17 esami mai registrati', p.find(x => x.kind === 'blood_test').reason, 'Non hai ancora registrato esami del sangue: parlane con il medico.');
s = storia([74.0, 74.5, 75.0, 75.5], k => k === 0 ? { blood: { days_since_test: 200 } } : {});
atteso('17b esami di 200 giorni fa', run(s).find(x => x.kind === 'blood_test').reason, 'Sono passati 6 mesi dagli ultimi esami: parlane con il medico.');

// 18. peso fermo ma foto migliorate con affidabilità alta → keep, niente taglio
s = storia([75.0, 75.1, 75.0, 75.1, 75.0], k => k === 0 ? { body: { ai_overall: 'migliorato', ai_confidence: 'alta', ai_check_date: '2026-09-05' } } : {});
p = run(s);
atteso('18 foto migliorate · keep ricomposizione', [kinds(p), p[0].reason.startsWith('Peso fermo ma foto migliorate: probabile ricomposizione, non cambio nulla.')], [['keep'], true]);
s = storia([75.0, 75.1, 75.0, 75.1, 75.0], k => k === 0 ? { body: { ai_overall: 'migliorato', ai_confidence: 'media' } } : {});
atteso('18b affidabilità media · il taglio resta', kinds(run(s)), ['kcal']);

// 19. mai più di 3, e nell'ordine dati > kcal > allenamento > resto
s = storia([76.0, 75.6, 75.2, 74.8], k => k <= 1 ? { weight: k ? {} : { weight_n: 1 }, training: { avg_rir: 0.3, sessions_done: 2 }, body: { days_since_check: 60 }, blood: { test_count: 0 } } : {});
p = run(s);
atteso('19 tante regole · 3 in ordine di priorità', kinds(p), ['weigh_in', 'training_volume', 'deload']);

// 20. ricomposizione: direzione dall'obiettivo di peso
atteso('20 ricomposizione 72 → 68 · dimagrire', R.direzione({ obiettivo: 'ricomposizione', goal_weight_kg: 68 }, 72.1), 'dimagrire');
atteso('20b ricomposizione 72 → 72,5 · mantenere', R.direzione({ obiettivo: 'ricomposizione', goal_weight_kg: 72.5 }, 72.1), 'mantenere');
atteso('20c chiave vecchia perdita_peso · dimagrire', R.direzione({ obiettivo: 'perdita_peso' }, 76), 'dimagrire');

// 21. deterministica e senza effetti sugli ingressi
s = storia([75.0, 75.1, 75.0, 75.1, 75.0]);
const copia = JSON.stringify(s);
const a1 = JSON.stringify(run(s)), a2 = JSON.stringify(run(s));
atteso('21 due chiamate · stesso risultato', a1 === a2, true);
atteso('21b ingressi non toccati', JSON.stringify(s) === copia, true);
atteso('21c ogni proposta ha numeri e versione delle regole', run(s).every(x => Array.isArray(x.evidence.numeri) && x.evidence.numeri.length && x.evidence.rules_version === R.RULES_VERSION), true);

console.log(ko ? `\n${ko} KO su ${n}` : `\ntutto OK (${n} controlli)`);
process.exit(ko ? 1 : 0);
