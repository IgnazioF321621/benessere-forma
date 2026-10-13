// ═══════════════════════════════════════════════════════════
// shared/fitdays.js — il report Fitdays: cosa c'è dentro e come si legge (Body 150)
// ═══════════════════════════════════════════════════════════
// Modulo condiviso fra l'app e il Worker: una fonte sola, questo file.
// La pagina lo carica con <script src="shared/fitdays.js"> prima del proprio codice;
// il Worker lo importa (worker/src/fitdays.js).
//
// La bilancia Fitdays non parla con nessuno: dopo la pesata la persona fa lo screenshot
// (o il PDF) del report e lo dà al coach, che lo legge con Gemini (strada A, decisa da
// Ignazio il 13 ottobre 2026). Qui stanno i 22 indicatori del report con i loro limiti
// di buon senso, la pulizia di ciò che il modello risponde (valida), e quali numeri
// finiscono nelle caselle di Body (inCaselle: peso, grasso %, massa muscolare, grasso
// viscerale, età corporea — le caselle che Body aveva già, scelta di Ignazio). Il resto
// resta nella lettura completa, salvata a parte (fitdays_letture.result).
//
// Funzioni PURE: niente rete, niente orologio, niente stato.
var ZTFitdays = (function(){
  'use strict';

  // Versione del vocabolario: finisce in meta.campi_version della lettura salvata.
  var CAMPI_VERSION = '2026-10-13';

  // I 22 indicatori, nell'ordine del report. `report` è l'etichetta stampata da Fitdays in italiano
  // (serve al modello per riconoscere la riga); `label` è come li chiamiamo noi; `min`/`max` i limiti
  // oltre i quali un numero è una lettura sbagliata, non un dato. tipo 'testo' = voce a parole.
  var CAMPI = [
    { chiave:'peso_kg',                 report:'Peso',                  label:'Peso',                    unita:'kg',       min:30,  max:250 },
    { chiave:'bmi',                     report:'BMI',                   label:'BMI',                     unita:'',         min:10,  max:60 },
    { chiave:'grasso_pct',              report:'Grasso corporeo',       label:'Grasso corporeo',         unita:'%',        min:3,   max:60 },
    { chiave:'massa_grassa_kg',         report:'Massa grassa',          label:'Massa grassa',            unita:'kg',       min:1,   max:120 },
    // Fitdays la chiama «Perdita di grasso», ma è il peso senza il grasso (peso − massa grassa): la massa magra
    { chiave:'massa_magra_kg',          report:'Perdita di grasso',     label:'Massa magra',             unita:'kg',       min:20,  max:150 },
    { chiave:'frequenza_cardiaca_bpm',  report:'Frequenza cardiaca',    label:'Frequenza cardiaca',      unita:'bpm',      min:30,  max:220 },
    { chiave:'indice_cuore',            report:'Indice del cuore',      label:'Indice del cuore',        unita:'L/min/m²', min:1,   max:10 },
    { chiave:'massa_muscolare_kg',      report:'Massa muscolare',       label:'Massa muscolare',         unita:'kg',       min:10,  max:100 },
    { chiave:'muscolo_pct',             report:'Frequenza muscolare',   label:'Muscolo',                 unita:'%',        min:20,  max:95 },
    { chiave:'muscolo_scheletrico_pct', report:'Muscolo scheletrico',   label:'Muscolo scheletrico',     unita:'%',        min:10,  max:70 },
    { chiave:'massa_ossea_kg',          report:'Massa ossea',           label:'Massa ossea',             unita:'kg',       min:0.5, max:10 },
    { chiave:'proteine_kg',             report:'Quantità di proteine',  label:'Proteine',                unita:'kg',       min:3,   max:40 },
    { chiave:'proteine_pct',            report:'Proteine',              label:'Proteine',                unita:'%',        min:5,   max:40 },
    { chiave:'acqua_kg',                report:'Contenuto d\'acqua',    label:'Acqua',                   unita:'kg',       min:10,  max:100 },
    { chiave:'acqua_pct',               report:'Acqua del corpo',       label:'Acqua del corpo',         unita:'%',        min:30,  max:80 },
    { chiave:'grasso_sottocutaneo_pct', report:'Grasso sottocutaneo',   label:'Grasso sottocutaneo',     unita:'%',        min:1,   max:50 },
    { chiave:'grasso_viscerale',        report:'Grasso viscerale',      label:'Grasso viscerale',        unita:'',         min:1,   max:60 },
    { chiave:'bmr_kcal',                report:'BMR',                   label:'Metabolismo basale',      unita:'kcal',     min:500, max:5000 },
    { chiave:'eta_corporea',            report:'Età corporea',          label:'Età corporea',            unita:'anni',     min:10,  max:100 },
    { chiave:'peso_standard_kg',        report:'Peso corporeo standard',label:'Peso standard',           unita:'kg',       min:30,  max:150 },
    { chiave:'livello_obesita',         report:'Livello di obesità',    label:'Livello di obesità',      unita:'',         tipo:'testo' },
    { chiave:'tipo_corpo',              report:'Tipo di corpo',         label:'Tipo di corpo',           unita:'',         tipo:'testo' },
  ];

  // Dalla lettura alle caselle di Body (body_logs / weight_logs): solo quelle che esistono già.
  var CASELLE = { peso_kg:'weight_kg', grasso_pct:'bf_pct', massa_muscolare_kg:'muscle_kg', grasso_viscerale:'visceral_fat', eta_corporea:'body_age' };

  var MAX_TESTO = 40;    // una voce a parole del report («Standard», «Muscolo»)
  var MAX_NOTE = 300;    // la nota del modello su cosa non ha letto

  function numero(v, c){
    if(v === null || v === undefined || v === '') return null;
    var n = typeof v === 'number' ? v : Number(String(v).replace(',', '.').replace(/[^\d.\-]/g, ''));
    if(!isFinite(n)) return null;
    if(n < c.min || n > c.max) return null;
    return Math.round(n * 100) / 100;
  }
  function testo(v, max){
    if(v === null || v === undefined) return null;
    var s = String(v).replace(/\s+/g, ' ').trim();
    return s ? s.slice(0, max) : null;
  }

  // Pulisce ciò che il modello risponde: ogni indicatore è un numero dentro i limiti, o null.
  // Torna { valori, letti } dove letti è quanti indicatori hanno un valore.
  function valida(grezzo){
    var o = grezzo && typeof grezzo === 'object' ? grezzo : {};
    var valori = {}, letti = 0;
    CAMPI.forEach(function(c){
      var v = c.tipo === 'testo' ? testo(o[c.chiave], MAX_TESTO) : numero(o[c.chiave], c);
      valori[c.chiave] = v;
      if(v !== null) letti++;
    });
    return { valori: valori, letti: letti };
  }

  // «05:46 13/10/2026» (o «13/10/2026», o «2026-10-13») → 'YYYY-MM-DD', altrimenti null.
  function dataReport(s){
    if(!s) return null;
    var t = String(s);
    var m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
    if(m) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
    m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if(m) return m[1] + '-' + m[2] + '-' + m[3];
    return null;
  }
  function pad(n){ return (String(n).length < 2 ? '0' : '') + n; }

  // Le caselle di Body che la lettura compila (solo quelle con un valore).
  function inCaselle(valori){
    var out = {};
    Object.keys(CASELLE).forEach(function(k){
      if(valori && valori[k] !== null && valori[k] !== undefined) out[CASELLE[k]] = valori[k];
    });
    return out;
  }

  // Un numero da mostrare: «70,95 kg», «14 %», «Standard»
  function mostra(c, v){
    if(v === null || v === undefined) return '—';
    if(c.tipo === 'testo') return v;
    var s = String(Math.round(v * 100) / 100).replace('.', ',');
    return c.unita ? s + ' ' + c.unita : s;
  }

  return { CAMPI_VERSION: CAMPI_VERSION, CAMPI: CAMPI, CASELLE: CASELLE, MAX_NOTE: MAX_NOTE, valida: valida, dataReport: dataReport, inCaselle: inCaselle, mostra: mostra, testo: testo };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTFitdays;
