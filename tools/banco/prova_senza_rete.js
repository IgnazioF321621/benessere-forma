// Fondamenta 120 — senza rete: pasti, digiuni, integratori presi e pesate vanno in coda e partono quando la rete torna;
// la striscia «Sei senza rete» dice quali dati si vedono; un errore dell'API non va in coda.
//   node tools/banco/prova_senza_rete.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(70), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-10-02';
async function nuovo() {
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], supplements_log:[], weight_logs:[], supplements:[{ id:'s1', user_id:U, name:'Omega', slot:'08:00', sort_order:1 }] };
  const b = boot(t, { now:OGGI + 'T12:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadSupps();
  let inLinea = true;
  Object.defineProperty(b.win.navigator, 'onLine', { get: () => inLinea, configurable:true });
  const rete = (v) => { inLinea = v; b.win.dispatchEvent(new b.win.Event(v ? 'online' : 'offline')); };
  const scritture = () => b.supa._calls.filter(c => c.op !== 'select' && c.table !== 'app_errors').map(c => c.table + ':' + c.op);   // app_errors: le segnalazioni degli errori, non sono dell'utente
  const coda = () => JSON.parse(b.win.localStorage.getItem('zt_coda_' + U) || '[]');
  const striscia = () => { const el = b.win.document.getElementById('senza-rete'); return el.classList.contains('visible') ? el.textContent : ''; };
  const toast = () => b.win.document.getElementById('toast').textContent;
  return { ...b, ST, t, rete, scritture, coda, striscia, toast };
}
(async () => {
  // 1) con la rete: si scrive subito, niente in coda
  {
    const a = await nuovo();
    await a.win.dbToggleFasting(OGGI, true);
    atteso('con la rete · digiuno scritto subito, coda vuota', [a.scritture(), a.coda().length], [['fasting_days:upsert'], 0]);
  }
  // 2) senza rete: tutto in coda, in ordine; i dati si vedono subito in memoria
  {
    const a = await nuovo();
    a.ST.ultimoCompletoAt = a.win.Date.now();
    a.rete(false);
    atteso('senza rete · la striscia dice l\'ora dei dati', a.striscia(), 'Sei senza rete: vedi i dati delle 12:00');
    await a.win.dbToggleFasting(OGGI, true);
    atteso('digiuno senza rete · nessuna chiamata, 1 in coda, avviso', [a.scritture(), a.coda().length, a.toast()], [[], 1, '📴 Salvato sul telefono: lo invio appena torna la rete']);
    const pasto = await a.win.dbAddMeal({ slot:'pranzo', description:'riso', kcal:500, protein:20, carbs:80, fat:10, time:'13:00' });
    atteso('pasto senza rete · ha un id scelto dal telefono, 2 in coda', [/^[0-9a-f-]{36}$/.test(pasto.id), a.coda().length], [true, 2]);
    await a.win.toggleSuppTaken('s1', 'Omega');
    atteso('integratore preso senza rete · in memoria subito, 4 in coda (tolgo + metto)', [a.win.getDay(OGGI).suppsTaken, a.coda().length], [['s1'], 4]);
    a.ST.weighInSheet = { value:'72.3' };
    await a.win.confirmWeighIn();
    atteso('pesata senza rete · fra le pesate in memoria, 5 in coda', [(a.ST.weightLogs || []).map(w => w.date + ' ' + w.weight_kg), a.coda().length], [[OGGI + ' 72.3'], 5]);
    atteso('striscia · conta i salvataggi da inviare', a.striscia(), 'Sei senza rete: vedi i dati delle 12:00 · 5 salvataggi da inviare');
    // una lettura fallita senza rete non fa comparire un avviso: lo dice gia' la striscia
    a.t.__rete = false;
    a.win.document.getElementById('toast').textContent = '';
    await a.win.dbq('leggere una cosa', a.win.eval('supa').from('meals').select('*'));
    atteso('lettura fallita senza rete · nessun avviso', a.toast(), '');
    a.t.__rete = undefined;
    // la rete torna: la coda parte da sola, in ordine
    a.rete(true);
    for(let i = 0; i < 100 && a.coda().length; i++) await attendi(10);
    atteso('rete tornata · coda inviata in ordine', a.scritture().slice(0, 5), ['fasting_days:upsert', 'meals:insert', 'supplements_log:delete', 'supplements_log:insert', 'weight_logs:upsert']);
    atteso('rete tornata · coda vuota, il pasto e la pesata sono in tabella', [a.coda().length, a.t.meals.some(m => m.id === pasto.id), a.t.weight_logs.length], [0, true, 1]);
    await attendi(30);
    atteso('rete tornata · striscia sparita', a.striscia(), '');
  }
  // 3) la rete c'e' ma non risponde: una chiamata fallita, poi coda; l'inserimento gia' arrivato (23505) conta come fatto
  {
    const a = await nuovo();
    a.t.__rete = false;
    const p = await a.win.dbAddMeal({ slot:'cena', description:'pesce', kcal:400, protein:40, carbs:10, fat:20, time:'20:00' });
    atteso('rete muta · una chiamata fallita e il pasto in coda', [a.scritture(), a.coda().length], [['meals:insert'], 1]);
    // in realta' la riga era arrivata al server
    a.t.__rete = undefined; a.t.meals.push({ ...p });
    const n = await a.win.svuotaCoda();
    atteso('riga gia\' arrivata (23505) · esce dalla coda senza doppioni', [n, a.coda().length, a.t.meals.filter(m => m.id === p.id).length], [1, 0, 1]);
  }
  // 4) un errore dell'API (una regola del database) non va in coda: si avvisa
  {
    const a = await nuovo();
    a.t.__rifiuta = { fasting_days:{ code:'42501', message:'permission denied' } };
    await a.win.dbToggleFasting(OGGI, true);
    atteso('errore dell\'API · niente in coda, avviso a schermo', [a.coda().length, a.toast()], [0, '⚠️ Non riesco a segnare il giorno di digiuno: riprova']);
  }
  // 5) pasto con ingredienti senza rete: pasto e ingredienti in coda, in memoria con i loro id
  {
    const a = await nuovo();
    a.rete(false);
    a.ST.logSlot = 'pranzo';
    a.win._initSmartForm();
    a.ST.smartForm.items = [{ name:'riso', quantity:100, unit:'g', kcal:130, protein:3, carbs:28, fat:0.3 }, { name:'pollo', quantity:150, unit:'g', kcal:240, protein:45, carbs:0, fat:5 }];
    await a.win.smartSavePasto();
    const m = a.win.getDay(OGGI).meals[0];
    atteso('pasto con ingredienti senza rete · 2 operazioni in coda, in memoria con gli id', [a.coda().map(x => x.op.tabella + ':' + x.op.tipo), !!m && m.items.length, !!m && m.items.every(i => /^[0-9a-f-]{36}$/.test(i.id) && i.meal_id === m.id)], [['meals:insert', 'meal_items:insert'], 2, true]);
    a.rete(true);
    for(let i = 0; i < 100 && a.coda().length; i++) await attendi(10);
    atteso('rete tornata · pasto e ingredienti in tabella', [a.t.meals.length, a.t.meal_items.length], [1, 2]);
    atteso('zero errori in console', a.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
