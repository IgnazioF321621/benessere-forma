// Training 390 (14 ottobre 2026) — Mobilità chiusa: cosa cambia nell'app.
//   1 · il Blocco Attivazione ha le sue immagini: il Vacuum addominale prende la GIF «Stomach vacuum» per slug
//       (vacuum-addominale, in biblioteca_gif, NON a catalogo), il Cat-Cow quella di EX029 quando ci sarà;
//   2 · sotto il nome inglese di Mobilità e stretching c'è la riga in italiano (`spiegazione` del catalogo),
//       nel riscaldamento, nella sua scheda e nel Recovery Day;
//   3 · i 33 esercizi nuovi con uso=riscaldamento (le righe vere consegnate da ZT-Catalogo, righe_nuove.tsv):
//       quali pesca il riscaldamento Lower, e che l'Upper resta sulla cuffia.
//   node tools/banco/prova_mobilita_390.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const URL_VACUUM = 'https://qxiyeiahpoiliwpqslpr.supabase.co/storage/v1/object/public/biblioteca-gif/Mobilita e Stretching/stomach-vacuum.gif';

// Le righe vere di Mobilità (25 colonne, BOM e CRLF tollerati: L14)
const tsv = fs.readFileSync(path.join(__dirname, '../catalogo/mobilita/righe_nuove.tsv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
const intest = tsv[0].split('\t');
const mobilita = tsv.slice(1).map(r => { const c = r.split('\t'); const o = {}; intest.forEach((h, i) => o[h] = c[i] || ''); delete o.nome_en; return o; });
const nuoviRisc = mobilita.filter(r => r.uso.split(';').includes('riscaldamento'));
const LOWER_KW = ['anca', 'glutei', 'adduttori', 'ischiocrurali', 'flessori', 'quadricipiti'];
const nuoviLower = nuoviRisc.filter(r => r.pattern === 'mobilita' && LOWER_KW.some(k => r.muscoli.toLowerCase().includes(k))).map(r => r.codice);

const base = { uso:'principale', luogo:'casa', attrezzo:'elastico', livello:'intermedio', muscoli:'', setup:'', esecuzione:'', errori:'', zone_rischio:'' };
const row = (codice, nome, pattern, gruppo_target) => ({ ...base, codice, nome, pattern, gruppo_target: gruppo_target || '' });
const principali = [
  row('EX001','Panca elastico','spinta orizzontale'), row('EX002','Piegamenti','spinta orizzontale'),
  row('EX010','Military press elastico','spinta verticale'), row('EX011','Pike push-up','spinta verticale'),
  row('EX020','Rematore elastico','tirata orizzontale'), row('EX021','Rematore invertito','tirata orizzontale'),
  row('EX030','Lat machine elastico','tirata verticale'), { ...row('EX031','Trazioni sbarra','tirata verticale'), attrezzo:'sbarra' },
  row('EX040','Squat elastico','dominante ginocchia'), row('EX041','Affondi','dominante ginocchia'), row('EX042','Squat bulgaro','dominante ginocchia'),
  row('EX050','Stacco rumeno elastico','dominante anca'), row('EX051','Hip thrust','dominante anca'),
  row('EX060','Alzate posteriori','isolamento','deltoidi posteriori'), row('EX061','Face pull elastico','isolamento','deltoidi posteriori'),
  row('EX062','Alzate laterali','isolamento','deltoidi laterali'), row('EX063','Curl elastico','isolamento','bicipiti'), row('EX064','Push down elastico','isolamento','tricipiti'),
  row('EX065','Ponte glutei','isolamento','glutei'), row('EX066','Leg curl elastico','isolamento','ischiocrurali'), row('EX067','Calf raise','isolamento','polpacci'),
  row('EX070','Pallof press','core','core anti-rotazione'), row('EX071','Russian twist','core','core rotazione'),
  row('EX072','Plank','core','core anti-estensione'), row('EX073','Crunch','core','core flessione'),
  { ...row('EX080','Extrarotazioni elastico','isolamento','cuffia rotatori'), uso:'riscaldamento' },
  { ...row('EX081','Face pull leggero','isolamento','cuffia rotatori'), uso:'riscaldamento' },
  // i due di Mobilità a catalogo da prima, coi nomi e le righe del 14 ottobre
  { ...row('EX123','Thread the needle','mobilita'), uso:'recupero;mobilita', muscoli:'toracico;spalle', spiegazione:"A quattro zampe, braccio sotto il corpo poi verso l'alto" },
  { ...row('EX120','Affondo basso con rotazione','mobilita'), uso:'riscaldamento', muscoli:'anca;glutei;flessori' },
  { ...row('EX124','Quadruped thoracic rotation','mobilita'), uso:'recupero;mobilita', muscoli:'toracico', spiegazione:'A quattro zampe, braccio che si apre verso il soffitto' },
];
const catalogo = [...principali, ...mobilita];

// Scheda attiva salvata prima della colonna: il riscaldamento Lower ha un esercizio di Mobilità senza `spiegazione`
const scheda = { obiettivo:'ricomposizione', sessioni: [
  { id:'upperA', name:'Upper A', type:'Forza', rir:2, warmup:[{ codice:'EX080', name:'Extrarotazioni elastico' }], exercises:[ { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10', rest_sec:120 } ] },
  { id:'lowerA', name:'Lower A', type:'Forza', rir:2, warmup:[{ codice:'EX776', name:'Hip switches 90:90', setup:['Seduto'], execution:['Ruota'] }, { codice:'EX120', name:'Affondo basso con rotazione' }],
    exercises:[ { codice:'EX040', name:'Squat elastico', sets:3, reps:'6-10', rest_sec:120 } ] },
] };
function fixture(opts){
  const o = opts || {};
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', obiettivo:'ricomposizione', tipo_allenamento:'casa',
      attrezzatura:['elastico','sbarra'], giorni_allenamento:4, volume_sessione:'completo', note_salute:'Esperienza: avanzato', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    biblioteca_gif: o.senzaVacuum ? [] : [{ id:'g1', slug:'vacuum-addominale', nome_italiano:'Stomach vacuum', categoria:'Mobilita e Stretching', storage_path:'Mobilita e Stretching/stomach-vacuum.gif' }],
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
async function nuovo(opts){
  const o = opts || {};
  const t = fixture(o);
  const b = boot(t, { now: OGGI + 'T07:00:00', locale: o.locale });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  const media = [];
  b.win.fetchExerciseMedia = async (nome, codice) => { media.push(codice || nome); return { status:'missing' }; };
  b.win.callAI = async () => '';
  ST.page = 'training'; ST.trainSession = o.seduta || 'upperA'; ST.trainAnticipato = ST.trainSession; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  const doc = b.win.document;
  const pagina = () => testo(doc.getElementById('page-training').innerHTML);
  const letture = () => b.supa._calls.filter(c => c.table === 'biblioteca_gif').length;
  return { ...b, ST, t, doc, pagina, media, letture };
}
const aspetta = () => new Promise(r => setTimeout(r, 30));

(async () => {
  // 1 · il Blocco Attivazione con le immagini
  {
    const a = await nuovo();
    a.win.renderTraining();
    await aspetta();
    const mini = [...a.doc.querySelectorAll('.att-gif-mini')].map(i => i.getAttribute('src'));
    atteso('1 · il Vacuum ha la sua GIF nella lista, letta per slug da biblioteca_gif (storage_path)', mini, [URL_VACUUM]);
    atteso('1 · una lettura sola di biblioteca_gif; il Cat-Cow chiede al Worker col codice EX029', [a.letture(), a.media], [1, ['EX029']]);
    atteso('1 · la Respirazione e il Cat-Cow (EX029 senza GIF oggi) restano senza immagine', a.doc.querySelectorAll('.att-gif-mini').length, 1);
    a.win.activationFlowStart(); a.win.activationFlowSkip();
    a.win.renderTraining();
    const hero = a.doc.querySelector('.att-gif');
    atteso('1 · nel flusso, al Vacuum la GIF grande sotto il nome', [a.ST.trainActivationFlow.currentIdx, hero && hero.getAttribute('src')], [1, URL_VACUUM]);
    a.win.activationFlowSkip(); a.win.renderTraining();
    atteso('1 · al Cat-Cow niente GIF grande', !!a.doc.querySelector('.att-gif'), false);
    a.win.activationFlowEnd && a.win.activationFlowEnd();
    a.win.renderTraining(); a.win.renderTraining(); await aspetta();
    atteso('1 · ridisegnare non rilegge', [a.letture(), a.media.length], [1, 1]);
    atteso('1 · l\'indirizzo resta sul telefono', a.win.localStorage.getItem('zt_gif_slug_vacuum-addominale'), URL_VACUUM);
    a.win.activationFlowPause && a.win.activationFlowPause();
  }
  {
    const a = await nuovo({ locale: { 'zt_gif_slug_vacuum-addominale': URL_VACUUM } });
    a.win.renderTraining(); await aspetta();
    atteso('1 · con l\'indirizzo già sul telefono: zero letture, la GIF c\'è', [a.letture(), [...a.doc.querySelectorAll('.att-gif-mini')].length], [0, 1]);
  }
  {
    const a = await nuovo({ senzaVacuum:true });
    a.win.renderTraining(); await aspetta();
    atteso('1 · slug assente in biblioteca: nessuna immagine, nessun avviso, niente salvato', [a.doc.querySelectorAll('.att-gif-mini').length, a.win.localStorage.getItem('zt_gif_slug_vacuum-addominale')], [0, null]);
  }

  // 2 · la riga in italiano sotto il nome
  {
    const a = await nuovo({ seduta:'lowerA' });
    const s = a.win.getTrainingSession('lowerA');
    atteso('2 · scheda salvata prima della colonna: loadActiveScheda porta la spiegazione nel riscaldamento', s.warmup.map(w => w.spiegazione || null), ['Seduto, ginocchia piegate che cadono da un lato all\'altro', null]);
    atteso('2 · ST.catalogInfoByCodice la tiene anche per codice', a.ST.catalogInfoByCodice.get('EX123').spiegazione, "A quattro zampe, braccio sotto il corpo poi verso l'alto");
    a.win.renderTraining();
    const righe = [...a.doc.querySelectorAll('.ex-spiegazione')].map(e => e.textContent);
    atteso('2 · nella lista del riscaldamento la riga sotto «Hip switches 90:90», non sotto l\'esercizio italiano', righe, ['Seduto, ginocchia piegate che cadono da un lato all\'altro']);
    a.win.openWarmupInfo(0);
    atteso('2 · e nella sua scheda «come si esegue»', /Hip switches 90:90 Seduto, ginocchia piegate/.test(a.pagina()), true);
    a.win.closeWarmupInfo();
    a.win.warmupFlowStart(); a.win.renderTraining();
    atteso('2 · e nel riquadro grande del flusso', /Hip switches 90:90 Seduto, ginocchia piegate/.test(testo(a.doc.querySelector('#page-training').innerHTML)), true);
    a.win.warmupFlowEnd();
  }
  {
    const a = await nuovo({ seduta:'recoveryUpper' });
    a.win.renderTraining();
    const pg = a.pagina();
    atteso('2 · nel Recovery Day la riga viene dal catalogo per codice (Thread the needle, EX123)', [/Thread the needle dx DX A quattro zampe, braccio sotto il corpo/.test(pg), /Thread the needle sx SX A quattro zampe, braccio sotto il corpo/.test(pg)], [true, true]);
    // Scelta di Ignazio: la rotazione da seduto non è la «Quadruped thoracic rotation» di EX124 (gesto diverso)
    atteso('2 · «Rotazione toracica seduto» resta da seduto: niente codice EX124, niente riga a quattro zampe', [/Rotazione toracica seduto dx DX 30s/.test(pg), /quattro zampe, braccio che si apre/.test(pg), a.win.getTrainingSession('recoveryUpper').exercises.filter(e => /Rotazione toracica seduto/.test(e.name)).map(e => e.codice || null)], [true, false, [null, null]]);
    atteso('2 · gli esercizi senza riga restano come prima (Hip CARs)', /Hip CARs dx DX 45s Hip CARs sx SX 45s/.test(pg), true);
  }

  // 3 · i 33 esercizi nuovi di riscaldamento nel generatore
  {
    atteso('3 · righe consegnate: 99 nuove, 33 con uso=riscaldamento, 11 adatte al Lower (mobilita + muscoli di anca e gambe)', [mobilita.length, nuoviRisc.length, nuoviLower.length], [99, 33, 11]);
    const a = await nuovo();
    const gen = await a.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
    const lower = gen.sessioni.filter(s => /^lower/.test(s.id));
    const upper = gen.sessioni.filter(s => /^upper/.test(s.id));
    const warmLower = lower.flatMap(s => s.warmup.map(w => w.codice));
    const warmUpper = upper.flatMap(s => s.warmup.map(w => w.codice));
    const ammessi = new Set([...nuoviLower, 'EX120']);
    atteso('3 · il riscaldamento Lower pesca solo fra gli 11 adatti (più EX120 di prima), due per seduta, mai doppioni', [warmLower.every(c => ammessi.has(c)), lower.every(s => s.warmup.length === 2), new Set(warmLower).size === warmLower.length], [true, true, true]);
    atteso('3 · nelle schede nuove entrano anche i nuovi', warmLower.some(c => nuoviLower.includes(c)), true);
    atteso('3 · ogni riscaldamento nuovo porta la sua riga in italiano nel jsonb', lower.flatMap(s => s.warmup).filter(w => nuoviLower.includes(w.codice)).every(w => typeof w.spiegazione === 'string' && w.spiegazione.length > 5), true);
    atteso('3 · l\'Upper resta sulla cuffia: i 22 nuovi di spalle, caviglie, polsi e busto non si pescano', [warmUpper.every(c => ['EX080','EX081'].includes(c)), gen.sessioni.flatMap(s => (s.warmup || []).map(w => w.codice)).some(c => nuoviRisc.some(r => r.codice === c) && !nuoviLower.includes(c))], [true, false]);
    atteso('3 · la scheda in uso non si tocca: dryRun, nessuna scrittura su schede_utente', a.supa._calls.filter(c => c.table === 'schede_utente' && c.op !== 'select').length, 0);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
