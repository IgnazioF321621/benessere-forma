const { boot } = require('./banco');
const iso = d => new Date(Date.now() - d*86400000).toISOString();
const scen = {
  'storico vuoto':            { checks:[], meas:[] },
  'check completato ieri':    { checks:[{id:'c1',status:'completed',created_at:iso(1)}], meas:[{check_id:'c1',created_at:iso(1),weight_kg:80,waist_cm:88,body_fat_pct:20}] },
  'check in corso':           { checks:[{id:'c2',status:'in_progress',created_at:iso(0)}], meas:[] },
  'fine blocco senza check':  { checks:[{id:'c3',status:'completed',created_at:iso(60)}], meas:[{check_id:'c3',created_at:iso(60),weight_kg:82,waist_cm:90,body_fat_pct:22}] },
};
(async()=>{
 for(const [nome, s] of Object.entries(scen)){
  const { win } = boot({});
  const ST = win.eval('ST');
  ST.user={id:'u1'};
  ST.profile={ unit:'kg', train_start_date:'2026-07-01', goal_weight_kg:78, weight_kg:80 };
  ST.bodyLogs=[]; ST.bodyMeasurements=s.meas; ST.bodyChecks=s.checks;
  const out=[];
  for(const tab of ['misure','tendenza','check']){
    ST.bodyTab=tab; win.renderBody();
    const h = win.document.getElementById('page-body').innerHTML;
    const n = (h.match(/Nuovo check fisico|Riprendi check fisico/g)||[]).length;
    out.push(`${tab}: cta=${n} ${/ora del check di fine blocco/.test(h)?'+REMINDER':''}${/Riprendi check/.test(h)?' [riprendi]':''}`);
  }
  console.log(nome.padEnd(26), '|', out.join(' | '));
 }
 // reminder: blocco non ancora finito
 const { win } = boot({}); const ST = win.eval('ST');
 ST.user={id:'u1'}; ST.profile={unit:'kg', train_start_date: new Date(Date.now()-10*86400000).toISOString().slice(0,10)};
 ST.bodyLogs=[]; ST.bodyMeasurements=[]; ST.bodyChecks=[];
 ST.bodyTab='misure'; win.renderBody();
 const h = win.document.getElementById('page-body').innerHTML;
 console.log('blocco a 10 giorni (mai nessun check) → reminder:', /ora del check di fine blocco/.test(h), '| cta:', (h.match(/Nuovo check fisico/g)||[]).length);
 // senza train_start_date
 ST.profile={unit:'kg'}; win.renderBody();
 const h2 = win.document.getElementById('page-body').innerHTML;
 console.log('senza Training → reminder:', /ora del check di fine blocco/.test(h2), '| cta:', (h2.match(/Nuovo check fisico/g)||[]).length);
})();
