// ═══════════════════════════════════════════════════════════
// shared/quadro.js — il quadro settimanale, calcolo puro
// ═══════════════════════════════════════════════════════════
// Modulo condiviso fra l'app e il Worker: una fonte sola, questo file.
// La pagina lo carica con <script src="shared/quadro.js"> prima del proprio codice
// (dal 2 ottobre 2026, Fondamenta 035, non è più copiato dentro); il Worker lo importa.
//
// Spostato qui dall'app il 13 settembre 2026 (Fase 3) perché il cron del lunedì
// deve calcolare lo stesso quadro che calcola il telefono. Contiene:
//   fetchSpec          COSA leggere (tabelle, colonne, filtri, ordine): l'app lo esegue
//                      con supabase-js, il Worker con fetch sul REST. Una lista sola.
//   computeWeeklyPicture  il calcolo, senza rete (regola null ≠ 0, forma in CLAUDE.md)
//   cycleWeekInfo      la settimana del mesociclo 5+1 (cuore di getCycleWeekInfo)
//   blockCheckReminder il reminder di fine blocco (cuore di getBlockCheckReminder)
//   weighInsByDay      una pesata al giorno, weight_logs > body_logs > check (L47)
//   makeClock          le date "di calendario": ora locale del telefono nell'app,
//                      Europe/Rome nel Worker (che gira in UTC)
//
// Richiede ZTNutrizione (shared/nutrizione.js) per la somma della giornata.
var ZTQuadro = (function(){
  'use strict';
  var N = (typeof ZTNutrizione !== 'undefined') ? ZTNutrizione : require('./nutrizione.js');

  var WP_VERSION = 2;
  var WP_PARTIAL_KCAL_RATIO = 0.75;   // days_under_75: un giorno sotto il 75% del target (dato, non etichetta)
  var WP_FASCIA = [0.9, 1.1];         // un giorno è «in obiettivo» con le kcal fra il 90% e il 110% del target
  var WP_PARTIAL_DAYS_RATIO = 0.5;    // metà o più dei giorni registrati con meno di 2 pasti principali → "parziale"
  var WP_MAIN_SLOTS = ['colazione', 'pranzo', 'cena'];
  var WP_MAIN_MIN = 2;                // un giorno con meno di 2 pasti principali su 3 è un giorno parziale
  var WP_MEASURE_KEYS = ['weight_kg','waist_cm','hips_cm','chest_cm','shoulders_cm','neck_cm','biceps_cm','thigh_cm','calf_cm','body_fat_pct','muscle_mass_kg','visceral_fat'];
  var BLOCK_DAYS = 42;                // durata mesociclo (5 carico + 1 scarico)
  var CHECK_RECENT_DAYS = 28;         // "recente" = ultime 4 settimane

  // ── Orologio di calendario ──
  // Senza timeZone: l'ora locale del dispositivo (identico al dayKey dell'app).
  // Con timeZone ('Europe/Rome'): la stessa data e la stessa mezzanotte che vede il telefono in Italia.
  function makeClock(timeZone){
    var p2 = function(n){ return String(n).padStart(2, '0'); };
    if(!timeZone){
      return {
        dayKey: function(d){ var x = (d instanceof Date) ? d : (d != null ? new Date(d) : new Date()); return x.getFullYear() + '-' + p2(x.getMonth() + 1) + '-' + p2(x.getDate()); },
        parseLocal: function(key, time){ return new Date(key + 'T' + (time || '00:00:00')).getTime(); },
      };
    }
    var fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    var parts = function(ts){ var o = {}; fmt.formatToParts(new Date(ts)).forEach(function(p){ o[p.type] = p.value; }); return o; };
    // scarto del fuso a un istante: (ora di muro letta come UTC) − istante
    var offset = function(ts){ var o = parts(ts); return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second) - Math.floor(ts / 1000) * 1000; };
    return {
      dayKey: function(d){ var x = (d instanceof Date) ? d : (d != null ? new Date(d) : new Date()); var o = parts(x.getTime()); return o.year + '-' + o.month + '-' + o.day; },
      parseLocal: function(key, time){
        var t = (time || '00:00:00').split(':').map(Number);
        var k = key.split('-').map(Number);
        var muro = Date.UTC(k[0], k[1] - 1, k[2], t[0] || 0, t[1] || 0, t[2] || 0);
        var ts = muro - offset(muro);
        return muro - offset(ts);            // secondo passaggio: giusto anche a cavallo del cambio d'ora
      },
    };
  }
  var LOCALE = makeClock(null);

  // ── Date come chiavi 'YYYY-MM-DD' (aritmetica di calendario, nessun fuso) ──
  function addDays(key, n){ var d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function mondayOf(key){ var dow = new Date(key + 'T12:00:00Z').getUTCDay(); return addDays(key, dow === 0 ? -6 : 1 - dow); }

  function r1(x){ if(x == null || !isFinite(x)) return null; var r = Math.round(x * 10) / 10; return r === 0 ? 0 : r; }
  function r2(x){ if(x == null || !isFinite(x)) return null; return Math.round(x * 100) / 100; }
  function mean(arr){ var v = arr.filter(function(x){ return x != null && isFinite(x); }); return v.length ? v.reduce(function(a, b){ return a + b; }, 0) / v.length : null; }

  // Pesate: una al giorno, weight_logs > body_logs > misure del check (L47).
  // Restituisce { 'YYYY-MM-DD': { v, rank } }.
  function weighInsByDay(weightLogs, bodyLogs, measurements, clock){
    var cl = clock || LOCALE;
    var daily = {};
    var put = function(date, v, rank){
      var n = v == null ? NaN : Number(v);
      if(!date || !isFinite(n)) return;
      if(!daily[date] || rank < daily[date].rank) daily[date] = { v: n, rank: rank };
    };
    (weightLogs || []).forEach(function(r){ put(r.date, r.weight_kg, 0); });
    (bodyLogs || []).forEach(function(r){ put(r.date, r.weight_kg, 1); });
    (measurements || []).forEach(function(m){ if(m.created_at) put(cl.dayKey(new Date(m.created_at)), m.weight_kg, 2); });
    return daily;
  }

  // Giorni di LAVORO per giro, dal ciclo della scheda attiva: 5 con la Upper Pump, altrimenti 4.
  function workPerGiroForCycle(cycleIds){
    var ids = Array.isArray(cycleIds) ? cycleIds : [];
    var mappa = ids.indexOf('upperC') !== -1
      ? ['upperA','lowerA','recoveryUpper','upperB','lowerB','upperC','rest']
      : ['upperA','lowerA','recoveryUpper','upperB','lowerB','recoveryLower'];
    return mappa.filter(function(sid){ return !/^recovery/i.test(sid) && sid !== 'rest' && sid !== 'rest_injury'; }).length;
  }

  // Settimana del mesociclo 5+1, dai soli giorni di lavoro (vedi getCycleWeekInfo nell'app).
  //   completed  workout completati, rest/rest_injury esclusi, ordinati per data
  //   today      'YYYY-MM-DD' che fa da oggi · asOf  se c'è, si conta fino a quel giorno
  //   workPerGiro · deloads  date in cui è stato accettato uno scarico anticipato (Pirsi propone)
  // Scarico anticipato: dal giorno dell'accettazione il conto riparte come se fossero già
  // passate 5 settimane di carico — quella in corso diventa la 6 e la successiva la 1.
  function cycleWeekInfo(o){
    var oggi = o.asOf || o.today;
    var sorgente = o.completed || [];
    var completati = o.asOf ? sorgente.filter(function(w){ return w && w.date <= o.asOf; }) : sorgente;
    var isWork = function(w){ return w && !/^recovery/i.test(w.session_type); };
    var workCount = completati.filter(isWork).length;
    var wpg = Math.max(1, o.workPerGiro || 1);
    var ancora = (o.deloads || []).filter(function(d){ return d && d <= oggi; }).sort().pop() || null;
    var conto = workCount, bordo = true;
    if(ancora){
      var prima = completati.filter(function(w){ return isWork(w) && w.date < ancora; }).length;
      conto = workCount - prima + 5 * wpg;
      bordo = workCount > prima;            // nel giorno stesso dell'accettazione niente correttivo di bordo
    }
    var weekIdx = 0;
    if(conto > 0){
      var rawWeek = Math.floor(conto / wpg) % 6;
      var lastDate = completati.length ? completati[completati.length - 1].date : null;
      weekIdx = (bordo && conto % wpg === 0 && lastDate === oggi) ? (rawWeek === 0 ? 5 : rawWeek - 1) : rawWeek;
    }
    return { weekNum: weekIdx + 1, isScarico: weekIdx === 5, workCount: conto, workPerGiro: wpg, deloadFrom: ancora };
  }

  // ── Pausa programmata (Training 350, 13 ottobre 2026) ──
  // Vacanza, viaggio, lavoro: non un infortunio. Sta nel profilo, così la vedono tutti e due i telefoni
  // e il cron del lunedì: pausa_inizio e pausa_fine ('YYYY-MM-DD'; fine vuota = aperta), pausa_motivo.
  // pausaInfo(profile, today) → null se non c'è una pausa, altrimenti
  //   { inizio, fine, motivo, attiva, futura, finita, giorniTotali (null se aperta), giorniFatti, giorniDalRientro }
  var giorniTra = function(a, b){ return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000); };
  // Una pausa sola per tutti i moduli (Metodo 210, decisione di Ignazio del 14 ottobre 2026): tre
  // interruttori, tutti accesi se il profilo non dice altro (profiles.pausa_moduli, text[]):
  //   allenamento  niente debito, blocco fermo, rientro graduale (Training 350)
  //   cibo         niente promemoria dei pasti né «giorno vuoto», la serie dei giorni di fila non si
  //                spezza, Pirsi non propone tagli di calorie
  //   pesate       si fermano il promemoria della pesata e quello del check di fine blocco
  var PAUSA_MODULI = ['allenamento', 'cibo', 'pesate'];
  function pausaModuli(profile){
    var p = profile || {};
    var lista = Array.isArray(p.pausa_moduli) ? p.pausa_moduli.map(function(m){ return String(m || '').trim().toLowerCase(); }) : null;
    var tutti = !lista || !lista.length;
    var out = {};
    PAUSA_MODULI.forEach(function(m){ out[m] = tutti || lista.indexOf(m) !== -1; });
    return out;
  }
  function pausaInfo(profile, today){
    var p = profile || {};
    var inizio = p.pausa_inizio || null, fine = p.pausa_fine || null;
    if(!inizio || !today) return null;
    if(fine && fine < inizio) fine = inizio;
    var attiva = inizio <= today && (!fine || today <= fine);
    var futura = inizio > today;
    var finita = !!fine && fine < today;
    var giorniTotali = fine ? giorniTra(inizio, fine) + 1 : null;
    return {
      inizio: inizio, fine: fine, motivo: p.pausa_motivo || null, moduli: pausaModuli(p),
      attiva: attiva, futura: futura, finita: finita,
      giorniTotali: giorniTotali,
      giorniFatti: attiva ? giorniTra(inizio, today) + 1 : (finita ? giorniTotali : 0),
      giorniDalRientro: finita ? giorniTra(fine, today) : null,
    };
  }
  // La pausa vale per `giorno` e per quel modulo? (senza modulo: la pausa in sé)
  function pausaAttivaIl(profile, giorno, modulo){
    var p = profile || {};
    if(!p.pausa_inizio || !giorno) return false;
    if(modulo && !pausaModuli(p)[modulo]) return false;
    return p.pausa_inizio <= giorno && (!p.pausa_fine || giorno <= p.pausa_fine);
  }
  // Quanti giorni di pausa cadono in [da, a] (estremi compresi); una pausa aperta arriva fino ad `a`.
  // Con `modulo` ('allenamento' · 'cibo' · 'pesate'): 0 se quel modulo non è in pausa.
  function pausaGiorniNel(profile, da, a, modulo){
    var p = profile || {};
    if(!p.pausa_inizio || !da || !a || a < da) return 0;
    if(modulo && !pausaModuli(p)[modulo]) return 0;
    var inizio = p.pausa_inizio > da ? p.pausa_inizio : da;
    var fine = (p.pausa_fine && p.pausa_fine < a) ? p.pausa_fine : a;
    if(fine < inizio) return 0;
    return giorniTra(inizio, fine) + 1;
  }

  // Le serie previste in una settimana dalla scheda (Training 110): la somma delle serie delle sedute
  // di lavoro (i recuperi non contano). Chi calcola il quadro le passa in ctx.sessioni; senza, null.
  function serieSettimanaliPreviste(sessioni){
    if(!Array.isArray(sessioni) || !sessioni.length) return null;
    var tot = 0;
    sessioni.forEach(function(s){
      if(!s || s.type === 'Recupero' || s.type === 'Riposo' || /^recovery/i.test(s.id || '')) return;
      (s.exercises || []).forEach(function(ex){ tot += Number(ex && ex.sets) || 0; });
    });
    return tot;
  }

  // Reminder "check di fine blocco": blocco di 42 giorni finito e nessun check completato nelle ultime 4 settimane.
  // o.pauseDays: i giorni di pausa programmata dall'inizio del blocco (Training 350) non contano: il blocco è fermo.
  function blockCheckReminder(o){
    var cl = o.clock || LOCALE;
    if(!o.start) return null;
    var startTs = cl.parseLocal(o.start, '00:00:00');
    if(!isFinite(startTs)) return null;
    var giorniDaInizio = Math.floor((o.nowTs - startTs) / 86400000) - (Number(o.pauseDays) || 0);
    if(giorniDaInizio < BLOCK_DAYS) return null;
    var ultimoTs = null;
    (o.checks || []).filter(function(c){ return c.status === 'completed' && c.created_at && new Date(c.created_at).getTime() <= o.nowTs; })
      .forEach(function(c){ var t = new Date(c.created_at).getTime(); if(isFinite(t) && (ultimoTs === null || t > ultimoTs)) ultimoTs = t; });
    var giorniDaUltimo = ultimoTs === null ? null : Math.floor((o.nowTs - ultimoTs) / 86400000);
    if(giorniDaUltimo !== null && giorniDaUltimo < CHECK_RECENT_DAYS) return null;
    return { giorniDaInizio: giorniDaInizio, giorniDaUltimo: giorniDaUltimo };
  }

  // ── Cosa leggere per il quadro di una settimana ──
  // [op, colonna, valore] con op eq/gte/lte; order = colonne ascendenti. Paginato da chi esegue (L13).
  function fetchSpec(userId, weekStart, trainStart){
    var we = addDays(weekStart, 6);
    var w5 = addDays(weekStart, -28);                     // peso: 5 settimane in una passata sola
    var wFrom = (trainStart && trainStart < weekStart) ? trainStart : weekStart;
    var u = ['eq', 'user_id', userId];
    var q = function(label, table, select, filters, order){ return { label: label, table: table, select: select, filters: filters, order: order }; };
    return {
      weightLogs:   q('le pesate', 'weight_logs', 'date, weight_kg', [u, ['gte','date',w5], ['lte','date',we]], ['date','id']),
      // Pirsi 080: vita e grasso % dalla bilancia e dal metro (anche dal report Fitdays, Body 150) entrano nel quadro
      bodyLogs:     q('i log del corpo', 'body_logs', 'date, weight_kg, waist_cm, bf_pct', [u, ['gte','date',w5], ['lte','date',we]], ['date','id']),
      measurements: q('le misure dei check', 'body_measurements', '*', [u], ['created_at','id']),
      checks:       q('i check fisici', 'body_checks', 'id, status, created_at, completed_at', [u], ['created_at','id']),
      meals:        q('i pasti', 'meals', 'date, slot, kcal, protein, carbs, fat', [u, ['gte','date',weekStart], ['lte','date',we]], ['date','id']),
      suppLogs:     q('gli integratori presi', 'supplements_log', 'id, date, slot, supplement_name, supplement_id, supplement_codice, is_extra, dose, dose_unit, kcal, carbo, proteine, grassi, costo, created_at', [u, ['gte','date',weekStart], ['lte','date',we]], ['date','slot','created_at']),
      supps:        q('la libreria integratori', 'supplements', '*', [u], ['sort_order','id']),
      catalog:      q('il catalogo integratori', 'nutrilite_catalog', '*', [], ['nome','codice']),
      sets:         q('le serie', 'training_logs', 'date, session_id, rir_actual', [u, ['gte','date',weekStart], ['lte','date',we]], ['date','id']),
      // Pirsi 080: «com'è andata» la seduta (Training 060, colonna sensazione: migrazione 20261014_060)
      workouts:     q('gli allenamenti', 'workouts', 'date, session_type, completed, sensazione', [u, ['eq','completed',true], ['gte','date',wFrom], ['lte','date',we]], ['date','id']),
      blood:        q('gli esami', 'blood_tests', 'test_date', [u, ['lte','test_date',we]], ['test_date','id']),
      readings:     q('le letture delle foto', 'body_check_ai', 'check_id, confidence, result, created_at', [u], ['created_at','id']),
    };
  }

  // Calcolo puro. raw = { chiave di fetchSpec: righe | null (lettura fallita), errors: [chiavi] }.
  // ctx = { today, nowTs, profile, target, injuryActiveNow, clock, workPerGiro, deloads }
  function computeWeeklyPicture(raw, weekStart, ctx){
    var c = ctx || {};
    var cl = c.clock || LOCALE;
    var nowTs = c.nowTs != null ? c.nowTs : Date.now();
    var today = c.today || cl.dayKey(new Date(nowTs));
    var profile = c.profile || {};
    var we = addDays(weekStart, 6);
    var isClosed = today > we;
    // "Adesso" del quadro: fine domenica per le settimane chiuse, l'istante reale per la corrente.
    var refTs = isClosed ? cl.parseLocal(we, '23:59:59') : nowTs;
    var refDay = isClosed ? we : today;
    var daysBetween = function(fromTs){ return Math.floor((refTs - fromTs) / 86400000); };
    var inWeek = function(d){ return d >= weekStart && d <= we; };

    // ── Peso: una pesata al giorno, weight_logs > body_logs > misure del check ──
    var weight = null;
    if(raw.weightLogs && raw.bodyLogs && raw.measurements){
      var daily = weighInsByDay(raw.weightLogs, raw.bodyLogs, raw.measurements, cl);
      var settimana = function(k){
        var s = addDays(weekStart, -7 * k), e = addDays(s, 6);
        var vals = Object.keys(daily).filter(function(d){ return d >= s && d <= e; }).map(function(d){ return daily[d].v; });
        return { avg: mean(vals), n: vals.length };
      };
      var sett = [0,1,2,3].map(settimana);
      var pts = sett.map(function(s, k){ return { x: -k, y: s.avg }; }).filter(function(p){ return p.y != null; });
      var trend = null;
      if(pts.length >= 3){                            // pendenza ai minimi quadrati, kg/settimana
        var mx = mean(pts.map(function(p){ return p.x; })), my = mean(pts.map(function(p){ return p.y; }));
        var num = pts.reduce(function(a, p){ return a + (p.x - mx) * (p.y - my); }, 0);
        var den = pts.reduce(function(a, p){ return a + Math.pow(p.x - mx, 2); }, 0);
        trend = den > 0 ? num / den : null;
      }
      var goal = profile.goal_weight_kg != null ? Number(profile.goal_weight_kg) : null;
      var ultimoGiorno = Object.keys(daily).filter(function(d){ return d <= refDay; }).sort().pop() || null;
      weight = {
        weight_avg:        r1(sett[0].avg),
        weight_n:          sett[0].n,
        weight_delta_prev: (sett[0].avg != null && sett[1].avg != null) ? r1(sett[0].avg - sett[1].avg) : null,
        weight_trend_4w:   r1(trend),
        weight_target:     isFinite(goal) ? goal : null,
        weight_last:       ultimoGiorno ? r2(daily[ultimoGiorno].v) : null,
        weight_last_date:  ultimoGiorno,
        pause_days:        pausaGiorniNel(profile, weekStart, we, 'pesate'),   // Metodo 210: in pausa niente «pesati di più»
      };
    }

    // ── Nutrizione: l'intera giornata, come il tab Nutrition (shared/nutrizione.js) ──
    // Media sui soli giorni con almeno un pasto; in quei giorni contano anche integratori
    // spuntati ed extra. Un giorno con solo integratori non è un giorno registrato.
    var nutrition = null;
    if(raw.meals && raw.suppLogs && raw.supps && raw.catalog){
      var built = N.buildDays({
        meals: raw.meals.filter(function(m){ return inWeek(m.date); }),
        suppLogs: raw.suppLogs.filter(function(r){ return inWeek(r.date); }),
        supps: raw.supps, catalog: raw.catalog,
      });
      var logged = Object.keys(built.days).filter(function(k){ return built.days[k].meals.length > 0; }).sort();
      var days = logged.map(function(k){
        var t = N.dayTotals(built.days[k], built.ref, true);
        var slots = {};
        built.days[k].meals.forEach(function(m){ if(WP_MAIN_SLOTS.indexOf(m.slot) !== -1) slots[m.slot] = true; });
        return { kcal: t.kcal, protein: t.protein, supp_kcal: t.supp.kcal, supp_protein: t.supp.protein, principali: Object.keys(slots).length };
      });
      var tk = Number((c.target && c.target.kcal) || profile.target_kcal) || null;
      var tp = Number((c.target && c.target.protein) || profile.target_protein) || null;
      var kcalAvg = mean(days.map(function(d){ return d.kcal; }));
      var dentro = tk ? days.filter(function(d){ return inFascia(d.kcal, tk); }).length : null;
      var sotto  = tk ? days.filter(function(d){ return giornoScarso(d.kcal, tk); }).length : 0;
      var parziali = days.filter(function(d){ return d.principali < WP_MAIN_MIN; }).length;
      nutrition = {
        kcal_target:      tk,
        protein_target:   tp,
        kcal_avg:         kcalAvg == null ? null : Math.round(kcalAvg),
        protein_avg:      days.length ? Math.round(mean(days.map(function(d){ return d.protein; }))) : null,
        supp_kcal_avg:    days.length ? Math.round(mean(days.map(function(d){ return d.supp_kcal; }))) : null,
        supp_protein_avg: days.length ? Math.round(mean(days.map(function(d){ return d.supp_protein; }))) : null,
        days_logged:      days.length,
        logged_dates:     logged,
        adherence_kcal:   (tk && days.length) ? r2(dentro / days.length) : null,
        // Parziale = metà o più dei giorni registrati con meno di 2 pasti principali su 3.
        // Non si stima niente: si dichiara soltanto che il dato è parziale.
        days_partial:     parziali,
        partial:          !!(days.length && parziali / days.length >= WP_PARTIAL_DAYS_RATIO),
        days_under_75:    tk ? sotto : null,
        pause_days:       pausaGiorniNel(profile, weekStart, we, 'cibo'),      // Metodo 210: in pausa niente «registra tutto» né tagli
      };
    }

    // ── Allenamento: sessioni dal calendario (workouts), serie e RIR da training_logs ──
    var training = null;
    var start = profile.train_start_date || null;
    if(raw.workouts && raw.sets && (start || raw.workouts.some(function(w){ return inWeek(w.date); }) || raw.sets.length)){
      var isWork = function(sid){ return !/^recovery/i.test(sid) && sid !== 'rest' && sid !== 'rest_injury'; };
      var uniq = function(arr){ return arr.filter(function(x, i){ return arr.indexOf(x) === i; }); };
      var questa = raw.workouts.filter(function(w){ return inWeek(w.date); });
      var lavoro = uniq(questa.filter(function(w){ return isWork(w.session_type); }).map(function(w){ return w.date + '|' + w.session_type; }));
      var recuperi = uniq(questa.filter(function(w){ return /^recovery/i.test(w.session_type); }).map(function(w){ return w.date + '|' + w.session_type; }));
      var infortunio = uniq(questa.filter(function(w){ return w.session_type === 'rest_injury'; }).map(function(w){ return w.date; }));
      var planned = Number(profile.giorni_allenamento) || null;
      // Pausa programmata (Training 350): i giorni della settimana in pausa. Con una pausa di mezzo le
      // sedute «mancate» non si contano: non è una settimana andata male, è una settimana dichiarata.
      var pausaGg = pausaGiorniNel(profile, weekStart, we, 'allenamento');
      var blockWeek = null, isDeload = null;
      if(start && we >= start){
        // Stessa regola di getCycleWeekInfo, valutata "a quel giorno": per la settimana
        // corrente oggi; per una chiusa l'ultimo giorno di lavoro della settimana.
        var completati = raw.workouts.filter(function(w){ return w.date >= start && w.session_type !== 'rest' && w.session_type !== 'rest_injury'; });
        var ultimoLavoro = lavoro.length ? lavoro.map(function(k){ return k.split('|')[0]; }).sort().pop() : null;
        var asOf = isClosed ? (ultimoLavoro || we) : today;
        var info = cycleWeekInfo({ completed: completati, asOf: asOf, today: today, workPerGiro: c.workPerGiro, deloads: c.deloads });
        blockWeek = info.weekNum;
        isDeload = info.isScarico;
      }
      var rir = raw.sets.filter(function(s){ return inWeek(s.date) && s.rir_actual != null; }).map(function(s){ return Number(s.rir_actual); });
      // Com'è andata (Training 060): quante sedute di lavoro la persona ha detto facili, giuste, dure.
      // Null = nessuna seduta con la risposta, mai zero (come il resto del quadro).
      var feel = { facile: 0, giusta: 0, dura: 0, n: 0 };
      questa.filter(function(w){ return isWork(w.session_type) && w.sensazione && feel.hasOwnProperty(w.sensazione); })
        .forEach(function(w){ feel[w.sensazione]++; feel.n++; });
      training = {
        sessions_planned: planned,
        sessions_done:    lavoro.length,
        sessions_missed:  (isClosed && planned != null && !pausaGg) ? Math.max(0, planned - lavoro.length) : null,
        recovery_done:    recuperi.length,
        block_week:       blockWeek,
        is_deload:        isDeload,
        volume_sets:      raw.sets.filter(function(s){ return inWeek(s.date); }).length,
        volume_planned:   serieSettimanaliPreviste(c.sessioni),
        avg_rir:          r1(mean(rir)),
        injury_days:      infortunio.length,
        injury_active:    infortunio.length > 0 || (!isClosed && !!c.injuryActiveNow),
        pause_days:       pausaGg,
        feel:             feel.n ? feel : null,
      };
    }

    // ── Metro e bilancia della settimana (body_logs, anche dal report Fitdays): vita e grasso % medi ──
    // Servono a Pirsi 080 («peso fermo ma vita in calo»): si confrontano fra settimane come il peso.
    var metro = null;
    if(raw.bodyLogs){
      var righeSett = raw.bodyLogs.filter(function(l){ return inWeek(l.date); });
      var vite = righeSett.filter(function(l){ return l.waist_cm != null && isFinite(Number(l.waist_cm)); }).map(function(l){ return Number(l.waist_cm); });
      var grassi = righeSett.filter(function(l){ return l.bf_pct != null && isFinite(Number(l.bf_pct)); }).map(function(l){ return Number(l.bf_pct); });
      if(vite.length || grassi.length) metro = { waist_avg: r1(mean(vite)), waist_n: vite.length, bf_avg: r1(mean(grassi)), bf_n: grassi.length };
    }

    // ── Corpo: ultimo check COMPLETATO fino a fine settimana ──
    var body = null;
    if(raw.checks && raw.measurements){
      var fatti = raw.checks
        .filter(function(ch){ return ch.status === 'completed' && ch.created_at && new Date(ch.created_at).getTime() <= refTs; })
        .sort(function(a, b){ return new Date(a.created_at) - new Date(b.created_at); });
      var ultimo = fatti[fatti.length - 1] || null;
      var prec = fatti[fatti.length - 2] || null;
      var misure = function(ch){ return ch ? (raw.measurements.find(function(m){ return m.check_id === ch.id; }) || null) : null; };
      var mU = misure(ultimo), mP = misure(prec);
      var last = null;
      if(mU){
        last = {};
        WP_MEASURE_KEYS.forEach(function(k){
          if(mU[k] == null) return;
          var v = Number(mU[k]);
          var p = mP && mP[k] != null ? Number(mP[k]) : null;
          last[k] = { value: v, delta: p == null ? null : r1(v - p) };
        });
      }
      var rem = blockCheckReminder({ start: profile.train_start_date, nowTs: refTs, checks: fatti, clock: cl,
        pauseDays: profile.train_start_date ? pausaGiorniNel(profile, profile.train_start_date, refDay, 'allenamento') : 0 });
      // Ultima lettura delle foto (Fase 2): quella del check più recente che ne ha una,
      // fatta entro l'"adesso" del quadro. Lettura fallita = campi null, errore già in meta.errors.
      var lettura = null, checkLettura = null;
      if(raw.readings){
        for(var i = fatti.length - 1; i >= 0 && !lettura; i--){
          var chId = fatti[i].id;
          var r = raw.readings.find(function(x){ return x.check_id === chId && x.created_at && new Date(x.created_at).getTime() <= refTs; });
          if(r && r.result){ lettura = r; checkLettura = fatti[i]; }
        }
      }
      body = {
        waist_avg:         metro ? metro.waist_avg : null,
        waist_n:           metro ? metro.waist_n : 0,
        bf_avg:            metro ? metro.bf_avg : null,
        bf_n:              metro ? metro.bf_n : 0,
        last_check_date:   ultimo ? cl.dayKey(new Date(ultimo.created_at)) : null,
        days_since_check:  ultimo ? daysBetween(new Date(ultimo.created_at).getTime()) : null,
        check_due:         !!rem,
        last_measurements: last,
        prev_check_date:   prec ? cl.dayKey(new Date(prec.created_at)) : null,
        ai_overall:        lettura ? lettura.result.overall : null,
        ai_confidence:     lettura ? (lettura.result.confidence || lettura.confidence) : null,
        ai_check_date:     checkLettura ? cl.dayKey(new Date(checkLettura.created_at)) : null,
      };
    }

    if(!body && metro) body = { waist_avg: metro.waist_avg, waist_n: metro.waist_n, bf_avg: metro.bf_avg, bf_n: metro.bf_n, last_check_date: null, days_since_check: null, check_due: false, last_measurements: null, prev_check_date: null, ai_overall: null, ai_confidence: null, ai_check_date: null };

    // ── Esami ──
    var blood = null;
    if(raw.blood){
      var esami = raw.blood.filter(function(b){ return b.test_date && b.test_date <= refDay; }).map(function(b){ return b.test_date; }).sort();
      var ultimoEsame = esami[esami.length - 1] || null;
      blood = {
        last_test_date:  ultimoEsame,
        days_since_test: ultimoEsame ? Math.floor((cl.parseLocal(refDay, '12:00:00') - cl.parseLocal(ultimoEsame, '12:00:00')) / 86400000) : null,
        test_count:      esami.length,
      };
    }

    var conDati = [
      weight && weight.weight_n > 0,
      nutrition && nutrition.days_logged > 0,
      training && (training.sessions_done > 0 || training.volume_sets > 0),
      body && body.last_check_date != null,
      blood && blood.test_count > 0,
    ].filter(Boolean).length;

    return {
      weight: weight, nutrition: nutrition, training: training, body: body, blood: blood,
      meta: {
        version:      WP_VERSION,
        week_start:   weekStart,
        week_end:     we,
        is_closed:    isClosed,
        computed_at:  new Date(nowTs).toISOString(),
        completeness: r2(conDati / 5),
        errors:       (raw.errors || []).slice(),
      },
    };
  }

  // ── La fascia delle calorie, una regola sola (la usano il quadro e i widget della Home) ──
  // inFascia: le kcal di un giorno (o la media) dentro il 90–110% del target. giornoScarso: sotto il 75% (days_under_75).
  // parolaSettimana: la media della settimana rispetto alla stessa fascia, in una parola («In linea», «Sopra», «Sotto»);
  // null senza target o senza media.
  function inFascia(kcal, target){ return target > 0 && kcal >= target * WP_FASCIA[0] && kcal <= target * WP_FASCIA[1]; }
  function giornoScarso(kcal, target){ return target > 0 && kcal < target * WP_PARTIAL_KCAL_RATIO; }
  function parolaSettimana(kcalAvg, target){
    if(!(target > 0) || kcalAvg == null || !isFinite(kcalAvg)) return null;
    if(kcalAvg < target * WP_FASCIA[0]) return 'Sotto';
    if(kcalAvg > target * WP_FASCIA[1]) return 'Sopra';
    return 'In linea';
  }

  return {
    WP_VERSION: WP_VERSION, WP_FASCIA: WP_FASCIA, inFascia: inFascia, giornoScarso: giornoScarso, parolaSettimana: parolaSettimana, WP_MAIN_SLOTS: WP_MAIN_SLOTS, BLOCK_DAYS: BLOCK_DAYS, CHECK_RECENT_DAYS: CHECK_RECENT_DAYS,
    makeClock: makeClock, addDays: addDays, mondayOf: mondayOf, weighInsByDay: weighInsByDay,
    workPerGiroForCycle: workPerGiroForCycle, cycleWeekInfo: cycleWeekInfo, blockCheckReminder: blockCheckReminder,
    pausaInfo: pausaInfo, pausaGiorniNel: pausaGiorniNel, pausaModuli: pausaModuli, pausaAttivaIl: pausaAttivaIl, PAUSA_MODULI: PAUSA_MODULI,
    serieSettimanaliPreviste: serieSettimanaliPreviste,
    fetchSpec: fetchSpec, computeWeeklyPicture: computeWeeklyPicture,
  };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTQuadro;
