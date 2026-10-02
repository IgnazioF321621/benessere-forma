// Prova della porta dei testi del coach (POST /) senza rete: fetch finto per
// Supabase Auth e Groq. Copre Pirsi 010: chi non ha un token valido non entra,
// i siti altrui non entrano, domanda e risposta hanno un tetto, gli indirizzi
// sconosciuti danno 404, ogni persona ha un limite al minuto, e gli errori
// non portano fuori dettagli interni.
//   node worker/test/prova_porta_coach.mjs
import worker from '../src/index.js';
import { _azzeraPorta } from '../src/porta.js';

const SITO = 'https://ignaziof321621.github.io';
const ENV = { SUPABASE_SERVICE_ROLE_KEY: 'svc-segreta', API_KEY: 'groq-segreta', GEMINI_API_KEY: 'gem' };
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(52), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};

let groq = [], verifiche = 0, groqRisposta = null;
function scenario() {
  _azzeraPorta(); groq = []; verifiche = 0; groqRisposta = null;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const res = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (u.includes('/auth/v1/user')) {
      verifiche++;
      const t = init.headers.Authorization;
      if (t === 'Bearer buono') return res({ id: 'persona-1' });
      if (t === 'Bearer altro') return res({ id: 'persona-2' });
      if (t === 'Bearer guasto') return res({ msg: 'boom' }, 500);
      return res({ msg: 'bad jwt' }, 401);
    }
    if (u.includes('api.groq.com')) {
      groq.push({ auth: init.headers.Authorization, body: JSON.parse(init.body) });
      return groqRisposta ? groqRisposta() : res({ choices: [{ message: { content: 'ciao' }, finish_reason: 'stop' }], usage: { total_tokens: 5 } });
    }
    if (u.includes('/rest/v1/')) return res({ message: 'relation "segreta" does not exist' }, 500);
    throw new Error('fetch non previsto: ' + u);
  };
}
const chiama = async ({ path = '/', method = 'POST', token = 'buono', origin = SITO, body = { messages: [{ role: 'user', content: 'Ciao' }], max_tokens: 200 }, grezzo = null } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (origin) headers.Origin = origin;
  const log = []; const orig = console.log; console.log = (...a) => log.push(a.join(' '));
  try {
    const r = await worker.fetch(new Request('https://w' + path, { method, headers, body: method === 'POST' ? (grezzo ?? JSON.stringify(body)) : undefined }), ENV);
    const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch (_) {}
    return { status: r.status, json, testo: t, cors: r.headers.get('Access-Control-Allow-Origin'), log };
  } finally { console.log = orig; }
};
const lungo = (n) => 'a'.repeat(n);

// 1. chi entra
scenario();
let r = await chiama();
atteso('token valido · risposta invariata', [r.status, r.json], [200, { content: [{ type: 'text', text: 'ciao' }], usage: { total_tokens: 5 } }]);
atteso('token valido · a Groq va la chiave del Worker', [groq.length, groq[0].auth], [1, 'Bearer groq-segreta']);
atteso('token valido · CORS sul sito dell\'app', r.cors, SITO);

// 2. chi non entra: Groq non viene mai chiamato
scenario();
r = await chiama({ token: null });
atteso('senza token · 401 session', [r.status, r.json.error.kind, groq.length], [401, 'session', 0]);
r = await chiama({ token: 'falso' });
atteso('token falso · 401 session', [r.status, r.json.error.kind, groq.length], [401, 'session', 0]);
r = await chiama({ body: { messages: [{ role: 'user', content: 'x' }], access_token: 'buono' }, token: null });
atteso('token nel corpo · non vale', [r.status, groq.length], [401, 0]);
r = await chiama({ token: 'guasto' });
atteso('Supabase non risponde · 502, porta chiusa', [r.status, groq.length], [502, 0]);

// 3. da dove
scenario();
r = await chiama({ origin: 'https://sito-altrui.example' });
atteso('altro sito · 403, niente Groq', [r.status, r.json.error.kind, groq.length, verifiche], [403, 'forbidden', 0, 0]);
atteso('altro sito · CORS non lo autorizza', r.cors, SITO);
r = await chiama({ method: 'OPTIONS', origin: 'https://sito-altrui.example' });
atteso('altro sito · preflight 403', r.status, 403);
r = await chiama({ method: 'OPTIONS' });
atteso('sito dell\'app · preflight 204', [r.status, r.cors], [204, SITO]);
r = await chiama({ origin: 'http://localhost:8080' });
atteso('Mac di sviluppo · entra', [r.status, r.cors], [200, 'http://localhost:8080']);
r = await chiama({ origin: null });
atteso('senza Origin, token valido · entra', r.status, 200);

// 4. indirizzi sconosciuti e metodi
scenario();
r = await chiama({ path: '/qualcosa' });
atteso('indirizzo sconosciuto · 404, niente Groq', [r.status, r.json.error.kind, groq.length], [404, 'not-found', 0]);
r = await chiama({ path: '/v1/chat/completions' });
atteso('indirizzo in stile Groq · 404', r.status, 404);
r = await chiama({ method: 'GET' });
atteso('GET sulla porta dei testi · 405', [r.status, groq.length], [405, 0]);

// 5. tetti
scenario();
r = await chiama({ body: { messages: [{ role: 'user', content: 'x' }], max_tokens: 999999 } });
atteso('risposta · tetto a 4000 (+600 di ragionamento)', groq[0].body.max_completion_tokens, 4600);
r = await chiama({ body: { messages: [{ role: 'user', content: 'x' }] } });
atteso('risposta · senza richiesta vale 400', groq[1].body.max_completion_tokens, 1000);
r = await chiama({ body: { messages: [{ role: 'user', content: 'x' }], max_tokens: 4000 } });
atteso('risposta · il piano (4000) passa intero', groq[2].body.max_completion_tokens, 4600);
r = await chiama({ body: { messages: [{ role: 'user', content: lungo(12000) }], max_tokens: 4000 } });
atteso('domanda da 12.000 caratteri (il piano) · passa', r.status, 200);
const prima = groq.length;
r = await chiama({ body: { messages: [{ role: 'user', content: lungo(24001) }] } });
atteso('domanda oltre 24.000 caratteri · 413', [r.status, r.json.error.kind, groq.length - prima], [413, 'too-large', 0]);
r = await chiama({ body: { messages: [{ role: 'user', content: lungo(13000) }, { role: 'user', content: lungo(13000) }] } });
atteso('domanda spezzata in due · 413 lo stesso', r.status, 413);
r = await chiama({ grezzo: JSON.stringify({ messages: [{ role: 'user', content: 'x' }], zavorra: lungo(70000) }) });
atteso('corpo oltre 64 KB · 413', [r.status, groq.length - prima], [413, 0]);
r = await chiama({ body: { messages: Array.from({ length: 9 }, () => ({ role: 'user', content: 'x' })) } });
atteso('più di 8 messaggi · 400', r.status, 400);
for (const [nome, body] of [['senza messaggi', {}], ['messaggi vuoti', { messages: [] }], ['contenuto non testo', { messages: [{ role: 'user', content: [{ type: 'image_url' }] }] }], ['ruolo inventato', { messages: [{ role: 'tool', content: 'x' }] }]]) {
  r = await chiama({ body });
  atteso(`${nome} · 400`, [r.status, r.json.error.kind], [400, 'bad-request']);
}
r = await chiama({ grezzo: 'non json' });
atteso('corpo non leggibile · 400', [r.status, groq.length - prima], [400, 0]);
scenario();
r = await chiama({ body: { messages: [{ role: 'user', content: 'x', name: 'y', tool_calls: [1] }], model: 'altro-modello', temperature: 2, max_tokens: 100 } });
atteso('campi in più · a Groq non arrivano', [groq[0].body.model, groq[0].body.temperature, groq[0].body.messages], ['openai/gpt-oss-120b', 0.3, [{ role: 'user', content: 'x' }]]);

// 6. limite per persona
scenario();
const esiti = [];
for (let i = 0; i < 22; i++) esiti.push((await chiama()).status);
atteso('20 al minuto · le prime 20 passano', [esiti.slice(0, 20).every(s => s === 200), esiti[20], esiti[21]], [true, 429, 429]);
atteso('20 al minuto · Groq chiamato 20 volte', groq.length, 20);
r = await chiama();
atteso('oltre il limite · kind rate-limit', r.json.error.kind, 'rate-limit');
r = await chiama({ token: 'altro' });
atteso('un\'altra persona · non paga per la prima', r.status, 200);
atteso('token verificato una volta per persona', verifiche, 2);
// col binding di Cloudflare decide lui
scenario();
const viste = [];
ENV.LIMITE_COACH = { limit: async ({ key }) => { viste.push(key); return { success: viste.length <= 1 }; } };
atteso('binding · decide lui, chiave = persona', [(await chiama()).status, (await chiama()).status, viste[0]], [200, 429, 'coach:persona-1']);
delete ENV.LIMITE_COACH;

// 7. errori di Groq: forma invariata per l'app
scenario();
groqRisposta = () => new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'Rate limit reached for model `openai/gpt-oss-120b`' } }), { status: 429 });
r = await chiama();
atteso('Groq 429 · rate-limit, fonte groq', [r.status, r.json.error.kind, r.json.error.source], [429, 'rate-limit', 'groq']);
groqRisposta = () => { throw new Error('dettaglio interno svc-segreta'); };
r = await chiama();
atteso('eccezione · niente dettagli fuori', [r.status, r.json.error.kind, /segreta/.test(r.testo)], [500, 'exception', false]);

// 8. porta delle GIF: niente dettagli interni negli errori
scenario();
r = await chiama({ path: '/exercise-media?name=Trazioni%20alla%20sbarra', method: 'GET', token: null });
atteso('GIF · errore senza dettagli', [r.status, r.json, /segreta|relation|Supabase/.test(r.testo)], [500, { status: 'error', error: 'Errore interno' }, false]);
atteso('GIF · il dettaglio resta nei log', r.log.some(l => /Supabase select failed/.test(l)), true);
r = await chiama({ path: '/exercise-media?name=Inesistente', method: 'GET', token: null });
atteso('GIF · nome senza match, invariato', [r.status, r.json.status], [200, 'missing']);
r = await chiama({ path: '/exercise-media?name=x', method: 'GET', token: null, origin: 'https://sito-altrui.example' });
atteso('GIF · altro sito 403', r.status, 403);

console.log(ko ? `\n${ko} KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
