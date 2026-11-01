// ═══════════════════════════════════════════════════════════
// NOTIFICHE — i promemoria del pasto non registrato (Notifiche 170, 1 novembre 2026)
// ═══════════════════════════════════════════════════════════
// Ignazio ha scelto le ore fisse: se manca la colazione entro le 10, il pranzo entro le 15 o la cena entro
// le 22 (ora di Roma), arriva un avviso sul telefono. La regola è in shared/promemoria.js, l'avviso lo manda
// il Worker (Web Push, ogni ora alle 10, 15 e 22), qui c'è la parte del telefono:
//   - nelle Impostazioni › Cibo tre interruttori, uno per pasto, SPENTI all'inizio: ognuno li accende da sé.
//     Al primo acceso l'app chiede il permesso delle notifiche (dal tocco della persona, come vuole il
//     telefono), iscrive il telefono al servizio push con la chiave pubblica del Worker (GET /push-chiave)
//     e salva l'iscrizione in push_iscrizioni; la scelta sta in profiles.promemoria_pasti, scritta subito,
//     non al «Salva» delle Impostazioni.
//   - su iPhone le notifiche arrivano solo con l'app aggiunta alla schermata Home (iOS 16.4+): se non è
//     installata l'interruttore resta spento e la nota lo dice.
//   - a ogni apertura, se i promemoria sono accesi e il permesso c'è, l'iscrizione si riallinea in silenzio
//     (pushRiallinea: dopo un logout la riga è stata tolta, dopo un cambio di chiave il telefono si iscrive
//     di nuovo); un marcatore sul telefono (zt_push_<utente>) evita di riscrivere la stessa riga ogni volta.
//   - al logout l'iscrizione di questo telefono si toglie (pushDisiscrivi): chi entra dopo non riceve gli
//     avvisi di chi è uscito.
//   - il tocco sull'avviso apre il tab Nutrition: sw.js manda un messaggio alla pagina aperta o apre
//     ?apri=oggi, e qui si fa showPage('oggi').
// Mai la parola «errore» nei testi (Regia, 1 novembre 2026).

// Il service worker registrato, o null: MAI `navigator.serviceWorker.ready`, che senza registrazione non si
// risolve e terrebbe appeso il logout (revisione del 1 novembre 2026)
async function _swRegistrazione() {
  try {
    if(typeof navigator === 'undefined' || !navigator.serviceWorker || !navigator.serviceWorker.getRegistration) return null;
    return (await navigator.serviceWorker.getRegistration('/benessere-forma/')) || (await navigator.serviceWorker.getRegistration()) || null;
  } catch(e) { return null; }
}

function _pushChiave() { return 'zt_push_' + ((ST.user && ST.user.id) || 'anon'); }
function _eIphone() { try { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); } catch(e) { return false; } }
function promemoriaAccesi() { return ZTPromemoria.accesi(ST.profile || {}); }

// Il telefono può ricevere le notifiche? { ok, motivo }: 'installa' (iPhone senza l'app sulla schermata Home),
// 'browser' (niente Web Push qui), 'bloccate' (permesso negato una volta: si riaccende dalle impostazioni del telefono)
function notifichePossibili() {
  const pushCe = typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker && typeof PushManager !== 'undefined';
  if(!pushCe) return { ok:false, motivo: _eIphone() && !appInstallata() ? 'installa' : 'browser' };
  if(Notification.permission === 'denied') return { ok:false, motivo:'bloccate' };
  return { ok:true, motivo:null };
}

function _b64urlAByte(s) {
  const t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + (t.length % 4 ? '='.repeat(4 - (t.length % 4)) : ''));
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function _byteAB64url(buf) {
  const b = new Uint8Array(buf); let s = '';
  for(let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// La chiave pubblica del Worker, letta una volta per apertura
let _pushChiavePubblica = null;
async function _leggiChiavePush() {
  if(_pushChiavePubblica) return _pushChiavePubblica;
  const r = await fetch(WORKER_URL + '/push-chiave');
  if(!r.ok) return null;
  const j = await r.json();
  _pushChiavePubblica = (j && typeof j.chiave === 'string' && j.chiave.length > 80) ? j.chiave : null;
  return _pushChiavePubblica;
}

// Iscrive questo telefono (o ritrova l'iscrizione che ha) e la salva in push_iscrizioni. null se non si può.
async function pushIscrivi() {
  if(!ST.user || !ST.user.id) return null;
  const chiave = await _leggiChiavePush();
  if(!chiave) return null;
  const reg = await _swRegistrazione();
  if(!reg || !reg.pushManager) return null;
  let sub = await reg.pushManager.getSubscription();
  // un'iscrizione fatta con un'altra chiave del Worker non serve più: si rifà
  if(sub && sub.options && sub.options.applicationServerKey && _byteAB64url(sub.options.applicationServerKey) !== chiave) { try { await sub.unsubscribe(); } catch(e) {} sub = null; }
  if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: _b64urlAByte(chiave) });
  const j = sub.toJSON ? sub.toJSON() : sub;
  if(!j || !j.endpoint || !j.keys || !j.keys.p256dh || !j.keys.auth) return null;
  const telefono = (typeof ZTSegnala !== 'undefined' && ZTSegnala.telefonoDa) ? ZTSegnala.telefonoDa(navigator.userAgent, appInstallata()) : null;
  const riga = { user_id: ST.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, telefono };
  let r = await dbq('iscrivere il telefono alle notifiche', supa.from('push_iscrizioni').upsert(riga, { onConflict:'endpoint' }), { silenzioso:true });
  if(r.error && String(r.error.code) === '42501') {
    // l'indirizzo è ancora a nome di chi usava il telefono prima (è uscito senza rete): se ne prende uno nuovo
    try { await sub.unsubscribe(); } catch(e) {}
    sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: _b64urlAByte(chiave) });
    const j2 = sub.toJSON ? sub.toJSON() : sub;
    riga.endpoint = j2.endpoint; riga.p256dh = j2.keys.p256dh; riga.auth = j2.keys.auth;
    r = await dbq('iscrivere il telefono alle notifiche', supa.from('push_iscrizioni').upsert(riga, { onConflict:'endpoint' }), { silenzioso:true });
  }
  if(r.error) return null;
  try { localStorage.setItem(_pushChiave(), riga.endpoint); } catch(e) {}
  return riga;
}

// Toglie l'iscrizione di questo telefono: la riga (con la sessione di chi esce) e l'iscrizione nel browser
async function pushDisiscrivi() {
  try { localStorage.removeItem(_pushChiave()); } catch(e) {}
  if(typeof navigator === 'undefined' || !navigator.serviceWorker || typeof PushManager === 'undefined') return;
  let sub = null;
  try { const reg = await _swRegistrazione(); sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null; } catch(e) { sub = null; }
  if(!sub) return;
  if(ST.user && ST.user.id) await dbq('togliere il telefono dalle notifiche', supa.from('push_iscrizioni').delete().eq('user_id', ST.user.id).eq('endpoint', sub.endpoint), { silenzioso:true });
  try { await sub.unsubscribe(); } catch(e) {}
}

// A ogni apertura: promemoria accesi e permesso dato → l'iscrizione c'è ed è a nome di chi è dentro
async function pushRiallinea() {
  if(!ST.user || !promemoriaAccesi().length || !notifichePossibili().ok || Notification.permission !== 'granted') return;
  try {
    const reg = await _swRegistrazione();
    if(!reg || !reg.pushManager) return;
    const sub = await reg.pushManager.getSubscription();
    let segnato = null; try { segnato = localStorage.getItem(_pushChiave()); } catch(e) {}
    if(sub && segnato === sub.endpoint) return;   // già salvata a nome di questa persona
    await pushIscrivi();
  } catch(e) {}
}

// L'interruttore di un pasto: accende (permesso + iscrizione + profilo) o spegne (profilo; con l'ultimo spento
// anche l'iscrizione). Scrive subito, non al «Salva».
let _promemoriaInCorso = false;
async function togglePromemoria(slot) {
  if(_promemoriaInCorso || !ST.user || !ST.profile || !ZTPromemoria.pastoPer(slot)) return;
  _promemoriaInCorso = true;
  try {
    const accesi = promemoriaAccesi();
    const on = accesi.includes(slot);
    let nuovi;
    if(!on) {
      const p = notifichePossibili();
      if(!p.ok) { _setPromemoriaStato(p.motivo); return; }
      let permesso = Notification.permission;
      if(permesso !== 'granted') { try { permesso = await Notification.requestPermission(); } catch(e) { permesso = 'denied'; } }
      if(permesso !== 'granted') { _setPromemoriaStato('bloccate'); return; }
      let iscritto = null;
      try { iscritto = await pushIscrivi(); } catch(e) { iscritto = null; }
      if(!iscritto) { _setPromemoriaStato('non-iscritto'); return; }
      nuovi = ZTPromemoria.SLOT.filter(s => s === slot || accesi.includes(s));
    } else {
      nuovi = accesi.filter(s => s !== slot);
    }
    const valore = nuovi.length ? nuovi : null;
    const r = await dbq(on ? 'spegnere il promemoria' : 'accendere il promemoria', supa.from('profiles').update({ promemoria_pasti: valore }).eq('id', ST.user.id));
    if(r.error) { _setPromemoriaStato(); return; }
    ST.profile.promemoria_pasti = valore;
    if(typeof saveCache === 'function') saveCache();
    if(!nuovi.length) { try { await pushDisiscrivi(); } catch(e) {} }
    _setPromemoriaStato();
  } finally {
    _promemoriaInCorso = false;
  }
}

// Le tre righe con l'interruttore disegnato (le caselle native sono invisibili nell'app): lo stesso disegno del
// foglio della pausa (Metodo 210)
function _promemoriaRigheHTML() {
  const accesi = promemoriaAccesi();
  return ZTPromemoria.SLOT.map(slot => {
    const p = ZTPromemoria.pastoPer(slot), on = accesi.includes(slot), nome = p.breve, entro = 'entro le ' + p.entro;   // l'ora viene dalla regola, una sola
    return `<button type="button" class="prom-riga" data-slot="${slot}" role="switch" aria-checked="${on}" onclick="togglePromemoria('${slot}')" style="width:100%;display:flex;align-items:center;gap:12px;padding:10px 0;border:none;border-bottom:1px solid var(--s2);background:none;text-align:left;cursor:pointer;">
      <span style="flex:1;min-width:0;">
        <span style="display:block;font-family:var(--font-sans);font-size:15px;font-weight:700;color:var(--t1);">${nome} <span style="font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:.04em;color:${on ? 'var(--acc)' : 'var(--t3)'};">· ${entro.toUpperCase()}</span></span>
      </span>
      <span aria-hidden="true" style="flex-shrink:0;width:50px;height:30px;border-radius:999px;background:${on ? 'var(--acc)' : 'var(--s3)'};position:relative;transition:background .15s;">
        <span style="position:absolute;top:3px;left:${on ? '23px' : '3px'};width:24px;height:24px;border-radius:50%;background:var(--bianco);box-shadow:0 1px 3px rgba(var(--nero-rgb),.25);transition:left .15s;"></span>
      </span>
    </button>`;
  }).join('');
}

// La nota sotto gli interruttori, per `motivo`: cosa manca o cosa è successo. Senza motivo, lo stato.
function _promemoriaNota(motivo) {
  if(motivo === 'installa') return 'Su iPhone gli avvisi arrivano solo con l\'app aggiunta alla schermata Home: in Safari tocca Condividi, poi «Aggiungi alla schermata Home», e riapri l\'app da lì.';
  if(motivo === 'browser') return 'Questo browser non riceve gli avvisi: apri l\'app dal telefono, aggiunta alla schermata Home.';
  if(motivo === 'bloccate') return 'Gli avvisi sono bloccati per questa app: riaccendili nelle impostazioni del telefono (Notifiche › Zona Tracker) e riprova.';
  if(motivo === 'non-iscritto') return 'Non riesco a iscrivere questo telefono adesso: riprova fra un po\', con la rete.';
  const n = promemoriaAccesi().length;
  if(!n) return 'Partono spenti. Accendi quelli che vuoi: ti arriva un avviso solo se a quell\'ora il pasto non è registrato. Niente avvisi nei giorni detox e con la pausa cibo.';
  return 'Accesi. L\'avviso arriva solo se a quell\'ora il pasto manca; se lo registri prima, niente. Niente avvisi nei giorni detox e con la pausa cibo. Su un altro telefono spegni e riaccendi un pasto: così si iscrive anche lui.';
}
function _setPromemoriaStato(motivo) {
  const box = document.getElementById('set-promemoria'), nota = document.getElementById('set-prom-nota');
  if(box) box.innerHTML = _promemoriaRigheHTML();
  if(nota) nota.textContent = _promemoriaNota(motivo);
}

// Il tocco sull'avviso: sw.js manda {apri:'oggi'} alla pagina aperta, o apre la pagina con ?apri=oggi
let _apriRichiesto = null;
try {
  const q = new URLSearchParams(location.search).get('apri');
  if(q === 'oggi') { _apriRichiesto = 'oggi'; const u = new URL(location.href); u.searchParams.delete('apri'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }
} catch(e) {}
function apriDaNotifica() {
  if(!_apriRichiesto) return;
  const t = _apriRichiesto; _apriRichiesto = null;
  setTimeout(() => { if(typeof showPage === 'function') showPage(t); }, 0);
}
try {
  if(typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
    navigator.serviceWorker.addEventListener('message', (e) => { if(e.data && e.data.apri === 'oggi' && ST.user && typeof showPage === 'function') showPage('oggi'); });
  }
} catch(e) {}
