// Fase 2 — Lavoro A: "Peso attuale" grande, media e obiettivo sotto.
// Orologio fermo a domenica 13 settembre 2026, 9:00: la settimana in corso è 7–13 settembre.
// Casi: 3 / 1 / 0 pesate, con e senza obiettivo, pesata vecchia (> 7 giorni), settimana
// chiusa, riga salvata senza i campi nuovi, e il tab Body che dice lo stesso numero.
//   node tools/banco/prova_quadro_peso.js [cartella_uscita]
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('./banco');
const OUT = process.argv[2] || null;
const NOW = '2026-09-13T09:00:00';
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(50), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const wl = (date, kg) => ({ user_id:U, id:'wl-' + date, date, weight_kg:kg });
const vuote = { weight_logs:[], body_logs:[], body_measurements:[], body_checks:[], meals:[], workouts:[], training_logs:[], blood_tests:[], weekly_pictures:[] };

function avvia(tables, profilo){
  const b = boot({ ...vuote, ...tables }, { now: NOW });
  const ST = b.win.eval('ST');
  ST.user = { id:U };
  ST.profile = { id:U, target_kcal:2200, created_at:'2026-05-01T08:00:00Z', ...profilo };
  ST.TARGET = { kcal:2200 };
  ST.page = 'home';
  return b;
}
function snapshot(win, file){
  const doc = win.document;
  const head = [...doc.head.querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"], meta[name="viewport"]')].map(n => n.outerHTML).join('\n');
  const home = doc.getElementById('page-home').outerHTML.replace('class="page"', 'class="page active"');
  fs.writeFileSync(file, `<!doctype html><html lang="it"><head><meta charset="utf-8">${head}
<style>body{margin:0;background:var(--bg);} .page{display:block!important;} #wp-shot{width:375px;margin:0 auto;}</style></head>
<body><div id="wp-shot">${home}</div></body></html>`);
}
// Card Home e vista completa: il blocco "Peso attuale" in chiaro
async function blocchi(win, nome){
  await win.loadWeeklyPicture(win.wpMonday(), { force:true });
  win.renderHomeV2();
  const home = win.document.getElementById('page-home');
  const card = [...home.querySelectorAll('.home-v2-card')].find(c => /La tua settimana/.test(c.textContent));
  const heroCard = card && card.querySelector('.wp-hero');
  if(OUT) snapshot(win, path.join(OUT, `peso-home-${nome}.html`));
  win.openQuadro();
  await new Promise(r => setTimeout(r, 30));
  const heroVista = win.document.querySelector('#page-home .wp-sec .wp-hero');
  if(OUT) snapshot(win, path.join(OUT, `peso-quadro-${nome}.html`));
  return { card: heroCard ? testo(heroCard.innerHTML) : null, vista: heroVista ? testo(heroVista.innerHTML) : null, bottoneCard: !!(heroCard && /Pesati/.test(heroCard.textContent)) };
}

(async () => {
  // 1. tre pesate nella settimana, obiettivo sotto: "da perdere"
  let { win } = avvia({
    weight_logs: [ wl('2026-09-02', 72.6), wl('2026-09-04', 72.2), wl('2026-09-09', 72.4), wl('2026-09-11', 72.0), wl('2026-09-13', 72.1) ],
    body_logs: [ { user_id:U, id:'bl1', date:'2026-04-28', weight_kg:71.75 } ],
    body_checks: [ { user_id:U, id:'c1', status:'completed', created_at:'2026-08-02T05:38:24Z' } ],
    body_measurements: [ { user_id:U, id:'bm1', check_id:'c1', created_at:'2026-08-02T05:53:34Z', weight_kg:69.95, waist_cm:87 } ],
  }, { goal_weight_kg:68 });
  let r = await blocchi(win, '3-pesate');
  const atteso3 = 'Peso attuale 72,1 kg oggi Media settimana 72,2 kg · −0,2 kg rispetto alla scorsa Obiettivo 68 kg · mancano 4,1 kg da perdere';
  atteso('3 pesate · card Home', r.card, atteso3);
  atteso('3 pesate · vista completa', r.vista, atteso3);
  atteso('3 pesate · niente "Pesati" nella card', r.bottoneCard, false);

  // 1b. tab Body, pillola in alto e card Body in Home: lo stesso 72,1 (prima era 69,95 del check)
  const ST = win.eval('ST');
  ST.page = 'body'; ST.bodyTab = 'misure';
  await win.loadBodyLogs();
  const body = win.document.getElementById('page-body').innerHTML;
  const grande = (body.match(/font-size:28px;[^>]*>([^<]*)</) || [])[1];
  atteso('tab Body · numero grande', grande, '72.1');
  atteso('tab Body · data della pesata', /dom 13 set/.test(body), true);
  atteso('pillola peso in alto', win.document.getElementById('h-weight').textContent, '72.1');
  ST.page = 'home'; ST.homeView = null; win.renderHomeV2();
  const cardBody = [...win.document.querySelectorAll('#page-home .home-v2-card')].find(c => /Body/.test(c.querySelector('.home-v2-card-title').textContent));
  atteso('card Body in Home', cardBody.querySelector('.home-v2-body-weight').textContent, '72.1');
  atteso('card Body · delta rispetto alla pesata prima', testo(cardBody.querySelector('.home-v2-body-delta').innerHTML), '↑ +0.1');

  // 2. una pesata sola, senza obiettivo: la media non si mostra
  ({ win } = avvia({ weight_logs: [ wl('2026-09-03', 70.3), wl('2026-09-10', 70.0) ] }, {}));
  r = await blocchi(win, '1-pesata');
  atteso('1 pesata · card', r.card, 'Peso attuale 70,0 kg 3 giorni fa 1 pesata questa settimana');
  atteso('1 pesata · vista', r.vista, r.card);

  // 3. zero pesate in settimana ma una 7 giorni fa: ancora "attuale". Obiettivo sopra: "da prendere"
  ({ win } = avvia({ weight_logs: [ wl('2026-09-06', 52.6) ] }, { goal_weight_kg:55 }));
  r = await blocchi(win, '0-pesate-recente');
  atteso('0 pesate, 7 giorni fa · card', r.card, 'Peso attuale 52,6 kg 7 giorni fa Nessuna pesata questa settimana Obiettivo 55 kg · mancano 2,4 kg da prendere');

  // 4. nessuna pesata negli ultimi 7 giorni: "Non registrato" e il pulsante
  ({ win } = avvia({ weight_logs: [ wl('2026-09-05', 71.4) ] }, { goal_weight_kg:68 }));
  r = await blocchi(win, '0-pesate-vecchia');
  atteso('pesata di 8 giorni fa · card', r.card, 'Peso attuale Non registrato Nessuna pesata questa settimana Obiettivo 68 kg Pesati →');
  atteso('pesata di 8 giorni fa · pulsante nella card', r.bottoneCard, true);
  atteso('pesata di 8 giorni fa · vista (pulsante in fondo alla sezione)', r.vista, 'Peso attuale Non registrato Nessuna pesata questa settimana Obiettivo 68 kg');
  const vista4 = win.document.getElementById('page-home').innerHTML;
  atteso('vista · pulsante Pesati presente', /quadroGo\('peso'\)">Pesati →/.test(vista4), true);

  // 5. nessuna pesata mai, obiettivo presente
  ({ win } = avvia({}, { goal_weight_kg:68 }));
  r = await blocchi(win, 'mai');
  atteso('mai pesato · card', r.card, 'Peso attuale Non registrato Nessuna pesata questa settimana Obiettivo 68 kg Pesati →');

  // 6. obiettivo raggiunto
  ({ win } = avvia({ weight_logs: [ wl('2026-09-12', 68.02), wl('2026-09-13', 68.0) ] }, { goal_weight_kg:68 }));
  r = await blocchi(win, 'raggiunto');
  atteso('obiettivo raggiunto · card', r.card, 'Peso attuale 68,0 kg oggi Media settimana 68,0 kg Obiettivo 68 kg · raggiunto');

  // 7. settimana chiusa (31 ago – 6 set): "attuale" rispetto alla domenica, la data letta da oggi
  ({ win } = avvia({ weight_logs: [ wl('2026-08-26', 72.9), wl('2026-09-01', 72.6), wl('2026-09-04', 72.2) ] }, { goal_weight_kg:68 }));
  let pic = await win.loadWeeklyPicture('2026-08-31');
  win.eval('ST').homeView = 'quadro'; win.eval('ST').quadroWeek = '2026-08-31'; win.renderHomeV2();
  atteso('settimana chiusa · vista', testo(win.document.querySelector('#page-home .wp-sec .wp-hero').innerHTML),
    'Peso attuale 72,2 kg 4 set Media settimana 72,4 kg · −0,5 kg rispetto alla scorsa Obiettivo 68 kg · mancano 4,2 kg da perdere');

  // 8. riga salvata prima dei campi nuovi: la riga resta com'è, la vista li ricalcola
  const vecchia = JSON.parse(JSON.stringify(pic));
  delete vecchia.weight.weight_last; delete vecchia.weight.weight_last_date;
  vecchia.meta.marcatore = 'riga-vecchia';
  const tabelle = { weight_logs: [ wl('2026-08-26', 72.9), wl('2026-09-01', 72.6), wl('2026-09-04', 72.2) ],
    weekly_pictures: [ { user_id:U, id:'wp1', week_start:'2026-08-31', picture: vecchia } ] };
  ({ win } = avvia(tabelle, { goal_weight_kg:68 }));
  pic = await win.loadWeeklyPicture('2026-08-31');
  atteso('riga vecchia · letta dalla tabella', pic.meta.marcatore, 'riga-vecchia');
  atteso('riga vecchia · campi nuovi ricalcolati', [pic.weight.weight_last, pic.weight.weight_last_date], [72.2, '2026-09-04']);
  atteso('riga vecchia · la tabella non è stata riscritta', 'weight_last' in tabelle.weekly_pictures[0].picture.weight, false);

  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})();
