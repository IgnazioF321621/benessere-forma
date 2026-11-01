// Il promemoria del pasto non registrato — il giro delle ore (Notifiche 170, 1 novembre 2026)
//
// Trigger pianificato: ogni ora («0 * * * *», il terzo cron del Worker: il piano Free ne dà 5 per account).
// Cloudflare ragiona in UTC e l'ora legale cambia due volte l'anno: qui si guarda che ora è a Roma e si
// lavora solo alle 10, alle 15 e alle 22 (ZTPromemoria.ORE), come fa il lunedì di Pirsi propone.
//
// A quell'ora, per chi ha acceso almeno un promemoria (profiles.promemoria_pasti):
//   1. i pasti di oggi (meals), i digiuni di oggi (fasting_days), i telefoni iscritti (push_iscrizioni)
//      e gli avvisi già mandati oggi (promemoria_inviati): quattro letture in tutto, per tutti insieme
//   2. la regola, la STESSA dell'app: shared/promemoria.js → pastoMancante (spuntini ed extra non contano,
//      niente nei giorni di digiuno e con la pausa cibo)
//   3. un avviso a ogni telefono della persona (Web Push, src/webpush.js), poi una riga in
//      promemoria_inviati: un giro ripetuto nella stessa ora non manda due volte
//   4. gli indirizzi morti (404/410 dal servizio push) si cancellano; agli altri si segna l'ultimo invio
//
// Il piano Free dà 50 sottorichieste a esecuzione: 4 letture + 3 scritture + un POST per telefono. Il
// giro si ferma a MAX_AVVISI_GIRO telefoni e lo scrive nei log: oggi i telefoni iscritti sono pochi;
// quando saranno di più il giro va diviso (Queues o più cron), ed è una decisione a parte.
//
// Nei log (wrangler tail) solo metadati: utente abbreviato, pasto, esito. Mai il testo dei pasti.
// Variabili per le prove: PROMEMORIA_FORCE=1 salta il controllo dell'ora (wrangler dev --test-scheduled),
// PROMEMORIA_DRY=1 legge e decide ma non manda e non scrive niente.

import ZTPromemoria from '../../shared/promemoria.js';
import { inviaPush } from './webpush.js';

const SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';
const PAGE = 1000;
export const MAX_AVVISI_GIRO = 40;
// Il nome del coach nel titolo dell'avviso. Nell'app vive in COACH_NAME (zona-tracker.html); il Worker non
// legge la pagina, quindi qui c'è la seconda e ultima copia fuori dai prompt (docs/COACH.md → La costante).
export const COACH_NAME = 'Pirsi';
const URL_APERTURA = '/benessere-forma/zona-tracker.html?apri=oggi';

const svc = (env) => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` });
const breve = (id) => String(id).slice(0, 8);

async function rest(env, path, init) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...(init || {}), headers: { ...svc(env), ...((init && init.headers) || {}) } });
  if (!r.ok) throw new Error(`${(init && init.method) || 'GET'} ${path.split('?')[0]} → ${r.status}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
async function leggiTutto(env, path) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const rows = await rest(env, `${path}&limit=${PAGE}&offset=${from}`);
    out.push(...(rows || []));
    if (!rows || rows.length < PAGE) break;
  }
  return out;
}
const UUID_RE = /^[0-9a-f-]{36}$/i;
const inElenco = (ids) => `in.(${ids.filter((x) => UUID_RE.test(x)).join(',')})`;

// Un giro. Restituisce l'esito per i log e per la prova; con dry non manda e non scrive.
export async function runPromemoria(env, { nowTs, dry } = {}) {
  const { ora, giorno } = ZTPromemoria.oraRoma(nowTs);
  const esito = { giorno, ora, utenti: [], avvisi: 0, telefoni: 0, morti: 0, errori: 0, saltato: null, rimandati: 0 };
  if (!ZTPromemoria.ORE.includes(ora) && env.PROMEMORIA_FORCE !== '1') { esito.saltato = 'ora'; return esito; }
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) { esito.saltato = 'chiavi'; return esito; }

  const profili = (await leggiTutto(env, 'profiles?select=id,promemoria_pasti,pausa_inizio,pausa_fine,pausa_moduli&promemoria_pasti=not.is.null'))
    .filter((p) => ZTPromemoria.accesi(p).length);
  if (!profili.length) return esito;
  const ids = profili.map((p) => p.id);
  const filtro = `user_id=${inElenco(ids)}`;
  const [pasti, digiuni, iscrizioni, inviati] = await Promise.all([
    leggiTutto(env, `meals?select=user_id,date,slot&date=eq.${giorno}&${filtro}`),
    leggiTutto(env, `fasting_days?select=user_id&date=eq.${giorno}&${filtro}`),
    leggiTutto(env, `push_iscrizioni?select=id,user_id,endpoint,p256dh,auth&${filtro}`),
    leggiTutto(env, `promemoria_inviati?select=user_id,slot&date=eq.${giorno}&${filtro}`),
  ]);
  const digiunoDi = new Set(digiuni.map((d) => d.user_id));
  const giaMandati = new Set(inviati.map((i) => i.user_id + '|' + i.slot));

  const daScrivere = [], morti = [], vivi = [];
  for (const p of profili) {
    const riga = { user: breve(p.id), pasto: null, esito: 'niente da dire' };
    esito.utenti.push(riga);
    try {
      const pasto = ZTPromemoria.pastoMancante({ pasti: pasti.filter((m) => m.user_id === p.id), giorno, ora, profile: p, digiuno: digiunoDi.has(p.id) });
      if (!pasto) continue;
      riga.pasto = pasto.slot;
      if (giaMandati.has(p.id + '|' + pasto.slot)) { riga.esito = 'già mandato'; continue; }
      const telefoni = iscrizioni.filter((i) => i.user_id === p.id);
      if (!telefoni.length) { riga.esito = 'nessun telefono'; continue; }
      if (esito.telefoni + telefoni.length > MAX_AVVISI_GIRO) { riga.esito = 'rimandato: giro pieno'; esito.rimandati++; continue; }
      const t = ZTPromemoria.testoAvviso(pasto, COACH_NAME);
      const payload = { titolo: t.titolo, corpo: t.corpo, slot: pasto.slot, tag: 'pasto-' + pasto.slot, url: URL_APERTURA };
      let ok = 0;
      for (const tel of telefoni) {
        esito.telefoni++;
        if (dry) { ok++; continue; }
        let r;
        try { r = await inviaPush(tel, payload, env); } catch (e) { r = { status: 0, viva: true, motivo: e.message }; }
        if (!r.viva) morti.push(tel.id);
        else if (r.status >= 200 && r.status < 300) { ok++; vivi.push(tel.id); }
        else riga.esito = `servizio push ${r.status}`;
      }
      if (ok) { esito.avvisi++; riga.esito = `mandato a ${ok}`; daScrivere.push({ user_id: p.id, date: giorno, slot: pasto.slot, telefoni: ok }); }
    } catch (e) {
      esito.errori++;
      riga.esito = 'fallito: ' + e.message;
    }
  }
  esito.morti = morti.length;
  if (dry) return esito;
  try {
    if (daScrivere.length) await rest(env, 'promemoria_inviati?on_conflict=user_id,date,slot', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(daScrivere) });
    if (vivi.length) await rest(env, `push_iscrizioni?id=${inElenco(vivi)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ ultimo_invio: new Date(nowTs == null ? Date.now() : nowTs).toISOString(), ultimo_esito: 'mandato' }) });
    if (morti.length) await rest(env, `push_iscrizioni?id=${inElenco(morti)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  } catch (e) {
    esito.errori++;
    esito.scrittura = e.message;
  }
  return esito;
}

export async function handlePromemoria(event, env) {
  const t0 = Date.now();
  try {
    const esito = await runPromemoria(env, { nowTs: event.scheduledTime, dry: env.PROMEMORIA_DRY === '1' });
    if (esito.saltato === 'ora') return;    // 21 giri su 24 finiscono qui, in silenzio
    if (esito.saltato === 'chiavi') { console.log('[promemoria] chiavi VAPID assenti: niente avvisi'); return; }
    esito.utenti.filter((u) => u.pasto).forEach((u) => console.log(`[promemoria] ${esito.giorno} ${esito.ora}:00 utente ${u.user}: ${u.pasto} · ${u.esito}`));
    console.log(`[promemoria] ${esito.giorno} ${esito.ora}:00 fine${env.PROMEMORIA_DRY === '1' ? ' (prova, niente mandato)' : ''}: ${esito.utenti.length} utenti, ${esito.avvisi} avvisi a ${esito.telefoni} telefoni, ${esito.morti} indirizzi tolti, ${esito.rimandati} rimandati, ${esito.errori} errori, ${Date.now() - t0} ms` + (esito.scrittura ? ` · scrittura: ${esito.scrittura}` : ''));
  } catch (e) {
    console.log(`[promemoria] giro fallito: ${e.message}`);
  }
}
