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
    meals, meal_items:[], weight_logs:pesi, supplements_log:[], fasting_days:[], daily_log: scenario === 'giu' ? [{ id:'d0', user_id:U, date:OGGI, sleep_hours:7, energy:4, stress:2 }] : [], app_errors:[], supplements:[], nutrilite_catalog:[],
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
    if(sc === 'base') pagine.spenta = fotografa(b.win);
    if(sc === 'giu') b.win.eval('ST').comeStaiAperta = OGGI;   // Come stai compilato e ancora aperto: c'è «Fatto»
    if(sc !== 'base'){ b.win._nutrProssimoDalPiano = () => ({ slot:'cena', piatto:'Salmone e patate', descrizione:'Salmone e patate' }); b.win._nutrOreDallUltimo = () => 5; }
    // accesa: la classe come la mette lo script in testa, poi la Home ridisegnata (la settimana a righe la disegna home.js)
    b.win.document.documentElement.classList.add('v5'); b.win.renderHomeV2();
    pagine[sc] = fotografa(b.win);
    b.win.close();
  }
  // contrasto WCAG di ogni testo dei tre riquadri pieni, col fondo vero (il primo antenato con un fondo non trasparente)
  const MISURA = `<script>addEventListener('load',()=>setTimeout(()=>{const g=(s,p)=>{const e=document.querySelector(s);return e?getComputedStyle(e)[p]:null;};
const rgb=c=>{const m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const v=m[1].split(',').map(Number);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1};};
const lum=c=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);};
const fondo=e=>{let bg={r:255,g:255,b:255,a:0},x=e;while(x){const c=rgb(getComputedStyle(x).backgroundColor);if(c&&c.a>0.5)return c;x=x.parentElement;}return {r:245,g:243,b:238,a:1};};
// il colore come arriva all'occhio: la sua trasparenza per l'opacità dell'elemento e di tutti gli antenati, mescolato col fondo
const opac=e=>{let o=1,x=e;while(x){o*=parseFloat(getComputedStyle(x).opacity);x=x.parentElement;}return o;};
const contrasto=e=>{const c=rgb(getComputedStyle(e).color),f=fondo(e),al=c.a*opac(e),m={r:c.r*al+f.r*(1-al),g:c.g*al+f.g*(1-al),b:c.b*al+f.b*(1-al)};const a=lum(m),b=lum(f);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
const W='.home-v2-card[onclick*="showPage(\\'oggi\\')"],#home-card-training,.home-v2-card[onclick*="showPage(\\'body\\')"]';
const testi=[...document.querySelectorAll(W+',.home-v2-header')].flatMap(c=>[...c.querySelectorAll('*')]).filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.offsetParent!==null);
const tutti=testi.map(e=>({t:e.textContent.trim().slice(0,30),c:Math.round(contrasto(e)*100)/100}));
const di=s=>{const e=document.querySelector(s);return e&&e.offsetParent!==null?Math.round(contrasto(e)*100)/100:null;};
const r={barra:g('#bottom-nav','display'),nav:g('#nav','display'),testa:g('.home-v2-header','backgroundColor'),nutr:g('.home-v2-card[onclick*="showPage(\\'oggi\\')"]','backgroundColor'),
train:g('#home-card-training','backgroundColor'),body:g('.home-v2-card[onclick*="showPage(\\'body\\')"]','backgroundColor'),
voce:g('#bottom-nav .nav-btn.active','color'),spenta:g('#bottom-nav .nav-btn:not(.active)','color'),insetto:g('#segnala','bottom'),
campi:[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]),select,textarea')].map(e=>parseFloat(getComputedStyle(e).fontSize)).filter(x=>x<16).length,
trainW:(document.querySelector('#home-card-training')||{}).offsetWidth||0,riga:(document.querySelector('.home-v2-wrap')||{}).offsetWidth||0,largo:document.documentElement.scrollWidth,finestra:window.innerWidth,
testi:tutti.length,peggiori:tutti.filter(x=>x.c<4.5),pesata:di('.home-v2-body-pesata'),registra:di('.home-v2-nutr-btn'),oltre:di('.home-v2-donut-num[style*="B45309"]'),
macroOltre:document.querySelectorAll('.home-v2-macro-value[style*="B45309"]').length,macroOltreC:di('.home-v2-macro-value[style*="B45309"]'),delta:di('.home-v2-body-delta'),
deltaColore:g('.home-v2-body-delta','color'),
ordine:(()=>{const tutti=[...document.querySelectorAll('*')];return ['.home-v2-header','.sez5','.home-v2-action','.home-v2-card[onclick*="showPage(\\'oggi\\')"]','#home-card-training','.cs-card','.cp-card','.wp5'].map(x=>{const e=document.querySelector(x);return e?tutti.indexOf(e):null;});})(),
sez5:[...document.querySelectorAll('.sez5 > span:first-child')].map(e=>e.textContent.trim()),
testaAzione:g('.home-v2-action-head','display'),fatto:(()=>{const e=[...document.querySelectorAll('.cs-link')].find(x=>/Fatto/.test(x.textContent));return e?Math.round(e.getBoundingClientRect().height):null;})(),
wp5:document.querySelectorAll('.wp5-riga').length,freccia:di('.wp5-freccia'),wpVecchia:!!document.querySelector('.wp-hero-card'),
etichette:[...document.querySelectorAll('.sez5 span,.cp-head > *,.wp5-sez,.wp5-sez span')].map(e=>({t:e.textContent.trim().slice(0,24),c:Math.round(contrasto(e)*100)/100})),
righe5:[...document.querySelectorAll('.wp5-riga *:not(.wp5-freccia)')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>({t:e.textContent.trim().slice(0,24),c:Math.round(contrasto(e)*100)/100})),avviso:di('.home-v2-nutr-avviso'),oltreColore:g('.home-v2-donut-num','color'),anello:g('.home-v2-donut-svg circle + circle','strokeDasharray')};
document.documentElement.setAttribute('data-misura',JSON.stringify(r));},300));</script>`;
  const scrivi = (nome, html, v5) => {
    let h = html.replace('</body>', MISURA + '</body>');
    if(v5) h = h.replace(/<html([^>]*)>/, (m, a) => /class="/.test(a) ? m.replace('class="', 'class="v5 ') : `<html${a} class="v5">`);
    fs.writeFileSync(path.join(radice, nome + '.html'), h);
    // a 390 px dentro un riquadro: Chrome senza testa non scende sotto i 500 px di finestra
    fs.writeFileSync(path.join(radice, '_' + nome + '.html'), `<!doctype html><body style="margin:0"><iframe src="${nome}.html" style="border:0;width:390px;height:2400px"></iframe>`);
  };
  scrivi('spenta', pagine.spenta, false); scrivi('accesa', pagine.base, false); scrivi('accesa_su', pagine.su, false); scrivi('accesa_giu', pagine.giu, false);
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
        atteso(`accesa, ${nome}: ogni testo della testata e dei riquadri pieni almeno 4,5:1 (con l'opacità) (${m.testi} testi)`, m.peggiori, []);
      atteso('pesata mancante: «+ pesata di oggi» leggibile (≥ 4,5:1)', su.pesata >= 4.5, true);
      atteso('pasto suggerito: «Registra» leggibile (≥ 4,5:1)', su.registra >= 4.5, true);
      atteso('oltre l\'obiettivo: kcal nel colore «oltre» (--over), leggibile', [su.oltreColore, su.oltre >= 4.5], ['rgb(180, 83, 9)', true]);
      atteso('oltre l\'obiettivo: i macro oltre nel colore «oltre», leggibili', [su.macroOltre > 0, su.macroOltreC >= 4.5], [true, true]);
      atteso('oltre l\'obiettivo: l\'anello pieno diventa tratteggiato', su.anello, '5px, 4px');
      atteso('dentro l\'obiettivo: il numero delle kcal resta bianco, l\'anello non è tratteggiato', [a.oltreColore, a.anello !== '5px, 4px'], ['rgb(255, 255, 255)', true]);
      atteso('peso che sale via dall\'obiettivo: rosso (--err), leggibile', [su.deltaColore, su.delta >= 4.5], ['rgb(184, 76, 42)', true]);
      atteso('peso che scende verso l\'obiettivo: verde (--acc), leggibile', [giu.deltaColore, giu.delta >= 4.5], ['rgb(42, 122, 111)', true]);
      atteso('«Ultimo pasto N h fa» nel colore «oltre», leggibile', su.avviso >= 4.5, true);
      // Giro 1 della Home: l'ordine nuovo e la settimana a righe
      const crescente = (v) => v.every(x => x != null) && v.every((x, i) => !i || x > v[i - 1]);
      atteso('giro 1, ordine nel DOM (quello che leggono tastiera e VoiceOver): testata · Adesso · Nutrition · Training · Come stai · Pirsi · settimana', crescente(a.ordine), true);
      atteso('giro 1, spenta: l\'ordine di prima (Come stai prima della prossima azione), niente titoli nuovi, la settimana a card', [s.ordine[5] < s.ordine[2], s.ordine[1], s.wp5, s.wpVecchia], [true, null, 0, true]);
      atteso('giro 1, accesa: i titoli di sezione scritti nell\'HTML', a.sez5, ['Adesso', 'Le tue zone', 'Come stai oggi']);
      atteso('giro 1, accesa: «PROSSIMA AZIONE» dentro il riquadro non c\'è più (non si legge due volte)', a.testaAzione, 'none');
      atteso('giro 1, accesa: la settimana a righe (peso, obiettivo, sessioni, kcal), la card di prima no', [a.wp5, a.wpVecchia], [4, false]);
      atteso(`giro 1, accesa: ogni pezzo dei titoli di sezione (${a.etichette.length}, anche le date e l'ora) almeno 4,5:1`, a.etichette.filter(x => x.c < 4.5), []);
      atteso('giro 1, Come stai compilato: «Fatto» alto almeno 44 px', giu.fatto >= 44, true);
      atteso('giro 1, accesa: la freccia della settimana è un segno, non un testo: almeno 3:1', a.freccia >= 3, true);
      atteso(`giro 1, accesa: ogni testo della settimana a righe almeno 4,5:1 (${a.righe5.length} testi)`, a.righe5.filter(x => x.c < 4.5), []);
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

  // ── 3. Giro 1 del Training, la Seduta: elenco, serie in corso, recupero con il registro (veste accesa) e la seduta a veste spenta ──
  const radiceT = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-veste-t-'));
  fs.copyFileSync(path.join(REPO, 'app', 'stile.css'), path.join(radiceT, 'stile.css'));
  const momenti = {};
  for(const v5 of [false, true]){
    const b = await apri({ locale: v5 ? { zt_v5:'1' } : {} });
    const W = b.win, ST = W.eval('ST');
    W.callAI = async () => ''; W.cuePer = async () => '';
    ST.trainTab = 'piano'; W.showPage('training'); await attendi(200);
    ST.trainAnticipato = 'upperA'; W.openTrainingSession('upperA'); await attendi(500);
    momenti[v5 ? 'seduta' : 'seduta_spenta'] = fotografa(W);
    if(v5){
      W.openTrainExec('upperA', 'Panca elastico', 1); await attendi(300);
      momenti.serie = fotografa(W);
      W.trainExecFinishSet(); await attendi(500);
      momenti.registro = fotografa(W);
    }
    W.close();
  }
  // contrasto (con l'opacità, sul fondo vero) di ogni testo delle testate blu e del registro; altezza dei tasti; ordine delle domande
  const MISURA_T = `<script>addEventListener('load',()=>setTimeout(()=>{
const rgb=c=>{const m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const v=m[1].split(',').map(Number);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1};};
const lum=c=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);};
const fondo=e=>{let x=e;while(x){const c=rgb(getComputedStyle(x).backgroundColor);if(c&&c.a>0.5)return c;x=x.parentElement;}return {r:245,g:243,b:238,a:1};};
const opac=e=>{let o=1,x=e;while(x){o*=parseFloat(getComputedStyle(x).opacity);x=x.parentElement;}return o;};
const contrasto=e=>{const c=rgb(getComputedStyle(e).color),f=fondo(e),al=c.a*opac(e),m={r:c.r*al+f.r*(1-al),g:c.g*al+f.g*(1-al),b:c.b*al+f.b*(1-al)};const a=lum(m),b=lum(f);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
const vis=e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed';
const testi=s=>[...document.querySelectorAll(s)].flatMap(c=>[c,...c.querySelectorAll('*')]).filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&vis(e)).map(e=>({t:e.textContent.trim().slice(0,24),c:Math.round(contrasto(e)*100)/100}));
const alti=s=>[...document.querySelectorAll(s)].filter(vis).map(e=>({t:(e.getAttribute('aria-label')||e.textContent).trim().slice(0,20),h:Math.round(e.getBoundingClientRect().height)}));
const g=(s,p)=>{const e=document.querySelector(s);return e?getComputedStyle(e)[p]:null;};
const r={header:g('#header','display'),testa:g('.t5-testa','backgroundColor'),serieTesta:g('.train-exec-header','backgroundColor'),recupero:g('.rest-hero','backgroundColor'),
cronometro:document.querySelectorAll('#train-work-display').length,linguetteSopra:!!document.querySelector('.nutrition-subnav'),vecchioEsercizi:[...document.querySelectorAll('#page-training div')].some(d=>d.textContent.trim()==='ESERCIZI'),
sezioni:[...document.querySelectorAll('#page-training .sez5')].map(e=>e.textContent.trim()),
testi:testi('.t5-testa,.train-exec-header,.train-exec-ex-name,.train-exec-badges,.rest-hero,.tl5-registro').filter(x=>x.c<4.5),
tasti:alti('.t5-testa button,.t5-seduta .ex-add-set-btn,.train-exec-back,.train-exec-finish-btn,.rest-hero-skip,.tl5-salva,.tl5-chiudi').filter(x=>x.h<44),
nTasti:alti('.t5-testa button,.t5-seduta .ex-add-set-btn,.train-exec-back,.train-exec-finish-btn,.rest-hero-skip,.tl5-salva,.tl5-chiudi').length,
domande:[...document.querySelectorAll('.tl5-domanda')].map(e=>e.textContent.trim()),tendine:['tl-reps','tl-resist','tl-rir'].map(i=>!!document.getElementById(i))};
document.documentElement.setAttribute('data-misura',JSON.stringify(r));},300));</script>`;
  for(const [n, h] of Object.entries(momenti)){
    fs.writeFileSync(path.join(radiceT, n + '.html'), h.replace('</body>', MISURA_T + '</body>'));
    fs.writeFileSync(path.join(radiceT, '_' + n + '.html'), `<!doctype html><body style="margin:0"><iframe src="${n}.html" style="border:0;width:390px;height:${n === 'seduta' || n === 'seduta_spenta' ? 1750 : 844}px"></iframe>`);
  }
  const chromeT = (args) => new Promise(ok => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=6000', ...args],
    { maxBuffer: 64 * 1024 * 1024, timeout: 90000 }, (err, out) => ok(String(out || ''))));
  const misuraT = async (n) => { const m = (await chromeT(['--window-size=390,1750', '--dump-dom', 'file://' + path.join(radiceT, n + '.html')])).match(/data-misura="([^"]*)"/);
    return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')) : null; };
  try {
    const sp = await misuraT('seduta_spenta'), se = await misuraT('seduta'), sr = await misuraT('serie'), rg = await misuraT('registro');
    atteso('seduta: Chrome ha risposto per i quattro momenti', [!!sp, !!se, !!sr, !!rg], [true, true, true, true]);
    if(sp && se && sr && rg){
      atteso('seduta spenta: niente testata nuova, l\'intestazione dell\'app, le linguette in alto, «ESERCIZI» di prima', [sp.testa, sp.header !== 'none', sp.linguetteSopra, sp.vecchioEsercizi, sp.sezioni], [null, true, true, true, []]);
      atteso('seduta accesa: testata della zona Training (#2E6DA4) al posto dell\'intestazione dell\'app', [se.testa, se.header], ['rgb(46, 109, 164)', 'none']);
      atteso('seduta accesa: le linguette dentro la testata, un cronometro solo', [se.linguetteSopra, se.cronometro], [false, 1]);
      atteso('seduta accesa: i titoli di sezione nell\'HTML, nell\'ordine', se.sezioni, ['Prima di iniziare', 'Esercizi · 2']);
      atteso('serie in corso e recupero: le testate nel blu della zona', [sr.serieTesta, rg.recupero], ['rgb(46, 109, 164)', 'rgb(46, 109, 164)']);
      for(const [nome, m] of [['seduta', se], ['serie in corso', sr], ['recupero e registro', rg]]){
        atteso(`${nome}: ogni testo della testata (e del registro) almeno 4,5:1`, m.testi, []);
        atteso(`${nome}: ogni tasto alto almeno 44 px (${m.nTasti} tasti)`, m.tasti, []);
      }
      atteso('registro: tre domande numerate, nell\'ordine dello schizzo', rg.domande, ['1 · Quante ripetizioni?', '2 · Con quanto? (lbs)', '3 · Quante ne avevi ancora? (RIR)']);
      atteso('registro: le tendine di sempre (#tl-reps, #tl-resist, #tl-rir)', rg.tendine, [true, true, true]);
    }
    if(process.env.FOTO){
      fs.mkdirSync(process.env.FOTO, { recursive:true });
      for(const n of Object.keys(momenti)){
        const f = path.join(process.env.FOTO, `training_${n}_390.png`);
        await chromeT(['--window-size=600,1750', '--screenshot=' + f, 'file://' + path.join(radiceT, '_' + n + '.html')]);
        console.log('  foto  ' + f);
      }
    }
  } finally { fs.rmSync(radiceT, { recursive:true, force:true }); }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
