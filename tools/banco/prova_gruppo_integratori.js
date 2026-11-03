// Stile 050 (2 novembre 2026) — il gruppo degli integratori si modifica dal foglio «Registra integratori». Feedback di Ignazio
// del 7 ottobre: «diventa complicato cambiare dentro un gruppo i componenti». A veste accesa «Modifica» apre il gruppo sul posto:
// «−» toglie con un tocco (avviso con «Annulla»), «+» mette nel gruppo un prodotto della libreria (da un altro gruppo si sposta),
// «Fatto» chiude. Il gruppo si registra ancora tutto insieme e un prodotto si segna da solo. Le scritture: supplement_package_items
// con scriviConCoda (insert con l'id del telefono, delete per gruppo e prodotto), nessuna lettura; l'editor dei pacchetti toglie
// con la stessa scrittura. A veste spenta niente «Modifica».
//   node tools/banco/prova_gruppo_integratori.js
process.env.TZ = 'Europe/Rome';
const { boot } = require('./banco');
const U = 'u1', OGGI = '2026-11-02';
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(82), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const supp = (id, name, slot, extra = {}) => ({ id, user_id:U, name, slot, active:true, quantity:1, sort_order:0, ...extra });
const tabelle = () => ({
  profiles:[{ id:U, first_name:'Ignazio', m2_skipped:true }], meals:[], meal_items:[], fasting_days:[], nutrilite_catalog:[],
  supplements:[ supp('s1', 'Proteine', '06:30'), supp('s2', 'Fibre', '06:30'), supp('s3', 'Omega 3', '06:30'),
                supp('s4', 'Vitamina C', '13:30'), supp('s5', 'Ferro', '13:30'),
                supp('s6', 'Magnesio', '06:30', { active:false }), supp('s7', 'Melatonina', '22:00') ],
  supplement_packages:[ { id:'pA', user_id:U, name:'Pack Mami', time:'06:30', emoji:'🥤', sort_order:0 }, { id:'pB', user_id:U, name:'Pack Pranzo', time:'13:30', emoji:'🍽️', sort_order:1 } ],
  supplement_package_items:[ ['i1','pA','s1'], ['i2','pA','s2'], ['i3','pA','s3'], ['i6','pA','s6'], ['i4','pB','s4'], ['i5','pB','s5'] ].map(([id, p, s], i) => ({ id, user_id:U, package_id:p, supplement_id:s, sort_order:i })),
  supplements_log:[],
});
async function avvia(v5){
  const t = tabelle();
  const b = boot(t, { now:OGGI + 'T09:00:00', locale: v5 ? { zt_v5:'1' } : {} });
  await b.avviato;
  const { win } = b; const ST = win.eval('ST');
  ST.user = { id:U, email:'ignazio.f@me.com' }; ST.profile = { id:U, first_name:'Ignazio' }; ST.catalog = []; ST.activeDay = OGGI; ST.page = 'oggi';
  await win.loadSupps(); await win.loadPackages(); await win.loadAllDays();
  win.renderOggi();
  return { ...b, t, ST, d: win.document };
}
(async () => {
  const b = await avvia(true);
  const { win, supa, d, ST, t } = b;
  const foglio = () => d.getElementById('supp-sheet-body');
  const testo = (el) => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  const gruppo = (id) => foglio().querySelector(`[data-gruppo="${id}"]`);
  const bottone = (el, tb) => el && [...el.querySelectorAll('button')].find(x => x.textContent.trim() === tb);
  const righe = (gid) => [...gruppo(gid).querySelectorAll('[data-supp]')].map(r => r.dataset.supp);
  const aggiungi = (gid) => [...gruppo(gid).querySelectorAll('.rs-aggiungi')].map(x => testo(x));
  const legami = (pid) => (ST.packages.find(p => p.id === pid).items || []).map(it => it.supplement_id).sort();
  const scritture = (da) => supa._calls.slice(da).filter(c => c.table === 'supplement_package_items' && c.op !== 'select')
    .map(c => c.op === 'insert' ? 'insert:' + c.payload.package_id + '+' + c.payload.supplement_id + (/^[0-9a-f-]{36}$/.test(c.payload.id) ? ':id' : '') : c.op + ':' + c.filters.map(f => f[1] + '=' + f[2]).join('&'));
  const letture = (da) => supa._calls.slice(da).filter(c => c.op === 'select').length;
  const coda = () => JSON.parse(win.localStorage.getItem('zt_coda_' + U) || '[]');

  win.openSuppSheet(); await attendi(5);
  atteso('veste accesa · «Modifica» sui due pacchetti, non su «Altri integratori»', ['pA', 'pB', 'altri'].map(g => !!bottone(gruppo(g), 'Modifica')), [true, true, false]);

  const n0 = supa._calls.length;
  bottone(gruppo('pA'), 'Modifica').click(); await attendi(5);
  atteso('Modifica · il gruppo si apre sul posto: «−» su ogni prodotto (anche il sospeso), «Fatto», niente spunte', [gruppo('pA').classList.contains('in-modifica'), righe('pA'), gruppo('pA').querySelectorAll('.rs-togli').length, !!bottone(gruppo('pA'), 'Fatto'), gruppo('pA').querySelectorAll('.rs-spunta').length], [true, ['s1', 's2', 's3', 's6'], 4, true, 0]);
  atteso('Modifica · «Aggiungi al gruppo»: la libreria, prima chi è fuori dai gruppi, poi gli altri con il gruppo da cui arrivano', aggiungi('pA'), ['+Melatonina', '+Ferroda Pack Pranzo', '+Vitamina Cda Pack Pranzo']);

  // − con un tocco
  gruppo('pA').querySelector('[data-supp="s2"] .rs-togli').click(); await attendi(20);
  atteso('«−» su Fibre · una scrittura sola (delete per gruppo, prodotto e persona), fuori dal gruppo, ora fra gli aggiungibili', [scritture(n0), legami('pA'), righe('pA'), aggiungi('pA')[0]], [['delete:package_id=pA&supplement_id=s2&user_id=u1'], ['s1', 's3', 's6'], ['s1', 's3', 's6'], '+Fibre']);
  const avviso = d.getElementById('rs-avviso');
  atteso('«−» · l\'avviso dice cosa è successo e ha «Annulla»', [testo(avviso)], ['Fibre tolto da Pack MamiAnnulla']);
  const n1 = supa._calls.length;
  avviso.querySelector('button').click(); await attendi(20);
  atteso('Annulla · Fibre torna nel gruppo (insert con l\'id del telefono)', [scritture(n1), legami('pA')], [['insert:pA+s2:id'], ['s1', 's2', 's3', 's6']]);

  // + dalla libreria
  const n2 = supa._calls.length;
  [...gruppo('pA').querySelectorAll('.rs-aggiungi')].find(x => /Melatonina/.test(x.textContent)).click(); await attendi(20);
  atteso('«+» Melatonina · un insert, entra nel gruppo, esce da «Altri integratori»', [scritture(n2), legami('pA').includes('s7'), aggiungi('pA').some(x => /Melatonina/.test(x))], [['insert:pA+s7:id'], true, false]);
  const n3 = supa._calls.length;
  [...gruppo('pA').querySelectorAll('.rs-aggiungi')].find(x => /Ferro/.test(x.textContent)).click(); await attendi(30);
  atteso('«+» Ferro da Pack Pranzo · si sposta: prima esce dall\'altro gruppo, poi entra qui', [scritture(n3), legami('pB'), legami('pA').includes('s5'), testo(d.getElementById('toast'))], [['delete:package_id=pB&supplement_id=s5&user_id=u1', 'insert:pA+s5:id'], ['s4'], true, '✅ Ferro spostato da Pack Pranzo a Pack Mami']);
  atteso('modifica · nessuna lettura dal database', letture(n0), 0);

  // gruppo svuotato: resta aperto
  bottone(gruppo('pA'), 'Fatto').click(); await attendi(5);
  bottone(gruppo('pB'), 'Modifica').click(); await attendi(5);
  gruppo('pB').querySelector('[data-supp="s4"] .rs-togli').click(); await attendi(20);
  atteso('Pack Pranzo svuotato · resta aperto in modifica, con l\'invito ad aggiungere', [!!gruppo('pB'), /Il gruppo è vuoto/.test(testo(gruppo('pB')))], [true, true]);
  bottone(gruppo('pB'), 'Fatto').click(); await attendi(5);
  atteso('Fatto · il gruppo vuoto non si vede più, Vitamina C sta in «Altri integratori»', [!!gruppo('pB'), righe('altri')], [false, ['s4']]);

  // la registrazione resta quella di prima
  atteso('Pack Mami dopo la modifica · le righe nuove, «Prendi tutto»', [righe('pA'), !!bottone(gruppo('pA'), 'Prendi tutto')], [['s1', 's2', 's3', 's7', 's5', 's6'], true]);
  const n4 = supa._calls.length;
  bottone(gruppo('pA'), 'Prendi tutto').click(); await attendi(40);
  atteso('«Prendi tutto» · i cinque attivi del gruppo registrati in un colpo (il sospeso no)', [[...win.getDay(OGGI).suppsTaken].sort(), supa._calls.slice(n4).filter(c => c.table === 'supplements_log' && c.op === 'insert').length], [['s1', 's2', 's3', 's5', 's7'], 5]);
  gruppo('pA').querySelector('.rs-gruppo-testa').click(); await attendi(5);
  gruppo('pA').querySelector('[data-supp="s7"] .rs-spunta').click(); await attendi(30);
  atteso('un prodotto da solo · la spunta toglie solo Melatonina', [...win.getDay(OGGI).suppsTaken].sort(), ['s1', 's2', 's3', 's5']);

  // senza rete
  bottone(gruppo('pA'), 'Modifica').click(); await attendi(5);
  t.__rete = false;
  gruppo('pA').querySelector('[data-supp="s3"] .rs-togli').click(); await attendi(40);
  atteso('senza rete · Omega 3 esce subito dal gruppo, la scrittura è in coda, niente «errore»', [legami('pA').includes('s3'), coda().filter(q => q.op.tabella === 'supplement_package_items').length, /errore/i.test(testo(foglio()))], [false, 1, false]);
  t.__rete = undefined;
  const n5 = supa._calls.length;
  await win.svuotaCoda(); await attendi(20);
  atteso('torna la rete · la coda si svuota e la cancellazione arriva', [coda().length, scritture(n5)], [0, ['delete:package_id=pA&supplement_id=s3&user_id=u1']]);
  win.closeSuppSheet();

  // l'editor dei pacchetti toglie con la stessa scrittura
  const n6 = supa._calls.length;
  win.openPackageEditor('pA'); win.pkgEditorRemoveItem('s1'); await attendi(4200);
  atteso('editor dei pacchetti · «Rimuovi» dopo 4 secondi: la stessa scrittura del foglio, e il gruppo in memoria si aggiorna', [scritture(n6), legami('pA').includes('s1')], [['delete:package_id=pA&supplement_id=s1&user_id=u1'], false]);
  win.closePackageEditor();

  // revisore di Stile 050: un rifiuto dell'API rimette solo l'elemento tolto, al suo posto; ciò che è cambiato nel frattempo resta
  {
    const ordine = () => (ST.packages.find(p => p.id === 'pA').items || []).map(it => it.supplement_id);
    const prima = ordine();
    const vera = win.scriviConCoda; let rifiuta;
    win.scriviConCoda = (op, o) => o.tabella === 'supplement_package_items' && o.filtri && o.filtri[1][1] === 's2'
      ? new Promise(r => { rifiuta = () => r({ data:null, error:{ code:'42501', message:'permesso negato' } }); }) : vera(op, o);
    const x = win.gruppoTogli('pA', 's2');          // X: l'API lo rifiuterà dopo
    const y = await win.gruppoTogli('pA', 's7');    // Y: riesce nel frattempo
    rifiuta(); const ex = await x;
    win.scriviConCoda = vera;
    atteso('X rifiutato mentre Y riesce · X torna al suo posto, Y resta fuori (niente fotografia di prima)', [ex, y, ordine()], [false, true, prima.filter(id => id !== 's7')]);
  }
  t.__rifiuta = { supplement_package_items:{ code:'42501', message:'permesso negato' } };
  win.openPackageEditor('pA'); win.pkgEditorRemoveItem('s5'); await attendi(4200);
  atteso('editor · se l\'API rifiuta, il prodotto torna nell\'editor e nel gruppo', [ST.packageEditor.items.some(it => it.supplement_id === 's5'), legami('pA').includes('s5')], [true, true]);
  t.__rifiuta = undefined;
  win.closePackageEditor();
  atteso('zero errori in console', b.logs.filter(l => l[0] === 'jsdomError' && !/register/.test(l[1])).length, 0);

  // veste spenta: niente Modifica
  const s = await avvia(false);
  s.win.openSuppSheet(); await attendi(5);
  atteso('veste spenta · il foglio di prima, senza «Modifica»', [...s.d.getElementById('supp-sheet-body').querySelectorAll('button')].some(x => x.textContent.trim() === 'Modifica'), false);
  console.log(ko ? `\n${ko} KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO  eccezione:', e.stack || e.message); process.exit(1); });
