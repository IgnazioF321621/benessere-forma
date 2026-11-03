// ═══════════════════════════════════════════════════════════
// shared/esami.js — le analisi del sangue: i nomi, le fasce, la lettura (Body 160)
// ═══════════════════════════════════════════════════════════
// Modulo condiviso fra l'app e il Worker: una fonte sola, questo file.
// La pagina lo carica con <script src="shared/esami.js"> prima del proprio codice;
// il Worker lo importa (worker/src/esami.js).
//
// Ignazio (14 ottobre 2026): «voglio caricare il PDF delle analisi, anche quelle vecchie, per avere
// uno storico e dare i dati al coach»; poi (2 novembre) una scheda «Analisi» nel Body con lo storico di
// TUTTE le analisi, comprese quelle di ogni donazione di sangue. Il referto (PDF o foto) lo legge
// Gemini nel Worker; qui stanno:
//   ESAMI        il vocabolario dei nomi comuni: chiave, come lo chiamiamo, la colonna di blood_tests
//                se c'è, l'unità attesa, i nomi e le sigle come li stampano i laboratori, la fascia
//                di riferimento (con il sesso dove serve) e la FONTE della fascia
//   riconosci    da un nome stampato sul referto alla chiave (il nome più lungo che combacia vince)
//   valida       la pulizia di ciò che il modello risponde: data del prelievo, righe nome · valore ·
//                unità COME SCRITTE · fascia del referto se stampata; chiave se il nome è riconosciuto
//   fasciaPer    la fascia di una riga: quella del referto se c'è, altrimenti la tabella
//   fuoriFascia  'basso' · 'alto' · null
//   inColonne    le 11 colonne di blood_tests dalle righe riconosciute (il quadro e il check non cambiano)
//   daRiga       le righe di una riga di blood_tests: `esami` se c'è, altrimenti le colonne (righe vecchie)
//   serie        l'andamento di una chiave nel tempo, per i grafici
//   riassunto    una riga di testo per il coach (valori con unità e segno fuori fascia; mai il nome)
//
// Letteratura, in una riga: a un coach di nutrizione e allenamento servono glicemia e HbA1c, lipidi,
// ferritina ed emoglobina, vitamina D, TSH, creatinina e ALT, PCR (consenso IOC sul REDs 2018 e 2023,
// position stand ISSN); chi dona sangue perde circa 200-250 mg di ferro a sacca e va seguito su
// ferritina ed emoglobina, con almeno 90 giorni fra due donazioni (AVIS; Kiss et al., JAMA 2015).
// Le fasce NON sono diagnosi: i valori si leggono con il medico (BLOOD_MEDICO nell'app).
//
// Funzioni PURE: niente rete, niente orologio, niente stato.
var ZTEsami = (function(){
  'use strict';

  var VERSIONE = '2026-11-02';   // versione del vocabolario: finisce in blood_tests.prompt_version con quella del prompt
  var LAB = 'valori comuni dei laboratori italiani';
  var ESC = 'ESC/EAS 2019 (rischio basso)';
  var ADA = 'ADA, Standards of Care 2024';

  // fascia: [min, max] · { min } · { max } · { M:…, F:… } per sesso. colonna: la colonna di blood_tests, o null.
  var ESAMI = [
    { chiave:'emoglobina',      label:'Emoglobina',                 colonna:'hemoglobin',      unita:'g/dL',   nomi:['emoglobina', 'hgb', 'hb'],                                              fascia:{ M:[13.5, 17.5], F:[12, 16] },     fonte:LAB },
    { chiave:'ematocrito',      label:'Ematocrito',                 colonna:null,              unita:'%',      nomi:['ematocrito', 'hct'],                                                     fascia:{ M:[40, 52], F:[36, 46] },         fonte:LAB },
    { chiave:'ferritina',       label:'Ferritina',                  colonna:'ferritin',        unita:'ng/mL',  nomi:['ferritina'],                                                             fascia:{ M:[30, 300], F:[15, 150] },       fonte:LAB + '; per chi dona sangue conta restare sopra 30 (AVIS)' },
    { chiave:'sideremia',       label:'Sideremia',                  colonna:null,              unita:'µg/dL',  nomi:['sideremia', 'ferro', 'ferro sierico', 'fe'],                             fascia:[60, 160],                           fonte:LAB },
    { chiave:'glicemia',        label:'Glicemia a digiuno',         colonna:'glucose',         unita:'mg/dL',  nomi:['glicemia', 'glucosio', 'glucose', 'glicemia a digiuno'],                 fascia:[70, 99],                            fonte:ADA },
    { chiave:'hba1c',           label:'Emoglobina glicata (HbA1c)', colonna:null,              unita:'%',      nomi:['emoglobina glicata', 'hba1c', 'glicata', 'emoglobina glicosilata'],      fascia:[4, 5.6],                            fonte:ADA },
    { chiave:'insulina',        label:'Insulina a digiuno',         colonna:null,              unita:'µU/mL',  nomi:['insulina', 'insulinemia'],                                               fascia:[2, 25],                             fonte:LAB },
    { chiave:'colesterolo_tot', label:'Colesterolo totale',         colonna:'cholesterol_tot', unita:'mg/dL',  nomi:['colesterolo totale', 'colesterolo tot', 'colesterolo'],                 fascia:{ max:200 },                         fonte:ESC },
    { chiave:'hdl',             label:'Colesterolo HDL',            colonna:'hdl',             unita:'mg/dL',  nomi:['colesterolo hdl', 'hdl', 'hdl colesterolo'],                             fascia:{ M:{ min:40 }, F:{ min:50 } },      fonte:ESC },
    { chiave:'ldl',             label:'Colesterolo LDL',            colonna:null,              unita:'mg/dL',  nomi:['colesterolo ldl', 'ldl', 'ldl colesterolo'],                             fascia:{ max:116 },                         fonte:ESC },
    { chiave:'trigliceridi',    label:'Trigliceridi',               colonna:'triglycerides',   unita:'mg/dL',  nomi:['trigliceridi'],                                                          fascia:{ max:150 },                         fonte:ESC },
    { chiave:'creatinina',      label:'Creatinina',                 colonna:'creatinine',      unita:'mg/dL',  nomi:['creatinina', 'creatininemia'],                                           fascia:{ M:[0.7, 1.2], F:[0.5, 1.0] },     fonte:LAB },
    { chiave:'alt',             label:'ALT (GPT)',                  colonna:'alt',             unita:'U/L',    nomi:['alt', 'gpt', 'alt gpt', 'alanina aminotransferasi', 'transaminasi gpt'], fascia:{ M:{ max:41 }, F:{ max:33 } },      fonte:LAB },
    { chiave:'ast',             label:'AST (GOT)',                  colonna:null,              unita:'U/L',    nomi:['ast', 'got', 'ast got', 'aspartato aminotransferasi', 'transaminasi got'], fascia:{ max:40 },                       fonte:LAB },
    { chiave:'vitamina_d',      label:'Vitamina D (25-OH)',         colonna:'vitamin_d',       unita:'ng/mL',  nomi:['vitamina d', '25-oh vitamina d', '25 oh vitamina d', '25-idrossivitamina d', 'vitamin d', '25-oh-d'], fascia:[30, 100],  fonte:'Endocrine Society 2011' },
    { chiave:'vitamina_b12',    label:'Vitamina B12',               colonna:'vitamin_b12',     unita:'pg/mL',  nomi:['vitamina b12', 'b12', 'cobalamina'],                                     fascia:[200, 900],                          fonte:LAB },
    { chiave:'folati',          label:'Folati',                     colonna:null,              unita:'ng/mL',  nomi:['folati', 'acido folico', 'folato'],                                      fascia:{ min:4 },                           fonte:LAB },
    { chiave:'tsh',             label:'TSH',                        colonna:'tsh',             unita:'µUI/mL', nomi:['tsh', 'tireotropina'],                                                   fascia:[0.4, 4.0],                          fonte:LAB },
    { chiave:'hs_crp',          label:'PCR alta sensibilità',       colonna:null,              unita:'mg/L',   nomi:['pcr', 'proteina c reattiva', 'hs-crp', 'crp', 'pcr hs', 'pcr alta sensibilita'], fascia:{ max:1 },                  fonte:'AHA/CDC 2003 (rischio basso)' },
    { chiave:'omocisteina',     label:'Omocisteina',                colonna:null,              unita:'µmol/L', nomi:['omocisteina'],                                                           fascia:{ max:15 },                          fonte:LAB },
    { chiave:'zinco',           label:'Zinco',                      colonna:null,              unita:'µg/dL',  nomi:['zinco', 'zn'],                                                           fascia:[70, 120],                           fonte:LAB },
    { chiave:'magnesio',        label:'Magnesio',                   colonna:null,              unita:'mg/dL',  nomi:['magnesio', 'mg'],                                                        fascia:[1.7, 2.2],                          fonte:LAB },
    { chiave:'testosterone',    label:'Testosterone totale',        colonna:null,              unita:'ng/dL',  nomi:['testosterone', 'testosterone totale'],                                  fascia:{ M:[300, 1000], F:[15, 70] },      fonte:LAB },
  ];
  var MAX_RIGHE = 80, MAX_NOME = 60, MAX_UNITA = 20, MAX_NOTE = 300;

  var perChiave = {};
  ESAMI.forEach(function(e){ perChiave[e.chiave] = e; });
  function esame(chiave){ return perChiave[chiave] || null; }

  // «Colesterolo HDL (metodo enzimatico)» → «colesterolo hdl metodo enzimatico»
  function normalizza(s){
    return String(s || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9%\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Il nome del referto → la chiave. Combacia un nome intero, o un nome seguito da uno spazio/parentesi, o un nome
  // dentro il testo fra confini di parola; fra più nomi che combaciano vince il più lungo (così «colesterolo hdl»
  // va in hdl, non in colesterolo_tot). Sigle di una o due lettere solo se il testo è esattamente quelle.
  function riconosci(nome){
    var t = normalizza(nome);
    if(!t) return null;
    var migliore = null, lung = 0;
    ESAMI.forEach(function(e){
      e.nomi.forEach(function(n){
        var a = normalizza(n);
        var ok = t === a || (a.length >= 3 && (t.indexOf(a + ' ') === 0 || t.indexOf(a + '-') === 0 || (' ' + t + ' ').indexOf(' ' + a + ' ') >= 0));
        if(ok && a.length > lung){ migliore = e.chiave; lung = a.length; }
      });
    });
    return migliore;
  }

  function numero(v){
    if(v == null || v === '') return null;
    if(typeof v === 'string'){ v = v.replace(',', '.').replace(/[^0-9.\-]/g, ''); if(!/\d/.test(v)) return null; }
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function testo(v, max){
    if(v == null) return '';
    var s = String(v).replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max) : s;
  }
  function pad(n){ return (String(n).length < 2 ? '0' : '') + n; }
  // «12/10/2026», «12-10-2026», «2026-10-12», «12.10.26» → 'YYYY-MM-DD'; altrimenti null
  function dataPrelievo(s){
    var t = String(s || '').trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if(!m) { m = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(t); if(m){ var a = m[3].length === 2 ? '20' + m[3] : m[3]; m = [null, a, pad(m[2]), pad(m[1])]; } }
    if(!m) return null;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if(!(y >= 1990 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if(dt.getUTCMonth() !== mo - 1) return null;
    return y + '-' + pad(mo) + '-' + pad(d);
  }

  // La risposta del modello (o le righe corrette nel foglio) → { riconosciuto, data_prelievo, esami, letti, note }.
  // Ogni riga: { nome, chiave, valore, unita, rif_min, rif_max }. Una chiave già vista non si ripete (resta la prima).
  function valida(grezzo){
    var o = grezzo && typeof grezzo === 'object' ? grezzo : {};
    var righe = Array.isArray(o.esami) ? o.esami : [];
    var out = [], viste = {};
    righe.slice(0, MAX_RIGHE).forEach(function(r){
      if(!r || typeof r !== 'object') return;
      var nome = testo(r.nome, MAX_NOME), valore = numero(r.valore);
      if(!nome || valore == null) return;
      var chiave = riconosci(nome) || (r.chiave && perChiave[r.chiave] ? r.chiave : null);   // il nome stampato vince sulla chiave del modello
      if(chiave){ if(viste[chiave]) return; viste[chiave] = true; }
      var riga = { nome: nome, chiave: chiave, valore: valore, unita: testo(r.unita, MAX_UNITA) };
      var mn = numero(r.rif_min), mx = numero(r.rif_max);
      if(mn != null) riga.rif_min = mn;
      if(mx != null) riga.rif_max = mx;
      out.push(riga);
    });
    return {
      riconosciuto: o.riconosciuto === true,
      data_prelievo: dataPrelievo(o.data_prelievo),
      esami: out,
      letti: out.length,
      note: testo(o.note, MAX_NOTE),
    };
  }

  function fasciaNorm(f){
    if(!f) return null;
    if(Array.isArray(f)) return { min: f[0], max: f[1] };
    return { min: f.min != null ? f.min : null, max: f.max != null ? f.max : null };
  }
  // La fascia della tabella per una chiave e un sesso ('M' · 'F' · altro → la più larga delle due)
  function fascia(chiave, sesso){
    var e = perChiave[chiave];
    if(!e || !e.fascia) return null;
    var f = e.fascia, s = String(sesso || '').toUpperCase();
    if(f.M || f.F){
      var m = fasciaNorm(f.M), w = fasciaNorm(f.F);
      if(s === 'M') f = m; else if(s === 'F') f = w;
      else f = { min: (m.min != null && w.min != null) ? Math.min(m.min, w.min) : (m.min != null ? m.min : w.min), max: (m.max != null && w.max != null) ? Math.max(m.max, w.max) : (m.max != null ? m.max : w.max) };
    } else f = fasciaNorm(f);
    return { min: f.min, max: f.max, fonte: e.fonte };
  }
  // La fascia di una riga letta: quella del referto se stampata (fonte 'referto'), altrimenti la tabella
  function fasciaPer(riga, sesso){
    if(!riga) return null;
    if(riga.rif_min != null || riga.rif_max != null) return { min: riga.rif_min != null ? riga.rif_min : null, max: riga.rif_max != null ? riga.rif_max : null, fonte: 'referto' };
    return riga.chiave ? fascia(riga.chiave, sesso) : null;
  }
  function fuoriFascia(valore, f){
    if(valore == null || !f) return null;
    if(f.min != null && valore < f.min) return 'basso';
    if(f.max != null && valore > f.max) return 'alto';
    return null;
  }
  function it(n){ return String(n).replace('.', ','); }
  function mostraFascia(f){
    if(!f) return '';
    if(f.min != null && f.max != null) return it(f.min) + '–' + it(f.max);
    if(f.max != null) return '< ' + it(f.max);
    if(f.min != null) return '> ' + it(f.min);
    return '';
  }

  // Le 11 colonne di blood_tests dalle righe riconosciute
  function inColonne(righe){
    var out = {};
    ESAMI.forEach(function(e){ if(e.colonna) out[e.colonna] = null; });
    (righe || []).forEach(function(r){
      var e = r && r.chiave && perChiave[r.chiave];
      if(e && e.colonna && r.valore != null) out[e.colonna] = r.valore;
    });
    return out;
  }
  // Le righe di una riga di blood_tests: `esami` se c'è (letta o corretta), altrimenti le colonne (righe del check)
  function daRiga(riga){
    if(!riga) return [];
    if(Array.isArray(riga.esami) && riga.esami.length) return riga.esami;
    var out = [];
    ESAMI.forEach(function(e){ if(e.colonna && riga[e.colonna] != null) out.push({ nome: e.label, chiave: e.chiave, valore: Number(riga[e.colonna]), unita: e.unita }); });
    return out;
  }
  // L'andamento di una chiave: [{ date, valore, unita }] dal più vecchio al più recente
  function serie(righe, chiave){
    var out = [];
    (righe || []).forEach(function(r){
      if(!r || !r.test_date) return;
      var v = daRiga(r).filter(function(x){ return x.chiave === chiave; })[0];
      if(v) out.push({ date: r.test_date, valore: v.valore, unita: v.unita || '' });
    });
    return out.sort(function(a, b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  // Una riga per il coach: «glicemia 92 mg/dL · ferritina 28 ng/mL (bassa, fascia 30–300) · …»
  function riassunto(riga, sesso){
    return daRiga(riga).map(function(r){
      var e = r.chiave && perChiave[r.chiave];
      var f = fasciaPer(r, sesso), fuori = fuoriFascia(r.valore, f);
      return (e ? e.label : r.nome) + ' ' + it(r.valore) + (r.unita ? ' ' + r.unita : '') + (fuori ? ' (' + (fuori === 'alto' ? 'alto' : 'basso') + ', fascia ' + mostraFascia(f) + ')' : '');
    }).join(' · ');
  }

  return { VERSIONE: VERSIONE, ESAMI: ESAMI, MAX_RIGHE: MAX_RIGHE, MAX_NOTE: MAX_NOTE, esame: esame, normalizza: normalizza, riconosci: riconosci,
    dataPrelievo: dataPrelievo, valida: valida, fascia: fascia, fasciaPer: fasciaPer, fuoriFascia: fuoriFascia, mostraFascia: mostraFascia,
    inColonne: inColonne, daRiga: daRiga, serie: serie, riassunto: riassunto, testo: testo, numero: numero };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTEsami;
