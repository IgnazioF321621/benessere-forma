// Fondamenta 250 — accesso con email e password, come MB21: «Entra» chiama signInWithPassword (non il
// codice), i testi non dicono mai «errore», chi non ha il segno password_scelta trova «Crea la tua
// password» all'ingresso (una volta per apertura, mai durante un allenamento), il foglio salva con
// updateUser, passa dal codice se Supabase chiede di riconfermare, e la password non finisce mai in
// console né sul telefono.
//   node tools/banco/prova_accesso_password.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
const PW = 'Segreta-Prova-250';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(70), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const profilo = { id:U, first_name:'Ignazio', m2_skipped:true, obiettivo:'ricomposizione', weight_kg:72 };
const schermata = (d) => ['app', 'auth-screen', 'onboarding-screen', 'retry-screen', 'closed-screen', 'privacy-screen'].find(id => d.getElementById(id).classList.contains('visible')) || 'nessuna';
const vuote = () => ({ profiles:[profilo], meals:[], meal_items:[], fasting_days:[], supplements_log:[] });

// Auth finta: registra le chiamate; `risposte` decide cosa risponde ciascuna
function auth(a, risposte) {
  const chiamate = [];
  const A = a.supa.auth;
  A.signInWithPassword = async (arg) => { chiamate.push(['signInWithPassword', arg]); return risposte.signIn ? risposte.signIn(arg) : { data:null, error:{ code:'invalid_credentials', status:400, message:'Invalid login credentials' } }; };
  A.updateUser = async (arg) => { chiamate.push(['updateUser', arg]); return risposte.update ? risposte.update(arg, chiamate) : { data:{ user:{ id:U, email:'ignazio.f@me.com', user_metadata:{ password_scelta:true } } }, error:null }; };
  A.reauthenticate = async () => { chiamate.push(['reauthenticate']); return { data:{}, error:null }; };
  const otp = A.signInWithOtp; A.signInWithOtp = async (arg) => { chiamate.push(['signInWithOtp', arg]); return otp(arg); };
  return chiamate;
}
const testo = (el) => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
const foglio = (d) => d.querySelector('.foglio-overlay .foglio');
const invia = (form, win) => form.dispatchEvent(new win.Event('submit', { bubbles:true, cancelable:true }));
const scrivi = (el, v, win) => { el.value = v; el.dispatchEvent(new win.Event('input', { bubbles:true })); };

(async () => {
  // ── 1) La schermata d'accesso: email + password, codice come ripiego ──
  {
    const t = vuote();
    const a = await (async () => { const b = boot(t, { now:'2026-11-01T12:00:00', locale:{ zt_privacy_ok:'2026-10-03' } }); await b.avviato; for(let i = 0; i < 100 && schermata(b.win.document) === 'nessuna'; i++) await attendi(10); return b; })();
    const d = a.win.document, w = a.win;
    atteso('senza sessione · schermata d\'accesso', schermata(d), 'auth-screen');
    w.m1ShowAuth('email');
    const em = d.getElementById('auth-email'), pw = d.getElementById('auth-password');
    atteso('campo email con autocomplete username', em && em.getAttribute('autocomplete'), 'username');
    atteso('campo password con autocomplete current-password', pw && pw.getAttribute('autocomplete'), 'current-password');
    atteso('i due campi stanno in un form (il Portachiavi li riconosce)', !!(em && pw && em.form && em.form === pw.form), true);
    atteso('«Mandami il codice» resta sotto', testo(d.getElementById('auth-btn')), 'Mandami il codice');
    const ch = auth(a, {});
    // password sbagliata
    if(em && pw) { scrivi(em, 'Ignazio.F@me.com ', w); scrivi(pw, PW, w); invia(em.form, w); }
    for(let i = 0; i < 50 && !ch.length; i++) await attendi(10);
    await attendi(20);
    atteso('Entra chiama signInWithPassword una volta, email pulita', ch.filter(c => c[0] === 'signInWithPassword').map(c => c[1].email), ['ignazio.f@me.com']);
    atteso('Entra non manda il codice', ch.filter(c => c[0] === 'signInWithOtp').length, 0);
    const msg = testo(d.getElementById('auth-msg'));
    atteso('password sbagliata · dice che non corrispondono e indica il codice', /non corrispondono/.test(msg) && /Mandami il codice/.test(msg), true);
    atteso('password sbagliata · mai la parola «errore»', /errore/i.test(testo(d.getElementById('auth-screen'))), false);
    // senza rete
    Object.defineProperty(w.navigator, 'onLine', { configurable:true, get:() => false });
    if(em) invia(em.form, w);
    await attendi(40);
    atteso('senza rete · lo dice', testo(d.getElementById('auth-msg')), 'Sei senza rete: riprova quando torna.');
    Object.defineProperty(w.navigator, 'onLine', { configurable:true, get:() => true });
    // «Mandami il codice» usa la stessa email e il codice di oggi
    w.sendOTP && await w.sendOTP();
    atteso('Mandami il codice · signInWithOtp come prima', ch.filter(c => c[0] === 'signInWithOtp').length, 1);
    // password giusta, account senza segno: entra e il segno si scrive in sfondo (senza password)
    w.backToEmail();
    const ch2 = auth(a, { signIn: () => ({ data:{ session:{ user:{ id:U, email:'ignazio.f@me.com', user_metadata:{} } } }, error:null }) });
    scrivi(pw, PW, w); invia(em.form, w);
    for(let i = 0; i < 200 && schermata(d) !== 'app'; i++) await attendi(10);
    atteso('password giusta · si entra nell\'app', schermata(d), 'app');
    atteso('password giusta · il campo si svuota', pw.value, '');
    atteso('senza segno · updateUser solo col segno, senza password', ch2.filter(c => c[0] === 'updateUser').map(c => c[1]), [{ data:{ password_scelta:true } }]);
    const tutto = a.logs.map(l => l.join(' ')).join('\n') + JSON.stringify(Object.assign({}, w.localStorage));
    atteso('la password non è in console né sul telefono', tutto.includes(PW), false);
  }

  // ── 2) «Crea la tua password» all'ingresso, a chi è entrato col codice ──
  async function entrato(meta, prima) {
    const t = Object.assign(vuote(), { __sessione:{ user:{ id:U, email:'ignazio.f@me.com', user_metadata:meta } } });
    const b = boot(t, { now:'2026-11-01T12:00:00', locale:{ zt_privacy_ok:'2026-10-03' } });
    await b.avviato;
    // «Come stai adesso» (Home 170) a mezzogiorno si apre da solo: qui lo si tiene fermo, la prova di fila è sotto
    if(!prima) b.win.comeStaiAdessoDovuto = () => null;
    for(let i = 0; i < 200 && schermata(b.win.document) !== 'app'; i++) await attendi(10);
    return b;
  }
  {
    const a = await entrato({});
    const d = a.win.document, w = a.win;
    atteso('entrato col codice · app', schermata(d), 'app');
    await attendi(3300);
    const f = foglio(d);
    atteso('senza segno · dopo l\'ingresso compare «Crea la tua password»', f && testo(f.querySelector('h3')), 'Crea la tua password');
    atteso('due campi new-password e il nome utente nascosto', f ? [...f.querySelectorAll('input')].map(i => i.getAttribute('autocomplete')) : null, ['username', 'new-password', 'new-password', 'one-time-code']);
    const ch = auth(a, {});
    const p1 = f && f.querySelector('#pw-1'), p2 = f && f.querySelector('#pw-2'), form = f && f.querySelector('form');
    if(form) { scrivi(p1, 'corta', w); scrivi(p2, 'corta', w); invia(form, w); }
    await attendi(20);
    atteso('meno di 8 caratteri · lo dice, non salva', [f && testo(f.querySelector('#pw-msg')), ch.length], ['La password deve avere almeno 8 caratteri.', 0]);
    if(form) { scrivi(p1, PW, w); scrivi(p2, PW + 'x', w); invia(form, w); }
    await attendi(20);
    atteso('diverse · lo dice, non salva', [f && testo(f.querySelector('#pw-msg')), ch.length], ['Le due password non sono uguali.', 0]);
    // «Più tardi»: si chiude, non salva, e in questa apertura non torna
    f && f.querySelector('#pw-no').click();
    await attendi(30);
    atteso('Più tardi · foglio chiuso, nessuna scrittura', [!!foglio(d), ch.length], [false, 0]);
    w.passwordDaCreareControlla();
    await attendi(30);
    atteso('Più tardi · nella stessa apertura non torna', !!foglio(d), false);
    // dalle Impostazioni: «Cambia password», e il salvataggio
    const bott = d.getElementById('set-password-btn');
    atteso('Impostazioni · c\'è «Cambia password»', bott && testo(bott), 'Cambia password');
    bott && bott.click();
    await attendi(30);
    const g = foglio(d);
    atteso('Cambia password · titolo e Annulla', g ? [testo(g.querySelector('h3')), testo(g.querySelector('#pw-no'))] : null, ['Cambia password', 'Annulla']);
    if(g) { scrivi(g.querySelector('#pw-1'), PW, w); scrivi(g.querySelector('#pw-2'), PW, w); invia(g.querySelector('form'), w); }
    for(let i = 0; i < 50 && foglio(d); i++) await attendi(10);
    atteso('Salva · updateUser con password e segno', ch.map(c => c[0] === 'updateUser' ? Object.keys(c[1]).sort().concat(c[1].data && c[1].data.password_scelta) : c[0]), [['data', 'password', true]]);
    atteso('Salva · foglio chiuso e toast', [!!foglio(d), testo(d.getElementById('toast'))], [false, '✅ Password salvata: da ora entri con email e password']);
    atteso('Salva · il segno è sull\'utente in memoria', !!(w.eval('ST').user.user_metadata || {}).password_scelta, true);
    const tutto = a.logs.map(l => l.join(' ')).join('\n') + JSON.stringify(Object.assign({}, w.localStorage));
    atteso('la password non è in console né sul telefono', tutto.includes(PW), false);
  }

  // ── 3) Supabase chiede di riconfermare: passa dal codice, non resta fermo ──
  {
    const a = await entrato({ password_scelta:true });
    const d = a.win.document, w = a.win;
    let giro = 0;
    const ch = auth(a, { update: (arg) => (giro++ === 0 ? { data:null, error:{ code:'reauthentication_needed', status:400, message:'reauth' } } : { data:{ user:{ id:U, email:'ignazio.f@me.com', user_metadata:{ password_scelta:true } } }, error:null }) });
    w.foglioPassword(false);
    await attendi(30);
    const f = foglio(d);
    scrivi(f.querySelector('#pw-1'), PW, w); scrivi(f.querySelector('#pw-2'), PW, w); invia(f.querySelector('form'), w);
    for(let i = 0; i < 50 && !ch.some(c => c[0] === 'reauthenticate'); i++) await attendi(10);
    await attendi(20);
    atteso('serve riconfermare · parte il codice (reauthenticate)', ch.filter(c => c[0] === 'reauthenticate').length, 1);
    atteso('serve riconfermare · il foglio lo dice e mostra il campo del codice', [/^Per cambiarla ti mando un codice/.test(testo(f.querySelector('#pw-msg'))), f.querySelector('#pw-codice-riga').hidden], [true, false]);
    scrivi(f.querySelector('#pw-codice'), '123456', w); invia(f.querySelector('form'), w);
    for(let i = 0; i < 50 && foglio(d); i++) await attendi(10);
    atteso('col codice · updateUser porta il nonce, foglio chiuso', [ch.filter(c => c[0] === 'updateUser').map(c => c[1].nonce || null), !!foglio(d)], [[null, '123456'], false]);
  }

  // ── 4) È già la sua password · password debole ──
  {
    const a = await entrato({ password_scelta:true });
    const d = a.win.document, w = a.win;
    const ch = auth(a, { update: (arg) => (arg.password ? { data:null, error:{ code:'same_password', status:422, message:'same' } } : { data:{ user:{ id:U, user_metadata:{ password_scelta:true } } }, error:null }) });
    w.foglioPassword(true);
    await attendi(30);
    let f = foglio(d);
    scrivi(f.querySelector('#pw-1'), PW, w); scrivi(f.querySelector('#pw-2'), PW, w); invia(f.querySelector('form'), w);
    for(let i = 0; i < 50 && foglio(d); i++) await attendi(10);
    atteso('è già la sua · si segna, foglio chiuso', [ch.map(c => c[1] && c[1].password ? 'con password' : 'solo segno'), !!foglio(d)], [['con password', 'solo segno'], false]);
    auth(a, { update: () => ({ data:null, error:{ code:'weak_password', status:422, message:'weak' } }) });
    w.foglioPassword(false);
    await attendi(30);
    f = foglio(d);
    scrivi(f.querySelector('#pw-1'), PW, w); scrivi(f.querySelector('#pw-2'), PW, w); invia(f.querySelector('form'), w);
    await attendi(40);
    const m = testo(f.querySelector('#pw-msg'));
    atteso('debole · lo dice, senza «errore»', [/troppo semplice/.test(m), /errore/i.test(testo(f))], [true, false]);
  }

  // ── 5) Quando non compare ──
  {
    const a = await entrato({ password_scelta:true });
    await attendi(3300);
    atteso('col segno · nessun foglio', !!foglio(a.win.document), false);
    const b = await entrato({});
    b.win.eval('ST').trainSession = { attiva:true };
    await attendi(3300);
    atteso('durante un allenamento · nessun foglio', !!foglio(b.win.document), false);
  }

  // ── 6) Con un altro foglio davanti aspetta, e compare quando si chiude ──
  {
    const a = await entrato({}, true);
    const d = a.win.document;
    await attendi(3300);
    atteso('«Come stai adesso» davanti · la password aspetta', [!!d.querySelector('.csa-overlay'), !!foglio(d)], [true, false]);
    const ov = d.querySelector('.csa-overlay'); if(ov) ov.remove();
    await attendi(5300);
    atteso('chiuso l\'altro foglio · compare «Crea la tua password»', foglio(d) && testo(foglio(d).querySelector('h3')), 'Crea la tua password');
  }

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
