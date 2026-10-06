// Fondamenta 035: la pagina divisa, in un browser vero (Chrome senza finestra), servita in locale.
// Il banco ricompone la pagina; qui invece il browser carica i file uno per uno come farà il
// telefono: è la prova che l'ordine di caricamento regge davvero.
//  - nessun errore al caricamento (li raccoglie una spia messa solo nella copia servita)
//  - le cose comuni esistono (stato, dbq, avvisi, date, moduli condivisi)
//  - con un file «di prima»: schermate di accesso e di onboarding identiche pixel per pixel
//  - controprova: una pagina rotta apposta DEVE risultare rotta, altrimenti la prova non vale
//
//   node tools/banco/prova_browser.js [/percorso/prima.html]
// Non entra con un account vero e non prova il service worker: quello resta al telefono.
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const { execFile } = require('child_process');
const { REPO, fileLocali } = require('./pagina');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(CHROME)){ console.log('  KO  Chrome non trovato: ' + CHROME); process.exit(1); }
const prima = process.argv[2];
const GLOBALI = ['ST', 'dbq', 'dbqAll', 'reportError', 'showToast', 'todayKey', 'ZTNutrizione', 'ZTQuadro', 'ZTCoachRules', 'ZTRitratto', 'ZTSegnala', 'foglioSegnala', 'supa', 'APP_VERSION'];
// Informativa gia' letta su questo telefono (Fondamenta 170): la schermata di accesso resta confrontabile con quella di prima
const PRIVACY_VERSIONE = (/const PRIVACY_VERSIONE = '([^']+)'/.exec(fs.readFileSync(path.join(REPO, 'app', 'comune.js'), 'utf8')) || [])[1] || '';
const SPIA = '<script>try{localStorage.setItem("zt_privacy_ok",' + JSON.stringify(PRIVACY_VERSIONE) + ')}catch(e){}window.__err=[];window.addEventListener("error",function(e){window.__err.push(String(e.message||"risorsa non caricata: "+((e.target&&(e.target.src||e.target.href))||"?")));},true);' +
  'window.addEventListener("unhandledrejection",function(e){window.__err.push("promessa: "+String(e.reason&&e.reason.message||e.reason));});' +
  'setTimeout(function(){var g={};' + JSON.stringify(GLOBALI) + '.forEach(function(n){try{g[n]=eval("typeof "+n);}catch(x){g[n]="errore";}});' +
  'document.documentElement.setAttribute("data-zt",encodeURIComponent(JSON.stringify({errori:window.__err,globali:g})));},4000);</script>';
let ko = 0;
const atteso = (nome, ok, dettaglio) => { if(!ok) ko++; console.log((ok ? '  OK  ' : '  KO  ') + nome + (dettaglio ? ' ' + dettaglio : '')); };

const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-browser-'));
function prepara(nome, html){
  const d = path.join(radice, nome, 'benessere-forma');
  fs.mkdirSync(d, { recursive: true });
  for(const c of ['app', 'shared']) fs.cpSync(path.join(REPO, c), path.join(d, c), { recursive: true });
  fs.writeFileSync(path.join(d, 'zona-tracker.html'), html.replace('<head>', '<head>' + SPIA));
}
const nuova = fs.readFileSync(path.join(REPO, 'zona-tracker.html'), 'utf8');
prepara('nuova', nuova);
if(prima) prepara('prima', fs.readFileSync(prima, 'utf8'));
// rotta apposta: via il primo file di codice dell'app (o il primo modulo) e dentro un errore certo
const codice = fileLocali(nuova).filter(f => f.endsWith('.js'));
const tolto = codice.find(f => f.startsWith('app/')) || codice[0];
prepara('rotta', nuova.replace(new RegExp('<script src="' + tolto.replace('.', '\\.') + '(?:\\?v=[^"]*)?"></script>'), '<script>nonEsiste();</script>'));

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const f = path.join(radice, decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(radice) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPI[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
server.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + server.address().port;
  // Chrome va lanciato SENZA fermare questo processo: è lui che gli serve le pagine.
  const chrome = (args) => new Promise((ok) => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=390,844', '--virtual-time-budget=15000', ...args],
    { maxBuffer: 64 * 1024 * 1024, timeout: 60000 }, (err, out) => ok(String(out || ''))));
  const leggi = async (nome, q) => {
    const m = (await chrome(['--dump-dom', `${base}/${nome}/benessere-forma/zona-tracker.html${q}`])).match(/data-zt="([^"]*)"/);
    return m ? JSON.parse(decodeURIComponent(m[1])) : null;
  };
  const foto = async (nome, q) => { const f = path.join(radice, nome + (q ? '_test' : '') + '.png'); await chrome(['--screenshot=' + f, `${base}/${nome}/benessere-forma/zona-tracker.html${q}`]); return fs.existsSync(f) ? fs.readFileSync(f) : null; };
  try {
    const r = await leggi('rotta', '');
    atteso('controprova: la pagina rotta apposta risulta rotta', !!(r && r.errori.length), r ? `(${r.errori.length} errori, senza ${tolto})` : '(nessuna risposta)');
    for(const q of ['', '?test=1']){
      const n = await leggi('nuova', q);
      atteso(`pagina nuova${q ? ' in prova (?test=1)' : ''}: nessun errore al caricamento`, !!(n && n.errori.length === 0), n ? JSON.stringify(n.errori).slice(0, 300) : '(nessuna risposta)');
      const mancanti = n ? GLOBALI.filter(g => n.globali[g] === 'undefined' || n.globali[g] === 'errore') : GLOBALI;
      atteso(`pagina nuova${q ? ' in prova' : ''}: le cose comuni ci sono tutte (${GLOBALI.length})`, mancanti.length === 0, mancanti.join(', '));
      if(prima){
        const p = await leggi('prima', q);
        atteso(`pagina di prima${q ? ' in prova' : ''}: nessun errore (stesso metro)`, !!(p && p.errori.length === 0), p ? JSON.stringify(p.errori).slice(0, 200) : '');
        atteso(`schermata ${q ? 'di onboarding' : 'di accesso'} identica a prima, pixel per pixel`, await (async () => {
          // La foto dipende da quando scatta (dissolvenza iniziale): fino a 3 tentativi, basta una coppia uguale.
          for(let giro = 0; giro < 3; giro++){ const a = await foto('prima', q), b = await foto('nuova', q); if(a && b && a.equals(b)) return true; }
          return false;
        })());
      }
    }
    if(!prima) console.log('  --  confronto delle schermate saltato (nessun file di prima passato)');
  } finally { server.close(); fs.rmSync(radice, { recursive: true, force: true }); }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
});
