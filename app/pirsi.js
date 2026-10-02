// ═══════════════════════════════════════
// app/pirsi.js — Pirsi, il coach (Fondamenta 035, tappa 8, 2 ottobre 2026)
// ═══════════════════════════════════════
// La porta verso il Worker (callAI) con gli errori AI, le GIF degli esercizi e il prompt del coach,
// il ritratto unico della persona, «Pirsi propone» (proposte del lunedì, proteine accettate, card in
// Home, Accetto e Non ora). Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO app/training.js e PRIMA del resto del proprio codice: qui al caricamento
// si dichiarano solo costanti scritte per esteso, niente che usi un nome scritto più avanti nella
// pagina (lo controlla tools/banco/prova_ordine_caricamento.js).

// ═══════════════════════════════════════════════════════════
// AI
// ═══════════════════════════════════════════════════════════
// Errore AI con il `kind` del Worker attaccato, cosi' ogni chiamante distingue i
// casi senza rileggere il body. I kind normalizzati dal Worker sono rate-limit,
// auth, model-unavailable, empty-response, generic, exception; 'network' lo
// aggiunge callAI ed e' l'UNICO caso in cui la connessione manca davvero.
// 'session' = il Worker non riconosce chi chiama (token assente o scaduto):
// 'auth' resta la chiave del servizio guasta, che per l'utente e' un'altra cosa.
function _aiError(kind, messaggio, causa) {
  const e = new Error(messaggio);
  e.aiKind = kind;
  if (causa) e.aiCause = causa;
  return e;
}

// Messaggio per l'utente, mappato sul kind. Tre situazioni e non sei: quello che
// cambia per chi legge e' se riprovare ha senso. Mai lo status HTTP, mai il testo
// di Groq — quelli vanno in console.
function aiErrMsg(kind) {
  if (kind === 'rate-limit') return 'Il servizio è momentaneamente sovraccarico, riprova tra un minuto.';
  if (kind === 'auth' || kind === 'model-unavailable') return 'C\'è un problema di configurazione del servizio: riprovare non serve.';
  if (kind === 'network') return 'Connessione assente, controlla la rete.';
  if (kind === 'session') return 'Sessione scaduta: esci, rientra e riprova.';
  return 'Riprova tra poco.';
}

// Stessa informazione per i cue tecnici del recupero, dove per decisione presa
// Pirsi non ha voce: frasi neutre, nessun soggetto che parla. Fonte unica —
// la usano sia ensureRestCue sia openExerciseAI, non si riscrive due volte.
function cueErrMsg(kind) {
  if (kind === 'rate-limit') return 'Cue non disponibile — servizio sovraccarico, riprova tra poco.';
  if (kind === 'auth' || kind === 'model-unavailable') return 'Cue non disponibile — servizio non configurato.';
  if (kind === 'network') return 'Cue non disponibile — connessione assente.';
  if (kind === 'session') return 'Cue non disponibile — sessione scaduta: esci e rientra.';
  return 'Cue non disponibile — riprova tra poco.';
}

async function callAI(prompt, maxTokens=400) {
  // Il Worker risponde solo a chi ha una sessione valida (Pirsi 010): il token di
  // accesso viaggia nell'intestazione, come per la lettura delle foto dei check.
  let token = null;
  try {
    const res = await supa.auth.getSession();
    token = res && res.data && res.data.session && res.data.session.access_token;
  } catch (_) {}
  if (!token) throw _aiError('session', 'Sessione assente');
  let r;
  try {
    r = await fetch(WORKER_URL, {method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:maxTokens})});
  } catch (e) {
    // fetch lancia solo se la richiesta non parte: qui la rete manca sul serio.
    throw _aiError('network', 'Rete non raggiungibile', e);
  }
  if (!r.ok) {
    // Il Worker manda {error:{source,kind,status,code,message}}. Se il body e'
    // illeggibile o non ha quella forma si ripiega su 'generic': gestire il
    // fallimento non puo' a sua volta fallire.
    let info = null;
    try { info = (await r.json()).error; } catch (_) {}
    console.warn('[ai] errore dal Worker —',
                 'kind:', (info && info.kind) || 'generic',
                 '· HTTP:', (info && info.status) || r.status,
                 '· code:', (info && info.code) || null,
                 '·', (info && info.message) || '');
    throw _aiError((info && info.kind) || 'generic', `Worker error: ${r.status}`);
  }
  const d = await r.json();
  return d.content?.[0]?.text || '';
}
// fetchExerciseMedia — query Worker per cache/lookup GIF esecuzione esercizio.
// Ritorna {status, cached_url?, is_surrogate?, surrogate_note?, ...} oppure
// {status:'error'} se network/HTTP fallisce. Mai throw — sempre fallback safe.
async function fetchExerciseMedia(exName, exCode) {
  try {
    const url = exCode
      ? `${WORKER_URL}/exercise-media?code=${encodeURIComponent(exCode)}`
      : `${WORKER_URL}/exercise-media?name=${encodeURIComponent(exName)}`;
    const r = await fetch(url);
    if (!r.ok) return { status: 'error' };
    return await r.json();
  } catch(e) {
    return { status: 'error', error: e.message };
  }
}
// buildCoachPrompt — prompt riusabile per cue AI Coach (modal scheda + modal recupero).
// Mantiene il prompt unificato: cosi il cue cached e' coerente fra i due modal.
function buildCoachPrompt(exName, sessionId, attrezzoSessione) {
  const sess = getTrainingSession(sessionId) || {};
  const sessionLabel = sess.label || sess.name || '';
  const sessionType = sess.type || '';
  // FIX 3 (26 mag sera): cue molto più conciso, formato bullet brevi per essere
  // leggibili a colpo d'occhio durante il recupero (era paragrafo lungo).
  return `Sei Pirsi, il coach di forza e ipertrofia. Parla sempre in prima persona: non nominarti in terza persona, non firmarti, non ripetere il tuo nome nel testo. Ignazio: 55 anni, ex nuotatore/pallanuotista. Lombari (iperlordosi) e ginocchia (valgismo) da proteggere. Allena con elastici a tubo.

${coachRitratto()}

Esercizio corrente: ${exName} (sessione ${sessionLabel}, ${sessionType}).
${attrezzoSessione ? `L'utente sta usando: ${attrezzoSessione}. Adatta i cue a questo attrezzo specifico (setup, presa, posizione, errori tipici di questo strumento).` : ''}
Rispondi con 2-3 punti BREVISSIMI (max 8 parole ciascuno), in formato elenco. Ogni punto su una riga separata, inizia con "• " (bullet + spazio). NIENTE paragrafi. NIENTE introduzioni. NIENTE ripetizione del nome esercizio.

Contenuto dei punti (scegli i 2-3 più rilevanti): cue tecnico avanzato, gestione fatica nelle ultime serie, variazione respiratoria, attenzione protezioni (lombari/ginocchia) se rilevante per questo movimento. Non ripetere info banali tipo setup o muscoli target.

Italiano. Esempio di formato corretto:
• Mento alla sbarra, non collo
• Scapole giù attivate
• Espira sulla salita`;
}

// Ritratto unico della persona (Pirsi 020): lo stesso blocco «CHI È» per ogni chiamata del coach.
// shared/ritratto.js: caricato dalla pagina prima di questo script (Fondamenta 035), non più copiato qui.
// Involucro: raccoglie da ST ciò che l'app ha già in memoria e lo passa al modulo.
// Sincrono e senza rete: una parte che non è ancora caricata semplicemente non compare.
// Mai throw — un ritratto che fallisce non deve far fallire il consiglio.
function coachRitratto(){
  try {
    const p = ST.profile || {};
    const cur = wpMonday();
    const quadri = ST.weeklyPicture || {};
    const usaTraining = !!p.train_start_date;
    let injury = null, softReturn = false;
    try { injury = getInjuryPeriod(); softReturn = !injury && !!getSoftReturn(); } catch(e){}
    let session = null, cycle = null;
    if(usaTraining){
      const hd = ST.trainHomeData;
      if(hd && !hd.notStarted && !injury){
        const sid = (hd.inProgress || hd.doneToday) ? hd.lastSession : hd.nextSession;
        if(/^rest/.test(sid || '')){
          session = { state: 'riposo' };
        } else if(sid){
          const sess = getTrainingSession(sid) || {};
          const label = [sess.name || sess.label, sess.type].filter(Boolean).join(', ');
          session = { state: hd.inProgress ? 'in_corso' : hd.doneToday ? 'fatta' : 'da_fare', label };
        }
      }
      if((ST.trainAllCompleted || []).length){
        const info = getCycleWeekInfo();
        if(info && info.weekNum) cycle = { weekNum: info.weekNum, isScarico: !!info.isScarico };
      }
    }
    return ZTRitratto.build({
      profile: p, target: ST.TARGET, today: todayKey(),
      current: quadri[cur] || null, previous: quadri[wpAddDays(cur, -7)] || null,
      session, cycle, injury, softReturn,
      proposals: ST.coachProposals || [],
    });
  } catch(e){
    console.warn('[ritratto]', (e && e.message) || e);
    return '';
  }
}
// Come sopra, ma prima prova a caricare i due quadri se mancano (sono in cache dopo
// la prima apertura della Home). Per i chiamanti che possono aspettare.
async function coachRitrattoPronto(){
  try {
    const cur = wpMonday();
    await Promise.all([loadWeeklyPicture(cur), loadWeeklyPicture(wpAddDays(cur, -7))]);
  } catch(e){}
  return coachRitratto();
}

// ═══════════════════════════════════════════════════════════
// PIRSI PROPONE — dati (Fase 3, 13 set 2026)
// ═══════════════════════════════════════════════════════════
// Le proposte le genera il cron del Worker il lunedì alle 6 (worker/src/coach-cron.js).
// Se all'apertura la settimana appena chiusa non ne ha (cron fallito, o app aperta
// prima), le genera l'app con le stesse regole (shared/coach_rules.js). Mai doppioni:
// UNIQUE (user_id, week_start, kind) e insert che ignora i duplicati.
// Pirsi propone, l'utente decide: qui si leggono e si scrivono solo proposte.
const COACH_SUPPORTED_DAYS = [4, 5];      // rotazioni che esistono davvero (CLAUDE.md → Split)
const COACH_HISTORY_WEEKS = 8;
let _cpTableOk = true;                    // false se coach_proposals non risponde: da lì niente card né generazione
let _cpEnsureStarted = false;
function _cpTableError(res, cosa){
  if(!res.error) return false;
  const code = res.error.code || '';
  if(code === 'PGRST205' || code === '42P01' || /coach_proposals/.test(res.error.message || '')) _cpTableOk = false;
  console.warn('[pirsi] ' + cosa + ':', res.error.message || res.error);
  return true;
}
// ST.coachProposals: righe delle ultime settimane (tutti gli stati), per la card e per le regole.
// ST.coachDeloads: date degli scarichi anticipati accettati, lette da getCycleWeekInfo.
async function loadCoachProposals(){
  if(!_wpUsable() || !_cpTableOk) return ST.coachProposals || [];
  const da = wpAddDays(wpMonday(), -7 * (COACH_HISTORY_WEEKS + 1));
  const [res, sc, pr] = await Promise.all([
    dbq('leggere le proposte di ' + COACH_NAME, supa.from('coach_proposals').select('*')
      .eq('user_id', ST.user.id).gte('week_start', da).order('week_start').order('created_at').range(0, 999), { silenzioso:true }),
    dbq('leggere gli scarichi accettati', supa.from('coach_proposals').select('applied_at')
      .eq('user_id', ST.user.id).eq('kind', 'deload').eq('status', 'accepted').order('applied_at').range(0, 999), { silenzioso:true }),
    dbq('leggere le proteine accettate', supa.from('coach_proposals').select('change, applied_at')
      .eq('user_id', ST.user.id).eq('kind', 'protein').eq('status', 'accepted').order('applied_at').range(0, 999), { silenzioso:true }),
  ]);
  if(_cpTableError(res, 'lettura proposte')) return ST.coachProposals || [];
  ST.coachProposals = res.data || [];
  if(!sc.error) ST.coachDeloads = (sc.data || []).filter(r => r.applied_at).map(r => dayKey(new Date(r.applied_at)));
  if(!pr.error){
    const ultima = (pr.data || []).filter(r => r.change && r.change.target_protein).pop();
    const prima = _coachProteinFloor();
    _cpSetProteinFloor(ultima ? Number(ultima.change.target_protein.to) : null);
    if(prima !== ST.coachProteinFloor && ST.profile) applyProfile(ST.profile);   // il minimo è cambiato: TARGET si riallinea
  }
  return ST.coachProposals;
}
async function ensureCoachProposals(){
  if(_cpEnsureStarted || !_wpUsable() || !_cpTableOk) return;
  _cpEnsureStarted = true;
  try {
    const ws = wpAddDays(wpMonday(), -7);                 // la settimana appena chiusa
    await loadCoachProposals();
    if(!_cpTableOk) return;
    // Le proposte in attesa delle settimane prima scadono (lo fa anche il cron)
    const vecchie = (ST.coachProposals || []).filter(p => p.status === 'pending' && p.week_start < ws);
    if(vecchie.length){
      const r = await dbq('segnare scadute le proposte vecchie', supa.from('coach_proposals').update({ status: 'expired' })
        .eq('user_id', ST.user.id).eq('status', 'pending').lt('week_start', ws), { silenzioso:true });
      if(!r.error) vecchie.forEach(p => { p.status = 'expired'; });
    }
    const first = _wpFirstWeek();
    if((first && ws < first) || (ST.coachProposals || []).some(p => p.week_start === ws)){ _wpRerenderIfOpen(); return; }
    const pic = await loadWeeklyPicture(ws, { silenzioso:true });
    if(!pic || (pic.meta.errors || []).length) return;   // un quadro letto a metà non genera proposte
    const hRes = await dbq('leggere lo storico per ' + COACH_NAME, supa.from('weekly_pictures').select('picture')
      .eq('user_id', ST.user.id).gte('week_start', wpAddDays(ws, -7 * COACH_HISTORY_WEEKS)).lt('week_start', ws).order('week_start').range(0, 999), { silenzioso:true });
    if(hRes.error) return;
    const storia = (hRes.data || []).map(r => r.picture);
    const proposte = ZTCoachRules.buildProposals(pic, storia, ST.profile || {}, { proposals: ST.coachProposals || [], supportedDays: COACH_SUPPORTED_DAYS });
    if(!proposte.length) return;
    const righe = proposte.map(p => ({ user_id: ST.user.id, week_start: ws, kind: p.kind, title: p.title, reason: p.reason, evidence: p.evidence, change: p.change, status: 'pending' }));
    const ins = await dbq('salvare le proposte di ' + COACH_NAME, supa.from('coach_proposals')
      .upsert(righe, { onConflict: 'user_id,week_start,kind', ignoreDuplicates: true }), { silenzioso:true });
    if(_cpTableError(ins, 'salvataggio proposte')) return;
    console.log('[pirsi] ' + righe.length + ' proposte generate dall\'app per la settimana ' + ws);
    await loadCoachProposals();
    _wpRerenderIfOpen();
  } catch(e){
    console.warn('[pirsi] generazione:', e);
  }
}

// ── Proteine accettate: un minimo che sopravvive ai ricalcoli ──
// ST.TARGET nasce dalle percentuali dell'obiettivo (calcAdaptedTargets): un target
// proteico accettato da Pirsi le sovrascriverebbe al primo applyProfile. Per questo
// vale come MINIMO: protein = max(percentuale, accettato), e i carboidrati cedono gli
// stessi grammi, così le kcal restano quelle. Si tiene anche in localStorage per il
// primo avvio offline, prima che coach_proposals risponda.
function _cpProteinKey(){ return 'zt_coach_protein_' + ((ST.user && ST.user.id) || 'local'); }
function _coachProteinFloor(){
  if(ST.coachProteinFloor !== undefined) return ST.coachProteinFloor;
  try { const v = Number(localStorage.getItem(_cpProteinKey())); return v > 0 ? v : null; } catch(e){ return null; }
}
function _coachApplyProteinFloor(t){
  const floor = _coachProteinFloor();
  if(!t || !floor || !(floor > (t.protein || 0))) return t;
  t.carbs = Math.max(0, (t.carbs || 0) - (floor - t.protein));
  t.protein = floor;
  return t;
}
function _cpSetProteinFloor(g){
  ST.coachProteinFloor = g || null;
  try { if(g) localStorage.setItem(_cpProteinKey(), String(g)); else localStorage.removeItem(_cpProteinKey()); } catch(e){}
}
// I quattro target come li scrive l'app: percentuali dell'obiettivo sulle kcal, poi il minimo di proteine.
function _cpTargetsFor(kcal, proteinFloor){
  const obj = (ST.profile && ST.profile.obiettivo ? String(ST.profile.obiettivo).split(',').filter(Boolean) : []);
  const t = calcAdaptedTargets(obj, kcal);
  const x = { kcal, protein: t.protein, carbs: t.carbs, fat: t.fat };
  const floor = proteinFloor != null ? proteinFloor : _coachProteinFloor();
  if(floor && floor > x.protein){ x.carbs = Math.max(0, x.carbs - (floor - x.protein)); x.protein = floor; }
  return { target_kcal: x.kcal, target_protein: x.protein, target_carbs: x.carbs, target_fat: x.fat };
}

const _CP_ORDINE = { weigh_in: 0, logging: 1, kcal: 10, protein: 11, keep: 12, training_volume: 20, deload: 21, check: 30, blood_test: 31 };
const _CP_AREA = {
  weigh_in: ['Peso', '#5E4A7A'], logging: ['Nutrizione', '#FAC775'], kcal: ['Nutrizione', '#FAC775'], protein: ['Nutrizione', '#FAC775'],
  keep: ['Settimana', 'var(--acc)'], training_volume: ['Allenamento', '#B5D4F4'], deload: ['Allenamento', '#B5D4F4'],
  check: ['Corpo', '#5E4A7A'], blood_test: ['Esami', '#AFA9EC'],
};
const _CP_STATO = { pending: ['In attesa', '#FFF3DC', '#854F0B'], accepted: ['Accettata', '#E6F4F2', '#235F56'], rejected: ['Non ora', '#F0EDE6', '#555047'], expired: ['Scaduta', '#F0EDE6', '#9A9388'] };
function _cpPending(){
  if(!_wpUsable() || !_cpTableOk) return [];
  return (ST.coachProposals || []).filter(p => p.status === 'pending')
    .sort((a, b) => (a.week_start < b.week_start ? 1 : a.week_start > b.week_start ? -1 : 0) || (_CP_ORDINE[a.kind] - _CP_ORDINE[b.kind]));
}
function _cpNumsHTML(p){
  const righe = (p.evidence && Array.isArray(p.evidence.numeri)) ? p.evidence.numeri : [];
  if(!righe.length) return '';
  return `<div class="cp-nums">${righe.map(r => `<div class="cp-num"><span>${esc(r.label)}</span><span>${esc(r.value)}</span></div>`).join('')}</div>`;
}
function _cpHomeCardHTML(){
  const lista = _cpPending();
  if(!lista.length) return '';
  const busy = ST.cpBusy || {};
  const ws = lista[0].week_start;
  const items = lista.map(p => {
    const [area, tinta] = _CP_AREA[p.kind] || ['Settimana', 'var(--acc)'];
    const off = busy[p.id] ? 'disabled' : '';
    return `<div class="cp-item" data-cp="${esc(p.id)}">
      <div class="cp-kind"><span class="wp-dot" style="background:${tinta};"></span>${area}</div>
      <div class="cp-title">${esc(p.title)}</div>
      <div class="cp-reason">${esc(p.reason)}</div>
      ${_cpNumsHTML(p)}
      <div class="cp-actions">
        <button class="cp-yes" ${off} onclick="acceptCoachProposal('${esc(p.id)}')">${busy[p.id] === 'yes' ? 'Un momento…' : 'Accetto'}</button>
        <button class="cp-no" ${off} onclick="rejectCoachProposal('${esc(p.id)}')">Non ora</button>
      </div>
    </div>`;
  }).join('');
  return `
    <div class="cp-card">
      <div class="cp-head"><div class="cp-title-main">${COACH_NAME} propone</div><div class="cp-week">${_wpRange(ws)}</div></div>
      ${items}
      <div class="cp-note">${COACH_NAME} propone, decidi tu. Per la salute conta il parere del tuo medico.</div>
    </div>`;
}
// Vista completa del quadro: cosa ha proposto Pirsi per la settimana guardata
function _cpHistoryHTML(ws){
  const lista = (ST.coachProposals || []).filter(p => p.week_start === ws)
    .sort((a, b) => _CP_ORDINE[a.kind] - _CP_ORDINE[b.kind]);
  if(!lista.length) return '';
  return `<section class="wp-sec">
    <div class="wp-sec-head"><span class="wp-dot" style="background:var(--acc);"></span><span class="wp-sec-title">Cosa ha proposto ${COACH_NAME}</span></div>
    <ul class="cp-hist">${lista.map(p => {
      const [lbl, bg, fg] = _CP_STATO[p.status] || _CP_STATO.pending;
      return `<li><div class="cp-hist-top"><span class="cp-hist-title">${esc(p.title)}</span>${_wpPill(lbl, bg, fg)}</div><div class="cp-reason">${esc(p.reason)}</div></li>`;
    }).join('')}</ul>
  </section>`;
}
function _cpRerender(){ if(ST.page === 'home') renderHome(); }
function _cpSetBusy(id, v){ ST.cpBusy = ST.cpBusy || {}; if(v) ST.cpBusy[id] = v; else delete ST.cpBusy[id]; _cpRerender(); }
async function _cpMark(p, status, applied){
  const now = new Date().toISOString();
  const patch = { status, decided_at: now };
  if(applied) patch.applied_at = now;
  const res = await dbq(status === 'accepted' ? 'accettare la proposta' : 'rimandare la proposta',
    supa.from('coach_proposals').update(patch).eq('id', p.id).eq('user_id', ST.user.id));
  if(res.error) return false;
  Object.assign(p, patch);
  return true;
}
// Scrive i campi del profilo; se poi la proposta non si segna, li rimette com'erano.
async function _cpUpdateProfile(updates){
  const prima = {};
  Object.keys(updates).forEach(k => { prima[k] = ST.profile ? ST.profile[k] : null; });
  const res = await dbq('aggiornare i target', supa.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', ST.user.id));
  if(res.error) return null;
  return prima;
}
async function _cpRollbackProfile(prima){
  const res = await dbq('rimettere i target di prima', supa.from('profiles').update(prima).eq('id', ST.user.id), { silenzioso:true });
  if(res.error) console.error('[pirsi] rollback profilo fallito:', res.error);
}
function _cpApplyLocal(updates){
  if(!ST.profile) return;
  Object.assign(ST.profile, updates);
  applyProfile(ST.profile);
  try { saveCache(); } catch(e){}
}
async function acceptCoachProposal(id){
  const p = (ST.coachProposals || []).find(x => x.id === id);
  if(!p || p.status !== 'pending' || (ST.cpBusy && ST.cpBusy[id])) return;
  _cpSetBusy(id, 'yes');
  let vai = null;                          // dove portare l'utente dopo, a card già aggiornata
  try {
    const ch = p.change || {};
    if(p.kind === 'kcal' && ch.target_kcal){
      const updates = _cpTargetsFor(Number(ch.target_kcal.to));
      const prima = await _cpUpdateProfile(updates);
      if(!prima) return;
      if(!(await _cpMark(p, 'accepted', true))){ await _cpRollbackProfile(prima); return; }
      _cpApplyLocal(updates);
      showToast(`Da domani il piano usa ${fmtNum(updates.target_kcal)} kcal`, '✅', 4500);
    } else if(p.kind === 'protein' && ch.target_protein){
      const g = Number(ch.target_protein.to);
      const updates = _cpTargetsFor(Number((ST.profile && ST.profile.target_kcal) || (ST.TARGET && ST.TARGET.kcal)), g);
      const prima = await _cpUpdateProfile(updates);
      if(!prima) return;
      if(!(await _cpMark(p, 'accepted', true))){ await _cpRollbackProfile(prima); return; }
      _cpSetProteinFloor(g);
      _cpApplyLocal(updates);
      showToast(`Proteine a ${fmtNum(updates.target_protein)} g: da domani il piano le usa`, '✅', 4500);
    } else if(p.kind === 'training_volume' && ch.giorni_allenamento){
      const to = Number(ch.giorni_allenamento.to);
      if(COACH_SUPPORTED_DAYS.includes(to)){
        const prima = await _cpUpdateProfile({ giorni_allenamento: to });
        if(!prima) return;
        if(!(await _cpMark(p, 'accepted', true))){ await _cpRollbackProfile(prima); return; }
        _cpApplyLocal({ giorni_allenamento: to });
        showToast(`${to} allenamenti a settimana da ora`, '✅', 4500);
      } else {
        // La rotazione a quei giorni non esiste (cantiere 20): si segna la scelta, profilo e scheda restano.
        if(!(await _cpMark(p, 'accepted', false))) return;
        showToast(`Segnato: fanne ${to} a settimana. La scheda a ${to} giorni non c'è ancora, tieni la tua`, '✅', 5500);
      }
    } else if(p.kind === 'deload'){
      if(!(await _cpMark(p, 'accepted', true))) return;
      ST.coachDeloads = [...(ST.coachDeloads || []), todayKey()];
      showToast('Scarico da oggi: stessi esercizi e serie, carichi più leggeri', '✅', 4500);
    } else {
      if(!(await _cpMark(p, 'accepted', false))) return;
      if(p.kind === 'weigh_in') vai = () => openWeighInSheet();
      else if(p.kind === 'logging') vai = () => showPage('oggi');
      else if(p.kind === 'check' || p.kind === 'blood_test') vai = () => { ST.bodyTab = 'check'; showPage('body'); };
      else showToast('Bene, questa settimana non cambio nulla', '✅', 4000);
    }
  } catch(e){
    console.error('[pirsi] accettazione:', e);
    showToast('Non sono riuscito a salvare la scelta: riprova', '⚠️', 5500);
  } finally {
    _cpSetBusy(id, null);
  }
  if(vai) vai();
}
async function rejectCoachProposal(id){
  const p = (ST.coachProposals || []).find(x => x.id === id);
  if(!p || p.status !== 'pending' || (ST.cpBusy && ST.cpBusy[id])) return;
  _cpSetBusy(id, 'no');
  try {
    if(await _cpMark(p, 'rejected', false)) showToast('Va bene, per ora lascio tutto com\'è', '✅', 4000);
  } finally {
    _cpSetBusy(id, null);
  }
}
