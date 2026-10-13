// Prova di /fitdays-report senza rete (Body 150): fetch finto per Supabase e Gemini.
// Il coach legge il report Fitdays: token, file ammessi, limite al minuto, numeri fuori
// scala che diventano null, report non riconosciuto, JSON rotto con un solo nuovo tentativo,
// Gemini in errore, nessun byte del file nei log, niente scritture sul database.
//   node worker/test/prova_fitdays.mjs
import { handleFitdays, FITDAYS_MODEL, validate } from '../src/fitdays.js';
import { _azzeraPorta } from '../src/porta.js';
import ZTFitdays from '../../shared/fitdays.js';

const U = '11111111-1111-4111-8111-111111111111';
const ALTRO = '22222222-2222-4222-8222-222222222222';
const CORS = { 'Access-Control-Allow-Origin': '*' };
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(56), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
// Il report vero del 13 ottobre 2026, come lo risponde il modello
const REPORT = {
  riconosciuto: true, data_ora_testo: '05:46 13/10/2026',
  peso_kg: 70.95, bmi: 24.0, grasso_pct: 14.0, massa_grassa_kg: 9.9, massa_magra_kg: 61.0, frequenza_cardiaca_bpm: 92, indice_cuore: 3.6,
  massa_muscolare_kg: 57.0, muscolo_pct: 80.4, muscolo_scheletrico_pct: 41.7, massa_ossea_kg: 4.0, proteine_kg: 17.7, proteine_pct: 25.0,
  acqua_kg: 39.3, acqua_pct: 55.4, grasso_sottocutaneo_pct: 10.0, grasso_viscerale: 6.0, bmr_kcal: 1501, eta_corporea: 52, peso_standard_kg: 65.1,
  livello_obesita: 'Standard', tipo_corpo: 'Muscolo', note: '',
};
const FILE = 'QUJD'.repeat(40);   // base64 finto, 160 caratteri

function scenario(opt) {
  _azzeraPorta();
  const o = { risposteGemini: [JSON.stringify(REPORT)], geminiStatus: 200, scritture: [], ...opt };
  const chiamateGemini = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const res = (body, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (u.includes('/auth/v1/user')) return init.headers.Authorization === 'Bearer buono' ? res({ id: U }) : res({ msg: 'bad jwt' }, 401);
    if (u.includes('generativelanguage.googleapis.com')) {
      const body = JSON.parse(init.body);
      chiamateGemini.push(body);
      if (o.geminiStatus !== 200) return res({ error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } }, o.geminiStatus);
      const testo = o.risposteGemini[Math.min(chiamateGemini.length - 1, o.risposteGemini.length - 1)];
      return res({ candidates: [{ content: { parts: [{ text: testo }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 150 } });
    }
    if (u.includes('/rest/v1/') || u.includes('/storage/v1/')) { o.scritture.push(u); return res([], 201); }
    throw new Error('fetch non previsto: ' + u);
  };
  return { o, chiamateGemini };
}
const chiama = async (body, token = 'buono', env = {}, headers = {}) => {
  const log = [];
  const orig = console.log;
  console.log = (...a) => log.push(a.join(' '));
  try {
    const corpo = typeof body === 'string' ? body : JSON.stringify(body);
    const r = await handleFitdays(new Request('https://w/fitdays-report', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, 'Content-Length': String(corpo.length), ...headers }, body: corpo }), { SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'gem', ...env }, CORS);
    return { status: r.status, json: await r.json(), log };
  } finally { console.log = orig; }
};
const richiesta = { user_id: U, mime: 'image/jpeg', data: FILE };

// 1. il report vero: una chiamata, 22 valori, la data, niente scritture, niente byte nei log
let s = scenario();
let r = await chiama(richiesta);
atteso('report · esito', [r.status, r.json.ok, r.json.lettura.riconosciuto, r.json.lettura.letti], [200, true, true, 22]);
atteso('report · data e valori', [r.json.lettura.data_report, r.json.lettura.valori.peso_kg, r.json.lettura.valori.massa_magra_kg, r.json.lettura.valori.tipo_corpo], ['2026-10-13', 70.95, 61, 'Muscolo']);
atteso('report · meta', [r.json.lettura.meta.model, r.json.lettura.meta.prompt_version, r.json.lettura.meta.mime, r.json.lettura.meta.usage.prompt_tokens], [FITDAYS_MODEL, '2026-10-13', 'image/jpeg', 900]);
atteso('report · una chiamata, il file dentro, nessun dato della persona', [s.chiamateGemini.length, s.chiamateGemini[0].contents[0].parts[1].inline_data.mime_type, /IgnaF|user_id|1111/.test(JSON.stringify(s.chiamateGemini[0]))], [1, 'image/jpeg', false]);
atteso('report · il prompt chiede di non leggere il nome', /nickname/.test(s.chiamateGemini[0].system_instruction.parts[0].text), true);
atteso('report · nessuna scrittura su Supabase', s.o.scritture, []);
atteso('log · solo metadati, nessun byte', r.log.every(l => !l.includes(FILE.slice(0, 20)) && !/base64|inline_data/.test(l)), true);
atteso('report · le caselle di Body', ZTFitdays.inCaselle(r.json.lettura.valori), { weight_kg: 70.95, bf_pct: 14, muscle_kg: 57, visceral_fat: 6, body_age: 52 });

// 2. PDF ammesso; altri file no
s = scenario();
r = await chiama({ ...richiesta, mime: 'application/pdf' });
atteso('pdf · ammesso', [r.status, s.chiamateGemini[0].contents[0].parts[1].inline_data.mime_type], [200, 'application/pdf']);
s = scenario();
r = await chiama({ ...richiesta, mime: 'text/plain' });
atteso('testo · rifiutato prima del modello', [r.status, r.json.error.kind, s.chiamateGemini.length], [415, 'bad-file', 0]);
r = await chiama({ ...richiesta, data: 'non base64!!' });
atteso('file non base64 · rifiutato', [r.status, r.json.error.kind], [400, 'bad-file']);
r = await chiama(richiesta, 'buono', {}, { 'Content-Length': '9000000' });
atteso('file troppo grande · 413', [r.status, r.json.error.kind], [413, 'too-large']);

// 3. chi chiama
s = scenario();
r = await chiama(richiesta, 'cattivo');
atteso('token non valido · 401', [r.status, r.json.error.kind], [401, 'auth']);
r = await chiama({ ...richiesta, user_id: ALTRO });
atteso('token di un altro · 403', [r.status, r.json.error.kind], [403, 'forbidden']);
r = await chiama({ ...richiesta, user_id: 'x' });
atteso('user_id non UUID · 400', r.status, 400);
atteso('niente modello nei casi rifiutati', s.chiamateGemini.length, 0);

// 4. limite al minuto: la quarta richiesta aspetta
s = scenario();
const esiti = [];
for (let i = 0; i < 4; i++) esiti.push((await chiama(richiesta)).status);
atteso('limite · tre al minuto, la quarta 429', esiti, [200, 200, 200, 429]);

// 5. numeri fuori scala → null; report non riconosciuto → tutto null
s = scenario({ risposteGemini: [JSON.stringify({ ...REPORT, peso_kg: 7095, grasso_pct: -3, bmr_kcal: '1501 kcal', livello_obesita: '   ' })] });
r = await chiama(richiesta);
atteso('fuori scala · null, il resto resta', [r.json.lettura.valori.peso_kg, r.json.lettura.valori.grasso_pct, r.json.lettura.valori.bmr_kcal, r.json.lettura.valori.livello_obesita, r.json.lettura.letti], [null, null, 1501, null, 19]);
s = scenario({ risposteGemini: [JSON.stringify({ riconosciuto: false, data_ora_testo: null, note: 'Non è un report Fitdays' })] });
r = await chiama(richiesta);
atteso('non riconosciuto · 200, valori vuoti, nota', [r.status, r.json.lettura.riconosciuto, r.json.lettura.letti, r.json.lettura.data_report, r.json.lettura.note], [200, false, 0, null, 'Non è un report Fitdays']);

// 6. JSON rotto: un solo nuovo tentativo, poi 502
s = scenario({ risposteGemini: ['{ rotto', JSON.stringify(REPORT)] });
r = await chiama(richiesta);
atteso('json rotto · secondo tentativo buono', [r.status, s.chiamateGemini.length], [200, 2]);
s = scenario({ risposteGemini: ['{ rotto'] });
r = await chiama(richiesta);
atteso('json rotto due volte · 502', [r.status, r.json.error.kind, s.chiamateGemini.length], [502, 'invalid-json', 2]);
s = scenario({ geminiStatus: 429 });
r = await chiama(richiesta);
atteso('gemini 429 · resta 429', [r.status, r.json.error.kind, r.json.error.source], [429, 'rate-limit', 'gemini']);
s = scenario({ geminiStatus: 500 });
r = await chiama(richiesta);
atteso('gemini 500 · 502 col codice vero', [r.status, /Gemini 500/.test(r.json.error.message)], [502, true]);

// 7. la regola pura di validazione
atteso('validate · riconosciuto senza numeri non vale', validate(JSON.stringify({ riconosciuto: true, note: '' })).ok, false);
atteso('validate · vocabolario condiviso: 22 campi, 5 caselle', [ZTFitdays.CAMPI.length, Object.keys(ZTFitdays.CASELLE).length], [22, 5]);
atteso('dataReport · formati', [ZTFitdays.dataReport('05:46 13/10/2026'), ZTFitdays.dataReport('2026-10-13'), ZTFitdays.dataReport('boh')], ['2026-10-13', '2026-10-13', null]);

console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
process.exit(ko ? 1 : 0);
