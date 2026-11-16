// Training 370 (16 novembre 2026): il blocco nuovo di Ignazio e gli attrezzi che ha davvero. Una riga con un CARICO e un
// appoggio («manubri;panca», «cavo;maniglie») passava come nativa con il solo appoggio: «Rematore manubri panca piana» nella
// sua scheda si faceva sulla panca senza carico. 41 righe del catalogo del 16 novembre per la sua attrezzatura
// (tools/banco/dati/catalogo_carico_appoggio_20261116.json). La regola resta una, ZTCoachRules.attrezziCasa.
// Dal 16 novembre sera anche la riga sotto il nome col surrogato («Con l'elastico al posto del bilanciere»), sez. 5 e 6.
//   node tools/banco/prova_training_370.js
const fs = require('fs'), path = require('path');
const R = require('../../shared/coach_rules.js');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(92), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const RIGHE = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'catalogo_carico_appoggio_20261116.json'), 'utf8'));
const MISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'catalogo_righe_miste_20261101.json'), 'utf8'));
// l'attrezzatura vera di Ignazio (profilo del 16 novembre)
const IGNAZIO = ['elastico', 'barra', 'sbarra', 'panca', 'fitball', 'corpo libero', 'corda doppia', 'cavigliere', 'maniglie', 'barra_corta', 'barra_lunga'];
const ha = (lista) => { const s = new Set(R.attrezziConAlias(lista)); return (t) => s.has(t); };
const casa = (ex, lista) => R.attrezziCasa(ex, ha(lista));
// la regola fino al 15 novembre (Training 550), copiata, per dire cosa cambia e cosa no
const prima = (ex, h0) => {
  const h = (a) => a === 'corpo_libero' || h0(a);
  const lista = (s, sep) => String(s || '').toLowerCase().split(sep).map(x => x.trim()).filter(Boolean);
  const nativi = lista(String(ex.attrezzo || '').toLowerCase().trim().replace(/\s+/g, '_'), ';');
  const surr = lista(ex.surrogato_attrezzo, '+').map(a => a.replace(/\s+/g, '_'));
  const surrOk = surr.length > 0 && surr.every(h);
  const col = (ok) => ok ? { ok: true, surrogato: false } : surrOk ? { ok: true, surrogato: true } : { ok: false, surrogato: false };
  if(!(nativi.includes('corpo_libero') && nativi.length > 1)) return col(nativi.some(h));
  const app = nativi.filter(a => ['panca', 'fitball', 'sbarra', 'trx', 'parallele'].includes(a));
  if(!app.every(h)) return col(false);
  const car = nativi.filter(a => R.CARICHI.includes(a));
  if(car.length && !car.some(h) && surrOk) return { ok: true, surrogato: true };
  return { ok: true, surrogato: false };
};

// 1 · la scheda di Ignazio e le 41 righe
{
  const ex076 = RIGHE.find(r => r.codice === 'EX076');
  atteso('1 · Rematore manubri panca piana senza manubri: prima nativo (panca), ora col surrogato elastico+panca', [prima(ex076, ha(IGNAZIO)), casa(ex076, IGNAZIO)], [{ ok:true, surrogato:false }, { ok:true, surrogato:true }]);
  const esito = RIGHE.map(r => [r.codice, casa(r, IGNAZIO)]);
  atteso('1 · nessuna delle 41 righe passa più come nativa con il solo appoggio', esito.filter(([, e]) => e.ok && !e.surrogato).map(([c]) => c), []);
  atteso('1 · quelle col surrogato vanno con l\'elastico (27)', esito.filter(([, e]) => e.surrogato).length, 27);
  atteso('1 · quelle senza surrogato non si fanno senza manubri (14)', esito.filter(([, e]) => !e.ok).map(([c]) => c), ['EX010', 'EX065', 'EX330', 'EX336', 'EX343', 'EX525', 'EX526', 'EX531', 'EX532', 'EX535', 'EX536', 'EX537', 'EX543', 'EX544']);
  atteso('1 · prima passavano tutte e 41 come native', RIGHE.filter(r => { const e = prima(r, ha(IGNAZIO)); return e.ok && !e.surrogato; }).length, 41);
  atteso('1 · Wrist curl (manubri;panca;corda doppia): la corda doppia non basta, va con l\'elastico', casa(RIGHE.find(r => r.codice === 'EX069'), IGNAZIO), { ok:true, surrogato:true });
  atteso('1 · Pushdown al cavo con le sole maniglie: con l\'elastico', casa(RIGHE.find(r => r.codice === 'EX554'), IGNAZIO), { ok:true, surrogato:true });
}
// 2 · chi ha il carico e l'appoggio fa il nativo; chi ha il carico senza l'appoggio sceglibile no
{
  const ex076 = RIGHE.find(r => r.codice === 'EX076');
  atteso('2 · manubri e panca: il nativo', casa(ex076, ['manubri', 'panca']), { ok:true, surrogato:false });
  atteso('2 · manubri senza panca: l\'appoggio serve, e il surrogato (elastico+panca) neanche', casa(ex076, ['manubri', 'elastico']), { ok:false, surrogato:false });
  atteso('2 · palestra: tutto, come prima', R.puoFare({ ...ex076, luogo:'palestra' }, { tipoAllen:'palestra', attrezzatura:[] }), true);
}
// 3 · cosa non cambia: un attrezzo solo, soli carichi, le righe miste del 550
{
  const singole = [{ attrezzo:'manubri', surrogato_attrezzo:'elastico' }, { attrezzo:'sbarra' }, { attrezzo:'elastico;manubri' }, { attrezzo:'elastico;barra' }, { attrezzo:'macchina', surrogato_attrezzo:'elastico+panca' }, { attrezzo:'corpo libero' }, { attrezzo:'conetti', surrogato_attrezzo:'corpo libero' }, { attrezzo:'panca;foam roller' }];
  const insiemi = [[], ['elastico'], ['manubri'], ['panca'], IGNAZIO, ['manubri', 'panca', 'elastico']];
  const diversi = [];
  singole.concat(MISTE).forEach(r => insiemi.forEach(s => { if(JSON.stringify(prima(r, ha(s))) !== JSON.stringify(casa(r, s))) diversi.push((r.codice || r.attrezzo) + '[' + s.join('+') + ']'); }));
  atteso('3 · un attrezzo solo, soli carichi, le righe miste del 550: come prima', diversi, []);
}
// 4 · gli accessori degli elastici e la corda doppia
{
  const tok = (a) => ({ attrezzo: a });
  atteso('4 · barra corta e barra lunga aprono la barra (alias), le maniglie le maniglie, la corda doppia sé stessa', [R.puoFare({ attrezzo:'barra', luogo:'casa' }, { tipoAllen:'casa', attrezzatura:['barra_corta'] }), R.puoFare({ attrezzo:'barra', luogo:'casa' }, { tipoAllen:'casa', attrezzatura:['barra_lunga'] }), casa(tok('maniglie'), ['maniglie']).ok, casa(tok('corda doppia'), ['corda doppia']).ok], [true, true, true, true]);
  // le parole del catalogo del 16 novembre come attrezzo (solo quelle che servono): cavigliere e cavigliera non ci sono
  const catalogo = ['barra', 'maniglie', 'corda doppia', 'elastico', 'panca', 'sbarra', 'fitball', 'corda', 'manubri'].map((a, i) => ({ codice: 'X' + i, attrezzo: a }));
  atteso('4 · con l\'attrezzatura di Ignazio l\'unico che non apre niente sono le cavigliere (L2)', R.attrezziInerti(IGNAZIO, catalogo), ['cavigliere']);
}
// 5 · la riga sotto il nome col surrogato: ZTCoachRules.testoSurrogato (le combinazioni del catalogo del 16 novembre)
{
  const t = (attrezzo, surrogato_attrezzo) => R.testoSurrogato({ attrezzo, surrogato_attrezzo });
  atteso('5 · bilanciere → elastico', t('bilanciere', 'elastico'), "Con l'elastico al posto del bilanciere");
  atteso('5 · bilanciere;panca → elastico: la panca c\'è in tutti e due, non si nomina', t('bilanciere;panca', 'elastico'), "Con l'elastico al posto del bilanciere");
  atteso('5 · manubri;panca → elastico+panca', t('manubri;panca', 'elastico+panca'), "Con l'elastico al posto dei manubri");
  atteso('5 · cavi → elastico+panca', t('cavi', 'elastico+panca'), "Con l'elastico e la panca al posto dei cavi");
  atteso('5 · cavo;maniglie → elastico: si sostituisce il carico', t('cavo;maniglie', 'elastico'), "Con l'elastico al posto del cavo");
  atteso('5 · kettlebell;manubri → elastico', t('kettlebell;manubri', 'elastico'), "Con l'elastico al posto del kettlebell e dei manubri");
  atteso('5 · conetti → corpo libero', t('conetti', 'corpo libero'), 'A corpo libero al posto dei conetti');
  atteso('5 · box → panca', t('box', 'panca'), 'Con la panca al posto del box');
  atteso('5 · parallele → elastico', t('parallele', 'elastico'), "Con l'elastico al posto delle parallele");
  atteso('5 · senza surrogato: niente', [t('manubri', ''), t('elastico', 'elastico')], ['', '']);
}
// 6 · nell'app: card della seduta, scheda dell'esercizio, «Cambia per oggi», anteprima del blocco nuovo e i suoi «Cambia ›»
(async () => {
  process.env.TZ = 'Europe/Rome';
  const { boot } = require('./banco');
  const U = 'u1', OGGI = '2026-11-16';
  const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ').trim();
  const dormi = (ms) => new Promise(r => setTimeout(r, ms));
  const catalogo = [
    { codice:'EX027', nome:'French press bilanciere panca piana', pattern:'isolamento', gruppo_target:'tricipiti', livello:'intermedio', attrezzo:'bilanciere;panca', surrogato_attrezzo:'elastico', luogo:'casa;palestra', setup:'Sulla panca', esecuzione:'Estendi', muscoli:'tricipiti' },
    { codice:'EX028', nome:'Estensioni tricipiti elastico', pattern:'isolamento', gruppo_target:'tricipiti', livello:'principiante', attrezzo:'elastico', luogo:'casa', setup:'In piedi', esecuzione:'Estendi', muscoli:'tricipiti' },
    { codice:'EX029', nome:'Kickback manubri', pattern:'isolamento', gruppo_target:'tricipiti', livello:'principiante', attrezzo:'manubri', surrogato_attrezzo:'elastico', luogo:'casa;palestra', setup:'Busto in avanti', esecuzione:'Estendi', muscoli:'tricipiti' },
    { codice:'EX020', nome:'Rematore elastico', pattern:'tirata orizzontale', gruppo_target:'dorsali', livello:'intermedio', attrezzo:'elastico', luogo:'casa' },
  ];
  const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[
    { codice:'EX027', name:'French press bilanciere panca piana', sets:3, reps:'10-12', rest_sec:75, iso:true, eq:'elastico', isSurrogato:true },
    { codice:'EX020', name:'Rematore elastico', sets:3, reps:'6-10', rest_sec:90, eq:'elastico' },
  ] } ] };
  const t0 = {
    profiles:[{ id:U, first_name:'X', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', tipo_allenamento:'casa', attrezzatura:['elastico','panca','corpo_libero'], note_salute:'Esperienza: avanzato' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
  const b = boot(t0, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'x@y' }; ST.profile = t0.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {};
  b.win.callAI = async () => '';
  b.win.fetchExerciseMedia = async () => ({ status:'missing' });
  const doc = b.win.document;
  const pagina = () => testo(doc.getElementById('page-training').innerHTML);
  const RIGA = "Con l'elastico al posto del bilanciere";
  const ex27 = b.win.getTrainingSession('upperA').exercises[0];
  atteso('6 · loadActiveScheda mette la riga sull\'esercizio col surrogato (dalla riga di catalogo)', [ex27.rigaSurrogato, b.win.getTrainingSession('upperA').exercises[1].rigaSurrogato || null], [RIGA, null]);
  b.win.renderTraining();
  atteso('6 · card della seduta: la riga sotto il nome, una volta', pagina().split(RIGA).length - 1, 1);
  await b.win.openExerciseAI('French press bilanciere panca piana', 'upperA');
  await dormi(20);
  const p2 = pagina();
  atteso('6 · scheda dell\'esercizio: la riga al posto di «Versione adattata»', [p2.split(RIGA).length - 1 >= 2, /Versione adattata/.test(p2)], [true, false]);
  ST.exerciseAIOpen = null;
  b.win.apriCambioOggi('upperA', 'Rematore elastico');
  ST.cambioOggi = { sid:'upperA', exName:'French press bilanciere panca piana', stato:'pronto', candidati: [
    { riga: catalogo[2], alternativa:false, piuFacile:false, pulita:true }, { riga: catalogo[1], alternativa:false, piuFacile:false, pulita:true } ] };
  b.win.renderTraining();
  const p3 = testo((doc.getElementById('cambio-oggi-sheet') || {}).innerHTML || '');
  atteso('6 · «Cambia per oggi»: la riga sotto il Kickback manubri, niente sotto quello all\'elastico', [p3.includes("Con l'elastico al posto dei manubri"), (p3.match(/al posto/g) || []).length], [true, 1]);
  const nuovo = b.win._coCostruisci(catalogo[2], ex27);
  atteso('6 · «Cambia per oggi»: l\'esercizio scelto porta la riga in seduta', nuovo.rigaSurrogato, "Con l'elastico al posto dei manubri");
  ST.cambioOggi = null;
  // anteprima del blocco nuovo: il generatore mette la riga, la diff la porta, l'anteprima e «Cambia ›» la mostrano
  const pool = catalogo.map(c => ({ ...c, _surrogato: c.codice === 'EX027' || c.codice === 'EX029' }));
  const nuova = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', exercises: [ { codice:'EX027', name:'French press bilanciere panca piana', sets:3, reps:'10-12', isSurrogato:true, rigaSurrogato: R.testoSurrogato(catalogo[0]) } ] } ], _pools: { poolPrincipali: pool } };
  ST.bloccoNuovo = { scheda: nuova, diff: b.win._diffBloccoNuovo(nuova, ST.schedaAttiva.scheda), partenze: {} };
  b.win.renderBloccoNuovoSheet();
  const p4 = testo((doc.getElementById('blocco-nuovo-sheet') || {}).innerHTML || '');
  atteso('6 · anteprima del blocco nuovo: la riga sotto il nome', p4.includes(RIGA), true);
  ST.bloccoNuovo.cambio = { sid:'upperA', codice:'EX027' };
  b.win.renderBloccoNuovoSheet();
  const p5 = testo((doc.getElementById('blocco-nuovo-sheet') || {}).innerHTML || '');
  atteso('6 · «Cambia ›» dell\'anteprima: la riga sotto il Kickback, niente «versione casalinga»', [p5.includes("Con l'elastico al posto dei manubri"), /versione casalinga/.test(p5)], [true, false]);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

