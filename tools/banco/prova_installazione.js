// Fondamenta 190 — installazione sul telefono: manifest per Android, icona PNG per iPhone, suggerimento
// «Aggiungi alla schermata Home» una volta dopo il primo accesso.
//   node tools/banco/prova_installazione.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const REPO = path.join(__dirname, '..', '..');
const misuraPng = (f) => { const b = fs.readFileSync(path.join(REPO, f)); return b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
(async () => {
  const html = fs.readFileSync(path.join(REPO, 'zona-tracker.html'), 'utf8');
  const man = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.webmanifest'), 'utf8'));
  atteso('manifest · nome, avvio e modo app', [man.name, man.start_url, man.display, man.scope], ['Zona Tracker', '/benessere-forma/zona-tracker.html', 'standalone', '/benessere-forma/']);
  atteso('manifest · icone PNG vere della misura dichiarata, per ogni uso', man.icons.map(i => [i.purpose, i.sizes, JSON.stringify(misuraPng(i.src))]), [['any', '192x192', '[192,192]'], ['any', '512x512', '[512,512]'], ['maskable', '192x192', '[192,192]'], ['maskable', '512x512', '[512,512]']]);
  atteso('pagina · richiama il manifest e un\'icona PNG per iPhone', [/<link rel="manifest" href="manifest\.webmanifest"\/>/.test(html), /<link rel="apple-touch-icon" href="assets\/icone\/icona-180\.png"\/>/.test(html), JSON.stringify(misuraPng('assets/icone/icona-180.png'))], [true, true, '[180,180]']);
  atteso('icone · rigenerabili con lo strumento (stesso contenuto)', (() => { const prima = fs.readFileSync(path.join(REPO, 'assets/icone/icona-192.png')); require('child_process').execSync('node tools/icone/genera.js', { cwd: REPO }); return prima.equals(fs.readFileSync(path.join(REPO, 'assets/icone/icona-192.png'))); })(), true);

  const U = 'u1';
  const tables = () => ({ profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], supplements_log:[], __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } });
  const attendi = (ms) => new Promise(r => setTimeout(r, ms));
  async function home(opts) {
    const b = boot(tables(), { now:'2026-10-02T12:00:00', ...(opts || {}) });
    await b.avviato;
    for(let i = 0; i < 100 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
    b.win.renderHomeV2();
    return b;
  }
  let a = await home();
  const hint = () => a.win.document.getElementById('installa-hint');
  atteso('Home nel browser · il suggerimento c\'è', [!!hint(), hint() && /schermata Home/.test(hint().textContent)], [true, true]);
  a.win.installaHintChiudi();
  a.win.renderHomeV2();
  atteso('«Non ora» · sparisce e resta sparito', [!!hint(), a.win.localStorage.getItem('zt_installa_visto')], [false, '1']);
  a = await home({ locale:{ zt_installa_visto:'1' } });
  atteso('telefono che ha già detto «Non ora» · niente suggerimento', !!hint(), false);
  a = await home();
  a.win.matchMedia = () => ({ matches:true });
  a.win.renderHomeV2();
  atteso('app già installata (standalone) · niente suggerimento', !!hint(), false);
  // Android: arriva beforeinstallprompt → pulsante Installa
  a = await home();
  let chiesto = 0;
  const ev = new a.win.Event('beforeinstallprompt'); ev.prompt = () => { chiesto++; }; ev.userChoice = Promise.resolve({ outcome:'accepted' });
  a.win.dispatchEvent(ev); await attendi(30);
  const btn = [...a.win.document.querySelectorAll('#installa-hint button')].find(b => b.textContent === 'Installa');
  atteso('Android · pulsante Installa', !!btn, true);
  await a.win.installaApp();
  atteso('Installa · chiede al telefono e il suggerimento sparisce', [chiesto, !!hint()], [1, false]);
  atteso('zero errori in console', a.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
