// Prova di /vision-check senza rete: fetch finto per Supabase, Storage e Gemini.
// Copre i casi che dal vivo non si possono provocare a comando: posa mancante,
// JSON non valido con un solo nuovo tentativo, errore pulito dopo il secondo,
// errore di Gemini, check non completato, e che nessun byte delle foto finisca nei log.
//   node worker/test/prova_vision_check.mjs
import { handleVisionCheck, VISION_MODEL } from '../src/vision-check.js';

const U = '11111111-1111-4111-8111-111111111111';
const ALTRO = '22222222-2222-4222-8222-222222222222';
const C_CUR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const C_PREV = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CORS = { 'Access-Control-Allow-Origin': '*' };
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(48), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const buono = { overall: 'migliorato', confidence: 'alta', areas: [{ zona: 'addome', change: 'più definito', note: 'x' }], photo_quality: { ok: true, issues: [] }, summary: 'Va bene.', suggested_focus: '' };

function scenario(opt) {
  const o = { risposteGemini: [JSON.stringify(buono)], checks: null, fotoMancanti: [], salvataggi: [], geminiStatus: 200, ...opt };
  const checks = o.checks || [
    { id: C_CUR, user_id: U, status: 'completed', created_at: '2026-08-02T05:38:24Z' },
    { id: C_PREV, user_id: U, status: 'completed', created_at: '2026-07-04T03:32:48Z' },
  ];
  const chiamateGemini = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const res = (body, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (u.includes('/auth/v1/user')) return init.headers.Authorization === 'Bearer buono' ? res({ id: U }) : res({ msg: 'bad jwt' }, 401);
    if (u.includes('/rest/v1/body_checks')) return res(checks);
    if (u.includes('/rest/v1/body_check_ai?select=')) return res([]);
    if (u.includes('/rest/v1/body_check_photos')) {
      const righe = [];
      for (const c of [C_CUR, C_PREV]) for (const p of ['front', 'right', 'left', 'back']) if (!o.fotoMancanti.includes(`${c}:${p}`)) righe.push({ check_id: c, pose: p, storage_path: `${U}/${c}/${p}.jpg` });
      return res(righe);
    }
    if (u.includes('/rest/v1/body_measurements')) return res([{ check_id: C_CUR, weight_kg: 69.95, waist_cm: 87 }, { check_id: C_PREV, weight_kg: 70.85, waist_cm: 89 }]);
    if (u.includes('/storage/v1/object/body-check-photos/')) return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0x01, 0x02]), { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
    if (u.includes('generativelanguage.googleapis.com')) {
      const body = JSON.parse(init.body);
      chiamateGemini.push(body);
      if (o.geminiStatus !== 200) return res({ error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } }, o.geminiStatus);
      const testo = o.risposteGemini[Math.min(chiamateGemini.length - 1, o.risposteGemini.length - 1)];
      return res({ candidates: [{ content: { parts: [{ text: testo }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 } });
    }
    if (u.includes('/rest/v1/body_check_ai?on_conflict')) { const row = JSON.parse(init.body); o.salvataggi.push(row); return res([{ id: 'r1', ...row }], 201); }
    throw new Error('fetch non previsto: ' + u);
  };
  return { o, chiamateGemini };
}
const chiama = async (body, token = 'buono') => {
  const log = [];
  const orig = console.log;
  console.log = (...a) => log.push(a.join(' '));
  try {
    const r = await handleVisionCheck(new Request('https://w/vision-check', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) }), { SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'gem' }, CORS);
    return { status: r.status, json: await r.json(), log };
  } finally { console.log = orig; }
};
const coppia = { user_id: U, check_id_current: C_CUR, check_id_previous: C_PREV };

// 1. coppia completa: una chiamata, 8 foto etichettate, riga salvata col modello
let s = scenario();
let r = await chiama(coppia);
atteso('coppia · esito', [r.status, r.json.reading.result.overall, r.json.reading.model], [200, 'migliorato', VISION_MODEL]);
atteso('coppia · una chiamata, 8 foto', [s.chiamateGemini.length, s.chiamateGemini[0].contents[0].parts.filter(p => p.inline_data).length], [1, 8]);
atteso('coppia · prima il precedente, poi l\'attuale', [s.chiamateGemini[0].contents[0].parts[1].text, s.chiamateGemini[0].contents[0].parts[9].text], ['CHECK PRECEDENTE (4 luglio 2026) — posa: fronte', 'CHECK ATTUALE (2 agosto 2026) — posa: fronte']);
atteso('coppia · misure nel testo', /Differenze misurate \(attuale meno precedente\): peso -0,9 kg, vita -2 cm/.test(s.chiamateGemini[0].contents[0].parts[0].text), true);
atteso('coppia · salvataggio', [s.o.salvataggi.length, s.o.salvataggi[0].confidence, s.o.salvataggi[0].previous_check_id], [1, 'alta', C_PREV]);
atteso('coppia · senza binding Images lo dichiara', r.json.reading.result.meta.resized, false);
atteso('log · solo metadati, nessun byte', r.log.every(l => !/\/9j\/|base64|inline_data/.test(l)), true);

// 2. posa mancante: si prosegue e lo si dichiara
s = scenario({ fotoMancanti: [`${C_CUR}:right`] });
r = await chiama(coppia);
atteso('posa mancante · 7 foto al modello', s.chiamateGemini[0].contents[0].parts.filter(p => p.inline_data).length, 7);
atteso('posa mancante · dichiarata', [r.json.reading.result.photo_quality.ok, r.json.reading.result.photo_quality.issues, r.json.reading.result.meta.poses_current], [false, ['foto mancante: right'], ['front', 'left', 'back']]);
atteso('posa mancante · detta anche al modello', /mancano: profilo destro/.test(s.chiamateGemini[0].contents[0].parts[0].text), true);

// 3. JSON non valido al primo giro, valido al secondo: un solo nuovo tentativo
s = scenario({ risposteGemini: ['Ecco la lettura: {', JSON.stringify(buono)] });
r = await chiama(coppia);
atteso('JSON rotto poi buono · esito', [r.status, s.chiamateGemini.length], [200, 2]);

// 4. JSON non valido due volte: errore pulito, niente salvato, niente terzo tentativo
s = scenario({ risposteGemini: [JSON.stringify({ ...buono, overall: 'boh' })] });
r = await chiama(coppia);
atteso('JSON rotto due volte · errore pulito', [r.status, r.json.error.kind, s.chiamateGemini.length, s.o.salvataggi.length], [502, 'invalid-json', 2, 0]);

// 5. primo check con overall sbagliato → non valido; con primo_check → aree azzerate
s = scenario({ risposteGemini: [JSON.stringify({ ...buono, overall: 'primo_check' })] });
r = await chiama({ user_id: U, check_id_current: C_CUR });
atteso('primo check · 4 foto, aree vuote', [r.status, s.chiamateGemini[0].contents[0].parts.filter(p => p.inline_data).length, r.json.reading.result.areas], [200, 4, []]);

// 6. Gemini risponde 429: arriva all'app come rate-limit, niente salvato
s = scenario({ geminiStatus: 429 });
r = await chiama(coppia);
atteso('Gemini 429 · rate-limit', [r.status, r.json.error.kind, r.json.error.source, s.o.salvataggi.length], [429, 'rate-limit', 'gemini', 0]);
s = scenario({ geminiStatus: 404 });
r = await chiama(coppia);
atteso('Gemini 404 · 502 verso l\'app', [r.status, r.json.error.kind], [502, 'model-unavailable']);

// 7. autorizzazione e stato dei check
s = scenario();
atteso('token errato · 401', (await chiama(coppia, 'sbagliato')).status, 401);
atteso('user_id diverso dal token · 403', (await chiama({ ...coppia, user_id: ALTRO })).status, 403);
s = scenario({ checks: [{ id: C_CUR, user_id: U, status: 'completed', created_at: '2026-08-02T05:38:24Z' }, { id: C_PREV, user_id: ALTRO, status: 'completed', created_at: '2026-07-04T03:32:48Z' }] });
atteso('check precedente di un altro · 403', (await chiama(coppia)).status, 403);
s = scenario({ checks: [{ id: C_CUR, user_id: U, status: 'in_progress', created_at: '2026-08-02T05:38:24Z' }, { id: C_PREV, user_id: U, status: 'completed', created_at: '2026-07-04T03:32:48Z' }] });
atteso('check non completato · 409', [(await chiama(coppia)).status, s.chiamateGemini.length], [409, 0]);
atteso('id non UUID · 400', (await chiama({ ...coppia, check_id_current: 'x' })).status, 400);

console.log(ko ? `\n${ko} KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
