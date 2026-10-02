// Fondamenta 150 — conferme, richieste di testo e avvisi nello stile dell'app, al posto delle finestrelle del telefono.
//   node tools/banco/prova_conferme.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(66), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = boot({ profiles:[] }, { now:'2026-10-02T12:00:00' });
  await b.avviato;
  const { win } = b;
  const d = win.document;
  // le finestrelle del telefono non devono piu' essere chiamate
  let native = 0;
  win.confirm = () => { native++; return true; }; win.alert = () => { native++; }; win.prompt = () => { native++; return ''; };
  const foglio = () => d.querySelector('.foglio-overlay');
  const bottone = (testo) => [...d.querySelectorAll('.foglio-overlay button')].find(x => x.textContent === testo);

  // chiediConferma: ok / annulla / sfondo / Esc
  let p = win.chiediConferma('Eliminare questo pasto?', { ok:'Elimina', pericolo:true });
  await attendi(5);
  atteso('conferma · foglio a schermo col testo e i due bottoni', [!!foglio(), foglio().textContent.includes('Eliminare questo pasto?'), !!bottone('Elimina'), !!bottone('Annulla'), bottone('Elimina').className.includes('btn-danger')], [true, true, true, true, true]);
  bottone('Elimina').click();
  atteso('conferma · Elimina → true, foglio chiuso', [await p, !!foglio()], [true, false]);
  p = win.chiediConferma('Vuoi uscire?', { ok:'Esci' }); await attendi(5); bottone('Annulla').click();
  atteso('conferma · Annulla → false', await p, false);
  p = win.chiediConferma('x'); await attendi(5); foglio().dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
  atteso('conferma · tocco sullo sfondo → false', await p, false);
  p = win.chiediConferma('x'); await attendi(5); d.dispatchEvent(new win.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  atteso('conferma · Esc → false', await p, false);

  // chiediTesto: valore iniziale, Enter, annulla → null
  p = win.chiediTesto('Orario', { valore:'08:00', tipo:'time' }); await attendi(5);
  const inp = d.querySelector('.foglio-overlay input');
  atteso('testo · campo con valore iniziale e tipo', [inp.value, inp.type], ['08:00', 'time']);
  inp.value = '09:30'; inp.dispatchEvent(new win.KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
  atteso('testo · Invio → il valore scritto', await p, '09:30');
  p = win.chiediTesto('Nome'); await attendi(5); bottone('Annulla').click();
  atteso('testo · Annulla → null', await p, null);

  // avvisa: un bottone solo
  p = win.avvisa('Non riesco a salvare il pasto', { titolo:'Pasto non salvato' }); await attendi(5);
  atteso('avviso · titolo, testo, un solo bottone Ok', [d.querySelector('.foglio-overlay h3').textContent, d.querySelectorAll('.foglio-overlay button').length, !!bottone('Ok')], ['Pasto non salvato', 1, true]);
  bottone('Ok').click(); await p;

  // due fogli di fila: il secondo aspetta il primo
  const p1 = win.chiediConferma('primo'); const p2 = win.chiediConferma('secondo'); await attendi(5);
  atteso('due fogli · uno solo a schermo, il primo', [d.querySelectorAll('.foglio-overlay').length, foglio().textContent.includes('primo')], [1, true]);
  bottone('Ok').click(); await p1; await attendi(5);
  atteso('due fogli · chiuso il primo compare il secondo', foglio().textContent.includes('secondo'), true);
  bottone('Ok').click(); await p2;

  // showToast: il secondo avviso non viene spento dal tempo del primo
  const toast = d.getElementById('toast');
  win.showToast('primo', '✅', 30); await attendi(10); win.showToast('secondo', '✅', 200); await attendi(60);
  atteso('toast · il secondo resta visibile oltre il tempo del primo', [toast.classList.contains('show'), toast.textContent], [true, '✅ secondo']);
  await attendi(200);
  atteso('toast · poi sparisce', toast.classList.contains('show'), false);

  // l'uscita dall'account passa dal foglio
  const ST = win.eval('ST'); ST.user = { id:'u1', email:'ignazio.f@me.com' };
  const pl = win.logout(); await attendi(5);
  atteso('Esci · chiede conferma col foglio, bottone Esci', [!!foglio(), !!bottone('Esci')], [true, true]);
  bottone('Annulla').click(); await pl;
  atteso('Esci annullato · si resta dentro', ST.user && ST.user.id, 'u1');

  atteso('nessuna finestrella del telefono chiamata', native, 0);
  // nel codice dell'app non restano confirm/alert/prompt (tranne quelli in commento)
  const files = ['zona-tracker.html', ...fs.readdirSync('app').map(f => 'app/' + f)];
  const resti = [];
  files.forEach(f => fs.readFileSync(f, 'utf8').split('\n').forEach((r, i) => { if(/(^|[^\w.])(confirm|alert|prompt)\(/.test(r) && !/^\s*\/\//.test(r)) resti.push(f + ':' + (i + 1)); }));
  atteso('nel codice · nessuna chiamata a confirm/alert/prompt', resti, []);
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
