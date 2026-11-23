// La scheda attiva di Ignazio del 16 novembre 2026 (50aae91d, blocco 56), senza i testi: serve alla prova del
// Training 400 (ogni seduta in un'ora). Riga: [codice, nome, serie, ripetizioni, recupero, schema, gruppo, per lato, segni]
// segni: c = cardine · i = isolamento o core (iso) · t = a tempo · v = aggiunto per il volume · p = una serie in più
const riga = ([codice, name, sets, reps, rest_sec, pattern, gruppo_target, unilaterale, segni]) => {
  const s = segni || '', ex = { codice, name, sets, reps, rest_sec, pattern, gruppo_target, unilaterale, eq: 'elastico', rir: 1 };
  if (s.includes('c')) ex.cardine = true;
  if (s.includes('i')) ex.iso = true;
  if (s.includes('t')) { ex.isTimed = true; ex.durationBased = true; }
  if (s.includes('v')) ex.perVolume = gruppo_target;
  if (s.includes('p')) ex.serieInPiu = 1;
  return ex;
};
const risc = (voci) => voci.map((reps, i) => ({ codice: 'W' + i, name: 'Voce ' + i, reps, warmup: true }));
const SEI = ['15-20', '15-20', '15-20', '15-20', '15-20', '30 sec'];
const CINQUE = ['15-20', '15-20', '30 sec per lato', '15-20', '15-20'];

function scheda400() {
  return { version: '1.0', obiettivo: 'ricomposizione', sessioni: [
    { id: 'upperA', name: 'Upper A', type: 'Forza', rir: 2, rest: '3 min', warmup: risc(SEI), exercises: [
      ['EX378', 'Piegamenti assistiti elastico', 3, '4-6', 180, 'spinta orizzontale', 'petto', 'no'],
      ['EX482', 'Rematore manubri presa inversa panca inclinata', 3, '4-6', 180, 'tirata orizzontale', 'dorsali', 'no', 'c'],
      ['EX511', 'Trazioni sbarra presa inversa stretta', 3, '4-6', 180, 'tirata verticale', 'dorsali', 'no'],
      ['EX513', 'Dip macchina seduto', 3, '4-6', 180, 'spinta verticale', 'tricipiti', 'no', 'c'],
      ['EX027', 'French press bilanciere panca piana', 4, '12-15', 75, 'isolamento', 'tricipiti', 'no', 'ivp'],
      ['EX030', 'Band pull-apart (attivazione scapole)', 4, '12-15', 75, 'isolamento', 'deltoidi posteriori', 'no', 'ip'],
      ['EX439', 'Croci inverse macchina seduto', 3, '12-15', 75, 'isolamento', 'deltoidi posteriori', 'no', 'iv'],
      ['EX677', 'Adduzione un braccio elastico in piedi', 4, '12-15 per lato', 75, 'isolamento', 'petto', 'si', 'ivp'],
      ['EX046', 'Stir the pot (anti-rotazione su fitball)', 3, '20-40 sec', 60, 'core', 'core anti-rotazione', 'no', 'it'],
      ['EX135', 'Crunch obliquo rotazione', 3, '12-15', 75, 'core', 'core rotazione', 'no', 'i'],
    ].map(riga) },
    { id: 'lowerA', name: 'Lower A', type: 'Forza', rir: 2, rest: '3 min', warmup: risc(CINQUE), exercises: [
      ['EX644', 'Reverse hyper elastico panca piana', 3, '4-6', 180, 'dominante anca', 'glutei', 'no', 'c'],
      ['EX647', 'Squat calcio laterale', 3, '4-6 per lato', 180, 'dominante ginocchia', 'quadricipiti', 'si', 'c'],
      ['EX656', 'Affondo profondo una gamba', 3, '4-6 per lato', 180, 'dominante ginocchia', 'quadricipiti', 'si'],
      ['EX043', 'Leg curl su fitball (hamstring curl supino)', 4, '12-15', 75, 'isolamento', 'ischiocrurali', 'no', 'ivp'],
      ['EX215', 'Calf raise su gradino', 4, '12-15', 75, 'isolamento', 'polpacci', 'no', 'ip'],
      ['EX021', 'Plank avambracci', 3, '20-40 sec', 60, 'core', 'core anti-estensione', 'no', 'it'],
      ['EX133', 'Crunch bicicletta gambe tese 45 gradi', 3, '12-15', 75, 'core', 'core flessione', 'alternato', 'i'],
    ].map(riga) },
    { id: 'upperB', name: 'Upper B', type: 'Ipertrofia', rir: 1, rest: '90 sec', warmup: risc(SEI.slice(0, 5).concat(['15-20'])), exercises: [
      ['EX076', 'Rematore manubri panca piana', 3, '8-12', 90, 'tirata orizzontale', 'dorsali', 'no', 'c'],
      ['EX383', 'Piegamenti inclinati panca', 3, '8-12', 90, 'spinta orizzontale', 'petto', 'no'],
      ['EX510', 'Trazioni sbarra presa neutra', 3, '8-12', 90, 'tirata verticale', 'dorsali', 'no'],
      ['EX514', 'Dip panca piedi rialzati', 3, '8-12', 90, 'spinta verticale', 'tricipiti', 'no', 'c'],
      ['EX055', 'Alzate laterali manubri', 3, '12-15', 75, 'isolamento', 'deltoidi laterali', 'no', 'iv'],
      ['EX328', 'Curl hammer un braccio corda cavo', 4, '12-15 per lato', 75, 'isolamento', 'bicipiti', 'si', 'ivp'],
      ['EX057', 'Alzate laterali fianco manubrio panca inclinata', 4, '12-15', 75, 'isolamento', 'deltoidi laterali', 'no', 'ip'],
      ['EX137', 'Crunch obliquo tocco caviglie', 3, '12-15', 75, 'core', 'core rotazione', 'alternato', 'i'],
      ['EX174', 'Plank spider', 3, '20-40 sec', 60, 'core', 'core anti-rotazione', 'no', 'it'],
    ].map(riga) },
    { id: 'lowerB', name: 'Lower B', type: 'Ipertrofia', rir: 1, rest: '90 sec', warmup: risc(CINQUE), exercises: [
      ['EX648', 'Affondo barra elastico sul posto', 3, '8-12 per lato', 90, 'dominante ginocchia', 'quadricipiti', 'si', 'c'],
      ['EX652', 'Stacco rumeno una gamba', 3, '8-12 per lato', 90, 'dominante anca', 'ischiocrurali', 'si', 'c'],
      ['EX663', 'Squat pistol assistito', 3, '8-12 per lato', 90, 'dominante ginocchia', 'quadricipiti', 'si'],
      ['EX215', 'Calf raise su gradino', 4, '12-15', 75, 'isolamento', 'polpacci', 'no', 'ip'],
      ['EX561', 'Calf raise in squat', 3, '12-15', 75, 'isolamento', 'polpacci', 'no', 'iv'],
      ['EX148', 'Crunch toe touch gambe verticali', 3, '12-15', 75, 'core', 'core flessione', 'no', 'i'],
      ['EX164', 'Dragon flag panca piana', 3, '20-40 sec', 60, 'core', 'core anti-estensione', 'no', 'it'],
    ].map(riga) },
  ] };
}
// La stessa scheda com'è nel database dal Rilascio 95 (20 novembre 2026, dopo il Training 400): quarte serie tolte,
// recupero della Lower A a 150 s, le coppie del 400. È il punto di partenza del Training 410.
function scheda410() {
  const s = scheda400();
  const DOPO = {
    upperA: { EX378: [3, 180, 0, 5], EX482: [3, 180, 0, 5], EX511: [3, 180, 0, 4], EX513: [3, 180, 0, 4], EX027: [3, 75, 1, 3], EX030: [3, 75, 1, 3], EX439: [3, 75, 0, 2], EX677: [3, 75, 1, 2], EX046: [3, 60, 0, 1], EX135: [3, 75, 0, 1] },
    lowerA: { EX644: [3, 150, 0], EX647: [3, 150, 0], EX656: [3, 150, 0], EX043: [3, 75, 1, 2], EX215: [3, 75, 1, 2], EX021: [3, 60, 0, 1], EX133: [3, 75, 0, 1] },
    upperB: { EX076: [3, 90, 0, 4], EX383: [3, 90, 0, 4], EX510: [3, 90, 0, 3], EX514: [3, 90, 0, 3], EX055: [3, 75, 0], EX328: [4, 75, 0, 2], EX057: [3, 75, 1, 2], EX137: [3, 75, 0, 1], EX174: [3, 60, 0, 1] },
    lowerB: { EX648: [3, 90, 0], EX652: [3, 90, 0], EX663: [3, 90, 0], EX215: [4, 75, 0], EX561: [3, 75, 0], EX148: [3, 75, 0, 1], EX164: [3, 60, 0, 1] },
  };
  // l'attrezzo mostrato (`eq`) com'è nella scheda vera: serve a «Prepara»
  const EQ = { EX482: 'elastico+panca', EX511: 'sbarra', EX046: 'fitball', EX135: 'corpo libero', EX647: 'corpo libero', EX656: 'corpo libero', EX043: 'fitball',
    EX215: 'corpo libero', EX021: 'corpo libero', EX133: 'corpo libero', EX076: 'elastico+panca', EX383: 'corpo libero', EX510: 'sbarra', EX514: 'corpo libero',
    EX137: 'corpo libero', EX174: 'corpo libero', EX652: 'corpo libero', EX663: 'corpo libero', EX561: 'corpo libero', EX148: 'corpo libero', EX164: 'panca' };
  s.sessioni.forEach(sess => sess.exercises.forEach(ex => {
    if (EQ[ex.codice]) ex.eq = EQ[ex.codice];
    const [sets, rest, tolte, coppia] = DOPO[sess.id][ex.codice];
    ex.sets = sets; ex.rest_sec = rest;
    if (tolte) ex.serieTolte = tolte;
    if (coppia) ex.coppia = coppia;
  }));
  return s;
}
module.exports = { scheda400, scheda410 };
