// Fondamenta 045: quante richieste manda l'app a Supabase a ogni apertura e a ogni rientro.
// Conta le chiamate a supa.from(...) nel banco (finto client, nessuna rete), tabella per tabella:
// ogni chiamata è una richiesta vera, e ogni richiesta vera finisce nei registri (Log Ingestion).
//   node tools/banco/conta_richieste.js                 # A prima apertura · B apertura normale · C rientro · D giro dei tab
//   TRACCIA=coach_proposals node tools/banco/conta_richieste.js   # da quali funzioni partono le letture di una tabella
process.env.TZ = 'Europe/Rome';
const path = require('path');
const { boot } = require('./banco');
const U = 'u1';
const profilo = { id:U, first_name:'Ignazio', m2_skipped:false, train_start_date:'2026-08-24', obiettivo:'ricomposizione', usa_training:true, weight_kg:72 };
const lunedi = (k) => { const d = new Date(Date.UTC(2026, 8, 28)); d.setUTCDate(d.getUTCDate() - 7 * k); return d.toISOString().slice(0, 10); };
const quadri = Array.from({ length: 10 }, (_, k) => k + 1).map(k => ({ user_id:U, week_start:lunedi(k), version:2, picture:{ meta:{ week_start:lunedi(k), version:2, is_closed:true, errors:[], computed_at:'2026-09-28T06:00:00Z' } } }));
const tabelle = () => ({ profiles:[profilo], weekly_pictures:quadri, body_checks:[{ id:'c1', user_id:U, status:'completed', created_at:'2026-09-01' }], daily_log:[], app_errors:[] });
// ogni proprietà sconosciuta del finto client (es. .or, .not) diventa un passaggio neutro, così la catena arriva in fondo
function avvolgi(t){
  return new Proxy(t, { get(o, p){
    const v = o[p];
    if(v === undefined && typeof p === 'string' && p !== 'then') return () => avvolgi(o);
    if(typeof v === 'function') return (...a) => { const r = v.apply(o, a); return (r && typeof r === 'object' && !(r instanceof Promise)) ? avvolgi(r) : r; };
    return v;
  } });
}
function prepara(cache){
  const b = boot(tabelle(), { now:'2026-10-02T12:00:00' });
  const vero = b.supa.from; const conta = {};
  b.supa.from = (t) => { conta[t] = (conta[t] || 0) + 1; if(process.env.TRACCIA === t){ const st = new Error().stack.split('\n').slice(2, 9).map(l => (l.match(/at (?:async )?([\w$.<>]+)/) || [])[1] || '?').join(' < '); console.log('   ' + t + ' da: ' + st); } return avvolgi(vero(t)); };
  b.conta = conta; b.azzera = () => { for(const k in conta) delete conta[k]; };
  b.ST = b.win.eval('ST'); b.ST.user = { id:U, email:'ignazio.f@me.com' };
  if(cache) b.win.localStorage.setItem(b.win.eval('ZT_CACHE_KEY'), cache);
  return b;
}
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const stampa = (titolo, conta) => { const tot = Object.values(conta).reduce((a, b) => a + b, 0); console.log(`\n${titolo}: ${tot} richieste`); Object.entries(conta).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`   ${String(n).padStart(3)}  ${t}`)); return tot; };
(async () => {
  // A) prima apertura: niente copia locale
  const a = prepara(null);
  await a.win.loadAndStart(); await attendi(300);
  stampa('A) prima apertura (senza copia locale), fino alla Home', a.conta);
  const cache = a.win.localStorage.getItem(a.win.eval('ZT_CACHE_KEY')); a.win.close();
  console.log('   copia locale scritta:', cache ? (cache.length / 1024).toFixed(1) + ' KB' : 'no');
  // B) apertura normale: copia locale presente
  const b = prepara(cache);
  await b.win.loadAndStart(); await attendi(300);
  stampa('B) apertura normale (con copia locale), fino alla Home', b.conta);
  // C) rientro nell'app dopo 30 secondi
  b.azzera();
  await b.win.refreshInBackground(); await attendi(300);
  stampa('C) rientro nell\'app (refreshInBackground)', b.conta);
  // D) cambio tab: Home → Body → Training → Home
  b.azzera();
  for(const p of ['body', 'training', 'home']){ b.win.showPage(p); await attendi(200); }
  stampa('D) giro dei tab Body → Training → Home', b.conta);
  const errori = b.logs.filter(l => l[0] !== 'warn').slice(0, 5);
  console.log('\nerrori in console (primi 5):', JSON.stringify(errori));
  process.exit(0);
})();
