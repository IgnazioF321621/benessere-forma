// Training 400 (20 novembre 2026): porta una scheda già salvata sotto l'ora per seduta SENZA rigenerarla, con la
// stessa regola del generatore (schedaEntroUnOra in app/training_generatore.js, durata di shared/rotazione.js).
// Non legge e non scrive il database: lavora su un file. Di suo è una prova a vuoto.
//
//   1. la Regia esporta la colonna `scheda` della riga attiva in un file JSON (è anche la copia di sicurezza);
//   2. NODE_PATH=… node tools/training/tetto_un_ora.js scheda.json
//        stampa per ogni seduta i minuti prima e dopo e le mosse, e il volume per muscolo prima e dopo;
//   3. con --scrivi nuovo.json scrive il jsonb nuovo in quel file: è quello che la Regia mette nella riga.
//
//   --obiettivo ricomposizione   se la scheda non lo porta (serve ai minimi di volume)
//   --senza-coppie-multi         non alterna spinta e tirata nei multiarticolari
//   --tabata                     conta il Tabata in coda a ogni seduta
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('../banco/banco');

const arg = process.argv.slice(2);
const file = arg.find(a => !a.startsWith('--') && arg[arg.indexOf(a) - 1] !== '--scrivi' && arg[arg.indexOf(a) - 1] !== '--obiettivo');
const dopo = (nome) => { const i = arg.indexOf(nome); return i === -1 ? null : arg[i + 1]; };
if (!file) { console.error('uso: node tools/training/tetto_un_ora.js scheda.json [--scrivi nuovo.json] [--obiettivo x] [--senza-coppie-multi] [--tabata]'); process.exit(2); }

async function tettoSuScheda(scheda, o) {
  const U = 'u1';
  const b = boot({ profiles: [{ id: U, first_name: 'X', m2_skipped: true }], schede_utente: [], esercizi_catalog: [], training_logs: [], workouts: [] }, { now: '2026-11-20T07:00:00' });
  await b.avviato;
  const W = b.win;
  const min = (sec) => Math.round(sec / 60);
  const obiettivo = o.obiettivo || scheda.obiettivo;
  const volume = () => W.volumeContoMinimi(scheda.sessioni, obiettivo).map(c => `${c.gruppo} ${c.serie}${c.sotto ? '!' : ''}`).join(' · ');
  const volPrima = volume();
  const diario = W.schedaEntroUnOra(scheda.sessioni, { obiettivo, tabata: !!o.tabata, coppieMulti: o.coppieMulti });
  return { diario: JSON.parse(JSON.stringify(diario)), volPrima, volDopo: volume(), min };
}

if (require.main === module) (async () => {
  const scheda = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!scheda || !Array.isArray(scheda.sessioni)) { console.error('Nel file non c\'è una scheda (manca «sessioni»).'); process.exit(2); }
  const r = await tettoSuScheda(scheda, { obiettivo: dopo('--obiettivo'), tabata: arg.includes('--tabata'), coppieMulti: !arg.includes('--senza-coppie-multi') });
  r.diario.forEach(d => {
    console.log(`\n${d.sid}: ${r.min(d.prima)} min → ${r.min(d.dopo)} min${d.sopra ? '   ANCORA SOPRA L\'ORA' : ''}`);
    d.mosse.forEach(m => console.log('   · ' + m));
    if (!d.mosse.length) console.log('   · niente da cambiare');
  });
  console.log(`\nSerie a settimana per muscolo (! = sotto il minimo)\n  prima: ${r.volPrima}\n  dopo:  ${r.volDopo}`);
  const out = dopo('--scrivi');
  if (out) { fs.writeFileSync(path.resolve(out), JSON.stringify(scheda)); console.log(`\nScritto ${out}: è il jsonb nuovo per la colonna «scheda».`); }
  else console.log('\nProva a vuoto: niente è stato scritto. Con --scrivi nuovo.json esce il jsonb nuovo.');
  process.exit(r.diario.some(d => d.sopra) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

module.exports = { tettoSuScheda };
