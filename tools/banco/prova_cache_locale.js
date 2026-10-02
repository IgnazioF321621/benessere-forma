// Fondamenta 100, tappa 6 — la copia locale salva solo gli ultimi 90 giorni e, se non entra, 14.
//   node tools/banco/prova_cache_locale.js [cartella di prima]
process.env.TZ = 'Europe/Rome';
const path = require('path');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const OGGI = '2026-10-02';
const giornoFa = (n) => { const d = new Date(Date.UTC(2026, 9, 2)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
// 400 giorni di storico in memoria, come dopo aver aperto Analisi a 6 mesi
function riempi(ST, giorni) {
  ST.db = { days:{} };
  for(let n = 0; n < giorni; n++) {
    const k = giornoFa(n);
    ST.db.days[k] = { key:k, meals:[{ id:'m' + k, date:k, slot:'pranzo', kcal:600, protein:30, carbs:60, fat:20, description:'pasto ' + n, items:[{ id:'i' + k, name:'ing', quantity:100, kcal:100 }] }], suppsTaken:['s1'], rawSuppLogs:[{ name:'Omega', time:'08:00', dose:1 }] };
  }
  ST.storicoCompleto = true;
}
async function nuovo(file) {
  const b = boot({ profiles:[] }, { file, now:OGGI + 'T12:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U }; ST.profile = { id:U, first_name:'Ignazio' }; ST.supps = []; ST.catalog = Array.from({ length:66 }, (_, i) => ({ codice:'C' + i, nome:'Prodotto ' + i, kcal:10 }));
  return { ...b, ST };
}
async function misura(file) {
  const a = await nuovo(file);
  riempi(a.ST, 400);
  a.win.saveCache();
  const salvata = JSON.parse(a.win.localStorage.getItem('zt_cache'));
  const chiavi = Object.keys(salvata.db.days).sort();
  return { bytes: a.win.localStorage.getItem('zt_cache').length * 2, giorni: chiavi.length, primo: chiavi[0], ultimo: chiavi[chiavi.length - 1] };
}

(async () => {
  const dopo = await misura();
  console.log(`  --  copia locale con 400 giorni in memoria: ${dopo.giorni} giorni salvati, ${dopo.bytes} byte`);
  atteso('salva solo gli ultimi 90 giorni (oggi compreso: 91)', [dopo.giorni, dopo.primo, dopo.ultimo], [91, giornoFa(90), OGGI]);
  {
    const a = await nuovo();
    riempi(a.ST, 400);
    atteso('misuraCache · 0 prima di salvare', a.win.misuraCache(), 0);
    a.win.saveCache();
    atteso('misuraCache · uguale a ST.cacheBytes dopo il salvataggio', [a.win.misuraCache() === a.ST.cacheBytes, a.ST.cacheBytes > 10000, a.ST.cacheGiorni], [true, true, 90]);
    // il tetto: localStorage rifiuta quello che supera 60 KB
    const orig = a.win.Storage.prototype.setItem;
    a.win.Storage.prototype.setItem = function(k, v){ if(String(v).length * 2 > 60000) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } return orig.call(this, k, v); };
    const ok = a.win.saveCache();
    const salvata = JSON.parse(a.win.localStorage.getItem('zt_cache'));
    atteso('tetto raggiunto · ripiega su 14 giorni e salva', [ok, a.ST.cacheGiorni, Object.keys(salvata.db.days).length, salvata.profile.first_name], [true, 14, 15, 'Ignazio']);
    a.win.Storage.prototype.setItem = function(){ const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
    atteso('tetto anche a 14 giorni · false, senza eccezioni, copia di prima intatta', [a.win.saveCache(), Object.keys(JSON.parse(a.win.localStorage.getItem('zt_cache')).db.days).length], [false, 15]);
    a.win.Storage.prototype.setItem = orig;
    // la copia si rilegge come prima
    const c = a.win.loadCache();
    atteso('loadCache · la copia ridotta si rilegge', [!!c, Object.keys(c.db.days).length, c.catalog.length], [true, 15, 66]);
  }
  const prima = process.argv[2];
  if(prima) {
    const p = await misura(path.join(prima, 'zona-tracker.html'));
    console.log(`  --  prima: ${p.giorni} giorni salvati, ${p.bytes} byte`);
    atteso('prima · la prova distingue: salvava tutti i 400 giorni, piu\' byte', [p.giorni, p.bytes > dopo.bytes * 3], [400, true]);
  } else console.log('  --  confronto con la pagina di prima saltato (nessuna cartella passata)');
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
