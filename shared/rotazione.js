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
//   durataSeduta(sess, {...})       quanto dura una seduta, in secondi (Training 541)
//   righeSeduta / descrizione(...)  gli esercizi della seduta a parole, per il Calendario (Training 541)
//   scaricoPerEventi({...})         quali sedute previste cadono nella settimana di scarico (Training 541)
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
//   541 (1 novembre 2026, Ignazio: il feed completo per i workout): ogni evento ha gli esercizi della seduta
//       (in scarico le ripetizioni al minimo, come computeNextSetSuggestion), la durata stimata della seduta
//       con la regola che usa anche l'app, e un indirizzo che apre l'app su Training.
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
  var URL_TRAINING = 'https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?apri=training';
  var DESCRIZIONE_MAX = 1000;                // ottetti della DESCRIPTION di un evento, oltre si tronca con «…»
  // I tempi della seduta, in secondi (Training 541). Erano nel generatore (_TRAIN_GEN_TIME_BUDGET) e nel flusso del
  // riscaldamento (WARMUP_*): adesso stanno qui, una volta, e il generatore, il riscaldamento e il calendario li leggono.
  //   attivazione  il blocco fisso d'apertura (ACTIVATION_BLOCK: 2 + 2 + 1 minuti)
  //   finisher     il Tabata, se la scheda non ne scrive i round
  //   voce, riposoVoce, lato, pausaLato   il riscaldamento: 60 s a voce, 10 s fra le voci, 30 s per lato e 5 per cambiare
  // Il riscaldamento specifico dura al massimo 3 minuti (Training 390, 17 novembre 2026, segnalazione di Ignazio 3e11a3d8:
  // «6 esercizi · 6 min 20 s», ci si perde): 3 voci da 50 secondi e 10 per cambiare = 170 s (una voce per lato: 20 + 5 + 20).
  // Prima dei pesi basta un riscaldamento breve e specifico, senza fatica: Fradkin, Zazryn e Smoliga 2010 (J Strength Cond
  // Res 24:140), McGowan et al. 2015 (Sports Med 45:1523). Le serie di avvicinamento le fa la prima serie leggera.
  //
  // La durata di una seduta si misura a serie (Training 410, 23 novembre 2026). Nei log di Ignazio una serie prende
  // circa 150 secondi con tutto il resto: la serie, registrarla, la pausa, spostarsi, preparare l'attrezzo
  // (17 novembre: 63 minuti per 23 serie; 23 novembre: 20 serie dalle 7:40 alle 8:31). È il numero su cui si
  // dimensiona la seduta finché una seduta col flusso a blocchi non dice altro: il riepilogo di fine seduta mette i
  // secondi veri a serie accanto a questi (Training 410). Il conto a ripetizioni del Training 400 (3 s a ripetizione,
  // il recupero scritto, i cambi) dava 2-6% sopra il vero solo dove le pause erano lunghe; resta per le pause del giro.
  //   serieMisurata   una serie con tutto quello che le sta intorno
  //   prepara         il tempo per sistemare l'attrezzo di un blocco, nel timer fra un blocco e l'altro
  //   ripetizione, registro, serie   il lavoro di una serie, per le pause dentro un blocco (lavoroSerie)
  //   pausaMinima     la pausa più corta fra due esercizi di un blocco: il tempo di spostarsi
  var TEMPO = { attivazione: 300, serieMisurata: 150, prepara: 120, serie: 30, ripetizione: 3, registro: 15, pausaMinima: 15,
    finisher: 300, voce: 50, riposoVoce: 10, lato: 20, pausaLato: 5 };
  var RISCALDAMENTO_VOCI = 3, RISCALDAMENTO_MAX = 180;
  var RECUPERO_PARTENZA = 90;                // il recupero fra le serie quando la scheda non lo scrive

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

  // ── La seduta: l'elenco degli esercizi e la durata (Training 541, 1 novembre 2026) ──
  // Le ripetizioni scritte nella scheda (la regola di parseRepsRange nell'app, che ora chiama questa):
  //   "4-6" · "4-6 per lato" → reps · "20-30 sec" · "20-30 sec per lato" · "30 sec" → sec · "10 min" → null
  function leggiReps(repsStr){
    if(!repsStr) return null;
    var s = String(repsStr).trim();
    if(/\bmin\b/i.test(s)) return null;
    var m = s.match(/^(\d+)-(\d+)\s*sec(?:\s+per lato)?$/i);
    if(m) return { kind:'seconds', min:parseInt(m[1],10), max:parseInt(m[2],10), perLato:/per lato/i.test(s), unit:'sec' };
    m = s.match(/^(\d+)\s*sec(?:\s+per lato)?$/i);
    if(m){ var n = parseInt(m[1],10); return { kind:'seconds', min:n, max:n, perLato:/per lato/i.test(s), unit:'sec' }; }
    m = s.match(/^(\d+)-(\d+)(?:\s+per lato)?$/);
    if(m) return { kind:'reps', min:parseInt(m[1],10), max:parseInt(m[2],10), perLato:/per lato/i.test(s), unit:'reps' };
    return null;
  }

  // Si conta per lato (la regola di _contaPerLato nell'app, Training 520, che ora chiama questa): lo dice la
  // prescrizione («per lato») o il catalogo (unilaterale = si); «alternato» conta per lato solo a ripetizioni.
  //   unilaterale: 'si' | 'alternato' | 'no' | null, dal jsonb della scheda o dal catalogo
  function contaPerLato(ex, unilaterale, parsed){
    if(!ex) return false;
    var pr = parsed || leggiReps(ex.reps);
    var u = ex.unilaterale || unilaterale || null;
    if((pr && pr.perLato) || u === 'si') return true;
    if(u !== 'alternato') return false;
    return !((pr && pr.kind === 'seconds') || ex.isTimed);
  }

  // Il riscaldamento, in secondi, con lo stesso conto del flusso dell'app (_warmupDurataTotale, che ora chiama questa):
  // ogni voce col suo tempo (per lato i due lati e la pausa per cambiare; un allungamento fermo «30 sec» dura i suoi
  // secondi, al massimo 60), 10 s fra una voce e l'altra.
  // Le tre voci di un riscaldamento scritto prima del 390 (6 nell'Upper, 5 nella Lower, nell'ordine del generatore:
  // due voci di movimento leggero, poi le zone). Restano il movimento leggero e le due zone che contano per la seduta:
  // scapole e cuffia dei rotatori nell'Upper, anche e ginocchia nella Lower. Fino a 3 voci non cambia niente. Solo in
  // lettura: la scheda salvata non si riscrive. La stessa regola per l'app e per il Calendario.
  function riscaldamentoBreve(items){
    var voci = (items || []).filter(Boolean);
    if(voci.length <= RISCALDAMENTO_VOCI) return voci;
    var idx = voci.length >= 6 ? [0, 3, 4] : [0, 2, 3];
    return idx.map(function(i){ return voci[i]; });
  }
  function riscaldamentoSec(items){
    var voci = riscaldamentoBreve(items);
    if(!voci.length) return 0;
    var t = 0;
    voci.forEach(function(w){
      var pr = leggiReps(w.reps);
      if(pr && pr.kind === 'seconds' && pr.perLato) t += 2 * TEMPO.lato + TEMPO.pausaLato;
      else t += (pr && pr.kind === 'seconds' && pr.min > 0) ? Math.min(pr.min, TEMPO.voce) : TEMPO.voce;
    });
    return t + (voci.length - 1) * TEMPO.riposoVoce;
  }

  // Il Tabata in fondo alla seduta di quel giorno? profiles.tabata = 'coda' sempre, 'giorni' nei giorni di
  // profiles.tabata_giorni (1 = lunedì); 'spento', 'a_parte' o nulla no (Training 490; tabataInCoda nell'app chiama questa).
  function tabataInCoda(profile, key){
    var m = profile && profile.tabata;
    if(m === 'coda') return true;
    if(m === 'giorni') return ((profile && profile.tabata_giorni) || []).map(Number).indexOf(giornoSettimana(key)) !== -1;
    return false;
  }
  function haFinisher(sess){ return !!(sess && sess.finisher && Array.isArray(sess.finisher.exercises) && sess.finisher.exercises.length); }
  function tabataSec(f){ return (f && f.round && f.work_sec) ? f.round * (f.work_sec + (f.rest_sec || 0)) : TEMPO.finisher; }

  // Il recupero fra le serie: quello dell'esercizio, poi quello della seduta («3 min», «90 sec»), poi 90 s.
  function recuperoSec(ex, sess){
    var r = Number(ex && ex.rest_sec);
    if(r > 0) return r;
    var m = String((sess && sess.rest) || '').match(/(\d+)\s*(min|sec|s)\b/i);
    if(m) return parseInt(m[1], 10) * (/^min/i.test(m[2]) ? 60 : 1);
    return RECUPERO_PARTENZA;
  }

  // Una serie, in secondi: le tenute i secondi più alti; a ripetizioni 3 s l'una più il tempo di registrare
  // (4-6 → 33 s, 8-12 → 51 s, 12-15 → 60 s); per lato il doppio del lavoro.
  function lavoroSerie(ex, unilaterale){
    var pr = leggiReps(ex && ex.reps), lati = contaPerLato(ex, unilaterale, pr) ? 2 : 1;
    if(pr && pr.kind === 'seconds') return pr.max * lati;
    if(pr) return pr.max * TEMPO.ripetizione * lati + TEMPO.registro;
    return TEMPO.serie * lati;
  }

  // ── La seduta a blocchi (Training 410, 23 novembre 2026) ──
  // Ignazio: le coppie gli piacciono, ma «non si capiva niente». La seduta si divide in 3-5 blocchi, uno dopo l'altro.
  // In un blocco gli esercizi (A1, A2, A3) si fanno a giri: una serie di ognuno, poi di nuovo il primo. Il giro dura
  // almeno il recupero scritto dell'esercizio che riposa di più, così fra due serie dello STESSO esercizio passa sempre
  // il suo recupero; le pause fra un esercizio e l'altro sono quello che avanza, mai meno del tempo di spostarsi.
  //   · i multiarticolari dell'Upper vanno in coppia spinta e tirata, sullo stesso piano quando c'è (Robbins et al.
  //     2010, J Strength Cond Res 24:2632; Weakley et al. 2017; Iversen et al. 2021, Sports Med 51:2079: stesso volume
  //     in meno tempo); quelli di gambe no, ognuno nel suo blocco: due multiarticolari di gambe pesano sugli stessi
  //     muscoli e sul fiato;
  //   · un multiarticolare da solo prende come compagno un isolamento che non lavora i suoi muscoli, poi un core
  //     (lo schema A1/A2 di Poliquin);
  //   · gli isolamenti che avanzano fanno la rifinitura, a 3 per blocco; quelli in più entrano come riempitivi leggeri
  //     in un blocco di multiarticolari che non lavora i loro muscoli (gli esercizi di riempimento di Cressey);
  //   · il core sta nell'ultimo blocco.
  // La scheda può scrivere il blocco di ogni esercizio (`blocco`: 'A', 'B'…, e `riempitivo`); se non lo scrive, i
  // blocchi si ricavano con questa regola. Ogni blocco dice cosa preparare: gli attrezzi dei suoi esercizi.
  var GRUPPI_DEL_PATTERN = {
    'spinta orizzontale': ['petto', 'tricipiti', 'deltoidi anteriori'], 'spinta verticale': ['deltoidi anteriori', 'tricipiti', 'deltoidi laterali'],
    'tirata orizzontale': ['dorsali', 'bicipiti', 'deltoidi posteriori'], 'tirata verticale': ['dorsali', 'bicipiti'],
    'dominante ginocchia': ['quadricipiti', 'glutei'], 'dominante anca': ['glutei', 'ischiocrurali']
  };
  var LETTERE = 'ABCDEFGH';
  var LEGGERI = ['deltoidi posteriori', 'polpacci', 'deltoidi laterali'];   // i riempitivi d'elezione: poca fatica, nessun carico sulla schiena
  function patternDi(ex){ return String((ex && ex.pattern) || '').toLowerCase().trim(); }
  function gruppiDi(ex){
    var pat = patternDi(ex);
    if(GRUPPI_DEL_PATTERN[pat]) return GRUPPI_DEL_PATTERN[pat].slice();
    return String((ex && ex.gruppo_target) || '').toLowerCase().split(';').map(function(x){ return x.trim(); }).filter(Boolean);
  }
  function eCore(ex){ return patternDi(ex) === 'core'; }
  function eMulti(ex){ return !!ex && !ex.iso && !eCore(ex) && patternDi(ex) !== 'isolamento'; }
  function siToccano(a, b){ var ga = gruppiDi(a); return gruppiDi(b).some(function(g){ return ga.indexOf(g) !== -1; }); }
  function piano(ex){ return patternDi(ex).replace(/^(spinta|tirata)\s*/, ''); }

  // Gli attrezzi da preparare: quelli scritti in `eq`, senza il corpo libero, nell'ordine in cui arrivano.
  function attrezziDi(esercizi){
    var out = [];
    esercizi.forEach(function(ex){
      String((ex && ex.eq) || '').split(/[+,;]/).forEach(function(a){
        a = a.trim().toLowerCase();
        if(a && a !== 'corpo libero' && out.indexOf(a) === -1) out.push(a);
      });
    });
    return out;
  }
  function titoloBlocco(voci){
    var multi = voci.filter(function(v){ return eMulti(v.ex); }).map(function(v){ return v.ex; });
    if(multi.length >= 2){
      var p = piano(multi[0]);
      if(multi.every(function(m){ return piano(m) === p; }) && p) return 'Spinta e tirata ' + (p === 'orizzontale' ? 'orizzontali' : p === 'verticale' ? 'verticali' : p);
      return 'Spinta e tirata';
    }
    if(multi.length === 1){
      var pat = patternDi(multi[0]);
      return pat === 'dominante ginocchia' ? 'Ginocchia' : pat === 'dominante anca' ? 'Anca' : pat.charAt(0).toUpperCase() + pat.slice(1);
    }
    if(voci.every(function(v){ return eCore(v.ex); })) return 'Core';
    return 'Rifinitura';
  }

  // I blocchi ricavati dagli esercizi (quando la scheda non li scrive): [[{ex, riempitivo}], …]
  function ricavaBlocchi(lista){
    var multi = lista.filter(eMulti), iso = lista.filter(function(e){ return !eMulti(e) && !eCore(e); }), core = lista.filter(eCore);
    var principali = [], usati = [];
    var upper = multi.some(function(m){ return /^spinta/.test(patternDi(m)); }) && multi.some(function(m){ return /^tirata/.test(patternDi(m)); });
    if(upper){
      var spinte = multi.filter(function(m){ return /^spinta/.test(patternDi(m)); }), tirate = multi.filter(function(m){ return /^tirata/.test(patternDi(m)); });
      // prima le coppie sullo stesso piano, poi spinta e tirata qualsiasi
      spinte.forEach(function(sp){
        var ti = tirate.filter(function(t){ return usati.indexOf(t) === -1 && piano(t) === piano(sp); })[0];
        if(ti){ principali.push([sp, ti]); usati.push(sp, ti); }
      });
      spinte.forEach(function(sp){
        if(usati.indexOf(sp) !== -1) return;
        var ti = tirate.filter(function(t){ return usati.indexOf(t) === -1; })[0];
        if(ti){ principali.push([sp, ti]); usati.push(sp, ti); }
      });
    }
    multi.forEach(function(m){ if(usati.indexOf(m) === -1){ principali.push([m]); usati.push(m); } });
    // nell'ordine della scheda (il primo esercizio di ogni blocco), ogni coppia nell'ordine della scheda
    principali.forEach(function(b){ b.sort(function(x, y){ return lista.indexOf(x) - lista.indexOf(y); }); });
    principali.sort(function(a, b){ return lista.indexOf(a[0]) - lista.indexOf(b[0]); });
    var blocchi = principali.map(function(b){ return b.map(function(ex){ return { ex: ex, riempitivo: false }; }); });
    var isoLiberi = iso.slice(), coreLiberi = core.slice();
    // un multiarticolare da solo: un compagno che non lavora i suoi muscoli, prima un isolamento, poi un core
    blocchi.forEach(function(b){
      if(b.length !== 1) return;
      var c = isoLiberi.filter(function(e){ return !siToccano(e, b[0].ex); })[0];
      if(c){ isoLiberi.splice(isoLiberi.indexOf(c), 1); b.push({ ex: c, riempitivo: false }); return; }
      if(coreLiberi.length > 1){ b.push({ ex: coreLiberi.shift(), riempitivo: false }); }
    });
    // gli isolamenti in più di tre: riempitivi nei blocchi di multiarticolari, prima i più leggeri
    while(isoLiberi.length > 3){
      var leggero = isoLiberi.slice().sort(function(a, b){
        var la = LEGGERI.indexOf(gruppiDi(a)[0]), lb = LEGGERI.indexOf(gruppiDi(b)[0]);
        return (la === -1 ? 99 : la) - (lb === -1 ? 99 : lb);
      })[0];
      var dove = blocchi.filter(function(b){ return b.length < 3 && b.every(function(v){ return !siToccano(v.ex, leggero); }); })[0];
      if(!dove) break;
      isoLiberi.splice(isoLiberi.indexOf(leggero), 1);
      dove.push({ ex: leggero, riempitivo: true });
    }
    for(var k = 0; k < isoLiberi.length; k += 3) blocchi.push(isoLiberi.slice(k, k + 3).map(function(ex){ return { ex: ex, riempitivo: false }; }));
    for(var c2 = 0; c2 < coreLiberi.length; c2 += 3) blocchi.push(coreLiberi.slice(c2, c2 + 3).map(function(ex){ return { ex: ex, riempitivo: false }; }));
    return blocchi.filter(function(b){ return b.length; });
  }

  // La seduta a blocchi:
  //   blocchi(sess, { unilaterale }) → [{ lettera, titolo, voci:[{ ex, tag, riempitivo, pausa }], attrezzi, giro, serie, minuti }]
  //   giro: i secondi di un giro (una serie di ogni voce); pausa: dopo la serie di quella voce, verso la successiva del giro.
  //   Un blocco di un esercizio solo ha come pausa il suo recupero scritto.
  function blocchi(sess, o){
    o = o || {};
    var uni = typeof o.unilaterale === 'function' ? o.unilaterale : function(){ return null; };
    var lista = ((sess && sess.exercises) || []).filter(function(e){ return e && Number(e.sets) > 0; });
    if(!lista.length) return [];
    var gruppi;
    if(lista.every(function(e){ return e.blocco; })){
      var ordine = [];
      lista.forEach(function(e){ if(ordine.indexOf(e.blocco) === -1) ordine.push(e.blocco); });
      ordine.sort();
      gruppi = ordine.map(function(l){ return lista.filter(function(e){ return e.blocco === l; }).map(function(e){ return { ex: e, riempitivo: !!e.riempitivo }; }); });
    } else gruppi = ricavaBlocchi(lista);
    return gruppi.map(function(voci, bi){
      var lettera = LETTERE.charAt(bi) || String(bi + 1);
      var lavori = voci.map(function(v){ return lavoroSerie(v.ex, uni(v.ex)); });
      var lavoro = lavori.reduce(function(a, b){ return a + b; }, 0);
      var giro, pause;
      if(voci.length === 1){
        giro = lavori[0] + recuperoSec(voci[0].ex, sess);
        pause = [recuperoSec(voci[0].ex, sess)];
      } else {
        var serve = Math.max.apply(null, voci.filter(function(v){ return !v.riempitivo; }).map(function(v){ return recuperoSec(v.ex, sess); }).concat([0]));
        giro = Math.max(serve, lavoro + voci.length * TEMPO.pausaMinima);
        var p = Math.max(TEMPO.pausaMinima, Math.ceil((giro - lavoro) / voci.length / 5) * 5);   // per eccesso: il giro non scende sotto il recupero
        pause = voci.map(function(){ return p; });
        giro = lavoro + p * voci.length;
      }
      var serie = voci.reduce(function(a, v){ return a + Number(v.ex.sets); }, 0);
      return {
        lettera: lettera, titolo: titoloBlocco(voci), attrezzi: attrezziDi(voci.map(function(v){ return v.ex; })),
        voci: voci.map(function(v, i){ return { ex: v.ex, tag: lettera + (i + 1), riempitivo: v.riempitivo, pausa: pause[i] }; }),
        giro: giro, serie: serie, minuti: Math.round(serie * TEMPO.serieMisurata / 60)
      };
    });
  }
  // I passi della seduta in ordine: blocco per blocco, giro per giro, una serie di ogni voce che ne ha ancora.
  //   passi(bl) → [{ b, v, serie }]   (b, v: indici nel blocco e nella voce; serie: 1, 2, 3…)
  function passi(bl){
    var out = [];
    bl.forEach(function(b, bi){
      var giri = Math.max.apply(null, b.voci.map(function(v){ return Number(v.ex.sets) || 0; }));
      for(var g = 1; g <= giri; g++) b.voci.forEach(function(v, vi){ if(g <= Number(v.ex.sets)) out.push({ b: bi, v: vi, serie: g }); });
    });
    return out;
  }
  // Il passo da fare adesso, con quante serie ha fatto ogni esercizio: fatte(ex) → numero.
  //   adesso(bl, fatte) → { b, v, serie, voce, blocco, indice } | null (seduta finita)
  // Il primo passo la cui serie non è ancora fatta: chi salta una serie o fa un esercizio fuori ordine non rompe niente.
  function adesso(bl, fatte){
    var ps = passi(bl);
    for(var i = 0; i < ps.length; i++){
      var v = bl[ps[i].b].voci[ps[i].v];
      if(fatte(v.ex) < ps[i].serie) return { b: ps[i].b, v: ps[i].v, serie: ps[i].serie, voce: v, blocco: bl[ps[i].b], indice: i };
    }
    return null;
  }
  // Il timer dopo una serie: verso il passo che viene adesso, sapendo da dove si arriva.
  //   pausaVerso(bl, da: {b, v}, poi: passo | null) → { sec, prepara: bool }
  // Nello stesso blocco la pausa della voce appena fatta; in un blocco nuovo il tempo per prepararlo; finita, niente.
  function pausaVerso(bl, da, poi){
    if(!poi) return { sec: 0, prepara: false };
    if(!da || da.b !== poi.b) return { sec: TEMPO.prepara, prepara: true };
    return { sec: bl[da.b].voci[da.v].pausa, prepara: false };
  }

  // Quanto dura una seduta, in secondi: attivazione + riscaldamento + ogni serie a TEMPO.serieMisurata (serie,
  // registrazione, pause, spostamenti e preparazione compresi) + il Tabata se c'è quel giorno.
  //   durataSeduta(sess, { tabata: bool })
  // Il carry conclusivo della scheda non si conta: l'app non lo mostra nella seduta.
  function durataSeduta(sess, o){
    o = o || {};
    if(!sess) return 0;
    var serie = (sess.exercises || []).filter(Boolean).reduce(function(a, ex){ return a + Math.max(0, Number(ex.sets) || 0); }, 0);
    var t = TEMPO.attivazione + riscaldamentoSec(sess.warmup) + serie * TEMPO.serieMisurata;
    if(o.tabata && haFinisher(sess)) t += tabataSec(sess.finisher);
    return t;
  }
  // I minuti da mostrare: ai 5 più vicini, almeno 5.
  function minutiSeduta(sec){ return Math.max(5, Math.round((Number(sec) || 0) / 300) * 5); }

  // Gli esercizi della seduta a parole, una riga ciascuno: «1. Rematore manubri panca piana — 3 × 8-12».
  //   righeSeduta(sess, { unilaterale, scarico })
  // In scarico le ripetizioni sono il minimo dell'intervallo, come la prima serie in computeNextSetSuggestion.
  function bersaglio(ex, pr, perLato, scarico){
    var r = String(ex.reps || '').trim();
    if(scarico && pr) r = pr.min + (pr.kind === 'seconds' ? ' sec' : '') + (pr.perLato ? ' per lato' : '');
    if(r && perLato && !/per lato/i.test(r)) r += ' per lato';
    return r;
  }
  function righeSeduta(sess, o){
    o = o || {};
    var uni = typeof o.unilaterale === 'function' ? o.unilaterale : function(){ return null; };
    return ((sess && sess.exercises) || []).filter(Boolean).map(function(ex, i){
      var pr = leggiReps(ex.reps), b = bersaglio(ex, pr, contaPerLato(ex, uni(ex), pr), !!o.scarico);
      var n = Number(ex.sets) || 0;
      return (i + 1) + '. ' + (ex.name || ex.codice || 'Esercizio') + (n ? ' — ' + n + ' × ' + (b || '?') : (b ? ' — ' + b : ''));
    });
  }

  // Il testo della DESCRIPTION di un evento: la durata, lo scarico, il riscaldamento, gli esercizi, il Tabata.
  //   descrizione(sess, { unilaterale, scarico, tabata, maxOttetti })
  // Oltre maxOttetti (contati scappati, come vanno nel file, con l'etichetta «DESCRIPTION:») gli ultimi esercizi
  // lasciano il posto a «…»; se non basta, si tiene la sola prima riga.
  function descrizione(sess, o){
    o = o || {};
    if(!sess) return '';
    var testa = ['Circa ' + minutiSeduta(durataSeduta(sess, o)) + ' minuti'];
    if(o.scarico) testa.push('Settimana di scarico: carichi più leggeri, RIR 3+');
    var nRisc = ((sess.warmup || []).filter(Boolean)).length;
    testa.push('Preparazione 5 min' + (nRisc ? ' e riscaldamento (' + nRisc + (nRisc === 1 ? ' esercizio)' : ' esercizi)') : ''));
    var corpo = righeSeduta(sess, o);
    var coda = (o.tabata && haFinisher(sess)) ? ['Tabata in coda: ' + (sess.finisher.round || 8) + ' round, ' + Math.round(tabataSec(sess.finisher) / 60) + ' min'] : [];
    var max = o.maxOttetti || DESCRIZIONE_MAX;
    var unisci = function(c, tagliato){ return testa.concat(c, tagliato ? ['…'] : [], coda).join('\n'); };
    var testo = unisci(corpo, false);
    var pesa = function(t){ return ottettiTesto('DESCRIPTION:' + scappa(t)); };
    while(corpo.length && pesa(testo) > max){ corpo = corpo.slice(0, -1); testo = unisci(corpo, true); }
    return pesa(testo) > max ? testa[0] : testo;
  }
  function ottettiTesto(s){ var t = 0; for(var i = 0; i < s.length; i++){ var c = s.charCodeAt(i); if(c >= 0xD800 && c <= 0xDBFF){ t += 4; i++; } else t += c < 0x80 ? 1 : c < 0x800 ? 2 : 3; } return t; }

  // Quali sedute previste cadono nella settimana di scarico (mesociclo 5+1, ZTQuadro.cycleWeekInfo: la regola di
  // getCycleWeekInfo nell'app). Ogni seduta prevista conta come fatta per quelle dopo di lei.
  //   scaricoPerEventi({ eventi: [{date, sid}], completati: righe completate (date crescenti), workPerGiro, deloads }) → [bool]
  function scaricoPerEventi(o){
    o = o || {};
    var fatti = (o.completati || []).filter(function(w){ return w && w.date; }).slice();
    return (o.eventi || []).map(function(e){
      var info = Q.cycleWeekInfo({ completed: fatti, today: e.date, workPerGiro: o.workPerGiro, deloads: o.deloads || [] });
      // la seduta di oggi già fatta è già fra i completati: non si conta due volte
      var gia = fatti.some(function(w){ return w.date === e.date && w.session_type === e.sid; });
      if(!gia) fatti.push({ date: e.date, session_type: e.sid });
      return !!info.isScarico;
    });
  }

  // ── Il calendario (iCalendar, RFC 5545) ──
  // ics({ eventi: [{ date, sid, durataMin?, descrizione? }], nomi: { sid: nome }, orario: 'HH:MM', chiave, adesso,
  //       durataMin, avvisoMin, timeZone, url })
  // Ogni evento può portare la sua durata e la sua descrizione (Training 541); senza, un'ora e la frase di partenza.
  // url: l'indirizzo che apre l'app su Training (la proprietà URL dell'evento).
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
      var inizio = clock.parseLocal(e.date, orario + ':00'), fine = inizio + (e.durataMin || durata) * 60000;
      var nome = (o.nomi && o.nomi[e.sid]) || e.sid;
      righe.push('BEGIN:VEVENT',
        'UID:' + uid(o.chiave, e.date),
        'DTSTAMP:' + stamp,
        'DTSTART:' + dataIcs(inizio),
        'DTEND:' + dataIcs(fine),
        'SUMMARY:' + scappa(PREFISSO + nome),
        'DESCRIPTION:' + scappa(e.descrizione || 'La seduta di oggi secondo la tua rotazione. Apri Zona Tracker per iniziare.'));
      if(o.url) righe.push('URL:' + o.url);
      righe.push('BEGIN:VALARM', 'TRIGGER:-PT' + avviso + 'M', 'ACTION:DISPLAY', 'DESCRIPTION:' + scappa(PREFISSO + nome + ' fra ' + avviso + ' minuti'), 'END:VALARM',
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
    URL_TRAINING: URL_TRAINING, DESCRIZIONE_MAX: DESCRIZIONE_MAX, TEMPO: TEMPO,
    leggiReps: leggiReps, contaPerLato: contaPerLato, riscaldamentoSec: riscaldamentoSec, riscaldamentoBreve: riscaldamentoBreve, RISCALDAMENTO_MAX: RISCALDAMENTO_MAX, tabataInCoda: tabataInCoda,
    durataSeduta: durataSeduta, lavoroSerie: lavoroSerie, blocchi: blocchi, passi: passi, adesso: adesso, pausaVerso: pausaVerso, attrezziDi: attrezziDi, minutiSeduta: minutiSeduta, righeSeduta: righeSeduta, descrizione: descrizione,
    scaricoPerEventi: scaricoPerEventi,
  };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTRotazione;
