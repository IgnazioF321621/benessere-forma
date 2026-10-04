// Training 070 — il blocco nuovo nasce come anteprima: per ogni seduta restano i cardini del blocco
// precedente (una spinta e una tirata nelle Upper, ginocchia e anca nelle Lower), ruotano i
// complementari, il punto di partenza è l'ultima serie fuori dallo scarico. «Accetto» salva la scheda
// nuova, riaccende la vecchia se il salvataggio fallisce, e fa ripartire il conteggio delle settimane.
//   node tools/banco/prova_blocco_nuovo.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const OGGI = '2026-10-04';
const INIZIO = '2026-08-24';          // 41 giorni prima di oggi: blocco finito
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };

// Catalogo minimo: ogni schema di movimento ha 2-3 candidati, così la rotazione (rigenIdx = 2 schede
// già esistenti) sceglierebbe un esercizio DIVERSO da quello del blocco prima.
const base = { uso:'principale', luogo:'casa', attrezzo:'elastico', livello:'intermedio', muscoli:'', setup:'', esecuzione:'', errori:'', zone_rischio:'' };
const row = (codice, nome, pattern, gruppo_target) => ({ ...base, codice, nome, pattern, gruppo_target: gruppo_target || '' });
const catalogo = [
  row('EX001','Panca elastico','spinta orizzontale'), row('EX002','Piegamenti','spinta orizzontale'), row('EX003','Chest press elastico','spinta orizzontale'),
  row('EX010','Military press elastico','spinta verticale'), row('EX011','Pike push-up','spinta verticale'),
  row('EX020','Rematore elastico','tirata orizzontale'), row('EX021','Rematore invertito','tirata orizzontale'), row('EX022','Rematore un braccio','tirata orizzontale'),
  // tirata verticale: EX030 nativo a elastico, EX031/EX033 nativi alla sbarra (presa diversa = variante vera),
  // EX032 gravitron: macchina con surrogato elastico, a casa e' la trazione assistita (seconda anteprima vera)
  row('EX030','Lat machine elastico','tirata verticale'), { ...row('EX031','Trazioni sbarra','tirata verticale'), attrezzo:'sbarra' },
  { ...row('EX032','Trazioni sbarra gravitron','tirata verticale'), attrezzo:'macchina', luogo:'casa;palestra', surrogato_attrezzo:'elastico', nota_surrogato:'Trazioni assistite con elastico alla sbarra', livello:'principiante' },
  { ...row('EX033','Trazioni sbarra presa neutra','tirata verticale'), attrezzo:'sbarra' },
  row('EX040','Squat elastico','dominante ginocchia'), row('EX041','Affondi','dominante ginocchia'), row('EX042','Squat bulgaro','dominante ginocchia'), row('EX043','Step-up','dominante ginocchia'),
  row('EX050','Stacco rumeno elastico','dominante anca'), row('EX051','Hip thrust','dominante anca'),
  row('EX060','Alzate posteriori','isolamento','deltoidi posteriori'), row('EX061','Face pull elastico','isolamento','deltoidi posteriori'), row('EX068','Reverse fly elastico','isolamento','deltoidi posteriori'),
  row('EX062','Alzate laterali','isolamento','deltoidi laterali'), row('EX063','Curl elastico','isolamento','bicipiti'), row('EX064','Push down elastico','isolamento','tricipiti'),
  row('EX065','Ponte glutei','isolamento','glutei'), row('EX066','Leg curl elastico','isolamento','ischiocrurali'), row('EX067','Calf raise','isolamento','polpacci'),
  row('EX070','Pallof press','core','core anti-rotazione'), row('EX071','Russian twist','core','core rotazione'),
  row('EX072','Plank','core','core anti-estensione'), row('EX073','Crunch','core','core flessione'),
  row('EX074','Pallof press in ginocchio','core','core anti-rotazione'), row('EX075','Woodchop elastico','core','core rotazione'),
  row('EX076','Hollow hold','core','core anti-estensione'), row('EX077','Sit-up','core','core flessione'),
];
const ex = (codice, extra) => ({ codice, name: catalogo.find(c => c.codice === codice).nome, sets:4, reps:'6-10', ...(extra || {}) });
// Scheda del blocco 2 (attiva): i cardini attesi sono il primo esercizio di spinta e di tirata (Upper),
// ginocchia e anca (Lower). EX060/EX062 sono complementari: devono ruotare.
const schedaPrima = { obiettivo:'ricomposizione', sessioni: [
  { id:'upperA', name:'Upper A', type:'Forza',      rir:2, exercises:[ ex('EX001'), ex('EX010'), ex('EX020'), ex('EX030'), ex('EX060',{sets:3,reps:'12-15'}), ex('EX070'), ex('EX071') ] },
  { id:'lowerA', name:'Lower A', type:'Forza',      rir:2, exercises:[ ex('EX040'), ex('EX050'), ex('EX041'), ex('EX065'), ex('EX072'), ex('EX073') ] },
  { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, exercises:[ ex('EX002'), ex('EX011'), ex('EX021'), ex('EX031'), ex('EX062'), ex('EX063'), ex('EX064'), ex('EX070'), ex('EX071') ] },
  { id:'lowerB', name:'Lower B', type:'Ipertrofia', rir:1, exercises:[ ex('EX041'), ex('EX051'), ex('EX042'), ex('EX066'), ex('EX067'), ex('EX072'), ex('EX073') ] },
] };
// 24 allenamenti in 6 settimane dal 24 agosto: le ultime 4 righe (dal 28 settembre) sono la settimana di scarico.
const workouts = [];
for(let w = 0; w < 6; w++) [['upperA',0],['lowerA',1],['upperB',3],['lowerB',4]].forEach(([s, d], i) =>
  workouts.push({ id:'w' + w + i, user_id:U, session_type:s, date:add(INIZIO, 7 * w + d), completed:true }));

function fixture(opts){
  const o = opts || {};
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', obiettivo:'ricomposizione', tipo_allenamento:'casa',
      attrezzatura:['elastico','sbarra'], giorni_allenamento:4, volume_sessione:'completo', note_salute:'Esperienza: avanzato',
      train_start_date: o.inizio || INIZIO }],
    schede_utente:[
      { id:'s1', user_id:U, attiva:false, blocco_n:1, scheda:{ sessioni:[] } },
      { id:'s2', user_id:U, attiva:true,  blocco_n:2, scheda: JSON.parse(JSON.stringify(schedaPrima)) },
    ],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    workouts: o.workouts || workouts.map(w => ({ ...w })),
    // EX001: una serie in scarico (40 lbs) e una al picco (60 lbs) → riparte da 60. EX020: solo in scarico.
    training_logs:[
      { id:'t1', user_id:U, session_id:'upperA', date:'2026-09-28', exercise_name:'Panca elastico', exercise_code:'EX001', set_number:3, reps:8, resistance:'40', band_color:null, rir_actual:3 },
      { id:'t2', user_id:U, session_id:'upperA', date:'2026-09-24', exercise_name:'Panca elastico', exercise_code:'EX001', set_number:4, reps:6, resistance:'60', band_color:null, rir_actual:1 },
      { id:'t3', user_id:U, session_id:'upperA', date:'2026-09-10', exercise_name:'Panca elastico', exercise_code:'EX001', set_number:4, reps:6, resistance:'50', band_color:null, rir_actual:2 },
      { id:'t4', user_id:U, session_id:'upperA', date:'2026-09-29', exercise_name:'Rematore elastico', exercise_code:'EX020', set_number:3, reps:10, resistance:'30', band_color:null, rir_actual:3 },
    ],
    training_notes:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(opts){
  const t = fixture(opts);
  const b = boot(t, { now:OGGI + 'T12:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  await b.win.loadTrainingAllCompleted({ skipRender:true });
  const chiamate = (tab, op) => b.supa._calls.filter(c => c.table === tab && (!op || c.op === op));
  const codici = (scheda, id) => (scheda.sessioni.find(s => s.id === id) || { exercises:[] }).exercises.map(e => e.codice);
  const cardini = (scheda, id) => (scheda.sessioni.find(s => s.id === id) || { exercises:[] }).exercises.filter(e => e.cardine).map(e => e.codice);
  return { ...b, ST, t, chiamate, codici, cardini };
}
(async () => {
  // 1) la generazione con cardiniDa tiene i cardini; senza, la rotazione li cambia
  {
    const a = await nuovo();
    atteso('la scheda attiva si ricorda: id, blocco e sessioni', [a.ST.schedaAttiva.id, a.ST.schedaAttiva.blocco_n, a.ST.schedaAttiva.scheda.sessioni.length], ['s2', 2, 4]);
    const senza = await a.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
    const con   = await a.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true, cardiniDa: a.ST.schedaAttiva.scheda });
    atteso('senza cardini · Upper A la rotazione cambia spinta e tirata', [a.codici(senza, 'upperA').includes('EX001'), a.codici(senza, 'upperA').includes('EX020')], [false, false]);
    atteso('con cardini · Upper A tiene la prima spinta e la prima tirata', a.cardini(con, 'upperA'), ['EX001', 'EX020']);
    atteso('con cardini · Upper B tiene i suoi (non quelli di Upper A)', a.cardini(con, 'upperB'), ['EX002', 'EX021']);
    atteso('con cardini · Lower A tiene ginocchia e anca', a.cardini(con, 'lowerA'), ['EX040', 'EX050']);
    atteso('con cardini · Lower B tiene ginocchia e anca', a.cardini(con, 'lowerB'), ['EX041', 'EX051']);
    atteso('mai piu\' di due cardini per seduta', con.sessioni.map(s => a.cardini(con, s.id).length), [2, 2, 2, 2]);
    atteso('i cardini stanno fra i multiarticolari in testa alla seduta', a.codici(con, 'upperA').slice(0, 4).filter(c => ['EX001', 'EX020'].includes(c)), ['EX001', 'EX020']);
    atteso('i complementari ruotano: il deltoide posteriore di Upper A non e\' piu\' EX060', a.codici(con, 'upperA').includes('EX060'), false);
    atteso('nessun cardine di una seduta finisce in un\'altra', a.codici(con, 'upperB').includes('EX001') || a.codici(con, 'lowerB').includes('EX040'), false);
    atteso('anteprima · nessuna scrittura', a.chiamate('schede_utente', 'insert').length + a.chiamate('schede_utente', 'update').length, 0);

    // Complementari: variare e' cambiare stimolo, non giorno (seconda anteprima, 4 ottobre)
    const sedutaDi = (scheda, codice) => scheda.sessioni.filter(s => s.exercises.some(e => e.codice === codice)).map(s => s.id);
    const tutti = con.sessioni.flatMap(s => s.exercises.map(e => e.codice));
    atteso('nessun esercizio in due sedute della scheda nuova', tutti.filter((c, i) => tutti.indexOf(c) !== i), []);
    const migrati = con.sessioni.flatMap(s => s.exercises.filter(e => !e.cardine).map(e => e.codice))
      .filter(c => sedutaDi(schedaPrima, c).length && !sedutaDi(schedaPrima, c).includes(sedutaDi(con, c)[0]));
    atteso('nessun complementare cambia seduta rispetto al blocco prima', migrati, []);
    atteso('dove c\'e\' un\'alternativa mai fatta, entra quella (deltoidi posteriori: non EX060)', ['EX061', 'EX068'].includes(a.codici(con, 'upperA').find(c => ['EX060', 'EX061', 'EX068'].includes(c))), true);
    atteso('dove non c\'e\' alternativa, resta dov\'era (deltoidi laterali EX062 in Upper B)', [a.codici(con, 'upperB').includes('EX062'), a.codici(con, 'upperA').includes('EX062')], [true, false]);
    atteso('core: ogni seduta nuova ne ha due, uno per natura, senza doppioni fra sedute', con.sessioni.map(s => s.exercises.filter(e => /^EX07/.test(e.codice)).length), [2, 2, 2, 2]);
    // EX070/EX071 stavano in TUTTE E DUE le Upper: la prima seduta prende i due mai fatti, la seconda tiene i vecchi (niente migra, niente doppio)
    atteso('core: Upper A prende i due mai fatti, Upper B tiene i suoi di prima', [a.codici(con, 'upperA').filter(c => /^EX07/.test(c)).sort(), a.codici(con, 'upperB').filter(c => /^EX07/.test(c)).sort()], [['EX074', 'EX075'], ['EX070', 'EX071']]);
    atteso('senza cardiniDa niente preferenza: Upper A e Upper B ripetono EX070 come prima', [a.codici(senza, 'upperA').includes('EX070'), a.codici(senza, 'upperB').includes('EX070')], [true, true]);
    // Il nativo prima del surrogato, e il surrogato vale come il gesto base della sua famiglia
    atteso('gravitron (surrogato di «Trazioni» gia\' in scheda) non entra in nessuna seduta', tutti.includes('EX032'), false);
    atteso('Upper A prende la variante vera di presa, nativa alla sbarra (EX033)', a.codici(con, 'upperA').includes('EX033'), true);
    atteso('Upper B, senza altri nativi mai fatti, tiene le sue trazioni (EX031)', a.codici(con, 'upperB').includes('EX031'), true);
    atteso('il gravitron era nel pool: senza blocco nuovo la rotazione poteva pescarlo', a.ST.user && (await a.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true })).sessioni.some(s => s.exercises.some(e => e.codice === 'EX032')), true);
  }
  // 2) preparaBloccoNuovo: l'anteprima, il confronto e i punti di partenza
  {
    const a = await nuovo();
    const bn = await a.win.preparaBloccoNuovo();
    atteso('anteprima · blocco 3 dopo il 2', [bn.bloccoPrima, bn.bloccoN], [2, 3]);
    const uA = bn.diff.find(d => d.id === 'upperA');
    atteso('anteprima · Upper A: restano EX001 e EX020', uA.restano.map(r => r.codice), ['EX001', 'EX020']);
    atteso('anteprima · Upper A: EX060 esce', uA.escono.map(r => r.codice).includes('EX060'), true);
    atteso('anteprima · chi entra non era nella seduta di prima', uA.nuovi.every(n => !schedaPrima.sessioni[0].exercises.some(e => e.codice === n.codice)), true);
    atteso('punto di partenza · EX001 e\' il picco (60 lbs, 24 set), non lo scarico', [bn.partenze.EX001.resistance, bn.partenze.EX001.date, bn.partenze.EX001.inScarico], ['60', '2026-09-24', false]);
    atteso('punto di partenza · EX020 ha solo serie in scarico: si prende e lo si dice', [bn.partenze.EX020.resistance, bn.partenze.EX020.inScarico], ['30', true]);
    atteso('punto di partenza · EX040 senza serie: assente', bn.partenze.EX040 === undefined, true);
    const sheet = a.win.document.getElementById('blocco-nuovo-sheet');
    const testo = sheet ? sheet.textContent.replace(/\s+/g, ' ') : '';
    atteso('finestra · titolo e pulsante', [/Blocco 3 · anteprima/.test(testo), /Accetto il Blocco 3/.test(testo), /Non ora/.test(testo)], [true, true, true]);
    atteso('finestra · «riparti da 6 rip · 60 lbs · RIR 1»', /riparti da 6 rip · 60 lbs · RIR 1/.test(testo), true);
    atteso('finestra · lo scarico e\' dichiarato', /in scarico/.test(testo), true);
    atteso('ancora nessuna scrittura', a.chiamate('schede_utente', 'insert').length + a.chiamate('profiles', 'update').length, 0);
    a.win.closeBloccoNuovoSheet();
    atteso('«Non ora» · finestra chiusa, niente cambiato', [a.win.document.getElementById('blocco-nuovo-sheet'), a.ST.bloccoNuovo, a.ST.schedaAttiva.blocco_n], [null, null, 2]);
  }
  // 2b) «Cambia ›»: le alternative di un posto, la scelta mappata come farebbe il generatore, niente scritture
  {
    const a = await nuovo();
    const bn = await a.win.preparaBloccoNuovo();
    atteso('cambia · il dry-run porta il pool e gli attrezzi', [Array.isArray(bn.scheda._pools.poolPrincipali), bn.scheda._pools.attrezzatura.includes('sbarra'), !!bn.scheda.sessioni[0]._sp], [true, true, true]);
    const uA = bn.scheda.sessioni.find(s => s.id === 'upperA');
    const post = uA.exercises.find(e => ['EX060', 'EX061', 'EX068'].includes(e.codice));
    const cands = a.win.candidatiBloccoNuovo('upperA', post.codice);
    atteso('cambia · alternative del posto: stesso gruppo, fuori chi e\' in scheda, mai fatti prima', cands.map(k => k.codice + (k.fattoPrima ? '*' : '')), ['EX068', 'EX060*'].filter(c => c.replace('*', '') !== post.codice));
    const candTraz = a.win.candidatiBloccoNuovo('upperA', 'EX033');
    atteso('cambia · per le trazioni: solo tirate verticali non in scheda, il gravitron ultimo e segnato casalingo', [candTraz.map(k => k.codice), candTraz.find(k => k.codice === 'EX032').surrogato], [['EX030', 'EX032'], true]);
    const sheet = () => a.win.document.getElementById('blocco-nuovo-sheet').textContent.replace(/\s+/g, ' ');
    atteso('finestra · ogni complementare ha «Cambia ›», i cardini no', [a.win.document.querySelectorAll('#blocco-nuovo-sheet .bn-cambia').length > 0, /Cambia/.test(sheet())], [true, true]);
    a.win.apriCambioBloccoNuovo('upperA', post.codice);
    atteso('finestra · aperto il cambio: «Al posto di» e le alternative', [/AL POSTO DI/.test(sheet()), /mai fatto/.test(sheet()), /Indietro/.test(sheet())], [true, true, true]);
    const scelto = cands[0].codice;
    const nuovoEx = a.win.cambiaEsercizioBloccoNuovo('upperA', post.codice, scelto);
    const pos = uA.exercises.findIndex(e => e.codice === scelto);
    atteso('cambia · sostituito nello stesso posto, con i parametri da isolamento della seduta', [pos, uA.exercises.includes(post), nuovoEx.sets, nuovoEx.reps.startsWith('12-15'), nuovoEx.sceltoDaTe], [uA.exercises.indexOf(nuovoEx), false, 3, true, true]);
    atteso('cambia · il confronto si aggiorna e lo dice: «scelto da te»', [bn.diff.find(d => d.id === 'upperA').nuovi.find(n => n.codice === scelto).sceltoDaTe, /scelto da te/.test(sheet())], [true, true]);
    atteso('cambia · chi e\' appena entrato non e\' piu\' un\'alternativa altrove', a.win.candidatiBloccoNuovo('upperB', 'EX062').some(k => k.codice === scelto), false);
    atteso('cambia · ancora nessuna scrittura', a.chiamate('schede_utente', 'insert').length + a.chiamate('schede_utente', 'update').length, 0);
    const r = await a.win.accettaBloccoNuovo();
    const ins = a.chiamate('schede_utente', 'insert')[0];
    atteso('accetto dopo il cambio · la riga salvata ha la scelta e niente pool o parametri dentro', [r.ok, ins.payload.scheda.sessioni[0].exercises.some(e => e.codice === scelto), '_pools' in ins.payload.scheda, '_sp' in ins.payload.scheda.sessioni[0]], [true, true, false, false]);
  }
  // 3) «Accetto»: scheda nuova salvata, la vecchia spenta ma presente, inizio blocco = oggi
  {
    const a = await nuovo();
    await a.win.preparaBloccoNuovo();
    const r = await a.win.accettaBloccoNuovo();
    const spenta = a.chiamate('schede_utente', 'update').find(c => c.payload && c.payload.attiva === false);
    const ins = a.chiamate('schede_utente', 'insert')[0];
    atteso('accetto · la scheda di prima si spegne, non si cancella', [!!spenta, a.chiamate('schede_utente', 'delete').length, a.t.schede_utente.length], [true, 0, 3]);
    atteso('accetto · riga nuova: blocco 3, attiva, coi cardini segnati', [ins.payload.blocco_n, ins.payload.attiva, ins.payload.scheda.sessioni[0].exercises.filter(e => e.cardine).map(e => e.codice)], [3, true, ['EX001', 'EX020']]);
    atteso('accetto · la nota non e\' il segnaposto del dry-run', /dry-run/.test(ins.payload.scheda.reasoning || ''), false);
    const up = a.chiamate('profiles', 'update').find(c => c.payload && c.payload.train_start_date);
    atteso('accetto · inizio blocco = oggi, in profilo e in memoria', [up && up.payload.train_start_date, a.ST.profile.train_start_date], [OGGI, OGGI]);
    atteso('accetto · finestra chiusa, esito ok', [a.win.document.getElementById('blocco-nuovo-sheet'), r && r.ok], [null, true]);
    atteso('accetto · il conteggio riparte: settimana 1', a.win.getCycleWeekInfo().weekNum, 1);
  }
  // 4) se il salvataggio fallisce, la scheda di prima torna attiva e il profilo non si tocca
  {
    const a = await nuovo();
    await a.win.preparaBloccoNuovo();
    a.t.__rifiuta = { schede_utente: { code:'42501', message:'permission denied' } };
    const r = await a.win.accettaBloccoNuovo();
    const riaccesa = a.chiamate('schede_utente', 'update').find(c => c.payload && c.payload.attiva === true && c.filters.some(f => f[1] === 'id' && f[2] === 's2'));
    atteso('fallimento · esito non ok, la scheda di prima viene riaccesa per id', [r && r.ok, !!riaccesa], [false, true]);
    atteso('fallimento · profilo non toccato, finestra ancora aperta', [a.chiamate('profiles', 'update').length, !!a.win.document.getElementById('blocco-nuovo-sheet')], [0, true]);
  }
  // 5) la card nel Piano: a fine blocco c'e', a inizio blocco no
  {
    const a = await nuovo();
    a.ST.page = 'training'; a.ST.trainTab = 'piano';
    a.win.renderTraining();
    atteso('card · a 41 giorni dall\'inizio compare, nomina il Blocco 3', /Blocco 3/.test((a.win.document.getElementById('blocco-nuovo-card') || {}).textContent || ''), true);
    const b = await nuovo({ inizio:'2026-09-28', workouts:[] });
    b.ST.page = 'training'; b.ST.trainTab = 'piano';
    b.win.renderTraining();
    atteso('card · a inizio blocco (6 giorni, settimana 1) non c\'e\'', b.win.document.getElementById('blocco-nuovo-card'), null);
  }
  console.log(ko ? ko + ' KO' : 'tutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
