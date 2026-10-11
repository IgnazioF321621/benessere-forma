// Training 330 (Ondata 3, Sessione E): quando la progressione dice «variante più facile», il
// coach nomina l'esercizio (nome e codice, apribile con la GIF) e dice in due righe come si fa.
// Parte 1: la regola pura (shared/coach_rules.js), senza jsdom.
// Parte 2: l'app vera — card della seduta e schermata di recupero, con alternativa, senza, senza rete.
//   node tools/banco/prova_variante_facile.js
process.env.TZ = 'Europe/Rome';
const R = require('../../shared/coach_rules.js');
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-11';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(72), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// ── Catalogo finto: una famiglia di piegamenti ──
const CAT = [
  { codice:'EX003', nome:'Piegamenti', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'intermedio', attrezzo:'corpo libero', luogo:'casa;palestra;libero', alternativa:'EX576, EX200', setup:'Mani a terra sotto le spalle. Corpo in linea.', esecuzione:'Scendi col petto verso il pavimento, poi spingi. Espira sulla salita.' },
  { codice:'EX576', nome:'Piegamenti tocco ai piedi', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'avanzato', attrezzo:'corpo libero', luogo:'casa', alternativa:'EX576', setup:'', esecuzione:'' },
  { codice:'EX200', nome:'Piegamenti sulle ginocchia', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'principiante', attrezzo:'corpo libero', luogo:'casa;palestra', alternativa:'', setup:'Ginocchia a terra, mani sotto le spalle! Caviglie incrociate.', esecuzione:'Scendi fino a sfiorare il pavimento col petto e risali senza inarcare la schiena, con il bacino fermo e il collo lungo, guardando un punto a terra davanti alle mani per tutta la discesa e tutta la salita.' },
  { codice:'EX201', nome:'Piegamenti al muro', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'principiante', attrezzo:'corpo libero', luogo:'casa', alternativa:'', setup:'In piedi davanti al muro.', esecuzione:'Piega le braccia.' },
  { codice:'EX002', nome:'Panca piana bilanciere', pattern:'spinta orizzontale', gruppo_target:'pettorali', livello:'principiante', attrezzo:'bilanciere', luogo:'palestra', surrogato_attrezzo:'panca+elastico', alternativa:'', setup:'Sdraiato sulla panca.', esecuzione:'Spingi.' },
  { codice:'EX300', nome:'Curl elastico', pattern:'isolamento', gruppo_target:'bicipiti', livello:'principiante', attrezzo:'elastico', luogo:'casa', alternativa:'', setup:'', esecuzione:'' },
  { codice:'EX301', nome:'Curl concentrato', pattern:'isolamento', gruppo_target:'bicipiti', livello:'intermedio', attrezzo:'manubri', luogo:'palestra', alternativa:'EX300', setup:'Seduto.', esecuzione:'Fletti.' },
  { codice:'EX302', nome:'Alzate laterali elastico', pattern:'isolamento', gruppo_target:'deltoidi', livello:'principiante', attrezzo:'elastico', luogo:'casa', alternativa:'', setup:'', esecuzione:'' },
];
const casa = { tipoAllen:'casa', attrezzatura:['elastico','corpo_libero'] };
const per = (c) => CAT.find(x => x.codice === c);

// ── Parte 1: la regola ──
let v = R.varianteFacile(per('EX003'), CAT, casa);
atteso('alternativa scritta · si prende la prima che si può fare', [v.codice, v.nome, v.via], ['EX576', 'Piegamenti tocco ai piedi', 'alternativa']);
v = R.varianteFacile(per('EX576'), CAT, casa);
atteso('EX576 ha sé stesso come alternativa · si ignora, si scende di livello', [v.codice, v.via], ['EX200', 'livello']);
atteso('come si fa · due righe, prima frase di setup ed esecuzione', v.come.length, 2);
atteso('come si fa · il punto esclamativo chiude la frase', v.come[0], 'Ginocchia a terra, mani sotto le spalle!');
atteso('come si fa · riga lunga tagliata a parola intera con …', [v.come[1].length <= 140, /…$/.test(v.come[1]), / $/.test(v.come[1].replace('…',''))], [true, true, false]);
v = R.varianteFacile(per('EX003'), CAT, { ...casa, inScheda:['EX576', 'EX200'] });
atteso('alternativa già in scheda · la prende lo stesso (è scritta a catalogo)', v.codice, 'EX576');
v = R.varianteFacile(per('EX200'), CAT, casa);
atteso('già al livello più basso · nessuna variante', v, null);
v = R.varianteFacile(per('EX003'), CAT.filter(x => x.codice !== 'EX576' && x.codice !== 'EX200'), casa);
atteso('senza alternative scritte · stesso schema, livello più basso, codice più basso', v.codice, 'EX201');
v = R.varianteFacile(per('EX003'), CAT.filter(x => x.codice !== 'EX576' && x.codice !== 'EX200'), { ...casa, inScheda:['EX201'] });
atteso('a livello · esclude chi è già in scheda', v, null);
v = R.varianteFacile(per('EX003'), CAT.filter(x => x.codice !== 'EX576' && x.codice !== 'EX200'), { tipoAllen:'palestra', attrezzatura:[] });
atteso('in palestra · tutto ammesso, vince il codice più basso', v.codice, 'EX002');
v = R.varianteFacile(per('EX003'), CAT.filter(x => x.codice !== 'EX576' && x.codice !== 'EX200'), { tipoAllen:'casa', attrezzatura:['panca','elastico'] });
atteso('a casa col surrogato · la panca con elastico entra', v.codice, 'EX002');
v = R.varianteFacile(per('EX301'), CAT, casa);
atteso('isolamento · alternativa scritta, stesso gruppo', v.codice, 'EX300');
v = R.varianteFacile(per('EX301'), CAT.filter(x => x.codice !== 'EX300'), casa);
atteso('isolamento senza alternativa · un altro gruppo non vale', v, null);
atteso('senza riga attuale · null', [R.varianteFacile(null, CAT, casa), R.varianteFacile({ codice:'EX999' }, CAT, casa)], [null, null]);
atteso('all\'aperto · solo attrezzi portatili, e il luogo deve ammetterlo', [R.puoFare(per('EX003'), { tipoAllen:'aperto' }), R.puoFare(per('EX002'), { tipoAllen:'aperto' }), R.puoFare(per('EX201'), { tipoAllen:'aperto' })], [true, false, false]);
atteso('stessi ingressi, stessa scelta', JSON.stringify(R.varianteFacile(per('EX003'), CAT, casa)) === JSON.stringify(R.varianteFacile(per('EX003'), CAT.slice().reverse(), casa)), true);

// ── Parte 2: l'app vera ──
const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Forza', rir:2, rest:'2 min', exercises:[
  { codice:'EX003', name:'Piegamenti', sets:3, reps:'8-12', rest_sec:90 },
  { codice:'EX200', name:'Piegamenti sulle ginocchia', sets:3, reps:'8-12', rest_sec:90 },
  { codice:'EX302', name:'Alzate laterali elastico', sets:2, reps:'10-15', rest_sec:60 },
] } ] };
function fixture(catalogo){
  return {
    profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true, unit:'lbs', train_start_date:'2026-10-05', tipo_allenamento:'casa', attrezzatura:['elastico','corpo_libero'] }],
    schede_utente:[{ id:'s1', user_id:U, attiva:true, blocco_n:3, scheda: JSON.parse(JSON.stringify(scheda)) }],
    esercizi_catalog: JSON.parse(JSON.stringify(catalogo)),
    training_logs:[], training_notes:[], workouts:[], body_logs:[], weight_logs:[], meals:[], meal_items:[], fasting_days:[], daily_log:[], app_errors:[],
    supplements:[], nutrilite_catalog:[], supplements_log:[], coach_proposals:[],
  };
}
const aspetta = (ms) => new Promise(r => setTimeout(r, ms || 30));
async function nuovo(catalogo, opts){
  const t = fixture(catalogo || CAT);
  const b = boot(t, { now: OGGI + 'T07:00:00' });
  await b.avviato;
  const ST = b.win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = t.profiles[0]; ST.catalog = []; ST.activeDay = OGGI;
  await b.win.loadActiveScheda();
  ST.page = 'training'; ST.trainSession = 'upperA'; ST.trainAnticipato = 'upperA'; ST.lastLoggedSets = {}; ST.aiCue = ST.aiCue || {}; ST.aiSuggestions = ST.aiSuggestions || {};
  b.win.callAI = async () => '';
  b.gifChieste = [];
  b.win.fetch = async (url) => { b.gifChieste.push(String(url)); return { ok:true, status:200, json: async () => ({ status:'cached', cached_url:'https://gif/x.gif' }) }; };
  if(opts && opts.senzaRete) Object.defineProperty(b.win.navigator, 'onLine', { get: () => false, configurable:true });
  return { ...b, ST, t };
}
const card = (b, nome) => { const el = b.win.document.getElementById('excard-' + nome.replace(/[^a-zA-Z0-9]/g, '_')); const s = el && el.querySelector('.ex-suggestion'); return s ? s.innerHTML : null; };
const SUGG = 'S2: variante più facile · punta a 8 reps · RIR 2';

(async () => {
  // A. esercizio con alternativa: la card nomina l'esercizio, col codice, e apre il foglio con GIF e due righe
  {
    const b = await nuovo();
    b.ST.aiSuggestions['upperA_Piegamenti'] = SUGG;
    b.win.renderTraining();
    atteso('A · al primo disegno la ricerca parte, il testo lo dice', /variante più facile.*cerco quale/.test(testo(card(b, 'Piegamenti'))), true);
    await aspetta(60);
    const html = card(b, 'Piegamenti');
    atteso('A · dopo la lettura: nome e codice nel suggerimento', testo(html), 'S2: variante più facile: Piegamenti tocco ai piedi EX576 › · punta a 8 reps · RIR 2');
    atteso('A · il nome è un tocco che apre il foglio', /apriVarianteFacile\('upperA_Piegamenti'\)/.test(html), true);
    atteso('A · letture al catalogo: la riga, le alternative scritte, lo schema', b.supa._calls.filter(c => c.table === 'esercizi_catalog' && c.cols === 'codice, nome, pattern, gruppo_target, livello, attrezzo, surrogato_attrezzo, luogo, alternativa, setup, esecuzione').length, 3);
    b.win.renderTraining();
    atteso('A · un secondo disegno non rilegge', b.supa._calls.filter(c => c.table === 'esercizi_catalog' && c.cols && c.cols.startsWith('codice, nome, pattern')).length, 3);
    b.win.apriVarianteFacile('upperA_Piegamenti');
    await aspetta(40);
    const foglio = b.win.document.getElementById('variante-facile-sheet');
    atteso('A · il foglio: titolo, codice, GIF chiesta per codice', [!!foglio, /Piegamenti tocco ai piedi/.test(testo(foglio.innerHTML)), /EX576/.test(testo(foglio.innerHTML)), b.gifChieste.some(u => /exercise-media\?code=EX576/.test(u))], [true, true, true, true]);
    atteso('A · la GIF arrivata è nel foglio', !!foglio.querySelector('img.rest-hero-gif'), true);
    atteso('A · senza testo a catalogo lo dice', /non ha ancora la descrizione/.test(testo(foglio.innerHTML)), true);
    b.win.chiudiVarianteFacile();
    atteso('A · chiuso', !!b.win.document.getElementById('variante-facile-sheet'), false);
    // il foglio con le due righe, su una variante che le ha
    b.ST.aiSuggestions['upperA_Piegamenti sulle ginocchia'] = SUGG;
    b.win.renderTraining(); await aspetta(60);
    atteso('A · EX200 è già al livello più basso: resta la frase, niente tocco', testo(card(b, 'Piegamenti sulle ginocchia')), SUGG);
  }
  // B. la schermata di recupero mostra la stessa cosa della card
  {
    const b = await nuovo();
    b.ST.aiSuggestions['upperA_Piegamenti'] = SUGG;
    b.win.startTrainingCountdown(90, 'Piegamenti', 'upperA');
    await aspetta(60);
    b.win.renderTraining();
    const next = b.win.document.querySelector('.rest-card--next');
    atteso('B · PROSSIMA nel recupero: nome e codice', next ? testo(next.innerHTML) : null, 'PROSSIMA S2: variante più facile: Piegamenti tocco ai piedi EX576 › · punta a 8 reps · RIR 2');
    b.win.clearInterval(b.ST._countdownInterval);
  }
  // C. senza alternativa a catalogo: la frase resta com'era, nessun tocco
  {
    const b = await nuovo(CAT.filter(x => x.codice === 'EX003' || x.codice === 'EX302'));
    b.ST.aiSuggestions['upperA_Piegamenti'] = SUGG;
    b.win.renderTraining(); await aspetta(60);
    atteso('C · nessuna variante: frase di prima, nessun tocco', [testo(card(b, 'Piegamenti')), /apriVarianteFacile/.test(card(b, 'Piegamenti'))], [SUGG, false]);
    atteso('C · un suggerimento senza la frase resta com\'è', (b.ST.aiSuggestions['upperA_Alzate laterali elastico'] = 'S2: 20 lbs · 12 reps · RIR 2', b.win.renderTraining(), testo(card(b, 'Alzate laterali elastico'))), 'S2: 20 lbs · 12 reps · RIR 2');
  }
  // D. senza rete: niente letture, la frase lo dice; al ritorno della rete si cerca
  {
    const b = await nuovo(CAT, { senzaRete:true });
    b.ST.aiSuggestions['upperA_Piegamenti'] = SUGG;
    b.win.renderTraining(); await aspetta(40);
    atteso('D · senza rete: nessuna lettura, la frase lo dice', [b.supa._calls.filter(c => c.table === 'esercizi_catalog' && c.cols && c.cols.startsWith('codice, nome, pattern')).length, testo(card(b, 'Piegamenti'))], [0, 'S2: variante più facile (quale te lo dico quando torna la rete) · punta a 8 reps · RIR 2']);
    b.ST.aiSuggestions['upperA_Piegamenti sulle ginocchia'] = SUGG;
    b.win.renderTraining(); b.win.renderTraining(); await aspetta(40);
    atteso('D · senza rete, altri disegni: ancora nessuna lettura', b.supa._calls.filter(c => c.table === 'esercizi_catalog' && c.cols && c.cols.startsWith('codice, nome, pattern')).length, 0);
    Object.defineProperty(b.win.navigator, 'onLine', { get: () => true, configurable:true });
    b.win.renderTraining(); await aspetta(60);
    atteso('D · tornata la rete: nome e codice', /Piegamenti tocco ai piedi EX576/.test(testo(card(b, 'Piegamenti'))), true);
  }
  // E. il catalogo non risponde: frase di prima, nessun errore a schermo
  {
    const b = await nuovo();
    b.t.__assenti = ['esercizi_catalog'];
    b.ST.aiSuggestions['upperA_Piegamenti'] = SUGG;
    b.win.renderTraining(); await aspetta(60);
    atteso('E · lettura fallita: frase di prima', testo(card(b, 'Piegamenti')), SUGG);
    const prima = b.supa._calls.filter(c => c.table === 'esercizi_catalog').length;
    b.win.renderTraining(); b.win.renderTraining(); await aspetta(40);
    atteso('E · dopo un fallimento non si rilegge a ogni disegno', b.supa._calls.filter(c => c.table === 'esercizi_catalog').length - prima, 0);
    atteso('E · nessun errore in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])), []);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
