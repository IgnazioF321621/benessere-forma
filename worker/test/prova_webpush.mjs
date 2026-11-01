// Prova del Web Push senza rete (Notifiche 170): il Worker cifra come dice RFC 8291 e firma il JWT VAPID
// come dice RFC 8292. Qui si fa la parte del telefono con node:crypto, un'implementazione INDIPENDENTE
// dalla WebCrypto usata in src/webpush.js: si decifra il corpo e si controlla la firma con la chiave
// pubblica. Se le due strade non si incontrano, il telefono non leggerebbe niente.
//   node worker/test/prova_webpush.mjs
import { createECDH, hkdfSync, createDecipheriv, createVerify, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { inviaPush, _cifra, _vapidJwt, b64url, daB64url } from '../src/webpush.js';

let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(64), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};

// Le chiavi del Worker (come le farebbe tools/vapid/genera.js) e quelle del telefono (come le fa il browser)
const vapid = createECDH('prime256v1'); vapid.generateKeys();
const ENV = { VAPID_PUBLIC_KEY: b64url(vapid.getPublicKey()), VAPID_PRIVATE_KEY: b64url(vapid.getPrivateKey()), VAPID_SUBJECT: 'mailto:prova@example.com' };
const telefono = createECDH('prime256v1'); telefono.generateKeys();
const authTel = Buffer.from('0123456789abcdef');
const iscrizione = { endpoint: 'https://web.push.apple.com/QWxs', p256dh: b64url(telefono.getPublicKey()), auth: b64url(authTel) };

// Il telefono decifra (RFC 8291 §3, RFC 8188): salt · rs · idlen · as_public · cifrato
function decifra(corpo, testo) {
  const salt = corpo.subarray(0, 16);
  const rs = corpo.readUInt32BE(16);
  const idlen = corpo[20];
  const asPub = corpo.subarray(21, 21 + idlen);
  const cifrato = corpo.subarray(21 + idlen);
  const segreto = telefono.computeSecret(asPub);
  const infoIkm = Buffer.concat([Buffer.from('WebPush: info\0'), telefono.getPublicKey(), asPub]);
  const ikm = Buffer.from(hkdfSync('sha256', segreto, authTel, infoIkm, 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(cifrato.subarray(cifrato.length - 16));
  const chiaro = Buffer.concat([d.update(cifrato.subarray(0, cifrato.length - 16)), d.final()]);
  return { rs, idlen, ultimo: chiaro[chiaro.length - 1], testo: chiaro.subarray(0, chiaro.length - 1).toString('utf8') };
}

// 1. base64url avanti e indietro
atteso('b64url · andata e ritorno di 65 byte', b64url(daB64url(iscrizione.p256dh)) === iscrizione.p256dh && daB64url(iscrizione.p256dh).length === 65, true);

// 2. la cifratura: il telefono legge il testo, un record solo, chiave effimera di 65 byte
{
  const testo = JSON.stringify({ titolo: 'Pirsi · Pranzo', corpo: 'Non vedo ancora il pranzo di oggi.', slot: 'pranzo' });
  const corpo = Buffer.from(await _cifra(iscrizione, testo));
  const letto = decifra(corpo, testo);
  atteso('cifra · il telefono decifra lo stesso testo', letto.testo, testo);
  atteso('cifra · rs 4096, keyid 65 byte, delimitatore 0x02', [letto.rs, letto.idlen, letto.ultimo], [4096, 65, 2]);
  atteso('cifra · lunghezza = 86 + testo + 1 + 16', corpo.length, 86 + Buffer.byteLength(testo) + 1 + 16);
  const corpo2 = Buffer.from(await _cifra(iscrizione, testo));
  atteso('cifra · due invii dello stesso testo non sono uguali (salt e chiave nuovi)', corpo.equals(corpo2), false);
  // il testo cambiato di un byte non si decifra (il tag GCM protegge)
  const rotto = Buffer.from(corpo); rotto[rotto.length - 20] ^= 1;
  let letturaRotta = 'decifrato';
  try { decifra(rotto, testo); } catch (e) { letturaRotta = 'rifiutato'; }
  atteso('cifra · un byte cambiato → il telefono rifiuta', letturaRotta, 'rifiutato');
  // chiavi sbagliate del telefono: il Worker si ferma prima di mandare
  let msg = '';
  try { await _cifra({ ...iscrizione, auth: b64url(Buffer.alloc(8)) }, testo); } catch (e) { msg = e.message; }
  atteso('cifra · auth di 8 byte → rifiutato prima di mandare', /auth/.test(msg), true);
  msg = '';
  try { await _cifra({ ...iscrizione, p256dh: b64url(Buffer.alloc(33, 2)) }, testo); } catch (e) { msg = e.message; }
  atteso('cifra · p256dh compresso → rifiutato prima di mandare', /p256dh/.test(msg), true);
}

// 3. il JWT VAPID: tre parti, firma ES256 valida con la chiave pubblica, aud = origine, exp fra 12 ore, sub
{
  const adesso = Date.parse('2026-11-02T09:00:00Z');
  const jwt = await _vapidJwt(ENV, 'https://web.push.apple.com', adesso);
  const [h, c, s] = jwt.split('.');
  const header = JSON.parse(Buffer.from(daB64url(h)).toString()), claims = JSON.parse(Buffer.from(daB64url(c)).toString());
  atteso('vapid · header ES256/JWT', header, { typ: 'JWT', alg: 'ES256' });
  atteso('vapid · aud, exp (+12 h), sub', [claims.aud, claims.exp, claims.sub], ['https://web.push.apple.com', Math.floor(adesso / 1000) + 12 * 3600, 'mailto:prova@example.com']);
  const pub = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64url(vapid.getPublicKey().subarray(1, 33)), y: b64url(vapid.getPublicKey().subarray(33, 65)) }, format: 'jwk' });
  const v = createVerify('SHA256'); v.update(h + '.' + c);
  atteso('vapid · la firma regge con la chiave pubblica (r·s, 64 byte)', [daB64url(s).length, v.verify({ key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(daB64url(s)))], [64, true]);
  const altra = createECDH('prime256v1'); altra.generateKeys();
  const pubAltra = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64url(altra.getPublicKey().subarray(1, 33)), y: b64url(altra.getPublicKey().subarray(33, 65)) }, format: 'jwk' });
  const v2 = createVerify('SHA256'); v2.update(h + '.' + c);
  atteso('vapid · con un\'altra chiave pubblica la firma non regge', v2.verify({ key: pubAltra, dsaEncoding: 'ieee-p1363' }, Buffer.from(daB64url(s))), false);
  let msg = '';
  try { await _vapidJwt({ ...ENV, VAPID_PRIVATE_KEY: b64url(Buffer.alloc(16)) }, 'https://x', adesso); } catch (e) { msg = e.message; }
  atteso('vapid · chiave privata corta → rifiutata', /VAPID_PRIVATE_KEY/.test(msg), true);
}

// 4. inviaPush: le intestazioni che il servizio push vuole, l'esito per 201 / 410 / 500, mai http
{
  let ultima = null;
  const conRisposta = (status) => { globalThis.fetch = async (url, init) => { ultima = { url: String(url), init }; return new Response(null, { status }); }; };
  conRisposta(201);
  const r = await inviaPush(iscrizione, { titolo: 'x', corpo: 'y', slot: 'cena' }, ENV, { adesso: Date.now() });
  const H = ultima.init.headers;
  atteso('invia · POST all\'endpoint, 201 → viva', [ultima.init.method, ultima.url, r.status, r.viva], ['POST', iscrizione.endpoint, 201, true]);
  atteso('invia · Content-Encoding aes128gcm, TTL 4 ore, Urgency normal, Topic pasto', [H['Content-Encoding'], H.TTL, H.Urgency, H.Topic], ['aes128gcm', '14400', 'normal', 'pasto']);
  atteso('invia · Authorization vapid t=<jwt>, k=<chiave pubblica>', new RegExp('^vapid t=[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+, k=' + ENV.VAPID_PUBLIC_KEY + '$').test(H.Authorization), true);
  atteso('invia · Content-Length = byte del corpo', Number(H['Content-Length']), ultima.init.body.length);
  const letto = decifra(Buffer.from(ultima.init.body));
  atteso('invia · il corpo è il JSON cifrato dell\'avviso', JSON.parse(letto.testo), { titolo: 'x', corpo: 'y', slot: 'cena' });
  conRisposta(410);
  atteso('invia · 410 → morta', (await inviaPush(iscrizione, {}, ENV)).viva, false);
  conRisposta(404);
  atteso('invia · 404 → morta', (await inviaPush(iscrizione, {}, ENV)).viva, false);
  conRisposta(500);
  atteso('invia · 500 → viva (si riprova al giro dopo)', (await inviaPush(iscrizione, {}, ENV)).viva, true);
  ultima = null;
  const h = await inviaPush({ ...iscrizione, endpoint: 'http://web.push.apple.com/x' }, {}, ENV);
  atteso('invia · endpoint http → non si manda', [h.viva, ultima], [false, null]);
}

console.log(ko ? `\n${ko} controlli KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
