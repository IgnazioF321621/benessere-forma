// ═══════════════════════════════════════════════════════════
// ANALISI — la scheda «Analisi» del Body: lo storico delle analisi del sangue (Body 160, 2 novembre 2026)
// ═══════════════════════════════════════════════════════════
// Ignazio (14 ottobre 2026): «voglio caricare il PDF delle analisi, anche quelle vecchie, per avere uno storico
// e dare i dati al coach»; il 2 novembre: uno spazio tutto suo, con TUTTE le analisi, comprese quelle di ogni
// donazione di sangue. Qui:
//   - l'elenco per data (blood_tests, una riga per prelievo: UNIQUE user_id+test_date dalla migrazione
//     20261102_160); ogni analisi si apre e mostra tutti i suoi valori con la fascia (quella del referto se
//     stampata, altrimenti la tabella di shared/esami.js, con la fonte) e il segno basso/alto
//   - «Carica analisi (PDF o foto)»: il file va al Worker (/esami-report → Gemini) e torna un elenco di righe
//     nome · valore · unità come stampati; il foglio le mostra, la persona corregge, toglie, aggiunge, segna
//     la donazione e tocca «Salva»: solo allora si scrive, con la DATA DEL PRELIEVO. Il file non si conserva.
//     Lo stesso foglio, vuoto, serve per «Aggiungi a mano» e per «Modifica»
//   - il segno «donazione» con il conto: una donazione porta sempre le sue analisi, quindi è un segno sulla riga
//   - l'andamento di ogni valore con almeno due misure: grafico SVG inline (come Energia), con la fascia normale
//   - la lettura di Pirsi in due righe: cosa è cambiato rispetto alla volta prima (callAI, una volta per analisi,
//     il testo resta sul telefono). Pirsi descrive, non fa diagnosi; fuori fascia → «parlane col medico»
// Il vocabolario, le fasce e la pulizia sono in shared/esami.js (ZTEsami), la stessa del Worker.
// Il consenso prima del primo invio (consensoLetturaEsami) c'è ma è SPENTO finché l'app ha un utente solo
// (decisione di Ignazio del 1 novembre 2026, come la privacy): CONSENSO_ESAMI_ATTIVO.
// Mai la parola «errore» nei testi.

const CONSENSO_ESAMI_ATTIVO = false;   // Ignazio, 1/11/2026: nessun foglio di consenso finché l'app ha un utente solo
const ANALISI_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];   // HEIC dell'iPhone: la riduzione su canvas lo fa diventare JPEG
const ANALISI_PIRSI_MAX = 160;         // parole: due righe, non un referto commentato

async function consensoLetturaEsami(){
  if(!CONSENSO_ESAMI_ATTIVO) return true;
  try { if(localStorage.getItem('zt_esami_ok') === '1') return true; } catch(e) {}
  const ok = await chiediConferma('Per leggere le analisi, il PDF (o la foto) del referto viene mandato a Gemini, un servizio esterno. Nessun altro tuo dato parte con lui, al modello si chiede di non leggere nome e codice fiscale, e il file non viene conservato. Vuoi continuare?', { titolo:'Lettura delle analisi', ok:'Acconsento' });
  if(ok) { try { localStorage.setItem('zt_esami_ok', '1'); } catch(e) {} }
  return ok;
}

function _anSesso(){ const s = String((ST.profile && ST.profile.sex) || '').toUpperCase(); return s === 'M' || s === 'F' ? s : null; }
function _anRighe(){ return Array.isArray(ST.bloodTests) ? ST.bloodTests.slice().sort((a, b) => (a.test_date < b.test_date ? 1 : a.test_date > b.test_date ? -1 : 0)) : null; }
function _anPrecedente(righe, riga){ return righe.find(r => r.test_date < riga.test_date) || null; }
function _anIt(n){ return n == null ? '—' : String(n).replace('.', ','); }
function _anDataLunga(k){ return new Date(k + 'T12:00:00').toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' }); }

// ── La scheda ──
function renderBodyAnalisi(){
  const righe = _anRighe();
  if(righe === null){
    if(ST.bloodLetturaFallita) return `<div style="padding:40px 20px;text-align:center;"><div style="color:var(--t2);font-size:13px;font-family:var(--font-sans);line-height:1.6;margin-bottom:14px;">Non riesco a leggere le analisi${typeof senzaRete === 'function' && senzaRete() ? ': sei senza rete' : ''}.<br>Quello che hai salvato è al sicuro.</div><button class="btn btn-primary" onclick="ST.bloodLetturaFallita=false;ST.bloodTests=null;renderBody()">Riprova</button></div>`;
    if(!ST.bloodInLettura && typeof loadBloodTests === 'function'){ ST.bloodInLettura = true; loadBloodTests().finally(() => { ST.bloodInLettura = false; if(ST.page === 'body' && ST.bodyTab === 'analisi') renderBody(); }); }
    return `<div style="padding:40px;text-align:center;color:var(--t3);font-size:13px;font-family:var(--font-mono);">Caricamento…</div>`;
  }
  const donazioni = righe.filter(r => r.donazione).length;
  const busy = ST.analisiBusy;
  const azioni = `<div class="b5-gruppo an-azioni">
      <button type="button" class="b5-check-riga an-carica" onclick="caricaAnalisi()" ${busy ? 'disabled' : ''}><span>${busy ? 'Leggo il referto…' : 'Carica analisi (PDF o foto)'}</span><span class="b5-check-chev" aria-hidden="true">›</span></button>
      <button type="button" class="b5-check-riga an-mano" onclick="aggiungiAnalisiAMano()" ${busy ? 'disabled' : ''}><span>Aggiungi a mano</span><span class="b5-check-chev" aria-hidden="true">›</span></button>
      <input id="an-file" type="file" accept="image/*,application/pdf" onchange="leggiReferto(this)" ${busy ? 'disabled' : ''} style="display:none;">
    </div>`;
  const testa = `<h2 class="sez5 an-titolo">Le analisi <span class="sez5-dx an-donazioni">${donazioni ? `${donazioni} donazion${donazioni === 1 ? 'e' : 'i'}` : 'nessuna donazione'}</span></h2>`;
  let elenco;
  if(!righe.length){
    elenco = `<div class="b5-vuoto an-vuoto"><div class="b5-vuoto-tondo">🩸</div><h3>Nessuna analisi ancora</h3><p style="font-size:13px;color:var(--t2);font-family:var(--font-sans);line-height:1.5;margin:0;">Carica il referto, anche di anni fa: restano qui per data, e ${COACH_NAME} le legge.</p></div>`;
  } else {
    elenco = `<h2 class="sez5">Per data</h2><div class="b5-gruppo an-elenco">${righe.map(r => _anRigaHTML(r, righe)).join('')}</div>`;
  }
  return testa + azioni + elenco + _anAndamentoHTML(righe);
}

function _anRigaHTML(r, righe){
  const aperta = ST.analisiAperta === r.id;
  const valori = ZTEsami.daRiga(r);
  const sesso = _anSesso();
  const fuori = valori.filter(v => ZTEsami.fuoriFascia(v.valore, ZTEsami.fasciaPer(v, sesso))).length;
  const riga = `<button type="button" class="b5-log-riga an-riga${aperta ? ' an-aperta' : ''}" onclick="apriAnalisi('${esc(r.id)}')" aria-expanded="${aperta}">
      <span class="b5-log-data">${fmtDate(r.test_date)}${r.donazione ? ' <small>donazione</small>' : ''}</span>
      <span class="b5-log-valori">${valori.length} valor${valori.length === 1 ? 'e' : 'i'}${fuori ? ` · ${fuori} fuori fascia` : ''}</span><span class="b5-check-chev" aria-hidden="true">${aperta ? '⌄' : '›'}</span></button>`;
  if(!aperta) return riga;
  const prec = _anPrecedente(righe, r);
  const precValori = prec ? ZTEsami.daRiga(prec) : [];
  const dettaglio = valori.map(v => {
    const e = v.chiave ? ZTEsami.esame(v.chiave) : null;
    const f = ZTEsami.fasciaPer(v, sesso), segno = ZTEsami.fuoriFascia(v.valore, f);
    const pv = v.chiave ? precValori.find(x => x.chiave === v.chiave) : null;
    const delta = pv ? (v.valore - pv.valore) : null;
    return `<div class="an-valore${segno ? ' an-fuori' : ''}">
        <span class="an-nome">${esc(e ? e.label : v.nome)}${f ? `<small>fascia ${esc(ZTEsami.mostraFascia(f))}${f.fonte === 'referto' ? '' : ` · ${esc(f.fonte)}`}</small>` : ''}</span>
        <span class="an-numero">${esc(_anIt(v.valore))}${v.unita ? ` <small>${esc(v.unita)}</small>` : ''}${segno ? `<b class="an-segno">${segno}</b>` : ''}${delta != null && delta !== 0 ? `<small class="an-delta">${delta > 0 ? '+' : '−'}${esc(_anIt(Math.round(Math.abs(delta) * 100) / 100))}</small>` : ''}</span>
      </div>`;
  }).join('');
  const pirsi = _anPirsiHTML(r, prec);
  return riga + `<div class="an-dettaglio">
      ${dettaglio || `<div style="font-size:12px;color:var(--t3);font-family:var(--font-mono);">Nessun valore registrato per questa data.</div>`}
      ${pirsi}
      <div class="an-medico">${BLOOD_MEDICO}${r.notes ? ` · ${esc(r.notes)}` : ''}</div>
      <div class="an-tasti">
        <button type="button" class="an-tasto" onclick="toggleDonazione('${esc(r.id)}')">${r.donazione ? 'Togli il segno donazione' : 'Segna come donazione'}</button>
        <button type="button" class="an-tasto" onclick="modificaAnalisi('${esc(r.id)}')">Modifica</button>
        <button type="button" class="an-tasto an-elimina" onclick="eliminaAnalisi('${esc(r.id)}')">Elimina</button>
      </div>
    </div>`;
}

function apriAnalisi(id){
  ST.analisiAperta = ST.analisiAperta === id ? null : id;
  renderBody();
  if(ST.analisiAperta) pirsiAnalisi(id);
}

// ── L'andamento: una card per valore con almeno due misure ──
function _anAndamentoHTML(righe){
  const sesso = _anSesso();
  const cards = ZTEsami.ESAMI.map(e => ({ e, s: ZTEsami.serie(righe, e.chiave) })).filter(x => x.s.length >= 2);
  if(!cards.length) return '';
  return `<h2 class="sez5">L'andamento</h2>` + cards.map(({ e, s }) => {
    const ultimo = s[s.length - 1];
    const f = ZTEsami.fascia(e.chiave, sesso);
    const segno = ZTEsami.fuoriFascia(ultimo.valore, f);
    return `<div class="b5-gruppo an-card">
        <div class="an-card-testa"><span class="an-card-nome">${esc(e.label)}</span><span class="an-card-ultimo${segno ? ' an-fuori' : ''}">${esc(_anIt(ultimo.valore))} ${esc(ultimo.unita || e.unita)}<small>${esc(fmtDate(ultimo.date))}</small></span></div>
        ${_anGrafico(s, f)}
        ${f ? `<div class="an-card-fascia">Fascia ${esc(ZTEsami.mostraFascia(f))} ${esc(ultimo.unita || e.unita)} · ${esc(f.fonte)}</div>` : ''}
      </div>`;
  }).join('');
}
// SVG inline come il grafico di Energia: nessuna libreria. La fascia è un rettangolo chiaro dietro la linea.
function _anGrafico(serie, f){
  const n = serie.length, W = 300, H = 110, sx = 34, dx = 12, top = 10, bot = 18;
  const vals = serie.map(p => p.valore);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if(f){ if(f.min != null) lo = Math.min(lo, f.min); if(f.max != null) hi = Math.max(hi, f.max); }
  if(hi === lo){ hi = lo + 1; lo = lo - 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  if(lo < 0 && Math.min(...vals) >= 0) lo = 0;
  const x = i => sx + (n > 1 ? i * (W - sx - dx) / (n - 1) : (W - sx - dx) / 2);
  const y = v => top + (hi - v) * (H - top - bot) / (hi - lo);
  const fascia = f ? (() => {
    const a = f.max != null ? Math.max(y(f.max), top) : top, b = f.min != null ? Math.min(y(f.min), H - bot) : H - bot;
    return `<rect class="an-fascia" x="${sx}" y="${a.toFixed(1)}" width="${W - sx - dx}" height="${Math.max(0, b - a).toFixed(1)}"/>`;
  })() : '';
  const tacche = [lo, hi - pad].map(v => `<text class="en-asse" x="2" y="${(y(v) + 3).toFixed(1)}">${esc(_anIt(Math.round(v * 10) / 10))}</text>`).join('');   // la tacca in basso è il bordo (0 se il grafico parte da zero)
  const linea = `<polyline class="an-linea" points="${serie.map((p, i) => `${x(i).toFixed(1)},${y(p.valore).toFixed(1)}`).join(' ')}"/>`;
  const punti = serie.map((p, i) => `<circle class="an-punto${ZTEsami.fuoriFascia(p.valore, f) ? ' an-punto-fuori' : ''}" cx="${x(i).toFixed(1)}" cy="${y(p.valore).toFixed(1)}" r="3"><title>${esc(fmtDate(p.date))}: ${esc(_anIt(p.valore))}</title></circle>`).join('');
  const date = [0, n - 1].map(i => `<text class="en-asse" x="${x(i).toFixed(1)}" y="${H - 4}" text-anchor="${i === 0 ? 'start' : 'end'}">${esc(new Date(serie[i].date + 'T12:00:00').toLocaleDateString('it-IT', { month:'short', year:'2-digit' }))}</text>`).join('');
  return `<svg class="en-grafico an-grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento nel tempo">${fascia}${tacche}${linea}${punti}${date}</svg>`;
}

// ── Pirsi in due righe: cosa è cambiato rispetto alla volta prima ──
function _anImpronta(s){ let h = 5381; s = String(s || ''); for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
function _anPirsiChiave(){ return 'zt_analisi_pirsi_' + ((ST.user && ST.user.id) || 'anon'); }
function _anPirsiSalvati(){ try { return JSON.parse(localStorage.getItem(_anPirsiChiave()) || '{}') || {}; } catch(e) { return {}; } }
// La lettura vale per QUESTA analisi con QUESTI valori e QUESTA precedente: cambia una cosa, si rifà
function _anPirsiId(r, prec){ return r.id + ':' + _anImpronta(JSON.stringify([ZTEsami.daRiga(r), prec ? [prec.test_date, ZTEsami.daRiga(prec)] : null])); }
function _anPirsiDi(r, prec){ const k = _anPirsiId(r, prec); return (ST.analisiPirsi || {})[k] || (_anPirsiSalvati()[k] || null); }
function _anPirsiHTML(r, prec){
  const testo = _anPirsiDi(r, prec);
  const busy = (ST.analisiPirsiBusy || {})[r.id];
  const corpo = testo ? esc(testo) : busy ? 'Ci penso…' : `<button type="button" class="an-tasto an-pirsi-tasto" onclick="pirsiAnalisi('${esc(r.id)}', true)">Cosa è cambiato?</button>`;
  return `<div class="an-pirsi"><span class="an-pirsi-chi">${esc(COACH_NAME)}</span><span class="an-pirsi-testo">${corpo}</span></div>`;
}
function _anPirsiPrompt(r, prec, sesso){
  const cur = ZTEsami.riassunto(r, sesso), pre = prec ? ZTEsami.riassunto(prec, sesso) : '';
  return `${ZTCoachRules.voce()}

La persona ha aperto le sue analisi del sangue del ${_anDataLunga(r.test_date)}${r.donazione ? ' (fatte per una donazione di sangue)' : ''}. Dille in DUE righe cosa è cambiato rispetto alla volta prima${prec ? ` (${_anDataLunga(prec.test_date)})` : ''}.
Regole: descrivi, non fare diagnosi e non dare terapie. Usa SOLO i numeri qui sotto, con le loro unità: non inventarne altri. Se un valore è fuori dalla sua fascia, dillo e invita a parlarne col medico. Niente elenchi, niente titoli, niente saluti. Massimo 50 parole.
${prec ? '' : 'Non c\'è una volta prima: dillo in una riga e di\' che le prossime le confronterai con queste.\n'}
ANALISI DI ADESSO: ${cur || '(nessun valore)'}
${prec ? `VOLTA PRIMA: ${pre || '(nessun valore)'}` : ''}`;
}
async function pirsiAnalisi(id, daTocco){
  const righe = _anRighe() || [];
  const r = righe.find(x => x.id === id);
  if(!r) return;
  const prec = _anPrecedente(righe, r);
  if(_anPirsiDi(r, prec)) return;
  if((ST.analisiPirsiBusy || {})[id]) return;
  // all'apertura si chiede da soli solo con la rete; senza, resta il tasto
  if(!daTocco && typeof senzaRete === 'function' && senzaRete()) return;
  ST.analisiPirsiBusy = ST.analisiPirsiBusy || {}; ST.analisiPirsiBusy[id] = true;
  if(ST.page === 'body' && ST.bodyTab === 'analisi') renderBody();
  try {
    const testo = String(await callAI(_anPirsiPrompt(r, prec, _anSesso()), 220) || '').replace(/\s+/g, ' ').trim();
    if(!testo) throw _aiError('empty', 'Risposta vuota');
    const breve = testo.split(' ').slice(0, ANALISI_PIRSI_MAX).join(' ');
    const k = _anPirsiId(r, prec);
    ST.analisiPirsi = ST.analisiPirsi || {}; ST.analisiPirsi[k] = breve;
    try { const tutti = _anPirsiSalvati(); tutti[k] = breve; const chiavi = Object.keys(tutti); if(chiavi.length > 100) delete tutti[chiavi[0]]; localStorage.setItem(_anPirsiChiave(), JSON.stringify(tutti)); } catch(e) {}
  } catch(e){
    console.warn('[analisi] Pirsi:', e && e.aiKind, e && e.message);
    if(daTocco) showToast('Non riesco a leggerle ora. ' + aiErrMsg(e && e.aiKind), '⚠️', 5500);
  } finally {
    delete ST.analisiPirsiBusy[id];
    if(ST.page === 'body' && ST.bodyTab === 'analisi') renderBody();
  }
}

// ── Caricare il referto ──
function caricaAnalisi(){ const el = document.getElementById('an-file'); if(el && !ST.analisiBusy) el.click(); }
function analisiErrorMessage(status, err){
  const kind = err && err.kind;
  if(status === 0) return 'Connessione assente: riprova quando sei online';
  if(status === 401) return 'Sessione scaduta: esci, rientra e riprova';
  if(kind === 'bad-file') return 'Scegli il PDF o la foto del referto';
  if(kind === 'too-large') return 'Il file è troppo grande: prova con una foto per pagina';
  if(kind === 'timeout' || status === 504) return 'Ci ho messo troppo: riprova tra poco';
  if(kind === 'rate-limit') return 'Troppe letture in questo momento: riprova tra un minuto';
  return 'Non sono riuscito a leggere il referto: riprova tra poco';
}
// Dal tasto «Carica analisi»: parte solo da un tocco, mai da sola
async function leggiReferto(input){
  const file = input && input.files && input.files[0];
  if(input) input.value = '';
  if(!file || !ST.user || ST.analisiBusy) return;
  if(!ANALISI_MIME.includes(file.type)){ showToast('Scegli il PDF o la foto del referto', '⚠️', 5500); return; }
  if(!await consensoLetturaEsami()) return;
  ST.analisiBusy = true; renderBody();
  let lettura = null;
  try {
    let pronto;
    try { pronto = await fitdaysPreparaFile(file); } catch(e){ showToast(e && e.message || 'Non riesco a leggere questo file', '⚠️', 5500); return; }
    const { data: { session } } = await supa.auth.getSession();
    if(!session || !session.access_token){ showToast(analisiErrorMessage(401), '⚠️', 5500); return; }
    let r, j = null;
    try {
      r = await fetch(WORKER_URL + '/esami-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ user_id: ST.user.id, mime: pronto.mime, data: pronto.base64 }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(75000) : undefined,
      });
      j = await r.json().catch(() => null);
    } catch(e){
      console.warn('[analisi] rete:', e && e.name);
      showToast(e && e.name === 'TimeoutError' ? analisiErrorMessage(504) : analisiErrorMessage(0), '⚠️', 5500);
      return;
    }
    if(!r.ok || !j || !j.lettura){
      const err = j && j.error;
      console.warn('[analisi] lettura non riuscita:', r.status, err && err.kind);
      showToast(analisiErrorMessage(r.status, err), '⚠️', 5500);
      return;
    }
    const L = j.lettura;
    if(!L.riconosciuto || !L.letti){ showToast('Non mi sembra un referto di analisi: scegli il PDF o una foto nitida delle pagine coi risultati', '⚠️', 6500); return; }
    lettura = L;
  } finally {
    ST.analisiBusy = false;
    renderBody();
  }
  if(lettura) await apriFoglioAnalisi({ data: lettura.data_prelievo, esami: lettura.esami, note: lettura.note, fonte: 'lettura', prompt_version: lettura.meta && lettura.meta.prompt_version });
}
function aggiungiAnalisiAMano(){ if(!ST.analisiBusy) apriFoglioAnalisi({ data: null, esami: [], fonte: 'mano' }); }
function modificaAnalisi(id){
  const r = (_anRighe() || []).find(x => x.id === id);
  if(r) apriFoglioAnalisi({ id: r.id, data: r.test_date, esami: ZTEsami.daRiga(r), donazione: !!r.donazione, fonte: r.fonte || 'mano', prompt_version: r.prompt_version || null, notes: r.notes || null });
}

// ── Il foglio: la data, le righe (nome · valore · unità), la donazione, «Salva» ──
// Costruito con _foglio di comune.js (stesso sfondo e stessi tasti delle conferme). Si risolve con la riga
// salvata, o null.
function apriFoglioAnalisi(o){
  const oggi = todayKey();
  return _foglio({
    annullato: null,
    riempi(box, chiudi){
      box.classList.add('an-foglio');
      const righe = (o.esami || []).map(e => ({ nome: e.nome, valore: e.valore, unita: e.unita || '', chiave: e.chiave || null, rif_min: e.rif_min, rif_max: e.rif_max }));
      let donazione = !!o.donazione;
      const h = document.createElement('div');
      h.className = 'an-foglio-corpo';   // scorre lui: titolo e righe dentro, «Salva» resta sempre in vista
      const disegna = () => {
        h.innerHTML = `<h3 class="foglio-titolo">${o.id ? 'Modifica le analisi' : o.fonte === 'lettura' ? `Analisi lette da ${esc(COACH_NAME)}` : 'Nuove analisi'}</h3>
          ${o.fonte === 'lettura' && !o.id ? `<p class="an-foglio-nota">${righe.length} valor${righe.length === 1 ? 'e' : 'i'} dal referto${o.data ? '' : ', senza la data del prelievo: scrivila tu'}. Controlla, correggi, poi «Salva».${o.note ? ' ' + esc(o.note) : ''}</p>` : ''}
          <label class="an-foglio-lbl">Data del prelievo</label>
          <input id="an-data" class="inp" type="date" max="${oggi}" value="${esc(o.data || '')}">
          <div class="an-foglio-righe">${righe.map((r, i) => `<div class="an-foglio-riga" data-i="${i}">
              <input class="inp an-f-nome" type="text" placeholder="Esame" value="${esc(r.nome || '')}" aria-label="Esame">
              <input class="inp an-f-valore" type="text" inputmode="decimal" placeholder="Valore" value="${r.valore == null ? '' : esc(_anIt(r.valore))}" aria-label="Valore">
              <input class="inp an-f-unita" type="text" placeholder="Unità" value="${esc(r.unita || '')}" aria-label="Unità">
              <button type="button" class="an-f-togli" aria-label="Togli la riga" data-togli="${i}">×</button>
            </div>`).join('')}</div>
          <button type="button" class="btn btn-ghost btn-sm an-f-aggiungi">+ Aggiungi un valore</button>
          <button type="button" class="an-f-donazione" role="switch" aria-checked="${donazione}">
            <span><span class="an-f-don-nome">Donazione di sangue</span><span class="an-f-don-sotto">Le analisi fatte per donare: contano nel conto delle donazioni</span></span>
            <span aria-hidden="true" class="an-f-leva"><i></i></span>
          </button>
          <div id="an-foglio-err" class="an-foglio-err" hidden></div>`;
        h.querySelectorAll('[data-togli]').forEach(b => b.onclick = () => { leggi(); righe.splice(Number(b.dataset.togli), 1); disegna(); });
        h.querySelector('.an-f-aggiungi').onclick = () => { leggi(); righe.push({ nome: '', valore: null, unita: '' }); disegna(); const ultimo = h.querySelector('.an-foglio-riga:last-child .an-f-nome'); if(ultimo) ultimo.focus(); };
        h.querySelector('.an-f-donazione').onclick = () => { donazione = !donazione; h.querySelector('.an-f-donazione').setAttribute('aria-checked', String(donazione)); };
      };
      // quello che c'è scritto nelle caselle torna nelle righe (prima di ridisegnare o salvare)
      const leggi = () => {
        h.querySelectorAll('.an-foglio-riga').forEach(div => {
          const i = Number(div.dataset.i); if(!righe[i]) return;
          righe[i].nome = div.querySelector('.an-f-nome').value;
          righe[i].valore = div.querySelector('.an-f-valore').value;
          righe[i].unita = div.querySelector('.an-f-unita').value;
        });
      };
      disegna();
      box.appendChild(h);
      _foglioBottoni(box, (valore) => {
        if(valore === undefined) return;   // «Salva» con qualcosa che non va: il foglio resta aperto
        chiudi(valore);
      }, { ok:'Salva', annulla:'Annulla', valoreAnnulla:null }, () => {
        leggi();
        const err = h.querySelector('#an-foglio-err');
        const dire = (t) => { err.hidden = false; err.textContent = t; return undefined; };
        const data = h.querySelector('#an-data').value;
        if(!data) return dire('Scrivi la data del prelievo.');
        if(data > oggi) return dire('La data del prelievo non può essere nel futuro.');
        // un'analisi modificata non può prendere la data di un'altra: due prelievi diventerebbero uno (revisione del 3 novembre)
        if((_anRighe() || []).some(x => x.test_date === data && x.id !== o.id)) return dire(`C'è già un'analisi del ${fmtDate(data)}: aprila da «Per data» e usa «Modifica».`);
        const senzaNumero = righe.filter(r => String(r.nome || '').trim() && ZTEsami.numero(r.valore) == null).length;
        if(senzaNumero) return dire(`${senzaNumero} rig${senzaNumero === 1 ? 'a ha' : 'he hanno'} un valore che non è un numero.`);
        const v = ZTEsami.valida({ riconosciuto: true, data_prelievo: data, esami: righe.map(r => ({ nome: r.nome, valore: r.valore, unita: r.unita, chiave: r.chiave, rif_min: r.rif_min, rif_max: r.rif_max })) });
        if(!v.esami.length) return dire('Serve almeno un esame con un numero.');
        return { id: o.id || null, test_date: data, esami: v.esami, donazione, fonte: o.fonte || 'mano', prompt_version: o.prompt_version || null, notes: o.notes || null };
      });
      // _foglioBottoni chiude con il valore di «Salva»: se è undefined (manca qualcosa) il foglio deve restare aperto
    }
  }).then(async (scelta) => {
    if(!scelta) return null;
    return salvaAnalisi(scelta);
  });
}
// Scrive la riga: upsert su (user_id, test_date), le 11 colonne dalle chiavi riconosciute, tutte le righe in `esami`
async function salvaAnalisi(s){
  if(!ST.user) return null;
  const riga = { user_id: ST.user.id, test_date: s.test_date, ...ZTEsami.inColonne(s.esami), esami: s.esami, donazione: !!s.donazione, fonte: s.fonte, prompt_version: s.prompt_version, notes: s.notes };
  const r = await dbq('salvare le analisi', supa.from('blood_tests').upsert(riga, { onConflict:'user_id,test_date' }));
  if(r.error){
    // la lettura del referto non si perde: il foglio torna com'era, con quello che la persona aveva corretto
    showToast(typeof senzaRete === 'function' && senzaRete() ? 'Sei senza rete: le analisi restano nel foglio, salva quando torna' : 'Non sono riuscito a salvare le analisi: riprova', '⚠️', 5500);
    return apriFoglioAnalisi({ id: s.id, data: s.test_date, esami: s.esami, donazione: s.donazione, fonte: s.fonte, prompt_version: s.prompt_version, notes: s.notes });
  }
  // la riga modificata con una data nuova lascerebbe la vecchia: si toglie
  if(s.id){ const vecchia = (_anRighe() || []).find(x => x.id === s.id); if(vecchia && vecchia.test_date !== s.test_date) await dbq('togliere la data vecchia delle analisi', supa.from('blood_tests').delete().eq('id', s.id).eq('user_id', ST.user.id), { silenzioso:true }); }
  showToast(`Analisi del ${fmtDate(s.test_date)} salvate`, '✅', 3500);
  ST.bloodTests = null; ST.analisiAperta = null;
  if(typeof loadBloodTests === 'function') await loadBloodTests();
  const nuova = (_anRighe() || []).find(x => x.test_date === s.test_date);
  if(nuova) ST.analisiAperta = nuova.id;
  if(ST.page === 'body') renderBody();
  if(nuova) pirsiAnalisi(nuova.id);
  return riga;
}
async function toggleDonazione(id){
  const r = (_anRighe() || []).find(x => x.id === id);
  if(!r || !ST.user) return;
  const res = await dbq(r.donazione ? 'togliere il segno donazione' : 'segnare la donazione', supa.from('blood_tests').update({ donazione: !r.donazione }).eq('id', id).eq('user_id', ST.user.id));
  if(res.error){ if(typeof senzaRete === 'function' && senzaRete()) showToast('Sei senza rete: riprova quando torna', '⚠️', 4500); return; }
  r.donazione = !r.donazione;
  renderBody();
}
async function eliminaAnalisi(id){
  const r = (_anRighe() || []).find(x => x.id === id);
  if(!r || !ST.user) return;
  if(!await chiediConferma(`Le analisi del ${fmtDate(r.test_date)} vengono tolte dallo storico.`, { titolo:'Eliminare queste analisi?', ok:'Elimina', pericolo:true })) return;
  const res = await dbq('eliminare le analisi', supa.from('blood_tests').delete().eq('id', id).eq('user_id', ST.user.id));
  if(res.error){ if(typeof senzaRete === 'function' && senzaRete()) showToast('Sei senza rete: riprova quando torna', '⚠️', 4500); return; }
  ST.bloodTests = (ST.bloodTests || []).filter(x => x.id !== id);
  if(ST.analisiAperta === id) ST.analisiAperta = null;
  showToast('Analisi eliminate', '✅', 3000);
  renderBody();
}
