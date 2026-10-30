// Training 490 (24 ottobre 2026) — sedute troppo lunghe: il Tabata spento di default e una serie in meno
// nella forza. Scelte di Ignazio coi pulsanti: il Tabata si riaccende nelle Impostazioni (in fondo a ogni
// seduta · solo in certi giorni della settimana · a parte, solo il timer); gli addominali restano in fondo;
// nelle sedute di forza i multiarticolari passano da 4 a 3 serie, recuperi uguali, subito e senza
// compensare (i femorali scendono da 10 a 9 serie a settimana). La scheda è quella vera di Ignazio (blocco
// del 4 ottobre, letta dal database il 24 ottobre), coi suoi Tabata e i codici del catalogo.
//   node tools/banco/prova_training_490.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
const SABATO = '2026-10-24', VENERDI = '2026-10-23';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const aspetta = (ms) => new Promise(r => setTimeout(r, ms || 30));
const testo = (el) => String((el && el.textContent) || '').replace(/\s+/g, ' ').trim();

// Il catalogo delle righe che servono (codice, nome, pattern, gruppo_target letti il 24 ottobre)
const cat = [
  ['EX482','Rematore manubri presa inversa panca inclinata','tirata orizzontale','dorsali'], ['EX505','Trazioni sbarra assistite elastico','tirata verticale','dorsali'],
  ['EX513','Dip macchina seduto','spinta verticale','tricipiti'], ['EX545','Piegamenti diamante','spinta orizzontale','tricipiti'],
  ['EX438','Croci inverse elastico','isolamento','deltoidi posteriori'], ['EX023','Pallof press con elastico','core','core anti-rotazione'], ['EX103','Russian twist','core','core rotazione'],
  ['EX644','Reverse hyper elastico panca piana','dominante anca','glutei'], ['EX647','Squat calcio laterale','dominante ginocchia','quadricipiti'],
  ['EX667','Squat skater una gamba','dominante ginocchia','quadricipiti'], ['EX064','Leg curl','isolamento','ischiocrurali'],
  ['EX188','Sit-up mani alla fronte','core','core flessione'], ['EX191','V-sit sforbiciata','core','core anti-estensione'],
  ['EX076','Rematore manubri panca piana','tirata orizzontale','dorsali'], ['EX079','Trazioni sbarra presa inversa','tirata verticale','dorsali'],
  ['EX514','Dip panca piedi rialzati','spinta verticale','tricipiti'], ['EX584','Piegamenti presa stretta ginocchia a terra','spinta orizzontale','tricipiti'],
  ['EX703','Alzate diagonali un braccio elastico gomito 90 gradi','isolamento','deltoidi laterali'], ['EX037','Plank laterale avambraccio','core','core anti-rotazione'],
  ['EX134','Crunch bicicletta','core','core rotazione'], ['EX648','Affondo barra elastico sul posto','dominante ginocchia','quadricipiti'],
  ['EX652','Stacco rumeno una gamba','dominante anca','ischiocrurali'], ['EX557','Calf raise una gamba','isolamento','polpacci'],
  ['EX136','Crunch sforbiciata ampia','core','core flessione'], ['EX156','Crunch isometrico barchetta','core','core anti-estensione'],
].map(([codice, nome, pattern, gruppo_target]) => ({ codice, nome, pattern, gruppo_target, uso:'principale', luogo:'casa', attrezzo:'elastico', livello:'intermedio', muscoli:'', setup:'', esecuzione:'', errori:'', zone_rischio:'' }))
  // i cardio del Tabata della scheda vera (pattern, uso, attrezzo, livello letti il 24 ottobre; senza zone di rischio:
  // il profilo di prova non ha limitazioni)
  .concat([
    ['EX031','Mountain climber controllato','corpo libero','intermedio'], ['EX048','Jumping jack low-impact','corpo libero','principiante;intermedio;avanzato'],
    ['EX049','Skip ginocchia alte','corpo libero','principiante;intermedio;avanzato'], ['EX050','Skater laterale senza salto','corpo libero','principiante;intermedio;avanzato'],
    ['EX051','Squat veloci a corpo libero','corpo libero','principiante;intermedio;avanzato'], ['EX116','Combo boxe (gancio-montante)','corpo libero',''],
    ['EX589','Boxe diretto alternato','corpo libero','principiante;intermedio;avanzato'], ['EX591','Boxe gancio','corpo libero','principiante;intermedio;avanzato'],
    ['EX592','Boxe jab','corpo libero','principiante;intermedio;avanzato'], ['EX593','Burpee','corpo libero','intermedio;avanzato'],
    ['EX594','Burpee navy seal','corpo libero','avanzato'], ['EX596','Camminata bear crawl','corpo libero','intermedio'],
    ['EX602','Corsa resistenza con elastico','elastico','intermedio;avanzato'], ['EX614','Spostamento laterale con tocco a terra','corpo libero','intermedio'],
  ].map(([codice, nome, attrezzo, livello]) => ({ codice, nome, pattern:'cardio_metabolico', gruppo_target:'', uso:'finisher', luogo:'casa;libero;palestra', attrezzo, livello, muscoli:'', setup:'', esecuzione:'', errori:'', zone_rischio:'' })));
const nome = (c) => cat.find(r => r.codice === c).nome;
const fz = (c, card) => ({ codice:c, name:nome(c), sets:4, reps:'4-6', rest_sec:180, ...(card ? { cardine:true } : {}) });
const ip = (c, card) => ({ codice:c, name:nome(c), sets:3, reps:'8-12', rest_sec:90, ...(card ? { cardine:true } : {}) });
const iso = (c) => ({ codice:c, name:nome(c), sets:3, reps:'12-15', rest_sec:75, iso:true });
const ten = (c) => ({ codice:c, name:nome(c), sets:3, reps:'20-40 sec', rest_sec:60, iso:true, durationBased:true });
const tabata = (...nomi) => ({ type:'tabata', round:8, work_sec:20, rest_sec:10, exercises: nomi.map(([codice, name]) => ({ codice, name })) });
const schedaVera = { obiettivo:'ricomposizione', sessioni: [
  { id:'upperA', name:'Upper A', type:'Forza', rir:2, rest:'3 min', exercises:[fz('EX482',1), fz('EX505'), fz('EX513',1), fz('EX545'), iso('EX438'), ten('EX023'), iso('EX103')],
    finisher: tabata(['EX593','Burpee'], ['EX048','Jumping jack low-impact'], ['EX116','Combo boxe (gancio-montante)'], ['EX614','Spostamento laterale con tocco a terra']) },
  { id:'lowerA', name:'Lower A', type:'Forza', rir:2, rest:'3 min', exercises:[fz('EX644',1), fz('EX647'), fz('EX667',1), iso('EX064'), iso('EX188'), ten('EX191')],
    finisher: tabata(['EX594','Burpee navy seal'], ['EX049','Skip ginocchia alte'], ['EX589','Boxe diretto alternato'], ['EX031','Mountain climber controllato']) },
  { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, rest:'90 sec', exercises:[ip('EX076',1), ip('EX079'), ip('EX514',1), ip('EX584'), iso('EX703'), ten('EX037'), iso('EX134')],
    finisher: tabata(['EX596','Camminata bear crawl'], ['EX050','Skater laterale senza salto'], ['EX591','Boxe gancio'], ['EX048','Jumping jack low-impact']) },
  { id:'lowerB', name:'Lower B', type:'Ipertrofia', rir:1, rest:'90 sec', exercises:[ip('EX648'), ip('EX652',1), ip('EX667',1), iso('EX557'), iso('EX136'), ten('EX156')],
    finisher: tabata(['EX602','Corsa resistenza con elastico'], ['EX051','Squat veloci a corpo libero'], ['EX592','Boxe jab'], ['EX049','Skip ginocchia alte']) },
] };

async function nuovo(o){
  o = o || {};
  const profilo = { id:U, first_name:'Ignazio', last_name:'Fiorito', m2_skipped:true, unit:'lbs', obiettivo:'ricomposizione', tipo_allenamento:'casa',
    attrezzatura:['elastico','sbarra','panca','corpo libero'], giorni_allenamento:4, volume_sessione:'completo', note_salute:'Esperienza: avanzato', train_start_date:'2026-10-04' };
  if(o.tabata !== undefined) profilo.tabata = o.tabata;
  if(o.giorni !== undefined) profilo.tabata_giorni = o.giorni;
  const t = {
    profiles:[profilo],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:55, scheda: JSON.parse(JSON.stringify(o.scheda || schedaVera)) }],
    esercizi_catalog: cat.map(r => ({ ...r })),
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
    ...(o.veri ? { __veri:['schede_utente'] } : {}),   // copie in lettura e update salvati, come il database vero
  };
  const b = boot(t, { now: (o.oggi || SABATO) + 'T07:00:00' });
  await b.avviato;
  const W = b.win, ST = W.eval('ST'), d = W.document;
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.activeDay = o.oggi || SABATO;
  await W.loadActiveScheda();
  W.callAI = async () => '';
  const seduta = (sid) => { ST.page = 'training'; ST.trainSession = sid; ST.trainAnticipato = sid; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {}; W.renderTraining(); return testo(d.getElementById('page-training')); };
  const programma = () => { ST.page = 'training'; ST.trainSession = null; ST.trainTab = 'piano'; W.renderTraining(); return d.getElementById('page-training'); };
  const scritture = (tab) => b.supa._calls.filter(c => c.table === tab && c.op !== 'select');
  return { ...b, W, ST, d, t, seduta, programma, scritture };
}

(async () => {
  // ── 1 · il Tabata ──
  {
    const a = await nuovo();
    atteso('1 · senza scelta nel profilo il Tabata è spento', a.W.tabataModo(), 'spento');
    atteso('1 · spento: in fondo a Upper A niente «Tabata finale» (il finisher resta nel jsonb)', [/TABATA FINALE/.test(a.seduta('upperA')), !!a.W.getTrainingSession('upperA').finisher], [false, true]);
    a.W.tabataFlowStart();
    atteso('1 · spento: il timer non parte', a.ST.trainTabataFlow, null);
    atteso('1 · spento: nel Programma nessun «Tabata a parte»', !!a.programma().querySelector('#tabata-a-parte'), false);
  }
  {
    const a = await nuovo({ tabata:'coda' });
    atteso('1 · «in fondo a ogni seduta»: il Tabata finale c\'è, coi 4 esercizi veri', /TABATA FINALE · ~4 MIN .*Burpee.*Jumping jack low-impact/.test(a.seduta('upperA')), true);
    a.W.tabataFlowStart();
    atteso('1 · e il timer parte sulla seduta', [a.ST.trainTabataFlow && a.ST.trainTabataFlow.sessionId, a.ST.trainTabataFlow && a.ST.trainTabataFlow.finisher.exercises[0].name], ['upperA', 'Burpee']);
    a.W.tabataFlowEnd();
  }
  {
    const sab = await nuovo({ tabata:'giorni', giorni:[6] });
    const ven = await nuovo({ tabata:'giorni', giorni:[6], oggi:VENERDI });
    atteso('1 · «solo in certi giorni» (sabato): il sabato c\'è, il venerdì no', [/TABATA FINALE/.test(sab.seduta('lowerA')), /TABATA FINALE/.test(ven.seduta('lowerA'))], [true, false]);
  }
  {
    const a = await nuovo({ tabata:'a_parte' });
    atteso('1 · «a parte»: in fondo alla seduta non c\'è', /TABATA FINALE/.test(a.seduta('upperA')), false);
    const card = a.programma().querySelector('#tabata-a-parte');
    // sabato = 6: (6 - 1) % 4 sedute = la seconda, Lower A
    atteso('1 · «a parte»: nel Programma, coi 4 esercizi di una seduta (a rotazione col giorno)', [!!card, /TABATA A PARTE · ~4 MIN/.test(testo(card)), /Burpee navy seal.*Skip ginocchia alte.*Boxe diretto alternato.*Mountain climber controllato/.test(testo(card))], [true, true, true]);
    const prima = a.supa._calls.filter(c => c.op !== 'select').length;
    a.W.tabataFlowStart('a_parte');
    atteso('1 · «a parte»: il timer parte senza una seduta aperta', [!!a.ST.trainTabataFlow, a.ST.trainTabataFlow && a.ST.trainTabataFlow.sessionId], [true, null]);
    a.W.renderTraining();
    atteso('1 · e si vede il timer a schermo intero', /TABATA · ROUND 1\/8/.test(testo(a.d.getElementById('page-training'))), true);
    a.W.tabataFlowEnd();
    atteso('1 · solo il timer: nessuna scrittura (né workouts né altro)', a.supa._calls.filter(c => c.op !== 'select').length - prima, 0);
  }

  // ── 2 · le Impostazioni ──
  {
    const a = await nuovo();
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    const sel = a.d.getElementById('set-tabata');
    const giorni = a.d.getElementById('set-tabata-giorni');
    atteso('2 · in Allenamento la voce Tabata, su «Spento», senza i giorni', [!!sel, sel && sel.value, giorni.style.display], [true, 'spento', 'none']);
    // salvare senza toccare il Tabata non lo scrive (prima della migrazione la colonna non c'è)
    await a.W.saveSettings(); await aspetta();
    atteso('2 · Salva senza cambiare il Tabata: nessuna scrittura del Tabata', a.scritture('profiles').filter(c => c.payload && 'tabata' in c.payload).length, 0);
    a.W.setVai('allenamento');
    sel.value = 'giorni'; a.W._setTabataGiorni();
    atteso('2 · «solo in certi giorni» mostra i sette giorni', [giorni.style.display, giorni.querySelectorAll('[data-giorno]').length], ['flex', 7]);
    await a.W.saveSettings(); await aspetta();
    atteso('2 · senza un giorno non salva e lo dice', [a.d.getElementById('set-err').textContent, a.scritture('profiles').filter(c => c.payload && 'tabata' in c.payload).length], ['Per il Tabata scegli almeno un giorno, oppure un\'altra voce.', 0]);
    a.W.toggleSetTabataGiorno(6); a.W.toggleSetTabataGiorno(3);
    await a.W.saveSettings(); await aspetta();
    const up = a.scritture('profiles').filter(c => c.payload && 'tabata' in c.payload);
    atteso('2 · col sabato e il mercoledì: una scrittura a parte, solo coi due campi', [up.length, up[0] && Object.keys(up[0].payload).sort(), up[0] && up[0].payload], [1, ['tabata', 'tabata_giorni'], { tabata:'giorni', tabata_giorni:[3, 6] }]);
    atteso('2 · il profilo in memoria segue, e l\'elenco lo dice', [a.ST.profile.tabata, a.W.tabataInCoda(SABATO), testo(a.d.querySelector('#settings-modal .set-voce[data-voce="allenamento"] .set-voce-sotto'))], ['giorni', true, '4 giorni a settimana · lbs · Tabata in certi giorni · sedute alle 07:00']);   // «sedute alle»: dal Training 540 il primo «Salva» scrive anche giorni e ora delle sedute
    a.W.setVai('allenamento'); a.d.getElementById('set-tabata').value = 'spento'; a.W._setTabataGiorni();
    await a.W.saveSettings(); await aspetta();
    const up2 = a.scritture('profiles').filter(c => c.payload && 'tabata' in c.payload).slice(-1)[0];
    atteso('2 · di nuovo spento: i giorni si tolgono', up2 && up2.payload, { tabata:'spento', tabata_giorni:null });
  }

  // ── 3 · una serie in meno nella forza ──
  {
    const a = await nuovo();
    const cambi = a.W.serieForzaDaTogliere(schedaVera);
    atteso('3 · nella scheda vera: 7 multiarticolari di forza da 4 a 3 (Upper A 4, Lower A 3)', [cambi.length, cambi.filter(c => c.sid === 'upperA').length, cambi.filter(c => c.sid === 'lowerA').length, [...new Set(cambi.map(c => c.da + '→' + c.a))]], [7, 4, 3, ['4→3']]);
    const min = (sid) => Math.round(cambi.filter(c => !sid || c.sid === sid).reduce((t, c) => t + c.sec, 0) / 6) / 10;
    atteso('3 · minuti risparmiati (30 s a serie più 3 minuti di recupero): Upper A 14, Lower A 10,5', [min('upperA'), min('lowerA'), Math.round(min() )], [14, 10.5, 25]);
    atteso('3 · con forza_performance non cambia niente (lì la forza è l\'obiettivo di ogni seduta)', a.W.serieForzaDaTogliere({ ...schedaVera, obiettivo:'forza_performance' }).length, 0);
    const card = a.programma().querySelector('#serie-forza-card');
    atteso('3 · nel Programma la card lo propone, coi minuti', [!!card, /3 serie invece di 4, stessi recuperi/.test(testo(card)), /Upper A e Lower A: circa 25 minuti in meno a settimana/.test(testo(card))], [true, true, true]);
    // il volume a settimana per muscolo, prima e dopo (riga dal catalogo: la scheda è del 4 ottobre)
    const riga = (ex) => cat.find(r => r.codice === ex.codice) || {};
    const vPrima = a.W.volumeSettimanale(schedaVera.sessioni, riga);
    const dopoS = JSON.parse(JSON.stringify(schedaVera)); dopoS.sessioni.forEach(s => s.exercises.forEach(e => { if(cambi.some(c => c.sid === s.id && c.codice === e.codice)) e.sets = 3; }));
    const vDopo = a.W.volumeSettimanale(dopoS.sessioni, riga);
    atteso('3 · femorali da 10 a 9 serie a settimana (scelta di Ignazio: senza compensare); dorsali e quadricipiti da 14 a 12', [vPrima.ischiocrurali, vDopo.ischiocrurali, vPrima.dorsali, vDopo.dorsali, vPrima.quadricipiti, vDopo.quadricipiti], [10, 9, 14, 12, 14, 12]);

    a.W.chiediConferma = async () => false;
    await a.W.accorciaSerieForza();
    atteso('3 · «Lascia così»: nessuna scrittura', a.scritture('schede_utente').length, 0);
    a.W.chiediConferma = async () => true;
    const n = await a.W.accorciaSerieForza();
    const up = a.scritture('schede_utente');
    const salvata = up[0] && up[0].payload.scheda;
    const sets = (sid) => salvata.sessioni.find(s => s.id === sid).exercises.map(e => e.sets);
    atteso('3 · «Sì, 3 serie»: una scrittura sulla riga attiva, 7 esercizi', [up.length, n, !!up[0] && up[0].filters.some(f => f[1] === 'id' && f[2] === 's1')], [1, 7, true]);
    atteso('3 · Upper A e Lower A: i multiarticolari a 3, isolamenti e addominali come prima', [sets('upperA'), sets('lowerA')], [[3, 3, 3, 3, 3, 3, 3], [3, 3, 3, 3, 3, 3]]);
    atteso('3 · recuperi, ripetizioni e ordine identici; gli addominali restano in fondo', salvata.sessioni.map(s => s.exercises.map(e => [e.codice, e.reps, e.rest_sec])), schedaVera.sessioni.map(s => s.exercises.map(e => [e.codice, e.reps, e.rest_sec])));
    atteso('3 · le sedute di ipertrofia non cambiano', [sets('upperB'), sets('lowerB')], [schedaVera.sessioni[2].exercises.map(e => e.sets), schedaVera.sessioni[3].exercises.map(e => e.sets)]);
    atteso('3 · dopo, la card non c\'è più e in Upper A si leggono 3 serie', [!!a.programma().querySelector('#serie-forza-card'), a.W.getTrainingSession('upperA').exercises[0].sets], [false, 3]);
  }

  // ── 4 · il generatore: le schede nuove nascono con 3 serie nella forza ──
  {
    const a = await nuovo();
    atteso('4 · la regola del giorno di forza: 3 serie da 4-6, 3 minuti di recupero', [a.W.eval('_DUP_COMPOUND_FORZA.sets'), a.W.eval('_DUP_COMPOUND_FORZA.reps_min + "-" + _DUP_COMPOUND_FORZA.reps_max'), a.W.eval('_DUP_COMPOUND_FORZA.rest_sec')], [3, '4-6', 180]);
    const gen = await a.W.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
    const forza = gen.sessioni.filter(s => s.type === 'Forza');
    const multi = forza.flatMap(s => s.exercises.filter(e => !e.iso && !e.durationBased));
    atteso('4 · nelle sedute di forza ogni multiarticolare ha 3 serie e 3 minuti di recupero', [forza.length > 0, multi.length > 0, [...new Set(multi.map(e => e.sets + '×' + e.rest_sec))]], [true, true, ['3×180']]);
    atteso('4 · e la scheda nuova non chiede più di accorciare', a.W.serieForzaDaTogliere(gen).length, 0);
    atteso('4 · il Tabata resta nel jsonb (si riaccende senza rigenerare)', gen.sessioni.filter(s => /^(upper|lower)/.test(s.id)).every(s => s.finisher && s.finisher.exercises.length === 4), true);
  }
  // ── 5 · i rilievi della revisione di 480+490 (24 ottobre 2026 sera) ──
  {
    // il Tabata «a parte» tiene acceso lo schermo da sé, lo richiede al rientro e lo lascia alla fine
    const a = await nuovo({ tabata:'a_parte' });
    const lock = { richieste:0, rilasci:0, ultimo:null };
    Object.defineProperty(a.W.navigator, 'wakeLock', { configurable:true, value: { request: async () => {
      lock.richieste++;
      const l = { _cb:null, addEventListener(ev, cb){ if(ev === 'release') this._cb = cb; }, async release(){ lock.rilasci++; if(this._cb) this._cb(); } };
      lock.ultimo = l; return l;
    } } });
    a.programma();
    a.W.tabataFlowStart('a_parte'); await aspetta();
    atteso('5 · Tabata «a parte»: chiede lo schermo acceso senza una seduta aperta', [a.ST.trainSession, lock.richieste], [null, 1]);
    if(lock.ultimo && lock.ultimo._cb) lock.ultimo._cb();          // il telefono lo toglie (app in secondo piano)
    a.d.dispatchEvent(new a.W.Event('visibilitychange')); await aspetta();
    atteso('5 · al rientro in primo piano lo richiede di nuovo', lock.richieste, 2);
    a.W.tabataFlowEnd(); await aspetta();
    atteso('5 · finito il Tabata lo lascia (nessuna seduta aperta)', lock.rilasci, 1);
  }
  {
    // «Passa a 3 serie» con un «Cambia per oggi» attivo su un multiarticolare di forza
    const a = await nuovo({ veri:true });
    await a.W.cambiaPerOggi('upperA', 'Trazioni sbarra assistite elastico', 'EX079');
    const sost = () => a.W.getTrainingSession('upperA').exercises.find(e => e.codice === 'EX079');
    atteso('5 · il cambio di oggi: EX079 al posto di EX505, 4 serie', [sost() && sost().sets, sost() && sost().oggiAlPostoDi.codice], [4, 'EX505']);
    a.W.chiediConferma = async () => true;
    await a.W.accorciaSerieForza();
    atteso('5 · dopo «Passa a 3 serie» anche il sostituto ha 3 serie e la card sparisce', [sost() && sost().sets, !!a.programma().querySelector('#serie-forza-card')], [3, false]);
    a.W.annullaCambioOggi('upperA', 'Trazioni sbarra presa inversa');
    const torna = a.W.getTrainingSession('upperA').exercises.find(e => e.codice === 'EX505');
    atteso('5 · «Torna a …» rimette EX505 con 3 serie', torna && torna.sets, 3);
  }
  {
    // su un secondo telefono la scheda è già a 3 serie, ma il cambio di oggi di questo telefono ne ha 4
    const a = await nuovo({ veri:true });
    await a.W.cambiaPerOggi('upperA', 'Trazioni sbarra assistite elastico', 'EX079');
    a.t.schede_utente[0].scheda.sessioni.forEach(s => { if(s.type === 'Forza') s.exercises.forEach(e => { if(!e.iso && !e.durationBased) e.sets = 3; }); });
    a.W.chiediConferma = async () => true;
    const n = await a.W.accorciaSerieForza();
    const sost = a.W.getTrainingSession('upperA').exercises.find(e => e.codice === 'EX079');
    atteso('5 · già fatto altrove: niente scritture, il sostituto si allinea a 3 e la card sparisce', [n, a.scritture('schede_utente').length, sost && sost.sets, !!a.programma().querySelector('#serie-forza-card')], [0, 0, 3, false]);
  }
  {
    // prima della migrazione la scelta del Tabata non si salva: allora il messaggio non dice «Salvato»
    const a = await nuovo();
    const brindisi = [];
    const vero = a.W.showToast; a.W.showToast = (msg, ico, ms) => { brindisi.push(msg); return vero(msg, ico, ms); };
    const from = a.supa.from.bind(a.supa);
    // la colonna non c'è ancora: solo la scrittura del Tabata risponde 42703, il resto passa
    a.supa.from = (tab) => {
      const q = from(tab);
      if(tab !== 'profiles') return q;
      return { select: (...x) => q.select(...x), upsert: (...x) => q.upsert(...x), insert: (...x) => q.insert(...x),
        update: (p) => (p && 'tabata' in p) ? { eq: () => Promise.resolve({ data:null, error:{ code:'42703', message:'column "tabata" does not exist' } }) } : q.update(p) };
    };
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    a.d.getElementById('set-tabata').value = 'coda'; a.W._setTabataGiorni();
    await a.W.saveSettings(); await aspetta();
    atteso('5 · Tabata non salvato: niente «Salvato», un messaggio solo che lo dice', [brindisi.includes('Salvato'), brindisi.filter(m => /tranne il Tabata/.test(m)).length, a.ST.profile.tabata], [false, 1, undefined]);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
