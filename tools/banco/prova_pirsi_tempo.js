// Pirsi 090 — tempo massimo alle risposte, cue sbagliati che non si tengono, cue buoni che restano, testo pulito.
//   callAI: oltre il tempo massimo l'errore è 'timeout' («Ci ho messo troppo: riprova»); 'lungo' per i 14 pasti.
//   cuePer: esc() prima di tutto; l'errore sta in ST.aiCueErrori (non in ST.aiCue) e si riprova dopo CUE_RIPROVA_MS;
//           il cue buono si salva sul telefono (zt_cue_<utente>) e la seduta dopo non chiama il coach.
//   node tools/banco/prova_pirsi_tempo.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const U = 'u1', SESS = 'upperA', EX = 'Trazioni alla sbarra';
const KEY = `${SESS}_${EX}`;

function avvia(localStorageDiPrima){
  const b = boot({ coach_proposals: [], weekly_pictures: [] }, { now:'2026-10-13T09:00:00' });
  const win = b.win, ST = win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, sex:'M', age:55, tipo_allenamento:'casa', attrezzatura:['elastici_tubo'], train_start_date:'2026-10-01' };
  ST.trainHomeData = { notStarted:false, lastSession:'lowerA', nextSession:'upperA', doneToday:false, inProgress:false };
  win.getCycleWeekInfo = () => ({ weekNum:2, isScarico:false });
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'token-finto' } } });
  if(localStorageDiPrima) Object.keys(localStorageDiPrima).forEach(k => win.localStorage.setItem(k, localStorageDiPrima[k]));
  const chiamate = [];
  const ctx = { ...b, win, ST, chiamate };
  // risposta: funzione (opts) → Promise; di base risponde subito 'ok'
  ctx.risposta = async () => ({ ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'ok' }] }) });
  win.fetch = (url, opts) => { chiamate.push(opts); return ctx.risposta(opts); };
  ctx.appeso = (opts) => new Promise((_, rej) => { opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name:'AbortError' }))); });
  return ctx;
}

(async () => {
  // ── 1. tempo massimo in callAI ──
  let b = avvia();
  const tempi = b.win.eval('AI_TEMPO_MAX_MS');
  atteso('tempi di base: 40 s ai testi, 90 s ai 14 pasti', [tempi.breve, tempi.lungo], [40000, 90000]);
  tempi.breve = 60; tempi.lungo = 120;
  b.risposta = b.appeso;
  let err = null;
  const t0 = Date.now();
  try { await b.win.callAI('ciao', 200); } catch(e){ err = e; }
  atteso('servizio appeso · errore timeout entro il tempo massimo', [err && err.aiKind, Date.now() - t0 < 1000, !!b.chiamate[0].signal], ['timeout', true, true]);
  atteso('servizio appeso · messaggio per la persona e per i cue', [b.win.aiErrMsg('timeout'), b.win.cueErrMsg('timeout')], ['Ci ho messo troppo: riprova.', 'Cue non disponibile — ci ho messo troppo, riprova.']);
  err = null; const t1 = Date.now();
  try { await b.win.callAI('14 pasti', 4000); } catch(e){ err = e; }
  atteso('budget lungo · usa il tempo lungo', [err && err.aiKind, Date.now() - t1 >= 100], ['timeout', true]);
  b.risposta = async () => { throw new TypeError('Failed to fetch'); };
  err = null; try { await b.win.callAI('ciao', 200); } catch(e){ err = e; }
  atteso('rete assente · resta network, non timeout', err && err.aiKind, 'network');
  b.risposta = async () => ({ ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'risposta' }] }) });
  atteso('risposta in tempo · testo', await b.win.callAI('ciao', 200), 'risposta');

  // ── 2. cue pulito ──
  atteso('cuePulito · esc prima, poi grassetto e a capo', b.win.cuePulito('"<img src=x onerror=alert(1)>**Scapole giù**\n• Espira"'),
    '&lt;img src=x onerror=alert(1)&gt;<strong>Scapole giù</strong><br>• Espira');
  atteso('cuePulito · vuoto resta vuoto', b.win.cuePulito('  '), '');

  // ── 3. l'errore non si tiene, si riprova ──
  b = avvia();
  b.win.eval('AI_TEMPO_MAX_MS').breve = 60;
  b.risposta = b.appeso;
  await b.win.ensureRestCue(EX, SESS);
  atteso('cue fallito · niente in ST.aiCue, l\'errore in ST.aiCueErrori', [KEY in b.ST.aiCue, b.ST.aiCueErrori[KEY].msg, b.ST.aiCueErrori[KEY].kind], [false, 'Cue non disponibile — ci ho messo troppo, riprova.', 'timeout']);
  const r2 = await b.win.cuePer(EX, SESS, '');
  atteso('cue fallito · subito dopo non si martella il servizio', [r2.errore, b.chiamate.length], ['Cue non disponibile — ci ho messo troppo, riprova.', 1]);
  b.ST.aiCueErrori[KEY].at -= 20000;        // è passato il tempo di riprova
  b.risposta = async () => ({ ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'• Mento alla sbarra\n• **Scapole** giù' }] }) });
  const r3 = await b.win.cuePer(EX, SESS, '');
  atteso('riprova · il cue buono arriva, pulito, e l\'errore sparisce', [r3.html, b.ST.aiCue[KEY], KEY in b.ST.aiCueErrori, b.chiamate.length], ['• Mento alla sbarra<br>• <strong>Scapole</strong> giù', '• Mento alla sbarra<br>• <strong>Scapole</strong> giù', false, 2]);
  const salvati = JSON.parse(b.win.localStorage.getItem('zt_cue_' + U));
  atteso('cue buono · salvato sul telefono con la data', [salvati[KEY].t, typeof salvati[KEY].at], ['• Mento alla sbarra<br>• <strong>Scapole</strong> giù', 'number']);
  // risposta vuota: errore, non un cue
  b.risposta = async () => ({ ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'   ' }] }) });
  const r4 = await b.win.cuePer('Squat', SESS, '');
  atteso('risposta vuota · è un errore, non si tiene', [r4.html, r4.errore, `${SESS}_Squat` in b.ST.aiCue], [null, 'Cue non disponibile — riprova tra poco.', false]);
  // due richieste insieme: una chiamata sola
  b.ST.aiCueErrori = {};
  let n = 0; b.risposta = async () => { n++; await attendi(20); return { ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'cue' }] }) }; };
  const [a1, a2] = await Promise.all([b.win.cuePer('Affondi', SESS, ''), b.win.cuePer('Affondi', SESS, '')]);
  atteso('due richieste insieme · una chiamata, stesso cue', [n, a1.html, a2.html], [1, 'cue', 'cue']);

  // ── 4. la seduta dopo: il cue salvato si usa senza chiamare il coach; dopo 30 giorni no ──
  const ls = { ['zt_cue_' + U]: JSON.stringify({ [KEY]: { t:'cue di ieri', at: Date.now() - 86400000 }, [`${SESS}_Vecchio`]: { t:'cue vecchio', at: Date.now() - 40 * 86400000 } }) };
  b = avvia(ls);
  b.risposta = async () => ({ ok:true, status:200, json: async () => ({ content:[{ type:'text', text:'nuovo' }] }) });
  await b.win.ensureRestCue(EX, SESS);
  atteso('seduta dopo · cue di ieri riusato, nessuna chiamata', [b.ST.aiCue[KEY], b.chiamate.length], ['cue di ieri', 0]);
  const r5 = await b.win.cuePer('Vecchio', SESS, '');
  atteso('seduta dopo · cue di 40 giorni fa scaduto: si rigenera', [r5.html, b.chiamate.length], ['nuovo', 1]);
  // il salvataggio non cresce senza limite
  const m = {}; for(let i = 0; i < 230; i++) m['s_ex' + i] = { t:'c' + i, at: i };
  b = avvia({ ['zt_cue_' + U]: JSON.stringify(m) });
  b.win.cueSalva('s_nuovo', 'cn');
  const dopo = JSON.parse(b.win.localStorage.getItem('zt_cue_' + U));
  atteso('salvati · al massimo 200, via i più vecchi', [Object.keys(dopo).length, 's_ex0' in dopo, 's_nuovo' in dopo], [200, false, true]);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
