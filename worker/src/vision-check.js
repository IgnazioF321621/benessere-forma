// POST /vision-check — lettura AI delle foto di un check fisico (Fase 2, Lavoro B).
//
// Circuito delle foto: bucket Supabase → questo Worker → Gemini. L'app non vede mai
// la chiave di servizio né quella di Gemini, e il Worker non scrive MAI nei log il
// contenuto delle immagini (né byte, né base64): solo esiti e codici d'errore.
//
// Ogni risposta è un suggerimento: si salva in body_check_ai e si restituisce,
// l'app la mostra. Niente altro cambia.

import {
  VISION_PROMPT_VERSION, VISION_SYSTEM_PROMPT, OVERALL, CONFIDENCE, ZONE, CHANGE, ISSUES,
} from './prompts/vision-check-2026-09-13.js';

const SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';
const PHOTO_BUCKET = 'body-check-photos';

// Modello: il più economico con visione che regge il confronto (scelta e costo in CLAUDE.md).
export const VISION_MODEL = 'gemini-3.1-flash-lite';

const POSES = ['front', 'right', 'left', 'back'];
const POSE_IT = { front: 'fronte', right: 'profilo destro', left: 'profilo sinistro', back: 'retro' };
const MAX_SIDE = 1024;                   // lato lungo delle foto mandate al modello
const DEADLINE_MS = 60_000;              // tempo massimo di tutta la chiamata
const MIN_INTERVAL_MS = 10 * 60_000;     // una lettura per check ogni 10 minuti
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Anti doppio tocco dentro lo stesso isolate: due richieste per lo stesso check
// in volo insieme. Il limite dei 10 minuti vero sta nella tabella (created_at).
const inFlight = new Map();

class VisionError extends Error {
  constructor(status, kind, message, extra) { super(message); this.status = status; this.kind = kind; this.extra = extra || null; }
}

export async function handleVisionCheck(request, env, cors) {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: { source: 'worker', kind: 'method', status: 405, message: 'Solo POST' } }, 405);

  const startedAt = Date.now();
  let lockKey = null;
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.GEMINI_API_KEY) throw new VisionError(500, 'config', 'Chiavi del Worker non configurate');

    let body;
    try { body = await request.json(); } catch (_) { throw new VisionError(400, 'bad-request', 'Corpo della richiesta non leggibile'); }
    const userId = body && body.user_id;
    const currentId = body && body.check_id_current;
    const previousId = (body && body.check_id_previous) || null;
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (body && body.access_token) || '';
    if (!token) throw new VisionError(401, 'auth', 'Token mancante');
    if (!UUID_RE.test(String(userId || '')) || !UUID_RE.test(String(currentId || '')) || (previousId && !UUID_RE.test(String(previousId)))) {
      throw new VisionError(400, 'bad-request', 'user_id, check_id_current e check_id_previous devono essere UUID');
    }
    if (previousId === currentId) throw new VisionError(400, 'bad-request', 'Il check precedente coincide con quello attuale');

    // 1. Chi chiama: il token deve essere valido e appartenere a user_id
    const user = await supabaseUser(env, token);
    if (!user) throw new VisionError(401, 'auth', 'Token non valido o scaduto');
    if (user.id !== userId) throw new VisionError(403, 'forbidden', "Il token non appartiene a quest'utente");

    // 1b. I check esistono, sono dell'utente, sono completati, e il precedente viene prima
    const ids = previousId ? [currentId, previousId] : [currentId];
    const checks = await sbSelect(env, `body_checks?select=id,user_id,status,created_at&id=in.(${ids.join(',')})`);
    const cur = checks.find(c => c.id === currentId);
    const prev = previousId ? checks.find(c => c.id === previousId) : null;
    if (!cur || (previousId && !prev)) throw new VisionError(404, 'not-found', 'Check non trovato');
    if (checks.some(c => c.user_id !== userId)) throw new VisionError(403, 'forbidden', "Il check non appartiene a quest'utente");
    if (cur.status !== 'completed' || (prev && prev.status !== 'completed')) throw new VisionError(409, 'not-completed', 'Il check non è completato');
    if (prev && new Date(prev.created_at) >= new Date(cur.created_at)) throw new VisionError(400, 'bad-request', 'Il check precedente è più recente di quello attuale');

    // 1c. Anti doppio tocco: in volo nello stesso isolate, o letto da meno di 10 minuti
    lockKey = currentId;
    if (inFlight.has(lockKey) && Date.now() - inFlight.get(lockKey) < DEADLINE_MS + 5000) {
      lockKey = null;   // non è nostro: non va rilasciato
      throw new VisionError(429, 'in-progress', 'Lettura già in corso per questo check');
    }
    inFlight.set(lockKey, Date.now());
    const existing = await sbSelect(env, `body_check_ai?select=id,created_at&check_id=eq.${currentId}`, { tableKind: true });
    if (existing[0] && Date.now() - new Date(existing[0].created_at).getTime() < MIN_INTERVAL_MS) {
      const attesa = Math.ceil((MIN_INTERVAL_MS - (Date.now() - new Date(existing[0].created_at).getTime())) / 1000);
      throw new VisionError(429, 'too-soon', 'Lettura già fatta da meno di 10 minuti', { retry_after_s: attesa });
    }

    // 2. Foto e misure dei due check
    const photoRows = await sbSelect(env, `body_check_photos?select=check_id,pose,storage_path&check_id=in.(${ids.join(',')})`);
    const measRows = await sbSelect(env, `body_measurements?select=check_id,weight_kg,waist_cm,hips_cm,chest_cm,body_fat_pct,created_at&check_id=in.(${ids.join(',')})&order=created_at.desc`);

    const loadSet = async (checkId) => {
      const out = { images: [], missing: [] };
      for (const pose of POSES) {
        const row = photoRows.find(r => r.check_id === checkId && r.pose === pose);
        const img = row ? await fetchPhoto(env, row.storage_path, startedAt) : null;
        if (img) out.images.push({ pose, ...img }); else out.missing.push(pose);
      }
      return out;
    };
    const setCur = await loadSet(currentId);
    const setPrev = prev ? await loadSet(previousId) : null;
    if (!setCur.images.length) throw new VisionError(422, 'no-photos', 'Nessuna foto disponibile per questo check');

    // 3. Prompt: misure come testo, poi le foto etichettate
    const misure = (id) => measRows.find(m => m.check_id === id) || null;
    const parts = [{ text: userText(cur, prev, misure(currentId), prev ? misure(previousId) : null, setCur, setPrev) }];
    const pushImages = (set, etichetta) => {
      for (const im of set.images) {
        parts.push({ text: `${etichetta} — posa: ${POSE_IT[im.pose]}` });
        parts.push({ inline_data: { mime_type: im.mime, data: im.base64 } });
      }
    };
    if (setPrev) pushImages(setPrev, `CHECK PRECEDENTE (${dataIt(prev.created_at)})`);
    pushImages(setCur, `CHECK ATTUALE (${dataIt(cur.created_at)})`);

    // 4-5. Gemini, JSON validato, un solo nuovo tentativo
    let result = null, lastProblem = null, usage = null;
    for (let tentativo = 1; tentativo <= 2 && !result; tentativo++) {
      const risposta = await callGemini(env, parts, startedAt);
      usage = risposta.usage || usage;
      const verdetto = validate(risposta.text, !prev);
      if (verdetto.ok) result = verdetto.value; else lastProblem = verdetto.problem;
    }
    if (!result) throw new VisionError(502, 'invalid-json', `Risposta del modello non valida: ${lastProblem}`);

    // Le pose mancanti le dichiara il Worker, non il modello
    const mancanti = [...new Set([...setCur.missing, ...(setPrev ? setPrev.missing : [])])];
    if (mancanti.length) {
      result.photo_quality.issues = [...result.photo_quality.issues, ...mancanti.map(p => `foto mancante: ${p}`)];
      result.photo_quality.ok = false;
    }
    result.meta = {
      prompt_version: VISION_PROMPT_VERSION,
      poses_current: setCur.images.map(i => i.pose),
      poses_previous: setPrev ? setPrev.images.map(i => i.pose) : null,
      days_between: prev ? Math.round((new Date(cur.created_at) - new Date(prev.created_at)) / 86_400_000) : null,
      resized: setCur.images.every(i => i.resized) && (!setPrev || setPrev.images.every(i => i.resized)),
      usage: usage ? { prompt_tokens: usage.promptTokenCount ?? null, output_tokens: usage.candidatesTokenCount ?? null, thinking_tokens: usage.thoughtsTokenCount ?? null } : null,
    };

    // 6. Salvataggio (una riga per check: una lettura nuova sostituisce la vecchia)
    const row = await sbUpsertReading(env, {
      user_id: userId,
      check_id: currentId,
      previous_check_id: previousId,
      model: VISION_MODEL,
      result,
      confidence: result.confidence,
      created_at: new Date().toISOString(),
    });
    return json({ ok: true, reading: row });
  } catch (e) {
    const status = e instanceof VisionError ? e.status : 500;
    const kind = e instanceof VisionError ? e.kind : 'exception';
    // Solo metadati nel log: mai il contenuto delle foto.
    console.log(`[vision-check] ${status} ${kind}`);
    return json({ error: { source: e.source || 'worker', kind, status, message: e.message, ...(e.extra || {}) } }, status);
  } finally {
    if (lockKey) inFlight.delete(lockKey);
  }
}

// ── Supabase ────────────────────────────────────────────────────────────────

const svc = (env) => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` });

async function supabaseUser(env, token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` } });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw new VisionError(502, 'supabase', `Verifica token fallita (${r.status})`);
  const u = await r.json();
  return u && u.id ? u : null;
}

async function sbSelect(env, path, opts) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svc(env) });
  if (!r.ok) {
    const t = await r.text();
    if (opts && opts.tableKind && /PGRST205|42P01/.test(t)) throw new VisionError(503, 'table-missing', 'Tabella body_check_ai assente: migrazione non eseguita');
    throw new VisionError(502, 'supabase', `Lettura ${path.split('?')[0]} fallita (${r.status})`);
  }
  return r.json();
}

async function sbUpsertReading(env, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/body_check_ai?on_conflict=check_id`, {
    method: 'POST',
    headers: { ...svc(env), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const t = await r.text();
    if (/PGRST205|42P01/.test(t)) throw new VisionError(503, 'table-missing', 'Tabella body_check_ai assente: migrazione non eseguita');
    throw new VisionError(502, 'supabase', `Salvataggio della lettura fallito (${r.status})`);
  }
  const data = await r.json();
  return Array.isArray(data) ? data[0] : data;
}

// Scarica una foto con la chiave di servizio e la riduce a 1024 px sul lato lungo
// con il binding Images di Cloudflare. Se il binding non c'è o fallisce, manda
// l'originale e lo dichiara (meta.resized = false). null = foto non disponibile.
async function fetchPhoto(env, storagePath, startedAt) {
  const safePath = storagePath.split('/').map(encodeURIComponent).join('/');
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${safePath}`, { headers: svc(env), signal: AbortSignal.timeout(remaining(startedAt)) });
  if (r.status === 400 || r.status === 404) return null;
  if (!r.ok) throw new VisionError(502, 'storage', `Download foto fallito (${r.status})`);
  const original = await r.arrayBuffer();
  if (env.IMAGES) {
    try {
      const out = await env.IMAGES
        .input(new Blob([original]).stream())
        .transform({ width: MAX_SIDE, height: MAX_SIDE, fit: 'scale-down' })
        .output({ format: 'image/jpeg', quality: 82 });
      const bytes = new Uint8Array(await out.response().arrayBuffer());
      return { mime: 'image/jpeg', base64: toBase64(bytes), resized: true };
    } catch (_) { /* si ripiega sull'originale */ }
  }
  return { mime: r.headers.get('Content-Type') || 'image/jpeg', base64: toBase64(new Uint8Array(original)), resized: false };
}

function toBase64(bytes) {
  if (typeof bytes.toBase64 === 'function') return bytes.toBase64();
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// ── Prompt ──────────────────────────────────────────────────────────────────

const dataIt = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });

function userText(cur, prev, mCur, mPrev, setCur, setPrev) {
  const riga = (m) => {
    if (!m) return 'nessuna misura registrata';
    const v = [];
    if (m.weight_kg != null) v.push(`peso ${m.weight_kg} kg`);
    if (m.waist_cm != null) v.push(`vita ${m.waist_cm} cm`);
    if (m.hips_cm != null) v.push(`fianchi ${m.hips_cm} cm`);
    if (m.chest_cm != null) v.push(`petto ${m.chest_cm} cm`);
    if (m.body_fat_pct != null) v.push(`grasso corporeo ${m.body_fat_pct}% (da bilancia)`);
    return v.length ? v.join(', ') : 'nessuna misura registrata';
  };
  const pose = (set) => set.images.map(i => POSE_IT[i.pose]).join(', ') + (set.missing.length ? ` (mancano: ${set.missing.map(p => POSE_IT[p]).join(', ')})` : '');
  const righe = [];
  if (!prev) {
    righe.push('PRIMO CHECK: non c\'è un check precedente con cui confrontare.');
  } else {
    const giorni = Math.round((new Date(cur.created_at) - new Date(prev.created_at)) / 86_400_000);
    righe.push(`Confronto fra due check a ${giorni} giorni di distanza.`);
    righe.push(`Check precedente, ${dataIt(prev.created_at)}: ${riga(mPrev)}. Foto: ${pose(setPrev)}.`);
  }
  righe.push(`Check attuale, ${dataIt(cur.created_at)}: ${riga(mCur)}. Foto: ${pose(setCur)}.`);
  if (prev && mCur && mPrev) {
    const d = (k, u) => (mCur[k] != null && mPrev[k] != null) ? `${k === 'weight_kg' ? 'peso' : k === 'waist_cm' ? 'vita' : k === 'hips_cm' ? 'fianchi' : k === 'chest_cm' ? 'petto' : 'grasso corporeo'} ${fmtDelta(Number(mCur[k]) - Number(mPrev[k]))} ${u}` : null;
    const diffs = [d('weight_kg', 'kg'), d('waist_cm', 'cm'), d('hips_cm', 'cm'), d('chest_cm', 'cm'), d('body_fat_pct', 'punti %')].filter(Boolean);
    if (diffs.length) righe.push(`Differenze misurate (attuale meno precedente): ${diffs.join(', ')}.`);
  }
  righe.push('Le foto seguono, ognuna preceduta dalla sua etichetta. Rispondi solo col JSON richiesto.');
  return righe.join('\n');
}
const fmtDelta = (x) => { const r = Math.round(x * 100) / 100; return (r > 0 ? '+' : '') + String(r).replace('.', ','); };

// ── Gemini ──────────────────────────────────────────────────────────────────

const remaining = (startedAt) => Math.max(1000, DEADLINE_MS - (Date.now() - startedAt));

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overall: { type: 'STRING', enum: OVERALL },
    confidence: { type: 'STRING', enum: CONFIDENCE },
    areas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { zona: { type: 'STRING', enum: ZONE }, change: { type: 'STRING', enum: CHANGE }, note: { type: 'STRING' } },
        required: ['zona', 'change', 'note'],
      },
    },
    photo_quality: {
      type: 'OBJECT',
      properties: { ok: { type: 'BOOLEAN' }, issues: { type: 'ARRAY', items: { type: 'STRING', enum: ISSUES } } },
      required: ['ok', 'issues'],
    },
    summary: { type: 'STRING' },
    suggested_focus: { type: 'STRING' },
  },
  required: ['overall', 'confidence', 'areas', 'photo_quality', 'summary', 'suggested_focus'],
  propertyOrdering: ['overall', 'confidence', 'areas', 'photo_quality', 'summary', 'suggested_focus'],
};

async function callGemini(env, parts, startedAt) {
  let r;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: VISION_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
      signal: AbortSignal.timeout(remaining(startedAt)),
    });
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new VisionError(504, 'timeout', 'Il modello non ha risposto entro 60 secondi');
    throw new VisionError(502, 'gemini', 'Chiamata al modello fallita');
  }
  // Come Groq (L36): un errore dell'API torna come risposta regolare, va controllato a mano.
  if (!r.ok) {
    let msg = '';
    try { const d = await r.json(); msg = (d && d.error && (d.error.status || d.error.message)) || ''; } catch (_) { /* non JSON */ }
    const kind = r.status === 429 ? 'rate-limit' : (r.status === 401 || r.status === 403) ? 'auth' : r.status === 404 ? 'model-unavailable' : 'gemini';
    // Verso l'app: 429 resta 429 (riprovare ha senso), tutto il resto è 502 — un 404 del
    // modello non deve sembrare una rotta del Worker che non esiste. Il codice vero sta nel messaggio.
    const err = new VisionError(r.status === 429 ? 429 : 502, kind, `Gemini ${r.status}${msg ? ': ' + String(msg).slice(0, 200) : ''}`);
    err.source = 'gemini';
    throw err;
  }
  const data = await r.json();
  const cand = data.candidates && data.candidates[0];
  const text = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts.map(p => p.text || '').join('') : '';
  return { text, usage: data.usageMetadata || null, finish: cand ? cand.finishReason : (data.promptFeedback && data.promptFeedback.blockReason) || null };
}

// ── Validazione ─────────────────────────────────────────────────────────────

export function validate(text, isFirst) {
  const no = (problem) => ({ ok: false, problem });
  if (!text) return no('risposta vuota');
  let o;
  try { o = JSON.parse(String(text).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { return no('non è JSON'); }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return no('non è un oggetto');
  if (!OVERALL.includes(o.overall)) return no('overall fuori vocabolario');
  if (!CONFIDENCE.includes(o.confidence)) return no('confidence fuori vocabolario');
  if (isFirst && o.overall !== 'primo_check') return no('primo check senza overall = primo_check');
  if (!isFirst && o.overall === 'primo_check') return no('primo_check con un check precedente');
  if (!Array.isArray(o.areas)) return no('areas non è una lista');
  const zone = new Set();
  for (const a of o.areas) {
    if (!a || !ZONE.includes(a.zona) || !CHANGE.includes(a.change) || typeof a.note !== 'string') return no('voce di areas non valida');
    if (zone.has(a.zona)) return no('zona ripetuta in areas');
    zone.add(a.zona);
  }
  const areas = isFirst ? [] : o.areas.map(a => ({ zona: a.zona, change: a.change, note: a.note.trim() }));
  const pq = o.photo_quality;
  if (!pq || typeof pq.ok !== 'boolean' || !Array.isArray(pq.issues) || pq.issues.some(i => !ISSUES.includes(i))) return no('photo_quality non valida');
  if (typeof o.summary !== 'string' || !o.summary.trim()) return no('summary vuoto');
  if (typeof o.suggested_focus !== 'string') return no('suggested_focus non è testo');
  return {
    ok: true,
    value: {
      overall: o.overall,
      confidence: o.confidence,
      areas,
      photo_quality: { ok: pq.ok, issues: [...new Set(pq.issues)] },
      summary: o.summary.trim(),
      suggested_focus: o.suggested_focus.trim(),
    },
  };
}
