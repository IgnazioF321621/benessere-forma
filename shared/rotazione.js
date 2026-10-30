// ═══════════════════════════════════════════════════════════
// shared/rotazione.js — la rotazione delle sedute e il calendario (Training 530 e 540)
// ═══════════════════════════════════════════════════════════
// Modulo condiviso fra l'app e il Worker: una fonte sola, questo file.
// La pagina lo carica con <script src="shared/rotazione.js"> dopo shared/quadro.js e prima del
// proprio codice; il Worker lo importa (rotta /calendario). Richiede ZTQuadro (date e pausa).
//
// Nato il 30 ottobre 2026 (Training 540): le sedute vanno nel Calendario dell'iPhone, e il Worker
// che scrive il calendario deve proporre per ogni giorno la STESSA seduta che propone il telefono.
// Prima la regola viveva solo in computeTrainHomeData (app/home.js); qui c'è una volta sola.
//
//   cicloPer(idSedute)      l'ordine canonico della rotazione: 6 slot, o 7 con la Upper Pump (upperC) e il riposo
//   posizione(allenamenti, ciclo)   dov'è la persona nel giro (Training 530)
//   prossima({...})         la seduta proposta oggi (Training 530; con i giorni scelti, Training 540)
//   sedutePreviste({...})   le sedute dei prossimi giorni, una per giorno scelto (per il calendario e «domani»)
//   ics({...})              il testo iCalendar del calendario a cui iscriversi
//
// Le regole, nell'ordine in cui sono nate:
//   530 (28 ottobre 2026, Ignazio: «Dobbiamo togliere la questione dei debiti, decido io cosa fare»):
//       una proposta sola, la prossima della rotazione dopo l'ultima fatta. La posizione è l'ultima
//       seduta di LAVORO che sta nel ciclo; un recupero conta solo se è lo slot subito dopo di lei
//       (i recuperi sono trasparenti: uno fatto fuori turno non sposta niente). Il riposo del ciclo a 7
//       si propone solo il giorno stesso dell'ultimo allenamento.
//   540 (30 ottobre 2026, Ignazio: «solo sedute vere»): nei giorni della settimana che la persona ha
//       scelto (profiles.train_giorni) la proposta è sempre una seduta di lavoro (Upper o Lower): i
//       recuperi e il riposo si saltano. Fuori dai giorni scelti, o senza giorni scelti, vale il 530.
//       Il calendario mette una seduta per ogni giorno scelto, nessun recupero, e salta i giorni di pausa.
//
// Funzioni PURE: niente rete, niente stato. `allenamenti` sono righe di workouts senza rest/rest_injury,
// le più recenti prima (date desc, created_at desc), come le legge l'app.
var ZTRotazione = (function(){
  'use strict';
  var Q = (typeof ZTQuadro !== 'undefined') ? ZTQuadro : require('./quadro.js');

  var CICLO_6 = ['upperA', 'lowerA', 'recoveryUpper', 'upperB', 'lowerB', 'recoveryLower'];
  var CICLO_7 = ['upperA', 'lowerA', 'recoveryUpper', 'upperB', 'lowerB', 'upperC', 'rest'];
  var GIORNI_PARTENZA = [1, 2, 4, 5];       // lunedì, martedì, giovedì, venerdì: la partenza che la persona vede e cambia
  var ORARIO_PARTENZA = '07:00';
  var SETTIMANE = 4;                         // quante settimane entrano nel calendario
  var DURATA_MIN = 60;                       // ogni seduta nel calendario dura un'ora
  var AVVISO_MIN = 15;                       // l'avviso, prima della seduta
  var TZ = 'Europe/Rome';
  var PREFISSO = '[Workout] ';               // davanti al nome della seduta nel Calendario
  var ORARIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

  function eRecupero(sid){ return /^recovery/i.test(String(sid || '')); }
  function eRiposo(sid){ return /^rest/.test(String(sid || '')); }
  function eLavoro(sid){ return !!sid && !eRecupero(sid) && !eRiposo(sid); }

  // Il ciclo della scheda: 7 slot se la scheda ha la Upper Pump (upperC), altrimenti 6. Copie: chi le riceve può toccarle.
  function cicloPer(idSedute){
    return (Array.isArray(idSedute) && idSedute.indexOf('upperC') !== -1) ? CICLO_7.slice() : CICLO_6.slice();
  }

  // 1 = lunedì … 7 = domenica, da 'YYYY-MM-DD' (la data di calendario, senza fusi)
  function giornoSettimana(key){ var d = new Date(key + 'T12:00:00Z').getUTCDay(); return d === 0 ? 7 : d; }

  // I giorni scelti puliti e in ordine (1..7, senza doppioni), oppure null se non ce ne sono
  function giorniScelti(lista){
    if(!Array.isArray(lista)) return null;
    var out = [];
    lista.forEach(function(g){ var n = Number(g); if(n >= 1 && n <= 7 && n === Math.floor(n) && out.indexOf(n) === -1) out.push(n); });
    return out.length ? out.sort(function(a, b){ return a - b; }) : null;
  }
  function orarioValido(s){ return ORARIO_RE.test(String(s || '')) ? String(s) : null; }

  // La posizione nel giro (Training 530) → { ultima: riga | null, indice: -1..len-1 }
  function posizione(allenamenti, ciclo){
    var righe = (allenamenti || []).filter(function(w){ return w && w.session_type; });
    var lavoro = null, iLavoro = -1, i;
    for(i = 0; i < righe.length; i++){
      if(!eRecupero(righe[i].session_type) && ciclo.indexOf(righe[i].session_type) !== -1){ lavoro = righe[i]; iLavoro = i; break; }
    }
    if(!lavoro){
      // nessuna seduta di lavoro del ciclo: l'ultima di lavoro qualsiasi (una scheda di prima), come nell'app
      for(i = 0; i < righe.length; i++){ if(!eRecupero(righe[i].session_type)){ lavoro = righe[i]; iLavoro = i; break; } }
    }
    if(!lavoro) return { ultima: null, indice: -1 };
    var idx = ciclo.indexOf(lavoro.session_type), recupero = null;
    if(idx >= 0){
      // il recupero nel turno: fra le righe più recenti della seduta di lavoro, quello dello slot subito dopo
      for(i = 0; i < iLavoro; i++){
        if(eRecupero(righe[i].session_type) && ciclo.indexOf(righe[i].session_type) === (idx + 1) % ciclo.length){ recupero = righe[i]; break; }
      }
    }
    var ultima = recupero || lavoro;
    return { ultima: ultima, indice: ciclo.indexOf(ultima.session_type) };
  }

  // La prossima seduta di LAVORO dopo un indice: salta recuperi e riposo. Con indice -1 (nessuna seduta) la prima del ciclo.
  function prossimoLavoro(indice, ciclo){
    for(var k = 1; k <= ciclo.length; k++){ var c = ciclo[(indice + k) % ciclo.length]; if(eLavoro(c)) return c; }
    return ciclo[0];
  }

  // La regola del 530: lo slot dopo la posizione; il riposo solo il giorno stesso dell'ultimo allenamento,
  // altrimenti il primo slot dopo di lui che non è un riposo.
  function dopoPosizione(pos, ciclo, oggi){
    var next = pos.indice >= 0 ? ciclo[(pos.indice + 1) % ciclo.length] : ciclo[0];
    if(eRiposo(next) && !(pos.ultima && oggi && pos.ultima.date === oggi)){
      var i = ciclo.indexOf(next);
      for(var k = 1; k <= ciclo.length; k++){ var c = ciclo[(i + k) % ciclo.length]; if(!eRiposo(c)){ next = c; break; } }
    }
    return next;
  }

  // La seduta proposta oggi.
  //   prossima({ allenamenti, ciclo, oggi, giorni }) → sid
  //   giorni: profiles.train_giorni (Training 540). Nei giorni scelti solo sedute di lavoro; altrimenti il 530.
  function prossima(o){
    o = o || {};
    var ciclo = o.ciclo || CICLO_6, pos = posizione(o.allenamenti, ciclo);
    var gs = giorniScelti(o.giorni);
    if(gs && o.oggi && gs.indexOf(giornoSettimana(o.oggi)) !== -1) return prossimoLavoro(pos.indice, ciclo);
    return dopoPosizione(pos, ciclo, o.oggi);
  }

  // Le sedute dei prossimi giorni, una per ogni giorno scelto, solo di lavoro (Training 540).
  //   sedutePreviste({ allenamenti, ciclo, oggi, giorni, settimane, profile, fattaOggi }) → [{ date, sid }]
  //   profile: per la pausa (pausa_inizio, pausa_fine, pausa_moduli): i giorni in pausa per l'allenamento restano vuoti
  //   fattaOggi: la seduta in corso adesso sul telefono (non ancora in workouts); oggi vale lei e si riparte da lì
  // Senza giorni scelti non c'è niente da prevedere: [].
  function sedutePreviste(o){
    o = o || {};
    var ciclo = o.ciclo || CICLO_6, gs = giorniScelti(o.giorni);
    if(!gs || !o.oggi) return [];
    var pos = posizione(o.allenamenti, ciclo), indice = pos.indice;
    var righe = (o.allenamenti || []).filter(function(w){ return w && w.session_type; });
    var lavoroOggi = null;
    for(var i = 0; i < righe.length; i++){ if(righe[i].date === o.oggi && eLavoro(righe[i].session_type)){ lavoroOggi = righe[i].session_type; break; } }
    var fattaOggi = (o.fattaOggi && eLavoro(o.fattaOggi)) ? o.fattaOggi : lavoroOggi;
    if(fattaOggi && ciclo.indexOf(fattaOggi) !== -1) indice = ciclo.indexOf(fattaOggi);
    var totale = (o.settimane || SETTIMANE) * 7, out = [];
    for(var n = 0; n < totale; n++){
      var d = Q.addDays(o.oggi, n);
      if(gs.indexOf(giornoSettimana(d)) === -1) continue;
      if(o.profile && Q.pausaAttivaIl(o.profile, d, 'allenamento')) continue;
      if(n === 0 && fattaOggi){ out.push({ date: d, sid: fattaOggi }); continue; }
      if(n === 0 && pos.ultima && pos.ultima.date === o.oggi) continue;   // oggi è già stato fatto un recupero: niente seduta oggi
      var sid = prossimoLavoro(indice, ciclo);
      out.push({ date: d, sid: sid });
      indice = ciclo.indexOf(sid);
    }
    return out;
  }

  // ── Il calendario (iCalendar, RFC 5545) ──
  // ics({ eventi: [{ date, sid }], nomi: { sid: nome }, orario: 'HH:MM', chiave, adesso, durataMin, avvisoMin, timeZone })
  // Gli orari vanno in UTC, calcolati giorno per giorno con l'ora di Roma: giusti anche a cavallo del cambio dell'ora.
  // L'UID è stabile per giorno e persona (una seduta che cambia nome resta lo stesso evento, non un doppione).
  // Il titolo dell'evento è «[Workout] Upper B» (scelta di Ignazio, 30 ottobre 2026): un prefisso fisso e il nome della seduta.
  function ics(o){
    o = o || {};
    var tz = o.timeZone || TZ, clock = Q.makeClock(tz);
    var orario = orarioValido(o.orario) || ORARIO_PARTENZA;
    var durata = o.durataMin || DURATA_MIN;
    var avviso = (o.avvisoMin == null) ? AVVISO_MIN : o.avvisoMin;
    var stamp = dataIcs(o.adesso != null ? o.adesso : Date.now());
    var righe = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zona Tracker//Sedute//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:Zona Tracker', 'X-WR-TIMEZONE:' + tz, 'REFRESH-INTERVAL;VALUE=DURATION:PT4H', 'X-PUBLISHED-TTL:PT4H'];
    (o.eventi || []).forEach(function(e){
      var inizio = clock.parseLocal(e.date, orario + ':00'), fine = inizio + durata * 60000;
      var nome = (o.nomi && o.nomi[e.sid]) || e.sid;
      righe.push('BEGIN:VEVENT',
        'UID:' + uid(o.chiave, e.date),
        'DTSTAMP:' + stamp,
        'DTSTART:' + dataIcs(inizio),
        'DTEND:' + dataIcs(fine),
        'SUMMARY:' + scappa(PREFISSO + nome),
        'DESCRIPTION:' + scappa('La seduta di oggi secondo la tua rotazione. Apri Zona Tracker per iniziare.'),
        'BEGIN:VALARM', 'TRIGGER:-PT' + avviso + 'M', 'ACTION:DISPLAY', 'DESCRIPTION:' + scappa(PREFISSO + nome + ' fra ' + avviso + ' minuti'), 'END:VALARM',
        'END:VEVENT');
    });
    righe.push('END:VCALENDAR');
    return righe.map(piega).join('\r\n') + '\r\n';
  }
  function dataIcs(ms){ return new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; }   // 20261031T063000Z
  function scappa(s){ return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  // Una riga lunga si piega a 75 ottetti, le continuazioni cominciano con uno spazio (RFC 5545 §3.1); mai dentro un carattere.
  function piega(riga){
    var out = '', pezzo = '', ottetti = 0, limite = 75;
    for(var i = 0; i < riga.length; i++){
      var ch = riga[i], cod = riga.charCodeAt(i);
      if(cod >= 0xD800 && cod <= 0xDBFF && i + 1 < riga.length){ ch += riga[i + 1]; i++; }
      var b = ottettiUtf8(ch);
      if(ottetti + b > limite){ out += pezzo + '\r\n'; pezzo = ' '; ottetti = 1; limite = 75; }
      pezzo += ch; ottetti += b;
    }
    return out + pezzo;
  }
  function ottettiUtf8(ch){ var c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
  // Un'impronta corta e non reversibile della chiave (l'id della persona): l'UID non porta in giro l'id intero
  function impronta(s){ var h = 5381; s = String(s || ''); for(var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function uid(chiave, date){ return 'zt-' + impronta(chiave) + '-' + date + '@zona-tracker'; }

  return {
    CICLO_6: CICLO_6, CICLO_7: CICLO_7, GIORNI_PARTENZA: GIORNI_PARTENZA, ORARIO_PARTENZA: ORARIO_PARTENZA,
    SETTIMANE: SETTIMANE, DURATA_MIN: DURATA_MIN, AVVISO_MIN: AVVISO_MIN, TZ: TZ, PREFISSO: PREFISSO,
    eRecupero: eRecupero, eRiposo: eRiposo, eLavoro: eLavoro, cicloPer: cicloPer, giornoSettimana: giornoSettimana,
    giorniScelti: giorniScelti, orarioValido: orarioValido,
    posizione: posizione, prossima: prossima, sedutePreviste: sedutePreviste, ics: ics,
  };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTRotazione;
