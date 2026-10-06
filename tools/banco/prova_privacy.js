// Fondamenta 170 — privacy: informativa prima del primo accesso, consenso prima che le foto partano,
// niente nome della persona nei testi al coach, «Scarica i miei dati».
//   node tools/banco/prova_privacy.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs');
const path = require('path');
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(74), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms || 20));
const visibile = (win, id) => win.document.getElementById(id).classList.contains('visible');
const profilo = { id:U, first_name:'Ignazio', last_name:'F', sex:'M', age:55, height_cm:178, weight_kg:80, obiettivo:'ricomposizione', dieta:'pescetariana', note_salute:'Ferritina bassa', m2_skipped:true, train_start_date:'2026-08-24', created_at:'2026-05-01T08:00:00Z' };
(async () => {
  // 1) prima del primo accesso: informativa, e l'accesso non si apre finche' non si tocca «Ho capito»
  {
    const b = boot({ profiles:[] }, { now:'2026-10-03T12:00:00' });
    await b.avviato; await attendi(50);
    atteso('primo avvio · si vede l\'informativa, non l\'accesso', [visibile(b.win, 'privacy-screen'), visibile(b.win, 'auth-screen')], [true, false]);
    const testo = b.win.document.getElementById('privacy-testo').textContent;
    atteso('informativa · nomina Supabase, Groq e Gemini', ['Supabase', 'Groq', 'Gemini'].map(s => testo.includes(s)), [true, true, true]);
    b.win.showScreen('auth');
    atteso('chiedere l\'accesso senza consenso · resta l\'informativa', [visibile(b.win, 'privacy-screen'), visibile(b.win, 'auth-screen')], [true, false]);
    b.win.accettaPrivacy();
    atteso('«Ho capito, continuo» · si apre l\'accesso, scelta sul telefono', [visibile(b.win, 'privacy-screen'), visibile(b.win, 'auth-screen'), b.win.localStorage.getItem('zt_privacy_ok')], [false, true, b.win.eval('PRIVACY_VERSIONE')]);
    // una versione vecchia del testo non vale
    const c = boot({ profiles:[] }, { now:'2026-10-03T12:00:00', locale:{ zt_privacy_ok:'2020-01-01' } });
    await c.avviato; await attendi(50);
    atteso('testo cambiato · si rilegge', visibile(c.win, 'privacy-screen'), true);
    const d = boot({ profiles:[] }, { now:'2026-10-03T12:00:00', locale:{ zt_privacy_ok:b.win.eval('PRIVACY_VERSIONE') } });
    await d.avviato; await attendi(50);
    atteso('gia\' letta · accesso diretto', [visibile(d.win, 'privacy-screen'), visibile(d.win, 'auth-screen')], [false, true]);
  }
  // 2) le foto non partono senza consenso
  {
    const checks = [{ user_id:U, id:'c1', status:'completed', created_at:'2026-07-04T03:32:48Z' }, { user_id:U, id:'c2', status:'completed', created_at:'2026-08-02T05:38:24Z' }];
    const b = boot({ profiles:[profilo], body_checks:checks, body_measurements:[], body_check_photos:[], blood_tests:[], body_logs:[], weight_logs:[], body_check_ai:[], __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } } }, { now:'2026-09-13T09:00:00' });
    await b.avviato; await attendi(100);
    const ST = b.win.eval('ST'); ST.user = { id:U };
    b.supa.auth.getSession = async () => ({ data:{ session:{ user:{ id:U }, access_token:'token-finto' } } });
    const chiamate = [];
    b.win.fetch = async (url, opts) => { chiamate.push(url); return { ok:true, status:200, json: async () => ({ reading:{} }) }; };
    const risposta = (ok) => { const btn = [...b.win.document.querySelectorAll('.foglio button')].find(x => ok ? x.classList.contains('foglio-ok') : !x.classList.contains('foglio-ok')); return btn; };
    let p = b.win.requestBodyCheckAI('c2'); await attendi(30);
    const foglio = b.win.document.querySelector('.foglio');
    atteso('prima lettura · si chiede il consenso, nulla e\' partito', [!!foglio, foglio && foglio.textContent.includes('Gemini'), risposta(true).textContent, risposta(false).textContent, chiamate.length], [true, true, 'Acconsento', 'Annulla', 0]);
    risposta(false).click(); await p; await attendi(30);
    atteso('«Annulla» · nessuna foto parte, niente ricordato', [chiamate.length, b.win.localStorage.getItem('zt_foto_ok')], [0, null]);
    p = b.win.requestBodyCheckAI('c2'); await attendi(30);
    risposta(true).click(); await p; await attendi(30);
    atteso('«Acconsento» · la lettura parte, scelta ricordata sul telefono', [chiamate.length, chiamate[0] && chiamate[0].endsWith('/vision-check'), b.win.localStorage.getItem('zt_foto_ok')], [1, true, '1']);
    ST.bodyCheckAIBusy = null;
    p = b.win.requestBodyCheckAI('c2'); await attendi(30);
    atteso('seconda lettura · nessuna domanda', [!!b.win.document.querySelector('.foglio'), chiamate.length], [false, 2]);
    // le frasi sul check dicono il vero
    const frasi = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'body.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', '..', 'zona-tracker.html'), 'utf8');
    atteso('nessuna frase «visibili solo a te» / «restano private» rimasta', [/visibili solo a te/i.test(frasi), /restano private\./i.test(frasi)], [false, false]);
  }
  // 3) il nome della persona non entra nei testi al coach
  {
    const b = boot({ profiles:[profilo], weekly_pictures:[], coach_proposals:[], meals:[], meal_items:[], fasting_days:[], supplements_log:[], supplements:[], nutrilite_catalog:[], esercizi_catalog:[], schede_utente:[], workouts:[], training_logs:[] }, { now:'2026-10-02T12:00:00' });
    await b.avviato;
    const ST = b.win.eval('ST'); ST.user = { id:U }; ST.profile = { ...profilo }; ST.TARGET = { kcal:2200, protein:150, carbs:200, fat:70 };
    const prompts = [];
    b.win.callAI = async (prompt) => { prompts.push(String(prompt)); return 'ok'; };
    const ritratto = await b.win.coachRitrattoPronto();
    atteso('ritratto · senza il nome, con sesso ed eta\'', [/Ignazio/.test(ritratto), /uomo, 55 anni/.test(ritratto)], [false, true]);
    // le chiamate del coach che si possono lanciare dal banco
    try { await b.win.getAdvice({ kcal:900, protein:60, carbs:90, fat:30 }, 'pranzo'); } catch(e) {}
    try { await b.win._trainGenAINote(ST.profile, { obiettivo:'ricomposizione', giorni:4 }); } catch(e) {}
    try { await b.win.openExerciseAI('Trazioni sbarra', 'upperA'); } catch(e) {}
    try { await b.win.estimateMealItems('riso e pollo'); } catch(e) {}
    const conNome = prompts.filter(p => /\bIgnazio\b/.test(p)).length;
    if(process.env.MOSTRA) prompts.forEach(p => { const i = p.indexOf('Ignazio'); if(i >= 0) console.log('   NOME IN:', JSON.stringify(p.slice(Math.max(0, i - 160), i + 60))); });
    atteso('prompt mandati dal banco · almeno 3 testi, nessuno col nome', [prompts.length >= 3, conNome], [true, 0]);
    // nel codice: nessun prompt costruisce piu' una riga col nome
    const sorgenti = ['app/nutrition.js', 'app/training.js', 'app/training_generatore.js', 'app/pirsi.js', 'app/home.js', 'app/body.js', 'shared/ritratto.js', 'shared/coach_rules.js']
      .map(f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8')).join('\n');
    atteso('codice · nessun «Nome:» o nomeUtente nei prompt', [/"- Nome: "/.test(sorgenti), /nomeUtente/.test(sorgenti), /if\(p\.first_name\) v\.push/.test(sorgenti)], [false, false, false]);
  }
  // 4) scarica i miei dati: le tabelle giuste, lette con i permessi della persona, foto solo in elenco
  {
    const t = { profiles:[profilo], meals:[{ id:'m1', user_id:U, date:'2026-10-01', kcal:500 }, { id:'m9', user_id:'altro', date:'2026-10-01', kcal:1 }],
      meal_items:[{ id:'i1', user_id:U, meal_id:'m1', name:'riso' }], training_logs:[{ id:'t1', user_id:U, date:'2026-10-01', exercise_name:'Trazioni sbarra', set_number:1, reps:8 }],
      weight_logs:[{ id:'w1', user_id:U, date:'2026-10-01', weight_kg:72 }], body_check_photos:[{ id:'p1', user_id:U, check_id:'c1', pose:'front', storage_path:'u1/c1/front.jpg', bytes:'…' }],
      supplements_log:[], supplements:[], fasting_days:[], workouts:[], body_logs:[], __assenti:['daily_log'] };
    const b = boot(t, { now:'2026-10-03T12:00:00' });
    await b.avviato;
    const ST = b.win.eval('ST'); ST.user = { id:U, email:'ignazio.f@me.com' };
    const dati = await b.win.raccogliMieiDati();
    const tabelle = Object.keys(dati.tabelle).sort();
    atteso('tabelle nel file (23)', tabelle, ['blood_tests', 'body_checks', 'body_check_ai', 'body_logs', 'body_measurements', 'coach_proposals', 'daily_log', 'fasting_days', 'meal_items', 'meals', 'profiles', 'schede_utente', 'supplement_package_items', 'supplement_packages', 'supplements', 'supplements_log', 'training_logs', 'training_notes', 'weekly_pictures', 'weekly_plan_meals', 'weekly_plans', 'weight_logs', 'workouts'].sort());
    atteso('solo le righe della persona', [dati.tabelle.meals.map(m => m.id), dati.tabelle.profiles.length, dati.tabelle.training_logs[0].reps, dati.tabelle.weight_logs[0].weight_kg], [['m1'], 1, 8, 72]);
    atteso('foto · solo l\'elenco, mai i byte', [dati.foto.length, dati.foto[0].storage_path, 'bytes' in dati.foto[0]], [1, 'u1/c1/front.jpg', false]);
    atteso('tabella assente · scritta come non letta', typeof dati.tabelle.daily_log.non_letta, 'string');
    const letture = b.supa._calls.filter(c => c.op === 'select' && c.table !== 'app_errors');
    atteso('ogni lettura filtra sulla persona', letture.every(c => c.filters.some(f => (f[1] === 'user_id' || f[1] === 'id') && f[2] === U)), true);
  }
  // 5) elimina account dal profilo: parola sbagliata → niente; parola giusta → foto tolte, funzione chiamata, uscita
  {
    const nuovo = async (rpc) => {
      const t = { profiles:[profilo], body_check_photos:[{ id:'p1', user_id:U, check_id:'c1', pose:'front', storage_path:U + '/c1/front.jpg' }, { id:'p2', user_id:U, check_id:'c1', pose:'back', storage_path:U + '/c1/back.jpg' }], __rpc: rpc || {} };
      const b = boot(t, { now:'2026-10-03T12:00:00', locale:{ zt_cache:'x', zt_privacy_ok:'2026-10-03' } });
      await b.avviato;
      const ST = b.win.eval('ST'); ST.user = { id:U, email:'tester@x.it' };
      let usciti = 0; b.supa.auth.signOut = async () => { usciti++; return { error:null }; };
      // scrive la parola, poi chiude l'eventuale avviso che segue (altrimenti la promessa aspetta)
      const scrivi = async (parola) => { const p = b.win.eliminaMioAccount(); await attendi(30); const inp = b.win.document.querySelector('.foglio input'); if(inp){ inp.value = parola; b.win.document.querySelector('.foglio .foglio-ok').click(); } await attendi(60); b.avviso = (b.win.document.querySelector('.foglio') || {}).textContent || ''; const ok = b.win.document.querySelector('.foglio .foglio-ok'); if(ok) ok.click(); await p; await attendi(30); };
      const chiamate = () => b.supa._calls.filter(c => c.op === 'remove' || c.op === 'rpc').map(c => c.table + ':' + c.op);
      return { b, ST, scrivi, chiamate, usciti: () => usciti };
    };
    let a = await nuovo();
    await a.scrivi('elimino');
    atteso('parola sbagliata · nessuna cancellazione, nessuna uscita', [a.chiamate(), a.usciti(), !!a.ST.user], [[], 0, true]);
    await a.scrivi('elimina');
    atteso('parola giusta · prima le foto col proprio permesso, poi la funzione, poi l\'uscita', [a.chiamate(), a.usciti(), a.ST.user, a.b.win.localStorage.getItem('zt_cache')], [['storage:body-check-photos:remove', 'rpc:elimina_mio_account:rpc'], 1, null, null]);
    atteso('foto · tolte per percorso', a.b.supa._calls.find(c => c.op === 'remove').payload, [U + '/c1/front.jpg', U + '/c1/back.jpg']);
    // gli screenshot di «Invia Feedback» (Fondamenta 230) sono nella cartella della persona e se ne vanno con lei
    {
      const t = { profiles:[profilo], body_check_photos:[], __storage:{ segnalazioni:[U + '/s1.jpg', U + '/s2.jpg', 'altra-persona/s3.jpg'] } };
      const b = boot(t, { now:'2026-10-03T12:00:00', locale:{ zt_cache:'x', zt_privacy_ok:'2026-10-03' } });
      await b.avviato;
      b.win.eval('ST').user = { id:U, email:'tester@x.it' };
      b.supa.auth.signOut = async () => ({ error:null });
      b.win.eliminaMioAccount(); await attendi(30);
      const inp = b.win.document.querySelector('.foglio input'); inp.value = 'ELIMINA'; b.win.document.querySelector('.foglio .foglio-ok').click(); await attendi(60);
      const rim = b.supa._calls.filter(c => c.op === 'remove' || c.op === 'rpc').map(c => c.table + ':' + c.op);
      atteso('screenshot di feedback · tolti dalla cartella della persona, mai quelli di un altro, poi la funzione', [rim, b.supa._calls.find(c => c.table === 'storage:segnalazioni' && c.op === 'remove').payload, t.__storage.segnalazioni], [['storage:segnalazioni:remove', 'rpc:elimina_mio_account:rpc'], [U + '/s1.jpg', U + '/s2.jpg'], ['altra-persona/s3.jpg']]);
      const t2 = { profiles:[profilo], body_check_photos:[], __storage:{ segnalazioni:[U + '/s1.jpg'] }, __rifiuta:{ 'storage:segnalazioni':{ code:'403', message:'no' } } };
      const b2 = boot(t2, { now:'2026-10-03T12:00:00', locale:{ zt_cache:'x', zt_privacy_ok:'2026-10-03' } });
      await b2.avviato;
      b2.win.eval('ST').user = { id:U, email:'tester@x.it' };
      b2.win.eliminaMioAccount(); await attendi(30);
      const inp2 = b2.win.document.querySelector('.foglio input'); inp2.value = 'ELIMINA'; b2.win.document.querySelector('.foglio .foglio-ok').click(); await attendi(60);
      atteso('screenshot non letti · si avvisa, l\'account resta (nessuna chiamata alla funzione)', [b2.supa._calls.filter(c => c.op === 'rpc').length, !!b2.win.eval('ST').user], [0, true]);
    }
    a = await nuovo({ elimina_mio_account:{ data:null, error:{ code:'PGRST202', message:'funzione non trovata' } } });
    await a.scrivi('ELIMINA');
    atteso('funzione assente · si avvisa, nessuna uscita', [a.usciti(), !!a.ST.user, /non riesco a eliminare/i.test(a.b.avviso)], [0, true, true]);
    a = await nuovo(); a.ST.user = { id:U, email:'ignazio.f@me.com' };
    await a.scrivi('ELIMINA');
    atteso('amministrazione · non si cancella da qui', [a.chiamate(), a.usciti()], [[], 0]);
    const informativa = a.b.win.eval('PRIVACY_INFORMATIVA').map(x => x[1]).join(' ');
    atteso('informativa · cancellazione dalle Impostazioni, niente «non restano in Gemini»', [/cancellare l'account: dati, foto e accesso/.test(informativa), /restano nell'app di Gemini/.test(fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'body.js'), 'utf8'))], [true, false]);
  }
  console.log(ko ? ko + ' KO' : 'tutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
