// Nutrition 080 (Ondata 5 · 13 ottobre 2026) — il piano della settimana in corso anche se non apri l'app nel giorno giusto.
// Prima il piano nasceva solo nel giorno scelto (o il giorno dopo), sempre per la settimana successiva; «Rigenera piano»
// diceva «di questa settimana» e creava quella prossima; chi si iscriveva di mercoledì vedeva pasti finti fino al lunedì dopo.
// Ora: nel tab Piano, sulla settimana corrente senza piano, «PREPARA IL PIANO DA OGGI A DOMENICA»: il coach genera solo i
// giorni che restano (da oggi a 7), la riga del piano ha il lunedì di QUESTA settimana; «Rigenera» lavora sulla settimana
// mostrata (corrente: da oggi; prossima: 7 giorni; passata: niente). Il postino automatico del giorno scelto non cambia.
//   node tools/banco/prova_piano_settimana.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-14';          // mercoledì
const LUN = '2026-10-12', LUN_PROSSIMO = '2026-10-19', LUN_SCORSO = '2026-10-05';
// pasti finti del coach per i giorni da..7
const pastiJson = (da, a) => { const meals = []; for (let d = da; d <= (a || 7); d++) ['pranzo', 'cena'].forEach(slot => meals.push({ day:d, slot, time: slot === 'pranzo' ? '13:00' : '20:00', description:`Piatto ${slot} ${d}`, ingredients:['Riso 80g', 'Pollo 150g', 'Olio 10g'], kcal:600, protein:40, carbs:60, fat:15, explanation:'Lo scelgo io per te.' })); return JSON.stringify({ meals }); };
const t = {
  profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, obiettivo:'ricomposizione', target_kcal:2300, target_protein:195, target_carbs:218, target_fat:72, dieta:'onnivoro', plan_generation_day:'sun' }],
  meals:[], meal_items:[], fasting_days:[], supplements:[], supplement_packages:[], supplement_package_items:[], supplements_log:[],
  weekly_plans:[], weekly_plan_meals:[], weekly_pictures:[], coach_proposals:[],
};
(async () => {
  const b = boot(t, { now:OGGI + 'T10:00:00' });
  await b.avviato;
  const { win, supa } = b; const d = win.document; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.catalog = []; ST.supps = []; ST.activeDay = OGGI;
  ST.profile = { ...t.profiles[0] };
  win.applyProfile(ST.profile);
  await win.loadAllDays();
  // il coach finto: all'annuncio risponde una frase, ai pasti risponde il JSON per i giorni chiesti nel prompt
  const prompts = [];
  win.callAI = async (prompt) => { prompts.push(prompt); const m = /- day: (\d)=/.exec(prompt); if (m) return pastiJson(Number(m[1])); return 'Numeri fermi, prima settimana.'; };
  const promptPasti = () => prompts.filter(p => /- day: \d=/.test(p)).pop() || '';
  const conferme = []; let risposta = true;
  win.chiediConferma = async (testo, opts) => { conferme.push([(opts && opts.titolo) || '', (opts && opts.ok) || '']); return risposta; };
  const piani = () => t.weekly_plans.map(p => p.week_start).sort();
  const pastiDi = (ws) => { const p = t.weekly_plans.find(x => x.week_start === ws); return p ? t.weekly_plan_meals.filter(m => m.plan_id === p.id).map(m => m.day_of_week).sort((a, c) => a - c) : null; };
  const testo = (el) => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  const pagina = () => d.getElementById('page-piano');
  const bottone = () => pagina().querySelector('.pianov4-rigenera-btn');

  console.log('la regola, da sola');
  const V = win._pianoV4F2aParseAndValidate;
  atteso('14 pasti per la settimana intera · va bene (com\'era)', V(pastiJson(1), 1).ok, true);
  atteso('da mercoledì (3): 10 pasti vanno bene; 14 con i giorni 1 e 2 no (giorni prima di quello chiesto); 8 no (manca un giorno)', [V(pastiJson(3), 3).ok, V(pastiJson(1), 3).reason, V(pastiJson(4), 3).reason], [true, 'bad-day', 'too-few-meals']);
  atteso('da domenica (7): 2 pasti bastano', V(pastiJson(7), 7).ok, true);
  const prompt3 = win._pianoV4F2aBuildPrompt(ST.profile, { kcal:2300, protein:195, carbs:218, fat:72 }, win._pianoV4F2aTargets({ kcal:2300, protein:195, carbs:218, fat:72 }), 3);
  atteso('il prompt da mercoledì chiede 10 pasti (5 + 5) da mercoledì a domenica, giorni 3..7', [/Genera 10 pasti \(5 PRANZI \+ 5 CENE\)/.test(prompt3), /da mercoledì a domenica/.test(prompt3), /- day: 3=mercoledì \.\. 7=domenica/.test(prompt3), /10 oggetti totali/.test(prompt3)], [true, true, true, true]);
  const prompt1 = win._pianoV4F2aBuildPrompt(ST.profile, { kcal:2300, protein:195, carbs:218, fat:72 }, win._pianoV4F2aTargets({ kcal:2300, protein:195, carbs:218, fat:72 }), 1);
  atteso('il prompt della settimana intera e\' quello di prima (14 pasti, 7 giorni)', [/Genera 14 pasti \(7 PRANZI \+ 7 CENE\)/.test(prompt1), /14 oggetti totali/.test(prompt1)], [true, true]);
  atteso('oggi e\' mercoledì: giorno 3, settimana del 12 ottobre', [win._pianoV4OggiIso(), win._pianoV4SettimanaDiOggiIso()], [3, LUN]);

  console.log('\nl\'app vera · il tab Piano');
  // il postino automatico: mercoledì non e' il giorno scelto → niente, com'era
  const auto = await win._pianoV4MaybePostino({});
  atteso('postino automatico di mercoledì · «skip-day», nessun piano scritto (com\'era)', [auto.decision, piani()], ['skip-day', []]);
  ST.pianoV4WeekOffset = 0; win.showPage('piano'); await attendi(30); win.renderPianoV4();
  atteso('settimana corrente senza piano · «PREPARA IL PIANO DA OGGI A DOMENICA →» e la riga che lo dice', [testo(bottone()), /puoi prepararlo adesso, da oggi a domenica/.test(testo(pagina()))], ['PREPARA IL PIANO DA OGGI A DOMENICA →', true]);
  atteso('il banner dei pasti di esempio (nel dettaglio del giorno) non promette piu\' solo domenica sera', /oppure adesso con «Prepara il piano»/.test(win.renderPianoV4DemoBanner(false)), true);
  // un tocco: domanda, poi il piano di QUESTA settimana, con i soli giorni da oggi (3) a domenica (7)
  bottone().click();
  for (let i = 0; i < 200 && (ST._pianoRigeneraLoading || !piani().length); i++) await attendi(10);
  await attendi(30);
  atteso('la domanda e\' «Preparare il piano da oggi a domenica?» con «Prepara»', conferme[conferme.length - 1], ['Preparare il piano da oggi a domenica?', 'Prepara']);
  atteso('riga del piano col lunedì di questa settimana; pasti solo per i giorni 3..7 (10 righe)', [piani(), pastiDi(LUN)], [[LUN], [3, 3, 4, 4, 5, 5, 6, 6, 7, 7]]);
  atteso('il prompt ai pasti chiedeva da mercoledì', /da mercoledì a domenica/.test(promptPasti()), true);
  win.renderPianoV4();
  atteso('il tab mostra 5 giorni con pasti e «RIGENERA PIANO →»', [/5\s*\/7/.test(testo(pagina().querySelector('.pianov4-status-row'))), testo(bottone())], [true, 'RIGENERA PIANO →']);
  ST.page = 'oggi';
  atteso('Oggi · il pranzo di oggi viene dal piano appena fatto', (win.getTodayPianoMeals() || {}).pranzo && win.getTodayPianoMeals().pranzo.piatto, 'Piatto pranzo 3');
  // Rigenera sulla settimana corrente: via i pasti di prima, di nuovo solo da oggi a domenica
  ST.page = 'piano'; win.renderPianoV4();
  bottone().click();
  for (let i = 0; i < 200 && ST._pianoRigeneraLoading; i++) await attendi(10);
  await attendi(30);
  atteso('«Rigenera» sulla settimana corrente · domanda «Rigenerare il piano da oggi a domenica?», sempre un piano solo, giorni 3..7', [conferme[conferme.length - 1][0], piani(), pastiDi(LUN)], ['Rigenerare il piano da oggi a domenica?', [LUN], [3, 3, 4, 4, 5, 5, 6, 6, 7, 7]]);
  // la settimana prossima: 7 giorni interi, riga col lunedì prossimo
  ST.pianoV4WeekOffset = 1; win.renderPianoV4();
  atteso('settimana prossima senza piano · «PREPARA IL PIANO →»', testo(bottone()), 'PREPARA IL PIANO →');
  bottone().click();
  for (let i = 0; i < 200 && ST._pianoRigeneraLoading; i++) await attendi(10);
  await attendi(30);
  atteso('piano della prossima settimana · lunedì 19, 14 pasti, giorni 1..7; quello di questa settimana resta', [conferme[conferme.length - 1][0], piani(), (pastiDi(LUN_PROSSIMO) || []).length, pastiDi(LUN).length], ['Preparare il piano della prossima settimana?', [LUN, LUN_PROSSIMO], 14, 10]);
  // la settimana scorsa: niente pulsante, e il postino rifiuta
  ST.pianoV4WeekOffset = -1; win.renderPianoV4();
  const scritture = supa._calls.length;
  const rifiuto = await win._pianoV4MaybePostino({ weekStart:LUN_SCORSO, forceAll:true });
  atteso('settimana passata · nessun pulsante; chiesta al postino → «skip-past-week», niente scritto', [bottone(), rifiuto.decision, supa._calls.slice(scritture).filter(c => c.op !== 'select').length], [null, 'skip-past-week', 0]);
  // «Lascia stare» alla domanda: niente
  ST.pianoV4WeekOffset = 0; win.renderPianoV4(); risposta = false;
  const prima = prompts.length;
  bottone().click(); await attendi(50);
  atteso('risposta no alla domanda → nessuna chiamata al coach, piano com\'era', [prompts.length - prima, pastiDi(LUN).length], [0, 10]);
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).map(l => String(l[1]).split('\n')[0]), []);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
