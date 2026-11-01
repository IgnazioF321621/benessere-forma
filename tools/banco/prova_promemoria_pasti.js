// Notifiche 170 (1 novembre 2026): il promemoria del pasto non registrato.
// Ignazio ha scelto le ore fisse: colazione entro le 10, pranzo entro le 15, cena entro le 22 (Roma); l'avviso
// arriva sul telefono (Web Push dal Worker). Gli avvisi partono spenti e ognuno li accende da sé.
// Parte 1: la regola pura (shared/promemoria.js), senza jsdom.
// Parte 2: l'app vera: i tre interruttori nelle Impostazioni › Cibo, il permesso, l'iscrizione del telefono
//          (push_iscrizioni), la scelta scritta subito nel profilo, lo spegnimento, l'iPhone senza l'app
//          installata, le notifiche bloccate, il Worker senza chiavi, il logout, il tocco sull'avviso.
//   node tools/banco/prova_promemoria_pasti.js
process.env.TZ = 'Europe/Rome';
const P = require('../../shared/promemoria.js');
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const G = '2026-11-02';
const prof = (acc, extra) => Object.assign({ promemoria_pasti: acc }, extra || {});
const slots = (xs) => xs.map(p => p.slot);

// ── Parte 1: la regola ──
{
  atteso('regola · tre pasti, tre ore', P.PASTI.map(p => p.slot + '@' + p.entro), ['colazione@10', 'pranzo@15', 'cena@22']);
  atteso('regola · accesi: nulla, vuoto, rotto, in ordine canonico, sconosciuti fuori', [P.accesi({}), P.accesi(prof([])), P.accesi(prof('cena')), P.accesi(prof(['cena', 'colazione'])), P.accesi(prof(['merenda', 'pranzo']))], [[], [], [], ['colazione', 'cena'], ['pranzo']]);
  const pasti = [{ date: G, slot: 'snack_mattina' }, { date: G, slot: 'pranzo' }, { date: '2026-11-01', slot: 'cena' }, { date: G, slot: 'extra' }, { date: G, slot: 'snack' }];
  atteso('regola · registrati: spuntini, extra e ieri non contano', P.registrati(pasti, G), ['pranzo']);
  const tutti = prof(['colazione', 'pranzo', 'cena']);
  atteso('regola · alle 10 manca la colazione (lo spuntino non la vale)', slots(P.pastiMancanti({ pasti, giorno: G, ora: 10, profile: tutti })), ['colazione']);
  atteso('regola · alle 15 il pranzo c\'è: manca solo la colazione; pastoMancante alle 15 è nullo', [slots(P.pastiMancanti({ pasti, giorno: G, ora: 15, profile: tutti })), P.pastoMancante({ pasti, giorno: G, ora: 15, profile: tutti })], [['colazione'], null]);
  atteso('regola · alle 22 manca la cena: pastoMancante = cena', P.pastoMancante({ pasti, giorno: G, ora: 22, profile: tutti }).slot, 'cena');
  atteso('regola · alle 9 niente, alle 11 niente (l\'ora è esatta)', [P.pastoMancante({ pasti: [], giorno: G, ora: 9, profile: tutti }), P.pastoMancante({ pasti: [], giorno: G, ora: 11, profile: tutti })], [null, null]);
  atteso('regola · solo pranzo acceso: alle 10 niente', P.pastoMancante({ pasti: [], giorno: G, ora: 10, profile: prof(['pranzo']) }), null);
  atteso('regola · spenti (nulla) → niente', P.pastiMancanti({ pasti: [], giorno: G, ora: 22, profile: {} }), []);
  atteso('regola · digiuno → niente', P.pastiMancanti({ pasti: [], giorno: G, ora: 10, profile: tutti, digiuno: true }), []);
  atteso('regola · pausa cibo → niente; pausa solo allenamento → avvisa', [P.pastiMancanti({ pasti: [], giorno: G, ora: 10, profile: prof(['colazione'], { pausa_inizio: '2026-11-01', pausa_fine: '2026-11-05' }) }), slots(P.pastiMancanti({ pasti: [], giorno: G, ora: 10, profile: prof(['colazione'], { pausa_inizio: '2026-11-01', pausa_fine: '2026-11-05', pausa_moduli: ['allenamento'] }) }))], [[], ['colazione']]);
  atteso('regola · pausa finita ieri → avvisa', slots(P.pastiMancanti({ pasti: [], giorno: G, ora: 10, profile: prof(['colazione'], { pausa_inizio: '2026-10-20', pausa_fine: '2026-11-01' }) })), ['colazione']);
  atteso('regola · ora non numerica → niente', P.pastiMancanti({ pasti: [], giorno: G, ora: 'x', profile: tutti }), []);
  const t = P.testoAvviso('colazione', 'Pirsi');
  atteso('testo · titolo col nome del coach, corpo breve in prima persona, mai «errore»', [t.titolo, /^Non vedo ancora la colazione di oggi\./.test(t.corpo), /errore/i.test(t.corpo + t.titolo), t.corpo.length < 110], ['Pirsi · Colazione', true, false, true]);
  atteso('testo · pranzo al maschile, cena al femminile', [P.testoAvviso('pranzo', 'X').corpo.includes('fatto, registralo'), P.testoAvviso('cena', 'X').corpo.includes('fatta, registrala')], [true, true]);
  atteso('testo · pasto sconosciuto → nullo', P.testoAvviso('merenda', 'X'), null);
  atteso('ora di Roma · 2 nov 09:00 UTC = 10 (CET), 1 lug 08:00 UTC = 10 (CEST), mezzanotte UTC = giorno dopo', [P.oraRoma('2026-11-02T09:00:00Z'), P.oraRoma('2026-07-01T08:00:00Z').ora, P.oraRoma('2026-11-02T23:30:00Z').giorno], [{ ora: 10, giorno: G }, 10, '2026-11-03']);
}

// ── Parte 2: l'app ──
const U = 'u1';
const CHIAVE = 'B' + 'A'.repeat(86);   // 87 caratteri base64url: 65 byte, come una chiave VAPID vera
function fixture(promemoria){
  return {
    __sessione: { user: { id: U, email: 'a@b.it' } },
    profiles: [{ id: U, first_name: 'A', m2_skipped: true, unit: 'kg', obiettivo: 'mantenimento', target_kcal: 2000, target_protein: 120, target_carbs: 200, target_fat: 60, weight_kg: 72, promemoria_pasti: promemoria || null }],
    meals: [], meal_items: [], fasting_days: [], supplements: [], supplements_log: [], supplement_packages: [], supplement_package_items: [], weight_logs: [], body_logs: [],
    body_checks: [], body_measurements: [], workouts: [], training_logs: [], training_notes: [], schede_utente: [], blood_tests: [], daily_log: [], rilevazioni: [], coach_proposals: [], weekly_pictures: [], fitdays_letture: [], push_iscrizioni: [],
  };
}
// Il telefono finto: Notification, PushManager, service worker con pushManager; ogni subscribe dà un indirizzo nuovo
function telefono(win, { permesso = 'default', risposta = 'granted', ua, installata = false, pushCe = true } = {}){
  const st = { subs: [], unsubscribed: 0, n: 0, richieste: 0 };
  const nuova = (opt) => { st.n++; const s = { endpoint: 'https://web.push.apple.com/ep' + st.n, options: { applicationServerKey: opt && opt.applicationServerKey }, toJSON(){ return { endpoint: s.endpoint, keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } }; }, async unsubscribe(){ st.unsubscribed++; st.sub = null; return true; } }; st.sub = s; st.subs.push(s); return s; };
  const reg = { pushManager: { async getSubscription(){ return st.sub || null; }, async subscribe(opt){ if(st.alSubscribe) st.alSubscribe(); return nuova(opt); } } };
  win.navigator.serviceWorker = { ready: new Promise(() => {}), async getRegistration(){ return st.senzaSw ? null : reg; }, addEventListener(){} };   // `ready` non si risolve mai: l'app non deve usarla
  if(pushCe) win.PushManager = function(){}; else delete win.PushManager;
  win.Notification = { permission: permesso, async requestPermission(){ st.richieste++; win.Notification.permission = risposta; return risposta; } };
  if(ua) Object.defineProperty(win.navigator, 'userAgent', { value: ua, configurable: true });
  win.matchMedia = () => ({ matches: installata, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  return st;
}
const chiaveDalWorker = (win, { ok = true } = {}) => { win.fetch = async (url) => { if(String(url).endsWith('/push-chiave')) return { ok, status: ok ? 200 : 404, json: async () => ({ chiave: CHIAVE }) }; return { ok: false, status: 404, json: async () => ({}) }; }; };
const scritture = (supa, tabella, op) => supa._calls.filter(c => c.table === tabella && (!op || c.op === op));
// le scritture del profilo che riguardano i promemoria (applyProfile ne fa una sua, sui macro)
const promUpdates = (supa) => supa._calls.filter(c => c.table === 'profiles' && c.op === 'update' && c.payload && 'promemoria_pasti' in c.payload);
const interruttori = (win) => [...win.document.querySelectorAll('#set-promemoria [role=switch]')].map(b => b.dataset.slot + ':' + b.getAttribute('aria-checked'));
const nota = (win) => win.document.getElementById('set-prom-nota').textContent;
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const NOW = { now: '2026-11-02T09:30:00' };
// La pagina è partita: persona e profilo in ST come dopo l'accesso (come prova_training_540), poi un giro di eventi
async function pronta(b, tables){ await b.avviato; const ST = b.win.eval('ST'); ST.user = { id: U, email: 'a@b.it' }; ST.profile = tables.profiles[0]; b.win.applyProfile(ST.profile); await attendi(30); }

(async () => {
  // 2a. Impostazioni: tre interruttori spenti, la nota dice che partono spenti
  {
    const tables = fixture(null);
    const b = boot(tables, NOW);
    const { win, supa } = b; await pronta(b, tables);
    win.openSettingsModal();
    atteso('app · tre interruttori, tutti spenti', interruttori(win), ['colazione:false', 'pranzo:false', 'cena:false']);
    atteso('app · la nota: partono spenti, niente «errore»', [/Partono spenti/.test(nota(win)), /errore/i.test(nota(win))], [true, false]);

    // 2b. accendere la colazione: permesso chiesto, telefono iscritto, profilo scritto subito
    const tel = telefono(win); chiaveDalWorker(win);
    await win.togglePromemoria('colazione');
    atteso('accendi · il permesso è stato chiesto una volta, il telefono iscritto con la chiave del Worker', [tel.richieste, tel.n, tel.sub && tel.sub.options.applicationServerKey instanceof win.Uint8Array, tel.sub && tel.sub.options.applicationServerKey.length], [1, 1, true, 65]);
    const isc = scritture(supa, 'push_iscrizioni', 'upsert');
    atteso('accendi · push_iscrizioni: upsert sull\'endpoint, a nome della persona, con le chiavi del browser', [isc.length, isc[0].upsertOpts.onConflict, isc[0].payload.user_id, isc[0].payload.endpoint, isc[0].payload.p256dh.length, isc[0].payload.auth.length], [1, 'endpoint', U, 'https://web.push.apple.com/ep1', 87, 22]);
    const up = promUpdates(supa);
    atteso('accendi · il profilo scritto subito: [colazione]', [up.length, up[0].payload, up[0].filters], [1, { promemoria_pasti: ['colazione'] }, [['eq', 'id', U]]]);
    atteso('accendi · interruttore acceso, ST.profile aggiornato, marcatore sul telefono', [interruttori(win)[0], win.eval('ST').profile.promemoria_pasti, win.localStorage.getItem('zt_push_' + U)], ['colazione:true', ['colazione'], 'https://web.push.apple.com/ep1']);
    atteso('accendi · la nota dice che sono accesi', /^Accesi\./.test(nota(win)), true);

    // 2c. la cena: niente nuovo permesso, nessuna nuova iscrizione, profilo in ordine canonico
    await win.togglePromemoria('cena');
    atteso('seconda · permesso non richiesto di nuovo, iscrizione una sola, profilo [colazione, cena]', [tel.richieste, tel.n, scritture(supa, 'push_iscrizioni', 'upsert').length, promUpdates(supa).pop().payload.promemoria_pasti], [1, 1, 2, ['colazione', 'cena']]);

    // 2d. spegnere la colazione: resta la cena, l'iscrizione resta
    await win.togglePromemoria('colazione');
    atteso('spegni uno · profilo [cena], nessuna cancellazione', [promUpdates(supa).pop().payload.promemoria_pasti, scritture(supa, 'push_iscrizioni', 'delete').length, tel.unsubscribed], [['cena'], 0, 0]);
    // 2e. spegnere l'ultimo: profilo a nulla, la riga del telefono tolta, il browser disiscritto
    await win.togglePromemoria('cena');
    const del = scritture(supa, 'push_iscrizioni', 'delete');
    atteso('spegni l\'ultimo · profilo nullo, riga tolta per persona ed endpoint, browser disiscritto, marcatore via', [promUpdates(supa).pop().payload.promemoria_pasti, del.length, del[0].filters, tel.unsubscribed, win.localStorage.getItem('zt_push_' + U)], [null, 1, [['eq', 'user_id', U], ['eq', 'endpoint', 'https://web.push.apple.com/ep1']], 1, null]);
    atteso('spegni l\'ultimo · tutti spenti a schermo', interruttori(win), ['colazione:false', 'pranzo:false', 'cena:false']);

    // 2f. il profilo che non si scrive: l'interruttore resta com'era, l'iscrizione no
    tables.__rifiuta = { profiles: { code: '42501', message: 'permission denied' } };
    const prima = scritture(supa, 'push_iscrizioni', 'upsert').length;
    await win.togglePromemoria('pranzo');
    atteso('profilo rifiutato · interruttore spento, ST.profile intatto', [interruttori(win)[1], win.eval('ST').profile.promemoria_pasti, scritture(supa, 'push_iscrizioni', 'upsert').length > prima], ['pranzo:false', null, true]);
    delete tables.__rifiuta;
  }

  // 2g. iPhone senza l'app installata: niente permesso, niente scritture, la nota spiega
  {
    const tables = fixture(null); const b = boot(tables, NOW);
    const { win, supa } = b; await pronta(b, tables);
    win.openSettingsModal();
    const tel = telefono(win, { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', pushCe: false });
    await win.togglePromemoria('colazione');
    atteso('iPhone non installata · spento, nessuna scrittura, nota «schermata Home»', [interruttori(win)[0], tel.richieste, promUpdates(supa).length, /schermata Home/.test(nota(win))], ['colazione:false', 0, 0, true]);
    // 2h. notifiche bloccate dal telefono
    telefono(win, { permesso: 'denied' });
    await win.togglePromemoria('colazione');
    atteso('bloccate · spento, nessuna scrittura, nota «impostazioni del telefono»', [interruttori(win)[0], promUpdates(supa).length, /impostazioni del telefono/.test(nota(win))], ['colazione:false', 0, true]);
    // 2i. la persona dice no al permesso
    const t2 = telefono(win, { risposta: 'denied' });
    await win.togglePromemoria('colazione');
    atteso('rifiuta il permesso · spento, chiesto una volta, nessuna scrittura', [interruttori(win)[0], t2.richieste, promUpdates(supa).length], ['colazione:false', 1, 0]);
    // 2j. il Worker senza chiavi: niente iscrizione, niente profilo, nota «riprova»
    telefono(win); chiaveDalWorker(win, { ok: false });
    await win.togglePromemoria('colazione');
    atteso('Worker senza chiavi · spento, nessuna scrittura, nota «riprova»', [interruttori(win)[0], promUpdates(supa).length, scritture(supa, 'push_iscrizioni').length, /riprova/.test(nota(win))], ['colazione:false', 0, 0, true]);
  }

  // 2k. il riallineamento all'apertura: promemoria accesi, permesso dato, nessun marcatore → il telefono si iscrive da solo
  {
    const tables = fixture(['pranzo']); const b = boot(tables, NOW);
    const { win, supa } = b; await pronta(b, tables);
    const tel = telefono(win, { permesso: 'granted' }); chiaveDalWorker(win);
    await win.pushRiallinea();
    atteso('riallinea · iscritto e salvato senza chiedere niente', [tel.richieste, tel.n, scritture(supa, 'push_iscrizioni', 'upsert').length, win.localStorage.getItem('zt_push_' + U)], [0, 1, 1, 'https://web.push.apple.com/ep1']);
    await win.pushRiallinea();
    atteso('riallinea · la seconda volta non riscrive (marcatore uguale all\'endpoint)', scritture(supa, 'push_iscrizioni', 'upsert').length, 1);
    // la chiave del Worker è cambiata: l'iscrizione vecchia si rifà
    win.localStorage.removeItem('zt_push_' + U);
    tel.sub.options.applicationServerKey = new win.Uint8Array(65);
    await win.pushRiallinea();
    atteso('riallinea · chiave del Worker diversa → disiscritto e iscritto di nuovo (ep2)', [tel.unsubscribed, tel.n, scritture(supa, 'push_iscrizioni', 'upsert').pop().payload.endpoint], [1, 2, 'https://web.push.apple.com/ep2']);
    // l'endpoint ancora a nome di un altro (42501 sull'upsert): se ne prende uno nuovo
    win.localStorage.removeItem('zt_push_' + U);
    tables.__rifiuta = { push_iscrizioni: { code: '42501', message: 'new row violates row-level security policy' } };
    tel.alSubscribe = () => { delete tables.__rifiuta; tel.alSubscribe = null; };   // l'indirizzo nuovo non è più di nessuno
    const upPrima = scritture(supa, 'push_iscrizioni', 'upsert').length;
    await win.pushRiallinea();
    atteso('riallinea · endpoint di un altro (42501) → disiscritto, nuovo endpoint, seconda scrittura', [scritture(supa, 'push_iscrizioni', 'upsert').length - upPrima, tel.unsubscribed, tel.n, win.localStorage.getItem('zt_push_' + U)], [2, 2, 3, 'https://web.push.apple.com/ep3']);
    // spenti nel profilo: il riallineamento non fa niente
    win.eval('ST').profile.promemoria_pasti = null;
    const n = supa._calls.length;
    await win.pushRiallinea();
    atteso('riallinea · promemoria spenti → nessuna chiamata', supa._calls.length, n);
  }

  // 2l. il logout toglie l'iscrizione di questo telefono, prima di uscire (serve la sessione)
  {
    const tables = fixture(['cena']); const b = boot(tables, NOW);
    const { win, supa } = b; await pronta(b, tables);
    const tel = telefono(win, { permesso: 'granted' }); chiaveDalWorker(win);
    await win.pushRiallinea();
    win.chiediConferma = async () => true;
    await win.logout();
    const del = scritture(supa, 'push_iscrizioni', 'delete');
    atteso('logout · riga tolta (persona + endpoint), browser disiscritto, marcatore via, schermata di accesso', [del.length, del[0].filters, tel.unsubscribed, win.localStorage.getItem('zt_push_' + U), ['auth-screen', 'privacy-screen'].some(id => win.document.getElementById(id).classList.contains('visible'))], [1, [['eq', 'user_id', U], ['eq', 'endpoint', 'https://web.push.apple.com/ep1']], 1, null, true]);
  }

  // 2l-bis. nessun service worker registrato: il logout non resta appeso e non scrive niente
  {
    const tables = fixture(['cena']); const b = boot(tables, NOW);
    const { win, supa } = b; await pronta(b, tables);
    const tel = telefono(win, { permesso: 'granted' }); tel.senzaSw = true; chiaveDalWorker(win);
    await win.pushRiallinea();
    atteso('senza sw · il riallineamento non iscrive niente', [tel.n, scritture(supa, 'push_iscrizioni').length], [0, 0]);
    win.chiediConferma = async () => true;
    const esito = await Promise.race([win.logout().then(() => 'uscito'), attendi(1500).then(() => 'appeso')]);
    atteso('senza sw · «Esci» esce (niente attesa infinita su serviceWorker.ready)', [esito, scritture(supa, 'push_iscrizioni', 'delete').length], ['uscito', 0]);
  }

  // 2m. il tocco sull'avviso: la pagina si apre sul tab Nutrition
  {
    const tables = fixture(null); const b = boot(tables, NOW);
    const { win } = b; await pronta(b, tables);
    win.showPage('home');
    atteso('tocco · prima: Home', win.eval('ST').page, 'home');
    win.eval("_apriRichiesto = 'oggi'");
    win.apriDaNotifica(); await attendi(20);
    atteso('tocco · dopo apriDaNotifica: tab Nutrition, richiesta consumata', [win.eval('ST').page, win.eval('_apriRichiesto')], ['oggi', null]);
  }

  // 2m-bis. le etichette degli interruttori vengono dalla regola
  {
    const tables = fixture(null); const b = boot(tables, NOW);
    const { win } = b; await pronta(b, tables);
    win.openSettingsModal();
    atteso('etichette · le ore sono quelle di ZTPromemoria.PASTI', [...win.document.querySelectorAll('#set-promemoria [role=switch]')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), ['Colazione · ENTRO LE 10', 'Pranzo · ENTRO LE 15', 'Cena · ENTRO LE 22']);
  }

  // 2n. «Scarica i miei dati» include le due tabelle nuove
  {
    const tables = fixture(['cena']); const b = boot(tables, NOW);
    const { win } = b; await pronta(b, tables);
    atteso('dati · le due tabelle nuove nell\'elenco dell\'esportazione', win.eval('MIEI_DATI_TABELLE').filter(t => /push_iscrizioni|promemoria_inviati/.test(t)), ['push_iscrizioni', 'promemoria_inviati']);
  }

  console.log(ko ? `\n${ko} controlli KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
