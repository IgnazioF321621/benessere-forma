// ═══════════════════════════════════════════════════════════
// shared/promemoria.js — il promemoria del pasto non registrato (Notifiche 170)
// ═══════════════════════════════════════════════════════════
// Modulo condiviso fra l'app e il Worker: una fonte sola, questo file.
// La pagina lo carica con <script src="shared/promemoria.js"> dopo shared/quadro.js e prima del
// proprio codice; il Worker lo importa (il cron delle ore). Richiede ZTQuadro (la pausa).
//
// Nato il 1 novembre 2026 (Notifiche 170). Ignazio ha scelto le ore fisse: se la colazione manca
// entro le 10, il pranzo entro le 15 o la cena entro le 22 (ora di Roma), arriva un avviso sul
// telefono. L'avviso parte dal Worker (Web Push), che a quell'ora legge i pasti del giorno e manda
// l'avviso solo a chi lo ha acceso e solo se il pasto manca davvero.
//
// Cosa conta come pasto: una riga di meals con lo slot 'colazione', 'pranzo' o 'cena' di quel giorno.
// Gli spuntini (snack_mattina, snack_pomeriggio, snack) e gli extra non contano: uno spuntino alle
// 9 non è la colazione (controllato sulle righe vere di meals il 1 novembre 2026: sette slot,
// 'snack' e 'extra' compresi).
//
// Niente avviso: nei giorni di digiuno (fasting_days), con la pausa cibo accesa (Metodo 210,
// ZTQuadro.pausaAttivaIl con 'cibo'), e per i pasti che la persona non ha acceso
// (profiles.promemoria_pasti: nulla o vuoto = tutti spenti; gli avvisi partono spenti).
//
//   PASTI                     i tre pasti con l'ora entro cui vanno registrati
//   accesi(profile)           quali pasti la persona ha acceso (lista di slot, in ordine)
//   registrati(pasti, giorno) gli slot dei tre pasti che hanno una riga quel giorno
//   pastiMancanti({...})      i pasti accesi, non registrati, la cui ora è già passata (entro <= ora)
//   pastoMancante({...})      il pasto da avvisare ADESSO: quello la cui ora è esattamente `ora`
//   testoAvviso(pasto, nome)  titolo e corpo dell'avviso, nella voce del coach
//
// Letteratura, in una riga: i promemoria aumentano l'aderenza al diario alimentare (Burke 2011,
// J Am Diet Assoc; Patel 2019, JMIR mHealth), ma più di 2-3 al giorno stancano e si spengono: per
// questo l'avviso parte solo quando il pasto manca, mai di routine.

var ZTPromemoria = (function(){
  'use strict';
  var Q = (typeof ZTQuadro !== 'undefined') ? ZTQuadro : require('./quadro.js');
  var TZ = 'Europe/Rome';
  var PASTI = [
    { slot:'colazione', entro:10, nome:'la colazione', breve:'Colazione' },
    { slot:'pranzo',    entro:15, nome:'il pranzo',    breve:'Pranzo' },
    { slot:'cena',      entro:22, nome:'la cena',      breve:'Cena' },
  ];
  var SLOT = PASTI.map(function(p){ return p.slot; });
  var ORE = PASTI.map(function(p){ return p.entro; });

  function pastoPer(slot){ for(var i = 0; i < PASTI.length; i++) if(PASTI[i].slot === slot) return PASTI[i]; return null; }

  // profiles.promemoria_pasti: text[] fra colazione, pranzo, cena. Nulla, vuoto o rotto = niente acceso.
  function accesi(profile){
    var v = profile && profile.promemoria_pasti;
    if(!Array.isArray(v)) return [];
    return SLOT.filter(function(s){ return v.indexOf(s) >= 0; });
  }

  // Gli slot dei tre pasti che hanno almeno una riga di meals quel giorno (le righe possono essere di più giorni)
  function registrati(pasti, giorno){
    var visti = {};
    (pasti || []).forEach(function(r){
      if(!r || (giorno && r.date !== giorno)) return;
      if(SLOT.indexOf(r.slot) >= 0) visti[r.slot] = true;
    });
    return SLOT.filter(function(s){ return visti[s]; });
  }

  // { pasti, giorno, ora, profile, digiuno } → i pasti accesi non registrati la cui ora è passata, in ordine.
  //   pasti    le righe di meals (almeno quelle del giorno: si guardano date e slot)
  //   giorno   'YYYY-MM-DD' di Roma
  //   ora      l'ora di Roma, 0-23
  //   profile  la riga di profiles (promemoria_pasti, pausa_*)
  //   digiuno  vero se il giorno è in fasting_days
  function pastiMancanti(ctx){
    ctx = ctx || {};
    var on = accesi(ctx.profile);
    if(!on.length || ctx.digiuno) return [];
    if(ctx.profile && Q.pausaAttivaIl(ctx.profile, ctx.giorno, 'cibo')) return [];
    var fatti = registrati(ctx.pasti, ctx.giorno);
    var ora = Number(ctx.ora);
    if(isNaN(ora)) return [];
    return PASTI.filter(function(p){ return on.indexOf(p.slot) >= 0 && fatti.indexOf(p.slot) < 0 && p.entro <= ora; });
  }

  // Il pasto da avvisare in questo giro: quello la cui ora è esattamente `ora` (il cron passa ogni ora,
  // e un avviso per la colazione alle 15 sarebbe un avviso in più: alle 15 si parla del pranzo)
  function pastoMancante(ctx){
    var m = pastiMancanti(ctx).filter(function(p){ return p.entro === Number(ctx && ctx.ora); });
    return m[0] || null;
  }

  // L'avviso: breve, nella voce del coach (prima persona, del tu, niente nome: il nome sta nel titolo
  // perché è lui che bussa). Mai la parola «errore».
  function testoAvviso(pasto, coachName){
    var p = typeof pasto === 'string' ? pastoPer(pasto) : pasto;
    if(!p) return null;
    return {
      titolo: (coachName || 'Il coach') + ' · ' + p.breve,
      corpo: 'Non vedo ancora ' + p.nome + ' di oggi. Se l’hai fatt' + (p.slot === 'colazione' || p.slot === 'cena' ? 'a' : 'o') + ', registral' + (p.slot === 'colazione' || p.slot === 'cena' ? 'a' : 'o') + ' adesso: ci metti un minuto.',
      slot: p.slot,
    };
  }

  // L'ora e il giorno di Roma per un istante (il cron ragiona in UTC)
  function oraRoma(ts){
    var d = new Date(ts == null ? Date.now() : ts);
    var ore = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour:'2-digit', hourCycle:'h23' }).format(d));
    var parti = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(d);
    return { ora: ore, giorno: parti };
  }

  return { TZ: TZ, PASTI: PASTI, SLOT: SLOT, ORE: ORE, pastoPer: pastoPer, accesi: accesi, registrati: registrati,
    pastiMancanti: pastiMancanti, pastoMancante: pastoMancante, testoAvviso: testoAvviso, oraRoma: oraRoma };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTPromemoria;
