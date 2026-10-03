// ═══════════════════════════════════════
// app/impostazioni.js — le impostazioni (Fondamenta 035, tappa 10, 2 ottobre 2026)
// ═══════════════════════════════════════
// La finestra delle impostazioni: profilo, intolleranze, esami del sangue, cambio obiettivo con conferma,
// salvataggio e rigenerazione della scheda. Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO app/onboarding.js e PRIMA del proprio avvio (BOOTSTRAP): qui al caricamento
// si dichiarano solo costanti scritte per esteso, niente che usi un nome scritto più avanti nella
// pagina (lo controlla tools/banco/prova_ordine_caricamento.js).

// ═══════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
let SET_INTOL = [];
const ESAMI_DEFAULTS = [
  {key:'ferritina', label:'Ferritina (μg/L)', ref:'12–150 F / 12–300 M'},
  {key:'vitamina_d', label:'Vitamina D (ng/mL)', ref:'30–100'},
  {key:'vitamina_b12', label:'Vitamina B12 (pg/mL)', ref:'200–900'},
  {key:'colesterolo_tot', label:'Colesterolo totale (mg/dL)', ref:'< 200'},
  {key:'hdl', label:'HDL (mg/dL)', ref:'> 40 M / > 50 F'},
  {key:'ldl', label:'LDL (mg/dL)', ref:'< 130'},
  {key:'trigliceridi', label:'Trigliceridi (mg/dL)', ref:'< 150'},
  {key:'glicemia', label:'Glicemia a digiuno (mg/dL)', ref:'70–100'},
  {key:'insulina', label:'Insulina a digiuno (μU/mL)', ref:'< 25'},
  {key:'tsh', label:'TSH (mUI/L)', ref:'0.4–4.0'},
  {key:'hs_crp', label:'PCR alta sensibilità (mg/L)', ref:'< 1'},
  {key:'omocisteina', label:'Omocisteina (μmol/L)', ref:'< 15'},
  {key:'zinco', label:'Zinco (μg/dL)', ref:'70–120'},
  {key:'magnesio', label:'Magnesio (mg/dL)', ref:'1.7–2.2'},
];

function selectSetObiettivo(val) {
  document.getElementById('set-obiettivo').value = val;
  document.querySelectorAll('.set-obj-pill').forEach(btn => {
    const on = btn.dataset.val === val;
    btn.style.background   = on ? 'var(--acc)' : 'var(--s1)';
    btn.style.borderColor  = on ? 'var(--acc)' : 'var(--b2)';
    btn.style.color        = on ? '#fff'        : 'var(--t2)';
  });
}

function openSettingsModal() {
  const p = ST.profile || {};
  // Email utente loggato (read-only, per debug cross-device)
  const emailEl = document.getElementById('set-email');
  if(emailEl) emailEl.textContent = (ST.user && ST.user.email) || '—';
  // Popola campi base
  document.getElementById('set-fname').value = p.first_name || '';
  document.getElementById('set-lname').value = p.last_name || '';
  document.getElementById('set-weight').value = p.weight_kg || '';
  document.getElementById('set-goal-weight').value = p.goal_weight_kg || '';
  selectSetObiettivo(migrateObiettivo(p.obiettivo || '').split(',')[0] || 'dimagrimento');
  document.getElementById('set-activity').value = p.activity_level || 'moderate';
  document.getElementById('set-dieta').value = p.dieta || 'onnivoro';
  document.getElementById('set-note-salute').value = p.note_salute || '';
  document.getElementById('set-train-start').value = p.train_start_date || '';
  const giorniSel = document.getElementById('set-giorni-allenamento');
  if(giorniSel) giorniSel.value = String(p.giorni_allenamento || 4);
  const unitSel = document.getElementById('set-unit');
  if(unitSel) unitSel.value = p.unit || 'lbs';
  // Intolleranze
  SET_INTOL = [...(p.intolleranze || [])];
  ['lattosio','glutine','uova','frutta_a_guscio','soia','nichel','pesce'].forEach(k => {
    document.getElementById('set-intol-'+k)?.classList.toggle('active', SET_INTOL.includes(k));
  });
  // Esami del sangue
  renderEsamiList(p.esami_sangue || {});
  document.getElementById('set-err').style.display = 'none';
  const btn = document.getElementById('set-save-btn');
  btn.disabled = false; btn.textContent = 'Salva impostazioni →';
  document.getElementById('settings-modal').style.display = 'flex';
}

// ── Scarica i miei dati (Fondamenta 170, 3 ottobre 2026) ──
// Legge le tabelle della persona coi suoi permessi normali (RLS), a pagine, e le mette in un
// file JSON. Delle foto solo l'elenco (nome del file nel bucket), mai i byte. Una tabella che
// non c'e' o non si legge resta scritta come tale, non sparisce in silenzio (L10).
const MIEI_DATI_TABELLE = ['meals', 'meal_items', 'fasting_days', 'supplements', 'supplements_log', 'supplement_packages',
  'supplement_package_items', 'training_logs', 'training_notes', 'workouts', 'schede_utente', 'weight_logs', 'body_logs',
  'body_checks', 'body_measurements', 'body_check_ai', 'blood_tests', 'weekly_pictures', 'coach_proposals', 'daily_log',
  'weekly_plans', 'weekly_plan_meals'];
async function raccogliMieiDati(){
  if(!ST.user || !ST.user.id) return null;
  const uid = ST.user.id;
  const out = { app:'Zona Tracker', esportato_il:new Date().toISOString(), persona:{ id:uid, email:ST.user.email || null }, tabelle:{}, foto:[] };
  const prof = await dbq('leggere il profilo', supa.from('profiles').select('*').eq('id', uid).maybeSingle(), { silenzioso:true });
  out.tabelle.profiles = prof.error ? { non_letta:prof.error.message } : (prof.data ? [prof.data] : []);
  for(const t of MIEI_DATI_TABELLE){
    const r = await dbqAll('leggere ' + t, () => supa.from(t).select('*').eq('user_id', uid).order('id', { ascending:true }), { silenzioso:true });
    out.tabelle[t] = r.error ? { non_letta:r.error.message } : r.data;
  }
  const foto = await dbqAll('leggere l\'elenco delle foto', () => supa.from('body_check_photos').select('id, check_id, pose, storage_path, created_at').eq('user_id', uid).order('id', { ascending:true }), { silenzioso:true });
  // Solo l'elenco: nome del file nel bucket, mai i byte della foto
  out.foto = foto.error ? { non_letta:foto.error.message } : (foto.data || []).map(f => ({ id:f.id, check_id:f.check_id, pose:f.pose, storage_path:f.storage_path, created_at:f.created_at }));
  return out;
}
async function scaricaMieiDati(){
  const btn = document.getElementById('set-scarica-btn');
  if(btn){ btn.disabled = true; btn.textContent = 'Preparo il file…'; }
  try {
    const dati = await raccogliMieiDati();
    if(!dati){ showToast('Entra nell\'app per scaricare i tuoi dati', '⚠️'); return; }
    const testo = JSON.stringify(dati, null, 2);
    const nome = 'zona-tracker-dati-' + todayKey() + '.json';
    const blob = new Blob([testo], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch(e) {} }, 2000);
    showToast('File pronto: ' + nome);
  } catch(e) {
    showToast('Non riesco a preparare il file: riprova', '⚠️', 5500);
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = 'Scarica i miei dati'; }
  }
}
function mostraInformativa(){
  return avvisa(privacyInformativaHTML(), { titolo:'Dove vanno i tuoi dati', html:true });
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

function toggleSetIntol(val) {
  const i = SET_INTOL.indexOf(val);
  if(i < 0) SET_INTOL.push(val); else SET_INTOL.splice(i, 1);
  document.getElementById('set-intol-'+val)?.classList.toggle('active', SET_INTOL.includes(val));
}

function renderEsamiList(existing = {}) {
  const container = document.getElementById('set-esami-list');
  // Mostra quelli di default + eventuali custom
  const allKeys = [...new Set([...ESAMI_DEFAULTS.map(e=>e.key), ...Object.keys(existing)])];
  container.innerHTML = ESAMI_DEFAULTS.map(e => {
    const val = existing[e.key] || '';
    const data = existing[e.key+'_data'] || '';
    return `<div style="display:grid;grid-template-columns:1fr 90px 100px;gap:6px;align-items:center;margin-bottom:8px;">
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--t1);">${esc(e.label)}</div>
        <div style="font-size:9px;color:var(--t3);font-family:'JetBrains Mono',monospace;">Rif: ${esc(e.ref)}</div>
      </div>
      <input class="inp inp-sm" id="esame-${e.key}" type="number" step="0.1" value="${val}" placeholder="valore"/>
      <input class="inp inp-sm" id="esame-${e.key}-data" type="date" value="${data}" title="Data esame"/>
    </div>`;
  }).join('');
}

async function addEsameRow() {
  const nome = await chiediTesto('Nome del parametro', { segnaposto:'es. Zinco, PCR…', ok:'Aggiungi' });
  if(!nome || !nome.trim()) return;
  const key = nome.trim().toLowerCase().replace(/\s+/g,'_');
  const container = document.getElementById('set-esami-list');
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:1fr 90px 100px;gap:6px;align-items:center;margin-bottom:8px;';
  div.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--t1);">${esc(nome.trim())}</div>
    <input class="inp inp-sm" id="esame-${key}" type="number" step="0.1" placeholder="valore"/>
    <input class="inp inp-sm" id="esame-${key}-data" type="date" title="Data esame"/>`;
  div.dataset.key = key;
  div.dataset.label = nome.trim();
  container.appendChild(div);
}

// Fix A2 (24 mag 2026) — cambio obiettivo unificato in Impostazioni.
// Wrapper di saveSettings: se l'utente sta CAMBIANDO un obiettivo già esistente
// (X → Y, entrambi non vuoti, diversi), mostra una conferma "sei sicuro?"
// prima di applicare. Niente conferma se è la PRIMA scelta (vecchio obiettivo
// assente/vuoto). Dopo conferma → toast annuncio post-save.
// Pattern conferma: info-modal-overlay (stesso usato in tutta l'app per modali
// di conferma — vedi trainDeleteSetConfirm, bodyDeleteConfirm, ecc.).
async function saveSettings() {
  const errEl = document.getElementById('set-err');
  const btn = document.getElementById('set-save-btn');
  const fname = document.getElementById('set-fname').value.trim();
  if(!fname) { errEl.style.display='block'; errEl.textContent='Il nome è obbligatorio.'; return; }
  errEl.style.display = 'none';

  // ── Check cambio obiettivo (Fix A2) ─────────────────────────
  // Old: gestisce eventuali residui CSV legacy (split + [0]) — dopo Fix A1+A2
  // ogni nuovo salvataggio scrive valore singolo, ma vecchi dati possono ancora
  // avere CSV; questo split li normalizza in lettura.
  const oldObiettivoRaw = (ST.profile && ST.profile.obiettivo) || '';
  const oldObiettivo = oldObiettivoRaw ? migrateObiettivo(oldObiettivoRaw).split(',').filter(Boolean)[0] || '' : '';
  const newObiettivo = document.getElementById('set-obiettivo').value || '';
  const isGoalChange = (oldObiettivo && newObiettivo && oldObiettivo !== newObiettivo);

  if (isGoalChange) {
    // Mostra modal conferma e ferma l'esecuzione qui. Il submit vero parte
    // solo dopo "Sì, cambia" (chiama _saveSettingsExecute con goalChanged=true).
    _saveSettingsShowGoalChangeConfirm(oldObiettivo, newObiettivo);
    return;
  }

  // Nessun cambio (prima scelta o stesso obiettivo): procedi direttamente.
  // goalChanged=false → niente toast annuncio post-save.
  await _saveSettingsExecute(false);
}

// Modal di conferma cambio obiettivo. Riusa pattern info-modal-overlay.
// Bottoni: "Sì, cambia" → chiama _saveSettingsExecute(true); "Annulla" →
// ripristina pill old + chiude modal + riabilita bottone Salva del modal Settings.
function _saveSettingsShowGoalChangeConfirm(oldKey, newKey) {
  const lblOld = (typeof OBJ_ADAPT !== 'undefined' && OBJ_ADAPT[oldKey] && OBJ_ADAPT[oldKey].label) || oldKey;
  const lblNew = (typeof OBJ_ADAPT !== 'undefined' && OBJ_ADAPT[newKey] && OBJ_ADAPT[newKey].label) || newKey;
  const el = document.createElement('div');
  el.className = 'info-modal-overlay';
  el.setAttribute('data-confirm', 'goal-change');
  el.innerHTML = `<div class="info-modal">
    <h3>Cambiare obiettivo?</h3>
    <p>Vuoi cambiare obiettivo da <strong>«${esc(lblOld)}»</strong> a <strong>«${esc(lblNew)}»</strong>?</p>
    <p>${COACH_NAME} userà il nuovo obiettivo per i <strong>prossimi piani settimanali</strong>. I piani già generati restano invariati.</p>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <button id="goal-change-cancel" class="btn btn-ghost btn-sm" style="flex:1;">Annulla</button>
      <button id="goal-change-confirm" class="btn btn-primary btn-sm" style="flex:1;">Sì, cambia</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  document.getElementById('goal-change-cancel').onclick = function() {
    // Ripristina pill al vecchio obiettivo + riabilita bottone Salva del modal Settings.
    try { selectSetObiettivo(oldKey); } catch(e) {}
    el.remove();
  };
  document.getElementById('goal-change-confirm').onclick = function() {
    el.remove();
    _saveSettingsExecute(true);
  };
}

// Esecuzione vera del salvataggio Impostazioni (estratta da saveSettings per
// supportare il flusso con conferma asincrona Fix A2). goalChanged=true → toast
// annuncio post-save. Tutta la logica precedente è preservata 1:1 da qui in poi.
async function _saveSettingsExecute(goalChanged) {
  const errEl = document.getElementById('set-err');
  const btn = document.getElementById('set-save-btn');
  const fname = document.getElementById('set-fname').value.trim();
  btn.disabled = true; btn.textContent = 'Salvataggio...';

  const weight = parseFloat(document.getElementById('set-weight').value) || ST.profile?.weight_kg;
  const goalW  = parseFloat(document.getElementById('set-goal-weight').value) || ST.profile?.goal_weight_kg;
  const activity = document.getElementById('set-activity').value;

  // Ricalcola TDEE se peso o attività è cambiato
  const p = ST.profile || {};
  let targets = { kcal: ST.TARGET.kcal, protein: ST.TARGET.protein, carbs: ST.TARGET.carbs, fat: ST.TARGET.fat };
  if(weight && (weight !== p.weight_kg || activity !== p.activity_level)) {
    const age = p.age || ageFromDob(p.data_nascita);
    const r = calcTDEE(p.sex || 'M', age || 35, p.height_cm || 175, weight, activity);
    targets = { kcal: r.target, protein: r.protein, carbs: r.carbs, fat: r.fat };
  }

  // Raccoglie esami del sangue
  const esami = {};
  ESAMI_DEFAULTS.forEach(e => {
    const v = document.getElementById('esame-'+e.key)?.value;
    const d = document.getElementById('esame-'+e.key+'-data')?.value;
    if(v) { esami[e.key] = parseFloat(v); esami[e.key+'_label'] = e.label; }
    if(d) esami[e.key+'_data'] = d;
  });
  // Esami custom
  document.querySelectorAll('#set-esami-list [data-key]').forEach(row => {
    const key = row.dataset.key;
    const v = document.getElementById('esame-'+key)?.value;
    const d = document.getElementById('esame-'+key+'-data')?.value;
    if(v) { esami[key] = parseFloat(v); esami[key+'_label'] = row.dataset.label; }
    if(d) esami[key+'_data'] = d;
  });

  const updates = {
    first_name:    fname,
    last_name:     document.getElementById('set-lname').value.trim(),
    weight_kg:     weight,
    goal_weight_kg: goalW,
    activity_level: activity,
    obiettivo:     document.getElementById('set-obiettivo').value,
    dieta:         document.getElementById('set-dieta').value,
    intolleranze:  SET_INTOL.length ? SET_INTOL : null,
    note_salute:   document.getElementById('set-note-salute').value.trim() || null,
    esami_sangue:  Object.keys(esami).length ? esami : null,
    target_kcal:   targets.kcal,
    target_protein: targets.protein,
    target_carbs:  targets.carbs,
    target_fat:    targets.fat,
    giorni_allenamento: parseInt(document.getElementById('set-giorni-allenamento')?.value) || null,
    updated_at:    new Date().toISOString(),
  };

  const {error} = await supa.from('profiles').update(updates).eq('id', ST.user.id);
  if(error) {
    errEl.style.display='block'; errEl.textContent='Errore: '+error.message;
    btn.disabled=false; btn.textContent='Salva impostazioni →'; return;
  }

  // Salva train_start_date separatamente (colonna potrebbe non esistere ancora)
  const trainStartVal = document.getElementById('set-train-start').value || null;
  const { error: tsErr } = await supa.from('profiles').update({ train_start_date: trainStartVal }).eq('id', ST.user.id);
  if(!tsErr && ST.profile) ST.profile.train_start_date = trainStartVal;

  // Unità peso/carico — salvata solo in localStorage prefs
  const unitVal = document.getElementById('set-unit')?.value || 'lbs';
  if(ST.profile) ST.profile.unit = unitVal;

  // Giorni allenamento — sincronizza profilo locale
  if(ST.profile) ST.profile.giorni_allenamento = parseInt(document.getElementById('set-giorni-allenamento')?.value) || ST.profile.giorni_allenamento;

  // Aggiorna stato locale
  Object.assign(ST.profile, updates);
  saveLocalPrefs();
  ST.TARGET = targets;
  applyProfile(ST.profile);
  saveCache();
  closeSettingsModal();
  renderPage(ST.page);
  // Fix B (24 mag 2026): guard-rail calorie minime su ricalcolo da impostazioni.
  // Mostrato DOPO closeSettingsModal + renderPage per essere visibile senza
  // sovrapporsi al modal impostazioni che si sta chiudendo.
  checkLowKcalAndWarn(targets.kcal, ST.profile?.sex);
  // Fix A2 (24 mag 2026): annuncio post-cambio obiettivo. Mostrato SOLO se
  // l'utente ha appena confermato il cambio (goalChanged=true) e quindi NON
  // ha visto il guard-rail kcal (oppure l'ha visto e questo arriva dopo).
  // Durata 5000ms — convenzione "durata proporzionata al testo".
  if (goalChanged) {
    const labelNew = (typeof OBJ_ADAPT !== 'undefined' && OBJ_ADAPT[updates.obiettivo] && OBJ_ADAPT[updates.obiettivo].label) || updates.obiettivo;
    showToast('Obiettivo aggiornato. Da ora ' + COACH_NAME + ' userà «' + labelNew + '» per costruire i tuoi prossimi piani.', '🎯', 5000);
  }
}

async function rigeneraSchedaDaImpostazioni() {
  const btn = document.getElementById('set-rigenera-btn');
  const msg = document.getElementById('set-rigenera-msg');
  const giorni = parseInt(document.getElementById('set-giorni-allenamento')?.value) || ST.profile?.giorni_allenamento;
  if(!giorni) { msg.style.display='block'; msg.textContent='Salva prima il numero di giorni.'; return; }
  btn.disabled = true; btn.textContent = 'Generazione in corso...';
  msg.style.display = 'none';
  try {
    const { error: dbErr } = await supa.from('profiles').update({ giorni_allenamento: giorni }).eq('id', ST.user.id);
    if(dbErr) throw new Error('Salvataggio giorni fallito: ' + (dbErr.message || JSON.stringify(dbErr)));
    if(ST.profile) ST.profile.giorni_allenamento = giorni;
    await generateTrainingProgram({ source: 'manual', force: true });
    await loadActiveScheda();
    msg.style.display = 'block';
    msg.textContent = 'Scheda rigenerata ✓';
    btn.textContent = 'Rigenera scheda →';
    btn.disabled = false;
  } catch(e) {
    msg.style.display = 'block';
    msg.textContent = 'Errore: ' + (e.message || 'riprova');
    btn.textContent = 'Rigenera scheda →';
    btn.disabled = false;
  }
}
