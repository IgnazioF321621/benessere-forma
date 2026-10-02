// ═══════════════════════════════════════
// app/home.js — la Home (Fondamenta 035, tappa 6, 2 ottobre 2026)
// ═══════════════════════════════════════
// I dati Training per la Home, renderHome con il prossimo checkpoint e la prossima azione, il quadro
// settimanale (lettura, calcolo, storico in weekly_pictures, card «La tua settimana» e vista completa)
// e renderHomeV2 con le card della Home. Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO app/nutrition.js e PRIMA del resto del proprio codice: qui al caricamento
// si dichiarano solo costanti scritte per esteso o lette dai moduli di shared/ già caricati, niente
// che usi un nome scritto più avanti nella pagina (lo controlla tools/banco/prova_ordine_caricamento.js).

// Calcola e setta ST.trainHomeData dalla rotazione REALE (ultimo workout valido → nextSession su getSessionCycle()).
// NON tocca il DOM: il chiamante decide cosa ri-renderizzare quando il dato è pronto (Home tile o badge OGGI tab Programma).
async function computeTrainHomeData(){
  if(!ST.user || ST.user.id==='test-user-001'){
    ST.trainHomeData = { notStarted: true, lastDate:null, lastSession:null, nextSession:'upperA', streak:0, doneToday:false, inProgress:false };
    return;
  }
  const today = todayKey();
  try {
    // Ultimo workout effettivo (esclude riposi, scelti o per infortunio) — fonte di verità per rotazione
    let qLast = supa.from('workouts')
      .select('date, session_type, completed')
      .eq('user_id', ST.user.id)
      .not('session_type', 'in', '(rest,rest_injury)');
    if(ST.profile && ST.profile.train_start_date) qLast = qLast.gte('date', ST.profile.train_start_date);
    qLast = qLast.order('date', {ascending:false}).limit(10);
    const { data: lastArr, error: lastErr } = await qLast;
    if(lastErr) throw lastErr;
    const lastAny = (lastArr && lastArr[0]) || null; // più recente, anche recupero
    const lastWorkout = (lastArr || []).find(w => !/^recovery/i.test(w.session_type)) || null; // ultimo di LAVORO

    if(!lastWorkout){
      ST.trainHomeData = { notStarted: true, lastDate:null, lastSession:null, nextSession:'upperA', streak:0, doneToday:false, inProgress:false };
      return;
    }

    // nextSession: cicla sull'ORDINE CANONICO 6 giorni (getRotationCycle), NON sull'array della scheda.
    // La scheda non contiene i recuperi → con getSessionCycle un recupero darebbe indexOf=-1 → fallback errato a upperA.
    // Marcatore di posizione nel ciclo = workout più recente il cui session_type
    // è PRESENTE nel ciclo canonico, recovery INCLUSI (lastArr è già desc e già
    // esclude rest/rest_injury): completato recoveryUpper (G3) il prossimo è
    // upperB (G4), non di nuovo il recovery. lastWorkout (solo LAVORO) resta la
    // fonte per gli altri usi; fallback a lastWorkout se nulla matcha il ciclo.
    const cycle = getRotationCycle();
    const lastInCycle = (lastArr || []).find(w => cycle.includes(w.session_type)) || lastWorkout;
    const lastIdx = cycle.indexOf(lastInCycle.session_type);
    let nextSession = lastIdx >= 0 ? cycle[(lastIdx + 1) % cycle.length] : (cycle[0] || 'upperA');
    // Slot 'rest' (ciclo a 7): proposto SOLO il giorno stesso dell'ultimo workout
    // (es. sabato sera dopo la Pump → "domani riposo"). Se l'ultimo workout del
    // ciclo NON è di oggi, il giorno di riposo è di fatto già trascorso → avanza
    // al primo slot successivo non-rest (wrap incluso: dopo G7 → upperA).
    if(/^rest/.test(nextSession) && !(lastInCycle && lastInCycle.date === today)){
      const restIdx = cycle.indexOf(nextSession);
      for(let k = 1; k <= cycle.length; k++){
        const cand = cycle[(restIdx + k) % cycle.length];
        if(!/^rest/.test(cand)){ nextSession = cand; break; }
      }
    }

    // Streak — giorni consecutivi con workout completato (a partire da oggi)
    const { data: completedArr } = await dbq('leggere gli allenamenti completati', supa.from('workouts')
      .select('date')
      .eq('user_id', ST.user.id)
      .eq('completed', true)
      .order('date', {ascending:false})
      .limit(60), {silenzioso:true});
    const completedDates = new Set((completedArr||[]).map(w=>w.date));
    let streak=0, check=new Date(today);
    for(let i=0;i<60;i++){
      const k=dayKey(check);
      if(completedDates.has(k)){ streak++; check.setDate(check.getDate()-1); }
      else if(i===0) break;
      else break;
    }

    const doneToday   = !!lastAny && lastAny.date === today && lastAny.completed === true;
    const inProgress  = !!lastAny && lastAny.date === today && lastAny.completed === false;

    ST.trainHomeData = {
      notStarted: false,
      lastDate: (lastAny || lastWorkout).date,
      lastSession: (lastAny || lastWorkout).session_type,
      nextSession,
      streak,
      doneToday,
      inProgress,
    };
  } catch(e){
    console.warn('loadTrainingHomeData:', e.message);
    ST.trainHomeData = { notStarted: true, lastDate:null, lastSession:null, nextSession:'upperA', streak:0, doneToday:false, inProgress:false };
  }
}

// Wrapper storico: calcola la rotazione e aggiorna la Home (tile Training).
// Comportamento INVARIATO per tutti i chiamanti esistenti (compute → renderHome).
async function loadTrainingHomeData(){
  injuryDailyTick(); // infortunio multi-giorno: materializza la riga di oggi se periodo attivo
  await computeTrainHomeData();
  renderHome();
}

// Home V2 (Fase D Giro 1) — sostituisce la home legacy.
// Alias per i chiamanti storici (loadTrainingHomeData, loadBodyLogs, ecc.). Dal 2 ottobre 2026
// (Fondamenta 100, tappa 1) non disegna subito: prenota un disegno al prossimo fotogramma, e chi
// lo chiede nel frattempo trova la prenotazione già fatta. All'apertura i caricamenti della Home
// finiscono a grappolo e la disegnavano sette volte di fila; ora una per fotogramma.
// renderHomeV2 resta il disegno vero, subito: per chi deve leggere la pagina appena disegnata
// (le prove del banco).
let _homePrenotato = false;
function renderHome(){
  if(_homePrenotato) return;
  _homePrenotato = true;
  const disegna = () => { _homePrenotato = false; renderHomeV2(); };
  if(typeof requestAnimationFrame === 'function') requestAnimationFrame(disegna);
  else setTimeout(disegna, 0);
}

// Calcola il "prossimo checkpoint" Body partendo dall'ultimo check fisico completato.
// Frequenza checkpoint: 42 giorni (decisione "ogni 6 settimane"). Sorgente: timeline unificata
// filtrata per source='check' (solo body_measurements, che esistono solo per check_id completati).
function getNextCheckpointInfo(){
  if(ST.bodyMeasurements === null || ST.bodyMeasurements === undefined){
    return { hasCheck: false, daysUntil: null, overdue: false, loading: true };
  }
  const tl = (typeof getUnifiedBodyTimeline === 'function') ? getUnifiedBodyTimeline() : [];
  const checks = tl.filter(r => r.source === 'check' && r._ts);
  if(checks.length === 0){
    return { hasCheck: false, daysUntil: null, overdue: false, loading: false };
  }
  checks.sort((a,b) => b._ts - a._ts);
  const lastTs = checks[0]._ts;
  const nextTs = lastTs + 42 * 24 * 60 * 60 * 1000;
  const daysUntil = Math.ceil((nextTs - Date.now()) / (24 * 60 * 60 * 1000));

  // Checkpoint overdue solo in settimana scarico (sett 6 del mesociclo 5+1).
  // Settimana corrente: helper canonico getCycleWeekInfo (soli giorni di
  // lavoro, correttivo day-aware). Guardia: almeno 5 giri di lavoro completati
  // (workCount >= 5*workPerGiro — un giro per ogni settimana di carico).
  // Fallback (0 workout): comportamento classico (overdue se >42 gg).
  const validWorkoutsCount = (ST.trainAllCompleted || []).length;
  let overdue = daysUntil < 0;
  if(validWorkoutsCount > 0){
    const wk = getCycleWeekInfo();
    const isDeloadWeek = wk.isScarico && wk.workCount >= 5 * wk.workPerGiro;
    overdue = isDeloadWeek && daysUntil < 0;
  }

  return { hasCheck: true, daysUntil, overdue, loading: false };
}

// Suggerimento "DOPO L'ALLENAMENTO" contestuale all'orario del rendering.
// Fascia oraria → pasto di rifornimento successivo coerente coi MEAL_SLOTS.
function getPostWorkoutHint(){
  const h = new Date().getHours();
  if(h >= 5  && h < 10) return { eyebrow: "DOPO L'ALLENAMENTO", chip: "colazione zona" };
  if(h >= 10 && h < 12) return { eyebrow: "DOPO L'ALLENAMENTO", chip: "spuntino + colazione zona" };
  if(h >= 12 && h < 14) return { eyebrow: "DOPO L'ALLENAMENTO", chip: "pranzo zona" };
  if(h >= 14 && h < 18) return { eyebrow: "DOPO L'ALLENAMENTO", chip: "merenda + proteine" };
  if(h >= 18 && h < 21) return { eyebrow: "DOPO L'ALLENAMENTO", chip: "cena zona" };
  // 21-5: tarda sera / notte
  return { eyebrow: "DOPO L'ALLENAMENTO", chip: "cena leggera + proteine" };
}

// Logica semplice "PROSSIMA AZIONE" — 4 regole in ordine di priorità (Giro 1).
// Niente AI, niente chiamate di rete. Sostituita da una logica più ricca in Giro 2.
function getProssimaAzioneSimple(){
  // 1. Body checkpoint scaduto (solo se almeno un check è stato fatto e sono passati > 28 giorni).
  //    "Nessun check ancora" non scatta qui — il primo check è parte di M2 nell'onboarding.
  const cp = getNextCheckpointInfo();
  if(cp.hasCheck && cp.overdue){
    return {
      titolo: "È ora del check fisico",
      dettaglio: "Aggiorna foto, misure ed esami. Ci aiuta a calibrare il piano.",
      nextHint: null,
    };
  }

  // 2. Workout previsto oggi e non ancora completato (esclude recovery e rest).
  const hd = ST.trainHomeData;
  if(hasTraining() && hd && !hd.doneToday){
    const sid = hd.inProgress ? hd.lastSession : hd.nextSession;
    const isRecovery = sid === 'recoveryUpper' || sid === 'recoveryLower' || sid === 'rest';
    if(!isRecovery){
      const sess = getTrainingSession(sid) || getTrainingSession('upperA');
      return {
        titolo: hd.inProgress ? "Riprendi il workout" : "È ora del workout",
        dettaglio: `Sessione ${sess.name} a digiuno. Si parte con 5 minuti di preparazione.`,
        nextHint: getPostWorkoutHint(),
      };
    }
  }

  // 3. Pasti registrati oggi < 3 e ora >= 12:00 → ricorda il pranzo.
  const day = getDay(todayKey());
  const mealsCount = (day.meals || []).length;
  if(mealsCount < 3 && new Date().getHours() >= 12){
    return {
      titolo: "Hai mangiato a pranzo?",
      dettaglio: "Registra il pasto per tenere traccia dei macro.",
      nextHint: null,
    };
  }

  // 4. Default fallback.
  return {
    titolo: "Buona giornata",
    dettaglio: "Apri un modulo per iniziare.",
    nextHint: null,
  };
}

// ═══════════════════════════════════════════════════════════
// QUADRO SETTIMANALE — Fase 1 (12 set 2026)
// ═══════════════════════════════════════════════════════════
// Una fotografia della settimana (lunedì→domenica, ora locale del telefono)
// ricalcolata dai dati: peso · nutrizione · allenamento · corpo · esami.
// Nessuna decisione e nessuna AI: è l'ingresso del coach delle fasi 3-4.
//
// ⚠️ REGOLA: null = "non registrato", MAI zero. Le medie senza dati sono null;
// i conteggi (pesate, giorni, sessioni, serie) possono essere 0 perché sono
// un fatto, ma l'intero blocco è null se il modulo non è in uso.
//
// Divisa in due: _wpFetch legge (in parallelo, paginato, {error} controllato),
// computeWeeklyPicture calcola senza toccare la rete. buildWeeklyPicture unisce.
// Per le settimane passate "adesso" è la fine della settimana: un quadro chiuso
// ricalcolato domani dà gli stessi numeri (tranne computed_at).
// Il calcolo vive in shared/quadro.js, lo stesso che usa il cron del
// Worker il lunedì mattina (Fase 3, 13 set 2026). Qui restano la lettura con supabase-js,
// il caricamento/salvataggio e la vista; le funzioni con i nomi di prima sono involucri.
// shared/quadro.js: caricato dalla pagina prima di questo script (Fondamenta 035), non più copiato qui.

const WP_VERSION = ZTQuadro.WP_VERSION;

function wpMonday(d){ return ZTQuadro.mondayOf(dayKey(d)); }
function _wpR1(x){ if(x == null || !isFinite(x)) return null; const r = Math.round(x * 10) / 10; return r === 0 ? 0 : r; }   // arrotondamento della vista
function wpAddDays(key, n){ return ZTQuadro.addDays(key, n); }

// Pesate: una al giorno, weight_logs > body_logs > misure del check (L47).
// Regola unica per il quadro e per il tab Body: il "peso attuale" è lo stesso numero ovunque.
function weighInsByDay(weightLogs, bodyLogs, measurements){ return ZTQuadro.weighInsByDay(weightLogs, bodyLogs, measurements); }

// SELECT paginata: PostgREST tronca a 1000 righe (L13). mk() costruisce la query
// già ordinata; ogni pagina passa da dbq (L22), silenziosa: l'avviso lo dà chi
// mostra il quadro, uno solo per tutta la lettura.
async function _wpAll(label, mk){
  const PAGE = 1000;
  const out = [];
  for(let from = 0; ; from += PAGE){
    const res = await dbq('leggere ' + label + ' per il quadro', mk().range(from, from + PAGE - 1), { silenzioso:true });
    if(res.error) return { data:null, error:res.error };
    const rows = res.data || [];
    out.push(...rows);
    if(rows.length < PAGE) break;
  }
  return { data:out, error:null };
}

async function _wpFetch(userId, weekStart){
  const spec = ZTQuadro.fetchSpec(userId, weekStart, ST.profile && ST.profile.train_start_date);
  const esegui = (q) => () => {
    let x = supa.from(q.table).select(q.select);
    q.filters.forEach(([op, col, val]) => { x = x[op](col, val); });
    q.order.forEach(col => { x = x.order(col); });
    return x;
  };
  const keys = Object.keys(spec);
  const results = await Promise.all(keys.map(k => _wpAll(spec[k].label, esegui(spec[k]))));
  const raw = { errors: [] };
  keys.forEach((k, i) => {
    // body_check_ai non ancora creata: nessuna lettura, non un errore del quadro
    if(k === 'readings' && results[i].error && bcaTableMissing(results[i].error)) results[i] = { data: [], error: null };
    raw[k] = results[i].error ? null : results[i].data;
    if(results[i].error) raw.errors.push(k);
  });
  return raw;
}

// Calcolo puro (shared/quadro.js). raw = uscita di _wpFetch (una tabella a null = lettura fallita).
// ctx = { today, nowTs, profile, target, injuryActiveNow }: ciclo della scheda e scarichi
// accettati li aggiunge questo involucro, se il chiamante non li passa.
function computeWeeklyPicture(raw, weekStart, ctx){
  const c = { ...(ctx || {}) };
  if(c.workPerGiro == null) c.workPerGiro = ZTQuadro.workPerGiroForCycle(ST.userSessionCycle);
  if(c.deloads == null) c.deloads = _coachDeloadDates();
  return ZTQuadro.computeWeeklyPicture(raw, weekStart, c);
}

async function buildWeeklyPicture(weekStart, opts){
  const o = opts || {};
  const userId = o.userId || (ST.user && ST.user.id);
  if(!userId) return null;
  const raw = await _wpFetch(userId, weekStart);
  let injuryNow = false;
  try { injuryNow = !!(getInjuryPeriod() || getSoftReturn()); } catch(e){}
  return computeWeeklyPicture(raw, weekStart, {
    today: todayKey(), profile: ST.profile || {}, target: ST.TARGET, injuryActiveNow: injuryNow,
  });
}

// ── Caricamento: ST.weeklyPicture = { 'YYYY-MM-DD' (lunedì): quadro } per la sessione ──
// Settimana corrente: si ricalcola sempre (a ogni apertura della Home, force).
// Settimane chiuse: prima dalla tabella weekly_pictures; se la riga non c'è si
// calcola e si salva. Un quadro con letture fallite non si salva mai: congelerebbe
// dei null che non sono "non registrato" ma "non letto".
const _wpInflight = {};
let _wpTableOk = true;   // diventa false se weekly_pictures non risponde: da lì solo calcolo dal vivo
function _wpUsable(){ return !!(ST.user && ST.user.id && ST.user.id !== 'test-user-001'); }
function _wpTableError(res, cosa){
  if(!res.error) return false;
  const code = res.error.code || '';
  // Tabella assente (migrazione non ancora eseguita): si smette di chiederla per la sessione.
  if(code === 'PGRST205' || code === '42P01' || /weekly_pictures/.test(res.error.message || '')) _wpTableOk = false;
  console.warn('[quadro] ' + cosa + ':', res.error.message || res.error);
  return true;
}
async function _wpReadStored(ws){
  if(!_wpTableOk) return null;
  const res = await dbq('leggere il quadro salvato', supa.from('weekly_pictures')
    .select('picture').eq('user_id', ST.user.id).eq('week_start', ws).maybeSingle(), { silenzioso:true });
  if(_wpTableError(res, 'lettura storico')) return null;
  return (res.data && res.data.picture) || null;
}
// Salva solo settimane CHIUSE e lette per intero. ignoreDuplicates: una riga che
// esiste già non si riscrive (niente doppioni, niente sovrascritture a sorpresa).
// Unica eccezione, dichiarata: { overwrite:true } per una riga salvata con una
// WP_VERSION più vecchia, che si ricalcola e si sovrascrive.
async function _wpSaveClosed(pics, opts){
  const righe = pics.filter(p => p && p.meta && p.meta.is_closed && !(p.meta.errors || []).length && p.meta.week_start < wpMonday())
    .map(p => ({ user_id: ST.user.id, week_start: p.meta.week_start, picture: p, computed_at: p.meta.computed_at }));
  if(!righe.length || !_wpTableOk) return 0;
  const res = await dbq('salvare lo storico dei quadri', supa.from('weekly_pictures')
    .upsert(righe, { onConflict: 'user_id,week_start', ignoreDuplicates: !(opts && opts.overwrite) }), { silenzioso:true });
  if(_wpTableError(res, 'salvataggio storico')) return 0;
  return righe.length;
}
function loadWeeklyPicture(weekStart, opts){
  const o = opts || {};
  if(!_wpUsable()) return Promise.resolve(null);
  ST.weeklyPicture = ST.weeklyPicture || {};
  const cur = wpMonday();
  const ws = weekStart > cur ? cur : weekStart;
  if(ST.weeklyPicture[ws] && !(o.force && ws === cur)) return Promise.resolve(ST.weeklyPicture[ws]);
  if(_wpInflight[ws]) return _wpInflight[ws];
  const p = (async () => {
    try {
      let pic = ws < cur ? await _wpReadStored(ws) : null;
      if(pic && ((pic.meta && pic.meta.version) || 1) < WP_VERSION){
        // Riga di una versione vecchia del calcolo (v1: nutrizione senza integratori):
        // si ricalcola e, se letta per intero, si sovrascrive. Se la lettura fallisce resta quella salvata.
        const nuovo = await buildWeeklyPicture(ws);
        if(nuovo && !nuovo.meta.errors.length){ pic = nuovo; _wpSaveClosed([nuovo], { overwrite:true }); }
      }
      if(pic && pic.weight && pic.weight.weight_last === undefined){
        // Riga salvata prima di weight_last (13 set 2026): la riga non si riscrive,
        // i due campi nuovi si ricalcolano solo per la vista. Tutto il resto resta quello salvato.
        const vivo = await buildWeeklyPicture(ws);
        if(vivo && vivo.weight && !vivo.meta.errors.length){
          pic = { ...pic, weight: { ...pic.weight, weight_last: vivo.weight.weight_last, weight_last_date: vivo.weight.weight_last_date } };
        }
      }
      if(!pic){
        pic = await buildWeeklyPicture(ws);
        if(pic && ws < cur) _wpSaveClosed([pic]);          // chiusa senza riga: la si salva
        if(pic && pic.meta.errors.length && !o.silenzioso){
          try { showToast('Non riesco a leggere tutti i dati della settimana', '⚠️', 5500); } catch(e){}
        }
      }
      if(pic) ST.weeklyPicture[ws] = pic;
      return pic;
    } catch(e){
      console.error('[quadro] calcolo fallito:', e);
      return ST.weeklyPicture[ws] || null;
    } finally {
      delete _wpInflight[ws];
    }
  })();
  _wpInflight[ws] = p;
  return p;
}
// All'apertura dell'app, una volta per sessione: le settimane chiuse fino a 8
// indietro che non hanno ancora una riga si calcolano e si salvano. Mai prima
// della settimana in cui il profilo è nato. Una alla volta, in sottofondo.
const WP_BACKFILL_WEEKS = 8;
let _wpBackfillStarted = false;
async function weeklyPicturesBackfill(){
  if(_wpBackfillStarted || !_wpUsable() || !_wpTableOk) return;
  _wpBackfillStarted = true;
  try {
    const cur = wpMonday();
    const first = _wpFirstWeek();
    const settimane = Array.from({ length: WP_BACKFILL_WEEKS }, (_, k) => wpAddDays(cur, -7 * (k + 1)))
      .filter(ws => !first || ws >= first);
    if(!settimane.length) return;
    const res = await dbq('leggere lo storico dei quadri', supa.from('weekly_pictures')
      .select('week_start, picture->meta->version').eq('user_id', ST.user.id).in('week_start', settimane), { silenzioso:true });
    if(_wpTableError(res, 'backfill')) return;
    const presenti = new Set((res.data || []).map(r => r.week_start));
    const mancanti = settimane.filter(ws => !presenti.has(ws));
    // Righe di una versione vecchia: ricalcolate e sovrascritte, una alla volta come le mancanti
    const vecchie = (res.data || []).filter(r => (Number(r.version) || 1) < WP_VERSION).map(r => r.week_start);
    const aggiornati = [];
    for(const ws of vecchie){
      const pic = await buildWeeklyPicture(ws);
      if(pic && !pic.meta.errors.length){ aggiornati.push(pic); ST.weeklyPicture = ST.weeklyPicture || {}; ST.weeklyPicture[ws] = pic; }
    }
    const nAgg = await _wpSaveClosed(aggiornati, { overwrite:true });
    if(nAgg) console.log('[quadro] storico: ' + nAgg + ' settimane ricalcolate alla versione ' + WP_VERSION);
    const calcolati = [];
    for(const ws of mancanti){
      const pic = await buildWeeklyPicture(ws);
      if(!pic) continue;
      calcolati.push(pic);
      ST.weeklyPicture = ST.weeklyPicture || {};
      if(!ST.weeklyPicture[ws]) ST.weeklyPicture[ws] = pic;
    }
    const n = await _wpSaveClosed(calcolati);
    if(n) console.log('[quadro] storico: ' + n + ' settimane salvate');
  } catch(e){
    console.warn('[quadro] backfill:', e);
  }
}
function _wpRerenderIfOpen(){ if(ST.page === 'home') renderHome(); }

// ── Formattazione: italiano, virgola decimale, segno vero ──
function _wpNum(v, dec){
  if(v == null || !isFinite(v)) return null;
  // Separatore delle migliaia sempre (2.302), come la card Nutrition: it-IT da solo non raggruppa le 4 cifre.
  const [int, frac] = Math.abs(Number(v)).toFixed(dec || 0).split('.');
  return (Number(v) < 0 ? '-' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (frac ? ',' + frac : '');
}
function _wpSigned(v, dec){
  if(v == null || !isFinite(v)) return null;
  const s = _wpNum(Math.abs(v), dec);
  return (v > 0 ? '+' : v < 0 ? '−' : '') + s;
}
const _WP_MON = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
function _wpShortDate(key){ const d = new Date(key + 'T12:00:00'); return d.getDate() + ' ' + _WP_MON[d.getMonth()]; }
function _wpRange(ws){
  const a = new Date(ws + 'T12:00:00'), b = new Date(wpAddDays(ws, 6) + 'T12:00:00');
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${_WP_MON[b.getMonth()]}`
    : `${a.getDate()} ${_WP_MON[a.getMonth()]} – ${b.getDate()} ${_WP_MON[b.getMonth()]}`;
}
function _wpStat(label, value, unit, extra){
  const val = value == null
    ? `<div class="wp-stat-val wp-nr">Non registrato</div>`
    : `<div class="wp-stat-val">${value}${unit ? `<span class="wp-unit">${unit}</span>` : ''}</div>`;
  return `<div class="wp-stat"><div class="wp-stat-lbl">${label}</div>${val}${extra ? `<div class="wp-delta">${extra}</div>` : ''}</div>`;
}
function _wpPill(txt, bg, fg){ return `<span class="wp-pill" style="background:${bg};color:${fg};">${txt}</span>`; }

// ── Peso attuale: numero grande = ultima pesata, sotto la media e l'obiettivo ──
// "Attuale" vuol dire non più vecchia di 7 giorni rispetto all'adesso del quadro
// (oggi per la settimana in corso, la domenica per una chiusa). L'etichetta di data
// invece si legge sempre da oggi: "ieri", "3 giorni fa", oltre i 7 giorni la data.
const WP_WEIGHT_FRESH_DAYS = 7;
function _wpDaysBetween(fromKey, toKey){ return Math.round((new Date(toKey + 'T12:00:00') - new Date(fromKey + 'T12:00:00')) / 86400000); }
function _wpWhen(key, today){
  const n = _wpDaysBetween(key, today);
  if(n <= 0) return 'oggi';
  if(n === 1) return 'ieri';
  if(n <= WP_WEIGHT_FRESH_DAYS) return n + ' giorni fa';
  return _wpShortDate(key);
}
function _wpWeightView(pic, today){
  const w = pic.weight || {};
  const ref = pic.meta.is_closed ? pic.meta.week_end : today;
  const fresh = w.weight_last != null && !!w.weight_last_date && _wpDaysBetween(w.weight_last_date, ref) <= WP_WEIGHT_FRESH_DAYS;
  let media;
  if(!w.weight_n) media = 'Nessuna pesata questa settimana';
  else if(w.weight_n === 1) media = '1 pesata questa settimana';                // una sola: la media non dice niente
  else media = `Media settimana ${_wpNum(w.weight_avg, 1)} kg` + (w.weight_delta_prev != null ? ` · ${_wpSigned(w.weight_delta_prev, 1)} kg rispetto alla scorsa` : '');
  let goal = null;
  if(w.weight_target != null){
    goal = `Obiettivo ${_wpNum(w.weight_target, w.weight_target % 1 ? 1 : 0)} kg`;
    if(fresh){
      const diff = _wpR1(w.weight_last - w.weight_target);
      goal += diff === 0 ? ' · raggiunto' : ` · mancano ${_wpNum(Math.abs(diff), 1)} kg ${diff > 0 ? 'da perdere' : 'da prendere'}`;
    }
  }
  return { fresh, value: fresh ? _wpNum(w.weight_last, 1) : null, when: fresh ? _wpWhen(w.weight_last_date, today) : null, media, goal };
}
function _wpWeightHeroHTML(pic, opts){
  const o = opts || {};
  const v = _wpWeightView(pic, todayKey());
  const numero = v.fresh
    ? `<div class="wp-hero-row"><div class="wp-hero-val">${v.value}<span class="wp-unit">kg</span></div><span class="wp-hero-when">${v.when}</span></div>`
    : `<div class="wp-hero-val wp-nr">Non registrato</div>`;
  return `<div class="wp-hero ${o.cls || ''}">
      <div class="wp-stat-lbl">Peso attuale</div>
      ${numero}
      <div class="wp-hero-line">${v.media}</div>
      ${v.goal ? `<div class="wp-hero-line">${v.goal}</div>` : ''}
      ${!v.fresh && o.button ? `<button class="wp-go wp-go-inline" onclick="event.stopPropagation();quadroGo('peso')">Pesati →</button>` : ''}
    </div>`;
}

// ── Card in cima alla Home ──
function _wpHomeCardHTML(){
  if(!_wpUsable()) return '';
  const cur = wpMonday();
  const pic = ST.weeklyPicture && ST.weeklyPicture[cur];
  const mini = (label, value, unit) => `<div class="wp-mini-stat"><div class="wp-mini-lbl">${label}</div>${value == null
    ? '<div class="wp-mini-val wp-nr">Non registrato</div>'
    : `<div class="wp-mini-val">${value}${unit ? `<span class="wp-unit">${unit}</span>` : ''}</div>`}</div>`;
  let inner;
  if(!pic){
    inner = `<div class="wp-mini-sub" style="margin-top:0;">Caricamento…</div>`;
  } else {
    const t = pic.training;
    const hero = pic.weight ? _wpWeightHeroHTML(pic, { cls: 'wp-hero-card', button: true }) : '';
    const stats = [
      pic.weight ? '' : mini('Peso attuale', null, ''),                        // lettura fallita
      t ? mini('Sessioni', !t.sessions_done ? null : t.sessions_planned != null ? `${t.sessions_done}/${t.sessions_planned}` : String(t.sessions_done), '') : '',
      mini('Kcal medie', _wpNum(pic.nutrition && pic.nutrition.kcal_avg), ''),
    ].join('');
    const aree = Math.round((pic.meta.completeness || 0) * 5);
    inner = `${hero}<div class="wp-mini">${stats}</div>
      <div class="wp-mini-sub">${_wpRange(cur)} · ${aree} di 5 aree con dati</div>`;
  }
  return `
    <div class="home-v2-card" onclick="openQuadro()">
      <span class="home-v2-card-dot" style="background:var(--acc);"></span>
      <div style="flex:1;min-width:0;">
        <div class="home-v2-card-title">La tua settimana</div>
        ${inner}
      </div>
      <span class="home-v2-card-arrow">›</span>
    </div>`;
}

// ── Vista completa ──
function openQuadro(){
  ST.homeView = 'quadro';
  ST.quadroWeek = wpMonday();
  renderHome();
  try { window.scrollTo(0, 0); } catch(e){}
  loadWeeklyPicture(ST.quadroWeek).then(_wpRerenderIfOpen);
}
function closeQuadro(){
  ST.homeView = null;
  renderHome();
  try { window.scrollTo(0, 0); } catch(e){}
}
function _wpFirstWeek(){
  const c = ST.profile && ST.profile.created_at;
  return c ? wpMonday(new Date(c)) : null;
}
function quadroShift(dir){
  const cur = wpMonday();
  let ws = wpAddDays(ST.quadroWeek || cur, dir * 7);
  if(ws > cur) ws = cur;
  const first = _wpFirstWeek();
  if(first && ws < first) ws = first;
  ST.quadroWeek = ws;
  renderHome();
  loadWeeklyPicture(ws).then(() => { if(ST.quadroWeek === ws) _wpRerenderIfOpen(); });
}
// I pulsanti delle sezioni portano dove il dato si inserisce.
function quadroGo(dest){
  if(dest === 'peso'){ openWeighInSheet(); return; }     // il foglio si apre sopra il quadro
  ST.homeView = null;
  if(dest === 'pasti') showPage('oggi');
  else if(dest === 'allenamento') showPage('training');
  else { ST.bodyTab = 'check'; showPage('body'); }      // check ed esami stanno nel tab Check
}

function renderQuadroView(){
  const cur = wpMonday();
  const ws = ST.quadroWeek || cur;
  const pic = ST.weeklyPicture && ST.weeklyPicture[ws];
  const first = _wpFirstWeek();
  const head = `
    <div class="wp-top"><button class="wp-back" onclick="closeQuadro()">‹ Home</button></div>
    <div>
      <div class="home-v2-date">QUADRO SETTIMANALE</div>
      <div class="wp-title">La tua settimana</div>
      <div class="wp-nav">
        <button class="wp-nav-btn" onclick="quadroShift(-1)" ${first && ws <= first ? 'disabled' : ''} aria-label="Settimana precedente">‹</button>
        <div class="wp-range">${_wpRange(ws)}<span class="wp-range-sub">${ws === cur ? 'Settimana in corso' : ws === wpAddDays(cur, -7) ? 'Settimana scorsa' : 'Settimana chiusa'}${pic ? ' · ' + Math.round((pic.meta.completeness || 0) * 5) + ' di 5 aree con dati' : ''}</span></div>
        <button class="wp-nav-btn" onclick="quadroShift(1)" ${ws >= cur ? 'disabled' : ''} aria-label="Settimana successiva">›</button>
      </div>
    </div>`;
  if(!pic){
    return head + `<div class="wp-loading">Caricamento…</div>`;
  }
  const err = pic.meta.errors || [];
  const failed = (keys) => keys.some(k => err.includes(k));
  const nonLetto = 'Non sono riuscito a leggere questi dati: riprova tra poco.';
  const sezione = (tint, titolo, pills, stats, ctx, btn) => `
    <section class="wp-sec">
      <div class="wp-sec-head"><span class="wp-dot" style="background:${tint};"></span><span class="wp-sec-title">${titolo}</span>${pills || ''}</div>
      <div class="wp-grid">${stats}</div>
      ${ctx ? `<div class="wp-ctx">${ctx}</div>` : ''}
      ${btn || ''}
    </section>`;
  const vai = (dest, label) => `<button class="wp-go" onclick="quadroGo('${dest}')">${label} →</button>`;

  // Peso
  // Peso: il numero grande è l'ultima pesata; media, confronto e obiettivo nelle righe sotto
  const w = pic.weight || {};
  const secPeso = sezione('#5E4A7A', 'Peso', '',
    (pic.weight ? _wpWeightHeroHTML(pic) : _wpStat('Peso attuale', null)) +
    _wpStat('Pesate', w.weight_n ? String(w.weight_n) : null, '') +
    _wpStat('Tendenza 4 sett.', _wpSigned(w.weight_trend_4w, 1), 'kg/sett'),
    pic.weight ? '' : failed(['weightLogs','bodyLogs','measurements']) ? nonLetto : 'Nessuna pesata',
    vai('peso', 'Pesati'));

  // Nutrizione
  const n = pic.nutrition || {};
  let ctxNutr;
  if(!pic.nutrition) ctxNutr = nonLetto;
  else if(!n.days_logged) ctxNutr = 'Nessun pasto registrato in questa settimana';
  else if(n.partial) ctxNutr = `Dato parziale: in ${n.days_partial} giorni su ${n.days_logged} mancano almeno due pasti fra colazione, pranzo e cena. I numeri non sono corretti con stime.`;
  else ctxNutr = `Media sui ${n.days_logged} giorni con almeno un pasto, integratori compresi${n.supp_kcal_avg ? ` (${_wpNum(n.supp_kcal_avg)} kcal al giorno)` : ''}${n.kcal_target ? ` · target ${_wpNum(n.kcal_target)} kcal` : ''}`;
  const dentro = (n.adherence_kcal != null && n.days_logged) ? Math.round(n.adherence_kcal * n.days_logged) : null;
  const secNutr = sezione('#FAC775', 'Nutrizione', n.partial ? _wpPill('Parziale', '#FFF3DC', '#854F0B') : '',
    _wpStat('Kcal medie', _wpNum(n.kcal_avg), n.kcal_target ? `/ ${_wpNum(n.kcal_target)}` : '') +
    _wpStat('Proteine medie', _wpNum(n.protein_avg), 'g') +
    _wpStat('Giorni registrati', n.days_logged ? String(n.days_logged) : null, '/ 7') +
    _wpStat('Nel target ±10%', dentro != null ? String(dentro) : null, `/ ${n.days_logged} giorni`),
    ctxNutr, vai('pasti', 'Pasti'));

  // Allenamento
  const t = pic.training;
  let secTrain;
  if(!t){
    secTrain = sezione('#B5D4F4', 'Allenamento', '',
      _wpStat('Sessioni', null) + _wpStat('Serie', null),
      failed(['workouts','sets']) ? nonLetto : 'Nessun allenamento registrato',
      hasTraining() ? vai('allenamento', 'Allenamento') : '');
  } else {
    const parti = [];
    if(!pic.meta.is_closed) parti.push('Settimana in corso');
    else if(t.sessions_missed != null) parti.push(t.sessions_missed === 0
      ? `Fatte tutte le ${t.sessions_planned} sessioni previste`
      : `${t.sessions_missed} ${t.sessions_missed === 1 ? 'sessione' : 'sessioni'} in meno delle ${t.sessions_planned} previste`);
    if(t.recovery_done) parti.push(`${t.recovery_done} ${t.recovery_done === 1 ? 'recupero attivo' : 'recuperi attivi'}`);
    if(t.injury_days) parti.push(`${t.injury_days} ${t.injury_days === 1 ? 'giorno' : 'giorni'} di infortunio segnati`);
    else if(t.injury_active) parti.push('Infortunio o rientro in corso');
    const pills = (t.is_deload ? _wpPill('Scarico', '#E6F0FA', '#2F5E8C') : '') + (t.injury_active ? _wpPill('Infortunio', 'var(--err-lt)', 'var(--err)') : '');
    secTrain = sezione('#B5D4F4', 'Allenamento', pills,
      // Un conteggio a zero a schermo è "Non registrato" (regola del quadro); nell'oggetto resta 0.
      _wpStat('Sessioni', !t.sessions_done ? null : t.sessions_planned != null ? `${t.sessions_done}/${t.sessions_planned}` : String(t.sessions_done), '') +
      _wpStat('Serie', t.volume_sets ? String(t.volume_sets) : null, '') +
      _wpStat('RIR medio', _wpNum(t.avg_rir, 1), '') +
      _wpStat('Settimana ciclo', t.block_week != null ? String(t.block_week) : null, '/ 6'),
      parti.join(' · ') || 'Nessuna sessione in questa settimana',
      hasTraining() ? vai('allenamento', 'Allenamento') : '');
  }

  // Corpo
  const b = pic.body || {};
  const lm = b.last_measurements || {};
  const misura = (key, label) => {
    const m = lm[key];
    if(!m) return _wpStat(label, null);
    return _wpStat(label, _wpNum(m.value, m.value % 1 ? 1 : 0), 'cm', m.delta != null ? `${_wpSigned(m.delta, 1)} cm dal check prima` : '');
  };
  let ctxCorpo;
  if(!pic.body) ctxCorpo = nonLetto;
  else if(!b.last_check_date) ctxCorpo = 'Nessun check fisico completato';
  else ctxCorpo = `Check del ${_wpShortDate(b.last_check_date)}${b.prev_check_date ? ` · differenze rispetto al check del ${_wpShortDate(b.prev_check_date)}` : ''}`;
  if(b.check_due) ctxCorpo += ' · È ora del check di fine blocco';
  if(b.ai_overall){
    const conf = BCA_CONF[b.ai_confidence] || BCA_CONF.bassa;
    ctxCorpo += `<div class="wp-ai-line"><span class="bca-dot" style="background:${conf.col};"></span>Lettura foto del ${_wpShortDate(b.ai_check_date)}: ${(BCA_OVERALL[b.ai_overall] || b.ai_overall).toLowerCase()} · ${conf.lbl.toLowerCase()}</div>`;
  }
  const secCorpo = sezione('#5E4A7A', 'Corpo', b.check_due ? _wpPill('Check da fare', '#EDE9F8', '#5E4A7A') : '',
    _wpStat('Ultimo check', b.days_since_check != null ? String(b.days_since_check) : null, b.days_since_check === 1 ? 'giorno fa' : 'giorni fa') +
    misura('waist_cm', 'Vita') + misura('hips_cm', 'Fianchi') + misura('chest_cm', 'Petto'),
    ctxCorpo, vai('check', 'Check'));

  // Esami
  const e = pic.blood || {};
  const secEsami = sezione('#AFA9EC', 'Esami', '',
    _wpStat('Ultimo esame', e.last_test_date ? _wpShortDate(e.last_test_date) : null, '') +
    _wpStat('Giorni fa', e.days_since_test != null ? String(e.days_since_test) : null, '') +
    _wpStat('Esami registrati', pic.blood && e.test_count ? String(e.test_count) : null, ''),
    !pic.blood ? nonLetto : e.last_test_date ? `Ultimo esame del sangue del ${_wpShortDate(e.last_test_date)}` : 'Nessun esame del sangue registrato',
    vai('esami', 'Esami'));

  const alert = err.length ? `<div class="wp-alert">Alcuni dati non si sono caricati: le sezioni interessate lo dicono.</div>` : '';
  return head + alert + secPeso + secNutr + secTrain + secCorpo + secEsami + _cpHistoryHTML(ws);
}

function renderHomeV2(){
  // Quadro settimanale aperto: la Home mostra la vista completa al posto delle card.
  if(ST.homeView === 'quadro' && _wpUsable()){
    document.getElementById('page-home').innerHTML = `<div class="home-v2-wrap">${renderQuadroView()}${versionFooter()}</div>`;
    return;
  }
  return _renderHomeCards();
}

function _renderHomeCards(){
  // ── Dati nutrition (riusa dayTotals + ST.TARGET già esistenti) ──
  const today = todayKey();
  const day   = getDay(today);
  const cons  = dayTotals(day);
  const target = ST.TARGET || {kcal:2000, protein:150, carbs:200, fat:67};

  // ── Saluto + data ──
  const profile = ST.profile || {};
  const firstName = String(profile.first_name || '').trim();
  const lastName  = String(profile.last_name  || '').trim();
  const initials  = ((firstName.charAt(0) + lastName.charAt(0)).toUpperCase()) || (firstName.charAt(0) || '?').toUpperCase();
  const now = new Date();
  const h = now.getHours();
  let salutoBase;
  if(h < 5) salutoBase = 'Notte';
  else if(h < 12) salutoBase = 'Buongiorno';
  else if(h < 18) salutoBase = 'Buon pomeriggio';
  else salutoBase = 'Buonasera';
  const greeting = firstName ? `${salutoBase}, ${firstName}.` : `${salutoBase}.`;
  const DAYS_FULL   = ['DOMENICA','LUNEDÌ','MARTEDÌ','MERCOLEDÌ','GIOVEDÌ','VENERDÌ','SABATO'];
  const MONTHS_FULL = ['GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'];
  const dateStr = `${DAYS_FULL[now.getDay()]} ${now.getDate()} ${MONTHS_FULL[now.getMonth()]}`;

  // ── Card Nutrition: donut + 3 macro — modello ibrido coerente col modulo Nutrition.
  //    Anello: si RIEMPIE col consumo (% consumata). Numeri: mostrano i RIMASTI.
  //    Riusa kcalRimaste()/macroRimasti()/isOverTarget()/OVER_COLOR — niente duplicazione.
  const kcalCons   = Math.max(0, Number(cons.kcal) || 0);
  const kcalTarget = Math.max(1, Number(target.kcal) || 1);
  const overKcal   = isOverTarget(kcalCons, kcalTarget);
  const kcalPct    = overKcal ? 100 : Math.min(100, Math.round((kcalCons / kcalTarget) * 100));
  const C          = 2 * Math.PI * 34;                 // ~213.6
  const dashLen    = ((kcalPct / 100) * C).toFixed(1);
  const ringStroke = overKcal ? OVER_COLOR : 'var(--acc)';
  const remKcal    = kcalRimaste(kcalCons, kcalTarget);
  const kcalDisp   = `${overKcal ? '+' : ''}${fmtNum(Math.abs(remKcal))}`;
  const kcalLbl    = overKcal ? 'oltre' : (remKcal === 0 && kcalCons > 0 ? 'target ✓' : 'rimaste');
  const kcalNumCol = overKcal ? OVER_COLOR : 'var(--t1)';
  // Helper macro: ritorna { value, color } pronti per il render (rimasti, con +N se oltre).
  function macroDisp(curr, tgt){
    if(!tgt || tgt <= 0) return { value: '—', color: 'var(--t3)' };
    const over = isOverTarget(curr, tgt);
    const rem  = macroRimasti(curr, tgt);
    return {
      value: `${over ? '+' : ''}${fmtNum(Math.abs(rem))}`,
      color: over ? OVER_COLOR : 'var(--t1)',
    };
  }
  const mC = macroDisp(cons.carbs,   target.carbs);
  const mP = macroDisp(cons.protein, target.protein);
  const mF = macroDisp(cons.fat,     target.fat);
  const nutritionCard = `
    <div class="home-v2-card" onclick="showPage('oggi')">
      <span class="home-v2-card-dot" style="background:var(--mod-nutrition);"></span>
      <div style="flex:1;min-width:0;">
        <div class="home-v2-card-title">Nutrition</div>
        <div class="home-v2-nutr">
          <div class="home-v2-donut">
            <svg class="home-v2-donut-svg" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--s3)" stroke-width="6"/>
              <circle cx="40" cy="40" r="34" fill="none" stroke="${ringStroke}" stroke-width="6"
                      stroke-dasharray="${dashLen} ${C.toFixed(1)}" stroke-linecap="round"/>
            </svg>
            <div class="home-v2-donut-inner">
              <span class="home-v2-donut-num${Math.abs(remKcal) >= 1000 ? ' small' : ''}" style="color:${kcalNumCol};">${kcalDisp}</span>
              <span class="home-v2-donut-sub">${kcalLbl}</span>
            </div>
          </div>
          <div class="home-v2-macro-list">
            <div class="home-v2-macro-row">
              <span class="home-v2-macro-label" style="color:var(--carb);">CARB</span>
              <span><span class="home-v2-macro-value" style="color:${mC.color};">${mC.value}</span><span class="home-v2-macro-unit">g</span></span>
            </div>
            <div class="home-v2-macro-row">
              <span class="home-v2-macro-label" style="color:var(--acc);">PROT</span>
              <span><span class="home-v2-macro-value" style="color:${mP.color};">${mP.value}</span><span class="home-v2-macro-unit">g</span></span>
            </div>
            <div class="home-v2-macro-row">
              <span class="home-v2-macro-label" style="color:var(--fat);">FAT</span>
              <span><span class="home-v2-macro-value" style="color:${mF.color};">${mF.value}</span><span class="home-v2-macro-unit">g</span></span>
            </div>
          </div>
        </div>
      </div>
      <span class="home-v2-card-arrow">›</span>
    </div>`;

  // ── Card Training (riusa ST.trainHomeData già popolato da loadTrainingHomeData) ──
  // Settimana del programma: ciclo 6 settimane (CARICO×5 + SCARICO×1) che si ripete.
  // Nessun "totale assoluto" definito — si mostra la posizione nel ciclo corrente (N / 6).
  // Richiede ST.trainAllCompleted (caricato in showPage('home')).
  let trainingCard = '';
  if(hasTraining()){
    const hd = ST.trainHomeData;
    // Fonte unica: getCycleWeekInfo() — il calcolo inline precedente aveva il
    // divisore hardcoded a 6 e contava anche i recovery, quindi poteva divergere
    // dal numero mostrato in Programma.
    const cycleWeek = getCycleWeekInfo().weekNum;
    const weekStr = `SETTIMANA ${cycleWeek} / 6`;
    let sessName, weekEyebrow;
    if(!hd || hd.notStarted){
      const firstSess = getTrainingSession('upperA');
      sessName = `Sessione ${firstSess.name}`;
      weekEyebrow = `INIZIA IL PROGRAMMA · ${weekStr}`;
    } else if(hd.doneToday){
      const completedSess = getTrainingSession(hd.lastSession) || getTrainingSession('upperA');
      const nextSessObj   = getTrainingSession(hd.nextSession) || getTrainingSession('upperA');
      sessName = `Sessione ${completedSess.name}`;
      weekEyebrow = `COMPLETATA · ${weekStr} · PROSSIMA: ${nextSessObj.name.toUpperCase()}`;
    } else if(hd.inProgress){
      const sessObj = getTrainingSession(hd.lastSession) || getTrainingSession('upperA');
      sessName = `Sessione ${sessObj.name}`;
      weekEyebrow = `SESSIONE IN CORSO · ${weekStr}`;
    } else {
      const nextSessObj = getTrainingSession(hd.nextSession) || getTrainingSession('upperA');
      // FASE B.1 — mappa adattiva: con scheda 5gg nextSession può essere 'upperC'/'rest'
      // (non presenti in SESSION_DAY_NUM 6gg) → _rotationDayMap dà il numero corretto.
      const nextDayN    = _rotationDayMap()[hd.nextSession] || '?';
      sessName    = `Sessione ${nextSessObj.name}`;
      weekEyebrow = `GIORNO ${nextDayN} · ${(nextSessObj.type||'').toUpperCase()} · ${weekStr}`;
    }
    trainingCard = `
      <div class="home-v2-card" onclick="showPage('training')">
        <span class="home-v2-card-dot" style="background:var(--mod-training);"></span>
        <div class="home-v2-train-flex">
          <div class="home-v2-card-title">Training</div>
          <div class="home-v2-train-name">${esc(sessName)}</div>
          <div class="home-v2-train-sub">${esc(weekEyebrow)}</div>
        </div>
        <span class="home-v2-card-arrow">›</span>
      </div>`;
  }

  // ── Card Body (riusa getLatestBodyData + getUnifiedBodyTimeline) ──
  let bodyCard;
  const loadingBody = ST.bodyLogs === null || ST.bodyMeasurements === null;
  if(loadingBody){
    bodyCard = `
      <div class="home-v2-card" onclick="showPage('body')">
        <span class="home-v2-card-dot" style="background:var(--mod-body);"></span>
        <div class="home-v2-body-flex">
          <div class="home-v2-card-title">Body</div>
          <div class="home-v2-body-line"><span class="home-v2-body-weight">—</span></div>
          <div class="home-v2-body-sub">CARICAMENTO…</div>
        </div>
        <span class="home-v2-card-arrow">›</span>
      </div>`;
  } else {
    const bData   = getLatestBodyData();
    const weights = getWeighIns();                 // pesate rapide comprese, come il tab Body
    const w       = bData.weight_kg ?? profile.weight_kg ?? null;
    const wPrev   = weights.length > 1 ? weights[1].weight_kg : null;
    let deltaHTML = '';
    if(w != null && wPrev != null){
      const diff = (w - wPrev);
      const absD = Math.abs(diff);
      // Colore delta in base alla direzione obiettivo (goal_weight_kg vs weight_kg).
      // - goal < attuale - 1 → vuole dimagrire → ↓ = verde, ↑ = rosso
      // - goal > attuale + 1 → vuole ingrassare → ↑ = verde, ↓ = rosso
      // - |goal - attuale| <= 1 → mantenimento → qualsiasi delta = grigio neutro
      const goal = Number(profile.goal_weight_kg);
      const curr = Number(w);
      let color;
      if(absD < 0.05){
        color = 'var(--t3)';
      } else if(!isFinite(goal) || !isFinite(curr) || Math.abs(goal - curr) <= 1){
        // Mantenimento o obiettivo non impostato → neutro
        color = 'var(--t3)';
      } else if(goal < curr){
        // Vuole dimagrire
        color = diff < 0 ? '#2A7A6F' : '#B84C2A';
      } else {
        // Vuole ingrassare
        color = diff > 0 ? '#2A7A6F' : '#B84C2A';
      }
      const arrow = absD < 0.05 ? '' : (diff > 0 ? '↑' : '↓');
      const sign  = diff > 0 ? '+' : '';
      deltaHTML = `<span class="home-v2-body-delta" style="color:${color};">${arrow ? arrow + ' ' : ''}${sign}${diff.toFixed(1)}</span>`;
    }
    const cp = getNextCheckpointInfo();
    let cpLabel;
    if(!cp.hasCheck) cpLabel = 'PRIMO CHECKPOINT DA FARE';
    else if(cp.overdue) cpLabel = 'CHECKPOINT IN RITARDO';
    else if(cp.daysUntil === 0) cpLabel = 'CHECKPOINT OGGI';
    else if(cp.daysUntil < 0 && !cp.overdue) cpLabel = 'CHECKPOINT A FINE MESOCICLO';
    else cpLabel = `CHECKPOINT TRA ${cp.daysUntil} GIORN${cp.daysUntil === 1 ? 'O' : 'I'}`;
    bodyCard = `
      <div class="home-v2-card" onclick="showPage('body')">
        <span class="home-v2-card-dot" style="background:var(--mod-body);"></span>
        <div class="home-v2-body-flex">
          <div class="home-v2-card-title">Body</div>
          <div class="home-v2-body-line">
            <span class="home-v2-body-weight">${w != null ? w : '—'}</span>
            ${w != null ? '<span class="home-v2-body-unit">kg</span>' : ''}
            ${deltaHTML}
          </div>
          <div class="home-v2-body-sub">${cpLabel}</div>
        </div>
        <span class="home-v2-card-arrow">›</span>
      </div>`;
  }

  // ── Pannello PROSSIMA AZIONE ──
  const azione  = getProssimaAzioneSimple();
  const oraStr  = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const nextHintHTML = azione.nextHint ? `
        <div class="home-v2-action-next">
          <span class="home-v2-action-next-eb">${esc(azione.nextHint.eyebrow)}</span>
          <span class="home-v2-action-next-chip">${esc(azione.nextHint.chip)}</span>
        </div>` : '';
  const actionPanel = `
    <div class="home-v2-action">
      <div class="home-v2-action-head">
        <span>PROSSIMA AZIONE</span>
        <span>${oraStr}</span>
      </div>
      <div class="home-v2-action-title">${esc(azione.titolo)}</div>
      <div class="home-v2-action-detail">${esc(azione.dettaglio)}</div>
      ${nextHintHTML}
    </div>`;

  // ── Inject ──
  document.getElementById('page-home').innerHTML = `
    <div class="home-v2-wrap">
      <div class="home-v2-header">
        <div class="home-v2-header-text">
          <div class="home-v2-date">${dateStr}</div>
          <div class="home-v2-greeting">${esc(greeting)}</div>
        </div>
        <button class="home-v2-avatar" onclick="openSettingsModal()" title="Impostazioni profilo">${esc(initials)}</button>
      </div>
      ${_wpHomeCardHTML()}
      ${_cpHomeCardHTML()}
      ${nutritionCard}
      ${trainingCard}
      ${bodyCard}
      ${actionPanel}
      ${versionFooter()}
    </div>
  `;
}
