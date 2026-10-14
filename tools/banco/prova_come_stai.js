// Home 020: «Come stai oggi» in cima alla Home. Sonno (3-12 h a mezz'ora), energia e stress (1-5)
// con la rotellina del telefono (<select>), nota facoltativa. Ogni scelta si salva subito nel
// diario del giorno (daily_log), un campo alla volta; senza rete resta in coda; rifiutata dal
// database torna com'era. Con i tre valori la card si chiude su una riga dopo «Fatto».
// Il diario si legge una volta al giorno. Prima/dopo: sul file vecchio deve dare KO.
//   node tools/banco/prova_come_stai.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;

async function home(righe, opts){
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], supplements_log:[],
    daily_log: righe || [], app_errors:[], __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } };
  const b = boot(t, { now:OGGI + 'T08:00:00', file: process.argv[2], locale:{ zt_installa_visto:'1' }, ...(opts || {}) });
  await b.avviato;
  for(let i = 0; i < 300 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  let inLinea = true;
  Object.defineProperty(b.win.navigator, 'onLine', { get: () => inLinea, configurable:true });
  b.rete = (v) => { inLinea = v; };
  b.ST = b.win.eval('ST'); b.t = t;
  b.disegna = async () => { b.ST.page = 'home'; b.win.renderHomeV2(); await attendi(30); b.win.renderHomeV2(); };
  b.card = () => b.win.document.querySelector('#page-home .cs-card');
  b.select = (campo) => b.win.document.querySelector(`#page-home .cs-select[onchange*="${campo}"]`);
  b.letture = () => b.supa._calls.filter(c => c.table === 'daily_log' && c.op === 'select').length;
  b.scritture = () => b.supa._calls.filter(c => c.table === 'daily_log' && c.op === 'upsert');
  return b;
}

(async () => {
  // 1) giorno vuoto: la card c'è, in cima, con le tre rotelline e la nota
  {
    const b = await home();
    await b.disegna();
    const c = b.card();
    atteso('card presente, prima delle altre card della Home', !!c && c === b.win.document.querySelector('#page-home .home-v2-header').nextElementSibling, true);
    atteso('titolo', testo(c && c.querySelector('.cs-titolo')), 'Come stai oggi');
    atteso('tre rotelline: sonno, energia, stress', c ? [...c.querySelectorAll('.cs-select')].map(s => s.getAttribute('aria-label')) : null, ['Sonno', 'Energia', 'Stress']);
    const sonno = b.select('sleep_hours');
    const voci = sonno ? [...sonno.options].map(o => o.textContent) : [];
    atteso('sonno: «—» e poi da 3 a 12 h a mezz\'ora (19 voci)', [voci.length, voci[0], voci[1], voci[2], voci[voci.length - 1]], [20, '—', '3 h', '3,5 h', '12 h']);
    atteso('energia e stress da 1 a 5', [...b.select('energy').options].map(o => o.value), ['', '1', '2', '3', '4', '5']);
    atteso('nota facoltativa', !!(c && c.querySelector('textarea.cs-nota')), true);
    atteso('niente «Fatto» finché mancano dei valori', !!(c && [...c.querySelectorAll('.cs-link')].some(x => /Fatto/.test(x.textContent))), false);
    atteso('il diario letto una volta sola, anche con più disegni', b.letture(), 1);

    // 2) ogni scelta si salva subito, un campo alla volta
    b.win.comeStaiScegli('sleep_hours', '7.5'); await attendi(30);
    atteso('sonno salvato: solo quel campo, chiave persona+giorno', [b.scritture().length, b.scritture()[0] && b.scritture()[0].payload, b.scritture()[0] && b.scritture()[0].upsertOpts.onConflict],
      [1, [{ user_id:U, date:OGGI, sleep_hours:7.5 }], 'user_id,date']);
    atteso('la rotellina mostra il valore scelto', b.select('sleep_hours').value, '7.5');
    b.win.comeStaiScegli('energy', '4'); await attendi(20);
    b.win.comeStaiScegli('stress', '2'); await attendi(20);
    atteso('tre scritture, nel database la riga di oggi', [b.scritture().length, (({ sleep_hours, energy, stress }) => [sleep_hours, energy, stress])(b.t.daily_log.find(r => r.date === OGGI) || {})], [3, [7.5, 4, 2]]);
    let c2 = b.card();
    atteso('con i tre valori resta aperta, compare «Fatto»', [c2.classList.contains('cs-chiusa'), [...c2.querySelectorAll('.cs-link')].map(testo)], [false, ['Fatto']]);
    b.win.comeStaiScegli('note', '  dormito male  '); await attendi(20);
    atteso('nota salvata ripulita', (b.scritture()[3] || {}).payload, [{ user_id:U, date:OGGI, note:'dormito male' }]);
    b.win.comeStaiChiudi(); await attendi(30); b.win.renderHomeV2();
    c2 = b.card();
    atteso('«Fatto»: una riga sola con i tre valori e la nota', [c2.classList.contains('cs-chiusa'), testo(c2.querySelector('.cs-riassunto')), testo(c2.querySelector('.cs-riga-nota'))],
      [true, 'Sonno 7,5 h · Energia 4 buona · Stress 2 sereno', 'dormito male']);
    b.win.comeStaiApri(); await attendi(30); b.win.renderHomeV2();
    atteso('«Modifica» la riapre con i valori', [b.card().classList.contains('cs-chiusa'), b.select('energy').value, b.select('stress').value], [false, '4', '2']);
    b.win.comeStaiScegli('energy', ''); await attendi(20);
    atteso('«—» cancella il campo', [(b.scritture().slice(-1)[0] || {}).payload, b.ST.dailyLog[OGGI].energy], [[{ user_id:U, date:OGGI, energy:null }], null]);
    b.win.comeStaiScegli('sleep_hours', '30'); await attendi(20);
    atteso('valore fuori scala: non si scrive, avviso', [b.scritture().length, testo(b.win.document.getElementById('toast'))], [5, '⚠️ Le ore di sonno vanno da 0 a 24']);
  }
  // 3) giorno già compilato (anche da un altro telefono): la card si apre chiusa
  {
    const b = await home([{ id:'d1', user_id:U, date:OGGI, sleep_hours:6, energy:3, stress:4, day_type:null, note:null },
                          { id:'d0', user_id:U, date:'2026-10-12', sleep_hours:8, energy:5, stress:1 }]);
    await b.disegna(); await attendi(30); b.win.renderHomeV2();
    atteso('compilato: riga «Sonno 6 h · Energia 3 normale · Stress 4 teso»', [b.card() && b.card().classList.contains('cs-chiusa'), testo(b.card() && b.card().querySelector('.cs-riassunto'))], [true, 'Sonno 6 h · Energia 3 normale · Stress 4 teso']);
  }
  // 4) senza rete la scelta resta in coda e si vede; rifiutata dal database torna com'era
  {
    const b = await home();
    await b.disegna();
    b.rete(false);
    await b.win.comeStaiScegli('sleep_hours', '8');
    const coda = JSON.parse(b.win.localStorage.getItem('zt_coda_' + U) || '[]');
    atteso('senza rete: in coda, non perso, e la card lo mostra', [coda.length, coda[0] && coda[0].op.tabella, coda[0] && coda[0].op.righe, b.ST.dailyLog[OGGI].sleep_hours],
      [1, 'daily_log', [{ user_id:U, date:OGGI, sleep_hours:8 }], 8]);
    b.rete(true);
    await b.win.svuotaCoda();
    atteso('tornata la rete: arrivato nel database', (b.t.daily_log.find(r => r.date === OGGI) || {}).sleep_hours, 8);
    b.t.__rifiuta = { daily_log:{ code:'42501', message:'permission denied' } };
    await b.win.comeStaiScegli('energy', '5'); await attendi(30); b.win.renderHomeV2();
    atteso('rifiutata dal database: la scelta torna com\'era', [b.ST.dailyLog[OGGI].energy, b.select('energy').value], [null, '']);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
