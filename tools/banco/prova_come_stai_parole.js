// Home 160: in «Come stai oggi» ogni livello di energia e di stress ha la sua parola, nella rotellina
// («4 · buona») e nella riga chiusa («Energia 4 buona»). Le parole stanno in un posto solo
// (DIARIO_PAROLE, diarioParola); il sonno resta in ore; nel database va sempre il numero.
// Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_come_stai_parole.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(58), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;

async function home(righe){
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], supplements_log:[],
    daily_log: righe || [], app_errors:[], __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } };
  const b = boot(t, { now:OGGI + 'T08:00:00', file: process.argv[2], locale:{ zt_installa_visto:'1' } });
  await b.avviato;
  for(let i = 0; i < 300 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  b.ST = b.win.eval('ST'); b.t = t;
  b.disegna = async () => { b.ST.page = 'home'; b.win.renderHomeV2(); await attendi(30); b.win.renderHomeV2(); };
  b.select = (campo) => b.win.document.querySelector(`#page-home .cs-select[onchange*="${campo}"]`);
  return b;
}

(async () => {
  {
    const b = await home();
    await b.disegna();
    const voci = (campo) => b.select(campo) ? [...b.select(campo).options].map(o => o.textContent) : null;
    atteso('energia: una parola per livello', voci('energy'), ['—', '1 · scarica', '2 · bassa', '3 · normale', '4 · buona', '5 · al top']);
    atteso('stress: una parola per livello', voci('stress'), ['—', '1 · calmo', '2 · sereno', '3 · normale', '4 · teso', '5 · al limite']);
    atteso('sonno: solo le ore', (voci('sleep_hours') || []).slice(0, 3), ['—', '3 h', '3,5 h']);
    atteso('i valori della rotellina restano i numeri', [...b.select('energy').options].map(o => o.value), ['', '1', '2', '3', '4', '5']);
    await b.win.comeStaiScegli('energy', '5'); await attendi(20);
    b.win.renderHomeV2();
    const riquadro = (campo) => { const v = b.select(campo) && b.select(campo).closest('.cs-valore'); return v ? [testo(v.querySelector('.cs-numero')), testo(v.querySelector('.cs-parola'))] : null; };
    atteso('riquadro: il numero e sotto la parola; vuoto «—»', [riquadro('energy'), riquadro('stress'), riquadro('sleep_hours')], [['5', 'al top'], ['—', null], ['—', null]]);
    atteso('nel database il numero, non la parola', (b.t.daily_log.find(r => r.date === OGGI) || {}).energy, 5);
    atteso('un posto solo: diarioParola', [b.win.diarioParola('energy', 1), b.win.diarioParola('stress', '5'), b.win.diarioParola('energy', null), b.win.diarioParola('sleep_hours', 7)],
      ['scarica', 'al limite', '', '']);
  }
  {
    const b = await home([{ id:'d1', user_id:U, date:OGGI, sleep_hours:7, energy:1, stress:5, day_type:null, note:null }]);
    await b.disegna(); await attendi(30); b.win.renderHomeV2();
    atteso('riga chiusa con le parole', testo(b.win.document.querySelector('#page-home .cs-riassunto')), 'Sonno 7 h · Energia 1 scarica · Stress 5 al limite');
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
