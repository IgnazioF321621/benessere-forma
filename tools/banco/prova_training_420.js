// Training 420 (24 novembre 2026): la base di quattro sedute che porta ogni muscolo a 10 serie, più la Upper Pump
// facoltativa (alternativa D, scelta da Ignazio).
//   · il conto della letteratura: il dip vale per tricipiti e petto, lo stacco rumeno per i femorali, il reverse hyper
//     per i glutei (_volCrediti);
//   · schedaEntroUnOra: un core per seduta a 2 serie, trazioni a 2, i riempitivi di spalle e braccia nelle Lower, le
//     sedute dentro il tetto (Upper 61, Lower 63 minuti), la Pump fuori dal giro, il core in un blocco suo;
//   · la Pump si propone quando le quattro della settimana sono fatte o nel quinto giorno scelto, e non conta nel blocco;
//   · nell'app la Pump sta nel Programma come facoltativa e si apre come le altre.
//   node tools/banco/prova_training_420.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const { scheda410 } = require('./dati_scheda_400');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(104), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
// un catalogo piccolo di isolamenti a casa con l'elastico, e due voci di riscaldamento (la corsa e le anche)
const ISO = (codice, nome, gruppo) => ({ codice, nome, pattern: 'isolamento', gruppo_target: gruppo, attrezzo: 'elastico', luogo: 'casa', livello: 'principiante', uso: 'principale',
  setup: 'Prendi l\'elastico.', esecuzione: 'Esegui.', errori: 'Non slanciare.', muscoli: gruppo, unilaterale: 'no', progressione: 'elastico più duro' });
const POOL = [
  ISO('EX901', 'Alzate laterali elastico', 'deltoidi laterali'), ISO('EX902', 'Alzate laterali elastico un braccio', 'deltoidi laterali'),
  ISO('EX903', 'Alzate laterali elastico in avanti', 'deltoidi laterali'), ISO('EX904', 'Tirate al viso elastico', 'deltoidi posteriori'),
  ISO('EX905', 'Aperture posteriori elastico', 'deltoidi posteriori'), ISO('EX906', 'Curl elastico', 'bicipiti'), ISO('EX907', 'Curl martello elastico', 'bicipiti'),
  ISO('EX908', 'Estensioni tricipiti elastico', 'tricipiti'), ISO('EX909', 'Pushdown elastico', 'tricipiti'), ISO('EX910', 'Leg curl elastico', 'ischiocrurali'),
  ISO('EX911', 'Curl concentrato elastico', 'bicipiti'), ISO('EX912', 'Kickback elastico', 'tricipiti'),
];
const CATALOGO = new Map(POOL.concat([{ codice: 'W0', pattern: 'cardio_metabolico', nome: 'Skip sul posto' }, { codice: 'W1', pattern: 'mobilita', nome: 'Slanci' }]).map(r => [r.codice, r]));
(async () => {
  const U = 'u1', OGGI = '2026-11-28';   // sabato
  const t = {
    profiles:[{ id:U, first_name:'X', m2_skipped:true, unit:'lbs', train_start_date:'2026-11-16', obiettivo:'ricomposizione', tipo_allenamento:'casa', attrezzatura:['elastico'], giorni_allenamento:4, train_giorni:[1, 2, 4, 5] }],
    schede_utente:[], esercizi_catalog: [], training_logs: [], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t, { now: OGGI + 'T07:00:00', locale: { zt_v5: '1' } });
  await b.avviato;
  const W = b.win, ST = W.eval('ST'), doc = W.document, R = W.ZTRotazione, Q = W.ZTQuadro;

  // ── il conto della letteratura ──
  atteso('il dip: tricipiti 1, petto ½ (non più spalle laterali)', W._volCrediti('spinta verticale', ['tricipiti']), { tricipiti: 1, petto: 0.5, 'deltoidi anteriori': 0.5 });
  atteso('lo stacco rumeno: femorali 1, glutei ½; il reverse hyper: glutei 1, femorali ½', [W._volCrediti('dominante anca', ['ischiocrurali']), W._volCrediti('dominante anca', ['glutei'])],
    [{ glutei: 0.5, ischiocrurali: 1 }, { glutei: 1, ischiocrurali: 0.5 }]);
  atteso('il lento in piedi resta spalla anteriore 1, laterali ½', W._volCrediti('spinta verticale', ['deltoidi anteriori']), { 'deltoidi anteriori': 1, tricipiti: 0.5, 'deltoidi laterali': 0.5 });

  // ── la regola D sulla scheda di oggi ──
  const sc = scheda410();
  sc.sessioni.forEach(s => { if(/^lower/.test(s.id)) s.warmup = [{ codice: 'W0', name: 'Skip sul posto', reps: '15-20' }, { codice: 'W1', name: 'Slanci', reps: '30 sec per lato' }, { codice: 'W2', name: 'Squat su step', reps: '15-20' }]; });
  const d = W.schedaEntroUnOra(sc.sessioni, { obiettivo: 'ricomposizione', pool: POOL, limitazioni: [], tipoAllen: 'casa', attrezzatura: ['elastico', 'corpo_libero'], livello: 'avanzato', catalogo: CATALOGO, pump: true });
  const base = sc.sessioni.filter(s => s.id !== 'pump');
  const min = (sec) => Math.round(sec / 60);
  atteso('le quattro sedute dentro il tetto: Upper fino a 61 minuti, Lower fino a 63', d.filter(x => !x.facoltativa).map(x => `${x.sid} ${min(x.dopo)}${x.sopra ? ' SOPRA' : ''}`).every(x => !/SOPRA/.test(x)), true);
  atteso('un core per seduta, 2 serie', base.map(s => s.exercises.filter(e => e.pattern === 'core').map(e => e.sets)), [[2], [2], [2], [2]]);
  atteso('le trazioni a 2 serie', base.flatMap(s => s.exercises.filter(e => e.pattern === 'tirata verticale').map(e => e.sets)), [2, 2]);
  atteso('i cardini non perdono serie', base.flatMap(s => s.exercises.filter(e => e.cardine).map(e => e.sets >= 3)).every(Boolean), true);
  const vol = W.volumeContoMinimi(base, 'ricomposizione');
  atteso('le serie per muscolo nella base: nessuno sotto 9, e quasi tutti a 10', [vol.every(c => c.serie >= 9), vol.filter(c => c.serie < 10).length <= 2], [true, true]);
  atteso('spalle e braccia anche nelle Lower, come riempitivi', base.filter(s => /^lower/.test(s.id)).some(s => s.exercises.some(e => e.riempitivo)), true);
  atteso('il riscaldamento resta com\'era', base.filter(s => /^lower/.test(s.id)).map(s => s.warmup.map(w => w.codice)), [['W0', 'W1', 'W2'], ['W0', 'W1', 'W2']]);
  atteso('il core in un blocco suo, mai in coppia con un multiarticolare', base.map(s => s.exercises.filter(e => e.pattern === 'core').map(e => s.exercises.filter(x => x.blocco === e.blocco).length)), [[1], [1], [1], [1]]);
  const pump = sc.sessioni.find(s => s.id === 'pump');
  atteso('la Upper Pump: facoltativa, 11 serie di spalle e braccia, circa 35 minuti', [!!pump && pump.facoltativa, pump && pump.exercises.reduce((a, e) => a + e.sets, 0), pump && min(R.durataSeduta(pump))], [true, 11, 35]);
  atteso('nella Pump nessun esercizio della base', pump.exercises.every(e => !base.some(s => s.exercises.some(x => x.codice === e.codice))), true);
  atteso('con la Pump spalle e braccia salgono sopra 10', W.volumeContoMinimi(sc.sessioni, 'ricomposizione').filter(c => ['deltoidi laterali', 'deltoidi posteriori', 'bicipiti', 'tricipiti'].includes(c.gruppo)).every(c => c.serie >= 10), true);

  // ── la Pump nella rotazione: una proposta sola, nessun debito ──
  const w = (date, s) => ({ date, session_type: s, completed: true });
  const fatte4 = [w('2026-11-27', 'lowerB'), w('2026-11-26', 'upperB'), w('2026-11-24', 'lowerA'), w('2026-11-23', 'upperA')];
  const ciclo = R.cicloPer(['upperA', 'lowerA', 'upperB', 'lowerB', 'pump']);
  atteso('il giro resta a 6 posti anche con la Pump nella scheda', ciclo, ['upperA', 'lowerA', 'recoveryUpper', 'upperB', 'lowerB', 'recoveryLower']);
  atteso('sabato, le quattro della settimana fatte: si propone la Pump', R.prossima({ allenamenti: fatte4, ciclo, oggi: OGGI, giorni: [1, 2, 4, 5], facoltativa: true }), 'pump');
  atteso('senza Pump nella scheda: la rotazione di sempre', R.prossima({ allenamenti: fatte4, ciclo, oggi: OGGI, giorni: [1, 2, 4, 5], facoltativa: false }), 'recoveryLower');
  atteso('Pump fatta sabato: domenica non si ripropone', R.prossima({ allenamenti: [w('2026-11-28', 'pump')].concat(fatte4), ciclo, oggi: '2026-11-29', facoltativa: true }) !== 'pump', true);
  atteso('lunedì dopo: si riparte da Upper A, la Pump non ha spostato il giro', R.prossima({ allenamenti: [w('2026-11-28', 'pump')].concat(fatte4), ciclo, oggi: '2026-11-30', giorni: [1, 2, 4, 5], facoltativa: true }), 'upperA');
  atteso('a metà settimana (due fatte, giovedì) niente Pump', R.prossima({ allenamenti: fatte4.slice(2), ciclo, oggi: '2026-11-26', giorni: [1, 2, 4, 5], facoltativa: true }), 'upperB');
  const prev = R.sedutePreviste({ allenamenti: [], ciclo, oggi: '2026-11-30', giorni: [1, 2, 4, 5, 6], settimane: 1, facoltativa: true });
  atteso('nel calendario, cinque giorni scelti: quattro della rotazione e la Pump il quinto', prev.map(e => e.sid), ['upperA', 'lowerA', 'upperB', 'lowerB', 'pump']);
  atteso('con quattro giorni scelti la Pump non entra nel calendario', R.sedutePreviste({ allenamenti: [], ciclo, oggi: '2026-11-30', giorni: [1, 2, 4, 5], settimane: 1, facoltativa: true }).map(e => e.sid), ['upperA', 'lowerA', 'upperB', 'lowerB']);
  const blocco = (righe) => Q.cycleWeekInfo({ completed: righe, today: '2026-11-30', workPerGiro: 4 }).workCount;
  atteso('la Pump non fa avanzare le settimane del blocco', [blocco(fatte4.slice().reverse()), blocco(fatte4.slice().reverse().concat([w('2026-11-28', 'pump')]))], [4, 4]);

  // ── nell'app: la Pump nel Programma, e si apre ──
  t.schede_utente.push({ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda:sc });
  ST.user = { id:U, email:'x@y' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  W.callAI = async () => '';
  W.fetchExerciseMedia = async () => ({ status:'none' });
  atteso('la Pump è fra le sedute, ma il giro dell\'app resta quello a 6', [!!ST.userTrainingSessions.pump, W.getRotationCycle().includes('pump')], [true, false]);
  ST.page = 'training'; ST.trainSession = null; ST.trainTab = 'piano'; W.renderTraining();
  const card = doc.getElementById('pump5-card');
  atteso('nel Programma la card della Pump, facoltativa, coi minuti', card && card.textContent.replace(/\s+/g, ' ').trim(), 'Upper PumpFACOLTATIVA Spalle e braccia · circa 35 min · quando c\'è il quinto giorno');
  W.openTrainingSession('pump');
  W.renderTraining();
  atteso('aperta, la Pump è a blocchi con la riga «Adesso»', [ST.trainSession, !!doc.getElementById('adesso5'), doc.querySelectorAll('.blocco5').length > 0], ['pump', true, true]);
  // il dubbio di Ignazio (24 novembre): nella Lower A gli affondi erano in coppia con un core, e i core erano due
  ST.trainSession = 'lowerA'; W.renderTraining();
  atteso('Lower A: un core solo, nell\'ultimo blocco, da solo', [...doc.querySelectorAll('.blocco5-titolo')].map(x => x.textContent).pop(), 'Core');

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
