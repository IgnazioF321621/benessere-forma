// Fondamenta 220 e 230 — il tasto «Invia Feedback» (era «Segnala»): un piccolo insetto su ogni schermata, da quando si è dentro;
// in basso a destra, con un foglio aperto in alto a destra. Prima le regole pure di app/segnala.js (copiate da MB21), poi l'app vera
// nel banco: l'insetto compare dopo l'accesso e non prima, si chiama «Invia Feedback», segue i fogli, il foglio si apre anche sopra
// un altro foglio (e sopra una conferma), «Invia» è spento senza motivo, la riga salvata ha dove/versione/telefono, lo screenshot
// ridotto si carica prima della riga nel bucket privato e si toglie se la riga non parte, senza rete «Non inviata» e niente in coda,
// mai la parola «errore».
//   node tools/banco/prova_segnala.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const REPO = path.join(__dirname, '..', '..');
const S = require(path.join(REPO, 'app', 'segnala.js'));
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(74), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const U = 'u1', OGGI = '2026-10-06';

// ── 1. le regole pure ──
console.log('regole pure (app/segnala.js)');
atteso('tre motivi, a un tocco, con il nome che si legge', [S.MOTIVI.map(m => m[0]), S.nomeMotivo('idea'), S.nomeMotivo('x')], [['non_funziona', 'non_capisco', 'idea'], 'Un’idea', '']);
atteso('i tab di Zona Tracker hanno un nome', ['home', 'oggi', 'training', 'body', 'integratori', 'impostazioni'].map(S.nomePagina), ['Home', 'Nutrition', 'Training', 'Body', 'Nutrition · Integratori', 'Impostazioni']);
atteso('dove: solo i pezzi pieni, i titoli dei fogli puliti, al massimo 5',
  [S.doveDa({ pagina: 'body', sezione: ' misure ', fogli: ['', ' Aggiorna  peso ', null], vista: '' }), S.doveDa({ pagina: 'home' }), S.doveDa(null), S.doveDa({ fogli: ['1', '2', '3', '4', '5', '6', '7'] }).fogli.length],
  [{ pagina: 'body', sezione: 'misure', fogli: ['Aggiorna peso'] }, { pagina: 'home' }, {}, 5]);
atteso('la descrizione per chi legge: pagina › vista › sezione › fogli',
  [S.descrizioneDove({ pagina: 'body', sezione: 'misure', fogli: ['Aggiorna peso'] }), S.descrizioneDove({ pagina: 'boh' }), S.descrizioneDove(null)],
  ['Body › misure › Aggiorna peso', 'boh', '']);
atteso('il telefono in breve dall\'user agent', [
  S.telefonoDa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', true),
  S.telefonoDa('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', false),
  S.telefonoDa('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36', false),
  S.telefonoDa('', false)], ['iPhone · Safari · app', 'iPad · Safari', 'Android · Chrome', 'Altro']);
const r = S.riga({ userId: U, motivo: 'idea', testo: '  Metterei il bottone più in alto  ', dove: { pagina: 'home' }, versione: '2026.10.06 · 00:10', telefono: 'iPhone · Safari · app' });
atteso('la riga da salvare: testo pulito, dove, versione, telefono', r, { user_id: U, motivo: 'idea', testo: 'Metterei il bottone più in alto', dove: { pagina: 'home' }, versione: '2026.10.06 · 00:10', telefono: 'iPhone · Safari · app' });
atteso('senza testo → null; senza dove → {}; motivo fuori dai tre o senza persona → niente riga',
  [S.riga({ userId: U, motivo: 'non_capisco' }).testo, S.riga({ userId: U, motivo: 'non_capisco' }).dove, S.riga({ userId: U, motivo: 'altro' }), S.riga({ motivo: 'idea' }), S.riga()], [null, {}, null, null, null]);
atteso('il testo si ferma a 1000 caratteri', S.riga({ userId: U, motivo: 'idea', testo: 'a'.repeat(2000) }).testo.length, S.MAX_TESTO);
atteso('screenshot · lato lungo al massimo 1200, proporzioni uguali, le piccole restano com\'erano',
  [S.MAX_LATO, S.QUALITA, S.BUCKET, S.misuraRidotta(2400, 1200), S.misuraRidotta(1170, 2532), S.misuraRidotta(800, 600), S.misuraRidotta(1200, 1200), S.misuraRidotta(0, 0)],
  [1200, 0.7, 'segnalazioni', { w:1200, h:600 }, { w:555, h:1200 }, { w:800, h:600 }, { w:1200, h:1200 }, { w:1, h:1 }]);
atteso('screenshot · percorso nel bucket <chi>/<id>.jpg (la cartella è la persona), niente senza uno dei due',
  [S.percorsoImmagine(U, 'abc'), S.percorsoImmagine(null, 'abc'), S.percorsoImmagine(U, null)], ['u1/abc.jpg', null, null]);
const fisso = S.nuovoId(() => Array(16).fill(0));
atteso('id nuovo · uuid v4 (versione 4, variante 8-b), ogni volta diverso', [fisso, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(S.nuovoId()), S.nuovoId() !== S.nuovoId()],
  ['00000000-0000-4000-8000-000000000000', true, true]);
atteso('riga con screenshot · l\'id scelto prima e il percorso; senza, nessuno dei due campi',
  [S.riga({ id:'i1', userId: U, motivo:'idea', immagine:'u1/i1.jpg' }), 'id' in S.riga({ userId: U, motivo:'idea' }), 'immagine' in S.riga({ userId: U, motivo:'idea' })],
  [{ user_id:U, motivo:'idea', testo:null, dove:{}, versione:null, telefono:null, id:'i1', immagine:'u1/i1.jpg' }, false, false]);

// ── 2. l'app vera ──
async function nuovo(conSessione) {
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], supplements_log:[], weight_logs:[], supplements:[], segnalazioni:[] };
  if(conSessione) t.__sessione = { user:{ id:U, email:'ignazio.f@me.com' } };
  const b = boot(t, { now:OGGI + 'T12:00:00' });
  await b.avviato;
  const d = b.win.document;
  const ST = b.win.eval('ST');
  const insetto = () => d.getElementById('segnala');
  const foglio = () => d.getElementById('sg-foglio');
  const motivo = (k) => foglio().querySelector(`[data-motivo="${k}"]`);
  const invia = () => foglio().querySelector('#sg-si');
  const toast = () => d.getElementById('toast').textContent;
  return { ...b, d, t, ST, insetto, foglio, motivo, invia, toast };
}
(async () => {
  console.log('\nl\'app vera');
  // prima dell'accesso: niente insetto
  {
    const a = await nuovo(false);
    await attendi(30);
    atteso('prima dell\'accesso · app non visibile (informativa o accesso), insetto nascosto', [a.d.getElementById('app').classList.contains('visible'), a.d.getElementById('privacy-screen').classList.contains('visible') || a.d.getElementById('auth-screen').classList.contains('visible'), a.insetto().hidden], [false, true, true]);
    a.win.foglioSegnala();
    atteso('prima dell\'accesso · il foglio non si apre (nessuna persona)', !!a.foglio(), false);
  }
  // dentro l'app
  const a = await nuovo(true);
  await attendi(80);
  a.ST.user = { id:U, email:'ignazio.f@me.com' }; a.ST.profile = { id:U, first_name:'Ignazio' };
  a.win.showScreen('app');
  atteso('dentro l\'app · insetto visibile, con il suo nome e l\'icona', [a.insetto().hidden, a.insetto().getAttribute('aria-label'), !!a.insetto().querySelector('svg')], [false, 'Invia Feedback', true]);
  atteso('il nome che si legge · «Invia Feedback» sul bottone (etichetta e titolo), mai «Segnala»', [a.insetto().getAttribute('title'), a.insetto().textContent.trim(), /segnala/i.test(a.insetto().getAttribute('aria-label') + a.insetto().getAttribute('title'))], ['Invia Feedback', '', false]);
  const css = fs.readFileSync(path.join(REPO, 'app', 'stile.css'), 'utf8');
  const z = (sel) => { const m = new RegExp(sel.replace(/\./g, '\\.') + '\\{[^}]*z-index:(\\d+)').exec(css); return m ? +m[1] : null; };
  atteso('stile · z-index: insetto sopra il foglio più alto (2100) e sotto il toast (9000)', [z('.segnala-bottone') > 2100, z('.segnala-bottone') < z('.toast'), z('.sg-overlay') > z('.foglio-overlay'), z('.segnala-bottone') > z('.sg-overlay')], [true, true, true, true]);
  const regola = (sel) => { const m = new RegExp('(?:^|\\n)' + sel.replace(/[.\[\]()]/g, '\\$&') + '\\{([^}]*)\\}').exec(css); return m ? m[1] : ''; };
  atteso('stile · in basso a destra sopra la barra dei tab; con un foglio aperto in alto a destra', [/bottom:calc\(env\(safe-area-inset-bottom\) \+ 16px\)/.test(regola('.segnala-bottone')), /right:8px/.test(regola('.segnala-bottone')), /max-width:768px\)\{\.segnala-bottone\{bottom:calc\(env\(safe-area-inset-bottom\) \+ 72px\)/.test(css), /bottom:auto;top:calc\(env\(safe-area-inset-top\) \+ 8px\)/.test(regola('.segnala-bottone.in-foglio'))], [true, true, true, true]);
  atteso('stile · l\'angolo in alto non è più occupato: niente padding-right su intestazione e Home', [/\n\.h-inner\{[^}]*padding-right/.test(css), /\n\.home-v2-header\{[^}]*padding-right/.test(css), /\.m2-modal-photo-header\{[^}]*padding-right/.test(css)], [false, false, false]);
  atteso('stile · i fogli a schermo intero spostano a sinistra il tasto che sta nell\'angolo (Salva, Registra, selezionati, tre puntini, ×)', [/\.pkg-editor-header,\.cextra-header,\.daydetail-header,\.catalog-v3-header\{padding-right:50px;\}/.test(css), /\.pianov4-day-close\{[^}]*right:48px/.test(css)], [true, true]);

  // il foglio: Invia spento finché non si sceglie il motivo
  a.win.showPage('home');
  a.insetto().click();
  await attendi(5);
  atteso('tocco sull\'insetto · il foglio si apre con la domanda, tre scelte, il testo, Invia spento', [!!a.foglio(), a.foglio().querySelector('h3').textContent, a.foglio().querySelectorAll('[data-motivo]').length, !!a.foglio().querySelector('#sg-testo'), a.invia().disabled], [true, 'Invia Feedback', 3, true, true]);
  atteso('il foglio dice dove sei e la versione', a.foglio().querySelector('.sg-dove').textContent, 'Dove sei: Home · versione ' + a.win.eval('APP_VERSION'));
  a.insetto().click();
  atteso('un secondo tocco non apre un secondo foglio', a.d.querySelectorAll('#sg-foglio').length, 1);
  a.motivo('idea').click();
  atteso('scelto il motivo · Invia acceso, la scelta evidenziata', [a.invia().disabled, a.motivo('idea').classList.contains('scelto'), a.motivo('non_funziona').classList.contains('scelto')], [false, true, false]);
  a.foglio().querySelector('#sg-testo').value = '  Metterei il bottone più in alto  ';
  a.invia().click();
  await attendi(20);
  const riga = a.t.segnalazioni[0] || {};
  atteso('Invia · una riga in segnalazioni, a nome della persona, con motivo e testo pulito', [a.t.segnalazioni.length, riga.user_id, riga.motivo, riga.testo], [1, U, 'idea', 'Metterei il bottone più in alto']);
  atteso('Invia · la riga dice dove, la versione e il telefono', [riga.dove, riga.versione === a.win.eval('APP_VERSION'), typeof riga.telefono === 'string' && riga.telefono.length > 0], [{ pagina:'home' }, true, true]);
  atteso('Invia · foglio chiuso, «Grazie, l\'abbiamo ricevuta»', [!!a.foglio(), a.toast()], [false, '🙏 Grazie, l\'abbiamo ricevuta']);

  // sopra un altro foglio: la pesata, dal tab Body
  a.win.showPage('body'); a.ST.bodyTab = 'misure';
  a.d.getElementById('weight-modal').style.display = 'flex';
  a.win.foglioSegnala(); await attendi(5);
  atteso('sopra la pesata · il foglio si apre lo stesso e sa in che foglio eri', [!!a.foglio(), a.foglio().querySelector('.sg-dove').textContent.split(' · versione')[0]], [true, 'Dove sei: Body › misure › ⚖️ Aggiorna peso']);
  a.motivo('non_capisco').click(); a.invia().click(); await attendi(20);
  atteso('sopra la pesata · la riga salvata porta il foglio aperto e la sezione', [a.t.segnalazioni.length, a.t.segnalazioni[1].dove], [2, { pagina:'body', sezione:'misure', fogli:['⚖️ Aggiorna peso'] }]);
  a.d.getElementById('weight-modal').style.display = 'none';

  // l'insetto segue i fogli: con un foglio aperto sale (.in-foglio), chiuso il foglio torna in basso; il foglio del feedback da solo non lo fa salire
  const fotogramma = () => attendi(60);
  a.d.getElementById('weight-modal').style.display = 'flex'; await fotogramma();
  atteso('foglio aperto (la pesata) · l\'insetto sale in alto a destra', a.insetto().classList.contains('in-foglio'), true);
  a.d.getElementById('weight-modal').style.display = 'none'; await fotogramma();
  atteso('foglio chiuso · l\'insetto torna in basso', a.insetto().classList.contains('in-foglio'), false);
  const pcs = a.win.chiediConferma('Eliminare questo pasto?'); await fotogramma();
  atteso('una conferma è un foglio · l\'insetto sale', a.insetto().classList.contains('in-foglio'), true);
  [...a.d.querySelectorAll('.foglio-overlay button')].find(x => x.textContent === 'Annulla').click(); await pcs; await fotogramma();
  atteso('conferma chiusa · l\'insetto torna in basso', a.insetto().classList.contains('in-foglio'), false);
  a.win.foglioSegnala(); await fotogramma();
  atteso('il foglio del feedback da solo non fa salire l\'insetto', [!!a.foglio(), a.insetto().classList.contains('in-foglio')], [true, false]);
  atteso('il foglio si chiama «Invia Feedback»; «Cosa non va, o cosa proponi?» non compare più', [a.foglio().querySelector('h3').textContent, a.foglio().textContent.includes('Cosa non va'), /segnala/i.test(a.foglio().textContent)], ['Invia Feedback', false, false]);
  a.foglio().querySelector('#sg-no').click();

  // lo screenshot: scelto dalle foto, ridotto, anteprima con «Togli»; si carica PRIMA della riga, nel bucket privato, a <persona>/<id>.jpg
  const URLfinto = { n:0, tolti:[] };
  a.win.URL.createObjectURL = () => 'blob:finto-' + (++URLfinto.n); a.win.URL.revokeObjectURL = (u) => URLfinto.tolti.push(u);
  let riduzioni = 0;
  a.win.riduciScreenshot = async (f) => { riduzioni++; if(f.name === 'rotto.png') throw new Error('Non riesco a leggere questa immagine'); return new a.win.Blob([new Uint8Array(200 * 1024)], { type:'image/jpeg' }); };
  const scegli = async (nome) => { const inp = a.foglio().querySelector('#sg-file'); Object.defineProperty(inp, 'files', { value:[new a.win.File(['x'], nome, { type:'image/png' })], configurable:true }); inp.dispatchEvent(new a.win.Event('change')); await attendi(10); };
  const anteprima = () => a.foglio().querySelector('#sg-anteprima'), etichetta = () => a.foglio().querySelector('#sg-allega');
  const chiamate = (op) => a.supa._calls.filter(c => c.op === op && c.table.startsWith('storage:'));
  const righeSg = () => a.t.segnalazioni;
  a.win.foglioSegnala(); await fotogramma();
  atteso('screenshot · nel foglio c\'è «Allega lo screenshot» (solo immagini, una sola), niente anteprima', [etichetta().textContent.trim(), a.foglio().querySelector('#sg-file').accept, a.foglio().querySelector('#sg-file').multiple, anteprima().hidden], ['Allega lo screenshot', 'image/*', false, true]);
  await scegli('rotto.png');
  atteso('screenshot illeggibile · «Non riesco a leggere questa immagine», niente anteprima', [a.toast(), anteprima().hidden], ['🖼️ Non riesco a leggere questa immagine', true]);
  await scegli('schermata.png');
  atteso('screenshot scelto · anteprima piccola con «Togli», il bottone «Allega» sparisce', [anteprima().hidden, etichetta().hidden, !!anteprima().querySelector('img').src, anteprima().querySelector('button').textContent], [false, true, true, 'Togli']);
  anteprima().querySelector('#sg-togli').click();
  atteso('«Togli» · torna «Allega lo screenshot», niente anteprima', [anteprima().hidden, etichetta().hidden], [true, false]);
  await scegli('schermata.png');
  a.motivo('non_funziona').click(); a.foglio().querySelector('#sg-testo').value = 'Il tasto non risponde';
  const righe0 = righeSg().length;
  a.invia().click(); await attendi(30);
  const su = chiamate('upload');
  const nuovaRiga = righeSg()[righe0] || {};
  atteso('Invia con screenshot · caricato nel bucket privato, a <persona>/<id>.jpg, JPEG ridotto, upsert', [su.length, su[0] && su[0].table, su[0] && su[0].payload.percorso === U + '/' + nuovaRiga.id + '.jpg', su[0] && su[0].payload.tipo, su[0] && su[0].payload.byte, su[0] && su[0].payload.opzioni], [1, 'storage:segnalazioni', true, 'image/jpeg', 204800, { contentType:'image/jpeg', upsert:true }]);
  atteso('Invia con screenshot · la riga porta l\'id scelto dall\'app e il percorso; il file è nel bucket', [righeSg().length - righe0, /^[0-9a-f-]{36}$/.test(nuovaRiga.id || ''), nuovaRiga.immagine === U + '/' + nuovaRiga.id + '.jpg', (a.t.__storage.segnalazioni || []).includes(nuovaRiga.immagine)], [1, true, true, true]);
  const ordine = a.supa._calls.filter(c => (c.op === 'upload') || (c.table === 'segnalazioni' && c.op === 'insert')).map(c => c.op).slice(-2);
  atteso('Invia con screenshot · il file arriva PRIMA della riga', ordine, ['upload', 'insert']);
  atteso('Invia con screenshot · chiuso, «Grazie, l\'abbiamo ricevuta», anteprima liberata', [!!a.foglio(), a.toast(), URLfinto.tolti.length > 0], [false, '🙏 Grazie, l\'abbiamo ricevuta', true]);

  // senza screenshot: nessun caricamento, la riga non ha né percorso né id scelto dall'app… (l'id c'è solo se serve il file)
  a.win.foglioSegnala(); await fotogramma(); a.motivo('idea').click(); a.invia().click(); await attendi(30);
  atteso('Invia senza screenshot · nessun caricamento, la riga senza percorso', [chiamate('upload').length, 'immagine' in righeSg()[righeSg().length - 1]], [1, false]);

  // la riga non parte dopo il caricamento: nessuna riga a metà, il file si toglie; il tentativo dopo riscrive lo stesso nome
  a.win.foglioSegnala(); await fotogramma(); await scegli('schermata.png'); a.motivo('idea').click();
  const nRighe = righeSg().length;
  a.t.__rifiuta = { segnalazioni:{ code:'42501', message:'rifiutata' } };
  a.invia().click(); await attendi(30);
  const idTentativo = (chiamate('upload')[1] || { payload:{ percorso:'' } }).payload.percorso;
  atteso('riga rifiutata dopo il caricamento · «Non inviata», foglio aperto, Invia di nuovo acceso, nessuna riga', [a.toast(), !!a.foglio(), a.invia().disabled, righeSg().length - nRighe], ['📡 Non inviata: controlla la connessione e riprova.', true, false, 0]);
  atteso('riga rifiutata · il file appena caricato si toglie (nessuno screenshot senza riga)', [chiamate('remove').length, chiamate('remove')[0] && chiamate('remove')[0].payload, (a.t.__storage.segnalazioni || []).includes(idTentativo)], [1, [idTentativo], false]);
  delete a.t.__rifiuta;
  a.invia().click(); await attendi(30);
  atteso('secondo tentativo · stesso nome di file, la riga parte con quell\'id', [chiamate('upload')[2].payload.percorso === idTentativo, righeSg().length - nRighe, (righeSg()[righeSg().length - 1] || {}).immagine === idTentativo, !!a.foglio()], [true, 1, true, false]);

  // senza rete già al caricamento: nessuna riga, niente da togliere, niente in coda
  a.win.foglioSegnala(); await fotogramma(); await scegli('schermata.png'); a.motivo('idea').click();
  const nRighe2 = righeSg().length, rim0 = chiamate('remove').length;
  a.t.__rete = false; a.invia().click(); await attendi(30);
  atteso('senza rete · «Non inviata», nessuna riga, niente in coda, foglio aperto', [a.toast(), righeSg().length - nRighe2, a.win.localStorage.getItem('zt_coda_' + U), !!a.foglio()], ['📡 Non inviata: controlla la connessione e riprova.', 0, null, true]);
  atteso('senza rete · nessuna riga a metà: il caricamento non è riuscito, la riga non è stata scritta', [(a.t.__storage.segnalazioni || []).filter(f => f.endsWith('.jpg')).length, righeSg().length - nRighe2], [2, 0]);
  a.t.__rete = undefined; a.foglio().querySelector('#sg-no').click();

  // sopra una conferma (Fondamenta 150): non si mette in fila, si apre subito
  const pc = a.win.chiediConferma('Eliminare questo pasto?'); await attendi(5);
  a.win.foglioSegnala(); await attendi(5);
  atteso('sopra una conferma · i due fogli sono a schermo insieme, la conferma è fra i fogli aperti', [a.d.querySelectorAll('.foglio-overlay').length, !!a.foglio(), (a.t.segnalazioni[1] && a.foglio().querySelector('.sg-dove').textContent.includes('Dove sei: Body › misure'))], [2, true, true]);
  a.foglio().querySelector('#sg-no').click();
  atteso('chiuso il foglio della segnalazione · la conferma sotto è ancora lì', [!!a.foglio(), a.d.querySelectorAll('.foglio-overlay').length], [false, 1]);
  [...a.d.querySelectorAll('.foglio-overlay button')].find(x => x.textContent === 'Annulla').click();
  atteso('la conferma risponde come sempre', await pc, false);
  a.win.foglioSegnala(); await attendi(5);
  a.d.dispatchEvent(new a.win.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  atteso('Esc · chiude il foglio della segnalazione', !!a.foglio(), false);

  // Annulla e tocco sullo sfondo
  a.win.foglioSegnala(); await attendi(5); const nPrima = a.t.segnalazioni.length;
  a.foglio().querySelector('#sg-no').click();
  atteso('Annulla · foglio chiuso, niente scritto', [!!a.foglio(), a.t.segnalazioni.length], [false, nPrima]);
  a.win.foglioSegnala(); await attendi(5); a.foglio().dispatchEvent(new a.win.MouseEvent('click', { bubbles:true }));
  atteso('tocco sullo sfondo · foglio chiuso', !!a.foglio(), false);

  // senza rete: «Non inviata», il foglio resta, niente in coda
  a.t.__rete = false;
  a.win.foglioSegnala(); await attendi(5); a.motivo('non_funziona').click(); a.invia().click(); await attendi(20);
  atteso('senza rete · «Non inviata: controlla la connessione e riprova.», foglio ancora aperto, Invia di nuovo acceso', [a.toast(), !!a.foglio(), a.invia().disabled], ['📡 Non inviata: controlla la connessione e riprova.', true, false]);
  atteso('senza rete · niente in tabella e niente in coda (si rifà a mano)', [a.t.segnalazioni.length, a.win.localStorage.getItem('zt_coda_' + U)], [nPrima, null]);
  a.t.__rete = undefined;
  a.invia().click(); await attendi(20);
  atteso('tornata la rete · lo stesso Invia va a buon fine', [a.t.segnalazioni.length, !!a.foglio()], [nPrima + 1, false]);
  // la tabella non c'è ancora (migrazione non eseguita): stessa frase, niente di rotto
  a.t.__assenti = ['segnalazioni'];
  a.win.foglioSegnala(); await attendi(5); a.motivo('idea').click(); a.invia().click(); await attendi(20);
  atteso('tabella assente · stessa frase, il foglio resta', [a.toast(), !!a.foglio()], ['📡 Non inviata: controlla la connessione e riprova.', true]);
  a.foglio().querySelector('#sg-no').click(); a.t.__assenti = [];

  // uscendo dall'app l'insetto sparisce
  a.win.showScreen('auth');
  atteso('schermata di accesso · insetto nascosto di nuovo', a.insetto().hidden, true);
  a.win.showScreen('app');

  // mai la parola «errore» verso la persona
  const pagina = fs.readFileSync(path.join(REPO, 'zona-tracker.html'), 'utf8');
  const blocco = pagina.slice(pagina.indexOf('function doveSono'), pagina.indexOf('function renderPage'));
  atteso('nei testi del foglio non c\'è la parola «errore»', /errore/i.test(blocco.replace(/\/\/.*$/gm, '')), false);

  // i file: richiamato dalla pagina, elencato nel service worker
  const sw = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');
  atteso('app/segnala.js · richiamato dalla pagina ed elencato in APP_FILES', [/<script src="app\/segnala\.js(\?v=[^"]*)?"><\/script>/.test(pagina), /'app\/segnala\.js',/.test(sw)], [true, true]);
  atteso('la migrazione c\'è e dichiara tabella, regole e permessi', (() => { const m = fs.readFileSync(path.join(REPO, 'supabase', 'migrations', '20261006_220_segnalazioni.sql'), 'utf8'); return [/create table if not exists public\.segnalazioni/.test(m), /enable row level security/.test(m), /revoke all on public\.segnalazioni from public, anon, authenticated/.test(m), /grant select, insert, update on public\.segnalazioni to authenticated/.test(m), (m.match(/create policy/g) || []).length]; })(), [true, true, true, true, 3]);

  atteso('migrazione 230 · campo nuovo, bucket privato solo JPEG fino a 1 MB, quattro regole per cartella della persona, niente anon', (() => {
    const m = fs.readFileSync(path.join(REPO, 'supabase', 'migrations', '20261006_230_segnalazioni_screenshot.sql'), 'utf8').replace(/--.*$/gm, '');
    const regole = [...m.matchAll(/create policy "([^"]+)" on storage\.objects for (\w+) to (\w+)/g)];
    return [/add column if not exists immagine text/.test(m), /values \('segnalazioni', 'segnalazioni', false, 1048576, array\['image\/jpeg'\]\)/.test(m), /on conflict \(id\) do nothing/.test(m),
      regole.map(r => r[2] + ':' + r[3]).join(' '), (m.match(/\(auth\.uid\(\)\)::text = \(storage\.foldername\(name\)\)\[1\]/g) || []).length >= 5, /\banon\b|\bto public\b/.test(m)];
  })(), [true, true, true, 'select:authenticated insert:authenticated update:authenticated delete:authenticated', true, false]);
  atteso('migrazione 230 · idempotente (ogni regola si toglie prima di crearla) e non tocca la migrazione della 220', [(fs.readFileSync(path.join(REPO, 'supabase', 'migrations', '20261006_230_segnalazioni_screenshot.sql'), 'utf8').match(/drop policy if exists/g) || []).length, /create table/.test(fs.readFileSync(path.join(REPO, 'supabase', 'migrations', '20261006_230_segnalazioni_screenshot.sql'), 'utf8').replace(/--.*$/gm, ''))], [4, false]);

  atteso('zero errori in console', a.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
