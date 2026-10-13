// Pirsi 060 — «Accetto» sulle calorie non ritocca i pasti già pianificati.
// Lunedì 12 ottobre 2026, 9:00: la proposta è arrivata alle 6, il piano della settimana è nato ieri coi numeri vecchi.
// Dopo «Accetto»: se un piano da oggi in poi esiste si chiede «Rifaccio pranzi e cene?»; col sì i pasti si rifanno
// e la riga del piano prende i numeri nuovi e un annuncio che dice il cambio; col no, o senza piano, l'avviso dice il vero.
// Se il coach non risponde, i pasti di prima tornano.
//   node tools/banco/prova_pirsi_accetto_pasti.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-10-12T09:00:00';
const U = 'u1', WS = '2026-10-12';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const settle = () => new Promise(r => setTimeout(r, 40));
const profilo = { obiettivo:'dimagrimento', goal_weight_kg:68, target_kcal:2324, target_protein:198, target_carbs:221, target_fat:72, giorni_allenamento:4, dieta:'pescetariana', intolleranze:[] };
const proposta = { id:'cp0', user_id:U, week_start:'2026-10-05', kind:'kcal', title:'Da 2.324 a 2.174 kcal al giorno', reason:'x', evidence:{ numeri:[] },
  change:{ target_kcal:{ from:2324, to:2174 } }, status:'pending', created_at:'2026-10-12T04:00:05Z' };
const piano = (week_start) => ({ id:'piano-' + week_start, user_id:U, week_start, status:'draft', target_kcal:2324, target_protein:198, target_carbs:221, target_fat:72, ai_reasoning:'vecchio annuncio' });
const pastiDi = (planId) => { const r = []; for(let d = 1; d <= 7; d++) for(const slot of ['pranzo', 'cena']) r.push({ id:`${planId}-${d}-${slot}`, plan_id:planId, user_id:U, day_of_week:d, slot, description:'Vecchio ' + slot + ' ' + d, ingredients:['a', 'b'], meal_time:slot === 'pranzo' ? '13:00' : '20:00', kcal:700, protein:50, carbs:70, fat:20, sort_order:slot === 'pranzo' ? 1 : 2 }); return r; };
const pastiNuovi = () => { const meals = []; for(let d = 1; d <= 7; d++) for(const slot of ['pranzo', 'cena']) meals.push({ day:d, slot, description:'Nuovo ' + slot + ' ' + d, ingredients:['branzino', 'quinoa'], time:slot === 'pranzo' ? '13:00' : '20:00', kcal:650, protein:55, carbs:60, fat:18, explanation:'ok' }); return JSON.stringify({ meals }); };

function avvia(opt){
  const o = { piani:[], pasti:[], conferma:true, coachMuto:false, ...(opt || {}) };
  const tables = { weight_logs:[], body_logs:[], body_measurements:[], body_checks:[], meals:[], supplements_log:[], supplements:[], nutrilite_catalog:[],
    workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[], coach_proposals:[{ ...proposta }], weekly_plans:o.piani, weekly_plan_meals:o.pasti };
  const b = boot(tables, { now: NOW });
  const win = b.win, ST = win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, created_at:'2026-05-01T08:00:00Z', ...profilo };
  win.applyProfile(ST.profile);
  ST.page = 'home';
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'token-finto' } } });
  const prompts = [], domande = [];
  win.fetch = async (url, opts) => {
    const p = JSON.parse(opts.body).messages[0].content; prompts.push(p);
    if(o.coachMuto) throw new Error('rete giù');
    const text = /Genera 14 pasti/.test(p) ? pastiNuovi() : 'ANNUNCIO NUOVO';
    return { ok:true, status:200, json: async () => ({ content:[{ type:'text', text }] }) };
  };
  win.chiediConferma = async (t, opts) => { domande.push([t, opts && opts.ok, opts && opts.annulla]); return o.conferma; };
  return { ...b, win, ST, tables, prompts, domande };
}
const toast = (b) => testo(b.win.document.getElementById('toast'));
// Il banco applica alle tabelle solo insert e upsert: delete e update si leggono dalle chiamate registrate.
const chiamate = (b, table, op) => b.supa._calls.filter(c => c.table === table && c.op === op);
const filtro = (c, col) => { const f = (c.filters || []).find(x => x[1] === col); return f ? f[2] : null; };
const erroriConsole = (logs) => logs.filter(l => (l[0] === 'jsdomError' && !/register/.test(l[1])) || l[0] === 'error');

(async () => {
  // 1. nessun piano: niente domanda, l'avviso di prima (che qui è vero)
  let b = avvia({});
  await b.win.loadCoachProposals(); await b.win.acceptCoachProposal('cp0'); await settle();
  atteso('senza piano · nessuna domanda, avviso di prima', [b.domande.length, toast(b)], [0, '✅ Da domani il piano usa 2.174 kcal']);
  atteso('senza piano · profilo aggiornato comunque', [b.ST.profile.target_kcal, b.ST.TARGET.kcal], [2174, 2174]);

  // 2. piano di questa settimana coi numeri vecchi, «Rifai i pasti»
  b = avvia({ piani:[ piano(WS) ], pasti: pastiDi('piano-' + WS) });
  await b.win.loadCoachProposals(); await b.win.acceptCoachProposal('cp0'); await settle(); await settle();
  atteso('rifai · la domanda, coi pulsanti giusti', b.domande, [['Il piano di questa settimana è nato coi numeri di prima. Rifaccio pranzi e cene con quelli nuovi?', 'Rifai i pasti', 'Lascia così']]);
  const nuovi = b.tables.weekly_plan_meals.filter(m => m.plan_id === 'piano-' + WS && /^Nuovo/.test(m.description));
  const del = chiamate(b, 'weekly_plan_meals', 'delete');
  atteso('rifai · i 14 vecchi tolti (per piano e persona), 14 nuovi inseriti', [del.map(c => [filtro(c, 'plan_id'), filtro(c, 'user_id')]), nuovi.length, nuovi.filter(m => m.slot === 'pranzo').length], [[['piano-' + WS, U]], 14, 7]);
  const up = chiamate(b, 'weekly_plans', 'update');
  atteso('rifai · la riga del piano prende i numeri nuovi e l\'annuncio nuovo', up.map(c => [filtro(c, 'id'), c.payload.target_kcal, c.payload.target_protein, c.payload.target_carbs, c.payload.target_fat, c.payload.ai_reasoning]), [['piano-' + WS, 2174, 174, 207, 72, 'ANNUNCIO NUOVO']]);
  atteso('rifai · il prompt dei pasti usa i numeri nuovi; l\'annuncio è quello dei «cambiati»', [b.prompts.some(p => /Genera 14 pasti/.test(p) && /2174 kcal/.test(p)), b.prompts.some(p => /Gli obiettivi CAMBIANO/.test(p) && /proposta accettata «Da 2\.324 a 2\.174 kcal al giorno»/.test(p))], [true, true]);
  atteso('rifai · avviso finale', toast(b), '✅ Pranzi e cene rifatti con 2.174 kcal e 174 g di proteine');
  atteso('rifai · proposta segnata accettata', chiamate(b, 'coach_proposals', 'update').map(c => c.payload.status), ['accepted']);
  atteso('rifai · zero errori in console', erroriConsole(b.logs), []);

  // 3. «Lascia così»: pasti e riga del piano intatti, avviso che dice il vero
  b = avvia({ piani:[ piano(WS) ], pasti: pastiDi('piano-' + WS), conferma:false });
  await b.win.loadCoachProposals(); await b.win.acceptCoachProposal('cp0'); await settle();
  atteso('lascia così · pasti intatti, piano intatto, profilo nuovo', [chiamate(b, 'weekly_plan_meals', 'delete').length, chiamate(b, 'weekly_plan_meals', 'insert').length, chiamate(b, 'weekly_plans', 'update').length, b.ST.profile.target_kcal], [0, 0, 0, 2174]);
  atteso('lascia così · avviso', toast(b), '✅ Numeri nuovi salvati. I pasti già pianificati restano com\'erano');
  atteso('lascia così · nessuna chiamata al coach', b.prompts.length, 0);

  // 4. il coach non risponde: i pasti di prima tornano, la riga resta com'era
  b = avvia({ piani:[ piano(WS) ], pasti: pastiDi('piano-' + WS), coachMuto:true });
  await b.win.loadCoachProposals(); await b.win.acceptCoachProposal('cp0'); await settle(); await settle();
  const ins = chiamate(b, 'weekly_plan_meals', 'insert');
  atteso('coach muto · tolti e poi rimessi i 14 di prima, con gli stessi id', [chiamate(b, 'weekly_plan_meals', 'delete').length, ins.length, ins[0] && ins[0].payload.length, ins[0] && ins[0].payload.every(m => /^Vecchio/.test(m.description) && /^piano-/.test(m.id))], [1, 1, 14, true]);
  atteso('coach muto · riga del piano intatta', chiamate(b, 'weekly_plans', 'update').length, 0);
  atteso('coach muto · avviso onesto', toast(b), '⚠️ Non sono riuscito a rifare i pasti: quelli di prima restano. Riprova dal Piano con «Rigenera»');

  // 5. piano della settimana scorsa: non lo tocca; piano della prossima già nato: lo rifà anche lui
  b = avvia({ piani:[ piano('2026-10-05'), piano(WS), piano('2026-10-19') ], pasti: [...pastiDi('piano-2026-10-05'), ...pastiDi('piano-' + WS), ...pastiDi('piano-2026-10-19')] });
  await b.win.loadCoachProposals(); await b.win.acceptCoachProposal('cp0'); await settle(); await settle();
  const nuoviPer = (id) => b.tables.weekly_plan_meals.filter(m => m.plan_id === id && /^Nuovo/.test(m.description)).length;
  atteso('settimane · scorsa intatta, questa e prossima rifatte (in ordine)', [chiamate(b, 'weekly_plan_meals', 'delete').map(c => filtro(c, 'plan_id')), nuoviPer('piano-2026-10-05'), nuoviPer('piano-' + WS), nuoviPer('piano-2026-10-19')], [['piano-' + WS, 'piano-2026-10-19'], 0, 14, 14]);
  atteso('settimane · una domanda sola', b.domande.length, 1);

  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
