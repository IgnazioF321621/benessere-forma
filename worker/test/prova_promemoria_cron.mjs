// Il giro delle ore del promemoria del pasto (Notifiche 170) senza rete: fetch finto per il REST di Supabase e
// per i servizi push. Gira in UTC come Cloudflare.
//   TZ=UTC node worker/test/prova_promemoria_cron.mjs
// Copre: l'ora di Roma (anche con l'ora legale), le chiavi assenti, chi ha acceso cosa, lo spuntino che non
// conta, il pasto registrato, il digiuno, la pausa cibo, l'avviso già mandato, nessun telefono, l'indirizzo
// morto che si cancella, la riga in promemoria_inviati, la prova senza scritture, il giro pieno, il testo.
import { createECDH } from 'node:crypto';
import { runPromemoria, handlePromemoria, MAX_AVVISI_GIRO, PULIZIA_GIORNI } from '../src/promemoria-cron.js';
import { b64url } from '../src/webpush.js';
import { giroPer } from '../src/index.js';
import { handleScheduled } from '../src/coach-cron.js';

let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const uid = (n) => `${String(n).repeat(8)}-aaaa-4aaa-8aaa-${String(n).repeat(12)}`;
const U1 = uid(1), U2 = uid(2), U3 = uid(3), U4 = uid(4), U5 = uid(5), U6 = uid(6), U7 = uid(7), U8 = uid(8), U9 = uid(9);
const vapid = createECDH('prime256v1'); vapid.generateKeys();
const ENV = { SUPABASE_SERVICE_ROLE_KEY: 'finta', VAPID_PUBLIC_KEY: b64url(vapid.getPublicKey()), VAPID_PRIVATE_KEY: b64url(vapid.getPrivateKey()) };
const tel = createECDH('prime256v1'); tel.generateKeys();
const I = (n) => 'ffffffff-0000-4000-8000-' + String(n).padStart(12, '0');   // gli id di push_iscrizioni sono uuid: il giro scarta tutto il resto
const iscr = (id, user, endpoint) => ({ id, user_id: user, endpoint, p256dh: b64url(tel.getPublicKey()), auth: b64url(Buffer.alloc(16, 7)) });
// lunedì 2 novembre 2026 (CET): le 10 di Roma sono le 09:00 UTC
const ORE10 = Date.parse('2026-11-02T09:00:00Z'), ORE15 = Date.parse('2026-11-02T14:00:00Z'), ORE22 = Date.parse('2026-11-02T21:00:00Z'), ORE9 = Date.parse('2026-11-02T08:00:00Z');
const G = '2026-11-02';

function mondo(o = {}) {
  const t = {
    profiles: [
      { id: U1, promemoria_pasti: ['colazione', 'pranzo', 'cena'] },
      { id: U2, promemoria_pasti: ['colazione'] },
      { id: U3, promemoria_pasti: ['pranzo'] },
      { id: U4, promemoria_pasti: ['colazione'] },
      { id: U5, promemoria_pasti: ['colazione'], pausa_inizio: '2026-11-01', pausa_fine: '2026-11-05' },
      { id: U6, promemoria_pasti: ['colazione'] },
      { id: U7, promemoria_pasti: ['colazione'] },
      { id: U8, promemoria_pasti: [] },
      { id: U9, promemoria_pasti: null },
    ],
    meals: [
      { user_id: U1, date: G, slot: 'snack_mattina' },          // uno spuntino non è la colazione
      { user_id: U2, date: G, slot: 'colazione' },
      { user_id: U3, date: '2026-11-01', slot: 'pranzo' },       // ieri non conta
    ],
    fasting_days: [ { user_id: U4, date: G } ],
    push_iscrizioni: [ iscr(I(1), U1, 'https://web.push.apple.com/u1a'), iscr(I(2), U1, 'https://fcm.googleapis.com/u1b-morto'), iscr(I(3), U2, 'https://web.push.apple.com/u2'), iscr(I(4), U6, 'https://web.push.apple.com/u6'), iscr(I(5), U3, 'https://web.push.apple.com/u3') ],
    promemoria_inviati: [ { user_id: U6, date: G, slot: 'colazione' } ],
    ...o.tabelle,
  };
  const scritture = [], push = [], letture = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    if ((init.method || 'GET') === 'GET') letture.push(u.pathname.split('/').pop() + u.search);
    const res = (body, status = 200) => new Response(status === 204 ? null : (body == null ? '' : JSON.stringify(body)), { status, headers: { 'Content-Type': 'application/json' } });
    if (!u.hostname.endsWith('supabase.co')) {
      push.push({ url: u.href, headers: init.headers, byte: init.body ? init.body.length : 0 });
      if (u.pathname.endsWith('-morto')) return new Response(null, { status: 410 });
      if (u.pathname.endsWith('-guasto')) return new Response(null, { status: 500 });
      return new Response(null, { status: 201 });
    }
    const table = u.pathname.split('/').pop();
    const method = init.method || 'GET';
    if ((o.rotte || []).includes(table)) return res({ message: 'boom' }, 500);
    const filtri = [...u.searchParams.entries()].filter(([k]) => !['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k));
    const passa = (r) => filtri.every(([col, v]) => {
      const [op, ...rest] = v.split('.'); const val = rest.join('.');
      if (op === 'eq') return String(r[col]) === val;
      if (op === 'in') return val.slice(1, -1).split(',').includes(String(r[col]));
      if (op === 'lt') return r[col] < val;
      if (op === 'not') return r[col] != null;
      return true;
    });
    if (method === 'GET') {
      const off = Number(u.searchParams.get('offset') || 0), lim = Number(u.searchParams.get('limit') || 1000);
      return res((t[table] || []).filter(passa).slice(off, off + lim));
    }
    const body = init.body ? JSON.parse(init.body) : null;
    scritture.push({ method, table, prefer: init.headers.Prefer, body, filtri: filtri.map(([k, v]) => k + '=' + v).join('&') });
    if (method === 'PATCH') { (t[table] || []).filter(passa).forEach((r) => Object.assign(r, body)); return res(null, 204); }
    if (method === 'DELETE') { t[table] = (t[table] || []).filter((r) => !passa(r)); return res(null, 204); }
    if (method === 'POST') { (Array.isArray(body) ? body : [body]).forEach((r) => t[table].push(r)); return res(null, 201); }
    return res(null);
  };
  return { t, scritture, push, letture };
}
const esitoDi = (e, u) => (e.utenti.find((x) => x.user === u.slice(0, 8)) || {}).esito;

// 1. le ore: alle 9 niente, senza chiavi niente, l'ora legale non sposta le 10 di Roma
{
  const m = mondo();
  const e = await runPromemoria(ENV, { nowTs: ORE9 });
  atteso('alle 9 di Roma si salta, nessuna lettura', [e.saltato, e.ora, m.push.length], ['ora', 9, 0]);
  const e2 = await runPromemoria({ SUPABASE_SERVICE_ROLE_KEY: 'finta' }, { nowTs: ORE10 });
  atteso('senza chiavi VAPID si salta', e2.saltato, 'chiavi');
  const e3 = await runPromemoria(ENV, { nowTs: Date.parse('2026-07-01T08:00:00Z'), dry: true });
  atteso('1 luglio 08:00 UTC = le 10 di Roma (ora legale): si lavora', [e3.saltato, e3.ora, e3.giorno], [null, 10, '2026-07-01']);
  const e4 = await runPromemoria(ENV, { nowTs: ORE22, dry: true });
  atteso('2 novembre 21:00 UTC = le 22 di Roma: si lavora', [e4.saltato, e4.ora], [null, 22]);
}

// 2. le 10: chi riceve cosa
{
  const m = mondo();
  const e = await runPromemoria(ENV, { nowTs: ORE10 });
  atteso('solo chi ha acceso qualcosa entra nel giro (U8 [] e U9 null no)', e.utenti.length, 7);
  atteso('U1: lo spuntino non è la colazione → mandato a 1 (l\'altro telefono è morto)', [esitoDi(e, U1), e.utenti[0].pasto], ['mandato a 1', 'colazione']);
  atteso('U2: colazione registrata → niente', esitoDi(e, U2), 'niente da dire');
  atteso('U3: solo pranzo acceso → alle 10 niente', esitoDi(e, U3), 'niente da dire');
  atteso('U4: giorno di digiuno → niente', esitoDi(e, U4), 'niente da dire');
  atteso('U5: pausa cibo → niente', esitoDi(e, U5), 'niente da dire');
  atteso('U6: già mandato oggi → non si ripete', esitoDi(e, U6), 'già mandato');
  atteso('U7: nessun telefono', esitoDi(e, U7), 'nessun telefono');
  atteso('conto: 1 avviso, 2 telefoni, 1 morto, 0 errori', [e.avvisi, e.telefoni, e.morti, e.errori], [1, 2, 1, 0]);
  atteso('2 POST ai servizi push, con VAPID e corpo cifrato', [m.push.length, m.push.every((p) => /^vapid t=/.test(p.headers.Authorization) && p.headers['Content-Encoding'] === 'aes128gcm' && p.byte > 100)], [2, true]);
  atteso('letture per giorno, mai per elenco di persone (niente in.(…) negli indirizzi)', [m.letture.length, m.letture.some((l) => /user_id=in/.test(l)), m.letture.filter((l) => /date=eq\.2026-11-02/.test(l)).length], [5, false, 3]);
  atteso('sottorichieste del giro: 5 letture + 2 push + 3 scritture = 10', m.letture.length + m.push.length + m.scritture.length, 10);
  const s = m.scritture;
  atteso('scritture: inviati (upsert), ultimo invio (PATCH), morto tolto (DELETE)', s.map((x) => x.method + ' ' + x.table), ['POST promemoria_inviati', 'PATCH push_iscrizioni', 'DELETE push_iscrizioni']);
  atteso('promemoria_inviati: U1 · oggi · colazione · 1 telefono', s[0].body, [{ user_id: U1, date: G, slot: 'colazione', telefoni: 1 }]);
  atteso('PATCH solo sul telefono vivo, DELETE solo sul morto', [s[1].filtri, s[2].filtri], ['id=in.(' + I(1) + ')', 'id=in.(' + I(2) + ')']);
  atteso('il morto non c\'è più', m.t.push_iscrizioni.map((i) => i.id), [I(1), I(3), I(4), I(5)]);
  atteso('il vivo ha l\'ultimo invio', [m.t.push_iscrizioni[0].ultimo_esito, typeof m.t.push_iscrizioni[0].ultimo_invio], ['mandato', 'string']);
  // lo stesso giro di nuovo nella stessa ora: niente di nuovo
  const e2 = await runPromemoria(ENV, { nowTs: ORE10 });
  atteso('un secondo giro alle 10: U1 già mandato, niente push', [esitoDi(e2, U1), m.push.length], ['già mandato', 2]);
}

// 3. le 15: il pranzo, non la colazione ancora mancante; alle 22 la cena
{
  const m = mondo();
  const e = await runPromemoria(ENV, { nowTs: ORE15 });
  atteso('alle 15 U1 riceve il pranzo (la colazione non si ripete)', [esitoDi(e, U1), e.utenti[0].pasto], ['mandato a 1', 'pranzo']);
  atteso('alle 15 U3 (solo pranzo acceso, pranzo di ieri) riceve', esitoDi(e, U3), 'mandato a 1');
  atteso('alle 15 chi ha acceso solo la colazione non riceve', [esitoDi(e, U2), esitoDi(e, U7)], ['niente da dire', 'niente da dire']);
  const e2 = await runPromemoria(ENV, { nowTs: ORE22 });
  atteso('alle 22 solo U1 ha la cena accesa', [esitoDi(e2, U1), e2.utenti[0].pasto, e2.avvisi], ['mandato a 1', 'cena', 1]);
  const pulizia = m.scritture.filter((s) => s.method === 'DELETE' && s.table === 'promemoria_inviati');
  atteso('alle 22 la pulizia: una richiesta, le righe più vecchie di 30 giorni', [e2.puliti, pulizia.length, pulizia[0].filtri, PULIZIA_GIORNI], [true, 1, 'date=lt.2026-10-03', 30]);
  atteso('alle 15 niente pulizia', e.puliti, false);
}

// 4. la prova (dry): decide ma non manda e non scrive
{
  const m = mondo();
  const e = await runPromemoria(ENV, { nowTs: ORE10, dry: true });
  atteso('dry: 1 avviso deciso, 0 push, 0 scritture', [e.avvisi, e.telefoni, m.push.length, m.scritture.length], [1, 2, 0, 0]);
}

// 5. il servizio push guasto: niente riga in inviati (si potrà riprovare), il telefono resta
{
  const m = mondo({ tabelle: { push_iscrizioni: [iscr(I(9), U1, 'https://web.push.apple.com/u1-guasto')] } });
  const e = await runPromemoria(ENV, { nowTs: ORE10 });
  atteso('500 dal servizio push: esito detto, niente in inviati, l\'esito scritto sul telefono, che resta', [esitoDi(e, U1), e.avvisi, m.scritture.map((s) => s.method + ' ' + s.table), m.scritture[0].body.ultimo_esito, m.t.push_iscrizioni.length], ['servizio push 500', 0, ['PATCH push_iscrizioni'], 'servizio push 500', 1]);
}

// 6. il giro pieno: oltre MAX_AVVISI_GIRO telefoni si rimanda e lo si dice
{
  const tanti = Array.from({ length: MAX_AVVISI_GIRO - 1 }, (_, i) => iscr(I(100 + i), U7, 'https://web.push.apple.com/u7-' + i));
  const m = mondo({ tabelle: { push_iscrizioni: [iscr(I(1), U1, 'https://web.push.apple.com/u1a'), iscr(I(2), U1, 'https://web.push.apple.com/u1b'), ...tanti] } });
  const e = await runPromemoria(ENV, { nowTs: ORE10 });
  atteso('U1 (2 telefoni) passa, U7 (14) sforerebbe i 15 → rimandato', [MAX_AVVISI_GIRO, esitoDi(e, U1), esitoDi(e, U7), e.rimandati, m.push.length], [15, 'mandato a 2', 'rimandato: giro pieno', 1, 2]);
}

// 7. una lettura che fallisce ferma il giro senza eccezioni fuori (handlePromemoria scrive nei log)
{
  mondo({ rotte: ['meals'] });
  let uscita = 'ok';
  try { await handlePromemoria({ scheduledTime: ORE10, cron: '0 * * * *' }, ENV); } catch (e) { uscita = e.message; }
  atteso('handlePromemoria con meals guasta: nessuna eccezione', uscita, 'ok');
}

// 8. lo smistamento per cron: l'orario fa i promemoria, quelli del lunedì fanno Pirsi propone; e Pirsi propone
//    non parte in un giorno che non è lunedì nemmeno se qualcuno lo chiama alle 6
{
  const m = mondo();
  await giroPer({ cron: '0 * * * *', scheduledTime: ORE10 }, ENV, { waitUntil() {} });
  atteso('smista · «0 * * * *» → promemoria (2 push)', m.push.length, 2);
  const m2 = mondo();
  await giroPer({ cron: '0 5 * * 1', scheduledTime: ORE10 }, ENV, { waitUntil() {} });
  atteso('smista · «0 5 * * 1» alle 10 → non è il giro dei promemoria (0 push, 0 letture dei pasti)', [m2.push.length, m2.letture.filter((l) => /^meals/.test(l)).length], [0, 0]);
  const m3 = mondo();
  // martedì 3 novembre 2026, 05:00 UTC = le 6 di Roma: non è lunedì
  await handleScheduled({ cron: '0 5 * * 1', scheduledTime: Date.parse('2026-11-03T05:00:00Z') }, ENV, { waitUntil() {} });
  atteso('cintura · Pirsi propone alle 6 di martedì non legge niente', m3.letture.length, 0);
  const m4 = mondo();
  await handleScheduled({ cron: '0 5 * * 1', scheduledTime: Date.parse('2026-11-02T05:00:00Z') }, ENV, { waitUntil() {} });
  atteso('cintura · alle 6 di lunedì parte (legge i profili)', m4.letture.length > 0, true);
}

// 9. il testo dell'avviso che parte (quello che sw.js mostra)
{
  const m = mondo();
  await runPromemoria(ENV, { nowTs: ORE10 });
  atteso('Topic = pasto, TTL 4 ore', [m.push[0].headers.Topic, m.push[0].headers.TTL], ['pasto', '14400']);
}

console.log(ko ? `\n${ko} controlli KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
