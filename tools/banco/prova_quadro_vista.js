// Quadro settimanale — Lavoro B: la vista in quattro stati, dal caricamento al render.
// Passa per loadWeeklyPicture → _wpFetch → finto Supabase, cioè lo stesso percorso
// dell'app. Con un argomento (cartella) salva ogni stato come pagina statica da
// fotografare: il file vero renderizzato, senza script.
//   node tools/banco/prova_quadro_vista.js [cartella_uscita]
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
const OUT = process.argv[2] || null;

const U = 'u1';
const iso = (key, h) => new Date(key + 'T' + String(h || 8).padStart(2, '0') + ':00:00').toISOString();

function scenari(win){
  const cur = win.wpMonday();
  const d = (n) => win.wpAddDays(cur, n);            // n giorni dal lunedì corrente
  const oggi = win.todayKey();
  const finoAOggi = (arr) => arr.filter(r => (r.date || r.test_date || r.created_at.slice(0,10)) <= oggi);
  const pasti = (kcal) => finoAOggi([0,1,2,3,4,5,6].map(i => ({ user_id:U, id:'m'+i, date:d(i), slot:'pranzo', kcal: kcal[i], protein: Math.round(kcal[i] / 14) })));
  const base = { user_id:U, id:'p', first_name:'Ignazio', goal_weight_kg:68, target_kcal:2300, target_protein:170, giorni_allenamento:4, created_at: iso(d(-120)) };
  const lavoro = finoAOggi([
    { date:d(-7), session_type:'upperA' }, { date:d(-6), session_type:'lowerA' }, { date:d(-4), session_type:'upperB' }, { date:d(-3), session_type:'lowerB' },
    { date:d(0), session_type:'upperA' }, { date:d(1), session_type:'lowerA' }, { date:d(2), session_type:'recoveryUpper' }, { date:d(3), session_type:'upperB' }, { date:d(5), session_type:'lowerB' },
  ].map((w, i) => ({ user_id:U, id:'w'+i, completed:true, ...w })));
  const serie = finoAOggi([0,1,3,5].flatMap(g => Array.from({length:20}, (_, i) => ({ user_id:U, id:`s${g}-${i}`, date:d(g), session_id:'upperA', rir_actual: i % 3 === 0 ? 2 : 1 }))));
  const pesate = finoAOggi([-21,-14,-10,-7,-3,0,2,4].map((g, i) => ({ user_id:U, id:'wl'+i, date:d(g), weight_kg: 71.6 - (g + 21) * 0.05 })));
  return {
    'completi': {
      profile: { ...base, train_start_date: d(-7) },
      tables: {
        weight_logs: pesate, body_logs: [], meals: pasti([2250,2380,2190,2310,2420,2260,2330]),
        workouts: lavoro, training_logs: serie,
        body_checks: [ { user_id:U, id:'c1', status:'completed', created_at: iso(d(-40)) }, { user_id:U, id:'c2', status:'completed', created_at: iso(d(-9)) } ],
        body_measurements: [
          { user_id:U, id:'bm1', check_id:'c1', created_at: iso(d(-40)), weight_kg:71.2, waist_cm:89, hips_cm:95, chest_cm:98 },
          { user_id:U, id:'bm2', check_id:'c2', created_at: iso(d(-9)),  weight_kg:70.4, waist_cm:87.5, hips_cm:94, chest_cm:97 },
        ],
        blood_tests: [ { user_id:U, id:'b1', test_date: d(-60) } ],
      },
      atteso: { nr: false, parziale: false, checkDaFare: false },
    },
    'settimana vuota': {
      profile: { ...base, train_start_date: d(-2) },
      tables: { weight_logs:[], body_logs:[], meals:[], workouts:[], training_logs:[], body_checks:[], body_measurements:[], blood_tests:[] },
      atteso: { nr: true, parziale: false, checkDaFare: false },
    },
    'nutrizione parziale': {
      profile: { ...base, train_start_date: d(-7) },
      tables: { weight_logs: pesate, body_logs:[], meals: pasti([820,1150,640,1320,980,1210,700]), workouts: lavoro, training_logs: serie,
        body_checks: [ { user_id:U, id:'c2', status:'completed', created_at: iso(d(-9)) } ],
        body_measurements: [ { user_id:U, id:'bm2', check_id:'c2', created_at: iso(d(-9)), waist_cm:87.5, hips_cm:94 } ],
        blood_tests: [] },
      atteso: { nr: true, parziale: true, checkDaFare: false },
    },
    'check scaduto': {
      profile: { ...base, train_start_date: d(-90) },
      tables: { weight_logs: pesate, body_logs:[], meals: pasti([2250,2380,2190,2310,2420,2260,2330]), workouts: lavoro, training_logs: serie,
        body_checks: [ { user_id:U, id:'c1', status:'completed', created_at: iso(d(-60)) } ],
        body_measurements: [ { user_id:U, id:'bm1', check_id:'c1', created_at: iso(d(-60)), weight_kg:71.2, waist_cm:89, hips_cm:95, chest_cm:98 } ],
        blood_tests: [ { user_id:U, id:'b1', test_date: d(-60) } ] },
      atteso: { nr: false, parziale: false, checkDaFare: true },
    },
  };
}

function snapshot(win, file){
  // Pagina statica: head dell'app (CSS e font) + la Home renderizzata, niente script.
  const doc = win.document;
  const head = [...doc.head.querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"], meta[name="viewport"]')].map(n => n.outerHTML).join('\n');
  const home = doc.getElementById('page-home').outerHTML.replace('class="page"', 'class="page active"');
  fs.writeFileSync(file, `<!doctype html><html lang="it"><head><meta charset="utf-8">${head}
<style>body{margin:0;background:var(--bg);} .page{display:block!important;} #wp-shot{width:375px;margin:0 auto;}</style></head>
<body><div id="wp-shot">${home}</div></body></html>`);
}

(async () => {
  const { win: probe } = boot({});
  const nomi = Object.keys(scenari(probe));
  let ko = 0;
  for(const nome of nomi){
    const { win: tmp } = boot({});
    const s = scenari(tmp)[nome];
    const { win, logs } = boot({ ...s.tables, profiles: [s.profile] });
    const ST = win.eval('ST');
    ST.user = { id:U };
    ST.profile = s.profile;
    ST.TARGET = { kcal: s.profile.target_kcal, protein: s.profile.target_protein };
    ST.page = 'home';
    await win.loadWeeklyPicture(win.wpMonday(), { force:true });
    win.renderHomeV2();
    const card = win.document.getElementById('page-home').innerHTML;
    const cardOk = /La tua settimana/.test(card) && card.indexOf('La tua settimana') < card.indexOf('Nutrition');
    if(OUT) snapshot(win, path.join(OUT, `home-${nome.replace(/\s+/g, '-')}.html`));
    win.openQuadro();
    await new Promise(r => setTimeout(r, 50));
    const h = win.document.getElementById('page-home').innerHTML;
    const sezioni = ['Peso','Nutrizione','Allenamento','Corpo','Esami'].map(t => h.indexOf(`wp-sec-title">${t}<`));
    const ordine = sezioni.every((v, i) => v > 0 && (i === 0 || v > sezioni[i-1]));
    // nessuno 0 grande a schermo, tranne "Nel target ±10%" che è 0 su N giorni registrati
    const zeroFinto = (h.match(/wp-stat-val">0(<|\/)/g) || []).length > (/Nel target ±10%<\/div><div class="wp-stat-val">0</.test(h) ? 1 : 0);
    const esito = {
      card: cardOk,
      ordine,
      'non registrato': /Non registrato/.test(h) === s.atteso.nr,
      parziale: /wp-pill[^>]*>Parziale</.test(h) === s.atteso.parziale,
      'check da fare': /wp-pill[^>]*>Check da fare</.test(h) === s.atteso.checkDaFare,
      'nessuno zero al posto del vuoto': !zeroFinto,
      'freccia avanti spenta': /quadroShift\(1\)" disabled/.test(h),
      'errori console': logs.filter(l => l[0] === 'error' || (l[0] === 'jsdomError' && !/register/.test(l[1]))).length === 0,
    };
    const bad = Object.entries(esito).filter(([, v]) => !v).map(([k]) => k);
    if(bad.length) ko++;
    console.log((bad.length ? '  KO  ' : '  OK  ') + nome.padEnd(22), bad.length ? 'falliti: ' + bad.join(', ') : '');
    if(OUT) snapshot(win, path.join(OUT, `quadro-${nome.replace(/\s+/g, '-')}.html`));
    // freccia indietro: ricalcola la settimana prima e la mostra
    win.quadroShift(-1);
    await new Promise(r => setTimeout(r, 50));
    const h2 = win.document.getElementById('page-home').innerHTML;
    if(!/Settimana scorsa/.test(h2) || /quadroShift\(1\)" disabled/.test(h2)){ ko++; console.log('  KO  ' + nome + ' · freccia indietro'); }
    if(logs.length) console.log('        console:', logs.slice(0, 3).map(l => l[0] + ' ' + String(l[1]).slice(0, 90)).join(' | '));
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
