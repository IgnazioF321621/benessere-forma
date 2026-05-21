# DIAGNOSTICA INTEGRATORI MACRO — Report 2026-05-21

**Sessione**: sola lettura · nessuna modifica al codice · nessun commit · nessun push.
**Scope**: 3 rischi nascosti nel conteggio macro/kcal degli integratori, dopo che la verifica base ("registro extra → totali Home/Nutrition si aggiornano") è risultata OK.
**File ispezionato**: [zona-tracker.html](zona-tracker.html) (16.484 righe, snapshot al commit `7c2ceb2`).

---

## Riepilogo esecutivo

1. **Rischio 1 — Doppio conteggio**: **CONFERMATO con esempio concreto**. Il pasto demo Piano V4 [`demo-4`](zona-tracker.html:12041) è letteralmente "XS High Protein Energy Bar Cocco" (195 kcal, 15g P), lo stesso prodotto che esiste nel catalogo Nutrilite. Se l'utente tappa ACCETTA su quel pasto E poi registra "XS High Protein Energy Bar Cocco" come extra in tab Integratori, `dayTotals()` somma entrambi senza alcuna deduplica. Doppio conteggio: ~195 kcal / 15g proteine / 19g carbo / 7g grassi per evento. SQL diagnostica pronta per quantificare lo storico Ignazio.
2. **Rischio 2 — Catalogo incompleto**: **DA VERIFICARE con SQL**. Il fallback codice è silenzioso (`parseFloat(item.kcal) || 0`, [riga 14912](zona-tracker.html:14912)): se i campi `kcal/proteine/carbo/grassi` su `nutrilite_catalog` sono NULL o 0, l'extra viene registrato con macro=0 senza nessun warning UI ([riga 14916](zona-tracker.html:14916): `(c+p+g) > 0` nasconde solo le 3 chip C/P/G, NON segnala "dato mancante"). Impatto: shake XS Whey + barrette XS registrati come extra contribuirebbero zero se il catalogo è vuoto. La query 2A risponderà definitivamente.
3. **Rischio 3 — AI cieca**: **CONFERMATO**. `getAdvice` riceve i totali numerici corretti via `dayTotals()` (include integratori — [riga 14421](zona-tracker.html:14421)), MA il blocco "PASTI GIÀ CONSUMATI OGGI" elenca solo i `meals`, mai i `supplements_log` ([riga 3626](zona-tracker.html:3626)). Il piano AI settimanale ([riga 12946](zona-tracker.html:12946)) NON menziona affatto gli integratori dell'utente. Conseguenza: l'AI può suggerire "ti mancano 20g proteine, aggiungi tonno" senza sapere che hai appena bevuto uno shake XS Whey 25g.

---

## Rischio 1 — Doppio conteggio

### 1.1 Logica codice — dbAddMeal

[`dbAddMeal()` (riga 4586)](zona-tracker.html:4586) è genericissima: insert raw su `meals` con `kcal/protein/carbs/fat`, **nessuna colonna `source`**, **nessun flag `from_piano_ai`**, **nessun riferimento a `supplements_log` o `nutrilite_catalog`**. È la stessa funzione usata sia dal form manuale (`logMeal`/`smartSavePasto`) sia dall'handler `acceptPianoV4DemoMeal` ([riga 11923](zona-tracker.html:11923)) che converte un pasto demo del Piano V4 in una riga `meals`:

```js
const mealData = {
  slot: legacySlot,
  description: meal.name + ' · ' + meal.ingredients.join(', '),
  kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
  time: timeForMeal,
};
const saved = await dbAddMeal(mealData);
```

Il pasto "XS High Protein Energy Bar Cocco" finisce in `meals` con `description` = `"XS High Protein Energy Bar Cocco · XS High Protein Energy Bar gusto Cocco 50g (1 barretta)"` — nessun campo strutturato che ricolleghi al prodotto del catalogo.

### 1.2 Logica codice — confirmExtraScreenSubmit

[`confirmExtraScreenSubmit()` (riga 16031)](zona-tracker.html:16031) non esegue alcuna SELECT preventiva su `meals` per controllare se lo stesso prodotto è già stato registrato come pasto. Il flusso è puramente additivo:

```js
const inserted = await dbInsertExtraLog(row);
if(inserted && inserted.id) insertedIds.push(inserted.id);
```

E [`dbInsertExtraLog` (riga 4556)](zona-tracker.html:4556) inserisce una riga `supplements_log` con `is_extra=true` + snapshot completo macro — anche qui nessun check su `meals.description` o `meals.notes` per intercettare collisioni.

### 1.3 Collisione documentata — pasti demo Piano V4

In [`_pianoV4GetDemoMeals` (riga 12016)](zona-tracker.html:12016) e [`_pianoV4GetAlternatives` (riga 12063)](zona-tracker.html:12063) ci sono almeno **4 pasti demo che corrispondono 1:1 a prodotti del catalogo Nutrilite/XS**:

| ID demo | Pasto | Slot | Macro | Prodotto catalogo coincidente |
|---|---|---|---|---|
| `demo-4` | XS High Protein Energy Bar Cocco | merenda | 195/19/15/7 | XS Protein Bar gusto Cocco |
| `alt-mere-1` | XS High Protein Bar Cioccolato | merenda | 195/19/15/7 | XS Protein Bar gusto Cioccolato Fondente |
| `alt-spun-2` | Shake proteico XS (Hydrolyzed Whey 40g) | spuntino | 180/6/25/4 | XS Hydrolyzed Whey Protein |
| `alt-mere-2` | Nutrilite All Plant Protein (15g + frutto) | merenda | 170/8/22/5 | Nutrilite All Plant Protein |

Se l'utente fa ACCETTA su uno qualunque di questi E poi va in tab Integratori → Catalogo → seleziona lo stesso prodotto come extra → ha doppio conteggio.

### 1.4 Helper di calcolo — chi conta cosa

| Funzione | Riga | Sorgente dati |
|---|---|---|
| `mealTotals(meals)` | [3351](zona-tracker.html:3351) | `day.meals[]` |
| `suppTotalsForIds(ids)` | [3352-3362](zona-tracker.html:3352) | `ST.supps[]` filtrato per `day.suppsTaken[]` (integratori in pacchetti registrati come "presi") |
| `extraSuppsTotals(day)` | [3369-3391](zona-tracker.html:3369) | `day.rawSuppLogs[]` (vecchio path, filtra i nomi NON in `ST.supps`) |
| `_extrasV3Totals(day)` | [3396-3406](zona-tracker.html:3396) | `ST.extras[]` (nuovo path Step 2 Integratori, solo per `ST.activeDay`) |
| **`dayTotals(day)`** | [3408-3420](zona-tracker.html:3408) | **SOMMA tutte e 4 le sorgenti senza dedup** |

```js
function dayTotals(day) {
  const m = mealTotals(day.meals || []);
  const s = suppTotalsForIds(day.suppsTaken || []);
  const x = extraSuppsTotals(day);
  const e = _extrasV3Totals(day);
  return { kcal: r2(m.kcal + s.kcal + x.kcal + e.kcal), ... };
}
```

Nessun meccanismo di deduplica cross-source. Le 4 sorgenti sono additive per progettazione (decisione corretta finché non si introducono pasti "alias di integratori" — cosa che il Piano V4 fa).

### 1.5 SQL diagnostiche (da eseguire nel SQL Editor Supabase)

**1A — Quanti pasti hanno la stessa "firma testuale" di un prodotto catalogo?**

```sql
-- Cerca pasti la cui description contiene il nome di un prodotto del catalogo Nutrilite/XS.
-- La description è composta come "<piatto> · <ingredienti>" (vedi acceptPianoV4DemoMeal),
-- quindi il match deve essere ILIKE sul nome catalogo.
SELECT
  m.date,
  m.slot,
  m.description AS meal_desc,
  m.kcal AS meal_kcal,
  m.protein AS meal_prot,
  c.codice,
  c.nome AS catalog_name,
  c.linea,
  c.kcal AS cat_kcal,
  c.proteine AS cat_prot
FROM meals m
JOIN nutrilite_catalog c
  ON LOWER(m.description) LIKE '%' || LOWER(c.nome) || '%'
WHERE m.user_id = '<USER_ID_IGNAZIO>'  -- sostituisci con uuid Ignazio
  AND c.linea IN ('XS Sports', 'XS', 'Bodykey', 'Nutrilite')
ORDER BY m.date DESC, m.slot
LIMIT 100;
```

**1B — Per gli stessi giorni, esiste un extra in supplements_log per lo stesso prodotto?**

```sql
-- Restituisce le coppie (giorno, prodotto) dove c'è SIA un pasto con quel nome SIA un extra
-- con lo stesso supplement_codice → candidati a doppio conteggio.
WITH meals_w_product AS (
  SELECT m.date, m.id AS meal_id, m.description, m.kcal AS meal_kcal,
         c.codice, c.nome AS catalog_name
  FROM meals m
  JOIN nutrilite_catalog c
    ON LOWER(m.description) LIKE '%' || LOWER(c.nome) || '%'
  WHERE m.user_id = '<USER_ID_IGNAZIO>'
)
SELECT
  mwp.date,
  mwp.catalog_name,
  mwp.codice,
  mwp.meal_id,
  mwp.meal_kcal,
  sl.id AS extra_id,
  sl.kcal AS extra_kcal,
  sl.dose,
  sl.dose_unit
FROM meals_w_product mwp
JOIN supplements_log sl
  ON sl.user_id = '<USER_ID_IGNAZIO>'
 AND sl.date = mwp.date
 AND sl.is_extra = true
 AND sl.supplement_codice = mwp.codice
ORDER BY mwp.date DESC;
```

Se la query 1B ritorna ≥1 riga → doppio conteggio già avvenuto nello storico Ignazio.

### Verdetto

**CONFERMATO da analisi codice**, **da quantificare con SQL 1A/1B**. Il flusso è progettato additivo, il Piano V4 introduce pasti che sono prodotti catalogo, e nessun layer intermedio fa deduplica. Esempio operativo:

- Ignazio apre Piano V4 → ACCETTA "Merenda · XS Cocco" → +195 kcal in `meals`
- Alle 17:30 va in tab Integratori → "Registra extra" → seleziona "XS High Protein Bar Cocco" → +195 kcal in `supplements_log`
- Tab Oggi mostra: 390 kcal, 30g proteine, 38g carbo, 14g grassi per UN solo evento

---

## Rischio 2 — Catalogo incompleto

### 2.1 Caricamento catalogo

[`loadCatalog()` (riga 4478)](zona-tracker.html:4478) è una `SELECT *` senza trasformazioni:

```js
async function loadCatalog() {
  const {data} = await supa.from('nutrilite_catalog').select('*').order('nome');
  ST.catalog = data || [];
}
```

Nessuna validazione, nessun warning su righe con macro NULL.

### 2.2 Fallback render card catalogo

[`_renderCatalogCardV3` (riga 14893)](zona-tracker.html:14893):

```js
const kcal = parseFloat(item.kcal) || 0;
const c = parseFloat(item.carbo) || 0;
const p = parseFloat(item.proteine) || 0;
const g = parseFloat(item.grassi) || 0;
const showMacros = (c + p + g) > 0;
let macroHTML = `<span class="catalog-v3-macro-kcal">${Math.round(kcal)} KCAL</span>`;
if(showMacros) {
  macroHTML += `... ${c}g C ... ${p}g P ... ${g}g G`;
}
```

- Se `kcal` è NULL → mostra "0 KCAL" (placeholder identico a "prodotto realmente da 0 kcal" tipo tisana)
- Se C+P+G sono tutti 0 o NULL → nasconde le 3 chip macro, ma **non c'è alcun warning visivo** del tipo "⚠ Dato nutrizionale mancante" o "ⓘ Macro non disponibili"
- L'utente non distingue "prodotto a 0 kcal" da "prodotto con macro non caricati"

### 2.3 Snapshot in registrazione extra

[`openConfirmExtraScreen` (riga 15822-15827)](zona-tracker.html:15822):

```js
kcal_base:     parseFloat(cat.kcal)     || 0,
carbo_base:    parseFloat(cat.carbo)    || 0,
proteine_base: parseFloat(cat.proteine) || 0,
grassi_base:   parseFloat(cat.grassi)   || 0,
```

Anche qui fallback `|| 0` silenzioso. Lo snapshot immutabile salvato in `supplements_log.kcal/proteine/carbo/grassi` ([`dbInsertExtraLog` riga 4567-4570](zona-tracker.html:4567)) è 0. L'utente vede il prodotto registrato in timeline (tag EXTRA, dose, nome) ma il contributo a `dayTotals()` è zero. **Bug invisibile.**

### 2.4 Lista prodotti attesi con macro reali (listino aprile 2026)

Prodotti del listino che dovrebbero avere macro non-zero (da confrontare con SQL 2A):

| Famiglia | Prodotto | kcal/dose attesi | Proteine attese |
|---|---|---|---|
| XS Sports | XS Whey Protein (qualsiasi gusto) | ~110 | ~25g |
| XS Sports | XS Hydrolyzed Whey Protein | ~180 | ~25g |
| XS Sports | XS Protein Bar Cioccolato | ~195 | ~15g |
| XS Sports | XS Protein Bar Caramello-Vaniglia | ~195 | ~15g |
| XS Sports | XS Protein Bar Cocco | ~195 | ~15g |
| XS Sports | XS Electrolyte Drink | ~30 | 0g |
| XS Sports | XS Power Drink | ~70 | 0g |
| Bodykey | Barretta Cioccolato Fondente | ~140 | ~10g |
| Bodykey | Barretta Frutti Tropicali | ~140 | ~10g |
| Bodykey | Frappé Vaniglia | ~200 | ~17g |
| Bodykey | Frappé Cioccolato | ~200 | ~17g |
| Nutrilite | All Plant Protein | ~70 | ~8g (per misurino 10g) |

### 2.5 SQL diagnostiche

**2A — Prodotti del catalogo che dovrebbero avere macro ma li hanno NULL o 0**

```sql
SELECT codice, nome, linea, categoria,
       kcal, proteine, carbo, grassi,
       dose_die, dose_unit
FROM nutrilite_catalog
WHERE (
  nome ILIKE '%protein%' OR
  nome ILIKE '%whey%' OR
  nome ILIKE '%barretta%' OR
  nome ILIKE '%bar %' OR
  nome ILIKE '%bar$' OR
  nome ILIKE '%frappé%' OR
  nome ILIKE '%frappe%' OR
  nome ILIKE '%electrolyte%' OR
  nome ILIKE '%power drink%' OR
  nome ILIKE '%plant protein%' OR
  linea ILIKE '%XS%' OR
  linea ILIKE '%bodykey%'
)
ORDER BY linea, nome;
```

Da osservare nei risultati: per ogni riga, se `kcal IS NULL` o `kcal = 0` su prodotti che dovrebbero avere macro (lista 2.4) → catalogo è incompleto su quel prodotto.

**2B — Conteggio globale gap nel catalogo**

```sql
SELECT
  COUNT(*) AS totale_prodotti,
  COUNT(*) FILTER (WHERE kcal IS NULL)        AS kcal_null,
  COUNT(*) FILTER (WHERE kcal = 0)            AS kcal_zero,
  COUNT(*) FILTER (WHERE proteine IS NULL)    AS prot_null,
  COUNT(*) FILTER (WHERE proteine = 0)        AS prot_zero,
  COUNT(*) FILTER (WHERE carbo IS NULL)       AS carbo_null,
  COUNT(*) FILTER (WHERE grassi IS NULL)      AS grassi_null,
  COUNT(*) FILTER (
    WHERE (kcal IS NULL OR kcal = 0)
      AND (linea ILIKE '%XS%' OR linea ILIKE '%bodykey%')
  ) AS xs_bodykey_senza_kcal
FROM nutrilite_catalog;
```

### Verdetto

**Confermato dal codice il fallback silenzioso `|| 0` in 3 punti**:
1. Render card catalogo (`_renderCatalogCardV3` riga 14912-14915)
2. Snapshot in openConfirmExtraScreen (riga 15823-15826)
3. Insert finale `dbInsertExtraLog` (riga 4567-4570)

**Da verificare con SQL 2A**: serve la fotografia reale del DB per sapere quante righe XS/Bodykey/Nutrilite-Protein hanno macro NULL. Se la query 2A restituisce ≥1 prodotto della lista 2.4 con `kcal IS NULL` → il bug è "shake registrato ma macro=0 silenzioso", verificabile anche dal tester che registra uno shake XS Whey e vede l'anello kcal Home invariato (controprova: la verifica base dell'utente con "extra macro registrato → totali aggiornati" è stata fatta su quale prodotto specifico? Se NON era uno shake/barretta proteica, non smentisce questo rischio).

---

## Rischio 3 — AI cieca agli integratori

### 3.1 Mappa funzioni AI

| Funzione | Riga | Scopo | Vede integratori? |
|---|---|---|---|
| `callAI(prompt, maxTokens)` | [3447](zona-tracker.html:3447) | wrapper raw verso Worker | n/a |
| `estimateMacrosLegacy(desc)` | [3484](zona-tracker.html:3484) | stima macro per descrizione pasto | n/a (input = pasto isolato) |
| `estimateMealItems(desc)` | [3497](zona-tracker.html:3497) | spezza pasto in ingredienti | n/a |
| `estimateSingleItem(name, qty, unit)` | [3531](zona-tracker.html:3531) | stima singolo ingrediente | n/a |
| **`getAdvice(consumed, nextMeal, isTomorrow)`** | [3567](zona-tracker.html:3567) | **consiglio coach next meal** | **PARZIALE** (vedi 3.2) |
| `fetchAdvice()` | [14418](zona-tracker.html:14418) | wrapper chiamato dalla UI | passa `dayTotals(d)` a `getAdvice` |
| `generaPianoAI()` | [~12906-13007](zona-tracker.html:12906) | genera piano settimanale 7 giorni | **NO** (vedi 3.3) |
| `buildCoachPrompt(exName, sessionId)` | [3468](zona-tracker.html:3468) | cue AI scheda esercizio (training) | n/a (training, fuori scope) |

### 3.2 getAdvice — verdetto PARZIALE

**Vede i totali numerici corretti** perché chiamato con `cons = dayTotals(d)` ([fetchAdvice riga 14421](zona-tracker.html:14421)), e `dayTotals` somma anche `_extrasV3Totals` + `extraSuppsTotals` + `suppTotalsForIds`. Quindi `MACRO RIMANENTI OGGI: Calorie: X / Proteine: Yg / ...` è corretto.

**MA il contesto qualitativo passato al prompt elenca solo i `meals`**, mai i `supplements_log`. [Riga 3622-3637](zona-tracker.html:3622):

```js
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
```

Nessuna sezione `INTEGRATORI ASSUNTI OGGI`. **Conseguenza pratica**: se Ignazio ha bevuto uno shake XS Whey alle 16:00 (25g proteine via `is_extra=true`), `rem.protein` scende correttamente, ma l'AI riceve solo `MACRO RIMANENTI: Proteine: 50g` senza sapere DA DOVE arriva il bilancio. Può suggerire "Ti consiglio merluzzo + verdure per le proteine rimanenti" anche se Ignazio ha appena fatto lo shake — non sbagliato sui numeri, ma sub-ottimale (l'AI dovrebbe forse suggerire un pasto a maggior contenuto di carbo se la proteina è già coperta da fonte rapida).

**Snippet prompt completo** (sections joined con `\n\n`, [riga 3656-3663](zona-tracker.html:3656)):

```
Sei un nutrizionista esperto in dieta a Zona (40-30-30).

UTENTE: Ignazio, uomo, 55 anni, 71.55kg
DIETA: pescetariano
INTOLLERANZE: lattosio
OBIETTIVO: Ricomposizione corporea
ATTIVITÀ: Attiva
NOTE SALUTE: ferritina bassa

MACRO RIMANENTI OGGI:
- Calorie: 1441 kcal
- Proteine: 50g
- Carboidrati: 105g
- Grassi: 35g

PASTI GIÀ CONSUMATI OGGI:
- colazione: Porridge avena 60g + frutti di bosco 100g + mandorle 15g
- pranzo: Salmone 150g + quinoa 70g + verdure miste 200g + EVO 10g

PROSSIMO PASTO: Merenda

Fornisci 2-3 suggerimenti CONCRETI [...]. Italiano, diretto. Max 120 parole.
```

← Nota: NESSUNA menzione del fatto che alle 16:00 c'è stato uno shake XS Whey 25g registrato come extra.

### 3.3 generaPianoAI — verdetto NO

[Prompt riga 12946-12989](zona-tracker.html:12946) — il blocco PROFILO contiene:

```
PROFILO:
- Dieta: pescetariano
- Macro target adattati: 38% carbo · 34% proteine · 28% grassi
- Calorie giornaliere OBBLIGATORIE: 2326 kcal · 198g P · 221g C · 72g G
- Escludi tassativamente: lattosio
- Note salute: ferritina bassa
```

**Nessuna sezione "INTEGRATORI ABITUALI" né "PACCHETTI UTENTE"**. Il piano genera 5 pasti/giorno per 7 giorni che DEVONO sommare il target esatto ±50 kcal, come se l'utente non assumesse mai shake/barrette. Se nella realtà Ignazio ha un pacchetto pomeriggio "XS Whey 25g + barretta XS 50g" che vale 305 kcal/30g P/19g C/11g G abituali, il piano AI non lo sa e dimensiona il pranzo+merenda+cena come se tutto dovesse arrivare da alimenti naturali.

Nota collaterale: il Piano V4 demo bypassa questo problema hardcodando alcuni pasti con prodotti XS (es. `demo-4`, `alt-mere-1`, ecc.), ma è un fix cosmetico — il Worker AI vero in Step F erediterà il problema se il prompt non viene esteso.

### 3.4 Altre chiamate `callAI` viste durante l'audit (fuori scope nutrition)

- [riga 6845](zona-tracker.html:6845) e [13468](zona-tracker.html:13468): cue AI scheda esercizio (training), usano `buildCoachPrompt`. Niente nutrition.
- [riga 7196](zona-tracker.html:7196): `suggestProgressionAI` per Training. Niente nutrition.
- `estimateMealItems` e `estimateSingleItem`: stimano macro per descrizione pasto isolata. Niente integratori.

### Verdetto

- `getAdvice`: PARZIALE — totali OK, contesto qualitativo manca degli integratori
- `generaPianoAI`: NO — prompt dimensiona target come se l'utente non assumesse mai integratori abituali
- Tutte le altre `callAI` sono fuori scope (training)

Fix minimo per `getAdvice`: aggiungere blocco `INTEGRATORI ASSUNTI OGGI` parallelo a `PASTI GIÀ CONSUMATI OGGI`, leggendo da `ST.extras` (per Step 2 Integratori) + `day.suppsTaken` mappato su nomi via `ST.supps` + opzionalmente `day.rawSuppLogs`.

Fix per `generaPianoAI`: estendere blocco PROFILO con sezione "INTEGRATORI ABITUALI" derivata da `ST.packages` (pacchetti standard utente) → istruzione AI tipo "considera che l'utente assume abitualmente questi integratori, NON sostituirli con pasti che ne replichino l'apporto proteico/calorico, ma usali come parte del bilancio giornaliero". Cantiere più consistente.

---

## Raccomandazione operativa

| Rischio | Stato | Stima fix | Priorità |
|---|---|---|---|
| 1 — Doppio conteggio | Confermato | Cantiere (1 sessione minimo) — serve decidere strategia: dedup runtime in `dayTotals`, oppure flag `meals.source='from_supplement'` + esclusione, oppure UX warning "Hai già registrato XS Cocco come pasto oggi, vuoi davvero aggiungerlo come extra?" | **ALTA** — bug data integrity, può falsare percezione tester sulla "zona" |
| 2 — Catalogo incompleto | Da verificare con SQL 2A | Se gap su pochi prodotti (≤5): UPDATE manuali su `nutrilite_catalog` (15 min). Se gap esteso: rivedere processo sync Google Sheet → tabella (1 sessione). | **ALTA condizionata** — diventa ALTA se SQL 2A conferma gap su shake/barrette principali |
| 3 — AI cieca | Confermato | `getAdvice` fix piccolo (~30 min, aggiungere blocco `INTEGRATORI ASSUNTI OGGI` parallelo a `PASTI GIÀ CONSUMATI`). `generaPianoAI` cantiere (1 sessione: estendere PROFILO prompt + testare 2-3 piani su utenti diversi). | **MEDIA** — non corrompe dati, peggiora qualità consigli |

### Quale sbloccare prima per non bloccare Step D / F?

1. **Eseguire SQL 2A subito** (5 min): se il catalogo è OK per i prodotti chiave, Rischio 2 è chiuso e ci concentriamo su 1+3.
2. **Decidere strategia Rischio 1 prima di Step F**: lo Step F (Worker AI cron + writer `weekly_plan_meals` → `meals`) erediterà il problema su scala settimanale (7 giorni × eventuali prodotti catalogo). Mini-sessione di design dedicata (anche solo 30 min) per scegliere fra dedup runtime, flag DB, o UX warning. **Bloccante per Step F.**
3. **Fix `getAdvice` (Rischio 3 parte 1)** può andare nello Step D stesso, è una modifica isolata di ~20 righe nel prompt builder. Test rapido con uno shake registrato.
4. **Fix `generaPianoAI` (Rischio 3 parte 2)** va inserito nello Step F (dove tocchiamo già il prompt engineering del piano AI). Non bloccante per Step D.

**Ordine consigliato**: SQL 2A → mini-design Rischio 1 → Step D (con fix getAdvice incluso) → Step F (con fix piano AI incluso) → eventuali backfill catalogo se 2A rivela gap.

---

## Note collaterali (fuori scope, ma rilevate durante audit)

- **Storico legacy**: `extraSuppsTotals` (riga 3369) — il path legacy `day.rawSuppLogs` ha una propria logica di dedup ("filtra i nomi NON in `ST.supps`") che è scollegata da `_extrasV3Totals`. Se uno stesso prodotto è sia in `ST.supps` (registrato come pacchetto standard) sia loggato come extra V3 in `ST.extras`, NON c'è collisione perché alimentano colonne diverse, ma vale la pena verificare nello stesso esercizio diagnostico futuro.
- **`rawSuppLogs` caricato solo per `ST.activeDay`**: significa che `dayTotals` chiamato su giorni passati (es. drilldown Analisi v3 → Dettaglio Giorno) NON include il contributo extras V3 dei giorni passati. Già documentato in CLAUDE.md sezione "Analisi v3", ma vale la pena ricontrollarlo: i giorni storici nella heatmap zona potrebbero apparire più "fuori zona" di quanto erano realmente per i giorni con tanti extras.
- **Snapshot extras non aggiornato**: gli extras salvano lo snapshot macro al momento dell'insert. Se un domani il catalogo viene corretto (es. XS Whey passa da kcal NULL → 110), gli extras già registrati con `kcal=0` restano a 0. Decisione architetturale corretta (storico onesto), ma se ora il catalogo è bucato e l'utente registra extras, il giorno "rimane bucato" anche dopo un eventuale fix DB. → considerare uno script una-tantum di rewrite per gli extras passati post-fix catalogo.
