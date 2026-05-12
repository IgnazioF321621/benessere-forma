# Zona Tracker

App wellness single-file HTML, hostata su GitHub Pages.

## File principale

`zona-tracker.html` — tutta l'app è in questo unico file (HTML + CSS + JS).
`auth-callback.html` — pagina di callback per il login (usata come fallback per browser esterni).

## URL pubblico

https://ignaziof321621.github.io/benessere-forma/zona-tracker.html

## Repository

https://github.com/IgnazioF321621/benessere-forma

## Stack tecnico

- HTML/CSS/JavaScript puro
- Nessun framework, nessun build step
- File principali: `zona-tracker.html`, `auth-callback.html`, `dashboardzona.html` (admin)

## Priorità correnti

1. ~~Admin panel~~ ✅ completato 11 mag 2026 — `dashboardzona.html`, vedi sezione "Admin panel"
2. Testing iPhone + Android con 3 tester → **IN CORSO** (messaggi WhatsApp inviati 11 mag 2026)
3. Test mode `?test=1`
4. Food input multi-modale — Fase 0 refactor + Fase 1 barcode
5. Food input multi-modale — Fase 2 foto AI + Fase 3 OCR etichetta

## Tester attivi

- **Ignazio** (utente principale + dev) — iPhone + Android
- **Ginevra** — iPhone e/o iPad
- **Isabella** — Android + iPad (variante pescetariana)

Messaggio WhatsApp inviato 11 mag 2026 a Ginevra e Isabella per riattivazione con richiesta di costanza nei log e feedback strutturato per 2 settimane.

## Stato attuale

11 mag 2026: introdotti admin panel (`dashboardzona.html`) e logica residua kcal/macro nel modulo Nutrition. App pronta per testing con 3 tester (Ignazio + Ginevra + Isabella). Prossimi step in attesa di feedback tester.

## Idee emerse fuori roadmap

- **Food input multi-modale** (foto piatto AI + barcode + OCR etichetta) — roadmap visiva completa già discussa, da implementare dopo testing tester.
- **Logica residua kcal/macro** — ✅ implementata 11 mag 2026 (commit `5c93494` + `a4b4152`).

## Servizi esterni

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignaziof23.workers.dev` | Proxy verso Groq API (llama-3.3-70b-versatile) |
| Supabase | `https://qxiyeiahpoiliwpqslpr.supabase.co` | Database + Auth |

### Free tier limits dei servizi usati (verificati maggio 2026)

**Supabase Free Plan**
- Database: 500 MB
- File storage: 1 GB
- Bandwidth (egress): 5 GB/mese
- Utenti attivi: 50.000/mese
- Edge Functions: 500.000 invocations/mese
- Max progetti free: 2 per organizzazione
- Pause dopo 7 giorni inattività (si sveglia al primo accesso)
- Uso commerciale consentito sul free tier
- Upgrade a Pro: $25/mese (8 GB DB, 100K MAU, 100 GB storage, no pause, backup 7 giorni)

**Cloudflare Workers Free Plan**
- 100.000 requests/giorno
- 10ms CPU/request
- KV storage incluso
- Workers AI: 10.000 Neurons/giorno (~5.000-10.000 generazioni immagini con Stable Diffusion)
- Forever free, no scadenza, uso commerciale OK

**Groq Free Tier**
- `llama-3.3-70b-versatile` (modello attualmente usato): 30 RPM / 6.000 TPM / 1.000 RPD
- `llama-3.1-8b-instant`: 14.400 RPD (10x più permissivo)
- Solo text generation, no image generation
- Reset al midnight UTC
- Per image generation usare Cloudflare Workers AI

## Autenticazione

**Metodo attuale: OTP a 6 cifre via email** ✅ migrazione completata aprile 2026

Migrazione Magic Link → OTP completata aprile 2026:
- Commit principale `1bada62` — `feat: login OTP a 6 cifre — addio Magic Link, funziona in PWA su iOS/Android/tutti`
- Fix successivo `364dd83` — `fix: OTP accetta 6-8 cifre, rimuove limite rigido a 6`

Flusso:
1. Utente inserisce email → `signInWithOtp({ email, options: { shouldCreateUser: true } })`
2. Supabase invia email con codice a 6 cifre (NON un link)
3. Utente inserisce il codice nella PWA → `verifyOtp({ email, token, type: 'email' })`
4. Login completato direttamente nella PWA, senza uscire dall'app ✅

**Residui Magic Link non ancora puliti** (rete di sicurezza fino a validazione tester — vedi task in "Prossimi step"):
- Fallback `verifyOtp({type:'magiclink'})` in `verifyOTP()` a [zona-tracker.html:1693](zona-tracker.html:1693) — non attivato in pratica
- Branch bootstrap hash `#access_token` ([zona-tracker.html:8569](zona-tracker.html:8569)) e PKCE `?code=` ([zona-tracker.html:8587](zona-tracker.html:8587)) — usati solo da callback browser esterno
- `auth-callback.html` — rimane nel repo come fallback storico
- Commento obsoleto a [zona-tracker.html:8626](zona-tracker.html:8626) ("Magic Link in Safari")

**Rate limit Supabase:** durante i test intensivi si può raggiungere il limite OTP. Aspettare 1 ora per il reset.

## Admin panel (`dashboardzona.html`)

File separato per il monitoraggio in tempo reale dei tester. Solo lettura — nessuna modifica/cancellazione dati Supabase.

**URL pubblico:** https://ignaziof321621.github.io/benessere-forma/dashboardzona.html

**Accesso**
- Auth Supabase OTP a 6 cifre (riusa stesso flusso e stesso client di `zona-tracker.html`)
- Email gate: solo `ignazio.f@me.com` può procedere oltre il login. Altre email → schermata "Accesso non autorizzato" + logout.
- `signInWithOtp` chiamato con `shouldCreateUser: false` (l'admin non crea utenti).

**Funzioni implementate**

Schermata 1 — Home dashboard:
- "Oggi": stat tiles con N° utenti attivi oggi, N° pasti totali oggi, N° integratori totali oggi
- "Tester": lista cliccabile di tutti gli utenti in `profiles`, ordinata per ultimo accesso (più recente in cima). Pallino verde (≤2h), ambra (oggi non recente), grigio (inattivo). Riepilogo "X pasti oggi · ultimo accesso Y fa".
- "Uso moduli (ultimi 7 giorni)": bar chart CSS pure con % giorni distinti con almeno 1 log nel periodo. Modulo Training letto da `workouts`. Modulo Body letto da `body_logs`. Fallback "nessun dato" se la tabella è vuota o non accessibile.
- Bottone "Aggiorna" + timestamp ultima sincronizzazione.

Schermata 2 — Dettaglio utente:
- Profilo: dieta, obiettivo, sesso, età, altezza, peso, peso obiettivo, attività, inizio training, intolleranze (tags), note salute, ultimo accesso (in italiano: "2 ore fa" / "ieri" / "3 giorni fa")
- Card Calorie oggi nel dettaglio utente (consumate vs `target_kcal` con barra progresso) + macro (proteine/carbo/grassi) con barre individuali, formattazione numeri italiana
- Bar chart pasti ultimi 7 giorni (etichette Lun/Mar/... con giorno corrente evidenziato)
- Ultimi 10 pasti: ora · slot · descrizione · kcal
- Ultimi 10 integratori: ora · slot · nome
- "← Torna" per tornare alla home.

**Stack tecnico admin**
- HTML/CSS/JS vanilla single-file, niente framework, niente build step
- Stesso Supabase client JS (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`)
- Font system-ui (no Syne/JetBrains — stile pragmatico admin)
- Palette neutra: sfondo bianco `#FFFFFF`, ink `#1A1A1A`, ink-soft `#666666`, line `#E5E5E5`, verde attivo `#16A34A`, ambra `#D97706`, rosso `#DC2626`
- Mobile-first responsive (max-width 920px desktop). Touch target ≥44px.

**Sicurezza**
- Nessuna `.insert()`, `.update()`, `.delete()` su tabelle dati nel codice admin (solo `.signOut()` su auth)
- Email check `user.email !== ADMIN_EMAIL` → unauthorized screen + logout. Hardcoded `ADMIN_EMAIL = 'ignazio.f@me.com'`.
- Anon key Supabase identica a `zona-tracker.html` (chiave pubblica, sicura da esporre — la sicurezza dipende dalle policy RLS).

**Schema `profiles`**: PK = `id` (coincide con `auth.users.id`), non `user_id`. Altre tabelle dati (`meals`, `supplements_log`, `workouts`, `body_logs`, `training_logs`, `supplements`, `fasting_days`) usano FK `user_id`.

**⚠️ RLS Supabase — policy admin necessarie**

Le policy attuali (`auth.uid() = user_id` su tutte le tabelle) permettono a Ignazio di vedere solo i propri dati. Per leggere i dati di Ginevra e Isabella servono policy aggiuntive admin. Da eseguire in Supabase SQL Editor:

```sql
-- profiles
CREATE POLICY "admin_read_all_profiles"
ON public.profiles FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- meals
CREATE POLICY "admin_read_all_meals"
ON public.meals FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- supplements_log
CREATE POLICY "admin_read_all_supplements_log"
ON public.supplements_log FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- workouts
CREATE POLICY "admin_read_all_workouts"
ON public.workouts FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- body_logs
CREATE POLICY "admin_read_all_body_logs"
ON public.body_logs FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');
```

Finché queste policy non sono in Supabase, l'admin vede solo i dati di Ignazio (le altre row sono filtrate via RLS). La schermata mostrerà un solo tester e i contatori "oggi" risulteranno bassi.

**Cosa NON è implementato** (volutamente fuori scope di questa fase):
- Tracking dell'effettivo "login" utente (Supabase non espone `last_sign_in_at` via client SDK con anon key) — `ultimo accesso` è approssimato dal max timestamp tra `meals` / `supplements_log` / `workouts` / `body_logs`.
- Lettura email tester diversi da Ignazio — l'email è in `auth.users`, non accessibile via anon key. Il nome utente è derivato da `profiles.name` / `full_name` / `first_name` se presente, altrimenti `Utente <uuid-corto>`.
- Cross-tab refresh automatico, notifiche push admin
- Export dati / report CSV
- Filtri per range temporale custom (fisso a oggi + ultimi 7 giorni)

## Bootstrap auth (`zona-tracker.html`)

Il bootstrap (in fondo al file, dentro `setTimeout(..., 1800)`) gestisce questi casi in ordine:
1. `?test=1` → modalità test locale
2. Hash con `#access_token=...&refresh_token=...` → flusso implicito
3. Query param `?code=...` → flusso PKCE
4. `getSession()` → sessione esistente
5. Nessuna sessione → mostra schermata auth
6. `onAuthStateChange` → ascolta eventi SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
7. `visibilitychange` → polling sessione quando la PWA torna in foreground + **re-fetch dati cross-device** se utente loggato e throttle 30s superato (vedi `ST.lastRefreshAt` e `refreshInBackground`)

## Schema Supabase

### Tabella `meals`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | YYYY-MM-DD |
| `time` | `text` | HH:MM |
| `slot` | `text` | colazione / pranzo / cena / snack |
| `description` | `text` NOT NULL | |
| `kcal` | `integer` | stimato AI |
| `protein / carbs / fat` | `integer` | grammi |
| `notes` | `text` | nullable |

RLS abilitata — policy: `auth.uid() = user_id`.

### Tabella `nutrilite_catalog`
25 prodotti Nutrilite pre-inseriti. RLS SELECT pubblica. Nessun `user_id`.

### Tabella `profiles`
Dati utente: `height_cm`, `weight_kg`, `goal_weight_kg`, `target_kcal/protein/carbs/fat`, `sex`, `age`, `activity_level`, `train_start_date` (opzionale).

### Tabella `supplements`
Integratori per user_id, editabili inline.

### Tabella `supplements_log`
Tracciamento assunzioni giornaliere per data e nome integratore.
UNIQUE constraint su `(user_id, date, supplement_name)` — aggiunto aprile 2026 dopo cleanup duplicati.

### Tabella `fasting_days`
Giorni di digiuno per user_id.

### Tabella `training_logs` (aprile 2026)
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | |
| `session_id` | `text` | upperA / upperB / lowerA / lowerB / recovery |
| `exercise_name` | `text` | |
| `set_number` | `integer` | |
| `reps` | `integer` | |
| `resistance` | `text` | es. "elastico 20lbs" |
| `rir_actual` | `integer` | |
| `notes` | `text` | |

RLS abilitata — policy: `auth.uid() = user_id`.

### Tabella `body_logs` (aprile 2026)
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | |
| `weight_kg` | `numeric(5,2)` | |
| `waist_cm` | `numeric(5,1)` | girovita — obiettivo 89→85 cm |
| `bf_pct` | `numeric(4,1)` | body fat % |
| `muscle_kg` | `numeric(5,2)` | da bilancia smart |
| `visceral_fat` | `numeric(4,1)` | da bilancia smart |
| `hip_cm` | `numeric(5,1)` | fianchi |
| `chest_cm` | `numeric(5,1)` | petto |
| `bicep_cm` | `numeric(4,1)` | bicipite |
| `body_age` | `integer` | età corporea da bilancia smart |
| `notes` | `text` | |

RLS abilitata — policy: `auth.uid() = user_id`.

## Navigazione — struttura attuale (aprile 2026)

| Tab | ID pagina | Contenuto |
|---|---|---|
| 🏠 Home | `home` | Dashboard: ring kcal + 3 tile modulo live |
| 🌿 Nutrition | `oggi` | Sub-nav: Oggi / Integratori / Storico / Piano |
| ⚡ Training | `training` | Sub-nav: Sessione / Piano / Progressione — **visibile solo se `train_start_date` impostata** |
| ◐ Body | `body` | Sub-nav: Misure / Tendenza |

**Implementazione:**
- Bottom nav mobile 4 voci (SVG outline/filled)
- Top nav desktop 4 voci (emoji)
- `showPage(id)` — navigazione centrale (redirect a Home se Training non abilitato)
- `renderPage(id)` — dispatch alle render functions
- `hasTraining()` — gate: `!!ST.profile.train_start_date`
- `updateTrainingNav()` — mostra/nasconde tab Training in top e bottom nav
- Al login l'app apre direttamente Home

## Funzionalità implementate

### Auth
- OTP a 6 cifre via email (schermata 2 step: email → codice)
- Onboarding 5 step per nuovi utenti → calcolo TDEE automatico (Mifflin-St Jeor); step obiettivo con **6 pill** (chiavi `OBJ_ADAPT`)
- Modal impostazioni profilo con esami del sangue; selezione obiettivo tramite **griglia 6 pill** (non più `<select>`)
- Modal peso con ricalcolo TDEE

### Home
- Ring calorie SVG con colore zona
- Barre macro (P/C/G)
- Tile modulo live (Training visibile solo se `train_start_date` impostata):
  - **Nutrition**: kcal, macro, stato zona — cliccabile → Oggi
  - **Training**: prossima sessione / ultima completata / "Inizia [data]" se start futura — badge ✓ FATTO o Inizia→ con streak ⚡ — cliccabile → Training
  - **Body**: peso live, trend, vita cm — cliccabile → Body

### Nutrition (sub-nav: Oggi / Integratori / Storico / Piano)
- **Oggi**: hero ring, macro bars, timeline pasti+integratori, log pasto AI, badge zona, badge Giorno Perfetto; ogni pasto ha pulsante ✏️ modifica e 🗑️ elimina (solo desktop — su mobile solo swipe); ogni gruppo integratori ha pulsante × per eliminare il gruppo intero
- **Integratori**: lista raggruppata per orario, editing inline, catalogo Nutrilite
- **Storico**: report 7/14/30 giorni, grafico calorie
- **Piano**: target 40·30·30, piano AI, priorità cliniche
- **Visualizzazione kcal/macro: logica residua** (kcal e macro rimasti invece di accumulativi). Applicata a 3 zone: anello+barre macro nella Home card riepilogo, tile Nutrition nei moduli Home, hero card Nutrition/Oggi. Anello si svuota anziché riempirsi. Stato "oltre target" usa colore ambra `#B45309`. Stato "target esatto" mostra "target raggiunto". Helper globali: `fmtNum`, `kcalRimaste`, `macroRimasti`, `isOverTarget`, costante `OVER_COLOR`. Piano/Storico/Integratori restano accumulativi.
- **Barre macro**: visualizzazione residua coerente con anello kcal (parte 100% piena, si svuota man mano che si consuma).
- **Pill Zona**: una sola pill per macro-area visiva. Home card → pill in alto a destra. Home tile Nutrition → pill laterale "ZONA"/"FUORI ZONA"/"—" (rimosso vecchio "OFF 40·30·30"). Hero card Nutrition/Oggi → pill in basso nella riga `zonaRowHTML` sotto le 3 cards macro (rimossa duplicazione dal centro anello). Timeline pasti → pill per pasto invariata.

### Training (sub-nav: Sessione / Piano / Progressione)
- **Sessione**:
  - Lista sessioni: Upper A/B (Forza/Ipertrofia), Lower A/B, Active Recovery
  - Dettaglio sessione: blocco attivazione 5 min + esercizi con campo `note` in corsivo
  - Pulsante **▶** su ogni esercizio → apre modal scheda AI (`openExerciseAI`)
  - Log serie inline per ogni esercizio: reps + resistenza + RIR → salva su `training_logs`
  - Badge S1/S2/... su card dopo il log, ✓ DONE quando tutte le serie completate
  - Info icon ⓘ su badge RIR (→ `showInfoModal('rir')`) e su serie (→ `showInfoModal('serie')`)
  - Modal recupero (dopo log serie): countdown + suggerimento progressione + esecuzione/errori/coach + **toggle "▶ Mostra esecuzione"** opzionale (GIF Worker, 9 maggio 2026)
- **Programma** (label tab rinominato 8 maggio 2026, id `piano` per back-compat):
  - Split settimanale con giorni numerici G1–G6 (rotazione 6 giorni, dopo G6 → G1)
  - Ciclo 4 settimane (CARICO × 3 + SCARICO × 1). Settimana corrente calcolata su workout completati (1 settimana = 6 workout veri, riposi esclusi)
  - Progressione doppia: 3 step + esempio pratico
  - Info icon ⓘ su "CICLO 4 SETTIMANE" e "PROGRESSIONE DOPPIA"
  - Riposo extra opzionale: 2 card separate (🌙 scelto / 🩹 infortunio con prompt zona corpo)
- **Progressione** (rifatta 9 maggio 2026):
  - Calendario mensile in cima (sigle workout, stats sessioni/streak/freq)
  - Tap su giorno calendario → modal **Dettaglio giorno** (lista esercizi + serie con matita/cestino + bottone "Elimina intero workout")
  - **Dropdown selezione esercizio** full-width (sostituisce vecchia chip-row): bottone trigger + pannello con search bar + 2 tab (Per programma / Per esercizio) + lista alfabetica
  - Default selection: primo esercizio alfabetico tra quelli loggati (auto al caricamento tab)
  - **Grafico SVG vanilla** per esercizio selezionato: barre se ≤8 sessioni, linea+dots se >8. Tap su punto → modal Dettaglio giorno filtrato
  - 3 chip toggle metrica sopra grafico: **Peso** (default) / Reps / Volume (Tempo invece di Reps/Volume per esercizi `iso:true` temporali)
  - 3 stat card sotto grafico: Best peso, Best reps/tempo, Ultimo (data + valore metrica)
  - Edit/delete singola serie da modal Dettaglio giorno → refresh automatico grafico

### Body (sub-nav: Misure / Tendenza)
- **Misure**:
  - Hero peso attuale + trend vs misura precedente
  - Barra progress obiettivo peso (oldest log → goal)
  - Barra progress vita (89 → 85 cm)
  - Griglia composizione inline (BMI, BF%, massa magra/grassa, grasso viscerale, body age) — visibile solo se dati presenti
  - Form log base: Peso / Vita
  - Form log avanzato (collapsible): BF% / Massa muscolare / Grasso viscerale / Body age / Fianchi / Petto / Bicipite / Note
  - Salvataggio: insert/update manuale (no upsert — constraint UNIQUE non presente)
  - Lista ultimi 8 log
- **Tendenza**: grafici barre peso + vita ultimi 30 log (vita verde se ≤ 85 cm)

## Architettura stato (ST object)

```js
const ST = {
  user, profile, TARGET, page, activeDay, db, supps,
  // Nutrition
  logSlot, logText, logTime, logLoading, logError, logOpen,
  advice, advLoading, nextSlot, reportRange,
  // Onboarding
  onbStep, onbSex, onbActivity, onbObjective, onbDiet, onbIntolleranze, onbWorkout, onbRecoveryDay,
  // Integratori
  syncStatus, catalog, catalogSelected, catalogToRemove, suppSheet, suppFilter,
  // Training
  trainTab,         // 'sessione' | 'piano' | 'progressione'
  trainSession,     // null | 'upperA' | 'upperB' | 'lowerA' | 'lowerB' | 'recovery'
  trainLogOpen,     // null | {sessionId, exName, setNum}
  trainLoggedSets,  // {key: {reps, resistance, rir}} — reset al reload
  trainProgEx,      // esercizio selezionato in Progressione
  trainProgLogs,    // [] | null (loading)
  trainHomeData,    // {lastDate, lastSession, nextSession, streak, doneToday, notStarted?, startDate?}
  trainSaving,      // boolean
  exerciseAIOpen,   // null | {exName, loading?, wgerImages, wgerVideos, muscleImg, svgContent, content}
  // Body
  bodyTab,          // 'misure' | 'tendenza'
  bodyLogs,         // [] | null (loading)
  bodySaving,       // boolean
  bodyAdvOpen,      // boolean — sezione avanzata form aperta
}
```

## Funzioni chiave

| Funzione | Scopo |
|---|---|
| `showPage(id)` | Navigazione + trigger load data (guard Training se no `train_start_date`) |
| `renderPage(id)` | Dispatch render functions |
| `hasTraining()` | Gate Training: `!!ST.profile.train_start_date` |
| `updateTrainingNav()` | Mostra/nasconde tab Training in top + bottom nav |
| `renderHome()` | Home dashboard |
| `loadTrainingHomeData()` | Fetch last session + streak per tile Home (rispetta start futura) |
| `renderTraining()` | Training con 3 tab — gestisce anche modal `exerciseAIOpen` |
| `loadTrainingLogs(exName)` | Fetch storico esercizio per Progressione |
| `saveTrainingSet()` | Insert su training_logs |
| `openExerciseAI(exName, sessionType, note, svgContent)` | Apre modal scheda esercizio AI — usa `EXERCISE_MEDIA` + `callAI()` |
| `showInfoModal(key)` | Mini modal per termini tecnici (rir, serie, recupero, dup, scarico, progressione) |
| `renderBody()` | Body con 2 tab (Misure / Tendenza) |
| `loadBodyLogs()` | Fetch body_logs da Supabase (aggiorna Home o Body in base a ST.page) |
| `saveBodyLog()` | Insert/update body_logs + aggiorna profiles.weight_kg |
| `migrateObiettivo(str)` | Migra vecchi valori obiettivo (`perdita_peso`→`dimagrimento`, `massa_muscolare`→`ipertrofia`) — chiamata in `applyProfile()` e `applyLocalPrefs()` |
| `selectSetObiettivo(val)` | Evidenzia pill obiettivo nella griglia del modal impostazioni |
| `dbToggleSuppTaken(date, suppId, suppName, taken, slot)` | Delete+insert su `supplements_log` (NON upsert — usare questo pattern) |
| `deleteSuppGroup(slot)` | Elimina tutti gli integratori presi di un gruppo dalla timeline |

## Modulo Training — specifiche

**Split:** Upper/Lower 4 giorni + 2 Active Recovery — giorni numerici G1–G6 (rotazione 6 giorni, dopo G6 → G1)

**Riposo extra** (NON in rotazione, NON conta nel calcolo settimana ciclo):
- Riposo scelto (`rest`): giorno volontario, button grigio (`markRestChosen`)
- Riposo infortunio (`rest_injury`): stop forzato, button arancione, prompt zona corpo, salvato in `workouts.note` (`markRestInjury`)

| Sessione | Tipo | RIR |
|---|---|---|
| Upper A | Forza | 2 |
| Upper B | Ipertrofia | 1 |
| Lower A | Forza | 2 |
| Lower B | Ipertrofia | 1 |

**Progressione doppia:** aumenta reps fino al limite → aumenta carico → riparte dal minimo

**Periodizzazione:** 3 settimane carico + 1 settimana scarico

**Blocco attivazione (5 min obbligatori):**
1. Respirazione diaframmatica 360° — 2 min
2. Vacuum addominale — 2 min
3. Cat-Cow + rotazione toracica — 1 min

**Attrezzatura:** elastici a tubo con moschettoni (maniglie singole, corda doppia, barra modulare ~130 cm, barra corta), sbarra trazioni, panca, fitball, tappetino

**Protezioni:** lombari e ginocchia

### TRAINING_SESSIONS — schema attuale (3 maggio 2026, post-Step3)

**Struttura sessione (top-level)**:
```js
{
  id: 'upperA',                 // === chiave esterna del map (back-compat)
  name: 'Upper A',              // titolo breve (calendar/Home tile/Sessioni cards)
  type: 'Forza',                // 'Forza' | 'Ipertrofia' | 'Recupero' (capitalized — usato da getRestSec)
  rir: 2,                       // RIR target sessione (null per recovery)
  label: 'Upper A — Forza',     // titolo esteso (nuovo, usato dal modal scheda esercizio)
  rest: '2-3 min',              // testo recupero (nuovo, usato da card e modal; null per recovery)
  exercises: [ ... ]
}
```

**Struttura esercizio**:
```js
{
  name: 'Trazioni alla sbarra',
  sets: 4,
  reps: '4-6',                  // '4-6' | '8-12' | '4-6 per lato' | '20-30 sec' | '20-30 sec per lato' | '10 min'
  eq: 'Sbarra fissa da porta',  // attrezzatura sintetica
  iso: true,                    // OPZIONALE: esercizi isolation/isometrici, usato da getRestSec
  setup: 'Presa pronata...',    // 1 frase: posizione iniziale + attrezzatura
  execution: [                  // 3-4 step movimento
    'Sospensione passiva...',
    'Tirata fino al mento...',
    'Eccentrica controllata 3 sec'
  ],
  commonErrors: [               // 3 errori tipici da evitare
    'Dondolare il corpo per slancio',
    'Spalle che salgono...',
    'Range incompleto...'
  ],
  muscles: ['dorsale','bicipiti','trapezio','romboidi'],
  alert: '⚠️ Lombari: ...'      // OPZIONALE: warning protezione (7 esercizi)
}
```

**Convenzioni nomi**: tutti gli esercizi con elastico riportano "con elastico" nel nome (es. "Chest press in piedi con elastico"). Niente "banda elastica", niente ridondanze tipo "orizzontale/verticale".

**Esercizi con `alert` (protezione lombari/ginocchia)** — 7 totali:
- Shoulder press in piedi con elastico (lombari iperestensione)
- Row inclinato in piedi busto 45° (lombari schiena flessa)
- Bulgarian split squat con elastico (ginocchia valgismo + tallone)
- Romanian deadlift con elastico (lombari schiena neutra)
- Glute bridge isometrico con cavigliera (ginocchia rinforzo vasto mediale)
- Squat con elastico e talloni rialzati (ginocchia + lombari)
- Single leg Romanian deadlift con elastico (lombari equilibrio)

**Esercizi con `iso:true`** — 7 totali (recupero più breve via `getRestSec`): Face pull, Lateral raise, Curl bicipiti, Tricipiti overhead, Glute bridge isometrico, Leg curl con fitball, Calf raise.

| Sessione | Esercizi |
|---|---|
| Upper A (Forza) | Trazioni alla sbarra, Chest press in piedi con elastico, Shoulder press in piedi con elastico, Row in piedi con elastico, Face pull con elastico |
| Upper B (Ipertrofia) | Inverted row con elastico, Chest press inclinata su panca, Lateral raise con elastico, Row inclinato in piedi busto 45°, Curl bicipiti con elastico, Tricipiti overhead con elastico |
| Lower A (Forza) | Bulgarian split squat con elastico, Romanian deadlift con elastico, Hip thrust con elastico, Glute bridge isometrico con cavigliera |
| Lower B (Ipertrofia) | Squat con elastico e talloni rialzati, Single leg Romanian deadlift con elastico, Hip thrust con elastico TUT alto, Leg curl con elastico sulla fitball, Calf raise con elastico |
| Recovery | Mobilità articolare, Stretching, Vacuum + respirazione diaframmatica |

**Totale: 20 esercizi training (5+6+4+5) + 3 recovery = 23**

### EXERCISE_MEDIA — media per esercizi (3 maggio 2026)

Oggetto globale definito prima di `TRAINING_SESSIONS`. Struttura per esercizio:
```js
{
  muscleImg:   '...', // path locale a assets/exercises/<nome>-muscoli.png (mappa muscolare Wger)
  executionImg:'...'  // path locale a assets/exercises/<nome>-esecuzione.png, oppure null
}
```
Tutti i 20 esercizi training sono mappati (i 3 esercizi di Active Recovery non hanno media). `executionImg: null` per esercizi senza foto esecuzione disponibile su Wger; il modal in quel caso mostra la sola mappa muscolare a tutta larghezza (griglia `1fr` invece di `1fr 1fr`).

**Asset locali esercizi:** `assets/exercises/` — PNG di Wger (Wger.de, CC BY-SA 4.0). Versionati nel repo.

**Note temporanee** (TODO per ripuliture future):
- Alcuni `executionImg` puntano a varianti `*-esecuzione-1.png` (esistono `-1` e `-2` da combinare in un'unica immagine senza suffisso)
- `Chest press in piedi con elastico.muscleImg` riusa `chest-press-orizzontale-muscoli.png` come fallback (file `chest-press-in-piedi-muscoli.png` da generare)
- `Hip thrust con elastico TUT alto` riusa il `muscleImg` di `Hip thrust con elastico` (stesso muscolo)

### Scheda esercizio AI — `openExerciseAI(exName, sessionId)` (3 maggio 2026)

**Trigger**: l'intero **header della card esercizio** (titolo + meta-row) è cliccabile (`onclick="openExerciseAI(...)"`). Niente più pulsante ▶ separato.

**Flusso**:
1. Apertura sincrona: legge `TRAINING_SESSIONS[sessionId]` + `findExercise(exName, sessionId)` + `EXERCISE_MEDIA[exName]`. Setta `ST.exerciseAIOpen` con TUTTI i dati statici visibili immediatamente + `loading:true` per l'AI Coach
2. `renderTraining()` mostra subito il modal con sezioni statiche complete (Setup, Esecuzione, Errori, Parametri, Alert)
3. In parallelo: `callAI(prompt, 200)` con prompt **semplificato** che chiede SOLO un cue avanzato (max 3 frasi: cue tecnico + gestione fatica + variazione respiratoria). NON ripete setup/execution/errori/muscoli (già nelle sezioni statiche)
4. Risposta AI → setta `content`, `loading:false`, re-render

**Sezioni del modal (in ordine)**:
1. **Header**: nome esercizio + label sessione (es. "Upper A — Forza") + ✕
2. **Media**: griglia `1fr 1fr` con `muscleImg` + `executionImg`. Collassa a `1fr` se `executionImg=null`. Immagini con **`height:240px` fissa + `object-fit:contain`** (fix bug dimensioni disuguali)
3. **Setup**: 1 paragrafo (`<p>`) con la posizione iniziale e attrezzatura
4. **Esecuzione**: lista numerata `<ol>` con 3-4 step
5. **Errori comuni**: lista bullet `<ul>` con 3 errori da evitare
6. **Parametri**: pill compatta `${sets}×${reps} · RIR N · Recupero ...`
7. **Alert protezione** (condizionale): box giallo/arancio con `⚠️` solo se `ex.alert` è presente (7 esercizi)
8. **AI Coach** (background teal `#F0F7F5`): mostra "Genero un cue avanzato per te…" durante loading, poi il testo AI
9. **Footer**: "Mappe muscolari da Wger.de — CC BY-SA 4.0"

**Stato `ST.exerciseAIOpen`**:
```js
{
  exName, sessionId,
  sessionLabel, sessionType, sessionRir, sessionRest,  // dati sessione
  sets, reps, eq,                                       // parametri esercizio
  setup, execution[], commonErrors[], muscles[], alert, // contenuti structured
  muscleImg, executionImg,                              // media Wger
  content, loading                                      // AI Coach
}
```

Il modal è parte di `page-training` innerHTML, montato/smontato tramite `ST.exerciseAIOpen`. Classi CSS dedicate: `.modal-section`, `.modal-list`, `.modal-params`, `.modal-alert`, `.modal-ai-section`, `.ex-media-grid`, `.ex-media-img`.

### Info icon (ⓘ) — `showInfoModal`

Classe CSS `.info-icon` (cerchio verde 16px). Termini supportati: `rir`, `serie`, `recupero`, `dup`, `scarico`, `progressione`.
Posizionati in:
- Tab Piano: accanto a "CICLO 4 SETTIMANE" (scarico) e "PROGRESSIONE DOPPIA" (progressione)
- Tab Sessione: nel badge header sessione (RIR) e nel badge serie esercizio (serie)

### Fix Piano tab (maggio 2026)

`CYCLE_WEEKS[currentWeek].active = true` crashava se `train_start_date` è nel futuro (`diffDays < 0` → `% 4` → indice negativo). Fix: il blocco esegue solo se `diffDays >= 0`.

## Modulo Body — specifiche

**Obiettivo circonferenza vita:** 89 cm → < 85 cm

**Fonti dati:**
- Bilancia smart Fitdays: peso, BF%, massa muscolare, grasso viscerale, body age
- Metro: vita, fianchi, petto, bicipite

**Campi `body_logs`:** weight_kg, waist_cm, bf_pct, muscle_kg, visceral_fat, hip_cm, chest_cm, bicep_cm, body_age

**Form log — 2 sezioni:**
- Base (sempre visibile): Peso / Vita
- Avanzate (collapsible): BF% / Massa muscolare / Grasso viscerale / Fianchi / Petto / Bicipite / Body age

## Design system

- **Font:** Manrope (UI) + JetBrains Mono (numeri/label)
- **Token CSS:** `--r-sm/md/lg/pill`, `--font-sans`, `--font-mono`
- **Palette:**
  - Evergreen: `#2A7A6F` (accent globale, Zona OK)
  - Nutrition: `#3B6D11`
  - Training: `#185FA5`
  - Body: `#854F0B`
  - Fuori Zona: `#B84C2A`
- **Sub-nav:** `.nutrition-subnav` + `.nsn-pill` — riusato per tutti i moduli
- **Tile Home:** helper `tile(ink, body, right, onclick)` + `tHead(title, sub, ink)`
- **Info icon:** `.info-icon` (cerchio 16px verde accent, testo bianco) — usato per termini tecnici Training
- **Modal info:** `.info-modal-overlay` + `.info-modal` + `.info-modal-close` — usato sia da `showInfoModal` che da `openExerciseAI`

## Workflow git (aggiornato 12 maggio 2026)

Claude Code esegue **tutto il ciclo completo**: edit + commit + push + deploy.

**Regola d'oro**: per OGNI modifica, Claude Code DEVE fornire un resoconto strutturato con questi 6 punti:

1. **File modificati**: percorso completo (worktree incluso) di ogni file toccato
2. **Cosa è cambiato**: sintesi puntuale delle modifiche (1 bullet per modifica)
3. **Commit hash + branch**: hash breve (es. `a64d743`) e nome branch
4. **Stato push**: confermare push avvenuto su `origin/main` (sì/no, eventuali errori)
5. **Tempo stimato propagazione**: GitHub Pages tipicamente ~1-3 min dopo push
6. **Versione/tag del rilascio**: incremento versione o tag (es. `v1.4.2` o data ISO)

**Niente operazioni git silenziose.** Se Claude Code esegue git push senza resoconto, è una violazione del workflow.

**Worktree management**: indicare sempre quale worktree è attivo. Se ne viene creato uno nuovo, dichiararlo all'inizio della sessione.

## Funzioni chiave aggiuntive (aprile–maggio 2026)

| Funzione | Scopo |
|---|---|
| `prefsKey()` | Chiave localStorage `zt_prefs_<userId>` per prefs locali |
| `saveLocalPrefs()` | Salva obiettivo/dieta/intolleranze in localStorage |
| `applyLocalPrefs()` | Ripristina prefs locali dopo ogni applyProfile, ricalcola ST.TARGET |
| `calcAdaptedTargets(obArr, kcal)` | Calcola macro adattivi per obiettivo — usa `OBJ_ADAPT` globale |
| `updatePianoTargetCard()` | Aggiorna card target in Piano al toggle obiettivo (live) |
| `renderPiano()` | Renderizza Piano inclusa card target inline |
| `nutriSubNav(active)` | Sub-nav Nutrition riusabile su tutte e 4 le pagine |
| `parseRepsRange(repsStr)` | Parser unificato campo reps: ritorna `{kind:'reps'\|'seconds', min, max, perLato, unit}` o null (8 mag 2026) |
| `loadTrainingAllCompleted()` | Carica tutti workout completati validi (esclude riposi) per calcolo settimana ciclo (8 mag 2026) |
| `markRestChosen()` | Segna giorno come riposo volontario (`workouts.session_type='rest'`) (8 mag 2026) |
| `markRestInjury()` | Segna riposo per infortunio + nota zona corpo (`workouts.session_type='rest_injury'`, `note=...`) (8 mag 2026) |
| `scrollToActiveExercise()` | Scrolla card primo esercizio non completato al centro (8 mag 2026) |
| `restSecToText(sec)` | Format recupero in stringa: 60→'1 min', 75→'75 sec', 120→'2 min' |
| `ensureRestGif(exName)` | Pre-fetch silenzioso GIF esecuzione per modal recupero (toggle on-demand, cache `ST.exerciseGifCache`) (9 mag 2026) |
| `toggleRestGif()` | Apre/chiude blocco GIF esecuzione nel modal recupero (9 mag 2026) |
| `findExInAllSessions(exName)` | Cerca esercizio per nome in tutte le `TRAINING_SESSIONS`, ritorna `{ex, sess}` o null (9 mag 2026) |
| `isTimedExerciseByName(exName)` | True se esercizio è `iso:true` con reps in formato secondi (9 mag 2026) |
| `bestSetOfDay(logs)` | Per array di training_logs di un giorno+esercizio: ritorna serie migliore (peso desc → reps desc tiebreaker) (9 mag 2026) |
| `shortDate(dateStr)` / `formatDayHeader(dateStr)` | Format date per chart asse X ("8/5") e modal header ("Gio 8 mag") (9 mag 2026) |
| `openDayDetail(date, exName?)` | Apre modal dettaglio giorno (calendar click). Se exName: filtra logs solo a quell'esercizio (chart click). (9 mag 2026) |
| `editLogRow(id)` / `confirmEditLogRow()` / `cancelEditLogRow()` | Edit inline serie (reps + resistance + RIR) nel modal day-detail. Update simultaneo `training_logs` + `workout_sets` (9 mag 2026) |
| `confirmDeleteSet(id, label)` / `deleteSetConfirmed()` | Conferma + delete singola serie da entrambe le tabelle (9 mag 2026) |
| `confirmDeleteWorkoutFromDetail()` / `deleteWorkoutConfirmed()` | Conferma + delete workout intero dal modal day-detail (sostituisce vecchio `trainCalDeleteConfirm`) (9 mag 2026) |
| `loadAllExerciseNames()` | Lazy load distinct `exercise_name` da training_logs (cache `ST.allExerciseNamesCache`). Auto-default selezione primo alfabetico (9 mag 2026) |
| `invalidateAllExerciseNamesCache()` | Invalida cache lista esercizi (chiamata da `saveTrainingSet`/`deleteSetConfirmed`/`deleteWorkoutConfirmed`) (9 mag 2026) |
| `toggleProgDropdown()` / `closeProgDropdown()` / `setProgDropdownTab(tab)` / `setProgDropdownSearch(val)` / `selectProgEx(name)` | UX dropdown selezione esercizio Progressione (9 mag 2026) |

## Vocabolario obiettivi — fonte unica (`OBJ_ADAPT`)

Le 6 chiavi valide sono: `dimagrimento`, `ricomposizione`, `ipertrofia`, `forza_performance`, `longevita`, `mantenimento`.

**`OBJ_MIGRATE`** mappa i vecchi valori ai nuovi: `{ perdita_peso: 'dimagrimento', massa_muscolare: 'ipertrofia' }`.
`migrateObiettivo()` viene chiamata all'ingresso di ogni path che legge `profile.obiettivo` (da Supabase o localStorage).

Tutti i punti di input (onboarding step 3, modal impostazioni, Piano → toggle pill) usano le stesse 6 chiavi.

## Macro adattivi per obiettivo (`OBJ_ADAPT`, riga ~3614)

```js
const OBJ_ADAPT = {
  dimagrimento:      { pct:[38,32,30], label:'Dimagrimento', ... },
  ricomposizione:    { pct:[38,34,28], label:'Ricomposizione', ... },
  ipertrofia:        { pct:[40,35,25], label:'Ipertrofia', ... },
  forza_performance: { pct:[42,33,25], label:'Forza & Performance', ... },
  longevita:         { pct:[40,30,30], label:'Longevità', ... },
  mantenimento:      { pct:[40,30,30], label:'Mantenimento', ... },
};
// pct = [%carbo, %prot, %fat]
```

## Preferenze Piano — architettura (aprile 2026)

- `obiettivo`, `dieta`, `intolleranze` salvati in `localStorage` (`zt_prefs_<userId>`), NON su Supabase
- Le colonne `obiettivo`, `dieta`, `intolleranze` potrebbero NON esistere nella tabella `profiles` su Supabase
- `savePianoPrefs()` salva prima in localStorage, poi aggiorna su Supabase solo `target_protein/carbs/fat`
- `applyLocalPrefs()` viene chiamata da `applyProfile()` — sovrascrive il profilo con le prefs locali; applica `migrateObiettivo()` in lettura
- `togglePianoObiettivo()` e `togglePianoIntol()` chiamano `saveLocalPrefs()` immediatamente
- Il vocabolario obiettivo è **unificato** — tutte le schermate usano le stesse 6 chiavi `OBJ_ADAPT` (vedi sezione sopra)

## Service Worker (`sw.js`)

- **Network-first** per `zona-tracker.html` (sempre fetch fresco dal server)
- **Cache-first SOLO per `cdn.jsdelivr.net`** (libreria Supabase JS versionata, OK cacheare)
- **Le chiamate REST a `*.supabase.co` NON vengono intercettate** → default browser, sempre network
- Registrato in fondo a `zona-tracker.html`, controlla aggiornamenti ogni 3 min
- Auto-reload della pagina quando trova una nuova versione del SW
- Cache name corrente: `zt-v2` (4 maggio 2026 — bumpata da `zt-v1` per pulire risposte stantie)

⚠️ **ANTI-PATTERN — NON aggiungere mai `'supabase'` nel branch cache-first del SW.** Lo abbiamo fatto in passato e ha causato un bug serio di sync cross-device: ogni device cacheava le risposte REST dell'API Supabase ai propri URL, quindi un dispositivo vedeva solo i record creati localmente, mai quelli inseriti da altri device dello stesso utente. Il check hostname deve restare **solo** `cdn.jsdelivr.net`.

## Versioning automatico (`APP_VERSION`)

Sistema di stamp automatico della versione attiva, utile per debug cross-device.

- **Costante:** `const APP_VERSION = '__APP_VERSION__';` definita in cima al file `zona-tracker.html` (vicino allo stato `ST`).
- **Hook Git:** `.git/hooks/pre-commit` (eseguibile, condiviso fra worktree via `$GIT_COMMON_DIR/hooks/`).
  - Genera la stringa formato `YYYY.MM.DD · HH:mm` da `date`
  - Sostituisce con `sed` qualunque valore corrente di `APP_VERSION` (placeholder `__APP_VERSION__` o versione precedente) → re-stage del file
  - **Skippa** se `zona-tracker.html` non è fra i file in stage del commit (commit di soli `sw.js`, ecc. non bumpano la versione)
- **Visualizzazione:** helper `versionFooter()` (in `zona-tracker.html`) restituisce `<div>v${APP_VERSION}</div>` + spacer invisibile da 120px. Chiamato in fondo a tutte e 4 le tab principali (Home, Nutrition/Oggi + sub-tab, Training, Body) come ultimo elemento del flusso scrollabile.
- **Workflow:** in working tree il valore è sempre `__APP_VERSION__` o quello dell'ultimo commit. Solo l'hook al commit successivo lo aggiorna.

## Prossimi step

- [x] Bottom Nav con icone SVG (4 tab)
- [x] Home dashboard (ring + macro + 3 tile)
- [x] Sub-nav Nutrition (Oggi/Integratori/Storico/Piano)
- [x] Modulo Training — Sessione (lista + dettaglio + log serie)
- [x] Modulo Training — Piano (split settimanale + ciclo 4 settimane)
- [x] Modulo Training — Progressione (storico per esercizio)
- [x] Home tile Training live (next session + streak)
- [x] Modulo Body — Misure (form base + avanzati collapsibili, progress bars, griglia composizione)
- [x] Modulo Body — Tendenza (grafici barre peso + vita)
- [x] Home tile Body live
- [x] `train_start_date` in profilo → ciclo 4 settimane live + gate visibilità Training
- [x] Piano → Preferenze alimentari (obiettivo, dieta, intolleranze)
- [x] Piano → Macro adattivi per obiettivo (OBJ_ADAPT, calcAdaptedTargets)
- [x] Service Worker PWA per aggiornamenti automatici
- [x] Vocabolario obiettivi unificato (6 chiavi OBJ_ADAPT, migrazione automatica da vecchi valori)
- [x] Card target Piano mostra obiettivo corretto (fix: `migrateObiettivo` + vocabolario unificato)
- [x] Timeline oggi: pasti e integratori compaiono correttamente dopo reload
- [x] Pulsante 🗑️ elimina pasto solo su desktop (mobile usa swipe)
- [x] Pulsante × elimina gruppo integratori in timeline
- [x] `supplements_log` UNIQUE constraint + pattern delete+insert (no più duplicati)
- [x] Info icon ⓘ con mini modal per RIR, Serie, Scarico, Progressione (Training)
- [x] `TRAINING_SESSIONS` aggiornato con nuovi esercizi + campo `note`
- [x] Split Piano giorni numerici G1–G7
- [x] Fix crash tab Piano quando `train_start_date` è nel futuro
- [x] Scheda esercizio AI con modal (video Wger, immagini, mappa muscolare, testo AI)
- [x] `EXERCISE_MEDIA` — media statici per Upper A + Face pull
- [x] Completare `EXERCISE_MEDIA` per Upper B, Lower A, Lower B (3 maggio 2026): tutti i 19 esercizi training mappati con `muscleImg`+`executionImg` PNG Wger locali in `assets/exercises/`
- [x] Nomi esercizi normalizzati ("con elastico" esplicito, no ridondanze) + note dense con muscoli target (3 maggio 2026)
- [x] Audit training completo: setup array, rest fisso, riposi extra, rotazione 6 giorni (8 maggio 2026)
- [x] Modal log esercizi temporali con DURATA + auto-progressione su secondi (8 maggio 2026)
- [x] Tab Piano rinominata Programma + calcolo settimana basato su workout completati (8 maggio 2026)
- [x] GIF esecuzione opzionale nel modal recupero (toggle on-demand, cache globale) (9 maggio 2026)
- [x] Tab Progressione: grafico SVG (barre/linea) + 3 metriche (Peso/Reps/Volume o Peso/Tempo per iso) (9 maggio 2026)
- [x] Modal Dettaglio giorno con edit/delete singola serie + edit/delete workout (9 maggio 2026)
- [x] Dropdown selezione esercizio (search + tab Per programma/Per esercizio) sostituisce chip-row (9 maggio 2026)
- [x] Migrazione Magic Link → OTP a 6 cifre via email (aprile 2026, commit `1bada62` + fix `364dd83`)
- [x] Logica residua kcal/macro (zona-tracker.html, home + Oggi) (11 maggio 2026)
- [ ] Asset `assets/muscles/face-pull.jpg` da aggiungere manualmente (legacy — sostituito dal nuovo sistema `assets/exercises/`)
- [ ] **Pannello admin** (gestione utenti, assegnazione programmi)
- [ ] Fix backfill macro integratori vecchi
- [ ] GIF/video esecuzione esercizi nel modal scheda (collapsibile, click per aprire)
- [ ] **FASE 2 Programmi multipli archiviati** (predisposto in dropdown Progressione 9 maggio 2026): tabella `programs` Supabase, colonna `program_id` su workouts, UI chiusura programma, popolare sezione "PROGRAMMI PASSATI" del dropdown con lista collassabile, filtro grafico per periodo programma. Vedi commento HTML inline nel codice (cerca "TODO FASE 2 — gestione programmi multipli")
- [ ] Pulizia residui Magic Link (post-validazione tester): rimuovere fallback `verifyOtp({type:'magiclink'})` a [zona-tracker.html:1693](zona-tracker.html:1693), branch bootstrap hash + PKCE [zona-tracker.html:8569-8599](zona-tracker.html:8569), commento obsoleto a riga 8626, file `auth-callback.html`

### Possibili evoluzioni future modulo Training

- Immagini esecuzione per i 9 esercizi senza foto: valutare AI generation via Cloudflare Workers AI (free tier 10.000 Neurons/giorno) + cache su Supabase Storage
- Hip thrust TUT alto e Single leg RDL: nessun match dataset esterni, restano `EXERCISE_MEDIA` fallback
- Rivedere immagini Wger per varianti laterale/posteriore (oggi solo frontali)

## Cosa abbiamo fatto

### 12 maggio 2026 — Fase 3 Smart Ingredient: timeline con doppio collasso

- `loadMeals(date)` ([zona-tracker.html:1938](zona-tracker.html:1938)): carica meal_items in una seconda query keyed su `meal_ids`, aggrega per `meal_id`, ritorna `{...meal, items: [...]}`
- `loadAllDays()` ([zona-tracker.html:1950](zona-tracker.html:1950)): query unica su `meal_items` con `.eq('user_id', ST.user.id)`, items aggregati per `meal_id`, attaccati ai pasti durante il push in `ST.db.days[m.date].meals`
- `mealCardHTML(m)` riscritta: card a 2 livelli di collasso. Livello 1 collassato di default → header compatto `▶ icona · slot · ora · N ingredient · TOT kcal · ✏️ 🗑️`. Tap → si espande con descrizione + note + tile macro + lista ingredienti
- Livello 2 ingredienti collassati di default → riga `▶ nome · qty unit · kcal`. Tap → chip C/P/G colorate
- Pasti vecchi monolitici (180 pre-Fase 1, con 1 meal_item creato dalla migrazione): trattati identicamente, label "1 ingrediente". Edge case `items.length===0`: label "pasto monolitico" (fallback per pasti orfani)
- Stato collasso non persistito tra reload (`ST.mealExpanded={}` e `ST.itemExpanded={}` iniziano vuoti): scelta voluta, default pulito
- Handlers globali `window.toggleMealCard(mealId)` e `window.toggleMealItem(itemId)` re-render via `renderOggi()`
- `smartSavePasto` aggiornato: chiamata `insert(...).select()` su `meal_items` per ricevere i row con id reali → meal pushato in-memory ha già `items: savedItems` per render Fase 3 senza re-fetch
- `saveCache()` serializza naturalmente `m.items` come parte di `ST.db` → su reload da cache, gli items sono già disponibili offline
- Edit pasto (matita): ancora vecchio modal (Fase 4)
- Cestino, swipe-to-delete, time-edit inline (riposizionato sotto card espansa): preservati

### 12 maggio 2026 — Fase 2 Smart Ingredient: form di registrazione a righe

- Nuovo form sostituisce la textarea: strada veloce ("✨ Analizza" testo libero) + strada manuale ("+ Manuale" → riga vuota espansa)
- Righe ingrediente collassabili: default collassate dopo Analizza (mostrano nome · qty · kcal), espanse se aggiunte manualmente (3 input + select unità + bottone "✨ Stima AI" + chip C/P/G)
- 1 chiamata AI per Analizza (`estimateMealItems` ritorna `{items:[{name,quantity,unit,kcal,protein,carbs,fat}], notes}`), N chiamate AI per Manuale (`estimateSingleItem` per riga on-demand)
- Salvataggio (`smartSavePasto`): 1 INSERT `meals` (con totali aggregati) + N INSERT `meal_items` (rollback DELETE su meal orfano se itemsErr)
- Conserva chrome esterno: slot tabs (con reset smartForm su cambio slot), time picker, close button
- `setLogSlot()` ora azzera `ST.smartForm` per evitare contaminazione cross-slot
- `estimateMacros()` retrocompat: wrapper che chiama internamente `estimateMealItems` e ritorna totali + `items` per uso da chiamanti legacy (`logMeal` originale non toccato)
- Timeline pasti e edit pasto: **invariati in Fase 2** (saranno Fase 3 e 4 — pasti vecchi monolitici restano leggibili/modificabili con vecchio form)
- Stato nuovo: `ST.smartForm = { items:[], freeText:'', notes:'', analyzing:false }` ([zona-tracker.html:1289](zona-tracker.html:1289))
- Pattern in-memory: dopo INSERT, `getDay(ST.activeDay).meals.push({...})` come fa `logMeal()` storico

### 12 maggio 2026 — Nutrition: precisione decimale recuperata

- Migrazione Supabase completata: `meals.kcal/protein/carbs/fat` ora `numeric(6,1)` / `numeric(5,1)` invece di `integer`
- Lato app: arrotondamento allentato da intero a 1 cifra decimale nei 3 punti del commit `a0bbec0` — `estimateMacros` ([zona-tracker.html:1558](zona-tracker.html:1558)), `dbAddMeal` ([zona-tracker.html:1930](zona-tracker.html:1930)), `saveEditMeal` ([zona-tracker.html:7095](zona-tracker.html:7095))
- Pattern: `Math.round((Number(x) || 0) * 10) / 10` — preserve cast `Number()`, fallback `|| 0`, `Math.max(0, ...)`
- Esempio: kiwi → 42.3 kcal / 0.8 protein invece di 42 / 1
- Da verificare in produzione: rendering UI con decimali (vedi note sotto sui side-effect grafici)

### 12 maggio 2026 — Fix bug critico: errore integer su pasti piccoli

- Bug: salvataggio pasti con singolo frutto/snack falliva con `invalid input syntax for type integer: "4.2"`
- Causa: AI ritorna macro decimali (es. kiwi → fat 4.2g), Supabase columns `meals.kcal/protein/carbs/fat` sono `integer`
- Fix lato app (parte 1): `Math.round()` in 3 punti — `estimateMacros` ([zona-tracker.html:1553](zona-tracker.html:1553)), `dbAddMeal` ([zona-tracker.html:1925](zona-tracker.html:1925)), `saveEditMeal` ([zona-tracker.html:7082](zona-tracker.html:7082))
- Difesa in profondità: ogni valore macro arrotondato + cast `Number()` + fallback `|| 0` + `Math.max(0, ...)`
- Parte 2 (da fare lato DB): ALTER COLUMN su Supabase per passare a `numeric(6,1)` e recuperare precisione decimale

### 12 maggio 2026 — Nutrition: modello ibrido (visivo si riempie, testo "rimasti")

- Anello kcal Home + Hero: tornano a riempirsi al crescere del consumo (uso di `consPctKcal` / `consPctKcalHero` derivato da `cons.kcal / target.kcal`)
- Barre macro Home + tile Oggi: tornano a riempirsi da sinistra (uso di `consPct` / `consPctM` derivato da `current / target`)
- Oltre target: anello/barra restano al 100% e diventano `OVER_COLOR` (regola A). `ringColor` di Home ora forza `OVER_COLOR` quando `overKcal=true`; `ringColor` di Hero forza `#B84C2A` quando `overKcalHero=true`
- Testi invariati ("rimasti", "+Xg oltre")
- Modello mentale: forma = consumato, numero = rimanente — coerenza con Apple Fitness + budget
- Rimossa `margin-left:auto` aggiunta nei commit `52dfeb0` / `ace4574`; aggiunta `transition:width .6s ease` sulla barra Home `mBar()`

### 12 maggio 2026 — Nutrition Oggi: completamento inversione barre macro

- Estesa modifica `margin-left:auto` anche alla tile Carbo/Prot/Grassi del modulo Nutrition → Oggi (`zona-tracker.html` riga ~5855)
- Coerenza visiva con Home: tutte le barre macro ora si svuotano da sinistra a destra

### 12 maggio 2026 — Nutrition: inversione direzione svuotamento barre macro

- Barre Carbo/Prot/Grassi sotto anello kcal: parte colorata ora ancorata al lato destro
- Visivamente: il consumo "mangia" la barra da sinistra verso destra
- Modifica chirurgica: aggiunto `margin-left:auto` al div fill di `mBar()` ([zona-tracker.html:2410](zona-tracker.html:2410))
- Caso "oltre target" (`remPct=0`) e "rimasto = 100%" indistinguibili dal comportamento precedente

### 12 maggio 2026 — Nutrition: slot Extra fuori pasto

- Aggiunto slot `extra` (🍽️) a `MEAL_SLOTS`, sempre selezionabile dal form "+ Registra pasto"
- `computeNextSlot()` esclude `extra` dalla logica di preselezione/suggerimento AI prossimo pasto
- Multipli `extra`/giorno consentiti (nessun dedup per slot)
- Stile neutro grigio in `SLOT_STYLE` (`color:var(--t3)`, `light:var(--s2)`)
- Seconda riga `slot-tabs` del form passa da 2 a 3 colonne (snack_pomeriggio · cena · extra) per ospitare la nuova pill
- Placeholder textarea dedicato per slot `extra` ("Es. Frutta secca, quadratino di cioccolato fondente, tisana con miele...")
- La select del riquadro "🎯 Riequilibrio pasto successivo" elenca anche `extra` (orario vuoto, non blocca nulla)
- Risolve: impossibilità di registrare pasti aggiuntivi quando timeline completa (es. secondo snack, spuntino notturno, dolce dopo cena)

### 11 maggio 2026 — Admin panel + logica residua kcal/macro + tester attivati

Sessione operativa di sviluppo: admin panel completato dal vivo, refactor visuale Nutrition (kcal/macro) verso modello mentale "rimanente" (stile MyFitnessPal/Lifesum), tester reattivati via WhatsApp con richiesta di costanza per 2 settimane.

**Admin panel — `dashboardzona.html` creato (commit `7735370`)**
- File single-page HTML/CSS/JS vanilla separato da `zona-tracker.html`, hostato su GitHub Pages
- URL: https://ignaziof321621.github.io/benessere-forma/dashboardzona.html
- Auth OTP a 6 cifre identica a zona-tracker
- Email gate: solo `ignazio.f@me.com`
- 2 schermate: Home dashboard (Oggi + Tester + Uso moduli 7gg) + Dettaglio utente
- Solo `.select()` su Supabase (nessuna mutation)
- Stile pragmatico: system-ui, palette bianco/nero/grigio, mobile-first, touch target 44px
- Documentate in CLAUDE.md le 5 policy RLS Supabase necessarie (`admin_read_all_<tabella>` per `profiles`, `meals`, `supplements_log`, `workouts`, `body_logs`) — da eseguire manualmente in SQL Editor

**Fix bug match utenti `profiles.id` vs `user_id` (commit `bf9fe4d`)**
- Bug: i contatori "Oggi" funzionavano ma la lista tester mostrava sempre "nessun pasto oggi · mai attivo"
- Causa: la tabella `profiles` ha PK `id` (= `auth.users.id`), NON `user_id`. Le altre tabelle dati (`meals`, `supplements_log`, `workouts`, `body_logs`, ecc.) usano FK `user_id`. Il codice admin usava `u.user_id` per estrarre l'UUID da una row di `profiles` → sempre `undefined`
- Fix: sostituito `u.user_id` → `u.id` in 5 punti (sort, lookup lastActivity, lookup meals count, onclick openUserDetail, find profile in detail view). Query `.eq('user_id', userId)` sulle altre tabelle invariate (lì la colonna si chiama davvero così)
- Aggiunta nota schema in sezione "Admin panel" CLAUDE.md

**Fix cosmetici: timestamp futuro + slot capitalizzati (commit `91be039`)**
- `timeAgo()`: diff negativa → "appena ora" invece di "in futuro" (gestisce skew clock)
- Nuova funzione `formatSlot(slot)`: `SNACK_POMERIGGIO` → `Snack pomeriggio` (underscore→spazio, capitalize first letter). Applicata a meals e supplements nelle liste "Ultimi 10". Rimosso `text-transform:uppercase` dal CSS `.item .slot`

**Card "Calorie oggi" nel dettaglio utente (commit `88d33d2` + `1618347` + `c683fe7`)**
- Nuova sezione tra "Profilo" e "Pasti ultimi 7 giorni"
- Riga 1 grande: "1.240 / 1.600 kcal" (consumate / target). Riga 2 grigia: "−360 kcal rispetto al target" / "+240 kcal" / "In linea con il target"
- Barra progresso orizzontale: si riempie fino alla % consumata, sopra 100% diventa ambra `#D97706` e si limita visivamente al 100% di larghezza
- Macro target sotto la barra kcal: Carboidrati / Proteine / Grassi (ordine C-P-G coerente con resto app) — solo macro con target > 0
- Formattatore numeri manuale via regex (separatore migliaia italiano deterministico, indipendente da ICU del browser): `1240 → 1.240`, `360 → 360` (sotto 1000 senza separatore)
- Fallback `target_kcal || 1900` come fa zona-tracker. Se target_kcal mancante: mostra solo "X kcal oggi" + "Target non impostato" (no barra)
- Verificato che zona-tracker.html usa colonne `protein`, `carbs`, `fat` su tabella `meals` (non `protein_g` o altre varianti)

**Logica residua kcal e macro su Home + Nutrition Oggi (commit `5c93494` + `a4b4152`)**
- Modello mentale: "ti restano 1.441 kcal" invece di "hai consumato 885 di 2.326" (ispirato MyFitnessPal/Lifesum/Yazio)
- 3 zone modificate in zona-tracker.html:
  1. **Home card riepilogo**: ring SVG si svuota (parte 100%, scende). Centro: numero grande = rimaste, sotto "rimaste"/"oltre"/"target raggiunto", terza riga "X / Y" grigio. Barre macro orizzontali (`mBar`) anch'esse residue: barra al 100% all'inizio, si svuota man mano. Testo per macro: "150g rimasti" / "+12g oltre"
  2. **Home tile Nutrition (MODULI · OGGI)**: numero grande = kcal rimaste. Riga "885 / 2.326 consumate" piccola grigia. Riga macro "C Xg P Xg G Xg rimasti" (con + se over, ambra). Pill laterale ridisegnata: "ZONA" verde / "FUORI ZONA" ambra / "—" giallo se no data (rimosso "OFF 40·30·30")
  3. **Nutrition Oggi heroCard**: stesso pattern del Home ma a dimensioni maggiori (170×170 ring). Numero grande 28px, sub "kcal rimaste". Riga laterale: "Target: 2.326 · Consumate: 885". Pillole macro CARBO/PROT/GRASSI: numero grande = grammi rimasti + label "rimasti" / "oltre target". Mini-barre interne residue. `motivMsg` AI mantenuto invariato come da vincolo
- Helper globali aggiunti: `fmtNum`, `kcalRimaste`, `macroRimasti`, `isOverTarget` + costante `OVER_COLOR = #B45309` (ambra scuro per stato "oltre target")
- Edge case: target raggiunto esatto → sub label "target raggiunto"; nessun pasto → barra/anello 100% pieni; over target → numero "+X" ambra, anello/barre vuote
- Dedup pill "Zona/Fuori Zona": rimossa duplicazione dal centro anello heroCard (era anche nella riga `zonaRowHTML` sotto le 3 macro card). Mantenute le pill in alto Home, pill sotto heroCard, e pill per pasto nella timeline
- Piano/Storico/Integratori restano in logica accumulativa per ora (fuori scope del refactor)

**Note operative**
- Tester WhatsApp riattivazione: messaggio inviato 11 mag 2026 a Ginevra e Isabella con richiesta di log costante + feedback strutturato per 2 settimane
- App live versione `APP_VERSION` corrispondente a ultimo commit
- Nessuna modifica a schema Supabase, AI prompts, Worker, schema dati esistente

### 10 maggio 2026 — Design Session: visione AI, sistema design, onboarding M1, home post-onboarding

**Lavoro svolto in chat dedicata Claude Design "Zona Tracker"** (mockup visivi non in repo, consultabili nel progetto Claude Design). Niente codice scritto in zona-tracker.html — è una sessione di design product/UX che definisce le fondamenta visive e di flusso per le prossime implementazioni.

**Architettura visione AI confermata**
- App = assistente personalizzato. AI al centro, 3 momenti: Onboarding → Vita quotidiana → Checkpoint periodico
- Onboarding a 2 momenti: M1 base 7 step (~3 min, conversazionale) + M2 check fisico (~5-7 min, form-style)
- AI elabora dati → genera 2 piani collegati: nutrizione (Zone, supplementi Nutrilite dal catalogo) + allenamento
- Modulo Body = punto di entrata e checkpoint del percorso AI, tinta viola scuro `#5E4A7A`

**Sistema design confermato (sostituisce le scelte precedenti)**
- Font: **Syne** (sans/display) + **JetBrains Mono** (numeri/label) — NON Manrope
- Sfondo bone caldo `#F5F3EE`
- Accent evergreen `#2A7A6F`
- Macro food-coded: carb amber `#BA7517`, prot evergreen, fat terracotta `#B84C2A`
- Tinte moduli (nuova palette UI): Nutrition ambra `#FAC775`, Training azzurro `#B5D4F4`, Body viola `#AFA9EC`

**Auth — migrazione confermata**
- Magic Link → OTP via email (più affidabile su iOS Safari)

**ONBOARDING M1 — 9 schermate progettate (iOS+Android)**
1. **Welcome screen** — "Nutrizione, allenamento e progressi. Tutto in un percorso." + CTA "Crea il tuo percorso →"
2. **Auth Step 1** — schermata fluida 2 stati: email → codice OTP, pillola email persistente
3. **Step 2a** — "Iniziamo da te" — nome+cognome affiancati + frase sistema "Ogni percorso comincia da chi sei oggi."
4. **Step 2b** — "Parlaci di te" — anagrafica (età, sesso M/F/Altro, altezza) + peso (attuale, obiettivo) + frase "I numeri dicono dove sei e chi potrai diventare."
5. **Step 3** — "Definiamo l'obiettivo" — 6 card 2x3, multi-select max 2, nessun check, frase "Definire la meta è già metà del cammino."
6. **Step 4** — "Il tuo livello" — scrollabile, 5 card attività + 4 card esperienza, sticky CTA, frase "Sapere da dove parti rende il viaggio più chiaro."
7. **Step 5** — "Come mangi" — 5 card stile alimentare + 16 pillole intolleranze raggruppate in 3 sotto-gruppi (Allergie/Esclusioni/Sensibilità) + Altro con campo libero, frase "Quello che escludi conta quanto quello che scegli."
8. **Step 6** — "Cosa devo sapere" — 12 pillole limitazioni in 3 sotto-gruppi (Schiena/Articolazioni/Condizioni) + Altro, frase "Niente di importante si costruisce ignorando i segnali."
9. **Step 7** — "Ci siamo, Ignazio." — esito caldo, lista FOTO/MISURE/ESAMI, frase "Ecco il tuo primo vero passo.", bottoni "Inizia il check fisico →" + "Salta per ora"

**Pattern di design ricorrenti dell'onboarding**
- Tono variabile per step + 6 regole di coerenza (tu, max 1 riga domanda, niente esclamativi, niente emoji, riassicurazioni piccole sotto, nome solo step 2a + 7)
- Frasi di sistema in italics 14px `--t3` ad ogni step (mantra Zona Tracker, scritte da noi, da rinnovare nel tempo via dizionario centralizzato)
- Progress bar 7 segmenti che cresce step per step
- Stile conversazionale per tutto M1
- Allineamento sinistra
- iOS + Android sempre coerenti

**HOME post-onboarding — 1 schermata progettata**

4 zone:
- **Zona 1**: saluto "Buongiorno, Ignazio" + data mono uppercase
- **Zona 2**: 3 card moduli asimmetriche (Nutrition alta con anello kcal+macro, Training compatta senza orario "Sessione Upper" + settimana, Body compatta "78,4 kg ↓ −0,6" + checkpoint)
- **Zona 3**: pannello "PROSSIMA AZIONE" dinamico ("È ora del workout/pranzo/integratori..." linguaggio utente non tecnico) con titolo + descrizione + mini-box "DOPO L'ALLENAMENTO" + bottone "Inizia il workout →"
- **Zona 4**: tab bar pill 4 elementi (Home/Nutr/Train/Body) + avatar profilo IF in alto a destra

**Logica "PROSSIMA AZIONE"**
- Cambia in base allo stato logico (non orari hardcoded)
- L'AI legge: profilo orari utente + stato in tempo reale (cosa già fatto oggi) → decide cosa mostrare
- Linguaggio utente: workout, colazione, pranzo, cena, snack, integratori (NO "attivazione", NO "sessione DUP")
- 3 stati progettati come riferimento: mattina pre-workout / pomeriggio integratori / sera riepilogo

**Implicazioni per il codice (nessuna modifica ancora applicata)**
- Sistema design attuale (Manrope + palette verde-blu-marrone moduli) è **legacy** rispetto a quanto deciso il 10 maggio. Da migrare in fase di implementazione.
- Onboarding attuale (5 step, vedi `ST.onbStep`) **sarà sostituito** dai 7 step M1 + M2 separato.
- Sezione "Design system" più sopra in questo file riflette lo stato del codice corrente, NON le decisioni del 10 maggio. Aggiornare quando il refactor parte.

### 10 maggio 2026 (pomeriggio) — Design Session: Onboarding Momento 2 (M2 · check fisico)

**Lavoro svolto in chat dedicata Claude Design "Zona Tracker"** (mockup visivi non in repo, consultabili nel progetto Claude Design). Continuazione della design session del mattino: stessa giornata, stesso sistema design.

**Stato**: 9 schermate su 11 disegnate. Implementazione su `zona-tracker.html` rimandata: si chiude prima il design completo di M2, poi si porta a Claude Code in un'unica feature compatta.

#### Convenzioni globali stabilite oggi (valide su tutta l'app)

- **"coach"** sostituisce **"AI"** in tutta la UI (copy, label, microcopy, frasi di sistema). Da applicare anche al codice esistente in fase di refactor.
- **Validità esami del sangue**: 1 mese (30 giorni). Esami più vecchi → bridge informativo, M2 si chiude senza compilazione esami.
- **Storage foto check fisico**: Supabase Storage bucket privato + accesso via signed URL temporanei.

#### Flusso M2 — 11 schermate (ordine canonico)

L'utente arriva da step 7 di M1 cliccando "Inizia il check fisico →" (oppure "Salta per ora" rimanda M2).

1. **Foto · Istruzioni** (✅ disegnata)
   Header `CHECK FISICO · FOTO` · titolo "4 foto del corpo" · sottotitolo "Le foto restano private." · mantra italics "Più sei preciso ora, più il tuo coach lavora bene." · 3 regole su hairline:
   - **Abbigliamento**: Intimo o costume.
   - **Luce**: Naturale, frontale (finestra davanti). Niente flash, niente luci dall'alto.
   - **Postura**: Corpo intero, piedi inclusi. Braccia leggermente staccate dal busto. Sfondo neutro. Telefono ad altezza vita.

   Nota privacy: "Foto private, visibili solo a te, usate per i checkpoint con il tuo coach." · CTA "Iniziamo →"

2. **Foto · Posa frontale** (✅ disegnata)
   Titolo "Posa frontale" · sottotitolo "Davanti, in posizione naturale." · dropzone tratteggiata evergreen con due righe centrate:
   - Riga 1 mono uppercase evergreen: `IN PIEDI · FRONTE ALLA FOTOCAMERA · BRACCIA STACCATE · PIEDI PARALLELI · SGUARDO IN AVANTI`
   - Riga 2 mono uppercase grigio: `TAP PER CARICARE LA FOTO`
   - CTA "Scegli foto"
   - **Nessuna silhouette dentro la dropzone** (scartata dopo iterazioni: manichino stilizzato sembrava robot, anatomico realistico scivolava nel medico/strano)

3. **Foto · Posa lato destro** (✅ disegnata)
   Titolo "Posa lato destro" · sottotitolo "Lato destro verso la fotocamera." · dropzone: `DI LATO · LATO DESTRO VERSO LA FOTOCAMERA · BRACCIA RILASSATE · PIEDI UNITI · SGUARDO IN AVANTI`

4. **Foto · Posa lato sinistro** (✅ disegnata)
   Speculare a 3: `DI LATO · LATO SINISTRO VERSO LA FOTOCAMERA · BRACCIA RILASSATE · PIEDI UNITI · SGUARDO IN AVANTI`

5. **Foto · Posa retro** (✅ disegnata)
   Titolo "Posa retro" · sottotitolo "Spalle verso la fotocamera." · dropzone: `DI SPALLE · RETRO VERSO LA FOTOCAMERA · BRACCIA STACCATE · PIEDI PARALLELI · SGUARDO IN AVANTI`

6. **Foto · Conferma (griglia + vista grande)** (✅ disegnate entrambe)
   - **6a Griglia 2×2**: titolo "Foto pronte" · sottotitolo "Rivedi e conferma per andare avanti." · 4 miniature in griglia 2×2 con label sotto ognuna (FRONTALE / LATO DX / LATO SX / RETRO) · hint "Tocca una foto per rivederla o rifarla." · CTA "Conferma e continua →"
   - **6b Vista grande**: full-screen modal · X di chiusura in alto a sinistra · label posa centrale uppercase mono · foto grande (placeholder bone scuro nel mockup) · 2 CTA affiancate full-width: **Rifai** (outline evergreen) / **Tieni** (pieno evergreen)

7. **Misure · Peso e altezza** (✅ disegnata)
   Header `CHECK FISICO · MISURE` · **switch unità in alto a destra** `KG·CM / LB·IN` (auto-detect dalla lingua del telefono al primo caricamento, le altre 2 schermate Misure ereditano la scelta). Solo qui c'è lo switch.

   Titolo "Peso e altezza" · sottotitolo "Servono al coach per partire." · mantra italics "Più sono precise, meglio funziona tutto il resto." · 2 campi:
   - **PESO** (placeholder `74,5 KG`) — tip: "Al mattino, a digiuno, dopo il bagno."
   - **ALTEZZA** (placeholder `178 CM`) — tip: "Scalzo, schiena dritta contro un muro."

   CTA "Continua →"

8. **Misure · Circonferenze** (✅ disegnata)
   9 campi in ordine di importanza, con asterisco evergreen sui obbligatori:
   - **Obbligatori (3, asterisco)**: VITA `*` · PETTO `*` · FIANCHI `*`
   - **Opzionali (6)**: SPALLE · COLLO · BICIPITE · POLSO · COSCIA · POLPACCIO

   Titolo "Circonferenze" · sottotitolo "Metro morbido, aderente ma non stretto." · nota "*I campi con asterisco sono obbligatori. Gli altri puoi saltarli."

   Pattern campo: label mono + asterisco se obbligatorio + icona ⓘ piccola **senza cerchio** (cliccabile, apre illustrazione del punto di misurazione — illustrazioni da produrre in fase implementativa) + valore Syne grande + unità mono attenuata + tip Syne 14px sotto.

   Tip per campo:
   - VITA: "Punto più stretto, sopra l'ombelico."
   - PETTO: "Sotto le ascelle, alla parte più sporgente."
   - FIANCHI: "Punto più largo dei glutei."
   - SPALLE: "Parte più larga, da deltoide a deltoide."
   - COLLO: "Sotto il pomo d'Adamo, rilassato."
   - BICIPITE: "Braccio rilassato, nel punto più ampio."
   - POLSO: "Subito sopra l'osso, mano rilassata."
   - COSCIA: "Parte più alta, sotto la piega del gluteo."
   - POLPACCIO: "Parte più larga, a metà polpaccio."

   CTA sticky "Continua →" con sfumatura morbida bone→trasparente sopra (40-60px) + padding scroll bottom (~80-100px) per evitare che la CTA copra l'ultimo campo.

9. **Misure · Composizione bilancia** (✅ disegnata)
   Tutti i 5 campi opzionali (richiedono bilancia bioimpedenziometrica). Nessun asterisco.

   Titolo "Composizione" · sottotitolo "Se hai una bilancia bioimpedenziometrica." · nota "Tutti i campi sono opzionali. Puoi saltare se non hai questi dati." · mantra italics in fondo: "Anche un dato in più aiuta il coach a leggerti meglio."

   Campi:
   - GRASSO CORPOREO (`%`) — "Percentuale di massa grassa."
   - MASSA MUSCOLARE (`KG`) — "Peso totale dei muscoli."
   - GRASSO VISCERALE (no unità, indice 1-30) — "Indice 1-30. Sotto 10 è ottimale."
   - ETÀ METABOLICA (`ANNI`) — "Età stimata dal tuo metabolismo."
   - ACQUA (`%`) — "Percentuale di acqua corporea."

   CTA doppia in basso (sticky, sfumatura come step 8): **Salta** (outline evergreen, sinistra) · **Continua →** (pieno evergreen, destra).

10. **Esami · Gate Sì/No** (❌ DA DISEGNARE — settimana prossima)
    Domanda "Hai fatto esami del sangue nell'ultimo mese?" · 2 risposte (layout in valutazione: card affiancate / pulsanti impilati / pillole conversazionali).
    - Sì → schermata 10b (compilazione)
    - No → schermata 10c (bridge)

11. **Esami · Compilazione (ramo Sì)** (❌ DA DISEGNARE — settimana prossima)
    Tutti i campi singolarmente skippabili (l'utente potrebbe non avere tutti i parametri). Due gruppi:
    - **Gruppo "Da esame base / AVIS" (8 parametri)**: emoglobina, ferritina, glicemia, colesterolo totale, HDL, trigliceridi, creatinina, ALT
    - **Gruppo "Se li hai anche" (3 parametri opzionali)**: vitamina D, B12, TSH

    **Schermata 10c — Bridge ramo No** (❌ DA DISEGNARE): "Nessun problema. Per ora andiamo avanti — ti ricorderemo di farli al prossimo checkpoint." → fine M2.

12. **Esito M2** (❌ DA DISEGNARE — schermata di chiusura check fisico, ponte verso home/coach)

#### Decisioni di design consolidate (valide per tutto M2)

- **Pattern campi numerici**: tastiera numerica nativa, label mono uppercase sopra, valore Syne grande, unità mono attenuata a destra, tip Syne 14px sinistra sotto. Nessuna card, separazione tra campi via spacing + hairline sottile.
- **Switch unità (KG·CM / LB·IN)**: solo nella schermata 7 (peso+altezza), le altre 2 Misure ereditano. Default: auto-detect dalla lingua del telefono.
- **Asterisco obbligatori**: evergreen `#2A7A6F`, accanto al label, con nota chiarificatrice in alto sulla schermata.
- **Icona ⓘ**: piccola, senza cerchio, grigio attenuato. Aprirà runtime un'illustrazione del punto di misurazione (illustrazioni da produrre in implementazione).
- **CTA sticky in fondo**: sempre con sfumatura morbida bone→trasparente sopra (40-60px) + padding scroll (~80-100px) per evitare che la CTA copra l'ultimo campo.
- **Niente progress bar in M2**: contesto diverso da M1, niente conteggi numerici delle schermate.
- **Stile copy**: tu, max 1 riga di domanda, niente esclamativi, niente emoji, mantra italics 14px (`--t3`) come negli step M1.
- **Tinta modulo**: M2 non ha tinta dedicata propria; usa il sistema globale (bone + evergreen). La tinta viola scuro `#5E4A7A` è riservata al checkpoint AI ricorrente del modulo Body.

#### Foto — gestione tecnica

- **Upload**: `<input type="file" accept="image/*">` nativo. iOS/Android aprono picker che mostra opzioni Fotocamera / Galleria. **Nessuna fotocamera in-app custom** — scarta complessità getUserMedia, timer, retry per zero valore aggiunto.
- **Conferma**: tap su miniatura nella griglia 6a → modal vista grande 6b → "Rifai" (riapre picker per quella posa) o "Tieni" (chiude modal).
- **Storage**: Supabase Storage bucket privato + accesso via signed URL a scadenza.
- **Le 4 foto sono tutte obbligatorie**, nessuna saltabile, ognuna rifacibile prima di "Conferma e continua →".

#### Set finale misure (decisione utente, ridotto rispetto al briefing iniziale)

- **Antropometriche obbligatorie (5)**: peso, altezza, vita, petto, fianchi
- **Antropometriche opzionali (6)**: spalle, collo, bicipite, polso, coscia, polpaccio
- **Composizione bilancia opzionali (5)**: BF%, massa muscolare kg, grasso viscerale (indice 1-30), età metabolica, acqua %

#### Set finale esami ematici

- **Base "Da AVIS / esame del sangue base" (8)**: emoglobina, ferritina, glicemia, colesterolo totale, HDL, trigliceridi, creatinina, ALT
- **Opzionali "Se li hai anche" (3)**: vitamina D, B12, TSH
- Tutti singolarmente skippabili.

Razionale: i parametri del gruppo base sono coperti da una donazione AVIS gratuita e sufficienti a impattare le raccomandazioni nutrizione/training. Vitamina D, B12, TSH richiedono richiesta separata al medico ma sono molto utili per integrazione e metabolismo.

#### Decisioni rimaste in sospeso (da chiudere settimana prossima)

- Layout schermata gate esami Sì/No (3 opzioni in valutazione: card affiancate / pulsanti impilati / pillole conversazionali)
- Copy esatto della domanda gate
- Layout schermata compilazione esami (ramo Sì): pattern campi, gerarchia visiva tra gruppo base e opzionali
- Layout bridge ramo No
- Layout esito M2 finale (chiusura del check fisico)
- Schema tabelle Supabase per `body_check_photos`, `body_measurements`, `blood_tests` — da definire prima dell'implementazione

#### Implicazioni per il codice (nessuna modifica ancora applicata)

- Schermate M2 da implementare ex novo in `zona-tracker.html` quando il design sarà completo (11/11 schermate)
- Supabase Storage bucket privato `body-check-photos` da creare con RLS appropriata
- Tabelle nuove o estensione di `body_logs` esistente per accogliere il nuovo set di misure (decisione di schema in sospeso)
- Tabella nuova `blood_tests` per i parametri ematici con timestamp validità
- Migrazione "AI" → "coach" in tutto il codice esistente (UI strings) da pianificare come task separato di refactor copy
- Lo switch unità KG·CM / LB·IN richiede preference utente persistente (su `profiles` o su `localStorage` come l'attuale `unit` Training)

### 9 maggio 2026 — Modulo Training: GIF recupero, grafico Progressione, dropdown esercizi

**GIF esecuzione opzionale nel modal recupero**:
- Aggiunto toggle "▶ Mostra esecuzione" / "▼ Nascondi esecuzione" sopra il blocco Esecuzione nel modal recupero
- Default chiuso. Tap espande la GIF (max-height 320px, object-fit contain)
- Nuova cache globale `ST.exerciseGifCache: { [exName]: { url, status } }` (persistente nella sessione)
- Pre-fetch silenzioso via `ensureRestGif(exName)` chiamata in `startTrainingCountdown` (no-op se cache già popolata)
- Bottone NON appare se `status !== 'cached'` o GIF mancante (es. esercizi Active Recovery)
- Stile coerente evergreen: `.rest-gif-toggle` background `#E6F4F2` color `#1F5C53`
- Riusa `fetchExerciseMedia(exName)` esistente — stessa sorgente del modal info, no duplicazione
- Stato `cd.gifOpen: false` aggiunto in `ST.trainCountdown`. Funzione `toggleRestGif()`

**Tab Progressione — grafico al posto delle card sessione**:
- Stack lunghissimo di card "data + S1/S2/S3..." rimosso, sostituito da grafico SVG vanilla
- Logica chart: ≤8 punti = barre verticali, >8 punti = linea + dots cliccabili. Width 100%, viewBox 320×180, mobile-first
- 3 chip toggle metrica sopra il grafico:
  - Esercizi normali: **Peso** (default) / Reps / Volume
  - Esercizi `iso:true` temporali: **Peso** (default) / Tempo (no Volume)
- Asse Y dinamico: lbs / reps / sec / reps×lbs
- 3 stat card sotto: Best peso assoluto, Best reps/tempo, Ultimo (data + valore metrica)
- Helper `bestSetOfDay(logs)`: peso desc → reps desc come tiebreaker. Stesse 3 metriche derivano dalla stessa serie vincente
- Stato `ST.trainProgMetric: 'peso'` (default)
- Tap su barra/dot → apre modal day-detail filtrato sull'esercizio (vedi sotto)
- Edge cases: 0 sessioni → "Nessuna sessione registrata", 1 sessione → 1 barra (no errore)

**Modal "Dettaglio giorno" (sostituisce delete-confirm immediato del calendario)**:
- Tap su giorno calendario → modal dettaglio (NO più conferma elimina diretta)
- Header: data formattata "Gio 8 mag" + nome sessione (es. "Upper A")
- Lista esercizi raggruppati per nome, ognuno con righe S1/S2/S3 (reps + resistance + RIR)
- Per ogni serie: matita ✏️ (edit inline) + cestino 🗑️ (delete con conferma)
- Edit inline: 3 input (reps + resistance + RIR) + ✓/✕. Update simultaneo su `training_logs` + `workout_sets`
- Bottone "🗑️ Elimina intero workout" in fondo (rosso `#B84C2A`, conferma sopra)
- Nuovi state: `trainDayDetail`, `trainDayLogs`, `trainEditLogRow`, `trainDeleteSetConfirm`, `trainDeleteWorkoutConfirm`
- Rimosso vecchio state `trainCalDeleteConfirm` (sostituito dal flusso modal)
- Z-index modali: day-detail 1100, conferme 1200 (sopra)
- Apertura da chart click: stesso modal con filtro `exName` (mostra solo serie di quell'esercizio)
- Refresh automatico dopo edit/delete: re-fetch logs modal + `loadTrainingLogs(exName)` + `loadTrainingAllCompleted` per stats calendario

**Dropdown selezione esercizio (sostituisce chip-row orizzontale)**:
- Bottone trigger full-width: `ESERCIZIO: [nome] ▾` con border `#185FA5` quando aperto
- Pannello aperto: search bar (`font-size:16px` no auto-zoom iOS) + 2 mini-pill tab + lista scrollabile max-height 60vh
- Tab "Per programma" (default): gerarchico per sessione (Upper A/B, Lower A/B, Recovery Upper/Lower) con esercizi della scheda corrente. Header "PROGRAMMA ATTUALE" + placeholder "PROGRAMMI PASSATI" (preparato FASE 2)
- Tab "Per esercizio": lista alfabetica IT (`localeCompare('it')`) di TUTTI gli esercizi mai loggati dall'utente (distinct da `training_logs.exercise_name`). Mostra anche nomi esercizi vecchi non più nel programma attuale
- Search filtra in tempo reale entrambe le tab. Restore focus + caret a fine via `setTimeout`
- Default selection automatica: primo esercizio alfabetico tra quelli loggati (no più stato vuoto all'apertura tab)
- Esercizio selezionato: background `#E8F0FA` + border-left 3px `#185FA5` + ✓ a destra. Touch area min 44px
- Click outside / ESC / tap su trigger aperto → chiude (overlay invisibile fixed inset:0 z-index 240, pannello z-index 250)
- Nuovi state: `trainProgDropdownOpen`, `trainProgDropdownTab`, `trainProgDropdownSearch`, `allExerciseNamesCache` (lazy load + cache)
- Cache invalidata da `saveTrainingSet`, `deleteSetConfirmed`, `deleteWorkoutConfirmed` (lista può cambiare). Edit non invalida (non cambia il nome)
- ESC handler globale registrato una volta sola (riga ~7280)

**FASE 2 documentata in commento HTML inline** (nella sezione "Programmi passati" del dropdown):
- Tabella Supabase `programs`: id, user_id, nome, data_inizio, data_fine (nullable), struttura sessioni JSON, created_at
- Colonna `program_id` su tabella `workouts`
- UI per chiudere programma attuale e iniziarne uno nuovo (modulo Body o pannello admin)
- Lista programmi archiviati collassabili nel dropdown
- Filtro grafico per periodo programma quando esercizio selezionato da programma archiviato
- Invalidare cache anche dopo chiusura/cambio programma

### 8 maggio 2026 — Audit training completo + rotazione 6 giorni + riposi extra

**Audit setup esercizi (Step 1)**:
- Tutti i 26 `setup` (20 core + 6 recovery) convertiti da string a `string[]` per leggibilità
- Renderer modal aggiornato per gestire array → `<ul class="modal-list">`
- Glute bridge isometrico: reps da `'30 sec per lato'` a `'20-30 sec per lato'` (range temporale)

**Audio countdown + auto-close modal recupero (Step 2)**:
- `playFinalTripleBeep` rinforzato: 3 beep a 880Hz, gain 0.9, durata 220ms, gap 200ms (cycle 420ms)
- `playPrepBeep` invariato (5,4,3,2,1 a 600Hz)
- Auto-close modal "PRONTO!" 1s dopo `playFinalTripleBeep` (chiusura via `skipCountdown`)
- Suggerimento progressione `getProgressionSuggestion` mostrato nel modal recupero sotto `<h2 class="rest-ex-name">`, classe CSS `.rest-suggestion` (sfondo verde tenue #E6F4F2)
- `scrollToActiveExercise()` nuova funzione: dopo skipCountdown, scrolla la card del primo esercizio non completato al centro tramite `scrollIntoView({block:'center'})`. Card hanno `id="excard-${name_safe}"`

**Rotazione 6 giorni + riposo extra (Step 3+4)**:
- `SESSION_CYCLE` da 7 a 6 voci: `'rest'` rimosso dalla rotazione automatica
- `SESSION_DAY_NUM` ha 6 chiavi (G7 eliminato)
- Tab Piano: titolo `SPLIT — 6 GIORNI`, card G7 rimossa
- Nuovo box "Riposo extra opzionale" in fondo al Piano con 2 card separate:
  - 🌙 **Riposo scelto** (`markRestChosen`, session_type `rest`, button #9CA3AF)
  - 🩹 **Riposo per infortunio** (`markRestInjury`, session_type `rest_injury`, button #B84C2A, prompt zona corpo)
- `loadTrainingHomeData` e `loadSessionLastCompletion` ignorano `rest`/`rest_injury` nella rotazione (`.not('session_type','in','(rest,rest_injury)')`)
- DB: aggiunta colonna `note TEXT NULL` a tabella `workouts` per zona corpo infortunio (migration `ALTER TABLE workouts ADD COLUMN IF NOT EXISTS note TEXT NULL`)

**Calendario Progressione (Step 3)**:
- Sigle aggiornate: `UA`→`UP A`, `UB`→`UP B`, `LA`→`LO A`, `LB`→`LO B`, `recoveryUpper`→`REC↑`, `recoveryLower`→`REC↓`, `rest`→`REST`, nuovo `rest_injury`→`STOP`
- `SESS_COLOR` con `rest_injury:'#B84C2A'` (arancione)
- Tooltip celle infortunio mostrano la nota appuntata

**Progressione temporale + fix bug AI (Step 5)**:
- Nuova funzione `parseRepsRange(repsStr)` parser unificato: ritorna `{kind, min, max, perLato, unit}` per `'4-6'`/`'4-6 per lato'`/`'20-30 sec'`/`'20-30 sec per lato'`/`'30 sec'`. Skip su `'10 min'`/`'5-10 min'`
- `suggestProgressionAI`: branch dinamico per esercizi temporali con `unitLbl` ('reps'|'sec') e `stepUnit` (1|5). Non più "+1 rep su esercizi temporali"
- 5 regole prompt e esempi formato risposta usano unità dinamica

**Modal log esercizi temporali (Step 6)**:
- Per esercizi `iso:true` con reps temporali (parseRepsRange.kind==='seconds'):
  - Etichetta REPS → `DURATA (sec)`
  - Picker valori solo nel range esercizio con step 5 (es. Glute bridge: 20, 25, 30)
  - Blocco RIR nascosto (no senso per isometrici)
  - Card esercizio non mostra pill RIR (`(s.rir!=null && !isTimed)`)
- `paramsLine` "${sets}×${reps} · RIR · Recupero" rimossa dal modal scheda esercizio (`openExerciseAI`) — solo card sessione la mostra
- `saveTrainingSet` gestisce `rirEl=null` (DOM element non esiste su esercizi temporali)

**Rest fisso calibrato (Step 7)**:
- `getRestSec` ricalibrata per allenamento elastici a RIR 2:
  - Forza compound: 120s (no powerlifting puro)
  - Ipertrofia compound: 75s (target 60-90s)
  - Iso/accessori (entrambe sessioni): 60s
- Campi `rest` testuali in TRAINING_SESSIONS aggiornati: Forza `'2 min'`, Ipertrofia `'75 sec'`
- Card esercizio mostra recupero per ESERCIZIO specifico via `restSecToText(getRestSec(sel,e))` invece che a livello sessione

**Tab Piano → Programma (Step 8)**:
- Label tab rinominata `'Piano'` → `'Programma'` (id `piano` invariato per back-compat)
- Calcolo settimana ciclo basato su workout completati invece di giorni di calendario:
  - `validWorkoutsCount = ST.trainAllCompleted.length`
  - `currentWeek = Math.floor(N / 6) % 4`
  - 1 settimana = 6 workout veri completati. Riposi non contano.
- Nuova funzione `loadTrainingAllCompleted` carica workout completati esclusi `rest`/`rest_injury`. Chiamata da `showPage('training')`, refresh dopo `saveWorkoutRecord` e `deleteWorkout`
- `ST.trainAllCompleted` inizializzato a `[]` nello stato globale ST
- Bug fix: rimosso reference orfano a `startDate` nel template literal "CICLO 4 SETTIMANE" (vecchio calcolo basato su `train_start_date` rimosso ma reference dimenticato → ReferenceError che bloccava render della tab)

### 7 maggio 2026 — Cache GIF programma core completata (20/20)

Sistema exercise-media chiuso al 100% sul programma core. Tutti i 20 esercizi delle 4 sessioni principali (Upper A/B, Lower A/B) hanno una GIF cachata su Supabase Storage via Worker `zona-ai`. I 3 esercizi di Active Recovery (Mobilità, Stretching, Vacuum) restano senza media — pattern documentato.

**Architettura conferma**: 1 GIF per `exerciseId` ExerciseDB, riusabile fra più nomi italiani che mappano allo stesso esercizio (es. "Hip thrust con elastico" Day 2 Lower A + "Hip thrust con elastico TUT alto" Day 4 Lower B → entrambi puntano a `qKBpF7I.gif`).

**Stato Storage**: 19 file unici, ~1.54 MB su 1 GB free tier. 21 entry MATCH_DATA (20 core + 1 variante TUT).

**Pattern surrogati**: la maggioranza degli esercizi del programma usa elastici, ExerciseDB ne ha pochi → quasi tutti `isSurrogate: true` con `surrogateNote` in italiano che descrive solo le differenze rispetto alla GIF (equipment, setup, lateralità). Note brevi e concrete, niente preamboli.

**Commit di riferimento**:
- `8b0e963` Day 1 Upper A (5 esercizi)
- `9e98ad8` Day 2 Lower A (4 esercizi)
- `dca5847` Day 3 Upper B (6 esercizi)
- `9a975fa` Day 4 Lower B (5 esercizi) — chiusura programma core

### Sessione futura — Audit testi e parametri esercizi training

Da fare in blocco unico sui 20 esercizi di TRAINING_SESSIONS:

- **`setup` da string → string[]**: aggiornare il renderer del modal esercizio per gestire array (oggi è stringa singola)
- **Range temporali iso → tempo fisso**: esercizi `iso:true` con reps tipo "20-30 sec" o "12-15" da riconvertire a valore singolo
- **RIR su `iso:true` → null + nascondere badge**: esercizi isometrici non hanno RIR, va rimosso dalla card
- **Rest fisso unificato via `getRestSec()`**: 180s forza, 90s ipertrofia, 60s iso, 30s tra lati esercizi unilaterali
- **`surrogateNote` solo differenze vs GIF**: già fatto su tutti i 20 esercizi cachati il 7 maggio 2026
- **Bug `getProgressionSuggestion` ~riga 3185**: genera "N reps a 10 lbs" su esercizi temporali — la logica doppia progressione non va applicata a esercizi `iso:true` o con reps non-numeriche

NON applicare in singoli commit incrementali — pianificare in sessione dedicata con review esercizio per esercizio.

### 7 maggio 2026 — Day 3 Upper B: cache GIF (sessione 2)

**Cache exercise-media (Day 3 Upper B completo)**

11/20 esercizi cachati. 6 nuovi su Upper B:
- `Inverted row con elastico` → `Nu7jqFE` (resistance band seated straight back row, surrogate). Note: tu in piedi col busto inclinato 45°, non seduto.
- `Chest press inclinata su panca` → `Vh0GsK4` (cable incline chest press, surrogate). Note: tu sdraiato su panca inclinata 30-45° con elastico ancorato basso.
- `Lateral raise con elastico` → `DsgkuIt` (dumbbell lateral raise, surrogate). Note: elastico sotto i piedi al posto dei manubri.
- `Row inclinato in piedi busto 45°` → `eZyBC3j` (barbell bent over row, surrogate). Note: barra modulare con elastico al posto del bilanciere.
- `Curl bicipiti con elastico` → `XFc3vpY` (resistance band seated biceps curl, surrogate). Note: tu in piedi sopra l'elastico al posto che seduto.
- `Tricipiti overhead con elastico` → `2IxROQ1` (cable overhead triceps extension with rope, **NON-surrogate**). GIF già perfettamente rappresentativa, nessuna nota.

Storage Supabase ora a 15 file (~1.18 MB su 1 GB free tier).

**Decisione "non-surrogate" su Tricipiti overhead**

Primo esercizio del programma marcato `isSurrogate:false` con `surrogateNote:null`. La GIF cavi+corda doppia replica esattamente il setup elastico+corda (entrambi tirati dal basso, due maniglie indipendenti, traiettoria overhead bilaterale). Banner surrogato nel modal correttamente nascosto dalla condizione esistente `gifSrc && executionSurrogate && executionSurrogateNote` ([zona-tracker.html:4248](zona-tracker.html:4248)). Pattern riutilizzabile per esercizi futuri con match perfetto.

**Refinement schema `surrogateNote`**

Da Day 3 in poi le note seguono il principio "solo differenze rispetto alla GIF": una frase secca con cosa cambia (attrezzo o postura), niente ripetizione di setup/execution che sono già nelle sezioni statiche del modal. Le note dei 4 esercizi Day 2 Lower A erano già nel formato corretto, quindi nessuna retrofix necessaria.

**Roadmap residua sistema exercise-media**

- Day 4 Lower B: 5 esercizi da cachare (`Squat con elastico e talloni rialzati`, `Single leg Romanian deadlift con elastico`, `Hip thrust con elastico TUT alto`, `Leg curl con elastico sulla fitball`, `Calf raise con elastico`)
- Audit testi e parametri esercizi (vedi nota in sessione Day 2 Lower A: `getProgressionSuggestion` parser regex su `reps`, range tempo isometrico → tempo fisso, RIR su `iso:true` → null)

### 7 maggio 2026 — Day 2 Lower A: cache GIF + audit testo Glute bridge

**Cache exercise-media (Day 2 Lower A completo)**

9/20 esercizi cachati. 4 nuovi su Lower A, tutti surrogati ExerciseDB:

| Nome italiano | exerciseId | edbName | surrogate_note |
|---|---|---|---|
| Bulgarian split squat con elastico | `y8bYM8w` | band single leg split squat | "Aggiungi tallone posteriore sulla panca e tallone anteriore rialzato 3-5 cm per la versione bulgara." |
| Romanian deadlift con elastico | `kuMiR2T` | band stiff leg deadlift | "Tu impugna la barra modulare davanti alle cosce, presa pronata." |
| Hip thrust con elastico | `qKBpF7I` | barbell glute bridge | "Spalle sulla panca, elastico sopra le anche." |
| Glute bridge isometrico con cavigliera | `u0cNiij` | low glute bridge on floor | "Tenuta isometrica 30 sec con cavigliera al ginocchio ed elastico ancorato dal lato opposto. Una gamba per volta." |

Storage Supabase ora a 9 file (~668 KB su 1 GB free tier). Tutti `is_surrogate=true` (catalogo ExerciseDB non ha match canonici "bulgarian", "romanian deadlift" + band, o "hip thrust" non-on-knees).

Nota tecnica: durante la ricerca ho rilevato che `o6LqKKP` ("traditional barbell romanian deadlift", precedente top match per Romanian deadlift dal vecchio `match-results.json`) ora ritorna HTTP 404 sull'host `static.exercisedb.dev`. Sistema HEAD-check pre-download del Worker ha gestito correttamente il caso. Lezione: i match in `scripts/match-results.json` (snapshot 6 maggio 2026) possono diventare stali — sempre validare con HEAD HTTP prima di aggiungere a MATCH_DATA.

**Modifica testo Glute bridge isometrico (lowerA)**

- `reps`: `'20-30 sec'` → `'30 sec per lato'` (tempo fisso, esecuzione unilaterale)
- `setup` riscritto: chiarito "schiena a terra" (vs "spalle sulla panca" del Hip thrust) e l'ancoraggio elastico "a un punto laterale dal lato opposto" che genera la trazione anti-valgo
- `execution`: 3 step ora coprono il pattern unilaterale completo (sollevamento bacino + tenuta isometrica 30 sec + switch lato)
- `sets:3`, `iso:true`, `eq`, `commonErrors`, `muscles`, `alert` invariati

Audit parser `.reps` per nuova stringa "30 sec per lato":
- `suggestProgressionAI` regex `/^(\d+)-(\d+)(?:\s+per lato)?$/` non matcha → guard `return` ✓ (skip silenzioso, già succedeva con "20-30 sec")
- Branch recovery a riga 3808 gated da `s.type === 'Recupero'`, non riguarda lowerA ✓
- Render literale `${e.reps}` (righe 3844, 3941) → "3×30 sec per lato" leggibile ✓

**Bug pre-esistente identificato (non risolto)**

`getProgressionSuggestion` ([zona-tracker.html:3185](zona-tracker.html:3185)) usa `match(/^(\d+)/)` che estrae il primo numero da `reps` e suggerisce `"💡 Inizia con N reps a 10 lbs"`. Per esercizi isometrici (`reps='30 sec per lato'`, `'20-30 sec'`, ecc.) genera output nonsense ("30 reps"). Stesso comportamento esisteva con la stringa precedente "20-30 sec" → **non è regressione di questa modifica**, è bug pre-esistente.

Da fixare in sessione futura "audit testi e parametri esercizi" insieme a:
- Range tempo isometrico → tempo fisso (Mobilità, Stretching, Vacuum, Respirazione, Cat-Cow)
- RIR su esercizi `iso:true` → null + nascondere badge
- Recupero `'2-3 min'` → tempo fisso da `getRestSec()` unificato

### 6 maggio 2026 — Sistema exercise-media (cache GIF) + modal recupero ridisegnato

**1. Sistema exercise-media (cache GIF esercizi)**

Architettura nuova end-to-end per servire GIF animate degli esercizi tramite Worker Cloudflare + Supabase Storage:

- **Endpoint Worker**: `GET https://zona-ai.ignaziof23.workers.dev/exercise-media?name=<nome italiano>`
- **Tabella Supabase `exercise_media`** (PK `exercise_name_it`):

  | Colonna | Tipo | Note |
  |---|---|---|
  | `exercise_name_it` | text PK | nome italiano usato come chiave |
  | `exercisedb_id` | text | ID esercizio in catalogo ExerciseDB |
  | `cached_url` | text | URL pubblico Supabase Storage |
  | `status` | text | `pending`/`cached`/`missing`/`manual` (default `pending`) |
  | `is_surrogate` | boolean | true se la GIF mostra equipment/posizione diversi dal programma |
  | `surrogate_note` | text | nota mostrata in banner giallo nel modal |
  | `source` | text | `exercisedb` (default), `manual`, etc. |
  | `last_updated` | timestamptz | aggiornato automaticamente al PATCH |

- **Bucket Supabase Storage `exercise-media`** (public). File salvati come `{exercisedb_id}.gif` (NON con slug italiano) → la stessa GIF è riusabile fra nomi italiani diversi che mappano allo stesso esercizio EDB.
- **Costante `MATCH_DATA`** bundlata nel Worker (`worker/src/index.js`): mappa `nome italiano → { edbId, edbName, gifUrl, equipments, targetMuscles, isSurrogate, surrogateNote }`. Source of truth per le approvazioni manuali — solo gli esercizi presenti qui vengono cachati.

**Logica del Worker `/exercise-media`** (in ordine):
1. **Lookup MATCH_DATA**: se nome non presente → `{status:'missing'}` SENZA scrittura DB (no insert speculativo, evita stickiness se in futuro aggiungiamo il match)
2. **Cache check DB**: fast-path solo se `status='cached'` E `exercisedb_id` allineato al match corrente. Altrimenti riprocessa (overwrite)
3. **Metadata-sync**: nel fast-path, se `is_surrogate` o `surrogate_note` in DB differiscono da MATCH_DATA → PATCH solo quei campi + `last_updated` (no re-download GIF). Risposta include `meta_synced: true/false`
4. **HEAD check Storage**: se `{edbId}.gif` esiste già su bucket → skip download/upload (riuso file)
5. **Cold path**: download da `https://static.exercisedb.dev/media/{edbId}.gif` → upload a `exercise-media/{edbId}.gif` con `x-upsert:true` → upsert riga DB con `status='cached'`

**Auto-recovery**: estendere MATCH_DATA con un nuovo esercizio (deploy Worker) → al primo trigger viene processato e cachato. Cambiare `surrogateNote` o `isSurrogate` → metadata-sync propaga al prossimo trigger. **Nessun cleanup manuale necessario**.

**Repo Worker**: `~/benessere-forma/worker/`
- `wrangler.toml`: `name="zona-ai"`, `account_id`, `compatibility_date="2024-09-01"`, `main="src/index.js"`. Niente secrets in chiaro.
- `src/index.js`: routing `POST /` → proxy Groq esistente (invariato), `GET /exercise-media` → nuova logica
- `.dev.vars` (gitignored): `API_KEY` (Groq) + `SUPABASE_SERVICE_ROLE_KEY`
- `.gitignore`: `.dev.vars`, `node_modules/`, `.wrangler/`
- `setup-supabase-secret.sh`: script una-tantum per impostare il secret Cloudflare via `wrangler secret put` con input silenzioso (`read -rs`, no echo, no shell history)

**Secrets Cloudflare** (visibili via `npx wrangler secret list`, valori mai esposti):
- `API_KEY` (Groq, già presente)
- `SUPABASE_SERVICE_ROLE_KEY` (nuovo, aggiunto via script)

**2. 5 esercizi cachati Day 1 Upper A** (sessione completa)

Selezionati esercizio-per-esercizio con review manuale dei candidati ExerciseDB:

| Nome italiano | exerciseId | edbName | is_surrogate | surrogate_note |
|---|---|---|---|---|
| Trazioni alla sbarra | `lBDjFxJ` | pull-up | false | — |
| Chest press in piedi con elastico | `4x5Okof` | resistance band seated chest press | true | "Movimento simile, qui mostrato seduto. Eseguilo in piedi." |
| Shoulder press in piedi con elastico | `peAeMR3` | band shoulder press | true | "Eseguilo con entrambi i piedi sull'elastico per maggiore tensione e stabilita." |
| Row in piedi con elastico | `4f8RXP8` | cable standing row (v-bar) | true | "Esegui con barra lunga e presa larga pronata (la GIF mostra presa stretta a V)." |
| Face pull con elastico | `ZfyAGhK` | cable standing rear delt row (with rope) | false | — (cavi vs elastico = differenza ovvia, niente banner) |

**Tooling per il matching futuro** (`scripts/`):
- `fetch-exercisedb.mjs`: scarica catalogo completo ExerciseDB (1500 esercizi, paginazione `?after=<cursor>`, delay 500ms anti-rate-limit)
- `exercisedb-catalog.json`: snapshot del catalogo (1.4 MB)
- `match-exercises.py`: matching keyword-based dei 20 esercizi del programma
- `match-results.json`: risultati top-5 per esercizio
- `test-image-gen-v[1-4].mjs`: esperimenti AI image generation (Cloudflare Workers AI / Flux / SDXL) — esplorati e poi accantonati a favore di ExerciseDB per la qualità/coerenza visiva

**3. Integrazione modal scheda esercizio (`openExerciseAI`)**

GIF dal Worker prioritaria su Wger PNG (`executionImg`), fallback automatico se Worker non risponde.

- Nuovi campi in `ST.exerciseAIOpen`: `executionGif`, `executionLoading`, `executionStatus` (`'cached'`/`'missing'`/`'error'`/`'not_searched_yet'`), `executionSurrogate`, `executionSurrogateNote`
- Helper `fetchExerciseMedia(exName)` chiama Worker, mai throw, sempre `{status:'error'}` se network fail
- Skeleton animato `.ex-media-skeleton` durante caricamento (gradient grigio + animazione)
- Banner surrogato giallo `.ex-surrogate-banner` con icona ⓘ inserito DOPO la grid e PRIMA del Setup, **solo se `gifSrc` presente E `executionSurrogate=true`**
- Layout colonna destra (priorità): GIF Worker > skeleton (loading) > Wger PNG single > Wger PNG array multi-frame > vuoto
- Wger fallback array 2-frame mantiene il layout esistente con `1. POSIZIONE INIZIALE` / `2. POSIZIONE FINALE`
- Cache hit fra modal: aprire scheda esercizio una volta → cue cached → al recupero successivo nessuna chiamata AI
- **Footer "Mappe muscolari da Wger.de — CC BY-SA 4.0" rimosso** dal modal (e regola CSS `.modal-footer` cancellata). Attribuzioni spostate nella sezione Crediti del modal Impostazioni profilo.

**4. Modal recupero (rewrite completo)**

Eliminata vecchia UI con tip random ("Vacuum addominale espira tutto…", Cat-Cow, ecc.) e fasi testuali (Recupero attivo / Prossimo esercizio / Quasi pronto). Nuovo design:

- **Modal full-screen** con sticky bar in alto (`position:sticky; top:0`) sempre visibile durante scroll
- **Sticky bar layout**: CSS Grid `1fr auto 1fr` → numero countdown **centrato orizzontalmente**, bottone "Salta ⏭" allineato a destra
- **Sezioni body** (scrollable, in ordine):
  - Nome esercizio (h2, no sessionLabel)
  - Esecuzione (lista numerata `<ol>` da `TRAINING_SESSIONS[sessionId].exercises[i].execution`)
  - Errori comuni da evitare (lista bullet `<ul>`)
  - Alert protezione (condizionale, solo se `ex.alert` presente)
  - 🤖 AI Coach (con loading state se cue non ancora cached)
- **Done state "PRONTO!"** identico al precedente (icona 💪 + bottone OK)
- **Color shift** ultimi 10 sec mantenuto sul numero della sticky bar (da blu a rosso)

**Cache AI Coach cue persistente** — nuovo `ST.aiCue: { [`${sessionId}_${exName}`]: cueText }`:
- Helper `buildCoachPrompt(exName, sessionId)` riusabile fra `openExerciseAI` e `ensureRestCue` (prompt unificato per coerenza fra modal)
- Helper `ensureRestCue(exName, sessionId)` chiamato da `startTrainingCountdown`: genera cue in background se cache miss, scrive in `ST.aiCue`, re-rendera solo se utente è ancora sul modal di recupero per QUESTO esercizio (guard `ST.trainCountdown.exName === exName`)
- `openExerciseAI` ora controlla cache hit prima della chiamata AI, scrive cache dopo successo. Race-safe: 2 chiamate concorrenti producono al massimo 2 invocazioni callAI (costo trivial) ma stesso contenuto finale

**`startTrainingCountdown` nuova firma**: `(restSec, exName, sessionId)` — rimossi parametri `activeTip` e `nextExNote`, rimosso array `ACTIVE_TIPS`.

**Tick surgical** (`tickCountdown`): durante countdown attivo (non `done`), aggiornamento DOM diretto del solo numero (`document.querySelector('.rest-cd-num').textContent`) invece di full re-render. **Preserva la posizione di scroll** del body durante i 60-180 secondi di recupero. Full re-render solo per il done state (PRONTO!).

**Audio rinnovato**:
- `playPrepBeep()`: tono basso/dolce (sine 600Hz, 80ms, gain 0.35) — 1 "tic" preparatorio per ognuno dei secondi 5,4,3,2,1
- `playFinalTripleBeep()`: tono alto/forte (sine 880Hz, 3 burst da 100ms con gap 150ms, gain 0.7) + vibrazione `[200,100,200,100,200]` — al raggiungimento di 0
- `playRestEndBeep()` rimosso (sostituito da `playFinalTripleBeep`)
- **Anti-doppio-beep**: `cd.beeped` per il triplo finale, `cd.prepBeeped: {5:true, 4:true, ...}` per i prep
- **Anti-salto background** (rientro foreground con jump > 1 sec): se `remaining < cd.seconds - 1`, marca tutti i `prepBeeped[]` saltati come `true` SENZA suonare → no burst sgradevole. Solo il beep del secondo corrente (se in 1-5 e non già beeped) viene suonato

**Stato `ST.trainCountdown` aggiornato**:
```js
{
  seconds, total, done, beeped, prepBeeped: {},
  endTime,
  exName,        // esercizio current per Esecuzione/Errori/Alert
  sessionId,     // per buildCoachPrompt
}
```
Rimossi: `activeTip`, `nextExNote` (legacy).

**File toccati**
- `worker/src/index.js`: nuovo handler `/exercise-media` + costante MATCH_DATA + helper Supabase (select/upsert/PATCH/storage upload + HEAD check)
- `worker/wrangler.toml`, `worker/.gitignore`, `worker/.dev.vars`, `worker/setup-supabase-secret.sh`
- `zona-tracker.html`:
  - State: `aiCue: {}`, modifiche a `trainCountdown`
  - Helper: `fetchExerciseMedia`, `buildCoachPrompt`, `ensureRestCue`, `playPrepBeep`, `playFinalTripleBeep`
  - Refactor: `startTrainingCountdown`, `tickCountdown`, `openExerciseAI`, `saveTrainingSet`, render countdown modal
  - CSS: `.ex-media-skeleton`, `.ex-surrogate-banner`, `.rest-modal-overlay`, `.rest-modal-container`, `.rest-modal-sticky`, `.rest-cd-num`, `.rest-cd-skip`, `.rest-modal-body`, `.rest-ex-name`
- `scripts/`: tooling matching + esperimenti image-gen
- `.gitignore`: aggiunti `.env.local`, `scripts/test-output/`, `.DS_Store`

**5. Settings modal — sezione Crediti & attribuzioni**

Sezione collassabile aggiunta in fondo al modal Impostazioni profilo (sopra il bottone "Salva impostazioni"), che raccoglie le attribuzioni licenze prima sparse nei modal di esercizio.

- HTML statico (il `settings-modal` non è renderizzato dinamicamente): toggle inline via `onclick="this.parentElement.classList.toggle('expanded')"` — niente nuovo `ST` state da gestire
- 4 voci con link esterni (`target="_blank" rel="noopener"`):
  - Animazioni esecuzione: ExerciseDB
  - Mappe muscolari: Wger.de + Licenza CC BY-SA 4.0
  - Modello AI: Llama 3.3 70B via Groq · Cloudflare Workers
  - Database: Supabase
- Chevron `▸` ruota di 90° (CSS `transform: rotate(90deg)` su `.expanded .chevron`)
- Default state: collassata. Ad ogni apertura del modal Impostazioni riparte da collassata (state DOM, non persisted)
- Classi CSS dedicate: `.settings-credits`, `.settings-credits-toggle`, `.settings-credits-content`

**Roadmap restante esercizi (15/20 da cachare)**: Upper B (6), Lower A (4), Lower B (5). Stesso flusso esercizio-per-esercizio con review manuale dei candidati ExerciseDB.

### 6 maggio 2026 — Nutrition: AI consigli pasti dinamica

**1. `getAdvice(consumed, nextMeal, isTomorrow=false)` — prompt AI personalizzato**
- Sostituito prompt hardcoded con builder dinamico che legge da `ST.profile`
- Include: nome, sesso, età, peso, dieta, intolleranze, obiettivo (multi-valore supportato), `activity_level`, `note_salute`
- Mappature italiane leggibili per `obiettivo` (perdita_peso/dimagrimento/ricomposizione/ipertrofia/massa_muscolare/forza_performance/longevita/mantenimento) e `activity_level` (sedentary/light/lightly_active/moderate/active/very_active)
- Sesso M/F → "uomo"/"donna"
- Ogni blocco del prompt è opzionale: se il campo è null/vuoto, la riga viene omessa
- Aggiunto blocco "PASTI GIÀ CONSUMATI OGGI" (ultimi 3, ordinati per ora) per evitare ripetizioni nei suggerimenti
- Note salute (es. "ferritina bassa") vengono passate all'AI con istruzione specifica di considerare nutrienti utili (ferro + vitamina C)

**2. Preselezione intelligente "Prossimo pasto" — nuova funzione `computeNextSlot()`**
- Calcola lo slot più vicino nel tempo non ancora loggato oggi
- Regola: slot già loggati o passati senza essere loggati vengono SALTATI
- Se tutti gli slot sono loggati o passati → ritorna `{slotId:'colazione', isTomorrow:true, allDone:true}` per pianificare il giorno dopo
- Init in cima a `renderOggi()`: se `!ST.nextSlotUserOverride`, aggiorna `ST.nextSlot` e `ST.nextSlotIsTomorrow`
- `onchange` della select setta `ST.nextSlotUserOverride=true` (override manuale rispettato)
- Bottone label dinamica: "Pianifica colazione di domani →" se `isTomorrow && !override`, altrimenti "Analizza e suggerisci →"
- `getAdvice` riceve flag `isTomorrow`: se true, aggiunge nota "PIANIFICAZIONE PER DOMANI MATTINA" al prompt + suggerimento sul riposo notturno

**3. DB cleanup**
- Rimosso profilo Ignazio duplicato (id `9b560bab-636a-4dd6-824e-1b534980f5d3`) da Supabase con DELETE cascade su `meals`, `supplements_log`, `fasting_days`, `profiles`

**File toccati**
- `zona-tracker.html`: `getAdvice` (1317-1410), `computeNextSlot` (961-984 nuova), `renderOggi` init (4751-4757), `adviceBoxHTML` (4833-4836), `fetchAdvice` (6528-6537)

**Commit**
- `b37bfaa` — Nutrition: prompt AI consigli pasti dinamico basato su profilo onboarding
- `0a174f7` — Nutrition: preselezione intelligente prossimo pasto + modalità domani

**Test confermati**
- Profilo Ignazio (pescetariano, ferritina bassa, intolleranza lattosio): consigli con ferro+vit C, niente latticini, dieta rispettata
- Preselezione automatica "Colazione 08:30" alle 06:27 di un nuovo giorno
- Da testare cross-profilo con Ginevra (onnivora) e Isabella (pescetariana variante)

**Roadmap aggiornata**
- ✅ Punto 1: Piano alimentare AI settimanale
- ✅ Punto 2: Integratori visibili in digiuno
- ✅ Punto 3: MCP filesystem
- ✅ Punto 4: Modal impostazioni profilo + esami sangue
- ✅ NUOVO: AI consigli pasti dinamica + preselezione prossimo pasto intelligente
- 🔜 Prossimo: Integratori Nutrilite personalizzati in base a obiettivo + esami sangue

**Edge case noti (non bloccanti)**
- Se l'utente fa override manuale della select scegliendo "Colazione" dopo aver loggato tutto, il bottone torna "Analizza e suggerisci →" invece di "Pianifica colazione di domani →" e il prompt AI non riceve flag `isTomorrow`. Comportamento accettabile per ora.

### 5 maggio 2026 — Sessione modulo Training

**Recovery split G3/G6 + ciclo a 7 voci**
- `SESSION_CYCLE` diventa: `['upperA','lowerA','recoveryUpper','upperB','lowerB','recoveryLower','rest']`
- Due sessioni recovery distinte: `recoveryUpper` (G3, recupera Upper A + Lower A) e `recoveryLower` (G6, recupera Upper B + Lower B). Ognuna con 3 esercizi mirati ai gruppi muscolari precedenti
- Nuova `session_type` `'rest'` (G7) con bottone "Segna fatto" sulla tile Home
- Card recovery senza form serie/RIR/carico: solo timer countdown + checkbox "Fatto" (pattern blocco attivazione). Funzioni: `startRecoveryTimer`, `pauseRecoveryTimer`, `resumeRecoveryTimer`, `resetRecoveryTimer`, `toggleRecoveryDone`, `checkRecoverySessionDone`
- Nuova funzione `markRestDone()` per segnare il giorno di rest come fatto
- Tile Home mostra sempre il prossimo step nel ciclo basandosi sull'ultimo workout loggato (qualsiasi tipo), indipendentemente da quanti giorni di calendario sono passati. Rispetta salti e ripartenze
- `ST.trainRecoveryDone` e `ST.trainRecoveryTimers` nuovi stati in-memory
- `SESS_LABEL`/`SESS_COLOR` aggiornati con `recoveryUpper:'AR↑'`, `recoveryLower:'AR↓'`, `rest:'R'`
- Filtro Progressione esclude `recoveryUpper`, `recoveryLower`, `rest`

**Pagina Sessioni layout 2x3**
- Lista sessioni come griglia 2 colonne: G1+G4 / G2+G5 / G3+G6 (recovery sotto i Lower)
- Stesso stile/dimensioni per tutte e 6 le card
- Badge `✓ data` sulle card delle sessioni completate

**Backfill SQL nomi esercizi**
- Eseguito UPDATE su `training_logs` per allineare i nomi degli esercizi vecchi a quelli nuovi del codice:
  - `'Trazioni'` → `'Trazioni alla sbarra'`
  - `'Chest press orizzontale'` → `'Chest press in piedi con elastico'`
  - `'Shoulder press verticale'` → `'Shoulder press in piedi con elastico'`
  - `'Row orizzontale'` → `'Row in piedi con elastico'`
  - `'Face pull'` → `'Face pull con elastico'`

**Suggerimento progressione "Ultima volta" da training_logs**
- `loadLastLoggedSets` riscritta per leggere da `training_logs` invece che `workout_sets` (più affidabile, storico autoritativo)
- Filtra `date < today` per non incrociare con la sessione in corso
- `getProgressionSuggestion`: gestione robusta del campo `resistance` (TEXT libero, può contenere "Banda viola", "150 lbs", "30") evitando doppio "lbs lbs"

**Modal `openExerciseAI`: immagini esecuzione affiancate**
- `EXERCISE_MEDIA.executionImg` ora supporta `string | array | null`
- Per i 4 esercizi con 2 frame esecuzione (Chest press inclinata, Lateral raise, Row inclinato, Curl bicipiti) le immagini `-1` e `-2` sono mostrate affiancate in 2 colonne con etichette `1. POSIZIONE INIZIALE` / `2. POSIZIONE FINALE`
- Layout flex con gap 8px, etichette 10px centrate, mobile-friendly. Funziona anche con 3 frame (futuro)

**Fix sync cross-device serie loggate**
- Bug risolto: `ST.trainLoggedSets` veniva inizializzato solo da `localStorage`, quindi serie loggate su un device non comparivano sugli altri (anche se erano in `training_logs` su Supabase)
- Nuova funzione `hydrateTrainingSetsFromCloud()`: all'init utente (o all'apertura sessione) interroga `training_logs` per oggi e mergia con localStorage. Cloud autoritativo se conflitto
- Recupera anche `workout_sets.id` per ri-popolare `setId` (utile per edit/delete by-id su righe da altri device)
- Punti di chiamata: `refreshInBackground` (init cache-hit + visibility-refresh), `loadAndStart` cache-miss path, `openTrainingSession` (live)

**Note sul dataset esercizi (free-exercise-db)**
- Esplorato `yuhonas/free-exercise-db` (873 esercizi, public domain, 2 foto statiche per esercizio)
- Verdict: qualità grafica anni 2000, niente angolazioni laterali, niente varianti elastico → scartato
- Esplorato anche ExerciseDB.dev (AGPL-3.0, conflitto licenza), Kaggle ExerciseDB ($300+, troppo caro), YMove ($19-299/mese, abbonamento)
- Decisione: rimandato il task "immagini esecuzione per i 9 esercizi senza foto wger" a quando troveremo fonte di qualità accettabile
- Possibile direzione futura: AI image generation on-demand via Cloudflare Workers AI (free tier 10.000 generazioni/giorno) + cache su Supabase Storage

### 4 maggio 2026 — Sync cross-device + versioning automatico + UI debug

**Auth: OTP a 6 cifre** (configurato in Supabase Dashboard, non in codice — era 8 prima)

**Re-fetch dati su return-to-foreground (cross-device sync)**
- Esteso il listener `visibilitychange` esistente: se utente già loggato, rilancia `refreshInBackground()` con throttle 30s (`ST.lastRefreshAt`)
- `ST.lastRefreshAt` (timestamp ms) impostata in: `loadAndStart` cache-hit (prima della call async, anti-race), cache-miss success, fine `refreshInBackground`
- `refreshInBackground` ora chiama `renderPage(ST.page)` invece di `renderOggi()` — re-render della pagina corrente, non sempre Oggi
- Catch loggato come `[refresh-bg] error:` (non più silenzioso) per diagnosi futura
- Listener split in due rami: (a) login finalization se `!ST.user`, (b) re-fetch silenzioso con prefisso `[refresh-on-visible] error:` su catch

**Service Worker fix critico (BUG STORICO)**
- Il SW intercettava le chiamate REST a `*.supabase.co` cacheandole → un device vedeva solo i pasti che aveva creato lui, mai quelli inseriti da altri device dello stesso utente
- Fix: rimosso `'supabase'` dal check hostname del branch cache-first; resta **solo** `cdn.jsdelivr.net` (libreria JS versionata)
- `CACHE` bumpata da `'zt-v1'` → `'zt-v2'` per forzare cleanup delle risposte cached stantie nell'`activate` handler
- Vedi sezione "Service Worker (`sw.js`)" + "Note → Debug cross-device"

**Versioning automatico via Git pre-commit hook**
- `APP_VERSION = '__APP_VERSION__'` come placeholder in `zona-tracker.html`
- `.git/hooks/pre-commit` (in `$GIT_COMMON_DIR/hooks/`, condiviso fra worktree) inietta `YYYY.MM.DD · HH:mm` al commit, solo se zona-tracker.html è in stage
- Vedi sezione "Versioning automatico (`APP_VERSION`)"

**Versione visibile in tutte le tab**
- Helper `versionFooter()` in `zona-tracker.html`: ritorna `<div>v${APP_VERSION}</div>` + spacer invisibile (`aria-hidden`, `pointer-events:none`) da 120px per garantire raggiungibilità via scroll su mobile (era cut-off su Oggi/Body/Home Android)
- Chiamato in fondo a `renderHome`, `renderOggi`, `renderTraining`, `renderBody`, `renderIntegratori`, `renderStorico`, `renderPiano`

**Padding-bottom mobile pagine**
- Bumpato da 120 → 140 → 180px in `@media(max-width:768px)` su `.page` (più gli IDs `#page-home, #page-oggi, ...` espliciti per specificità difensiva)
- Rimossi i 4 spacer hardcoded da 130px alla fine di renderOggi/Integratori/Storico/Piano (legacy, sostituiti dal padding generico + spacer di `versionFooter`)

**Email utente in Impostazioni profilo**
- Card "ACCOUNT" in cima al modal `settings-modal`: mostra `ST.user.email` (selezionabile, copiabile via `user-select:text`)
- Popolata in `openSettingsModal()` con fallback `'—'` se `ST.user` o `ST.user.email` mancante
- Nessun bottone di logout — solo display per debug cross-device

**`ST` esteso**: `lastRefreshAt: 0` (timestamp ms ultimo re-fetch riuscito).

### 3 maggio 2026 — Riorganizzazione card + modal Training (data-driven sections)

**`TRAINING_SESSIONS` esteso con campi structured**:
- A livello session: aggiunti `label` ('Upper A — Forza') e `rest` ('2-3 min'/'60-90 sec'/null)
- A livello esercizio: aggiunti `setup` (string), `execution[]` (3-4 step), `commonErrors[]` (3 errori), `muscles[]` (lista muscoli target), `alert?` (warning protezione lombari/ginocchia, presente su 7 esercizi)
- Rimosso `note` (sostituito da setup+execution+commonErrors)
- **Mantenuti** per back-compat: `id`, `name`, `type` (capitalized 'Forza'/'Ipertrofia'/'Recupero'), `rir`, `iso:true` su esercizi isolation

**Card esercizio semplificata**:
- HEADER cliccabile (`onclick="openExerciseAI"`) con titolo + ⓘ + meta-row (sets×reps · RIR · Recupero)
- INFO sezione: `eq` + `muscles.join(' · ')` + suggerimento progressione
- ACTION ROW: progress `X/Y serie` + bottone `+S{n}` o badge `✓ DONE`
- Eliminati dalla card: bottone ▶ separato, ⓘ separato come pulsante, riga lunga 💡 con `note`
- Helper sync `getProgressionSuggestion(exName, sessionId)` mostra `💡 Ultima volta: 5r · 30 lbs · RIR 2` da cache `ST.lastLoggedSets[exName]`
- Helper async `loadLastLoggedSets(sessionId)` chiamata da `openTrainingSession`: query `workout_sets` ordinata DESC, deduplicata per `exercise_name`, popola cache + re-render
- Helper sync `findExercise(exName, sessionId)` lookup in TRAINING_SESSIONS

**Modal scheda esercizio ristrutturato**:
- Firma `openExerciseAI(exName, sessionId)` — letti tutti i campi structured da TRAINING_SESSIONS
- Sezioni distinte: Header (esercizio + label sessione) → Media (griglia 1-2 colonne, **altezza fissa 240px + object-fit:contain** — fix bug dimensioni disuguali) → Setup → Esecuzione (`<ol>` lista numerata) → Errori comuni (`<ul>`) → Parametri (`X×Y · RIR N · Recupero ...`) → Alert protezione (condizionale, solo se `ex.alert`) → AI Coach (background teal `#F0F7F5`) → Footer Wger
- Eliminato dal modal: ripetizione del nome esercizio nel testo AI, sezione "Adattamenti personali" come blocco fisso, lista muscoli come testo (la mappa visiva li mostra)

**AI Coach prompt semplificato**:
- Genera SOLO un consiglio aggiuntivo (max 3 frasi): cue tecnico avanzato + gestione fatica + variazione respiratoria
- NON ripete setup/execution/errori (già nelle sezioni statiche del modal)
- Stato `ai.loading` → mostra "Genero un cue avanzato per te…" durante chiamata AI

**Nuove classi CSS**: `.exercise-card` (+ `.done`), `.ex-header`, `.ex-title-row`, `.ex-title`, `.ex-info-icon`, `.ex-meta-row`, `.ex-params`, `.ex-rir-pill`, `.ex-rest`, `.ex-info`, `.ex-equipment`, `.ex-muscles`, `.ex-suggestion`, `.ex-action-row`, `.ex-progress`, `.ex-add-set-btn`, `.ex-done-badge`, `.ex-media-grid` (+ `.single`), `.ex-media-img`, `.modal-section`, `.modal-list`, `.modal-params`, `.modal-alert`, `.modal-ai-section`, `.ai-loading`, `.modal-footer`

**Stato ST esteso**: `lastLoggedSets: {}` (cache) + `exerciseAIOpen` ora include `sessionLabel`, `sessionType`, `sessionRir`, `sessionRest`, `sets`, `reps`, `eq`, `setup`, `execution[]`, `commonErrors[]`, `muscles[]`, `alert`, `muscleImg`, `executionImg`, `content`, `loading`

### 3 maggio 2026 — Countdown recupero timestamp-based (continua in background)

**Problema risolto**: il countdown del recupero tra serie (modal fullscreen "Recupero attivo / Prossimo esercizio / Quasi pronto…") usava un contatore decrementale `seconds--` ad ogni tick di `setInterval(1000ms)`. Quando l'utente cambiava app, lockava il telefono o il browser metteva in pausa il tab, il timer si "congelava" e il beep finale non partiva mai correttamente.

**Soluzione (rifattorizzazione interna, opzione B)**: la UX del modal resta identica (3 fasi, tip recupero, next ex note, numeri giganti, bottone Salta). Cambia solo il motore interno:

- `ST.trainCountdown` esteso con `endTime: Date.now() + duration*1000` (sorgente di verità) + `beeped: false` (anti-doppio-beep)
- Tick a 250ms (era 1000ms): ricalcola `remaining = Math.max(0, Math.ceil((endTime - Date.now())/1000))`. UI fluida e preciso al rientro foreground anche a metà secondo
- Re-render `renderTraining()` solo quando il valore intero del secondo cambia (evita 4 render/sec)
- `tickCountdown()` estratto come funzione standalone — chiamato sia dall'interval sia da `visibilitychange` quando si torna foreground
- `playBeep()` (singolo a 880Hz × 0.8s, troppo invadente) sostituito da `playRestEndBeep()`: 2 beep brevi a 660Hz × 0.2s gap 350ms gain 0.6 + vibrazione `[200,100,200]`. Idempotente: anche se torni in app dopo lo scadere, il beep parte una sola volta (`cd.beeped` flag)
- `getRestSec(sessionId, ex)` (regole hardcoded per tipo+iso) invariata
- Cleanup automatico in `closeTrainingSession()` e `showPage(id !== 'training')` per evitare timer orfani
- `playBeep()` definizione mantenuta per uso futuro (non più chiamata da nessuno)

### 3 maggio 2026 — Picker reps + resistenza nativi + fix bug unità kg/lbs

**Picker reps + resistenza nativi**
- Sostituiti input testuale REPS e scroll picker resistenza con `<select>` HTML nativi
- REPS: range 0-30 step 1, placeholder `—` come default
- Resistenza: range 0-250 step 10, default = ultimo valore loggato per l'esercizio nello stesso giorno, fallback `—` se prima volta. `0` = corpo libero (nuovo, prima era escluso)
- Su iOS Safari diventano wheel picker iOS-style nativi (nessun JS custom)
- Stile uniforme con picker RIR esistente via classe CSS `.picker-select` con `font-size:16px` (mandatory per evitare auto-zoom iOS Safari su tap)
- Codice rimosso: scroll picker orizzontale (`.resist-pill`, `tl-resist-picker`, `selectResist()`, `scroll-snap-type:x mandatory`, auto-scroll all'apertura)

**Fix bug etichetta unità `CARICO (kg|lbs)`**
- La card mostrava sempre `CARICO (kg)` perché il fallback era `|| 'kg'` (5 punti del codice). Cambiato fallback a `|| 'lbs'` (default sensato: gli elastici sono in lbs, anche se l'utente non imposta nulla)
- File modificato: `saveLocalPrefs`, `saveTrainingSet` (insert workout_sets), rendering modal log (label CARICO), `openSettingsModal`, `saveSettings`
- L'etichetta `CARICO (...)` ora rispecchia correttamente la preferenza locale

### 3 maggio 2026 — AI prompt progressione con vincoli rigorosi

**Problema**: `suggestProgressionAI()` (suggerimento AI mostrato sotto i badges nelle card esercizio dopo `saveTrainingSet`) generava consigli incoerenti — resistenze inventate (12 lbs, 25 lbs), reps fuori range, logica di progressione confusa.

**Soluzione**: prompt riscritto con vincoli espliciti per garantire output operativi rispettosi del programma:

- **Resistenze SOLO multipli di 10 lbs** (0..250): elenco completo nel prompt + note sulle combinazioni elastici (giallo 10, verde 20, rosso 30, blu 40, nero 50). 0 = corpo libero
- **Reps SEMPRE entro range esercizio** (`repsMin`-`repsMax` parsati da `exercise.reps`): mai oltre il tetto/sotto il pavimento
- **Logica doppia progressione esplicitata** in 5 regole condizionali:
  - Se reps = `repsMax` E RIR effettivo ≥ target → +10 lbs, riparti da `repsMin`
  - Se reps in range E RIR = target → stessa resistenza, +1 rep
  - Se RIR > target (troppo facile) → stessa resistenza, alza reps verso `repsMax`
  - Se RIR = 0 (cedimento) → -10 lbs (warn aggiuntivo se già a 0 lbs)
  - Se reps < `repsMin` (sotto range) → stessa resistenza, focus arrivare a `repsMin`
- **Floor 0 / Ceiling 250 lbs** (`Math.max(0, ...)` / `Math.min(250, ...)`)

**Skip espliciti** (guard all'inizio della funzione):
- `sess.type === 'Recupero'` → skippa Mobilità, Stretching, Vacuum
- Reps non standard (`/^(\d+)-(\d+)(?:\s+per lato)?$/` non matcha) → skippa esercizi temporali (`20-30 sec`, `10 min`, `5-10 min`)
- Regex permissiva accetta `"4-6 per lato"` (Bulgarian, Single leg RDL)

**Test scenari verificati**: tetto raggiunto, dentro range, troppo facile, cedimento, sotto range — tutti producono il branch corretto del prompt.

### 3 maggio 2026 — Aggiornamento esercizi Training (nomi, note, immagini Wger)

**TRAINING_SESSIONS riscritto** con tutti i 19 esercizi training rinominati per chiarezza ("con elastico" esplicito, niente "banda", niente ridondanze tipo "orizzontale/verticale"). Note esercizio ora dense (~25 parole): setup attrezzo concreto + indicazioni esecuzione + lista muscoli target. Reps "per lato" specificato per esercizi unilaterali (Bulgarian, Single leg RDL).

**EXERCISE_MEDIA passato da SVG inline custom (`muscleMapSVG` 7-15KB cad.) a immagini PNG Wger locali**:
- Struttura nuova: `{ muscleImg, executionImg }` — entrambi path a `assets/exercises/*.png`
- Tutti i 19 esercizi mappati. `executionImg: null` per esercizi senza foto Wger disponibile (Inverted row, Romanian deadlift, Hip thrust, Glute bridge, Single leg RDL, Hip thrust TUT, Bulgarian, Row in piedi, Face pull, Chest press in piedi)
- ~44 KB di SVG inline rimossi → ~3.7 KB di references → file più snello
- Asset PNG Wger.de versionati in `assets/exercises/` (CC BY-SA 4.0)

**Modal `openExerciseAI` semplificato**:
- Rimosso rendering `muscleMapSVG`/`wgerImages`/`wgerVideos` (stato `ST.exerciseAIOpen` solo `{ exName, muscleImg, executionImg, content }`)
- Nuovo layout: griglia `1fr 1fr` con muscoli a sinistra + esecuzione a destra; collassa a `1fr` se `executionImg=null`
- Footer attribuzione "Mappe muscolari da Wger.de — CC BY-SA 4.0"

**Compat storico Supabase**: i record esistenti su `training_logs.exercise_name`/`workout_sets.exercise_name` con vecchi nomi sono stati rimappati manualmente via SQL (no alias dict nel codice).

**Note tecniche residue**:
- 4 file con suffisso `*-esecuzione-1.png`/`-2.png` — usati `-1` come placeholder, da unire poi in un singolo file senza suffisso
- `chest-press-in-piedi-muscoli.png` non disponibile → fallback a `chest-press-orizzontale-muscoli.png` (stessi muscoli target)


### 2 maggio 2026 — Modulo Training: AI, persistenza, esperienza in-sessione

**Mappe muscolari SVG (Upper A integrate)**
- `EXERCISE_MEDIA[exName].muscleMapSVG` — SVG inline (anteriore + posteriore) renderizzato nel modal scheda esercizio AI
- Esercizi coperti: Trazioni alla sbarra, Chest press orizzontale, Chest press inclinata, Shoulder press verticale, Row orizzontale, Face pull
- Da completare: Upper B, Lower A, Lower B, Recovery

**Tabelle Supabase create**
- `workouts` — record di sessione completata: `id`, `user_id`, `date`, `session_type`, `completed`, `duration_min`. Usata da calendario Progressione + Home tile + cards Sessioni
- `workout_sets` — log per serie singola con dati strutturati: `id`, `user_id`, `workout_id` (nullable), `date`, `session_type`, `exercise_name`, `set_number`, `reps`, `resistance` (int), `unit` (kg/lbs), `rir_actual`. Sorgente di verità per la nuova UI; `training_logs` resta come storico parallelo (compat Progressione)
- RLS su entrambe: `auth.uid() = user_id`

**Countdown recupero trifase (Blocco Attivazione)**
- 3 voci: Respirazione 360° (120s) · Vacuum (120s) · Cat-Cow (60s)
- Per ogni voce: checkbox tappabile + display `MM:SS` + ▶/⏸/✕ + tap su tempo durante pausa per modificare via `prompt()`
- Auto-check al raggiungere 0 + 5 beep AudioContext (880Hz × 0.3s × gain 1.0 × gap 150ms) + vibrazione `[300×5,100×4]`
- Reset countdown se l'utente toglie il check su una voce completata
- Update DOM mirato (no full re-render ogni secondo) per non interferire con input form aperti
- Titolo "Blocco Attivazione" diventa verde + ✓ quando tutte e 3 spuntate
- State `ST.trainActivation[3]` + `ST.trainActivationTimers[3]` (in-memory, reset a back button)

**WakeLock — schermo sempre acceso durante sessione**
- `requestWakeLock()` su `openTrainingSession()` · `releaseWakeLock()` su back, cambio tab, `showPage` non-training
- `visibilitychange` listener riacquisisce il lock al rientro foreground se sessione attiva
- `try/catch` silenzioso se l'API non è supportata (Safari iOS pre-16.4 ignora)

**Suggerimento progressione AI (Cloudflare Worker)**
- `suggestProgressionAI()` chiama `callAI(prompt, 80)` dopo ogni `saveTrainingSet`
- Prompt include: esercizio, serie corrente, reps/resistenza/RIR effettivi, range target, RIR target, storico ultime 3 sessioni distinte (escluso oggi) da `training_logs`
- Risposta salvata in `ST.aiSuggestions[${sessionId}_${exName}]` e mostrata sotto i badges nella card esercizio: testo `🤖 …` italic teal `#2A7A6F` 11px
- Fail silenzioso

**Calendario mensile Progressione**
- `renderCalendar(workouts, year, month)` — griglia mese con celle colorate per `session_type` + sigle UA/UB/LA/LB/AR
- Footer: counter Sessioni + Streak + sessione più frequente
- Navigazione mese precedente/successivo via `loadWorkouts(y, m)`
- Tap cella con workout → conferma eliminazione (`ST.trainCalDeleteConfirm`)

**Giorno completato visibile**
- Auto-trigger `saveWorkoutRecord(sessionId)` dentro `saveTrainingSet()` quando tutti gli esercizi della sessione sono al 100%
- `saveWorkoutRecord` reso idempotente — query preventiva su `(user_id, date, session_type)` per evitare duplicati
- Anti-duplica anche via `ST.trainCompletedToday[sessionId]`
- Toast `🎉 Sessione completata!` + ricarica `loadTrainingHomeData` + `loadSessionLastCompletion`
- **Cards Sessioni**: ogni card ora mostra overline `GIORNO N` (1=upperA, 2=lowerA, 3=upperB, 4=lowerB) + pill `✓ {data}` in alto a destra se completata (verde se oggi, grigia altrimenti)
- **Home tile Training** riscritta: query diretta su `workouts ORDER BY date DESC LIMIT 1` come sorgente di verità unica desktop/mobile. 4 stati discreti: `notStarted` ("Inizia il programma — Giorno 1: Upper A") · `doneToday` ("Giorno X completato ✓ · Prossimo: Giorno Y — …") · `inProgress` ("Sessione in corso — Riprendi →") · default ("Giorno Y · {tipo}" con last date + streak). Eliminato il check `train_start_date > today` che bloccava la tile su mobile

**Scala elastici numerica (resistance picker)**
- *Aggiornato 3 maggio 2026:* sostituito scroll picker orizzontale con `<select>` HTML nativo (su iOS Safari diventa wheel picker iOS-style automaticamente)
- `RESIST_VALUES = [0,10,20,30..250]` step 10 (incluso 0 = corpo libero)
- Helper text fisso: "lbs indicativi · scarto ±15% per gli elastici a tubo"
- Default = ultimo valore loggato per quell'esercizio nella stessa giornata, fallback `null` (placeholder `—`) se prima volta
- Salvato come integer in `workout_sets.resistance` (e come stringa in `training_logs.resistance` per compat)
- Stile uniforme con REPS e RIR via classe CSS `.picker-select` (font-size:16px obbligatorio per evitare auto-zoom iOS)

**Unità kg/lbs**
- `<select>` kg/lbs nella sezione Training del modal Impostazioni
- Salvata in `localStorage` prefs (`zt_prefs_<userId>.unit`), NON su Supabase (evita problemi schema)
- Default `kg`. Etichetta visualizzata nel picker carico (`CARICO (kg)` / `CARICO (lbs)`) e accanto ai valori delle serie loggate
- Saved with workout_sets row as `unit` field

**Edit serie loggata inline**
- Pulsante ✏️ su ogni badge serie loggata → riga diventa editabile (input numerici reps + resist + ✓ + ✕)
- `confirmEditLog`: `UPDATE workout_sets WHERE id = setId AND user_id = …` (id catturato all'insert via `.select('id').single()` e salvato in `ST.trainLoggedSets[key].setId` + persistito in localStorage). Fallback su composite key `(user_id, date, session_type, exercise_name, set_number)` per record antecedenti questa modifica
- Update parallelo anche su `training_logs` (compat Progressione)
- Inputs bound via `oninput` a `ST.editLogDraft` per resistere a re-render dei timer attivazione
- Progress `X/Y serie` ricalcolato auto

**Audio iOS fix**
- `_audioCtx` singleton globale lazy (no più creazione ad ogni beep)
- `_unlockAudio()` chiama `ctx.resume()` dentro user gesture; aggiorna `ST.audioBlocked`
- Listener globale one-shot su `touchstart`/`touchend`/`mousedown`/`keydown` (capture phase) → sblocca al primissimo gesto, poi si auto-rimuove (critico per iOS Safari che richiede gesture per `AudioContext.resume()`)
- `visibilitychange` chiama `_unlockAudio()` al rientro foreground (iOS sospende il context in background)
- Vibrazione `navigator.vibrate([300,100,300,100,300,100,300,100,300])` come fallback fisico parallelo al beep
- Banner non invasivo "🔔 Tocca per attivare l'audio" in cima al detail sessione se `ST.audioBlocked=true` dopo tentativo di resume fallito; tap dismiss chiama `_unlockAudio()`

**Layout & UX card esercizio**
- Riscritta a 5 righe `flex-wrap:nowrap` per evitare wrap mobile (titolo era andato a capo): R1 titolo + +S/✓DONE · R2 ▶ + sets×reps + RIR pill + ℹ + spacer + X/Y serie · R3 Recupero a destra · R4 attrezzo · R5 nota
- Border-left 3px verde `#2A7A6F` quando `allDone`
- Colore "Recupero: X" dinamico per durata: ≥120s grigio · 90s `#2A7A6F` · 60s `#185FA5`
- Pill `RIR N` accanto a sets×reps (sfondo `#E8F0FA`, testo `#185FA5`, font-mono 10px)
- Padding-bottom `calc(96px + env(safe-area-inset-bottom))` sul wrapper sessione per non finire sotto la bottom nav iPhone

## Bug noti

- `trainLoggedSets` si azzera al reload (in-memory only) — i badge serie spariscono dopo refresh
- `updateSuppSlotTime` presente ma non testata in produzione
- Alcuni integratori vecchi mostrano macro `—` (backfill SQL pendente)
- `body_logs` non ha constraint UNIQUE(user_id, date) su Supabase — il salvataggio usa insert/update manuale

## Note

- L'unico file da toccare normalmente è `zona-tracker.html`
- Il client Supabase si chiama `supa` (non `supabase`)
- La regola d'oro: un passo alla volta, Ignazio conferma con "ok/fatto" prima di procedere

### Debug cross-device

- **Versione attiva:** ogni device mostra in fondo a ogni tab principale `v${APP_VERSION}` nel formato `vYYYY.MM.DD · HH:mm`. Confronta i numeri sui device per capire chi ha la build vecchia.
- **Account loggato senza fare logout:** apri Impostazioni profilo (icona ⚙️ in alto a destra) — la prima card mostra l'email attiva (`ST.user.email`). Evita di consumare OTP per "vedere chi è loggato".
- **Web Inspector iPhone:** collegabile via cavo a Safari Mac (Sviluppo → nome iPhone → pagina). Utile per query diagnostiche dirette a Supabase quando i dati visualizzati non corrispondono al DB. Esempio: `await supa.from('meals').select('*').eq('user_id', ST.user.id).eq('date', '2026-05-04')` per controllare la realtà del DB confrontandola con `ST.db.days[...].meals`.
