// Body 170 (3 novembre 2026): lo storico delle analisi da un file CSV e la scheda «Analisi» compatta.
// Ignazio: «molto dispersiva e lunga», e vuole caricare tutto lo storico delle donazioni (37 prelievi dal 2013).
// Parte 1, senza jsdom: ZTEsami.leggiCSV sulla fixture finta (stesso formato del file vero: BOM, CRLF, celle vuote,
// una data ripetuta, un nome sconosciuto, la sezione «RANGE DI RIFERIMENTO», ×10³/µL) e sui file che non hanno il
// formato. Parte 2, l'app vera: «Importa da file CSV», l'anteprima con le date già presenti che si saltano,
// l'interruttore «Sono donazioni» acceso, la scrittura a blocchi con upsert e ignoreDuplicates e fonte 'csv', Pirsi
// che non parte, il file sbagliato che non scrive; la scheda con 38 prelievi e 30 valori: panoramica, famiglie
// chiuse, grafico al tocco, «Per data» a 5 righe, la tabella chiusa e poi aperta con la colonna del nome ferma;
// l'altezza della pagina in Chrome vero, se c'è.
//   node tools/banco/prova_body_170.js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFile } = require('child_process');
const E = require('../../shared/esami.js');
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const U = 'u1', OGGI = '2026-11-03', NOW = { now: '2026-11-03T09:00:00' };
const FIXTURE = fs.readFileSync(path.join(__dirname, 'dati', 'esami_finti_20261103.csv'), 'utf8');

// ── Parte 1: il lettore del CSV ──
{
  const L = E.leggiCSV(FIXTURE);
  atteso('csv · riconosciuto: 5 prelievi (6 righe, una data ripetuta), 18 colonne, dal 2013 al 2026, un nome ignoto, una cella scartata', [L.riconosciuto, L.prelievi.length, L.colonne, L.doppie, L.celle_scartate, L.dal, L.al, L.nomi_ignoti], [true, 5, 18, 1, 1, '2013-12-27', '2026-03-28', ['Pippo']]);
  atteso('csv · la sezione dei range non entra: nessun prelievo con data vuota, nessun valore «Globuli Bianchi» da lì', L.prelievi.every(p => /^\d{4}-\d{2}-\d{2}$/.test(p.test_date)), true);
  const p = L.prelievi[0];
  atteso('csv · la prima riga: 18 valori, i nomi dal vocabolario, l\'unità come scritta, la fascia dell\'intestazione come fascia del referto', [p.test_date, p.esami.length, p.esami.map(e => e.chiave), p.esami[0].unita, p.esami[0].rif_min, p.esami[0].rif_max, p.esami[11].nome, p.esami[11].chiave], ['2026-03-28', 18, ['globuli_bianchi', 'neutrofili_pct', 'neutrofili', 'globuli_rossi', 'emoglobina', 'mchc', 'piastrine', 'glicemia', 'creatinina', 'proteine_tot', 'ferritina', 'alt', 'colesterolo_tot', 'hdl', 'rischio_cv', 'ldl', 'trigliceridi', null], '×10³/µL', 4.3, 10.3, 'ALT (GPT)', 'alt']);
  const p3 = L.prelievi.find(x => x.test_date === '2025-08-23');
  atteso('csv · le celle vuote si saltano, «x» non è un numero e si scarta', [p3.esami.length, p3.esami.some(e => e.chiave === 'neutrofili_pct'), p3.esami.some(e => e.chiave === 'trigliceridi'), p3.esami.some(e => e.nome === 'Pippo')], [13, false, false, false]);
  atteso('csv · la data ripetuta tiene la prima riga', L.prelievi.find(x => x.test_date === '2025-05-10').esami[0].valore, 4.9);
  atteso('csv · tutti i valori contati', L.valori, L.prelievi.reduce((n, x) => n + x.esami.length, 0));
  atteso('csv · stesso risultato con LF e senza BOM', JSON.stringify(E.leggiCSV(FIXTURE.replace(/^﻿/, '').replace(/\r\n/g, '\n'))) === JSON.stringify(L), true);
  atteso('csv · col punto e virgola e la virgola decimale', E.leggiCSV('Data;Emoglobina (13,6–17,2 g/dL);Ferritina (ng/mL)\n12/10/2026;15,1;28\n').prelievi[0].esami.map(e => [e.chiave, e.valore, e.unita, e.rif_min]), [['emoglobina', 15.1, 'g/dL', 13.6], ['ferritina', 28, 'ng/mL', undefined]]);
  atteso('csv · senza fascia nell\'intestazione il nome resta e la fascia è quella della tabella', [E.csvIntestazione('Ferritina'), E.csvIntestazione('MCV (fL)'), E.csvIntestazione('ALT (GPT) (10–50 U/L)')], [{ nome: 'Ferritina', unita: '' }, { nome: 'MCV', unita: 'fL' }, { nome: 'ALT (GPT)', unita: 'U/L', rif_min: 10, rif_max: 50 }]);
  atteso('csv · il formato che non conosco: niente da scrivere', [E.leggiCSV(''), E.leggiCSV('ciao'), E.leggiCSV('Nome,Valore\nFerritina,28'), E.leggiCSV('Data,Ferritina (ng/mL)\nnon una data,28')].map(x => [x.riconosciuto, x.prelievi.length]), [[false, 0], [false, 0], [false, 0], [false, 0]]);
  atteso('csv · «Data» con una riga di sole celle vuote prima dei range: si ferma lì', E.leggiCSV('Data,Ferritina (ng/mL)\n12/10/26,28\n,\nRANGE,1\n').prelievi.length, 1);
  // revisione del 3 novembre 2026
  atteso('date · ancorate (2026-3-28 non è il 2028), orario dopo la data, anno a due cifre col pivot a 50, giorno che non esiste', ['2026-3-28', '12/10/2026 08:30', '2026-10-12T08:00:00Z', '13/12/99', '1/2/13', '31/04/26', '12/10/26 x 2027'].map(E.dataPrelievo), ['2026-03-28', '2026-10-12', '2026-10-12', '1999-12-13', '2013-02-01', null, null]);
  const L2 = E.leggiCSV('Data prelievo,Emoglobina (13.6–17.2 g/dL),Ferritina (18–464 ng/mL)\n31/04/26,15,30\n28/03/26,15,1,30\n01/01/27,15,30\n10/05/25,,\n10/05/25,14,20\n12/10/13,15.2,n.d.\n', { oggi: '2026-11-03' });
  atteso('csv · «Data prelievo» va bene; una data che non esiste, una riga con più celle, una data dopo oggi si saltano e si contano; la data con le celle vuote non consuma la data; «n.d.» scartata', [L2.prelievi.map(p => p.test_date), L2.date_non_valide, L2.righe_lunghe, L2.future, L2.doppie, L2.celle_scartate], [['2025-05-10', '2013-10-12'], 1, 1, 1, 0, 1]);
  atteso('intestazione · «(<200 mg/dL)», «(>40 mg/dL)», il trattino lungo', [E.csvIntestazione('Colest. Totale (<200 mg/dL)'), E.csvIntestazione('HDL (>40 mg/dL)'), E.csvIntestazione('MCV (80—96 fL)')], [{ nome: 'Colest. Totale', unita: 'mg/dL', rif_max: 200 }, { nome: 'HDL', unita: 'mg/dL', rif_min: 40 }, { nome: 'MCV', unita: 'fL', rif_min: 80, rif_max: 96 }]);
  atteso('vocabolario · VLDL, eGFR, proteine urinarie, RDW-SD, linfociti T/B non prendono la chiave; «Hb A1c» sì; la sigla con la descrizione fra parentesi sì', ['Colesterolo VLDL', 'Creatinina (eGFR)', 'Proteine urinarie', 'RDW-SD', 'Linfociti T/B', 'Hb A1c', 'MCV (volume corpuscolare medio)', 'MCHC (concentrazione emoglobinica corpuscolare media)'].map(E.riconosci), [null, null, null, null, null, 'hba1c', 'mcv', 'mchc']);
  atteso('vocabolario · i nomi del foglio di Ignazio', ['Colest. Totale', 'Colest. HDL', 'Colest. LDL', 'Ind. Rischio CV', 'Protidemia totale', 'ALT (GPT)', 'Neutrofili #', 'Neutrofili %', 'Globuli Bianchi', 'Globuli Rossi', 'HCT', 'MCV', 'MCH', 'MCHC', 'RDW', 'Piastrine', 'MPV', 'Basofili %', 'Eosinofili #'].map(E.riconosci), ['colesterolo_tot', 'hdl', 'ldl', 'rischio_cv', 'proteine_tot', 'alt', 'neutrofili', 'neutrofili_pct', 'globuli_bianchi', 'globuli_rossi', 'ematocrito', 'mcv', 'mch', 'mchc', 'rdw', 'piastrine', 'mpv', 'basofili_pct', 'eosinofili']);
  atteso('vocabolario · con l\'unità «%» la formula leucocitaria va alla percentuale, e viceversa; «Emoglobina glicosilata» è l\'HbA1c', [E.valida({ riconosciuto: true, esami: [{ nome: 'Neutrofili', valore: 55, unita: '%' }, { nome: 'Linfociti %', valore: 1.1, unita: '×10³/µL' }, { nome: 'Emoglobina glicosilata', valore: 5.2, unita: '%' }] }).esami.map(e => e.chiave)], [['neutrofili_pct', 'linfociti', 'hba1c']]);
  atteso('vocabolario · le famiglie: ogni esame ne ha una, nell\'elenco', [E.ESAMI.every(e => E.FAMIGLIE.some(f => f.chiave === e.famiglia)), E.famigliaDi('ferritina'), E.famigliaDi('mcv'), E.famigliaDi(null), E.PANORAMICA.every(k => E.esame(k))], [true, 'ferro', 'ematologia', 'altro', true]);
  atteso('vocabolario · le 11 colonne di blood_tests non cambiano', E.ESAMI.filter(e => e.colonna).length, 11);
}

// ── Parte 2: l'app ──
function fixture(righe){
  return {
    __sessione: { user: { id: U, email: 'ignazio.f@me.com' } },   // l'app è chiusa ai tester (Metodo 110): con un'altra email resta su «app chiusa», e Chrome non vedrebbe la scheda
    profiles: [{ id: U, first_name: 'A', sex: 'M', m2_skipped: true, unit: 'kg', obiettivo: 'mantenimento', target_kcal: 2000, target_protein: 120, target_carbs: 200, target_fat: 60, weight_kg: 72 }],
    blood_tests: righe.map(r => ({ ...r })), meals: [], meal_items: [], fasting_days: [], supplements: [], supplements_log: [], supplement_packages: [], supplement_package_items: [], weight_logs: [], body_logs: [],
    body_checks: [], body_measurements: [], workouts: [], training_logs: [], training_notes: [], schede_utente: [], daily_log: [], rilevazioni: [], coach_proposals: [], weekly_pictures: [], fitdays_letture: [], push_iscrizioni: [],
  };
}
async function pronta(tables, opts){
  const b = boot(tables, { ...NOW, ...(opts || {}) });
  await b.avviato;
  const ST = b.win.eval('ST'); ST.user = { id: U, email: 'ignazio.f@me.com' }; ST.profile = tables.profiles[0]; b.win.applyProfile(ST.profile);
  b.chiamateAI = [];
  b.win.callAI = async (p) => { b.chiamateAI.push(p); return 'Tutto stabile.'; };
  ST.page = 'body'; ST.bodyTab = 'analisi';
  await b.win.loadBodyLogs();
  await b.win.loadBloodTests();
  b.win.renderBody();
  await attendi(30);
  return { ...b, ST, d: b.win.document };
}
const pagina = (b) => b.d.getElementById('page-body');
const scritture = (b, op) => b.supa._calls.filter(c => c.table === 'blood_tests' && c.op === op);
const foglio = (b) => b.d.querySelector('.foglio');
const tasto = (b, re) => [...b.d.querySelectorAll('.foglio button')].find(x => re.test(x.textContent));
const fileCSV = (b, contenuto, nome = 'storico.csv') => new b.win.File([contenuto], nome, { type: 'text/csv' });
async function importa(b, contenuto){
  const input = b.d.getElementById('an-csv');
  Object.defineProperty(input, 'files', { value: [fileCSV(b, contenuto)], configurable: true });
  const p = b.win.importaCSV(input);
  await attendi(60);
  return p;
}
// 38 prelievi × 30 valori con numeri finti, dentro la fascia tranne qualcuno
const COLONNE = ['Globuli Bianchi (4.3–10.3 ×10³/µL)', 'Neutrofili % (41–73 %)', 'Linfociti % (19.4–44.9 %)', 'Monociti % (5.1–10.9 %)', 'Eosinofili % (0.9–6 %)', 'Basofili % (0.3–2 %)', 'Neutrofili # (2.1–6.1 ×10³/µL)', 'Linfociti # (1.3–3.5 ×10³/µL)', 'Monociti # (0.3–0.9 ×10³/µL)', 'Eosinofili # (0.1–0.5 ×10³/µL)', 'Globuli Rossi (4.38–5.77 ×10⁶/µL)', 'Emoglobina (13.6–17.2 g/dL)', 'HCT (39.5–50.3 %)', 'MCV (80–96 fL)', 'MCH (27.2–33.5 pg)', 'MCHC (32–36 g/dL)', 'RDW (11.7–14.7 %)', 'Piastrine (156–373 ×10³/µL)', 'MPV (8.1–12.9 fL)', 'Glicemia (70–105 mg/dL)', 'Creatinina (0.7–1.3 mg/dL)', 'Protidemia totale (6.3–8.3 g/dL)', 'Ferritina (18–464 ng/mL)', 'ALT (GPT) (10–50 U/L)', 'Colest. Totale (140–200 mg/dL)', 'Colest. HDL (40–60 mg/dL)', 'Ind. Rischio CV (2–5 ratio)', 'Colest. LDL (50–100 mg/dL)', 'Trigliceridi (40–160 mg/dL)', 'Vitamina D (30–100 ng/mL)'];
function csvGrande(n){
  const righe = [];
  let seme = 7; const rnd = () => { seme = (seme * 9301 + 49297) % 233280; return seme / 233280; };
  for(let i = 0; i < n; i++){
    const d = new Date(Date.UTC(2026, 2, 28)); d.setUTCMonth(d.getUTCMonth() - i * 4);
    const data = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCFullYear()).slice(2)}`;
    righe.push([data, ...COLONNE.map(c => { const m = /\(([\d.]+)–([\d.]+)/.exec(c); const lo = +m[1], hi = +m[2]; const v = (i === 0 && /Ferritina|Piastrine/.test(c)) ? lo * 0.6 : lo + (hi - lo) * (0.1 + 0.8 * rnd()); return String(Math.round(v * 10) / 10); })].join(','));   // l'ultimo prelievo: ferritina e piastrine sotto la fascia
  }
  return '﻿Data,' + COLONNE.map(c => `"${c}"`).join(',') + '\r\n' + righe.join('\r\n') + '\r\n';
}

(async () => {
  // 2a. importare la fixture con una data già presente
  {
    const b = await pronta(fixture([{ id: 'b1', user_id: U, test_date: '2026-03-28', donazione: false, fonte: 'lettura', esami: [{ nome: 'Ferritina', chiave: 'ferritina', valore: 15, unita: 'ng/mL' }], ferritin: 15 }]));
    const h0 = testo(pagina(b));
    atteso('scheda · i tre tasti: Carica, Importa da file CSV, Aggiungi a mano; l\'input del CSV', [/Carica analisi \(PDF o foto\)/.test(h0), /Importa da file CSV/.test(h0), /Aggiungi a mano/.test(h0), b.d.getElementById('an-csv').getAttribute('accept')], [true, true, true, '.csv,text/csv,text/plain']);
    const p = importa(b, FIXTURE);
    await attendi(80);
    const f = foglio(b);
    atteso('anteprima · il foglio dice prelievi, date, valori, la data già presente che salto, la data ripetuta, il nome ignoto; «Sono donazioni» acceso; il tasto conta i nuovi', [!!f, /5 prelievi dal 27 dicembre 2013 al 28 marzo 2026/.test(testo(f)), /1 data già presente, che salto/.test(testo(f)), /1 riga con una data ripetuta/.test(testo(f)), /1 nome che non conosco resta come scritto: Pippo/.test(testo(f)), b.d.querySelector('.an-f-donazione').getAttribute('aria-checked'), !!tasto(b, /^Importa 4$/)], [true, true, true, true, true, 'true', true]);
    atteso('anteprima · nessuna scrittura prima di «Importa»', scritture(b, 'upsert').length, 0);
    tasto(b, /^Importa 4$/).click();
    await p; await attendi(40);
    const up = scritture(b, 'upsert');
    atteso('scrittura · un upsert (4 righe < blocco) su persona+data con ignoreDuplicates, che rilegge le date scritte', [up.length, up[0].upsertOpts, up[0].cols, up[0].payload.length, up[0].payload.map(r => r.test_date)], [1, { onConflict: 'user_id,test_date', ignoreDuplicates: true }, 'test_date', 4, ['2025-12-27', '2025-08-23', '2025-05-10', '2013-12-27']]);
    const r0 = up[0].payload[0];
    atteso('scrittura · ogni riga: fonte csv, donazione, le colonne dalle chiavi con l\'unità attesa, tutte le righe in esami con la fascia del referto', [r0.fonte, r0.donazione, r0.user_id, r0.hemoglobin, r0.ferritin, r0.glucose, r0.cholesterol_tot, r0.hdl, r0.triglycerides, r0.creatinine, r0.alt, r0.vitamin_d, r0.esami.length, r0.esami[0], r0.prompt_version], ['csv', true, U, 16.1, 20, 84, 166, 55, 101, 0.8, 19, null, 17, { nome: 'Globuli Bianchi', chiave: 'globuli_bianchi', valore: 6.1, unita: '×10³/µL', rif_min: 4.3, rif_max: 10.3 }, null]);
    atteso('scrittura · la data già presente non si tocca: la riga di prima è ancora la lettura con 1 valore', [b.tabelle ? null : (b.supa._tables || null), (b.ST.bloodTests || []).find(r => r.test_date === '2026-03-28').fonte, (b.ST.bloodTests || []).find(r => r.test_date === '2026-03-28').esami.length, (b.ST.bloodTests || []).length], [null, 'lettura', 1, 5]);
    const h = testo(pagina(b));
    atteso('dopo · toast «Importati 4 prelievi», conto 4 donazioni, Pirsi non chiamato, nessuna riga aperta', [/Importati 4 prelievi/.test(testo(b.d.getElementById('toast'))), /4 donazioni/.test(h), b.chiamateAI.length, b.ST.analisiAperta], [true, true, 0, null]);
    atteso('dopo · mai la parola «errore»', /errore/i.test(h + testo(f)), false);
    // tutte le date presenti: niente foglio
    const n = scritture(b, 'upsert').length;
    await importa(b, FIXTURE); await attendi(20);
    atteso('di nuovo · tutte le date presenti: lo dice, nessun foglio, niente scritto', [/5 prelievi nel file, con date già presenti: niente da importare/.test(testo(b.d.getElementById('toast'))), !!foglio(b), scritture(b, 'upsert').length - n], [true, false, 0]);
    // il file sbagliato
    await importa(b, 'Nome,Valore\nFerritina,28\n'); await attendi(20);
    atteso('file sbagliato · lo dice in chiaro, niente scritto', [/non ha il formato che conosco/.test(testo(b.d.getElementById('toast'))), /Non ho scritto niente/.test(testo(b.d.getElementById('toast'))), !!foglio(b), scritture(b, 'upsert').length - n], [true, true, false, 0]);
    // annulla
    const p2 = importa(b, 'Data,Ferritina (18–464 ng/mL)\n01/01/20,30\n'); await attendi(60);
    tasto(b, /^Annulla$/).click(); const esito = await p2;
    atteso('annulla · niente scritto', [esito, scritture(b, 'upsert').length - n], [undefined, 0]);
    // «Sono donazioni» spento
    const p3 = importa(b, 'Data,Ferritina (18–464 ng/mL)\n01/01/20,30\n'); await attendi(60);
    b.d.querySelector('.an-f-donazione').click();
    tasto(b, /^Importa 1$/).click(); await p3; await attendi(30);
    atteso('donazioni spento · la riga entra con donazione false', [scritture(b, 'upsert').pop().payload[0].donazione, /Importato 1 prelievo/.test(testo(b.d.getElementById('toast')))], [false, true]);
  }

  // 2b. i blocchi e la scrittura che si ferma
  {
    const b = await pronta(fixture([]));
    const p = importa(b, csvGrande(37)); await attendi(80);
    atteso('37 prelievi · l\'anteprima li conta, 1.110 valori in 30 colonne', [/37 prelievi/.test(testo(foglio(b))), /1\.110 valori in 30 colonne/.test(testo(foglio(b)))], [true, true]);
    tasto(b, /^Importa 37$/).click(); await p; await attendi(40);
    const up = scritture(b, 'upsert');
    atteso('37 prelievi · quattro scritture a blocchi di 10, tutte con ignoreDuplicates', [up.length, up.map(u => u.payload.length), up.every(u => u.upsertOpts.ignoreDuplicates)], [4, [10, 10, 10, 7], true]);
    atteso('37 prelievi · nessuna chiamata a Pirsi, 37 righe', [b.chiamateAI.length, b.ST.bloodTests.length], [0, 37]);
    // la seconda scrittura che non parte: si ferma, lo dice senza «errore», le prime 10 restano
    const c = await pronta(fixture([]));
    const vero = c.win.dbq; let giro = 0;
    c.win.dbq = async (cosa, chiamata, o) => { if(/importare le analisi/.test(cosa) && ++giro === 2) return { data: null, error: { code: '', message: 'TypeError: Failed to fetch' } }; return vero(cosa, chiamata, o); };
    const pc = importa(c, csvGrande(25)); await attendi(80);
    tasto(c, /^Importa 25$/).click(); await pc; await attendi(40);
    atteso('scrittura ferma · 10 su 25, toast che dice di riprovare, senza «errore»', [c.ST.bloodTests.length, /Importati 10 prelievi su 25: riprova con lo stesso file/.test(testo(c.d.getElementById('toast'))), /errore/i.test(testo(c.d.getElementById('toast')))], [10, true, false]);
    c.win.dbq = vero;
    const pc2 = importa(c, csvGrande(25)); await attendi(80);
    atteso('riprova · l\'anteprima salta le 10 date già presenti', [/10 date già presenti, che salto/.test(testo(foglio(c))), !!tasto(c, /^Importa 15$/)], [true, true]);
    tasto(c, /^Importa 15$/).click(); await pc2; await attendi(40);
    atteso('riprova · 25 righe in tutto', c.ST.bloodTests.length, 25);
  }

  // 2c. la scheda compatta con 38 prelievi e 30 valori
  {
    const L = E.leggiCSV(csvGrande(38));
    const righe = L.prelievi.map((p, i) => ({ id: 'c' + i, user_id: U, test_date: p.test_date, donazione: true, fonte: 'csv', esami: p.esami, ...E.inColonne(p.esami) }));
    const b = await pronta(fixture(righe), { locale: { zt_v5: '1' } });   // la veste accesa, com'è sul telefono di Ignazio
    const d = b.d;
    const conta = (s) => d.querySelectorAll('#page-body ' + s).length;
    atteso('panoramica · 8 card (le chiavi di PANORAMICA presenti), ognuna con l\'ultimo valore, l\'unità, la tendenza', [conta('.an-pan-card'), [...d.querySelectorAll('.an-pan-nome')].map(testo), conta('.an-pan-card .an-tend'), conta('.an-pan-card .an-pan-num small')], [8, ['Emoglobina', 'Ferritina', 'Glicemia a digiuno', 'Colesterolo LDL', 'Colesterolo HDL', 'Trigliceridi', 'Piastrine', 'Globuli bianchi'], 8, 8]);
    const fer = [...d.querySelectorAll('.an-pan-card')].find(c => /Ferritina/.test(testo(c)));
    atteso('panoramica · ferritina sotto la fascia: il segno «basso» e il colore', [fer.classList.contains('an-fuori'), testo(fer.querySelector('.an-segno')), fer.querySelector('.an-tend').classList.contains('an-tend-giu')], [true, 'basso', true]);
    atteso('chiusa · 5 famiglie chiuse, nessuna riga di valore, nessun grafico, «Per data» a 5 righe + «Mostra tutte · 33 in più», la tabella chiusa', [conta('.an-fam-testa'), [...d.querySelectorAll('.an-fam-testa .b5-log-data')].map(testo), conta('.an-val-riga'), conta('svg.an-grafico'), conta('.an-riga'), /Mostra tutte.*33 in più/.test(testo(d.querySelector('.an-mostra-tutte'))), conta('.an-tab-testa'), conta('table.an-tab')], [5, ['Ferro', 'Ematologia', 'Lipidi e glicemia', 'Fegato e reni', 'Altro'], 0, 0, 5, true, 1, 0]);
    atteso('chiusa · il conto di ogni famiglia', [...d.querySelectorAll('.an-fam-testa .b5-log-valori')].map(testo), ['1 valore · 1 fuori fascia', '19 valori · 1 fuori fascia', '6 valori', '3 valori', '1 valore']);
    atteso('chiusa · la pagina è corta: meno di 60 tasti e meno di 400 elementi', [conta('button') < 60, pagina(b).querySelectorAll('*').length < 400], [true, true]);
    // la famiglia si apre, il grafico al tocco
    b.win.apriFamiglia('ematologia'); await attendi(10);
    atteso('ematologia aperta · 19 righe compatte, nome, ultimo valore con l\'unità come scritta, la data; nessun grafico finché non si tocca', [conta('.an-val-riga'), /^Emoglobina.*28 mar 26$/.test(testo(d.querySelector('.an-val-riga .an-val-nome'))), /×10⁶\/µL/.test(testo([...d.querySelectorAll('.an-val-riga')].find(r => /Globuli rossi/.test(testo(r))).querySelector('.an-val-num'))), conta('svg.an-grafico')], [19, true, true, 0]);
    b.win.apriValore('piastrine', 'fam'); await attendi(10);
    const g = d.querySelector('.an-val-grafico');
    atteso('piastrine toccate · un grafico con 38 punti, la fascia del referto, l\'ultimo fuori', [conta('svg.an-grafico'), g.querySelectorAll('circle.an-punto').length, g.querySelectorAll('circle.an-punto-fuori').length, /Fascia 156–373 ×10³\/µL · referto · 38 misure dal/.test(testo(g))], [1, 38, 1, true]);
    b.win.apriValore('piastrine', 'fam'); await attendi(10);
    atteso('piastrine di nuovo · il grafico si chiude', conta('svg.an-grafico'), 0);
    b.win.apriValore('ferritina', 'pan'); await attendi(10);
    atteso('card ferritina toccata · il grafico sotto la panoramica', [conta('.an-pan-grafico svg.an-grafico'), d.querySelector('.an-pan-card.an-pan-aperta') && testo(d.querySelector('.an-pan-card.an-pan-aperta .an-pan-nome'))], [1, 'Ferritina']);
    // per data
    d.querySelector('.an-mostra-tutte').click(); await attendi(10);
    atteso('mostra tutte · 38 righe per data, chiuse', [conta('.an-riga'), conta('.an-dettaglio'), conta('.an-mostra-tutte')], [38, 0, 0]);
    b.win.apriAnalisi('c3'); await attendi(20);
    atteso('una data aperta · il dettaglio coi 30 valori e la differenza dalla volta prima, Pirsi chiamato una volta', [conta('.an-dettaglio'), conta('.an-dettaglio .an-valore'), b.chiamateAI.length], [1, 30, 1]);
    // la tabella
    d.querySelector('.an-tab-testa').click(); await attendi(10);
    const tab = d.querySelector('table.an-tab');
    atteso('tabella aperta · 30 righe × 38 date, le date in colonna dalla più recente, la colonna del nome con l\'unità, i fuori fascia segnati', [tab.querySelectorAll('tbody tr').length, tab.querySelectorAll('thead th').length, testo(tab.querySelector('thead th:nth-child(2)')), /^Ferritina.*ng\/mL$/.test(testo(tab.querySelector('tbody th'))), tab.querySelectorAll('td.an-fuori').length >= 2, !!d.querySelector('.an-tab-scroll')], [30, 39, '28 mar 26', true, true, true]);
    b.chrome = { html: b.win.document };
    // l'altezza in Chrome vero: la scheda chiusa con 38 prelievi deve stare sotto i 2 400 px a 390 px di larghezza
    const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if(fs.existsSync(CHROME)){
      b.ST.analisiFamiglie = {}; b.ST.analisiValore = null; b.ST.analisiTutte = false; b.ST.analisiAperta = null; b.ST.analisiTabella = false;
      for(let i = 0; i < 500 && !d.getElementById('app').classList.contains('visible'); i++) await attendi(10);
      Object.defineProperty(b.win, 'innerWidth', { value:390, configurable:true }); b.win.updateNavVisibility();
      b.win.showPage('body'); await attendi(200); b.win.renderBody(); await attendi(50);
      const doc = b.win.document.cloneNode(true);
      doc.querySelectorAll('script').forEach(s => s.remove());
      doc.querySelectorAll('link[rel=stylesheet]').forEach(l => { if(/stile\.css/.test(l.getAttribute('href') || '')) l.setAttribute('href', 'stile.css'); });
      doc.querySelectorAll('style').forEach(s => { if(s.textContent.includes('--font-sans')) s.replaceWith(Object.assign(doc.createElement('link'), { rel:'stylesheet', href:'stile.css' })); });
      const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-body170-'));
      fs.copyFileSync(path.join(__dirname, '..', '..', 'app', 'stile.css'), path.join(radice, 'stile.css'));
      const SPIA = `<script>addEventListener('load',()=>setTimeout(()=>{document.body.style.width='390px';document.body.style.margin='0';const p=document.getElementById('page-body');const r={alta:Math.round(p.getBoundingClientRect().height),larga:p.scrollWidth,tab:(e=>e?getComputedStyle(e).position:null)(document.querySelector('.an-tab th[scope=row]')),pan:(e=>e?Math.round(e.getBoundingClientRect().height):null)(document.querySelector('.an-pan')),oltre:[...p.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>391&&e.offsetParent!==null).slice(0,6).map(e=>(e.id||e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().right))};document.body.setAttribute('data-misura',JSON.stringify(r));},300));</script>`;
      for(const [nome, html] of [['chiusa', '<!doctype html>\n' + doc.documentElement.outerHTML]]) fs.writeFileSync(path.join(radice, nome + '.html'), html.replace('</body>', SPIA + '</body>'));
      const chrome = (args) => new Promise(ok => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=6000', ...args], { maxBuffer: 64 * 1024 * 1024 }, (e, out) => ok(out || '')));
      const m = (await chrome(['--window-size=390,844', '--dump-dom', 'file://' + path.join(radice, 'chiusa.html')])).match(/data-misura="([^"]*)"/);
      const mis = m ? JSON.parse(m[1].replace(/&quot;/g, '"')) : null;
      atteso('Chrome · la scheda chiusa con 38 prelievi è alta meno di 2 400 px con il corpo a 390 px, niente oltre il bordo', mis && [mis.alta < 2400, mis.larga <= 390, mis.oltre.length, mis.pan > 100], [true, true, 0, true]);
      console.log(`  --  altezza della scheda chiusa in Chrome: ${mis && mis.alta} px`, mis && mis.oltre.length ? 'oltre il bordo: ' + mis.oltre.join(' · ') : '');
      fs.rmSync(radice, { recursive: true, force: true });
    } else console.log('  --  Chrome non trovato: la misura dell\'altezza è saltata');
  }

  console.log(ko ? `\n${ko} controlli KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
