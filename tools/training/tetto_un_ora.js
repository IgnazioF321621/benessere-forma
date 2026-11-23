// Training 400, 410 e 420: porta una scheda già salvata alla regola in vigore SENZA rigenerarla, con la stessa
// funzione del generatore (schedaEntroUnOra in app/training_generatore.js; durata, blocchi e Pump in
// shared/rotazione.js). Non legge e non scrive il database: lavora su file. Di suo è una prova a vuoto.
//
//   1. la Regia esporta in file JSON:
//        · la colonna `scheda` della riga attiva (è anche la copia di sicurezza);
//        · il catalogo, `esercizi_catalog` per intero (array di righe): serve agli isolamenti nuovi e alla Pump;
//        · il profilo (tipo_allenamento, attrezzatura, note_salute, giorni_allenamento): attrezzi e limitazioni.
//   2. NODE_PATH=… node tools/training/tetto_un_ora.js scheda.json --catalogo catalogo.json --profilo profilo.json
//        stampa per ogni seduta minuti e serie prima e dopo, le mosse, i blocchi, e le serie per muscolo prima e dopo;
//   3. con --scrivi nuovo.json scrive il jsonb nuovo in quel file: è quello che la Regia mette nella riga.
//
//   --obiettivo ricomposizione   se la scheda non lo porta (serve ai minimi di volume)
//   --tabata                     conta il Tabata in coda a ogni seduta
//   --senza-pump                 non aggiunge la Upper Pump facoltativa
// Senza --catalogo la scheda si sistema con quello che ha (core, trazioni, serie in più, blocchi) ma non entrano
// esercizi nuovi né la Pump.
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { boot } = require('../banco/banco');

const arg = process.argv.slice(2);
const dopo = (nome) => { const i = arg.indexOf(nome); return i === -1 ? null : arg[i + 1]; };
const CON_VALORE = ['--scrivi', '--obiettivo', '--catalogo', '--profilo'];
const file = arg.find((a, i) => !a.startsWith('--') && !CON_VALORE.includes(arg[i - 1]));
const leggi = (f) => f ? JSON.parse(fs.readFileSync(path.resolve(f), 'utf8')) : null;

async function tettoSuScheda(scheda, o) {
  const b = boot({ profiles: [{ id: 'u1', first_name: 'X', m2_skipped: true }], schede_utente: [], esercizi_catalog: [], training_logs: [], workouts: [] }, { now: '2026-11-24T07:00:00' });
  await b.avviato;
  const W = b.win;
  const obiettivo = o.obiettivo || scheda.obiettivo;
  const profilo = o.profilo || {};
  const tipoAllen = profilo.tipo_allenamento || scheda.tipo_allenamento || 'casa';
  const attrezzatura = profilo.attrezzatura || scheda.attrezzatura || [];
  const livello = scheda.livello_mappato || 'intermedio';
  const catalogo = (o.catalogo || []).map(r => W._trainGenPulisciRiga({ ...r }));
  const pools = catalogo.length ? W._trainGenFilterPool(catalogo, { tipoAllen, attrezzatura, livello }) : { poolPrincipali: [], attrezzaturaSet: new Set(attrezzatura) };
  const limitazioni = (W._trainGenParseEsperienzaFromNote(profilo.note_salute || '') || {}).limitazioni || [];
  const volume = () => W.volumeContoMinimi(scheda.sessioni.filter(s => s.id !== W.ZTRotazione.FACOLTATIVA), obiettivo).map(c => `${c.gruppo} ${c.serie}${c.sotto ? '!' : ''}`).join(' · ');
  const volPrima = volume();
  const diario = W.schedaEntroUnOra(scheda.sessioni, {
    obiettivo, tabata: !!o.tabata, pool: pools.poolPrincipali, limitazioni, tipoAllen,
    attrezzatura: Array.from(pools.attrezzaturaSet || attrezzatura), livello,
    catalogo: new Map(catalogo.map(r => [r.codice, r])), pump: o.pump !== false && Number(profilo.giorni_allenamento || scheda.giorni_allenamento || 4) === 4,
  });
  // con la Pump in più, il volume con la Pump (le settimane da 5 giorni)
  const conPump = W.volumeContoMinimi(scheda.sessioni, obiettivo).map(c => `${c.gruppo} ${c.serie}`).join(' · ');
  return { diario: JSON.parse(JSON.stringify(diario)), volPrima, volDopo: volume(), conPump };
}

if (require.main === module) (async () => {
  if (!file) { console.error('uso: node tools/training/tetto_un_ora.js scheda.json [--catalogo c.json] [--profilo p.json] [--scrivi nuovo.json] [--obiettivo x] [--tabata] [--senza-pump]'); process.exit(2); }
  const scheda = leggi(file);
  if (!scheda || !Array.isArray(scheda.sessioni)) { console.error('Nel file non c\'è una scheda (manca «sessioni»).'); process.exit(2); }
  const r = await tettoSuScheda(scheda, { obiettivo: dopo('--obiettivo'), tabata: arg.includes('--tabata'), catalogo: leggi(dopo('--catalogo')),
    profilo: leggi(dopo('--profilo')), pump: !arg.includes('--senza-pump') });
  const min = (sec) => Math.round(sec / 60);
  r.diario.forEach(d => {
    console.log(`\n${d.sid}${d.facoltativa ? ' (facoltativa)' : ''}: ${d.prima ? `${min(d.prima)} min, ${d.serie[0]} serie → ` : ''}${min(d.dopo)} min, ${d.serie[1]} serie${d.sopra ? '   SOPRA IL TETTO' : ''}`);
    d.mosse.forEach(m => console.log('   · ' + m));
    d.blocchi.forEach(b => console.log('   ▸ ' + b));
  });
  console.log(`\nSerie a settimana per muscolo, conto della letteratura (! = sotto il minimo)\n  prima:          ${r.volPrima}\n  dopo:           ${r.volDopo}\n  con la Pump:    ${r.conPump}`);
  const out = dopo('--scrivi');
  if (out) { fs.writeFileSync(path.resolve(out), JSON.stringify(scheda)); console.log(`\nScritto ${out}: è il jsonb nuovo per la colonna «scheda».`); }
  else console.log('\nProva a vuoto: niente è stato scritto. Con --scrivi nuovo.json esce il jsonb nuovo.');
  process.exit(r.diario.some(d => d.sopra) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

module.exports = { tettoSuScheda };
