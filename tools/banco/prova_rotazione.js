// shared/rotazione.js (Training 530 e 540, 30 ottobre 2026): la regola della seduta proposta, una sola per il telefono e
// per il calendario dell'iPhone, e il testo iCalendar. Senza jsdom: il modulo puro, come lo importa il Worker.
//   530: la prossima della rotazione dopo l'ultima seduta di lavoro; un recupero conta solo nel suo turno; il riposo
//        del ciclo a 7 solo il giorno stesso dell'ultimo allenamento.
//   540 (Ignazio: «solo sedute vere»): nei giorni scelti solo sedute di lavoro; il calendario ne mette una per ogni
//        giorno scelto delle prossime 4 settimane, salta i giorni di pausa, 60 minuti, avviso 15 minuti prima, orari in
//        UTC calcolati con l'ora di Roma (giusti anche col cambio dell'ora), UID stabile per giorno.
// Le sedute sono quelle vere di Ignazio dal 5 al 27 ottobre 2026.
//   node tools/banco/prova_rotazione.js
process.env.TZ = 'UTC';   // come il Worker: la regola non deve dipendere dal fuso della macchina
const R = require('../../shared/rotazione.js');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const w = (date, s, ora) => ({ date, session_type: s, completed: true, created_at: `${date}T${ora || '07:00:00'}+00:00` });
// le più recenti prima, come le legge l'app (date desc, created_at desc)
const desc = (righe) => [...righe].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.created_at < b.created_at ? 1 : -1));
const VERE = desc([['2026-10-05','upperA'], ['2026-10-07','lowerA'], ['2026-10-08','recoveryUpper'], ['2026-10-09','upperB'], ['2026-10-10','lowerB'],
  ['2026-10-12','upperA'], ['2026-10-13','lowerA'], ['2026-10-20','upperA'], ['2026-10-22','lowerA'], ['2026-10-23','upperB'],
  ['2026-10-26','upperA'], ['2026-10-27','lowerA']].map(([d, s]) => w(d, s)));
const C6 = R.CICLO_6, C7 = R.CICLO_7, LMGV = [1, 2, 4, 5];
const MER = '2026-10-28', GIO = '2026-10-29';   // mercoledì e giovedì

// ── il ciclo, i giorni, i giorni scelti ──
atteso('ciclo · senza la Pump 6 slot, con upperC 7 (con il riposo)', [R.cicloPer(['upperA', 'lowerA']), R.cicloPer(['upperA', 'upperC'])], [C6, C7]);
atteso('ciclo · copie: chi le riceve non tocca l\'originale', (() => { const c = R.cicloPer([]); c.push('x'); return R.cicloPer([]).length; })(), 6);
atteso('giorno della settimana · 1 = lunedì … 7 = domenica', [R.giornoSettimana('2026-11-02'), R.giornoSettimana(MER), R.giornoSettimana('2026-11-01')], [1, 3, 7]);
atteso('giorni scelti · puliti, in ordine, senza doppioni; vuoti o assenti = null', [R.giorniScelti(['5', 1, 1, 9, 0, 2.5]), R.giorniScelti([]), R.giorniScelti(null), R.giorniScelti('1,2')], [[1, 5], null, null, null]);
atteso('orario · HH:MM o niente', [R.orarioValido('07:30'), R.orarioValido('7:30'), R.orarioValido('24:00'), R.orarioValido('')], ['07:30', null, null, null]);

// ── la posizione e la proposta (Training 530) ──
atteso('530 · dopo Lower A del 27 la posizione è Lower A e la proposta il Recovery Upper', [R.posizione(VERE, C6).ultima.session_type, R.prossima({ allenamenti: VERE, ciclo: C6, oggi: MER })], ['lowerA', 'recoveryUpper']);
atteso('530 · il recupero nel turno conta: dopo Lower A + Recovery Upper viene Upper B', R.prossima({ allenamenti: desc([...VERE, w(MER, 'recoveryUpper')]), ciclo: C6, oggi: GIO }), 'upperB');
atteso('530 · un recupero fuori turno non sposta niente: Recovery Lower dopo Lower A, resta il Recovery Upper', R.prossima({ allenamenti: desc([...VERE, w(MER, 'recoveryLower')]), ciclo: C6, oggi: GIO }), 'recoveryUpper');
atteso('530 · stesso giorno, l\'ora decide: Lower A alle 7 e Recovery Upper alle 8 → Upper B', R.prossima({ allenamenti: desc([w('2026-10-20', 'upperA'), w('2026-10-22', 'lowerA', '07:00:00'), w('2026-10-22', 'recoveryUpper', '08:00:00')]), ciclo: C6, oggi: '2026-10-23' }), 'upperB');
atteso('530 · nessun allenamento: si comincia da Upper A', [R.prossima({ allenamenti: [], ciclo: C6, oggi: MER }), R.posizione([], C6).indice], ['upperA', -1]);
atteso('530 · una seduta di una scheda vecchia (fuori dal ciclo): si riparte da Upper A', R.prossima({ allenamenti: [w('2026-10-20', 'fullbody')], ciclo: C6, oggi: MER }), 'upperA');
const cinque = desc([w('2026-10-20', 'upperA'), w('2026-10-21', 'lowerA'), w('2026-10-22', 'recoveryUpper'), w('2026-10-23', 'upperB')]);
atteso('530 · 7 slot: dopo Upper B viene Lower B, e il Recovery fuori turno non riporta indietro', [R.prossima({ allenamenti: cinque, ciclo: C7, oggi: '2026-10-24' }), R.prossima({ allenamenti: desc([...cinque, w('2026-10-24', 'recoveryUpper')]), ciclo: C7, oggi: '2026-10-25' })], ['lowerB', 'lowerB']);
const finoPump = desc([...cinque, w('2026-10-24', 'lowerB'), w('2026-10-25', 'upperC')]);
atteso('530 · il riposo solo il giorno stesso della Pump; il giorno dopo si riparte da Upper A', [R.prossima({ allenamenti: finoPump, ciclo: C7, oggi: '2026-10-25' }), R.prossima({ allenamenti: finoPump, ciclo: C7, oggi: '2026-10-26' })], ['rest', 'upperA']);

// ── i giorni scelti (Training 540, «solo sedute vere») ──
atteso('540 · mercoledì scelto: dopo Lower A si propone Upper B, non il Recovery', R.prossima({ allenamenti: VERE, ciclo: C6, oggi: MER, giorni: [1, 2, 3, 4, 5] }), 'upperB');
atteso('540 · mercoledì non scelto: vale il 530, il Recovery Upper', R.prossima({ allenamenti: VERE, ciclo: C6, oggi: MER, giorni: LMGV }), 'recoveryUpper');
atteso('540 · giovedì scelto: Upper B anche se il Recovery è già stato fatto nel turno', R.prossima({ allenamenti: desc([...VERE, w(MER, 'recoveryUpper')]), ciclo: C6, oggi: GIO, giorni: LMGV }), 'upperB');
atteso('540 · dopo Lower B in un giorno scelto si salta il Recovery Lower: Upper A', R.prossima({ allenamenti: desc([w('2026-10-26', 'upperB'), w('2026-10-27', 'lowerB')]), ciclo: C6, oggi: GIO, giorni: LMGV }), 'upperA');
atteso('540 · 7 slot, domenica scelta dopo la Pump di oggi: niente riposo, Upper A', [R.prossima({ allenamenti: finoPump, ciclo: C7, oggi: '2026-10-25', giorni: [7] }), R.prossima({ allenamenti: finoPump, ciclo: C7, oggi: '2026-10-25' })], ['upperA', 'rest']);
atteso('540 · senza allenamenti, giorno scelto: Upper A', R.prossima({ allenamenti: [], ciclo: C6, oggi: GIO, giorni: LMGV }), 'upperA');

// ── le sedute previste (il calendario) ──
const prev = R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: MER, giorni: LMGV });
atteso('previste · 4 settimane da mercoledì 28: 16 sedute, nei soli giorni scelti', [prev.length, prev.every(e => LMGV.includes(R.giornoSettimana(e.date)))], [16, true]);
atteso('previste · solo sedute di lavoro, in rotazione: Upper B, Lower B, Upper A, Lower A…', prev.slice(0, 6).map(e => e.date.slice(5) + ' ' + e.sid), ['10-29 upperB', '10-30 lowerB', '11-02 upperA', '11-03 lowerA', '11-05 upperB', '11-06 lowerB']);
atteso('previste · nessun recupero né riposo, mai', prev.some(e => !R.eLavoro(e.sid)), false);
atteso('previste · oggi è un giorno scelto e non si è ancora fatto niente: la prima è oggi', R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: GIO, giorni: LMGV })[0], { date: GIO, sid: 'upperB' });
atteso('previste · oggi fatta Upper B: oggi resta Upper B, domani Lower B', R.sedutePreviste({ allenamenti: desc([...VERE, w(GIO, 'upperB')]), ciclo: C6, oggi: GIO, giorni: LMGV }).slice(0, 2), [{ date: GIO, sid: 'upperB' }, { date: '2026-10-30', sid: 'lowerB' }]);
atteso('previste · oggi fatto un recupero (giorno scelto): oggi niente, domani Upper B', R.sedutePreviste({ allenamenti: desc([...VERE, w(MER, 'recoveryUpper')]), ciclo: C6, oggi: MER, giorni: [1, 2, 3, 4, 5] })[0], { date: GIO, sid: 'upperB' });
atteso('previste · seduta in corso sul telefono (fattaOggi): oggi lei, poi si va avanti da lì', R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: GIO, giorni: LMGV, fattaOggi: 'lowerB' }).slice(0, 2), [{ date: GIO, sid: 'lowerB' }, { date: '2026-10-30', sid: 'upperA' }]);
atteso('previste · un giorno fuori programma (Upper A di sabato) fa scalare le sedute dopo', R.sedutePreviste({ allenamenti: desc([...VERE, w('2026-10-31', 'upperA')]), ciclo: C6, oggi: '2026-11-01', giorni: LMGV })[0], { date: '2026-11-02', sid: 'lowerA' });
const pausa = { pausa_inizio: '2026-11-02', pausa_fine: '2026-11-06', pausa_moduli: ['allenamento'] };
const conPausa = R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: MER, giorni: LMGV, profile: pausa });
atteso('previste · in pausa (allenamento) i giorni restano vuoti e si riprende da dove si era', [conPausa.length, conPausa.slice(0, 3).map(e => e.date.slice(5) + ' ' + e.sid)], [12, ['10-29 upperB', '10-30 lowerB', '11-09 upperA']]);
atteso('previste · una pausa solo del cibo non tocca le sedute', R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: MER, giorni: LMGV, profile: { ...pausa, pausa_moduli: ['cibo'] } }).length, 16);
atteso('previste · senza giorni scelti niente da prevedere', [R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: MER }), R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: MER, giorni: [] })], [[], []]);
atteso('previste · una settimana sola: 4 sedute', R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: MER, giorni: LMGV, settimane: 1 }).length, 4);

// ── il calendario (iCalendar) ──
const ADESSO = Date.parse('2026-10-28T10:00:00Z');
const nomi = { upperA: 'Upper A', lowerA: 'Lower A', upperB: 'Upper B', lowerB: 'Lower B' };
const testo = R.ics({ eventi: [{ date: GIO, sid: 'upperB' }, { date: '2027-03-27', sid: 'lowerA' }, { date: '2027-03-29', sid: 'upperA' }], nomi, orario: '07:30', chiave: 'persona-1', adesso: ADESSO });
const righe = testo.split('\r\n');
const spiega = (t) => t.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean);   // togli le pieghe
const piatte = spiega(testo);
atteso('ics · comincia e finisce come deve, righe con CRLF, chiude con CRLF', [righe[0], piatte[piatte.length - 1], testo.endsWith('\r\n'), testo.includes('\n') && !/[^\r]\n/.test(testo)], ['BEGIN:VCALENDAR', 'END:VCALENDAR', true, true]);
atteso('ics · intestazione: versione, nome del calendario, fuso di Roma, ogni 4 ore', ['VERSION:2.0', 'X-WR-CALNAME:Zona Tracker', 'X-WR-TIMEZONE:Europe/Rome', 'REFRESH-INTERVAL;VALUE=DURATION:PT4H', 'METHOD:PUBLISH'].every(r => piatte.includes(r)), true);
const eventi = testo.split('BEGIN:VEVENT').slice(1);
atteso('ics · tre eventi, ognuno con UID, DTSTAMP, DTSTART, DTEND, SUMMARY e un avviso', [eventi.length, eventi.every(e => ['UID:', 'DTSTAMP:', 'DTSTART:', 'DTEND:', 'SUMMARY:', 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'END:VALARM', 'END:VEVENT'].every(k => e.includes(k)))], [3, true]);
atteso('ics · 07:30 di Roma il 29 ottobre (ora solare) = 06:30 UTC, un\'ora dopo', [piatte.find(r => r.startsWith('DTSTART')), piatte.find(r => r.startsWith('DTEND'))], ['DTSTART:20261029T063000Z', 'DTEND:20261029T073000Z']);
atteso('ics · cambio dell\'ora: 27 marzo 2027 ancora solare (06:30Z), 29 marzo legale (05:30Z)', piatte.filter(r => r.startsWith('DTSTART')).slice(1), ['DTSTART:20270327T063000Z', 'DTSTART:20270329T053000Z']);
atteso('ics · il titolo è «[Workout] seduta» (scelta di Ignazio) e l\'avviso lo riprende', [piatte.find(r => r.startsWith('SUMMARY')), piatte.filter(r => r.startsWith('DESCRIPTION')).pop()], ['SUMMARY:[Workout] Upper B', 'DESCRIPTION:[Workout] Upper A fra 15 minuti']);
atteso('ics · DTSTAMP è «adesso»', piatte.find(r => r.startsWith('DTSTAMP')), 'DTSTAMP:20261028T100000Z');
const uid1 = piatte.find(r => r.startsWith('UID')), uid2 = spiega(R.ics({ eventi: [{ date: GIO, sid: 'lowerB' }], nomi, orario: '07:30', chiave: 'persona-1', adesso: ADESSO })).find(r => r.startsWith('UID'));
const uid3 = spiega(R.ics({ eventi: [{ date: GIO, sid: 'upperB' }], nomi, orario: '07:30', chiave: 'persona-2', adesso: ADESSO })).find(r => r.startsWith('UID'));
atteso('ics · UID stabile per giorno e persona (la seduta che cambia resta lo stesso evento), diverso per un\'altra persona, senza l\'id dentro', [uid1 === uid2, uid1 === uid3, /persona-1/.test(uid1), /^UID:zt-[a-z0-9]+-2026-10-29@zona-tracker$/.test(uid1)], [true, false, false, true]);
atteso('ics · virgole e punti e virgola nel nome si proteggono', spiega(R.ics({ eventi: [{ date: GIO, sid: 'x' }], nomi: { x: 'Upper, B; C' }, orario: '07:30', chiave: 'p', adesso: ADESSO })).find(r => r.startsWith('SUMMARY')), 'SUMMARY:[Workout] Upper\\, B\\; C');
const lungo = R.ics({ eventi: [{ date: GIO, sid: 'x' }], nomi: { x: 'Séduta lunghissima con accènti e parole che non finiscono mai davvero, per piegare la riga'.repeat(2) }, orario: '07:30', chiave: 'p', adesso: ADESSO });
const ottetti = (s) => Buffer.byteLength(s, 'utf8');
atteso('ics · le righe lunghe si piegano a 75 ottetti e, spiegate, tornano intere', [lungo.split('\r\n').every(r => ottetti(r) <= 75), spiega(lungo).find(r => r.startsWith('SUMMARY')).length > 150], [true, true]);
atteso('ics · senza eventi un calendario valido e vuoto; un orario rotto cade sulle 7', [R.ics({ eventi: [], orario: '07:30', chiave: 'p', adesso: ADESSO }).includes('VEVENT'), spiega(R.ics({ eventi: [{ date: GIO, sid: 'upperA' }], nomi, orario: 'boh', chiave: 'p', adesso: ADESSO })).find(r => r.startsWith('DTSTART'))], [false, 'DTSTART:20261029T060000Z']);
atteso('ics · un\'ora e l\'avviso si possono cambiare', (() => { const t = spiega(R.ics({ eventi: [{ date: GIO, sid: 'upperA' }], nomi, orario: '18:00', chiave: 'p', adesso: ADESSO, durataMin: 45, avvisoMin: 30 })); return [t.find(r => r.startsWith('DTEND')), t.find(r => r.startsWith('TRIGGER'))]; })(), ['DTEND:20261029T174500Z', 'TRIGGER:-PT30M']);

// ── Training 541: la seduta intera (durata, esercizi, scarico) ──
// Le regole che erano nell'app, copiate com'erano su main il 31 ottobre 2026 (57f2550): la versione di shared deve
// rispondere uguale su ogni ingresso (parseRepsRange, _contaPerLato, _warmupDurataTotale, tabataInCoda).
const vecchia = {
  parseRepsRange(repsStr){
    if(!repsStr) return null;
    const s = String(repsStr).trim();
    if(/\bmin\b/i.test(s)) return null;
    let m = s.match(/^(\d+)-(\d+)\s*sec(?:\s+per lato)?$/i);
    if(m) return { kind:'seconds', min:parseInt(m[1],10), max:parseInt(m[2],10), perLato:/per lato/i.test(s), unit:'sec' };
    m = s.match(/^(\d+)\s*sec(?:\s+per lato)?$/i);
    if(m){ const n = parseInt(m[1],10); return { kind:'seconds', min:n, max:n, perLato:/per lato/i.test(s), unit:'sec' }; }
    m = s.match(/^(\d+)-(\d+)(?:\s+per lato)?$/);
    if(m) return { kind:'reps', min:parseInt(m[1],10), max:parseInt(m[2],10), perLato:/per lato/i.test(s), unit:'reps' };
    return null;
  },
  contaPerLato(ex, uni, parsed){   // _exPerLato + _contaPerLato, con _exInfoCatalogo(ex).unilaterale = ex.unilaterale || uni
    if(!ex) return false;
    const u = ex.unilaterale || uni || null;
    const pr = parsed || (ex.reps ? vecchia.parseRepsRange(ex.reps) : null);
    if((pr && pr.perLato) || u === 'si') return true;
    if(u !== 'alternato') return false;
    return !((pr && pr.kind === 'seconds') || (ex && ex.isTimed));
  },
  warmup(items){
    const perLato = (w) => { const pr = (w && w.reps) ? vecchia.parseRepsRange(w.reps) : null; return !!(pr && pr.kind === 'seconds' && pr.perLato); };
    const durata = (w) => { const pr = (w && w.reps) ? vecchia.parseRepsRange(w.reps) : null; return (pr && pr.kind === 'seconds' && !pr.perLato && pr.min > 0) ? Math.min(pr.min, 60) : 60; };
    const voci = (items || []).filter(Boolean);
    if(!voci.length) return 0;
    return voci.reduce((t, w) => t + (perLato(w) ? 2 * 30 + 5 : durata(w)), 0) + (voci.length - 1) * 10;
  },
  tabataInCoda(profile, key){
    const m = ['spento', 'coda', 'giorni', 'a_parte'].includes(profile && profile.tabata) ? profile.tabata : 'spento';
    if(m === 'coda') return true;
    if(m === 'giorni'){ const d = new Date(key + 'T12:00:00'); return ((profile && profile.tabata_giorni) || []).map(Number).includes(((d.getDay() + 6) % 7) + 1); }
    return false;
  },
};
const REPS = ['4-6', '8-12', '12-15', '15-20', '8-12 per lato', '20-40 sec', '20-30 sec per lato', '30 sec', '30 sec per lato', '45 sec',
  '10 min', '5-10 min', '', null, undefined, ' 8-12 ', '8', 'max', '20-30 SEC', '10-12 Per Lato', 'AMRAP', '6-8 per gamba'];
atteso('541 · leggiReps risponde come parseRepsRange di prima su ' + REPS.length + ' scritture', REPS.filter(r => JSON.stringify(R.leggiReps(r)) !== JSON.stringify(vecchia.parseRepsRange(r))), []);
const casi = [];
['si', 'alternato', 'no', null].forEach(u => REPS.forEach(r => [false, true].forEach(t => casi.push([{ reps: r, isTimed: t }, u]))));
casi.push([{ reps: '8-12', unilaterale: 'si' }, null], [{ reps: '8-12', unilaterale: 'alternato' }, 'no'], [null, 'si']);
atteso('541 · contaPerLato risponde come _contaPerLato di prima su ' + casi.length + ' casi', casi.filter(([ex, u]) => R.contaPerLato(ex, u) !== vecchia.contaPerLato(ex, u)).length, 0);
const voci = [[], [{ reps: '15-20' }], [{ reps: '15-20' }, { reps: '30 sec' }, { reps: '30 sec per lato' }, null, { reps: '90 sec' }, { reps: '45 sec' }], [{ reps: '10 min' }, { reps: '0 sec' }]];
atteso('541 · riscaldamentoSec risponde come _warmupDurataTotale di prima', voci.map(v => [R.riscaldamentoSec(v), vecchia.warmup(v)]).filter(([a, b]) => a !== b), []);
const profili = [{ tabata: 'coda' }, { tabata: 'giorni', tabata_giorni: [4] }, { tabata: 'giorni', tabata_giorni: ['1', 7] }, { tabata: 'a_parte' }, { tabata: 'spento' }, { tabata: 'boh' }, {}, null];
const giorniT = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
atteso('541 · tabataInCoda risponde come quella di prima su 8 profili × 7 giorni', profili.flatMap(p => giorniT.map(g => [R.tabataInCoda(p, g), vecchia.tabataInCoda(p, g)])).filter(([a, b]) => a !== b).length, 0);
atteso('541 · i tempi: attivazione = il blocco fisso (2 + 2 + 1 min), serie 30 s, cambio 60 s, Tabata 300 s (i numeri del generatore)', [R.TEMPO.attivazione, R.TEMPO.serie, R.TEMPO.cambio, R.TEMPO.finisher, R.TEMPO.voce, R.TEMPO.riposoVoce, R.TEMPO.lato, R.TEMPO.pausaLato], [300, 30, 60, 300, 60, 10, 30, 5]);

// una seduta come la Upper A di Ignazio (forza, 3 minuti di recupero)
const ES = (codice, name, sets, reps, rest_sec, extra) => ({ codice, name, sets, reps, rest_sec, ...(extra || {}) });
const UA = { id: 'upperA', name: 'Upper A', rest: '3 min', warmup: [{ reps: '15-20' }, { reps: '15-20' }, { reps: '15-20' }],
  exercises: [ES('EX482', 'Rematore', 3, '4-6', 180), ES('EX505', 'Trazioni', 3, '4-6', 180), ES('EX1', 'Dip', 3, '4-6', 180), ES('EX2', 'Piegamenti diamante', 3, '4-6', 180),
    ES('EX3', 'Croci inverse elastico', 3, '12-15', 75), ES('EX4', 'Pallof press con elastico', 3, '20-40 sec', 60, { isTimed: true }), ES('EX5', 'Russian twist', 3, '12-15', 75)],
  finisher: { round: 8, work_sec: 20, rest_sec: 10, exercises: [{ name: 'Burpee' }] } };
const uniUA = (ex) => ({ EX4: 'si', EX5: 'alternato' })[ex.codice] || null;
// 300 + 200 + 4 × (90 + 360 + 60) + (90 + 150 + 60) + (240 + 120 + 60) + (180 + 150 + 60) = 3650 s
atteso('541 · durata Upper A: 300 + 200 + 4 × 510 + 300 + 420 + 390 = 3650 s → circa 60 minuti', [R.durataSeduta(UA, { unilaterale: uniUA }), R.minutiSeduta(R.durataSeduta(UA, { unilaterale: uniUA }))], [3650, 60]);
atteso('541 · col Tabata del giorno: + 240 + 60 s = 3950 s → circa 65 minuti', R.minutiSeduta(R.durataSeduta(UA, { unilaterale: uniUA, tabata: true })), 65);
atteso('541 · senza recupero scritto si usa quello della seduta («3 min»), poi 90 s', [R.durataSeduta({ rest: '3 min', exercises: [{ sets: 3, reps: '4-6' }] }), R.durataSeduta({ rest: '90 sec', exercises: [{ sets: 3, reps: '4-6' }] }), R.durataSeduta({ exercises: [{ sets: 3, reps: '4-6' }] })], [300 + 90 + 360 + 60, 300 + 90 + 180 + 60, 300 + 90 + 180 + 60]);
atteso('541 · minuti ai 5 più vicini, almeno 5', [0, 100, 449, 450, 3020, 3350].map(R.minutiSeduta), [5, 5, 5, 10, 50, 55]);
atteso('541 · righe: serie × ripetizioni, per lato dove si conta per lato, secondi delle tenute', R.righeSeduta(UA, { unilaterale: uniUA }).slice(4), ['5. Croci inverse elastico — 3 × 12-15', '6. Pallof press con elastico — 3 × 20-40 sec per lato', '7. Russian twist — 3 × 12-15 per lato']);
atteso('541 · righe in scarico: il minimo dell\'intervallo, come la prima serie in computeNextSetSuggestion', R.righeSeduta(UA, { unilaterale: uniUA, scarico: true }).filter((_, i) => [0, 5, 6].includes(i)), ['1. Rematore — 3 × 4', '6. Pallof press con elastico — 3 × 20 sec per lato', '7. Russian twist — 3 × 12 per lato']);
atteso('541 · descrizione: durata, scarico, preparazione, esercizi, Tabata', R.descrizione(UA, { unilaterale: uniUA, scarico: true, tabata: true }).split('\n').filter((_, i, a) => i < 3 || i === a.length - 1),
  ['Circa 65 minuti', 'Settimana di scarico: carichi più leggeri, RIR 3+', 'Preparazione 5 min e riscaldamento (3 esercizi)', 'Tabata in coda: 8 round, 4 min']);
const LUNGA = { exercises: Array.from({ length: 40 }, (_, i) => ES('EX' + i, 'Esercizio, con virgole; e accènti numero ' + i, 3, '8-12', 90)) };
const dl = R.descrizione(LUNGA, {}), dlScappata = dl.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
atteso('541 · seduta lunga: sotto 1000 ottetti scappati, finisce con «…», righe intere', [Buffer.byteLength(dlScappata, 'utf8') <= 1000, Buffer.byteLength(dlScappata, 'utf8') > 900, dl.split('\n').pop(), dl.split('\n').slice(2, -1).every(r => /— 3 × 8-12$/.test(r))], [true, true, '…', true]);
atteso('541 · seduta corta: niente «…»', R.descrizione(UA, {}).includes('…'), false);

// la settimana di scarico sulle sedute previste
const fatti11 = VERE.filter(w => !/^rest/.test(w.session_type)).slice().reverse();
const prev541 = R.sedutePreviste({ allenamenti: VERE, ciclo: C6, oggi: MER, giorni: LMGV });
atteso('541 · scarico proiettato: 11 sedute di lavoro fatte, 4 a giro → le previste 10ª-13ª', R.scaricoPerEventi({ eventi: prev541, completati: fatti11, workPerGiro: 4 }).map((x, i) => x ? i : null).filter(x => x != null), [9, 10, 11, 12]);
atteso('541 · scarico anticipato da Pirsi il 28: le prime 4 previste', R.scaricoPerEventi({ eventi: prev541, completati: fatti11, workPerGiro: 4, deloads: ['2026-10-28'] }).map((x, i) => x ? i : null).filter(x => x != null), [0, 1, 2, 3]);
atteso('541 · la seduta di oggi già fatta non conta due volte', (() => {
  const conOggi = fatti11.concat([{ date: GIO, session_type: 'upperB' }]);
  return R.scaricoPerEventi({ eventi: [{ date: GIO, sid: 'upperB' }, { date: '2026-10-30', sid: 'lowerB' }], completati: conOggi, workPerGiro: 4 });
})(), [false, false]);

// l'evento con la sua durata, la sua descrizione e l'indirizzo
const t541 = spiega(R.ics({ eventi: [{ date: GIO, sid: 'upperA', durataMin: 55, descrizione: 'Circa 55 minuti\n1. Rematore — 3 × 4-6' }, { date: '2026-10-30', sid: 'lowerA' }], nomi, orario: '07:30', chiave: 'p', adesso: ADESSO, url: R.URL_TRAINING }));
atteso('541 · ics: DTEND con la durata della seduta, la descrizione scappata, URL; senza durata un\'ora', [t541.filter(r => r.startsWith('DTEND')), t541.find(r => r.startsWith('DESCRIPTION')), t541.filter(r => r.startsWith('URL:')).length, R.URL_TRAINING],
  [['DTEND:20261029T072500Z', 'DTEND:20261030T073000Z'], 'DESCRIPTION:Circa 55 minuti\\n1. Rematore — 3 × 4-6', 2, 'https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?apri=training']);

console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
process.exit(ko ? 1 : 0);
