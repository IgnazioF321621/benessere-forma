// Body 070 — «bene» e «male» secondo l'obiettivo della persona.
// Una regola sola (direzioneBuona) per Misure e Tendenza: il peso che sale è verde in ipertrofia e rosso in
// dimagrimento; petto e fianchi che crescono sono «bene» in ipertrofia; l'obiettivo si legge anche con più
// chiavi o chiavi vecchie; l'obiettivo vita «89 → 85» non è più scritto nel codice.
//   node tools/banco/prova_body_direzione.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const NOW = '2026-10-13T09:00:00';
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const VERDE = '#2A7A6F', ROSSO = '#B84C2A';

function avvia(profilo, misure){
  const tabelle = {
    weight_logs: [ { user_id:U, id:'wl1', date:'2026-10-01', weight_kg:72 }, { user_id:U, id:'wl2', date:'2026-10-13', weight_kg:73 } ],
    body_logs: misure || [ { user_id:U, id:'bl1', date:'2026-10-01', waist_cm:88, chest_cm:94, hip_cm:98 }, { user_id:U, id:'bl2', date:'2026-10-12', waist_cm:89, chest_cm:96, hip_cm:99 } ],
    body_checks: [], body_measurements: [], meals:[], workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[], body_check_ai:[],
  };
  const b = boot(tabelle, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, created_at:'2026-05-01T08:00:00Z', ...profilo };
  ST.page = 'body'; ST.bodyTrendRange = 'all';
  return { ...b, ST };
}
// il colore del delta di una metrica nelle card di Tendenza
const coloreCard = (b, nome) => {
  const card = [...b.win.document.querySelectorAll('.trend-metric-card')].find(c => c.querySelector('.trend-metric-name') && c.querySelector('.trend-metric-name').textContent === nome);
  if(!card) return null;
  const m = card.innerHTML.match(/color:(#[0-9A-Fa-f]{6}|var\(--t3\))[^>]*>[^<]*(?:\+|−)/);
  return m ? m[1] : null;
};

(async () => {
  let b = avvia({ obiettivo:'dimagrimento' });
  const dir = b.win.direzioneBuona, verso = b.win.direzionePeso;
  // ── la regola da sola ──
  atteso('verso: dal peso obiettivo prima di tutto', [verso({ goal_weight_kg:68 }, 72), verso({ goal_weight_kg:80 }, 72), verso({ goal_weight_kg:72.5 }, 72)], ['dimagrire', 'massa', 'neutra']);
  atteso('verso: più chiavi e chiavi vecchie', [verso({ obiettivo:'ricomposizione,ipertrofia' }), verso({ obiettivo:'perdita_peso' }), verso({ obiettivo:'massa_muscolare' }), verso({ obiettivo:'longevita' }), verso({})], ['massa', 'dimagrire', 'massa', 'neutra', 'neutra']);
  const D = { obiettivo:'dimagrimento' }, M = { obiettivo:'ipertrofia' }, N = { obiettivo:'mantenimento' };
  atteso('peso: su è male se dimagrisci, bene se metti massa, neutro altrimenti', [dir('peso', +1, D), dir('peso', +1, M), dir('peso', +1, N), dir('peso', -1, D)], ['male', 'bene', 'neutra', 'bene']);
  atteso('petto e fianchi: su è bene in ipertrofia, male in dimagrimento', [dir('petto', +2, M), dir('fianchi', +2, M), dir('petto', +2, D), dir('fianchi', -2, D), dir('petto', +2, N)], ['bene', 'bene', 'male', 'bene', 'neutra']);
  atteso('vita: giù è bene; in ipertrofia è neutra', [dir('vita', -1, D), dir('vita', +1, D), dir('vita', +1, M), dir('vita', +1, N)], ['bene', 'male', 'neutra', 'male']);
  atteso('grasso giù e massa magra su: bene per tutti', [dir('bf', -1, M), dir('grassa', +1, M), dir('viscerale', -1, D), dir('magra', +1, D), dir('magra', -1, M)], ['bene', 'male', 'bene', 'bene', 'male']);
  atteso('variazione minima o assente: neutra', [dir('peso', 0.01, D), dir('peso', null, D), dir('x', 5, D)], ['neutra', 'neutra', 'neutra']);

  // ── Misure: peso +1 e vita +1 ──
  await b.win.loadBodyLogs();
  b.ST.bodyTab = 'misure'; b.win.renderBody();
  let html = b.win.document.getElementById('page-body').innerHTML;
  const colorePeso = (h) => (h.match(/color:(#[0-9A-Fa-f]{6}|var\(--t3\));margin-left:6px;">\+1\.0/) || [])[1] || null;
  const coloreVita = (h) => (h.match(/color:(#[0-9A-Fa-f]{6}|var\(--t3\));margin-left:4px;">\+1\.0/) || [])[1] || null;
  atteso('Misure dimagrimento · peso +1 rosso, vita +1 rossa', [colorePeso(html), coloreVita(html)], [ROSSO, ROSSO]);
  atteso('Misure · niente «89 → 85» fisso, vita con valore e variazione senza barra', [/89 → 85/.test(html), /obiettivo &lt; 85/.test(html), /Vita<\/span>/.test(html)], [false, false, true]);

  b = avvia({ obiettivo:'ipertrofia' }); await b.win.loadBodyLogs();
  b.ST.bodyTab = 'misure'; b.win.renderBody();
  html = b.win.document.getElementById('page-body').innerHTML;
  atteso('Misure ipertrofia · peso +1 verde, vita +1 neutra', [colorePeso(html), coloreVita(html)], [VERDE, 'var(--t3)']);

  // ── obiettivo vita nel profilo (facoltativo): barra con partenza dalla prima misura ──
  b = avvia({ obiettivo:'dimagrimento', goal_waist_cm:85 }); await b.win.loadBodyLogs();
  b.ST.bodyTab = 'misure'; b.win.renderBody();
  html = b.win.document.getElementById('page-body').innerHTML;
  atteso('obiettivo vita dal profilo · barra 88 → 85, allontanandosi 0%', [/obiettivo &lt; 85 cm/.test(html), /0% completato \(88 → 85 cm\)/.test(html)], [true, true]);

  // ── Tendenza: le card seguono la stessa regola ──
  b = avvia({ obiettivo:'ipertrofia' }); await b.win.loadBodyLogs();
  b.ST.bodyTab = 'tendenza'; b.win.renderBody();
  atteso('Tendenza ipertrofia · peso e petto su verdi, vita su neutra', [coloreCard(b, 'Peso'), coloreCard(b, 'Petto'), coloreCard(b, 'Vita')], [VERDE, VERDE, 'var(--t3)']);
  b = avvia({ obiettivo:'ricomposizione,dimagrimento' }); await b.win.loadBodyLogs();
  b.ST.bodyTab = 'tendenza'; b.win.renderBody();
  atteso('Tendenza con due chiavi · peso e petto su rossi', [coloreCard(b, 'Peso'), coloreCard(b, 'Petto'), coloreCard(b, 'Vita')], [ROSSO, ROSSO, ROSSO]);
  atteso('Tendenza · frase del progresso coerente («Hai preso»)', /Hai preso 1 kg/.test(b.win.document.getElementById('page-body').textContent), true);

  const errori = b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1]));
  atteso('nessun errore della pagina', errori.length, 0);
  console.log(ko ? `\nKO: ${ko}` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
