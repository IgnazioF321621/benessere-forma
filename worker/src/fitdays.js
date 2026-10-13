// POST /fitdays-report — il coach legge il report della bilancia Fitdays (Body 150).
//
// La persona, dopo la pesata, fa lo screenshot (o il PDF) del report e lo dà all'app;
// l'app lo manda qui, questo Worker lo passa a Gemini e restituisce i 22 indicatori
// trascritti. Il file NON si conserva da nessuna parte: non in un bucket, non nel
// database, non nei log (né byte, né base64: solo esiti e codici d'errore).
// Non si scrive niente: la lettura la salva l'app quando la persona tocca «Salva misure».
//
// Al modello non va nessun dato della persona: solo il file. Il prompt gli dice di non
// leggere il nickname stampato sul report.

import { FITDAYS_PROMPT_VERSION, FITDAYS_SYSTEM_PROMPT } from './prompts/fitdays-2026-10-13.js';
import { tokenDa, personaDaToken, entroIlLimite } from './porta.js';
import ZTFitdays from '../../shared/fitdays.js';

export const FITDAYS_MODEL = 'gemini-3.1-flash-lite';

const MIME_AMMESSI = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_CORPO_BYTE = 8_000_000;        // il corpo della richiesta (base64 di un'immagine ridotta ≈ 0,5 MB, un PDF fino a ~5 MB)
const DEADLINE_MS = 60_000;              // tempo massimo di tutta la chiamata
const LETTURE_AL_MINUTO = 3;             // per persona: stesso binding delle foto dei check (LIMITE_FOTO)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

class FitdaysError extends Error {
  constructor(status, kind, message) { super(message); this.status = status; this.kind = kind; }
}

export async function handleFitdays(request, env, cors) {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: { source: 'worker', kind: 'method', status: 405, message: 'Solo POST' } }, 405);

  const startedAt = Date.now();
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.GEMINI_API_KEY) throw new FitdaysError(500, 'config', 'Chiavi del Worker non configurate');
    if (Number(request.headers.get('Content-Length') || 0) > MAX_CORPO_BYTE) throw new FitdaysError(413, 'too-large', 'File troppo grande');

    // 1. Chi chiama: token di accesso della persona, come /vision-check e la porta dei testi
    const token = tokenDa(request);
    if (!token) throw new FitdaysError(401, 'auth', 'Token mancante');
    let personaId;
    try { personaId = await personaDaToken(env, token); } catch (_) { throw new FitdaysError(502, 'supabase', 'Verifica del token fallita'); }
    if (!personaId) throw new FitdaysError(401, 'auth', 'Token non valido o scaduto');

    // 2. Il corpo: { user_id, mime, data (base64) }
    const grezzo = await request.text();
    if (grezzo.length > MAX_CORPO_BYTE) throw new FitdaysError(413, 'too-large', 'File troppo grande');
    let body;
    try { body = JSON.parse(grezzo); } catch (_) { throw new FitdaysError(400, 'bad-request', 'Corpo della richiesta non leggibile'); }
    const userId = body && body.user_id;
    const mime = body && String(body.mime || '').toLowerCase();
    const data = body && body.data;
    if (!UUID_RE.test(String(userId || ''))) throw new FitdaysError(400, 'bad-request', 'user_id deve essere un UUID');
    if (userId !== personaId) throw new FitdaysError(403, 'forbidden', "Il token non appartiene a quest'utente");
    if (!MIME_AMMESSI.includes(mime)) throw new FitdaysError(415, 'bad-file', 'Serve un\'immagine (JPEG, PNG, WebP) o un PDF');
    if (typeof data !== 'string' || data.length < 100 || !BASE64_RE.test(data)) throw new FitdaysError(400, 'bad-file', 'File non leggibile');

    // 3. Quante richieste al minuto, per persona
    if (!(await entroIlLimite(env.LIMITE_FOTO, `fitdays:${userId}`, LETTURE_AL_MINUTO))) {
      throw new FitdaysError(429, 'rate-limit', 'Troppe richieste in un minuto');
    }

    // 4. Gemini, JSON validato, un solo nuovo tentativo
    const parts = [
      { text: 'Il report Fitdays da trascrivere è il file che segue. Rispondi solo col JSON richiesto.' },
      { inline_data: { mime_type: mime, data } },
    ];
    let lettura = null, lastProblem = null, usage = null;
    for (let tentativo = 1; tentativo <= 2 && !lettura; tentativo++) {
      const risposta = await callGemini(env, parts, startedAt);
      usage = risposta.usage || usage;
      const verdetto = validate(risposta.text);
      if (verdetto.ok) lettura = verdetto.value; else lastProblem = verdetto.problem;
    }
    if (!lettura) throw new FitdaysError(502, 'invalid-json', `Risposta del modello non valida: ${lastProblem}`);

    lettura.meta = {
      model: FITDAYS_MODEL,
      prompt_version: FITDAYS_PROMPT_VERSION,
      campi_version: ZTFitdays.CAMPI_VERSION,
      mime,
      usage: usage ? { prompt_tokens: usage.promptTokenCount ?? null, output_tokens: usage.candidatesTokenCount ?? null, thinking_tokens: usage.thoughtsTokenCount ?? null } : null,
    };
    return json({ ok: true, lettura });
  } catch (e) {
    const status = e instanceof FitdaysError ? e.status : 500;
    const kind = e instanceof FitdaysError ? e.kind : 'exception';
    // Solo metadati nel log: mai il contenuto del file.
    console.log(`[fitdays] ${status} ${kind}`);
    return json({ error: { source: e.source || 'worker', kind, status, message: e.message } }, status);
  }
}

// ── Gemini ──────────────────────────────────────────────────────────────────

const remaining = (startedAt) => Math.max(1000, DEADLINE_MS - (Date.now() - startedAt));

const proprieta = {};
for (const c of ZTFitdays.CAMPI) proprieta[c.chiave] = c.tipo === 'testo' ? { type: 'STRING', nullable: true } : { type: 'NUMBER', nullable: true };
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    riconosciuto: { type: 'BOOLEAN' },
    data_ora_testo: { type: 'STRING', nullable: true },
    ...proprieta,
    note: { type: 'STRING' },
  },
  required: ['riconosciuto', 'data_ora_testo', ...ZTFitdays.CAMPI.map(c => c.chiave), 'note'],
  propertyOrdering: ['riconosciuto', 'data_ora_testo', ...ZTFitdays.CAMPI.map(c => c.chiave), 'note'],
};

async function callGemini(env, parts, startedAt) {
  let r;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${FITDAYS_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: FITDAYS_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(remaining(startedAt)),
    });
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new FitdaysError(504, 'timeout', 'Il modello non ha risposto entro 60 secondi');
    throw new FitdaysError(502, 'gemini', 'Chiamata al modello fallita');
  }
  // Come Groq (L36): un errore dell'API torna come risposta regolare, va controllato a mano.
  if (!r.ok) {
    let msg = '';
    try { const d = await r.json(); msg = (d && d.error && (d.error.status || d.error.message)) || ''; } catch (_) { /* non JSON */ }
    const kind = r.status === 429 ? 'rate-limit' : (r.status === 401 || r.status === 403) ? 'auth' : r.status === 404 ? 'model-unavailable' : 'gemini';
    const err = new FitdaysError(r.status === 429 ? 429 : 502, kind, `Gemini ${r.status}${msg ? ': ' + String(msg).slice(0, 200) : ''}`);
    err.source = 'gemini';
    throw err;
  }
  const d = await r.json();
  const cand = d.candidates && d.candidates[0];
  const text = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts.map(p => p.text || '').join('') : '';
  return { text, usage: d.usageMetadata || null };
}

// ── Validazione ─────────────────────────────────────────────────────────────
// Ogni indicatore è un numero dentro i limiti del vocabolario (shared/fitdays.js) oppure null.
// Un report non riconosciuto torna con tutti i valori a null e riconosciuto = false.
export function validate(text) {
  const no = (problem) => ({ ok: false, problem });
  if (!text) return no('risposta vuota');
  let o;
  try { o = JSON.parse(String(text).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { return no('non è JSON'); }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return no('non è un oggetto');
  if (typeof o.riconosciuto !== 'boolean') return no('riconosciuto non è vero/falso');
  const { valori, letti } = ZTFitdays.valida(o.riconosciuto ? o : {});
  if (o.riconosciuto && letti === 0) return no('report riconosciuto ma nessun valore letto');
  const dataOra = o.riconosciuto ? ZTFitdays.testo(o.data_ora_testo, 40) : null;
  return {
    ok: true,
    value: {
      riconosciuto: o.riconosciuto,
      data_ora_testo: dataOra,
      data_report: ZTFitdays.dataReport(dataOra),
      valori,
      letti,
      note: ZTFitdays.testo(o.note, ZTFitdays.MAX_NOTE) || '',
    },
  };
}
