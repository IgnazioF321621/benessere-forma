// Fase 3 — Lavoro D: le regole di Pirsi sulla storia vera (sola lettura).
// Per ognuna delle ultime N settimane chiuse salvate in weekly_pictures: il quadro di
// quella settimana, le settimane prima come storia, il profilo di oggi → le proposte.
//   node tools/banco/verifica_proposte_vivo.js [user_id] [N=4]
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');
const R = require('../../shared/coach_rules.js');
const REPO = path.join(__dirname, '..', '..');
const vars = Object.fromEntries(fs.readFileSync(REPO + '/worker/.dev.vars', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]));
const sb = createClient('https://qxiyeiahpoiliwpqslpr.supabase.co', vars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const U = process.argv[2] || 'bb6fa499-1364-4d8d-8ce6-774c8e392306';
const N = Number(process.argv[3] || 4);
(async () => {
  const [p, w] = await Promise.all([
    sb.from('profiles').select('first_name, obiettivo, goal_weight_kg, weight_kg, target_kcal, target_protein, target_carbs, target_fat, giorni_allenamento, train_start_date').eq('id', U).single(),
    sb.from('weekly_pictures').select('week_start, picture').eq('user_id', U).order('week_start').range(0, 999),
  ]);
  if(p.error || w.error) throw (p.error || w.error);
  const pics = w.data.map(r => r.picture);
  console.log(`${p.data.first_name} · obiettivo ${p.data.obiettivo} → direzione ${R.direzione(p.data, null)} · target ${p.data.target_kcal} kcal / ${p.data.target_protein} g · regole ${R.RULES_VERSION}\n`);
  for(const pic of pics.slice(-N)){
    const hist = pics.filter(x => x.meta.week_start < pic.meta.week_start);
    const ps = R.buildProposals(pic, hist, p.data, { proposals: [] });
    const q = pic;
    console.log(`── settimana ${q.meta.week_start} · pesate ${q.weight && q.weight.weight_n} · peso medio ${q.weight && q.weight.weight_avg} · giorni pasti ${q.nutrition && q.nutrition.days_logged} (parziali ${q.nutrition && q.nutrition.days_partial}) · kcal ${q.nutrition && q.nutrition.kcal_avg} · proteine ${q.nutrition && q.nutrition.protein_avg} · sessioni ${q.training && q.training.sessions_done}/${q.training && q.training.sessions_planned} · RIR ${q.training && q.training.avg_rir} · sett. blocco ${q.training && q.training.block_week} · check ${q.body && q.body.days_since_check} gg · esami ${q.blood && q.blood.test_count}`);
    ps.forEach((x, i) => {
      console.log(`   ${i + 1}. [${x.kind}] ${x.title}\n      ${x.reason}\n      ${x.evidence.numeri.map(r => r.label + ': ' + r.value).join(' · ')}${x.change ? '\n      cambia: ' + JSON.stringify(x.change) : ''}`);
    });
    console.log('');
  }
})();
