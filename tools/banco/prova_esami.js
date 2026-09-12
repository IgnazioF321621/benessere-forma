const { boot } = require('./banco');
const mk = (i, d, extra={}) => Object.assign({ id:'b'+i, user_id:'u1', test_date:d, hemoglobin:14.2+i*0.1, ferritin:80, glucose:92, cholesterol_tot:190, hdl:55, triglycerides:110, creatinine:0.9, alt:22, vitamin_d:31, vitamin_b12:420, tsh:1.8 }, extra);
const scen = {
  '0 esami': [],
  '1 esame' : [ mk(1,'2026-08-01') ],
  '3 esami' : [ mk(1,'2026-08-01'), mk(2,'2026-05-10'), mk(3,'2026-01-20', {ferritin:null, tsh:null}) ],
  '15 esami': Array.from({length:15},(_,i)=>mk(i,`2026-0${(i%9)+1}-0${(i%9)+1}`)),
};
(async()=>{
 for(const [nome, bloods] of Object.entries(scen)){
  const { win, logs } = boot({ blood_tests: bloods, body_logs:[], body_measurements:[], body_checks:[{id:'c1',status:'completed',created_at:'2026-08-01T10:00:00Z'}] });
  const ST = win.eval('ST');
  ST.user={id:'u1'}; ST.profile={unit:'kg'};
  await win.loadBodyLogs();
  ST.bodyTab='check'; win.renderBody();
  let h = win.document.getElementById('page-body').innerHTML;
  const righe = (h.match(/toggleBloodTest/g)||[]).length;
  const vuoto = /Non hai ancora registrato esami/.test(h);
  const altri = (h.match(/Mostra altri (\d+)/)||[])[1] || '-';
  // apri il primo
  let val = 0, medico = false;
  if(bloods.length){ win.toggleBloodTest(bloods[0].id); h = win.document.getElementById('page-body').innerHTML;
    val = (h.match(/Emoglobina|Ferritina|Glicemia|Colesterolo tot\.|HDL|Trigliceridi|Creatinina|ALT|Vitamina D|Vitamina B12|TSH/g)||[]).length;
    medico = /Valori da rivedere con il tuo medico/.test(h); }
  console.log(nome.padEnd(9), '| righe:', String(righe).padEnd(3), '| stato vuoto:', String(vuoto).padEnd(5), '| mostra altri:', String(altri).padEnd(3), '| valori nel dettaglio:', String(val).padEnd(3), '| frase medico:', medico, '| errori:', logs.filter(l=>l[0]!=='jsdomError').length);
 }
 // terza riga: due valori mancanti → 9 invece di 11
 const { win } = boot({ blood_tests: scen['3 esami'], body_logs:[], body_measurements:[], body_checks:[] });
 const ST = win.eval('ST'); ST.user={id:'u1'}; ST.profile={unit:'kg'};
 await win.loadBodyLogs(); ST.bodyTab='check'; win.toggleBloodTest('b3');
 const h = win.document.getElementById('page-body').innerHTML;
 console.log('esame con 2 valori nulli → conteggio in riga:', (h.match(/(\d+) valori/g)||[]).join(' '), '| ferritina nel dettaglio:', /Ferritina/.test(h));
})();
