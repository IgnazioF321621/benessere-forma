// Fase 3 — Lavoro B: il quadro conta la giornata come il tab Nutrition (sola lettura).
// Per ogni giorno della settimana indicata mette a confronto il totale del tab Nutrition
// (dayTotals su ST.db.days, caricato come lo carica l'app) con il totale che il quadro
// calcola dalle sue letture (shared/nutrizione.js su _wpFetch). Poi medie contro quadro.
//   node tools/banco/verifica_nutrizione_quadro.js [lunedì] [user_id]
process.env.TZ = 'Europe/Rome';
const { bootVivo } = require('./vivo');
const U = process.argv[3] || 'bb6fa499-1364-4d8d-8ce6-774c8e392306';
(async () => {
  const { win, real } = bootVivo();
  const ST = win.eval('ST');
  const p = await real.from('profiles').select('*').eq('id', U).single();
  ST.user = { id: U }; ST.profile = p.data; try { win.applyProfile(p.data); } catch(e){}
  const WS = process.argv[2] || win.wpAddDays(win.wpMonday(), -7);
  await win.loadCatalog(); await win.loadSupps(); await win.loadAllDays(); await win.loadExtrasAll();
  const raw = await win._wpFetch(U, WS);
  const built = win.ZTNutrizione.buildDays({ meals: raw.meals, suppLogs: raw.suppLogs, supps: raw.supps, catalog: raw.catalog });
  const pic = await win.buildWeeklyPicture(WS);
  const f = (x) => x == null ? '—' : String(Math.round(x * 10) / 10).replace('.', ',');
  console.log(`settimana ${WS} · ${p.data.first_name}\n`);
  console.log('| giorno | pasti principali | tab Nutrition kcal · prot | quadro kcal · prot | integratori kcal · prot | uguali |');
  console.log('|---|---|---|---|---|---|');
  const tab = [];
  for(let i = 0; i < 7; i++){
    const k = win.wpAddDays(WS, i);
    const dTab = ST.db.days[k];
    const tTab = dTab && dTab.meals.length ? win.dayTotals(dTab) : null;
    const dQ = built.days[k];
    const tQ = dQ && dQ.meals.length ? win.ZTNutrizione.dayTotals(dQ, built.ref, true) : null;
    const principali = dQ ? new Set(dQ.meals.map(m => m.slot).filter(s => ['colazione','pranzo','cena'].includes(s))).size : 0;
    const uguali = JSON.stringify(tTab && [tTab.kcal, tTab.protein]) === JSON.stringify(tQ && [tQ.kcal, tQ.protein]);
    if(tTab) tab.push(tTab);
    console.log(`| ${k} | ${principali}/3 | ${tTab ? f(tTab.kcal) + ' · ' + f(tTab.protein) : 'non registrato'} | ${tQ ? f(tQ.kcal) + ' · ' + f(tQ.protein) : 'non registrato'} | ${tQ ? f(tQ.supp.kcal) + ' · ' + f(tQ.supp.protein) : '—'} | ${uguali ? 'sì' : '**NO**'} |`);
  }
  const media = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const n = pic.nutrition;
  console.log(`\nmedie tab Nutrition: ${Math.round(media(tab.map(t => t.kcal)))} kcal · ${Math.round(media(tab.map(t => t.protein)))} g su ${tab.length} giorni`);
  console.log(`quadro:               ${n.kcal_avg} kcal · ${n.protein_avg} g su ${n.days_logged} giorni · integratori ${n.supp_kcal_avg} kcal · ${n.supp_protein_avg} g · parziali ${n.days_partial} → partial ${n.partial}`);
  process.exit(0);
})();
