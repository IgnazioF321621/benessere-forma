// Training 410 (23 novembre 2026): la seduta a blocchi, in un'ora coi tempi misurati.
//   · ZTRotazione.blocchi: la Upper A come nello schizzo approvato (A piegamenti + rematore, B trazioni + dip con il
//     pull-apart riempitivo, C rifinitura a tre, D core), la pausa dentro il giro, «Prepara» dagli attrezzi;
//   · schedaEntroUnOra a 150 s a serie: la scheda di oggi in un'ora, i cardini intatti, i blocchi scritti;
//   · nella seduta: la riga «Adesso» coi numeri già scritti, «Fatta» salva e fa partire UN timer solo verso chi tocca,
//     «Fine serie» non fa partire niente finché la serie non è salvata (feedback 306e9da9 e 160931c9);
//   · il riepilogo mette i minuti veri contro la stima.
//   node tools/banco/prova_training_410.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const { scheda410 } = require('./dati_scheda_400');
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

  // ── la durata e i blocchi ──
  atteso('la durata: 150 s a serie, più attivazione e riscaldamento', [R.TEMPO.serieMisurata, R.durataSeduta({ exercises:[{ sets:3, reps:'8-12' }, { sets:2, reps:'12-15' }] })], [150, 300 + 5 * 150]);
  const sA = scheda410().sessioni[0];
  const blA = R.blocchi(sA);
  atteso('Upper A ricavata: quattro blocchi, come lo schizzo', blA.map(x => `${x.lettera} ${x.titolo}: ` + x.voci.map(v => v.ex.codice + (v.riempitivo ? '*' : '')).join('+')),
    ['A Spinta e tirata orizzontali: EX378+EX482', 'B Spinta e tirata verticali: EX511+EX513+EX030*', 'C Rifinitura: EX027+EX439+EX677', 'D Core: EX046+EX135']);
  atteso('blocco A: giro di almeno 180 s (il recupero scritto), 60 s fra un esercizio e l\'altro', [blA[0].giro >= 180, blA[0].voci.map(v => v.pausa)], [true, [60, 60]]);
  atteso('«Prepara»: gli attrezzi dei suoi esercizi, senza il corpo libero', [blA[0].attrezzi, blA[3].attrezzi], [['elastico', 'panca'], ['fitball']]);
  const passi = R.passi(blA);
  atteso('i passi: A1, A2, A1, A2… poi il blocco B', passi.slice(0, 7).map(p => blA[p.b].voci[p.v].tag + '·' + p.serie), ['A1·1', 'A2·1', 'A1·2', 'A2·2', 'A1·3', 'A2·3', 'B1·1']);
  atteso('fra due blocchi il timer è la preparazione (2 minuti)', R.pausaVerso(blA, { b:0, v:1 }, { b:1, v:0 }), { sec:120, prepara:true });
  const lowA = R.blocchi(scheda410().sessioni[1]);
  atteso('Lower A: un multiarticolare di gambe per blocco, ognuno con un compagno che non lavora i suoi muscoli',
    lowA.map(x => x.voci.map(v => v.ex.codice).join('+')), ['EX644+EX215', 'EX647+EX043', 'EX656+EX021', 'EX133']);

  // ── il tetto sulla scheda di oggi ──
  const sc = scheda410();
  const d = W.schedaEntroUnOra(sc.sessioni, { obiettivo:'ricomposizione' });
  atteso('minuti prima → dopo', d.map(x => `${x.sid} ${min(x.prima)}→${min(x.dopo)}`), ['upperA 83→55', 'lowerA 60→58', 'upperB 78→55', 'lowerB 63→58']);
  atteso('nessuna seduta sopra l\'ora; i cardini con le serie di prima', [d.some(x => x.sopra), sc.sessioni.flatMap(x => x.exercises.filter(e => e.cardine).map(e => e.sets)).every(n => n === 3)], [false, true]);
  atteso('ogni esercizio ha la sua lettera, le coppie del 400 non ci sono più', sc.sessioni.every(x => x.exercises.every(e => /^[A-E]$/.test(e.blocco) && e.coppia === undefined)), true);
  atteso('Upper A: via French press e pull-apart, i due core e la rifinitura a 2 serie', [sc.sessioni[0].exercises.map(e => `${e.blocco}${e.codice}×${e.sets}`)],
    [['AEX378×3', 'AEX482×3', 'BEX511×2', 'BEX513×3', 'CEX439×2', 'CEX677×2', 'DEX046×2', 'DEX135×2']]);
  atteso('una scheda già in un\'ora non cambia', W.schedaEntroUnOra(sc.sessioni, { obiettivo:'ricomposizione' }).map(x => x.mosse.length), [0, 0, 0, 0]);

  // ── la seduta: «Adesso», «Fatta», un timer solo ──
  t.schede_utente.push({ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda:scheda410() });
  ST.user = { id:U, email:'x@y' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await W.loadActiveScheda();
  W.callAI = async () => '';
  W.fetchExerciseMedia = async () => ({ status:'none' });
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  W.renderTraining();
  const PIE = 'Piegamenti assistiti elastico', REM = 'Rematore manubri presa inversa panca inclinata';
  const riga = () => [(doc.querySelector('.adesso5-nome') || {}).textContent, (doc.querySelector('.adesso5-serie') || {}).textContent.split(' · ')[0]];
  atteso('in cima la riga «Adesso»: A1 Piegamenti, serie 1 di 3', riga(), ['A1' + W.nomeCortoConTag(PIE), 'Serie 1 di 3']);
  atteso('le testate dei blocchi, con «Prepara»', [...doc.querySelectorAll('.blocco5-lettera')].map(x => x.textContent).join('') + ' · ' + doc.querySelector('.blocco5-prepara').textContent, 'ABCD · PreparaElastico · Panca');
  atteso('sulle card il tag del blocco al posto del numero', doc.querySelector('#excard-Piegamenti_assistiti_elastico .ex-num-box').textContent.trim(), 'A1');
  atteso('il titolo della lista dice blocchi, serie e minuti', doc.querySelector('.t5-seduta h2.sez5:last-of-type') && [...doc.querySelectorAll('h2.sez5')].map(x => x.textContent).find(x => /blocchi/.test(x)), '4 blocchi · 30 serie · circa 85 min');
  atteso('le ripetizioni sono già scritte', doc.getElementById('adesso5-reps').textContent, '4');
  await W.fattaAdesso();
  const cd = () => ST.trainCountdown ? [ST.trainCountdown.exName, ST.trainCountdown.total, ST.trainCountdown.blocco && ST.trainCountdown.blocco.tag] : null;
  atteso('«Fatta»: la serie è salvata e parte UN timer, 60 s, verso A2 Rematore', [Object.keys(ST.trainLoggedSets).length, t.training_logs.length, cd()], [1, 1, [REM, 60, 'A2']]);
  W.renderTraining();
  atteso('il timer dice «Poi A2 · serie 1 di 3» e si può correggere la serie appena fatta', [/POI A2 · SERIE 1 DI 3/.test(doc.body.innerHTML), !!doc.querySelector('.rest-hero-correggi')], [true, true]);
  W.skipCountdown();
  W.renderTraining();
  atteso('dopo il timer, «Adesso» è A2 Rematore', riga(), ['A2' + W.nomeCortoConTag(REM), 'Serie 1 di 3']);
  // la strada di sempre: «Inizia» → «Fine serie» → registro → «Salva»
  W.openTrainExec('upperA', REM, 1);
  W.trainExecFinishSet();
  atteso('«Fine serie» a blocchi: nessun timer, si apre il registro (le ripetizioni si scrivono subito)', [ST.trainCountdown, !!ST.trainLogOpen], [null, true]);
  W.renderTraining();
  doc.getElementById('tl-reps').value = '6';
  await W.saveTrainingSet();
  atteso('salvata la serie dal registro: UN timer, verso A1 serie 2', [cd(), ST.trainCountdown && ST.trainCountdown.blocco.serie], [[PIE, 60, 'A1'], 2]);
  // fino alla fine del blocco A
  for(const n of [2, 3]){ for(const nome of [PIE, REM]){ ST.trainCountdown = null; W.renderTraining(); if(ST.trainAdesso.exName !== nome) throw new Error('ordine ' + ST.trainAdesso.exName); await W.fattaAdesso(); } }
  atteso('finito il blocco A: il timer è la preparazione del blocco B (2 minuti), poi B1 Trazioni', [ST.trainCountdown.total, ST.trainCountdown.blocco.prepara && ST.trainCountdown.blocco.prepara.lettera, ST.trainCountdown.blocco.tag], [120, 'B', 'B1']);
  W.renderTraining();
  atteso('il timer di preparazione lo dice', /Prepara il blocco B/i.test(doc.body.innerHTML), true);

  // ── il riepilogo: i minuti veri contro la stima ──
  const chiavi = Object.keys(ST.trainLoggedSets);
  const t0 = W.Date.now();
  chiavi.forEach((k, i) => { ST.trainLoggedSets[k].t = t0 + i * 160 * 1000; });
  ST.user = { id:'test-user-001' };
  const m = await W._misuraTempiSeduta('upperA');
  atteso('i minuti veri: 6 serie, 160 s l\'una, contro i 150 della stima', m, { serie:6, minuti:13, secSerie:160, stimaSec:150 });

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
