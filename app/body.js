// ═══════════════════════════════════════
// app/body.js — il tab Body (Fondamenta 035, tappa 4, 2 ottobre 2026)
// ═══════════════════════════════════════
// Il check fisico M2, il peso e la pesata rapida (weight_logs), gli esami del sangue, i log Body,
// il dettaglio del check con la lettura AI delle foto, la Tendenza, il promemoria di fine blocco,
// renderBody. Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO app/comune.js e PRIMA del resto del proprio codice: qui al caricamento
// si dichiarano solo costanti scritte per esteso, niente che usi un nome scritto più avanti nella
// pagina (lo controlla tools/banco/prova_ordine_caricamento.js).

// ═══════════════════════════════════════════════════════════
// M2 CHECK FISICO — versione funzionale (design legacy M1)
// ═══════════════════════════════════════════════════════════

// Auto-detect unità: imperial solo per US English, metric per tutti gli altri
function m2DetectUnit() {
  try {
    const lang = (navigator.language || 'it').toLowerCase();
    ST.m2.unitSystem = lang.startsWith('en-us') ? 'imperial' : 'metric';
  } catch(e) { ST.m2.unitSystem = 'metric'; }
}

// Conversioni unità (DB sempre in metrico)
function m2LbToKg(v)  { return v / 2.2046; }
function m2KgToLb(v)  { return v * 2.2046; }
function m2InToCm(v)  { return v * 2.54; }
function m2CmToIn(v)  { return v / 2.54; }

// Mostra una step screen, nasconde le altre, scrolla top
function m2GoStep(stepId) {
  ST.m2.step = stepId;
  const screen = document.getElementById('m2-screen');
  if(!screen) return;
  screen.querySelectorAll('.m2-step').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('m2-' + stepId);
  if(target) target.classList.add('active');
  screen.scrollTop = 0;
  // Aggiorna header label dinamicamente
  const lbl = document.getElementById('m2-step-label');
  const sub = document.getElementById('m2-subtitle');
  const title = document.getElementById('m2-title');
  const M2_HEADERS = {
    intro:   { label:'CHECK FISICO', title:'Il tuo check fisico',   sub:'Le foto e le misure restano private.' },
    resume:  { label:'CHECK FISICO', title:'Check in corso',         sub:'Hai un check fisico già avviato.' },
    s0:      { label:'CHECK FISICO · FOTO',    title:'4 foto del corpo',  sub:'Le foto restano private.' },
    s1:      { label:'CHECK FISICO · FOTO 1/4', title:'Posa frontale',     sub:'Davanti, in posizione naturale.' },
    s2:      { label:'CHECK FISICO · FOTO 2/4', title:'Posa lato destro',  sub:'Lato destro verso la fotocamera.' },
    s3:      { label:'CHECK FISICO · FOTO 3/4', title:'Posa lato sinistro', sub:'Lato sinistro verso la fotocamera.' },
    s4:      { label:'CHECK FISICO · FOTO 4/4', title:'Posa retro',        sub:'Spalle verso la fotocamera.' },
    s5:      { label:'CHECK FISICO · FOTO',     title:'Foto pronte',       sub:'Rivedi e conferma per andare avanti.' },
    s6:      { label:'CHECK FISICO · MISURE',   title:'Peso e altezza',    sub:'Servono per partire.' },
    s7:      { label:'CHECK FISICO · MISURE',   title:'Circonferenze',     sub:'Metro morbido, aderente ma non stretto.' },
    s8:      { label:'CHECK FISICO · MISURE',   title:'Composizione',      sub:'Se hai una bilancia bioimpedenziometrica.' },
    s9:      { label:'CHECK FISICO · ESAMI',    title:'Esami del sangue',  sub:'Ne hai fatti nell\'ultimo mese?' },
    s10:     { label:'CHECK FISICO · ESAMI',    title:'I tuoi valori',     sub:'Inserisci solo quelli che hai. Gli altri puoi saltarli.' },
    s11:     { label:'CHECK FISICO · ESAMI',    title:'Va bene così',      sub:'Ti ricordo di farli prima del prossimo checkpoint.' },
    s12:     { label:'CHECK FISICO · COMPLETATO', title:'Check completato', sub:`${COACH_NAME} sta preparando il tuo piano.` },
  };
  const h = M2_HEADERS[stepId] || M2_HEADERS.intro;
  if(lbl) lbl.textContent = h.label;
  if(title) title.textContent = h.title;
  if(sub) sub.textContent = h.sub;
  // Switch unità visibile solo su s6 (dentro l'header verde)
  const unitHeader = document.getElementById('m2-unit-header');
  if(unitHeader) unitHeader.style.display = (stepId === 's6') ? 'block' : 'none';
}

// Entry intro: mostra schermata M2 con scelta Inizia/Salta. Controlla anche resume.
async function m2EntryIntro() {
  m2DetectUnit();
  // Verifica se c'è un check in corso (resume cross-device)
  try {
    const {data: inProgress} = await supa.from('body_checks')
      .select('id, created_at')
      .eq('user_id', ST.user.id)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if(inProgress && inProgress.id){
      ST.m2.checkId = inProgress.id;
      showScreen('m2');
      m2GoStep('resume');
      return;
    }
  } catch(e) { console.warn('[m2] resume check error:', e); }
  showScreen('m2');
  m2GoStep('intro');
}

// Skip: marca m2_skipped=true su profile, vai a app
async function m2Skip() {
  const errEl = document.getElementById('m2-intro-err');
  if(errEl) errEl.style.display='none';
  try {
    const { error } = await supa.from('profiles').update({ m2_skipped: true, updated_at: new Date().toISOString() }).eq('id', ST.user.id);
    if(error) throw error;
    if(ST.profile) ST.profile.m2_skipped = true;
    saveCache();
    showScreen('app');
    renderOggi(); showPage('home');
  } catch(e) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Errore: '+e.message; }
  }
}

// Start: crea riga body_checks (status in_progress) e cattura checkId
async function m2Start() {
  const errEl = document.getElementById('m2-intro-err');
  if(errEl) errEl.style.display='none';
  try {
    const { data, error } = await supa.from('body_checks').insert({
      user_id: ST.user.id,
      check_type: (ST.bodyChecks||[]).some(c=>c.status==='completed') ? 'periodic' : 'initial',
      status: 'in_progress',
    }).select().single();
    if(error) throw error;
    ST.m2.checkId = data.id;
    m2GoStep('s0');
  } catch(e) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Errore: '+e.message; }
  }
}

// Resume: continua il check in corso (caricando state)
async function m2ResumeContinue() {
  // Determina step di ripartenza in base a cosa è già stato salvato
  try {
    // Foto presenti?
    const { data: photos } = await supa.from('body_check_photos').select('pose').eq('check_id', ST.m2.checkId);
    const posesDone = new Set((photos||[]).map(p => p.pose));
    ['front','right','left','back'].forEach(p => { ST.m2.photosUploaded[p] = posesDone.has(p); });
    // Misure presenti?
    const { data: meas } = await supa.from('body_measurements').select('*').eq('check_id', ST.m2.checkId).maybeSingle();
    const hasMeas = !!(meas && meas.weight_kg);
    if(meas && meas.unit_system) ST.m2.unitSystem = meas.unit_system;
    // Esami presenti?
    const { data: blood } = await supa.from('blood_tests').select('id').eq('user_id', ST.user.id).order('test_date', { ascending: false }).limit(1);
    const hasBlood = !!(blood && blood.length);

    // Heuristica step di ripartenza
    if(!posesDone.has('front')) { m2GoStep('s1'); return; }
    if(!posesDone.has('right')) { m2GoStep('s2'); return; }
    if(!posesDone.has('left'))  { m2GoStep('s3'); return; }
    if(!posesDone.has('back'))  { m2GoStep('s4'); return; }
    if(!hasMeas)                 { m2GoStep('s6'); return; }
    if(!hasBlood && ST.m2.hasRecentBloodTests === null) { m2GoStep('s9'); return; }
    m2GoStep('s12');
  } catch(e) {
    console.warn('[m2] resume continue error:', e);
    m2GoStep('s0');
  }
}

// Discard: cancella check in_progress e ricomincia
async function m2ResumeDiscard() {
  try {
    if(ST.m2.checkId){
      // Pulizia di uno scarto volontario: qualunque cosa vada storta, l'utente ha
      // chiesto di ricominciare e da qui in poi si ricomincia. Per questo ogni
      // pezzo e' silenzioso — un toast per ciascuno sarebbe una raffica — ma
      // NESSUNO passa piu' inosservato: se qualcosa resta indietro finisce in
      // console e un avviso solo lo dice.
      // Il pezzo che pesa davvero e' l'ultimo: se `body_checks` non si cancella,
      // il check resta 'in_progress' e alla prossima apertura l'app riproporra'
      // di riprendere un lavoro che l'utente aveva buttato.
      const rimasti = [];
      // Foto nello Storage (best-effort: le righe contano piu' dei file)
      try {
        const { data: photos } = await supa.from('body_check_photos').select('storage_path').eq('check_id', ST.m2.checkId);
        if(photos && photos.length){
          const f = await dbq('cancellare le foto del checkpoint', supa.storage.from('body-check-photos').remove(photos.map(p => p.storage_path)), {silenzioso:true});
          if(f && f.error) rimasti.push('le foto');
        }
      } catch(e) { console.warn('[m2] photo cleanup:', e); }
      // Righe, in ordine di dipendenza (figlie prima della madre)
      const r1 = await dbq('cancellare le foto del checkpoint', supa.from('body_check_photos').delete().eq('check_id', ST.m2.checkId), {silenzioso:true});
      if(r1 && r1.error) rimasti.push('le foto');
      const r2 = await dbq('cancellare le misure del checkpoint', supa.from('body_measurements').delete().eq('check_id', ST.m2.checkId), {silenzioso:true});
      if(r2 && r2.error) rimasti.push('le misure');
      const r3 = await dbq('cancellare il checkpoint', supa.from('body_checks').delete().eq('id', ST.m2.checkId), {silenzioso:true});
      if(r3 && r3.error){
        rimasti.push('il checkpoint');
        console.error('[m2] il check', ST.m2.checkId, 'resta in_progress: alla prossima apertura l\'app potrebbe riproporre di riprenderlo');
      }
      if(rimasti.length){
        console.error('[m2] scarto incompleto, sono rimasti indietro:', rimasti.join(', '));
        showToast('Ho ricominciato, ma qualcosa del vecchio checkpoint è rimasto salvato', '⚠️', 5500);
      }
    }
  } catch(e) { console.warn('[m2] discard error:', e); }
  // Reset state locale e ricomincia
  ST.m2.checkId = null;
  ST.m2.photos = { front:null, right:null, left:null, back:null };
  ST.m2.photoUrls = { front:null, right:null, left:null, back:null };
  ST.m2.photosUploaded = { front:false, right:false, left:false, back:false };
  ST.m2.measurements = {};
  ST.m2.bloodTests = {};
  ST.m2.hasRecentBloodTests = null;
  m2GoStep('intro');
}

// Selezione foto: tiene File in memoria, mostra preview locale, abilita CTA
function m2HandlePhotoSelect(pose, event) {
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  ST.m2.photos[pose] = file;
  // Revoca eventuali object URL precedenti per evitare leak
  if(ST.m2.photoUrls[pose]) { try { URL.revokeObjectURL(ST.m2.photoUrls[pose]); } catch(e){} }
  const url = URL.createObjectURL(file);
  ST.m2.photoUrls[pose] = url;
  // Mostra preview, nascondi dropzone
  const drop = document.getElementById('m2-drop-' + pose);
  const prev = document.getElementById('m2-preview-' + pose);
  const img  = document.getElementById('m2-img-' + pose);
  if(drop) drop.style.display = 'none';
  if(prev) prev.style.display = 'block';
  if(img)  img.src = url;
  // Abilita CTA
  const stepNum = { front:1, right:2, left:3, back:4 }[pose];
  const btn = document.getElementById('m2-next-s' + stepNum);
  if(btn) btn.disabled = false;
}

// Rifai: ripristina dropzone, reset preview
function m2RetakePhoto(pose) {
  ST.m2.photos[pose] = null;
  if(ST.m2.photoUrls[pose]) { try { URL.revokeObjectURL(ST.m2.photoUrls[pose]); } catch(e){} }
  ST.m2.photoUrls[pose] = null;
  ST.m2.photosUploaded[pose] = false;
  const drop = document.getElementById('m2-drop-' + pose);
  const prev = document.getElementById('m2-preview-' + pose);
  const fileInput = document.getElementById('m2-file-' + pose);
  if(fileInput) fileInput.value = '';
  if(drop) drop.style.display = 'block';
  if(prev) prev.style.display = 'none';
  const stepNum = { front:1, right:2, left:3, back:4 }[pose];
  const btn = document.getElementById('m2-next-s' + stepNum);
  if(btn) btn.disabled = true;
}

// Continua su step foto: carica file su Storage + upsert riga DB, poi navigate
async function m2ContinuePhoto(pose, nextStep) {
  const errId = 'm2-err-' + { front:'s1', right:'s2', left:'s3', back:'s4' }[pose];
  const errEl = document.getElementById(errId);
  if(errEl) errEl.style.display = 'none';
  const file = ST.m2.photos[pose];
  if(!file) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Seleziona prima una foto.'; }
    return;
  }
  if(!ST.m2.checkId) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Sessione di check non valida. Riprova.'; }
    return;
  }
  const stepNum = { front:1, right:2, left:3, back:4 }[pose];
  const btn = document.getElementById('m2-next-s' + stepNum);
  if(btn){ btn.disabled = true; btn.textContent = 'Caricamento...'; }
  try {
    const path = ST.user.id + '/' + ST.m2.checkId + '/' + pose + '.jpg';
    const { error: upErr } = await supa.storage.from('body-check-photos').upload(path, file, {
      cacheControl: '3600', upsert: true, contentType: file.type || 'image/jpeg',
    });
    if(upErr) throw upErr;
    // Upsert riga body_check_photos (unique check_id+pose)
    const { error: dbErr } = await supa.from('body_check_photos').upsert({
      check_id: ST.m2.checkId,
      user_id: ST.user.id,
      pose: pose,
      storage_path: path,
    }, { onConflict: 'check_id,pose' });
    if(dbErr) throw dbErr;
    ST.m2.photosUploaded[pose] = true;
    // Retake dal modal s5: torna diretto a s5 invece di proseguire in cascata
    const goTo = ST.m2.retakeFromModal ? 's5' : nextStep;
    ST.m2.retakeFromModal = false;
    m2GoStep(goTo);
    if(goTo === 's5') m2PopulateGridThumbs();
  } catch(e) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Errore caricamento: '+e.message; }
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = 'Continua →'; }
  }
}

// Popola le 4 thumbnail nella griglia conferma (s5) usando object URL locali
function m2PopulateGridThumbs() {
  ['front','right','left','back'].forEach(pose => {
    const img = document.getElementById('m2-grid-' + pose);
    if(img && ST.m2.photoUrls[pose]) img.src = ST.m2.photoUrls[pose];
  });
}

// Apri modal full-screen review foto
function m2OpenPhotoReview(pose) {
  ST.m2.reviewingPose = pose;
  const overlay = document.getElementById('m2-photo-modal');
  const lbl = document.getElementById('m2-modal-photo-lbl');
  const img = document.getElementById('m2-modal-photo-img');
  const POSE_LABEL = { front:'Frontale', right:'Lato destro', left:'Lato sinistro', back:'Retro' };
  if(lbl) lbl.textContent = POSE_LABEL[pose] || '';
  if(img && ST.m2.photoUrls[pose]) img.src = ST.m2.photoUrls[pose];
  if(overlay) overlay.style.display = 'flex';
}
function m2ModalKeep() {
  const overlay = document.getElementById('m2-photo-modal');
  if(overlay) overlay.style.display = 'none';
  ST.m2.reviewingPose = null;
}
function m2ModalRetake() {
  const pose = ST.m2.reviewingPose;
  if(!pose) return m2ModalKeep();
  // Chiudi modal, torna allo step della posa, ripristina dropzone. Flag per tornare diretto a s5.
  m2ModalKeep();
  m2RetakePhoto(pose);
  ST.m2.retakeFromModal = true;
  const stepMap = { front:'s1', right:'s2', left:'s3', back:'s4' };
  m2GoStep(stepMap[pose]);
}

// Switch unità (solo su s6)
function m2SetUnit(unit) {
  ST.m2.unitSystem = unit;
  const m = document.getElementById('m2-unit-metric');
  const i = document.getElementById('m2-unit-imperial');
  if(m) m.classList.toggle('active', unit === 'metric');
  if(i) i.classList.toggle('active', unit === 'imperial');
  // Aggiorna tutti i label unità su s6/s7/s8 in base al sistema
  const wU = unit === 'metric' ? 'KG' : 'LB';
  const lU = unit === 'metric' ? 'CM' : 'IN';
  ['peso','muscle'].forEach(k => { const el = document.getElementById('m2-'+k+'-unit'); if(el) el.textContent = wU; });
  ['altezza','vita','petto','fianchi','spalle','collo','bicipite','polso','coscia','polpaccio'].forEach(k => {
    const el = document.getElementById('m2-'+k+'-unit'); if(el) el.textContent = lU;
  });
}

// Validazione live input misure (placeholder per estensioni future, no-op per ora)
function m2OnMeasInput() { /* noop */ }

// Continua s6: validazione peso/altezza, conserva valori in ST.m2.measurements (in metrico)
function m2ContinueS6() {
  const errEl = document.getElementById('m2-err-s6');
  if(errEl) errEl.style.display = 'none';
  const pesoRaw = parseFloat(document.getElementById('m2-peso').value);
  const altRaw  = parseFloat(document.getElementById('m2-altezza').value);
  if(!pesoRaw || !altRaw) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Compila peso e altezza.'; } return;
  }
  // Range realistici
  if(ST.m2.unitSystem === 'metric'){
    if(pesoRaw < 30 || pesoRaw > 250){ errEl.style.display='block'; errEl.textContent='Peso fuori range (30-250 kg).'; return; }
    if(altRaw  < 100 || altRaw > 230){ errEl.style.display='block'; errEl.textContent='Altezza fuori range (100-230 cm).'; return; }
    ST.m2.measurements.weight_kg = pesoRaw;
    ST.m2.measurements.height_cm = altRaw;
  } else {
    if(pesoRaw < 66 || pesoRaw > 550){ errEl.style.display='block'; errEl.textContent='Peso fuori range (66-550 lb).'; return; }
    if(altRaw  < 39 || altRaw  > 90){ errEl.style.display='block'; errEl.textContent='Altezza fuori range (39-90 in).'; return; }
    ST.m2.measurements.weight_kg = m2LbToKg(pesoRaw);
    ST.m2.measurements.height_cm = m2InToCm(altRaw);
  }
  m2GoStep('s7');
}

// Continua s7: 3 obbligatori (vita/petto/fianchi) + 6 opzionali, conservati in metrico
function m2ContinueS7() {
  const errEl = document.getElementById('m2-err-s7');
  if(errEl) errEl.style.display = 'none';
  const get = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
  const vita    = get('m2-vita');
  const petto   = get('m2-petto');
  const fianchi = get('m2-fianchi');
  if(!vita || !petto || !fianchi){
    if(errEl){ errEl.style.display='block'; errEl.textContent='Compila vita, petto e fianchi (obbligatori).'; } return;
  }
  const toCm = (v) => (v == null) ? null : (ST.m2.unitSystem === 'metric' ? v : m2InToCm(v));
  ST.m2.measurements.waist_cm     = toCm(vita);
  ST.m2.measurements.chest_cm     = toCm(petto);
  ST.m2.measurements.hips_cm      = toCm(fianchi);
  ST.m2.measurements.shoulders_cm = toCm(get('m2-spalle'));
  ST.m2.measurements.neck_cm      = toCm(get('m2-collo'));
  ST.m2.measurements.biceps_cm    = toCm(get('m2-bicipite'));
  ST.m2.measurements.wrist_cm     = toCm(get('m2-polso'));
  ST.m2.measurements.thigh_cm     = toCm(get('m2-coscia'));
  ST.m2.measurements.calf_cm      = toCm(get('m2-polpaccio'));
  m2GoStep('s8');
}

// Composizione bilancia: tutti opzionali. Salva l'intera riga body_measurements e prosegui
async function m2ContinueS8() {
  const get = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
  const muscleRaw = get('m2-muscle');
  ST.m2.measurements.body_fat_pct    = get('m2-bf');
  ST.m2.measurements.muscle_mass_kg  = (muscleRaw == null) ? null : (ST.m2.unitSystem === 'metric' ? muscleRaw : m2LbToKg(muscleRaw));
  ST.m2.measurements.visceral_fat    = get('m2-visceral');
  ST.m2.measurements.metabolic_age   = get('m2-bodyage');
  ST.m2.measurements.body_water_pct  = get('m2-water');
  await m2SaveMeasurements();
  m2GoStep('s9');
}

// Salta s8 (composizione opzionale): non popolare i 5 campi composizione, salva e prosegui
async function m2SaveMeasurementsAndSkipS8() {
  ['body_fat_pct','muscle_mass_kg','visceral_fat','metabolic_age','body_water_pct'].forEach(k => { ST.m2.measurements[k] = null; });
  await m2SaveMeasurements();
  m2GoStep('s9');
}

// Insert (o upsert per resume) riga body_measurements (1 riga per check)
async function m2SaveMeasurements() {
  const errEl = document.getElementById('m2-err-s8');
  if(errEl) errEl.style.display = 'none';
  try {
    const payload = {
      check_id: ST.m2.checkId,
      user_id: ST.user.id,
      unit_system: ST.m2.unitSystem,
      ...ST.m2.measurements,
    };
    const { error } = await supa.from('body_measurements').upsert(payload, { onConflict: 'check_id' });
    if(error) throw error;
  } catch(e) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Errore salvataggio misure: '+e.message; }
    throw e;
  }
}

// Gate esami sì/no
function m2SetBloodGate(hasRecent) {
  ST.m2.hasRecentBloodTests = hasRecent;
  m2GoStep(hasRecent ? 's10' : 's11');
  // Default data esame = oggi
  if(hasRecent){
    const el = document.getElementById('m2-test-date');
    if(el && !el.value) el.value = todayKey();
  }
}

// Salva esami sangue
async function m2SaveBloodTests() {
  const errEl = document.getElementById('m2-err-s10');
  if(errEl) errEl.style.display = 'none';
  const date = document.getElementById('m2-test-date').value;
  if(!date){
    if(errEl){ errEl.style.display='block'; errEl.textContent='Inserisci la data dell\'esame.'; } return;
  }
  const get = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
  const payload = {
    user_id: ST.user.id,
    test_date: date,
    hemoglobin:      get('m2-bl-hemo'),
    ferritin:        get('m2-bl-ferr'),
    glucose:         get('m2-bl-gluc'),
    cholesterol_tot: get('m2-bl-chol'),
    hdl:             get('m2-bl-hdl'),
    triglycerides: get('m2-bl-trig'),
    creatinine:    get('m2-bl-crea'),
    alt:           get('m2-bl-alt'),
    vitamin_d:     get('m2-bl-vitd'),
    vitamin_b12:   get('m2-bl-b12'),
    tsh:           get('m2-bl-tsh'),
  };
  ST.m2.bloodTests = payload;
  try {
    const { error } = await supa.from('blood_tests').insert(payload);
    if(error) throw error;
    m2GoStep('s12');
  } catch(e) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Errore salvataggio esami: '+e.message; }
  }
}

// Esito: marca body_checks completato, mostra summary, va all'app
async function m2Complete() {
  // Popola summary
  const allPhotos = ['front','right','left','back'].every(p => ST.m2.photosUploaded[p]);
  const hasMeas = !!(ST.m2.measurements && ST.m2.measurements.weight_kg);
  const examsLabel = ST.m2.hasRecentBloodTests === true ? 'registrati' : 'da fare';
  const sumEl = document.getElementById('m2-summary');
  if(sumEl){
    const parts = [];
    parts.push((allPhotos ? '✓' : '·') + ' 4 foto caricate');
    parts.push((hasMeas   ? '✓' : '·') + ' Misure registrate');
    parts.push('· Esami ' + examsLabel);
    sumEl.textContent = parts.join('  ·  ');
  }
  const errEl = document.getElementById('m2-err-s12');
  if(errEl) errEl.style.display = 'none';
  const checkChiuso = ST.m2.checkId;   // serve dopo il reset, per proporre la lettura delle foto
  try {
    if(ST.m2.checkId){
      const { error } = await supa.from('body_checks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', ST.m2.checkId);
      if(error) throw error;
    }
    // Reset ST.m2 per evitare residui in cache (NON tocco unitSystem: resta preferenza utente)
    ['front','right','left','back'].forEach(p => {
      if(ST.m2.photoUrls[p]){ try { URL.revokeObjectURL(ST.m2.photoUrls[p]); } catch(e){} }
    });
    ST.m2.checkId = null;
    ST.m2.step = 'intro';
    ST.m2.photos = { front:null, right:null, left:null, back:null };
    ST.m2.photoUrls = { front:null, right:null, left:null, back:null };
    ST.m2.photosUploaded = { front:false, right:false, left:false, back:false };
    ST.m2.reviewingPose = null;
    ST.m2.measurements = {};
    ST.m2.bloodTests = {};
    ST.m2.hasRecentBloodTests = null;
    ST.m2.retakeFromModal = false;
    // Vai a home
    showScreen('app');
    renderOggi(); showPage('home');
    bcaOfferAfterCheck(checkChiuso);
  } catch(e) {
    if(errEl){ errEl.style.display='block'; errEl.textContent='Errore chiusura check: '+e.message; }
  }
}

// ═══════════════════════════════════════════════════════════
// WEIGHT
// ═══════════════════════════════════════════════════════════
async function saveWeightEntry(kg) {
  // store weight in profile
  await dbq('salvare il peso', supa.from('profiles').update({weight_kg:kg, updated_at:new Date().toISOString()}).eq('id', ST.user.id));
if(ST.profile) ST.profile.weight_kg = kg;
const el = document.getElementById('h-weight'); if(el) el.textContent = kg;
}

async function saveWeight() {
  const v = parseFloat(document.getElementById('weight-inp').value);
  if(!v || v<30 || v>300) return;
  await saveWeightEntry(v);
  // recalculate targets
  let recalcTarget = null;
  let recalcSex = null;
  if(ST.profile) {
    const r = calcTDEE(ST.profile.sex||'M', ST.profile.age||35, ST.profile.height_cm||175, v, ST.profile.activity_level||'moderate');
    await dbq('aggiornare gli obiettivi nutrizionali', supa.from('profiles').update({target_kcal:r.target, target_protein:r.protein, target_carbs:r.carbs, target_fat:r.fat, updated_at:new Date().toISOString()}).eq('id', ST.user.id));
    ST.TARGET = {kcal:r.target, protein:r.protein, carbs:r.carbs, fat:r.fat};
    ST.profile.weight_kg = v;
    recalcTarget = r.target;
    recalcSex = ST.profile.sex || 'M';
  }
  closeWeightModal();
  renderPage(ST.page);
  // Fix B (24 mag 2026): guard-rail calorie minime su ricalcolo peso.
  // Mostrato DOPO renderPage per non interferire con il render della pagina.
  if(recalcTarget != null) checkLowKcalAndWarn(recalcTarget, recalcSex);
}

function openWeightModal() {
  const latestW = getLatestBodyData().weight_kg ?? ST.profile?.weight_kg ?? '';
  document.getElementById('weight-inp').value = latestW;
  document.getElementById('weight-modal').style.display = 'flex';
  renderWeightChart();
}
function closeWeightModal() { document.getElementById('weight-modal').style.display='none'; }

async function renderWeightChart() {
  // simple: show goal vs current
  const wrap = document.getElementById('weight-chart-wrap');
  const goal = ST.profile?.goal_weight_kg;
  const curr = getLatestBodyData().weight_kg ?? ST.profile?.weight_kg;
  if(!goal || !curr) { wrap.style.display='none'; return; }
  wrap.style.display='block';
  const diff = curr - goal;
  const pct  = Math.min(100, Math.max(0, Math.round((1 - Math.abs(diff)/Math.max(curr,goal))*100)));
  document.getElementById('weight-goal-bar').innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <span style="font-size:11px;color:var(--t3);font-family:'JetBrains Mono',monospace;">Attuale: ${curr}kg</span>
      <span style="font-size:11px;color:var(--acc);font-family:'JetBrains Mono',monospace;">Obiettivo: ${goal}kg</span>
    </div>
    <div style="height:6px;border-radius:3px;background:var(--s3);overflow:hidden;">
      <div style="height:100%;border-radius:3px;width:${pct}%;background:${diff>0?'var(--warn)':'var(--acc)'};transition:width .6s ease;"></div>
    </div>
    <div style="font-size:11px;color:var(--t3);font-family:'JetBrains Mono',monospace;margin-top:6px;text-align:center;">${diff>0?'▼ '+diff.toFixed(1)+'kg da perdere':'✅ Obiettivo raggiunto!'}</div>`;
}

// M1 completo + M2 non skippato + nessun body_check completed → ritorna true
// In test mode skippa sempre M2.
async function m2ShouldShowEntry(profile) {
  if(!profile) return false;
  if(ST.user && ST.user.id === 'test-user-001') return false;
  if(profile.m2_skipped === true) return false;
  try {
    const { data, error } = await supa.from('body_checks')
      .select('id, status')
      .eq('user_id', ST.user.id)
      .or('status.eq.completed,status.eq.in_progress')
      .limit(1)
      .maybeSingle();
    if(error){ console.warn('[m2] entry check error:', error); return false; }
    if(data && data.status === 'completed') return false;
    // Anche se in_progress, mostriamo M2 entry (sarà m2EntryIntro() a routare a resume)
    return true;
  } catch(e) {
    console.warn('[m2] entry check exception:', e);
    return false;
  }
}

// ── Esami del sangue ────────────────────────────────────────
// Sorgente UNICA di etichette e unità dei parametri ematici: la usano il
// dettaglio del check fisico e lo storico nel tab Check. L'ordine è quello del
// modulo di inserimento in M2 (m2SaveBloodTests), così chi li ha digitati li
// ritrova nella stessa sequenza.
// ⚠️ La tabella blood_tests NON contiene intervalli di riferimento, e qui non se
// ne inventano: si mostrano i valori e basta. Quando gli intervalli saranno
// definiti, il posto dove aggiungerli è questa riga (campo `range`), non le due
// viste che la leggono.
const BLOOD_FIELDS = [
  { key:'hemoglobin',      label:'Emoglobina',       unit:'g/dL'   },
  { key:'ferritin',        label:'Ferritina',        unit:'ng/mL'  },
  { key:'glucose',         label:'Glicemia',         unit:'mg/dL'  },
  { key:'cholesterol_tot', label:'Colesterolo tot.', unit:'mg/dL'  },
  { key:'hdl',             label:'HDL',              unit:'mg/dL'  },
  { key:'triglycerides',   label:'Trigliceridi',     unit:'mg/dL'  },
  { key:'creatinine',      label:'Creatinina',       unit:'mg/dL'  },
  { key:'alt',             label:'ALT',              unit:'U/L'    },
  { key:'vitamin_d',       label:'Vitamina D',       unit:'ng/mL'  },
  { key:'vitamin_b12',     label:'Vitamina B12',     unit:'pg/mL'  },
  { key:'tsh',             label:'TSH',              unit:'µUI/mL' },
];
const BLOOD_MEDICO = 'Valori da rivedere con il tuo medico';
const BLOOD_VISIBLE_DEFAULT = 12;   // quanti esami si vedono senza "mostra altri"

async function loadBloodTests(){
  if(!ST.user || ST.user.id==='test-user-001'){ ST.bloodTests = []; return; }
  const res = await supa.from('blood_tests')
    .select('*')
    .eq('user_id', ST.user.id)
    .order('test_date', { ascending:false })
    .limit(200);
  if(res.error){                       // L22 — supabase-js non lancia: si controlla a mano
    console.warn('[blood] storico non caricato:', res.error.message);
    ST.bloodTests = [];
    return;
  }
  ST.bloodTests = res.data || [];
}

// Card "Esami del sangue" — storico in sola lettura, sotto la sezione Check.
// Nessuna interpretazione: i valori si leggono, non si giudicano (l'analisi del
// coach arriva in Fase 4).
function _bloodHistoryHTML(){
  const rows = ST.bloodTests;
  const card = (inner) => `<div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:16px;margin-top:14px;box-shadow:var(--shadow);">
      <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:10px;">Esami del sangue</div>
      ${inner}</div>`;
  if(rows === null || rows === undefined) return card(`<div style="font-size:12px;color:var(--t3);font-family:var(--font-mono);">Caricamento…</div>`);
  if(rows.length === 0){
    return card(`<div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.5;">Non hai ancora registrato esami del sangue.<br>Li puoi aggiungere durante un check fisico: restano qui, in ordine di data.</div>`);
  }
  const tutti = !!ST.bloodShowAll;
  const visibili = tutti ? rows : rows.slice(0, BLOOD_VISIBLE_DEFAULT);
  const righe = visibili.map(r => {
    const aperto = ST.bloodOpenId === r.id;
    const data = r.test_date ? fmtDate(r.test_date) : '—';
    const valori = BLOOD_FIELDS.filter(f => r[f.key] != null);
    const dettaglio = aperto ? `
      <div style="padding:4px 0 2px;">
        ${valori.length === 0
          ? `<div style="font-size:12px;color:var(--t3);font-family:var(--font-mono);">Nessun valore registrato per questa data.</div>`
          : valori.map(f => `
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--s2);">
            <span style="font-size:12px;color:var(--t2);font-family:var(--font-sans);">${f.label}</span>
            <span style="font-size:12px;font-family:var(--font-mono);color:var(--t1);font-weight:700;">${r[f.key]} ${f.unit}</span>
          </div>`).join('')}
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-sans);margin-top:10px;">${BLOOD_MEDICO}</div>
      </div>` : '';
    return `
      <div style="border-bottom:1px solid var(--s2);">
        <div onclick="toggleBloodTest('${r.id}')" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;cursor:pointer;">
          <span style="font-size:13px;color:var(--t1);font-family:var(--font-mono);">${data}</span>
          <span style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono);">${valori.length} valori</span>
            <span style="font-size:13px;color:var(--t3);">${aperto ? '⌄' : '›'}</span>
          </span>
        </div>
        ${dettaglio}
      </div>`;
  }).join('');
  const altri = rows.length > BLOOD_VISIBLE_DEFAULT
    ? `<div style="text-align:center;margin-top:10px;">
        <button onclick="ST.bloodShowAll=${tutti ? 'false' : 'true'};renderBody();" style="background:none;border:none;cursor:pointer;font-size:12px;font-weight:700;color:#5E4A7A;font-family:var(--font-sans);padding:4px;">${tutti ? 'Mostra meno' : `Mostra altri ${rows.length - BLOOD_VISIBLE_DEFAULT} →`}</button>
      </div>` : '';
  return card(righe + altri);
}

function toggleBloodTest(id){
  ST.bloodOpenId = (ST.bloodOpenId === id) ? null : id;
  renderBody();
}

async function loadBodyLogs(){
  if(!ST.user || ST.user.id==='test-user-001'){ ST.bodyLogs=[]; ST.bodyMeasurements=[]; ST.bodyChecks=[]; ST.bloodTests=[]; if(ST.page==='body') renderBody(); else if(ST.page==='home') renderHome(); return; }
  if(ST.page==='body'){ ST.bodyLogs=null; ST.bodyMeasurements=null; ST.bodyChecks=null; ST.bloodTests=null; renderBody(); }
  // Carica in parallelo body_logs (log peso veloci) + body_measurements (check M2) + body_checks (id+status)
  // + blood_tests (storico esami, card in coda al tab Check)
  // + weight_logs: le pesate rapide fanno parte del "peso attuale" (weighInsByDay, L47)
  const [logsRes, measRes, checksRes] = await Promise.all([
    supa.from('body_logs').select('*').eq('user_id', ST.user.id).order('date', {ascending:false}).limit(90),
    supa.from('body_measurements').select('*').eq('user_id', ST.user.id).order('created_at', {ascending:false}).limit(90),
    supa.from('body_checks').select('id, status, created_at').eq('user_id', ST.user.id),
    loadBloodTests(),
    loadWeightLogs(),
  ]);
  ST.bodyLogs = logsRes.data || [];
  ST.bodyMeasurements = measRes.data || [];
  ST.bodyChecks = checksRes.data || [];
  updateHeaderWeight();
  if(ST.page==='body') renderBody();
  else if(ST.page==='home') renderHome();
}

// Aggiorna il pillolino peso nell'header usando i dati unificati
// (body_logs + body_measurements). Fallback su profilo se Body non caricato.
function updateHeaderWeight(){
  const el = document.getElementById('h-weight');
  if(!el) return;
  let w = null;
  try { w = getLatestBodyData().weight_kg; } catch(e){ w = null; }
  if(w == null) w = ST.profile?.weight_kg ?? null;
  el.textContent = w != null ? w : '—';
}

// ── Lettura unificata Body: body_logs (legacy) + body_measurements (M2) ──
// Mapping body_logs → body_measurements: hip_cm→hips_cm, bicep_cm→biceps_cm,
// bf_pct→body_fat_pct, muscle_kg→muscle_mass_kg, body_age→metabolic_age.
// Per ogni metrica prende il valore non-null col timestamp più recente,
// indipendentemente dalla tabella di origine.
function getLatestBodyData(){
  const logs = ST.bodyLogs || [];
  const meas = ST.bodyMeasurements || [];
  // pickMetric: scorre tutti i record di entrambe le tabelle, ritorna il valore
  // non-null col timestamp più recente. logKey/measKey possono essere null se
  // la metrica esiste solo in una tabella.
  function pickMetric(logKey, measKey){
    let best = null; // { value, time }
    if(logKey){
      for(const l of logs){
        const v = l[logKey];
        if(v != null){
          const t = new Date(l.date).getTime();
          if(!best || t > best.time) best = { value:v, time:t };
        }
      }
    }
    if(measKey){
      for(const m of meas){
        const v = m[measKey];
        if(v != null){
          const t = new Date(m.created_at).getTime();
          if(!best || t > best.time) best = { value:v, time:t };
        }
      }
    }
    return best ? best.value : null;
  }
  let height_cm = pickMetric(null, 'height_cm');
  if(height_cm == null) height_cm = ST.profile?.height_cm ?? null;
  const pesate = getWeighIns();
  return {
    weight_kg:    pesate.length ? pesate[0].weight_kg : null,       // ultima pesata, weight_logs compresi

    waist_cm:     pickMetric('waist_cm', 'waist_cm'),
    hip_cm:       pickMetric('hip_cm', 'hips_cm'),
    chest_cm:     pickMetric('chest_cm', 'chest_cm'),
    bicep_cm:     pickMetric('bicep_cm', 'biceps_cm'),
    bf_pct:       pickMetric('bf_pct', 'body_fat_pct'),
    muscle_kg:    pickMetric('muscle_kg', 'muscle_mass_kg'),
    body_age:     pickMetric('body_age', 'metabolic_age'),
    visceral_fat: pickMetric('visceral_fat', 'visceral_fat'),
    height_cm,
    _hasMeas:     meas.length > 0,
  };
}

// Pesate in memoria (weight_logs + body_logs + check), una al giorno, dalla più recente.
// Stessa regola del quadro settimanale: il peso attuale del tab Body e della card coincidono.
function getWeighIns(){
  const daily = weighInsByDay(ST.weightLogs || [], ST.bodyLogs || [], ST.bodyMeasurements || []);
  return Object.keys(daily).sort().reverse().map(d => ({ date: d, weight_kg: daily[d].v }));
}

// Timeline unificata: body_logs + weight_logs + body_measurements normalizzati in un
// unico array ordinato per data DESC. source: 'log' | 'check'. Usata da "Ultimi log"
// e dai grafici Tendenza.
// Il PESO segue la regola del quadro e del peso attuale (weighInsByDay, L47/L48):
// una pesata al giorno, weight_logs > body_logs > misure del check. Una pesata rapida
// senza body_logs quel giorno diventa una riga sua (id null, quick true); con un
// body_logs lo stesso giorno il peso della riga è quello della pesata rapida. Un check
// in un giorno che ha già una pesata tiene il suo peso in check_weight_kg, e weight_kg
// null: così il grafico ha un punto solo per giorno.
function getUnifiedBodyTimeline(){
  const logs = ST.bodyLogs || [];
  const meas = ST.bodyMeasurements || [];
  const quick = ST.weightLogs || [];
  const daily = weighInsByDay(quick, logs, meas);
  const quickDates = new Set(quick.filter(q => q.date && q.weight_kg != null && isFinite(Number(q.weight_kg))).map(q => q.date));
  const logDates = new Set(logs.map(l => l.date));
  const out = [];
  for(const q of quick){
    if(!quickDates.has(q.date) || logDates.has(q.date)) continue;
    out.push({
      date: q.date,
      _ts: new Date(q.date).getTime(),
      source: 'log',
      id: null,                 // nessuna riga body_logs: si cancella da weight_logs per data
      quick: true,
      weight_kg: Number(q.weight_kg),
      waist_cm: null, hip_cm: null, chest_cm: null, bf_pct: null, visceral_fat: null, body_age: null,
    });
    quickDates.delete(q.date);  // weight_logs è UNIQUE(user_id,date): una riga per giorno comunque
  }
  for(const l of logs){
    const pesata = daily[l.date];
    const conRapida = !!(pesata && pesata.rank === 0);
    out.push({
      date: l.date,
      _ts: new Date(l.date).getTime(),
      source: 'log',
      id: l.id,                 // body_logs.id — per delete
      quick: conRapida,         // c'è anche una pesata rapida quel giorno: si cancellano entrambe
      weight_kg:    conRapida ? pesata.v : (l.weight_kg ?? null),
      waist_cm:     l.waist_cm ?? null,
      hip_cm:       l.hip_cm ?? null,
      chest_cm:     l.chest_cm ?? null,
      bf_pct:       l.bf_pct ?? null,
      visceral_fat: l.visceral_fat ?? null,
      body_age:     l.body_age ?? null,
    });
  }
  for(const m of meas){
    // created_at è timestamptz: la data per la UI è la parte YYYY-MM-DD
    const dateStr = (m.created_at || '').slice(0,10);
    const giorno = m.created_at ? dayKey(new Date(m.created_at)) : null;
    const battuto = !!(giorno && daily[giorno] && daily[giorno].rank < 2);   // pesata rapida o log lo stesso giorno
    out.push({
      date: dateStr,
      _ts: new Date(m.created_at).getTime(),
      source: 'check',
      id: m.id,                 // body_measurements.id
      check_id: m.check_id,     // body_checks.id — per delete cascade
      weight_kg:    battuto ? null : (m.weight_kg ?? null),
      check_weight_kg: m.weight_kg ?? null,
      waist_cm:     m.waist_cm ?? null,
      hip_cm:       m.hips_cm ?? null,
      chest_cm:     m.chest_cm ?? null,
      bf_pct:       m.body_fat_pct ?? null,
      visceral_fat: m.visceral_fat ?? null,
      body_age:     m.metabolic_age ?? null,
    });
  }
  out.sort((a,b) => b._ts - a._ts);
  return out;
}

async function saveBodyLog(){
  if(!ST.user) return;
  const today = todayKey();
  const weight   = parseFloat(document.getElementById('bl-weight')?.value);
  const waist    = parseFloat(document.getElementById('bl-waist')?.value);
  const bf       = parseFloat(document.getElementById('bl-bf')?.value);
  const muscle   = parseFloat(document.getElementById('bl-muscle')?.value);
  const visceral = parseFloat(document.getElementById('bl-visceral')?.value);
  const hip      = parseFloat(document.getElementById('bl-hip')?.value);
  const chest    = parseFloat(document.getElementById('bl-chest')?.value);
  const bicep    = parseFloat(document.getElementById('bl-bicep')?.value);
  const bodyAge  = parseInt(document.getElementById('bl-bodyage')?.value);
  const notes    = document.getElementById('bl-notes')?.value?.trim();

  const payload = { user_id: ST.user.id, date: today };
  if(!isNaN(weight))   payload.weight_kg    = weight;
  if(!isNaN(waist))    payload.waist_cm     = waist;
  if(!isNaN(bf))       payload.bf_pct       = bf;
  if(!isNaN(muscle))   payload.muscle_kg    = muscle;
  if(!isNaN(visceral)) payload.visceral_fat = visceral;
  if(!isNaN(hip))      payload.hip_cm       = hip;
  if(!isNaN(chest))    payload.chest_cm     = chest;
  if(!isNaN(bicep))    payload.bicep_cm     = bicep;
  if(!isNaN(bodyAge))  payload.body_age     = bodyAge;
  if(notes)            payload.notes        = notes;

  ST.bodySaving = true;
  renderBody();

  // Controlla se esiste già un record per oggi
  const { data: existing } = await supa.from('body_logs')
    .select('id')
    .eq('user_id', ST.user.id)
    .eq('date', today)
    .maybeSingle();

  let error;
  if(existing?.id){
    const { error: updateErr } = await supa.from('body_logs').update(payload).eq('id', existing.id);
    error = updateErr;
  } else {
    const { error: insertErr } = await supa.from('body_logs').insert(payload);
    error = insertErr;
  }

  ST.bodySaving = false;
  if(error){ alert('Errore: '+error.message); renderBody(); return; }

  if(!isNaN(weight)){
    await dbq('salvare il peso', supa.from('profiles').update({weight_kg: weight, updated_at: new Date().toISOString()}).eq('id', ST.user.id));
    if(ST.profile) ST.profile.weight_kg = weight;
  }
  await loadBodyLogs();
}

// ── Eliminazione log Body (body_logs veloce + body_measurements check M2) ──
function confirmDeleteBodyLog(kind, id, checkId, date){
  ST.bodyDeleteConfirm = { kind, id, checkId: checkId || null, date };
  renderBody();
}

async function deleteBodyLogConfirmed(){
  const c = ST.bodyDeleteConfirm;
  if(!c){ return; }
  ST.bodyDeleteConfirm = null;
  try {
    if(c.kind === 'log'){
      // Una riga di "Ultimi log" può essere un body_logs, una pesata rapida (weight_logs,
      // UNIQUE per giorno) o entrambi lo stesso giorno: si cancella ciò che la riga mostra.
      if(c.id){
        const { error } = await dbq('eliminare il log del corpo', supa.from('body_logs').delete().eq('id', c.id).eq('user_id', ST.user.id), { silenzioso:true });
        if(error) throw error;
      }
      if((ST.weightLogs || []).some(q => q.date === c.date)){
        const { error } = await dbq('eliminare la pesata', supa.from('weight_logs').delete().eq('user_id', ST.user.id).eq('date', c.date), { silenzioso:true });
        if(error) throw error;
      }
    } else {
      // Check M2: prima cancella le foto da Storage, poi la riga body_checks
      // (ON DELETE CASCADE rimuove body_check_photos + body_measurements).
      try {
        const { data: photos } = await supa.from('body_check_photos')
          .select('storage_path').eq('check_id', c.checkId);
        const paths = (photos || []).map(p => p.storage_path).filter(Boolean);
        if(paths.length){
          const { error: stErr } = await supa.storage.from('body-check-photos').remove(paths);
          if(stErr) console.warn('[body-delete] storage remove (best-effort):', stErr);
        }
      } catch(stEx){ console.warn('[body-delete] storage remove exception (best-effort):', stEx); }
      const { error } = await supa.from('body_checks').delete().eq('id', c.checkId);
      if(error) throw error;
    }
    await loadBodyLogs();   // ricarica + re-render + updateHeaderWeight
    showToast(c.kind === 'log' ? 'Log eliminato' : 'Check fisico eliminato', '✅', 4000);
  } catch(e){
    console.error('[body-delete] error:', e);
    showToast('Errore eliminazione: ' + e.message, '⚠️', 5500);
    renderBody();
  }
}

// ── Dettaglio check fisico M2 (overlay full-screen) ──
async function openBodyCheckDetail(checkId){
  if(!checkId || !ST.user) return;
  showToast('Carico il check…');
  try {
    // Misure/composizione: già in memoria da loadBodyLogs()
    const meas = (ST.bodyMeasurements || []).find(m => m.check_id === checkId) || null;
    // Stato + timestamp del check
    const { data: check } = await supa.from('body_checks')
      .select('id, status, created_at, notes').eq('id', checkId).maybeSingle();
    const createdAt = check?.created_at || meas?.created_at || null;
    // Foto: signed URL temporanei (1h)
    const { data: photoRows } = await supa.from('body_check_photos')
      .select('pose, storage_path').eq('check_id', checkId);
    const photos = { front:null, right:null, left:null, back:null };
    for(const p of (photoRows || [])){
      if(!p.storage_path) continue;
      try {
        const { data: signed } = await supa.storage.from('body-check-photos')
          .createSignedUrl(p.storage_path, 3600);
        if(signed?.signedUrl && photos.hasOwnProperty(p.pose)) photos[p.pose] = signed.signedUrl;
      } catch(e){ console.warn('[bcd] signed url error:', p.pose, e); }
    }
    // Esami del sangue collegati: range ±30 giorni dalla data del check
    let blood = null;
    if(createdAt){
      const cd = new Date(createdAt);
      const from = new Date(cd); from.setDate(from.getDate() - 30);
      const to   = new Date(cd); to.setDate(to.getDate() + 30);
      const { data: bloods } = await supa.from('blood_tests')
        .select('*').eq('user_id', ST.user.id)
        .gte('test_date', from.toISOString().slice(0,10))
        .lte('test_date', to.toISOString().slice(0,10))
        .order('test_date', { ascending:false }).limit(1);
      blood = (bloods && bloods[0]) || null;
    }
    // Lettura delle foto già fatta, e se esiste un check con cui confrontare (decide il testo del pulsante)
    const [ai, prevId] = await Promise.all([loadBodyCheckAI(checkId), bcaPreviousCheckId(checkId).catch(() => null)]);
    ST.bodyCheckDetail = { checkId, status: check?.status || 'completed', createdAt, notes: check?.notes || null, meas, photos, blood, ai, hasPrevious: !!prevId };
    renderBodyCheckDetail();
  } catch(e){
    console.error('[bcd] open error:', e);
    showToast('Errore apertura check: ' + e.message);
  }
}

function closeBodyCheckDetail(){
  ST.bodyCheckDetail = null;
  document.getElementById('body-check-detail').style.display = 'none';
}

function openBodyCheckPhoto(url, label){
  if(!url) return;
  document.getElementById('bcd-photo-modal-img').src = url;
  document.getElementById('bcd-photo-modal-lbl').textContent = label || '';
  document.getElementById('bcd-photo-modal').style.display = 'flex';
}
function closeBodyCheckPhoto(){
  document.getElementById('bcd-photo-modal').style.display = 'none';
  document.getElementById('bcd-photo-modal-img').src = '';
}

// ── Lettura delle foto del check (Worker /vision-check → Gemini) ──
// Suggerimento, mai automatico: parte solo da un tocco, si salva in body_check_ai
// (lo scrive il Worker), l'app la mostra e basta.
const BCA_OVERALL = { migliorato:'Migliorato', stabile:'Stabile', peggiorato:'Peggiorato', primo_check:'Primo check' };
const BCA_CONF = { bassa:{ lbl:'Affidabilità bassa', col:'#9A968C' }, media:{ lbl:'Affidabilità media', col:'var(--warn)' }, alta:{ lbl:'Affidabilità alta', col:'#2A7A6F' } };
const BCA_POSE = { front:'frontale', right:'di profilo destro', left:'di profilo sinistro', back:'da dietro' };
const BCA_TIPS = {
  'luce diversa':          'Scatta con la stessa luce: stessa stanza e stessa ora del giorno.',
  'distanza diversa':      'Tieni il telefono alla stessa distanza, sempre a figura intera.',
  'posa diversa':          'Ripeti la stessa posa: braccia lungo i fianchi, piedi alla larghezza delle anche.',
  'sfondo diverso':        'Usa lo stesso sfondo, meglio una parete chiara e sgombra.',
  'abbigliamento diverso': 'Indossa lo stesso abbigliamento del check precedente.',
  'luce scarsa':           'Cerca una luce frontale e uniforme, senza controluce.',
  'foto sfocata':          'Appoggia il telefono o usa il timer: foto ferme e nitide.',
  'inquadratura parziale': 'Inquadra tutto il corpo, dalla testa ai piedi.',
};
function bcaTip(issue){
  const m = /^foto mancante: (\w+)$/.exec(issue);
  if(m) return `Scatta anche la foto ${BCA_POSE[m[1]] || m[1]}.`;
  return BCA_TIPS[issue] || null;
}
function bcaTableMissing(err){ return !!err && (err.code === 'PGRST205' || err.code === '42P01'); }
// Il check completato subito prima di questo: è quello con cui si confrontano le foto.
async function bcaPreviousCheckId(checkId){
  let checks = ST.bodyChecks;
  if(!checks || !checks.some(c => c.id === checkId)){
    const res = await dbq('leggere i check fisici', supa.from('body_checks').select('id, status, created_at').eq('user_id', ST.user.id), { silenzioso:true });
    checks = res.data || [];
  }
  const cur = checks.find(c => c.id === checkId);
  if(!cur) return null;
  const prima = checks.filter(c => c.status === 'completed' && c.id !== checkId && new Date(c.created_at) < new Date(cur.created_at))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return prima[0] ? prima[0].id : null;
}
async function loadBodyCheckAI(checkId){
  const res = await dbq('leggere la lettura delle foto', supa.from('body_check_ai').select('*').eq('check_id', checkId).maybeSingle(), { silenzioso:true });
  if(res.error) return null;      // tabella assente o lettura fallita: resta il pulsante
  return res.data || null;
}
function bcaErrorMessage(status, err){
  const kind = err && err.kind;
  if(status === 0) return 'Connessione assente: riprova quando sei online';
  if(kind === 'too-soon') return 'Ho appena letto queste foto: riprova tra qualche minuto';
  if(kind === 'in-progress') return 'Sto già guardando queste foto';
  if(status === 401) return 'Sessione scaduta: esci, rientra e riprova';
  if(status === 403) return 'Non posso leggere questo check';
  if(kind === 'no-photos') return 'Non trovo le foto di questo check';
  if(kind === 'table-missing') return 'La lettura delle foto non è ancora attiva';
  if(kind === 'timeout' || status === 504) return 'Ci ho messo troppo: riprova tra poco';
  if(kind === 'daily-limit') return 'Per oggi ho letto abbastanza foto: riprova domani';
  if(kind === 'rate-limit') return 'Troppe richieste in questo momento: riprova tra poco';
  return 'Non sono riuscito a leggere le foto: riprova tra poco';
}
async function requestBodyCheckAI(checkId){
  if(!ST.user || !checkId || ST.bodyCheckAIBusy) return;
  ST.bodyCheckAIBusy = checkId;
  if(ST.bodyCheckDetail && ST.bodyCheckDetail.checkId === checkId) renderBodyCheckDetail();
  try {
    const prevId = await bcaPreviousCheckId(checkId);
    const { data: { session } } = await supa.auth.getSession();
    if(!session || !session.access_token){ showToast(bcaErrorMessage(401), '⚠️', 5500); return; }
    let r, j = null;
    try {
      r = await fetch(WORKER_URL + '/vision-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ user_id: ST.user.id, check_id_current: checkId, check_id_previous: prevId }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(75000) : undefined,
      });
      j = await r.json().catch(() => null);
    } catch(e){
      console.warn('[bca] rete:', e && e.name);
      showToast(e && e.name === 'TimeoutError' ? bcaErrorMessage(504) : bcaErrorMessage(0), '⚠️', 5500);
      return;
    }
    // Come Groq e supabase-js: una risposta d'errore arriva regolare, si controlla a mano (L36)
    if(!r.ok || !j || !j.reading){
      const err = j && j.error;
      console.warn('[bca] lettura non riuscita:', r.status, err && err.kind);
      showToast(bcaErrorMessage(r.status, err), '⚠️', 5500);
      return;
    }
    ST.bodyCheckAI = ST.bodyCheckAI || {};
    ST.bodyCheckAI[checkId] = j.reading;
    if(ST.bodyCheckDetail && ST.bodyCheckDetail.checkId === checkId) ST.bodyCheckDetail.ai = j.reading;
  } finally {
    ST.bodyCheckAIBusy = null;
    if(ST.bodyCheckDetail && ST.bodyCheckDetail.checkId === checkId) renderBodyCheckDetail();
  }
}
function bcaCardHTML(d){
  if(d.status !== 'completed' || !ST.user || ST.user.id === 'test-user-001') return '';
  const nota = `<div class="bca-note">Lettura indicativa basata sulle foto: contano più le misure e la tendenza del peso.</div>`;
  const head = `<div class="bca-head"><span class="bca-dot" style="background:#5E4A7A;"></span><span class="bca-title">Lettura di ${COACH_NAME}</span></div>`;
  const a = d.ai;
  if(!a || !a.result){
    const busy = ST.bodyCheckAIBusy === d.checkId;
    const label = d.hasPrevious === false ? `Fai leggere le foto a ${COACH_NAME} →` : `Confronta le foto con ${COACH_NAME} →`;
    return `<div class="bca-card">${head}
      <button class="bca-btn" onclick="requestBodyCheckAI('${d.checkId}')" ${busy || ST.bodyCheckAIBusy ? 'disabled' : ''}>
        ${busy ? '<span class="bca-spin"></span>Sto guardando le foto…' : label}
      </button>${nota}</div>`;
  }
  const res = a.result;
  const conf = BCA_CONF[res.confidence] || BCA_CONF.bassa;
  const aree = (res.areas || []).filter(x => x.change !== 'uguale' && x.change !== 'non valutabile');
  const pq = res.photo_quality || {};
  const consigli = pq.ok === false ? [...new Set((pq.issues || []).map(bcaTip).filter(Boolean))] : [];
  let meta = '';
  if(a.previous_check_id){
    const prev = (ST.bodyChecks || []).find(c => c.id === a.previous_check_id);
    const giorni = res.meta && res.meta.days_between;
    meta = `Confronto con il check${prev ? ' del ' + fmtDate(dayKey(new Date(prev.created_at))) : ' precedente'}${giorni != null ? ' · ' + giorni + ' giorni' : ''}`;
  } else meta = 'Primo check: niente confronto';
  return `<div class="bca-card">${head}
    <div class="bca-top"><span class="bca-overall">${BCA_OVERALL[res.overall] || esc(res.overall)}</span>
      <span class="bca-conf"><span class="bca-dot" style="background:${conf.col};"></span>${conf.lbl}</span></div>
    <p class="bca-summary">${esc(res.summary)}</p>
    ${aree.length ? `<ul class="bca-areas">${aree.map(x => `<li><span class="bca-zone">${esc(x.zona)} · ${esc(x.change)}</span>${esc(x.note)}</li>`).join('')}</ul>` : ''}
    ${!res.suggested_focus ? '' : res.overall === 'primo_check'
      // Primo check: il consiglio parla già del prossimo check, un'etichetta lo ripeterebbe
      ? `<div class="bca-focus">${esc(res.suggested_focus)}</div>`
      : `<div class="bca-focus"><b>Nelle prossime 4 settimane:</b> ${esc(res.suggested_focus.charAt(0).toLowerCase() + res.suggested_focus.slice(1))}</div>`}
    ${consigli.length ? `<div class="bca-tips">Per un confronto migliore la prossima volta:<ul>${consigli.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
    <div class="bca-meta">${meta}</div>
    ${nota}</div>`;
}
// Fine flusso M2: si propone la lettura, non la si lancia. Solo se c'è un check con cui confrontare.
async function bcaOfferAfterCheck(checkId){
  if(!checkId || !ST.user || ST.user.id === 'test-user-001') return;
  let prevId = null;
  try { prevId = await bcaPreviousCheckId(checkId); } catch(e){ return; }
  if(!prevId) return;
  const old = document.getElementById('bca-offer'); if(old) old.remove();
  const el = document.createElement('div');
  el.id = 'bca-offer';
  el.className = 'bca-offer';
  el.innerHTML = `Vuoi che ${COACH_NAME} confronti le foto con l'ultimo check?
    <div class="bca-offer-row">
      <button class="bca-offer-no" onclick="bcaOfferClose()">Non ora</button>
      <button class="bca-offer-yes" onclick="bcaOfferAccept('${checkId}')">Confronta →</button>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => { if(document.getElementById('bca-offer') === el) el.remove(); }, 15000);
}
function bcaOfferClose(){ const el = document.getElementById('bca-offer'); if(el) el.remove(); }
async function bcaOfferAccept(checkId){
  bcaOfferClose();
  ST.bodyTab = 'check';
  showPage('body');
  await openBodyCheckDetail(checkId);
  if(!(ST.bodyCheckDetail && ST.bodyCheckDetail.ai)) requestBodyCheckAI(checkId);
}

function renderBodyCheckDetail(){
  const d = ST.bodyCheckDetail;
  const host = document.getElementById('body-check-detail');
  if(!d){ host.style.display = 'none'; return; }
  const m = d.meas || {};
  const imperial = m.unit_system === 'imperial';
  // Conversione per visualizzazione (DB sempre metrico)
  const toW = (kg) => kg == null ? null : (imperial ? (kg * 2.2046).toFixed(1) : kg);
  const toL = (cm) => cm == null ? null : (imperial ? (cm / 2.54).toFixed(1) : cm);
  const uW = imperial ? 'lb' : 'kg';
  const uL = imperial ? 'in' : 'cm';

  // Header data + ora
  let dateLabel = '—';
  if(d.createdAt){
    const dt = new Date(d.createdAt);
    dateLabel = dt.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'})
      + ' · ' + dt.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  }
  const incompleteBadge = d.status !== 'completed'
    ? `<div style="display:inline-block;font-size:10px;font-family:var(--font-mono);color:#B84C2A;border:1px solid #B84C2A;border-radius:4px;padding:2px 6px;margin-top:6px;text-transform:uppercase;letter-spacing:.5px;">Check fisico incompleto</div>`
    : '';

  // Foto griglia 2×2
  const POSE_LBL = { front:'Frontale', right:'Lato dx', left:'Lato sx', back:'Retro' };
  const photoCell = (pose) => {
    const url = d.photos?.[pose] || null;
    const lbl = POSE_LBL[pose];
    const inner = url
      ? `<img src="${url}" alt="${lbl}" onclick="openBodyCheckPhoto('${url}','${lbl}')" onerror="this.parentElement.innerHTML='<div style=\\'height:140px;display:flex;align-items:center;justify-content:center;background:var(--s2);color:var(--t3);font-size:11px;font-family:var(--font-mono);\\'>Foto non disponibile</div>'" style="width:100%;height:140px;object-fit:cover;display:block;cursor:pointer;background:var(--s2);">`
      : `<div style="height:140px;display:flex;align-items:center;justify-content:center;background:var(--s2);color:var(--t3);font-size:11px;font-family:var(--font-mono);">Foto non disponibile</div>`;
    return `<div style="border:1px solid var(--b1);border-radius:10px;overflow:hidden;">
      ${inner}
      <div style="padding:6px 8px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.5px;color:var(--t2);text-align:center;">${lbl}</div>
    </div>`;
  };

  // Riga misura helper
  const measRow = (label, val, unit) => val == null ? '' : `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--s2);">
      <span style="font-size:12px;color:var(--t2);font-family:var(--font-sans);">${label}</span>
      <span style="font-size:12px;font-family:var(--font-mono);color:var(--t1);font-weight:700;">${val} ${unit}</span>
    </div>`;

  const measHTML = [
    measRow('Peso', toW(m.weight_kg), uW),
    measRow('Altezza', toL(m.height_cm), uL),
    measRow('Vita', toL(m.waist_cm), uL),
    measRow('Petto', toL(m.chest_cm), uL),
    measRow('Fianchi', toL(m.hips_cm), uL),
    measRow('Spalle', toL(m.shoulders_cm), uL),
    measRow('Collo', toL(m.neck_cm), uL),
    measRow('Bicipite', toL(m.biceps_cm), uL),
    measRow('Polso', toL(m.wrist_cm), uL),
    measRow('Coscia', toL(m.thigh_cm), uL),
    measRow('Polpaccio', toL(m.calf_cm), uL),
  ].join('');

  // Composizione: solo campi non-null
  const compRows = [
    measRow('Grasso corporeo', m.body_fat_pct, '%'),
    measRow('Massa muscolare', m.muscle_mass_kg, 'kg'),
    measRow('Grasso viscerale', m.visceral_fat, ''),
    measRow('Età metabolica', m.metabolic_age, 'anni'),
    measRow('Acqua corporea', m.body_water_pct, '%'),
  ].join('');
  const hasComp = !!(m.body_fat_pct != null || m.muscle_mass_kg != null || m.visceral_fat != null || m.metabolic_age != null || m.body_water_pct != null);

  // Esami del sangue collegati
  let bloodHTML = '';
  if(d.blood){
    const b = d.blood;
    const bRow = (label, val, unit) => val == null ? '' : `
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--s2);">
        <span style="font-size:12px;color:var(--t2);font-family:var(--font-sans);">${label}</span>
        <span style="font-size:12px;font-family:var(--font-mono);color:var(--t1);font-weight:700;">${val} ${unit}</span>
      </div>`;
    const bRows = BLOOD_FIELDS.map(f => bRow(f.label, b[f.key], f.unit)).join('');
    if(bRows.trim()){
      const bDate = b.test_date ? fmtDate(b.test_date) : '';
      bloodHTML = `
        <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
          <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:4px;">Esami del sangue</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-bottom:10px;">${bDate}</div>
          ${bRows}
        </div>`;
    }
  }

  host.innerHTML = `
    <div style="max-width:560px;margin:0 auto;padding:0 0 60px;">
      <div style="position:sticky;top:0;background:var(--bg);padding:16px 16px 12px;padding-top:calc(16px + env(safe-area-inset-top));border-bottom:1px solid var(--b1);z-index:2;">
        <button onclick="closeBodyCheckDetail()" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--acc);font-family:var(--font-sans);font-weight:600;padding:0;margin-bottom:8px;">← Indietro</button>
        <div style="font-size:20px;font-weight:700;color:var(--t1);font-family:var(--font-sans);">Check fisico</div>
        <div style="font-size:12px;color:var(--t3);font-family:var(--font-mono);margin-top:2px;">${dateLabel}</div>
        ${incompleteBadge}
      </div>
      <div style="padding:16px;">
        <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:10px;">Foto</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          ${photoCell('front')}${photoCell('right')}${photoCell('left')}${photoCell('back')}
        </div>

        ${bcaCardHTML(d)}

        ${measHTML.trim() ? `
        <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
          <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:6px;">Misure</div>
          ${measHTML}
        </div>` : ''}

        ${hasComp ? `
        <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
          <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:6px;">Composizione</div>
          ${compRows}
        </div>` : ''}

        ${bloodHTML}
      </div>
    </div>`;
  host.style.display = 'block';
  host.scrollTop = 0;
}

// ── Tab Tendenza Body ──────────────────────────────────────
function bodyTrendRangeDays(range){
  return range === '7d' ? 7 : range === '90d' ? 90 : range === 'all' ? Infinity : 30;
}
function filterTimelineByRange(tl, range){
  const days = bodyTrendRangeDays(range);
  if(days === Infinity) return tl.slice();
  const cutoff = Date.now() - days * 86400000;
  return tl.filter(r => r._ts >= cutoff);
}
// Sparkline SVG inline: values in ordine cronologico ASC. ViewBox 100×40.
function sparklineSVG(values, color){
  const n = values.length;
  if(n < 2) return '';
  const min = Math.min(...values), max = Math.max(...values);
  const span = (max - min) || 1;
  const pts = values.map((v,i) => {
    const x = (i/(n-1))*100;
    const y = 40 - ((v-min)/span)*36 - 2;
    return x.toFixed(2)+','+y.toFixed(2);
  });
  const area = `M${pts[0]} L${pts.slice(1).join(' L')} L100,40 L0,40 Z`;
  return `<svg viewBox="0 0 100 40" preserveAspectRatio="none" style="width:100%;height:44px;display:block;margin-top:8px;">
    <path d="${area}" fill="${color}" fill-opacity="0.12"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}
// Formatta un valore metrica: 1 decimale, rimuove .0
function fmtMetric(v){
  if(v == null || isNaN(v)) return '—';
  const r = Math.round(v * 10) / 10;
  return (r % 1 === 0) ? String(r) : r.toFixed(1);
}
// Formatta una misura di precisione (peso/vita/fianchi/petto): 2 decimali,
// zeri finali rimossi — coerente col pillolino header e la tab Misure.
function fmtMeasure(v){
  if(v == null || isNaN(v)) return '—';
  return Number(v).toFixed(2).replace(/\.?0+$/, '');
}
// Data compatta "13 mag" da YYYY-MM-DD o ISO
function trendShortDate(s){
  const MON = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const d = new Date((s||'').length === 10 ? s+'T12:00:00' : s);
  if(isNaN(d)) return '';
  return d.getDate() + ' ' + MON[d.getMonth()];
}
// Suffisso copy per il delta delle card metriche: "negli ultimi N giorni"
// oppure "dal {data primo punto}" quando l'intervallo è "Tutto".
function trendRangeSuffix(range, firstDateStr){
  if(range === 'all') return 'dal ' + trendShortDate(firstDateStr);
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  return `negli ultimi ${days} giorni`;
}

function renderBodyTrend(){
  const timeline = getUnifiedBodyTimeline();   // DESC
  const uData    = getLatestBodyData();
  const range    = ST.bodyTrendRange || '30d';

  // ── Stato vuoto generale ──
  if(timeline.length === 0){
    return `<div style="padding:60px 20px;text-align:center;">
      <div style="color:var(--t3);font-size:13px;font-family:var(--font-mono);line-height:1.8;margin-bottom:16px;">Nessun dato ancora.<br>Inizia a tracciare per vedere il tuo andamento qui.</div>
      <button onclick="ST.bodyTab='misure';renderBody();" style="padding:10px 20px;background:#854F0B;color:#fff;border:none;border-radius:var(--r);font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Vai a Misure →</button>
    </div>`;
  }

  // ── Sezione A — selettore intervallo ──
  const rangeOpts = [['7d','7g'],['30d','30g'],['90d','90g'],['all','Tutto']];
  const switchHTML = `<div class="trend-range-switch">${rangeOpts.map(([v,l]) =>
    `<button class="trend-range-btn${range===v?' active':''}" onclick="ST.bodyTrendRange='${v}';renderBody();">${l}</button>`).join('')}</div>`;

  // timeline filtrata per le card metriche, in ordine cronologico ASC
  const filtered = filterTimelineByRange(timeline, range).slice().sort((a,b) => a._ts - b._ts);
  const isGainObj = ['ipertrofia','forza_performance'].includes(ST.profile?.obiettivo);

  // ══ SEZIONE 1 — Progresso vs obiettivo ══
  let sec1 = '';
  {
    const w     = uData.weight_kg ?? ST.profile?.weight_kg ?? null;
    const goalW = ST.profile?.goal_weight_kg ?? null;
    if(timeline.length <= 1){
      sec1 = `<div class="trend-card">
        <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:6px;">Progresso</div>
        <div style="font-size:13px;color:var(--t3);font-family:var(--font-mono);">Inizia a tracciare per vedere il tuo progresso.</div>
      </div>`;
    } else {
      // hero stat
      let heroLine = `<span style="font-size:clamp(24px,5.5vw,32px);font-weight:700;font-family:var(--font-mono);color:var(--t1);">${fmtMeasure(w)}<span style="font-size:14px;color:var(--t3);"> kg</span></span>`;
      let targetLine = '';
      if(goalW != null && w != null){
        const dToTarget = w - goalW;
        const absD = fmtMeasure(Math.abs(dToTarget));
        targetLine = `<div style="font-size:12px;color:var(--t2);font-family:var(--font-mono);margin-top:4px;">→ ${goalW} kg · ${dToTarget>0?'−':dToTarget<0?'+':''}${absD} kg al target</div>`;
      }
      // barra progresso
      let barHTML = '';
      if(w != null && goalW != null){
        const wPts = timeline.filter(r => r.weight_kg != null);
        const startW = wPts.length ? wPts[wPts.length-1].weight_kg : w;
        const total = Math.abs(startW - goalW);
        const done  = total > 0 ? Math.min(100, Math.round(Math.abs(startW - w) / total * 100)) : 0;
        barHTML = `<div style="height:7px;background:var(--s2);border-radius:var(--r-pill);overflow:hidden;margin-top:10px;">
          <div style="height:100%;width:${done}%;background:#854F0B;border-radius:var(--r-pill);"></div>
        </div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:3px;">${done}% completato</div>`;
      }
      // statistica complementare nell'intervallo
      let complHTML = '';
      const fw = filtered.filter(r => r.weight_kg != null);
      if(fw.length >= 2){
        const firstW = fw[0].weight_kg, lastW = fw[fw.length-1].weight_kg;
        const diff = lastW - firstW;
        const nDays = Math.max(1, Math.round((fw[fw.length-1]._ts - fw[0]._ts) / 86400000));
        let txt;
        if(Math.abs(diff) < 0.05){
          txt = `Stabile a ${fmtMeasure(lastW)} kg negli ultimi ${nDays} giorni`;
        } else if(isGainObj){
          txt = diff > 0
            ? `Hai guadagnato ${fmtMeasure(Math.abs(diff))} kg in ${nDays} giorni`
            : `Hai perso ${fmtMeasure(Math.abs(diff))} kg in ${nDays} giorni`;
        } else {
          txt = diff < 0
            ? `Hai perso ${fmtMeasure(Math.abs(diff))} kg in ${nDays} giorni`
            : `Hai preso ${fmtMeasure(Math.abs(diff))} kg in ${nDays} giorni`;
        }
        complHTML = `<div style="font-size:12px;color:var(--t2);font-family:var(--font-mono);margin-top:12px;padding-top:10px;border-top:1px solid var(--s2);">${txt}</div>`;
      }
      sec1 = `<div class="trend-card">
        <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:8px;">Progresso verso l'obiettivo</div>
        ${heroLine}${targetLine}${barHTML}${complHTML}
      </div>`;
    }
  }

  // ══ SEZIONE 2 — Evoluzione del corpo ══
  let sec2 = '';
  {
    const H = uData.height_cm ?? ST.profile?.height_cm ?? null;
    const metricDefs = [
      { name:'Peso',            unit:'kg', col:'#854F0B', get: r => r.weight_kg, goodDown: !isGainObj, precise: true },
      { name:'Vita',            unit:'cm', col:'#854F0B', get: r => r.waist_cm,  goodDown: true, precise: true },
      { name:'BF%',             unit:'%',  col:'#854F0B', get: r => r.bf_pct,    goodDown: true },
      { name:'Massa magra',     unit:'kg', col:'#2A7A6F', get: r => (r.weight_kg!=null && r.bf_pct!=null) ? r.weight_kg*(1-r.bf_pct/100) : null, goodDown: false },
      { name:'Massa grassa',    unit:'kg', col:'#854F0B', get: r => (r.weight_kg!=null && r.bf_pct!=null) ? r.weight_kg*(r.bf_pct/100) : null,   goodDown: true },
      { name:'Fianchi',         unit:'cm', col:'#854F0B', get: r => r.hip_cm,    goodDown: true, precise: true },
      { name:'Petto',           unit:'cm', col:'#854F0B', get: r => r.chest_cm,  goodDown: true, precise: true },
      { name:'Grasso viscerale',unit:'',   col:'#854F0B', get: r => r.visceral_fat, goodDown: true },
      { name:'BMI',             unit:'',   col:'#854F0B', get: r => (H && r.weight_kg!=null) ? r.weight_kg/((H/100)**2) : null, goodDown: true },
    ];
    const cards = metricDefs.map(def => {
      const fmt = def.precise ? fmtMeasure : fmtMetric;
      const pts  = filtered.filter(r => { const v = def.get(r); return v != null && !isNaN(v); });
      const vals = pts.map(def.get);
      if(vals.length === 0) return '';
      const curr = vals[vals.length-1];
      if(vals.length === 1){
        return `<div class="trend-metric-card">
          <div class="trend-metric-name">${def.name}</div>
          <div><span class="trend-metric-val">${fmt(curr)}</span><span class="trend-metric-unit">${def.unit}</span></div>
          <div class="trend-metric-note">Aggiungi nuovi log per vedere l'andamento</div>
        </div>`;
      }
      const init = vals[0];
      const delta = curr - init;
      let deltaCol = 'var(--t3)';
      if(Math.abs(delta) >= 0.05){
        const good = def.goodDown ? (delta < 0) : (delta > 0);
        deltaCol = good ? '#2A7A6F' : '#B84C2A';
      }
      const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
      const suffix = trendRangeSuffix(range, pts[0].date);
      const deltaTxt = Math.abs(delta) < 0.05
        ? `Invariato ${suffix}`
        : `${sign}${fmt(Math.abs(delta))} ${def.unit} ${suffix}`;
      return `<div class="trend-metric-card">
        <div class="trend-metric-name">${def.name}</div>
        <div><span class="trend-metric-val">${fmt(curr)}</span><span class="trend-metric-unit">${def.unit}</span></div>
        <div class="trend-metric-delta" style="color:${deltaCol};">${deltaTxt}</div>
        ${sparklineSVG(vals, def.col)}
      </div>`;
    }).filter(Boolean).join('');
    if(cards){
      sec2 = `<div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin:4px 0 10px;">Evoluzione del corpo</div>
        <div class="trend-metric-grid">${cards}</div>`;
    }
  }

  // ══ SEZIONE 3 — Confronto check fisici M2 ══
  let sec3 = '';
  {
    const completedIds = new Set((ST.bodyChecks || []).filter(c => c.status === 'completed').map(c => c.id));
    // check completed con misure, ordinati cronologicamente ASC
    const checks = (ST.bodyMeasurements || [])
      .filter(m => completedIds.has(m.check_id))
      .slice()
      .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    if(checks.length >= 2){
      // selezione coppia: nel range se ≠ 'all' e ce ne sono ≥2, altrimenti primo/ultimo assoluti
      let pair = [checks[0], checks[checks.length-1]];
      if(range !== 'all'){
        const cutoff = Date.now() - bodyTrendRangeDays(range) * 86400000;
        const inRange = checks.filter(c => new Date(c.created_at).getTime() >= cutoff);
        if(inRange.length >= 2) pair = [inRange[0], inRange[inRange.length-1]];
      }
      const [first, last] = pair;
      const days = Math.max(1, Math.round((new Date(last.created_at) - new Date(first.created_at)) / 86400000));
      // metriche confrontabili: nome, valore-getter dalla riga body_measurements
      const lean = m => (m.weight_kg!=null && m.body_fat_pct!=null) ? m.weight_kg*(1-m.body_fat_pct/100) : null;
      const fat  = m => (m.weight_kg!=null && m.body_fat_pct!=null) ? m.weight_kg*(m.body_fat_pct/100) : null;
      const cmpDefs = [
        { name:'Peso',            unit:'kg', get: m => m.weight_kg,      goodDown: !isGainObj },
        { name:'Vita',            unit:'cm', get: m => m.waist_cm,       goodDown: true },
        { name:'Fianchi',         unit:'cm', get: m => m.hips_cm,        goodDown: true },
        { name:'Petto',           unit:'cm', get: m => m.chest_cm,       goodDown: true },
        { name:'BF%',             unit:'%',  get: m => m.body_fat_pct,   goodDown: true },
        { name:'Massa magra',     unit:'kg', get: lean,                  goodDown: false },
        { name:'Massa grassa',    unit:'kg', get: fat,                   goodDown: true },
        { name:'Grasso viscerale',unit:'',   get: m => m.visceral_fat,   goodDown: true },
      ];
      const rows = cmpDefs.map(def => {
        const a = def.get(first), b = def.get(last);
        if(a == null || b == null) return '';
        const delta = b - a;
        let col = 'var(--t3)';
        if(Math.abs(delta) >= 0.05){
          const good = def.goodDown ? (delta < 0) : (delta > 0);
          col = good ? '#2A7A6F' : '#B84C2A';
        }
        const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
        const deltaTxt = Math.abs(delta) < 0.05 ? '±0' : `${sign}${fmtMetric(Math.abs(delta))} ${def.unit}`;
        return `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--s2);">
          <span style="font-size:12px;color:var(--t2);font-family:var(--font-sans);">${def.name}</span>
          <span style="font-size:12px;font-family:var(--font-mono);"><span style="font-weight:700;color:${col};">${deltaTxt}</span><span style="color:var(--t3);font-size:10px;margin-left:6px;">(${fmtMetric(b)} ${def.unit})</span></span>
        </div>`;
      }).filter(Boolean).join('');
      sec3 = `<div class="trend-card">
        <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:2px;">Tra il primo e l'ultimo check</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-bottom:10px;">dal ${trendShortDate(first.created_at)} al ${trendShortDate(last.created_at)} · ${days} giorni</div>
        ${rows || `<div style="font-size:12px;color:var(--t3);font-family:var(--font-mono);">Nessuna metrica confrontabile tra i due check.</div>`}
      </div>`;
    } else if(checks.length === 1){
      sec3 = `<div class="trend-card" style="text-align:center;">
        <div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.5;margin-bottom:12px;">Fai un nuovo check fisico per vedere come stai cambiando.</div>
        <button onclick="m2EntryIntro();" style="padding:10px 20px;background:#2A7A6F;color:#fff;border:none;border-radius:var(--r);font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Nuovo check fisico →</button>
      </div>`;
    }
    // checks.length === 0 → sec3 resta '' (card non mostrata)
  }

  return switchHTML + sec1 + sec2 + sec3;
}

// ── Reminder "check di fine blocco" ─────────────────────────
// Il mesociclo dura 6 settimane (42 giorni, stessa cadenza di getNextCheckpointInfo:
// se una cambia cambiano tutte e due). Quando il blocco e' finito e non c'e' un check
// completato nelle ultime 4 settimane, il tab Body lo dice — senza notifiche, che
// arrivano piu' avanti.
// Vale anche per chi un check non l'ha mai fatto: il primo blocco finito e' il
// momento in cui serve, e getNextCheckpointInfo() li' risponde hasCheck:false.
const BLOCK_DAYS = 42;          // durata mesociclo — vedi CYCLE_WEEKS (5 carico + 1 scarico)
const CHECK_RECENT_DAYS = 28;   // "recente" = ultime 4 settimane
// opts (facoltativo, Quadro settimanale): { nowTs, checks } — la stessa regola
// valutata a un istante passato e su un elenco di check fornito dal chiamante.
// Senza opts legge ST e Date.now() come sempre.
function getBlockCheckReminder(opts){
  const o = opts || {};
  const start = ST.profile && ST.profile.train_start_date;
  if(!start) return null;                                  // senza Training non c'e' blocco
  if(!o.checks && (ST.bodyMeasurements === null || ST.bodyChecks === null)) return null;   // ancora in caricamento
  // Regola in shared/quadro.js → blockCheckReminder (la stessa del quadro e del cron)
  return ZTQuadro.blockCheckReminder({ start, nowTs: o.nowTs != null ? o.nowTs : Date.now(), checks: o.checks || ST.bodyChecks || [] });
}

// CTA permanente del tab Body — visibile in TUTTI e tre i tab e in tutti gli stati.
// Prima il "Nuovo check fisico" c'era solo in alcuni: in Tendenza compariva solo con
// ESATTAMENTE un check, quindi chi ne ha due o piu' non aveva nessun modo di aprirne
// uno da li'. Il pulsante e' uno solo e passa sempre da m2EntryIntro(), che instrada
// da se' alla ripresa se un check e' rimasto in corso.
function _bodyCheckCtaHTML(){
  const inCorso = (ST.bodyChecks || []).some(c => c.status === 'in_progress');
  const label = inCorso ? 'Riprendi check fisico →' : 'Nuovo check fisico →';
  const btn = (full) => `<button onclick="m2EntryIntro();" style="${full ? 'width:100%;margin-top:10px;' : ''}padding:10px 16px;background:#5E4A7A;color:#fff;border:none;border-radius:var(--r);font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:pointer;white-space:nowrap;">${label}</button>`;
  const rem = getBlockCheckReminder();
  if(rem){
    const quando = rem.giorniDaUltimo === null
      ? 'Non ne hai ancora fatto uno.'
      : `L'ultimo è di ${rem.giorniDaUltimo} giorni fa.`;
    return `<div style="margin:12px 16px 0;background:#EDE9F8;border:1px solid #AFA9EC;border-radius:var(--r-lg);padding:14px 16px;">
      <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);letter-spacing:.06em;color:#5E4A7A;text-transform:uppercase;margin-bottom:4px;">Fine blocco</div>
      <div style="font-size:14px;font-weight:700;color:var(--t1);font-family:var(--font-sans);">È ora del check di fine blocco</div>
      <div style="font-size:12px;color:var(--t2);font-family:var(--font-sans);margin-top:2px;">${quando}</div>
      ${btn(true)}
    </div>`;
  }
  return `<div style="margin:12px 16px 0;display:flex;justify-content:flex-end;">${btn(false)}</div>`;
}

function renderBody(){
  if(ST.bodyTab === 'composizione') ST.bodyTab = 'misure';
  const tab = ST.bodyTab || 'misure';
  const tabs = [
    { id:'misure',   label:'Misure' },
    { id:'tendenza', label:'Tendenza' },
    { id:'check',    label:'Check' },
  ];
  const navHTML = `<nav class="nutrition-subnav">
    ${tabs.map(t=>`<button class="nsn-pill${tab===t.id?' active':''}" onclick="ST.bodyTab='${t.id}';renderBody();">${t.label}</button>`).join('')}
  </nav>`;

  let body = '';

  if(ST.bodyLogs === null || ST.bodyMeasurements === null){
    body = `<div style="padding:40px;text-align:center;color:var(--t3);font-size:13px;font-family:var(--font-mono);">Caricamento...</div>`;
    document.getElementById('page-body').innerHTML = navHTML + body;
    return;
  }

  const today    = todayKey();
  const logs     = ST.bodyLogs;                  // body_logs grezzi — usato solo per pre-popolare il form "Log misure"
  const todayLog = logs.find(l => l.date === today) || {};
  // Dati unificati body_logs + body_measurements
  const uData     = getLatestBodyData();
  const uTimeline = getUnifiedBodyTimeline();

  if(tab === 'misure'){
    const uWeights = getWeighIns();                // pesate rapide comprese: stesso peso attuale del quadro
    const uWaists  = uTimeline.filter(r => r.waist_cm != null);
    const w      = uData.weight_kg ?? ST.profile?.weight_kg ?? null;
    const wPrev  = uWeights.length > 1 ? uWeights[1].weight_kg : null;
    const wDate  = uWeights.length ? uWeights[0].date : null;
    const goalW  = ST.profile?.goal_weight_kg ?? null;
    const waist  = uData.waist_cm ?? null;
    const waistP = uWaists.length > 1 ? uWaists[1].waist_cm : null;

    let wTrend = '';
    if(w && wPrev){
      const diff = (w - wPrev).toFixed(1);
      const col  = diff > 0 ? '#B84C2A' : '#2A7A6F';
      wTrend = `<span style="font-size:12px;font-family:var(--font-mono);font-weight:700;color:${col};margin-left:6px;">${diff > 0 ? '+' : ''}${diff}</span>`;
    }

    let wProgressHTML = '';
    if(w && goalW){
      const startW = uWeights.length ? uWeights[uWeights.length-1].weight_kg : w;
      const total  = Math.abs(startW - goalW);
      const done   = total > 0 ? Math.min(100, Math.round(Math.abs(startW - w) / total * 100)) : 0;
      const dir    = goalW < w ? '▼' : '▲';
      wProgressHTML = `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono);">Obiettivo ${dir} ${goalW} kg</span>
            <span style="font-size:11px;font-weight:700;font-family:var(--font-mono);color:#854F0B;">${Math.abs(w - goalW).toFixed(1)} kg al target</span>
          </div>
          <div style="height:7px;background:var(--s2);border-radius:var(--r-pill);overflow:hidden;">
            <div style="height:100%;width:${done}%;background:#854F0B;border-radius:var(--r-pill);"></div>
          </div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:3px;">${done}% completato</div>
        </div>`;
    }

    let waistProgressHTML = '';
    if(waist){
      const waistGoal  = 85;
      const waistStart = 89;
      const total      = waistStart - waistGoal;
      const done       = total > 0 ? Math.max(0, Math.min(100, Math.round((waistStart - waist) / total * 100))) : 0;
      let waistTrend = '';
      if(waistP){
        const diff = (waist - waistP).toFixed(1);
        const col  = diff > 0 ? '#B84C2A' : '#2A7A6F';
        waistTrend = `<span style="font-size:11px;font-family:var(--font-mono);font-weight:700;color:${col};margin-left:4px;">${diff > 0 ? '+' : ''}${diff}</span>`;
      }
      waistProgressHTML = `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono);">Vita — obiettivo &lt; ${waistGoal} cm</span>
            <span style="font-size:11px;font-weight:700;font-family:var(--font-mono);color:#854F0B;">${waist} cm${waistTrend}</span>
          </div>
          <div style="height:7px;background:var(--s2);border-radius:var(--r-pill);overflow:hidden;">
            <div style="height:100%;width:${done}%;background:${waist<=waistGoal?'#2A7A6F':'#854F0B'};border-radius:var(--r-pill);"></div>
          </div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:3px;">${done}% completato (89 → 85 cm)</div>
        </div>`;
    }

    const fv  = (val, def='') => val != null ? val : def;
    const adv = ST.bodyAdvOpen;

    body = `
      <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
        <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:12px;">
          <span style="font-size:28px;font-weight:700;font-family:var(--font-mono);color:var(--t1);line-height:1;">${w ?? '—'}</span>
          ${w ? `<span style="font-size:13px;font-family:var(--font-mono);color:var(--t3);">kg</span>` : ''}
          ${wTrend}
          <span style="flex:1;"></span>
          <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono);">${wDate ? fmtDate(wDate) : ''}</span>
        </div>
        ${wProgressHTML}
        ${waistProgressHTML}
        ${!wProgressHTML && !waistProgressHTML ? `<div style="font-size:12px;color:var(--t3);font-family:var(--font-mono);">Imposta obiettivo peso nel profilo per vedere il progresso.</div>` : ''}
      </div>

      ${(() => {
        const cw        = uData.weight_kg ?? ST.profile?.weight_kg;
        const ch        = uData.height_cm ?? ST.profile?.height_cm;
        const cbf       = uData.bf_pct;
        const cvisceral = uData.visceral_fat;
        const cbodyAge  = uData.body_age;
        const cbmi      = (cw && ch) ? (cw / ((ch/100)**2)).toFixed(1) : null;
        const cbmiCat   = cbmi ? (cbmi < 18.5 ? 'Sottopeso' : cbmi < 25 ? 'Normopeso' : cbmi < 30 ? 'Sovrappeso' : 'Obeso') : '';
        const cbmiCol   = cbmi ? (cbmi < 18.5 ? '#185FA5' : cbmi < 25 ? '#2A7A6F' : cbmi < 30 ? '#854F0B' : '#B84C2A') : '#854F0B';
        const cfatMass  = (cw && cbf) ? (cw * cbf / 100).toFixed(1) : null;
        const cleanMass = (cw && cbf) ? (cw * (1 - cbf/100)).toFixed(1) : null;
        if(!cbmi && !cbf && !cvisceral && !cbodyAge) return '';
        const cstat = (label, value, unit, color='var(--t1)', sub='') => `
          <div style="background:var(--s2);border-radius:var(--r);padding:10px 12px;">
            <div style="font-size:9px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">${label}</div>
            <div style="display:flex;align-items:baseline;gap:2px;">
              <span style="font-size:18px;font-weight:700;font-family:var(--font-mono);color:${color};line-height:1;">${value ?? '—'}</span>
              ${value != null ? `<span style="font-size:10px;font-family:var(--font-mono);color:var(--t3);">${unit}</span>` : ''}
            </div>
            ${sub ? `<div style="font-size:9px;color:var(--t3);font-family:var(--font-mono);margin-top:2px;">${sub}</div>` : ''}
          </div>`;
        return `
        <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
          <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:10px;">Composizione</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${cstat('BMI', cbmi, '', cbmiCol, cbmiCat)}
            ${cstat('Body fat', cbf, '%')}
            ${cstat('Massa magra', cleanMass, 'kg')}
            ${cstat('Massa grassa', cfatMass, 'kg')}
            ${cvisceral != null ? cstat('Grasso viscerale', cvisceral, '') : ''}
            ${cbodyAge  != null ? cstat('Body age', cbodyAge, 'anni') : ''}
          </div>
        </div>`;
      })()}

      <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
        <div style="font-size:14px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:12px;">Log misure — ${fmtDate(today)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Peso (kg)</label>
            <input id="bl-weight" type="number" step="0.1" min="40" max="200" value="${fv(todayLog.weight_kg)}" placeholder="es. 72.5"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Vita (cm)</label>
            <input id="bl-waist" type="number" step="0.1" min="50" max="200" value="${fv(todayLog.waist_cm)}" placeholder="es. 89"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
        </div>

        <button onclick="ST.bodyAdvOpen=!ST.bodyAdvOpen;renderBody();"
          style="font-size:11px;color:#854F0B;background:none;border:none;padding:0;cursor:pointer;font-family:var(--font-mono);font-weight:700;margin-bottom:${adv?'10px':'0'};">
          ${adv ? '▲ Nascondi avanzate' : '▼ Campi avanzati (bilancia smart + metro)'}
        </button>

        ${adv ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;margin-bottom:10px;">
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">BF%</label>
            <input id="bl-bf" type="number" step="0.1" min="3" max="60" value="${fv(todayLog.bf_pct)}" placeholder="es. 14.4"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Massa muscolare (kg)</label>
            <input id="bl-muscle" type="number" step="0.1" min="20" max="100" value="${fv(todayLog.muscle_kg)}" placeholder="es. 58.2"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Grasso viscerale</label>
            <input id="bl-visceral" type="number" step="0.5" min="1" max="30" value="${fv(todayLog.visceral_fat)}" placeholder="es. 9"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Body age</label>
            <input id="bl-bodyage" type="number" step="1" min="18" max="99" value="${fv(todayLog.body_age)}" placeholder="es. 42"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Fianchi (cm)</label>
            <input id="bl-hip" type="number" step="0.5" min="50" max="200" value="${fv(todayLog.hip_cm)}" placeholder="es. 98"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Petto (cm)</label>
            <input id="bl-chest" type="number" step="0.5" min="50" max="200" value="${fv(todayLog.chest_cm)}" placeholder="es. 94"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Bicipite (cm)</label>
            <input id="bl-bicep" type="number" step="0.5" min="20" max="60" value="${fv(todayLog.bicep_cm)}" placeholder="es. 34"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:14px;font-family:var(--font-mono);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Note</label>
            <input id="bl-notes" type="text" value="${esc(todayLog.notes||'')}" placeholder="opzionale"
              style="width:100%;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r);font-size:13px;font-family:var(--font-sans);background:var(--s2);color:var(--t1);box-sizing:border-box;outline:none;">
          </div>
        </div>` : `
        <div style="display:none;">
          <input id="bl-bf" type="hidden" value="${fv(todayLog.bf_pct)}">
          <input id="bl-muscle" type="hidden" value="${fv(todayLog.muscle_kg)}">
          <input id="bl-visceral" type="hidden" value="${fv(todayLog.visceral_fat)}">
          <input id="bl-hip" type="hidden" value="${fv(todayLog.hip_cm)}">
          <input id="bl-chest" type="hidden" value="${fv(todayLog.chest_cm)}">
          <input id="bl-bicep" type="hidden" value="${fv(todayLog.bicep_cm)}">
          <input id="bl-bodyage" type="hidden" value="${fv(todayLog.body_age)}">
          <input id="bl-notes" type="hidden" value="${esc(todayLog.notes||'')}">
        </div>`}

        <button onclick="saveBodyLog();" ${ST.bodySaving?'disabled':''}
          style="width:100%;padding:12px;margin-top:10px;background:#854F0B;color:#fff;border:none;border-radius:var(--r);font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:${ST.bodySaving?'default':'pointer'};${ST.bodySaving?'opacity:.6;':''}">
          ${ST.bodySaving ? 'Salvataggio...' : 'Salva misure'}
        </button>
      </div>

      ${uTimeline.length > 0 ? `
      <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:16px;box-shadow:var(--shadow);">
        <div style="font-size:13px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:10px;">Ultimi log</div>
        ${uTimeline.slice(0,8).map(l => {
          const isCheck = l.source === 'check';
          const rowOpen = isCheck ? ` onclick="openBodyCheckDetail('${l.check_id}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--s2);cursor:pointer;"` : ` style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--s2);"`;
          return `
          <div${rowOpen}>
            <div style="font-size:12px;color:var(--t3);font-family:var(--font-mono);display:flex;align-items:center;gap:6px;">
              ${fmtDate(l.date)}
              ${isCheck ? `<span style="font-size:9px;font-family:var(--font-mono);color:#2A7A6F;text-transform:uppercase;letter-spacing:.5px;border:1px solid #2A7A6F;border-radius:3px;padding:1px 4px;">✓ check</span>` : ''}
            </div>
            <div style="font-size:12px;font-family:var(--font-mono);color:var(--t1);display:flex;gap:10px;align-items:center;">
              ${(l.weight_kg ?? l.check_weight_kg) ? `<span>${l.weight_kg ?? l.check_weight_kg} kg</span>` : ''}
              ${l.waist_cm  ? `<span>${l.waist_cm} cm</span>`  : ''}
              ${l.bf_pct    ? `<span>BF ${l.bf_pct}%</span>`   : ''}
              ${isCheck ? `<span style="color:var(--t3);font-size:13px;">→</span>` : ''}
              <button onclick="event.stopPropagation();confirmDeleteBodyLog('${isCheck ? 'check' : 'log'}','${l.id}','${l.check_id || ''}','${l.date}')" title="Elimina" style="background:none;border:none;cursor:pointer;font-size:15px;line-height:1;color:var(--t3);padding:0 2px;">×</button>
            </div>
          </div>`;
        }).join('')}
      </div>` : ''}
    `;

  } else if(tab === 'check'){
    const completedChecks = (ST.bodyChecks || [])
      .filter(c => c.status === 'completed')
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    if(completedChecks.length === 0){
      body = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;padding:24px;">
          <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:32px 24px;text-align:center;width:100%;box-shadow:var(--shadow);">
            <div style="width:48px;height:48px;border-radius:50%;background:#EDE9F8;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <span style="font-size:22px;">🧍</span>
            </div>
            <div style="font-size:16px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:8px;">Nessun check fisico ancora.</div>
            <div style="font-size:13px;color:var(--t3);font-family:var(--font-sans);margin-bottom:20px;">Registra il tuo primo check periodico<br>per seguire i progressi nel tempo.</div>
            <button onclick="m2EntryIntro();" style="width:100%;padding:14px;background:#2A7A6F;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Nuovo check fisico →</button>
          </div>
        </div>
        <div style="padding:0 16px 16px;">${_bloodHistoryHTML()}</div>`;
    } else {
      const checkRows = completedChecks.map(c => {
        const meas = (ST.bodyMeasurements || []).find(m => m.check_id === c.id) || {};
        const dateLabel = c.created_at
          ? new Date(c.created_at).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'})
          : '—';
        const vals = [
          meas.weight_kg != null ? `${fmtMeasure(meas.weight_kg)} kg` : null,
          meas.waist_cm  != null ? `${fmtMeasure(meas.waist_cm)} cm`  : null,
          meas.body_fat_pct != null ? `${meas.body_fat_pct}%`         : null,
        ].filter(Boolean).join(' · ');
        return `
          <div onclick="openBodyCheckDetail('${c.id}')" style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-lg);padding:14px 16px;margin-bottom:10px;cursor:pointer;box-shadow:var(--shadow);display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:15px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:6px;">${dateLabel}</div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-size:10px;font-weight:700;font-family:var(--font-mono);letter-spacing:.5px;color:#5E4A7A;background:#EDE9F8;padding:2px 8px;border-radius:999px;text-transform:uppercase;">check</span>
                ${vals ? `<span style="font-size:12px;font-family:var(--font-mono);color:var(--t2);">${vals}</span>` : ''}
              </div>
            </div>
            <span style="font-size:18px;color:var(--t3);margin-left:12px;">›</span>
          </div>`;
      }).join('');

      body = `
        <div style="padding:16px;">
          ${checkRows}
          ${_bloodHistoryHTML()}
        </div>`;
    }

  } else if(tab === 'tendenza'){
    body = renderBodyTrend();
  }

  // Mini-modal conferma elimina log Body (pattern info-modal, come Training)
  let bodyDeleteConfirmHTML = '';
  if(ST.bodyDeleteConfirm){
    const c = ST.bodyDeleteConfirm;
    const isCheck = c.kind === 'check';
    const title = isCheck ? 'Elimina check fisico' : 'Elimina log peso';
    const msg = isCheck
      ? `Eliminare il check fisico del ${fmtDate(c.date)}? Verranno rimossi: peso, misure, composizione e le 4 foto associate. L'operazione è definitiva.`
      : `Eliminare il log peso del ${fmtDate(c.date)}? L'operazione è definitiva.`;
    bodyDeleteConfirmHTML = `<div class="info-modal-overlay" style="z-index:1200;" onclick="ST.bodyDeleteConfirm=null;renderBody()">
      <div class="info-modal" style="max-width:320px;text-align:center;" onclick="event.stopPropagation()">
        <div style="font-size:15px;font-weight:700;color:var(--t1);font-family:var(--font-sans);margin-bottom:8px;">${title}</div>
        <div style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.5;margin-bottom:18px;">${msg}</div>
        <div style="display:flex;gap:8px;">
          <button onclick="ST.bodyDeleteConfirm=null;renderBody();" style="flex:1;padding:10px;background:var(--s2);color:var(--t2);border:none;border-radius:8px;font-size:13px;font-weight:600;font-family:var(--font-sans);cursor:pointer;">Annulla</button>
          <button onclick="deleteBodyLogConfirmed();" style="flex:1;padding:10px;background:#B84C2A;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Elimina</button>
        </div>
      </div>
    </div>`;
  }

  document.getElementById('page-body').innerHTML = navHTML + _bodyCheckCtaHTML() + body + versionFooter() + bodyDeleteConfirmHTML;
}

// ─── STEP D.1 (22 mag 2026): Modal pesata "Pesati ora" ───
// Bottom sheet con stepper +/-0.1kg + tap su numero → keyboard iOS (input nascosto).
// Default: ultimo weight_logs.weight_kg → fallback getLatestBodyData().weight_kg
//          → fallback ST.profile.weight_kg → fallback finale 70.0
// Conferma: upsert su weight_logs (UNIQUE user_id,date) + toast + refresh card peso.
// NON tocca body_logs / body_measurements (separate per modulo Body e check M2).

async function loadWeightLogs() {
  if(!ST.user || !ST.user.id || ST.user.id === 'test-user-001') { ST.weightLogs = []; return; }
  const {data, error} = await supa.from('weight_logs')
    .select('date, weight_kg')
    .eq('user_id', ST.user.id)
    .order('date', { ascending: false })
    .limit(1000);   // una riga al giorno: copre quasi tre anni, e la Tendenza «Tutto» le mostra tutte
  if(error) { console.warn('loadWeightLogs error:', error); ST.weightLogs = []; return; }
  ST.weightLogs = data || [];
}

function _weighInDefaultValue() {
  // Priorità: ultimo weight_logs → getLatestBodyData → profilo → 70.0
  const wl = ST.weightLogs || [];
  if(wl.length > 0 && wl[0].weight_kg != null) {
    const n = Number(wl[0].weight_kg);
    if(!isNaN(n)) return n;
  }
  try {
    const lb = (typeof getLatestBodyData === 'function') ? getLatestBodyData() : null;
    if(lb && lb.weight_kg != null) {
      const n = Number(lb.weight_kg);
      if(!isNaN(n)) return n;
    }
  } catch(e) {}
  const pw = ST.profile && ST.profile.weight_kg;
  if(pw != null) {
    const n = Number(pw);
    if(!isNaN(n)) return n;
  }
  return 70.0;
}

async function openWeighInSheet() {
  if(!ST.user || !ST.user.id) { showToast('Accedi prima di pesarti', '⚠️'); return; }
  // Carica weight_logs (cache locale) se non già caricato — serve sia per default che per refresh card.
  if(ST.weightLogs === null || ST.weightLogs === undefined) {
    await loadWeightLogs();
  }
  const def = _weighInDefaultValue();
  ST.weighInSheet = {
    value: Math.round(def * 10) / 10,
    saving: false,
  };
  renderWeighInSheet();
}

function closeWeighInSheet() {
  const el = document.getElementById('pianov4-weighin-sheet');
  if(el) {
    const screen = el.querySelector('.pianov4-weighin-screen');
    if(screen) screen.classList.add('dismissing');
    setTimeout(function() {
      ST.weighInSheet = null;
      const ex = document.getElementById('pianov4-weighin-sheet');
      if(ex) ex.remove();
    }, 200);
  } else {
    ST.weighInSheet = null;
  }
}

// Stepper +/- 0.1 kg con DOM update mirato (no full re-render → preserva focus input)
function weighInAdjust(delta) {
  if(!ST.weighInSheet) return;
  let v = Number(ST.weighInSheet.value) + delta;
  if(isNaN(v)) v = 70.0;
  v = Math.max(20, Math.min(300, Math.round(v * 10) / 10));
  ST.weighInSheet.value = v;
  const vStr = v.toFixed(1);
  const numEl = document.getElementById('weighin-value-display');
  if(numEl) numEl.textContent = vStr;
  const inpEl = document.getElementById('weighin-hidden-input');
  if(inpEl) inpEl.value = vStr;
}

// Sync stepper col valore digitato dalla keyboard iOS (input nascosto)
function weighInOnInput(rawVal) {
  if(!ST.weighInSheet) return;
  let v = parseFloat(String(rawVal).replace(',', '.'));
  if(isNaN(v)) return;
  v = Math.max(20, Math.min(300, Math.round(v * 10) / 10));
  ST.weighInSheet.value = v;
  const numEl = document.getElementById('weighin-value-display');
  if(numEl) numEl.textContent = v.toFixed(1);
}

// Tap sul wrap numero → apre keyboard iOS sull'input nascosto
function weighInFocusInput() {
  const inp = document.getElementById('weighin-hidden-input');
  if(inp) { inp.focus(); try { inp.select(); } catch(e){} }
}

async function confirmWeighIn() {
  if(!ST.weighInSheet || ST.weighInSheet.saving) return;
  const v = Math.max(20, Math.min(300, Math.round(Number(ST.weighInSheet.value) * 10) / 10));
  if(isNaN(v)) { showToast('Inserisci un peso valido', '⚠️'); return; }
  ST.weighInSheet.saving = true;
  // Riflette stato saving anche sul bottone (disabilitato durante upsert)
  const ctaBtn = document.querySelector('.pianov4-weighin-cta');
  if(ctaBtn) { ctaBtn.disabled = true; ctaBtn.textContent = 'Salvataggio…'; }

  const today = todayKey();
  const row = { user_id: ST.user.id, date: today, weight_kg: v };
  const { error } = await supa.from('weight_logs').upsert(row, { onConflict: 'user_id,date' });

  if(error) {
    console.error('confirmWeighIn upsert error:', error);
    showToast('Errore: ' + (error.message || 'riprova'), '⚠️');
    ST.weighInSheet.saving = false;
    if(ctaBtn) { ctaBtn.disabled = false; ctaBtn.textContent = 'Conferma'; }
    return;
  }
  // Refresh cache locale → la prossima apertura card peso/sheet usa il nuovo valore
  await loadWeightLogs();
  // Step D.2: reset anti-nag dismiss counter — utente si è pesato, prossimo ciclo
  // riparte da 0 (al primo dismiss futuro silenzio 48h, non 7gg/28gg).
  if(typeof _weightReminderResetDismiss === 'function') _weightReminderResetDismiss();
  closeWeighInSheet();
  showToast('Pesata salvata · ' + v.toFixed(1) + ' kg', '⚖️');
  updateHeaderWeight();                                   // la pillola in alto legge anche weight_logs
  if(ST.page === 'piano') renderPianoV4();
  else if(ST.page === 'body') renderBody();
  else if(ST.page === 'oggi') renderOggi(); // re-render banner reminder (deve sparire)
  else if(ST.page === 'home') loadWeeklyPicture(wpMonday(), { force:true }).then(_wpRerenderIfOpen); // quadro: la pesata entra subito
}

function renderWeighInSheet() {
  if(!ST.weighInSheet) return;
  const v = Number(ST.weighInSheet.value);
  const vStr = (isNaN(v) ? 70.0 : v).toFixed(1);
  const html = `<div id="pianov4-weighin-sheet" class="pianov4-weighin-overlay" onclick="if(event.target===this)closeWeighInSheet()">
    <div class="pianov4-weighin-screen">
      <div class="pianov4-weighin-band"></div>
      <div class="pianov4-weighin-handle"></div>
      <div class="pianov4-weighin-header">
        <div class="pianov4-weighin-eyebrow">PESATA DI OGGI</div>
        <div class="pianov4-weighin-title">Pesati ora</div>
        <button class="pianov4-weighin-close" onclick="closeWeighInSheet()" aria-label="Chiudi">×</button>
      </div>
      <div class="pianov4-weighin-body">
        <div class="pianov4-weighin-stepper-wrap">
          <button class="pianov4-weighin-step-btn" onclick="weighInAdjust(-0.1)" aria-label="Riduci di 0.1 kg">−</button>
          <div class="pianov4-weighin-value-wrap" onclick="weighInFocusInput()">
            <span class="pianov4-weighin-value" id="weighin-value-display">${vStr}</span>
            <span class="pianov4-weighin-unit">kg</span>
            <input id="weighin-hidden-input"
                   class="pianov4-weighin-hidden-input"
                   type="number" inputmode="decimal" step="0.1" min="20" max="300"
                   value="${vStr}"
                   oninput="weighInOnInput(this.value)"
                   aria-label="Inserisci peso in kg" />
          </div>
          <button class="pianov4-weighin-step-btn" onclick="weighInAdjust(0.1)" aria-label="Aumenta di 0.1 kg">+</button>
        </div>
        <p class="pianov4-weighin-hint">Tocca il numero per scrivere con la tastiera</p>
      </div>
      <div class="pianov4-weighin-cta-wrap">
        <button class="pianov4-weighin-cta" onclick="confirmWeighIn()">Conferma</button>
        <button class="pianov4-weighin-freq-link" onclick="openWeightFreqSheet()">Promemoria: ${esc(WEIGHT_FREQ_LABELS[_weightReminderGetMode()].short)} ›</button>
      </div>
    </div>
  </div>`;
  const existing = document.getElementById('pianov4-weighin-sheet');
  if(existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

// ─── STEP D.2 (22 mag 2026): banner reminder pesata + selettore frequenza ───
// Logica anti-nag + helper soglia + componente bottom-sheet riusabile per
// modalità di tracking peso (verrà richiamato anche dall'onboarding M1 in
// futuro). Letti/scritti localStorage keys:
//   zt_weight_reminder_dismissed_at  (timestamp ms ultimo dismiss)
//   zt_weight_reminder_dismiss_count (numero dismiss consecutivi → silenzio crescente)
// Mappa soglia (giorni) per profile.weight_tracking_mode:
//   daily=1 · every3=3 · weekly=7 · flexible=14 (default)
// Mappa silenzio anti-nag (ms) per dismiss_count:
//   1 → 48h · 2 → 7gg · 3+ → 28gg

const WEIGHT_FREQ_THRESHOLDS = { daily:1, every3:3, weekly:7, flexible:14 };
const WEIGHT_FREQ_LABELS = {
  daily:    { name:'Ogni giorno',   desc:'Reminder se passa 1 giorno',  short:'ogni giorno' },
  every3:   { name:'Ogni 3 giorni', desc:'Reminder se passano 3 giorni',short:'ogni 3 giorni' },
  weekly:   { name:'Ogni settimana',desc:'Reminder dopo 7 giorni',      short:'ogni settimana' },
  flexible: { name:'Libero',        desc:'Reminder dopo 14 giorni',     short:'libero' },
};
const WEIGHT_REMINDER_DISMISS_MS = [
  48 * 3600 * 1000,        // 1° dismiss → 48h
  7  * 24 * 3600 * 1000,   // 2° dismiss → 7gg
  28 * 24 * 3600 * 1000,   // 3°+ dismiss → 28gg
];

function _weightReminderGetMode() {
  const m = (ST.profile && ST.profile.weight_tracking_mode) || 'flexible';
  return WEIGHT_FREQ_THRESHOLDS[m] != null ? m : 'flexible';
}

function _weightReminderDaysSinceLast() {
  // Conta giorni di differenza tra oggi e l'ultima riga weight_logs (ST.weightLogs[0]).
  // Se null/vuoto → null (= "mai pesato" → soglia considerata sempre superata)
  const wl = ST.weightLogs;
  if(!wl || wl.length === 0) return null;
  const lastDateStr = wl[0].date; // YYYY-MM-DD
  if(!lastDateStr) return null;
  const last = new Date(lastDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  const diffMs = today.getTime() - last.getTime();
  if(diffMs < 0) return 0; // log futuro per qualche motivo → 0
  return Math.floor(diffMs / (24 * 3600 * 1000));
}

function _weightReminderInSilencePeriod() {
  try {
    const ts = parseInt(localStorage.getItem('zt_weight_reminder_dismissed_at') || '0', 10);
    const count = parseInt(localStorage.getItem('zt_weight_reminder_dismiss_count') || '0', 10);
    if(!ts || count <= 0) return false;
    const idx = Math.min(count - 1, WEIGHT_REMINDER_DISMISS_MS.length - 1);
    const silenceMs = WEIGHT_REMINDER_DISMISS_MS[idx];
    return (Date.now() - ts) < silenceMs;
  } catch(e) { return false; }
}

function _weightReminderShouldShow() {
  // Render banner SE:
  //  - modalità tracking definita (anche flexible è valida)
  //  - giorni dall'ultima pesata ≥ soglia modalità (o null = mai pesato)
  //  - NON siamo nella finestra di silenzio post-dismiss
  if(_weightReminderInSilencePeriod()) return false;
  const mode = _weightReminderGetMode();
  const threshold = WEIGHT_FREQ_THRESHOLDS[mode];
  const days = _weightReminderDaysSinceLast();
  if(days === null) return true; // mai pesato → mostra
  return days >= threshold;
}

function dismissWeightReminder() {
  try {
    const prev = parseInt(localStorage.getItem('zt_weight_reminder_dismiss_count') || '0', 10);
    localStorage.setItem('zt_weight_reminder_dismiss_count', String(prev + 1));
    localStorage.setItem('zt_weight_reminder_dismissed_at', String(Date.now()));
  } catch(e) {}
  // Re-render tab Oggi per nascondere il banner
  if(ST.page === 'oggi') renderOggi();
}

function _weightReminderResetDismiss() {
  // Chiamato post-conferma pesata (confirmWeighIn) → silenzio azzerato,
  // prossimo ciclo riparte da count=0 (48h al primo dismiss futuro).
  try {
    localStorage.removeItem('zt_weight_reminder_dismiss_count');
    localStorage.removeItem('zt_weight_reminder_dismissed_at');
  } catch(e) {}
}

function renderWeightReminderBannerOggi() {
  // Helper render banner reminder pesata. Inserito in renderOggi prima della
  // timeline pasti. Mai chiamato fuori da renderOggi (banner SOLO tab Oggi).
  if(!_weightReminderShouldShow()) return '';
  const days = _weightReminderDaysSinceLast();
  let text;
  if(days === null) {
    text = 'Non hai ancora registrato una pesata. Vuoi farlo ora per iniziare il trend?';
  } else {
    const giorni = days === 1 ? 'giorno' : 'giorni';
    text = `Sono passati ${days} ${giorni} dall'ultima pesata. Vuoi aggiornare il trend?`;
  }
  return `<div class="weight-reminder-banner" role="status" aria-live="polite">
    <span class="weight-reminder-icon" aria-hidden="true">⚖️</span>
    <div class="weight-reminder-body">
      <p class="weight-reminder-text">${esc(text)}</p>
    </div>
    <div class="weight-reminder-actions">
      <button class="weight-reminder-cta" onclick="openWeighInSheet()">Pesati ora</button>
      <button class="weight-reminder-dismiss" onclick="dismissWeightReminder()">Più tardi</button>
    </div>
  </div>`;
}

// ── Selettore frequenza (componente riusabile) ──
// openWeightFreqSheet → bottom sheet 4 opzioni. selectWeightFreq aggiorna
// profiles.weight_tracking_mode su Supabase e re-renderizza la pagina corrente.
// Pensato per essere richiamato anche dall'onboarding M1 in futuro (non
// agganciato ora — fuori scope Step D.2).

function openWeightFreqSheet() {
  ST.weightFreqSheet = { open: true };
  renderWeightFreqSheet();
}

function closeWeightFreqSheet() {
  const el = document.getElementById('weight-freq-sheet');
  if(el) {
    const screen = el.querySelector('.weight-freq-screen');
    if(screen) screen.classList.add('dismissing');
    setTimeout(function() {
      ST.weightFreqSheet = null;
      const ex = document.getElementById('weight-freq-sheet');
      if(ex) ex.remove();
    }, 200);
  } else {
    ST.weightFreqSheet = null;
  }
}

async function selectWeightFreq(mode) {
  if(!WEIGHT_FREQ_THRESHOLDS[mode]) return;
  // Optimistic update locale → re-render immediato + chiusura sheet.
  // Upsert su Supabase in background; rollback con toast errore se fallisce.
  const prev = (ST.profile && ST.profile.weight_tracking_mode) || 'flexible';
  if(!ST.profile) ST.profile = {};
  ST.profile.weight_tracking_mode = mode;
  closeWeightFreqSheet();
  // Se il modal peso è aperto, ri-renderizzalo per aggiornare il link "Promemoria: <label>"
  if(ST.weighInSheet) renderWeighInSheet();
  // Refresh pagina corrente (banner Oggi può cambiare visibilità in base alla soglia)
  if(ST.page === 'oggi') renderOggi();
  else if(ST.page === 'piano') renderPianoV4();
  // Persistenza
  if(ST.user && ST.user.id && ST.user.id !== 'test-user-001') {
    const { error } = await supa.from('profiles')
      .update({ weight_tracking_mode: mode })
      .eq('id', ST.user.id);
    if(error) {
      console.error('selectWeightFreq update error:', error);
      // Rollback locale + re-render
      ST.profile.weight_tracking_mode = prev;
      if(ST.page === 'oggi') renderOggi();
      else if(ST.page === 'piano') renderPianoV4();
      showToast('Errore salvataggio: riprova', '⚠️');
      return;
    }
  }
  const lbl = WEIGHT_FREQ_LABELS[mode]?.short || mode;
  showToast('Promemoria: ' + lbl, '✅');
}

function renderWeightFreqSheet() {
  if(!ST.weightFreqSheet) return;
  const currentMode = _weightReminderGetMode();
  const optsHTML = ['daily','every3','weekly','flexible'].map(function(m) {
    const isActive = m === currentMode;
    const info = WEIGHT_FREQ_LABELS[m];
    return `<button class="weight-freq-opt${isActive ? ' weight-freq-opt-active' : ''}"
        onclick="selectWeightFreq('${m}')" aria-pressed="${isActive}">
      <div class="weight-freq-opt-body">
        <div class="weight-freq-opt-name">${info.name}</div>
        <div class="weight-freq-opt-desc">${info.desc}</div>
      </div>
      <span class="weight-freq-opt-check">${isActive ? '✓' : ''}</span>
    </button>`;
  }).join('');
  const html = `<div id="weight-freq-sheet" class="weight-freq-overlay" onclick="if(event.target===this)closeWeightFreqSheet()">
    <div class="weight-freq-screen">
      <div class="weight-freq-band"></div>
      <div class="weight-freq-handle"></div>
      <div class="weight-freq-header">
        <div class="weight-freq-eyebrow">PROMEMORIA PESATA</div>
        <div class="weight-freq-title">Ogni quanto pesarti?</div>
        <button class="weight-freq-close" onclick="closeWeightFreqSheet()" aria-label="Chiudi">×</button>
      </div>
      <p class="weight-freq-hint">Decidi tu il ritmo. Ti ricorderemo di registrarti solo quando passa il tempo che scegli.</p>
      <div class="weight-freq-list">${optsHTML}</div>
    </div>
  </div>`;
  const existing = document.getElementById('weight-freq-sheet');
  if(existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

// m2OpenInfo — apre un info-modal con il tip del campo M2 (chiamato dalle icone ⓘ).
// Legge data-field / data-tip dal button. Riusa il pattern .info-modal-overlay/.info-modal.
function m2OpenInfo(btn) {
  const field = (btn && btn.getAttribute('data-field')) || '';
  const tip = (btn && btn.getAttribute('data-tip')) || '';
  const el = document.createElement('div');
  el.className = 'info-modal-overlay';
  el.innerHTML = `<div class="info-modal" onclick="event.stopPropagation()">
    <div class="m2-info-modal-head">
      <span class="m2-info-modal-field">${field}</span>
      <button class="m2-info-modal-x" type="button" aria-label="Chiudi">✕</button>
    </div>
    <p class="m2-info-modal-tip">${tip}</p>
  </div>`;
  const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if(e.key === 'Escape') close(); };
  el.addEventListener('click', e => { if(e.target === el) close(); });
  el.querySelector('.m2-info-modal-x').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(el);
}
