// Pirsi 020 — il ritratto unico della persona.
// Parte 1: il modulo shared/ritratto.js da solo (puro, niente jsdom).
// Parte 2: l'app vera — le chiamate del coach ricevono lo stesso blocco «CHI È».
//   node tools/banco/prova_ritratto.js
//   BANCO_FILE=/tmp/prima.html node tools/banco/prova_ritratto.js   # sul file di prima la parte 2 deve dare KO
process.env.TZ = 'Europe/Rome';
const ZTRitratto = require('../../shared/ritratto.js');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(56), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const righe = (t) => t.split('\n').slice(1);
const riga = (t, inizio) => righe(t).find(r => r.startsWith('- ' + inizio)) || null;

const profilo = { first_name:'Ignazio', sex:'M', age:55, height_cm:178, weight_kg:80, dieta:'pescetariana', intolleranze:['lattosio'], obiettivo:'ricomposizione', activity_level:'moderate', note_salute:'Ferritina bassa.\nLombari da proteggere.', goal_weight_kg:70, train_start_date:'2026-06-01' };
const target = { kcal:2200, protein:165, carbs:210, fat:68 };
const quadro = (over) => ({
  weight:{ weight_avg:72.3, weight_n:3, weight_delta_prev:-0.4, weight_trend_4w:-0.2, weight_target:70, weight_last:72.1, weight_last_date:'2026-10-01' },
  nutrition:{ kcal_target:2200, protein_target:165, kcal_avg:2050, protein_avg:150, days_logged:3, partial:false },
  training:{ sessions_planned:4, sessions_done:2, avg_rir:1.5, injury_days:0, block_week:3, is_deload:false },
  body:{ last_check_date:'2026-09-13', check_due:false, last_measurements:{ waist_cm:{ value:87, delta:-2 } }, ai_overall:'migliorato', ai_confidence:'media' },
  meta:{ week_start:'2026-09-28' }, ...over,
});
const proposte = [
  { kind:'kcal', title:'Scendi a 2100 kcal', status:'accepted', week_start:'2026-09-21', decided_at:'2026-09-21T07:00:00Z' },
  { kind:'training_volume', title:'Aggiungi una seduta', status:'rejected', week_start:'2026-09-28', decided_at:'2026-09-28T07:00:00Z' },
  { kind:'keep', title:'Avanti così', status:'accepted', week_start:'2026-09-14' },
  { kind:'weigh_in', title:'Pesati', status:'expired', week_start:'2026-09-14' },
];
const pieno = { profile:profilo, target, today:'2026-10-02', current:quadro(), previous:quadro({ training:{ sessions_planned:4, sessions_done:4, avg_rir:null, injury_days:0 }, weight:null, body:null }), session:{ state:'da_fare', label:'Upper A, Forza' }, cycle:{ weekNum:3, isScarico:false }, injury:null, softReturn:false, proposals:proposte };

// ── Parte 1: il modulo ──
let t = ZTRitratto.build(pieno);
atteso('intestazione', t.split('\n')[0].startsWith('CHI È — dati veri presi dall\'app.'), true);
atteso('persona · senza il nome (Fondamenta 170)', riga(t, 'Persona'), '- Persona: uomo, 55 anni, 178 cm');
atteso('obiettivo e attività', riga(t, 'Obiettivo:'), '- Obiettivo: ricomposizione corporea · attività quotidiana moderata');
atteso('dieta e intolleranze', riga(t, 'Dieta'), '- Dieta: pescetariana · intolleranze: lattosio');
atteso('note di salute su una riga', riga(t, 'Note'), '- Note di salute scritte dalla persona: Ferritina bassa. Lombari da proteggere.');
atteso('obiettivi del giorno', riga(t, 'Obiettivi del giorno'), '- Obiettivi del giorno: 2200 kcal · 165 g proteine · 210 g carboidrati · 68 g grassi');
atteso('peso vero, non quello del profilo', riga(t, 'Peso'), '- Peso: 72,1 kg (pesata di ieri) · media della settimana 72,3 kg · tendenza a 4 settimane −0,2 kg a settimana · peso obiettivo 70 kg');
atteso('oggi: seduta e ciclo', riga(t, 'Oggi'), '- Oggi (venerdì 2 ottobre): seduta da fare: Upper A, Forza · settimana 3 di 6 del ciclo, di carico');
atteso('settimana in corso', riga(t, 'Questa settimana'), '- Questa settimana, fin qui: cibo registrato 3 giorni, media 2050 kcal su 2200 e 150 g di proteine su 165; sedute fatte 2 su 4 previste, margine medio a fine serie 1,5 ripetizioni; peso medio −0,4 kg sulla settimana prima');
atteso('settimana scorsa', riga(t, 'Settimana scorsa'), '- Settimana scorsa: cibo registrato 3 giorni, media 2050 kcal su 2200 e 150 g di proteine su 165; sedute fatte 4 su 4 previste');
atteso('ultimo check e lettura foto', riga(t, 'Ultimo check'), '- Ultimo check fisico: 13 settembre, vita 87 cm (−2); lettura delle foto: migliorato (fiducia media)');
atteso('proposte: recenti prima, «keep» fuori', riga(t, 'Proposte'), '- Proposte recenti del coach: «Aggiungi una seduta» rimandata (settimana del 28 settembre); «Scendi a 2100 kcal» accettata (settimana del 21 settembre); «Pesati» lasciata scadere (settimana del 14 settembre)');
atteso('nessun infortunio · nessuna riga', riga(t, 'Infortunio'), null);
atteso('stessi ingressi, stesso testo', ZTRitratto.build(pieno) === t, true);

t = ZTRitratto.build({ ...pieno, session:null, injury:{ zone:'ginocchio destro', endDate:'2026-10-06' } });
atteso('infortunio in corso', riga(t, 'Infortunio'), '- Infortunio in corso, zona: ginocchio destro, stop previsto fino al 6 ottobre');
atteso('infortunio · resta il ciclo, niente seduta', riga(t, 'Oggi'), '- Oggi (venerdì 2 ottobre): settimana 3 di 6 del ciclo, di carico');
t = ZTRitratto.build({ ...pieno, softReturn:true, cycle:{ weekNum:6, isScarico:true }, session:{ state:'fatta', label:'Lower B' } });
atteso('rientro graduale', riga(t, 'Rientro'), '- Rientro graduale dopo un infortunio: carichi ridotti in questi giorni');
atteso('scarico e seduta fatta', riga(t, 'Oggi'), '- Oggi (venerdì 2 ottobre): seduta già fatta (Lower B) · settimana di scarico (la sesta del ciclo)');
t = ZTRitratto.build({ ...pieno, session:{ state:'riposo' }, cycle:null });
atteso('riposo', riga(t, 'Oggi'), '- Oggi (venerdì 2 ottobre): giorno di riposo');

// null = non registrato, mai zero
t = ZTRitratto.build({ profile:{ first_name:'Anna', weight_kg:60, obiettivo:'perdita_peso, mantenimento' }, target, today:'2026-10-02', current:quadro({ weight:{ weight_last:null, weight_n:0 }, nutrition:{ days_logged:0, kcal_avg:null }, training:null, body:{ last_check_date:null } }) });
atteso('senza pesate · il peso del profilo non compare', [riga(t, 'Peso'), /60/.test(t)], [null, false]);
atteso('senza pasti · «non registrato», mai zero', riga(t, 'Questa settimana'), '- Questa settimana, fin qui: cibo non registrato');
atteso('senza allenamento · nessuna riga di oggi né di sedute', [riga(t, 'Oggi'), /sedute/.test(t)], [null, false]);
atteso('obiettivo doppio e chiave vecchia', riga(t, 'Obiettivo:'), '- Obiettivo: dimagrimento, mantenimento');
t = ZTRitratto.build({ ...pieno, current:quadro({ nutrition:{ kcal_target:2200, kcal_avg:1300, protein_avg:null, days_logged:4, partial:true } }) });
atteso('registrazione parziale · dichiarata', /cibo registrato 4 giorni, media 1300 kcal su 2200 \(registrazione parziale: i numeri sono più bassi del vero\)/.test(t), true);
t = ZTRitratto.build({ ...pieno, current:null });
atteso('quadro corrente assente · peso e check non inventati', [riga(t, 'Peso'), riga(t, 'Questa settimana'), riga(t, 'Ultimo check')], ['- Peso: nessuna pesata recente · peso obiettivo 70 kg', null, null]);
atteso('niente dati · testo vuoto', [ZTRitratto.build({}), ZTRitratto.build(null), ZTRitratto.build({ profile:{} })], ['', '', '']);
atteso('nota lunga · tagliata', riga(ZTRitratto.build({ profile:{ note_salute:'x'.repeat(500) } }), 'Note').length, '- Note di salute scritte dalla persona: '.length + 301);
atteso('lunghezza del ritratto pieno sotto 1800 caratteri', ZTRitratto.build(pieno).length < 1800, true);
atteso('etichette obiettivo per il Worker', [ZTRitratto.obiettivoLeggibile('massa_muscolare'), ZTRitratto.obiettivoLeggibile(null), ZTRitratto.obiettivoLeggibile('boh')], ['ipertrofia (massa muscolare)', '', '']);

// ── Parte 2: l'app vera ──
(async () => {
  const { boot } = require('./banco');
  const b = boot({ coach_proposals: [], weekly_pictures: [] }, { now:'2026-10-02T09:00:00' });
  const win = b.win, ST = win.eval('ST');
  ST.user = { id:'u1' };
  ST.profile = { id:'u1', ...profilo };
  ST.TARGET = { ...target };
  ST.weeklyPicture = { '2026-09-28': quadro(), '2026-09-21': quadro({ meta:{ week_start:'2026-09-21' } }) };
  ST.coachProposals = proposte;
  ST.trainAllCompleted = [{ date:'2026-09-30', session_type:'lowerA' }];
  ST.trainHomeData = { notStarted:false, lastSession:'lowerA', lastDate:'2026-09-30', nextSession:'upperA', doneToday:false, inProgress:false };
  win.getCycleWeekInfo = () => ({ weekNum:3, isScarico:false });
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'token-finto' } } });
  let prompts = [];
  win.fetch = async (url, opts) => { prompts.push(JSON.parse(opts.body).messages[0].content); return { ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'ok' }] }) }; };

  if(typeof win.coachRitratto !== 'function'){
    atteso('app · coachRitratto esiste', false, true);
  } else {
    const blocco = win.coachRitratto();
    atteso('app · il ritratto nasce dallo stato', [riga(blocco, 'Persona'), riga(blocco, 'Oggi'), riga(blocco, 'Peso') !== null, riga(blocco, 'Proposte') !== null],
      ['- Persona: uomo, 55 anni, 178 cm', '- Oggi (venerdì 2 ottobre): seduta da fare: Upper A, Forza · settimana 3 di 6 del ciclo, di carico', true, true]);
    atteso('app · uguale al modulo con gli stessi dati', blocco, ZTRitratto.build({ ...pieno, previous: quadro({ meta:{ week_start:'2026-09-21' } }) }));

    await win.getAdvice({ kcal:900, protein:60, carbs:90, fat:30 }, 'cena');
    await win._trainGenAINote(ST.profile, { obiettivo:'ricomposizione', giorni:4, volume:'completa', sessioniCount:4 });
    await win._pianoV4GenerateReasoning(target);
    prompts.push(win.buildCoachPrompt('Trazioni alla sbarra', 'upperA', ''));
    const nomi = ['consiglio sul pasto', 'nota alla scheda', 'annuncio del piano', 'cue tecnico'];
    atteso('app · quattro chiamate, tutte col ritratto identico', prompts.map(p => p.includes(blocco)), [true, true, true, true]);
    atteso('app · una volta sola per chiamata', prompts.map(p => p.split('CHI È —').length - 1), [1, 1, 1, 1]);
    atteso('consiglio sul pasto · sa della seduta e resta coi macro rimanenti', [/seduta da fare: Upper A/.test(prompts[0]), /MACRO RIMANENTI OGGI:\n- Calorie: 1300 kcal/.test(prompts[0]), /PROSSIMO PASTO: cena/.test(prompts[0])], [true, true, true]);
    atteso('consiglio sul pasto · niente vecchie righe UTENTE/DIETA, niente peso del profilo', [/^UTENTE:|^DIETA:|^ATTIVITÀ:/m.test(prompts[0]), /80 ?kg/.test(prompts[0])], [false, false]);
    atteso('nota alla scheda · dati della scheda ancora presenti', /Dati della nuova scheda:\n- Obiettivo: ricomposizione\n- Giorni di allenamento a settimana: 4/.test(prompts[1]), true);
    atteso('annuncio del piano · numeri ancora presenti', /kcal 2200, proteine 165g/.test(prompts[2]), true);
    atteso('cue tecnico · esercizio ancora presente', /Esercizio corrente: Trazioni alla sbarra/.test(prompts[3]), true);
    void nomi;

    // infortunio dal telefono: la seduta sparisce, l'infortunio compare ovunque
    win.localStorage.setItem('zt_injury_u1', JSON.stringify({ active:true, startDate:'2026-10-01', endDate:'2026-10-06', zone:'ginocchio destro' }));
    prompts = [];
    await win.getAdvice({ kcal:900, protein:60, carbs:90, fat:30 }, 'cena');
    atteso('infortunio attivo · il consiglio sul pasto lo sa', [/Infortunio in corso, zona: ginocchio destro, stop previsto fino al 6 ottobre/.test(prompts[0]), /seduta da fare/.test(prompts[0])], [true, false]);
    win.localStorage.removeItem('zt_injury_u1');

    // stato vuoto: nessun errore, il consiglio parte lo stesso
    ST.weeklyPicture = {}; ST.coachProposals = []; ST.trainHomeData = null; ST.profile = { id:'u1' }; ST.trainAllCompleted = [];
    prompts = [];
    const r = await win.getAdvice({ kcal:0, protein:0, carbs:0, fat:0 }, 'colazione');
    atteso('stato quasi vuoto · il consiglio parte lo stesso', [r, /MACRO RIMANENTI OGGI/.test(prompts[0])], ['ok', true]);
  }
  // jsdom non ha il service worker: quell'errore c'è da sempre e non c'entra.
  atteso('errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
