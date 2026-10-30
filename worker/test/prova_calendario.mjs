// GET /calendario senza rete (Training 540): fetch finto per il REST di Supabase. Gira in UTC come Cloudflare.
//   TZ=UTC node worker/test/prova_calendario.mjs
// Copre: il calendario di una persona con giorni e ora (16 sedute in 4 settimane, solo di lavoro, 07:30 di Roma in UTC,
// avviso, UID stabile), senza giorni o ora (calendario vuoto ma valido), token sconosciuto (404), malformato (400),
// metodo sbagliato (405), la pausa, nessuna scrittura, le letture solo per token e per persona, REST rotto (502 senza
// dettagli), chiave assente (500), il limite per indirizzo, nei log solo l'id abbreviato e il conto.
import worker from '../src/index.js';
import { _azzeraPorta } from '../src/porta.js';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ko && !ok) {} if (!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const U1 = '11111111-aaaa-4aaa-8aaa-111111111111', U2 = '22222222-bbbb-4bbb-8bbb-222222222222';
const T1 = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', T2 = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', TX = 'cccccccc-3333-4333-8333-cccccccccccc';
const ENV = { SUPABASE_SERVICE_ROLE_KEY: 'svc-segreta', API_KEY: 'groq', GEMINI_API_KEY: 'gem' };
// mercoledì 28 ottobre 2026, le 11 a Roma
const ADESSO = Date.parse('2026-10-28T10:00:00Z');
const veroNow = Date.now; Date.now = () => ADESSO;
const w = (date, s, ora) => ({ user_id: U1, date, session_type: s, completed: true, created_at: `${date}T${ora || '07:00:00'}+00:00` });
const VERE = [['2026-10-05','upperA'], ['2026-10-07','lowerA'], ['2026-10-08','recoveryUpper'], ['2026-10-09','upperB'], ['2026-10-10','lowerB'],
  ['2026-10-12','upperA'], ['2026-10-13','lowerA'], ['2026-10-20','upperA'], ['2026-10-22','lowerA'], ['2026-10-23','upperB'], ['2026-10-25','rest'],
  ['2026-10-26','upperA'], ['2026-10-27','lowerA']].map(([d, s]) => w(d, s));
const SCHEDA = { sessioni: [['upperA', 'Upper A'], ['lowerA', 'Lower A'], ['upperB', 'Upper B'], ['lowerB', 'Lower B']].map(([id, name]) => ({ id, name, type: 'Forza', exercises: [] })) };

let letture = [], scritture = [], log = [];
function mondo(o = {}) {
  _azzeraPorta(); letture = []; scritture = []; log = [];
  const t = {
    profiles: [
      { id: U1, calendario_token: T1, train_orario: '07:30', train_giorni: [1, 2, 4, 5], train_start_date: '2026-10-05', pausa_inizio: null, pausa_fine: null, pausa_moduli: null, ...(o.p1 || {}) },
      { id: U2, calendario_token: T2, train_orario: null, train_giorni: null, train_start_date: '2026-10-05' },
    ],
    schede_utente: [ { user_id: U1, attiva: true, created_at: '2026-10-05T10:00:00Z', scheda: SCHEDA } ],
    workouts: o.workouts || VERE,
    ...o.tabelle,
  };
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const table = u.pathname.split('/').pop();
    const method = init.method || 'GET';
    const res = (body, status = 200) => new Response(body == null ? '' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (!u.pathname.includes('/rest/v1/')) throw new Error('fetch non previsto: ' + u);
    if (method !== 'GET') { scritture.push({ method, table }); return res(null); }
    letture.push({ table, query: u.search, apikey: init.headers && init.headers.apikey });
    if (o.rotto === table) return res({ message: 'relation is on fire' }, 500);
    const filtri = [...u.searchParams.entries()].filter(([k]) => !['select', 'order', 'limit', 'offset'].includes(k));
    const passa = (r) => filtri.every(([col, v]) => {
      if (v.startsWith('eq.')) return String(r[col]) === v.slice(3);
      if (v.startsWith('gte.')) return r[col] >= v.slice(4);
      if (v.startsWith('not.in.')) return !v.slice(8, -1).split(',').includes(String(r[col]));
      return true;
    });
    let rows = (t[table] || []).filter(passa);
    const order = u.searchParams.get('order');
    if (order) {
      const chiavi = order.split(',').map((c) => c.split('.'));
      rows = [...rows].sort((a, b) => { for (const [col, dir] of chiavi) { if (a[col] === b[col]) continue; return (a[col] > b[col] ? 1 : -1) * (dir === 'desc' ? -1 : 1); } return 0; });
    }
    const lim = Number(u.searchParams.get('limit') || 1000);
    return res(rows.slice(0, lim));
  };
  return t;
}
const chiama = async (path, { method = 'GET', origin = null, ip = '1.2.3.4', env = ENV } = {}) => {
  const headers = {}; if (origin) headers.Origin = origin; if (ip) headers['cf-connecting-ip'] = ip;
  const origLog = console.log, origWarn = console.warn; console.log = (...a) => log.push(a.join(' ')); console.warn = (...a) => log.push(a.join(' '));
  try {
    const r = await worker.fetch(new Request('https://w' + path, { method, headers }), env);
    return { status: r.status, tipo: r.headers.get('Content-Type'), cache: r.headers.get('Cache-Control'), testo: await r.text() };
  } finally { console.log = origLog; console.warn = origWarn; }
};
const spiega = (t) => t.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean);
const eventi = (t) => t.split('BEGIN:VEVENT').slice(1);

// 1 · il calendario di Ignazio
mondo();
let r = await chiama('/calendario?t=' + T1);
let piatte = spiega(r.testo);
atteso('calendario · 200, text/calendar, senza cache lunga', [r.status, r.tipo, r.cache], [200, 'text/calendar; charset=utf-8', 'private, max-age=0, must-revalidate']);
atteso('calendario · 16 sedute nelle 4 settimane, tutte di lavoro, nessun recupero', [eventi(r.testo).length, piatte.filter((x) => x.startsWith('SUMMARY')).every((x) => /^SUMMARY:\[Workout\] (Upper|Lower) [AB]$/.test(x))], [16, true]);
atteso('calendario · la prima è giovedì 29 Upper B alle 07:30 di Roma (06:30 UTC), un\'ora, avviso 15 minuti prima', [piatte.find((x) => x.startsWith('DTSTART')), piatte.find((x) => x.startsWith('DTEND')), piatte.find((x) => x.startsWith('SUMMARY')), piatte.includes('TRIGGER:-PT15M')], ['DTSTART:20261029T063000Z', 'DTEND:20261029T073000Z', 'SUMMARY:[Workout] Upper B', true]);
atteso('calendario · poi Lower B venerdì, Upper A lunedì 2, Lower A martedì 3', piatte.filter((x) => x.startsWith('SUMMARY')).slice(1, 4).map((x) => x.replace('SUMMARY:[Workout] ', '')), ['Lower B', 'Upper A', 'Lower A']);
atteso('calendario · il nome del calendario e il fuso', [piatte.includes('X-WR-CALNAME:Zona Tracker'), piatte.includes('X-WR-TIMEZONE:Europe/Rome')], [true, true]);
atteso('letture · profilo per token, poi scheda attiva e ultimi 10 allenamenti della persona, con la chiave di servizio', letture.map((l) => l.table), ['profiles', 'schede_utente', 'workouts']);
atteso('letture · il profilo si cerca per token, gli allenamenti senza i riposi, dall\'inizio del blocco, i più recenti prima', [letture[0].query.includes('calendario_token=eq.' + T1), letture[2].query.includes('session_type=not.in.(rest,rest_injury)'), letture[2].query.includes('date=gte.2026-10-05'), letture[2].query.includes('order=date.desc,created_at.desc'), letture.every((l) => l.apikey === 'svc-segreta')], [true, true, true, true, true]);
atteso('scritture · nessuna', scritture, []);
atteso('log · solo l\'id abbreviato e il conto', log, ['[calendario] 11111111: 16 sedute']);
const uidPrima = piatte.find((x) => x.startsWith('UID'));
r = await chiama('/calendario?t=' + T1);
atteso('calendario · due letture, lo stesso UID per lo stesso giorno', spiega(r.testo).find((x) => x.startsWith('UID')) === uidPrima, true);

// 2 · dal sito dell'app o da un altro sito
mondo();
atteso('origine · dall\'app va bene; da un altro sito no', [(await chiama('/calendario?t=' + T1, { origin: 'https://ignaziof321621.github.io' })).status, (await chiama('/calendario?t=' + T1, { origin: 'https://altro.example' })).status], [200, 403]);

// 3 · chi non ha ancora scelto giorni e ora, token sconosciuto, malformato, metodo
mondo();
r = await chiama('/calendario?t=' + T2);
atteso('senza giorni e ora · calendario valido e vuoto, nessuna lettura in più', [r.status, r.testo.includes('END:VCALENDAR'), eventi(r.testo).length, letture.map((l) => l.table)], [200, true, 0, ['profiles']]);
atteso('token sconosciuto · 404 senza dettagli', [(await chiama('/calendario?t=' + TX)).status, (await chiama('/calendario?t=' + TX)).testo], [404, 'Calendario non trovato']);
mondo();
const malformati = [(await chiama('/calendario?t=abc')).status, (await chiama('/calendario')).status, (await chiama("/calendario?t=' or 1=1")).status];
atteso('token malformato o assente · 400, e Supabase non si chiama', [...malformati, letture.length], [400, 400, 400, 0]);
atteso('metodo · solo GET', (await chiama('/calendario?t=' + T1, { method: 'POST' })).status, 405);

// 4 · la pausa, e una seduta in più fuori programma
mondo({ p1: { pausa_inizio: '2026-11-02', pausa_fine: '2026-11-06', pausa_moduli: ['allenamento'] } });
r = await chiama('/calendario?t=' + T1);
atteso('pausa · i giorni in pausa restano vuoti e si riprende da dove si era (12 sedute)', [eventi(r.testo).length, spiega(r.testo).filter((x) => x.startsWith('DTSTART')).slice(1, 3)], [12, ['DTSTART:20261030T063000Z', 'DTSTART:20261109T063000Z']]);
mondo({ workouts: [...VERE, w('2026-10-28', 'upperB', '08:00:00')] });
r = await chiama('/calendario?t=' + T1);
atteso('fuori programma · Upper B fatta oggi (mercoledì, non scelto): giovedì viene Lower B', spiega(r.testo).find((x) => x.startsWith('SUMMARY')), 'SUMMARY:[Workout] Lower B');

// 5 · guasti: REST rotto, chiave assente
mondo({ rotto: 'workouts' });
r = await chiama('/calendario?t=' + T1);
atteso('REST rotto · 502 «riprova», niente dettagli interni, l\'avviso nei log', [r.status, r.testo, /relation is on fire/.test(r.testo), log.some((x) => x.startsWith('[calendario] lettura fallita'))], [502, 'Riprova più tardi', false, true]);
mondo();
atteso('senza chiave di servizio · 500 e nessuna lettura', [(await chiama('/calendario?t=' + T1, { env: { } })).status, letture.length], [500, 0]);

// 6 · il limite per indirizzo
mondo();
let ultimo = 0;
for (let i = 0; i < 21; i++) ultimo = (await chiama('/calendario?t=' + T1, { ip: '9.9.9.9' })).status;
atteso('limite · la 21ª richiesta dallo stesso indirizzo in un minuto è 429; un altro indirizzo entra', [ultimo, (await chiama('/calendario?t=' + T1, { ip: '8.8.8.8' })).status], [429, 200]);

Date.now = veroNow;
console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
process.exit(ko ? 1 : 0);
