// Home 170 passo 2: il tab Energia del Body. Linee di energia e stress per giorno (media), il mattino di
// «Come stai oggi» (daily_log) come primo punto del giorno e poi le rilevazioni di «Come stai adesso?»;
// oggi punto per punto con le parole di Home 160 e la direzione (cala · sale · stabile); la media per
// momento della giornata; sonno medio e riposini. Si legge dal database solo aprendo il tab, una volta
// al giorno per periodo. Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_energia_body.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-14';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const parti = (el) => el ? [...el.children].map(testo).join(' ') : null;   // un pezzo per casella
const r = (id, giorno, orario, energy, stress, riposino_min) => ({ id, user_id:U, giorno, orario, energy, stress, riposino_min, note:null,
  rilevata_il: new Date(`${giorno}T${String(orario).padStart(2, '0')}:05:00`).toISOString() });
const RILEVAZIONI = [
  r('a', '2026-10-13', 11, 4, 2, 0), r('b', '2026-10-13', 15, 3, 3, 30), r('c', '2026-10-13', 19, 2, 4, 0),
  r('d', OGGI, 11, 3, 2, 0), r('e', OGGI, 15, 2, 4, 15),
  r('z', '2026-09-20', 11, 5, 1, 0),                                   // fuori dalla settimana, dentro il mese
];
const DIARIO = [
  { id:'d1', user_id:U, date:OGGI, sleep_hours:7, energy:4, stress:2, day_type:null, note:null },
  { id:'d0', user_id:U, date:'2026-10-13', sleep_hours:6, energy:5, stress:1, day_type:null, note:null },
];

async function app(o){
  o = o || {};
  const t = { profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], supplements_log:[],
    daily_log: o.diario || DIARIO, rilevazioni: o.rilevazioni || RILEVAZIONI, app_errors:[], weight_logs:[], body_logs:[], body_measurements:[],
    __sessione:{ user:{ id:U, email:'ignazio.f@me.com' } }, __assenti: o.assenti || [] };
  const b = boot(t, { now:`${OGGI}T09:00:00`, file: process.argv[2], locale:{ zt_installa_visto:'1' } });
  await b.avviato;
  for(let i = 0; i < 300 && !b.win.document.getElementById('app').classList.contains('visible'); i++) await attendi(10);
  b.t = t; b.ST = b.win.eval('ST');
  b.letture = () => b.supa._calls.filter(c => c.table === 'rilevazioni' && c.op === 'select').length;
  b.apri = async () => { b.ST.page = 'body'; b.ST.bodyTab = 'energia'; b.win.renderBody(); await attendi(40); b.win.renderBody(); await attendi(10); };
  b.q = (s) => b.win.document.querySelector('#page-body ' + s);
  b.qq = (s) => [...b.win.document.querySelectorAll('#page-body ' + s)];
  return b;
}

(async () => {
  // 1) il calcolo, puro
  {
    const b = await app();
    const diario = Object.fromEntries(DIARIO.map(d => [d.date, d]));
    const a = typeof b.win.andamentoComeStai === 'function' ? b.win.andamentoComeStai(RILEVAZIONI, diario, 7, OGGI) : null;
    const g = (k) => a && a.giorni.find(x => x.giorno === k);
    atteso('7 giorni, da mercoledì scorso a oggi', a && [a.giorni.length, a.giorni[0].giorno, a.giorni[6].giorno], [7, '2026-10-08', OGGI]);
    atteso('ieri: mattino + 3 rilevazioni, medie', g('2026-10-13') && [g('2026-10-13').punti, g('2026-10-13').energy, g('2026-10-13').stress, g('2026-10-13').sonno], [4, 3.5, 2.5, 6]);
    atteso('oggi: mattino, 11, 15 e la direzione', a && [a.oggi.punti.map(p => [p.momento, p.energy, p.stress]), a.oggi.energia, a.oggi.stress],
      [[['mattino', 4, 2], [11, 3, 2], [15, 2, 4]], 'cala', 'sale']);
    atteso('nella giornata: media per momento', a && a.nellaGiornata.map(m => [m.momento, m.energy, m.stress]),
      [['mattino', 4.5, 1.5], [11, 3.5, 2], [15, 2.5, 3.5], [19, 2, 4]]);
    atteso('sonno medio e riposini', a && [a.sonnoMedio, a.riposini, a.riposinoMin], [6.5, 2, 45]);
    atteso('giorni senza dati: vuoti, non zero', g('2026-10-10') && [g('2026-10-10').energy, g('2026-10-10').punti], [null, 0]);
  }
  // 2) il tab: nessuna lettura all'avvio, una sola aprendolo, a schermo con le parole
  {
    const b = await app();
    atteso('all\'avvio nessuna lettura delle rilevazioni', b.letture(), 0);
    await b.apri();
    atteso('tab «Energia» fra quelli del Body', b.qq('.nutrition-subnav .nsn-pill').map(testo), ['Misure', 'Tendenza', 'Check', 'Energia']);
    atteso('aperto: una lettura, dal primo giorno della settimana', [b.letture(), (b.supa._calls.find(c => c.table === 'rilevazioni').filters || []).find(f => f[0] === 'gte')], [1, ['gte', 'giorno', '2026-10-08']]);
    atteso('oggi, punto per punto con le parole', b.qq('.en-riga').map(parti),
      ['mattino Energia 4 buona Stress 2 sereno', '11 Energia 3 normale Stress 2 sereno', '15 Energia 2 bassa Stress 4 teso riposino 15 min']);
    atteso('la direzione di oggi', testo(b.q('.en-verso')), 'Energia ↘ cala · Stress ↗ sale');
    atteso('grafico: due linee e i punti', [b.qq('.en-grafico polyline.en-energy').length, b.qq('.en-grafico polyline.en-stress').length, b.qq('.en-grafico circle.en-energy').length], [1, 1, 2]);
    atteso('sotto: sonno medio e riposini', testo(b.q('.en-sotto')), 'Sonno medio 6,5 h · Riposini 2 (45 min)');
    atteso('nella giornata, con l\'intestazione', parti(b.q('.en-tabella')).replace(/\s+/g, ' ').trim(), 'mattino 11 15 19 Energia 4,5 3,5 2,5 2,0 Stress 1,5 2,0 3,5 4,0');
    b.win.renderBody(); b.win.renderBody(); await attendi(20);
    atteso('ridisegnato: nessuna lettura in più', b.letture(), 1);
    b.ST.energiaPeriodo = 'mese'; b.win.renderBody(); await attendi(40);
    atteso('Mese: una lettura in più, dal 15 settembre', [b.letture(), (b.supa._calls.filter(c => c.table === 'rilevazioni').slice(-1)[0].filters || []).find(f => f[0] === 'gte')], [2, ['gte', 'giorno', '2026-09-15']]);
    b.ST.energiaPeriodo = 'settimana'; b.win.renderBody(); await attendi(20);
    atteso('di nuovo Settimana: il mese la copre già', b.letture(), 2);
  }
  // 3) vuoto e lettura fallita (una sola, con Riprova)
  {
    const b = await app({ rilevazioni:[], diario:[] });
    await b.apri();
    atteso('niente dati: la spiegazione', /Ancora niente da mostrare/.test(testo(b.q('.en-vuoto')) || ''), true);
  }
  {
    const b = await app({ assenti:['rilevazioni'] });
    await b.apri(); b.win.renderBody(); b.win.renderBody(); await attendi(20);
    atteso('lettura fallita: avviso con Riprova, nessun giro di riletture', [!!b.q('.en-nota .en-riprova'), b.letture()], [true, 1]);
    atteso('il mattino di «Come stai oggi» si vede lo stesso', parti(b.qq('.en-riga')[0]), 'mattino Energia 4 buona Stress 2 sereno');
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
