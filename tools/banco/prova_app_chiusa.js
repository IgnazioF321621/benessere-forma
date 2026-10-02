// App chiusa per lavori (APP_ONLY_EMAIL): entra solo l'utente ammesso, gli altri vedono «in aggiornamento».
const { boot } = require('./banco');
let ok = 0, ko = 0;
const check = (nome, cond) => { cond ? ok++ : ko++; console.log((cond ? '✓' : '✗') + ' ' + nome); };
const vis = (win, id) => win.document.getElementById(id).classList.contains('visible');

(async () => {
  // 1. Un tester: loadAndStart si ferma sulla schermata di chiusura
  {
    const { win } = boot({});
    const ST = win.eval('ST');
    ST.user = { id: 'u-tester', email: 'tester@example.com' };
    check('tester: isAppClosedForUser = true', win.isAppClosedForUser() === true);
    await win.loadAndStart();
    check('tester: schermata «in aggiornamento» visibile', vis(win, 'closed-screen'));
    check('tester: app non visibile', !vis(win, 'app'));
    check('tester: onboarding non visibile', !vis(win, 'onboarding-screen'));
    check('tester: nessun profilo caricato', ST.profile == null);
  }
  // 2. Un tester con l'app già aperta: il rientro in primo piano la chiude
  {
    const { win } = boot({});
    const ST = win.eval('ST');
    ST.user = { id: 'u-tester', email: 'tester@example.com' };
    win.showScreen('app');
    check('tester già dentro: app visibile prima del rientro', vis(win, 'app'));
    await win.refreshInBackground();
    check('tester già dentro: chiusa al rientro', vis(win, 'closed-screen') && !vis(win, 'app'));
  }
  // 3. Utente senza email (sessione anomala): chiusa
  {
    const { win } = boot({});
    win.eval('ST').user = { id: 'u-x' };
    check('senza email: chiusa', win.isAppClosedForUser() === true);
  }
  // 4. Ignazio: entra, anche con maiuscole e spazi nell'email
  {
    const { win } = boot({});
    const ST = win.eval('ST');
    ST.user = { id: 'u-ig', email: ' Ignazio.F@me.com ' };
    check('Ignazio: isAppClosedForUser = false', win.isAppClosedForUser() === false);
    try { await win.loadAndStart(); } catch (e) {}
    check('Ignazio: schermata di chiusura non visibile', !vis(win, 'closed-screen'));
  }
  // 5. Dalla schermata di chiusura si torna all'accesso
  {
    const { win } = boot({});
    win.eval('ST').user = { id: 'u-tester', email: 'tester@example.com' };
    win.showClosedScreen();
    win.showScreen('auth');
    check('uscita: accesso visibile, chiusura nascosta', vis(win, 'auth-screen') && !vis(win, 'closed-screen'));
  }
  console.log(`\n${ok} passati, ${ko} falliti`);
  process.exit(ko ? 1 : 0);
})();
