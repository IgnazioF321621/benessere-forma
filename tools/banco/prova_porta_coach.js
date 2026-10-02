// Pirsi 010 — callAI manda il token di accesso della persona al Worker, e senza
// sessione non chiama affatto. Worker finto (window.fetch), nessuna rete.
//   node tools/banco/prova_porta_coach.js
//   BANCO_FILE=/tmp/prima.html node tools/banco/prova_porta_coach.js   # sul file di prima deve dare KO
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(52), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const esito = async (p) => { try { return { testo: await p }; } catch(e){ return { kind: e.aiKind || null }; } };

(async () => {
  const b = boot({});
  const win = b.win;
  let chiamate = [];
  const rispondi = (status, body) => { win.fetch = async (url, opts) => { chiamate.push({ url: String(url), auth: opts.headers.Authorization || null, body: JSON.parse(opts.body) }); return { ok: status === 200, status, json: async () => body }; }; };

  // 1. con la sessione: il token viaggia nell'intestazione, il corpo resta com'era
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'token-finto' } } });
  rispondi(200, { content:[{ type:'text', text:'ciao' }] });
  let r = await esito(win.callAI('Domanda', 150));
  atteso('con sessione · risposta', r, { testo:'ciao' });
  atteso('con sessione · token nell\'intestazione', chiamate[0].auth, 'Bearer token-finto');
  atteso('con sessione · corpo invariato, token non nel corpo', chiamate[0].body, { messages:[{ role:'user', content:'Domanda' }], max_tokens:150 });

  // 2. senza sessione: nessuna chiamata, errore 'session'
  chiamate = [];
  b.supa.auth.getSession = async () => ({ data:{ session:null }, error:null });
  r = await esito(win.callAI('Domanda'));
  atteso('senza sessione · nessuna chiamata, kind session', [chiamate.length, r.kind], [0, 'session']);
  b.supa.auth.getSession = async () => { throw new Error('boom'); };
  r = await esito(win.callAI('Domanda'));
  atteso('getSession che lancia · kind session', [chiamate.length, r.kind], [0, 'session']);

  // 3. il Worker rifiuta: i kind arrivano a chi chiama, con una frase per ognuno
  b.supa.auth.getSession = async () => ({ data:{ session:{ access_token:'scaduto' } } });
  rispondi(401, { error:{ source:'worker', kind:'session', status:401 } });
  r = await esito(win.callAI('Domanda'));
  atteso('Worker 401 · kind session', r.kind, 'session');
  rispondi(429, { error:{ source:'worker', kind:'rate-limit', status:429 } });
  r = await esito(win.callAI('Domanda'));
  atteso('Worker 429 · kind rate-limit', r.kind, 'rate-limit');
  atteso('frase · sessione', win.aiErrMsg('session'), 'Sessione scaduta: esci, rientra e riprova.');
  atteso('frase · cue, sessione', win.cueErrMsg('session'), 'Cue non disponibile — sessione scaduta: esci e rientra.');
  atteso('frase · chiave del servizio, invariata', win.aiErrMsg('auth'), 'C\'è un problema di configurazione del servizio: riprovare non serve.');
  atteso('frase · tetto al giorno delle foto', win.bcaErrorMessage(429, { kind:'daily-limit' }), 'Per oggi ho letto abbastanza foto: riprova domani');

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
