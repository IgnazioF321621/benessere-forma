// GET /calendario senza rete (Training 540): fetch finto per il REST di Supabase. Gira in UTC come Cloudflare.
//   TZ=UTC node worker/test/prova_calendario.mjs
// Copre: il calendario di una persona con giorni e ora (16 sedute in 4 settimane, solo di lavoro, 07:30 di Roma in UTC,
// avviso, UID stabile), senza giorni o ora (calendario vuoto ma valido), token sconosciuto (404), malformato (400),
// metodo sbagliato (405), la pausa, nessuna scrittura, le letture solo per token e per persona, REST rotto (502 senza
// dettagli), chiave assente (500), il limite per indirizzo, nei log solo l'id abbreviato e il conto.
// Training 541: la seduta intera nell'evento (esercizi, per lato dal catalogo, durata stimata, Tabata del giorno,
// indirizzo che apre Training), la settimana di scarico proiettata sulle sedute previste e quella anticipata da
// Pirsi, la descrizione tagliata a 1 KB, la seduta senza esercizi che resta di un'ora.
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
      if (v.startsWith('in.')) return v.slice(4, -1).split(',').includes(String(r[col]));
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
atteso('letture · profilo per token, poi scheda attiva, ultimi 10 allenamenti, completati e scarichi della persona', letture.map((l) => l.table), ['profiles', 'schede_utente', 'workouts', 'workouts', 'coach_proposals']);
atteso('letture · i completati dall\'inizio del blocco in ordine di data; gli scarichi accettati della persona', [letture[3].query.includes('completed=eq.true'), letture[3].query.includes('date=gte.2026-10-05'), letture[3].query.includes('order=date.asc'), letture[4].query.includes('user_id=eq.' + U1), letture[4].query.includes('kind=eq.deload'), letture[4].query.includes('status=eq.accepted')], [true, true, true, true, true, true]);
atteso('seduta senza esercizi nella scheda · resta di un\'ora, l\'indirizzo di Training c\'è', [piatte.find((x) => x.startsWith('DTEND')), piatte.includes('URL:https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?apri=training')], ['DTEND:20261029T073000Z', true]);
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
// Training 360: più pause nell'elenco profiles.pause (una malattia e un viaggio), e il profilo si legge con pause
mondo({ p1: { pause: [{ id: 'm', inizio: '2026-11-02', fine: '2026-11-03', motivo: 'malattia', moduli: ['allenamento'] }, { id: 'v', inizio: '2026-11-04', fine: '2026-11-06', motivo: 'viaggio', moduli: null }] } });
r = await chiama('/calendario?t=' + T1);
atteso('pausa · due periodi nell\'elenco: gli stessi giorni vuoti (12 sedute), il profilo letto con pause', [eventi(r.testo).length, spiega(r.testo).filter((x) => x.startsWith('DTSTART')).slice(1, 3), letture[0].query.includes('pause')], [12, ['DTSTART:20261030T063000Z', 'DTSTART:20261109T063000Z'], true]);
mondo({ p1: { pause: [], pausa_inizio: '2026-11-02', pausa_fine: '2026-11-06', pausa_moduli: ['allenamento'] } });
r = await chiama('/calendario?t=' + T1);
atteso('pausa · pause = [] vince sui campi di prima: nessun giorno vuoto (16 sedute)', eventi(r.testo).length, 16);
mondo({ workouts: [...VERE, w('2026-10-28', 'upperB', '08:00:00')] });
r = await chiama('/calendario?t=' + T1);
atteso('fuori programma · Upper B fatta oggi (mercoledì, non scelto): giovedì viene Lower B', spiega(r.testo).find((x) => x.startsWith('SUMMARY')), 'SUMMARY:[Workout] Lower B');

// 5 · guasti: REST rotto, chiave assente
mondo({ rotto: 'workouts' });
r = await chiama('/calendario?t=' + T1);
atteso('REST rotto · 502 «riprova», niente dettagli interni, l\'avviso nei log', [r.status, r.testo, /relation is on fire/.test(r.testo), log.some((x) => x.startsWith('[calendario] lettura fallita'))], [502, 'Riprova più tardi', false, true]);
mondo();
atteso('senza chiave di servizio · 500 e nessuna lettura', [(await chiama('/calendario?t=' + T1, { env: { } })).status, letture.length], [500, 0]);

// 7 · Training 541: la seduta intera nell'evento
// La Upper B come quella di Ignazio (nomi e prescrizioni dalla scheda attiva del 1 novembre 2026, senza i testi):
// tre voci di riscaldamento, quattro multiarticolari, un isolamento per lato, una tenuta per lato, un alternato.
const ES = (codice, name, sets, reps, rest_sec, extra) => ({ codice, name, sets, reps, rest_sec, ...(extra || {}) });
const UPPER_B = { id: 'upperB', name: 'Upper B', type: 'Ipertrofia', rir: 1, rest: '90 sec',
  warmup: [ES('EX101', 'Extrarotazione cavo', 2, '15-20'), ES('EX416', 'Intrarotazione cavo', 2, '15-20'), ES('EX776', 'Hip switches 90:90', 2, '15-20')],
  exercises: [
    ES('EX076', 'Rematore manubri panca piana', 3, '8-12', 90), ES('EX502', 'Trazioni sbarra presa inversa', 3, '8-12', 90),
    ES('EX311', 'Dip panca piedi rialzati', 3, '8-12', 90), ES('EX690', 'Piegamenti presa stretta ginocchia a terra', 3, '8-12', 90),
    ES('EX704', 'Alzate diagonali un braccio elastico gomito 90 gradi', 3, '12-15', 75, { iso: true }),
    ES('EX034', 'Plank laterale avambraccio', 3, '20-40 sec', 60, { iso: true, isTimed: true, durationBased: true }),
    ES('EX041', 'Crunch bicicletta', 3, '12-15', 75, { iso: true }),
  ],
  finisher: { type: 'tabata', round: 8, work_sec: 20, rest_sec: 10, exercises: [{ name: 'Camminata bear crawl' }, { name: 'Burpee' }] },
};
// le altre tre sedute: due multiarticolari e lo stesso Tabata (300 + 2 × 330 = 960 s → circa 15 minuti)
const CORTA = (s) => ({ ...s, exercises: [ES('EX076', 'Rematore manubri panca piana', 3, '8-12', 90), ES('EX502', 'Trazioni sbarra presa inversa', 3, '8-12', 90)], finisher: UPPER_B.finisher });
const SCHEDA_PIENA = { sessioni: SCHEDA.sessioni.map((s) => (s.id === 'upperB' ? UPPER_B : CORTA(s))) };
const CATALOGO = [{ codice: 'EX704', unilaterale: 'si' }, { codice: 'EX034', unilaterale: 'si' }, { codice: 'EX041', unilaterale: 'alternato' }, { codice: 'EX076', unilaterale: 'no' }];
const conScheda = (o = {}) => mondo({ ...o, tabelle: { schede_utente: [{ user_id: U1, attiva: true, created_at: '2026-10-05T10:00:00Z', scheda: SCHEDA_PIENA }], esercizi_catalog: CATALOGO, ...(o.tabelle || {}) } });
const testoIcs = (s) => s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
const evento = (testo, i) => spiega('BEGIN:VEVENT' + eventi(testo)[i]);
const descr = (righe) => testoIcs((righe.find((x) => x.startsWith('DESCRIPTION:')) || '').slice(12));

conScheda();
r = await chiama('/calendario?t=' + T1);
let ev = evento(r.testo, 0);
// 300 attivazione + 200 riscaldamento (3 × 60 + 2 × 10) + 4 × 330 (3 × 30 + 2 × 90 + 60) + 390 (per lato: 3 × 60 + 2 × 75 + 60)
// + 420 (tenuta per lato: 3 × 80 + 2 × 60 + 60) + 390 (alternato a ripetizioni: per lato) = 3020 s → circa 50 minuti
atteso('541 · giovedì 29 Upper B dura 50 minuti (la stima della seduta), non 60', [ev.find((x) => x.startsWith('DTSTART')), ev.find((x) => x.startsWith('DTEND')), ev.find((x) => x.startsWith('SUMMARY'))], ['DTSTART:20261029T063000Z', 'DTEND:20261029T072000Z', 'SUMMARY:[Workout] Upper B']);
atteso('541 · la descrizione: durata, preparazione, gli esercizi con serie × ripetizioni, per lato dal catalogo', descr(ev).split('\n'), [
  'Circa 50 minuti', 'Preparazione 5 min e riscaldamento (3 esercizi)',
  '1. Rematore manubri panca piana — 3 × 8-12', '2. Trazioni sbarra presa inversa — 3 × 8-12', '3. Dip panca piedi rialzati — 3 × 8-12',
  '4. Piegamenti presa stretta ginocchia a terra — 3 × 8-12', '5. Alzate diagonali un braccio elastico gomito 90 gradi — 3 × 12-15 per lato',
  '6. Plank laterale avambraccio — 3 × 20-40 sec per lato', '7. Crunch bicicletta — 3 × 12-15 per lato']);
atteso('541 · l\'indirizzo che apre l\'app su Training, l\'avviso 15 minuti prima come prima', [ev.includes('URL:https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?apri=training'), ev.includes('TRIGGER:-PT15M'), ev.some((x) => x === 'DESCRIPTION:[Workout] Upper B fra 15 minuti')], [true, true, true]);
atteso('541 · il catalogo si legge una volta, per i codici delle sedute nel calendario', [letture.filter((l) => l.table === 'esercizi_catalog').length, decodeURIComponent((letture.find((l) => l.table === 'esercizi_catalog') || {}).query || '').includes('codice=in.(EX076,EX502,EX311,EX690,EX704,EX034,EX041)')], [1, true]);
atteso('541 · ogni seduta con la sua durata (Lower B venerdì: circa 15 minuti); nessun recupero; nessuna scrittura', [evento(r.testo, 1).find((x) => x.startsWith('SUMMARY')), evento(r.testo, 1).find((x) => x.startsWith('DTEND')), eventi(r.testo).length, scritture], ['SUMMARY:[Workout] Lower B', 'DTEND:20261030T064500Z', 16, []]);
atteso('541 · ogni riga piegata a 75 ottetti al massimo', r.testo.split('\r\n').every((x) => Buffer.byteLength(x, 'utf8') <= 75), true);

// la settimana di scarico: 11 sedute di lavoro fatte, 4 a giro → la 10ª prevista (venerdì 13) apre la sesta settimana
const sedi = (t) => eventi(t).map((_, i) => evento(t, i));
let tutte = sedi(r.testo);
const inScarico = (t) => sedi(t).map((e) => /Settimana di scarico/.test(descr(e)));
atteso('541 · scarico proiettato: le sedute previste dalla 10ª alla 13ª (13-19 novembre), poi si riparte', inScarico(r.testo).map((x, i) => x ? i : null).filter((x) => x != null), [9, 10, 11, 12]);
const ub = tutte.findIndex((e, i) => i >= 9 && i <= 12 && /Upper B/.test(e.find((x) => x.startsWith('SUMMARY'))));
atteso('541 · in scarico le ripetizioni al minimo dell\'intervallo, la riga dello scarico, la stessa durata', [ub >= 0, descr(tutte[ub]).split('\n').filter((x) => /^(Settimana|1\. |6\. |7\. )/.test(x))],
  [true, ['Settimana di scarico: carichi più leggeri, RIR 3+', '1. Rematore manubri panca piana — 3 × 8', '6. Plank laterale avambraccio — 3 × 20 sec per lato', '7. Crunch bicicletta — 3 × 12 per lato']]);

// lo scarico anticipato accettato da Pirsi mercoledì 28: le prime 4 sedute sono già di scarico
conScheda({ tabelle: { coach_proposals: [{ user_id: U1, kind: 'deload', status: 'accepted', applied_at: '2026-10-28T06:00:00Z' }] } });
r = await chiama('/calendario?t=' + T1);
atteso('541 · scarico anticipato da Pirsi: le sedute 1-4, poi la settimana 1', inScarico(r.testo).map((x, i) => x ? i : null).filter((x) => x != null), [0, 1, 2, 3]);
conScheda({ rotto: 'coach_proposals' });
atteso('541 · se gli scarichi non si leggono, 502 come le altre letture', (await chiama('/calendario?t=' + T1)).status, 502);

// il Tabata del giorno: tabata = giorni, il giovedì → la Upper B di giovedì ha il Tabata e 5 minuti in più
conScheda({ p1: { tabata: 'giorni', tabata_giorni: [4] } });
r = await chiama('/calendario?t=' + T1);
tutte = sedi(r.testo);
atteso('541 · Tabata il giovedì: la Upper B di giovedì 29 dura 55 minuti e lo dice in fondo', [tutte[0].find((x) => x.startsWith('DTEND')), descr(tutte[0]).split('\n').pop()], ['DTEND:20261029T072500Z', 'Tabata in coda: 8 round, 4 min']);
atteso('541 · Tabata il giovedì: la Lower B di venerdì resta senza, e resta di 15 minuti', [/Tabata/.test(descr(tutte[1])), tutte[1].find((x) => x.startsWith('DTEND'))], [false, 'DTEND:20261030T064500Z']);
conScheda({ p1: { tabata: 'a_parte' } });
r = await chiama('/calendario?t=' + T1);
atteso('541 · Tabata «a parte» o spento: in nessuna seduta', sedi(r.testo).some((e) => /Tabata/.test(descr(e))), false);

// una seduta lunga: la descrizione si ferma a circa 1 KB e finisce con «…»
const LUNGA = { ...UPPER_B, exercises: Array.from({ length: 30 }, (_, i) => ES('EX' + (800 + i), 'Esercizio dal nome molto lungo numero ' + (i + 1) + ' con elastico e panca inclinata', 3, '8-12', 90)) };
conScheda({ tabelle: { schede_utente: [{ user_id: U1, attiva: true, created_at: '2026-10-05T10:00:00Z', scheda: { sessioni: SCHEDA.sessioni.map((s) => (s.id === 'upperB' ? LUNGA : s)) } }] } });
r = await chiama('/calendario?t=' + T1);
ev = evento(r.testo, 0);
const grezza = ev.find((x) => x.startsWith('DESCRIPTION:')).slice(12);
atteso('541 · seduta lunga: la descrizione resta sotto 1 KB, tronca con «…» e tiene le prime righe', [Buffer.byteLength(grezza, 'utf8') <= 1000, descr(ev).split('\n').pop(), descr(ev).split('\n')[2].startsWith('1. Esercizio dal nome molto lungo numero 1 ')], [true, '…', true]);

// 6 · il limite per indirizzo
mondo();
let ultimo = 0;
for (let i = 0; i < 21; i++) ultimo = (await chiama('/calendario?t=' + T1, { ip: '9.9.9.9' })).status;
atteso('limite · la 21ª richiesta dallo stesso indirizzo in un minuto è 429; un altro indirizzo entra', [ultimo, (await chiama('/calendario?t=' + T1, { ip: '8.8.8.8' })).status], [429, 200]);

Date.now = veroNow;
console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
process.exit(ko ? 1 : 0);
