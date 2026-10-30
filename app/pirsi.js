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
  if (kind === 'timeout') return 'Ci ho messo troppo: riprova.';
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
  if (kind === 'timeout') return 'Cue non disponibile — ci ho messo troppo, riprova.';
  return 'Cue non disponibile — riprova tra poco.';
}

// Tempo massimo alle risposte di testo (Pirsi 090, 13 ottobre 2026): prima il pulsante girava
// all'infinito se il servizio restava appeso (la lettura foto il suo tempo ce l'aveva già).
// 'lungo' per i 14 pasti (budget ≥ 2000 token), 'breve' per tutto il resto. Scaduto il tempo
// l'errore è 'timeout': «Ci ho messo troppo: riprova». Un oggetto e non due costanti, così
// il banco lo accorcia senza riscrivere la funzione.
const AI_TEMPO_MAX_MS = { breve: 40000, lungo: 90000 };
async function callAI(prompt, maxTokens=400) {
  // Il Worker risponde solo a chi ha una sessione valida (Pirsi 010): il token di
  // accesso viaggia nell'intestazione, come per la lettura delle foto dei check.
  let token = null;
  try {
    const res = await supa.auth.getSession();
    token = res && res.data && res.data.session && res.data.session.access_token;
  } catch (_) {}
  if (!token) throw _aiError('session', 'Sessione assente');
  const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
  const tempo = maxTokens >= 2000 ? AI_TEMPO_MAX_MS.lungo : AI_TEMPO_MAX_MS.breve;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), tempo) : null;
  let r;
  try {
    r = await fetch(WORKER_URL, {method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:maxTokens}), signal: ctrl ? ctrl.signal : undefined});
  } catch (e) {
    if (timer) clearTimeout(timer);
    if (ctrl && ctrl.signal.aborted) throw _aiError('timeout', 'Il coach non ha risposto in tempo', e);
    // fetch lancia solo se la richiesta non parte: qui la rete manca sul serio.
    throw _aiError('network', 'Rete non raggiungibile', e);
  }
  if (timer) clearTimeout(timer);
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
// ── I cue tecnici: puliti, tenuti se buoni, mai tenuti se sbagliati (Pirsi 090, 13 ottobre 2026) ──
// Prima: il messaggio d'errore finiva in ST.aiCue al posto del cue e non si riprovava più fino al
// ricaricamento; i cue buoni vivevano solo in memoria e ogni seduta li rigenerava; il testo del
// modello entrava nella pagina senza pulizia. Ora: cuePer(...) è l'unica porta (recupero e foglio
// dell'esercizio): esc() prima di tutto, poi solo grassetto e a capo; il cue buono si salva sul
// telefono per CUE_GIORNI (zt_cue_<utente>); l'errore sta in ST.aiCueErrori e si riprova alla
// prossima richiesta, non prima di CUE_RIPROVA_MS.
const CUE_GIORNI = 30;
const CUE_RIPROVA_MS = 15000;
const CUE_MAX_SALVATI = 200;
function cuePulito(text) {
  return esc(String(text || '').trim().replace(/^["'`]|["'`]$/g, ''))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
function _cueChiave() { return 'zt_cue_' + ((ST.user && ST.user.id) || 'anon'); }
function _cueLeggiTutti() { try { return JSON.parse(localStorage.getItem(_cueChiave()) || '{}') || {}; } catch (e) { return {}; } }
function cueSalvato(key) {
  const v = _cueLeggiTutti()[key];
  return (v && v.t && (Date.now() - (v.at || 0)) < CUE_GIORNI * 86400000) ? v.t : null;
}
function cueSalva(key, html) {
  try {
    const m = _cueLeggiTutti();
    m[key] = { t: html, at: Date.now() };
    const chiavi = Object.keys(m).sort((a, b) => (m[a].at || 0) - (m[b].at || 0));
    while (chiavi.length > CUE_MAX_SALVATI) delete m[chiavi.shift()];
    localStorage.setItem(_cueChiave(), JSON.stringify(m));
  } catch (e) {}
}
// → { html, errore:null } oppure { html:null, errore:'messaggio' }. Mai throw. Una chiamata alla volta per chiave.
async function cuePer(exName, sessionId, eq) {
  const key = `${sessionId}_${exName}`;
  if (ST.aiCue[key]) return { html: ST.aiCue[key], errore: null };
  const salvato = cueSalvato(key);
  if (salvato) { ST.aiCue[key] = salvato; return { html: salvato, errore: null }; }
  ST.aiCueErrori = ST.aiCueErrori || {};
  ST.aiCueInCorso = ST.aiCueInCorso || {};
  const ultimo = ST.aiCueErrori[key];
  if (ultimo && Date.now() - ultimo.at < CUE_RIPROVA_MS) return { html: null, errore: ultimo.msg };
  if (ST.aiCueInCorso[key]) return ST.aiCueInCorso[key];
  const p = (async () => {
    try {
      const html = cuePulito(await callAI(buildCoachPrompt(exName, sessionId, eq || ''), 200));
      if (!html) throw _aiError('empty-response', 'Cue vuoto');
      ST.aiCue[key] = html;
      cueSalva(key, html);
      delete ST.aiCueErrori[key];
      return { html, errore: null };
    } catch (e) {
      const msg = cueErrMsg(e && e.aiKind);
      ST.aiCueErrori[key] = { at: Date.now(), msg, kind: (e && e.aiKind) || 'generic' };
      return { html: null, errore: msg };
    } finally {
      delete ST.aiCueInCorso[key];
    }
  })();
  ST.aiCueInCorso[key] = p;
  return p;
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
  // Identità in un posto solo (Pirsi 040): età, note di salute, luogo e attrezzi stanno nel ritratto, non qui.
  return `${ZTCoachRules.voce({ registro:false })}

${coachRitratto()}

Esercizio corrente: ${exName} (sessione ${sessionLabel}, ${sessionType}).
${attrezzoSessione ? `L'utente sta usando: ${attrezzoSessione}. Adatta i cue a questo attrezzo specifico (setup, presa, posizione, errori tipici di questo strumento).` : ''}
Rispondi con 2-3 punti BREVISSIMI (max 8 parole ciascuno), in formato elenco. Ogni punto su una riga separata, inizia con "• " (bullet + spazio). NIENTE paragrafi. NIENTE introduzioni. NIENTE ripetizione del nome esercizio.

Contenuto dei punti (scegli i 2-3 più rilevanti): cue tecnico avanzato, gestione fatica nelle ultime serie, variazione respiratoria, attenzione alle protezioni indicate nelle note di salute, se rilevanti per questo movimento. Non ripetere info banali tipo setup o muscoli target.

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
let _cpLettura = null;                    // la lettura delle proposte di questa apertura: chi la chiede dopo riusa la stessa
function _cpTableError(res, cosa){
  if(!res.error) return false;
  const code = res.error.code || '';
  if(code === 'PGRST205' || code === '42P01' || /coach_proposals/.test(res.error.message || '')) _cpTableOk = false;
  console.warn('[pirsi] ' + cosa + ':', res.error.message || res.error);
  return true;
}
// ST.coachProposals: righe delle ultime settimane (tutti gli stati), per la card e per le regole.
// ST.coachDeloads: date degli scarichi anticipati accettati, lette da getCycleWeekInfo.
// Si legge una volta per apertura (Fondamenta 100, tappa 1): all'apertura della Home la chiedono
// sia loadTrainingAllCompleted sia ensureCoachProposals, e sono tre richieste a lettura. Chi arriva
// dopo riusa la lettura già fatta, finita o ancora in corso. {force:true} rilegge davvero (dopo aver
// salvato proposte nuove). Una lettura fallita non si tiene: la richiesta successiva riprova.
function loadCoachProposals(opts){
  if(!_wpUsable() || !_cpTableOk) return Promise.resolve(ST.coachProposals || []);
  if(!_cpLettura || (opts && opts.force)){
    _cpLettura = _cpLeggi().then(ok => { if(!ok) _cpLettura = null; return ST.coachProposals || []; }, e => { _cpLettura = null; throw e; });
  }
  return _cpLettura;
}
async function _cpLeggi(){
  const da = wpAddDays(wpMonday(), -7 * (COACH_HISTORY_WEEKS + 1));
  const [res, sc, pr] = await Promise.all([
    dbq('leggere le proposte di ' + COACH_NAME, supa.from('coach_proposals').select('*')
      .eq('user_id', ST.user.id).gte('week_start', da).order('week_start').order('created_at').range(0, 999), { silenzioso:true }),
    dbq('leggere gli scarichi accettati', supa.from('coach_proposals').select('applied_at')
      .eq('user_id', ST.user.id).eq('kind', 'deload').eq('status', 'accepted').order('applied_at').range(0, 999), { silenzioso:true }),
    dbq('leggere le proteine accettate', supa.from('coach_proposals').select('change, applied_at')
      .eq('user_id', ST.user.id).eq('kind', 'protein').eq('status', 'accepted').order('applied_at').range(0, 999), { silenzioso:true }),
  ]);
  if(_cpTableError(res, 'lettura proposte')) return false;
  ST.coachProposals = res.data || [];
  if(!sc.error) ST.coachDeloads = (sc.data || []).filter(r => r.applied_at).map(r => dayKey(new Date(r.applied_at)));
  if(!pr.error){
    const ultima = (pr.data || []).filter(r => r.change && r.change.target_protein).pop();
    const prima = _coachProteinFloor();
    _cpSetProteinFloor(ultima ? Number(ultima.change.target_protein.to) : null);
    if(prima !== ST.coachProteinFloor && ST.profile) applyProfile(ST.profile);   // il minimo è cambiato: TARGET si riallinea
  }
  return true;
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
    await loadCoachProposals({ force:true });   // le righe appena salvate
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

const _CP_ORDINE = { weigh_in: 0, logging: 1, kcal: 10, protein: 11, keep: 12, eat_first: 19, training_volume: 20, deload: 21, check: 30, blood_test: 31 };
const _CP_AREA = {
  weigh_in: ['Peso', '#5E4A7A'], logging: ['Nutrizione', '#FAC775'], kcal: ['Nutrizione', '#FAC775'], protein: ['Nutrizione', '#FAC775'],
  keep: ['Settimana', 'var(--acc)'], eat_first: ['Allenamento', '#B5D4F4'], training_volume: ['Allenamento', '#B5D4F4'], deload: ['Allenamento', '#B5D4F4'],
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
// Giro 2 (30 ottobre 2026, veste accesa): ogni proposta è una riga (puntino della zona e titolo), una sola aperta alla volta
// con motivo, numeri, «Perché?», Accetto e Non ora. Si apre la prima; un tocco su un'altra la apre e chiude quella di prima,
// un tocco sulla riga aperta la chiude. ST.cpAperta: l'id aperto, '' = tutte chiuse, undefined = la prima.
function cpApri(id){
  ST.cpAperta = (ST.cpAperta === id) ? '' : id;
  if(typeof renderHome === 'function') renderHome();
}
function _cpApertaId(lista){
  if(ST.cpAperta === '') return null;
  if(lista.some(p => p.id === ST.cpAperta)) return ST.cpAperta;
  return lista[0] ? lista[0].id : null;
}
function _cpHomeCardHTML(){
  const lista = _cpPending();
  if(!lista.length) return '';
  const busy = ST.cpBusy || {};
  const ws = lista[0].week_start;
  if(document.documentElement.classList.contains('v5')){
    const apertaId = _cpApertaId(lista);
    const items = lista.map(p => {
      const [area, tinta] = _CP_AREA[p.kind] || ['Settimana', 'var(--acc)'];
      const off = busy[p.id] ? 'disabled' : '';
      const aperta = p.id === apertaId;
      return `<div class="cp-item${aperta ? ' cp5-aperta' : ''}" data-cp="${esc(p.id)}">
      <button class="cp5-riga" aria-expanded="${aperta ? 'true' : 'false'}" onclick="cpApri('${esc(p.id)}')">
        <span class="wp-dot" style="background:${tinta};" aria-hidden="true"></span>
        <span class="cp-title">${esc(p.title)}<span class="cp5-area">${area}</span></span>
        <span class="cp5-chev" aria-hidden="true">${aperta ? '⌃' : '⌄'}</span>
      </button>
      ${aperta ? `<div class="cp5-corpo">
        <div class="cp-reason">${esc(p.reason)}</div>
        ${_cpNumsHTML(p)}
        ${_cpPercheHTML(p)}
        <div class="cp-actions">
          <button class="cp-yes" ${off} onclick="acceptCoachProposal('${esc(p.id)}')">${busy[p.id] === 'yes' ? 'Un momento…' : 'Accetto'}</button>
          <button class="cp-no" ${off} onclick="rejectCoachProposal('${esc(p.id)}')">Non ora</button>
        </div>
      </div>` : ''}
    </div>`;
    }).join('');
    return `
    <div class="cp-card cp5">
      <div class="cp-head"><div class="cp-title-main">${COACH_NAME} propone · ${lista.length}</div><div class="cp-week">${_wpRange(ws)}</div></div>
      ${items}
      <div class="cp-note">${COACH_NAME} propone, decidi tu. Per la salute conta il parere del tuo medico.</div>
    </div>`;
  }
  const items = lista.map(p => {
    const [area, tinta] = _CP_AREA[p.kind] || ['Settimana', 'var(--acc)'];
    const off = busy[p.id] ? 'disabled' : '';
    return `<div class="cp-item" data-cp="${esc(p.id)}">
      <div class="cp-kind"><span class="wp-dot" style="background:${tinta};"></span>${area}</div>
      <div class="cp-title">${esc(p.title)}</div>
      <div class="cp-reason">${esc(p.reason)}</div>
      ${_cpNumsHTML(p)}
      ${_cpPercheHTML(p)}
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
// ── «Perché?» su ogni proposta (Pirsi 120, 14 ottobre 2026) ──
// Il coach spiega la proposta con i soli numeri già salvati con lei (evidence.numeri e change): racconta,
// non decide. Parte da un tocco, una chiamata per proposta; la spiegazione resta sul telefono
// (zt_perche_<utente>) così riaprire la Home non la richiede di nuovo. Nessun nome della persona.
const PERCHE_MAX = 60;
function _percheChiave(){ return 'zt_perche_' + (ST.user && ST.user.id || ''); }
function _percheSalvati(){ try { return JSON.parse(localStorage.getItem(_percheChiave()) || '{}') || {}; } catch(e){ return {}; } }
function _percheSalva(id, testo){
  const m = _percheSalvati();
  m[id] = { t: testo, at: Date.now() };
  const chiavi = Object.keys(m).sort((a, b) => m[a].at - m[b].at);
  while(chiavi.length > PERCHE_MAX) delete m[chiavi.shift()];
  try { localStorage.setItem(_percheChiave(), JSON.stringify(m)); } catch(e) {}
}
function _percheDi(id){ const s = (ST.cpPerche || {})[id]; if(s) return s; const m = _percheSalvati()[id]; return m ? m.t : null; }
// Il testo al coach: la proposta com'è, i numeri com'erano, cosa cambia con «Accetto». Niente altro.
function _perchePrompt(p){
  const righe = (p.evidence && Array.isArray(p.evidence.numeri)) ? p.evidence.numeri : [];
  const ch = p.change || {};
  const cambi = Object.keys(ch).map(k => {
    const c = ch[k] || {};
    const nome = k === 'target_kcal' ? 'calorie al giorno' : k === 'target_protein' ? 'proteine al giorno (g)' : k === 'giorni_allenamento' ? 'allenamenti a settimana' : k === 'cycle_week' ? 'settimana del ciclo' : k;
    return `${nome}: da ${c.from != null ? c.from : '—'} a ${c.to != null ? c.to : '—'}`;
  });
  return `${ZTCoachRules.voce()}

La persona ha toccato «Perché?» sotto una tua proposta del lunedì. Spiegale in 3 o 4 frasi su cosa si basa e cosa succede se accetta.
Usa SOLO i numeri qui sotto: non inventarne altri, non aggiungere consigli, non cambiare la proposta. Se un numero manca, non lo nominare.

PROPOSTA: ${p.title}
MOTIVO GIÀ DETTO: ${p.reason}
NUMERI:
${righe.length ? righe.map(r => `- ${r.label}: ${r.value}`).join('\n') : '- (nessun numero salvato)'}
SE ACCETTA: ${cambi.length ? cambi.join('; ') : 'non cambia nessun numero'}

Rispondi solo con la spiegazione, senza titoli e senza elenchi.`;
}
function _cpPercheHTML(p){
  const busy = (ST.cpPercheBusy || {})[p.id];
  const testo = _percheDi(p.id);
  const aperto = (ST.cpPercheAperto || {})[p.id];
  if(testo && aperto) return `<div class="cp-why-text">${esc(testo)}</div>`;
  return `<button class="cp-why" ${busy ? 'disabled' : ''} onclick="spiegaProposta('${esc(p.id)}')">${busy ? 'Ci penso…' : 'Perché?'}</button>`;
}
async function spiegaProposta(id){
  const p = (ST.coachProposals || []).find(x => x.id === id);
  if(!p) return;
  ST.cpPercheAperto = ST.cpPercheAperto || {};
  if(_percheDi(id)){ ST.cpPercheAperto[id] = true; _cpRerender(); return; }
  if((ST.cpPercheBusy || {})[id]) return;
  ST.cpPercheBusy = ST.cpPercheBusy || {}; ST.cpPercheBusy[id] = true; _cpRerender();
  try {
    const testo = String(await callAI(_perchePrompt(p), 300) || '').trim();
    if(!testo) throw _aiError('empty', 'Risposta vuota');
    ST.cpPerche = ST.cpPerche || {}; ST.cpPerche[id] = testo;
    _percheSalva(id, testo);
    ST.cpPercheAperto[id] = true;
  } catch(e){
    console.warn('[pirsi] perché:', e && e.aiKind, e && e.message);
    showToast('Non riesco a spiegartelo ora. ' + aiErrMsg(e && e.aiKind), '⚠️', 5500);
  } finally {
    delete ST.cpPercheBusy[id];
    _cpRerender();
  }
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
      vai = () => pirsiPastiConNumeriNuovi(updates, `Da domani il piano usa ${fmtNum(updates.target_kcal)} kcal`);
    } else if(p.kind === 'protein' && ch.target_protein){
      const g = Number(ch.target_protein.to);
      const updates = _cpTargetsFor(Number((ST.profile && ST.profile.target_kcal) || (ST.TARGET && ST.TARGET.kcal)), g);
      const prima = await _cpUpdateProfile(updates);
      if(!prima) return;
      if(!(await _cpMark(p, 'accepted', true))){ await _cpRollbackProfile(prima); return; }
      _cpSetProteinFloor(g);
      _cpApplyLocal(updates);
      vai = () => pirsiPastiConNumeriNuovi(updates, `Proteine a ${fmtNum(updates.target_protein)} g: da domani il piano le usa`);
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
      else if(p.kind === 'logging' || p.kind === 'eat_first') vai = () => showPage('oggi');
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
// ── «Accetto» sulle calorie non ritocca i pasti già pianificati (Pirsi 060, 13 ottobre 2026) ──
// La proposta arriva il lunedì alle 6; il piano della settimana è nato la domenica coi numeri vecchi.
// Prima l'avviso diceva «Da domani il piano usa X kcal» e aggiornava profilo e target del giorno,
// non i 14 pasti già scritti. Ora: se un piano da oggi in poi esiste, si chiede «Rifaccio pranzi
// e cene coi numeri nuovi?»; con il sì i pasti si rifanno (i vecchi tornano se il coach non
// risponde), e la riga del piano prende i target nuovi e un annuncio che dice il cambio. Senza
// piano, o con «Lascia così», l'avviso dice il vero. Scelta B della nota Pirsi 060.
function _ppTargets(updates){
  return { kcal: Number(updates.target_kcal), protein: Number(updates.target_protein), carbs: Number(updates.target_carbs), fat: Number(updates.target_fat) };
}
// I piani che i numeri nuovi riguardano: questa settimana e, se c'è già, la prossima.
async function _ppPianiDaRifare(){
  if(!ST.user || !ST.user.id) return [];
  const da = wpMonday();
  const r = await dbq('leggere i piani da rifare', supa.from('weekly_plans')
    .select('id, week_start, status, target_kcal, target_protein, target_carbs, target_fat')
    .eq('user_id', ST.user.id).order('week_start', { ascending:false }).limit(4), { silenzioso:true });
  if(!r || r.error || !Array.isArray(r.data)) return [];
  return r.data.filter(p => p.week_start >= da && p.status !== 'archived').sort((a, b) => a.week_start < b.week_start ? -1 : 1);
}
// Rifà pranzi e cene di un piano coi target nuovi. true se è andata; i pasti di prima tornano se no.
async function _ppRifaiPiano(piano, t){
  const vecchi = await dbq('leggere i pasti del piano', supa.from('weekly_plan_meals').select('*').eq('plan_id', piano.id), { silenzioso:true });
  if(!vecchi || vecchi.error) return false;
  const righeVecchie = Array.isArray(vecchi.data) ? vecchi.data : [];
  if(righeVecchie.length){
    const del = await dbq('togliere i pasti di prima', supa.from('weekly_plan_meals').delete().eq('plan_id', piano.id).eq('user_id', ST.user.id), { silenzioso:true });
    if(!del || del.error) return false;
  }
  const esito = await _pianoV4GenerateAndInsertMeals(piano.id, ST.profile, t, {});
  if(!esito || !esito.ok){
    // i pasti di prima tornano com'erano (stessi id: una doppia scrittura risponde 23505 e conta come fatta)
    if(righeVecchie.length) await dbq('rimettere i pasti di prima', supa.from('weekly_plan_meals').insert(righeVecchie), { silenzioso:true });
    return false;
  }
  let annuncio = null;
  // il «prima» dell'annuncio sono i numeri vecchi di questo stesso piano
  const prima = { kcal: piano.target_kcal, protein: piano.target_protein, carbs: piano.target_carbs, fat: piano.target_fat };
  try { annuncio = await _pianoV4GenerateReasoning(t, await _pianoV4ContestoAnnuncio(piano.week_start, t, prima)); } catch(e){}
  const up = { target_kcal: t.kcal, target_protein: t.protein, target_carbs: t.carbs, target_fat: t.fat };
  if(annuncio) up.ai_reasoning = annuncio;
  await dbq('aggiornare i numeri del piano', supa.from('weekly_plans').update(up).eq('id', piano.id).eq('user_id', ST.user.id), { silenzioso:true });
  if(ST.pianoV4RealPlanCache) delete ST.pianoV4RealPlanCache[piano.week_start];
  if(ST.pianoV4WelcomeOverlay && ST.pianoV4WelcomeOverlay.draft && ST.pianoV4WelcomeOverlay.draft.id === piano.id) closePianoV4WelcomeOverlay();
  return true;
}
async function pirsiPastiConNumeriNuovi(updates, fraseSenzaPiano){
  const t = _ppTargets(updates);
  let piani = [];
  try { piani = await _ppPianiDaRifare(); } catch(e){ piani = []; }
  if(!piani.length){ showToast(fraseSenzaPiano, '✅', 4500); return; }
  const ok = await chiediConferma('Il piano di questa settimana è nato coi numeri di prima. Rifaccio pranzi e cene con quelli nuovi?',
    { titolo:'Pasti già pianificati', ok:'Rifai i pasti', annulla:'Lascia così' });
  if(!ok){ showToast(`Numeri nuovi salvati. I pasti già pianificati restano com'erano`, '✅', 5000); return; }
  showToast('Sto rifacendo pranzi e cene…', '⏳', 4000);
  let fatti = 0;
  for(const piano of piani){
    try { if(await _ppRifaiPiano(piano, t)) fatti++; } catch(e){ console.warn('[pirsi] rifare i pasti:', e); }
  }
  if(fatti) showToast(`Pranzi e cene rifatti con ${fmtNum(t.kcal)} kcal e ${fmtNum(t.protein)} g di proteine`, '✅', 5500);
  else showToast('Non sono riuscito a rifare i pasti: quelli di prima restano. Riprova dal Piano con «Rigenera»', '⚠️', 6000);
  if(ST.page === 'piano'){ try { await _pianoV4LoadRealPlanForWeek(wpMonday()); renderPianoV4(); } catch(e){} }
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

// ═══════════════════════════════════════════════════════════
// La variante più facile (Training 330, 11 ottobre 2026)
// ═══════════════════════════════════════════════════════════
// La progressione (computeNextSetSuggestion) dice «variante più facile» quando a corpo
// libero le ripetizioni restano sotto il range. Da sola la frase non basta: qui il coach
// dice QUALE esercizio (nome e codice, apribile con la GIF) e in due righe come si fa.
// La scelta è la regola pura ZTCoachRules.varianteFacile sulle righe del catalogo; qui si
// leggono le righe (poche: l'esercizio, le sue alternative scritte, lo stesso schema di
// movimento), si tiene il risultato per la seduta e si disegna. Senza rete non si legge:
// resta la frase di prima, e si riprova quando la rete torna.
// Training 430 (20 ottobre 2026): lo stesso per «variante più difficile» (verso 'difficile', regola
// ZTCoachRules.varianteDifficile). Le due ricerche hanno chiavi diverse; la più facile tiene quella di prima.
const VF_FRASE = 'variante più facile';
const VD_FRASE = 'variante più difficile';
const VF_COLONNE = 'codice, nome, pattern, gruppo_target, livello, attrezzo, surrogato_attrezzo, luogo, alternativa, setup, esecuzione';

function _vfKey(exName, sessionId, verso){ return `${sessionId}_${exName}${verso === 'difficile' ? '_su' : ''}`; }
function _vfStato(){ ST.variantiFacili = ST.variantiFacili || {}; return ST.variantiFacili; }

// Trova (o avvia la ricerca di) la variante per l'esercizio della seduta. Non lancia mai.
// verso: 'facile' (di norma) o 'difficile'.
// → { stato: 'in-corso' | 'pronta' | 'nessuna' | 'senza-rete' | 'errore', variante? }
function varianteFacilePer(exName, sessionId, verso){
  const key = _vfKey(exName, sessionId, verso);
  const st = _vfStato();
  // 'errore' è definitivo per la seduta (non si martella il catalogo a ogni disegno); 'senza-rete' si riprova.
  if(st[key] && st[key].stato !== 'senza-rete') return st[key];
  if(typeof senzaRete === 'function' && senzaRete()){ st[key] = { stato: 'senza-rete' }; return st[key]; }
  st[key] = { stato: 'in-corso' };
  _vfCerca(exName, sessionId, key, verso).catch(e => {
    console.warn('[variante facile]', (e && e.message) || e);
    _vfFine(key, { stato: 'errore' });
  });
  return st[key];
}
// Chiude la ricerca e ridisegna la seduta, così la card e il recupero mostrano l'esito.
function _vfFine(key, esito){
  _vfStato()[key] = esito;
  if(ST.page === 'training' && typeof renderTraining === 'function') renderTraining();
}

async function _vfCerca(exName, sessionId, key, verso){
  const su = verso === 'difficile';
  if(su) await null;   // parte durante il disegno della seduta: l'esito ridisegna solo dopo, mai dentro
  const ex = (typeof findExercise === 'function') ? findExercise(exName, sessionId) : null;
  const codice = ex && ex.codice;
  if(!codice || !ST.user || !ST.user.id){ _vfFine(key, { stato: 'nessuna' }); return; }
  // Per la più difficile la riga intera: legge anche `variante_difficile` quando il foglio la avrà, e
  // intanto non si rompe se la colonna non c'è ancora.
  const r1 = await dbq('leggere l\'esercizio a catalogo', supa.from('esercizi_catalog').select(su ? '*' : VF_COLONNE).eq('codice', codice).limit(1), { silenzioso: true });
  if(r1.error){ _vfFine(key, { stato: 'errore' }); return; }
  const attuale = (r1.data || [])[0];
  if(!attuale){ _vfFine(key, { stato: 'nessuna' }); return; }
  const scritte = (String(attuale.alternativa || '') + ' ' + (su ? String(attuale.variante_difficile || '') : '')).match(/\bEX\d{3}\b/g) || [];
  const daLeggere = scritte.filter(c => c !== codice);
  const letture = [];
  if(daLeggere.length) letture.push(supa.from('esercizi_catalog').select(VF_COLONNE).in('codice', daLeggere));
  if(attuale.pattern) letture.push(supa.from('esercizi_catalog').select(VF_COLONNE).eq('pattern', attuale.pattern).neq('codice', codice).order('codice', { ascending: true }).range(0, 999));
  // il gradino sopra rimanda spesso a questo nella sua «alternativa»
  if(su) letture.push(supa.from('esercizi_catalog').select(VF_COLONNE).ilike('alternativa', `%${codice}%`).neq('codice', codice).range(0, 999));
  const esiti = await Promise.all(letture.map(q => dbq('leggere le alternative a catalogo', q, { silenzioso: true })));
  if(esiti.some(r => r.error)){ _vfFine(key, { stato: 'errore' }); return; }
  const righe = [].concat(...esiti.map(r => r.data || []));
  const p = ST.profile || {};
  const sess = (typeof getTrainingSession === 'function') ? getTrainingSession(sessionId) : null;
  const inScheda = (sess && sess.exercises ? sess.exercises : []).map(e => e && e.codice).filter(Boolean);
  // il riscaldamento di oggi non si propone mai: lo stesso codice non va nel riscaldamento e poi nel lavoro (Training 480, revisione)
  const escludi = (sess && Array.isArray(sess.warmup) ? sess.warmup : []).map(e => e && e.codice).filter(Boolean);
  const scelta = ZTCoachRules[su ? 'varianteDifficile' : 'varianteFacile'](attuale, righe, {
    tipoAllen: p.tipo_allenamento || 'casa',
    attrezzatura: Array.isArray(p.attrezzatura) && p.attrezzatura.length ? p.attrezzatura : ['elastico', 'corpo_libero'],
    inScheda, escludi,
  });
  _vfFine(key, scelta ? { stato: 'pronta', variante: scelta, exName, sessionId } : { stato: 'nessuna' });
}

// Il testo del suggerimento, con la variante se c'è. Chi disegna passa il suggerimento di
// getProgressionLive e riceve HTML già protetto. Se la frase non c'è, il testo torna com'è.
function varianteFacileHTML(exName, sessionId, sugg){
  const testo = String(sugg || '');
  // «nessuna variante più difficile nel catalogo» è già la risposta (computeNextSetSuggestion): non si cerca
  const verso = testo.includes(VF_FRASE) ? 'facile' : (testo.includes(VD_FRASE) && !testo.includes('nessuna ' + VD_FRASE)) ? 'difficile' : null;
  if(!verso) return esc(testo);
  const frase = verso === 'difficile' ? VD_FRASE : VF_FRASE;
  const v = varianteFacilePer(exName, sessionId, verso);
  const key = _vfKey(exName, sessionId, verso);
  if(v.stato === 'pronta'){
    const nome = `${esc(v.variante.nome)} <span style="font-family:var(--font-mono);font-weight:400;color:var(--t3);">${esc(v.variante.codice)}</span>`;
    return esc(testo).replace(frase, `${frase}: <a href="#" onclick="event.preventDefault();event.stopPropagation();apriVarianteFacile('${esc(key)}')" style="color:inherit;font-weight:700;text-decoration:underline;">${nome} ›</a>`);
  }
  // Senza una più difficile nel catalogo non resta una frase vuota (Training 430): si dice, e si sale di ripetizioni.
  // (Di norma lo dice già computeNextSetSuggestion; questo vale se la ricerca è finita dopo il calcolo.)
  const nota = v.stato === 'senza-rete' ? 'quale te lo dico quando torna la rete' : v.stato === 'in-corso' ? 'cerco quale…'
    : (verso === 'difficile' && v.stato === 'nessuna') ? 'nel catalogo non c\'è: resta su questo e sali di ripetizioni' : null;
  if(nota) return esc(testo).replace(frase, `${frase} <span style="color:var(--t3);">(${nota})</span>`);
  return esc(testo);
}

// Avvia per tempo la ricerca della più difficile per gli esercizi che hanno quella via, così quando
// la serie si salva la PROSSIMA sa già se c'è (Training 430). Non fa niente se è già partita.
function preparaVarianteDifficile(exName, sessionId, ex){
  if(typeof _exProgressione !== 'function' || _exProgressione(ex) !== VD_FRASE) return;
  varianteFacilePer(exName, sessionId, 'difficile');
}

// Il foglio della variante: nome, codice, come si fa in due righe, la GIF.
function apriVarianteFacile(key){
  const v = _vfStato()[key];
  if(!v || v.stato !== 'pronta') return;
  ST.varianteFacileAperta = key;
  ST.exerciseGifCache = ST.exerciseGifCache || {};
  if(!ST.exerciseGifCache[v.variante.codice]){
    ST.exerciseGifCache[v.variante.codice] = { url: null, status: 'loading' };
    fetchExerciseMedia(v.variante.nome, v.variante.codice).then(m => {
      ST.exerciseGifCache[v.variante.codice] = { url: m.cached_url || null, status: m.status || 'missing' };
      if(ST.varianteFacileAperta === key) renderVarianteFacileSheet();
    });
  }
  renderVarianteFacileSheet();
}
function chiudiVarianteFacile(){
  ST.varianteFacileAperta = null;
  const el = document.getElementById('variante-facile-sheet');
  if(el) el.remove();
}
function renderVarianteFacileSheet(){
  const key = ST.varianteFacileAperta;
  const v = key && _vfStato()[key];
  const existing = document.getElementById('variante-facile-sheet');
  if(existing) existing.remove();
  if(!v || v.stato !== 'pronta') return;
  const gif = ST.exerciseGifCache[v.variante.codice];
  const gifHTML = (gif && gif.status === 'cached' && gif.url)
    ? `<img src="${gif.url}" alt="Esecuzione ${esc(v.variante.nome)}" class="rest-hero-gif">`
    : `<div class="rest-hero-gif-placeholder">${gif && gif.status === 'loading' ? 'Caricamento…' : 'Anteprima non disponibile'}</div>`;
  const come = v.variante.come.length
    ? v.variante.come.map(r => `<p style="font-family:var(--font-sans);font-size:14px;color:var(--t1);margin:0 0 8px;line-height:1.45;">${esc(r)}</p>`).join('')
    : `<p style="font-family:var(--font-sans);font-size:13px;color:var(--t2);margin:0;">Per questo esercizio il catalogo non ha ancora la descrizione.</p>`;
  const html = `<div id="variante-facile-sheet" class="pianov4-weighin-overlay" onclick="if(event.target===this)chiudiVarianteFacile()">
    <div class="pianov4-weighin-screen">
      <div class="pianov4-weighin-band"></div>
      <div class="pianov4-weighin-handle"></div>
      <div class="pianov4-weighin-header">
        <div class="pianov4-weighin-eyebrow">${esc(COACH_NAME)} · AL POSTO DI ${esc(v.exName)}</div>
        <div class="pianov4-weighin-title">${esc(v.variante.nome)} <span style="font-family:var(--font-mono);font-size:12px;font-weight:400;color:var(--t3);">${esc(v.variante.codice)}</span></div>
        <button class="pianov4-weighin-close" onclick="chiudiVarianteFacile()" aria-label="Chiudi">×</button>
      </div>
      <div class="pianov4-weighin-body" style="max-height:60vh;overflow-y:auto;padding-top:10px;">
        ${gifHTML}
        <div style="font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--t3);letter-spacing:.08em;margin:12px 0 6px;">COME SI FA</div>
        ${come}
        <p style="font-family:var(--font-sans);font-size:12px;color:var(--t3);margin:10px 0 0;">Vale per la prossima serie di oggi: la scheda non cambia.</p>
        ${(typeof cambiaPerOggi === 'function') ? `<button id="vf-cambia-oggi" onclick="chiudiVarianteFacile();cambiaPerOggi('${esc(v.sessionId)}','${esc(v.exName).replace(/'/g, "\\'")}','${esc(v.variante.codice)}')" style="width:100%;margin-top:14px;padding:12px;background:var(--acc);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;font-family:var(--font-sans);cursor:pointer;">Faccio questa oggi: le serie vanno sotto ${esc(v.variante.nome)}</button>` : ''}
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}
