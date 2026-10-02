// Fondamenta 100, tappa 3 — le letture di avvio partono insieme, in ondate, invece che una in fila all'altra.
//   node tools/banco/prova_avvio_ondate.js [cartella di prima]
// Il finto Supabase risponde solo quando la prova dà il via: ogni via è un'«ondata», e si conta
// quante ondate servono prima che l'app compaia (apertura normale con copia locale, prima apertura)
// e quante ne usa il rinfresco di sfondo al rientro. Il conteggio non dipende dalla velocità della
// macchina. Con una cartella di prima la stessa prova sulla pagina vecchia deve contare più ondate.
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
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const profilo = { id:U, first_name:'Ignazio', m2_skipped:true, train_start_date:'2026-08-24', obiettivo:'ricomposizione', usa_training:true, weight_kg:72, created_at:'2026-05-01T08:00:00Z' };
const lunedi = (k) => { const d = new Date(Date.UTC(2026, 8, 28)); d.setUTCDate(d.getUTCDate() - 7 * k); return d.toISOString().slice(0, 10); };
const quadri = () => Array.from({ length: 10 }, (_, k) => k + 1).map(k => ({ user_id:U, week_start:lunedi(k), version:2, picture:{ meta:{ week_start:lunedi(k), version:2, is_closed:true, errors:[], computed_at:'2026-09-28T06:00:00Z' } } }));
const proposte = () => [{ user_id:U, id:'c1', week_start:lunedi(1), kind:'keep', status:'pending', title:'x', reason:'x', evidence:{ numeri:[] } }];
const copiaLocale = { zt_cache: { profile: profilo, db:{ days:{} }, TARGET:{ kcal:1900, protein:143, carbs:190, fat:63 } } };

// Un cancello: le risposte aspettano `via()`; ogni via libera quelle in attesa e ne apre uno nuovo.
function cancello(){
  let apri, promessa = new Promise(r => { apri = r; });
  return { attesa: () => promessa, via(){ const a = apri; promessa = new Promise(r => { apri = r; }); a(); } };
}
async function conta(fatto, c, max = 30){
  let ondate = 0;
  await attendi(15);   // le richieste partono prima del primo via: altrimenti si conterebbe un'ondata vuota
  while(!fatto() && ondate < max){ c.via(); ondate++; await attendi(15); }
  return ondate;
}
// Dà il via finché non arrivano più richieste nuove: i caricamenti della Home sono finiti.
async function quiete(a){
  for(let ferme = 0; ferme < 3;){ const n = a.supa._calls.length; a.c.via(); await attendi(15); ferme = a.supa._calls.length === n ? ferme + 1 : 0; }
}
function avvia(conCopia, file){
  const c = cancello();
  const tables = { profiles:[profilo], weekly_pictures:quadri(), coach_proposals:proposte(), meals:[], meal_items:[], fasting_days:[], supplements_log:[], daily_log:[], app_errors:[], __attesa: c.attesa, __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } };
  const b = boot(tables, { file, now:'2026-10-02T12:00:00', locale: conCopia ? copiaLocale : {} });
  const d = b.win.document;
  return { ...b, c, appVisibile: () => d.getElementById('app').classList.contains('visible') };
}
async function misura(file){
  const r = {};
  let a = avvia(true, file);
  r.normale = await conta(a.appVisibile, a.c);
  r.normaleRichieste = a.supa._calls.length;
  a = avvia(false, file);
  r.prima = await conta(a.appVisibile, a.c);
  // rientro: refreshInBackground da solo, con l'app già aperta e i cancelli aperti fino a lì
  a = avvia(true, file);
  await conta(a.appVisibile, a.c); await quiete(a);
  const n0 = a.supa._calls.length;
  let finito = false; a.win.refreshInBackground().then(() => { finito = true; });
  r.rientro = await conta(() => finito, a.c);
  r.rientroRichieste = a.supa._calls.length - n0;
  r.errori = a.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length;
  return r;
}

(async () => {
  const dopo = await misura();
  console.log(`  --  ondate fino all'app: apertura normale ${dopo.normale} · prima apertura ${dopo.prima} · rientro ${dopo.rientro} (${dopo.rientroRichieste} richieste)`);
  atteso('apertura normale (copia locale) · 3 ondate', dopo.normale, 3);
  atteso('prima apertura (senza copia) · 4 ondate', dopo.prima, 4);
  atteso('rientro (rinfresco di sfondo) · 4 ondate, 14 richieste', [dopo.rientro, dopo.rientroRichieste], [4, 14]);
  atteso('zero errori in console', dopo.errori, 0);
  const prima = process.argv[2];
  if(prima){
    const p = await misura(path.join(prima, 'zona-tracker.html'));
    console.log(`  --  prima · apertura normale ${p.normale} · prima apertura ${p.prima} · rientro ${p.rientro} (${p.rientroRichieste} richieste)`);
    atteso('prima · la prova distingue: più ondate, stesse richieste', [p.normale > dopo.normale, p.prima > dopo.prima, p.rientro > dopo.rientro, p.rientroRichieste], [true, true, true, dopo.rientroRichieste]);
  } else console.log('  --  confronto con la pagina di prima saltato (nessuna cartella passata)');
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
