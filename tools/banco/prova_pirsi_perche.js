// Pirsi 120 — «Perché?» su ogni proposta: il coach spiega con i soli numeri salvati con la proposta.
//   Il tasto sta nella card «Pirsi propone»; parte da un tocco; al coach vanno titolo, motivo, numeri e cosa cambia con
//   «Accetto», con la voce di Pirsi e senza il nome della persona; la spiegazione compare sotto i numeri e resta sul
//   telefono (zt_perche_<utente>): riaprire la Home non la richiede; se il coach tace o sbaglia, un avviso e il tasto resta.
//   Orologio: lunedì 14 settembre 2026, 9:00.
//   node tools/banco/prova_pirsi_perche.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const R = require('../../shared/coach_rules.js');
const NOW = '2026-09-14T09:00:00';
const U = 'u1', WS = '2026-09-07';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const add = (key, d) => { const x = new Date(key + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const q = (k, w) => ({ weight: { weight_avg: w, weight_last: w, weight_n: 4 }, nutrition: { kcal_avg: 2300, protein_avg: 170, days_logged: 7, logged_dates: [0,1,2,3,4,5,6].map(i => add(add(WS, -7 * k), i)), adherence_kcal: 0.86, days_partial: 0, partial: false },
  training: { sessions_planned: 4, sessions_done: 4, block_week: 3, is_deload: false, avg_rir: 1.5, injury_days: 0, injury_active: false },
  body: { days_since_check: 20 }, blood: { test_count: 1, days_since_test: 30 }, meta: { version: 2, week_start: add(WS, -7 * k) } });
const profilo = { obiettivo: 'dimagrimento', goal_weight_kg: 68, target_kcal: 2324, target_protein: 198, target_carbs: 221, target_fat: 72, giorni_allenamento: 4 };
const stallo = [75.0, 75.1, 75.0, 75.1, 75.0];
const proposte = R.buildProposals(q(0, stallo[0]), stallo.slice(1).map((w, k) => q(k + 1, w)), profilo);
const righe = proposte.map((p, i) => ({ id: 'cp' + i, user_id: U, week_start: WS, kind: p.kind, title: p.title, reason: p.reason, evidence: p.evidence, change: p.change, status: 'pending', created_at: '2026-09-14T04:00:05Z' }));

function avvia(ls){
  const tables = { weight_logs:[], body_logs:[], body_measurements:[], body_checks:[], meals:[], supplements_log:[], supplements:[], nutrilite_catalog:[],
    workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[], coach_proposals: righe.map(r => ({ ...r })) };
  const b = boot(tables, { now: NOW });
  const win = b.win, ST = win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, first_name:'Ignazio', created_at:'2026-05-01T08:00:00Z', ...profilo };
  win.applyProfile(ST.profile);
  ST.page = 'home';
  if(ls) Object.keys(ls).forEach(k => win.localStorage.setItem(k, ls[k]));
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'token-finto' } } });
  const chiamate = [];
  const ctx = { ...b, win, ST, tables, chiamate };
  ctx.risposta = async () => ({ ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'Il peso è fermo da due settimane e hai centrato il target: per questo tolgo 150 kcal.' }] }) });
  win.fetch = (url, opts) => { chiamate.push({ url, opts }); return ctx.risposta(opts); };
  return ctx;
}
const card = (b) => b.win.document.querySelector('.cp-card');
const perche = (b, id) => b.win.document.querySelector(`.cp-item[data-cp="${id}"] .cp-why`);
const spiegazione = (b, id) => testo(b.win.document.querySelector(`.cp-item[data-cp="${id}"] .cp-why-text`));
const toast = (b) => testo(b.win.document.getElementById('toast'));

(async () => {
  let b = avvia();
  await b.win.loadCoachProposals({ force:true }); b.win.renderHomeV2(); await attendi(40);
  const kcal = righe.find(r => r.kind === 'kcal');
  atteso('card · una proposta sulle calorie, col tasto «Perché?» e senza spiegazione', [!!card(b), !!kcal, testo(perche(b, kcal.id)), spiegazione(b, kcal.id)], [true, true, 'Perché?', null]);

  // 1. un tocco: la richiesta al coach ha la voce, i numeri della proposta e cosa cambia; niente nome
  perche(b, kcal.id).click(); await attendi(60);
  atteso('tocco · una chiamata al Worker', [b.chiamate.length, b.chiamate[0].url], [1, 'https://zona-ai.ignazio-f.workers.dev']);
  const corpo = JSON.parse(b.chiamate[0].opts.body);
  const prompt = JSON.stringify(corpo);
  const numeri = kcal.evidence.numeri;
  atteso('tocco · voce di Pirsi, titolo, motivo, ogni numero, cosa cambia', [/Sei Pirsi/.test(prompt), prompt.includes(kcal.title), prompt.includes(kcal.reason.slice(0, 40)), numeri.every(r => prompt.includes(r.label) && prompt.includes(r.value)), /calorie al giorno: da 2324 a 2174/.test(prompt)], [true, true, true, true, true]);
  atteso('tocco · il nome della persona non parte', /Ignazio/.test(prompt), false);
  atteso('tocco · la spiegazione sotto i numeri, il tasto sparisce', [spiegazione(b, kcal.id), !!perche(b, kcal.id)], ['Il peso è fermo da due settimane e hai centrato il target: per questo tolgo 150 kcal.', false]);
  const salvati = JSON.parse(b.win.localStorage.getItem('zt_perche_' + U));
  atteso('tocco · salvata sul telefono', salvati[kcal.id].t.slice(0, 20), 'Il peso è fermo da d');

  // 2. riaprire la Home: la spiegazione salvata si usa senza chiamare il coach (chiusa, si riapre con un tocco)
  b = avvia({ ['zt_perche_' + U]: JSON.stringify({ [kcal.id]: { t:'spiegazione di prima', at: Date.now() - 3600000 } }) });
  await b.win.loadCoachProposals({ force:true }); b.win.renderHomeV2(); await attendi(40);
  atteso('riapertura · tasto presente, nessuna chiamata', [testo(perche(b, kcal.id)), b.chiamate.length], ['Perché?', 0]);
  perche(b, kcal.id).click(); await attendi(40);
  atteso('riapertura · un tocco mostra quella salvata, niente chiamata', [spiegazione(b, kcal.id), b.chiamate.length], ['spiegazione di prima', 0]);

  // 3. il coach tace o la rete manca: avviso con parole, il tasto resta
  b = avvia();
  await b.win.loadCoachProposals({ force:true }); b.win.renderHomeV2(); await attendi(40);
  b.risposta = async () => { throw new TypeError('Failed to fetch'); };
  perche(b, kcal.id).click(); await attendi(60);
  atteso('rete assente · avviso e tasto ancora lì', [toast(b), testo(perche(b, kcal.id)), spiegazione(b, kcal.id)], ['⚠️ Non riesco a spiegartelo ora. Connessione assente, controlla la rete.', 'Perché?', null]);
  b.risposta = async () => ({ ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'   ' }] }) });
  perche(b, kcal.id).click(); await attendi(60);
  atteso('risposta vuota · avviso, niente salvato', [/Non riesco a spiegartelo ora/.test(toast(b)), b.win.localStorage.getItem('zt_perche_' + U)], [true, null]);

  // 4. Accetto e Non ora funzionano come prima, con la spiegazione aperta
  b.risposta = async () => ({ ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'Spiegato.' }] }) });
  perche(b, kcal.id).click(); await attendi(60);
  atteso('spiegazione aperta · i due tasti ci sono', [!!b.win.document.querySelector(`.cp-item[data-cp="${kcal.id}"] .cp-yes`), !!b.win.document.querySelector(`.cp-item[data-cp="${kcal.id}"] .cp-no`)], [true, true]);
  await b.win.rejectCoachProposal(kcal.id); await attendi(40);
  atteso('Non ora · la proposta esce dalla card', !!b.win.document.querySelector(`.cp-item[data-cp="${kcal.id}"]`), false);

  // 5. la proposta «prima mangia» (Pirsi 080) ha area e si accetta aprendo Nutrition
  const eat = { id:'cpE', user_id:U, week_start:WS, kind:'eat_first', title:'Prima mangia, poi lo scarico', reason:'r', evidence:{ numeri:[{ label:'Sedute dure', value:'3 / 4' }] }, change:null, status:'pending', created_at:'2026-09-14T04:00:05Z' };
  b = avvia(); b.tables.coach_proposals.push(eat);
  await b.win.loadCoachProposals({ force:true }); b.win.renderHomeV2(); await attendi(40);
  atteso('eat_first · nella card, area Allenamento', testo(b.win.document.querySelector('.cp-item[data-cp="cpE"] .cp-kind')), 'Allenamento');
  await b.win.acceptCoachProposal('cpE'); await attendi(40);
  const riga = b.tables.coach_proposals.find(r => r.id === 'cpE');
  atteso('eat_first · Accetto: segnata e si va a Nutrition', [b.supa._calls.some(c => c.table === 'coach_proposals' && c.op === 'update' && c.payload.status === 'accepted'), b.ST.page], [true, 'oggi']);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
