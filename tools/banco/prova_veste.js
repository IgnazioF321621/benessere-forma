// La veste nuova, Giro 1 (Passo 0, scelte di Ignazio del 29/10/2026): l'interruttore html.v5.
// Spento (il default) la pagina non ha la classe e l'aspetto è quello di prima (lo misura prova_stile.js in Chrome, pixel per pixel);
// acceso con ?v5=1 o dalle Impostazioni › Crediti, la classe c'è, resta sul telefono (zt_v5) e in Chrome vero la barra sta in basso,
// la testata della Home è del colore della zona Home, i riquadri di Nutrition, Training e Body dei loro colori e i campi a 16 px.
//   node tools/banco/prova_veste.js
//   FOTO=/una/cartella node tools/banco/prova_veste.js     # tiene le foto della Home a 390 px, spenta e accesa
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFile } = require('child_process');
const { boot } = require('./banco');
const REPO = path.join(__dirname, '..', '..');
const U = 'u1', OGGI = '2026-10-04';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const add = (k, d) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const base = { uso:'principale', luogo:'casa', attrezzo:'elastico', livello:'intermedio', muscoli:'', setup:'', esecuzione:'', errori:'', zone_rischio:'' };
const catalogo = [['EX001','Panca elastico','spinta orizzontale'], ['EX020','Rematore elastico','tirata orizzontale'], ['EX040','Squat elastico','dominante ginocchia'],
  ['EX050','Stacco rumeno elastico','dominante anca']].map(([codice, nome, pattern]) => ({ ...base, codice, nome, pattern, gruppo_target:'' }));
const ex = (codice) => ({ codice, name: catalogo.find(c => c.codice === codice).nome, sets:3, reps:'8-12' });
// scenario: 'base' (pesata oggi, dentro l'obiettivo) · 'su' (oltre l'obiettivo, peso che sale via dall'obiettivo, niente pesata oggi)
// · 'giu' (peso che scende verso l'obiettivo, niente pesata oggi)
function tabelle(scenario = 'base'){
  const meals = [], pesi = [];
  for(let d = 0; d < 14; d++){
    const k = add(OGGI, -d);
    const tanto = scenario === 'su' && d === 0;
    meals.push({ id:'m' + d, user_id:U, date:k, slot:'pranzo', time:'13:00', kcal: tanto ? 3100 : 650, protein: tanto ? 240 : 42, carbs: tanto ? 330 : 70, fat: tanto ? 110 : 20, description:'Riso e pollo', notes:'' });
    if(scenario === 'base' && d % 2 === 0) pesi.push({ id:'p' + d, user_id:U, date:k, weight_kg: +(74 - d * 0.05).toFixed(2), created_at:k + 'T07:30:00Z' });
  }
  if(scenario !== 'base') [[1, scenario === 'su' ? 74.6 : 73.4], [3, 74.0]].forEach(([d, kg]) => pesi.push({ id:'p' + d, user_id:U, date:add(OGGI, -d), weight_kg:kg, created_at:add(OGGI, -d) + 'T07:30:00Z' }));
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, sesso:'M', eta:45, altezza_cm:178, weight_kg:74, goal_weight_kg:70, obiettivo:'ricomposizione',
      target_kcal:2300, target_protein:170, target_carbs:220, target_fat:75, giorni_allenamento:4, tipo_allenamento:'casa', attrezzatura:['elastico'],
      train_start_date:'2026-09-21', usa_training:true, created_at:'2026-05-01T08:00:00Z' }],
    meals, meal_items:[], weight_logs:pesi, supplements_log:[], fasting_days:[], daily_log:[], app_errors:[], supplements:[], nutrilite_catalog:[],
    esercizi_catalog:catalogo, schede_utente:[{ id:'sc1', user_id:U, attiva:true, blocco_n:1, scheda:{ obiettivo:'ricomposizione', sessioni:[
      { id:'upperA', name:'Upper A', type:'Forza', rir:2, warmup:[], exercises:['EX001','EX020'].map(ex) },
      { id:'lowerA', name:'Lower A', type:'Forza', rir:2, warmup:[], exercises:['EX040','EX050'].map(ex) }] } }],
    workouts:[], training_logs:[], training_notes:[], body_logs:[], body_measurements:[], body_checks:[], blood_tests:[], body_check_ai:[],
    weekly_pictures:[], coach_proposals:[], weekly_plans:[], weekly_plan_meals:[],
  };
}
async function apri(opts){
  const t = tabelle(opts.scenario); t.__sessione = { user:{ id:U, email:'ignazio.f@me.com' } };
  const b = boot(t, { now:OGGI + 'T18:00:00', ...opts, locale:{ zt_privacy_ok:'x', zt_installa_visto:'1', ...(opts.locale || {}) } });
  await b.avviato;
  for(let i = 0; i < 500 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  await attendi(200);
  // come su un telefono: la barra che l'app sceglie per gli schermi stretti (updateNavVisibility)
  Object.defineProperty(b.win, 'innerWidth', { value:390, configurable:true }); b.win.updateNavVisibility();
  b.win.showPage('home'); await attendi(150); b.win.renderHomeV2();
  return b;
}
const classe = (b) => b.win.document.documentElement.classList.contains('v5');
const chiave = (b) => b.win.localStorage.getItem('zt_v5');
// la pagina com'è, senza codice, con lo stile vero accanto: è lei che Chrome misura e fotografa
function fotografa(win){
  const doc = win.document.cloneNode(true);
  doc.querySelectorAll('script').forEach(s => s.remove());
  doc.querySelectorAll('link[rel=stylesheet]').forEach(l => { if(/stile\.css/.test(l.getAttribute('href') || '')) l.setAttribute('href', 'stile.css'); });
  doc.querySelectorAll('style').forEach(s => { if(s.textContent.includes('--font-sans')) s.replaceWith(Object.assign(doc.createElement('link'), { rel:'stylesheet', href:'stile.css' })); });
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}

(async () => {
  // ── 1. l'interruttore ──
  { const b = await apri({});
    atteso('di partenza spenta: niente classe v5, niente chiave sul telefono', [classe(b), chiave(b)], [false, null]);
    b.win.openSettingsModal(); b.win.setVai('crediti');
    const sw = b.win.document.getElementById('set-veste');
    atteso('Impostazioni › Crediti: l\'interruttore c\'è ed è spento', [!!sw, sw && sw.getAttribute('role'), sw && sw.getAttribute('aria-checked')], [true, 'switch', 'false']);
    sw.click();
    atteso('tocco: si accende, classe e chiave, l\'interruttore dice acceso', [classe(b), chiave(b), sw.getAttribute('aria-checked')], [true, '1', 'true']);
    sw.click();
    atteso('secondo tocco: si spegne, la chiave va via', [classe(b), chiave(b), sw.getAttribute('aria-checked')], [false, null, 'false']);
    b.win.close(); }
  { const b = await apri({ locale:{ zt_v5:'1' } });
    atteso('con la chiave sul telefono parte accesa', classe(b), true);
    b.win.close(); }
  { const b = await apri({ url:'https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?test=0&v5=1&da=link#sezione' });
    atteso('?v5=1 la accende e la ricorda', [classe(b), chiave(b)], [true, '1']);
    atteso('letto, ?v5 esce dall\'indirizzo e gli altri parametri e il # restano', [b.win.location.search, b.win.location.hash], ['?test=0&da=link', '#sezione']);
    b.win.close(); }
  { const b = await apri({ url:'https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?v5=0', locale:{ zt_v5:'1' } });
    atteso('?v5=0 la spegne e toglie la chiave', [classe(b), chiave(b)], [false, null]);
    b.win.close(); }

  // ── 2. in Chrome vero, la Home a 390 px: spenta e accesa ──
  const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if(!fs.existsSync(CHROME)){ atteso('Chrome trovato', false, true); console.log(`\n${ko} KO`); process.exit(1); }
  const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-veste-'));
  fs.copyFileSync(path.join(REPO, 'app', 'stile.css'), path.join(radice, 'stile.css'));
  // la pagina disegnata dal banco; per 'su' e 'giu' anche il pasto suggerito dal piano («Registra») e «Ultimo pasto N h fa»:
  // la Home li prende dal Piano e dall'ora, qui si danno già pronti (cambia solo cosa c'è da disegnare, non come)
  const pagine = {};
  for(const sc of ['base', 'su', 'giu']){
    const b = await apri({ scenario:sc });
    if(sc !== 'base'){ b.win._nutrProssimoDalPiano = () => ({ slot:'cena', piatto:'Salmone e patate', descrizione:'Salmone e patate' }); b.win._nutrOreDallUltimo = () => 5; b.win.renderHomeV2(); }
    pagine[sc] = fotografa(b.win);
    b.win.close();
  }
  // contrasto WCAG di ogni testo dei tre riquadri pieni, col fondo vero (il primo antenato con un fondo non trasparente)
  const MISURA = `<script>addEventListener('load',()=>setTimeout(()=>{const g=(s,p)=>{const e=document.querySelector(s);return e?getComputedStyle(e)[p]:null;};
const rgb=c=>{const m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const v=m[1].split(',').map(Number);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1};};
const lum=c=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);};
const fondo=e=>{let bg={r:255,g:255,b:255,a:0},x=e;while(x){const c=rgb(getComputedStyle(x).backgroundColor);if(c&&c.a>0.5)return c;x=x.parentElement;}return {r:245,g:243,b:238,a:1};};
const contrasto=e=>{const a=lum(rgb(getComputedStyle(e).color)),b=lum(fondo(e));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
const W='.home-v2-card[onclick*="showPage(\\'oggi\\')"],#home-card-training,.home-v2-card[onclick*="showPage(\\'body\\')"]';
const testi=[...document.querySelectorAll(W)].flatMap(c=>[...c.querySelectorAll('*')]).filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.offsetParent!==null);
const tutti=testi.map(e=>({t:e.textContent.trim().slice(0,30),c:Math.round(contrasto(e)*100)/100}));
const di=s=>{const e=document.querySelector(s);return e&&e.offsetParent!==null?Math.round(contrasto(e)*100)/100:null;};
const r={barra:g('#bottom-nav','display'),nav:g('#nav','display'),testa:g('.home-v2-header','backgroundColor'),nutr:g('.home-v2-card[onclick*="showPage(\\'oggi\\')"]','backgroundColor'),
train:g('#home-card-training','backgroundColor'),body:g('.home-v2-card[onclick*="showPage(\\'body\\')"]','backgroundColor'),
voce:g('#bottom-nav .nav-btn.active','color'),spenta:g('#bottom-nav .nav-btn:not(.active)','color'),insetto:g('#segnala','bottom'),
campi:[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]),select,textarea')].map(e=>parseFloat(getComputedStyle(e).fontSize)).filter(x=>x<16).length,
trainW:(document.querySelector('#home-card-training')||{}).offsetWidth||0,riga:(document.querySelector('.home-v2-wrap')||{}).offsetWidth||0,largo:document.documentElement.scrollWidth,finestra:window.innerWidth,
testi:tutti.length,peggiori:tutti.filter(x=>x.c<4.5),pesata:di('.home-v2-body-pesata'),registra:di('.home-v2-nutr-btn'),oltre:di('.home-v2-donut-num[style*="B45309"]'),
macroOltre:document.querySelectorAll('.home-v2-macro-value[style*="B45309"]').length,macroOltreC:di('.home-v2-macro-value[style*="B45309"]'),delta:di('.home-v2-body-delta'),
deltaColore:g('.home-v2-body-delta','color'),avviso:di('.home-v2-nutr-avviso'),oltreColore:g('.home-v2-donut-num','color'),anello:g('.home-v2-donut-svg circle + circle','strokeDasharray')};
document.documentElement.setAttribute('data-misura',JSON.stringify(r));},300));</script>`;
  const scrivi = (nome, html, v5) => {
    let h = html.replace('</body>', MISURA + '</body>');
    if(v5) h = h.replace(/<html([^>]*)>/, (m, a) => /class="/.test(a) ? m.replace('class="', 'class="v5 ') : `<html${a} class="v5">`);
    fs.writeFileSync(path.join(radice, nome + '.html'), h);
    // a 390 px dentro un riquadro: Chrome senza testa non scende sotto i 500 px di finestra
    fs.writeFileSync(path.join(radice, '_' + nome + '.html'), `<!doctype html><body style="margin:0"><iframe src="${nome}.html" style="border:0;width:390px;height:2400px"></iframe>`);
  };
  scrivi('spenta', pagine.base, false); scrivi('accesa', pagine.base, true); scrivi('accesa_su', pagine.su, true); scrivi('accesa_giu', pagine.giu, true);
  const chrome = (args) => new Promise(ok => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=6000', ...args],
    { maxBuffer: 64 * 1024 * 1024, timeout: 90000 }, (err, out) => ok(String(out || ''))));
  const misura = async (nome) => {
    const m = (await chrome(['--window-size=390,2400', '--dump-dom', 'file://' + path.join(radice, nome + '.html')])).match(/data-misura="([^"]*)"/);
    return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')) : null;
  };
  try {
    const s = await misura('spenta'), a = await misura('accesa'), su = await misura('accesa_su'), giu = await misura('accesa_giu');
    atteso('Chrome ha risposto per le quattro pagine', [!!s, !!a, !!su, !!giu], [true, true, true, true]);
    if(s && a && su && giu){
      atteso('spenta: niente testata colorata (la Home di prima)', s.testa, 'rgba(0, 0, 0, 0)');
      atteso('accesa: la barra in basso c\'è, quella in alto no', [a.barra, a.nav], ['flex', 'none']);
      atteso('accesa: testata della zona Home (--z-home #2A7A6F)', a.testa, 'rgb(42, 122, 111)');
      atteso('accesa: riquadri Nutrition, Training, Body nei colori pieni delle zone', [a.nutr, a.train, a.body], ['rgb(163, 95, 0)', 'rgb(46, 109, 164)', 'rgb(106, 85, 160)']);
      atteso('accesa: voce aperta della barra nello scuro di Home, le altre in --t2', [a.voce, a.spenta], ['rgb(31, 92, 83)', 'rgb(85, 80, 71)']);
      atteso('accesa: Training e Body affiancati (metà riga ciascuno)', a.trainW > a.riga * 0.4 && a.trainW < a.riga * 0.55, true);
      atteso('accesa: nessuno scorrimento in orizzontale', a.largo <= a.finestra, true);
      atteso(`accesa: nessun campo sotto i 16 px (spenta: ${s.campi})`, a.campi, 0);
      atteso('accesa: l\'insetto del feedback sopra la barra (72 px dal fondo)', a.insetto, '72px');
      for(const [nome, m] of [['dentro l\'obiettivo', a], ['oltre l\'obiettivo, peso su', su], ['peso giù', giu]])
        atteso(`accesa, ${nome}: ogni testo dei riquadri pieni almeno 4,5:1 (${m.testi} testi)`, m.peggiori, []);
      atteso('pesata mancante: «+ pesata di oggi» leggibile (≥ 4,5:1)', su.pesata >= 4.5, true);
      atteso('pasto suggerito: «Registra» leggibile (≥ 4,5:1)', su.registra >= 4.5, true);
      atteso('oltre l\'obiettivo: kcal nel colore «oltre» (--over), leggibile', [su.oltreColore, su.oltre >= 4.5], ['rgb(180, 83, 9)', true]);
      atteso('oltre l\'obiettivo: i macro oltre nel colore «oltre», leggibili', [su.macroOltre > 0, su.macroOltreC >= 4.5], [true, true]);
      atteso('oltre l\'obiettivo: l\'anello pieno diventa tratteggiato', su.anello, '5px, 4px');
      atteso('dentro l\'obiettivo: il numero delle kcal resta bianco, l\'anello non è tratteggiato', [a.oltreColore, a.anello !== '5px, 4px'], ['rgb(255, 255, 255)', true]);
      atteso('peso che sale via dall\'obiettivo: rosso (--err), leggibile', [su.deltaColore, su.delta >= 4.5], ['rgb(184, 76, 42)', true]);
      atteso('peso che scende verso l\'obiettivo: verde (--acc), leggibile', [giu.deltaColore, giu.delta >= 4.5], ['rgb(42, 122, 111)', true]);
      atteso('«Ultimo pasto N h fa» nel colore «oltre», leggibile', su.avviso >= 4.5, true);
    }
    if(process.env.FOTO){
      fs.mkdirSync(process.env.FOTO, { recursive:true });
      for(const n of ['spenta', 'accesa', 'accesa_su', 'accesa_giu']){
        const f = path.join(process.env.FOTO, `home_${n}_390.png`);
        await chrome(['--window-size=600,2400', '--screenshot=' + f, 'file://' + path.join(radice, '_' + n + '.html')]);
        console.log('  foto  ' + f);
      }
    }
  } finally { fs.rmSync(radice, { recursive:true, force:true }); }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
