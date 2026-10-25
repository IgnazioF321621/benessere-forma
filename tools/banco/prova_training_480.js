// Training 480 (24 ottobre 2026) — Riscaldamento Upper completo: un esercizio per zona, e la zona la dice
// la colonna `zona` del catalogo (scelte di Ignazio: colonna nuova, uno per zona, la scheda in uso si
// aggiorna subito con «Rinnova il riscaldamento»; solo corpo libero ed elastico; lo stesso codice mai nel
// riscaldamento e poi nel lavoro dello stesso giorno). Upper: colonna toracica, scapole, spalle, polsi;
// Lower: anche, ginocchia, caviglie. Righe vere: le 88 righe di riscaldamento
// (e candidate) lette dal catalogo il 24 ottobre (tools/banco/dati/catalogo_riscaldamento_20261024.json)
// e le zone confermate da Ignazio con ZT-Catalogo (tools/catalogo/zone_480/zone_480.tsv: codice, zona,
// entra_nel_riscaldamento). Il profilo è quello di Ignazio (casa, la sua attrezzatura).
//   node tools/banco/prova_training_480.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-24';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};

// Le zone: TSV con intestazione, BOM e CRLF tollerati (L14)
const tsv = fs.readFileSync(path.join(__dirname, '../catalogo/zone_480/zone_480.tsv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
const intest = tsv[0].split('\t');
const consegna = tsv.slice(1).map(r => { const c = r.split('\t'); const o = {}; intest.forEach((h, i) => o[h] = (c[i] || '').trim()); return o; });
const zone = new Map(consegna.map(r => [r.codice, r.zona]));
const entrano = new Set(consegna.filter(r => r.entra_nel_riscaldamento === 'si').map(r => r.codice));
const UPPER = ['colonna toracica', 'scapole', 'spalle', 'polsi'];
const LOWER = ['anche', 'ginocchia', 'caviglie'];
const VOCABOLARIO = [...UPPER, ...LOWER];
const zoneDi = (c) => String(zone.get(c) || '').split(';').map(s => s.trim()).filter(Boolean);

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
];
// Le righe vere di riscaldamento, lette dal catalogo il 24 ottobre 2026
const dati = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati/catalogo_riscaldamento_20261024.json'), 'utf8'));
const vere = dati.righe.map(r => { const o = { ...base }; dati.colonne.forEach((h, i) => o[h] = r[i]); return o; });
// la colonna unilaterale, letta a parte (revisione di 480+490): «si» = un lato alla volta
vere.forEach(r => { r.unilaterale = dati.unilaterale.si.includes(r.codice) ? 'si' : dati.unilaterale.alternato.includes(r.codice) ? 'alternato' : 'no'; });
vere.forEach(r => { if(dati.nota_surrogato[r.codice]) r.nota_surrogato = dati.nota_surrogato[r.codice]; });
// zone a rischio e adattamenti veri (seconda revisione: Ignazio ha «lombare, ginocchia» nelle limitazioni)
const cautele = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati/catalogo_riscaldamento_cautele_20261024.json'), 'utf8')).righe;
vere.forEach(r => { if(cautele[r.codice]) { r.zone_rischio = cautele[r.codice][0]; r.adattamento = cautele[r.codice][1]; } });
const LIMITAZIONI = ['lombare', 'ginocchia'];
const conflitto = (r) => String(r.zone_rischio || '').split(';').map(s => s.trim()).some(z => LIMITAZIONI.includes(z));
const catalogoSenzaZone = [...principali, ...vere];
// dopo il sync: la zona di ogni riga, e «riscaldamento» in uso per le candidate che entrano
const conZone = () => catalogoSenzaZone.map(c => {
  const r = { ...c };
  if(zone.has(c.codice)) r.zona = zone.get(c.codice);
  if(entrano.has(c.codice) && !r.uso.split(';').includes('riscaldamento')) r.uso += ';riscaldamento';
  return r;
});

// La scheda in uso di Ignazio (blocco del 4 ottobre): riscaldamento di prima, esercizi di lavoro qualsiasi
const ex = (codice) => { const c = catalogoSenzaZone.find(r => r.codice === codice); return { codice, name: c.nome, sets:3, reps:'8-12', rest_sec:90 }; };
const wu = (codice) => { const c = catalogoSenzaZone.find(r => r.codice === codice); return { codice, name: c.nome, sets:2, reps:'15-20', warmup:true }; };
const schedaInUso = { obiettivo:'ricomposizione', sessioni: [
  { id:'upperA', name:'Upper A', type:'Forza', rir:2, warmup:[wu('EX416')], exercises:[ex('EX001'), ex('EX020'), ex('EX010'), ex('EX030'), ex('EX060')] },
  // in Lower A due esercizi di lavoro che sono anche di riscaldamento (uso principale;riscaldamento)
  { id:'lowerA', name:'Lower A', type:'Forza', rir:2, warmup:[wu('EX776'), wu('EX812')], exercises:[ex('EX040'), ex('EX669'), ex('EX050'), ex('EX625'), ex('EX072')] },
  { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, warmup:[wu('EX101')], exercises:[ex('EX002'), ex('EX021'), ex('EX011'), ex('EX031'), ex('EX062')] },
  { id:'lowerB', name:'Lower B', type:'Ipertrofia', rir:1, warmup:[wu('EX790'), wu('EX789')], exercises:[ex('EX041'), ex('EX051'), ex('EX066'), ex('EX073')] },
] };
const warmPrima = new Set(schedaInUso.sessioni.flatMap(s => s.warmup.map(w => w.codice)));

async function nuovo(catalogo, o){
  // o.altreSchede: schede vecchie spente in più (spostano la rotazione, rigenIdx)
  const vecchie = Array.from({ length: (o && o.altreSchede) || 0 }, (_, i) => ({ id:'v' + i, user_id:U, attiva:false, blocco_n:i + 1, scheda:{ sessioni:[] } }));
  const t = {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', obiettivo:'ricomposizione', tipo_allenamento:'casa',
      attrezzatura:['elastico','barra','sbarra','panca','fitball','corpo libero','corda doppia','cavigliere'], giorni_allenamento:4,
      volume_sessione:'completo', note_salute:'ferritina bassa · Esperienza: avanzato · Limitazioni: lombare, ginocchia', train_start_date:'2026-10-04' }],
    schede_utente:[...vecchie, { id:'s1', user_id:U, attiva:true, blocco_n:55, scheda: JSON.parse(JSON.stringify(schedaInUso)) }],
    esercizi_catalog: catalogo,
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
    ...(o && o.veri ? { __veri:['schede_utente'] } : {}),   // copie in lettura e update salvati, come il database vero
  };
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  b.win.callAI = async () => '';
  return { ...b, ST, t };
}
// Per ogni seduta, voce per voce: la zona del suo posto se la riga ce l'ha, altrimenti le zone che ha
// Le voci della seduta dopo la revisione (scelte di Ignazio): due leggere in testa (corsa, skip: pattern
// cardio_metabolico), poi le zone; nell'Upper la cuffia con l'elastico al posto di «spalle».
const VOCI = { upper:['leggera', 'leggera', 'colonna toracica', 'scapole', 'cuffia', 'polsi'], lower:['leggera', 'leggera', 'anche', 'ginocchia', 'caviglie'] };
const rigaDi = (c) => catalogoSenzaZone.find(r => r.codice === c) || {};
const copre = (r, voce) => voce === 'leggera' ? r.pattern === 'cardio_metabolico' : voce === 'cuffia' ? r.gruppo_target === 'cuffia rotatori' : zoneDi(r.codice).includes(voce);
// voce per voce: la voce del suo posto se la riga la copre, altrimenti cosa è
const vociCoperte = (s, voci) => s.warmup.map((w, i) => copre(rigaDi(w.codice), voci[i]) ? voci[i] : (rigaDi(w.codice).pattern + ' ' + zoneDi(w.codice).join(';')));

(async () => {
  // 0 · le zone consegnate: solo il vocabolario, solo righe di riscaldamento
  {
    const fuori = [...zone.keys()].filter(c => zoneDi(c).some(v => !VOCABOLARIO.includes(v)));
    const dopo = conZone();
    const ignote = [...zone.keys()].filter(c => !dopo.some(r => r.codice === c));
    const nonRisc = dopo.filter(r => zoneDi(r.codice).length && !r.uso.split(';').includes('riscaldamento')).map(r => r.codice);
    atteso('0 · ogni valore di zona sta nel vocabolario chiuso dei 7', fuori, []);
    atteso('0 · ogni codice consegnato è una riga di riscaldamento letta dal catalogo (o una candidata)', ignote, []);
    atteso('0 · dopo il sync ogni riga con una zona ha uso=riscaldamento', nonRisc, []);
  }

  // 1 · il blocco nuovo (generatore) con le zone
  {
    const a = await nuovo(conZone());
    const gen = await a.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
    const upper = gen.sessioni.filter(s => /^upper/.test(s.id));
    const lower = gen.sessioni.filter(s => /^lower/.test(s.id));
    // le righe che Ignazio può fare a casa, zona per zona (lo stesso filtro del generatore)
    const pool = a.win._trainGenFilterPool(conZone(), { tipoAllen:'casa', attrezzatura:a.ST.profile.attrezzatura, livello:'avanzato' }).poolRiscaldamento;
    // le righe possibili per una voce con le cautele: prima chi non tocca lombare e ginocchia, se no chi ha l'adattamento
    const cand = (voce) => { const tutte = pool.filter(r => copre(r, voce) && (!conflitto(r) || r.adattamento)); const sicure = tutte.filter(r => !conflitto(r)); return (sicure.length ? sicure : tutte).map(r => r.codice); };
    const vociTutte = gen.sessioni.flatMap(s => (s.warmup || []).map((w, i) => ({ s, w, voce: (/^upper/.test(s.id) ? VOCI.upper : VOCI.lower)[i] })));
    atteso('1 · cautele: chi tocca lombare o ginocchia entra solo se la sua voce non ha righe sicure', vociTutte.filter(({ w, voce }) => conflitto(rigaDi(w.codice)) && pool.some(r => copre(r, voce) && !conflitto(r))).map(({ s, w }) => s.id + ':' + w.codice), []);
    // (il testo arriva ripulito da _cleanCatalogText: maiuscola e accenti; si confronta senza)
    const piano = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
    atteso('1 · e porta l\'adattamento del catalogo nell\'avviso (corse e skip: «ginocchia: …»)', vociTutte.filter(({ w }) => conflitto(rigaDi(w.codice)) && !piano(w.alert).includes(piano(rigaDi(w.codice).adattamento).slice(-30))).map(({ s, w }) => s.id + ':' + w.codice), []);
    // corse e skip hanno tutte «ginocchia» fra le zone a rischio: nessuna è sicura, ognuna arriva col suo adattamento
    atteso('1 · le due voci leggere arrivano tutte con l\'adattamento nell\'avviso', gen.sessioni.flatMap(s => (s.warmup || []).slice(0, 2).map(w => !!w.alert)), gen.sessioni.flatMap(() => [true, true]));
    atteso('1 · ogni voce ha almeno una riga che Ignazio può fare a casa', [...new Set([...VOCI.upper, ...VOCI.lower])].filter(v => !cand(v).length), []);
    atteso('1 · Upper: due voci leggere, poi colonna toracica, scapole, la cuffia con l\'elastico, polsi', upper.map(s => vociCoperte(s, VOCI.upper)), upper.map(() => VOCI.upper));
    atteso('1 · Lower: due voci leggere, poi anche, ginocchia, caviglie', lower.map(s => vociCoperte(s, VOCI.lower)), lower.map(() => VOCI.lower));
    const tutti = gen.sessioni.flatMap(s => (s.warmup || []).map(w => w.codice));
    atteso('1 · corse e skip solo nelle due voci leggere; nessuna riga senza zona dopo (salvo la cuffia)', gen.sessioni.flatMap(s => (s.warmup || []).slice(2).filter(w => !zoneDi(w.codice).length && rigaDi(w.codice).gruppo_target !== 'cuffia rotatori').map(w => s.id + ':' + w.codice)), []);
    // A e B a turno fra extrarotazione e intrarotazione; a casa si vede l'elastico, non il cavo, con la nota del surrogato
    atteso('1 · la cuffia: EX101 ed EX416 a turno fra A e B, mostrate con l\'elastico e la nota del surrogato', upper.map(s => { const w = s.warmup[4] || {}; return [w.codice, w.eq, w.isSurrogato === true, /elastico/i.test((w.setup || []).join(' '))]; }).sort(), [['EX101', 'elastico', true, true], ['EX416', 'elastico', true, true]]);
    atteso('1 · mai due volte la stessa riga nella stessa seduta', gen.sessioni.every(s => new Set((s.warmup || []).map(w => w.codice)).size === (s.warmup || []).length), true);
    atteso('1 · e mai un esercizio di lavoro della seduta anche nel suo riscaldamento', gen.sessioni.flatMap(s => (s.warmup || []).filter(w => s.exercises.some(e => e.codice === w.codice)).map(w => s.id + ':' + w.codice)), []);
    // A e B: per ogni zona con più di una riga possibile, la B non ripete la A
    // ripetere è giusto solo se per quella voce non resta un'altra riga possibile, fuori da quelle già usate in A e B
    // (riscaldamento e lavoro: lo stesso codice non va nel riscaldamento e nel lavoro della stessa seduta)
    const ripetute = (sedute, voci) => voci.filter((v, i) => {
      const a = sedute[0].warmup[i], b = sedute[1].warmup[i];
      if (!a || !b || a.codice !== b.codice) return false;
      const usate = new Set([...sedute[0].warmup, ...sedute[1].warmup, ...sedute[0].exercises, ...sedute[1].exercises].map(w => w.codice));
      return cand(v).some(c => !usate.has(c));
    });
    atteso('1 · A e B: voce per voce esercizi diversi, quando la voce ha ancora una riga libera', [ripetute(upper, VOCI.upper), ripetute(lower, VOCI.lower)], [[], []]);
    atteso('1 · ogni voce porta la sua riga in italiano quando il catalogo ce l\'ha', gen.sessioni.flatMap(s => s.warmup || []).filter(w => { const r = catalogoSenzaZone.find(x => x.codice === w.codice); return r.spiegazione && w.spiegazione !== r.spiegazione; }).map(w => w.codice), []);
    // revisione: chi si fa un lato alla volta ha 30 secondi per lato (il flusso cambia lato), gli altri 1 minuto
    const voci = gen.sessioni.flatMap(s => s.warmup || []);
    // e gli allungamenti fermi (righe di recupero entrate nel riscaldamento) 30 secondi anche coi due lati insieme
    const atteseReps = (w) => { const r = conZone().find(x => x.codice === w.codice) || {}; return r.unilaterale === 'si' ? '30 sec per lato' : String(r.uso || '').split(';').includes('recupero') ? '30 sec' : '15-20'; };
    atteso('1 · tempi: «30 sec per lato» chi è unilaterale = si, «30 sec» gli allungamenti fermi, 15-20 leggero gli altri', voci.filter(w => w.reps !== atteseReps(w)).map(w => w.codice + ' ' + w.reps), []);
    atteso('1 · e almeno una voce per lato c\'è davvero (allungamenti del polpaccio, cerchi con un braccio…)', voci.some(w => w.reps === '30 sec per lato'), true);
    atteso('1 · dryRun: nessuna scrittura su schede_utente', a.supa._calls.filter(c => c.table === 'schede_utente' && c.op !== 'select').length, 0);
  }

  // 2 · senza la colonna (prima del sync): la regola di prima, cuffia nell'Upper e due per muscolo nel Lower
  {
    const a = await nuovo(catalogoSenzaZone.map(c => ({ ...c })));
    const gen = await a.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
    const upper = gen.sessioni.filter(s => /^upper/.test(s.id));
    const lower = gen.sessioni.filter(s => /^lower/.test(s.id));
    atteso('2 · senza zone l\'Upper resta sulla cuffia (gruppo_target), una voce', upper.map(s => s.warmup.map(w => w.codice).every(c => ['EX101', 'EX416'].includes(c)) && s.warmup.length === 1), upper.map(() => true));
    atteso('2 · senza zone il Lower resta a due per muscolo', lower.map(s => s.warmup.length), lower.map(() => 2));
  }

  // 3 · «Rinnova il riscaldamento» sulla scheda in uso (scelta di Ignazio: subito, solo il riscaldamento)
  {
    const a = await nuovo(conZone());
    a.win.chiediConferma = async () => true;
    const n = await a.win.rinnovaRiscaldamento();
    const scritture = a.supa._calls.filter(c => c.table === 'schede_utente' && c.op !== 'select');
    const up = scritture.find(c => c.op === 'update' && c.payload && c.payload.scheda);
    const dopo = up ? up.payload.scheda.sessioni : [];
    atteso('3 · una scrittura sola, sulla riga attiva, per id', [scritture.length, !!up && up.filters.some(f => f[1] === 'id' && f[2] === 's1')], [1, true]);
    atteso('3 · cambiano tutte e quattro le sedute', n, 4);
    // i campi salvati (il database finto ridà lo stesso oggetto che l'app arricchisce in memoria coi muscoli;
    // quello vero una copia fresca)
    const salvati = (s) => s.exercises.map(e => [e.codice, e.name, e.sets, e.reps, e.rest_sec]);
    atteso('3 · esercizi di lavoro, serie e ripetizioni identici a prima', dopo.map(salvati), schedaInUso.sessioni.map(salvati));
    atteso('3 · il riscaldamento nuovo: 6 voci nell\'Upper, 5 nel Lower (2 leggere più le zone)', dopo.map(s => s.warmup.length), [6, 5, 6, 5]);
    // chi c'era nel blocco di prima torna solo se la sua zona non ha altre righe a casa
    const pool = a.win._trainGenFilterPool(conZone(), { tipoAllen:'casa', attrezzatura:a.ST.profile.attrezzatura, livello:'avanzato' }).poolRiscaldamento;
    const altre = (c) => pool.some(r => r.codice !== c && !warmPrima.has(r.codice) && zoneDi(r.codice).some(z => zoneDi(c).includes(z)));
    atteso('3 · e preferisce chi nel blocco di prima non c\'era', dopo.flatMap(s => s.warmup.map(w => w.codice)).filter(c => warmPrima.has(c) && altre(c)), []);
    await a.win.loadActiveScheda();
    a.ST.page = 'training'; a.ST.trainSession = 'upperA'; a.ST.trainAnticipato = 'upperA'; a.ST.lastLoggedSets = {}; a.ST.aiCue = a.ST.aiCue || {};
    a.win.renderTraining();
    const pg = a.win.document.getElementById('page-training').textContent.replace(/\s+/g, ' ');
    atteso('3 · in Training la card dice «6 esercizi · 1 min ciascuno»', /6 esercizi · 1 min ciascuno/.test(pg), true);
    // la regola promessa a Ignazio: lo stesso codice non va nel riscaldamento e poi nella seduta dello stesso giorno
    atteso('3 · nessun esercizio di lavoro della scheda in uso finisce nel riscaldamento della sua seduta (EX669 in Lower A)', dopo.flatMap(s => s.warmup.filter(w => s.exercises.some(e => e.codice === w.codice)).map(w => s.id + ':' + w.codice)), []);
  }

  // 4 · la stessa regola dove un esercizio di lavoro entra dopo il riscaldamento
  {
    const a = await nuovo(conZone());
    const riga = (c) => ({ ...conZone().find(r => r.codice === c) });
    // il volume aggiunge un isolamento per i glutei: non quello che la seduta ha già nel riscaldamento
    const seduta = { splitType:'lower', occurrenceIdx:0, resolvedType:'Forza', sessionParams:{}, exercises:[], warmup:[{ codice:'EX625' }] };
    a.win._trainGenRiempiVolume([seduta], 'ricomposizione', { poolPrincipali:[riga('EX625'), riga('EX627')] }, new Set(), 0, null);
    atteso('4 · il volume non mette fra gli esercizi chi è nel riscaldamento della seduta', seduta.exercises.map(e => e.codice), ['EX627']);
    // «Cambia ›» nell'anteprima del blocco nuovo
    a.ST.bloccoNuovo = { scheda: { _pools: { poolPrincipali:[riga('EX625'), riga('EX627'), riga('EX629')] },
      sessioni:[{ id:'lowerA', exercises:[{ codice:'EX625' }], warmup:[{ codice:'EX627' }] }] } };
    atteso('4 · «Cambia ›» non propone chi è nel riscaldamento della seduta', a.win.candidatiBloccoNuovo('lowerA', 'EX625').map(c => c.codice), ['EX629']);
    a.ST.bloccoNuovo = null;
    // «Cambia per oggi» sulla seduta in uso: Lower A ha EX669 fra il lavoro; mettiamo EX637 nel riscaldamento
    // (stesso schema, fra le prime sei alternative per codice: senza la regola comparirebbe)
    const lA = a.win.getTrainingSession('lowerA');
    lA.warmup = [{ codice:'EX637', name:'Affondo laterale alternato', warmup:true }];
    a.ST.page = 'training'; a.ST.trainSession = 'lowerA';
    a.win.apriCambioOggi('lowerA', 'Squat seduto su step');
    await new Promise(r => setTimeout(r, 40));
    const cand = (a.ST.cambioOggi.candidati || []).map(c => c.riga.codice);
    atteso('4 · «Cambia per oggi» trova le alternative ma non chi è nel riscaldamento di oggi', [cand.length > 0, cand.includes('EX637')], [true, false]);
    a.win.chiudiCambioOggi();
  }
  // 5 · i rilievi della revisione di 480+490 (24 ottobre 2026 sera)
  {
    // «Rinnova il riscaldamento» lo stesso giorno di un «Cambia per oggi» su EX669 (ginocchia): in memoria Lower A
    // ha il sostituto, nella riga del database EX669; con qualunque rotazione EX669 non entra nel riscaldamento
    const presi = [];
    for (let n = 0; n < 8; n++) {
      const a = await nuovo(conZone(), { altreSchede: n, veri: true });
      await a.win.cambiaPerOggi('lowerA', 'Squat seduto su step', 'EX041');
      a.win.chiediConferma = async () => true;
      await a.win.rinnovaRiscaldamento();
      const up = a.supa._calls.find(c => c.table === 'schede_utente' && c.op === 'update' && c.payload && c.payload.scheda);
      const lA = up && up.payload.scheda.sessioni.find(s => s.id === 'lowerA');
      presi.push(...((lA && lA.warmup) || []).map(w => w.codice));
    }
    atteso('5 · «Cambia per oggi» su EX669 e poi «Rinnova»: EX669 mai nel riscaldamento di Lower A (8 rotazioni)', [presi.length > 0, presi.filter(c => c === 'EX669').length], [true, 0]);
  }
  {
    // la variante del coach («Faccio questa oggi») non propone chi è nel riscaldamento di oggi, nemmeno come
    // alternativa scritta (EX647 Squat calcio laterale → EX637 Affondo laterale alternato)
    const cat = conZone().map(r => r.codice === 'EX647' ? { ...r, alternativa:'EX637' } : r);
    const a = await nuovo(cat);
    const lA = a.win.getTrainingSession('lowerA');
    lA.exercises.push({ codice:'EX647', name:'Squat calcio laterale', sets:3, reps:'8-12', rest_sec:90 });
    const v0 = a.win.ZTCoachRules.varianteFacile(cat.find(r => r.codice === 'EX647'), cat, { tipoAllen:'casa', attrezzatura:a.ST.profile.attrezzatura, inScheda:[] });
    atteso('5 · senza riscaldamento la variante scritta è EX637 (Training 330, invariato)', v0 && v0.codice, 'EX637');
    lA.warmup = [{ codice:'EX637', name:'Affondo laterale alternato', warmup:true }];
    a.win.varianteFacilePer('Squat calcio laterale', 'lowerA');
    await new Promise(r => setTimeout(r, 40));
    const st = a.win.varianteFacilePer('Squat calcio laterale', 'lowerA');
    atteso('5 · con EX637 nel riscaldamento di oggi il coach non lo propone (ricerca finita)', [st.stato !== 'in-corso', (st.variante && st.variante.codice) === 'EX637'], [true, false]);
  }
  {
    // gli esercizi per lato hanno 30 secondi per lato nel flusso, col cambio lato
    const a = await nuovo(conZone());
    const lA = a.win.getTrainingSession('lowerA');
    lA.warmup = [{ codice:'EX823', name:'Step Achilles stretch', sets:2, reps:'30 sec per lato', warmup:true }, { codice:'EX793', name:'Seated ankle circles', sets:2, reps:'15-20', warmup:true },
      { codice:'EX784', name:'Prayer stretch', sets:2, reps:'30 sec', warmup:true }];
    a.ST.page = 'training'; a.ST.trainSession = 'lowerA'; a.ST.trainAnticipato = 'lowerA'; a.ST.lastLoggedSets = {}; a.ST.aiCue = a.ST.aiCue || {};
    a.win.renderTraining();
    const pg = a.win.document.getElementById('page-training').textContent.replace(/\s+/g, ' ');
    atteso('5 · nella lista: «30s per lato» per il polpaccio, 30s per l\'allungamento dei polsi, 60s per gli altri', [/Step Achilles stretch.{0,80}30s per lato/.test(pg), /Seated ankle circles.{0,80}60s/.test(pg), /Prayer stretch.{0,80}30s/.test(pg)], [true, true, true]);
    a.win.warmupFlowStart();
    atteso('5 · il flusso parte dal lato sinistro, 30 secondi', [a.ST.trainWarmupFlow.isoPhase, a.ST.trainWarmupFlow.remaining], ['A', 30]);
    a.win.warmupFlowEnd();
    a.ST.trainWarmupFlow = null;
    lA.warmup = [lA.warmup[2]];
    a.win.warmupFlowStart();
    atteso('5 · l\'allungamento fermo coi due lati insieme dura 30 secondi, senza cambio lato', [a.ST.trainWarmupFlow.isoPhase, a.ST.trainWarmupFlow.remaining], [null, 30]);
    a.win.warmupFlowEnd();
  }
  // 6 · la seconda revisione di 480+490
  {
    // «Cambia per oggi» con un sostituto che è anche di riscaldamento (zona ginocchia), poi «Rinnova»: né il sostituto né
    // l'originale nel riscaldamento di Lower A, con ogni rotazione
    const doppi = [];
    for (const sost of ['EX637', 'EX647', 'EX649', 'EX656']) {
      for (let n = 0; n < 4; n++) {
        const a = await nuovo(conZone(), { altreSchede: n, veri: true });
        await a.win.cambiaPerOggi('lowerA', 'Squat elastico', sost);
        a.win.chiediConferma = async () => true;
        await a.win.rinnovaRiscaldamento();
        const lA = a.win.getTrainingSession('lowerA');
        const lavoro = (lA.exercises || []).map(e => e.codice);
        (lA.warmup || []).forEach(w => { if (lavoro.includes(w.codice) || w.codice === 'EX040') doppi.push(sost + '/' + n + ':' + w.codice); });
      }
    }
    atteso('6 · sostituto di oggi (EX637, EX647, EX649, EX656) e «Rinnova»: mai lo stesso codice nel riscaldamento e nel lavoro', doppi, []);
  }
  {
    // nella seduta l'adattamento si vede sotto la voce del riscaldamento e nella scheda «come si esegue»
    const a = await nuovo(conZone());
    const gen = await a.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
    const lA = a.win.getTrainingSession('lowerA');
    lA.warmup = gen.sessioni.find(s => s.id === 'lowerA').warmup;
    a.ST.page = 'training'; a.ST.trainSession = 'lowerA'; a.ST.trainAnticipato = 'lowerA'; a.ST.lastLoggedSets = {}; a.ST.aiCue = a.ST.aiCue || {};
    a.win.renderTraining();
    const righe = [...a.win.document.querySelectorAll('.ex-adattamento')].map(e => e.textContent);
    atteso('6 · nella lista del riscaldamento c\'è l\'adattamento per le voci in conflitto', [righe.length >= 2, righe.every(t => /^⚠ /.test(t))], [true, true]);
    a.win.openWarmupInfo(0);
    atteso('6 · e nella scheda «come si esegue» della prima voce', !!a.win.document.querySelector('.info-modal .modal-alert'), true);
    a.win.closeWarmupInfo();
  }
  {
    // a casa senza elastico la cuffia non c'è: la voce ripiega su «spalle» a corpo libero, invece di restare vuota
    const a = await nuovo(conZone());
    a.ST.profile.attrezzatura = ['corpo libero', 'sbarra', 'panca'];
    const gen = await a.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
    const upper = gen.sessioni.filter(s => /^upper/.test(s.id));
    atteso('6 · senza elastico: 6 voci nell\'Upper, la quinta è una voce «spalle»', upper.map(s => [s.warmup.length, zoneDi(s.warmup[4] && s.warmup[4].codice).includes('spalle')]), upper.map(() => [6, true]));
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
