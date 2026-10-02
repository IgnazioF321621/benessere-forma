// Fondamenta 060: gli errori dei telefoni finiscono in app_errors.
// dbq (anche silenziosa), errori generali della pagina e promesse rifiutate: una riga
// per errore, una volta sola per errore uguale, al massimo 20 per sessione, mai un'eccezione.
// Prima/dopo: sul file vecchio deve dare KO.
//   node tools/banco/prova_errori.js
//   BANCO_FILE=/tmp/prima.html node tools/banco/prova_errori.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const pausa = () => new Promise(r => setTimeout(r, 20));
const avvia = (tabelle, utente = true) => {
  const b = boot(Object.assign({ meals:[], app_errors:[] }, tabelle));
  const ST = b.win.eval('ST');
  if(utente) ST.user = { id:U };
  ST.page = 'oggi';
  b.mandati = () => b.supa._calls.filter(c => c.table === 'app_errors' && c.op === 'insert').map(c => c.payload);
  b.supaApp = b.win.eval('supa');
  return b;
};

(async () => {
  // 1) una lettura fallita (tabella che non c'è) passa da dbq e viene segnalata
  {
    const { win, mandati, supaApp } = avvia({ __assenti:['workouts'] });
    const r = await win.dbq('leggere gli allenamenti', supaApp.from('workouts').select('*'));
    await pausa();
    const m = mandati();
    atteso('dbq restituisce comunque l\'errore a chi chiama', !!r.error, true);
    atteso('una riga in app_errors', m.length, 1);
    atteso('chi, tipo, operazione', m[0] && [m[0].user_id, m[0].kind, m[0].operation], [U, 'db', 'leggere gli allenamenti']);
    atteso('versione dell\'app', m[0] && m[0].app_version, win.eval('APP_VERSION'));
    atteso('codice dell\'errore e pagina nel dettaglio', m[0] && [m[0].detail.code, m[0].detail.pagina], ['PGRST205', 'oggi']);
    // lo stesso errore, di nuovo: non si rimanda
    await win.dbq('leggere gli allenamenti', supaApp.from('workouts').select('*'));
    await pausa();
    atteso('errore uguale: una volta sola', mandati().length, 1);
    // silenziosa: niente toast, ma la segnalazione parte
    await win.dbq('leggere in sottofondo', supaApp.from('workouts').select('*'), { silenzioso:true });
    await pausa();
    atteso('dbq silenziosa: segnalata lo stesso', mandati().length, 2);
    // una chiamata che va bene non segnala niente
    await win.dbq('leggere i pasti', supaApp.from('meals').select('*'));
    await pausa();
    atteso('lettura riuscita: nessuna segnalazione', mandati().length, 2);
  }
  // 2) nessuno è entrato: niente da mandare
  {
    const { win, mandati, supaApp } = avvia({ __assenti:['workouts'] }, false);
    await win.dbq('leggere gli allenamenti', supaApp.from('workouts').select('*'));
    await pausa();
    atteso('senza utente: nessuna riga', mandati().length, 0);
  }
  // 3) errore generale della pagina e promessa rifiutata
  {
    const { win, mandati } = avvia({});
    win.dispatchEvent(new win.ErrorEvent('error', { message:'x is not defined', filename:'https://sito/zona-tracker.html', lineno:123, error:new win.Error('x is not defined') }));
    const ev = new win.Event('unhandledrejection'); ev.reason = new win.Error('rete caduta');
    win.dispatchEvent(ev);
    win.dispatchEvent(new win.Event('error'));                 // una risorsa che non si carica: senza messaggio, non si segnala
    await pausa();
    const m = mandati();
    atteso('errore di pagina + promessa rifiutata', m.map(x => [x.kind, x.operation, x.message]), [['js', 'zona-tracker.html:123', 'x is not defined'], ['promise', null, 'rete caduta']]);
    atteso('la traccia dell\'errore è nel dettaglio', !!(m[0] && m[0].detail.stack), true);
  }
  // 4) un guasto che si ripete: al massimo 20 righe per sessione
  {
    const { win, mandati } = avvia({});
    for(let i = 0; i < 50; i++) win.reportError('js', 'giro', 'errore numero ' + i);
    await pausa();
    atteso('50 errori diversi: se ne mandano 20', mandati().length, 20);
    const b = avvia({}); b.win.reportError('js', null, 'a'.repeat(5000));
    await pausa();
    atteso('messaggio lunghissimo tagliato a 500', b.mandati()[0].message.length, 500);
  }
  // 5) la tabella degli errori non c'è (migrazione non eseguita): niente eccezioni, niente giro senza fine
  {
    const { win, supa, supaApp } = avvia({ __assenti:['workouts', 'app_errors'] });
    let lanciato = false;
    try { await win.dbq('leggere gli allenamenti', supaApp.from('workouts').select('*')); await pausa(); } catch(e){ lanciato = true; }
    atteso('app_errors assente: nessuna eccezione', lanciato, false);
    atteso('app_errors assente: un solo tentativo', supa._calls.filter(c => c.table === 'app_errors').length, 1);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.message); process.exit(1); });
