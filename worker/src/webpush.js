// Web Push dal Worker, senza librerie (Notifiche 170, 1 novembre 2026).
//
// Due pezzi, tutti e due con la WebCrypto che il Worker ha già:
//   1. VAPID (RFC 8292): un JWT firmato ES256 con la chiave privata del Worker, che dice al servizio
//      push (Apple, Google, Mozilla) chi manda. La chiave pubblica è la stessa che l'app passa a
//      pushManager.subscribe (applicationServerKey): il servizio push accetta solo avvisi firmati da lei.
//   2. La cifratura dell'avviso (RFC 8291 + RFC 8188, «aes128gcm»): il testo lo legge solo il telefono.
//      Chiave effimera ECDH P-256 del Worker + chiave p256dh del telefono → segreto condiviso; HKDF con
//      il segreto `auth` del telefono → IKM; HKDF con il salt → chiave AES-128-GCM e nonce; il corpo è
//      salt(16) · rs(4) · idlen(1) · chiave pubblica effimera(65) · testo cifrato con il byte 0x02 in coda.
//
// Chiavi del Worker (secret, mai nel repo): VAPID_PUBLIC_KEY (65 byte, punto non compresso, base64url)
// e VAPID_PRIVATE_KEY (32 byte, base64url). Le genera tools/vapid/genera.js, in locale; le mette la
// Regia con `wrangler secret put` al rilascio. VAPID_SUBJECT è il contatto («mailto:…»).
//
//   inviaPush(iscrizione, payload, env, opzioni) → { status, viva }
//     iscrizione  { endpoint, p256dh, auth }   (la riga di push_iscrizioni)
//     payload     oggetto: va in JSON nel corpo, lo legge sw.js
//     viva        falso se il servizio push ha risposto 404 o 410: l'indirizzo non esiste più, si cancella
//
// Le funzioni _* sono esportate solo per la prova (worker/test/prova_webpush.mjs), che decifra come
// farebbe il telefono e controlla la firma con la chiave pubblica.

const TTL_SECONDI = 4 * 3600;        // l'avviso vale quattro ore: dopo, il servizio push lo butta (il pasto dopo è un altro avviso)
const RS = 4096;                     // record size RFC 8188: un record solo, il nostro avviso è piccolo
const enc = new TextEncoder();

export function b64url(bytes) {
  const b = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function daB64url(s) {
  const t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = t.length % 4 ? '='.repeat(4 - (t.length % 4)) : '';
  const bin = atob(t + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parti) {
  const n = parti.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parti) { out.set(p, o); o += p.length; }
  return out;
}

// La chiave VAPID come CryptoKey: la pubblica è il punto non compresso (04 · x · y), la privata lo scalare d
function jwkVapid(env) {
  const pub = daB64url(env.VAPID_PUBLIC_KEY);
  const d = daB64url(env.VAPID_PRIVATE_KEY);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY: attesi 65 byte, punto non compresso');
  if (d.length !== 32) throw new Error('VAPID_PRIVATE_KEY: attesi 32 byte');
  return { kty: 'EC', crv: 'P-256', x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33, 65)), d: b64url(d) };
}

// Il JWT VAPID: aud = origine del servizio push, exp fra 12 ore (il massimo ammesso è 24), sub = il contatto
export async function _vapidJwt(env, audience, adesso) {
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor((adesso == null ? Date.now() : adesso) / 1000) + 12 * 3600;
  const claims = b64url(enc.encode(JSON.stringify({ aud: audience, exp, sub: env.VAPID_SUBJECT || 'mailto:ignazio.f@me.com' })));
  const chiave = await crypto.subtle.importKey('jwk', jwkVapid(env), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chiave, enc.encode(header + '.' + claims));
  // WebCrypto firma già in forma r·s (64 byte), quella che il JWT vuole
  return header + '.' + claims + '.' + b64url(firma);
}

async function hkdf(salt, ikm, info, lunghezza) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, lunghezza * 8));
}

// RFC 8291: il corpo cifrato per questo telefono. `opzioni` solo per la prova (salt e chiave effimera fissi).
export async function _cifra(iscrizione, testo, opzioni) {
  const ua = daB64url(iscrizione.p256dh);       // la chiave pubblica del telefono (65 byte)
  const auth = daB64url(iscrizione.auth);        // il segreto del telefono (16 byte)
  if (ua.length !== 65 || ua[0] !== 4) throw new Error('p256dh: attesi 65 byte, punto non compresso');
  if (auth.length !== 16) throw new Error('auth: attesi 16 byte');
  const salt = (opzioni && opzioni.salt) || crypto.getRandomValues(new Uint8Array(16));
  const effimera = (opzioni && opzioni.effimera) || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', effimera.publicKey));   // 65 byte
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const segreto = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, effimera.privateKey, 256));
  // IKM = HKDF(auth, segreto, "WebPush: info" · 0x00 · ua_public · as_public, 32)
  const infoIkm = concat(enc.encode('WebPush: info\0'), ua, asPub);
  const ikm = await hkdf(auth, segreto, infoIkm, 32);
  // chiave e nonce dal salt (RFC 8188)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  // un record solo: testo · 0x02 (ultimo record), niente padding
  const chiaro = concat(enc.encode(testo), new Uint8Array([2]));
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cifrato = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, chiaro));
  // intestazione RFC 8188: salt(16) · rs(4, big endian) · idlen(1) · keyid = as_public(65)
  const rs = new Uint8Array([(RS >>> 24) & 255, (RS >>> 16) & 255, (RS >>> 8) & 255, RS & 255]);
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, cifrato);
}

export async function inviaPush(iscrizione, payload, env, opzioni) {
  const url = new URL(iscrizione.endpoint);
  if (url.protocol !== 'https:') return { status: 0, viva: false, motivo: 'endpoint non https' };
  const jwt = await _vapidJwt(env, url.origin, opzioni && opzioni.adesso);
  const corpo = await _cifra(iscrizione, JSON.stringify(payload), opzioni);
  const r = await fetch(iscrizione.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(corpo.length),
      'TTL': String((opzioni && opzioni.ttl) || TTL_SECONDI),
      'Urgency': 'normal',
      'Topic': (opzioni && opzioni.topic) || 'pasto',       // lo stesso argomento sostituisce l'avviso non ancora consegnato
      'Authorization': `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
    },
    body: corpo,
  });
  // 201 mandato · 404/410 l'iscrizione non esiste più (si cancella) · 429 troppi · altro: si riprova al giro dopo
  const viva = !(r.status === 404 || r.status === 410);
  return { status: r.status, viva };
}
