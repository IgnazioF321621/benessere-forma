// Fondamenta 220 — il tasto «Segnala»: un piccolo insetto in alto a destra su ogni schermata e foglio, da quando si è dentro.
// Prima le regole pure di app/segnala.js (copiate da MB21), poi l'app vera nel banco: l'insetto compare dopo l'accesso e non
// prima, il foglio si apre anche sopra un altro foglio (e sopra una conferma), «Invia» è spento senza motivo, la riga salvata
// ha dove/versione/telefono, senza rete «Non inviata» e niente in coda, mai la parola «errore».
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
  atteso('dentro l\'app · insetto visibile, in alto a destra, sopra i fogli e sotto il toast', [a.insetto().hidden, a.insetto().getAttribute('aria-label'), !!a.insetto().querySelector('svg')], [false, 'Segnala', true]);
  const css = fs.readFileSync(path.join(REPO, 'app', 'stile.css'), 'utf8');
  const z = (sel) => { const m = new RegExp(sel.replace(/\./g, '\\.') + '\\{[^}]*z-index:(\\d+)').exec(css); return m ? +m[1] : null; };
  atteso('stile · z-index: insetto sopra il foglio più alto (2100) e sotto il toast (9000)', [z('.segnala-bottone') > 2100, z('.segnala-bottone') < z('.toast'), z('.sg-overlay') > z('.foglio-overlay'), z('.segnala-bottone') > z('.sg-overlay')], [true, true, true, true]);
  atteso('stile · l\'angolo si libera: pillola del peso, avatar della Home, intestazioni dei fogli interi', [/\.h-inner\{padding-right:\d+px;\}/.test(css), /\.home-v2-header\{padding-right:\d+px;\}/.test(css), /\.pkg-editor-header,\.cextra-header,\.daydetail-header,\.pianov4-day-header\{padding-right:\d+px;\}/.test(css)], [true, true, true]);

  // il foglio: Invia spento finché non si sceglie il motivo
  a.win.showPage('home');
  a.insetto().click();
  await attendi(5);
  atteso('tocco sull\'insetto · il foglio si apre con la domanda, tre scelte, il testo, Invia spento', [!!a.foglio(), a.foglio().querySelector('h3').textContent, a.foglio().querySelectorAll('[data-motivo]').length, !!a.foglio().querySelector('#sg-testo'), a.invia().disabled], [true, 'Cosa non va, o cosa proponi?', 3, true, true]);
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
  a.win.foglioSegnala(); await attendi(5); a.foglio().querySelector('#sg-no').click();
  atteso('Annulla · foglio chiuso, niente scritto', [!!a.foglio(), a.t.segnalazioni.length], [false, 2]);
  a.win.foglioSegnala(); await attendi(5); a.foglio().dispatchEvent(new a.win.MouseEvent('click', { bubbles:true }));
  atteso('tocco sullo sfondo · foglio chiuso', !!a.foglio(), false);

  // senza rete: «Non inviata», il foglio resta, niente in coda
  a.t.__rete = false;
  a.win.foglioSegnala(); await attendi(5); a.motivo('non_funziona').click(); a.invia().click(); await attendi(20);
  atteso('senza rete · «Non inviata: controlla la connessione e riprova.», foglio ancora aperto, Invia di nuovo acceso', [a.toast(), !!a.foglio(), a.invia().disabled], ['📡 Non inviata: controlla la connessione e riprova.', true, false]);
  atteso('senza rete · niente in tabella e niente in coda (si rifà a mano)', [a.t.segnalazioni.length, a.win.localStorage.getItem('zt_coda_' + U)], [2, null]);
  a.t.__rete = undefined;
  a.invia().click(); await attendi(20);
  atteso('tornata la rete · lo stesso Invia va a buon fine', [a.t.segnalazioni.length, !!a.foglio()], [3, false]);
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

  atteso('zero errori in console', a.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
