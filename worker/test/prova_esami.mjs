// Prova di /esami-report senza rete (Body 160): fetch finto per Supabase e Gemini.
// Il coach legge il referto delle analisi: token, file ammessi (PDF di più pagine compreso), limite al
// minuto, righe pulite dal vocabolario (chiave dal nome, chiave inventata che cade, valori non numerici
// via, doppioni via, fascia del referto tenuta), data del prelievo, referto non riconosciuto, JSON rotto
// con un solo nuovo tentativo, Gemini in errore, nessun byte del file nei log, niente scritture.
//   node worker/test/prova_esami.mjs
import { handleEsami, ESAMI_MODEL, validate } from '../src/esami.js';
import { _azzeraPorta } from '../src/porta.js';
import ZTEsami from '../../shared/esami.js';

const U = '11111111-1111-4111-8111-111111111111';
const ALTRO = '22222222-2222-4222-8222-222222222222';
const CORS = { 'Access-Control-Allow-Origin': '*' };
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(60), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
// Un referto come lo risponde il modello: nomi del laboratorio, unità come stampate, fasce stampate
const REFERTO = {
  riconosciuto: true, data_prelievo: '2026-10-12',
  esami: [
    { nome: 'Emoglobina (Hb)', chiave: 'emoglobina', valore: 15.1, unita: 'g/dL', rif_min: 13.5, rif_max: 17.5 },
    { nome: 'Ferritina', chiave: null, valore: 28, unita: 'ng/mL', rif_min: 30, rif_max: 400 },
    { nome: 'Colesterolo HDL', chiave: 'colesterolo_tot', valore: 58, unita: 'mg/dL', rif_min: 40, rif_max: null },   // chiave sbagliata dal modello: vince il nome
    { nome: 'Colesterolo totale', chiave: null, valore: 189, unita: 'mg/dl', rif_min: null, rif_max: 200 },
    { nome: 'Glucosio', chiave: 'glicemia', valore: 92, unita: 'mg/dL', rif_min: 70, rif_max: 99 },
    { nome: 'MCV', chiave: 'inventata', valore: 88, unita: 'fL', rif_min: 80, rif_max: 99 },                            // non nel vocabolario: resta col suo nome
    { nome: 'Glicemia', chiave: null, valore: 93, unita: 'mg/dL', rif_min: null, rif_max: null },                     // doppione della glicemia: via
    { nome: 'Sangue occulto', chiave: null, valore: 'negativo', unita: '', rif_min: null, rif_max: null },            // non numerico: via
  ],
  note: '',
};
const FILE = 'QUJD'.repeat(40);

function scenario(opt) {
  _azzeraPorta();
  const o = { risposteGemini: [JSON.stringify(REFERTO)], geminiStatus: 200, scritture: [], ...opt };
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
      return res({ candidates: [{ content: { parts: [{ text: testo }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 2400, candidatesTokenCount: 600 } });
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
    const r = await handleEsami(new Request('https://w/esami-report', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, 'Content-Length': String(corpo.length), ...headers }, body: corpo }), { SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'gem', ...env }, CORS);
    return { status: r.status, json: await r.json(), log };
  } finally { console.log = orig; }
};
const richiesta = { user_id: U, mime: 'application/pdf', data: FILE };

// 1. il referto: una chiamata, le righe pulite, la data, niente scritture, niente byte nei log
let s = scenario();
let r = await chiama(richiesta);
const L = r.json.lettura;
atteso('referto · esito', [r.status, r.json.ok, L.riconosciuto, L.letti, L.data_prelievo], [200, true, true, 7, '2026-10-12']);
atteso('referto · chiavi: dal nome quando il modello sbaglia o tace; sconosciuta resta null; il doppione resta senza chiave', L.esami.map((e) => e.chiave), ['emoglobina', 'ferritina', 'hdl', 'colesterolo_tot', 'glicemia', null, null]);
atteso('referto · nome, unità e fascia COME STAMPATI', L.esami[3], { nome: 'Colesterolo totale', chiave: 'colesterolo_tot', valore: 189, unita: 'mg/dl', rif_max: 200 });
atteso('referto · il doppione resta col suo nome e senza chiave, la riga non numerica via', [L.esami.find((e) => e.valore === 93).chiave, L.esami.some((e) => /occulto/i.test(e.nome))], [null, false]);
atteso('referto · meta', [L.meta.model, L.meta.prompt_version, L.meta.vocabolario_version, L.meta.mime], [ESAMI_MODEL, '2026-11-02', ZTEsami.VERSIONE, 'application/pdf']);
atteso('referto · una chiamata, il PDF dentro, nessun dato della persona', [s.chiamateGemini.length, s.chiamateGemini[0].contents[0].parts[1].inline_data.mime_type, /user_id|1111/.test(JSON.stringify(s.chiamateGemini[0]))], [1, 'application/pdf', false]);
atteso('referto · il prompt dice di non leggere nome e codice fiscale, e chiede tutte le pagine', [/codice fiscale/.test(s.chiamateGemini[0].system_instruction.parts[0].text), /più pagine/.test(s.chiamateGemini[0].system_instruction.parts[0].text)], [true, true]);
atteso('referto · il prompt ha il vocabolario (hdl, ferritina, hba1c)', ['"hdl"', '"ferritina"', '"hba1c"'].every((k) => s.chiamateGemini[0].system_instruction.parts[0].text.includes(k)), true);
atteso('referto · nessuna scrittura su Supabase', s.o.scritture, []);
atteso('log · solo metadati, nessun byte', r.log.every((l) => !l.includes(FILE.slice(0, 20)) && !/base64|inline_data/.test(l)), true);
atteso('referto · le colonne di blood_tests', ZTEsami.inColonne(L.esami), { hemoglobin: 15.1, ferritin: 28, glucose: 92, cholesterol_tot: 189, hdl: 58, triglycerides: null, creatinine: null, alt: null, vitamin_d: null, vitamin_b12: null, tsh: null });

// 2. foto ammessa; altri file no
s = scenario();
r = await chiama({ ...richiesta, mime: 'image/jpeg' });
atteso('foto · ammessa', [r.status, s.chiamateGemini[0].contents[0].parts[1].inline_data.mime_type], [200, 'image/jpeg']);
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
r = await chiama(richiesta, 'buono', { GEMINI_API_KEY: '' });
atteso('Worker senza chiave Gemini · 500 config', [r.status, r.json.error.kind], [500, 'config']);

// 4. limite al minuto: la quarta richiesta aspetta
s = scenario();
const esiti = [];
for (let i = 0; i < 4; i++) esiti.push((await chiama(richiesta)).status);
atteso('limite · tre al minuto, la quarta 429', esiti, [200, 200, 200, 429]);

// 5. data in altri formati, data assente, referto non riconosciuto
s = scenario({ risposteGemini: [JSON.stringify({ ...REFERTO, data_prelievo: '12/10/2026' })] });
r = await chiama(richiesta);
atteso('data · «12/10/2026» → 2026-10-12', r.json.lettura.data_prelievo, '2026-10-12');
s = scenario({ risposteGemini: [JSON.stringify({ ...REFERTO, data_prelievo: null })] });
r = await chiama(richiesta);
atteso('data assente · null, le righe restano', [r.json.lettura.data_prelievo, r.json.lettura.letti], [null, 7]);
s = scenario({ risposteGemini: [JSON.stringify({ riconosciuto: false, data_prelievo: null, esami: [], note: 'Non è un referto' })] });
r = await chiama(richiesta);
atteso('non riconosciuto · 200, vuoto, nota', [r.status, r.json.lettura.riconosciuto, r.json.lettura.letti, r.json.lettura.note], [200, false, 0, 'Non è un referto']);
s = scenario({ risposteGemini: [JSON.stringify({ riconosciuto: true, data_prelievo: '2026-10-12', esami: [], note: '' })] });
r = await chiama(richiesta);
atteso('riconosciuto senza righe · è una risposta sbagliata: 502 dopo due tentativi', [r.status, r.json.error.kind, s.chiamateGemini.length], [502, 'invalid-json', 2]);

// 6. JSON rotto: un solo nuovo tentativo, poi 502; Gemini in errore
s = scenario({ risposteGemini: ['{ rotto', JSON.stringify(REFERTO)] });
r = await chiama(richiesta);
atteso('json rotto · secondo tentativo buono', [r.status, s.chiamateGemini.length], [200, 2]);
s = scenario({ risposteGemini: ['{"riconosciuto":true,"data_prelievo":"2026-10-12","esami":[{"nome":"Ferritina","chiave":"ferritina","valore":28,"unita":"ng/mL","rif_min":30,"rif_max":4', JSON.stringify(REFERTO)] });
r = await chiama(richiesta);
atteso('risposta tagliata (tetto dei token) · è «non JSON», secondo tentativo buono', [r.status, s.chiamateGemini.length, s.chiamateGemini[0].generationConfig.maxOutputTokens], [200, 2, 8192]);
s = scenario({ geminiStatus: 429 });
r = await chiama(richiesta);
atteso('gemini 429 · resta 429', [r.status, r.json.error.kind, r.json.error.source], [429, 'rate-limit', 'gemini']);
s = scenario({ geminiStatus: 500 });
r = await chiama(richiesta);
atteso('gemini 500 · 502', [r.status, r.json.error.kind], [502, 'gemini']);
atteso('validate · testo vuoto e JSON con ```', [validate('').ok, validate('```json\n' + JSON.stringify(REFERTO) + '\n```').ok], [false, true]);

console.log(ko ? `\n${ko} controlli KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
