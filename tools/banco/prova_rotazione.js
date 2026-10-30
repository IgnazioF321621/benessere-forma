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
atteso('ics · il titolo e l\'avviso dicono la seduta', [piatte.find(r => r.startsWith('SUMMARY')), piatte.filter(r => r.startsWith('DESCRIPTION')).pop()], ['SUMMARY:Upper B · Zona Tracker', 'DESCRIPTION:Upper A fra 15 minuti']);
atteso('ics · DTSTAMP è «adesso»', piatte.find(r => r.startsWith('DTSTAMP')), 'DTSTAMP:20261028T100000Z');
const uid1 = piatte.find(r => r.startsWith('UID')), uid2 = spiega(R.ics({ eventi: [{ date: GIO, sid: 'lowerB' }], nomi, orario: '07:30', chiave: 'persona-1', adesso: ADESSO })).find(r => r.startsWith('UID'));
const uid3 = spiega(R.ics({ eventi: [{ date: GIO, sid: 'upperB' }], nomi, orario: '07:30', chiave: 'persona-2', adesso: ADESSO })).find(r => r.startsWith('UID'));
atteso('ics · UID stabile per giorno e persona (la seduta che cambia resta lo stesso evento), diverso per un\'altra persona, senza l\'id dentro', [uid1 === uid2, uid1 === uid3, /persona-1/.test(uid1), /^UID:zt-[a-z0-9]+-2026-10-29@zona-tracker$/.test(uid1)], [true, false, false, true]);
atteso('ics · virgole e punti e virgola nel nome si proteggono', spiega(R.ics({ eventi: [{ date: GIO, sid: 'x' }], nomi: { x: 'Upper, B; C' }, orario: '07:30', chiave: 'p', adesso: ADESSO })).find(r => r.startsWith('SUMMARY')), 'SUMMARY:Upper\\, B\\; C · Zona Tracker');
const lungo = R.ics({ eventi: [{ date: GIO, sid: 'x' }], nomi: { x: 'Séduta lunghissima con accènti e parole che non finiscono mai davvero, per piegare la riga'.repeat(2) }, orario: '07:30', chiave: 'p', adesso: ADESSO });
const ottetti = (s) => Buffer.byteLength(s, 'utf8');
atteso('ics · le righe lunghe si piegano a 75 ottetti e, spiegate, tornano intere', [lungo.split('\r\n').every(r => ottetti(r) <= 75), spiega(lungo).find(r => r.startsWith('SUMMARY')).length > 150], [true, true]);
atteso('ics · senza eventi un calendario valido e vuoto; un orario rotto cade sulle 7', [R.ics({ eventi: [], orario: '07:30', chiave: 'p', adesso: ADESSO }).includes('VEVENT'), spiega(R.ics({ eventi: [{ date: GIO, sid: 'upperA' }], nomi, orario: 'boh', chiave: 'p', adesso: ADESSO })).find(r => r.startsWith('DTSTART'))], [false, 'DTSTART:20261029T060000Z']);
atteso('ics · un\'ora e l\'avviso si possono cambiare', (() => { const t = spiega(R.ics({ eventi: [{ date: GIO, sid: 'upperA' }], nomi, orario: '18:00', chiave: 'p', adesso: ADESSO, durataMin: 45, avvisoMin: 30 })); return [t.find(r => r.startsWith('DTEND')), t.find(r => r.startsWith('TRIGGER'))]; })(), ['DTEND:20261029T174500Z', 'TRIGGER:-PT30M']);

console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
process.exit(ko ? 1 : 0);
