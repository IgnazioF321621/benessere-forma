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

// ── Impostazioni a livelli (Metodo 220, 14 ottobre 2026, scelte di Ignazio) ──
// Un elenco di voci («Tutti i giorni» e «Altro»); ogni voce apre la sua pagina col suo «Salva», che torna
// all'elenco. Il salvataggio resta uno solo (saveSettings): i campi delle altre pagine sono quelli già
// salvati, perché tornare indietro senza salvare li rimette come nel profilo (_setPopola).
const SET_PAGINE = {
  obiettivo:   { titolo:'Il tuo obiettivo', salva:true },
  cibo:        { titolo:'Cibo', salva:true },
  allenamento: { titolo:'Allenamento', salva:true },
  salute:      { titolo:'Salute ed esami del sangue', salva:true },
  profilo:     { titolo:'Profilo e account', salva:true },
  dati:        { titolo:'I tuoi dati e privacy', salva:false },
  crediti:     { titolo:'Crediti', salva:false },
};
function setVai(pagina) {
  const conf = SET_PAGINE[pagina];
  const nome = conf ? pagina : 'elenco';
  ST.setPagina = nome;
  document.querySelectorAll('#settings-modal .set-pagina').forEach(el => { el.hidden = el.dataset.pagina !== nome; });
  const tit = document.getElementById('set-titolo'); if(tit) tit.textContent = conf ? conf.titolo : 'Impostazioni';
  const ind = document.getElementById('set-indietro'); if(ind) ind.hidden = !conf;
  const piede = document.getElementById('set-piede'); if(piede) piede.hidden = !(conf && conf.salva);
  const err = document.getElementById('set-err'); if(err) err.style.display = 'none';
  if(nome === 'elenco') _setRiassunti();
  if(nome === 'salute') _setEsamiStorico();
  const inner = document.querySelector('#settings-modal .set-foglio'); if(inner) inner.scrollTop = 0;
}
// Indietro senza salvare: i campi tornano come nel profilo, così un «Salva» in un'altra pagina non porta con sé
// una modifica lasciata a metà.
function setIndietro() { _setPopola(); setVai('elenco'); }

// La riga sotto ogni voce: come è impostata adesso, letta dalle fonti (profilo, calorie in uso, pausa, orari).
function _setRiassunti() {
  const p = ST.profile || {};
  const metti = (id, t) => { const el = document.getElementById(id); if(el) el.textContent = t; };
  const ob = migrateObiettivo(p.obiettivo || '').split(',')[0];
  const obLabel = (typeof OBJ_ADAPT !== 'undefined' && OBJ_ADAPT[ob] && OBJ_ADAPT[ob].label) || 'Da scegliere';
  metti('set-sotto-obiettivo', obLabel + (p.goal_weight_kg ? ` · ${String(p.goal_weight_kg).replace('.', ',')} kg` : ''));
  const dieta = { onnivoro:'onnivoro', pescetariano:'pescetariano', vegetariano:'vegetariano', vegano:'vegano' }[p.dieta || 'onnivoro'] || p.dieta;
  const intol = (p.intolleranze || []).length;
  metti('set-sotto-cibo', `${fmtNum(ST.TARGET.kcal)} kcal · ${dieta}${intol ? ` · ${intol} intolleranz${intol === 1 ? 'a' : 'e'}` : ''}`);
  metti('set-sotto-allenamento', `${p.giorni_allenamento || 4} giorni a settimana · ${p.unit || 'lbs'}`);
  const esami = Object.keys(p.esami_sangue || {}).filter(k => !/_label$|_data$/.test(k)).length;
  metti('set-sotto-salute', esami ? `${esami} valor${esami === 1 ? 'e' : 'i'} degli esami` : (p.note_salute ? 'Note sulla salute' : 'Note ed esami'));
  metti('set-sotto-profilo', [p.first_name, p.last_name].filter(Boolean).join(' ') || ((ST.user && ST.user.email) || ''));
  metti('set-sotto-dati', 'Scarica, dove vanno, elimina account');
  if(typeof _aggiornaPausaImpostazioni === 'function') _aggiornaPausaImpostazioni();   // la pausa (Metodo 210)
  if(typeof _aggiornaCsaImpostazioni === 'function') _aggiornaCsaImpostazioni();       // «Come stai adesso?» (Home 170)
}
// Lo storico degli esami del sangue (blood_tests), spostato qui dal tab Body (Metodo 220): stessa card, stessa fonte.
// Si legge solo qui, la prima volta che la pagina si apre (e di nuovo dopo un check con gli esami).
function _setEsamiStorico() {
  const el = document.getElementById('set-esami-storico');
  if(el && typeof _bloodHistoryHTML === 'function') el.innerHTML = _bloodHistoryHTML();
  if(ST.bloodTests == null && !ST.bloodInLettura && typeof loadBloodTests === 'function') {
    ST.bloodInLettura = true;
    loadBloodTests().finally(() => { ST.bloodInLettura = false; if(ST.setPagina === 'salute') _setEsamiStorico(); });
  }
}

function openSettingsModal() {
  _setPopola();
  document.getElementById('settings-modal').style.display = 'flex';
  setVai('elenco');
}

// Riempie i campi dal profilo (all'apertura e tornando indietro senza salvare).
function _setPopola() {
  const p = ST.profile || {};
  // Email utente loggato (read-only, per debug cross-device)
  const emailEl = document.getElementById('set-email');
  if(emailEl) emailEl.textContent = (ST.user && ST.user.email) || '—';
  // Popola campi base
  document.getElementById('set-fname').value = p.first_name || '';
  document.getElementById('set-lname').value = p.last_name || '';
  // Body 020 / Nutrition 040: il peso si cambia solo da «Pesati ora»; qui si legge e basta
  const pesoInp = document.getElementById('set-weight');
  const pesate = (typeof getWeighIns === 'function') ? getWeighIns() : [];
  pesoInp.value = (pesate[0] && pesate[0].weight_kg != null) ? pesate[0].weight_kg : (p.weight_kg || '');
  pesoInp.disabled = true;
  _notaImpostazioni(pesoInp, 'set-weight-nota', 'Si cambia da «Pesati ora»');
  document.getElementById('set-goal-weight').value = p.goal_weight_kg || '';
  selectSetObiettivo(migrateObiettivo(p.obiettivo || '').split(',')[0] || 'dimagrimento');
  document.getElementById('set-activity').value = p.activity_level || 'moderate';
  _bottoneRicalcolo();
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
  btn.disabled = false; btn.textContent = 'Salva';
}

// Riga di spiegazione sotto un campo delle Impostazioni (una sola, riusata alle aperture dopo)
function _notaImpostazioni(dopo, id, testo) {
  let n = document.getElementById(id);
  if(!n) { n = document.createElement('div'); n.id = id; n.style.cssText = 'font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:4px;'; dopo.parentElement.appendChild(n); }
  n.textContent = testo;
}
// Il pulsante «Ricalcola le calorie», sotto il livello di attività: dice quante kcal si usano oggi
// Dal 14 ottobre 2026 (Metodo 220) sta nella pagina Cibo, in cima: il livello di attività resta in «Il tuo obiettivo».
function _bottoneRicalcolo() {
  const box = document.getElementById('set-calorie-box') || (document.getElementById('set-activity') || {}).parentElement;
  if(!box) return;
  let b = document.getElementById('set-ricalcola');
  if(!b) {
    b = document.createElement('button'); b.type = 'button'; b.id = 'set-ricalcola'; b.className = 'btn btn-ghost btn-sm';
    b.style.cssText = 'margin-top:8px;width:100%;'; b.onclick = ricalcolaCalorie;
    box.appendChild(b);
  }
  b.textContent = `Ricalcola le calorie dal fabbisogno · oggi ${fmtNum(ST.TARGET.kcal)} kcal`;
}
// Nutrition 030 e 040: l'unico posto in cui le calorie si rifanno dal fabbisogno, su scelta della persona e coi numeri
// in chiaro (fabbisogno, obiettivo e suo deficit o surplus, calorie di oggi). Niente si scrive finché non dice sì.
async function ricalcolaCalorie() {
  const p = ST.profile || {};
  const pesate = (typeof getWeighIns === 'function') ? getWeighIns() : [];
  const peso = (pesate[0] && pesate[0].weight_kg != null) ? Number(pesate[0].weight_kg) : Number(p.weight_kg);
  if(!peso) { await avvisa('Senza un peso non si calcola il fabbisogno: pesati prima da «Pesati ora».', { titolo:'Manca il peso' }); return; }
  const activity = document.getElementById('set-activity')?.value || p.activity_level || 'moderate';
  const obiettivo = document.getElementById('set-obiettivo')?.value || (p.obiettivo || '').split(',')[0] || 'mantenimento';
  const age = p.age || ageFromDob(p.data_nascita) || 35;
  const r = calcTDEE(p.sex || 'M', age, p.height_cm || 175, peso, activity, obiettivo);
  const etichetta = (typeof OBJ_ADAPT !== 'undefined' && OBJ_ADAPT[obiettivo] && OBJ_ADAPT[obiettivo].label) || obiettivo;
  const attivita = document.getElementById('set-activity')?.selectedOptions?.[0]?.textContent || activity;
  const passo = r.delta === 0 ? 'al fabbisogno pieno' : `${r.delta > 0 ? '+' : '−'}${Math.abs(r.delta)} kcal`;
  const testo = `Fabbisogno stimato: ${fmtNum(r.tdee)} kcal al giorno (${peso} kg, ${String(attivita).toLowerCase()}). ${etichetta}: ${passo} → ${fmtNum(r.target)} kcal. Oggi usi ${fmtNum(ST.TARGET.kcal)} kcal.`;
  const ok = await chiediConferma(testo, { titolo:'Ricalcolare le calorie?', ok:`Usa ${fmtNum(r.target)} kcal`, annulla:'Lascia com\'è' });
  if(!ok) return;
  const righe = { target_kcal:r.target, target_protein:r.protein, target_carbs:r.carbs, target_fat:r.fat, activity_level:activity, updated_at:new Date().toISOString() };
  const res = await dbq('aggiornare le calorie', supa.from('profiles').update(righe).eq('id', ST.user.id));
  if(res.error) return;
  Object.assign(ST.profile, righe);
  ST.TARGET = { kcal:r.target, protein:r.protein, carbs:r.carbs, fat:r.fat };
  applyProfile(ST.profile);
  saveCache();
  _bottoneRicalcolo();
  showToast(`Da ora il piano usa ${fmtNum(r.target)} kcal`, '✅', 4500);
  checkLowKcalAndWarn(r.target, p.sex);
}

// ── Scarica i miei dati (Fondamenta 170, 3 ottobre 2026) ──
// Legge le tabelle della persona coi suoi permessi normali (RLS), a pagine, e le mette in un
// file JSON. Delle foto solo l'elenco (nome del file nel bucket), mai i byte. Una tabella che
// non c'e' o non si legge resta scritta come tale, non sparisce in silenzio (L10).
const MIEI_DATI_TABELLE = ['meals', 'meal_items', 'fasting_days', 'supplements', 'supplements_log', 'supplement_packages',
  'supplement_package_items', 'training_logs', 'training_notes', 'workouts', 'schede_utente', 'weight_logs', 'body_logs',
  'body_checks', 'body_measurements', 'body_check_ai', 'fitdays_letture', 'blood_tests', 'weekly_pictures', 'coach_proposals', 'daily_log', 'rilevazioni',
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
// ── Elimina account (Fondamenta 170, deciso da Ignazio il 3 ottobre 2026) ──
// Dal profilo: si scrive ELIMINA, poi l'app toglie le foto col proprio permesso e chiama la
// funzione del database elimina_mio_account (migrazione 20261003_170), che cancella l'accesso e,
// a cascata, tutte le righe della persona. Se un passo fallisce ci si ferma e si dice cosa e'
// successo. L'account di amministrazione non si cancella da qui.
async function eliminaMioAccount(){
  if(!ST.user || !ST.user.id) return;
  if(typeof APP_ONLY_EMAIL !== 'undefined' && ST.user.email === APP_ONLY_EMAIL){ showToast('L\'account di amministrazione non si cancella da qui', '⚠️', 5500); return; }
  const parola = await chiediTesto('Eliminare l\'account?', { segnaposto:'ELIMINA', ok:'Elimina account',
    testo:'Dati, foto e accesso vengono eliminati per sempre. Prima puoi scaricare i tuoi dati. Per confermare scrivi ELIMINA.' });
  if(parola === null) return;
  if(String(parola).trim().toUpperCase() !== 'ELIMINA'){ showToast('Parola diversa: non ho cancellato niente', '⚠️'); return; }
  const uid = ST.user.id;
  // 1. le foto, coi permessi della persona
  const foto = await dbqAll('leggere l\'elenco delle foto', () => supa.from('body_check_photos').select('storage_path').eq('user_id', uid).order('id', { ascending:true }), { silenzioso:true });
  if(foto.error){ await avvisa('Non riesco a leggere l\'elenco delle foto: non ho cancellato niente. Riprova.', { titolo:'Account non eliminato' }); return; }
  const percorsi = (foto.data || []).map(f => f.storage_path).filter(Boolean);
  // gli screenshot di «Invia Feedback» (Fondamenta 230): la cartella della persona nel bucket privato, letta prima di togliere qualsiasi cosa
  const screenshot = await dbq('leggere gli screenshot inviati', supa.storage.from('segnalazioni').list(uid, { limit:1000 }), { silenzioso:true });
  if(screenshot.error){ await avvisa('Non riesco a leggere gli screenshot che hai inviato: non ho cancellato niente. Riprova.', { titolo:'Account non eliminato' }); return; }
  const percorsiScreenshot = (screenshot.data || []).filter(f => f && f.name).map(f => uid + '/' + f.name);
  if(percorsi.length){
    const r = await dbq('cancellare le foto', supa.storage.from('body-check-photos').remove(percorsi), { silenzioso:true });
    if(r.error){ await avvisa('Non riesco a cancellare le foto: non ho cancellato niente. Riprova.', { titolo:'Account non eliminato' }); return; }
  }
  if(percorsiScreenshot.length){
    const r = await dbq('cancellare gli screenshot', supa.storage.from('segnalazioni').remove(percorsiScreenshot), { silenzioso:true });
    if(r.error){ await avvisa('Non riesco a cancellare gli screenshot: le foto sono state tolte, ma l\'account c\'è ancora. Riprova.', { titolo:'Account non eliminato' }); return; }
  }
  // 2. l'accesso, e con lui tutte le righe
  const res = await dbq('eliminare l\'account', supa.rpc('elimina_mio_account'), { silenzioso:true });
  if(res.error){ await avvisa('Le foto sono state tolte, ma non riesco a eliminare l\'account e i dati. Scrivi a chi gestisce l\'app.', { titolo:'Account non eliminato' }); return; }
  try { localStorage.clear(); } catch(e) {}
  try { await supa.auth.signOut(); } catch(e) {}
  ST.user = null; ST.profile = null; ST.db = { days:{} }; ST.supps = [];
  closeSettingsModal();
  showScreen('auth');
  avvisa('Il tuo account e i tuoi dati sono stati eliminati.', { titolo:'Fatto' });
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

  const goalW  = parseFloat(document.getElementById('set-goal-weight').value) || ST.profile?.goal_weight_kg;
  const activity = document.getElementById('set-activity').value;

  // Nutrition 040 (Ondata 4, 13 ottobre 2026): salvare le impostazioni non riscrive più le calorie. Prima un peso o
  // un'attività diversi rifacevano i target da zero (fabbisogno −300, macro 40/30/30), cancellando senza avviso una
  // correzione di Pirsi accettata. Ora i target cambiano solo con «Ricalcola le calorie» (scelta esplicita, coi numeri
  // in chiaro) o con un «Accetto» a Pirsi. Il peso si salva solo da «Pesati ora».
  const targets = { kcal: ST.TARGET.kcal, protein: ST.TARGET.protein, carbs: ST.TARGET.carbs, fat: ST.TARGET.fat };

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
    btn.disabled=false; btn.textContent='Salva'; return;
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
  btn.disabled = false; btn.textContent = 'Salva';
  setVai('elenco');            // Metodo 220: «Salva» torna all'elenco, aggiornato
  showToast('Salvato', '✅');
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
