// Home 170: «Come stai adesso?», un foglio a orari fissi (di base 11 · 15 · 19, al massimo 3). Chiede
// energia e stress con le parole di Home 160 e «Hai dormito ulteriormente?»; una riga in `rilevazioni`
// solo alla risposta (scriviConCoda, id del telefono), daily_log non si tocca. Non legge dal database:
// ora del telefono e copia locale di oggi. Un orario mostrato non torna; se ne sono passati più d'uno
// compare solo l'ultimo. Mai in pausa, con una seduta aperta o sopra un altro foglio. Orari nelle
// Impostazioni (profiles.come_stai_orari). Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_come_stai_adesso.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;

async function app(ora, o){
  o = o || {};
  const t = { profiles:[Object.assign({ id:U, first_name:'Ignazio', m2_skipped:true }, o.profilo || {})], meals:[], meal_items:[], fasting_days:[], supplements_log:[],
    daily_log:[], rilevazioni:[], app_errors:[], __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } };
  const b = boot(t, { now:`${OGGI}T${ora}:00`, file: process.argv[2], locale: Object.assign({ zt_installa_visto:'1' }, o.locale || {}) });
  await b.avviato;
  for(let i = 0; i < 300 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  let inLinea = true;
  Object.defineProperty(b.win.navigator, 'onLine', { get: () => inLinea, configurable:true });
  b.rete = (v) => { inLinea = v; };
  b.t = t; b.ST = b.win.eval('ST');
  b.foglio = () => b.win.document.querySelector('.csa-foglio');
  b.tocca = (campo, valore) => { const x = b.foglio() && b.foglio().querySelector(`[data-campo="${campo}"][data-valore="${valore}"]`); if(x) x.click(); };
  b.dovuto = () => typeof b.win.comeStaiAdessoDovuto === 'function' ? b.win.comeStaiAdessoDovuto() : 'manca';
  return b;
}

(async () => {
  // 1) alle 10 niente; alle 11:30 il foglio compare da solo all'ingresso, senza leggere niente
  {
    const b = await app('10:00');
    atteso('alle 10 nessun orario passato', b.dovuto(), null);
  }
  {
    const b = await app('11:30');
    await attendi(1700);
    const f = b.foglio();
    atteso('alle 11:30 compare all\'ingresso', [testo(f && f.querySelector('h3')), testo(f && f.querySelector('.csa-sotto'))], ['Come stai adesso?', 'Come vanno a quest\'ora i tuoi livelli di:']);
    atteso('energia con le parole di Home 160', f ? [...f.querySelectorAll('[data-campo="energy"]')].map(x => testo(x.querySelector('.csa-numero')) + ' ' + testo(x.querySelector('.csa-parola'))) : null, ['1 scarica', '2 bassa', '3 normale', '4 buona', '5 al top']);
    atteso('«Hai dormito ulteriormente?»', f ? [testo(f.querySelectorAll('.csa-etichetta')[2]), [...f.querySelectorAll('[data-campo="riposino_min"]')].map(testo)] : null,
      ['Hai dormito ulteriormente?', ['No', '15 min', '30 min', '1 h', '2 h o più']]);
    atteso('nessuna lettura di rilevazioni all\'avvio', b.supa._calls.filter(c => c.table === 'rilevazioni').length, 0);
    const salva = f && f.querySelector('.csa-salva');
    b.tocca('energy', 4);
    atteso('Salva spento finché manca lo stress', salva && salva.disabled, true);
    b.tocca('stress', 2); b.tocca('riposino_min', 30);
    atteso('Salva acceso con energia e stress', salva && salva.disabled, false);
    f.querySelector('.csa-nota').value = '  dopo pranzo ';
    salva.click(); await attendi(40);
    const r = b.t.rilevazioni[0] || {};
    atteso('una riga in rilevazioni', [b.t.rilevazioni.length, r.user_id, r.giorno, r.orario, r.energy, r.stress, r.riposino_min, r.note], [1, U, OGGI, 11, 4, 2, 30, 'dopo pranzo']);
    atteso('id scelto dal telefono e ora della risposta', [/^[0-9a-f-]{36}$/.test(r.id || ''), typeof r.rilevata_il], [true, 'string']);
    atteso('daily_log non si tocca', b.supa._calls.filter(c => c.table === 'daily_log' && c.op !== 'select').length, 0);
    atteso('il foglio si chiude; lo stesso orario non torna', [!!b.foglio(), b.dovuto()], [false, null]);
    b.win.comeStaiAdessoControlla(); await attendi(20);
    atteso('controllo di nuovo: nessun foglio', !!b.foglio(), false);
  }
  // 2) «Non ora»: nessuna riga e non torna; dopo le 19, senza risposte, solo l'ultimo orario
  {
    const b = await app('16:00');
    await attendi(1700);
    atteso('alle 16 si chiede l\'orario delle 15', b.foglio() ? 15 : null, 15);
    b.foglio().querySelector('.csa-non-ora').click(); await attendi(20);
    atteso('«Non ora»: nessuna scrittura, non torna', [b.supa._calls.filter(c => c.table === 'rilevazioni').length, b.dovuto()], [0, null]);
  }
  {
    const b = await app('20:30');
    atteso('alle 20:30 senza risposte: solo le 19', b.dovuto(), 19);
  }
  {
    const b = await app('16:00', { locale:{ ['zt_csa_' + U]: JSON.stringify({ giorno:'2026-10-13', mostrati:[11, 15, 19], risposte:[] }) } });
    atteso('la copia locale di ieri non conta', b.dovuto(), 15);
  }
  // 3) mai in pausa, con una seduta aperta, sopra un altro foglio; orari della persona
  {
    const b = await app('16:00', { profilo:{ pausa_inizio:'2026-10-10', pausa_fine:'2026-10-20', pausa_moduli:['cibo'] } });
    atteso('in pausa: niente', b.dovuto(), null);
  }
  {
    const b = await app('16:00');
    b.ST.trainSession = 'upperA';
    atteso('seduta di allenamento aperta: niente', b.dovuto(), null);
    b.ST.trainSession = null;
    b.win.avvisa('Altro foglio'); await attendi(1700);
    atteso('un altro foglio aperto: si aspetta', !!b.foglio(), false);
  }
  {
    const b = await app('10:00', { profilo:{ come_stai_orari:[9] } });
    atteso('orari della persona: le 9', [b.dovuto(), b.win.comeStaiAdessoOrari()], [9, [9]]);
  }
  {
    const b = await app('20:00', { profilo:{ come_stai_orari:[] } });
    atteso('orari vuoti: spento', b.dovuto(), null);
  }
  // 4) senza rete: in coda, non persa
  {
    const b = await app('15:10');
    await attendi(1700);
    b.rete(false);
    b.tocca('energy', 2); b.tocca('stress', 4);
    b.foglio().querySelector('.csa-salva').click(); await attendi(40);
    const coda = JSON.parse(b.win.localStorage.getItem('zt_coda_' + U) || '[]');
    atteso('senza rete: in coda', [coda.length, coda[0] && coda[0].op.tabella, coda[0] && coda[0].op.tipo, coda[0] && coda[0].op.righe[0].energy], [1, 'rilevazioni', 'insert', 2]);
  }
  // 5) Impostazioni: la riga e il foglio degli orari, scritti nel profilo
  {
    const b = await app('09:00');
    b.win.openSettingsModal();
    atteso('Impostazioni: orari di base', testo(b.win.document.getElementById('set-csa-stato')), '11:00 · 15:00 · 19:00');
    b.win.apriOrariComeStaiAdesso(); await attendi(20);
    const sel = [...b.win.document.querySelectorAll('.cs-select-orario')];
    if(sel.length === 3){ sel[0].value = '13'; sel[1].value = '8'; sel[2].value = ''; }
    const ok = b.win.document.querySelector('.foglio .foglio-ok'); if(ok) ok.click(); await attendi(40);
    const up = b.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').slice(-1)[0];
    atteso('salvati in ordine nel profilo', [up && up.payload, testo(b.win.document.getElementById('set-csa-stato'))], [{ come_stai_orari:[8, 13] }, '08:00 · 13:00']);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
