// La porta del Worker: chi può entrare, da dove, e quanto può chiedere (Pirsi 010).
//
// Tre controlli, nell'ordine in cui costano meno:
//   1. da dove arriva la richiesta (Origin) — solo il sito dell'app;
//   2. chi chiama — il token di accesso Supabase della persona, lo stesso di /vision-check;
//   3. quante richieste al minuto fa quella persona.
// Il primo ferma i siti altrui dentro un browser; chi chiama fuori da un browser
// l'Origin lo inventa, e lì il controllo vero è il secondo.

const SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';

// Il sito dell'app (GitHub Pages) e il Mac di sviluppo. Nient'altro.
const ORIGINI_AMMESSE = ['https://ignaziof321621.github.io'];
const ORIGINE_LOCALE_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function origineAmmessa(origin) {
  return ORIGINI_AMMESSE.includes(origin) || ORIGINE_LOCALE_RE.test(origin);
}

// Intestazioni CORS per QUESTA richiesta: l'Origin torna indietro solo se è ammessa.
export function corsPer(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': origineAmmessa(origin) ? origin : ORIGINI_AMMESSE[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// true = la richiesta dichiara un'Origin che non è il sito dell'app.
// Origin assente (prove da riga di comando, cron) passa: lì decide il token.
export function origineRifiutata(request) {
  const origin = request.headers.get('Origin');
  return !!origin && !origineAmmessa(origin);
}

export function tokenDa(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

// Token già verificati, per isolate: evita una chiamata a Supabase a ogni consiglio.
// Cinque minuti: un token revocato smette di funzionare entro quel tempo.
const TOKEN_TTL_MS = 5 * 60_000;
const TOKEN_MAX = 500;
const tokenVisti = new Map();

// Restituisce l'id della persona, o null se il token non vale.
// Lancia solo se Supabase non risponde (non è colpa di chi chiama).
export async function personaDaToken(env, token) {
  if (!token) return null;
  const visto = tokenVisti.get(token);
  if (visto && visto.scade > Date.now()) return visto.id;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  });
  if (r.status === 401 || r.status === 403) { tokenVisti.delete(token); return null; }
  if (!r.ok) throw new Error(`Verifica token fallita (${r.status})`);
  const u = await r.json();
  if (!u || !u.id) return null;
  if (tokenVisti.size >= TOKEN_MAX) tokenVisti.clear();
  tokenVisti.set(token, { id: u.id, scade: Date.now() + TOKEN_TTL_MS });
  return u.id;
}

// Limite di richieste per persona. Col binding di Cloudflare (wrangler.toml,
// [[ratelimits]]) il conto è condiviso fra gli isolate; senza binding — prove,
// o deploy senza quella sezione — si ripiega su un conto in memoria, che vale
// per il solo isolate ma non lascia mai la porta senza limite.
const finestre = new Map();

export async function entroIlLimite(binding, chiave, limite, periodoMs = 60_000) {
  if (binding && typeof binding.limit === 'function') {
    try {
      const { success } = await binding.limit({ key: chiave });
      return !!success;
    } catch (_) { /* binding guasto: si ripiega sul conto in memoria */ }
  }
  const ora = Date.now();
  const f = finestre.get(chiave);
  if (!f || ora - f.inizio >= periodoMs) {
    if (finestre.size >= 2000) finestre.clear();
    finestre.set(chiave, { inizio: ora, n: 1 });
    return true;
  }
  f.n++;
  return f.n <= limite;
}

// Solo per le prove: riparte da zero.
export function _azzeraPorta() { tokenVisti.clear(); finestre.clear(); }
