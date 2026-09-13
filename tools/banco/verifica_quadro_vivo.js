// Quadro settimanale — verifica dal vivo dello storico (sola lettura).
// Da lanciare DOPO la migrazione e dopo aver aperto l'app una volta:
//   node tools/banco/verifica_quadro_vivo.js [user_id]
// Dice: quante settimane ci sono in weekly_pictures, se ci sono doppioni, se la
// settimana corrente è stata salvata (non deve), e se ogni quadro salvato coincide
// col ricalcolo dal vivo (tolto computed_at). Non scrive niente.
process.env.TZ = 'Europe/Rome';
const { bootVivo } = require('./vivo');
// jsonb riordina le chiavi (per lunghezza, poi alfabetico): confrontare le stringhe
// dice "diverso" su quadri identici. Si confronta a chiavi ordinate.
const ordina = (v) => Array.isArray(v) ? v.map(ordina)
  : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordina(v[k])])) : v;
const U = process.argv[2] || 'bb6fa499-1364-4d8d-8ce6-774c8e392306';   // Ignazio
(async () => {
  const { win, real } = bootVivo();
  const ST = win.eval('ST');
  const p = await real.from('profiles').select('*').eq('id', U).single();
  if(p.error) throw p.error;
  ST.user = { id: U }; try { win.applyProfile(p.data); } catch(e){} ST.profile = p.data;
  await win.loadActiveScheda();
  const r = await real.from('weekly_pictures').select('week_start, picture, computed_at').eq('user_id', U).order('week_start').range(0, 999);
  if(r.error){ console.log('weekly_pictures non leggibile:', r.error.code, r.error.message); process.exit(1); }
  const settimane = r.data.map(x => x.week_start);
  const cur = win.wpMonday();
  console.log('righe:', r.data.length, '·', settimane.join(', '));
  console.log('doppioni:', settimane.length - new Set(settimane).size);
  console.log('settimana corrente salvata:', settimane.includes(cur) ? 'SÌ (errore)' : 'no');
  let uguali = 0, senzaCampiNuovi = 0;
  for(const row of r.data){
    // Il ricalcolo usa il profilo di oggi: un obiettivo cambiato dopo il salvataggio si vede qui come differenza.
    const vivo = JSON.parse(JSON.stringify(await win.buildWeeklyPicture(row.week_start)));
    const salvato = JSON.parse(JSON.stringify(row.picture));
    delete vivo.meta.computed_at; delete salvato.meta.computed_at;
    // Righe salvate prima del 13 settembre 2026: weight_last e weight_last_date non c'erano.
    // Mancano per nascita, non per errore: si confronta il resto.
    if(salvato.weight && vivo.weight && !('weight_last' in salvato.weight)){ delete vivo.weight.weight_last; delete vivo.weight.weight_last_date; senzaCampiNuovi++; }
    if(JSON.stringify(ordina(vivo)) === JSON.stringify(ordina(salvato))) uguali++;
    else console.log('  diverso:', row.week_start, JSON.stringify(salvato).length, 'vs', JSON.stringify(vivo).length, 'caratteri');
  }
  console.log('uguali al ricalcolo:', uguali, '/', r.data.length, '· righe senza weight_last (salvate prima del 13 set):', senzaCampiNuovi);
  // Peso attuale: il quadro della settimana in corso e il tab Body devono dire lo stesso numero
  const corrente = await win.buildWeeklyPicture(cur);
  ST.page = 'body'; ST.bodyTab = 'misure';
  await win.loadBodyLogs();
  const bodyW = win.getLatestBodyData().weight_kg;
  const quadroW = corrente.weight && corrente.weight.weight_last;
  console.log('peso attuale · quadro:', quadroW, corrente.weight && corrente.weight.weight_last_date, '· tab Body:', bodyW, '·', Number(quadroW) === Number(bodyW) ? 'coincidono' : 'DIVERSI');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
