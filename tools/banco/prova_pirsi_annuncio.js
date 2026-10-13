// Pirsi 050 — l'annuncio del piano non dice più sempre «non li tocco».
// Tre casi: primo piano · obiettivi invariati · obiettivi cambiati (di quanto, e perché se lo sa).
// Il contesto arriva dall'ultimo piano prima, dalle proposte accettate e dal ritmo del peso;
// l'esempio di tono e il ripiego senza coach seguono il caso. Orologio: domenica 11 ottobre 2026.
//   node tools/banco/prova_pirsi_annuncio.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-10-11T18:00:00';
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(64), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const T = { kcal:2200, protein:165, carbs:210, fat:68 };
const piano = (week_start, t) => ({ id:'p-' + week_start, user_id:U, week_start, status:'active', target_kcal:t.kcal, target_protein:t.protein, target_carbs:t.carbs, target_fat:t.fat, ai_reasoning:'x' });
const quadro = () => ({ weight:{ weight_avg:72.3, weight_n:3, weight_delta_prev:-0.4, weight_trend_4w:-0.2 }, nutrition:{}, training:{}, body:{}, meta:{ week_start:'2026-10-05', errors:[] } });

function avvia(tables, extra){
  const b = boot({ weekly_plans:[], coach_proposals:[], weekly_pictures:[], weekly_plan_meals:[], ...tables }, { now: NOW });
  const win = b.win, ST = win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, sex:'M', age:55, obiettivo:'dimagrimento', target_kcal:T.kcal, target_protein:T.protein, target_carbs:T.carbs, target_fat:T.fat, plan_generation_day:'sun', ...(extra || {}) };
  ST.TARGET = { ...T };
  ST.coachProposals = [];
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'token-finto' } } });
  const prompts = [];
  win.fetch = async (url, opts) => { prompts.push(JSON.parse(opts.body).messages[0].content); return { ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'TESTO DEL COACH' }] }) }; };
  return { ...b, win, ST, prompts };
}
const dopo = (t, marker) => t.slice(t.indexOf(marker));   // le righe del caso stanno dopo il ritratto
const WS = '2026-10-12';

(async () => {
  // ── 1. primo piano: nessun piano prima ──
  let b = avvia({});
  let ctx = await b.win._pianoV4ContestoAnnuncio(WS, T);
  atteso('primo · contesto', [ctx.caso, ctx.precedente, ctx.proposte, ctx.peso], ['primo', null, [], null]);
  await b.win._pianoV4GenerateReasoning(T, ctx);
  let p = b.prompts[0], coda = dopo(p, 'Stai annunciando');
  atteso('primo · il prompt lo dice e dà i numeri', [/suo PRIMO piano/.test(coda), /kcal 2200, proteine 165g, carboidrati 210g, grassi 68g/.test(coda)], [true, true]);
  atteso('primo · da nessuna parte «non li tocco» né «stanno funzionando» come fatto', [/non li tocco/.test(p), /Si parte da 2\.200 kcal/.test(p)], [false, true]);
  atteso('primo · ripiego', b.win._pianoV4AnnuncioRipiego(T, ctx), 'Primo piano: 2.200 kcal e 165 g di proteine al giorno, da provare per una settimana. Poi guardiamo i numeri veri e si aggiusta.');

  // ── 2. invariati: il piano prima aveva gli stessi numeri; il peso scende ──
  b = avvia({ weekly_plans:[ piano('2026-10-05', T), piano('2026-09-28', { kcal:2300, protein:150, carbs:230, fat:70 }) ] });
  b.ST.weeklyPicture = { '2026-10-05': quadro() };
  ctx = await b.win._pianoV4ContestoAnnuncio(WS, T);
  atteso('invariati · confronta con l\'ULTIMO piano prima, non col più vecchio', [ctx.caso, ctx.precedente.week_start, ctx.diff.anyDiff], ['invariati', '2026-10-05', false]);
  atteso('invariati · ritmo del peso dal quadro della settimana che si chiude', ctx.peso, { delta:-0.4, trend:-0.2 });
  await b.win._pianoV4GenerateReasoning(T, ctx);
  p = b.prompts[0]; coda = dopo(p, 'Stai annunciando');
  atteso('invariati · NON cambiano, numeri, peso', [/NON cambiano/.test(coda), /kcal 2200, proteine 165g/.test(coda), /Ritmo del peso: peso medio −0,4 kg sulla settimana prima, tendenza a 4 settimane −0,2 kg a settimana/.test(coda)], [true, true, true]);
  atteso('invariati · «stanno funzionando» solo se il peso va nella direzione giusta', /se va nella direzione dell'obiettivo stanno funzionando/.test(coda), true);
  atteso('invariati · esempio di tono di prima', /Stessi numeri della settimana scorsa: stanno funzionando, non li tocco\. Tu hai saltato/.test(p), true);
  atteso('invariati · ripiego di prima', b.win._pianoV4AnnuncioRipiego(T, ctx), 'Stessi numeri della settimana scorsa: stanno funzionando, non li tocco. Quello che cambia le cose adesso è chiudere la settimana intera, un pasto alla volta.');

  // ── 3. cambiati: proposta accettata tre giorni fa, −100 kcal e +15 g di proteine ──
  b = avvia({ weekly_plans:[ piano('2026-10-05', { kcal:2300, protein:150, carbs:230, fat:70 }) ] });
  b.ST.coachProposals = [
    { id:'c1', kind:'kcal', status:'accepted', title:'Scendi a 2200 kcal', week_start:'2026-10-05', decided_at:'2026-10-08T07:00:00Z', change:{ target_kcal:{ from:2300, to:2200 } } },
    { id:'c2', kind:'kcal', status:'accepted', title:'Vecchia', week_start:'2026-08-31', decided_at:'2026-09-01T07:00:00Z', change:{} },
    { id:'c3', kind:'check', status:'accepted', title:'Fai il check', week_start:'2026-10-05', decided_at:'2026-10-08T07:00:00Z' },
    { id:'c4', kind:'protein', status:'rejected', title:'Più proteine', week_start:'2026-10-05', decided_at:'2026-10-08T07:00:00Z' },
  ];
  ctx = await b.win._pianoV4ContestoAnnuncio(WS, T);
  atteso('cambiati · contesto: caso, delta, solo la proposta recente su kcal/proteine', [ctx.caso, ctx.diff.kcal.delta, ctx.diff.protein.delta, ctx.diff.carbs.delta, ctx.proposte.map(x => x.title)], ['cambiati', -100, 15, -20, ['Scendi a 2200 kcal']]);
  await b.win._pianoV4GenerateReasoning(T, ctx);
  p = b.prompts[0]; coda = dopo(p, 'Stai annunciando');
  atteso('cambiati · CAMBIANO, di quanto, perché', [/Gli obiettivi CAMBIANO/.test(coda), /kcal da 2300 a 2200 \(−100\), proteine da 150 a 165g \(\+15g\), carboidrati da 230 a 210g \(−20g\), grassi da 70 a 68g \(−2g\)/.test(coda), /proposta accettata «Scendi a 2200 kcal»/.test(coda)], [true, true, true]);
  atteso('cambiati · vietato dire «non li tocco», e l\'esempio non lo dice', [/NON dire «non li tocco»/.test(coda), /stanno funzionando, non li tocco/.test(p), /Scendiamo a 2\.100 kcal/.test(p)], [true, false, true]);
  atteso('cambiati · ripiego con numeri e proposta', b.win._pianoV4AnnuncioRipiego(T, ctx), 'Da questa settimana 2.200 kcal al giorno (−100 rispetto al piano prima) e 165 g di proteine (+15). Come deciso con «Scendi a 2200 kcal». Il resto resta com\'era: chiudi la settimana intera, un pasto alla volta.');
  // cambiati senza proposta: il perché è il profilo
  b.ST.coachProposals = [];
  ctx = await b.win._pianoV4ContestoAnnuncio(WS, T);
  b.prompts.length = 0; await b.win._pianoV4GenerateReasoning(T, ctx);
  atteso('cambiati senza proposta · il perché viene dalle impostazioni', /cambiati nelle impostazioni o nel profilo, non per una proposta/.test(b.prompts[0]), true);
  atteso('cambiati senza proposta · ripiego senza «come deciso»', /Come deciso/.test(b.win._pianoV4AnnuncioRipiego(T, ctx)), false);

  // ── 4. il coach non risponde: il ripiego è quello del caso ──
  b = avvia({ weekly_plans:[ piano('2026-10-05', { kcal:2300, protein:165, carbs:230, fat:70 }) ] });
  b.win.fetch = async () => { throw new Error('rete giù'); };
  ctx = await b.win._pianoV4ContestoAnnuncio(WS, T);
  atteso('coach muto · ripiego del caso cambiati', await b.win._pianoV4GenerateReasoning(T, ctx), 'Da questa settimana 2.200 kcal al giorno (−100 rispetto al piano prima). Il resto resta com\'era: chiudi la settimana intera, un pasto alla volta.');
  const muto = avvia({}); muto.win.fetch = async () => { throw new Error('rete giù'); };
  atteso('coach muto · senza contesto lo calcola da sé (nessun piano → primo)', /^Primo piano: 2\.200 kcal/.test(await muto.win._pianoV4GenerateReasoning(T)), true);

  // ── 5. tabella dei piani che non risponde: niente eccezioni, si annuncia come primo ──
  b = avvia({ __assenti:['weekly_plans'] });
  ctx = await b.win._pianoV4ContestoAnnuncio(WS, T);
  atteso('piani illeggibili · caso primo, nessuna eccezione', ctx.caso, 'primo');

  // ── 6. il postino vero passa il contesto: la riga salvata nasce dal prompt del caso giusto ──
  b = avvia({ weekly_plans:[ piano('2026-10-05', { kcal:2300, protein:150, carbs:230, fat:70 }) ] });
  const st = await b.win._pianoV4MaybePostino({ force:true });
  const nuova = b.supa._calls.find(c => c.table === 'weekly_plans' && c.op === 'insert');
  atteso('postino · piano creato per lunedì 12 con il testo del coach', [st.decision, st.weekStart, nuova && nuova.payload.ai_reasoning], ['create', WS, 'TESTO DEL COACH']);
  atteso('postino · il prompt era quello dei «cambiati»', b.prompts.some(t => /Gli obiettivi CAMBIANO rispetto al piano prima: kcal da 2300 a 2200/.test(t)), true);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
