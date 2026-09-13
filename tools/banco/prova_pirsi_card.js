// Fase 3 — Lavoro F: la card «Pirsi propone» in Home, Accetto / Non ora, e la cronologia nel quadro.
// Orologio fermo a lunedì 14 settembre 2026, 9:00. Con una cartella salva le schermate come pagine statiche.
//   node tools/banco/prova_pirsi_card.js [cartella_uscita]
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
const R = require('../../shared/coach_rules.js');
const OUT = process.argv[2] || null;
const NOW = '2026-09-14T09:00:00';
const U = 'u1', WS = '2026-09-07';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(58), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const settle = () => new Promise(r => setTimeout(r, 40));
// Proposte vere, scritte dalle regole su quadri costruiti: niente testo inventato a mano
const add = (key, d) => { const x = new Date(key + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const q = (k, w, o = {}) => ({ weight: { weight_avg: w, weight_last: w, weight_n: 4 }, nutrition: { kcal_avg: 2300, protein_avg: 170, days_logged: 7, logged_dates: [0,1,2,3,4,5,6].map(i => add(add(WS, -7 * k), i)), adherence_kcal: 0.86, days_partial: 0, partial: false },
  training: { sessions_planned: 4, sessions_done: 4, block_week: 3, is_deload: false, avg_rir: 1.5, injury_days: 0, injury_active: false, ...(o.training || {}) },
  body: { days_since_check: o.check || 20 }, blood: { test_count: 1, days_since_test: 30 }, meta: { version: 2, week_start: add(WS, -7 * k) } });
const profilo = { obiettivo: 'dimagrimento', goal_weight_kg: 68, target_kcal: 2324, target_protein: 198, target_carbs: 221, target_fat: 72, giorni_allenamento: 4 };
const riga = (p, i, status = 'pending', week = WS) => ({ id: 'cp' + i, user_id: U, week_start: week, kind: p.kind, title: p.title, reason: p.reason, evidence: p.evidence, change: p.change, status, created_at: '2026-09-14T04:00:05Z' });
const stallo = [75.0, 75.1, 75.0, 75.1, 75.0];
const unaSola = R.buildProposals(q(0, stallo[0]), stallo.slice(1).map((w, k) => q(k + 1, w)), profilo);
const tre = R.buildProposals(q(0, stallo[0], { training: { avg_rir: 0.3, sessions_done: 3 }, check: 50 }), stallo.slice(1).map((w, k) => q(k + 1, w, { training: { avg_rir: 0.4, sessions_done: 3 } })), profilo);

function avvia(proposte){
  const tables = { weight_logs:[], body_logs:[], body_measurements:[], body_checks:[], meals:[], supplements_log:[], supplements:[], nutrilite_catalog:[],
    workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[], coach_proposals: proposte };
  const b = boot(tables, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, first_name:'Ignazio', created_at:'2026-05-01T08:00:00Z', ...profilo };
  b.win.applyProfile(ST.profile);
  ST.page = 'home';
  return { ...b, ST, tables };
}
function snapshot(win, file){
  if(!OUT) return;
  const doc = win.document;
  const head = [...doc.head.querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"], meta[name="viewport"]')].map(n => n.outerHTML).join('\n');
  const home = doc.getElementById('page-home').outerHTML.replace('class="page"', 'class="page active"');
  const toast = doc.getElementById('toast');
  const t = toast && toast.classList.contains('show') ? `<div style="position:sticky;bottom:12px;margin:12px;padding:10px 14px;background:#1A1A1A;color:#fff;border-radius:10px;font-family:Syne,sans-serif;font-size:13px;">${toast.textContent}</div>` : '';
  fs.writeFileSync(path.join(OUT, file), `<!doctype html><html lang="it"><head><meta charset="utf-8">${head}
<style>body{margin:0;background:var(--bg);} .page{display:block!important;} #wp-shot{width:375px;margin:0 auto;}</style></head>
<body><div id="wp-shot">${home}${t}</div></body></html>`);
}
const card = (win) => win.document.querySelector('#page-home .cp-card');
const erroriConsole = (logs) => logs.filter(l => (l[0] === 'jsdomError' && !/register/.test(l[1])) || l[0] === 'error');

(async () => {
  atteso('fixture · una proposta (stallo 2 settimane)', unaSola.map(p => p.kind), ['kcal']);
  atteso('fixture · tre proposte', tre.map(p => p.kind), ['kcal', 'training_volume', 'deload']);

  // 1. una proposta
  let b = avvia(unaSola.map((p, i) => riga(p, i)));
  await b.win.loadCoachProposals(); await b.win.loadWeeklyPicture(b.win.wpMonday(), { force:true }); b.win.renderHomeV2();
  let c = card(b.win);
  atteso('1 proposta · card presente, sotto «La tua settimana»', !!c && c.previousElementSibling && /La tua settimana/.test(c.previousElementSibling.textContent), true);
  atteso('1 proposta · titolo e settimana', [testo(c.querySelector('.cp-title-main')), testo(c.querySelector('.cp-week'))], ['Pirsi propone', '7 – 13 set']);
  atteso('1 proposta · titolo, numeri, pulsanti', [testo(c.querySelector('.cp-title')), c.querySelectorAll('.cp-num').length, [...c.querySelectorAll('.cp-actions button')].map(testo)], ['Da 2.324 a 2.174 kcal al giorno', 4, ['Accetto', 'Non ora']]);
  atteso('nota fissa', testo(c.querySelector('.cp-note')), 'Pirsi propone, decidi tu. Per la salute conta il parere del tuo medico.');
  atteso('a schermo mai «AI»', /\bAI\b/.test(c.textContent), false);
  snapshot(b.win, 'card-1-proposta.html');

  // 2. accettazione kcal: profiles aggiornato, TARGET allineato, proposta accepted
  const prima = b.supa._calls.length;
  await b.win.acceptCoachProposal('cp0'); await settle();
  const calls = b.supa._calls.slice(prima).filter(x => x.op === 'update');
  const up = calls.find(x => x.table === 'profiles'), mark = calls.find(x => x.table === 'coach_proposals');
  atteso('accetto kcal · profiles.update con i quattro target', up && [up.payload.target_kcal, up.payload.target_protein, up.payload.target_carbs, up.payload.target_fat], [2174, 174, 207, 72]);
  atteso('accetto kcal · filtro sul proprio profilo', up && up.filters.map(f => f.join(':')), ['eq:id:u1']);
  atteso('accetto kcal · proposta accepted con decided_at e applied_at', mark && [mark.payload.status, !!mark.payload.decided_at, !!mark.payload.applied_at, mark.filters.map(f => f[1])], ['accepted', true, true, ['id', 'user_id']]);
  atteso('accetto kcal · ST.TARGET e ST.profile', [b.ST.TARGET.kcal, b.ST.TARGET.protein, b.ST.profile.target_kcal], [2174, 174, 2174]);
  atteso('accetto kcal · il Postino legge ST.profile.target_*', (await b.win._pianoV4ComputePostinoStatus({ force: true })).targets, { kcal: 2174, protein: 174, carbs: 207, fat: 72 });
  atteso('accetto kcal · toast', testo(b.win.document.getElementById('toast')), '✅ Da domani il piano usa 2.174 kcal');
  atteso('accetto kcal · la card sparisce (nessuna pending)', card(b.win), null);
  snapshot(b.win, 'accettata-kcal.html');
  atteso('accetto kcal · zero errori in console', erroriConsole(b.logs), []);

  // 3. tre proposte, poi "Non ora" sulla prima
  b = avvia(tre.map((p, i) => riga(p, i)));
  await b.win.loadCoachProposals(); await b.win.loadWeeklyPicture(b.win.wpMonday(), { force:true }); b.win.renderHomeV2();
  c = card(b.win);
  atteso('3 proposte · in ordine', [...c.querySelectorAll('.cp-item .cp-kind')].map(testo), ['Nutrizione', 'Allenamento', 'Allenamento']);
  snapshot(b.win, 'card-3-proposte.html');
  const prima3 = b.supa._calls.length;
  await b.win.rejectCoachProposal('cp0'); await settle();
  const rif = b.supa._calls.slice(prima3).filter(x => x.op === 'update');
  atteso('non ora · solo coach_proposals, status rejected', rif.map(x => [x.table, x.payload.status, !!x.payload.decided_at, 'applied_at' in x.payload]), [['coach_proposals', 'rejected', true, false]]);
  atteso('non ora · restano 2 proposte', card(b.win).querySelectorAll('.cp-item').length, 2);
  snapshot(b.win, 'rifiutata.html');

  // 4. volume a 3 giorni: la rotazione non esiste → segnata, profilo e scheda intatti
  const prima4 = b.supa._calls.length;
  await b.win.acceptCoachProposal('cp1'); await settle();
  const vol = b.supa._calls.slice(prima4).filter(x => x.op === 'update');
  atteso('volume senza rotazione · nessun update a profiles', vol.map(x => [x.table, x.payload.status, 'applied_at' in x.payload]), [['coach_proposals', 'accepted', false]]);
  atteso('volume senza rotazione · giorni_allenamento invariato', b.ST.profile.giorni_allenamento, 4);

  // 5. scarico: la settimana in corso diventa la 6
  const w = (date, st) => ({ date, session_type: st });
  b.ST.trainAllCompleted = [w('2026-08-24','upperA'), w('2026-08-25','lowerA'), w('2026-08-27','upperB'), w('2026-08-28','lowerB'), w('2026-08-31','upperA'), w('2026-09-01','lowerA'), w('2026-09-03','upperB'), w('2026-09-04','lowerB'), w('2026-09-07','upperA'), w('2026-09-08','lowerA')];
  atteso('prima dello scarico · settimana', b.win.getCycleWeekInfo().weekNum, 3);
  await b.win.acceptCoachProposal('cp2'); await settle();
  atteso('scarico accettato · settimana 6, isScarico', [b.win.getCycleWeekInfo().weekNum, b.win.getCycleWeekInfo().isScarico], [6, true]);
  atteso('nessuna proposta in attesa · niente card', card(b.win), null);
  snapshot(b.win, 'nessuna-proposta.html');

  // 6. vista completa del quadro: cosa ha proposto Pirsi, con lo stato
  b.ST.weeklyPicture = { [WS]: { ...q(0, 75), meta: { version: 2, week_start: WS, week_end: '2026-09-13', is_closed: true, completeness: 1, errors: [] } } };
  b.ST.homeView = 'quadro'; b.ST.quadroWeek = WS; b.win.renderHomeV2();
  const sez = [...b.win.document.querySelectorAll('#page-home .wp-sec')].pop();
  atteso('quadro · sezione «Cosa ha proposto Pirsi»', testo(sez.querySelector('.wp-sec-title')), 'Cosa ha proposto Pirsi');
  atteso('quadro · stati', [...sez.querySelectorAll('.wp-pill')].map(testo), ['Non ora', 'Accettata', 'Accettata']);
  snapshot(b.win, 'quadro-cosa-ha-proposto.html');

  // 7. proteine: minimo che resta dopo un ricalcolo del profilo
  const prot = { kind:'protein', title:'Proteine a 135 g al giorno', reason:'x', evidence:{ numeri:[{label:'a',value:'b'}] }, change:{ target_protein:{ from:110, to:135 } } };
  b = avvia([ riga(prot, 9) ]);
  b.ST.profile.obiettivo = 'mantenimento'; b.ST.profile.target_kcal = 1500; b.win.applyProfile(b.ST.profile);
  await b.win.loadCoachProposals(); b.win.renderHomeV2();
  atteso('proteine · prima (30% di 1.500)', [b.ST.TARGET.protein, b.ST.TARGET.carbs], [113, 150]);
  await b.win.acceptCoachProposal('cp9'); await settle();
  atteso('proteine · dopo: 135 g, carbo −22', [b.ST.TARGET.protein, b.ST.TARGET.carbs, b.ST.TARGET.kcal], [135, 128, 1500]);
  b.win.applyProfile(b.ST.profile);
  atteso('proteine · il minimo resta dopo applyProfile', b.ST.TARGET.protein, 135);

  // 8. tabella assente: nessuna card, nessun errore
  const tAss = avvia([]); tAss.tables.__assenti = ['coach_proposals'];
  await tAss.win.loadCoachProposals(); tAss.win.renderHomeV2();
  console.log(erroriConsole(tAss.logs));
  atteso('tabella assente · niente card, nessuna eccezione', [card(tAss.win), tAss.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length], [null, 0]);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
