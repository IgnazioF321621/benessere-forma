// Pirsi propone — il giro del lunedì mattina (Fase 3, 13 settembre 2026)
//
// Trigger pianificato: ogni lunedì alle 06:00 Europe/Rome. Cloudflare ragiona in UTC,
// quindi in wrangler.toml ci sono due orari (04:00 UTC d'estate, 05:00 d'inverno) e qui
// si lavora solo in quello che a Roma sono le 6.
//
// Per ogni utente con usa_training o un piano settimanale attivo:
//   1. le proposte `pending` di settimane precedenti passano a `expired`
//   2. il quadro della settimana appena chiusa: da weekly_pictures se c'è alla versione
//      corrente, altrimenti calcolato (shared/quadro.js, lo stesso dell'app) e salvato
//   3. se per quella settimana non ci sono ancora proposte: buildProposals
//      (shared/coach_rules.js) e inserimento in coach_proposals, senza doppioni
//
// Pirsi propone, l'utente decide: qui si scrivono solo proposte in attesa. Profili,
// target e schede non si toccano mai.
//
// Nei log (wrangler tail) solo metadati: utente abbreviato, settimana, esito, tipi di
// proposta. Mai pesi, calorie o altri numeri della persona.
//
// Variabili per le prove: COACH_CRON_FORCE=1 salta il controllo dell'ora (wrangler dev
// --test-scheduled), COACH_CRON_DRY=1 legge e calcola ma non scrive niente.

import ZTQuadro from '../../shared/quadro.js';
import ZTCoachRules from '../../shared/coach_rules.js';

const SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';
const TZ = 'Europe/Rome';
const HISTORY_WEEKS = 8;
const PAGE = 1000;
export const SUPPORTED_DAYS = [4, 5];          // rotazioni che esistono davvero (CLAUDE.md → Split)

const svc = (env) => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` });
const breve = (id) => String(id).slice(0, 8);

class TableMissing extends Error {}

async function rest(env, path, init) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...(init || {}), headers: { ...svc(env), ...((init && init.headers) || {}) } });
  if (!r.ok) {
    const t = await r.text();
    if (/PGRST205|42P01/.test(t)) throw new TableMissing(path.split('?')[0]);
    throw new Error(`${(init && init.method) || 'GET'} ${path.split('?')[0]} → ${r.status}`);
  }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

// Una voce di fetchSpec eseguita sul REST, paginata (L13).
async function runSpec(env, q) {
  const params = [`select=${encodeURIComponent(q.select.replace(/\s+/g, ''))}`];
  q.filters.forEach(([op, col, val]) => params.push(`${col}=${op}.${encodeURIComponent(val)}`));
  if (q.order.length) params.push(`order=${q.order.map((c) => c + '.asc').join(',')}`);
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const rows = await rest(env, `${q.table}?${params.join('&')}&limit=${PAGE}&offset=${from}`);
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function fetchRaw(env, userId, weekStart, trainStart) {
  const spec = ZTQuadro.fetchSpec(userId, weekStart, trainStart);
  const keys = Object.keys(spec);
  const res = await Promise.all(keys.map((k) => runSpec(env, spec[k]).then((d) => ({ d }), (e) => ({ e }))));
  const raw = { errors: [] };
  keys.forEach((k, i) => {
    if (k === 'readings' && res[i].e instanceof TableMissing) res[i] = { d: [] };   // come nell'app
    raw[k] = res[i].e ? null : res[i].d;
    if (res[i].e) raw.errors.push(k);
  });
  return raw;
}

// Quadro della settimana chiusa: quello salvato se è della versione corrente, altrimenti calcolato.
// forceCompute: ricalcola anche se salvato (solo per le prove: il confronto col telefono).
export async function pictureFor(env, profile, ws, ctx, dry, forceCompute) {
  const saved = await rest(env, `weekly_pictures?select=picture&user_id=eq.${profile.id}&week_start=eq.${ws}`);
  const old = saved && saved[0] && saved[0].picture;
  if (!forceCompute && old && ((old.meta && old.meta.version) || 1) >= ZTQuadro.WP_VERSION) return { picture: old, source: 'salvato' };

  const [raw, schede, deloads] = await Promise.all([
    fetchRaw(env, profile.id, ws, profile.train_start_date),
    rest(env, `schede_utente?select=scheda&user_id=eq.${profile.id}&attiva=eq.true&limit=1`),
    rest(env, `coach_proposals?select=applied_at&user_id=eq.${profile.id}&kind=eq.deload&status=eq.accepted&applied_at=not.is.null`).catch((e) => { if (e instanceof TableMissing) return []; throw e; }),
  ]);
  const sessioni = (schede && schede[0] && schede[0].scheda && schede[0].scheda.sessioni) || [];
  const picture = ZTQuadro.computeWeeklyPicture(raw, ws, {
    today: ctx.today, nowTs: ctx.nowTs, clock: ctx.clock, profile, target: null, injuryActiveNow: false,
    workPerGiro: ZTQuadro.workPerGiroForCycle(sessioni.map((s) => s && s.id).filter(Boolean)),
    deloads: (deloads || []).map((d) => ctx.clock.dayKey(new Date(d.applied_at))),
  });
  if (picture.meta.errors.length) return { picture, source: 'errori' };
  if (!dry) {
    await rest(env, 'weekly_pictures?on_conflict=user_id,week_start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: `resolution=${old ? 'merge' : 'ignore'}-duplicates,return=minimal` },
      body: JSON.stringify({ user_id: profile.id, week_start: ws, picture, computed_at: picture.meta.computed_at }),
    });
  }
  return { picture, source: old ? 'ricalcolato' : 'calcolato' };
}

export function romeClock(){ return ZTQuadro.makeClock(TZ); }

export async function runWeeklyCoach(env, opts) {
  const o = opts || {};
  const dry = !!o.dry;
  const clock = ZTQuadro.makeClock(TZ);
  const nowTs = o.nowTs != null ? o.nowTs : Date.now();
  const today = clock.dayKey(new Date(nowTs));
  const ws = ZTQuadro.addDays(ZTQuadro.mondayOf(today), -7);    // la settimana appena chiusa
  const ctx = { clock, nowTs, today };
  const esito = { week_start: ws, dry, utenti: [], errori: 0 };

  const [profili, piani] = await Promise.all([
    rest(env, 'profiles?select=id,obiettivo,goal_weight_kg,weight_kg,target_kcal,target_protein,target_carbs,target_fat,giorni_allenamento,train_start_date,usa_training,created_at&order=id.asc'),
    rest(env, 'weekly_plans?select=user_id&status=eq.active'),
  ]);
  const conPiano = new Set((piani || []).map((p) => p.user_id));
  const utenti = profili.filter((p) => (p.usa_training || conPiano.has(p.id)) && (!o.onlyUser || p.id === o.onlyUser));

  for (const profile of utenti) {
    const riga = { user: breve(profile.id), quadro: null, proposte: [], scadute: 0 };
    try {
      // Mai prima della settimana in cui il profilo è nato (come il backfill dell'app)
      if (profile.created_at && ZTQuadro.mondayOf(clock.dayKey(new Date(profile.created_at))) > ws) { riga.quadro = 'profilo più giovane della settimana'; esito.utenti.push(riga); continue; }

      // 1. le proposte in attesa delle settimane prima scadono
      let esistenti;
      try {
        if (!dry) {
          const scadute = await rest(env, `coach_proposals?user_id=eq.${profile.id}&status=eq.pending&week_start=lt.${ws}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ status: 'expired' }),
          });
          riga.scadute = (scadute || []).length;
        }
        esistenti = await rest(env, `coach_proposals?select=kind,status,week_start,decided_at,applied_at&user_id=eq.${profile.id}&week_start=gte.${ZTQuadro.addDays(ws, -7 * HISTORY_WEEKS)}&order=week_start.asc`);
      } catch (e) {
        if (!(e instanceof TableMissing)) throw e;
        if (!dry) { console.log('[coach-cron] coach_proposals assente: migrazione non eseguita, giro fermo'); esito.tabellaAssente = true; return esito; }
        esistenti = [];
        esito.tabellaAssente = true;
      }

      // 2. il quadro della settimana chiusa
      const { picture, source } = await pictureFor(env, profile, ws, ctx, dry);
      riga.quadro = source;
      if (source === 'errori') { riga.errori = picture.meta.errors; esito.utenti.push(riga); esito.errori++; continue; }

      // 3. le proposte, se la settimana non le ha già
      if (esistenti.some((p) => p.week_start === ws)) { riga.proposte = 'già presenti'; esito.utenti.push(riga); continue; }
      const storico = await rest(env, `weekly_pictures?select=picture&user_id=eq.${profile.id}&week_start=gte.${ZTQuadro.addDays(ws, -7 * HISTORY_WEEKS)}&week_start=lt.${ws}&order=week_start.asc`);
      const proposte = ZTCoachRules.buildProposals(picture, (storico || []).map((r) => r.picture), profile, { proposals: esistenti, supportedDays: SUPPORTED_DAYS });
      riga.proposte = proposte.map((p) => p.kind);
      if (!dry && proposte.length) {
        await rest(env, 'coach_proposals?on_conflict=user_id,week_start,kind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify(proposte.map((p) => ({ user_id: profile.id, week_start: ws, kind: p.kind, title: p.title, reason: p.reason, evidence: p.evidence, change: p.change, status: 'pending' }))),
        });
      }
      if (o.withProposals) riga.dettaglio = proposte;
    } catch (e) {
      esito.errori++;
      riga.errore = e.message;
    }
    esito.utenti.push(riga);
  }
  return esito;
}

export async function handleScheduled(event, env, ctx) {
  const clock = ZTQuadro.makeClock(TZ);
  const ora = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(event.scheduledTime)));
  if (ora !== 6 && env.COACH_CRON_FORCE !== '1') {
    console.log(`[coach-cron] ${event.cron}: a Roma sono le ${ora}, non le 6 — salto`);
    return;
  }
  const dry = env.COACH_CRON_DRY === '1';
  const t0 = Date.now();
  try {
    const esito = await runWeeklyCoach(env, { nowTs: event.scheduledTime, dry });
    esito.utenti.forEach((u) => console.log(`[coach-cron] ${esito.week_start} utente ${u.user}: quadro ${u.quadro}` +
      ` · proposte ${Array.isArray(u.proposte) ? (u.proposte.join(', ') || 'nessuna') : u.proposte}` +
      (u.scadute ? ` · scadute ${u.scadute}` : '') + (u.errori ? ` · letture fallite ${u.errori.join(', ')}` : '') + (u.errore ? ` · ERRORE ${u.errore}` : '')));
    console.log(`[coach-cron] ${esito.week_start} fine${dry ? ' (prova, niente scritto)' : ''}: ${esito.utenti.length} utenti, ${esito.errori} errori, ${Date.now() - t0} ms` +
      (esito.tabellaAssente ? ' · coach_proposals assente' : '') + ` · oggi ${clock.dayKey(new Date(event.scheduledTime))}`);
  } catch (e) {
    console.log(`[coach-cron] giro fallito: ${e.message}`);
  }
}
