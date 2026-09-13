// Il cron del Worker sui dati veri, IN PROVA: niente scritto (dry). Gira in UTC come Cloudflare.
//   TZ=UTC node worker/test/vivo_coach_cron.mjs
// 1) per ogni utente e per le 8 settimane salvate: il quadro calcolato dal Worker (fuso Europe/Rome,
//    lettura REST) contro la riga di weekly_pictures calcolata dal telefono. 2) il giro completo in prova.
import fs from 'node:fs';
import { pictureFor, runWeeklyCoach, romeClock } from '../src/coach-cron.js';
const vars = Object.fromEntries(fs.readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]));
const env = { SUPABASE_SERVICE_ROLE_KEY: vars.SUPABASE_SERVICE_ROLE_KEY };
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const ordina = (v) => Array.isArray(v) ? v.map(ordina) : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordina(v[k])])) : v;
console.log('fuso del processo:', Intl.DateTimeFormat().resolvedOptions().timeZone);
const righe = await (await fetch('https://qxiyeiahpoiliwpqslpr.supabase.co/rest/v1/weekly_pictures?select=user_id,week_start,picture&order=week_start.asc', { headers: H })).json();
const profili = await (await fetch('https://qxiyeiahpoiliwpqslpr.supabase.co/rest/v1/profiles?select=*', { headers: H })).json();
let uguali = 0;
for (const r of righe) {
  const profile = profili.find((p) => p.id === r.user_id);
  const clock = romeClock();
  const nowTs = Date.now();
  const { picture } = await pictureFor(env, profile, r.week_start, { clock, nowTs, today: clock.dayKey(new Date(nowTs)) }, true, true);
  const a = JSON.parse(JSON.stringify(picture)), b = JSON.parse(JSON.stringify(r.picture));
  delete a.meta.computed_at; delete b.meta.computed_at;
  const ok = JSON.stringify(ordina(a)) === JSON.stringify(ordina(b));
  if (ok) uguali++; else console.log('  diverso:', r.week_start, JSON.stringify(ordina(a)).slice(0, 300), '\n   vs', JSON.stringify(ordina(b)).slice(0, 300));
}
console.log(`quadri Worker (UTC, Europe/Rome) uguali a quelli del telefono: ${uguali} / ${righe.length}`);
const esito = await runWeeklyCoach(env, { dry: true, withProposals: true });
console.log(JSON.stringify({ ...esito, utenti: esito.utenti.map((u) => ({ ...u, dettaglio: undefined })) }, null, 1));
