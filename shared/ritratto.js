// ═══════════════════════════════════════════════════════════
// shared/ritratto.js — il ritratto unico della persona (Pirsi 020)
// ═══════════════════════════════════════════════════════════
// Modulo condiviso fra l'app e il Worker: una fonte sola, questo file.
// La pagina lo carica con <script src="shared/ritratto.js"> prima del proprio codice
// (dal 2 ottobre 2026, Fondamenta 035, non è più copiato dentro); il Worker lo importa.
//
// Prima ogni chiamata del coach si costruiva da zero il suo pezzetto di «chi è»:
// il consiglio sul pasto non sapeva dell'allenamento, la nota alla scheda non
// sapeva dell'infortunio. Qui c'è un posto solo che lo scrive, uguale per tutte.
//
// build(dati) → testo (blocco «CHI È», una riga per fatto) oppure '' se non c'è niente da dire
//   dati.profile    riga di profiles (first_name, sex, age, height_cm, dieta, intolleranze,
//                   obiettivo, activity_level, note_salute, goal_weight_kg, train_start_date)
//   dati.target     { kcal, protein, carbs, fat } del giorno
//   dati.today      'YYYY-MM-DD'
//   dati.current    quadro della settimana in corso (shared/quadro.js) o null
//   dati.previous   quadro della settimana scorsa o null
//   dati.session    { state: 'da_fare' | 'in_corso' | 'fatta' | 'riposo', label } o null
//   dati.cycle      { weekNum, isScarico } o null — SEMPRE da getCycleWeekInfo, mai ricalcolato
//   dati.injury     { zone, endDate } o null · dati.softReturn  true se c'è il rientro graduale
//   dati.proposals  righe di coach_proposals (kind, title, status, week_start, decided_at)
//   dati.wellbeing  riservato al diario del giorno (Fondamenta 050): oggi sempre assente
//
// Funzione PURA: niente rete, niente orologio, niente stato. Regola del quadro:
// null = non registrato, MAI zero. Un fatto che manca non produce una riga.
var ZTRitratto = (function(){
  'use strict';

  var OBIETTIVO_LBL = {
    perdita_peso: 'dimagrimento', dimagrimento: 'dimagrimento',
    ricomposizione: 'ricomposizione corporea',
    ipertrofia: 'ipertrofia (massa muscolare)', massa_muscolare: 'ipertrofia (massa muscolare)',
    forza_performance: 'forza e performance',
    longevita: 'longevità',
    mantenimento: 'mantenimento',
  };
  var ACTIVITY_LBL = { sedentary: 'sedentaria', light: 'leggera', lightly_active: 'leggera', moderate: 'moderata', active: 'attiva', very_active: 'molto attiva' };
  var SEX_LBL = { M: 'uomo', F: 'donna' };
  var AI_LBL = { migliorato: 'migliorato', stabile: 'stabile', peggiorato: 'peggiorato', primo_check: 'primo check, nessun confronto' };
  var STATO_LBL = { accepted: 'accettata', rejected: 'rimandata', expired: 'lasciata scadere', pending: 'in attesa di risposta' };
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var MAX_PROPOSTE = 4;
  var MAX_NOTE = 300;

  function num(x){ return (x == null || x === '' || !isFinite(Number(x))) ? null : Number(x); }
  function it(x){ return String(x).replace('.', ','); }                        // 72.1 → 72,1
  function segno(x){ return (x > 0 ? '+' : x < 0 ? '−' : '') + it(Math.abs(x)); }
  function mezzogiorno(key){ return new Date(key + 'T12:00:00Z'); }
  function dataIt(key){ var d = mezzogiorno(key); return d.getUTCDate() + ' ' + MESI[d.getUTCMonth()]; }
  function giorniFra(da, a){ return Math.round((mezzogiorno(a) - mezzogiorno(da)) / 86400000); }
  function quando(key, today){
    if(!today) return dataIt(key);
    var g = giorniFra(key, today);
    return g === 0 ? 'oggi' : g === 1 ? 'ieri' : (g > 1 && g <= 7) ? g + ' giorni fa' : dataIt(key);
  }

  // Etichette dell'obiettivo: stringa singola o lista separata da virgole.
  function obiettivoLeggibile(str){
    return String(str || '').split(',').map(function(s){ return OBIETTIVO_LBL[s.trim().toLowerCase()]; })
      .filter(function(x, i, a){ return x && a.indexOf(x) === i; }).join(', ');
  }

  // Senza il nome (Fondamenta 170): al coach servono sesso, età e altezza, non chi sei.
  function rigaPersona(p){
    var v = [];
    if(SEX_LBL[p.sex]) v.push(SEX_LBL[p.sex]);
    if(num(p.age)) v.push(num(p.age) + ' anni');
    if(num(p.height_cm)) v.push(num(p.height_cm) + ' cm');
    return v.length ? 'Persona: ' + v.join(', ') : null;
  }

  function rigaPeso(w, p, today){
    var v = [];
    if(w && w.weight_last != null && w.weight_last_date) v.push(it(w.weight_last) + ' kg (pesata di ' + quando(w.weight_last_date, today) + ')');
    if(w && w.weight_avg != null && w.weight_n > 1) v.push('media della settimana ' + it(w.weight_avg) + ' kg');
    if(w && w.weight_trend_4w != null) v.push('tendenza a 4 settimane ' + segno(w.weight_trend_4w) + ' kg a settimana');
    var goal = (w && w.weight_target != null) ? w.weight_target : num(p.goal_weight_kg);
    if(goal != null) v.push('peso obiettivo ' + it(goal) + ' kg');
    // Senza una pesata vera il peso del profilo NON si usa: è quello dell'iscrizione.
    return (w && w.weight_last != null) ? 'Peso: ' + v.join(' · ') : (goal != null ? 'Peso: nessuna pesata recente · peso obiettivo ' + it(goal) + ' kg' : null);
  }

  function rigaSettimana(titolo, q){
    if(!q) return null;
    var v = [], n = q.nutrition, t = q.training;
    if(n && n.days_logged > 0){
      var cibo = 'cibo registrato ' + n.days_logged + (n.days_logged === 1 ? ' giorno' : ' giorni');
      if(n.kcal_avg != null) cibo += ', media ' + n.kcal_avg + ' kcal' + (n.kcal_target ? ' su ' + n.kcal_target : '');
      if(n.protein_avg != null) cibo += ' e ' + n.protein_avg + ' g di proteine' + (n.protein_target ? ' su ' + n.protein_target : '');
      if(n.partial) cibo += ' (registrazione parziale: i numeri sono più bassi del vero)';
      v.push(cibo);
    } else if(n){
      v.push('cibo non registrato');
    }
    if(t){
      var sed = 'sedute fatte ' + t.sessions_done + (t.sessions_planned != null ? ' su ' + t.sessions_planned + ' previste' : '');
      if(t.avg_rir != null) sed += ', margine medio a fine serie ' + it(t.avg_rir) + ' ripetizioni';
      if(t.injury_days > 0) sed += ', ' + t.injury_days + (t.injury_days === 1 ? ' giorno' : ' giorni') + ' di stop per infortunio';
      v.push(sed);
    }
    if(q.weight && q.weight.weight_delta_prev != null) v.push('peso medio ' + segno(q.weight.weight_delta_prev) + ' kg sulla settimana prima');
    return v.length ? titolo + ': ' + v.join('; ') : null;
  }

  function rigaOggi(d){
    var v = [];
    var s = d.session;
    if(s && s.state === 'riposo') v.push('giorno di riposo');
    else if(s && s.state === 'fatta') v.push('seduta già fatta' + (s.label ? ' (' + s.label + ')' : ''));
    else if(s && s.state === 'in_corso') v.push('seduta in corso' + (s.label ? ' (' + s.label + ')' : ''));
    else if(s && s.state === 'da_fare') v.push('seduta da fare' + (s.label ? ': ' + s.label : ''));
    var c = d.cycle;
    if(c && c.weekNum) v.push(c.isScarico ? 'settimana di scarico (la sesta del ciclo)' : 'settimana ' + c.weekNum + ' di 6 del ciclo, di carico');
    if(!v.length) return null;
    var giorno = d.today ? ' (' + GIORNI[mezzogiorno(d.today).getUTCDay()] + ' ' + dataIt(d.today) + ')' : '';
    return 'Oggi' + giorno + ': ' + v.join(' · ');
  }

  function rigaInfortunio(d){
    if(d.injury){
      var r = 'Infortunio in corso';
      if(d.injury.zone) r += ', zona: ' + String(d.injury.zone).trim();
      if(d.injury.endDate) r += ', stop previsto fino al ' + dataIt(d.injury.endDate);
      return r;
    }
    if(d.softReturn) return 'Rientro graduale dopo un infortunio: carichi ridotti in questi giorni';
    return null;
  }

  function rigaCheck(q, today){
    var b = q && q.body;
    if(!b || !b.last_check_date) return null;
    var r = 'Ultimo check fisico: ' + quando(b.last_check_date, today);
    var m = b.last_measurements || {};
    var mis = [];
    if(m.waist_cm) mis.push('vita ' + it(m.waist_cm.value) + ' cm' + (m.waist_cm.delta != null ? ' (' + segno(m.waist_cm.delta) + ')' : ''));
    if(m.body_fat_pct) mis.push('grasso ' + it(m.body_fat_pct.value) + '% da bilancia' + (m.body_fat_pct.delta != null ? ' (' + segno(m.body_fat_pct.delta) + ')' : ''));
    if(mis.length) r += ', ' + mis.join(', ');
    if(b.ai_overall && AI_LBL[b.ai_overall]) r += '; lettura delle foto: ' + AI_LBL[b.ai_overall] + (b.ai_confidence ? ' (fiducia ' + b.ai_confidence + ')' : '');
    if(b.check_due) r += '; è ora di farne uno nuovo';
    return r;
  }

  function rigaProposte(righe){
    var utili = (righe || []).filter(function(r){ return r && r.title && STATO_LBL[r.status] && r.kind !== 'keep'; })
      .sort(function(a, b){ return String(b.decided_at || b.week_start || '').localeCompare(String(a.decided_at || a.week_start || '')); })
      .slice(0, MAX_PROPOSTE);
    if(!utili.length) return null;
    return 'Proposte recenti del coach: ' + utili.map(function(r){
      return '«' + String(r.title).trim() + '» ' + STATO_LBL[r.status] + (r.week_start ? ' (settimana del ' + dataIt(r.week_start) + ')' : '');
    }).join('; ');
  }

  function build(d){
    d = d || {};
    var p = d.profile || {};
    var righe = [];
    var push = function(x){ if(x) righe.push('- ' + x); };

    push(rigaPersona(p));
    var ob = obiettivoLeggibile(p.obiettivo);
    var att = ACTIVITY_LBL[String(p.activity_level || '').toLowerCase()];
    if(ob || att) push([ob ? 'Obiettivo: ' + ob : null, att ? 'attività quotidiana ' + att : null].filter(Boolean).join(' · '));
    var intol = Array.isArray(p.intolleranze) ? p.intolleranze.filter(Boolean) : [];
    if(p.dieta || intol.length) push([p.dieta ? 'Dieta: ' + p.dieta : null, intol.length ? 'intolleranze: ' + intol.join(', ') : null].filter(Boolean).join(' · '));
    var note = String(p.note_salute || '').replace(/\s+/g, ' ').trim();
    if(note) push('Note di salute scritte dalla persona: ' + (note.length > MAX_NOTE ? note.slice(0, MAX_NOTE) + '…' : note));
    var t = d.target;
    if(t && num(t.kcal)) push('Obiettivi del giorno: ' + Math.round(t.kcal) + ' kcal · ' + Math.round(num(t.protein) || 0) + ' g proteine · ' + Math.round(num(t.carbs) || 0) + ' g carboidrati · ' + Math.round(num(t.fat) || 0) + ' g grassi');
    push(rigaPeso((d.current && d.current.weight) || (d.previous && d.previous.weight) || null, p, d.today));
    push(rigaOggi(d));
    push(rigaInfortunio(d));
    push(rigaSettimana('Questa settimana, fin qui', d.current));
    push(rigaSettimana('Settimana scorsa', d.previous));
    push(rigaCheck(d.current || d.previous, d.today));
    push(rigaProposte(d.proposals));

    if(!righe.length) return '';
    return 'CHI È — dati veri presi dall\'app. Servono a non dare consigli alla cieca: usa solo quelli che c\'entrano con la risposta, non elencarli e non commentarli uno per uno. Quello che qui non c\'è non lo sai: non inventarlo.\n' + righe.join('\n');
  }

  return { OBIETTIVO_LBL: OBIETTIVO_LBL, obiettivoLeggibile: obiettivoLeggibile, build: build };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTRitratto;
