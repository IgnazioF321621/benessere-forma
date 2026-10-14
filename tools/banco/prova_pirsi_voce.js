// Pirsi 040 — una sola identità per il coach, e consigli non scritti su Ignazio.
// Parte 1: il modulo da solo (ZTCoachRules.voce, la riga «Allenamento» del ritratto).
// Parte 2: i sorgenti — nessun prompt si presenta a modo suo, niente «40-30-30», niente attrezzi fissi.
// Parte 3: l'app vera — le chiamate del coach iniziano tutte con la stessa voce, i cue senza registro,
//          gli attrezzi arrivano dal profilo; la Home non dice più «a digiuno»; il Worker usa la stessa voce.
//   node tools/banco/prova_pirsi_voce.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const R = require('../../shared/coach_rules.js');
const ZTRitratto = require('../../shared/ritratto.js');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const riga = (t, inizio) => t.split('\n').find(r => r.startsWith('- ' + inizio)) || null;
const radice = path.join(__dirname, '..', '..');
const leggi = (f) => fs.readFileSync(path.join(radice, f), 'utf8');

// ── Parte 1: il modulo ──
console.log('Parte 1 · la voce e il ritratto');
const v = R.voce();
atteso('voce = identità + registro', v, R.IDENTITA + '\n\n' + R.REGISTRO);
atteso('identità: Pirsi, coach di Zona Tracker, prima persona, del tu', [/^Sei Pirsi, il coach di Zona Tracker/.test(R.IDENTITA), /prima persona/.test(R.IDENTITA), /dai del tu/.test(R.IDENTITA)], [true, true, true]);
atteso('niente «40-30-30» né formula fissa', /40-30-30|40\/30\/30/.test(v), false);
atteso('registro: i 377 caratteri di prima, invariati', [R.REGISTRO.length, /^REGISTRO \(vale sempre\): parli come un amico diretto e schietto\./.test(R.REGISTRO)], [377, true]);
atteso('voce({registro:false}) = solo identità (i cue)', R.voce({ registro:false }), R.IDENTITA);
atteso('niente nome della persona né dati fissi di una persona', /Ignazio|55 anni|nuotatore|elastici a tubo/.test(v), false);

const p = { sex:'M', age:55, height_cm:178, tipo_allenamento:'casa', attrezzatura:['elastici_tubo', 'manubri', 'maniglie'] };
atteso('ritratto · a casa con gli attrezzi del profilo', riga(ZTRitratto.build({ profile:p }), 'Allenamento'), '- Allenamento a casa · attrezzi: elastici a tubo, manubri, maniglie per gli elastici');
atteso('ritratto · in palestra, senza elenco', riga(ZTRitratto.build({ profile:{ tipo_allenamento:'palestra' } }), 'Allenamento'), '- Allenamento in palestra');
atteso('ritratto · ripiego del generatore (elastico, corpo_libero)', riga(ZTRitratto.build({ profile:{ tipo_allenamento:'aperto', attrezzatura:['elastico', 'corpo_libero'] } }), 'Allenamento'), '- Allenamento all\'aperto · attrezzi: elastici, corpo libero');
atteso('ritratto · senza allenamento, nessuna riga', riga(ZTRitratto.build({ profile:{ sex:'F', age:40 } }), 'Allenamento'), null);
atteso('ritratto · slug sconosciuto letto com\'è, doppioni via', riga(ZTRitratto.build({ profile:{ attrezzatura:['step_board', 'manubri', 'manubri'] } }), 'Allenamento'), '- Allenamento · attrezzi: step board, manubri');

// ── Parte 2: i sorgenti ──
console.log('Parte 2 · i sorgenti');
const sorgenti = ['zona-tracker.html', ...fs.readdirSync(path.join(radice, 'app')).filter(f => f.endsWith('.js')).map(f => 'app/' + f),
  'shared/ritratto.js', 'shared/quadro.js', 'shared/nutrizione.js', 'worker/src/index.js', 'worker/src/vision-check.js', 'worker/src/coach-cron.js',
  'worker/src/prompts/vision-check-2026-09-13.js'];
const conIdentita = sorgenti.filter(f => /Sei Pirsi/.test(leggi(f)));
atteso('«Sei Pirsi» scritto solo in shared/coach_rules.js', conIdentita, []);
const conRegistro = sorgenti.filter(f => /REGISTRO \(vale sempre\)/.test(leggi(f)));
atteso('il registro scritto solo in shared/coach_rules.js', conRegistro, []);
atteso('chi usa la voce: cue e «Perché?» (Pirsi 120), scheda, nutrition (3), Worker', ['app/pirsi.js', 'app/training_generatore.js', 'app/nutrition.js', 'worker/src/prompts/vision-check-2026-09-13.js'].map(f => (leggi(f).match(/ZTCoachRules\.voce\(/g) || []).length), [2, 1, 3, 1]);
atteso('nessun prompt dice «40-30-30» (restano solo i pasti di esempio del Piano)', (leggi('app/nutrition.js').match(/40-30-30/g) || []).every((_, i, a) => a.length === 3) && !/Zona \(40-30-30\)/.test(leggi('app/nutrition.js')), true);
atteso('il prompt dei cue non ha più «Allena con elastici a tubo»', /Allena con elastici/.test(leggi('app/pirsi.js')), false);
atteso('la Home non dice più «a digiuno»', /Sessione \$\{sess\.name\} a digiuno/.test(leggi('app/home.js')), false);
atteso('il Worker importa la voce dal modulo condiviso', /import ZTCoachRules from '\.\.\/\.\.\/\.\.\/shared\/coach_rules\.js'/.test(leggi('worker/src/prompts/vision-check-2026-09-13.js')), true);

// ── Parte 3: l'app vera e il Worker ──
(async () => {
  console.log('Parte 3 · l\'app vera e il Worker');
  const { boot } = require('./banco');
  const b = boot({ coach_proposals: [], weekly_pictures: [] }, { now:'2026-10-13T09:00:00' });
  const win = b.win, ST = win.eval('ST');
  ST.user = { id:'u1' };
  ST.profile = { id:'u1', sex:'M', age:55, height_cm:178, dieta:'pescetariana', intolleranze:[], obiettivo:'ricomposizione', train_start_date:'2026-10-01',
    tipo_allenamento:'casa', attrezzatura:['elastici_tubo', 'sbarra'], note_salute:'Lombari da proteggere.' };
  ST.TARGET = { kcal:2200, protein:165, carbs:210, fat:68 };
  ST.trainHomeData = { notStarted:false, lastSession:'lowerA', lastDate:'2026-10-10', nextSession:'upperA', doneToday:false, inProgress:false };
  win.getCycleWeekInfo = () => ({ weekNum:2, isScarico:false });
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'token-finto' } } });
  const prompts = [];
  win.fetch = async (url, opts) => { prompts.push(JSON.parse(opts.body).messages[0].content); return { ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'ok' }] }) }; };

  const cue = win.buildCoachPrompt('Trazioni alla sbarra', 'upperA', '');
  await win.getAdvice({ kcal:900, protein:60, carbs:90, fat:30 }, 'cena');
  await win._trainGenAINote(ST.profile, { obiettivo:'ricomposizione', giorni:4, volume:'completa', sessioniCount:4 });
  await win._pianoV4GenerateReasoning(ST.TARGET);
  const perPasto = { lunch:{ kcal:770, protein:58, carbs:74, fat:24 }, dinner:{ kcal:550, protein:41, carbs:52, fat:17 } };
  const pasti = win._pianoV4F2aBuildPrompt ? win._pianoV4F2aBuildPrompt(ST.profile, ST.TARGET, perPasto) : null;
  const tutti = [cue, ...prompts].concat(pasti ? [pasti] : []);
  atteso('app · ogni chiamata inizia con la stessa identità', tutti.map(t => t.startsWith(R.IDENTITA)), tutti.map(() => true));
  atteso('app · l\'identità una volta sola per chiamata', tutti.map(t => t.split('Sei Pirsi').length - 1), tutti.map(() => 1));
  atteso('app · cue senza registro; consiglio, scheda, annuncio col registro una volta', [cue, ...prompts].map(t => t.split(R.REGISTRO).length - 1), [0, 1, 1, 1]);
  atteso('app · i cue sanno luogo e attrezzi dal profilo, non da una frase fissa', [riga(cue, 'Allenamento'), /Allena con/.test(cue)], ['- Allenamento a casa · attrezzi: elastici a tubo, sbarra per trazioni', false]);
  atteso('app · le note di salute arrivano dal ritratto', /Lombari da proteggere/.test(cue), true);
  atteso('app · 14 pasti: la voce c\'è e il compito segue', pasti ? [pasti.startsWith(R.voce()), /Genera 14 pasti/.test(pasti), /40-30-30/.test(pasti)] : 'funzione assente', [true, true, false]);

  const azione = win.getProssimaAzioneSimple();
  // Dopo l'unione con Home 010 («Prossima azione» riscritta) il titolo nomina la seduta; resta vero che non dice «a digiuno».
  atteso('home · «È ora di …» senza «a digiuno»', [azione.titolo, azione.dettaglio, /a digiuno/.test(azione.titolo + ' ' + azione.dettaglio)], ['È ora di Upper A', 'Si parte con 5 minuti di preparazione.', false]);

  const { VISION_SYSTEM_PROMPT } = await import(path.join(radice, 'worker/src/prompts/vision-check-2026-09-13.js'));
  atteso('worker · la lettura delle foto inizia con la stessa voce', [VISION_SYSTEM_PROMPT.startsWith(R.voce()), /COMPITO: ricevi le foto/.test(VISION_SYSTEM_PROMPT)], [true, true]);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
