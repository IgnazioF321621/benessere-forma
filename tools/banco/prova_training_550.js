// Training 550 (1 novembre 2026): lavori piccoli di allenamento dai feedback di Ignazio.
//   2 · le righe miste con «corpo libero» (ZTCoachRules.attrezziCasa, una regola per generatore, «Cambia per oggi»
//       e puoFare): l'appoggio che si può segnare serve davvero, il carico mancante va col surrogato
//   1 · la variante più difficile passa dall'attrezzatura: con la riga corretta nel foglio il Dip coreano non c'è più
//   3 · la via di progressione segue l'attrezzo in mano (eq della scheda)
//   4 · il riquadro «surrogato» della GIF, che non si accendeva mai, non c'è più
//   5 · nelle tenute la PROSSIMA non scrive il RIR
// Le righe miste sono quelle vere del catalogo del 1 novembre (tools/banco/dati/catalogo_righe_miste_20261101.json).
//   node tools/banco/prova_training_550.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const R = require('../../shared/coach_rules.js');
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(92), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const MISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'catalogo_righe_miste_20261101.json'), 'utf8'));
const riga = (c) => MISTE.find(r => r.codice === c);
const ha = (...a) => { const s = new Set(['corpo_libero', ...a]); return (t) => s.has(t); };
const IGNAZIO = ['elastico', 'barra', 'sbarra', 'panca', 'fitball', 'corpo libero', 'corda doppia', 'cavigliere'];

// La regola di prima (puoFare a casa e il filtro del generatore fino al 31 ottobre): un nativo basta, se no il surrogato intero.
const prima = (ex, h) => {
  const nativi = String(ex.attrezzo || '').toLowerCase().split(';').map(s => s.trim().replace(/\s+/g, '_')).filter(Boolean);
  const surr = String(ex.surrogato_attrezzo || '').toLowerCase().split('+').map(s => s.trim().replace(/\s+/g, '_')).filter(Boolean);
  if(nativi.some(h)) return { ok: true, surrogato: false };
  const s = surr.length > 0 && surr.every(h);
  return { ok: s, surrogato: s };
};

(async () => {
  // ── 2 · le righe miste ──
  {
    atteso('2 · Dip panca (panca;corpo libero) senza panca: non si fa più; con la panca sì', [R.attrezziCasa(riga('EX514'), ha('elastico')), R.attrezziCasa(riga('EX514'), ha('panca'))], [{ ok:false, surrogato:false }, { ok:true, surrogato:false }]);
    atteso('2 · Piegamenti fitball senza fitball no, con la fitball sì', [R.attrezziCasa(riga('EX691'), ha()).ok, R.attrezziCasa(riga('EX691'), ha('fitball')).ok], [false, true]);
    atteso('2 · Affondo indietro manubri senza manubri, con l\'elastico: col surrogato (elastico)', R.attrezziCasa(riga('EX039'), ha('elastico')), { ok:true, surrogato:true });
    atteso('2 · … coi manubri: i suoi; senza manubri e senza elastico: a corpo libero, come prima', [R.attrezziCasa(riga('EX039'), ha('manubri', 'elastico')), R.attrezziCasa(riga('EX039'), ha())], [{ ok:true, surrogato:false }, { ok:true, surrogato:false }]);
    atteso('2 · Affondo sul posto (corpo libero;elastico;maniglie): si fa sempre, mai col surrogato', [R.attrezziCasa(riga('EX015'), ha()), R.attrezziCasa(riga('EX015'), ha('elastico'))], [{ ok:true, surrogato:false }, { ok:true, surrogato:false }]);
    atteso('2 · sedia, box, maniglie, palla medica non si possono segnare: restano come prima', ['EX580', 'EX579', 'EX583', 'EX585'].map(c => R.attrezziCasa(riga(c), ha()).ok), [true, true, true, true]);
    // ogni riga mista e una a un attrezzo solo, per sei attrezzature: cambia solo dove manca l'appoggio o dove il surrogato sostituisce il carico
    const SET = [[], ['elastico'], ['manubri'], ['panca'], ['fitball', 'sbarra'], ['elastico', 'panca', 'fitball', 'sbarra', 'barra']];
    const SINGOLE = [{ codice:'S1', attrezzo:'manubri', surrogato_attrezzo:'elastico' }, { codice:'S2', attrezzo:'sbarra' }, { codice:'S3', attrezzo:'elastico;manubri' }, { codice:'S4', attrezzo:'macchina', surrogato_attrezzo:'elastico+panca' }, { codice:'S5', attrezzo:'corpo libero' }];
    const cambi = [];
    MISTE.concat(SINGOLE).forEach(ex => SET.forEach(s => {
      const h = ha(...s), a = prima(ex, h), b = R.attrezziCasa(ex, h);
      if(JSON.stringify(a) !== JSON.stringify(b)) cambi.push(`${ex.codice}[${s.join('+') || '—'}] ${a.ok ? (a.surrogato ? 'surr' : 'sì') : 'no'}→${b.ok ? (b.surrogato ? 'surr' : 'sì') : 'no'}`);
    }));
    if(process.env.VEDI) console.log(cambi.join('\n'));
    atteso('2 · le righe a un attrezzo solo rispondono come prima', cambi.filter(c => /^S\d/.test(c)), []);
    atteso('2 · fra le righe miste cambiano solo panca, fitball e sbarra mancanti (→ no) e il carico col surrogato (→ surr)', cambi.every(c => /sì→no$/.test(c) ? /^(EX063|EX514|EX566|EX568|EX572|EX574|EX687|EX691)\[/.test(c) : /^EX039\[(elastico|panca)/.test(c) && /sì→surr$/.test(c)), true);
    atteso('2 · con l\'attrezzatura di Ignazio (panca, fitball, elastico) cambia solo l\'Affondo indietro manubri, che va con l\'elastico', MISTE.filter(ex => { const h = ha(...IGNAZIO.map(a => a.replace(/\s+/g, '_'))); return JSON.stringify(prima(ex, h)) !== JSON.stringify(R.attrezziCasa(ex, h)); }).map(ex => ex.codice), ['EX039']);
    atteso('2 · puoFare segue la stessa regola', [R.puoFare(riga('EX514'), { tipoAllen:'casa', attrezzatura:['corpo libero', 'elastico'] }), R.puoFare(riga('EX514'), { tipoAllen:'casa', attrezzatura:IGNAZIO }), R.puoFare(riga('EX514'), { tipoAllen:'palestra', attrezzatura:[] })], [false, true, true]);

    // il generatore e «Cambia per oggi» nella pagina vera
    const src = fs.readFileSync(path.join(__dirname, 'prova_blocco_nuovo.js'), 'utf8');
    const m = src.match(/const base = [\s\S]*?\nconst catalogo = \[[\s\S]*?\n\];/);
    let catalogo = null; eval(m[0].replace('const base', 'var base').replace('const catalogo', 'catalogo')); // eslint-disable-line no-eval
    const CAT = catalogo.filter(c => !MISTE.some(r => r.codice === c.codice)).concat(MISTE.map(r => ({ muscoli:'', setup:'', esecuzione:'', errori:'', zone_rischio:'', ...r })));
    const genera = async (attrezzatura) => {
      const t = { profiles:[{ id:'u1', first_name:'Ignazio', m2_skipped:true, unit:'lbs', obiettivo:'ricomposizione', tipo_allenamento:'casa', attrezzatura, giorni_allenamento:4, volume_sessione:'completo', note_salute:'Esperienza: avanzato', train_start_date:'2026-10-05' }],
        schede_utente:[], esercizi_catalog: CAT.map(c => ({ ...c })), training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[], supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[] };
      const b = boot(t, { now: '2026-11-01T07:00:00' });
      await b.avviato;
      const ST = b.win.eval('ST');
      ST.user = { id:'u1', email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = '2026-11-01';
      b.win.callAI = async () => '';
      await b.win.loadActiveScheda();
      const gen = await b.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
      const sch = (gen && gen.scheda) || gen || {};
      return { b, ST, pool: (sch._pools && sch._pools.poolPrincipali) || [], sessioni: sch.sessioni || [] };
    };
    const g = await genera(['elastico']);
    const inPool = (c) => g.pool.find(ex => ex.codice === c);
    atteso('2 · generatore, solo elastico: i dip e i pike alla panca e i piegamenti alla fitball fuori dal pool', ['EX063', 'EX514', 'EX572', 'EX687', 'EX691'].filter(inPool), []);
    atteso('2 · generatore, solo elastico: l\'Affondo indietro manubri entra col surrogato; sedia e box restano', [!!(inPool('EX039') && inPool('EX039')._surrogato), !!inPool('EX580'), !!inPool('EX579')], [true, true, true]);
    const tutti = g.sessioni.flatMap(s => s.exercises || []);
    atteso('2 · generatore, solo elastico: nessun esercizio alla panca nella scheda', tutti.filter(e => ['EX063', 'EX514', 'EX566', 'EX568', 'EX572'].includes(e.codice)).map(e => e.codice), []);
    g.ST.profile = { ...g.ST.profile, attrezzatura: ['elastico'] };
    const nuovo = g.b.win._coCostruisci({ ...riga('EX039'), setup:'', esecuzione:'', errori:'', muscoli:'' }, { name:'Squat elastico', codice:'EX040', sets:3, reps:'8-12' });
    atteso('2 · «Cambia per oggi» a Affondo indietro manubri senza manubri: con l\'elastico', [nuovo.eq, nuovo.codice], ['elastico', 'EX039']);
    g.ST.profile = { ...g.ST.profile, attrezzatura: ['manubri', 'elastico'] };
    atteso('2 · … coi manubri: i manubri', g.b.win._coCostruisci({ ...riga('EX039'), setup:'', esecuzione:'', errori:'', muscoli:'' }, { name:'Squat elastico', codice:'EX040', sets:3, reps:'8-12' }).eq, 'manubri');
  }
  // ── 1 · la variante più difficile passa dall'attrezzatura (feedback di Ignazio del 29/10: «Dip coreano» a casa senza parallele) ──
  {
    // le righe dei dip del catalogo del 1 novembre (solo le colonne che servono alla regola)
    const D = (codice, nome, pattern, livello, attrezzo, luogo, alternativa, surrogato_attrezzo) => ({ codice, nome, pattern, livello, attrezzo, luogo, alternativa, surrogato_attrezzo: surrogato_attrezzo || null, setup:'', esecuzione:'' });
    const DIP = [
      D('EX063', 'Dip panca piedi a terra', 'spinta verticale', 'principiante;intermedio', 'panca;corpo libero', 'palestra;casa', 'EX514'),
      D('EX072', 'Dip station', 'spinta orizzontale', 'avanzato', 'corpo libero', 'casa;palestra', 'EX003', 'elastico'),
      D('EX357', 'Dip station sovraccarico', 'spinta orizzontale', 'avanzato', 'corpo libero', 'casa;palestra', 'EX072'),
      D('EX514', 'Dip panca piedi rialzati', 'spinta verticale', 'intermedio', 'panca;corpo libero', 'casa;palestra', 'EX063'),
      D('EX578', 'Dip a terra', 'spinta verticale', 'principiante', 'corpo libero', 'casa;libero;palestra', 'EX063'),
      D('EX579', 'Dip su box', 'spinta verticale', 'principiante;intermedio', 'corpo libero;box', 'casa;libero;palestra', 'EX063'),
      D('EX580', 'Dip su sedia', 'spinta verticale', 'principiante;intermedio', 'corpo libero;sedia', 'casa', 'EX579'),
      D('EX680', 'Dip anelli', 'spinta verticale', 'avanzato', 'anelli', 'palestra;libero', 'EX072'),
      D('EX681', 'Dip parallele coreano', 'spinta verticale', 'avanzato', 'corpo libero', 'casa;palestra;libero', 'EX072'),
      D('EX682', 'Dip parallele ginniche', 'spinta verticale', 'intermedio;avanzato', 'corpo libero', 'casa;palestra;libero', 'EX072'),
      D('EX683', 'Dip parallele impossible', 'spinta verticale', 'avanzato', 'corpo libero', 'casa;palestra;libero', 'EX072'),
      D('EX684', 'Dip sedie', 'spinta verticale', 'intermedio', 'corpo libero;sedia', 'casa', 'EX580'),
    ];
    const opz = { tipoAllen:'casa', attrezzatura: IGNAZIO, inScheda: [] };
    const da = DIP.find(r => r.codice === 'EX514');
    const oggi = R.varianteDifficile(da, DIP, opz);
    atteso('1 · col catalogo di oggi il difetto si riproduce: da Dip panca piedi rialzati a Dip parallele coreano', oggi && oggi.codice, 'EX681');
    // la lista per il foglio (tools/biblioteca-nomi/esiti/training550_attrezzo_da_correggere.tsv): le parallele come attrezzo
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'biblioteca-nomi', 'esiti', 'training550_attrezzo_da_correggere.tsv'), 'utf8').trim().split('\n').map(r => r.split('\t'));
    const giusto = Object.fromEntries(tsv.slice(1).filter(r => r[3] !== 'da decidere').map(r => [r[0], r[3]]));
    atteso('1 · la lista per il foglio ha l\'intestazione e le righe delle parallele', [tsv[0], ['EX681', 'EX682', 'EX683', 'EX072', 'EX357'].every(c => giusto[c] === 'parallele')], [['codice', 'nome', 'attrezzo_oggi', 'attrezzo_giusto', 'perche'], true]);
    const corretto = DIP.map(r => giusto[r.codice] ? { ...r, attrezzo: giusto[r.codice] } : r);
    const dopo = R.varianteDifficile(corretto.find(r => r.codice === 'EX514'), corretto, opz);
    atteso('1 · col foglio corretto, a casa senza parallele: nessun dip alle parallele; non resta una più difficile fattibile', dopo, null);
    atteso('1 · … in palestra le parallele ci sono: la più difficile torna (Dip anelli, stesso livello, codice più basso)', (R.varianteDifficile(corretto.find(r => r.codice === 'EX514'), corretto, { ...opz, tipoAllen:'palestra' }) || {}).codice, 'EX680');
    atteso('1 · la regola passa da puoFare anche sulla colonna variante_difficile scritta nel foglio', R.varianteDifficile({ ...corretto.find(r => r.codice === 'EX514'), variante_difficile:'EX682' }, corretto, opz), null);
    atteso('1 · e se la scritta non si può fare, prende la prossima che si può fare (dal Dip a terra: Dip panca, Ignazio ha la panca)', (R.varianteDifficile({ ...corretto.find(r => r.codice === 'EX578'), variante_difficile:'EX682' }, corretto, opz) || {}).codice, 'EX063');
  }
  // ── 3 · la via di progressione segue l'attrezzo in mano ──
  {
    const t = { profiles:[{ id:'u1', first_name:'Ignazio', m2_skipped:true, unit:'lbs', obiettivo:'ricomposizione', tipo_allenamento:'casa', attrezzatura:IGNAZIO, train_start_date:'2026-10-26' }],
      schede_utente:[], esercizi_catalog:[], training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[], supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[] };
    const b = boot(t, { now: '2026-11-01T07:00:00' });
    await b.avviato;
    const W = b.win, ST = W.eval('ST');
    ST.user = { id:'u1', email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.trainAllCompleted = [];
    const sess = { id:'upperB', type:'Ipertrofia', rir:2 };
    // in cima all'intervallo col RIR a posto: la serie dopo fa un passo sulla via
    const prossima = (ex, resistance) => W.computeNextSetSuggestion({ sessionId:'upperB', exName: ex.name, setNum:1, reps:12, resistance, rir:2, exData:{ sets:3, reps:'8-12', ...ex }, sess });
    atteso('3 · via «carico» col surrogato elastico (manubri a casa con l\'elastico): «elastico più duro»', prossima({ name:'Rematore manubri panca piana', progressione:'carico', eq:'elastico', isSurrogato:true }, 30), 'S2: elastico più duro: 40 lbs · riparti da 8 reps · RIR 2');
    atteso('3 · via «carico» coi manubri: il carico, come prima', prossima({ name:'Rematore manubri panca piana', progressione:'carico', eq:'manubri' }, 30), 'S2: 40 lbs · riparti da 8 reps · RIR 2');
    atteso('3 · via «elastico più duro» coi manubri, senza elastico: il carico', prossima({ name:'Croci elastico', progressione:'elastico più duro', eq:'manubri' }, 20), 'S2: 30 lbs · riparti da 8 reps · RIR 2');
    atteso('3 · via «elastico più duro» con l\'elastico: com\'è', prossima({ name:'Croci elastico', progressione:'elastico più duro', eq:'elastico+panca' }, 20), 'S2: elastico più duro: 30 lbs · riparti da 8 reps · RIR 2');
    atteso('3 · via «carico» a corpo libero (niente pesi in mano): più ripetizioni, non «+10 lbs»', prossima({ name:'Affondo indietro manubri', progressione:'carico', eq:'corpo libero' }, 0), 'S2: corpo libero · più ripetizioni · sali a 13 reps · RIR 2');
    atteso('3 · senza attrezzo scritto (scheda vecchia): la via del catalogo, come prima', prossima({ name:'Rematore vecchio', progressione:'carico' }, 30), 'S2: 40 lbs · riparti da 8 reps · RIR 2');
    atteso('3 · l\'elenco dei carichi dell\'app è quello di shared', W.eval('_ATTREZZI_CARICO').length, 17);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})();
