// La Home come i widget dell'iPhone (29 ottobre 2026): le regole pure della settimana in shared/quadro.js.
// inFascia (giorno «in obiettivo»: 90–110% del target), giornoScarso (sotto il 75%, il «!» sulle barre),
// parolaSettimana (la media della settimana in una parola: «In linea», «Sopra», «Sotto»). Una regola sola: il quadro
// conta i giorni in obiettivo e quelli sotto il 75% con le stesse funzioni.
//   node tools/banco/prova_home_widget.js
const Q = require('../../shared/quadro.js');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(78), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};

atteso('la fascia è 90–110%', Q.WP_FASCIA, [0.9, 1.1]);
atteso('inFascia ai bordi (target 2300: 2070 e 2530 dentro, 2069 e 2531 fuori)', [2070, 2530, 2069, 2531].map(k => Q.inFascia(k, 2300)), [true, true, false, false]);
atteso('inFascia senza target: mai', [Q.inFascia(2000, 0), Q.inFascia(2000, null)], [false, false]);
atteso('giornoScarso: sotto il 75% (1725 su 2300 no, 1724 sì)', [Q.giornoScarso(1725, 2300), Q.giornoScarso(1724, 2300)], [false, true]);
atteso('giornoScarso senza target: mai', Q.giornoScarso(100, 0), false);
atteso('parolaSettimana: sotto, in linea, sopra (target 2300)', [1567, 2069, 2070, 2300, 2530, 2531, 2900].map(k => Q.parolaSettimana(k, 2300)),
  ['Sotto', 'Sotto', 'In linea', 'In linea', 'In linea', 'Sopra', 'Sopra']);
atteso('parolaSettimana senza media o senza target: niente parola', [Q.parolaSettimana(null, 2300), Q.parolaSettimana(2000, 0), Q.parolaSettimana(NaN, 2300)], [null, null, null]);

// il quadro conta con le stesse regole: giorni in obiettivo (adherence) e sotto il 75%
const giorni = [1650, 2100, 2300, 2531, 1000];
atteso('stessa regola del quadro: 2 giorni in fascia su 5, 2 sotto il 75%', [giorni.filter(k => Q.inFascia(k, 2300)).length, giorni.filter(k => Q.giornoScarso(k, 2300)).length], [2, 2]);

console.log(ko ? `\n${ko} KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
