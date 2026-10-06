// Stile 010: ogni colore e carattere di app/stile.css ha un nome, e dare i nomi non ha cambiato l'aspetto.
//  1. sempre: fuori da :root nessun colore scritto a mano (#…, rgb(…) coi numeri, hsl), caratteri solo
//     var(--font-sans) / var(--font-mono) / inherit, ogni nome usato è dichiarato, i nomi si dichiarano solo in :root
//  2. con lo stile di prima: ogni regola, coi nomi sostituiti dai valori, dice lo stesso di prima (colori confrontati
//     come colori: #fff = #FFFFFF = rgb 255,255,255), più la controprova con un nome cambiato apposta
//  3. con lo stile di prima, in Chrome vero: le schermate dell'app disegnate dal banco (accesso, onboarding, Home,
//     i tab Nutrition, Training e Body, le Impostazioni), fotografate con lo stile di prima e con il nuovo: stessi
//     pixel e stesso stile calcolato di ogni elemento (i nomi --… esclusi: sono le etichette, non l'aspetto); la controprova con un colore cambiato deve risultare diversa
//
//   git show main:app/stile.css > /tmp/stile_prima.css
//   node tools/banco/prova_stile.js [/tmp/stile_prima.css]
//   FOTO=/una/cartella node tools/banco/prova_stile.js /tmp/stile_prima.css   # tiene le foto, prima e nuova
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const { execFile } = require('child_process');
const REPO = path.join(__dirname, '..', '..');
const STILE = path.join(REPO, 'app', 'stile.css');
const prima = process.argv[2];
let ko = 0;
const atteso = (nome, ok, dettaglio) => { if(!ok) ko++; console.log((ok ? '  OK  ' : '  KO  ') + nome + (dettaglio ? '  ' + dettaglio : '')); };

const senzaCommenti = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
function dividi(css){
  const t = senzaCommenti(css);
  const i0 = t.indexOf(':root{'), i1 = t.indexOf('}', i0) + 1;
  const root = t.slice(i0, i1);
  const nomi = {};
  for(const m of root.matchAll(/--([\w-]+)\s*:\s*([^;}]*)/g)) nomi[m[1]] = m[2].trim();
  return { root, fuori: t.slice(0, i0) + t.slice(i1), nomi };
}
// var(--x) e var(--x, ripiego) sostituiti dal valore, come fa il browser (anche annidati)
function risolvi(testo, nomi){
  let prec;
  do {
    prec = testo;
    testo = testo.replace(/var\(\s*--([\w-]+)\s*(?:,((?:[^()]|\((?:[^()]|\([^()]*\))*\))*))?\)/g, (m, n, rip) =>
      n in nomi ? nomi[n] : (rip !== undefined ? rip.trim() : m));
  } while(testo !== prec);
  return testo;
}
// colori confrontati come colori, spazi tolti
function canonico(t){
  const hex = (h) => { h = h.slice(1).toLowerCase(); if(h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
    const n = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); const a = h.length === 8 ? +(parseInt(h.slice(6), 16) / 255).toFixed(3) : 1;
    return `rgba(${n.join(',')},${a})`; };
  return t.replace(/\s+/g, ' ').replace(/\s*([,;:{}()])\s*/g, '$1')
    .replace(/#[0-9a-fA-F]{3,8}\b/g, hex)
    .replace(/rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/g, (m, r, g, b, a) => `rgba(${r},${g},${b},${a === undefined ? 1 : +a})`);
}

// ── 1. le regole fisse ──
const ora = fs.readFileSync(STILE, 'utf8');
const N = dividi(ora);
const aMano = [...N.fuori.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d[^)]*\)|hsla?\([^)]*\)/g)].map(m => m[0]);
atteso('fuori da :root nessun colore scritto a mano', aMano.length === 0, aMano.slice(0, 8).join(' '));
const caratteri = [...N.fuori.matchAll(/font-family\s*:\s*([^;}]*)/g)].map(m => m[1].trim()).filter(v => !/^(var\(--font-(sans|mono)\)|inherit)$/.test(v));
atteso('caratteri solo per nome (var(--font-sans), var(--font-mono), inherit)', caratteri.length === 0, caratteri.slice(0, 5).join(' | '));
const scorciatoie = [...N.fuori.matchAll(/(?:^|[;{\s])font\s*:\s*([^;}]*)/g)].map(m => m[1]);
atteso('nessuna scorciatoia font: con un carattere dentro', scorciatoie.length === 0, scorciatoie.join(' | '));
const usati = new Set([...ora.matchAll(/var\(\s*--([\w-]+)/g)].map(m => m[1]));
const nonDichiarati = [...usati].filter(n => !(n in N.nomi));
atteso('ogni nome usato è dichiarato in :root', nonDichiarati.length === 0, nonDichiarati.join(' '));
const altrove = [...N.fuori.matchAll(/(?:^|[;{\s])--([\w-]+)\s*:/g)].map(m => m[1]);
atteso('i nomi si dichiarano solo in :root (nessuno li ridefinisce più in basso)', altrove.length === 0, altrove.join(' '));

if(!prima){
  console.log('  --  confronto con lo stile di prima e prova in Chrome saltati (nessun file di prima passato)');
  console.log(ko ? `\n${ko} KO` : '\ntutto OK'); process.exit(ko ? 1 : 0);
}

// ── 2. coi nomi sostituiti dai valori, ogni regola dice lo stesso di prima ──
const vecchio = fs.readFileSync(prima, 'utf8');
const P = dividi(vecchio);
const piatto = (d) => canonico(risolvi(d.fuori, Object.fromEntries(Object.entries(d.nomi).map(([k, v]) => [k, risolvi(v, d.nomi)]))));
const a = piatto(P), b = piatto(N);
const primoDiverso = (x, y) => { let i = 0; while(i < x.length && x[i] === y[i]) i++; return i; };
const k = primoDiverso(a, b);
atteso(`ogni regola, coi nomi risolti, uguale a prima (${a.length} caratteri)`, a === b, a === b ? '' : `\n      prima: …${a.slice(k - 80, k + 60)}\n      ora:   …${b.slice(k - 80, k + 60)}`);
const cambiati = Object.keys(P.nomi).filter(n => canonico(P.nomi[n]) !== canonico(N.nomi[n] || ''));
atteso('i nomi di prima ci sono ancora tutti, con lo stesso valore', cambiati.length === 0, cambiati.join(' '));
const rotto = { ...N, nomi: { ...N.nomi, 'carta': '#FFFCF7' } };
atteso('controprova: con --carta cambiata di un punto il confronto se ne accorge', piatto(rotto) !== a);

// ── 3. in Chrome vero: le schermate dell'app con lo stile di prima e con il nuovo ──
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(CHROME)){ atteso('Chrome trovato', false, CHROME); console.log(`\n${ko} KO`); process.exit(1); }
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-04';
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const base = { uso:'principale', luogo:'casa', attrezzo:'elastico', livello:'intermedio', muscoli:'', setup:'', esecuzione:'', errori:'', zone_rischio:'' };
const row = (codice, nome, pattern, gruppo_target) => ({ ...base, codice, nome, pattern, gruppo_target: gruppo_target || '' });
const catalogo = [row('EX001','Panca elastico','spinta orizzontale'), row('EX010','Military press elastico','spinta verticale'), row('EX020','Rematore elastico','tirata orizzontale'),
  row('EX030','Lat machine elastico','tirata verticale'), row('EX040','Squat elastico','dominante ginocchia'), row('EX050','Stacco rumeno elastico','dominante anca'),
  row('EX060','Alzate posteriori','isolamento','deltoidi posteriori'), row('EX070','Pallof press','core','core anti-rotazione'), row('EX072','Plank','core','core anti-estensione')];
const ex = (codice) => ({ codice, name: catalogo.find(c => c.codice === codice).nome, sets:3, reps:'8-12' });
const scheda = { obiettivo:'ricomposizione', sessioni:[
  { id:'upperA', name:'Upper A', type:'Forza', rir:2, warmup:[], exercises:['EX001','EX010','EX020','EX030','EX060','EX070'].map(ex) },
  { id:'lowerA', name:'Lower A', type:'Forza', rir:2, warmup:[], exercises:['EX040','EX050','EX072'].map(ex) }] };
function tabelle(){
  const meals = [], items = [], pesi = [], logs = [];
  for(let d = 0; d < 21; d++){
    const k = add(OGGI, -d);
    [['colazione','08:00',420,28,50,12,'Yogurt greco e avena'],['pranzo','13:00',650,42,70,20,'Riso, pollo e verdure'],['cena','20:00',580,38,40,24,'Salmone e patate']]
      .forEach(([slot, time, kcal, protein, carbs, fat, description], i) => { if(d === 0 && i === 2) return;
        meals.push({ id:`m${d}${i}`, user_id:U, date:k, slot, time, kcal, protein, carbs, fat, description, notes:'' });
        items.push({ id:`i${d}${i}`, meal_id:`m${d}${i}`, name:description.split(' ')[0], quantity:150, unit:'g', kcal, protein, carbs, fat }); });
    if(d % 2 === 0) pesi.push({ id:'p' + d, user_id:U, date:k, weight_kg: +(74 - d * 0.05).toFixed(2), created_at:k + 'T07:30:00Z' });
    if(d < 10) logs.push({ id:'l' + d, user_id:U, date:k, supplement_id:'s1', name:'Omega 3', time:'08:00', dose:1 });
  }
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, sesso:'M', eta:45, altezza_cm:178, weight_kg:74, goal_weight_kg:70, obiettivo:'ricomposizione',
      target_kcal:2300, target_protein:170, target_carbs:220, target_fat:75, giorni_allenamento:4, tipo_allenamento:'casa', attrezzatura:['elastico'],
      train_start_date:'2026-09-21', usa_training:true, created_at:'2026-05-01T08:00:00Z' }],
    meals, meal_items:items, weight_logs:pesi, supplements_log:logs, fasting_days:[], daily_log:[], app_errors:[],
    supplements:[{ id:'s1', user_id:U, name:'Omega 3', slot:'08:00', sort_order:1, active:true, kcal:10, protein:0, carbs:0, fat:1 }],
    nutrilite_catalog:[], esercizi_catalog:catalogo, schede_utente:[{ id:'sc1', user_id:U, attiva:true, blocco_n:1, scheda }],
    workouts:[{ id:'w1', user_id:U, session_type:'upperA', date:add(OGGI, -2), completed:true }], training_logs:[
      { id:'t1', user_id:U, session_id:'upperA', date:add(OGGI, -2), exercise_name:'Panca elastico', exercise_code:'EX001', set_number:1, reps:10, resistance:'40', rir_actual:2 }],
    training_notes:[], body_logs:[], body_measurements:[], body_checks:[], blood_tests:[], body_check_ai:[], weekly_pictures:[], coach_proposals:[], weekly_plans:[], weekly_plan_meals:[],
  };
}
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
// la pagina com'è dopo il disegno, senza codice, con lo stile richiamato da file: è lei che Chrome fotografa
function fotografa(win){
  const doc = win.document.cloneNode(true);
  doc.querySelectorAll('script').forEach(s => s.remove());
  doc.querySelectorAll('style').forEach(s => { if(s.textContent.includes('--font-sans')) s.replaceWith(Object.assign(doc.createElement('link'), { rel:'stylesheet', href:'stile.css' })); });
  // il cursore lampeggia: fuori, sennò due scatti uguali escono diversi. Le animazioni le ferma la spia qui sotto, prima di misurare:
  // finite portate alla fine, infinite (lo splash che pulsa) ferme all'inizio, uguale per le due versioni
  const fermo = doc.createElement('style'); fermo.textContent = '*{caret-color:transparent!important}';
  doc.head.appendChild(fermo);
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
async function schermate(){
  const out = {};
  // fuori dall'app: informativa, accesso, onboarding
  { const b = boot({ profiles:[], meals:[], meal_items:[], fasting_days:[], supplements_log:[] }, { now:OGGI + 'T09:00:00' }); await b.avviato; await attendi(50);
    b.win.showScreen('auth'); out['01-informativa'] = fotografa(b.win);
    b.win.localStorage.setItem('zt_privacy_ok', b.win.eval('PRIVACY_VERSIONE')); b.win.showScreen('auth'); out['02-accesso'] = fotografa(b.win);
    b.win.eval('ST').user = { id:'test-user-001', email:'test@local' }; b.win.showScreen('onboarding'); out['03-onboarding'] = fotografa(b.win);
    b.win.close(); }
  // dentro l'app, con dati
  const t = tabelle(); t.__sessione = { user:{ id:U, email:'ignazio.f@me.com' } };
  const b = boot(t, { now:OGGI + 'T18:00:00', locale:{ zt_privacy_ok:'x', zt_installa_visto:'1' } });
  await b.avviato;
  for(let i = 0; i < 500 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  atteso('banco: l\'app si apre con i dati di prova', b.win.document.getElementById('app').classList.contains('visible'));
  await attendi(300);
  const W = b.win, ST = W.eval('ST');
  const giro = [['10-home', () => W.showPage('home')], ['11-oggi', () => W.showPage('oggi')], ['12-integratori', () => W.showPage('integratori')],
    ['13-analisi', () => W.showPage('analisi')], ['14-piano', () => W.showPage('piano')],
    ['20-training', () => { ST.trainTab = 'piano'; W.showPage('training'); }], ['21-progressione', () => { ST.trainTab = 'progressione'; W.renderTraining(); }],
    ['30-body-misure', () => { ST.bodyTab = 'misure'; W.showPage('body'); }], ['31-body-tendenza', () => { ST.bodyTab = 'tendenza'; W.renderBody(); }],
    ['32-body-check', () => { ST.bodyTab = 'check'; W.renderBody(); }], ['40-impostazioni', () => { W.showPage('home'); W.openSettingsModal(); }]];
  for(const [nome, vai] of giro){
    try {
      vai(); await attendi(250); if(ST.page === 'home') W.renderHomeV2();
      // il benvenuto del Piano copre tutto: una foto sua, la prima volta, poi via
      const benvenuto = W.document.getElementById('pianov4-welcome-overlay');
      if(benvenuto){ if(!out['09-benvenuto-piano']) out['09-benvenuto-piano'] = fotografa(W); benvenuto.remove(); }
      // una schermata vuota darebbe «uguale a prima» senza aver provato niente
      const pagina = W.document.querySelector('.page.active'), testo = pagina ? pagina.textContent.replace(/\s+/g, ' ').trim() : '';
      if(testo.length < 200) atteso('banco: schermata ' + nome + ' piena', false, `(${testo.length} caratteri: ${testo.slice(0, 80)})`);
      out[nome] = fotografa(W);
    } catch(e){ atteso('banco: schermata ' + nome, false, e.message); }
  }
  return out;
}
const SPIA = `<script>addEventListener('load',()=>setTimeout(()=>{const h=(s)=>{let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619);}return (x>>>0).toString(36);};
document.getAnimations().forEach(a=>{try{a.finish();}catch(e){a.pause();a.currentTime=0;}});
const els=[...document.querySelectorAll('body *')];const righe=els.map(e=>{let s='';for(const p of [null,'::before','::after']){const c=getComputedStyle(e,p);for(let i=0;i<c.length;i++)if(!c[i].startsWith('--'))s+=c[i]+':'+c.getPropertyValue(c[i])+';';}return h(s);});
const nomi=els.map(e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).join('.'):''));
document.documentElement.setAttribute('data-stile',JSON.stringify({n:els.length,h:righe,d:nomi}));},300));</script>`;

(async () => {
  const pagine = await schermate();
  const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-stile-'));
  const varianti = { prima: vecchio, nuova: ora, rotta: ora.replace('--carta:#FFFCF6', '--carta:#FFFCF7') };
  atteso('controprova pronta: lo stile rotto apposta differisce da quello nuovo', varianti.rotta !== ora);
  for(const [v, css] of Object.entries(varianti)){
    fs.mkdirSync(path.join(radice, v)); fs.writeFileSync(path.join(radice, v, 'stile.css'), css);
    for(const [n, html] of Object.entries(pagine)) fs.writeFileSync(path.join(radice, v, n + '.html'), html.replace('</body>', SPIA + '</body>'));
  }
  const server = http.createServer((req, res) => {
    const f = path.join(radice, decodeURIComponent(req.url.split('?')[0]));
    if(!f.startsWith(radice) || !fs.existsSync(f)){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const chrome = (args) => new Promise((ok) => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=390,2600', '--virtual-time-budget=8000', ...args],
    { maxBuffer: 128 * 1024 * 1024, timeout: 90000 }, (err, out) => ok(String(out || ''))));
  const calcolato = async (v, n) => { const m = (await chrome(['--dump-dom', `${base}/${v}/${n}.html`])).match(/data-stile="([^"]*)"/); return m ? JSON.parse(m[1].replace(/&quot;/g, '"')) : null; };
  const foto = async (v, n) => { const f = path.join(radice, `${v}-${n}.png`); await chrome(['--screenshot=' + f, `${base}/${v}/${n}.html`]); return fs.existsSync(f) ? fs.readFileSync(f) : null; };
  const uguali = (x, y) => !!(x && y && x.n === y.n && x.h.every((h, i) => h === y.h[i]));
  try {
    let rotteViste = 0;
    for(const n of Object.keys(pagine)){
      const [p, q, r] = [await calcolato('prima', n), await calcolato('nuova', n), await calcolato('rotta', n)];
      const diversi = p && q ? p.h.map((h, i) => h === q.h[i] ? null : i).filter(i => i !== null) : [];
      let stessaFoto = false;
      for(let giro = 0; giro < 3 && !stessaFoto; giro++){ const a = await foto('prima', n), b = await foto('nuova', n); stessaFoto = !!(a && b && a.equals(b)); }
      atteso(`${n.padEnd(18)} stile calcolato di ${p ? p.n : '?'} elementi uguale a prima, e stessi pixel`, uguali(p, q) && stessaFoto,
        !p || !q ? '(nessuna risposta da Chrome)' : (diversi.length ? `${diversi.length} elementi diversi: ${diversi.slice(0, 3).map(i => p.d[i]).join(', ')}` : (stessaFoto ? '' : 'pixel diversi')));
      if(p && r && !uguali(p, r)) rotteViste++;
    }
    atteso('controprova: con --carta cambiata di un punto Chrome vede almeno una schermata diversa', rotteViste > 0, `(${rotteViste} schermate)`);
    if(process.env.FOTO){ fs.mkdirSync(process.env.FOTO, { recursive:true }); fs.readdirSync(radice).filter(f => f.endsWith('.png') && !f.startsWith('rotta')).forEach(f => fs.copyFileSync(path.join(radice, f), path.join(process.env.FOTO, f))); fs.cpSync(path.join(radice, 'nuova'), path.join(process.env.FOTO, 'pagine'), { recursive:true }); }
  } finally { server.close(); fs.rmSync(radice, { recursive: true, force: true }); }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
