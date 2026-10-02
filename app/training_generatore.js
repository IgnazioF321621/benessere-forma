// ═══════════════════════════════════════
// app/training_generatore.js — Training, la scheda e il generatore (Fondamenta 035, tappa 7, 2 ottobre 2026)
// ═══════════════════════════════════════
// I dati di base (blocco attivazione, media degli esercizi, sessioni di fallback), la lettura della scheda
// utente da schede_utente, il ciclo e il debito, il coach che genera le schede con la sua diagnostica.
// Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO app/home.js e PRIMA di app/training.js: qui al caricamento si dichiarano solo
// costanti scritte per esteso e si collega il Recovery Day unico, niente che usi un nome scritto più
// avanti nella pagina (lo controlla tools/banco/prova_ordine_caricamento.js).

// ── Training data ───────────────────────────────────────────
const ACTIVATION_BLOCK = [
  { name:'Respirazione diaframmatica 360°', duration:'2 min', seconds:120 },
  { name:'Vacuum addominale',               duration:'2 min', seconds:120 },
  { name:'Cat-Cow + rotazione toracica',    duration:'1 min', seconds:60  },
];
const EXERCISE_MEDIA = {
  // ── UPPER A ──
  'Trazioni': {
    muscleImg: 'assets/exercises/trazioni-sbarra-muscoli.png',
    executionImg: 'assets/exercises/trazioni-sbarra-esecuzione.png'
  },
  'Chest press in piedi con elastico': {
    // FALLBACK: file 'chest-press-in-piedi-muscoli.png' non disponibile;
    // riuso 'chest-press-orizzontale-muscoli.png' (stessi muscoli target).
    muscleImg: 'assets/exercises/chest-press-orizzontale-muscoli.png',
    executionImg: null  // immagine esecuzione non trovata su Wger
  },
  'Shoulder press in piedi con elastico': {
    muscleImg: 'assets/exercises/shoulder-press-in-piedi-muscoli.png',
    executionImg: 'assets/exercises/shoulder-press-in-piedi-esecuzione.png'
  },
  'Row in piedi con elastico': {
    muscleImg: 'assets/exercises/row-in-piedi-muscoli.png',
    executionImg: null  // immagine esecuzione non trovata su Wger
  },
  'Face pull con elastico': {
    muscleImg: 'assets/exercises/face-pull-muscoli.png',
    executionImg: null  // immagine esecuzione non trovata su Wger
  },

  // ── UPPER B ──
  'Inverted row con elastico': {
    muscleImg: 'assets/exercises/inverted-row-elastico-muscoli.png',
    executionImg: null
  },
  'Chest press inclinata su panca': {
    muscleImg: 'assets/exercises/chest-press-inclinata-muscoli.png',
    executionImg: ['assets/exercises/chest-press-inclinata-esecuzione-1.png','assets/exercises/chest-press-inclinata-esecuzione-2.png']
  },
  'Lateral raise con elastico': {
    muscleImg: 'assets/exercises/lateral-raise-muscoli.png',
    executionImg: ['assets/exercises/lateral-raise-esecuzione-1.png','assets/exercises/lateral-raise-esecuzione-2.png']
  },
  'Row inclinato in piedi busto 45°': {
    muscleImg: 'assets/exercises/row-inclinato-muscoli.png',
    executionImg: ['assets/exercises/row-inclinato-esecuzione-1.png','assets/exercises/row-inclinato-esecuzione-2.png']
  },
  'Curl bicipiti con elastico': {
    muscleImg: 'assets/exercises/curl-bicipiti-muscoli.png',
    executionImg: ['assets/exercises/curl-bicipiti-esecuzione-1.png','assets/exercises/curl-bicipiti-esecuzione-2.png']
  },
  'Tricipiti overhead con elastico': {
    muscleImg: 'assets/exercises/tricipiti-overhead-muscoli.png',
    executionImg: 'assets/exercises/tricipiti-overhead-esecuzione.png'
  },

  // ── LOWER A ──
  'Bulgarian split squat con elastico': {
    muscleImg: 'assets/exercises/bulgarian-split-squat-muscoli.png',
    executionImg: null  // immagine esecuzione non trovata su Wger
  },
  'Romanian deadlift con elastico': {
    muscleImg: 'assets/exercises/romanian-deadlift-muscoli.png',
    executionImg: null
  },
  'Hip thrust con elastico': {
    muscleImg: 'assets/exercises/hip-thrust-muscoli.png',
    executionImg: null
  },
  'Glute bridge isometrico con cavigliera': {
    muscleImg: 'assets/exercises/glute-bridge-muscoli.png',
    executionImg: null
  },

  // ── LOWER B ──
  'Squat con elastico e talloni rialzati': {
    muscleImg: 'assets/exercises/squat-talloni-rialzati-muscoli.png',
    executionImg: 'assets/exercises/squat-talloni-rialzati-esecuzione.png'
  },
  'Single leg Romanian deadlift con elastico': {
    muscleImg: 'assets/exercises/single-leg-rdl-muscoli.png',
    executionImg: null
  },
  'Hip thrust con elastico TUT alto': {
    muscleImg: 'assets/exercises/hip-thrust-muscoli.png',  // riusa stesso muscle map di Hip thrust con elastico
    executionImg: null
  },
  'Leg curl con elastico sulla fitball': {
    muscleImg: 'assets/exercises/leg-curl-muscoli.png',
    executionImg: 'assets/exercises/leg-curl-esecuzione.png'
  },
  'Calf raise con elastico': {
    muscleImg: 'assets/exercises/calf-raise-muscoli.png',
    executionImg: 'assets/exercises/calf-raise-esecuzione.png'
  }
};

const TRAINING_SESSIONS = {
  upperA:{
    id:'upperA', name:'Upper A', type:'Forza', rir:2,
    label:'Upper A — Forza', rest:'2 min',
    exercises:[
      {
        name:'Trazioni', codice:'EX008', sets:4, reps:'4-6',
        eq:'Sbarra fissa da porta',
        setup:[
          "Presa pronata, larghezza poco più delle spalle",
          "Elastico sotto i piedi se serve assistenza"
        ],
        execution:[
          "Sospensione passiva attiva: spalle basse, scapole compatte",
          "Tirata fino al mento sopra la sbarra",
          "Eccentrica controllata 3 sec"
        ],
        commonErrors:[
          "Dondolare il corpo per slancio",
          "Spalle che salgono verso le orecchie",
          "Range incompleto (mento non sopra la sbarra)"
        ],
        muscles:['dorsale','bicipiti','trapezio','romboidi']
      },
      {
        name:'Chest press in piedi con elastico', codice:'EX001', sets:4, reps:'4-6',
        eq:'Elastico + 2 maniglie singole',
        setup:[
          "Elastico ancorato dietro all'altezza del petto",
          "In piedi, busto leggermente inclinato avanti",
          "Una maniglia per mano"
        ],
        execution:[
          "Spinta orizzontale in avanti delle braccia",
          "Estensione completa senza bloccare i gomiti",
          "Discesa controllata verso il petto"
        ],
        commonErrors:[
          "Inarcamento eccessivo della schiena",
          "Spalle che si elevano durante la spinta",
          "Movimento troppo veloce in eccentrica"
        ],
        muscles:['pettorale','deltoide anteriore','tricipiti']
      },
      {
        name:'Shoulder press in piedi con elastico', codice:'EX006', sets:3, reps:'4-6',
        eq:'Elastico + 2 maniglie singole',
        setup:[
          "Bilaterale, elastico sotto entrambi i piedi",
          "Una maniglia per mano all'altezza delle spalle"
        ],
        execution:[
          "Spinta verticale verso l'alto fino a braccia distese",
          "Mantieni core e gluteo contratti",
          "Discesa controllata fino alle spalle"
        ],
        commonErrors:[
          "Iperestensione lombare durante la spinta",
          "Gomiti che vanno dietro alla linea del corpo",
          "Spinta asimmetrica tra i due lati"
        ],
        muscles:['deltoidi','tricipiti','trapezio'],
        alert:"⚠️ Lombari: core e gluteo SEMPRE contratti per evitare iperestensione (iperlordosi)."
      },
      {
        name:'Row in piedi con elastico', codice:'EX470', sets:4, reps:'4-6',
        eq:'Elastico + barra lunga',
        setup:[
          "Elastico ancorato davanti all'altezza del petto",
          "In piedi, busto leggermente inclinato avanti",
          "Presa larga sulla barra"
        ],
        execution:[
          "Tirata orizzontale della barra verso il petto",
          "Scapole insieme in fase di tirata",
          "Discesa controllata mantenendo tensione"
        ],
        commonErrors:[
          "Schiena curva durante la tirata",
          "Gomiti che si aprono troppo lateralmente",
          "Uso esagerato della inerzia del busto"
        ],
        muscles:['dorsale','romboidi','trapezio medio','bicipiti']
      },
      {
        name:'Face pull con elastico', codice:'EX500', sets:3, reps:'6-8', iso:true,
        eq:'Elastico + corda doppia',
        setup:[
          "Elastico ancorato sopra all'altezza del viso",
          "In piedi, presa neutra alle estremità della corda"
        ],
        execution:[
          "Tirata della corda verso il viso",
          "Gomiti alti e larghi, palmi che ruotano verso l'alto",
          "Pausa breve in massima retrazione"
        ],
        commonErrors:[
          "Gomiti bassi (perdi la rotazione esterna)",
          "Tirata verso il petto invece che il viso",
          "Movimento veloce senza retrazione vera"
        ],
        muscles:['deltoide posteriore','trapezio','rotatori cuffia']
      },
    ]
  },
  upperB:{
    id:'upperB', name:'Upper B', type:'Ipertrofia', rir:1,
    label:'Upper B — Ipertrofia', rest:'75 sec',
    exercises:[
      {
        name:'Inverted row con elastico', codice:'EX077', sets:4, reps:'8-12',
        eq:'Elastico + 2 maniglie o corda doppia',
        setup:[
          "Elastico ancorato basso",
          "Busto inclinato 45°",
          "Presa neutra o pronata alle maniglie"
        ],
        execution:[
          "Tirata orizzontale verso l'addome",
          "Scapole insieme, petto in fuori",
          "Eccentrica controllata 3 sec"
        ],
        commonErrors:[
          "Schiena curva o spalle in protrazione",
          "Movimento generato dalle braccia invece che dal dorso",
          "Range parziale (gomiti non vanno dietro al busto)"
        ],
        muscles:['dorsale','romboidi','trapezio medio','bicipiti']
      },
      {
        name:'Chest press inclinata su panca', codice:'EX071', sets:3, reps:'8-12',
        eq:'Panca 30-45° + elastico + 2 maniglie',
        setup:[
          "Sdraiato su panca inclinata 30-45°",
          "Elastico ancorato basso",
          "Una maniglia per mano all'altezza del petto"
        ],
        execution:[
          "Spinta in alto e leggermente in avanti",
          "Estensione senza bloccare i gomiti",
          "Discesa controllata verso il petto alto"
        ],
        commonErrors:[
          "Inarcamento lombare eccessivo",
          "Gomiti completamente bloccati in estensione",
          "Range incompleto in eccentrica"
        ],
        muscles:['pettorale alto','deltoide anteriore','tricipiti']
      },
      {
        name:'Lateral raise con elastico', codice:'EX055', sets:3, reps:'12-15', iso:true,
        eq:'Elastico + 2 maniglie singole',
        setup:[
          "In piedi sopra l'elastico",
          "Una maniglia per mano lungo i fianchi",
          "Gomiti leggermente flessi"
        ],
        execution:[
          "Sollevamento laterale fino all'altezza spalle",
          "Palmi rivolti verso il basso",
          "Eccentrica controllata 3 sec"
        ],
        commonErrors:[
          "Slancio del busto per aiutare il sollevamento",
          "Gomiti completamente distesi (stress su articolazione)",
          "Sollevamento oltre l'altezza spalle (impingement)"
        ],
        muscles:['deltoide laterale','sovraspinato']
      },
      {
        name:'Row inclinato in piedi busto 45°', codice:'EX470', sets:4, reps:'8-12',
        eq:'Elastico + barra corta',
        setup:[
          "Elastico ancorato basso",
          "Busto inclinato 45°, schiena neutra",
          "Ginocchia leggermente flesse"
        ],
        execution:[
          "Tirata della barra verso l'ombelico (non verso il petto)",
          "Gomiti vicini al busto",
          "Eccentrica controllata mantenendo l'inclinazione"
        ],
        commonErrors:[
          "Schiena curva durante la tirata",
          "Tirata verso il petto invece che ombelico",
          "Risalita del busto durante la tirata"
        ],
        muscles:['dorsale','romboidi','trapezio','deltoide posteriore','bicipiti'],
        alert:"⚠️ Lombari: schiena rigorosamente neutra, mai flessa (iperlordosi)."
      },
      {
        name:'Curl bicipiti con elastico', codice:'EX314', sets:3, reps:'12-15', iso:true,
        eq:'Elastico + 2 maniglie singole',
        setup:[
          "In piedi sopra l'elastico",
          "Palmi avanti (presa supinata)",
          "Gomiti fissi ai fianchi"
        ],
        execution:[
          "Flessione bilaterale degli avambracci verso le spalle",
          "Pausa isometrica 1 sec in cima",
          "Discesa controllata fino a estensione completa"
        ],
        commonErrors:[
          "Gomiti che si spostano in avanti durante il curl",
          "Slancio del busto per completare il movimento",
          "Range incompleto (eccentrica corta)"
        ],
        muscles:['bicipite brachiale','brachiale','brachioradiale']
      },
      {
        name:'Tricipiti overhead con elastico', codice:'EX524', sets:3, reps:'12-15', iso:true,
        eq:'Elastico + corda doppia o maniglia singola',
        setup:[
          "Elastico ancorato basso",
          "Braccia distese sopra la testa",
          "Gomiti vicini alle orecchie"
        ],
        execution:[
          "Flessione dei gomiti dietro la testa",
          "Estensione completa verso l'alto",
          "Mantieni gomiti fermi (solo l'avambraccio si muove)"
        ],
        commonErrors:[
          "Gomiti che si aprono lateralmente",
          "Iperestensione lombare per compensare",
          "Range incompleto (avambraccio non scende abbastanza)"
        ],
        muscles:['tricipite (focus capo lungo)']
      },
    ]
  },
  lowerA:{
    id:'lowerA', name:'Lower A', type:'Forza', rir:2,
    label:'Lower A — Forza', rest:'2 min',
    exercises:[
      {
        name:'Bulgarian split squat con elastico', codice:'EX047', sets:4, reps:'4-6 per lato',
        eq:'Panca + elastico + 2 maniglie',
        setup:[
          "Piede posteriore sulla panca",
          "Tallone anteriore rialzato 3-5 cm",
          "Elastico sotto piede anteriore, una maniglia per mano"
        ],
        execution:[
          "Discesa controllata 3 sec",
          "Ginocchio anteriore in linea col secondo dito del piede",
          "Risalita spingendo dal tallone anteriore"
        ],
        commonErrors:[
          "Ginocchio che collassa verso l'interno (valgo)",
          "Tallone anteriore che si solleva",
          "Inclinazione eccessiva del busto in avanti"
        ],
        muscles:['quadricipite','gluteo','femorali'],
        alert:"⚠️ Ginocchia: tallone rialzato non negoziabile. Ginocchio in linea col piede (valgismo dinamico)."
      },
      {
        name:'Romanian deadlift con elastico', codice:'EX018', sets:4, reps:'4-6',
        eq:'Elastico + barra lunga',
        setup:[
          "Elastico sotto entrambi i piedi (larghezza spalle)",
          "Barra impugnata davanti alle cosce con presa pronata"
        ],
        execution:[
          "Hip hinge: glutei indietro, ginocchia morbide",
          "Discesa fino a sentire stiramento femorali (~tibia)",
          "Risalita estendendo le anche"
        ],
        commonErrors:[
          "Schiena flessa durante la discesa",
          "Ginocchia che si flettono troppo (squat)",
          "Movimento generato dalle braccia invece che dalle anche"
        ],
        muscles:['femorali','gluteo','erettori spinali'],
        alert:"⚠️ Lombari: schiena SEMPRE neutra, mai flessa (iperlordosi). Movimento dalle anche, non dalla colonna."
      },
      {
        name:'Hip thrust con elastico', codice:'EX017', sets:4, reps:'4-6',
        eq:'Panca + elastico + 2 maniglie',
        setup:[
          "Spalle appoggiate sulla panca",
          "Piedi a terra larghezza spalle",
          "Elastico sopra le anche tenuto lateralmente"
        ],
        execution:[
          "Spinta verticale delle anche verso l'alto",
          "Linea retta spalle-anche-ginocchia in cima",
          "Pausa isometrica 2 sec con massima contrazione glutea"
        ],
        commonErrors:[
          "Iperestensione lombare in cima",
          "Ginocchia che si aprono o chiudono",
          "Mento che si stacca dal petto"
        ],
        muscles:['gluteo massimo','femorali','gluteo medio']
      },
      {
        name:'Glute bridge isometrico con cavigliera', codice:'EX019', sets:3, reps:'20-30 sec per lato', iso:true,
        eq:'Elastico + cavigliera',
        setup:[
          "Supino, ginocchia flesse, piedi a terra",
          "Cavigliera al ginocchio",
          "Elastico ancorato lateralmente"
        ],
        execution:[
          "Sollevamento del bacino fino a linea retta spalle-ginocchia",
          "Mantieni la posizione isometrica per 20-30 sec resistendo alla trazione verso l'interno",
          "Scendi, sposta cavigliera ed elastico sulla gamba opposta, ripeti"
        ],
        commonErrors:[
          "Ginocchio che cede verso l'interno",
          "Bacino che si abbassa durante la tenuta",
          "Iperestensione lombare invece di estensione anca"
        ],
        muscles:['gluteo massimo','gluteo medio','vasto mediale'],
        alert:"⚠️ Ginocchia: rinforza vasto mediale e gluteo medio (protezione valgismo dinamico)."
      },
    ]
  },
  lowerB:{
    id:'lowerB', name:'Lower B', type:'Ipertrofia', rir:1,
    label:'Lower B — Ipertrofia', rest:'75 sec',
    exercises:[
      {
        name:'Squat con elastico e talloni rialzati', sets:4, reps:'8-12',
        eq:'Elastico + 2 maniglie o barra lunga',
        setup:[
          "Talloni su spessore 3-5 cm",
          "Elastico sotto i piedi",
          "Maniglie all'altezza spalle (front squat)"
        ],
        execution:[
          "Discesa fino a parallelo o leggermente oltre",
          "Busto eretto, ginocchia in linea coi piedi",
          "Risalita esplosiva ma controllata"
        ],
        commonErrors:[
          "Ginocchia che collassano verso l'interno",
          "Talloni che si sollevano (anche con rialzo)",
          "Discesa parziale (mezzo squat)"
        ],
        muscles:['quadricipite','gluteo','femorali'],
        alert:"⚠️ Ginocchia + lombari: talloni rialzati riducono stress su entrambi. Non saltare il rialzo."
      },
      {
        name:'Single leg Romanian deadlift con elastico', codice:'EX291', sets:3, reps:'8-12 per lato',
        eq:'Elastico + 1 maniglia singola',
        setup:[
          "Elastico sotto piede d'appoggio",
          "Maniglia in mano opposta alla gamba d'appoggio"
        ],
        execution:[
          "Hip hinge unilaterale, gamba libera dietro in linea col busto",
          "Schiena neutra, ginocchio d'appoggio leggermente flesso",
          "Risalita estendendo l'anca"
        ],
        commonErrors:[
          "Rotazione del bacino (anca libera che si apre)",
          "Schiena flessa per compensare equilibrio",
          "Ginocchio d'appoggio che si flette troppo"
        ],
        muscles:['femorali','gluteo','gluteo medio','core'],
        alert:"⚠️ Lombari: meglio toccare col piede posteriore che inarcare la schiena."
      },
      {
        name:'Hip thrust con elastico TUT alto', codice:'EX017', sets:4, reps:'12-15',
        eq:'Panca + elastico + 2 maniglie',
        setup:[
          "Identico al hip thrust forza ma focus su tempo sotto tensione"
        ],
        execution:[
          "Spinta verticale controllata delle anche",
          "Eccentrica 4 sec (discesa lentissima)",
          "Pausa breve in cima, no rebound dal basso"
        ],
        commonErrors:[
          "Eccentrica troppo veloce (perdi lo stimolo TUT)",
          "Iperestensione lombare in cima",
          "Range incompleto in basso (non scendi fino a sfiorare il pavimento)"
        ],
        muscles:['gluteo massimo','femorali','gluteo medio']
      },
      {
        name:'Leg curl con elastico sulla fitball', codice:'EX043', sets:3, reps:'12-15', iso:true,
        eq:'Fitball + cavigliera (opz.)',
        setup:[
          "Supino, talloni sulla fitball, bacino sollevato",
          "Linea retta spalle-anche-ginocchia"
        ],
        execution:[
          "Trascina la palla verso i glutei flettendo le ginocchia",
          "Mantieni il bacino alto durante tutto il movimento",
          "Eccentrica 3 sec riallontanando la palla"
        ],
        commonErrors:[
          "Bacino che si abbassa durante il movimento",
          "Movimento veloce e a scatti",
          "Range incompleto (talloni non arrivano vicino ai glutei)"
        ],
        muscles:['femorali','gluteo','polpaccio']
      },
      {
        name:'Calf raise con elastico', codice:'EX028', sets:3, reps:'15-20', iso:true,
        eq:'Elastico + 2 maniglie singole',
        setup:[
          "In piedi sopra l'elastico (avampiede)",
          "Maniglie ai fianchi",
          "Opzionale: avampiede su spessore per range maggiore"
        ],
        execution:[
          "Sollevamento sulle punte estendendo le caviglie",
          "Pausa isometrica 1 sec in cima",
          "Discesa controllata fino al massimo allungamento"
        ],
        commonErrors:[
          "Range incompleto (mezza estensione)",
          "Movimento a scatti senza pausa in cima",
          "Inclinazione del corpo in avanti per slancio"
        ],
        muscles:['gastrocnemio','soleo']
      },
    ]
  },
  recoveryUpper:{
    id:'recoveryUpper', name:"Recovery Day", type:'Recupero', rir:null,
    label:"Recovery Day", rest:null,
    exercises:[
      // Blocco 1 — Anche e bacino
      { name:'Hip CARs dx', duration_sec:45, block:'Anche e bacino', side:'dx',
        muscleImg:'assets/exercises/hip-thrust-muscoli.png',
        muscles:['anche','glutei','flessori'],
        execution:['In quadrupedia o appoggio','Solleva ginocchio destro lateralmente','Disegna cerchi ampi e controllati'],
        commonErrors:['Velocità eccessiva','Compensare con il bacino','Range parziale'] },
      { name:'Hip CARs sx', duration_sec:45, block:'Anche e bacino', side:'sx',
        muscleImg:'assets/exercises/hip-thrust-muscoli.png',
        muscles:['anche','glutei','flessori'],
        execution:['In quadrupedia o appoggio','Solleva ginocchio sinistro lateralmente','Disegna cerchi ampi e controllati'],
        commonErrors:['Velocità eccessiva','Compensare con il bacino','Range parziale'] },
      { name:'90/90 hip switch', duration_sec:60, block:'Anche e bacino',
        muscleImg:'assets/exercises/hip-thrust-muscoli.png',
        muscles:['anche','glutei','adduttori'],
        execution:['Seduto con gambe in 90/90 (una avanti, una di lato)','Alterna ruotando entrambe le ginocchia lato per lato','Mantieni il busto eretto'],
        commonErrors:['Curvare la schiena','Ginocchia che si sollevano','Velocità troppo elevata'] },
      { name:'Affondo basso con rotazione dx', codice:'EX120', duration_sec:45, block:'Anche e bacino', side:'dx',
        muscleImg:'assets/exercises/bulgarian-split-squat-muscoli.png',
        muscles:['flessori','glutei','colonna toracica'],
        execution:['Affondo profondo gamba destra avanti','Mano sinistra a terra interna al piede','Ruota braccio destro verso il cielo aprendo il petto'],
        commonErrors:['Tallone posteriore che si solleva','Iperestendere la lombare','Ginocchio anteriore oltre la punta'] },
      { name:'Affondo basso con rotazione sx', codice:'EX120', duration_sec:45, block:'Anche e bacino', side:'sx',
        muscleImg:'assets/exercises/bulgarian-split-squat-muscoli.png',
        muscles:['flessori','glutei','colonna toracica'],
        execution:['Affondo profondo gamba sinistra avanti','Mano destra a terra interna al piede','Ruota braccio sinistro verso il cielo aprendo il petto'],
        commonErrors:['Tallone posteriore che si solleva','Iperestendere la lombare','Ginocchio anteriore oltre la punta'] },
      { name:'Cossack squat alternati', codice:'EX082', duration_sec:60, block:'Anche e bacino',
        muscleImg:'assets/exercises/squat-talloni-rialzati-muscoli.png',
        muscles:['adduttori','glutei','quadricipiti'],
        execution:['Gambe larghe, mani in preghiera davanti',"Piega una gamba spingendo i glutei indietro, l'altra dritta",'Alterna lato per lato'],
        commonErrors:['Tallone che si solleva sul lato piegato','Schiena curva','Velocità eccessiva'] },
      // Blocco 2 — Glutei e lombari
      { name:'Pigeon pose dx', duration_sec:60, block:'Glutei e lombari', side:'dx',
        muscleImg:'assets/exercises/hip-thrust-muscoli.png',
        muscles:['glutei','piriforme'],
        execution:['Da quadrupedia, porta il ginocchio destro in avanti angolato','Gamba sinistra distesa indietro','Adagia il busto in avanti respirando'],
        commonErrors:['Bacino sbilanciato','Forzare la rotazione','Spalle che salgono'] },
      { name:'Pigeon pose sx', duration_sec:60, block:'Glutei e lombari', side:'sx',
        muscleImg:'assets/exercises/hip-thrust-muscoli.png',
        muscles:['glutei','piriforme'],
        execution:['Da quadrupedia, porta il ginocchio sinistro in avanti angolato','Gamba destra distesa indietro','Adagia il busto in avanti respirando'],
        commonErrors:['Bacino sbilanciato','Forzare la rotazione','Spalle che salgono'] },
      { name:'Figura 4 supino dx', duration_sec:45, block:'Glutei e lombari', side:'dx',
        muscleImg:'assets/exercises/hip-thrust-muscoli.png',
        muscles:['glutei','piriforme'],
        execution:['Supino, ginocchia piegate','Caviglia destra sul ginocchio sinistro','Tira la coscia sinistra verso di te'],
        commonErrors:['Sollevare la spalla destra dal pavimento','Curvare la schiena','Trattenere il respiro'] },
      { name:'Figura 4 supino sx', duration_sec:45, block:'Glutei e lombari', side:'sx',
        muscleImg:'assets/exercises/hip-thrust-muscoli.png',
        muscles:['glutei','piriforme'],
        execution:['Supino, ginocchia piegate','Caviglia sinistra sul ginocchio destro','Tira la coscia destra verso di te'],
        commonErrors:['Sollevare la spalla sinistra dal pavimento','Curvare la schiena','Trattenere il respiro'] },
      { name:'Knee-to-chest doppia', duration_sec:30, block:'Glutei e lombari',
        muscleImg:null,
        muscles:['lombari','glutei'],
        execution:['Supino, abbraccia entrambe le ginocchia al petto','Lascia che la lombare si appiattisca','Respira lentamente'],
        commonErrors:['Sollevare la testa','Forzare oltre comfort','Spalle che si bloccano'] },
      // Blocco 3 — Colonna toracica e spalle
      { name:'Apertura toracica supina (candeliere)', duration_sec:60, block:'Colonna toracica e spalle',
        muscleImg:'assets/exercises/chest-press-orizzontale-muscoli.png',
        muscles:['petto','deltoidi anteriori','colonna toracica'],
        execution:['Sdraiato supino, braccia a 90° a candeliere','Lascia cadere le braccia verso il pavimento','Respira nel petto aperto'],
        commonErrors:['Forzare le braccia oltre il range','Iperestendere la lombare','Trattenere il respiro'] },
      { name:'Thread the needle dx', codice:'EX123', duration_sec:45, block:'Colonna toracica e spalle', side:'dx',
        muscleImg:'assets/exercises/row-inclinato-muscoli.png',
        muscles:['colonna toracica','scapole','romboidi'],
        execution:['In quadrupedia','Infila il braccio destro sotto al sinistro ruotando il busto','Spalla e tempia a terra, respira nella rotazione'],
        commonErrors:['Bacino che si sposta','Forzare con la spinta','Ruotare solo dalla spalla'] },
      { name:'Thread the needle sx', codice:'EX123', duration_sec:45, block:'Colonna toracica e spalle', side:'sx',
        muscleImg:'assets/exercises/row-inclinato-muscoli.png',
        muscles:['colonna toracica','scapole','romboidi'],
        execution:['In quadrupedia','Infila il braccio sinistro sotto al destro ruotando il busto','Spalla e tempia a terra, respira nella rotazione'],
        commonErrors:['Bacino che si sposta','Forzare con la spinta','Ruotare solo dalla spalla'] },
      { name:'Rotazione toracica seduto dx', codice:'EX124', duration_sec:30, block:'Colonna toracica e spalle', side:'dx',
        muscleImg:null,
        muscles:['colonna toracica','obliqui'],
        execution:['Seduto a gambe incrociate','Mano sinistra sul ginocchio destro, destra dietro la schiena','Ruota dolcemente verso destra'],
        commonErrors:['Curvare la schiena','Spingere troppo con le mani','Ruotare con il bacino'] },
      { name:'Rotazione toracica seduto sx', codice:'EX124', duration_sec:30, block:'Colonna toracica e spalle', side:'sx',
        muscleImg:null,
        muscles:['colonna toracica','obliqui'],
        execution:['Seduto a gambe incrociate','Mano destra sul ginocchio sinistro, sinistra dietro la schiena','Ruota dolcemente verso sinistra'],
        commonErrors:['Curvare la schiena','Spingere troppo con le mani','Ruotare con il bacino'] },
      { name:'Scapular pull-ups a vuoto', duration_sec:45, block:'Colonna toracica e spalle',
        muscleImg:'assets/exercises/trazioni-sbarra-muscoli.png',
        muscles:['scapole','romboidi','trapezio medio'],
        execution:['In piedi, braccia alzate sopra la testa','Tira le scapole giù e indietro come per le trazioni','Tieni 2 sec poi rilascia'],
        commonErrors:['Piegare i gomiti','Spalle che salgono','Compensare con la lombare'] },
      // Blocco 4 — Catena posteriore gambe
      { name:'Stretching femorali seduto', duration_sec:60, block:'Catena posteriore gambe',
        muscleImg:'assets/exercises/romanian-deadlift-muscoli.png',
        muscles:['femorali'],
        execution:['Seduto, gambe distese davanti',"Inclina il busto in avanti dall'anca",'Allunga le mani verso le punte mantenendo schiena dritta'],
        commonErrors:['Curvare la schiena','Forzare le mani sui piedi','Trattenere il respiro'] },
      { name:'Couch stretch dx', duration_sec:60, block:'Catena posteriore gambe', side:'dx',
        muscleImg:'assets/exercises/bulgarian-split-squat-muscoli.png',
        muscles:['quadricipiti','psoas'],
        execution:['Ginocchio destro a terra contro un muro o divano','Piede destro contro la parete, gamba sinistra in affondo','Bacino in retroversione, busto eretto'],
        commonErrors:['Iperestendere la lombare','Bacino non in retroversione','Tallone anteriore che si solleva'] },
      { name:'Couch stretch sx', duration_sec:60, block:'Catena posteriore gambe', side:'sx',
        muscleImg:'assets/exercises/bulgarian-split-squat-muscoli.png',
        muscles:['quadricipiti','psoas'],
        execution:['Ginocchio sinistro a terra contro un muro o divano','Piede sinistro contro la parete, gamba destra in affondo','Bacino in retroversione, busto eretto'],
        commonErrors:['Iperestendere la lombare','Bacino non in retroversione','Tallone anteriore che si solleva'] },
      { name:'Stretching polpaccio gamba dritta dx', duration_sec:30, block:'Catena posteriore gambe', side:'dx',
        muscleImg:'assets/exercises/calf-raise-muscoli.png',
        muscles:['gastrocnemio'],
        execution:['Affondo gamba destra dietro, ginocchio dritto','Tallone a terra, busto eretto','Spingi anche in avanti per aumentare lo stretch'],
        commonErrors:['Tallone che si solleva','Ginocchio piegato','Compensare con la lombare'] },
      { name:'Stretching polpaccio gamba dritta sx', duration_sec:30, block:'Catena posteriore gambe', side:'sx',
        muscleImg:'assets/exercises/calf-raise-muscoli.png',
        muscles:['gastrocnemio'],
        execution:['Affondo gamba sinistra dietro, ginocchio dritto','Tallone a terra, busto eretto','Spingi anche in avanti per aumentare lo stretch'],
        commonErrors:['Tallone che si solleva','Ginocchio piegato','Compensare con la lombare'] },
      // Blocco 5 — Integrazione e respiro
      { name:'Cat-Cow', codice:'EX029', duration_sec:60, block:'Integrazione e respiro',
        muscleImg:null,
        muscles:['colonna vertebrale','addominali'],
        execution:['In quadrupedia','Inspira incurvando la schiena verso il basso (cow)',"Espira inarcando verso l'alto (cat)"],
        commonErrors:['Movimenti a scatti','Range parziale','Tempo di respiro non sincronizzato'] },
      { name:"World's greatest stretch dx", duration_sec:60, block:'Integrazione e respiro', side:'dx',
        muscleImg:null,
        muscles:['flessori','colonna toracica','femorali'],
        execution:['Affondo gamba destra avanti, mani a terra ai lati del piede','Mano sinistra a terra, ruota braccio destro al cielo','Distendi la gamba destra per stiramento femorali'],
        commonErrors:['Movimento troppo veloce',"Schiena curva durante l'estensione",'Trattenere il respiro'] },
      { name:"World's greatest stretch sx", duration_sec:60, block:'Integrazione e respiro', side:'sx',
        muscleImg:null,
        muscles:['flessori','colonna toracica','femorali'],
        execution:['Affondo gamba sinistra avanti, mani a terra ai lati del piede','Mano destra a terra, ruota braccio sinistro al cielo','Distendi la gamba sinistra per stiramento femorali'],
        commonErrors:['Movimento troppo veloce',"Schiena curva durante l'estensione",'Trattenere il respiro'] },
      { name:'Savasana con respirazione profonda', duration_sec:60, block:'Integrazione e respiro',
        muscleImg:null,
        muscles:['tutto il corpo'],
        execution:["Supino, braccia ai lati, palmi rivolti verso l'alto",'Respira profondamente nel diaframma','Rilassa ogni parte del corpo, dalle dita dei piedi alla testa'],
        commonErrors:['Tensioni residue alle spalle o mascella','Mente troppo attiva','Tempo troppo breve per rilassarsi'] }
    ]
  },
  recoveryLower:{
    id:'recoveryLower', name:"Recovery Day", type:'Recupero', rir:null,
    label:"Recovery Day", rest:null,
    // FASE B.2 — seduta UNICA "Recovery Day": exercises popolato dopo la definizione
    // di TRAINING_SESSIONS con recoveryUpper.exercises (single source of truth).
    exercises:[]
  },
  rest:{
    id:'rest', name:'Rest Day', type:'Riposo', rir:null,
    label:'Rest Day', rest:null,
    exercises:[]
  },
};

// FASE B.2 — Recovery Day UNICO: il G6 (recoveryLower) mostra la STESSA seduta del G3
// (recoveryUpper). Reference condivisa: il recovery flow NON muta gli oggetti esercizio e
// traccia il "fatto" per NOME (ST.trainRecoveryDone), resettato a ogni apertura/chiusura
// sessione → nessun leak fra le due. Single source of truth: una sola lista da mantenere.
TRAINING_SESSIONS.recoveryLower.exercises = TRAINING_SESSIONS.recoveryUpper.exercises;

// ═══════════════════════════════════════════════════════════
// TRAINING — LETTURA SCHEDA UTENTE (Mossa 3 — 28 mag 2026)
// ═══════════════════════════════════════════════════════════
// Architettura: ogni accesso a TRAINING_SESSIONS passa per
// getTrainingSession(sid) / getSessionCycle() / getAllTrainingSessions(),
// che leggono ST.userTrainingSessions/userSessionCycle se popolati
// dalla scheda DB (loadActiveScheda), altrimenti fallback automatico
// a TRAINING_SESSIONS / SESSION_CYCLE hardcoded.
// Skip test mode (test-user-001) → resta sempre sui dati hardcoded.
//
// Risultato runtime:
//   - Utente con scheda generata in schede_utente.attiva:
//     vede 4 sessioni Upper/Lower (o split coach generato)
//   - Utente senza scheda generata / errore caricamento:
//     vede TRAINING_SESSIONS originale (6 sessioni Upper/Lower/Recovery)
//   - Test mode: sempre TRAINING_SESSIONS hardcoded
//
// NB: il divisore 6 usato in "Settimana N/4" è CORRETTO per entrambe le schede
// 4 e 5 giorni. Il Rest Day (G7 nello split 5gg) viene salvato con session_type='rest'
// ed è escluso dalla query con .neq('session_type','rest'), quindi ogni giro del
// ciclo produce sempre esattamente 6 record utili — nessun debito tecnico.

async function loadActiveScheda() {
  // Carica la scheda di allenamento attiva dell'utente (schede_utente).
  // Popola ST.userTrainingSessions (oggetto sessionId→session) e
  // ST.userSessionCycle (array di sessionId in ordine dello split).
  // Mai throw: errore o no scheda → fallback automatico sui hardcoded.
  ST.userTrainingSessions = null;
  ST.userSessionCycle = null;
  if (!ST.user || !ST.user.id) return;
  if (ST.user.id === 'test-user-001') return; // test mode skippa, usa hardcoded
  try {
    const { data, error } = await supa.from('schede_utente')
      .select('scheda, blocco_n')
      .eq('user_id', ST.user.id)
      .eq('attiva', true)
      .maybeSingle();
    if (error) {
      console.warn('[scheda] errore caricamento:', error.message);
      return;
    }
    if (!data || !data.scheda) {
      return;
    }
    const sessioniArr = data.scheda.sessioni;
    if (!Array.isArray(sessioniArr) || sessioniArr.length === 0) {
      console.warn('[scheda] scheda attiva senza sessioni, fallback hardcoded');
      return;
    }

    // ── Risoluzione nomi esercizio a runtime dal catalogo ──
    // Il jsonb salva codice+name come snapshot alla generazione; dopo i rename
    // del catalogo (cantiere GIF) quei nomi sono obsoleti. Qui riallineiamo
    // `name` al nome attuale di esercizi_catalog quando il `codice` combacia.
    // SOLO in memoria: nessuna scrittura su schede_utente, il jsonb resta intatto.
    // Se la query catalogo fallisce → scheda usata così com'è (comportamento attuale).
    try {
      const { data: catRows, error: catErr } = await dbqAll('leggere i nomi del catalogo esercizi', () => supa
        .from('esercizi_catalog')
        .select('codice, nome')
        .order('codice', {ascending:true}), {silenzioso:true});
      if (catErr) {
        console.warn('[scheda] catalogo non caricato, nomi snapshot mantenuti:', catErr.message);
      } else if (Array.isArray(catRows)) {
        const nomeByCodice = new Map();
        catRows.forEach(r => { if (r && r.codice) nomeByCodice.set(r.codice, r.nome); });
        ST.catalogNomeByCodice = nomeByCodice;           // riusata dagli alias nome↔codice
        const remapEx = (ex) => {
          if (!ex || !ex.codice) return;                 // no codice → tieni snapshot
          const nome = nomeByCodice.get(ex.codice);
          if (nome == null) {                            // codice non a catalogo → tieni snapshot
            console.warn('[scheda] codice non nel catalogo, nome snapshot mantenuto:', ex.codice);
            return;
          }
          if (nome !== ex.name) {
            // Il nome di prima NON si butta: è quello con cui le serie vecchie sono
            // finite in training_logs, ed è l'unico modo di ritrovarle dopo una
            // rinomina del catalogo (vedi loadLastLoggedSets, passaggio 2).
            if (!ex.nameSnapshot) ex.nameSnapshot = ex.name;
            ex.name = nome;                              // riallinea al nome attuale
          }
        };
        sessioniArr.forEach(s => {
          if (!s) return;
          if (Array.isArray(s.warmup)) s.warmup.forEach(remapEx);
          if (Array.isArray(s.exercises)) s.exercises.forEach(remapEx);
          if (s.carry_conclusivo) remapEx(s.carry_conclusivo);
          if (s.finisher && Array.isArray(s.finisher.exercises)) s.finisher.exercises.forEach(remapEx);
        });
      }
    } catch (e) {
      console.warn('[scheda] eccezione risoluzione nomi catalogo:', (e && e.message) || e);
    }

    const sessMap = {};
    const cycle = [];
    sessioniArr.forEach(s => {
      if (s && s.id) {
        sessMap[s.id] = s;
        cycle.push(s.id);
      }
    });
    if (Object.keys(sessMap).length === 0) {
      console.warn('[scheda] sessioni senza id valido, fallback hardcoded');
      return;
    }
    ST.userTrainingSessions = sessMap;
    ST.userSessionCycle = cycle;
  } catch (e) {
    console.warn('[scheda] eccezione caricamento:', (e && e.message) || e);
  }
}

// Helper di accesso UNIFICATI — usati ovunque al posto di TRAINING_SESSIONS[X].
// Fallback automatico ai hardcoded se ST.userTrainingSessions non popolato.
//
// IMPORTANTE — riferimenti hardcoded all'interno degli helper:
// dentro questi 3 helper DEVONO restare i riferimenti ORIGINALI
// (TRAINING_SESSIONS / SESSION_CYCLE), MAI sostituiti con i nomi
// degli helper stessi. Altrimenti loop infinito → stack overflow →
// pagina bianca (bug rilevato post-deploy Mossa 3, fix immediato).

function getTrainingSession(sid) {
  // Restituisce l'oggetto sessione per id, dalla scheda utente se presente,
  // altrimenti dai TRAINING_SESSIONS hardcoded. Ritorna undefined se id
  // sconosciuto in entrambi (chiamanti già gestiscono con ?. e || {}).
  if (ST.userTrainingSessions && ST.userTrainingSessions[sid]) {
    return ST.userTrainingSessions[sid];
  }
  return TRAINING_SESSIONS[sid]; // ← MAI cambiare in getTrainingSession (loop infinito)
}

function getAllTrainingSessions() {
  // Restituisce l'oggetto completo {id: session} della scheda utente
  // se popolata, altrimenti TRAINING_SESSIONS hardcoded.
  // Usato per Object.values/keys iterativi (es. findExInAllSessions).
  return ST.userTrainingSessions || TRAINING_SESSIONS;
}

function getSessionCycle() {
  // Restituisce l'array di session id in ordine dello split.
  // Fallback a SESSION_CYCLE hardcoded se la scheda non è caricata.
  return ST.userSessionCycle || SESSION_CYCLE;
}

// Opzione A (fix 30 mag) — ORDINE CANONICO della rotazione a 6 giorni (G1..G6), derivato da SESSION_DAY_NUM.
// Perché serve: la scheda generata NON contiene i recuperi (G3/G6), quindi getSessionCycle() su scheda attiva
// ritorna solo i 4 giorni di lavoro → completando un recupero indexOf=-1 → "prossimo" sbagliato (fallback a upperA).
// "I tuoi giorni" mostra comunque la rotazione 6-day di DAY_SPLIT: il calcolo di "prossimo" e del debito DEVE
// seguire QUESTA sequenza (così REC↑/G3 → UP B/G4). getSessionCycle() resta la fonte dei CONTENUTI (getTrainingSession),
// NON della rotazione.
// FASE B.1 — mappa giorno→numero ADATTIVA alla scheda attiva. Se la scheda
// caricata (ST.userSessionCycle, array reale dei sessionId) include 'upperC'
// (Upper Pump → scheda 5gg int/avanzato) usa il ciclo a 7 (SESSION_DAY_NUM_5);
// altrimenti il ciclo canonico a 6 (SESSION_DAY_NUM), invariato. Discriminante =
// la scheda REALE, NON i giorni del profilo. null/senza upperC → 6 giorni.
function _rotationDayMap() {
  const cyc = ST.userSessionCycle;
  if (Array.isArray(cyc) && cyc.includes('upperC')) return SESSION_DAY_NUM_5;
  return SESSION_DAY_NUM;
}
function getRotationCycle() {
  const map = _rotationDayMap();
  return Object.keys(map).sort((a, b) => map[a] - map[b]);
}

// Settimana del mesociclo 5+1 (1..6) derivata dallo storico completato.
// Conta i SOLI giorni di LAVORO: i recovery sono opzionali — chi non li logga
// non deve allungare il mesociclo (con /6 lo scarico arrivava dopo ~6 settimane
// reali a 4 workout/giro). rest/rest_injury già esclusi a monte dalla query di
// loadTrainingAllCompleted. Correttivo bordo DAY-AWARE: a multiplo esatto di
// workPerGiro resta sulla settimana appena chiusa solo se l'ultimo workout è
// di oggi; dal giorno dopo scatta la settimana nuova.
// Consumata da: render Progressione (badge), computeNextSetSuggestion
// (RIR 3 in scarico), vista sessione (badge SCARICO), getNextCheckpointInfo
// (guardia overdue checkpoint M2).
// opts (facoltativo, Quadro settimanale): { completed, asOf } — la stessa regola
// applicata a una data passata. `completed` sostituisce ST.trainAllCompleted
// (stessa forma: workout completati, rest esclusi, ordinati asc), `asOf`
// ('YYYY-MM-DD') fa da "oggi": si contano i soli workout fino a quel giorno e il
// correttivo di bordo guarda quel giorno. Senza opts il comportamento è identico.
// Fase 3 (13 set 2026): il cuore sta in shared/quadro.js → cycleWeekInfo, lo stesso del
// cron del Worker. Qui si passano ciclo della scheda e scarichi anticipati accettati
// (Pirsi propone → deload): dal giorno dell'accettazione la settimana in corso è la 6.
function getCycleWeekInfo(opts){
  const o = opts || {};
  return ZTQuadro.cycleWeekInfo({
    completed: o.completed || ST.trainAllCompleted || [],
    asOf: o.asOf || null,
    today: todayKey(),
    workPerGiro: ZTQuadro.workPerGiroForCycle(ST.userSessionCycle),
    deloads: _coachDeloadDates(),
  });
}
// Date (YYYY-MM-DD) degli scarichi anticipati accettati, da coach_proposals (loadCoachProposals).
function _coachDeloadDates(){ return (ST.coachDeloads || []).slice(); }

// Passo 4 — DEBITO allenamenti: derivato dallo storico (ST.trainAllCompleted, sincronizzato su tutti i device).
// NESSUNA scrittura DB, nessun campo persistito: si ricalcola ad ogni render.
// Ritorna { debt:[sid,...], target:sid } — "solo giro corrente", i recuperi non vanno mai in debito.
function computeTrainingDebt(){
  if(!ST.user || ST.user.id === 'test-user-001') return { debt: [], target: null };
  const cycle = getRotationCycle(); // ordine canonico 6 giorni (recuperi inclusi); i recuperi restano esclusi dal debito via isRecoverySid
  const len = cycle.length;
  const all = ST.trainAllCompleted || [];
  const debt = new Set();
  const isRecoverySid = (sid) => {
    const ss = getTrainingSession(sid);
    // FASE B.1 — escludi dal debito anche il riposo: 'rest' è nel ciclo a 7
    // (G7) ma saltarlo NON deve generare debito, come i recuperi attivi.
    return (ss && (ss.type === 'Recupero' || ss.type === 'Riposo'))
      || /^recovery/i.test(sid) || sid === 'rest' || sid === 'rest_injury';
  };
  let pos = -1; // indice ciclo del "fronte" raggiunto
  for(const w of all){
    if(isRecoverySid(w.session_type)) continue; // recupero trasparente alla rotazione
    const Wi = cycle.indexOf(w.session_type);
    if(Wi === -1) continue;                 // tipo non nel ciclo → ignora
    if(pos === -1){ pos = Wi; continue; }    // primo workout valido = fronte iniziale
    // Recupero del debito: questo tipo era in debito → azzeralo e avanza il fronte.
    if(debt.has(w.session_type)){ debt.delete(w.session_type); pos = Wi; continue; }
    const forward = (Wi - pos + len) % len;
    if(forward === 1 || forward === 0){
      pos = Wi;                              // sequenziale o stesso tipo ripetuto
    } else {                                 // forward >= 2 → salto in avanti
      for(let step = 1; step < forward; step++){
        const sidJ = cycle[(pos + step) % len];
        if(!isRecoverySid(sidJ)) debt.add(sidJ);
      }
      pos = Wi;
    }
  }
  let target;
  if(debt.size > 0){
    // debito più vecchio = indice ciclo più basso tra i membri
    target = [...debt].reduce((best, sid) =>
      cycle.indexOf(sid) < cycle.indexOf(best) ? sid : best);
  } else {
    target = ST.trainHomeData?.nextSession || null;
  }
  return { debt: [...debt], target };
}

// ═══════════════════════════════════════════════════════════
// TRAINING — COACH GENERATORE SCHEDE (Step 2 — 28 mag 2026)
// ═══════════════════════════════════════════════════════════
//
// Logica deterministica: l'AI è usata SOLO per una breve nota
// motivazionale in voce coach (callAI ~150 token + fallback fisso).
// Tutta la struttura (split, parametri, selezione esercizi,
// cautele, finisher) è in JS puro che incrocia regole + catalogo.
// Le cautele (limitazioni × zone_rischio) sono 100% deterministiche.
//
// Trigger: fine onboarding M1 (saveOnboarding), SOLO se usa_training=true.
// Save: tabella `schede_utente` (Supabase), riga JSON, attiva=true.
// Letta da: modulo Training (Step 3 separato — NON in scope qui).
//
// Vedi CLAUDE.md → "MODULO TRAINING — PARTE 5" per le decisioni
// complete di logica chiuse il 27 mag 2026 sera.

// ───────────────────────────────────────────────────────────
// COSTANTI (mapping + regole) — confermate 28 mag 2026
// ───────────────────────────────────────────────────────────

// Mappa esperienza M1 (4 valori) → livello catalogo (3 valori).
// 'ritorno-allenamento' → 'principiante' (cauto: onboarding futuro
// distinguerà "da quanto non ti alleni" per gestione fine).
const _TRAIN_GEN_EXPERIENCE_MAP = {
  'principiante':         'principiante',
  'intermedio':           'intermedio',
  'avanzato':             'avanzato',
  'ritorno-allenamento':  'principiante',
};

// DUP compound params (chiarimento utente 28 mag 2026): giorno Forza vs
// giorno Ipertrofia della periodizzazione DUP. Usati SOLO dagli obiettivi
// ipertrofia-like (ipertrofia/ricomposizione/dimagrimento) per intermedi e
// avanzati con split a sessioni DUPLICATE (Upper×2, Lower×2, Push×2, ...).
// Numeri fissi da regola utente:
//   Forza      → 4 serie 4-6 reps, RIR 2, rest 180s
//   Ipertrofia → 3 serie 8-12 reps, RIR 1, rest 90s (Blocco B, vedi sotto)
// Blocco B 31 mag — compound ipertrofia 3 serie (Schoenfeld dose-response: il
// grosso dello stimolo è nelle prime 3 serie, la 4ª ha resa marginale calante su
// avanzato vicino al cedimento; recupera ~8 min/seduta senza perdere esercizi).
// La FORZA resta 4 serie (accumulo di pratica sul gesto pesante).
const _DUP_COMPOUND_FORZA      = { sets:4, reps_min:4, reps_max:6,  rir:2, rest_sec:180, type:'Forza' };
const _DUP_COMPOUND_IPERTROFIA = { sets:3, reps_min:8, reps_max:12, rir:1, rest_sec:90,  type:'Ipertrofia' };

// Parametri sessione per obiettivo × esperienza (Regola B, 28 mag 2026).
// Ogni livello espone sub-set per TIPO di esercizio:
//   compound             → multiarticolari sulle sessioni a TIPO UNICO
//   compound_forza       → SOLO ipertrofia-like, intermedio/avanzato: giorno
//   compound_ipertrofia    Forza / Ipertrofia della periodizzazione DUP
//   iso                  → isolamenti a reps (serie 3, < compound)
//   iso_isometrico       → isolamenti a tempo (durationBased, reps in secondi,
//                          RIR null — la pill RIR si nasconde, logger a durata)
// - rir: null per TUTTI i principianti (decisione PARTE 5)
// - type label: 'Forza' è l'UNICO valore che cambia il comportamento a valle
//   (getRestSec + badge); 'Ipertrofia'/'Equilibrio' sono solo display.
//   Per ricomposizione/dimagrimento uniformi uso 'Ipertrofia' (DUP rule 1:
//   "ricomposizione/ipertrofia/dimagrimento → Ipertrofia"). Questo SUPERA il
//   quick-fix #7 del brief (che voleva 'Ricomposizione'): la regola DUP è più
//   recente e specifica. Sulle sessioni DUP il label è 'Forza'/'Ipertrofia'.
//   longevita/mantenimento → 'Equilibrio' ("tipo bilanciato" della DUP rule 1).
const _TRAIN_GEN_PARAMS_BY_GOAL = {
  forza_performance: {
    principiante: {
      compound:       { sets:4, reps_min:4, reps_max:6, rir:null, rest_sec:180, type:'Forza' },
      iso:            { sets:3, reps_min:8, reps_max:12, rir:null, rest_sec:90, type:'Forza' },
      iso_isometrico: { sets:3, reps_min:30, reps_max:45, rir:null, rest_sec:75, type:'Forza', durationBased:true },
    },
    intermedio: {
      compound:       { sets:4, reps_min:4, reps_max:6, rir:2, rest_sec:180, type:'Forza' },
      iso:            { sets:3, reps_min:8, reps_max:12, rir:2, rest_sec:90, type:'Forza' },
      iso_isometrico: { sets:3, reps_min:30, reps_max:45, rir:null, rest_sec:75, type:'Forza', durationBased:true },
    },
    avanzato: {
      compound:       { sets:4, reps_min:4, reps_max:6, rir:2, rest_sec:180, type:'Forza' },
      iso:            { sets:3, reps_min:8, reps_max:12, rir:2, rest_sec:90, type:'Forza' },
      iso_isometrico: { sets:3, reps_min:30, reps_max:45, rir:null, rest_sec:75, type:'Forza', durationBased:true },
    },
  },
  ipertrofia: {
    principiante: {
      compound:       { sets:3, reps_min:8, reps_max:12, rir:null, rest_sec:90, type:'Ipertrofia' },
      iso:            { sets:3, reps_min:12, reps_max:15, rir:null, rest_sec:75, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:30, reps_max:60, rir:null, rest_sec:60, type:'Ipertrofia', durationBased:true },
    },
    intermedio: {
      compound:            { sets:4, reps_min:8, reps_max:12, rir:1, rest_sec:90, type:'Ipertrofia' },
      compound_forza:      _DUP_COMPOUND_FORZA,
      compound_ipertrofia: _DUP_COMPOUND_IPERTROFIA,
      iso:            { sets:3, reps_min:12, reps_max:15, rir:1, rest_sec:75, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:30, reps_max:60, rir:null, rest_sec:60, type:'Ipertrofia', durationBased:true },
    },
    avanzato: {
      compound:            { sets:4, reps_min:8, reps_max:12, rir:1, rest_sec:90, type:'Ipertrofia' },
      compound_forza:      _DUP_COMPOUND_FORZA,
      compound_ipertrofia: _DUP_COMPOUND_IPERTROFIA,
      iso:            { sets:3, reps_min:12, reps_max:15, rir:1, rest_sec:75, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:30, reps_max:60, rir:null, rest_sec:60, type:'Ipertrofia', durationBased:true },
    },
  },
  dimagrimento: {
    principiante: {
      compound:       { sets:3, reps_min:10, reps_max:15, rir:null, rest_sec:60, type:'Ipertrofia' },
      iso:            { sets:3, reps_min:12, reps_max:15, rir:null, rest_sec:45, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:20, reps_max:40, rir:null, rest_sec:45, type:'Ipertrofia', durationBased:true },
    },
    intermedio: {
      compound:            { sets:3, reps_min:8, reps_max:12, rir:1, rest_sec:60, type:'Ipertrofia' },
      compound_forza:      _DUP_COMPOUND_FORZA,
      compound_ipertrofia: _DUP_COMPOUND_IPERTROFIA,
      iso:            { sets:3, reps_min:12, reps_max:15, rir:1, rest_sec:45, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:20, reps_max:40, rir:null, rest_sec:45, type:'Ipertrofia', durationBased:true },
    },
    avanzato: {
      compound:            { sets:4, reps_min:6, reps_max:10, rir:1, rest_sec:60, type:'Ipertrofia' },
      compound_forza:      _DUP_COMPOUND_FORZA,
      compound_ipertrofia: _DUP_COMPOUND_IPERTROFIA,
      iso:            { sets:3, reps_min:12, reps_max:15, rir:1, rest_sec:45, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:20, reps_max:40, rir:null, rest_sec:45, type:'Ipertrofia', durationBased:true },
    },
  },
  ricomposizione: {
    principiante: {
      compound:       { sets:3, reps_min:10, reps_max:15, rir:null, rest_sec:75, type:'Ipertrofia' },
      iso:            { sets:3, reps_min:12, reps_max:15, rir:null, rest_sec:75, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:20, reps_max:40, rir:null, rest_sec:60, type:'Ipertrofia', durationBased:true },
    },
    intermedio: {
      compound:            { sets:3, reps_min:8, reps_max:12, rir:1, rest_sec:75, type:'Ipertrofia' },
      compound_forza:      _DUP_COMPOUND_FORZA,
      compound_ipertrofia: _DUP_COMPOUND_IPERTROFIA,
      iso:            { sets:3, reps_min:12, reps_max:15, rir:1, rest_sec:75, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:20, reps_max:40, rir:null, rest_sec:60, type:'Ipertrofia', durationBased:true },
    },
    avanzato: {
      compound:            { sets:4, reps_min:6, reps_max:10, rir:1, rest_sec:75, type:'Ipertrofia' },
      compound_forza:      _DUP_COMPOUND_FORZA,
      compound_ipertrofia: _DUP_COMPOUND_IPERTROFIA,
      iso:            { sets:3, reps_min:12, reps_max:15, rir:1, rest_sec:75, type:'Ipertrofia' },
      iso_isometrico: { sets:3, reps_min:20, reps_max:40, rir:null, rest_sec:60, type:'Ipertrofia', durationBased:true },
    },
  },
  longevita: {
    principiante: {
      compound:       { sets:3, reps_min:6, reps_max:10, rir:null, rest_sec:90, type:'Equilibrio' },
      iso:            { sets:3, reps_min:10, reps_max:12, rir:null, rest_sec:60, type:'Equilibrio' },
      iso_isometrico: { sets:2, reps_min:20, reps_max:30, rir:null, rest_sec:45, type:'Equilibrio', durationBased:true },
    },
    intermedio: {
      compound:       { sets:3, reps_min:6, reps_max:10, rir:2, rest_sec:90, type:'Equilibrio' },
      iso:            { sets:3, reps_min:10, reps_max:12, rir:2, rest_sec:60, type:'Equilibrio' },
      iso_isometrico: { sets:2, reps_min:20, reps_max:30, rir:null, rest_sec:45, type:'Equilibrio', durationBased:true },
    },
    avanzato: {
      compound:       { sets:3, reps_min:6, reps_max:10, rir:2, rest_sec:90, type:'Equilibrio' },
      iso:            { sets:3, reps_min:10, reps_max:12, rir:2, rest_sec:60, type:'Equilibrio' },
      iso_isometrico: { sets:2, reps_min:20, reps_max:30, rir:null, rest_sec:45, type:'Equilibrio', durationBased:true },
    },
  },
  mantenimento: {
    principiante: {
      compound:       { sets:3, reps_min:6, reps_max:10, rir:null, rest_sec:90, type:'Equilibrio' },
      iso:            { sets:3, reps_min:10, reps_max:12, rir:null, rest_sec:60, type:'Equilibrio' },
      iso_isometrico: { sets:2, reps_min:20, reps_max:30, rir:null, rest_sec:45, type:'Equilibrio', durationBased:true },
    },
    intermedio: {
      compound:       { sets:3, reps_min:6, reps_max:10, rir:2, rest_sec:90, type:'Equilibrio' },
      iso:            { sets:3, reps_min:10, reps_max:12, rir:2, rest_sec:60, type:'Equilibrio' },
      iso_isometrico: { sets:2, reps_min:20, reps_max:30, rir:null, rest_sec:45, type:'Equilibrio', durationBased:true },
    },
    avanzato: {
      compound:       { sets:3, reps_min:6, reps_max:10, rir:2, rest_sec:90, type:'Equilibrio' },
      iso:            { sets:3, reps_min:10, reps_max:12, rir:2, rest_sec:60, type:'Equilibrio' },
      iso_isometrico: { sets:2, reps_min:20, reps_max:30, rir:null, rest_sec:45, type:'Equilibrio', durationBased:true },
    },
  },
};

// FASE A (31 mag/1 giu 2026) — parametri della seduta Upper Pump (5° giorno
// dello split a 5 giorni Upper/Lower). Seduta leggera: alte ripetizioni, basso
// carico, RIR 0 (vicino al cedimento ma su carichi bassi), recuperi brevi.
// NON ha compound pesanti: i pattern compound della categoria 'upper_pump' sono
// vuoti (_TRAIN_GEN_COMPOUND_PATTERNS_BY_CATEGORY) → il blocco `compound` qui
// rispecchia `iso` solo per sicurezza, non viene mai usato. Stesso stile dei
// sub-set di _TRAIN_GEN_PARAMS_BY_GOAL (compound/iso/iso_isometrico).
const _TRAIN_GEN_PUMP_PARAMS = {
  compound:       { sets:3, reps_min:15, reps_max:25, rir:0, rest_sec:50, type:'Pump' },
  iso:            { sets:3, reps_min:15, reps_max:25, rir:0, rest_sec:50, type:'Pump' },
  iso_isometrico: { sets:3, reps_min:20, reps_max:40, rir:null, rest_sec:30, type:'Pump', durationBased:true },
};

// Isolamenti OBBLIGATORI per categoria di sessione (Regola A, 28 mag 2026).
// Categoria = _trainGenGetSessionCategory(splitType, sessionType). Valori =
// gruppo_target del catalogo (vocabolario chiuso). fullbody: rotazione 1-2
// via sessionIndex. core non ha isolamenti dedicati nel catalogo → il picker
// ritorna null e logga (NON crasha): la sessione resta più corta.
// Iso obbligatori per categoria — SOLO MUSCOLARI. Il core NON è più elencato
// qui: ha una tabella propria (_TRAIN_GEN_CORE_BY_TYPE) perché dal 2 ago i due
// slot core non sono più due sottotipi della stessa natura, ma due NATURE
// diverse. La lista qui resta muscolare, con rotazione 1-2 per fullbody.
const _TRAIN_GEN_ISO_OBBLIGATORI_BY_TYPE = {
  upper_forza:      ['deltoidi posteriori'],
  upper_ipertrofia: ['deltoidi laterali', 'bicipiti', 'tricipiti'],
  // FASE A — Upper Pump: 5 muscolari + 2 core = 7 esercizi. L'ossatura (compresi
  // i 2 core) NON si taglia mai anche se supera il softMax=6. I dorsali NON sono
  // obbligatori → bonus solo se resta spazio.
  upper_pump:       ['deltoidi laterali', 'deltoidi posteriori', 'bicipiti', 'tricipiti', 'petto'],
  lower_forza:      ['glutei'],
  lower_ipertrofia: ['ischiocrurali', 'polpacci'],
  fullbody:         ['deltoidi posteriori', 'polpacci'],
  push:             ['deltoidi laterali', 'tricipiti'],
  pull:             ['deltoidi posteriori', 'bicipiti'],
  legs:             ['ischiocrurali', 'polpacci'],
};

// CORE — DUE SLOT FISSI di NATURA DIVERSA (2 ago 2026, sostituisce la coppia
// anti-estensione + anti-rotazione del 6 lug).
//
// Il core ha una funzione PROTETTIVA (resistere al movimento) e una PRODUTTIVA
// (generarlo). La struttura precedente allenava solo la prima. Ora ogni sessione
// riceve una TENUTA e un DINAMICO:
//   slot 1 · tenuta   → 'core anti-estensione' | 'core anti-rotazione'
//   slot 2 · dinamico → 'core flessione'       | 'core rotazione'
//
// Accoppiamento per PIANO di movimento, coerente con la scelta già in essere:
//   Upper/Push/Pull → piano trasverso  → anti-rotazione + rotazione
//   Lower/Legs      → piano sagittale  → anti-estensione + flessione
// fullbody: alterna per sessione dentro ciascuna natura (vedi BLOCCO 6).
const _TRAIN_GEN_CORE_BY_TYPE = {
  upper_forza:      { tenuta: 'core anti-rotazione',   dinamico: 'core rotazione' },
  upper_ipertrofia: { tenuta: 'core anti-rotazione',   dinamico: 'core rotazione' },
  upper_pump:       { tenuta: 'core anti-rotazione',   dinamico: 'core rotazione' },
  push:             { tenuta: 'core anti-rotazione',   dinamico: 'core rotazione' },
  pull:             { tenuta: 'core anti-rotazione',   dinamico: 'core rotazione' },
  lower_forza:      { tenuta: 'core anti-estensione',  dinamico: 'core flessione' },
  lower_ipertrofia: { tenuta: 'core anti-estensione',  dinamico: 'core flessione' },
  legs:             { tenuta: 'core anti-estensione',  dinamico: 'core flessione' },
};

// Fallback DENTRO la stessa natura. Se la funzione primaria non ha candidati nel
// pool dell'utente si ripiega sull'altra della STESSA natura; mai da una natura
// all'altra. Uno slot vuoto è preferibile a due esercizi della stessa natura:
// raddoppiare la tenuta (o il dinamico) annulla il senso della coppia.
const _TRAIN_GEN_CORE_FALLBACK = {
  'core anti-rotazione':  'core anti-estensione',
  'core anti-estensione': 'core anti-rotazione',
  'core rotazione':       'core flessione',
  'core flessione':       'core rotazione',
};
const _TRAIN_GEN_CORE_TENUTE   = ['core anti-estensione', 'core anti-rotazione'];
const _TRAIN_GEN_CORE_DINAMICI = ['core flessione', 'core rotazione'];

// BLOCCO C (31 mag) — copertura pattern compound → gruppi muscolari allenati come
// SECONDARI. Serve a declassare gli iso obbligatori già coperti dai compound scelti:
// un iso muscolare è obbligatorio SOLO se il suo gruppo NON è coperto. Chiavi =
// pattern motori normalizzati con _normPattern (lowercase+trim, SPAZI come nel
// catalogo e in _TRAIN_GEN_COMPOUND_PATTERNS_BY_CATEGORY). Valori = gruppo_target
// del catalogo (vocabolario chiuso). NB: 'lombari' NON è un gruppo_target del
// catalogo → non corrisponde mai a un iso obbligatorio (effetto nullo sul filtro,
// resta come documentazione del lavoro reale del pattern). Il core NON è qui:
// resta sempre slot fisso, mai declassato.
const _TRAIN_GEN_COMPOUND_COVERAGE = {
  'spinta orizzontale': ['petto', 'tricipiti', 'deltoidi anteriori'],
  // spinta verticale: forte sui deltoidi ANTERIORI, marginale sui LATERALI →
  // i laterali NON sono coperti (le alzate laterali restano iso d'elezione).
  'spinta verticale':   ['deltoidi anteriori', 'tricipiti'],
  // tirata orizzontale: tocca i deltoidi posteriori ma non a sufficienza →
  // restano iso mirato obbligatorio (no copertura).
  'tirata orizzontale': ['dorsali', 'bicipiti'],
  'tirata verticale':   ['dorsali', 'bicipiti'],
  'dominante ginocchia':['quadricipiti', 'glutei'],
  'dominante anca':     ['glutei', 'ischiocrurali', 'lombari'],
};

// Criticità isolamenti per il TAGLIO PER TEMPO (Regola A): peso più BASSO =
// MENO critico = rimosso PRIMA. Vincoli documentati dall'utente:
//   deltoidi laterali < bicipiti = tricipiti  (Upper Ipertrofia)
//   polpacci < ischiocrurali                  (Lower Ipertrofia)
// Gli iso bonus (non obbligatori) vengono rimossi PRIMA di qualsiasi
// obbligatorio; i compound primari NON si rimuovono MAI.
const _TRAIN_GEN_ISO_CRITICALITY = {
  // ENTRAMBI i core = MAI sacrificabili (6 lug): ogni sessione ha 2 core fissi
  // di sottotipo diverso, entrambi nell'ossatura sacra (mai tagliati dal softMax).
  'core anti-estensione': 5,                                  // protezione lombare
  'core anti-rotazione': 5,                                   // stabilità busto — pari criticità
  'core flessione': 5, 'core rotazione': 5,                   // dinamici — pari criticità (2 ago)
  'bicipiti': 3, 'tricipiti': 3,
  'deltoidi posteriori': 2, 'glutei': 2, 'ischiocrurali': 2,
  'deltoidi laterali': 1, 'polpacci': 1, 'avambracci': 1, 'trapezi': 1,
};

// Bonus coerenti per MACRO-categoria (fix 29 mag). Il riempimento bonus NON
// deve infilare esercizi di un'altra zona (bug reale: bicipiti/tricipiti su una
// Lower). gruppi = gruppo_target (vocabolario chiuso catalogo) ammessi per la
// macro; compound = pattern motori ammessi per i bonus compound complementari.
// Lower/Legs → solo zona gambe; Upper/Push/Pull → solo zona alta;
// fullbody → unione delle due (vedi calcolo macro nel blocco bonus).
const _TRAIN_GEN_BONUS_BY_MACRO = {
  lower: {
    // FASE 1 (catalogo 123): +'quadricipiti' (EX097 Leg extension, uso=principale).
    // Già coperto dai compound dominante-ginocchia → ammesso SOLO come bonus, MAI obbligatorio.
    gruppi:   ['glutei', 'ischiocrurali', 'polpacci', 'quadricipiti'],
    compound: ['dominante ginocchia', 'dominante anca'],
  },
  upper: {
    // FASE 1 (catalogo 123): +'petto'/'dorsali'/'deltoidi anteriori' (EX098 Croci,
    // EX099 Pull-over, EX100 Alzate frontali). Già coperti dai compound spinta/tirata
    // → ammessi SOLO come bonus, MAI obbligatori.
    // NB: i bonus iso pescano da poolPrincipali. EX098 Croci ha uso='principale;finisher'
    // (entra). EX099 Pull-over ed EX100 Alzate frontali hanno uso='finisher' nel catalogo
    // (NON 'principale') → NON entreranno come bonus finché il catalogo non li marca anche
    // 'principale'. È un limite di DATO (catalogo), non di codice — segnalato nel resoconto.
    gruppi:   ['deltoidi laterali', 'deltoidi posteriori', 'bicipiti', 'tricipiti', 'trapezi', 'avambracci', 'petto', 'dorsali', 'deltoidi anteriori'],
    compound: ['spinta orizzontale', 'spinta verticale', 'tirata orizzontale', 'tirata verticale'],
  },
};

// Preferenza attrezzo per tipo esercizio e ambiente.
// Il generatore scorre la lista e prende il PRIMO che l'utente possiede.
// 'compound' = multiarticolari pesanti; 'iso' = isolamenti e accessori.
const _TRAIN_GEN_EQ_PRIORITY = {
  casa: {
    compound: ['sbarra', 'elastico', 'corpo_libero', 'banda'],
    iso:      ['manubri', 'cavigliera', 'elastico', 'banda', 'corpo_libero'],
  },
  palestra: {
    compound: ['bilanciere', 'manubri', 'cavo', 'elastico'],
    iso:      ['manubri', 'cavo', 'elastico', 'bilanciere'],
  },
  aperto: {
    compound: ['sbarra', 'elastico', 'corpo_libero', 'banda'],
    iso:      ['elastico', 'banda', 'corpo_libero'],
  },
};

// Sceglie UN attrezzo specifico per l'esercizio.
// Surrogato → usa surrogato_attrezzo (già singolo).
// Nativo → primo attrezzo nella lista priorità per ambiente/tipo che l'utente possiede.
// Fallback: primo attrezzo nativo del catalogo.
function _trainGenPickEq(cat, isSurrogato, tipoAllen, attrezzaturaSet, isIso) {
  if (isSurrogato && cat.surrogato_attrezzo) {
    return String(cat.surrogato_attrezzo).trim();
  }
  const _norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_');
  const attrezziNativi = String(cat.attrezzo || '').split(';').map(s => _norm(s)).filter(Boolean);
  const tipoNorm = _norm(tipoAllen);
  const envKey = (tipoNorm === 'palestra') ? 'palestra' : (tipoNorm === 'aperto' ? 'aperto' : 'casa');
  const catKey = isIso ? 'iso' : 'compound';
  const priorita = (_TRAIN_GEN_EQ_PRIORITY[envKey] || _TRAIN_GEN_EQ_PRIORITY.casa)[catKey] || [];
  for (const preferred of priorita) {
    if (attrezziNativi.includes(preferred) && attrezzaturaSet.has(preferred)) {
      const originalMatch = String(cat.attrezzo || '').split(';')
        .map(s => s.trim()).find(s => _norm(s) === preferred);
      return originalMatch || preferred;
    }
  }
  const firstNative = String(cat.attrezzo || '').split(';').map(s => s.trim()).filter(Boolean)[0];
  return firstNative || String(cat.attrezzo || '').trim();
}

// Obiettivi "ipertrofia-like" → eleggibili alla periodizzazione DUP
// (Forza/Ipertrofia alternati) per intermedio/avanzato con split duplicato.
const _TRAIN_GEN_DUP_OBIETTIVI = new Set(['ipertrofia', 'ricomposizione', 'dimagrimento']);

// Tetto esercizi/sessione (count). NON dipende dai minuti (la scelta "durata
// in minuti" è stata sostituita dal volume Essenziale/Completo, 29 mag).
// Limita SOLO il riempimento BONUS in modalità "Completo": l'ossatura
// (compound + iso obbligatori + core fisso) NON viene MAI tagliata, anche se
// la supera (es. Upper Ipertrofia 4+3+1=8 con softMax 6 resta 8, 0 bonus).
// Abbassato 9→6 (29 mag): 9 produceva sessioni troppo lunghe.
const _TRAIN_GEN_SOFT_MAX = 6;

// Esercizi UNILATERALI (un lato per volta): le reps prescritte si intendono
// "per lato", così il volume non è ambiguo. La prescrizione (scheda) e il box
// PROSSIMA mostrano " per lato". (29 mag 2026)
//   EX015 Affondi · EX033 Step-up al ritmo · EX035 Single-leg glute bridge ·
//   EX038 Affondo camminato · EX039 Affondo posteriore · EX041 Step-up alto su
//   panca · EX047 Bulgarian split squat · EX066 Calf raise unilaterale.
// NB: il box PROSSIMA consuma parseRepsRange().perLato (vedi computeNextSetSuggestion),
// quindi anche le righe già "per lato" del fallback TRAINING_SESSIONS sono coperte.
const _TRAIN_GEN_UNILATERAL = ['EX015','EX033','EX035','EX038','EX039','EX041','EX047','EX066','EX062','EX067','EX068'];

// Split sessioni per giorni × esperienza (PARTE 5).
// I "nomi visibili" (Full Body A/B, Upper A/B, ...) li calcola
// runtime _trainGenMapToSession aggiungendo lettere progressive.
const _TRAIN_GEN_SPLIT_BY_DAYS = {
  2: {
    principiante: ['fullbody','fullbody'],
    intermedio:   ['fullbody','fullbody'],
    avanzato:     ['fullbody','fullbody'],
  },
  3: {
    principiante: ['fullbody','fullbody','fullbody'],
    intermedio:   ['upper','lower','fullbody'],
    avanzato:     ['upper','lower','fullbody'],
  },
  4: {
    principiante: ['upper','lower','upper','lower'],
    intermedio:   ['upper','lower','upper','lower'],
    avanzato:     ['upper','lower','upper','lower'],
  },
  5: {
    // FASE A (31 mag/1 giu 2026) — split 5gg = Upper/Lower per int/avanzato,
    // con la TERZA upper = Upper Pump (vedi _trainGenResolveSessionType: la
    // 3ª upper, occurrenceIdx===2, esce 'Pump' invece di Forza/Ipertrofia).
    // Sequenza: Upper Forza · Lower Forza · Upper Iper · Lower Iper · Upper Pump.
    // Principiante NON ha la periodizzazione DUP → resta sullo split PPL.
    principiante: ['push','pull','legs','upper','lower'],
    intermedio:   ['upper','lower','upper','lower','upper'],
    avanzato:     ['upper','lower','upper','lower','upper'],
  },
};

// Pattern COMPOUND obbligatori per CATEGORIA sessione (Regola A fix, 29 mag).
// Categoria = _trainGenGetSessionCategory(splitType, resolvedType). Lista
// PIATTA di pattern (ognuno = 1 esercizio compound da pescare). Risolta in
// BLOCCO 6 dopo aver calcolato la categoria DUP della sessione.
//
// Differenze chiave vs la vecchia _TRAIN_GEN_PATTERN_REQUIREMENTS:
//   - 'core' RIMOSSO dai compound di Lower/Legs: Plank/Dead bug NON sono più
//     uno slot compound (sarebbero usciti con parametri pesanti 4×4-6 RIR2).
//     Il core arriva ora come iso BONUS con parametri iso_isometrico (Fix 1/3).
//   - Lower/Legs ha un TERZO compound = secondo 'dominante ginocchia'
//     (unilaterale distinto dal primo, garantito da usedSoFar in pickByPattern).
//   - Push/Pull hanno un terzo compound ripetendo il pattern orizzontale.
// VALORI CANONICI: vocabolario catalogo Google Sheet — 'dominante ginocchia'
// al PLURALE (il foglio è la fonte di verità; il brief usava il singolare,
// qui corretto al plurale reale del catalogo).
const _TRAIN_GEN_COMPOUND_PATTERNS_BY_CATEGORY = {
  upper_forza:      ['spinta orizzontale', 'spinta verticale', 'tirata orizzontale', 'tirata verticale'],
  upper_ipertrofia: ['spinta orizzontale', 'spinta verticale', 'tirata orizzontale', 'tirata verticale'],
  upper_pump:       [], // FASE A — la Pump non ha compound pesanti (è il suo senso): solo isolamenti ad alte reps

  lower_forza:      ['dominante ginocchia', 'dominante anca', 'dominante ginocchia'],
  lower_ipertrofia: ['dominante ginocchia', 'dominante anca', 'dominante ginocchia'],
  fullbody:         ['spinta orizzontale', 'tirata orizzontale', 'dominante ginocchia', 'dominante anca'],
  push:             ['spinta orizzontale', 'spinta verticale', 'spinta orizzontale'],
  pull:             ['tirata orizzontale', 'tirata verticale', 'tirata orizzontale'],
  legs:             ['dominante ginocchia', 'dominante anca', 'dominante ginocchia'],
};

// Budget tempo per dimensionare numero esercizi a sessione.
// PARTE 5: orientativo 2-4 a 30min, 3-5 a 45min, 4-6 a 60min
// (Forza meno per recuperi lunghi).
// Formula in _trainGenComputeMaxExercises:
//   tempo_disponibile = durata_min*60 - warmup - (finisher?:0) - buffer
//   tempo_per_esercizio = sets * (set_execution + rest_sec)
//   maxEx = clamp(floor(tempo_disponibile / tempo_per_esercizio),
//                 min_exercises, max_exercises)
const _TRAIN_GEN_TIME_BUDGET = {
  set_execution_sec: 30,            // tempo medio esecuzione UNA serie
  warmup_sec: 300,                  // 5 min blocco attivazione (già esistente)
  finisher_sec: 300,                // 5 min tabata se obiettivo lo richiede
  buffer_sec: 60,                   // margine transizioni tra esercizi
  min_exercises_per_session: 2,
  max_exercises_per_session: 6,
};

// Fallback voce coach se callAI fallisce nella nota motivazionale.
// Stesso pattern del postino F.1 (_PIANOV4_POSTINO_FALLBACK_REASONING):
// prima persona, registro dell'esempio di tono del prompt B, no termini
// tecnici, no preamboli, nessuna chiusura motivazionale, max 2 frasi.
const _TRAIN_GEN_FALLBACK_REASONING =
  "Scheda nuova, esercizi nuovi: le prime sessioni ti sembreranno pesanti, ed è normale. " +
  "Al check di fine blocco vediamo cosa è cambiato.";

// Normalizzazione tollerante per pattern catalogo: lowercase + trim.
// I valori canonici interni del generatore coincidono ora con quelli
// del catalogo Google Sheet (parole intere con spazi, es. 'spinta
// orizzontale', 'dominante ginocchia' plurale, 'mobilita' senza accento).
// Decisione 28 mag 2026 (Opzione 3 utente): il foglio è la fonte di
// verità del vocabolario pattern; il codice si è adeguato. Questo helper
// assorbe piccole differenze di maiuscole/spazi accidentali senza
// richiedere migrazione Sheet futura.
const _normPattern = (s) => String(s || '').toLowerCase().trim();

// Attrezzi che consentono progressione del carico (usati da FIX 2 per
// rilevare esercizi "corpo libero puro" in sessioni Forza).
const _ATTREZZI_CON_CARICO = new Set([
  'elastico', 'manubri', 'bilanciere', 'kettlebell',
  'maniglie', 'corda doppia', 'barra modulare',
]);

// ───────────────────────────────────────────────────────────
// FUNZIONE PRINCIPALE
// ───────────────────────────────────────────────────────────

async function generateTrainingProgram({ source = 'onboarding', force = false, dryRun = false, giorniOverride = null } = {}) {
  // Try/catch globale: qualunque errore → log + return null.
  // NON deve mai bloccare il flusso chiamante (onboarding deve completare).
  //
  // Parametri opzionali (Step 3.16 diagnostica):
  //   force=true  → bypass guard "test mode" + "dati training incompleti"
  //                 (usato da ztTestGeneraScheda / ztSchedaWhy / ?schedaGen=1).
  //                 Default attivi: utente loggato, profilo presente,
  //                 usa_training non-false, obiettivo presente, catalogo OK.
  //   dryRun=true → skip BLOCCO 12 (no callAI) + skip BLOCCO 14 (no DB write).
  //                 Usato da ztSchedaWhy per ispezione senza side-effect.
  try {

    // BLOCCO 1 — GUARD INIZIALI
    if (!ST.user || !ST.user.id) {
      return null;
    }
    if (ST.user.id === 'test-user-001') {
      if (force) {
        console.warn('[train-gen][force] bypass test mode guard (force=true)');
      } else {
        return null;
      }
    }
    if (!ST.profile || ST.profile.usa_training === false) {
      return null;
    }

    // BLOCCO 2 — LETTURA DATI INPUT
    // Fonte primaria: ST.profile (sempre disponibile dopo upsert).
    // Per esperienza/limitazioni:
    //   - source='onboarding' → leggo da ST.m1Data (fresco in memoria,
    //     niente parse di note_salute necessario)
    //   - source futuri (post-M2) → useranno _trainGenParseEsperienzaFromNote
    //     (TODO Step 3.x); per ora fallback conservativo a 'principiante'
    const profile = ST.profile;

    // Obiettivo: primo valore del CSV (legacy) + migrazione
    // (perdita_peso → dimagrimento, massa_muscolare → ipertrofia)
    let obiettivo = null;
    if (profile.obiettivo) {
      const raw = String(profile.obiettivo).split(',')[0].trim();
      obiettivo = (typeof migrateObiettivo === 'function') ? migrateObiettivo(raw) : raw;
    }
    if (!obiettivo) {
      console.warn('[train-gen] skip: obiettivo mancante nel profilo');
      return null;
    }

    // Esperienza + limitazioni
    let esperienzaRaw = null;
    let limitazioni = [];
    let altreLimitazioni = '';
    if (source === 'onboarding' && ST.m1Data) {
      // Onboarding: m1Data fresco in memoria (path principale)
      esperienzaRaw = ST.m1Data.esperienza || null;
      limitazioni = Array.isArray(ST.m1Data.limitazioni)
        ? ST.m1Data.limitazioni.filter(x => x !== 'altro')
        : [];
      altreLimitazioni = (ST.m1Data.altre_limitazioni || '').trim();
    } else {
      // Source non-onboarding (post-M2, manual-test via ztTestGeneraScheda,
      // ?schedaGen=1 URL, blocchi N+1 futuri): parsa note_salute del profilo
      // per ricavare esperienza + limitazioni. Fallback principiante SOLO
      // se il parser non trova il segmento "Esperienza:".
      const parsed = _trainGenParseEsperienzaFromNote(profile.note_salute);
      esperienzaRaw = parsed.esperienza;
      limitazioni = parsed.limitazioni;
    }
    if (!esperienzaRaw) {
      esperienzaRaw = 'principiante';
      console.warn('[train-gen] esperienza mancante in m1Data, fallback principiante');
    }
    const livello = _TRAIN_GEN_EXPERIENCE_MAP[esperienzaRaw] || 'principiante';

    // Resto profilo training (let perché possono essere riassegnati a default
    // se force=true bypassa il guard "dati incompleti")
    let tipoAllen     = profile.tipo_allenamento || null;
    let attrezzatura  = Array.isArray(profile.attrezzatura) ? profile.attrezzatura.slice() : [];
    let giorni        = profile.giorni_allenamento || null;
    // FASE A — override giorni SOLO in dry-run diagnostico (ztSchedaWhy({giorni:N})):
    // permette di simulare uno split diverso senza toccare ST.profile né il DB.
    // Variabile LOCALE: non viene mai scritta sul profilo/Supabase.
    if (giorniOverride != null) {
      giorni = Number(giorniOverride);
    }
    // Volume sessione (sostituisce durata in minuti). Fallback 'completo' →
    // copre profili pre-esistenti senza la colonna e ogni valore inatteso.
    const volume      = (profile.volume_sessione === 'essenziale') ? 'essenziale' : 'completo';
    // durata NON è più necessaria per generare: il guard chiede solo dove+giorni.
    if (!tipoAllen || !giorni) {
      if (force) {
        console.warn('[train-gen][force] dati training incompleti, uso default casa/3gg:', { tipoAllen, giorni });
        tipoAllen = tipoAllen || 'casa';
        giorni    = giorni    || 3;
        if (attrezzatura.length === 0) attrezzatura = ['elastico','corpo_libero'];
      } else {
        console.warn('[train-gen] dati training incompleti:', { tipoAllen, giorni });
        return null;
      }
    }

    const inputData = {
      source, obiettivo, esperienzaRaw, livello,
      limitazioni, altreLimitazioni,
      tipoAllen, attrezzatura, giorni, volume,
      sex: profile.sex, age: profile.age, weight_kg: profile.weight_kg,
    };

    // ROTAZIONE VARIETÀ A OGNI RIGENERAZIONE (6 lug, sostituisce il criterio
    // calendario-based per-mesociclo del commit 34f4d6f — rimosso per evitare
    // doppio offset). Il picking è deterministico: a parità di profilo pesca
    // sempre i primi esercizi in ordine di codice → il catalogo ampliato non
    // viene sfruttato. Soluzione: un OFFSET di rotazione = CONTATORE DI
    // RIGENERAZIONI, sommato al round-robin per-tipo (occurrenceIdx) dentro i
    // picker (via il loro sessionIndex). Cambia a OGNI save/rigenerazione, così
    // ogni nuova scheda pesca varianti diverse dallo stesso pool (stesso
    // pattern/gruppo_target → continuità di stimolo). L'utente rigenera quando
    // cambia mesociclo, quindi copre di fatto anche la progressione temporale.
    //
    // Il contatore = numero di righe schede_utente GIÀ esistenti per l'utente
    // (0-based). Il save (_trainGenSaveScheda) usa lo STESSO conteggio per
    // blocco_n (= count+1) e INSERISCE una nuova riga a ogni rigenerazione (mai
    // UPDATE/DELETE → il count cresce monotòno). Quindi:
    //   - onboarding / prima scheda → count 0 → rigenIdx 0 (baseline, no rotazione)
    //   - ogni rigenerazione successiva → count+1 → offset diverso → scheda diversa
    //   - due generazioni SENZA save nel mezzo (es. dryRun ztSchedaWhy) → stesso
    //     count → stesso rigenIdx → risultato IDENTICO (determinismo per debug).
    // Errore/latenza query → rigenIdx 0 (fallback sicuro, comportamento storico).
    // NB: NON tocca la progressione carichi (schedaGen/DUP): cambia solo QUALI
    // esercizi entrano, non la storia di progressione già salvata.
    let rigenIdx = 0;
    try {
      const { count, error: rigenErr } = await supa
        .from('schede_utente')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ST.user.id);
      if (!rigenErr && Number.isFinite(count)) {
        rigenIdx = count || 0;
      } else if (rigenErr) {
        console.warn('[train-gen] rotazione: count schede_utente fallito, rigenIdx=0 →', rigenErr.message);
      }
    } catch (e) {
      console.warn('[train-gen] rotazione: count schede_utente eccezione, rigenIdx=0 →', (e && e.message) || e);
    }
    if (typeof window !== 'undefined' && window._trainGenDebug) {
      console.log(`[train-gen] rotazione per rigenerazione: rigenIdx=${rigenIdx} (source=${source})`);
    }

    // BLOCCO 3 — CARICAMENTO CATALOGO
    // SELECT * FROM esercizi_catalog (RLS SELECT pubblica, no .eq user_id).
    // Map<codice, esercizio> per lookup O(1) (serve a validazione finale
    // + risoluzione "alternativa" nelle cautele).
    let catalog = [];
    try {
      const { data, error } = await dbqAll('leggere il catalogo esercizi', () => supa
        .from('esercizi_catalog').select('*').order('codice', {ascending:true}), {silenzioso:true});
      if (error) {
        console.warn('[train-gen] errore caricamento catalogo:', error.message);
        return null;
      }
      catalog = data || [];
      // Pulizia automatica testi (accenti, "anche:", maiuscola) — una volta sola
      const _txtFields = ['adattamento','nota_sicurezza','setup','esecuzione','errori','nota_surrogato'];
      catalog.forEach(ex => {
        _txtFields.forEach(f => { if(ex[f]) ex[f] = _cleanCatalogText(ex[f]); });
      });
    } catch (e) {
      console.warn('[train-gen] eccezione caricamento catalogo:', e);
      return null;
    }
    if (catalog.length === 0) {
      console.warn('[train-gen] catalogo esercizi vuoto');
      return null;
    }
    const catalogMap = new Map();
    catalog.forEach(ex => { if (ex.codice) catalogMap.set(ex.codice, ex); });

    // BLOCCO 4 — DETERMINAZIONE PARAMETRI SESSIONE (Regola B + DUP, 28 mag)
    // I parametri NON sono più unici per scheda: ogni sessione risolve il
    // proprio TIPO (Forza/Ipertrofia/uniforme) via DUP, e da lì i sub-set
    // compound/iso/iso_isometrico. Qui calcolo solo split + pattern + finisher
    // + conteggio occorrenze per tipo (serve alla DUP e alle lettere A/B).
    const paramsByObj = _TRAIN_GEN_PARAMS_BY_GOAL[obiettivo];
    if (!paramsByObj) {
      console.warn('[train-gen] obiettivo non riconosciuto:', obiettivo);
      return null;
    }
    if (!(paramsByObj[livello] || paramsByObj['principiante'])) {
      console.warn('[train-gen] params livello mancanti:', obiettivo, livello);
      return null;
    }

    const splitByDays = _TRAIN_GEN_SPLIT_BY_DAYS[giorni];
    if (!splitByDays) {
      console.warn('[train-gen] giorni non riconosciuti:', giorni);
      return null;
    }
    const splitArray = splitByDays[livello] || splitByDays['principiante'];

    const addFinisher = (obiettivo === 'dimagrimento' || obiettivo === 'ricomposizione');

    // I pattern compound sono ora risolti PER CATEGORIA (DUP) in BLOCCO 6
    // via _TRAIN_GEN_COMPOUND_PATTERNS_BY_CATEGORY (non più pre-compilati
    // per splitType: la categoria upper_forza/upper_ipertrofia dipende dal
    // tipo risolto della singola sessione).

    // Conteggio occorrenze per tipo split (Upper×2, Lower×2, ...) → guida DUP.
    const splitTypeCount = {};
    splitArray.forEach(t => { splitTypeCount[t] = (splitTypeCount[t] || 0) + 1; });

    const sessionMeta = {
      splitArray, addFinisher, splitTypeCount, volume,
      softMaxPerSession: _TRAIN_GEN_SOFT_MAX,
    };


    // BLOCCO 5 — FILTRI BASE SUL CATALOGO
    // poolPrincipali = esercizi per le sessioni standard
    // poolFinisher   = esercizi per il tabata di coda (solo dimagrimento/ricomp)
    // Pool di recupero (uso='recupero') ignorato in questa fase: l'onboarding
    // M1 non chiede ancora "giorni di recupero attivo" — verrà aggiunto in
    // un round futuro insieme a un nuovo step M1.
    const pools = _trainGenFilterPool(catalog, { tipoAllen, attrezzatura, livello });
    const attrezzaturaSet = pools.attrezzaturaSet || new Set();
    // Codici ammissibili per l'utente (unione dei pool già filtrati per
    // luogo/attrezzo/livello): usato da _trainGenApplyCautions per validare
    // le SOSTITUZIONI — un'alternativa fuori da questo Set non entra in scheda.
    const ammissibiliSet = new Set(
      [
        ...(pools.poolPrincipali || []),
        ...(pools.poolFinisher || []),
        ...(pools.poolFinisherTabata || []),
        ...(pools.poolRiscaldamento || []),
        ...(pools.poolCarry || []),
      ].map(ex => ex.codice).filter(Boolean)
    );
    if (pools.poolPrincipali.length === 0) {
      console.warn('[train-gen] pool principali vuoto dopo filtri:', { tipoAllen, attrezzatura, livello });
      return null;
    }

    // ?schedaDebug=1 — BASELINE DEI POOL, in forma copiabile.
    //
    // Sono i sei numeri di riferimento del generatore. Vanno rimisurati dopo ogni
    // sync del Sheet e dopo ogni modifica ai filtri: se divergono senza che nessuno
    // abbia toccato niente, qualcosa nei filtri è cambiato [L17].
    // Solo l'app sa calcolarli — i filtri luogo/attrezzo/livello vivono qui — quindi
    // stato.py non può farlo e li prende da questa stampa.
    if (typeof window !== 'undefined' && window._trainGenDebug) {
      // Il core si conta in PESCABILI, non in righe ammesse: una riga pattern=core
      // con gruppo_target vuoto passa i filtri e non può essere scelta da nessuno
      // slot, perché gli slot pescano per funzione [L16]. Se i due numeri divergono
      // c'è una riga nuova da classificare.
      const funzioniCore = new Set();
      Object.values(_TRAIN_GEN_CORE_BY_TYPE).forEach(c => {
        funzioniCore.add(c.tenuta); funzioniCore.add(c.dinamico);
      });
      const isCore = ex => String(ex.pattern || '').trim().toLowerCase() === 'core';
      const coreAmmessi  = pools.poolPrincipali.filter(isCore);
      const corePescabili = coreAmmessi.filter(ex => funzioniCore.has(String(ex.gruppo_target || '').trim()));

      const b = {
        poolPrincipali:     pools.poolPrincipali.length,
        poolFinisher:       (pools.poolFinisher || []).length,
        poolRiscaldamento:  (pools.poolRiscaldamento || []).length,
        corePescabili:      corePescabili.length,
        coreAmmessi:        coreAmmessi.length,
        poolFinisherTabata: (pools.poolFinisherTabata || []).length,
        poolCarry:          (pools.poolCarry || []).length,
      };

      console.log('[train-gen] ═══ BASELINE POOL ═══');
      console.log(`  profilo: ${tipoAllen} · ${livello} · catalogo ${catalog.length} righe`);
      console.log(`  attrezzatura: ${Array.from(attrezzaturaSet).sort().join(', ') || '(nessuna)'}`);
      if ((pools.attrezziInerti || []).length) {
        console.log(`  ⚠️ attrezzi dichiarati che non aprono nessun esercizio: ${pools.attrezziInerti.join(', ')}`);
      }
      // Riga copiabile: è questa che si incolla in docs/CANTIERI.md → Storico baseline.
      console.log(
        `  poolPrincipali ${b.poolPrincipali} · poolFinisher ${b.poolFinisher} · ` +
        `poolRiscaldamento ${b.poolRiscaldamento} · core ${b.corePescabili} pescabili su ${b.coreAmmessi} ammessi · ` +
        `poolFinisherTabata ${b.poolFinisherTabata} · poolCarry ${b.poolCarry}`
      );
      if (b.corePescabili !== b.coreAmmessi) {
        const senzaFunzione = coreAmmessi.filter(ex => !funzioniCore.has(String(ex.gruppo_target || '').trim()));
        console.warn('[train-gen] righe core che nessuno slot può pescare (gruppo_target da classificare):',
                     senzaFunzione.map(ex => `${ex.codice} ${ex.nome} → "${ex.gruppo_target || ''}"`));
      }
      // A disposizione per copia/incolla o per stato.py, senza dover rileggere il log.
      window._ztBaselinePool = Object.assign({}, b, {
        quando: new Date().toISOString(),
        catalogoRighe: catalog.length, tipoAllen, livello,
      });
      console.log('[train-gen] anche in window._ztBaselinePool ═══');
    }

    // BLOCCO 6 — SELEZIONE ESERCIZI PER SESSIONE (DUP + Regola A, 28 mag)
    // Per OGNI sessione dello split:
    //   0) risolvi TIPO (DUP) + parametri + categoria iso
    //   1) COMPOUND: 1 esercizio per ogni pattern obbligatorio (SEMPRE,
    //      irrinunciabili — mai tagliati per tempo)
    //   2) ISO OBBLIGATORI per categoria (Regola A): pesca per gruppo_target,
    //      ordinati per criticità DESC; TAGLIO per tempo = soft-max per durata
    //      (compound + obbligatori ≤ softMax) → i meno critici cadono per primi
    //   3) ISO BONUS: riempi fino al target tempo-based (modesto) SE c'è ancora
    //      tempo reale stimato (gate secondi). I bonus cadono PRIMA di tutto.
    //   4) finisher Tabata (BLOCCO 9, invariato)
    //
    // occurrenceIdx = indice 0-based della sessione DENTRO il suo tipo split
    //   (Upper A→0, Upper B→1). Guida DUP (Forza/Ipertrofia) e round-robin.
    const typeProgressivoForPick = {};
    splitArray.forEach(t => { typeProgressivoForPick[t] = 0; });

    // CARRY CONCLUSIVO (FASE 2): assegna 1-2 carry a settimana, NON in ogni
    // sessione, distribuiti uniformemente sullo split, a rotazione (farmer walk
    // / suitcase carry). Campo SEPARATO dal Tabata. Decisione cross-sessione →
    // calcolata QUI (prima della map) per scegliere quali sessioni lo ricevono.
    //   carryTotal = 1 se ≤3 sessioni, 2 se ≥4 (brief: "1-2 volte a settimana").
    //   distribuzione = indici sessione equispaziati (es. 4 gg → sessioni 0 e 2).
    //   rotazione = poolCarry ordinato per codice (EX088 farmer, EX089 suitcase),
    //               carry k-esimo → poolCarry[k % len] → alterna farmer/suitcase.
    // Se poolCarry è vuoto (es. casa senza manubri/kettlebell e senza surrogato
    // nel catalogo) → nessun carry assegnato, carry_conclusivo assente ovunque.
    const carryBySessionIdx = new Map();
    if (Array.isArray(pools.poolCarry) && pools.poolCarry.length > 0 && splitArray.length > 0) {
      const carryTotal = (splitArray.length <= 3) ? 1 : 2;
      const carrySorted = pools.poolCarry.slice()
        .sort((a, b) => String(a.codice || '').localeCompare(String(b.codice || '')));
      for (let k = 0; k < carryTotal; k++) {
        const sIdx = Math.min(Math.round(k * splitArray.length / carryTotal), splitArray.length - 1);
        const carryEx = carrySorted[k % carrySorted.length];
        if (carryEx && !carryBySessionIdx.has(sIdx)) carryBySessionIdx.set(sIdx, carryEx);
      }
    } else {
    }

    const sessioniRaw = splitArray.map((splitType, sessionIdx) => {
      const occurrenceIdx = typeProgressivoForPick[splitType];
      typeProgressivoForPick[splitType]++;
      const typeCount = splitTypeCount[splitType] || 1;

      // 0) Tipo + parametri + categoria (DUP)
      const resolvedType  = _trainGenResolveSessionType(obiettivo, livello, splitType, occurrenceIdx, typeCount);
      const isDup         = _trainGenIsDupSession(obiettivo, livello, splitType, typeCount);
      const sessionParams = _trainGenResolveSessionParams(obiettivo, livello, resolvedType, isDup);
      const category      = _trainGenGetSessionCategory(splitType, resolvedType);
      const sessionLabel  = `${splitType}#${occurrenceIdx} (${resolvedType})`;

      const usedSoFar = new Set();
      // Pattern compound per CATEGORIA (lista piatta — Fix 29 mag). Per Lower
      // contiene 'dominante ginocchia' DUE volte: il 2° pick è un unilaterale
      // distinto dal 1° grazie a usedSoFar in _trainGenPickByPattern.
      const requiredPatterns = _TRAIN_GEN_COMPOUND_PATTERNS_BY_CATEGORY[category] || [];

      // 1) COMPOUND (sempre, protetti). Skip SILENZIOSO se un pattern non ha
      // candidati (no warn rumoroso): il motore tira avanti col resto.
      // patternRepeat: per pattern ripetuti nella stessa sessione (es. Lower =
      // ['dominante ginocchia','dominante anca','dominante ginocchia']) il
      // 2° pick usa indice round-robin +1 → pesca un esercizio DIVERSO e più
      // vario (es. Squat poi Affondi, non due squat). usedSoFar già evita il
      // doppione esatto; questo migliora la varietà della scelta.
      const compoundPicks = [];
      const compoundMissing = [];
      const patternRepeat = {};
      requiredPatterns.forEach((pat) => {
        const r = patternRepeat[pat] || 0; patternRepeat[pat] = r + 1;
        // +rigenIdx = rotazione varietà per rigenerazione (si SOMMA al round-robin
        // per-tipo occurrenceIdx + al ripetitore intra-sessione r, non li sostituisce).
        const pickIdx = (Number(occurrenceIdx) || 0) + r + rigenIdx;
        let picked = _trainGenPickByPattern(pools.poolPrincipali, [pat], usedSoFar, pickIdx, `${sessionLabel} pat=${pat}#${r}`, limitazioni);
        // FIX 2 — Squat corpo libero in sessione Forza: se il compound
        // 'dominante ginocchia' scelto non ha attrezzi con carico nel kit
        // utente (es. EX013 Squat corpo libero), scarta e riprova.
        // Con EX132 Goblet squat nel pool (elastico;maniglie), il secondo
        // pick garantisce un esercizio con progressione del carico.
        if (picked && resolvedType === 'Forza' && _normPattern(pat) === 'dominante ginocchia') {
          const _attEx = String(picked.attrezzo || '').split(';').map(s => s.trim().toLowerCase()).filter(Boolean);
          const _haCarico = _attEx.some(a => _ATTREZZI_CON_CARICO.has(a) && attrezzaturaSet.has(a));
          if (!_haCarico) {
            usedSoFar.add(picked.codice);
            picked = _trainGenPickByPattern(pools.poolPrincipali, [pat], usedSoFar, pickIdx, `${sessionLabel} pat=${pat}#${r} retry`, limitazioni);
          }
        }
        if (picked) { usedSoFar.add(picked.codice); compoundPicks.push(picked); }
        else { compoundMissing.push(pat); }
      });

      // BLOCCO C — gruppi muscolari coperti dai compound EFFETTIVAMENTE scelti.
      // Si usa la pattern REALE dell'esercizio pescato (non il pattern richiesto):
      // se un pattern non aveva candidati e manca, il suo gruppo NON risulta coperto.
      const gruppiCopertiDaCompound = new Set();
      compoundPicks.forEach(ex => {
        const cov = _TRAIN_GEN_COMPOUND_COVERAGE[_normPattern(ex.pattern)] || [];
        cov.forEach(g => gruppiCopertiDaCompound.add(g));
      });

      // 2) ISO OBBLIGATORI per categoria (Regola A) — muscolari + DUE CORE FISSI.
      // Dal 2 ago i 2 core sono di NATURA diversa, non più due tenute:
      //   slot 1 · TENUTA   → Lower/Legs anti-estensione · Upper/Push/Pull anti-rotazione
      //   slot 2 · DINAMICO → Lower/Legs flessione       · Upper/Push/Pull rotazione
      //   Full Body → alterna per sessione DENTRO ciascuna natura
      // Il fallback (BLOCCO 6) resta sempre dentro la stessa natura.
      const _isCoreGt = (gt) => /^core /.test(String(gt || ''));
      let muscularTargets, coreTenuta, coreDinamico;
      if (splitType === 'fullbody') {
        let m = (_TRAIN_GEN_ISO_OBBLIGATORI_BY_TYPE.fullbody || []).slice(); // solo muscolari
        if (m.length > 2) {
          const start = ((Number(occurrenceIdx) || 0) % m.length + m.length) % m.length;
          m = [m[start], m[(start + 1) % m.length]];
        }
        muscularTargets = m;
        // Full body non ha un piano d'elezione: alterna a ogni sessione dentro
        // ciascuna natura, così su due sedute consecutive le copre tutte e quattro.
        const _alt = ((Number(sessionIdx) || 0) % 2 + 2) % 2;
        coreTenuta   = _TRAIN_GEN_CORE_TENUTE[_alt];
        coreDinamico = _TRAIN_GEN_CORE_DINAMICI[_alt];
      } else {
        muscularTargets = (_TRAIN_GEN_ISO_OBBLIGATORI_BY_TYPE[category] || []).slice()
          .filter(t => !_isCoreGt(t)); // guardia: la tabella è già solo muscolare
        const _c = _TRAIN_GEN_CORE_BY_TYPE[category] || null;
        coreTenuta   = _c ? _c.tenuta   : null;
        coreDinamico = _c ? _c.dinamico : null;
      }
      // coreTarget resta il riferimento della TENUTA: lo consumano il bonus
      // Tier 2 e la riga di riepilogo, che ragionano sul core "primario".
      const coreTarget = coreTenuta;

      // BLOCCO C — declassa gli iso muscolari il cui gruppo è GIÀ coperto dai
      // compound scelti (ridondanti nell'ossatura). Restano candidabili come bonus
      // (non sono più in gruppiPresenti, vedi blocco bonus). Il core NON è in
      // muscularTargets (gestito da coreTarget) → mai filtrato.
      if (gruppiCopertiDaCompound.size) {
        muscularTargets = muscularTargets.filter(t => !gruppiCopertiDaCompound.has(t));
      }

      // Pesca muscolari (ordinati per criticità DESC: se il taglio morde,
      // cadono i meno critici — es. polpacci < ischiocrurali)
      const muscularSorted = muscularTargets.slice()
        .sort((a, b) => (_TRAIN_GEN_ISO_CRITICALITY[b] || 0) - (_TRAIN_GEN_ISO_CRITICALITY[a] || 0));
      const muscularPicks = [];
      muscularSorted.forEach(gt => {
        const picked = _trainGenPickIsoByGruppoTarget(pools.poolPrincipali, gt, usedSoFar, occurrenceIdx + rigenIdx, sessionLabel);
        if (picked) { usedSoFar.add(picked.codice); muscularPicks.push({ ex: picked, gruppoTarget: gt }); }
      });
      // Pesca DUE core fissi di NATURA DIVERSA (2 ago): una tenuta + un dinamico.
      //  Fallback: SEMPRE dentro la stessa natura (_TRAIN_GEN_CORE_FALLBACK).
      //  Mai da una natura all'altra: uno slot vuoto è preferibile a due
      //  esercizi della stessa natura, che annullerebbero il senso della coppia.
      //
      //  INDICE — due correzioni rispetto al 6 lug:
      //  1) sessionIdx (assoluto nello split) al posto di occurrenceIdx (indice
      //     dentro il tipo). occurrenceIdx vale 0 sia per Upper A sia per Lower A
      //     → le due sessioni convergevano sulla stessa coppia. È lo stesso
      //     criterio del carry conclusivo, che infatti ruota correttamente.
      //  2) i due slot usano indici DISTINTI (+0 e +1): pescano già da liste
      //     disgiunte, ma con lo stesso indice le due liste scorrerebbero in
      //     parallelo, ripetendo sempre gli stessi accoppiamenti.
      //  rigenIdx resta sommato: è ciò che fa variare la scheda a ogni rigenerazione.
      const _coreRotIdx = (Number(sessionIdx) || 0) + rigenIdx;
      // Pesca un core della natura richiesta, con ripiego sull'altra funzione
      // della STESSA natura. Ritorna { ex, gruppoTarget } oppure null.
      const _pickCore = (target, rotIdx, natura) => {
        if (!target) return null;
        let ex = _trainGenPickIsoByGruppoTarget(pools.poolPrincipali, target, usedSoFar, rotIdx, sessionLabel);
        let gt = target;
        if (!ex) {
          const alt = _TRAIN_GEN_CORE_FALLBACK[target];
          if (alt) {
            ex = _trainGenPickIsoByGruppoTarget(pools.poolPrincipali, alt, usedSoFar, rotIdx, sessionLabel);
            gt = ex ? alt : target;
          }
        }
        if (!ex) {
          console.warn(`[train-gen] ${sessionLabel}: core ${natura} non disponibile ('${target}' né il suo ripiego di pari natura) → slot vuoto`);
          return null;
        }
        usedSoFar.add(ex.codice);
        return { ex, gruppoTarget: gt };
      };
      const corePick  = _pickCore(coreTenuta,   _coreRotIdx,     'TENUTA');
      const corePick2 = _pickCore(coreDinamico, _coreRotIdx + 1, 'DINAMICO');

      // OSSATURA SACRA (fix volume 29 mag; 2 core dal 6 lug): compound primari +
      // iso obbligatori (muscolari) + ENTRAMBI i core fissi NON si tagliano MAI,
      // neppure oltre il softMax. Il softMax limita SOLO il riempimento BONUS
      // (sotto) → l'ossatura resta sempre integra (es. Upper Ipertrofia 4+3+2=9
      // anche con softMax=6).
      const softMax = sessionMeta.softMaxPerSession;
      const keptMuscular = muscularPicks;     // tutti gli iso obbligatori
      const coreKept = corePick;              // 1° core fisso sempre (se nel pool)
      const core2Kept = corePick2;            // 2° core fisso sempre (se nel pool)
      const cutTargets = [];                  // nessun taglio dell'ossatura
      const coreSkippedTime = false;
      const keptObbligatori = keptMuscular; // alias per compatibilità log/diag
      const exercises = [...compoundPicks, ...keptMuscular.map(o => o.ex),
        ...(coreKept ? [coreKept.ex] : []), ...(core2Kept ? [core2Kept.ex] : [])];

      // 3) ISO BONUS — SOLO in modalità "Completo", COERENTI per zona muscolare.
      // In "Essenziale" ci si ferma all'ossatura. In "Completo" si riempie fino
      // al soft-max (count), ma i bonus devono restare nella stessa MACRO della
      // sessione (niente bicipiti/tricipiti su una Lower — bug 29 mag).
      // ORDINE: iso muscolari (gruppo coerente, no doppioni di gruppo) → core
      // dello STESSO tipo della sessione → compound complementari coerenti.
      // Ogni bonus usa i PROPRI parametri (via _trainGenGetExerciseParams).
      const bonusPicks = [];
      if (sessionMeta.volume !== 'essenziale') {
        const macro = (splitType === 'lower' || splitType === 'legs') ? 'lower'
                    : (splitType === 'upper' || splitType === 'push' || splitType === 'pull') ? 'upper'
                    : 'fullbody';
        const lo = _TRAIN_GEN_BONUS_BY_MACRO.lower, up = _TRAIN_GEN_BONUS_BY_MACRO.upper;
        const gruppiAmmessi   = new Set(macro === 'lower' ? lo.gruppi : macro === 'upper' ? up.gruppi : [...lo.gruppi, ...up.gruppi]);
        const compoundAmmessi = macro === 'lower' ? lo.compound : macro === 'upper' ? up.compound : [...lo.compound, ...up.compound];
        const _gtOf = (ex) => String(ex && ex.gruppo_target || '').toLowerCase().split(';').map(s => s.trim()).filter(Boolean);
        // Gruppi già presenti (ossatura) → no doppione di muscolo nei bonus
        const gruppiPresenti = new Set();
        exercises.forEach(ex => _gtOf(ex).forEach(g => gruppiPresenti.add(g)));

        // Tier 1 — iso muscolari coerenti con la macro, senza doppioni di gruppo
        while (exercises.length < softMax) {
          const cand = pools.poolPrincipali.filter(ex => {
            if (_normPattern(ex.pattern) !== 'isolamento') return false;
            const gts = _gtOf(ex);
            return gts.some(g => gruppiAmmessi.has(g)) && !gts.some(g => gruppiPresenti.has(g));
          });
          const bonus = _trainGenPickByPattern(cand, ['isolamento'], usedSoFar, occurrenceIdx + rigenIdx);
          if (!bonus) break;
          usedSoFar.add(bonus.codice);
          _gtOf(bonus).forEach(g => gruppiPresenti.add(g));
          exercises.push(bonus); bonusPicks.push({ ex: bonus, tier: 'iso-musc' });
        }
        // Tier 2 — core dello STESSO tipo della sessione (escluso se già presente)
        if (exercises.length < softMax && coreTarget) {
          const cand = pools.poolPrincipali.filter(ex => {
            if (_normPattern(ex.pattern) !== 'core') return false;
            const gts = _gtOf(ex);
            return gts.includes(coreTarget) && !gts.some(g => gruppiPresenti.has(g));
          });
          const bonus = _trainGenPickByPattern(cand, ['core'], usedSoFar, occurrenceIdx + rigenIdx);
          if (bonus) {
            usedSoFar.add(bonus.codice);
            _gtOf(bonus).forEach(g => gruppiPresenti.add(g));
            exercises.push(bonus); bonusPicks.push({ ex: bonus, tier: 'core-iso' });
          }
        }
        // Tier 3 — compound complementari coerenti con la macro
        while (exercises.length < softMax) {
          const bonus = _trainGenPickByPattern(pools.poolPrincipali, compoundAmmessi, usedSoFar, occurrenceIdx + rigenIdx);
          if (!bonus) break;
          usedSoFar.add(bonus.codice);
          exercises.push(bonus); bonusPicks.push({ ex: bonus, tier: 'compound' });
        }
      }

      // Riepilogo per sessione (sempre) — aiuta il debug futuro.
      const _isoLabel = (ex) => _trainGenIsIsometric(ex) ? 'iso_isometrico'
        : (['isolamento','core','mobilita'].includes(_normPattern(ex.pattern)) ? 'iso' : 'compound');
      const _coreShortOf = (ct) => ct ? ct.replace(/^core /, '') : null;
      const _coreShort = _coreShortOf(coreTarget);
      const _coresKept = [coreKept, core2Kept].filter(Boolean);
      const coreLog = _coresKept.length
        ? _coresKept.map(c => `${c.ex.codice} (${_coreShortOf(c.gruppoTarget)}, isometrico)`).join(' + ')
        : (coreTarget ? (coreSkippedTime ? `SKIPPATO per tempo (${_coreShort})` : `NON DISPONIBILE (${_coreShort})`) : 'nessuno');

      // WARM-UP specifico (FASE 1): cuffia dei rotatori come PREHAB nelle sessioni
      // macro UPPER (upper/push/pull — stessa convenzione macro di
      // _TRAIN_GEN_BONUS_BY_MACRO e del blocco bonus). Carico leggero, 1-2 serie,
      // mai a cedimento. Pescata da poolRiscaldamento (uso='riscaldamento'), NON
      // dal poolPrincipali → non collide con la selezione esercizi né con i bonus.
      // Campo SEPARATO `warmup` (come `finisher`): NON passa per cautele/ordering
      // né per _trainGenValidateCodes, e sopravvive allo strip _diag del save.
      // RENDERING in app demandato alla FASE 3.
      // NB design: la cuffia EX101 ha zone_rischio vuoto → nessuna cautela da
      // applicare in FASE 1. Quando il warm-up crescerà (FASE 3) si valuterà se
      // far passare anche il warm-up per _trainGenApplyCautions.
      const warmupExs = [];
      const _macroSessione = (splitType === 'lower' || splitType === 'legs') ? 'lower'
                           : (splitType === 'upper' || splitType === 'push' || splitType === 'pull') ? 'upper'
                           : 'fullbody';
      if (_macroSessione === 'upper') {
        // FASE 1: cuffia dei rotatori (prehab spalla). Pescata per gruppo_target.
        const _cuffia = _trainGenPickWarmup(pools.poolRiscaldamento, 'cuffia rotatori', occurrenceIdx);
        if (_cuffia) {
          const _w = _trainGenMapWarmupExercise(_cuffia);
          if (_w) warmupExs.push(_w);
        } else {
          console.warn(`[train-gen] ${sessionLabel}: cuffia rotatori non disponibile nel poolRiscaldamento (warm-up Upper senza prehab cuffia)`);
        }
      } else if (_macroSessione === 'lower') {
        // FASE 3: warm-up Lower = mobilità anca + glutei (slanci, affondo con
        // rotazione, world's greatest stretch). Questi esercizi (uso='riscaldamento',
        // pattern='mobilita') hanno gruppo_target VUOTO nel catalogo → pescati per
        // MUSCOLI. Fino a 2 esercizi, round-robin via occurrenceIdx (Lower A diversi
        // da Lower B), nessun duplicato. Carico leggero, attivazione non affaticamento.
        const _LOWER_WARM_MUSCLES = ['anca', 'glutei', 'adduttori', 'ischiocrurali', 'flessori', 'quadricipiti'];
        const _usedW = new Set();
        for (let _k = 0; _k < 2; _k++) {
          const _exW = _trainGenPickWarmupByMuscle(pools.poolRiscaldamento, _LOWER_WARM_MUSCLES, occurrenceIdx + _k, _usedW);
          if (!_exW) break;
          _usedW.add(_exW.codice);
          const _w = _trainGenMapWarmupExercise(_exW);
          if (_w) warmupExs.push(_w);
        }
        if (warmupExs.length === 0) {
          console.warn(`[train-gen] ${sessionLabel}: nessun warm-up Lower (mobilità anca/glutei) disponibile nel poolRiscaldamento`);
        }
      }
      // NB FASE 3 (scope confermato): solo warm-up Lower aggiunto. Il completamento
      // del warm-up Upper (circonduzioni spalle + band pull-apart, oltre alla cuffia)
      // e i recuperi G3/G6 (riempimento da uso='recupero;mobilita') restano per fasi
      // successive. Il RENDERING in app di warmup/carry_conclusivo è una fase a sé.

      // CARRY CONCLUSIVO (FASE 2): se questa sessione è tra quelle assegnate,
      // mappa il carry. Campo separato, non passa per cautele/ordering/validate,
      // sopravvive allo strip _diag. RENDERING in FASE 3 (a fine sessione,
      // distinto dal Tabata). NB: la cuffia EX101 e i carry hanno zone_rischio
      // vuoto → nessuna cautela da applicare in FASE 2 (come per il warm-up).
      const _carryAssigned = carryBySessionIdx.get(sessionIdx) || null;
      const carryConclusivo = _carryAssigned ? _trainGenMapCarryExercise(_carryAssigned) : null;

      return {
        splitType, sessionIdx, occurrenceIdx, resolvedType, isDup,
        sessionParams, category, exercises,
        warmup: warmupExs,
        carry_conclusivo: carryConclusivo,
        _diag: {
          compoundN: compoundPicks.length,
          compoundMissing,
          obbligatoriKept: keptMuscular.map(o => o.gruppoTarget),
          obbligatoriCut: cutTargets,
          core: corePick ? { gruppo: corePick.gruppoTarget, codice: (coreKept ? coreKept.ex.codice : null), kept: !!coreKept, skippedTime: coreSkippedTime } : { gruppo: coreTarget, codice: null, kept: false, skippedTime: false },
          core2: corePick2 ? { gruppo: corePick2.gruppoTarget, codice: core2Kept.ex.codice, kept: !!core2Kept } : { gruppo: coreDinamico, codice: null, kept: false },
          bonusN: bonusPicks.length,
          bonus: bonusPicks.map(b => `${b.ex.codice}:${b.tier}`),
          warmup: warmupExs.map(w => w.codice), // FASE 1: prehab (cuffia su Upper)
          carry: carryConclusivo ? carryConclusivo.codice : null, // FASE 2: carry conclusivo
        },
      };
    });

    // FIX 1 — Dedup cross-sessione compound Upper A / Upper B.
    // Se il pool di un pattern (es. 'spinta verticale') ha un solo candidato,
    // il round-robin restituisce lo stesso esercizio in Upper A (occurrenceIdx=0)
    // e Upper B (occurrenceIdx=1). In quel caso lo rimuoviamo dalla sessione
    // Upper B: lo slot rimane vuoto (nessun rimpiazzo — non esistono altri
    // candidati; i bonus iso possono compensare se il budget lo permette).
    {
      const _upperSess = sessioniRaw.filter(s => s.splitType === 'upper');
      const _upperA = _upperSess.find(s => s.occurrenceIdx === 0);
      const _upperB = _upperSess.find(s => s.occurrenceIdx === 1);
      if (_upperA && _upperB) {
        const _isCompound = (ex) => !['isolamento','core','mobilita','loaded carry']
          .includes(_normPattern(ex.pattern));
        const _upperACodici = new Set(_upperA.exercises.filter(_isCompound).map(e => e.codice));
        _upperB.exercises = _upperB.exercises.filter(ex => {
          if (_isCompound(ex) && _upperACodici.has(ex.codice)) {
            return false;
          }
          return true;
        });
      }
    }


    // BLOCCO 7+8 — CAUTELE (limitazioni × zone_rischio) + ORDERING
    //
    // PIPELINE: applichiamo BLOCCO 8 PRIMA del BLOCCO 7 (numero del blocco
    // è concetto, non ordine d'esecuzione). Motivo: le cautele possono
    // SOSTITUIRE un esercizio con la sua "alternativa" che potrebbe avere
    // pattern diverso → l'ordering post-sostituzione produce il risultato
    // corretto sequenza compound → isolamento → core.
    //
    // BLOCCO 8 (sicurezza, 100% deterministico, mai AI):
    //   Per ogni esercizio: intersect(limitazioni utente, zone_rischio).
    //   - intersezione vuota → keep
    //   - non vuota:
    //     (a) adattamento presente → keep + propaga `adattamento` come alert
    //     (b) altrimenti alternativa presente nel catalogMap → sostituisci
    //         (con re-check cautele sull'alternativa, 1 livello, no loop)
    //     (c) né adattamento né alternativa → skip + log warning
    //
    // BLOCCO 7 (ordering fisso, PARTE 5):
    //   1. multiarticolari compound (spinta_*/tirata_*/dominante_*)
    //   2. isolamento + mobilita
    //   3. core in coda
    //   Sub-sort per codice (stabile, coerente con pickByPattern).
    const sessioniProcessate = sessioniRaw.map(s => {
      const cautelati = _trainGenApplyCautions(s.exercises, limitazioni, catalogMap, ammissibiliSet);
      // Dedup post-sostituzioni: l'alternativa di un esercizio potrebbe
      // coincidere con un altro già selezionato dal BLOCCO 6 (caso edge
      // raro: pickByPattern dedup via Set codici in fase di selezione,
      // ma una sostituzione delle cautele potrebbe produrre un duplicato
      // post-hoc, es. due esercizi diversi che puntano alla stessa
      // alternativa quando entrambi in conflitto).
      const seen = new Set();
      const deduped = cautelati.filter(w => {
        if (seen.has(w.ex.codice)) {
          console.warn(`[train-gen] dedup post-cautele: '${w.ex.codice}' già presente in sessione → escluso`);
          return false;
        }
        seen.add(w.ex.codice);
        return true;
      });
      const ordinati = _trainGenOrderExercises(deduped);
      return { ...s, exercises: ordinati };
    });


    // BLOCCO 9 — FINISHER TABATA VERO (solo dimagrimento/ricomposizione)
    // Costruisce oggetto finisher dedicato (schema separato da exercises[]):
    //   { type:'tabata', work_sec:20, rest_sec:10, round:8, exercises:[4 distinti] }
    // 4 esercizi cardio_metabolico distinti che si alternano sui 8 round
    // (ogni esercizio fa 2 round, ~4 min effettivi + transizioni = ~5 min).
    // Rotazione (3 ago 2026) — l'indice passato al Tabata è
    //   sessionIdx (assoluto nello split) + rigenIdx * numero di sessioni
    // e sostituisce typeOrderIdx, che valeva 0 sia per Upper A sia per Lower A
    // (due sessioni con lo STESSO indice sulla STESSA lista → stessi 4 esercizi:
    // su 4 sessioni uscivano 2 soli set distinti) e non cambiava mai fra una
    // generazione e l'altra (stesso Tabata su ogni scheda, per sempre — il pool
    // era cresciuto da 14 a 30 senza che ne uscisse un esercizio nuovo).
    //   · sessionIdx    → le sessioni della stessa scheda pescano set diversi
    //   · rigenIdx      → a ogni nuova scheda i 4 esercizi cambiano
    //   · × numSessioni → passo pari a un blocco intero, così una scheda non
    //                     ripropone ciò che aveva la scheda precedente
    // Dentro la stessa scheda restano fissi: la scheda è un documento e non
    // deve cambiare sotto le mani dell'utente (rotazione per allenamento
    // esplicitamente scartata). typeOrderIdx resta come fallback difensivo se
    // sessionIdx non fosse valorizzato.
    const _tabataNumSessioni = Math.max(1, splitArray.length);
    const typeProgressivoForFinisher = {};
    splitArray.forEach(t => { typeProgressivoForFinisher[t] = 0; });
    const sessioniConFinisher = sessioniProcessate.map(s => {
      const typeOrderIdx = typeProgressivoForFinisher[s.splitType];
      typeProgressivoForFinisher[s.splitType]++;
      // FASE A — la seduta Pump è già un lavoro metabolico ad alte reps → niente
      // Tabata in coda (sarebbe ridondante e allungherebbe una seduta nata corta).
      if (!addFinisher || s.resolvedType === 'Pump') return s;
      const _tabataIdx = (Number.isFinite(s.sessionIdx) ? s.sessionIdx : typeOrderIdx)
        + rigenIdx * _tabataNumSessioni;
      const finisher = _trainGenBuildTabata({
        poolTabata: pools.poolFinisherTabata,
        limitazioni,
        catalogMap,
        ammissibili: ammissibiliSet,
        sessionIndex: _tabataIdx,
        sessionType: s.splitType,
      });
      if (!finisher) return s; // pool vuoto / cautele troppo restrittive
      return { ...s, finisher };
    });

    // BLOCCO 10 — MAPPING AL FORMATO TRAINING_SESSIONS
    // Replica i nomi campo già usati in TRAINING_SESSIONS legacy (così il
    // modulo Training di lettura — Step 3 separato — userà gli stessi
    // accessor senza adattamento): sets, reps, eq, setup[], execution[],
    // commonErrors[], muscles[], alert?, iso?. AGGIUNTO solo `codice`
    // per tracciabilità + marker isFinisher per i Tabata.
    //
    // Lettere progressive (A/B/C) calcolate qui:
    //   - tipo che si ripete (['upper','lower','upper','lower']) → A/A/B/B
    //   - tipo unico in lista (['upper','lower','fullbody']) → no lettera
    const TYPE_DISPLAY = {
      fullbody:'Full Body', upper:'Upper', lower:'Lower',
      push:'Push', pull:'Pull', legs:'Legs',
    };
    const typeCounter = {};
    splitArray.forEach(t => { typeCounter[t] = (typeCounter[t] || 0) + 1; });
    const typeProgressivo = {};
    splitArray.forEach(t => { typeProgressivo[t] = 0; });

    const sessioniFinali = sessioniConFinisher.map(s => {
      typeProgressivo[s.splitType]++;
      const idx = typeProgressivo[s.splitType];
      const isMulti = typeCounter[s.splitType] > 1;
      const letter = isMulti ? String.fromCharCode(64 + idx) : ''; // 65='A'
      const displayName = TYPE_DISPLAY[s.splitType] || s.splitType;
      // type/rir/rest a livello sessione = compound della sessione (DUP):
      // sono i valori "rappresentativi" letti dal reader (badge + getRestSec).
      const sp = s.sessionParams || {};
      const sessType = s.resolvedType || (sp.compound && sp.compound.type) || 'Ipertrofia';
      const sessRir  = (sp.rir !== undefined) ? sp.rir : null;
      const compoundRest = (sp.compound && sp.compound.rest_sec) || 90;
      const restText = (typeof restSecToText === 'function')
        ? restSecToText(compoundRest) : `${compoundRest} sec`;
      const sessionMeta = {
        id:    `${s.splitType}${letter}`,
        name:  s.resolvedType === 'Pump' ? 'Upper Pump' : (letter ? `${displayName} ${letter}` : displayName),
        type:  sessType,
        rir:   sessRir,
        label: s.resolvedType === 'Pump' ? 'Upper Pump — Pump' : (letter ? `${displayName} ${letter} — ${sessType}` : `${displayName} — ${sessType}`),
        rest:  restText,
        duration_min: null, // dismesso: niente più stima minuti (volume-based)
      };
      const mapped = _trainGenMapToSession(s.exercises, sessionMeta, sp, s.finisher, tipoAllen, attrezzaturaSet);
      // WARM-UP specifico (FASE 1): campo separato come `finisher`. Sopravvive a
      // _trainGenValidateCodes (non è in exercises[]) e allo strip _diag del save.
      // Rendering demandato alla FASE 3.
      if (Array.isArray(s.warmup) && s.warmup.length) mapped.warmup = s.warmup;
      // CARRY CONCLUSIVO (FASE 2): campo separato come `finisher`/`warmup`.
      // Sopravvive a _trainGenValidateCodes (non è in exercises[]) e allo strip
      // _diag del save. Rendering demandato alla FASE 3.
      if (s.carry_conclusivo) mapped.carry_conclusivo = s.carry_conclusivo;
      // _diag (Regola A): iso obbligatori pescati/tagliati + bonus. Solo per
      // diagnostica (ztSchedaWhy); STRIPPATO prima del save DB (_trainGenSaveToDB).
      mapped._diag = s._diag || null;
      return mapped;
    });


    // BLOCCO 11 — VALIDAZIONE CODICI (sanity check finale)
    // Rete di sicurezza: ogni `codice` di ogni esercizio deve esistere
    // nel catalogMap. In approccio A (logica JS che pesca dal pool reale)
    // il rischio è basso, ma il vincolo del brief è esplicito: validazione
    // obbligatoria + no crash. Esercizi fantasma → skip + warning.
    const sessioniValidate = _trainGenValidateCodes(sessioniFinali, catalogMap);

    // BLOCCO 12 — NOTA MOTIVAZIONALE AI (voce coach)
    // Una singola chiamata callAI con fallback fisso se fallisce o vuoto.
    // Niente termini tecnici (no RIR/DUP/RPE/pattern), tono caldo,
    // max 2-3 frasi italiane. Stessa filosofia del postino F.1 Nutrition.
    // dryRun=true: skippa la chiamata AI (placeholder esplicito per
    // diagnostica ztSchedaWhy senza side-effect Worker/Groq).
    const schedaMeta = {
      obiettivo,
      esperienzaRaw,
      livello,
      tipoAllen,
      giorni,
      volume,
      sessioniCount: sessioniValidate.length,
    };
    const reasoning = dryRun
      ? '[dry-run] nota motivazionale skippata per diagnostica'
      : await _trainGenAINote(profile, schedaMeta);

    // BLOCCO 13 — BUILD JSON FINALE
    // Struttura della colonna `scheda` (jsonb in schede_utente).
    // Tutti i campi sono "snapshot" del profilo utente al momento della
    // generazione, così future letture della scheda restano coerenti
    // anche se il profilo dell'utente cambia successivamente.
    const scheda = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      obiettivo,
      esperienza: esperienzaRaw,
      livello_mappato: livello,
      tipo_allenamento: tipoAllen,
      attrezzatura,
      giorni_allenamento: giorni,
      volume_sessione: volume,
      reasoning,
      sessioni: sessioniValidate,
      // Diagnostica: attrezzi dichiarati senza riscontro a catalogo. Come
      // sessioni[]._diag, STRIPPATO da _trainGenSaveToDB → non sporca il jsonb.
      _diagGear: pools.attrezziInerti || [],
    };


    // BLOCCO 14 — SALVATAGGIO DB (prima scrittura del sistema)
    // _trainGenSaveToDB:
    //   1. UPDATE schede_utente SET attiva=false (spegne le precedenti)
    //   2. INSERT nuova riga con attiva=true + blocco_n incrementale
    //   3. Su errore: toast voce coach, ritorna { ok:false, reason }
    //   4. Mai throw: l'onboarding (chiamante futuro) deve completare
    //      anche se il save fallisce. La scheda è add-on, come la riga
    //      madre del postino F.1 Nutrition (Opzione A documentata).
    //   Il muro DB uq_schede_utente_una_attiva garantisce max 1 scheda
    //   attiva per utente; race condition cross-device → unique violation
    //   23505 gestita come non-bloccante.
    //
    // dryRun=true: skippa completamente save. Ritorno arricchito con
    // _reason='dry-run' per distinguerlo da fail reali.
    if (dryRun) {
      return { ...scheda, _saved: false, _reason: 'dry-run' };
    }
    const saveResult = await _trainGenSaveToDB(ST.user.id, scheda);

    // BLOCCO 15 — RETURN
    // Sempre l'oggetto scheda costruito (utile per debug/diagnostica):
    //   - su save success → arricchito con id DB + blocco_n + _saved:true
    //   - su save fail (non-bloccante) → _saved:false + _reason
    //   - su errore globale (catch sotto) → null
    // Mai throw.
    if (saveResult && saveResult.ok) {
      return { ...scheda, id: saveResult.id, blocco_n: saveResult.blocco_n, _saved: true };
    }
    return { ...scheda, _saved: false, _reason: (saveResult && saveResult.reason) || 'unknown' };

  } catch (e) {
    // Try/catch globale: cattura qualunque errore non gestito dai branch
    // interni. Log only — il chiamante (onboarding) NON deve crashare.
    console.warn('[train-gen] errore globale:', e);
    return null;
  }
}

// ───────────────────────────────────────────────────────────
// HELPER PRIVATI — corpo riempito ai sotto-step 3.x
// (throw Error per intercettare chiamate accidentali pre-implementazione)
// ───────────────────────────────────────────────────────────

// Pulizia testi catalogo: accenti scritti come apostrofo, "anche:" concatenato,
// iniziale maiuscola. Lista accenti CHIUSA (solo correzioni certe); gli apostrofi
// di elisione (l', all', dell'…) NON sono in lista e restano intatti.
const _CAT_ACCENT_FIX = {
  "piu'": "più", "mobilita'": "mobilità", "profondita'": "profondità",
  "finche'": "finché", "e'": "è", "instabilita'": "instabilità",
  "stabilita'": "stabilità", "velocita'": "velocità", "qualita'": "qualità",
  "intensita'": "intensità", "attivita'": "attività", "puo'": "può",
  "cosi'": "così", "perche'": "perché", "poiche'": "poiché", "piedi'": "piedi"
};
function _cleanCatalogText(s){
  if(!s || typeof s !== 'string') return s;
  let t = s;
  // 1) Accenti: sostituzione case-insensitive a parola intera, preserva la
  //    maiuscola iniziale se la parola era capitalizzata.
  for(const [bad, good] of Object.entries(_CAT_ACCENT_FIX)){
    const re = new RegExp('\\b' + bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    t = t.replace(re, (m) => (m[0] === m[0].toUpperCase()) ? (good[0].toUpperCase()+good.slice(1)) : good);
  }
  // 2) "anche:" concatenato → diventa una voce separata col separatore ';'
  //    (così il reader la tratta come punto a sé). Gestisce ". anche:" e " anche:".
  t = t.replace(/\.\s*anche\s*:\s*/gi, '; ').replace(/\s+anche\s*:\s*/gi, '; ');
  // 3) Iniziale maiuscola
  t = t.trim();
  if(t.length) t = t[0].toUpperCase() + t.slice(1);
  return t;
}

function _trainGenFilterPool(catalog, { tipoAllen, attrezzatura, livello }) {
  // Filtra il catalogo per produrre due pool:
  //   poolPrincipali = esercizi adatti alle sessioni standard
  //   poolFinisher   = esercizi adatti al tabata di coda
  //
  // FILTRI APPLICATI in ordine:
  //   1) luogo:    SPLIT su ';' → accetta se la lista contiene tipoAllen
  //                OPPURE 'qualsiasi' OPPURE l'alias (aperto ↔ libero).
  //                Catalogo reale usa liste tipo "casa;libero;palestra".
  //                Profilo M1 salva "aperto" mentre catalogo usa "libero":
  //                il LUOGO_ALIASES rende i due valori equivalenti.
  //   2) attrezzo: dipende da tipo_allenamento
  //                · 'palestra' → tutto ammesso
  //                · 'casa'     → corpo libero + attrezzatura utente
  //                · 'aperto'   → whitelist hardcoded "portatili"
  //                Normalizzato bidirezionalmente "corpo libero" ↔ "corpo_libero"
  //                (catalogo usa lo spazio, codice interno usa underscore;
  //                _normAttrezzo converte 'corpo libero' → 'corpo_libero').
  //   3) livello:  utente avanzato fa anche intermedio/principiante,
  //                intermedio fa anche principiante, principiante solo principiante.
  //   4) uso:      split su ';' → 'principale' / 'finisher' / 'recupero'.
  //                Un esercizio può appartenere a più pool (es. uso='principale;finisher').
  //
  // NB: la Leva C (surrogati casa con elastico — cioè "esercizio marcato
  // bilanciere/manubri replicabile con elastico+barra") NON è implementata
  // qui. Sessione di design futura dedicata. Per ora un utente casa con
  // attrezzatura ridotta vedrà solo gli esercizi marcati esplicitamente
  // come elastico/corpo libero/sbarra/banda nel catalogo.

  const APERTO_WHITELIST = new Set(['corpo_libero','elastico','banda','sbarra','cavigliere','trx']);
  const LIVELLI_AMMESSI = {
    principiante: new Set(['principiante']),
    intermedio:   new Set(['principiante','intermedio']),
    avanzato:     new Set(['principiante','intermedio','avanzato']),
  };
  const livelliOk = LIVELLI_AMMESSI[livello] || LIVELLI_AMMESSI.principiante;

  // Alias bidirezionale "aperto" (profilo M1) ↔ "libero" (catalogo).
  // Decisione documentata: M1 chiede "aperto" all'utente; il catalogo
  // usa la convenzione "libero". Gli alias evitano una migrazione Sheet.
  const LUOGO_ALIASES = { aperto: 'libero', libero: 'aperto' };

  // Normalizza attrezzo: spazi → underscore. Risolve il mismatch
  // 'corpo libero' (catalogo, con spazio) vs 'corpo_libero' (codice).
  // Funziona in entrambe le direzioni: se nuovi attrezzi multi-parola
  // arrivassero nel Sheet ('sbarra olimpionica', ecc.) sarebbero
  // automaticamente trattati con il formato canonico interno underscore.
  const _normAttrezzo = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_');

  // corpo_libero sempre ammesso a casa (base implicita anche se non
  // dichiarato dall'utente in onboarding). Normalizziamo anche
  // l'attrezzatura dell'utente nella forma underscore canonica.
  const attrezzaturaSet = new Set(
    (Array.isArray(attrezzatura) ? attrezzatura : []).map(_normAttrezzo)
  );
  attrezzaturaSet.add('corpo_libero');

  // Rubrica alias: traduce gli slug dell'onboarding nelle parole del catalogo.
  // Risolve i mismatch elastici_tubo→elastico, cavigliere→cavigliera,
  // barra_corta/lunga→barra (i profili NUOVI salvano gli slug onboarding, il
  // catalogo usa la parola singolare → senza traduzione gli esercizi elastico
  // non uscivano per i tester). Aggiunge il termine-catalogo SENZA rimuovere lo
  // slug originale → retrocompatibile coi profili VECCHI che hanno già 'elastico'.
  // Chiavi e valori sono in forma normalizzata (underscore), coerente con _normAttrezzo.
  const GEAR_ALIASES = {
    elastici_tubo: 'elastico',
    cavigliere:    'cavigliera',
    barra_corta:   'barra',
    barra_lunga:   'barra',
  };
  Array.from(attrezzaturaSet).forEach(slug => {
    if (GEAR_ALIASES[slug]) attrezzaturaSet.add(GEAR_ALIASES[slug]);
  });

  // ATTREZZI INERTI — un token dichiarato in onboarding che il catalogo non
  // usa da nessuna parte non apre un solo esercizio, e fallisce in SILENZIO:
  // l'utente crede di aver dichiarato un attrezzo utile. Casi noti al 2 ago:
  // barra_corta/barra_lunga (alias → 'barra') e cavigliere (alias →
  // 'cavigliera') puntano a termini con 0 occorrenze, né come attrezzo nativo
  // né dentro un surrogato_attrezzo. Qui si CONSTATA il vuoto — il rimedio
  // (aggiungere il termine al catalogo o correggere l'alias) è lavoro di Sheet.
  // Un token è inerte se NÉ lui NÉ il suo alias compaiono nel catalogo.
  const attrezziCatalogo = new Set();
  catalog.forEach(ex => {
    _normAttrezzo(ex.attrezzo).split(';').forEach(a => { const t = a.trim(); if (t) attrezziCatalogo.add(t); });
    String(ex.surrogato_attrezzo || '').toLowerCase().split('+')
      .forEach(a => { const t = _normAttrezzo(a); if (t) attrezziCatalogo.add(t); });
  });
  const attrezziInerti = (Array.isArray(attrezzatura) ? attrezzatura : [])
    .map(_normAttrezzo)
    .filter(slug => slug && slug !== 'corpo_libero')
    .filter(slug => !attrezziCatalogo.has(slug)
                 && !(GEAR_ALIASES[slug] && attrezziCatalogo.has(GEAR_ALIASES[slug])));
  if (attrezziInerti.length) {
    console.warn('[train-gen] attrezzi dichiarati che non esistono nel catalogo (0 esercizi aperti):',
      attrezziInerti.join(', '));
  }

  const tipoAllenNorm = String(tipoAllen || '').toLowerCase().trim();
  const tipoAllenAlias = LUOGO_ALIASES[tipoAllenNorm] || null;

  const poolPrincipali = [];
  const poolFinisher = [];
  const poolFinisherTabata = []; // NUOVO (28 mag sera): solo cardio_metabolico+finisher
  const poolRiscaldamento = []; // FASE 1 (catalogo 123): esercizi uso='riscaldamento' (prehab/warm-up). Usato in FASE 1 per la cuffia (Upper); esteso a tutto il warm-up in FASE 3.
  const poolCarry = [];        // FASE 2 (catalogo 123): loaded carry da fine sessione (campo carry_conclusivo, distinto dal Tabata). Solo pattern='loaded carry' + uso='finisher' = farmer walk + suitcase carry (get-up/overhead NON tagged finisher → esclusi).

  catalog.forEach(ex => {
    // FILTRO 1 — luogo (lista separata da ';', alias aperto↔libero,
    // bypass per surrogato casalingo)
    // Bypass surrogato: se tipoAllen='casa' E surrogato_attrezzo è popolato,
    // accetta l'esercizio anche se luogo non include 'casa'. Semantica:
    // "l'esercizio dichiara esplicitamente una versione casalinga (es. EX006
    // Military press, luogo=palestra, surrogato=elastico+barra), quindi il
    // filtro luogo non lo blocca". Il check effettivo della disponibilità
    // attrezzi avviene poi nel FILTRO 2 (branch surrogato).
    const luoghiEsercizio = String(ex.luogo || '').toLowerCase()
      .split(';').map(s => s.trim()).filter(Boolean);
    const hasSurrogato = ex.surrogato_attrezzo && String(ex.surrogato_attrezzo).trim();
    const luogoOk = luoghiEsercizio.includes('qualsiasi')
      || luoghiEsercizio.includes(tipoAllenNorm)
      || (tipoAllenAlias && luoghiEsercizio.includes(tipoAllenAlias))
      || (tipoAllenNorm === 'casa' && hasSurrogato);
    if (!luogoOk) return;

    // FILTRO 2 — attrezzo (normalizzato spazi→underscore)
    // CON branch SURROGATO per casa: se l'utente non possiede l'attrezzo
    // nativo dell'esercizio MA possiede TUTTI gli attrezzi listati in
    // surrogato_attrezzo (split su '+'), l'esercizio è disponibile in
    // versione casalinga. Es: EX002 Panca piana (attrezzo='bilanciere',
    // surrogato_attrezzo='panca+elastico') è disponibile per chi ha
    // panca E elastico, con la nota_surrogato che spiega l'esecuzione.
    // Decisione 28 mag 2026 (Leva C surrogati) — la nota_surrogato verrà
    // propagata nell'alert dell'esercizio da _trainGenMapToSession.
    const attrezzoL = _normAttrezzo(ex.attrezzo);
    // FIX FASE 1 (catalogo 123) — ATTREZZO MULTIPLO:
    // `attrezzo` nel catalogo nuovo è una LISTA separata da ';' (es.
    // 'elastico;manubri', 'corpo libero;bilanciere;manubri;kettlebell').
    // Prima si confrontava la STRINGA INTERA normalizzata col set utente
    // → tutti i 38/123 esercizi multi-attrezzo venivano esclusi a casa
    // anche possedendo uno degli attrezzi (es. EX101 cuffia 'elastico;manubri'
    // escluso pur avendo l'elastico). Ora splitto su ';' e accetto se l'utente
    // possiede ALMENO UNO degli attrezzi nativi. Per attrezzo SINGOLO il
    // comportamento è identico a prima (split → 1 elemento). Retrocompatibile.
    // _normAttrezzo è già stato applicato sull'intera stringa (spazi→underscore),
    // quindi qui basta splittare su ';' e ritrimmare.
    const attrezziNativi = attrezzoL.split(';').map(s => s.trim()).filter(Boolean);
    let attrezzoOk = false;
    let isSurrogato = false;
    if (tipoAllenNorm === 'palestra')    attrezzoOk = true;
    else if (tipoAllenNorm === 'casa') {
      attrezzoOk = attrezziNativi.some(a => attrezzaturaSet.has(a));
      // Branch surrogato: solo se nativo fallisce e l'esercizio dichiara
      // una lista surrogato_attrezzo non vuota
      if (!attrezzoOk && ex.surrogato_attrezzo) {
        const surrAttrezzi = String(ex.surrogato_attrezzo).toLowerCase()
          .split('+').map(s => s.trim()).filter(Boolean).map(_normAttrezzo);
        if (surrAttrezzi.length > 0 && surrAttrezzi.every(a => attrezzaturaSet.has(a))) {
          attrezzoOk = true;
          isSurrogato = true;
        }
      }
    }
    // 'aperto': stesso bug gemello (confronto su stringa intera) → stesso fix
    // con la whitelist portatili (some su lista nativa).
    else if (tipoAllenNorm === 'aperto') attrezzoOk = attrezziNativi.some(a => APERTO_WHITELIST.has(a));
    if (!attrezzoOk) return;

    // FILTRO 3 — livello (campo livello = lista separata da ';',
    // vuoto = ammesso a tutti i livelli)
    const livelliEsercizio = String(ex.livello || '').toLowerCase()
      .split(';').map(s => s.trim()).filter(Boolean);
    const livelloOk = livelliEsercizio.length === 0
      || livelliEsercizio.some(l => livelliOk.has(l));
    if (!livelloOk) return;

    // FILTRO 4 — uso (split su ';', un esercizio può comparire in più pool)
    // Se isSurrogato, clone shallow per non mutare l'oggetto del catalogo
    // condiviso (necessario perché lo stesso esercizio potrebbe essere
    // analizzato in scenari diversi senza state leak).
    const usi = String(ex.uso || '').toLowerCase()
      .split(';').map(s => s.trim()).filter(Boolean);
    const exTagged = isSurrogato ? { ...ex, _surrogato: true } : ex;
    if (usi.includes('principale'))    poolPrincipali.push(exTagged);
    if (usi.includes('finisher'))      poolFinisher.push(exTagged);
    if (usi.includes('riscaldamento')) poolRiscaldamento.push(exTagged);
    // FASE 2 — Carry conclusivo: pattern 'loaded carry' + tag 'finisher'.
    // Il tag 'finisher' nel catalogo distingue farmer walk + suitcase carry
    // (uso='carry;finisher') da overhead walk + turkish get-up (uso='carry'
    // senza finisher) → questi due NON entrano (get-up troppo tecnico,
    // overhead resta in catalogo per altri profili / gestito da cautele).
    // Guard extra anti-drift: esclude esplicitamente i get-up per nome, nel
    // caso il catalogo in futuro li tagghi 'finisher' per errore.
    // (patternNorm è dichiarato più sotto → qui ricalcolo inline con _normPattern.)
    if (_normPattern(ex.pattern) === 'loaded carry' && usi.includes('finisher')
        && !/get[\s-]?up/i.test(String(ex.nome || ''))) {
      poolCarry.push(exTagged);
    }
    // Pool Tabata: solo cardio_metabolico + finisher (sottoinsieme di poolFinisher
    // dedicato al Tabata vero del BLOCCO 9. Distinto perché finisher generici
    // tipo push-up/plank non sono cardio anaerobici per Tabata 20/10).
    const patternNorm = _normPattern(ex.pattern);
    if (patternNorm === 'cardio_metabolico' && usi.includes('finisher')) {
      poolFinisherTabata.push(exTagged);
    }
    // 'recupero' ignorato in questa fase
  });

  return { poolPrincipali, poolFinisher, poolFinisherTabata, poolRiscaldamento, poolCarry, attrezzaturaSet, attrezziInerti };
}

// DORMIENTE (29 mag): non più chiamata dal generatore — il riempimento bonus
// ora è cap-by-count (soft-max) e gated dal volume Essenziale/Completo, non
// dai minuti. Tenuta come riferimento; rimuovere in cleanup futuro con
// _trainGenExerciseTimeCost e _TRAIN_GEN_TIME_BUDGET (usati solo qui).
function _trainGenComputeMaxExercises(durata_min, params, addFinisher) {
  // Formula tempo: tempo_disp / tempo_per_esercizio, clampato min..max.
  //   tempo_disp = durata_min*60 - warmup - (finisher?:0) - buffer
  //   tempo_ex   = sets * (set_execution + rest_sec)
  const t = _TRAIN_GEN_TIME_BUDGET;
  const finisherSec = addFinisher ? t.finisher_sec : 0;
  const tempoDisponibile = (Number(durata_min) || 0) * 60 - t.warmup_sec - finisherSec - t.buffer_sec;
  const tempoPerEsercizio = (Number(params.sets) || 0) * (t.set_execution_sec + (Number(params.rest_sec) || 0));
  if (tempoPerEsercizio <= 0 || tempoDisponibile <= 0) {
    // Edge case (durata troppo bassa o params malformati): garantisce minimo
    return t.min_exercises_per_session;
  }
  const raw = Math.floor(tempoDisponibile / tempoPerEsercizio);
  return Math.max(t.min_exercises_per_session, Math.min(t.max_exercises_per_session, raw));
}

function _trainGenPickByPattern(pool, patternOptions, usedSoFar, sessionIndex, debugLabel, limitazioni) {
  // Pesca 1 esercizio dal pool che matchi UNO dei pattern in patternOptions
  // (array OR), evitando duplicati già usati nella sessione corrente.
  // debugLabel (opzionale): se window._trainGenDebug è true, logga candidati
  // nel pool, scartati perché già usati, e il codice scelto.
  // limitazioni (opzionale, FASE 4): array di zone a rischio dell'utente
  // (es. ['lombare','ginocchia']). Se passato, attiva la PREFERENZA SICUREZZA
  // (vedi sotto). Le chiamate che NON lo passano (bonus) restano invariate.
  //
  // Strategia: deterministica stabile + ROUND-ROBIN inter-sessione (28 mag).
  //   - sort candidati per codice (sempre uguale per stesso pool/pattern)
  //   - selezione = candidates[sessionIndex % candidates.length]
  //
  // sessionIndex (default 0) = INDICE PROGRESSIVO PER TIPO SESSIONE.
  // Es. split ['upper','lower','upper','lower'] → upper ha indici 0,1
  // (Upper A=0, Upper B=1) e lower ha indici 0,1 (Lower A=0, Lower B=1).
  // Calcolato dal chiamante (BLOCCO 6 generateTrainingProgram) tramite
  // contatore per-tipo, NON dall'indice assoluto della sessione nello
  // split (che farebbe collassare Upper A e Upper B su stesso esercizio
  // per pattern con solo 2 candidati: sessionIdx 0 e 2 → 0%2=2%2=0).
  //
  // Pattern con 1 solo candidato → ripetuto in tutte le sessioni del
  // tipo (fine catalogo, accettabile come da decisione utente).
  // Pattern con 2+ candidati → alterna correttamente.
  //
  // usedSoFar resta lo stesso: evita duplicati DENTRO la stessa sessione
  // (es. se uno stesso esercizio matcha 2 pattern requirement diversi
  // nella stessa sessione fullbody, non viene preso 2 volte).
  if (!Array.isArray(pool) || pool.length === 0) return null;
  if (!Array.isArray(patternOptions) || patternOptions.length === 0) return null;
  const used = (usedSoFar instanceof Set) ? usedSoFar : new Set(usedSoFar || []);
  const optionsSet = new Set(patternOptions);

  const matchPattern = pool.filter(ex => optionsSet.has(_normPattern(ex.pattern)));
  const candidates = matchPattern.filter(ex => !used.has(ex.codice));
  if (typeof window !== 'undefined' && window._trainGenDebug && debugLabel) {
    const scartatiUsati = matchPattern.filter(ex => used.has(ex.codice)).map(e => e.codice);
  }
  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => String(a.codice || '').localeCompare(String(b.codice || '')));

  // FASE 4 — PREFERENZA SICUREZZA (zone_rischio).
  // A parità di pattern, scegli PRIMA le varianti SENZA zone_rischio in
  // conflitto col profilo dell'utente. Se esiste almeno una variante "sicura",
  // il round-robin inter-sessione avviene SOLO tra le sicure → un esercizio
  // rischioso NON viene scelto come compound quando c'è un'alternativa pulita
  // nello stesso pattern (es. con lombare+ginocchia a rischio: Squat/Affondi
  // puliti preferiti a Good morning / Pistol che hanno zone_rischio in conflitto).
  // Se TUTTE le varianti sono rischiose (o limitazioni vuote / non passate dai
  // bonus) → si usa l'intero set: la rete _trainGenApplyCautions (post-pick)
  // gestirà comunque adatta → sostituisci → skip. Quindi questa è una
  // PREFERENZA, non un filtro che può lasciare un pattern scoperto.
  let pickPool = candidates;
  const _limSet = new Set((Array.isArray(limitazioni) ? limitazioni : [])
    .map(l => String(l).toLowerCase().trim()).filter(Boolean));
  if (_limSet.size > 0) {
    const _haConflitto = (ex) => String(ex.zone_rischio || '').toLowerCase()
      .split(';').map(z => z.trim()).filter(Boolean)
      .some(z => _limSet.has(z));
    const _safe = candidates.filter(ex => !_haConflitto(ex));
    if (_safe.length > 0) {
      pickPool = _safe;
      if (typeof window !== 'undefined' && window._trainGenDebug && debugLabel) {
        const _risky = candidates.filter(_haConflitto).map(e => e.codice);
      }
    } else if (typeof window !== 'undefined' && window._trainGenDebug && debugLabel) {
    }
  }

  const idx = ((Number(sessionIndex) || 0) % pickPool.length + pickPool.length) % pickPool.length;
  const chosen = pickPool[idx];
  return chosen;
}

// ───────────────────────────────────────────────────────────
// DUP + Regola A/B helpers (28 mag 2026)
// ───────────────────────────────────────────────────────────

// Risolve il TIPO di una singola sessione applicando la periodizzazione DUP.
// occurrenceIdx = indice 0-based dell'occorrenza di QUEL tipo nello split
//   (es. split ['upper','lower','upper','lower'] → upper: 0,1 / lower: 0,1).
// typeCount = numero totale di occorrenze di quel tipo nello split.
// DUP attiva sse: obiettivo ipertrofia-like + livello intermedio/avanzato +
//   split duplicato (typeCount>=2) + NON fullbody (escluso dalla regola DUP).
//   → prima occorrenza = 'Forza', seconda = 'Ipertrofia' (alterna se >2).
// Altrimenti: tipo UNIFORME dal compound di default dell'obiettivo.
function _trainGenResolveSessionType(obiettivo, livello, splitType, occurrenceIdx, typeCount) {
  const isDupLevel = (livello === 'intermedio' || livello === 'avanzato');
  const isDupObj   = _TRAIN_GEN_DUP_OBIETTIVI.has(obiettivo);
  const isDupSplit = (Number(typeCount) >= 2 && splitType !== 'fullbody');
  if (isDupLevel && isDupObj && isDupSplit) {
    // FASE A — la TERZA upper (occurrenceIdx===2, esiste solo nello split a 5
    // giorni Upper/Lower) è una seduta Pump leggera, NON un'altra upper pesante.
    if (splitType === 'upper' && Number(occurrenceIdx) === 2) return 'Pump';
    return ((Number(occurrenceIdx) || 0) % 2 === 0) ? 'Forza' : 'Ipertrofia';
  }
  const byObj = _TRAIN_GEN_PARAMS_BY_GOAL[obiettivo] || {};
  const lvl = byObj[livello] || byObj.principiante || {};
  return (lvl.compound && lvl.compound.type) || 'Ipertrofia';
}

// Vero sse la sessione usa la periodizzazione DUP (per scegliere
// compound_forza/compound_ipertrofia invece del compound di default).
function _trainGenIsDupSession(obiettivo, livello, splitType, typeCount) {
  return (livello === 'intermedio' || livello === 'avanzato')
    && _TRAIN_GEN_DUP_OBIETTIVI.has(obiettivo)
    && Number(typeCount) >= 2
    && splitType !== 'fullbody';
}

// Risolve i parametri (compound/iso/iso_isometrico) per una sessione dato il
// suo tipo risolto. Su sessione DUP sceglie compound_forza/compound_ipertrofia.
function _trainGenResolveSessionParams(obiettivo, livello, sessionType, isDup) {
  // FASE A — la seduta Pump ha parametri propri (indipendenti da obiettivo/
  // livello): alte reps, basso carico, recuperi brevi. Stessa forma dell'oggetto
  // ritornato sotto (compound/iso/iso_isometrico/type/rir/rest_sec).
  if (sessionType === 'Pump') {
    return {
      compound:       _TRAIN_GEN_PUMP_PARAMS.compound,
      iso:            _TRAIN_GEN_PUMP_PARAMS.iso,
      iso_isometrico: _TRAIN_GEN_PUMP_PARAMS.iso_isometrico,
      type: 'Pump',
      rir: _TRAIN_GEN_PUMP_PARAMS.iso.rir,
      rest_sec: _TRAIN_GEN_PUMP_PARAMS.iso.rest_sec,
    };
  }
  const byObj = _TRAIN_GEN_PARAMS_BY_GOAL[obiettivo] || {};
  const lvl = byObj[livello] || byObj.principiante || {};
  let compound = lvl.compound;
  if (isDup) {
    if (sessionType === 'Forza' && lvl.compound_forza) compound = lvl.compound_forza;
    else if (sessionType === 'Ipertrofia' && lvl.compound_ipertrofia) compound = lvl.compound_ipertrofia;
  }
  compound = compound || lvl.compound || {};
  return {
    compound,
    iso: lvl.iso || compound,
    iso_isometrico: lvl.iso_isometrico || lvl.iso || compound,
    type: compound.type || sessionType,
    rir: (compound.rir !== undefined) ? compound.rir : null,
    rest_sec: compound.rest_sec,
  };
}

// Categoria sessione per la tabella iso obbligatori (Regola A).
// upper/lower → variante _forza/_ipertrofia dal tipo risolto.
// push/pull/legs/fullbody → la chiave del tipo (nessuna variante).
function _trainGenGetSessionCategory(splitType, sessionType) {
  if (splitType === 'upper' || splitType === 'lower') {
    // FASE A — la seduta Pump ha categoria dedicata 'upper_pump' (per la 3ª
    // upper dello split a 5 giorni): pattern compound vuoti + iso obbligatori
    // pump-specifici. PRIMA del calcolo forza/ipertrofia.
    if (sessionType === 'Pump') return splitType + '_pump';
    return splitType + (sessionType === 'Forza' ? '_forza' : '_ipertrofia');
  }
  return splitType;
}

// Sceglie quale sub-set di parametri usare per UN esercizio (Regola B):
//   pattern isolamento + nome contiene 'isometric' → iso_isometrico
//   pattern isolamento / mobilita                  → iso
//   tutto il resto (multiarticolari, cardio princ.) → compound
// Riconoscimento ROBUSTO esercizio isometrico/anti-movimento (Fix 1, 29 mag).
// Plank, Dead bug, Pallof, Hollow, Bird dog, Side plank, Stir the pot non hanno
// la keyword 'isometrico' nel nome → servirebbe trattarli come compound pesanti.
// Logica OR:
//   1) pattern=core E nome NON dinamico (marcia|ritmo|veloce|controllat|
//      alternat|cammina) → core statico = isometrico
//   2) nome contiene 'isometric'
//   3) nome tra i noti isometrici (wall sit|plank|dead bug|hollow|pallof|
//      side plank|bird dog|stir the pot)
//   4) isolamento glutei isometrico (ponte|hip thrust isometrico|wall sit)
function _trainGenIsIsometric(ex) {
  const pattern = _normPattern(ex && ex.pattern);
  const nome = String((ex && ex.nome) || '').toLowerCase();
  const gt = String((ex && ex.gruppo_target) || '').toLowerCase()
    .split(';').map(s => s.trim()).filter(Boolean);
  const dinamico = /marcia|ritmo|veloce|controllat|alternat|cammina/.test(nome);
  // 2 ago — quattro funzioni core: la NATURA la dichiara il gruppo_target, non
  // il nome. Va PRIMA di ogni euristica sul nome, altrimenti 'Plank laterale
  // crunch obliquo' (core rotazione, dinamico) cade nella regex /plank/ sotto e
  // verrebbe prescritto a tempo. Senza questa riga tutti e 43 i core dinamici
  // (crunch, sit-up, russian twist) uscirebbero in secondi invece che in reps.
  if (gt.includes('core flessione') || gt.includes('core rotazione')) return false;
  if (gt.includes('core anti-estensione') || gt.includes('core anti-rotazione')) return true;
  if (pattern === 'core' && !dinamico) return true;
  if (/isometric/.test(nome)) return true;
  if (/wall sit|plank|dead bug|hollow|pallof|side plank|bird dog|stir the pot/.test(nome)) return true;
  if (pattern === 'isolamento' && gt.includes('glutei') && /ponte|hip thrust isometric|wall sit/.test(nome)) return true;
  return false;
}

// Sceglie il sub-set di parametri per UN esercizio (Regola B + Fix 1):
//   isometrico (vedi _trainGenIsIsometric)        → iso_isometrico (a tempo)
//   isolamento / mobilita / core (dinamico)       → iso (reps, serie ridotte)
//   tutto il resto (multiarticolari, cardio princ) → compound
function _trainGenGetExerciseParams(ex, sessionParams) {
  if (_trainGenIsIsometric(ex)) {
    return sessionParams.iso_isometrico || sessionParams.iso || sessionParams.compound;
  }
  const pattern = _normPattern(ex && ex.pattern);
  if (pattern === 'isolamento' || pattern === 'mobilita' || pattern === 'core') {
    return sessionParams.iso || sessionParams.compound;
  }
  return sessionParams.compound;
}

// Stima realistica del tempo (sec) di un esercizio: serie × esecuzione +
// (serie-1) × recupero (nessun recupero dopo l'ultima serie).
// DORMIENTE (29 mag): il riempimento bonus non è più tempo-based → non più
// chiamata. Tenuta come riferimento (vedi _trainGenComputeMaxExercises).
function _trainGenExerciseTimeCost(ex, sessionParams) {
  const p = _trainGenGetExerciseParams(ex, sessionParams) || {};
  const work = _TRAIN_GEN_TIME_BUDGET.set_execution_sec;
  const sets = Number(p.sets) || 0;
  const rest = Number(p.rest_sec) || 0;
  return sets * work + Math.max(0, sets - 1) * rest;
}

// Pesca UN isolamento dal pool per gruppo_target (Regola A), round-robin via
// sessionIndex, evitando duplicati. gruppo_target del catalogo è lista ';'.
// Ritorna null + warn se nessun candidato (NON crasha: sessione più corta).
function _trainGenPickIsoByGruppoTarget(pool, gruppoTarget, usedSoFar, sessionIndex, sessionLabel) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const target = String(gruppoTarget || '').toLowerCase().trim();
  if (!target) return null;
  const used = (usedSoFar instanceof Set) ? usedSoFar : new Set(usedSoFar || []);
  const candidates = pool.filter(ex => {
    // accetta isolamento (gruppi muscolari) E core (slot core fisso, 29 mag):
    // entrambi sono "iso obbligatori" pescati per gruppo_target.
    const p = _normPattern(ex.pattern);
    if (p !== 'isolamento' && p !== 'core') return false;
    if (used.has(ex.codice)) return false;
    const gt = String(ex.gruppo_target || '').toLowerCase()
      .split(';').map(s => s.trim()).filter(Boolean);
    return gt.includes(target);
  });
  if (candidates.length === 0) {
    console.warn(`[train-gen] iso obbligatorio non disponibile: gruppoTarget=${target}, sessione=${sessionLabel || '?'}`);
    return null;
  }
  candidates.sort((a, b) => String(a.codice || '').localeCompare(String(b.codice || '')));
  const idx = ((Number(sessionIndex) || 0) % candidates.length + candidates.length) % candidates.length;
  return candidates[idx];
}

// ───────────────────────────────────────────────────────────
// WARM-UP specifico per sessione (FASE 1, catalogo 123)
// ───────────────────────────────────────────────────────────

// _trainGenMapWarmupExercise — mappa una riga catalogo in un item di warm-up.
// Formato MINIMALE e self-contained (i testi del catalogo sono già puliti da
// _cleanCatalogText in BLOCCO 3). Carico leggero / alte reps / mai a cedimento:
// è prehab, non lavoro. Il RENDERING in app è demandato alla FASE 3 (countdown
// 1 min/esercizio + 10 s di pausa), che leggerà session.warmup[].
function _trainGenMapWarmupExercise(cat) {
  if (!cat) return null;
  const splitField = (s) => String(s || '').split(';').map(x => x.trim()).filter(Boolean);
  return {
    codice:       cat.codice,
    name:         cat.nome,
    eq:           String(cat.attrezzo || '').trim(),
    sets:         2,            // brief FASE 1: 1-2 serie → default 2
    reps:         '15-20',      // carico leggero, alte reps, mai a cedimento
    setup:        splitField(cat.setup),
    execution:    splitField(cat.esecuzione),
    commonErrors: splitField(cat.errori),
    muscles:      splitField(cat.muscoli),
    note:         'Riscaldamento · carico leggero, mai a cedimento',
    warmup:       true,         // marker: item di warm-up, non esercizio di lavoro
  };
}

// _trainGenPickWarmup — pesca UN esercizio di warm-up dal poolRiscaldamento per
// gruppo_target (es. 'cuffia rotatori'), round-robin via sessionIndex, evitando
// duplicati già scelti nel warm-up della stessa sessione (usedWarmup, opzionale).
// Ritorna null se nessun candidato (la sessione resta senza quel warm-up, no crash).
function _trainGenPickWarmup(pool, gruppoTarget, sessionIndex, usedWarmup) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const target = String(gruppoTarget || '').toLowerCase().trim();
  if (!target) return null;
  const used = (usedWarmup instanceof Set) ? usedWarmup : new Set(usedWarmup || []);
  const candidates = pool.filter(ex => {
    if (used.has(ex.codice)) return false;
    const gt = String(ex.gruppo_target || '').toLowerCase()
      .split(';').map(s => s.trim()).filter(Boolean);
    return gt.includes(target);
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => String(a.codice || '').localeCompare(String(b.codice || '')));
  const idx = ((Number(sessionIndex) || 0) % candidates.length + candidates.length) % candidates.length;
  return candidates[idx];
}

// _trainGenPickWarmupByMuscle — pesca UN esercizio di MOBILITÀ dal poolRiscaldamento
// matchando i MUSCOLI (substring), non il gruppo_target. Serve per il warm-up Lower
// (FASE 3): gli esercizi riscaldamento Lower (EX117 World's greatest, EX119 Slanci,
// EX120 Affondo con rotazione) hanno gruppo_target VUOTO ma muscoli popolati
// (anca/glutei/adduttori/ischiocrurali) → vanno pescati per muscolo.
// Restringe a pattern='mobilita' per escludere gli isolamenti prehab Upper (cuffia,
// Prone Y-W) che pure stanno nel poolRiscaldamento. Round-robin via sessionIndex,
// evita duplicati (usedWarmup). null se nessun candidato (no crash).
function _trainGenPickWarmupByMuscle(pool, muscleKeywords, sessionIndex, usedWarmup) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const kws = (Array.isArray(muscleKeywords) ? muscleKeywords : [])
    .map(k => String(k).toLowerCase().trim()).filter(Boolean);
  if (kws.length === 0) return null;
  const used = (usedWarmup instanceof Set) ? usedWarmup : new Set(usedWarmup || []);
  const candidates = pool.filter(ex => {
    if (used.has(ex.codice)) return false;
    if (_normPattern(ex.pattern) !== 'mobilita') return false; // solo mobilità (no iso prehab Upper)
    const musc = String(ex.muscoli || '').toLowerCase();
    return kws.some(k => musc.includes(k));
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => String(a.codice || '').localeCompare(String(b.codice || '')));
  const idx = ((Number(sessionIndex) || 0) % candidates.length + candidates.length) % candidates.length;
  return candidates[idx];
}

// ───────────────────────────────────────────────────────────
// CARRY CONCLUSIVO (FASE 2, catalogo 123)
// ───────────────────────────────────────────────────────────

// _trainGenMapCarryExercise — mappa una riga catalogo (loaded carry) in un item
// di "carry conclusivo": a fine sessione, DISTINTO dal Tabata. Campo separato
// `carry_conclusivo` (come `warmup`/`finisher`). Gestisce il surrogato casa
// (suitcase con elastico ancorato di lato, DA FERMO): se l'esercizio è entrato
// nel pool come surrogato (_surrogato=true), la nota_surrogato SOSTITUISCE il
// setup nativo e `eq` mostra l'attrezzo surrogato — stessa logica di
// _trainGenMapToSession. RENDERING in app demandato alla FASE 3.
function _trainGenMapCarryExercise(cat) {
  if (!cat) return null;
  const splitField = (s) => String(s || '').split(';').map(x => x.trim()).filter(Boolean);
  const isSurrogato = !!cat._surrogato;
  const notaSurrogato = (isSurrogato && cat.nota_surrogato) ? String(cat.nota_surrogato).trim() : '';
  return {
    codice:       cat.codice,
    name:         cat.nome,
    eq:           (isSurrogato && cat.surrogato_attrezzo)
                    ? String(cat.surrogato_attrezzo).trim()
                    : String(cat.attrezzo || '').trim(),
    sets:         3,
    // Versione camminata: distanza. Versione surrogata casa (elastico, DA FERMO):
    // tenuta isometrica a tempo per lato. parseRepsRange riconosce 'sec'.
    reps:         isSurrogato ? '20-30 sec per lato' : '30-40 m',
    setup:        (isSurrogato && notaSurrogato) ? splitField(notaSurrogato) : splitField(cat.setup),
    execution:    splitField(cat.esecuzione),
    commonErrors: splitField(cat.errori),
    muscles:      splitField(cat.muscoli),
    note:         'Carry conclusivo · core, grip e postura · non a cedimento',
    isSurrogato:  isSurrogato || undefined,
    carry:        true,        // marker: item di carry conclusivo
  };
}

// _trainGenBuildTabata — costruisce l'oggetto finisher Tabata per una sessione.
// (28 mag sera 2026) Tabata vero: 4 esercizi cardio_metabolico distinti che si
// alternano su 8 round × 20s ON / 10s OFF. Round-robin via sessionIndex per
// produrre Tabata diversi tra Upper A/Upper B (e Lower A/Lower B).
// Cautele zone_rischio applicate. Esercizi scartati dalle cautele → ridotti
// in numero (4 minimi, accetta meno se pool ridotto post-cautele).
// Ritorna oggetto finisher o null se pool insufficiente.
function _trainGenBuildTabata({ poolTabata, limitazioni, catalogMap, ammissibili, sessionIndex, sessionType }) {
  if (!Array.isArray(poolTabata) || poolTabata.length === 0) {
    console.warn(`[train-gen] tabata: poolFinisherTabata vuoto per ${sessionType}`);
    return null;
  }
  // Cautele sui cardio (es. lombare/ginocchia di Ignazio → adattamento ROM)
  const cautelati = _trainGenApplyCautions(poolTabata, limitazioni, catalogMap, ammissibili);
  if (cautelati.length === 0) {
    console.warn(`[train-gen] tabata: tutti i cardio scartati dalle cautele per ${sessionType}`);
    return null;
  }
  // Pesca 4 esercizi distinti con round-robin (riusa pattern _trainGenPickByPattern).
  // Sort deterministico per codice → seleziona [sessionIndex % len], [...], evita duplicati.
  cautelati.sort((a, b) => String(a.ex.codice || '').localeCompare(String(b.ex.codice || '')));
  const used = new Set();
  const picked = [];
  for (let i = 0; i < 4; i++) {
    const remaining = cautelati.filter(w => !used.has(w.ex.codice));
    if (remaining.length === 0) break; // pool esaurito
    const idx = (((Number(sessionIndex) || 0) + i) % remaining.length + remaining.length) % remaining.length;
    const chosen = remaining[idx];
    used.add(chosen.ex.codice);
    picked.push(chosen);
  }
  if (picked.length === 0) {
    console.warn(`[train-gen] tabata: nessun esercizio selezionato per ${sessionType}`);
    return null;
  }
  // Mappa al formato JSON output: campi essenziali per il renderer Tabata.
  // alert combinato (cautele + nota_surrogato se applicabile) per ogni esercizio.
  const splitField = (s) => String(s || '').split(';').map(x => x.trim()).filter(Boolean);
  const exercises = picked.map(w => {
    const cat = w.ex;
    const cautionNote = w.cautionNote ? String(w.cautionNote).trim() : '';
    const notaSicurezza = String(cat.nota_sicurezza || '').trim();
    const alertParts = [];
    if (notaSicurezza) alertParts.push(notaSicurezza);
    if (cautionNote)   alertParts.push(cautionNote);
    return {
      codice: cat.codice,
      name:   cat.nome,
      setup:        splitField(cat.setup),
      execution:    splitField(cat.esecuzione),
      commonErrors: splitField(cat.errori),
      muscles:      splitField(cat.muscoli),
      ...(alertParts.length ? { alert: alertParts.join(' · ') } : {}),
    };
  });
  return {
    type:     'tabata',
    work_sec: 20,
    rest_sec: 10,
    round:    8,
    exercises,
  };
}

function _trainGenOrderExercises(items) {
  // Ordering fisso PARTE 5: compound → isolamento/mobilita → core.
  // Accetta sia esercizi puri sia wrapper {ex, action, ...} (post-cautele).
  // Sub-sort per codice (stabile, deterministico).
  //
  // NB: PARTE 5 distingue anche "complementari al centro", ma il catalogo
  // attuale non ha un pattern dedicato (sarebbe sotto-categoria del
  // compound). Per ora compound e complementari ricadono nella stessa
  // priorità 1 → ordinati alfabeticamente. Affinamento = TODO futuro
  // (richiede campo dedicato sul catalogo, es. `intensita_compound`).
  // Vocabolario catalogo Sheet (Opzione 3 utente 28 mag 2026):
  // chiavi con spazi, 'dominante ginocchia' plurale, 'mobilita' senza accento.
  const PRIORITY = {
    'spinta orizzontale': 1, 'spinta verticale': 1,
    'tirata orizzontale': 1, 'tirata verticale': 1,
    'dominante ginocchia': 1, 'dominante anca': 1,
    'isolamento': 2,
    'mobilita': 2,
    'core': 3,
  };
  const getEx = (item) => (item && item.ex) ? item.ex : item;
  const getPriority = (item) => {
    const ex = getEx(item);
    return PRIORITY[_normPattern(ex.pattern)] || 2; // pattern sconosciuto → priorità media
  };
  const getCodice = (item) => String(getEx(item).codice || '');

  return [...(items || [])].sort((a, b) => {
    const pA = getPriority(a), pB = getPriority(b);
    if (pA !== pB) return pA - pB;
    return getCodice(a).localeCompare(getCodice(b));
  });
}

function _trainGenApplyCautions(exercises, limitazioni, catalogMap, ammissibili) {
  // Applica le cautele utente in modo 100% DETERMINISTICO (mai AI).
  //
  // ammissibili (opzionale): Set di codici che hanno superato i filtri
  // luogo/attrezzo/livello (_trainGenFilterPool). Se passato, un'alternativa
  // FUORI dal Set viene skippata come 'alternative-not-eligible' — evita che
  // la sostituzione porti in scheda un esercizio solo-palestra a un utente
  // casa (catalogMap è il catalogo COMPLETO non filtrato). Se assente,
  // comportamento storico invariato (retrocompatibile).
  // Per ogni esercizio: intersect(limitazioni utente, zone_rischio esercizio).
  //   - intersezione vuota → keep inalterato
  //   - intersezione non vuota:
  //       (a) `adattamento` presente → keep + propaga adattamento come alert
  //       (b) `alternativa` presente nel catalogMap → sostituisci con essa
  //           (con re-check cautele sull'alternativa, max 1 livello: se
  //            anche l'alternativa ha conflitto e non si adatta → skip)
  //       (c) né adattamento né alternativa → skip + log warning
  //
  // Ritorna array di wrapper:
  //   { ex, action, cautionNote, originalCodice?, conflict[]? }
  //   action ∈ { 'keep', 'adapt', 'substitute', 'substitute-and-adapt' }
  //   Esercizi skippati: esclusi dall'output (la sessione resta più corta).
  //
  // Caso edge alternativa→alternativa: protezione anti-loop via parametro
  // depth (1 al primo tentativo, 0 sull'alternativa: nessuna ulteriore
  // sostituzione, solo adatta-o-skip).
  const limSet = new Set(
    (Array.isArray(limitazioni) ? limitazioni : [])
      .map(l => String(l).toLowerCase().trim())
      .filter(Boolean)
  );

  const getConflitto = (ex) => {
    const zone = String(ex.zone_rischio || '').toLowerCase()
      .split(';').map(s => s.trim()).filter(Boolean);
    return zone.filter(z => limSet.has(z));
  };

  // Risolve un singolo esercizio.
  // depth=1 al primo tentativo (può sostituire), depth=0 sull'alternativa.
  const resolve = (ex, depth) => {
    if (limSet.size === 0) return { kind:'keep', ex };
    const conflict = getConflitto(ex);
    if (conflict.length === 0) return { kind:'keep', ex };

    // Branch (a) adatta
    const adattamento = String(ex.adattamento || '').trim();
    if (adattamento) {
      return { kind:'adapt', ex, adattamento, conflict };
    }

    // Branch (b) sostituisci — solo al primo livello, e solo se l'alternativa
    // esiste nel catalogo (validazione obbligatoria del codice)
    const altCodice = String(ex.alternativa || '').trim();
    if (depth > 0 && altCodice) {
      const altEx = catalogMap.get(altCodice);
      if (!altEx) {
        console.warn(`[train-gen] alternativa '${altCodice}' di '${ex.codice}' non trovata nel catalogMap → skip`);
        return { kind:'skip', reason:'alternative-not-found', ex, conflict };
      }
      // L'alternativa deve superare gli stessi filtri luogo/attrezzo/livello
      // dell'utente: fuori dal Set ammissibili → skip (stesso flusso not-found).
      if (ammissibili && !ammissibili.has(altCodice)) {
        console.warn(`[train-gen] alternativa '${altCodice}' di '${ex.codice}' non ammissibile per ambiente/attrezzi/livello utente → skip`);
        return { kind:'skip', reason:'alternative-not-eligible', ex, conflict };
      }
      // Ricontrolla l'alternativa una sola volta (depth=0 → no sostituzione).
      const altResolved = resolve(altEx, 0);
      if (altResolved.kind === 'keep') {
        return { kind:'substitute', ex: altEx, original: ex, conflict };
      }
      if (altResolved.kind === 'adapt') {
        return { kind:'substitute-and-adapt', ex: altEx, original: ex,
                 adattamento: altResolved.adattamento, conflict };
      }
      // L'alternativa stessa è in conflitto e non si adatta → skip totale.
      console.warn(`[train-gen] alternativa '${altCodice}' di '${ex.codice}' anch'essa in conflitto e non adattabile → skip`);
      return { kind:'skip', reason:'alternative-also-conflicts', ex, conflict };
    }

    // Branch (c) skip
    console.warn(`[train-gen] '${ex.codice}' in conflitto con [${conflict.join(',')}] e niente adattamento né alternativa → skip`);
    return { kind:'skip', reason:'no-adaptation-no-alternative', ex, conflict };
  };

  // Applica resolve a ogni esercizio + costruisce i wrapper finali
  const output = [];
  (exercises || []).forEach(ex => {
    const r = resolve(ex, 1);
    if (r.kind === 'keep') {
      output.push({ ex: r.ex, action: 'keep', cautionNote: null });
    } else if (r.kind === 'adapt') {
      output.push({ ex: r.ex, action: 'adapt', cautionNote: r.adattamento, conflict: r.conflict });
    } else if (r.kind === 'substitute') {
      output.push({ ex: r.ex, action: 'substitute', cautionNote: null,
                    originalCodice: r.original.codice, conflict: r.conflict });
    } else if (r.kind === 'substitute-and-adapt') {
      output.push({ ex: r.ex, action: 'substitute-and-adapt', cautionNote: r.adattamento,
                    originalCodice: r.original.codice, conflict: r.conflict });
    }
    // skip → escluso dall'output (sessione più corta)
  });

  return output;
}

function _trainGenMapToSession(wrappers, sessionMeta, sessionParams, finisher, tipoAllen, attrezzaturaSet) {
  // Mapping al formato TRAINING_SESSIONS:
  //   sessione top-level: { id, name, type, rir, label, rest, exercises[],
  //                         duration_min, finisher? }
  //   esercizio: { codice, name, sets, reps, eq, setup[], execution[],
  //                commonErrors[], muscles[], alert?, iso?, isSurrogato? }
  //   finisher (NUOVO 28 mag sera 2026): oggetto Tabata separato
  //     { type:'tabata', work_sec:20, rest_sec:10, round:8, exercises:[4 cardio] }
  //     Vedi _trainGenBuildTabata.
  //
  // Replica ESATTAMENTE i nomi campo esistenti in TRAINING_SESSIONS — il
  // modulo Training di lettura (Mossa 3) userà gli stessi accessor.
  // Aggiunge solo `codice` (tracciabilità catalogo), `isSurrogato` (versione
  // casalinga di esercizi palestra; la nota_surrogato diventa il `setup`, non è
  // più un campo separato), `replacedFromCodice` (cautele).
  // RIMOSSO `isFinisher` dagli esercizi: il finisher è ora oggetto separato.
  //
  // ALERT propagazione: nota_sicurezza intrinseca dell'esercizio (sempre
  // presente nel catalogo per esercizi con warning) UNITA a cautionNote
  // (adattamento personalizzato dalle cautele). Separatore ' · '.
  // Se nessuno dei due è presente: alert omesso dal JSON.

  const splitField = (s) => String(s || '').split(';').map(x => x.trim()).filter(Boolean);

  const exercises = (wrappers || []).map(w => {
    const cat = w.ex;
    const isSurrogato = !!cat._surrogato;
    const cautionNote = w.cautionNote ? String(w.cautionNote).trim() : '';
    const notaSicurezza = String(cat.nota_sicurezza || '').trim();
    // Nota surrogato: propagata SOLO se l'esercizio è stato matchato come
    // surrogato da _trainGenFilterPool (flag _surrogato sul wrapper).
    // Spiega all'utente "come farlo a casa" con gli attrezzi che ha.
    // (29 mag) NON va più nell'alert né in un campo separato: SOSTITUISCE il
    // setup nativo (vedi sotto), così non compare duplicata.
    const notaSurrogato = (isSurrogato && cat.nota_surrogato)
      ? String(cat.nota_surrogato).trim() : '';

    // Alert combinato (separatore ' · '):
    //   nota_sicurezza intrinseca + cautionNote (se cautele zone_rischio).
    // Vuoti omessi. Se tutti vuoti → alert omesso dal JSON.
    const alertParts = [];
    if (notaSicurezza) alertParts.push(notaSicurezza);
    if (cautionNote)   alertParts.push(cautionNote);
    const alert = alertParts.length ? alertParts.join(' · ') : null;

    // Regola B (28 mag) + Fix 1 (29 mag): parametri PER-ESERCIZIO (compound vs
    // iso vs iso_isometrico), non più unici di sessione. Compound 4 serie, iso 3.
    // iso_isometrico → reps in secondi ("30-45 sec") così il reader nasconde la
    // pill RIR e il logger passa a durata (parseRepsRange kind='seconds').
    const exParams = _trainGenGetExerciseParams(cat, sessionParams) || {};
    const sets = exParams.sets;
    // Esercizi unilaterali → " per lato" in coda alle reps (sia range secondi
    // che range reps), così il volume è esplicito. parseRepsRange lo riconosce.
    const reps = (exParams.durationBased
      ? `${exParams.reps_min}-${exParams.reps_max} sec`
      : `${exParams.reps_min}-${exParams.reps_max}`)
      + (_TRAIN_GEN_UNILATERAL.includes(cat.codice) ? ' per lato' : '');

    // iso flag = recupero corto in getRestSec(). Vero per OGNI esercizio che
    // NON usa i parametri compound (isolamento, mobilita, core, isometrico):
    // così Plank/Dead bug ricevono recupero breve invece di quello compound.
    const iso = exParams !== sessionParams.compound;

    const exObj = {
      codice: cat.codice,
      name:   cat.nome,
      sets,
      reps,
      // eq mostrato nella card Training: UN solo attrezzo scelto da _trainGenPickEq
      // in base all'ambiente e alla dotazione utente (no più lista grezza del catalogo).
      eq: _trainGenPickEq(cat, isSurrogato, tipoAllen || 'casa', attrezzaturaSet || new Set(), !!iso),
      // Surrogato: la nota_surrogato SOSTITUISCE il setup nativo (il setup del
      // catalogo descrive la versione palestra → fuorviante per chi usa l'elastico).
      setup:        (isSurrogato && notaSurrogato) ? splitField(notaSurrogato) : splitField(cat.setup),
      execution:    splitField(cat.esecuzione),
      commonErrors: splitField(cat.errori),
      muscles:      splitField(cat.muscoli),
    };
    if (iso)         exObj.iso = true;
    if (alert)       exObj.alert = alert;
    // isSurrogato serve ancora per `eq` (mostra surrogato_attrezzo) e
    // tracciabilità. La nota_surrogato non è più un campo separato: è il setup.
    if (isSurrogato) exObj.isSurrogato = true;
    // Traceability: se è stato sostituito tramite cautele
    if (w.originalCodice) exObj.replacedFromCodice = w.originalCodice;

    // Parametri per-esercizio anche nel JSON (self-describing): il reader
    // mostra la pill RIR dal valore di SESSIONE e calcola il recupero via
    // getRestSec, quindi questi campi sono informativi/future-proof e non
    // alterano il comportamento attuale del modulo Training.
    exObj.rir = (exParams.rir !== undefined) ? exParams.rir : null;
    if (exParams.rest_sec !== undefined) exObj.rest_sec = exParams.rest_sec;
    // isTimed (Fix 1): chiarezza diagnostica. La UI nasconde la pill RIR già da
    // sé quando reps termina in " sec" (parseRepsRange.kind==='seconds').
    if (exParams.durationBased) { exObj.durationBased = true; exObj.isTimed = true; }

    return exObj;
  });

  const result = {
    id:    sessionMeta.id,
    name:  sessionMeta.name,
    type:  sessionMeta.type,
    rir:   sessionMeta.rir,
    label: sessionMeta.label,
    rest:  sessionMeta.rest,
    duration_min: sessionMeta.duration_min,
    exercises,
  };
  // Finisher Tabata: oggetto separato (vedi _trainGenBuildTabata).
  // Aggiunto solo se la sessione ha addFinisher=true e il pool tabata era popolato.
  if (finisher && finisher.type) result.finisher = finisher;
  return result;
}

function _trainGenValidateCodes(sessioni, catalogMap) {
  // Sanity check finale: ogni esercizio in ogni sessione deve avere un
  // `codice` che esista nel catalogMap. Esercizi fantasma (codice mancante
  // o non in catalogo) vengono ESCLUSI con warning.
  //
  // Approccio A: il rischio è basso (selezioniamo dal pool reale già in
  // BLOCCO 5), ma è rete di sicurezza obbligatoria — vincolo esplicito
  // del brief utente. Mai throw: in caso di anomalia la scheda esce
  // più povera, NON crasha il flusso.
  return (sessioni || []).map(s => {
    const cleaned = (s.exercises || []).filter(ex => {
      if (!ex || !ex.codice) {
        console.warn(`[train-gen] esercizio senza codice in sessione '${s.id}' → escluso`);
        return false;
      }
      if (!catalogMap.has(ex.codice)) {
        console.warn(`[train-gen] codice fantasma '${ex.codice}' in sessione '${s.id}' → escluso`);
        return false;
      }
      return true;
    });
    return { ...s, exercises: cleaned };
  });
}

async function _trainGenAINote(profile, schedaMeta) {
  // Una sola chiamata callAI(~150 token) per nota motivazionale voce coach.
  // Italiano, prima persona plurale, max 2-3 frasi, no preamboli, no
  // termini tecnici (DUP/RIR/RPE/pattern). Stesso pattern del postino F.1.
  //
  // Try/catch: se callAI fallisce o ritorna vuoto/whitespace →
  // _TRAIN_GEN_FALLBACK_REASONING. Mai throw.
  const OBJ_DISPLAY = {
    forza_performance: 'forza e performance',
    ipertrofia:        'ipertrofia',
    dimagrimento:      'dimagrimento',
    ricomposizione:    'ricomposizione',
    longevita:         'longevità',
    mantenimento:      'mantenimento',
  };
  const obiettivoLeggibile = OBJ_DISPLAY[schedaMeta.obiettivo] || schedaMeta.obiettivo || 'allenamento';
  const nomeUtente = (profile && profile.first_name) ? ` ${profile.first_name}` : '';
  const ritratto = await coachRitrattoPronto();

  const prompt = `Sei Pirsi, il coach di forza e ipertrofia che parla DIRETTAMENTE all'utente${nomeUtente}. Parla sempre in prima persona: non nominarti in terza persona, non firmarti, non ripetere il tuo nome nel testo.

REGISTRO (vale sempre): parli come un amico diretto e schietto. Quando i dati sono buoni lo dici senza enfasi. Quando sono cattivi dici prima il fatto, poi una riga di spinta: il fatto non va nascosto dietro la frase di incoraggiamento, e non ti fermi al fatto nudo. Resta concreto: se hai numeri o eventi reali usa quelli, invece di riempire con frasi motivazionali generiche.

ESEMPIO DI TONO — è un modello di VOCE, non di contenuto. I numeri, gli alimenti e i fatti che contiene sono inventati per l'esempio: non riutilizzarli, usa solo i dati che trovi in questo prompt.
"Nuovo blocco, 5 giorni a settimana. Le prime due sessioni ti sembreranno pesanti, è normale. Al check di fine blocco vediamo cosa è cambiato."
Cosa fa questa voce: dice un fatto concreto prima di dare il consiglio; sceglie una cosa invece di offrirne tre; non chiude con una frase motivazionale generica.

${ritratto}

Dati della nuova scheda:
- Obiettivo: ${obiettivoLeggibile}
- Giorni di allenamento a settimana: ${schedaMeta.giorni}
- Tipo di sessione: ${schedaMeta.volume === 'essenziale' ? 'essenziale (solo i fondamentali)' : 'completa (fondamentali + rifiniture)'}
- Numero sessioni nella scheda: ${schedaMeta.sessioniCount}

Scrivi una breve nota che annuncia la nuova scheda di allenamento.

REGOLE:
- Italiano, no preamboli ("Ciao!", "Ecco la tua scheda...")
- Il "noi" solo per il lavoro fatto insieme ("abbiamo costruito", "ripartiamo"); corpo, progressi e risultati sono dell'utente e vanno al "tuo", mai al "nostro"
- Puoi citare i giorni a settimana
- Promette evoluzione blocco dopo blocco grazie ai check fisici
- Se c'è un infortunio in corso o un rientro graduale, la nota ne tiene conto: niente toni da ripartenza a tutto gas
- Max 2-3 frasi totali
- No elenchi puntati, no parentesi tecniche
- VIETATO usare termini tecnici come DUP, RIR, RPE, "pattern motorio", "split"

Scrivi SOLO la nota, niente altro.`;

  try {
    const txt = await callAI(prompt, 150);
    const cleaned = String(txt || '').trim();
    if (!cleaned) {
      console.warn('[train-gen] AI nota vuota → fallback');
      return _TRAIN_GEN_FALLBACK_REASONING;
    }
    return cleaned;
  } catch (e) {
    console.warn('[train-gen] AI nota errore → fallback:', (e && e.message) || e);
    return _TRAIN_GEN_FALLBACK_REASONING;
  }
}

async function _trainGenSaveToDB(userId, scheda) {
  // Salvataggio in tabella `schede_utente` (Supabase).
  //
  // ORDINE OPERAZIONI (concordato con utente, sfrutta muro DB):
  //   1. UPDATE schede_utente SET attiva=false WHERE user_id=? AND attiva=true
  //      → spegne eventuali schede precedentemente attive
  //   2. INSERT nuova riga {user_id, blocco_n, scheda, attiva:true}
  //      → il muro DB uq_schede_utente_una_attiva (UNIQUE PARTIAL su
  //        user_id WHERE attiva=true) garantisce max 1 attiva per utente
  //
  // ERROR HANDLING (mai throw, sempre return {ok, ...}):
  //   - Deactivate fallisce → log warning, prosegui all'INSERT (best-effort;
  //     il muro DB ci proteggerà se il problema è una previous active rimasta)
  //   - INSERT con unique violation (23505) → race cross-device, l'altro
  //     dispositivo ha già preparato la scheda. Toast informativo + ok:false
  //   - INSERT con altri errori → toast errore + ok:false
  //   - Exception generica → toast errore + ok:false
  //
  // Toast voce coach (~5500ms, coerente con postino F.1 Nutrition):
  //   - Success (prima scheda)    → "<COACH_NAME> ha preparato la tua prima
  //                                  scheda di allenamento" 🏋️
  //   - Success (schede successive) → "<COACH_NAME> ha preparato la tua nuova
  //                                    scheda di allenamento" 🏋️
  //   - Race cross-device          → "La tua scheda è già pronta — apri di nuovo
  //                                   l'app" ℹ️
  //   - Errore generico            → "Non sono riuscito a preparare la scheda —
  //                                   riprova più tardi" ⚠️
  //
  // RETURN: { ok:true, id, blocco_n } oppure { ok:false, reason }

  // Calcola blocco_n incrementale: count esistenti + 1.
  // Per il primo trigger (onboarding) sarà sempre 1.
  // Per trigger futuri (post-M2) sarà 2, 3, ... blocco N.
  let bloccoN = 1;
  try {
    const { count, error: countErr } = await supa
      .from('schede_utente')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (!countErr && Number.isFinite(count)) {
      bloccoN = (count || 0) + 1;
    } else if (countErr) {
      console.warn('[train-gen] save: count blocco_n fallito, default 1 →', countErr.message);
    }
  } catch (e) {
    console.warn('[train-gen] save: count blocco_n eccezione, default 1 →', (e && e.message) || e);
  }
  const isFirstSchema = (bloccoN === 1);

  // Step 1: deactivate previous active (best-effort)
  try {
    const { error: updErr } = await supa
      .from('schede_utente')
      .update({ attiva: false })
      .eq('user_id', userId)
      .eq('attiva', true);
    if (updErr) {
      console.warn('[train-gen] save: deactivate previous fallito:', updErr.message);
      // Proseguiamo all'INSERT: il muro DB unique constraint farà rete
      // di sicurezza se serve.
    }
  } catch (e) {
    console.warn('[train-gen] save: deactivate eccezione:', (e && e.message) || e);
  }

  // Step 2: INSERT nuova riga attiva
  try {
    // Strip _diag (diagnostica Regola A) dalle sessioni + _diagGear (attrezzi
    // inerti) dalla radice prima del save: restano nel valore di ritorno
    // (ztSchedaWhy) ma NON sporcano il jsonb in DB.
    const { _diagGear, ...schedaNoGear } = (scheda || {});
    const schedaClean = (scheda && Array.isArray(scheda.sessioni))
      ? { ...schedaNoGear, sessioni: scheda.sessioni.map(({ _diag, ...rest }) => rest) }
      : schedaNoGear;
    const payload = {
      user_id: userId,
      blocco_n: bloccoN,
      scheda: schedaClean,
      attiva: true,
    };
    const { data, error: insErr } = await supa
      .from('schede_utente')
      .insert(payload)
      .select('id, blocco_n')
      .single();

    if (insErr) {
      // Unique violation 23505 = race cross-device (altro dispositivo ha già
      // preparato la scheda. Tipico se l'utente apre l'app contemporaneamente
      // su iPhone e iPad post-onboarding).
      const isUniqueViolation = insErr.code === '23505'
        || /unique|duplicate/i.test(insErr.message || '');
      if (isUniqueViolation) {
        console.warn('[train-gen] save: INSERT unique violation (race cross-device):', insErr.message);
        try { showToast("La tua scheda è già pronta — apri di nuovo l'app", 'ℹ️', 5500); } catch(_) {}
        return { ok: false, reason: 'unique-violation-race' };
      }
      console.warn('[train-gen] save: INSERT errore:', insErr.message);
      try { showToast('Non sono riuscito a preparare la scheda — riprova più tardi', '⚠️', 5500); } catch(_) {}
      return { ok: false, reason: 'insert-error' };
    }

    // Successo!
    const successMsg = isFirstSchema
      ? COACH_NAME + ' ha preparato la tua prima scheda di allenamento'
      : COACH_NAME + ' ha preparato la tua nuova scheda di allenamento';
    try { showToast(successMsg, '🏋️', 5500); } catch(_) {}
    return { ok: true, id: data && data.id, blocco_n: data && data.blocco_n };

  } catch (e) {
    console.warn('[train-gen] save: INSERT eccezione:', (e && e.message) || e);
    try { showToast('Non sono riuscito a preparare la scheda — riprova più tardi', '⚠️', 5500); } catch(_) {}
    return { ok: false, reason: 'exception' };
  }
}

function _trainGenParseEsperienzaFromNote(noteSalute) {
  // Parsa note_salute per ricavare esperienza + limitazioni quando
  // ST.m1Data non è disponibile (trigger post-M2, ztTestGeneraScheda
  // manual-test, ?schedaGen=1 URL, futuri trigger blocco N+1).
  //
  // Formato canonico atteso (prodotto da saveOnboarding M1, riga ~4980):
  //   "<segmenti liberi opzionali> · Esperienza: <valore> ·
  //    Limitazioni: <csv comma-separated> · Altre condizioni: ... ·
  //    Altre intolleranze: ..."
  // Separatore segmenti: ' · ' (spazio + bullet U+00B7 + spazio).
  // Segmenti aggiuntivi liberi (es. 'ferritina bassa') vengono IGNORATI
  // senza rompere il parsing.
  //
  // Robustezza:
  //   - case-insensitive (gestisce ESPERIENZA: AVANZATO)
  //   - tollera spazi extra (Esperienza : avanzato)
  //   - ordine segmenti libero (Limitazioni prima di Esperienza ok)
  //   - segmenti mancanti → null / [] (mai throw)
  //   - input null/'' → output di default
  //   - sezione Limitazioni terminata dal prossimo ' · ' o fine stringa
  //
  // Ritorna: { esperienza: string|null, limitazioni: string[] }
  //   esperienza valori attesi: 'principiante'/'intermedio'/'avanzato'/
  //   'ritorno-allenamento' (lowercase normalizzato).
  //   Il chiamante mappa via _TRAIN_GEN_EXPERIENCE_MAP a livello catalogo.
  const out = { esperienza: null, limitazioni: [] };
  if (!noteSalute) return out;
  const s = String(noteSalute);

  // Esperienza: parola con lettere accentate e trattini (cattura
  // 'ritorno-allenamento' che ha trattino interno).
  const mEsp = s.match(/Esperienza\s*:\s*([a-zàèéìòù\-]+)/i);
  if (mEsp && mEsp[1]) {
    out.esperienza = mEsp[1].toLowerCase().trim();
  }

  // Limitazioni: cattura tutto dopo 'Limitazioni:' fino al prossimo
  // separatore ' · ' o newline o fine stringa. Split su virgola.
  const mLim = s.match(/Limitazioni\s*:\s*([^·\n]+)/i);
  if (mLim && mLim[1]) {
    out.limitazioni = mLim[1].split(',')
      .map(x => x.trim().toLowerCase())
      .filter(Boolean);
  }

  return out;
}

// ───────────────────────────────────────────────────────────
// DIAGNOSTICA / FORZATURE COLLAUDO (Step 3.16)
// ───────────────────────────────────────────────────────────
//   window.ztTestGeneraScheda()   — forza generazione PIPELINE REALE
//                                   (scrive DB). Bypassa solo "test mode"
//                                   e "dati incompleti" via force=true.
//   window.ztSchedaWhy()          — dry-run + console.table delle decisioni
//                                   intermedie. NON chiama AI né scrive DB.
//   ?schedaGen=1   — flag URL: equivalente a ztTestGeneraScheda al boot
//                    (agganciato in loadAndStart, dopo postino Nutrition).
//   ?schedaDebug=1 — flag URL: setta window._trainGenDebug=true (verbose
//                    log future-proof; ad oggi i log [train-gen] sono
//                    già emessi sempre, marker per evoluzioni future).

// Handler URL force: chiamato nei 3 rami di loadAndStart subito dopo il
// postino Nutrition. Fire-and-forget, mai bloccante.
async function _trainGenMaybeForceFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('schedaDebug')) {
      window._trainGenDebug = true;
    }
    if (!params.has('schedaGen')) return;
    setTimeout(function() {
      generateTrainingProgram({ source: 'url-force', force: true })
        .catch(e => console.warn('[train-gen][force-url] errore:', (e && e.message) || e));
    }, 200);
  } catch (e) {
    console.warn('[train-gen][force-url] eccezione:', (e && e.message) || e);
  }
}

// Diagnostica console: pipeline reale (scrive DB)
window.ztTestGeneraScheda = async function() {
  const r = await generateTrainingProgram({ source: 'manual-test', force: true });
  return r;
};

// Diagnostica console: dry-run + console.table, no DB no AI
window.ztSchedaWhy = async function(opts = {}) {
  const scheda = await generateTrainingProgram({
    source: 'why-diagnostic', force: true, dryRun: true,
    giorniOverride: (opts && opts.giorni != null) ? opts.giorni : null
  });
  if (!scheda) {
    console.warn('[ztSchedaWhy] nessuna scheda generata — vedi log [train-gen] sopra per il guard fallito');
    return null;
  }
  console.table({
    obiettivo:        scheda.obiettivo,
    esperienza:       scheda.esperienza,
    livello_mappato:  scheda.livello_mappato,
    tipo_allenamento: scheda.tipo_allenamento,
    attrezzatura:     (scheda.attrezzatura || []).join(','),
    attrezzi_inerti:  (scheda._diagGear || []).join(',') || '—',
    giorni:           scheda.giorni_allenamento,
    volume:           scheda.volume_sessione,
    sessioni_count:   (scheda.sessioni || []).length,
  });
  console.table(
    (scheda.sessioni || []).map(s => ({
      id:           s.id,
      name:         s.name,
      type:         s.type,
      rir:          s.rir,
      rest:         s.rest,
      duration_min: s.duration_min,
      esercizi:     (s.exercises || []).length,
      codici:       (s.exercises || []).map(e => e.codice).join(','),
    }))
  );
  console.table(
    (scheda.sessioni || []).map(s => {
      const d = s._diag || {};
      const _coreCell = (c) => {
        if (!c || !c.gruppo) return null;
        const short = String(c.gruppo).replace('core anti-', 'anti-');
        return c.kept ? `${c.codice} (${short})`
          : (c.skippedTime ? `SKIP tempo (${short})` : `NON DISP. (${short})`);
      };
      const coreCol = [_coreCell(d.core), _coreCell(d.core2)].filter(Boolean).join(' + ') || 'nessuno';
      return {
        sessione:        s.name,
        tipo:            s.type,
        compound:        d.compoundN != null ? d.compoundN : '?',
        iso_muscolari:   (d.obbligatoriKept || []).join(', ') || '—',
        core:            coreCol,
        tagliati_tempo:  (d.obbligatoriCut || []).join(', ') || '—',
        iso_bonus:       d.bonusN != null ? d.bonusN : 0,
        tot_esercizi:    (s.exercises || []).length,
      };
    })
  );
  return scheda;
};

// Diagnostica pattern picker (Fix 29 mag): dry-run con log dettagliato di
// _trainGenFilterPool (esclusioni luogo/attrezzo/livello) e _trainGenPickByPattern
// (candidati nel pool, già usati, scelto). NON scrive DB, NON chiama AI.
// Esempio: await ztTrainGenPatternPick('lower') → poi filtra i log [lower_*]/[train-gen][pick].
window.ztTrainGenPatternPick = async function(splitTypeFilter) {
  const prev = window._trainGenDebug;
  window._trainGenDebug = true;
  try {
    return await generateTrainingProgram({ source: 'pattern-pick-diag', force: true, dryRun: true });
  } finally {
    window._trainGenDebug = prev;
  }
};

// ───────────────────────────────────────────────────────────
// Hook in saveOnboarding (Step 3.17):
//   Subito DOPO checkLowKcalAndWarn e PRIMA del branch
//   opts.skipM2 / loadAndStart_thenM2Entry, aggiungere:
//
//     if (usaTraining === true) {
//       try { await generateTrainingProgram({source:'onboarding'}); }
//       catch(e) { console.warn('[train-gen] onboarding hook failed:', e); }
//     }
//
//   Generazione fire-and-forget: errore NON deve bloccare l'avanzamento
//   verso M2. La scheda è un add-on (stesso pattern del postino F.1).
// TODO Step 3.17
