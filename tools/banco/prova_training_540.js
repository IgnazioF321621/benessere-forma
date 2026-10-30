// Training 540 (30 ottobre 2026): le sedute nel Calendario dell'iPhone. Ignazio: «collegare i passi che ci sono già
// (workout) impostando un orario direttamente sul calendario Apple», e «solo sedute vere».
// L'app: in Impostazioni › Allenamento i giorni (partenza lun-mar-gio-ven, che si vede e si salva al primo «Salva») e
// l'ora delle sedute, «Aggiungi al Calendario» (webcal:// sul Worker, col token del profilo) e «Rinnova il collegamento»;
// nei giorni scelti la seduta proposta è sempre di lavoro, uguale in Home, «Prossima azione» e tab Training; «domani»
// per il consiglio sul pasto segue la stessa regola. La regola sta in shared/rotazione.js (prova_rotazione.js), la rotta
// del Worker in worker/test/prova_calendario.mjs. Le sedute sono quelle vere di Ignazio dal 5 al 27 ottobre 2026.
//   node tools/banco/prova_training_540.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-28';   // mercoledì
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const aspetta = (ms) => new Promise(r => setTimeout(r, ms || 20));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const VERE = [['2026-10-05','upperA'], ['2026-10-07','lowerA'], ['2026-10-08','recoveryUpper'], ['2026-10-09','upperB'], ['2026-10-10','lowerB'],
  ['2026-10-12','upperA'], ['2026-10-13','lowerA'], ['2026-10-20','upperA'], ['2026-10-22','lowerA'], ['2026-10-23','upperB'], ['2026-10-25','rest'],
  ['2026-10-26','upperA'], ['2026-10-27','lowerA']];
function fixture(o){
  const p = { id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', obiettivo:'ricomposizione', giorni_allenamento:4 };
  if(o.giorni !== undefined) p.train_giorni = o.giorni;
  if(o.orario !== undefined) p.train_orario = o.orario;
  if(o.token !== undefined) p.calendario_token = o.token;
  return {
    profiles:[p], schede_utente:[], esercizi_catalog:[],
    workouts: (o.sedute || VERE).map(([date, s]) => ({ id:'w' + date + s, user_id:U, date, session_type:s, completed:true, created_at: `${date}T07:00:00+00:00` })),
    training_logs:[], training_notes:[], body_logs:[], weight_logs:[], body_measurements:[], body_checks:[], meals:[], meal_items:[], fasting_days:[],
    daily_log:[], app_errors:[], supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[], weekly_pictures:[], blood_tests:[], body_check_ai:[],
  };
}
async function nuovo(o){
  o = o || {};
  const t = fixture(o);
  const b = boot(t, { now: (o.oggi || OGGI) + 'T12:30:00' });
  await b.avviato;
  const W = b.win, ST = W.eval('ST'), d = W.document;
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = o.oggi || OGGI;
  W.applyProfile(ST.profile);
  if(o.serieOggi) ST.trainLoggedSets = Object.fromEntries(o.serieOggi.map((sid, i) => [`${sid}_Esercizio_${i + 1}_${o.oggi || OGGI}`, { reps: 8 }]));
  await W.computeTrainHomeData();
  await W.loadTrainingAllCompleted({ skipRender:true });
  await W.loadSessionLastCompletion({ skipRender:true });
  W.callAI = async () => '';
  const aperti = [];
  W.apriCalendario = (u) => aperti.push(u);
  const scritture = () => b.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').map(c => c.payload);
  const home = () => { ST.page = 'home'; W.renderHomeV2(); const el = d.getElementById('home-card-training'); return { tocco: el && el.getAttribute('onclick'), testo: el ? el.textContent.replace(/\s+/g, ' ').trim() : '' }; };
  const programma = () => { ST.page = 'training'; ST.trainTab = 'piano'; ST.trainSession = null; W.renderTraining(); return d.getElementById('page-training'); };
  const nota = () => d.getElementById('set-cal-nota').textContent;
  const attivi = () => [...d.querySelectorAll('#set-train-giorni .onb-pill.active')].map(b => Number(b.dataset.giorno));
  return { ...b, W, ST, d, t, aperti, scritture, home, programma, nota, attivi };
}

(async () => {
  // ── 1 · le Impostazioni: la partenza si vede e si salva, poi il tasto si accende ──
  {
    const a = await nuovo();
    atteso('pagina · il modulo condiviso è caricato', typeof a.W.ZTRotazione, 'object');
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    const btn = a.d.getElementById('set-cal-btn'), ora = a.d.getElementById('set-train-orario');
    atteso('1 · senza scelte nel profilo: lun-mar-gio-ven e le 7 già segnati, tasto spento, «Rinnova» nascosto', [a.attivi(), ora.value, btn.disabled, a.d.getElementById('set-cal-rinnova').style.display], [[1, 2, 4, 5], '07:00', true, 'none']);
    atteso('1 · la nota dice cosa fare', /Scegli i giorni e l'ora, poi «Salva»/.test(a.nota()), true);
    await a.W.saveSettings(); await aspetta();
    const sc = a.scritture().filter(p => 'train_giorni' in p);
    atteso('1 · «Salva»: la partenza va nel profilo, una scrittura a parte coi due campi', [sc.length, sc[0]], [1, { train_orario: '07:00', train_giorni: [1, 2, 4, 5] }]);
    atteso('1 · il profilo in memoria segue, e l\'elenco dice l\'ora', [a.ST.profile.train_orario, a.ST.profile.train_giorni, /sedute alle 07:00/.test(testo(a.d.querySelector('#settings-modal .set-voce[data-voce="allenamento"] .set-voce-sotto').innerHTML))], ['07:00', [1, 2, 4, 5], true]);
    a.W.setVai('allenamento');
    atteso('1 · ora il tasto è acceso e la nota spiega l\'iscrizione', [a.d.getElementById('set-cal-btn').disabled, /Tocca «Aggiungi al Calendario»/.test(a.nota())], [false, true]);
    await a.W.saveSettings(); await aspetta();
    atteso('1 · «Salva» senza cambiare niente: nessuna seconda scrittura dei giorni', a.scritture().filter(p => 'train_giorni' in p).length, 1);
    a.W.setVai('allenamento');
    a.d.getElementById('set-train-orario').value = '07:30'; a.W.toggleSetTrainGiorno(3);
    await a.W.saveSettings(); await aspetta();
    atteso('1 · cambiati ora e mercoledì: si scrivono', a.scritture().filter(p => 'train_giorni' in p).pop(), { train_orario: '07:30', train_giorni: [1, 2, 3, 4, 5] });
    a.W.setVai('allenamento');
    [1, 2, 3, 4, 5].forEach(g => a.W.toggleSetTrainGiorno(g));
    await a.W.saveSettings(); await aspetta();
    atteso('1 · tolti tutti i giorni: si scrive [] (non nulla), il tasto si spegne', [a.scritture().filter(p => 'train_giorni' in p).pop().train_giorni, a.W.calendarioPronto()], [[], false]);
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    atteso('1 · riaperte: nessun giorno segnato, non la partenza (la scelta di togliere resta)', a.attivi(), []);
  }
  // ── 2 · «Aggiungi al Calendario» e «Rinnova il collegamento» ──
  {
    const a = await nuovo();
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    await a.W.collegaCalendario(); await aspetta();
    atteso('2 · prima di salvare giorni e ora non si collega niente', [a.aperti, a.scritture().filter(p => 'calendario_token' in p).length], [[], 0]);
    await a.W.saveSettings(); await aspetta();
    a.W.setVai('allenamento');
    await a.W.collegaCalendario(); await aspetta();
    const tok = a.scritture().filter(p => 'calendario_token' in p);
    atteso('2 · al primo tocco nasce il token (uuid) e si apre l\'indirizzo webcal del Worker', [tok.length, UUID.test(tok[0] && tok[0].calendario_token), a.aperti[0] === 'webcal://zona-ai.ignazio-f.workers.dev/calendario?t=' + a.ST.profile.calendario_token], [1, true, true]);
    atteso('2 · la nota dice che è collegato e «Rinnova» compare', [/Collegato/.test(a.nota()), /infortunato il calendario non lo sa/.test(a.nota()), a.d.getElementById('set-cal-rinnova').style.display], [true, true, '']);
    await a.W.collegaCalendario(); await aspetta();
    atteso('2 · al secondo tocco lo stesso token, nessuna scrittura in più', [a.scritture().filter(p => 'calendario_token' in p).length, a.aperti[1] === a.aperti[0]], [1, true]);
    const primo = a.ST.profile.calendario_token;
    a.W.chiediConferma = async () => false;
    await a.W.rinnovaCalendario(); await aspetta();
    atteso('2 · «Rinnova» senza conferma: niente', a.ST.profile.calendario_token === primo, true);
    a.W.chiediConferma = async () => true;
    await a.W.rinnovaCalendario(); await aspetta();
    atteso('2 · «Rinnova» confermato: un token nuovo, diverso', [UUID.test(a.ST.profile.calendario_token), a.ST.profile.calendario_token !== primo, a.scritture().filter(p => 'calendario_token' in p).length], [true, true, 2]);
    // la scrittura del token non passa (prima della migrazione): lo dice e non apre niente
    const b = await nuovo({ giorni: [1, 2, 4, 5], orario: '07:30' });
    b.t.__rete = false;
    await b.W.collegaCalendario(); await aspetta();
    b.t.__rete = true;
    atteso('2 · se il token non si scrive: nessun indirizzo aperto, il profilo resta senza token', [b.aperti, b.ST.profile.calendario_token || null], [[], null]);
  }
  // ── 3 · nei giorni scelti la proposta è una seduta di lavoro, la stessa in Home e nel tab Training ──
  {
    const a = await nuovo({ giorni: [1, 2, 3, 4, 5], orario: '07:30' });   // mercoledì scelto
    const pa = a.W.getProssimaAzioneSimple(), c = a.home();
    atteso('3 · mercoledì scelto, dopo Lower A: Upper B (non il Recovery) in Home, Prossima azione e sedutaProposta', [a.ST.trainHomeData.nextSession, c.tocco, pa.arg, a.W.sedutaProposta()], ['upperB', "apriSessioneDallaHome('upperB')", 'upperB', 'upperB']);
    const pg = a.programma();
    const sc = [...pg.querySelectorAll('[onclick]')].find(el => /PROSSIMO ALLENAMENTO/.test(el.textContent));
    atteso('3 · nel tab Training «Prossimo allenamento» apre Upper B', sc && sc.getAttribute('onclick'), "openTrainingSession('upperB')");
    const b = await nuovo({ giorni: [1, 2, 4, 5], orario: '07:30' });   // mercoledì non scelto
    atteso('3 · mercoledì non scelto: vale il 530, il Recovery Upper', [b.ST.trainHomeData.nextSession, b.home().tocco], ['recoveryUpper', "apriSessioneDallaHome('recoveryUpper')"]);
    const c2 = await nuovo();
    atteso('3 · senza giorni scelti: come prima, il Recovery Upper', c2.ST.trainHomeData.nextSession, 'recoveryUpper');
    atteso('3 · l\'ordine del ciclo viene dal modulo condiviso', [a.W.getRotationCycle(), a.W.ZTRotazione.CICLO_6], [a.W.ZTRotazione.CICLO_6, ['upperA', 'lowerA', 'recoveryUpper', 'upperB', 'lowerB', 'recoveryLower']]);
  }
  // ── 4 · «domani» per il consiglio sul pasto segue la stessa regola ──
  {
    const nome = (a, sid) => a.W.getTrainingSession(sid).name;
    const a = await nuovo({ giorni: [1, 2, 4, 5], orario: '07:30' });            // mercoledì, non scelto; domani giovedì scelto
    let dm = a.W.sedutaDomani();
    atteso('4 · domani (giovedì scelto): Upper B, non il Recovery', [dm.state, dm.label.startsWith(nome(a, 'upperB'))], ['da_fare', true]);
    const b = await nuovo({ giorni: [1, 2, 4, 5], orario: '07:30', oggi: '2026-10-29' });   // giovedì scelto, non ancora fatta: oggi Upper B, domani Lower B
    dm = b.W.sedutaDomani();
    atteso('4 · oggi Upper B da fare, domani (venerdì) Lower B', [dm.state, dm.label.startsWith(nome(b, 'lowerB'))], ['da_fare', true]);
    const c = await nuovo({ giorni: [1, 2, 4, 5], orario: '07:30', oggi: '2026-10-29', serieOggi: ['upperB'] });   // in corso
    dm = c.W.sedutaDomani();
    atteso('4 · con Upper B in corso, domani Lower B (non di nuovo Upper B)', [c.ST.trainHomeData.inProgress, dm.label.startsWith(nome(c, 'lowerB'))], [true, true]);
    const d = await nuovo({ giorni: [1, 2, 4, 5], orario: '07:30', oggi: '2026-10-30' });   // venerdì: domani sabato non scelto
    atteso('4 · domani non è un giorno scelto: riposo', d.W.sedutaDomani(), { state:'riposo', label:'' });
    const e = await nuovo({ oggi: '2026-10-30' });
    atteso('4 · senza giorni scelti la regola di prima: oggi il Recovery Upper, domani Upper B', e.W.sedutaDomani().label.startsWith(nome(e, 'upperB')), true);
  }

  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
