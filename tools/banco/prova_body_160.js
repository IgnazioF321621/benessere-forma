// Body 160 (2 novembre 2026): le analisi del sangue, scheda «Analisi» del Body.
// Ignazio: caricare il PDF delle analisi, anche vecchie, per avere uno storico (comprese le donazioni) e dare i
// dati al coach. Parte 1: il vocabolario (shared/esami.js), senza jsdom. Parte 2: l'app vera: la quinta scheda,
// lo stato vuoto, l'elenco per data col segno donazione e il conto, il dettaglio coi valori e le fasce (referto o
// tabella con la fonte), la lettura di Pirsi in due righe (una chiamata, poi dal telefono), il referto letto dal
// Worker (finto) e il foglio: data, righe correggibili, donazione, «Salva» con la data del prelievo (upsert su
// persona+data, colonne + esami); «Aggiungi a mano», «Modifica», «Elimina», il segno donazione; l'andamento con
// la fascia; le Impostazioni che rimandano; il check che scrive con fonte 'check'; il ritratto col rigo delle
// analisi; il consenso spento (nessun foglio).
//   node tools/banco/prova_body_160.js
process.env.TZ = 'Europe/Rome';
const E = require('../../shared/esami.js');
const R = require('../../shared/ritratto.js');
const { boot } = require('./banco');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ko && !ok) {} if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(84), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const testo = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
const attendi = (ms) => new Promise(r => setTimeout(r, ms));
const U = 'u1', OGGI = '2026-11-02', NOW = { now: '2026-11-02T09:00:00' };

// ── Parte 1: il vocabolario ──
{
  atteso('vocabolario · i nomi dei laboratori → chiave', ['Colesterolo HDL', 'Colesterolo totale', 'HDL-Colesterolo', 'Glucosio', 'Ferro', 'Emoglobina (Hb)', 'Vitamina D (25-OH)', 'ALT (GPT)', 'Transaminasi GPT', 'Mg', 'MCV'].map(E.riconosci), ['hdl', 'colesterolo_tot', 'hdl', 'glicemia', 'sideremia', 'emoglobina', 'vitamina_d', 'alt', 'alt', 'magnesio', 'mcv']);   // MCV è una chiave dal Body 170
  atteso('vocabolario · col trattino e con la barra (revisione): Colesterolo-HDL, Colesterolo-LDL, Colesterolo non-HDL', ['Colesterolo-HDL', 'Colesterolo-LDL', 'Colesterolo non-HDL', 'Colesterolo HDL/LDL rapporto'].map(E.riconosci), ['hdl', 'ldl', null, null]);
  atteso('vocabolario · un altro esame con dentro lo stesso nome non prende la chiave (MCH ha la sua, dal Body 170)', ['Emoglobina corpuscolare media (MCH)', 'Capacità totale legante il ferro (TIBC)', 'Creatinina clearance', 'Testosterone libero', 'Magnesio eritrocitario', 'Glucosio (urine)', 'Saturazione della transferrina'].map(E.riconosci), ['mch', null, null, null, null, null, null]);
  atteso('vocabolario · valida: la seconda riga con la stessa chiave resta, senza chiave', E.valida({ riconosciuto: true, esami: [{ nome: 'Colesterolo totale', valore: 189 }, { nome: 'Colesterolo-HDL', valore: 58 }, { nome: 'Emoglobina', valore: 15 }, { nome: 'Emoglobina corpuscolare media', valore: 30 }, { nome: 'Sideremia', valore: 90 }, { nome: 'Ferro', valore: 91 }] }).esami.map(x => (x.chiave || '-') + ':' + x.valore), ['colesterolo_tot:189', 'hdl:58', 'emoglobina:15', 'mch:30', 'sideremia:90', '-:91']);
  atteso('vocabolario · «< 5» non è un valore', [E.numero('< 5'), E.numero('>100'), E.numero('5')], [null, null, 5]);
  atteso('colonne · solo con l\'unità attesa o equivalente: nmol/L e mmol/L restano fuori, µg/L e mUI/L entrano', [E.inColonne([{ chiave: 'vitamina_d', valore: 75, unita: 'nmol/L' }, { chiave: 'glicemia', valore: 5.1, unita: 'mmol/L' }, { chiave: 'ferritina', valore: 80, unita: 'µg/L' }, { chiave: 'tsh', valore: 2.1, unita: 'mUI/L' }, { chiave: 'creatinina', valore: 0.9, unita: '' }]), E.unitaCombacia(E.esame('alt'), 'UI/L')], [{ hemoglobin: null, ferritin: 80, glucose: null, cholesterol_tot: null, hdl: null, triglycerides: null, creatinine: 0.9, alt: null, vitamin_d: null, vitamin_b12: null, tsh: 2.1 }, true]);
  atteso('vocabolario · le 11 colonne di blood_tests hanno tutte una chiave', E.ESAMI.filter(e => e.colonna).map(e => e.colonna).sort(), ['alt', 'cholesterol_tot', 'creatinine', 'ferritin', 'glucose', 'hdl', 'hemoglobin', 'triglycerides', 'tsh', 'vitamin_b12', 'vitamin_d']);
  atteso('vocabolario · ogni esame ha fascia e fonte', E.ESAMI.every(e => e.fascia && e.fonte), true);
  atteso('fascia · per sesso (ferritina M/F, senza sesso la più larga), solo massimo, solo minimo', [E.fascia('ferritina', 'M'), E.fascia('ferritina', 'F').min, E.fascia('ferritina', null), E.mostraFascia(E.fascia('colesterolo_tot')), E.mostraFascia(E.fascia('hdl', 'F'))], [{ min: 30, max: 300, fonte: E.fascia('ferritina', 'M').fonte }, 15, { min: 15, max: 300, fonte: E.fascia('ferritina').fonte }, '≤ 200', '≥ 50']);
  atteso('fascia · quella del referto vince sulla tabella', [E.fasciaPer({ chiave: 'ferritina', valore: 28, rif_min: 30, rif_max: 400 }, 'M'), E.fasciaPer({ chiave: 'ferritina', valore: 28 }, 'M').fonte === 'referto'], [{ min: 30, max: 400, fonte: 'referto' }, false]);
  atteso('fascia · Body 171: per l\'HDL conta solo il minimo, il massimo del referto (40–60) non si guarda e 65 non è fuori; la fascia mostrata è «≥ 40»; per la ferritina il massimo del referto resta', [E.fasciaPer({ chiave: 'hdl', valore: 65, rif_min: 40, rif_max: 60 }, 'M'), E.fuoriFascia(65, E.fasciaPer({ chiave: 'hdl', valore: 65, rif_min: 40, rif_max: 60 }, 'M')), E.mostraFascia(E.fasciaPer({ chiave: 'hdl', valore: 65, rif_min: 40, rif_max: 60 }, 'M')), E.fasciaPer({ chiave: 'hdl', valore: 65, rif_max: 60 }, 'M'), E.fuoriFascia(35, E.fasciaPer({ chiave: 'hdl', valore: 35, rif_min: 40, rif_max: 60 }, 'M')), E.fuoriFascia(420, E.fasciaPer({ chiave: 'ferritina', valore: 420, rif_min: 30, rif_max: 400 }, 'M'))], [{ min: 40, max: null, fonte: 'referto' }, null, '≥ 40', { min: 40, max: null, fonte: E.fascia('hdl', 'M').fonte }, 'basso', 'alto']);
  atteso('Body 172 · NRBC non lo vogliamo: «NRBC %», «NRBC #», «NRBC%», «Eritroblasti» si scartano in valida (referto, CSV e foglio a mano) e daRiga non li mostra dalle righe vecchie; «Globuli rossi» resta', [E.valida({ riconosciuto: true, esami: [{ nome: 'NRBC %', valore: 0.1, unita: '%' }, { nome: 'NRBC #', valore: 0.01 }, { nome: 'NRBC%', valore: 0.2 }, { nome: 'Eritroblasti', valore: 1 }, { nome: 'Globuli rossi', valore: 5.1 }] }).esami.map(x => x.nome), E.daRiga({ esami: [{ nome: 'NRBC %', valore: 0.1 }, { nome: 'Emoglobina', chiave: 'emoglobina', valore: 15 }] }).map(x => x.nome), E.leggiCSV('Data,Emoglobina (13–17 g/dL),NRBC % (0–0.2 %)\n10/05/25,15.2,0.1\n').prelievi[0].esami.map(x => x.nome), E.leggiCSV('Data,Emoglobina (13–17 g/dL),NRBC % (0–0.2 %)\n10/05/25,15.2,0.1\n').nomi_ignoti], [['Globuli rossi'], ['Emoglobina'], ['Emoglobina'], []]);
  atteso('fuori fascia · basso, alto, dentro, senza fascia', [E.fuoriFascia(28, E.fascia('ferritina', 'M')), E.fuoriFascia(220, E.fascia('colesterolo_tot')), E.fuoriFascia(92, E.fascia('glicemia')), E.fuoriFascia(5, null)], ['basso', 'alto', null, null]);
  const v = E.valida({ riconosciuto: true, data_prelievo: '12/10/2026', esami: [{ nome: 'Ferritina', valore: '28,5', unita: 'ng/mL', rif_min: 30, rif_max: 400 }, { nome: 'Colesterolo HDL', chiave: 'colesterolo_tot', valore: 58, unita: 'mg/dL' }, { nome: 'Ferritina', valore: 1 }, { nome: 'MCV', valore: 88, unita: 'fL' }, { nome: 'x', valore: 'abc' }], note: 'ok' });
  atteso('valida · data, virgola, nome che vince sulla chiave, doppione senza chiave, non numero via', [v.data_prelievo, v.esami.map(x => x.chiave), v.esami[0].valore, v.letti], ['2026-10-12', ['ferritina', 'hdl', null, 'mcv'], 28.5, 4]);
  atteso('colonne · dalle chiavi riconosciute', [E.inColonne(v.esami).ferritin, E.inColonne(v.esami).hdl, E.inColonne(v.esami).glucose], [28.5, 58, null]);
  const vecchia = { test_date: '2026-05-10', ferritin: 80, glucose: 92, tsh: null };
  atteso('daRiga · una riga del check (solo colonne) dà le righe con unità del vocabolario', E.daRiga(vecchia).map(x => x.chiave + ' ' + x.valore + ' ' + x.unita), ['ferritina 80 ng/mL', 'glicemia 92 mg/dL']);
  atteso('serie · dal più vecchio al più recente, colonne ed esami insieme', E.serie([{ test_date: '2026-10-12', esami: v.esami }, vecchia], 'ferritina'), [{ date: '2026-05-10', valore: 80, unita: 'ng/mL' }, { date: '2026-10-12', valore: 28.5, unita: 'ng/mL' }]);
  atteso('riassunto · per il coach, col segno fuori fascia e la fascia', E.riassunto({ esami: v.esami }, 'M'), 'Ferritina 28,5 ng/mL (basso, fascia 30–400) · Colesterolo HDL 58 mg/dL · Ferritina 1 · MCV 88 fL');
  atteso('data · formati', [E.dataPrelievo('2026-10-12'), E.dataPrelievo('12-10-2026'), E.dataPrelievo('3.4.25'), E.dataPrelievo('2026-02-30'), E.dataPrelievo('')], ['2026-10-12', '2026-10-12', '2025-04-03', null, null]);
  const riga = R.build({ profile: { sex: 'M' }, today: OGGI, blood: { test_date: '2026-10-12', donazione: true, esami: v.esami } });
  atteso('ritratto · il rigo delle analisi, senza nome, con «parlarne col medico»', [/Analisi del sangue del 12 ottobre \(per una donazione di sangue\): Ferritina 28,5 ng\/mL \(basso, fascia 30–400\)/.test(riga), /parlarne col medico/.test(riga), /Ignazio/.test(riga)], [true, true, false]);
  atteso('ritratto · senza analisi niente rigo', /Analisi del sangue/.test(R.build({ profile: { sex: 'M' }, today: OGGI, blood: null })), false);
}

// ── Parte 2: l'app ──
const RIGHE = [
  { id: 'b1', user_id: U, test_date: '2026-10-12', donazione: true, fonte: 'lettura', esami: [{ nome: 'Ferritina', chiave: 'ferritina', valore: 28, unita: 'ng/mL', rif_min: 30, rif_max: 400 }, { nome: 'Emoglobina', chiave: 'emoglobina', valore: 15.1, unita: 'g/dL' }, { nome: 'MCV', chiave: null, valore: 88, unita: 'fL' }], ferritin: 28, hemoglobin: 15.1 },
  { id: 'b2', user_id: U, test_date: '2026-05-10', donazione: false, fonte: 'check', ferritin: 80, hemoglobin: 14.8, glucose: 92 },
  { id: 'b3', user_id: U, test_date: '2026-01-20', donazione: true, fonte: 'check', ferritin: 95 },
];
function fixture(righe){
  return {
    __sessione: { user: { id: U, email: 'a@b.it' } },
    profiles: [{ id: U, first_name: 'A', sex: 'M', m2_skipped: true, unit: 'kg', obiettivo: 'mantenimento', target_kcal: 2000, target_protein: 120, target_carbs: 200, target_fat: 60, weight_kg: 72 }],
    blood_tests: righe.map(r => ({ ...r })), meals: [], meal_items: [], fasting_days: [], supplements: [], supplements_log: [], supplement_packages: [], supplement_package_items: [], weight_logs: [], body_logs: [],
    body_checks: [], body_measurements: [], workouts: [], training_logs: [], training_notes: [], schede_utente: [], daily_log: [], rilevazioni: [], coach_proposals: [], weekly_pictures: [], fitdays_letture: [], push_iscrizioni: [],
  };
}
async function pronta(tables, opts){
  const b = boot(tables, { ...NOW, ...(opts || {}) });
  await b.avviato;
  const ST = b.win.eval('ST'); ST.user = { id: U, email: 'a@b.it' }; ST.profile = tables.profiles[0]; b.win.applyProfile(ST.profile);
  b.win.callAI = async () => 'Ferritina scesa da 80 a 28 ng/mL, sotto la fascia: parlane col medico. Emoglobina stabile.';
  b.win.fitdaysPreparaFile = async (file) => ({ mime: file.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg', base64: 'QUJD'.repeat(40) });
  b.supa.auth.getSession = async () => ({ data: { session: { user: { id: U }, access_token: 'token-finto' } } });
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
const file = (b, tipo = 'application/pdf') => new b.win.File(['x'], 'referto.pdf', { type: tipo });
const LETTURA = { riconosciuto: true, data_prelievo: '2026-10-30', esami: [{ nome: 'Ferritina', chiave: 'ferritina', valore: 41, unita: 'ng/mL', rif_min: 30, rif_max: 400 }, { nome: 'Glicemia', chiave: 'glicemia', valore: 101, unita: 'mg/dL', rif_min: 70, rif_max: 99 }, { nome: 'MCV', chiave: null, valore: 89, unita: 'fL' }], letti: 3, note: '', meta: { model: 'gemini-3.1-flash-lite', prompt_version: '2026-11-02' } };

(async () => {
  // 2a. la quinta scheda e lo stato vuoto
  {
    const b = await pronta(fixture([]));
    const seg = [...b.d.querySelectorAll('#page-body nav button')].map(x => testo(x));
    atteso('scheda · cinque schede, Analisi è l\'ultima', seg, ['Misure', 'Tendenza', 'Check', 'Energia', 'Analisi']);
    const h = testo(pagina(b));
    atteso('vuoto · il conto dice nessuna donazione, i due tasti ci sono, lo stato vuoto invita', [/nessuna donazione/.test(h), /Carica analisi \(PDF o foto\)/.test(h), /Aggiungi a mano/.test(h), /Nessuna analisi ancora/.test(h), b.d.getElementById('an-file').getAttribute('accept')], [true, true, true, true, 'image/*,application/pdf']);
    atteso('vuoto · mai la parola «errore»', /errore/i.test(h), false);
  }

  // 2b. l'elenco, il dettaglio, le fasce, Pirsi, la donazione
  {
    const b = await pronta(fixture(RIGHE));
    let h = testo(pagina(b));
    atteso('elenco · tre righe per data, dalla più recente, le donazioni segnate, il conto', [[...b.d.querySelectorAll('.an-riga')].map(x => testo(x.querySelector('.b5-log-data'))), /2 donazioni/.test(h)], [['lun 12 ott donazione', 'dom 10 mag', 'mar 20 gen donazione'], true]);
    atteso('elenco · la riga dice quanti valori e quanti fuori fascia', testo(b.d.querySelector('.an-riga .b5-log-valori')), '3 valori · 1 fuori fascia');
    const chiamate = [];
    b.win.callAI = async (p) => { chiamate.push(p); return 'Ferritina scesa da 80 a 28 ng/mL, sotto la fascia: parlane col medico. Emoglobina stabile.'; };
    b.win.apriAnalisi('b1'); await attendi(30);
    h = testo(pagina(b));
    atteso('dettaglio · i valori con l\'unità come scritta, la fascia del referto, il segno basso, la differenza dalla volta prima', [/Ferritina.*fascia 30–400.*28 ng\/mL.*basso.*−52/.test(h), /Emoglobina.*fascia 13,5–17,5 · valori comuni dei laboratori italiani.*15,1 g\/dL.*\+0,3/.test(h), /MCV.*88 fL/.test(h), /Valori da rivedere con il tuo medico/.test(h)], [true, true, true, true]);
    atteso('Pirsi · una chiamata all\'apertura, col ritratto, le due analisi, senza nome, le regole', [chiamate.length, /Sei Pirsi/.test(chiamate[0]), /ANALISI DI ADESSO: Ferritina 28 ng\/mL \(basso, fascia 30–400\)/.test(chiamate[0]), /VOLTA PRIMA: .*Ferritina 80 ng\/mL/.test(chiamate[0]), /non fare diagnosi/.test(chiamate[0]), /parlarne col medico/.test(chiamate[0]), /Ignazio|\bA\b/.test(chiamate[0])], [1, true, true, true, true, true, false]);
    atteso('Pirsi · il testo è nel dettaglio e sul telefono', [/Ferritina scesa da 80 a 28/.test(h), Object.keys(JSON.parse(b.win.localStorage.getItem('zt_analisi_pirsi_' + U))).length], [true, 1]);
    b.win.apriAnalisi('b1'); b.win.apriAnalisi('b1'); await attendi(30);
    atteso('Pirsi · riaperta: nessuna chiamata in più', chiamate.length, 1);
    // la prima analisi di tutte: niente «volta prima»
    b.win.apriAnalisi('b3'); await attendi(30);
    atteso('Pirsi · la prima analisi: il prompt dice che non c\'è una volta prima', [chiamate.length, /Non c'è una volta prima/.test(chiamate[1]), /VOLTA PRIMA/.test(chiamate[1])], [2, true, false]);
    // senza rete all'apertura: resta il tasto, il tocco chiama
    b.win.senzaRete = () => true;
    b.win.apriAnalisi('b2'); await attendi(30);
    atteso('Pirsi · senza rete all\'apertura: il tasto «Cosa è cambiato?», nessuna chiamata', [chiamate.length, /Cosa è cambiato\?/.test(testo(pagina(b)))], [2, true]);
    b.win.senzaRete = () => false;
    await b.win.pirsiAnalisi('b2', true); await attendi(10);
    atteso('Pirsi · dal tocco si chiama', chiamate.length, 3);
    // il coach che non risponde: il tasto resta, un avviso senza «errore»
    b.win.callAI = async () => { throw Object.assign(new Error('x'), { aiKind: 'network' }); };
    b.win.localStorage.removeItem('zt_analisi_pirsi_' + U); b.ST.analisiPirsi = {};
    await b.win.pirsiAnalisi('b2', true); await attendi(10);
    atteso('Pirsi · coach muto: il tasto resta, toast senza «errore»', [/Cosa è cambiato\?/.test(testo(pagina(b))), /errore/i.test(testo(b.d.getElementById('toast')))], [true, false]);
    // la donazione
    await b.win.toggleDonazione('b2'); await attendi(10);
    const up = scritture(b, 'update');
    atteso('donazione · «Segna come donazione» scrive e il conto sale a 3', [up.length, up[0].payload, up[0].filters, /3 donazioni/.test(testo(pagina(b)))], [1, { donazione: true }, [['eq', 'id', 'b2'], ['eq', 'user_id', U]], true]);
    await b.win.toggleDonazione('b2'); await attendi(10);
    atteso('donazione · si toglie: 2', [scritture(b, 'update').pop().payload, /2 donazioni/.test(testo(pagina(b)))], [{ donazione: false }, true]);
    // i valori (Body 170): le famiglie chiuse, il grafico si apre toccando il valore
    atteso('valori · le famiglie Ferro ed Ematologia chiuse, nessun grafico', [[...b.d.querySelectorAll('.an-fam-testa .b5-log-data')].map(x => testo(x)), b.d.querySelectorAll('.an-val-riga').length, b.d.querySelectorAll('svg.an-grafico').length], [['Ferro', 'Ematologia', 'Lipidi e glicemia'], 0, 0]);   // MCV salvato senza chiave: si riconosce al disegno
    b.win.apriFamiglia('ferro'); b.win.apriValore('ferritina', 'fam'); await attendi(10);
    const graf = b.d.querySelector('.an-val-grafico');
    atteso('valori · ferritina aperta: 3 punti, l\'ultimo fuori fascia, la fascia del referto sotto', [b.d.querySelectorAll('.an-val-riga').length, graf.querySelectorAll('circle.an-punto').length, graf.querySelectorAll('circle.an-punto-fuori').length, !!graf.querySelector('rect.an-fascia'), /Fascia 30–400 ng\/mL · referto · 3 misure/.test(testo(graf))], [1, 3, 1, true, true]);
    // eliminare
    b.win.chiediConferma = async () => true;
    await b.win.eliminaAnalisi('b3'); await attendi(10);
    const del = scritture(b, 'delete');
    atteso('elimina · una cancellazione per id e persona, riga via, conto 1', [del.length, del[0].filters, b.d.querySelectorAll('.an-riga').length, /1 donazione/.test(testo(pagina(b)))], [1, [['eq', 'id', 'b3'], ['eq', 'user_id', U]], 2, true]);
  }

  // 2c. il referto letto dal Worker e il foglio
  {
    const b = await pronta(fixture(RIGHE));
    const chiamate = [];
    b.win.fetch = async (url, opts) => { chiamate.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({ ok: true, lettura: LETTURA }) }; };
    const fogli = [];
    b.win.chiediConferma = async (t) => { fogli.push(t); return true; };
    const input = b.d.getElementById('an-file');
    Object.defineProperty(input, 'files', { value: [file(b)], configurable: true });
    const p = b.win.leggiReferto(input);
    await attendi(60);
    atteso('referto · nessun foglio di consenso (spento con un utente solo), una chiamata al Worker con solo mime e file', [fogli.length, chiamate.length, chiamate[0].url.endsWith('/esami-report'), Object.keys(chiamate[0].body).sort()], [0, 1, true, ['data', 'mime', 'user_id']]);
    atteso('referto · il foglio: titolo, data del prelievo, tre righe, donazione spenta', [!!foglio(b), /Analisi lette da Pirsi/.test(testo(foglio(b))), b.d.getElementById('an-data').value, b.d.querySelectorAll('.an-foglio-riga').length, b.d.querySelector('.an-f-donazione').getAttribute('aria-checked')], [true, true, '2026-10-30', 3, 'false']);
    // correggere un valore, togliere una riga, aggiungere una riga, segnare la donazione
    b.d.querySelector('.an-foglio-riga[data-i="1"] .an-f-valore').value = '98';
    b.d.querySelector('[data-togli="2"]').click();
    b.d.querySelector('.an-f-aggiungi').click();
    const ultima = b.d.querySelector('.an-foglio-riga:last-child');
    ultima.querySelector('.an-f-nome').value = 'Vitamina D'; ultima.querySelector('.an-f-valore').value = '34,2'; ultima.querySelector('.an-f-unita').value = 'ng/ml';
    b.d.querySelector('.an-f-donazione').click();
    tasto(b, /^Salva$/).click();
    const salvata = await p; await attendi(30);
    const up = scritture(b, 'upsert');
    atteso('salva · un upsert su persona+data, con le colonne dalle chiavi, tutte le righe in esami, fonte lettura, donazione', [up.length, up[0].upsertOpts.onConflict, up[0].payload.test_date, up[0].payload.ferritin, up[0].payload.glucose, up[0].payload.vitamin_d, up[0].payload.esami.map(e => e.chiave + ':' + e.valore + ':' + e.unita), up[0].payload.fonte, up[0].payload.donazione, up[0].payload.prompt_version], [1, 'user_id,test_date', '2026-10-30', 41, 98, 34.2, ['ferritina:41:ng/mL', 'glicemia:98:mg/dL', 'vitamina_d:34.2:ng/ml'], 'lettura', true, '2026-11-02']);
    atteso('salva · il foglio si chiude, la riga nuova è aperta in cima, il conto sale', [!!foglio(b), salvata, testo(b.d.querySelector('.an-riga .b5-log-data')), b.ST.analisiAperta != null, /3 donazioni/.test(testo(pagina(b)))], [false, undefined, 'ven 30 ott donazione', true, true]);
    // senza data: il foglio resta e lo dice
    const p2 = b.win.aggiungiAnalisiAMano(); await attendi(30);
    b.d.querySelector('.an-f-aggiungi').click();
    const r1 = b.d.querySelector('.an-foglio-riga:last-child'); r1.querySelector('.an-f-nome').value = 'TSH'; r1.querySelector('.an-f-valore').value = '2,1'; r1.querySelector('.an-f-unita').value = 'µUI/mL';
    tasto(b, /^Salva$/).click(); await attendi(20);
    atteso('a mano · senza data il foglio resta e dice cosa manca', [!!foglio(b), testo(b.d.getElementById('an-foglio-err'))], [true, 'Scrivi la data del prelievo.']);
    b.d.getElementById('an-data').value = '2027-01-01';
    tasto(b, /^Salva$/).click(); await attendi(20);
    atteso('a mano · data nel futuro rifiutata', testo(b.d.getElementById('an-foglio-err')), 'La data del prelievo non può essere nel futuro.');
    b.d.getElementById('an-data').value = '2026-11-01';
    r1.querySelector('.an-f-valore').value = 'due';
    tasto(b, /^Salva$/).click(); await attendi(20);
    atteso('a mano · un valore che non è un numero rifiutato', /non è un numero/.test(testo(b.d.getElementById('an-foglio-err'))), true);
    b.d.getElementById('an-data').value = '2026-10-12'; r1.querySelector('.an-f-valore').value = '2,1';
    tasto(b, /^Salva$/).click(); await attendi(20);
    atteso('a mano · la data di un\'analisi che c\'è già rifiutata', /C'è già un'analisi del lun 12 ott/.test(testo(b.d.getElementById('an-foglio-err'))), true);
    b.d.getElementById('an-data').value = '2026-11-01';
    r1.querySelector('.an-f-valore').value = '2,1';
    tasto(b, /^Salva$/).click(); await p2; await attendi(30);
    const up2 = scritture(b, 'upsert').pop();
    atteso('a mano · salvata con fonte mano, tsh in colonna, la riga in esami', [up2.payload.fonte, up2.payload.tsh, up2.payload.esami, up2.payload.test_date], ['mano', 2.1, [{ nome: 'TSH', chiave: 'tsh', valore: 2.1, unita: 'µUI/mL' }], '2026-11-01']);
    // annullare non scrive
    const n = scritture(b, 'upsert').length;
    const p3 = b.win.aggiungiAnalisiAMano(); await attendi(20);
    tasto(b, /^Annulla$/).click(); const esito = await p3;
    atteso('annulla · niente scritto', [esito, scritture(b, 'upsert').length], [null, n]);
    // modifica con la data cambiata: la riga vecchia si toglie
    const p4 = b.win.modificaAnalisi('b2'); await attendi(20);
    atteso('modifica · il foglio porta la data e le righe della riga del check', [b.d.getElementById('an-data').value, b.d.querySelectorAll('.an-foglio-riga').length, /Modifica le analisi/.test(testo(foglio(b)))], ['2026-05-10', 3, true]);
    b.d.getElementById('an-data').value = '2026-05-11';
    tasto(b, /^Salva$/).click(); await p4; await attendi(30);
    const upM = scritture(b, 'upsert').pop(), delM = scritture(b, 'delete');
    atteso('modifica · upsert sulla data nuova con fonte check e la riga vecchia tolta', [upM.payload.test_date, upM.payload.fonte, upM.payload.ferritin, delM.length, delM[0].filters[0]], ['2026-05-11', 'check', 80, 1, ['eq', 'id', 'b2']]);
    // la scrittura che fallisce: il foglio torna con le righe, niente si perde
    b.tabelle = null;
    const t = b.supa; const rifiuta = () => { t._rifiutaUpsert = true; };
    const vero = b.win.dbq;
    b.win.dbq = async (cosa, chiamata, o) => { if(/salvare le analisi/.test(cosa)) return { data: null, error: { code: '42P10', message: 'no unique constraint' } }; return vero(cosa, chiamata, o); };
    const p5 = b.win.aggiungiAnalisiAMano(); await attendi(20);
    b.d.querySelector('.an-f-aggiungi').click();
    const r5 = b.d.querySelector('.an-foglio-riga:last-child'); r5.querySelector('.an-f-nome').value = 'Zinco'; r5.querySelector('.an-f-valore').value = '88'; r5.querySelector('.an-f-unita').value = 'µg/dL';
    b.d.getElementById('an-data').value = '2026-09-09';
    tasto(b, /^Salva$/).click(); await attendi(40);
    atteso('scrittura fallita · toast senza «errore», il foglio torna con la riga scritta', [/Non sono riuscito a salvare/.test(testo(b.d.getElementById('toast'))), !!foglio(b), b.d.querySelector('.an-foglio-riga .an-f-nome') && b.d.querySelector('.an-foglio-riga .an-f-nome').value, b.d.getElementById('an-data').value], [true, true, 'Zinco', '2026-09-09']);
    b.win.dbq = vero;
    tasto(b, /^Annulla$/).click(); await p5;
    // il Worker che non legge: toast senza «errore», nessun foglio
    b.win.fetch = async () => ({ ok: false, status: 502, json: async () => ({ error: { kind: 'invalid-json' } }) });
    Object.defineProperty(input, 'files', { value: [file(b)], configurable: true });
    await b.win.leggiReferto(input); await attendi(20);
    atteso('Worker muto · toast senza «errore», nessun foglio', [/Non sono riuscito a leggere il referto/.test(testo(b.d.getElementById('toast'))), /errore/i.test(testo(b.d.getElementById('toast'))), !!foglio(b)], [true, false, false]);
    b.win.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, lettura: { riconosciuto: false, esami: [], letti: 0 } }) });
    Object.defineProperty(input, 'files', { value: [file(b)], configurable: true });
    await b.win.leggiReferto(input); await attendi(20);
    atteso('non un referto · lo dice, nessun foglio', [/Non mi sembra un referto/.test(testo(b.d.getElementById('toast'))), !!foglio(b)], [true, false]);
    Object.defineProperty(input, 'files', { value: [file(b, 'text/plain')], configurable: true });
    const prima = chiamate.length;
    await b.win.leggiReferto(input); await attendi(10);
    atteso('file sbagliato · rifiutato prima di chiedere', [/Scegli il PDF o la foto/.test(testo(b.d.getElementById('toast'))), chiamate.length - prima], [true, 0]);
  }

  // 2d. il check scrive o aggiorna con fonte check; il profilo non scrive più esami_sangue; le proposte sugli esami portano qui
  {
    const b = await pronta(fixture([]));
    b.d.getElementById('m2-test-date').value = '2026-11-01';
    b.d.getElementById('m2-bl-ferr').value = '55';
    b.ST.m2 = b.ST.m2 || {};
    b.win.m2GoStep = () => {};
    await b.win.m2SaveBloodTests(); await attendi(10);
    const up = scritture(b, 'upsert');
    atteso('check · s10 scrive con upsert su persona+data e fonte check', [up.length, up[0].upsertOpts.onConflict, up[0].payload.fonte, up[0].payload.ferritin, up[0].payload.test_date], [1, 'user_id,test_date', 'check', 55, '2026-11-01']);
    b.win.openSettingsModal(); b.win.setVai('salute');
    b.d.getElementById('set-fname').value = 'A';
    const n = b.supa._calls.length;
    await b.win.saveSettings(); await attendi(10);
    const upd = b.supa._calls.slice(n).filter(c => c.table === 'profiles' && c.op === 'update');
    atteso('Impostazioni · «Salva» non scrive più esami_sangue', [upd.length >= 1, upd.some(c => 'esami_sangue' in c.payload)], [true, false]);
    atteso('Impostazioni · nessuna funzione della vecchia lista', [typeof b.win.renderEsamiList, typeof b.win.addEsameRow, typeof b.win.toggleBloodTest], ['undefined', 'undefined', 'undefined']);
  }

  console.log(ko ? `\n${ko} controlli KO` : '\ntutto OK');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
