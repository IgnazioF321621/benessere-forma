// Training 400 (20 novembre 2026), come vale dopo il Training 410 (23 novembre): ogni seduta sta in un'ora,
// preparazione compresa. Dal 410 la durata si conta a serie coi tempi misurati (150 s a serie) e le coppie del 400 sono
// diventate blocchi: qui si prova che la scheda di PRIMA del 400 (quarte serie, recuperi da 3 minuti) arriva comunque
// sotto l'ora, coi cardini intatti, e che il generatore chiama il tetto. Blocchi e seduta: prova_training_410.js.
//   node tools/banco/prova_training_400.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const { scheda400 } = require('./dati_scheda_400');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(104), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
(async () => {
  const b = boot({ profiles:[{ id:'u1', first_name:'X', m2_skipped:true }], schede_utente:[], esercizi_catalog:[], training_logs:[], workouts:[] }, { now: '2026-11-20T07:00:00' });
  await b.avviato;
  const W = b.win;
  const min = (sec) => Math.round(sec / 60);
  const sc = scheda400();
  const cardiniPrima = sc.sessioni.map(s => s.exercises.filter(e => e.cardine).map(e => `${e.codice}×${e.sets}`));
  const d = W.schedaEntroUnOra(sc.sessioni, { obiettivo:'ricomposizione' });
  atteso('la scheda di prima del 400: ogni seduta sotto l\'ora', [d.every(x => !x.sopra), d.every(x => min(x.dopo) <= 60)], [true, true]);
  atteso('le serie per seduta scendono a circa 20 (150 s l\'una)', d.map(x => x.serie[1] >= 18 && x.serie[1] <= 21), [true, true, true, true]);
  atteso('i cardini restano com\'erano', sc.sessioni.map(s => s.exercises.filter(e => e.cardine).map(e => `${e.codice}×${e.sets}`)), cardiniPrima);
  atteso('ogni seduta tiene due core', sc.sessioni.map(s => s.exercises.filter(e => e.pattern === 'core').length), [2, 2, 2, 2]);
  atteso('il generatore chiama il tetto dopo la validazione', /schedaEntroUnOra\(sessioniValidate/.test(W.generateTrainingProgram.toString()), true);
  console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
