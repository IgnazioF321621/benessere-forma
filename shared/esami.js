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
//   FAMIGLIE     Ferro · Ematologia · Lipidi e glicemia · Fegato e reni · Altro: come la scheda raggruppa i valori
//                (Body 170, 3 novembre 2026); PANORAMICA le chiavi delle card in cima
//   leggiCSV     lo storico da un file CSV (Body 170): una riga per prelievo, «Data» in gg/mm/aa, le altre
//                intestazioni «Nome (min–max unità)», celle vuote saltate, la sezione «RANGE DI RIFERIMENTO»
//                dopo una riga vuota si ferma lì. La fascia dell'intestazione vale come fascia del referto
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

  var VERSIONE = '2026-11-03';   // versione del vocabolario: finisce in blood_tests.prompt_version con quella del prompt (3/11: emocromo, lipidi completi, proteine, Body 170)
  var LAB = 'valori comuni dei laboratori italiani';
  var ESC = 'ESC/EAS 2019 (rischio basso)';
  var ADA = 'ADA, Standards of Care 2024';

  // Le famiglie della scheda Analisi (Body 170): nell'ordine in cui si leggono
  var FAMIGLIE = [
    { chiave:'ferro',       label:'Ferro' },
    { chiave:'ematologia',  label:'Ematologia' },
    { chiave:'lipidi',      label:'Lipidi e glicemia' },
    { chiave:'fegato_reni', label:'Fegato e reni' },
    { chiave:'altro',       label:'Altro' },
  ];
  // Le card in cima alla scheda, se nello storico c'è il valore
  var PANORAMICA = ['emoglobina', 'ferritina', 'glicemia', 'ldl', 'hdl', 'trigliceridi', 'piastrine', 'globuli_bianchi'];

  // fascia: [min, max] · { min } · { max } · { M:…, F:… } per sesso. colonna: la colonna di blood_tests, o null. famiglia: una di FAMIGLIE.
  // Le unità dell'emocromo si scrivono come le stampano i laboratori (×10³/µL, ×10⁶/µL).
  var ESAMI = [
    { chiave:'emoglobina',      famiglia:'ematologia',  label:'Emoglobina',                 colonna:'hemoglobin',      unita:'g/dL',   nomi:['emoglobina', 'hgb', 'hb'],                                              fascia:{ M:[13.5, 17.5], F:[12, 16] },     fonte:LAB },
    { chiave:'ematocrito',      famiglia:'ematologia',  label:'Ematocrito',                 colonna:null,              unita:'%',      nomi:['ematocrito', 'hct'],                                                     fascia:{ M:[40, 52], F:[36, 46] },         fonte:LAB },
    { chiave:'ferritina',       famiglia:'ferro',       label:'Ferritina',                  colonna:'ferritin',        unita:'ng/mL',  nomi:['ferritina'],                                                             fascia:{ M:[30, 300], F:[15, 150] },       fonte:LAB + '; per chi dona sangue conta restare sopra 30 (AVIS)' },
    { chiave:'sideremia',       famiglia:'ferro',       label:'Sideremia',                  colonna:null,              unita:'µg/dL',  nomi:['sideremia', 'ferro', 'ferro sierico', 'fe'],                             fascia:[60, 160],                           fonte:LAB },
    { chiave:'glicemia',        famiglia:'lipidi',      label:'Glicemia a digiuno',         colonna:'glucose',         unita:'mg/dL',  nomi:['glicemia', 'glucosio', 'glucose', 'glicemia a digiuno'],                 fascia:[70, 99],                            fonte:ADA },
    { chiave:'hba1c',           famiglia:'lipidi',      label:'Emoglobina glicata (HbA1c)', colonna:null,              unita:'%',      nomi:['emoglobina glicata', 'hba1c', 'hb a1c', 'glicata', 'emoglobina glicosilata'],      fascia:[4, 5.6],                            fonte:ADA },
    { chiave:'insulina',        famiglia:'lipidi',      label:'Insulina a digiuno',         colonna:null,              unita:'µU/mL',  nomi:['insulina', 'insulinemia'],                                               fascia:[2, 25],                             fonte:LAB },
    { chiave:'colesterolo_tot', famiglia:'lipidi',      label:'Colesterolo totale',         colonna:'cholesterol_tot', unita:'mg/dL',  nomi:['colesterolo totale', 'colesterolo tot', 'colesterolo', 'colest totale', 'colest tot', 'col tot', 'colesterolemia'], fascia:{ max:200 },  fonte:ESC },
    { chiave:'hdl',             famiglia:'lipidi',      label:'Colesterolo HDL',            colonna:'hdl',             unita:'mg/dL',  nomi:['colesterolo hdl', 'hdl', 'hdl colesterolo', 'colest hdl', 'col hdl'],    fascia:{ M:{ min:40 }, F:{ min:50 } },      fonte:ESC, solo_min:true },   // Body 171: per l'HDL conta solo il minimo, un massimo stampato dal referto non si guarda (Ignazio, 3 novembre 2026)
    { chiave:'ldl',             famiglia:'lipidi',      label:'Colesterolo LDL',            colonna:null,              unita:'mg/dL',  nomi:['colesterolo ldl', 'ldl', 'ldl colesterolo', 'colest ldl', 'col ldl'],    fascia:{ max:116 },                         fonte:ESC },
    { chiave:'trigliceridi',    famiglia:'lipidi',      label:'Trigliceridi',               colonna:'triglycerides',   unita:'mg/dL',  nomi:['trigliceridi', 'trigliceridemia'],                                       fascia:{ max:150 },                         fonte:ESC },
    { chiave:'rischio_cv',      famiglia:'lipidi',      label:'Indice di rischio (tot/HDL)', colonna:null,             unita:'ratio',  nomi:['indice di rischio cardiovascolare', 'indice rischio cv', 'ind rischio cv', 'rischio cv', 'rischio cardiovascolare', 'colesterolo totale hdl', 'rapporto colesterolo totale hdl', 'col tot hdl', 'indice di castelli'], fascia:{ max:5 }, fonte:LAB + ' (indice di Castelli)' },
    { chiave:'creatinina',      famiglia:'fegato_reni', label:'Creatinina',                 colonna:'creatinine',      unita:'mg/dL',  nomi:['creatinina', 'creatininemia'],                                           fascia:{ M:[0.7, 1.2], F:[0.5, 1.0] },     fonte:LAB },
    { chiave:'alt',             famiglia:'fegato_reni', label:'ALT (GPT)',                  colonna:'alt',             unita:'U/L',    nomi:['alt', 'gpt', 'alt gpt', 'alanina aminotransferasi', 'transaminasi gpt'], fascia:{ M:{ max:41 }, F:{ max:33 } },      fonte:LAB },
    { chiave:'ast',             famiglia:'fegato_reni', label:'AST (GOT)',                  colonna:null,              unita:'U/L',    nomi:['ast', 'got', 'ast got', 'aspartato aminotransferasi', 'transaminasi got'], fascia:{ max:40 },                       fonte:LAB },
    { chiave:'proteine_tot',    famiglia:'fegato_reni', label:'Proteine totali',            colonna:null,              unita:'g/dL',   nomi:['proteine totali', 'protidemia totale', 'protidemia', 'proteine tot', 'protidemia tot', 'proteine'], fascia:[6.4, 8.3],       fonte:LAB },
    { chiave:'vitamina_d',      famiglia:'altro',       label:'Vitamina D (25-OH)',         colonna:'vitamin_d',       unita:'ng/mL',  nomi:['vitamina d', '25-oh vitamina d', '25 oh vitamina d', '25-idrossivitamina d', 'vitamin d', '25-oh-d'], fascia:[30, 100],  fonte:'Endocrine Society 2011' },
    { chiave:'vitamina_b12',    famiglia:'altro',       label:'Vitamina B12',               colonna:'vitamin_b12',     unita:'pg/mL',  nomi:['vitamina b12', 'b12', 'cobalamina'],                                     fascia:[200, 900],                          fonte:LAB },
    { chiave:'folati',          famiglia:'altro',       label:'Folati',                     colonna:null,              unita:'ng/mL',  nomi:['folati', 'acido folico', 'folato'],                                      fascia:{ min:4 },                           fonte:LAB },
    { chiave:'tsh',             famiglia:'altro',       label:'TSH',                        colonna:'tsh',             unita:'µUI/mL', nomi:['tsh', 'tireotropina'],                                                   fascia:[0.4, 4.0],                          fonte:LAB },
    { chiave:'hs_crp',          famiglia:'altro',       label:'PCR alta sensibilità',       colonna:null,              unita:'mg/L',   nomi:['pcr', 'proteina c reattiva', 'hs-crp', 'crp', 'pcr hs', 'pcr alta sensibilita'], fascia:{ max:1 },                  fonte:'AHA/CDC 2003 (rischio basso)' },
    { chiave:'omocisteina',     famiglia:'altro',       label:'Omocisteina',                colonna:null,              unita:'µmol/L', nomi:['omocisteina'],                                                           fascia:{ max:15 },                          fonte:LAB },
    { chiave:'zinco',           famiglia:'altro',       label:'Zinco',                      colonna:null,              unita:'µg/dL',  nomi:['zinco', 'zn'],                                                           fascia:[70, 120],                           fonte:LAB },
    { chiave:'magnesio',        famiglia:'altro',       label:'Magnesio',                   colonna:null,              unita:'mg/dL',  nomi:['magnesio', 'mg'],                                                        fascia:[1.7, 2.2],                          fonte:LAB },
    { chiave:'testosterone',    famiglia:'altro',       label:'Testosterone totale',        colonna:null,              unita:'ng/dL',  nomi:['testosterone', 'testosterone totale'],                                  fascia:{ M:[300, 1000], F:[15, 70] },      fonte:LAB },
    // L'emocromo completo (Body 170, 3 novembre 2026: lo storico delle donazioni ha 19 righe di emocromo). «Neutrofili %» e «Neutrofili #»
    // sono due esami: la percentuale e il numero assoluto; con l'unità «%» la chiave passa alla percentuale (valida).
    { chiave:'globuli_rossi',   famiglia:'ematologia',  label:'Globuli rossi',              colonna:null,              unita:'×10⁶/µL', nomi:['globuli rossi', 'eritrociti', 'rbc', 'gr'],                             fascia:{ M:[4.5, 5.9], F:[4.0, 5.2] },     fonte:LAB },
    { chiave:'mcv',             famiglia:'ematologia',  label:'MCV',                        colonna:null,              unita:'fL',     nomi:['mcv', 'volume corpuscolare medio', 'volume globulare medio'],            fascia:[80, 96],                            fonte:LAB },
    { chiave:'mch',             famiglia:'ematologia',  label:'MCH',                        colonna:null,              unita:'pg',     nomi:['mch', 'emoglobina corpuscolare media', 'contenuto emoglobinico medio'], fascia:[27, 33],                            fonte:LAB },
    { chiave:'mchc',            famiglia:'ematologia',  label:'MCHC',                       colonna:null,              unita:'g/dL',   nomi:['mchc', 'concentrazione emoglobinica corpuscolare media', 'concentrazione corpuscolare media di emoglobina'], fascia:[32, 36], fonte:LAB },
    { chiave:'rdw',             famiglia:'ematologia',  label:'RDW',                        colonna:null,              unita:'%',      nomi:['rdw', 'rdw cv', 'ampiezza distribuzione eritrocitaria'],                 fascia:[11.5, 14.5],                        fonte:LAB },
    { chiave:'globuli_bianchi', famiglia:'ematologia',  label:'Globuli bianchi',            colonna:null,              unita:'×10³/µL', nomi:['globuli bianchi', 'leucociti', 'wbc', 'gb'],                            fascia:[4.0, 10.0],                         fonte:LAB },
    { chiave:'neutrofili_pct',  famiglia:'ematologia',  label:'Neutrofili %',               colonna:null,              unita:'%',      nomi:['neutrofili %', 'neutrofili percentuale', 'neutrofili rel'],              fascia:[40, 75],                            fonte:LAB },
    { chiave:'linfociti_pct',   famiglia:'ematologia',  label:'Linfociti %',                colonna:null,              unita:'%',      nomi:['linfociti %', 'linfociti percentuale', 'linfociti rel'],                 fascia:[20, 45],                            fonte:LAB },
    { chiave:'monociti_pct',    famiglia:'ematologia',  label:'Monociti %',                 colonna:null,              unita:'%',      nomi:['monociti %', 'monociti percentuale', 'monociti rel'],                    fascia:[2, 10],                             fonte:LAB },
    { chiave:'eosinofili_pct',  famiglia:'ematologia',  label:'Eosinofili %',               colonna:null,              unita:'%',      nomi:['eosinofili %', 'eosinofili percentuale', 'eosinofili rel'],              fascia:{ max:6 },                           fonte:LAB },
    { chiave:'basofili_pct',    famiglia:'ematologia',  label:'Basofili %',                 colonna:null,              unita:'%',      nomi:['basofili %', 'basofili percentuale', 'basofili rel'],                    fascia:{ max:2 },                           fonte:LAB },
    { chiave:'neutrofili',      famiglia:'ematologia',  label:'Neutrofili',                 colonna:null,              unita:'×10³/µL', nomi:['neutrofili', 'neutrofili assoluti', 'neutrofili abs', 'granulociti neutrofili'], fascia:[1.5, 7],                   fonte:LAB },
    { chiave:'linfociti',       famiglia:'ematologia',  label:'Linfociti',                  colonna:null,              unita:'×10³/µL', nomi:['linfociti', 'linfociti assoluti', 'linfociti abs'],                     fascia:[1.0, 4.0],                          fonte:LAB },
    { chiave:'monociti',        famiglia:'ematologia',  label:'Monociti',                   colonna:null,              unita:'×10³/µL', nomi:['monociti', 'monociti assoluti', 'monociti abs'],                        fascia:[0.2, 0.9],                          fonte:LAB },
    { chiave:'eosinofili',      famiglia:'ematologia',  label:'Eosinofili',                 colonna:null,              unita:'×10³/µL', nomi:['eosinofili', 'eosinofili assoluti', 'eosinofili abs', 'granulociti eosinofili'], fascia:{ max:0.5 },                fonte:LAB },
    { chiave:'basofili',        famiglia:'ematologia',  label:'Basofili',                   colonna:null,              unita:'×10³/µL', nomi:['basofili', 'basofili assoluti', 'basofili abs', 'granulociti basofili'], fascia:{ max:0.2 },                        fonte:LAB },
    { chiave:'piastrine',       famiglia:'ematologia',  label:'Piastrine',                  colonna:null,              unita:'×10³/µL', nomi:['piastrine', 'plt', 'trombociti'],                                       fascia:[150, 400],                          fonte:LAB },
    { chiave:'mpv',             famiglia:'ematologia',  label:'MPV',                        colonna:null,              unita:'fL',     nomi:['mpv', 'volume piastrinico medio'],                                       fascia:[7, 12],                             fonte:LAB },
  ];
  // percentuale ↔ numero assoluto della formula leucocitaria: con l'unità «%» vale la percentuale, con un'altra unità il numero
  var COPPIE_PCT = { neutrofili:'neutrofili_pct', linfociti:'linfociti_pct', monociti:'monociti_pct', eosinofili:'eosinofili_pct', basofili:'basofili_pct' };
  var MAX_RIGHE = 80, MAX_NOME = 60, MAX_UNITA = 20, MAX_NOTE = 300;
  // Parole che dicono «è un altro esame»: «Emoglobina corpuscolare media» non è l'emoglobina, «Creatinina clearance»
  // non è la creatinina, «Glucosio (urine)» non è la glicemia (revisione del 3 novembre 2026). Il nome resta, la chiave no.
  var ESCLUSIONI = ['corpuscolare', 'legante', 'clearance', 'libero', 'libera', 'eritrocitario', 'eritrocitaria', 'urine', 'urinario', 'urinaria', 'urinarie', 'urinari', 'rapporto', 'non hdl', 'vldl', 'indice', 'media', 'medio', 'capacita', 'saturazione', 'frazione', 'reductase', 'reduttasi', 'biodisponibile', 'glicosilata ', 'post', 'curva', 'ovaio', 'a1c', 'egfr', 'gfr', 'sd', 't b', 'cd4', 'cd8'];   // vldl, a1c, egfr, urinarie, sd: revisione del 3 novembre (Body 170)
  // Le unità che dicono la stessa cosa (normalizzate: minuscole, senza spazi, µ → u). Una colonna di blood_tests si
  // riempie solo se l'unità stampata è quella attesa o una sua equivalente: vitamina D in nmol/L o glicemia in mmol/L
  // restano solo in `esami`, altrimenti il quadro e il coach leggerebbero numeri sbagliati (revisione del 3 novembre).
  var UNITA_EQ = { 'ng/ml': ['ng/ml', 'ug/l', 'mcg/l'], 'uui/ml': ['uui/ml', 'uu/ml', 'mui/l', 'miu/l', 'uiu/ml', 'mu/l'], 'u/l': ['u/l', 'ui/l', 'iu/l'], 'pg/ml': ['pg/ml', 'ng/l'], 'mg/dl': ['mg/dl'], 'g/dl': ['g/dl', 'g/100ml'], 'ug/dl': ['ug/dl', 'mcg/dl'], 'umol/l': ['umol/l'], 'mg/l': ['mg/l'], 'ng/dl': ['ng/dl'], '%': ['%'] };

  var perChiave = {};
  ESAMI.forEach(function(e){ perChiave[e.chiave] = e; });
  function esame(chiave){ return perChiave[chiave] || null; }

  // Body 172 (Ignazio, 3 novembre 2026): esami che non vogliamo. Una riga con uno di questi nomi si scarta dovunque
  // entri (referto, CSV, foglio a mano) e, se sta ancora nel jsonb di una riga vecchia, non si mostra
  var NON_VOLUTI = ['nrbc', 'eritroblasti', 'eritroblasto'];
  function nonVoluto(nome){
    var t = ' ' + normalizza(nome) + ' ';
    return NON_VOLUTI.some(function(w){ return t.indexOf(' ' + w + ' ') >= 0 || t.indexOf(' ' + w + '%') >= 0; });   // «NRBC %», «NRBC#», «NRBC%»
  }
  // «Colesterolo-HDL (metodo enzimatico)» → «colesterolo hdl metodo enzimatico»: trattini e barre diventano spazi
  function normalizza(s){
    return String(s || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[\-\/]+/g, ' ').replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Il nome del referto → la chiave. Un nome del vocabolario combacia solo se è l'intero testo o la sua TESTA
  // (seguita da uno spazio): «Emoglobina (Hb)» sì, «Emoglobina corpuscolare media» no (parola di esclusione), «Capacità
  // totale legante il ferro» no (il ferro non è in testa). Fra più nomi che combaciano vince il più lungo, così
  // «colesterolo hdl» va in hdl e non in colesterolo_tot.
  function haParola(testoSpaziato, w){ return w.slice(-1) === ' ' ? testoSpaziato.indexOf(' ' + w) >= 0 : testoSpaziato.indexOf(' ' + w + ' ') >= 0; }
  function riconosci(nome){
    var t = normalizza(nome);
    if(!t) return null;
    var tt = ' ' + t + ' ';
    // Una parola di esclusione nel testo è ammessa solo se sta anche nel nome del vocabolario che combacia: «Emoglobina
    // corpuscolare media» è il MCH (Body 170), «Creatinina clearance» non è niente di nostro (nessun nome ha «clearance»)
    var presenti = ESCLUSIONI.filter(function(w){ return haParola(tt, w); });
    var migliore = null, lung = 0;
    ESAMI.forEach(function(e){
      var tuttiNomi = ' ' + e.nomi.map(normalizza).join(' | ') + ' ';   // «MCV (volume corpuscolare medio)»: la parola sta in un altro nome dello stesso esame
      e.nomi.forEach(function(n){
        var a = normalizza(n);
        var ok = t === a || t.indexOf(a + ' ') === 0;
        if(ok) ok = presenti.every(function(w){ return haParola(tuttiNomi, w); });
        if(ok && a.length > lung){ migliore = e.chiave; lung = a.length; }
      });
    });
    return migliore;
  }
  // la formula leucocitaria: «Neutrofili» con l'unità «%» è la percentuale, «Neutrofili %» con ×10³/µL il numero
  function perUnita(chiave, unita){
    if(!chiave) return chiave;
    var u = String(unita || '').trim();
    if(COPPIE_PCT[chiave] && u === '%') return COPPIE_PCT[chiave];
    for(var k in COPPIE_PCT) if(COPPIE_PCT[k] === chiave && u && u !== '%') return k;
    return chiave;
  }

  function numero(v){
    if(v == null || v === '') return null;
    if(typeof v === 'string'){ v = v.trim(); if(/^[<>≤≥]/.test(v)) return null; v = v.replace(',', '.').replace(/[^0-9.\-]/g, ''); if(!/\d/.test(v)) return null; }   // «< 5» è un limite di rilevazione, non un valore
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function testo(v, max){
    if(v == null) return '';
    var s = String(v).replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max) : s;
  }
  function pad(n){ return (String(n).length < 2 ? '0' : '') + n; }
  // «12/10/2026», «12-10-2026», «2026-10-12», «2026-3-8», «12.10.26» → 'YYYY-MM-DD'; altrimenti null. Ancorate (revisione del
  // 3 novembre: «2026-3-28» letta a pezzi diventava il 2028); dopo la data può esserci solo un orario. L'anno a due cifre:
  // fino a 50 è il Duemila, oltre il Novecento (le analisi di una vita, non date future)
  var PIVOT_ANNO = 50;
  function dataPrelievo(s){
    var t = String(s || '').trim();
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]\d{1,2}[:.]\d{2}.*)?$/.exec(t);
    if(!m) { m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?:[T\s]\d{1,2}[:.]\d{2}.*)?$/.exec(t); if(m){ var a = m[3].length === 2 ? String(Number(m[3]) <= PIVOT_ANNO ? 2000 + Number(m[3]) : 1900 + Number(m[3])) : m[3]; m = [null, a, pad(m[2]), pad(m[1])]; } }
    if(!m) return null;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if(!(y >= 1990 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if(dt.getUTCMonth() !== mo - 1) return null;
    return y + '-' + pad(mo) + '-' + pad(d);
  }

  // La risposta del modello (o le righe corrette nel foglio) → { riconosciuto, data_prelievo, esami, letti, note }.
  // Ogni riga: { nome, chiave, valore, unita, rif_min, rif_max }. Una chiave già vista non si ripete: la seconda riga
  // RESTA, col suo nome e senza chiave (si trascrive, non entra in colonna).
  function valida(grezzo){
    var o = grezzo && typeof grezzo === 'object' ? grezzo : {};
    var righe = Array.isArray(o.esami) ? o.esami : [];
    var out = [], viste = {};
    righe.slice(0, MAX_RIGHE).forEach(function(r){
      if(!r || typeof r !== 'object') return;
      var nome = testo(r.nome, MAX_NOME), valore = numero(r.valore);
      if(!nome || valore == null) return;
      if(nonVoluto(nome)) return;   // Body 172
      var unita = testo(r.unita, MAX_UNITA);
      var chiave = perUnita(riconosci(nome) || (r.chiave && perChiave[r.chiave] ? r.chiave : null), unita);   // il nome stampato vince sulla chiave del modello
      if(chiave){ if(viste[chiave]) chiave = null; else viste[chiave] = true; }
      var riga = { nome: nome, chiave: chiave, valore: valore, unita: unita };
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
  // La fascia di una riga letta: quella del referto se stampata (fonte 'referto'), altrimenti la tabella.
  // Body 171: per un esame con `solo_min` (l'HDL) il massimo non conta mai, qualunque cosa stampi il referto o porti
  // il CSV: la riga lo conserva com'è, ma la fascia che si mostra e si giudica ha solo il minimo. È il punto unico:
  // lettura, CSV, panoramica, grafico, elenco per data, Pirsi e ritratto passano tutti da qui
  function fasciaPer(riga, sesso){
    if(!riga) return null;
    var e = riga.chiave && perChiave[riga.chiave], soloMin = !!(e && e.solo_min);
    if(riga.rif_min != null || (riga.rif_max != null && !soloMin)) return { min: riga.rif_min != null ? riga.rif_min : null, max: (riga.rif_max != null && !soloMin) ? riga.rif_max : null, fonte: 'referto' };
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
    if(f.max != null) return '≤ ' + it(f.max);   // Body 171: il segno dice quello che fa fuoriFascia (uguale al limite è dentro)
    if(f.min != null) return '≥ ' + it(f.min);
    return '';
  }

  function unitaNorm(u){ return String(u || '').toLowerCase().replace(/[µμ]/g, 'u').replace(/\s+/g, ''); }
  // L'unità stampata è quella attesa per quell'esame (o una equivalente)? Vuota = si prende per buona.
  function unitaCombacia(e, u){
    var n = unitaNorm(u);
    if(!n) return true;
    var attesa = unitaNorm(e.unita), eq = UNITA_EQ[attesa] || [attesa];
    return eq.indexOf(n) >= 0;
  }
  // Le 11 colonne di blood_tests dalle righe riconosciute, solo con l'unità attesa
  function inColonne(righe){
    var out = {};
    ESAMI.forEach(function(e){ if(e.colonna) out[e.colonna] = null; });
    (righe || []).forEach(function(r){
      var e = r && r.chiave && perChiave[r.chiave];
      if(e && e.colonna && r.valore != null && unitaCombacia(e, r.unita)) out[e.colonna] = r.valore;
    });
    return out;
  }
  // Le righe di una riga di blood_tests: `esami` se c'è (letta o corretta), altrimenti le colonne (righe del check)
  function daRiga(riga){
    if(!riga) return [];
    if(Array.isArray(riga.esami) && riga.esami.length) return riga.esami.filter(function(x){ return !(x && nonVoluto(x.nome)); });   // Body 172: le righe vecchie col NRBC non lo mostrano
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

  // La famiglia di una chiave; un nome non riconosciuto sta in «Altro»
  function famigliaDi(chiave){ var e = chiave && perChiave[chiave]; return (e && e.famiglia) || 'altro'; }

  // ── Lo storico da un file CSV (Body 170, 3 novembre 2026) ──
  // Il formato: la prima riga è l'intestazione, prima colonna «Data», le altre «Nome (min–max unità)» (la fascia
  // può mancare: «Nome (unità)» o «Nome»); poi una riga per prelievo, data in gg/mm/aa o gg/mm/aaaa, i decimali col
  // punto (o la virgola), le celle vuote si saltano. La prima riga vuota, o una riga che non comincia con una data
  // (la sezione «RANGE DI RIFERIMENTO»), chiude la lettura. Separatore virgola o punto e virgola, scelto dall'intestazione.
  // Risponde { riconosciuto, prelievi:[{ test_date, esami, letti }], colonne, valori, doppie, celle_scartate, dal, al,
  // nomi_ignoti }: con riconosciuto false non c'è niente da scrivere.
  var MAX_PRELIEVI_CSV = 400;
  function csvCelle(linea, sep){
    var out = [], cur = '', q = false;
    for(var i = 0; i < linea.length; i++){
      var c = linea[i];
      if(q){ if(c === '"'){ if(linea[i + 1] === '"'){ cur += '"'; i++; } else q = false; } else cur += c; }
      else if(c === '"') q = true;
      else if(c === sep){ out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(function(s){ return s.trim(); });
  }
  // «Globuli Bianchi (4.3–10.3 ×10³/µL)» → { nome, rif_min, rif_max, unita }; «ALT (GPT) (10–50 U/L)» tiene «ALT (GPT)» come nome
  function csvIntestazione(cella){
    var m = /^(.*\S)\s*\(([^()]*)\)\s*$/.exec(cella);
    if(!m) return { nome: testo(cella, MAX_NOME), unita: '' };
    var dentro = m[2].trim();
    var r = /^([0-9][0-9.,]*)\s*[–—\-−]\s*([0-9][0-9.,]*)\s*(.*)$/.exec(dentro);
    if(r){ var o = { nome: testo(m[1], MAX_NOME), unita: testo(r[3], MAX_UNITA) }; var mn = numero(r[1]), mx = numero(r[2]); if(mn != null) o.rif_min = mn; if(mx != null) o.rif_max = mx; return o; }
    var r1 = /^([<≤>≥])\s*([0-9][0-9.,]*)\s*(.*)$/.exec(dentro);   // «(<200 mg/dL)» · «(>40 mg/dL)»
    if(r1){ var o1 = { nome: testo(m[1], MAX_NOME), unita: testo(r1[3], MAX_UNITA) }, n1 = numero(r1[2]); if(n1 != null){ if(r1[1] === '<' || r1[1] === '≤') o1.rif_max = n1; else o1.rif_min = n1; } return o1; }
    if(!/\d/.test(dentro)) return { nome: testo(m[1], MAX_NOME), unita: testo(dentro, MAX_UNITA) };
    return { nome: testo(cella, MAX_NOME), unita: '' };
  }
  function leggiCSV(contenuto, opzioni){
    var oggi = (opzioni && opzioni.oggi) || null;   // le date dopo oggi si saltano e si contano (future)
    var vuoto = { riconosciuto: false, prelievi: [], colonne: 0, colonne_ignorate: 0, valori: 0, doppie: 0, celle_scartate: 0, date_non_valide: 0, righe_lunghe: 0, future: 0, dal: null, al: null, nomi_ignoti: [] };
    var righe = String(contenuto || '').replace(/^﻿/, '').split(/\r\n|\n|\r/);
    var i = 0;
    while(i < righe.length && !righe[i].trim()) i++;
    if(i >= righe.length) return vuoto;
    var testa = righe[i];
    var sep = (testa.indexOf(';') >= 0 && normalizza(csvCelle(testa, ';')[0]) === 'data' && csvCelle(testa, ';').length > 1) ? ';' : ',';   // il punto e virgola di Excel in italiano
    var colonne = csvCelle(testa, sep);
    var c0 = normalizza(colonne[0]);
    if(colonne.length < 2 || !(c0 === 'data' || c0.indexOf('data ') === 0)) return vuoto;   // «Data», «Data prelievo», «Data (gg/mm/aa)»
    var ignorate = Math.max(0, colonne.length - 1 - MAX_RIGHE);
    var intest = colonne.slice(1, 1 + MAX_RIGHE).map(csvIntestazione);
    var prelievi = [], viste = {}, doppie = 0, scartate = 0, valori = 0, nonValide = 0, lunghe = 0, future = 0;
    for(i = i + 1; i < righe.length; i++){
      var linea = righe[i];
      if(!linea.trim()) break;
      var celle = csvCelle(linea, sep);
      if(!celle.some(function(c){ return c; })) break;
      if(!/\d/.test(celle[0])) break;             // la sezione dei range, o altro senza una data: la lettura finisce qui
      var data = dataPrelievo(celle[0]);
      if(!data){ nonValide++; continue; }           // «31/04/26»: la riga si salta e si conta, le altre si leggono
      if(celle.length > colonne.length){ lunghe++; continue; }   // una cella in più scalerebbe tutti i valori di colonna
      if(oggi && data > oggi){ future++; continue; }
      if(viste[data]){ doppie++; continue; }
      var esami = [];
      for(var j = 0; j < intest.length; j++){
        var cella = celle[j + 1];
        if(cella == null || cella === '') continue;
        if(numero(cella) == null){ scartate++; continue; }
        var h = intest[j];
        esami.push({ nome: h.nome, valore: cella, unita: h.unita, rif_min: h.rif_min, rif_max: h.rif_max });
      }
      var v = valida({ riconosciuto: true, data_prelievo: data, esami: esami });
      if(!v.esami.length) continue;
      viste[data] = true;                           // la data conta solo quando il prelievo entra
      valori += v.esami.length;
      prelievi.push({ test_date: data, esami: v.esami, letti: v.esami.length });
      if(prelievi.length >= MAX_PRELIEVI_CSV) break;
    }
    if(!prelievi.length) return vuoto;
    var date = prelievi.map(function(p){ return p.test_date; }).sort();
    var ignoti = intest.filter(function(h){ return h.nome && !riconosci(h.nome) && !nonVoluto(h.nome); }).map(function(h){ return h.nome; });
    return { riconosciuto: true, prelievi: prelievi, colonne: intest.length, colonne_ignorate: ignorate, valori: valori, doppie: doppie, celle_scartate: scartate, date_non_valide: nonValide, righe_lunghe: lunghe, future: future, dal: date[0], al: date[date.length - 1], nomi_ignoti: ignoti };
  }

  return { VERSIONE: VERSIONE, ESAMI: ESAMI, FAMIGLIE: FAMIGLIE, PANORAMICA: PANORAMICA, MAX_RIGHE: MAX_RIGHE, MAX_NOTE: MAX_NOTE, esame: esame, normalizza: normalizza, riconosci: riconosci,
    dataPrelievo: dataPrelievo, valida: valida, fascia: fascia, fasciaPer: fasciaPer, fuoriFascia: fuoriFascia, mostraFascia: mostraFascia,
    inColonne: inColonne, daRiga: daRiga, serie: serie, riassunto: riassunto, testo: testo, numero: numero, unitaCombacia: unitaCombacia, ESCLUSIONI: ESCLUSIONI, NON_VOLUTI: NON_VOLUTI, nonVoluto: nonVoluto,
    famigliaDi: famigliaDi, perUnita: perUnita, leggiCSV: leggiCSV, csvIntestazione: csvIntestazione };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTEsami;
