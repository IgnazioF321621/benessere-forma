const { boot } = require('./banco');

const scheda = { sessioni: [ { id:'upperA', name:'Upper A', type:'Upper', rir:2, exercises:[
  { codice:'EX510', name:'Trazioni sbarra presa neutra VECCHIO', sets:4, reps:'6-10' },   // rinominato a catalogo
  { codice:'EX008', name:'Trazioni sbarra', sets:4, reps:'6-10' },                         // nome invariato
  { codice:'EX512', name:'Trazioni sbarra zavorrate', sets:3, reps:'4-6' },                // falso positivo banda
  { codice:'EX449', name:'Lat machine V-bar', sets:3, reps:'8-12' },                       // nome con accenti/spazi diversi nei log
  { codice:'EX476', name:'Rematore macchina a dischi presa inversa', sets:3, reps:'8-12' },// spostato da altra sessione
] } ] };

const catalogo = [
  { codice:'EX510', nome:'Trazioni sbarra presa neutra' },
  { codice:'EX008', nome:'Trazioni sbarra' },
  { codice:'EX512', nome:'Trazioni sbarra zavorrate' },
  { codice:'EX449', nome:'Lat machine V-bar' },
  { codice:'EX476', nome:'Rematore macchina a dischi presa inversa' },
];

const logs = [
  // loggato col NOME VECCHIO (prima della rinomina)
  { user_id:'u1', session_id:'upperA', date:'2026-09-05', exercise_name:'Trazioni sbarra presa neutra VECCHIO', set_number:3, reps:7, resistance:null, band_color:'Rossa', rir_actual:1 },
  { user_id:'u1', session_id:'upperA', date:'2026-09-05', exercise_name:'Trazioni sbarra', set_number:4, reps:6, resistance:null, band_color:'Gialla', rir_actual:2 },
  { user_id:'u1', session_id:'upperA', date:'2026-09-05', exercise_name:'Trazioni sbarra zavorrate', set_number:3, reps:5, resistance:'20', band_color:null, rir_actual:1 },
  // stesso esercizio scritto con maiuscole/spazi diversi
  { user_id:'u1', session_id:'upperA', date:'2026-09-05', exercise_name:'lat  machine  v-bar', set_number:3, reps:10, resistance:'50', band_color:null, rir_actual:2 },
  // esercizio loggato in un'ALTRA sessione (spostato dalla rigenerazione)
  { user_id:'u1', session_id:'upperB', date:'2026-09-03', exercise_name:'Rematore macchina a dischi presa inversa', set_number:3, reps:9, resistance:'60', band_color:null, rir_actual:2 },
];

(async () => {
  const { win, logs: errs } = boot({
    schede_utente: [ { user_id:'u1', attiva:true, blocco_n:3, scheda } ],
    esercizi_catalog: catalogo,
    training_logs: logs,
  });
  const ST = win.eval('ST');
  ST.user = { id:'u1' };
  ST.profile = { unit:'lbs' };
  await win.loadActiveScheda();
  const sess = win.getTrainingSession('upperA');
  console.log('nomi riallineati:', sess.exercises.map(e=>e.name));
  console.log('nameSnapshot EX510:', sess.exercises[0].nameSnapshot);
  await win.loadLastLoggedSets('upperA');
  const m = ST.lastLoggedSets;
  for(const e of sess.exercises){
    const r = m[e.name];
    console.log((r?'  OK  ':'  KO  '), e.codice, e.name, '→', r ? `${r.date} ${r.reps}r ${r.band_color||r.resistance}` : 'NESSUNO STORICO');
  }
  console.log('errori console:', errs.filter(l=>l[0]!=='jsdomError').slice(0,5));
})();
