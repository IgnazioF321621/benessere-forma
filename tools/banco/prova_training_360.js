// Training 360 (3 novembre 2026): più pause una dopo l'altra, e al rientro una ripresa graduata. Il caso vero di Ignazio:
// allenato il 2 (upperA) e il 3 novembre (lowerA), la febbre dal 3, il viaggio dall'8 al 15; blocco dal 4 ottobre, una
// pausa passata 15–19 ottobre (viaggio, lavoro; allenamento e pesate).
//   1 · la regola dei periodi (shared/quadro.js): elenco profiles.pause, ripiego sui campi di prima solo con pause nullo,
//       [] = nessuna pausa, mai un periodo al contrario, l'unione dei giorni, «fino al» della catena
//   2 · il rientro (ZTQuadro.rientro): 7 giorni come prima, 8-20 settimana leggera, 21 blocco nuovo, malattia sempre
//       leggera e a blocco avanzato blocco nuovo; due pause vicine senza sedute = uno stop
//   3 · il quadro e Pirsi: la settimana leggera non è un calo · il calendario e i promemoria leggono l'elenco
//   4 · l'app: il foglio con l'elenco, «Sto meglio», la pausa aperta nei campi di prima che passa nell'elenco, la settimana
//       leggera (serie a ⅔ in memoria, 90% del carico, RIR +1, «Riprendo com'era»)
//   node tools/banco/prova_training_360.js
process.env.TZ = 'Europe/Rome';
const Q = require('../../shared/quadro.js');
const C = require('../../shared/coach_rules.js');
const Rot = require('../../shared/rotazione.js');
const P = require('../../shared/promemoria.js');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(92), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const w = (d, s) => ({ date: d, session_type: s, completed: true });
// le sedute vere di Ignazio dall'inizio del blocco (4 ottobre), pausa 15-19 ottobre compresa
const VERE = [['2026-10-05','upperA'], ['2026-10-07','lowerA'], ['2026-10-09','upperB'], ['2026-10-10','lowerB'], ['2026-10-12','upperA'], ['2026-10-13','lowerA'],
  ['2026-10-20','upperA'], ['2026-10-22','lowerA'], ['2026-10-23','upperB'], ['2026-10-26','upperA'], ['2026-10-27','lowerA'], ['2026-10-29','upperB'], ['2026-10-30','lowerB'],
  ['2026-11-02','upperA'], ['2026-11-03','lowerA']].map(([d, s]) => w(d, s));
const PASSATA = { id:'pausa', inizio:'2026-10-15', fine:'2026-10-19', motivo:'viaggio,lavoro', moduli:['allenamento', 'pesate'] };
const MALATTIA = { id:'m1', inizio:'2026-11-04', fine:null, motivo:'malattia', moduli:['allenamento', 'pesate'] };
const VIAGGIO = { id:'v1', inizio:'2026-11-08', fine:'2026-11-15', motivo:'viaggio', moduli:null };

// ── 1 · i periodi ──
{
  const legacy = { pausa_inizio:'2026-10-15', pausa_fine:'2026-10-19', pausa_motivo:'viaggio,lavoro', pausa_moduli:['allenamento', 'pesate'] };
  atteso('1 · pause nullo: vale la pausa dei campi di prima, come un periodo', Q.pausaPeriodi(legacy).map(z => [z.inizio, z.fine, z.motivo, z.moduli.cibo]), [['2026-10-15', '2026-10-19', 'viaggio,lavoro', false]]);
  atteso('1 · pause = [] (tutte tolte): nessuna pausa, i campi di prima non contano più', [Q.pausaPeriodi({ ...legacy, pause: [] }), Q.pausaInfo({ ...legacy, pause: [] }, '2026-10-16'), Q.pausaAttivaIl({ ...legacy, pause: [] }, '2026-10-16')], [[], null, false]);
  // la migrazione 20261103_360 copia la pausa così (stesso oggetto della SQL): la regola risponde uguale
  const migrata = { ...legacy, pause: [{ id:'pausa', inizio:'2026-10-15', fine:'2026-10-19', motivo:'viaggio,lavoro', moduli:['allenamento', 'pesate'] }] };
  const giorni = ['2026-10-14', '2026-10-15', '2026-10-19', '2026-10-20'];
  atteso('1 · la pausa passata nell\'elenco (come la copia la migrazione) dice le stesse cose', [giorni.map(g => Q.pausaAttivaIl(migrata, g, 'allenamento')), Q.pausaGiorniNel(migrata, '2026-10-01', '2026-10-31', 'pesate'), Q.pausaInfo(migrata, '2026-11-03').giorniTotali],
    [giorni.map(g => Q.pausaAttivaIl(legacy, g, 'allenamento')), Q.pausaGiorniNel(legacy, '2026-10-01', '2026-10-31', 'pesate'), Q.pausaInfo(legacy, '2026-11-03').giorniTotali]);
  const aperta = { pausa_inizio:'2026-11-03', pausa_fine:null, pausa_motivo:'malattia', pausa_moduli:['allenamento', 'pesate'] };
  const apertaMigrata = { ...aperta, pause: [{ id:'pausa', inizio:'2026-11-03', fine:null, motivo:'malattia', moduli:['allenamento', 'pesate'] }] };
  atteso('1 · una malattia aperta nei campi di prima (segnata stasera) passa nell\'elenco uguale', [Q.pausaInfo(apertaMigrata, '2026-11-05').attiva, Q.pausaInfo(apertaMigrata, '2026-11-05').fine, Q.pausaAttivaIl(apertaMigrata, '2026-11-20', 'allenamento')], [Q.pausaInfo(aperta, '2026-11-05').attiva, null, true]);
  atteso('1 · mai un periodo al contrario: la fine prima dell\'inizio diventa l\'inizio', Q.pausaPeriodi({ pause: [{ id:'x', inizio:'2026-11-04', fine:'2026-11-03' }] })[0].fine, '2026-11-04');
  const ign = { pause: [PASSATA, MALATTIA, VIAGGIO] };
  atteso('1 · il caso vero: malattia aperta e viaggio, l\'allenamento è in pausa dal 4, il cibo solo dall\'8 al 15', [Q.pausaAttivaIl(ign, '2026-11-05', 'allenamento'), Q.pausaAttivaIl(ign, '2026-11-05', 'cibo'), Q.pausaAttivaIl(ign, '2026-11-10', 'cibo'), Q.pausaAttivaIl(ign, '2026-11-16', 'cibo')], [true, false, true, false]);
  atteso('1 · i giorni si contano una volta: novembre, allenamento 4-30 (27), cibo 8-15 (8)', [Q.pausaGiorniNel(ign, '2026-11-01', '2026-11-30', 'allenamento'), Q.pausaGiorniNel(ign, '2026-11-01', '2026-11-30', 'cibo')], [27, 8]);
  const chiusa = { pause: [PASSATA, { ...MALATTIA, fine:'2026-11-07' }, VIAGGIO] };
  const pi = Q.pausaInfo(chiusa, '2026-11-05');
  atteso('1 · malattia fino al 7, viaggio dall\'8: la pausa mostrata è la malattia, «fino al 15»', [pi.id, pi.fine, pi.finoAl, pi.periodi.length], ['m1', '2026-11-07', '2026-11-15', 3]);
  atteso('1 · fra i due periodi vicini: in pausa ogni giorno dal 4 al 15', [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].every(d => Q.pausaAttivaIl(chiusa, '2026-11-' + String(d).padStart(2, '0'), 'allenamento')), true);
  atteso('1 · prima che parta il viaggio: la prossima pausa è quella che si mostra', Q.pausaInfo({ pause: [VIAGGIO] }, '2026-11-05').futura, true);
  // revisione: una pausa solo del cibo, aperta, accanto alla malattia dell'allenamento: per l'allenamento si mostra la malattia
  const due = { pause: [{ id:'c', inizio:'2026-11-01', fine:null, motivo:'altro', moduli:['cibo'] }, { id:'m', inizio:'2026-11-04', fine:'2026-11-10', motivo:'malattia', moduli:['allenamento', 'pesate'] }] };
  atteso('1 · col modulo: la pausa dell\'allenamento è la malattia, fino al 10; senza modulo l\'aperta', [Q.pausaInfo(due, '2026-11-05', 'allenamento').id, Q.pausaInfo(due, '2026-11-05', 'allenamento').finoAl, Q.pausaInfo(due, '2026-11-05').id], ['m', '2026-11-10', 'c']);
}
// ── 2 · il rientro ──
{
  const r = (sedute, oggi, profile, sett) => Q.rientro({ completati: sedute, profile: profile || {}, oggi, settimanaPrima: sett });
  const s = (date) => date.map(d => w(d, 'upperA'));
  atteso('2 · 7 giorni senza sedute: come prima', r(s(['2026-11-01', '2026-11-09']), '2026-11-09'), null);
  const r8 = r(s(['2026-11-01', '2026-11-10']), '2026-11-10');
  atteso('2 · 8 giorni: la prima settimana è leggera (7 giorni dalla ripresa), niente blocco nuovo', [r8.stopGiorni, r8.leggera, r8.finoA, r8.bloccoNuovo, r8.malattia], [8, true, '2026-11-16', false, false]);
  atteso('2 · la settimana leggera finisce dopo 7 giorni', [!!r(s(['2026-11-01', '2026-11-10']), '2026-11-16'), r(s(['2026-11-01', '2026-11-10']), '2026-11-17')], [true, null]);
  atteso('2 · 21 giorni: blocco nuovo e settimana leggera', [r(s(['2026-10-01', '2026-10-23']), '2026-10-23').bloccoNuovo, r(s(['2026-10-01', '2026-10-22']), '2026-10-22').bloccoNuovo], [true, false]);
  const attesa = r(s(['2026-11-01']), '2026-11-12');
  atteso('2 · tornato oggi senza la seduta ancora: la ripresa è oggi, in attesa', [attesa.ripresa, attesa.attesa, attesa.stopGiorni], ['2026-11-12', true, 10]);
  atteso('2 · ancora in pausa oggi: niente rientro', r(s(['2026-11-01']), '2026-11-12', { pause: [{ id:'a', inizio:'2026-11-05', fine:'2026-11-14' }] }), null);
  const malato = { pause: [{ id:'m', inizio:'2026-11-03', fine:'2026-11-05', motivo:'malattia' }] };
  const rm = r(s(['2026-11-02', '2026-11-07']), '2026-11-07', malato, 2);
  atteso('2 · malattia di 3 giorni (4 senza sedute): leggera comunque, a blocco presto niente blocco nuovo', [rm.stopGiorni, rm.malattia, rm.leggera, rm.bloccoNuovo], [4, true, true, false]);
  atteso('2 · malattia a blocco avanzato (settimana 4): blocco nuovo (scelta di Ignazio, regola per tutti)', r(s(['2026-11-02', '2026-11-07']), '2026-11-07', malato, 4).bloccoNuovo, true);
  atteso('2 · una pausa che non è malattia, 4 giorni: come prima', r(s(['2026-11-02', '2026-11-07']), '2026-11-07', { pause: [{ id:'v', inizio:'2026-11-03', fine:'2026-11-05', motivo:'viaggio' }] }), null);
  // il caso vero: febbre dal 4, viaggio 8-15, ritorno il 16 (12 giorni senza sedute): uno stop solo
  const ign = { pause: [PASSATA, { ...MALATTIA, fine:'2026-11-07' }, VIAGGIO] };
  const ri = r(VERE, '2026-11-16', ign, (d) => Q.cycleWeekInfo({ completed: VERE.filter(x => x.date <= d), asOf: d, today: d, workPerGiro: 4 }).weekNum);
  atteso('2 · Ignazio il 16: malattia e viaggio fanno uno stop solo (12 giorni), settimana leggera fino al 22', [ri.prima, ri.ripresa, ri.stopGiorni, ri.malattia, ri.leggera, ri.finoA], ['2026-11-03', '2026-11-16', 12, true, true, '2026-11-22']);
  atteso('2 · Ignazio era alla settimana 4 del blocco il 3/11: si propone il blocco nuovo', ri.bloccoNuovo, true);
  atteso('2 · oggi 3/11, allenato e con la febbre: nessun rientro', r(VERE, '2026-11-03', { pause: [PASSATA, { ...MALATTIA, inizio:'2026-11-03' }] }), null);
  atteso('2 · le serie a ⅔, minimo 2 (mai più della scheda)', [1, 2, 3, 4, 5, 6].map(Q.serieRientro), [1, 2, 2, 3, 3, 4]);
}
// ── 3 · quadro, Pirsi, calendario, promemoria ──
{
  const vuoto = { weightLogs:[], bodyLogs:[], measurements:[], checks:[], meals:[], suppLogs:[], supps:[], catalog:[], sets:[], workouts:[], blood:[], errors:[] };
  const prof = { giorni_allenamento:4, train_start_date:'2026-10-04', pause: [PASSATA, { ...MALATTIA, fine:'2026-11-07' }, VIAGGIO] };
  const raw = { ...vuoto, workouts: VERE.concat([w('2026-11-16', 'upperB'), w('2026-11-17', 'lowerB')]), sets: [{ date:'2026-11-16', session_id:'upperB', rir_actual:3 }] };
  const ctx = (oggi) => ({ today: oggi, nowTs: new Date(oggi + 'T12:00:00').getTime(), profile: prof, target: null, workPerGiro: 4, deloads: [] });
  const pic = Q.computeWeeklyPicture(raw, '2026-11-16', ctx('2026-11-18'));
  const prima = Q.computeWeeklyPicture(raw, '2026-10-26', ctx('2026-11-18'));
  atteso('3 · quadro: la settimana del rientro è segnata leggera, quella di fine ottobre no', [pic.training.rientro, prima.training.rientro], [true, false]);
  atteso('3 · quadro: la settimana della malattia e del viaggio ha 7 giorni di pausa', Q.computeWeeklyPicture(raw, '2026-11-09', ctx('2026-11-18')).training.pause_days, 7);
  const quadro = (tr, k) => ({ weight: { weight_avg: 75, weight_n: 4, weight_last: 75, weight_trend_4w: null, weight_target: 70 },
    nutrition: { kcal_target: 2200, protein_target: 150, kcal_avg: 2150, protein_avg: 150, supp_kcal_avg: 100, supp_protein_avg: 20, days_logged: 7, logged_dates: [], adherence_kcal: 0.86, days_partial: 0, partial: false, days_under_75: 0 },
    training: { sessions_planned: 4, sessions_done: 2, sessions_missed: 2, recovery_done: 0, block_week: 5, is_deload: false, volume_sets: 20, avg_rir: 2, injury_days: 0, injury_active: false, ...(tr || {}) },
    body: { last_check_date: '2026-10-20', days_since_check: 20, check_due: false, last_measurements: null, prev_check_date: null, ai_overall: null, ai_confidence: null, ai_check_date: null },
    blood: { last_test_date: '2026-10-01', days_since_test: 40, test_count: 2 }, meta: { version: 2, week_start: add('2026-11-16', -7 * (k || 0)), week_end: add('2026-11-22', -7 * (k || 0)), is_closed: true, errors: [] } });
  const profilo = { obiettivo:'dimagrimento', goal_weight_kg:70, target_kcal:2200, target_protein:150, target_carbs:220, target_fat:70, giorni_allenamento:4, train_start_date:'2026-10-04' };
  const kinds = (tr0, tr1) => C.buildProposals(quadro(tr0, 0), [quadro(tr1, 1), quadro({}, 2), quadro({}, 3)], profilo, {}).map(p => p.kind);
  atteso('3 · Pirsi: due settimane sotto le previste → «meno giorni»; con la settimana leggera di mezzo no', [kinds({}, {}).includes('training_volume'), kinds({ rientro: true }, {}).includes('training_volume')], [true, false]);
  atteso('3 · Pirsi: niente scarico anticipato nella settimana leggera (RIR basso o no)', kinds({ rientro: true, avg_rir: 0.3, injury_active: true }, { avg_rir: 0.3 }).includes('deload'), false);
  const prev = Rot.sedutePreviste({ allenamenti: VERE.slice().reverse(), ciclo: Rot.CICLO_6, oggi: '2026-11-04', giorni: [1, 2, 4, 5], settimane: 2, profile: { pause: [{ ...MALATTIA, fine:'2026-11-07' }, VIAGGIO] } });
  atteso('3 · calendario: nessuna seduta nei giorni di pausa dell\'elenco (malattia e viaggio), si riparte il 16', prev.map(e => e.date), ['2026-11-16', '2026-11-17']);
  const pr = (giorno) => P.pastiMancanti({ pasti: [], giorno, ora: 23, profile: { promemoria_pasti: ['cena'], pause: [{ ...MALATTIA, fine:'2026-11-07' }, VIAGGIO] } }).map(x => x.slot);
  atteso('3 · promemoria dei pasti: la malattia non ferma il cibo, il viaggio sì', [pr('2026-11-05'), pr('2026-11-10'), pr('2026-11-16')], [['cena'], [], ['cena']]);
}

// ── 4 · l'app ──
const scheda = { sessioni: [
  { id:'upperA', name:'Upper A', type:'Forza', rir:2, exercises:[ { codice:'EX001', name:'Panca elastico', sets:3, reps:'6-10', rest_sec:120 }, { codice:'EX002', name:'Piegamenti', sets:4, reps:'8-12' } ] },
  { id:'lowerA', name:'Lower A', type:'Forza', rir:2, exercises:[ { codice:'EX040', name:'Squat elastico', sets:3, reps:'6-10' } ] },
  { id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1, exercises:[ { codice:'EX003', name:'Rematore elastico', sets:3, reps:'8-12' } ] },
  { id:'lowerB', name:'Lower B', type:'Ipertrofia', rir:1, exercises:[ { codice:'EX041', name:'Affondi', sets:3, reps:'8-12' } ] },
] };
async function nuovo(o){
  o = o || {};
  const p = { id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', giorni_allenamento:4, train_start_date:'2026-10-04', ...(o.profilo || {}) };
  const t = { profiles:[p], schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog:[{ codice:'EX001', nome:'Panca elastico' }, { codice:'EX002', nome:'Piegamenti' }, { codice:'EX040', nome:'Squat elastico' }, { codice:'EX003', nome:'Rematore elastico' }, { codice:'EX041', nome:'Affondi' }],
    workouts: (o.sedute || VERE).map((x, i) => ({ id:'w' + i, user_id:U, ...x })),
    training_logs: [{ id:'t1', user_id:U, session_id:'upperA', date:'2026-11-02', exercise_name:'Panca elastico', exercise_code:'EX001', set_number:1, reps:10, resistance:'40', band_color:null, rir_actual:2 }],
    training_notes:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[], supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[] };
  const b = boot(t, { now: (o.oggi || '2026-11-03') + 'T12:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = o.oggi || '2026-11-03';
  b.win.callAI = async () => '';
  await b.win.loadActiveScheda();
  await b.win.loadTrainingAllCompleted({ skipRender:true });
  ST.page = 'training'; ST.trainTab = 'piano'; ST.trainSession = null;
  b.win.renderTraining();
  const doc = b.win.document;
  const pagina = () => testo(doc.getElementById('page-training').innerHTML);
  const scritture = () => b.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').map(c => c.payload);
  return { ...b, W: b.win, ST, t, doc, pagina, scritture };
}
(async () => {
  // 4a · la malattia di stasera nei campi di prima, poi il viaggio: l'elenco nasce dalla prima scrittura
  {
    const a = await nuovo({ profilo: { pausa_inizio:'2026-11-03', pausa_fine:null, pausa_motivo:'malattia', pausa_moduli:['allenamento', 'pesate'] } });
    atteso('4a · la malattia aperta nei campi di prima: striscia «In pausa, fine da decidere» e «Sto meglio»', [/In pausa, fine da decidere/.test(a.pagina()), /Sto meglio/.test(a.pagina())], [true, true]);
    a.W.apriPausa();
    atteso('4a · il foglio si apre sull\'elenco: la malattia in corso, «Aggiungi un periodo»', [a.doc.querySelectorAll('.pausa-periodo').length, /IN CORSO/.test(testo(a.doc.getElementById('pausa-modal').innerHTML)), /Aggiungi un periodo/.test(a.doc.getElementById('pausa-modal').textContent)], [1, true, true]);
    a.W.aggiungiPausa();
    a.doc.getElementById('pausa-inizio').value = '2026-11-08'; a.doc.getElementById('pausa-fine').value = '2026-11-15';
    a.ST.pausaModal.motivi = ['viaggio'];
    await a.W.salvaPausa();
    const el = (a.scritture().pop() || {}).pause || [];
    atteso('4a · il viaggio si aggiunge: l\'elenco ha la malattia (dai campi di prima) e il viaggio', el.map(z => [z.id === 'pausa' ? 'pausa' : 'nuovo', z.inizio, z.fine, z.motivo, z.moduli]), [['pausa', '2026-11-03', null, 'malattia', ['allenamento', 'pesate']], ['nuovo', '2026-11-08', '2026-11-15', 'viaggio', ['allenamento', 'cibo', 'pesate']]]);
    atteso('4a · non si scrivono più i campi di prima: la scrittura ha solo l\'elenco', Object.keys(a.scritture().slice(-1)[0] || {}), ['pause']);
    a.W.apriPausa(); a.W.aggiungiPausa(); a.ST.pausaModal.aperta = true;
    const n = a.scritture().length;
    await a.W.salvaPausa();
    atteso('4a · una seconda pausa senza data di ritorno non si salva', a.scritture().length - n, 0);
    a.W.chiudiPausa();
    a.W.renderTraining();
    atteso('4a · la striscia dice anche cosa viene dopo', /Poi: Dal 8 novembre al 15 novembre/.test(a.pagina()), true);
    await a.W.terminaPausa('pausa');
    atteso('4a · «Sto meglio» lo stesso giorno in cui è iniziata: il periodo si toglie, mai al contrario', ((a.scritture().pop() || {}).pause || []).map(z => z.motivo), ['viaggio']);
  }
  // 4b · «Sto meglio» il giorno dopo: fine = ieri
  {
    const a = await nuovo({ oggi:'2026-11-06', profilo: { pause: [MALATTIA, VIAGGIO] } });
    await a.W.terminaPausa('m1');
    const z = ((a.scritture().pop() || {}).pause || []).find(x => x.id === 'm1');
    atteso('4b · «Sto meglio» il 6: la malattia finisce il 5, il viaggio resta', [z && z.inizio, z && z.fine, a.ST.profile.pause.length], ['2026-11-04', '2026-11-05', 2]);
    atteso('4b · il 6, malattia chiusa e viaggio dall\'8: oggi l\'allenamento non è in pausa', a.W.pausaAttivaPer('allenamento'), false);
  }
  // 4c · in pausa: niente seduta proposta, niente promemoria di pesata
  {
    const a = await nuovo({ oggi:'2026-11-10', profilo: { pause: [{ ...MALATTIA, fine:'2026-11-07' }, VIAGGIO] } });
    await a.W.computeTrainHomeData();
    const pa = a.W.getProssimaAzioneSimple();
    atteso('4c · il 10 (viaggio, tutto fermo): «Sei in pausa» fino al 15, nessuna seduta', [pa.titolo, /15 novembre|15\/11|15 nov/i.test(pa.dettaglio), !!pa.azione], ['Sei in pausa', true, false]);
    atteso('4c · pesate in pausa: niente promemoria di pesata né di check', [a.W.pausaAttivaPer('pesate'), a.W.pausaAttivaPer('allenamento')], [true, true]);
  }
  // 4d · la settimana leggera: serie a ⅔ in memoria, 90% del carico, RIR +1, «Riprendo com'era»
  {
    const a = await nuovo({ oggi:'2026-11-16', profilo: { pause: [PASSATA, { ...MALATTIA, fine:'2026-11-07' }, VIAGGIO] } });
    const sr = a.W.getSoftReturn();
    atteso('4d · il 16: 12 giorni fermo dopo la malattia, settimana leggera fino al 22', [!!sr, sr && sr.stopGiorni, sr && sr.malattia, sr && sr.finoA], [true, 12, true, '2026-11-22']);
    const ua = a.W.getTrainingSession('upperA');
    atteso('4d · le serie a ⅔ in memoria (3→2, 4→3), quelle della scheda accanto', ua.exercises.map(e => [e.sets, e._serieScheda]), [[2, 3], [3, 4]]);
    atteso('4d · la scheda nel database non si tocca', a.supa._calls.filter(c => c.table === 'schede_utente' && c.op !== 'select').length, 0);
    a.ST.lastLoggedSets = { 'Panca elastico': { reps:10, resistance:'40', rir_actual:2, date:'2026-11-02' } };
    a.ST.lastSessionSets = { 'Panca elastico': [{ reps:10, resistance:'40', rir_actual:2, date:'2026-11-02' }] };
    const o = a.W.obiettivoPrimaSerie('Panca elastico', 'upperA');
    atteso('4d · la prima serie: 90% dell\'ultima (40 → 35 lbs, a passi di 5), RIR +1', [o && o.resistance, o && o.rir], [35, 3]);
    a.ST.trainSession = 'upperA'; a.W.renderTraining();
    atteso('4d · la striscia della settimana leggera, con «Riprendo com\'era»', [/PRIMA SETTIMANA LEGGERA/.test(a.pagina()), /Dopo la malattia \(12 giorni senza allenarti\)/.test(a.pagina()), /Riprendo com'era/.test(a.pagina())], [true, true, true]);
    atteso('4d · la card del blocco nuovo: malattia alla settimana 4 o oltre', /rientro dopo la malattia/i.test(a.pagina()) || (() => { a.ST.trainSession = null; a.W.renderTraining(); return /rientro dopo la malattia/i.test(a.pagina()); })(), true);
    // revisione: una seconda volta nella settimana leggera il carico non scende ancora (90% una volta sola)
    a.ST.lastLoggedSets = { 'Panca elastico': { reps:10, resistance:'35', rir_actual:3, date:'2026-11-16' } };
    a.ST.lastSessionSets = { 'Panca elastico': [{ reps:10, resistance:'35', rir_actual:3, date:'2026-11-16' }] };
    const o2 = a.W.obiettivoPrimaSerie('Panca elastico', 'upperA');
    atteso('4d · rifatta nella settimana leggera: si ripete il 35, non l\'81%', o2 && o2.resistance, 35);
    // revisione: la scheda in memoria (ST.schedaAttiva) resta intera, le serie leggere stanno solo nella seduta
    atteso('4d · la scheda in memoria resta intera (3 e 4 serie)', a.ST.schedaAttiva.scheda.sessioni.find(x => x.id === 'upperA').exercises.map(e => e.sets), [3, 4]);
    // revisione: «Cambia per oggi» parte dalle serie della scheda e la settimana leggera lo riduce una volta
    const riga = { codice:'EX099', nome:'Piegamenti presa larga', attrezzo:'corpo libero', luogo:'casa', setup:'', esecuzione:'', errori:'', muscoli:'' };
    const sost = a.W._coCostruisci(riga, a.W.getTrainingSession('upperA').exercises[1]);
    atteso('4d · «Cambia per oggi» sul 4 serie in settimana leggera: il sostituto nasce da 4', sost.sets, 4);
    a.W.applicaRientro(); a.W.applicaRientro();
    atteso('4d · applicata due volte, la riduzione resta una (3 e 4 della scheda → 2 e 3)', a.W.getTrainingSession('upperA').exercises.map(e => e.sets), [2, 3]);
    a.W.rientroRiprendoComEra();
    atteso('4d · «Riprendo com\'era»: niente settimana leggera, le serie della scheda tornano', [a.W.getSoftReturn(), a.W.getTrainingSession('upperA').exercises.map(e => [e.sets, e._serieScheda])], [null, [[3, undefined], [4, undefined]]]);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
