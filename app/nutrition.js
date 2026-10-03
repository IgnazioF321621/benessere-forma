// ═══════════════════════════════════════
// app/nutrition.js — il tab Nutrition (Fondamenta 035, tappa 5, 2 ottobre 2026)
// ═══════════════════════════════════════
// I totali della giornata, le stime AI dei pasti e il consiglio del coach, lo strato dati (pasti,
// integratori, pacchetti, extra, digiuni), Oggi con la registrazione del pasto, Integratori, Analisi,
// il dettaglio del giorno, il Piano, il foglio integratori, il catalogo Nutrilite e l'editor dei
// pacchetti. Spostati qui da zona-tracker.html senza cambiare una riga.
// La pagina lo carica DOPO app/body.js e PRIMA del resto del proprio codice: qui al caricamento
// si dichiarano solo costanti scritte per esteso, niente che usi un nome scritto più avanti nella
// pagina (lo controlla tools/banco/prova_ordine_caricamento.js).

// ═══════════════════════════════════════════════════════════
// STREAK
// ═══════════════════════════════════════════════════════════
let _streakTentativi = 0;
function calcStreak() {
  const keys = Object.keys(ST.db.days).sort().reverse();
  let streak = 0;
  let d = new Date();
  for(let i=0; i<keys.length; i++) {
    const expected = dayKey(d);
    if(keys[i] !== expected) break;
    const day = ST.db.days[keys[i]];
    if(day.fasting || (day.meals && day.meals.length > 0)) streak++;
    else break;
    d.setDate(d.getDate()-1);
  }
  // Fondamenta 100, tappa 4: se la serie arriva al bordo dello storico letto (d e' il primo giorno che
  // non conta, e cade prima della finestra), potrebbe continuare piu' indietro: si legge il resto una
  // volta, in sottofondo, e il numero si ricalcola. Al massimo due tentativi per sessione.
  if(!storicoCopreDal(dayKey(d)) && _streakTentativi < 2) {
    _streakTentativi++;
    caricaStoricoCompleto().then(ok => { if(ok && typeof mostraStreak === 'function') mostraStreak(); });
  }
  return streak;
}

// ═══════════════════════════════════════════════════════════
// BADGE GIORNO PERFETTO
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// COMPUTATIONS
// ═══════════════════════════════════════════════════════════
// Totali della giornata: la logica vive in shared/nutrizione.js e
// la usano anche il quadro settimanale e il Worker. Questi sono involucri che passano ST.
// shared/nutrizione.js: caricato dalla pagina prima di questo script (Fondamenta 035), non più copiato qui.
function _nutriRef(){ return { supps: ST.supps || [], catalog: ST.catalog || [], extrasByDay: ST.extrasByDay }; }
function mealTotals(meals){ return ZTNutrizione.mealTotals(meals); }
function suppTotalsForIds(ids){ return ZTNutrizione.suppTotalsForIds(ids, _nutriRef()); }
function r2(x){return Math.round(x*100)/100;}
// Extra "non standard" dentro rawSuppLogs (nome non più in libreria): catalogo × dose.
function extraSuppsTotals(day) { return ZTNutrizione.extraSuppsTotals(day, _nutriRef()); }
// Extra dall'archivio per giorno ST.extrasByDay (revisione 9 ago 2026: una fonte sola,
// niente doppio conteggio, e i grafici di Analisi vedono anche le calorie passate).
function _extrasV3Totals(day) { return ZTNutrizione.extrasTotals(day, _nutriRef()); }
// Helper unico: totali completi del giorno (pasti + standard supps + extra supps).
function dayTotals(day) { return ZTNutrizione.dayTotals(day, _nutriRef()); }
function activeSupps(){return ST.supps.filter(s=>s.active);}
// Prodotti da MOSTRARE in una giornata: gli attivi, piu' quelli che quel giorno
// sono stati davvero registrati anche se nel frattempo sono stati sospesi.
//
// Debito lasciato dal cantiere Sospendi: sospendere qualcosa gia' spuntato oggi
// ne faceva sparire la scheda mentre le sue calorie restavano — giustamente — nel
// totale, e a schermo non c'era piu' niente che spiegasse quel numero. La cura non
// e' cancellare la registrazione (e' vera) ma continuare a mostrarla, con
// l'etichetta SOSPESO. Il giorno dopo, non essendo piu' registrato, sparisce da se'.
//
// Solo per la VISTA. La registrazione (renderSuppSheet, confirmSuppGroup) resta
// sui soli attivi: un sospeso non si puo' spuntare di nuovo.
function suppsDelGiorno(day){
  const presi = (day && day.suppsTaken) || [];
  return (ST.supps||[]).filter(s => s.active || presi.includes(s.local_id));
}
function suppMonthlyCost(s){
  const multiplier = s.dose_multiplier != null ? parseFloat(s.dose_multiplier) : 1;
  const doseDie    = s.dose_die        != null ? parseFloat(s.dose_die)        : 1;
  return (s.price&&s.doses) ? (s.price/s.doses)*doseDie*multiplier*30 : 0;
}
function suppUnitFromConfezione(confezione, linea) {
  if (!confezione) return 'unità';
  const c = confezione.toLowerCase();
  if (c.includes('stick')) return 'stick';
  if (c.includes('compressa') || c.includes('compresse') || c.includes('cpr')) return 'cpr';
  if (c.includes('capsula') || c.includes('capsule') || c.includes('cps')) return 'cps';
  if (c.includes('bustina') || c.includes('bustine')) return 'bustine';
  if (c.includes('barretta') || c.includes('barrette')) return 'barrette';
  if (c.includes('tavoletta') || c.includes('tavolette')) return 'tavolette';
  if (c.includes('lattina') || c.includes('lattine')) return 'lattine';
  if (c.includes('porzione') || c.includes('porzioni')) return 'porzioni';
  if ((c.includes('cucchiaio') || c.includes(' g')) && (linea||'').toLowerCase().includes('prote')) return 'cucchiai';
  return 'unità';
}
function totalMonthlyCost(){return activeSupps().reduce((a,s)=>a+suppMonthlyCost(s),0);}

// FASE 2: spezza un pasto in ingredienti distinti
async function estimateMealItems(desc) {
  const prompt = `Sei un nutrizionista esperto. Analizza questo pasto e spezzalo in ingredienti distinti, ognuno con peso stimato e macronutrienti.

Pasto: "${desc}"

Regole:
- Identifica ogni alimento o preparazione distinta come ingrediente separato
- Per ogni ingrediente stima un peso ragionevole (porzione adulto attivo) se non specificato
- Le unità ammesse sono: "g" (grammi), "ml" (millilitri), "pz" (pezzi/unità). Per liquidi usa ml. Per frutti interi o uova usa pz (es. 1 mela = 1 pz). Tutto il resto in g.
- I macronutrienti sono espressi in grammi (eccetto kcal in kilocalorie)
- Usa porzioni standard adulto attivo se non specificate

Rispondi SOLO con JSON valido, niente testo extra:
{
  "items": [
    {"name":"string","quantity":number,"unit":"g|ml|pz","kcal":number,"protein":number,"carbs":number,"fat":number}
  ],
  "notes":"nota breve in italiano (max 60 caratteri)"
}`;
  const txt = await callAI(prompt);
  const parsed = JSON.parse(txt.replace(/```json|```/g,'').trim());
  const items = (Array.isArray(parsed.items) ? parsed.items : []).map(it => ({
    name: String(it.name || '').trim() || 'Ingrediente',
    quantity: Math.max(0, Math.round((Number(it.quantity) || 0) * 10) / 10),
    unit: ['g','ml','pz'].includes(it.unit) ? it.unit : 'g',
    kcal: Math.max(0, Math.round((Number(it.kcal) || 0) * 10) / 10),
    protein: Math.max(0, Math.round((Number(it.protein) || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((Number(it.carbs) || 0) * 10) / 10),
    fat: Math.max(0, Math.round((Number(it.fat) || 0) * 10) / 10),
  })).filter(it => it.name);
  return { items, notes: String(parsed.notes || '').slice(0, 60) };
}

// FASE 2: stima macro per UN SINGOLO ingrediente (modalità manuale / ricalcolo riga)
async function estimateSingleItem(name, quantity, unit) {
  const unitLbl = unit === 'g' ? 'grammi' : (unit === 'ml' ? 'millilitri' : 'pezzi');
  const prompt = `Sei un nutrizionista esperto. Stima i macronutrienti per questo singolo alimento.

Alimento: "${name}"
Quantità: ${quantity} ${unitLbl}

Rispondi SOLO con JSON valido, niente testo extra:
{"kcal":number,"protein":number,"carbs":number,"fat":number}

I valori devono essere riferiti alla quantità totale indicata (non a 100g). Adulto attivo.`;
  const txt = await callAI(prompt);
  const parsed = JSON.parse(txt.replace(/```json|```/g,'').trim());
  return {
    kcal: Math.max(0, Math.round((Number(parsed.kcal) || 0) * 10) / 10),
    protein: Math.max(0, Math.round((Number(parsed.protein) || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((Number(parsed.carbs) || 0) * 10) / 10),
    fat: Math.max(0, Math.round((Number(parsed.fat) || 0) * 10) / 10),
  };
}

// Wrapper retrocompat: chiamato dal vecchio logMeal() finché non lo dismettiamo (Fase 4)
async function estimateMacros(desc) {
  const split = await estimateMealItems(desc);
  const tot = split.items.reduce((a,i)=>({
    kcal: a.kcal + i.kcal, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat
  }), {kcal:0,protein:0,carbs:0,fat:0});
  return {
    kcal: Math.max(0, Math.round(tot.kcal * 10) / 10),
    protein: Math.max(0, Math.round(tot.protein * 10) / 10),
    carbs: Math.max(0, Math.round(tot.carbs * 10) / 10),
    fat: Math.max(0, Math.round(tot.fat * 10) / 10),
    notes: split.notes,
    items: split.items,
  };
}
async function getAdvice(consumed, nextMeal, isTomorrow = false) {
  const rem = {
    kcal:    Math.max(0, ST.TARGET.kcal    - consumed.kcal),
    protein: Math.max(0, ST.TARGET.protein - consumed.protein),
    carbs:   Math.max(0, ST.TARGET.carbs   - consumed.carbs),
    fat:     Math.max(0, ST.TARGET.fat     - consumed.fat),
  };
  // Chi è la persona lo dice il ritratto unico (Pirsi 020): profilo, obiettivo, dieta,
  // note di salute, e in più peso vero, seduta di oggi, ciclo, infortunio, settimana.
  const ritratto = await coachRitrattoPronto();

  // Pasti già consumati oggi (max 3 più recenti, ordinati per ora se presente)
  let consumedBlock = '';
  try {
    const day = getDay(todayKey());
    const meals = (day && day.meals) ? day.meals.slice() : [];
    meals.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const recent = meals.slice(-3);
    if (recent.length) {
      const lines = recent.map(m => {
        const slot = m.slot || m.time || 'pasto';
        const desc = (m.description || '').toString().trim();
        return desc ? `- ${slot}: ${desc}` : `- ${slot}`;
      }).join('\n');
      consumedBlock = `PASTI GIÀ CONSUMATI OGGI:\n${lines}`;
    }
  } catch (e) { /* fallback silenzioso */ }

  // ── STEP D.3 R3a (22 mag 2026): blocco INTEGRATORI ASSUNTI OGGI ──
  // Fonte: stesse 3 strutture che dayTotals somma → coerenza quadro qualitativo vs totali numerici.
  //   1. ST.extras (extras Step 2, is_extra=true, già con fallback macro da catalog)
  //   2. day.suppsTaken (pacchetti standard "presi" via ✓, is_extra=false)
  //   3. day.rawSuppLogs filtrati per nomi NON in ST.supps (rari log standalone)
  // Blocco opzionale: omesso se nessun integratore assunto oggi.
  let supplementsBlock = '';
  try {
    const day = getDay(todayKey());
    const lines = [];
    // 1) ST.extras (snapshot DB con fallback catalog applicato in loadExtras)
    (ST.extras || []).forEach(x => {
      if(x.date && x.date !== todayKey()) return; // safety
      const name = (x.name || '').trim() || 'Integratore';
      const kcal = Math.round(Number(x.kcal) || 0);
      const p = Math.round(Number(x.proteine) || 0);
      const c = Math.round(Number(x.carbo) || 0);
      const f = Math.round(Number(x.grassi) || 0);
      lines.push(`- ${name}: ${kcal} kcal · ${p}g P · ${c}g C · ${f}g G`);
    });
    // 2) day.suppsTaken (mirror suppTotalsForIds)
    const taken = (day && day.suppsTaken) ? day.suppsTaken : [];
    taken.forEach(id => {
      const s = (ST.supps || []).find(ss => ss.local_id === id);
      if(!s) return;
      const cat = (ST.catalog || []).find(c => c.nome === s.name);
      const kcal = Math.round(Number(s.kcal ?? cat?.kcal ?? 0));
      const p = Math.round(Number(s.protein ?? cat?.proteine ?? 0));
      const c = Math.round(Number(s.carbs ?? cat?.carbo ?? 0));
      const f = Math.round(Number(s.fat ?? cat?.grassi ?? 0));
      lines.push(`- ${s.name}: ${kcal} kcal · ${p}g P · ${c}g C · ${f}g G`);
    });
    // 3) rawSuppLogs di nomi NON in ST.supps (mirror extraSuppsTotals)
    const standardNames = new Set((ST.supps || []).map(ss => ss.name));
    const raw = (day && day.rawSuppLogs) ? day.rawSuppLogs : [];
    raw.forEach(log => {
      if(standardNames.has(log.name)) return;
      const cat = (ST.catalog || []).find(c => c.nome === log.name);
      const supp = (ST.supps || []).find(ss => ss.name === log.name);
      const baseDose = parseFloat(supp?.dose_die) || 1;
      const logDose = Number(log.dose ?? 1) || 1;
      const mult = logDose / baseDose;
      const kcal = Math.round((Number(supp?.kcal ?? cat?.kcal ?? 0)) * mult);
      const p = Math.round((Number(supp?.protein ?? cat?.proteine ?? 0)) * mult);
      const c = Math.round((Number(supp?.carbs ?? cat?.carbo ?? 0)) * mult);
      const f = Math.round((Number(supp?.fat ?? cat?.grassi ?? 0)) * mult);
      lines.push(`- ${log.name}: ${kcal} kcal · ${p}g P · ${c}g C · ${f}g G`);
    });
    if(lines.length) {
      supplementsBlock = `INTEGRATORI ASSUNTI OGGI (già contati nei macro rimanenti):\n${lines.join('\n')}`;
    }
  } catch (e) { /* fallback silenzioso */ }

  const macroBlock = `MACRO RIMANENTI OGGI:
- Calorie: ${rem.kcal} kcal
- Proteine: ${rem.protein}g
- Carboidrati: ${rem.carbs}g
- Grassi: ${rem.fat}g`;

  const prossimoPastoLine = isTomorrow
    ? `PROSSIMO PASTO: ${nextMeal} (PIANIFICAZIONE PER DOMANI MATTINA — l'utente ha completato tutti i pasti di oggi)`
    : `PROSSIMO PASTO: ${nextMeal}`;

  const istruzioniBase = 'Fornisci UN SOLO suggerimento, concreto e motivato, rispettando rigorosamente dieta e intolleranze. Evita ripetizioni con i pasti già consumati. Se ha già assunto integratori (es. shake o barrette proteiche), tieni conto dell\'apporto: non raccomandare proteine extra se già coperte. Se ci sono note salute, considera alimenti utili (es. ferritina bassa → ferro + vitamina C). Se oggi c\'è o c\'è stata una seduta di allenamento, o se la persona è ferma per infortunio, tienine conto nella scelta del pasto senza fare la predica.';
  const notaTomorrow = isTomorrow
    ? ' Considera il riposo notturno e prepara una colazione che riavvii bene il metabolismo.'
    : '';
  const istruzioniLine = `${istruzioniBase}${notaTomorrow} Italiano, diretto, prosa corrente. NIENTE elenchi puntati. Max 120 parole.`;

  // Compose prompt: header + sezioni non vuote separate da blank line
  const sections = [
    'Sei Pirsi, il coach nutrizionale, esperto in dieta a Zona (40-30-30). Parla sempre in prima persona: non nominarti in terza persona, non firmarti, non ripetere il tuo nome nel testo.\n\nREGISTRO (vale sempre): parli come un amico diretto e schietto. Quando i dati sono buoni lo dici senza enfasi. Quando sono cattivi dici prima il fatto, poi una riga di spinta: il fatto non va nascosto dietro la frase di incoraggiamento, e non ti fermi al fatto nudo. Resta concreto: se hai numeri o eventi reali usa quelli, invece di riempire con frasi motivazionali generiche.',
    'ESEMPIO DI TONO — è un modello di VOCE, non di contenuto. I numeri, gli alimenti e i fatti che contiene sono inventati per l\'esempio: non riutilizzarli, usa solo i dati che trovi in questo prompt.\n"Ti restano 780 kcal e devi ancora cenare. Branzino al forno con quinoa e spinaci, e una spremuta d\'arancia: la ferritina è bassa e la vitamina C ti aiuta ad assorbire il ferro."\nCosa fa questa voce: dice un fatto concreto prima di dare il consiglio; sceglie una cosa invece di offrirne tre; non chiude con una frase motivazionale generica.',
    ritratto,
    macroBlock,
    consumedBlock,
    supplementsBlock,
    prossimoPastoLine,
    istruzioniLine,
  ].filter(Boolean);

  // 700 e non 300: il prompt qui sopra chiede "Max 120 parole", che in italiano
  // costano 200-250 token, e il contenuto misurato su 13 giri e' arrivato a 334.
  // Con 300 la risposta usciva mozzata o vuota 2 volte su 14. Il margine globale
  // del Worker (+600) non c'entra e resta dov'e': qui si muove solo questo budget.
  return await callAI(sections.join('\n\n'), 700);
}

// ── STORICO A FINESTRA (Fondamenta 100, tappa 4, 2 ott 2026) ─────────────────────────────────────
// All'avvio e al rientro si leggono solo gli ultimi STORICO_AVVIO_GIORNI giorni: oltre, lo storico
// serve ad Analisi (3 e 6 mesi, settimane lontane), alla serie di giorni di fila e a chi sfoglia i
// giorni con ‹. Quando serve, caricaStoricoCompleto() legge il resto UNA volta e lo aggiunge a quello
// che c'e'. Da quel momento (ST.storicoCompleto) anche il rinfresco al rientro rilegge tutto, per
// non buttare via quello che l'utente ha gia' aperto.
const STORICO_AVVIO_GIORNI = 90;
function _storicoInizioFinestra() {
  const d = new Date();
  d.setDate(d.getDate() - STORICO_AVVIO_GIORNI);
  return dayKey(d);
}
// Primo giorno certamente in memoria: serve a chi deve sapere se un intervallo e' coperto.
function storicoCopreDal(chiave) {
  if(ST.storicoCompleto) return true;
  return chiave >= (ST.storicoDa || _storicoInizioFinestra());
}
let _storicoRestoInCorso = null;
function caricaStoricoCompleto() {
  if(ST.storicoCompleto) return Promise.resolve(true);
  if(!_storicoRestoInCorso) {
    _storicoRestoInCorso = (async () => {
      try {
        const [giorniOk, extraOk] = await Promise.all([loadAllDays({ resto:true }), loadExtrasAll({ resto:true })]);
        if(giorniOk && extraOk) ST.storicoCompleto = true;
        return !!ST.storicoCompleto;
      } finally { _storicoRestoInCorso = null; }
    })();
  }
  return _storicoRestoInCorso;
}
// Modo di lettura: 'finestra' (ultimi giorni, sostituisce), 'completo' (tutto, sostituisce:
// rinfresco dopo che il resto e' gia' stato aperto), 'resto' (solo prima della finestra, si aggiunge).
function _storicoModo(opts) {
  if(opts && opts.resto) return 'resto';
  return ST.storicoCompleto ? 'completo' : 'finestra';
}
function _storicoFiltro(modo, da, q, colonna) {
  return modo === 'finestra' ? q.gte(colonna, da) : (modo === 'resto' ? q.lt(colonna, da) : q);
}

// Mette pasti, digiuni e integratori presi dentro ST.db.days (che deve esistere). Un posto solo per
// loadAllDays e per loadRecentDays: cosa vale una riga lo decide questo codice e basta.
function _riempiGiorni(meals, itemsByMeal, fasting, suppLog) {
  (meals||[]).forEach(m => {
    if(!ST.db.days[m.date]) ST.db.days[m.date] = _nuovoGiorno(m.date);
    ST.db.days[m.date].meals.push({...m, local_id: m.id, items: itemsByMeal[m.id] || []});
  });
  (fasting||[]).forEach(f => {
    if(!ST.db.days[f.date]) ST.db.days[f.date] = _nuovoGiorno(f.date);
    ST.db.days[f.date].fasting = true;
  });
  // Presenza del record = assunto; popola sia suppsTaken (per match ST.supps) sia rawSuppLogs (per tutti).
  // La riga si lega al prodotto per supplement_id, poi per nome (Fondamenta 070): la regola e' in
  // shared/nutrizione.js → suppForLog. Il nome mostrato e' quello di oggi del prodotto.
  (suppLog||[]).forEach(s => {
    if(!ST.db.days[s.date]) ST.db.days[s.date] = _nuovoGiorno(s.date);
    if(!ST.db.days[s.date].rawSuppLogs) ST.db.days[s.date].rawSuppLogs = [];
    const supp = ZTNutrizione.suppForLog(ST.supps, s);
    if(supp && !ST.db.days[s.date].suppsTaken.includes(supp.local_id))
      ST.db.days[s.date].suppsTaken.push(supp.local_id);
    ST.db.days[s.date].rawSuppLogs.push({name: supp ? supp.name : s.supplement_name, time: s.slot || '', dose: parseFloat(supp?.dose_die) || 1});
  });
}

async function loadAllDays(opts) {
  // Pasti e ingredienti a pagine (L13), 2 ott 2026. Senza, oltre le 1000 righe
  // sparivano i pasti piu' recenti (ordine dal piu' vecchio) e un gruppo di
  // ingredienti a caso (ordine per sola posizione). Silenziose: girano all'avvio.
  // Le quattro letture partono insieme (Fondamenta 100, tappa 3): pasti, ingredienti, digiuni e
  // integratori dello storico non dipendono l'una dall'altra. Si mettono insieme solo dopo.
  const modo = _storicoModo(opts);
  const da = _storicoInizioFinestra();
  const _filtra = (q, colonna) => _storicoFiltro(modo, da, q, colonna);
  const COLONNE_INGREDIENTI = 'id,meal_id,name,quantity,unit,kcal,protein,carbs,fat,source,sort_order';
  // Gli ingredienti non hanno una data: la prendono dal pasto (join). Se la lettura col join
  // non va, si ripiega sulla vecchia lettura di tutti gli ingredienti: meglio una lettura piu'
  // grande che uno storico senza ingredienti.
  const leggiIngredienti = async () => {
    if(modo !== 'completo') {
      const r = await dbqAll('leggere gli ingredienti dei pasti', () => _filtra(supa.from('meal_items')
        .select(COLONNE_INGREDIENTI + ',meals!inner(date)')
        .eq('user_id', ST.user.id), 'meals.date')
        .order('sort_order', {ascending: true})
        .order('id',         {ascending: true}), {silenzioso:true});
      if(!r.error) { (r.data || []).forEach(it => { delete it.meals; }); return r; }
      console.warn('loadAllDays: ingredienti con il join non letti, ripiego sulla lettura intera');
    }
    return dbqAll('leggere gli ingredienti dei pasti', () => supa.from('meal_items')
      .select(COLONNE_INGREDIENTI)
      .eq('user_id', ST.user.id)
      .order('sort_order', {ascending: true})
      .order('id',         {ascending: true}), {silenzioso:true});
  };
  const lettureInsieme = Promise.all([
    dbqAll('leggere lo storico dei pasti', () => _filtra(supa.from('meals')
      .select('date,kcal,protein,carbs,fat,id,slot,description,notes,time')
      .eq('user_id', ST.user.id), 'date')
      .order('date', {ascending:true})
      .order('id',   {ascending:true}), {silenzioso:true}),
    // FASE 3: carica i meal_items dei pasti letti (tutti, se la lettura e' completa)
    leggiIngredienti(),
    _filtra(supa.from('fasting_days').select('date').eq('user_id', ST.user.id), 'date'),
  ]);
  // supplements_log dello storico — DUE correzioni, 9 ago 2026:
  //
  // 1. is_extra=false. Mancava, quindi le righe extra finivano qui dentro e nei
  //    giorni passati venivano valutate col dato sbagliato (dose della libreria o
  //    macro del catalogo, mai lo snapshot registrato). Ora gli extra hanno il
  //    loro archivio — loadExtrasAll — e questo canale porta solo gli standard.
  //    Toglie anche il doppio conteggio che compariva navigando su un giorno
  //    passato, dove convivevano queste righe e ST.extras.
  //
  // 2. PAGINAZIONE (L13). La query non ne aveva: 2.009 righe in tabella e il
  //    limite PostgREST a 1.000 significavano 179 righe perse per l'utente con
  //    piu' storico, per giunta senza order() quindi non sempre le stesse.
  const suppLog = [];
  let suppErr = null;
  {
    const BLOCCO = 1000;
    for(let dal = 0; ; dal += BLOCCO) {
      const res = await _filtra(supa.from('supplements_log')
        .select('date,supplement_name,supplement_id,slot')
        .eq('user_id', ST.user.id)
        .eq('is_extra', false), 'date')
        .order('date', { ascending: true })
        .order('slot',  { ascending: true })
        .range(dal, dal + BLOCCO - 1);
      if(res.error) { suppErr = res.error; console.warn('loadAllDays supplements_log:', res.error.message); break; }
      const blocco = res.data || [];
      suppLog.push(...blocco);
      if(blocco.length < BLOCCO) break;
    }
  }
  const [{data:meals, error:mealsErr}, {data: allItems, error: itemsErr}, {data:fasting, error:fastingErr}] = await lettureInsieme;
  const itemsByMeal = {};
  (allItems || []).forEach(it => {
    if (!itemsByMeal[it.meal_id]) itemsByMeal[it.meal_id] = [];
    itemsByMeal[it.meal_id].push(it);
  });

  // Se la query principale fallisce non azzerare ST.db — teniamo i dati locali già presenti
  // Lo stesso vale per gli ingredienti: pasti senza ingredienti sarebbero uno storico
  // falso, e sovrascriverebbero quello buono gia' in memoria.
  if (mealsErr || meals === null) return false;
  if (itemsErr || allItems === null) return false;

  if(modo === 'resto') {
    // Si aggiunge a quello che c'e': prima si tolgono i giorni piu' vecchi della finestra (una cache
    // di prima li puo' avere), cosi' i pasti non si raddoppiano.
    Object.keys(ST.db.days).filter(k => k < da).forEach(k => { delete ST.db.days[k]; });
  } else {
    ST.db = {days:{}};
    ST.storicoCompleto = (modo === 'completo');
    ST.storicoDa = (modo === 'completo') ? null : da;
  }
  _riempiGiorni(meals, itemsByMeal, fasting, suppLog);
  getDay(todayKey());
  return true;
}

// Rientro leggero (Fondamenta 100, tappa 5): riletti solo gli ultimi `giorni` giorni (pasti, ingredienti,
// digiuni, integratori ed extra, con una lettura sola per gli integratori). Sostituiscono i giorni
// corrispondenti in memoria; i piu' vecchi restano come sono. Se una lettura fallisce non si tocca niente.
const RIENTRO_GIORNI = 7;
async function loadRecentDays(giorni) {
  const n = giorni || RIENTRO_GIORNI;
  const d7 = new Date(); d7.setDate(d7.getDate() - n);
  const da = dayKey(d7);
  const uid = ST.user.id;
  const [mealsR, itemsR, fastR, logR] = await Promise.all([
    dbq('leggere i pasti recenti', supa.from('meals')
      .select('date,kcal,protein,carbs,fat,id,slot,description,notes,time')
      .eq('user_id', uid).gte('date', da)
      .order('date', {ascending:true}).order('id', {ascending:true}), {silenzioso:true}),
    dbq('leggere gli ingredienti recenti', supa.from('meal_items')
      .select('id,meal_id,name,quantity,unit,kcal,protein,carbs,fat,source,sort_order,meals!inner(date)')
      .eq('user_id', uid).gte('meals.date', da)
      .order('sort_order', {ascending:true}).order('id', {ascending:true}), {silenzioso:true}),
    supa.from('fasting_days').select('date').eq('user_id', uid).gte('date', da),
    dbq('leggere gli integratori recenti', supa.from('supplements_log')
      .select(_EXTRA_COLS + ', is_extra')
      .eq('user_id', uid).gte('date', da)
      .order('date', {ascending:true}).order('slot', {ascending:true}).order('created_at', {ascending:true}), {silenzioso:true}),
  ]);
  // Oltre 1000 righe in 7 giorni non succede; se succedesse, il limite tronca e non si tocca niente.
  const rotte = [mealsR, itemsR, fastR, logR].some(r => r.error || r.data === null);
  if(rotte || (logR.data || []).length >= 1000 || (itemsR.data || []).length >= 1000) return false;
  const itemsByMeal = {};
  itemsR.data.forEach(it => { delete it.meals; (itemsByMeal[it.meal_id] || (itemsByMeal[it.meal_id] = [])).push(it); });
  Object.keys(ST.db.days).filter(k => k >= da).forEach(k => { delete ST.db.days[k]; });
  const righe = logR.data;
  _riempiGiorni(mealsR.data, itemsByMeal, fastR.data, righe.filter(r => !r.is_extra));
  // Extra: stessa regola di loadExtrasAll, solo per questi giorni
  if(!ST.extrasByDay) ST.extrasByDay = {};
  Object.keys(ST.extrasByDay).filter(k => k >= da).forEach(k => { delete ST.extrasByDay[k]; });
  const catalog = ST.catalog || [];
  righe.filter(r => r.is_extra).forEach(r => {
    const e = _extraDaRiga(r, catalog);
    (ST.extrasByDay[e.date] || (ST.extrasByDay[e.date] = [])).push(e);
  });
  ST.extras = ST.extrasByDay[ST.activeDay] || [];
  getDay(todayKey());
  return true;
}

async function loadSupps() {
  const {data} = await dbq('leggere i tuoi integratori', supa.from('supplements').select('*').eq('user_id', ST.user.id).order('sort_order'));
  // Join col catalogo (codice, poi nome): la regola è in shared/nutrizione.js → mapSupplement
  ST.supps = (data||[]).map(s => ZTNutrizione.mapSupplement(s, ST.catalog || []));
}

async function loadCatalog() {
  const {data} = await dbq('leggere il catalogo degli integratori', supa.from('nutrilite_catalog').select('*').order('nome'));
  ST.catalog = data || [];
}

// ── PACKAGES (Integratori v3, 16 mag 2026) ────────────────────────────
// Carica supplement_packages + supplement_package_items in parallelo.
// Join client-side con ST.supps per arricchire ogni item con il supplement completo.
// Richiede ST.supps già caricato (loadSupps()).
// FILTRO ESPLICITO user_id: la policy admin_read_all_* permette all'email admin
// (ignazio.f@me.com) di vedere TUTTE le righe via RLS — il client deve SEMPRE
// filtrare per user_id corrente per evitare di renderizzare pacchetti di altri tester.
async function loadPackages() {
  ST.packages = []; // reset per evitare accumulo su re-fetch
  if(!ST.user || !ST.user.id) return;
  const uid = ST.user.id;
  const [pkRes, itRes] = await Promise.all([
    supa.from('supplement_packages').select('*').eq('user_id', uid).order('sort_order'),
    supa.from('supplement_package_items').select('*').eq('user_id', uid).order('sort_order'),
  ]);
  const packs = pkRes.data || [];
  const items = itRes.data || [];
  // Index supps by id per join veloce
  const suppById = {};
  (ST.supps || []).forEach(s => { suppById[s.local_id] = s; });
  // Raggruppa items per package_id
  const itemsByPkg = {};
  items.forEach(it => {
    const supp = suppById[it.supplement_id];
    if(!supp) return; // supplement cancellato/non più visibile → skip (RLS o delete)
    if(!itemsByPkg[it.package_id]) itemsByPkg[it.package_id] = [];
    itemsByPkg[it.package_id].push({
      id: it.id,
      supplement_id: it.supplement_id,
      sort_order: it.sort_order,
      supplement: supp,
    });
  });
  ST.packages = packs.map(p => ({
    ...p,
    items: (itemsByPkg[p.id] || []).sort((a,b) => (a.sort_order||0) - (b.sort_order||0)),
  }));
}

// ── EXTRAS (Integratori Step 2, 18 mag 2026; fallback macro Step D.3 22 mag 2026) ──
// Carica le righe supplements_log della data attiva con is_extra=true.
// Snapshot completo (kcal/macro/costo) come fonte di verità. Per righe vecchie
// pre-migration con campi macro NULL → fallback DERIVATO da ST.catalog × dose
// (rete di sicurezza, mai riscrive la riga DB → storico onesto se catalog cambia).
// Default dose quando NULL: 1 (coerente col codice precedente, semplice e trasparente).
const _EXTRA_COLS = 'id, date, slot, supplement_name, supplement_id, supplement_codice, dose, dose_unit, kcal, carbo, proteine, grassi, costo, created_at';

// Trasforma UNA riga supplements_log(is_extra=true) nell'oggetto usato da app e
// totali. Estratto da loadExtras il 9 ago 2026 perché ora serve a due lettori:
// quella del giorno e quella dell'intero storico. Un solo posto in cui si decide
// cosa vale una riga.
function _extraDaRiga(r, catalog) { return ZTNutrizione.extraFromRow(r, catalog || []); }

// ── ARCHIVIO EXTRA PER GIORNO — fonte unica dei loro kcal/macro ──────────────
// Prima gli extra si caricavano per UN giorno solo e i totali li sommavano solo
// se era il giorno visualizzato: nei grafici di Analisi le loro calorie non sono
// mai entrate (11.658,5 kcal su tre utenti, misurate il 9 ago 2026).
//
// Nota importante: NON erano semplicemente assenti. loadAllDays leggeva
// supplements_log senza filtro is_extra, quindi le righe extra finivano lo stesso
// nei giorni passati — ma valutate male: 107 righe come integratore standard alla
// dose della libreria, 112 con le macro del catalogo x dose 1, mai con lo
// snapshot registrato. Ora loadAllDays le esclude (is_extra=false) e questo
// archivio e' l'unico posto da cui i totali le prendono: il doppio conteggio
// diventa impossibile per costruzione, non per guardia.
//
// PAGINAZIONE OBBLIGATORIA (L13): PostgREST tronca a 1000 righe.
async function loadExtrasAll(opts) {
  if(!ST.user || !ST.user.id) { ST.extrasByDay = {}; ST.extras = []; return true; }
  // Stessa finestra di loadAllDays (Fondamenta 100, tappa 4): ultimi giorni all'avvio, il resto a richiesta.
  const modo = _storicoModo(opts);
  const da = _storicoInizioFinestra();
  const BLOCCO = 1000;
  const righe = [];
  for(let da_ = 0; ; da_ += BLOCCO) {
    const {data, error} = await _storicoFiltro(modo, da, supa
      .from('supplements_log')
      .select(_EXTRA_COLS)
      .eq('user_id', ST.user.id)
      .eq('is_extra', true), 'date')
      .order('date', { ascending: true })
      .order('slot', { ascending: true })
      .order('created_at', { ascending: true })
      .range(da_, da_ + BLOCCO - 1);
    if(error) { console.warn('loadExtrasAll error:', error); return false; }  // archivio precedente intatto
    const blocco = data || [];
    righe.push(...blocco);
    if(blocco.length < BLOCCO) break;   // blocco non pieno = ultimo
  }
  const catalog = ST.catalog || [];
  const perGiorno = {};
  righe.forEach(r => {
    const e = _extraDaRiga(r, catalog);
    (perGiorno[e.date] || (perGiorno[e.date] = [])).push(e);
  });
  if(modo === 'resto') {
    if(!ST.extrasByDay) ST.extrasByDay = {};
    Object.keys(ST.extrasByDay).filter(k => k < da).forEach(k => { delete ST.extrasByDay[k]; });
    Object.assign(ST.extrasByDay, perGiorno);
  } else {
    ST.extrasByDay = perGiorno;
  }
  ST.extras = ST.extrasByDay[ST.activeDay] || [];
  return true;
}

// Ricarica il solo giorno indicato e lo rinfresca dentro l'archivio. Serve dopo
// un inserimento o una cancellazione, e cambiando giorno: costa una riga di rete
// invece di rileggere tutto lo storico.
async function loadExtras(targetDate) {
  if(!ST.user || !ST.user.id) { ST.extras = []; return; }
  const d = targetDate || todayKey();
  const {data, error} = await supa
    .from('supplements_log')
    .select(_EXTRA_COLS)
    .eq('user_id', ST.user.id)
    .eq('date', d)
    .eq('is_extra', true)
    .order('slot', { ascending: true })
    .order('created_at', { ascending: true });
  if(error) { console.warn('loadExtras error:', error); return; }  // niente da riscrivere
  const catalog = ST.catalog || [];
  if(!ST.extrasByDay) ST.extrasByDay = {};
  ST.extrasByDay[d] = (data || []).map(r => _extraDaRiga(r, catalog));
  ST.extras = ST.extrasByDay[ST.activeDay] || [];
}

// Helper insert singolo extra in supplements_log
async function dbInsertExtraLog(extra) {
  if(!ST.user || !ST.user.id) throw new Error('no user');
  const row = {
    user_id:           ST.user.id,
    date:              extra.date || todayKey(),
    slot:              extra.slot || '',
    supplement_name:   extra.name || '',
    supplement_codice: extra.codice || null,
    is_extra:          true,
    dose:              extra.dose != null ? Math.round(extra.dose * 100) / 100 : null,
    dose_unit:         extra.dose_unit || null,
    kcal:              Math.max(0, Math.round((Number(extra.kcal)     || 0) * 10) / 10),
    carbo:             Math.max(0, Math.round((Number(extra.carbo)    || 0) * 10) / 10),
    proteine:          Math.max(0, Math.round((Number(extra.proteine) || 0) * 10) / 10),
    grassi:            Math.max(0, Math.round((Number(extra.grassi)   || 0) * 10) / 10),
    costo:             Math.max(0, Math.round((Number(extra.costo)    || 0) * 100) / 100),
  };
  const {data, error} = await supa.from('supplements_log').insert(row).select().single();
  if(error) throw error;
  return data;
}

// Helper delete singolo extra log
async function dbDeleteExtraLog(logId) {
  if(!ST.user || !ST.user.id || !logId) return;
  const {error} = await supa.from('supplements_log').delete()
    .eq('id', logId).eq('user_id', ST.user.id).eq('is_extra', true);
  if(error) throw error;
}

async function dbAddMeal(meal) {
  // Difesa in profondità: arrotonda a 1 decimale prima dell'insert (colonne Supabase numeric).
  const sanit = {
    kcal:    Math.max(0, Math.round((Number(meal.kcal)    || 0) * 10) / 10),
    protein: Math.max(0, Math.round((Number(meal.protein) || 0) * 10) / 10),
    carbs:   Math.max(0, Math.round((Number(meal.carbs)   || 0) * 10) / 10),
    fat:     Math.max(0, Math.round((Number(meal.fat)     || 0) * 10) / 10),
  };
  // L'id lo sceglie il telefono (Fondamenta 120): cosi' il pasto si puo' mettere in coda senza rete
  const row = {
    id: nuovoId(),
    user_id: ST.user.id,
    date: ST.activeDay,
    time: meal.time,
    slot: meal.slot,
    description: meal.description,
    kcal: sanit.kcal,
    protein: sanit.protein,
    carbs: sanit.carbs,
    fat: sanit.fat,
    notes: meal.notes || null,
  };
  const res = await scriviConCoda('salvare il pasto', { tabella:'meals', tipo:'insert', righe:row });
  if(res.error) throw res.error;
  return row;
}

async function dbDeleteMeal(mealId) {
  await scriviConCoda('cancellare il pasto', { tabella:'meals', tipo:'delete', filtri:[['id', mealId], ['user_id', ST.user.id]] });
}

async function dbToggleFasting(date, on) {
  if(on) await scriviConCoda('segnare il giorno di digiuno', { tabella:'fasting_days', tipo:'upsert', righe:{ user_id:ST.user.id, date }, onConflict:'user_id,date' });
  else   await scriviConCoda('togliere il giorno di digiuno', { tabella:'fasting_days', tipo:'delete', filtri:[['user_id', ST.user.id], ['date', date]] });
}

async function dbToggleSuppTaken(date, suppId, suppName, taken, slot) {
  // Delete prima (idempotente): per id del prodotto o per nome, cosi' si toglie anche la riga
  // scritta sotto un nome vecchio (Fondamenta 070). Una richiesta sola, col filtro .or().
  const perIdONome = suppId ? [['or', _orEq('supplement_id', suppId) + ',' + _orEq('supplement_name', suppName)]] : [['supplement_name', suppName]];
  await scriviConCoda('segnare l\'integratore come preso', { tabella:'supplements_log', tipo:'delete', filtri:[['user_id', ST.user.id], ['date', date], ...perIdONome] });
  if (taken) {
    // supplement_id e' la chiave (la riga di `supplements`); il nome resta accanto
    const res = await scriviConCoda('segnare l\'integratore come preso', { tabella:'supplements_log', tipo:'insert',
      righe:{ id:nuovoId(), user_id: ST.user.id, date, slot: slot||'', supplement_name: suppName, supplement_id: suppId || null } });
    if (res.error) throw res.error;
  }
}

async function loadTodaySuppLog() {
  // Fix 22 mag 2026: filtra is_extra=false per evitare doppio path di lettura.
  // Le righe is_extra=true vivono nel canale dedicato ST.extras (loadExtras) e
  // sono renderizzate da case 'extra' della timeline. Senza questo filtro le stesse
  // righe finivano ANCHE in day.rawSuppLogs e day.suppsTaken → render doppio
  // (case 'supp_log' + case 'supp' gruppo se il nome match un ST.supps con
  // qualsiasi slot di config). Causa principale del triplo conteggio visivo
  // diagnosticato il 22 mag (vedi DIAGNOSTICA_TRIPLO_CONTEGGIO_REPORT.md).
  const today = todayKey();
  const {data, error} = await supa
    .from('supplements_log')
    .select('supplement_name, supplement_id, slot')
    .eq('user_id', ST.user.id)
    .eq('date', today)
    .eq('is_extra', false);
  if (error || !data) return;
  const day = getDay(today);
  day.suppsTaken = [];
  // Per supplement_id, poi per nome (Fondamenta 070): la regola e' in shared/nutrizione.js → suppForLog
  day.rawSuppLogs = data.map(s => {
    const supp = ZTNutrizione.suppForLog(ST.supps, s);
    return {name: supp ? supp.name : s.supplement_name, time: s.slot || '', dose: parseFloat(supp?.dose_die) || 1};
  });
  data.forEach(s => {
    const supp = ZTNutrizione.suppForLog(ST.supps, s);
    if (supp && !day.suppsTaken.includes(supp.local_id))
      day.suppsTaken.push(supp.local_id);
  });
}

async function dbUpdateSupp(id, changes) {
  await dbq('aggiornare l\'integratore', supa.from('supplements').update(changes).eq('id', id).eq('user_id', ST.user.id));
}

async function dbDeleteSupp(id) {
  await dbq('cancellare l\'integratore', supa.from('supplements').delete().eq('id', id).eq('user_id', ST.user.id));
}

// Bulk update orario gruppo integratori — chiamata da renderOggi() timeline
// quando l'utente cambia l'orario dell'header di un gruppo (input type="time").
async function updateSuppSlotTime(oldTime, newTime, idsStr) {
  if(!newTime || oldTime === newTime) return;
  const ids = idsStr.split(',').filter(Boolean);
  // Aggiorna stato locale
  ST.supps.forEach(s => { if(ids.includes(String(s.local_id))) s.slot = newTime; });
  // Aggiorna Supabase per tutti gli integratori coinvolti
  await Promise.all(ids.map(id => dbUpdateSupp(id, {slot: newTime})));
  renderOggi();
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function macroBar(label,current,target,color,unit='g'){
  const pct=Math.min(100,Math.round((current/target)*100));
  const over=current>target;
  return `<div class="mbar"><div class="mbar-head"><span class="mbar-lbl">${label}</span><span class="mbar-val ${over?'over':''}">${current}${unit} / ${target}${unit}</span></div><div class="mbar-track"><div class="mbar-fill" style="width:${pct}%;background:${over?'var(--err)':color};"></div></div></div>`;
}

function miniRing(value, target, label, color) {
  const r=22, cx=26, cy=26, sw=5, circ=2*Math.PI*r;
  const pct = target > 0 ? Math.min(100, Math.round((value/target)*100)) : 0;
  const dash = (pct/100)*circ;
  const over = value > target;
  const ringColor = over ? 'var(--err)' : color;
  const valColor = over ? 'var(--err)' : 'var(--t1)';
  return `<div class="sum-cell">
    <div style="position:relative;width:52px;height:52px;flex-shrink:0;">
      <svg width="52" height="52" viewBox="0 0 52 52" style="transform:rotate(-90deg)">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--s3)" stroke-width="${sw}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="${sw}"
          stroke-dasharray="${dash} ${circ-dash}" stroke-linecap="round"
          style="transition:stroke-dasharray .6s ease"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0px;">
        <span style="font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${valColor};line-height:1.1;">${value}</span>
        <span style="font-size:7px;color:var(--t3);font-family:'JetBrains Mono',monospace;line-height:1;">kcal</span>
      </div>
    </div>
    <div class="sum-lbl">${label}</div>
  </div>`;
}

function targetRing(consumed, target) {
  const r=26, cx=30, cy=30, sw=6, circ=2*Math.PI*r;
  const pct = target > 0 ? Math.min(100, Math.round((consumed/target)*100)) : 0;
  const dash = (pct/100)*circ;
  const over = consumed > target;
  const color = pct>=95 && pct<=105 ? 'var(--ok)' : over ? 'var(--err)' : pct>=70 ? 'var(--warn)' : 'var(--acc)';
  const rem = Math.max(0, target - consumed);
  const remColor = over ? 'var(--err)' : 'var(--t3)';
  return `<div class="sum-cell" style="flex:1.3;">
    <div style="position:relative;width:60px;height:60px;flex-shrink:0;">
      <svg width="60" height="60" viewBox="0 0 60 60" style="transform:rotate(-90deg)">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--s3)" stroke-width="${sw}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
          stroke-dasharray="${dash} ${circ-dash}" stroke-linecap="round"
          style="transition:stroke-dasharray .6s ease"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;">
        <span style="font-size:11px;font-weight:800;font-family:'JetBrains Mono',monospace;color:${color};line-height:1;">${consumed}</span>
        <span style="font-size:6px;color:var(--t3);font-family:'JetBrains Mono',monospace;line-height:1.4;">kcal tot</span>
      </div>
    </div>
    <div class="sum-lbl" style="font-size:11px;">rimangono <span style="color:${remColor};font-weight:700;">${rem}</span></div>
  </div>`;
}

function zonaBalance(cons) {
  const tot = cons.protein + cons.carbs + cons.fat;
  if(tot < 5) return '';
  const kcalP = cons.protein * 4;
  const kcalC = cons.carbs   * 4;
  const kcalF = cons.fat     * 9;
  const totKcal = kcalP + kcalC + kcalF || 1;
  const pP = Math.round(kcalP / totKcal * 100);
  const pC = Math.round(kcalC / totKcal * 100);
  const pF = Math.round(kcalF / totKcal * 100);
  const okP = pP >= 25 && pP <= 35;
  const okC = pC >= 35 && pC <= 45;
  const okF = pF >= 25 && pF <= 35;
  const allOk = okP && okC && okF;
  const dot = ok => `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${ok?'var(--ok)':'var(--warn)'};margin-right:3px;vertical-align:middle;"></span>`;
  const legend = `<div style="margin-top:6px;font-size:9px;color:var(--t3);font-family:'JetBrains Mono',monospace;">
    <span style="margin-right:10px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--ok);margin-right:3px;vertical-align:middle;"></span>In Zona</span>
    <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--warn);margin-right:3px;vertical-align:middle;"></span>Out Zona</span>
  </div>`;
  return `<div style="display:flex;align-items:center;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid var(--b1);flex-wrap:wrap;">
    <span style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--t3);font-family:'JetBrains Mono',monospace;">Zona 40·30·30</span>
    <div style="display:flex;gap:10px;">
      <span style="font-size:11px;font-family:'JetBrains Mono',monospace;">${dot(okP)}<span style="color:var(--prot);">P ${pP}%</span></span>
      <span style="font-size:11px;font-family:'JetBrains Mono',monospace;">${dot(okC)}<span style="color:var(--carb);">C ${pC}%</span></span>
      <span style="font-size:11px;font-family:'JetBrains Mono',monospace;">${dot(okF)}<span style="color:var(--fat);">G ${pF}%</span></span>
    </div>
    <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:${allOk?'var(--ok)':'var(--warn)'};font-weight:700;margin-left:auto;">${allOk?'✅ In Zona':'⚠️ Fuori Zona'}</span>
  </div>${legend}`;
}

// ── OGGI V3 helpers ─────────────────────────────────────────
// Pasto pianificato del coach per ST.activeDay. Source-of-truth: weekly_plan_meals
// (stessa cache ST.pianoV4RealPlanCache usata dal tab Piano — single source of truth).
// Riscritto 25 mag sera: prima leggeva da ST.pianoAI (= profiles.piano_ai dormiente),
// che divergeva dal piano vero del coach mostrato nel tab Piano.
// I pasti veri esistono SOLO per slot 'pranzo' e 'cena' (colazione+merenda gestite
// dall'utente, F.2a v2 non li genera). Quindi solo questi 2 slot possono apparire
// come "PIANIFICATO · DAL COACH" nella timeline tab Oggi. Gli altri slot vengono
// saltati silenziosamente — coerente col disclaimer del tab Piano.
// Ritorna oggetto { pranzo?:{piatto,ingredienti,kcal}, cena?:{...} } oppure null.
function getTodayPianoMeals(){
  if(!ST.user || !ST.user.id || ST.user.id === 'test-user-001') return null;
  const activeDayStr = ST.activeDay || todayKey();
  // dayOfWeek ISO (1=LUN..7=DOM) da ST.activeDay
  const d = new Date(activeDayStr + 'T12:00:00');
  const jsDow = d.getDay();              // 0=DOM..6=SAB
  const dowIso = ((jsDow + 6) % 7) + 1;  // 1=LUN..7=DOM
  // week_start ISO della settimana che CONTIENE activeDayStr (non quella di oggi reale —
  // l'utente può navigare giorni con day-nav, e vogliamo il piano della SUA settimana).
  const weekIso = _pianoV4WeekStartIsoForDate(activeDayStr);
  // Trigger fire-and-forget se cache miss (al ritorno reRenderIfVisible re-renderizza Oggi)
  if (!_pianoV4GetCachedPlanWeek(weekIso) && typeof _pianoV4LoadRealPlanForWeek === 'function') {
    _pianoV4LoadRealPlanForWeek(weekIso);
  }
  const entry = _pianoV4GetCachedPlanWeek(weekIso);
  if (!entry || entry.state !== 'loaded' || !entry.plan) return null;
  const meals = (entry.mealsByDay && entry.mealsByDay[dowIso]) || [];
  if (!meals.length) return null;
  const result = {};
  meals.forEach(function(m) {
    if (m.slot !== 'pranzo' && m.slot !== 'cena') return;
    const ingr = (Array.isArray(m.ingredients) && m.ingredients.length)
      ? m.ingredients.join(', ')
      : '';
    result[m.slot] = {
      piatto:      m.name || '',
      ingredienti: ingr,
      kcal:        (m.kcal != null) ? m.kcal : null,
    };
  });
  return Object.keys(result).length > 0 ? result : null;
}

// Helper: 'YYYY-MM-DD' → ISO del lunedì della settimana che contiene quella data.
// Usato da getTodayPianoMeals quando ST.activeDay ≠ oggi (day-nav).
// Pattern coerente con _pianoV4MondayToIso (mezzogiorno locale → toISOString slice).
function _pianoV4WeekStartIsoForDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return _pianoV4WeekStartIsoForOffset(0);
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return _pianoV4WeekStartIsoForOffset(0);
  const day = d.getDay();                  // 0=DOM..6=SAB
  const diff = (day === 0) ? -6 : (1 - day); // distanza al lunedì ISO
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// Apre il form "Registra pasto" da CTA primario — resetta ST.logTime all'ora attuale
// (no memoria sessione: l'apertura precedente non deve influenzare la nuova).
window.openMealLogForm = function(){
  ST.logTime = new Date().toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
  ST.logOpen = true;
  renderOggi();
};

// Apre il form "Registra pasto" pre-compilato dal piano del coach.
// Indicizzato: la riga "REGISTRA ›" passa l'indice in ST._plannedRows, popolato a render.
window.openLogFromPlanned = function(idx){
  const p = (ST._plannedRows || [])[idx];
  if(!p) return;
  ST.logOpen = true;
  ST.logSlot = p.slot;
  ST.logTime = p.time;
  ST.smartForm = {
    items: [],
    freeText: p.descrizione || '',
    notes: '',
    analyzing: false,
    editingMealId: null, editingSlot: null, editingTime: null, editingDescription: '',
  };
  renderOggi();
  // Scroll smooth verso il form (in cima alla pagina dopo header)
  setTimeout(() => {
    const el = document.getElementById('registra-pasto-form');
    if(el) el.scrollIntoView({block:'start', behavior:'smooth'});
  }, 80);
};

// OGGI V3 hero (15 maggio 2026): donut grande Syne + status zona pill separato + 3 macro card.
// Logica residua kcal/macro PRESERVATA (kcalRimaste/macroRimasti/isOverTarget/OVER_COLOR).
// Stato kcal in negativo: numero "−180" prefisso, rosso terracotta #B84C2A.
function heroCard(cons) {
  const target = ST.TARGET || {kcal:2000, protein:150, carbs:200, fat:67};
  // ── Calcoli kcal residue ──────────────────────────────────
  const remKcal  = kcalRimaste(cons.kcal, target.kcal);
  const overKcal = isOverTarget(cons.kcal, target.kcal);
  const consPct  = overKcal ? 100 : (target.kcal > 0 ? Math.max(0, Math.min(100, Math.round((cons.kcal / target.kcal) * 100))) : 0);

  // ── Zona check (3 stati: in / quasi / fuori — fascia ±5% / ±10%) ──
  const tot = cons.protein + cons.carbs + cons.fat;
  let pC = 0, pP = 0, pF = 0, zonaState = 'unset';
  if (tot >= 5) {
    const kP = cons.protein * 4, kC = cons.carbs * 4, kFat = cons.fat * 9;
    const totK = kP + kC + kFat || 1;
    pP = Math.round(kP / totK * 100);
    pC = Math.round(kC / totK * 100);
    pF = Math.round(kFat / totK * 100);
    const inZ   = (pC >= 35 && pC <= 45) && (pP >= 25 && pP <= 35) && (pF >= 25 && pF <= 35);
    const nearZ = (pC >= 30 && pC <= 50) && (pP >= 20 && pP <= 40) && (pF >= 20 && pF <= 40);
    zonaState = inZ ? 'in' : (nearZ ? 'near' : 'out');
  }

  // ── Ring color: over → terracotta; in zona → evergreen; quasi → ambra; fuori → terracotta ──
  const ringColor = overKcal ? '#B84C2A'
    : (zonaState === 'in'   ? 'var(--acc)'
    : (zonaState === 'near' ? '#C4880A'
    : (zonaState === 'out'  ? '#B84C2A'
    :                          'var(--carb)')));

  // ── Anello SVG ────────────────────────────────────────────
  const r = 85, cx = 100, cy = 100, sw = 10;
  const circ = 2 * Math.PI * r;
  const dash = (consPct / 100) * circ;

  // ── Numero centrale donut: "−180" se over, valore positivo altrimenti ──
  const heroBigNum = overKcal
    ? `−${fmtNum(Math.abs(remKcal))}`
    : fmtNum(remKcal);
  const heroNumLen = String(heroBigNum).length;
  const heroNumCls = heroNumLen >= 5 ? 'small' : (heroNumLen === 4 ? 'medium' : '');
  const heroOverCls = overKcal ? 'over' : '';
  const heroLabel   = overKcal ? 'KCAL OLTRE'
    : (remKcal === 0 && cons.kcal > 0 ? 'TARGET RAGGIUNTO' : 'KCAL RIMASTE');
  const heroSummary = `${fmtNum(Math.max(0, cons.kcal))} consumate · su ${fmtNum(target.kcal)} obiettivo`;

  // ── Status Zona pill ──────────────────────────────────────
  const tPC = target.pCarbo || 40, tPP = target.pProt || 30, tPF = target.pFat || 30;
  let zonaPill;
  if (zonaState === 'unset') {
    zonaPill = `
      <div class="oggi-v3-zona-pill" style="background:var(--s2);border:0.5px solid var(--b1);">
        <span class="oggi-v3-zona-dot" style="background:var(--t3);"></span>
        <span class="oggi-v3-zona-label" style="color:var(--t3);">DATI INSUFFICIENTI</span>
        <span class="oggi-v3-zona-stats">target ${tPC}·${tPP}·${tPF}</span>
      </div>`;
  } else {
    const lbl    = zonaState === 'in' ? 'NELLA ZONA' : (zonaState === 'near' ? 'QUASI ZONA' : 'FUORI ZONA');
    const dotCol = zonaState === 'in' ? 'var(--acc)' : (zonaState === 'near' ? '#C4880A' : '#B84C2A');
    zonaPill = `
      <div class="oggi-v3-zona-pill ${zonaState}">
        <span class="oggi-v3-zona-dot" style="background:${dotCol};"></span>
        <span class="oggi-v3-zona-label" style="color:${dotCol};">${lbl}</span>
        <span class="oggi-v3-zona-stats">${pC} · ${pP} · ${pF} <span style="opacity:.55;">/ ${tPC}·${tPP}·${tPF}</span></span>
      </div>`;
  }

  // ── 3 Macro card orizzontali (CARB ambra / PROT evergreen / FAT terracotta) ──
  const macros = [
    { name:'CARB', color:'#C4880A',    value:cons.carbs,   target:target.carbs   },
    { name:'PROT', color:'var(--acc)', value:cons.protein, target:target.protein },
    { name:'FAT',  color:'#B84C2A',    value:cons.fat,     target:target.fat     },
  ];
  const macroRow = `
    <div class="oggi-v3-macro-row">
      ${macros.map(m => {
        if(!m.target || m.target <= 0){
          return `<div class="oggi-v3-macro-card">
            <div class="oggi-v3-macro-head"><span class="oggi-v3-macro-dot" style="background:${m.color};"></span><span class="oggi-v3-macro-name" style="color:${m.color};">${m.name}</span></div>
            <div><span class="oggi-v3-macro-value">—</span><span class="oggi-v3-macro-value-unit">g</span></div>
            <div class="oggi-v3-macro-sub">target non impostato</div>
          </div>`;
        }
        const rem  = macroRimasti(m.value, m.target);
        const over = isOverTarget(m.value, m.target);
        const consPctM = over ? 100 : Math.max(0, Math.min(100, Math.round((m.value / m.target) * 100)));
        const valStr  = over ? `+${fmtNum(Math.abs(rem))}` : fmtNum(rem);
        const valCol  = over ? OVER_COLOR : 'var(--t1)';
        const fillCol = over ? OVER_COLOR : m.color;
        const subStr  = over
          ? `oltre · +${fmtNum(Math.abs(rem))}/${fmtNum(m.target)}g`
          : `rimasti · ${fmtNum(Math.max(0, m.value))}/${fmtNum(m.target)}g`;
        return `<div class="oggi-v3-macro-card">
          <div class="oggi-v3-macro-head"><span class="oggi-v3-macro-dot" style="background:${m.color};"></span><span class="oggi-v3-macro-name" style="color:${m.color};">${m.name}</span></div>
          <div><span class="oggi-v3-macro-value" style="color:${valCol};">${valStr}</span><span class="oggi-v3-macro-value-unit">g</span></div>
          <div class="oggi-v3-macro-sub">${subStr}</div>
          <div class="oggi-v3-macro-bar"><div class="oggi-v3-macro-bar-fill" style="width:${consPctM}%;background:${fillCol};"></div></div>
        </div>`;
      }).join('')}
    </div>`;

  // ── Render ────────────────────────────────────────────────
  return `
    <div class="oggi-v3-hero-card">
      <div class="oggi-v3-donut-row">
        <div class="oggi-v3-donut-wrap">
          <svg class="oggi-v3-donut-svg" viewBox="0 0 200 200">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E8E4DC" stroke-width="${sw}"/>
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="${sw}"
                    stroke-dasharray="${dash.toFixed(1)} ${(circ - dash).toFixed(1)}" stroke-linecap="round"
                    style="transition:stroke-dasharray .6s ease"/>
          </svg>
          <div class="oggi-v3-donut-inner">
            <span class="oggi-v3-donut-num ${heroNumCls} ${heroOverCls}">${heroBigNum}</span>
            <span class="oggi-v3-donut-label">${heroLabel}</span>
          </div>
        </div>
        <div class="oggi-v3-donut-summary">${heroSummary}</div>
      </div>
      ${zonaPill}
      ${macroRow}
    </div>`;
}

const SLOT_STYLE = {
  colazione:        { color:'var(--carb)', light:'var(--carb-lt)' },
  snack_mattina:    { color:'var(--fat)',  light:'var(--fat-lt)'  },
  pranzo:           { color:'var(--prot)', light:'var(--prot-lt)' },
  snack_pomeriggio: { color:'var(--fat)',  light:'var(--fat-lt)'  },
  cena:             { color:'var(--acc)',  light:'var(--acc-lt)'  },
  extra:            { color:'var(--t3)',   light:'var(--s2)'      },
};
function mealCardHTML(m){
  const mealId = m.id||m.local_id;
  const slotInfo = MEAL_SLOTS.find(s=>s.id===m.slot)||MEAL_SLOTS[0];
  const ss = SLOT_STYLE[m.slot] || { color:'var(--acc)', light:'var(--acc-lt)' };
  const items = m.items || [];
  const isExpanded = !!(ST.mealExpanded && ST.mealExpanded[mealId]);
  const arrowRot = isExpanded ? 'transform:rotate(90deg);display:inline-block;' : '';

  // Calcolo "In Zona / Fuori Zona"
  const kC=( m.carbs||0)*4, kP=(m.protein||0)*4, kF=(m.fat||0)*9;
  const totK=kC+kP+kF;
  let zonaBadge = '';
  if(totK>=10){
    const pC=kC/totK*100, pP=kP/totK*100, pF=kF/totK*100;
    const inZona=(pC>=35&&pC<=45)&&(pP>=25&&pP<=35)&&(pF>=25&&pF<=35);
    const bg=inZona?'#E6F4F2':'#FDECEA';
    const col=inZona?'#2A7A6F':'#B84C2A';
    const lbl=inZona?'In Zona':'Fuori Zona';
    zonaBadge = `<span style="font-size:10px;font-family:'JetBrains Mono',monospace;font-weight:700;background:${bg};color:${col};border-radius:20px;padding:2px 9px;">${lbl}</span>`;
  }

  // Header collassato (sempre visibile)
  const itemCount = items.length;
  const itemCountLbl = itemCount === 0 ? 'pasto monolitico' : (itemCount === 1 ? '1 ingrediente' : `${itemCount} ingredienti`);

  const headerCollapsed = `
    <div onclick="toggleMealCard('${mealId}')" style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;padding:12px 13px;">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
        <span style="color:var(--t3);font-size:10px;flex-shrink:0;${arrowRot}">▶</span>
        <span style="font-size:14px;flex-shrink:0;">${slotInfo.icon}</span>
        <div style="min-width:0;flex:1;">
          <div style="font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ss.color};">${slotInfo.label}</div>
          <div style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace;display:flex;align-items:center;gap:4px;" onclick="event.stopPropagation()">
            <input type="time" value="${m.time?m.time.slice(0,5):''}" onchange="updateMealTime('${ST.activeDay}','${mealId}',this.value)" onclick="event.stopPropagation()" title="Modifica orario" style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace;border:none;background:none;cursor:pointer;width:60px;padding:0;" />
            <span>· ${itemCountLbl}</span>
          </div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:18px;font-weight:600;font-family:'JetBrains Mono',monospace;color:var(--t1);line-height:1;">${m.kcal}</div>
        <div style="font-size:9px;color:var(--t3);font-family:'JetBrains Mono',monospace;">kcal</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;" onclick="event.stopPropagation()">
        <button class="meal-edit-btn" onclick="event.stopPropagation(); smartOpenEdit('${ST.activeDay}','${mealId}')" title="Modifica" style="font-size:14px;padding:0;background:none;border:none;cursor:pointer;">✏️</button>
        <button class="meal-edit-btn meal-delete-btn" onclick="chiediEliminaPasto('${ST.activeDay}','${mealId}')" title="Elimina" style="font-size:14px;padding:0;background:none;border:none;cursor:pointer;opacity:0.5;">🗑️</button>
      </div>
    </div>`;

  // Lista ingredienti (visibile solo se pasto espanso)
  const itemsListHtml = items.map(it => {
    const isItemExpanded = !!(ST.itemExpanded && ST.itemExpanded[it.id]);
    const itemArrow = isItemExpanded ? 'transform:rotate(90deg);display:inline-block;' : '';
    const macroChips = isItemExpanded ? `
      <div style="margin-top:6px;padding-top:6px;border-top:0.5px dashed var(--s3);display:flex;gap:4px;font-size:10px;font-family:'JetBrains Mono',monospace;flex-wrap:wrap;">
        <span style="background:var(--carb-lt);color:#854F0B;padding:2px 6px;border-radius:4px;">${it.carbs}g C</span>
        <span style="background:var(--prot-lt);color:#3B6D11;padding:2px 6px;border-radius:4px;">${it.protein}g P</span>
        <span style="background:var(--fat-lt);color:#993C1D;padding:2px 6px;border-radius:4px;">${it.fat}g G</span>
      </div>` : '';
    const qtyDisplay = (it.quantity && it.unit) ? `<span style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace;flex-shrink:0;">${it.quantity}${it.unit}</span>` : '';
    return `
      <div style="background:var(--s2);border-radius:6px;padding:8px 10px;margin-bottom:4px;">
        <div onclick="toggleMealItem('${it.id}')" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
            <span style="color:var(--t3);font-size:9px;flex-shrink:0;${itemArrow}">▶</span>
            <span style="font-size:13px;font-weight:500;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(it.name)}</span>
            ${qtyDisplay}
          </div>
          <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--t2);flex-shrink:0;">${it.kcal} kcal</span>
        </div>
        ${macroChips}
      </div>`;
  }).join('');

  // Corpo espanso
  const bodyExpanded = isExpanded ? `
    <div style="padding:0 13px 13px;border-top:0.5px solid var(--s3);margin-top:0;">
      ${m.description?`<p style="font-size:14px;color:var(--t1);line-height:1.4;margin:10px 0 6px;font-weight:500;">${esc(m.description)}</p>`:''}
      ${m.notes?`<p style="font-size:12px;font-style:italic;color:var(--t3);margin:0 0 10px;line-height:1.45;">${esc(m.notes)}</p>`:''}
      <div class="macro-badges" style="margin-top:10px;">
        <div class="macro-badge" style="background:var(--s2);border:1px solid var(--b1);">
          <div class="mb-lbl" style="color:var(--t3);">kcal</div>
          <div class="mb-val">${m.kcal}</div>
        </div>
        <div class="macro-badge" style="background:var(--carb-lt);border:1px solid var(--carb)33;">
          <div class="mb-lbl" style="color:var(--carb);">C</div>
          <div class="mb-val">${m.carbs}<span>g</span></div>
        </div>
        <div class="macro-badge" style="background:var(--prot-lt);border:1px solid var(--prot)33;">
          <div class="mb-lbl" style="color:var(--prot);">P</div>
          <div class="mb-val">${m.protein}<span>g</span></div>
        </div>
        <div class="macro-badge" style="background:var(--fat-lt);border:1px solid var(--fat)33;">
          <div class="mb-lbl" style="color:var(--fat);">G</div>
          <div class="mb-val">${m.fat}<span>g</span></div>
        </div>
      </div>
      ${zonaBadge?`<div style="display:flex;justify-content:flex-end;margin-top:6px;">${zonaBadge}</div>`:''}
      ${items.length > 0 ? `
        <div style="margin-top:14px;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);font-weight:700;margin-bottom:8px;font-family:'JetBrains Mono',monospace;">Ingredienti</div>
          ${itemsListHtml}
        </div>` : ''}
    </div>` : '';

  const inner = `<div class="meal-card-v2" style="display:block;padding:0;">
    <div style="display:flex;">
      <div class="slot-bar" style="background:${ss.color};width:3px;align-self:stretch;flex-shrink:0;border-radius:2px 0 0 2px;"></div>
      <div style="flex:1;min-width:0;">
        ${headerCollapsed}
        ${bodyExpanded}
      </div>
    </div>
  </div>`;

  return `<div class="swipe-wrap" id="sw-${mealId}"><div class="swipe-delete-btn" onclick="chiediEliminaPasto('${ST.activeDay}','${mealId}')">🗑️</div><div class="swipe-inner" id="si-${mealId}" ontouchstart="swipeStart(event,'${mealId}')" ontouchmove="swipeMove(event,'${mealId}')" ontouchend="swipeEnd(event,'${mealId}')">${inner}</div></div>`;
}

// ═══════════════════════════════════════════════════════════
// PAGE: OGGI
// ═══════════════════════════════════════════════════════════
function isSuppGroupCollapsed(slot, takenN, total) {
  const v = localStorage.getItem('fascia_collapsed_' + slot);
  if (v === '1') return true;
  if (v === '0') return false;
  return takenN === total && total > 0; // auto-collassa se tutti assunti
}
function toggleSuppGroup(slot) {
  const taken = (getDay(ST.activeDay).suppsTaken || []);
  const ss = suppsDelGiorno(getDay(ST.activeDay)).filter(s => s.slot === slot);
  const collapsed = isSuppGroupCollapsed(slot, ss.filter(s=>taken.includes(s.local_id)).length, ss.length);
  localStorage.setItem('fascia_collapsed_' + slot, collapsed ? '0' : '1');
  renderOggi();
}
function suppGroupLabel(supps) {
  const names = supps.map(s=>(s.grp||'').trim()).filter(g=>g&&g!=='EMPTY');
  if(!names.length) return 'INTEGRATORI';
  const unique=[...new Set(names)];
  if(unique.length===1) return unique[0];
  const freq={};names.forEach(n=>freq[n]=(freq[n]||0)+1);
  const [top,cnt]=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
  return cnt>names.length/2 ? top : 'INTEGRATORI';
}
function suppGroupHeaderHTML(slot, sc, takenN, total, collapsed, label) {
  const lbl = label||'INTEGRATORI';
  const displayLbl = lbl==='INTEGRATORI' ? '+ EXTRA' : `Gruppo "${lbl}"`;
  const cc = (takenN===total&&total>0) ? '#1e7a4a' : 'var(--t3)';
  const fw = (takenN===total&&total>0) ? 700 : 400;
  const ch = collapsed ? '▶' : '▼';
  const assuntoLbl = takenN === 1 ? 'assunto' : 'assunti';
  return `<div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:6px 2px;margin:4px 0 2px;user-select:none;" onclick="toggleSuppGroup('${slot}')"><span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:${sc};font-weight:600;">${displayLbl} · ${slot}</span><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:${cc};font-weight:${fw};">${takenN}/${total} ${assuntoLbl}</span><span style="font-size:10px;color:var(--t3);">${ch}</span></div></div>`;
}
const SLOT_COLOR_MAP={'06:30':'#7cb87c','08:45':'#e8935a','11:00':'#f0bc5e','13:00':'#5ab8b8','15:30':'#9b7ec8','22:15':'#5a7eb8'};
const SLOT_PAL=['#7cb87c','#e8935a','#f0bc5e','#5ab8b8','#9b7ec8','#5a7eb8','#8fa8c8','#a8c87c'];

// ── Integratori v3 Blocco 2 (16 mag 2026) — mappa tinte + emoji catalogo ──
// Hardcoded JS (decisione "A" del brief): niente colonne DB nuove.
const CATEGORY_TINT_MAP = {
  ambra:      { bg: '#FEF3DC', emoji: '💊' },  // base/cuore
  terracotta: { bg: '#FCEEE9', emoji: '⚡' },  // sport/composizione
  rosa:       { bg: '#FCE9EE', emoji: '🌸' },  // pelle/donna
  verde:      { bg: '#E6F4E6', emoji: '🌿' },  // energia/peso
  beige:      { bg: '#F0EDE6', emoji: '🌱' },  // erbe/fegato (fallback)
};
const CATEGORY_TO_TINT = {
  'Integratori base':       'ambra',
  'Erbe / Cuore':           'ambra',
  'Aminoacidi / Sport':     'terracotta',
  'Composizione corporea':  'terracotta',
  'Sostituto pasto':        'terracotta',
  'Ossa / Muscoli':         'terracotta',
  'Controllo peso':         'verde',
  'Energia':                'verde',
  'Concentrazione':         'verde',
  'Pelle / Collagene':      'rosa',
  'Pelle / Benessere':      'rosa',
  'Supporto Lei / Pelle':   'rosa',
  'Erbe / Fegato':          'beige',
  'Erbe / Fitonutrienti':   'beige',
  'Protezione cellule':     'beige',
  // Categorie non mappate → fallback 'beige'
};
const CATEGORY_EMOJI_OVERRIDE = {
  'Sostituto pasto':        '🥤',
  'Aminoacidi / Sport':     '💪',
  'Ossa / Muscoli':         '🦴',
  'Erbe / Cuore':           '❤️',
  'Erbe / Fegato':          '🍃',
  'Pelle / Collagene':      '✨',
  'Pelle / Benessere':      '🌸',
  'Supporto Lei / Pelle':   '💗',
  'Controllo peso':         '⚖️',
  'Energia':                '⚡',
  'Concentrazione':         '🧠',
  'Protezione cellule':     '🛡️',
  'Erbe / Fitonutrienti':   '🌿',
  'Integratori base':       '💊',
};
function getCatalogTint(item) {
  const tintKey = CATEGORY_TO_TINT[item && item.categoria] || 'beige';
  const tint = CATEGORY_TINT_MAP[tintKey];
  const emoji = (CATEGORY_EMOJI_OVERRIDE[item && item.categoria]) || tint.emoji;
  return { bg: tint.bg, emoji };
}

// ═══════════════════════════════════════════════════════════
// FASE 2 — SMART INGREDIENT FORM (registrazione pasto a righe)
// ═══════════════════════════════════════════════════════════
function _initSmartForm() {
  if (!ST.smartForm) ST.smartForm = {
    items: [], freeText: '', notes: '', analyzing: false,
    editingMealId: null, editingSlot: null, editingTime: null, editingDescription: '',
  };
}
let _smartTempId = 1;
function _newItemId() { return 'tmp_' + (_smartTempId++); }

function _smartTotals() {
  _initSmartForm();
  return ST.smartForm.items.reduce((a,i)=>({
    kcal:    Math.round((a.kcal    + (Number(i.kcal)    ||0)) * 10) / 10,
    protein: Math.round((a.protein + (Number(i.protein) ||0)) * 10) / 10,
    carbs:   Math.round((a.carbs   + (Number(i.carbs)   ||0)) * 10) / 10,
    fat:     Math.round((a.fat     + (Number(i.fat)     ||0)) * 10) / 10,
  }), {kcal:0,protein:0,carbs:0,fat:0});
}

function _smartHasContent() {
  _initSmartForm();
  return ST.smartForm.items.some(i => i.name && i.name.trim());
}

function _smartSummaryDesc() {
  _initSmartForm();
  return ST.smartForm.items
    .filter(i => i.name && i.name.trim())
    .map(i => i.name.trim())
    .join(' · ');
}

window.smartFreeTextChange = function(val) {
  _initSmartForm();
  ST.smartForm.freeText = val;
};

window.smartAnalyze = async function() {
  _initSmartForm();
  const txt = (ST.smartForm.freeText || '').trim();
  if (!txt) { showToast('Scrivi qualcosa prima di analizzare', '✍️'); return; }
  if (ST.smartForm.analyzing) return;
  ST.smartForm.analyzing = true;
  renderOggi();
  try {
    const split = await estimateMealItems(txt);
    if (!split.items || split.items.length === 0) {
      avvisa('Non sono riuscito a identificare ingredienti. Prova a riformulare o usa «Manuale».');
      return;
    }
    ST.smartForm.items = split.items.map((it, idx) => ({
      tempId: _newItemId(),
      name: it.name, quantity: it.quantity, unit: it.unit,
      kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat,
      expanded: false, calculating: false, sortOrder: idx, source: 'ai_split',
    }));
    ST.smartForm.notes = split.notes || '';
    ST.smartForm.freeText = '';
  } catch (e) {
    console.error('Analyze error:', e);
    avvisa('Non sono riuscito ad analizzare il pasto. ' + aiErrMsg(e.aiKind));
  } finally {
    ST.smartForm.analyzing = false;
    renderOggi();
  }
};

window.smartAddEmptyRow = function() {
  _initSmartForm();
  ST.smartForm.items.push({
    tempId: _newItemId(),
    name: '', quantity: 0, unit: 'g',
    kcal: 0, protein: 0, carbs: 0, fat: 0,
    expanded: true, calculating: false,
    sortOrder: ST.smartForm.items.length, source: 'manual',
  });
  renderOggi();
};

window.smartRemoveRow = function(tempId) {
  _initSmartForm();
  ST.smartForm.items = ST.smartForm.items.filter(i => i.tempId !== tempId);
  renderOggi();
};

window.smartToggleRow = function(tempId) {
  _initSmartForm();
  const it = ST.smartForm.items.find(i => i.tempId === tempId);
  if (it) it.expanded = !it.expanded;
  renderOggi();
};

window.smartToggleAll = function() {
  _initSmartForm();
  const anyExpanded = ST.smartForm.items.some(i => i.expanded);
  ST.smartForm.items.forEach(i => i.expanded = !anyExpanded);
  renderOggi();
};

window.smartUpdateField = function(tempId, field, value) {
  _initSmartForm();
  const it = ST.smartForm.items.find(i => i.tempId === tempId);
  if (!it) return;
  if (field === 'quantity') value = Math.max(0, parseFloat(value) || 0);
  if (field === 'unit' && !['g','ml','pz'].includes(value)) value = 'g';
  it[field] = value;
  // No renderOggi su ogni keystroke per non perdere il focus dell'input
};

window.smartRecalcRow = async function(tempId) {
  _initSmartForm();
  const it = ST.smartForm.items.find(i => i.tempId === tempId);
  if (!it) return;
  // Pull latest values dai campi (potrebbero non aver chiamato change ancora)
  const nameEl = document.querySelector(`[data-row-name="${tempId}"]`);
  const qtyEl = document.querySelector(`[data-row-qty="${tempId}"]`);
  const unitEl = document.querySelector(`[data-row-unit="${tempId}"]`);
  if (nameEl) it.name = nameEl.value;
  if (qtyEl) it.quantity = Math.max(0, parseFloat(qtyEl.value) || 0);
  if (unitEl) it.unit = ['g','ml','pz'].includes(unitEl.value) ? unitEl.value : 'g';
  if (!it.name || !it.name.trim() || !it.quantity || it.quantity <= 0) {
    showToast('Compila prima nome e quantità', '✍️');
    return;
  }
  it.calculating = true;
  renderOggi();
  try {
    const m = await estimateSingleItem(it.name.trim(), it.quantity, it.unit);
    it.kcal = m.kcal; it.protein = m.protein; it.carbs = m.carbs; it.fat = m.fat;
  } catch (e) {
    console.error('Single item estimate error:', e);
    avvisa('Non sono riuscito a stimare l\'ingrediente. ' + aiErrMsg(e.aiKind));
  } finally {
    it.calculating = false;
    renderOggi();
  }
};

window.smartResetForm = function() {
  ST.smartForm = {
    items: [], freeText: '', notes: '', analyzing: false,
    editingMealId: null, editingSlot: null, editingTime: null, editingDescription: '',
  };
  renderOggi();
};

// FASE 4 Edit pasto via Smart Ingredient
window.smartOpenEdit = async function(date, mealId) {
  const day = ST.db && ST.db.days && ST.db.days[date];
  if (!day) { showToast('Giorno non trovato', '⚠️'); return; }
  const meal = (day.meals || []).find(m => (m.id === mealId) || (m.local_id === mealId));
  if (!meal) { showToast('Pasto non trovato', '⚠️'); return; }

  // Pre-carica gli items se non già in memoria
  let items = meal.items || [];
  if (items.length === 0) {
    const {data: dbItems} = await dbq('leggere gli ingredienti del pasto', supa.from('meal_items')
      .select('*')
      .eq('meal_id', mealId)
      .eq('user_id', ST.user.id)
      .order('sort_order', {ascending: true}));
    items = dbItems || [];
  }

  // Pasto monolitico legacy: crea 1 item dalla descrizione
  if (items.length === 0) {
    items = [{
      id: 'legacy_' + mealId,
      name: meal.description || 'Pasto',
      quantity: 0, unit: 'g',
      kcal: meal.kcal || 0, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0,
      source: 'manual', sort_order: 0,
    }];
  }

  ST.smartForm = {
    items: items.map((it, idx) => ({
      tempId: _newItemId(),
      _existingId: it.id,
      name: it.name || '',
      quantity: Number(it.quantity) || 0,
      unit: it.unit || 'g',
      kcal: Number(it.kcal) || 0,
      protein: Number(it.protein) || 0,
      carbs: Number(it.carbs) || 0,
      fat: Number(it.fat) || 0,
      expanded: false, calculating: false,
      sortOrder: idx, source: it.source || 'manual',
    })),
    freeText: '',
    notes: meal.notes || '',
    analyzing: false,
    editingMealId: mealId,
    editingSlot: meal.slot,
    editingTime: meal.time || null,
    editingDescription: meal.description || '',
  };

  ST.logSlot = meal.slot;
  ST.logOpen = true;
  renderOggi();

  setTimeout(() => {
    const formEl = document.getElementById('registra-pasto-form');
    if (formEl && formEl.scrollIntoView) formEl.scrollIntoView({behavior:'smooth', block:'start'});
  }, 100);
};

// FASE 3 Timeline doppio collasso
window.toggleMealCard = function(mealId) {
  if (!ST.mealExpanded) ST.mealExpanded = {};
  ST.mealExpanded[mealId] = !ST.mealExpanded[mealId];
  renderOggi();
};

window.toggleMealItem = function(itemId) {
  if (!ST.itemExpanded) ST.itemExpanded = {};
  ST.itemExpanded[itemId] = !ST.itemExpanded[itemId];
  renderOggi();
};

// FASE 5 Card EXTRA integratori collassabile
window.toggleExtraSupp = function(extraKey) {
  if (!ST.extraSuppExpanded) ST.extraSuppExpanded = {};
  ST.extraSuppExpanded[extraKey] = !ST.extraSuppExpanded[extraKey];
  renderOggi();
};

window.smartSavePasto = async function() {
  _initSmartForm();
  if (!_smartHasContent()) { showToast('Aggiungi almeno un ingrediente', '✍️'); return; }
  const isEdit = !!ST.smartForm.editingMealId;
  const slot = isEdit ? (ST.smartForm.editingSlot || ST.logSlot) : ST.logSlot;
  if (!slot) { showToast('Scegli il pasto', '✍️'); return; }
  const items = ST.smartForm.items.filter(i => i.name && i.name.trim());
  const tot = _smartTotals();
  const summary = _smartSummaryDesc();
  const time = (() => {
    const inputEl = document.getElementById('log-time');
    if (inputEl && inputEl.value) return inputEl.value;
    if (isEdit && ST.smartForm.editingTime) return ST.smartForm.editingTime;
    const now = new Date();
    return String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  })();

  try {
    if (isEdit) {
      // ── MODALITÀ EDIT ──
      const mealId = ST.smartForm.editingMealId;
      const {error: updErr} = await supa.from('meals').update({
        time, slot,
        description: summary,
        kcal: Math.max(0, Math.round(tot.kcal * 10) / 10),
        protein: Math.max(0, Math.round(tot.protein * 10) / 10),
        carbs: Math.max(0, Math.round(tot.carbs * 10) / 10),
        fat: Math.max(0, Math.round(tot.fat * 10) / 10),
        notes: ST.smartForm.notes || null,
      }).eq('id', mealId).eq('user_id', ST.user.id);
      if (updErr) throw updErr;
      const {error: delErr} = await supa.from('meal_items')
        .delete().eq('meal_id', mealId).eq('user_id', ST.user.id);
      if (delErr) throw delErr;
      const itemsPayload = items.map((it, idx) => ({
        meal_id: mealId,
        user_id: ST.user.id,
        name: it.name.trim(),
        quantity: Math.max(0, Math.round((Number(it.quantity)||0) * 10) / 10),
        unit: it.unit || 'g',
        kcal: Math.max(0, Math.round((Number(it.kcal)||0) * 10) / 10),
        protein: Math.max(0, Math.round((Number(it.protein)||0) * 10) / 10),
        carbs: Math.max(0, Math.round((Number(it.carbs)||0) * 10) / 10),
        fat: Math.max(0, Math.round((Number(it.fat)||0) * 10) / 10),
        source: it.source || 'manual',
        sort_order: idx,
      }));
      const {data: savedItems, error: itemsErr} = await supa.from('meal_items').insert(itemsPayload).select();
      if (itemsErr) throw itemsErr;
      // Aggiorna stato locale
      const day = ST.db.days[ST.activeDay];
      if (day) {
        const idx = (day.meals || []).findIndex(m => m.id === mealId || m.local_id === mealId);
        if (idx >= 0) {
          day.meals[idx] = {
            ...day.meals[idx],
            time, slot,
            description: summary,
            kcal: Math.max(0, Math.round(tot.kcal * 10) / 10),
            protein: Math.max(0, Math.round(tot.protein * 10) / 10),
            carbs: Math.max(0, Math.round(tot.carbs * 10) / 10),
            fat: Math.max(0, Math.round(tot.fat * 10) / 10),
            notes: ST.smartForm.notes || null,
            items: savedItems || [],
          };
        }
      }
      showToast('Pasto aggiornato', '✏️');
    } else {
      // ── MODALITÀ NUOVO PASTO ──
      // L'id lo sceglie il telefono (Fondamenta 120): pasto e ingredienti vanno in coda senza rete
      const meal = {
        id: nuovoId(),
        user_id: ST.user.id,
        date: ST.activeDay,
        time, slot,
        description: summary,
        kcal: Math.max(0, Math.round(tot.kcal * 10) / 10),
        protein: Math.max(0, Math.round(tot.protein * 10) / 10),
        carbs: Math.max(0, Math.round(tot.carbs * 10) / 10),
        fat: Math.max(0, Math.round(tot.fat * 10) / 10),
        notes: ST.smartForm.notes || null,
      };
      const mealRes = await scriviConCoda('salvare il pasto', { tabella:'meals', tipo:'insert', righe:meal });
      if (mealRes.error) throw mealRes.error;
      const itemsPayload = items.map((it, idx) => ({
        id: nuovoId(),
        meal_id: meal.id,
        user_id: ST.user.id,
        name: it.name.trim(),
        quantity: Math.max(0, Math.round((Number(it.quantity)||0) * 10) / 10),
        unit: it.unit || 'g',
        kcal: Math.max(0, Math.round((Number(it.kcal)||0) * 10) / 10),
        protein: Math.max(0, Math.round((Number(it.protein)||0) * 10) / 10),
        carbs: Math.max(0, Math.round((Number(it.carbs)||0) * 10) / 10),
        fat: Math.max(0, Math.round((Number(it.fat)||0) * 10) / 10),
        source: it.source || 'manual',
        sort_order: idx,
      }));
      const itemsRes = itemsPayload.length ? await scriviConCoda('salvare gli ingredienti del pasto', { tabella:'meal_items', tipo:'insert', righe:itemsPayload }) : { data:null, error:null };
      const savedItems = itemsPayload;
      const itemsErr = itemsRes.error;
      if (itemsErr) {
        // Rollback meal orfano. Silenzioso perche' l'errore vero viene rilanciato
        // subito dopo e mostrato dal chiamante: due toast sarebbero rumore. Ma se
        // ANCHE il rollback fallisce resta un pasto orfano in tabella, e questo
        // deve comparire in console — e' esattamente il caso che nel postino
        // Nutrition non veniva rilevato da nessuno.
        const rb = await dbq('annullare il pasto incompleto', supa.from('meals').delete().eq('id', meal.id).eq('user_id', ST.user.id), {silenzioso:true});
        if (rb && rb.error) console.error('[db] ROLLBACK FALLITO: il pasto', meal.id, 'resta orfano in tabella meals');
        throw itemsErr;
      }
      const d = getDay(ST.activeDay);
      d.meals.push({
        id: meal.id, local_id: meal.id,
        slot, description: summary, time,
        kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
        notes: meal.notes,
        items: savedItems || [],
      });
      showToast('Pasto registrato');
    }
    ST.smartForm = { items: [], freeText: '', notes: '', analyzing: false, editingMealId: null, editingSlot: null, editingTime: null, editingDescription: '' };
    ST.logOpen = false;
    renderOggi();
    saveCache();
  } catch (e) {
    console.error('Save meal error:', e);
    avvisa('Non riesco a salvare il pasto: ' + (e.message || 'riprova'), { titolo:'Pasto non salvato' });
  }
};

// Renderer del form Smart Ingredient — funzione pura, ritorna HTML.
// I handler `smart*` chiamano renderOggi() per aggiornare il DOM.
function renderRegistraPasto() {
  _initSmartForm();
  const slot = ST.logSlot;
  const slotInfo = MEAL_SLOTS.find(s => s.id === slot);
  const slotLabel = slotInfo ? `${slotInfo.icon} ${slotInfo.label}` : 'Seleziona slot';
  const analyzing = ST.smartForm.analyzing;
  const items = ST.smartForm.items;
  const tot = _smartTotals();
  const hasItems = items.length > 0;
  const anyExpanded = items.some(i => i.expanded);

  const rowsHtml = items.map(it => {
    const calcd = it.name && it.quantity > 0 && (it.kcal > 0 || it.calculating);
    const expanded = it.expanded;
    const arrowStyle = expanded ? 'transform:rotate(90deg);display:inline-block;' : '';
    const headerName = it.name || '(nuovo ingrediente)';
    const headerKcal = it.calculating ? '...' : (calcd ? `${it.kcal} kcal` : 'da compilare');
    const headerKcalColor = calcd ? 'var(--t2)' : 'var(--t3)';
    const qtyDisplay = (it.quantity && it.unit) ? `<span style="font-size:11px;color:var(--t3);font-family:var(--font-mono);flex-shrink:0;margin-left:6px;">${it.quantity}${it.unit}</span>` : '';

    const expandedBlock = expanded ? `
      <div style="margin-top:10px;padding-top:10px;border-top:0.5px dashed var(--s3);">
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <input data-row-name="${it.tempId}" value="${esc(it.name||'')}" placeholder="Alimento" onchange="smartUpdateField('${it.tempId}','name',this.value)" style="flex:2;padding:6px 8px;border:0.5px solid var(--s3);border-radius:6px;font-size:13px;min-width:0;" />
          <input data-row-qty="${it.tempId}" type="number" step="0.1" value="${it.quantity || ''}" placeholder="Qtà" onchange="smartUpdateField('${it.tempId}','quantity',this.value)" style="width:64px;padding:6px;border:0.5px solid var(--s3);border-radius:6px;font-size:13px;text-align:right;" />
          <select data-row-unit="${it.tempId}" onchange="smartUpdateField('${it.tempId}','unit',this.value)" style="width:52px;padding:6px;border:0.5px solid var(--s3);border-radius:6px;font-size:12px;">
            <option value="g" ${it.unit==='g'?'selected':''}>g</option>
            <option value="ml" ${it.unit==='ml'?'selected':''}>ml</option>
            <option value="pz" ${it.unit==='pz'?'selected':''}>pz</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button onclick="smartRecalcRow('${it.tempId}')" ${it.calculating?'disabled':''} style="padding:5px 10px;background:var(--acc-lt);color:var(--acc);border:0.5px solid var(--acc);border-radius:6px;font-size:11px;cursor:pointer;">${it.calculating?'Calcolo...':'✨ Stima coach'}</button>
          ${calcd && !it.calculating ? `<div style="display:flex;gap:4px;font-size:10px;font-family:var(--font-mono);flex-wrap:wrap;">
            <span style="background:var(--carb-lt);color:#854F0B;padding:2px 6px;border-radius:4px;">${it.carbs}g C</span>
            <span style="background:var(--prot-lt);color:#3B6D11;padding:2px 6px;border-radius:4px;">${it.protein}g P</span>
            <span style="background:var(--fat-lt);color:#993C1D;padding:2px 6px;border-radius:4px;">${it.fat}g G</span>
          </div>` : ''}
        </div>
      </div>` : '';

    return `
      <div style="background:var(--s2);border-radius:8px;padding:10px 12px;margin-bottom:6px;">
        <div onclick="smartToggleRow('${it.tempId}')" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
            <span style="color:var(--t3);font-size:10px;${arrowStyle}">▶</span>
            <span style="font-size:13px;font-weight:500;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(headerName)}</span>
            ${qtyDisplay}
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
            <span style="font-size:11px;font-family:var(--font-mono);color:${headerKcalColor};">${headerKcal}</span>
            <button onclick="event.stopPropagation();smartRemoveRow('${it.tempId}')" style="width:22px;height:22px;padding:0;background:transparent;border:none;cursor:pointer;color:var(--t3);font-size:16px;">×</button>
          </div>
        </div>
        ${expandedBlock}
      </div>`;
  }).join('');

  const showTotals = hasItems && items.some(i => i.kcal > 0);
  const totalsCard = showTotals ? `
    <div style="background:var(--s1);border:0.5px solid var(--s3);border-radius:var(--r-lg);padding:14px;margin-top:10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
        <span style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--t2);">Totale pasto</span>
        <span style="font-size:22px;font-weight:600;font-family:var(--font-mono);color:var(--t1);">${tot.kcal} kcal</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">
        <div style="background:var(--carb-lt);border-radius:6px;padding:8px;text-align:center;"><div style="font-size:9px;color:#854F0B;text-transform:uppercase;font-weight:700;">Carbo</div><div style="font-size:14px;font-family:var(--font-mono);color:#854F0B;">${tot.carbs}g</div></div>
        <div style="background:var(--prot-lt);border-radius:6px;padding:8px;text-align:center;"><div style="font-size:9px;color:#3B6D11;text-transform:uppercase;font-weight:700;">Prot</div><div style="font-size:14px;font-family:var(--font-mono);color:#3B6D11;">${tot.protein}g</div></div>
        <div style="background:var(--fat-lt);border-radius:6px;padding:8px;text-align:center;"><div style="font-size:9px;color:#993C1D;text-transform:uppercase;font-weight:700;">Grassi</div><div style="font-size:14px;font-family:var(--font-mono);color:#993C1D;">${tot.fat}g</div></div>
      </div>
      <button onclick="smartSavePasto()" style="width:100%;padding:12px;background:var(--acc);color:white;border:none;border-radius:var(--r-md);font-size:14px;font-weight:500;cursor:pointer;">Salva pasto →</button>
    </div>` : '';

  const toggleAllBtn = items.length > 1 ? `<button onclick="smartToggleAll()" style="background:transparent;border:none;font-size:11px;color:var(--t2);cursor:pointer;padding:0;">${anyExpanded?'Collassa tutti':'Espandi tutti'}</button>` : '';

  const itemsCard = hasItems ? `
    <div style="background:var(--s1);border:0.5px solid var(--s3);border-radius:var(--r-lg);padding:14px;margin-top:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--t2);">Ingredienti (${items.length})</span>
        ${toggleAllBtn}
      </div>
      ${rowsHtml}
      <button onclick="smartAddEmptyRow()" style="width:100%;padding:8px;background:transparent;color:var(--t2);border:0.5px dashed var(--s3);border-radius:6px;font-size:12px;cursor:pointer;margin-top:4px;">+ Aggiungi ingrediente</button>
    </div>` : '';

  const isEditing = !!ST.smartForm.editingMealId;

  return `
    <div id="registra-pasto-form" data-smart-form-root="1" style="background:var(--s1);border:0.5px solid var(--s3);border-radius:var(--r-lg);padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;color:${isEditing?'var(--acc)':'var(--t2)'};">${isEditing?'✏️ Modifica pasto':'+ Registra pasto'} · ${slotLabel}</span>
      </div>

      ${isEditing ? `<button onclick="smartResetForm()" style="background:transparent;border:0.5px solid var(--s3);border-radius:6px;padding:6px 12px;font-size:11px;color:var(--t2);cursor:pointer;margin-bottom:10px;">← Annulla modifica</button>` : ''}

      <div style="font-size:11px;color:var(--t3);margin-bottom:6px;">Cosa hai mangiato?</div>
      <input type="text" id="smart-freetext" value="${esc(ST.smartForm.freeText||'')}" placeholder='Es. &quot;Pasta al tonno con olio&quot;' oninput="smartFreeTextChange(this.value)" style="width:100%;padding:10px;border:0.5px solid var(--s3);border-radius:var(--r-md);font-size:14px;margin-bottom:8px;box-sizing:border-box;" />

      <div style="display:flex;gap:8px;">
        <button onclick="smartAnalyze()" ${analyzing?'disabled':''} style="flex:1;padding:10px;background:var(--acc);color:white;border:none;border-radius:var(--r-md);font-size:13px;font-weight:500;cursor:pointer;">${analyzing?'Analizzo...':'✨ Analizza'}</button>
        <button onclick="smartAddEmptyRow()" style="flex:1;padding:10px;background:transparent;color:var(--t1);border:0.5px solid var(--s3);border-radius:var(--r-md);font-size:13px;cursor:pointer;">+ Manuale</button>
      </div>
    </div>
    ${itemsCard}
    ${totalsCard}
  `;
}

function renderOggi(){
  // Preselezione intelligente del prossimo pasto (rispetta override manuale)
  if(!ST.nextSlotUserOverride){
    const next = computeNextSlot();
    ST.nextSlot = next.slotId;
    ST.nextSlotIsTomorrow = next.isTomorrow;
  }
  const day=getDay(ST.activeDay);
  const meals=day.meals||[];
  const taken=day.suppsTaken||[];
  // Include pasti + integratori standard + integratori extra
  const cons=dayTotals(day);
  const rem=Math.max(0,ST.TARGET.kcal-cons.kcal);
  const allDays=Object.keys(ST.db.days).sort();
  const idx=allDays.indexOf(ST.activeDay);
  const isToday=ST.activeDay===todayKey();
  const bySlot={};MEAL_SLOTS.forEach(s=>{bySlot[s.id]=meals.filter(m=>m.slot===s.id);});
  const actSupps=suppsDelGiorno(day);
  const shakeSupps=actSupps.filter(s=>s.grp==='Shake Mami');
  const otherSupps=actSupps.filter(s=>s.grp!=='Shake Mami');
  const otherSlots=[...new Set(otherSupps.map(s=>s.slot))].sort();
  const nowH = new Date();
  const nowHour = nowH.getHours();
  const zonaOk = (()=>{
    const tot2=cons.protein+cons.carbs+cons.fat;
    if(tot2<5) return false;
    const kP=cons.protein*4,kC=cons.carbs*4,kF=cons.fat*9;
    const totK=kP+kC+kF||1;
    const pP=Math.round(kP/totK*100),pC=Math.round(kC/totK*100),pF=Math.round(kF/totK*100);
    return (pC>=35&&pC<=45)&&(pP>=25&&pP<=35)&&(pF>=25&&pF<=35);
  })();
  const perfect = isToday && nowHour >= 21 && zonaOk && cons.kcal > 800;
  const qualifies = zonaOk && cons.kcal > 800;
  if ((perfect || (!isToday && qualifies)) && !day.giornoPerfetto) { day.giornoPerfetto = true; saveCache(); }
  const showPerfetto = perfect || !!day.giornoPerfetto;

  const dayPct = Math.round(((nowH.getHours()*60 + nowH.getMinutes()) / 1440) * 100);
  const nowLabel = nowH.getHours().toString().padStart(2,'0')+':'+nowH.getMinutes().toString().padStart(2,'0');
  const timebar = isToday ? `<div style="margin:-4px 0 14px;opacity:0.5;"><div style="height:3px;border-radius:3px;background:var(--s3);position:relative;overflow:visible;"><div style="height:100%;border-radius:3px;width:${dayPct}%;background:var(--acc);transition:width .5s ease;position:relative;"><span style="position:absolute;right:-1px;top:-10px;font-size:9px;font-family:'JetBrains Mono',monospace;color:var(--acc);font-weight:700;white-space:nowrap;">${nowLabel}</span></div></div></div>` : '';
  let html=`<div class="day-nav"><button class="btn btn-ghost btn-sm" onclick="navDay(-1)" ${(idx<=0&&ST.storicoCompleto)?'disabled':''}>‹</button><div><div class="day-date">${fmtDate(ST.activeDay)}</div>${isToday?'<div class="day-today">● OGGI</div>':''}</div><button class="btn btn-ghost btn-sm" onclick="navDay(1)" ${isToday?'disabled':''}>›</button></div>
  ${timebar}<div style="display:flex;justify-content:flex-end;margin-bottom:12px;"><button class="btn btn-sm ${day.fasting?'btn-danger':'btn-ghost'}" onclick="toggleFasting()">${day.fasting?'⚡ Digiuno attivo':'Giorno Detox'}</button></div>`;

  if(day.fasting){
    html+=`<div class="fast-screen"><div class="fast-icon">⚡</div><p style="font-size:16px;font-family:'JetBrains Mono',monospace;color:var(--err);margin-bottom:8px;">Giorno di recupero — Digiuno</p><p style="font-size:13px;color:var(--t2);">Acqua, tè, caffè senza zucchero.</p></div>`;
    // Grafici macro integratori assunti (sempre visibile)
    const remFasting = Math.max(0, ST.TARGET.kcal - sTot.kcal);
    html+=`<div class="card card-green"><div class="sum-grid" style="grid-template-columns:1.3fr 1fr 1fr;margin-bottom:12px;">${targetRing(sTot.kcal,ST.TARGET.kcal)}${miniRing(0,ST.TARGET.kcal,'Pasti','var(--carb)')}${miniRing(sTot.kcal,ST.TARGET.kcal,'Integrazione','var(--acc2)')}</div>${macroBar('Carboidrati',sTot.carbs,ST.TARGET.carbs,'var(--carb)')}${macroBar('Proteine',sTot.protein,ST.TARGET.protein,'var(--prot)')}${macroBar('Grassi',sTot.fat,ST.TARGET.fat,'var(--fat)')}${zonaBalance(sTot)}</div>`;
    // Integratori visibili anche in digiuno
    const actSupps=suppsDelGiorno(day);
    const suppSlots=[...new Set(actSupps.map(s=>s.slot))].sort();
    html+=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span class="lbl" style="margin:0;">🌿 Integratori di oggi</span><button class="btn btn-ghost btn-sm" onclick="showPage('integratori')">Gestisci →</button></div>`;
    if(actSupps.length){
      suppSlots.forEach((slot,_si)=>{
        const ss=actSupps.filter(s=>s.slot===slot);
        const slotIdx=[...new Set(actSupps.map(x=>x.slot))].sort().indexOf(slot);
        const sc=SLOT_COLOR_MAP[slot]||SLOT_PAL[slotIdx>=0?slotIdx%SLOT_PAL.length:0];
        const takenN=ss.filter(s=>taken.includes(s.local_id)).length;
        const collapsed=isSuppGroupCollapsed(slot,takenN,ss.length);
        html+=suppGroupHeaderHTML(slot,sc,takenN,ss.length,collapsed,suppGroupLabel(ss));
        if(!collapsed){
          if(_si===0&&taken.length===0) html+=`<p style="font-size:11px;color:var(--t3);margin:2px 0 8px;font-family:'JetBrains Mono',monospace;font-style:italic;">Tocca ✓ per segnare come assunto</p>`;
          ss.forEach(s=>{html+=oggiSuppCardHTML(s,taken);});
        }
      });
    } else {
      html+=`<p style="font-size:13px;color:var(--t3);text-align:center;padding:10px 0;">Nessun integratore attivo.<br><button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="showPage('integratori')">+ Configura integratori</button></p>`;
    }
    html+=`</div>`;
  } else {
    // ── OGGI V3 (15 maggio 2026): hero nuovo + CTA pair + timeline mista + coach card ──
    html += heroCard(cons);

    // Badge Giorno Perfetto (invariato)
    if(showPerfetto) {
      const kP2=cons.protein*4,kC2=cons.carbs*4,kF2=cons.fat*9,totK2=kP2+kC2+kF2||1;
      const pP=Math.round(kP2/totK2*100),pC=Math.round(kC2/totK2*100),pG=100-pP-pC;
      const confettiColors=['var(--acc)','var(--carb)','var(--fat)','#FFD700'];
      const confettiHTML=[0,1,2,3,4,5,6,7].map(i=>`<div class="badge-confetti" style="left:${8+i*12}%;animation-delay:${(i*0.18).toFixed(2)}s;background:${confettiColors[i%4]};"></div>`).join('');
      const perfRatio = `${ST.TARGET.pCarbo||40}·${ST.TARGET.pProt||30}·${ST.TARGET.pFat||30}`;
      html+=`<div class="badge-perfetto">${confettiHTML}<div class="badge-perfetto-inner"><div class="badge-icon">🏆</div><div class="badge-text">Giorno Perfetto</div><div class="badge-sub">Tutti i macro centrati ${perfRatio}</div><div class="badge-macro-row"><span>C ${pC}%</span><span class="sep">·</span><span>P ${pP}%</span><span class="sep">·</span><span>G ${pG}%</span></div></div></div>`;
    }

    // ── CTA pair v3 oppure form attivo (mutualmente esclusivi). Wrapper id per scroll target. ──
    if(!ST.logOpen) {
      html += `<div id="registra-pasto-form" class="oggi-v3-cta-row">
        <button class="oggi-v3-cta oggi-v3-cta-primary" onclick="openMealLogForm()">+ Registra pasto</button>
        <button class="oggi-v3-cta oggi-v3-cta-secondary" onclick="openSuppSheet()">+ Registra integratori</button>
      </div>`;
    } else {
      // Form Smart Ingredient — chrome esterno (slot tabs + time + close) + smart form (logica invariata)
      html += `<div style="margin:14px 0;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;"><div style="display:flex;align-items:center;gap:8px;"><input type="time" id="log-time" value="${ST.logTime||new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}" style="font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--t1);background:var(--b2);border:1px solid var(--b1);border-radius:6px;padding:4px 6px;width:90px;" onchange="ST.logTime=this.value"/></div><button onclick="ST.logOpen=false;ST.smartForm={items:[],freeText:'',notes:'',analyzing:false,editingMealId:null,editingSlot:null,editingTime:null,editingDescription:''};renderOggi();" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3);line-height:1;">×</button></div><div class="slot-tabs">${MEAL_SLOTS.slice(0,3).map(sl=>`<button class="slot-tab ${ST.logSlot===sl.id?'active':''}" onclick="setLogSlot('${sl.id}')"><span class="slot-icon">${sl.icon}</span>${sl.label}</button>`).join('')}</div><div class="slot-tabs" style="grid-template-columns:repeat(3,1fr);">${MEAL_SLOTS.slice(3).map(sl=>`<button class="slot-tab ${ST.logSlot===sl.id?'active':''}" onclick="setLogSlot('${sl.id}')"><span class="slot-icon">${sl.icon}</span>${sl.label}</button>`).join('')}</div><div style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace;margin:8px 0 10px;">${MEAL_SLOTS.find(s=>s.id===ST.logSlot)?.time} · ${MEAL_SLOTS.find(s=>s.id===ST.logSlot)?.desc}</div>${renderRegistraPasto()}</div>`;
    }

    // ── STEP D.2 (22 mag 2026): banner reminder pesata ──
    // Lazy-load ST.weightLogs se non ancora caricato (utente apre Oggi senza
    // essere passato da Piano V4). Al ritorno re-render per aggiornare il banner.
    if(ST.weightLogs === null && ST.user && ST.user.id && ST.user.id !== 'test-user-001' && typeof loadWeightLogs === 'function') {
      loadWeightLogs().then(function() { if(ST.page === 'oggi') renderOggi(); });
    }
    html += renderWeightReminderBannerOggi();

    // ── TIMELINE MISTA: pasti registrati + pianificati dal piano coach ──
    const pianoToday = getTodayPianoMeals();
    ST._plannedRows = []; // popolato durante il render — indici letti da openLogFromPlanned(idx)
    const TIMELINE_SLOTS = ['colazione','snack_mattina','pranzo','snack_pomeriggio','cena'];
    const tlMealEvents = [];

    TIMELINE_SLOTS.forEach(slotId => {
      const slotInfo = MEAL_SLOTS.find(s => s.id === slotId) || MEAL_SLOTS[0];
      const registered = meals.filter(m => m.slot === slotId);
      if(registered.length){
        registered.forEach(m => {
          tlMealEvents.push({ type:'meal', slot:slotInfo, time:(m.time || slotInfo.time || '00:00'), meal:m });
        });
      } else if(pianoToday && pianoToday[slotId]){
        const p = pianoToday[slotId];
        const idx = ST._plannedRows.length;
        ST._plannedRows.push({ slot:slotId, time:slotInfo.time, descrizione:(p.ingredienti || p.piatto || '') });
        tlMealEvents.push({ type:'planned', slot:slotInfo, time:slotInfo.time, planned:p, idx });
      }
    });

    // Pasti EXTRA (slot 'extra') — sempre visibili se registrati (non in TIMELINE_SLOTS)
    meals.filter(m => m.slot === 'extra').forEach(m => {
      const slotInfo = MEAL_SLOTS.find(s => s.id === 'extra') || MEAL_SLOTS[0];
      tlMealEvents.push({ type:'meal', slot:slotInfo, time:(m.time || '00:00'), meal:m });
    });

    // Supps (gruppi e singole) — logica esistente preservata
    const suppBySlot = {};
    if(shakeSupps.length) suppBySlot['06:30'] = shakeSupps;
    otherSlots.forEach(sl => { suppBySlot[sl] = otherSupps.filter(s => s.slot === sl); });
    const tlSuppEvents = [];
    Object.entries(suppBySlot).forEach(([t, ss]) => {
      if(ss.some(s => taken.includes(s.local_id))) tlSuppEvents.push({ type:'supp', time:t, supps:ss });
    });
    (day.rawSuppLogs || []).forEach(log => {
      const supp = ST.supps.find(s => s.name === log.name);
      const coveredByGroup = supp && log.time === (supp.slot || '');
      if(!coveredByGroup){
        const catItem = (ST.catalog || []).find(c => c.nome === log.name);
        tlSuppEvents.push({ type:'supp_log', time:(log.time || '00:00'), log, supp, catItem });
      }
    });

    // Integratori Step 2 (18 mag 2026): aggiungi extras come eventi cronologici
    const tlExtraEvents = (ST.extras || [])
      .filter(x => x.date === ST.activeDay)
      .map(x => ({ type:'extra', time:(x.slot || '00:00'), extra:x }));

    const tlEvents = [...tlMealEvents, ...tlSuppEvents, ...tlExtraEvents].sort((a, b) => a.time.localeCompare(b.time));

    if(tlEvents.length){
      const nReg     = tlEvents.filter(e => e.type === 'meal').length;
      const nPlanned = tlEvents.filter(e => e.type === 'planned').length;
      const nTotMeals = nReg + nPlanned;

      html += `<div class="oggi-v3-timeline-card">
        <div class="oggi-v3-timeline-head">
          <span class="oggi-v3-timeline-title">Timeline di oggi</span>
          <span class="oggi-v3-timeline-eb">${nReg} / ${nTotMeals}</span>
        </div>
        <div class="oggi-v3-timeline-sub">PASTI · PACCHETTI · EXTRA · IN ORDINE CRONOLOGICO</div>`;

      // Helper wrapper timeline connector (riusa pattern pre-5a64cab — dot + time + emoji column).
      const wrapTL = (timeStr, emoji, dotColor, contentHTML, isLast) => {
        const connector = !isLast ? `<div style="position:absolute;left:17px;top:32px;bottom:-12px;width:2px;background:var(--b1);border-radius:1px;opacity:0.3;"></div>` : '';
        const itemSep = !isLast ? 'padding-bottom:6px;' : '';
        return `<div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start;position:relative;${itemSep}">${connector}<div style="min-width:36px;display:flex;flex-direction:column;align-items:center;gap:2px;padding-top:4px;"><div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;"></div><div style="font-size:9px;color:var(--t3);font-family:'JetBrains Mono',monospace;text-align:center;line-height:1.2;">${timeStr}</div><span style="font-size:12px;">${emoji}</span></div><div style="flex:1;min-width:0;">${contentHTML}</div></div>`;
      };

      let _firstSuppGroup = true;
      tlEvents.forEach((ev, evIdx) => {
        const isLast = evIdx === tlEvents.length - 1;
        if(ev.type === 'meal'){
          // Usa mealCardHTML (Smart Ingredient Fase 3): card collassabile con
          // ingredienti espandibili, edit ✏️, delete 🗑️, swipe-to-delete su mobile.
          // Wrappata nel timeline connector pre-5a64cab (dot + ora + emoji slot).
          html += wrapTL(ev.time.slice(0,5), ev.slot.icon, 'var(--acc)', mealCardHTML(ev.meal), isLast);
        } else if(ev.type === 'planned'){
          const p = ev.planned;
          const kcal = p.kcal != null ? fmtNum(p.kcal) : '—';
          html += `<div class="oggi-v3-planned-row" onclick="openLogFromPlanned(${ev.idx})">
            <span class="oggi-v3-meal-time">${ev.time.slice(0,5)}</span>
            <span class="oggi-v3-meal-icon">${ev.slot.icon}</span>
            <div class="oggi-v3-meal-body">
              <div class="oggi-v3-meal-name">${esc(p.piatto || ev.slot.label)}</div>
              <div class="oggi-v3-meal-meta">PIANIFICATO · DAL COACH</div>
            </div>
            <div class="oggi-v3-meal-kcal">${kcal}<span class="oggi-v3-meal-kcal-unit">kcal</span></div>
            <div class="oggi-v3-planned-cta">REGISTRA ›</div>
          </div>`;
        } else if(ev.type === 'supp'){
          // Logica esistente preservata (gruppo integratori)
          const suppIds = ev.supps.map(s => s.local_id).join(',');
          const tlTakenN = ev.supps.filter(s => taken.includes(s.local_id)).length;
          const tlTotal = ev.supps.length;
          const tlCollapsed = isSuppGroupCollapsed(ev.time, tlTakenN, tlTotal);
          const tlCC = (tlTakenN === tlTotal && tlTotal > 0) ? '#1e7a4a' : 'var(--acc)';
          const tlFW = (tlTakenN === tlTotal && tlTotal > 0) ? 700 : 400;
          const tlCh = tlCollapsed ? '▶' : '▼';
          const tlLbl = (s => s === 'INTEGRATORI' ? '+ EXTRA' : `Gruppo "${s}"`)(suppGroupLabel(ev.supps));
          const tlAssuntoLbl = tlTakenN === 1 ? 'assunto' : 'assunti';
          const hint = (_firstSuppGroup && taken.length === 0 && !tlCollapsed) ? `<p style="font-size:11px;color:var(--t3);margin:0 0 8px;font-family:'JetBrains Mono',monospace;font-style:italic;">Tocca ✓ per segnare come assunto</p>` : '';
          _firstSuppGroup = false;
          // Card supps group (header collassabile + lista oggiSuppCardHTML quando espansa) — logica intatta.
          let suppCardHTML = `<div style="background:var(--acc-lt);border:1px solid rgba(42,122,111,.15);border-radius:10px;border-left:3px solid var(--acc);padding:10px 12px;"><div style="display:flex;align-items:center;gap:6px;margin-bottom:${tlCollapsed?0:7}px;cursor:pointer;user-select:none;" onclick="toggleSuppGroup('${ev.time}')"><span style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--acc);font-family:'JetBrains Mono',monospace;font-weight:600;">${tlLbl}</span><input type="time" value="${ev.time}" style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--acc);background:transparent;border:none;border-bottom:1px solid rgba(42,122,111,.4);padding:1px 4px;width:72px;outline:none;" onclick="event.stopPropagation()" onchange="updateSuppSlotTime('${ev.time}',this.value,'${suppIds}')"/><span style="margin-left:auto;font-size:10px;font-family:'JetBrains Mono',monospace;color:${tlCC};font-weight:${tlFW};">${tlTakenN}/${tlTotal} ${tlAssuntoLbl}</span><button onclick="event.stopPropagation();deleteSuppGroup('${ev.time}')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1;padding:2px 4px;" title="Rimuovi gruppo">×</button><span style="font-size:10px;color:var(--t3);">${tlCh}</span></div>${tlCollapsed?'':`${hint}<div>`}`;
          if(!tlCollapsed){ ev.supps.forEach(s => { suppCardHTML += oggiSuppCardHTML(s, taken); }); suppCardHTML += `</div>`; }
          suppCardHTML += `</div>`;
          html += wrapTL(ev.time.slice(0,5), '🌿', 'var(--acc2)', suppCardHTML, isLast);
        } else if(ev.type === 'supp_log'){
          // Extra integratore singolo (logica esistente preservata)
          const logName = esc(ev.log.name);
          const logTime = esc(ev.log.time);
          const logDose = ev.log.dose || parseFloat(ev.supp?.dose_die) || 1;
          const cardHtml = extraSuppCardHTML(ev.supp, ev.catItem, ev.log.name, ev.log.time, logDose);
          if(!ST.extraSuppExpanded) ST.extraSuppExpanded = {};
          const extraKey = (ev.log.name + '|' + ev.log.time).replace(/[^a-zA-Z0-9|]/g, '_');
          const isExtraExpanded = !!ST.extraSuppExpanded[extraKey];
          const arrowExtra = isExtraExpanded ? 'transform:rotate(90deg);display:inline-block;' : '';
          const extraCat = ev.catItem || (ST.catalog || []).find(c => c.nome === ev.log.name);
          const extraSupp = ev.supp || (ST.supps || []).find(s => s.name === ev.log.name);
          const extraBase = parseFloat(extraSupp?.dose_die) || 1;
          const extraMult = Number(logDose) / extraBase || 0;
          const extraKcalTot = Math.round((Number(extraSupp?.kcal ?? extraCat?.kcal ?? 0)) * extraMult);
          // Card extra (toggleExtraSupp + extraSuppCardHTML logica esistente intatta)
          const extraCardHTML = `<div style="background:var(--acc-lt);border:1px solid rgba(42,122,111,.15);border-radius:10px;border-left:3px solid var(--acc);padding:10px 12px;"><div onclick="toggleExtraSupp('${extraKey}')" style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;${isExtraExpanded?'margin-bottom:7px;':''}"><span style="color:var(--t3);font-size:9px;${arrowExtra}">▶</span><span style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--acc);font-family:'JetBrains Mono',monospace;font-weight:600;">Integratori extra</span><span style="margin-left:auto;font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--t2);font-weight:500;">${extraKcalTot} kcal</span><span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:#1e7a4a;font-weight:700;">1 assunto</span><button onclick="event.stopPropagation();deleteSuppLog('${logName}','${logTime}')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1;padding:2px 4px;" title="Rimuovi">×</button></div>${isExtraExpanded?`<div>${cardHtml}</div>`:''}</div>`;
          html += wrapTL(ev.time.slice(0,5), '🌿', 'var(--acc2)', extraCardHTML, isLast);
        } else if(ev.type === 'extra'){
          // Integratori Step 2 (18 mag 2026): card extra dal nuovo flusso supplements_log
          const x = ev.extra;
          const cat = (ST.catalog || []).find(c => c.codice === x.codice || c.nome === x.name);
          const tint = getCatalogTint({ categoria: cat?.categoria || '' });
          const kcalInt = Math.round(x.kcal || 0);
          const hasMacro = (x.carbo + x.proteine + x.grassi) > 0;
          const macroMeta = hasMacro
            ? `<span class="sep">·</span><span class="c">${x.carbo}g C</span><span class="sep">·</span><span class="p">${x.proteine}g P</span><span class="sep">·</span><span class="g">${x.grassi}g G</span>`
            : '';
          const safeName = esc(x.name);
          const extraCardV2 = `<div class="oggi-v3-event oggi-v3-event-extra" onclick="confirmDeleteExtraFromTimeline('${esc(x.id)}','${safeName}')">
            <div class="oggi-v3-event-thumb" style="background:${tint.bg};">${tint.emoji}</div>
            <div class="oggi-v3-event-body">
              <div class="oggi-v3-event-name">${safeName}</div>
              <div class="oggi-v3-event-meta">
                <span>${kcalInt} KCAL · ${x.dose} ${esc((x.dose_unit||'cps').toUpperCase())}</span>
                ${macroMeta}
              </div>
            </div>
            <span class="oggi-v3-event-tag extra">EXTRA</span>
          </div>`;
          html += wrapTL(ev.time.slice(0,5), tint.emoji, 'var(--acc)', extraCardV2, isLast);
        }
      });

      html += `</div>`;
    } else {
      // Nessun pasto registrato né pianificato → placeholder
      html += `<div class="oggi-v3-timeline-card" style="text-align:center;padding:24px 16px;">
        <div style="font-family:'Syne',sans-serif;font-size:15px;color:var(--t2);margin-bottom:4px;">Nessun pasto oggi</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;color:var(--t3);text-transform:uppercase;">Registra il primo pasto per iniziare</div>
      </div>`;
    }

    // ── COACH CARD (Riequilibrio) — sempre dopo la timeline ──
    // Stato silente: zona OK + > 40% target kcal consumate (giornata in linea, nessun riequilibrio urgente)
    const silentMode = (zonaOk === true) && (cons.kcal > (ST.TARGET.kcal * 0.4));
    const nextSlotInfo = MEAL_SLOTS.find(s => s.id === ST.nextSlot);
    const nextLabel = nextSlotInfo
      ? `${nextSlotInfo.label}${nextSlotInfo.time ? ' · ' + nextSlotInfo.time : ''}`
      : 'Prossimo pasto';
    const adviceCtaLbl = (ST.nextSlotIsTomorrow && !ST.nextSlotUserOverride)
      ? `Pianifica colazione di domani →`
      : `Analizza & suggerisci →`;

    if(silentMode && !ST.advice){
      html += `<div class="oggi-v3-coach-card">
        <div class="oggi-v3-coach-head">
          <span class="oggi-v3-coach-eb">COACH · RIEQUILIBRIO</span>
          <span class="oggi-v3-coach-eb-right">PROSSIMO PASTO</span>
        </div>
        <div class="oggi-v3-coach-silent">
          <span style="color:var(--acc);font-weight:700;">✓</span>
          <span>Tutto in linea col piano</span>
        </div>
      </div>`;
    } else {
      html += `<div class="oggi-v3-coach-card">
        <div class="oggi-v3-coach-head">
          <span class="oggi-v3-coach-eb">COACH · RIEQUILIBRIO</span>
          <span class="oggi-v3-coach-eb-right">PROSSIMO PASTO</span>
        </div>
        <div class="oggi-v3-coach-title">${esc(nextLabel)}</div>
        ${ST.advice ? `<div class="oggi-v3-coach-text">${esc(ST.advice)}</div>` : ''}
        <button class="oggi-v3-coach-cta" onclick="fetchAdvice()">${ST.advLoading ? '⏳ Analisi coach…' : adviceCtaLbl}</button>
      </div>`;
    }

    // ── Card integratori bottom (solo se nessun pasto nella timeline ma supps presi) ──
    if(!tlEvents.length){
      const takenShakeN = shakeSupps.filter(s => taken.includes(s.local_id)).length;
      const takenOtherSlots = otherSlots.filter(slot => otherSupps.filter(s => s.slot === slot).some(s => taken.includes(s.local_id)));
      if(takenShakeN > 0 || takenOtherSlots.length > 0){
        html += `<div class="card" style="margin-top:14px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span class="lbl" style="margin:0;">💊 Integratori di oggi</span><button class="btn btn-ghost btn-sm" onclick="showPage('integratori')">Gestisci →</button></div>`;
        if(takenShakeN > 0){
          const slot = '06:30';
          const sc = SLOT_COLOR_MAP[slot] || SLOT_PAL[0];
          const collapsed = isSuppGroupCollapsed(slot, takenShakeN, shakeSupps.length);
          html += suppGroupHeaderHTML(slot, sc, takenShakeN, shakeSupps.length, collapsed, suppGroupLabel(shakeSupps));
          if(!collapsed){ shakeSupps.forEach(s => { html += oggiSuppCardHTML(s, taken); }); }
        }
        takenOtherSlots.forEach(slot => {
          const ss = otherSupps.filter(s => s.slot === slot);
          const allActive = [...new Set(suppsDelGiorno(day).map(x => x.slot))].sort();
          const sc = SLOT_COLOR_MAP[slot] || SLOT_PAL[allActive.indexOf(slot) % SLOT_PAL.length];
          const takenN = ss.filter(s => taken.includes(s.local_id)).length;
          const collapsed = isSuppGroupCollapsed(slot, takenN, ss.length);
          html += suppGroupHeaderHTML(slot, sc, takenN, ss.length, collapsed, suppGroupLabel(ss));
          if(!collapsed){ ss.forEach(s => { html += oggiSuppCardHTML(s, taken); }); }
        });
        html += `</div>`;
      }
    }
  }

  // ── V3 header: accent bar + date eyebrow + "Nutrition" title + IF avatar + sub-nav pill ──
  const profile  = ST.profile || {};
  const fname    = String(profile.first_name || '').trim();
  const lname    = String(profile.last_name  || '').trim();
  const initials = ((fname.charAt(0) + lname.charAt(0)).toUpperCase()) || (fname.charAt(0) || '?').toUpperCase();
  const now2 = new Date();
  const DAY_S  = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
  const MON_S  = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
  const dateEb = `${DAY_S[now2.getDay()]} ${now2.getDate()} ${MON_S[now2.getMonth()]} · OGGI`;
  const v3Header = `
    <div class="oggi-v3-accent"></div>
    <div class="oggi-v3-header">
      <div class="oggi-v3-header-text">
        <div class="oggi-v3-eyebrow">${dateEb}</div>
        <div class="oggi-v3-title">Nutrition</div>
      </div>
      <button class="oggi-v3-avatar" onclick="openSettingsModal()" title="Impostazioni profilo">${esc(initials)}</button>
    </div>
    <div class="oggi-v3-subnav">
      ${['oggi','integratori','analisi','piano'].map(id => {
        const labels = { oggi:'OGGI', integratori:'INTEGRATORI', analisi:'ANALISI', piano:'PIANO' };
        return `<button class="oggi-v3-pill${id==='oggi'?' active':''}" onclick="showPage('${id}')">${labels[id]}</button>`;
      }).join('')}
    </div>`;

  // Integratori Step 2 (18 mag 2026): modal conferma elimina extra (tap su card extra timeline)
  if(ST.pkgExtraDeleteConfirm) {
    const c = ST.pkgExtraDeleteConfirm;
    html += `<div class="info-modal-overlay" style="z-index:1600;" onclick="if(event.target===this)cancelDeleteExtraFromTimeline()">
      <div class="info-modal">
        <h3 style="margin:0 0 10px;font-family:'Syne',sans-serif;font-size:17px;color:var(--t1);">Eliminare la registrazione extra?</h3>
        <p style="font-family:'Syne',sans-serif;font-size:14px;color:var(--t2);line-height:1.5;margin:0 0 18px;">
          ${esc(c.name)} verrà rimosso dal diario di oggi.<br><br>
          <span style="font-size:12px;color:var(--t3);">L'operazione è definitiva.</span>
        </p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-ghost" style="flex:1;" onclick="cancelDeleteExtraFromTimeline()">Annulla</button>
          <button class="btn" style="flex:1;background:#C44434;color:#fff;border:none;" onclick="doDeleteExtraFromTimeline()">Elimina</button>
        </div>
      </div>
    </div>`;
  }

  document.getElementById('page-oggi').innerHTML = v3Header + html + versionFooter();
  const ta = document.getElementById('log-text');
  if(ta){ ta.value = ST.logText; ta.addEventListener('input', e => { ST.logText = e.target.value; }); }
}

// ═══════════════════════════════════════════════════════════
// PAGE: INTEGRATORI v3 (16 mag 2026) — pacchetti + extra
// ═══════════════════════════════════════════════════════════
// Helper — calcola scorta giorni rimasti per un supplement
function _suppDaysLeft(s){
  const dosePerDay = (parseFloat(s.dose_die)||1) * (parseFloat(s.dose_multiplier)||1);
  const totalDoses = parseFloat(s.doses) || 0;
  if(totalDoses<=0 || dosePerDay<=0) return null;
  return Math.floor(totalDoses / dosePerDay);
}
// Helper — ritorna lista dei supplement_id che appartengono a un pacchetto qualunque
function _suppIdsInAnyPackage(){
  const ids = new Set();
  (ST.packages||[]).forEach(p => (p.items||[]).forEach(it => ids.add(it.supplement_id)));
  return ids;
}
// Helper — supplements EXTRA: non in alcun pacchetto, ordinati per slot/sort_order
function _extraSupps(){
  const inPkg = _suppIdsInAnyPackage();
  return (ST.supps||[]).filter(s => !inPkg.has(s.local_id))
    .sort((a,b) => (a.slot||'').localeCompare(b.slot||'') || (a.sort_order||0) - (b.sort_order||0));
}

function renderIntegratori(){
  // ── Header v3 (accent bar + eyebrow + title + avatar) ──
  const profile  = ST.profile || {};
  const fname    = String(profile.first_name || '').trim();
  const lname    = String(profile.last_name  || '').trim();
  const initials = ((fname.charAt(0) + lname.charAt(0)).toUpperCase()) || (fname.charAt(0) || '?').toUpperCase();
  const now2 = new Date();
  const DAY_S = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
  const MON_S = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
  const dateEb = `${DAY_S[now2.getDay()]} ${now2.getDate()} ${MON_S[now2.getMonth()]} · OGGI`;
  const v3Header = `
    <div class="oggi-v3-accent"></div>
    <div class="oggi-v3-header">
      <div class="oggi-v3-header-text">
        <div class="oggi-v3-eyebrow">${dateEb}</div>
        <div class="oggi-v3-title">Nutrition</div>
      </div>
      <button class="oggi-v3-avatar" onclick="openSettingsModal()" title="Impostazioni profilo">${esc(initials)}</button>
    </div>
    <div class="oggi-v3-subnav">
      ${['oggi','integratori','analisi','piano'].map(id => {
        const labels = { oggi:'OGGI', integratori:'INTEGRATORI', analisi:'ANALISI', piano:'PIANO' };
        return `<button class="oggi-v3-pill${id==='integratori'?' active':''}" onclick="showPage('${id}')">${labels[id]}</button>`;
      }).join('')}
    </div>
    <div class="int-v3-scope-note">GESTORE PACCHETTI E EXTRA · LA REGISTRAZIONE VIVE IN OGGI</div>`;

  // ── Sezione "I miei pacchetti" ──
  const pkgs = ST.packages || [];
  const nPkgs = pkgs.length;
  const pkgsLabel = nPkgs === 1 ? '1 GRUPPO' : `${nPkgs} GRUPPI`;
  let pkgsHTML = `<section class="int-v3-section">
    <div class="int-v3-section-head">
      <h2 class="int-v3-section-title">I miei pacchetti</h2>
      <div class="int-v3-section-count">${pkgsLabel}</div>
    </div>
    <div class="int-v3-section-eb">GRUPPI ORARI PERSONALIZZATI</div>`;

  if(nPkgs === 0){
    pkgsHTML += `<div class="int-v3-empty-section">
      <div class="int-v3-empty-emoji">📦</div>
      <div class="int-v3-empty-title">NESSUN PACCHETTO</div>
      <div class="int-v3-empty-text">Crea il tuo primo gruppo orario per organizzare gli integratori.</div>
    </div>`;
  } else {
    pkgsHTML += pkgs.map(p => {
      const nItems = (p.items||[]).length;
      // Il conteggio nudo mentiva: "8 PRODOTTI" contava anche i sospesi, che nella
      // giornata non compaiono. Se ce n'è almeno uno, il cartellino lo dichiara.
      const nSosp = (p.items||[]).filter(it => it.supplement && !it.supplement.active).length;
      const itemsLabel = (nItems === 1 ? '1 PRODOTTO' : `${nItems} PRODOTTI`)
        + (nSosp > 0 ? ` · ${nSosp} SOSPES${nSosp === 1 ? 'O' : 'I'}` : '');
      // Stock warn: se uno qualsiasi degli items ha ≤7gg
      const hasLowStock = (p.items||[]).some(it => {
        const d = _suppDaysLeft(it.supplement);
        return d !== null && d <= 7;
      });
      const stockHtml = hasLowStock
        ? `<span class="int-v3-pkg-stock-warn"><span class="int-v3-pkg-stock-dot"></span>SCORTA BASSA</span>`
        : '';
      return `<div class="int-v3-pkg-card" onclick="openPackageEditor('${esc(p.id)}')">
        <div class="int-v3-pkg-emoji">${esc(p.emoji || '📦')}</div>
        <div class="int-v3-pkg-body">
          <div class="int-v3-pkg-name">${esc(p.name || 'Pacchetto')}</div>
          <div class="int-v3-pkg-meta">
            <span>${itemsLabel} · ${esc(p.time || '')}</span>
            ${stockHtml}
          </div>
        </div>
        <span class="int-v3-pkg-chev">›</span>
      </div>`;
    }).join('');
  }

  pkgsHTML += `<button class="int-v3-cta primary" onclick="openPackageEditor(null)">
    <span class="int-v3-cta-label">+ Nuovo pacchetto</span>
    <span class="int-v3-cta-tag">Nutrilite</span>
  </button>`;
  pkgsHTML += `</section>`;

  // ── Sezione "Integratori extra" ──
  const extras = _extraSupps();
  const activeExtras = extras.filter(s => s.active);
  const nExtras = activeExtras.length;
  let extrasHTML = `<section class="int-v3-section">
    <div class="int-v3-section-head">
      <h2 class="int-v3-section-title">Integratori extra</h2>
      <div class="int-v3-section-count">${nExtras} ATTIVI</div>
    </div>
    <div class="int-v3-section-eb">SINGOLI CON ORARIO</div>`;

  // I sospesi non si mescolano più agli attivi: prima erano disegnati identici e
  // solo il contatore "N ATTIVI" li escludeva, quindi la lista contraddiceva la
  // sua stessa intestazione. Ora stanno sotto una riga di separazione, smorzati.
  const sospesiExtras = extras.filter(s => !s.active);
  const rigaExtra = (s, sospeso) => `
      <div class="int-v3-extra-row${sospeso?' sospeso':''}" onclick="openExtraEditor('${esc(s.local_id)}')">
        <div class="int-v3-extra-time">${esc(s.slot || '--:--')}</div>
        <div class="int-v3-extra-name">${esc(s.name)}</div>
        ${sospeso?'<span class="zt-badge-sospeso">Sospeso</span>':''}
        <span class="int-v3-extra-more">···</span>
      </div>`;

  if(extras.length === 0){
    extrasHTML += `<div class="int-v3-empty-section">
      <div class="int-v3-empty-emoji">💊</div>
      <div class="int-v3-empty-title">NESSUN EXTRA</div>
      <div class="int-v3-empty-text">Gli integratori fuori dai pacchetti compaiono qui.</div>
    </div>`;
  } else {
    if(activeExtras.length === 0){
      extrasHTML += `<div class="int-v3-empty-section">
        <div class="int-v3-empty-emoji">⏸️</div>
        <div class="int-v3-empty-title">NESSUN EXTRA ATTIVO</div>
        <div class="int-v3-empty-text">Sono tutti sospesi. Aprine uno e premi Riprendi per rimetterlo nella tua giornata.</div>
      </div>`;
    } else {
      extrasHTML += activeExtras.map(s => rigaExtra(s, false)).join('');
    }
    if(sospesiExtras.length > 0){
      extrasHTML += `<div class="int-v3-sospesi-head">Sospesi · ${sospesiExtras.length}</div>`;
      extrasHTML += sospesiExtras.map(s => rigaExtra(s, true)).join('');
    }
  }

  extrasHTML += `<button class="int-v3-cta secondary" onclick="openCatalogForExtra()">
    <span class="int-v3-cta-label">+ Singolo integratore</span>
    <span class="int-v3-cta-tag">Nutrilite</span>
  </button>`;
  extrasHTML += `</section>`;

  document.getElementById('page-integratori').innerHTML = v3Header + pkgsHTML + extrasHTML + versionFooter();
}

// ═══════════════════════════════════════════════════════════
// PAGE: ANALISI v3 (18 maggio 2026) — refresh tab Storico → Analisi
// Dashboard analitica: switch finestra (SETTIMANA/MESE/3M/6M) + chart kcal +
// heatmap status zona + macro distribution + drilldown dettaglio giorno
// Dati: solo ST.db.days (cache locale). Refresh A: ridisegno totale a ogni interazione.
// Target macro %: dinamici da ST.TARGET.pCarbo/pProt/pFat (fallback 40/30/30).
// ═══════════════════════════════════════════════════════════
const ANALISI_DAY_S = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
const ANALISI_MON_S = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
const ANALISI_MON_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

// ── HELPER: range della finestra corrente (offset 0=corrente, -1=precedente) ──
function _analisiGetWindowRange(window, offset) {
  offset = offset || 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let start, end;
  if(window === 'SETTIMANA') {
    const dow = today.getDay(); // 0=DOM, 1=LUN
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    start = new Date(today); start.setDate(today.getDate() - daysFromMonday + offset * 7);
    end = new Date(start); end.setDate(start.getDate() + 6);
  } else if(window === 'MESE') {
    start = new Date(today.getFullYear(), today.getMonth() + offset, 1, 12);
    end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0, 12);
  } else if(window === '3MESI') {
    start = new Date(today.getFullYear(), today.getMonth() - 2 + offset * 3, 1, 12);
    end = new Date(today.getFullYear(), today.getMonth() + 1 + offset * 3, 0, 12);
  } else { // 6MESI
    start = new Date(today.getFullYear(), today.getMonth() - 5 + offset * 6, 1, 12);
    end = new Date(today.getFullYear(), today.getMonth() + 1 + offset * 6, 0, 12);
  }
  return { start, end };
}

// ── HELPER: label intestazione finestra (eyebrow + range data) ──
function _analisiGetWindowLabel(window, offset, start, end) {
  offset = offset || 0;
  if(window === 'SETTIMANA') {
    let eb = 'QUESTA SETTIMANA';
    if(offset === -1) eb = 'SETTIMANA SCORSA';
    else if(offset < -1) eb = `${Math.abs(offset)} SETTIMANE FA`;
    const range = `${start.getDate()} ${ANALISI_MON_S[start.getMonth()]} — ${end.getDate()} ${ANALISI_MON_S[end.getMonth()]} ${end.getFullYear()}`;
    return { eb, range };
  }
  if(window === 'MESE') {
    const eb = `${ANALISI_MON_FULL[start.getMonth()].toUpperCase()} ${start.getFullYear()}`;
    return { eb, range: '' };
  }
  if(window === '3MESI') {
    const eb = `${ANALISI_MON_S[start.getMonth()]} — ${ANALISI_MON_S[end.getMonth()]} ${end.getFullYear()}`;
    return { eb, range: '' };
  }
  // 6MESI
  const eb = `${ANALISI_MON_S[start.getMonth()]} — ${ANALISI_MON_S[end.getMonth()]} ${end.getFullYear()}`;
  return { eb, range: '' };
}

// ── HELPER: status zona per chiave giorno ──
// Tolleranza: ±2% in zona, ±5% quasi zona. Target dinamici dal profilo.
function _zoneStatusForDayKey(key) {
  const dayData = ST.db.days && ST.db.days[key];
  if(!dayData || dayData.fasting) return 'noData';
  const cons = dayTotals(dayData);
  const tot = cons.protein + cons.carbs + cons.fat;
  if(tot < 5 || cons.kcal < 50) return 'noData';
  const tPC = ST.TARGET.pCarbo || 40;
  const tPP = ST.TARGET.pProt  || 30;
  const tPF = ST.TARGET.pFat   || 30;
  const kP = cons.protein * 4, kC = cons.carbs * 4, kF = cons.fat * 9;
  const totK = kP + kC + kF || 1;
  const pP = Math.round(kP / totK * 100);
  const pC = Math.round(kC / totK * 100);
  const pF = Math.round(kF / totK * 100);
  const inZ   = Math.abs(pC - tPC) <= 2 && Math.abs(pP - tPP) <= 2 && Math.abs(pF - tPF) <= 2;
  const nearZ = Math.abs(pC - tPC) <= 5 && Math.abs(pP - tPP) <= 5 && Math.abs(pF - tPF) <= 5;
  return inZ ? 'inZone' : (nearZ ? 'almostZone' : 'outOfZone');
}

// ── HELPER: itera giorni del range, ritorna array di {date, key, dayData, totals, status, mealsN, extrasN} ──
function _analisiCollectDays(start, end) {
  const result = [];
  const d = new Date(start);
  d.setHours(12, 0, 0, 0);
  while(d <= end) {
    const key = dayKey(d);   // locale, coerente col Cantiere Giorno (era toISOString)
    const dayData = ST.db.days && ST.db.days[key] ? ST.db.days[key] : null;
    const totals = dayData ? dayTotals(dayData) : {kcal:0, protein:0, carbs:0, fat:0};
    const status = _zoneStatusForDayKey(key);
    const mealsN = dayData?.meals?.length || 0;
    const extrasN = ((ST.extrasByDay && ST.extrasByDay[key]) || []).length;
    result.push({ date: new Date(d), key, dayData, totals, status, mealsN, extrasN });
    d.setDate(d.getDate() + 1);
  }
  return result;
}

// ── HELPER: aggregati per range ──
function _analisiAggregate(days) {
  const withData = days.filter(d => d.totals.kcal > 0);
  const avg = (arr, key) => arr.length ? Math.round(arr.reduce((a, d) => a + d.totals[key], 0) / arr.length) : 0;
  const avgKcal = avg(withData, 'kcal');
  const avgProt = avg(withData, 'protein');
  const avgCarb = avg(withData, 'carbs');
  const avgFat  = avg(withData, 'fat');
  const inZoneN = days.filter(d => d.status === 'inZone').length;
  const totalMeals = withData.reduce((a, d) => a + (d.mealsN || 0), 0);
  const avgMeals = withData.length ? (totalMeals / withData.length) : 0;
  // Macro % calcolate sulla media giornaliera
  let avgPC = 0, avgPP = 0, avgPF = 0;
  if(withData.length) {
    const totalKcalFromMacro = avgCarb * 4 + avgProt * 4 + avgFat * 9 || 1;
    avgPC = Math.round((avgCarb * 4 / totalKcalFromMacro) * 100);
    avgPP = Math.round((avgProt * 4 / totalKcalFromMacro) * 100);
    avgPF = Math.round((avgFat  * 9 / totalKcalFromMacro) * 100);
  }
  return {
    avgKcal, avgProt, avgCarb, avgFat,
    inZoneN, totalDays: days.length, withDataN: withData.length,
    totalMeals, avgMeals,
    avgPC, avgPP, avgPF,
  };
}

// ── SVG COMPONENT: area chart kcal giornaliere vs target ──
// data: array di {key, totals.kcal, hasExtras, isToday}
function _analisiRenderAreaChart(daysData, targetKcal, windowKind) {
  const W = 340, H = 160;
  const padL = 32, padR = 16, padT = 14, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = daysData.length;
  if(n === 0) return '<svg viewBox="0 0 340 160" class="analisi-v3-chart-svg"></svg>';

  // Max Y: max tra kcal max e target con margine 10%
  const maxKcal = Math.max(...daysData.map(d => d.kcal || 0), targetKcal || 0, 1);
  const yMax = Math.ceil(maxKcal * 1.1 / 500) * 500 || 500;

  // X positions
  const xFor = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yFor = (v) => padT + innerH - (v / yMax) * innerH;
  const yTarget = yFor(targetKcal || 0);

  // Linea + area path (skip giorni senza dati per area chart connessa: usiamo NaN per break-up)
  const pointsWithData = daysData.map((d, i) => ({ i, x: xFor(i), y: yFor(d.kcal || 0), hasData: (d.kcal || 0) > 0, isToday: d.isToday, hasExtras: d.hasExtras, key: d.key }));

  // Area path: connessa tra punti con dati
  let areaPath = '';
  let linePath = '';
  let firstWithData = null, lastWithData = null;
  pointsWithData.forEach((p, idx) => {
    if(p.hasData) {
      if(firstWithData === null) {
        firstWithData = p;
        linePath = `M ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      } else {
        linePath += ` L ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }
      lastWithData = p;
    }
  });
  if(firstWithData && lastWithData) {
    const baseY = padT + innerH;
    areaPath = `M ${firstWithData.x.toFixed(1)},${baseY.toFixed(1)} L ${firstWithData.x.toFixed(1)},${firstWithData.y.toFixed(1)} ` +
      pointsWithData.filter(p => p.hasData).map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L ${lastWithData.x.toFixed(1)},${baseY.toFixed(1)} Z`;
  }

  // Asse Y: 3 tick (0, mid, max)
  const yTicks = [0, Math.round(yMax / 2), yMax];
  const yAxisHTML = yTicks.map(t => {
    const y = yFor(t);
    return `<text x="${padL - 6}" y="${y.toFixed(1)}" font-family="JetBrains Mono,monospace" font-size="8" fill="#8E8779" text-anchor="end" dominant-baseline="central">${t >= 1000 ? (t/1000)+'k' : t}</text>`;
  }).join('');

  // Asse X: label giorni o mese a seconda della finestra
  let xLabels = '';
  if(windowKind === 'SETTIMANA') {
    const DAYL = ['L','M','M','G','V','S','D'];
    daysData.forEach((d, i) => {
      const dateObj = new Date(d.key + 'T12:00:00');
      const dow = dateObj.getDay();
      const lbl = DAYL[dow === 0 ? 6 : dow - 1];
      const x = xFor(i);
      xLabels += `<text x="${x.toFixed(1)}" y="${(H - 12).toFixed(1)}" font-family="JetBrains Mono,monospace" font-size="9" fill="#8E8779" text-anchor="middle">${lbl}</text>`;
      xLabels += `<text x="${x.toFixed(1)}" y="${(H - 2).toFixed(1)}" font-family="JetBrains Mono,monospace" font-size="8" fill="#C8C3B8" text-anchor="middle">${dateObj.getDate()}</text>`;
    });
  } else if(windowKind === 'MESE') {
    // Ogni ~5 giorni
    const step = Math.max(1, Math.ceil(n / 6));
    for(let i = 0; i < n; i += step) {
      const dateObj = new Date(daysData[i].key + 'T12:00:00');
      const x = xFor(i);
      xLabels += `<text x="${x.toFixed(1)}" y="${(H - 6).toFixed(1)}" font-family="JetBrains Mono,monospace" font-size="8.5" fill="#8E8779" text-anchor="middle">${dateObj.getDate()}</text>`;
    }
  } else {
    // 3M/6M: mostra label mese sui primi giorni di ciascun mese
    let lastMonth = -1;
    daysData.forEach((d, i) => {
      const dateObj = new Date(d.key + 'T12:00:00');
      const month = dateObj.getMonth();
      if(month !== lastMonth) {
        const x = xFor(i);
        xLabels += `<text x="${x.toFixed(1)}" y="${(H - 6).toFixed(1)}" font-family="JetBrains Mono,monospace" font-size="8.5" font-weight="600" fill="#8E8779" text-anchor="middle">${ANALISI_MON_S[month]}</text>`;
        lastMonth = month;
      }
    });
  }

  // Linea target tratteggiata
  const targetLine = targetKcal > 0 ? `
    <line x1="${padL}" y1="${yTarget.toFixed(1)}" x2="${(W - padR).toFixed(1)}" y2="${yTarget.toFixed(1)}" stroke="#8E8779" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>
    <text x="${(W - padR - 2).toFixed(1)}" y="${(yTarget - 4).toFixed(1)}" font-family="JetBrains Mono,monospace" font-size="8" fill="#8E8779" text-anchor="end">TGT ${targetKcal}</text>` : '';

  // Dots cliccabili (solo punti con dati)
  let dots = '';
  pointsWithData.forEach(p => {
    if(!p.hasData && !p.isToday) return;
    // Asta verticale extras (dot terracotta sotto)
    if(p.hasExtras && p.hasData) {
      dots += `<circle cx="${p.x.toFixed(1)}" cy="${(yFor(0) + 4).toFixed(1)}" r="2.5" fill="#C44434" opacity="0.65"/>`;
    }
    if(p.isToday && !p.hasData) {
      // Oggi senza dati: dot vuoto + dashed
      dots += `<circle class="chart-dot" cx="${p.x.toFixed(1)}" cy="${yFor(0).toFixed(1)}" r="5" fill="#FFFFFF" stroke="${'#2A7A6F'}" stroke-width="1.5" stroke-dasharray="2 2" onclick="openDayDetailScreen('${p.key}')"/>`;
    } else if(p.isToday && p.hasData) {
      dots += `<circle class="chart-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#FFFFFF" stroke="${'#2A7A6F'}" stroke-width="2.5" stroke-dasharray="2 2" onclick="openDayDetailScreen('${p.key}')"/>`;
    } else if(p.hasData) {
      dots += `<circle class="chart-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#2A7A6F" stroke="#FFFFFF" stroke-width="1.5" onclick="openDayDetailScreen('${p.key}')"/>`;
    }
  });

  // Tap zones invisibili (più grandi per touch) — solo dove ci sono dati
  let tapZones = '';
  pointsWithData.forEach(p => {
    if(!p.hasData && !p.isToday) return;
    const cx = p.x.toFixed(1);
    const cy = (p.y || yFor(0)).toFixed(1);
    tapZones += `<circle class="chart-tap" cx="${cx}" cy="${cy}" r="14" fill="transparent" onclick="openDayDetailScreen('${p.key}')"/>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" class="analisi-v3-chart-svg" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="analisiAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2A7A6F" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#2A7A6F" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${yAxisHTML}
    ${targetLine}
    ${areaPath ? `<path d="${areaPath}" fill="url(#analisiAreaGrad)"/>` : ''}
    ${linePath ? `<path d="${linePath}" fill="none" stroke="#2A7A6F" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    ${dots}
    ${tapZones}
    ${xLabels}
  </svg>`;
}

// ── SVG COMPONENT: heatmap status zona ──
// daysData: array { key, status, date, isToday }
// kind: 'week' (7 in riga) | 'month' (griglia 7×N) | 'multi-month' (1 griglia per mese)
function _analisiRenderHeatmap(daysData, kind) {
  if(daysData.length === 0) {
    return '<div class="analisi-v3-empty-text">Nessun dato</div>';
  }
  const cellHTML = (d, showLabel) => {
    const cls = d.status === 'inZone' ? 'in-zone'
      : d.status === 'almostZone' ? 'almost-zone'
      : d.status === 'outOfZone'  ? 'out-of-zone'
      : 'no-data';
    const todayCls = d.isToday ? ' today' : '';
    const dn = new Date(d.key + 'T12:00:00').getDate();
    const click = (d.status === 'noData' && !d.dayData) ? '' : `onclick="openDayDetailScreen('${d.key}')"`;
    return `<div class="analisi-v3-heatmap-cell ${cls}${todayCls}" ${click}>${showLabel ? dn : ''}</div>`;
  };

  if(kind === 'week') {
    return `<div class="analisi-v3-heatmap-grid w-week">${daysData.map(d => cellHTML(d, true)).join('')}</div>`;
  }

  if(kind === 'month') {
    // Padding celle vuote all'inizio per allineare con dom della settimana
    if(daysData.length === 0) return '';
    const firstDate = new Date(daysData[0].key + 'T12:00:00');
    const firstDow = firstDate.getDay();
    const padN = firstDow === 0 ? 6 : firstDow - 1; // lun-dom layout
    let cells = '';
    for(let i = 0; i < padN; i++) cells += '<div class="analisi-v3-heatmap-cell empty"></div>';
    cells += daysData.map(d => cellHTML(d, true)).join('');
    return `<div class="analisi-v3-heatmap-grid w-month">${cells}</div>`;
  }

  // multi-month: raggruppa per mese, una mini-griglia ciascuno
  const byMonth = {};
  daysData.forEach(d => {
    const dt = new Date(d.key + 'T12:00:00');
    const monthKey = dt.getFullYear() + '-' + String(dt.getMonth()).padStart(2, '0');
    if(!byMonth[monthKey]) byMonth[monthKey] = { label: `${ANALISI_MON_FULL[dt.getMonth()]} ${dt.getFullYear()}`, days: [] };
    byMonth[monthKey].days.push(d);
  });
  return Object.values(byMonth).map(({label, days}) => {
    const firstDate = new Date(days[0].key + 'T12:00:00');
    const firstDow = firstDate.getDay();
    const padN = firstDow === 0 ? 6 : firstDow - 1;
    let cells = '';
    for(let i = 0; i < padN; i++) cells += '<div class="analisi-v3-heatmap-cell empty"></div>';
    cells += days.map(d => cellHTML(d, true)).join('');
    return `<div>
      <div class="analisi-v3-heatmap-mini-head">${label.toUpperCase()}</div>
      <div class="analisi-v3-heatmap-grid w-month">${cells}</div>
    </div>`;
  }).join('');
}

// ── COMPONENT: macro distribution bars (carbo/prot/fat) ──
function _analisiRenderMacroBars(agg, target) {
  const tPC = (target && target.pCarbo) || 40;
  const tPP = (target && target.pProt)  || 30;
  const tPF = (target && target.pFat)   || 30;
  const macros = [
    { name: 'CARBO',    grams: agg.avgCarb, pct: agg.avgPC, target: tPC, cls: 'c' },
    { name: 'PROTEINE', grams: agg.avgProt, pct: agg.avgPP, target: tPP, cls: 'p' },
    { name: 'GRASSI',   grams: agg.avgFat,  pct: agg.avgPF, target: tPF, cls: 'g' },
  ];
  return `<div class="analisi-v3-macro-list">
    ${macros.map(m => {
      const fillW = Math.min(100, Math.max(0, m.pct));
      const tickLeft = Math.min(100, Math.max(0, m.target));
      return `<div class="analisi-v3-macro-bar-block">
        <div class="analisi-v3-macro-bar-head">
          <span class="analisi-v3-macro-bar-label ${m.cls}">${m.name}</span>
          <span class="analisi-v3-macro-bar-val">${m.grams}g</span>
        </div>
        <div class="analisi-v3-macro-bar-sub">${m.pct}% · TGT ${m.target}%</div>
        <div class="analisi-v3-macro-bar-track">
          <div class="analisi-v3-macro-bar-fill ${m.cls}" style="width:${fillW}%;"></div>
          <div class="analisi-v3-macro-bar-tick" style="left:${tickLeft}%;"></div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ── RENDER: shell + window switch (chiamata 1 volta da showPage) ──
function renderAnalisiShell() {
  if(!ST.analisi) ST.analisi = { window: 'SETTIMANA', dateOffset: 0 };
  const profile  = ST.profile || {};
  const fname    = String(profile.first_name || '').trim();
  const lname    = String(profile.last_name  || '').trim();
  const initials = ((fname.charAt(0) + lname.charAt(0)).toUpperCase()) || (fname.charAt(0) || '?').toUpperCase();
  const now2 = new Date();
  const dateEb = `${ANALISI_DAY_S[now2.getDay()]} ${now2.getDate()} ${ANALISI_MON_S[now2.getMonth()]} · ANALISI`;
  const v3Header = `
    <div class="oggi-v3-accent"></div>
    <div class="oggi-v3-header">
      <div class="oggi-v3-header-text">
        <div class="oggi-v3-eyebrow">${dateEb}</div>
        <div class="oggi-v3-title">Nutrition</div>
      </div>
      <button class="oggi-v3-avatar" onclick="openSettingsModal()" title="Impostazioni profilo">${esc(initials)}</button>
    </div>
    <div class="oggi-v3-subnav">
      ${['oggi','integratori','analisi','piano'].map(id => {
        const labels = { oggi:'OGGI', integratori:'INTEGRATORI', analisi:'ANALISI', piano:'PIANO' };
        return `<button class="oggi-v3-pill${id==='analisi'?' active':''}" onclick="showPage('${id}')">${labels[id]}</button>`;
      }).join('')}
    </div>`;

  const windows = ['SETTIMANA','MESE','3MESI','6MESI'];
  const winLabels = { 'SETTIMANA':'Settimana', 'MESE':'Mese', '3MESI':'3 mesi', '6MESI':'6 mesi' };
  const winBar = `<div class="analisi-v3-window-bar">${windows.map(w =>
    `<button class="analisi-v3-window-pill${ST.analisi.window===w?' active':''}" onclick="setAnalisiWindow('${w}')">${winLabels[w].toUpperCase()}</button>`
  ).join('')}</div>`;

  document.getElementById('page-analisi').innerHTML = v3Header + winBar + `<div id="analisi-content"></div>` + versionFooter();
}

// ── RENDER: contenuto dinamico (cambia su switch finestra e nav date) ──
function renderAnalisiContent(senzaAttesa) {
  if(!ST.analisi) ST.analisi = { window: 'SETTIMANA', dateOffset: 0 };
  const window = ST.analisi.window;
  const offset = ST.analisi.dateOffset || 0;
  const { start, end } = _analisiGetWindowRange(window, offset);
  // Fondamenta 100, tappa 4: all'avvio c'e' solo lo storico recente. Se la finestra scelta (o quella
  // di confronto, la precedente) parte prima, si legge il resto una volta e poi si disegna: mai
  // grafici con buchi finti nel frattempo. senzaAttesa = chiamata dopo la lettura, si disegna comunque.
  if(!senzaAttesa) {
    const prevR = _analisiGetWindowRange(window, offset - 1);
    const primo = dayKey(prevR.start < start ? prevR.start : start);
    if(!storicoCopreDal(primo)) {
      const box = document.getElementById('analisi-content');
      if(box) box.innerHTML = '<div class="int-v3-empty-section" style="margin:16px"><div class="int-v3-empty-text">Carico lo storico\u2026</div></div>';
      caricaStoricoCompleto().then(ok => {
        if(!ok) { try { showToast('Non riesco a leggere tutto lo storico', '\u26a0\ufe0f', 5500); } catch(e){} }
        if(ST.page === 'analisi') renderAnalisiContent(true);
      });
      return;
    }
  }
  const days = _analisiCollectDays(start, end);
  const agg = _analisiAggregate(days);
  const todayKey_ = todayKey();

  // Marca giorni con isToday + hasExtras + kcal (per chart)
  const chartData = days.map(d => ({
    key: d.key,
    kcal: d.totals.kcal,
    hasExtras: d.extrasN > 0,
    isToday: d.key === todayKey_,
  }));
  const heatmapData = days.map(d => ({
    key: d.key,
    status: d.status,
    dayData: d.dayData,
    isToday: d.key === todayKey_,
  }));

  // Eyebrow + range nav
  const lbl = _analisiGetWindowLabel(window, offset, start, end);
  const canNext = offset < 0; // non si naviga nel futuro
  const navHead = `<div class="analisi-v3-nav-head">
    <button class="analisi-v3-nav-btn" onclick="setAnalisiDateOffset(${offset - 1})">‹</button>
    <div style="text-align:center;flex:1;">
      <div class="analisi-v3-nav-eb">${lbl.eb}</div>
      ${lbl.range ? `<div class="analisi-v3-nav-range">${lbl.range}</div>` : ''}
    </div>
    <button class="analisi-v3-nav-btn" onclick="setAnalisiDateOffset(${offset + 1})" ${canNext ? '' : 'disabled'}>›</button>
  </div>`;

  // Nota dati parziali (mostriamo sempre con info N/totale)
  const isWeekCurrent = (window === 'SETTIMANA' && offset === 0);
  const expectedDays = isWeekCurrent ? (() => {
    // Per settimana corrente, conta solo i giorni passati o oggi
    return days.filter(d => d.key <= todayKey_).length;
  })() : days.length;
  const showParzNote = agg.withDataN < expectedDays;
  const parzNote = showParzNote
    ? `<div class="analisi-v3-parz">DATI PARZIALI · ${agg.withDataN}/${days.length} GIORNI</div>`
    : '';

  // Stat cards
  // Confronto con vista precedente (solo SETTIMANA)
  let kcalDelta = null, zoneDelta = null;
  if(window === 'SETTIMANA') {
    const prev = _analisiGetWindowRange(window, offset - 1);
    const prevDays = _analisiCollectDays(prev.start, prev.end);
    const prevAgg = _analisiAggregate(prevDays);
    kcalDelta = agg.avgKcal - prevAgg.avgKcal;
    zoneDelta = agg.inZoneN - prevAgg.inZoneN;
  }
  const fmtDelta = (d, unit) => {
    if(d === null || d === 0) return '';
    const sign = d > 0 ? '↑' : '↓';
    const cls = d > 0 ? 'up' : 'down';
    return `<div class="analisi-v3-stat-sub ${cls}">${sign} ${Math.abs(d)} ${unit}</div>`;
  };
  const adherencePct = days.length ? Math.round((agg.inZoneN / days.length) * 100) : 0;
  const statCards = `<div class="analisi-v3-stat-row">
    <div class="analisi-v3-stat-card">
      <div class="analisi-v3-stat-eb">MEDIA KCAL/DIE</div>
      <div class="analisi-v3-stat-val${agg.avgKcal >= 10000 ? ' small' : ''}">${fmtNum(agg.avgKcal)}</div>
      ${window === 'SETTIMANA' ? fmtDelta(kcalDelta, 'VS PREC.') : `<div class="analisi-v3-stat-sub">${agg.withDataN > 0 ? 'KCAL/GIORNO' : 'NESSUN DATO'}</div>`}
    </div>
    <div class="analisi-v3-stat-card">
      <div class="analisi-v3-stat-eb">GIORNI IN ZONA</div>
      <div class="analisi-v3-stat-val">${agg.inZoneN}<span style="font-size:14px;color:var(--t3);font-weight:500;">/${days.length}</span></div>
      ${window === 'SETTIMANA' ? fmtDelta(zoneDelta, 'VS PREC.') : `<div class="analisi-v3-stat-sub">${adherencePct}% ADERENZA</div>`}
    </div>
    <div class="analisi-v3-stat-card">
      <div class="analisi-v3-stat-eb">PASTI MEDIA/DIE</div>
      <div class="analisi-v3-stat-val">${agg.avgMeals.toFixed(1)}</div>
      <div class="analisi-v3-stat-sub">${agg.totalMeals} TOTALI</div>
    </div>
  </div>`;

  // Confronto settimana vs settimana (compatto, solo per SETTIMANA)
  let vsPrev = '';
  if(window === 'SETTIMANA' && (kcalDelta !== null || zoneDelta !== null)) {
    const prevRange = _analisiGetWindowRange(window, offset - 1);
    const prevLbl = `${prevRange.start.getDate()}-${prevRange.end.getDate()} ${ANALISI_MON_S[prevRange.start.getMonth()]}`;
    const zonePart = zoneDelta > 0 ? `<span class="up">↑ ${zoneDelta} GIORN${zoneDelta === 1 ? 'O' : 'I'} IN ZONA</span>`
      : zoneDelta < 0 ? `<span class="down">↓ ${Math.abs(zoneDelta)} GIORN${Math.abs(zoneDelta) === 1 ? 'O' : 'I'} IN ZONA</span>`
      : `STESSI GIORNI IN ZONA`;
    const kcalPart = kcalDelta > 0 ? `<span class="up">+${kcalDelta} KCAL MEDIA</span>`
      : kcalDelta < 0 ? `<span class="down">${kcalDelta} KCAL MEDIA</span>`
      : `KCAL INVARIATE`;
    vsPrev = `<div class="analisi-v3-vs-prev">VS SETT. SCORSA · ${prevLbl} <span class="sep">·</span> ${zonePart} <span class="sep">·</span> ${kcalPart}</div>`;
  }

  // Chart kcal
  const targetKcal = ST.TARGET.kcal || 2000;
  const chartHTML = `<section class="analisi-v3-section">
    <div class="analisi-v3-section-head">
      <span class="analisi-v3-section-eb">ANDAMENTO KCAL · VS TARGET ${targetKcal}</span>
    </div>
    <h3 class="analisi-v3-section-title">Calorie giornaliere</h3>
    <div class="analisi-v3-chart-wrap">${_analisiRenderAreaChart(chartData, targetKcal, window)}</div>
    <div class="analisi-v3-chart-legend">
      <span class="leg-item"><span class="leg-dot"></span>KCAL REALI</span>
      <span class="leg-item"><span class="leg-dot extra"></span>EXTRA REGISTRATO</span>
      <span class="leg-item"><span class="leg-line"></span>TARGET</span>
    </div>
  </section>`;

  // Heatmap
  const tPC = ST.TARGET.pCarbo || 40;
  const tPP = ST.TARGET.pProt  || 30;
  const tPF = ST.TARGET.pFat   || 30;
  const heatmapKind = window === 'SETTIMANA' ? 'week'
    : window === 'MESE'      ? 'month'
    : 'multi-month';
  const heatmapHTML = `<section class="analisi-v3-section">
    <div class="analisi-v3-section-head">
      <span class="analisi-v3-section-eb">STATUS ZONA · GIORNO PER GIORNO</span>
      <span class="analisi-v3-section-count">${agg.inZoneN}/${days.length}</span>
    </div>
    <h3 class="analisi-v3-section-title">Aderenza ${tPC}/${tPP}/${tPF}</h3>
    <div class="analisi-v3-heatmap">${_analisiRenderHeatmap(heatmapData, heatmapKind)}</div>
    <div class="analisi-v3-heatmap-legend">
      <span class="leg-item"><span class="leg-dot iz"></span>IN ZONA</span>
      <span class="leg-item"><span class="leg-dot az"></span>QUASI</span>
      <span class="leg-item"><span class="leg-dot oz"></span>FUORI</span>
      <span class="leg-item"><span class="leg-dot nd"></span>NO DATI</span>
    </div>
  </section>`;

  // Macro distribution
  const macroHTML = `<section class="analisi-v3-section">
    <div class="analisi-v3-section-head">
      <span class="analisi-v3-section-eb">MACRO DISTRIBUTION</span>
    </div>
    <h3 class="analisi-v3-section-title">Media giornaliera</h3>
    ${_analisiRenderMacroBars(agg, ST.TARGET)}
  </section>`;

  // Empty state generale (zero giorni con dati)
  let content;
  if(agg.withDataN === 0) {
    content = `<div class="analisi-v3-empty">
      <div class="analisi-v3-empty-emoji">📊</div>
      <div class="analisi-v3-empty-title">Nessun dato in questa finestra</div>
      <div class="analisi-v3-empty-text">REGISTRA PASTI IN OGGI PER VEDERE LE TENDENZE</div>
    </div>`;
  } else {
    content = statCards + vsPrev + chartHTML + heatmapHTML + macroHTML;
  }

  const wrap = `<div class="analisi-v3-content">${navHead}${parzNote}${content}</div>`;
  const target = document.getElementById('analisi-content');
  if(target) target.innerHTML = wrap;
}

// ── RENDER entry point ──
function renderAnalisi() {
  renderAnalisiShell();
  renderAnalisiContent();
}

// ── Handler: cambia finestra (SETTIMANA / MESE / 3MESI / 6MESI) ──
function setAnalisiWindow(window) {
  if(!ST.analisi) ST.analisi = { window: 'SETTIMANA', dateOffset: 0 };
  if(ST.analisi.window === window) return;
  ST.analisi.window = window;
  ST.analisi.dateOffset = 0; // reset offset al cambio finestra
  renderAnalisi(); // ridisegna shell + content (la shell aggiorna la pill attiva)
}

// ── Handler: cambia offset date (‹ / ›) ──
function setAnalisiDateOffset(offset) {
  if(!ST.analisi) ST.analisi = { window: 'SETTIMANA', dateOffset: 0 };
  if(offset > 0) return; // mai nel futuro
  ST.analisi.dateOffset = offset;
  renderAnalisiContent();
}

// ═══════════════════════════════════════════════════════════
// DAY DETAIL OVERLAY — drilldown chart/heatmap → dettaglio giorno
// ═══════════════════════════════════════════════════════════
function openDayDetailScreen(dateStr) {
  ST.dayDetailScreen = { date: dateStr, menuOpen: false };
  renderDayDetailScreen();
}

function closeDayDetailScreen() {
  const el = document.getElementById('daydetail-overlay');
  if(el) {
    const screen = el.querySelector('.daydetail-screen');
    if(screen) screen.classList.add('dismissing');
    setTimeout(() => {
      ST.dayDetailScreen = null;
      const ex = document.getElementById('daydetail-overlay');
      if(ex) ex.remove();
    }, 200);
  } else {
    ST.dayDetailScreen = null;
  }
}

function dayDetailToggleMenu() {
  if(!ST.dayDetailScreen) return;
  ST.dayDetailScreen.menuOpen = !ST.dayDetailScreen.menuOpen;
  renderDayDetailScreen();
}

function dayDetailModifyTap() {
  if(!ST.dayDetailScreen) return;
  const date = ST.dayDetailScreen.date;
  // Naviga tab Oggi a quella data
  closeDayDetailScreen();
  setTimeout(() => goToDay(date), 220);
}

function renderDayDetailScreen() {
  if(!ST.dayDetailScreen) return;
  const date = ST.dayDetailScreen.date;
  const dayData = ST.db.days && ST.db.days[date] ? ST.db.days[date] : null;
  const totals = dayData ? dayTotals(dayData) : {kcal:0, protein:0, carbs:0, fat:0};
  const status = _zoneStatusForDayKey(date);

  // Verifica se il giorno è nella settimana corrente (per visibilità kebab)
  const todayKey_ = todayKey();
  const { start: weekStart, end: weekEnd } = _analisiGetWindowRange('SETTIMANA', 0);
  const dt = new Date(date + 'T12:00:00');
  const isInCurrentWeek = dt >= weekStart && dt <= weekEnd;

  // Title data formatted
  const dateObj = new Date(date + 'T12:00:00');
  const dowL = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][dateObj.getDay()];
  const monL = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][dateObj.getMonth()];
  const titleStr = `${dowL} ${dateObj.getDate()} ${monL} ${dateObj.getFullYear()}`;

  // Status pill
  const tPC = ST.TARGET.pCarbo || 40;
  const tPP = ST.TARGET.pProt  || 30;
  const tPF = ST.TARGET.pFat   || 30;
  const statusLabel = status === 'inZone' ? 'NELLA ZONA'
    : status === 'almostZone' ? 'QUASI ZONA'
    : status === 'outOfZone'  ? 'FUORI ZONA'
    : 'NESSUN DATO';
  const statusClass = status === 'inZone' ? 'in-zone'
    : status === 'almostZone' ? 'almost-zone'
    : status === 'outOfZone'  ? 'out-of-zone'
    : 'no-data';
  const statusPill = `<span class="daydetail-summary-pill ${statusClass}"><span class="dot"></span>${statusLabel}</span>`;
  const targetStr = `<span class="daydetail-summary-target">${tPC} · ${tPP} · ${tPF} ±2%</span>`;

  // Kcal summary
  const targetKcal = ST.TARGET.kcal || 2000;
  const kcalDelta = totals.kcal - targetKcal;
  const deltaCls = Math.abs(kcalDelta) < 50 ? 'ok' : (kcalDelta > 0 ? 'over' : 'under');
  const deltaSign = kcalDelta > 0 ? '+' : '';
  const deltaLbl = Math.abs(kcalDelta) < 50 ? 'IN LINEA' : (kcalDelta > 0 ? `${deltaSign}${kcalDelta} OLTRE TARGET` : `${kcalDelta} VS TARGET`);

  const kcalRow = `<div class="daydetail-summary-kcal">
    <div>
      <div class="daydetail-summary-kcal-val">${fmtNum(totals.kcal)} <span style="font-size:12px;color:var(--t3);font-weight:500;letter-spacing:.08em;">KCAL</span></div>
      <div class="daydetail-summary-kcal-target">su ${fmtNum(targetKcal)} obiettivo</div>
    </div>
    <div class="daydetail-summary-delta ${deltaCls}">${deltaLbl}</div>
  </div>`;

  // Macro bars
  const macroAgg = {
    avgCarb: totals.carbs,
    avgProt: totals.protein,
    avgFat:  totals.fat,
    avgPC: 0, avgPP: 0, avgPF: 0,
  };
  if((totals.carbs + totals.protein + totals.fat) > 0) {
    const totKcal = totals.carbs * 4 + totals.protein * 4 + totals.fat * 9 || 1;
    macroAgg.avgPC = Math.round((totals.carbs * 4 / totKcal) * 100);
    macroAgg.avgPP = Math.round((totals.protein * 4 / totKcal) * 100);
    macroAgg.avgPF = Math.round((totals.fat * 9 / totKcal) * 100);
  }
  const macroBars = _analisiRenderMacroBars(macroAgg, ST.TARGET);

  // Timeline read-only del giorno
  const meals = (dayData && dayData.meals) || [];
  const taken = (dayData && dayData.suppsTaken) || [];
  const rawLogs = (dayData && dayData.rawSuppLogs) || [];
  // Extras V3 — dall'archivio storico: disponibili per ogni giorno, non solo per
  // quello visualizzato (prima gli altri giorni li vedevano sempre a zero).
  const extras = ((ST.extrasByDay && ST.extrasByDay[date]) || []);

  // Costruisci eventi cronologici
  const events = [];
  meals.forEach(m => {
    const slotInfo = MEAL_SLOTS.find(s => s.id === m.slot) || MEAL_SLOTS[0];
    events.push({
      type: 'meal',
      time: (m.time || slotInfo.time || '00:00'),
      icon: slotInfo.icon,
      name: m.description || slotInfo.label,
      kcal: m.kcal || 0,
      slot: slotInfo,
    });
  });
  // Supplements taken (gruppi)
  if(taken.length > 0 && ST.supps) {
    const groups = {};
    ST.supps.forEach(s => {
      if(taken.includes(s.local_id)) {
        const slot = s.slot || '08:00';
        if(!groups[slot]) groups[slot] = { time: slot, items: [] };
        groups[slot].items.push(s);
      }
    });
    Object.values(groups).forEach(g => {
      const names = g.items.map(s => s.name).join(' · ');
      const totKcal = Math.round(g.items.reduce((a, s) => a + (Number(s.kcal) || 0) * (Number(s.dose_multiplier) || 1), 0));
      events.push({
        type: 'pkg',
        time: g.time,
        icon: '🌿',
        name: `${g.items.length} integratori`,
        meta: names,
        kcal: totKcal,
        tag: 'PACCHETTO',
      });
    });
  }
  // Raw supp logs (extra integratori legacy)
  rawLogs.forEach(log => {
    const supp = (ST.supps || []).find(s => s.name === log.name);
    const coveredByGroup = supp && log.time === (supp.slot || '');
    if(!coveredByGroup) {
      events.push({
        type: 'supp_log',
        time: log.time || '00:00',
        icon: '🌿',
        name: log.name,
        kcal: 0,
        tag: 'EXTRA',
      });
    }
  });
  // Extras V3
  extras.forEach(x => {
    events.push({
      type: 'extra',
      time: x.slot || '00:00',
      icon: '🌿',
      name: x.name,
      meta: `${x.dose} ${(x.dose_unit || 'cps').toUpperCase()}`,
      kcal: Math.round(x.kcal || 0),
      tag: 'EXTRA',
    });
  });

  // Sort by time
  events.sort((a, b) => String(a.time).localeCompare(String(b.time)));

  const tlBody = events.length > 0
    ? events.map(ev => `
        <div class="daydetail-evt">
          <span class="daydetail-evt-time">${ev.time.slice(0,5)}</span>
          <span class="daydetail-evt-icon">${ev.icon}</span>
          <div class="daydetail-evt-body">
            <div class="daydetail-evt-name">${esc(ev.name)}</div>
            ${ev.meta ? `<div class="daydetail-evt-meta">${esc(ev.meta)}</div>` : ''}
          </div>
          <span class="daydetail-evt-kcal">${ev.kcal > 0 ? ev.kcal + ' kcal' : ''}</span>
          ${ev.tag ? `<span class="daydetail-evt-tag ${ev.tag === 'EXTRA' ? 'extra' : 'pkg'}">${ev.tag}</span>` : ''}
        </div>`).join('')
    : `<div class="daydetail-evt-empty">Nessun evento registrato</div>`;

  // Menu kebab (solo settimana corrente)
  const kebabBtn = isInCurrentWeek
    ? `<button class="daydetail-kebab" onclick="dayDetailToggleMenu()" title="Modifica giorno">···</button>`
    : `<span class="daydetail-kebab hidden">·</span>`;
  const menuHTML = (ST.dayDetailScreen.menuOpen && isInCurrentWeek)
    ? `<div class="daydetail-menu-overlay" onclick="if(event.target===this)dayDetailToggleMenu()">
         <div class="daydetail-menu">
           <button class="daydetail-menu-item" onclick="dayDetailModifyTap()">Modifica giorno</button>
           <div class="daydetail-menu-helper">SOLO PER GIORNI DELLA SETT. CORRENTE</div>
         </div>
       </div>`
    : '';

  const overlayHTML = `<div id="daydetail-overlay" class="daydetail-overlay" onclick="if(event.target===this)closeDayDetailScreen()">
    <div class="daydetail-screen">
      <div class="daydetail-accent"></div>
      <div class="daydetail-header">
        <button class="daydetail-back" onclick="closeDayDetailScreen()">‹ INDIETRO</button>
        <div class="daydetail-title">${titleStr}</div>
        ${kebabBtn}
      </div>
      <div class="daydetail-body">
        <section class="daydetail-summary-card">
          <div class="daydetail-summary-zona">${statusPill}${targetStr}</div>
          ${kcalRow}
          ${macroBars}
        </section>
        <section class="daydetail-timeline-card">
          <div class="daydetail-timeline-eb">TIMELINE GIORNATA · READ-ONLY · ${events.length} EVENT${events.length === 1 ? 'O' : 'I'}</div>
          <h3 class="daydetail-timeline-title">Cosa hai registrato</h3>
          ${tlBody}
        </section>
      </div>
    </div>
    ${menuHTML}
  </div>`;

  // Inserisci/aggiorna l'overlay
  const existing = document.getElementById('daydetail-overlay');
  if(existing) {
    existing.outerHTML = overlayHTML;
  } else {
    document.body.insertAdjacentHTML('beforeend', overlayHTML);
  }
}

// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// PAGE: PIANO V4 — Coach Attivo (Step B.1, 20 maggio 2026)
// Scaffolding minimo: header v3 + sub-nav pillole + nav settimane.
// Niente dati reali, niente fetch Supabase.
// Roadmap completa: vedi CLAUDE.md sezione "Tab Piano v4".
// ═══════════════════════════════════════════════════════════

// Helper: ritorna Date del lunedì della settimana corrente + offset (in settimane)
function getPianoV4WeekStart(offset) {
  offset = offset || 0;
  const now = new Date();
  const day = now.getDay();                // 0=DOM, 1=LUN, ..., 6=SAB
  const diff = (day === 0) ? -6 : (1 - day); // distanza al lunedì (ISO)
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + (offset * 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Helper: label settimana in italiano (es. "Settimana del 19 mag 2026")
function formatPianoV4WeekLabel(date) {
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `Settimana del ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Helper: ritorna array di 7 giorni {name, dateLabel, isToday} a partire dal lunedì
// della settimana visualizzata. Nomi italiani in caps, data formato "DD mmm".
function getPianoV4Days(weekStart) {
  const dayNames = ['LUNEDÌ','MARTEDÌ','MERCOLEDÌ','GIOVEDÌ','VENERDÌ','SABATO','DOMENICA'];
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const today = new Date(); today.setHours(0,0,0,0);
  const todayTs = today.getTime();
  return dayNames.map(function(name, i) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    d.setHours(0,0,0,0);
    return {
      name: name,
      dateLabel: d.getDate() + ' ' + months[d.getMonth()],
      isToday: d.getTime() === todayTs,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// PIANO V4 Step C.1 (20 mag 2026) — Overlay Dettaglio Giorno
// Scaffolding apertura/chiusura. Contenuto pasti arriva in C.3.
// Pattern slide-up 240ms parallelo a daydetail-overlay di Analisi v3 (intatto).
// ═══════════════════════════════════════════════════════════

// Helper: formatta header data overlay (es. "LUN 25 MAG 2026")
// weekOffset = offset in settimane dalla corrente; dayOfWeek = 1-7 ISO (lun=1, dom=7)
function _pianoV4FormatDayHeader(weekOffset, dayOfWeek) {
  const DAY_S = ['LUN','MAR','MER','GIO','VEN','SAB','DOM']; // index 0..6 = ISO 1..7
  const MON_S = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
  const weekStart = getPianoV4WeekStart(weekOffset || 0);
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + (dayOfWeek - 1));
  return `${DAY_S[dayOfWeek - 1]} ${d.getDate()} ${MON_S[d.getMonth()]} ${d.getFullYear()}`;
}

// Apertura overlay: snapshot weekOffset corrente per non perdere navigazione
function openPianoV4DayOverlay(dayOfWeek) {
  if (!ST.page) return; // defensive guard
  ST.pianoV4DayOverlay = {
    dayOfWeek: dayOfWeek,
    weekOffset: ST.pianoV4WeekOffset || 0,
  };
  // Passo 2 (25 mag): fire-and-forget load del piano vero per la settimana.
  // Se cache già popolata → no-op. Se non ancora → al ritorno re-render automatico.
  try {
    const iso = _pianoV4WeekStartIsoForOffset(ST.pianoV4DayOverlay.weekOffset);
    if (!_pianoV4GetCachedPlanWeek(iso)) _pianoV4LoadRealPlanForWeek(iso);
  } catch (e) { /* defensive */ }
  renderPianoV4DayOverlay();
}

// Chiusura overlay con slide-down 200ms + cleanup state + remove dal DOM
function closePianoV4DayOverlay() {
  const el = document.getElementById('pianov4-day-overlay');
  if (el) {
    const screen = el.querySelector('.pianov4-day-screen');
    if (screen) screen.classList.add('dismissing');
    setTimeout(function() {
      ST.pianoV4DayOverlay = null;
      const ex = document.getElementById('pianov4-day-overlay');
      if (ex) ex.remove();
    }, 200);
  } else {
    ST.pianoV4DayOverlay = null;
  }
}

// ═══════════════════════════════════════════════════════════
// PIANO V4 Step E.1 (22 maggio 2026) — Welcome overlay domenicale
// Cartello fullscreen che annuncia il piano nutrizionale della settimana
// successiva, generato dal coach AI. PARTE 1: solo UI + lettura dati reali
// + forzatura di collaudo. PARTE 2 (sessione successiva): trigger automatico
// in base a plan_generation_day/time + recupero giorno-dopo + anti-nag.
// ═══════════════════════════════════════════════════════════
function _pianoV4WelcomeFormatHeaderDate(d) {
  // "DOM 25 MAG · 20:14"
  const DAY_S = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
  const MON_S = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${DAY_S[d.getDay()]} ${d.getDate()} ${MON_S[d.getMonth()]} · ${hh}:${mm}`;
}
function _pianoV4WelcomeFormatWeekRange(weekStartIso) {
  // weekStartIso = "YYYY-MM-DD" (lunedì). Output: "SETTIMANA 26 MAG – 1 GIU"
  // Parse manuale per evitare shift fuso orario su new Date('YYYY-MM-DD')
  const parts = weekStartIso.split('-');
  const y = parseInt(parts[0],10);
  const m = parseInt(parts[1],10) - 1;
  const d = parseInt(parts[2],10);
  const start = new Date(y, m, d, 12, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 12, 0, 0);
  const MON_S = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
  const sM = MON_S[start.getMonth()];
  const eM = MON_S[end.getMonth()];
  if (sM === eM) {
    return `SETTIMANA ${start.getDate()} – ${end.getDate()} ${eM}`;
  }
  return `SETTIMANA ${start.getDate()} ${sM} – ${end.getDate()} ${eM}`;
}

// Fetch della draft più recente dell'utente loggato. Ritorna null se non esiste.
async function _pianoV4LoadDraftPlan() {
  if (!ST.user || !ST.user.id || ST.user.id === 'test-user-001') return null;
  try {
    const { data, error } = await supa
      .from('weekly_plans')
      .select('id, week_start, target_kcal, target_protein, target_carbs, target_fat, ai_reasoning, status')
      .eq('user_id', ST.user.id)
      .eq('status', 'draft')
      .order('week_start', { ascending: false })
      .limit(1);
    if (error) {
      console.warn('[welcome] fetch draft error:', error);
      return null;
    }
    return (data && data.length) ? data[0] : null;
  } catch (e) {
    console.warn('[welcome] fetch draft exception:', e);
    return null;
  }
}

// Confronto target draft vs ST.TARGET. Ritorna {anyDiff, kcal, protein, carbs, fat}
// dove ogni macro ha {oldVal, newVal, delta, dir: 'up'|'down'|'same'}.
function _pianoV4WelcomeComputeDiff(draft) {
  const cur = ST.TARGET || { kcal:1900, protein:143, carbs:190, fat:63 };
  function diff(oldV, newV) {
    const o = Math.round(Number(oldV) || 0);
    const n = Math.round(Number(newV) || 0);
    const d = n - o;
    return {
      oldVal: o,
      newVal: n,
      delta: d,
      absDelta: Math.abs(d),
      dir: d === 0 ? 'same' : (d > 0 ? 'up' : 'down'),
    };
  }
  const r = {
    kcal:    diff(cur.kcal,    draft.target_kcal),
    protein: diff(cur.protein, draft.target_protein),
    carbs:   diff(cur.carbs,   draft.target_carbs),
    fat:     diff(cur.fat,     draft.target_fat),
  };
  r.anyDiff = (r.kcal.dir !== 'same' || r.protein.dir !== 'same' || r.carbs.dir !== 'same' || r.fat.dir !== 'same');
  return r;
}

// Apre l'overlay (lettura draft + render). Modalità:
//   - mode === 'force-test': stampa diagnosi nel report di collaudo
function openPianoV4WelcomeOverlay(mode) {
  (async function() {
    const draft = await _pianoV4LoadDraftPlan();
    if (!draft) {
      if (mode === 'force-test') {
        showToast('Nessun piano draft per questo utente', 'ℹ️');
      }
      return; // silent return se nessuna draft (regola Parte 1)
    }
    ST.pianoV4WelcomeOverlay = {
      draft: draft,
      diff: _pianoV4WelcomeComputeDiff(draft),
      submitting: false,
      mode: mode || null,
    };
    renderPianoV4WelcomeOverlay();
  })();
}

function closePianoV4WelcomeOverlay() {
  const el = document.getElementById('pianov4-welcome-overlay');
  if (el) {
    el.classList.add('dismissing');
    setTimeout(function() {
      ST.pianoV4WelcomeOverlay = null;
      const ex = document.getElementById('pianov4-welcome-overlay');
      if (ex) ex.remove();
    }, 180);
  } else {
    ST.pianoV4WelcomeOverlay = null;
  }
}

// CTA primaria "Vedi piano →": UPDATE weekly_plans.status draft→active, chiude
// overlay, naviga a tab Piano.
async function pianoV4WelcomeConfirmAndOpen() {
  if (!ST.pianoV4WelcomeOverlay || ST.pianoV4WelcomeOverlay.submitting) return;
  const draft = ST.pianoV4WelcomeOverlay.draft;
  const mode  = ST.pianoV4WelcomeOverlay.mode;
  ST.pianoV4WelcomeOverlay.submitting = true;
  // Disabilita CTA mentre lavora
  const btn = document.getElementById('pianov4-welcome-cta-primary');
  if (btn) btn.disabled = true;

  try {
    const { error } = await supa
      .from('weekly_plans')
      .update({ status: 'active' })
      .eq('id', draft.id)
      .eq('user_id', ST.user.id);
    if (error) {
      console.warn('[welcome] activate error:', error);
      showToast('Errore: ' + (error.message || 'impossibile attivare il piano'), '⚠️');
      ST.pianoV4WelcomeOverlay.submitting = false;
      if (btn) btn.disabled = false;
      return;
    }
  } catch (e) {
    console.warn('[welcome] activate exception:', e);
    showToast('Errore di rete', '⚠️');
    ST.pianoV4WelcomeOverlay.submitting = false;
    if (btn) btn.disabled = false;
    return;
  }

  // E.2: scrivi il flag "visto" SOLO se l'overlay era stato aperto via trigger
  // automatico. Per le forzature di collaudo (?welcome=1 / ztTestWelcome) il
  // flag NON viene scritto — il bypass deve restare totale e non sporcare lo
  // stato di produzione (riapri subito ?welcome=1 e l'overlay torna identico).
  if (mode === 'auto' && draft && draft.week_start) {
    _pianoV4WelcomeAckSet(draft.week_start);
  }

  closePianoV4WelcomeOverlay();
  // Vai a tab Piano
  showPage('piano');
}

// Pulsante "RIGENERA PIANO →" nel tab Piano v4.
// Bypassa skip-day E skip-existing: cancella il piano esistente per questa week_start
// e rigenera da zero. Rollback automatico se la chiamata AI fallisce.
async function pianoV4RigeneraPiano() {
  if (ST._pianoRigeneraLoading) return;
  if (!await chiediConferma('I pasti attuali verranno sostituiti.', { titolo:'Rigenerare il piano di questa settimana?', ok:'Rigenera' })) return;
  ST._pianoRigeneraLoading = true;
  if (ST.page === 'piano') renderPianoV4(); // mostra bottone disabilitato + "GENERAZIONE IN CORSO…"
  try {
    await _pianoV4MaybePostino({ forceAll: true, toastOnSkip: true });
    // Invalida cache per la settimana corrente così il re-render legge i nuovi dati
    const weekIso = _pianoV4WeekStartIsoForOffset(ST.pianoV4WeekOffset || 0);
    if (ST.pianoV4RealPlanCache) delete ST.pianoV4RealPlanCache[weekIso];
    await _pianoV4LoadRealPlanForWeek(weekIso);
  } catch (e) {
    console.warn('[rigenera-piano] exception:', e);
    showToast('Errore durante la rigenerazione. Riprova.', '⚠️', 5500);
  } finally {
    ST._pianoRigeneraLoading = false;
    if (ST.page === 'piano') renderPianoV4();
  }
}

// CTA secondaria "Più tardi": chiude e basta. Status resta 'draft'. Nessuna mutation DB.
// E.2: scrive il flag "visto" solo se l'overlay era stato aperto via trigger automatico.
function pianoV4WelcomeLater() {
  if (ST.pianoV4WelcomeOverlay) {
    const mode  = ST.pianoV4WelcomeOverlay.mode;
    const draft = ST.pianoV4WelcomeOverlay.draft;
    if (mode === 'auto' && draft && draft.week_start) {
      _pianoV4WelcomeAckSet(draft.week_start);
    }
  }
  closePianoV4WelcomeOverlay();
}

// Render dell'overlay. Re-render safe (rimuove DOM esistente se presente).
function renderPianoV4WelcomeOverlay() {
  const st = ST.pianoV4WelcomeOverlay;
  if (!st || !st.draft) return;
  const { draft, diff } = st;

  // Rimuovi esistente per re-render pulito
  const ex = document.getElementById('pianov4-welcome-overlay');
  if (ex) ex.remove();

  // Header
  const now = new Date();
  const headerDate = _pianoV4WelcomeFormatHeaderDate(now);
  const weekLabel = _pianoV4WelcomeFormatWeekRange(draft.week_start);

  // Voce coach (testo da DB; fallback se mancante)
  const voiceRaw = (draft.ai_reasoning || '').trim();
  const voiceText = voiceRaw || (diff.anyDiff
    ? 'Adattamento basato sul tuo trend recente.'
    : 'I tuoi obiettivi attuali stanno funzionando: continua così.');

  // Costruisci card centrale in base alla variante
  let cardHTML;
  if (diff.anyDiff) {
    cardHTML = _pianoV4WelcomeRenderVariantA(diff);
  } else {
    cardHTML = _pianoV4WelcomeRenderVariantB(diff);
  }

  // Compone overlay
  const html = `<div id="pianov4-welcome-overlay" class="pianov4-welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome overlay piano settimanale">
    <div class="pianov4-welcome-scroll">
      <div class="pianov4-welcome-header">
        <div class="pianov4-welcome-chip-row">
          <div class="pianov4-welcome-chip">ZT</div>
          <div class="pianov4-welcome-chip-text">COACH · ${esc(headerDate)}</div>
        </div>
        <div class="pianov4-welcome-week-label">${esc(weekLabel)}</div>
        <h1 class="pianov4-welcome-title">Il piano della prossima settimana è pronto</h1>
      </div>

      ${cardHTML}

      <div class="pianov4-welcome-voice">
        <div class="pianov4-welcome-voice-icon">✦</div>
        <div class="pianov4-welcome-voice-body">
          <div class="pianov4-welcome-voice-label">Voce del coach</div>
          <div class="pianov4-welcome-voice-text">${esc(voiceText)}</div>
        </div>
      </div>

      <div class="pianov4-welcome-actions">
        <button id="pianov4-welcome-cta-primary" class="pianov4-welcome-cta-primary" onclick="pianoV4WelcomeConfirmAndOpen()">Vedi piano →</button>
        <button class="pianov4-welcome-cta-secondary" onclick="pianoV4WelcomeLater()">Più tardi</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

// VARIANTE A — almeno un target differisce
function _pianoV4WelcomeRenderVariantA(diff) {
  // Pill delta kcal
  function fmtDeltaPillKcal(d) {
    if (d.dir === 'same') return `<span class="pianov4-welcome-delta-pill same">= INVARIATO</span>`;
    const arrow = d.dir === 'down' ? '↓' : '↑';
    const sign  = d.dir === 'down' ? '−' : '+';
    return `<span class="pianov4-welcome-delta-pill ${d.dir}">${arrow} ${sign}${d.absDelta} KCAL</span>`;
  }
  // Macro pill
  function fmtDeltaPillG(d) {
    if (d.dir === 'same') return `<span class="pianov4-welcome-macro-pill same">= INVARIATO</span>`;
    const arrow = d.dir === 'down' ? '↓' : '↑';
    const sign  = d.dir === 'down' ? '−' : '+';
    return `<span class="pianov4-welcome-macro-pill ${d.dir}">${arrow} ${sign}${d.absDelta} G</span>`;
  }
  // Macro row builder (kind = 'c' | 'p' | 'g'; label = etichetta uppercase)
  function macroBlock(kind, label, d) {
    return `<div class="pianov4-welcome-macro">
      <div class="pianov4-welcome-macro-label ${kind}">${label}</div>
      <div class="pianov4-welcome-macro-row">
        <span class="pianov4-welcome-macro-old">${d.oldVal}</span>
        <span class="pianov4-welcome-macro-arrow">→</span>
        <span class="pianov4-welcome-macro-new ${kind}">${d.newVal}</span>
        <span class="pianov4-welcome-macro-unit">g</span>
      </div>
      ${fmtDeltaPillG(d)}
    </div>`;
  }

  return `<div class="pianov4-welcome-card">
    <div class="pianov4-welcome-card-band"></div>
    <div class="pianov4-welcome-card-eyebrow-row">
      <div class="pianov4-welcome-card-eyebrow">ADATTAMENTO PROPOSTO</div>
      <div class="pianov4-welcome-card-count">4 VALORI</div>
    </div>

    <div class="pianov4-welcome-kcal-row">
      <span class="pianov4-welcome-kcal-old">${diff.kcal.oldVal}</span>
      <span class="pianov4-welcome-kcal-arrow">→</span>
      <span class="pianov4-welcome-kcal-new">${diff.kcal.newVal}</span>
      <span class="pianov4-welcome-kcal-unit">KCAL</span>
    </div>
    <div class="pianov4-welcome-kcal-pill-row">${fmtDeltaPillKcal(diff.kcal)}</div>

    <div class="pianov4-welcome-macros">
      ${macroBlock('c', 'CARBOIDRATI', diff.carbs)}
      ${macroBlock('p', 'PROTEINE',    diff.protein)}
      ${macroBlock('g', 'GRASSI',      diff.fat)}
    </div>
  </div>`;
}

// VARIANTE B — tutti i target invariati
function _pianoV4WelcomeRenderVariantB(diff) {
  return `<div class="pianov4-welcome-card">
    <div class="pianov4-welcome-card-band"></div>
    <div class="pianov4-welcome-card-eyebrow-row">
      <div class="pianov4-welcome-card-eyebrow">OBIETTIVI INVARIATI</div>
      <div class="pianov4-welcome-card-count">NESSUNA MODIFICA</div>
    </div>

    <div class="pianov4-welcome-unchanged-row">
      <div class="pianov4-welcome-check-box">✓</div>
      <div class="pianov4-welcome-unchanged-body">
        <div class="pianov4-welcome-unchanged-title">Gli obiettivi restano invariati</div>
        <div class="pianov4-welcome-unchanged-sub">Stessi target della scorsa settimana.</div>
      </div>
    </div>

    <div class="pianov4-welcome-target-tile">
      <div class="pianov4-welcome-target-kcal">
        <span class="pianov4-welcome-target-kcal-val">${diff.kcal.newVal}</span>
        <span class="pianov4-welcome-target-kcal-unit">KCAL</span>
      </div>
      <div class="pianov4-welcome-target-macros">
        <div class="pianov4-welcome-target-macro">
          <span class="pianov4-welcome-target-macro-val c">${diff.carbs.newVal}<span class="pianov4-welcome-target-macro-lbl" style="margin-left:3px;">G</span></span>
          <span class="pianov4-welcome-target-macro-lbl">CARBOIDRATI</span>
        </div>
        <div class="pianov4-welcome-target-macro">
          <span class="pianov4-welcome-target-macro-val p">${diff.protein.newVal}<span class="pianov4-welcome-target-macro-lbl" style="margin-left:3px;">G</span></span>
          <span class="pianov4-welcome-target-macro-lbl">PROTEINE</span>
        </div>
        <div class="pianov4-welcome-target-macro">
          <span class="pianov4-welcome-target-macro-val g">${diff.fat.newVal}<span class="pianov4-welcome-target-macro-lbl" style="margin-left:3px;">G</span></span>
          <span class="pianov4-welcome-target-macro-lbl">GRASSI</span>
        </div>
      </div>
    </div>
  </div>`;
}

// Forzatura collaudo: globale + parametro URL ?welcome=1.
// Da chiamare DOPO il completamento del login (loadAndStart) per essere sicuri che
// ST.user e ST.TARGET siano popolati. Vedi bootstrap in fondo al file.
window.ztTestWelcome = function() {
  openPianoV4WelcomeOverlay('force-test');
};

// Verifica parametro URL ?welcome=1 e, se presente, forza l'apertura dell'overlay
// dopo aver dato un attimo al render dell'app di stabilizzarsi. Chiamata dai 3 rami
// di loadAndStart che entrano nell'app (cache-hit, errore-rete-con-cache, cache-miss).
function _pianoV4MaybeForceWelcomeFromUrl() {
  try {
    const flag = new URLSearchParams(window.location.search).get('welcome');
    if (flag === '1') {
      // Piccolo delay per essere sicuri che ST.TARGET sia applicato e DOM home renderizzato
      setTimeout(function() { openPianoV4WelcomeOverlay('force-test'); }, 250);
    }
  } catch (e) { /* silent */ }
}

// ═══════════════════════════════════════════════════════════
// PIANO V4 Step E.2 (22 mag 2026) — Trigger automatico welcome overlay
//
// Regola concordata: l'overlay si apre da solo SE E SOLO SE tutte vere:
//   1) Esiste una draft in weekly_plans per l'utente (status='draft')
//   2) GIORNO: oggi === plan_generation_day del profilo, OPPURE (giorno-piano + 1) % 7
//      (recupero "giorno dopo" — se l'utente non ha aperto l'app nel giorno-piano)
//   3) ORA: orario attuale device >= plan_generation_time (HH:MM)
//   4) FLAG: localStorage 'zt_welcome_ack_<week_start>' NON presente
//
// Il flag viene scritto SOLO quando l'utente preme un pulsante CTA (vedi
// pianoV4WelcomeConfirmAndOpen / pianoV4WelcomeLater), e SOLO se l'overlay
// era stato aperto via trigger automatico (mode='auto'). La forzatura
// ?welcome=1 / ztTestWelcome() bypassa questa logica completamente:
// non legge il flag (per aprire) e non lo scrive (per chiudere), così
// il collaudo non sporca lo stato di produzione.
//
// IMPORTANTE: questa logica è invisibile — un bug si manifesta come
// "overlay non appare" o "appare quando non dovrebbe". Per renderla
// diagnosticabile esistono ?welcomeDebug=1 (console.log) e
// window.ztWelcomeWhy() (oggetto con esito di ogni condizione).
// ═══════════════════════════════════════════════════════════

// Mapping abbreviazioni inglesi 3-lettere → JS getDay() (0=Dom, 6=Sab).
// CHECK constraint DB consente: fri/sat/sun/custom. 'custom' è previsto per
// quando l'utente potrà scegliere un giorno qualsiasi (refresh onboarding M1
// futuro, non in Step E). Per ora se valore non in {fri,sat,sun} → fallback
// a 'sun' (default DB). Estendiamo la mappa coi 7 giorni così quando arriverà
// l'UI custom non serviranno modifiche.
const _PLAN_DAY_MAP = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };

// Helper: chiave localStorage del flag "visto" per QUESTA draft.
// Scope per-settimana (week_start). Indipendente da userId perché il device
// è inteso come "1 utente Zona Tracker per device" (PWA personale).
function _pianoV4GetWelcomeAckKey(weekStart) {
  return 'zt_welcome_ack_' + weekStart;
}
function _pianoV4WelcomeAckIsSet(weekStart) {
  try { return localStorage.getItem(_pianoV4GetWelcomeAckKey(weekStart)) === '1'; }
  catch (e) { return false; }
}
function _pianoV4WelcomeAckSet(weekStart) {
  try { localStorage.setItem(_pianoV4GetWelcomeAckKey(weekStart), '1'); }
  catch (e) { /* localStorage piena/disabled — flag perso, ri-apparirà al prossimo trigger */ }
}

// Helper diagnostica: ritorna un oggetto con l'esito di ogni condizione.
// Usato da window.ztWelcomeWhy() e dai console.log se ?welcomeDebug=1.
// NB: questa funzione è async perché interroga il DB per la draft.
async function _pianoV4ComputeAutoWelcomeStatus() {
  const out = {
    when: new Date().toISOString(),
    user_id: (ST.user && ST.user.id) || null,
    draftFound: false,
    draft: null,
    profilePlanDay: null,
    profilePlanTime: null,
    todayDow: null,
    todayDowName: null,
    planDow: null,
    nextDayDow: null,
    dayMatch: false,
    nowHHMM: null,
    timeOk: false,
    ackKey: null,
    ackIsSet: false,
    decision: null,    // 'open' | 'skip-no-draft' | 'skip-day' | 'skip-time' | 'skip-ack' | 'skip-no-profile' | 'skip-no-user'
  };

  if (!ST.user || !ST.user.id || ST.user.id === 'test-user-001') {
    out.decision = 'skip-no-user';
    return out;
  }
  if (!ST.profile) {
    out.decision = 'skip-no-profile';
    return out;
  }

  const planDayRaw = ST.profile.plan_generation_day || 'sun';
  const planTime   = ST.profile.plan_generation_time || '20:00';
  out.profilePlanDay = planDayRaw;
  out.profilePlanTime = planTime;

  // 1) Fetch draft (riusa stessa fetch della Parte 1)
  const draft = await _pianoV4LoadDraftPlan();
  if (!draft) {
    out.decision = 'skip-no-draft';
    return out;
  }
  out.draftFound = true;
  out.draft = { id: draft.id, week_start: draft.week_start, target_kcal: draft.target_kcal };

  // 2) Giorno
  const now = new Date();
  const DAY_NAMES = ['sun','mon','tue','wed','thu','fri','sat'];
  out.todayDow = now.getDay();
  out.todayDowName = DAY_NAMES[out.todayDow];
  // 'custom' o valore inatteso → fallback 'sun' (DB default)
  let planKey = (planDayRaw || '').toLowerCase();
  if (!(planKey in _PLAN_DAY_MAP)) planKey = 'sun';
  out.planDow = _PLAN_DAY_MAP[planKey];
  out.nextDayDow = (out.planDow + 1) % 7;
  out.dayMatch = (out.todayDow === out.planDow) || (out.todayDow === out.nextDayDow);

  // 3) Ora — diagnostica lasciata viva (nowHHMM + planTimeNorm letti dal profilo),
  // ma il GUARD è NEUTRALIZZATO in F.1: il welcome overlay deve aprirsi in base
  // a giorno + draft + flag, senza aspettare un'orario soglia. plan_generation_time
  // resta come campo dormiente per le future notifiche push (V2).
  // Decisione presa il 23 mag 2026 in chiusura Step F.1.
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  out.nowHHMM = hh + ':' + mm;
  // Normalizza planTime in caso il DB salvi 'H:MM' o 'HH:M' (paranoia)
  const tParts = (planTime || '20:00').split(':');
  const tH = String(parseInt(tParts[0] || '20', 10) || 20).padStart(2,'0');
  const tM = String(parseInt(tParts[1] || '0',  10) || 0 ).padStart(2,'0');
  const planTimeNorm = tH + ':' + tM;
  out.profilePlanTime = planTimeNorm;
  out.timeOk = true; // F.1: neutralizzato (vedi commento sopra). NB: il decision 'skip-time' non scatta più.

  // 4) Flag
  out.ackKey = _pianoV4GetWelcomeAckKey(draft.week_start);
  out.ackIsSet = _pianoV4WelcomeAckIsSet(draft.week_start);

  if (!out.dayMatch)   { out.decision = 'skip-day';  return out; }
  if (!out.timeOk)     { out.decision = 'skip-time'; return out; }
  if (out.ackIsSet)    { out.decision = 'skip-ack';  return out; }
  out.decision = 'open';
  return out;
}

// Entry-point trigger automatico. Chiamato dai 3 rami di loadAndStart DOPO
// _pianoV4MaybeForceWelcomeFromUrl. Se la forzatura ha già aperto l'overlay,
// questa funzione NON ri-apre (verifica esistenza DOM dell'overlay).
async function _pianoV4MaybeAutoWelcome() {
  try {
    // Se la forzatura ha già aperto l'overlay, non ri-aprire (no doppio render)
    if (document.getElementById('pianov4-welcome-overlay')) return;

    const status = await _pianoV4ComputeAutoWelcomeStatus();

    // Diagnostica leggera dietro ?welcomeDebug=1
    let debug = false;
    try { debug = new URLSearchParams(window.location.search).get('welcomeDebug') === '1'; } catch (e) {}
    if (debug) {
    }

    if (status.decision === 'open') {
      // Apre via trigger automatico — flag verrà scritto solo al click CTA
      openPianoV4WelcomeOverlay('auto');
    }
  } catch (e) {
    console.warn('[welcome-auto] exception:', e);
  }
}

// Diagnostica esposta: window.ztWelcomeWhy() ritorna l'esito completo del check.
// Da console: `await ztWelcomeWhy()` per vedere ogni condizione.
window.ztWelcomeWhy = async function() {
  const s = await _pianoV4ComputeAutoWelcomeStatus();
  console.table([{
    decision: s.decision,
    draft: s.draftFound,
    today: s.todayDowName + ' (' + s.todayDow + ')',
    planDay: s.profilePlanDay + ' → dow ' + s.planDow + ' (+1=' + s.nextDayDow + ')',
    dayMatch: s.dayMatch,
    now: s.nowHHMM,
    soglia: s.profilePlanTime,
    timeOk: s.timeOk,
    ackKey: s.ackKey,
    ackIsSet: s.ackIsSet,
  }]);
  return s;
};

// ═══════════════════════════════════════════════════════════
// PIANO V4 Step F.1 (23 mag 2026) — POSTINO: generazione draft weekly_plans
//
// Il "postino" gira alla prima apertura dell'app DI DOMENICA (no controllo orario)
// e crea la riga-madre del piano settimanale in `weekly_plans` con status='draft'.
// È il pezzo che CREA la draft che il welcome overlay (Step E) già sa leggere e
// annunciare.
//
// F.1 = SOLO riga-madre (obiettivi). Niente weekly_plan_meals (quelli sono F.2).
//
// Trigger reale: oggi.getDay() === plan_generation_day del profilo OPPURE
// (planDow + 1) % 7 (recupero "giorno dopo"). Coerente con welcome overlay E.2.
//
// Anti-doppione: SELECT su weekly_plans per (user_id, week_start). Se esiste già
// una riga di QUALUNQUE status → STOP. Il constraint UNIQUE (user_id, week_start)
// è la rete di sicurezza al livello DB.
//
// AI: callAI() genera ai_reasoning (voce del coach, variante "OBIETTIVI INVARIATI"
// in F.1 perché copiamo dal profilo senza modificare). Fallback fisso se AI fallisce
// — il postino non deve mai fallire per colpa dell'AI.
//
// Diagnostica: ?generaDebug=1 (console.log) e window.ztGeneraWhy() (oggetto con
// esito di ogni guard). Forzature collaudo: ?genera=1 e window.ztTestGenera().
// ═══════════════════════════════════════════════════════════

// Helper: converte un Date al lunedì → 'YYYY-MM-DD' senza shift DST.
// Riusa il pattern di _pianoV4CalculateDate (mezzogiorno locale → toISOString slice).
function _pianoV4MondayToIso(monday) {
  const safe = new Date(monday);
  safe.setHours(12, 0, 0, 0);
  return safe.toISOString().slice(0, 10);
}

// Helper: 'YYYY-MM-DD' → 'DD/MM/YYYY' (formato italiano per i toast del postino).
// SOLO per i testi mostrati all'utente — il valore salvato in DB resta ISO.
// Robusto a input malformati: se manca il pattern atteso ritorna l'input invariato.
function _pianoV4IsoToItDate(iso) {
  if (!iso || typeof iso !== 'string') return iso || '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return m[3] + '/' + m[2] + '/' + m[1];
}

// Helper: lunedì della settimana che STA per iniziare.
// Di domenica (giorno-piano tipico): getPianoV4WeekStart(1) = lunedì successivo.
// Recupero "giorno dopo" (es. lunedì stesso): getPianoV4WeekStart(0) = lunedì di oggi.
// Logica: se oggi è già lunedì → settimana corrente; altrimenti → settimana prossima.
function _pianoV4NextWeekStartIso() {
  const now = new Date();
  const dow = now.getDay(); // 0=DOM, 1=LUN, ..., 6=SAB
  const offset = (dow === 1) ? 0 : 1; // lunedì → corrente, qualsiasi altro → prossima
  return _pianoV4MondayToIso(getPianoV4WeekStart(offset));
}

// Diagnostica/computazione guard. Ritorna { decision, ...details }.
// Usato da window.ztGeneraWhy(), da console.log se ?generaDebug=1, e
// internamente da _pianoV4MaybePostino come single source of truth.
//
// decision ∈ {
//   'create',         // tutti i guard ok → procedi con AI + INSERT
//   'skip-no-user',
//   'skip-no-profile',
//   'skip-day',       // oggi != planDow e != planDow+1
//   'skip-no-targets',// target_kcal/protein/carbs/fat null o 0
//   'skip-existing',  // già una riga per (user_id, week_start)
// }
async function _pianoV4ComputePostinoStatus(opts) {
  opts = opts || {};
  const force    = !!opts.force;    // ?genera=1 bypassa solo il guard "giorno"
  const forceAll = !!opts.forceAll; // ?forceGenera=1 / pulsante Rigenera: bypassa giorno E anti-doppione
  const out = {
    when: new Date().toISOString(),
    force: force,
    forceAll: forceAll,
    user_id: (ST.user && ST.user.id) || null,
    profilePlanDay: null,
    todayDow: null,
    todayDowName: null,
    planDow: null,
    nextDayDow: null,
    dayMatch: false,
    weekStart: null,
    existingFound: false,
    existingStatus: null,
    existingId: null,
    existingForDeletion: false,
    targets: null,
    targetsValid: false,
    decision: null,
  };

  if (!ST.user || !ST.user.id || ST.user.id === 'test-user-001') {
    out.decision = 'skip-no-user';
    return out;
  }
  if (!ST.profile) {
    out.decision = 'skip-no-profile';
    return out;
  }

  // 1) Giorno (saltato se force=true)
  const planDayRaw = ST.profile.plan_generation_day || 'sun';
  out.profilePlanDay = planDayRaw;
  const now = new Date();
  const DAY_NAMES = ['sun','mon','tue','wed','thu','fri','sat'];
  out.todayDow = now.getDay();
  out.todayDowName = DAY_NAMES[out.todayDow];
  let planKey = (planDayRaw || '').toLowerCase();
  if (!(planKey in _PLAN_DAY_MAP)) planKey = 'sun';
  out.planDow = _PLAN_DAY_MAP[planKey];
  out.nextDayDow = (out.planDow + 1) % 7;
  out.dayMatch = (out.todayDow === out.planDow) || (out.todayDow === out.nextDayDow);

  if (!force && !forceAll && !out.dayMatch) {
    out.decision = 'skip-day';
    return out;
  }

  // 2) week_start
  out.weekStart = _pianoV4NextWeekStartIso();

  // 3) Anti-doppione (CRITICO, vale ANCHE in modalità force)
  try {
    const { data, error } = await supa
      .from('weekly_plans')
      .select('id, status, week_start')
      .eq('user_id', ST.user.id)
      .eq('week_start', out.weekStart)
      .limit(1);
    if (error) {
      console.warn('[postino] anti-doppione query error:', error);
      // In caso di errore di rete: per sicurezza NON creiamo (meglio non creare
      // che creare un doppione). Trattalo come "esistente sconosciuto".
      out.existingFound = true;
      out.existingStatus = 'unknown';
      out.decision = 'skip-existing';
      return out;
    }
    if (data && data.length > 0) {
      out.existingFound = true;
      out.existingStatus = data[0].status;
      out.existingId = data[0].id;
      if (!forceAll) {
        out.decision = 'skip-existing';
        return out;
      }
      // forceAll=true: la riga verrà cancellata in _pianoV4MaybePostino prima dell'INSERT
      out.existingForDeletion = true;
    }
  } catch (e) {
    console.warn('[postino] anti-doppione exception:', e);
    out.existingFound = true;
    out.existingStatus = 'unknown';
    out.decision = 'skip-existing';
    return out;
  }

  // 4) Target dal profilo
  const p = ST.profile;
  const tk = Number(p.target_kcal)    || 0;
  const tp = Number(p.target_protein) || 0;
  const tc = Number(p.target_carbs)   || 0;
  const tf = Number(p.target_fat)     || 0;
  out.targets = { kcal: tk, protein: tp, carbs: tc, fat: tf };
  out.targetsValid = (tk > 0 && tp > 0 && tc > 0 && tf > 0);
  if (!out.targetsValid) {
    out.decision = 'skip-no-targets';
    return out;
  }

  out.decision = 'create';
  return out;
}

// Fallback fisso usato se callAI() fallisce o ritorna stringa vuota.
// Tono coerente con la voce del coach (variante OBIETTIVI INVARIATI).
const _PIANOV4_POSTINO_FALLBACK_REASONING =
  "Stessi numeri della settimana scorsa: stanno funzionando, non li tocco. " +
  "Quello che cambia le cose adesso è chiudere la settimana intera, un pasto alla volta.";

// Genera ai_reasoning via Worker Groq. Mai throw — fallback robusto se errore.
async function _pianoV4GenerateReasoning(targets) {
  const ritratto = await coachRitrattoPronto();
  const prompt =
    "Sei Pirsi, il coach nutrizionale di Zona Tracker. Parla sempre in prima persona: non nominarti in terza persona, non firmarti, non ripetere il tuo nome nel testo.\n\n" +
    "REGISTRO (vale sempre): parli come un amico diretto e schietto. Quando i dati sono buoni lo dici senza enfasi. " +
    "Quando sono cattivi dici prima il fatto, poi una riga di spinta: il fatto non va nascosto dietro la frase di " +
    "incoraggiamento, e non ti fermi al fatto nudo. Resta concreto: se hai numeri o eventi reali usa quelli, invece " +
    "di riempire con frasi motivazionali generiche.\n\n" +
    "ESEMPIO DI TONO — è un modello di VOCE, non di contenuto. I numeri, gli alimenti e i fatti che contiene sono " +
    "inventati per l'esempio: non riutilizzarli, usa solo i dati che trovi in questo prompt.\n" +
    "\"Stessi numeri della settimana scorsa: stanno funzionando, non li tocco. Tu hai saltato due cene su sette. " +
    "Se questa settimana le chiudi tutte, la prossima si aggiustano i carichi.\"\n" +
    "Cosa fa questa voce: dice un fatto concreto prima di dare il consiglio; sceglie una cosa invece di offrirne " +
    "tre; non chiude con una frase motivazionale generica.\n" +
    "Le cene saltate dell'esempio sono inventate: NON attribuire all'utente mancanze, salti o comportamenti che " +
    "non risultano dai dati che ti ho dato. Se non hai un fatto del genere, salta quella parte e resta su quello che sai.\n\n" +
    (ritratto ? ritratto + "\n\n" : "") +
    "Stai annunciando all'utente il piano della settimana che sta per iniziare. " +
    "Gli obiettivi NON cambiano rispetto alla settimana scorsa: kcal " + targets.kcal +
    ", proteine " + targets.protein + "g, carboidrati " + targets.carbs + "g, grassi " + targets.fat + "g.\n\n" +
    "Scrivi 2-3 frasi in italiano, prosa diretta. Il \"noi\" solo per il lavoro fatto insieme " +
    "(\"ripartiamo\", \"vediamo come va\"): il corpo, il peso, i risultati e i progressi sono dell'utente e vanno " +
    "al \"tuo\", mai al \"nostro\". NIENTE preamboli, NIENTE elenchi puntati, NIENTE numeri ripetuti uno per uno. " +
    "Concentra il messaggio sull'idea che gli obiettivi " +
    "restano fermi perché stanno funzionando, e che ora conta la costanza.";
  try {
    const txt = await callAI(prompt, 200);
    const clean = (txt || '').trim();
    if (!clean) return _PIANOV4_POSTINO_FALLBACK_REASONING;
    return clean;
  } catch (e) {
    console.warn('[postino] callAI error, using fallback:', e);
    return _PIANOV4_POSTINO_FALLBACK_REASONING;
  }
}

// ═══════════════════════════════════════════════════════════
// PIANO V4 Step F.2a (23 mag 2026) — Generazione pasti figli pranzo+cena
//
// Subito DOPO la creazione della riga-madre `weekly_plans` (F.1), il postino
// genera 14 pasti figli in `weekly_plan_meals`: 7 pranzi + 7 cene per la
// settimana. Colazione e merenda NON generati in F.2a — quel 40% calorico
// resta "spazio riservato" per le fasi future.
//
// Ripartizione calorica standard (TUTTI gli utenti):
//   Colazione 25% · Merenda 15% · Pranzo 35% · Cena 25%
// F.2a usa solo i bersagli 35% (pranzo) e 25% (cena), calcolati a runtime
// dal target_kcal/protein/carbs/fat del profilo. Sono indicativi.
//
// Opzione A: la riga-madre resta sempre. Se generazione/validazione/INSERT
// pasti fallisce → la riga-madre resta SENZA pasti, l'app sopravvive,
// nessun rollback. Log + toast informativo, prosegui.
// ═══════════════════════════════════════════════════════════

// Helper: calcola bersagli per pranzo/cena dato il target giornaliero.
// pranzo = 35%, cena = 25%. Tutti i macro proporzionalmente.
function _pianoV4F2aTargets(targets) {
  function pct(v, p) { return Math.round((Number(v) || 0) * p); }
  return {
    lunch: {
      kcal:    pct(targets.kcal,    0.35),
      protein: pct(targets.protein, 0.35),
      carbs:   pct(targets.carbs,   0.35),
      fat:     pct(targets.fat,     0.35),
    },
    dinner: {
      kcal:    pct(targets.kcal,    0.25),
      protein: pct(targets.protein, 0.25),
      carbs:   pct(targets.carbs,   0.25),
      fat:     pct(targets.fat,     0.25),
    },
  };
}

// Helper: costruisce il prompt AI per generare i 14 pasti.
// Legge dieta/intolleranze/obiettivo da ST.profile (nomi colonna reali, IT/EN misti).
// Lingua italiana, una sola chiamata, JSON strict.
// Helper interno F.2a — costruisce la "dispensa" (whitelist categorie ingredienti)
// in base al regime alimentare dell'utente, sottraendo le intolleranze.
// Per categorie, NON esempi di piatti pronti — vogliamo guidare il coach senza
// schiacciare la varietà tra utenti. Ritorna un blocco di righe pronte per il prompt.
function _pianoV4F2aBuildPantry(dieta, intolleranze) {
  const dietaKey = (dieta || '').toLowerCase().trim();
  const intolList = (intolleranze || []).map(function(x) { return String(x).toLowerCase().trim(); });

  // Detect categorie da escludere via intolleranze (string match permissivo)
  function hasIntol(needles) {
    return intolList.some(function(it) {
      return needles.some(function(n) { return it.indexOf(n) >= 0; });
    });
  }
  const noLatticini = hasIntol(['lattosio','latticini','latte','formaggi','formaggio','yogurt','burro','panna']);
  const noGlutine   = hasIntol(['glutine','gluten','celiac']);
  const noUova      = hasIntol(['uova','uovo','egg']);
  const noFrutSecca = hasIntol(['frutta secca','noci','mandorle','arachidi','arachide']);
  const noSoia      = hasIntol(['soia']);

  const lines = [];

  // Stesura della dispensa per regime
  if (dietaKey.indexOf('vegano') >= 0 || dietaKey.indexOf('vegan') >= 0) {
    lines.push("Regime VEGANO — solo ingredienti vegetali. VIETATO: ogni tipo di carne, pesce, molluschi, crostacei, uova, latticini, miele, derivati animali.");
    lines.push("AMMESSI per categoria:");
    lines.push("- Proteine vegetali: legumi (ceci, lenticchie, fagioli, piselli, fave, lupini, soia, edamame), " + (noSoia ? "" : "tofu, tempeh, seitan, ") + "hummus.");
    lines.push("- Cereali e derivati: " + (noGlutine ? "riso, mais, grano saraceno, miglio, quinoa, amaranto, polenta (tutti naturalmente senza glutine)" : "pasta, riso, pane, farro, orzo, quinoa, avena, polenta, couscous, bulgur") + ".");
    lines.push("- Verdura: tutta (di stagione, fresca o surgelata).");
    lines.push("- Frutta: tutta.");
    if (!noFrutSecca) lines.push("- Frutta secca e semi: mandorle, noci, nocciole, pistacchi, pinoli, semi di lino/chia/sesamo/girasole/zucca.");
    lines.push("- Grassi: olio extravergine di oliva, olive, avocado, " + (noFrutSecca ? "" : "creme di frutta secca, ") + "olio di lino.");
  } else if (dietaKey.indexOf('vegetarian') >= 0) {
    lines.push("Regime VEGETARIANO — niente carne né pesce. VIETATO: manzo, vitello, pollo, tacchino, maiale, agnello, coniglio, salumi, insaccati, pesce, molluschi, crostacei.");
    lines.push("AMMESSI per categoria:");
    if (!noUova) lines.push("- Uova (intere, albumi).");
    if (!noLatticini) lines.push("- Latticini: latte, yogurt, ricotta, mozzarella, parmigiano, formaggi freschi/stagionati (con moderazione sui grassi).");
    lines.push("- Proteine vegetali: legumi (ceci, lenticchie, fagioli, piselli, fave, lupini, soia, edamame), " + (noSoia ? "" : "tofu, tempeh, seitan, ") + "hummus.");
    lines.push("- Cereali e derivati: " + (noGlutine ? "riso, mais, grano saraceno, miglio, quinoa, amaranto, polenta" : "pasta, riso, pane integrale, farro, orzo, quinoa, avena, polenta, couscous, bulgur") + ".");
    lines.push("- Verdura: tutta.");
    lines.push("- Frutta: tutta.");
    if (!noFrutSecca) lines.push("- Frutta secca e semi: mandorle, noci, nocciole, pistacchi, pinoli, semi di lino/chia/sesamo.");
    lines.push("- Grassi: olio extravergine di oliva, avocado, olive.");
  } else if (dietaKey.indexOf('pescetarian') >= 0 || dietaKey.indexOf('pescatarian') >= 0) {
    lines.push("Regime PESCETARIANO — sì pesce, molluschi, crostacei, uova; NIENTE carne di alcun tipo. VIETATO: manzo, vitello, pollo, tacchino, maiale, agnello, coniglio, salumi, prosciutto, bresaola, salame, wurstel, insaccati di qualsiasi origine.");
    lines.push("AMMESSI per categoria:");
    lines.push("- Pesce: salmone, tonno, merluzzo, branzino, orata, sgombro, sardine, alici, trota, pesce spada, nasello, platessa, sogliola.");
    lines.push("- Molluschi e crostacei: cozze, vongole, calamari, seppie, polpo, gamberi, scampi, granchio, aragosta.");
    if (!noUova) lines.push("- Uova (intere, albumi).");
    if (!noLatticini) lines.push("- Latticini: latte, yogurt, ricotta, mozzarella, parmigiano, formaggi freschi/stagionati.");
    lines.push("- Proteine vegetali: legumi (ceci, lenticchie, fagioli, piselli, fave, lupini, soia, edamame), " + (noSoia ? "" : "tofu, tempeh, ") + "hummus.");
    lines.push("- Cereali e derivati: " + (noGlutine ? "riso, mais, grano saraceno, miglio, quinoa, amaranto, polenta" : "pasta, riso (integrale/basmati/arborio), pane integrale, farro, orzo, quinoa, avena, polenta, couscous, bulgur") + ".");
    lines.push("- Verdura: tutta.");
    lines.push("- Frutta: tutta.");
    if (!noFrutSecca) lines.push("- Frutta secca e semi: mandorle, noci, nocciole, pistacchi, pinoli, semi di lino/chia/sesamo.");
    lines.push("- Grassi: olio extravergine di oliva, avocado, olive.");
  } else {
    // Onnivoro (o valore non riconosciuto → trattalo come onnivoro prudente)
    lines.push("Regime ONNIVORO — tutto ammesso, salvo le intolleranze indicate sopra.");
    lines.push("AMMESSI per categoria:");
    lines.push("- Carne magra: pollo, tacchino, vitello, manzo magro, lonza di maiale, coniglio.");
    lines.push("- Pesce: salmone, tonno, merluzzo, branzino, orata, sgombro, sardine, alici, trota, pesce spada.");
    lines.push("- Molluschi e crostacei: cozze, vongole, calamari, seppie, polpo, gamberi.");
    if (!noUova) lines.push("- Uova (intere, albumi).");
    if (!noLatticini) lines.push("- Latticini: latte, yogurt, ricotta, mozzarella, parmigiano, formaggi freschi/stagionati.");
    lines.push("- Proteine vegetali: legumi (ceci, lenticchie, fagioli, piselli), " + (noSoia ? "" : "tofu, tempeh, ") + "hummus.");
    lines.push("- Cereali e derivati: " + (noGlutine ? "riso, mais, grano saraceno, miglio, quinoa, amaranto, polenta" : "pasta, riso, pane integrale, farro, orzo, quinoa, avena, polenta, couscous, bulgur") + ".");
    lines.push("- Verdura: tutta.");
    lines.push("- Frutta: tutta.");
    if (!noFrutSecca) lines.push("- Frutta secca e semi: mandorle, noci, nocciole, pistacchi, pinoli, semi di lino/chia.");
    lines.push("- Grassi: olio extravergine di oliva, avocado, olive.");
  }

  // Riepilogo intolleranze (ridondanza voluta — il coach deve vederle 2 volte)
  if (intolList.length > 0) {
    lines.push("");
    lines.push("INTOLLERANZE/ESCLUSIONI dell'utente: " + intolList.join(", ") + ". Queste hanno PRECEDENZA ASSOLUTA: rimuovi dalla dispensa ogni ingrediente corrispondente, in nessun pasto deve comparire neanche di traverso (es. lattosio/latticini → niente latte, formaggio, yogurt, ricotta, burro, panna, mascarpone, mozzarella, parmigiano).");
  }

  return lines.join("\n");
}

function _pianoV4F2aBuildPrompt(profile, targets, perMeal) {
  const dieta = (profile.dieta || '').toString().trim();
  const intolleranzeRaw = profile.intolleranze;
  const intolleranze = Array.isArray(intolleranzeRaw)
    ? intolleranzeRaw.filter(Boolean)
    : (intolleranzeRaw ? [String(intolleranzeRaw)] : []);
  const obiettivo = (profile.obiettivo || '').toString().trim();
  const age = profile.age ? Number(profile.age) : null;
  const sex = (profile.sex || '').toString().trim();

  const profileLines = [];
  // Niente nome della persona (Fondamenta 170): al piano servono età, sesso, regime e obiettivo
  if (age)       profileLines.push("- Età: " + age + " anni");
  if (sex)       profileLines.push("- Sesso: " + sex);
  if (dieta)     profileLines.push("- Regime alimentare: " + dieta);
  if (intolleranze.length) profileLines.push("- Intolleranze/esclusioni (DA EVITARE SEMPRE): " + intolleranze.join(", "));
  if (obiettivo) profileLines.push("- Obiettivo: " + obiettivo);

  const targetLines = [
    "- Target giornaliero: " + targets.kcal + " kcal · " + targets.protein + "g proteine · " + targets.carbs + "g carboidrati · " + targets.fat + "g grassi",
    "- Bersaglio PRANZO (~35% del giorno): " + perMeal.lunch.kcal + " kcal · " + perMeal.lunch.protein + "g P · " + perMeal.lunch.carbs + "g C · " + perMeal.lunch.fat + "g G",
    "- Bersaglio CENA (~25% del giorno): "   + perMeal.dinner.kcal + " kcal · " + perMeal.dinner.protein + "g P · " + perMeal.dinner.carbs + "g C · " + perMeal.dinner.fat + "g G",
  ];

  const pantry = _pianoV4F2aBuildPantry(dieta, intolleranze);

  return [
    "Sei Pirsi, il coach nutrizionale di Zona Tracker. Parla sempre in prima persona: non nominarti in terza persona, non firmarti, non ripetere il tuo nome nel testo. Genera 14 pasti (7 PRANZI + 7 CENE) per la settimana che sta per iniziare.",
    "",
    "REGISTRO (vale sempre): parli come un amico diretto e schietto. Quando i dati sono buoni lo dici senza enfasi. Quando sono cattivi dici prima il fatto, poi una riga di spinta: il fatto non va nascosto dietro la frase di incoraggiamento, e non ti fermi al fatto nudo. Resta concreto: se hai numeri o eventi reali usa quelli, invece di riempire con frasi motivazionali generiche.",
    "",
    "PROFILO UTENTE:",
    profileLines.join("\n"),
    "",
    "BERSAGLI NUTRIZIONALI:",
    targetLines.join("\n"),
    "",
    "DISPENSA AMMESSA (whitelist per categorie — tutto ciò che NON è qui dentro è VIETATO):",
    pantry,
    "",
    "REGOLE FERREE (NON NEGOZIABILI, in ordine di priorità):",
    "1. DIVIETO DI INVENZIONE. Usa SOLO ingredienti reali, esistenti in natura, con il loro nome corretto e riconoscibile in italiano. È VIETATO inventare nomi di ingredienti, usare nomi ambigui, accostare termini per costruire ingredienti che non esistono.",
    "2. DIVIETO DI MASCHERAMENTO. È VIETATO \"camuffare\" un ingrediente vietato con un nome che sembra ammesso. ESEMPIO NEGATIVO ESPLICITO: \"pollo di mare\" NON ESISTE — il pollo è carne, non c'è alcun pesce chiamato così; un piatto del genere è una violazione gravissima del regime alimentare ed è inaccettabile. Lo stesso vale per qualunque altro accostamento simile.",
    "3. PRUDENZA. Se per rispettare i vincoli un piatto risulta difficile, scegli un piatto PIÙ SEMPLICE con ingredienti sicuramente presenti nella DISPENSA AMMESSA sopra. MAI inventare per forzare la consegna.",
    "4. DUBBIO = NO. Se hai il minimo dubbio che un ingrediente sia ammesso → NON usarlo. Pesca dalla DISPENSA AMMESSA.",
    "5. INTOLLERANZE: precedenza assoluta. Nessun ingrediente delle intolleranze/esclusioni può comparire, nemmeno in tracce o come condimento.",
    "6. VARIETÀ PIENA SUI 7 GIORNI. Tutti e 14 i pasti devono essere DIVERSI tra loro nel piatto principale. NESSUNA ripetizione identica tra giorni diversi. Sono ammesse variazioni sullo stesso ingrediente base (es. salmone al forno vs salmone in padella vs salmone marinato), ma non lo stesso identico piatto due volte. ATTENZIONE PARTICOLARE AL GIORNO 7: spesso si tende a ripetere piatti dei giorni precedenti — non farlo, il giorno 7 deve avere pranzo e cena unici come tutti gli altri.",
    "7. CUCINA ITALIANA, piatti realistici e semplici da preparare a casa.",
    "8. BERSAGLI MACRO: le kcal/macro per pasto devono avvicinarsi ai bersagli sopra (oscillazioni ragionevoli ammesse).",
    "9. description: 1 frase concisa che descrive il piatto e i suoi ingredienti principali con nomi corretti e riconoscibili (es. \"Pasta integrale al pesto di basilico con pomodorini e fiocchi di mandorle\").",
    "10. explanation: OBBLIGATORIO per ogni pasto (mai vuoto, mai placeholder generico). 1-2 frasi brevi in italiano, SCRITTE IN PRIMA PERSONA da chi ha scelto quel piatto e ne spiega il motivo (\"ti metto...\", \"ho scelto... perché...\", \"qui punto su...\") — NON una didascalia da menù che descrive il piatto in terza persona, NON un elenco di proprietà degli ingredienti (max 25 parole) sul PERCHÉ proponi proprio QUESTO pasto a QUESTO utente: collega al regime alimentare, all'obiettivo, agli ingredienti scelti, al bilanciamento Zona o agli orari della giornata. È il testo che l'utente leggerà sotto \"PERCHÉ TI PROPONGO QUESTO\" — deve essere personalizzato e specifico, mai una frase di servizio interscambiabile tra pasti. Vale anche qui il REGISTRO dichiarato in testa: amico diretto e schietto, concreto, senza enfasi.",
    "11. INGREDIENTI CON DOSI PRECISE. Ogni pasto include una lista 'ingredients' di 3-5 voci, ognuna nella forma 'NomeIngrediente NUMEROg' (es. 'Filetto salmone 150g', 'Quinoa 70g (peso secco)', 'Olio EVO 10g'). Le dosi devono essere REALISTICHE (da bilancia, tipicamente multipli di 5 o 10g) e COERENTI coi macro dichiarati del pasto: la somma calorica e per macro degli ingredienti deve avvicinarsi a kcal/protein/carbs/fat del pasto. Riferimenti di coerenza utili: 150g salmone ≈ 30g proteine + 15g grassi + ~270 kcal; 70g quinoa secca ≈ 53g carboidrati + 9g proteine + ~250 kcal; 10g olio EVO ≈ 10g grassi + 90 kcal. FALLO QUADRARE: se i macro non tornano, aggiusta le dosi PRIMA di rispondere. Specifica '(peso secco)' o '(peso a crudo)' per cereali e legumi quando ha senso. Tutti gli ingredienti devono essere nella DISPENSA AMMESSA e rispettare le intolleranze (regole 1-5 valgono anche dentro la lista 'ingredients').",
    "12. ORARIO PASTO. Ogni oggetto pasto include 'time': '13:00' per i pranzi, '20:00' per le cene. Sempre questi due valori fissi.",
    "",
    "VARIETÀ DI STRUTTURA (oltre alla varietà di ingredienti):",
    "Non basta cambiare l'ingrediente: varia anche la STRUTTURA/forma dei piatti lungo la settimana. Una settimana intera con lo stesso stampo \"carboidrato + pesce\" a pranzo e \"pesce + contorno\" a cena è MONOTONA, anche se gli ingredienti cambiano. Attingi a questa tavolozza, alternando (NON usarle tutte ogni giorno):",
    "A) PIATTI UNICI COMPLETI accanto ai classici \"primo + secondo\": zuppe ricche e sostanziose (es. zuppa di legumi e verdure, zuppa di pesce, minestrone arricchito), insalatone complete con base proteica, bowl unici con cereale+proteina+verdura insieme.",
    "B) METODI DI COTTURA DEL PESCE VARIATI: forno, padella, al cartoccio, al vapore, in umido o in zuppa, marinato e cotto, alla griglia. NON usare sempre lo stesso metodo (\"al forno\"/\"in padella\") giorno dopo giorno — distribuisci i metodi sulla settimana. VIETATO: pesce CRUDO o in TARTARE (escluso per scelta, non adatto a tutti).",
    "C) SCHEMA PRANZO/CENA VARIABILE: non sempre \"carboidrati a pranzo + pesce/proteina a cena\". Ogni tanto inverti o rompi lo schema: pranzo più leggero seguito da cena più ricca, oppure cena di sole verdure e legumi, oppure pranzo proteico senza cereali. La distribuzione kcal del giorno resta sui bersagli, ma la forma cambia.",
    "D) PROTEINE PROTAGONISTE VARIE: non solo pesce. Alterna pasti dove la PROTEINA PRINCIPALE è legumi (lenticchie, ceci, fagioli — sotto forma di zuppa, polpette, hummus, dahl, vellutate) o uova (frittata, uova al forno con verdure, shakshuka), sempre nel rispetto della DISPENSA AMMESSA e delle intolleranze.",
    "Regola di chiusura sulla struttura: NESSUNA settimana deve seguire un'unica formula ripetuta. La varietà deve riguardare SIA gli ingredienti SIA la struttura del piatto.",
    "",
    "FORMATO RISPOSTA (RIGIDO):",
    "Rispondi SOLO con JSON valido, nessun preambolo, nessun testo extra, nessun blocco ```. Schema:",
    "{\"meals\":[{\"day\":1,\"slot\":\"pranzo\",\"time\":\"13:00\",\"description\":\"...\",\"ingredients\":[\"Ingrediente1 100g\",\"Ingrediente2 70g (peso secco)\",\"Ingrediente3 10g\"],\"kcal\":N,\"protein\":N,\"carbs\":N,\"fat\":N,\"explanation\":\"...\"}, ...]}",
    "",
    "- day: 1=lunedì .. 7=domenica (ISO)",
    "- slot: \"pranzo\" oppure \"cena\" (esattamente queste due stringhe)",
    "- time: \"13:00\" per i pranzi, \"20:00\" per le cene (sempre esattamente queste due stringhe)",
    "- 14 oggetti totali: 1 pranzo + 1 cena per ognuno dei 7 giorni",
    "- ingredients: array di 3-5 stringhe, formato 'NomeIngrediente NUMEROg', dosi coerenti coi macro",
    "- kcal/protein/carbs/fat: numeri interi",
    "",
    "Prima di rispondere, ricontrolla mentalmente: ogni piatto ha SOLO ingredienti dalla DISPENSA AMMESSA, nessuna invenzione, nessun mascheramento, nessuna ripetizione, intolleranze rispettate, varietà di STRUTTURA (non tutti pranzi \"carbo+proteina\" e tutte cene \"pesce+contorno\"), metodi di cottura del pesce alternati (no pesce crudo/tartare), ogni pasto ha 3-5 ingredienti con dosi in grammi e i macro tornano coi totali dichiarati, 'time' = '13:00' per i pranzi / '20:00' per le cene, e OGNI pasto ha la sua 'explanation' personalizzata e specifica (NON vuota, NON generica, NON uguale tra pasti diversi). Poi inizia subito col JSON.",
  ].join("\n");
}

// Helper: parse + validazione robusta della risposta AI.
// Ritorna { ok:true, meals:[...] } oppure { ok:false, reason:'...' }.
// MAI throw — sempre risposta strutturata.
function _pianoV4F2aParseAndValidate(text) {
  if (!text || typeof text !== 'string') return { ok: false, reason: 'empty-response' };
  const cleaned = text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return { ok: false, reason: 'invalid-json', raw: cleaned.slice(0, 200) };
  }
  if (!parsed || !Array.isArray(parsed.meals)) {
    return { ok: false, reason: 'missing-meals-array' };
  }
  if (parsed.meals.length < 14) {
    return { ok: false, reason: 'too-few-meals', count: parsed.meals.length };
  }
  // Prendiamo i primi 14 nel caso ne ritorni di più (paranoia)
  const meals = parsed.meals.slice(0, 14);
  const validSlots = { pranzo: true, cena: true };
  const seen = {}; // chiave "day-slot" → bool, per garantire 7+7 e niente duplicati
  for (let i = 0; i < meals.length; i++) {
    const m = meals[i];
    if (!m || typeof m !== 'object') return { ok: false, reason: 'meal-not-object', idx: i };
    const day = Number(m.day);
    if (!Number.isInteger(day) || day < 1 || day > 7) return { ok: false, reason: 'bad-day', idx: i, day: m.day };
    const slot = String(m.slot || '').toLowerCase();
    if (!validSlots[slot]) return { ok: false, reason: 'bad-slot', idx: i, slot: m.slot };
    if (!m.description || typeof m.description !== 'string' || !m.description.trim()) {
      return { ok: false, reason: 'missing-description', idx: i };
    }
    // F.2a v2: ingredients (array di stringhe, min 2 voci non vuote). Normalizzazione in-place.
    if (!Array.isArray(m.ingredients)) {
      return { ok: false, reason: 'missing-ingredients', idx: i };
    }
    const validIngs = m.ingredients
      .filter(function(x) { return typeof x === 'string' && x.trim().length > 0; })
      .map(function(s) { return s.trim(); });
    if (validIngs.length < 2) {
      return { ok: false, reason: 'too-few-ingredients', idx: i, count: validIngs.length };
    }
    m.ingredients = validIngs;
    // F.2a v2: time opzionale — se manca o non valido, default per slot.
    if (!m.time || typeof m.time !== 'string' || !m.time.trim()) {
      m.time = (slot === 'pranzo') ? '13:00' : '20:00';
    } else {
      m.time = m.time.trim();
    }
    // F.2a v2.1 (25 mag): explanation è OBBLIGATORIO lato prompt, ma applichiamo
    // un fallback in voce coach se l'AI lo omette comunque. Non blocchiamo la
    // generazione per questo: meglio un fallback neutro che 14 pasti senza spiegazione.
    if (!m.explanation || typeof m.explanation !== 'string' || !m.explanation.trim()) {
      m.explanation = (slot === 'pranzo')
        ? 'Te lo propongo perché sta nei tuoi bersagli Zona e usa solo quello che puoi mangiare.'
        : 'L\'ho calibrato sul tuo target della sera, con ingredienti che rientrano nel tuo regime.';
    } else {
      m.explanation = m.explanation.trim();
    }
    const key = day + '-' + slot;
    if (seen[key]) return { ok: false, reason: 'duplicate-day-slot', idx: i, key: key };
    seen[key] = true;
  }
  // Verifica copertura completa: tutti i 14 slot (7 giorni × 2 slot) devono esserci
  for (let d = 1; d <= 7; d++) {
    if (!seen[d + '-pranzo']) return { ok: false, reason: 'missing-lunch', day: d };
    if (!seen[d + '-cena'])   return { ok: false, reason: 'missing-dinner', day: d };
  }
  return { ok: true, meals: meals };
}

// Funzione principale F.2a: genera i 14 pasti via AI, valida, fa INSERT batch.
// Ritorna { ok, reason?, inserted? } — MAI throw.
// planId = id della riga-madre weekly_plans appena creata.
// Anti-doppione: prima di inserire verifica che non esistano già pasti per quel plan_id.
async function _pianoV4GenerateAndInsertMeals(planId, profile, targets, opts) {
  opts = opts || {};
  const debug = !!opts.debug;
  try {
    // Guard anti-doppione: nessun pasto per questo plan_id deve già esistere.
    // (in teoria impossibile perché plan_id è appena stato creato, ma in caso di
    // race/race-conflict ricoperto da F.1 questo guard chiude il cerchio).
    const existing = await supa
      .from('weekly_plan_meals')
      .select('id')
      .eq('plan_id', planId)
      .limit(1);
    if (existing.error) {
      console.warn('[postino-meals] guard query error:', existing.error);
      return { ok: false, reason: 'guard-query-error', error: existing.error.message };
    }
    if (existing.data && existing.data.length > 0) {
      return { ok: false, reason: 'skip-existing-meals' };
    }

    // Bersagli pranzo/cena
    const perMeal = _pianoV4F2aTargets(targets);

    // Prompt + chiamata AI
    const prompt = _pianoV4F2aBuildPrompt(profile, targets, perMeal);
    let text = '';
    try {
      text = await callAI(prompt, 4000);
    } catch (e) {
      console.warn('[postino-meals] callAI error:', e);
      return { ok: false, reason: 'ai-call-failed', error: (e && e.message) || String(e), aiKind: e && e.aiKind };
    }

    // Validazione — try/catch esplicito: _pianoV4F2aParseAndValidate non dovrebbe
    // mai throw (ha il proprio try/catch interno su JSON.parse), ma lo proteggiamo
    // comunque per garantire il log di fallimento in ogni caso.
    let v;
    try {
      v = _pianoV4F2aParseAndValidate(text);
    } catch (e) {
      console.warn('[postino-meals] validation exception:', e);
      return { ok: false, reason: 'validation-exception', error: (e && e.message) || String(e) };
    }
    if (!v.ok) {
      console.warn('[postino-meals] validation failed:', v);
      return { ok: false, reason: 'validation-failed', detail: v };
    }

    // Mappa meals validati → payload per INSERT batch
    // sort_order: pranzo=1, cena=2 (ordine cronologico nel giorno).
    const rows = v.meals.map(function(m) {
      const slot = String(m.slot).toLowerCase();
      return {
        plan_id:        planId,
        user_id:        ST.user.id,
        day_of_week:    Number(m.day),
        slot:           slot,
        description:    String(m.description).trim(),
        ingredients:    m.ingredients,                 // jsonb: array di stringhe (validato e normalizzato)
        meal_time:      m.time,                        // text HH:MM (default applicato dal validator)
        kcal:           (m.kcal != null) ? Math.round(Number(m.kcal) || 0) : null,
        protein:        (m.protein != null) ? Math.round(Number(m.protein) || 0) : null,
        carbs:          (m.carbs != null) ? Math.round(Number(m.carbs) || 0) : null,
        fat:            (m.fat != null) ? Math.round(Number(m.fat) || 0) : null,
        ai_explanation: (m.explanation && String(m.explanation).trim()) || null,
        sort_order:     (slot === 'pranzo') ? 1 : 2,
      };
    });

    const ins = await supa
      .from('weekly_plan_meals')
      .insert(rows)
      .select('id');
    if (ins.error) {
      console.warn('[postino-meals] INSERT batch error:', ins.error);
      return { ok: false, reason: 'insert-failed', error: ins.error.message };
    }
    const insertedCount = (ins.data && ins.data.length) || 0;
    return { ok: true, inserted: insertedCount };
  } catch (e) {
    console.warn('[postino-meals] exception:', e);
    return { ok: false, reason: 'exception', error: (e && e.message) || String(e) };
  }
}

// Entry-point del postino. Chiamato dai 3 rami di loadAndStart PRIMA delle chiamate
// welcome overlay. Garantisce: se va a buon fine, la draft esiste quando l'overlay
// la cerca subito dopo.
//
// opts.force = true → bypassa solo il guard "giorno" (?genera=1 / ztTestGenera).
// L'anti-doppione resta attivo anche in force (intenzionale).
async function _pianoV4MaybePostino(opts) {
  opts = opts || {};
  try {
    const status = await _pianoV4ComputePostinoStatus(opts);

    // Diagnostica leggera dietro ?generaDebug=1
    let debug = false;
    try { debug = new URLSearchParams(window.location.search).get('generaDebug') === '1'; } catch (e) {}

    if (status.decision !== 'create') {
      // Per le forzature di collaudo, se l'utente ha lanciato ztTestGenera() e
      // il guard è scattato, mostriamo un toast esplicativo (voce del coach).
      // NB: testi visibili → linguaggio umano, NESSUN termine tecnico interno.
      if (opts.toastOnSkip) {
        const msg = {
          'skip-no-user':    'Devi accedere prima per ricevere un piano',
          'skip-no-profile': 'Non riesco a leggere il tuo profilo — riprova',
          'skip-day':        'Genero i piani nel giorno che hai scelto',
          'skip-existing':   'Hai già un piano per questa settimana',
          'skip-no-targets': 'Mi servono i tuoi obiettivi per generare un piano',
        }[status.decision] || 'Qualcosa è andato storto — riprova';
        showToast(msg, 'ℹ️', 5500);
      }
      return status;
    }

    // OK, procediamo con creazione draft
    // forceAll: cancella la riga esistente per questa week_start prima di inserire
    if (opts.forceAll && status.existingForDeletion && status.existingId) {
      try {
        const delRes = await supa
          .from('weekly_plans')
          .delete()
          .eq('id', status.existingId)
          .eq('user_id', ST.user.id);
        if (delRes.error) {
          console.warn('[postino] forceAll delete error:', delRes.error);
          status.decision = 'error-delete';
          status.error = delRes.error.message;
          if (opts.toastOnSkip) showToast('Errore nella sostituzione del piano precedente', '⚠️', 5500);
          return status;
        }
        if (ST.pianoV4RealPlanCache) delete ST.pianoV4RealPlanCache[status.weekStart];
      } catch (delErr) {
        console.warn('[postino] forceAll delete exception:', delErr);
        status.decision = 'error-delete';
        if (opts.toastOnSkip) showToast('Errore nella sostituzione del piano precedente', '⚠️', 5500);
        return status;
      }
    }
    const reasoning = await _pianoV4GenerateReasoning(status.targets);

    const payload = {
      user_id: ST.user.id,
      week_start: status.weekStart,
      target_kcal: status.targets.kcal,
      target_protein: status.targets.protein,
      target_carbs: status.targets.carbs,
      target_fat: status.targets.fat,
      ai_reasoning: reasoning,
      status: 'draft',
    };

    const { data, error } = await supa
      .from('weekly_plans')
      .insert(payload)
      .select('id, week_start, status')
      .single();

    if (error) {
      // Gestione conflict UNIQUE (race condition con un altro device): non crashare.
      // Codice 23505 = unique_violation in Postgres.
      const isConflict = error.code === '23505' || /duplicate key|unique/i.test(error.message || '');
      if (isConflict) {
        status.decision = 'skip-existing';
        status.existingFound = true;
        status.existingStatus = 'race-conflict';
        if (opts.toastOnSkip) showToast('Hai già un piano per questa settimana', 'ℹ️', 5500);
        return status;
      }
      // Altro errore DB: log e ritorna status come "errore"
      console.warn('[postino] INSERT error:', error);
      status.decision = 'error-insert';
      status.error = error.message || String(error);
      if (opts.toastOnSkip) showToast('Qualcosa è andato storto nel salvataggio — riprova', '⚠️', 5500);
      return status;
    }

    status.createdDraft = data;
    if (opts.toastOnSkip) showToast(COACH_NAME + ' ha preparato il tuo piano per la settimana del ' + _pianoV4IsoToItDate(status.weekStart) + ' 📋', '✅', 5500);

    // ── F.2a: generazione pasti figli pranzo+cena (Opzione A: no rollback su errore) ──
    // SOLO se la riga-madre è stata appena creata in QUESTA esecuzione (siamo arrivati
    // qui solo se l'INSERT è riuscito). Anti-doppione di F.1 garantisce che il branch
    // skip-existing/race-conflict NON arrivi a questo punto.
    // NB: toast pasti durano 7500ms (più lungo) — è l'ultimo della sequenza, porta la
    // notizia principale, deve essere leggibile senza accavallarsi col precedente.
    const planId = (data && data.id) || null;
    if (planId) {
      const mealsResult = await _pianoV4GenerateAndInsertMeals(planId, ST.profile, status.targets, { debug: debug });
      status.mealsResult = mealsResult;
      if (mealsResult.ok) {
        if (opts.toastOnSkip) showToast(COACH_NAME + ' ha preparato pranzi e cene della settimana 🍽️', '✅', 7500);
      } else if (mealsResult.reason === 'skip-existing-meals') {
        // Pasti già presenti (race condition rara). Nessun rollback necessario.
      } else {
        // Fallimento AI (timeout, risposta malformata, errore DB): rollback della riga-madre.
        // Senza rollback, l'anti-doppione blocca tutti i tentativi successivi trovando
        // la riga vuota per questa week_start.
        // Il try/catch da solo non bastava: supabase-js non lancia sugli errori
        // API, quindi `rollRes` veniva assegnato e mai letto e un rollback fallito
        // non lo rilevava nessuno. E' il caso peggiore possibile: se la riga-madre
        // resta, l'anti-doppione la ritrova a ogni tentativo successivo e il piano
        // di quella settimana non si genera piu'.
        // Toast silenzioso: quello per l'utente c'e' gia' due righe piu' sotto.
        const rollRes = await dbq('annullare il piano incompleto', supa.from('weekly_plans').delete().eq('id', planId).eq('user_id', ST.user.id), {silenzioso:true});
        const rollbackOk = !(rollRes && rollRes.error);
        if (!rollbackOk) {
          console.error('[postino] ROLLBACK FALLITO per il piano', planId, '— la riga-madre resta e',
                        'bloccherà i prossimi tentativi per la settimana', status.weekStart);
        }
        if (ST.pianoV4RealPlanCache) delete ST.pianoV4RealPlanCache[status.weekStart];
        status.decision = rollbackOk ? 'error-meals-rollback' : 'error-meals-rollback-failed';
        status.rollbackOk = rollbackOk;
        // Un problema di configurazione non si risolve riprovando: dirlo, invece di
        // mandare l'utente a ritentare a vuoto. Ogni altro caso resta com'era.
        const inutileRiprovare = mealsResult.aiKind === 'auth' || mealsResult.aiKind === 'model-unavailable';
        if (opts.toastOnSkip) showToast(
          inutileRiprovare
            ? 'Non sono riuscito a generare i pasti: c\'è un problema di configurazione del servizio.'
            : rollbackOk
              ? 'Non sono riuscito a generare i pasti. Riprova tra poco.'
              : 'Non sono riuscito a generare i pasti. Riprova più tardi.', '⚠️', 7500);
      }
    }

    return status;
  } catch (e) {
    console.warn('[postino] exception:', e);
    if (opts.toastOnSkip) showToast('Qualcosa è andato storto — riprova', '⚠️', 5500);
    return { decision: 'error-exception', error: (e && e.message) || String(e) };
  }
}

// Verifica parametri URL di forzatura e, se presenti, esegue il postino.
// ?genera=1      → bypassa solo skip-day (l'anti-doppione resta attivo).
// ?forceGenera=1 → bypassa skip-day E skip-existing (cancella piano esistente e rigenera).
//                  Usato solo per debug/recovery manuale da URL, niente UI dedicata.
// Chiamato dai 3 rami di loadAndStart.
function _pianoV4MaybeForcePostinoFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const genera = params.get('genera');
    const forceGenera = params.get('forceGenera');
    if (forceGenera === '1') {
      // Delay più lungo per garantire che profile/user/TARGET siano tutti pronti
      setTimeout(function() { _pianoV4MaybePostino({ forceAll: true, toastOnSkip: true }); }, 400);
    } else if (genera === '1') {
      // Piccolo delay per allinearsi col ritmo del welcome overlay e ridurre
      // race con applyProfile/ST.user/ST.TARGET.
      setTimeout(function() { _pianoV4MaybePostino({ force: true, toastOnSkip: true }); }, 200);
    }
  } catch (e) { /* silent */ }
}

// Forzatura console: window.ztTestGenera()
window.ztTestGenera = function() {
  return _pianoV4MaybePostino({ force: true, toastOnSkip: true });
};

// Diagnostica esposta: window.ztGeneraWhy() — esito di ogni guard senza
// effetti collaterali sul DB (non crea nulla, solo SELECT anti-doppione).
window.ztGeneraWhy = async function() {
  const s = await _pianoV4ComputePostinoStatus({ force: false });
  console.table([{
    decision: s.decision,
    today: s.todayDowName + ' (' + s.todayDow + ')',
    planDay: s.profilePlanDay + ' → dow ' + s.planDow + ' (+1=' + s.nextDayDow + ')',
    dayMatch: s.dayMatch,
    weekStart: s.weekStart,
    existing: s.existingFound + (s.existingStatus ? ' (' + s.existingStatus + ')' : ''),
    targets: s.targets ? (s.targets.kcal + '/' + s.targets.protein + '/' + s.targets.carbs + '/' + s.targets.fat) : null,
    targetsValid: s.targetsValid,
  }]);
  return s;
};

// Render overlay: re-render safe (rimuove esistente se presente, ricrea)
// ─── Step C.4 (20 mag 2026): persistenza ACCETTA pasti demo via localStorage ───
// Decisione product: niente tabella weekly_plan_acceptance per ora (quella in Step F
// con dati AI reali). Key univoca per userId+weekOffset+dayOfWeek+demoMealId permette
// accettare stesso demo in giorni diversi senza sovrapposizioni.
function _pianoV4GetAcceptanceKey(weekOffset, dayOfWeek, demoMealId) {
  const userId = (ST.user && ST.user.id) || (ST.profile && ST.profile.id) || 'anon';
  return `zona_pianov4_demo_accept_${userId}_w${weekOffset}_d${dayOfWeek}_${demoMealId}`;
}
function _pianoV4IsDemoAccepted(weekOffset, dayOfWeek, demoMealId) {
  try {
    return localStorage.getItem(_pianoV4GetAcceptanceKey(weekOffset, dayOfWeek, demoMealId)) === '1';
  } catch (e) { return false; }
}
function _pianoV4MarkDemoAccepted(weekOffset, dayOfWeek, demoMealId) {
  try {
    localStorage.setItem(_pianoV4GetAcceptanceKey(weekOffset, dayOfWeek, demoMealId), '1');
  } catch (e) { /* localStorage piena/disabled — fallisce silente, demo state perso ma DB scritto */ }
}

// Calcola data ISO YYYY-MM-DD del giorno target dal weekOffset+dayOfWeek (1-7 ISO).
// Riusa getPianoV4WeekStart. Pattern coerente con todayKey() (UTC-slice da Date locale 12:00 → no shift DST).
function _pianoV4CalculateDate(weekOffset, dayOfWeek) {
  const weekStart = getPianoV4WeekStart(weekOffset || 0);
  const target = new Date(weekStart);
  target.setDate(weekStart.getDate() + (dayOfWeek - 1));
  target.setHours(12, 0, 0, 0); // mezzogiorno locale → toISOString slice safe da DST
  return target.toISOString().slice(0, 10);
}

// Handler ACCETTA: scrive pasto in meals (tab Oggi) + marca accepted localStorage + toast + re-render.
// Limitazione: dbAddMeal usa ST.activeDay hardcoded, NON accetta date custom → ACCETTA permesso
// SOLO se targetDate === todayKey(). Pasti di giorni passati/futuri bloccati con toast esplicativo.
// In Step F (AI reale + tabella weekly_plan_acceptance) si potrà rivisitare la limitazione.
async function acceptPianoV4DemoMeal(mealId) {
  if (!ST.pianoV4DayOverlay) return;
  const dayOfWeek = ST.pianoV4DayOverlay.dayOfWeek;
  const weekOffset = ST.pianoV4DayOverlay.weekOffset;

  // Guard: già accettato (no double-tap)
  if (_pianoV4IsDemoAccepted(weekOffset, dayOfWeek, mealId)) {
    showToast('Già accettato', '✅');
    return;
  }

  // Guard: solo pasti di oggi (limitazione firma dbAddMeal — vedi commento sopra)
  const targetDate = _pianoV4CalculateDate(weekOffset, dayOfWeek);
  if (targetDate !== todayKey()) {
    showToast('Puoi accettare solo i pasti di oggi', 'ℹ️');
    return;
  }

  // C.5: mealId può essere un originale (demo-N) OR un'alternativa (alt-XXX-N).
  // Cerca prima nei pasti originali, poi nelle alternative di ogni slot.
  const originalMeals = _pianoV4GetDemoMeals(dayOfWeek);
  let meal = originalMeals.find(function(m) { return m.id === mealId; });
  let originalSlot = meal ? meal.slot : null;
  let timeForMeal = meal ? meal.time : null;
  if (!meal) {
    for (let i = 0; i < originalMeals.length; i++) {
      const orig = originalMeals[i];
      const alts = _pianoV4GetAlternatives(orig.slot);
      const found = alts.find(function(a) { return a.id === mealId; });
      if (found) {
        meal = found;
        originalSlot = orig.slot;      // slot semantico dell'originale (per mappa legacy)
        timeForMeal = orig.time;       // time dell'originale (l'alt non ha time)
        break;
      }
    }
  }
  if (!meal) return;

  // C.4.2: traduci slot demo (es. 'spuntino') → slot legacy meals/UI (es. 'snack_mattina')
  const legacySlot = SLOT_MAP_DEMO_TO_LEGACY[originalSlot] || originalSlot;

  // Payload coerente con dbAddMeal firma esistente
  const mealData = {
    slot: legacySlot,
    description: meal.name + ' · ' + meal.ingredients.join(', '),
    kcal: meal.kcal,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    time: timeForMeal,
  };

  try {
    const saved = await dbAddMeal(mealData);
    const d = getDay(ST.activeDay);
    d.meals.push(Object.assign({}, mealData, { id: saved.id, local_id: saved.id }));
    if (typeof saveCache === 'function') saveCache();
    _pianoV4MarkDemoAccepted(weekOffset, dayOfWeek, mealId);
    showToast('Pasto accettato!', '✅');
    renderPianoV4DayOverlay();
  } catch (err) {
    console.error('[piano-v4] Errore ACCETTA demo:', err);
    showToast('Errore, riprova', '⚠️');
  }
}

// ─── Step C.5 (21 mag 2026): storage helper sostituzione ───
// Per ogni weekOffset + dayOfWeek + slot, traccia quale alternativa è attiva.
// null = nessuna sostituzione (pasto originale). Key separata da accettazione.
function _pianoV4GetSubstitutionKey(weekOffset, dayOfWeek, slot) {
  const userId = (ST.user && ST.user.id) || (ST.profile && ST.profile.id) || 'anon';
  return `zona_pianov4_demo_subst_${userId}_w${weekOffset}_d${dayOfWeek}_${slot}`;
}
function _pianoV4GetActiveSubstitution(weekOffset, dayOfWeek, slot) {
  try {
    return localStorage.getItem(_pianoV4GetSubstitutionKey(weekOffset, dayOfWeek, slot));
  } catch (e) { return null; }
}
function _pianoV4SetActiveSubstitution(weekOffset, dayOfWeek, slot, altId) {
  try {
    const key = _pianoV4GetSubstitutionKey(weekOffset, dayOfWeek, slot);
    if (altId === null) localStorage.removeItem(key);
    else localStorage.setItem(key, altId);
  } catch (e) {}
}

// ─── Step C.6 (21 mag 2026): storage helper SALTO + action toggle ───
// Scoped per userId+weekOffset+dayOfWeek+originalSlot (no demoMealId: il salto è
// dello slot del giorno, non del pasto specifico — se sostituisco e poi salto,
// è lo slot pranzo che salta indipendentemente dall'alternativa scelta).
function _pianoV4GetSkippedKey(weekOffset, dayOfWeek, originalSlot) {
  const userId = (ST.user && ST.user.id) || (ST.profile && ST.profile.id) || 'anon';
  return `zona_pianov4_demo_skip_${userId}_w${weekOffset}_d${dayOfWeek}_${originalSlot}`;
}
function _pianoV4IsSlotSkipped(weekOffset, dayOfWeek, originalSlot) {
  try {
    return localStorage.getItem(_pianoV4GetSkippedKey(weekOffset, dayOfWeek, originalSlot)) === '1';
  } catch (e) { return false; }
}
function _pianoV4SetSlotSkipped(weekOffset, dayOfWeek, originalSlot, isSkipped) {
  try {
    const key = _pianoV4GetSkippedKey(weekOffset, dayOfWeek, originalSlot);
    if (isSkipped) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch (e) {}
}

// Toggle salto: tap su SALTO marca skipped, tap su "↺ ANNULLA" rimuove flag.
// Guard: pasto già accettato (in DB tab Oggi) non può essere saltato.
function togglePianoV4SkipMeal(originalSlot) {
  if (!ST.pianoV4DayOverlay) return;
  const dayOfWeek = ST.pianoV4DayOverlay.dayOfWeek;
  const weekOffset = ST.pianoV4DayOverlay.weekOffset;

  // Guard: pasto già accettato (in tab Oggi) non saltabile
  const originalMeals = _pianoV4GetDemoMeals(dayOfWeek);
  const original = originalMeals.find(function(o) { return o.slot === originalSlot; });
  if (!original) return;
  const currentMeal = _pianoV4GetMealForCard(original, weekOffset, dayOfWeek);
  if (_pianoV4IsDemoAccepted(weekOffset, dayOfWeek, currentMeal.id)) {
    showToast('Pasto già accettato, non puoi saltarlo', 'ℹ️');
    return;
  }

  const wasSkipped = _pianoV4IsSlotSkipped(weekOffset, dayOfWeek, originalSlot);
  _pianoV4SetSlotSkipped(weekOffset, dayOfWeek, originalSlot, !wasSkipped);
  showToast(wasSkipped ? 'Salto annullato' : 'Pasto saltato', wasSkipped ? '↺' : '✕');
  renderPianoV4DayOverlay(); // re-render: card cambia stato + totalizzatore aggiorna
}

// Restituisce il pasto effettivamente da mostrare nella card: se sostituzione
// attiva → alternativa scelta (con slot+time preservati dall'originale).
// Altrimenti → pasto originale invariato.
function _pianoV4GetMealForCard(originalMeal, weekOffset, dayOfWeek) {
  const altId = _pianoV4GetActiveSubstitution(weekOffset, dayOfWeek, originalMeal.slot);
  if (!altId) return originalMeal;
  const alternatives = _pianoV4GetAlternatives(originalMeal.slot);
  const chosen = alternatives.find(function(a) { return a.id === altId; });
  if (!chosen) return originalMeal;
  return Object.assign({}, chosen, { slot: originalMeal.slot, time: originalMeal.time });
}

// Demo data Step C.3 (20 mag 2026, decisione product): 5 pasti dimostrativi
// sempre visibili per ogni giorno, per tutti i tester. In Step F sostituiti
// dalla query Supabase weekly_plan_meals (logica: se rows>0 → reali, altrimenti
// → questi demo come fallback). Naming "Demo" non "Mock" perché permanenti.
function _pianoV4GetDemoMeals(dayOfWeek) {
  // dayOfWeek 1-7 ISO: in C.3 ignorato (stessi 5 pasti per ogni giorno).
  // In Step F differenziati per giorno reale.
  return [
    {
      id: 'demo-1', slot: 'colazione', time: '08:00',
      name: 'Porridge proteico',
      kcal: 450, carbs: 45, protein: 30, fat: 15,
      ingredients: ['Fiocchi avena 60g','Proteine vegetali vaniglia 25g','Frutti di bosco misti 100g','Mandorle 15g'],
      reasoning: 'Inizio energetico bilanciato 40-30-30 con proteine vegetali pescetariane e fibre per saziarti fino a metà mattina.'
    },
    {
      id: 'demo-2', slot: 'spuntino', time: '10:30',
      name: 'Yogurt soia + noci',
      kcal: 200, carbs: 18, protein: 12, fat: 10,
      ingredients: ['Yogurt soia bianco 150g','Noci 15g','Miele 5g'],
      reasoning: 'Spuntino dairy-free con proteine vegetali e grassi buoni delle noci per mantenere lucida la mattinata di lavoro.'
    },
    {
      id: 'demo-3', slot: 'pranzo', time: '13:00',
      name: 'Salmone griglia + quinoa',
      kcal: 580, carbs: 55, protein: 38, fat: 22,
      ingredients: ['Filetto salmone 150g','Quinoa 70g (peso secco)','Verdure miste grigliate 200g','Olio EVO 10g'],
      reasoning: 'Pranzo bilanciato con omega-3 del salmone (cuore + recupero) e quinoa come carboidrato complesso a basso indice glicemico. Coerente col profilo pescetariano.'
    },
    {
      id: 'demo-4', slot: 'merenda', time: '17:00',
      name: 'XS High Protein Energy Bar Cocco',
      kcal: 195, carbs: 19, protein: 15, fat: 7,
      ingredients: ['XS High Protein Energy Bar gusto Cocco 50g (1 barretta)'],
      reasoning: 'Pomeriggio pieno di impegni? La barretta XS Cocco offre 15g di proteine in formato 40-30-30 perfetto per la ricomposizione, senza dover cucinare. Mantiene stabili i livelli di energia fino a cena.'
    },
    {
      id: 'demo-5', slot: 'cena', time: '20:00',
      name: 'Frittata 2 uova + verdure',
      kcal: 480, carbs: 30, protein: 32, fat: 24,
      ingredients: ['Uova 2 (medie)','Spinaci freschi 150g','Pomodorini 100g','Pane integrale 40g','Olio EVO 8g'],
      reasoning: 'Cena leggera ma sostanziosa che testa la reintroduzione uova nel regime. Spinaci ricchi di ferro vegetale, pane integrale per coprire i carboidrati serali senza appesantire.'
    }
  ];
}

// Step C.5 (21 mag 2026): alternative dimostrative per ogni slot (3 × 5 = 15).
// Generiche non personalizzate sul profilo utente (la personalizzazione vera
// arriva in Step F con AI). Macro vicine all'originale ma non identiche, così
// totalizzatore giorno si muove visibilmente al cambio. Naming "Pasto test alt N"
// per chiarezza dimostrativa.
function _pianoV4GetAlternatives(originalSlot) {
  const alts = {
    colazione: [
      {
        id: 'alt-cola-1', name: 'Pasto test alt 1 - Toast avocado + uova',
        kcal: 420, carbs: 38, protein: 22, fat: 20,
        ingredients: ['Pane integrale 60g','Avocado 80g','2 uova in camicia','Pomodorini 100g'],
        reasoning: 'Alternativa proteica con grassi buoni dell\'avocado. Esempio dimostrativo che mostra come ' + COACH_NAME + ' potrà bilanciare diversamente la colazione mantenendo il target calorico vicino.'
      },
      {
        id: 'alt-cola-2', name: 'Pasto test alt 2 - Smoothie bowl di soia',
        kcal: 480, carbs: 58, protein: 24, fat: 14,
        ingredients: ['Latte di soia 200ml','Banana 1 (media)','Frutti di bosco 80g','Semi di chia 10g','Mandorle a scaglie 15g'],
        reasoning: 'Alternativa più ricca di carboidrati a basso indice glicemico. Esempio di come ' + COACH_NAME + ' potrà variare la fonte proteica restando dairy-free.'
      },
      {
        id: 'alt-cola-3', name: 'Pasto test alt 3 - Pancake proteici di avena',
        kcal: 460, carbs: 50, protein: 28, fat: 12,
        ingredients: ['Farina d\'avena 50g','Proteine vegetali vaniglia 20g','Albumi 100g','Frutti di bosco 80g','Sciroppo d\'acero 10g'],
        reasoning: 'Alternativa proteica più alta. Esempio di sostituzione utile in giorni con allenamento intenso al mattino.'
      }
    ],
    spuntino: [
      {
        id: 'alt-spun-1', name: 'Pasto test alt 1 - Frutta secca + mela',
        kcal: 210, carbs: 22, protein: 6, fat: 12,
        ingredients: ['Mandorle, nocciole, anacardi misti 25g','Mela 1 (media)'],
        reasoning: 'Alternativa più semplice e portatile. Esempio di sostituzione per giorni fuori casa.'
      },
      {
        id: 'alt-spun-2', name: 'Pasto test alt 2 - Shake proteico XS',
        kcal: 180, carbs: 6, protein: 25, fat: 4,
        ingredients: ['XS Hydrolyzed Whey Protein 1 misurino (40g)','Acqua 250ml'],
        reasoning: 'Alternativa ad alto contenuto proteico, ideale post-allenamento. Esempio di integrazione XS in giornate ad alta intensità.'
      },
      {
        id: 'alt-spun-3', name: 'Pasto test alt 3 - Hummus + verdure crude',
        kcal: 220, carbs: 24, protein: 9, fat: 10,
        ingredients: ['Hummus di ceci 60g','Carote crude 100g','Sedano 50g'],
        reasoning: 'Alternativa fibrosa e saziante. Esempio di sostituzione vegetariana piena.'
      }
    ],
    pranzo: [
      {
        id: 'alt-pran-1', name: 'Pasto test alt 1 - Tonno fresco + farro',
        kcal: 560, carbs: 58, protein: 36, fat: 18,
        ingredients: ['Tonno fresco 150g','Farro perlato 70g (peso secco)','Verdure miste 200g','Olio EVO 8g'],
        reasoning: 'Alternativa pescetariana con farro al posto della quinoa. Esempio di rotazione cereali integrali settimanale.'
      },
      {
        id: 'alt-pran-2', name: 'Pasto test alt 2 - Lenticchie + uova + pane',
        kcal: 600, carbs: 65, protein: 35, fat: 16,
        ingredients: ['Lenticchie cotte 200g','2 uova sode','Pane integrale 50g','Insalata mista 100g','Olio EVO 8g'],
        reasoning: 'Alternativa vegetariana con proteine combinate (legumi + uova). Esempio di pranzo a basso impatto ambientale.'
      },
      {
        id: 'alt-pran-3', name: 'Pasto test alt 3 - Branzino + patate + asparagi',
        kcal: 540, carbs: 48, protein: 40, fat: 16,
        ingredients: ['Branzino al cartoccio 180g','Patate al forno 200g','Asparagi 150g','Olio EVO 8g'],
        reasoning: 'Alternativa più proteica. Esempio di pranzo per giorni con allenamento di forza.'
      }
    ],
    merenda: [
      {
        id: 'alt-mere-1', name: 'Pasto test alt 1 - XS High Protein Bar Cioccolato',
        kcal: 195, carbs: 19, protein: 15, fat: 7,
        ingredients: ['XS High Protein Energy Bar gusto Cioccolato Fondente 50g (1 barretta)'],
        reasoning: 'Stesso prodotto XS in gusto diverso, identica formula 40-30-30. Esempio di rotazione gusti per evitare monotonia.'
      },
      {
        id: 'alt-mere-2', name: 'Pasto test alt 2 - Nutrilite All Plant Protein',
        kcal: 170, carbs: 8, protein: 22, fat: 5,
        ingredients: ['Nutrilite All Plant Protein 1 misurino (15g)','Acqua 250ml','1 piccolo frutto (mela o pera)'],
        reasoning: 'Alternativa Nutrilite ad alto contenuto proteico vegetale. Esempio di integrazione per chi cerca proteine plant-based.'
      },
      {
        id: 'alt-mere-3', name: 'Pasto test alt 3 - Ricotta di soia + mandorle',
        kcal: 220, carbs: 14, protein: 16, fat: 12,
        ingredients: ['Ricotta di soia 100g','Mandorle 15g','Cannella in polvere q.b.'],
        reasoning: 'Alternativa dairy-free fatta in casa. Esempio di merenda non-prodotto industriale.'
      }
    ],
    cena: [
      {
        id: 'alt-cena-1', name: 'Pasto test alt 1 - Salmone + insalata + patate dolci',
        kcal: 510, carbs: 38, protein: 34, fat: 22,
        ingredients: ['Salmone al forno 150g','Insalata mista 150g','Patate dolci al forno 200g','Olio EVO 8g'],
        reasoning: 'Alternativa pescetariana con omega-3 e carboidrati a basso indice glicemico. Esempio di cena con recupero post-allenamento.'
      },
      {
        id: 'alt-cena-2', name: 'Pasto test alt 2 - Tofu saltato + riso integrale',
        kcal: 460, carbs: 52, protein: 25, fat: 16,
        ingredients: ['Tofu naturale 150g','Riso integrale 60g (peso secco)','Verdure miste saltate 200g','Olio EVO 8g','Salsa di soia 5ml'],
        reasoning: 'Alternativa interamente vegetariana. Esempio di cena leggera senza proteine animali.'
      },
      {
        id: 'alt-cena-3', name: 'Pasto test alt 3 - Polpo + fagiolini + pane',
        kcal: 490, carbs: 36, protein: 38, fat: 18,
        ingredients: ['Polpo lesso 180g','Fagiolini al vapore 200g','Pane integrale 50g','Olio EVO 10g'],
        reasoning: 'Alternativa pescetariana più proteica. Esempio di cena per giorni con maggior fabbisogno proteico.'
      }
    ]
  };
  return alts[originalSlot] || [];
}

// Step C.5: bottom sheet selettore alternative SOSTITUISCI
// Pesata rapida (weight_logs) e promemoria pesata: spostato in app/body.js (Fondamenta 035, tappa 4).

function openPianoV4SubstituteSheet(slot) {
  if (!ST.pianoV4DayOverlay) return;
  const dayOfWeek = ST.pianoV4DayOverlay.dayOfWeek;
  const weekOffset = ST.pianoV4DayOverlay.weekOffset;
  ST.pianoV4SubstSheet = { slot: slot, weekOffset: weekOffset, dayOfWeek: dayOfWeek };
  renderPianoV4SubstituteSheet();
}

function closePianoV4SubstituteSheet() {
  const el = document.getElementById('pianov4-subst-sheet');
  if (el) {
    const screen = el.querySelector('.pianov4-subst-screen');
    if (screen) screen.classList.add('dismissing');
    setTimeout(function() {
      ST.pianoV4SubstSheet = null;
      const ex = document.getElementById('pianov4-subst-sheet');
      if (ex) ex.remove();
    }, 200);
  } else {
    ST.pianoV4SubstSheet = null;
  }
}

function applyPianoV4Substitution(altId) {
  if (!ST.pianoV4SubstSheet) return;
  const slot = ST.pianoV4SubstSheet.slot;
  const weekOffset = ST.pianoV4SubstSheet.weekOffset;
  const dayOfWeek = ST.pianoV4SubstSheet.dayOfWeek;
  // altId === '__reset__' sentinel → torna al pasto originale (rimuove dal localStorage)
  const toSave = (altId === '__reset__') ? null : altId;
  _pianoV4SetActiveSubstitution(weekOffset, dayOfWeek, slot, toSave);
  showToast(toSave ? 'Pasto sostituito' : 'Tornato all\'originale', '⇄');
  closePianoV4SubstituteSheet();
  renderPianoV4DayOverlay(); // re-render overlay → card e totalizzatore aggiornati
}

function renderPianoV4SubstituteSheet() {
  if (!ST.pianoV4SubstSheet) return;
  const slot = ST.pianoV4SubstSheet.slot;
  const weekOffset = ST.pianoV4SubstSheet.weekOffset;
  const dayOfWeek = ST.pianoV4SubstSheet.dayOfWeek;
  const currentAltId = _pianoV4GetActiveSubstitution(weekOffset, dayOfWeek, slot);
  const alternatives = _pianoV4GetAlternatives(slot);

  const resetBtnHTML = currentAltId
    ? `<button class="pianov4-subst-reset" onclick="applyPianoV4Substitution('__reset__')">↺ Torna al pasto originale</button>`
    : '';
  const altsHTML = alternatives.map(function(a) {
    const sel = (currentAltId === a.id) ? ' pianov4-subst-card-selected' : '';
    return `<div class="pianov4-subst-card${sel}" onclick="applyPianoV4Substitution('${esc(a.id)}')">
      <div class="pianov4-subst-card-name">${esc(a.name)}</div>
      <div class="pianov4-subst-card-macros">${a.kcal} KCAL · ${a.carbs}g C · ${a.protein}g P · ${a.fat}g G</div>
      <div class="pianov4-subst-card-reasoning">${esc(a.reasoning)}</div>
    </div>`;
  }).join('');

  const html = `<div id="pianov4-subst-sheet" class="pianov4-subst-overlay" onclick="if(event.target===this)closePianoV4SubstituteSheet()">
    <div class="pianov4-subst-screen">
      <div class="pianov4-subst-handle"></div>
      <div class="pianov4-subst-header">
        <div class="pianov4-subst-eyebrow">SOSTITUISCI ${esc(slot.toUpperCase())}</div>
        <div class="pianov4-subst-title">Scegli un'alternativa</div>
        <button class="pianov4-subst-close" onclick="closePianoV4SubstituteSheet()" aria-label="Chiudi">×</button>
      </div>
      <div class="pianov4-subst-list">
        ${resetBtnHTML}
        ${altsHTML}
      </div>
    </div>
  </div>`;

  const existing = document.getElementById('pianov4-subst-sheet');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

// ═══════════════════════════════════════════════════════════
// PIANO V4 Passo 2 (25 mag 2026) — Lettura pasti VERI da weekly_plan_meals
// Se per la settimana esiste un piano vero con pasti (>0 righe) → li mostriamo
// al posto dei demo. Altrimenti fallback al comportamento Step C.3 (demo + banner).
// Cache in-memory per (user_id, week_start) per non re-fetchare ad ogni render.
// ═══════════════════════════════════════════════════════════

// Helper: ritorna 'YYYY-MM-DD' del lunedì della settimana selezionata via offset.
function _pianoV4WeekStartIsoForOffset(offset) {
  return _pianoV4MondayToIso(getPianoV4WeekStart(offset || 0));
}

// Helper: ritorna l'entry cache per la settimana, o undefined se mai caricata.
function _pianoV4GetCachedPlanWeek(weekStartIso) {
  if (!ST.pianoV4RealPlanCache) ST.pianoV4RealPlanCache = {};
  return ST.pianoV4RealPlanCache[weekStartIso];
}

// Mapper: trasforma una riga weekly_plan_meals nel formato della card UI
// (atteso da renderPianoV4MealsList / renderPianoV4DayTotals).
function _pianoV4MapRealMealToCard(row) {
  // ingredients può arrivare come array (jsonb già parsato) o stringa (parse difensivo)
  let ings = row.ingredients;
  if (typeof ings === 'string') {
    try { ings = JSON.parse(ings); } catch (e) { ings = []; }
  }
  if (!Array.isArray(ings)) ings = [];
  ings = ings.filter(function(x) { return typeof x === 'string' && x.trim().length > 0; });
  const slot = String(row.slot || '').toLowerCase();
  const time = (row.meal_time && String(row.meal_time).trim())
    || (slot === 'pranzo' ? '13:00' : (slot === 'cena' ? '20:00' : ''));
  return {
    id:          'real-' + row.id,            // prefisso anti-collisione con id demo
    realId:      row.id,                       // uuid originale (riservato a futura logica acceptance)
    slot:        slot,
    time:        time,
    name:        String(row.description || '').trim(),
    kcal:        (row.kcal != null) ? Number(row.kcal) : 0,
    carbs:       (row.carbs != null) ? Number(row.carbs) : 0,
    protein:     (row.protein != null) ? Number(row.protein) : 0,
    fat:         (row.fat != null) ? Number(row.fat) : 0,
    ingredients: ings,
    reasoning:   String(row.ai_explanation || '').trim(),
    sort_order:  (row.sort_order != null) ? Number(row.sort_order) : 99,
  };
}

// Loader async: carica piano + pasti veri per quella week_start e popola la cache.
// Fire-and-forget — non blocca il render. Re-render automatico al completamento
// se l'utente è ancora sul tab Piano o ha l'overlay dettaglio giorno aperto.
async function _pianoV4LoadRealPlanForWeek(weekStartIso) {
  if (!ST.user || !ST.user.id || ST.user.id === 'test-user-001') return;
  if (!ST.pianoV4RealPlanCache) ST.pianoV4RealPlanCache = {};
  const existing = ST.pianoV4RealPlanCache[weekStartIso];
  if (existing) {
    // Bugfix 25 mag (notte): le entries POSITIVE (state='loaded' + plan trovato)
    // sono cache stabili — niente refetch. Le entries 'loading' evitano race fra
    // chiamate concorrenti. Ma le entries NEGATIVE ('loaded' con plan=null) NON
    // sono "verità durevoli": il piano potrebbe essere stato creato dal postino
    // o sincronizzato da un altro device dopo la prima fetch fallita a vuoto.
    // Le ri-tentiamo sempre al prossimo trigger.
    if (existing.state === 'loading') return;
    if (existing.state === 'loaded' && existing.plan) {
      // Se plan esiste ma mealsByDay è vuoto → possibile RLS mismatch o errore rete: retry
      const mbd = existing.mealsByDay || {};
      const hasMeals = Object.keys(mbd).some(function(d) { return mbd[d] && mbd[d].length > 0; });
      if (hasMeals) return; // cache valida, niente retry
      // altrimenti fall-through: cancella cache entry e ricarica
    }
    // existing.state === 'loaded' && existing.plan === null → fall-through e ricarica
  }
  ST.pianoV4RealPlanCache[weekStartIso] = { state: 'loading' };

  function reRenderIfVisible() {
    if (ST.page === 'piano') {
      try { renderPianoV4(); } catch (e) { /* defensive */ }
    }
    if (ST.page === 'oggi') {
      // 25 mag sera: tab Oggi consuma weekly_plan_meals via getTodayPianoMeals
      // per la riga "PIANIFICATO · DAL COACH". Al ritorno cache, re-render.
      try { renderOggi(); } catch (e) { /* defensive */ }
    }
    if (ST.pianoV4DayOverlay) {
      try { renderPianoV4DayOverlay(); } catch (e) { /* defensive */ }
    }
  }

  try {
    const planRes = await supa
      .from('weekly_plans')
      .select('id, week_start, status, target_kcal, target_protein, target_carbs, target_fat, ai_reasoning')
      .eq('user_id', ST.user.id)
      .eq('week_start', weekStartIso)
      .limit(1);
    if (planRes.error) {
      console.warn('[piano-v4 passo2] fetch weekly_plans error:', planRes.error);
      ST.pianoV4RealPlanCache[weekStartIso] = { state: 'loaded', plan: null, mealsByDay: {} };
      reRenderIfVisible();
      return;
    }
    const plan = (planRes.data && planRes.data.length > 0) ? planRes.data[0] : null;
    if (!plan) {
      ST.pianoV4RealPlanCache[weekStartIso] = { state: 'loaded', plan: null, mealsByDay: {} };
      reRenderIfVisible();
      return;
    }
    // Plan esiste — carica i suoi pasti
    const mealsRes = await supa
      .from('weekly_plan_meals')
      .select('id, plan_id, day_of_week, slot, description, ingredients, meal_time, kcal, protein, carbs, fat, ai_explanation, sort_order')
      .eq('plan_id', plan.id)
      .order('day_of_week', { ascending: true })
      .order('sort_order',  { ascending: true });
    if (mealsRes.error) {
      console.warn('[piano-v4 passo2] fetch weekly_plan_meals error:', mealsRes.error);
      ST.pianoV4RealPlanCache[weekStartIso] = { state: 'loaded', plan: plan, mealsByDay: {} };
      reRenderIfVisible();
      return;
    }
    const mealsByDay = {};
    (mealsRes.data || []).forEach(function(row) {
      const dow = Number(row.day_of_week);
      if (!Number.isInteger(dow) || dow < 1 || dow > 7) return;
      if (!mealsByDay[dow]) mealsByDay[dow] = [];
      mealsByDay[dow].push(_pianoV4MapRealMealToCard(row));
    });
    ST.pianoV4RealPlanCache[weekStartIso] = { state: 'loaded', plan: plan, mealsByDay: mealsByDay };
    reRenderIfVisible();
  } catch (e) {
    console.warn('[piano-v4 passo2] exception:', e);
    ST.pianoV4RealPlanCache[weekStartIso] = { state: 'loaded', plan: null, mealsByDay: {} };
    reRenderIfVisible();
  }
}

// Helper sync: ritorna l'array di pasti veri per il giorno specifico,
// oppure null se la cache non è popolata (state !== 'loaded' o nessun piano).
// Un array vuoto = piano esiste ma nessun pasto per quel giorno (es. utente futuro
// con piano solo per alcuni giorni).
function _pianoV4GetRealMealsForDay(weekOffset, dayOfWeek) {
  const iso = _pianoV4WeekStartIsoForOffset(weekOffset);
  const entry = _pianoV4GetCachedPlanWeek(iso);
  if (!entry || entry.state !== 'loaded' || !entry.plan) return null;
  return entry.mealsByDay[dayOfWeek] || [];
}

// Helper sync: true se per la settimana c'è un piano vero caricato (con almeno 1 pasto).
function _pianoV4HasRealPlanForWeek(weekOffset) {
  const iso = _pianoV4WeekStartIsoForOffset(weekOffset);
  const entry = _pianoV4GetCachedPlanWeek(iso);
  if (!entry || entry.state !== 'loaded' || !entry.plan) return false;
  // Plan esiste ma vuoto di pasti → consideriamo "non ancora pronto" lato UI
  const mbd = entry.mealsByDay || {};
  for (let d = 1; d <= 7; d++) {
    if (mbd[d] && mbd[d].length > 0) return true;
  }
  return false;
}

// Helper sync: numero di giorni della settimana che hanno almeno 1 pasto vero.
// Usato dal contatore della card stato in renderPianoV4 (N/7).
function _pianoV4CountDaysWithRealMeals(weekOffset) {
  const iso = _pianoV4WeekStartIsoForOffset(weekOffset);
  const entry = _pianoV4GetCachedPlanWeek(iso);
  if (!entry || entry.state !== 'loaded' || !entry.plan) return 0;
  const mbd = entry.mealsByDay || {};
  let n = 0;
  for (let d = 1; d <= 7; d++) if (mbd[d] && mbd[d].length > 0) n++;
  return n;
}

// Step C.5: totalizzatore giorno in cima all'overlay con feedback range vs target.
// Somma kcal/macro dei pasti effettivi (con sostituzioni applicate per i demo).
// Tolleranza ±10% vs ST.TARGET.kcal per stato "in range" / "sotto" / "sopra".
// Passo 2 (25 mag): se isRealPlan=true → niente judgment in/sotto/sopra
// (i pasti veri coprono solo il 60% del giorno = pranzo+cena, confronto col 100%
// del target sarebbe sempre "sotto"). Mostriamo solo somma + macro + eyebrow chiaro.
function renderPianoV4DayTotals(originalMeals, isRealPlan) {
  if (!ST.pianoV4DayOverlay) return '';
  const dayOfWeek = ST.pianoV4DayOverlay.dayOfWeek;
  const weekOffset = ST.pianoV4DayOverlay.weekOffset;

  let totals = { kcal: 0, carbs: 0, protein: 0, fat: 0 };
  let skippedCount = 0;
  originalMeals.forEach(function(orig) {
    // Passo 2 (25 mag): in modalità piano vero ignoriamo flag skipped/substituted
    // demo (sono in localStorage solo per la modalità demo). Somma diretta.
    if (!isRealPlan && _pianoV4IsSlotSkipped(weekOffset, dayOfWeek, orig.slot)) {
      skippedCount++;
      return;
    }
    const m = isRealPlan ? orig : _pianoV4GetMealForCard(orig, weekOffset, dayOfWeek);
    totals.kcal += (m.kcal || 0);
    totals.carbs += (m.carbs || 0);
    totals.protein += (m.protein || 0);
    totals.fat += (m.fat || 0);
  });

  const target = (ST.TARGET && ST.TARGET.kcal) ? ST.TARGET.kcal : 2326;
  const skippedNote = skippedCount > 0
    ? `<span class="pianov4-day-totals-skip-note">· ${skippedCount} saltat${skippedCount === 1 ? 'o' : 'i'}</span>`
    : '';

  if (isRealPlan) {
    // Passo 2: piano vero copre solo pranzo+cena (60% giornata). Niente judgment
    // in/sotto/sopra: l'utente gestisce liberamente colazione e merenda fuori dal
    // piano del coach. Mostriamo somma + macro + eyebrow esplicito.
    return `<div class="pianov4-day-totals pianov4-day-totals-real">
      <div class="pianov4-day-totals-header">
        <span class="pianov4-day-totals-eyebrow">TOTALE PRANZO + CENA · 60% DELLA GIORNATA${skippedNote}</span>
      </div>
      <div class="pianov4-day-totals-row">
        <span class="pianov4-day-totals-kcal">${totals.kcal} KCAL</span>
        <span class="pianov4-day-totals-target">su ${fmtNum(target)} totali</span>
      </div>
      <div class="pianov4-day-totals-macros">
        ${totals.carbs}g C · ${totals.protein}g P · ${totals.fat}g G
      </div>
    </div>`;
  }

  // Modalità demo (Step C.5): judgment range ±10% vs target intero
  const tolerance = 0.10;
  const kcalLow = target * (1 - tolerance);
  const kcalHigh = target * (1 + tolerance);
  const inRange = totals.kcal >= kcalLow && totals.kcal <= kcalHigh;
  const status = inRange ? 'in-range' : (totals.kcal < kcalLow ? 'under' : 'over');
  const icon = inRange ? '✓' : (status === 'under' ? '↓' : '↑');
  const label = inRange ? 'IN RANGE' : (status === 'under' ? 'SOTTO TARGET' : 'SOPRA TARGET');

  return `<div class="pianov4-day-totals pianov4-day-totals-${status}">
    <div class="pianov4-day-totals-header">
      <span class="pianov4-day-totals-eyebrow">TOTALE GIORNO (CON SOSTITUZIONI)${skippedNote}</span>
      <span class="pianov4-day-totals-status">${icon} ${label}</span>
    </div>
    <div class="pianov4-day-totals-row">
      <span class="pianov4-day-totals-kcal">${totals.kcal} KCAL</span>
      <span class="pianov4-day-totals-target">/ ${fmtNum(target)} target</span>
    </div>
    <div class="pianov4-day-totals-macros">
      ${totals.carbs}g C · ${totals.protein}g P · ${totals.fat}g G
    </div>
  </div>`;
}

// Banner "ESEMPIO DIMOSTRATIVO": visibile SOLO in modalità demo (Passo 2, 25 mag).
// In modalità piano vero (rows>0 in weekly_plan_meals per quel giorno) → sparisce.
function renderPianoV4DemoBanner(isRealPlan) {
  if (isRealPlan) return '';
  return `<div class="pianov4-demo-banner">
    <div class="pianov4-demo-banner-label">ESEMPIO DIMOSTRATIVO</div>
    <div class="pianov4-demo-banner-text">Questi sono pasti di esempio, per mostrarti come funzionerà il piano di ${COACH_NAME}. Il tuo piano personalizzato arriverà domenica sera.</div>
  </div>`;
}

// Lista card pasto con macro + ingredienti + box "PERCHÉ TI PROPONGO QUESTO".
// Step C.4: aggiunti bottoni azione (ACCETTA attivo + SOSTITUISCI/SALTO ghost disabled).
// Step C.5: SOSTITUISCI attivo (secondary) + card mostra pasto effettivo (originale o
// alternativa scelta) + badge ⇄ SOSTITUITO. ACCETTA disattiva SOSTITUISCI (no duplicati).
// Passo 2 (25 mag): in modalità piano vero (isRealPlan=true) i 3 bottoni vengono
// resi GHOST disabilitati con title="Disponibile presto". La logica reale di
// ACCETTA/SOSTITUISCI/SALTO sui pasti veri arriva in una sessione dedicata.
function renderPianoV4MealsList(originalMeals, isRealPlan) {
  if (!ST.pianoV4DayOverlay) return '';
  const dayOfWeek = ST.pianoV4DayOverlay.dayOfWeek;
  const weekOffset = ST.pianoV4DayOverlay.weekOffset;

  const cards = originalMeals.map(function(originalMeal) {
    // C.5: pasto effettivo (originale o alternativa scelta tramite SOSTITUISCI)
    // Su piano vero non ci sono sostituzioni demo (id 'real-…' non matcha gli alt-…),
    // quindi _pianoV4GetMealForCard ritorna `originalMeal` invariato.
    const m = isRealPlan ? originalMeal : _pianoV4GetMealForCard(originalMeal, weekOffset, dayOfWeek);
    // In modalità piano vero: niente stati da localStorage demo (id 'real-…' non
    // matcha le chiavi demo-N → tutti i flag false).
    const isAccepted    = !isRealPlan && _pianoV4IsDemoAccepted(weekOffset, dayOfWeek, m.id);
    const isSubstituted = !isRealPlan && _pianoV4GetActiveSubstitution(weekOffset, dayOfWeek, originalMeal.slot) !== null;
    // C.6: stato saltato per slot (no demoMealId, è dello slot del giorno)
    const isSkipped     = !isRealPlan && _pianoV4IsSlotSkipped(weekOffset, dayOfWeek, originalMeal.slot);

    const ingredientsHTML = (m.ingredients || []).map(function(i) {
      return `<li>${esc(i)}</li>`;
    }).join('');

    // Classi card: combinazione stati (accepted ha precedenza visiva su substituted;
    // skipped è ortogonale ma sovrascrive badge substituted nel render badge)
    const cardCls = 'pianov4-meal-card'
      + (isAccepted ? ' pianov4-meal-card-accepted' : '')
      + (isSkipped ? ' pianov4-meal-card-skipped' : '')
      + (isSubstituted && !isAccepted && !isSkipped ? ' pianov4-meal-card-substituted' : '');

    // Badge precedenza: accepted > skipped > substituted (un pasto accettato non può
    // essere saltato; un saltato ha priorità su sostituito perché più "definitivo")
    let topBadge = '';
    if (isAccepted) topBadge = `<div class="pianov4-meal-accepted-badge">✓ ACCETTATO</div>`;
    else if (isSkipped) topBadge = `<div class="pianov4-meal-skipped-badge">✕ SALTATO</div>`;
    else if (isSubstituted) topBadge = `<div class="pianov4-meal-substituted-badge">⇄ SOSTITUITO</div>`;

    // Bottoni: in modalità piano vero tutti ghost disabilitati ("Disponibile presto").
    let acceptBtn, substBtn, skipBtn;
    if (isRealPlan) {
      const tip = 'Azione disponibile presto sui pasti del piano';
      acceptBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-ghost" disabled title="${tip}">ACCETTA</button>`;
      substBtn  = `<button class="pianov4-meal-btn pianov4-meal-btn-ghost" disabled title="${tip}">SOSTITUISCI</button>`;
      skipBtn   = `<button class="pianov4-meal-btn pianov4-meal-btn-ghost" disabled title="${tip}">SALTO</button>`;
    } else {
      // ACCETTA: verde solid se libero, disabled se accepted, ghost se skipped
      if (isAccepted) {
        acceptBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-accepted" disabled>ACCETTATO</button>`;
      } else if (isSkipped) {
        acceptBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-ghost" disabled title="Pasto saltato">ACCETTA</button>`;
      } else {
        acceptBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-accept" onclick="acceptPianoV4DemoMeal('${esc(m.id)}')">ACCETTA</button>`;
      }
      // SOSTITUISCI: attivo se libero, ghost se accepted o skipped
      if (isAccepted) {
        substBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-ghost" disabled title="Pasto già accettato">SOSTITUISCI</button>`;
      } else if (isSkipped) {
        substBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-ghost" disabled title="Pasto saltato">SOSTITUISCI</button>`;
      } else {
        substBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-secondary" onclick="openPianoV4SubstituteSheet('${esc(originalMeal.slot)}')">SOSTITUISCI</button>`;
      }
      // SALTO: attivo se libero, ↺ ANNULLA se skipped, ghost se accepted (definitivo)
      if (isAccepted) {
        skipBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-ghost" disabled title="Pasto già accettato">SALTO</button>`;
      } else if (isSkipped) {
        skipBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-skip-active" onclick="togglePianoV4SkipMeal('${esc(originalMeal.slot)}')">↺ ANNULLA</button>`;
      } else {
        skipBtn = `<button class="pianov4-meal-btn pianov4-meal-btn-skip" onclick="togglePianoV4SkipMeal('${esc(originalMeal.slot)}')">SALTO</button>`;
      }
    }

    return `<div class="${cardCls}" data-meal-id="${esc(m.id)}">
      ${topBadge}
      <div class="pianov4-meal-header">
        <div class="pianov4-meal-slot">${esc(originalMeal.slot.toUpperCase())} · ${esc(originalMeal.time)}</div>
        <div class="pianov4-meal-name">${esc(m.name)}</div>
      </div>
      <div class="pianov4-meal-macros">
        <span class="pianov4-meal-kcal">${m.kcal} KCAL</span>
        <span class="pianov4-meal-macro-sep">·</span>
        <span>${m.carbs}g C</span>
        <span class="pianov4-meal-macro-sep">·</span>
        <span>${m.protein}g P</span>
        <span class="pianov4-meal-macro-sep">·</span>
        <span>${m.fat}g G</span>
      </div>
      <div class="pianov4-meal-ingredients-label">INGREDIENTI</div>
      <ul class="pianov4-meal-ingredients">${ingredientsHTML}</ul>
      <div class="pianov4-meal-reasoning">
        <div class="pianov4-meal-reasoning-label">PERCHÉ TI PROPONGO QUESTO</div>
        <div class="pianov4-meal-reasoning-text">${esc(m.reasoning)}</div>
      </div>
      <div class="pianov4-meal-actions">
        ${acceptBtn}
        ${substBtn}
        ${skipBtn}
      </div>
    </div>`;
  }).join('');
  return `<div class="pianov4-meals-list">${cards}</div>`;
}

function renderPianoV4DayOverlay() {
  if (!ST.pianoV4DayOverlay) return; // defensive cleanup
  const s = ST.pianoV4DayOverlay;
  const titleStr = _pianoV4FormatDayHeader(s.weekOffset, s.dayOfWeek);

  // Passo 2 (25 mag): query weekly_plan_meals via cache. Fire-and-forget se mai
  // caricato: la cache viene popolata async e re-renderizza l'overlay al ritorno.
  const weekStartIso = _pianoV4WeekStartIsoForOffset(s.weekOffset);
  const cacheEntry = _pianoV4GetCachedPlanWeek(weekStartIso);
  if (!cacheEntry) {
    _pianoV4LoadRealPlanForWeek(weekStartIso); // fire-and-forget; non bloccante
  }
  const realMeals = _pianoV4GetRealMealsForDay(s.weekOffset, s.dayOfWeek);
  const isRealPlan = Array.isArray(realMeals) && realMeals.length > 0;

  // Se piano vero presente → 2 card (pranzo+cena ordinate per sort_order).
  // Altrimenti → fallback ai 5 demo (banner + judgment range).
  const meals = isRealPlan ? realMeals : _pianoV4GetDemoMeals(s.dayOfWeek);

  const overlayHTML = `<div id="pianov4-day-overlay" class="pianov4-day-overlay" onclick="if(event.target===this)closePianoV4DayOverlay()">
    <div class="pianov4-day-screen" onclick="event.stopPropagation()">
      <div class="pianov4-day-header">
        <div class="pianov4-day-accent-bar"></div>
        <button class="pianov4-day-close" onclick="closePianoV4DayOverlay()" aria-label="Chiudi">×</button>
        <div class="pianov4-day-eyebrow">DETTAGLIO GIORNO</div>
        <div class="pianov4-day-title">${esc(titleStr)}</div>
      </div>
      ${renderPianoV4DemoBanner(isRealPlan)}
      ${renderPianoV4DayTotals(meals, isRealPlan)}
      ${renderPianoV4MealsList(meals, isRealPlan)}
      ${isRealPlan ? `
        <div class="pianov4-day-free-meals-note">
          <div class="pianov4-day-free-meals-eyebrow">COLAZIONE &amp; MERENDA</div>
          <div class="pianov4-day-free-meals-text">Colazione e merenda le gestisci tu: questo spazio resta libero per le tue preferenze. ${COACH_NAME} (il tuo coach AI) pensa a pranzo e cena, i due pasti principali della giornata.</div>
        </div>
      ` : ''}
    </div>
  </div>`;

  // Re-render safe: rimuovi esistente prima di ricreare
  const existing = document.getElementById('pianov4-day-overlay');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', overlayHTML);
}

function renderPianoV4() {
  // ── Header V3 (riusa pattern renderOggi/renderIntegratori/renderAnalisi) ──
  const profile  = ST.profile || {};
  const fname    = String(profile.first_name || '').trim();
  const lname    = String(profile.last_name  || '').trim();
  const initials = ((fname.charAt(0) + lname.charAt(0)).toUpperCase()) || (fname.charAt(0) || '?').toUpperCase();
  const now2 = new Date();
  const DAY_S = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
  const MON_S = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
  const dateEb = `${DAY_S[now2.getDay()]} ${now2.getDate()} ${MON_S[now2.getMonth()]} · PIANO`;

  const v3Header = `
    <div class="oggi-v3-accent"></div>
    <div class="oggi-v3-header">
      <div class="oggi-v3-header-text">
        <div class="oggi-v3-eyebrow">${dateEb}</div>
        <div class="oggi-v3-title">Nutrition</div>
      </div>
      <button class="oggi-v3-avatar" onclick="openSettingsModal()" title="Impostazioni profilo">${esc(initials)}</button>
    </div>
    <div class="oggi-v3-subnav">
      ${['oggi','integratori','analisi','piano'].map(id => {
        const labels = { oggi:'OGGI', integratori:'INTEGRATORI', analisi:'ANALISI', piano:'PIANO' };
        return `<button class="oggi-v3-pill${id==='piano'?' active':''}" onclick="showPage('${id}')">${labels[id]}</button>`;
      }).join('')}
    </div>`;

  // ── Nav settimane ──
  const offset = ST.pianoV4WeekOffset || 0;
  const weekStart = getPianoV4WeekStart(offset);
  const weekLabel = formatPianoV4WeekLabel(weekStart);
  const weekNav = `
    <div class="pianov4-week-nav">
      <button class="pianov4-week-arrow" onclick="ST.pianoV4WeekOffset--; renderPianoV4();" title="Settimana precedente">‹</button>
      <div class="pianov4-week-label">${weekLabel}</div>
      <button class="pianov4-week-arrow" onclick="ST.pianoV4WeekOffset++; renderPianoV4();" title="Settimana successiva">›</button>
    </div>`;

  // ── Passo 2 (25 mag): fire-and-forget load piano vero per la settimana visualizzata ──
  // Al ritorno cache popolata → re-render automatico (reRenderIfVisible nel loader).
  try {
    const weekIsoForLoad = _pianoV4WeekStartIsoForOffset(offset);
    if (!_pianoV4GetCachedPlanWeek(weekIsoForLoad)) _pianoV4LoadRealPlanForWeek(weekIsoForLoad);
  } catch (e) { /* defensive */ }
  const hasRealPlan = _pianoV4HasRealPlanForWeek(offset);
  const realDaysCount = _pianoV4CountDaysWithRealMeals(offset);

  // ── Card stato settimana ──
  // Hint contestuale: settimana corrente/passata/futura ⨉ piano vero presente o no.
  // Counter "X/7": Passo 2 mostra il numero di giorni con pasti veri presenti.
  // Logica "giorni effettivamente seguiti" (acceptance reale) arriva in sessione dedicata.
  let statusHint = '';
  if (hasRealPlan) {
    statusHint = realDaysCount === 7
      ? 'Piano pronto · pranzi e cene per tutti i 7 giorni.'
      : `Piano pronto · pranzi e cene per ${realDaysCount} ${realDaysCount === 1 ? 'giorno' : 'giorni'}.`;
  } else if (offset === 0) {
    statusHint = 'Il tuo primo piano arriverà domenica sera.';
  } else if (offset < 0) {
    statusHint = 'Settimana archiviata · nessun piano registrato.';
  } else {
    statusHint = 'Piano in arrivo · sarà generato domenica sera.';
  }
  const badgeCls = hasRealPlan ? 'pianov4-status-badge' : 'pianov4-status-badge pianov4-status-badge-empty';
  const counterValue = hasRealPlan ? realDaysCount : 0;
  const statusCard = `
    <div class="pianov4-status-card">
      <div class="pianov4-status-row">
        <span class="${badgeCls}">ATTIVO</span>
        <span class="pianov4-status-count">${counterValue}<span class="pianov4-status-count-total">/7</span></span>
        <span class="pianov4-status-label">GIORNI CON PASTI</span>
      </div>
      <div class="pianov4-status-bar">
        ${Array(7).fill(0).map(function(_, idx){
          const dow = idx + 1;
          const hasReal = _pianoV4GetRealMealsForDay(offset, dow);
          const segCls = (hasReal && hasReal.length > 0) ? 'pianov4-status-seg pianov4-status-seg-real' : 'pianov4-status-seg';
          return `<span class="${segCls}"></span>`;
        }).join('')}
      </div>
      <p class="pianov4-status-hint">${statusHint}</p>
      <button class="pianov4-rigenera-btn" onclick="pianoV4RigeneraPiano()" ${ST._pianoRigeneraLoading ? 'disabled' : ''}>
        ${ST._pianoRigeneraLoading ? 'GENERAZIONE IN CORSO…' : 'RIGENERA PIANO →'}
      </button>
    </div>`;

  // ── 7 card giorno (Step C.1: tap → openPianoV4DayOverlay con dayOfWeek 1-7 ISO) ──
  // Passo 2: se per quel giorno esistono pasti veri → riepilogo compatto + niente
  // "Nessun pasto pianificato". Altrimenti comportamento demo invariato.
  const days = getPianoV4Days(weekStart);
  const daysHTML = `
    <div class="pianov4-days">
      ${days.map(function(d, i) {
        const dow = i + 1; // 1=LUN, 7=DOM (ISO, coerente con weekly_plan_meals.day_of_week CHECK)
        const todayBadge = d.isToday ? `<span class="pianov4-day-today">OGGI</span>` : '';
        const dayRealMeals = _pianoV4GetRealMealsForDay(offset, dow);
        if (dayRealMeals && dayRealMeals.length > 0) {
          // Lista compatta dei pasti veri del giorno (max 2: pranzo + cena)
          const items = dayRealMeals.map(function(rm) {
            const slotLbl = (rm.slot || '').toUpperCase();
            const tlbl = rm.time ? ` ${esc(rm.time)}` : '';
            return `<li class="pianov4-day-real-row"><span class="pianov4-day-real-slot">${esc(slotLbl)}${tlbl}</span> <span class="pianov4-day-real-name">${esc(rm.name || '')}</span></li>`;
          }).join('');
          return `<div class="pianov4-day-card pianov4-day-card-real" onclick="openPianoV4DayOverlay(${dow})">
            <div class="pianov4-day-head">
              <span class="pianov4-day-name">${d.name}</span>
              ${todayBadge}
              <span class="pianov4-day-date">${d.dateLabel}</span>
            </div>
            <ul class="pianov4-day-real-list">${items}</ul>
          </div>`;
        }
        return `<div class="pianov4-day-card pianov4-day-card-empty" onclick="openPianoV4DayOverlay(${dow})">
          <div class="pianov4-day-head">
            <span class="pianov4-day-name">${d.name}</span>
            ${todayBadge}
            <span class="pianov4-day-date">${d.dateLabel}</span>
          </div>
          <p class="pianov4-day-empty-text">Nessun pasto pianificato</p>
        </div>`;
      }).join('')}
    </div>`;

  // ── Memoria AI (B.3: stato vuoto/D1, no fetch da ai_memory) ──
  // Lista preferenze arriverà in Step G (Worker AI). Empty state invitante,
  // non sembra "rotto" — comunica comportamento atteso.
  const memoryCard = `
    <div class="pianov4-memory-card">
      <div class="pianov4-memory-head">
        <span class="pianov4-memory-eyebrow">MEMORIA · COACH</span>
        <span class="pianov4-memory-see-all">VEDI TUTTE ›</span>
      </div>
      <p class="pianov4-memory-empty">
        ${COACH_NAME} (il tuo coach AI) inizierà a memorizzare le tue preferenze man mano che registri pasti e fai sostituzioni.
      </p>
    </div>`;

  // ── Card peso flessibile (Step D.1: weight_logs prima sorgente, poi fallback Body) ──
  // Step D.1 (22 mag): la card legge ORA come prima fonte ST.weightLogs (Livello 1
  // pesate flessibili Piano V4). Se non ancora caricato → fire-and-forget load + refresh.
  // Fallback: getLatestBodyData (body_logs+body_measurements) → profile.weight_kg.
  if(ST.weightLogs === null && ST.user && ST.user.id && ST.user.id !== 'test-user-001') {
    // Carica in background — al ritorno, se siamo ancora su Piano, re-render.
    loadWeightLogs().then(function() { if(ST.page === 'piano') renderPianoV4(); });
  }
  let weightRaw = null;
  const wl0 = (ST.weightLogs && ST.weightLogs.length > 0) ? ST.weightLogs[0] : null;
  if(wl0 && wl0.weight_kg != null) weightRaw = wl0.weight_kg;
  if(weightRaw == null) {
    const latestBody = (typeof getLatestBodyData === 'function') ? getLatestBodyData() : {};
    if(latestBody && latestBody.weight_kg != null) weightRaw = latestBody.weight_kg;
  }
  if(weightRaw == null && profile && profile.weight_kg != null) weightRaw = profile.weight_kg;
  const weightNum = (weightRaw != null) ? Number(weightRaw) : null;
  const weightStr = (weightNum != null && !isNaN(weightNum)) ? weightNum.toFixed(1) : '—.—';
  const trackingMode = (profile && profile.weight_tracking_mode) || 'flexible';
  const MODE_LABELS = { daily: 'OGNI GIORNO', every3: 'OGNI 3 GIORNI', weekly: 'OGNI SETTIMANA', flexible: 'LIBERO' };
  const modeLabel = MODE_LABELS[trackingMode] || 'LIBERO';
  const weightCard = `
    <div class="pianov4-weight-card">
      <div class="pianov4-weight-head">
        <span class="pianov4-weight-eyebrow">PESO · FLESSIBILE</span>
        <span class="pianov4-weight-mode">${modeLabel}</span>
      </div>
      <div class="pianov4-weight-body">
        <div class="pianov4-weight-num-wrap">
          <span class="pianov4-weight-num">${weightStr}</span>
          <span class="pianov4-weight-unit">kg</span>
        </div>
        <div class="pianov4-weight-spark">
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" class="pianov4-spark-svg">
            <line x1="0" y1="20" x2="120" y2="20" stroke="var(--b1)" stroke-width="1" stroke-dasharray="3,3"/>
          </svg>
          <p class="pianov4-weight-spark-empty">Inizia a pesarti per vedere il trend</p>
        </div>
      </div>
      <button class="pianov4-weight-cta" onclick="openWeighInSheet()">+ PESATI ORA</button>
    </div>`;

  // ── Profile compatto in fondo (B.4: chiude la vista principale Tab Piano v4) ──
  // Grid 2×2 con obiettivo + target kcal + macro % + tracking peso.
  // CTA "MODIFICA ›" apre openSettingsModal esistente (no funzione nuova).
  // Guard difensivi: se obiettivo/TARGET mancanti → '—'.
  const objKey = (profile && profile.obiettivo) ? String(profile.obiettivo) : '';
  // Obiettivo è CSV (vedi calcAdaptedTargets); prendiamo il primo valore per il display compatto
  const objFirst = objKey ? objKey.split(',')[0].trim() : '';
  const objMap = {
    'ricomposizione': 'Ricomposizione',
    'dimagrimento': 'Dimagrimento',
    'mantenimento': 'Mantenimento',
    'ipertrofia': 'Ipertrofia',
    'forza_performance': 'Forza & Performance',
    'longevita': 'Longevità',
    'massa': 'Massa muscolare',
    'benessere_generale': 'Benessere',
  };
  const objLabel = objMap[objFirst] || (objFirst ? objFirst.replace(/_/g,' ').replace(/\b\w/g, function(c){return c.toUpperCase();}) : '—');

  const tgt = ST.TARGET || {kcal:0, protein:0, carbs:0, fat:0};
  const kcalLabel = (tgt.kcal && tgt.kcal > 0) ? fmtNum(tgt.kcal) + ' kcal' : '—';

  // Macro %: prefer ST.TARGET.pCarbo/pProt/pFat (dinamici da profilo), altrimenti calcola da grammi
  let pctC, pctP, pctF;
  if (tgt.pCarbo != null && tgt.pProt != null && tgt.pFat != null) {
    pctC = tgt.pCarbo; pctP = tgt.pProt; pctF = tgt.pFat;
  } else {
    const cK = (tgt.carbs || 0) * 4, pK = (tgt.protein || 0) * 4, fK = (tgt.fat || 0) * 9;
    const sumK = cK + pK + fK;
    if (sumK > 0) {
      pctC = Math.round(cK / sumK * 100);
      pctP = Math.round(pK / sumK * 100);
      pctF = Math.round(fK / sumK * 100);
    } else { pctC = pctP = pctF = null; }
  }
  const macroLabel = (pctC == null) ? '—' : `${pctC}·${pctP}·${pctF}`;

  const trackMap = { daily: 'Ogni giorno', every3: 'Ogni 3 giorni', weekly: 'Ogni settimana', flexible: 'Libero' };
  const trackLabel = trackMap[trackingMode] || 'Libero';

  const profileCard = `
    <div class="pianov4-profile-card">
      <div class="pianov4-profile-head">
        <span class="pianov4-profile-eyebrow">IMPOSTAZIONI · PIANO</span>
        <span class="pianov4-profile-edit" onclick="openSettingsModal()">MODIFICA ›</span>
      </div>
      <div class="pianov4-profile-grid">
        <div class="pianov4-profile-cell">
          <span class="pianov4-profile-label">OBIETTIVO</span>
          <span class="pianov4-profile-value">${esc(objLabel)}</span>
        </div>
        <div class="pianov4-profile-cell">
          <span class="pianov4-profile-label">TARGET</span>
          <span class="pianov4-profile-value pianov4-profile-value--mono">${kcalLabel}</span>
        </div>
        <div class="pianov4-profile-cell">
          <span class="pianov4-profile-label">MACRO</span>
          <span class="pianov4-profile-value pianov4-profile-value--mono">${macroLabel}</span>
        </div>
        <div class="pianov4-profile-cell">
          <span class="pianov4-profile-label">PESO</span>
          <span class="pianov4-profile-value">${esc(trackLabel)}</span>
        </div>
      </div>
    </div>`;

  document.getElementById('page-piano').innerHTML = v3Header + weekNav + statusCard + daysHTML + memoryCard + weightCard + profileCard + versionFooter();
}


// ═══════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════
async function navDay(dir){
  let all=Object.keys(ST.db.days).sort();
  let idx=all.indexOf(ST.activeDay);
  // Fondamenta 100, tappa 4: al primo giorno letto, ‹ legge il resto dello storico (una volta).
  if(idx+dir<0 && !ST.storicoCompleto){
    await caricaStoricoCompleto();
    all=Object.keys(ST.db.days).sort();
    idx=all.indexOf(ST.activeDay);
    if(idx+dir<0){ renderOggi(); return; }   // niente di piu' vecchio: il pulsante ora e' spento
  }
  const ni=idx+dir;
  if(ni<0||ni>=all.length) return;
  ST.activeDay=all[ni];
  ST.advice='';
  renderOggi();                          // subito, senza aspettare la rete
  // Gli extra si caricano per un giorno solo: cambiando giorno vanno ripresi,
  // altrimenti restano quelli del giorno precedente e finiscono nel totale
  // sbagliato. Il render si rifa' quando sono arrivati.
  try { await loadExtras(ST.activeDay); renderOggi(); } catch(e){ console.warn('navDay loadExtras:', e); }
}

async function toggleFasting(){
  const d=getDay(ST.activeDay);
  d.fasting=!d.fasting;
  await dbToggleFasting(ST.activeDay, d.fasting);
  renderOggi();
  saveCache();
}

async function toggleSuppTaken(localId, name){
  const d=getDay(ST.activeDay);
  const i=d.suppsTaken.indexOf(localId);
  const taking = i<0;
  if(taking) d.suppsTaken.push(localId);
  else d.suppsTaken.splice(i,1);
  const supp=ST.supps.find(s=>s.local_id===localId);
  await dbToggleSuppTaken(ST.activeDay, localId, name, taking, supp?.slot||'');
  renderOggi();
  saveCache();
}

// ═══════════════════════════════════════════════════════════
// SUPP SHEET
// ══════════════════════════════���════════════════════════════
function openSuppSheet() {
  const ss = ST.suppSheet;
  ss.mode = null; ss.selGroup = null; ss.singleQuery = ''; ss.singleSelId = null;
  ss.singleDose = 1; ss.singleUnit = 'cps';
  ss.singleTime = new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('supp-sheet').style.display = 'flex';
  renderSuppSheet();
}
function closeSuppSheet() {
  document.getElementById('supp-sheet').style.display = 'none';
}
function setSuppSheetMode(mode) {
  ST.suppSheet.mode = mode;
  ST.suppSheet.selGroup = null;
  renderSuppSheet();
}
function setSuppSheetGroup(slot) {
  ST.suppSheet.selGroup = ST.suppSheet.selGroup === slot ? null : slot;
  renderSuppSheet();
}
function renderSuppSheet() {
  const ss = ST.suppSheet;
  const actSupps = activeSupps();
  const day = getDay(ST.activeDay);
  const taken = day.suppsTaken || [];

  // Build groups same way as renderOggi
  const shakeSupps = actSupps.filter(s => s.grp === 'Shake Mami');
  const otherSupps = actSupps.filter(s => s.grp !== 'Shake Mami');
  const otherSlots = [...new Set(otherSupps.map(s => s.slot))].sort();
  const groups = [];
  if (shakeSupps.length) groups.push({ slot: '06:30', supps: shakeSupps });
  otherSlots.forEach(sl => groups.push({ slot: sl, supps: otherSupps.filter(s => s.slot === sl) }));

  const allSlots = [...new Set(actSupps.map(x => x.slot))].sort();

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
    <div>
      <div style="font-size:16px;font-weight:800;color:var(--t1);">🌿 Registra integratori</div>
      <div style="font-size:12px;color:var(--t3);font-family:'JetBrains Mono',monospace;margin-top:2px;">Come vuoi registrare?</div>
    </div>
    <button onclick="closeSuppSheet()" style="background:none;border:none;cursor:pointer;font-size:24px;color:var(--t3);line-height:1;">×</button>
  </div>
  <div class="ss-mode-grid">
    <div class="ss-mode-card${ss.mode==='gruppo'?' active':''}" onclick="setSuppSheetMode('gruppo')">
      <div class="ss-mc-icon">🗂️</div>
      <div class="ss-mc-title">Gruppo</div>
      <div class="ss-mc-sub">Slot preconfigurato</div>
    </div>
    <div class="ss-mode-card" onclick="openCatalogForRegisterExtra()">
      <div class="ss-mc-icon">💊</div>
      <div class="ss-mc-title">Singolo</div>
      <div class="ss-mc-sub">Fuori schema</div>
    </div>
  </div>`;

  if (ss.mode === 'gruppo') {
    html += `<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--t3);font-family:'JetBrains Mono',monospace;margin-bottom:10px;">Seleziona gruppo</div>`;
    const pendingGroups = groups.filter(g => g.supps.filter(s => taken.includes(s.local_id)).length === 0);
    if (!groups.length) {
      html += `<p style="font-size:13px;color:var(--t3);text-align:center;padding:20px 0;">Nessun integratore attivo.</p>`;
    } else if (!pendingGroups.length) {
      html += `<p style="font-size:13px;color:var(--t3);text-align:center;padding:20px 0;">Tutti i gruppi di oggi sono già stati registrati.</p>`;
    } else {
      pendingGroups.forEach(g => {
        const slotIdx = allSlots.indexOf(g.slot);
        const slotColor = SLOT_COLOR_MAP[g.slot] || SLOT_PAL[slotIdx >= 0 ? slotIdx % SLOT_PAL.length : 0];
        const label = suppGroupLabel(g.supps);
        const active = ss.selGroup === g.slot;
        html += `<div class="ss-group-item${active ? ' active' : ''}" onclick="setSuppSheetGroup('${g.slot}')">
          <div class="ss-group-dot" style="background:${slotColor};"></div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--t1);">${esc(label === 'INTEGRATORI' ? g.slot : label)}</div>
            <div style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace;">${g.slot} · ${g.supps.length} prodotti</div>
          </div>
          ${active ? '<span style="color:#2A7A6F;font-size:18px;">✓</span>' : ''}
        </div>`;
      });
    }
    const canConfirm = ss.selGroup !== null && pendingGroups.some(g => g.slot === ss.selGroup);
    html += `<button class="btn btn-primary btn-full" style="margin-top:14px;" ${canConfirm?'':'disabled'} onclick="confirmSuppGroup()">Conferma registrazione →</button>`;
  }

  if (ss.mode === 'singolo') {
    html += `<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--t3);font-family:'JetBrains Mono',monospace;margin-bottom:8px;">Cerca prodotto</div>
    <input class="inp inp-sm" id="ss-single-q" dir="ltr" placeholder="Nome prodotto..." autocomplete="off"
      oninput="ST.suppSheet.singleQuery=this.value;updateSingleResults()" style="margin-bottom:10px;"/>
    <div id="ss-single-results"></div>
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <div style="flex:1;"><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--t3);font-family:'JetBrains Mono',monospace;margin-bottom:4px;">Dose</div>
        <input class="inp inp-sm" type="number" min="0.5" step="0.5" value="${ss.singleDose}" oninput="ST.suppSheet.singleDose=+this.value" style="width:100%;"/></div>
      <div><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--t3);font-family:'JetBrains Mono',monospace;margin-bottom:4px;">Unità</div>
        <select class="inp inp-sm" data-role="unit" onchange="ST.suppSheet.singleUnit=this.value">${['cps','g','ml','bustina','barretta'].map(u=>`<option value="${u}"${u===ss.singleUnit?' selected':''}>${u}</option>`).join('')}</select></div>
      <div><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--t3);font-family:'JetBrains Mono',monospace;margin-bottom:4px;">Orario</div>
        <input class="inp inp-sm" type="time" value="${ss.singleTime}" onchange="ST.suppSheet.singleTime=this.value" style="width:80px;"/></div>
    </div>`;
    const canConfirmSingle = ss.singleSelId != null;
    html += `<button id="ss-confirm-single" class="btn btn-primary btn-full" style="margin-top:2px;" ${canConfirmSingle?'':'disabled'} onclick="confirmSuppSingle()">Conferma registrazione →</button>`;
  }

  html += `<button class="btn btn-ghost btn-full" style="margin-top:10px;" onclick="closeSuppSheet()">Annulla</button>`;
  document.getElementById('supp-sheet-body').innerHTML = html;
  if (ss.mode === 'singolo') {
    updateSingleResults();
    setTimeout(() => document.getElementById('ss-single-q')?.focus(), 50);
  }
}

function singleUnitFromCatItem(catItem) {
  const raw = suppUnitFromConfezione(catItem?.confezione, catItem?.linea);
  const norm = { bustine: 'bustina', barrette: 'barretta', cpr: 'cps', tavolette: 'barretta', tavoletta: 'barretta' };
  const mapped = norm[raw] || raw;
  const opts = ['cps', 'g', 'ml', 'bustina', 'barretta'];
  return opts.includes(mapped) ? mapped : 'cps';
}

function selectSingleProduct(id) {
  const ss = ST.suppSheet;
  if (ss.singleSelId === id) { ss.singleSelId = null; }
  else {
    ss.singleSelId = id;
    const catItem = (ST.catalog || []).find(c => c.id === id);
    if (catItem) {
      ss.singleUnit = singleUnitFromCatItem(catItem);
    }
  }
  updateSingleResults();
  // Aggiorna il select unità nel DOM senza re-render completo
  const unitSel = document.querySelector('#supp-sheet-body select[data-role="unit"]');
  if (unitSel) unitSel.value = ss.singleUnit;
}

function updateSingleResults() {
  const ss = ST.suppSheet;
  const q = (ss.singleQuery || '').toLowerCase();
  const results = (ST.catalog || []).filter(c => !q || (c.nome||'').toLowerCase().includes(q)).slice(0, 8);
  let html = '';
  if (results.length) {
    html += `<div style="max-height:180px;overflow-y:auto;border:1px solid var(--b2);border-radius:8px;margin-bottom:12px;">`;
    results.forEach(c => {
      const sel = ss.singleSelId === c.id;
      html += `<div onclick="selectSingleProduct(${c.id})" style="padding:8px 12px;cursor:pointer;background:${sel?'#E6F4F1':'transparent'};border-bottom:1px solid var(--b1);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;color:var(--t1);">${esc(c.nome||'')}</span>
        <span style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace;">${c.kcal||0} kcal</span>
      </div>`;
    });
    html += `</div>`;
  } else if (q) {
    html = `<p style="font-size:12px;color:var(--t3);margin-bottom:12px;">Nessun risultato.</p>`;
  }
  const el = document.getElementById('ss-single-results');
  if (el) el.innerHTML = html;
  const btn = document.getElementById('ss-confirm-single');
  if (btn) btn.disabled = ss.singleSelId == null;
}

async function refreshTimeline() {
  if (ST.activeDay === todayKey()) {
    await loadTodaySuppLog();
  }
  renderOggi();
  saveCache();
}

async function deleteSuppLog(name, time) {
  const { error } = await supa.from('supplements_log').delete()
    .eq('user_id', ST.user.id)
    .eq('date', ST.activeDay)
    .eq('supplement_name', name)
    .eq('slot', time);
  if (error) { console.error('deleteSuppLog error:', error); return; }
  const day = getDay(ST.activeDay);
  day.rawSuppLogs = (day.rawSuppLogs||[]).filter(l=>!(l.name===name && l.time===time));
  renderOggi();
  saveCache();
}

async function deleteSuppGroup(slot) {
  const day = getDay(ST.activeDay);
  const actSupps = activeSupps();
  const shakeSupps = actSupps.filter(s => s.grp === 'Shake Mami');
  const otherSupps = actSupps.filter(s => s.grp !== 'Shake Mami');
  const groupSupps = (slot === '06:30' && shakeSupps.length) ? shakeSupps : otherSupps.filter(s => s.slot === slot);
  const takenSupps = groupSupps.filter(s => (day.suppsTaken||[]).includes(s.local_id));
  if (!takenSupps.length) return;
  await Promise.all(takenSupps.map(s => dbToggleSuppTaken(ST.activeDay, s.local_id, s.name, false, s.slot || '')));
  takenSupps.forEach(s => {
    const i = (day.suppsTaken||[]).indexOf(s.local_id);
    if (i >= 0) day.suppsTaken.splice(i, 1);
    day.rawSuppLogs = (day.rawSuppLogs||[]).filter(l => l.name !== s.name);
  });
  renderOggi();
  saveCache();
  showToast('Gruppo rimosso');
}

async function confirmSuppGroup() {
  const ss = ST.suppSheet;
  if (!ss.selGroup) return;
  const actSupps = activeSupps();
  const shakeSupps = actSupps.filter(s => s.grp === 'Shake Mami');
  const otherSupps = actSupps.filter(s => s.grp !== 'Shake Mami');
  let groupSupps;
  if (ss.selGroup === '06:30' && shakeSupps.length) groupSupps = shakeSupps;
  else groupSupps = otherSupps.filter(s => s.slot === ss.selGroup);
  const day = getDay(ST.activeDay);
  const promises = [];
  for (const s of groupSupps) {
    if (!day.suppsTaken.includes(s.local_id)) {
      day.suppsTaken.push(s.local_id);
      promises.push(dbToggleSuppTaken(ST.activeDay, s.local_id, s.name, true, s.slot || ''));
    }
  }
  try {
    await Promise.all(promises);
  } catch(e) {
    showToast('Errore Supabase: ' + (e?.message || e));
    return;
  }
  closeSuppSheet();
  await refreshTimeline();
  showToast(`Gruppo registrato (${groupSupps.length} prodotti)`);
}

async function confirmSuppSingle() {
  const ss = ST.suppSheet;
  if (ss.singleSelId == null) return;
  const catItem = (ST.catalog || []).find(c => c.id === ss.singleSelId);
  if (!catItem) return;
  const name = catItem.nome || '';
  const time = ss.singleTime || new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});

  // Delete prima per evitare duplicati (nessuna UNIQUE constraint richiesta)
  await dbq('registrare l\'integratore', supa.from('supplements_log').delete()
    .eq('user_id', ST.user.id).eq('date', ST.activeDay).eq('supplement_name', name));
  const { error } = await supa.from('supplements_log').insert(
    { user_id: ST.user.id, date: ST.activeDay, slot: time, supplement_name: name, supplement_codice: catItem.codice || null }
  );
  if (error) {
    console.error('[suppSingle] Errore Supabase:', error);
    showToast('Errore salvataggio — riprova');
    return;
  }

  closeSuppSheet();
  await refreshTimeline();
  showToast(`${name} registrato`);
}

// ════════════════════��════════════════════════════��═════════
// EDIT MEAL MODAL
// ═════════════════════════════���════════════════════════��════
let _editMealId = null;
let _editMealDayKey = null;

function closeEditMealModal() {
  document.getElementById('edit-meal-modal').style.display = 'none';
  _editMealId = null;
  _editMealDayKey = null;
}

async function saveEditMeal() {
  const desc = document.getElementById('em-desc').value.trim();
  const errEl = document.getElementById('em-err');
  if(!desc) { errEl.style.display='block'; errEl.textContent='La descrizione è obbligatoria.'; return; }
  errEl.style.display = 'none';
  const btn = document.getElementById('em-save-btn');
  btn.disabled = true; btn.textContent = 'Salvataggio...';

  const updates = {
    description: desc,
    kcal:    +document.getElementById('em-kcal').value    || 0,
    protein: +document.getElementById('em-protein').value || 0,
    carbs:   +document.getElementById('em-carbs').value   || 0,
    fat:     +document.getElementById('em-fat').value     || 0,
    notes:   document.getElementById('em-notes').value.trim() || null,
  };

  // Sanifica macro a 1 decimale prima dell'update (colonne Supabase numeric).
  if (updates.kcal    !== undefined) updates.kcal    = Math.max(0, Math.round((Number(updates.kcal)    || 0) * 10) / 10);
  if (updates.protein !== undefined) updates.protein = Math.max(0, Math.round((Number(updates.protein) || 0) * 10) / 10);
  if (updates.carbs   !== undefined) updates.carbs   = Math.max(0, Math.round((Number(updates.carbs)   || 0) * 10) / 10);
  if (updates.fat     !== undefined) updates.fat     = Math.max(0, Math.round((Number(updates.fat)     || 0) * 10) / 10);

  // Aggiorna stato locale
  const day = ST.db.days[_editMealDayKey];
  const m = day?.meals.find(m => m.id === _editMealId || m.local_id === _editMealId);
  if(m) Object.assign(m, updates);

  // Aggiorna Supabase
  const {error} = await supa.from('meals').update(updates).eq('id', _editMealId).eq('user_id', ST.user.id);
  if(error) {
    errEl.style.display='block'; errEl.textContent='Errore: '+error.message;
    btn.disabled=false; btn.textContent='Salva modifiche →'; return;
  }

  closeEditMealModal();
  saveCache();
  renderOggi();
  showToast('Pasto aggiornato', '✏️');
}

// ═══════════════════════════════════════════════════════════
// SWIPE TO DELETE
// ═══════════════════════════════════════════════════════════
const _swipe = {};
function swipeStart(e, id) {
  const t = e.touches[0];
  _swipe[id] = { x: t.clientX, y: t.clientY, active: true };
}
function swipeMove(e, id) {
  if(!_swipe[id]?.active) return;
  const dx = e.touches[0].clientX - _swipe[id].x;
  const dy = Math.abs(e.touches[0].clientY - _swipe[id].y);
  if(dy > 20) { _swipe[id].active = false; return; } // scroll verticale
  if(dx < -10) e.preventDefault(); // blocca scroll orizzontale
  const el = document.getElementById('si-'+id);
  if(el) el.style.transform = `translateX(${Math.max(-72, Math.min(0, dx))}px)`;
}
function swipeEnd(e, id) {
  if(!_swipe[id]) return;
  const dx = e.changedTouches[0].clientX - _swipe[id].x;
  const el = document.getElementById('si-'+id);
  if(el) {
    if(dx < -40) {
      el.style.transition = 'transform .25s cubic-bezier(.16,1,.3,1)';
      el.style.transform = 'translateX(-72px)';
    } else {
      el.style.transition = 'transform .25s cubic-bezier(.16,1,.3,1)';
      el.style.transform = 'translateX(0)';
    }
    setTimeout(() => { if(el) el.style.transition = ''; }, 300);
  }
  delete _swipe[id];
}

function setLogSlot(id){
  ST.logSlot = id;
  // Aggiorna ST.logTime all'orario standard dello slot scelto (es. Cena → "20:00").
  // Nota: openLogFromPlanned() NON chiama setLogSlot — setta ST.logSlot/ST.logTime
  // direttamente con il valore pianificato, quindi qui non c'è rischio di sovrascriverlo.
  const slotDef = MEAL_SLOTS.find(s => s.id === id);
  if (slotDef && slotDef.time) {
    ST.logTime = slotDef.time;
    const timeInput = document.getElementById('log-time');
    if (timeInput) timeInput.value = slotDef.time;
  }
  ST.smartForm = { items:[], freeText:'', notes:'', analyzing:false, editingMealId:null, editingSlot:null, editingTime:null, editingDescription:'' };
  renderOggi();
}

async function logMeal(){
  const ta=document.getElementById('log-text');
  const text=(ta?.value||ST.logText).trim();
  if(!text) return;
  ST.logText=text;ST.logLoading=true;ST.logError='';renderOggi();
  try{
    const macros=await estimateMacros(text);
    const mealData = {slot:ST.logSlot,description:text,...macros,time:(document.getElementById('log-time')?.value)||new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})};
    const saved = await dbAddMeal(mealData);
    const d=getDay(ST.activeDay);
    d.meals.push({...mealData, id:saved.id, local_id:saved.id});
    ST.logText='';ST.logError='';ST.logTime='';ST.logOpen=false;
    showToast('Pasto registrato');
  }catch(e){ST.logError='Errore: '+e.message;}
  ST.logLoading=false;renderOggi();saveCache();
}

async function updateMealTime(dayKey, mealId, newTime){
  const d=ST.db.days[dayKey];
  if(!d) return;
  const m=d.meals.find(m=>m.id===mealId||m.local_id===mealId);
  if(!m) return;
  m.time=newTime;
  renderOggi();
  saveCache();
  if(m.id) dbq('cambiare l\'orario del pasto', supa.from('meals').update({time:newTime}).eq('id',m.id).eq('user_id',ST.user.id), {silenzioso:true});
}

// Un posto solo per la domanda (Fondamenta 150): la fa il cestino piccolo e quello a scorrimento.
// Se si annulla, la card scivolata torna al suo posto.
async function chiediEliminaPasto(dayKey, mealId){
  const ok = await chiediConferma('Eliminare questo pasto?', { ok:'Elimina', pericolo:true });
  if(ok) { await deleteMeal(dayKey, mealId); return; }
  const el = document.getElementById('si-' + mealId);
  if(el) el.style.transform = 'translateX(0)';
}

async function deleteMeal(dayKey, mealId){
  const d=ST.db.days[dayKey];
  if(!d) return;
  d.meals=d.meals.filter(m=>m.id!==mealId && m.local_id!==mealId);
  await dbDeleteMeal(mealId);
  renderOggi();saveCache();
}

async function fetchAdvice(){
  const d=getDay(ST.activeDay);
  // Include pasti + integratori standard + integratori extra
  const cons=dayTotals(d);
  // isTomorrow=true SOLO se il sistema ha calcolato "domani" E l'utente non ha override-ato la select
  const isTomorrow = !!ST.nextSlotIsTomorrow && !ST.nextSlotUserOverride;
  const nextMealLabel = MEAL_SLOTS.find(s=>s.id===ST.nextSlot)?.label || ST.nextSlot;
  ST.advLoading=true;ST.advice='';renderOggi();
  try{ST.advice=await getAdvice(cons, nextMealLabel, isTomorrow);}
  catch(e){console.warn('[advice] errore AI:', e); ST.advice='Non sono riuscito a preparare il consiglio. '+aiErrMsg(e.aiKind);}
  ST.advLoading=false;renderOggi();
}

// Sospendi / Riprendi un integratore. Ricollegata alla UI il 9 ago 2026: la
// funzione esisteva ed era corretta, ma nessuna schermata la chiamava piu'.
//
// Sospendere e' un gesto sul FUTURO: il prodotto esce dalla routine quotidiana
// (activeSupps() lo filtra ovunque — gruppi di Oggi, pannello di registrazione,
// totali dei giorni a venire) e NON tocca una riga di supplements_log. Se era
// gia' spuntato oggi quella registrazione resta, perche' e' vera: il toast lo
// dice, invece di cancellarla per far tornare la grafica.
async function toggleSuppActive(id){
  const s = ST.supps.find(x => x.local_id === id);
  if(!s) return;
  // Prima di cambiare stato: era gia' registrato oggi? Serve solo per il messaggio.
  const presoOggi = (getDay(todayKey()).suppsTaken || []).includes(id);
  s.active = !s.active;
  await dbUpdateSupp(id, {active: s.active});
  renderIntegratori();
  if(ST.packageEditor) renderPackageEditor();   // l'editor e' aperto sopra: va ridisegnato
  if(ST.page === 'oggi') renderOggi();
  saveCache();
  if(s.active) {
    showToast('Ripreso · torna nella tua giornata', '✅');
  } else {
    showToast(presoOggi ? 'Sospeso · l\'assunzione di oggi resta registrata' : 'Sospeso · lo storico resta intatto', '⏸️');
  }
}

function updateSuppMultiplier(id, newMultiplier) {
  const s = ST.supps.find(s => s.local_id === id);
  if(!s) return;
  newMultiplier = Math.max(0.25, Math.min(4, parseFloat(newMultiplier) || 1));
  s.dose_multiplier = newMultiplier;
  clearTimeout(s._saveTimer);
  s._saveTimer = setTimeout(() => {
    dbUpdateSupp(id, {dose_multiplier: newMultiplier});
    saveCache();
  }, 800);
}

function updateSupp(id,key,val){
  const s=ST.supps.find(s=>s.local_id===id);
  if(s){s[key]=val;clearTimeout(s._saveTimer);s._saveTimer=setTimeout(()=>{dbUpdateSupp(id,{[key]:val});saveCache();},800);
  if(key==='dose_unit') renderIntegratori();}
}

function updateSuppDose(id, newDose){
  const s = ST.supps.find(s => s.local_id === id);
  if(!s) return;
  const oldDose = parseFloat(s.dose_die) || 1;
  newDose = parseFloat(newDose) || 1;
  if(oldDose > 0 && newDose !== oldDose){
    const ratio = newDose / oldDose;
    ['kcal','protein','carbs','fat'].forEach(k => {
      const cur = parseFloat(s[k]);
      if(cur){
        const nv = Math.round(cur * ratio * 10) / 10;
        s[k] = nv;
        const inp = document.querySelector(`input[data-sid="${id}"][data-key="${k}"]`);
        if(inp) inp.value = nv;
      }
    });
  }
  s.dose_die = newDose;
  renderIntegratori();
  clearTimeout(s._saveTimer);
  s._saveTimer = setTimeout(() => {
    dbUpdateSupp(id, {quantity: newDose, kcal: s.kcal, protein: s.protein, carbs: s.carbs, fat: s.fat});
    saveCache();
  }, 800);
}

function _suppBannerUpdate() {
  const acts = ST.supps.filter(s => s.active);
  const iKcal = acts.reduce((t,s)=>t+(parseFloat(s.kcal)||0),0).toFixed(0);
  const iProt = acts.reduce((t,s)=>t+(parseFloat(s.protein)||0),0).toFixed(1);
  const iCarb = acts.reduce((t,s)=>t+(parseFloat(s.carbs)||0),0).toFixed(1);
  const iFat  = acts.reduce((t,s)=>t+(parseFloat(s.fat)||0),0).toFixed(1);
  const monthly = totalMonthlyCost();
  const se = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  se('banner-kcal', iKcal+' kcal');
  se('banner-prot', iProt+'g prot');
  se('banner-carb', iCarb+'g carbo');
  se('banner-fat',  iFat+'g grassi');
  se('banner-oggi', '€'+(monthly/30).toFixed(2)+'/oggi');
  se('banner-sett', '€'+(monthly/30*7).toFixed(2)+'/sett');
  se('banner-mese', '€'+monthly.toFixed(2)+'/mese');
}

function _suppSlotUpdate(slot) {
  const slotKey = slot.replace(/[^a-z0-9]/gi,'_');
  const el = document.getElementById('slot-sum-'+slotKey);
  if (!el) return;
  const slotSupps = ST.supps.filter(ss=>ss.slot===slot&&ss.active);
  const tot = slotSupps.reduce((a,ss)=>{
    const cat=ST.catalog.find(c=>c.nome===ss.name);
    return {
      kcal:  a.kcal  +((ss.kcal    !=null&&ss.kcal   !=='') ? parseFloat(ss.kcal)    : (parseFloat(cat?.kcal)     ||0)),
      carbs: a.carbs +((ss.carbs   !=null&&ss.carbs  !=='') ? parseFloat(ss.carbs)   : (parseFloat(cat?.carbo)    ||0)),
      prot:  a.prot  +((ss.protein !=null&&ss.protein!=='') ? parseFloat(ss.protein) : (parseFloat(cat?.proteine) ||0)),
      fat:   a.fat   +((ss.fat     !=null&&ss.fat    !=='') ? parseFloat(ss.fat)     : (parseFloat(cat?.grassi)   ||0)),
      cost:  a.cost  +(parseFloat(cat?.costo_dose_partner)||0),
    };
  },{kcal:0,carbs:0,prot:0,fat:0,cost:0});
  const sv=k=>r2(tot[k])||'—';
  el.textContent=[sv('kcal')+'kcal',sv('carbs')+'g carbo',sv('prot')+'g prot',sv('fat')+'g grassi',(tot.cost?'€'+r2(tot.cost).toFixed(2):'€—')+'/sessione'].join(' · ');
}

function liveDoseUpdate(id, newDose) {
  const s = ST.supps.find(s=>s.local_id===id);
  if (!s || !newDose || newDose <= 0) return;
  const oldDose = parseFloat(s.dose_die) || 1;
  newDose = parseFloat(newDose);
  if (oldDose > 0 && newDose !== oldDose) {
    const ratio = newDose / oldDose;
    ['kcal','protein','carbs','fat'].forEach(k=>{
      const cur = parseFloat(s[k]);
      if (cur) {
        const nv = Math.round(cur*ratio*10)/10;
        s[k] = nv;
        const inp = document.querySelector(`input[data-sid="${id}"][data-key="${k}"]`);
        if (inp) inp.value = nv;
      }
    });
  }
  s.dose_die = newDose;
  // aggiorna pills
  const pillsEl = document.getElementById('supp-pills-'+id);
  if (pillsEl) {
    const cs="font-size:9px;font-family:'JetBrains Mono',monospace;font-weight:600;border-radius:4px;padding:2px 5px;white-space:nowrap;";
    pillsEl.innerHTML = [
      `<span style="${cs}background:#e8e8e8;color:#333;">${s.kcal||0}kcal</span>`,
      `<span style="${cs}background:#d4edda;color:#1a6b35;">${s.protein||0}g P</span>`,
      `<span style="${cs}background:#fde8d0;color:#a0490a;">${s.carbs||0}g C</span>`,
      `<span style="${cs}background:#fff3cd;color:#7a5500;">${s.fat||0}g G</span>`,
    ].join(' ');
  }
  // aggiorna costo riga
  const costEl = document.getElementById('supp-cost-'+id);
  if (costEl) { const mc=suppMonthlyCost(s); costEl.innerHTML=`€ <span style="font-weight:600;color:var(--t2);">${(mc/30).toFixed(2)}</span>/oggi · <span style="font-size:9px;">${(mc/30*7).toFixed(2)}/sett · ${mc.toFixed(2)}/mese</span>`; }
  _suppSlotUpdate(s.slot);
  _suppBannerUpdate();
}

// ── OGGI INLINE SUPP EDITING ──────────────────────────────
function extraLogKey(name, time) {
  return (name + '__' + time).replace(/[^a-zA-Z0-9]/g, '_');
}

function extraSuppCardHTML(supp, catItem, logName, logTime, logDose) {
  const safeKey = extraLogKey(logName, logTime);
  const baseDose = parseFloat(supp?.dose_die) || 1;
  const mult = logDose / baseDose;
  const kcal  = Math.round((supp?.kcal     || catItem?.kcal     || 0) * mult);
  const prot  = Math.round((supp?.protein  || catItem?.proteine || 0) * mult);
  const carbs = Math.round((supp?.carbs    || catItem?.carbo    || 0) * mult);
  const fat   = Math.round((supp?.fat      || catItem?.grassi   || 0) * mult);
  const slot  = supp?.slot || logTime;
  const allSlots = [...new Set(ST.supps.filter(x=>x.active).map(x=>x.slot))].sort();
  const slotIdx = allSlots.indexOf(slot);
  const slotColor = SLOT_COLOR_MAP[slot] || SLOT_PAL[slotIdx >= 0 ? slotIdx % SLOT_PAL.length : 0];
  const cs = "font-size:9px;font-family:'JetBrains Mono',monospace;font-weight:600;border-radius:4px;padding:2px 5px;white-space:nowrap;";
  const chips = [
    `<span style="${cs}background:#e8e8e8;color:#333;">${kcal}kcal</span>`,
    `<span style="${cs}background:#fde8d0;color:#a0490a;">${carbs}g C</span>`,
    `<span style="${cs}background:#d4edda;color:#1a6b35;">${prot}g P</span>`,
    `<span style="${cs}background:#fff3cd;color:#7a5500;">${fat}g G</span>`,
  ].join('');
  return `<div style="background:#edf7f1;border:1px solid #b6dfc8;border-radius:8px;border-left:3px solid ${slotColor};padding:8px 10px;margin-bottom:4px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">
      <span style="width:16px;height:16px;border-radius:50%;flex-shrink:0;background:#1e7a4a;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:700;line-height:1;">✓</span>
      <span style="font-weight:600;font-size:0.88rem;color:var(--t1);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(logName)}</span>
    </div>
    <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
      <input type="number" value="${logDose}" step="0.5" min="0.5" style="width:46px;font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid var(--b2);border-radius:4px;padding:2px 4px;background:var(--s1);color:var(--t1);text-align:center;" oninput="updateExtraLogDose('${safeKey}',+this.value)" onclick="event.stopPropagation()"/>
      <span id="extra-pills-${safeKey}" style="display:flex;gap:3px;flex-wrap:wrap;align-items:center;">${chips}</span>
    </div>
  </div>`;
}

function updateExtraLogDose(safeKey, newDose) {
  if (!newDose || newDose <= 0) return;
  const day = getDay(ST.activeDay);
  const log = (day.rawSuppLogs || []).find(l => extraLogKey(l.name, l.time) === safeKey);
  if (!log) return;
  log.dose = newDose;
  const supp = ST.supps.find(s => s.name === log.name);
  const catItem = (ST.catalog || []).find(c => c.nome === log.name);
  const baseDose = parseFloat(supp?.dose_die) || 1;
  const mult = newDose / baseDose;
  const kcal  = Math.round((supp?.kcal    || catItem?.kcal     || 0) * mult);
  const prot  = Math.round((supp?.protein || catItem?.proteine || 0) * mult);
  const carbs = Math.round((supp?.carbs   || catItem?.carbo    || 0) * mult);
  const fat   = Math.round((supp?.fat     || catItem?.grassi   || 0) * mult);
  const cs = "font-size:9px;font-family:'JetBrains Mono',monospace;font-weight:600;border-radius:4px;padding:2px 5px;white-space:nowrap;";
  const el = document.getElementById('extra-pills-' + safeKey);
  if (el) el.innerHTML = [
    `<span style="${cs}background:#e8e8e8;color:#333;">${kcal}kcal</span>`,
    `<span style="${cs}background:#fde8d0;color:#a0490a;">${carbs}g C</span>`,
    `<span style="${cs}background:#d4edda;color:#1a6b35;">${prot}g P</span>`,
    `<span style="${cs}background:#fff3cd;color:#7a5500;">${fat}g G</span>`,
  ].join('');
}

function oggiSuppCardHTML(s, taken) {
  const on = taken.includes(s.local_id);
  const allSlots = [...new Set(ST.supps.filter(x=>x.active).map(x=>x.slot))].sort();
  const slotIdx = allSlots.indexOf(s.slot);
  const slotColor = SLOT_COLOR_MAP[s.slot] || SLOT_PAL[slotIdx >= 0 ? slotIdx % SLOT_PAL.length : 0];
  const cs = "font-size:9px;font-family:'JetBrains Mono',monospace;font-weight:600;border-radius:4px;padding:2px 5px;white-space:nowrap;";
  // Fix 2: order kcal → C → P → G
  const chips = [
    `<span style="${cs}background:#e8e8e8;color:#333;">${s.kcal||0}kcal</span>`,
    `<span style="${cs}background:#fde8d0;color:#a0490a;">${s.carbs||0}g C</span>`,
    `<span style="${cs}background:#d4edda;color:#1a6b35;">${s.protein||0}g P</span>`,
    `<span style="${cs}background:#fff3cd;color:#7a5500;">${s.fat||0}g G</span>`,
  ].join('');
  const slotOpts = allSlots.map(sl=>`<option value="${sl}"${sl===s.slot?' selected':''}>${sl}</option>`).join('');
  const doseVal = s.dose_die != null ? parseFloat(s.dose_die)||1 : 1;
  // ── Badge stock (Integratori v3, 16 mag 2026): ESAURITO se daysLeft===0, no auto-disable ──
  const _daysLeft = _suppDaysLeft(s);
  const stockBadge = (_daysLeft === 0)
    ? `<span style="${cs}background:#FCEEE9;color:#B84C2A;border:1px solid rgba(184,76,42,.35);letter-spacing:.04em;">ESAURITO</span>`
    : (_daysLeft !== null && _daysLeft <= 7)
      ? `<span style="${cs}background:#FCEEE9;color:#B84C2A;letter-spacing:.04em;">⚠ ${_daysLeft}gg</span>`
      : '';
  // Sospeso ma registrato quel giorno: compare lo stesso, dichiarato. E' cio' che
  // spiega le sue calorie nel totale — vedi suppsDelGiorno().
  const sospesoBadge = s.active ? '' : `<span class="zt-badge-sospeso">Sospeso</span>`;
  // card: verde tenue quando assunto — distinto ma non aggressivo
  const cardStyle = on
    ? 'background:#edf7f1;border-color:#b6dfc8;box-shadow:0 1px 3px rgba(0,0,0,0.06);'
    : 'background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.08);';
  // unico indicatore taken: cerchio a sinistra del nome
  const takenDot = on
    ? `<span style="width:16px;height:16px;border-radius:50%;flex-shrink:0;background:#1e7a4a;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:700;cursor:pointer;line-height:1;" onclick="toggleSuppTaken('${s.local_id}','${esc(s.name)}')">✓</span>`
    : `<span style="width:16px;height:16px;border-radius:50%;flex-shrink:0;border:2px solid #bbb;background:transparent;display:inline-block;cursor:pointer;" onclick="toggleSuppTaken('${s.local_id}','${esc(s.name)}')"></span>`;
  return `<div style="${cardStyle}border:1px solid var(--b2);border-radius:8px;border-left:3px solid ${slotColor};padding:8px 10px;margin-bottom:4px;transition:background .2s,border-color .2s;">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">
      ${takenDot}
      <span style="font-weight:600;font-size:0.88rem;color:var(--t1);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.name)}</span>
      ${sospesoBadge}
      ${stockBadge}
      <select style="font-size:10px;font-family:'JetBrains Mono',monospace;background:var(--b2);border:1px solid var(--b3);border-radius:4px;padding:1px 3px;color:var(--t2);max-width:58px;" onchange="setSuppSlotOggi('${s.local_id}',this.value)" onclick="event.stopPropagation()">${slotOpts}</select>
    </div>
    <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
      <input type="number" value="${doseVal}" step="0.5" min="0.5" style="width:46px;font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid var(--b2);border-radius:4px;padding:2px 4px;background:var(--s1);color:var(--t1);text-align:center;" oninput="liveDoseUpdateOggi('${s.local_id}',+this.value)" onchange="saveOggiSuppDose('${s.local_id}',+this.value)" onclick="event.stopPropagation()"/>
      <span id="oggi-pills-${s.local_id}" style="display:flex;gap:3px;flex-wrap:wrap;align-items:center;">${chips}</span>
    </div>
  </div>`;
}

function liveDoseUpdateOggi(id, val) {
  liveDoseUpdate(id, val);
  // aggiorna chips nella card oggi se la tab integratori non è aperta
  const el = document.getElementById('oggi-pills-'+id);
  if (el) {
    const s = ST.supps.find(s=>s.local_id===id);
    if (!s) return;
    const cs = "font-size:9px;font-family:'JetBrains Mono',monospace;font-weight:600;border-radius:4px;padding:2px 5px;white-space:nowrap;";
    el.innerHTML = [
      `<span style="${cs}background:#e8e8e8;color:#333;">${s.kcal||0}kcal</span>`,
      `<span style="${cs}background:#fde8d0;color:#a0490a;">${s.carbs||0}g C</span>`,
      `<span style="${cs}background:#d4edda;color:#1a6b35;">${s.protein||0}g P</span>`,
      `<span style="${cs}background:#fff3cd;color:#7a5500;">${s.fat||0}g G</span>`,
    ].join('');
  }
}

function setSuppSlotOggi(id, newSlot) {
  const s = ST.supps.find(s=>s.local_id===id);
  if (!s) return;
  s.slot = newSlot;
  dbUpdateSupp(id, {slot: newSlot});
  saveCache();
  renderOggi();
}

function saveOggiSuppDose(id, newDose) {
  const s = ST.supps.find(s=>s.local_id===id);
  if (!s) return;
  clearTimeout(s._oggiSaveTimer);
  s._oggiSaveTimer = setTimeout(() => {
    dbUpdateSupp(id, {quantity: s.dose_die});
    saveCache();
  }, 800);
}

// ═══════════════════════════════════════════════════════════
// CATALOG MODAL v3 — Blocco 2 (16 mag 2026)
// Sostituisce il vecchio render lineare con UI hi-fi:
// shell fullscreen, search bar, pillole categoria, card prodotto v3,
// stato "GIÀ NEL PACCHETTO", CTA sticky bottom.
// ═══════════════════════════════════════════════════════════

function openCatalogModal() {
  ST.catalogSelected = [];
  ST.catalogCategoryFilter = 'TUTTI';
  document.getElementById('catalog-step1').style.display = 'flex';
  document.getElementById('catalog-step2').style.display = 'none';
  renderCatalogShell();  // rendering una sola volta della shell (header+search+pills+containers)
  renderCatalogList();   // contenuto dinamico (counter+eyebrow+list+CTA)
  document.getElementById('catalog-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCatalogModal() {
  document.getElementById('catalog-modal').style.display = 'none';
  document.body.style.overflow = '';
  const btn = document.getElementById('catalog-confirm-btn');
  if(btn) { btn.disabled = false; btn.textContent = 'Applica modifiche →'; }
  // Integratori v3: se eravamo in mode "addToPackage" e l'utente chiude senza importare,
  // ripristina l'overlay editor in cui si trovava
  if(ST.catalogContext && ST.catalogContext.mode === 'addToPackage' && ST.packageEditor) {
    document.getElementById('package-editor-overlay').classList.add('visible');
  }
  ST.catalogContext = null;
  ST.catalogCategoryFilter = 'TUTTI';
}

// ── Render v3 catalogo: SHELL statica (header + search input persistente + pills container + content host) ──
// Chiamata una sola volta da openCatalogModal. La search input NON viene mai ri-creata
// per evitare loss-of-focus / flicker tastiera su iOS durante typing.
function renderCatalogShell() {
  const host = document.getElementById('catalog-step1');
  if(!host) return;
  const totalCatalog = (ST.catalog || []).length;
  host.innerHTML = `<div class="catalog-v3-shell">
    <div class="catalog-v3-accent"></div>
    <div class="catalog-v3-header">
      <button class="catalog-v3-back" onclick="closeCatalogModal()">‹ Indietro</button>
      <div class="catalog-v3-title">Catalogo Nutrilite</div>
      <div id="catalog-counter" class="catalog-v3-counter">0 SELEZIONATI</div>
    </div>
    <div class="catalog-v3-search-wrap">
      <span class="catalog-v3-search-icon">🔍</span>
      <input id="catalog-search" class="catalog-v3-search-bar" type="text" placeholder="Cerca prodotto…" oninput="onCatalogSearchInput(this.value)" autocomplete="off"/>
      <button id="catalog-search-clear" class="catalog-v3-search-clear" onclick="clearCatalogSearch()" aria-label="Pulisci ricerca">×</button>
    </div>
    <div class="catalog-v3-pills-wrap">
      <div id="catalog-pills" class="catalog-v3-pills"></div>
      <div class="catalog-v3-pill-fade"></div>
    </div>
    <div id="catalog-eyebrow" class="catalog-v3-eyebrow"></div>
    <div id="catalog-list" class="catalog-v3-list"></div>
    <div class="catalog-v3-cta-bar">
      <button id="catalog-cta-btn" class="catalog-v3-cta-btn disabled" disabled onclick="goToCatalogStep2()">Seleziona prodotti</button>
    </div>
  </div>`;
}

// ── Handler input search: aggiorna solo content (no full re-render shell) ──
function onCatalogSearchInput(value) {
  // No state storage; il valore vive nell'input. renderCatalogList lo legge.
  renderCatalogList();
}

// ── Render contenuto dinamico: pills, counter, eyebrow, list, CTA, clear-btn visibility ──
function renderCatalogList() {
  const searchInput = document.getElementById('catalog-search');
  if(!searchInput) return; // shell non ancora montata (chiamata fuori contesto)
  const query = (searchInput.value || '').toLowerCase().trim();
  const categoryFilter = ST.catalogCategoryFilter || 'TUTTI';

  // Toggle visibility clear-btn
  const clearBtn = document.getElementById('catalog-search-clear');
  if(clearBtn) clearBtn.classList.toggle('visible', query.length > 0);

  // Categorie reali ordinate per numero di prodotti decrescente
  const catCounts = {};
  (ST.catalog || []).forEach(c => {
    if(!c.categoria) return;
    catCounts[c.categoria] = (catCounts[c.categoria] || 0) + 1;
  });
  const orderedCategories = Object.keys(catCounts).sort((a,b) => catCounts[b] - catCounts[a]);

  // Lista filtrata (categoria AND ricerca AND ordinato per nome)
  let items = (ST.catalog || []).slice();
  if(categoryFilter !== 'TUTTI') items = items.filter(c => c.categoria === categoryFilter);
  if(query) items = items.filter(c => (c.nome || '').toLowerCase().includes(query));
  items.sort((a,b) => (a.nome || '').localeCompare(b.nome || '', 'it'));

  // Stato selezione + alreadyInPackage
  const selAdd = new Set(ST.catalogSelected || []);
  const ctx = ST.catalogContext;
  const alreadyInPackage = new Set((ctx && ctx.alreadyInPackage) || []);
  const selectedCount = selAdd.size;

  // ── Counter ──
  const counterEl = document.getElementById('catalog-counter');
  if(counterEl) {
    counterEl.className = selectedCount > 0 ? 'catalog-v3-counter active' : 'catalog-v3-counter';
    counterEl.textContent = selectedCount === 0 ? '0 SELEZIONATI'
                          : selectedCount === 1 ? '1 SELEZIONATO'
                          : `${selectedCount} SELEZIONATI`;
  }

  // ── Pills ──
  const pillsEl = document.getElementById('catalog-pills');
  if(pillsEl) {
    const savedScroll = pillsEl.scrollLeft;
    const totalCatalog = (ST.catalog || []).length;
    let pillsHTML = `<button class="catalog-v3-pill${categoryFilter==='TUTTI'?' active':''}" onclick="setCatalogCategory('TUTTI')">Tutti ${totalCatalog}</button>`;
    orderedCategories.forEach(cat => {
      const active = categoryFilter === cat;
      pillsHTML += `<button class="catalog-v3-pill${active?' active':''}" onclick="setCatalogCategory('${esc(cat)}')">${esc(cat)} ${catCounts[cat]}</button>`;
    });
    pillsEl.innerHTML = pillsHTML;
    pillsEl.scrollLeft = savedScroll; // preserva scroll orizzontale durante filter change
  }

  // ── Eyebrow ──
  const eyebrowEl = document.getElementById('catalog-eyebrow');
  if(eyebrowEl) {
    const resultsLbl = items.length === 1 ? '1 RISULTATO' : `${items.length} RISULTATI`;
    const hasQuery = query.length > 0;
    const hasFilters = (categoryFilter !== 'TUTTI') || hasQuery;
    let eyebrowLeft;
    if(categoryFilter !== 'TUTTI' && hasQuery) {
      eyebrowLeft = `${esc(categoryFilter)} · "${esc(query)}"`;
    } else if(categoryFilter !== 'TUTTI') {
      eyebrowLeft = `${esc(categoryFilter)} · ORDINATO PER NOME`;
    } else if(hasQuery) {
      eyebrowLeft = `"${esc(query)}" · ORDINATO PER NOME`;
    } else {
      eyebrowLeft = 'TUTTI · ORDINATO PER NOME';
    }
    const azzeraLink = hasFilters ? `<button class="catalog-v3-eyebrow-link" onclick="resetCatalogFilters()">Azzera ›</button>` : '';
    eyebrowEl.innerHTML = `<span class="catalog-v3-eyebrow-left">${eyebrowLeft}</span>
      <span class="catalog-v3-eyebrow-right">${resultsLbl}${azzeraLink}</span>`;
  }

  // ── List ──
  const listEl = document.getElementById('catalog-list');
  if(listEl) {
    const hasQuery2 = query.length > 0;
    const hasFilters2 = (categoryFilter !== 'TUTTI') || hasQuery2;
    if((ST.catalog || []).length === 0) {
      listEl.innerHTML = `<div class="catalog-v3-empty-state">
        <div class="catalog-v3-empty-emoji">📦</div>
        <div class="catalog-v3-empty-title">Catalogo non disponibile</div>
        <div class="catalog-v3-empty-text">Non sono riuscito a caricare i prodotti. Verifica la connessione.</div>
        <button class="catalog-v3-empty-link" onclick="loadCatalog().then(()=>{renderCatalogShell();renderCatalogList();})">Riprova ›</button>
      </div>`;
    } else if(items.length === 0) {
      listEl.innerHTML = `<div class="catalog-v3-empty-state">
        <div class="catalog-v3-empty-emoji">🔍</div>
        <div class="catalog-v3-empty-title">Nessun prodotto</div>
        <div class="catalog-v3-empty-text">Prova a togliere il filtro categoria o a modificare la ricerca.</div>
        ${hasFilters2?`<button class="catalog-v3-empty-link" onclick="resetCatalogFilters()">Azzera filtri ›</button>`:''}
      </div>`;
    } else {
      listEl.innerHTML = items.map(item => _renderCatalogCardV3(item, selAdd, alreadyInPackage)).join('');
    }
  }

  // ── CTA ──
  const ctaBtn = document.getElementById('catalog-cta-btn');
  if(ctaBtn) {
    const ctaDisabled = selectedCount === 0;
    ctaBtn.className = ctaDisabled ? 'catalog-v3-cta-btn disabled' : 'catalog-v3-cta-btn';
    ctaBtn.disabled = ctaDisabled;
    ctaBtn.innerHTML = ctaDisabled
      ? 'Seleziona prodotti'
      : selectedCount === 1
        ? `Aggiungi <span class="catalog-v3-cta-btn-count">1</span> prodotto`
        : `Aggiungi <span class="catalog-v3-cta-btn-count">${selectedCount}</span> prodotti`;
  }
}

// ── Renderer card singolo prodotto v3 ──
function _renderCatalogCardV3(item, selAdd, alreadyInPackage) {
  const codice = item.codice || '';
  const isSelected = selAdd.has(codice);
  const inPackage = codice && alreadyInPackage.has(codice);

  const tint = getCatalogTint(item);

  // Tag linea (solo Bodykey / XS Sports)
  let lineTag = '';
  const lineaLower = (item.linea || '').toLowerCase();
  if(lineaLower === 'bodykey')   lineTag = `<span class="catalog-v3-line-tag catalog-v3-line-tag-bodykey">Bodykey</span>`;
  else if(lineaLower === 'xs sports' || lineaLower === 'xs') lineTag = `<span class="catalog-v3-line-tag catalog-v3-line-tag-xs">XS Sports</span>`;

  // Riga 2: categoria · porzione (dose_die + dose_unit)
  const cat = item.categoria || '';
  const dose = (item.dose_die != null && item.dose_die !== '') ? `${item.dose_die} ${item.dose_unit || 'cps'}` : '';
  const metaLine = [cat.toUpperCase(), dose.toUpperCase()].filter(Boolean).join(' · ');

  // Riga 3: macro — kcal sempre, C/P/G tutte o nessuna (decisione Blocco 1)
  const kcal = parseFloat(item.kcal) || 0;
  const c = parseFloat(item.carbo) || 0;
  const p = parseFloat(item.proteine) || 0;
  const g = parseFloat(item.grassi) || 0;
  const showMacros = (c + p + g) > 0;
  let macroHTML = `<span class="catalog-v3-macro-kcal">${Math.round(kcal)} KCAL</span>`;
  if(showMacros) {
    macroHTML += `<span class="catalog-v3-macro-sep">·</span>
      <span class="catalog-v3-macro-c">${c}g C</span>
      <span class="catalog-v3-macro-sep">·</span>
      <span class="catalog-v3-macro-p">${p}g P</span>
      <span class="catalog-v3-macro-sep">·</span>
      <span class="catalog-v3-macro-g">${g}g G</span>`;
  }

  // Riga 4: costo
  const costoDose = parseFloat(item.costo_dose_partner);
  const costoTxt = !isNaN(costoDose) && costoDose > 0
    ? `€ ${costoDose.toFixed(2)}/dose`
    : '';

  const cardClass = `catalog-v3-card${inPackage ? ' catalog-v3-card-disabled' : ''}`;
  const onclick = inPackage ? '' : `onclick="toggleCatalogItem('${esc(codice)}')"`;
  const inPackageTag = inPackage ? `<div class="catalog-v3-in-package-tag">Nel pacchetto</div>` : '';
  const checkClass = `catalog-v3-check${isSelected ? ' on' : ''}`;

  return `<div class="${cardClass}" ${onclick}>
    <div class="catalog-v3-thumb" style="background:${tint.bg};">${tint.emoji}</div>
    <div class="catalog-v3-info">
      <div class="catalog-v3-name">${esc(item.nome)}${lineTag}</div>
      ${metaLine ? `<div class="catalog-v3-meta">${metaLine}</div>` : ''}
      <div class="catalog-v3-macro">${macroHTML}</div>
      ${costoTxt ? `<div class="catalog-v3-cost">${costoTxt}</div>` : ''}
      ${inPackageTag}
    </div>
    <div class="${checkClass}">${isSelected ? '✓' : ''}</div>
  </div>`;
}

// ── Helper filtri catalogo v3 ──
function setCatalogCategory(cat) {
  ST.catalogCategoryFilter = cat || 'TUTTI';
  renderCatalogList();
}
function resetCatalogFilters() {
  ST.catalogCategoryFilter = 'TUTTI';
  const s = document.getElementById('catalog-search');
  if(s) s.value = '';
  renderCatalogList();
}
function clearCatalogSearch() {
  const s = document.getElementById('catalog-search');
  if(s) { s.value = ''; s.focus(); }
  renderCatalogList();
}

function toggleCatalogItem(id) {
  const i = ST.catalogSelected.indexOf(id);
  if(i < 0) ST.catalogSelected.push(id);
  else ST.catalogSelected.splice(i, 1);
  renderCatalogList();
}

function goToCatalogStep2() {
  if(ST.catalogSelected.length === 0) { showToast('Tocca almeno un prodotto per aggiungerlo', '✍️'); return; }
  // Integratori Step 2 (18 mag 2026): mode "registerExtra" salta lo step2 legacy
  // e va dritto alla schermata "Conferma Extra" fullscreen (extras = eventi
  // mordi-e-fuggi in supplements_log, niente persistenza in supplements).
  if(ST.catalogContext && ST.catalogContext.mode === 'registerExtra') {
    const codici = [...ST.catalogSelected];
    // Nascondi catalog modal (la selezione resta in ST.catalogSelected, ripristinata su back)
    document.getElementById('catalog-modal').style.display = 'none';
    openConfirmExtraScreen(codici);
    return;
  }
  const toAdd = ST.catalog.filter(item => ST.catalogSelected.includes(item.codice));
  // Integratori v3: se siamo in "addToPackage" pre-fill slot con l'orario del pacchetto
  const ctx = ST.catalogContext;
  const defaultSlot = (ctx && ctx.mode === 'addToPackage' && ctx.time) ? ctx.time : '08:00';
  let html = `<div class="catalog-s2-section-lbl" style="color:var(--acc);">Da aggiungere (${toAdd.length})</div>`;
  html += toAdd.map(item => {
    const tip = SLOT_TIPS[item.nome] || DEFAULT_SLOT_TIP;
    const existingSlots = ST.supps
      .filter(s => (item.codice && s.codice === item.codice) || s.name === item.nome)
      .map(s => s.slot);
    const instanceNote = existingSlots.length > 0
      ? `<div style="font-size:10px;color:var(--t3);margin-top:2px;">Già presente: ${existingSlots.join(', ')}</div>`
      : '';
    return `<div class="catalog-s2-row">
      <div style="flex:1;min-width:0;">
        <div class="catalog-s2-name">${esc(item.nome)}</div>
        ${instanceNote}
      </div>
      <input class="inp inp-sm" id="slot-${item.codice}" value="${esc(defaultSlot)}" placeholder="08:00" style="width:110px;"/>
      <div class="slot-tip">💡 ${tip}</div>
    </div>`;
  }).join('');
  document.getElementById('catalog-slots').innerHTML = html;
  const btn = document.getElementById('catalog-confirm-btn');
  btn.disabled = false; btn.textContent = 'Applica modifiche →';
  document.getElementById('catalog-step1').style.display = 'none';
  document.getElementById('catalog-step2').style.display = 'block';
}

function backToCatalogStep1() {
  document.getElementById('catalog-step2').style.display = 'none';
  document.getElementById('catalog-step1').style.display = 'flex'; // v3: step1 è flex column fullscreen
}

async function importFromCatalog() {
  const ctx = ST.catalogContext;  // Integratori v3: contesto opzionale (addToPackage|addExtra)
  const toAdd = ST.catalog.filter(item => ST.catalogSelected.includes(item.codice));
  const btn = document.getElementById('catalog-confirm-btn');
  btn.disabled = true; btn.textContent = 'Applicazione...';

  try {
    // Aggiungi uno alla volta per isolare eventuali errori
    for(let i = 0; i < toAdd.length; i++) {
      const item = toAdd[i];
      const slotEl = document.getElementById('slot-' + item.codice);
      const record = {
        sort_order: ST.supps.length + 1,
        user_id:    ST.user.id,
        name:       item.nome,
        slot:       slotEl ? (slotEl.value.trim() || '08:00') : '08:00',
        grp:        '',
        active:     true,
        note:       '',
      };
      // Aggiunge 'codice' solo se il campo è valorizzato (forzato a stringa)
      if(item.codice) record.codice = String(item.codice);

      // Timeout di 10 secondi per evitare freeze silenzioso
      let { data, error } = await Promise.race([
        supa.from('supplements').insert(record).select().single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: Supabase non risponde. Riprova.')), 10000))
      ]);

      // Se errore sulla colonna 'codice', riprova senza
      if(error && error.message && error.message.toLowerCase().includes('codice')) {
        const recordSenzaCodice = { ...record };
        delete recordSenzaCodice.codice;
        const retry = await supa.from('supplements').insert(recordSenzaCodice).select().single();
        if(retry.error) throw new Error(retry.error.message);
        data = retry.data;
      } else if(error) {
        throw new Error(error.message);
      }

      if(data) {
        const cat = (ST.catalog||[]).find(c =>
          (data.codice && c.codice === data.codice) || c.nome === data.name
        );
        ST.supps.push({
          ...data,
          local_id:  data.id,
          kcal:      cat?.kcal                ?? 0,
          protein:   cat?.proteine            ?? 0,
          carbs:     cat?.carbo              ?? 0,
          fat:       cat?.grassi             ?? 0,
          doses:     cat?.dosi_conf          ?? data.doses ?? 0,
          dose_die:  cat?.dose_die           ?? data.dose_die ?? 1,
          price:     cat?.prezzo_partner     ?? data.price ?? 0,
        });
      }
    }

    // ── Integratori v3: link a pacchetto se contesto = addToPackage ──
    let addedToPackage = false;
    if(ctx && ctx.mode === 'addToPackage' && ctx.packageId && toAdd.length > 0) {
      // Identifica i supplements appena creati cercandoli in ST.supps per codice/nome
      const newSupps = toAdd.map(item => {
        return ST.supps.find(s =>
          (item.codice && s.codice === item.codice) || s.name === item.nome
        );
      }).filter(Boolean);
      // Calcola sort_order base partendo dagli items esistenti del pacchetto
      const existingPkg = ST.packages.find(p => p.id === ctx.packageId);
      let baseOrder = existingPkg ? (existingPkg.items||[]).length : 0;
      const itemRecords = newSupps.map((s, i) => ({
        package_id:    ctx.packageId,
        supplement_id: s.local_id,
        user_id:       ST.user.id,
        sort_order:    baseOrder + i,
      }));
      try {
        const {data: insertedItems, error: itemsErr} = await supa
          .from('supplement_package_items')
          .insert(itemRecords)
          .select();
        if(itemsErr) {
          // Possibile conflitto UNIQUE (supplement già nel pacchetto). Logghiamo ma proseguiamo.
          console.warn('supplement_package_items insert:', itemsErr);
        } else if(insertedItems && existingPkg) {
          // Aggiorna ST.packages in-memory con i nuovi items
          insertedItems.forEach(it => {
            const supp = ST.supps.find(s => s.local_id === it.supplement_id);
            if(supp) existingPkg.items.push({
              id: it.id, supplement_id: it.supplement_id, sort_order: it.sort_order, supplement: supp,
            });
          });
          existingPkg.items.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
        }
        addedToPackage = true;
      } catch(e) {
        console.error('add to package error:', e);
      }
    }

    closeCatalogModal();
    ST.catalogContext = null;
    saveCache();

    // Ripristina editor se eravamo in modalità addToPackage
    if(addedToPackage && ST.packageEditor && ST.packageEditor.packageId) {
      // Aggiorna ST.packageEditor.items dal pacchetto aggiornato
      const pkg = ST.packages.find(p => p.id === ST.packageEditor.packageId);
      if(pkg) ST.packageEditor.items = (pkg.items||[]).map(it => ({...it}));
      renderPackageEditor();
      document.getElementById('package-editor-overlay').classList.add('visible');
    } else {
      renderIntegratori();
    }

  } catch(err) {
    console.error('importFromCatalog error:', err);
    avvisa('Non riesco a salvare: ' + (err.message || 'errore sconosciuto'), { titolo:'Integratori non salvati' });
    btn.disabled = false;
    btn.textContent = 'Applica modifiche →';
  }
}

// ═══════════════════════════════════════════════════════════
// PACKAGE EDITOR — Integratori v3 (16 mag 2026)
// Modale fullscreen che gestisce CREATE/EDIT pacchetti orari + EXTRA editor.
// State: ST.packageEditor (vedi ST init per shape).
// ═══════════════════════════════════════════════════════════

// ── Entry point: edit (packageId) | create (null) ──
function openPackageEditor(packageId) {
  if(packageId) {
    const pkg = (ST.packages||[]).find(p => p.id === packageId);
    if(!pkg) { showToast('Pacchetto non trovato','⚠️'); return; }
    ST.packageEditor = {
      mode: 'edit',
      packageId: pkg.id,
      name:  pkg.name  || '',
      emoji: pkg.emoji || '📦',
      time:  pkg.time  || '08:00',
      items: (pkg.items||[]).map(it => ({...it})),  // shallow copy
      expandedItem: null,
      dirty: false,
      saving: false,
    };
  } else {
    ST.packageEditor = {
      mode: 'create',
      packageId: null,
      name: '',
      emoji: '📦',
      time: '08:00',
      items: [],
      expandedItem: null,
      dirty: false,
      saving: false,
    };
  }
  ST.pkgRemoveItemConfirm = null;
  ST.pkgDeleteConfirm = false;
  renderPackageEditor();
  document.getElementById('package-editor-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

// ── Entry extra editor: usa lo stesso overlay con mode='extra' ──
function openExtraEditor(supplementId) {
  const s = (ST.supps||[]).find(x => x.local_id === supplementId);
  if(!s) { showToast('Integratore non trovato','⚠️'); return; }
  ST.packageEditor = {
    mode: 'extra',
    packageId: null,
    supplementId: supplementId,
    name: s.name,
    emoji: '💊',
    time: s.slot || '08:00',
    items: [{ supplement_id: supplementId, supplement: s, sort_order: 0, id: null }],
    expandedItem: supplementId,  // sempre espanso in extra mode
    dirty: false,
    saving: false,
  };
  ST.pkgRemoveItemConfirm = null;
  ST.pkgDeleteConfirm = false;
  renderPackageEditor();
  document.getElementById('package-editor-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

// ── Chiudi editor (sempre safe: ogni edit è già persisted o irrilevante) ──
function closePackageEditor() {
  document.getElementById('package-editor-overlay').classList.remove('visible');
  document.body.style.overflow = '';
  ST.packageEditor = null;
  ST.pkgRemoveItemConfirm = null;
  ST.pkgDeleteConfirm = false;
  // Refresh tab integratori (e tab Oggi se visibile) per riflettere stato fresco
  if(ST.page === 'integratori') renderIntegratori();
  if(ST.page === 'oggi') renderOggi();
}

// ── SAVA button: in CREATE persiste, in EDIT/EXTRA semplicemente chiude ──
async function savePackageEditor() {
  const e = ST.packageEditor;
  if(!e) return;
  if(e.saving) return;
  // CREATE mode: deve avere nome + 1+ items
  if(e.mode === 'create') {
    if(!e.name.trim()) { showToast('Aggiungi un nome al pacchetto','⚠️'); return; }
    if(e.items.length === 0) { showToast('Aggiungi almeno un prodotto','⚠️'); return; }
    // Caso edge: l'utente è arrivato qui senza mai cliccare "+ Aggiungi prodotto"
    // (impossibile col flusso normale, ma protezione). Crea pacchetto se mai creato.
    if(!e.packageId) await _pkgEditorPersistNewPackage();
  }
  // EDIT mode: flush eventuali debounce in sospeso
  if(e.mode === 'edit' && e.packageId) {
    await _pkgEditorFlushMetaPending();
  }
  closePackageEditor();
}

// ── Persiste il pacchetto NUOVO in Supabase (chiamato da CREATE) ──
async function _pkgEditorPersistNewPackage() {
  const e = ST.packageEditor;
  if(!e || e.packageId) return;
  e.saving = true;
  const record = {
    user_id: ST.user.id,
    name:    e.name.trim() || ('Pacchetto ' + e.time),
    emoji:   e.emoji || '📦',
    time:    e.time || '08:00',
    sort_order: (ST.packages||[]).length,
  };
  const {data, error} = await supa.from('supplement_packages').insert(record).select().single();
  e.saving = false;
  if(error || !data) {
    showToast('Errore creando il pacchetto','⚠️');
    console.error('persistNewPackage:', error);
    return null;
  }
  e.packageId = data.id;
  e.mode = 'edit'; // promuovi a edit
  // Inserisci subito in ST.packages (vuoto, sarà popolato con items dopo)
  ST.packages.push({...data, items: []});
  return data.id;
}

// ── Flush meta pending (nome/emoji/time) prima di chiudere ──
async function _pkgEditorFlushMetaPending() {
  const e = ST.packageEditor;
  if(!e || !e.packageId || !e.dirty) return;
  e.saving = true;
  await dbq('salvare il pacchetto', supa.from('supplement_packages').update({
    name:  e.name.trim() || ('Pacchetto ' + e.time),
    emoji: e.emoji,
    time:  e.time,
  }).eq('id', e.packageId).eq('user_id', ST.user.id));
  // Sincronizza ST.packages
  const idx = ST.packages.findIndex(p => p.id === e.packageId);
  if(idx >= 0) {
    ST.packages[idx].name  = e.name.trim() || ('Pacchetto ' + e.time);
    ST.packages[idx].emoji = e.emoji;
    ST.packages[idx].time  = e.time;
  }
  e.dirty = false;
  e.saving = false;
}

// ── Articolo determinativo plurale maschile davanti a una CIFRA ──
// L'articolo segue come si PRONUNCIA il numero, non come si scrive: "gli 8"
// perché si legge "otto", "gli 11" perché si legge "undici". Tutti gli altri
// numeri che possono comparire qui (prodotti in un pacchetto, 2..64) iniziano
// per consonante — 18 è "diciotto", 28 è "ventotto" — e vogliono "i".
function _artNumPlurale(n) {
  return (n === 8 || n === 11) ? 'Gli' : 'I';
}

// ── Renderer principale dell'overlay ──
function renderPackageEditor() {
  const e = ST.packageEditor;
  const root = document.getElementById('package-editor-overlay');
  if(!e || !root) return;
  if(e.mode === 'extra') return _renderExtraEditor();

  const isCreate = e.mode === 'create';
  const headerTitle = isCreate ? 'Nuovo pacchetto' : 'Modifica pacchetto';
  const canSave = e.name.trim().length > 0 && e.items.length > 0;
  const itemsCount = e.items.length;
  const itemsCountLabel = itemsCount === 1 ? '1 PRODOTTO' : `${itemsCount} PRODOTTI`;

  let body = `<div class="pkg-editor-accent"></div>
    <div class="pkg-editor-header">
      <button class="pkg-editor-back" onclick="closePackageEditor()">‹ Indietro</button>
      <div class="pkg-editor-title">${esc(headerTitle)}</div>
      <button class="pkg-editor-save" onclick="savePackageEditor()" ${canSave?'':'disabled'}>Salva</button>
    </div>
    <div class="pkg-editor-body">`;

  // ── META CARD: orario / emoji / nome ──
  body += `<div class="int-v3-section-eb" style="margin-top:4px;">INFORMAZIONI PACCHETTO</div>
    <div class="pkg-editor-meta-card">
      <div class="pkg-editor-meta-row">
        <div class="pkg-editor-meta-row-label">ORARIO</div>
        <div class="pkg-editor-meta-row-value">
          <span class="pkg-editor-time-val">${esc(e.time || '--:--')}</span>
          <span class="pkg-editor-time-name">${esc((e.name||'').toUpperCase() || (isCreate?'NUOVO':'PACCHETTO'))}</span>
        </div>
        <button class="pkg-editor-time-edit" onclick="pkgEditorEditTime()">Modifica ›</button>
      </div>
      <div class="pkg-editor-meta-row">
        <div class="pkg-editor-meta-row-label">EMOJI</div>
        <button class="pkg-editor-emoji-tile" onclick="pkgEditorEditEmoji()" title="Cambia emoji">${esc(e.emoji || '📦')}</button>
      </div>
      <div class="pkg-editor-meta-row">
        <div class="pkg-editor-meta-row-label">NOME</div>
        <input class="pkg-editor-name-inp" id="pkg-editor-name-inp"
               value="${esc(e.name)}" placeholder="Es. Mattina"
               oninput="pkgEditorChangeName(this.value)"
               onblur="pkgEditorFlushName()"/>
      </div>
    </div>`;

  // ── ITEMS SECTION ──
  if(itemsCount === 0) {
    body += `<div class="pkg-editor-empty">
      <div class="pkg-editor-empty-emoji">📦</div>
      <div class="pkg-editor-empty-title">PACCHETTO VUOTO</div>
      <div class="pkg-editor-empty-text">Aggiungi prodotti dal catalogo Nutrilite per iniziare.</div>
      <button class="int-v3-cta primary" onclick="pkgEditorAddProduct()">
        <span class="int-v3-cta-label">+ Aggiungi prodotto</span>
        <span class="int-v3-cta-tag">Nutrilite</span>
      </button>
    </div>`;
  } else {
    body += `<div class="int-v3-section-head" style="margin-top:8px;">
      <h2 class="int-v3-section-title">Prodotti nel pacchetto</h2>
      <div class="int-v3-section-count">${itemsCountLabel}</div>
    </div>
    <div class="pkg-editor-items-eb">TRASCINA PER RIORDINARE</div>`;
    body += e.items.map(it => _renderPkgItemCard(it, e.expandedItem === it.supplement_id)).join('');
    body += `<button class="int-v3-cta secondary" onclick="pkgEditorAddProduct()" style="margin-top:14px;">
      <span class="int-v3-cta-label">+ Aggiungi prodotto</span>
      <span class="int-v3-cta-tag">Nutrilite</span>
    </button>`;
  }

  // ELIMINA PACCHETTO — visibile se il pacchetto è già persistito in DB,
  // indipendentemente dal numero di items. Fix bug: prima era nell'else di
  // itemsCount === 0 + gated su !isCreate, quindi un pacchetto persistito ma
  // svuotato non poteva essere eliminato dall'app (workaround: SQL diretto).
  // Regola corretta: la presenza di e.packageId è la source-of-truth.
  if(e.packageId) {
    body += `<button class="pkg-editor-delete" onclick="pkgEditorConfirmDelete()">Elimina pacchetto</button>`;
  }

  body += `</div>`; // .pkg-editor-body

  // Modal conferma eliminazione pacchetto
  if(ST.pkgDeleteConfirm) {
    // Il testo nomina quanti prodotti si liberano e DOVE finiscono. Dal cantiere
    // "Sospendi" (9 ago 2026) è veritiero: pkgEditorDoDelete non cancella più i
    // supplements, scioglie solo il gruppo.
    const nLib = (e.items || []).length;
    const libFrase = nLib === 0
      ? `Il pacchetto è vuoto: non c'è nessun prodotto da spostare.`
      : `${nLib === 1 ? 'Il prodotto che contiene resta' : `${_artNumPlurale(nLib)} <b>${nLib} prodotti</b> che contiene restano`} nella tua libreria e ${nLib === 1 ? 'lo ritrovi' : 'li ritrovi'} in <b>Integratori extra</b>.`;
    body += `<div class="info-modal-overlay" style="z-index:1600;" onclick="if(event.target===this)pkgEditorCancelDelete()">
      <div class="info-modal">
        <h3 style="margin:0 0 10px;font-family:'Syne',sans-serif;font-size:17px;color:var(--t1);">Eliminare il pacchetto?</h3>
        <p style="font-family:'Syne',sans-serif;font-size:14px;color:var(--t2);line-height:1.5;margin:0 0 18px;">
          ${esc(e.name || 'Pacchetto')} verrà rimosso. ${libFrase}<br><br>
          <span style="font-size:12px;color:var(--t3);">Il pacchetto non si può recuperare.</span>
        </p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-ghost" style="flex:1;" onclick="pkgEditorCancelDelete()">Annulla</button>
          <button class="btn" style="flex:1;background:#C44434;color:#fff;border:none;" onclick="pkgEditorDoDelete()">Elimina</button>
        </div>
      </div>
    </div>`;
  }

  // Toast undo rimozione item (Mail iOS pattern)
  if(ST.pkgRemoveItemConfirm) {
    body += `<div class="pkg-undo-toast">
      <span>Rimosso <b>${esc(ST.pkgRemoveItemConfirm.name)}</b> dal pacchetto</span>
      <button onclick="pkgEditorUndoRemove()">Annulla</button>
    </div>`;
  }

  root.innerHTML = body;
}

// ── Renderer card item (collassata o espansa) ──
function _renderPkgItemCard(it, expanded) {
  const s = it.supplement;
  if(!s) return '';
  const kcal = parseFloat(s.kcal)||0;
  const carb = parseFloat(s.carbs)||0;
  const prot = parseFloat(s.protein)||0;
  const fat  = parseFloat(s.fat)||0;
  const showMacros = (carb + prot + fat) > 0;
  const dose = parseFloat(s.dose_die)||1;
  const mult = parseFloat(s.dose_multiplier)||1;
  const unit = s.dose_unit || 'cps';
  const doses = parseFloat(s.doses)||0;
  const daysLeft = _suppDaysLeft(s);
  const dosePerDay = dose * mult;

  // Stock badge
  let stockBadge = '';
  if(daysLeft !== null) {
    if(daysLeft === 0) {
      stockBadge = `<span class="pkg-item-stock-badge out">ESAURITO</span>`;
    } else if(daysLeft <= 7) {
      stockBadge = `<span class="pkg-item-stock-badge low">⚠ ${daysLeft}gg</span>`;
    } else if(daysLeft <= 20) {
      stockBadge = `<span class="pkg-item-stock-badge mid">~${daysLeft}gg</span>`;
    }
  }

  // Meta linea collassata: dose unit · kcal [· C P G se almeno una > 0]
  const metaParts = [`${dose} ${esc(unit)} · ${Math.round(kcal)} KCAL`];
  if(showMacros) metaParts.push(`${carb}G C · ${prot}G P · ${fat}G G`);

  const monthly = suppMonthlyCost(s);
  const daily = monthly / 30;
  const sid = esc(s.local_id);
  // La stessa card serve sia gli item di un pacchetto sia l'editor dell'extra:
  // in modalita' extra le azioni stanno in fondo alla schermata, non nella card.
  const inPkgMode = !!(ST.packageEditor && ST.packageEditor.mode !== 'extra');
  const sospeso = !s.active;

  const expand = expanded ? `<div class="pkg-item-expand">
    ${(kcal||showMacros)?`<div class="pkg-item-chips">
      <span class="pkg-item-chip kcal">${Math.round(kcal)}kcal</span>
      ${showMacros?`<span class="pkg-item-chip c">${carb}g C</span><span class="pkg-item-chip p">${prot}g P</span><span class="pkg-item-chip g">${fat}g G</span>`:''}
    </div>`:''}
    <div class="pkg-item-field">
      <div class="pkg-item-field-label">DOSE</div>
      <div class="pkg-item-stepper">
        <button onclick="pkgItemAdjust('${sid}','dose',-0.5)">−</button>
        <input type="number" step="0.5" min="0.5" value="${dose}" oninput="pkgItemSet('${sid}','dose',+this.value)"/>
        <button onclick="pkgItemAdjust('${sid}','dose',0.5)">+</button>
      </div>
      <select class="pkg-item-unit-sel" onchange="pkgItemSet('${sid}','unit',this.value)">
        ${['cps','stick','barretta','misurino'].map(u=>`<option value="${u}"${u===unit?' selected':''}>${u}</option>`).join('')}
      </select>
    </div>
    <div class="pkg-item-field">
      <div class="pkg-item-field-label">MOLT.</div>
      <div class="pkg-item-stepper">
        <button onclick="pkgItemAdjust('${sid}','mult',-0.25)">−</button>
        <input type="number" step="0.25" min="0.25" max="4" value="${mult}" oninput="pkgItemSet('${sid}','mult',+this.value)"/>
        <button onclick="pkgItemAdjust('${sid}','mult',0.25)">+</button>
      </div>
      <span class="pkg-item-mult-helper">0.5 = mezza dose · 2 = doppia</span>
    </div>
    <div class="pkg-item-field">
      <div class="pkg-item-field-label">SCORTA</div>
      <div class="pkg-item-stepper">
        <button onclick="pkgItemAdjust('${sid}','doses',-1)">−</button>
        <input type="number" step="1" min="0" value="${doses}" oninput="pkgItemSet('${sid}','doses',+this.value)"/>
        <button onclick="pkgItemAdjust('${sid}','doses',1)">+</button>
      </div>
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t3);">${esc(unit)}</span>
      ${stockBadge?stockBadge:''}
    </div>
    ${daysLeft!==null?`<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t3);letter-spacing:.06em;padding:4px 0 6px;">= ${daysLeft} giorni rimasti${dosePerDay?` (${dosePerDay} ${esc(unit)}/die)`:''}</div>`:''}
    <div class="pkg-item-cost">€ ${daily.toFixed(2)}/oggi · ${monthly.toFixed(2)}/mese</div>
    ${inPkgMode ? `<button class="pkg-item-suspend${sospeso?' riprendi':''}" onclick="toggleSuppActive('${sid}')">${sospeso?'▶ Riprendi':'⏸ Sospendi'}</button>` : ''}
    ${inPkgMode ? `<button class="pkg-item-remove" onclick="pkgEditorRemoveItem('${sid}')">× Rimuovi dal pacchetto</button>` : ''}
  </div>` : '';

  const collapsed = inPkgMode;
  const header = collapsed ? `<div class="pkg-item-row" onclick="pkgEditorToggleItem('${sid}')">
    <span class="pkg-item-drag" onclick="event.stopPropagation()">⠿</span>
    <div class="pkg-item-body">
      <div class="pkg-item-name">${esc(s.name)}</div>
      <div class="pkg-item-meta">
        <span>${metaParts.join(' · ')}</span>
        ${stockBadge}
        ${sospeso?'<span class="zt-badge-sospeso">Sospeso</span>':''}
      </div>
    </div>
    <span class="pkg-item-chev">▾</span>
  </div>` : '';

  return `<div class="pkg-item-card${expanded?' expanded':''}${sospeso?' sospeso':''}">${header}${expand}</div>`;
}

// ── EXTRA editor: usa lo stesso overlay con UI semplificata ──
function _renderExtraEditor() {
  const e = ST.packageEditor;
  const root = document.getElementById('package-editor-overlay');
  const s = (ST.supps||[]).find(x => x.local_id === e.supplementId);
  if(!s) { closePackageEditor(); return; }

  let body = `<div class="pkg-editor-accent"></div>
    <div class="pkg-editor-header">
      <button class="pkg-editor-back" onclick="closePackageEditor()">‹ Indietro</button>
      <div class="pkg-editor-title">Integratore extra</div>
      <button class="pkg-editor-save" onclick="closePackageEditor()">Chiudi</button>
    </div>
    <div class="pkg-editor-body">
      <div class="int-v3-section-eb" style="margin-top:4px;">INFORMAZIONI EXTRA</div>
      <div class="pkg-editor-meta-card">
        <div class="pkg-editor-meta-row">
          <div class="pkg-editor-meta-row-label">ORARIO</div>
          <div class="pkg-editor-meta-row-value">
            <span class="pkg-editor-time-val">${esc(s.slot || '--:--')}</span>
          </div>
          <button class="pkg-editor-time-edit" onclick="pkgEditorEditExtraTime('${esc(s.local_id)}')">Modifica ›</button>
        </div>
        <div class="pkg-editor-meta-row">
          <div class="pkg-editor-meta-row-label">NOME</div>
          <div style="flex:1;font-family:'Syne',sans-serif;font-size:16px;color:var(--t1);">${esc(s.name)}</div>
        </div>
      </div>
      <div class="int-v3-section-head" style="margin-top:8px;">
        <h2 class="int-v3-section-title">Dettagli prodotto</h2>
      </div>
      ${_renderPkgItemCard({supplement_id: s.local_id, supplement: s, sort_order:0, id:null}, true)}
      <button class="pkg-editor-suspend${s.active?'':' riprendi'}" onclick="toggleSuppActive('${esc(s.local_id)}')">${s.active?'⏸ Sospendi':'▶ Riprendi'}</button>
      <div class="pkg-editor-suspend-note">${s.active
        ? 'Esce dalla tua giornata ma resta qui: lo riprendi quando vuoi.'
        : 'Sospeso. Non compare più nella giornata finché non lo riprendi.'}</div>
      <button class="pkg-editor-delete" onclick="pkgEditorConfirmDeleteExtra('${esc(s.local_id)}')">Elimina dalla libreria</button>
    </div>`;

  // Conferma elimina extra (riusa flag pkgDeleteConfirm)
  // Testo rivisto 9 ago 2026: prima la riga rassicurante ("lo storico resta")
  // era schiacciata fra "rimosso definitivamente" e "l'operazione è definitiva",
  // e l'insieme si leggeva come una minaccia globale — al punto da far credere
  // che si perdessero anche le assunzioni passate. Ora la cosa vera e importante
  // sta da sola e per prima, e il messaggio indica la via d'uscita reversibile.
  if(ST.pkgDeleteConfirm) {
    body += `<div class="info-modal-overlay" style="z-index:1600;" onclick="if(event.target===this)pkgEditorCancelDelete()">
      <div class="info-modal">
        <h3 style="margin:0 0 10px;font-family:'Syne',sans-serif;font-size:17px;color:var(--t1);">Eliminare ${esc(s.name)}?</h3>
        <p style="font-family:'Syne',sans-serif;font-size:14px;color:var(--t2);line-height:1.5;margin:0 0 14px;">
          Le assunzioni già registrate <b>restano nello storico</b>: quello che hai preso in passato non si perde.<br><br>
          Sparisce dalla tua libreria e dalla registrazione di ogni giorno.
        </p>
        <p style="font-family:'Syne',sans-serif;font-size:13px;color:var(--t3);line-height:1.5;margin:0 0 18px;padding:10px 12px;background:var(--s1);border-radius:8px;">
          Se vuoi solo smettere di prenderlo, usa <b>Sospendi</b>: lo ritrovi qui quando decidi di riprenderlo.
        </p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-ghost" style="flex:1;" onclick="pkgEditorCancelDelete()">Annulla</button>
          <button class="btn" style="flex:1;background:#C44434;color:#fff;border:none;" onclick="pkgEditorDoDeleteExtra('${esc(s.local_id)}')">Elimina</button>
        </div>
      </div>
    </div>`;
  }

  root.innerHTML = body;
}

// ── Meta edit handlers ──
function pkgEditorChangeName(value) {
  const e = ST.packageEditor;
  if(!e) return;
  e.name = value;
  e.dirty = true;
  // Debounce save in EDIT mode
  if(e.mode === 'edit' && e.packageId) {
    clearTimeout(e._nameTimer);
    e._nameTimer = setTimeout(() => _pkgEditorFlushMetaPending(), 800);
  }
}
function pkgEditorFlushName() {
  const e = ST.packageEditor;
  if(!e) return;
  if(e.mode === 'edit' && e.packageId && e.dirty) {
    clearTimeout(e._nameTimer);
    _pkgEditorFlushMetaPending().then(() => renderPackageEditor());
  }
}
async function pkgEditorEditTime() {
  const e = ST.packageEditor;
  if(!e) return;
  const newTime = await chiediTesto('Orario', { valore:e.time || '08:00', tipo:'time' });
  if(!newTime) return;
  // Validazione semplice
  if(!/^\d{1,2}:\d{2}$/.test(newTime)) { showToast('Formato HH:MM','⚠️'); return; }
  e.time = newTime;
  e.dirty = true;
  if(e.mode === 'edit' && e.packageId) _pkgEditorFlushMetaPending().then(() => renderPackageEditor());
  else renderPackageEditor();
}
async function pkgEditorEditEmoji() {
  const e = ST.packageEditor;
  if(!e) return;
  const newEmoji = await chiediTesto('Emoji', { valore:e.emoji || '📦', testo:'Incolla o digita un\'emoji.' });
  if(newEmoji == null) return;
  const v = newEmoji.trim().slice(0, 4);
  if(!v) return;
  e.emoji = v;
  e.dirty = true;
  if(e.mode === 'edit' && e.packageId) _pkgEditorFlushMetaPending().then(() => renderPackageEditor());
  else renderPackageEditor();
}

// ── Item interactions ──
function pkgEditorToggleItem(supplementId) {
  const e = ST.packageEditor;
  if(!e) return;
  e.expandedItem = e.expandedItem === supplementId ? null : supplementId;
  renderPackageEditor();
}
function pkgItemSet(supplementId, field, value) {
  const s = (ST.supps||[]).find(x => x.local_id === supplementId);
  if(!s) return;
  if(field === 'dose') {
    updateSuppDose(supplementId, value);
  } else if(field === 'mult') {
    updateSuppMultiplier(supplementId, value);
  } else if(field === 'unit') {
    updateSupp(supplementId, 'dose_unit', value);
  } else if(field === 'doses') {
    updateSupp(supplementId, 'doses', Math.max(0, parseInt(value)||0));
  }
  // Sincronizza ST.packages dato che ST.supps è già aggiornato per riferimento
  // Re-render per riflettere nuovi calcoli (days left, stock badge, costo)
  if(field !== 'dose') renderPackageEditor(); // updateSuppDose chiama già renderIntegratori — qui forziamo l'editor
  else setTimeout(() => renderPackageEditor(), 50);
}
function pkgItemAdjust(supplementId, field, delta) {
  const s = (ST.supps||[]).find(x => x.local_id === supplementId);
  if(!s) return;
  if(field === 'dose') {
    const cur = parseFloat(s.dose_die)||1;
    pkgItemSet(supplementId, 'dose', Math.max(0.5, +(cur + delta).toFixed(2)));
  } else if(field === 'mult') {
    const cur = parseFloat(s.dose_multiplier)||1;
    pkgItemSet(supplementId, 'mult', Math.max(0.25, Math.min(4, +(cur + delta).toFixed(2))));
  } else if(field === 'doses') {
    const cur = parseInt(s.doses)||0;
    pkgItemSet(supplementId, 'doses', Math.max(0, cur + delta));
  }
}

// ── Rimuovi item da pacchetto (Mail iOS pattern: toast con undo 4s) ──
function pkgEditorRemoveItem(supplementId) {
  const e = ST.packageEditor;
  if(!e || e.mode === 'extra') return;
  const it = e.items.find(x => x.supplement_id === supplementId);
  if(!it) return;
  const name = it.supplement?.name || 'Prodotto';
  // Rimuovi subito dallo stato locale, salva l'item per eventuale undo
  e._pendingRemove = it;
  e.items = e.items.filter(x => x.supplement_id !== supplementId);
  if(e.expandedItem === supplementId) e.expandedItem = null;
  ST.pkgRemoveItemConfirm = { supplementId, itemId: it.id, name };
  renderPackageEditor();
  // Commit dopo 4s
  ST._pkgRemoveTimer = setTimeout(async () => {
    if(!ST.pkgRemoveItemConfirm) return; // già undone
    const conf = ST.pkgRemoveItemConfirm;
    ST.pkgRemoveItemConfirm = null;
    if(conf.itemId) {
      await dbq('togliere l\'integratore dal pacchetto', supa.from('supplement_package_items').delete().eq('id', conf.itemId));
    }
    // Aggiorna ST.packages
    if(e.packageId) {
      const idx = ST.packages.findIndex(p => p.id === e.packageId);
      if(idx >= 0) ST.packages[idx].items = ST.packages[idx].items.filter(x => x.supplement_id !== conf.supplementId);
    }
    if(ST.packageEditor) delete ST.packageEditor._pendingRemove;
    renderPackageEditor();
  }, 4000);
}
function pkgEditorUndoRemove() {
  const e = ST.packageEditor;
  if(!e || !e._pendingRemove) return;
  clearTimeout(ST._pkgRemoveTimer);
  ST._pkgRemoveTimer = null;
  // Ripristina nello stato locale
  e.items.push(e._pendingRemove);
  e.items.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
  delete e._pendingRemove;
  ST.pkgRemoveItemConfirm = null;
  renderPackageEditor();
}

// ── Elimina intero pacchetto ──
function pkgEditorConfirmDelete() {
  ST.pkgDeleteConfirm = true;
  renderPackageEditor();
}
function pkgEditorCancelDelete() {
  ST.pkgDeleteConfirm = false;
  renderPackageEditor();
}
async function pkgEditorDoDelete() {
  const e = ST.packageEditor;
  if(!e || !e.packageId) return;
  // REVISIONE 9 ago 2026 — eliminare un pacchetto NON cancella più i suoi prodotti.
  // Prima li cancellava dalla libreria mentre il messaggio di conferma prometteva
  // il contrario: chi eliminava "Pack Colazione" perdeva 8 integratori configurati
  // credendo di sciogliere un gruppo. Ora l'esito è quello già promesso dal testo e
  // già valido per "× Rimuovi dal pacchetto": si scioglie il gruppo, i prodotti
  // restano e ricompaiono fra gli extra.
  //
  // Nessuna scrittura serve per "promuoverli" a extra: _extraSupps() definisce gli
  // extra come "i supplements che non stanno in nessun pacchetto", quindi appena il
  // legame sparisce ci finiscono da soli.
  //
  // Ordine: prima i legami, poi il pacchetto. Le righe di supplement_package_items
  // le cancelliamo esplicitamente invece di affidarci a un CASCADE che non è stato
  // verificato: così l'esito è lo stesso che il vincolo ci sia o no, e ripetere
  // l'operazione non fa danni.
  const suppIds = (e.items || []).map(it => it.supplement_id).filter(Boolean);
  const {error: delItemsErr} = await supa.from('supplement_package_items')
    .delete()
    .eq('package_id', e.packageId)
    .eq('user_id', ST.user.id);
  if(delItemsErr) {
    console.error('pkgEditorDoDelete items:', delItemsErr);
    showToast('Errore sciogliendo il pacchetto','⚠️');
    return;
  }
  const {error: delPkgErr} = await supa.from('supplement_packages')
    .delete()
    .eq('id', e.packageId)
    .eq('user_id', ST.user.id);
  if(delPkgErr) {
    // I legami sono già andati: i prodotti sono comunque salvi e visibili fra gli
    // extra. Resta un pacchetto vuoto, che l'utente può rieliminare.
    console.error('pkgEditorDoDelete package:', delPkgErr);
    showToast('Errore eliminazione pacchetto','⚠️');
    return;
  }
  // Sync in-memory: sparisce il pacchetto, i supplements restano tutti.
  ST.packages = (ST.packages || []).filter(p => p.id !== e.packageId);
  // Re-fetch authoritative dal DB per garantire coerenza cross-device + macro
  // aggregate aggiornate (suppMonthlyCost, tile Home Nutrition, ecc.)
  try { await loadSupps(); await loadPackages(); } catch(_) {}
  ST.pkgDeleteConfirm = false;
  saveCache();
  closePackageEditor();
  const msg = suppIds.length > 0
    ? `Pacchetto eliminato · ${suppIds.length} prodott${suppIds.length===1?'o spostato':'i spostati'} negli extra`
    : 'Pacchetto eliminato';
  showToast(msg, '🗑️');
}

// ── Apri catalogo Nutrilite in modalità "Aggiungi a pacchetto" ──
async function pkgEditorAddProduct() {
  const e = ST.packageEditor;
  if(!e) return;
  // CREATE mode: prima crea il pacchetto, poi apri catalogo
  if(e.mode === 'create' && !e.packageId) {
    if(!e.name.trim()) { showToast('Aggiungi prima un nome al pacchetto','⚠️'); return; }
    const newId = await _pkgEditorPersistNewPackage();
    if(!newId) return;
  }
  // Blocco 2: alreadyInPackage = codici prodotto già linkati al pacchetto.
  // Il catalogo li mostra grayed-out con tag "NEL PACCHETTO".
  const alreadyInPackage = (e.items || [])
    .map(it => it.supplement && it.supplement.codice)
    .filter(Boolean);
  ST.catalogContext = {
    mode: 'addToPackage',
    packageId:   e.packageId,
    packageName: e.name,
    packageTime: e.time,
    time:        e.time, // back-compat con goToCatalogStep2 (slot pre-fill)
    alreadyInPackage,
  };
  // Nascondi temporaneamente l'overlay editor (resta in ST per riapertura post-import)
  document.getElementById('package-editor-overlay').classList.remove('visible');
  openCatalogModal();
}

// ── Apri catalogo per integratore EXTRA (no package linking) ──
function openCatalogForExtra() {
  ST.catalogContext = { mode: 'addExtra' };
  openCatalogModal();
}

// ── Apri catalogo in modalità "Registra extra" (Step 2 Integratori, 18 mag 2026) ──
// Chiamato dalla card "Singolo · Fuori schema" del bottom sheet "+ Registra integratori"
// in tab Oggi. La selezione catalogo va poi in openConfirmExtraScreen → supplements_log.
function openCatalogForRegisterExtra() {
  closeSuppSheet();
  ST.catalogContext = { mode: 'registerExtra', alreadyInPackage: [] };
  openCatalogModal();
}

// ── EXTRA EDITOR: edit orario di un extra ──
async function pkgEditorEditExtraTime(supplementId) {
  const s = (ST.supps||[]).find(x => x.local_id === supplementId);
  if(!s) return;
  const newTime = await chiediTesto('Orario', { valore:s.slot || '08:00', tipo:'time' });
  if(!newTime) return;
  if(!/^\d{1,2}:\d{2}$/.test(newTime)) { showToast('Formato HH:MM','⚠️'); return; }
  s.slot = newTime;
  dbUpdateSupp(supplementId, {slot: newTime});
  saveCache();
  renderPackageEditor();
}
// ── EXTRA EDITOR: elimina supplement dalla libreria ──
function pkgEditorConfirmDeleteExtra(supplementId) {
  ST.pkgDeleteConfirm = true;
  renderPackageEditor();
}
async function pkgEditorDoDeleteExtra(supplementId) {
  await dbDeleteSupp(supplementId);
  ST.supps = ST.supps.filter(s => s.local_id !== supplementId);
  ST.pkgDeleteConfirm = false;
  closePackageEditor();
  showToast('Integratore eliminato','🗑️');
}

// ═══════════════════════════════════════════════════════════
// END PACKAGE EDITOR
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// CONFERMA EXTRA — Step 2 modulo Integratori (18 mag 2026)
// Schermata fullscreen che conferma dose + orario per N prodotti
// selezionati dal catalogo in modalità registerExtra, poi INSERT
// in supplements_log con is_extra=true (snapshot completo).
// ═══════════════════════════════════════════════════════════

function openConfirmExtraScreen(codici) {
  if(!codici || codici.length === 0) { showToast('Nessun prodotto selezionato','⚠️'); return; }
  const now = new Date();
  const slotNow = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const items = codici.map(code => {
    const cat = (ST.catalog || []).find(c => c.codice === code);
    if(!cat) return null;
    return {
      codice:     cat.codice,
      name:       cat.nome,
      categoria:  cat.categoria || '',
      linea:      cat.linea || '',
      confezione: cat.confezione || '',
      dose:       cat.dose_die != null ? parseFloat(cat.dose_die) : 1,
      dose_unit:  cat.dose_unit || 'cps',
      slot:       slotNow,
      // snapshot macro/costo dal catalogo per dose unitaria (scala alla dose scelta in submit)
      kcal_base:     parseFloat(cat.kcal)     || 0,
      carbo_base:    parseFloat(cat.carbo)    || 0,
      proteine_base: parseFloat(cat.proteine) || 0,
      grassi_base:   parseFloat(cat.grassi)   || 0,
      costo_base:    parseFloat(cat.costo_dose_partner) || 0,
      defaultDose:   cat.dose_die != null ? parseFloat(cat.dose_die) : 1,
      defaultSlot:   slotNow,
    };
  }).filter(Boolean);
  if(items.length === 0) { showToast('Prodotti non trovati nel catalogo','⚠️'); return; }
  ST.confirmExtra = { items, removeUndo: {}, submitting: false };
  renderConfirmExtraScreen();
  document.getElementById('confirm-extra-screen').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeConfirmExtraScreen() {
  // Cleanup undo timers se attivi
  if(ST.confirmExtra) {
    Object.values(ST.confirmExtra.removeUndo || {}).forEach(u => { if(u.timer) clearTimeout(u.timer); });
  }
  const root = document.getElementById('confirm-extra-screen');
  root.classList.add('dismissing');
  setTimeout(() => {
    root.classList.remove('visible');
    root.classList.remove('dismissing');
    root.innerHTML = '';
    document.body.style.overflow = '';
    ST.confirmExtra = null;
  }, 220);
}

// Verifica se l'utente ha toccato qualcosa rispetto ai default
function _cextraIsDirty() {
  const e = ST.confirmExtra;
  if(!e) return false;
  return e.items.some(it => it.dose !== it.defaultDose || it.slot !== it.defaultSlot);
}

// Back button: conferma se dirty, altrimenti silent close
async function cextraBack() {
  if(!ST.confirmExtra) return;
  // Se l'utente ha rimosso prodotti o modificato campi → conferma
  const hasRemoved = Object.keys(ST.confirmExtra.removeUndo || {}).length > 0;
  if(_cextraIsDirty() || hasRemoved) {
    if(!await chiediConferma('Le modifiche andranno perse.', { titolo:'Annullare la registrazione?', ok:'Annulla registrazione', annulla:'Resta', pericolo:true })) return;
  }
  closeConfirmExtraScreen();
  // Riapri il catalogo modal (la selezione catalogSelected è preservata in ST)
  document.getElementById('catalog-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function renderConfirmExtraScreen() {
  const e = ST.confirmExtra;
  const root = document.getElementById('confirm-extra-screen');
  if(!e || !root) return;
  const activeItems = e.items;
  const n = activeItems.length;
  const canSubmit = n > 0 && activeItems.every(it => it.dose > 0 && /^\d{1,2}:\d{2}$/.test(it.slot));
  const countLabel = n === 1 ? '1 PRODOTTO SELEZIONATO' : `${n} PRODOTTI SELEZIONATI`;
  const ctaLabel = n === 0 ? 'Nessun prodotto'
                  : n === 1 ? `Registra <span class="cextra-cta-count">1</span> extra`
                  : `Registra <span class="cextra-cta-count">${n}</span> extra`;

  let body = `<div class="cextra-accent"></div>
    <div class="cextra-header">
      <button class="cextra-back" onclick="cextraBack()">‹ Indietro</button>
      <div class="cextra-title">Registra extra</div>
      <button class="cextra-submit" onclick="confirmExtraScreenSubmit()" ${canSubmit?'':'disabled'}>Registra</button>
    </div>
    <div class="cextra-body">
      <div class="cextra-eyebrow-mint">EVENTO MORDI-E-FUGGI · NESSUNA CONFIG. SALVATA</div>
      <h2 class="cextra-intro-title">Conferma dose &amp; orario</h2>
      <p class="cextra-intro-sub">${n === 0 ? 'Hai rimosso tutti i prodotti dalla selezione.' : `Stai registrando ${n === 1 ? '1 prodotto' : `${n} prodotti`} fuori dai pacchetti. Conferma per salvarli nel diario di oggi.`}</p>
      ${n > 0 ? `<div class="cextra-count">${countLabel}</div>` : ''}`;

  if(n === 0) {
    body += `<div class="cextra-empty">
      <div class="cextra-empty-emoji">📦</div>
      <div class="cextra-empty-title">Nessun prodotto da registrare</div>
      <div class="cextra-empty-text">Hai rimosso tutti i prodotti. Torna al catalogo per riselezionare.</div>
      <button class="cextra-empty-link" onclick="cextraBack()">‹ Torna al catalogo</button>
    </div>`;
  } else {
    // Stripes "rimosso · annulla" prima delle card attive (eventuali pendenti undo)
    Object.entries(e.removeUndo || {}).forEach(([code, u]) => {
      body += `<div class="cextra-removed-strip">
        <span>Rimosso · ${esc(u.item.name)}</span>
        <button onclick="confirmExtraScreenUndoRemove('${esc(code)}')">Annulla</button>
      </div>`;
    });
    activeItems.forEach((it, idx) => {
      body += _renderCextraCard(it, idx);
    });
    body += `<div class="cextra-sticky-cta">
      <button class="cextra-cta${canSubmit?'':' disabled'}" ${canSubmit?'':'disabled'} onclick="confirmExtraScreenSubmit()">${ctaLabel}</button>
    </div>`;
  }

  body += `</div>`; // .cextra-body
  root.innerHTML = body;
}

function _renderCextraCard(it, idx) {
  const tint = getCatalogTint({ categoria: it.categoria });
  const stagger = idx < 3 ? ` style="animation-delay:${idx * 40}ms;"` : '';
  const cls = idx < 3 ? 'cextra-card entering' : 'cextra-card';
  const code = esc(it.codice);
  const portion = `${it.defaultDose} ${esc(it.dose_unit || 'cps')}`;
  const subRow = `${esc((it.categoria || '').toUpperCase())} · ${portion.toUpperCase()}`;
  return `<div class="${cls}"${stagger}>
    <div class="cextra-card-head">
      <div class="cextra-thumb" style="background:${tint.bg};">${tint.emoji}</div>
      <div style="flex:1;min-width:0;">
        <div class="cextra-name">${esc(it.name)}</div>
        <div class="cextra-meta">${subRow}</div>
      </div>
    </div>
    <div class="cextra-field">
      <div class="cextra-field-label">DOSE</div>
      <div class="cextra-stepper">
        <button onclick="confirmExtraScreenAdjust('${code}','dose',-0.5)">−</button>
        <input type="number" step="0.5" min="0.5" value="${it.dose}" oninput="confirmExtraScreenSet('dose','${code}',+this.value)"/>
        <button onclick="confirmExtraScreenAdjust('${code}','dose',0.5)">+</button>
      </div>
      <select class="cextra-unit-sel" onchange="confirmExtraScreenSet('dose_unit','${code}',this.value)">
        ${['cps','stick','barretta','misurino'].concat(it.dose_unit && !['cps','stick','barretta','misurino'].includes(it.dose_unit) ? [it.dose_unit] : []).map(u => `<option value="${u}"${u===it.dose_unit?' selected':''}>${u}</option>`).join('')}
      </select>
    </div>
    <div class="cextra-field">
      <div class="cextra-field-label">ORARIO</div>
      <span class="cextra-time-val">${esc(it.slot || '--:--')}</span>
      <button class="cextra-time-edit" onclick="confirmExtraScreenEditTime('${code}')">Modifica ›</button>
    </div>
    <button class="cextra-remove" onclick="confirmExtraScreenRemove('${code}')">× Rimuovi da questa registrazione</button>
  </div>`;
}

function confirmExtraScreenSet(field, codice, value) {
  const e = ST.confirmExtra;
  if(!e) return;
  const it = e.items.find(x => x.codice === codice);
  if(!it) return;
  if(field === 'dose') {
    it.dose = Math.max(0.5, parseFloat(value) || 0.5);
  } else if(field === 'dose_unit') {
    it.dose_unit = value;
  } else if(field === 'slot') {
    if(/^\d{1,2}:\d{2}$/.test(value)) it.slot = value;
  }
  renderConfirmExtraScreen();
}
function confirmExtraScreenAdjust(codice, field, delta) {
  const e = ST.confirmExtra;
  if(!e) return;
  const it = e.items.find(x => x.codice === codice);
  if(!it) return;
  if(field === 'dose') {
    it.dose = Math.max(0.5, +(it.dose + delta).toFixed(2));
  }
  renderConfirmExtraScreen();
}
async function confirmExtraScreenEditTime(codice) {
  const e = ST.confirmExtra;
  if(!e) return;
  const it = e.items.find(x => x.codice === codice);
  if(!it) return;
  const v = await chiediTesto('Orario', { valore:it.slot || '08:00', tipo:'time' });
  if(!v) return;
  if(!/^\d{1,2}:\d{2}$/.test(v)) { showToast('Formato HH:MM','⚠️'); return; }
  it.slot = v;
  renderConfirmExtraScreen();
}

// Pattern Mail iOS: rimuove card visivamente, mostra stripe undo 4s, poi commit definitivo
function confirmExtraScreenRemove(codice) {
  const e = ST.confirmExtra;
  if(!e) return;
  const idx = e.items.findIndex(x => x.codice === codice);
  if(idx < 0) return;
  const [removed] = e.items.splice(idx, 1);
  // Salva per eventuale undo
  if(!e.removeUndo) e.removeUndo = {};
  // Cancella timer precedente se esiste (re-remove di un undo pendente — edge case improbabile)
  if(e.removeUndo[codice] && e.removeUndo[codice].timer) clearTimeout(e.removeUndo[codice].timer);
  e.removeUndo[codice] = {
    item: removed,
    timer: setTimeout(() => {
      if(ST.confirmExtra && ST.confirmExtra.removeUndo && ST.confirmExtra.removeUndo[codice]) {
        delete ST.confirmExtra.removeUndo[codice];
        renderConfirmExtraScreen();
      }
    }, 4000),
  };
  renderConfirmExtraScreen();
}
function confirmExtraScreenUndoRemove(codice) {
  const e = ST.confirmExtra;
  if(!e || !e.removeUndo || !e.removeUndo[codice]) return;
  const u = e.removeUndo[codice];
  if(u.timer) clearTimeout(u.timer);
  e.items.push(u.item);
  delete e.removeUndo[codice];
  renderConfirmExtraScreen();
}

// Submit: insert N righe in supplements_log + toast undo Mail iOS 4s
async function confirmExtraScreenSubmit() {
  const e = ST.confirmExtra;
  if(!e || e.submitting) return;
  if(e.items.length === 0) return;
  e.submitting = true;
  // Scrive sul GIORNO VISUALIZZATO, non su "oggi". Prima gli extra andavano
  // sempre su todayKey() mentre gruppi e singoli andavano su ST.activeDay: due
  // gesti a pochi centimetri di distanza producevano due giorni diversi sulla
  // stessa schermata. Ora tutta la registrazione degli integratori segue la data
  // che l'utente ha davanti, come gia' fanno i pasti (dbAddMeal).
  const giorno = ST.activeDay || todayKey();
  const insertedIds = [];
  try {
    for(const it of e.items) {
      // Scala macro/costo proporzionalmente alla dose scelta (snapshot immutabile)
      const ratio = (it.defaultDose && it.defaultDose > 0) ? (it.dose / it.defaultDose) : 1;
      const row = {
        date:      giorno,
        slot:      it.slot,
        name:      it.name,
        codice:    it.codice,
        dose:      it.dose,
        dose_unit: it.dose_unit,
        kcal:      it.kcal_base     * ratio,
        carbo:     it.carbo_base    * ratio,
        proteine:  it.proteine_base * ratio,
        grassi:    it.grassi_base   * ratio,
        costo:     it.costo_base    * ratio,
      };
      const inserted = await dbInsertExtraLog(row);
      if(inserted && inserted.id) insertedIds.push(inserted.id);
    }
  } catch(err) {
    console.error('confirmExtraScreenSubmit:', err);
    showToast('Errore registrazione extra','⚠️');
    e.submitting = false;
    return;
  }
  const count = insertedIds.length;
  // Cleanup catalog selection (è stata "consumata")
  ST.catalogSelected = [];
  ST.catalogContext = null;
  // Refresh ST.extras + chiudi schermata + re-render tab Oggi
  await loadExtras(ST.activeDay);
  closeConfirmExtraScreen();
  // Chiudi anche il catalog modal (era nascosto dietro)
  document.getElementById('catalog-modal').style.display = 'none';
  // Re-render tab Oggi se siamo lì
  if(ST.page === 'oggi') renderOggi();
  // Toast undo Mail iOS 4s
  _cextraShowUndoToast(insertedIds, count);
}

// Toast undo Mail iOS post-submit
function _cextraShowUndoToast(ids, count) {
  // Cleanup toast precedente se esiste
  if(ST.extraUndoToast && ST.extraUndoToast.timer) clearTimeout(ST.extraUndoToast.timer);
  const existing = document.getElementById('cextra-undo-toast');
  if(existing) existing.remove();
  ST.extraUndoToast = {
    ids: [...ids],
    timer: setTimeout(() => {
      _cextraDismissUndoToast();
    }, 4000),
  };
  const lbl = count === 1 ? '1 extra registrato' : `${count} extra registrati`;
  const el = document.createElement('div');
  el.id = 'cextra-undo-toast';
  el.className = 'cextra-undo-toast';
  el.innerHTML = `<b>${esc(lbl).toUpperCase()}</b><button onclick="cextraUndoToastClick()">Annulla</button>`;
  document.body.appendChild(el);
}
function _cextraDismissUndoToast() {
  const el = document.getElementById('cextra-undo-toast');
  if(el) el.remove();
  ST.extraUndoToast = null;
}
async function cextraUndoToastClick() {
  if(!ST.extraUndoToast) return;
  const ids = ST.extraUndoToast.ids || [];
  if(ST.extraUndoToast.timer) clearTimeout(ST.extraUndoToast.timer);
  _cextraDismissUndoToast();
  // DELETE in cascata
  for(const id of ids) {
    try { await dbDeleteExtraLog(id); } catch(e) { console.warn('undo delete:', e); }
  }
  await loadExtras(ST.activeDay);
  if(ST.page === 'oggi') renderOggi();
  showToast('Registrazione annullata','↩️');
}

// Modal conferma elimina extra dalla timeline tab Oggi (tap su card extra)
function confirmDeleteExtraFromTimeline(logId, name) {
  ST.pkgExtraDeleteConfirm = { logId, name: name || 'Extra' };
  renderOggi();
}
function cancelDeleteExtraFromTimeline() {
  ST.pkgExtraDeleteConfirm = null;
  renderOggi();
}
async function doDeleteExtraFromTimeline() {
  const c = ST.pkgExtraDeleteConfirm;
  if(!c) return;
  try { await dbDeleteExtraLog(c.logId); } catch(e) { console.warn('delete extra:', e); }
  ST.pkgExtraDeleteConfirm = null;
  await loadExtras(ST.activeDay);
  if(ST.page === 'oggi') renderOggi();
  showToast('Extra eliminato','🗑️');
}

// ═══════════════════════════════════════════════════════════
// END CONFERMA EXTRA
// ═══════════════════════════════════════════════════════════

async function deleteSupp(id){
  if(await chiediConferma('Eliminare questo integratore?', { ok:'Elimina', pericolo:true })){
    ST.supps=ST.supps.filter(s=>s.local_id!==id);
    await dbDeleteSupp(id);
    renderIntegratori();
    saveCache();
  }
}

async function goToDay(day){
  ST.activeDay=day;
  ST.advice='';
  showPage('oggi');
  try { await loadExtras(ST.activeDay); if(ST.page==='oggi') renderOggi(); } catch(e){ console.warn('goToDay loadExtras:', e); }
}
