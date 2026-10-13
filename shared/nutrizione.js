// ═══════════════════════════════════════════════════════════
// shared/nutrizione.js — totali della giornata (pasti + integratori + extra)
// ═══════════════════════════════════════════════════════════
// Modulo condiviso fra l'app e il Worker: una fonte sola, questo file.
// La pagina lo carica con <script src="shared/nutrizione.js"> prima del proprio codice
// (dal 2 ottobre 2026, Fondamenta 035, non è più copiato dentro); il Worker lo importa.
//
// È la logica di dayTotals del tab Nutrition, spostata qui il 13 settembre 2026
// perché serve anche al quadro settimanale e al cron del Worker: un solo posto
// in cui si decide quanto vale una giornata. Le funzioni dell'app con lo stesso
// nome (dayTotals, suppTotalsForIds, extraSuppsTotals, _extrasV3Totals,
// _extraDaRiga) sono diventate involucri che passano ST.
//
// Nessuna rete, nessuno stato globale: tutto entra dagli argomenti.
//   ref = { supps, catalog, extrasByDay }
//     supps       = libreria integratori già mappata (mapSupplement)
//     catalog     = nutrilite_catalog
//     extrasByDay = { 'YYYY-MM-DD': [extraFromRow(riga)] }
var ZTNutrizione = (function(){
  'use strict';
  function r2(x){ return Math.round(x * 100) / 100; }
  var ZERO = function(){ return { kcal:0, protein:0, carbs:0, fat:0 }; };

  function mealTotals(meals){
    return (meals || []).reduce(function(a, m){
      return { kcal:a.kcal + (m.kcal || 0), protein:a.protein + (m.protein || 0), carbs:a.carbs + (m.carbs || 0), fat:a.fat + (m.fat || 0) };
    }, ZERO());
  }

  // La riga di supplements_log → il prodotto della libreria: per supplement_id (la chiave, Fondamenta 070),
  // poi per nome, per le righe scritte prima del 3 ottobre 2026 o che la migrazione non ha legato.
  // supps: righe gia' passate da mapSupplement (hanno local_id). null se nessuno corrisponde.
  function suppForLog(supps, r){
    var lista = supps || [];
    var perId = r && r.supplement_id ? lista.find(function(x){ return String(x.local_id) === String(r.supplement_id); }) : null;
    if(perId) return perId;
    return lista.find(function(x){ return x.name === r.supplement_name; }) || null;
  }

  // Una riga di `supplements` unita al catalogo (join per codice, poi per nome). Era il map di loadSupps.
  function mapSupplement(s, catalog){
    var cat = (catalog || []).find(function(c){
      return (s.codice && c.codice === s.codice) ||
        c.nome === s.name ||
        (c.nome || '').toLowerCase().trim() === (s.name || '').toLowerCase().trim();
    });
    var pick = function(a, b){ return a != null ? a : b; };
    return Object.assign({}, s, {
      local_id: s.id,
      name:    pick(cat && cat.nome, s.name),
      kcal:    pick(cat && cat.kcal, null),
      protein: pick(cat && cat.proteine, null),
      carbs:   pick(cat && cat.carbo, null),
      fat:     pick(cat && cat.grassi, null),
      doses:    pick(cat && cat.dosi_conf, pick(s.doses, 0)),
      dose_die: pick(s.quantity, pick(s.dose_die, pick(cat && cat.dose_die, 1))),
      price:    pick(cat && cat.prezzo_partner, pick(s.price, 0)),
      dose_unit:       pick(s.dose_unit, null),
      dose_multiplier: s.dose_multiplier != null ? parseFloat(s.dose_multiplier) : 1,
    });
  }

  // Una riga supplements_log con is_extra=true: snapshot registrato, catalogo × dose come ripiego.
  function extraFromRow(r, catalog){
    catalog = catalog || [];
    var dose = r.dose != null ? parseFloat(r.dose) : 1;
    var snap = function(v){ return v != null ? (parseFloat(v) || 0) : null; };
    var snapKcal = snap(r.kcal), snapCarbo = snap(r.carbo), snapProt = snap(r.proteine), snapGras = snap(r.grassi), snapCosto = snap(r.costo);
    var cat = null;
    if(r.supplement_codice) cat = catalog.find(function(c){ return c.codice === r.supplement_codice; });
    if(!cat && r.supplement_name){
      cat = catalog.find(function(c){ return c.nome === r.supplement_name; })
         || catalog.find(function(c){ return (c.nome || '').toLowerCase().trim() === (r.supplement_name || '').toLowerCase().trim(); });
    }
    var catDose = cat && cat.dose_die != null ? (parseFloat(cat.dose_die) || 1) : 1;
    var mult = dose / catDose;
    var fb = function(v, dec){ return cat ? Math.round(((parseFloat(v) || 0) * mult) * dec) / dec : 0; };
    return {
      id:        r.id,
      date:      r.date,
      slot:      r.slot || '',
      name:      r.supplement_name || '',
      codice:    r.supplement_codice || (cat ? cat.codice : null),
      dose:      dose,
      dose_unit: r.dose_unit || (cat ? cat.dose_unit : 'cps') || 'cps',
      kcal:      snapKcal  != null ? snapKcal  : fb(cat && cat.kcal, 10),
      carbo:     snapCarbo != null ? snapCarbo : fb(cat && cat.carbo, 10),
      proteine:  snapProt  != null ? snapProt  : fb(cat && cat.proteine, 10),
      grassi:    snapGras  != null ? snapGras  : fb(cat && cat.grassi, 10),
      costo:     snapCosto != null ? snapCosto : fb(cat && cat.costo_dose_partner, 100),
      _fromFallback: snapKcal == null && snapCarbo == null && snapProt == null && snapGras == null,
      created_at: r.created_at,
    };
  }

  // Integratori standard spuntati (una volta al giorno per prodotto, macro del catalogo).
  function suppTotalsForIds(ids, ref){
    var supps = (ref && ref.supps) || [], catalog = (ref && ref.catalog) || [];
    var tot = supps.filter(function(s){ return (ids || []).includes(s.local_id); }).reduce(function(a, s){
      var cat = catalog.find(function(c){ return c.nome === s.name; });
      var val = function(v, c){ return (v != null && v !== '') ? v : (c || 0); };
      return {
        kcal:    a.kcal    + val(s.kcal,    cat && cat.kcal),
        protein: a.protein + val(s.protein, cat && cat.proteine),
        carbs:   a.carbs   + val(s.carbs,   cat && cat.carbo),
        fat:     a.fat     + val(s.fat,     cat && cat.grassi),
      };
    }, ZERO());
    return { kcal:r2(tot.kcal), protein:r2(tot.protein), carbs:r2(tot.carbs), fat:r2(tot.fat) };
  }

  // Righe standard il cui nome non è più nella libreria (prodotto tolto): catalogo × dose.
  function extraSuppsTotals(day, ref){
    if(!day || !Array.isArray(day.rawSuppLogs)) return ZERO();
    var supps = (ref && ref.supps) || [], catalog = (ref && ref.catalog) || [];
    var standardNames = new Set(supps.map(function(s){ return s.name; }));
    var n = function(){ for(var i = 0; i < arguments.length; i++){ if(arguments[i] != null) return Number(arguments[i]); } return 0; };
    var tot = day.rawSuppLogs.reduce(function(a, log){
      if(standardNames.has(log.name)) return a;
      var cat = catalog.find(function(c){ return c.nome === log.name; });
      var supp = supps.find(function(s){ return s.name === log.name; });
      var mult = (Number(log.dose != null ? log.dose : 1) || 1) / (parseFloat(supp && supp.dose_die) || 1);
      return {
        kcal:    a.kcal    + n(supp && supp.kcal,    cat && cat.kcal)     * mult,
        protein: a.protein + n(supp && supp.protein, cat && cat.proteine) * mult,
        carbs:   a.carbs   + n(supp && supp.carbs,   cat && cat.carbo)    * mult,
        fat:     a.fat     + n(supp && supp.fat,     cat && cat.grassi)   * mult,
      };
    }, ZERO());
    return { kcal:r2(tot.kcal), protein:r2(tot.protein), carbs:r2(tot.carbs), fat:r2(tot.fat) };
  }

  // Extra (is_extra=true) dall'archivio per giorno.
  function extrasTotals(day, ref){
    var key = day && day.key;
    var byDay = ref && ref.extrasByDay;
    var lista = (key && byDay) ? (byDay[key] || []) : [];
    var tot = lista.reduce(function(a, x){
      return { kcal:a.kcal + (Number(x.kcal) || 0), protein:a.protein + (Number(x.proteine) || 0), carbs:a.carbs + (Number(x.carbo) || 0), fat:a.fat + (Number(x.grassi) || 0) };
    }, ZERO());
    return { kcal:r2(tot.kcal), protein:r2(tot.protein), carbs:r2(tot.carbs), fat:r2(tot.fat) };
  }

  // Totali completi del giorno. `parts` separa i pasti dagli integratori (standard + extra).
  function dayTotals(day, ref, parts){
    if(!day) return ZERO();
    var m = mealTotals(day.meals || []);
    var s = suppTotalsForIds(day.suppsTaken || [], ref);
    var x = extraSuppsTotals(day, ref);
    var e = extrasTotals(day, ref);
    var out = {
      kcal:    r2(m.kcal    + s.kcal    + x.kcal    + e.kcal),
      protein: r2(m.protein + s.protein + x.protein + e.protein),
      carbs:   r2(m.carbs   + s.carbs   + x.carbs   + e.carbs),
      fat:     r2(m.fat     + s.fat     + x.fat     + e.fat),
    };
    if(parts) out.supp = { kcal: r2(s.kcal + x.kcal + e.kcal), protein: r2(s.protein + x.protein + e.protein) };
    return out;
  }

  // Le giornate come le costruisce loadAllDays, a partire dalle righe.
  //   meals: righe di meals · suppLogs: supplements_log (standard ed extra insieme,
  //   si separano su is_extra) · supps: righe di supplements · catalog: nutrilite_catalog
  // Restituisce { days: { key: day }, ref } pronti per dayTotals(day, ref).
  function buildDays(rows){
    var catalog = rows.catalog || [];
    var supps = (rows.supps || []).map(function(s){ return mapSupplement(s, catalog); });
    var days = {}, extrasByDay = {};
    var nuovo = function(key){ return days[key] || (days[key] = { key:key, meals:[], fasting:false, suppsTaken:[], rawSuppLogs:[] }); };
    (rows.meals || []).forEach(function(m){ nuovo(m.date).meals.push(m); });
    (rows.suppLogs || []).forEach(function(r){
      if(r.is_extra){
        var e = extraFromRow(r, catalog);
        (extrasByDay[e.date] || (extrasByDay[e.date] = [])).push(e);
        return;
      }
      var d = nuovo(r.date);
      var supp = suppForLog(supps, r);
      if(supp && !d.suppsTaken.includes(supp.local_id)) d.suppsTaken.push(supp.local_id);
      d.rawSuppLogs.push({ name: supp ? supp.name : r.supplement_name, time: r.slot || '', dose: parseFloat(supp && supp.dose_die) || 1 });
    });
    return { days: days, ref: { supps: supps, catalog: catalog, extrasByDay: extrasByDay } };
  }

  // ── «In Zona» e «Giorno perfetto»: una regola sola (Nutrition 020, Ondata 4, 13 ottobre 2026) ──
  // Prima Oggi giudicava su 40/30/30 fisso con 5 punti di margine e Analisi sulle percentuali dell'obiettivo con 2:
  // lo stesso giorno era «Nella Zona» in Oggi e «Quasi» in Analisi, e con ipertrofia (40/35/25) centrare il target
  // cadeva sul bordo. Il trofeo scattava con le proporzioni giuste e piu' di 800 kcal, anche con 900 su 2300.
  // Scelta di Ignazio (13 ottobre 2026): percentuali dell'obiettivo, entro 3 punti «in», entro 6 «quasi»;
  // Giorno perfetto = Nella Zona e calorie entro il 10% dell'obiettivo. Chi mostra un giudizio passa da qui.
  var ZONA_PUNTI_IN = 3, ZONA_PUNTI_QUASI = 6, PERFETTO_SCARTO_KCAL = 0.10;
  // Le percentuali di carboidrati, proteine e grassi sulle calorie dei macro (arrotondate, come a schermo)
  function percentualiMacro(cons){
    var kC = (Number(cons && cons.carbs) || 0) * 4, kP = (Number(cons && cons.protein) || 0) * 4, kF = (Number(cons && cons.fat) || 0) * 9;
    var totK = kC + kP + kF;
    if(totK <= 0) return { pC:0, pP:0, pF:0, totK:0 };
    return { pC: Math.round(kC / totK * 100), pP: Math.round(kP / totK * 100), pF: Math.round(kF / totK * 100), totK: totK };
  }
  // → 'unset' (meno di 5 g di macro: niente da giudicare) | 'in' | 'near' | 'out'
  function statoZona(cons, target){
    var tot = (Number(cons && cons.protein) || 0) + (Number(cons && cons.carbs) || 0) + (Number(cons && cons.fat) || 0);
    if(tot < 5) return 'unset';
    var p = percentualiMacro(cons);
    var tPC = Number(target && target.pCarbo) || 40, tPP = Number(target && target.pProt) || 30, tPF = Number(target && target.pFat) || 30;
    var scarto = Math.max(Math.abs(p.pC - tPC), Math.abs(p.pP - tPP), Math.abs(p.pF - tPF));
    return scarto <= ZONA_PUNTI_IN ? 'in' : (scarto <= ZONA_PUNTI_QUASI ? 'near' : 'out');
  }
  // Nella Zona e calorie vicine all'obiettivo (entro il 10%)
  function giornoPerfetto(cons, target){
    var tk = Number(target && target.kcal) || 0;
    if(tk <= 0 || statoZona(cons, target) !== 'in') return false;
    return Math.abs((Number(cons && cons.kcal) || 0) - tk) <= tk * PERFETTO_SCARTO_KCAL;
  }

  return { r2: r2, mealTotals: mealTotals, mapSupplement: mapSupplement, suppForLog: suppForLog, extraFromRow: extraFromRow,
    suppTotalsForIds: suppTotalsForIds, extraSuppsTotals: extraSuppsTotals, extrasTotals: extrasTotals,
    dayTotals: dayTotals, buildDays: buildDays,
    ZONA_PUNTI_IN: ZONA_PUNTI_IN, ZONA_PUNTI_QUASI: ZONA_PUNTI_QUASI, PERFETTO_SCARTO_KCAL: PERFETTO_SCARTO_KCAL,
    percentualiMacro: percentualiMacro, statoZona: statoZona, giornoPerfetto: giornoPerfetto };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTNutrizione;
