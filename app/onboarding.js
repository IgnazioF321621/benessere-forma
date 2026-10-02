// ═══════════════════════════════════════
// app/onboarding.js — l'onboarding (Fondamenta 035, tappa 9, 2 ottobre 2026)
// ═══════════════════════════════════════
// Il calcolo del fabbisogno (TDEE) con la soglia minima di calorie, M1 (benvenuto, accesso, i 7 passi),
// il codice di accesso via email (OTP), l'anteprima dell'onboarding, saveOnboarding e l'ingresso in M2.
// Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO app/pirsi.js e PRIMA del resto del proprio codice: qui al caricamento
// si dichiarano solo costanti scritte per esteso, niente che usi un nome scritto più avanti nella
// pagina (lo controlla tools/banco/prova_ordine_caricamento.js).

// ═══════════════════════════════════════════════════════════
// TDEE CALCULATOR
// ═══════════════════════════════════════════════════════════
const ACTIVITY_MULT = {sedentary:1.2, lightly_active:1.375, moderate:1.55, active:1.725, very_active:1.9};

// ── Fix B (24 mag 2026) — Guard-rail calorie minime ─────────────────────────
// Soglie sotto cui i target calorici calcolati sono considerati troppo bassi
// per essere sani: l'app mostra un avviso che invita a confrontarsi con un
// professionista (medico/nutrizionista) prima di seguire il piano.
//
// ⚠️ VALORI INDICATIVI — DA VALIDARE con un nutrizionista prima del rilascio
// pubblico. Modificabili da qui in un unico punto.
//
// Sesso 'Altro' o non specificato → usa la soglia più PRUDENTE (KCAL_MIN_F)
// per non lasciare scoperto nessun caso limite.
const KCAL_MIN_F = 1200; // donne
const KCAL_MIN_M = 1500; // uomini

// Ritorna la soglia kcal minima coerente col sesso del profilo.
// 'M' → 1500. 'F' o qualsiasi altro valore ('O'/'Altro'/null/undefined) → 1200 (prudente).
function _kcalMinForSex(sex) {
  return (sex === 'M') ? KCAL_MIN_M : KCAL_MIN_F;
}

// Mostra un modal d'avviso (NON toast) quando target_kcal è sotto soglia.
// Pattern: info-modal-overlay (stesso usato da showInfoModal), per coerenza UX
// con gli altri messaggi importanti dell'app. Non blocca, non chiede conferma:
// informa e raccomanda. L'utente chiude e prosegue normalmente.
// Idempotente: se un avviso è già a schermo, NON ne aggiunge un secondo.
function showLowKcalWarning(targetKcal, sex) {
  if (document.querySelector('.info-modal-overlay[data-warning="low-kcal"]')) return;
  const kcal = Math.round(Number(targetKcal) || 0);
  const soglia = _kcalMinForSex(sex);
  const el = document.createElement('div');
  el.className = 'info-modal-overlay';
  el.setAttribute('data-warning', 'low-kcal');
  el.innerHTML = `<div class="info-modal">
    <h3>⚠️ Valori molto bassi</h3>
    <p>I valori calcolati sono molto bassi (<strong>${kcal} kcal</strong>, sotto la soglia di sicurezza di ${soglia} kcal).</p>
    <p>Ti consigliamo di <strong>confrontarti con un medico o un nutrizionista</strong> prima di seguire un piano basato su questi numeri. L'app continuerà a funzionare normalmente.</p>
    <button class="info-modal-close" onclick="this.closest('.info-modal-overlay').remove()">Ho capito</button>
  </div>`;
  document.body.appendChild(el);
}

// Controllo soglia: chiamato DOPO il calcolo target nei 3 punti dell'app
// (onboarding finale, modal Aggiorna peso, modal Impostazioni profilo).
// Se sotto soglia → mostra l'avviso. Non altera il valore calcolato.
function checkLowKcalAndWarn(targetKcal, sex) {
  const soglia = _kcalMinForSex(sex);
  const kcal = Number(targetKcal) || 0;
  if (kcal > 0 && kcal < soglia) {
    showLowKcalWarning(kcal, sex);
    return true;
  }
  return false;
}

function calcTDEE(sex, age, height, weight, activity) {
  // Mifflin-St Jeor
  let bmr = sex==='M'
    ? 10*weight + 6.25*height - 5*age + 5
    : 10*weight + 6.25*height - 5*age - 161;
  const tdee = Math.round(bmr * (ACTIVITY_MULT[activity] || 1.55));
  // Per perdita peso: -300 kcal dal TDEE
  const target = tdee - 300;
  return {
    tdee,
    target,
    protein: Math.round((target * 0.30) / 4),
    carbs:   Math.round((target * 0.40) / 4),
    fat:     Math.round((target * 0.30) / 9),
  };
}

function ageFromDob(dob) {
  if (!dob) return null;
  const today = new Date(), born = new Date(dob);
  let age = today.getFullYear() - born.getFullYear();
  if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age--;
  return age > 0 ? age : null;
}

// ═══════════════════════════════════════════════════════════
// M1 ONBOARDING — nuovo (welcome + auth + 7 step)
// ═══════════════════════════════════════════════════════════

// ── AUTH state machine (dentro #auth-screen) ──────────────
function m1ShowAuth(state) {
  ST.m1AuthState = state;
  const w = document.getElementById('m1-welcome');
  const e = document.getElementById('auth-step1');
  const o = document.getElementById('auth-step2');
  if(w) w.style.display = (state === 'welcome') ? 'flex' : 'none';
  if(e) e.style.display = (state === 'email')   ? 'flex' : 'none';
  if(o) o.style.display = (state === 'otp')     ? 'flex' : 'none';
  hideAuthMsg();
  if(state === 'email') setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
  if(state === 'otp') {
    // reset OTP cells + start resend timer
    ST.m1OtpCells = ['','','','','',''];
    document.querySelectorAll('#m1-otp-grid .m1-otp-cell').forEach(el => { el.value = ''; });
    document.getElementById('auth-otp').value = '';
    const emailPill = document.getElementById('m1-otp-email');
    if(emailPill) emailPill.textContent = _otpEmail;
    m1StartResendTimer();
    setTimeout(() => document.querySelector('#m1-otp-grid .m1-otp-cell')?.focus(), 100);
  }
}

// ── OTP cells (6 caselle) ──────────────────────────────────
function m1OtpInput(idx, e) {
  let v = (e.target.value || '').replace(/\D/g, '');
  if(v.length > 1) v = v.slice(0, 1);  // 1 carattere per cella (paste gestito altrove)
  e.target.value = v;
  ST.m1OtpCells[idx] = v;
  // sync hidden input
  document.getElementById('auth-otp').value = ST.m1OtpCells.join('');
  // auto-advance focus
  if(v && idx < 5) {
    const cells = document.querySelectorAll('#m1-otp-grid .m1-otp-cell');
    cells[idx + 1]?.focus();
  }
  // 6 cifre complete → verifica auto
  if(ST.m1OtpCells.join('').length === 6) verifyOTP();
}
function m1OtpKey(idx, e) {
  if(e.key === 'Backspace' && !e.target.value && idx > 0) {
    const cells = document.querySelectorAll('#m1-otp-grid .m1-otp-cell');
    cells[idx - 1]?.focus();
  }
}
function m1OtpPaste(e) {
  e.preventDefault();
  const txt = (e.clipboardData || window.clipboardData).getData('text') || '';
  const digits = txt.replace(/\D/g, '').slice(0, 6);
  if(!digits) return;
  const cells = document.querySelectorAll('#m1-otp-grid .m1-otp-cell');
  for(let i = 0; i < 6; i++) {
    const d = digits[i] || '';
    ST.m1OtpCells[i] = d;
    if(cells[i]) cells[i].value = d;
  }
  document.getElementById('auth-otp').value = ST.m1OtpCells.join('');
  cells[Math.min(digits.length, 5)]?.focus();
  if(digits.length === 6) verifyOTP();
}

let _m1ResendInterval = null;
function m1StartResendTimer() {
  ST.m1OtpResendIn = 30;
  m1UpdateResendText();
  if(_m1ResendInterval) clearInterval(_m1ResendInterval);
  _m1ResendInterval = setInterval(() => {
    ST.m1OtpResendIn--;
    if(ST.m1OtpResendIn <= 0) {
      clearInterval(_m1ResendInterval); _m1ResendInterval = null;
    }
    m1UpdateResendText();
  }, 1000);
}
function m1UpdateResendText() {
  const el = document.getElementById('m1-otp-resend');
  if(!el) return;
  if(ST.m1OtpResendIn > 0) {
    el.innerHTML = `Non l'hai ricevuto? Rinvia tra <b style="cursor:default;text-decoration:none;">${ST.m1OtpResendIn}s</b>`;
  } else {
    el.innerHTML = `Non l'hai ricevuto? <b onclick="m1Resend()">Rinvia il codice</b>`;
  }
}
async function m1Resend() {
  if(ST.m1OtpResendIn > 0) return;
  const {error} = await supa.auth.signInWithOtp({ email: _otpEmail, options: { shouldCreateUser: true } });
  if(error) { showAuthMsg('Errore reinvio: ' + error.message, 'err'); return; }
  m1StartResendTimer();
}

// ── M1 step navigation ────────────────────────────────────
// I 5 nuovi step (25 mag 2026) usano slug non-numerici per non rompere il pattern
// `parseInt(stepId.slice(1))` legacy. La navigazione passa per getM1Sequence()
// che restituisce l'array dinamico di step ID in ordine, basato su ST.m1Data
// (usa_training + tipo_allenamento). Indice e totale "Passo X di N" sono calcolati
// runtime sulla sequenza effettiva (8 step se solo nutrition, 11-12 se training).
const M1_HEADERS = {
  s1:        { title:'Iniziamo da te',          sub:'Useremo il tuo nome per parlarti durante il percorso.' },
  s2:        { title:'Parlaci di te',           sub:'Servono per calcolare il tuo fabbisogno e personalizzare il piano.' },
  s3:        { title:"Definiamo l'obiettivo",   sub:'Scegli il tuo obiettivo. Potrai cambiarlo più avanti.' },
  's-coach': { title:'Come vuoi<br>essere seguito?', sub:`Da qui in poi ti segue ${COACH_NAME} (il tuo coach AI). Prepara i tuoi piani, li aggiusta su come vai, e ogni tanto ti dice come stai andando.` },
  s4:        { title:'Il tuo livello',          sub:'Per calibrare il piano alle tue capacità reali.' },
  's-where': { title:'Dove ti alleni?',         sub:`${COACH_NAME} adatta i workout allo spazio che hai.` },
  's-gear':  { title:'Cosa hai a disposizione?',sub:'Seleziona gli attrezzi che hai in casa. Il corpo libero è sempre incluso.' },
  's-days':  { title:'Quanti giorni a settimana?', sub:'Scegli il ritmo che riesci a mantenere davvero.' },
  's-time':  { title:'Quanto vuoi che sia la sessione?',sub:`Quanti esercizi monta ${COACH_NAME}. Puoi cambiarlo più avanti.` },
  s5:        { title:'Come mangi',              sub:'Per costruire un piano che rispetti il tuo stile alimentare.' },
  s6:        { title:'Cosa devo sapere',        sub:'Aree del corpo o condizioni che richiedono attenzione. Ci servono per adattare il piano allenamento.' },
  s7:        { title:'',                        sub:'I tuoi dati base sono salvati. Manca un ultimo passo per attivare il tuo piano personale.' },
};

// Card descrittive dinamiche sotto le tile numero (Step D giorni, Step E tempo).
// Mostrate solo dopo selezione, sostituiscono nulla finché vuote.
const M1_DAYS_DESC = {
  2: { title: '2 giorni',                desc: 'Una sessione totale per metà settimana. Recupero ampio.' },
  3: { title: '3 giorni',                desc: 'Tre sessioni complete, buon equilibrio tra stimolo e recupero. Ottimo punto di partenza.' },
  4: { title: '4 giorni · UPPER / LOWER',desc: 'Split su parte alta e bassa. Lavoro più mirato per muscolo.' },
  5: { title: '5 giorni · U/L + EXTRA',  desc: 'Quattro sessioni split più un giorno dedicato (core o cardio).' },
};

// Slug attrezzi accessori elastici (gestione visibility/cleanup quando "elastici_tubo" è spento).
const M1_GEAR_ELASTIC_ACCESSORIES = ['maniglie','barra_corta','barra_lunga','cavigliere'];

// Sequenza dinamica step M1 — dipende da usa_training + tipo_allenamento.
// Ritorna l'array ordinato di step ID che l'utente attraverserà.
// - 8 step se usa_training=false (solo nutrition)
// - 11 step se usa_training=true (palestra o aperto: skip Step C attrezzatura)
// - 12 step se usa_training=true && tipo_allenamento='casa' (include Step C)
// NB: quando usa_training=null (non ancora scelto) trattiamo come "lungo" (default
// dell'app) — la sequenza si aggiorna automaticamente alla scelta su s-coach.
function getM1Sequence() {
  const d = ST.m1Data;
  const seq = ['s1','s2','s3','s-coach'];
  if (d.usa_training === false) {
    // Percorso solo-nutrition: salta blocco training, mantieni s4 (attività+esperienza)
    // perché serve per calcolare TDEE e per il coach in tutti i casi.
    seq.push('s4','s5','s6','s7');
  } else {
    // Percorso completo (true OR null): s4 + blocco training + s5/s6/s7
    seq.push('s4','s-where');
    if (d.tipo_allenamento === 'casa') seq.push('s-gear');
    seq.push('s-days','s-time','s5','s6','s7');
  }
  return seq;
}

// Le due card dello step s-coach sono HTML statico nel body: il nome del coach
// non può arrivarci da un template, quindi lo scriviamo qui a runtime. Così
// COACH_NAME resta l'unico posto dove il nome esiste per davvero.
function m1ApplyCoachNameToCards() {
  const desc = (v) => document.querySelector(
    `#m1-s-coach .m1-card-level[data-coach="${v}"] .m1-card-level-desc`);
  const base = desc('false');
  const full = desc('true');
  if(base) base.textContent = `${COACH_NAME} pensa ai tuoi pasti e ai tuoi integratori.`;
  if(full) full.textContent = `${COACH_NAME} ti segue anche con i workout su misura.`;
}

function m1GoStep(stepId) {
  if(!M1_HEADERS[stepId]) return;
  if(stepId === 's-coach') m1ApplyCoachNameToCards();
  ST.m1Step = stepId;
  // toggle visibility steps
  document.querySelectorAll('#onboarding-screen .m1-step').forEach(el => el.classList.remove('active'));
  document.getElementById('m1-' + stepId)?.classList.add('active');
  // posizione dinamica nella sequenza effettiva
  const seq = getM1Sequence();
  let idx = seq.indexOf(stepId);
  if (idx < 0) idx = 0;
  const n = idx + 1;
  const total = seq.length;
  // header (innerHTML per supportare <br> nei titoli statici — stringhe non utente)
  let title = M1_HEADERS[stepId].title;
  if(stepId === 's7') {
    const nome = (ST.m1Data.nome || '').trim() || 'amico';
    title = `Ci siamo, ${nome}.`;
  }
  const titleEl = document.getElementById('m1-title');
  const subEl   = document.getElementById('m1-subtitle');
  const lblEl   = document.getElementById('m1-progress-label');
  if(titleEl) titleEl.innerHTML = title;
  if(subEl)   subEl.textContent = M1_HEADERS[stepId].sub;
  if(lblEl)   lblEl.textContent = `Passo ${n} di ${total}`;
  // render dinamico segmenti progress bar (numero variabile in base alla sequenza)
  const barEl = document.getElementById('m1-progress-bar');
  if (barEl) {
    let html = '';
    for (let i = 1; i <= total; i++) {
      const done = i <= n ? ' done' : '';
      html += `<span class="m1-progress-segment${done}" data-seg="${i}"></span>`;
    }
    barEl.innerHTML = html;
  }
  // back button: visibile da step 2 in poi nella sequenza
  const back = document.getElementById('m1-back-btn');
  if(back) back.style.display = idx > 0 ? 'block' : 'none';
  // restore UI specifici nuovi step (visibility accessori, explainer)
  if (stepId === 's4')     m1S4ApplyExperienceVisibility();
  if (stepId === 's-gear') m1GearApplyVisibility();
  if (stepId === 's-days') m1DaysApplyExplainer();
  // err reset + scroll top
  const errEl = document.getElementById('m1-err-' + stepId);
  if(errEl) errEl.classList.remove('show');
  document.getElementById('onboarding-screen').scrollTop = 0;
}

function m1Back() {
  const seq = getM1Sequence();
  const idx = seq.indexOf(ST.m1Step);
  if (idx <= 0) return;
  m1GoStep(seq[idx - 1]);
}

function m1NextFrom(stepId) {
  const errEl = document.getElementById('m1-err-' + stepId);
  const showErr = (msg) => { if(errEl){ errEl.textContent = msg; errEl.classList.add('show'); } };
  if(errEl) errEl.classList.remove('show');
  const d = ST.m1Data;
  if(stepId === 's1') {
    if(!d.nome || !d.nome.trim())    return showErr('Inserisci il nome.');
    if(!d.cognome || !d.cognome.trim()) return showErr('Inserisci il cognome.');
  } else if(stepId === 's2') {
    if(!d.eta || d.eta < 14 || d.eta > 120) return showErr("Inserisci un'età valida.");
    if(!d.sesso) return showErr('Scegli un sesso.');
    if(!d.altezza || d.altezza < 100 || d.altezza > 230) return showErr("Inserisci un'altezza valida (cm).");
    if(!d.peso_attuale || d.peso_attuale < 30 || d.peso_attuale > 300) return showErr('Inserisci il peso attuale (kg).');
    if(!d.peso_obiettivo || d.peso_obiettivo < 30 || d.peso_obiettivo > 300) return showErr('Inserisci il peso obiettivo (kg).');
  } else if(stepId === 's3') {
    // Fix A1: obiettivo singolo obbligatorio (length deve essere ESATTAMENTE 1)
    if(!d.obiettivi || d.obiettivi.length !== 1) return showErr('Scegli il tuo obiettivo.');
  } else if(stepId === 's-coach') {
    if(typeof d.usa_training !== 'boolean') return showErr("Scegli un'opzione.");
  } else if(stepId === 's4') {
    if(!d.attivita)    return showErr('Scegli il tuo livello di attività.');
    // Esperienza richiesta SOLO per il percorso completo (usa_training !== false).
    // Per gli utenti solo-nutrition il blocco è nascosto: non si può chiedere una
    // selezione che non viene mostrata. Coerente con d.esperienza = null in DB.
    if(d.usa_training !== false && !d.esperienza) {
      return showErr("Scegli il tuo livello di esperienza con l'allenamento.");
    }
  } else if(stepId === 's-where') {
    if(!d.tipo_allenamento) return showErr('Scegli dove ti alleni.');
  } else if(stepId === 's-gear') {
    // nessuna validazione: anche zero attrezzi è valido (corpo libero implicito)
  } else if(stepId === 's-days') {
    if(!d.giorni_allenamento) return showErr('Scegli quanti giorni a settimana.');
  } else if(stepId === 's-time') {
    if(!d.volume_sessione) return showErr('Scegli il livello della sessione.');
  } else if(stepId === 's5') {
    if(!d.stile_alimentare) return showErr('Scegli il tuo stile alimentare.');
  }
  // s6 e s7: no required fields. s7 callback è saveOnboarding diretto.
  const seq = getM1Sequence();
  const idx = seq.indexOf(stepId);
  if (idx < 0 || idx >= seq.length - 1) return;
  m1GoStep(seq[idx + 1]);
}

// ── Toggles / setters per step content ─────────────────────
function m1SetSesso(s) {
  ST.m1Data.sesso = s;
  ['M','F','O'].forEach(x =>
    document.getElementById('m1-sex-' + x)?.classList.toggle('active', x === s));
}
// Fix A1 (24 mag 2026) — Obiettivo SINGOLO (radio-like).
// Toccare un obiettivo lo rende l'UNICO selezionato. Tap su uno diverso = scambio silenzioso.
// Tap sullo stesso già selezionato = no-op (NON deseleziona, NON ripete il toast).
// L'array `obiettivi` resta per minimo impatto, ma contiene SEMPRE al massimo 1 elemento.
function m1ToggleObiettivo(key) {
  const arr = ST.m1Data.obiettivi;
  const already = (arr.length === 1 && arr[0] === key);
  if(already) return; // no-op silenzioso se è già l'obiettivo corrente
  // Replace: l'array contiene SOLO il nuovo obiettivo (scambio o prima selezione)
  ST.m1Data.obiettivi = [key];
  // Apply classes: niente più .disabled, c'è solo .selected sulla card scelta
  document.querySelectorAll('#m1-goal-grid .m1-card-goal').forEach(el => {
    const k = el.getAttribute('data-goal');
    el.classList.toggle('selected', k === key);
    el.classList.remove('disabled');
  });
  // Toast informativo (durata 5000ms — il testo è lungo, serve tempo per leggerlo
  // con calma). Mostrato solo a selezione NUOVA (no-op qui sopra evita martellamento
  // su ritocco stesso obiettivo). Convenzione generale (24 mag 2026): la durata
  // toast va proporzionata alla lunghezza del testo — toast lunghi/importanti
  // 5000ms+; toast brevi restano sul default.
  showToast('Obiettivo impostato. ' + COACH_NAME + ' userà questo per costruire i tuoi pasti e i tuoi piani', '📋', 5000);
}
function m1SetAttivita(a) {
  ST.m1Data.attivita = a;
  document.querySelectorAll('#m1-s4 [data-act]').forEach(el =>
    el.classList.toggle('selected', el.getAttribute('data-act') === a));
}
function m1SetEsperienza(e) {
  ST.m1Data.esperienza = e;
  document.querySelectorAll('#m1-s4 [data-esp]').forEach(el =>
    el.classList.toggle('selected', el.getAttribute('data-esp') === e));
}
function m1SetStile(s) {
  ST.m1Data.stile_alimentare = s;
  document.querySelectorAll('#m1-s5 [data-diet]').forEach(el =>
    el.classList.toggle('selected', el.getAttribute('data-diet') === s));
}
function m1TogglePill(group, val) {
  const arr = ST.m1Data[group];
  const i = arr.indexOf(val);
  if(i >= 0) arr.splice(i, 1);
  else arr.push(val);
  const attr = group === 'intolleranze' ? 'data-intol' : 'data-lim';
  document.querySelectorAll(`[${attr}="${val}"]`).forEach(el =>
    el.classList.toggle('selected', arr.includes(val)));
  // gestione speciale "altro"
  if(val === 'altro') m1ToggleAltro(group === 'intolleranze' ? 'intol' : 'lim');
}

// ── Handler Step A (s-coach) — Interruttore Nutrition / Nutrition+Training ──
// Bool esplicito: false = solo Alimentazione, true = Alimentazione + Allenamento.
// La scelta dirotta la sequenza degli step successivi (vedi getM1Sequence).
// Fix 26 mag 2026: quando l'utente passa a "Alimentazione" (false), reset
// d.esperienza a null perché il blocco "Esperienza con l'allenamento" nello
// step s4 viene nascosto — non avrebbe senso mantenere un valore selezionato
// che l'utente non vede più. Se poi cambia idea e torna su "Alimentazione e
// allenamento", il blocco riappare vuoto e l'utente sceglie ex novo.
function m1SelectUsaTraining(val) {
  const v = !!val;
  const prev = ST.m1Data.usa_training;
  ST.m1Data.usa_training = v;
  document.querySelectorAll('#m1-s-coach .m1-card-level').forEach(el => {
    const k = el.getAttribute('data-coach') === 'true';
    el.classList.toggle('selected', k === v);
  });
  // Cleanup esperienza se passiamo a solo-nutrition
  if (v === false && prev !== false) {
    ST.m1Data.esperienza = null;
    document.querySelectorAll('#m1-s4 [data-esp]').forEach(el =>
      el.classList.remove('selected'));
  }
}

// ── Handler Step B (s-where) — Dove ti alleni? ──
function m1SelectTipoAllenamento(val) {
  ST.m1Data.tipo_allenamento = val;
  document.querySelectorAll('#m1-s-where .m1-card-level').forEach(el =>
    el.classList.toggle('selected', el.getAttribute('data-where') === val));
}

// ── Handler Step C (s-gear) — Attrezzatura casa ──
// RITOCCO 2: il gruppo "Accessori elastici" è visibile SOLO se "Elastici a tubo"
// è acceso. Spegnere "Elastici a tubo" deseleziona anche gli accessori già scelti
// (no fantasmi salvati in DB senza la pillola madre).
function m1ToggleAttrezzatura(slug) {
  const arr = ST.m1Data.attrezzatura;
  const i = arr.indexOf(slug);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(slug);
  document.querySelectorAll(`#m1-s-gear [data-gear="${slug}"]`).forEach(el =>
    el.classList.toggle('selected', arr.includes(slug)));
  // Cleanup accessori elastici se "elastici_tubo" è stato spento
  if (slug === 'elastici_tubo' && !arr.includes('elastici_tubo')) {
    M1_GEAR_ELASTIC_ACCESSORIES.forEach(acc => {
      const ai = arr.indexOf(acc);
      if (ai >= 0) arr.splice(ai, 1);
      document.querySelectorAll(`#m1-s-gear [data-gear="${acc}"]`).forEach(el =>
        el.classList.remove('selected'));
    });
  }
  m1GearApplyVisibility();
}

// Show/hide del blocco "Esperienza con l'allenamento" (s4) in base a usa_training.
// Nascosto se usa_training === false (utente solo-nutrition): è un dato che ha
// senso solo per chi si allena. Quando il blocco è nascosto, m1NextFrom('s4')
// non richiede d.esperienza per avanzare (validazione condizionale).
function m1S4ApplyExperienceVisibility() {
  const block = document.getElementById('m1-s4-experience-block');
  if (!block) return;
  const hide = (ST.m1Data.usa_training === false);
  block.style.display = hide ? 'none' : '';
}

// Show/hide del blocco "Accessori elastici" in base a presenza di "elastici_tubo".
function m1GearApplyVisibility() {
  const block = document.getElementById('m1-gear-accessories-block');
  if (!block) return;
  const on = (ST.m1Data.attrezzatura || []).includes('elastici_tubo');
  block.style.display = on ? 'block' : 'none';
}

// ── Handler Step D (s-days) — Giorni a settimana ──
function m1SelectGiorni(val) {
  const v = parseInt(val, 10);
  ST.m1Data.giorni_allenamento = v;
  document.querySelectorAll('#m1-s-days [data-days]').forEach(el =>
    el.classList.toggle('selected', parseInt(el.getAttribute('data-days'), 10) === v));
  m1DaysApplyExplainer();
}
function m1DaysApplyExplainer() {
  const val = ST.m1Data.giorni_allenamento;
  const box = document.getElementById('m1-days-explainer');
  const tEl = document.getElementById('m1-days-explainer-title');
  const dEl = document.getElementById('m1-days-explainer-desc');
  if (!box) return;
  if (!val || !M1_DAYS_DESC[val]) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  if (tEl) tEl.textContent = M1_DAYS_DESC[val].title;
  if (dEl) dEl.textContent = M1_DAYS_DESC[val].desc;
}

// ── Handler Step E (s-time) — Volume sessione (Essenziale / Completo) ──
// Sostituisce la vecchia scelta minuti (durata_sessione, ora dormiente in DB).
function m1SelectVolume(val) {
  const v = (val === 'essenziale') ? 'essenziale' : 'completo';
  ST.m1Data.volume_sessione = v;
  document.querySelectorAll('#m1-s-time [data-volume]').forEach(el =>
    el.classList.toggle('selected', el.getAttribute('data-volume') === v));
}
function m1ToggleAltro(which) {
  const isIntol = (which === 'intol');
  const arrKey = isIntol ? 'intolleranze' : 'limitazioni';
  const open = ST.m1Data[arrKey].includes('altro');
  const txtEl = document.getElementById(isIntol ? 'm1-altre-intol' : 'm1-altre-lim');
  const btnEl = document.getElementById(isIntol ? 'm1-intol-altro-btn' : 'm1-lim-altro-btn');
  if(txtEl) txtEl.style.display = open ? 'block' : 'none';
  if(btnEl) btnEl.classList.toggle('selected', open);
  if(!open) {
    const fld = isIntol ? 'altre_intolleranze' : 'altre_limitazioni';
    ST.m1Data[fld] = '';
    if(txtEl) txtEl.value = '';
  }
}

// Ripristina selezioni visive da ST.m1Data (usato all'entrata onboarding)
function m1ApplySelections() {
  // inputs valori
  const setVal = (id, val) => { const el = document.getElementById(id); if(el && val != null) el.value = val; };
  const d = ST.m1Data;
  setVal('m1-nome', d.nome);
  setVal('m1-cognome', d.cognome);
  setVal('m1-eta', d.eta);
  setVal('m1-altezza', d.altezza);
  setVal('m1-peso-att', d.peso_attuale);
  setVal('m1-peso-goal', d.peso_obiettivo);
  setVal('m1-altre-intol', d.altre_intolleranze);
  setVal('m1-altre-lim', d.altre_limitazioni);
  // sesso
  if(d.sesso) m1SetSesso(d.sesso);
  // obiettivi (Fix A1: selezione singola, niente .disabled, niente contatore)
  document.querySelectorAll('#m1-goal-grid .m1-card-goal').forEach(el => {
    const k = el.getAttribute('data-goal');
    const sel = (d.obiettivi || []).includes(k);
    el.classList.toggle('selected', sel);
    el.classList.remove('disabled');
  });
  // attivita/esperienza/stile
  if(d.attivita)   m1SetAttivita(d.attivita);
  if(d.esperienza) m1SetEsperienza(d.esperienza);
  if(d.stile_alimentare) m1SetStile(d.stile_alimentare);
  // pillole intolleranze/limitazioni
  (d.intolleranze || []).forEach(v => document.querySelectorAll(`[data-intol="${v}"]`).forEach(el => el.classList.add('selected')));
  (d.limitazioni  || []).forEach(v => document.querySelectorAll(`[data-lim="${v}"]`).forEach(el => el.classList.add('selected')));
  // textarea visibility
  const intolAltroOpen = (d.intolleranze || []).includes('altro');
  const limAltroOpen   = (d.limitazioni  || []).includes('altro');
  const tx1 = document.getElementById('m1-altre-intol'); if(tx1) tx1.style.display = intolAltroOpen ? 'block' : 'none';
  const tx2 = document.getElementById('m1-altre-lim');   if(tx2) tx2.style.display = limAltroOpen   ? 'block' : 'none';
  // Nuovo blocco training (25 mag 2026) — restore visuale
  if (typeof d.usa_training === 'boolean') {
    document.querySelectorAll('#m1-s-coach .m1-card-level').forEach(el => {
      const k = el.getAttribute('data-coach') === 'true';
      el.classList.toggle('selected', k === d.usa_training);
    });
  }
  // Visibility blocco esperienza in s4: gated da usa_training (26 mag 2026)
  m1S4ApplyExperienceVisibility();
  if (d.tipo_allenamento) {
    document.querySelectorAll('#m1-s-where .m1-card-level').forEach(el =>
      el.classList.toggle('selected', el.getAttribute('data-where') === d.tipo_allenamento));
  }
  (d.attrezzatura || []).forEach(slug => document.querySelectorAll(`#m1-s-gear [data-gear="${slug}"]`).forEach(el => el.classList.add('selected')));
  m1GearApplyVisibility();
  if (d.giorni_allenamento) {
    document.querySelectorAll('#m1-s-days [data-days]').forEach(el =>
      el.classList.toggle('selected', parseInt(el.getAttribute('data-days'), 10) === d.giorni_allenamento));
    m1DaysApplyExplainer();
  }
  if (d.volume_sessione) {
    document.querySelectorAll('#m1-s-time [data-volume]').forEach(el =>
      el.classList.toggle('selected', el.getAttribute('data-volume') === d.volume_sessione));
  }
}

// "Salta per ora" su step 7 — salva profilo + segna M2 skip
function m1FinalSkip() { return saveOnboarding({ skipM2: true }); }

// ═══════════════════════════════════════════════════════════
// AUTH — OTP
// ═══════════════════════════════════════════════════════════
let _otpEmail = '';

async function sendOTP() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { showAuthMsg('Inserisci la tua email.', 'err'); return; }
  const btn = document.getElementById('auth-btn');
  btn.disabled = true; btn.textContent = 'Invio in corso…';
  hideAuthMsg();

  const {error} = await supa.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  });

  if (error) {
    showAuthMsg('Errore: ' + error.message, 'err');
    btn.disabled = false; btn.textContent = 'Invia codice →';
    return;
  }

  // Passa allo step 2 (OTP) usando lo state-machine M1
  _otpEmail = email;
  btn.disabled = false; btn.textContent = 'Invia codice →';
  m1ShowAuth('otp');
}

async function verifyOTP() {
  const token = document.getElementById('auth-otp').value.trim().replace(/\D/g, '');
  if (token.length < 6) { showAuthMsg('Inserisci il codice completo.', 'err'); return; }
  const btn = document.getElementById('auth-otp-btn');
  btn.disabled = true; btn.textContent = 'Verifica…';
  hideAuthMsg();

  const {data, error} = await supa.auth.verifyOtp({ email: _otpEmail, token, type: 'email' });

  if (error) {
    showAuthMsg('Codice non valido o scaduto. Riprova.', 'err');
    btn.disabled = false; btn.textContent = 'Verifica e accedi →';
    // reset caselle OTP
    ST.m1OtpCells = ['','','','','',''];
    document.querySelectorAll('#m1-otp-grid .m1-otp-cell').forEach(el => { el.value = ''; });
    document.getElementById('auth-otp').value = '';
    document.querySelector('#m1-otp-grid .m1-otp-cell')?.focus();
    return;
  }

  ST.user = data.session.user;
  await loadAndStart();
}

function backToEmail() {
  document.getElementById('auth-otp').value = '';
  ST.m1OtpCells = ['','','','','',''];
  const btn = document.getElementById('auth-btn');
  if(btn) { btn.disabled = false; btn.textContent = 'Invia codice →'; }
  const otpBtn = document.getElementById('auth-otp-btn');
  if(otpBtn) { otpBtn.disabled = false; otpBtn.textContent = 'Verifica e accedi →'; }
  m1ShowAuth('email');
}

function showAuthMsg(msg, type) {
  const el = document.getElementById('auth-msg');
  el.style.display = 'block';
  el.className = 'auth-msg ' + type;
  el.textContent = msg;
}
function hideAuthMsg() {
  document.getElementById('auth-msg').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════

// Uscita pulita dalla modalità anteprima onboarding (25 mag 2026):
// - mostra un toast informativo
// - reset del flag e di ST.m1Data agli iniziali
// - rimuove `?preview=onboarding` dall'URL (history.replaceState — niente reload)
// - riporta l'app allo stato normale dell'utente:
//     · profilo reale completo → app (home)
//     · nessun profilo / non completo → schermata auth
// - non scrive mai su Supabase
function _exitOnboardingPreview(toastMsg) {
  ST.previewOnboarding = false;
  // Reset m1Data agli iniziali per non sporcare lo stato dell'app
  ST.m1Data = {
    nome:'', cognome:'',
    eta:null, sesso:null, altezza:null,
    peso_attuale:null, peso_obiettivo:null,
    obiettivi:[],
    usa_training:null, tipo_allenamento:null, attrezzatura:[],
    giorni_allenamento:null, volume_sessione:'completo',
    attivita:null, esperienza:null,
    stile_alimentare:null,
    intolleranze:[], altre_intolleranze:'', altro_intol_open:false,
    limitazioni:[], altre_limitazioni:'', altro_lim_open:false,
  };
  // Pulizia URL: rimuovi solo il parametro preview, conserva il resto
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('preview');
    history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + (url.hash || ''));
  } catch (e) { /* URL malformato: ignora */ }
  // Toast (durata 5000ms — convenzione "testi importanti più lunghi del default")
  try { if (typeof showToast === 'function') showToast(toastMsg || 'Anteprima conclusa', '🔒', 5000); } catch(e) {}
  // Riporta l'app allo stato normale dell'utente loggato
  if (ST.user && ST.profile && profileIsComplete(ST.profile)) {
    applyProfile(ST.profile);
    showScreen('app');
    try { renderOggi(); } catch(e) {}
    try { showPage('home'); } catch(e) {}
  } else {
    // Caso edge: anteprima invocata senza utente loggato o profilo incompleto
    showScreen('auth');
  }
}

async function saveOnboarding(opts) {
  opts = opts || {};
  const d = ST.m1Data;
  const errEl = document.getElementById('m1-err-s7');
  const showErr = (msg) => { if(errEl){ errEl.textContent = msg; errEl.classList.add('show'); } };
  if(errEl) errEl.classList.remove('show');

  // ── Guard modalità anteprima onboarding (25 mag 2026, sera) ──
  // Se l'utente è in `?preview=onboarding`, il flusso M1 è solo dimostrativo.
  // NON scriviamo nulla su Supabase, NON tocchiamo il profilo reale.
  // Mostriamo un toast informativo e riportiamo l'app allo stato precedente.
  if (ST.previewOnboarding) {
    return _exitOnboardingPreview('Anteprima conclusa — nessun dato è stato salvato.');
  }

  // Validazione minima (i passi precedenti hanno già validato; ridondanza difensiva)
  if(!d.nome || !d.nome.trim())      return showErr('Inserisci il nome.');
  if(!d.cognome || !d.cognome.trim()) return showErr('Inserisci il cognome.');
  if(!d.eta || !d.altezza || !d.peso_attuale || !d.peso_obiettivo) {
    return showErr('Mancano alcuni dati biometrici. Torna indietro.');
  }
  // Mifflin-St Jeor: 'Altro' usa la branch female (più conservativa)
  const sexForTDEE = d.sesso === 'M' ? 'M' : 'F';
  const sexForDB   = d.sesso || 'M';
  const activity   = d.attivita || 'moderate';
  const r = calcTDEE(sexForTDEE, d.eta, d.altezza, d.peso_attuale, activity);

  const ctaBtn = document.getElementById('m1-final-cta');
  if(ctaBtn) { ctaBtn.disabled = true; ctaBtn.textContent = 'Salvataggio…'; }

  // note_salute: aggrega esperienza + limitazioni + altre intolleranze + altre limitazioni
  // (campi senza colonna dedicata su profiles; documentati nel report Fase C).
  const noteParts = [];
  if(d.esperienza)                        noteParts.push(`Esperienza: ${d.esperienza}`);
  if(d.limitazioni && d.limitazioni.length) noteParts.push(`Limitazioni: ${d.limitazioni.filter(x=>x!=='altro').join(', ')}`);
  if(d.altre_limitazioni && d.altre_limitazioni.trim()) noteParts.push(`Altre condizioni: ${d.altre_limitazioni.trim()}`);
  if(d.altre_intolleranze && d.altre_intolleranze.trim()) noteParts.push(`Altre intolleranze: ${d.altre_intolleranze.trim()}`);
  const noteSalute = noteParts.length ? noteParts.join(' · ') : null;

  // intolleranze: filtra "altro" (è solo trigger di textarea)
  const intolList = (d.intolleranze || []).filter(x => x !== 'altro');

  // obiettivi: CSV string (i reader esistenti lo splittano già — calcAdaptedTargets, applyProfile)
  const obiettivoCSV = (d.obiettivi && d.obiettivi.length) ? d.obiettivi.join(',') : null;

  // Blocco training onboarding (25 mag 2026) — regole:
  // - usa_training: default true se non scelto (col DB ha default true comunque)
  // - se usa_training=false → tutti i 4 campi training NULL (no rumore nel DB)
  // - se usa_training=true:
  //     · tipo_allenamento sempre salvato
  //     · attrezzatura salvata SOLO se tipo_allenamento='casa'
  //       (per palestra/aperto il coach interpreta dal tipo_allenamento)
  //     · giorni_allenamento + volume_sessione sempre salvati
  // NB: durata_sessione (minuti) è DISMESSA — colonna dormiente in DB, non più
  //     scritta. Sostituita da volume_sessione ('essenziale'|'completo').
  const usaTraining = (d.usa_training === false) ? false : true;
  const tipoAllen   = usaTraining ? (d.tipo_allenamento || null) : null;
  const attrezz     = (usaTraining && tipoAllen === 'casa' && (d.attrezzatura || []).length)
    ? d.attrezzatura.slice() : null;
  const giorni      = usaTraining ? (d.giorni_allenamento || null) : null;
  const volume      = usaTraining ? (d.volume_sessione    || 'completo') : null;

  const profileData = {
    id: ST.user.id,
    first_name: d.nome.trim(),
    last_name:  d.cognome.trim(),
    age:        d.eta,
    sex:        sexForDB,
    height_cm:  d.altezza,
    weight_kg:  d.peso_attuale,
    goal_weight_kg: d.peso_obiettivo,
    activity_level: activity,
    target_kcal:    r.target,
    target_protein: r.protein,
    target_carbs:   r.carbs,
    target_fat:     r.fat,
    obiettivo:    obiettivoCSV,
    dieta:        d.stile_alimentare || null,
    intolleranze: intolList.length ? intolList : null,
    note_salute:  noteSalute,
    // Blocco training (25 mag 2026)
    usa_training:        usaTraining,
    tipo_allenamento:    tipoAllen,
    attrezzatura:        attrezz,
    giorni_allenamento:  giorni,
    volume_sessione:     volume,
    updated_at:   new Date().toISOString(),
  };

  if (ST.user.id === 'test-user-001') {
    ST.profile = profileData;
    ST.TARGET = { kcal: r.target, protein: r.protein, carbs: r.carbs, fat: r.fat };
    applyProfile(ST.profile);
    showScreen('app');
    renderOggi();
    showPage('home');
    return;
  }

  const {error} = await supa.from('profiles').upsert(profileData);
  if(error) {
    showErr('Errore: ' + error.message);
    if(ctaBtn) { ctaBtn.disabled = false; ctaBtn.textContent = 'Inizia il check fisico →'; }
    return;
  }
  await saveWeightEntry(d.peso_attuale);

  // Fix B (24 mag 2026): guard-rail calorie minime. Mostra avviso modale
  // se target_kcal calcolato è sotto la soglia di sicurezza (per sesso).
  // Avviso informativo, NON blocca l'avanzamento (utente chiude e prosegue).
  checkLowKcalAndWarn(r.target, sexForDB);

  if (usaTraining === true) {
    try { await generateTrainingProgram({source:'onboarding'}); }
    catch(e) { console.warn('[train-gen] onboarding hook failed:', e); }
  }

  if(opts.skipM2) {
    // "Salta per ora" su Step 7: marca m2_skipped=true e vai all'app
    await m2Skip();
    return;
  }
  await loadAndStart_thenM2Entry();
}

// Carica dati come loadAndStart ma alla fine, invece di mostrare app,
// mostra intro M2 (entry point dopo M1)
async function loadAndStart_thenM2Entry() {
  // Riusa logica loadAndStart fino a profileIsComplete=true, poi divergiamo
  await loadCatalog();
  await loadSupps();
  await loadAllDays();
  await loadTodaySuppLog();
  await hydrateTrainingSetsFromCloud();
  await loadActiveScheda(); // Mossa 3: scheda DB con fallback TRAINING_SESSIONS
  const {data: profile} = await supa.from('profiles').select('*').eq('id', ST.user.id).single();
  if(profile) ST.profile = profile;
  if(ST.profile) applyProfile(ST.profile);
  saveCache();
  m2EntryIntro();
}
