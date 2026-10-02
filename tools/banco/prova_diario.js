// Fondamenta 050: il diario del giorno (tabella daily_log), strato dei dati.
// Una riga per persona e per giorno; si scrivono solo i campi passati; i valori fuori
// scala si rifiutano prima di arrivare al database; una lettura fallita non svuota.
// Prima/dopo: sul file vecchio deve dare KO.
//   node tools/banco/prova_diario.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(60), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const avvia = (tabelle, opts) => {
  const b = boot(Object.assign({ daily_log:[], app_errors:[] }, tabelle), opts || { now:'2026-10-02T09:00:00' });
  b.ST = b.win.eval('ST'); b.ST.user = { id:U };
  b.scritture = () => b.supa._calls.filter(c => c.table === 'daily_log' && c.op === 'upsert');
  return b;
};
(async () => {
  // 1) lettura: solo le proprie righe, in una mappa per giorno
  {
    const { win, ST } = avvia({ daily_log:[
      { id:'a', user_id:U, date:'2026-09-30', sleep_hours:7.5, energy:4, stress:2, day_type:null, note:null },
      { id:'b', user_id:U, date:'2026-10-01', sleep_hours:6, energy:3, stress:3, day_type:'rest', note:'stanco' },
      { id:'c', user_id:'u2', date:'2026-10-01', sleep_hours:9, energy:5, stress:1 } ] });
    await win.loadDailyLog();
    atteso('giorni letti', Object.keys(ST.dailyLog), ['2026-09-30', '2026-10-01']);
    atteso('riga di ieri', [win.getDailyLog('2026-10-01').sleep_hours, win.getDailyLog('2026-10-01').day_type], [6, 'rest']);
    atteso('oggi senza riga', win.getDailyLog(), null);
  }
  // 2) scrittura: una riga per giorno, solo i campi passati
  {
    const { win, ST, supa, scritture } = avvia({});
    const r1 = await win.saveDailyLog(null, { sleep_hours:'7,5', energy:4 });
    atteso('salvato su oggi', [r1.error, r1.data && r1.data.date, r1.data && r1.data.sleep_hours, r1.data && r1.data.energy], [null, '2026-10-02', 7.5, 4]);
    atteso('campi mandati al database', scritture()[0].payload, { user_id:U, date:'2026-10-02', sleep_hours:7.5, energy:4 });
    atteso('chiave persona+giorno', scritture()[0].upsertOpts.onConflict, 'user_id,date');
    await win.saveDailyLog('2026-10-02', { stress:2, note:'  bene  ' });
    atteso('secondo salvataggio: manda solo stress e nota', scritture()[1].payload, { user_id:U, date:'2026-10-02', stress:2, note:'bene' });
    atteso('una sola riga nel database', supa.from('daily_log').select('*') && (await supa.from('daily_log').select('*')).data.length, 1);
    atteso('in memoria la giornata è intera', (({sleep_hours, energy, stress, note}) => [sleep_hours, energy, stress, note])(ST.dailyLog['2026-10-02']), [7.5, 4, 2, 'bene']);
    await win.saveDailyLog('2026-10-02', { energy:'', day_type:'deload' });
    atteso('campo svuotato e tipo di giornata', [ST.dailyLog['2026-10-02'].energy, ST.dailyLog['2026-10-02'].day_type, ST.dailyLog['2026-10-02'].sleep_hours], [null, 'deload', 7.5]);
  }
  // 3) valori fuori scala: rifiutati senza toccare il database
  {
    const { win, scritture } = avvia({});
    const casi = [[{ energy:6 }, 'energia'], [{ stress:0 }, 'stress'], [{ energy:2.5 }, 'energia'], [{ sleep_hours:25 }, 'sonno'], [{ sleep_hours:'abc' }, 'sonno'],
                  [{ day_type:'vacanza' }, 'giornata'], [{ note:'x'.repeat(1001) }, 'nota'], [{}, 'Niente'], [{ kcal:2000 }, 'Niente']];
    const esiti = [];
    for(const [campi, parola] of casi){ const r = await win.saveDailyLog('2026-10-02', campi); esiti.push(!!(r.error && r.error.message.toLowerCase().includes(parola.toLowerCase()))); }
    atteso('9 valori non validi rifiutati col loro messaggio', esiti, casi.map(() => true));
    atteso('nessuna scrittura partita', scritture().length, 0);
  }
  // 4) lettura fallita: quello che c'era resta
  {
    const { win, ST } = avvia({ __assenti:['daily_log'] });
    ST.dailyLog = { '2026-10-01': { date:'2026-10-01', energy:3 } };
    await win.loadDailyLog();
    atteso('tabella non letta: diario in memoria intatto', Object.keys(ST.dailyLog), ['2026-10-01']);
    const r = await win.saveDailyLog('2026-10-02', { energy:4 });
    atteso('scrittura fallita: errore a chi chiama, memoria non toccata', [!!r.error, ST.dailyLog['2026-10-02'] === undefined], [true, true]);
  }
  // 5) senza utente
  {
    const { win, ST, scritture } = avvia({}); ST.user = null;
    const r = await win.saveDailyLog('2026-10-02', { energy:4 });
    atteso('senza utente: niente scrittura', [!!r.error, scritture().length], [true, 0]);
  }
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.message); process.exit(1); });
