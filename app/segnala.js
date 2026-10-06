// Zona Tracker · «Invia Feedback» (Fondamenta 220 e 230, Ignazio 6 ottobre 2026): da ogni schermata un piccolo insetto in basso
// a destra (con un foglio aperto sale in alto) apre «Invia Feedback» con tre scelte a un tocco, un testo e, se si vuole, uno
// screenshot; l'app aggiunge da sola dove era la persona, la versione e il telefono. Copiato da MB21 (segnala.js, note Pagine 009
// e 014): cambiano solo i nomi dei tab e il nome del modulo (ZTSegnala). Il nome interno resta «segnala»: conta quello che si legge.
// Qui le regole pure (niente rete, niente pagina): le usano zona-tracker.html (foglioSegnala) e tools/banco/prova_segnala.js.
// Le segnalazioni vanno nella tabella `segnalazioni` (migrazione 20261006_220_segnalazioni.sql); le legge la Regia quando
// Ignazio dice «leggi le segnalazioni» (Metodo 140). Nessuna lettura dall'app: una scrittura per segnalazione e basta.
// Fondamenta 230: lo screenshot si sceglie dalle foto, l'app lo riduce sul telefono (lato lungo MAX_LATO, JPEG QUALITA: circa
// 200 KB) e lo carica nel bucket privato `segnalazioni` al percorso `<user_id>/<id>.jpg` PRIMA della riga (migrazione
// 20261006_230_segnalazioni_screenshot.sql); nella riga resta solo il percorso (`immagine`).
(function (radice) {
  const MOTIVI = [['non_funziona', 'Non funziona'], ['non_capisco', 'Non capisco'], ['idea', 'Un’idea']];
  const MAX_TESTO = 1000;
  const MAX_LATO = 1200, QUALITA = 0.7, BUCKET = 'segnalazioni';
  // ST.page dell'app: i quattro tab e le tre pagine del tab Nutrition; impostazioni e onboarding sono fogli, non tab
  const NOMI_PAGINE = { home: 'Home', oggi: 'Nutrition', integratori: 'Nutrition · Integratori', analisi: 'Nutrition · Analisi', piano: 'Nutrition · Piano', training: 'Training', body: 'Body', impostazioni: 'Impostazioni', onboarding: 'Onboarding' };
  const nomeMotivo = k => (MOTIVI.find(m => m[0] === k) || [])[1] || '';
  const nomePagina = p => NOMI_PAGINE[p] || String(p || '');
  const pulisci = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);

  // Dove era la persona: { pagina (il tab), sezione, fogli (i titoli dei fogli aperti, dal primo all'ultimo), vista } → solo i pezzi pieni
  function doveDa(stato) {
    const s = stato || {}, d = {};
    if (s.pagina) d.pagina = String(s.pagina);
    const sezione = pulisci(s.sezione); if (sezione) d.sezione = sezione;
    const fogli = (Array.isArray(s.fogli) ? s.fogli : []).map(pulisci).filter(Boolean).slice(0, 5); if (fogli.length) d.fogli = fogli;
    const vista = pulisci(s.vista); if (vista) d.vista = vista;
    return d;
  }
  // «Body › Misure › Nuova pesata»: per chi legge le segnalazioni
  function descrizioneDove(dove) {
    const d = dove || {};
    return [nomePagina(d.pagina), d.vista, d.sezione, ...(Array.isArray(d.fogli) ? d.fogli : [])].filter(Boolean).join(' › ');
  }
  // Il telefono, in breve, dall'user agent: «iPhone · Safari · app» (app = aggiunta alla schermata Home)
  function telefonoDa(ua, standalone) {
    const u = String(ua || '');
    const cosa = /iPad/.test(u) || (/Macintosh/.test(u) && /Mobile/.test(u)) ? 'iPad' : /iPhone|iPod/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android' : /Macintosh/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Altro';
    const come = /CriOS|Chrome/.test(u) && !/Edg/.test(u) ? 'Chrome' : /Edg/.test(u) ? 'Edge' : /Firefox|FxiOS/.test(u) ? 'Firefox' : /Safari/.test(u) ? 'Safari' : '';
    return [cosa, come, standalone ? 'app' : ''].filter(Boolean).join(' · ');
  }
  // Quanto grande salvare lo screenshot: il lato lungo al massimo MAX_LATO, proporzioni uguali; una foto già piccola resta com'è
  function misuraRidotta(larghezza, altezza, max = MAX_LATO) {
    const w = Math.max(1, Math.round(larghezza || 0)), h = Math.max(1, Math.round(altezza || 0));
    const lato = Math.max(w, h);
    if (lato <= max) return { w, h };
    const f = max / lato;
    return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
  }
  // Dove sta lo screenshot nel bucket: la cartella è chi segnala (le regole del bucket guardano questa cartella), il file è l'id della segnalazione
  const percorsoImmagine = (userId, id) => userId && id ? `${userId}/${id}.jpg` : null;
  // Un id nuovo (uuid v4) fatto qui, così l'immagine si carica prima della riga con lo stesso nome; `casuale` = funzione che dà 16 byte (0-255)
  function nuovoId(casuale) {
    const b = Array.from(casuale ? casuale(16) : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)), x => x & 255);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  // La riga da salvare; null se manca chi segnala o il motivo non è uno dei tre. Il testo è facoltativo (al massimo MAX_TESTO caratteri);
  // `id` e `immagine` (il percorso nel bucket) solo se ci sono
  function riga({ id, userId, motivo, testo, dove, versione, telefono, immagine } = {}) {
    if (!userId || !MOTIVI.some(m => m[0] === motivo)) return null;
    const t = String(testo || '').trim().slice(0, MAX_TESTO);
    const r = { user_id: userId, motivo, testo: t || null, dove: dove && typeof dove === 'object' ? dove : {}, versione: versione || null, telefono: telefono || null };
    if (id) r.id = id;
    if (immagine) r.immagine = immagine;
    return r;
  }
  const api = { MOTIVI, MAX_TESTO, MAX_LATO, QUALITA, BUCKET, NOMI_PAGINE, nomeMotivo, nomePagina, doveDa, descrizioneDove, telefonoDa, misuraRidotta, percorsoImmagine, nuovoId, riga };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.ZTSegnala = api;
})(this);
