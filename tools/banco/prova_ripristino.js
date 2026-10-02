// Fondamenta 020: prova di ripristino della copia di sicurezza.
// L'app vera viene caricata due volte: una sui file della copia (client finto, nessuna rete)
// e una sul database vero. Se la copia contiene tutto, le due app vedono lo stesso storico:
// stessi giorni, stessi pasti con gli stessi ingredienti, stessi integratori, stesse pesate.
// Sola lettura. Va lanciata subito dopo la copia: un pasto registrato nel frattempo è uno scarto vero.
//   node tools/banco/prova_ripristino.js ~/zt-backup/dati/2026-10-02_0640 [email]
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
const { bootVivo } = require('./vivo');
const cartella = (process.argv[2] || '').replace(/^~/, process.env.HOME);
const email = process.argv[3] || 'ignazio.f@me.com';
if(!cartella || !fs.existsSync(path.join(cartella, 'MANIFEST.json'))){ console.log('uso: node tools/banco/prova_ripristino.js <cartella della copia> [email]'); process.exit(2); }
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(52), ok ? (typeof got === 'object' ? '' : got) : JSON.stringify(got).slice(0, 120) + ' ≠ ' + JSON.stringify(exp).slice(0, 120));
};
const manifest = JSON.parse(fs.readFileSync(path.join(cartella, 'MANIFEST.json'), 'utf8'));
const tabelle = {};
Object.keys(manifest.tabelle).forEach(t => { tabelle[t] = JSON.parse(fs.readFileSync(path.join(cartella, t + '.json'), 'utf8')); });
const utente = JSON.parse(fs.readFileSync(path.join(cartella, 'auth_users.json'), 'utf8')).find(u => u.email === email);
if(!utente){ console.log('  KO  account ' + email + ' non presente nella copia'); process.exit(1); }

// Lo stesso giro di letture sulle due app, e una fotografia confrontabile di ciò che l'app ha in memoria.
async function fotografia(win){
  const ST = win.eval('ST');
  ST.user = { id: utente.id, email };
  const supa = win.eval('supa');
  const p = await supa.from('profiles').select('*').eq('id', utente.id).maybeSingle();
  ST.profile = p.data;
  await win.loadCatalog();
  await win.loadSupps();
  await win.loadAllDays();
  await win.loadBodyLogs();
  const oggi = win.todayKey();
  const giorni = Object.keys(ST.db.days).filter(d => d !== oggi || ST.db.days[d].meals.length).sort();
  const perGiorno = {};
  giorni.forEach(d => {
    const g = ST.db.days[d];
    perGiorno[d] = {
      pasti: g.meals.map(m => [m.id, m.kcal, m.protein, m.carbs, m.fat, m.items.map(i => i.id).sort()]).sort(),
      digiuno: !!g.fasting,
      integratori: (g.rawSuppLogs || []).map(s => s.name + '@' + s.time).sort(),
    };
  });
  return {
    profilo: ST.profile,
    giorni, perGiorno,
    pasti: giorni.reduce((n, d) => n + ST.db.days[d].meals.length, 0),
    ingredienti: giorni.reduce((n, d) => n + ST.db.days[d].meals.reduce((a, m) => a + m.items.length, 0), 0),
    integratori: ST.supps.map(s => s.name).sort(),
    pesate: win.getWeighIns().map(w => [w.date, w.weight_kg]),
    corpo: win.getUnifiedBodyTimeline().map(r => [r.date, r.source, r.weight_kg, r.waist_cm]),
  };
}

(async () => {
  const copia = await fotografia(boot(tabelle).win);
  const vivo  = await fotografia(bootVivo().win);
  console.log(`copia del ${manifest.quando} · ${email}`);
  atteso('profilo', copia.profilo, vivo.profilo);
  atteso('giorni di storico: ' + vivo.giorni.length, copia.giorni, vivo.giorni);
  atteso('pasti: ' + vivo.pasti, copia.pasti, vivo.pasti);
  atteso('ingredienti: ' + vivo.ingredienti, copia.ingredienti, vivo.ingredienti);
  atteso('ogni giorno uguale (pasti, digiuni, integratori presi)', copia.perGiorno, vivo.perGiorno);
  atteso('integratori in libreria: ' + vivo.integratori.length, copia.integratori, vivo.integratori);
  atteso('pesate: ' + vivo.pesate.length, copia.pesate, vivo.pesate);
  atteso('misure e check nel tab Body: ' + vivo.corpo.length, copia.corpo, vivo.corpo);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK: l\'app sulla copia vede lo stesso storico dell\'app sul database vero');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
