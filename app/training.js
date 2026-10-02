// ═══════════════════════════════════════
// app/training.js — Training, la sessione (Fondamenta 035, tappa 7, 2 ottobre 2026)
// ═══════════════════════════════════════
// I recuperi, le serie loggate e la progressione, le note, la WS-QUEUE, il cronometro, infortunio e
// rientro soft, renderTraining, la scheda esercizio, audio e schermo acceso, apertura e chiusura della
// sessione, la schermata di esecuzione, i timer e i flussi (attivazione, recupero, Tabata, warm-up).
// Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO app/training_generatore.js e PRIMA del resto del proprio codice: qui al
// caricamento si dichiarano costanti e si registrano ascoltatori che usano solo nomi di questo file
// (lo controlla tools/banco/prova_ordine_caricamento.js).

// Recupero tra serie (sec) calibrato per allenamento con elastici a RIR controllato.
// Forza compound: 120s — sufficiente per elastici a RIR 2 (no powerlifting puro)
// Ipertrofia compound: 75s — target classico ipertrofia 60-90s
// Iso/accessori (entrambi i tipi sessione): 60s — recupero corto, no SNC pesante
function getRestSec(sessionId, ex){
  // Prima priorità: rest_sec esplicito sull'esercizio (esercizi generati dal coach)
  if(ex?.rest_sec) return ex.rest_sec;
  const sess = getTrainingSession(sessionId);
  const isForza = sess?.type === 'Forza';
  const isIso = !!ex?.iso;
  if(isIso) return 60;
  return isForza ? 120 : 75;
}
function restSecToText(sec){
  return (sec % 60 === 0) ? (sec/60)+' min' : sec+' sec';
}
// GRAFICA L2 (27 mag 2026) — Format compatto "M:SS" per la meta-row card esercizio
// (es. 120 → "2:00", 75 → "1:15"). restSecToText resta per modal recupero / scheda esercizio.
function restSecToCompact(sec){
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}`;
}

// ── Lookup esercizio (sync) ─────────────────────────────────
function findExercise(exName, sessionId){
  const sess = getTrainingSession(sessionId);
  if(!sess || !sess.exercises) return null;
  return sess.exercises.find(e => e.name === exName) || null;
}

// ── Hydration cross-device delle serie loggate OGGI ─────────
// Ricarica ST.trainLoggedSets da training_logs (Supabase) per evitare che le serie
// loggate da un altro device non compaiano localmente finché non si rilogga manualmente.
// Cloud è autoritativo (ultima versione vince in caso di conflitto).
async function hydrateTrainingSetsFromCloud(){
  if(!ST.user || ST.user.id==='test-user-001') return;
  const today = todayKey();
  try {
    const { data, error } = await supa.from('training_logs')
      .select('session_id, exercise_name, set_number, reps, resistance, band_color, rir_actual')
      .eq('user_id', ST.user.id)
      .eq('date', today);
    if(error) { console.warn('hydrateTrainingSets:', error.message); return; }
    if(!data) return;
    // Costruisci mappa cloud nello stesso formato di trainLoggedSets.
    // BLOCCO 3 — Trazioni: in DB resistance è NULL e band_color contiene il colore. Nella cache locale
    // mettiamo il colore nel campo `resistance` (stringa) così che getLastLoggedSetLabel e i badge
    // continuino a funzionare. band_color esplicito anche, per usi futuri.
    const cloudMap = {};
    data.forEach(row => {
      const key = `${row.session_id}_${row.exercise_name}_${row.set_number}_${today}`;
      const resistFromBand = row.band_color || null;
      cloudMap[key] = {
        reps: row.reps,
        resistance: resistFromBand != null ? resistFromBand : (row.resistance != null ? String(row.resistance) : ''),
        rir: row.rir_actual,
        band_color: resistFromBand,
      };
    });
    // Merge: cloud vince in caso di conflitto (più recente, fonte autoritativa)
    ST.trainLoggedSets = { ...ST.trainLoggedSets, ...cloudMap };
    // Hydrate workout_sets.id per consentire edit/delete by-id su righe arrivate da altri device
    try {
      const { data: wsData } = await dbq('leggere le serie di oggi', supa.from('workout_sets')
        .select('id, exercise_name, set_number, session_type')
        .eq('user_id', ST.user.id)
        .eq('date', today), {silenzioso:true});
      (wsData || []).forEach(ws => {
        const k = `${ws.session_type}_${ws.exercise_name}_${ws.set_number}_${today}`;
        if(ST.trainLoggedSets[k]) ST.trainLoggedSets[k].setId = ws.id;
      });
    } catch(e){}
    // Persist su localStorage del device corrente (consistenza offline)
    try { localStorage.setItem('zt_train_sets_'+today, JSON.stringify(ST.trainLoggedSets)); } catch(e){}
    if(ST.page === 'training') renderTraining();
  } catch(e){
    console.warn('hydrateTrainingSets exception:', e?.message);
  }
}

// ── Nome esercizio: forma normalizzata per il CONFRONTO ─────
// Unico normalizzatore dei nomi esercizio in tutto il file. NFD + rimozione dei
// segni diacritici (accenti), spazi collassati, minuscolo. Serve a confrontare un
// nome scritto in `training_logs` mesi fa con quello che il catalogo mostra oggi:
// una maiuscola, un accento o un doppio spazio non devono spezzare lo storico.
// NON è uno slug: non tocca la punteggiatura, quindi non fonde nomi diversi.
function _normExName(s){
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase();
}

// ── Alias storici nome↔codice esercizio ─────────────────────
// `training_logs` non ha una colonna col codice: la serie viene scritta col NOME
// mostrato a schermo in quel momento. Quando il catalogo rinomina un esercizio
// (cantiere GIF), il nome nei log vecchi non è più quello della scheda di oggi e
// lo storico si stacca. Qui ricostruiamo il ponte nome→codice mettendo insieme
// TUTTE le schede dell'utente (ogni blocco è una fotografia dei nomi di allora)
// più il catalogo vivo. Caricato pigramente: costa una query, e solo quando un
// esercizio risulta senza storico.
async function ensureExNameAliases(){
  if(ST.exAliasByNorm) return ST.exAliasByNorm;           // già costruito
  const byNorm = new Map();                                // normNome → codice
  if(!ST.user || !ST.user.id || ST.user.id === 'test-user-001'){ ST.exAliasByNorm = byNorm; return byNorm; }
  const addFromScheda = (scheda) => {
    const sessioni = scheda && Array.isArray(scheda.sessioni) ? scheda.sessioni : [];
    const addEx = (ex) => {
      if(!ex || !ex.codice || !ex.name) return;
      const k = _normExName(ex.name);
      if(k && !byNorm.has(k)) byNorm.set(k, ex.codice);
    };
    sessioni.forEach(s => {
      if(!s) return;
      if(Array.isArray(s.warmup)) s.warmup.forEach(addEx);
      if(Array.isArray(s.exercises)) s.exercises.forEach(addEx);
      if(s.carry_conclusivo) addEx(s.carry_conclusivo);
      if(s.finisher && Array.isArray(s.finisher.exercises)) s.finisher.exercises.forEach(addEx);
    });
  };
  const res = await supa.from('schede_utente')
    .select('scheda, blocco_n')
    .eq('user_id', ST.user.id)
    .order('blocco_n', { ascending: false })
    .limit(50);
  if(res.error){
    console.warn('[alias] schede storiche non caricate:', res.error.message);
  } else {
    (res.data || []).forEach(r => addFromScheda(r.scheda));
  }
  // Catalogo vivo: i nomi di oggi (già caricati da loadActiveScheda quando disponibili).
  if(ST.catalogNomeByCodice instanceof Map){
    ST.catalogNomeByCodice.forEach((nome, codice) => {
      const k = _normExName(nome);
      if(k && !byNorm.has(k)) byNorm.set(k, codice);
    });
  }
  ST.exAliasByNorm = byNorm;
  return byNorm;
}

// ── Cache ultime serie loggate per sessione (chiamata su openTrainingSession) ──
// Il collegamento log↔esercizio avviene in tre passaggi, dal più stretto al più largo:
//   1. nome normalizzato (copre maiuscole, accenti, spazi)
//   2. codice esercizio, risolto via alias storici (copre le rinomine del catalogo)
//   3. stesso esercizio in un'ALTRA sessione (copre gli esercizi spostati di sessione
//      da una rigenerazione della scheda)
// Prima leggeva solo `.in('exercise_name', nomi di oggi)`: bastava una rinomina a
// catalogo perché "Ultima volta" sparisse per quell'esercizio.
async function loadLastLoggedSets(sessionId){
  if(!ST.user || ST.user.id==='test-user-001'){ ST.lastLoggedSets = {}; return; }
  const sess = getTrainingSession(sessionId);
  if(!sess) return;
  try {
    const today = todayKey();
    // Indice degli esercizi della sessione: forma normalizzata → nome canonico
    // (quello mostrato a schermo, che è la chiave di ST.lastLoggedSets).
    const canonByNorm = new Map();      // normNome → nome canonico
    const canonByCodice = new Map();    // codice   → nome canonico
    (sess.exercises || []).forEach(e => {
      if(!e || !e.name) return;
      canonByNorm.set(_normExName(e.name), e.name);
      if(e.nameSnapshot) canonByNorm.set(_normExName(e.nameSnapshot), e.name);   // nome com'era alla generazione
      if(e.codice) canonByCodice.set(e.codice, e.name);
    });
    const map = {};
    const mancanti = () => (sess.exercises || []).filter(e => e && e.name && !map[e.name]);

    // Legge da training_logs (storico autorevole — workout_sets è incompleto su sessioni vecchie).
    // Esclude le serie loggate oggi così il suggerimento mostra sempre l'ULTIMA SESSIONE PRECEDENTE,
    // non quella in corso. Paginato (L13): PostgREST tronca a 1000 righe e uno storico
    // di mesi le supera. Si ferma appena tutti gli esercizi hanno il loro ultimo set.
    const PAGE = 1000, MAX_ROWS = 6000;
    let rows = [];
    for(let from = 0; from < MAX_ROWS; from += PAGE){
      const res = await supa.from('training_logs')
        .select('exercise_name, reps, resistance, band_color, rir_actual, date, set_number')
        .eq('user_id', ST.user.id)
        .eq('session_id', sessionId)
        .lt('date', today)
        .order('date', { ascending: false })
        .order('set_number', { ascending: false })
        .range(from, from + PAGE - 1);
      if(res.error){ console.warn('loadLastLoggedSets:', res.error.message); break; }
      const page = res.data || [];
      rows = rows.concat(page);
      // Passaggio 1 — nome normalizzato
      page.forEach(row => {
        const canon = canonByNorm.get(_normExName(row.exercise_name));
        if(canon && !map[canon]) map[canon] = row;
      });
      if(page.length < PAGE || mancanti().length === 0) break;
    }

    // Passaggio 2 — codice: risolve le rinomine del catalogo (il log ha il nome vecchio).
    if(mancanti().length > 0 && canonByCodice.size > 0){
      const byNorm = await ensureExNameAliases();
      rows.forEach(row => {
        const codice = byNorm.get(_normExName(row.exercise_name));
        if(!codice) return;
        const canon = canonByCodice.get(codice);
        if(canon && !map[canon]) map[canon] = row;   // rows è già in ordine data desc
      });
    }

    // Passaggio 3 — stesso esercizio in un'altra sessione (scheda rigenerata che lo
    // ha spostato). Ultima spiaggia: si chiede solo per gli esercizi ancora scoperti.
    const ancora = mancanti();
    if(ancora.length > 0){
      const byNorm = ST.exAliasByNorm || await ensureExNameAliases();
      const nomiPerCanon = new Map();
      ancora.forEach(e => {
        const nomi = new Set([e.name]);
        if(e.nameSnapshot) nomi.add(e.nameSnapshot);
        if(e.codice && byNorm) byNorm.forEach((cod, norm) => { if(cod === e.codice) nomi.add(norm); });
        nomiPerCanon.set(e.name, nomi);
      });
      const tuttiNomi = [...new Set([].concat(...[...nomiPerCanon.values()].map(s => [...s])))];
      if(tuttiNomi.length > 0 && tuttiNomi.length <= 200){
        const res2 = await supa.from('training_logs')
          .select('exercise_name, reps, resistance, band_color, rir_actual, date, set_number')
          .eq('user_id', ST.user.id)
          .lt('date', today)
          .order('date', { ascending: false })
          .order('set_number', { ascending: false })
          .limit(1000);
        if(res2.error) console.warn('loadLastLoggedSets (altre sessioni):', res2.error.message);
        (res2.data || []).forEach(row => {
          const norm = _normExName(row.exercise_name);
          for(const [canon, nomi] of nomiPerCanon){
            if(map[canon]) continue;
            const match = [...nomi].some(n => _normExName(n) === norm || n === norm);
            if(match) map[canon] = row;
          }
        });
      }
    }

    ST.lastLoggedSets = map;
    if(ST.page === 'training' && ST.trainSession === sessionId) renderTraining();
  } catch(e){
    console.warn('loadLastLoggedSets error:', e?.message);
  }
}

// ═══════════════════════════════════════════════════════════
// BLOCCO 4 — Note esercizio/giorno (training_notes)
// Una nota per (user_id, exercise_name, date). UNIQUE constraint in DB.
// Le note di oggi vivono in ST.trainNotes; le note passate sono caricate
// lazy in ST.trainNotesHistory quando l'utente espande il link "Note passate (N) ›".
// ═══════════════════════════════════════════════════════════

const TRAINING_NOTE_MAX_LEN = 500; // cap morbido (textarea libera, ma evita testi mostruosi)

// Carica le note di OGGI per TUTTI gli esercizi della sessione in un solo round-trip.
// Chiamata da openTrainingSession. Carica anche il CONTEGGIO delle note passate per esercizio
// (FIX 1 del 27 mag 2026): seconda query leggera che proietta solo exercise_name → count client-side.
async function loadTodayNotes(sessionId){
  if(!ST.user || ST.user.id==='test-user-001') return;
  if(ST.trainNotesLoaded[sessionId]) return; // anti-doppio-fetch nella stessa sessione
  const sess = getTrainingSession(sessionId);
  if(!sess) return;
  try {
    const exNames = sess.exercises.map(e => e.name);
    const today = todayKey();
    // Query 1: note di OGGI con testo completo (popola ST.trainNotes)
    const todayP = supa.from('training_notes')
      .select('id, exercise_name, note, updated_at')
      .eq('user_id', ST.user.id)
      .eq('date', today)
      .in('exercise_name', exNames);
    // Query 2: solo exercise_name di tutte le note PASSATE per gli esercizi della sessione
    // (proiezione leggera: niente testo, niente date — solo conteggio client-side).
    const pastP = supa.from('training_notes')
      .select('exercise_name')
      .eq('user_id', ST.user.id)
      .lt('date', today)
      .in('exercise_name', exNames);
    const [todayRes, pastRes] = await Promise.all([todayP, pastP]);
    if(todayRes.error){ console.warn('loadTodayNotes:', todayRes.error.message); return; }
    (todayRes.data || []).forEach(row => {
      ST.trainNotes[row.exercise_name] = {
        id: row.id,
        note: row.note,
        updated_at: row.updated_at,
      };
    });
    // Conteggio note passate per esercizio
    if(pastRes.error){
      console.warn('loadTodayNotes past count:', pastRes.error.message);
    } else {
      const counts = {};
      (pastRes.data || []).forEach(row => {
        counts[row.exercise_name] = (counts[row.exercise_name] || 0) + 1;
      });
      // Inizializza a 0 per gli esercizi senza note passate (così il render sa che il count è noto)
      exNames.forEach(n => { ST.trainNoteHistoryCount[n] = counts[n] || 0; });
    }
    ST.trainNotesLoaded[sessionId] = true;
    if(ST.page === 'training' && ST.trainSession === sessionId) renderTraining();
  } catch(e){
    console.warn('loadTodayNotes exception:', e?.message);
  }
}

// Carica lo storico note passate per UN esercizio (lazy, on-demand quando l'utente
// espande "Note passate (N) ›"). Esclude la nota di oggi.
async function loadNoteHistory(exName){
  if(!ST.user || ST.user.id==='test-user-001'){
    ST.trainNotesHistory[exName] = [];
    return;
  }
  try {
    const today = todayKey();
    const { data, error } = await supa.from('training_notes')
      .select('id, date, note')
      .eq('user_id', ST.user.id)
      .eq('exercise_name', exName)
      .lt('date', today)
      .order('date', { ascending: false })
      .limit(50); // limite di safety: 50 note passate = oltre un anno se uno scrive ogni settimana
    if(error){ console.warn('loadNoteHistory:', error.message); return; }
    ST.trainNotesHistory[exName] = data || [];
    // FIX 1 — riallinea il count se serve (es. se nel frattempo qualcuno ha inserito da SQL)
    ST.trainNoteHistoryCount[exName] = (data || []).length;
    if(ST.page === 'training') renderTraining();
  } catch(e){
    console.warn('loadNoteHistory exception:', e?.message);
  }
}

// Toggle espansione storico note passate per un esercizio (lazy load alla prima apertura).
function toggleNoteHistory(exName){
  const open = !!ST.trainNoteHistoryOpen[exName];
  if(open){
    ST.trainNoteHistoryOpen[exName] = false;
    renderTraining();
    return;
  }
  ST.trainNoteHistoryOpen[exName] = true;
  // Lazy load se non già in cache
  if(!Array.isArray(ST.trainNotesHistory[exName])){
    loadNoteHistory(exName); // re-render in callback
  }
  renderTraining();
}

// Entra in editing della nota di oggi (pre-compila il draft col testo attuale, se esiste).
function openNoteEditor(exName){
  const existing = ST.trainNotes[exName];
  ST.trainNoteEditing = exName;
  ST.trainNoteDraft = existing?.note || '';
  renderTraining();
  setTimeout(()=>{
    const ta = document.getElementById('note-textarea-'+exName.replace(/[^a-zA-Z0-9]/g,'_'));
    if(ta){ ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }, 50);
}

// Esce dall'editor senza salvare.
function cancelNoteEdit(){
  ST.trainNoteEditing = null;
  ST.trainNoteDraft = '';
  renderTraining();
}

// Aggiorna il draft mentre l'utente scrive (oninput).
// FIX 3 (27 mag 2026): aggiorna anche il contatore "N / 500" via DOM surgical
// (niente renderTraining() — preserva focus + caret nella textarea).
function updateNoteDraft(value){
  const v = (value || '').slice(0, TRAINING_NOTE_MAX_LEN);
  ST.trainNoteDraft = v;
  if(ST.trainNoteEditing){
    const safeId = ST.trainNoteEditing.replace(/[^a-zA-Z0-9]/g,'_');
    const counter = document.getElementById('note-counter-'+safeId);
    if(counter) counter.textContent = `${v.length} / ${TRAINING_NOTE_MAX_LEN}`;
  }
}

// Salva la nota: upsert su training_notes (vincolo UNIQUE user_id+exercise_name+date).
async function saveTrainingNote(exName){
  if(ST.trainNoteSaving) return;
  const text = (ST.trainNoteDraft || '').trim();
  if(!text){ showToast('La nota è vuota','⚠️'); return; }
  ST.trainNoteSaving = true;
  renderTraining();
  const today = todayKey();
  if(!ST.user || ST.user.id==='test-user-001'){
    // Test mode: aggiorna solo state locale, niente DB
    ST.trainNotes[exName] = { id: 'local-'+Date.now(), note: text, updated_at: new Date().toISOString() };
    ST.trainNoteEditing = null;
    ST.trainNoteDraft = '';
    ST.trainNoteSaving = false;
    renderTraining();
    showToast('Nota salvata','📝');
    return;
  }
  try {
    const payload = {
      user_id: ST.user.id,
      exercise_name: exName,
      date: today,
      note: text,
    };
    const { data, error } = await supa.from('training_notes')
      .upsert(payload, { onConflict: 'user_id,exercise_name,date' })
      .select('id, note, updated_at')
      .single();
    if(error){
      console.warn('saveTrainingNote:', error.message);
      showToast('Errore salvataggio nota','⚠️');
      ST.trainNoteSaving = false;
      renderTraining();
      return;
    }
    ST.trainNotes[exName] = {
      id: data.id,
      note: data.note,
      updated_at: data.updated_at,
    };
    ST.trainNoteEditing = null;
    ST.trainNoteDraft = '';
    ST.trainNoteSaving = false;
    renderTraining();
    showToast('Nota salvata','📝');
  } catch(e){
    console.warn('saveTrainingNote exception:', e?.message);
    showToast('Errore salvataggio nota','⚠️');
    ST.trainNoteSaving = false;
    renderTraining();
  }
}

// Format orario "SALVATA · ORA" tipo "08:42" da un ISO timestamp.
function formatNoteTime(isoTs){
  if(!isoTs) return '';
  try {
    const d = new Date(isoTs);
    if(isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  } catch(e){ return ''; }
}

// Format data breve "24 APR" da una date YYYY-MM-DD (per storico note).
function formatNoteDate(dateStr){
  if(!dateStr) return '';
  try {
    const [y,m,d] = String(dateStr).split('-').map(Number);
    if(!y || !m || !d) return dateStr;
    const MONTHS = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
    return `${d} ${MONTHS[m-1] || ''}`;
  } catch(e){ return dateStr; }
}

// Parser unificato per il campo `reps` di un esercizio.
// Restituisce { kind, min, max, perLato, unit } oppure null se formato non gestito.
//   kind: 'reps' | 'seconds' | null
//   min, max: numeri
//   perLato: bool (true se "per lato")
//   unit: 'reps' | 'sec'
//
// Formati supportati:
//   "4-6"             → reps  4-6
//   "4-6 per lato"    → reps  4-6 per lato
//   "20-30 sec"       → sec   20-30
//   "20-30 sec per lato" → sec 20-30 per lato
//   "30 sec"          → sec   30-30 (singolo, no progressione)
//   "10 min", "5-10 min" → null (non gestito)
function parseRepsRange(repsStr){
  if(!repsStr) return null;
  const s = String(repsStr).trim();
  // Skip esplicito su minuti
  if(/\bmin\b/i.test(s)) return null;
  // Range secondi: "20-30 sec" o "20-30 sec per lato"
  let m = s.match(/^(\d+)-(\d+)\s*sec(?:\s+per lato)?$/i);
  if(m) return { kind:'seconds', min:parseInt(m[1],10), max:parseInt(m[2],10), perLato:/per lato/i.test(s), unit:'sec' };
  // Singolo secondi: "30 sec" → no progressione (min=max)
  m = s.match(/^(\d+)\s*sec(?:\s+per lato)?$/i);
  if(m){ const n = parseInt(m[1],10); return { kind:'seconds', min:n, max:n, perLato:/per lato/i.test(s), unit:'sec' }; }
  // Range reps: "4-6" o "4-6 per lato"
  m = s.match(/^(\d+)-(\d+)(?:\s+per lato)?$/);
  if(m) return { kind:'reps', min:parseInt(m[1],10), max:parseInt(m[2],10), perLato:/per lato/i.test(s), unit:'reps' };
  return null;
}

// ── "APPENA FATTA" label (sync, legge ST.trainLoggedSets) ────
// Trova l'ultima serie loggata OGGI per (sessionId, exName) e la formatta come
// "S3 · 6r · 30 lbs · RIR 2". Usata nella schermata recupero (BLOCCO 2A, 26 mag 2026).
// Restituisce null se nessuna serie loggata oggi per quell'esercizio.
function getLastLoggedSetLabel(sessionId, exName){
  if(!ST.trainLoggedSets || !sessionId || !exName) return null;
  const today = todayKey();
  const prefix = `${sessionId}_${exName}_`;
  const suffix = `_${today}`;
  let bestKey = null, bestSet = -1;
  for(const k of Object.keys(ST.trainLoggedSets)){
    if(!k.startsWith(prefix) || !k.endsWith(suffix)) continue;
    // Estrae il setNum: la chiave è prefix + setNum + suffix
    const middle = k.slice(prefix.length, k.length - suffix.length);
    const setNum = parseInt(middle, 10);
    if(!isNaN(setNum) && setNum > bestSet){
      bestSet = setNum;
      bestKey = k;
    }
  }
  if(!bestKey) return null;
  const d = ST.trainLoggedSets[bestKey] || {};
  const unitLbl = (ST.profile && ST.profile.unit) || 'lbs';
  // BLOCCO 3 — Trazioni: preferisci band_color se presente. Altrimenti resistance numerica/testuale.
  let resistTxt = '';
  const raw = (d.band_color && BAND_COLORS.includes(d.band_color)) ? d.band_color : d.resistance;
  if(raw !== undefined && raw !== null && String(raw).trim() !== ''){
    const r = bandLabel(String(raw).trim());
    resistTxt = /^\d+$/.test(r) ? `${r} ${unitLbl}` : r;
  }
  const parts = [`S${bestSet}`];
  if(d.reps !== undefined && d.reps !== null && String(d.reps).trim() !== '') parts.push(`${d.reps}r`);
  if(resistTxt) parts.push(resistTxt);
  if(d.rir !== undefined && d.rir !== null && String(d.rir).trim() !== '') parts.push(`RIR ${d.rir}`);
  return parts.join(' · ');
}

// ── Suggerimento progressione (sync, legge dalla cache) ──────
// FIX PROGRESSIONE (27 mag 2026) — Helper unificato per la riga "PROSSIMA".
// Fonte UNICA di verità per: (a) .ex-suggestion nelle card esercizio, (b) nextHTML
// nella schermata recupero. Garantisce che i due punti mostrino la stessa cosa.
//
// (29 mag 2026) Il suggerimento è ora DETERMINISTICO (computeNextSetSuggestion),
// scritto in ST.aiSuggestions al salvataggio della serie → niente più stato
// "calcolo…" (era l'attesa della chiamata AI, ora rimossa).
//
// Priorità:
//   1. Suggerimento deterministico se presente (ST.aiSuggestions[key])
//   2. Fallback da getProgressionSuggestion (Inizia con… / Ultima volta…)
//   3. Stringa vuota se davvero nulla
function getProgressionLive(exName, sessionId){
  const key = `${sessionId}_${exName}`;
  const s = ST.aiSuggestions && ST.aiSuggestions[key];
  if(s) return s;
  // Fallback iniziale (solo se nessuna serie loggata oggi — vedi getProgressionSuggestion)
  return getProgressionSuggestion(exName, sessionId) || '';
}

// FIX PROGRESSIONE (27 mag 2026) — Ridotta a SOLO fallback iniziale.
// La logica "ripesca ultima serie loggata oggi e ristampa" è stata RIMOSSA perché
// era una fotocopia di APPENA FATTA, non un suggerimento per la PROSSIMA serie.
// Il vero suggerimento progressivo (serie-per-serie) viene da computeNextSetSuggestion
// e finisce in ST.aiSuggestions. Questo helper resta SOLO per il primissimo render:
// quando nessuna serie è stata loggata né in questa sessione né nello storico,
// suggerisce un punto di partenza ragionevole.
function getProgressionSuggestion(exName, sessionId){
  const ex = findExercise(exName, sessionId);
  if(!ex) return '';
  const isPullUp = isPullUpExercise(exName);
  // Se c'è già una serie loggata oggi → niente fallback: la PROSSIMA è dominio
  // di computeNextSetSuggestion (vedi getProgressionLive).
  const today = todayKey();
  const prefix = `${sessionId}_${exName}_`;
  const suffix = `_${today}`;
  const anyLoggedToday = Object.keys(ST.trainLoggedSets || {}).some(k =>
    k.startsWith(prefix) && k.endsWith(suffix)
  );
  if(anyLoggedToday) return '';
  // Se c'è storico (ultima volta su un'altra data) → mostra come ripartenza
  const last = ST.lastLoggedSets[exName];
  if(last){
    const unitLbl = (ST.profile && ST.profile.unit) || 'lbs';
    let resistTxt = isPullUp ? '' : 'corpo libero';
    const lastResist = (last.band_color && BAND_COLORS.includes(last.band_color)) ? last.band_color : last.resistance;
    if(lastResist != null && String(lastResist).trim() !== ''){
      const r = bandLabel(String(lastResist).trim());
      resistTxt = /[a-zA-Z]/.test(r) ? r : `${r} ${unitLbl}`;
    }
    const rirTxt = (last.rir_actual != null) ? ` · RIR ${last.rir_actual}` : '';
    return `💡 Ultima volta: ${last.reps}r${resistTxt?' · '+resistTxt:''}${rirTxt}`;
  }
  // Nessuna serie loggata + nessuno storico → punto di partenza generico,
  // COERENTE col tipo di esercizio (B4 fix):
  //   - trazioni → banda Viola (invariato)
  //   - isometrico (reps in secondi, parseRepsRange kind='seconds') → "N sec di
  //     tenuta", niente reps/lbs (così è coerente col logger a durata)
  //   - corpo libero / elastico / altro → "N reps", SENZA "10 lbs" fittizio
  const parsed = parseRepsRange(ex.reps);
  const firstNum = (String(ex.reps || '').match(/(\d+)/) || [])[1];
  const startN = parsed ? parsed.min : (firstNum ? parseInt(firstNum, 10) : 8);
  if(isPullUp) return `💡 Inizia con ${startN} reps · banda Viola`;
  if(parsed && parsed.kind === 'seconds') return `💡 Inizia con ${startN} sec di tenuta`;
  return `💡 Inizia con ${startN} reps`;
}

async function loadTrainingLogs(exName){
  ST.trainProgEx = exName;
  ST.trainProgLogs = null; // null = loading
  // Default metrica: 'tempo' per esercizi iso temporali, 'peso' altrimenti
  ST.trainProgMetric = isTimedExerciseByName(exName) ? 'peso' : 'peso';
  renderTraining();
  if(!ST.user || ST.user.id==='test-user-001'){ ST.trainProgLogs=[]; renderTraining(); return; }
  // TODO: paginare quando avremo 1+ anno di dati. Limit 200 = ~33 sessioni con 6 set. OK per ora.
  const { data } = await supa
    .from('training_logs')
    .select('*')
    .eq('user_id', ST.user.id)
    .eq('exercise_name', exName)
    .order('date', {ascending:false})
    .order('set_number', {ascending:true})
    .limit(200);
  ST.trainProgLogs = data || [];
  renderTraining();
}

// ─────────────────────────────────────────────────────────────
// DROPDOWN SELEZIONE ESERCIZIO (tab Progressione)
// ─────────────────────────────────────────────────────────────

// Lazy load distinct exercise_name + ultimo set da training_logs.
// Cache invalidata da: saveTrainingSet (nuovo nome possibile), deleteSetConfirmed,
// deleteWorkoutConfirmed (potenziale rimozione ultimo log di un esercizio).
// FASE 2: invalidare anche dopo chiusura/cambio programma quando esisterà gestione programmi.
async function loadAllExerciseNamesWithLast(){
  if(ST.allExerciseNamesCache !== null) return; // gia' loaded (anche [])
  if(!ST.user || ST.user.id==='test-user-001'){ ST.allExerciseNamesCache = []; ST.trainProgLastSet = {}; return; }
  try {
    const { data } = await dbq('leggere lo storico delle serie', supa.from('training_logs')
      .select('exercise_name, reps, resistance, date')
      .eq('user_id', ST.user.id)
      .order('date', {ascending: false}));
    const seen = new Set();
    ST.trainProgLastSet = {};
    const distinct = [];
    (data||[]).forEach(r => {
      if(r.exercise_name && !seen.has(r.exercise_name)){
        seen.add(r.exercise_name);
        distinct.push(r.exercise_name);
        ST.trainProgLastSet[r.exercise_name] = { reps: r.reps, resistance: r.resistance, date: r.date };
      }
    });
    distinct.sort((a,b) => a.localeCompare(b, 'it'));
    ST.allExerciseNamesCache = distinct;
  } catch(e){ ST.allExerciseNamesCache = []; ST.trainProgLastSet = {}; }
  // Re-render se dropdown e' aperto sulla tab Progressione
  if(ST.page === 'training' && ST.trainProgDropdownOpen) renderTraining();
  // Default selection: se nessun esercizio scelto e c'e' almeno un log, seleziona il primo alfabetico
  if(!ST.trainProgEx && ST.allExerciseNamesCache.length > 0
     && ST.page === 'training' && ST.trainTab === 'progressione'){
    loadTrainingLogs(ST.allExerciseNamesCache[0]);
  }
}

// Retrocompat alias (chiamato da codice legacy che ancora usa il vecchio nome)
const loadAllExerciseNames = loadAllExerciseNamesWithLast;

function invalidateAllExerciseNamesCache(){
  ST.allExerciseNamesCache = null;
  ST.trainProgLastSet = {};
}

function toggleProgDropdown(){
  ST.trainProgDropdownOpen = !ST.trainProgDropdownOpen;
  if(ST.trainProgDropdownOpen){
    ST.trainProgDropdownSearch = '';
    loadAllExerciseNamesWithLast(); // lazy load alla prima apertura
  }
  renderTraining();
}

function closeProgDropdown(){
  ST.trainProgDropdownOpen = false;
  ST.trainProgDropdownSearch = '';
  renderTraining();
}

// ─────────────────────────────────────────────────────────────
// STRIP CALENDARIO — tab Progressione
// ─────────────────────────────────────────────────────────────

function renderCalStrip(workouts){
  const offset = ST.trainCalStripOffset || 0;
  const today = new Date();
  today.setHours(0,0,0,0);
  // dayKey() e' il formattatore canonico (era duplicato qui a mano)
  const localIso = dayKey;
  const todayIso = localIso(today);

  // Lunedì della settimana corrente
  const dow = today.getDay(); // 0=dom
  const diffToMon = (dow === 0) ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + diffToMon - offset * 7);

  // Mappa rapida workout per data
  const wMap = {};
  if(Array.isArray(workouts)){
    workouts.forEach(w => { if(w.completed) wMap[w.date] = true; });
  }

  const dayDows = ['L','M','M','G','V','S','D'];

  const dayCells = Array.from({length:7}, (_,i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const ds = localIso(d);
    const isFuture = d > today;
    const isToday = ds === todayIso;
    const isSel = ds === ST.trainCalSelectedDay;
    const hasW = !!wMap[ds];
    const cls = [
      'cal-strip-day',
      isToday ? 'today' : '',
      isSel ? 'selected' : '',
      hasW ? 'has-workout' : '',
    ].filter(Boolean).join(' ');
    const numColor = isToday && !isSel ? 'var(--acc)' : 'var(--t1)';
    const dowColor = 'var(--t3)';
    const clickFn = isFuture ? '' : `onclick="ST.trainCalSelectedDay='${ds}';openDayDetail('${ds}');renderTraining();"`;
    return `<div class="${cls}" ${clickFn} style="${isFuture?'opacity:.35;cursor:default;':''}">
      <span class="cal-day-dow" style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:${isSel?'#fff':dowColor};text-transform:uppercase;">${dayDows[i]}</span>
      <span class="cal-day-num" style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:${isSel?'#fff':numColor};line-height:1;">${d.getDate()}</span>
      <span class="cal-dot" style="${isSel?'background:#fff;':''}"></span>
    </div>`;
  }).join('');

  const prevBtn = `<button class="cal-strip-nav" onclick="ST.trainCalStripOffset++;renderTraining();" aria-label="Settimana precedente">‹</button>`;
  const nextBtn = `<button class="cal-strip-nav" ${offset===0?'disabled':''} onclick="if(ST.trainCalStripOffset>0){ST.trainCalStripOffset--;renderTraining();}" aria-label="Settimana successiva">›</button>`;

  return `<div class="cal-strip-wrap">${prevBtn}<div class="cal-strip-days">${dayCells}</div>${nextBtn}</div>`;
}

// ─────────────────────────────────────────────────────────────
// GRAFICO PROGRESSIONE — renderProgChart
// ─────────────────────────────────────────────────────────────

function renderProgChart(points, byDate, selEx){
  const chartType = ST.trainProgChart || 'carico';
  if(points.length === 0){
    return `<div style="padding:32px;text-align:center;color:var(--t3);font-size:13px;font-family:var(--font-mono);">Nessuna sessione</div>`;
  }

  // ── Calcolo valori per modalità ──
  let values, unitLabel, metaLabel;
  if(chartType === 'carico'){
    values = points.map(p => p.resist);
    unitLabel = 'LBS'; metaLabel = 'CARICO';
  } else if(chartType === '1rm'){
    values = points.map(p => p.resist > 0 ? Math.round(p.resist * (1 + p.reps / 30)) : 0);
    unitLabel = 'LBS'; metaLabel = '1RM STIMATO';
  } else if(chartType === 'volume'){
    values = points.map(p => {
      const dayLogs = byDate[p.date] || [];
      return dayLogs.reduce((s,l) => s + (parseInt(l.reps)||0) * (parseInt(l.resistance)||0), 0);
    });
    unitLabel = 'LBS×REPS'; metaLabel = 'VOLUME';
  } else {
    // 'zone' — stacked bar
    return _renderZoneChart(points, byDate, selEx);
  }

  const W = 340, H = 200;
  const padL = 32, padR = 16, padT = 28, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxV = Math.max(...values, 1);
  const yMax = Math.ceil(maxV * 1.1 / 50) * 50 || 1;

  // Asse Y — 4 tick
  const yTicks = [0, Math.round(yMax/3), Math.round(yMax*2/3), yMax];
  const tickLines = yTicks.map(t => {
    const y = padT + chartH - (t/yMax)*chartH;
    const lbl = t >= 1000 ? (t/1000).toFixed(1)+'k' : t;
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="#E5E7EB" stroke-width="0.5"/>
      <text x="${padL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="#9A9388" font-family="JetBrains Mono,monospace">${lbl}</text>`;
  }).join('');

  // Area + linea
  const n = points.length;
  const stepX = n > 1 ? chartW / (n-1) : chartW / 2;
  const pts = values.map((v,i) => {
    const x = n > 1 ? padL + i*stepX : padL + chartW/2;
    const y = padT + chartH - (v/yMax)*chartH;
    return { x, y, v, date: points[i].date, dateShort: points[i].dateShort };
  });

  const lineCoords = pts.map(d => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(' ');
  const areaCoords = `${pts[0].x.toFixed(1)},${(padT+chartH).toFixed(1)} ${lineCoords} ${pts[n-1].x.toFixed(1)},${(padT+chartH).toFixed(1)}`;

  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const dots = pts.map((d,i) => {
    const isLast = i === n-1;
    const r = isLast ? 6 : 4;
    const showLabel = (i % labelEvery === 0) || isLast;
    const lastValLabel = isLast ? `<text x="${d.x.toFixed(1)}" y="${(d.y-10).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--acc)" font-weight="700" font-family="JetBrains Mono,monospace">${d.v}</text>` : '';
    return `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${r}" fill="${isLast?'var(--acc)':'#fff'}" stroke="var(--acc)" stroke-width="1.5"/>
      <rect x="${(d.x-14).toFixed(1)}" y="${(d.y-14).toFixed(1)}" width="28" height="28" fill="transparent" style="cursor:pointer" onclick="openDayDetail('${d.date}')"></rect>
      ${lastValLabel}
      ${showLabel?`<text x="${d.x.toFixed(1)}" y="${(padT+chartH+12).toFixed(1)}" text-anchor="middle" font-size="8" fill="#9A9388" font-family="JetBrains Mono,monospace">${d.dateShort}</text>`:''}`;
  }).join('');

  const lastVal = values[n-1] || 0;
  const metaTop = `<text x="${padL}" y="${padT-8}" font-size="9" fill="#9A9388" font-weight="700" font-family="JetBrains Mono,monospace" text-transform="uppercase">${metaLabel} · <tspan fill="var(--acc)" font-size="11">${lastVal}</tspan> ${unitLabel}</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;">
    <defs>
      <linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--acc)" stop-opacity=".22"/>
        <stop offset="100%" stop-color="var(--acc)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${tickLines}
    ${metaTop}
    <polygon points="${areaCoords}" fill="url(#pgGrad)"/>
    <polyline points="${lineCoords}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

function _renderZoneChart(points, byDate){
  const W = 340, H = 200;
  const padL = 32, padR = 16, padT = 28, padB = 48;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n = points.length;
  const slot = n > 0 ? chartW / n : chartW;
  const barW = slot * 0.6;

  const zoneData = points.map(p => {
    const dayLogs = byDate[p.date] || [];
    let forza=0, iper=0, res=0;
    dayLogs.forEach(l => {
      const r = parseInt(l.reps)||0;
      if(r <= 5) forza++;
      else if(r <= 12) iper++;
      else res++;
    });
    return { date: p.date, dateShort: p.dateShort, forza, iper, res, total: forza+iper+res };
  });

  const maxTotal = Math.max(...zoneData.map(z => z.total), 1);

  const bars = zoneData.map((z,i) => {
    const x = padL + i*slot + (slot-barW)/2;
    const toY = (v) => padT + chartH - (v/maxTotal)*chartH;
    const yBase = padT + chartH;
    const hForza = (z.forza/maxTotal)*chartH;
    const hIper = (z.iper/maxTotal)*chartH;
    const hRes = (z.res/maxTotal)*chartH;
    const yForza = yBase - hForza;
    const yIper = yForza - hIper;
    const yRes = yIper - hRes;
    return [
      z.forza > 0 ? `<rect x="${x.toFixed(1)}" y="${yForza.toFixed(1)}" width="${barW.toFixed(1)}" height="${hForza.toFixed(1)}" fill="#B5D4F4" rx="2"/>` : '',
      z.iper > 0 ? `<rect x="${x.toFixed(1)}" y="${yIper.toFixed(1)}" width="${barW.toFixed(1)}" height="${hIper.toFixed(1)}" fill="var(--acc)" rx="2"/>` : '',
      z.res > 0 ? `<rect x="${x.toFixed(1)}" y="${yRes.toFixed(1)}" width="${barW.toFixed(1)}" height="${hRes.toFixed(1)}" fill="#FAC775" rx="2"/>` : '',
      `<rect x="${x.toFixed(1)}" y="${padT}" width="${barW.toFixed(1)}" height="${chartH}" fill="transparent" style="cursor:pointer" onclick="openDayDetail('${z.date}')"/>`,
      `<text x="${(x+barW/2).toFixed(1)}" y="${(padT+chartH+12).toFixed(1)}" text-anchor="middle" font-size="8" fill="#9A9388" font-family="JetBrains Mono,monospace">${z.dateShort}</text>`,
    ].join('');
  }).join('');

  const legendY = padT + chartH + 28;
  const legend = [
    {c:'#B5D4F4',l:'FORZA ≤5'},
    {c:'var(--acc)',l:'IPERT 6-12'},
    {c:'#FAC775',l:'RES ≥13'},
  ].map((it,i) => `<circle cx="${padL + i*80}" cy="${legendY}" r="4" fill="${it.c}"/>
    <text x="${padL + i*80 + 8}" y="${legendY+4}" font-size="8" fill="#9A9388" font-family="JetBrains Mono,monospace">${it.l}</text>`).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;">
    ${bars}${legend}
  </svg>`;
}

// ─────────────────────────────────────────────────────────────
// Tab Programma — toggle sezione collassabile "Come cresci" (progressione doppia)
function toggleTrainComeCresci(){
  ST.trainComeCresciOpen = !ST.trainComeCresciOpen;
  renderTraining();
}

function setProgDropdownTab(tab){
  ST.trainProgDropdownTab = tab;
  renderTraining();
  // Restore focus alla search bar (utile su mobile per continuare a digitare)
  setTimeout(()=>document.getElementById('prog-dd-search')?.focus(), 0);
}

function setProgDropdownSearch(val){
  ST.trainProgDropdownSearch = val;
  renderTraining();
  // Re-mette focus + caret a fine testo (re-render perde focus)
  setTimeout(()=>{
    const el = document.getElementById('prog-dd-search');
    if(el){ el.focus(); try { el.setSelectionRange(val.length, val.length); } catch(e){} }
  }, 0);
}

function selectProgEx(name){
  ST.trainProgDropdownOpen = false;
  ST.trainProgDropdownSearch = '';
  loadTrainingLogs(name);
}

// ─────────────────────────────────────────────────────────────
// HELPERS PROGRESSIONE
// ─────────────────────────────────────────────────────────────

// Cerca un esercizio per nome in tutte le TRAINING_SESSIONS, ritorna {ex, sess} o null
function findExInAllSessions(exName){
  for(const s of Object.values(getAllTrainingSessions())){
    if(!s.exercises) continue;
    const ex = s.exercises.find(e => e.name === exName);
    if(ex) return { ex, sess: s };
  }
  return null;
}

// True se l'esercizio è isometrico con reps in formato temporale (es. '20-30 sec per lato')
function isTimedExerciseByName(exName){
  const found = findExInAllSessions(exName);
  if(!found || !found.ex.iso) return false;
  const p = parseRepsRange(found.ex.reps);
  return !!(p && p.kind === 'seconds');
}

// "Best set of day": peso desc → reps/tempo desc come tiebreaker.
// Input: array di training_logs per UN giorno + UN esercizio.
function bestSetOfDay(logs){
  if(!logs || !logs.length) return null;
  return logs.reduce((best, l) => {
    const lW = parseInt(l.resistance) || 0;
    const bW = parseInt(best.resistance) || 0;
    if(lW > bW) return l;
    if(lW < bW) return best;
    return ((l.reps||0) > (best.reps||0)) ? l : best;
  });
}

// Formatta data in "D/M" (es. "8/5" per 2026-05-08) per asse X grafico
function shortDate(dateStr){
  if(!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d,10)}/${parseInt(m,10)}`;
}

// Formatta data in "Gio 8 mag" per header modal
function formatDayHeader(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr+'T00:00:00');
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// ─────────────────────────────────────────────────────────────
// MODAL DAY-DETAIL: load + open + close
// ─────────────────────────────────────────────────────────────

// Apre modal dettaglio giorno (da calendar click o chart click).
// Se exName presente: filtra logs solo a quell'esercizio.
async function openDayDetail(date, exName){
  ST.trainDayDetail = { date, exName: exName || null };
  ST.trainDayLogs = null; // loading
  ST.trainEditLogRow = null;
  ST.trainDeleteSetConfirm = null;
  ST.trainDeleteWorkoutConfirm = null;
  renderTraining();
  if(!ST.user || ST.user.id==='test-user-001'){ ST.trainDayLogs = []; renderTraining(); return; }
  let q = supa.from('training_logs').select('*').eq('user_id', ST.user.id).eq('date', date);
  if(exName) q = q.eq('exercise_name', exName);
  const { data } = await q.order('exercise_name').order('set_number', {ascending:true});
  ST.trainDayLogs = data || [];
  renderTraining();
}

function closeDayDetail(){
  ST.trainDayDetail = null;
  ST.trainDayLogs = null;
  ST.trainEditLogRow = null;
  ST.trainDeleteSetConfirm = null;
  ST.trainDeleteWorkoutConfirm = null;
  renderTraining();
}

// ─────────────────────────────────────────────────────────────
// EDIT/DELETE SERIE SINGOLA (dal modal day-detail)
// ─────────────────────────────────────────────────────────────

function editLogRow(id){
  const log = (ST.trainDayLogs || []).find(l => l.id === id);
  if(!log) return;
  // BLOCCO 3 — Trazioni: il valore editabile è il colore banda (band_color), non resistance numerica.
  const isPullUp = isPullUpExercise(log.exercise_name);
  ST.trainEditLogRow = {
    id,
    reps: log.reps != null ? String(log.reps) : '',
    resistance: isPullUp ? (log.band_color || '') : (log.resistance || ''),
    rir: log.rir_actual != null ? String(log.rir_actual) : '',
  };
  renderTraining();
  setTimeout(()=>document.getElementById('elr-reps')?.focus(), 50);
}

function cancelEditLogRow(){
  ST.trainEditLogRow = null;
  renderTraining();
}

// ═══ WS-QUEUE — scritture affidabili su workout_sets ═══
// Ogni insert/update/delete verso workout_sets passa da wsWrite(): 1 retry
// immediato, poi coda persistente in localStorage con recupero automatico
// (al boot e a ogni scrittura riuscita). training_logs resta la fonte primaria
// e il flusso utente non si blocca mai: il fallimento produce solo un toast
// discreto e l'operazione viene riconsegnata appena possibile.
const WS_PENDING_CAP = 200;
function _wsPendingKey(){ return 'zt_ws_pending_' + ((ST.user && ST.user.id) || 'anon'); }
function _wsLoadPending(){
  try { return JSON.parse(localStorage.getItem(_wsPendingKey())) || []; } catch(e){ return []; }
}
function _wsSavePending(q){
  try { localStorage.setItem(_wsPendingKey(), JSON.stringify(q)); } catch(e){}
}
// Chiave composita di una serie: la stessa usata per riconciliare i due archivi
function _wsKey(date, sessionType, exName, setNumber){
  return [date, sessionType, exName, setNumber].join('|');
}
// Esegue una singola operazione su workout_sets. Ritorna il result supabase
// ({ data, error }); le eccezioni di rete vengono normalizzate in { error }.
//
// ⚠️ QUI NON SI USA dbq(), ED E' VOLUTO. Un censimento delle chiamate senza
// controllo d'errore segnala queste righe come scoperte: non lo sono. L'esito
// e' controllato da TUTTI e quattro i chiamanti — wsWrite (due volte, per il
// retry) e _wsReplayOp (due volte) — che leggono `res.error`.
// La WS-QUEUE e' una rete piu' fitta di dbq, non piu' larga: riprova subito,
// poi accoda su localStorage e riconsegna al boot o alla prima scrittura
// riuscita. Avvolgere qui aggiungerebbe un toast d'errore a ogni intoppo
// passeggero che la coda sta gia' gestendo da sola, dicendo all'utente che
// qualcosa e' andato perso quando invece e' solo in attesa.
async function _wsExec(op, payload){
  try {
    if(op === 'insert'){
      return await supa.from('workout_sets').insert(payload).select('id').single();
    }
    if(op === 'update'){
      let q = supa.from('workout_sets').update(payload.fields);
      for(const c in payload.match) q = q.eq(c, payload.match[c]);
      return await q;
    }
    if(op === 'delete'){
      let q = supa.from('workout_sets').delete();
      for(const c in payload.match) q = q.eq(c, payload.match[c]);
      return await q;
    }
    return { error: { message: 'ws op sconosciuta: ' + op } };
  } catch(e){
    return { error: { message: e && e.message || 'network error' } };
  }
}
function _wsEnqueue(op, payload, key){
  const q = _wsLoadPending();
  q.push({ op, payload, key, ts: Date.now() });
  // Cap: oltre 200 operazioni scarta le più vecchie
  while(q.length > WS_PENDING_CAP){
    const dropped = q.shift();
    console.warn('[ws-queue] cap ' + WS_PENDING_CAP + ' raggiunto, scartata op più vecchia:', dropped.op, dropped.key);
  }
  _wsSavePending(q);
}
// Scrittura con 1 retry immediato; se fallisce ancora → coda + toast discreto.
// Ritorna il result supabase in caso di successo, null se accodata.
async function wsWrite(op, payload, key, toastMsg){
  if(!ST.user || ST.user.id === 'test-user-001') return null;
  let res = await _wsExec(op, payload);
  if(res.error) res = await _wsExec(op, payload); // 1 retry immediato
  if(res.error){
    _wsEnqueue(op, payload, key);
    console.warn('[ws-queue] op accodata dopo retry fallito:', op, key, res.error.message);
    showToast(toastMsg || 'Serie salvata, sincronizzazione in coda', '🔄', 4500);
    return null;
  }
  _wsFlushQueue(); // scrittura riuscita: prova a smaltire eventuali pendenti (non bloccante)
  return res;
}
// Replay di una singola op pendente. Ritorna true se l'op può uscire dalla coda.
async function _wsReplayOp(item){
  const { op, payload } = item;
  if(op === 'insert'){
    // Idempotente: verifica esistenza per chiave composita prima di inserire
    const p = payload;
    try {
      const { data, error } = await supa.from('workout_sets').select('id')
        .eq('user_id', p.user_id).eq('date', p.date).eq('session_type', p.session_type)
        .eq('exercise_name', p.exercise_name).eq('set_number', p.set_number).limit(1);
      if(error) return false;
      if(data && data.length) return true; // già presente → esce dalla coda
    } catch(e){ return false; }
    const res = await _wsExec('insert', payload);
    return !res.error;
  }
  if(op === 'update' || op === 'delete'){
    // Riga inesistente = 0 match: non è un errore, l'op esce dalla coda
    const res = await _wsExec(op, payload);
    return !res.error;
  }
  return true; // op sconosciuta: scarta
}
// Svuotamento coda: chiamata al boot (post-login) e dopo ogni scrittura riuscita.
// Per ogni chiave le op si eseguono in ordine di ts; se una fallisce, le successive
// della stessa chiave restano in coda (ordine preservato). Un delete che segue un
// insert pendente annulla entrambi senza toccare il DB.
let _wsFlushing = false;
async function _wsFlushQueue(){
  if(_wsFlushing) return;
  if(!ST.user || ST.user.id === 'test-user-001') return;
  let q = _wsLoadPending();
  if(!q.length) return;
  _wsFlushing = true;
  try {
    q.sort((a,b) => (a.ts||0) - (b.ts||0));
    // Annullamento insert+delete sulla stessa chiave (il delete è successivo)
    const cancelled = new Set();
    const byKey = {};
    q.forEach((o,i) => { (byKey[o.key] = byKey[o.key] || []).push(i); });
    for(const key in byKey){
      const idxs = byKey[key];
      const insIdx = idxs.find(i => q[i].op === 'insert');
      if(insIdx !== undefined && idxs.some(i => q[i].op === 'delete' && (q[i].ts||0) >= (q[insIdx].ts||0))){
        idxs.forEach(i => cancelled.add(i));
      }
    }
    if(cancelled.size){
      q = q.filter((_,i) => !cancelled.has(i));
      _wsSavePending(q);
    }
    const remaining = [];
    const failedKeys = new Set();
    for(const item of q){
      if(failedKeys.has(item.key)){ remaining.push(item); continue; }
      let ok = false;
      try { ok = await _wsReplayOp(item); } catch(e){ ok = false; }
      if(!ok){ remaining.push(item); failedKeys.add(item.key); }
    }
    _wsSavePending(remaining);
  } finally {
    _wsFlushing = false;
  }
}

async function confirmEditLogRow(){
  const e = ST.trainEditLogRow;
  if(!e) return;
  const repsEl = document.getElementById('elr-reps');
  const resistEl = document.getElementById('elr-resist');
  const rirEl = document.getElementById('elr-rir');
  const reps = parseInt(repsEl?.value) || 0;
  const resistance = (resistEl?.value || '').toString().trim();
  const rir = (rirEl && rirEl.value !== '' && rirEl.value != null) ? parseInt(rirEl.value, 10) : null;
  if(!reps){ repsEl?.focus(); return; }
  if(!ST.user || ST.user.id==='test-user-001'){ ST.trainEditLogRow = null; renderTraining(); return; }
  // Trova log originale per la composite key fallback su workout_sets e per detect trazioni
  const orig = (ST.trainDayLogs || []).find(l => l.id === e.id);
  const isPullUp = orig && isPullUpExercise(orig.exercise_name);
  const bandColor = isPullUp ? (BAND_COLORS.includes(resistance) ? resistance : null) : null;
  if(isPullUp && !bandColor){ showToast('Scegli il livello di assistenza','⚠️'); return; }
  const resistInt = isPullUp ? null : (resistance ? (parseInt(resistance) || null) : null);
  const resistanceText = isPullUp ? null : (resistance || null);
  // 1. UPDATE training_logs by id (sorgente per Progressione)
  // Il try/catch da solo vedeva le cadute di rete ma non gli errori dell'API.
  // Qui l'esito conta il doppio: il passo 2 aggiorna workout_sets comunque, e se
  // questo passo fallisce in silenzio i due archivi divergono — proprio la
  // divergenza che la bonifica del 17 luglio aveva riportato a zero.
  const upd = await dbq('aggiornare la serie', supa.from('training_logs').update({
    reps,
    resistance: resistanceText,
    band_color: bandColor,
    rir_actual: rir,
  }).eq('id', e.id).eq('user_id', ST.user.id));
  const updOk = !(upd && upd.error);
  // 2. UPDATE workout_sets by composite key (training_logs.id ≠ workout_sets.id)
  //    via wsWrite: retry + coda persistente, nessun fallimento silenzioso
  if(orig){
    await wsWrite('update', {
      fields: { reps, resistance: resistInt, band_color: bandColor, rir_actual: rir },
      match: { user_id: ST.user.id, date: orig.date, session_type: orig.session_id,
               exercise_name: orig.exercise_name, set_number: orig.set_number },
    }, _wsKey(orig.date, orig.session_id, orig.exercise_name, orig.set_number),
    'Modifica salvata, sincronizzazione in coda');
  }
  ST.trainEditLogRow = null;
  // Re-fetch logs del modal e progressione
  if(ST.trainDayDetail){
    await openDayDetail(ST.trainDayDetail.date, ST.trainDayDetail.exName);
  }
  if(ST.trainProgEx) await loadTrainingLogs(ST.trainProgEx);
  // Il "fatto" si dice solo se e' fatto: se l'update sopra e' fallito, dbq ha gia'
  // mostrato l'avviso e aggiungere "Serie aggiornata" direbbe il contrario.
  if(updOk) showToast('Serie aggiornata');
}

function confirmDeleteSet(id, label){
  ST.trainDeleteSetConfirm = { id, label };
  renderTraining();
}

async function deleteSetConfirmed(){
  const c = ST.trainDeleteSetConfirm;
  if(!c) return;
  ST.trainDeleteSetConfirm = null;
  if(!ST.user || ST.user.id==='test-user-001'){ renderTraining(); return; }
  const orig = (ST.trainDayLogs || []).find(l => l.id === c.id);
  // 1. DELETE training_logs by id
  // Il try/catch fermava tutto sulle cadute di rete (return), ma non vedeva gli
  // errori dell'API. Si tiene lo stesso comportamento anche per quelli: se la
  // riga primaria non si cancella non si tocca workout_sets, altrimenti i due
  // archivi divergerebbero — con l'aggravante che la serie resterebbe visibile
  // in Progressione, che legge da training_logs.
  const del = await dbq('eliminare la serie', supa.from('training_logs').delete().eq('id', c.id).eq('user_id', ST.user.id));
  if(del && del.error){ renderTraining(); return; }
  // 2. DELETE workout_sets by composite key
  //    via wsWrite: retry + coda persistente, nessun fallimento silenzioso
  if(orig){
    await wsWrite('delete', {
      match: { user_id: ST.user.id, date: orig.date, session_type: orig.session_id,
               exercise_name: orig.exercise_name, set_number: orig.set_number },
    }, _wsKey(orig.date, orig.session_id, orig.exercise_name, orig.set_number),
    'Eliminazione registrata, sincronizzazione in coda');
  }
  showToast('Serie eliminata');
  invalidateAllExerciseNamesCache(); // potrebbe essere ultimo log dell'esercizio
  // Re-fetch
  if(ST.trainDayDetail){
    await openDayDetail(ST.trainDayDetail.date, ST.trainDayDetail.exName);
  }
  if(ST.trainProgEx) await loadTrainingLogs(ST.trainProgEx);
}

// Conferma elimina workout intero (chiamata dal bottone in fondo al modal day-detail)
function confirmDeleteWorkoutFromDetail(){
  const dd = ST.trainDayDetail;
  if(!dd) return;
  // Trova workout di quel giorno (dal calendario in memoria)
  const w = (ST.trainWorkouts || []).find(x => x.date === dd.date);
  if(!w){ showToast('Workout non trovato in calendario'); return; }
  ST.trainDeleteWorkoutConfirm = { id: w.id, date: dd.date };
  renderTraining();
}

async function deleteWorkoutConfirmed(){
  const c = ST.trainDeleteWorkoutConfirm;
  if(!c) return;
  ST.trainDeleteWorkoutConfirm = null;
  // Riusa la deleteWorkout esistente, poi chiudi modal
  await deleteWorkout(c.id, c.date);
  invalidateAllExerciseNamesCache(); // workout eliminato → potenzialmente esercizi senza più log
  closeDayDetail();
  if(ST.trainProgEx) loadTrainingLogs(ST.trainProgEx);
}

// Prep beep — singolo "tic" preparatorio per i secondi 5,4,3,2,1.
// Tono basso/dolce: sine 600Hz, 80ms, gain 0.35.
function playPrepBeep(){
  try {
    const ctx = _ensureAudioCtx();
    if(!ctx) return;
    const fire = ()=>{
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 600;
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime;
        gain.gain.setValueAtTime(0.35, t0);
        gain.gain.setValueAtTime(0.35, t0 + 0.06);
        gain.gain.linearRampToValueAtTime(0.0001, t0 + 0.08);
        osc.start(t0);
        osc.stop(t0 + 0.09);
      } catch(e){}
    };
    if(ctx.state === 'suspended'){
      ctx.resume().then(fire).catch(()=>{});
    } else {
      fire();
    }
  } catch(e){}
}

// Beep di stop — segnala fine round/fase (sine 659Hz, ~730ms, gain 0.85)
// + vibrazione [400].
function playStopBeep(){
  try {
    if(navigator.vibrate){ try{ navigator.vibrate([400]); }catch(e){} }
    const ctx = _ensureAudioCtx();
    if(!ctx) return;
    const fire = ()=>{
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 659;
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime;
        gain.gain.setValueAtTime(0.85, t0);
        gain.gain.setValueAtTime(0.85, t0 + 0.68);
        gain.gain.linearRampToValueAtTime(0.0001, t0 + 0.72);
        osc.start(t0);
        osc.stop(t0 + 0.73);
      } catch(e){}
    };
    if(ctx.state === 'suspended'){ ctx.resume().then(fire).catch(()=>{}); } else { fire(); }
  } catch(e){}
}

// Bip lungo — segnala la (ri)partenza di un esercizio.
// Tono singolo 1100Hz sine ~640ms, gain 0.8 + vibrazione [400].
function playLongBeep(){
  try {
    if(navigator.vibrate){
      try { navigator.vibrate([400]); } catch(e){}
    }
    const ctx = _ensureAudioCtx();
    if(!ctx) return;
    const fire = ()=>{
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 1100;
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime;
        gain.gain.setValueAtTime(0.8, t0);
        gain.gain.setValueAtTime(0.8, t0 + 0.60);
        gain.gain.linearRampToValueAtTime(0.0001, t0 + 0.64);
        osc.start(t0);
        osc.stop(t0 + 0.66);
      } catch(e){}
    };
    if(ctx.state === 'suspended'){
      ctx.resume().then(fire).catch(()=>{});
    } else {
      fire();
    }
  } catch(e){}
}

// Countdown recupero timestamp-based — continua in background, ricalcola al rientro
function startTrainingCountdown(seconds, exName, sessionId){
  if(ST._countdownInterval) clearInterval(ST._countdownInterval);
  const endTime = Date.now() + seconds * 1000;
  const _gifExDef = findExercise(exName, sessionId);
  const _gifCode = _gifExDef?.codice || null;
  ST.trainCountdown = {
    seconds,                  // intero corrente per il display (in secondi)
    total: seconds,           // durata iniziale (legacy, per back-compat)
    done: false,
    beeped: false,            // anti-doppio-beep al rientro foreground
    prepBeeped: {},           // { 5:true, 4:true, ... } anti-doppio prep beep
    endTime,                  // ms timestamp di scadenza — sorgente di verità
    exName,                   // esercizio current per render Esecuzione/Errori/Alert
    exCode: _gifCode,         // codice catalogo (EX###) per lookup GIF via ?code=
    sessionId,                // sessione corrente (per buildCoachPrompt)
    gifOpen: false,           // toggle GIF esecuzione nel modal recupero (default chiuso)
  };
  // Se recupero ≤5 sec, non emettere prep beep (sarebbero immediati e confusi dopo il GO beep)
  if(seconds <= 5){
    for(let s = 1; s <= 5; s++) ST.trainCountdown.prepBeeped[s] = true;
  }
  ST._countdownInterval = setInterval(tickCountdown, 250); // tick 4x/sec, update surgical
  ensureRestCue(exName, sessionId);  // genera cue AI in background (no-op se gia in cache)
  ensureRestGif(exName, _gifCode);   // pre-fetch GIF; usa ?code= se disponibile
}

// Garantisce che ST.aiCue[`${sessionId}_${exName}`] sia popolato. Se gia presente: no-op.
// Race-safe rispetto a openExerciseAI: entrambi possono scrivere stessa chiave senza danno
// (callAI puo essere chiamato 2x in casi rari, costo trivial).
async function ensureRestCue(exName, sessionId) {
  if (!exName || !sessionId) return;
  const key = `${sessionId}_${exName}`;
  if (ST.aiCue[key]) return;
  const eqSessione = (ST.exerciseAIOpen?.exName === exName ? ST.exerciseAIOpen?.eq : null)
    || (ST.trainExecOpen?.exName === exName ? ST.trainExecOpen?.eq : null)
    || '';
  const prompt = buildCoachPrompt(exName, sessionId, eqSessione);
  try {
    const text = await callAI(prompt, 200);
    const content = (text || '').trim()
      .replace(/^["'`]|["'`]$/g, '')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    ST.aiCue[key] = content || '<em style="color:var(--t3);">(nessun cue disponibile)</em>';
  } catch(e) {
    ST.aiCue[key] = '<em style="color:#B84C2A;">' + cueErrMsg(e.aiKind) + '</em>';
  }
  // Re-render solo se l'utente e' ancora sul modal di recupero per QUESTO esercizio
  if (ST.page === 'training' && ST.trainCountdown && ST.trainCountdown.exName === exName) {
    renderTraining();
  }
}

// Pre-fetch silenzioso GIF esecuzione: popola ST.exerciseGifCache[exName] con {url, status}.
// Chiamata da startTrainingCountdown. No-op se gia' fetched (anche status='missing'/'error').
// Re-render del modal recupero solo se l'utente e' ancora sull'esercizio quando arriva la risposta.
async function ensureRestGif(exName, exCode) {
  if (!exName) return;
  const cacheKey = exCode || exName;
  if (ST.exerciseGifCache[cacheKey]) return; // gia' fetched
  ST.exerciseGifCache[cacheKey] = { url: null, status: 'loading' };
  try {
    const m = await fetchExerciseMedia(exName, exCode);
    ST.exerciseGifCache[cacheKey] = {
      url: m.cached_url || null,
      status: m.status || 'missing'
    };
  } catch(e) {
    ST.exerciseGifCache[cacheKey] = { url: null, status: 'error' };
  }
  // Re-render se l'utente e' ancora sul countdown recupero (BLOCCO 2A) o sulla
  // schermata esecuzione (BLOCCO 2B) per QUESTO esercizio: arrivata la GIF, sostituisce
  // il placeholder. Negli altri casi il prefetch e' silenzioso (cache letta al prossimo render).
  if (ST.page === 'training' && (
        (ST.trainCountdown && ST.trainCountdown.exName === exName) ||
        (ST.trainExecOpen  && ST.trainExecOpen.exName  === exName)
      )) {
    renderTraining();
  }
}

// Tick: ricalcola remaining da endTime, beep+render solo se serve
function tickCountdown(){
  const cd = ST.trainCountdown;
  if(!cd){
    if(ST._countdownInterval){ clearInterval(ST._countdownInterval); ST._countdownInterval = null; }
    return;
  }
  const remaining = Math.max(0, Math.ceil((cd.endTime - Date.now()) / 1000));
  // Triplo beep finale alla scadenza (idempotente: anche se utente torna in app dopo)
  if(remaining <= 0 && !cd.beeped){
    cd.beeped = true;
    playStopBeep();
    setTimeout(()=>{
      if(ST.trainCountdown && ST.trainCountdown.beeped){
        setTimeout(()=>{
          skipCountdown();
          scrollToActiveExercise();
        }, 300);
      }
    }, 400);
  }
  // Re-render solo se il valore intero del secondo è cambiato (evita 4 render/sec)
  if(remaining !== cd.seconds){
    // Anti-salto: se siamo rientrati da background con un salto >1 secondo,
    // marca i prep beep saltati come gia' suonati SENZA emetterli (no burst sgradevole).
    if(remaining < cd.seconds - 1){
      for(let s = Math.min(5, cd.seconds - 1); s > remaining; s--){
        cd.prepBeeped[s] = true;
      }
    }
    // Prep beep normale: 1 tic alla transizione in 5,4,3,2,1 (idempotente via cd.prepBeeped)
    if(remaining >= 1 && remaining <= 5 && !cd.prepBeeped[remaining]){
      cd.prepBeeped[remaining] = true;
      playPrepBeep();
    }
    cd.seconds = remaining;
    if(remaining <= 0) cd.done = true;
    if (cd.done) {
      renderTraining(); // full re-render per done state (PRONTO!)
    } else {
      // Update SURGICAL: aggiorna solo il numero countdown + ring stroke-dashoffset.
      // Critico per preservare l'animazione della GIF: un full re-render ad ogni
      // secondo ricrea l'<img class="rest-hero-gif"> dal DOM resettando la GIF al
      // frame 1, facendola sembrare statica. Selector .rest-hero-cd-num (BLOCCO 2A).
      const numEl  = document.querySelector('.rest-hero-cd-num');
      const ringEl = document.querySelector('.rest-ring-fill');
      if (numEl) {
        const fmtTime = (sec) => sec >= 60
          ? `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`
          : String(sec);
        numEl.textContent = fmtTime(remaining);
        let numColor = 'var(--acc)';
        if (remaining <= 10) {
          const pct = remaining / 10;
          const r = Math.round(42 + (184-42)*(1-pct));
          const g = Math.round(122 + (76-122)*(1-pct));
          const b = Math.round(111 + (42-111)*(1-pct));
          numColor = 'rgb('+r+','+g+','+b+')';
        }
        numEl.style.color = numColor;
        // Ring SVG surgical: aggiorna stroke-dashoffset + stroke senza ricreare il DOM
        if (ringEl) {
          const ringC = 326.73;
          const ringPct = (cd.total > 0) ? (remaining / cd.total) : 0;
          const ringOffset = ringC * (1 - ringPct);
          ringEl.setAttribute('stroke-dashoffset', ringOffset.toFixed(2));
          ringEl.style.stroke = numColor;
        }
      } else {
        renderTraining(); // fallback se DOM non ready
      }
    }
  }
}

function skipCountdown(){
  if(ST._countdownInterval){ clearInterval(ST._countdownInterval); ST._countdownInterval = null; }
  ST.trainCountdown = null;
  renderTraining();
  scrollToActiveExercise();
}

// Scrolla al centro la card del primo esercizio non completato della sessione corrente
function scrollToActiveExercise(){
  try {
    const sel = ST.trainSession;
    if(!sel) return;
    const sess = getTrainingSession(sel);
    if(!sess || !sess.exercises) return;
    const today = todayKey();
    const activeEx = sess.exercises.find(ex => {
      const keys = Object.keys(ST.trainLoggedSets || {}).filter(k =>
        k.startsWith(`${sel}_${ex.name}_`) && k.endsWith(`_${today}`)
      );
      return keys.length < ex.sets;
    });
    if(!activeEx) return;
    const safeId = 'excard-' + activeEx.name.replace(/[^a-zA-Z0-9]/g,'_');
    setTimeout(()=>{
      const el = document.getElementById(safeId);
      if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }, 120);
  } catch(e){}
}

// Carica gli allenamenti per la striscia calendario, il dettaglio giorno e il
// pulsante "elimina allenamento": tutti e tre cercano una data dentro
// ST.trainWorkouts, quindi condividono la stessa cache e lo stesso buco.
//
// CANTIERE 24 (9 ago 2026) — prima caricava UN MESE SOLO, quello corrente.
// La striscia pero' va solo all'indietro e cambiando settimana non ricarica
// niente: sposta un contatore e ridisegna. Risultato, qualunque settimana
// precedente al mese corrente era cieca per intero — non solo i giorni di bordo
// come diceva la diagnosi iniziale. Misurato sui dati veri: 81 allenamenti, 6 nel
// mese corrente e 75 fuori, cioe' il 93% dello storico invisibile appena si
// tornava indietro. I sintomi erano tre: casella senza pallino, dettaglio giorno
// senza nome sessione, e "Workout non trovato in calendario" premendo elimina.
//
// Ora si carica tutto lo storico dell'utente. Sono poche righe (81 oggi) e sparisce
// l'intera classe di difetto invece di spostarne il confine di qualche giorno:
// niente piu' logica sui bordi, e niente chiamata di rete a ogni tocco di freccia.
// E' lo stesso criterio che loadTrainingAllCompleted usa da sempre — il motivo per
// cui rotazione, streak e debito hanno sempre visto giusto mentre la striscia no.
//
// Non prende piu' anno e mese. Gli ultimi due chiamanti che li passavano erano le
// frecce del calendario mensile, rimosse col cantiere 25.
async function loadWorkouts(){
  ST.trainWorkouts = null; // loading
  renderTraining();
  if(!ST.user || ST.user.id==='test-user-001'){ ST.trainWorkouts=[]; renderTraining(); return; }
  // Paginata (L13): oggi 81 righe sono lontane dal limite di 1000, ma al ritmo di
  // 4-5 allenamenti a settimana ci si arriva in qualche anno.
  const BLOCCO = 1000;
  const tutti = [];
  for(let da = 0; ; da += BLOCCO){
    const { data, error } = await supa.from('workouts')
      .select('*')
      .eq('user_id', ST.user.id)
      .order('date')
      .range(da, da + BLOCCO - 1);
    if(error){
      console.warn('loadWorkouts:', error.message);
      ST.trainWorkouts = [];      // niente cache muta: la vista sa di non avere dati
      renderTraining();
      return;
    }
    const blocco = data || [];
    tutti.push(...blocco);
    if(blocco.length < BLOCCO) break;   // blocco non pieno = ultimo
  }
  ST.trainWorkouts = tutti;
  renderTraining();
}

// Riposo SCELTO (volontario): marca giorno come "rest" in workouts.
// Idempotente per session_type.
async function markRestChosen(){
  if(!ST.user || ST.user.id==='test-user-001') return;
  const today = todayKey();
  try {
    // Guard doppia marcatura: un giorno è riposo scelto O infortunio, mai entrambi
    const { data: existAny } = await dbq('leggere gli allenamenti di oggi', supa.from('workouts')
      .select('id, session_type').eq('user_id', ST.user.id).eq('date', today)
      .in('session_type', ['rest','rest_injury']));
    const existing = (existAny || [])[0];
    if(existing){
      showToast(existing.session_type === 'rest_injury'
        ? 'Oggi è già segnato come infortunio' : 'Riposo già segnato per oggi');
      return;
    }
    const { error } = await supa.from('workouts').insert({
      user_id: ST.user.id, date: today, session_type: 'rest', completed: true, duration_min: 0
    });
    if(error) throw error;
    showToast('🌙 Riposo segnato');
    loadTrainingHomeData();
    // Forza refresh calendario al prossimo accesso Progressione
    ST.trainWorkouts = undefined;
  } catch(e){
    console.warn('markRestChosen:', e.message);
    showToast('Errore: ' + e.message);
  }
}

// Riposo PER INFORTUNIO: marca giorno come "rest_injury" + nota su zona del corpo.
// Mini-modal "Riposo per infortunio" (sostituisce il prompt() di sistema) — riusa il pattern .weight-modal.
function openInjuryModal(){
  const inp = document.getElementById('injury-zone-inp');
  if(inp) inp.value = '';
  const m = document.getElementById('injury-modal');
  if(m) m.style.display = 'flex';
  if(inp) setTimeout(()=>inp.focus(), 50);
}
function closeInjuryModal(){
  const m = document.getElementById('injury-modal');
  if(m) m.style.display = 'none';
}

async function markRestInjury(zoneNote){
  if(!ST.user || ST.user.id==='test-user-001') return;
  const today = todayKey();
  try {
    // Guard doppia marcatura: un giorno è riposo scelto O infortunio, mai entrambi
    const { data: existAny } = await dbq('leggere gli allenamenti di oggi', supa.from('workouts')
      .select('id, session_type').eq('user_id', ST.user.id).eq('date', today)
      .in('session_type', ['rest','rest_injury']));
    const existing = (existAny || [])[0];
    if(existing){
      showToast(existing.session_type === 'rest'
        ? 'Oggi è già segnato come riposo scelto' : 'Riposo per infortunio già segnato per oggi');
      return;
    }
    const { error } = await supa.from('workouts').insert({
      user_id: ST.user.id, date: today, session_type: 'rest_injury', completed: true, duration_min: 0,
      note: (zoneNote || '').trim() || null
    });
    if(error) throw error;
    showToast('🩹 Riposo per infortunio segnato');
    loadTrainingHomeData();
    ST.trainWorkouts = undefined;
  } catch(e){
    console.warn('markRestInjury:', e.message);
    showToast('Errore: ' + e.message);
  }
}

// ═══ INFORTUNIO MULTI-GIORNO (17 lug 2026) ═══
// Periodo con durata prevista in localStorage (zt_injury_<userId>), giorni
// materializzati UNO AL GIORNO al passaggio come righe workouts 'rest_injury'
// idempotenti: calendario, debito e settimana ciclo continuano a leggere le
// stesse righe di sempre (zero consumatori da toccare) e la storia resta
// visibile cross-device. Nessuna riga scritta in anticipo.
function _injKey(){ return 'zt_injury_' + ((ST.user && ST.user.id) || 'anon'); }
function _injLoad(){ try { return JSON.parse(localStorage.getItem(_injKey())) || null; } catch(e){ return null; } }
function _injSave(o){ try { localStorage.setItem(_injKey(), JSON.stringify(o)); } catch(e){} }
function _injAddDays(dateStr, n){
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
// Periodo attivo (null se spento o scaduto). Scadenza automatica oltre endDate.
function getInjuryPeriod(){
  const p = _injLoad();
  if(!p || !p.active) return null;
  if(p.endDate && todayKey() > p.endDate){ _injSave({ ...p, active: false }); return null; }
  return p;
}
// Scrittura silenziosa e idempotente della riga rest_injury di un giorno.
// Non scrive se il giorno ha già 'rest' o 'rest_injury' (guard doppia marcatura).
async function _injWriteDay(date, zone){
  const { data: existing } = await dbq('leggere gli allenamenti di oggi', supa.from('workouts')
    .select('id, session_type').eq('user_id', ST.user.id).eq('date', date)
    .in('session_type', ['rest','rest_injury']));
  if(existing && existing.length) return false;
  const { error } = await supa.from('workouts').insert({
    user_id: ST.user.id, date, session_type: 'rest_injury', completed: true,
    duration_min: 0, note: (zone || '').trim() || null
  });
  return !error;
}
// Avvio periodo dal modal: days = 1 | 3 | 7 | null (aperto, senza scadenza).
// Il caso 1 giorno riproduce il comportamento storico: una sola riga oggi.
async function startInjuryPeriod(days){
  if(!ST.user || ST.user.id === 'test-user-001') return;
  const zone = (document.getElementById('injury-zone-inp')?.value || '').trim();
  closeInjuryModal();
  const today = todayKey();
  try {
    const { data: rest } = await dbq('leggere gli allenamenti di oggi', supa.from('workouts')
      .select('id').eq('user_id', ST.user.id).eq('date', today).eq('session_type', 'rest').maybeSingle());
    if(rest){ showToast('Oggi è già segnato come riposo scelto', '⚠️'); return; }
  } catch(e){}
  const endDate = days ? _injAddDays(today, days - 1) : null;
  _injSave({ active: true, startDate: today, endDate, zone });
  try { await _injWriteDay(today, zone); } catch(e){}
  showToast(days === 1 ? '🩹 Riposo per infortunio segnato' : '🩹 Periodo infortunio avviato');
  loadTrainingHomeData();
  ST.trainWorkouts = undefined;
  renderTraining();
}
// "Sto bene, riprendo": il periodo termina oggi, da domani tutto normale.
function endInjuryPeriod(){
  const p = _injLoad();
  if(!p) return;
  _injSave({ ...p, active: false, endDate: todayKey() });
  showToast('Bentornato! Periodo infortunio chiuso 💪');
  renderTraining();
}
// Tick giornaliero: materializza la riga di OGGI se il periodo è attivo.
// Agganciato a loadTrainingHomeData → copre boot, cambio giorno e refresh.
let _injTickDate = null;
async function injuryDailyTick(){
  try {
    if(!ST.user || ST.user.id === 'test-user-001') return;
    const p = getInjuryPeriod();
    if(!p) return;
    const today = todayKey();
    if(_injTickDate === today) return; // già materializzato oggi (guard in-memory)
    _injTickDate = today;
    const wrote = await _injWriteDay(today, p.zone);
    if(wrote) ST.trainWorkouts = undefined; // refresh calendario al prossimo accesso
  } catch(e){}
}
// Barra discreta in Training durante il periodo (pattern banner scarico/rientro)
function _renderInjuryBar(){
  const p = getInjuryPeriod();
  if(!p) return '';
  const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  const txt = p.endDate
    ? `Infortunio attivo — rientro previsto ${fmt(_injAddDays(p.endDate, 1))}`
    : 'Infortunio attivo — chiudi quando sei pronto';
  const zone = p.zone ? ` (${p.zone})` : '';
  return `
    <div style="background:var(--s1);border:1px solid var(--err);border-radius:14px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:180px;">
        <div style="font-size:11px;font-weight:700;font-family:var(--font-mono);color:var(--err);letter-spacing:.06em;margin-bottom:3px;">🩹 INFORTUNIO</div>
        <div style="font-size:13px;color:var(--t1);font-family:var(--font-sans);">${txt}${zone}</div>
      </div>
      <button onclick="endInjuryPeriod()" style="flex-shrink:0;background:var(--acc);color:#fff;border:none;border-radius:10px;padding:10px 14px;font-size:12px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Sto bene, riprendo</button>
    </div>`;
}

async function saveWorkoutRecord(sessionId){
  if(!ST.user || ST.user.id==='test-user-001') return;
  const today = todayKey();
  // Idempotente: skip se già esiste un workout per oggi+sessione
  try {
    const { data: existing } = await dbq('leggere gli allenamenti di oggi', supa.from('workouts')
      .select('id')
      .eq('user_id', ST.user.id)
      .eq('date', today)
      .eq('session_type', sessionId)
      .limit(1));
    if(existing && existing.length > 0){
      ST.trainCompletedToday[sessionId] = true;
      ST.sessionLastCompletion[sessionId] = today;
      return existing[0].id;
    }
  } catch(e){}
  const durationMin = ST.trainSessionStart
    ? Math.max(1, Math.round((Date.now() - ST.trainSessionStart) / 60000))
    : null;
  const { data, error } = await supa.from('workouts').insert({
    user_id: ST.user.id,
    date: today,
    session_type: sessionId,
    completed: true,
    duration_min: durationMin,
  }).select('id').single();
  if(error){ console.warn('saveWorkoutRecord:', error.message); return null; }
  ST.trainCompletedToday[sessionId] = true;
  ST.sessionLastCompletion[sessionId] = today;
  // Svuota la cache del calendario: si ricarica al prossimo accesso a Progressione.
  // Era dentro un "se siamo nel mese corrente" che confrontava ST.trainCalMonth col
  // mese di oggi. Quel confronto era sempre vero — nessuno impostava mai
  // trainCalMonth, se non le frecce del calendario mensile, mai eseguite dal 10
  // giugno — e dal cantiere 24 il caricamento non ragiona più per mesi.
  ST.trainWorkouts = undefined;
  loadTrainingAllCompleted();
  return data?.id || null;
}

async function loadSessionLastCompletion(opts){
  if(!ST.user || ST.user.id==='test-user-001'){ ST.sessionLastCompletion={}; return; }
  try {
    const today = todayKey();
    const { data } = await dbq('leggere gli allenamenti completati', supa.from('workouts')
      .select('session_type, date')
      .eq('user_id', ST.user.id)
      .eq('completed', true)
      .not('session_type', 'in', '(rest,rest_injury)')
      .order('date', {ascending:false})
      .limit(80), {silenzioso:true});
    const map = {};
    (data||[]).forEach(w=>{
      if(!map[w.session_type] || w.date > map[w.session_type]) map[w.session_type] = w.date;
    });
    ST.sessionLastCompletion = map;
    ST.trainCompletedToday = {};
    Object.keys(map).forEach(st=>{ if(map[st] === today) ST.trainCompletedToday[st] = true; });
    if(ST.page === 'training' && !(opts && opts.skipRender)) renderTraining();
  } catch(e){}
}

// Carica TUTTI i workout completati validi (escluso rest e rest_injury) per conteggio settimana ciclo.
async function loadTrainingAllCompleted(opts){
  if(!ST.user || ST.user.id==='test-user-001'){ ST.trainAllCompleted = []; return; }
  if(ST.coachDeloads === undefined){ ST.coachDeloads = []; loadCoachProposals(); }   // scarichi anticipati accettati (Pirsi propone)
  try {
    let q = supa.from('workouts')
      .select('id, session_type, date')
      .eq('user_id', ST.user.id)
      .eq('completed', true)
      .neq('session_type', 'rest')
      .neq('session_type', 'rest_injury');
    if(ST.profile && ST.profile.train_start_date) q = q.gte('date', ST.profile.train_start_date);
    q = q.order('date', {ascending:true});
    const { data, error } = await q;
    if(error){ console.warn('loadTrainingAllCompleted:', error.message); ST.trainAllCompleted=[]; return; }
    ST.trainAllCompleted = data || [];
    if(!(opts && opts.skipRender)){
      if(ST.page === 'training') renderTraining();
      else if(ST.page === 'home') renderHome();
    }
  } catch(e){
    ST.trainAllCompleted = [];
  }
}

// ── PROSSIMA serie — suggerimento DETERMINISTICO (29 mag 2026) ──
// Sostituisce suggestProgressionAI (che chiamava callAI per ogni serie).
// La progressione è pura matematica: stesse regole di doppia progressione
// già usate nel vecchio prompt, ma calcolate in codice. Vantaggi: zero
// latenza/costi, niente regressioni "creative" (es. RIR alto → MENO reps),
// e numeri sempre nei vincoli (reps nel range, resistenza multipli di 10).
// Ritorna "Serie N: <azione operativa>" (niente emoji/motivazione finale),
// oppure '' se non applicabile. Gestisce sia trazioni (banda) sia elastici (lbs).
// Chiamato solo per serie NON-ultima → mai una "Serie N" inesistente.
// ═══ RIENTRO SOFT — ripartenza graduale dopo pause lunghe (17 lug 2026) ═══
// Rilevamento all'apertura di una sessione di lavoro: se sono passati ≥10 giorni
// dall'ultimo allenamento reale (riposi/recuperi esclusi), propone un rientro
// graduale. SOLO suggerimenti: scheda, storico DB e settimana mesociclo intatti.
// Livello 1 (pausa 10-29 gg): −20% carico, RIR +1 · Livello 2 (≥30 gg): −35%, RIR +2.
// La scelta vale per tutto il rientro (7 giorni) e vive in localStorage per-utente:
// zt_soft_return_<userId> = { active, startDate, level, decidedFor }.
const SOFT_RETURN_MIN_DAYS = 10;
const SOFT_RETURN_L2_DAYS = 30;
const SOFT_RETURN_DURATION_DAYS = 7;
function _srKey(){ return 'zt_soft_return_' + ((ST.user && ST.user.id) || 'anon'); }
function _srLoad(){ try { return JSON.parse(localStorage.getItem(_srKey())) || null; } catch(e){ return null; } }
function _srSave(o){ try { localStorage.setItem(_srKey(), JSON.stringify(o)); } catch(e){} }
function _srDaysBetween(a, b){
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}
// Stato attivo corrente (null se spento o scaduto). Scadenza automatica: 7 giorni
// dalla prima sessione di rientro, poi la progressione normale riprende da sola.
function getSoftReturn(){
  const sr = _srLoad();
  if(!sr || !sr.active || !sr.startDate) return null;
  if(_srDaysBetween(sr.startDate, todayKey()) >= SOFT_RETURN_DURATION_DAYS){
    _srSave({ ...sr, active: false });
    return null;
  }
  return sr;
}
// Ultimo allenamento REALE precedente a oggi: max(date) in training_logs
// escludendo le sessioni recovery (i riposi non loggano, i recuperi non contano).
async function _srLastWorkoutDate(){
  const { data, error } = await supa.from('training_logs')
    .select('date')
    .eq('user_id', ST.user.id)
    .not('session_id', 'ilike', 'recovery%')
    .lt('date', todayKey())
    .order('date', { ascending: false })
    .limit(1);
  if(error || !data || !data.length) return null;
  return data[0].date;
}
// Chiamata fire-and-forget da openTrainingSession, solo sessioni di lavoro.
async function maybeProposeSoftReturn(sid){
  try {
    if(!ST.user || ST.user.id === 'test-user-001') return;
    const sess = getTrainingSession(sid);
    if(!sess || sess.type === 'Recupero') return;
    if(getSoftReturn()) return; // rientro già attivo: scelta ricordata, niente prompt
    const last = await _srLastWorkoutDate();
    if(!last) return; // nessuno storico → primo allenamento, non è un rientro
    const gap = _srDaysBetween(last, todayKey());
    if(gap < SOFT_RETURN_MIN_DAYS) return;
    const sr = _srLoad();
    if(sr && sr.decidedFor === last) return; // scelta già presa per QUESTA pausa
    ST.softReturnPrompt = { gapDays: gap, level: gap >= SOFT_RETURN_L2_DAYS ? 2 : 1, lastDate: last };
    if(ST.page === 'training' && ST.trainSession === sid) renderTraining();
  } catch(e){}
}
function softReturnAccept(){
  const p = ST.softReturnPrompt;
  if(!p) return;
  _srSave({ active: true, startDate: todayKey(), level: p.level, decidedFor: p.lastDate });
  ST.softReturnPrompt = null;
  showToast(p.level === 2
    ? 'Rientro soft attivo: −35% e RIR +2 per 7 giorni'
    : 'Rientro soft attivo: −20% e RIR +1 per 7 giorni', '🌱', 4000);
  renderTraining();
}
function softReturnDecline(){
  const p = ST.softReturnPrompt;
  if(!p) return;
  // Rifiuto ricordato: non riproporre finché non si chiude una NUOVA pausa ≥10 gg
  _srSave({ active: false, startDate: null, level: p.level, decidedFor: p.lastDate });
  ST.softReturnPrompt = null;
  renderTraining();
}
// Carico suggerito in rientro (solo display): −20% L1 / −35% L2,
// arrotondato allo step pratico (5 lbs / 2.5 kg).
function softReturnLoad(v){
  const sr = getSoftReturn();
  if(!sr || !(v > 0)) return null;
  const factor = sr.level === 2 ? 0.65 : 0.8;
  const step = (ST.profile && ST.profile.unit === 'kg') ? 2.5 : 5;
  return Math.max(0, Math.round((v * factor) / step) * step);
}
// Testo riga RIENTRO sul primo set: valore concreto se c'è l'ultima sessione.
function _softReturnRowText(exName){
  const sr = getSoftReturn();
  if(!sr) return '';
  const pct = sr.level === 2 ? 35 : 20;
  const unitLbl = (ST.profile && ST.profile.unit) || 'lbs';
  const last = ST.lastLoggedSets && ST.lastLoggedSets[exName];
  const v = (last && last.resistance != null && last.resistance !== '') ? parseFloat(last.resistance) : null;
  if(v > 0) return `riparti da ~${softReturnLoad(v)} ${unitLbl} (−${pct}% di ${v})`;
  return `riduci di ~${pct}% il carico dell'ultima volta`;
}

function computeNextSetSuggestion({sessionId, exName, setNum, reps, resistance, rir, exData, sess, bandColor}){
  if(!exData || !sess) return '';
  if(sess.type === 'Recupero') return ''; // Active Recovery: nessuna progressione di carico
  const parsed = parseRepsRange(exData.reps);
  if(!parsed || parsed.min === parsed.max) return ''; // formato non gestito o valore singolo
  const repsMin = parsed.min, repsMax = parsed.max;
  const isTimed = parsed.kind === 'seconds';
  // Esercizi unilaterali (parsed.perLato): ogni suggerimento mostra "per lato".
  // Una riga sola → copre tutti i rami (elastici, corpo libero, isometrici).
  const unitLbl = (isTimed ? 'sec' : 'reps') + (parsed.perLato ? ' per lato' : '');
  const step = isTimed ? 5 : 1; // +5 sec o +1 rep
  // Settimana 4 (SCARICO): RIR target forzato a 3 su TUTTI i rami (trazioni,
  // elastici/corpo libero, isometrici) — override su sess.rir, Pump incluso.
  // Settimane 1-3: comportamento invariato (sess.rir o default 2).
  let targetRIR = getCycleWeekInfo().isScarico ? 3 : ((sess.rir != null) ? sess.rir : 2);
  // RIENTRO SOFT attivo: RIR consigliato +1 (L1) / +2 (L2) su tutti i rami.
  // Solo suggerimenti — il carico ridotto vive nella riga RIENTRO del primo set
  // (niente riduzione qui: comporrebbe il −% a ogni serie loggata).
  const _softRet = getSoftReturn();
  if(_softRet) targetRIR = Math.min(4, targetRIR + (_softRet.level === 2 ? 2 : 1));
  const nextSetNum = (Number(setNum) || 0) + 1;
  // Difensivo: se per qualunque motivo è l'ultima serie (o oltre), niente PROSSIMA.
  if(exData.sets && nextSetNum > exData.sets) return '';
  const repsDone = Number(reps) || 0;
  const rirVal = (rir == null || rir === '') ? null : Number(rir);
  const head = `S${nextSetNum}:`;
  const clampReps = (n) => Math.max(repsMin, Math.min(repsMax, n));
  // Suggerimento = sigla "SN:" + pezzi separati da " · " (punto medio, coerente
  // con APPENA FATTA) + RIR target SEMPRE in coda. Costruito in un unico helper
  // così la punteggiatura è uniforme e non restano virgole di separazione.
  const out = (...parts) => `${head} ${[...parts, `RIR ${targetRIR}`].join(' · ')}`;

  if(isPullUpExercise(exName)){
    // Ramo TRAZIONI — la "resistenza" è il gradino della scala di assistenza.
    // BAND_COLORS = ['Corpo libero','Gialla','Rossa','Nera','Viola']: idx 0 = più dura
    // (nessun aiuto), ultimo idx = più facile (più aiuto). Progredire = scendere di idx.
    // Corpo libero è un valore reale della scala: da Gialla la "banda più dura" ci
    // arriva da sola, senza il caso speciale "prova la trazione libera" di prima.
    const cur = (bandColor && BAND_COLORS.includes(bandColor)) ? bandColor : null;
    const curIdx = cur ? BAND_COLORS.indexOf(cur) : -1;
    const harder = (curIdx > 0) ? BAND_COLORS[curIdx-1] : null;                       // verso Corpo libero
    const easier = (curIdx >= 0 && curIdx < BAND_COLORS.length-1) ? BAND_COLORS[curIdx+1] : null;
    const bandTxt = cur ? bandPhrase(cur) : 'stessa banda';
    // 1) cedimento (RIR 0) ma reps nel range → stesso gradino, -1 rep
    //    Eccezione: se RIR 0 è il target della sessione (es. Pump) → mantieni, non scendere
    if(rirVal === 0 && repsDone >= repsMin){
      if(targetRIR === 0) return out(bandTxt, `mantieni ${repsDone} reps`);
      return out(bandTxt, `scendi a ${clampReps(repsDone - 1)} reps`);
    }
    // 2) tetto + RIR ≥ target → un gradino più duro.
    //    Su Corpo libero (idx 0) non esiste niente di più duro: si sale di reps,
    //    oltre il tetto del range, perché la banda non è più una leva disponibile.
    if(repsDone >= repsMax && rirVal != null && rirVal >= targetRIR){
      if(curIdx === 0) return out(bandTxt, `sali a ${repsDone + 1} reps`);
      return out(`${harder ? bandPhrase(harder) : 'banda Gialla'} (più dura)`, `riparti da ${repsMin} reps`);
    }
    // 3) sotto range → un gradino più facile. Su Viola (ultimo idx) non esiste
    //    niente di più facile: si resta su Viola.
    if(repsDone < repsMin) return out(`${bandPhrase(easier || 'Viola')} (più aiuto)`, `punta a ${repsMin} reps`);
    // 4) RIR > target (facile) → stesso gradino, alza reps verso il tetto
    if(rirVal != null && rirVal > targetRIR) return out(bandTxt, `sali a ${clampReps(repsDone + 1)} reps`);
    // 5) default (RIR = target o non riportato) → stesso gradino, +1 rep
    return out(bandTxt, `${clampReps(repsDone + 1)} reps`);
  }

  // Ramo ELASTICI / corpo libero — resistenza nell'unità dell'utente
  // (ST.profile.unit: 'kg' → step 2.5, altrimenti 'lbs' → step 10, default lbs).
  // I valori loggati restano raw (nessuna conversione): cambiano solo
  // etichetta e passo dei suggerimenti.
  const loadUnit = (ST.profile && ST.profile.unit === 'kg') ? 'kg' : 'lbs';
  const loadStep = loadUnit === 'kg' ? 2.5 : 10;
  const resistInt = (resistance == null || resistance === '') ? 0 : (parseFloat(resistance) || 0);
  const loadTxt = (v) => v <= 0 ? 'corpo libero' : `${v} ${loadUnit}`;
  const plusStep  = Math.min(250, resistInt + loadStep);
  const minusStep = Math.max(0, resistInt - loadStep);
  // 1) cedimento (RIR 0) ma reps nel range → stessa resistenza, -step
  //    Eccezione: se RIR 0 è il target della sessione (es. Pump) → mantieni, non scendere
  if(rirVal === 0 && repsDone >= repsMin){
    if(targetRIR === 0) return out(loadTxt(resistInt), `mantieni ${repsDone} ${unitLbl}`);
    return out(loadTxt(resistInt), `scendi a ${clampReps(repsDone - step)} ${unitLbl}`);
  }
  // 2) tetto + RIR ≥ target → +1 step di carico (10 lbs / 2.5 kg), riparti da repsMin
  if(repsDone >= repsMax && rirVal != null && rirVal >= targetRIR) return out(loadTxt(plusStep), `riparti da ${repsMin} ${unitLbl}`);
  // 3) sotto range → -1 step di carico (o variante più facile se già a corpo libero)
  if(repsDone < repsMin){
    if(resistInt <= 0) return out('variante più facile', `punta a ${repsMin} ${unitLbl}`);
    return out(loadTxt(minusStep), `punta a ${repsMin} ${unitLbl}`);
  }
  // 4) RIR > target (facile) → stessa resistenza, alza verso il tetto
  if(rirVal != null && rirVal > targetRIR) return out(loadTxt(resistInt), `sali a ${clampReps(repsDone + step)} ${unitLbl}`);
  // 5) default (RIR = target o non riportato) → stessa resistenza, +step
  return out(loadTxt(resistInt), `${clampReps(repsDone + step)} ${unitLbl}`);
}

async function completeSession(sessionId){
  await saveWorkoutRecord(sessionId);
  showToast('Sessione completata! 💪');
  loadTrainingHomeData();
  ST.trainSession = null;
  renderTraining();
}

async function deleteWorkout(id, date){
  if(!ST.user || ST.user.id==='test-user-001'){ renderTraining(); return; }
  const { error } = await supa.from('workouts').delete().eq('id', id).eq('user_id', ST.user.id);
  if(error){ showToast('Errore eliminazione: '+error.message); } else { showToast('Workout eliminato'); }
  loadWorkouts();   // storico intero: non c'è più un mese da scegliere
  loadTrainingAllCompleted();
}

async function saveTrainingSet(){
  const form = ST.trainLogOpen;
  if(!form) return;
  const repsEl = document.getElementById('tl-reps');
  const rirEl = document.getElementById('tl-rir');
  const reps = parseInt(repsEl?.value)||0;
  // BLOCCO 3 — Trazioni: resistance NULL nel DB, band_color = colore scelto; ST.trainLoggedSets memorizza il colore
  // come stringa nel campo resistance (compat con getLastLoggedSetLabel + render badge).
  const isPullUp = isPullUpExercise(form.exName);
  const bandColor = isPullUp ? (BAND_COLORS.includes(ST.trainLogBandColor) ? ST.trainLogBandColor : null) : null;
  const resistance = isPullUp
    ? (bandColor || '')
    : ((ST.trainLogResist != null) ? String(ST.trainLogResist) : '');
  const rir = (rirEl && rirEl.value !== '' && rirEl.value != null) ? parseInt(rirEl.value, 10) : null;
  if(!reps){ repsEl?.focus(); return; }
  if(isPullUp && !bandColor){ showToast('Scegli il livello di assistenza','⚠️'); return; }
  ST.trainSaving = true;
  renderTraining();
  let insertError = null;
  try {
    const { error } = await supa.from('training_logs').insert({
      user_id: ST.user.id,
      date: todayKey(),
      session_id: form.sessionId,
      exercise_name: form.exName,
      set_number: form.setNum,
      reps,
      resistance: isPullUp ? null : (resistance||null),
      band_color: bandColor,
      rir_actual: rir,
    });
    insertError = error;
  } catch(e){ insertError = {message: e.message}; }
  ST.trainSaving = false;
  if(insertError){ avvisa('Non riesco a salvare la serie: ' + insertError.message, { titolo:'Serie non salvata' }); renderTraining(); return; }
  invalidateAllExerciseNamesCache(); // nuova serie → esercizio potrebbe essere nuovo nella lista
  // Traccia inizio sessione sulla prima serie
  const prevKeys = Object.keys(ST.trainLoggedSets).filter(k=>k.startsWith(form.sessionId+'_')&&k.endsWith('_'+todayKey()));
  if(!ST.trainSessionStart && prevKeys.length === 0) ST.trainSessionStart = Date.now();
  const key = `${form.sessionId}_${form.exName}_${form.setNum}_${todayKey()}`;
  ST.trainLoggedSets[key] = {reps, resistance, rir, band_color: bandColor};
  try { localStorage.setItem('zt_train_sets_'+todayKey(), JSON.stringify(ST.trainLoggedSets)); } catch(e){}
  // Insert in workout_sets (in parallelo, non blocca il flusso) via wsWrite:
  // retry immediato + coda persistente se fallisce — mai più perdite silenziose
  const unitVal = (ST.profile && ST.profile.unit) || 'lbs';
  wsWrite('insert', {
    user_id: ST.user.id,
    workout_id: null,
    date: todayKey(),
    session_type: form.sessionId,
    exercise_name: form.exName,
    set_number: form.setNum,
    reps,
    resistance: isPullUp ? null : (resistance ? parseInt(resistance)||null : null),
    band_color: bandColor,
    unit: unitVal,
    rir_actual: rir,
  }, _wsKey(todayKey(), form.sessionId, form.exName, form.setNum),
  'Serie salvata, sincronizzazione in coda').then((res)=>{
    const setId = res?.data?.id;
    if(setId && ST.trainLoggedSets[key]){
      ST.trainLoggedSets[key].setId = setId;
      try { localStorage.setItem('zt_train_sets_'+todayKey(), JSON.stringify(ST.trainLoggedSets)); } catch(e){}
    }
  }, ()=>{});
  const sessExercises = getTrainingSession(form.sessionId)?.exercises || [];
  const currentIdx = sessExercises.findIndex(ex => ex.name === form.exName);
  const exData = currentIdx >= 0 ? sessExercises[currentIdx] : null;
  const sessObj = getTrainingSession(form.sessionId);
  const sKey = `${form.sessionId}_${form.exName}`;
  ST.trainLogOpen = null;

  // Esercizio completato? La serie appena salvata è l'ultima prevista.
  const exerciseComplete = !!(exData && exData.sets && form.setNum >= exData.sets);

  // Auto-completion SESSIONE (invariato): se TUTTE le serie di TUTTI gli
  // esercizi sono loggate → salva il workout una sola volta.
  let sessionComplete = false;
  if(sessExercises.length){
    sessionComplete = sessExercises.every(ex => {
      const keys = Object.keys(ST.trainLoggedSets).filter(k =>
        k.startsWith(`${form.sessionId}_${ex.name}_`) && k.endsWith(`_${todayKey()}`)
      );
      return keys.length >= ex.sets;
    });
    if(sessionComplete && !ST.trainCompletedToday[form.sessionId]){
      ST.trainCompletedToday[form.sessionId] = true; // anti-duplica immediato
      saveWorkoutRecord(form.sessionId).then((wid)=>{
        if(wid){
          showToast('🎉 Sessione completata!');
          loadTrainingHomeData();
          loadSessionLastCompletion();
        }
      });
    }
  }

  if(exerciseComplete){
    // Ultima serie dell'esercizio → niente rest countdown, niente "PROSSIMA"
    // inesistente.
    if(ST.aiSuggestions) delete ST.aiSuggestions[sKey];
    loadTrainingHomeData();

    if(sessionComplete){
      // Non chiudere automaticamente: l'utente deve poter fare il Tabata finale
      // prima di uscire. Il bottone "Completa sessione" nella schermata chiude manualmente.
      ST.trainLogOpen = null;
      ST.trainExecOpen = null;
      renderTraining();
      requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
      return;
    }

    // Esercizio finito ma sessione in corso → RESTA nella sessione e scorri al
    // prossimo esercizio non completato (così lo si prepara durante il recupero).
    showToast('Esercizio completato ✓');
    ST.trainLogOpen = null;
    ST.trainExecOpen = null;
    renderTraining();

    // Trova il prossimo esercizio NON completato (scansione circolare da currentIdx+1).
    const isDone = (ex) => {
      const keys = Object.keys(ST.trainLoggedSets).filter(k =>
        k.startsWith(`${form.sessionId}_${ex.name}_`) && k.endsWith(`_${todayKey()}`)
      );
      return keys.length >= ex.sets;
    };
    let nextEx = null;
    for(let i = 1; i <= sessExercises.length; i++){
      const cand = sessExercises[(currentIdx + i) % sessExercises.length];
      if(cand && !isDone(cand)){ nextEx = cand; break; }
    }

    // Scorri la card del prossimo esercizio in cima (dopo il repaint).
    if(nextEx){
      const cardId = 'excard-' + nextEx.name.replace(/[^a-zA-Z0-9]/g, '_');
      requestAnimationFrame(() => {
        const el = document.getElementById(cardId);
        if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    return;
  }

  // Serie intermedia → suggerimento PROSSIMA deterministico + rest countdown.
  const sugg = computeNextSetSuggestion({
    sessionId: form.sessionId, exName: form.exName, setNum: form.setNum,
    reps, resistance, rir, exData, sess: sessObj, bandColor, // bandColor null per non-trazione
  });
  if(sugg) ST.aiSuggestions[sKey] = sugg; else if(ST.aiSuggestions) delete ST.aiSuggestions[sKey];
  renderTraining();
  loadTrainingHomeData(); // aggiorna tile Home in background
}

// ── BLOCCO 4 — Render blocco nota dentro la card esercizio ──
// Stati: vuoto / editing / pieno / pieno+storico aperto.
// Lo storico è caricato lazy quando l'utente espande "Note passate (N) ›".
function _renderTrainNoteBlock(exName){
  const safeId = exName.replace(/[^a-zA-Z0-9]/g,'_');
  const safeName = exName.replace(/'/g,"\\'");
  const today = ST.trainNotes[exName] || null;
  const editing = ST.trainNoteEditing === exName;
  const historyOpen = !!ST.trainNoteHistoryOpen[exName];
  const historyArr = ST.trainNotesHistory[exName];
  const saving = ST.trainNoteSaving;

  // FIX 1+2 (27 mag 2026) — Il link "Note passate (N) ›" appare SOLO se sappiamo
  // con certezza che N > 0. Source of truth = ST.trainNoteHistoryCount[exName] popolato
  // in batch da loadTodayNotes. Se il count non è ancora noto (es. fetch in corso o
  // utente test), il link resta nascosto: meglio assente che fuorviante.
  // Quando lo storico è già stato caricato (Array.isArray) usiamo la lunghezza reale
  // come sorgente più aggiornata.
  let historyCount = null;
  if(Array.isArray(historyArr)) historyCount = historyArr.length;
  else if(typeof ST.trainNoteHistoryCount[exName] === 'number') historyCount = ST.trainNoteHistoryCount[exName];

  const historyLink = (historyCount && historyCount > 0)
    ? `<button type="button" onclick="event.stopPropagation();toggleNoteHistory('${safeName}');" style="background:none;border:none;cursor:pointer;color:var(--acc);font-size:11px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.1em;padding:0;font-weight:600;">Note passate (${historyCount}) ${historyOpen?'▾':'›'}</button>`
    : '';

  // Pila storico (visibile solo se aperto). Il link toggle compare solo con count>0,
  // quindi qui non gestiamo più il caso "0 note" (impossibile via UI). Resta solo
  // "caricamento" come fallback durante lazy fetch.
  const historyPile = (historyOpen && Array.isArray(historyArr) && historyArr.length > 0)
    ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--s2);">
        <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.14em;margin-bottom:6px;">Note passate</div>
        ${historyArr.map(h => `
          <div style="padding:6px 0;border-bottom:1px solid var(--s2);">
            <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.12em;margin-bottom:2px;">${formatNoteDate(h.date)}</div>
            <div style="font-size:13px;font-family:var(--font-sans);color:var(--t1);line-height:1.4;white-space:pre-wrap;">${esc(h.note || '')}</div>
          </div>
        `).join('')}
      </div>`
    : (historyOpen && !Array.isArray(historyArr))
      ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--s2);font-size:11px;font-family:var(--font-mono);color:var(--t3);text-align:center;">Caricamento…</div>`
      : '';

  // Stato EDITING
  if(editing){
    const draft = String(ST.trainNoteDraft || '');
    // FIX 3 (27 mag 2026) — contatore dinamico "N / 500" aggiornato via DOM surgical
    // su input (evita re-render globale che perderebbe focus/caret nella textarea).
    return `
      <div style="margin-top:10px;padding:10px;background:var(--s1);border-radius:8px;border:1px solid var(--acc-lt);">
        <div style="font-size:10px;font-family:var(--font-mono);color:var(--acc);text-transform:uppercase;letter-spacing:.14em;margin-bottom:6px;">● Nota di oggi</div>
        <textarea id="note-textarea-${safeId}"
          oninput="updateNoteDraft(this.value);"
          placeholder="Es. 'barra al posto delle maniglie', 'piede appoggiato sul rialzo', 'presa neutra per il polso sx'…"
          maxlength="${TRAINING_NOTE_MAX_LEN}"
          style="width:100%;min-height:80px;padding:8px;border:1.5px solid var(--acc);border-radius:6px;font-size:14px;font-family:var(--font-sans);line-height:1.4;resize:vertical;box-sizing:border-box;background:#fff;color:var(--t1);">${esc(draft)}</textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:8px;">
          <span id="note-counter-${safeId}" style="font-size:10px;font-family:var(--font-mono);color:var(--t3);">${draft.length} / ${TRAINING_NOTE_MAX_LEN}</span>
          <div style="display:flex;gap:6px;">
            <button onclick="event.stopPropagation();cancelNoteEdit();"
              style="padding:6px 12px;background:#fff;color:var(--t2);border:1px solid var(--s2);border-radius:6px;font-size:12px;font-weight:600;font-family:var(--font-sans);cursor:pointer;">Annulla</button>
            <button onclick="event.stopPropagation();saveTrainingNote('${safeName}');" ${saving?'disabled':''}
              style="padding:6px 14px;background:${saving?'var(--b2)':'var(--acc)'};color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;font-family:var(--font-sans);cursor:${saving?'default':'pointer'};">${saving?'…':'Salva'}</button>
          </div>
        </div>
      </div>`;
  }

  // Stato PIENO (nota di oggi presente)
  if(today && today.note){
    const savedAt = formatNoteTime(today.updated_at);
    return `
      <div style="margin-top:10px;padding:10px;background:var(--s1);border-radius:8px;border-left:3px solid var(--acc);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
          <span style="font-size:10px;font-family:var(--font-mono);color:var(--acc);text-transform:uppercase;letter-spacing:.14em;font-weight:600;">● Nota di oggi</span>
          ${historyLink}
        </div>
        <div style="font-size:14px;font-family:var(--font-sans);color:var(--t1);line-height:1.45;white-space:pre-wrap;">${esc(today.note)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;">
          <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.12em;">Salvata${savedAt?' · '+savedAt:''}</span>
          <button onclick="event.stopPropagation();openNoteEditor('${safeName}');"
            style="background:none;border:none;cursor:pointer;color:var(--acc);font-size:11px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.1em;padding:0;font-weight:600;">Modifica ›</button>
        </div>
        ${historyPile}
      </div>`;
  }

  // Stato VUOTO (nessuna nota di oggi) — FIX 3 (27 mag 2026): badge OPZIONALE accanto al CTA
  return `
    <div style="margin-top:10px;padding:8px 10px;background:var(--s1);border-radius:8px;border:1px dashed var(--s2);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <button onclick="event.stopPropagation();openNoteEditor('${safeName}');"
          style="background:none;border:none;cursor:pointer;color:var(--acc);font-size:12px;font-family:var(--font-sans);font-weight:600;padding:4px 0;text-align:left;flex:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="display:inline-flex;align-items:center;"><span style="font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);margin-right:6px;">●</span>+ Aggiungi nota</span>
          <span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--t3);font-weight:500;">Opzionale</span>
        </button>
        ${historyLink}
      </div>
      ${historyPile}
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// GRAFICA L1 (27 mag 2026) — Hero sessione + Cronometro TEMPO WORKOUT
// Cronometra il tempo effettivo passato in esecuzione delle serie (escluso
// recupero e serie annullate). Persistito su localStorage per sopravvivere a
// chiusura/riapertura PWA. Aggiornamento LIVE al secondo via setInterval, con
// DOM surgical update su #train-work-display (niente re-render).
// ═══════════════════════════════════════════════════════════

// Interval ID module-scope (fuori da ST per non sporcare la cache serializzata)
let _trainWorkTickInterval = null;

// CAP CRONOMETRO (27 mag 2026) — Soglia "serie dimenticata".
// Se una serie singola dura > 45 min (telefono in tasca a lungo), non accumuliamo
// il tempo reale ma una stima: media delle serie valide oggi, o 2 min se non
// abbiamo ancora osservazioni valide.
const WORK_SET_CAP_SEC = 2700;     // 45 minuti — sopra questo delta la serie è "dimenticata"
const WORK_SET_DEFAULT_SEC = 120;  // 2 minuti — fallback se nessuna serie valida ancora

function _workTimePersist(){
  try {
    localStorage.setItem('zt_train_work_'+todayKey(), JSON.stringify(ST.trainWorkTime));
  } catch(e){}
}

function _workTimeEntry(sessionId){
  if(!ST.trainWorkTime[sessionId]){
    ST.trainWorkTime[sessionId] = { totalSec: 0, execStartedAt: null, validDurations: [] };
  } else {
    // Retro-compat: vecchi record (pre-cap) in localStorage senza validDurations.
    if(!Array.isArray(ST.trainWorkTime[sessionId].validDurations)){
      ST.trainWorkTime[sessionId].validDurations = [];
    }
  }
  return ST.trainWorkTime[sessionId];
}

// Secondi cumulati per la sessione + eventuale delta della serie in corso.
// Il display LIVE durante una serie attiva mostra il delta reale (anche oltre il CAP).
// Il cap entra in gioco SOLO alla chiusura della serie ("Fine serie"), come da specifica.
function workTimeCurrent(sessionId){
  const e = ST.trainWorkTime[sessionId];
  if(!e) return 0;
  const base = Number(e.totalSec) || 0;
  if(e.execStartedAt){
    const delta = Math.max(0, Math.floor((Date.now() - e.execStartedAt) / 1000));
    return base + delta;
  }
  return base;
}

// Formato MM'SS'' (es. 22'14''). Sopra 1h: H:MM'SS'' (es. 1:05'07'').
function workTimeFormat(sec){
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if(h > 0) return `${h}:${pad(m)}'${pad(ss)}''`;
  return `${pad(m)}'${pad(ss)}''`;
}

// Marca l'inizio della serie in esecuzione. Se per qualche motivo c'è già un
// execStartedAt vecchio (es. crash dell'app durante una serie), lo sostituiamo:
// abbiamo già perso quel tempo, è più sicuro ripartire da zero.
function workTimeStartExec(sessionId){
  const e = _workTimeEntry(sessionId);
  e.execStartedAt = Date.now();
  _workTimePersist();
}

// Calcola la stima per una serie "dimenticata" (delta > CAP).
// Se ci sono già serie valide oggi → media delle loro durate.
// Altrimenti → default 120 sec.
function _workTimeEstimateForCappedSet(entry){
  const arr = Array.isArray(entry.validDurations) ? entry.validDurations : [];
  if(arr.length === 0) return WORK_SET_DEFAULT_SEC;
  const sum = arr.reduce((a, n) => a + (Number(n) || 0), 0);
  return Math.max(1, Math.round(sum / arr.length));
}

// Ferma la serie. commit=true → somma il delta a totalSec (serie completata).
// commit=false → scarta il delta (serie annullata via "Indietro").
//
// CAP "serie dimenticata":
//  - delta ≤ CAP (45 min) → accumula il delta reale + lo aggiunge a validDurations
//    (osservazione utile per future medie).
//  - delta > CAP           → accumula una STIMA (media valide oggi o default 120s).
//    La stima NON va in validDurations: è una guess, non un'osservazione.
function workTimeStopExec(sessionId, commit){
  const e = _workTimeEntry(sessionId);
  if(e.execStartedAt){
    if(commit){
      const delta = Math.max(0, Math.floor((Date.now() - e.execStartedAt) / 1000));
      if(delta > WORK_SET_CAP_SEC){
        // Serie dimenticata: rimpiazza il delta reale con una stima sensata
        const est = _workTimeEstimateForCappedSet(e);
        e.totalSec = (Number(e.totalSec) || 0) + est;
        if(typeof console !== 'undefined') console.info(`[train-work] capped set: delta=${delta}s → estimate=${est}s (session=${sessionId})`);
      } else {
        // Serie valida: accumula tempo reale + registra durata per media future
        e.totalSec = (Number(e.totalSec) || 0) + delta;
        if(!Array.isArray(e.validDurations)) e.validDurations = [];
        e.validDurations.push(delta);
        // Safety cap sulla dimensione array (oltre 200 serie/giorno = bug a monte)
        if(e.validDurations.length > 200) e.validDurations = e.validDurations.slice(-200);
      }
    }
    e.execStartedAt = null;
    _workTimePersist();
  }
}

// Aggiornamento live del display via DOM surgical (no re-render → no flicker)
function _workTimeUpdateDisplay(sessionId){
  const el = document.getElementById('train-work-display');
  if(el) el.textContent = workTimeFormat(workTimeCurrent(sessionId));
}

// Avvia il tick 1s solo quando una serie è in esecuzione.
function workTimeStartTick(sessionId){
  if(_trainWorkTickInterval) return; // già attivo
  _workTimeUpdateDisplay(sessionId); // sync iniziale
  _trainWorkTickInterval = setInterval(()=> _workTimeUpdateDisplay(sessionId), 1000);
}

function workTimeStopTick(){
  if(_trainWorkTickInterval){
    clearInterval(_trainWorkTickInterval);
    _trainWorkTickInterval = null;
  }
}

// ── Renderer dedicato per il Blocco Attivazione (countdown ibrido 5 min, valido per tutte le sessioni) ──
function _renderActivationSection(){
  if(!ST.trainActivationFlow) ST.trainActivationFlow = { active:false, currentIdx:0, remaining:0, running:false, _iv:null };
  if(!Array.isArray(ST.trainActivation) || ST.trainActivation.length !== ACTIVATION_BLOCK.length) ST.trainActivation = ACTIVATION_BLOCK.map(()=>false);
  if(ST.trainActivationCollapsed === undefined) ST.trainActivationCollapsed = false;
  if(ST.trainActivationCollapsed){
    return `
      <div onclick="toggleActivationCollapsed()"
        style="display:flex;align-items:center;gap:8px;background:var(--s1,#fff);border:1px solid var(--s2);border-radius:var(--r-md,12px);padding:12px 16px;margin-bottom:20px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A7A6F" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
        <span style="font-size:13px;font-weight:700;color:#2A7A6F;font-family:var(--font-sans);flex:1;">Blocco Attivazione completato</span>
        <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono);">tocca per riaprire ▾</span>
      </div>`;
  }
  const flow = ST.trainActivationFlow;
  const exs = ACTIVATION_BLOCK;
  const totalSecAll = exs.reduce((a,e)=>a+(e.seconds||0),0);
  const totMin = Math.round(totalSecAll/60);
  const doneCount = ST.trainActivation.filter(v=>v===true).length;
  const allDone = doneCount === exs.length;
  // Mutual exclusion: bottone start disabled se recovery flow running
  const recoveryRunning = !!(ST.trainRecoveryFlow && ST.trainRecoveryFlow.running);

  // ── Hero card (3 stati) ──
  let heroHtml;
  if(flow.active && flow.currentIdx < exs.length){
    const cur = exs[flow.currentIdx];
    const mm = String(Math.floor(flow.remaining/60)).padStart(2,'0');
    const ss = String(flow.remaining%60).padStart(2,'0');
    const dur = cur.seconds || 60;
    const pct = dur ? Math.round((dur - flow.remaining)/dur*100) : 0;
    const playPauseBtn = flow.running
      ? `<button onclick="activationFlowPause()" title="Pausa" style="background:var(--acc);color:#fff;border:none;border-radius:10px;width:52px;height:52px;cursor:pointer;font-size:20px;font-weight:700;">⏸</button>`
      : `<button onclick="activationFlowResume()" title="Riprendi" style="background:var(--acc);color:#fff;border:none;border-radius:10px;width:52px;height:52px;cursor:pointer;font-size:20px;font-weight:700;">▶</button>`;
    heroHtml = `
      <div style="background:var(--acc-lt);border:2px solid var(--acc);border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:10px;color:var(--acc);font-family:var(--font-mono);letter-spacing:.1em;font-weight:700;text-transform:uppercase;">Attivazione</span>
        </div>
        <div style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.2;margin-bottom:14px;">${nomeCortoConTag(cur.name)}</div>
        <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:46px;font-weight:800;font-family:var(--font-mono);color:var(--acc);line-height:1;flex-shrink:0;">${mm}:${ss}</div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button onclick="activationFlowBack()" title="Indietro" style="background:transparent;border:1.5px solid var(--acc);border-radius:10px;width:44px;height:52px;cursor:pointer;color:var(--acc);font-size:18px;font-weight:700;">⏪</button>
            ${playPauseBtn}
            <button onclick="activationFlowSkip()" title="Skip" style="background:transparent;border:1.5px solid var(--acc);border-radius:10px;width:44px;height:52px;cursor:pointer;color:var(--acc);font-size:18px;font-weight:700;">⏩</button>
          </div>
        </div>
        <div style="height:6px;background:rgba(42,122,111,.18);border-radius:3px;overflow:hidden;margin-bottom:8px;">
          <div style="height:100%;width:${pct}%;background:var(--acc);transition:width .35s linear;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--t2);font-family:var(--font-mono);">
          <span>${flow.currentIdx+1}/${exs.length} · ${doneCount} completati</span>
          <button onclick="activationFlowEnd()" title="Termina" style="background:transparent;border:none;color:var(--t3);font-size:11px;font-family:var(--font-mono);cursor:pointer;text-decoration:underline;">termina</button>
        </div>
      </div>`;
  } else if(flow.active && flow.currentIdx >= exs.length){
    heroHtml = `
      <div style="background:var(--acc-lt);border:2px solid var(--acc);border-radius:14px;padding:24px;text-align:center;margin-bottom:16px;">
        <div style="font-size:36px;margin-bottom:8px;">✓</div>
        <div style="font-size:18px;font-weight:700;color:var(--acc);font-family:var(--font-sans);margin-bottom:4px;">Attivazione completata</div>
        <div style="font-size:12px;color:var(--t2);font-family:var(--font-mono);">${exs.length}/${exs.length} esercizi</div>
      </div>`;
  } else {
    // Stato iniziale
    const startBtnDisabled = recoveryRunning;
    const startBtnStyle = startBtnDisabled
      ? 'background:#CCC;color:#fff;border:none;border-radius:10px;padding:14px 30px;font-size:15px;font-weight:700;cursor:not-allowed;font-family:var(--font-sans);opacity:.6;'
      : 'background:var(--acc);color:#fff;border:none;border-radius:10px;padding:14px 30px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-sans);';
    const startBtnAction = startBtnDisabled ? '' : 'onclick="activationFlowStart()"';
    heroHtml = `
      <div style="background:var(--acc-lt);border:2px solid var(--acc);border-radius:14px;padding:20px;margin-bottom:16px;text-align:center;">
        <div style="font-size:11px;color:var(--acc);font-family:var(--font-mono);letter-spacing:.1em;margin-bottom:8px;text-transform:uppercase;font-weight:700;">${exs.length} esercizi · ~${totMin} min</div>
        <div style="font-size:20px;font-weight:700;color:#1A1A1A;margin-bottom:16px;">Blocco Attivazione</div>
        ${allDone
          ? `<div style="font-size:14px;color:var(--acc);font-weight:600;font-family:var(--font-sans);">✓ Tutti gli esercizi completati</div>`
          : `<button ${startBtnAction} ${startBtnDisabled?'disabled':''} style="${startBtnStyle}">▶ Start attivazione</button>${startBtnDisabled?'<div style="font-size:10px;color:var(--t3);margin-top:8px;font-family:var(--font-mono);">Recupero in corso</div>':''}`}
      </div>`;
  }

  // ── Lista esercizi attivazione ── (FASE A: niente checkbox tappabile; le voci si
  // completano via il flow Start → auto-avanzamento, che marca ST.trainActivation[idx]=true
  // in _activationFlowAdvance. Forma identica alla lista del riscaldamento: nome + durata.)
  const itemsHtml = exs.map((a, idx) => {
    const isDone = !!ST.trainActivation[idx];
    const isCurrent = flow.active && flow.currentIdx === idx;
    const bg = isCurrent ? '#FFF7E0' : (isDone ? '#F0F6FA' : 'var(--s1)');
    const border = isCurrent ? '2px solid #C4880A' : '1px solid var(--s2)';
    const nameStyle = isDone ? 'text-decoration:line-through;color:var(--t3);' : (isCurrent ? 'color:#1A1A1A;font-weight:700;' : 'color:var(--t1);');
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${bg};border:${border};border-radius:8px;margin-bottom:6px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;${nameStyle}">${nomeCortoConTag(a.name)}</div>
        </div>
        <div style="font-size:11px;font-family:var(--font-mono);color:${isCurrent ? '#C4880A' : 'var(--t2)'};font-weight:700;flex-shrink:0;">${a.seconds}s</div>
      </div>`;
  }).join('');

  // ── Wrapper card ──
  return `
    <div style="background:var(--s1,#fff);border-radius:var(--r-md,12px);padding:14px 16px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${allDone?'#2A7A6F':'var(--acc)'}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span style="font-size:13px;font-weight:700;color:${allDone?'#2A7A6F':'var(--acc)'};font-family:var(--font-sans);">Blocco Attivazione — ${totMin} min</span>
        ${allDone?'<span style="color:#2A7A6F;font-size:14px;font-weight:700;">✓</span>':''}
        ${allDone ? `<button onclick="toggleActivationCollapsed()" style="margin-left:auto;background:transparent;border:none;color:var(--t3);font-size:11px;font-family:var(--font-mono);cursor:pointer;text-decoration:underline;">nascondi ▴</button>` : ''}
      </div>
      ${heroHtml}
      ${itemsHtml}
    </div>`;
}

// ── Renderer warm-up specifico (FASE A, 31 mag) — card SOTTO il Blocco Attivazione ──
// Mostrato solo se la sessione ha s.warmup[] e NON è una sessione di Recupero.
// Hero work/rest in stile Tabata (work evergreen / rest tenue), countdown grande,
// ▶/⏸ + ⏩ skip + termina. È prehab a tempo: niente checkbox/log, solo indicazione visiva.
function _renderWarmupSection(s){
  if(!s || s.type === 'Recupero') return '';
  if(!Array.isArray(s.warmup) || !s.warmup.length) return '';
  const items = s.warmup;
  // Collasso a fine flow (riga compatta riapribile al tap) — come il Blocco Attivazione
  if(ST.trainWarmupCollapsed){
    return `
      <div onclick="toggleWarmupCollapsed()"
        style="display:flex;align-items:center;gap:8px;background:var(--s1,#fff);border:1px solid var(--s2);border-radius:var(--r-md,12px);padding:12px 16px;margin-bottom:20px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A7A6F" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
        <span style="font-size:13px;font-weight:700;color:#2A7A6F;font-family:var(--font-sans);flex:1;">Riscaldamento specifico completato</span>
        <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono);">tocca per riaprire ▾</span>
      </div>`;
  }
  const f = ST.trainWarmupFlow;
  const flowActive = !!(f && f.active && f.sessionId === ST.trainSession);
  // Mutua esclusione: altri blocchi in corso (attivazione / recupero / Tabata)
  const otherRunning = !!((ST.trainActivationFlow && ST.trainActivationFlow.running)
    || (ST.trainRecoveryFlow && ST.trainRecoveryFlow.running)
    || (ST.trainTabataFlow && ST.trainTabataFlow.active));

  let heroHtml;
  if(flowActive){
    const cur = _warmupFlowCurrentItem();
    const next = _warmupFlowNextItem();
    const isWork = f.phase === 'work';
    const accent   = isWork ? 'var(--acc)' : '#9A8F73';
    const accentBg = isWork ? 'var(--acc-lt)' : '#F3EFE5';
    const _isIsoPause = isWork && f.isoPhase === 'pause';
    const _isoLabel = isWork && f.isoPhase
      ? (f.isoPhase === 'A' ? 'LATO SX' : f.isoPhase === 'pause' ? 'CAMBIO POSIZIONE' : 'LATO DX')
      : null;
    const eyebrow = _isoLabel || (isWork ? 'RISCALDAMENTO' : 'CAMBIA POSIZIONE');
    const accentOverride = _isIsoPause ? '#D97706' : null;
    const numColor = _isIsoPause
      ? '#D97706'
      : (f.remaining <= 5) ? '#B84C2A' : accent;
    const accentFinal   = accentOverride || accent;
    const accentBgFinal = _isIsoPause ? '#FEF3C7' : accentBg;
    const mm = String(Math.floor(f.remaining/60)).padStart(2,'0');
    const ss = String(f.remaining % 60).padStart(2,'0');
    const dur = _isIsoPause ? WARMUP_ISO_PAUSE_SEC
      : (isWork && f.isoPhase) ? WARMUP_ISO_SIDE_SEC
      : isWork ? WARMUP_WORK_SEC : WARMUP_REST_SEC;
    const pct = dur ? Math.round((dur - f.remaining)/dur*100) : 0;
    const titleLine = isWork
      ? `<div style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.2;margin-bottom:14px;">${esc(cur ? cur.name : '')}</div>`
      : `<div style="font-size:18px;font-weight:700;color:#1A1A1A;line-height:1.25;margin-bottom:14px;">${next ? 'Prossimo: ' + esc(next.name) : 'Cambia posizione'}</div>`;
    const playPauseBtn = f.running
      ? `<button onclick="warmupFlowPause()" title="Pausa" style="background:${accentFinal};color:#fff;border:none;border-radius:10px;width:52px;height:52px;cursor:pointer;font-size:20px;font-weight:700;">⏸</button>`
      : `<button onclick="warmupFlowResume()" title="Riprendi" style="background:${accentFinal};color:#fff;border:none;border-radius:10px;width:52px;height:52px;cursor:pointer;font-size:20px;font-weight:700;">▶</button>`;
    heroHtml = `
      <div style="background:${accentBgFinal};border:2px solid ${accentFinal};border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="font-size:10px;color:${accentFinal};font-family:var(--font-mono);letter-spacing:.14em;font-weight:700;text-transform:uppercase;margin-bottom:6px;">${eyebrow}</div>
        ${titleLine}
        <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:46px;font-weight:800;font-family:var(--font-mono);color:${numColor};font-variant-numeric:tabular-nums;line-height:1;flex-shrink:0;">${mm}:${ss}</div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            ${playPauseBtn}
            <button onclick="warmupFlowSkip()" title="Skip" style="background:transparent;border:1.5px solid ${accentFinal};border-radius:10px;width:44px;height:52px;cursor:pointer;color:${accentFinal};font-size:18px;font-weight:700;">⏩</button>
          </div>
        </div>
        <div style="height:6px;background:rgba(0,0,0,.10);border-radius:3px;overflow:hidden;margin-bottom:8px;">
          <div style="height:100%;width:${pct}%;background:${accentFinal};transition:width .35s linear;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--t2);font-family:var(--font-mono);">
          <span>${f.idx+1}/${items.length}</span>
          <button onclick="warmupFlowEnd()" title="Termina" style="background:transparent;border:none;color:var(--t3);font-size:11px;font-family:var(--font-mono);cursor:pointer;text-decoration:underline;">termina</button>
        </div>
      </div>`;
  } else {
    const startBtnStyle = otherRunning
      ? 'background:#CCC;color:#fff;border:none;border-radius:10px;padding:14px 30px;font-size:15px;font-weight:700;cursor:not-allowed;font-family:var(--font-sans);opacity:.6;'
      : 'background:var(--acc);color:#fff;border:none;border-radius:10px;padding:14px 30px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-sans);';
    const startAction = otherRunning ? '' : 'onclick="warmupFlowStart()"';
    heroHtml = `
      <div style="background:var(--acc-lt);border:2px solid var(--acc);border-radius:14px;padding:20px;margin-bottom:16px;text-align:center;">
        <div style="font-size:11px;color:var(--acc);font-family:var(--font-mono);letter-spacing:.1em;margin-bottom:8px;text-transform:uppercase;font-weight:700;">${items.length} esercizi · 1 min ciascuno</div>
        <div style="font-size:20px;font-weight:700;color:#1A1A1A;margin-bottom:16px;">Riscaldamento specifico</div>
        <button ${startAction} ${otherRunning?'disabled':''} style="${startBtnStyle}">▶ Start riscaldamento</button>
        ${otherRunning?'<div style="font-size:10px;color:var(--t3);margin-top:8px;font-family:var(--font-mono);">Un altro blocco è in corso</div>':''}
      </div>`;
  }

  // ── Lista voci warm-up (sola indicazione visiva, niente checkbox/log) ──
  // ℹ accanto al nome → scheda "come si esegue" (stesso meccanismo/modal degli esercizi
  // principali). Mostrata solo se l'item ha almeno un dettaglio (setup/esecuzione/errori/muscoli):
  // niente icona inutile su voci senza contenuto. NON inventa nulla, mostra solo ciò che c'è.
  const itemsHtml = items.map((w, idx) => {
    const isCurrent = flowActive && f.idx === idx;
    const bg = isCurrent ? '#FFF7E0' : 'var(--s1)';
    const border = isCurrent ? '2px solid #C4880A' : '1px solid var(--s2)';
    const nameStyle = isCurrent ? 'color:#1A1A1A;font-weight:700;' : 'color:var(--t1);';
    const eq = w.eq ? `<span style="color:var(--t3);font-weight:400;"> · ${esc(w.eq)}</span>` : '';
    const hasDetail = (Array.isArray(w.setup) && w.setup.length)
      || (Array.isArray(w.execution) && w.execution.length)
      || (Array.isArray(w.commonErrors) && w.commonErrors.length)
      || (Array.isArray(w.muscles) && w.muscles.length);
    const infoIcon = hasDetail
      ? `<span class="ex-info-icon" onclick="event.stopPropagation();openWarmupInfo(${idx})" style="cursor:pointer;padding:0 3px;" title="Come si esegue">ⓘ</span>`
      : '';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${bg};border:${border};border-radius:8px;margin-bottom:6px;">
        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:2px;">
          <span style="font-size:13px;${nameStyle}">${esc(w.name)}${eq}</span>${infoIcon}
        </div>
        <div style="font-size:11px;font-family:var(--font-mono);color:${isCurrent ? '#C4880A' : 'var(--t2)'};font-weight:700;flex-shrink:0;">60s</div>
      </div>`;
  }).join('');

  // ── Wrapper card ──
  return `
    <div style="background:var(--s1,#fff);border-radius:var(--r-md,12px);padding:14px 16px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span style="font-size:13px;font-weight:700;color:var(--acc);font-family:var(--font-sans);">Riscaldamento specifico</span>
      </div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);letter-spacing:.04em;margin-bottom:10px;">1 min a esercizio · 10s per cambiare posizione</div>
      ${heroHtml}
      ${itemsHtml}
    </div>`;
}

// ── Renderer dedicato per le sessioni di recupero G3/G6 (countdown ibrido auto-advance) ──
function _renderRecoverySection(s, sel){
  if(!ST.trainRecoveryFlow) ST.trainRecoveryFlow = {
    active:false, currentIdx:0, remaining:0, running:false, _iv:null,
    microPause: { active:false, remaining:0, total:0, nextExName:'' },
    blockStop:  { active:false, nextBlockName:'', nextExStartIdx:0 }
  };
  if(!ST.trainRecoveryFlow.microPause) ST.trainRecoveryFlow.microPause = { active:false, remaining:0, total:0, nextExName:'' };
  if(!ST.trainRecoveryFlow.blockStop)  ST.trainRecoveryFlow.blockStop  = { active:false, nextBlockName:'', nextExStartIdx:0 };
  if(!ST.trainRecoveryDone) ST.trainRecoveryDone = {};
  if(!ST.trainRecoveryCollapsed) ST.trainRecoveryCollapsed = {};
  const flow = ST.trainRecoveryFlow;
  const exs = s.exercises || [];
  const totalSecAll = exs.reduce((a,e)=>a+(e.duration_sec||0),0);
  const totMin = Math.round(totalSecAll/60);
  const doneCount = exs.filter(e => ST.trainRecoveryDone[e.name]).length;

  // ── Hero card (5 stati: not started / running / microPause / blockStop / completed) ──
  let heroHtml;

  // RAMO 1: STOP BLOCCO — anteprima prossimo blocco
  if(flow.active && flow.blockStop && flow.blockStop.active){
    const nextBlockName = flow.blockStop.nextBlockName;
    const blockExs = exs.filter(e => (e.block||'Altri') === nextBlockName);
    const blockSec = blockExs.reduce((a,e)=>a+(e.duration_sec||0),0);
    const blockMin = Math.round(blockSec/60*10)/10;
    const listItems = blockExs.map(e => {
      const sideTag = e.side ? `<span style="font-size:9px;color:var(--t3);font-family:var(--font-mono);margin-left:4px;">${e.side.toUpperCase()}</span>` : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(255,255,255,.5);border-radius:6px;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--t1);">${nomeCortoConTag(e.name)}${sideTag}</span>
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--t2);font-weight:700;">${e.duration_sec}s</span>
      </div>`;
    }).join('');
    heroHtml = `
      <div style="background:var(--acc-lt);border:2px solid var(--acc);border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="font-size:10px;color:var(--acc);font-family:var(--font-mono);letter-spacing:.1em;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Prossimo blocco</div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;gap:8px;">
          <div style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.2;">${nextBlockName}</div>
          <div style="font-size:12px;font-family:var(--font-mono);color:var(--t2);font-weight:700;flex-shrink:0;">~${blockMin} min</div>
        </div>
        <div style="margin-bottom:14px;max-height:280px;overflow-y:auto;">${listItems}</div>
        <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-bottom:8px;">
          <button onclick="recoveryFlowBack()" title="Indietro" style="background:transparent;border:1.5px solid var(--acc);border-radius:10px;width:44px;height:52px;cursor:pointer;color:var(--acc);font-size:18px;font-weight:700;">⏪</button>
          <button onclick="recoveryFlowResume()" title="Riprendi" style="background:var(--acc);color:#fff;border:none;border-radius:10px;padding:0 22px;height:52px;cursor:pointer;font-size:15px;font-weight:700;font-family:var(--font-sans);">▶ Riprendi</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--t2);font-family:var(--font-mono);">
          <span>${flow.currentIdx+1}/${exs.length} · ${doneCount} completati</span>
          <button onclick="recoveryFlowEnd()" title="Termina sessione" style="background:transparent;border:none;color:var(--t3);font-size:11px;font-family:var(--font-mono);cursor:pointer;text-decoration:underline;">termina</button>
        </div>
      </div>`;
  }
  // RAMO 2: MICRO-PAUSA — countdown 5s/10s prima del prossimo esercizio (palette ambra)
  else if(flow.active && flow.microPause && flow.microPause.active){
    const mp = flow.microPause;
    const dur = mp.total || 1;
    const pct = Math.round((dur - mp.remaining)/dur*100);
    heroHtml = `
      <div style="background:#FFF7E0;border:2px solid #D97706;border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="font-size:10px;color:#B45309;font-family:var(--font-mono);letter-spacing:.1em;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Prossimo esercizio tra…</div>
        <div style="font-size:18px;font-weight:700;color:#1A1A1A;line-height:1.2;margin-bottom:14px;">${mp.nextExName||''}</div>
        <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:46px;font-weight:800;font-family:var(--font-mono);color:#B45309;line-height:1;flex-shrink:0;">${mp.remaining}</div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button disabled title="Disabilitato durante la pausa" style="background:transparent;border:1.5px solid #DDD;border-radius:10px;width:44px;height:52px;cursor:not-allowed;color:#BBB;font-size:18px;font-weight:700;opacity:.6;">⏪</button>
            <button disabled title="Disabilitato durante la pausa" style="background:#DDD;color:#fff;border:none;border-radius:10px;width:52px;height:52px;cursor:not-allowed;font-size:20px;font-weight:700;opacity:.6;">⏸</button>
            <button disabled title="Disabilitato durante la pausa" style="background:transparent;border:1.5px solid #DDD;border-radius:10px;width:44px;height:52px;cursor:not-allowed;color:#BBB;font-size:18px;font-weight:700;opacity:.6;">⏩</button>
          </div>
        </div>
        <div style="height:6px;background:rgba(217,119,6,.18);border-radius:3px;overflow:hidden;margin-bottom:8px;">
          <div style="height:100%;width:${pct}%;background:#D97706;transition:width .35s linear;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--t2);font-family:var(--font-mono);">
          <span>${flow.currentIdx+1}/${exs.length} · ${doneCount} completati</span>
          <span style="color:var(--t3);">pausa</span>
        </div>
      </div>`;
  }
  // RAMO 3: RUNNING ESERCIZIO normale (logica esistente)
  else if(flow.active && flow.currentIdx < exs.length){
    const cur = exs[flow.currentIdx];
    const mm = String(Math.floor(flow.remaining/60)).padStart(2,'0');
    const ss = String(flow.remaining%60).padStart(2,'0');
    const dur = cur.duration_sec || 30;
    const pct = dur ? Math.round((dur - flow.remaining)/dur*100) : 0;
    const sideBadge = cur.side ? `<span style="font-size:10px;font-weight:700;color:#fff;background:var(--acc);border-radius:4px;padding:2px 7px;font-family:var(--font-mono);margin-left:8px;">${cur.side.toUpperCase()}</span>` : '';
    const playPauseBtn = flow.running
      ? `<button onclick="recoveryFlowPause()" title="Pausa" style="background:var(--acc);color:#fff;border:none;border-radius:10px;width:52px;height:52px;cursor:pointer;font-size:20px;font-weight:700;">⏸</button>`
      : `<button onclick="recoveryFlowResume()" title="Riprendi" style="background:var(--acc);color:#fff;border:none;border-radius:10px;width:52px;height:52px;cursor:pointer;font-size:20px;font-weight:700;">▶</button>`;
    heroHtml = `
      <div style="background:var(--acc-lt);border:2px solid var(--acc);border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:10px;color:var(--acc);font-family:var(--font-mono);letter-spacing:.1em;font-weight:700;text-transform:uppercase;">${cur.block||''}</span>
          ${sideBadge}
        </div>
        <div style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.2;margin-bottom:14px;">${nomeCortoConTag(cur.name)}</div>
        <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:46px;font-weight:800;font-family:var(--font-mono);color:var(--acc);line-height:1;flex-shrink:0;">${mm}:${ss}</div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button onclick="recoveryFlowBack()" title="Indietro" style="background:transparent;border:1.5px solid var(--acc);border-radius:10px;width:44px;height:52px;cursor:pointer;color:var(--acc);font-size:18px;font-weight:700;">⏪</button>
            ${playPauseBtn}
            <button onclick="recoveryFlowSkip()" title="Skip" style="background:transparent;border:1.5px solid var(--acc);border-radius:10px;width:44px;height:52px;cursor:pointer;color:var(--acc);font-size:18px;font-weight:700;">⏩</button>
          </div>
        </div>
        <div style="height:6px;background:rgba(42,122,111,.18);border-radius:3px;overflow:hidden;margin-bottom:8px;">
          <div style="height:100%;width:${pct}%;background:var(--acc);transition:width .35s linear;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--t2);font-family:var(--font-mono);">
          <span>${flow.currentIdx+1}/${exs.length} · ${doneCount} completati</span>
          <button onclick="recoveryFlowEnd()" title="Termina sessione" style="background:transparent;border:none;color:var(--t3);font-size:11px;font-family:var(--font-mono);cursor:pointer;text-decoration:underline;">termina</button>
        </div>
      </div>`;
  } else if(flow.active && flow.currentIdx >= exs.length){
    // Sessione completata via flow
    heroHtml = `
      <div style="background:var(--acc-lt);border:2px solid var(--acc);border-radius:14px;padding:24px;text-align:center;margin-bottom:16px;">
        <div style="font-size:40px;margin-bottom:8px;">🎉</div>
        <div style="font-size:18px;font-weight:700;color:var(--acc);font-family:var(--font-sans);margin-bottom:4px;">Sessione completata</div>
        <div style="font-size:12px;color:var(--t2);font-family:var(--font-mono);">${exs.length}/${exs.length} esercizi</div>
      </div>`;
  } else {
    // Stato iniziale: non avviato
    const allManuallyDone = doneCount === exs.length && exs.length > 0;
    // Mutual exclusion: disabled se activation flow running
    const activationRunning = !!(ST.trainActivationFlow && ST.trainActivationFlow.running);
    const startBtnStyle = activationRunning
      ? 'background:#CCC;color:#fff;border:none;border-radius:10px;padding:14px 30px;font-size:15px;font-weight:700;cursor:not-allowed;font-family:var(--font-sans);opacity:.6;'
      : 'background:var(--acc);color:#fff;border:none;border-radius:10px;padding:14px 30px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-sans);';
    const startBtnAction = activationRunning ? '' : 'onclick="recoveryFlowStart()"';
    heroHtml = `
      <div style="background:var(--acc-lt);border:2px solid var(--acc);border-radius:14px;padding:20px;margin-bottom:16px;text-align:center;">
        <div style="font-size:11px;color:var(--acc);font-family:var(--font-mono);letter-spacing:.1em;margin-bottom:8px;text-transform:uppercase;font-weight:700;">${exs.length} esercizi · ~${totMin} min</div>
        <div style="font-size:20px;font-weight:700;color:#1A1A1A;margin-bottom:16px;">${s.label || s.name}</div>
        ${allManuallyDone
          ? `<div style="font-size:14px;color:var(--acc);font-weight:600;font-family:var(--font-sans);">✓ Tutti gli esercizi completati</div>`
          : `<button ${startBtnAction} ${activationRunning?'disabled':''} style="${startBtnStyle}">▶ Start sessione</button>${activationRunning?'<div style="font-size:10px;color:var(--t3);margin-top:8px;font-family:var(--font-mono);">Attivazione in corso</div>':''}`}
      </div>`;
  }

  // ── Lista raggruppata per block, con highlight su corrente ──
  const blocks = [];
  const blockIdxMap = {};
  exs.forEach((e, idx) => {
    const bk = e.block || 'Altri';
    if(blockIdxMap[bk] === undefined){
      blockIdxMap[bk] = blocks.length;
      blocks.push({name: bk, items: []});
    }
    blocks[blockIdxMap[bk]].items.push({e, idx});
  });

  const listHtml = blocks.map(b => {
    const blockTotalSec = b.items.reduce((a,it)=>a+(it.e.duration_sec||0),0);
    const blockMin = Math.round(blockTotalSec/60*10)/10;
    const blockComplete = b.items.every(it => !!ST.trainRecoveryDone[it.e.name]);
    const isCollapsed = !!ST.trainRecoveryCollapsed[b.name];
    const safeBlockName = b.name.replace(/'/g,"\\'");
    const chevron = isCollapsed ? '▶' : '▼';
    const checkMark = blockComplete ? `<span style="color:#2A7A6F;font-weight:700;margin-left:6px;">✓</span>` : '';
    const headerColor = blockComplete ? '#2A7A6F' : 'var(--t3)';

    // Header sempre cliccabile (toggle)
    const headerHtml = `
      <div onclick="toggleRecoveryBlockCollapsed('${safeBlockName}')" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;cursor:pointer;user-select:none;padding:4px 0;">
        <span style="font-size:10px;font-weight:700;color:${headerColor};font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
          <span style="font-size:9px;color:${headerColor};display:inline-block;width:10px;">${chevron}</span>
          ${b.name}${checkMark}
        </span>
        <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);">${blockMin} min</span>
      </div>`;

    if(isCollapsed){
      return `<div style="margin-bottom:14px;">${headerHtml}</div>`;
    }

    const itemsHtml = b.items.map(({e, idx}) => {
      const isDone = !!ST.trainRecoveryDone[e.name];
      const isCurrent = flow.active && flow.currentIdx === idx;
      const safeName = e.name.replace(/'/g,"\\'");
      const bg = isCurrent ? '#FFF7E0' : (isDone ? '#F1F8F4' : 'var(--s1)');
      const border = isCurrent ? '2px solid #C4880A' : '1px solid var(--s2)';
      const nameStyle = isDone ? 'text-decoration:line-through;color:var(--t3);' : (isCurrent ? 'color:#1A1A1A;font-weight:700;' : 'color:var(--t1);');
      const sideBadge = e.side ? `<span style="font-size:9px;color:var(--t3);font-family:var(--font-mono);background:var(--s2);border-radius:4px;padding:1px 5px;margin-left:6px;">${e.side.toUpperCase()}</span>` : '';
      const checkBox = isDone
        ? `<div onclick="event.stopPropagation();toggleRecoveryDone('${safeName}')" style="width:20px;height:20px;border-radius:5px;background:var(--acc);border:1.5px solid var(--acc);flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`
        : `<div onclick="event.stopPropagation();toggleRecoveryDone('${safeName}')" style="width:20px;height:20px;border-radius:5px;background:transparent;border:1.5px solid var(--acc);flex-shrink:0;cursor:pointer;"></div>`;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${bg};border:${border};border-radius:8px;margin-bottom:6px;">
          ${checkBox}
          <div style="flex:1;min-width:0;cursor:pointer;" onclick="openExerciseAI('${safeName}','${sel}','','')">
            <div style="font-size:13px;${nameStyle}">${nomeCortoConTag(e.name)}${sideBadge}</div>
          </div>
          <div style="font-size:11px;font-family:var(--font-mono);color:${isCurrent ? '#C4880A' : 'var(--t2)'};font-weight:700;flex-shrink:0;">${e.duration_sec}s</div>
        </div>`;
    }).join('');
    return `
      <div style="margin-bottom:14px;">
        ${headerHtml}
        ${itemsHtml}
      </div>`;
  }).join('');

  return heroHtml + listHtml;
}

// Passo 3 — render ANTEPRIMA sola lettura di una sessione (giorno futuro non ancora attivo).
// Percorso SEPARATO dal dettaglio loggabile: nessun log, nessun controllo serie/attivazione/finisher.
// Riusa le classi di presentazione del modal scheda esercizio (.modal-section/.modal-list/.modal-params/.modal-alert).
function _renderSessionPreview(s, sel){
  const backLabel = 'I tuoi giorni'; // pillola Sessione rimossa: la sessione si apre sempre da Programma
  const isRec = s.rir === null;
  const typeBadge = isRec
    ? `<span style="background:var(--acc-lt);color:var(--acc);padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;font-family:var(--font-mono);">RECUPERO</span>`
    : `<span style="background:var(--acc-lt);color:var(--acc);padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;font-family:var(--font-mono);">${s.type.toUpperCase()}${s.rir!=null?' · RIR '+s.rir:''}</span>`;

  let exHTML;
  if(s.type === 'Recupero'){
    // Recupero in anteprima: elenco esercizi sola lettura (nome + eventuale durata), senza i controlli del flow.
    exHTML = (s.exercises||[]).map((e,i)=>{
      const dur = e.duration_sec ? `${e.duration_sec}s` : (e.reps || '');
      const sideTag = e.side ? ` · ${e.side}` : '';
      return `
        <div style="background:var(--s1,#fff);border:1px solid var(--s2);border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <span style="font-size:14px;font-weight:600;font-family:var(--font-sans);color:var(--t1);"><span style="color:var(--t3);font-family:var(--font-mono);margin-right:6px;">${i+1}</span>${nomeCortoConTag(e.name)}${sideTag}</span>
          ${dur ? `<span style="font-size:11px;font-weight:700;font-family:var(--font-mono);color:var(--acc);flex-shrink:0;">${dur}</span>` : ''}
        </div>`;
    }).join('');
    exHTML = `<div style="display:flex;flex-direction:column;gap:8px;">${exHTML}</div>`;
  } else {
    exHTML = (s.exercises||[]).map((e,i)=>{
      const isTimed = !!(e.isTimed || (typeof parseRepsRange === 'function' && parseRepsRange(e.reps)?.kind === 'seconds'));
      const rirPart  = (s.rir != null && !isTimed) ? ` · RIR ${s.rir}` : '';
      const restVal  = e.rest_sec ? restSecToText(e.rest_sec) : s.rest;
      const restPart = restVal ? ` · rec ${restVal}` : '';
      const setupSec = (Array.isArray(e.setup) && e.setup.length) ? `<div class="modal-section"><h4>Setup</h4><ul class="modal-list">${e.setup.map(x=>`<li>${x}</li>`).join('')}</ul></div>` : '';
      const execSec  = (Array.isArray(e.execution) && e.execution.length) ? `<div class="modal-section"><h4>Esecuzione</h4><ol class="modal-list">${e.execution.map(x=>`<li>${x}</li>`).join('')}</ol></div>` : '';
      const errSec   = (Array.isArray(e.commonErrors) && e.commonErrors.length) ? `<div class="modal-section"><h4>Errori comuni da evitare</h4><ul class="modal-list">${e.commonErrors.map(x=>`<li>${x}</li>`).join('')}</ul></div>` : '';
      const muscSec  = (Array.isArray(e.muscles) && e.muscles.length) ? `<div class="modal-section"><h4>Muscoli</h4><p>${e.muscles.join(' · ')}</p></div>` : '';
      const alertSec = e.alert ? `<div class="modal-alert">${e.alert}</div>` : '';
      return `
        <div style="background:var(--s1,#fff);border:1px solid var(--s2);border-radius:12px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:12px;">
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px;">
            <span style="font-size:12px;font-weight:800;font-family:var(--font-mono);color:var(--t3);">${i+1}</span>
            <span style="font-size:16px;font-weight:800;font-family:var(--font-sans);color:var(--t1);line-height:1.2;">${nomeCortoConTag(e.name)}</span>
          </div>
          ${e.eq ? `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;">${e.eq}</div>` : `<div style="height:6px;"></div>`}
          <div class="modal-params" style="margin-bottom:14px;">${e.sets} × ${e.reps}${rirPart}${restPart}</div>
          ${setupSec}
          ${execSec}
          ${errSec}
          ${muscSec}
          ${alertSec}
        </div>`;
    }).join('');
  }

  return `
    <div style="padding:16px 16px calc(96px + env(safe-area-inset-bottom));">
      <button onclick="closeTrainingSession();"
        style="display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--t2);font-size:13px;font-family:var(--font-sans);font-weight:600;padding:0;margin-bottom:16px;">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        ${backLabel}
      </button>

      <div onclick="allenaQuestoOggi('${sel}')" style="background:var(--acc);border-radius:var(--r-md,12px);padding:16px;box-shadow:0 2px 8px rgba(42,122,111,.25);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;">
        <div style="min-width:0;">
          <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);letter-spacing:.08em;color:rgba(255,255,255,.75);margin-bottom:4px;">ANTEPRIMA</div>
          <div style="font-size:17px;font-weight:800;font-family:var(--font-sans);color:#fff;line-height:1.15;">Allena questo oggi</div>
          <div style="font-size:11px;font-family:var(--font-mono);color:rgba(255,255,255,.85);margin-top:3px;">Sblocca ${s.name} e registra le serie su oggi</div>
        </div>
        <div style="font-size:22px;color:rgba(255,255,255,.9);flex-shrink:0;line-height:1;">›</div>
      </div>

      <div style="background:var(--s1,#fff);border:1px solid var(--s2);border-radius:var(--r-md,12px);padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:20px;">
        <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.08em;margin-bottom:8px;">ANTEPRIMA · SOLA LETTURA</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
          <span style="font-size:22px;font-weight:800;font-family:var(--font-sans);color:var(--t1);line-height:1.15;">${s.name}</span>
          ${typeBadge}
        </div>
        <div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.5;">Questo giorno arriva più avanti nella rotazione. Puoi vedere gli esercizi; per loggarli, anticipalo con <strong>Allena questo oggi</strong>.</div>
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--t3);font-family:var(--font-mono);letter-spacing:.06em;margin-bottom:12px;">ESERCIZI · SOLA LETTURA · PRESCRIZIONE</div>
      ${exHTML}
    </div>`;
}

// ── Nome esercizio: accorcia a runtime + deriva tag modalità ────────────────
// Il catalogo mantiene i nomi completi (es. "Stacco rumeno unilaterale con
// manubri"); a video mostriamo la versione corta + un tag modalità derivato.
// NIENTE persistenza: solo presentazione. La ricerca continua a lavorare sul
// nome completo del DB — NON usare nomeCorto per match/filtri/lookup/id.
// Input = campo `nome` dal DB (o snapshot storico); output { nomeCorto, modalita }.
function formatNomeEsercizio(nomeCompleto){
  const full = String(nomeCompleto || '');
  let s = full;
  let modalita = null;
  // Ordine significativo: "bilaterale simultaneo" prima dei residui isolati.
  const PATS = ['bilaterale simultaneo', 'unilaterale', 'alternato', 'bilaterale', 'simultaneo'];
  for(const p of PATS){
    const re = new RegExp('\\b' + p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
    if(re.test(s)){
      if(modalita === null) modalita = p;     // primo match = valore del tag
      s = s.replace(re, ' ');                  // rimuovi tutte le occorrenze
    }
  }
  const nomeCorto = s.replace(/\s+/g, ' ').trim() || full.trim();
  if(modalita === null) modalita = 'bilaterale'; // default implicito, non mostrato
  return { nomeCorto, modalita };
}

// Chip modalità: mostrato SOLO per unilaterale/alternato (bilaterale = default).
// Stile self-contained (funziona anche negli overlay a sfondo chiaro).
function modalitaTagHtml(modalita){
  if(modalita !== 'unilaterale' && modalita !== 'alternato') return '';
  return `<span style="display:inline-block;font-size:9px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;text-transform:uppercase;color:var(--acc);background:var(--acc-lt);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;">${modalita}</span>`;
}

// Chip attrezzo (per i punti UI dove l'attrezzo non è già mostrato altrove).
function attrezzoTagHtml(attrezzo){
  const a = String(attrezzo || '').trim();
  if(!a) return '';
  return `<span style="display:inline-block;font-size:9px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;text-transform:uppercase;color:var(--t3);background:var(--s2);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;">${a}</span>`;
}

// Helper compatto: nome corto + chip modalità, dato il nome completo.
function nomeCortoConTag(nomeCompleto){
  const { nomeCorto, modalita } = formatNomeEsercizio(nomeCompleto);
  return escapeHtmlSafe(nomeCorto) + modalitaTagHtml(modalita);
}
// escapeHtml esiste già altrove nel monolite; wrapper difensivo se il nome
// arriva da snapshot storici non sanificati.
function escapeHtmlSafe(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderTraining(){
  // Pillola "Sessione" rimossa (cantiere Fusione): default Programma + normalizza eventuali stati vecchi 'sessione'.
  if(ST.trainTab === 'sessione') ST.trainTab = null;
  const subnav = ST.trainTab || 'piano';
  const tabs = [
    { id:'piano',       label:'Programma' },
    { id:'progressione',label:'Progressione' },
  ];
  const navHTML = `<nav class="nutrition-subnav">
    ${tabs.map(t=>`<button class="nsn-pill${subnav===t.id?' active':''}" onclick="ST.trainTab='${t.id}';if(ST.trainSession)closeTrainingSession();else renderTraining();">${t.label}</button>`).join('')}
  </nav>`;

  let body = '';

  // Dettaglio sessione TAB-AGNOSTICO: se una sessione è aperta, mostra il dettaglio
  // qualunque sia la pillola attiva (Sessione o Programma). La pillola resta invariata.
  if(ST.trainSession && getTrainingSession(ST.trainSession)){
    const sel = ST.trainSession;
      // ── Dettaglio sessione ──────────────────────────────────
      const s = getTrainingSession(sel);
      // Passo 3 — gate ANTEPRIMA: giorno non attivo → percorso sola lettura SEPARATO (il loggabile resta byte-stabile).
      const preview = !isActiveDay(sel);
      if(preview){
        body = _renderSessionPreview(s, sel);
      } else {
      const isRecovery = s.rir === null;
      // Settimana del mesociclo: in SCARICO (sett. 6) badge dedicato + riga
      // carico leggero sul primo set di ogni esercizio (solo display, jsonb intatto).
      const cycleWk = getCycleWeekInfo();
      const SALVIA_SCARICO = '#6FA99B'; // stesso hex SALVIA del render Progressione
      const scaricoBadge = (cycleWk.isScarico && !isRecovery)
        ? `<span style="background:${SALVIA_SCARICO};color:#fff;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;" onclick="showInfoModal('scarico')">SCARICO</span>`
        : '';
      // Rientro soft: badge discreto (stile analogo a SCARICO) + banner proposta
      const softRet = !isRecovery ? getSoftReturn() : null;
      const RIENTRO_BLU = '#6B93C4'; // blu derivato dalla tinta Training (--mod-training)
      const rientroBadge = softRet
        ? `<span style="background:${RIENTRO_BLU};color:#fff;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;" onclick="showInfoModal('rientro')">RIENTRO</span>`
        : '';
      const srPrompt = (!isRecovery && ST.softReturnPrompt) ? ST.softReturnPrompt : null;
      const softReturnBanner = srPrompt ? `
        <div style="background:var(--s1);border:1px solid ${RIENTRO_BLU};border-radius:14px;padding:14px 16px;margin-bottom:14px;">
          <div style="font-size:11px;font-weight:700;font-family:var(--font-mono);color:${RIENTRO_BLU};letter-spacing:.06em;margin-bottom:6px;">RIENTRO</div>
          <div style="font-size:14px;color:var(--t1);font-family:var(--font-sans);margin-bottom:12px;">Sei stato fermo ${srPrompt.gapDays} giorni — ripartiamo più leggeri?</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="softReturnAccept()" style="flex:1;min-width:150px;background:${RIENTRO_BLU};color:#fff;border:none;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Rientro soft (consigliato)</button>
            <button onclick="softReturnDecline()" style="flex:1;min-width:120px;background:var(--s2);color:var(--t1);border:none;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Continua normale</button>
          </div>
        </div>` : '';
      const typeBadge = isRecovery
        ? `<span style="background:var(--acc-lt);color:var(--acc);padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;font-family:var(--font-mono);">RECUPERO</span>`
        : `<span style="background:var(--acc-lt);color:var(--acc);padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;font-family:var(--font-mono);">${s.type.toUpperCase()}${s.rir!=null?' · RIR '+s.rir:''}</span>${scaricoBadge}${rientroBadge}${s.rir!=null?'<span class="info-icon" onclick="showInfoModal(\'rir\')">i</span>':''}`;

      // Blocco Attivazione: nuovo flow ibrido con hero card (Fase 12 mag 2026)
      const activationSection = _renderActivationSection();
      // Warm-up specifico (FASE A, 31 mag): card sotto l'Attivazione, solo se s.warmup presente e non Recupero
      const warmupSection = _renderWarmupSection(s);

      const today = todayKey();
      const isRecoverySession = s.type === 'Recupero';
      const exerciseCards = isRecoverySession ? _renderRecoverySection(s, sel) : s.exercises.map((e, exIdx)=>{
        const safeName = e.name.replace(/'/g,"\\'");
        const exNum = exIdx + 1; // numero progressivo 1, 2, 3 …

        // Branch NON-RECOVERY: logica esistente
        const isOpen = ST.trainLogOpen && ST.trainLogOpen.sessionId===sel && ST.trainLogOpen.exName===e.name && !ST.trainCountdown;
        const loggedKeys = Object.keys(ST.trainLoggedSets).filter(k=>k.startsWith(`${sel}_${e.name}_`)&&k.endsWith(`_${today}`));
        const nextSet = loggedKeys.length + 1;
        const allDone = nextSet > e.sets;
        const unitLbl = (ST.profile && ST.profile.unit) || 'lbs';
        const badges = loggedKeys.map(k=>{
          const d = ST.trainLoggedSets[k];
          const sn = k.split('_')[2];
          if(ST.editLogKey === k){
            const dr = ST.editLogDraft || {};
            // BLOCCO 3 — Trazioni: edit inline mostra select COLORE al posto di input lbs
            if(isPullUpExercise(e.name)){
              const colorOpts = BAND_COLORS.map(c =>
                `<option value="${c}" ${dr.resistance === c ? 'selected' : ''}>${c}</option>`
              ).join('');
              return `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--acc-lt);border:1.5px solid var(--acc);padding:3px 6px;border-radius:8px;font-family:var(--font-mono);">
                <span style="font-size:10px;color:var(--acc);font-weight:700;">S${sn}</span>
                <input id="el-reps" type="number" min="1" max="30" value="${dr.reps||''}" oninput="if(ST.editLogDraft)ST.editLogDraft.reps=this.value;" style="width:38px;padding:2px 4px;border:1px solid var(--s2);border-radius:5px;font-size:11px;font-family:var(--font-mono);text-align:center;">
                <span style="font-size:10px;color:var(--t3);">r</span>
                <select id="el-resist" onchange="if(ST.editLogDraft)ST.editLogDraft.resistance=this.value;" style="padding:2px 4px;border:1px solid var(--s2);border-radius:5px;font-size:11px;font-family:var(--font-sans);">
                  <option value="">—</option>${colorOpts}
                </select>
                <button onclick="event.stopPropagation();confirmEditLog('${k.replace(/'/g,"\\'")}');" style="background:var(--acc);color:#fff;border:none;border-radius:5px;width:20px;height:20px;line-height:1;cursor:pointer;font-size:11px;font-weight:700;">✓</button>
                <button onclick="event.stopPropagation();cancelEditLog();" style="background:#fff;color:var(--t3);border:1px solid var(--s2);border-radius:5px;width:20px;height:20px;line-height:1;cursor:pointer;font-size:11px;">✕</button>
              </span>`;
            }
            return `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--acc-lt);border:1.5px solid var(--acc);padding:3px 6px;border-radius:8px;font-family:var(--font-mono);">
              <span style="font-size:10px;color:var(--acc);font-weight:700;">S${sn}</span>
              <input id="el-reps" type="number" min="1" max="30" value="${dr.reps||''}" oninput="if(ST.editLogDraft)ST.editLogDraft.reps=this.value;" style="width:38px;padding:2px 4px;border:1px solid var(--s2);border-radius:5px;font-size:11px;font-family:var(--font-mono);text-align:center;">
              <span style="font-size:10px;color:var(--t3);">r</span>
              <input id="el-resist" type="number" min="0" max="999" value="${dr.resistance||''}" oninput="if(ST.editLogDraft)ST.editLogDraft.resistance=this.value;" style="width:46px;padding:2px 4px;border:1px solid var(--s2);border-radius:5px;font-size:11px;font-family:var(--font-mono);text-align:center;">
              <span style="font-size:9px;color:var(--t3);">${unitLbl}</span>
              <button onclick="event.stopPropagation();confirmEditLog('${k.replace(/'/g,"\\'")}');" style="background:var(--acc);color:#fff;border:none;border-radius:5px;width:20px;height:20px;line-height:1;cursor:pointer;font-size:11px;font-weight:700;">✓</button>
              <button onclick="event.stopPropagation();cancelEditLog();" style="background:#fff;color:var(--t3);border:1px solid var(--s2);border-radius:5px;width:20px;height:20px;line-height:1;cursor:pointer;font-size:11px;">✕</button>
            </span>`;
          }
          // BLOCCO 3 — Trazioni: badge mostra colore banda al posto di "N lbs"
          const badgeResist = bandLabel((d.band_color && BAND_COLORS.includes(d.band_color)) ? d.band_color : d.resistance);
          // GRAFICA L2 — pill PIENA evergreen, testo bianco, ✏️ inline
          const resistTxt = badgeResist
            ? ' · ' + badgeResist + (/^\d+$/.test(String(badgeResist)) ? ' ' + unitLbl : '')
            : '';
          return `<span class="ex-set-pill-done"><span class="ex-set-pill-label">S${sn}</span> ${d.reps}r${resistTxt}<button class="ex-set-pill-edit" onclick="event.stopPropagation();editLog('${k.replace(/'/g,"\\'")}');" title="Modifica">✏️</button></span>`;
        }).join('');
        // GRAFICA L2 — pill VUOTE per le serie ancora da fare (S{n+1} … S{tot})
        const emptyBadges = (!allDone && e.sets > loggedKeys.length)
          ? Array.from({length: e.sets - loggedKeys.length}, (_, i) => {
              const sn = loggedKeys.length + 1 + i;
              return `<span class="ex-set-pill-empty">S${sn}</span>`;
            }).join('')
          : '';
        const resistOptions = RESIST_VALUES.map(v =>
          `<option value="${v}" ${ST.trainLogResist === v ? 'selected' : ''}>${v}</option>`
        ).join('');
        // Esercizi temporali (iso + reps in secondi): label "DURATA", picker 5-90 step 5, RIR nascosto
        const parsedReps = parseRepsRange(e.reps);
        // e.isTimed è il flag esplicito degli esercizi generati dal coach (durationBased)
        const isTimed = (parsedReps && parsedReps.kind === 'seconds') || !!e.isTimed;
        const logForm = isOpen ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--s2);">
            <div style="font-size:11px;font-weight:700;color:var(--acc);font-family:var(--font-mono);margin-bottom:8px;">SERIE ${nextSet}</div>
            <div style="display:flex;gap:8px;margin-bottom:10px;">
              <div style="flex:1;">
                <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:3px;">${isTimed ? 'DURATA (sec)' : 'REPS'}</label>
                <select id="tl-reps" class="picker-select" style="border:1.5px solid var(--acc);">
                  <option value="" disabled selected>—</option>
                  ${(()=>{
                    if(isTimed){
                      // Range temporale: stesso range del picker esecuzione (min-10 → max+15, step 5)
                      let opts = '';
                      const lo2 = Math.max(5, (parsedReps.min||10) - 10);
                      const hi2 = (parsedReps.max||parsedReps.min||10) + 15;
                      for(let s=lo2; s<=hi2; s+=5) opts += `<option value="${s}">${s}</option>`;
                      return opts;
                    } else {
                      // Range reps: 0-30, step 1
                      return Array.from({length:31}, (_,i)=>`<option value="${i}">${i}</option>`).join('');
                    }
                  })()}
                </select>
              </div>
              ${!isTimed ? `<div style="flex:1;">
                <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:3px;">RIR</label>
                <select id="tl-rir" class="picker-select" style="border:1.5px solid var(--s2);">
                  <option value="">—</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>` : ''}
            </div>
            ${isPullUpExercise(e.name) ? bandPickerHTML(6) : `
              <div style="margin-bottom:6px;">
                <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:4px;">CARICO (${unitLbl})</label>
                <select id="tl-resist" class="picker-select" onchange="ST.trainLogResist = this.value === '' ? null : parseInt(this.value, 10);"
                  style="border:1.5px solid var(--s2);">
                  <option value="" disabled ${ST.trainLogResist == null ? 'selected' : ''}>—</option>
                  ${resistOptions}
                </select>
                <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-align:center;margin-top:4px;">lbs indicativi · scarto ±15% per gli elastici a tubo</div>
              </div>
            `}
            <div style="display:flex;gap:8px;">
              <button id="tl-save-btn" onclick="saveTrainingSet();" ${ST.trainSaving?'disabled':''}
                style="flex:1;padding:10px;background:${ST.trainSaving?'var(--b2)':'var(--acc)'};color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:${ST.trainSaving?'default':'pointer'};">
                ${ST.trainSaving?'...':'Salva S'+nextSet}
              </button>
              <button onclick="ST.trainLogOpen=null;renderTraining();"
                style="padding:10px 16px;background:var(--s2);color:var(--t2);border:none;border-radius:8px;font-size:13px;font-weight:600;font-family:var(--font-sans);cursor:pointer;">✕</button>
            </div>
          </div>` : '';
        const restLabel = restSecToText(getRestSec(sel, e));
        // FIX PROGRESSIONE (27 mag 2026) — Fonte unica: getProgressionLive
        // (suggerimento deterministico se presente, altrimenti fallback iniziale).
        const suggestion = getProgressionLive(e.name, sel);
        const muscles = (e.muscles && e.muscles.length) ? e.muscles.join(' · ') : '';
        // GRAFICA L2 (27 mag 2026) — Restyling card allineato al mockup approvato.
        // Mantiene tutta la logica (logger, ✏️ edit, openExerciseAI su header, +S→exec,
        // blocco nota, suggerimento AI): cambia solo struttura visiva.
        // GRAFICA L2.1 — Quadratino numero "parlante" per stato + card evidenziata in logging.
        const restCompact = restSecToCompact(getRestSec(sel, e));
        const equipmentUpper = (e.eq || '').toUpperCase();
        // Determina stato esercizio per styling num-box (riusa flag già calcolati sopra):
        //  - allDone: tutte le serie completate
        //  - isOpen: logger aperto (logging)
        //  - loggedKeys.length > 0 (e non allDone): in corso
        //  - altrimenti: idle (da iniziare)
        let numBoxClass = 'idle';
        if(allDone) numBoxClass = 'done-state';
        else if(isOpen) numBoxClass = 'logging';
        else if(loggedKeys.length > 0) numBoxClass = 'in-progress';
        // Contenuto: ✓ se completato, altrimenti il numero progressivo
        const numBoxContent = allDone
          ? `<span class="ex-num-check">✓</span>`
          : `${exNum}`;
        const cardClasses = ['exercise-card'];
        if(allDone) cardClasses.push('done');
        if(isOpen) cardClasses.push('logging');
        return `
          <div class="${cardClasses.join(' ')}" id="excard-${e.name.replace(/[^a-zA-Z0-9]/g,'_')}">
            <!-- HEADER cliccabile (apre modal scheda esercizio) -->
            <div class="ex-header" onclick="openExerciseAI('${safeName}','${sel}','','')">
              <div class="ex-title-row">
                <span class="ex-num-box ${numBoxClass}">${numBoxContent}</span>
                <h3 class="ex-title">${nomeCortoConTag(e.name)}</h3>
                <span class="ex-info-icon">ⓘ</span>
                <span class="ex-params-top">${e.sets} × ${e.reps}</span>
              </div>
              ${equipmentUpper ? `<div class="ex-equipment-eyebrow">${equipmentUpper}</div>` : ''}
              ${muscles?`<div class="ex-muscles">${muscles}</div>`:''}
              <div class="ex-meta-row">
                ${(s.rir!=null && !isTimed)?`<span class="ex-rir-pill">RIR ${s.rir}</span>`:''}
                <span class="ex-rest">rec ${restCompact}</span>
              </div>
            </div>
            ${(cycleWk.isScarico && loggedKeys.length === 0) ? `<div class="ex-suggestion" style="color:${SALVIA_SCARICO};"><b>SCARICO</b> · ${isPullUpExercise(e.name) ? 'banda un livello più facile' : `resistenza −${unitLbl === 'kg' ? '5 kg' : '20 lbs'} rispetto all’ultima sessione`} · RIR 3+</div>` : ''}
            ${(softRet && loggedKeys.length === 0) ? `<div class="ex-suggestion" style="color:${RIENTRO_BLU};"><b>RIENTRO</b> · ${isPullUpExercise(e.name) ? 'banda un livello più facile' : _softReturnRowText(e.name)} · RIR +${softRet.level === 2 ? 2 : 1}</div>` : ''}
            ${suggestion?`<div class="ex-suggestion">${suggestion}</div>`:''}
            ${(badges || emptyBadges) ? `<div class="ex-set-pills-row">${badges}${emptyBadges}</div>` : ''}
            <!-- ACTION ROW: progress + bottone +S{n} o badge DONE -->
            <div class="ex-action-row">
              <span class="ex-progress${allDone?' done':''}">${loggedKeys.length}/${e.sets} serie${allDone?' ✓':''}</span>
              ${allDone
                ? `<span class="ex-done-badge">✓ DONE</span>`
                : !isOpen
                  ? `<button class="ex-add-set-btn" onclick="openTrainExec('${sel}','${safeName}',${nextSet});">▶ Inizia S${nextSet}</button>`
                  : ''}
            </div>
            ${_renderTrainNoteBlock(e.name)}
            ${logForm}
          </div>`;
      }).join('');

      const audioBanner = ST.audioBlocked
        ? `<div onclick="dismissAudioBanner();" style="background:#FFF7E6;border:1px solid #F0B85A;color:#7A5500;padding:8px 12px;border-radius:8px;font-size:12px;font-family:var(--font-sans);font-weight:600;margin-bottom:12px;cursor:pointer;text-align:center;">🔔 Tocca per attivare l'audio</div>`
        : '';

      // GRAFICA L1 (27 mag 2026) — Hero sessione + cronometro TEMPO WORKOUT.
      // Solo per sessioni NON-recovery (le recovery G3/G6 non hanno serie loggate
      // né openTrainExec, quindi tengono l'header minimale legacy).
      let heroBlock;
      if(isRecoverySession){
        heroBlock = `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            <div style="font-size:22px;font-weight:800;color:var(--t1);font-family:var(--font-sans);">${s.name}</div>
            ${typeBadge}
          </div>`;
      } else {
        const totalSets = (s.exercises || []).reduce((acc, ex) => acc + (Number(ex.sets) || 0), 0);
        const doneSets = Object.keys(ST.trainLoggedSets).filter(k =>
          k.startsWith(sel + '_') && k.endsWith('_' + today)
        ).length;
        const pctSets = totalSets > 0 ? Math.min(100, Math.round((doneSets / totalSets) * 100)) : 0;
        const workSecInit = workTimeCurrent(sel);
        heroBlock = `
          <div class="train-hero" style="background:var(--s1);border-radius:14px;padding:16px;margin-bottom:18px;border:1px solid var(--s2);">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
              <h2 style="margin:0;font-size:24px;font-weight:800;color:var(--t1);font-family:var(--font-sans);letter-spacing:-.01em;">${s.name}</h2>
              ${typeBadge}
            </div>
            <div style="margin-bottom:14px;">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.14em;font-weight:600;">Serie</span>
                <span style="font-family:var(--font-mono);font-size:14px;color:var(--t1);font-weight:700;font-variant-numeric:tabular-nums;">${doneSets}<span style="color:var(--t3);font-weight:500;">/${totalSets}</span></span>
              </div>
              <div style="height:6px;background:var(--s2);border-radius:999px;overflow:hidden;">
                <div style="width:${pctSets}%;height:100%;background:var(--acc);border-radius:999px;transition:width .35s ease;"></div>
              </div>
            </div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding-top:12px;border-top:1px dashed var(--s2);">
              <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.14em;font-weight:600;">Tempo workout</span>
              <span id="train-work-display" style="font-family:var(--font-mono);font-size:22px;color:var(--acc);font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em;">${workTimeFormat(workSecInit)}</span>
            </div>
          </div>`;
      }

      body = `
        <div style="padding:16px 16px calc(96px + env(safe-area-inset-bottom));">
          <button onclick="closeTrainingSession();"
            style="display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--t2);font-size:13px;font-family:var(--font-sans);font-weight:600;padding:0;margin-bottom:16px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            I tuoi giorni
          </button>
          ${audioBanner}
          ${heroBlock}

          ${softReturnBanner}
          ${activationSection}

          ${warmupSection}

          <div style="font-size:12px;font-weight:700;color:var(--t3);font-family:var(--font-mono);letter-spacing:.06em;margin-bottom:12px;">ESERCIZI</div>
          ${exerciseCards}
          ${(s.finisher && s.finisher.exercises && s.finisher.exercises.length > 0) ? (() => {
            const fin = s.finisher;
            const durMin = Math.round(fin.totalRounds ? fin.totalRounds*(fin.work_sec+fin.rest_sec)/60 : fin.round*(fin.work_sec+fin.rest_sec)/60);
            const exList = fin.exercises.map((e,i)=>`<li style="padding:4px 0;">${i+1}. ${e.name}</li>`).join('');
            return `
            <div style="margin-top:20px;padding:14px;border-radius:12px;background:var(--s1);border:1px solid var(--s2);">
              <div style="font-size:10px;font-weight:700;color:var(--t2);font-family:var(--font-mono);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">🔥 TABATA FINALE · ~${durMin} MIN</div>
              <div style="font-size:14px;color:var(--t2);font-family:var(--font-sans);margin-bottom:4px;">${fin.round} round · ${fin.work_sec}s lavoro / ${fin.rest_sec}s recupero · 4 esercizi alternati</div>
              <ul style="margin:8px 0 12px 0;padding-left:16px;font-size:13px;color:var(--t2);font-family:var(--font-sans);list-style:none;">${exList}</ul>
              <button onclick="tabataFlowStart();"
                style="width:100%;padding:12px;background:var(--err);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">
                ▶ Start Finisher
              </button>
            </div>` ;
          })() : ''}
          ${Object.keys(ST.trainLoggedSets).some(k=>k.startsWith(sel+'_')&&k.endsWith('_'+today)) ? `
          <button onclick="completeSession('${sel}');"
            style="width:100%;margin-top:8px;padding:14px;background:var(--acc);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">
            ✓ Completa sessione
          </button>` : ''}
        </div>`;
      }

  } else if(subnav === 'piano'){
    // ── Piano tab ───────────────────────────────────────────
    const DAY_SPLIT = [
      { day:'G1', session:'upperA',  label:'Upper A',  desc:'Forza',         color:'var(--acc)', bg:'var(--acc-lt)' },
      { day:'G2', session:'lowerA',  label:'Lower A',  desc:'Forza',         color:'var(--acc)', bg:'var(--acc-lt)' },
      { day:'G3', session:'recoveryUpper',label:'Recovery Day', desc:'Recupero attivo', color:'var(--acc)', bg:'var(--acc-lt)' },
      { day:'G4', session:'upperB',  label:'Upper B',  desc:'Ipertrofia',    color:'var(--acc)', bg:'var(--acc-lt)' },
      { day:'G5', session:'lowerB',  label:'Lower B',  desc:'Ipertrofia',    color:'var(--acc)', bg:'var(--acc-lt)' },
      { day:'G6', session:'recoveryLower',label:'Recovery Day', desc:'Recupero attivo', color:'var(--acc)', bg:'var(--acc-lt)' },
    ];
    const CYCLE_WEEKS = [
      { n:1, type:'CARICO',  rir:'RIR 2 / 1', active:false },
      { n:2, type:'CARICO',  rir:'RIR 2 / 1', active:false },
      { n:3, type:'CARICO',  rir:'RIR 2 / 1', active:false },
      { n:4, type:'CARICO',  rir:'RIR 1 / 1', active:false },
      { n:5, type:'CARICO',  rir:'RIR 1 / 1', active:false },
      { n:6, type:'SCARICO', rir:'RIR 3+',     active:false },
    ];
    // Settimana corrente: helper canonico getCycleWeekInfo() — stessa
    // matematica del calcolo inline storico (floor(count/workPerGiro)%6 +
    // correttivo di bordo), estratta per riuso (RIR scarico, badge sessione).
    // Esclude rest/rest_injury (riposi non contano per progressione carico/scarico).
    // Mostra SETT 1 di default se non ci sono ancora workout.
    CYCLE_WEEKS[getCycleWeekInfo().weekNum - 1].active = true;

    // ── Valori derivati (NON nuovi dati: stessa logica della settimana attiva sopra) ──
    const activeWeek = CYCLE_WEEKS.find(w => w.active) || CYCLE_WEEKS[0];
    const activeWeekNum = activeWeek.n;                 // 1..6
    const activeIsScarico = activeWeek.type === 'SCARICO';
    const SALVIA = '#6FA99B';                            // verde salvia (stessa famiglia evergreen) — Ipertrofia / scarico
    const oggiBadge = `<span style="font-size:8px;font-weight:800;font-family:var(--font-mono);letter-spacing:.08em;color:#fff;background:var(--acc);padding:2px 6px;border-radius:999px;flex-shrink:0;">PROSSIMO</span>`;

    // ── Passo 4 · DEBITO (allenamenti saltati per anticipo) — calcolato dallo storico, niente DB ──
    const { debt: trainDebt, target: debtTarget } = computeTrainingDebt();
    const debtSet = new Set(trainDebt);
    const debtBadge = `<span style="font-size:8px;font-weight:800;font-family:var(--font-mono);letter-spacing:.04em;color:#fff;background:var(--err);padding:2px 6px;border-radius:999px;flex-shrink:0;white-space:nowrap;">DA RECUPERARE</span>`;

    // ── 1 · HERO settimana ──────────────────────────────────
    const heroSegs = [0,1,2,3,4,5].map(i=>{
      const filled = i < activeWeekNum;
      const col = filled ? (i === 5 ? SALVIA : 'var(--acc)') : 'var(--s3)';
      return `<div style="flex:1;height:6px;border-radius:3px;background:${col};"></div>`;
    }).join('');

    const heroHTML = `
      <div style="background:var(--s1,#fff);border:1px solid var(--s2);border-radius:var(--r-md,12px);padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
          <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.08em;">BLOCCO · FORZA + IPERTROFIA</div>
          <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--acc);background:var(--acc-lt);padding:3px 9px;border-radius:999px;white-space:nowrap;">${activeWeek.rir}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <div style="font-size:24px;font-weight:800;font-family:var(--font-sans);color:var(--t1);line-height:1.1;">Settimana ${activeWeekNum} <span style="font-size:15px;font-weight:600;color:var(--t3);">di 6</span></div>
          <div style="font-size:10px;font-weight:800;font-family:var(--font-mono);letter-spacing:.06em;color:#fff;background:${activeIsScarico?SALVIA:'var(--acc)'};padding:4px 11px;border-radius:999px;">${activeWeek.type}</div>
        </div>
        <div style="display:flex;gap:5px;margin-bottom:8px;">${heroSegs}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.06em;">${activeIsScarico?'SETTIMANA DI SCARICO':'CARICO PROGRESSIVO'}</div>
          <div style="font-size:11px;font-weight:800;font-family:var(--font-mono);color:var(--acc);">${activeWeekNum} / 6</div>
        </div>
      </div>`;

    // ── 2 · I TUOI GIORNI ───────────────────────────────────
    const workoutDays = DAY_SPLIT.filter(d => !d.session.startsWith('recovery'));
    const dayCards = workoutDays.map(d=>{
      const isIper = d.desc === 'Ipertrofia';
      const accentCol = isIper ? SALVIA : 'var(--acc)';
      // Stato card — priorità: FATTO oggi > DA RECUPERARE (debito) > OGGI (target) > FUTURO neutro
      const lastDate = ST.sessionLastCompletion ? ST.sessionLastCompletion[d.session] : null;
      const doneToday = lastDate === todayKey();
      let leftBorder = accentCol, cardOpacity = '1', stateBadge = '';
      if(doneToday){
        cardOpacity = '.72';
        stateBadge = `<span style="font-size:8px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;color:var(--acc);background:var(--acc-lt);padding:2px 6px;border-radius:999px;flex-shrink:0;white-space:nowrap;">✓ ${fmtDate(lastDate)}</span>`;
      } else if(debtSet.has(d.session)){
        leftBorder = 'var(--err)';
        stateBadge = debtBadge;
      } else if(d.session === debtTarget){
        stateBadge = oggiBadge;
      }
      return `
        <div onclick="openTrainingSession('${d.session}')" style="background:var(--s1,#fff);border:1px solid var(--s2);border-left:3px solid ${leftBorder};border-radius:10px;padding:12px 13px;box-shadow:0 1px 3px rgba(0,0,0,.05);cursor:pointer;opacity:${cardOpacity};">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:5px;">
            <span style="font-size:15px;font-weight:800;font-family:var(--font-sans);color:var(--t1);">${d.label}</span>
            ${stateBadge}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <span style="font-size:10px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;color:${accentCol};text-transform:uppercase;">● ${d.desc}</span>
            <span style="font-size:15px;color:var(--t3);line-height:1;flex-shrink:0;">›</span>
          </div>
        </div>`;
    }).join('');

    const recoveryDays = DAY_SPLIT.filter(d => d.session.startsWith('recovery'));
    const recoveryRows = recoveryDays.map(d=>{
      const isToday = d.session === debtTarget;
      return `
        <div onclick="openTrainingSession('${d.session}')" style="background:var(--s1,#fff);border:1px solid var(--s2);border-radius:10px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;">
          <span style="font-size:13px;font-weight:600;font-family:var(--font-sans);color:var(--t2);display:flex;align-items:center;gap:7px;">
            <span style="color:var(--acc);font-size:10px;line-height:1;">●</span>${getTrainingSession(d.session)?.name || d.label}${isToday?' '+oggiBadge:''}
          </span>
          <span style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span style="font-size:9px;font-weight:700;font-family:var(--font-mono);letter-spacing:.08em;color:var(--t3);">RECUPERO</span>
            <span style="font-size:15px;color:var(--t3);line-height:1;">›</span>
          </span>
        </div>`;
    }).join('');

    // ── helpers "I tuoi giorni" — riusati da layout 4gg e 5gg ──────────────
    const _mkDayCard = (sid, lbl, dsc, isIper) => {
      const acCol = isIper ? SALVIA : 'var(--acc)';
      const ld = ST.sessionLastCompletion ? ST.sessionLastCompletion[sid] : null;
      const dt = ld === todayKey();
      let lb = acCol, op = '1', sb = '';
      if(dt){ op='.72'; sb=`<span style="font-size:8px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;color:var(--acc);background:var(--acc-lt);padding:2px 6px;border-radius:999px;flex-shrink:0;white-space:nowrap;">✓ ${fmtDate(ld)}</span>`; }
      else if(debtSet.has(sid)){ lb='var(--err)'; sb=debtBadge; }
      else if(sid===debtTarget){ sb=oggiBadge; }
      return `<div onclick="openTrainingSession('${sid}')" style="background:var(--s1,#fff);border:1px solid var(--s2);border-left:3px solid ${lb};border-radius:10px;padding:12px 13px;box-shadow:0 1px 3px rgba(0,0,0,.05);cursor:pointer;opacity:${op};"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:5px;"><span style="font-size:15px;font-weight:800;font-family:var(--font-sans);color:var(--t1);">${lbl}</span>${sb}</div><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="font-size:10px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;color:${acCol};text-transform:uppercase;">● ${dsc}</span><span style="font-size:15px;color:var(--t3);line-height:1;flex-shrink:0;">›</span></div></div>`;
    };
    const _mkSep = (lbl, cnt) => {
      const cntSpan = cnt ? '<span style="font-size:9px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.06em;">' + cnt + '</span>' : '';
      return `<div style="display:flex;align-items:center;gap:6px;margin:14px 0 8px;"><span style="font-size:9px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.06em;">—</span><span style="font-size:9px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.06em;flex:1;">${lbl}</span>${cntSpan}</div>`;
    };
    const is5day = Array.isArray(ST.userSessionCycle) && ST.userSessionCycle.includes('upperC');
    const _obKey = ((ST.profile?.obiettivo || '').split(',')[0] || 'mantenimento');
    const _obLabel = (OBJ_ADAPT[_obKey] || OBJ_ADAPT.mantenimento).label.toUpperCase();
    let giorniHTML;
    if(is5day){
      const recSess = recoveryDays[0];
      const recLd = ST.sessionLastCompletion ? ST.sessionLastCompletion[recSess?.session] : null;
      const recDt = recLd === todayKey();
      let recBadge = '';
      if(recDt) recBadge = `<span style="font-size:8px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;color:var(--acc);background:var(--acc-lt);padding:2px 6px;border-radius:999px;flex-shrink:0;white-space:nowrap;">✓ ${fmtDate(recLd)}</span>`;
      else if(recSess?.session === debtTarget) recBadge = oggiBadge;
      const cSessObj = getTrainingSession('upperC');
      const cLbl = cSessObj?.name || 'Upper C';
      const cLd = ST.sessionLastCompletion ? ST.sessionLastCompletion['upperC'] : null;
      const cDt = cLd === todayKey();
      let cLb = SALVIA, cOp = '1', cBadge = '';
      if(cDt){ cOp='.72'; cBadge=`<span style="font-size:8px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;color:var(--acc);background:var(--acc-lt);padding:2px 6px;border-radius:999px;flex-shrink:0;white-space:nowrap;">✓ ${fmtDate(cLd)}</span>`; }
      else if(debtSet.has('upperC')){ cLb='var(--err)'; cBadge=debtBadge; }
      else if('upperC'===debtTarget){ cBadge=oggiBadge; }
      const recSessId = recSess ? recSess.session : 'recoveryUpper';
      giorniHTML = `<div>
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:3px;">
          <div style="font-size:14px;font-weight:700;font-family:var(--font-sans);color:var(--t1);">I tuoi giorni</div>
          <div style="font-size:9px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.04em;">5 ALLEN · 1 REC · 1 RIPOSO</div>
        </div>
        <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.06em;margin-bottom:4px;">${_obLabel}</div>
        ${_mkSep('BLOCCO · FORZA', '2 ALLEN')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          ${_mkDayCard('upperA','Upper A','Forza',false)}
          ${_mkDayCard('lowerA','Lower A','Forza',false)}
        </div>
        ${_mkSep('RECUPERO', '')}
        <div style="margin-bottom:10px;">
          <div onclick="openTrainingSession('${recSessId}')" style="background:var(--s1,#fff);border:1px solid var(--s2);border-radius:10px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;">
            <span style="font-size:13px;font-weight:600;font-family:var(--font-sans);color:var(--t2);display:flex;align-items:center;gap:7px;">
              <span style="font-size:13px;line-height:1;">↻</span>Recovery Day${recBadge ? ' ' + recBadge : ''}
            </span>
            <span style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <span style="font-size:9px;font-weight:700;font-family:var(--font-mono);letter-spacing:.08em;color:var(--t3);">~25 MIN</span>
              <span style="font-size:15px;color:var(--t3);line-height:1;">›</span>
            </span>
          </div>
        </div>
        ${_mkSep('BLOCCO · IPERTROFIA', '3 ALLEN')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          ${_mkDayCard('upperB','Upper B','Ipertrofia',true)}
          ${_mkDayCard('lowerB','Lower B','Ipertrofia',true)}
          <div onclick="openTrainingSession('upperC')" style="background:#F0F7F5;border:1px solid var(--s2);border-left:3px solid ${cLb};border-radius:10px;padding:12px 13px;box-shadow:0 1px 3px rgba(0,0,0,.05);cursor:pointer;opacity:${cOp};grid-column:1/-1;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
              <span style="font-size:15px;font-weight:800;font-family:var(--font-sans);color:var(--t1);">${cLbl}</span>
              <div style="display:flex;align-items:center;gap:6px;">${cBadge}<span style="font-size:8px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;color:var(--t3);background:var(--s2);padding:2px 7px;border-radius:999px;white-space:nowrap;">5° · LEGGERO</span><span style="font-size:15px;color:var(--t3);line-height:1;flex-shrink:0;">›</span></div>
            </div>
            <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);letter-spacing:.04em;color:${SALVIA};text-transform:uppercase;">● ALTE REP · BASSO CARICO · ISOLAMENTI</div>
          </div>
        </div>
        ${_mkSep('RIPOSO', '')}
        <div style="background:transparent;border:1.5px dashed var(--b1,#DDD9D0);border-radius:10px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;opacity:0.6;">
          <span style="font-size:13px;font-weight:600;font-family:var(--font-sans);color:var(--t2);display:flex;align-items:center;gap:7px;">
            <span style="font-size:13px;line-height:1;">☽</span>Rest Day
          </span>
          <span style="font-size:9px;font-weight:700;font-family:var(--font-mono);letter-spacing:.08em;color:var(--t3);">RIPOSO COMPLETO</span>
        </div>
      </div>`;
    } else {
      giorniHTML = `
      <div>
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:3px;">
          <div style="font-size:14px;font-weight:700;font-family:var(--font-sans);color:var(--t1);">I tuoi giorni</div>
          <div style="font-size:13px;font-weight:700;font-family:var(--font-mono);color:var(--t3);">4 + 2</div>
        </div>
        <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.06em;margin-bottom:12px;">UPPER / LOWER · 4 ALLENAMENTI</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">${dayCards}</div>
        <div style="display:flex;flex-direction:column;gap:8px;">${recoveryRows}</div>
      </div>`;
    }

    // ── 3 · CICLO 6 SETTIMANE ───────────────────────────────
    const cycleSub = ['Base','+1 rep','+1 set','+1 rep','Picco','−40% vol'];
    const cycleCards = CYCLE_WEEKS.map((w,i)=>{
      const phase = w.type === 'SCARICO' ? 'Scarico' : 'Carico';
      return `
      <div style="border-radius:var(--r-md,12px);padding:11px 6px;text-align:center;position:relative;
        background:${w.active?'var(--acc)':w.type==='SCARICO'?'#F0F4F0':'var(--s1,#fff)'};
        box-shadow:${w.active?'0 2px 8px rgba(42,122,111,.25)':'0 1px 3px rgba(0,0,0,.06)'};
        border:${w.active?'none':'1px solid var(--s2)'};
        transition:all .2s;">
        ${w.active?`<div style="position:absolute;top:0;left:50%;transform:translate(-50%,-50%);font-size:8px;font-weight:800;font-family:var(--font-mono);letter-spacing:.08em;color:#fff;background:var(--acc);padding:2px 6px;border-radius:999px;">QUI</div>`:''}
        <div style="font-size:9px;font-weight:700;font-family:var(--font-mono);color:${w.active?'rgba(255,255,255,.7)':'var(--t3)'};margin-bottom:3px;">SETT ${w.n}</div>
        <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:${w.active?'rgba(255,255,255,.85)':(w.type==='SCARICO'?'#2A7A6F':'var(--acc)')};margin-bottom:3px;">${phase}</div>
        <div style="font-size:11px;font-weight:800;font-family:var(--font-sans);color:${w.active?'#fff':'var(--t1)'};">${cycleSub[i]}</div>
      </div>`;
    }).join('');

    const cicloHTML = `
      <div>
        <div style="font-size:14px;font-weight:700;font-family:var(--font-sans);color:var(--t1);margin-bottom:3px;">Ciclo · 6 settimane <span class="info-icon" onclick="showInfoModal('scarico')">i</span></div>
        <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.06em;margin-bottom:12px;">SETTIMANA ${activeWeekNum} · ${activeIsScarico?'SETTIMANA DI SCARICO':'CARICO PROGRESSIVO'}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);column-gap:8px;row-gap:14px;">${cycleCards}</div>
      </div>`;

    // ── 4 · COME CRESCI (progressione doppia, collassabile) ──
    const comeCresciOpen = !!ST.trainComeCresciOpen;
    const ccStepsHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="width:22px;height:22px;border-radius:50%;background:var(--acc-lt);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:800;color:var(--acc);font-family:var(--font-mono);">1</div>
          <div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.4;">Esegui le serie restando al <strong>RIR target</strong> della settimana (es. RIR 2 = fermarsi 2 rip prima del cedimento)</div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="width:22px;height:22px;border-radius:50%;background:var(--acc-lt);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:800;color:var(--acc);font-family:var(--font-mono);">2</div>
          <div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.4;">Quando raggiungi il <strong>limite reps</strong> di una fascia con quel RIR → aumenta il carico</div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="width:22px;height:22px;border-radius:50%;background:var(--acc-lt);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:800;color:var(--acc);font-family:var(--font-mono);">3</div>
          <div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.4;">Riparte dal <strong>minimo delle reps</strong> con il nuovo carico</div>
        </div>
      </div>
      <div style="margin-top:14px;padding:12px;background:var(--s2);border-radius:8px;border-left:3px solid var(--acc);">
        <div style="font-size:11px;font-weight:700;color:var(--acc);font-family:var(--font-mono);margin-bottom:9px;letter-spacing:.04em;">ESEMPIO · CHEST PRESS · 4-6 REPS</div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          ${[['S1','5/5/5/5',false],['S2','6/6/5/5',false],['S3','6/6/6/6',false],['S4','4/4/4/4',true]].map(([s,v,full],idx)=>`
            ${idx>0?`<span style="color:var(--t3);font-size:11px;">→</span>`:''}
            <span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:5px 9px;border-radius:8px;background:${full?'var(--acc)':'var(--s1,#fff)'};border:1px solid ${full?'var(--acc)':'var(--s3)'};">
              <span style="font-size:8px;font-weight:700;font-family:var(--font-mono);color:${full?'rgba(255,255,255,.75)':'var(--t3)'};">${s}</span>
              <span style="font-size:11px;font-weight:800;font-family:var(--font-mono);color:${full?'#fff':'var(--t1)'};">${v}</span>
            </span>`).join('')}
        </div>
      </div>`;

    const comeCresciHTML = `
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--t3);font-family:var(--font-mono);letter-spacing:.06em;margin-bottom:10px;">PROGRESSIONE DOPPIA · IL METODO <span class="info-icon" onclick="showInfoModal('progressione')">i</span></div>
        <div style="background:var(--s1,#fff);border-radius:var(--r-md,12px);padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
          <div style="font-size:14px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:${comeCresciOpen?'12px':'8px'};">Come cresci</div>
          ${comeCresciOpen ? `
            ${ccStepsHTML}
            <div onclick="toggleTrainComeCresci();" style="margin-top:14px;text-align:center;font-size:11px;font-weight:700;font-family:var(--font-mono);letter-spacing:.06em;color:var(--acc);cursor:pointer;">CHIUDI ▴</div>
          ` : `
            <div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.5;margin-bottom:10px;">Spingi al <strong>RIR target</strong> → saturi le <strong>reps</strong> → aumenti il <strong>carico</strong></div>
            <div onclick="toggleTrainComeCresci();" style="font-size:12px;font-weight:700;font-family:var(--font-mono);color:var(--acc);cursor:pointer;">Vedi di più ▾</div>
          `}
        </div>
      </div>`;

    // ── Scorciatoia "Allenamento di oggi" — punta al target (debito più vecchio se presente, altrimenti rotazione) ──
    const todayTargetSid = debtTarget || 'upperA';
    const todayTargetSess = getTrainingSession(todayTargetSid);
    const todayTargetName = todayTargetSess?.name || 'Allenamento';
    const todayTargetMeta = todayTargetSess
      ? (todayTargetSess.type === 'Recupero'
          ? `${(todayTargetSess.exercises || []).length} esercizi · ~25 min`
          : (/^rest/.test(todayTargetSid) || todayTargetSess.type === 'Riposo' || todayTargetSess.rir == null)
            ? '' // rest day / sessione senza RIR: niente "RIR null · 0 esercizi"
            : `RIR ${todayTargetSess.rir} · ${(todayTargetSess.exercises || []).length} esercizi`)
      : '';
    const shortcutHTML = `
      <div onclick="openTrainingSession('${todayTargetSid}')" style="background:var(--acc);border-radius:var(--r-md,12px);padding:16px;box-shadow:0 2px 8px rgba(42,122,111,.25);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="min-width:0;">
          <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);letter-spacing:.08em;color:rgba(255,255,255,.75);margin-bottom:4px;">PROSSIMO ALLENAMENTO</div>
          <div style="font-size:18px;font-weight:800;font-family:var(--font-sans);color:#fff;line-height:1.15;">${todayTargetName}</div>
          <div style="font-size:11px;font-family:var(--font-mono);color:rgba(255,255,255,.85);margin-top:3px;">${todayTargetMeta}</div>
        </div>
        <div style="font-size:22px;color:rgba(255,255,255,.9);flex-shrink:0;line-height:1;">›</div>
      </div>`;

    body = `
      <div style="padding:16px;display:flex;flex-direction:column;gap:20px;">

        ${shortcutHTML}

        ${heroHTML}

        ${_renderInjuryBar()}

        ${giorniHTML}

        ${cicloHTML}

        ${comeCresciHTML}

        <div>
          <div style="font-size:12px;font-weight:700;color:var(--t3);font-family:var(--font-mono);letter-spacing:.06em;margin-bottom:10px;">RIPOSO EXTRA</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="background:var(--s1,#fff);border-radius:var(--r-md,12px);padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:4px;">🌙 Riposo scelto</div>
                <div style="font-size:12px;color:var(--t3);font-family:var(--font-sans);line-height:1.4;">Giorno di riposo volontario. Non blocca la rotazione.</div>
              </div>
              <button onclick="markRestChosen();" style="flex-shrink:0;background:var(--t3);color:#fff;border:none;border-radius:8px;padding:10px 14px;font-size:11px;font-family:var(--font-mono);letter-spacing:1px;text-transform:uppercase;font-weight:700;cursor:pointer;white-space:nowrap;">Segna oggi</button>
            </div>
            <div style="background:var(--s1,#fff);border-radius:var(--r-md,12px);padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:4px;">🩹 Riposo per infortunio</div>
                <div style="font-size:12px;color:var(--t3);font-family:var(--font-sans);line-height:1.4;">Stop forzato. Permette di appuntare la zona del corpo.</div>
              </div>
              <button onclick="openInjuryModal();" style="flex-shrink:0;background:var(--err);color:#fff;border:none;border-radius:8px;padding:10px 14px;font-size:11px;font-family:var(--font-mono);letter-spacing:1px;text-transform:uppercase;font-weight:700;cursor:pointer;white-space:nowrap;">Segna oggi</button>
            </div>
          </div>
        </div>

      </div>`;
  } else {
    // ── Progressione tab ────────────────────────────────────

    // Auto-load workout per la strip calendario (storico intero, non un mese)
    if(ST.trainWorkouts === undefined){
      loadWorkouts();
    }

    const selEx = ST.trainProgEx;

    // Lazy-load lista esercizi con ultimo set
    if(ST.allExerciseNamesCache === null){
      loadAllExerciseNamesWithLast();
    }

    // ── Strip calendario ──
    let calStripHTML = '';
    if(ST.trainWorkouts === null){
      calStripHTML = `<div class="cal-strip-wrap" style="justify-content:center;color:var(--t3);font-family:var(--font-mono);font-size:12px;">Caricamento…</div>`;
    } else {
      calStripHTML = renderCalStrip(ST.trainWorkouts);
    }

    // ── Dropdown selezione esercizio (restyled) ──
    const ddOpen = !!ST.trainProgDropdownOpen;
    const ddTab = ST.trainProgDropdownTab || 'programma';
    const ddSearch = (ST.trainProgDropdownSearch || '').toLowerCase().trim();
    const matchesSearch = (name) => !ddSearch || (name && name.toLowerCase().includes(ddSearch));
    const escapeAttr = (s) => String(s).replace(/'/g, "\\'");

    const renderExRow = (name) => {
      const isSel = name === selEx;
      const last = ST.trainProgLastSet[name];
      const lastMeta = last ? `${last.reps} reps · ${last.resistance||'—'}` : '';
      return `<div onclick="selectProgEx('${escapeAttr(name)}');" style="padding:11px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;min-height:48px;background:${isSel?'var(--acc-lt,rgba(42,122,111,.08))':'transparent'};border-left:3px solid ${isSel?'var(--acc)':'transparent'};">
        ${isSel?`<span style="width:6px;height:6px;border-radius:50%;background:var(--acc);flex-shrink:0;"></span>`:`<span style="width:6px;flex-shrink:0;"></span>`}
        <span style="flex:1;min-width:0;">
          <span style="display:block;font-size:14px;font-family:var(--font-sans);font-weight:${isSel?'700':'500'};color:${isSel?'var(--acc)':'var(--t1)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nomeCortoConTag(name)}</span>
          ${lastMeta?`<span style="display:block;font-size:11px;font-family:var(--font-mono);color:var(--t3);margin-top:2px;">${lastMeta}</span>`:''}
        </span>
        ${isSel?`<span style="color:var(--acc);font-weight:700;flex-shrink:0;font-size:16px;">✓</span>`:''}
      </div>`;
    };

    const sessionOrder = ['upperA','upperB','lowerA','lowerB','recoveryUpper','recoveryLower'];
    const programGroups = sessionOrder.map(sid => {
      const sess = getTrainingSession(sid);
      if(!sess?.exercises) return null;
      const filtered = sess.exercises.filter(e => matchesSearch(e.name));
      if(filtered.length === 0) return null;
      return { sessionLabel: sess.name, exercises: filtered.map(e => e.name) };
    }).filter(Boolean);

    const tab1HTML = `<div>
      <div style="font-size:9px;font-weight:800;color:var(--acc);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;padding:10px 14px 4px;">Programma attuale</div>
      ${programGroups.length === 0
        ? `<div style="padding:14px;text-align:center;color:var(--t3);font-size:12px;font-family:var(--font-sans);">Nessun esercizio trovato</div>`
        : programGroups.map(g => `<div>
            <div style="font-size:11px;font-weight:700;color:var(--t2);font-family:var(--font-sans);padding:8px 14px 2px;">${g.sessionLabel}</div>
            ${g.exercises.map(renderExRow).join('')}
          </div>`).join('')
      }
      <!--
        TODO FASE 2 — gestione programmi multipli archiviati.
        Predisporre quando esisterà: tabella Supabase 'programs', colonna program_id su workouts,
        UI chiusura programma, lista collassabile programmi archiviati in questo dropdown.
      -->
      <div style="font-size:9px;font-weight:800;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;padding:14px 14px 4px;border-top:1px solid var(--s2);margin-top:8px;">Programmi passati</div>
      <div style="padding:10px 14px 14px;color:var(--t3);font-size:12px;font-family:var(--font-sans);font-style:italic;">Nessun programma archiviato</div>
    </div>`;

    let tab2HTML = '';
    if(ST.allExerciseNamesCache === null){
      tab2HTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px;font-family:var(--font-mono);">Caricamento…</div>`;
    } else if(ST.allExerciseNamesCache.length === 0){
      tab2HTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px;font-family:var(--font-sans);">Nessuna serie loggata ancora</div>`;
    } else {
      const filtered = ST.allExerciseNamesCache.filter(matchesSearch);
      tab2HTML = filtered.length
        ? `<div>${filtered.map(renderExRow).join('')}</div>`
        : `<div style="padding:14px;text-align:center;color:var(--t3);font-size:12px;font-family:var(--font-sans);">Nessun esercizio trovato</div>`;
    }

    const dropdownHTML = `
      <div style="position:relative;margin-bottom:16px;">
        <button onclick="toggleProgDropdown();" style="width:100%;background:#fff;border:1.5px solid ${ddOpen?'var(--acc)':'var(--b1,#E5E5E5)'};border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.04);transition:border-color .15s;text-align:left;">
          <span style="flex:1;min-width:0;">
            <span style="display:block;font-size:9px;font-weight:700;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">ESERCIZIO</span>
            <span style="display:block;font-size:15px;font-weight:700;font-family:'Syne',sans-serif;color:${selEx?'var(--t1)':'var(--t3)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${selEx ? nomeCortoConTag(selEx) : 'Nessun esercizio'}</span>
          </span>
          <span style="font-size:16px;color:var(--t3);transform:rotate(${ddOpen?'180deg':'0deg'});transition:transform .15s;flex-shrink:0;">▾</span>
        </button>
        ${ddOpen ? `
          <div onclick="closeProgDropdown();" style="position:fixed;inset:0;z-index:240;"></div>
          <div style="position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border:1.5px solid var(--b1,#E5E5E5);border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.13);z-index:250;max-height:60vh;display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:10px 12px;border-bottom:1px solid var(--s2);">
              <input id="prog-dd-search" type="text" placeholder="Cerca esercizio…" value="${ddSearch.replace(/"/g,'&quot;')}" oninput="setProgDropdownSearch(this.value);" autocomplete="off" style="width:100%;padding:9px 14px;border:1.5px solid var(--b1,#E5E5E5);border-radius:10px;font-size:15px;font-family:'Syne',sans-serif;outline:none;box-sizing:border-box;background:var(--s1,#fafafa);">
            </div>
            <div style="display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid var(--s2);">
              ${[['programma','Per programma'],['esercizio','Per esercizio']].map(([id,lbl]) => {
                const active = ddTab === id;
                return `<button onclick="setProgDropdownTab('${id}');" style="flex:1;padding:7px 12px;border-radius:8px;font-size:11px;font-weight:700;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.04em;border:none;background:${active?'#111':'transparent'};color:${active?'#fff':'var(--t2)'};cursor:pointer;transition:background .12s;">${lbl}</button>`;
              }).join('')}
            </div>
            <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;">
              ${ddTab === 'programma' ? tab1HTML : tab2HTML}
            </div>
          </div>
        ` : ''}
      </div>`;

    // ── Contenuto principale (esercizio selezionato) ──
    let contentHTML = '';
    if(!selEx){
      contentHTML = `<div class="prog-empty">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--s2);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;">📈</div>
        <div style="font-size:15px;font-weight:600;font-family:var(--font-sans);color:var(--t1);margin-bottom:6px;">Seleziona un esercizio</div>
        <div style="font-size:13px;color:var(--t3);font-family:var(--font-sans);">per vedere la progressione</div>
      </div>`;
    } else if(ST.trainProgLogs === null){
      contentHTML = `<div style="padding:40px 0;text-align:center;color:var(--t3);font-size:13px;font-family:var(--font-mono);">Caricamento…</div>`;
    } else if(ST.trainProgLogs.length === 0){
      contentHTML = `<div class="prog-empty">
        <div style="font-size:28px;margin-bottom:12px;">📋</div>
        <div style="font-size:14px;font-weight:600;font-family:var(--font-sans);color:var(--t1);margin-bottom:6px;">Nessuna sessione registrata</div>
        <div style="font-size:13px;color:var(--t3);font-family:var(--font-sans);">Logga le serie dalla tab Sessione per vedere il grafico</div>
      </div>`;
    } else {
      const byDate = ST.trainProgLogs.reduce((acc,log)=>{
        (acc[log.date]=acc[log.date]||[]).push(log); return acc;
      }, {});
      const dates = Object.keys(byDate).sort();
      const points = dates.map(date => {
        const best = bestSetOfDay(byDate[date]);
        return {
          date,
          dateShort: shortDate(date),
          reps: best?.reps || 0,
          resist: parseInt(best?.resistance) || 0,
        };
      });

      // 4 chip grafico — usa classi CSS
      const activeChart = ST.trainProgChart || 'carico';
      const chartChips = [
        ['carico','Carico'],
        ['1rm','1RM Stimato'],
        ['volume','Volume Totale'],
        ['zone','Zone'],
      ].map(([v,lbl]) =>
        `<button class="prog-chip${activeChart===v?' active':''}" onclick="ST.trainProgChart='${v}';renderTraining();">${lbl}</button>`
      ).join('');

      const chartSvg = renderProgChart(points, byDate, selEx);

      // Stat cards 2×2 — usa classi CSS
      const bestPeso = points.reduce((m,p) => p.resist > m ? p.resist : m, 0);
      const best1rm = points.reduce((m,p) => {
        const v = p.resist > 0 ? Math.round(p.resist * (1 + p.reps/30)) : 0;
        return v > m ? v : m;
      }, 0);
      const sessioni = points.length;
      let trendHTML = `<div class="prog-stat-value" style="color:var(--t3);">—</div>`;
      if(points.length >= 4){
        const last2 = points.slice(-2).map(p=>p.resist);
        const prev2 = points.slice(-4,-2).map(p=>p.resist);
        const diff = Math.round(((last2[0]+last2[1])/2) - ((prev2[0]+prev2[1])/2));
        if(diff > 0)      trendHTML = `<div class="prog-stat-value" style="color:var(--ok,#16A34A);">↑ +${diff}<span class="prog-stat-unit">lbs</span></div>`;
        else if(diff < 0) trendHTML = `<div class="prog-stat-value" style="color:var(--err,#DC2626);">↓ ${diff}<span class="prog-stat-unit">lbs</span></div>`;
        else              trendHTML = `<div class="prog-stat-value" style="color:var(--t3);">→ stabile</div>`;
      } else if(points.length >= 2){
        trendHTML = `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);">≥4 sessioni per trend</div>`;
      }

      const statCards2x2 = `<div class="prog-stat-grid">
        <div class="prog-stat-card">
          <div class="prog-stat-label">BEST PESO</div>
          <div class="prog-stat-value">${bestPeso||'—'}${bestPeso?`<span class="prog-stat-unit">lbs</span>`:''}</div>
        </div>
        <div class="prog-stat-card">
          <div class="prog-stat-label">1RM STIM.</div>
          <div class="prog-stat-value">${best1rm||'—'}${best1rm?`<span class="prog-stat-unit">lbs</span>`:''}</div>
        </div>
        <div class="prog-stat-card">
          <div class="prog-stat-label">SESSIONI</div>
          <div class="prog-stat-value">${sessioni}</div>
        </div>
        <div class="prog-stat-card">
          <div class="prog-stat-label">TREND</div>
          ${trendHTML}
        </div>
      </div>`;

      // Coach insight deterministico
      let insightText = 'Logga almeno 3 sessioni per vedere un\'analisi della tua progressione.';
      if(points.length >= 4){
        const last2 = points.slice(-2).map(p=>p.resist);
        const prev2 = points.slice(-4,-2).map(p=>p.resist);
        const diff = ((last2[0]+last2[1])/2) - ((prev2[0]+prev2[1])/2);
        if(diff > 0) insightText = 'Nelle ultime sessioni stai aumentando il carico. Sei in progressione — continua così.';
        else if(diff < 0) insightText = 'Il carico è leggermente calato. Verifica recupero e qualità del sonno.';
        else insightText = 'Il carico è stabile. Valuta un piccolo incremento nella prossima sessione.';
      } else if(points.length >= 3){
        insightText = 'Buon inizio. Logga ancora qualche sessione per vedere il trend completo.';
      }

      const coachInsight = `<div class="prog-coach-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--acc);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;font-family:var(--font-mono);flex-shrink:0;">Z</div>
          <span style="font-size:11px;font-weight:700;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--acc);">Coach</span>
        </div>
        <div style="font-size:13px;line-height:1.6;color:var(--t1);font-family:var(--font-sans);">${insightText}</div>
      </div>`;

      contentHTML = `
        <div class="prog-chip-row">${chartChips}</div>
        <div style="background:#fff;border-radius:16px;padding:16px 12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
          ${chartSvg}
        </div>
        ${statCards2x2}
        ${coachInsight}`;
    }

    body = `
      <div style="padding:16px;">
        ${calStripHTML}
        ${dropdownHTML}
        ${contentHTML}
      </div>`;
  }

  let modalHTML = '';
  if(ST.exerciseAIOpen) {
    const ai = ST.exerciseAIOpen;
    // ── Sorgente esecuzione (priorità): GIF Worker > skeleton (loading) > Wger PNG fallback ──
    const gifSrc = (ai.executionStatus === 'cached' && ai.executionGif) ? ai.executionGif : null;
    const execLoading = ai.executionLoading === true;
    // Wger fallback solo se NON abbiamo GIF dal worker
    const fallbackExec = gifSrc ? null : ai.executionImg;
    const fallbackIsArray = Array.isArray(fallbackExec) && fallbackExec.length > 0;
    const fallbackIsString = typeof fallbackExec === 'string' && fallbackExec;
    const hasMuscle = !!ai.muscleImg;

    // Cella destra (priorità: GIF > skeleton > PNG single > nulla).
    // Il fallback array multi-frame Wger usa un layout dedicato sotto.
    let rightCellHtml = '';
    if (gifSrc) {
      rightCellHtml = `<img src="${gifSrc}" alt="Esecuzione" class="ex-media-img" onerror="this.style.display='none'"/>`;
    } else if (execLoading) {
      rightCellHtml = `<div class="ex-media-img ex-media-skeleton" aria-label="Caricamento esecuzione"></div>`;
    } else if (fallbackIsString) {
      rightCellHtml = `<img src="${fallbackExec}" alt="Esecuzione" class="ex-media-img" onerror="this.style.display='none'"/>`;
    }

    let mediaHtml = '';
    if (!gifSrc && !execLoading && fallbackIsArray) {
      const FRAME_LABELS = ['1. Posizione iniziale','2. Posizione finale','3. Variante'];
      const cells = fallbackExec.map((src,i)=>`
        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px;text-align:center;">${FRAME_LABELS[i] || ('Frame '+(i+1))}</div>
          <img src="${src}" alt="Esecuzione frame ${i+1}" class="ex-media-img" onerror="this.style.display='none'"/>
        </div>
      `).join('');
      mediaHtml = `
        ${hasMuscle ? `<img src="${ai.muscleImg}" alt="Muscoli coinvolti" class="ex-media-img" style="margin-bottom:12px;" onerror="this.style.display='none'"/>` : ''}
        <div style="display:flex;flex-direction:row;gap:8px;margin-bottom:16px;">${cells}</div>`;
    } else if (hasMuscle || rightCellHtml) {
      const onlyOne = !hasMuscle || !rightCellHtml; // true se solo una delle due celle
      mediaHtml = `<div class="ex-media-grid${onlyOne?' single':''}">
        ${hasMuscle ? `<img src="${ai.muscleImg}" alt="Muscoli coinvolti" class="ex-media-img" onerror="this.style.display='none'"/>` : ''}
        ${rightCellHtml}
      </div>`;
    }

    // Banner surrogato — solo quando la GIF Worker e' in pagina E e' marcata surrogata
    const surrogateBanner = (gifSrc && ai.executionSurrogate && ai.executionSurrogateNote)
      ? `<div class="ex-surrogate-banner"><span class="icon">ⓘ</span><span>${ai.executionSurrogateNote}</span></div>`
      : '';
    const executionList = (ai.execution && ai.execution.length)
      ? `<ol class="modal-list">${ai.execution.map(s=>`<li>${s}</li>`).join('')}</ol>` : '';
    const errorsList = (ai.commonErrors && ai.commonErrors.length)
      ? `<ul class="modal-list">${ai.commonErrors.map(s=>`<li>${s}</li>`).join('')}</ul>` : '';
    modalHTML = `<div class="info-modal-overlay" style="z-index:1100;" onclick="ST.exerciseAIOpen=null;renderTraining()">
      <div class="info-modal" style="max-width:560px;max-height:88vh;overflow-y:auto;padding:20px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:8px;">
          <div>
            <strong style="font-size:17px;display:block;line-height:1.25;">${nomeCortoConTag(ai.exName)}${attrezzoTagHtml(ai.eq)}</strong>
            ${ai.sessionLabel ? `<div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:2px;text-transform:uppercase;letter-spacing:.04em;">${ai.sessionLabel}</div>` : ''}
            ${ai.isSurrogato ? `<div class="ex-surrogato-note" style="margin-top:6px;">⚠ Versione adattata · ${(ai.surrogatoEq||'').toUpperCase()}</div>` : ''}
          </div>
          <button onclick="ST.exerciseAIOpen=null;renderTraining()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--t3);line-height:1;flex-shrink:0;">✕</button>
        </div>

        ${mediaHtml}
        ${surrogateBanner}

        ${(ai.setup && ai.setup.length) ? `<div class="modal-section">
          <h4>Setup</h4>
          <ul class="modal-list">${ai.setup.map(s=>`<li>${s}</li>`).join('')}</ul>
        </div>` : ''}

        ${executionList ? `<div class="modal-section">
          <h4>Esecuzione</h4>
          ${executionList}
        </div>` : ''}

        ${errorsList ? `<div class="modal-section">
          <h4>Errori comuni da evitare</h4>
          ${errorsList}
        </div>` : ''}

        ${ai.alert ? `<div class="modal-alert">${ai.alert}</div>` : ''}

        <div class="modal-section modal-ai-section">
          <h4>🤖 Coach</h4>
          ${ai.loading
            ? `<div class="ai-loading">Genero un cue avanzato per te…</div>`
            : `<div style="font-size:14px;line-height:1.6;color:var(--t2);font-family:var(--font-sans);">${String(ai.content || 'Nessun consiglio aggiuntivo disponibile.').replace(/\n/g, '<br>')}</div>`}
        </div>
      </div>
    </div>`;
  }

  let countdownHTML = '';
  if(ST.trainCountdown){
    const cd = ST.trainCountdown;
    if(cd.done){
      // PRONTO! state — design system evergreen (BLOCCO 2A, 26 mag 2026)
      // Il bottone primario fa partire DIRETTAMENTE la serie successiva
      // (apre la schermata esecuzione), con "Più tardi" per chiudere e riposare ancora.
      const _exDef = findExercise(cd.exName, cd.sessionId);
      const _doneKeys = Object.keys(ST.trainLoggedSets).filter(k =>
        k.startsWith(`${cd.sessionId}_${cd.exName}_`) && k.endsWith(`_${todayKey()}`)
      );
      const _nextSet = _doneKeys.length + 1;
      const _hasNext = !!(_exDef && _exDef.sets && _nextSet <= _exDef.sets);
      const _safeName = String(cd.exName).replace(/'/g, "\\'");

      countdownHTML = `<div class="info-modal-overlay" style="z-index:1001;">
        <div class="info-modal" style="max-width:300px;text-align:center;padding:32px 24px;" onclick="event.stopPropagation()">
          <div style="font-size:52px;line-height:1;margin-bottom:12px;">💪</div>
          <div style="font-size:26px;font-weight:700;color:var(--acc);font-family:var(--font-sans);letter-spacing:.02em;margin-bottom:24px;">PRONTO!</div>
          ${_hasNext
            ? `<button onclick="skipCountdown();openTrainExec('${cd.sessionId}','${_safeName}',${_nextSet});"
                 style="width:100%;padding:15px;background:var(--acc);color:#fff;border:none;border-radius:12px;font-size:17px;font-weight:800;font-family:var(--font-sans);cursor:pointer;box-shadow:0 2px 8px rgba(42,122,111,.3);">▶ Inizia S${_nextSet}</button>
               <button onclick="skipCountdown();" style="margin-top:12px;background:transparent;border:none;color:var(--t3);font-size:13px;font-family:var(--font-sans);font-weight:600;cursor:pointer;text-decoration:underline;">Più tardi</button>`
            : `<button onclick="skipCountdown();" style="padding:10px 28px;background:var(--acc);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">OK ✓</button>`}
        </div>
      </div>`;
    } else {
      // ── BLOCCO 2A (26 mag 2026) — Schermata recupero riorganizzata ──
      // Hero in cima con ring countdown + GIF sempre visibile + skip.
      // Sotto: row chip APPENA FATTA / PROSSIMA, Coach card, Ripasso rapido alleggerito.
      // Logica countdown/beep/endTime/tick: INVARIATA (vedi tickCountdown).
      const ex = findExercise(cd.exName, cd.sessionId);
      const cueKey = `${cd.sessionId}_${cd.exName}`;
      const cueContent = ST.aiCue[cueKey];
      const cueLoading = !cueContent;

      // Color shift ultimi 10 sec — preservato dal vecchio comportamento.
      // Base: var(--acc) #2A7A6F (42,122,111). Vira verso terracotta (184,76,42) negli ultimi 10s.
      let numColor = 'var(--acc)';
      if (cd.seconds <= 10) {
        const pct = cd.seconds / 10;
        const r = Math.round(42 + (184-42)*(1-pct));
        const g = Math.round(122 + (76-122)*(1-pct));
        const b = Math.round(111 + (42-111)*(1-pct));
        numColor = 'rgb('+r+','+g+','+b+')';
      }

      // Ring SVG: r=52, circumference = 2π·52 ≈ 326.73
      // All'inizio (cd.seconds = cd.total) → dashoffset 0 → ring pieno
      // Alla fine  (cd.seconds = 0)        → dashoffset full → ring vuoto
      const ringC = 326.73;
      const ringPct = (cd.total > 0) ? (cd.seconds / cd.total) : 0;
      const ringOffset = ringC * (1 - ringPct);

      // Formato MM:SS / SS
      const fmtTime = (sec) => sec >= 60 ? `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}` : String(sec);
      const cdDisplay   = fmtTime(cd.seconds);
      const totalDisplay = fmtTime(cd.total || cd.seconds);

      // APPENA FATTA — ultima serie loggata oggi per (sessionId, exName).
      // FIX 2 (26 mag sera): font Mono uniforme con PROSSIMA (entrambi sono numerici/sigle).
      const lastSet = getLastLoggedSetLabel(cd.sessionId, cd.exName);
      const lastSetHTML = lastSet
        ? `<span class="rest-card-value mono">${esc(lastSet)}</span>`
        : `<span class="rest-card-value mono" style="color:var(--t3);">—</span>`;

      // PROSSIMA — FIX PROGRESSIONE (27 mag 2026): stessa fonte della card sessione
      // (getProgressionLive: suggerimento deterministico se presente, fallback altrimenti).
      const sugg = (typeof getProgressionLive === 'function') ? getProgressionLive(cd.exName, cd.sessionId) : '';
      const nextHTML = sugg
        ? `<span class="rest-card-value mono">${esc(sugg)}</span>`
        : `<span class="rest-card-value mono" style="color:var(--t3);">—</span>`;

      // GIF: SEMPRE VISIBILE accanto al countdown (no più toggle). Placeholder se manca.
      const gifEntry = ST.exerciseGifCache[cd.exCode || cd.exName];
      const hasGif = gifEntry && gifEntry.status === 'cached' && gifEntry.url;
      const gifLoading = gifEntry && gifEntry.status === 'loading';
      const gifHTML = hasGif
        ? `<img src="${gifEntry.url}" alt="Esecuzione ${esc(cd.exName)}" class="rest-hero-gif">`
        : `<div class="rest-hero-gif-placeholder">${gifLoading ? 'Caricamento…' : 'Anteprima non disponibile'}</div>`;

      // Ripasso rapido alleggerito: prima riga di Setup / Esecuzione / Errori.
      // ex.setup può essere string o array. Prendiamo le prime 1-2 entry per sezione.
      const setupText = (ex && ex.setup)
        ? (Array.isArray(ex.setup) ? ex.setup.slice(0, 1).join(' ') : String(ex.setup))
        : '';
      const execShort = (ex?.execution && ex.execution.length)
        ? ex.execution.slice(0, 2)
        : [];
      const errShort = (ex?.commonErrors && ex.commonErrors.length)
        ? ex.commonErrors.slice(0, 2)
        : [];

      countdownHTML = `<div class="rest-modal-overlay">
        <div class="rest-modal-container">
          <div class="rest-hero">
            <div class="rest-hero-cd-wrap">
              <svg viewBox="0 0 120 120" class="rest-ring" aria-hidden="true">
                <circle class="rest-ring-track" cx="60" cy="60" r="52" stroke-width="6" fill="none"></circle>
                <circle class="rest-ring-fill"  cx="60" cy="60" r="52" stroke-width="6" fill="none"
                  stroke-dasharray="${ringC.toFixed(2)}"
                  stroke-dashoffset="${ringOffset.toFixed(2)}"
                  stroke-linecap="round"
                  style="stroke:${numColor};"></circle>
              </svg>
              <div class="rest-hero-cd-num" style="color:${numColor};">${cdDisplay}</div>
            </div>
            <div class="rest-hero-right">
              <button class="rest-hero-skip" onclick="skipCountdown()">Salta ⏭</button>
              ${gifHTML}
              <span class="rest-hero-cd-label">Recupero · ${totalDisplay}</span>
            </div>
          </div>
          <div class="rest-modal-body">
            <div class="rest-ex-name-row">${esc(cd.exName)}</div>

            ${(()=>{
              const logIsOpen = ST.trainLogOpen && ST.trainLogOpen.sessionId === cd.sessionId && ST.trainLogOpen.exName === cd.exName;
              if(logIsOpen){
                const formLO = ST.trainLogOpen;
                const unitLbl2 = (ST.profile && ST.profile.unit) || 'lbs';
                const parsedRepsM = ex?.reps ? parseRepsRange(ex.reps) : null;
                const isTimedM = (parsedRepsM && parsedRepsM.kind === 'seconds') || !!ex?.isTimed;
                const isPullUpM = isPullUpExercise(cd.exName);
                const resistOptionsM = RESIST_VALUES.map(v =>
                  `<option value="${v}" ${ST.trainLogResist === v ? 'selected' : ''}>${v}</option>`
                ).join('');
                const nextSetM = formLO.setNum;
                return `<div style="padding:12px 0 4px;">
                  <div style="font-size:11px;font-weight:700;color:var(--acc);font-family:var(--font-mono);margin-bottom:10px;letter-spacing:.08em;">REGISTRA SERIE ${nextSetM}</div>
                  <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <div style="flex:1;">
                      <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:3px;">${isTimedM ? 'DURATA (sec)' : 'REPS'}</label>
                      <select id="tl-reps" class="picker-select" style="border:1.5px solid var(--acc);">
                        <option value="" disabled selected>—</option>
                        ${(()=>{
                          if(isTimedM){
                            let opts = '';
                            const lo2 = Math.max(5,(parsedRepsM.min||10)-10);
                            const hi2 = (parsedRepsM.max||parsedRepsM.min||10)+15;
                            for(let sv=lo2;sv<=hi2;sv+=5) opts+=`<option value="${sv}">${sv}</option>`;
                            return opts;
                          } else {
                            return Array.from({length:31},(_,i)=>`<option value="${i}">${i}</option>`).join('');
                          }
                        })()}
                      </select>
                    </div>
                    ${!isTimedM ? `<div style="flex:1;">
                      <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:3px;">RIR</label>
                      <select id="tl-rir" class="picker-select" style="border:1.5px solid var(--s2);">
                        <option value="">—</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </div>` : ''}
                  </div>
                  ${isPullUpM ? bandPickerHTML(10) : `<div style="margin-bottom:10px;">
                    <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:4px;">CARICO (${unitLbl2})</label>
                    <select id="tl-resist" class="picker-select" onchange="ST.trainLogResist = this.value === '' ? null : parseInt(this.value, 10);" style="border:1.5px solid var(--s2);">
                      <option value="" disabled ${ST.trainLogResist == null ? 'selected' : ''}>—</option>
                      ${resistOptionsM}
                    </select>
                    <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-align:center;margin-top:4px;">lbs indicativi · scarto ±15% per gli elastici a tubo</div>
                  </div>`}
                  <div style="display:flex;gap:8px;margin-top:4px;">
                    <button id="tl-save-btn" onclick="saveTrainingSet();" ${ST.trainSaving?'disabled':''}
                      style="flex:1;padding:12px;background:${ST.trainSaving?'var(--b2)':'var(--acc)'};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:${ST.trainSaving?'default':'pointer'};">
                      ${ST.trainSaving ? '…' : 'Salva serie →'}
                    </button>
                    <button onclick="ST.trainLogOpen=null;renderTraining();"
                      style="padding:12px 16px;background:var(--s2);color:var(--t2);border:none;border-radius:10px;font-size:14px;font-weight:600;font-family:var(--font-sans);cursor:pointer;">✕</button>
                  </div>
                </div>`;
              } else {
                const savedKeys2 = Object.keys(ST.trainLoggedSets).filter(k =>
                  k.startsWith(`${cd.sessionId}_${cd.exName}_`) && k.endsWith(`_${todayKey()}`)
                );
                const savedN2 = savedKeys2.length;
                return `<div class="rest-row-cards">
                  <div class="rest-card">
                    <span class="rest-card-eyebrow" ${savedN2 > 0 ? 'style="color:var(--acc);"' : ''}>${savedN2 > 0 ? `Serie ${savedN2} salvata ✓` : 'APPENA FATTA'}</span>
                    ${lastSetHTML}
                  </div>
                  <div class="rest-card rest-card--next">
                    <span class="rest-card-eyebrow">PROSSIMA</span>
                    ${nextHTML}
                  </div>
                </div>`;
              }
            })()}

            <div class="rest-coach-card">
              <div class="rest-coach-card-eyebrow">🤖 Coach</div>
              ${cueLoading
                ? `<div class="rest-coach-card-loading">Genero un cue avanzato per te…</div>`
                : `<div class="rest-coach-card-content">${String(cueContent || '').replace(/\n/g, '<br>')}</div>`
              }
            </div>

            ${(setupText || execShort.length || errShort.length || ex?.alert) ? `<div class="rest-quick-recap">
              ${setupText ? `<div class="rest-quick-section">
                <div class="rest-quick-eyebrow">Setup</div>
                <div class="rest-quick-text">${setupText}</div>
              </div>` : ''}
              ${execShort.length ? `<div class="rest-quick-section">
                <div class="rest-quick-eyebrow">Esecuzione</div>
                <ul class="rest-quick-text" style="padding-left:18px;margin:0;">${execShort.map(s=>`<li>${s}</li>`).join('')}</ul>
              </div>` : ''}
              ${errShort.length ? `<div class="rest-quick-section">
                <div class="rest-quick-eyebrow">Errori da evitare</div>
                <ul class="rest-quick-text" style="padding-left:18px;margin:0;">${errShort.map(s=>`<li>${s}</li>`).join('')}</ul>
              </div>` : ''}
              ${ex?.alert ? `<div class="modal-alert" style="margin-top:8px;margin-bottom:0;">${ex.alert}</div>` : ''}
              <button class="rest-quick-link" onclick="openExerciseAI('${cd.exName.replace(/'/g,"\\'")}','${cd.sessionId}')">Scheda completa ›</button>
            </div>` : `<div class="rest-quick-recap">
              <button class="rest-quick-link" onclick="openExerciseAI('${cd.exName.replace(/'/g,"\\'")}','${cd.sessionId}')">Scheda completa ›</button>
            </div>`}
          </div>
        </div>
      </div>`;
    }
  }

  // ── BLOCCO 2B (26 mag 2026) — Schermata ESECUZIONE serie ────────────
  // Si apre al tap "+S{n}" (al posto di aprire subito il logger). Mostra:
  // - eyebrow "SERIE n/tot · IN CORSO" con dot evergreen
  // - nome esercizio grande + badge reps + RIR
  // - GIF esecuzione grande (cached_url Worker, stessa pipeline del recupero)
  // - "Fine serie" (chiude exec → openLogModal) e "Indietro" (chiude senza nulla)
  let execHTML = '';
  if(ST.trainExecOpen){
    const ex2 = ST.trainExecOpen;
    const exDef = findExercise(ex2.exName, ex2.sessionId);
    const sessDef = getTrainingSession(ex2.sessionId) || {};
    const tot = exDef?.sets || '?';
    // Badge: reps + RIR (riusa la convenzione della card sessione)
    const repsBadge = exDef?.reps ? `<span class="train-exec-badge">${esc(exDef.reps)}</span>` : '';
    const rirVal = sessDef.rir;
    // RIR nascosto per esercizi temporali (iso:true con reps in secondi) — coerente con renderTraining
    const parsedReps = exDef?.reps ? (typeof parseRepsRange === 'function' ? parseRepsRange(exDef.reps) : null) : null;
    const isTimed = parsedReps && parsedReps.kind === 'seconds';
    const rirBadge = (rirVal != null && !isTimed) ? `<span class="train-exec-badge">RIR ${rirVal}</span>` : '';
    // GIF: stessa logica del recupero (cached_url Worker animata); codice come chiave se disponibile
    const cacheKey2 = ex2.codice || ex2.exName;
    const gifEntry2 = ST.exerciseGifCache[cacheKey2];
    const hasGif2 = gifEntry2 && gifEntry2.status === 'cached' && gifEntry2.url;
    const gifLoading2 = gifEntry2 && gifEntry2.status === 'loading';
    const gifBlock = hasGif2
      ? `<img src="${gifEntry2.url}" alt="Esecuzione ${esc(ex2.exName)}" class="train-exec-gif">`
      : `<div class="train-exec-gif-placeholder">${gifLoading2 ? 'Caricamento esecuzione…' : 'Anteprima non disponibile'}</div>`;
    execHTML = `<div class="train-exec-overlay">
      <div class="train-exec-container">
        <div class="train-exec-header">
          <div class="train-exec-eyebrow">
            <span class="train-exec-eyebrow-dot"></span>
            <span>SERIE ${ex2.setNum} / ${tot} · IN CORSO</span>
          </div>
          <button class="train-exec-back" onclick="trainExecBack()" aria-label="Indietro">‹ Indietro</button>
        </div>
        <div class="train-exec-body">
          <div class="train-exec-ex-name">${esc(ex2.exName)}</div>
          ${(repsBadge || rirBadge) ? `<div class="train-exec-badges">${repsBadge}${rirBadge}</div>` : ''}
          ${gifBlock}
          ${isTimed ? (ex2.timedReady ? `
            <div style="text-align:center;margin-top:18px;">
              ${ex2.perLato ? `<div style="font-size:11px;font-weight:700;font-family:var(--font-mono);letter-spacing:.1em;margin-bottom:8px;color:${ex2.isoPhase==='pause'?'#D97706':ex2.isoPhase==='B'?'var(--acc)':'var(--t2)'};">${ex2.isoPhase==='pause'?'CAMBIO POSIZIONE':ex2.isoPhase==='B'?'LATO DX':'LATO SX'}</div>` : ''}
              <div id="exec-hold-timer" style="font-size:54px;font-weight:800;font-family:var(--font-mono);color:${ex2.perLato&&ex2.isoPhase==='pause'?'#D97706':'var(--t1)'};line-height:1;font-variant-numeric:tabular-nums;">${String(Math.floor((ex2.timedTarget||0)/60)).padStart(2,'0')}:${String((ex2.timedTarget||0)%60).padStart(2,'0')}</div>
              <div id="exec-hold-sub" style="font-size:12px;color:var(--t3);font-family:var(--font-mono);margin-top:6px;">${ex2.perLato&&ex2.isoPhase==='pause'?'preparati per il lato dx':`obiettivo ${ex2.timedTarget} sec`}</div>
            </div>` : `
            <div style="margin-top:20px;padding:0 8px;">
              ${(()=>{const sugg2=getProgressionLive(ex2.exName,ex2.sessionId); return sugg2?`<div style="font-size:12px;color:var(--acc);font-family:var(--font-mono);text-align:center;margin-bottom:12px;padding:8px 12px;background:var(--s1);border-radius:8px;">${esc(sugg2)}</div>`:''})()}
              <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-align:center;margin-bottom:8px;letter-spacing:.06em;">DURATA TARGET (sec)</div>
              <div style="overflow-x:auto;display:flex;gap:6px;padding:4px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none;" id="exec-timed-picker">
                ${(()=>{
                  const lo = Math.max(10, (parsedReps.min||20) - 5);
                  const hi = (parsedReps.max||parsedReps.min||20) + 15;
                  let pills = '';
                  for(let v=lo; v<=hi; v+=5){
                    const sel = v === (ex2.timedTarget||(parsedReps.min||20));
                    pills += `<button onclick="execTimerSetTarget(${v});renderTraining();" style="flex:0 0 auto;min-width:52px;padding:10px 0;border-radius:10px;border:${sel?'2px solid var(--acc)':'1.5px solid var(--s2)'};background:${sel?'var(--acc)':'var(--s1)'};color:${sel?'#fff':'var(--t1)'};font-family:var(--font-mono);font-size:15px;font-weight:700;cursor:pointer;">${v}</button>`;
                  }
                  return pills;
                })()}
              </div>
            </div>`) : ''}
        </div>
        <div class="train-exec-footer">
          ${isTimed && !ex2.timedReady
            ? `<button class="train-exec-finish-btn" onclick="execTimerLaunch()" style="background:var(--acc);">▶ Avvia</button>`
            : (ex2.perLato && ex2.timedReady && ex2.isoPhase !== 'B')
              ? `<button class="train-exec-finish-btn" style="background:var(--s2);color:var(--t3);cursor:default;" disabled>In corso…</button>`
              : `<button class="train-exec-finish-btn" onclick="trainExecFinishSet()">Fine serie</button>`
          }
        </div>
      </div>
    </div>`;
  }

  // Modal Dettaglio Giorno (apertura da calendario o chart)
  let dayDetailHTML = '';
  if(ST.trainDayDetail){
    const dd = ST.trainDayDetail;
    const w = (ST.trainWorkouts || []).find(x => x.date === dd.date);
    const sessName = w ? (getTrainingSession(w.session_type)?.name || w.session_type) : '';
    const headerStr = formatDayHeader(dd.date) + (sessName ? ' · ' + sessName : '');
    let dayBody = '';
    if(ST.trainDayLogs === null){
      dayBody = `<div style="padding:32px 16px;text-align:center;color:var(--t3);font-size:13px;font-family:var(--font-mono);">Caricamento…</div>`;
    } else if(ST.trainDayLogs.length === 0){
      dayBody = `<div style="padding:32px 16px;text-align:center;color:var(--t3);font-size:13px;font-family:var(--font-sans);">Nessuna serie registrata${dd.exName?' per questo esercizio':''} in questo giorno.</div>`;
    } else {
      // Raggruppa per esercizio
      const byEx = ST.trainDayLogs.reduce((acc,l)=>{
        (acc[l.exercise_name]=acc[l.exercise_name]||[]).push(l); return acc;
      }, {});
      const editId = ST.trainEditLogRow?.id || null;
      const editD = ST.trainEditLogRow;
      dayBody = Object.keys(byEx).map(exName => {
        const logs = byEx[exName];
        const isTimed = isTimedExerciseByName(exName);
        const repsLbl = isTimed ? 'sec' : 'r';
        const isPullUpEx = isPullUpExercise(exName);
        const rows = logs.map(l => {
          if(l.id === editId){
            // Edit inline — BLOCCO 3: trazioni → select colore al posto di input lbs
            const resistInput = isPullUpEx
              ? `<select id="elr-resist" onchange="if(ST.trainEditLogRow)ST.trainEditLogRow.resistance=this.value;" style="padding:4px 6px;border:1.5px solid var(--s2);border-radius:6px;font-size:12px;font-family:var(--font-sans);">
                  <option value="">—</option>${BAND_COLORS.map(c=>`<option value="${c}" ${editD.resistance===c?'selected':''}>${c}</option>`).join('')}
                </select>`
              : `<input id="elr-resist" type="number" min="0" max="999" value="${editD.resistance}" oninput="if(ST.trainEditLogRow)ST.trainEditLogRow.resistance=this.value;" style="width:60px;padding:4px 6px;border:1.5px solid var(--s2);border-radius:6px;font-size:12px;font-family:var(--font-mono);text-align:center;" placeholder="lbs">`;
            return `<div style="display:flex;align-items:center;gap:6px;padding:8px 0;border-bottom:1px solid var(--s2);flex-wrap:wrap;">
              <span style="font-size:11px;font-weight:700;color:var(--acc);font-family:var(--font-mono);min-width:22px;">S${l.set_number}</span>
              <input id="elr-reps" type="number" min="0" max="120" value="${editD.reps}" oninput="if(ST.trainEditLogRow)ST.trainEditLogRow.reps=this.value;" style="width:54px;padding:4px 6px;border:1.5px solid var(--acc);border-radius:6px;font-size:12px;font-family:var(--font-mono);text-align:center;" placeholder="${isTimed?'sec':'reps'}">
              ${resistInput}
              <input id="elr-rir" type="number" min="0" max="5" value="${editD.rir}" oninput="if(ST.trainEditLogRow)ST.trainEditLogRow.rir=this.value;" style="width:46px;padding:4px 6px;border:1.5px solid var(--s2);border-radius:6px;font-size:12px;font-family:var(--font-mono);text-align:center;" placeholder="RIR">
              <button onclick="confirmEditLogRow();" style="background:var(--acc);color:#fff;border:none;border-radius:6px;width:26px;height:26px;line-height:1;cursor:pointer;font-size:13px;font-weight:700;margin-left:auto;">✓</button>
              <button onclick="cancelEditLogRow();" style="background:#fff;color:var(--t3);border:1.5px solid var(--s2);border-radius:6px;width:26px;height:26px;line-height:1;cursor:pointer;font-size:13px;">✕</button>
            </div>`;
          }
          // BLOCCO 3 — Trazioni: mostra colore banda al posto di "X lbs"
          const resistLabel = isPullUpEx
            ? (l.band_color ? bandLabel(l.band_color) : '')
            : (l.resistance ? l.resistance + ' lbs' : '');
          const lblShort = `S${l.set_number} ${l.reps}${repsLbl}${resistLabel?' · '+resistLabel:''}`;
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--s2);">
            <span style="font-size:11px;font-weight:700;color:var(--acc);font-family:var(--font-mono);min-width:22px;">S${l.set_number}</span>
            <span style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-mono);">${l.reps} ${repsLbl}</span>
            ${resistLabel?`<span style="font-size:12px;color:var(--t2);font-family:var(${isPullUpEx?'--font-sans':'--font-mono'});">${resistLabel}</span>`:''}
            ${l.rir_actual!=null?`<span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);">RIR ${l.rir_actual}</span>`:''}
            <button onclick="editLogRow('${l.id}');" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:14px;padding:2px 4px;" title="Modifica">✏️</button>
            <button onclick="confirmDeleteSet('${l.id}','${lblShort.replace(/'/g,"\\'")}');" style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px 4px;" title="Elimina serie">🗑️</button>
          </div>`;
        }).join('');
        return `<div style="margin-bottom:18px;">
          <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:2px;">${exName}</div>
          ${rows}
        </div>`;
      }).join('');
    }
    // Bottone "Elimina intero workout" solo se workout esiste in calendario
    const deleteWorkoutBtn = w ? `
      <button onclick="confirmDeleteWorkoutFromDetail();" style="width:100%;margin-top:12px;padding:10px;background:#fff;color:#B84C2A;border:1.5px solid #B84C2A;border-radius:8px;font-size:12px;font-weight:700;font-family:var(--font-mono);cursor:pointer;text-transform:uppercase;letter-spacing:.06em;">🗑️ Elimina intero workout</button>` : '';
    dayDetailHTML = `<div class="info-modal-overlay" style="z-index:1100;" onclick="closeDayDetail()">
      <div class="info-modal" style="max-width:480px;width:calc(100% - 24px);max-height:88vh;overflow-y:auto;padding:18px 18px 16px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:8px;">
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--t1);font-family:var(--font-sans);">${headerStr}</div>
            ${dd.exName?`<div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:2px;text-transform:uppercase;letter-spacing:.04em;">Filtro: ${dd.exName}</div>`:''}
          </div>
          <button onclick="closeDayDetail()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--t3);line-height:1;flex-shrink:0;">✕</button>
        </div>
        ${dayBody}
        ${deleteWorkoutBtn}
      </div>
    </div>`;
  }

  // Mini-modal conferma elimina serie (sopra day-detail, z-index più alto)
  let deleteSetConfirmHTML = '';
  if(ST.trainDeleteSetConfirm){
    const c = ST.trainDeleteSetConfirm;
    deleteSetConfirmHTML = `<div class="info-modal-overlay" style="z-index:1200;" onclick="ST.trainDeleteSetConfirm=null;renderTraining()">
      <div class="info-modal" style="max-width:300px;text-align:center;" onclick="event.stopPropagation()">
        <div style="font-size:15px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:8px;">Elimina serie</div>
        <div style="font-size:13px;color:var(--t2);font-family:var(--font-mono);margin-bottom:18px;">${c.label}</div>
        <div style="display:flex;gap:8px;">
          <button onclick="ST.trainDeleteSetConfirm=null;renderTraining();" style="flex:1;padding:10px;background:var(--s2);color:var(--t2);border:none;border-radius:8px;font-size:13px;font-weight:600;font-family:var(--font-sans);cursor:pointer;">Annulla</button>
          <button onclick="deleteSetConfirmed();" style="flex:1;padding:10px;background:#B84C2A;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Elimina</button>
        </div>
      </div>
    </div>`;
  }

  // Mini-modal conferma elimina workout intero (sopra day-detail, z-index più alto)
  let deleteWorkoutConfirmHTML = '';
  if(ST.trainDeleteWorkoutConfirm){
    const dc = ST.trainDeleteWorkoutConfirm;
    deleteWorkoutConfirmHTML = `<div class="info-modal-overlay" style="z-index:1200;" onclick="ST.trainDeleteWorkoutConfirm=null;renderTraining()">
      <div class="info-modal" style="max-width:300px;text-align:center;" onclick="event.stopPropagation()">
        <div style="font-size:15px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:8px;">Elimina workout</div>
        <div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);margin-bottom:18px;">Eliminare l'intero workout del ${fmtDate(dc.date)}? Tutte le serie verranno cancellate.</div>
        <div style="display:flex;gap:8px;">
          <button onclick="ST.trainDeleteWorkoutConfirm=null;renderTraining();" style="flex:1;padding:10px;background:var(--s2);color:var(--t2);border:none;border-radius:8px;font-size:13px;font-weight:600;font-family:var(--font-sans);cursor:pointer;">Annulla</button>
          <button onclick="deleteWorkoutConfirmed();" style="flex:1;padding:10px;background:#B84C2A;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Elimina</button>
        </div>
      </div>
    </div>`;
  }

  // Overlay Tabata Flow (full-screen quando attivo) — clone leggero dello stile recovery
  let tabataHTML = '';
  if(ST.trainTabataFlow && ST.trainTabataFlow.active){
    const f = ST.trainTabataFlow;
    const ex = _tabataFlowCurrentExercise();
    const phaseColor = f.phase === 'work' ? '#B84C2A' : '#2A7A6F';
    const phaseLabel = f.phase === 'work' ? 'LAVORO' : 'RECUPERO';
    const phaseBg    = f.phase === 'work' ? 'linear-gradient(135deg,#FFE4D5 0%,#FFCAB0 100%)' : 'linear-gradient(135deg,#E0F2EE 0%,#B5DFD5 100%)';
    const numColor   = f.remaining <= 3 ? '#B84C2A' : phaseColor;
    tabataHTML = `
      <div style="position:fixed;inset:0;z-index:1050;background:${phaseBg};display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px;padding-top:max(48px, env(safe-area-inset-top));overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;max-width:480px;margin-bottom:8px;">
          <div style="font-size:11px;font-weight:700;color:${phaseColor};font-family:var(--font-mono);letter-spacing:.18em;">TABATA · ROUND ${f.round}/${f.totalRounds}</div>
          <button onclick="tabataFlowEnd()" style="background:transparent;border:none;color:${phaseColor};font-size:11px;font-family:var(--font-mono);letter-spacing:.06em;cursor:pointer;text-decoration:underline;">termina</button>
        </div>
        <div style="font-size:13px;font-weight:700;color:${phaseColor};font-family:var(--font-mono);letter-spacing:.2em;margin-bottom:12px;">${phaseLabel}</div>
        <div style="font-size:96px;font-weight:800;color:${numColor};font-family:var(--font-mono);font-variant-numeric:tabular-nums;line-height:1;margin-bottom:16px;">${f.remaining}</div>
        ${ex ? `
          <div style="font-size:24px;font-weight:700;color:#3A1A0A;font-family:var(--font-sans);text-align:center;margin-bottom:6px;max-width:480px;">${nomeCortoConTag(ex.name)}</div>
          ${ex.alert ? (() => {
            const short = String(ex.alert).split(/[·;.]/)[0].trim();
            return `<div style="font-size:15px;font-weight:600;color:#5A2A0A;text-align:center;max-width:420px;margin-bottom:16px;line-height:1.3;">${short}</div>`;
          })() : ''}
        ` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;width:100%;max-width:420px;margin-top:24px;">
          ${f.running
            ? `<button onclick="tabataFlowPause()" style="flex:1;min-width:100px;padding:14px;background:#fff;color:${phaseColor};border:2px solid ${phaseColor};border-radius:10px;font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">⏸ Pausa</button>`
            : `<button onclick="tabataFlowResume()" style="flex:1;min-width:100px;padding:14px;background:${phaseColor};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">▶ Riprendi</button>`}
          <button onclick="tabataFlowSkip()" style="flex:1;min-width:100px;padding:14px;background:#fff;color:${phaseColor};border:2px solid ${phaseColor};border-radius:10px;font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">⏭ Skip</button>
        </div>
        ${(() => {
          const nx = _tabataFlowNextExercise();
          if(!nx) return `<div style="font-size:13px;font-weight:700;color:${phaseColor};font-family:var(--font-mono);letter-spacing:.08em;margin-top:20px;text-align:center;">ULTIMO ROUND</div>`;
          return `
            <div style="margin-top:20px;text-align:center;max-width:420px;width:100%;">
              <div style="font-size:10px;font-weight:700;color:${phaseColor};font-family:var(--font-mono);letter-spacing:.16em;margin-bottom:4px;">PROSSIMO</div>
              <div style="font-size:18px;font-weight:700;color:#3A1A0A;font-family:var(--font-sans);line-height:1.2;">${nomeCortoConTag(nx.name)}</div>
            </div>`;
        })()}
        <div style="font-size:11px;color:#5A2A0A;font-family:var(--font-mono);letter-spacing:.04em;margin-top:20px;opacity:.7;text-align:center;max-width:420px;">
          ${f.finisher.work_sec}s lavoro / ${f.finisher.rest_sec}s recupero × ${f.totalRounds} round · 4 esercizi alternati
        </div>
      </div>`;
  }

  // ── Scheda "come si esegue" del warm-up (FASE A) — modal content-only ──
  // Riusa le classi del modal scheda esercizio (info-modal-overlay/info-modal/modal-section/
  // modal-list). NIENTE AI Coach, NIENTE media: mostra solo i campi presenti nell'item.
  let warmupInfoHTML = '';
  if(ST.warmupInfoOpen){
    const w = ST.warmupInfoOpen;
    const setupList = (Array.isArray(w.setup) && w.setup.length)
      ? `<div class="modal-section"><h4>Setup</h4><ul class="modal-list">${w.setup.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
    const execList = (Array.isArray(w.execution) && w.execution.length)
      ? `<div class="modal-section"><h4>Esecuzione</h4><ol class="modal-list">${w.execution.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>` : '';
    const errList = (Array.isArray(w.commonErrors) && w.commonErrors.length)
      ? `<div class="modal-section"><h4>Errori comuni da evitare</h4><ul class="modal-list">${w.commonErrors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
    const muscList = (Array.isArray(w.muscles) && w.muscles.length)
      ? `<div class="modal-section"><h4>Muscoli coinvolti</h4><div style="font-size:13px;line-height:1.5;color:var(--t2);font-family:var(--font-sans);">${w.muscles.map(esc).join(' · ')}</div></div>` : '';
    const anySection = setupList || execList || errList || muscList;
    warmupInfoHTML = `<div class="info-modal-overlay" style="z-index:1100;" onclick="closeWarmupInfo()">
      <div class="info-modal" style="max-width:560px;max-height:88vh;overflow-y:auto;padding:20px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:8px;">
          <div>
            <strong style="font-size:17px;display:block;line-height:1.25;">${esc(w.name)}</strong>
            <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:2px;text-transform:uppercase;letter-spacing:.04em;">Riscaldamento${w.eq ? ' · ' + esc(w.eq) : ''}</div>
          </div>
          <button onclick="closeWarmupInfo()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--t3);line-height:1;flex-shrink:0;">✕</button>
        </div>
        ${setupList}${execList}${errList}${muscList}
        ${anySection ? '' : `<div style="font-size:13px;color:var(--t3);font-family:var(--font-sans);">Nessun dettaglio disponibile per questo esercizio.</div>`}
      </div>
    </div>`;
  }

  document.getElementById('page-training').innerHTML = navHTML + body + versionFooter() + modalHTML + countdownHTML + execHTML + dayDetailHTML + deleteSetConfirmHTML + deleteWorkoutConfirmHTML + tabataHTML + warmupInfoHTML;
}

// openExerciseAI — apre modal scheda esercizio con sezioni structured + AI Coach
// Firma: (exName, sessionId). I dati statici (setup, execution, commonErrors, muscles, alert)
// vengono letti da TRAINING_SESSIONS; il testo AI è un cue avanzato aggiuntivo.
async function openExerciseAI(exName, sessionId) {
  const sess = getTrainingSession(sessionId);
  const ex = findExercise(exName, sessionId);
  const media = EXERCISE_MEDIA[exName] || {};
  // Priorità: ex.muscleImg (esplicito su esercizi recovery G3/G6, può essere null intenzionale)
  // Fallback: EXERCISE_MEDIA[exName].muscleImg (esercizi training Upper/Lower legacy senza campo)
  const muscleImgResolved = (ex && Object.prototype.hasOwnProperty.call(ex, 'muscleImg'))
    ? ex.muscleImg  // può essere stringa path OPPURE null esplicito (no fallback)
    : (media.muscleImg || null);
  // Stato base (loading): mostra subito tutti i campi statici, AI + media in caricamento
  const baseAi = {
    exName,
    sessionId,
    sessionLabel: sess?.label || sess?.name || '',
    sessionType: sess?.type || '',
    sessionRir: sess?.rir,
    sessionRest: sess?.rest || null,
    sets: ex?.sets,
    reps: ex?.reps,
    eq: ex?.eq || '',
    setup: ex?.setup || '',
    execution: ex?.execution || [],
    commonErrors: ex?.commonErrors || [],
    muscles: ex?.muscles || [],
    alert: ex?.alert || null,
    muscleImg: muscleImgResolved,
    executionImg: media.executionImg || null,  // fallback Wger PNG
    // ── GIF esecuzione da Worker (fetch parallelo) ──
    executionGif: null,
    executionLoading: true,
    executionStatus: null,        // 'cached' | 'missing' | 'error' | 'not_searched_yet'
    executionSurrogate: false,
    executionSurrogateNote: null,
    content: '',
    loading: true,
  };
  // Surrogato: ex.isSurrogato è impostato da _trainGenBuildExercise quando
  // l'esercizio palestra è sostituito dalla variante casalinga (es. bilanciere →
  // elastico). Il setup è già sovrascritto con nota_surrogato in fase di build;
  // qui propaghiamo i flag al modal per mostrare il banner "Versione adattata".
  if (ex?.isSurrogato) {
    baseAi.isSurrogato = true;
    baseAi.surrogatoEq = ex.eq || '';
  }
  ST.exerciseAIOpen = baseAi;
  renderTraining();

  // ── Fetch media in parallelo: la GIF arriva indipendentemente dall'AI ──
  // Passa il codice EX (se presente) così il Worker risolve via ?code= (biblioteca_gif).
  fetchExerciseMedia(exName, ex?.codice || null).then(mediaResp => {
    // user ha chiuso modal o ha aperto un altro esercizio nel frattempo
    if (!ST.exerciseAIOpen || ST.exerciseAIOpen.exName !== exName) return;
    ST.exerciseAIOpen = {
      ...ST.exerciseAIOpen,
      executionGif: mediaResp.cached_url || null,
      executionLoading: false,
      executionStatus: mediaResp.status || 'error',
      executionSurrogate: !!mediaResp.is_surrogate,
      executionSurrogateNote: mediaResp.surrogate_note || null,
    };
    renderTraining();
  });

  const cacheKey = `${sessionId}_${exName}`;

  // Fast-path: cue gia in cache (es. da rest modal precedente o riapertura)
  if (ST.aiCue[cacheKey]) {
    if (!ST.exerciseAIOpen || ST.exerciseAIOpen.exName !== exName) return;
    ST.exerciseAIOpen = { ...ST.exerciseAIOpen, content: ST.aiCue[cacheKey], loading: false };
    renderTraining();
    return;
  }

  const eqSessione = ST.exerciseAIOpen?.eq || '';
  const prompt = buildCoachPrompt(exName, sessionId, eqSessione);

  try {
    const text = await callAI(prompt, 200);
    if (!ST.exerciseAIOpen || ST.exerciseAIOpen.exName !== exName) return;
    const content = (text || '').trim()
      .replace(/^["'`]|["'`]$/g, '')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    ST.aiCue[cacheKey] = content;  // cache per riuso (rest modal, riapertura)
    ST.exerciseAIOpen = { ...ST.exerciseAIOpen, content, loading: false };
  } catch(e) {
    if (!ST.exerciseAIOpen || ST.exerciseAIOpen.exName !== exName) return;
    ST.exerciseAIOpen = { ...ST.exerciseAIOpen, content: cueErrMsg(e.aiKind), loading: false };
  }
  renderTraining();
}

const ACTIVATION_INTERVALS = [null, null, null];

// ── Audio context condiviso (sblocco iOS) ─────────────────
let _audioCtx = null;
function _ensureAudioCtx(){
  if(_audioCtx) return _audioCtx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return null;
    _audioCtx = new Ctx();
  } catch(e){ _audioCtx = null; }
  return _audioCtx;
}
function _unlockAudio(){
  const ctx = _ensureAudioCtx();
  if(!ctx) return Promise.resolve(false);
  const wasBlocked = ST.audioBlocked;
  if(ctx.state === 'suspended'){
    return ctx.resume().then(()=>{
      const blocked = ctx.state !== 'running';
      ST.audioBlocked = blocked;
      if(wasBlocked !== blocked && ST.page==='training') renderTraining();
      return !blocked;
    }).catch(()=>{
      ST.audioBlocked = true;
      if(!wasBlocked && ST.page==='training') renderTraining();
      return false;
    });
  }
  if(wasBlocked){ ST.audioBlocked = false; if(ST.page==='training') renderTraining(); }
  return Promise.resolve(true);
}
function dismissAudioBanner(){ _unlockAudio(); }

// ── WakeLock — schermo sempre acceso durante sessione ─────
let _wakeLock = null;
async function requestWakeLock(){
  try {
    if('wakeLock' in navigator){
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', ()=>{ _wakeLock = null; });
    }
  } catch(e){}
}
async function releaseWakeLock(){
  try {
    if(_wakeLock){ await _wakeLock.release(); _wakeLock = null; }
  } catch(e){}
}
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'visible' && ST.trainSession && _wakeLock === null){
    requestWakeLock();
  }
  // Resume AudioContext quando torna in foreground (iOS lo sospende in background)
  if(document.visibilityState === 'visible' && _audioCtx){
    _unlockAudio();
  }
  // Countdown recupero: forza tick al rientro per ricalcolare remaining e beepare se scaduto in background
  if(document.visibilityState === 'visible' && ST.trainCountdown){
    tickCountdown();
  }
  // Flow timestamp-based (attivazione/recupero/tabata/warm-up/exec timer): forza un tick
  // al rientro per ricalcolare da endTime e recuperare in silenzio le fasi saltate in background
  if(document.visibilityState === 'visible'){
    try{
      if(ST.trainActivationFlow && ST.trainActivationFlow.running) _activationFlowTick();
      if(ST.trainRecoveryFlow && ST.trainRecoveryFlow.running) _recoveryFlowTick();
      if(ST.trainTabataFlow && ST.trainTabataFlow.running) _tabataFlowTick();
      if(ST.trainWarmupFlow && ST.trainWarmupFlow.running) _warmupFlowTick();
      if(ST.trainExecTimer && ST.trainExecTimer.running && ST.trainExecTimer._iv) _execTimerTick();
    }catch(e){}
  }
  // WS-QUEUE: al rientro in foreground prova a smaltire le scritture workout_sets pendenti
  if(document.visibilityState === 'visible'){
    try{ _wsFlushQueue(); }catch(e){}
  }
  // GRAFICA L1 — Cronometro TEMPO WORKOUT: al rientro foreground risincronizza il display
  // (iOS sospende setInterval in background; execStartedAt è in localStorage quindi il
  // calcolo da Date.now() resta corretto). Ri-arma il tick se siamo in esecuzione.
  if(document.visibilityState === 'visible' && ST.trainSession){
    const wt = ST.trainWorkTime[ST.trainSession];
    if(wt){
      _workTimeUpdateDisplay(ST.trainSession);
      if(wt.execStartedAt && !_trainWorkTickInterval){
        workTimeStartTick(ST.trainSession);
      }
    }
  }
});

// Sblocco audio one-shot al primo gesto utente (iOS richiede gesture per AudioContext)
let _audioGestureUnlocked = false;
function _onFirstGesture(){
  if(_audioGestureUnlocked) return;
  _audioGestureUnlocked = true;
  _unlockAudio();
  document.removeEventListener('touchstart', _onFirstGesture, true);
  document.removeEventListener('touchend', _onFirstGesture, true);
  document.removeEventListener('mousedown', _onFirstGesture, true);
  document.removeEventListener('keydown', _onFirstGesture, true);
}
document.addEventListener('touchstart', _onFirstGesture, true);
document.addEventListener('touchend', _onFirstGesture, true);
document.addEventListener('mousedown', _onFirstGesture, true);
document.addEventListener('keydown', _onFirstGesture, true);

// ESC chiude dropdown selezione esercizio (tab Progressione)
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && ST.trainProgDropdownOpen){
    closeProgDropdown();
  }
});

// ── Helpers apertura/chiusura sessione Training ────────────
// Passo 3 — un giorno è ATTIVO (loggabile oggi) se ha serie loggate oggi, è stato completato oggi,
// è stato anticipato in questa sessione app, o è il "today" debito-aware (Passo 4).
function isActiveDay(sid){
  if(!sid) return false;
  const tk = todayKey();
  if(Object.keys(ST.trainLoggedSets || {}).some(k => k.startsWith(sid+'_') && k.endsWith('_'+tk))) return true;
  if((ST.sessionLastCompletion || {})[sid] === tk) return true;
  if(sid === ST.trainAnticipato) return true;
  // Passo 4 — "today" debito-aware: target = debito più vecchio se presente, altrimenti rotazione (nextSession).
  // I giorni in debito (DA RECUPERARE) sono loggabili direttamente; un futuro neutro resta in anteprima.
  const { debt, target } = computeTrainingDebt();
  if(sid === target) return true;          // ≡ sid===nextSession quando non c'è debito (nessuna regressione)
  if(debt.includes(sid)) return true;
  return false;
}

// Passo 3 — sblocca il giorno in anteprima: lo rende attivo/loggabile (anticipo in memoria, no DB).
function allenaQuestoOggi(sid){
  ST.trainAnticipato = sid;
  if(ST.trainSession === sid){ renderTraining(); }
  else { openTrainingSession(sid); }
}

function openTrainingSession(sid){
  ST.trainSession = sid;
  _hydrateActivation(sid); // ripristina flag fatto + collasso del Blocco Attivazione (per sessione+giorno)
  ST.lastLoggedSets = {}; // reset cache mentre carica (suggestion mostra "prima volta")
  maybeProposeSoftReturn(sid); // rientro soft: avviso non bloccante se pausa ≥10 giorni
  _unlockAudio();
  requestWakeLock();
  renderTraining();
  // Hydrate cross-device prima di calcolare suggerimento "ultima volta"
  hydrateTrainingSetsFromCloud();
  loadLastLoggedSets(sid); // popola cache + ricarica render quando pronto
  // BLOCCO 4 — pre-fetch note di oggi per gli esercizi della sessione
  loadTodayNotes(sid);
  // GRAFICA L1 — Se la sessione di oggi ha una serie in esecuzione persistita
  // (PWA chiusa durante una serie e riaperta dopo), riarma il tick live.
  const wt = ST.trainWorkTime[sid];
  if(wt && wt.execStartedAt){
    workTimeStartTick(sid);
  }
}
function closeTrainingSession(){
  // Fondamenta 140: una versione nuova arrivata durante l'allenamento si segnala adesso, a sessione chiusa
  if(typeof mostraAggiornamento === 'function') setTimeout(mostraAggiornamento, 0);
  // GRAFICA L1 — Se uscita con serie in esecuzione: scarta il delta (come trainExecBack)
  // e ferma il tick. Il totalSec accumulato dalle serie completate resta in localStorage
  // e ricompare se l'utente riapre la stessa sessione oggi.
  if(ST.trainExecOpen && ST.trainExecOpen.sessionId){
    workTimeStopExec(ST.trainExecOpen.sessionId, false);
  }
  execTimerStop(); // ferma il cronometro di tenuta (no interval orfano)
  workTimeStopTick();
  ST.trainSession = null;
  ST.trainAnticipato = null; // Passo 3: l'anticipo dura finché la sessione è aperta; dopo il primo log il giorno resta attivo via "serie oggi"
  ST.trainActivation = [false,false,false];
  ST.trainActivationCollapsed = false; // reset in memoria; lo stato salvato in localStorage sopravvive (ri-idratato alla riapertura)
  ST.trainLogOpen = null;
  ST.editLogKey = null;
  ST.editLogDraft = null;
  // BLOCCO 4 — reset stato editor nota (le note salvate restano in cache, ok)
  ST.trainNoteEditing = null;
  ST.trainNoteDraft = '';
  ST.trainNoteHistoryOpen = {};
  resetAllActivationTimers();
  ST.trainRecoveryDone = {};
  ST.trainRecoveryCollapsed = {};
  // Stop recovery flow countdown ibrido se attivo
  if(ST.trainRecoveryFlow && ST.trainRecoveryFlow._iv){
    clearInterval(ST.trainRecoveryFlow._iv);
  }
  ST.trainRecoveryFlow = {
    active:false, currentIdx:0, remaining:0, running:false, _iv:null,
    microPause: { active:false, remaining:0, total:0, nextExName:'' },
    blockStop:  { active:false, nextBlockName:'', nextExStartIdx:0 }
  };
  // Stop activation flow countdown ibrido se attivo
  if(ST.trainActivationFlow && ST.trainActivationFlow._iv){
    clearInterval(ST.trainActivationFlow._iv);
  }
  ST.trainActivationFlow = { active:false, currentIdx:0, remaining:0, running:false, _iv:null };
  // Stop warm-up flow (FASE A) se attivo (no timer orfano in background)
  if(ST.trainWarmupFlow && ST.trainWarmupFlow._iv){
    clearInterval(ST.trainWarmupFlow._iv);
  }
  ST.trainWarmupFlow = null;
  ST.trainWarmupCollapsed = false; // reset collasso in memoria
  ST.warmupInfoOpen = null;        // chiudi scheda warm-up se aperta
  // Stop countdown recupero se attivo (no timer orfano in background)
  if(ST._countdownInterval){ clearInterval(ST._countdownInterval); ST._countdownInterval = null; }
  ST.trainCountdown = null;
  // BLOCCO 2B: chiusura schermata esecuzione se aperta (cleanup per uscita session)
  ST.trainExecOpen = null;
  releaseWakeLock();
  renderTraining();
}

// ── BLOCCO 2B (26 mag 2026) — Schermata ESECUZIONE ────────────
// Nuovo flusso: utente tap "+S{n}" → openTrainExec (schermata esecuzione con
// GIF grande) → tap "Fine serie" → openLogModal (logger esistente invariato)
// → "Logga serie" → saveTrainingSet → recupero (BLOCCO 2A).
// Tap "Indietro" dall'esecuzione: torna alla sessione senza loggare nulla.

// Apre la schermata di esecuzione per la prossima serie.
// Pre-fetch GIF (riusa ensureRestGif esistente) + unlock audio (per coerenza).
// ── Cronometro di tenuta (esercizi isometrici a tempo) ──
// Conta IN AVANTI da 0 sulla schermata esecuzione. Beep+vibrazione una volta
// al raggiungimento del minimo target. Display aggiornato via #exec-hold-timer
// senza re-render (così il tick non si azzera).
// ── Helpers timer timestamp-based (condivisi da exec timer e flow) ──
// remaining intero (sec) da un endTime in ms — mai negativo, stesso calcolo di tickCountdown
function _tsRemaining(endTime){
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}
// Base del prossimo endTime di fase: concatena dall'endTime precedente se la fase è
// scaduta naturalmente (catena senza drift, anche al rientro da background); da adesso
// se si avanza in anticipo (skip/back → la fase non era ancora scaduta).
function _tsNextBase(endTime){
  return (endTime && endTime <= Date.now()) ? endTime : Date.now();
}

function _execTimerClear(){
  if(ST.trainExecTimer && ST.trainExecTimer._iv){
    clearInterval(ST.trainExecTimer._iv);
    ST.trainExecTimer._iv = null;
  }
}
// Aggiorna il display #exec-hold-timer senza re-render (il tick non azzera la GIF)
function _execTimerDisplay(t, done){
  const el = document.getElementById('exec-hold-timer');
  if(!el) return;
  if(t.isPause){
    el.textContent = `00:0${t.remaining}`;
    return;
  }
  const m = String(Math.floor(t.remaining/60)).padStart(2,'0');
  const s = String(t.remaining%60).padStart(2,'0');
  el.textContent = `${m}:${s}`;
  if(done){
    el.style.color = '#16A34A';
    const sub = document.getElementById('exec-hold-sub');
    if(sub){ sub.textContent = '✓ Fatto!'; sub.style.color = '#16A34A'; sub.style.fontWeight = '700'; }
  } else {
    el.style.color = '';
  }
}
// Tick unico (250ms) per countdown principale e pausa cambio lato: remaining
// ricalcolato da endTime, display aggiornato solo al cambio del secondo intero.
function _execTimerTick(){
  const t = ST.trainExecTimer;
  if(!t || !t.running) return;
  const remaining = _tsRemaining(t.endTime);
  const secondChanged = remaining !== t.remaining;
  if(secondChanged) t.remaining = remaining;
  // ── Fase pausa cambio lato (5s, silenzio totale, poi LONG su lato B) ──
  if(t.isPause){
    if(secondChanged) _execTimerDisplay(t, false);
    if(remaining <= 0){
      _execTimerClear();
      if(ST.trainExecOpen){
        ST.trainExecOpen.isoPhase = 'B';
        renderTraining(); // aggiorna UI: mantiene "In corso…" per fase B
        // Catena senza drift: il lato B parte dalla fine della pausa. Se al rientro
        // da background il lato B risulta già finito, LONG stantio → non emetterlo
        // (anti-raffica): resta solo lo STOP finale idempotente.
        const baseMs = _tsNextBase(t.endTime);
        const staleB = (baseMs + (ST.trainExecOpen.timedTarget || 0) * 1000) <= Date.now();
        if(!staleB){ try{ playLongBeep(); }catch(e){} }
        execTimerStart(ST.trainExecOpen.timedTarget, baseMs);
      }
    }
    return;
  }
  // ── Countdown principale (targetSec → 0) ──
  const done = remaining <= 0;
  // Beep una sola volta quando si arriva a 0 (idempotente anche al rientro da background)
  if(done && !t.beeped){
    t.beeped = true;
    // Anti-raffica: se al rientro anche pausa e lato B risultano già trascorsi,
    // lo STOP di fine lato A è stantio → lo emetterà solo il lato B.
    const chainStale = ST.trainExecOpen && ST.trainExecOpen.perLato && ST.trainExecOpen.isoPhase === 'A'
      && (t.endTime + 5000 + (ST.trainExecOpen.timedTarget || 0) * 1000) <= Date.now();
    if(!chainStale){ try{ playStopBeep(); }catch(e){} }
  }
  // Doppio timer per esercizi perLato
  if(done && ST.trainExecOpen && ST.trainExecOpen.perLato){
    if(ST.trainExecOpen.isoPhase === 'A'){
      ST.trainExecOpen.isoPhase = 'pause';
      const baseMs = _tsNextBase(t.endTime);
      _execTimerClear();
      execTimerStartPause(5, baseMs);
      return;
    }
    // fase B: cade through, timer finito, logger aprirà normalmente
  }
  if(secondChanged || (done && !t._doneShown)) _execTimerDisplay(t, done);
  if(done) t._doneShown = true;
}
function execTimerStart(targetSec, _baseMs){
  _execTimerClear();
  // Countdown da targetSec → 0. A 0: ✓ verde + beep triplo.
  // Timestamp-based: endTime è la sorgente di verità (come tickCountdown).
  // _baseMs opzionale: concatena la fase alla precedente (doppio lato) senza drift.
  const start = (targetSec && targetSec > 0) ? targetSec : 0;
  const endTime = (_baseMs || Date.now()) + start * 1000;
  ST.trainExecTimer = { running:true, remaining:start, endTime, _iv:null, beeped:false };
  try{ _unlockAudio && _unlockAudio(); }catch(e){}
  ST.trainExecTimer._iv = setInterval(_execTimerTick, 250);
}
function execTimerStop(){
  _execTimerClear();
  if(ST.trainExecTimer) ST.trainExecTimer.running = false;
}

function execTimerStartPause(sec, _baseMs){
  _execTimerClear();
  const endTime = (_baseMs || Date.now()) + sec * 1000;
  ST.trainExecTimer = { running:true, remaining:sec, endTime, _iv:null, beeped:false, isPause:true };
  renderTraining(); // aggiorna UI: nasconde "Fine serie", mostra "In corso…" durante pausa
  ST.trainExecTimer._iv = setInterval(_execTimerTick, 250);
}

function openTrainExec(sessionId, exName, setNum){
  const _exDef = findExercise(exName, sessionId);
  const _pr = (_exDef && _exDef.reps && typeof parseRepsRange === 'function') ? parseRepsRange(_exDef.reps) : null;
  const _isTimed = _pr && _pr.kind === 'seconds';
  // Per isometrici: picker target, valore iniziale = repsMin (default 20 se non specificato).
  const _timedTarget = _isTimed ? (_pr.min || 20) : null;
  ST.trainExecOpen = { sessionId, exName, codice: _exDef?.codice || null, setNum, isTimed: _isTimed, timedTarget: _timedTarget, timedReady: false, perLato: !!(_pr && _pr.perLato), isoPhase: 'A' };
  _unlockAudio();
  ensureRestGif(exName, _exDef?.codice || null);
  // GRAFICA L1 — Avvia cronometro TEMPO WORKOUT per questa serie
  workTimeStartExec(sessionId);
  workTimeStartTick(sessionId);
  renderTraining();
  // Cronometro di tenuta avviato solo su esercizi NON isometrici (per isometrici parte da execTimerLaunch)
  if(!_isTimed && _pr){
    execTimerStart(_pr.min || 0);
  }
}

// Chiamato dal pulsante "▶ Avvia" nella schermata isometrica picker.
function execTimerLaunch(){
  const e = ST.trainExecOpen;
  if(!e || !e.isTimed) return;
  e.timedReady = true;
  try{ playLongBeep(); }catch(e){}
  renderTraining();
  execTimerStart(e.timedTarget);
}

// Aggiorna il target scelto nel picker isometrico (chiamato dall'input range).
function execTimerSetTarget(val){
  if(ST.trainExecOpen) ST.trainExecOpen.timedTarget = parseInt(val) || ST.trainExecOpen.timedTarget;
}

// "Fine serie" sulla schermata esecuzione → chiude exec e apre il logger
// (openLogModal esistente). Riusa il pattern già rodato: nessun cambio al
// logger né a saveTrainingSet. Il logger appare al posto dell'esecuzione.
function trainExecFinishSet(){
  execTimerStop(); // ferma il cronometro di tenuta (se attivo)
  const e = ST.trainExecOpen;
  if(!e) return;
  // GRAFICA L1 — Ferma cronometro e ACCUMULA il delta (serie completata)
  workTimeStopExec(e.sessionId, true);
  workTimeStopTick();
  const timedTarget = e.isTimed ? (e.timedTarget || null) : null;
  // Avvia countdown SOLO se c'è una serie successiva
  const _exDef = findExercise(e.exName, e.sessionId);
  const _doneCount = Object.keys(ST.trainLoggedSets)
    .filter(k => k.startsWith(`${e.sessionId}_${e.exName}_`) && k.endsWith(`_${todayKey()}`))
    .length;
  const _nextSet = _doneCount + 1; // la serie che stiamo per loggare
  const _hasNextAfter = !!(_exDef && _exDef.sets && (_nextSet + 1) <= _exDef.sets);
  if(_hasNextAfter){
    try{ _unlockAudio(); }catch(e2){}
    try{ playLongBeep(); }catch(e2){}
    const _restEx = findExercise(e.exName, e.sessionId);
    const _restSec = getRestSec(e.sessionId, _restEx);
    startTrainingCountdown(_restSec, e.exName, e.sessionId);
  }
  ST.trainExecOpen = null;
  openLogModal(e.sessionId, e.exName, e.setNum, { timedTarget });
}

// "Indietro" → chiude l'esecuzione senza loggare niente, senza aprire il
// logger. Nessun dato toccato. Caso: ho premuto +S per sbaglio.
function trainExecBack(){
  execTimerStop(); // ferma il cronometro di tenuta (se attivo)
  const e = ST.trainExecOpen;
  // GRAFICA L1 — Ferma cronometro SCARTANDO il delta (serie annullata)
  if(e) workTimeStopExec(e.sessionId, false);
  workTimeStopTick();
  ST.trainExecOpen = null;
  renderTraining();
}

// ── Apertura modal log serie ───────────────────────────────
function openLogModal(sessionId, exName, setNum, opts){
  const today = todayKey();
  const prevKeys = Object.keys(ST.trainLoggedSets)
    .filter(k=>k.startsWith(`${sessionId}_${exName}_`)&&k.endsWith(`_${today}`))
    .sort();
  const lastKey = prevKeys.pop();
  const lastResist = lastKey ? ST.trainLoggedSets[lastKey]?.resistance : null;
  if(isPullUpExercise(exName)){
    // BLOCCO 3 — Trazioni: il "carico" è il COLORE della banda di assistenza.
    // L'ultimo colore loggato vive in resistance (testuale) o in band_color esplicito.
    const lastBand = lastKey ? (ST.trainLoggedSets[lastKey]?.band_color || ST.trainLoggedSets[lastKey]?.resistance) : null;
    ST.trainLogBandColor = (lastBand && BAND_COLORS.includes(lastBand)) ? lastBand : null;
    ST.trainLogResist = null;
  } else {
    // Default = ultimo valore loggato per questo esercizio oggi.
    // Se prima volta o valore fuori RESIST_VALUES → null (placeholder "—").
    let initial = parseInt(lastResist);
    if(isNaN(initial) || !RESIST_VALUES.includes(initial)) initial = null;
    ST.trainLogResist = initial;
    ST.trainLogBandColor = null;
  }
  ST.trainLogOpen = { sessionId, exName, setNum };
  _unlockAudio();
  renderTraining();
  setTimeout(()=>{
    // Pre-selezione reps per esercizi isometrici (valore scelto nel picker)
    const timedTarget = opts && opts.timedTarget;
    if(timedTarget){
      const sel = document.getElementById('tl-reps');
      if(sel) sel.value = String(timedTarget);
    }
    document.getElementById('tl-reps')?.focus();
  }, 50);
}

// ── Edit serie già loggata ────────────────────────────────
function editLog(k){
  const d = ST.trainLoggedSets[k];
  if(!d) return;
  ST.editLogKey = k;
  ST.editLogDraft = { reps: d.reps||'', resistance: d.resistance||'' };
  renderTraining();
  setTimeout(()=>document.getElementById('el-reps')?.focus(), 50);
}
function cancelEditLog(){
  ST.editLogKey = null;
  ST.editLogDraft = null;
  renderTraining();
}
async function confirmEditLog(k){
  const repsEl = document.getElementById('el-reps');
  const resistEl = document.getElementById('el-resist');
  const reps = parseInt(repsEl?.value) || 0;
  const resistance = (resistEl?.value || '').toString().trim();
  if(!reps){ repsEl?.focus(); return; }
  const prev = ST.trainLoggedSets[k] || {};
  // [sessionId, exName, setNum, date]
  const parts = k.split('_');
  const date = parts[parts.length-1];
  const setNum = parseInt(parts[parts.length-2]);
  const sessionId = parts[0];
  const exName = parts.slice(1, parts.length-2).join('_');
  // BLOCCO 3 — Trazioni: resistance contiene il colore banda. DB: resistance NULL + band_color.
  const isPullUp = isPullUpExercise(exName);
  const bandColor = isPullUp ? (BAND_COLORS.includes(resistance) ? resistance : null) : null;
  if(isPullUp && !bandColor){ showToast('Scegli il livello di assistenza','⚠️'); return; }
  ST.trainLoggedSets[k] = { ...prev, reps, resistance, band_color: bandColor };
  try { localStorage.setItem('zt_train_sets_'+todayKey(), JSON.stringify(ST.trainLoggedSets)); } catch(e){}
  if(ST.user && ST.user.id !== 'test-user-001'){
    const resistInt = isPullUp ? null : (resistance ? (parseInt(resistance) || null) : null);
    // 1. UPDATE workout_sets (sorgente di verità per la nuova UI) — by id se disponibile,
    //    altrimenti composite — via wsWrite: retry + coda, nessun fallimento silenzioso
    const setId = prev.setId;
    await wsWrite('update', {
      fields: { reps, resistance: resistInt, band_color: bandColor },
      match: setId
        ? { id: setId, user_id: ST.user.id }
        : { user_id: ST.user.id, date, session_type: sessionId,
            exercise_name: exName, set_number: setNum },
    }, _wsKey(date, sessionId, exName, setNum),
    'Modifica salvata, sincronizzazione in coda');
    // 2. UPDATE training_logs (compat — usata da Progressione e altri viewer)
    // Il catch vuoto qui sopra ingoiava tutto, errori di rete compresi: era il
    // punto piu' cieco dei tre. workout_sets viene aggiornato dal passo 1 con
    // retry e coda, quindi un fallimento silenzioso qui lascia i due archivi
    // disallineati e la Progressione — che legge da training_logs — mostra il
    // valore vecchio senza che niente lo dica.
    await dbq('aggiornare la serie', supa.from('training_logs').update({
      reps,
      resistance: isPullUp ? null : (resistance||null),
      band_color: bandColor,
    })
      .eq('user_id', ST.user.id)
      .eq('date', date)
      .eq('session_id', sessionId)
      .eq('exercise_name', exName)
      .eq('set_number', setNum));
  }
  ST.editLogKey = null;
  ST.editLogDraft = null;
  renderTraining();
}

// ── Activation FLOW (countdown ibrido blocco attivazione 5 min, auto-advance) ──
function _activationFlowClearInterval(){
  if(ST.trainActivationFlow && ST.trainActivationFlow._iv){
    clearInterval(ST.trainActivationFlow._iv);
    ST.trainActivationFlow._iv = null;
  }
}
function _activationFlowAdvance(){
  const f = ST.trainActivationFlow;
  const base = _tsNextBase(f.endTime);
  const cur = ACTIVATION_BLOCK[f.currentIdx];
  if(cur){
    if(!Array.isArray(ST.trainActivation)) ST.trainActivation = [false,false,false];
    ST.trainActivation[f.currentIdx] = true;
    if(!f._silent){
      try{ navigator.vibrate && navigator.vibrate([200,100,200]); }catch(e){}
      try{ playStopBeep(); }catch(e){}
    }
    _activationAutoCollapse();
  }
  f.currentIdx++;
  if(f.currentIdx >= ACTIVATION_BLOCK.length){
    // Fine attivazione
    _activationFlowClearInterval();
    f.active = false;
    f.running = false;
    f.remaining = 0;
    checkActivationSessionDone();
    _activationAutoCollapse();
    if(!f._noRender) renderTraining();
    return;
  }
  const next = ACTIVATION_BLOCK[f.currentIdx];
  f.remaining = next.seconds || 60;
  f.endTime = base + f.remaining * 1000; // catena senza drift dalla fase precedente
  f.prepBeeped = {};
  if(!f._silent && !f._silentLong){ try{ playLongBeep(); }catch(e){} }
  if(!f._noRender) renderTraining();
}
function _activationFlowTick(){
  const f = ST.trainActivationFlow;
  if(!f.running) return;
  const remaining = _tsRemaining(f.endTime);
  if(remaining === f.remaining) return; // render solo al cambio del secondo intero
  if(!f.prepBeeped) f.prepBeeped = {};
  // Anti-raffica al rientro da background: marca i prep saltati senza emetterli
  if(remaining < f.remaining - 1){
    for(let s = Math.min(5, f.remaining - 1); s > remaining; s--) f.prepBeeped[s] = true;
  }
  f.remaining = remaining;
  // Prep beep idempotente: 1 tic alla transizione in 5,4,3,2,1
  if(remaining >= 1 && remaining <= 5 && !f.prepBeeped[remaining]){
    f.prepBeeped[remaining] = true;
    try{ playPrepBeep(); }catch(e){}
  }
  if(remaining > 0){ renderTraining(); return; }
  // Fase scaduta: avanza. Se in background sono scadute anche fasi successive,
  // avanzale in silenzio (niente raffica di beep), poi un solo render.
  // late = confine di fase superato da >1.5s (rientro da background): il LONG "GO"
  // è stantio e non va emesso; lo STOP del rientro resta (idempotente, come tickCountdown).
  const late = (Date.now() - f.endTime) > 1500;
  let guard = 0, silent = false;
  do {
    f._silent = silent; f._silentLong = late || silent; f._noRender = true;
    _activationFlowAdvance();
    silent = true; guard++;
  } while(f.active && f.running && _tsRemaining(f.endTime) <= 0 && guard < 30);
  f._silent = false; f._silentLong = false; f._noRender = false;
  if(f.active && f.running) f.remaining = _tsRemaining(f.endTime);
  renderTraining();
}
function activationFlowStart(){
  // Mutual exclusion: non avviare se recovery / warm-up flow è running
  if(ST.trainRecoveryFlow && ST.trainRecoveryFlow.running) return;
  if(ST.trainWarmupFlow && ST.trainWarmupFlow.running) return;
  if(!ACTIVATION_BLOCK.length) return;
  try{ _unlockAudio && _unlockAudio(); }catch(e){}
  try{ playLongBeep(); }catch(e){}
  _activationFlowClearInterval();
  ST.trainActivationFlow.active = true;
  ST.trainActivationFlow.currentIdx = 0;
  ST.trainActivationFlow.remaining = ACTIVATION_BLOCK[0].seconds || 60;
  ST.trainActivationFlow.endTime = Date.now() + ST.trainActivationFlow.remaining * 1000;
  ST.trainActivationFlow.prepBeeped = {};
  ST.trainActivationFlow.running = true;
  ST.trainActivationFlow._iv = setInterval(_activationFlowTick, 250);
  renderTraining();
}
function activationFlowPause(){
  if(!ST.trainActivationFlow.running) return;
  // Congela il residuo esatto: alla ripresa endTime = Date.now() + remaining*1000
  ST.trainActivationFlow.remaining = _tsRemaining(ST.trainActivationFlow.endTime);
  ST.trainActivationFlow.running = false;
  _activationFlowClearInterval();
  renderTraining();
}
function activationFlowResume(){
  if(ST.trainActivationFlow.running) return;
  if(!ST.trainActivationFlow.active) return;
  // Mutual exclusion: non riprendere se recovery / warm-up flow è running
  if(ST.trainRecoveryFlow && ST.trainRecoveryFlow.running) return;
  if(ST.trainWarmupFlow && ST.trainWarmupFlow.running) return;
  try{ _unlockAudio && _unlockAudio(); }catch(e){}
  ST.trainActivationFlow.endTime = Date.now() + (ST.trainActivationFlow.remaining || 0) * 1000;
  ST.trainActivationFlow.running = true;
  ST.trainActivationFlow._iv = setInterval(_activationFlowTick, 250);
  renderTraining();
}
function activationFlowSkip(){
  if(!ST.trainActivationFlow.active) return;
  _activationFlowAdvance();
}
function activationFlowBack(){
  if(!ST.trainActivationFlow.active) return;
  if(ST.trainActivationFlow.currentIdx <= 0){
    if(ACTIVATION_BLOCK[0]) ST.trainActivationFlow.remaining = ACTIVATION_BLOCK[0].seconds || 60;
    ST.trainActivationFlow.endTime = Date.now() + ST.trainActivationFlow.remaining * 1000;
    ST.trainActivationFlow.prepBeeped = {};
    renderTraining();
    return;
  }
  ST.trainActivationFlow.currentIdx--;
  const prev = ACTIVATION_BLOCK[ST.trainActivationFlow.currentIdx];
  ST.trainActivationFlow.remaining = prev.seconds || 60;
  ST.trainActivationFlow.endTime = Date.now() + ST.trainActivationFlow.remaining * 1000;
  ST.trainActivationFlow.prepBeeped = {};
  renderTraining();
}
function activationFlowEnd(){
  _activationFlowClearInterval();
  ST.trainActivationFlow.active = false;
  ST.trainActivationFlow.running = false;
  ST.trainActivationFlow.currentIdx = 0;
  ST.trainActivationFlow.remaining = 0;
  renderTraining();
}
function checkActivationSessionDone(){
  if(!Array.isArray(ST.trainActivation)) return;
  const allDone = ST.trainActivation.every(v => v === true);
  if(allDone){
    showToast('Attivazione completata', '✓');
  }
}

// ── Persistenza + collasso Blocco Attivazione ──
// Stato (flag fatto + collasso) salvato per sessione+giorno in localStorage,
// stesso schema di zt_train_work_<data>: { [sessionId]: { done:[bool], collapsed:bool } }.
// Sopravvive a reload/background PWA; ri-idratato all'apertura sessione.
function _persistActivation(){
  try{
    const sid = ST.trainSession; if(!sid) return;
    const key = 'zt_train_activation_' + todayKey();
    let all = {}; try { all = JSON.parse(localStorage.getItem(key) || '{}'); } catch(e){}
    all[sid] = {
      done: Array.isArray(ST.trainActivation) ? ST.trainActivation : [false,false,false],
      collapsed: !!ST.trainActivationCollapsed
    };
    localStorage.setItem(key, JSON.stringify(all));
  }catch(e){}
}
function _hydrateActivation(sid){
  try{
    const all = JSON.parse(localStorage.getItem('zt_train_activation_' + todayKey()) || '{}');
    const rec = all[sid];
    if(rec && Array.isArray(rec.done)){
      ST.trainActivation = rec.done.slice(0, ACTIVATION_BLOCK.length);
      ST.trainActivationCollapsed = !!rec.collapsed;
    } else {
      ST.trainActivation = ACTIVATION_BLOCK.map(()=>false);
      ST.trainActivationCollapsed = false;
    }
  }catch(e){
    ST.trainActivation = ACTIVATION_BLOCK.map(()=>false);
    ST.trainActivationCollapsed = false;
  }
}
function _activationAutoCollapse(){
  // Se tutti completati → collassa. Poi salva sempre.
  if(Array.isArray(ST.trainActivation) && ST.trainActivation.length &&
     ST.trainActivation.every(v => v === true)){
    ST.trainActivationCollapsed = true;
  }
  _persistActivation();
}
function toggleActivationCollapsed(){
  ST.trainActivationCollapsed = !ST.trainActivationCollapsed;
  _persistActivation();
  renderTraining();
}

// ── Recovery FLOW (countdown ibrido G3/G6, auto-advance) ──
function _recoveryFlowClearInterval(){
  if(ST.trainRecoveryFlow && ST.trainRecoveryFlow._iv){
    clearInterval(ST.trainRecoveryFlow._iv);
    ST.trainRecoveryFlow._iv = null;
  }
}
function _stripSide(name){
  return String(name||'').replace(/\s+(dx|sx)\s*$/i, '').trim();
}
function _allExercisesDoneInBlock(blockName, exs){
  if(!ST.trainRecoveryDone) return false;
  const inBlock = exs.filter(e => (e.block||'Altri') === blockName);
  if(!inBlock.length) return false;
  return inBlock.every(e => !!ST.trainRecoveryDone[e.name]);
}
function _recoveryFlowAdvance(){
  // Marca corrente come done. Poi decide: fine sessione / stop blocco / micro-pausa / esercizio successivo.
  const sess = getTrainingSession(ST.trainSession);
  if(!sess) return;
  const flow = ST.trainRecoveryFlow;
  const base = _tsNextBase(flow.endTime);
  const cur = sess.exercises[flow.currentIdx];
  if(cur){
    if(!ST.trainRecoveryDone) ST.trainRecoveryDone = {};
    ST.trainRecoveryDone[cur.name] = true;
    if(!flow._silent){
      try{ navigator.vibrate && navigator.vibrate([200,100,200]); }catch(e){}
      try{ playStopBeep(); }catch(e){}
    }
  }

  // 1) Auto-collapse blocco se completato (delay 2s per permettere all'utente di vedere il check finale)
  const curBlockName = cur && (cur.block || 'Altri');
  if(curBlockName && _allExercisesDoneInBlock(curBlockName, sess.exercises)){
    setTimeout(()=>{
      if(!ST.trainRecoveryCollapsed) ST.trainRecoveryCollapsed = {};
      // Collassa solo se l'utente non ha già toccato manualmente lo stato (resta chiuso)
      if(ST.trainRecoveryCollapsed[curBlockName] !== false){
        ST.trainRecoveryCollapsed[curBlockName] = true;
        renderTraining();
      }
    }, 2000);
  }

  const nextIdx = flow.currentIdx + 1;

  // 2) Fine sessione
  if(nextIdx >= sess.exercises.length){
    _recoveryFlowClearInterval();
    flow.active = false;
    flow.running = false;
    flow.remaining = 0;
    flow.currentIdx = nextIdx;
    flow.microPause = { active:false, remaining:0, total:0, nextExName:'' };
    flow.blockStop  = { active:false, nextBlockName:'', nextExStartIdx:0 };
    checkRecoverySessionDone();
    if(!flow._noRender) renderTraining();
    return;
  }

  const next = sess.exercises[nextIdx];
  const nextBlock = next.block || 'Altri';

  // 3) Blocco diverso → stop automatico (anteprima prossimo blocco)
  if(nextBlock !== curBlockName){
    _recoveryFlowClearInterval();
    flow.currentIdx = nextIdx;
    flow.remaining = next.duration_sec || 30;
    flow.prepBeeped = {};
    flow.running = false;
    flow.microPause = { active:false, remaining:0, total:0, nextExName:'' };
    flow.blockStop  = { active:true, nextBlockName:nextBlock, nextExStartIdx:nextIdx };
    if(!flow._noRender) renderTraining();
    return;
  }

  // 4) Stesso blocco → micro-pausa 5s (stesso esercizio, cambio lato) o 10s (esercizio diverso)
  const sameBase = _stripSide(cur && cur.name) === _stripSide(next.name);
  const pauseSec = sameBase ? 5 : 10;
  flow.currentIdx = nextIdx;
  flow.remaining = next.duration_sec || 30;
  // endTime dell'esercizio impostato alla FINE della micro-pausa (catena da mp.endTime)
  flow.microPause = { active:true, remaining:pauseSec, total:pauseSec, nextExName: next.name, endTime: base + pauseSec * 1000 };
  // running resta true → l'interval continua a ticchettare ma sulla micro-pausa
  if(!flow._noRender) renderTraining();
}
function _recoveryFlowTick(){
  const flow = ST.trainRecoveryFlow;
  if(!flow.running) return;
  // Branch A — micro-pausa attiva (muta): countdown da endTime, poi parte esercizio
  if(flow.microPause && flow.microPause.active){
    const mp = flow.microPause;
    const mpRem = _tsRemaining(mp.endTime);
    if(mpRem > 0){
      if(mpRem !== mp.remaining){ mp.remaining = mpRem; renderTraining(); }
      return;
    }
    mp.remaining = 0;
    mp.active = false;
    mp.nextExName = '';
    // LONG stantio: se la fine pausa è passata da >1.5s (rientro da background), niente GO
    const mpLate = (Date.now() - mp.endTime) > 1500;
    // Catena senza drift: l'esercizio parte dalla fine della micro-pausa
    flow.endTime = mp.endTime + flow.remaining * 1000;
    flow.prepBeeped = {};
    if(_tsRemaining(flow.endTime) > 0){
      if(!mpLate){
        try{ navigator.vibrate && navigator.vibrate([100]); }catch(e){}
        try{ playLongBeep(); }catch(e){}
      }
      renderTraining();
      return;
    }
    // Rientro da background oltre la fine dell'esercizio: LONG stantio → niente
    // beep, prosegui subito col catch-up del Branch B qui sotto.
  }
  // Branch B — countdown esercizio normale
  const remaining = _tsRemaining(flow.endTime);
  if(remaining === flow.remaining) return; // render solo al cambio del secondo intero
  if(!flow.prepBeeped) flow.prepBeeped = {};
  // Anti-raffica al rientro da background: marca i prep saltati senza emetterli
  if(remaining < flow.remaining - 1){
    for(let s = Math.min(5, flow.remaining - 1); s > remaining; s--) flow.prepBeeped[s] = true;
  }
  flow.remaining = remaining;
  // Prep beep idempotente: 1 tic alla transizione in 5,4,3,2,1
  if(remaining >= 1 && remaining <= 5 && !flow.prepBeeped[remaining]){
    flow.prepBeeped[remaining] = true;
    try{ playPrepBeep(); }catch(e){}
  }
  if(remaining > 0){ renderTraining(); return; }
  // Fase scaduta: avanza. Fasi intere saltate in background → avanzamento silenzioso
  // (niente raffica di beep), poi un solo render.
  let guard = 0, silent = false;
  do {
    flow._silent = silent; flow._noRender = true;
    _recoveryFlowAdvance();
    silent = true; guard++;
    // advance può aprire una micro-pausa: se è già scaduta (background), chiudila
    // in silenzio e concatena l'endTime dell'esercizio; se è in corso reale, stop qui.
    if(flow.microPause && flow.microPause.active){
      if(_tsRemaining(flow.microPause.endTime) > 0) break;
      flow.microPause.active = false;
      flow.microPause.remaining = 0;
      flow.microPause.nextExName = '';
      flow.endTime = flow.microPause.endTime + flow.remaining * 1000;
      flow.prepBeeped = {};
    }
  } while(flow.active && flow.running && _tsRemaining(flow.endTime) <= 0 && guard < 100);
  flow._silent = false; flow._noRender = false;
  if(flow.active && flow.running && !(flow.microPause && flow.microPause.active)){
    flow.remaining = _tsRemaining(flow.endTime);
  }
  renderTraining();
}
function recoveryFlowStart(){
  // Mutual exclusion: non avviare se activation / warm-up flow è running
  if(ST.trainActivationFlow && ST.trainActivationFlow.running) return;
  if(ST.trainWarmupFlow && ST.trainWarmupFlow.running) return;
  const sess = getTrainingSession(ST.trainSession);
  if(!sess || sess.type !== 'Recupero' || !sess.exercises.length) return;
  try{ _unlockAudio && _unlockAudio(); }catch(e){}
  try{ playLongBeep(); }catch(e){}
  _recoveryFlowClearInterval();
  // Reset stato collapsed (nuova sessione = tutti i blocchi espansi)
  ST.trainRecoveryCollapsed = {};
  ST.trainRecoveryFlow.active = true;
  ST.trainRecoveryFlow.currentIdx = 0;
  ST.trainRecoveryFlow.remaining = sess.exercises[0].duration_sec || 30;
  ST.trainRecoveryFlow.endTime = Date.now() + ST.trainRecoveryFlow.remaining * 1000;
  ST.trainRecoveryFlow.prepBeeped = {};
  ST.trainRecoveryFlow.running = true;
  ST.trainRecoveryFlow.microPause = { active:false, remaining:0, total:0, nextExName:'' };
  ST.trainRecoveryFlow.blockStop  = { active:false, nextBlockName:'', nextExStartIdx:0 };
  ST.trainRecoveryFlow._iv = setInterval(_recoveryFlowTick, 250);
  renderTraining();
}
function recoveryFlowPause(){
  // Non interrompibile durante micro-pausa
  if(ST.trainRecoveryFlow.microPause && ST.trainRecoveryFlow.microPause.active) return;
  if(!ST.trainRecoveryFlow.running) return;
  // Congela il residuo esatto: alla ripresa endTime = Date.now() + remaining*1000
  ST.trainRecoveryFlow.remaining = _tsRemaining(ST.trainRecoveryFlow.endTime);
  ST.trainRecoveryFlow.running = false;
  _recoveryFlowClearInterval();
  renderTraining();
}
function recoveryFlowResume(){
  const flow = ST.trainRecoveryFlow;
  if(flow.running) return;
  if(!flow.active) return;
  // Mutual exclusion: non riprendere se activation / warm-up flow è running
  if(ST.trainActivationFlow && ST.trainActivationFlow.running) return;
  if(ST.trainWarmupFlow && ST.trainWarmupFlow.running) return;
  try{ _unlockAudio && _unlockAudio(); }catch(e){}
  // Branch blockStop: riparte dal primo esercizio del nuovo blocco (currentIdx già avanzato in _recoveryFlowAdvance)
  if(flow.blockStop && flow.blockStop.active){
    const sess = getTrainingSession(ST.trainSession);
    const cur = sess && sess.exercises[flow.currentIdx];
    if(cur) flow.remaining = cur.duration_sec || 30;
    flow.prepBeeped = {};
    flow.blockStop = { active:false, nextBlockName:'', nextExStartIdx:0 };
  }
  flow.endTime = Date.now() + (flow.remaining || 0) * 1000;
  flow.running = true;
  flow._iv = setInterval(_recoveryFlowTick, 250);
  renderTraining();
}
function recoveryFlowSkip(){
  // Skip disabilitato durante micro-pausa e durante stop blocco
  if(!ST.trainRecoveryFlow.active) return;
  if(ST.trainRecoveryFlow.microPause && ST.trainRecoveryFlow.microPause.active) return;
  if(ST.trainRecoveryFlow.blockStop && ST.trainRecoveryFlow.blockStop.active) return;
  _recoveryFlowAdvance();
}
function recoveryFlowBack(){
  const flow = ST.trainRecoveryFlow;
  if(!flow.active) return;
  // Disabilitato durante micro-pausa
  if(flow.microPause && flow.microPause.active) return;

  const sess = getTrainingSession(ST.trainSession);
  if(!sess) return;

  // Branch blockStop: torna all'esercizio precedente (ultimo del blocco precedente), NO resume
  if(flow.blockStop && flow.blockStop.active){
    if(flow.currentIdx > 0){
      flow.currentIdx--;
      const prev = sess.exercises[flow.currentIdx];
      flow.remaining = prev.duration_sec || 30;
    }
    flow.prepBeeped = {};
    flow.blockStop = { active:false, nextBlockName:'', nextExStartIdx:0 };
    flow.running = false;
    renderTraining();
    return;
  }

  if(flow.currentIdx <= 0){
    // Già al primo: solo reset countdown
    if(sess.exercises[0]) flow.remaining = sess.exercises[0].duration_sec || 30;
    flow.endTime = Date.now() + flow.remaining * 1000;
    flow.prepBeeped = {};
    renderTraining();
    return;
  }
  flow.currentIdx--;
  const prev = sess.exercises[flow.currentIdx];
  flow.remaining = prev.duration_sec || 30;
  flow.endTime = Date.now() + flow.remaining * 1000;
  flow.prepBeeped = {};
  // NOTA: non un-marca da trainRecoveryDone (volutamente)
  renderTraining();
}
function recoveryFlowEnd(){
  // Chiusura manuale (non marca come completata)
  _recoveryFlowClearInterval();
  ST.trainRecoveryFlow.active = false;
  ST.trainRecoveryFlow.running = false;
  ST.trainRecoveryFlow.currentIdx = 0;
  ST.trainRecoveryFlow.remaining = 0;
  ST.trainRecoveryFlow.microPause = { active:false, remaining:0, total:0, nextExName:'' };
  ST.trainRecoveryFlow.blockStop  = { active:false, nextBlockName:'', nextExStartIdx:0 };
  renderTraining();
}

// ═══════════════════════════════════════════════════════════
// TABATA FLOW (28 mag sera 2026) — cronometro 20/10 × 8 round
// ═══════════════════════════════════════════════════════════
// Modello: 8 round, ogni round = 20s WORK + 10s REST.
// 4 esercizi cardio_metabolico che si alternano: round N → exercises[(N-1) % 4].
// Ergo: ex[0], ex[1], ex[2], ex[3], ex[0], ex[1], ex[2], ex[3] = 2 cicli.
// Ultimo round termina dopo WORK (no REST finale).
// Audio: riusa playPrepBeep (5..1 countdown) + playStopBeep (fine round) + playLongBeep (inizio round work).
// WakeLock: già attivo durante sessione (apertura openTrainingSession).
// Clone leggero di _recoveryFlowTick, no micro-pause/blockStop.

function _tabataFlowClearInterval(){
  if(ST.trainTabataFlow && ST.trainTabataFlow._iv){
    clearInterval(ST.trainTabataFlow._iv);
    ST.trainTabataFlow._iv = null;
  }
}
function _tabataFlowCurrentExercise(){
  const f = ST.trainTabataFlow;
  if(!f || !f.finisher || !Array.isArray(f.finisher.exercises) || f.finisher.exercises.length === 0) return null;
  const idx = ((f.round - 1) % f.finisher.exercises.length + f.finisher.exercises.length) % f.finisher.exercises.length;
  return f.finisher.exercises[idx];
}
function _tabataFlowNextExercise(){
  const f = ST.trainTabataFlow;
  if(!f || !f.finisher || !Array.isArray(f.finisher.exercises) || !f.finisher.exercises.length) return null;
  // Se siamo nell'ultimo round (work) non c'è un prossimo esercizio
  if(f.round >= f.totalRounds) return null;
  const len = f.finisher.exercises.length;
  const nextIdx = (f.round % len + len) % len; // round corrente (1-based) → indice del round+1
  return f.finisher.exercises[nextIdx];
}
function _tabataFlowAdvance(){
  // Chiamato a fine fase (work o rest). Decide cosa fare:
  //   - era work → passa a rest 10s (a meno che era l'ultimo round)
  //   - era rest → incrementa round, passa a work 20s
  //   - finito ultimo round work → END (no rest finale)
  const f = ST.trainTabataFlow;
  if(!f) return;
  const base = _tsNextBase(f.endTime);
  if(!f._silent){ try { playStopBeep(); } catch(e) {} }
  if(f.phase === 'work'){
    // Era work → ultimo round? FINE
    if(f.round >= f.totalRounds){
      _tabataFlowEndCompleted();
      return;
    }
    // Altrimenti → rest 10s
    f.phase = 'rest';
    f.remaining = f.finisher.rest_sec;
    f.endTime = base + f.remaining * 1000; // catena senza drift dalla fase precedente
  } else {
    // Era rest → prossimo round work
    f.round++;
    f.phase = 'work';
    f.remaining = f.finisher.work_sec;
    f.endTime = base + f.remaining * 1000;
    if(!f._silent && !f._silentLong){ try { playLongBeep(); } catch(e) {} }
  }
  f.prepBeeped = {};
  if(!f._noRender) renderTraining();
}
function _tabataFlowTick(){
  const f = ST.trainTabataFlow;
  if(!f || !f.running) return;
  const remaining = _tsRemaining(f.endTime);
  if(remaining === f.remaining) return; // render solo al cambio del secondo intero
  if(!f.prepBeeped) f.prepBeeped = {};
  // Anti-raffica al rientro da background: marca i prep saltati senza emetterli
  if(remaining < f.remaining - 1){
    for(let s = Math.min(5, f.remaining - 1); s > remaining; s--) f.prepBeeped[s] = true;
  }
  f.remaining = remaining;
  // Beep prep idempotente ultimi 5 secondi
  if(remaining >= 1 && remaining <= 5 && !f.prepBeeped[remaining]){
    f.prepBeeped[remaining] = true;
    try { playPrepBeep(); } catch(e) {}
  }
  if(remaining > 0){ renderTraining(); return; }
  // Fase scaduta: avanza. Fasi intere saltate in background → avanzamento silenzioso
  // (niente raffica di beep; LONG stantio soppresso al rientro), poi un solo render.
  const late = (Date.now() - f.endTime) > 1500;
  let guard = 0, silent = false;
  do {
    f._silent = silent; f._silentLong = late || silent; f._noRender = true;
    _tabataFlowAdvance();
    silent = true; guard++;
  } while(ST.trainTabataFlow && f.running && _tsRemaining(f.endTime) <= 0 && guard < 40);
  if(ST.trainTabataFlow){
    f._silent = false; f._silentLong = false; f._noRender = false;
    if(f.running) f.remaining = _tsRemaining(f.endTime);
  }
  renderTraining();
}
function tabataFlowStart(){
  // Avvio: la sessione corrente (ST.trainSession) deve avere un finisher.
  const sess = getTrainingSession(ST.trainSession);
  if(!sess || !sess.finisher || !sess.finisher.exercises || sess.finisher.exercises.length === 0){
    showToast('Nessun finisher Tabata in questa sessione', 'ℹ️');
    return;
  }
  // Mutual exclusion col recovery flow + attivazione flow + warm-up flow
  if(ST.trainRecoveryFlow && ST.trainRecoveryFlow.running) return;
  if(ST.trainActivationFlow && ST.trainActivationFlow.running) return;
  if(ST.trainWarmupFlow && ST.trainWarmupFlow.running) return;
  _tabataFlowClearInterval();
  try { _unlockAudio(); } catch(e) {}
  ST.trainTabataFlow = {
    active: true,
    sessionId: ST.trainSession,
    finisher: sess.finisher,
    totalRounds: sess.finisher.round || 8,
    round: 1,
    phase: 'work',
    remaining: sess.finisher.work_sec || 20,
    endTime: Date.now() + (sess.finisher.work_sec || 20) * 1000,
    prepBeeped: {},
    running: true,
    _iv: setInterval(_tabataFlowTick, 250),
  };
  renderTraining();
}
function tabataFlowPause(){
  const f = ST.trainTabataFlow;
  if(!f || !f.active) return;
  _tabataFlowClearInterval();
  // Congela il residuo esatto: alla ripresa endTime = Date.now() + remaining*1000
  f.remaining = _tsRemaining(f.endTime);
  f.running = false;
  renderTraining();
}
function tabataFlowResume(){
  const f = ST.trainTabataFlow;
  if(!f || !f.active) return;
  // Mutual exclusion: non riprendere se attivazione / recupero / warm-up sono in corso
  if(ST.trainActivationFlow && ST.trainActivationFlow.running) return;
  if(ST.trainRecoveryFlow && ST.trainRecoveryFlow.running) return;
  if(ST.trainWarmupFlow && ST.trainWarmupFlow.running) return;
  try { _unlockAudio(); } catch(e) {}
  f.endTime = Date.now() + (f.remaining || 0) * 1000;
  f.running = true;
  f._iv = setInterval(_tabataFlowTick, 250);
  renderTraining();
}
function tabataFlowSkip(){
  // Skip: salta il resto della fase corrente, passa direttamente alla successiva
  const f = ST.trainTabataFlow;
  if(!f || !f.active) return;
  f.remaining = 0;
  _tabataFlowAdvance();
}
function tabataFlowEnd(){
  // Termina manualmente prima della fine
  _tabataFlowClearInterval();
  ST.trainTabataFlow = null;
  renderTraining();
}
function _tabataFlowEndCompleted(){
  // Fine naturale dopo l'ultimo round work
  _tabataFlowClearInterval();
  try { if(navigator.vibrate) navigator.vibrate([300,100,300,100,500]); } catch(e) {}
  showToast('Tabata completato! 💪', '🔥');
  ST.trainTabataFlow = null;
  renderTraining();
}

// ── WARM-UP specifico (FASE A, 31 mag) ──────────────────────
// Countdown LINEARE su s.warmup[]: ogni voce = 60s WORK + 10s REST (cambio posizione).
// Niente round/microPause/blockStop (più semplice del Tabata): lista lineare.
// Audio: playLongBeep alla (ri)partenza di ogni esercizio + playPrepBeep ultimi 5s.
// L'ultima voce termina dopo il WORK (no rest finale). Clone leggero del Tabata.
const WARMUP_WORK_SEC = 60;
const WARMUP_REST_SEC = 10;
const WARMUP_ISO_SIDE_SEC = 30; // durata per lato negli esercizi iso unilaterali del warm-up
const WARMUP_ISO_PAUSE_SEC = 5; // pausa cambio posizione tra lato SX e lato DX

function _warmupFlowClearInterval(){
  if(ST.trainWarmupFlow && ST.trainWarmupFlow._iv){
    clearInterval(ST.trainWarmupFlow._iv);
    ST.trainWarmupFlow._iv = null;
  }
}
function _warmupFlowCurrentItem(){
  const f = ST.trainWarmupFlow;
  if(!f || !Array.isArray(f.items) || f.idx < 0 || f.idx >= f.items.length) return null;
  return f.items[f.idx];
}
function _warmupFlowNextItem(){
  const f = ST.trainWarmupFlow;
  if(!f || !Array.isArray(f.items)) return null;
  const ni = f.idx + 1;
  if(ni >= f.items.length) return null;
  return f.items[ni];
}
// Inizializza isoPhase per l'item corrente se è perLato.
// Chiamata all'avvio del flow e ad ogni avanzamento idx.
function _warmupFlowInitIsoPhase(){
  const f = ST.trainWarmupFlow;
  if(!f) return;
  const cur = _warmupFlowCurrentItem();
  const pr = (cur && cur.reps && typeof parseRepsRange === 'function') ? parseRepsRange(cur.reps) : null;
  if(pr && pr.kind === 'seconds' && pr.perLato){
    f.isoPhase = 'A';
    f.remaining = WARMUP_ISO_SIDE_SEC;
  } else {
    f.isoPhase = null;
    f.remaining = WARMUP_WORK_SEC;
  }
}

function _warmupFlowAdvance(){
  // Chiamato a fine fase:
  //   - era work → ultima voce? FINE; altrimenti pausa 10s (cambio posizione)
  //   - era rest → prossima voce work + bip lungo (esercizio riparte)
  const f = ST.trainWarmupFlow;
  if(!f) return;
  const base = _tsNextBase(f.endTime);
  if(f.phase === 'work'){
    // Gestione doppio lato per esercizi iso unilaterali
    if(f.isoPhase === 'A'){
      // Fine lato SX → pausa 5s (muta)
      f.isoPhase = 'pause';
      f.remaining = WARMUP_ISO_PAUSE_SEC;
      f.endTime = base + f.remaining * 1000; // catena senza drift
      f.prepBeeped = {};
      if(!f._noRender) renderTraining();
      return;
    }
    if(f.isoPhase === 'pause'){
      // Fine pausa → lato DX
      f.isoPhase = 'B';
      f.remaining = WARMUP_ISO_SIDE_SEC;
      f.endTime = base + f.remaining * 1000;
      f.prepBeeped = {};
      if(!f._silent && !f._silentLong){ try { playLongBeep(); } catch(e){} }
      if(!f._noRender) renderTraining();
      return;
    }
    // isoPhase === 'B' oppure null (esercizio normale) → avanza
    if(f.idx >= f.items.length - 1){
      _warmupFlowEndCompleted();
      return;
    }
    f.phase = 'rest';
    f.remaining = WARMUP_REST_SEC;
    f.endTime = base + f.remaining * 1000;
    f.prepBeeped = {};
  } else {
    f.idx++;
    f.phase = 'work';
    _warmupFlowInitIsoPhase(); // imposta remaining e isoPhase per il nuovo item
    f.endTime = base + f.remaining * 1000;
    f.prepBeeped = {};
    if(!f._silent && !f._silentLong){ try { playLongBeep(); } catch(e){} }
  }
  if(!f._noRender) renderTraining();
}
function _warmupFlowTick(){
  const f = ST.trainWarmupFlow;
  if(!f || !f.running) return;
  const remaining = _tsRemaining(f.endTime);
  if(remaining === f.remaining) return; // render solo al cambio del secondo intero
  if(!f.prepBeeped) f.prepBeeped = {};
  // Prep beep: ultimi 5s durante work/rest; pausa iso = soglia 0 → silenzio
  const _prepThreshold = (f.isoPhase === 'pause') ? 0 : 5;
  // Anti-raffica al rientro da background: marca i prep saltati senza emetterli
  if(remaining < f.remaining - 1){
    for(let s = Math.min(_prepThreshold, f.remaining - 1); s > remaining; s--) f.prepBeeped[s] = true;
  }
  f.remaining = remaining;
  if(remaining >= 1 && remaining <= _prepThreshold && !f.prepBeeped[remaining]){
    f.prepBeeped[remaining] = true;
    try { playPrepBeep(); } catch(e){}
  }
  if(remaining > 0){ renderTraining(); return; }
  // Fase scaduta: avanza. Fasi intere saltate in background → avanzamento silenzioso
  // (lo STOP suona solo per la prima fase; LONG stantio soppresso; niente raffica),
  // poi un solo render.
  const late = (Date.now() - f.endTime) > 1500;
  let guard = 0, silent = false;
  do {
    if(!silent && f.isoPhase !== 'pause'){
      try { playStopBeep(); } catch(e){}
    }
    f._silent = silent; f._silentLong = late || silent; f._noRender = true;
    _warmupFlowAdvance();
    silent = true; guard++;
  } while(ST.trainWarmupFlow && f.running && _tsRemaining(f.endTime) <= 0 && guard < 120);
  if(ST.trainWarmupFlow){
    f._silent = false; f._silentLong = false; f._noRender = false;
    if(f.running) f.remaining = _tsRemaining(f.endTime);
  }
  renderTraining();
}
function warmupFlowStart(){
  const sess = getTrainingSession(ST.trainSession);
  if(!sess || !Array.isArray(sess.warmup) || sess.warmup.length === 0){
    showToast('Nessun riscaldamento specifico in questa sessione', 'ℹ️');
    return;
  }
  // Mutua esclusione: attivazione / recupero / Tabata
  if(ST.trainActivationFlow && ST.trainActivationFlow.running) return;
  if(ST.trainRecoveryFlow && ST.trainRecoveryFlow.running) return;
  if(ST.trainTabataFlow && ST.trainTabataFlow.active) return;
  _warmupFlowClearInterval();
  try { _unlockAudio(); } catch(e){}
  ST.trainWarmupCollapsed = false; // (ri)apri la card se era collassata
  ST.trainWarmupFlow = {
    active: true,
    sessionId: ST.trainSession,
    items: sess.warmup,
    idx: 0,
    phase: 'work',
    remaining: WARMUP_WORK_SEC,
    isoPhase: null,
    prepBeeped: {},
    running: true,
    _iv: null,
  };
  // Se il primo item è perLato, inizializza la fase iso (imposta remaining)
  _warmupFlowInitIsoPhase();
  ST.trainWarmupFlow.endTime = Date.now() + ST.trainWarmupFlow.remaining * 1000;
  ST.trainWarmupFlow._iv = setInterval(_warmupFlowTick, 250);
  try { playLongBeep(); } catch(e){} // l'esercizio parte
  renderTraining();
}
function warmupFlowPause(){
  const f = ST.trainWarmupFlow;
  if(!f || !f.active) return;
  _warmupFlowClearInterval();
  // Congela il residuo esatto: alla ripresa endTime = Date.now() + remaining*1000
  f.remaining = _tsRemaining(f.endTime);
  f.running = false;
  renderTraining();
}
function warmupFlowResume(){
  const f = ST.trainWarmupFlow;
  if(!f || !f.active) return;
  // Mutua esclusione: non riprendere se attivazione / recupero sono in corso
  if(ST.trainActivationFlow && ST.trainActivationFlow.running) return;
  if(ST.trainRecoveryFlow && ST.trainRecoveryFlow.running) return;
  try { _unlockAudio(); } catch(e){}
  f.endTime = Date.now() + (f.remaining || 0) * 1000;
  f.running = true;
  f._iv = setInterval(_warmupFlowTick, 250);
  renderTraining();
}
function warmupFlowSkip(){
  const f = ST.trainWarmupFlow;
  if(!f || !f.active) return;
  f.isoPhase = null; // salta tutta la sequenza iso, avanza normalmente
  f.remaining = 0;
  _warmupFlowAdvance();
}
function warmupFlowEnd(){
  _warmupFlowClearInterval();
  ST.trainWarmupFlow = null;
  renderTraining();
}
function _warmupFlowEndCompleted(){
  _warmupFlowClearInterval();
  try { if(navigator.vibrate) navigator.vibrate([300,100,300]); } catch(e){}
  showToast('Riscaldamento completato', '✓');
  ST.trainWarmupFlow = null;
  ST.trainWarmupCollapsed = true; // collassa in riga compatta riapribile (come l'attivazione)
  renderTraining();
}
// Toggle collasso card warm-up (riga compatta ↔ card piena). In-memory.
function toggleWarmupCollapsed(){
  ST.trainWarmupCollapsed = !ST.trainWarmupCollapsed;
  renderTraining();
}
// Scheda "come si esegue" del warm-up: legge l'item da s.warmup[idx] della sessione attiva.
// Modal content-only (riusa le classi del modal scheda esercizio); mostra SOLO i campi presenti.
function openWarmupInfo(idx){
  const sess = getTrainingSession(ST.trainSession);
  if(!sess || !Array.isArray(sess.warmup)) return;
  const item = sess.warmup[idx];
  if(!item) return;
  ST.warmupInfoOpen = item;
  renderTraining();
}
function closeWarmupInfo(){
  ST.warmupInfoOpen = null;
  renderTraining();
}
function toggleRecoveryBlockCollapsed(blockName){
  if(!ST.trainRecoveryCollapsed) ST.trainRecoveryCollapsed = {};
  // Toggle esplicito: usa false (non delete) per "intenzionalmente aperto" — evita che l'auto-collapse riparta
  ST.trainRecoveryCollapsed[blockName] = !ST.trainRecoveryCollapsed[blockName];
  renderTraining();
}

function toggleRecoveryDone(exName){
  if(!ST.trainRecoveryDone) ST.trainRecoveryDone = {};
  ST.trainRecoveryDone[exName] = !ST.trainRecoveryDone[exName];
  if(ST.trainRecoveryDone[exName]){
    checkRecoverySessionDone();
  }
  renderTraining();
}
async function checkRecoverySessionDone(){
  const sel = ST.trainSession;
  if(!sel) return;
  const sess = getTrainingSession(sel);
  if(!sess || sess.type !== 'Recupero') return;
  const allDone = sess.exercises.every(ex => !!(ST.trainRecoveryDone && ST.trainRecoveryDone[ex.name]));
  if(!allDone) return;
  if(ST.trainCompletedToday && ST.trainCompletedToday[sel]) return;
  ST.trainCompletedToday = ST.trainCompletedToday || {};
  ST.trainCompletedToday[sel] = true; // anti-duplica immediato
  const wid = await saveWorkoutRecord(sel);
  if(wid){
    showToast('🎉 Recupero completato!');
    // Micro-fix refresh (30 mag): aggiorna IN SEQUENZA tutte le fonti lette dal render di Programma
    // (rotazione + storico completo + ultimo completamento), poi UN SOLO re-render → niente race tra
    // async indipendenti né doppio render. computeTrainHomeData è DOM-free (no renderHome: nessun
    // flicker della Home off-screen mentre si è in Training).
    await computeTrainHomeData();                          // ST.trainHomeData fresco (nextSession)
    await loadTrainingAllCompleted({ skipRender: true });  // storico completo per computeTrainingDebt + settimana ciclo
    await loadSessionLastCompletion({ skipRender: true });  // ultimo completamento + trainCompletedToday
    if(ST.page === 'training') renderTraining();
  }
}

function resetAllActivationTimers(){
  for(let i=0;i<3;i++){
    if(ACTIVATION_INTERVALS[i]){ clearInterval(ACTIVATION_INTERVALS[i]); ACTIVATION_INTERVALS[i]=null; }
  }
  ST.trainActivationTimers = [
    { remaining:120, total:120, running:false },
    { remaining:120, total:120, running:false },
    { remaining:60,  total:60,  running:false },
  ];
}

function showInfoModal(key) {
  const INFO = {
    rir: {
      title: 'RIR — Reps In Reserve',
      text: 'Le ripetizioni che ti restano prima del cedimento tecnico. RIR 2 = potresti fare ancora 2 rep. RIR 1 = quasi al limite. Non si va mai a cedimento (RIR 0) per proteggere tendini e articolazioni.'
    },
    serie: {
      title: 'Serie × Ripetizioni',
      text: 'Es: 4×4–6 = 4 serie da 4 a 6 ripetizioni. Parti dal minimo del range (4 rep), settimane successive accumuli fino al massimo (6 rep), poi aumenti il carico e riparte dal minimo.'
    },
    recupero: {
      title: 'Recupero tra le serie',
      text: 'Sessioni Forza (A): 2–3 minuti — necessario per recuperare il sistema nervoso. Sessioni Ipertrofia (B): 60–90 secondi — il recupero incompleto aumenta il segnale ipertrofico.'
    },
    dup: {
      title: 'DUP — Daily Undulating Periodization',
      text: 'Alternare sessioni di Forza (rep basse, RIR 2) e Ipertrofia (rep alte, RIR 1) nella stessa settimana. Varia il tipo di stress neuromuscolare, riduce il rischio di overuse ed è il metodo più efficace per sviluppare forza e massa simultaneamente.'
    },
    scarico: {
      title: 'Settimana di Scarico',
      text: 'Ogni 6ª settimana: stessi esercizi e serie, carichi ridotti e RIR 3+ (3+ ripetizioni di margine). Non è riposo — è recupero attivo. I tendini si adattano più lentamente dei muscoli e hanno bisogno di scaricare. La supercompensazione avviene durante lo scarico, non durante il carico.'
    },
    rientro: {
      title: 'Rientro Soft',
      text: 'Dopo una pausa lunga il corpo ha bisogno di riprendere gradualmente: per 7 giorni i suggerimenti mostrano carichi ridotti (−20% dopo 10+ giorni di stop, −35% dopo 30+) e più margine (RIR +1 o +2). È solo un consiglio: la scheda non cambia e logghi sempre quello che vuoi. Dopo 7 giorni la progressione normale riprende da sola.'
    },
    progressione: {
      title: 'Doppia Progressione',
      text: 'Step 1: accumula rep nel range (es. da 4 a 6) mantenendo il RIR prescritto. Step 2: quando raggiungi il tetto del range, aumenta la combinazione elastici e torna al minimo. Ciclo continuo senza plateau.'
    }
  };
  const item = INFO[key];
  if(!item) return;
  const el = document.createElement('div');
  el.className = 'info-modal-overlay';
  el.innerHTML = `<div class="info-modal">
    <h3>${item.title}</h3>
    <p>${item.text}</p>
    <button class="info-modal-close" onclick="this.closest('.info-modal-overlay').remove()">Chiudi</button>
  </div>`;
  el.addEventListener('click', e => { if(e.target === el) el.remove(); });
  document.body.appendChild(el);
}
