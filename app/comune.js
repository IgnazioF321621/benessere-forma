// ═══════════════════════════════════════
// app/comune.js — le funzioni comuni a tutta l'app (Fondamenta 035, tappa 3, 2 ottobre 2026)
// ═══════════════════════════════════════
// Lo stato (ST), le date e i formati, dbq e la lettura a pagine, la raccolta degli errori,
// gli avvisi a schermo. Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO il suo primo blocco (configurazione, versione, nome del coach,
// app chiusa per lavori) e PRIMA di tutto il resto: qui non si usa al caricamento niente
// che sia scritto più avanti nella pagina (lo controlla tools/banco/prova_ordine_caricamento.js).

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const ST = {
  user: null,
  profile: null,
  TARGET: {kcal:1900, protein:143, carbs:190, fat:63},
  page: 'oggi',
  activeDay: todayKey(),
  // Qual era "oggi" l'ultima volta che l'app ha guardato l'orologio. Serve a
  // capire, al risveglio, se activeDay stava seguendo il giorno corrente o se
  // l'utente si era parcheggiato apposta su un giorno passato. Vedi
  // _allineaGiornoCorrente().
  dayAnchor: todayKey(),
  db: {days:{}},
  supps: [],
  logSlot: 'colazione',
  logText: '',
  logTime: '',
  logLoading: false,
  logError: '',
  logOpen: false,
  advice: '',
  advLoading: false,
  nextSlot: 'pranzo',
  // Nuovo M1 onboarding (9 schermate: welcome + auth-email + auth-otp + 7 step)
  m1AuthState: 'welcome',   // 'welcome' | 'email' | 'otp'
  m1Step: 's1',             // 's1'..'s7' (dentro #onboarding-screen)
  m1OtpCells: ['','','','','',''],
  m1OtpResendIn: 0,         // secondi residui prima del resend abilitato
  // Modalità anteprima onboarding (25 mag 2026, sera): se true, la schermata M1
  // viene mostrata in sola lettura per l'utente reale loggato — saveOnboarding
  // viene intercettato e NON scrive nulla su Supabase. Attivata da `?preview=onboarding`.
  previewOnboarding: false,
  m1Data: {
    nome:'', cognome:'',
    eta:null, sesso:null, altezza:null,
    peso_attuale:null, peso_obiettivo:null,
    obiettivi:[],
    // Blocco training onboarding (25 mag 2026)
    usa_training:null,        // null=non scelto, true=Alimentazione+Allenamento, false=solo Alimentazione
    tipo_allenamento:null,    // 'casa'|'palestra'|'aperto' — solo se usa_training=true
    attrezzatura:[],          // slug attrezzi disponibili — solo se tipo_allenamento='casa'
    giorni_allenamento:null,  // 2|3|4|5 — solo se usa_training=true
    volume_sessione:'completo', // 'essenziale'|'completo' — default Completo. (durata_sessione dismessa, dormiente in DB)
    attivita:null, esperienza:null,
    stile_alimentare:null,
    intolleranze:[], altre_intolleranze:'', altro_intol_open:false,
    limitazioni:[], altre_limitazioni:'', altro_lim_open:false,
  },
  syncStatus: 'ok',
  catalog: [],
  catalogSelected: [],
  suppSheet: { mode: null, selGroup: null, singleQuery: '', singleSelId: null, singleDose: 1, singleUnit: 'cps', singleTime: '' },
  trainTab: null,
  trainSession: null,
  trainAnticipato: null,            // Passo 3: giorno futuro "anticipato" a oggi (in memoria, no DB) — reset in closeTrainingSession
  trainLogOpen: null,
  // BLOCCO 2B (26 mag 2026) — Schermata ESECUZIONE inserita tra "+S{n}" e logger.
  // Quando attiva mostra GIF grande + nome esercizio + badge reps/RIR + bottone
  // "Fine serie" (→ apre il logger esistente) e Indietro (→ chiude senza loggare).
  // Null = esecuzione non attiva. { sessionId, exName, setNum } = esecuzione aperta.
  trainExecOpen: null,
  trainExecTimer: { running:false, elapsed:0, _iv:null, beeped:false }, // cronometro tenuta esercizi isometrici (schermata esecuzione)
  trainCountdown: null,
  trainRecoveryDone: {},     // { exName: true } — checkbox spuntate in sessioni recoveryUpper/Lower
  trainRecoveryCollapsed: {}, // { blockName: true } — blocchi collassati (auto al completamento o toggle manuale)
  trainRecoveryFlow: {       // countdown ibrido auto-advance G3/G6
    active:false, currentIdx:0, remaining:0, running:false, _iv:null,
    microPause: { active:false, remaining:0, total:0, nextExName:'' }, // pausa 5s/10s tra esercizi stesso blocco
    blockStop:  { active:false, nextBlockName:'', nextExStartIdx:0 }   // stop automatico tra blocchi diversi
  },
  trainActivationFlow: { active:false, currentIdx:0, remaining:0, running:false, _iv:null }, // countdown ibrido auto-advance blocco attivazione 5 min
  trainActivation: [false, false, false],
  trainActivationCollapsed: false, // blocco attivazione collassato (persistito in zt_train_activation_<data>)
  trainActivationTimers: [
    { remaining:120, total:120, running:false },
    { remaining:120, total:120, running:false },
    { remaining:60,  total:60,  running:false },
  ],
  // La chiave si LEGGE qui e si SCRIVE in 5 punti, tutti via todayKey(). Devono
  // usare lo stesso orologio: se qui restasse UTC, dopo il passaggio all'ora
  // locale fra mezzanotte e le due si scriverebbe su un giorno e si rileggerebbe
  // l'altro, e le serie loggate sparirebbero al riavvio.
  trainLoggedSets: (()=>{ try { const raw=localStorage.getItem('zt_train_sets_'+todayKey()); return raw?JSON.parse(raw):{}; } catch(e){ return {}; } })(),
  // GRAFICA L1 — Cronometro TEMPO WORKOUT per sessione del giorno. Persistito su
  // localStorage zt_train_work_<YYYY-MM-DD>. Struttura: { [sessionId]: { totalSec, execStartedAt|null } }
  // totalSec = secondi cumulati delle serie completate; execStartedAt = ms al kickoff serie in corso.
  trainWorkTime: (()=>{ try { const raw=localStorage.getItem('zt_train_work_'+todayKey()); return raw?JSON.parse(raw):{}; } catch(e){ return {}; } })(),
  trainProgEx: null,
  trainProgLogs: [],
  trainProgMetric: 'peso',          // 'peso' (default) | 'reps' | 'volume' | 'tempo' (solo iso temporali)
  trainProgDropdownOpen: false,     // dropdown selezione esercizio aperto/chiuso
  trainProgDropdownTab: 'programma',// 'programma' (default) | 'esercizio'
  trainProgDropdownSearch: '',      // testo barra ricerca dropdown
  trainComeCresciOpen: false,       // tab Programma: sezione "Come cresci" (progressione doppia) espansa/collassata, default chiuso
  allExerciseNamesCache: null,      // null=non caricato, []=loaded vuoto, [...]=loaded — distinct da training_logs
  trainCalStripOffset: 0,           // settimane indietro dalla corrente nella strip calendario (0=corrente)
  trainProgChart: 'carico',         // 'carico'|'1rm'|'volume'|'zone' — chip grafico attivo in tab Progressione
  trainProgLastSet: {},             // { [exName]: { reps, resistance, date } } — cache ultimo set per dropdown
  trainCalSelectedDay: null,        // data ISO selezionata nella strip calendario (null=nessuna)
  trainHomeData: null,
  trainWorkouts: undefined,
  trainSessionStart: null,
  trainDayDetail: null,             // { date, exName? } — modal dettaglio giorno (exName: filtro singolo esercizio se da chart)
  trainDayLogs: null,               // [] | null=loading — logs caricati per il modal
  trainEditLogRow: null,            // { id, reps, resistance, rir } — edit inline serie nel modal
  trainDeleteSetConfirm: null,      // { id, label } — conferma elimina serie singola
  trainDeleteWorkoutConfirm: null,  // { id, date } — conferma elimina workout intero (da modal day-detail)
  bodyTab: null,
  bodyLogs: null,
  bodyMeasurements: null,  // record da body_measurements (check fisici M2) — letti insieme a bodyLogs
  bodyChecks: null,        // record da body_checks (id + status) — per filtrare i check completed in Tendenza
  bloodTests: null,        // righe blood_tests (desc per test_date) — null = non caricate
  bloodOpenId: null,       // id dell'esame aperto nello storico (accordion)
  bloodShowAll: false,     // "mostra altri" dello storico esami
  bodyDeleteConfirm: null, // { kind:'log'|'check', id, checkId, date } — conferma elimina log Body
  bodyCheckDetail: null,   // dati del check fisico aperto nell'overlay dettaglio
  bodyTrendRange: '30d',   // intervallo selettore tab Tendenza: '7d'|'30d'|'90d'|'all'
  bodySaving: false,
  bodyAdvOpen: false,
  audioBlocked: false,
  trainLogResist: null,
  trainLogBandColor: null,          // BLOCCO 3 — colore banda corrente nel logger trazioni (es. 'Viola')
  // BLOCCO 4 — Note esercizio/giorno (training_notes)
  trainNotes: {},                   // { [exName]: { id, note, updated_at } } — nota di OGGI per esercizio
  trainNoteHistoryCount: {},        // { [exName]: N } — conteggio note passate per esercizio (batch all'apertura sessione)
  trainNotesHistory: {},            // { [exName]: [{ id, date, note }, ...] } — storico note passate (lazy, con testo)
  trainNoteEditing: null,           // exName dell'esercizio attualmente in editing (null se nessuno)
  trainNoteDraft: '',               // testo correntemente in editing
  trainNoteSaving: false,           // flag durante upsert
  trainNoteHistoryOpen: {},         // { [exName]: true } — storico espanso per esercizio
  trainNotesLoaded: {},             // { [sessionId]: true } — anti-doppio-fetch sessione corrente
  editLogKey: null,
  editLogDraft: null,
  aiSuggestions: {},                // { `${sessionId}_${exName}`: 'Serie N: …' } — PROSSIMA serie (output deterministico di computeNextSetSuggestion)
  aiCue: {},                        // { `${sessionId}_${exName}`: 'cue AI Coach' } - persistente in sessione
  sessionLastCompletion: {},        // { upperA: '2026-05-02', ... }
  trainCompletedToday: {},          // { upperA: true } — flag in-memory anti-duplica
  trainAllCompleted: [],            // tutti i workout completati validi (esclusi rest/rest_injury) — usato per calcolo settimana ciclo
  userTrainingSessions: null,       // Mossa 3 (28 mag 2026): { sessionId: sessionObj } popolato da loadActiveScheda; null = fallback TRAINING_SESSIONS hardcoded
  userSessionCycle: null,           // Mossa 3: array di session id in ordine dello split; null = fallback SESSION_CYCLE hardcoded
  trainTabataFlow: null,            // Tabata vero (28 mag sera): { active, sessionId, round, totalRounds, exIdx, phase:'work'|'rest', remaining, running, _iv, finisher }
  trainWarmupFlow: null,            // Warm-up specifico (FASE A, 31 mag): { active, sessionId, items, idx, phase:'work'|'rest', remaining, running, _iv }
  trainWarmupCollapsed: false,      // Warm-up FASE A: collasso a fine flow (in-memory, riapribile al tap)
  warmupInfoOpen: null,             // Warm-up FASE A: item s.warmup mostrato nella scheda "come si esegue" (modal content-only)
  exerciseGifCache: {},             // { [exName]: { url, status } } — cache GIF esecuzione per modal recupero (toggle on-demand)
  lastLoggedSets: {},               // { exName: { reps, resistance, rir_actual, date } } cache ultima serie loggata
  exAliasByNorm: null,              // Map normNome→codice (alias storici, lazy) — vedi ensureExNameAliases
  catalogNomeByCodice: null,        // Map codice→nome vivo, popolata da loadActiveScheda
  lastRefreshAt: 0,                 // timestamp ms ultimo re-fetch riuscito (per throttle on-visibility)
  // FASE 2 Smart Ingredient form: { items, freeText, notes, analyzing } + FASE 4 campi edit
  smartForm: {
    items: [], freeText: '', notes: '', analyzing: false,
    editingMealId: null, editingSlot: null, editingTime: null, editingDescription: '',
  },
  // FASE 3 Timeline doppio collasso (id meal/item → bool expanded), default vuoto = tutto collassato
  mealExpanded: {},
  itemExpanded: {},
  // FASE 5 Card EXTRA integratori collassabile, default vuoto = tutte collassate
  extraSuppExpanded: {},
  // BLOCCO 1 Integratori v3 (16 mag 2026) — pacchetti via supplement_packages
  packages: [],            // [{id, name, emoji, time, sort_order, items:[{id, supplement_id, sort_order, supplement:{...}}]}]
  // Integratori Step 2 (18 mag 2026) — extras come supplements_log events
  extras: [],              // [{id, date, slot, name, codice, dose, dose_unit, kcal, carbo, proteine, grassi, costo, created_at}] della data attiva
  // Archivio extra di TUTTO lo storico, indicizzato per data: { 'YYYY-MM-DD': [...] }.
  // È la fonte unica da cui dayTotals prende le kcal/macro degli extra, per ogni
  // giorno. ST.extras qui sopra ne è solo la vista del giorno visualizzato.
  extrasByDay: {},
  confirmExtra: null,      // schermata Conferma Extra fullscreen: { items:[{codice,name,categoria,linea,dose,dose_unit,slot,kcal,carbo,proteine,grassi,costo,confezione}], removeUndo:{codice:{timer,item}}, submitting }
  pkgExtraDeleteConfirm: null, // { logId, name } — modal conferma elimina extra dalla timeline
  // ANALISI V3 (18 mag 2026) — refresh tab Storico → Analisi
  analisi: { window: 'SETTIMANA', dateOffset: 0 }, // window: SETTIMANA|MESE|3MESI|6MESI; offset: 0=corrente, -1=prec
  dayDetailScreen: null,   // { date:'YYYY-MM-DD', menuOpen:bool } — overlay drilldown dettaglio giorno
  // PIANO V4 Coach Attivo (Step B.1, 20 mag 2026) — feature flag + nav settimana
  pianoV4WeekOffset: 0,    // 0=settimana corrente, -1=passata, +1=futura (offset in settimane)
  // PIANO V4 Step C.1 (20 mag 2026) — overlay Dettaglio Giorno
  pianoV4DayOverlay: null, // { dayOfWeek:1-7 ISO, weekOffset:N } | null — snapshot al tap card
  // PIANO V4 Passo 2 (25 mag 2026) — cache piano vero da weekly_plan_meals
  // chiavi = 'YYYY-MM-DD' (week_start ISO). Valore: undefined (mai caricato) /
  // {state:'loading'} / {state:'loaded', plan:{...}|null, mealsByDay:{1:[...], 2:[...]} }
  pianoV4RealPlanCache: {},
  _pianoRigeneraLoading: false, // guard per evitare doppio tap su "Rigenera piano"
  // PIANO V4 Step C.5 (21 mag 2026) — bottom sheet selettore alternative SOSTITUISCI
  pianoV4SubstSheet: null, // { slot, weekOffset, dayOfWeek } | null — snapshot al tap SOSTITUISCI
  // PIANO V4 Step E.1 (22 mag 2026) — Welcome overlay domenicale (parte 1: UI + dati)
  pianoV4WelcomeOverlay: null, // { draft, diff, submitting, mode } | null — snapshot al fetch draft
  // PIANO V4 Step D.1 (22 mag 2026) — Modal "Pesati ora" + cache weight_logs
  weighInSheet: null,      // { value:number(kg, 0.1 precision), saving:bool } | null
  weightLogs: null,        // null=non caricato, []=vuoto, [{date,weight_kg}...] sorted DESC by date
  // STEP D.2 (22 mag 2026) — selettore frequenza pesate (componente riusabile)
  weightFreqSheet: null,   // { open:bool } | null — bottom sheet 4 opzioni daily/every3/weekly/flexible
  extraUndoToast: null,    // { ids:[...], expiresAt, timer } — toast Mail iOS post-submit Conferma Extra
  packageEditor: null,     // { mode:'create'|'edit', packageId, name, emoji, time, items, expandedItem, dirty, saving }
  catalogContext: null,    // { mode:'addToPackage'|'addExtra', packageId?, time? } — modalità apertura openCatalogModal
  pkgRemoveItemConfirm: null,    // { itemId, supplementId, name } — toast undo rimozione item da pacchetto
  pkgDeleteConfirm: false,       // true → modal conferma eliminazione pacchetto
  pkgExitConfirm: false,         // true → modal conferma uscita con modifiche non salvate
  // BLOCCO 2 Catalogo v3 (16 mag 2026)
  catalogCategoryFilter: 'TUTTI',  // pillola categoria attiva nel catalogo
  // M2 Check fisico (versione funzionale, design legacy M1 — refinement pass futuro)
  m2: {
    step: 'intro',                                              // 'intro'|'s0'|'s1'..'s4'|'s5'|'s6'..'s8'|'s9'|'s10'|'s11'|'s12'
    checkId: null,                                              // uuid body_checks.id in corso
    unitSystem: 'metric',                                        // 'metric'|'imperial' (auto-detect su init)
    photos: { front:null, right:null, left:null, back:null },    // File objects pre-upload
    photoUrls: { front:null, right:null, left:null, back:null }, // object URLs locali per preview
    photosUploaded: { front:false, right:false, left:false, back:false },
    reviewingPose: null,                                         // pose attualmente nel modal full-screen
    measurements: {},                                            // tutti i campi misure (chiavi: peso_kg, altezza_cm, vita_cm, ...)
    bloodTests: {},                                              // tutti i parametri ematici (chiavi: emoglobina, ferritina, ...)
    hasRecentBloodTests: null,                                   // true/false dal gate
    retakeFromModal: false,                                       // se true, dopo upload torna a s5 invece del prossimo step
    saving: false,
    error: null,
  },
};

// Mappa sessione → numero Giorno (cycle Upper/Lower)
// Ciclo 6 giorni: G1 upperA · G2 lowerA · G3 recoveryUpper · G4 upperB · G5 lowerB · G6 recoveryLower (poi torna a G1)
// 'rest' (riposo scelto) e 'rest_injury' (riposo per infortunio) restano supportati come giorni extra
// opzionali (markRestChosen / markRestInjury), ma NON sono in rotazione automatica.
const SESSION_DAY_NUM = { upperA:1, lowerA:2, recoveryUpper:3, upperB:4, lowerB:5, recoveryLower:6 };
// FASE B.1 — Ciclo 7 giorni per la scheda a 5 giorni di lavoro (intermedio/avanzato con Upper Pump):
// G1 upperA · G2 lowerA · G3 recoveryUpper · G4 upperB · G5 lowerB · G6 upperC (Pump) · G7 rest
// (riposo esplicito nel ciclo, escluso dal debito come i recuperi — vedi isRecoverySid in computeTrainingDebt).
const SESSION_DAY_NUM_5 = { upperA:1, lowerA:2, recoveryUpper:3, upperB:4, lowerB:5, upperC:6, rest:7 };
const SESSION_CYCLE = ['upperA','lowerA','recoveryUpper','upperB','lowerB','recoveryLower'];

const RESIST_VALUES = [0,10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200,210,220,230,240,250];

// BLOCCO 3 — Scala di assistenza del logger trazioni.
// Ordine FISSO dalla PIÙ DURA (nessuna assistenza) alla PIÙ FACILE (più assistenza).
// 'Corpo libero' NON è un colore: è l'assenza di banda, ed è il gradino più duro
// della scala — un valore reale, non un caso speciale. Progredire = scendere di indice.
const BAND_FREE = 'Corpo libero';
const BAND_COLORS = [BAND_FREE, 'Gialla', 'Rossa', 'Nera', 'Viola'];
// Prosa: si dice "banda Gialla" ma "a corpo libero" — "banda Corpo libero" non esiste.
function bandPhrase(v){ return v === BAND_FREE ? 'a corpo libero' : `banda ${v}`; }
// Etichetta compatta per badge, righe di storico e "Ultima volta".
function bandLabel(v){ return v === BAND_FREE ? 'corpo libero' : v; }
// UNICO punto di verità per "questo esercizio si logga a banda". Il catalogo genera
// varianti ("Trazioni sbarra presa neutra"): il confronto è per PREFISSO normalizzato,
// mai per uguaglianza col nome esatto — era la regressione che tornava a ogni
// rigenerazione della scheda, col logger che mostrava le libbre al posto delle bande.
// Nessun altro confronto sul nome va introdotto: si passa da qui.
//
// ⚠️ Due famiglie di trazioni NON si loggano a banda, e il nome lo dichiara:
//   · zavorrate → la resistenza è il carico AGGIUNTO (kg/lbs), non l'assistenza
//   · gravitron → macchina assistita a pacco pesi: l'aiuto si misura in peso
// Per loro il selettore giusto è quello numerico, non la scala delle bande.
// Criterio esplicito, non euristico: sono gli unici due casi fra i 23 nomi che
// iniziano per "trazion" a catalogo (censiti il 12 settembre 2026 — EX508, EX509
// gravitron, EX512 zavorrate). Ogni altra variante è alla sbarra, e alla sbarra
// l'unica assistenza disponibile è l'elastico.
const PULL_UP_NON_BANDA = /(^|\s)(zavorrat|gravitron)/;
function isPullUpExercise(name){
  const n = String(name || '').normalize('NFC').trim().toLowerCase();
  return n.startsWith('trazion') && !PULL_UP_NON_BANDA.test(n);
}

// Picker della scala di assistenza — sorgente unica per i due punti che lo mostrano
// (card esercizio e schermata recupero). 'Corpo libero' sta a larghezza piena SOPRA
// la riga dei quattro colori: si legge come gradino a sé, non come un quinto colore.
function bandPickerHTML(mb){
  const btn = (c, full) => {
    const active = ST.trainLogBandColor === c;
    return `<button type="button" onclick="ST.trainLogBandColor='${c}';renderTraining();"
      style="${full ? 'width:100%;' : 'flex:1;'}padding:10px 6px;background:${active?'var(--acc)':'#fff'};color:${active?'#fff':'var(--t1)'};border:1.5px solid ${active?'var(--acc)':'var(--s2)'};border-radius:8px;font-size:12px;font-weight:${active?700:500};font-family:var(--font-sans);cursor:pointer;">${c}</button>`;
  };
  return `<div style="margin-bottom:${mb}px;">
    <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:6px;">ASSISTENZA</label>
    ${btn(BAND_FREE, true)}
    <div style="display:flex;gap:6px;margin-top:6px;">
      ${BAND_COLORS.filter(c => c !== BAND_FREE).map(c => btn(c, false)).join('')}
    </div>
    <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-align:center;margin-top:6px;">la banda AIUTA · Corpo libero = più dura · Viola = più facile</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
// ── CHIAVE GIORNO — unico modo, in tutto il file, di trasformare una data in
// 'YYYY-MM-DD'. Legge l'ora del TELEFONO, mai UTC.
//
// toISOString() risponde in UTC. In Italia (+2 d'estate, +1 d'inverno) fra
// mezzanotte e le due l'app credeva fosse ancora ieri, e tutto quello che si
// registrava in quella fascia atterrava sul giorno prima. Misurato sui dati veri
// il 9 ago 2026: 68 righe di supplements_log gia' finite sul giorno sbagliato,
// una sera da 13 registrazioni in un colpo solo.
//
// Accetta una Date, una stringa 'YYYY-MM-DD', o niente (= adesso).
function dayKey(d){
  const x = (d instanceof Date) ? d : (d != null ? new Date(d) : new Date());
  const p = n => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
function todayKey(){ return dayKey(); }
function fmtDate(k){return new Date(k+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Logica residua kcal/macro — formatter deterministico (separatore migliaia italiano, indipendente da ICU browser)
function fmtNum(n){const v=Math.round(Number(n)||0);const sign=v<0?'-':'';return sign+String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function kcalRimaste(consumate,target){return Math.round((Number(target)||0)-(Number(consumate)||0));}
function macroRimasti(consumati,target){return Math.round((Number(target)||0)-(Number(consumati)||0));}
function isOverTarget(consumati,target){return (Number(consumati)||0)>(Number(target)||0);}
const OVER_COLOR='#B45309'; // ambra scuro per stato "oltre target" — leggibile, non allarmante
// Ogni giornata porta con sé la propria data (`key`). Serve a dayTotals per
// sapere quali extra le appartengono senza doversi far passare la chiave da
// fuori: prima il confronto era per identità con il giorno visualizzato, ed è il
// motivo per cui gli extra non entravano mai nei totali degli altri giorni.
function _nuovoGiorno(key){ return {key, meals:[], fasting:false, suppsTaken:[], rawSuppLogs:[]}; }
function getDay(key){if(!ST.db.days[key])ST.db.days[key]=_nuovoGiorno(key);if(!ST.db.days[key].key)ST.db.days[key].key=key;if(!ST.db.days[key].suppsTaken)ST.db.days[key].suppsTaken=[];if(!ST.db.days[key].rawSuppLogs)ST.db.days[key].rawSuppLogs=[];return ST.db.days[key];}

// dbq — l'unico posto in cui si controlla l'esito di una chiamata a Supabase.
//
// PERCHE' ESISTE: supabase-js NON lancia eccezioni sugli errori dell'API.
// Restituisce {data, error} e basta. Un try/catch attorno non vede niente, e una
// scrittura fallita passa per riuscita: nessun errore in console, nessun avviso a
// schermo, il dato semplicemente non c'e'. Misurato il 7 agosto: 61 chiamate su
// 116 non guardavano `error`, 24 delle quali erano SCRITTURE.
//
// USO — si avvolge la chiamata, senza toccarne la logica:
//     await supa.from('meals').delete().eq('id', id);
//     await dbq('cancellare il pasto', supa.from('meals').delete().eq('id', id));
//
// Restituisce sempre lo stesso {data, error} di supabase-js, quindi chi leggeva
// `.data` continua a funzionare identico.
//
// COSA FA IN PIU':
//   - scrive in console l'operazione fallita, con il suo nome in chiaro
//   - mostra un toast lungo all'utente (5500ms: un errore deve restare leggibile,
//     i 2500ms del toast di conferma sono troppo pochi per leggere e capire)
//   - non rilancia: il chiamante decide se proseguire. Chi vuole fermarsi
//     controlla `res.error` come prima.
//
// `opzioni.silenzioso` per le operazioni di sfondo, dove un toast sarebbe rumore
// (es. il replay della coda WS): logga ma non disturba.
async function dbq(operazione, chiamata, opzioni) {
  const opt = opzioni || {};
  // Avvisare non deve poter rompere l'operazione: dbq gira anche durante il boot,
  // quando l'elemento #toast puo' non essere ancora nel DOM e showToast andrebbe
  // in errore su un null. Un avviso mancato e' un fastidio, un'eccezione qui
  // fermerebbe la scrittura che stiamo cercando di proteggere.
  const avvisa = (testo) => {
    if (opt.silenzioso) return;
    if (senzaRete()) return;   // la striscia «Sei senza rete» lo dice gia' (Fondamenta 120)
    try { showToast(testo, '⚠️', 5500); } catch (e) { /* niente DOM: resta il log */ }
  };
  let res;
  try {
    res = await chiamata;
  } catch (e) {
    // Qui ci si arriva solo per un guasto di rete o un bug del client, non per
    // un errore dell'API: quelli tornano dentro res.error.
    console.error('[db] "' + operazione + '" non ha risposto:', e);
    reportError('db', operazione, e, { senza_risposta: true });
    avvisa('Problema di connessione: ' + operazione);
    return { data: null, error: e };
  }
  if (res && res.error) {
    const msg = (res.error && (res.error.message || res.error.hint)) || String(res.error);
    console.error('[db] "' + operazione + '" fallita:', msg, res.error);
    reportError('db', operazione, msg, { code: res.error.code || null, hint: res.error.hint || null });
    avvisa('Non riesco a ' + operazione + ': riprova');
  }
  return res;
}

// ── Gli errori dei telefoni finiscono in app_errors (Fondamenta 060, 2 ott 2026) ──
// Senza, un'app rotta sul telefono di un tester non la vede nessuno: dbq scrive
// solo nella console di quel telefono. Tre fonti: dbq ('db', anche quando e'
// silenziosa), gli errori generali della pagina ('js') e le promesse rifiutate
// e non gestite ('promise').
// Regole: non deve MAI lanciare ne' mostrare niente; non passa da dbq (un errore
// nel segnalare un errore non si segnala: sarebbe un giro senza fine); un errore
// uguale si manda una volta sola per sessione, e al massimo 20 in tutto, cosi' un
// guasto che si ripete a ogni tocco non riempie la tabella. Senza utente entrato
// non si manda niente: la tabella accetta solo righe a proprio nome.
const ERR_REPORT = { visti: new Set(), mandati: 0, MAX: 20 };
function reportError(kind, operazione, errore, extra) {
  try {
    if (!ST || !ST.user || !ST.user.id) return;
    if (ERR_REPORT.mandati >= ERR_REPORT.MAX) return;
    const message = String((errore && (errore.message || errore.hint)) || errore || 'errore senza messaggio').slice(0, 500);
    const op = operazione ? String(operazione).slice(0, 180) : null;
    const chiave = kind + '|' + op + '|' + message;
    if (ERR_REPORT.visti.has(chiave)) return;
    ERR_REPORT.visti.add(chiave);
    ERR_REPORT.mandati++;
    const detail = Object.assign({
      pagina: ST.page || null,
      in_linea: (typeof navigator !== 'undefined' && 'onLine' in navigator) ? navigator.onLine : null,
      telefono: (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '').slice(0, 200),
      stack: errore && errore.stack ? String(errore.stack).slice(0, 1500) : null,
    }, extra || {});
    Promise.resolve(supa.from('app_errors').insert({
      user_id: ST.user.id, app_version: APP_VERSION, kind, operation: op, message, detail,
    })).then(r => { if (r && r.error) console.warn('[errori] segnalazione non salvata:', r.error.message); })
      .catch(e => console.warn('[errori] segnalazione non partita:', e && e.message));
  } catch (e) { /* segnalare non deve poter rompere niente */ }
}
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('error', ev => {
    // Solo errori di codice: un'immagine o uno script che non si carica arriva qui senza ev.error ne' messaggio.
    if (!ev || (!ev.error && !ev.message)) return;
    reportError('js', (ev.filename ? String(ev.filename).split('/').pop() : 'pagina') + ':' + (ev.lineno || 0), ev.error || ev.message);
  });
  window.addEventListener('unhandledrejection', ev => {
    reportError('promise', null, (ev && ev.reason) || 'promessa rifiutata senza motivo');
  });
}

// ── SENZA RETE: la coda delle scritture (Fondamenta 120, 2 ottobre 2026) ──────────────────────
// Prima solo le serie di allenamento avevano una coda (la WS-QUEUE di app/training.js, tolta il 3 ottobre
// con Fondamenta 080: anche le serie passano da qui); un pasto, una pesata o un integratore registrati
// senza campo si perdevano con un avviso. scriviConCoda(operazione, op) prova a scrivere; se non c'e' rete (navigator.onLine) o la rete non risponde, mette l'operazione
// in coda su localStorage (per utente) e risponde {inCoda:true}; un errore dell'API (una regola del
// database) non va in coda: si mostra, come fa dbq. svuotaCoda() rimanda le operazioni in ordine, al
// ritorno della rete, al rientro nell'app e dopo ogni scrittura riuscita; si ferma alla prima che
// fallisce, cosi' l'ordine resta. Le righe hanno l'id scelto dal telefono (nuovoId): rimandare un
// inserimento gia' arrivato risponde 23505 (riga doppia) e conta come fatto.
// Un valore dentro un filtro .or() di PostgREST va fra virgolette: _orEq(colonna, valore) lo prepara.
function _orEq(colonna, valore) {
  return colonna + '.eq."' + String(valore).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}
function nuovoId() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
}
function senzaRete() {
  return typeof navigator !== 'undefined' && 'onLine' in navigator && navigator.onLine === false;
}
function _codaChiave() { return 'zt_coda_' + ((ST.user && ST.user.id) || 'anon'); }
function _codaLeggi() { try { return JSON.parse(localStorage.getItem(_codaChiave())) || []; } catch (e) { return []; } }
function _codaSalva(q) { try { localStorage.setItem(_codaChiave(), JSON.stringify(q)); } catch (e) {} }
function codaInAttesa() { return _codaLeggi().length; }
const CODA_MAX = 300;
function _codaCostruisci(op) {
  let q = supa.from(op.tabella);
  if (op.tipo === 'insert') return q.insert(op.righe);
  if (op.tipo === 'upsert') return op.onConflict ? q.upsert(op.righe, { onConflict: op.onConflict }) : q.upsert(op.righe);
  // filtri: coppie [colonna, valore] (uguaglianza); ['or', 'a.eq.x,b.eq."y"'] e' un filtro .or() di PostgREST
  const filtra = (q) => { (op.filtri || []).forEach(([c, v]) => { q = (c === 'or') ? q.or(v) : q.eq(c, v); }); return q; };
  if (op.tipo === 'update') return filtra(q.update(op.righe));
  if (op.tipo === 'delete') return filtra(q.delete());
  throw new Error('operazione sconosciuta: ' + op.tipo);
}
// supabase-js riporta un fetch fallito come errore senza codice; quelli dell'API hanno sempre un codice
function _erroreDiRete(err) {
  return !!err && !err.code && /fetch|network|rete|Load failed|senza risposta|non ha risposto/i.test(String(err.message || err));
}
function _codaAggiungi(operazione, op) {
  const q = _codaLeggi();
  q.push({ operazione, op, ts: Date.now() });
  while (q.length > CODA_MAX) { const via = q.shift(); console.warn('[coda] piena, scartata la piu\' vecchia:', via.operazione); }
  _codaSalva(q);
  try { showToast('Salvato sul telefono: lo invio appena torna la rete', '📴', 3500); } catch (e) {}
  try { if (typeof aggiornaStatoRete === 'function') aggiornaStatoRete(); } catch (e) {}
}
async function scriviConCoda(operazione, op) {
  if (!ST.user || !ST.user.id || ST.user.id === 'test-user-001') return { data: null, error: null };
  if (senzaRete()) { _codaAggiungi(operazione, op); return { data: null, error: null, inCoda: true }; }
  const res = await dbq(operazione, _codaCostruisci(op), { silenzioso: true });
  if (res.error && _erroreDiRete(res.error)) { _codaAggiungi(operazione, op); return { data: null, error: null, inCoda: true }; }
  if (res.error) { try { showToast('Non riesco a ' + operazione + ': riprova', '⚠️', 5500); } catch (e) {} return res; }
  svuotaCoda();   // non bloccante: se c'era qualcosa in attesa, e' il momento di mandarlo
  return res;
}
let _codaInCorso = false;
async function svuotaCoda() {
  if (_codaInCorso || senzaRete() || !ST.user || !ST.user.id) return 0;
  const q = _codaLeggi();
  if (!q.length) return 0;
  _codaInCorso = true;
  let fatte = 0;
  try {
    while (q.length) {
      const it = q[0];
      const res = await dbq(it.operazione, _codaCostruisci(it.op), { silenzioso: true });
      const giaArrivata = res.error && it.op.tipo === 'insert' && res.error.code === '23505';
      if (res.error && !giaArrivata) break;
      q.shift(); _codaSalva(q); fatte++;
    }
  } finally { _codaInCorso = false; }
  if (fatte) {
    try { showToast(fatte === 1 ? 'Inviato il salvataggio rimasto in attesa' : 'Inviati ' + fatte + ' salvataggi rimasti in attesa', '✅'); } catch (e) {}
    try { if (typeof aggiornaStatoRete === 'function') aggiornaStatoRete(); } catch (e) {}
  }
  return fatte;
}

// Lettura a pagine: PostgREST tronca ogni SELECT a 1000 righe (L13) e non lo dice.
// mk() costruisce la query GIA' ORDINATA su una chiave senza pari merito (in coda
// sempre l'id o il codice): con un ordine ambiguo le pagine si sovrappongono.
// Ogni pagina passa da dbq (L22). Un errore a meta' restituisce data:null, mai
// un elenco parziale: chi chiama deve poter distinguere «vuoto» da «non letto».
async function dbqAll(operazione, mk, opzioni) {
  const BLOCCO = 1000;
  const out = [];
  for (let da = 0; ; da += BLOCCO) {
    const res = await dbq(operazione, mk().range(da, da + BLOCCO - 1), opzioni);
    if (res.error) return { data: null, error: res.error };
    const blocco = res.data || [];
    out.push(...blocco);
    if (blocco.length < BLOCCO) break;
  }
  return { data: out, error: null };
}

let _toastTimer = null;
function showToast(msg, emoji='✅', duration) {
  const el = document.getElementById('toast');
  el.textContent = emoji + ' ' + msg;
  el.classList.add('show');
  // Default 2500ms (comportamento pre-esistente, retro-compatibile).
  // Toast del postino F.1 usano ~5500ms per essere leggibili. Nessun altro
  // toast dell'app deve passare il terzo parametro: lascia il default.
  const ms = (typeof duration === 'number' && duration > 0) ? duration : 2500;
  // Un secondo avviso non viene piu' spento dal tempo del primo (Fondamenta 150)
  if(_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.remove('show'); _toastTimer = null; }, ms);
}

// ── INFORMATIVA: DOVE VANNO I DATI (Fondamenta 170, 3 ottobre 2026) ──────────────────────
// Un testo solo, usato dalla schermata prima del primo accesso e da «Dove vanno i tuoi dati»
// nelle Impostazioni. La bozza e la mappa dei dati stanno in docs/PRIVACY.md; questo testo lo
// approva Ignazio. PRIVACY_VERSIONE cambia quando cambia il testo: chi l'ha gia' letto lo rilegge.
const PRIVACY_VERSIONE = '2026-10-03';
const PRIVACY_INFORMATIVA = [
  ['Il tuo account e i tuoi dati', 'Email di accesso, profilo, pasti, allenamenti, pesate, misure, esami e foto dei check stanno su Supabase, in uno spazio che solo tu puoi leggere e scrivere. Chi gestisce l\'app può vedere i dati, non le foto, per assistenza e controllo.'],
  ['I consigli del coach', 'Per darti un consiglio, l\'app manda a Groq (un servizio esterno) età, sesso, peso, obiettivo, regime alimentare, intolleranze, note di salute, pasti e allenamenti recenti. Non manda il tuo nome.'],
  ['Le foto dei check', 'Le foto restano nel tuo spazio privato. Vanno a Gemini (un servizio esterno) solo se tocchi tu «Fai leggere le foto», e prima ti viene chiesto il consenso ogni volta che serve.'],
  ['Cosa puoi fare', 'Dalle Impostazioni puoi scaricare tutti i tuoi dati in un file e cancellare l\'account: dati, foto e accesso vengono eliminati per sempre.'],
];
function privacyInformativaHTML() {
  return PRIVACY_INFORMATIVA.map(([t, p]) => '<p><b>' + esc(t) + '.</b> ' + esc(p) + '</p>').join('');
}

// ── CONFERME E AVVISI NELLO STILE DELL'APP (Fondamenta 150, 2 ott 2026) ──────────────────
// Al posto di confirm(), alert() e prompt() del telefono. Tre funzioni, tutte restituiscono una
// promessa: chiediConferma(testo, {titolo, ok, annulla, pericolo}) → true/false ·
// chiediTesto(titolo, {valore, tipo, segnaposto, ok}) → testo o null · avvisa(testo, {titolo, ok}) → fine.
// Un foglio solo alla volta: il secondo aspetta che il primo si chiuda. Sfondo ed Esc = annulla.
let _foglioAperto = null;
function _foglio(costruisci) {
  const apri = () => new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'info-modal-overlay foglio-overlay';
    const box = document.createElement('div');
    box.className = 'info-modal foglio';
    ov.appendChild(box);
    let chiuso = false;
    const chiudi = (valore) => {
      if(chiuso) return; chiuso = true;
      document.removeEventListener('keydown', suTasto);
      ov.remove();
      _foglioAperto = null;
      resolve(valore);
    };
    const suTasto = (e) => { if(e.key === 'Escape') { e.preventDefault(); chiudi(costruisci.annullato); } };
    ov.addEventListener('click', (e) => { if(e.target === ov) chiudi(costruisci.annullato); });
    document.addEventListener('keydown', suTasto);
    costruisci.riempi(box, chiudi);
    document.body.appendChild(ov);
    const primo = box.querySelector('input, button.foglio-ok');
    if(primo && primo.focus) { try { primo.focus(); if(primo.select) primo.select(); } catch(e){} }
  });
  const p = (_foglioAperto || Promise.resolve()).then(apri, apri);
  _foglioAperto = p;
  return p;
}
function _foglioBottoni(box, chiudi, o, valoreOk) {
  const riga = document.createElement('div');
  riga.className = 'foglio-bottoni';
  if(o.annulla !== false) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-ghost'; b.textContent = o.annulla || 'Annulla';
    b.onclick = () => chiudi(o.valoreAnnulla);
    riga.appendChild(b);
  }
  const ok = document.createElement('button');
  ok.type = 'button'; ok.className = 'btn foglio-ok ' + (o.pericolo ? 'btn-danger' : 'btn-primary'); ok.textContent = o.ok || 'Ok';
  ok.onclick = () => chiudi(valoreOk());
  riga.appendChild(ok);
  box.appendChild(riga);
}
function chiediConferma(testo, opzioni) {
  const o = opzioni || {};
  return _foglio({ annullato:false, riempi(box, chiudi) {
    if(o.titolo) { const h = document.createElement('h3'); h.textContent = o.titolo; box.appendChild(h); }
    const t = document.createElement('p'); t.textContent = testo; box.appendChild(t);
    _foglioBottoni(box, chiudi, { ...o, valoreAnnulla:false }, () => true);
  } });
}
function chiediTesto(titolo, opzioni) {
  const o = opzioni || {};
  return _foglio({ annullato:null, riempi(box, chiudi) {
    const h = document.createElement('h3'); h.textContent = titolo; box.appendChild(h);
    if(o.testo) { const t = document.createElement('p'); t.textContent = o.testo; box.appendChild(t); }
    const inp = document.createElement('input');
    inp.className = 'inp'; inp.type = o.tipo || 'text';
    if(o.valore != null) inp.value = o.valore;
    if(o.segnaposto) inp.placeholder = o.segnaposto;
    inp.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); chiudi(inp.value); } });
    box.appendChild(inp);
    _foglioBottoni(box, chiudi, { ...o, valoreAnnulla:null }, () => inp.value);
  } });
}
function avvisa(testo, opzioni) {
  const o = opzioni || {};
  return _foglio({ annullato:undefined, riempi(box, chiudi) {
    if(o.titolo) { const h = document.createElement('h3'); h.textContent = o.titolo; box.appendChild(h); }
    const t = document.createElement('div'); t.className = 'foglio-testo';
    if(o.html) t.innerHTML = testo; else t.textContent = testo;   // html:true solo per testi scritti nel codice (l'informativa)
    box.appendChild(t);
    _foglioBottoni(box, chiudi, { ...o, annulla:false }, () => undefined);
  } });
}
