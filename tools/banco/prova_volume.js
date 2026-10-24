// Training 110 (Ondata 5, 14 ottobre 2026): volume per muscolo. Le serie a settimana per gruppo si
// contano dalla scheda (isolamento e core per intero, multiarticolare per intero sul principale e a
// metà sui secondari, recuperi esclusi) e si confrontano coi minimi dell'obiettivo; sotto il minimo
// il generatore mette prima una serie in più, poi un esercizio (decisione di Ignazio). Il Programma
// mostra il conto; il quadro della settimana sa le serie previste.
//   node tools/banco/prova_volume.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const Q = require('../../shared/quadro.js');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// il catalogo della prova del blocco nuovo (spinte, tirate, gambe, isolamenti, core, riscaldamento)
const src = fs.readFileSync(path.join(__dirname, 'prova_blocco_nuovo.js'), 'utf8');
const m = src.match(/const base = [\s\S]*?\nconst catalogo = \[[\s\S]*?\n\];/);
let catalogo = null; eval(m[0].replace('const base', 'var base').replace('const catalogo', 'catalogo')); // eslint-disable-line no-eval

// una scheda «vecchia» (senza pattern/gruppo_target nel jsonb): 4 giorni, braccia solo dalle spinte e tirate
const scheda = { obiettivo:'ricomposizione', sessioni: [
  { id:'upperA', name:'Upper A', type:'Forza', exercises:[ { codice:'EX001', name:'Panca elastico', sets:4 }, { codice:'EX020', name:'Rematore elastico', sets:4 }, { codice:'EX062', name:'Alzate laterali', sets:3 }, { codice:'EX072', name:'Plank', sets:3 } ] },
  { id:'lowerA', name:'Lower A', type:'Forza', exercises:[ { codice:'EX040', name:'Squat elastico', sets:4 }, { codice:'EX050', name:'Stacco rumeno elastico', sets:4 }, { codice:'EX067', name:'Calf raise', sets:3 } ] },
  { id:'upperB', name:'Upper B', type:'Ipertrofia', exercises:[ { codice:'EX002', name:'Piegamenti', sets:4 }, { codice:'EX030', name:'Lat machine elastico', sets:4 }, { codice:'EX063', name:'Curl elastico', sets:3 } ] },
  { id:'lowerB', name:'Lower B', type:'Ipertrofia', exercises:[ { codice:'EX041', name:'Affondi', sets:4 }, { codice:'EX051', name:'Hip thrust', sets:4 } ] },
  { id:'recoveryUpper', name:'Recovery Upper', type:'Recupero', exercises:[ { codice:'EX062', name:'Alzate laterali', sets:3 } ] },
] };
function fixture(){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', obiettivo:'ricomposizione', tipo_allenamento:'casa', attrezzatura:['elastico','sbarra'], giorni_allenamento:4, volume_sessione:'completo', note_salute:'Esperienza: avanzato', train_start_date:'2026-10-05' }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: catalogo.map(c => ({ ...c })),
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
(async () => {
  const t = fixture();
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  // ── il conto, dalla scheda vecchia col catalogo ──
  const riga = (ex) => ST.catalogInfoByCodice.get(ex.codice);
  const v = b.win.volumeSettimanale(scheda.sessioni, riga);
  atteso('conto · spinte: petto per intero, tricipiti e deltoidi anteriori a metà (4+4 → 8 · 4 · 4)', [v.petto, v.tricipiti, v['deltoidi anteriori']], [8, 4, 4]);
  atteso('conto · tirate: dorsali 8, bicipiti 4 dalle tirate + 3 dal curl = 7', [v.dorsali, v.bicipiti], [8, 7]);
  atteso('conto · gambe: quadricipiti 8, glutei 4+4+4 = 12, ischio 8, polpacci 3; il recupero non conta', [v.quadricipiti, v.glutei, v.ischiocrurali, v.polpacci, v['deltoidi laterali']], [8, 12, 8, 3, 3]);
  atteso('minimi · 10 per ricomposizione e ipertrofia, 8 per forza e dimagrimento, 6 per mantenimento e longevità, 8 senza obiettivo', [b.win.volumeMinimi('ricomposizione').petto, b.win.volumeMinimi('ipertrofia').petto, b.win.volumeMinimi('forza_performance').petto, b.win.volumeMinimi('mantenimento').petto, b.win.volumeMinimi('perdita_peso').petto, b.win.volumeMinimi('').petto], [10, 10, 8, 6, 8, 8]);
  const conto = b.win.volumeContoMinimi(scheda.sessioni, 'ricomposizione', riga);
  atteso('conto coi minimi · sotto: tutti tranne i glutei (12)', conto.filter(r => r.sotto).map(r => r.gruppo).sort(), ['bicipiti', 'deltoidi laterali', 'deltoidi posteriori', 'dorsali', 'ischiocrurali', 'petto', 'polpacci', 'quadricipiti', 'tricipiti']);
  // ── il Programma mostra il conto ──
  ST.page = 'training'; ST.trainTab = 'piano'; ST.trainSession = null; b.win.renderTraining();
  const doc = b.win.document;
  atteso('programma · la card c\'è e dice quanti muscoli sono sotto', [!!doc.getElementById('volume-card'), /9 muscoli sotto il minimo/.test(testo(doc.getElementById('volume-card').innerHTML))], [true, true]);
  ST.trainVolumeOpen = true; b.win.renderTraining();
  const card = testo(doc.getElementById('volume-card').innerHTML);
  atteso('programma · aperta: una riga per gruppo, serie / minimo', [doc.querySelectorAll('.volume-riga').length, /glutei 12 \/ 10 ✓/.test(card), /bicipiti 7 \/ 10 ▼/.test(card)], [10, true, true]);
  // ── il generatore riempie: prima una serie in più, poi un esercizio ──
  const gen = await b.win.generateTrainingProgram({ source:'prova', force:true, dryRun:true });
  const sessioni = gen.sessioni;
  const vg = b.win.volumeContoMinimi(sessioni, 'ricomposizione');
  const tutti = [].concat(...sessioni.map(s => s.exercises || []));
  const conIso = ['deltoidi posteriori', 'bicipiti', 'tricipiti', 'glutei', 'ischiocrurali'];   // i gruppi con almeno due isolamenti a catalogo (polpacci e laterali ne hanno uno: restano sotto)
  atteso('generatore · nessun gruppo con isolamenti a catalogo resta sotto il minimo', vg.filter(r => conIso.includes(r.gruppo) && r.sotto).map(r => `${r.gruppo} ${r.serie}/${r.minimo}`), []);
  atteso('generatore · polpacci: un solo isolamento a catalogo → +1 serie (4) e resta sotto, senza doppioni', [vg.find(r => r.gruppo === 'polpacci').serie, tutti.filter(e => e.codice === 'EX067').length], [4, 1]);
  atteso('generatore · gli esercizi portano schema e gruppo nel jsonb', tutti.every(e => e.pattern && (e.gruppo_target || /^(spinta|tirata|dominante)/.test(e.pattern))), true);
  const inPiu = tutti.filter(e => e.serieInPiu), aggiunti = tutti.filter(e => e.perVolume);
  atteso('generatore · c\'è chi ha una serie in più (4 invece di 3) e chi è entrato per il volume', [inPiu.length > 0, inPiu.every(e => e.sets === 4), aggiunti.length > 0, aggiunti.every(e => e.pattern === 'isolamento')], [true, true, true, true]);
  atteso('generatore · la diagnostica dice chi è entrato per il volume', sessioni.some(s => s._diag && (s._diag.bonus || []).some(x => /:volume$/.test(x))), true);
  atteso('generatore · chi entra per il volume non è in nessun\'altra seduta', aggiunti.every(a => tutti.filter(e => e.codice === a.codice).length === 1), true);
  atteso('generatore · una serie in più al massimo per esercizio, un esercizio al massimo per gruppo', [inPiu.every(e => e.serieInPiu === 1), new Set(aggiunti.map(e => e.perVolume)).size === aggiunti.length], [true, true]);
  // ── «Cambia ›» nell'anteprima del blocco nuovo tiene la serie in più e il «per il volume» (revisione di 480+490) ──
  {
    await b.win.preparaBloccoNuovo();
    const bn = b.win.eval('ST.bloccoNuovo');
    const cand = [];
    (bn.scheda.sessioni || []).forEach(s => (s.exercises || []).forEach(e => { if(e.serieInPiu || e.perVolume) { const alt = b.win.candidatiBloccoNuovo(s.id, e.codice); if(alt.length) cand.push({ s, e, alt }); } }));
    atteso('anteprima · c\'è un esercizio con la serie in più (o entrato per il volume) che si può cambiare', cand.length > 0, true);
    if(cand.length) {
      const { s, e, alt } = cand[0];
      const nuovo = b.win.cambiaEsercizioBloccoNuovo(s.id, e.codice, alt[0].codice);
      atteso('anteprima · «Cambia ›»: il sostituto ha le stesse serie, la stessa serie in più e lo stesso «per il volume»', nuovo && [nuovo.sets, nuovo.serieInPiu || 0, nuovo.perVolume || null], [e.sets, e.serieInPiu || 0, e.perVolume || null]);
    }
    b.win.closeBloccoNuovoSheet && b.win.closeBloccoNuovoSheet();
  }
  // ── il quadro della settimana: serie previste ──
  const vuoto = { weightLogs:[], bodyLogs:[], measurements:[], checks:[], meals:[], suppLogs:[], supps:[], catalog:[], sets:[], workouts:[], blood:[], errors:[] };
  const ctx = { today:OGGI, nowTs:new Date(OGGI + 'T12:00:00').getTime(), profile:{ giorni_allenamento:4, train_start_date:'2026-10-05' }, target:null, workPerGiro:4, deloads:[] };
  const raw = { ...vuoto, workouts:[{ date:'2026-10-12', session_type:'upperA', completed:true }], sets:[{ date:'2026-10-12', session_id:'upperA', rir_actual:2 }, { date:'2026-10-12', session_id:'upperA', rir_actual:2 }] };
  const pic = Q.computeWeeklyPicture(raw, '2026-10-12', { ...ctx, sessioni: scheda.sessioni });
  atteso('quadro · serie fatte 2, previste 44 (i recuperi non contano); senza le sedute previste null', [pic.training.volume_sets, pic.training.volume_planned, Q.computeWeeklyPicture(raw, '2026-10-12', ctx).training.volume_planned], [2, 44, null]);
  const cron = fs.readFileSync(path.join(__dirname, '..', '..', 'worker', 'src', 'coach-cron.js'), 'utf8');
  atteso('Worker · il cron passa le sedute al quadro', /sessioni,\s*\/\/ Training 110/.test(cron), true);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
