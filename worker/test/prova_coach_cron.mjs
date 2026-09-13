// Il cron di Pirsi senza rete: fetch finto per il REST di Supabase. Gira in UTC come Cloudflare.
//   TZ=UTC node worker/test/prova_coach_cron.mjs
// Copre: controllo dell'ora di Roma, prova senza scritture, scadenza delle pending vecchie,
// quadro salvato contro calcolato, inserimento senza doppioni, settimana che ha già proposte,
// tabella assente, profilo più giovane della settimana, un utente che fallisce non ferma gli altri.
import { runWeeklyCoach, handleScheduled } from '../src/coach-cron.js';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(56), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const U1 = '11111111-aaaa-4aaa-8aaa-111111111111', U2 = '22222222-bbbb-4bbb-8bbb-222222222222', U3 = '33333333-cccc-4ccc-8ccc-333333333333';
const env = { SUPABASE_SERVICE_ROLE_KEY: 'finta' };
// lunedì 14 settembre 2026, 06:00 a Roma = 04:00 UTC
const LUN6 = Date.parse('2026-09-14T04:00:00Z');

function mondo(o = {}) {
  const t = {
    profiles: [
      { id: U1, obiettivo: 'dimagrimento', goal_weight_kg: 70, target_kcal: 2200, target_protein: 150, giorni_allenamento: 4, train_start_date: '2026-08-10', usa_training: true, created_at: '2026-05-01T08:00:00Z' },
      { id: U2, obiettivo: 'mantenimento', target_kcal: 1800, usa_training: false, created_at: '2026-05-01T08:00:00Z' },
      { id: U3, obiettivo: 'mantenimento', target_kcal: 1800, usa_training: true, created_at: '2026-09-14T03:00:00Z' },
    ],
    weekly_plans: [ { user_id: U2, status: 'active' } ],
    weight_logs: [ { user_id: U1, date: '2026-09-08', weight_kg: 74.8 }, { user_id: U1, date: '2026-09-10', weight_kg: 74.6 }, { user_id: U1, date: '2026-09-12', weight_kg: 74.4 } ],
    meals: [], supplements_log: [], supplements: [], nutrilite_catalog: [], body_logs: [], body_measurements: [], body_checks: [], training_logs: [], workouts: [], blood_tests: [], body_check_ai: [], schede_utente: [],
    weekly_pictures: [], coach_proposals: [ { user_id: U1, week_start: '2026-08-31', kind: 'check', status: 'pending' } ],
    ...o.tabelle,
  };
  const scritture = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const table = u.pathname.split('/').pop();
    const method = init.method || 'GET';
    const res = (body, status = 200) => new Response(body == null ? '' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if ((o.assenti || []).includes(table)) return res({ code: 'PGRST205', message: `Could not find the table 'public.${table}'` }, 404);
    if ((o.rotte || []).some(([tb, uid]) => tb === table && u.search.includes(uid))) return res({ message: 'boom' }, 500);
    const filtri = [...u.searchParams.entries()].filter(([k]) => !['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k));
    const passa = (r) => filtri.every(([col, v]) => {
      const [op, ...rest] = v.split('.'); const val = rest.join('.');
      if (op === 'eq') return String(r[col]) === val;
      if (op === 'gte') return r[col] >= val;
      if (op === 'lte') return r[col] <= val;
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
    if (method === 'PATCH') { const toccate = (t[table] || []).filter(passa); toccate.forEach((r) => Object.assign(r, body)); return res(toccate); }
    if (method === 'POST') { (Array.isArray(body) ? body : [body]).forEach((r) => t[table].push(r)); return res(null, 201); }
    return res(null);
  };
  return { t, scritture };
}

// 1. il giro vero del lunedì
let m = mondo();
let esito = await runWeeklyCoach(env, { nowTs: LUN6 });
atteso('settimana chiusa letta in ora di Roma', esito.week_start, '2026-09-07');
atteso('utenti: training, piano attivo, profilo giovane', esito.utenti.map((u) => [u.user, u.quadro]), [['11111111', 'calcolato'], ['22222222', 'calcolato'], ['33333333', 'profilo più giovane della settimana']]);
atteso('pending della settimana prima → expired', m.t.coach_proposals.find((p) => p.week_start === '2026-08-31').status, 'expired');
atteso('quadro salvato senza sovrascrivere', m.scritture.filter((s) => s.table === 'weekly_pictures').map((s) => [s.prefer, s.body.week_start]), [['resolution=ignore-duplicates,return=minimal', '2026-09-07'], ['resolution=ignore-duplicates,return=minimal', '2026-09-07']]);
const ins = m.scritture.filter((s) => s.table === 'coach_proposals' && s.method === 'POST');
atteso('proposte inserite con ignore-duplicates, tutte pending', ins.map((s) => [s.prefer, s.body.every((r) => r.status === 'pending' && r.week_start === '2026-09-07')]), [['resolution=ignore-duplicates,return=minimal', true], ['resolution=ignore-duplicates,return=minimal', true]]);
atteso('nessuna scrittura su profiles o schede', m.scritture.some((s) => ['profiles', 'schede_utente', 'weekly_plans'].includes(s.table)), false);
atteso('U1: 3 pesate, niente pasti né esami → logging, blood_test', esito.utenti[0].proposte, ['logging', 'blood_test']);

// 2. secondo giro nello stesso lunedì: niente doppioni
const primaN = m.t.coach_proposals.length;
esito = await runWeeklyCoach(env, { nowTs: LUN6 });
atteso('secondo giro · proposte già presenti', esito.utenti.slice(0, 2).map((u) => [u.quadro, u.proposte]), [['salvato', 'già presenti'], ['salvato', 'già presenti']]);
atteso('secondo giro · nessuna riga in più', m.t.coach_proposals.length, primaN);

// 3. prova: niente scritto
m = mondo();
esito = await runWeeklyCoach(env, { nowTs: LUN6, dry: true });
atteso('dry · zero scritture', m.scritture.length, 0);
atteso('dry · le proposte si calcolano lo stesso', esito.utenti[0].proposte, ['logging', 'blood_test']);

// 4. quadro già salvato alla versione corrente: si usa quello
m = mondo({ tabelle: { weekly_pictures: [ { user_id: U1, week_start: '2026-09-07', picture: { meta: { version: 2, week_start: '2026-09-07', errors: [] }, weight: { weight_avg: 74.6, weight_n: 3 }, nutrition: null, training: null, body: null, blood: null } } ] } });
esito = await runWeeklyCoach(env, { nowTs: LUN6, onlyUser: U1 });
atteso('quadro salvato v2 · non si ricalcola', [esito.utenti[0].quadro, m.scritture.filter((s) => s.table === 'weekly_pictures').length], ['salvato', 0]);

// 5. tabella coach_proposals assente: il giro si ferma senza scrivere niente
m = mondo({ assenti: ['coach_proposals'] });
esito = await runWeeklyCoach(env, { nowTs: LUN6 });
atteso('tabella assente · fermo, zero scritture', [esito.tabellaAssente, m.scritture.length], [true, 0]);

// 6. un utente con una lettura rotta non ferma gli altri
m = mondo({ rotte: [['meals', U1]] });
esito = await runWeeklyCoach(env, { nowTs: LUN6 });
atteso('lettura rotta · U1 non salvato né proposto, U2 sì', esito.utenti.slice(0, 2).map((u) => [u.quadro, u.errori || null]), [['errori', ['meals']], ['calcolato', null]]);
atteso('lettura rotta · nessun quadro con errori salvato', m.scritture.filter((s) => s.table === 'weekly_pictures').map((s) => s.body.user_id), [U2]);

// 7. controllo dell'ora: alle 05 UTC d'estate a Roma sono le 7 → si salta; alle 04 si lavora
const log = []; const orig = console.log; console.log = (...a) => log.push(a.join(' '));
m = mondo();
await handleScheduled({ cron: '0 5 * * 1', scheduledTime: Date.parse('2026-09-14T05:00:00Z') }, env, {});
await handleScheduled({ cron: '0 4 * * 1', scheduledTime: LUN6 }, env, {});
// d'inverno: 26 ottobre 2026 è già CET → le 6 di Roma sono le 05 UTC
await handleScheduled({ cron: '0 4 * * 1', scheduledTime: Date.parse('2026-10-26T04:00:00Z') }, env, {});
console.log = orig;
atteso('05 UTC di settembre · saltato', log[0], '[coach-cron] 0 5 * * 1: a Roma sono le 7, non le 6 — salto');
atteso('04 UTC di settembre · giro fatto', log.some((l) => /2026-09-07 fine: 3 utenti, 0 errori/.test(l)), true);
atteso('04 UTC di ottobre (CET) · saltato', log[log.length - 1], '[coach-cron] 0 4 * * 1: a Roma sono le 5, non le 6 — salto');
atteso('log senza numeri della persona', log.some((l) => /74[.,]|2200|kcal/.test(l)), false);

console.log(ko ? `\n${ko} KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
