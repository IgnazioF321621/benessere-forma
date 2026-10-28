// Training 530 (28 ottobre 2026, «via il debito»). Il caso visto da Ignazio: in Home la card Training diceva «Sessione
// Lower B» (il debito più vecchio, computeTrainingDebt().target) e «Prossima azione» diceva «Recovery Day» (la prossima
// della rotazione, hd.nextSession). Decisione di Ignazio: «Dobbiamo togliere la questione dei debiti, decido io cosa
// fare.» Ora la proposta è una sola, la prossima della rotazione dopo l'ultima fatta (sedutaProposta), in Home e nel
// tab Training; niente testi, colori o avvisi su sedute saltate o da recuperare; ogni seduta si apre pronta da
// registrare (scelta di Ignazio coi pulsanti: niente più anteprima con «Allena questo oggi»).
// Le sedute sono quelle vere di Ignazio dal 5 al 27 ottobre 2026 (workouts, sola lettura): il 26 Upper A dopo Upper B
// del 23 salta Lower B, il 27 Lower A.
// Revisione della Regia: un recupero fatto fuori turno non sposta la rotazione (i recuperi sono trasparenti), nella
// scheda a 5 giorni e in quella a 6; nel giorno di riposo «Prossimo allenamento» non apre il riposo come seduta; con
// una seduta in corso «domani» è quella dopo, non la seduta di oggi.
//   node tools/banco/prova_training_530.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-28';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const VERE = [['2026-10-05','upperA'], ['2026-10-07','lowerA'], ['2026-10-08','recoveryUpper'], ['2026-10-09','upperB'], ['2026-10-10','lowerB'],
  ['2026-10-12','upperA'], ['2026-10-13','lowerA'], ['2026-10-20','upperA'], ['2026-10-22','lowerA'], ['2026-10-23','upperB'], ['2026-10-25','rest'],
  ['2026-10-26','upperA'], ['2026-10-27','lowerA']];
const PAROLE = /debit|da recuperare|saltat[ae] (la|una) seduta|sedute saltate/i;
// la scheda a 5 giorni (con la Upper Pump): il ciclo a 7, upperA lowerA recoveryUpper upperB lowerB upperC rest
const SCHEDA5 = { sessioni: ['upperA', 'lowerA', 'upperB', 'lowerB', 'upperC'].map(id => ({ id, name: id, type: 'Forza', rir: 2, exercises: [ { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10' } ] })) };
function fixture(sedute, o){
  o = o || {};
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', obiettivo:'ricomposizione' }],
    schede_utente: o.scheda ? [{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(o.scheda)) }] : [], esercizi_catalog:[],
    workouts: sedute.map(([date, s, ora]) => ({ id:'w' + date + s, user_id:U, date, session_type:s, completed:true, created_at: `${date}T${ora || '07:00:00'}+00:00` })),
    training_logs:[], training_notes:[], body_logs:[], weight_logs:[], body_measurements:[], body_checks:[], meals:[], meal_items:[], fasting_days:[],
    daily_log:[], app_errors:[], supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[], weekly_pictures:[], blood_tests:[], body_check_ai:[],
  };
}
async function nuovo(sedute, o){
  o = o || {};
  const t = fixture(sedute || VERE, o);
  const b = boot(t, { now: OGGI + 'T12:30:00' });
  await b.avviato;
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  W.applyProfile(ST.profile);
  if(o.scheda) await W.loadActiveScheda();
  if(o.serieOggi) ST.trainLoggedSets = Object.fromEntries(o.serieOggi.map((sid, i) => [`${sid}_Esercizio_${i + 1}_${OGGI}`, { reps: 8 }]));
  await W.computeTrainHomeData();
  await W.loadTrainingAllCompleted({ skipRender:true });
  await W.loadSessionLastCompletion({ skipRender:true });
  W.callAI = async () => '';
  W.fetchExerciseMedia = async () => ({ status:'missing' });
  const doc = W.document;
  const home = () => { ST.page = 'home'; W.renderHomeV2(); const el = doc.getElementById('home-card-training'); return { tocco: el && el.getAttribute('onclick'), testo: el ? el.textContent.replace(/\s+/g, ' ').trim() : '', pagina: testo(doc.getElementById('page-home').innerHTML) }; };
  const programma = () => { ST.page = 'training'; ST.trainTab = 'piano'; ST.trainSession = null; W.renderTraining(); return doc.getElementById('page-training'); };
  return { ...b, W, ST, t, doc, home, programma };
}

(async () => {
  // 1 · il caso di Ignazio: card e Prossima azione dicono la stessa seduta
  {
    const a = await nuovo();
    const W = a.W, hd = a.ST.trainHomeData;
    atteso('rotazione · dopo Lower A del 27 viene il Recovery Day (recoveryUpper)', hd.nextSession, 'recoveryUpper');
    const c = a.home();
    const pa = W.getProssimaAzioneSimple();
    atteso('Home · la card apre il Recovery Day, non Lower B (prima: il debito più vecchio)', c.tocco, "apriSessioneDallaHome('recoveryUpper')");
    atteso('Home · «Prossima azione» propone la stessa seduta della card', [pa.azione, pa.arg], ['seduta', 'recoveryUpper']);
    atteso('Home · il nome sulla card è quello della seduta proposta', c.testo.includes(W.getTrainingSession('recoveryUpper').name) && !/Lower B/.test(c.testo), true);
    atteso('una regola sola · sedutaProposta() = hd.nextSession, e computeTrainingDebt non c\'è più', [typeof W.sedutaProposta === 'function' ? W.sedutaProposta() : null, typeof W.computeTrainingDebt], ['recoveryUpper', 'undefined']);
    // il tab Training: «Prossimo allenamento» e «I tuoi giorni» dicono la stessa cosa, niente rosso né «da recuperare»
    const pg = a.programma();
    const html = pg.innerHTML, t = testo(html);
    const scorciatoia = [...pg.querySelectorAll('[onclick]')].find(el => /PROSSIMO ALLENAMENTO/.test(el.textContent));
    atteso('Training · «Prossimo allenamento» apre il Recovery Day', scorciatoia && scorciatoia.getAttribute('onclick'), "openTrainingSession('recoveryUpper')");
    const riga = (sid) => [...pg.querySelectorAll(`[onclick="openTrainingSession('${sid}')"]`)].map(el => el.textContent.replace(/\s+/g, ' ')).join(' | ');
    atteso('Training · «PROSSIMO» sul Recovery Day, non su Lower B', [/PROSSIMO/.test(riga('recoveryUpper')), /PROSSIMO|RECUPERARE/.test(riga('lowerB'))], [true, false]);
    atteso('Training · nessun «da recuperare» e nessun bordo rosso sulle sedute', [/da recuperare/i.test(t), /border-left:3px solid var\(--err\)/.test(html)], [false, false]);
  }
  // 2 · ogni seduta si apre pronta da registrare, anche quella «saltata»
  {
    const a = await nuovo();
    const W = a.W;
    const esiti = ['lowerB', 'upperB', 'upperA', 'lowerA', 'recoveryUpper'].map(sid => {
      a.ST.page = 'training'; W.openTrainingSession(sid);
      const t = testo(a.doc.getElementById('page-training').innerHTML);
      const pronta = !/ANTEPRIMA|Allena questo oggi|SOLA LETTURA/.test(t);
      W.closeTrainingSession();
      return [sid, pronta];
    });
    atteso('sedute · Lower B, Upper B, Upper A, Lower A e Recovery si aprono pronte, senza anteprima', esiti, [['lowerB', true], ['upperB', true], ['upperA', true], ['lowerA', true], ['recoveryUpper', true]]);
    a.ST.page = 'training'; W.openTrainingSession('lowerB');
    atteso('sedute · in Lower B si registra subito: c\'è la card dell\'esercizio con «▶ Inizia S1»', [a.doc.querySelectorAll('.exercise-card').length > 0, a.doc.querySelectorAll('.ex-add-set-btn').length > 0], [true, true]);
    W.closeTrainingSession();
    atteso('sedute · non c\'è più la funzione dell\'anteprima né lo sblocco', [typeof W._renderSessionPreview, typeof W.allenaQuestoOggi, typeof W.isActiveDay], ['undefined', 'undefined', 'undefined']);
  }
  // 3 · dopo una seduta saltata (una sola in più dopo i dati veri): la proposta segue la rotazione, niente debito
  {
    const a = await nuovo([...VERE, ['2026-10-28', 'upperB']]);   // oggi Upper B, saltando il Recovery
    const hd = a.ST.trainHomeData;
    const c = a.home();
    atteso('saltata · fatta Upper B oggi: completata, e la prossima è Lower B per tutti', [hd.doneToday, hd.nextSession, /PROSSIMA: LOWER B/.test(c.testo)], [true, 'lowerB', true]);
    const b = await nuovo([...VERE.slice(0, -1)]);                  // fino a Upper A del 26: la prossima è Lower A
    const cb = b.home(), pb = b.W.getProssimaAzioneSimple();
    atteso('saltata · dopo Upper A del 26 (Lower B saltata): card e Prossima azione dicono Lower A', [cb.tocco, pb.arg], ["apriSessioneDallaHome('lowerA')", 'lowerA']);
  }
  // 5 · revisione della Regia: un recupero fuori turno non sposta la rotazione
  {
    const prossima = async (sedute, o) => (await nuovo(sedute, o)).ST.trainHomeData.nextSession;
    const cinque = [['2026-10-20','upperA'], ['2026-10-21','lowerA'], ['2026-10-22','recoveryUpper'], ['2026-10-23','upperB']];
    atteso('5 giorni · dopo Upper B la proposta è Lower B', await prossima(cinque, { scheda: SCHEDA5 }), 'lowerB');
    atteso('5 giorni · il Recovery fatto dopo Upper B (fuori turno) non riporta a Upper B: resta Lower B', await prossima([...cinque, ['2026-10-24','recoveryUpper']], { scheda: SCHEDA5 }), 'lowerB');
    const sei = [['2026-10-20','upperA'], ['2026-10-21','lowerA']];
    atteso('6 giorni · dopo Lower A viene il Recovery Upper', await prossima(sei), 'recoveryUpper');
    atteso('6 giorni · il Recovery Lower fatto quando capita non porta a Upper A: resta il Recovery Upper', await prossima([...sei, ['2026-10-22','recoveryLower']]), 'recoveryUpper');
    atteso('nel turno · il Recovery Upper subito dopo Lower A conta: poi Upper B', await prossima([...sei, ['2026-10-22','recoveryUpper']]), 'upperB');
    atteso('nel turno · il Recovery Lower subito dopo Lower B conta: poi Upper A', await prossima([...sei, ['2026-10-22','recoveryUpper'], ['2026-10-23','upperB'], ['2026-10-24','lowerB'], ['2026-10-25','recoveryLower']]), 'upperA');
    atteso('nel turno · uno fuori turno dopo quello giusto non toglie il primo: poi Upper B', await prossima([...sei, ['2026-10-22','recoveryUpper'], ['2026-10-23','recoveryLower']]), 'upperB');
    // lo stesso giorno: Lower A alle 7 e Recovery Upper alle 8, scritte nell'ordine in cui sono state fatte (la lettura per
    // sola data le lascia così, Lower A davanti); con l'ora di creazione il Recovery è il più recente e conta
    atteso('stesso giorno · Lower A e poi Recovery Upper il 22: la proposta è Upper B, sempre', await prossima([['2026-10-20','upperA'], ['2026-10-22','lowerA','07:00:00'], ['2026-10-22','recoveryUpper','08:00:00']]), 'upperB');
    atteso('stesso giorno · Upper B alle 7 e Lower B alle 9 il 23 (righe nell\'ordine in cui sono state fatte): poi il Recovery Lower', await prossima([['2026-10-20','upperA'], ['2026-10-21','lowerA'], ['2026-10-22','recoveryUpper'], ['2026-10-23','upperB','07:00:00'], ['2026-10-23','lowerB','09:00:00']]), 'recoveryLower');
  }
  // 6 · giorno di riposo: «Prossimo allenamento» non apre il riposo come seduta, come la card della Home
  {
    const a = await nuovo([['2026-10-22','upperA'], ['2026-10-23','lowerA'], ['2026-10-24','recoveryUpper'], ['2026-10-25','upperB'], ['2026-10-26','lowerB'], [OGGI,'upperC']], { scheda: SCHEDA5 });
    atteso('riposo · fatta la Pump oggi, la prossima è il riposo', [a.ST.trainHomeData.doneToday, a.W.sedutaProposta()], [true, 'rest']);
    const pg = a.programma();
    const apreRiposo = [...pg.querySelectorAll('[onclick]')].some(el => /openTrainingSession\('rest'\)/.test(el.getAttribute('onclick')));
    atteso('riposo · nel tab Training niente apre il riposo come seduta da registrare, e lo dice', [apreRiposo, /Oggi riposo/.test(testo(pg.innerHTML))], [false, true]);
    atteso('riposo · la card della Home non apre il riposo', /apriSessioneDallaHome\('rest'\)/.test(a.home().tocco || ''), false);
  }
  // 7 · la seduta di domani con una seduta in corso (consiglio sul pasto)
  {
    const fino23 = VERE.slice(0, VERE.findIndex(([d]) => d === '2026-10-25'));   // fino a Upper B del 23: la prossima è Lower B
    const a = await nuovo(fino23, { serieOggi: ['lowerB'] });
    const nome = (sid) => a.W.getTrainingSession(sid).name;
    atteso('domani · in corso Lower B (la proposta): domani il Recovery Lower, non di nuovo Lower B', [a.ST.trainHomeData.inProgress, (a.W.sedutaDomani() || {}).label.startsWith(nome('recoveryLower'))], [true, true]);
    const b = await nuovo(fino23, { serieOggi: ['upperA'] });
    atteso('domani · in corso Upper A fuori turno: domani Lower A, la seduta dopo quella di oggi', (b.W.sedutaDomani() || {}).label.startsWith(b.W.getTrainingSession('lowerA').name), true);
    const c = await nuovo(fino23);
    atteso('domani · senza seduta in corso: oggi Lower B, domani il Recovery Lower (come prima)', (c.W.sedutaDomani() || {}).label.startsWith(c.W.getTrainingSession('recoveryLower').name), true);
  }
  // 4 · nessun testo con «debito» o «da recuperare»: nelle pagine e nel codice (fuori dai commenti)
  {
    const a = await nuovo();
    const W = a.W;
    const pagine = [a.home().pagina, testo(a.programma().innerHTML)];
    W.apriPausa(); pagine.push(testo((a.doc.getElementById('pausa-modal') || { innerHTML:'' }).innerHTML));
    atteso('testi · Home, Programma e foglio della pausa senza «debito» né «da recuperare»', pagine.map(p => PAROLE.test(p)), [false, false, false]);
    const radice = path.join(__dirname, '../..');
    const sorgenti = ['zona-tracker.html', ...fs.readdirSync(path.join(radice, 'app')).filter(f => /\.js$/.test(f)).map(f => 'app/' + f),
      ...fs.readdirSync(path.join(radice, 'shared')).filter(f => /\.js$/.test(f)).map(f => 'shared/' + f)];
    const fuori = [];
    sorgenti.forEach(f => fs.readFileSync(path.join(radice, f), 'utf8').split('\n').forEach((riga, i) => {
      const m = riga.match(PAROLE); if(!m) return;
      const commento = riga.indexOf('//');
      if(/^\s*(\/\/|\*|\/\*)/.test(riga) || (commento >= 0 && commento < m.index)) return;   // commento
      fuori.push(`${f}:${i + 1}`);
    }));
    atteso('testi · nel codice nessuna stringa con «debito» o «da recuperare» (solo commenti)', fuori, []);
  }

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
