// Fondamenta 130 — primo avvio senza copia locale: se la lettura del profilo fallisce, l'app NON manda
// nell'onboarding (dove il profilo vero verrebbe riscritto) ma chiede di riprovare; senza riga di profilo
// (PGRST116) va nell'onboarding come prima.
//   node tools/banco/prova_avvio_senza_profilo.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const profilo = { id:U, first_name:'Ignazio', m2_skipped:true, obiettivo:'ricomposizione', weight_kg:72 };
const schermata = (d) => ['app', 'auth-screen', 'onboarding-screen', 'retry-screen', 'closed-screen'].find(id => d.getElementById(id).classList.contains('visible')) || 'nessuna';
async function avvia(tables) {
  Object.assign(tables, { meals:[], meal_items:[], fasting_days:[], supplements_log:[], __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } });
  const b = boot(tables, { now:'2026-10-02T12:00:00' });
  await b.avviato;
  for(let i = 0; i < 100 && schermata(b.win.document) === 'nessuna'; i++) await attendi(10);
  return b;
}
(async () => {
  // 1) la tabella profiles non risponde (errore diverso da «nessuna riga»)
  {
    const t = { profiles:[profilo], __assenti:['profiles'] };
    const a = await avvia(t);
    atteso('profilo non leggibile · schermata «Non riesco a collegarmi», non onboarding', schermata(a.win.document), 'retry-screen');
    atteso('profilo non leggibile · nessuna scrittura su profiles', a.supa._calls.filter(c => c.table === 'profiles' && c.op !== 'select').length, 0);
    // la rete torna: Riprova
    t.__assenti = [];
    await a.win.riprovaAvvio();
    for(let i = 0; i < 100 && schermata(a.win.document) !== 'app'; i++) await attendi(10);
    atteso('Riprova con la rete tornata · si entra nell\'app', [schermata(a.win.document), a.win.eval('ST').profile.first_name], ['app', 'Ignazio']);
  }
  // 2) nessuna riga di profilo: onboarding, come prima
  {
    const a = await avvia({ profiles:[] });
    atteso('profilo che non esiste (PGRST116) · onboarding', schermata(a.win.document), 'onboarding-screen');
  }
  // 3) profilo letto: app
  {
    const a = await avvia({ profiles:[profilo] });
    atteso('profilo letto · app', schermata(a.win.document), 'app');
    atteso('zero errori in console', a.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
