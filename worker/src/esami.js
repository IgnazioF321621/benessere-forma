// POST /esami-report — il coach legge il referto delle analisi del sangue (Body 160, 2 novembre 2026).
//
// La persona sceglie il PDF (anche di più pagine) o la foto del referto e lo dà all'app; l'app lo manda
// qui, questo Worker lo passa a Gemini e restituisce le righe trascritte (nome, valore, unità e fascia
// come stampati, chiave del vocabolario se riconosciuto) e la data del prelievo. Il file NON si conserva
// da nessuna parte: non in un bucket, non nel database, non nei log (né byte, né base64: solo esiti).
// Non si scrive niente: la lettura la salva l'app quando la persona, nel foglio, tocca «Salva».
//
// Al modello va solo il file. Il prompt gli dice di non leggere i dati anagrafici stampati sul referto.
// Stessa porta del report Fitdays: token della persona, user_id uguale, 3 letture al minuto.

import { ESAMI_PROMPT_VERSION, ESAMI_SYSTEM_PROMPT } from './prompts/esami-2026-11-02.js';
import { tokenDa, personaDaToken, entroIlLimite } from './porta.js';
import ZTEsami from '../../shared/esami.js';

export const ESAMI_MODEL = 'gemini-3.1-flash-lite';

const MIME_AMMESSI = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_CORPO_BYTE = 8_000_000;        // base64 di una foto ridotta ≈ 0,5 MB, un PDF di più pagine fino a ~5 MB
const DEADLINE_MS = 60_000;
const LETTURE_AL_MINUTO = 3;             // per persona: stesso binding delle foto dei check (LIMITE_FOTO)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

class EsamiError extends Error {
  constructor(status, kind, message) { super(message); this.status = status; this.kind = kind; }
}

export async function handleEsami(request, env, cors) {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: { source: 'worker', kind: 'method', status: 405, message: 'Solo POST' } }, 405);

  const startedAt = Date.now();
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.GEMINI_API_KEY) throw new EsamiError(500, 'config', 'Chiavi del Worker non configurate');
    if (Number(request.headers.get('Content-Length') || 0) > MAX_CORPO_BYTE) throw new EsamiError(413, 'too-large', 'File troppo grande');

    const token = tokenDa(request);
    if (!token) throw new EsamiError(401, 'auth', 'Token mancante');
    let personaId;
    try { personaId = await personaDaToken(env, token); } catch (_) { throw new EsamiError(502, 'supabase', 'Verifica del token fallita'); }
    if (!personaId) throw new EsamiError(401, 'auth', 'Token non valido o scaduto');

    const grezzo = await request.text();
    if (grezzo.length > MAX_CORPO_BYTE) throw new EsamiError(413, 'too-large', 'File troppo grande');
    let body;
    try { body = JSON.parse(grezzo); } catch (_) { throw new EsamiError(400, 'bad-request', 'Corpo della richiesta non leggibile'); }
    const userId = body && body.user_id;
    const mime = body && String(body.mime || '').toLowerCase();
    const data = body && body.data;
    if (!UUID_RE.test(String(userId || ''))) throw new EsamiError(400, 'bad-request', 'user_id deve essere un UUID');
    if (userId !== personaId) throw new EsamiError(403, 'forbidden', "Il token non appartiene a quest'utente");
    if (!MIME_AMMESSI.includes(mime)) throw new EsamiError(415, 'bad-file', 'Serve un\'immagine (JPEG, PNG, WebP) o un PDF');
    if (typeof data !== 'string' || data.length < 100 || !BASE64_RE.test(data)) throw new EsamiError(400, 'bad-file', 'File non leggibile');

    if (!(await entroIlLimite(env.LIMITE_FOTO, `esami:${userId}`, LETTURE_AL_MINUTO))) {
      throw new EsamiError(429, 'rate-limit', 'Troppe richieste in un minuto');
    }

    const parts = [
      { text: 'Il referto da trascrivere è il file che segue. Rispondi solo col JSON richiesto.' },
      { inline_data: { mime_type: mime, data } },
    ];
    let lettura = null, lastProblem = null, usage = null;
    for (let tentativo = 1; tentativo <= 2 && !lettura; tentativo++) {
      const risposta = await callGemini(env, parts, startedAt);
      usage = risposta.usage || usage;
      const verdetto = validate(risposta.text);
      if (verdetto.ok) lettura = verdetto.value; else lastProblem = verdetto.problem;
    }
    if (!lettura) throw new EsamiError(502, 'invalid-json', `Risposta del modello non valida: ${lastProblem}`);

    lettura.meta = {
      model: ESAMI_MODEL,
      prompt_version: ESAMI_PROMPT_VERSION,
      vocabolario_version: ZTEsami.VERSIONE,
      mime,
      usage: usage ? { prompt_tokens: usage.promptTokenCount ?? null, output_tokens: usage.candidatesTokenCount ?? null, thinking_tokens: usage.thoughtsTokenCount ?? null } : null,
    };
    console.log(`[esami] 200 letti ${lettura.letti}${lettura.data_prelievo ? ' con data' : ' senza data'}`);
    return json({ ok: true, lettura });
  } catch (e) {
    const status = e instanceof EsamiError ? e.status : 500;
    const kind = e instanceof EsamiError ? e.kind : 'exception';
    console.log(`[esami] ${status} ${kind}`);   // solo metadati: mai il contenuto del file
    return json({ error: { source: e.source || 'worker', kind, status, message: e.message } }, status);
  }
}

// ── Gemini ──────────────────────────────────────────────────────────────────

const remaining = (startedAt) => Math.max(1000, DEADLINE_MS - (Date.now() - startedAt));

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    riconosciuto: { type: 'BOOLEAN' },
    data_prelievo: { type: 'STRING', nullable: true },
    esami: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nome: { type: 'STRING' },
          chiave: { type: 'STRING', nullable: true },
          valore: { type: 'NUMBER' },
          unita: { type: 'STRING' },
          rif_min: { type: 'NUMBER', nullable: true },
          rif_max: { type: 'NUMBER', nullable: true },
        },
        required: ['nome', 'chiave', 'valore', 'unita', 'rif_min', 'rif_max'],
        propertyOrdering: ['nome', 'chiave', 'valore', 'unita', 'rif_min', 'rif_max'],
      },
    },
    note: { type: 'STRING' },
  },
  required: ['riconosciuto', 'data_prelievo', 'esami', 'note'],
  propertyOrdering: ['riconosciuto', 'data_prelievo', 'esami', 'note'],
};

async function callGemini(env, parts, startedAt) {
  let r;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ESAMI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: ESAMI_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts }],
        // 8192: un referto intero sono 80 righe × 6 campi, ~4000 token di JSON, e i token di pensiero contano nel tetto
        generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(remaining(startedAt)),
    });
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new EsamiError(504, 'timeout', 'Il modello non ha risposto entro 60 secondi');
    throw new EsamiError(502, 'gemini', 'Chiamata al modello fallita');
  }
  // Come Groq (L36): un errore dell'API torna come risposta regolare, va controllato a mano.
  if (!r.ok) {
    let msg = '';
    try { const d = await r.json(); msg = (d && d.error && (d.error.status || d.error.message)) || ''; } catch (_) { /* non JSON */ }
    const kind = r.status === 429 ? 'rate-limit' : (r.status === 401 || r.status === 403) ? 'auth' : r.status === 404 ? 'model-unavailable' : 'gemini';
    const err = new EsamiError(r.status === 429 ? 429 : 502, kind, `Gemini ${r.status}${msg ? ': ' + String(msg).slice(0, 200) : ''}`);
    err.source = 'gemini';
    throw err;
  }
  const d = await r.json();
  const cand = d.candidates && d.candidates[0];
  const text = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts.map(p => p.text || '').join('') : '';
  return { text, usage: d.usageMetadata || null };
}

// ── Validazione ─────────────────────────────────────────────────────────────
// Le righe passano dal vocabolario (shared/esami.js): numero vero, nome e unità tagliati, chiave solo se
// esiste (una chiave inventata dal modello cade e si riprova dal nome). Un referto non riconosciuto torna
// con esami vuoto e riconosciuto = false; uno riconosciuto senza nemmeno una riga è una risposta sbagliata.
export function validate(text) {
  const no = (problem) => ({ ok: false, problem });
  if (!text) return no('risposta vuota');
  let o;
  try { o = JSON.parse(String(text).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { return no('non è JSON'); }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return no('non è un oggetto');
  if (typeof o.riconosciuto !== 'boolean') return no('riconosciuto non è vero/falso');
  const v = ZTEsami.valida(o.riconosciuto ? o : {});
  if (o.riconosciuto && v.letti === 0) return no('referto riconosciuto ma nessun esame letto');
  return { ok: true, value: { riconosciuto: o.riconosciuto, data_prelievo: v.data_prelievo, esami: v.esami, letti: v.letti, note: ZTEsami.testo(o.note, ZTEsami.MAX_NOTE) } };
}
