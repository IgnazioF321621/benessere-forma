// Training 560 (2 novembre 2026): l'attrezzatura nelle Impostazioni. Prima si sceglieva solo nell'onboarding, e chi era
// già dentro non poteva aggiungere «Parallele» (Training 550) né altro.
//   · una lista sola di pillole (ATTREZZI_SCELTA in app/onboarding.js) per onboarding e Impostazioni, una regola sola per
//     accenderle (attrezziToggle: gli equivalenti dei profili di prima, gli accessori che se ne vanno con gli elastici)
//   · le parole del profilo senza pillola restano («corpo libero», «corda doppia», «barra»)
//   · la scheda non si rigenera; se qualcosa in scheda non si può più fare: «… li trovi in "Cambia per oggi"»
//   · l'avviso sugli attrezzi che non aprono nessun esercizio (L2), con la regola del generatore (ZTCoachRules.attrezziInerti)
//   · gli alias in shared (ZTCoachRules.ALIAS_ATTREZZI): il generatore e puoFare leggono gli stessi
//   node tools/banco/prova_training_560.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const R = require('../../shared/coach_rules.js');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-11-02';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(92), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const aspetta = (ms) => new Promise(r => setTimeout(r, ms || 30));
// L'attrezzatura vera di Ignazio (profilo del 1 novembre): parole di prima («elastico», «barra», «corpo libero», «corda doppia»)
const IGNAZIO = ['elastico', 'barra', 'sbarra', 'panca', 'fitball', 'corpo libero', 'corda doppia', 'cavigliere'];
const MISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'catalogo_righe_miste_20261101.json'), 'utf8'));
// il catalogo degli attrezzi (codice, attrezzo, surrogato, luogo): le righe miste vere e qualche riga a un attrezzo
const CATALOGO = MISTE.map(r => ({ codice: r.codice, attrezzo: r.attrezzo, surrogato_attrezzo: r.surrogato_attrezzo, luogo: r.luogo })).concat([
  { codice:'EX681', attrezzo:'parallele', surrogato_attrezzo:null, luogo:'casa;palestra;libero' },
  { codice:'EX076', attrezzo:'manubri', surrogato_attrezzo:'elastico', luogo:'casa;palestra' },
  { codice:'EX505', attrezzo:'sbarra', surrogato_attrezzo:null, luogo:'casa;palestra' },
  { codice:'EX646', attrezzo:'barra', surrogato_attrezzo:null, luogo:'casa;libero;palestra' },
]);

// La regola degli attrezzi inerti com'era nel generatore fino al 1 novembre (GEAR_ALIASES e il filtro, copiati)
const ALIAS_PRIMA = { elastici_tubo: 'elastico', cavigliere: 'cavigliera', barra_corta: 'barra', barra_lunga: 'barra' };
const inertiPrima = (attrezzatura, catalog) => {
  const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_');
  const nel = new Set();
  catalog.forEach(ex => {
    norm(ex.attrezzo).split(';').forEach(a => { const t = a.trim(); if (t) nel.add(t); });
    String(ex.surrogato_attrezzo || '').toLowerCase().split('+').forEach(a => { const t = norm(a); if (t) nel.add(t); });
  });
  return (Array.isArray(attrezzatura) ? attrezzatura : []).map(norm).filter(s => s && s !== 'corpo_libero')
    .filter(s => !nel.has(s) && !(ALIAS_PRIMA[s] && nel.has(ALIAS_PRIMA[s])));
};

function tabelle(p, scheda){
  return { profiles:[p], schede_utente: scheda ? [{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda }] : [], esercizi_catalog: CATALOGO.map(c => ({ ...c })),
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[], weekly_pictures:[], blood_tests:[], body_check_ai:[] };
}
async function nuovo(extra, scheda){
  const p = { id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-26', obiettivo:'ricomposizione', giorni_allenamento:4,
    tipo_allenamento:'casa', attrezzatura: IGNAZIO.slice(), train_giorni:[1, 2, 4, 5], train_orario:'07:30', ...(extra || {}) };
  const t = tabelle(p, scheda);
  const b = boot(t, { now: OGGI + 'T12:30:00' });
  await b.avviato;
  const W = b.win, ST = W.eval('ST'), d = W.document;
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  W.applyProfile(ST.profile);
  if(scheda) await W.loadActiveScheda();
  const toast = [];
  W.showToast = (msg) => toast.push(msg);
  const scritture = () => b.supa._calls.filter(c => c.table === 'profiles' && c.op === 'update').map(c => c.payload).filter(p => 'attrezzatura' in p);
  const accese = (id) => [...d.querySelectorAll(`#${id} .m1-pill-toggle.selected`)].map(x => x.dataset.gear);
  return { ...b, W, ST, d, t, toast, scritture, accese };
}

(async () => {
  // ── 1 · le regole in shared ──
  {
    const casi = [IGNAZIO, [], ['elastici_tubo', 'cavigliere'], ['barra_corta'], ['parallele', 'corda doppia', 'TRX'], ['corpo libero', 'Corpo Libero', 'kettlebell']];
    atteso('1 · gli attrezzi inerti rispondono come la regola di prima del generatore', casi.map(c => JSON.stringify(R.attrezziInerti(c, CATALOGO)) === JSON.stringify(inertiPrima(c, CATALOGO))), casi.map(() => true));
    atteso('1 · per Ignazio: cavigliere e corda doppia non aprono niente', R.attrezziInerti(IGNAZIO, CATALOGO), ['corda_doppia', 'cavigliere']);
    atteso('1 · gli alias sono quelli del generatore di prima', R.ALIAS_ATTREZZI, ALIAS_PRIMA);
    atteso('1 · attrezziConAlias: corpo libero sempre, slug e parola del catalogo', R.attrezziConAlias(['elastici_tubo', 'Panca']), ['corpo_libero', 'elastici_tubo', 'elastico', 'panca']);
    atteso('1 · puoFare legge gli alias come il generatore: «Elastici a tubo» apre le righe a elastico', R.puoFare({ attrezzo:'elastico', luogo:'casa' }, { tipoAllen:'casa', attrezzatura:['elastici_tubo'] }), true);
    const gen = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'training_generatore.js'), 'utf8');
    atteso('1 · il generatore usa gli alias e gli inerti di shared, senza una seconda copia', [/const GEAR_ALIASES = ZTCoachRules\.ALIAS_ATTREZZI;/.test(gen), /ZTCoachRules\.attrezziInerti\(attrezzatura, catalog\)/.test(gen), /elastici_tubo: 'elastico'/.test(gen)], [true, true, false]);
  }
  // ── 2 · una lista, una regola ──
  {
    const a = await nuovo();
    const W = a.W;
    atteso('2 · la lista: 9 attrezzi (con le parallele) e 4 accessori', [W.eval('ATTREZZI_SCELTA').length, W.eval('ATTREZZI_ACCESSORI').length, W.eval('ATTREZZI_SCELTA').some(v => v.slug === 'parallele')], [9, 4, true]);
    atteso('2 · «elastico» di prima accende «Elastici a tubo»; spento, se ne va con gli accessori; le altre parole restano', [W.attrezzoSegnato(IGNAZIO, 'elastici_tubo'), W.attrezziToggle(IGNAZIO, 'elastici_tubo')], [true, ['barra', 'sbarra', 'panca', 'fitball', 'corpo libero', 'corda doppia']]);
    atteso('2 · acceso uno nuovo: in coda, il resto com\'era', W.attrezziToggle(IGNAZIO, 'parallele'), IGNAZIO.concat('parallele'));
    // l'onboarding disegna dalla stessa lista
    a.ST.m1Data = { ...(a.ST.m1Data || {}), attrezzatura: [] };
    W.m1GearDisegna();
    atteso('2 · onboarding: le pillole vengono dalla lista (9 + 4), nessuna accesa, accessori nascosti', [a.d.querySelectorAll('#m1-gear-attrezzi .m1-pill-toggle').length, a.d.querySelectorAll('#m1-gear-accessori .m1-pill-toggle').length, a.accese('m1-gear-attrezzi'), a.d.getElementById('m1-gear-accessories-block').style.display], [9, 4, [], 'none']);
    W.m1ToggleAttrezzatura('elastici_tubo'); W.m1ToggleAttrezzatura('cavigliere'); W.m1ToggleAttrezzatura('parallele');
    await aspetta(60);
    atteso('2 · onboarding: accese, accessori visibili, e l\'avviso dice che le cavigliere non aprono esercizi', [a.ST.m1Data.attrezzatura, a.d.getElementById('m1-gear-accessories-block').style.display, /«Cavigliere»: per ora nel catalogo nessun esercizio lo usa/.test(a.d.getElementById('m1-gear-nota').textContent)], [['elastici_tubo', 'cavigliere', 'parallele'], 'block', true]);
    W.m1ToggleAttrezzatura('elastici_tubo');
    await aspetta(60);
    atteso('2 · onboarding: spenti gli elastici se ne vanno le cavigliere, e l\'avviso sparisce', [a.ST.m1Data.attrezzatura, a.d.getElementById('m1-gear-nota').style.display], [['parallele'], 'none']);
  }
  // ── 3 · le Impostazioni ──
  {
    const a = await nuovo();
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    await aspetta(60);
    atteso('3 · Ignazio: accese elastici (da «elastico»), panca, sbarra, fitball; tra gli accessori le cavigliere', [a.accese('set-attrezzi'), a.accese('set-attrezzi-accessori'), a.d.getElementById('set-attrezzi-campo').style.display], [['elastici_tubo', 'panca', 'sbarra', 'fitball'], ['cavigliere'], '']);
    atteso('3 · l\'avviso L2: cavigliere e corda doppia non aprono esercizi', a.d.getElementById('set-attrezzi-nota').textContent, '«corda doppia», «Cavigliere»: per ora nel catalogo nessun esercizio li usa. Puoi segnarli, ma non cambiano gli esercizi.');
    a.W.toggleSetAttrezzo('parallele');
    atteso('3 · «Parallele» si accende', a.accese('set-attrezzi').includes('parallele'), true);
    await a.W.saveSettings(); await aspetta(80);
    atteso('3 · «Salva»: una scrittura a parte, le parole di prima restano, «parallele» in coda', a.scritture(), [{ attrezzatura: IGNAZIO.concat('parallele') }]);
    atteso('3 · il profilo in memoria segue; aggiungere non toglie niente dalla scheda: «Salvato»', [a.ST.profile.attrezzatura, a.toast.pop()], [IGNAZIO.concat('parallele'), 'Salvato']);
    await a.W.saveSettings(); await aspetta(80);
    atteso('3 · «Salva» senza cambiare: nessuna seconda scrittura', a.scritture().length, 1);
  }
  // ── 4 · la scheda non si rigenera; se qualcosa non si può più fare, «Cambia per oggi» ──
  {
    const scheda = { obiettivo:'ricomposizione', sessioni: [{ id:'upperA', name:'Upper A', type:'Forza', exercises:[{ codice:'EX514', name:'Dip panca piedi rialzati', sets:3, reps:'4-6' }, { codice:'EX505', name:'Trazioni sbarra', sets:3, reps:'4-6' }] }] };
    const a = await nuovo({}, scheda);
    const prima = JSON.stringify(a.ST.schedaAttiva && a.ST.schedaAttiva.scheda);
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    a.W.toggleSetAttrezzo('panca');
    await a.W.saveSettings(); await aspetta(80);
    atteso('4 · tolta la panca con un Dip panca in scheda: il messaggio rimanda a «Cambia per oggi»', a.toast.pop(), 'Salvato. Gli esercizi che non puoi più fare li trovi in «Cambia per oggi»');
    atteso('4 · la scheda resta com\'è: nessuna scrittura su schede_utente, nessuna rigenerazione', [a.supa._calls.filter(c => c.table === 'schede_utente' && c.op !== 'select').length, JSON.stringify(a.ST.schedaAttiva && a.ST.schedaAttiva.scheda) === prima], [0, true]);
    atteso('4 · il conto: 1 esercizio (il Dip panca), le trazioni si fanno ancora', await a.W.eserciziNonPiuFattibili(IGNAZIO, IGNAZIO.filter(x => x !== 'panca')), 1);
  }
  // ── 4b · «Cambia per oggi» costruisce con gli alias, come puoFare (revisione del 560) ──
  {
    const a = await nuovo({ attrezzatura:['elastici_tubo'] });
    a.ST.profile.attrezzatura = ['elastici_tubo'];
    const riga = { codice:'EX076', nome:'Rematore manubri panca piana', attrezzo:'manubri', surrogato_attrezzo:'elastico', luogo:'casa', setup:'', esecuzione:'', errori:'', muscoli:'' };
    atteso('4b · profilo nuovo («elastici_tubo»): puoFare dice sì, e «Cambia per oggi» lo costruisce con l\'elastico', [R.puoFare(riga, { tipoAllen:'casa', attrezzatura:['elastici_tubo'] }), a.W._coCostruisci(riga, { name:'Rematore elastico', codice:'EX020', sets:3, reps:'8-12' }).eq], [true, 'elastico']);
    atteso('4b · lista vuota: il conto usa la stessa partenza di «Cambia per oggi» (elastico e corpo libero)', await a.W.eserciziNonPiuFattibili(['elastico'], []), 0);
  }
  // ── 4c · senza tipo di allenamento il campo non c'è (come l'onboarding: l'attrezzatura conta solo a casa) ──
  {
    const a = await nuovo({ tipo_allenamento:null });
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    atteso('4c · tipo di allenamento non scelto: campo nascosto', a.d.getElementById('set-attrezzi-campo').style.display, 'none');
  }
  // ── 5 · in palestra il campo non c'è e non si scrive ──
  {
    const a = await nuovo({ tipo_allenamento:'palestra', attrezzatura:null });
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    await a.W.saveSettings(); await aspetta(60);
    atteso('5 · palestra: campo nascosto, nessuna scrittura dell\'attrezzatura', [a.d.getElementById('set-attrezzi-campo').style.display, a.scritture().length], ['none', 0]);
  }
  // ── 6 · senza catalogo (senza rete) non si avvisa a vuoto e si salva lo stesso ──
  {
    const a = await nuovo();
    a.t.esercizi_catalog = null;
    a.ST.catalogoAttrezzi = undefined;
    a.supa.from = ((orig) => (t) => t === 'esercizi_catalog' ? { select(){ return this; }, order(){ return this; }, range(){ return Promise.resolve({ data:null, error:{ message:'rete' } }); }, then(r){ return Promise.resolve({ data:null, error:{ message:'rete' } }).then(r); } } : orig(t))(a.supa.from.bind(a.supa));
    a.W.openSettingsModal(); a.W.setVai('allenamento');
    await aspetta(60);
    atteso('6 · catalogo non letto: nessun avviso', a.d.getElementById('set-attrezzi-nota').style.display, 'none');
    a.W.toggleSetAttrezzo('panca');
    await a.W.saveSettings(); await aspetta(80);
    atteso('6 · e il salvataggio passa, con «Salvato»', [a.scritture().length, a.toast.pop()], [1, 'Salvato']);
  }
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})();
