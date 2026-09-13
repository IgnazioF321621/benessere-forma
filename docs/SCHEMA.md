# Schema Supabase — Zona Tracker

*Tabelle, colonne e vincoli. Si apre quando si scrive una query o si aggiunge un campo.*

Staccato da [`CLAUDE.md`](../CLAUDE.md) il 13 settembre 2026, per alleggerire il file che viene letto a ogni sessione. **Il contenuto non è cambiato di una parola**: le regole vincolanti sono rimaste in `CLAUDE.md`, il dettaglio operativo sta qui.

---

### `profiles`
PK = `id` (= `auth.users.id`).

Campi chiave: `first_name, last_name, age, sex (M/F/O), height_cm, weight_kg, goal_weight_kg, target_kcal/protein/carbs/fat, obiettivo (CSV 6 chiavi OBJ_ADAPT), dieta, intolleranze (text[]), activity_level, train_start_date, usa_training (bool default true), tipo_allenamento, attrezzatura (text[]), giorni_allenamento (int), durata_sessione (int), note_salute (serializza esperienza+limitazioni — no colonne dedicate), plan_generation_day (CHECK fri/sat/sun only), plan_generation_time (HH:MM), weight_tracking_mode (daily/every3/weekly/flexible)`.

⚠️ `obiettivo`/`dieta`/`intolleranze` anche in `localStorage` (`zt_prefs_<userId>`) — `applyLocalPrefs()` sovrascrive dopo ogni `applyProfile()`.

### `meals`
`id, user_id, date, time (HH:MM), slot, description` (nome autoritativo — non esiste `name` o `food_name`), `kcal numeric(6,1), protein/carbs/fat numeric(5,1), notes`.

### `esercizi_catalog`
**725 righe** (31 agosto 2026). Gap permanenti: EX107/EX151/EX170/EX528 · EX110/EX228/EX229/EX323 (consolidamenti del 6 agosto) · EX139/EX176/EX178 (fusioni del 21 agosto: stessa GIF di EX184/EX021/EX042) · **EX322** (22 agosto: nome duplicato di EX039, blocco surrogato travasato prima di eliminarla) · **EX408** (23 agosto: consolidato in EX057, stessa GIF e stessa posizione sul fianco, i gradi non si scrivono più) — **mai renumerare**. Nessun codice libero sotto il massimo. Prossimo libero: **EX739**. RLS SELECT pubblica. PK logica = `codice`.

**Fonte: Google Sheet → Apps Script "ZonaTracker-Sync-Esercizi (v3)" → Supabase upsert. Mai editare Supabase direttamente. Il sync non elimina: le righe da eliminare vanno cancellate a mano nel Sheet prima del sync.**

**Dopo ogni sync si lancia `verifica_sync.py`** — stana righe arenate, valori riportati indietro e catene rotte in un colpo solo, confrontando il vivo contro `docs/STATO.json`:

```bash
python3 tools/biblioteca-nomi/verifica_sync.py && python3 tools/biblioteca-nomi/stato.py
```

Tre trappole del sync, tutte già costate giri a vuoto:
- ⚠️ **Una riga tolta dal foglio non sparisce: si arena.** Si riconosce dall'`updated_at` più vecchio dell'ultimo lotto. È l'**unico** caso in cui cancellare direttamente da Supabase è sicuro → [L3](LEZIONI.md#l3--una-riga-tolta-dal-foglio-non-sparisce-si-arena)
- ⚠️ **Il sync riporta indietro ciò che il foglio non ha.** Dopo ogni sync verificare anche i codici toccati nei passi precedenti, non solo quelli nuovi → [L4](LEZIONI.md#l4--il-sync-riporta-indietro-ciò-che-il-foglio-non-ha)
- ⚠️ **Rimisurare la baseline dei pool dopo ogni sync**, non solo dopo le modifiche al codice → [L17](LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice)

**Colonne: 23, nell'ordine fisico della tabella** (riletto dal vivo il 20 agosto 2026):

`codice, nome, pattern, attrezzo, luogo, muscoli, livello, zone_rischio, adattamento, alternativa, setup, esecuzione, errori, nota_sicurezza, updated_at, uso, surrogato_attrezzo, nota_surrogato, gruppo_target, esecuzione_surrogato, errori_surrogato, gif_slug, nome_en`

- **`gif_slug` è portante**: è il primo anello della catena `gif_slug → biblioteca_gif.slug → storage_path → file`. Fino al 20 agosto mancava da questo elenco, ed è la colonna che si scrive a ogni migrazione.
- `updated_at` la scrive il sync: serve a riconoscere le righe arenate → [L3](LEZIONI.md#l3--una-riga-tolta-dal-foglio-non-sparisce-si-arena).
- `nome_en` ⚠️ **DEPRECATA dal 19/07/2026** — non portante, non usarla per slug/filename/UI.

⚠️ **Questo è l'ordine della tabella, non quello del foglio, e i due non coincidono per forza.** Non è una lista da cui costruire un TSV posizionale: prima di generarne uno, farsi dare la riga di intestazione del foglio e confrontarla → [L5](LEZIONI.md#l5--un-tsv-senza-intestazione-non-è-verificabile-da-nessuno). Per poche celle la forma sicura non è il TSV ma l'elenco `codice · colonna · valore`.

- `uso` valori: `principale / finisher / recupero / riscaldamento / mobilita / carry / skill`
- `uso: skill` — skill ginnastica (EX570/573/574/575): **escluse dalla generazione automatica**
- `pattern` normalizzato via `_normPattern()` (lowercase + trim)
- `gruppo_target` vocabolario chiuso — **non dedurre da `muscoli`** (testo libero, vocabolario diverso)
- `alternativa` contiene codici `EX###` in chiaro, nessuna FK: prima di eliminare un codice, scansionare tutti i campi testuali con regex `\bEX\d{3}\b`

Regole `surrogato_attrezzo`: token puliti separati da `+` (vocabolario chiuso: `elastico, manubri, panca, sbarra, fitball, kettlebell, maniglie, trx, cavigliera, barra, bilanciere, corpo libero`). MAI testo libero, MAI alternative con "o". `manubri` sempre plurale. Congruenza obbligatoria con `nota/esecuzione/errori_surrogato`. **302 righe su 725** ne hanno uno *(rimisurato il 31 agosto)*, `elastico` in 280.

⚠️ **Due modi di sbagliare il campo, entrambi silenziosi.** Un surrogato uguale all'attrezzo nativo (`attrezzo = manubri`, `surrogato = manubri`) non apre niente e in più fa passare il **filtro `luogo`**, che guarda solo se il campo è popolato: l'esercizio entra a casa senza avere una versione casalinga. Un surrogato dichiarato **senza `nota_surrogato`** è peggio: `_trainGenMapToSession` sostituisce il `setup` con la nota solo se c'è, e senza cade sul setup nativo — la scheda mostra l'attrezzo surrogato e le istruzioni dell'attrezzo vero.

### `schede_utente`
`id, user_id, blocco_n int, scheda jsonb, attiva bool`. UNIQUE PARTIAL su `(user_id) WHERE attiva=true`. I `name` nel jsonb sono snapshot alla generazione: il loader li riallinea a runtime dal catalogo via Map codice→nome — il jsonb non si riscrive mai. Fallback su `TRAINING_SESSIONS` hardcoded se nessuna scheda.

### `biblioteca_gif`
**1.601 righe** (31 agosto 2026): 661 vive, 0 rotte, 22 libere, **918 morte** (cantiere 3E). Le libere calano a ogni zona che si chiude: le ultime 18 sono le calisthenics di Schiena e Trapezio diventate EX721-EX738. Le 21 righe doppie di Spalle e Cuffia e la riga morta di EX408 sono state cancellate il 23 agosto, dopo il secondo sync e dopo aver verificato che i 53 codici della zona risolvessero tutti. Le 918 morte hanno tutte `storage_path` in una cartella legacy (`muscolazione` 665 · `stretching` 135 · `calisthenics` 118) e **nessuna è puntata da un codice**. Conteggi sempre aggiornati in [`STATO.md`](STATO.md). Colonne: `slug, nome_italiano, nome_originale, categoria, gruppo_muscolare, storage_path, storage_url`. `slug` = `gif_slug` del catalogo.

Bucket Storage `biblioteca-gif`: **686 oggetti in 9 cartelle** (misurato 31 agosto), **3 file senza riga**, tutti e tre in Addominali e Core (`Crunch farfalla toe touch`, `Plank frontale`, `Plank su fitball`): hanno cache immutabile e impronta determinabile, nessun codice li punta, e vanno guardati col cantiere di quella zona. Le 9 cartelle: Addominali e Core · Bicipiti e Braccia · Cardio e Conditioning · Gambe e Glutei · Pettorali · Polpacci · Schiena e Trapezio · Spalle e Cuffia · Tricipiti. Cartelle legacy eliminate il 18/07/2026.

**`categoria` non ha convenzione unica tra zone** — leggere sempre quale usa la zona di destinazione prima di scrivere. Pettorali → nome della zona; Schiena e Trapezio → pattern di movimento (`tirata orizzontale` · `tirata verticale` · `isolamento`), il nome della zona non compare. `storage_path` invece è sempre univoco per zona ed è il riferimento affidabile.

**`Cardio e Conditioning` è una zona di capacità, non muscolare**: raccoglie gli esercizi il cui stimolo non è isolabile su un gruppo muscolare. Le altre 8 restano zone muscolari.

### `training_logs`
`id, user_id, date, session_id, exercise_name, set_number, reps, resistance, rir_actual, notes`. Stato: 912 righe, divergenza 0, doppioni 0 (bonificato 17 luglio).

### `weekly_plans`
`id, user_id, week_start, target_kcal/protein/carbs/fat, ai_reasoning, status (draft/active/archived)`. UNIQUE `(user_id, week_start)`. `plan_generation_day` CHECK: solo `'fri'/'sat'/'sun'`.

### `weekly_plan_meals`
`id, plan_id→weekly_plans CASCADE, user_id, day_of_week (1-7), slot, description, ingredients jsonb, meal_time, kcal/protein/carbs/fat, ai_explanation, sort_order`.

### Altre tabelle
`weekly_pictures (user_id+week_start UNIQUE, picture jsonb, computed_at — storico del [Quadro settimanale](COACH.md#quadro-settimanale))` · `coach_proposals (user_id+week_start+kind UNIQUE, kind, title, reason, evidence jsonb, change jsonb, status pending/accepted/rejected/expired, decided_at, applied_at — RLS: l'utente legge, inserisce solo pending, aggiorna solo status/decided_at/applied_at: [Pirsi propone](COACH.md#pirsi-propone))` · `body_check_ai (check_id UNIQUE, previous_check_id, model, result jsonb, confidence bassa/media/alta, created_at — RLS solo SELECT sulle proprie righe, scrive il Worker: [Lettura AI dei check](COACH.md#lettura-ai-dei-check))` · `body_check_photos (check_id, pose front/right/left/back — quattro, nessun side —, storage_path nel bucket privato body-check-photos)` · `workouts (date, session_type, completed — fonte del calendario e della rotazione; rest/rest_injury inclusi)` · `blood_tests (test_date + hemoglobin, ferritin, glucose, cholesterol_tot, hdl, triglycerides, creatinine, alt, vitamin_d, vitamin_b12, tsh — nessun intervallo di riferimento a schema: etichette e unità in `BLOOD_FIELDS`, [cantiere 32](CANTIERI.md#32-intervalli-di-riferimento-degli-esami-del-sangue))` · `body_checks (status in_progress/completed)` · `body_measurements (check_id)` · `body_logs (weight_kg, waist_cm, bf_pct, muscle_kg, visceral_fat, hip/chest/bicep_cm, body_age — no UNIQUE)` · `weight_logs (UNIQUE user_id+date)` · `supplements_log (UNIQUE user_id+date+supplement_name, is_extra, snapshot macro)` · `supplement_packages + supplement_package_items (UNIQUE package_id+supplement_id)` · `ai_memory (category, content, confidence, evidence_count, last_observed, active)` · `weekly_plan_acceptance (plan_meal_id→CASCADE, status, actual_meal_id→SET NULL — UNIQUE plan_meal_id)` · `nutrilite_catalog (64 prodotti, SELECT pubblica)` · `fasting_days, supplements, workout_sets`.

---

