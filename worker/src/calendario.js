// GET /calendario?t=<token> — il calendario delle sedute a cui l'iPhone si iscrive (Training 540, 30 ottobre 2026).
//
// Ignazio: «collegare i passi che ci sono già (workout) impostando un orario direttamente sul calendario Apple».
// GitHub Pages non può scrivere nel Calendario e non si paga niente: la strada a costo zero è un calendario a cui
// iscriversi (feed iCalendar, webcal://). L'app mette nel profilo i giorni scelti (train_giorni), l'ora (train_orario)
// e un token (calendario_token, uuid scelto dall'app); l'iPhone chiama questo indirizzo ogni qualche ora e qui si
// risponde con le sedute delle prossime 4 settimane: una per ogni giorno scelto, solo sedute di lavoro («solo sedute
// vere»), 60 minuti, avviso 15 minuti prima, i giorni di pausa vuoti.
//
// La seduta di ogni giorno la decide shared/rotazione.js, la STESSA regola del telefono (Training 530 e 540): il
// calendario e l'app dicono sempre la stessa cosa. Qui si legge e basta, con la chiave di servizio: il profilo per
// token, la scheda attiva (i nomi, il ciclo e gli esercizi), gli ultimi 10 allenamenti, i completati del blocco e
// gli scarichi accettati (la settimana di scarico) e il «per lato» del catalogo. Nessuna scrittura, nessun dato
// della persona nei log (solo l'id abbreviato e quanti eventi).
//
// Training 541 (1 novembre 2026, Ignazio: il feed completo per i workout): ogni evento ha nella descrizione gli
// esercizi della seduta (serie × ripetizioni o secondi; in scarico il minimo dell'intervallo), dura quanto la
// seduta stimata (ZTRotazione.durataSeduta, la stessa regola che l'app mostra in Training) e porta l'indirizzo
// che apre l'app su Training (ZTRotazione.URL_TRAINING). Titolo, avviso, niente recuperi e pausa vuota: come nel 540.
//
// Il token non è un token di accesso: non apre niente altro. Un indirizzo con un token sconosciuto risponde 404,
// uno malformato 400; un limite per indirizzo IP tiene lontani i tentativi a raffica.

import ZTQuadro from '../../shared/quadro.js';
import ZTRotazione from '../../shared/rotazione.js';
import { entroIlLimite } from './porta.js';

const SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RICHIESTE_AL_MINUTO = 20;        // per indirizzo IP: l'iPhone ne fa una ogni qualche ora
const ULTIMI = 10;                     // quante righe di workouts servono alla posizione nel giro (come l'app)
const COMPLETATI_MAX = 1000;           // i completati del blocco, per la settimana di scarico (un blocco ne ha qualche decina)

const svc = (env) => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` });
const breve = (id) => String(id).slice(0, 8);

function testo(status, corpo, extra) {
  return new Response(corpo, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...(extra || {}) } });
}

class TabellaAssente extends Error {}
async function rest(env, path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svc(env) });
  if (r.status === 404) throw new TabellaAssente(path.split('?')[0]);
  if (!r.ok) throw new Error(`GET ${path.split('?')[0]} → ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : [];
}

export async function handleCalendario(request, env) {
  if (request.method !== 'GET') return testo(405, 'Solo GET');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return testo(500, 'Worker non configurato');
  const url = new URL(request.url);
  const token = (url.searchParams.get('t') || '').trim().toLowerCase();
  if (!UUID_RE.test(token)) return testo(400, 'Collegamento non valido');
  const ip = request.headers.get('cf-connecting-ip') || 'sconosciuto';
  if (!(await entroIlLimite(env.LIMITE_COACH, 'cal:' + ip, RICHIESTE_AL_MINUTO))) return testo(429, 'Troppe richieste', { 'Retry-After': '60' });

  try {
    const profili = await rest(env, `profiles?select=id,train_orario,train_giorni,train_start_date,pausa_inizio,pausa_fine,pausa_moduli,tabata,tabata_giorni&calendario_token=eq.${token}&limit=1`);
    const p = profili && profili[0];
    if (!p) return testo(404, 'Calendario non trovato');

    const giorni = ZTRotazione.giorniScelti(p.train_giorni);
    const orario = ZTRotazione.orarioValido(p.train_orario);
    let eventi = [], nomi = {};
    if (giorni && orario) {
      const daData = p.train_start_date ? `&date=gte.${p.train_start_date}` : '';
      const clock = ZTQuadro.makeClock(ZTRotazione.TZ);
      const [schede, allenamenti, completati, scarichi] = await Promise.all([
        rest(env, `schede_utente?select=scheda&user_id=eq.${p.id}&attiva=eq.true&order=created_at.desc&limit=1`),
        rest(env, `workouts?select=date,session_type,completed,created_at&user_id=eq.${p.id}&session_type=not.in.(rest,rest_injury)${daData}&order=date.desc,created_at.desc&limit=${ULTIMI}`),
        // come loadTrainingAllCompleted nell'app: completati, senza riposi, dall'inizio del blocco, in ordine di data
        rest(env, `workouts?select=date,session_type&user_id=eq.${p.id}&completed=eq.true&session_type=not.in.(rest,rest_injury)${daData}&order=date.asc,created_at.asc&limit=${COMPLETATI_MAX}`),
        // gli scarichi anticipati accettati (Pirsi propone), come il cron del lunedì
        rest(env, `coach_proposals?select=applied_at&user_id=eq.${p.id}&kind=eq.deload&status=eq.accepted&applied_at=not.is.null`)
          .catch((e) => { if (e instanceof TabellaAssente) return []; throw e; }),
      ]);
      const sessioni = ((schede && schede[0] && schede[0].scheda && schede[0].scheda.sessioni) || []).filter((s) => s && s.id);
      sessioni.forEach((s) => { nomi[s.id] = s.name || s.id; });
      const idSedute = sessioni.map((s) => s.id);
      const oggi = clock.dayKey(Date.now());
      eventi = ZTRotazione.sedutePreviste({ allenamenti: allenamenti || [], ciclo: ZTRotazione.cicloPer(idSedute), oggi, giorni, profile: p });

      // il «per lato» degli esercizi che il jsonb della scheda non porta: dal catalogo, per codice (come l'app)
      const perSid = {};
      sessioni.forEach((s) => { perSid[s.id] = s; });
      const codici = [...new Set(eventi.flatMap((e) => ((perSid[e.sid] && perSid[e.sid].exercises) || [])
        .filter((ex) => ex && !ex.unilaterale && /^EX\d+$/.test(String(ex.codice || ''))).map((ex) => ex.codice)))];
      const uni = {};
      if (codici.length) {
        const righe = await rest(env, `esercizi_catalog?select=codice,unilaterale&codice=in.(${codici.join(',')})`);
        (righe || []).forEach((r) => { if (r && r.codice) uni[r.codice] = r.unilaterale || null; });
      }
      const unilaterale = (ex) => (ex && ex.codice && uni[ex.codice]) || null;

      const scarico = ZTRotazione.scaricoPerEventi({
        eventi, completati: completati || [],
        workPerGiro: ZTQuadro.workPerGiroForCycle(idSedute),
        deloads: (scarichi || []).map((d) => clock.dayKey(new Date(d.applied_at))),
      });
      eventi = eventi.map((e, i) => {
        const sess = perSid[e.sid];
        // una seduta senza esercizi nella scheda non ha una durata da stimare: resta l'ora di partenza
        if (!sess || !(sess.exercises || []).some(Boolean)) return e;
        const o = { unilaterale, scarico: scarico[i], tabata: ZTRotazione.tabataInCoda(p, e.date) };
        return { ...e, durataMin: ZTRotazione.minutiSeduta(ZTRotazione.durataSeduta(sess, o)), descrizione: ZTRotazione.descrizione(sess, o) };
      });
    }
    const ics = ZTRotazione.ics({ eventi, nomi, orario, chiave: p.id, url: ZTRotazione.URL_TRAINING });
    console.log(`[calendario] ${breve(p.id)}: ${eventi.length} sedute${giorni && orario ? '' : ' (giorni o ora non scelti)'}`);
    return new Response(ics, { status: 200, headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="zona-tracker.ics"',
      'Cache-Control': 'private, max-age=0, must-revalidate',
    } });
  } catch (e) {
    console.warn('[calendario] lettura fallita:', e && e.message);
    return testo(502, 'Riprova più tardi');
  }
}
