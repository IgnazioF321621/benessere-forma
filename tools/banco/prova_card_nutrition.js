// Home 040: la card Nutrition della Home aggiunge solo ciò che le altre parti non dicono.
// Il piatto del piano per il prossimo pranzo (fino alle 15) o cena (fino alle 22) non ancora registrato,
// con «Registra» che apre il form già compilato; «Ultimo pasto N h fa» dopo 5 ore (fra le 8 e le 22).
// Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_card_nutrition.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(60), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
// il piano di martedì 13 (giorno 2) come lo tiene in memoria il Piano: mealsByDay per giorno della settimana
const PIANO = { state:'loaded', plan:{ id:'p1' }, mealsByDay:{ 2:[ { slot:'pranzo', name:'Orata e quinoa', ingredients:['orata 150 g', 'quinoa 80 g', 'zucchine'] }, { slot:'cena', name:'Pollo e patate', ingredients:[] } ],
  3:[ { slot:'pranzo', name:'Piatto di domani', ingredients:[] } ] } };

async function home(ora, o){
  o = o || {};
  const b = boot({ profiles:[], meals:[], meal_items:[], fasting_days:[], supplements_log:[] }, { now:`${OGGI}T${ora}:00`, file: process.argv[2] });
  await b.avviato; await attendi(20);
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' };
  ST.profile = { id:U, first_name:'Ignazio', m2_skipped:true };
  ST.db = ST.db || {}; ST.db.days = ST.db.days || {};
  ST.db.days[OGGI] = { key:OGGI, meals: o.pasti || [], suppsTaken: [] };
  const settimana = W._pianoV4WeekStartIsoForDate(OGGI);
  ST.pianoV4RealPlanCache = {};
  if(o.piano !== 'assente') ST.pianoV4RealPlanCache[settimana] = (o.piano === undefined ? PIANO : o.piano);
  let richieste = 0; W._pianoV4LoadRealPlanForWeek = async () => { richieste++; };
  if(o.giornoSfogliato) ST.activeDay = o.giornoSfogliato;
  ST.page = 'home'; W.renderHomeV2();
  const card = [...W.document.querySelectorAll('#page-home .home-v2-card')].find(c => /Nutrition/.test(testo(c.querySelector('.home-v2-card-title')) || ''));
  const righe = card ? [...card.querySelectorAll('.home-v2-nutr-riga')].map(testo) : null;
  return { W, ST, card, righe, richieste: () => richieste };
}

(async () => {
  let h = await home('12:30');
  atteso('12:30, pranzo non registrato: il piatto del piano', h.righe, ['Pranzo dal piano Orata e quinoa Registra']);
  const btn = h.card && h.card.querySelector('.home-v2-nutr-btn');
  if(btn) btn.click(); await attendi(20);
  atteso('«Registra»: Nutrition, form del pranzo già compilato', [h.ST.page, h.ST.logOpen, h.ST.logSlot, h.ST.logTime, h.ST.smartForm && h.ST.smartForm.freeText],
    ['oggi', true, 'pranzo', '12:30', 'orata 150 g, quinoa 80 g, zucchine']);
  h = await home('13:00', { pasti:[{ id:'m1', slot:'pranzo', time:'12:45' }] });
  atteso('pranzo già registrato: niente riga', h.righe, []);
  h = await home('16:00', { pasti:[{ id:'m1', slot:'pranzo', time:'12:45' }] });
  atteso('16:00: la cena dal piano (solo il piatto, ingredienti vuoti)', h.righe, ['Cena dal piano Pollo e patate Registra']);
  h = await home('12:30', { piano:{ state:'loaded', plan:null } });
  atteso('piano assente nel database: niente riga, e nessuna richiesta', [h.righe, h.richieste()], [[], 0]);
  h = await home('12:30', { piano:'assente' });
  h.W.renderHomeV2(); h.W.renderHomeV2();
  atteso('piano mai letto: dalla Home una richiesta sola, anche con più disegni', [h.righe, h.richieste()], [[], 1]);
  h = await home('12:30', { giornoSfogliato:'2026-10-14' });
  atteso('nel tab Nutrition si sfoglia domani: la Home resta su oggi', h.righe, ['Pranzo dal piano Orata e quinoa Registra']);
  h = await home('22:30', { piano:PIANO });
  atteso('dopo le 22: niente', h.righe, []);
  h = await home('13:30', { piano:{ state:'loaded', plan:null }, pasti:[{ id:'m0', slot:'colazione', time:'08:15' }] });
  atteso('ultimo pasto alle 8:15, ora 13:30: «Ultimo pasto 5 h fa»', h.righe, ['Ultimo pasto 5 h fa']);
  h = await home('12:00', { piano:{ state:'loaded', plan:null }, pasti:[{ id:'m0', slot:'colazione', time:'08:15' }] });
  atteso('meno di 5 ore: niente avviso', h.righe, []);
  h = await home('07:30', { piano:{ state:'loaded', plan:null }, pasti:[{ id:'m0', slot:'colazione', time:'01:00' }] });
  atteso('prima delle 8: niente avviso', h.righe, []);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
