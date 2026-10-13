// Home 050: card Body della Home. Il peso è l'ultima pesata di getWeighIns (pesate rapide comprese, L48),
// con la virgola come nel quadro; la variazione dice rispetto a quando («da domenica», «da ieri», «dal 3 ott»)
// e ha i colori per nome; il tocco sul peso apre «Pesati ora» senza aprire il tab; «+ pesata di oggi» se manca;
// il check in parole semplici. Prima/dopo: sul file vecchio KO.
//   node tools/banco/prova_card_body.js [file di prima]
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-10-13';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(62), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;

async function home(o){
  o = o || {};
  const b = boot({ profiles:[], meals:[], meal_items:[], fasting_days:[], supplements_log:[] }, { now:`${OGGI}T09:00:00`, file: process.argv[2] });
  await b.avviato; await attendi(20);
  const W = b.win, ST = W.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' };
  ST.profile = { id:U, first_name:'Ignazio', m2_skipped:true, goal_weight_kg: o.obiettivo != null ? o.obiettivo : 68, weight_kg: 80 };
  ST.weightLogs = o.pesate || []; ST.bodyLogs = o.bodyLogs || []; ST.bodyMeasurements = []; ST.bodyChecks = [];
  if(o.check) W.getNextCheckpointInfo = () => o.check;
  let pesati = 0; W.openWeighInSheet = () => { pesati++; };
  ST.page = 'home'; W.renderHomeV2();
  const card = [...W.document.querySelectorAll('#page-home .home-v2-card')].find(c => testo(c.querySelector('.home-v2-card-title')) === 'Body');
  const q = (sel) => card && card.querySelector(sel);
  return { W, ST, card, q, pesati: () => pesati,
    vista: () => [testo(q('.home-v2-body-weight')), testo(q('.home-v2-body-delta')), !!q('.home-v2-body-pesata'), testo(q('.home-v2-body-sub'))] };
}

(async () => {
  let h = await home({ pesate:[{ date:OGGI, weight_kg:72.1 }, { date:'2026-10-11', weight_kg:72.5 }] });
  atteso('peso con la virgola, «da domenica», pesata di oggi già fatta', h.vista().slice(0, 3), ['72,1', '↓ −0,4 kg da domenica', false]);
  atteso('verso l\'obiettivo (68): colore per nome, accento', h.q('.home-v2-body-delta') && h.q('.home-v2-body-delta').getAttribute('style'), 'color:var(--acc);');
  h = await home({ pesate:[{ date:'2026-10-12', weight_kg:72.1 }, { date:'2026-10-11', weight_kg:71.8 }] });
  atteso('lontano dall\'obiettivo: colore errore, manca la pesata di oggi', [h.vista()[1], h.q('.home-v2-body-delta').getAttribute('style'), h.vista()[2]], ['↑ +0,3 kg da domenica', 'color:var(--err);', true]);
  h = await home({ pesate:[{ date:OGGI, weight_kg:72.0 }, { date:'2026-10-12', weight_kg:72.2 }] });
  atteso('pesata precedente ieri: «da ieri»', h.vista()[1], '↓ −0,2 kg da ieri');
  h = await home({ pesate:[{ date:OGGI, weight_kg:72 }, { date:'2026-10-03', weight_kg:72 }] });
  atteso('variazione nulla e pesata vecchia: neutro, «dal 3 ott»', [h.vista()[1], h.q('.home-v2-body-delta').getAttribute('style')], ['0,0 kg dal 3 ott', 'color:var(--t3);']);
  h = await home({ pesate:[{ date:OGGI, weight_kg:73 }, { date:'2026-10-08', weight_kg:73.5 }] });
  atteso('l\'8 del mese: «da giovedì» (entro 6 giorni)', h.vista()[1], '↓ −0,5 kg da giovedì');
  h = await home({ pesate:[{ date:OGGI, weight_kg:72.1 }], bodyLogs:[{ id:'b1', date:'2026-10-01', weight_kg:75 }] });
  atteso('il peso della pesata rapida vince sul vecchio body_logs (L48)', h.vista()[0], '72,1');

  // il tocco sul peso apre la pesata senza aprire il tab Body
  h = await home({ pesate:[{ date:'2026-10-12', weight_kg:72.1 }] });
  h.q('.home-v2-body-peso').click(); await attendi(10);
  atteso('tocco sul peso: «Pesati ora», si resta in Home', [h.pesati(), h.ST.page], [1, 'home']);
  h.q('.home-v2-body-pesata').click(); await attendi(10);
  atteso('«+ pesata di oggi»: «Pesati ora»', [testo(h.q('.home-v2-body-pesata')), h.pesati(), h.ST.page], ['+ pesata di oggi', 2, 'home']);

  // il check in parole semplici
  h = await home({ pesate:[], check:{ hasCheck:true, overdue:false, daysUntil:12 } });
  atteso('check fra 12 giorni', h.vista()[3], 'Prossimo check fisico tra 12 giorni');
  h = await home({ pesate:[], check:{ hasCheck:true, overdue:false, daysUntil:-3 } });
  atteso('niente «mesociclo»: check a fine blocco', h.vista()[3], 'Check fisico a fine blocco');
  h = await home({ pesate:[] });
  atteso('nessun check: primo check fisico da fare', h.vista()[3], 'Primo check fisico da fare');

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
