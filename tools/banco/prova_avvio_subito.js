// Fondamenta 100, tappa 2 — il BOOTSTRAP parte subito: niente attesa fissa di 1,8 secondi.
//   node tools/banco/prova_avvio_subito.js [cartella di prima]
// Qui la pagina parte da sola, come nel telefono: nessuno chiama loadAndStart a mano. Si misura
// quanto passa dal caricamento della pagina alla schermata, con una persona già entrata e la copia
// locale sul telefono, e senza nessuno entrato. Con una cartella di prima (git archive di un commit
// precedente) la stessa misura sulla pagina vecchia deve dare circa 1,8 secondi: più di uno e mezzo.
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
const profilo = { id:U, first_name:'Ignazio', m2_skipped:true, train_start_date:'2026-08-24', obiettivo:'ricomposizione', usa_training:true, weight_kg:72 };
const NOW = '2026-10-02T12:00:00';
const lunedi = (k) => { const d = new Date(Date.UTC(2026, 8, 28)); d.setUTCDate(d.getUTCDate() - 7 * k); return d.toISOString().slice(0, 10); };
const quadri = () => Array.from({ length: 10 }, (_, k) => k + 1).map(k => ({ user_id:U, week_start:lunedi(k), version:2, picture:{ meta:{ week_start:lunedi(k), version:2, is_closed:true, errors:[], computed_at:'2026-09-28T06:00:00Z' } } }));
const proposte = () => [{ user_id:U, id:'c1', week_start:lunedi(1), kind:'keep', status:'pending', title:'x', reason:'x', evidence:{ numeri:[] } }];
const copiaLocale = { zt_cache: { profile: profilo, db:{ days:{} }, TARGET:{ kcal:1900, protein:143, carbs:190, fat:63 } } };

// Fa partire la pagina e aspetta la prima schermata: ritorna quale e dopo quanti millisecondi.
function avvio(entrato, file){
  const tables = { profiles:[profilo], weekly_pictures:quadri(), coach_proposals:proposte(), daily_log:[], app_errors:[] };
  if(entrato) tables.__sessione = { user:{ id:U, email:'ignazio.f@me.com' } };
  const b = boot(tables, { file, locale: entrato ? copiaLocale : {} });
  const t0 = Date.now();   // da qui: la pagina è caricata e i suoi script sono partiti
  const d = b.win.document;
  const quale = () => d.getElementById('app').classList.contains('visible') ? 'app'
    : d.getElementById('auth-screen').classList.contains('visible') ? 'accesso'
    : d.getElementById('onboarding-screen').classList.contains('visible') ? 'onboarding' : null;
  return new Promise(res => {
    const giro = setInterval(() => {
      const q = quale(); const ms = Date.now() - t0;
      if(q || ms > 4000){
        clearInterval(giro);
        // la Home si disegna al fotogramma dopo (Fondamenta 100, tappa 1): un fotogramma di attesa prima di leggerla
        b.win.requestAnimationFrame(() => res({ b, schermata:q, ms, splashNascosto: d.getElementById('splash').classList.contains('hide') }));
      }
    }, 5);
  });
}

(async () => {
  // 1. persona già entrata, copia locale presente: l'app compare subito
  let a = await avvio(true);
  console.log(`  --  entrato, con copia locale: schermata «${a.schermata}» dopo ${a.ms} ms`);
  atteso('entrato · schermata app, splash tolto, entro mezzo secondo', [a.schermata, a.splashNascosto, a.ms < 500], ['app', true, true]);
  atteso('entrato · la Home è disegnata', /Ignazio/.test(a.b.win.document.getElementById('page-home').textContent), true);
  atteso('entrato · zero errori in console', a.b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);

  // 2. nessuno entrato: la schermata di accesso, subito
  a = await avvio(false);
  console.log(`  --  non entrato: schermata «${a.schermata}» dopo ${a.ms} ms`);
  atteso('non entrato · schermata di accesso, entro mezzo secondo', [a.schermata, a.ms < 500], ['accesso', true]);
  atteso('non entrato · nessuna richiesta a Supabase', a.b.supa._calls.length, 0);

  // 3. la pagina di prima, stesse condizioni: almeno 1,8 secondi
  const prima = process.argv[2];
  if(prima){
    const file = path.join(prima, 'zona-tracker.html');
    const p1 = await avvio(true, file), p2 = await avvio(false, file);
    console.log(`  --  prima · entrato: «${p1.schermata}» dopo ${p1.ms} ms · non entrato: «${p2.schermata}» dopo ${p2.ms} ms`);
    atteso('prima · la prova distingue: più di un secondo e mezzo in entrambi i casi', [p1.schermata, p1.ms > 1500, p2.schermata, p2.ms > 1500], ['app', true, 'accesso', true]);
  } else console.log('  --  confronto con la pagina di prima saltato (nessuna cartella passata)');

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
