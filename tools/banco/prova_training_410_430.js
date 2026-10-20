// Due segnalazioni di Ignazio (20 ottobre 2026):
//   410 · nel recupero fra due esercizi il riquadro con la serie dell'esercizio APPENA FATTO non serve:
//         resta solo la prima serie di quello che arriva, a tutta larghezza (scelta di Ignazio); fra due
//         serie dello stesso esercizio «Serie n salvata» resta
//   430 · «variante più difficile» senza dire quale: ora il nome dal catalogo (ZTCoachRules.varianteDifficile,
//         stessa famiglia e livello sopra; la colonna `variante_difficile` del foglio, quando c'è, vince),
//         e senza una più difficile lo si dice e si sale di ripetizioni. E «0 lbs» a corpo libero → «corpo libero»
// Parte 1: la regola pura sulle righe vere del catalogo (tools/biblioteca-nomi/esiti/catalogo_per_sheet.csv).
// Parte 2: l'app vera.
//   node tools/banco/prova_training_410_430.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const R = require('../../shared/coach_rules.js');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-20';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// ── Il catalogo vero (CSV con virgolette: un lettore minimo) ──
function leggiCsv(file){
  const s = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const righe = []; let campo = '', riga = [], virg = false;
  for(let i = 0; i < s.length; i++){
    const c = s[i];
    if(virg){ if(c === '"' && s[i+1] === '"'){ campo += '"'; i++; } else if(c === '"') virg = false; else campo += c; continue; }
    if(c === '"') virg = true;
    else if(c === ','){ riga.push(campo); campo = ''; }
    else if(c === '\n' || c === '\r'){ if(c === '\r' && s[i+1] === '\n') i++; riga.push(campo); campo = ''; if(riga.length > 1) righe.push(riga); riga = []; }
    else campo += c;
  }
  if(campo || riga.length){ riga.push(campo); righe.push(riga); }
  const [testa, ...dati] = righe;
  return dati.map(r => Object.fromEntries(testa.map((h, i) => [h, r[i] || ''])));
}
const CAT = leggiCsv(path.join(__dirname, '../biblioteca-nomi/esiti/catalogo_per_sheet.csv'));
const per = (c) => CAT.find(x => x.codice === c);
const casa = { tipoAllen:'casa', attrezzatura:['elastico', 'corpo_libero'] };

// ── Parte 1: la regola ──
let v = R.varianteDifficile(per('EX545'), CAT, casa);
atteso('430 · Piegamenti diamante → Piegamenti mani incrociate (rimanda al diamante, livello sopra)', v && [v.codice, v.nome, v.via], ['EX694', 'Piegamenti mani incrociate', 'rimando']);
v = R.varianteDifficile(per('EX546'), CAT, casa);
atteso('430 · Diamante sulle ginocchia → Piegamenti diamante (alternativa scritta, più difficile)', v && [v.codice, v.via], ['EX545', 'alternativa']);
atteso('430 · la famiglia resta quella: mai un Dip o una panca per un piegamento', v && /^Piegamenti/.test(R.varianteDifficile(per('EX384'), CAT, casa).nome), true);
atteso('430 · al livello più alto della famiglia: nessuna', R.varianteDifficile(per('EX582'), CAT, casa), null);
v = R.varianteDifficile(per('EX545'), CAT, { ...casa, inScheda:['EX694'] });
atteso('430 · chi è già nella seduta non si propone', v && v.codice !== 'EX694', true);
v = R.varianteDifficile({ ...per('EX545'), variante_difficile:'EX380' }, CAT, casa);
atteso('430 · la colonna del foglio, quando c\'è, vince sulla regola', v && [v.codice, v.via], ['EX380', 'foglio']);
atteso('430 · stessi ingressi, stessa scelta', JSON.stringify(R.varianteDifficile(per('EX545'), CAT, casa)) === JSON.stringify(R.varianteDifficile(per('EX545'), CAT.slice().reverse(), casa)), true);

// ── Parte 2: l'app vera ──
const riga = (c, extra) => ({ ...per(c), ...extra });
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
  { codice:'EX545', name:'Piegamenti diamante', sets:3, reps:'4-6', rest_sec:90 },
  { codice:'EX582', name:'Piegamenti estensione tricipiti', sets:2, reps:'4-6', rest_sec:90 },
  { codice:'EX001', name:'Chest press', sets:1, reps:'6-10', rest_sec:120 },
] } ] };
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', tipo_allenamento:'casa', attrezzatura:['elastico', 'corpo_libero'] }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: CAT.filter(x => /^Piegamenti/.test(x.nome) || x.codice === 'EX001').map(x => ({ ...x,
      progressione: ['EX545', 'EX582'].includes(x.codice) ? 'variante più difficile' : 'carico', unilaterale:'no' }))
      // Recovery Day: EX120 col testo riscritto sulla GIF (finto, riconoscibile)
      .concat([{ codice:'EX120', nome:'Affondo basso con rotazione', pattern:'mobilita', livello:'principiante', attrezzo:'corpo libero', luogo:'casa',
        setup:'In affondo basso, ginocchio dietro a terra.', esecuzione:'Porta le mani al petto. Ruota il busto verso la gamba avanti.', errori:'Ginocchio avanti che cade dentro.' }]),
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
const aspetta = (ms) => new Promise(r => setTimeout(r, ms || 40));
async function nuovo(){
  const t = fixture();
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  b.win.callAI = async () => '';
  b.win.fetchExerciseMedia = async () => ({ status:'missing' });
  b.win.renderTraining();
  await aspetta();
  const doc = b.win.document;
  const scegli = (id, val) => { const el = doc.getElementById(id); el.value = val; el.dispatchEvent(new b.win.Event('change', { bubbles:true })); };
  // come nell'app: «Fine serie» fa partire il recupero e apre il registro dentro il foglio; salvata la
  // serie, il registro si chiude e restano i riquadri
  const salva = async (nome, n, reps, rir, carico) => {
    b.win.openTrainExec('upperA', nome, n);
    b.win.trainExecFinishSet();
    scegli('tl-reps', String(reps)); scegli('tl-rir', String(rir)); ST.trainLogResist = carico;
    await b.win.saveTrainingSet();
    ST.trainLogOpen = null;
    b.win.renderTraining();
    await aspetta();
  };
  const riquadri = () => [...doc.querySelectorAll('.rest-modal-overlay .rest-card')].map(x => testo(x.innerHTML));
  return { ...b, ST, t, doc, salva, riquadri, pagina: () => testo(doc.getElementById('page-training').innerHTML) };
}

(async () => {
  // 430 · diamante in cima al range col RIR giusto: la PROSSIMA nomina la variante, il carico è «corpo libero»
  {
    const a = await nuovo();
    atteso('430 · la ricerca della più difficile parte già col disegno della seduta', (a.ST.variantiFacili || {})['upperA_Piegamenti diamante_su'] && a.ST.variantiFacili['upperA_Piegamenti diamante_su'].stato, 'pronta');
    await a.salva('Piegamenti diamante', 1, 6, 2, 0);
    const r = a.riquadri();
    atteso('410 · fra due serie dello stesso esercizio due riquadri: «Serie 1 salvata», con «corpo libero» e non «0 lbs»', [r.length, r[0]], [2, 'Serie 1 salvata ✓ S1 · 6r · corpo libero · RIR 2']);
    atteso('430 · PROSSIMA: «variante più difficile: Piegamenti mani incrociate EX694 ›»', r[1], 'PROSSIMA S2: variante più difficile: Piegamenti mani incrociate EX694 › · riparti da 4 reps · RIR 2');
    atteso('430 · il nome apre il foglio della variante', /apriVarianteFacile\('upperA_Piegamenti diamante_su'\)/.test(a.doc.querySelector('.rest-card--next').innerHTML), true);
    a.win.apriVarianteFacile('upperA_Piegamenti diamante_su');
    const sheet = a.doc.getElementById('variante-facile-sheet');
    atteso('430 · il foglio dice «al posto di Piegamenti diamante» e offre «Faccio questa oggi»', [!!sheet && /AL POSTO DI Piegamenti diamante/.test(testo(sheet.innerHTML)), !!a.doc.getElementById('vf-cambia-oggi')], [true, true]);
    a.win.chiudiVarianteFacile();
    a.win.skipCountdown && a.win.skipCountdown();
    a.win.renderTraining();
    const pill = testo(a.doc.querySelector('.ex-set-pill-done').innerHTML);
    atteso('430 · la serie fatta nella card: «corpo libero», non «0 lbs»', [/corpo libero/.test(pill), /0 lbs/.test(pill)], [true, false]);
  }
  // 430 · in cima alla famiglia: lo dice e sale di ripetizioni (anche nel registro della serie dopo)
  {
    const a = await nuovo();
    atteso('430 · estensione tricipiti: la ricerca dice «nessuna»', a.ST.variantiFacili['upperA_Piegamenti estensione tricipiti_su'].stato, 'nessuna');
    await a.salva('Piegamenti estensione tricipiti', 1, 6, 2, 0);
    atteso('430 · PROSSIMA: «corpo libero · nessuna variante più difficile nel catalogo · sali a 7 reps»', a.riquadri()[1], 'PROSSIMA S2: corpo libero · nessuna variante più difficile nel catalogo · sali a 7 reps · RIR 2');
    const p = a.ST.trainProssima && a.ST.trainProssima['upperA_Piegamenti estensione tricipiti'];
    atteso('430 · il registro della serie 2 si compila con 7 ripetizioni', p && p.reps, 7);
  }
  // 410 · fra due esercizi: solo la prima serie di quello che arriva, a tutta larghezza
  {
    const a = await nuovo();
    await a.salva('Chest press', 1, 8, 2, 30);
    const cd = a.ST.trainCountdown;
    atteso('410 · ultima serie della Chest press: recupero verso un altro esercizio', [!!cd, cd && cd.traEsercizi], [true, true]);
    if(cd){
      const r = a.riquadri();
      const foglio = testo(a.doc.querySelector('.rest-modal-overlay').innerHTML);
      atteso('410 · un riquadro solo, «PRIMA SERIE · Piegamenti diamante», largo', [r.length, !!a.doc.querySelector('.rest-row-cards--una'), /^PRIMA SERIE · Piegamenti diamante/.test(r[0] || '')], [1, true, true]);
      atteso('410 · nel foglio niente «FATTO», «APPENA FATTA» né la serie della Chest press', /FATTO|APPENA FATTA|30 lbs/.test(foglio), false);
    }
  }
  // Recovery Day: EX120 prende i testi dal catalogo, non più la copia del World's greatest stretch
  {
    const a = await nuovo();
    const rec = a.win.eval('TRAINING_SESSIONS.recoveryUpper.exercises').filter(e => e.codice === 'EX120');
    const tutto = rec.map(e => JSON.stringify([e.setup, e.execution, e.commonErrors])).join(' ');
    atteso('EX120 · le due righe dx/sx leggono il testo del catalogo', [rec.length, rec.every(e => (e.execution || []).some(x => /Ruota il busto verso la gamba avanti/.test(x)))], [2, true]);
    atteso('EX120 · niente più «mano a terra» né il nome cambiato', [/a terra interna al piede|Mano (destra|sinistra) a terra/.test(tutto), rec.map(e => e.name)], [false, ['Affondo basso con rotazione dx', 'Affondo basso con rotazione sx']]);
  }
  // 420 · la traccia del recupero: un <audio> solo, coi tic e il bip dentro; mentre suona il tick tace
  for(const parte of [true, false]){
    const a = await nuovo();
    const fatti = [];
    a.win.Audio = class { constructor(){ this.src = ''; this.paused = true; this.ended = false; this._l = {}; }
      addEventListener(e, f){ this._l[e] = f; }
      play(){ fatti.push('play'); this.paused = false; return parte ? Promise.resolve() : Promise.reject(new Error('NotAllowedError')); }
      pause(){ fatti.push('pause'); this.paused = true; } };
    a.win.URL.createObjectURL = () => 'blob:traccia'; a.win.URL.revokeObjectURL = () => {};   // jsdom non li ha
    const conta = (nome) => { let n = 0; const orig = a.win[nome]; a.win[nome] = () => { n++; }; return () => { a.win[nome] = orig; return n; }; };
    const tic = conta('playPrepBeep'), stop = conta('playStopBeep');
    await a.salva('Piegamenti diamante', 1, 6, 2, 0);
    const cd = a.ST.trainCountdown;
    atteso(`420 · ${parte ? 'la traccia parte' : 'la traccia rifiutata'}: cd.traccia = ${parte}`, [!!cd, cd && !!cd.traccia, fatti.includes('play')], [true, parte, true]);
    cd.endTime = a.win.Date.now() + 4500; a.win.tickCountdown();
    cd.endTime = a.win.Date.now() - 100; a.win.tickCountdown();
    atteso(`420 · ${parte ? 'con la traccia il tick non suona tic né bip' : 'senza traccia i tic e il bip di sempre'}`, [tic() > 0, stop()], [!parte, parte ? 0 : 1]);
  }
  {
    const a = await nuovo();
    const fatti = [];
    a.win.Audio = class { constructor(){ this.ended = false; } addEventListener(){} play(){ fatti.push('play'); return Promise.resolve(); } pause(){ fatti.push('pause'); } };
    await a.salva('Piegamenti diamante', 1, 6, 2, 0);
    a.win.skipCountdown();
    atteso('420 · «Salta» prima della fine ferma la traccia', fatti[fatti.length - 1], 'pause');
    atteso('420 · la traccia dura il recupero più il bip: 90 s → 8000 campioni al secondo per 90,8 s', a.win._tracciaWav(90).size, 44 + Math.round(8000 * 90.8) * 2);
  }
  // caricoTesto: un posto solo per il carico a parole
  {
    const a = await nuovo();
    atteso('430 · caricoTesto: 0 → corpo libero, 30 → 30 lbs, Nera → banda, vuoto → niente', [a.win.caricoTesto(0), a.win.caricoTesto('0'), a.win.caricoTesto(30), a.win.caricoTesto('Nera'), a.win.caricoTesto(null)], ['corpo libero', 'corpo libero', '30 lbs', a.win.bandLabel('Nera'), '']);
    a.ST.profile.unit = 'kg';
    atteso('430 · caricoTesto con i kg del profilo', a.win.caricoTesto(12.5), '12.5 kg');
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
