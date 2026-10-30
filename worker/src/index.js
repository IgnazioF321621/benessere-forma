// Cloudflare Worker — Zona Tracker AI Proxy + Exercise Media cache
// Routes:
//   POST /                 -> proxy Groq: i testi del coach. Entra solo chi ha un token
//                            di accesso valido, dal sito dell'app, entro i tetti (src/porta.js)
//   GET  /exercise-media   -> la GIF nostra dell'esercizio (biblioteca_gif), o «missing» se non c'è
//                            params: ?code=<EX###>  oppure  ?name=<nome del catalogo>
//   POST /vision-check     -> lettura AI delle foto di un check fisico (Gemini, src/vision-check.js)
//   POST /fitdays-report   -> il coach legge il report della bilancia Fitdays (Gemini, src/fitdays.js):
//                            il file non si conserva, la lettura torna all'app e basta
//   GET  /calendario       -> il calendario delle sedute a cui l'iPhone si iscrive (text/calendar, src/calendario.js):
//                            ?t=<calendario_token del profilo>; nessun token valido → 404. Solo letture
//   tutto il resto         -> 404
// Cron:
//   lunedì 06:00 Europe/Rome -> Pirsi propone: quadro della settimana chiusa + proposte (src/coach-cron.js)

import { handleVisionCheck } from './vision-check.js';
import { handleFitdays } from './fitdays.js';
import { handleCalendario } from './calendario.js';
import { handleScheduled } from './coach-cron.js';
import { corsPer, origineRifiutata, tokenDa, personaDaToken, entroIlLimite } from './porta.js';

const SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';

// Tetti della porta dei testi (Pirsi 010). La richiesta più grande dell'app è il
// piano settimanale: circa 12.000 caratteri di domanda e 4000 token di risposta.
const MAX_CORPO_BYTE = 64_000;       // corpo della richiesta, prima ancora di leggerlo
const MAX_DOMANDA_CARATTERI = 24_000; // somma dei testi dei messaggi
const MAX_MESSAGGI = 8;
const MAX_RISPOSTA_TOKEN = 4000;     // il più alto che l'app chiede
const RICHIESTE_AL_MINUTO = 20;      // per persona; uguale al binding in wrangler.toml

function jsonResponse(obj, status = 200, cors = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

// Una lettura di Supabase con la chiave di servizio. Un errore lancia: il dettaglio va nei log,
// a chi chiama arriva solo «Errore interno».
async function supabaseSelect(env, path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase select failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Solo le GIF nostre (Media 300, 30 ottobre 2026; Ignazio: «Ho le GIF mie»): esercizi_catalog.gif_slug →
// biblioteca_gif → bucket `biblioteca-gif`. Senza GIF la risposta è «missing» con cached_url nullo: nessuna
// chiamata a ExerciseDB o Wger, nessun URL di terzi. La riserva di prima (tabelle MATCH_DATA e MATCH_BY_CODE,
// la tabella exercise_media e il bucket `exercise-media`) non si legge più.
async function handleExerciseMedia(request, env) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const name = url.searchParams.get('name');

  if (!code && !name) {
    return jsonResponse({ error: 'Missing query param: name or code' }, 400);
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[exercise-media] chiave di servizio non configurata');
    return jsonResponse({ status: 'error', error: 'Servizio non disponibile' }, 500);
  }

  const nessuna = { status: 'missing', cached_url: null, is_surrogate: false, surrogate_note: null, source: null };
  try {
    // Per codice (EX###) o, per le schede vecchie senza codice, per nome del catalogo.
    const filtro = code ? `codice=eq.${encodeURIComponent(code)}` : `nome=eq.${encodeURIComponent(name)}`;
    const catalogo = await supabaseSelect(env, `esercizi_catalog?select=gif_slug&${filtro}&limit=1`);
    const gifSlug = catalogo[0]?.gif_slug ?? null;
    if (!gifSlug) return jsonResponse(nessuna);
    const bib = (await supabaseSelect(env, `biblioteca_gif?select=slug,storage_path&slug=eq.${encodeURIComponent(gifSlug)}&limit=1`))[0];
    if (!bib || !bib.storage_path) return jsonResponse(nessuna);
    return jsonResponse({
      status: 'cached',
      cached_url: `${SUPABASE_URL}/storage/v1/object/public/biblioteca-gif/${bib.storage_path}`,
      is_surrogate: false,
      surrogate_note: null,
      source: 'biblioteca',
      from_cache: true,
    });
  } catch (e) {
    // Il dettaglio (tabella, stato, testo di Supabase) resta nei log del Worker:
    // a chi chiama non serve e non va mostrato.
    console.log(`[exercise-media] ${e && e.message}`);
    return jsonResponse({ status: 'error', error: 'Errore interno' }, 500);
  }
}

// Errore della porta, nella stessa forma degli errori di Groq: l'app legge `kind`.
const errorePorta = (kind, status, message) =>
  jsonResponse({ error: { source: 'worker', kind, status, code: null, message } }, status);

// Tempo massimo alla risposta di Groq (Pirsi 090): scaduto, l'app riceve kind 'timeout' e dice
// «ci ho messo troppo, riprova» invece di aspettare per sempre. _impostaTempoMaxGroq serve alle prove.
let TEMPO_MAX_GROQ_MS = 60_000;
export function _impostaTempoMaxGroq(ms) { TEMPO_MAX_GROQ_MS = ms; }

async function handleGroqProxy(request, env) {
  if (request.method !== 'POST') {
    return errorePorta('method', 405, 'Solo POST');
  }

  try {
    // 1. Chi chiama: token di accesso della persona, come /vision-check.
    //    'session' e non 'auth': per l'app 'auth' vuol dire chiave Groq guasta.
    if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.API_KEY) return errorePorta('config', 500, 'Servizio non configurato');
    const token = tokenDa(request);
    if (!token) return errorePorta('session', 401, 'Token mancante');
    let userId;
    try { userId = await personaDaToken(env, token); }
    catch (_) { return errorePorta('generic', 502, 'Verifica del token non riuscita'); }
    if (!userId) return errorePorta('session', 401, 'Token non valido o scaduto');

    // 2. Quante richieste: per persona, al minuto.
    if (!(await entroIlLimite(env.LIMITE_COACH, `coach:${userId}`, RICHIESTE_AL_MINUTO))) {
      return errorePorta('rate-limit', 429, 'Troppe richieste in un minuto');
    }

    // 3. Quanto chiede: corpo, messaggi e risposta hanno un tetto.
    if (Number(request.headers.get('Content-Length') || 0) > MAX_CORPO_BYTE) return errorePorta('too-large', 413, 'Richiesta troppo grande');
    const grezzoCorpo = await request.text();
    if (grezzoCorpo.length > MAX_CORPO_BYTE) return errorePorta('too-large', 413, 'Richiesta troppo grande');
    let body;
    try { body = JSON.parse(grezzoCorpo); } catch (_) { return errorePorta('bad-request', 400, 'Corpo della richiesta non leggibile'); }
    const messages = body && body.messages;
    if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGGI
        || messages.some(m => !m || !['user', 'system', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content)) {
      return errorePorta('bad-request', 400, 'Messaggi non validi');
    }
    if (messages.reduce((n, m) => n + m.content.length, 0) > MAX_DOMANDA_CARATTERI) return errorePorta('too-large', 413, 'Domanda troppo lunga');
    const chiesti = Number(body.max_tokens);
    const maxTokens = Math.min(MAX_RISPOSTA_TOKEN, Number.isFinite(chiesti) && chiesti >= 1 ? Math.floor(chiesti) : 400);

    let response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(TEMPO_MAX_GROQ_MS),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        // Solo ruolo e testo: nessun altro campo di chi chiama arriva a Groq.
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        // I budget che manda l'app (150..4000) sono spazio per la RISPOSTA, tarati
        // su Llama che non ragionava. gpt-oss-120b spende token per ragionare prima
        // di rispondere e li prende dallo stesso budget: senza margine la risposta
        // esce troncata a meta'.
        //
        // Il margine e' 600 e non di piu' per una ragione che non e' il consumo.
        // Groq AMMETTE la richiesta contando prompt + tetto riservato, ma poi conta
        // i token davvero generati: col margine a 2000 il piano settimanale chiedeva
        // ~8988 token in ammissione contro un limite di 8000 al minuto del piano
        // free, e si prendeva un 413 pur consumandone davvero 6128. Limare il tetto
        // non riduce il consumo: riduce la cauzione.
        //
        // 600 copre il ragionamento misurato sul piano (567 token) e porta
        // l'ammissione a ~7588. NON e' il numero definitivo: e' un taglio prudente
        // in attesa di misurare usage su piu' generazioni e piu' profili.
        max_completion_tokens: maxTokens + 600,
        // 'low': queste sono estrazioni strutturate, non problemi da risolvere.
        reasoning_effort: 'low',
        // I GPT-OSS non supportano reasoning_format: usano include_reasoning.
        // A false il ragionamento non finisce dentro il testo della risposta.
        include_reasoning: false,
        temperature: 0.3,
      }),
      });
    } catch (e) {
      if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        return errorePorta('timeout', 504, `Il coach non ha risposto entro ${Math.round(TEMPO_MAX_GROQ_MS / 1000)} secondi`);
      }
      throw e;
    }
    // Groq non lancia eccezioni: un 429, una chiave revocata o un modello dismesso
    // tornano come risposta regolare. Senza questo controllo il body senza 'choices'
    // diventava testo vuoto con HTTP 200, e il fallimento esplodeva lontano dalla
    // causa, dentro il JSON.parse dell'app. -> L36
    if (!response.ok) {
      const grezzo = await response.text();
      let dettaglio = null;
      try { dettaglio = JSON.parse(grezzo); } catch (_) { /* Groq non risponde sempre JSON */ }
      const err = (dettaglio && dettaglio.error) || {};
      const code = err.code || null;
      const message = err.message || grezzo.slice(0, 300) || response.statusText || 'errore sconosciuto';
      // L'ordine conta. Il messaggio di un rate limit contiene il NOME del modello
      // ("Request too large for model `openai/gpt-oss-120b`"), quindi cercare
      // "model" nel messaggio lo classificherebbe come modello non disponibile:
      // misurato dal vivo, un 413 rate_limit_exceeded etichettato male.
      // Il codice di Groq e' la fonte affidabile, il messaggio no.
      const kind =
        (response.status === 429 || response.status === 413 || code === 'rate_limit_exceeded') ? 'rate-limit' :
        (response.status === 401 || response.status === 403) ? 'auth' :
        (/^model_/.test(String(code)) || /decommission|deprecated|does not exist/i.test(message)) ? 'model-unavailable' :
        'generic';
      return jsonResponse(
        { error: { source: 'groq', kind, status: response.status, code, message } },
        (response.status >= 400 && response.status <= 599) ? response.status : 502
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // 200 ma senza contenuto utile: e' un fallimento, non una stringa vuota.
    // finish_reason dice spesso il perche' ('length' = budget token finito).
    if (!text) {
      const motivo = (data.choices && data.choices[0] && data.choices[0].finish_reason) || null;
      return jsonResponse({
        error: {
          source: 'groq',
          kind: 'empty-response',
          status: 200,
          code: motivo,
          message: motivo === 'length'
            ? 'Risposta vuota: budget token esaurito prima del contenuto'
            : 'Risposta vuota: nessun contenuto utile nella risposta di Groq',
        },
      }, 502);
    }

    // Forma di successo INVARIATA: 'content' resta identico byte per byte, cosi'
    // analisi pasto, piano e cue continuano a leggere come prima. 'usage' si
    // aggiunge solo se Groq lo manda: assenza silenziosa, mai inventato.
    const ok = { content: [{ type: 'text', text }] };
    if (data.usage) ok.usage = data.usage;
    return jsonResponse(ok);
  } catch (error) {
    console.log(`[coach] eccezione: ${error && error.message}`);
    return jsonResponse({
      error: { source: 'worker', kind: 'exception', status: null, code: null, message: 'Errore interno' },
    }, 500);
  }
}

// Le risposte nascono senza CORS: le intestazioni si mettono qui, una volta,
// con l'Origin di questa richiesta.
function conCors(risposta, cors) {
  const r = new Response(risposta.body, risposta);
  for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
  return r;
}

async function instrada(request, env) {
  const url = new URL(request.url);
  const rotta = url.pathname === '/' ? 'coach'
    : url.pathname === '/exercise-media' ? 'media'
    : url.pathname === '/vision-check' ? 'vision'
    : url.pathname === '/fitdays-report' ? 'fitdays'
    : url.pathname === '/calendario' ? 'calendario'
    : null;
  if (!rotta) return jsonResponse({ error: { source: 'worker', kind: 'not-found', status: 404, code: null, message: 'Non trovato' } }, 404);
  if (origineRifiutata(request)) return jsonResponse({ error: { source: 'worker', kind: 'forbidden', status: 403, code: null, message: 'Origine non ammessa' } }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (rotta === 'media') return handleExerciseMedia(request, env);
  if (rotta === 'vision') return handleVisionCheck(request, env, {});
  if (rotta === 'fitdays') return handleFitdays(request, env, {});
  if (rotta === 'calendario') return handleCalendario(request, env);
  return handleGroqProxy(request, env);
}

export default {
  async fetch(request, env) {
    return conCors(await instrada(request, env), corsPer(request));
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env, ctx));
  },
};
