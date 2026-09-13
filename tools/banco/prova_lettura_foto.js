// Fase 2 — Lavoro E: lettura delle foto nel dettaglio del check, e nel quadro.
// Worker finto (window.fetch) e sessione finta: nessuna rete.
//   node tools/banco/prova_lettura_foto.js [cartella_uscita]
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
const OUT = process.argv[2] || null;
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(52), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const aspetta = (ms) => new Promise(r => setTimeout(r, ms || 20));

const checks = [
  { user_id:U, id:'c1', status:'completed', created_at:'2026-07-04T03:32:48Z' },
  { user_id:U, id:'c2', status:'completed', created_at:'2026-08-02T05:38:24Z' },
];
const lettura = (over) => ({
  id:'r1', user_id:U, check_id:'c2', previous_check_id:'c1', model:'gemini-x', confidence:'media', created_at:'2026-09-13T07:00:00Z',
  result: {
    overall:'migliorato', confidence:'media',
    areas:[ { zona:'addome', change:'più definito', note:'La linea della vita è più netta.' }, { zona:'gambe', change:'uguale', note:'Nessuna differenza.' }, { zona:'schiena', change:'non valutabile', note:'Luce troppo diversa.' } ],
    photo_quality:{ ok:true, issues:[] },
    summary:'Le misure dicono vita −2 cm e le foto vanno nella stessa direzione.',
    suggested_focus:'Guarda come cambia l’addome di profilo.',
    meta:{ prompt_version:'2026-09-13', days_between:29 },
    ...over,
  },
});

function avvia(tables){
  const b = boot({ body_checks: checks, body_measurements: [], body_check_photos: [], blood_tests: [], body_logs: [], weight_logs: [], ...tables }, { now:'2026-09-13T09:00:00' });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, created_at:'2026-05-01T08:00:00Z', target_kcal:2200 };
  ST.bodyChecks = checks.map(({ id, status, created_at }) => ({ id, status, created_at }));
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'token-finto' } } });
  b.chiamate = [];
  return b;
}
const dettaglio = (win) => win.document.getElementById('body-check-detail');
const card = (win) => { const c = dettaglio(win).querySelector('.bca-card'); return c ? testo(c.innerHTML) : null; };
function snapshot(win, file){
  const doc = win.document;
  const head = [...doc.head.querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"], meta[name="viewport"]')].map(n => n.outerHTML).join('\n');
  fs.writeFileSync(file, `<!doctype html><html lang="it"><head><meta charset="utf-8">${head}
<style>body{margin:0;background:var(--bg);} #shot{width:375px;margin:0 auto;} #shot > div{position:static!important;display:block!important;}</style></head>
<body><div id="shot">${dettaglio(win).outerHTML.replace(/<img[^>]*>/g, '')}</div></body></html>`);
}

(async () => {
  // 1. check senza lettura, con un check precedente: pulsante "Confronta"
  let b = avvia({});
  await b.win.openBodyCheckDetail('c2');
  atteso('senza lettura · pulsante', card(b.win), 'Lettura di Pirsi Confronta le foto con Pirsi → Lettura indicativa basata sulle foto: contano più le misure e la tendenza del peso.');
  if(OUT) snapshot(b.win, path.join(OUT, 'lettura-pulsante.html'));

  // 1b. primo check: niente confronto possibile, il pulsante lo dice
  await b.win.openBodyCheckDetail('c1');
  atteso('primo check · pulsante', /Fai leggere le foto a Pirsi →/.test(card(b.win)), true);

  // 2. tocco: spinner e pulsante spento finché il Worker non risponde, poi la card
  await b.win.openBodyCheckDetail('c2');
  let risolvi;
  b.win.fetch = (url, opts) => { b.chiamate.push({ url, body: JSON.parse(opts.body), auth: opts.headers.Authorization }); return new Promise(r => { risolvi = r; }); };
  const inCorso = b.win.requestBodyCheckAI('c2');
  await aspetta();
  const btn = dettaglio(b.win).querySelector('.bca-btn');
  atteso('in corso · pulsante spento', btn.disabled, true);
  atteso('in corso · testo', testo(btn.innerHTML), 'Sto guardando le foto…');
  if(OUT) snapshot(b.win, path.join(OUT, 'lettura-in-corso.html'));
  atteso('in corso · richiesta al Worker', [b.chiamate[0].url.endsWith('/vision-check'), b.chiamate[0].body, b.chiamate[0].auth],
    [true, { user_id:U, check_id_current:'c2', check_id_previous:'c1' }, 'Bearer token-finto']);
  const doppio = b.win.requestBodyCheckAI('c2');                         // doppio tocco: nessuna seconda chiamata
  await doppio;
  atteso('doppio tocco · una sola chiamata', b.chiamate.length, 1);
  risolvi({ ok:true, status:200, json: async () => ({ ok:true, reading: lettura() }) });
  await inCorso; await aspetta();
  const c = card(b.win);
  atteso('con lettura · esito e affidabilità', /Migliorato Affidabilità media/.test(c), true);
  atteso('con lettura · pallino ambra', /bca-dot" style="background:var\(--warn\)/.test(dettaglio(b.win).innerHTML), true);
  atteso('con lettura · solo zone cambiate', [/addome · più definito/.test(c), /gambe/.test(c), /schiena/.test(c)], [true, false, false]);
  atteso('con lettura · sommario e prossime 4 settimane', [/vita −2 cm/.test(c), /Nelle prossime 4 settimane:/.test(c)], [true, true]);
  atteso('con lettura · nessun riquadro consigli (foto ok)', /Per un confronto migliore/.test(c), false);
  atteso('con lettura · confronto e nota', [/Confronto con il check del sab 4 lug · 29 giorni/.test(c), /Lettura indicativa basata sulle foto/.test(c)], [true, true]);
  if(OUT) snapshot(b.win, path.join(OUT, 'lettura-card.html'));

  // 3. errore del Worker: toast leggibile, pulsante di nuovo attivo, niente card
  b = avvia({});
  await b.win.openBodyCheckDetail('c2');
  b.win.fetch = async () => ({ ok:false, status:502, json: async () => ({ error:{ source:'worker', kind:'invalid-json', status:502, message:'x' } }) });
  await b.win.requestBodyCheckAI('c2');
  const toast = b.win.document.getElementById('toast').textContent;
  atteso('errore · toast', toast, '⚠️ Non sono riuscito a leggere le foto: riprova tra poco');
  const btn3 = dettaglio(b.win).querySelector('.bca-btn');
  atteso('errore · pulsante di nuovo attivo', [btn3.disabled, testo(btn3.innerHTML)], [false, 'Confronta le foto con Pirsi →']);
  b.win.fetch = async () => ({ ok:false, status:429, json: async () => ({ error:{ kind:'too-soon', status:429 } }) });
  await b.win.requestBodyCheckAI('c2');
  atteso('troppo presto · toast', b.win.document.getElementById('toast').textContent, '⚠️ Ho appena letto queste foto: riprova tra qualche minuto');
  b.win.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await b.win.requestBodyCheckAI('c2');
  atteso('senza rete · toast', b.win.document.getElementById('toast').textContent, '⚠️ Connessione assente: riprova quando sei online');

  atteso('con lettura · minuscola dopo i due punti', /settimane: guarda come/.test(c), true);

  // 3b. primo check letto: nessuna etichetta davanti al consiglio (parla già del prossimo check)
  b = avvia({ body_check_ai: [ { ...lettura({ overall:'primo_check', areas:[], suggested_focus:'Per il prossimo check, stessa luce e stessa distanza.' }), check_id:'c1', previous_check_id:null } ] });
  await b.win.openBodyCheckDetail('c1');
  const c3b = card(b.win);
  atteso('primo check letto · consiglio senza etichetta', [/Primo check/.test(c3b), /Per il prossimo check, stessa luce/.test(c3b), /prossime 4 settimane/.test(c3b), /Primo check: niente confronto/.test(c3b)], [true, true, false, true]);

  // 4. foto di qualità scarsa: riquadro consigli, problemi tradotti
  b = avvia({ body_check_ai: [ lettura({ overall:'stabile', confidence:'bassa', photo_quality:{ ok:false, issues:['luce diversa', 'distanza diversa', 'foto mancante: right'] } }) ] });
  await b.win.openBodyCheckDetail('c2');
  const c4 = card(b.win);
  atteso('qualità scarsa · pallino grigio', /Stabile Affidabilità bassa/.test(c4) && /background:#9A968C/.test(dettaglio(b.win).innerHTML), true);
  atteso('qualità scarsa · consigli', (c4.match(/Per un confronto migliore la prossima volta: (.*?) Confronto con/) || [])[1],
    'Scatta con la stessa luce: stessa stanza e stessa ora del giorno. Tieni il telefono alla stessa distanza, sempre a figura intera. Scatta anche la foto di profilo destro.');
  if(OUT) snapshot(b.win, path.join(OUT, 'lettura-qualita-scarsa.html'));

  // 5. lettura già salvata: si legge dalla tabella, nessuna chiamata al Worker
  b = avvia({ body_check_ai: [ lettura() ] });
  b.win.fetch = async () => { b.chiamate.push(1); return { ok:false, status:500, json: async () => ({}) }; };
  await b.win.openBodyCheckDetail('c2');
  atteso('lettura salvata · card senza chiamate', [/Migliorato/.test(card(b.win)), b.chiamate.length], [true, 0]);

  // 6. fine M2: la proposta compare, ma la lettura non parte da sola
  b = avvia({});
  b.win.fetch = async () => { b.chiamate.push(1); return { ok:true, status:200, json: async () => ({ reading: lettura() }) }; };
  await b.win.bcaOfferAfterCheck('c2');
  const offerta = b.win.document.getElementById('bca-offer');
  atteso('fine check · proposta', offerta ? testo(offerta.innerHTML) : null, "Vuoi che Pirsi confronti le foto con l'ultimo check? Non ora Confronta →");
  atteso('fine check · nessuna chiamata automatica', b.chiamate.length, 0);
  b.win.bcaOfferClose();
  await b.win.bcaOfferAfterCheck('c1');                                  // primo check: niente con cui confrontare
  atteso('primo check · nessuna proposta', !!b.win.document.getElementById('bca-offer'), false);

  // 7. quadro, blocco Corpo: esito e affidabilità dell'ultima lettura
  b = avvia({ body_check_ai: [ lettura() ], body_measurements: [ { user_id:U, id:'m2', check_id:'c2', created_at:'2026-08-02T05:53:34Z', waist_cm:87 } ] });
  const ST = b.win.eval('ST'); ST.page = 'home';
  const pic = await b.win.loadWeeklyPicture(b.win.wpMonday(), { force:true });
  atteso('quadro · campi della lettura', [pic.body.ai_overall, pic.body.ai_confidence, pic.body.ai_check_date], ['migliorato', 'media', '2026-08-02']);
  b.win.openQuadro(); await aspetta(40);
  const corpo = [...b.win.document.querySelectorAll('#page-home .wp-sec')].find(s => /Corpo/.test(s.querySelector('.wp-sec-title').textContent));
  atteso('quadro · riga nel blocco Corpo', testo(corpo.querySelector('.wp-ai-line').innerHTML), 'Lettura foto del 2 ago: migliorato · affidabilità media');
  const chiusa = await b.win.loadWeeklyPicture('2026-08-31');           // lettura del 13/09: dopo la fine di quella settimana
  atteso('quadro · settimana chiusa prima della lettura', chiusa.body.ai_overall, null);

  // 8. tabella body_check_ai assente: il quadro non segnala errori
  b = avvia({});
  const supa = b.win.eval('supa'); const fromVero = supa.from;
  supa.from = (t) => t === 'body_check_ai'
    ? new Proxy({}, { get: () => () => { const q = { eq:()=>q, order:()=>q, select:()=>q, range:()=>Promise.resolve({ data:null, error:{ code:'PGRST205', message:"Could not find the table 'public.body_check_ai'" } }), maybeSingle:()=>Promise.resolve({ data:null, error:{ code:'PGRST205' } }) }; return q; } })
    : fromVero(t);
  b.win.eval('ST').page = 'home';
  const p8 = await b.win.loadWeeklyPicture(b.win.wpMonday(), { force:true });
  atteso('tabella assente · quadro senza errori', p8.meta.errors, []);
  await b.win.openBodyCheckDetail('c2');
  atteso('tabella assente · dettaglio col pulsante', /Confronta le foto con Pirsi/.test(card(b.win)), true);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
