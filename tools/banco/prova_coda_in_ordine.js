// Fondamenta 260 — scriviConCoda non scavalca la coda: con salvataggi in attesa, anche con la rete accesa il
// nuovo va in fondo e parte il giro, cosi' l'ordine resta quello dei tocchi. Il caso trovato dal revisore di
// Stile 050: «togli X» resta in coda per la rete muta, «Annulla» rimette X; prima il rimetti andava diretto
// (23505, contava come fatto) e poi il togli arrivato dopo cancellava X dal database mentre a schermo c'era.
// Poi: un rifiuto del database in testa alla coda non la ferma per sempre (va da parte), una voce aggiunta
// mentre gira un giro non si perde, e chi aspetta riceve «in coda» o l'errore vero.
//   node tools/banco/prova_coda_in_ordine.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(72), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const OGGI = '2026-11-03';
const X = { id:'x1', user_id:U, date:OGGI, slot:'08:00', supplement_name:'Omega', supplement_id:'s1' };
async function nuovo() {
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], weight_logs:[], supplements:[], supplements_log:[{ ...X }] };
  const b = boot(t, { now:OGGI + 'T12:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' };
  Object.defineProperty(b.win.navigator, 'onLine', { get: () => true, configurable:true });   // la rete «accesa» ma muta
  const scritture = () => b.supa._calls.filter(c => c.op !== 'select' && c.table !== 'app_errors').map(c => c.table + ':' + c.op);
  const coda = () => JSON.parse(b.win.localStorage.getItem('zt_coda_' + U) || '[]');
  const toast = () => b.win.document.getElementById('toast').textContent;
  const scrivi = (operazione, op) => b.win.scriviConCoda(operazione, op);
  const togli = () => scrivi('togliere X', { tabella:'supplements_log', tipo:'delete', filtri:[['id', 'x1'], ['user_id', U]] });
  const rimetti = () => scrivi('rimettere X', { tabella:'supplements_log', tipo:'insert', righe:{ ...X } });
  return { ...b, ST, t, scritture, coda, toast, scrivi, togli, rimetti };
}
(async () => {
  // 1) Il caso del revisore: togli in coda per la rete muta, poi Annulla con la rete tornata
  {
    const a = await nuovo();
    a.t.__rete = false;
    const r1 = await a.togli();
    atteso('rete muta · il togli va in coda', [r1.inCoda, a.coda().length, a.t.supplements_log.length], [true, 1, 1]);
    a.t.__rete = undefined;   // la rete risponde di nuovo, ma il giro non è ancora partito
    const r2 = await a.rimetti();
    await attendi(30);
    atteso('Annulla · il rimetti parte dopo il togli, nell\'ordine dei tocchi', a.scritture().slice(-2), ['supplements_log:delete', 'supplements_log:insert']);
    atteso('Annulla · X resta nel database, come a schermo', a.t.supplements_log.map(r => r.id), ['x1']);
    atteso('Annulla · coda vuota, a chi chiama «fatto» (niente errore)', [a.coda().length, r2.error, !!r2.inCoda], [0, null, false]);
  }
  // 2) La rete resta muta: il nuovo va in fondo, chi chiama sente «in coda»
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.togli();
    const r2 = await a.rimetti();
    atteso('ancora muta · due in coda, in ordine', a.coda().map(c => c.operazione), ['togliere X', 'rimettere X']);
    atteso('ancora muta · a chi chiama «in coda», non «non salvato»', [r2.error, r2.inCoda], [null, true]);
    atteso('ancora muta · l\'avviso dice che lo manda appena la rete risponde', a.toast(), '📴 Salvato sul telefono: lo invio appena la rete risponde');
    a.t.__rete = undefined;
    await a.win.svuotaCoda();
    atteso('torna la rete · partono nell\'ordine, X c\'è', [a.coda().length, a.t.supplements_log.map(r => r.id)], [0, ['x1']]);
  }
  // 3) Un rifiuto del database in testa non ferma per sempre la coda: va da parte, il resto parte
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.scrivi('togliere il digiuno', { tabella:'fasting_days', tipo:'delete', filtri:[['user_id', U], ['date', OGGI]] });
    a.t.__rete = undefined;
    a.t.__rifiuta = { fasting_days:{ code:'PGRST100', message:'failed to parse filter' } };
    const r = await a.togli();
    await attendi(20);
    const daParte = JSON.parse(a.win.localStorage.getItem('zt_coda_scartate_' + U) || '[]');
    atteso('rifiuto in testa · messo da parte sul telefono, col codice', daParte.map(d => [d.operazione, d.codice]), [['togliere il digiuno', 'PGRST100']]);
    atteso('rifiuto in testa · il togli dietro parte lo stesso', [a.coda().length, a.t.supplements_log.length, r.error, !!r.inCoda], [0, 0, null, false]);
    // la voce di chi aspetta è quella rifiutata: torna il suo errore
    a.t.__rete = false;
    await a.togli();
    a.t.__rete = undefined;
    a.t.__rifiuta = { supplements_log:{ code:'23514', message:'check violation' } };
    const r3 = await a.rimetti();
    atteso('rifiutata proprio la sua · a chi chiama torna l\'errore vero', [r3.error && r3.error.code, a.coda().length], ['23514', 0]);
  }
  // 4) Accesso scaduto o guasto del server in testa: il giro si ferma e la voce resta (si riprova dopo)
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.togli();
    a.t.__rete = undefined;
    a.t.__rifiuta = { supplements_log:{ code:'PGRST301', message:'JWT expired' } };
    const r = await a.rimetti();
    atteso('accesso scaduto · niente da parte, tutto resta in coda in ordine', [a.coda().map(c => c.operazione), a.win.localStorage.getItem('zt_coda_scartate_' + U), r.inCoda], [['togliere X', 'rimettere X'], null, true]);
  }
  // 5) Una voce aggiunta mentre un giro è a metà non si perde (prima il giro riscriveva la lista che aveva letto)
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.togli();
    await a.scrivi('togliere il digiuno', { tabella:'fasting_days', tipo:'delete', filtri:[['user_id', U], ['date', OGGI]] });
    a.t.__rete = undefined;
    let apri; const cancello = new Promise(r => { apri = r; });
    a.t.__attesa = () => cancello;
    const giro = a.win.svuotaCoda();
    await attendi(10);
    const tardi = a.rimetti();   // arriva mentre il primo invio aspetta la risposta
    await attendi(10);
    a.t.__attesa = undefined; apri();
    await giro; const r = await tardi;
    await attendi(20);
    atteso('durante un giro · la voce nuova parte nello stesso giro, in fondo', a.scritture().slice(-3), ['supplements_log:delete', 'fasting_days:delete', 'supplements_log:insert']);
    atteso('durante un giro · coda vuota, X c\'è, «fatto» a chi chiama', [a.coda().length, a.t.supplements_log.map(x => x.id), r.error, !!r.inCoda], [0, ['x1'], null, false]);
  }
  // 4b) 42501 (token vecchio al rientro) si riprova: resta in coda; oltre 5 giri va da parte, e il resto parte
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.togli();
    a.t.__rete = undefined;
    a.t.__rifiuta = { supplements_log:{ code:'42501', message:'new row violates row-level security policy' } };
    await a.win.svuotaCoda();
    atteso('42501 · un giro: resta in coda, 1 tentativo, niente da parte', [a.coda().length, a.coda()[0] && a.coda()[0].tentativi, a.win.localStorage.getItem('zt_coda_scartate_' + U)], [1, 1, null]);
    for(let i = 0; i < 4; i++) await a.win.svuotaCoda();
    const daParte = JSON.parse(a.win.localStorage.getItem('zt_coda_scartate_' + U) || '[]');
    atteso('42501 · al quinto giro va da parte e la coda si libera', [a.coda().length, daParte.map(d => d.codice)], [0, ['42501']]);
  }
  // 4c) Un 23505 su una voce mai partita non vale «fatto»: è un altro vincolo (la serie già registrata altrove)
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.togli();
    a.t.__rete = undefined;
    a.t.supplements_log.push({ ...X, id:'x2' });
    a.t.__rifiuta = { supplements_log:{ code:'23505', message:'duplicate key value violates unique constraint "supplements_log_unico"' } };
    const r = await a.scrivi('salvare la serie', { tabella:'supplements_log', tipo:'insert', righe:{ ...X, id:'x3' } });
    atteso('23505 non sulla chiave · a chi chiama torna il rifiuto, non «fatto»', [r.error && r.error.code, a.coda().length], ['23505', 0]);
  }
  // 4c-bis) Un rifiuto senza codice che non è la rete (un gateway che risponde HTML) conta i giri e poi va da parte;
  // PGRST002 (database in riavvio) si riprova; una serie già registrata altrove non vale «fatto» nemmeno se la
  // richiesta poteva essere partita
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.togli();
    a.t.__rete = undefined;
    a.t.__rifiuta = { supplements_log:{ code:'', message:'<html>502 Bad Gateway</html>' } };
    for(let i = 0; i < 5; i++) await a.win.svuotaCoda();
    const daParte = JSON.parse(a.win.localStorage.getItem('zt_coda_scartate_' + U) || '[]');
    atteso('senza codice, non rete · dopo 5 giri da parte, la coda si libera', [a.coda().length, daParte.length], [0, 1]);
  }
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.togli();
    a.t.__rete = undefined;
    a.t.__rifiuta = { supplements_log:{ code:'PGRST002', message:'Could not query the database for the schema cache' } };
    await a.win.svuotaCoda();
    atteso('PGRST002 · si riprova: resta in coda, niente da parte', [a.coda().length, a.win.localStorage.getItem('zt_coda_scartate_' + U)], [1, null]);
  }
  {
    const a = await nuovo();
    a.t.__rete = false;
    const r0 = await a.scrivi('salvare la serie', { tabella:'supplements_log', tipo:'insert', righe:{ ...X, id:'x9' } });
    const q = a.coda(); q[0].tentato = true; a.win.localStorage.setItem('zt_coda_' + U, JSON.stringify(q));   // come dopo una rete caduta a metà
    a.t.__rete = undefined;
    a.t.__rifiuta = { supplements_log:{ code:'23505', message:'duplicate key value violates unique constraint "training_logs_una_serie"' } };
    await a.win.svuotaCoda();
    const daParte = JSON.parse(a.win.localStorage.getItem('zt_coda_scartate_' + U) || '[]');
    atteso('23505 su un altro vincolo, già tentata · da parte, non «fatto»', [r0.inCoda, a.coda().length, daParte.map(d => d.codice)], [true, 0, ['23505']]);
  }
  // 4d) I passi di un salvataggio solo: se il primo va da parte, anche gli altri (niente pasto senza ingredienti)
  {
    const a = await nuovo();
    a.t.__rete = false;
    const g = 'gruppo-1';
    await a.scrivi('salvare gli ingredienti del pasto', { tabella:'meal_items', tipo:'insert', righe:[{ id:'i1', meal_id:'m1', user_id:U }], gruppo:g });
    await a.scrivi('aggiornare il pasto', { tabella:'meals', tipo:'update', righe:{ kcal:500 }, filtri:[['id', 'm1'], ['user_id', U]], gruppo:g });
    await a.scrivi('togliere gli ingredienti di prima', { tabella:'meal_items', tipo:'delete', filtri:[['meal_id', 'm1'], ['user_id', U]], gruppo:g });
    await a.togli();
    a.t.__rete = undefined;
    a.t.__rifiuta = { meal_items:{ code:'22003', message:'numeric field overflow' } };
    await a.win.svuotaCoda();
    const daParte = JSON.parse(a.win.localStorage.getItem('zt_coda_scartate_' + U) || '[]');
    atteso('gruppo · il primo rifiutato porta da parte anche gli altri due', daParte.map(d => d.operazione), ['salvare gli ingredienti del pasto', 'aggiornare il pasto', 'togliere gli ingredienti di prima']);
    atteso('gruppo · la voce che non c\'entra parte, il pasto non viene toccato', [a.coda().length, a.scritture().filter(x => x.startsWith('meals')).length, a.t.supplements_log.length], [0, 0, 0]);
  }
  // 4e) Una richiesta appesa non ferma ogni salvataggio: dopo 12 secondi conta come rete muta
  {
    const a = await nuovo();
    a.t.__rete = false;
    await a.togli();
    a.t.__rete = undefined;
    a.t.__attesa = () => new Promise(() => {});   // il server non risponde mai
    const t0 = Date.now();
    const r = await a.rimetti();
    a.t.__attesa = undefined;
    atteso('richiesta appesa · chi aspetta riceve «in coda» entro 13 secondi', [r.inCoda, Date.now() - t0 < 13500], [true, true]);
    atteso('richiesta appesa · le voci restano in ordine, segnate come forse partite', [a.coda().map(c => c.operazione), a.coda()[0].tentato], [['togliere X', 'rimettere X'], true]);
  }
  // 6) Coda vuota: come prima, si scrive diretto
  {
    const a = await nuovo();
    const r = await a.togli();
    atteso('coda vuota · scritto subito', [a.scritture(), a.coda().length, r.error], [['supplements_log:delete'], 0, null]);
  }

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
