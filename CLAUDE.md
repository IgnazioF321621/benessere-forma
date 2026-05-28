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
4. ~~Modulo Integratori refresh v3~~ ✅ completato 16 mag 2026 — pacchetti + extra + catalogo Nutrilite hi-fi (vedi sezione "Modulo Integratori v3")
5. **Tab Piano v4 Coach Attivo** → design chiuso 19 mag 2026 (2 round Claude Design + 12 decisioni). Implementazione roadmap 9 sessioni:
   - Sessione 1 — Step A: Fondazione dati Supabase ✅ (20 mag, commit `d08ee4d`)
   - Sessione 2 — Step B: UI vista principale ✅ (20 mag, catena 7 commit `272e375`→`2984704`)
   - Sessione 3 — Step C: Overlay Dettaglio Giorno ✅ (20-21 mag, catena 8 commit `5384085`→`2f041f7`, APP_VERSION finale `v2026.05.21 · 11:15`). Overlay completo: scaffolding + empty state + 5 demo always-on + banner ESEMPIO DIMOSTRATIVO + totalizzatore range ±10% + 3 azioni ACCETTA/SOSTITUISCI/SALTO funzionanti + persistenza localStorage namespace `zona_pianov4_*`
   - Sessione 4 — Step D: Modal peso + Fix triplo render barretta + Banner reminder + loadExtras robusto + R3a getAdvice ✅ (22 mag, catena 4 commit `5280f9b`→`c32f141`→`1be5048`→`b4259f5`, APP_VERSION finale `v2026.05.22 · 15:26`). R3a chiuso (AI prompt vede integratori); R3b resta in Step F; R1 dedup resta in Step F (design già completo).
   - Sessione 5 — Step E: Welcome overlay domenicale ✅ (22 mag, 2 commit `c23deeb` UI + `f8e3064` trigger automatico, APP_VERSION finale `v2026.05.22 · 19:27`). Overlay fullscreen 2 varianti A/B che annuncia draft `weekly_plans`; trigger automatico giorno+ora+flag; bypass collaudo `?welcome=1`/`ztTestWelcome()`; diagnostica `?welcomeDebug=1`/`ztWelcomeWhy()`. **STEP E CHIUSO ✅** — collaudato dal vivo, anti-nag verificato.
   - Sessione 6 — Step **F.1**: Postino generazione draft `weekly_plans` ✅ (23 mag, 2 commit `0fbbe86` postino + `74c51c5` ritocchi toast, APP_VERSION `2026.05.23 · 15:08`). Postino all'apertura app di domenica, "Modo 1 obiettivi invariati" (copia target da profilo), AI scrive `ai_reasoning` con fallback robusto, anti-doppione su `(user_id, week_start)`. Welcome overlay neutralizzato sul check orario (coerenza "domenica senza orario"). Forzature collaudo `?genera=1`/`ztTestGenera()`/`ztGeneraWhy()`.
   - Sessione 7 — Step **F.2a**: Generazione pasti pranzo+cena (14 pasti = 7+7) ✅ (23 mag sera, 4 commit `4bc94eb` scheletro → `76cb793` regole anti-invenzione + dispensa → `8ae2dda` varietà struttura → `e966956` toast voce coach, APP_VERSION finale `2026.05.23 · 21:56`). Ripartizione standard: colazione 25% / merenda 15% / pranzo 35% / cena 25% (F.2a copre solo 60% = pranzo+cena). Una sola `callAI(prompt, 2000)`, JSON rigido, parser/validator robusto. Opzione A: riga-madre creata sempre, pasti add-on. Prompt irrobustito iterativamente dal vivo (3 giri): no invenzione ingredienti, DISPENSA per dieta+intolleranze, varietà ingredienti+struttura+cotture+proteine protagoniste. Toast in voce del coach (no termini tecnici utente).
   - Sessione 8 / Step **F.2b** — Colazione + merenda. **STAND BY (non eliminato)** — decisione 23 mag sera: colazione e merenda sono lasciate alla gestione libera dell'utente; il coach genera SOLO pranzo + cena (F.2a). La ripartizione 25/15/35/25 protegge comunque il 40% (colazione+merenda) → l'utente ha lo spazio per gestirli a mano senza sforare la giornata. **F.2a è di fatto il punto d'arrivo della parte automatica del modulo Nutrition per questa fase.** F.2b potrà essere riattivato in futuro se l'utente sceglierà esplicitamente "voglio che il coach pensi anche a colazione e merenda" (vedi idea onboarding in sezione "Note e scoperte").
   - Sessione 8 (24 mag 2026): Sicurezza + chiusura modulo Nutrition ✅. **3 fix di sicurezza/coerenza chiusi**: A1 onboarding obiettivo SINGOLO (`2d07127`+`e69992a`), B guard-rail calorie minime con avviso modale (`9c16d4e`), A2 cambio obiettivo unificato in Impostazioni (`49a53bd`). APP_VERSION `2026.05.24 · 16:35`. Modulo Nutrition CHIUSO per questa fase.
   - **PROSSIMO grande filone**: **Modulo TRAINING**. La prossima sessione si sposta dal Nutrition al Training. Il punto di partenza preciso dentro Training lo sceglierà Ignazio a inizio prossima sessione. Restano paralleli (non ancora schedulati): notifiche push, test iPhone tester attivi, admin panel, eventuale F.2c/d Nutrition (visione futura), rifiniture Nutrition residue (vedi sezione changelog 24 mag).
   - Sessioni 8-10: vedi sezione "Tab Piano v4" per dettaglio
6. **Refresh onboarding M1 dedicato** — DOPO Tab Piano v4. Aggiungere 2 nuove preferenze: giorno+ora generazione piano settimanale, modalità tracking peso (giorno/3gg/settimana/libero)
7. Food input multi-modale — Fase 0 refactor + Fase 1 barcode
8. Food input multi-modale — Fase 2 foto AI + Fase 3 OCR etichetta
9. ~~M2 Check Fisico — versione funzionale~~ ✅ completato 13 mag 2026 — design refinement via Claude Design in arrivo

**Da rifinire** (post-Analisi v3 + design Piano v4):
- ~~Fix bottone ELIMINA pacchetto non visibile quando il pacchetto esiste in DB ma ha 0 items~~ ✅ fixato (commit `73d141b`)
- ~~Pulizia legacy marcata `// [LEGACY-INTEGRATORI-V3]` e `// [LEGACY-CATALOGO-V3-BLOCCO2]`~~ ✅ fatto (commit `0724a63`)
- ~~Step 2 modulo Integratori: ridisegno flusso extra come eventi `supplements_log`~~ ✅ completato 18 mag 2026 (commit `306defe` — vedi sotto-sezione "Flusso Registra Extra")
- ~~Refresh tab Storico (legacy → design system v3)~~ ✅ completato 18 mag 2026 pomeriggio (commit `09a2775`) — rinominata **Analisi**, cambio di paradigma da lista cronologica a dashboard analitica di tendenze. Vedi sezione "Tab Analisi v3".
- ~~Refresh tab Piano (legacy → design system v3)~~ ✅ design v4 chiuso 19 mag 2026 — implementazione roadmap 9 sessioni (Step A→I). Vedi sezione "Tab Piano v4".
- **Refresh onboarding M1 dedicato** — aggiungere step preferenze coach: giorno+ora generazione piano settimanale (preset VEN/SAB/DOM + custom, default DOM 20:00), modalità tracking peso (giorno/3gg/settimana/libero, default flessibile + reminder 14gg). PROSSIMO step separato dopo Tab Piano v4 v1.
- Picker emoji e time nativi (sostituire `prompt()` con `<input type="time">` nascosto + emoji-grid custom) — rimandato
- Pulizia funzioni "Singolo" legacy dormienti (`setSuppSheetMode('singolo')` + render legacy + relative funzioni di salvataggio extra legacy) — non più chiamate da nessuna CTA dopo Step 2 ma presenti nel codice. Da rimuovere in cleanup separato.
- Pulizia legacy Analisi v3: `renderStoricoLegacy`, `setReportRange` (no-op), CSS `.storico-extra-tag`, DOM alias `'storico'` nel routing — rimuovere dopo verifica produzione stabile.
- Pulizia legacy Piano v3 → v4 (Step I / Sessione 9): rinominare `renderPiano` → `renderPianoLegacy` insieme a routing `renderPage('piano')` che punta direttamente a `renderPianoV4` (no più branching su feature flag)
- Cleanup feature flag `ST.pianoV4Enabled` dopo validazione finale tester (insieme a Step I)
- Notifiche push iOS PWA — TRATTENUTE per V2 dopo Tab Piano v4 stabile (Opzione 3 scelta in chiusura design: welcome overlay domenicale sufficiente per V1)
- **Debito tecnico — ordine macro incoerente** (rilevato 22 mag, Step E): l'app usa due ordini diversi per i macro. Tab Oggi (`renderToday`/`renderOggi`, riga ~10605): Carbo→Proteine→Grassi (corretto, logica Zona 40-30-30). Tab Piano card obiettivi (`renderPiano` ~13251 e `updatePianoTargetCard` ~13371): Proteine→Carbo→Grassi (invertito). Da uniformare a Carbo→Proteine→Grassi su tutte le schermate. Non urgente — fuori da Step E. Welcome overlay (Step E) nasce già con l'ordine corretto.

**TODO post Step C (21 mag 2026, prossima sessione)**:
- **~~Investigazione integratori macro nel conteggio giornaliero~~** ✅ chiusa 21 mag 2026 (report `DIAGNOSTICA_INTEGRATORI_REPORT.md`). Esiti:
  - **R1 Doppio conteggio** — CONFERMATO. Esempio reale: demo Piano V4 `demo-4` = "XS High Protein Energy Bar Cocco" stesso prodotto del catalogo Nutrilite. ACCETTA pasto + registra extra = +195 kcal contati 2 volte. `dayTotals()` somma `meals + supps + extras + extrasV3` senza dedup cross-source. **Design fix deciso → vedi sezione "Design R1 dedup integratori" sotto.** Implementazione in Step F.
  - **R2 Catalogo incompleto** — SMENTITO via SQL su `nutrilite_catalog`. Tutti i prodotti con macro reali (XS Whey, XS Protein Bar, bodykey barrette/frappé, All Plant Protein, Hydrolyzed Whey, Electrolyte) hanno kcal/proteine/carbo/grassi popolati. Power Drink hanno macro 0 correttamente (bevande quasi acaloriche).
  - **R3 AI cieca su integratori** — CONFERMATO. `getAdvice` riceve totali kcal corretti via `dayTotals()` ma elenca al modello solo `meals` come contesto qualitativo, mai gli integratori → consigli su quadro parziale. `generaPianoAI` (piano settimanale Step F) non menziona affatto integratori abituali. **Fix R3a `getAdvice` integrato in Step D (~30 min). Fix R3b `generaPianoAI` integrato in Step F.**
- **PRIORITÀ ALTA — Comunicato implementazioni per tester**: preparare testo chiaro per chat collettiva 3 tester (Ginevra, Isabella, Pesce). Spiegare cosa è cambiato (Tab Piano v4 con overlay + 5 demo + azioni), cosa testare, cosa ignorare (pasti demo non sono piano AI vero — banner ESEMPIO DIMOSTRATIVO).
- ~~**Step D — Modal peso + banner reminder + R3a fix `getAdvice`**~~ ✅ chiuso 22 mag 2026 (Sessione 4, catena 4 commit `5280f9b`→`b4259f5`). Vedi entry log dettagliata in "Cosa abbiamo fatto".

**TODO Step F.2b — STAND BY (non eliminato) — colazione + merenda**:

⚠️ **DECISIONE 23 mag sera (post-F.2a)**: F.2b è in STAND BY. Colazione e merenda sono lasciate alla **gestione libera dell'utente**; il coach genera SOLO pranzo + cena (F.2a). Motivazione: la ripartizione 25/15/35/25 protegge il 40% (colazione 25% + merenda 15%); il coach punta solo al 60% (pranzo 35% + cena 25%) quindi l'utente ha lo spazio per gestire i due pasti a mano senza sforare la giornata. F.2a è di fatto il punto d'arrivo della parte automatica del modulo Nutrition per questa fase. F.2b si riattiva se in onboarding futuro l'utente sceglierà esplicitamente "voglio che il coach pensi anche a colazione e merenda" (vedi sezione "Note e scoperte").

La specifica seguente resta archiviata per eventuale riattivazione. NON eliminare.

- **Generazione pasti figli per colazione + merenda** (= il restante 40% calorico riservato): 7 colazioni (25%) + 7 merende (15%) per draft. Slot `'colazione'` e `'merenda'` (CHECK constraint ammette anche `'spuntino'` se servisse — verificare convenzione finale).
- **Colazione tendenzialmente standardizzata per utente**: in onboarding (refresh M1 futuro) chiedere preferenza dolce/salato + tipo bevanda (latte vaccino/avena/soia/mandorla/cocco/nessuno). Il coach genera comunque 7 colazioni diverse ma rispetta lo stile preferito.
- **Merenda spesso = barretta energetica**: per molti utenti (es. Nutrilite) la merenda è un elemento quasi fisso (barretta proteica + frutto, o simile). Il coach può proporre alternanza barretta/snack veri ma rispettando le abitudini.
- **Riuso architettura F.2a**: stesso pattern `_pianoV4F2aBuildPrompt` + parser/validator + INSERT batch. La DISPENSA AMMESSA è già pronta per categorie cereali/frutta/latticini (se ammessi) ecc. Probabile estensione del prompt esistente o seconda chiamata `callAI` dedicata (decisione di design al momento dell'eventuale riattivazione).

**TODO Step F.2c/d (TBD, fase apprendimento + ricettario)** — visione di Ignazio per dopo F.2b:
- **Ricettario "pasti già approvati"**: oggi non esiste; si costruisce strada facendo dai pasti accettati/sostituiti+restano-in-zona dello storico utente. Il coach pesca da lì invece di inventare ex novo ogni settimana.
- **Apprendimento dallo storico**: il coach legge i pasti realmente registrati nelle settimane passate, le sostituzioni preferite, gli skip ricorrenti → adatta le proposte future.
- **(F.2d) Correzione squilibri**: quando il piano genera squilibri (es. proteine basse, omega-3 insufficienti, ferro non coperto) il coach suggerisce CIBO specifico **o integratore Nutrilite** dell'utente per coprire il gap. Richiede sia il ricettario sia la lettura `ST.supps` attivi (fix R3b).

**Nodi ancora aperti (ereditati)**:
- **Nodo logico aperto — recupero "giorno dopo" vs lunedì (welcome overlay Step E + postino F.1)**: con `profiles.plan_generation_day='sun'`, il "giorno dopo" calcolato dal recupero è **lunedì** — che è anche `week_start` della nuova settimana di piano (settimana ISO = lun-dom). F.1 ha già implementato la logica corretta (`_pianoV4NextWeekStartIso()`: se oggi è lunedì → settimana corrente; altrimenti → settimana prossima), ma la **collisione semantica resta aperta** lato welcome overlay: il "recupero welcome di domenica" se cade di lunedì annuncia la settimana che è iniziata QUEL giorno (lun→dom). **TEST del recupero giorno-dopo dal vivo NON ancora eseguito** — F.1 ha cambiato il day-check del welcome (`timeOk` forzato a true) ma il recupero `(planDow+1)%7` non è stato testato; va verificato un lunedì con `plan_generation_day='sun'`.
- **R1 dedup integratori — implementazione**: nuovo campo `supplements_log.is_second_consumption`, modal blocco preventivo Momento 2 al submit extras, tag visivo `2° CONSUMO` in timeline Oggi/Analisi. Specifica completa in sezione "Design R1 dedup integratori".
- **R3b fix prompt piano AI** (rilevante per F.2c/d): includere nel prompt AI piano settimanale gli integratori abituali dell'utente (lista da `ST.supps` attivi) con macro reali, così che il piano possa essere bilanciato considerando l'apporto base degli integratori. Critico per Ignazio (Nutrilite ~600 kcal/die distribuite).
- **Estendere `dbAddMeal(meal, date)` per supportare data custom** (oggi hardcoda `date: ST.activeDay`): bloccare ACCETTA su giorni non-oggi era workaround C.4. Quando l'utente potrà programmare pasti per giorni futuri dal piano AI servirà un helper `dbAddMealForDate(meal, date)` o override temporaneo `ST.activeDay`.
- **Riuso `SLOT_MAP_DEMO_TO_LEGACY`**: writer da `weekly_plan_meals` → `meals` dovrà tradurre slot allo stesso modo del flusso demo (Step C.4.2). NB: i pasti F.2a usano slot `'pranzo'`/`'cena'` che NON richiedono mappatura (uguali tra `weekly_plan_meals` CHECK e `meals` legacy); il problema riguarda solo `spuntino → snack_mattina` e `merenda → snack_pomeriggio` (= F.2b territory).
- **Persistenza azioni demo → real**: migrare da localStorage a `weekly_plan_acceptance.status` Supabase quando piano AI generato. localStorage resta come fallback per pasti demo (utenti senza piano AI ancora generato).
- **Banner ESEMPIO DIMOSTRATIVO condizionale**: oggi sempre visibile in overlay. Mostrato SOLO se `weekly_plan_meals` per quel giorno è vuoto (= il giorno non ha ancora pasti veri generati dal coach).
- **Card "0/7 GIORNI SEGUITI" dinamica**: oggi statica hardcoded. Deve incrementare per ogni giorno dove ≥3 pasti del piano AI sono stati accettati. Decisione product 20 mag: i demo accettati NON contano per il contatore.

## Note e scoperte da registrare (23 mag 2026 sera)

Annotazioni emerse durante Step F.2a, da portare avanti nelle sessioni future. NON dimenticare.

- **Vincolo "un solo obiettivo alla volta" (fix onboarding, accanto a refresh M1)**: scoperto dal profilo reale di Ornella (obiettivo combinato `ipertrofia+dimagrire` → target nutrizionali assurdi, 1060 kcal). Due obiettivi opposti insieme sono internamente contraddittori. **L'obiettivo deve essere SINGOLO** e cambiabile nel tempo: l'utente può scegliere prima dimagrimento, poi (raggiunto un peso) passare a ricomposizione, poi a ipertrofia. Cambio obiettivo → tutta l'app si riadegua: nuovi `target_*`, nuovi piani settimanali, eventualmente nuovo piano allenamento. Il coach LEGGE l'obiettivo, non lo decide. Da imporre nell'onboarding M1 esteso (priorità #6) come selezione esclusiva (radio o pill singola, NON multi-select).
- **Guard-rail sicurezza calorie minime (PRIMA del rilascio fuori dai 4 tester)**: l'app tocca salute → responsabilità. Soglia minima kcal sotto cui il coach NON genera ma avvisa l'utente: *"valori molto bassi, verifica con un professionista prima di seguire questo piano"*. Soglie indicative da decidere con un nutrizionista (es. < 1200 kcal donne / < 1500 kcal uomini → blocco). Da implementare PRIMA di aprire l'app a utenti che non siano tester selezionati.
- **Nomi colonna `profiles` MISTI IT/EN — non rinominare**: la tabella `profiles` ha colonne inglesi storiche (`first_name`, `target_kcal/protein/carbs/fat`, `weight_kg`, `height_cm`, `goal_weight_kg`, `sex`, `age`, `activity_level`, ecc.) + colonne italiane aggiunte dopo (`dieta`, `intolleranze` ARRAY, `note_salute`, `obiettivo`, `tipo_allenamento`, `plan_generation_day/time`, ecc.). Rischio rinomina: alto (decine di punti del codice + RLS policy + cache locale). Beneficio: nullo (l'utente non li vede). **Strategia: conviverci + documentare**. **Colonna `piano_ai` (jsonb) DORMIENTE**: vecchia idea pre-Tab Piano v4. La fonte di verità per il piano del coach è ora la tabella **`weekly_plan_meals`** (Step A → F.2a v2 → Passo 2). Dal 25 maggio 2026 (commit `9bda61a`) anche il tab Oggi è stato spostato su `weekly_plan_meals` via `ST.pianoV4RealPlanCache` — single source of truth a 2 tab. `piano_ai` resta letta SOLO da tab Piano **legacy** (`renderPiano` legacy, sostituito dietro feature flag da `renderPianoV4`) + `generaPianoAI` (flusso piano AI legacy). **NON usarla per nuove feature** legate al piano del coach: la fonte è `weekly_plan_meals`.
- **Idea futura — nome proprio al coach**: dare un nome al coach AI per identità e riconoscibilità (oggi è genericamente "il coach"). La voce del coach è già l'interlocutore UNICO di tutte le comunicazioni utente (spiegazioni piano, annuncio pasti, futuri avvisi allenamento, integratori, check fisici) → personalità coerente. Decisione di branding rimandata; per ora "il coach" funziona bene.
- **Idea futura — onboarding: scelta esplicita "coach pensa anche a colazione/merenda?"**: quando si rifarà l'onboarding M1 esteso, chiedere all'utente *"Vuoi che il coach pensi anche a colazione e merenda, o preferisci gestirle tu?"*. La libertà attuale (F.2b in stand by → colazione+merenda gestite a mano) diventa così una **scelta consapevole**, non un'assenza. Se l'utente sceglie "sì" → riattivazione F.2b (la cui logica/architettura riuserebbe quella di F.2a, già documentata in "TODO Step F.2b — STAND BY"). Se sceglie "no" → comportamento attuale = coach pianifica solo il 60% (pranzo+cena), utente gestisce liberamente il 40%.
- **Roadmap — Notifiche push (blocco dedicato dopo modulo Nutrition)**: avvisi a app chiusa (PWA push iOS/Android), sistema unico riusabile per: nuovo piano settimanale pronto, promemoria pasti se preferenza utente, promemoria integratori pacchetto, promemoria allenamento (post modulo Training). Onboarding M1 esteso includerà scelta ora avviso. Strategicamente trattenuto per V2 dopo che tutto il modulo Nutrition + parte di Training sono stabili. Welcome overlay domenicale (Step E) resta sufficiente per V1.

## Design R1 dedup integratori (21 mag 2026)

**Strategia scelta**: A — Blocco preventivo con conferma utente.
Motivo: utente non-tecnico + tester non-tecnici. Strategia B (dedup nascosta) non spiegabile se utente nota anomalia. Strategia C (separare piano AI da integratori) sacrifica business model Nutrilite.

**Momento del blocco**: 2 — solo quando l'utente registra come extra un prodotto già presente come pasto nello stesso giorno.
Motivo: intercetta solo quando il problema esiste davvero. Just-in-time UX evita avvisi inutili al Momento 1 (accettazione pasto). Avviso più convincente perché concreto e datato.

**UI**: modal centrale (coerente con pattern conferme app), background grigio, riquadro bianco.

**Testo modal**:
> Titolo: "Già nel piano di oggi"
> Corpo: "Hai accettato '<NOME_PRODOTTO>' come <SLOT> delle <ORARIO>.
>         Stai per registrarla anche come extra (+<KCAL> kcal verrebbero contate due volte)."
> Bottoni: [È un secondo consumo, conferma] [Annulla]

**Comportamento conferma**: Opzione 2 — somma + tag visivo.
- Registra extra in `supplements_log` come da flusso normale
- Marker visivo `2° CONSUMO` accanto al nome nella card timeline tab Oggi (e in Storico/Analisi quando si visualizza il giorno)
- Style tag: Mono caps ~9.5px tracking, palette evergreen `#2A7A6F` su mint `#E6F4F2` (coerente tag EXTRA)

**Trigger tecnico** (per implementazione Step F):
- Al submit "REGISTRA N EXTRA" in tab Integratori, per ogni catalog item selezionato:
  - Query meals del giorno attivo (`ST.activeDay`)
  - Match per `LOWER(TRIM(meal.name)) === LOWER(TRIM(catalog.nome))`
  - Se match → mostra modal prima di insert su `supplements_log`
  - Se utente conferma → insert con flag `is_second_consumption=true` (nuovo campo da aggiungere a `supplements_log`)
  - Se utente annulla → skip insert per quel solo item, gli altri della batch procedono normalmente

**DB change richiesto Step F**:
```sql
ALTER TABLE supplements_log ADD COLUMN is_second_consumption BOOLEAN DEFAULT FALSE;
```

### Chiusura dubbi design (21 mag 2026 sera)

Dopo mockup hi-fi Claude Design (3 frame: modal + card singola + timeline contestuale) chiusi i 3 dubbi residui:

**1. "+203 kcal" nel body modal** → chip Mono (riquadrato, monospaziato).
Motivo: il numero è il fulcro della decisione utente. Trattarlo come "oggetto visivo tracciato" lo fa fermare a leggerlo invece di scivolare via nel flow della frase. Pattern coerente con i numeri inline delle card timeline.

**2. Tag "2° CONSUMO" anche in tab Analisi** → SÌ, mostrato.
Motivo: la coerenza vince sul risparmio di pixel. Quando l'utente guarda lo storico mesi dopo e vede 2 barrette XS in un giorno, deve capire subito che è stato un secondo consumo intenzionale, non un errore. Versione `sm` 8.5px in card compatte Analisi.

**3. Modal sempre, niente opt-out "non chiedermelo più"** → confermato modal sempre.
Motivo: ship the simple version first. Non sappiamo ancora con telemetria se il caso "atleta che ne mangia 2 al giorno" è reale. Se i dati post-Step F mostreranno conferme ripetute sullo stesso prodotto, allora valuteremo opt-out scoped. Per ora regola unica e prevedibile.

### Specifiche visive finali (per implementazione Step F)

**Modal**:
- Centrato, scrim warm-black `rgba(20,15,5,0.46)`
- Riquadro bone bordi 16px radius, banda evergreen `#2A7A6F` 3px in cima
- Thumb prodotto 36×36 + eyebrow Mono caps "GIÀ NEL PIANO DI OGGI · SPUNTINO · 16:00" sopra titolo
- Titolo Syne 700 22px "Già nel piano di oggi"
- Body Syne 400 14px con highlight: nome prodotto bold + chip Mono `+203 kcal`
- CTA primario evergreen fill "È un secondo consumo, conferma"
- CTA secondario ghost Mono caps "ANNULLA"
- Shadow `--shadow-md` + offset 18px 50px

**Tag "2° CONSUMO"**:
- Variante outline: mint fill `#E6F4F2` + bordo evergreen `#2A7A6F` 1px
- Mono caps 9.5px tracking 1.4 (`sm` 8.5px in Analisi)
- Pattern "2°" separato da "CONSUMO" con piccolo gap
- Stack verticale a destra della card: EXTRA sopra, 2° CONSUMO sotto
- Estensibile a "3° CONSUMO", "4° CONSUMO" senza nuova UI

**Timeline tab Oggi**:
- Footer pillola mint "N consumi tracciati di <prodotto> oggi · entrambi contati: <somma> kcal" sotto la timeline quando ci sono eventi `is_second_consumption=true` nel giorno
- Ordine puro cronologico, niente raggruppamenti per duplicati
- Eyebrow timeline invariato

**Coerenza design system**:
- Zero nuovi token cromatici (solo evergreen + mint esistenti)
- Tipografia Syne 700/800 + Mono caps 9.5px tracking 1.4 (stessa scala EXTRA/BODYKEY/PACCHETTO)
- Radii: tag 4px, card 10px, modal 16px
- Hairline `#DDD9D0` 0.5px

**TODO Post Step I (sessione dedicata futura)**:
- **Icon system Zona Tracker custom**: sostituire emoji classiche (📅 📊 🥗 ⚡ 💧 ecc.) con set proprietario. Direzione: mix lettering Syne ingrandito (nav moduli) + SVG monocromatici geometrici (micro-azioni UI). Sessione design dedicata + 2-3 sessioni implementazione progressiva. Già rilevato in C.2.1 (emoji 📅 rimossa dall'empty state overlay)
- **Refactor namespace slot legacy**: valutare unificazione `snack_mattina/snack_pomeriggio` → `spuntino/merenda` o viceversa. 30+ punti del codice da toccare. Non urgente, fix scoped C.4.2 sufficiente per ora

## Tester attivi

- **Ignazio** (utente principale + dev) — iPhone + Android
- **Ginevra** — iPhone e/o iPad
- **Isabella** — Android + iPad (variante pescetariana)

Messaggio WhatsApp inviato 11 mag 2026 a Ginevra e Isabella per riattivazione con richiesta di costanza nei log e feedback strutturato per 2 settimane.

## Stato attuale

11 mag 2026: introdotti admin panel (`dashboardzona.html`) e logica residua kcal/macro nel modulo Nutrition. App pronta per testing con 3 tester (Ignazio + Ginevra + Isabella). Prossimi step in attesa di feedback tester.

## Stato deploy attuale (18 maggio 2026)

- **Branch**: `main` di `IgnazioF321621/benessere-forma`
- **Ultimi commit rilevanti** (catena Fase D + Nutrition v3 + tab OGGI production-ready + giro tipografico + Integratori v3 + Step 2 extras + Analisi v3):
  - `b2ad26f` — feat(home): Home V2 (Fase D Giro 1) — 4 zone grafica + dati esistenti
  - `39872f8` — fix(home): Home V2 — 5 rifiniture post-test iPhone
  - `71aa1be` — fix(home): donut Nutrition mostra kcal/macro RIMASTI + fasce chip post-workout corrette
  - `b5da150` — docs: aggiornamento CLAUDE.md al 15 maggio 2026 (post Fasi A/B/C/D)
  - `5a64cab` — feat(nutrition): restyling tab OGGI design system v3 + timeline mista pasti pianificati
  - `9718438` — docs: CLAUDE.md — log Nutrition Oggi restyling design system v3
  - `df20032` — fix(nutrition): tab OGGI v3 — ripristino mealCardHTML + supp/extra connector + debug getTodayPianoMeals
  - `12c1e5b` — fix(nutrition): eager load piano_ai in applyProfile → timeline pianificati ora visibile
  - `0e2ed37` — fix(nutrition): orario form pasto resettato all'apertura + sync con slot scelto
  - `3b9833a` — docs: CLAUDE.md — chiusura tab OGGI Nutrition production-ready
  - `0e3079e` — style(typo): tipografia più ariosa su mobile — line-height + letter-spacing + margin globali
  - `4728022` — style(typo): titoli Syne 800 più ariosi + numeri tabular-nums allineati
  - `7119c2a` — style(typo): numeri grandi ora JetBrains Mono (allineamento perfetto)
  - `7dc35c9` — feat(integratori): refresh v3 Blocco 1 — Tab Integratori + Editor Pacchetto + migrazione DB
  - `1c2a295` — fix(integratori): loadPackages filtra esplicitamente per user_id (RLS leak admin policy)
  - `fa75562` — feat(catalogo): refresh v3 Blocco 2 — modal Catalogo Nutrilite hi-fi
  - `b9ecd32` — docs: CLAUDE.md — chiusura Modulo Integratori v3 (primo round documentale)
  - `73d141b` — fix(integratori): bottone ELIMINA visibile anche su pacchetto vuoto persistito in DB (regola corretta: visibile se `e.packageId` esiste, non basata su items.length)
  - `0724a63` — chore(integratori): cleanup legacy code Blocco 1+2 post-refresh v3 (−366 righe nette, 14 simboli rimossi)
  - `c28ef45` — fix(integratori): elimina pacchetto ora cancella anche i supplements orfani (no più gruppi fantasma in bottom sheet + timeline tab Oggi)
  - `de93daf` — docs: CLAUDE.md — refinement Integratori v3 sera 16 mag (secondo round documentale)
  - `306defe` — feat(integratori): Step 2 — extras come supplements_log events (no più persistenza in supplements, "Conferma Extra" fullscreen + timeline ridisegno tab Oggi + tag EXTRA mint)
  - `09a2775` — feat(nutrition): refresh tab Storico → Analisi v3 (dashboard analitica tendenze nutrizionali — switch finestra SETTIMANA/MESE/3M/6M + 3 stat card + chart kcal SVG + heatmap status zona + macro distribution + drilldown dettaglio giorno)
- **File principale**: `zona-tracker.html` (~15360 righe dopo Analisi v3)
- **App live su GitHub Pages**: https://ignaziof321621.github.io/benessere-forma/zona-tracker.html
- **Versione visibile in app**: `v2026.05.18 · 17:04` (iniettata dal pre-commit hook `.git/hooks/pre-commit` al momento del commit)

### Stato modulo Nutrition (25 maggio 2026, post-allineamento Tab Oggi) — ✅ COMPLETO end-to-end

Il modulo Nutrition copre ora **l'intero ciclo coach** dall'inizio alla fine, **coerente su tutti i tab**: il piano vero del coach si **genera**, si **salva**, e si **vede in modo identico sia nel tab Piano sia nel tab Oggi**. Il 25 maggio pomeriggio/sera è stato chiuso l'intero filone partito il 20 maggio con lo Step A. Riprendibile in futuro su singole rifiniture residue (vedi sotto), ma il grosso del lavoro è in produzione, verificato dal vivo sul profilo Ignazio.

**Single source of truth a 2 tab** (dal commit `9bda61a`, 25 mag): tab Piano e tab Oggi leggono i pasti del coach dalla stessa fonte (`weekly_plan_meals` via cache in-memory `ST.pianoV4RealPlanCache`, popolata dal loader `_pianoV4LoadRealPlanForWeek`). Una sola fonte, un loader, una cache → impossibile che i due tab divergano. La colonna `profiles.piano_ai` (jsonb) resta dormiente e usata solo dal flusso legacy `renderPiano`/`generaPianoAI`, NON per i pasti del coach.

- **Tab Oggi**: ✅ production-ready v3 (design system v3 + tipografia v2)
- **Tab Integratori**: ✅ production-ready v3 (Blocco 1 + Blocco 2 + Step 2 extras) — completato 16-18 mag 2026 (vedi sezione "Modulo Integratori v3")
- **Tab Analisi** (ex Storico): ✅ production-ready v3 — completato 18 mag 2026 pomeriggio (commit `09a2775`).
- **Tab Piano v4**: ✅ Step A+B+C+D+E+F.1+**F.2a v2**+**Passo 2** chiusi. Il piano vero (riga `weekly_plans` + 14 pasti `weekly_plan_meals` con ingredienti/dosi/orario/spiegazione) si vede nelle card giorno e nell'overlay dettaglio, banner "ESEMPIO DIMOSTRATIVO" condizionale sparisce, disclaimer "colazione/merenda gestisci tu" in fondo all'overlay. ⏸ F.2b colazione+merenda in STAND BY. Step G/H/I non schedulati. Feature flag `ST.pianoV4Enabled` resta attivo per rollback console.
- **Sicurezza & coerenza obiettivo** (24 mag 2026, Sessione 8): ✅ A1 onboarding obiettivo SINGOLO + ✅ A2 cambio unificato in Impostazioni + ✅ B guard-rail calorie minime con avviso modale. Vedi entry changelog 24 maggio sopra.

**Rifiniture Nutrition rimaste — NON bloccanti**, riprendibili quando si vuole:
- **Tasti ACCETTA / SOSTITUISCI / SALTO sui pasti veri**: attualmente ghost disabilitati con tooltip "Azione disponibile presto sui pasti del coach". La logica reale (registrare il pasto in tab Oggi, sostituirlo, saltarlo, + tabella `weekly_plan_acceptance` + integrazione bidirezionale Tab Oggi ↔ piano vero) è un blocco futuro dedicato Nutrition, non prioritario.
- **Contatore "N/7 GIORNI CON PASTI"**: proxy semplice (giorni con pasti veri presenti in `weekly_plan_meals`). La logica "giorni effettivamente seguiti" (acceptance reale) resta futura, dipendente dai tasti sopra.
- Disclaimer "consulta un esperto" ricorrente (oltre al guard-rail sotto-soglia, promemoria gentile periodico anche con numeri normali — dove/quando = design a sé).
- Validare soglie calorie 1200/1500 con un nutrizionista prima del rilascio pubblico.
- Debito ordine macro card Piano legacy (Proteine→Carbo→Grassi vs Carbo→Proteine→Grassi).
- Test recupero "giorno dopo" welcome overlay dal vivo (nodo aperto Step E + F.1).
- F.2b colazione + merenda (in stand by, riattivabile da onboarding M1 esteso).
- Collaudo dal vivo Fix B (replica profilo Ornella).
- Cleanup `togglePianoObiettivo` no-op deprecata.

**PROSSIMO grande filone**: **Modulo Training** (la prossima sessione si sposta dal Nutrition al Training). Punto di partenza preciso da scegliere a inizio sessione. Il blocco "tasti acceptance pasti" è un'opzione Nutrition futura, non prioritaria.

### Sistema visivo numeri (post-7119c2a)
- **Titoli + body text**: Syne (display, identità visiva)
- **Numeri grandi** (donut kcal, macro card, peso): **JetBrains Mono 700** (era Syne 800) → cifre tabular nativi, baseline allineata
- **Numeri piccoli + label caps + dettagli**: JetBrains Mono (invariati)
- Vantaggio: tutti i numeri appartengono alla stessa famiglia visiva, coerenza dashboard totale

## Stato design refinement (14-15 maggio 2026)

Quattro fasi di refinement coordinate da Claude Design, eseguite da Claude Code. Stato:

- **Fase A** ✅ (commit `cfd3689`): stack visivo definitivo — font Syne (sans display) + JetBrains Mono (numeri/label), tinte moduli `--mod-nutrition` `--mod-training` `--mod-body`, sostituzione "AI" → "coach" nei testi visibili UI.
- **Fase B** ✅ (commit `97f3d1f`): refinement visivo 13 schermate M2 — pattern campo numerico Syne+mono, pillole gate Sì/No, modal Rifai/Tieni, mantra italics, CTA sticky con sfumatura morbida bone→trasparente.
- **Fase B fix** ✅ (commit `1a204f3`): 16 tip spostati DENTRO info-modal ⓘ (schermate s6/s7/s8), switch unità KG·CM / LB·IN non più tagliato dal notch (spostato nell'header verde con label "Unità di misura").
- **Fase C** ✅ (commit `49f2a24`): M1 nuovo 9 schermate (welcome + auth OTP + 7 step). Vecchio M1 5-step legacy cancellato (~97 righe). `saveOnboarding()` riscritta per leggere da `ST.m1Data`, OTP riusato (logica Supabase invariata, solo UI rinnovata).
- **Fix OTP grid + routing post-OTP** ✅ (commit `82dd4dc` + `ac3ad96`): caselle OTP a 6 quadratini affiancati senza overflow; cache `ZT_CACHE_KEY` resa per-utente (era globale, causava skip M1 per utenti nuovi su device già loggati in precedenza).
- **Fix token zombie** ✅ (commit `3d9c10f`): bootstrap valida server-side la sessione con `getUser()`. Utenti cancellati dalla dashboard Supabase vengono sloggati automaticamente all'apertura app invece di restare sospesi con sessione locale fantasma.
- **Fase D Giro 1** ✅ (commit `b2ad26f`): Home V2 nuova — saluto orario-dipendente con avatar bollino IF, 3 card moduli (Nutrition donut + Training + Body), pannello PROSSIMA AZIONE con 4 regole base statiche, tab bar bottom. Home legacy rimossa (~245 righe codice morto). Global `#header` nascosto su home via `.home-v2-hide`.
- **Fase D Giro 1 — 5 rifiniture** ✅ (commit `39872f8`): donut 84→104px + adaptive font, "SETTIMANA N/4" su card Training (cycle 4-settimane CARICO×3+SCARICO×1), body delta color v1 (da obiettivo string), top padding +30px, prima versione `getPostWorkoutHint()` (fasce 5-22).
- **Fase D Giro 1 — fix donut/chip** ✅ (commit `71aa1be`): donut Home V2 ora mostra kcal/macro RIMASTE (riusa `kcalRimaste()`/`macroRimasti()`/`isOverTarget()`/`OVER_COLOR` del modulo Nutrition — modello ibrido coerente). Fasce orarie chip post-workout ristrette: 5-10 colazione, 10-12 spuntino+colazione, 12-14 pranzo, 14-18 merenda+proteine, 18-21 cena, 21-5 cena leggera+proteine.

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
**Schema reale verificato su Supabase 22 mag 2026** (sostituisce documentazione precedente):

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | YYYY-MM-DD |
| `time` | `text` | HH:MM |
| `slot` | `text` | `colazione / snack_mattina / pranzo / snack_pomeriggio / cena / extra` |
| `description` | `text` NOT NULL | **nome cibo / descrizione pasto — colonna autoritativa per il nome.** NON esistono `name` o `food_name` |
| `kcal` | `numeric(6,1)` | totale pasto (decimali OK dopo migrazione mag 2026) |
| `protein / carbs / fat` | `numeric(5,1)` | grammi totali pasto |
| `notes` | `text` | nullable |
| `created_at` | `timestamptz` | default `now()` |

RLS abilitata — policy: `auth.uid() = user_id`.

### Tabella `nutrilite_catalog`
64 prodotti reali pre-inseriti (Nutrilite + Bodykey + XS Sports), aggiornati una tantum via sync Google Sheet. RLS SELECT pubblica. Nessun `user_id`. Colonne usate dal catalogo v3: `codice` (PK logica), `nome`, `linea` (Nutrilite/Bodykey/XS Sports), `categoria` (16+ valori reali — vedi `CATEGORY_TO_TINT`), `confezione`, `dose_die`, `dose_unit`, `kcal`, `carbo`, `proteine`, `grassi`, `prezzo_partner`, `costo_mensile_partner`, `costo_dose_partner`.

### Tabella `esercizi_catalog` (27 maggio 2026)
Catalogo esercizi verificati per il futuro coach generatore di schede Training. Stesso pattern di `nutrilite_catalog`: nessun `user_id`, RLS SELECT pubblica (`using(true)`), nessuna scrittura da client (popolata solo via sync service-role). PK logica = `codice`.

| Colonna | Tipo | Note |
|---|---|---|
| `codice` | `text` PK logica | identificativo univoco esercizio (es. `TRAZ-BANDA`, `CHEST-EL-IN-PIEDI`) |
| `nome` | `text` | nome leggibile, in italiano |
| `pattern` | `text` | pattern motorio. **Vocabolario del Google Sheet** (con spazi/accenti: "spinta orizzontale", "spinta verticale", "tirata orizzontale", "tirata verticale", "dominante ginocchio", "dominante anca", "core", "isolamento", "mobilita", **`cardio_metabolico`** dal 28 mag). Il codice normalizza via `_normPattern()` (lowercase + trim + spazi→underscore) prima di confrontare — vedi "Opzione 3" 28 mag: è il codice che si adegua alle parole del foglio, NON il foglio che deve usare gli underscore |
| `attrezzo` | `text` | `elastico`, `manubri`, `bilanciere`, `panca`, `sbarra`, `kettlebell`, `corpo libero` (con SPAZIO, non underscore — vedi Leva A 28 mag), `fitball`, `trx`, ecc. Lista separata da `;` |
| `luogo` | `text` | `casa`, `palestra`, `aperto`/`libero` (alias equivalenti — vedi Leva A), `qualsiasi`. Lista separata da `;` |
| `muscoli` | `text` | lista muscoli target separati da `;` |
| `livello` | `text` | principiante, intermedio, avanzato (o lista separata da `;`) |
| `zone_rischio` | `text` | tag IDENTICI all'onboarding M1 (`lombare;cervicale;spalle;gomiti;polsi;anche;ginocchia;caviglie;ernie;cardiovascolari;ipertensione`) separati da `;`. Vuoto = nessuna controindicazione |
| `adattamento` | `text` | come ADATTARE l'esercizio per le zone a rischio (es. "rom ridotto, niente iperestensione") |
| `alternativa` | `text` | `codice` dell'esercizio sostitutivo se l'adattamento non basta |
| `setup` | `text` | posizione iniziale + attrezzatura (1 frase) |
| `esecuzione` | `text` | step movimento separati da `;` |
| `errori` | `text` | errori comuni separati da `;` |
| `nota_sicurezza` | `text` | warning opzionale (es. "scapole basse e indietro, no scrollare") |
| `uso` | `text` | (27 mag sera, PARTE 5) `principale` / `finisher` / `recupero` separati da `;` — per quale tipo di sessione l'esercizio è adatto |
| `surrogato_attrezzo` | `text` | (28 mag) attrezzatura casalinga alternativa con cui eseguire un esercizio "da palestra" a casa, lista separata da `+` (es. `panca+elastico`). Se popolato E l'utente si allena a casa E possiede TUTTI gli attrezzi del surrogato → l'esercizio diventa disponibile come **surrogato** (flag `_surrogato` nel pool, `isSurrogato` nell'oggetto sessione) |
| `nota_surrogato` | `text` | (28 mag) come eseguire la versione surrogata casalinga (es. "usa l'elastico ancorato in basso al posto del bilanciere"). Mostrata come avviso nella card quando l'esercizio è servito come surrogato |
| `updated_at` | `timestamptz` | gestito da sync, default `now()` |

**Seme attuale**: **54 esercizi** (PK `EX001`…`EX054`). Storia: 30 iniziali (27 mag) → +3 (`EX031` Mountain climber, `EX032` Hollow hold, `EX033` Step-up, 27 mag sera PARTE 5) → +14 nuovi principali `EX034`-`EX047` (28 mag, per arricchire la copertura pattern del generatore) → +7 cardio Tabata `EX048`-`EX054` (28 mag, `pattern=cardio_metabolico`, `uso=finisher`, basso impatto articolare: no salti, no flessione lombare ripetuta). Inoltre **`EX031` riclassificato** da pattern motorio a `cardio_metabolico` (28 mag). Include i 4 esercizi storici di Ignazio (trazioni banda, chest/shoulder/row elastico). Da ampliare nel tempo.

**Sorgente**: Google Sheet dedicato `esercizi_catalog` (ID `1kEaq1SNsd5pY66p2JkFJCfBaPLtCMCk-2an3z4w9mo8`), scheda `esercizi_catalog`.

**Sync**: Google Apps Script DEDICATO e SEPARATO da quello Nutrilite — funzione `syncEsercizi`, UPSERT `on_conflict=codice` via service_role. Lanciato a mano da Ignazio quando aggiorna il catalogo (menu nativo "Sync Esercizi" nel foglio, popup risultato). Opzione futura: integrare nel sync esistente; per ora separato per sicurezza.

### Tabella `schede_utente` (28 maggio 2026)
Contenitore JSON della scheda di allenamento generata dal coach per un utente. Approccio **JSON unico** (NON multi-tabelle relazionali), coerente con `weekly_plan_meals.ingredients`/`profiles.piano_ai`. Le statistiche di progressione restano in `workout_sets`/`training_logs` (relazionali, intatte).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` |
| `blocco_n` | `integer` NOT NULL | numero progressivo del blocco (~4 settimane), per la varietà inter-blocco |
| `scheda` | `jsonb` NOT NULL | intera scheda: `{ meta:{...}, sessioni:[ {id, name, type, rir, label, rest, exercises:[...], finisher?:{...}} ] }` |
| `attiva` | `boolean` NOT NULL | default `false`. Quale scheda l'app deve leggere |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

**Muro DB anti-doppia-attiva**: indice UNIQUE PARTIAL `uq_schede_utente_una_attiva` su `(user_id) WHERE attiva = true` → max 1 scheda attiva per utente garantito dal DB. Salvataggio (`_trainGenSaveToDB`): prima `UPDATE schede_utente SET attiva=false WHERE user_id=? AND attiva=true`, poi INSERT della nuova con `attiva=true`. RLS: 4 policy `own_*` (auth.uid() = user_id).

**Lettura dall'app** (Mossa 3): `loadActiveScheda()` popola `ST.userTrainingSessions` (mappa `sessionId→session`) + `ST.userSessionCycle` (array ordinato). I 4 helper unificati `getTrainingSession(sid)` / `getAllTrainingSessions()` / `getSessionCycle()` (+ `findExInAllSessions`) leggono dalla scheda utente se presente, **fallback automatico su `TRAINING_SESSIONS` hardcoded** se nessuna scheda. ⚠️ Dentro questi helper i riferimenti DEVONO restare `TRAINING_SESSIONS`/`SESSION_CYCLE` originali — sostituirli col nome dell'helper stesso causa ricorsione infinita → stack overflow → pagina bianca (bug rilevato e fixato post-deploy Mossa 3, vedi changelog 28 mag).

### Tabella `profiles`
Dati utente: `height_cm`, `weight_kg`, `goal_weight_kg`, `target_kcal/protein/carbs/fat`, `sex`, `age`, `activity_level`, `train_start_date` (opzionale).

**Campi coach Tab Piano v4** (aggiunti 20 maggio 2026):
- `plan_generation_day` text NOT NULL default `'sun'` — **CHECK constraint `profiles_plan_day_check` ammette SOLO `'fri'/'sat'/'sun'`** (verificato 22 mag durante collaudo Step E: `UPDATE … SET plan_generation_day='thu'` viene rifiutato dal DB). Quando il Worker AI genera il piano settimanale. **Nota design vs DB**: la documentazione design 19 mag prevedeva un quarto valore `'custom'` per scelta libera del giorno, ma il CHECK in produzione **NON lo include** — quando arriverà l'onboarding M1 esteso (priorità #6) il vincolo dovrà essere esteso prima di esporre l'UI.
- `plan_generation_time` text NOT NULL default `'20:00'` — formato HH:MM (validato lato client)
- `weight_tracking_mode` text NOT NULL default `'flexible'` — CHECK `daily/every3/weekly/flexible` — preferenza pesate Livello 1

Default applicati automaticamente a tutte le righe esistenti via ALTER ADD COLUMN NOT NULL DEFAULT. UI per modificarli verrà aggiunta nel modal Impostazioni profilo nella sessione "Refresh onboarding M1" (post Tab Piano v4 V1, vedi priorità #6).

**Lettura dal codice**: `plan_generation_day` e `plan_generation_time` vengono letti per la prima volta da Step E (welcome overlay) — funzione `_pianoV4ComputeAutoWelcomeStatus` in `_pianoV4MaybeAutoWelcome`. Mappa `_PLAN_DAY_MAP` traduce abbreviazioni 3 lettere → `Date.getDay()` (0=dom..6=sab). Valori non in `{fri,sat,sun}` (es. eventuale `'custom'` futuro o seed inatteso) → fallback `'sun'` con commento esplicativo nel codice.

### Tabella `supplements`
Integratori per user_id, editabili inline.

### Tabella `supplements_log`
**Schema reale aggiornato 22 mag 2026 pomeriggio (migration 8 colonne applicata da Ignazio)**:

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | YYYY-MM-DD |
| `slot` | `text` | HH:MM dello slot di assunzione |
| `supplement_name` | `text` NOT NULL | **nome integratore — colonna autoritativa** |
| `taken` | `boolean` | true=assunto, false=registrato ma non spuntato |
| `is_extra` | `boolean` | true=registrato come EXTRA; false=integratore standard di pacchetto |
| `supplement_codice` | `text` | codice prodotto catalogo (es. `XS-PROT-BAR-CHOCO`) — popolato solo per extras dal modulo Integratori |
| `dose` | `numeric` | quantità (es. 0.5 = mezza barretta). NULL su righe pre-migration |
| `dose_unit` | `text` | es. `cps`, `barretta`, `stick`. NULL su righe pre-migration |
| `kcal` | `numeric` | snapshot kcal totali (dose ×). NULL su righe pre-migration → fallback runtime via `nutrilite_catalog` |
| `carbo` / `proteine` / `grassi` | `numeric` | snapshot macro totali in grammi. NULL su righe pre-migration → fallback runtime |
| `costo` | `numeric` | snapshot costo dose (€). NULL su righe pre-migration |
| `created_at` | `timestamptz` | default `now()` |

UNIQUE constraint su `(user_id, date, supplement_name)` — aggiunto aprile 2026 dopo cleanup duplicati.

**Storia migration**: la documentazione 18 mag (Step 2 Integratori) descriveva queste 8 colonne come applicate, ma la SQL non era stata eseguita fino al 22 mag pomeriggio. Quindi:
- Righe pre-22 mag: hanno solo le prime 7 colonne valorizzate. `supplement_codice/dose/dose_unit/kcal/carbo/proteine/grassi/costo` = NULL.
- Righe post-22 mag: snapshot completo immutabile salvato al momento dell'insert da `dbInsertExtraLog`.

**Strategia macro extras — snapshot con fallback** (Step D.3, 22 mag pomeriggio):
- Fonte di verità: snapshot DB per riga (`kcal/carbo/proteine/grassi`)
- Fallback runtime SOLO quando snapshot NULL: lookup `ST.catalog` (per `supplement_codice` → per `supplement_name` esatto → per nome normalizzato lowercase trim) e calcolo `cat.X × (dose / cat.dose_die)` con `dose` default 1 se NULL.
- `_fromFallback: true` aggiunto come marker su `ST.extras[i]` quando tutti gli snapshot erano NULL — utile per UI diagnostiche future ma non visualizzato per ora.
- Il catalogo è RETE DI SICUREZZA, mai fonte primaria → evita riscrittura retroattiva dello storico se il catalogo Nutrilite cambia in futuro.
- Nessuno script di migrazione dati: le righe pre-22 mag si auto-riparano a schermo via fallback.

**Conseguenza pratica per UI**: il rendering della timeline Oggi usa 2 path distinti senza sovrapposizioni:
- righe con `is_extra=true` → letto SOLO da `loadExtras` (con fallback macro) → renderizzato come case `'extra'` (card mint compatta tag EXTRA)
- righe con `is_extra=false` → letto SOLO da `loadTodaySuppLog` (filtro `.eq('is_extra', false)`) → renderizzato come case `'supp'` (gruppo standard) o `'supp_log'` (legacy fuori gruppo)

Fix `loadTodaySuppLog` applicato 22 mag mattina (commit `c32f141`). Fallback macro `loadExtras` applicato 22 mag pomeriggio (Step D.3).

### Tabella `supplement_packages` (16 maggio 2026)
Pacchetti orari di integratori dell'utente (es. "Mattina" alle 08:45). Architettura nuova introdotta col refresh Integratori v3.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` default |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `name` | `text` NOT NULL | es. "Mattina", "Pre-workout" |
| `emoji` | `text` NOT NULL | default `'📦'`, es. "☕", "⚡", "🌙" |
| `time` | `text` NOT NULL | formato `HH:MM`, es. `"08:45"` |
| `sort_order` | `integer` NOT NULL | default 0 |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Indici: `(user_id)`, `(user_id, sort_order)`. RLS abilitata con 4 policy `own_*` (auth.uid() = user_id) per SELECT/INSERT/UPDATE/DELETE + policy admin `admin_read_all_packages` (FOR SELECT, email check `ignazio.f@me.com`).

### Tabella `supplement_package_items` (16 maggio 2026)
Join table: quali integratori appartengono a quale pacchetto.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `package_id` | `uuid` NOT NULL | FK → `supplement_packages.id` ON DELETE CASCADE |
| `supplement_id` | `uuid` NOT NULL | FK → `supplements.id` ON DELETE CASCADE |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE (denormalizzato per RLS performance) |
| `sort_order` | `integer` NOT NULL | default 0 |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Constraint: `UNIQUE (package_id, supplement_id)` — un prodotto non può essere duplicato nello stesso pacchetto. Indici: `(package_id)`, `(supplement_id)`, `(user_id)`. RLS uguale a `supplement_packages`: 4 policy `own_*` + `admin_read_all_package_items`.

**Migrazione one-shot** eseguita il 16 maggio 2026 (script SQL DO block con guard `packages_count > 0`): per ogni `(user_id, slot)` distinto in `supplements`, crea un pacchetto `"Pacchetto {slot}"` con emoji default e collega gli items via `supplement_package_items`. Risultato: **11 pacchetti / 28 items** totali fra i tester (account Ignazio: 6 pacchetti 06:30/08:45/11:00/14:30/17:00/22:15 con 3/8/1/4/1/2 prodotti).

**Integratori "extra"**: NON serve tabella nuova. Gli extra sono `supplements` che NON hanno una riga in `supplement_package_items`. Filtrati client-side da `_extraSupps()` in `renderIntegratori()`.

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

### Tabella `weight_logs` (20 maggio 2026)
Pesate flessibili quotidiane — Livello 1 dell'architettura "check fisici a 2 livelli" Tab Piano v4. Separata da `body_logs` (che resta per check M2 mesociclo: peso + circonferenze + foto).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` default |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `date` | `date` NOT NULL | |
| `weight_kg` | `numeric(5,2)` NOT NULL | |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Constraint: `UNIQUE (user_id, date)` — una pesata/giorno, la seconda sovrascrive via upsert (la pesata "vera" è quella mattutina). Indice: `(user_id, date DESC)` per sparkline 30gg. RLS abilitata con 4 policy `own_*` + `admin_read_all_weight_logs` (email check `ignazio.f@me.com`).

### Tabella `ai_memory` (20 maggio 2026)
Preferenze, evitamenti, contesti e pattern appresi dall'AI dalle azioni utente (ACCETTA/SOSTITUISCI/SALTO sui pasti del piano settimanale). Il Worker AI in Step G aggiornerà progressivamente confidence e evidence_count.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `category` | `text` NOT NULL | CHECK: `preference` / `avoidance` / `context` / `pattern` |
| `content` | `text` NOT NULL | es. "Preferisce pesce 3x/settimana" |
| `confidence` | `numeric(3,2)` NOT NULL | default 0.50, CHECK 0.00-1.00 |
| `evidence_count` | `integer` NOT NULL | default 1 |
| `last_observed` | `date` NOT NULL | default `CURRENT_DATE` (per soft-expire >90gg) |
| `active` | `boolean` NOT NULL | default `true` (soft delete) |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Indice: `(user_id, active, confidence DESC)` ottimizzato per query "top 5 preferenze attive" della sezione Memoria AI in tab Piano. RLS: 4 own + 1 admin.

### Tabella `weekly_plans` (20 maggio 2026)
Contenitore del piano settimanale generato dall'AI. Una riga = una settimana per un utente. I pasti veri sono in `weekly_plan_meals` (figlia).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `week_start` | `date` NOT NULL | lunedì ISO della settimana |
| `target_kcal` | `integer` | snapshot al momento generazione (nullable per edge case onboarding) |
| `target_protein` | `integer` | snapshot |
| `target_carbs` | `integer` | snapshot |
| `target_fat` | `integer` | snapshot |
| `ai_reasoning` | `text` | spiegazione generale piano (mostrata nel welcome overlay come "Adattamento proposto") |
| `status` | `text` NOT NULL | default `'draft'`, CHECK `draft/active/archived` |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Constraint: `UNIQUE (user_id, week_start)` — un solo piano per settimana per utente. Flusso status: `draft` (appena generato dall'AI) → `active` (utente ha visto welcome overlay e cliccato "Vedi piano") → `archived` (settimana passata). Indice: `(user_id, week_start DESC)`. RLS: 4 own + 1 admin.

**⚠️ Dati di test preservati (post Step F.2a, 23 mag 2026 sera)**: esiste una riga `draft` per Ignazio (user_id `bb6fa499-1364-4d8d-8ce6-774c8e392306`), `week_start='2026-05-25'`, target `2200/187/209/68` kcal/P/C/F, `ai_reasoning` popolato con testo coach reale. È il banco di prova del welcome overlay Step E. **NON cancellare** finché serve come riferimento (welcome overlay, eventuale riattivazione F.2b, futuri test su `weekly_plans`/`weekly_plan_meals`). Per ri-testare il welcome overlay dopo aver premuto "Vedi piano →" (che porta status='active'): `UPDATE weekly_plans SET status='draft' WHERE user_id='bb6fa499-1364-4d8d-8ce6-774c8e392306' AND week_start='2026-05-25';`. Note collaudo storico F.1+F.2a: durante le sessioni del 23 mag la riga è stata più volte temporaneamente spostata a `week_start='2026-06-01'` per testare l'INSERT del postino/pasti, e i pasti F.2a generati nelle settimane libere sono stati poi rimossi via DELETE per ripristinare lo stato. DB pulito a fine sessione 23 mag sera. NB: F.2b in stand by (vedi "TODO Step F.2b — STAND BY"), quindi questo banco prova non ha più una scadenza di sblocco specifica.

### Tabella `weekly_plan_meals` (20 maggio 2026)
I pasti veri proposti dall'AI. Una riga = un pasto per un giorno e uno slot specifici. Figlia di `weekly_plans`.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `plan_id` | `uuid` NOT NULL | FK → `weekly_plans.id` ON DELETE CASCADE |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE (denormalizzato per RLS performance) |
| `day_of_week` | `integer` NOT NULL | CHECK BETWEEN 1 AND 7 (1=lun, 7=dom, ISO) |
| `slot` | `text` NOT NULL | CHECK `colazione/spuntino/pranzo/merenda/cena` |
| `description` | `text` NOT NULL | testo pasto proposto AI (1 frase del piatto) |
| `ingredients` | `jsonb` | **F.2a v2 (25 mag 2026)**. Array di stringhe (3-5 voci), formato `'NomeIngrediente NUMEROg'` (es. `["Filetto salmone 150g","Quinoa 70g (peso secco)","Olio EVO 10g"]`). Nullable per retrocompat sulle righe pre-25 mag |
| `meal_time` | `text` | **F.2a v2 (25 mag 2026)**. Orario indicativo `'HH:MM'`: `'13:00'` pranzi / `'20:00'` cene. Default applicato dal validatore lato app se l'AI lo omette. Nullable per retrocompat |
| `kcal` | `integer` | nullable (edge case AI fallisce calcolo macro) |
| `protein` | `integer` | grammi, nullable |
| `carbs` | `integer` | grammi, nullable |
| `fat` | `integer` | grammi, nullable |
| `ai_explanation` | `text` | "PERCHÉ TI PROPONGO QUESTO" mostrato nel Dettaglio Giorno overlay |
| `sort_order` | `integer` NOT NULL | default 0 |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Indici: `(plan_id, day_of_week, sort_order)` per render Dettaglio Giorno + `(user_id)` per RLS performance. RLS: 4 own + 1 admin.

**Migration F.2a v2 (25 mag 2026)** — eseguita manualmente in SQL Editor prima del deploy codice: `ALTER TABLE public.weekly_plan_meals ADD COLUMN IF NOT EXISTS ingredients jsonb, ADD COLUMN IF NOT EXISTS meal_time text;` Le righe pre-migration mantengono `NULL` su entrambe (retrocompat). Il renderer Tab Piano (passo 2 separato, non in questa fase) leggerà `ingredients`/`meal_time` quando presenti; sui NULL userà i dati hardcoded delle card demo come fallback.

### Tabella `weekly_plan_acceptance` (20 maggio 2026)
Tracking delle azioni utente sui pasti del piano (ACCETTA / SOSTITUISCI / SALTO / off-plan rilevato). Una riga = una azione su un pasto. Alimenta il contatore "X/7 giorni seguiti" e la memoria AI.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `plan_meal_id` | `uuid` NOT NULL | FK → `weekly_plan_meals.id` ON DELETE CASCADE |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `status` | `text` NOT NULL | CHECK `accepted/substituted/skipped/off_plan` |
| `actual_meal_id` | `uuid` | FK → `meals(id)` **ON DELETE SET NULL** (relazione laterale, no cascade — preserva storico se utente elimina pasto in tab Oggi) |
| `notes` | `text` | debug / contesto AI (es. "macro entro ±10%", "skip esplicito") |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Constraint: `UNIQUE (plan_meal_id)` — una sola azione per pasto del piano (UPDATE se l'utente cambia idea). Indice: `(user_id, created_at DESC)` per contatore real-time + lettura settimana passata da AI. RLS: 4 own + 1 admin.

Logica contatore "X/7 giorni seguiti": COUNT(*) WHERE plan_id = ? AND status IN ('accepted','substituted') — premia aderenza nutrizionale, non obbedienza letterale.

## Database — campi M1 mappati (15 maggio 2026)

Mappatura dei campi raccolti dall'onboarding M1 (9 schermate, 7 step di dati) verso lo schema `profiles`:

| Campo M1 (`ST.m1Data`) | Colonna `profiles` | Note |
|---|---|---|
| `nome` | `first_name` | text |
| `cognome` | `last_name` | text |
| `eta` | `age` | int |
| `sesso` (M/F/Altro) | `sex` | char(1): 'M'/'F'/'O' |
| `altezza` | `height_cm` | int |
| `peso_attuale` | `weight_kg` | numeric(5,2) |
| `peso_obiettivo` | `goal_weight_kg` | numeric(5,2) |
| `obiettivi[]` (multi-select max 2) | `obiettivo` | CSV string (split client-side, vedi `OBJ_ADAPT` keys) |
| `attivita` | `activity_level` | text |
| `stile_alimentare` | `dieta` | text |
| `intolleranze[]` | `intolleranze` | array text |

### TODO colonne dedicate (oggi aggregati in `note_salute`)

I seguenti campi M1 sono raccolti ma attualmente serializzati come testo libero dentro `profiles.note_salute` perché le colonne dedicate non esistono ancora nello schema. Da promuovere a colonne proprie quando serviranno operazioni filtrate (es. coach personalizzato per limitazione articolare):

- `esperienza_allenamento` (M1 step 4) — principiante / intermedio / avanzato / ritorno-allenamento
- `limitazioni[]` (M1 step 6) — array multi-select (schiena/articolazioni/condizioni)
- `altre_intolleranze` (M1 step 5) — campo libero "Altro"
- `altre_limitazioni` (M1 step 6) — campo libero "Altro"

## Navigazione — struttura attuale (aprile 2026)

| Tab | ID pagina | Contenuto |
|---|---|---|
| 🏠 Home | `home` | Dashboard: ring kcal + 3 tile modulo live |
| 🌿 Nutrition | `oggi` | Sub-nav: Oggi / Integratori / Analisi / Piano (rinominata da Storico → Analisi il 18 mag 2026) |
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

### Nutrition (sub-nav: Oggi / Integratori / Analisi / Piano)
- **Oggi**: hero ring, macro bars, timeline pasti+integratori, log pasto AI, badge zona, badge Giorno Perfetto; ogni pasto ha pulsante ✏️ modifica e 🗑️ elimina (solo desktop — su mobile solo swipe); ogni gruppo integratori ha pulsante × per eliminare il gruppo intero
- **Integratori**: pacchetti orari personalizzati + integratori extra come eventi `supplements_log`, catalogo Nutrilite hi-fi (v3, vedi sezione "Modulo Integratori v3")
- **Analisi** (ex Storico): dashboard analitica tendenze — switch finestra SETTIMANA/MESE/3M/6M, 3 stat card, chart kcal SVG area, heatmap status zona, macro distribution, drilldown Dettaglio Giorno (v3, vedi sezione "Tab Analisi v3")
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

## Decisioni di design correnti (15 maggio 2026)

Sintesi delle decisioni di design consolidate dopo Fase A/B/C/D. Queste **sostituiscono** scelte precedenti documentate nella sezione "Design system" (legacy Manrope + palette moduli verde/blu/marrone) per le schermate nuove: M1, M2, Home V2. I moduli interni (Nutrition/Training/Body sub-tab) mantengono ancora elementi grafici legacy — sono da migrare progressivamente (vedi TODO sezione successiva).

- **Stack visivo definitivo**: Syne (sans display) + JetBrains Mono (numeri/label). **Niente Manrope** sulle schermate nuove.
- **Palette**:
  - Background: bone `#F5F3EE`
  - Accent globale: evergreen `#2A7A6F`
  - Tinte modulo (variabili CSS in cima a `zona-tracker.html`): Nutrition `--mod-nutrition:#FAC775` (ambra), Training `--mod-training:#B5D4F4` (azzurro), Body `--mod-body:#AFA9EC` (viola)
  - Over-target: `OVER_COLOR='#B45309'` (ambra scuro, leggibile non allarmante)
- **Logica donut Nutrition** (sia Home V2 che modulo Nutrition): modello ibrido **"forma = consumato, numero = rimanente"** — anello si riempie col consumo, numeri al centro mostrano kcal RIMASTE. Macro pill mostrano grammi rimasti, prefisso `+N` ambra se oltre target. Riusa helper `kcalRimaste()`, `macroRimasti()`, `isOverTarget()`, `OVER_COLOR` — niente duplicazione di logica.
- **Saluto Home V2 orario-dipendente** (`renderHomeV2()`):
  - 0-5: "Notte"
  - 5-12: "Buongiorno"
  - 12-18: "Buon pomeriggio"
  - 18-24: "Buonasera"
- **Chip "DOPO L'ALLENAMENTO" fasce orarie** (`getPostWorkoutHint()`):
  - 5-10: colazione zona
  - 10-12: spuntino + colazione zona
  - 12-14: pranzo zona
  - 14-18: merenda + proteine
  - 18-21: cena zona
  - 21-5: cena leggera + proteine
- **Avatar Home V2**: bollino circolare 42px con iniziali (`first_name[0]+last_name[0]`), evergreen pieno, onclick → `openSettingsModal()`. Rimpiazza l'header globale (nascosto su home via `#header.home-v2-hide`).
- **"coach" sostituisce "AI"** in tutti i copy visibili UI (decisione 10 maggio, applicata in Fase A).
- **Tinta viola modulo Body** (`#AFA9EC`) usata in Home V2 come accent della card Body. Per i checkpoint Body futuri (M2 ricorrente) la tinta forte `#5E4A7A` resta riservata.
- **Pacchetti vs Extra — architettura confermata 16 mag 2026 sera, completata 18 mag 2026**:
  - **Pacchetti** = configurazioni persistenti dell'utente, vivono in `supplement_packages` + `supplement_package_items`. Definiscono "il mio set di integratori delle 08:45" con dose/molt/scorta editabili
  - **Extra** = registrazioni mordi-e-fuggi, eventi una tantum. Vivono in `supplements_log` con flag `is_extra=true` (Step 2 completato 18 mag — commit `306defe`). Snapshot completo nome/dose/macro/costo immutabile nella riga log
  - **Pacchetti e extra sono mondi separati e indipendenti**: eliminare un pacchetto NON tocca gli extra, registrare un extra NON modifica pacchetti
  - Stesso integratore può essere preso sia dentro un pacchetto sia come extra al volo, senza che le due cose si influenzino
  - L'utente può registrare un extra anche più volte nella stessa giornata
  - **Stato implementazione 18 mag**: pacchetti ✅ production-ready, extras ✅ production-ready (eventi `supplements_log` con `is_extra=true` + Conferma Extra fullscreen + timeline tab Oggi ridisegnata + tag EXTRA mint)
- **Target macro personalizzati — leggere SEMPRE dinamicamente dal profilo (18 mag 2026)**:
  - I target macro percentuali NON sono hardcoded `40/30/30` Zone classica
  - Ogni utente ha piano personalizzato calcolato dal proprio profilo (obiettivo + TDEE + macro adattivi via `OBJ_ADAPT` / `calcAdaptedTargets`)
  - Esempio Ignazio: `38/34/28` (ricomposizione/forza+performance)
  - Esposto su `ST.TARGET.pCarbo` / `ST.TARGET.pProt` / `ST.TARGET.pFat` (oltre ai valori in grammi `carbs/protein/fat`)
  - **Regola applicativa**: in Analisi, Dettaglio Giorno, heroCard tab Oggi v3, status zona pill — SEMPRE leggere da `ST.TARGET.p*` con fallback `40/30/30`
  - Soglia "in zona": ±2% target dinamici (severa, per dashboard analitica); "quasi zona": ±5% (più permissivo, hero card tab Oggi v3)
  - Nessun tag "PIANO BASE" mostrato in UI: il fallback opera silenzioso se i campi sono assenti

## Modulo Integratori v3 (16 maggio 2026)

Refresh hi-fi del modulo Integratori (Nutrition) coordinato da Claude Design ed eseguito da Claude Code in 2 blocchi sequenziali. Sostituisce la grafica legacy (lista raggruppata per slot + editing inline + bottoni custom) con un'architettura a **pacchetti** e un nuovo modal catalogo Nutrilite design-driven. Commit `7dc35c9` + `1c2a295` (fix RLS) + `fa75562`.

### Architettura dati nuova

- **2 nuove tabelle Supabase** (vedi sezione "Schema Supabase"): `supplement_packages` (id, user_id, name, emoji, time, sort_order, created_at) e `supplement_package_items` (id, package_id CASCADE, supplement_id CASCADE, user_id, sort_order, created_at + UNIQUE su `(package_id, supplement_id)`).
- **Indici**: `(user_id)` + `(user_id, sort_order)` sui pacchetti; `(package_id)` + `(supplement_id)` + `(user_id)` sugli items.
- **RLS**: 4 policy `own_*` per SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id) + 1 policy `admin_read_all_*` per SELECT con email check `ignazio.f@me.com` (necessaria per la dashboard admin futura).
- **Migrazione one-shot** eseguita 16 mag: 11 pacchetti / 28 items totali fra i tester. Account Ignazio: 6 pacchetti 06:30/08:45/11:00/14:30/17:00/22:15 con 3/8/1/4/1/2 prodotti.
- **Integratori "extra"**: NO nuova tabella. Sono `supplements` che NON hanno una riga in `supplement_package_items`. Filtrati client-side da `_extraSupps()`.
- **Connessione tab Oggi ↔ pacchetti**: `supplements_log` invariato (la registrazione assunzioni continua a vivere in Oggi). La timeline Oggi può raggruppare per pacchetto via lookup `supplement_id → supplement_package_items.package_id`.

### Tab Integratori principale — `renderIntegratori()` v3

Header v3 con accent bar `#FAC775` 3px + eyebrow data Mono caps + titolo Syne 800 30px "Nutrition" + avatar IF + sub-nav pillole (OGGI/INTEGRATORI/STORICO/PIANO `.oggi-v3-pill`). Sotto eyebrow di scope: `"GESTORE PACCHETTI E EXTRA · LA REGISTRAZIONE VIVE IN OGGI"`.

**Sezione "I miei pacchetti"**:
- Titolo Syne 700 18px + counter destra "N GRUPPI"
- Lista card pacchetto (~72px altezza): tile emoji 40×40 fondo `#F0EDE6` sinistra, nome Syne 600, riga sotto Mono caps `"N PRODOTTI · HH:MM"`, chevron `›` grigio destra. Stock warn `⚠ SCORTA BASSA` terracotta accanto al count se uno qualsiasi degli items ha `daysLeft ≤ 7`.
- Tap intera card → `openPackageEditor(packageId)`
- CTA primary `+ Nuovo pacchetto` fill evergreen + tag `NUTRILITE` Mono caps a destra → `openPackageEditor(null)` (CREATE mode)

**Sezione "Integratori extra"**:
- Titolo + counter "N ATTIVI"
- Righe compatte (~44px): box orario Mono caps sinistra con divisore verticale hairline, nome Syne 500, icona `···` destra
- Tap → `openExtraEditor(supplementId)`
- CTA secondary `+ Singolo integratore` outline evergreen + tag `NUTRILITE` → `openCatalogForExtra()` (apre catalogo con `ST.catalogContext.mode = 'addExtra'`)

### Editor Pacchetto — `openPackageEditor(packageId | null)` fullscreen

Modale fullscreen `#package-editor-overlay`. Sostituisce `openAddSuppModal` legacy.

- **Header banda `#FAC775`** + `‹ INDIETRO` Mono caps sinistra + titolo Syne `"Modifica pacchetto"` (EDIT) o `"Nuovo pacchetto"` (CREATE) centro + `SALVA` Mono caps evergreen destra (disabled in CREATE se nome vuoto o 0 prodotti)
- **Card meta unica** con 3 righe separate da hairline:
  - **ORARIO**: valore Mono 700 28px (es. `"08:45"`) + nome pacchetto Mono caps grigio sulla destra + bottone `MODIFICA ›` Mono caps evergreen — tap → `pkgEditorEditTime()` (oggi `prompt()` nativo)
  - **EMOJI**: tile 56×56 fondo `#F0EDE6` con emoji corrente → tap `pkgEditorEditEmoji()` (oggi `prompt()`)
  - **NOME**: input Syne 500 18px con underline dashed (segnala editabile) — debounce save 800ms in EDIT mode
- **Sezione "Prodotti nel pacchetto"** con eyebrow `"TRASCINA PER RIORDINARE · N PRODOTTI"`
  - Card prodotto in 2 stati:
    - **Vista collassata**: drag handle `⠿` + nome Syne 500 + riga Mono caps `"{dose} {unit} · {kcal} KCAL · {C}G C · {P}G P · {G}G G"` (regola macro: kcal sempre, C/P/G tutti o nessuno) + badge stock condizionale + chevron `▾`
    - **Vista espansa** pannello inset cream `#FAF8F2`: 4 macro chips colorate read-only, stepper `−/+` per **DOSE** + select unità (cps/stick/barretta/misurino), **MOLT.** step 0.25 (helper italic "0.5 = mezza dose · 2 = doppia"), **SCORTA** + auto-calcolo `"= N giorni rimasti"`, riga **COSTO** Mono caps `"€ X.XX/oggi · YY.YY/mese"` read-only, bottone `× RIMUOVI DAL PACCHETTO` Mono caps rosso `#C44434` centrato
  - **Pattern accordion**: solo uno espanso alla volta, altri collassano sempre (anche se fuori viewport). Animazione: chevron rotate 0→180deg 200ms, max-height 0→600px + opacity, cubic-bezier(.16,1,.3,1) 240ms
- **CTA `+ AGGIUNGI PRODOTTO · NUTRILITE`** outline evergreen → `pkgEditorAddProduct()` (apre catalogo con `addToPackage` mode)
- **CTA `ELIMINA PACCHETTO`** Mono caps rosso `#C44434` centrato — visibile se `ST.packageEditor.packageId` esiste (pacchetto già persistito in DB), **indipendentemente dal numero di items**. Regola corretta introdotta col commit `73d141b` (16 mag sera). La regola precedente legata a `items.length > 0` impediva eliminazione di pacchetti vuoti già persistiti (es. dopo migrazione legacy o creazione vuota — caso "Prova").
- **Empty state CREATE**: emoji 📦 grande + `"PACCHETTO VUOTO"` Mono caps + helper Syne 13px + CTA `+ Aggiungi prodotto` promossa a fill evergreen
- **Undo toast 4s** pattern Mail iOS per rimozione singolo prodotto: `pkgEditorRemoveItem()` setta `ST._pkgRemoveTimer` 4s, durante la finestra mostra toast `.pkg-undo-toast` scuro con bottone "Annulla" giallo. Allo scadere → DELETE `supplement_package_items.id`

#### Eliminazione pacchetto — comportamento corretto (commit `c28ef45`)

La funzione `pkgEditorDoDelete()` cancella in cascata sia il pacchetto sia i supplements linkati:

1. Raccoglie `suppIds` da `ST.packageEditor.items.map(it => it.supplement_id)`
2. **Bulk DELETE** su `supplements` filtrato per `user_id` (RLS-safe): `supa.from('supplements').delete().in('id', suppIds).eq('user_id', ST.user.id)`
3. **DELETE** su `supplement_packages` (FK CASCADE rimuove automaticamente `supplement_package_items`)
4. Sync in-memory immediato: filtro `ST.supps` via `Set(suppIds)` + filtro `ST.packages`
5. Re-fetch authoritative: `loadSupps() + loadPackages()` per coerenza cross-device + ricalcolo totali Home tile / `suppMonthlyCost`
6. `saveCache()` + `closePackageEditor()` + toast con count: `"Pacchetto eliminato (N integratori)"` se N>0, altrimenti `"Pacchetto eliminato"`

**Error handling separato**: se la prima DELETE su supplements fallisce → toast warning `⚠️` + early return, non procede con la delete del pacchetto (evita stati inconsistenti DB).

**Cosa NON tocca**:
- `supplements_log`: referenzia `supplement_name` (text), no FK su `supplements.id`. Lo storico assunzioni passate del pacchetto eliminato resta in DB come dati storici. Coerente con la regola "lo storico delle assunzioni viene mantenuto".
- Gli extra: invariati. Sono `supplements` non in nessun pacchetto, fuori dal blast radius dell'eliminazione.

**Differenza vs "× Rimuovi dal pacchetto"** (singolo item): quello mantiene il supplement nella libreria e lo trasforma in extra (rimuove solo il link `supplement_package_items`). "Elimina pacchetto" invece cancella tutto in cascata. Comportamento intenzionale per i 2 flussi.

### Extra editor — `openExtraEditor(supplementId)`

Riusa lo stesso overlay con `ST.packageEditor.mode = 'extra'`. Vista semplificata:
- Header banda + titolo `"Integratore extra"` + `Chiudi` destra
- Card meta: orario editabile + nome read-only (dal catalogo)
- Item card sempre espanso (no toggle): stesso stepper dose/molt/scorta + macro chips + costo
- CTA finale `ELIMINA DALLA LIBRERIA` rosso → modal conferma → `dbDeleteSupp(supplementId)` definitivo

### Modal Catalogo Nutrilite v3 — `openCatalogModal` + `renderCatalogList` riscritte

Modal fullscreen `100dvh` (override `weight-modal-inner` scoped a `#catalog-modal`). Sostituisce l'UI legacy lineare.

**Architettura split shell/content** (decisione critica per UX):
- `renderCatalogShell()` chiamata 1 volta da `openCatalogModal` — monta header + search input + pills container + eyebrow + list + CTA come scheletro statico
- `renderCatalogList()` su ogni filter change — aggiorna solo `#catalog-counter`, `#catalog-pills`, `#catalog-eyebrow`, `#catalog-list`, `#catalog-cta-btn`. **NON ricostruisce il search input** → focus preservato durante typing, no flicker tastiera iOS
- Handler `onCatalogSearchInput(value)` su `oninput` → solo `renderCatalogList()`

**UI**:
- **Shell fullscreen** bone `#F5F3EE` + accent bar `#FAC775` 3px
- **Header**: `‹ INDIETRO` Mono caps sinistra + titolo Syne 700 16px `"Catalogo Nutrilite"` centro + contatore `"N SELEZIONATI"` Mono 700 destra (grigio `#9A9388` quando N=0, evergreen quando N≥1)
- **Barra ricerca** `#ECE9E0` con icona 🔍 sinistra + clear button `×` destra (visibile solo con query). Font-size **16px** anti-zoom iOS Safari
- **Pillole categoria** scroll orizzontale: prima `"TUTTI 64"` poi una per categoria reale (es. `"INTEGRATORI BASE 8"`), ordinate per count desc, counter inline. Attiva fill `#FAC775` testo dark, inattiva outline 0.75px `#C8C3B8`. Fade hint a destra `linear-gradient(90deg, transparent → #F5F3EE)` largo 24px
- **Eyebrow** Mono caps sopra lista: `"{FILTRO} · ORDINATO PER NOME · N RISULTATI"` + link `AZZERA ›` evergreen quando filtri attivi (categoria != TUTTI OR query != '')
- **Card prodotto** (~104px):
  - **Thumb 56×56** sinistra: background tinted per categoria (vedi `CATEGORY_TINT_MAP`) + emoji semantico centrato + texture diagonale white 40%→0 via `::after` (gradevole, non AI-slop)
  - **Info centrale**: nome Syne 600 + tag linea inline (solo `BODYKEY` mint o `XS SPORTS` terracotta, non per Nutrilite default), riga categoria + porzione Mono caps (`"CATEGORIA · 1 CPS"`), riga macro Mono (regola: kcal sempre anche se 0, C/P/G tutti o nessuno, ordine `kcal → C → P → G`, colori chip semantici), riga costo `"€ X.XX/dose"` Mono color `#9A9388`
  - **Check destra** 26×26: vuoto bordo `#C8C3B8` / on fill evergreen + ✓ bianco. Animazione keyframe `catalogCheckPop` scale 0.7→1, cubic-bezier(.16,1,.3,1) 200ms
- **Stato "NEL PACCHETTO"** (legge `ST.catalogContext.alreadyInPackage`): card opacity 0.55 + tag `Nel pacchetto` Mono caps evergreen sotto la riga costo + `pointer-events:none` (no tap accidentale)
- **CTA bottom sticky** con fade gradient bone→trasparente sopra:
  - Stato 0 selezionati: opacity 0.45, disabled, label `Seleziona prodotti`
  - Stato ≥1: fill evergreen abilitato, label `Aggiungi {N} prodotti` con numero in Mono 700 inline più grosso. Singolare/plurale gestito
- **Empty state** "Nessun prodotto" con 🔍 grande + link `Azzera filtri ›` (se ci sono filtri attivi)
- **Empty state** "Catalogo non disponibile" con 📦 + `Riprova ›` (richiama `loadCatalog()`)

### Mappa colori categoria — `CATEGORY_TINT_MAP` (hardcoded JS)

Decisione "A" del brief: nessuna colonna DB nuova, mappa client-side.

- **5 macro-tinte**: `ambra #FEF3DC` (integratori base/cuore), `terracotta #FCEEE9` (sport/composizione/ossa), `rosa #FCE9EE` (pelle/donna), `verde #E6F4E6` (energia/peso/concentrazione), `beige #F0EDE6` (erbe/fegato/protezione — fallback)
- `CATEGORY_TO_TINT`: 15 mapping categoria reale → tinta (categorie non presenti → fallback `beige`)
- `CATEGORY_EMOJI_OVERRIDE`: emoji semantico per categoria (es. `Sostituto pasto → 🥤`, `Ossa / Muscoli → 🦴`, `Concentrazione → 🧠`). Le categorie senza override usano l'emoji default del macro-gruppo
- Helper `getCatalogTint(item)` ritorna `{bg, emoji}` con fallback beige + emoji 🌱

### Tab Oggi: patch badge ESAURITO

`oggiSuppCardHTML(s, taken)` patchato (commit `7dc35c9`):
- Se `_suppDaysLeft(s) === 0` → badge `ESAURITO` terracotta `#B84C2A` accanto al nome
- Se `_suppDaysLeft(s) <= 7` → badge `⚠ Ngg` terracotta (esistente, conservato)
- **NO auto-disable**: l'integratore esaurito resta visibile in timeline come segnale per riordinare
- **Regola dominio**: la label è sufficiente, l'utente vede mancare la registrazione e capisce

### Decisioni design Nutrition v3 (consolidate dai mockup Claude Design)

- **Ordine macro globale**: kcal → carbo → proteine → grassi (corretto da P/C/G legacy errato — applicato retroattivamente ovunque nel modulo)
- **Tipografia**: Syne 800/700/600/500 (identità, titoli, prosa) + JetBrains Mono 400/500/700 (TUTTI i numeri, label caps, eyebrow tecnici)
- **Tinta modulo Nutrition**: `#FAC775` SOLO su accent bar header e pillola tab attiva, MAI come fondo card
- **Pacchetti come entità**: l'utente costruisce libreria personalizzata (nome + emoji + orario + lista prodotti). Sostituisce il vecchio raggruppamento implicito per `slot`
- **Extra come eventi `supplements_log`** (rivisto Step 2, 18 mag 2026): righe con `is_extra=true` + snapshot completo macro/dose/costo. NIENTE persistenza in `supplements` (vedi sotto-sezione "Flusso Registra Extra")
- **Catalogo Nutrilite 64 prodotti reali** (Nutrilite + Bodykey + XS Sports), aggiornato una tantum via Google Sheet sync
- **Selezione multipla nel catalogo, applicazione in blocco** → 1 sola transizione step2 → import in transazione
- **"Già nel pacchetto"**: prodotti già linkati al pacchetto sorgente mostrati ma non riselezionabili (evita duplicati involontari). Costraint DB `UNIQUE (package_id, supplement_id)` è la rete di sicurezza

### Flusso "Registra Extra" — Step 2 completato (18 maggio 2026, commit `306defe`)

Ridisegno architetturale del flusso "Registra Extra" del modulo Integratori. Risolve il bug "gruppi fantasma 08:00 nel bottom sheet" e "extra fantasma in timeline" causato dall'architettura legacy che persisteva gli extras come `supplements` con `slot` valorizzato.

**Architettura extras (mordi-e-fuggi)**:
- Gli extras vivono SOLO in `supplements_log` come righe con `is_extra=true`
- NESSUNA persistenza in `supplements` (regola architettonica fondamentale)
- Pacchetti e extras sono mondi indipendenti: pacchetto eliminato NON tocca extras, registrare extra NON modifica pacchetti, stesso integratore in pacchetto + come extra al volo non hanno collisione
- Snapshot immutabile salvato nella riga log (`supplement_name`, `supplement_codice`, `dose`, `dose_unit`, `kcal`, `carbo`, `proteine`, `grassi`, `costo`) — storico onesto anche se il catalogo Nutrilite cambia in futuro
- Le macro dell'extra vengono scalate per ratio `dose / dose_die catalogo` (es. registro 2 cps di "Daily 1 cps = 4 kcal" → salva 8 kcal nella riga)
- DB extension eseguita 18 mag: 9 colonne nuove su `supplements_log` (`is_extra`, `supplement_codice`, `dose`, `dose_unit`, `kcal`, `carbo`, `proteine`, `grassi`, `costo`) + 2 indici (`idx_supplements_log_extra` parziale su `is_extra=true`, `idx_supplements_log_date_extra` per timeline) + cleanup orfani `DELETE FROM supplements WHERE id NOT IN supplement_package_items`

**Schermata Conferma Extra fullscreen** (`#confirm-extra-screen` overlay z-index 1700):
- Entry: bottom sheet "+ Registra integratori" tab Oggi → tap card "Singolo · Fuori schema" → `openCatalogForRegisterExtra()` → catalogo Nutrilite in modalità `registerExtra` → seleziona N prodotti → tap "Aggiungi N prodotti" → `openConfirmExtraScreen(codici)` slide-up
- Header: `‹ INDIETRO` Mono caps sinistra + `"Registra extra"` Syne centro + `REGISTRA` Mono caps evergreen destra (disabled se 0 prodotti o dose=0 o orario invalido)
- Banda accent `#FAC775` 3px persistente in cima (continuità modulo Nutrition catalogo → conferma)
- Eyebrow mint `"EVENTO MORDI-E-FUGGI · NESSUNA CONFIG. SALVATA"` (claim ontologico mint pill)
- Titolone Syne 800 24px `"Conferma dose & orario"` + sottotitolo Syne 13px `"Stai registrando N prodotti fuori dai pacchetti."`
- Counter Mono caps `"N PRODOTTI SELEZIONATI"`
- Card per ogni prodotto (~~104px):
  - Thumb 48×48 tinted via `getCatalogTint(item)` (riusa `CATEGORY_TINT_MAP` del catalogo) + texture diagonale `::after`
  - Nome Syne 600 15px + meta caps `"{CATEGORIA} · {dose default} {unit}"`
  - Riga DOSE: stepper `−/+` (28+28px) con input numerico al centro + select unità (cps/stick/barretta/misurino, esteso se diverso)
  - Riga ORARIO: valore Mono 700 24px + button `MODIFICA ›` Mono caps evergreen → `prompt()` HH:MM
  - Bottone `× RIMUOVI DA QUESTA REGISTRAZIONE` Mono caps rosso `#C44434` in fondo card
- **Pattern Mail iOS undo 4s** su rimozione card: card sparisce, strip nero `"Rimosso · {nome} · ANNULLA"` 36px sostituisce per 4s, poi commit definitivo. Tap ANNULLA entro 4s → card ripristinata
- **Default smart**: dose = `dose_die` del catalogo, orario = ora corrente al momento apertura schermata
- **Empty state**: se l'utente rimuove TUTTI i prodotti → blocco centrato 📦 + `"Nessun prodotto da registrare"` + helper + CTA `"‹ Torna al catalogo"` (sostituisce sticky CTA bottom). Header REGISTRA disabled
- **Back con conferma**: se l'utente ha modificato dose/orario rispetto al default OR ha rimosso card → `confirm("Annullare la registrazione?")`. Se nessuna modifica → back silent. Riapre catalog modal con selezione preservata in `ST.catalogSelected`
- **CTA sticky bottom** evergreen full-width: `"REGISTRA N EXTRA"` invariabile (anche al singolare resta `"1 EXTRA"` come unità Mono caps, decisione design per ridurre rumore visivo)
- **Submit**: per ogni item insert in `supplements_log` con macro/costo scalati per ratio dose (snapshot immutabile). Reset `ST.catalogSelected` + `ST.catalogContext` (consumati) + close schermata + reload `ST.extras` + re-render tab Oggi + toast undo Mail iOS 4s `"N EXTRA REGISTRATI · ANNULLA"` (id `#cextra-undo-toast`)
- **Toast undo post-submit**: tap ANNULLA entro 4s → DELETE cascade su tutti gli ID inseriti + reload + re-render + toast secondario `"Registrazione annullata ↩️"`

**Timeline tab Oggi ridisegnata** (`renderOggi`, case `extra` nuovo):
- Eyebrow timeline: `"PIANIFICATI · REGISTRATI"` → `"PASTI · PACCHETTI · EXTRA · IN ORDINE CRONOLOGICO"`
- `tlExtraEvents` da `ST.extras.filter(x => x.date === ST.activeDay)` mergiati con `tlMealEvents` + `tlSuppEvents`, sort cronologico per slot
- Card extra (`.oggi-v3-event` + `.oggi-v3-event-extra`):
  - Thumb 36×36 tinted via `getCatalogTint({categoria})` (lookup catalogo via `supplement_codice` o `supplement_name`)
  - Nome Syne 600 14px + meta Mono 10px `"{kcal} KCAL · {dose} {UNIT}"` + macro inline `kcal → C → P → G` (regola dominio "tutte o nessuna" se ≥1 > 0)
  - Tag `EXTRA` Mono caps 9.5px tracking 1.4 mint `#E6F4F2` + evergreen `#2A7A6F`
- Niente check ✓ (l'evento È la registrazione, no "pianificato vs registrato")
- Niente × o ▼ visibili → tap su card → modal conferma `"Eliminare la registrazione extra?"` (info-modal-overlay z-index 1600) → `doDeleteExtraFromTimeline()` → DELETE riga + reload + toast `"Extra eliminato 🗑️"`
- Macro extras conteggiate in `dayTotals` via `_extrasV3Totals(day)` (limitato a `ST.activeDay` perché `ST.extras` è caricato solo per la data attiva; storico passato resta sul pattern legacy)

**Tab Storico — minimal patch** (decisione esplicita design):
- Tag `EXTRA ×N` Mono caps 8.5px tracking 1.4 mint+evergreen accanto alla data della card giorno attivo (today) se `ST.extras.length > 0` per quella data
- Drilldown via tap sulla card → `goToDay(date)` → tab Oggi mostra i singoli extras con tag
- **Niente restyle tab Storico** — resta layout legacy. Refresh completo Storico v3 in giro futuro dedicato

**Animazioni transizione catalogo → conferma extra**:
- Slide-up nuovo overlay 280ms `cubic-bezier(.16,1,.3,1)` via `@keyframes cextraSlideUp`
- Card prodotto entrano in stagger 40ms per le prime 3 visibili (`animation-delay`) — `@keyframes cextraCardIn` 240ms
- Banda `#FAC775` persistente in cima (continuità visiva catalog → conferma)
- Back ‹ INDIETRO: slide-down 220ms `@keyframes cextraSlideDown` via classe `.dismissing`
- Selezione catalogo preservata su back (catalog modal ritrova `ST.catalogSelected` intatto)
- CTA REGISTRA `:active` scale .98 100ms

**6 decisioni design chiuse con Claude Design**:
1. Orario default per-prodotto = ora corrente apertura (non un orario unico per tutta la selezione)
2. Tag `EXTRA` posizionato a destra timeline (gerarchia visiva: nome+meta a sinistra, tag a destra)
3. CTA `"REGISTRA N EXTRA"` Mono caps invariabile anche al singolare (riduce rumore visivo plurale/singolare)
4. Niente cross-reference pacchetto/extra (no indicatori "è anche nel pacchetto X")
5. Undo Mail iOS sulla rimozione card in Conferma (no conferma destruttiva immediata)
6. Macro `kcal·C·P·G` wrappabili su schermo stretto (no overflow forzato)

**4 decisioni architetturali chiuse**:
1. Schema `supplements_log` esteso (no nuova tabella)
2. Snapshot completo immutabile (no JOIN runtime su `nutrilite_catalog`)
3. Cleanup totale fantasmi via SQL `DELETE` (no migrazione retroattiva nello storico)
4. Tab Storico solo minimal patch (no restyle in questo giro)

### Stato funzioni chiave Integratori v3

| Funzione | Scopo |
|---|---|
| `loadPackages()` | Carica `supplement_packages` + `supplement_package_items` con `.eq('user_id', uid)` esplicito (fix `1c2a295` RLS leak admin). Reset `ST.packages = []` su ogni chiamata. Join client-side con `ST.supps` |
| `renderIntegratori()` v3 | Tab principale: pacchetti + extra + CTA. Helper `_suppDaysLeft`, `_suppIdsInAnyPackage`, `_extraSupps` |
| `openPackageEditor(id)` / `openExtraEditor(id)` | Apre overlay fullscreen `#package-editor-overlay` in mode `create`/`edit`/`extra` |
| `renderPackageEditor()` / `_renderPkgItemCard()` / `_renderExtraEditor()` | Render dinamico dell'overlay basato su `ST.packageEditor` |
| `savePackageEditor()` / `_pkgEditorPersistNewPackage()` / `_pkgEditorFlushMetaPending()` | Persistenza: CREATE insert pacchetto, EDIT debounce-save su meta |
| `pkgItemSet/Adjust(supplementId, field, delta)` | Stepper dose/mult/doses → riusa `updateSupp*` legacy con re-render forzato editor |
| `pkgEditorRemoveItem()` / `pkgEditorUndoRemove()` | Pattern undo toast 4s, commit DB allo scadere |
| `pkgEditorAddProduct()` | Apre catalogo con `ST.catalogContext = { mode:'addToPackage', packageId, time, alreadyInPackage }`. In CREATE mode persiste prima il pacchetto vuoto, poi apre catalogo |
| `openCatalogModal()` / `renderCatalogShell()` / `renderCatalogList()` | Modal catalogo v3: shell statica + content dinamico (search input persistente) |
| `_renderCatalogCardV3()` / `getCatalogTint()` | Render card + helper tinta+emoji |
| `setCatalogCategory(cat)` / `resetCatalogFilters()` / `clearCatalogSearch()` / `onCatalogSearchInput(v)` | Helper filtri catalogo |
| `importFromCatalog()` | Post-insert links nuovi supplements al pacchetto via `supplement_package_items` INSERT (se `ctx.mode === 'addToPackage'`). Già patched al Blocco 1 per pre-fill slot in step2 |

### Stato ST esteso per Integratori v3

```js
{
  // Blocco 1
  packages: [],                  // [{id, name, emoji, time, sort_order, items:[{id, supplement_id, sort_order, supplement:{...}}]}]
  packageEditor: null,           // { mode:'create'|'edit'|'extra', packageId, supplementId?, name, emoji, time, items, expandedItem, dirty, saving }
  catalogContext: null,          // { mode:'addToPackage'|'addExtra', packageId?, packageName?, packageTime?, time?, alreadyInPackage?:[codice...] }
  pkgRemoveItemConfirm: null,    // { supplementId, itemId, name } — toast undo
  pkgDeleteConfirm: false,       // modal conferma elimina pacchetto/extra
  pkgExitConfirm: false,         // riservato per modifiche non salvate
  // Blocco 2
  catalogCategoryFilter: 'TUTTI', // pill categoria attiva nel modal catalogo
}
```

### Cleanup legacy Integratori v3 — completato (commit `0724a63`)

Cleanup completo del codice legacy modulo Integratori v3 eseguito il **16 mag 2026 sera**. **14 simboli rimossi**, **366 righe nette eliminate**.

Lista item effettivamente rimossi:
- Funzioni Blocco 1: `renderIntegratoriLegacy`, `setSuppFilter`, `suppDragStart` / `suppDragOver` / `suppDrop` / `suppDragEnd`, `toggleSuppExpand`, `openAddSuppModal` / `closeAddSuppModal` / `saveNewSupp`
- HTML: `<div id="add-supp-modal">` orfano nel body
- Campi ST: `suppFilter`, `suppExpanded` (mai dichiarato in init, accessi lazy)
- Funzioni Blocco 2: `toggleCatalogRemove`, `selectAllCatalog`
- Campo ST: `catalogToRemove`
- Branch `hasRem` ("Da rimuovere") completo in `goToCatalogStep2()` + blocco delete in `importFromCatalog()` (~30 righe)

**Conseguenza Opzione A**: `importFromCatalog()` è ora **puramente additivo**. Niente più capacità di rimuovere supplements via catalogo. Le eliminazioni vivono solo in:
- Editor Pacchetto → `× Rimuovi dal pacchetto` (rimuove link `supplement_package_items`, supplement diventa extra)
- Editor Pacchetto → `Elimina pacchetto` (cancella pacchetto + tutti i suoi supplements in cascata, vedi sopra)
- Extra Editor → `Elimina dalla libreria` (cancella il singolo supplement extra)

**Falsi positivi nei marker legacy** (salvati grazie all'audit pre-rimozione, NON rimossi):
- `updateSuppSlotTime` — è viva, chiamata da `renderOggi()` timeline tab Oggi v3 (input `type="time"` dell'header gruppo integratori per bulk update dello slot). Il marker `// [LEGACY-INTEGRATORI-V3]` che le era stato apposto al Blocco 1 era errato. Sostituito con commento descrittivo del suo uso.
- `ST.suppSheet` — è vivo, è lo state del bottom sheet `+ Registra integratori` tab Oggi v3 (`openSuppSheet` / `closeSuppSheet` + render del body con ~14 occorrenze attive). La precedente documentazione che lo classificava legacy era errata.

## Tab Analisi v3 (18 maggio 2026)

Refresh totale della 3ª tab Nutrition. Coordinato da Claude Design (mockup hi-fi: Vista Settimana, Vista 6 Mesi, Dettaglio Giorno drilldown) ed eseguito da Claude Code in catena unica. Commit `09a2775`. APP_VERSION `v2026.05.18 · 17:04`.

### Cambio di nome e paradigma

- **Rinominata da "Storico" a "Analisi"** — sub-nav Nutrition ora: OGGI · INTEGRATORI · **ANALISI** · PIANO
- DOM element `#page-storico` → `#page-analisi`; alias retrocompat in `showPage` / `renderPage` / `nutriSubNav` per cache PWA stale o link salvati
- **Da "lista cronologica passiva" a "dashboard analitica di tendenze nutrizionali"**
- Obiettivo: capire pattern temporali, medie, distribuzione macro, aderenza zona nel tempo
- Il dettaglio giornaliero NON è più nella lista principale: vive nel drilldown overlay (tap su grafico/heatmap → timeline read-only)

### Struttura tab Analisi

**Header v3** (riusa pattern Oggi/Integratori v3):
- Accent bar `#FAC775` 3px + eyebrow data Mono caps "VEN 18 MAG · ANALISI" + titolo Syne 800 30px "Nutrition" + avatar IF
- Sub-nav pillole `oggi-v3-pill` con ANALISI attiva fill `#FAC775`

**Switch finestra temporale (sticky top sotto sub-nav)**:
- 4 pillole Mono caps tracking 1.4: `SETTIMANA · MESE · 3 MESI · 6 MESI`
- Attiva fill evergreen `#2A7A6F` + testo bianco
- Default: SETTIMANA corrente (lun-dom italiana)
- Cambio finestra: cross-fade 180ms `cubic-bezier(.16,1,.3,1)` sul content sotto
- **ANNO scartato** in chiusura design: troppo lungo per caso uso reale (l'utente non guarda quasi mai dati così aggregati per gestire la zona settimanale)

**Header navigazione date**:
- Eyebrow Mono caps dinamico: "QUESTA SETTIMANA" / "SETTIMANA SCORSA" / "MAGGIO 2026" / "MAR — MAG 2026" ecc.
- Range data sotto (Syne 700 18px) — solo per SETTIMANA, omesso per finestre lunghe
- Nav minimal `‹ ›` (cerchio 32px outline) — chevron destro disabilitato se vista corrente (offset = 0)
- Slide del contenuto in cambio offset (no animazione esplicita, sfrutta il re-render)

**3 stat card numeriche**:
- Card 1: **MEDIA KCAL/DIE** (es. "2222") + sotto "↑ 85 VS PREC." solo in SETTIMANA, oppure "KCAL/GIORNO" fisso su finestre lunghe
- Card 2: **GIORNI IN ZONA** (es. "5/7") + sotto delta giorni in zona (SETTIMANA) o "% ADERENZA" (finestre lunghe)
- Card 3: **PASTI MEDIA/DIE** (es. "3.4") + sub "22 TOTALI"
- Stile: Mono 700 24px numero + Mono caps 9px eyebrow + Mono 500 9.5px sub
- I confronti "vs prec." compaiono SOLO su SETTIMANA (sono troppo rari su finestre lunghe per essere informativi)

**Confronto settimana vs settimana** (riga compatta, SOLO vista SETTIMANA):
- Box Mono caps con sfondo `--s2`: "VS SETT. SCORSA · 11-17 MAG · ↑ 1 GIORNO IN ZONA · +85 KCAL MEDIA"
- Frecce ↑↓ colorate evergreen (positive) / terracotta (negative)
- Scompare su MESE / 3M / 6M

**Chart kcal giornaliere SVG custom** (`_analisiRenderAreaChart`):
- viewBox `340×160`, area gradient evergreen (`stop-opacity 0.32 → 0`), linea reale stroke `#2A7A6F` 2px round
- Linea target tratteggiata orizzontale (dashed `3 3` opacity 0.55) — target dinamico dal profilo, label "TGT 2326" allineato a destra
- Dot bianchi (`r=4`, fill bianco + stroke evergreen 1.5px) sui giorni con dati, cliccabili → `openDayDetailScreen(key)`
- **Dot vuoto + dashed su "oggi"** se nessun dato registrato (asciuga la settimana corrente in progress)
- **Asta verticale sotto** + dot terracotta `#C44434` sui giorni con extras registrati (segnale visivo non invasivo)
- Tap zone `r=14` invisibili più ampie per touch mobile
- Asse X: SETTIMANA mostra L/M/M/G/V/S/D + numero giorno; MESE mostra date a step ~6; 3M/6M mostra label MAG/APR/MAR/... sui primi giorni di ciascun mese
- Asse Y minimal: 3 tick (0, mid, max) con suffisso "k" sopra 1000
- yMax dinamico: `ceil(max(kcal, target) * 1.1 / 500) * 500`

**Heatmap status zona giorno-per-giorno** (`_analisiRenderHeatmap`):
- 4 colori cella: verde `#2A7A6F` (in zona ±2% target dinamici) · ambra `#FAC775` (quasi ±5%) · terracotta `#C44434` (fuori) · grigio `#DDD9D0` (no dati)
- Numero giorno Mono caps inside cella (bianco su sfondi colorati, t3 su grigio)
- Tap su cella → `openDayDetailScreen(key)` (skip cell empty/no-data senza dayData)
- Cella "oggi" con outline 2px evergreen
- Layout per finestra:
  - **SETTIMANA**: 7 celle in riga (`.w-week`), aspect-ratio 1, gap 4px
  - **MESE**: griglia 7×~5 con padding celle vuote inizio per allineare al lunedì (`.w-month`)
  - **3 MESI**: 3 mini-griglie mensili impilate verticalmente, ognuna con header mese in Mono caps
  - **6 MESI**: 6 mini-griglie mensili impilate verticalmente (scelta design: meglio leggibili impilate che affiancate su mobile)
- Header sezione mostra titolo "Aderenza 38/34/28" con i target dinamici reali del profilo
- Legenda 4 dot 9×9px Mono caps sotto

**Macro distribution chart** (`_analisiRenderMacroBars`):
- 3 barre orizzontali CARBO (ambra) / PROTEINE (evergreen) / GRASSI (terracotta)
- Per barra: label Mono caps + valore Mono 18px grammi + sub Mono caps "38% · TGT 38%" (% reale media vs target dinamico)
- Track barre 10px height + radius 6, fill % real
- **Tick verticale tratteggiato** 2px `#t1` sul valore target (rivela visivamente quanto sei lontano dalla soglia obiettivo)

### Drilldown "Dettaglio Giorno" (overlay slide-up fullscreen)

Tap su punto chart o cella heatmap → slide-up 240ms `cubic-bezier(.16,1,.3,1)` di un overlay fullscreen.

**Shell**:
- Background scrim `rgba(0,0,0,.4)` + screen bianco con accent bar `#FAC775` 3px
- Header: `‹ INDIETRO` Mono caps sinistra (chiude overlay con slide-down 200ms) + data Syne 700 (es. "Mer 15 mag 2026") centro + kebab `···` destra
- **Kebab visibile SOLO per giorni della settimana corrente** (editing è limitato a sett. attuale per principio "non riscrivere il passato")
- Tap kebab → menu compatto `daydetail-menu` con voce "Modifica giorno" + helper Mono caps "SOLO PER GIORNI DELLA SETT. CORRENTE"
- Tap "Modifica giorno" → `goToDay(date)` (chiude overlay + naviga tab Oggi a quella data)

**Sezione riepilogo "Com'è andata"**:
- Status zona pill colorato (NELLA ZONA / QUASI ZONA / FUORI ZONA / NESSUN DATO) + target dinamico inline (es. "38 · 34 · 28 ±2%")
- Riga kcal totali grandi (Mono 24px) + "su X obiettivo" piccolo grigio + delta colorato a destra (IN LINEA / +X OLTRE TARGET / -X VS TARGET)
- 3 barre macro orizzontali coerenti con tab Analisi principale (riusa `_analisiRenderMacroBars`)

**Sezione timeline "Cosa hai registrato"** (read-only):
- Eyebrow Mono caps "TIMELINE GIORNATA · READ-ONLY · N EVENTI"
- Eventi ordinati cronologici: pasti + pacchetti integratori + extras (snapshot dal pattern timeline tab Oggi v3, ma SENZA check/×/espansione)
- Card evento: ora Mono + icona slot + nome Syne 600 + meta Mono caps + kcal + tag PACCHETTO/EXTRA opzionale
- NO interazioni dirette sulle card (la modifica è centralizzata via kebab header)
- Empty state "Nessun evento registrato" se 0 eventi quel giorno

**Limitazione cache locale documentata**:
- `ST.extras` è popolato solo per `ST.activeDay`
- Drilldown su date passate ≠ activeDay mostra 0 extras V3 nella timeline (i pasti e supps standard restano visibili perché in `ST.db.days[key]`)
- Edge case accettabile per dashboard storica — il "vero" editing si fa via "Modifica giorno" che ricarica il giorno come activeDay

### Architettura tecnica

**Dati**:
- Tutti calcolati client-side da `ST.db.days` cache locale già esistente
- **Nessuna query Supabase nuova** (decisione architetturale "B" chiusa in design)
- `ST.extras` (V3) limitato a activeDay come prima
- Refresh strategy "A" (chiusa in design): **ridisegno totale dei grafici a ogni interazione**, no cache complessa, no invalidazione granulare

**Grafici SVG custom**:
- Strategia "B" (chiusa in design): SVG scritto a mano (no Chart.js, no Recharts, no ApexCharts)
- Vantaggi: zero dipendenze nuove, layout 100% controllato, bundle size invariato, animazioni native CSS
- 3 componenti riusabili: `_analisiRenderAreaChart` · `_analisiRenderHeatmap` · `_analisiRenderMacroBars`

**Empty state onesto**:
- Decisione "A" (chiusa in design): mostrare sempre tutto anche con dati parziali
- Nota Mono caps "DATI PARZIALI · N/X GIORNI" sopra le stat card se i giorni con dati < giorni della finestra (per settimana corrente: < giorni passati di questa settimana)
- Stato totalmente vuoto: empty state centrato 📊 + "Nessun dato in questa finestra"

**Target macro percentuali — fix critico in chiusura**:
- Letti DINAMICAMENTE da `ST.TARGET.pCarbo` / `ST.TARGET.pProt` / `ST.TARGET.pFat`
- Esempio Ignazio: `38/34/28` (calcolato da `calcAdaptedTargets` per obiettivo ricomposizione/forza+performance)
- Fallback `40/30/30` (Zone classica) se i campi mancano
- Tolleranza status zona: ±2% in zona, ±5% quasi zona (più stretta della heroCard tab Oggi v3 ±5/±10 per coerenza "dashboard è più severa")

### 4 dubbi residui chiusi in design

1. **Heatmap 6 MESI**: scelta layout mini-griglie mensili impilate verticalmente (NON affiancate). Più leggibile su mobile, scroll naturale.
2. **Dati parziali**: nota onesta "DATI PARZIALI · N/X GIORNI" sempre visibile quando applicabile (non nasconde la realtà al utente).
3. **Target kcal nel chart**: linea tratteggiata orizzontale con marker label "TGT 2326" allineato a destra. Sempre visibile.
4. **Kebab "Modifica"**: visibile SOLO per giorni della settimana corrente. Per giorni passati il drilldown è puramente read-only (principio "non riscrivere il passato senza intenzione").

### 5 cambi finali (chiusura design + implementazione)

1. **Switch finestra**: SETTIMANA/MESE/3M/**6 MESI** (sostituito ANNO che era nel mockup originale — troppo lungo per il caso uso reale)
2. **Target macro %**: letti dinamicamente da profilo (Ignazio 38/34/28), NON più hardcoded 40/30/30
3. **Confronto "vs prec."**: SOLO in SETTIMANA. Su finestre lunghe i confronti sono rari e poco utili
4. **Heatmap 3M/6M**: griglie mensili impilate verticalmente, no affiancate (mobile-first)
5. **Tolleranza status zona Analisi**: ±2% in zona / ±5% quasi (più severa della tab Oggi v3 ±5/±10 — appropriato per dashboard analitica)

### Stato funzioni chiave Analisi v3

| Funzione | Scopo |
|---|---|
| `_analisiGetWindowRange(window, offset)` | Calcola `{start, end}` Date oggetti della finestra (`SETTIMANA`/`MESE`/`3MESI`/`6MESI`) all'offset specifico (0=corrente, -1=prec) |
| `_analisiGetWindowLabel(window, offset, start, end)` | Genera `{eb, range}` per header navigazione (es. "QUESTA SETTIMANA" + "11 — 17 MAG 2026") |
| `_zoneStatusForDayKey(key)` | Status zona giornaliero `inZone`/`almostZone`/`outOfZone`/`noData` con tolleranza ±2/±5% sui target dinamici |
| `_analisiCollectDays(start, end)` | Itera tutti i giorni del range, ritorna array `{date, key, dayData, totals, status, mealsN, extrasN}` |
| `_analisiAggregate(days)` | Aggregati: medie kcal/macro, giorni in zona, pasti totali/media, distribuzione macro % |
| `_analisiRenderAreaChart(daysData, targetKcal, windowKind)` | SVG path area gradient + linea + dot cliccabili + asta extras + asse X/Y minimal |
| `_analisiRenderHeatmap(daysData, kind)` | Celle status zona (`week`/`month`/`multi-month` layouts) |
| `_analisiRenderMacroBars(agg, target)` | 3 barre orizzontali C/P/G + tick tratteggiato sul target |
| `renderAnalisi()` | Entry point: orchestrazione shell + content |
| `renderAnalisiShell()` | Header v3 statico + switch finestra (1 chiamata per session tab) |
| `renderAnalisiContent()` | Content dinamico (cambia su switch finestra e nav date) — re-render totale |
| `setAnalisiWindow(window)` | Handler pillola switch (reset offset = 0 al cambio finestra) |
| `setAnalisiDateOffset(offset)` | Handler nav "‹ ›" date (clamp offset ≤ 0, mai nel futuro) |
| `openDayDetailScreen(dateStr)` | Apre overlay drilldown fullscreen slide-up |
| `renderDayDetailScreen()` | Render dell'overlay (riepilogo + timeline read-only) |
| `closeDayDetailScreen()` | Slide-down + cleanup `ST.dayDetailScreen` |
| `dayDetailToggleMenu()` | Toggle menu kebab "Modifica giorno" (visibile solo settimana corrente) |
| `dayDetailModifyTap()` | Chiude overlay + `goToDay(date)` → naviga tab Oggi per editing |

**Totale: 18 funzioni nuove** + State esteso (`ST.analisi`, `ST.dayDetailScreen`) + DOM `#page-analisi` + ~150 righe CSS `.analisi-v3-*` / `.daydetail-*`.

### Funzioni marcate legacy `[LEGACY-STORICO-V3]`

- `renderStorico` → rinominata `renderStoricoLegacy`, non più chiamata dal routing
- `setReportRange` — no-op pratico (guard `typeof === 'function'`)
- CSS `.storico-extra-tag` — commento legacy nell'header del blocco
- Alias `'storico'` in `showPage` / `renderPage` / `nutriSubNav` — retrocompat cache PWA stale, costo runtime zero
- Rimuovere tutti questi item in cleanup separato dopo verifica produzione stabile (vedi "Da rifinire")

## Tab Piano v4 — Visione + Roadmap (19 maggio 2026)

Design completo del refresh tab Piano chiuso il **19 maggio 2026** in 2 round Claude Design (Round 1: 3 mockup base + 6 decisioni residue chiuse; Round 2: estensione con architettura check fisici a 2 livelli + 6 nuovi dubbi chiusi). 12 decisioni di design chiuse totali. Decisione di implementazione presa da Ignazio: **Opzione 3** (tutto tranne notifiche push iOS).

### Cambio di paradigma

- **Da pagina "consultazione setup statica"** (legacy: target 40·30·30, piano AI textarea, priorità cliniche) **→ "coach attivo settimanale evolutivo"**
- **Filosofia**: "AI propone, utente decide" — niente automazione cieca, trasparenza ("PERCHÉ TI PROPONGO QUESTO"), no gamification ansiogena
- **Livello 4 — Coach Evoluto con equilibrio**: il coach impara dalle scelte settimanali dell'utente (accettazioni, sostituzioni, skip) e propone aggiustamenti progressivi senza forzare nessuna automazione

### Ritmo settimanale

- **Piano statico per settimana (lun-dom)**: una volta generato, il piano resta fisso fino al refresh successivo
- **AI gira UNA volta a settimana** per generare il prossimo piano basandosi su:
  - Settimana conclusa (pasti registrati, sostituzioni, skip)
  - Memoria progressiva (preferenze e contesti accumulati nel tempo)
  - Trend peso settimanale (per piccole correzioni nutrition)
  - Check M2 completo (ogni 4 settimane: peso + circonferenze + foto + esami → guida adattamento sostanziale piano nutrition + training mesociclo successivo)
- **Utente sceglie giorno+ora di generazione piano** — preset `VEN/SAB/DOM` + `PERSONALIZZATO` (combobox custom). Default in onboarding M1 esteso: `DOM 20:00`

### Architettura "check fisici a 2 livelli"

**Livello 1 — Peso flessibile on-demand**:
- Utente sceglie modalità di pesata in onboarding: `OGNI GIORNO` / `OGNI 3 GIORNI` / `OGNI SETTIMANA` / `LIBERO` (default `LIBERO`)
- Pesata via modal bottom sheet (stepper +/−0.1kg + tap numero per keyboard iOS)
- Trend peso entra in `weight_logs` Supabase, accessibile a AI per piccole correzioni settimanali
- **Reminder gentile banner** in tab Oggi se ≥14 giorni senza pesata (anti-nag: silenzio progressivo `dismiss → 48h pausa → 7gg pausa → 28gg pausa` se ripetutamente dismissed)
- Card peso in tab Piano: numero attuale + sparkline 30 giorni + CTA "Pesati ora"
- D1 (settimana 1 onboarding): card visibile con sparkline vuota + messaggio invito "Inizia a pesarti per vedere il trend" (no nascondere)

**Livello 2 — M2 check completo ogni 4 settimane (mesociclo)**:
- Già esistente (vedi sezione M2 Check Fisico — versione funzionale 13 maggio 2026)
- Peso + circonferenze + foto + blood work
- Guida adattamento **sostanziale** piano nutrition + piano training mesociclo successivo (target_kcal, macro adattati, eventuale cambio obiettivo)
- Trigger differenziato dal Livello 1: il peso flessibile aggiusta in continuo (correzioni piccole), il check M2 ridefinisce i target periodicamente

### 5 schermate hi-fi chiuse

1. **Tab Piano vista principale** (sostituisce `renderPiano` legacy):
   - Header settimana corrente (es. "Settimana del 19 mag 2026") + nav `‹ ›` per scorrere settimane future/passate
   - Card stato "ATTIVO · 5/7 GIORNI SEGUITI" con barra 7 segmenti (verde per giorni in zona, ambra per quasi, terracotta per fuori/skip)
   - 7 card giorno (lun-dom) con chip pasti emoji (colazione/spuntino/pranzo/merenda/cena), tap → overlay Dettaglio Giorno
   - Sezione **Memoria AI** scheda paper-cream `#F8F4EB`: top 4-5 preferenze più salde apprese dall'AI (es. "Preferisce pesce 3x/settimana", "Evita burro e formaggi stagionati", "Venerdì sera fuori pasto"), CTA "VEDI TUTTE ›" → lista completa
   - Card **peso flessibile**: numero attuale + sparkline 30gg + CTA "Pesati ora"
   - Profile compatto in fondo (obiettivo + target_kcal + macro % + modalità tracking peso)

2. **Dettaglio Giorno overlay** (slide-up, pattern da `daydetail-overlay` Analisi v3):
   - Pasti proposti dall'AI con macro complete + ingredienti
   - Box italic **"PERCHÉ TI PROPONGO QUESTO"** sotto ogni pasto: spiegazione AI in 1-2 frasi (es. "Hai dichiarato di preferire il pesce e ieri non hai raggiunto le proteine target")
   - 3 azioni per pasto: **ACCETTA** (scrive in `meals` di tab Oggi) / **SOSTITUISCI** (placeholder V1) / **SALTO** (marca acceptance + segnala AI per non riproporre)

3. **Welcome overlay domenicale** (sostituisce notifica push — Opzione 3):
   - Trigger: prima apertura dell'app nel giorno+ora scelti dall'utente (default DOM 20:00) E piano per settimana successiva pronto in DB
   - Overlay fullscreen con "Piano della prossima settimana pronto"
   - Diff card "Adattamento proposto" se l'AI ha modificato target (es. "Calorie ridotte da 2326 → 2200 kcal in base al trend peso +0.4kg/settimana")
   - CTA: "Vedi piano →" / "Più tardi"

4. **Modal "Pesati ora"** (bottom sheet):
   - Stepper Mono 32px `−` numero `+` (step 0.1kg)
   - Tap sul numero → apre keyboard iOS native (input type=number)
   - Default = ultimo peso registrato (se esiste in `weight_logs`)
   - CTA "Conferma" → insert `weight_logs` + toast + refresh card peso in Piano + refresh sparkline

5. **Banner reminder pesata** (solo tab Oggi):
   - Visibile in tab Oggi se ≥14 giorni senza pesata
   - Posizionato sopra timeline pasti (non in Piano per evitare invadenza)
   - Banner dismissable + anti-nag rule (silenzio progressivo 48h → 7gg → 28gg dopo dismiss ripetuti)
   - Copy: "Sono passati X giorni dall'ultima pesata. Vuoi aggiornare il trend?"
   - CTA "Pesati ora" (apre modal) / "Più tardi" (dismiss con timer anti-nag)

### 12 decisioni chiuse (Round 1 + Round 2)

1. **Giorno generazione piano**: switch con 3 preset `VEN/SAB/DOM` + `PERSONALIZZATO` (combobox custom). Default DOM 20:00. Preferenza salvata in `profiles`
2. **Contatore "X/7 giorni seguiti"**: conta accettati + sostituzioni che restano in zona macro (premia aderenza nutrizionale, non obbedienza letterale al pasto proposto)
3. **Memoria AI**: top 4-5 preferenze più salde mostrate in evidenza + CTA "VEDI TUTTE ›" per lista completa (no esposizione totale ansiogena)
4. **Bottone RIGENERA**: solo giorni futuri non ancora arrivati; il passato resta fisso come riferimento storico (no rewriting della storia)
5. **Settimana 1 onboarding**: piano AI generato subito al termine M1 con dati profilo + tag "Costruito su M1, si raffinerà con l'uso" (no attesa fine settimana per primo piano)
6. **Card peso D1**: visibile con sparkline vuota + messaggio invito (no nascondere — meglio rendere visibile la possibilità che nasconderla)
7. **Modal peso**: stepper +/−0.1kg + tap numero per keyboard iOS (combinazione, no XOR)
8. **Trend chart sparkline**: statico in V1, no interattività (no tap su punto → drilldown)
9. **Banner reminder pesata**: solo tab Oggi (non in Piano — anti-invadenza, il Piano deve essere uno spazio "calmo")
10. **Adattamento AI nutrition**: inserito in welcome overlay domenicale come diff card (concentra il messaggio nel momento "settimanale" invece di sparpagliarlo)
11. **Onboarding M1 estensione 2 nuove preferenze**: TRATTENUTO per sessione dedicata futura. Per ora default DOM 20:00 + flessibile 14gg, modificabili dal modal impostazioni profilo
12. **Notifiche push iOS PWA**: NON in V1 (Opzione 3 scelta). Welcome overlay domenicale è sufficiente per concentrare il messaggio del coach al primo apertura nel giorno scelto. Push iOS rimandata a V2 post-stabilizzazione Tab Piano v4

### Roadmap implementazione (9 sessioni Step A→I)

Decisione utente Ignazio: **Opzione 3** (tutto tranne notifiche push iOS). Implementazione sequenziale con deploy in produzione tra ogni step per validazione progressiva con tester.

- **Sessione 1 — Step A** ✅ (20 mag 2026, commit `d08ee4d`): **Fondazione dati Supabase**
  - Tabelle nuove: `weekly_plans`, `weekly_plan_meals`, `weekly_plan_acceptance`, `ai_memory`, `weight_logs`
  - Update `profiles` con 2 nuovi campi: `plan_generation_day` (text 'fri'|'sat'|'sun'|'custom'), `plan_generation_time` (text HH:MM), `weight_tracking_mode` (text 'daily'|'every3'|'weekly'|'flexible')
  - Migrazioni DDL + RLS policies (4 policy `own_*` per ogni tabella + eventuale admin policy)

- **Sessione 2 — Step B** ✅ (20 mag 2026, catena 7 commit `272e375`→`2984704`, APP_VERSION finale `v2026.05.20 · 16:01`): **UI Tab Piano vista principale v4 — scaffolding completo**
  - Feature flag `ST.pianoV4Enabled: true` (rollback istantaneo da console a `renderPiano` legacy)
  - Nuova funzione `renderPianoV4()` parallela a `renderPiano` legacy (rinomina rimandata a Step I)
  - Helper utility: `getPianoV4WeekStart(offset)`, `formatPianoV4WeekLabel(date)`, `getPianoV4Days(weekStart)`
  - 6 blocchi visivi: accent bar + header v3, nav settimane `‹ ›`, card stato sand `#FDF7E8` (hint contestuali), 7 card giorno dashed con badge OGGI, card Memoria AI bone + bordo top giallino `var(--mod-nutrition)`, card peso `getLatestBodyData()` + sparkline placeholder + CTA disabled tratteggiato grigio, profile compatto grid 2×2 con CTA `MODIFICA ›` → `openSettingsModal()`
  - Tutto in stato D1 (settimana 1 onboarding): nessuna fetch Supabase, contatore `0/7`, sparkline placeholder
  - Regola tipografica v2 applicata: numeri JetBrains Mono (TARGET kcal, MACRO %, peso 32px), testi Syne (OBIETTIVO, PESO modalità, hint contestuali). Pattern modifier `.pianov4-profile-value--mono` riusabile
  - Pausa per validazione tester prima di Sessione 3

- **Sessione 3 — Step C** ✅ (20-21 mag 2026, catena 8 commit `5384085`→`2f041f7`, APP_VERSION finale `v2026.05.21 · 11:15`): **Overlay Dettaglio Giorno completo**
  - Slide-up 240ms `cubic-bezier(.16,1,.3,1)` famiglia `.pianov4-day-*` parallela a `.daydetail-*` di Analisi v3 intatta
  - 5 pasti demo always-on per tutti i tester (no flag mock, decisione product 20 mag)
  - Banner "ESEMPIO DIMOSTRATIVO" sand+giallino chiarisce tester che sono dimostrativi
  - Totalizzatore giorno con feedback range ±10% vs `ST.TARGET.kcal` (3 stati: in-range evergreen / under ambra / over ambra) + counter "· N saltato/i"
  - Card pasto con header + macro + ingredienti + box italic "PERCHÉ TI PROPONGO QUESTO" (tono consulenza commerciale Nutrilite/XS educata)
  - 3 azioni ACCETTA + SOSTITUISCI + SALTO funzionanti con persistenza localStorage namespace `zona_pianov4_demo_*`
  - SOSTITUISCI apre bottom sheet con 3 alternative dimostrative per slot (15 totali) + reset to original
  - SALTO toggle reversibile via "↺ ANNULLA" + card barrata opacity 0.65 + escluso da totalizzatore
  - Precedenza badge: accepted > skipped > substituted (pasto accettato non sostituibile né saltabile)
  - Costante globale `SLOT_MAP_DEMO_TO_LEGACY` riusabile in Step F per writer AI piano → meals
  - Fix ortografico `pescatariano → pescetariano` ovunque
  - Safe-area iPhone notch su header overlay
  - 8 sotto-step: C.1 scaffolding · C.2 empty state + safe-area · C.2.1 rimossa emoji 📅 (icon system custom rimandato post-I) · C.3 5 demo + banner · C.4 ACCETTA + dbAddMeal · C.4.1 diagnostica bug slot · C.4.2 fix `SLOT_MAP_DEMO_TO_LEGACY` + SQL cleanup · C.5 SOSTITUISCI + totalizzatore + fix ortografico · C.6 SALTO Opzione A card barrata

- **Sessione 4 — Step D** (PROSSIMA, dopo investigazione integratori macro + comunicato tester): **Modal peso + banner reminder**
  - Bottom sheet stepper +/−0.1kg + keyboard iOS
  - Logica `weight_logs.insert()` + toast conferma + refresh card peso in Piano
  - Banner anti-nag in tab Oggi (≥14gg senza pesata, silenzio progressivo 48h/7gg/28gg via timestamp `weight_reminder_dismissed_at` in localStorage)

- **Sessione 5 — Step E ridotto**: **Welcome overlay domenicale (senza push)**
  - Overlay automatico al primo apertura app nel giorno+ora scelti (check `lastWelcomeShown` in localStorage per evitare re-show stesso giorno)
  - Diff card "Adattamento proposto" se AI ha modificato target nel piano nuovo
  - **NIENTE notifiche push iOS** (Opzione 3 — taglio strategico per evitare complessità PWA push su iOS Safari)

- **Sessione 6 — Step F.1 ✅ (23 mag 2026)**: **Postino draft `weekly_plans`** (Modo 1 "obiettivi invariati")
  - NO Cloudflare Worker cron — il postino gira **all'apertura app** nei 3 rami di `loadAndStart`, PRIMA delle chiamate welcome. Decisione architetturale: niente infrastruttura cron, sfrutta il login/wake dell'utente.
  - Crea solo la riga-madre `weekly_plans` con `status='draft'` e i 4 target copiati dal profilo senza adattamento. L'adattamento AI sui numeri (Modo 2) resta per Step G.
  - `ai_reasoning` scritto da `callAI(prompt, 200)` (voce coach, italiano, prima persona, max 2-3 frasi, variante "obiettivi invariati") con fallback fisso `_PIANOV4_POSTINO_FALLBACK_REASONING` se AI fallisce.
  - Anti-doppione SELECT + gestione `unique_violation` (23505) — il postino non duplica MAI.
  - Welcome overlay (Step E) coerente: `timeOk` neutralizzato (forza true), `plan_generation_time` resta dormiente per future push V2.
  - Forzature collaudo: `?genera=1`, `ztTestGenera()`, `?generaDebug=1`, `ztGeneraWhy()`.
  - Toast del postino con data IT `DD/MM/YYYY` (helper `_pianoV4IsoToItDate`) + durata 5500ms (`showToast` esteso con terzo parametro retro-compatibile, solo i 5 toast del postino lo usano).
  - Commit: `0fbbe86` (postino) + `74c51c5` (ritocchi toast). APP_VERSION `2026.05.23 · 15:08`.

- **Sessione 7 — Step F.2a ✅ (23 mag 2026 sera)**: **Generazione pasti pranzo + cena via AI** (14 pasti = 7 pranzi + 7 cene)
  - Subito dopo il postino F.1 (riga-madre `weekly_plans`), genera anche i pasti figli `weekly_plan_meals`. SOLO pranzo + cena in F.2a; colazione + merenda = F.2b separato.
  - Ripartizione calorica standard tutti gli utenti: Colazione 25% / Merenda 15% / **Pranzo 35%** / **Cena 25%**. Bersagli per pasto calcolati a runtime dai `target_*` del profilo (`_pianoV4F2aTargets`).
  - **Una sola chiamata** `callAI(prompt, 2000)` per tutti 14 pasti, JSON rigido, parser/validator robusto (`_pianoV4F2aParseAndValidate`): 14 pasti, copertura completa 1..7 × {pranzo,cena}, campi obbligatori (`day`, `slot`, `description`). MAI throw.
  - **Opzione A**: riga-madre F.1 creata SEMPRE, indipendentemente dall'esito pasti. Se F.2a fallisce → draft resta senza pasti, welcome overlay annuncia comunque, no rollback.
  - Funzioni nuove: `_pianoV4F2aTargets`, `_pianoV4F2aBuildPantry`, `_pianoV4F2aBuildPrompt`, `_pianoV4F2aParseAndValidate`, `_pianoV4GenerateAndInsertMeals`. Hook in `_pianoV4MaybePostino` DOPO INSERT riga-madre. Anti-doppione doppio (skip-existing di F.1 + guard `plan_id` pre-INSERT).
  - Convenzioni DB: `day_of_week` 1=LUN..7=DOM ISO; `slot` ∈ {'pranzo','cena'} (CHECK ammette colazione/spuntino/pranzo/merenda/cena); `sort_order` pranzo=1/cena=2.
  - **Prompt irrobustito in 3 giri di collaudo dal vivo** (lezione chiave: il coach AI va affinato iterativamente):
    1. Giro 1 (`4bc94eb`): funziona meccanicamente ma INVENTA ("Pollo di mare" per pescetariano) e ripete giorno 7.
    2. Giro 2 (`76cb793`): 10 regole ferree + DISPENSA AMMESSA (`_pianoV4F2aBuildPantry` whitelist categorie ingredienti per dieta+intolleranze) + divieto invenzione + divieto mascheramento (esempio negativo esplicito "pollo di mare") + varietà ingredienti + attenzione giorno 7. Risolto: ingredienti veri, no latticini, 7 giorni diversi.
    3. Giro 3 (`8ae2dda`): VARIETÀ DI STRUTTURA — tavolozza A piatti unici/zuppe, B cotture pesce variate NO crudo/tartare, C schema pranzo/cena variabile, D proteine protagoniste legumi/uova. Risolto: niente più monotonia "carbo+pesce / pesce+contorno".
  - **Toast voce coach** (`e966956`): rimossi termini interni "Postino"/"draft"/"INSERT" dai messaggi visibili. Testi finali: "Il coach ha generato il tuo piano per la settimana del DD/MM/YYYY" (5500ms) + "Il coach ha preparato pranzi e cene della settimana" (7500ms). Termini tecnici restano solo in console.log.
  - Collaudo dal vivo positivo su profilo Ignazio (2326 kcal pescetariano + no lattosio): 14 pasti, pranzi ~800-830 / cene ~570-600 kcal, ingredienti reali, intolleranze rispettate, varietà piena ingredienti+struttura.
  - Catena commit: `4bc94eb` + `76cb793` + `8ae2dda` + `e966956`. APP_VERSION finale `2026.05.23 · 21:56`.

- **Sessione 8 — Step F.2b ⏸ STAND BY (non eliminato)**: **Colazione + merenda** (= il restante 40% calorico riservato)
  - **Decisione 23 mag sera (post-F.2a)**: colazione e merenda lasciate alla gestione libera dell'utente; il coach genera SOLO pranzo + cena (F.2a). La ripartizione 25/15/35/25 protegge comunque il 40% — il coach punta solo al 60% — quindi l'utente ha lo spazio per gestire i due pasti a mano senza sforare la giornata. F.2a è di fatto il punto d'arrivo della parte automatica del modulo Nutrition per questa fase.
  - Riattivazione futura prevista se in onboarding M1 esteso l'utente sceglierà esplicitamente "voglio che il coach pensi anche a colazione e merenda" (vedi idea onboarding in sezione "Note e scoperte"). Logica/architettura di riferimento: riuso F.2a (stesso pattern `_pianoV4F2aBuildPrompt` + parser/validator + INSERT batch + DISPENSA).
  - Specifica originale archiviata (per riattivazione): 7 colazioni (25%) + 7 merende (15%) per draft, slot `'colazione'`/`'merenda'`, colazione standardizzata per utente (dolce/salato + tipo bevanda), merenda spesso = barretta energetica.

- **Sessione 9 — Step G**: **Logica adattamento + memoria AI**
  - Worker (o postino esteso, da decidere in G) legge `weight_logs` settimanali, calcola trend peso (slope linear regression su 14gg), propone adattamento target_kcal (Modo 2)
  - Aggiorna `ai_memory` con preferenze apprese dalle azioni utente (es. "preferisce pesce" se 3+ sostituzioni con pesce, "evita burro" se SALTO ripetuto su pasti con burro, "venerdì fuori" se SALTO ricorrente venerdì sera)
  - Logica "AI propone, utente decide": no automatismi sui target — l'utente conferma manualmente via diff card nel welcome overlay

- **Sessione 10 — Step H**: **Integrazione bidirezionale tab Oggi**
  - Registra pasto in Oggi → sistema verifica se il pasto è pianificato per quel giorno+slot
  - Match → marca `weekly_plan_acceptance.status='accepted'` automaticamente
  - No match in zona macro → marca `status='substituted'` (conta nel "X/7 giorni seguiti")
  - No match fuori zona → marca `status='off_plan'` (NON conta nel contatore)
  - Contatore "5/7 giorni seguiti" real-time in card stato

- **Sessione 11 — Step I**: **Update CLAUDE.md + cleanup legacy**
  - Marca `renderPiano` (versione legacy) → `renderPianoLegacy`
  - Aggiorna routing `showPage`/`renderPage` per puntare a `renderPianoV4`
  - Documentazione finale completa Tab Piano v4 production-ready
  - Roadmap successive (V2): notifiche push iOS, SOSTITUISCI funzionante con catalogo pasti AI, food input multi-modale integrato

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

## Lezioni di metodo (per sessioni future)

Sette principi distillati da incidenti reali — leggere PRIMA di affrontare anomalie o feature che leggono/scrivono dati persistenti.

### 1. Il DB è la fonte di verità, non il codice né questo file

Sessione 4 (22 mag 2026, fix triplo render barretta): la diagnostica via codice produsse "3 row DB distinte da 3 gesti utente". L'utente eseguì una SELECT reale e il DB rivelò **1 sola riga** in `supplements_log` — bug di RENDERING, non di scrittura. Quel SELECT cambiò radicalmente la natura del fix.

Stesso pattern: CLAUDE.md ha portato fuori strada 2 volte in una giornata (schema `supplements_log` documentato come "+9 colonne applicate il 18 mag" → smentito dall'utente con `SELECT column_name FROM information_schema.columns`; previsione "dose fallback farà X" → smentita dal comportamento reale post-migration).

**Regola operativa**: davanti a un'anomalia o a una decisione che dipende dallo schema/dato, **PRIMA contare/ispezionare le righe reali nel DB**, POI guardare il codice. Mai assumere lo schema dal codice o dalla documentazione.

### 2. SQL Editor Supabase: `auth.uid()` non funziona, serve UUID esplicito

Il SQL Editor gira come ruolo admin (non come utente app), quindi `auth.uid()` ritorna NULL e tutti i WHERE basati su quello sono no-op. Per ispezionare dati utente serve filtrare con UUID hardcoded.

UUID di riferimento:
- **Ignazio** (utente principale + dev): `bb6fa499-1364-4d8d-8ce6-774c8e392306`

Per scoprire lo schema reale di una tabella (più affidabile di indovinare nomi colonna):
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'supplements_log';
-- oppure più rapido:
SELECT * FROM supplements_log LIMIT 1;
```

### 3. Prompt AI = scatola opaca, verificare la fonte dati PRIMA di costruirvi sopra

Step D.3 R3a (22 mag pomeriggio): la lezione del fix barretta fece scattare un audit obbligatorio prima di scrivere il prompt: "qual è la struttura ST che alimenta il blocco INTEGRATORI ASSUNTI? Produce contenuto reale o vuoto?".

Risultato dell'audit: `ST.extras = []` perché `loadExtras` falliva silenziosamente. Senza l'audit, il fix R3a sarebbe stato "implementato" ma sempre silente in pratica — peggior caso: lavoro che sembra fatto ma non sblocca nulla.

**Regola operativa**: prima di costruire una feature AI o un blocco di prompt, FERMATI e produci un esempio CONCRETO del contenuto che verrà passato al modello per la giornata corrente dell'utente. Se è vuoto, capisci PERCHÉ è vuoto, non riempire con dati finti.

### 4. Snapshot con fallback (pattern per dati storici)

Step D.3 `loadExtras` introdusse il pattern definitivo per i dati storici tipo "registrazione utente che dipende da catalogo esterno":

- **Snapshot al momento della registrazione** salvato sulla riga DB (`kcal, carbo, proteine, grassi, dose, dose_unit, supplement_codice, costo`) → fonte di verità
- **Catalogo come RETE DI SICUREZZA**, mai fonte primaria → lookup runtime solo se snapshot è NULL (es. righe pre-migration)
- **Marker `_fromFallback: true`** sulle righe ricostruite via catalog → utile per UI diagnostiche future

Se invece il catalogo fosse fonte primaria, ogni modifica al catalogo riscriverebbe retroattivamente lo storico — comportamento sbagliato per "log immutabile di cosa l'utente ha consumato il giorno X". Snapshot+fallback preserva l'onestà storica.

### 5. Verifica pre-commit obbligatoria quando il fix cambia ciò che l'utente VEDE

Mattino 22 mag: fix `c32f141` (filtro `is_extra` in `loadTodaySuppLog`) fu committato con previsione "barretta sparirà dalla timeline finché non risolviamo lo schema". L'utente la previde, la accettò, ma serve disciplina perché senza la nota esplicita avrebbe potuto sembrare regressione.

Pomeriggio 22 mag: fix `b4259f5` (loadExtras + R3a) — STEP 3 ("verifica no-duplicato") fu OBBLIGATORIO pre-commit. Confermato che la barretta apparisse 1 sola volta e contasse 1 sola volta. Senza quella verifica avremmo potuto riaprire il triplo render appena chiuso al mattino.

**Regola operativa**:
- Quando un fix tocca rendering/totali → produrre un riepilogo "cosa cambia visibilmente per l'utente" PRIMA del commit, non dopo
- Quando 2 fix toccano lo stesso terreno (es. fix barretta mattino + loadExtras pomeriggio) → verificare esplicitamente l'interazione tra i due
- Quando un fix introduce nuova sorgente dati o nuovo path di lettura → tracciare l'effetto su tutti i path che leggono la stessa struttura

### 6. "Mostra A invece di B"? Verifica che B sia stato SCRITTO, prima di indagare la lettura

Sera 25 mag (passo 2 → collegamento tab Piano): il tab Piano continuava a mostrare i pasti **demo** invece dei pasti veri del coach, nonostante 2 fix successivi sulla lettura. Catena di ipotesi sbagliate prima di trovare il vero problema:
1. **"È un filtro su `status='active'`?"** → no, la SELECT non filtrava per status (verificato).
2. **"È la cache negativa sticky?"** → fix legittimo, ma il bug si presentava anche su cache pulita.
3. **"È un mismatch chiavi cache write/read?"** → no, entrambe passavano per lo stesso helper `_pianoV4WeekStartIsoForOffset`.

Solo dopo aver aggiunto log diagnostici lungo tutta la catena (commit `3991322`) è emersa la verità: `weekly_plan_meals` per quel piano **conteneva 0 righe**. Un `?genera=1` precedente aveva creato la riga-madre `weekly_plans`, ma la generazione AI dei 14 pasti (F.2a v2) era fallita silenziosamente nello stesso turno — Opzione A: madre resta senza figli. Il `_pianoV4HasRealPlanForWeek` ritornava correttamente `false` (`plan exists but no meals`) → fallback demo, esattamente come progettato.

**Regola operativa**: davanti al sintomo "vedo il dato di fallback X invece di quello atteso Y", la prima cosa da verificare NON è la catena di lettura/cache/filtro/render — è la SCRITTURA del dato atteso. Una SELECT diretta sul DB (`SELECT COUNT(*) FROM weekly_plan_meals WHERE plan_id = '…'`) ti dice in 2 secondi se stai cercando di leggere qualcosa che non esiste. Se Y non è in DB, qualsiasi fix sulla lettura è tempo sprecato.

Vale come complemento alla lezione 1 ("il DB è la fonte di verità"): non basta ispezionare il DB della tabella sbagliata. Quando il sintomo è "fallback invece di valore reale", traccia la pipeline a ritroso fino alla scrittura del valore reale.

### 7. Quando il dato vero migra di sede, schianta proattivamente la vecchia fonte

Sera 25 mag (fix tab Oggi): Tab Piano e Tab Oggi mostravano pasti DIVERSI per lo stesso giorno (esempio: "Branzino 582 kcal" nel tab Oggi vs "Zuppa di lenticchie 580 kcal" nel tab Piano). Causa: il 20-24 maggio avevamo migrato la fonte di verità del piano del coach da `profiles.piano_ai` (colonna jsonb dormiente legacy) alla tabella `weekly_plan_meals` (passo per passo: Step A → F.2a v2 → Passo 2). Il tab Piano era stato aggiornato a leggere dalla nuova fonte. Il tab Oggi era rimasto come zombie ancorato alla **vecchia fonte** per ~12 ore, mostrando un piano legacy stale, finché il sintomo non è arrivato visibile all'utente.

Esiste un solo lettore — la funzione `getTodayPianoMeals()` — e si trova con `grep ST.pianoAI` in 5 secondi. Ma il check non era stato fatto in modo sistematico al momento della migrazione.

**Regola operativa**: quando introduci una nuova fonte di verità per un dato, l'ultimo passo NON è "il nuovo lettore funziona". È:
1. `grep` su TUTTI i punti del codice che leggono la VECCHIA fonte (variabile globale, colonna DB, localStorage, ecc.)
2. Per ogni lettore: decidi se va migrato sulla nuova fonte oppure marcato esplicitamente come legacy con commento (e, idealmente, con una constante boolean `USE_LEGACY_X = true` o un feature flag che renda visibile la dipendenza).
3. Solo dopo: chiudi la migrazione e dichiara la nuova fonte come SSOT.

Lasciare un lettore zombie ancorato alla vecchia fonte è uno dei modi più affidabili per generare bug di coerenza inter-tab/inter-feature, perché finché entrambe le fonti hanno dati, il bug è invisibile fino al primo "cambio di stato" (es. F.2a v2 scrive su `weekly_plan_meals` e non più su `piano_ai` → da quel momento i due dati divergono e il lettore zombie pubblica dato stantio).

Complementare alla lezione 1 (DB fonte di verità) e alla 6 (verifica la SCRITTURA): qui la lezione è sulla **disciplina di chiusura della migrazione**.

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

## TODO post-fasi-design (15 maggio 2026)

Lavoro rimasto dopo le 4 fasi di design (A/B/C/D). Ordinato per area, non per priorità — l'ordine di esecuzione verrà deciso dopo la riprogettazione modulo Nutrition + Home definitiva su Claude Design.

1. **Pulsante "Nuovo check fisico" sempre visibile** nel modulo Body. M2 è un evento **ricorrente ogni 4 settimane**, non una tantum (vedi `getNextCheckpointInfo()` su Home V2 che calcola scadenza). Il modulo Body oggi non ha un CTA dedicato per riavviare M2.
2. **Reminder automatico fine-scheda allenamento** → notifica/banner "È ora del check fisico" quando il countdown 28 giorni scade. Trigger da decidere (visita Home, fine workout, lazy).
3. **UI storico esami del sangue** nel modulo Body — oggi `blood_tests` ha lo schema ma nessuna visualizzazione lato app. Lista + grafico per parametro nel tempo (emoglobina, ferritina, ecc.).
4. **Modulo Nutrition rifatto** con stile Syne/Mono allineato a M1/M2/Home V2 (decisione presa il 15 mag, lavoro su Claude Design in corso). Oggi i sub-tab Oggi/Integratori/Storico/Piano hanno ancora elementi grafici legacy (palette verde/blu/marrone, font system).
5. **Obiettivo utente visibile nella Home V2** (es. eyebrow "RICOMPOSIZIONE" sotto saluto) — design da finalizzare su Claude Design. Dato disponibile in `ST.profile.obiettivo` (CSV).
6. **Colore delta peso Body contestuale all'obiettivo** — già implementato in Home V2 al commit `39872f8`/`71aa1be` usando `goal_weight_kg` vs `weight_kg`. Da estendere coerentemente al modulo Body interno (oggi mostra solo verde/grigio statico).
7. **Respiro sopra saluto Home V2** — già applicato in `39872f8` (top padding +30px). Verificare se basta o serve altro tuning su Claude Design.
8. **Colonne DB dedicate** per `esperienza_allenamento`, `limitazioni[]`, `altre_intolleranze`, `altre_limitazioni` — oggi tutto serializzato in `profiles.note_salute`. Da promuovere a colonne quando servirà filtering/query (vedi sezione "Database — campi M1 mappati").
9. **Logica AI per PROSSIMA AZIONE dinamica** (Fase D Giro 2) — sostituirà `getProssimaAzioneSimple()` (4 regole statiche) con prompt contestuale che legge profilo + stato giornaliero + storico recente. Sorgente AI: Cloudflare Worker Groq esistente.
10. **Coerenza grafica retroattiva** sui moduli interni Nutrition/Training/Body — oggi solo M1/M2/Home V2 hanno il nuovo stack Syne+JetBrains Mono. I sub-tab interni dei moduli sono ancora su sistema legacy (vedi sezione "Design system" rispetto a "Decisioni di design correnti").

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
- [x] Recovery G3/G6 ristrutturate in micro-esercizi + countdown ibrido (12 maggio 2026)
- [x] Blocco Attivazione 5 min con countdown autonomo per tutte le 6 sessioni (12 maggio 2026)
- [x] muscleImg sugli esercizi recovery (33 esercizi con immagine, 18 con null esplicito) (12 maggio 2026)
- [x] Recovery G3/G6 — auto-collapse blocchi + micro-pause 5s/10s + stop blocco tra blocchi diversi (13 maggio 2026, commit `29eaac6`)
- [x] M2 Check Fisico — versione funzionale (intro/foto/misure/esami/esito), entry post-M1 + resume cross-device + skip persistente (13 maggio 2026)
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

## MODULO TRAINING — REGOLE DEL COACH & DECISIONI
*Fonte: sessione design 24 maggio 2026. Diviso in: Parte 1 = regole che il coach AI userà per generare i programmi; Parte 2 = decisioni di prodotto.*

### PARTE 1 — REGOLE DEL COACH

**Filosofia di fondo**
Il coach ragiona come il miglior coach del mondo: massima personalizzazione dentro confini non negoziabili. Continuità nella progressione, varietà nello stimolo. Eredita dal blocco precedente per far crescere; varia gli esercizi senza improvvisare. Tutto basato sulla letteratura, mai su sensazioni.

**A) Cosa deve coprire**
1. Ogni programma copre tutto il corpo: 6 pattern + core, sempre tutti presenti.
2. Pattern: spinta orizzontale · spinta verticale · tirata orizzontale · tirata verticale · dominante di ginocchio · dominante d'anca · core. + rifiniture (bicipiti, tricipiti, spalle laterali, polpacci).
3. Equilibrio spinta/tirata: tirata >= spinta.
4. Dominante d'anca irrinunciabile (protegge lombari e ginocchia).
5. Core a due anime: stabilità (protettiva, sempre) + impatto (intenso e breve).
6. Copertura completa e bilanciata sempre garantita: la varietà non salta mai un pattern.

**B) Come sceglie gli esercizi**
7. Libreria universale e ampia: il coach conosce molti esercizi; gli esempi discussi sono indicativi, non liste chiuse.
8. Ogni esercizio = pattern + movimento, adattabile a più attrezzature (stesso esercizio in versione elastico/manubri/bilanciere/corpo libero).
9. Filtra sempre per attrezzatura dichiarata + protezioni dell'utente. Niente esercizi controindicati.

**C) Progressione e varietà**
10. Ogni nuovo blocco eredita i dati del precedente (carichi, reps, RIR, andamento).
11. Varia gli esercizi mantenendo i pattern: cambia l'esercizio, non lo schema motorio.
12. Progressione = non solo "più carico": anche meno aiuto (es. elastico più leggero), più reps, più tempo sotto sforzo.
13. Mai improvvisare: sceglie dentro la cornice.

**D) Struttura e tempo**
14. Periodizzazione: ciclo 4 settimane (3 carico + 1 scarico), DUP (Forza/Ipertrofia), RIR controllato.
15. Ogni blocco dura 4 settimane; a fine blocco si chiude e (se possibile) parte un programma nuovo.
16. Sessione max 45 min (recuperi inclusi). Il tempo decide quanti esercizi entrano.
17. Finisher metabolico: solo se obiettivo dimagrimento/ricomposizione -> +5/10 min (tetto 50 min), a intervalli (Tabata 20/10 o 30/30), basso impatto articolare, rispetto protezioni.

**E) Obiettivi e dosaggio**
18. Sei obiettivi singoli (da onboarding): dimagrimento · ricomposizione · ipertrofia · forza & performance · longevità · mantenimento.
19. Dosaggio per obiettivo: forza (carichi alti, reps basse, rec. lunghi) · ipertrofia (volume alto, reps medie) · ricomposizione (stimolo + densità, finisher moderato) · dimagrimento (densità alta, rec. brevi, finisher, preservando muscolo) · longevità (moderato, sostenibile, mobilità/core/articolazioni) · mantenimento (dose minima efficace).
20. Confini universali: RIR controllato sempre (mai cedimento); il volume parte prudente e cresce nei blocchi.

**F) Relazione e tono**
21. Alert protezione = promemoria di tecnica, non divieti. Il coach incoraggia la crescita; l'utente esperto autoregola.
22. Tutto funziona in automatico da onboarding, senza chat. Le regole valgono per ogni utente.

### PARTE 2 — DECISIONI DI PRODOTTO

**Chiusura blocco (fine 4 settimane)**
- A fine blocco il coach PROPONE il check fisico M2 (non impone).
- Check fatto -> coach legge dati aggiornati -> genera programma nuovo (ereditarietà + variazione).
- Check saltato -> coach NON genera -> ripropone il programma esistente per un altro blocco; riproporrà il check alla chiusura successiva. Il check è la chiave che sblocca il progresso, non un ostacolo.
- Il coach legge due fonti: progressi fisici/estetici (check M2: foto, circonferenze -> se l'obiettivo funziona / correzione rotta) + progressi di forza (training_logs: carichi, reps, RIR -> come progredire).
- Stato attuale: il check M2 ESISTE ed è completo (foto, circonferenze, dati corporei, tabella body_checks), ma oggi è agganciato al LOGIN (m2EntryIntro chiamata all'avvio), non alla fine blocco. Da RI-AGGANCIARE alla chiusura blocco. Manca anche il riconoscimento del momento "blocco finito" (oggi il contatore settimana riparte muto: formula (workout/6)%4+1).

**Programma = prescrizione, non documento editabile**
- Fase 1: il coach genera, l'utente segue. Niente modifica libera dei singoli esercizi (impegno/rischio alti, sporca lo storico della progressione).
- Fase 2 (futuro): modificabilità GUIDATA — l'utente comunica circostanze ("sono fuori sede", "poco tempo questa settimana", "non riesco a fare X") e il coach RI-DECIDE rispettando regole. Adattamento temporaneo e circoscritto (di norma 1 settimana); non altera la progressione del blocco. Richiede la "voce" del coach nel training.

**Buco onboarding da colmare (prima della generazione)**
- Presenti: obiettivo (6, combaciano), livello/esperienza, limitazioni fisiche (lista ricca: lombare, cervicale, spalle, gomiti, polsi, anche, ginocchia, caviglie, ernie, cardiovascolari, ipertensione, altro).
- MANCANO: attrezzatura disponibile e giorni/tempo allenamento a settimana. Entrambi indispensabili al coach Training. Da aggiungere riusando pattern pillole/card esistente (m1-pill-toggle / m1-card-level).

**Catena di generazione del programma (la "fabbrica" del coach)**
1. Leggi chi è (profilo/onboarding) -> 2. Leggi dove è arrivato (forza + check) -> 3. Decidi dosaggio (obiettivo) -> 4. Componi struttura (pattern sulle sessioni, equilibrio, tempo) -> 5. Scegli esercizi (kit + protezioni, varia + eredita) -> 6. Applica periodizzazione (4 sett., DUP, RIR) -> 7. Verifica e consegna.

**Metodo di lavoro (questa fase)**
- Prima tutte le idee, poi la grafica (Claude Design disegna il modulo Training intero, coerente, in un colpo solo).
- Le decisioni si consolidano nel CLAUDE.md (non file separato), in due parti (regole coach / decisioni prodotto).

**Punti ancora aperti (prossimi passi, non bloccanti)**
- Verificare/riusare suggestProgressionAI esistente quando si costruirà la generazione.
- Raffinare "quando" il finisher serve oltre dimagrimento/ricomposizione (es. longevità -> lavoro cardio dolce).
- Idea: invito al check che si rafforza ad ogni blocco saltato.

### ONBOARDING M1 — BLOCCO TRAINING (attrezzatura + giorni + tempo) + INTERRUTTORE
*Design chiuso in sessione chat 25 maggio 2026. **IMPLEMENTATO il 25 maggio 2026** in [zona-tracker.html](zona-tracker.html) — 5 nuovi step nell'onboarding + sequenza dinamica + progress bar dinamica + 5 nuovi campi salvati su `profiles`. Vedi entry log dedicata in "Cosa abbiamo fatto" (25 maggio 2026 sera). La sezione qui sotto resta come riferimento di prodotto consolidato.*

**Perché**: il coach Training non può generare programmi per nuovi utenti senza sapere
attrezzatura disponibile e giorni/tempo. Inoltre non tutti vogliono il Training → serve
un interruttore a monte.

**Interruttore Training (a monte del blocco)**
- Step dedicato "Come vuoi che il coach ti accompagni?" con 2 card a selezione singola:
  - Card 1 — **Alimentazione**: "Il coach pensa ai tuoi pasti e ai tuoi integratori"
  - Card 2 — **Alimentazione e allenamento**: "Il coach ti segue anche con i workout su misura"
- Salvataggio: `profiles.usa_training` (boolean, default true).
- Se `usa_training = false`:
  - il blocco training dell'onboarding viene SALTATO;
  - il modulo/tile Training NON appare in home;
  - il coach NON genera il programma di allenamento.
- Ripensamento: il training è ATTIVABILE in seguito dalle Impostazioni. All'attivazione
  mancheranno attrezzatura/giorni/tempo (mai chiesti) → servirà un mini-onboarding training
  in quel punto (dettaglio da definire in sessione futura).

**Attrezzatura — impianto a IMBUTO**
- Passo 1 — "Dove ti alleni?" card a selezione singola (riusa pattern obiettivo `m1-card-goal`/`m1-card-level`):
  - **Casa** → mostra Passo 2 (pillole attrezzatura)
  - **Palestra attrezzata** → il coach assume "hai tutto", nessuna altra domanda
  - **All'aperto / poco attrezzato** → corpo libero + sbarra/elastici portatili, nessuna pillola
- Passo 2 — solo se "Casa": pillole multi-select (riusa pattern `m1-pill-toggle`), divise in 2 gruppi (come le limitazioni allo step 6):
  - **Attrezzi**: Elastici (a tubo) · Manubri · Bilanciere + dischi · Kettlebell · Panca · Sbarra per trazioni · Fitball · TRX / anelli
  - **Accessori elastici**: Maniglie · Barra corta · Barra lunga · Cavigliere
- **Corpo libero è IMPLICITO** (non è una pillola): è la base sempre disponibile. Nessuna pillola accesa = coach lavora a corpo libero puro.
- Lista aggiungibile in futuro, mai da togliere.
- Salvataggio: `profiles.attrezzatura` (text[]). Per Palestra/Aperto si potrà salvare un marcatore coerente (da definire in implementazione); il "dove" va in `tipo_allenamento`.

**Giorni a settimana**
- Pillole a selezione singola: **2 · 3 · 4 · 5**
- Lettura coach: 2 = full-body · 4 = upper/lower (schema attuale) · 5 = upper/lower + giorno jolly
- Salvataggio: `profiles.giorni_allenamento` (integer).

**Tempo-base a sessione**
- Pillole a selezione singola: **30 · 45 · 60** min
- È il tempo su cui il coach costruisce il blocco (tetto 45 + finisher; nessuna opzione oltre i 60).
- Salvataggio: `profiles.durata_sessione` (integer).

**Idea parcheggiata — Fase 2 "Oggi ho solo X min" (stile Freeletics)**
- Funzione SEPARATA dal tempo-base: l'utente dichiara meno tempo per UNA singola sessione e il
  coach la comprime (taglia serie/esercizi a bassa priorità, tiene i pattern fondamentali) senza
  toccare la progressione del blocco. Vive nella "voce del coach" Training (modificabilità guidata Fase 2).

**Ordine finale onboarding M1** (i nuovi step in grassetto):
1. nome
2. dati corporei
3. obiettivo
4. **interruttore "Come vuoi che il coach ti accompagni?"**
5. attività + esperienza
6. **blocco training (solo se `usa_training = true`): dove+attrezzatura · giorni · tempo**
7. dieta + intolleranze
8. limitazioni fisiche (per tutti, anche solo-nutrition)
9. riepilogo + avvio check

**Mappatura salvataggio su `profiles`** (riepilogo):
- dove → `tipo_allenamento` (text)
- attrezzatura → `attrezzatura` (text[], creata 25 mag)
- giorni → `giorni_allenamento` (integer)
- tempo → `durata_sessione` (integer)
- interruttore → `usa_training` (boolean default true, creata 25 mag)

**Punti aperti per le prossime sessioni** (non bloccanti):
- Mini-onboarding training all'attivazione tardiva da Impostazioni.
- ~~Mostrare gli "Accessori elastici" solo se "Elastici" è acceso~~ ✅ implementato (RITOCCO 2, 25 mag).
- Marcatore di salvataggio per Palestra/Aperto in `attrezzatura` — al momento si salva `NULL` (il coach interpreta dal `tipo_allenamento`).
- Effetto a cascata dell'interruttore su home/moduli (oltre al nascondere il tile Training).

### PARTE 3 — TABELLA PROGRESSIONE (27 mag 2026)
Decisioni consolidate. Valgono per il prompt AI di `suggestProgressionAI` e per il futuro coach generatore. Logica serie-per-serie: ogni serie loggata produce la proposta per quella SUCCESSIVA. Nuova sessione → la 1ª serie riparte dall'ultima serie loggata la volta precedente (storico DB), poi progredisce.

**Elastici a tubo (resistenza in lbs)**
- Tetto reps + RIR ≥ target → **+10 lbs**, riparti dal minimo reps
- Dentro range + RIR = target → stessa resistenza, **+1 rep**
- RIR > target (facile) → stessa resistenza, **alza reps** verso il tetto
- RIR 0 (cedimento) ma reps nel range → stessa resistenza, **abbassa reps**
- Sotto il minimo reps → **-10 lbs**

**Trazioni alla sbarra (resistenza = colore banda)**
Scala da PIÙ DURA a PIÙ FACILE: `Gialla → Rossa → Nera → Viola`. La banda AIUTA: più pesante = più aiuto = trazione più facile. `BAND_COLORS = ['Gialla','Rossa','Nera','Viola']`, indice 0 = più dura. Progredire = scendere verso Gialla.
- Tetto reps + RIR ≥ target → **banda un gradino PIÙ DURA** (verso Gialla, indice minore), riparti dal minimo reps
- Dentro range + RIR = target → **stessa banda, +1 rep**
- RIR > target → stessa banda, **alza reps**
- RIR 0 (cedimento) ma reps nel range → stessa banda, **abbassa reps**
- Sotto il minimo reps → **banda un gradino PIÙ FACILE** (verso Viola, più aiuto)
- Limite raggiunto = già su Gialla al tetto reps con buon RIR → suggerisci **trazione libera senza banda**

### PARTE 4 — COACH GENERATORE (architettura, DA COSTRUIRE)
*Decisioni di product/architettura prese il 27 mag 2026. Implementazione nelle prossime sessioni.*

**Filosofia**: opzione **"catalogo verificato + AI che assembla"** — NON l'AI inventa esercizi. Stesso principio del catalogo integratori Nutrilite: fonte unica, scalabile, l'utente fa onboarding e il coach gli costruisce la scheda. Vale per Ignazio e per i nuovi tester (es. Ginevra).

**Lettura limitazioni utente — niente intervento manuale**
L'utente DICHIARA le limitazioni fisiche nell'onboarding M1 (campo `limitazioni` array + `altre_limitazioni`, già esistenti in `profiles`/`note_salute`). Il coach legge e si regola da solo, nessun intervento manuale di Ignazio per caso singolo.

**Gestione cautele — adatta prima, sostituisci dopo**
Il coach incrocia `limitazioni` utente × tag `zone_rischio` dell'esercizio nel catalogo. Regola:
1. **PRIMA ADATTA** usando la colonna `adattamento` dell'esercizio.
2. **SOLO SE NON BASTA SOSTITUISCE** con l'esercizio in `alternativa` (codice).

**RIR controllato — solo intermedio/avanzato**
Il RIR è ATTIVO solo per livello intermedio/avanzato. Per i **principianti** il coach genera schede SENZA RIR (lo introdurrà quando l'utente raggiunge il livello intermedio).

**Continuità vs varietà — "schede su schede in continuità"**
- **DENTRO il blocco** (~4 settimane): l'esercizio resta lo STESSO. La progressione ha bisogno di un riferimento stabile per lo storico (carichi, reps, RIR confrontabili settimana per settimana).
- **TRA blocchi**: il coach VARIA gli esercizi mantenendo i pattern (cambia esercizio, non schema motorio). Stimolo nuovo, ma il dato di partenza eredita dal blocco precedente.

**Fallback `TRAINING_SESSIONS`**
Gli esercizi fissi nel codice (`TRAINING_SESSIONS`) RESTANO come rete di sicurezza. Logica futura del modulo Training:
1. Cerca la scheda personale dell'utente in DB.
2. Se non c'è → usa `TRAINING_SESSIONS` come fallback.

Nessun utente resta mai senza allenamento.

### PROSSIMI PASSI MODULO TRAINING (ordine)
1. **Coach generatore**: logica che legge onboarding (attrezzatura/giorni/durata/esperienza/obiettivo/limitazioni) + pesca dal catalogo `esercizi_catalog` + applica le regole (cautele, RIR per livello, continuità intra-blocco, varietà tra blocchi). Decisioni di logica PRIMA del codice (stessa metodologia design-prima di Nutrition).
2. **Salvataggio schede per-utente in DB** + lettura dal modulo Training con **fallback** su `TRAINING_SESSIONS` (rete di sicurezza).

### PARTE 5 — COACH GENERATORE: DECISIONI DI LOGICA COMPLETE (27 mag sera)
*Sessione dedicata: chiuso TUTTE le decisioni di logica del generatore prima di scrivere codice. La fase decisioni è chiusa. Mancano da fare: (1) SQL tabella `schede_utente` su Supabase, (2) brief tecnico Claude Code del generatore vero.*

**Catalogo — aggiornamenti**
- Aggiunta colonna `uso` (text) a `esercizi_catalog`: valori ammessi `principale` / `finisher` / `recupero` (separati da `;` se più di uno). Indica per quale tipo di sessione l'esercizio è adatto. Migrazione: `alter table public.esercizi_catalog add column if not exists uso text;` (già applicata).
- Catalogo ampliato da 30 a **33 esercizi**: aggiunti Mountain climber controllato (`EX031`, finisher), Hollow hold (`EX032`, finisher), Step-up al ritmo (`EX033`, `finisher;recupero`). Sync via menu "Sync Esercizi" sul Google Sheet (Apps Script v3 con `onOpen()` che crea menu nativo nel foglio, popup risultato invece di log).
- Etichettatura attuale: 27 esercizi `principale`, 12 con tag `finisher`, 6 con tag `recupero` (alcuni multi-uso).

**Split (deciso dai giorni di allenamento dichiarati in M1)**
- **2 giorni** → Full Body × 2
- **3 giorni** → Full Body × 3 (se livello principiante) · Upper / Lower / Full (se intermedio o avanzato)
- **4 giorni** → Upper / Lower × 2
- **5 giorni** → Push / Pull / Legs / Upper / Lower

**Parametri training (decisi da obiettivo × esperienza, NON solo obiettivo)**
4 profili base, modulati dall'esperienza per evitare regressioni su utenti avanzati:
- **Forza** (`forza_performance`): reps 4-6, RIR 2-3, recupero 3 min
- **Ipertrofia** (`ipertrofia`): reps 8-12, RIR 1-2, recupero 90-120s
- **Ricomp / metabolico** (`dimagrimento`, `ricomposizione`): reps 10-15 per principianti, range più bassi per intermedi/avanzati, RIR 1, recupero 60-90s
- **Salute** (`longevita`, `mantenimento`): reps 6-10, RIR 2, recupero 90-120s
- **RIR attivo SOLO per intermedio/avanzato**. Principianti: schede SENZA RIR (già deciso stamattina, qui consolidato).

**Tempo & numero esercizi**
- Il numero esercizi NON è fisso per durata: viene calcolato dal coach come `serie × reps × recupero` finché copre il tempo dichiarato (30/45/60 min). Range orientativo: 2-4 a 30 min, 3-5 a 45 min, 4-6 a 60 min — varia per profilo (Forza ha recuperi lunghi → meno esercizi).
- **Recupero attivo opzionale**: nuovo step in onboarding M1 da aggiungere — chiede 0/1/2 giorni di recupero attivo aggiuntivi rispetto ai giorni di allenamento dichiarati. Genera sessioni con `uso=recupero` dal catalogo.
- **Finisher metabolico Tabata**: ~5 min in coda alla sessione (durata totale = dichiarata + 5), SOLO per obiettivo `dimagrimento` / `ricomposizione`. Pesca esercizi con `uso` che contiene `finisher`. Tutti i finisher rispettano le regole già decise: basso impatto articolare, no salti, no flessione lombare ripetuta (nessun crunch).

**Selezione esercizi (opzione C: equilibrio garantito + libertà di enfasi)**
Pattern obbligatori MINIMI per sessione (sopra il minimo il coach ha libertà):
- **Full Body**: 1 spinta + 1 tirata + 1 dominante ginocchia + 1 dominante anca + 1 core
- **Upper**: 1 spinta orizz + 1 spinta vert + 1 tirata orizz + 1 tirata vert
- **Lower**: 1 dominante ginocchia + 1 dominante anca + 1 core
- **Push**: spinta orizz + spinta vert · **Pull**: tirata orizz + tirata vert · **Legs**: ginocchia + anca
- Sopra il minimo: enfasi/isolamento a scelta del coach in base all'obiettivo.

**Ordine esercizi (regola fissa, valida per tutti)**
1. **Multiarticolari pesanti** (compound: squat, stacco, panca, military, trazioni) all'inizio quando si è freschi
2. **Complementari** (multiarticolari secondari o varianti) al centro
3. **Isolamenti** (curl, push-down, polpacci) alla fine
4. **Core / anti-rotazione** in coda (o all'inizio se attivazione)

**Cautele utente** (già deciso stamattina, qui solo richiamo)
- L'utente dichiara limitazioni in onboarding M1 (campo `limitazioni` array + `altre_limitazioni`).
- Coach incrocia con `zone_rischio` dell'esercizio. **Regola: prima ADATTA (colonna `adattamento`), solo se non basta SOSTITUISCE con `alternativa`**.

**Varietà tra blocchi (approccio misto, calibrato sull'esperienza)**
- **Dentro il blocco** (~4 settimane): esercizi FISSI (la progressione ha bisogno di riferimento stabile per lo storico).
- **Tra blocchi**:
  - **Principianti** → cambiano 1-2 esercizi a blocco (stesso pattern, esercizio diverso), gli altri restano → continuità per imparare la tecnica
  - **Intermedi/avanzati** → maggiore rotazione, possibili blocchi tematici (es. blocco forza → blocco ipertrofia → blocco ricomp/condizionamento)

**Scambio esercizio su richiesta utente (opzione C limitata)**
- Pulsante "cambia esercizio" disponibile, ma con vincoli:
  - **Massimo 1-2 scambi per sessione**
  - **L'alternativa la propone IL COACH** (stesso pattern), non l'utente dal catalogo intero
  - **Lo scambio NON è permanente**: vale solo per la sessione corrente. La sessione successiva torna l'esercizio originale del blocco (la progressione non si spezza).

**Persistenza scheda in DB (decisione architetturale)**
- **Approccio JSON unico** (NON multi-tabelle relazionali). Coerente con pattern esistenti (`weekly_plan_meals.ingredients jsonb`, `profiles.piano_ai jsonb`).
- Nuova tabella da creare: `schede_utente` con colonne minime:
  - `user_id` (uuid)
  - `blocco_n` (int — numero progressivo blocco, per varietà)
  - `scheda` (jsonb — intera scheda con sessioni ed esercizi)
  - `created_at` (timestamptz)
  - `attiva` (boolean — quale scheda l'app deve leggere)
- Statistiche di progressione restano in `workout_sets` e `training_logs` (già esistenti, relazionali) — non si toccano.

**Quando il coach genera la scheda**
1. ✅ **Fine onboarding M1** → genera SUBITO la prima scheda (altrimenti l'utente cade sul fallback `TRAINING_SESSIONS` = scheda di Ignazio, senza senso per altri utenti).
2. ✅ **Fine blocco (~4 settimane)** → genera il successivo, MA solo dopo check-in fisica M2 completata (4 foto + misurazioni). Senza M2 il coach NON genera: aspetta. Il coach legge i nuovi dati M2 (peso, misure, foto) per modulare il blocco successivo basandosi sui progressi reali. Aggancio: `m2EntryIntro()` già presente in codice, è il cancello tra un blocco e il successivo.
3. ❌ **Su richiesta utente "rigenera scheda"** → NO per ora (rischio rigenerazioni ripetute → progressione persa). Rivalutabile in futuro.

### PROSSIMI PASSI COACH GENERATORE (ordine, post-decisioni 27 mag sera)
1. ✅ **SQL creazione tabella `schede_utente`** su Supabase (28 mag — vedi schema sopra + muro UNIQUE PARTIAL).
2. ✅ **Funzione generatrice del coach** (28 mag — `generateTrainingProgram()` + 15 helper + diagnostica. Legge onboarding/profilo + catalogo → produce JSON scheda → salva in `schede_utente`). ⚠️ MA output ancora POVERO vs hardcoded — vedi "PROBLEMATICHE APERTE".
3. ✅ **Lettura scheda dal modulo Training** (28 mag — Mossa 3: `loadActiveScheda` + 4 helper unificati + fallback `TRAINING_SESSIONS`).
4. **Modifica onboarding M1**: aggiungere step "giorni di recupero attivo (0/1/2)". ⏳ NON fatto.
5. **Trigger generazione blocco N+1** dopo M2 completato (aggancio a `m2EntryIntro()`). ⏳ NON fatto.
6. **UI "cambia esercizio"** (opzione C con vincoli). ⏳ NON fatto.
7. ⚠️ **Hook generazione su `saveOnboarding`** (Step 3.17 mai fatto): il motore oggi gira SOLO via `ztTestGeneraScheda()` manuale / `?schedaGen=1` / post-M2 futuro, MAI in automatico a fine onboarding. Vedi "PROBLEMATICHE APERTE" #8.

## Cosa abbiamo fatto

### Sessione 28 mag 2026 — Coach generatore schede Training (implementazione completa) ✅ + problematiche aperte

Sessione lunga e densa: costruito da zero il **motore che genera la scheda di allenamento** dell'utente ("catalogo verificato + AI che assembla", NON l'AI inventa esercizi), agganciato il modulo Training a leggere la scheda dal DB con fallback, ampliato il catalogo, implementato un vero finisher Tabata. **Il motore funziona end-to-end e scrive in DB**, ma la scheda prodotta è ancora **più povera** di quella hardcoded di Ignazio (vedi "PROBLEMATICHE APERTE" in fondo). Catena commit principali (oldest→newest): `aa5464a` · `4245efe` · `52ca781` · `eb227b8` · `5d5fc99` · `5143d33` · `59a9695` · `a636d99` · `700e9a4` · `f8a0420` · `3fe7972` · `6bbd7d3` · `496e335` · `74d6847` · `19e1249` · `81d0bf9` · `8d06894` (latest training). APP_VERSION finale `2026.05.28 · …` (vedi `8d06894`).

**1. Tabella `schede_utente` (Supabase)** — JSON unico, muro UNIQUE PARTIAL `uq_schede_utente_una_attiva` (max 1 attiva/utente). DDL eseguito a mano da Ignazio prima del codice. Schema completo in sezione "Tabella `schede_utente`".

**2. Motore `generateTrainingProgram({source, force, dryRun})`** ([zona-tracker.html:7868](zona-tracker.html:7868)) + **15 helper** (la "fabbrica" della PARTE 5):
- `_TRAIN_GEN_PARAMS_BY_GOAL` — tabella parametri per obiettivo × esperienza (sets/reps_min/reps_max/rir/rest_sec/type). RIR `null` per principianti (niente RIR finché non sono intermedi). Forza 4×4-6 RIR2-3 rec180; Ipertrofia 8-12 RIR1-2 rec90; Dimagrimento/Ricomposizione range più alti per principianti, rec brevi; Salute (longevita/mantenimento) 6-10 RIR2.
- `_TRAIN_GEN_SPLIT_BY_DAYS` — split per giorni × esperienza: 2→FullBody×2 · 3→FB×3 (principiante) o Upper/Lower/Full (int/avanz) · 4→Upper/Lower×2 · 5→Push/Pull/Legs/Upper/Lower.
- `_trainGenFilterPool(catalog, {tipoAllen, attrezzatura, livello})` — filtra il catalogo per luogo+attrezzatura+livello dell'utente. Costruisce anche `poolFinisherTabata` (solo `cardio_metabolico` + `uso` contiene `finisher`). Gestisce i **surrogati casa** (flag `_surrogato`).
- `_trainGenGetPatterns(sessionType, livello)` — pattern minimi obbligatori per tipo sessione (Full Body / Upper / Lower / Push / Pull / Legs), opzione C "equilibrio garantito + libertà di enfasi".
- `_trainGenComputeMaxExercises(durata_min, params, addFinisher)` — calcola quanti esercizi entrano nel tempo dichiarato (serie × reps × recupero), NON numero fisso.
- `_trainGenPickByPattern(pool, patternOptions, usedSoFar, sessionIndex)` — pesca esercizio per pattern con **round-robin via `sessionIndex`**: pattern con 2+ candidati alternano correttamente tra sessioni multiple (es. due Upper nella stessa settimana non ripetono lo stesso esercizio).
- `_trainGenBuildTabata({poolTabata, limitazioni, catalogMap, sessionIndex, sessionType})` — costruisce il finisher Tabata: 4 esercizi `cardio_metabolico` distinti, round-robin via `sessionIndex`.
- `_trainGenOrderExercises(items)` — ordine fisso: compound pesanti → complementari → isolamenti → core in coda.
- `_trainGenApplyCautions(exercises, limitazioni, catalogMap)` — incrocia `limitazioni` utente × `zone_rischio` esercizio: **prima ADATTA** (colonna `adattamento`), **solo se non basta SOSTITUISCE** con `alternativa` (anti-loop alternativa→alternativa).
- `_trainGenMapToSession(wrappers, sessionMeta, params, finisher)` — assembla l'oggetto sessione finale nel formato `TRAINING_SESSIONS` (id, name, type, rir, label, rest, exercises[], finisher?). Aggiunge `codice` (tracciabilità), `isSurrogato`/`notaSurrogato`, `iso`.
- `_trainGenValidateCodes(sessioni, catalogMap)` — verifica che ogni `codice` referenziato esista nel catalogo.
- `_trainGenAINote(profile, schedaMeta)` — chiamata AI (voce coach) per la nota introduttiva della scheda, con fallback.
- `_trainGenSaveToDB(userId, scheda)` — UPDATE attiva=false → INSERT nuova attiva=true (vedi muro DB).
- `_trainGenParseEsperienzaFromNote(noteSalute)` — **parser Via A** ([zona-tracker.html:9029](zona-tracker.html:9029)): estrae `esperienza` + `limitazioni` da `profiles.note_salute` quando `ST.m1Data` non è disponibile (trigger post-M2, test manuale, `?schedaGen=1`, blocchi N+1 futuri). Regex case-insensitive, ordine segmenti libero, segmenti liberi extra ignorati senza rompere, mai throw.
- `_trainGenMaybeForceFromUrl()` — handler `?schedaGen=1` / `?schedaDebug=1`.

**3. Diagnostica + forzature**: `window.ztTestGeneraScheda()` (forza PIPELINE REALE, **scrive in DB**), `window.ztSchedaWhy()` (dry-run, spiega le scelte senza scrivere), `?schedaGen=1` (genera al boot), `?schedaDebug=1` (`window._trainGenDebug=true`, log verbose).

**4. Fix vocabolario pattern (Opzione 3, `f8a0420`)**: il foglio Google usa le parole naturali ("spinta orizzontale", "dominante ginocchio", "cardio_metabolico"). Invece di costringere Ignazio a scrivere underscore, è il **codice che si adegua** via `_normPattern()` (lowercase + trim + spazi→underscore). Decisione: il foglio resta leggibile in italiano naturale.

**5. Fix luogo/attrezzo (Leva A, `700e9a4`)**: `luogo` e `attrezzo` sono liste separate da `;` → split corretto. `corpo libero` con **SPAZIO** (non underscore) gestito sia spazio sia underscore. Alias `aperto`↔`libero` equivalenti. Così gli esercizi a corpo libero non venivano più scartati erroneamente.

**6. Surrogati casa (Leva C, `3fe7972` + card `81d0bf9`)**: nuovi campi catalogo `surrogato_attrezzo` (lista `+`) + `nota_surrogato`. Se l'utente si allena a CASA e possiede TUTTI gli attrezzi del surrogato, un esercizio "da palestra" diventa disponibile come surrogato (flag `_surrogato` → `isSurrogato` nella sessione). **Fix card 81d0bf9**: la card mostra l'attrezzo casalingo reale (da `surrogato_attrezzo`, non il bilanciere) + la `nota_surrogato` come avviso visibile + flag `isSurrogato` propagato a `_trainGenMapToSession`.

**7. Round-robin sessioni multiple (`6bbd7d3`)**: `sessionIndex` passato a `_trainGenPickByPattern`/`_trainGenBuildTabata` → pattern con più candidati alternano tra le sessioni della settimana (no fotocopia tra due Upper o due Full Body).

**8. Mossa 3 — il modulo Training legge la scheda dal DB (`74d6847`)**: `loadActiveScheda()` popola `ST.userTrainingSessions` + `ST.userSessionCycle`. Helper unificati `getTrainingSession` / `getAllTrainingSessions` / `getSessionCycle` (+ `findExInAllSessions`) leggono dalla scheda utente con **fallback automatico su `TRAINING_SESSIONS` hardcoded**. Nessun utente resta senza allenamento.

**9. Hotfix ricorsione infinita (`19e1249`)**: dentro gli helper unificati, i riferimenti erano stati erroneamente sostituiti col nome dell'helper stesso → `getTrainingSession` chiamava se stessa → stack overflow → pagina bianca. Fix: dentro gli helper restano i riferimenti ORIGINALI `TRAINING_SESSIONS`/`SESSION_CYCLE`. Documentato con commento `← MAI cambiare` inline nel codice.

**10. Finisher Tabata vero (`8d06894`)**: cronometro reale **20s lavoro / 10s recupero × 8 round**, 4 esercizi `cardio_metabolico` che si alternano (round N → `exercises[(N-1) % 4]`). Solo per obiettivo dimagrimento/ricomposizione. Cronometro **clonato da `recoveryFlow`**: funzioni `tabataFlowStart/Pause/Resume/Skip/End` + interni `_tabataFlowTick/_tabataFlowAdvance/_tabataFlowCurrentExercise/_tabataFlowEndCompleted/_tabataFlowClearInterval`. Helper di costruzione `_trainGenBuildTabata` (catalogo) produce il blocco `finisher:{round, work_sec, rest_sec, exercises[]}` salvato nella sessione.

**11. Catalogo ampliato (Google Sheet + sync)**: +14 esercizi principali `EX034`-`EX047` (copertura pattern più ricca), +7 cardio Tabata `EX048`-`EX054` (`cardio_metabolico` + `uso=finisher`, basso impatto: no salti, no flessione lombare ripetuta), `EX031` riclassificato a `cardio_metabolico`. Catalogo ora **54 esercizi**. Sync via menu "Sync Esercizi" del foglio.

#### ⚠️ PROBLEMATICHE APERTE (da affrontare nelle prossime sessioni)

Il motore gira e scrive in DB, ma la scheda generata **non è ancora all'altezza** di quella hardcoded di Ignazio. 9 nodi aperti, in ordine di impatto consigliato (vedi anche la raccomandazione di priorità: prima qualità #1+#2, poi etichette #7+#3, infine hook+GIF):

1. **Scheda POVERA vs vecchia hardcoded** — mancano gli **isolamenti dedicati per i gruppi piccoli**: tricipiti, polpacci, bicipiti, deltoidi laterali, deltoidi posteriori. La vecchia scheda li copriva, la generata no. È il problema centrale: finché non è risolto, il motore non è pronto a sostituire il fallback.
2. **Serie fisse a 4** — il generatore mette 4 serie a tutto; la vecchia usava **compound 4 / isolamenti 3**. Serve serie variabili per tipo di esercizio.
3. **Titoli surrogati fuorvianti** — i titoli dei surrogati riportano ancora "bilanciere" (es. "stacco con bilanciere") anche quando l'esecuzione reale è con elastico+panca. Il titolo va riscritto in base all'attrezzo casalingo effettivo.
4. **Sottotitoli attrezzo da arricchire** — l'`eq` dovrebbe descrivere meglio il setup completo (es. "panca + maniglie + elastico"), non solo l'attrezzo grezzo.
5. **GIF mancanti sui nuovi esercizi** — il Worker `MATCH_DATA` è **hardcoded** e copre solo i 20 nomi vecchi. I nuovi `EX034`-`EX054` non hanno GIF. Serve un approccio con **`edbId` nel Google Sheet** (colonna nuova) così il Worker risolve la GIF dal catalogo invece che dalla mappa hardcoded.
6. **"Settimana ciclo" hardcoded a 6 giorni** — la UI/logica ciclo assume ancora 6 giorni (rotazione storica di Ignazio) mentre la scheda generata ha 4 (o i giorni scelti in onboarding). Da rendere dinamico sui giorni reali della scheda.
7. **Etichetta "Ipertrofia" → "Ricomposizione"** — `_TRAIN_GEN_PARAMS_BY_GOAL` usa `type:'Ipertrofia'` per molti obiettivi (incluso ricomposizione/dimagrimento). L'etichetta mostrata va corretta in "Ricomposizione" dove appropriato. Quick win.
8. **Hook `saveOnboarding` mai fatto (Step 3.17)** — il motore NON è agganciato all'onboarding automatico: gira solo via `ztTestGeneraScheda()` manuale / `?schedaGen=1` / post-M2 futuro. Un nuovo utente a fine M1 NON riceve ancora la scheda in automatico. **Da non agganciare finché #1/#2 non sono risolti** (daresti una scheda mediocre in automatico).
9. **Gestione Google Sheet complessa** — col catalogo a 54 esercizi + colonne surrogato + edbId futuro, il foglio sta diventando difficile da mantenere a mano. Da ripensare (validazioni, struttura, magari UI dedicata).

### Sessione 27 mag 2026 — Modulo Training: logger trazioni + note + cronometro + restyling + fix progressione ✅

Sessione lunga sul modulo Training, **collaudata dal vivo** sul telefono in tutte le sue parti. Catena di blocchi consecutivi che hanno completato l'esperienza di sessione: nuovo logger per le trazioni a banda, blocco nota per esercizio/giorno, hero sessione col cronometro TEMPO WORKOUT, restyling card al mockup approvato, allineamento stile finale, fix critico del bug "PROSSIMA = fotocopia". 9 commit complessivi su `main`.

**1. BLOCCO 3 — Due logger per attrezzo** (commit `81af3c1`, ver `2026.05.27 · 07:31`)
- Trazioni: logger a COLORE della banda di assistenza (Gialla/Rossa/Nera/Viola), 4 pillole orizzontali. Scala fissa, banda AIUTA: Gialla = più dura, Viola = più facile.
- Tutti gli altri esercizi: logger a LIBBRE (dropdown `RESIST_VALUES`) invariato. Multipli di 10 lbs.
- DB: nuova colonna `band_color text` su `workout_sets` + `training_logs` (DDL eseguito manualmente prima del deploy).
- Edit inline badge + edit modal Dettaglio Giorno: branch trazioni con select colore. Update DB con `band_color`.
- Hydrate da cloud + `getProgressionSuggestion` + `getLastLoggedSetLabel` + badge display: tutti aggiornati per leggere/mostrare `band_color`.
- `suggestProgressionAI` skippato per trazioni in questo blocco (riattivato dopo nel fix progressione).
- Selezione logger via match nome esercizio: `PULL_UP_EXERCISE_NAME = 'Trazioni alla sbarra'` (costante).

**2. BLOCCO 4 — Nota personale per esercizio/giorno con storico** (commit `1e98781`, ver `2026.05.27 · 08:04`)
- Nuova tabella `training_notes(id, user_id, exercise_name, date, note, created_at, updated_at)` con UNIQUE `(user_id, exercise_name, date)` → una nota per esercizio + giorno (decisione: condivisa tra sessioni se lo stesso esercizio compare in più sessioni nello stesso giorno).
- 4 policy RLS `own_*` + trigger `set_updated_at`. DDL eseguito da Ignazio prima del deploy.
- Render `_renderTrainNoteBlock(exName)` dentro la card esercizio. 4 stati: vuoto / editing / pieno / pieno+storico aperto.
- Storico note passate caricato lazy on-expand, LIMIT 50 ordine DESC.
- Salvataggio: upsert `onConflict:'user_id,exercise_name,date'`. Test mode: solo state locale.
- Edit pre-compilato (la textarea parte col testo attuale, no perdita).

**3. FIX BLOCCO 4** (commit `3042b74`, ver `2026.05.27 · 08:27`)
- **FIX 1**: il link "Note passate" non appare più se 0 note passate. Nuovo `ST.trainNoteHistoryCount[exName]` popolato in batch dentro `loadTodayNotes` con una seconda query ultra-leggera (`SELECT exercise_name` filtrato `date < today`).
- **FIX 2**: il link mostra sempre `(N)` (es. "Note passate (3) ›") — count noto a priori grazie a FIX 1.
- **FIX 3a**: aggiunta etichetta "OPZIONALE" Mono caps grigia accanto a "+ Aggiungi nota" nello stato vuoto.
- **FIX 3b**: contatore caratteri dinamico `N / 500` (invece di "500 caratteri" statico). DOM surgical update via `updateNoteDraft` sul nodo `#note-counter-{safeId}` — niente re-render, focus + caret preservati.

**4. GRAFICA L1 — Hero sessione + cronometro TEMPO WORKOUT** (commit `4a3ad4e`, ver `2026.05.27 · 10:45`)
- Hero in cima alla tab Sessione (sostituisce header minimal): titolo Syne 24px + badge tipo+RIR + barra progresso serie `N/T` evergreen + **cronometro TEMPO WORKOUT** Mono 22px evergreen format `MM'SS''`.
- Hero applicata solo a sessioni non-recovery (Upper A/B, Lower A/B). Sessioni Recovery (G3/G6) tengono header legacy.
- **Cronometro**: tempo effettivo in ESECUZIONE serie, escluso recupero e serie annullate.
  - Parte in `openTrainExec` (workTimeStartExec + workTimeStartTick)
  - Stop + commit in `trainExecFinishSet` (somma delta a totalSec)
  - Stop SCARTANDO in `trainExecBack` (serie annullata = 0)
  - Stop tick in `closeTrainingSession`
  - Persistito su localStorage `zt_train_work_<YYYY-MM-DD>` con struttura `{ [sessionId]: { totalSec, execStartedAt } }`
- Display LIVE al secondo via `setInterval(1000)` + DOM surgical update su `#train-work-display` (no re-render, no flicker).
- Sopravvive a chiusura/riapertura PWA: `execStartedAt` persistente → al rientro `Date.now() − execStartedAt` ricalcola, `visibilitychange` riarma il tick.

**5. CAP cronometro "serie dimenticata"** (commit `f83c890`, ver `2026.05.27 · 11:04`)
- Se una serie supera `WORK_SET_CAP_SEC = 2700` (45 min) tra apertura e "Fine serie" (telefono in tasca a lungo), il tempo reale NON viene accumulato → si accumula una STIMA.
- Stima = media di `validDurations[]` (serie valide ≤ CAP per quella sessione di oggi) o `WORK_SET_DEFAULT_SEC = 120` (2 min) se nessuna serie valida ancora.
- Struct estesa: `ST.trainWorkTime[sessionId]` ora ha `{ totalSec, execStartedAt, validDurations:[] }`. Retro-compat su record vecchi.
- `console.info [train-work] capped set: delta=Xs → estimate=Ys` per diagnostica.
- Display LIVE durante serie attiva sopra CAP mostra il delta reale (è la verità); il cap scatta solo a "Fine serie".

**6. GRAFICA L2 — Card esercizio allineata al mockup** (commit `857c928`, ver `2026.05.27 · 12:28`)
- Quadratino numero esercizio `.ex-num-box` (riusabile, 30×30 r9 dopo allineamento L2.1).
- "N × range" spostato in alto a destra del titolo (`.ex-params-top` Mono 700 evergreen).
- Eyebrow MAIUSCOLO Mono tracked per attrezzatura (`.ex-equipment-eyebrow`).
- Meta-row alleggerita: solo `[RIR N]` pill + "rec M:SS" (nuovo helper `restSecToCompact`, `restSecToText` invariato per modal recupero).
- Suggerimento `.ex-suggestion` spostato fuori da `.ex-info` (rimossa) → vive direttamente nella card.
- Badge serie pieni evergreen (`.ex-set-pill-done`) con testo bianco + ✏️ semi-trasparente. Badge serie vuote (`.ex-set-pill-empty`) dashed grigi per slot ancora da fare.
- Contenuto invariato: "S1 · 6r · Viola" per trazioni, "S1 · 6r · 70 lbs" per elastici. NO sigla "CP" del mockup (residuo combinatore elastici scartato).

**7. GRAFICA L2.1 — Allineamento stile finale** (commit `3e6d7a1`, ver `2026.05.27 · 14:47`)
- **Num-box "parlante" per stato**: 30×30 r9 con 4 modificatori CSS basati sui flag già calcolati nel render:
  - `.idle` (grigio): nessuna serie loggata, mostra numero
  - `.in-progress` (acc-lt + acc): ≥1 serie ma non tutte, mostra numero
  - `.done-state` (acc fill + bianco): tutte le serie completate, mostra ✓ bianco
  - `.logging` (acc fill + bianco): logger aperto, mostra numero
  - Transition 150ms.
- **Card attiva evidenziata**: `.exercise-card.logging` con `border:1.25px solid var(--acc)` + `box-shadow:0 4px 14px rgba(42,122,111,.10)`. Border base trasparente per evitare layout shift.
- **Label "S{n}" nei chip serie**: pill interna semi-trasparente bianca (`background:rgba(255,255,255,.18)`, padding 1px 6px, border-radius 999px) per stacco visivo netto da "6r · Viola"/"6r · 70 lbs".

**8. FIX PROGRESSIONE "PROSSIMA"** (commit `b0b91f8`, ver `2026.05.27 · 15:20`)
- **PROBLEMA**: la riga "🎯 PROSSIMA" (card sessione + schermata recupero) faceva una FOTOCOPIA dell'ultima serie loggata oggi via `getProgressionSuggestion()`, mostrando contenuto identico ad "APPENA FATTA" e numero serie sbagliato (la appena fatta invece della prossima). Sulle trazioni la riga era proprio skippata.
- **DECISIONE LOGICA** presa con Ignazio:
  - Progressione calcolata SERIE-PER-SERIE: ogni serie loggata genera la proposta per quella successiva. La proposta dopo l'ultima serie del giorno NON si salva: la nuova sessione riparte automaticamente dall'ultima serie loggata la volta precedente (storico DB), poi progredisce.
  - Calcolo via AI (`suggestProgressionAI`), output = proposta + 3-4 parole di motivazione. Durante l'attesa AI la riga mostra "🎯 calcolo…".
  - Le regole consolidate (elastici + trazioni con banda) sono documentate in PARTE 3 di "MODULO TRAINING — REGOLE DEL COACH".
- **IMPLEMENTAZIONE**:
  - `suggestProgressionAI` estesa alle trazioni (rimosso lo skip). Ramo BANDA con logica invertita rispetto alle libbre (vedi PARTE 3). Nuovo param `bandColor` passato da `saveTrainingSet`. Numero serie corretto = `setNum + 1` (la PROSSIMA).
  - Aggiunta micro-motivazione 3-4 parole alla fine del prompt (es. "spingi ancora 💪", "tieni il ritmo", "alza l'asticella 🔥").
  - Nuovo state `ST.aiSuggestionsLoading { key: true }` per il flag in-flight.
  - Nuovo helper `getProgressionLive(exName, sessionId)`: fonte unica di verità per la riga PROSSIMA. Priorità: AI salvata → "🎯 calcolo…" → fallback iniziale. Usato sia in card che in recupero → mai disallineamento.
  - `getProgressionSuggestion` ridotta a SOLO fallback iniziale: rimosso il ramo "ripesca ultima serie loggata oggi" (era la fotocopia bug). Resta solo "Inizia con N reps…" / "Ultima volta…" da storico DB.
  - Card sessione: rimosso il blocco 🤖 separato sotto la nota (era la riga AI duplicata). Output AI accorpato in `.ex-suggestion` sopra i badge serie → una riga sola.
  - Schermata recupero: `nextHTML` legge da `getProgressionLive` (stessa fonte della card). `esc(sugg)` per safety XSS.

**Decisioni architetturali emerse il 27 mag** (documentate in MODULO TRAINING, parti 3+4 e in `esercizi_catalog`):
- Coach generatore di schede da costruire: "catalogo verificato + AI che assembla", NO AI che inventa esercizi.
- Tabella `esercizi_catalog` creata su Supabase con 30 esercizi seme e sync Google Sheet dedicato (`syncEsercizi`).
- Continuità intra-blocco (4 sett. stesso esercizio per progressione) + varietà inter-blocco (cambio esercizio mantenendo pattern).
- `TRAINING_SESSIONS` resta come fallback nel codice quando l'utente non ha ancora una scheda personale in DB.
- RIR attivo solo per livello intermedio/avanzato. Principianti = niente RIR.

### Sessione 26 mag 2026 — Modulo Training: restyling + flusso serie ✅

Sessione lunga sul modulo Training conclusa **collaudata dal vivo** sul telefono. Restyling visivo completo delle 3 tab + ridisegno della schermata Recupero + introduzione della schermata Esecuzione tra "+S{n}" e logger. 5 commit in cronologia, 1 fix di onboarding scollegato. Stato finale: tutto in produzione.

**Cosa è stato fatto (COMPLETO e collaudato dal vivo)**:
- **BLOCCO 1 — Restyling grafico 3 tab** (Sessione/Programma/Progressione). Tutto l'azzurro legacy del modulo (`#185FA5`, `#E8F0FA`, `#F5F8FF`, `#1A7A9A`, `#93b4d4`, `rgba(24,95,165,*)`) sostituito con evergreen del design system (`var(--acc)`, `var(--acc-lt)`, `var(--acc2)`, `var(--s2)`, `var(--b2)`). Preservato il `#185FA5` semantico del BMI "Sottopeso" nel modulo Body (non-Training). `--mod-training` (#B5D4F4 azzurro chiaro) **resta SOLO come accento d'identità** (dot tile Home, non funzionale). Commit `c2c0a06`.
- **BLOCCO 2A — Schermata Recupero ridisegnata**: countdown con **ring SVG** (`stroke-dashoffset` che si svuota progressivamente), **GIF esecuzione SEMPRE visibile** (sorgente animata = `cached_url` dal Worker via `ensureRestGif`/`ST.exerciseGifCache`, **NON** i PNG statici `executionImg`), chip APPENA FATTA + PROSSIMA (riusa `getProgressionSuggestion`, nuovo helper `getLastLoggedSetLabel`), coach AI ora a **2-3 punti brevi** (prompt riscritto), RIPASSO RAPIDO alleggerito + link "Scheda completa" che apre `openExerciseAI` (z-index alzato a 1100 per stare sopra `rest-modal-overlay` 1001). **Anti-flicker GIF**: il tick aggiorna solo numero+ring via surgical DOM update, NON ricrea l'`<img>`. Commit `404a749` + 4 fix post-collaudo `6820181` + micro-fix GIF height 96→120 `b44ba05`.
- **BLOCCO 2B — Schermata Esecuzione NUOVA + cambio flusso**. Nuovo stato `ST.trainExecOpen`. Flusso aggiornato: tap "+S{n}" → `openTrainExec` (schermata esecuzione: **GIF grande animata**, "SERIE n/tot", badge reps/RIR, "Fine serie" + "‹ Indietro") → "Fine serie" (`trainExecFinishSet`) apre il **logger esistente `openLogModal` INVARIATO** → logga → recupero (2A). "‹ Indietro" (`trainExecBack`) annulla senza loggare nulla. La schermata esecuzione **non ha timer attivi** → la GIF si anima senza re-render. Commit `2a23288`.

**Decisioni di prodotto consolidate (da ricordare per i prossimi blocchi)**:
- **Esecuzione = pannello spoglio** (solo GIF + minimo testo). **Recupero = pannello ricco** (ring countdown, coach, ripasso, APPENA FATTA/PROSSIMA, link scheda completa).
- La **GIF animata vera** è quella servita dal Worker (`cached_url`, GIF salvata in Supabase Storage). I PNG `assets/exercises/*-esecuzione.png` e `*-muscoli.png` sono per il modal "scheda completa" (anatomia + fermo-immagine).
- Convenzione: **i numeri/sigle delle serie vanno sempre in font Mono** (JetBrains Mono), coerente con tutto il modulo. I titoli/copy in Syne.
- `--mod-training` (#B5D4F4) è **identità modulo**, non colore funzionale. Usabile per accenti decorativi (dot navbar, tile Home).
- Stato della GIF: `loading` / `cached` / `missing` / `error` — placeholder neutro `var(--s2)` (mai crash).

**Cosa RESTA da fare (prossime sessioni, NON ancora implementato)**:
- **BLOCCO 3 — I DUE LOGGER per attrezzo** (design già approvato in Claude Design, **non ancora a codice**):
  - **"Trazioni alla sbarra"** = **BANDA di assistenza**, scelta per COLORE, lista fissa da meno a più resistenza: **Gialla · Rossa · Nera · Viola**. **Logica INVERTITA** (meno banda = più forte; progredire = scendere di colore).
  - **TUTTI gli altri esercizi** = **elastici a tubi di resistenza**, valore in **LIBBRE**, step di 10 (10, 20, 30, ...). Si scrive solo il **TOTALE** (niente somma di più elastici nell'app). Logica normale.
  - **NB tecnico**: oggi il logger ha un solo campo `resistance` (numerico/testo). Per la banda-colore serve gestire un valore "colore" → probabile impatto su come si salva la resistenza. **Verificare colonna `resistance` in `training_logs`/`workout_sets` PRIMA di implementare** (possibile DDL su Supabase per supportare testo + numero coerentemente). Da progettare con cura.
  - **Scartare definitivamente dai mockup**: il vecchio "combinatore elastici" colorato e il "RIR effettivo +/-". NON vanno implementati.
- **BLOCCO 4 — NOTA per esercizio/giorno** (design approvato, 4 stati: vuoto / editing / pieno / storico). Una nota per esercizio valida per quel giorno; resta salvata nel tempo; storico delle note passate rileggibile. È **memoria personale di COME** si è eseguito (es. "barra al posto delle maniglie", "piede appoggiato così"), **NON modifica l'esercizio prescritto**. Richiede storage su Supabase (nuova tabella o colonna legata a `user_id` + `exercise_name` + `date`) → DDL da progettare.

**Regola d'oro mantenuta**:
Un passo per volta, conferma dell'utente prima di ogni step. Ignazio non è sviluppatore: spiegazioni semplici, niente codice in chat. Lavoro spezzato in blocchi con collaudo dal vivo tra uno e l'altro. Il workflow di sessione (BLOCCO 1 → 2A → 4 fix → micro-fix GIF → 2B, ognuno con commit + push + verifica visiva) è stato confermato come il pattern operativo corretto per i prossimi blocchi (3 e 4).

### 26 maggio 2026 (tarda sera, post-4-fix) — Micro-fix GIF hero recupero più alta ✅

Micro-ritocco visuale post-collaudo dei 4 fix BLOCCO 2A: la GIF esecuzione nella hero del recupero era un po' piccola. Ingrandita solo verticalmente.

- `.rest-hero-gif` height: `96px` → `120px` (+25%)
- `.rest-hero-gif-placeholder` height: idem (coerenza loading/cached state)
- `max-width: 200px` INVARIATO per non rompere il layout grid 2 colonne su mobile: iPhone 375 wide → 375 − 36 (padding) − 128 (countdown wrap) − 14 (gap) = ~197px disponibili per la colonna right → max-width 200 già al limite, qualsiasi aumento orizzontale avrebbe rotto l'affiancamento.
- `object-fit: contain` preserva proporzioni → l'omino non si stira.

Commit `b44ba05`. APP_VERSION `2026.05.26 · 18:15`.

### 26 maggio 2026 (notte) — Training BLOCCO 2B: schermata ESECUZIONE (nuova) ✅

Inserita la schermata di **esecuzione** tra il tap "+S{n}" e l'apertura del logger. Prima del 2B il tap "+S{n}" apriva direttamente il form `reps + resistenza`. Da ora invece apre un pannello "zen" con la GIF dell'esercizio grande al centro: l'utente esegue la serie guardando la GIF e poi tappa "Fine serie" per andare al logger (invariato), oppure "Indietro" per annullare senza loggare nulla.

**Nuovo flusso utente** (opzione A confermata):
1. Tap "+S{n}" sull'esercizio → apre **schermata ESECUZIONE** (overlay fullscreen z-index 1050)
2. Esecuzione: l'utente esegue la serie guardando la GIF animata
3a. Tap **"Fine serie"** → chiude esecuzione + apre il **logger esistente** (`openLogModal` invariato) → "Logga serie" → `saveTrainingSet()` → recupero (BLOCCO 2A) → nessun cambio al resto del flusso
3b. Tap **"Indietro"** (‹) → chiude esecuzione e basta. Nessun dato toccato, nessun logger aperto. Caso d'uso: "ho premuto +S per sbaglio"

**Architettura tecnica**:
- Nuovo stato globale `ST.trainExecOpen` (default `null`, oppure `{sessionId, exName, setNum}` quando esecuzione attiva). Inizializzato accanto a `trainLogOpen` con commento esplicativo.
- 3 nuove funzioni handler:
  - `openTrainExec(sessionId, exName, setNum)`: setta `trainExecOpen`, chiama `ensureRestGif(exName)` per pre-fetch GIF (stessa pipeline del recupero), `_unlockAudio()` per coerenza, poi `renderTraining()`.
  - `trainExecFinishSet()`: setta `trainExecOpen=null` + chiama `openLogModal(sessionId, exName, setNum)` esistente. Il logger appare al posto dell'esecuzione.
  - `trainExecBack()`: setta `trainExecOpen=null` + `renderTraining()`. Nessun side-effect.
- `ensureRestGif()` esteso (singola modifica, additiva): la condizione di re-render include ora anche `ST.trainExecOpen.exName === exName`, così quando la GIF arriva dal Worker il placeholder viene sostituito senza intervento utente.
- `closeTrainingSession()` esteso (cleanup): reset di `ST.trainExecOpen = null` insieme agli altri timer/flow (così uscire dalla sessione mentre esecuzione è aperta non lascia stati sporchi).
- Bottone "+S{n}" (riga 9057): chiamata cambiata da `openLogModal(...)` a `openTrainExec(...)`. Stesso pattern di apice singolo + `safeName` escape esistente.
- Nuovo `execHTML` generato in `renderTraining()` (~riga 9752) e concatenato in `innerHTML` tra `countdownHTML` e `dayDetailHTML` (ordine coerente col flusso temporale: countdown vive prima dell'eventuale dayDetail).

**Layout schermata esecuzione**:
- **Header**: dot evergreen + "SERIE n/tot · IN CORSO" Mono caps a sinistra; "‹ Indietro" Mono caps a destra (ghost button, hover evergreen).
- **Body** centrato (flex column, gap 18px):
  - Nome esercizio Syne 800 26px
  - Badge `{fascia reps}` (es. "4-6") + `RIR {n}` (Mono caps in pill `var(--acc-lt)` su `var(--acc)`). RIR nascosto per esercizi temporali (`iso:true` con reps in secondi) — coerente con la card sessione.
  - GIF grande (max-width 380px, max-height 50vh, `object-fit:contain`). Placeholder neutro `var(--s2)` con copy "Caricamento esecuzione…" / "Anteprima non disponibile" se loading/missing.
- **Footer**: bottone primario full-width "Fine serie" evergreen pieno (Syne 700 16px) con `:active` scale .98 + box-shadow evergreen soft.

**Sorgente GIF**: `ST.exerciseGifCache[exName].url` (= `m.cached_url` dal Worker `/exercise-media`), **stessa identica pipeline del recupero**. Animata. Nessun PNG statico.

**Anti-flicker GIF**: la schermata esecuzione non ha countdown attivo, quindi nessun re-render periodico. La GIF, una volta caricata, resta nel DOM e continua ad animarsi senza interruzioni (il problema del fix 1 del 2A — full re-render ogni secondo — qui non esiste).

**Z-index ordering**:
- `.train-exec-overlay` = 1050
- `.rest-modal-overlay` (recupero) = 1001
- `.info-modal-overlay` (modal scheda esercizio) = 1100 (style inline da fix 4 BLOCCO 2A)
- Layering: in esecuzione non c'è recupero attivo, quindi 1050 vince. Non si può aprire `openExerciseAI` dall'esecuzione (non c'è link), quindi il caso "modal scheda sopra esecuzione" non si verifica.

**Casi gestiti** (come da prompt):
- ✅ "+S{n}" → esecuzione → Indietro → ri-tap "+S{n}" → esecuzione riparte pulita (`openTrainExec` sovrascrive `trainExecOpen`, niente residui).
- ✅ "+S{n}" → esecuzione → Fine serie → logger esistente → Logga → recupero → flusso completo invariato.
- ✅ GIF non disponibile per quell'esercizio → esecuzione mostra placeholder, "Fine serie" funziona lo stesso (apre logger).

**Vincoli rispettati**:
- ✅ `saveTrainingSet()` NON toccato. Logica salvataggio/recupero (2A) intatta.
- ✅ Logger esistente (`openLogModal`, `tl-reps` focus, `RESIST_VALUES`) IDENTICO: cambia solo il MOMENTO in cui si apre (dopo "Fine serie", non più subito al tap "+S{n}").
- ✅ Timer countdown/beep/tick: NON toccati.
- ✅ GIF: stessa funzione `ensureRestGif`, solo estesa la condizione di re-render. Nessuna funzione GIF nuova creata.
- ✅ Stile evergreen/Syne/Mono, mobile-first, coerente con Home/Nutrition/Blocco 1/Blocco 2A.

**Nuove righe**:
- Stato `ST.trainExecOpen: null` + cleanup in `closeTrainingSession`
- 3 funzioni handler `openTrainExec`/`trainExecFinishSet`/`trainExecBack`
- Estensione `ensureRestGif` (condizione re-render: aggiunto OR `trainExecOpen.exName === exName`)
- 13 nuove classi CSS `.train-exec-*` (overlay/container/header/eyebrow/eyebrow-dot/back/body/ex-name/badges/badge/gif/gif-placeholder/footer/finish-btn)
- Render `execHTML` + concat in innerHTML
- Modifica button "+S{n}" → `openTrainExec`

**Sintassi**: validata con `new Function(...)` su script (841KB) → OK.

### 26 maggio 2026 (tarda sera) — Training BLOCCO 2A · 4 fix post-collaudo ✅

Dopo il collaudo dal vivo sul telefono della schermata Recupero (commit `404a749`), emersi 4 problemi puntuali. Tutti corretti con interventi mirati, nessuna modifica al layout approvato.

**FIX 1 — GIF non animata (priorità alta)**

*Causa*: `tickCountdown()` (riga ~8069) cercava `.rest-cd-num` (la vecchia classe della sticky bar). Il BLOCCO 2A ha rinominato il selettore in `.rest-hero-cd-num`, quindi `document.querySelector('.rest-cd-num')` ritornava `null` → l'`if(numEl)` falliva → il fallback `renderTraining()` faceva un **full re-render del DOM ogni secondo** → l'elemento `<img class="rest-hero-gif">` veniva rimosso e ricreato → la GIF ricominciava dal frame 1 e sembrava statica.

*Sorgente immagine confermata*: `ST.exerciseGifCache[cd.exName].url` (= `m.cached_url` dal Worker `/exercise-media`, GIF animata su Supabase Storage). NON è `executionImg` (PNG statico Wger), NON è una sostituzione: è esattamente la pipeline pre-2A.

*Fix*: in `tickCountdown` aggiornato il selettore a `.rest-hero-cd-num` + esteso l'update surgical anche al ring SVG (`document.querySelector('.rest-ring-fill')` → `setAttribute('stroke-dashoffset', ...)` + `style.stroke = numColor`). Aggiunto helper inline `fmtTime(sec)` per formattare MM:SS / SS (coerente col rendering del template). Risultato: il DOM dell'`<img>` GIF non viene più ricreato → l'animazione continua fluida, ring si svuota progressivamente, numero countdown si aggiorna senza flicker.

**FIX 2 — Font diverso tra "APPENA FATTA" e "PROSSIMA"**

*Causa*: `lastSetHTML` aveva `class="rest-card-value mono"` (Mono), `nextHTML` aveva solo `class="rest-card-value"` (Syne sans).

*Fix*: aggiunta classe `mono` a `nextHTML` (sia stato popolato che placeholder `—`). Ora entrambi i chip mostrano la sigla `S3 · 6r · 30 lbs · RIR 2` in `var(--font-mono)` (JetBrains Mono), coerente col resto del modulo Training dove i numeri sono sempre Mono. Stessa dimensione (14px), stesso peso (700), stesso colore (`var(--t1)`).

**FIX 3 — Cue Coach troppo lungo**

*Causa*: `buildCoachPrompt` chiedeva "consiglio operativo aggiuntivo (max 3 frasi)... prosa diretta" → output paragrafo lungo difficile da consultare al volo durante il recupero.

*Fix*: prompt riscritto chiedendo esplicitamente *"2-3 punti BREVISSIMI (max 8 parole ciascuno), in formato elenco. Ogni punto su una riga separata, inizia con '• ' (bullet + spazio). NIENTE paragrafi. NIENTE introduzioni"*. Aggiunto esempio di formato in coda al prompt (`• Mento alla sbarra, non collo / • Scapole giù attivate / • Espira sulla salita`). Logica di cache (`ensureRestCue`, `ST.aiCue`) NON toccata.

Rendering aggiornato in **2 punti** (entrambi i contesti che usano lo stesso cue): `rest-coach-card-content` (modal recupero) e `modal-ai-section` (modal scheda esercizio completo). Trasformazione `\n` → `<br>` con `String(content || '').replace(/\n/g, '<br>')` per visualizzare i bullet come righe separate.

*Nota*: i cue già cached in `ST.aiCue` (generati col vecchio prompt) restano lunghi finché non scadono. Per generare cue nuovi servirà aprire un esercizio mai aperto in questa sessione di app, oppure attendere reload completo.

**FIX 4 — "Scheda completa ›" non apre nulla**

*Causa*: il click chiamava correttamente `openExerciseAI(cd.exName, cd.sessionId)`, settava `ST.exerciseAIOpen` e triggerava `renderTraining()`. Il render produceva entrambi gli overlay nello stesso innerHTML (`modalHTML + countdownHTML`), ma `.info-modal-overlay` ha z-index **1000** mentre `.rest-modal-overlay` ha z-index **1001**. Risultato: il modal scheda esercizio si apriva sotto il modal di recupero, **invisibile** all'utente — sembrava "non fa nulla".

*Fix*: aggiunto `style="z-index:1100;"` inline all'`info-modal-overlay` del modal scheda esercizio (riga 9422). Solo style inline → non altera gli altri usi di `.info-modal-overlay` nell'app (es. low-kcal warning, info modal training pattern, ecc.). Z-index 1100 > 1001 del rest-modal-overlay → modal scheda esercizio ora visibile sopra il countdown. Tap fuori chiude il modal e torna al countdown (il rest-modal-overlay resta dietro, intatto).

**Vincoli rispettati**:
- ✅ Solo i 4 fix mirati. Nessuna modifica al layout del recupero (è approvato).
- ✅ Countdown/beep/endTime/tick: NON toccati.
- ✅ Schermata di esecuzione (BLOCCO 2B): NON creata.
- ✅ Logica cache cue (`ensureRestCue`, `ST.aiCue`): NON modificata. Solo il prompt cambia.
- ✅ Pipeline GIF (`fetchExerciseMedia`, `ensureRestGif`, `ST.exerciseGifCache`): NON toccata. Solo il selettore in `tickCountdown` aggiornato per allinearlo al nuovo template.

**Sintassi**: validata con `new Function(...)` su script (836KB) → OK.

### 26 maggio 2026 (sera) — Training BLOCCO 2A: schermata Recupero riorganizzata ✅

Refactor del rendering della schermata di recupero (modal `.rest-modal-overlay`, branch `!cd.done` dentro `renderTraining()`, ~riga 9201). Layout completamente riorganizzato secondo i mockup approvati; nessuna logica funzionale toccata.

**Nuovo layout dall'alto**:

1. **HERO (sticky in cima)** — countdown + GIF SEMPRE VISIBILE + skip
   - **Ring SVG circolare** attorno al numero countdown (`r=52`, circumference 326.73): si svuota progressivamente man mano che scorre il tempo (`stroke-dashoffset = circumference × (1 - seconds/total)`). Stroke `var(--acc)` evergreen.
   - **Numero countdown** Mono 38px tabular-nums dentro al ring (formato `MM:SS` se totale ≥ 60s, altrimenti `SS`). Color-shift ultimi 10s preservato (evergreen → terracotta).
   - **GIF esecuzione SEMPRE VISIBILE** a destra (max-width 200px, height 96px, `object-fit:contain`). Niente più toggle "▶ Mostra esecuzione" (rimosso). Placeholder neutro `var(--s2)` se GIF in loading o non disponibile (no crash, no spazio sbilenco).
   - **Skip button** `Salta ⏭` in alto a destra dell'hero (Mono caps, ghost button con hover evergreen).
   - **Label "Recupero · MM:SS"** sotto la GIF in Mono caps grigio (mostra il totale del recupero).

2. **Row 2 chip APPENA FATTA / PROSSIMA** (grid 2 colonne, sotto il nome esercizio)
   - **APPENA FATTA** legge da `ST.trainLoggedSets` via nuovo helper `getLastLoggedSetLabel(sessionId, exName)` (definito subito sopra `getProgressionSuggestion`): estrae l'ultima serie loggata OGGI per quel (sessione, esercizio) e la formatta come `S3 · 6r · 30 lbs · RIR 2`. Gestisce resistance numerica (con unit) vs testuale ("Banda viola"). Ritorna `null` se nessuna serie loggata oggi → chip mostra `—` grigio.
   - **PROSSIMA** riusa `getProgressionSuggestion()` SENZA modificarla. La stringa che oggi appare nella tab Sessione viene "spostata" qui per essere visibile durante il recupero, quando la card esercizio non si vede più.

3. **Coach AI card** evergreen-soft (background `var(--acc-lt)`)
   - Eyebrow Mono caps `🤖 Coach`, contenuto Syne 13.5px. Stato loading "Genero un cue avanzato per te…" invariato.
   - Riusa `ST.aiCue[sessionId_exName]` + `ensureRestCue()` esistenti.

4. **Ripasso rapido** (versione ALLEGGERITA di setup/esecuzione/errori)
   - Setup → 1 riga (prima entry di `ex.setup` se array, altrimenti string intera).
   - Esecuzione → max 2 punti (`ex.execution.slice(0, 2)`).
   - Errori → max 2 punti (`ex.commonErrors.slice(0, 2)`).
   - Alert `ex.alert` mostrato se presente (riusa `.modal-alert` esistente).
   - **CTA "Scheda completa ›"** Mono caps evergreen → chiama `openExerciseAI(cd.exName, cd.sessionId)` (modal completo con anatomia + esecuzione + GIF + AI cue lungo, già esistente, riusato senza modifiche).

5. **Stato PRONTO! 💪** (branch `cd.done`)
   - Layout invariato (info-modal-overlay 1001), riveste solo gli hex letterali `#2A7A6F` con `var(--acc)` per coerenza design system.

**Comportamenti preservati al 100%** (vincoli prompt rispettati):
- Countdown basato su `endTime`, tick 250ms, beep (`playPrepBeep`, `playFinalTripleBeep`) intatti.
- `cd.done` → PRONTO + bottone OK + auto-close 1s preservati.
- Color-shift ultimi 10s preservato (base `var(--acc)`, vira verso terracotta `rgb(184,76,42)`).
- `ensureRestGif()` e `ST.exerciseGifCache` riusati (no modifiche). Pre-fetch all'apertura countdown invariato.
- `getProgressionSuggestion()` riusata. Riferimenti residui nella card esercizio della tab Sessione invariati.
- `skipCountdown()` invariato.
- `findExercise()` per setup/execution/commonErrors/alert intatto.
- `ST.aiCue` + `ensureRestCue()` con loading state invariati.

**Nuove righe**:
- Helper `getLastLoggedSetLabel(sessionId, exName)` (~32 righe JS).
- 11 nuove classi CSS scoped `.rest-hero-*`, `.rest-ring*`, `.rest-card*`, `.rest-coach-card*`, `.rest-quick-recap`, `.rest-quick-section`, `.rest-quick-eyebrow`, `.rest-quick-text`, `.rest-quick-link`, `.rest-ex-name-row` (CSS pulito, variabili design system ovunque).

**Classi/funzioni dormienti** (definite ma non più chiamate — lasciate nel codice per minimizzare churn, cleanup separato futuro):
- Funzione JS `toggleRestGif()` (~riga 8023): non più referenziata da nessun HTML dopo la rimozione del toggle GIF.
- CSS `.rest-modal-sticky`, `.rest-cd-num`, `.rest-cd-skip`, `.rest-gif-block`, `.rest-gif-toggle`, `.rest-gif-arrow`, `.rest-gif-img`, `.rest-suggestion`, `.rest-ex-name`: classi della vecchia schermata recupero, non più applicate al DOM. Codice innocuo (~50 righe CSS). Da rimuovere in cleanup separato dopo verifica produzione stabile.
- Campo `ST.trainCountdown.gifOpen`: continua a essere settato da `startTrainingCountdown` ma non più letto. Innocuo.

**Vincoli rispettati**:
- ✅ NON toccata logica countdown/beep/endTime/tick.
- ✅ NON toccato il logger né `getProgressionSuggestion` (riusata, non modificata).
- ✅ NON creata schermata di esecuzione (riservata a BLOCCO 2B).
- ✅ Immagini esercizi (`assets/exercises/`) non sostituite.
- ✅ Funzionalità equivalente: loggare serie → recupero → fine → torna a sessione.
- ✅ Mobile-first: schermata scrollabile, hero sticky in cima.

**Sintassi**: validata con `new Function(...)` su script (835KB) → OK.

### 26 maggio 2026 (pomeriggio) — Restyling grafico modulo Training (BLOCCO 1) ✅

Restyling **PURAMENTE estetico** delle 3 tab Training (Sessione · Programma · Progressione) per allinearle al design system già in uso su Home e Nutrition. **Zero modifiche** a logica JS, nomi funzione, comportamento, dati o chiamate Supabase. Solo sostituzioni di stringhe di colore in CSS rules e template literal.

**Cosa è stato sostituito** (tutte le occorrenze, modulo Training):
- `#185FA5` (azzurro testo/bordi/azioni) → `var(--acc)` (#2A7A6F evergreen) — **67 occorrenze**
- `#E8F0FA` (sfondi badge/selezioni) → `var(--acc-lt)` (#E6F4F2) — **16 occorrenze**
- `#F5F8FF` (box informativo "ESEMPIO — Trazioni") → `var(--s2)` — **1 occorrenza**
- `#1A7A9A` (Lower in SESS_COLOR calendario) → `var(--acc2)` (#235F56 evergreen scuro) — **1 occorrenza**
- `#93b4d4` (bottone Salva disabled) → `var(--b2)` (grigio neutro design system) — **1 occorrenza**
- `rgba(24,95,165,.18)` (progress bar trasparente) → `rgba(42,122,111,.18)` — **1 occorrenza**
- `rgba(24,95,165,.25)` (shadow settimana attiva) → `rgba(42,122,111,.25)` — **1 occorrenza**

**Aree visivamente impattate**:
- **Tab Sessione**: badge tipo (FORZA/IPERTROFIA/RIR), pillola `.ex-rir-pill`, bottone `.ex-add-set-btn`, modal scheda esercizio (`.modal-section h4`, `.modal-params`, `.ex-meta-row`), badge serie loggate `S1/S2/S3`, modal log Recap (input REPS bordo), countdown blocco attivazione (Pause/Resume/Skip/Back), barra progress attivazione, card "Attivazione completata", bottone Salva training
- **Tab Programma**: pattern giorni `G1-G6` (DAY_SPLIT con label/desc Upper/Lower), card ciclo carico/scarico (CYCLE_WEEKS — settimana attiva ora in evergreen pieno con shadow), circoli numerati progressione doppia (1·2·3), box "ESEMPIO — Trazioni"
- **Tab Progressione**: calendario mensile (sigle UP A/UP B = evergreen, LO A/LO B = evergreen scuro, REC↑/REC↓ = evergreen come da prompt "recupero/verde resta `--acc`"), stat card Sessioni/Streak/Freq, dropdown selettore esercizio (border attivo, tab Programma/Esercizio, righe selezionate), chart SVG (barre/dots/linea), chip metrica (Peso/Reps/Volume/Tempo), stat best peso/reps/ultimo, modal Dettaglio giorno (badge serie, input edit inline)

**Vincoli rispettati**:
- ✅ Modulo Body: `#185FA5` preservato a riga 10146 (`cbmiCol` per "Sottopeso" — è colore semantico medico, non Training). Protetto con placeholder durante il replace globale e poi ripristinato.
- ✅ Logica JS intatta: nessuna rinomina, nessun cambio di comportamento, nessun cambio nei dati. Solo stringhe colore in CSS rules e template literal.
- ✅ Recupero verde resta `var(--acc)` come da prompt (recoveryUpper/recoveryLower in SESS_COLOR puntano ora alla variabile invece di hex letterale).
- ✅ Colori semantici fuori-tema preservati (rest grigio #9CA3AF, rest_injury terracotta #B84C2A).
- ✅ `--mod-training` (#B5D4F4 azzurro chiaro identità) non rimosso — resta disponibile come accento d'identità se serve riusarlo in futuro su header banda / dot nav (oggi non usato attivamente).
- ✅ Funzionalità Training (logging serie, timer attivazione, calendario, chart progressione, modal AI esercizio, GIF on-demand) tutte invariate.

**File modificato**: solo `zona-tracker.html`. Nessuna modifica a CSS variables in `:root`, nessun nuovo asset, nessuna dipendenza.

**Sintassi**: verificata con `new Function(...)` su script (829KB) → OK.

### 26 maggio 2026 — Fix onboarding: blocco "Esperienza allenamento" nascosto per solo-nutrition ✅

Bug emerso testando `?preview=onboarding` post-implementazione blocco training: lo step "Il tuo livello" (s4) mostrava il blocco "Esperienza con l'allenamento" anche agli utenti che avevano scelto "Alimentazione" (`usa_training=false`) — dato inutile per chi non si allena.

**Fix**:
- Wrappato eyebrow + 4 card esperienza in `<div id="m1-s4-experience-block">` (così possiamo toggle in blocco)
- Nuovo helper `m1S4ApplyExperienceVisibility()`: legge `ST.m1Data.usa_training` e applica `display:none` se `=== false`
- Hook in `m1GoStep('s4')` (entrata nello step) e in `m1ApplySelections()` (restore all'apertura/refresh)
- **Validazione condizionale** in `m1NextFrom('s4')`: `d.esperienza` richiesta SOLO se `usa_training !== false`. Altrimenti l'utente solo-nutrition resterebbe bloccato sul "Continua" perché manca una selezione che non gli è mostrata
- **Cleanup automatico** in `m1SelectUsaTraining(false)`: quando l'utente passa da `true` a `false` su Step A (cambio idea), `d.esperienza` viene resettata a `null` e le card vengono deselezionate visivamente — coerente con il principio "se nascondo, il dato non resta orfano"

**Casi gestiti**:
- Utente sceglie "Alimentazione" → s4 mostra solo Attività; Continua passa con solo Attività selezionata
- Utente sceglie "Alimentazione+Allenamento" → s4 mostra entrambi i blocchi; Continua richiede entrambi (comportamento originale)
- Cambio idea avanti-dietro su Step A → visibilità + dato si aggiornano coerentemente
- Restore visuale all'apertura onboarding (con stato già esistente in `ST.m1Data`) → applica la visibilità giusta tramite `m1ApplySelections`

DB: nessuna migration. `saveOnboarding` salva già `esperienza` dentro `note_salute` solo se valorizzata — in solo-nutrition resta null/assente, comportamento naturalmente coerente con un utente che non si allena.

Testabile con `?preview=onboarding` in entrambi i percorsi.

### 25 maggio 2026 (sera, post-implementazione M1) — Modalità anteprima onboarding ✅

Aggiunta una modalità anteprima dei nuovi step M1 invocabile via URL: `?preview=onboarding`. Pensata per testare l'intero flusso onboarding (sequenza dinamica, salti su interruttore/casa/palestra, visibilità accessori elastici, ecc.) **senza creare un nuovo utente né resettare il profilo reale**. Nessuna scrittura su Supabase, nessun effetto collaterale sull'utente loggato.

**URL da aprire**: https://ignaziof321621.github.io/benessere-forma/zona-tracker.html**?preview=onboarding**

(Si può aggiungere il parametro anche su localhost o su `dashboardzona.html`/`zona-tracker.html`; il flag funziona solo sulla zona-tracker.)

**Come funziona**:
- Bootstrap legge `?preview=onboarding` PRIMA del check `?test=1` esistente e setta `ST.previewOnboarding=true` (default false).
- `loadAndStart()` ha un branch all'inizio: se il flag è attivo → reset `ST.m1Data` agli iniziali + `showScreen('onboarding')` direttamente, **bypassando** il caricamento profilo, il check M2 entry, il postino F.1 e il welcome overlay. **NON tocca `ST.profile` reale** (resta caricato in memoria per il rientro post-preview).
- `saveOnboarding()` ha un guard all'inizio: se `previewOnboarding=true` → chiama `_exitOnboardingPreview()` che:
  1. Reset `ST.previewOnboarding=false` + reset `ST.m1Data` agli iniziali
  2. Pulisce l'URL via `history.replaceState` (rimuove solo `?preview`, conserva altri parametri e hash)
  3. Mostra toast `🔒 Anteprima conclusa — nessun dato è stato salvato.` (durata 5000ms)
  4. Se il profilo reale è completo → `showScreen('app')` + `renderOggi()` + `showPage('home')`; altrimenti → `showScreen('auth')` (caso edge difensivo).
- Stesso percorso per "Salta per ora" sull'ultimo step (chiama `saveOnboarding({skipM2:true})` → guard cattura).

**Banner visivo**: `#m1-preview-banner` dentro `#onboarding-screen` con testo `🔒 ANTEPRIMA · NESSUN DATO VERRÀ SALVATO` sand+ambra (`#FFF7E0` su `#8B6B1E`, Mono caps 11px tracking .14em). Visibile solo se `body.preview-onboarding` è attiva (toggle gestito da `showScreen`). Non è un pulsante: serve solo a rassicurare l'utente che è in modalità sicura.

**Uscita anticipata** (l'utente non vuole completare il flusso): nessun pulsante UI per design del prompt. Per uscire prima della fine: rimuovere `?preview=onboarding` dall'URL e ricaricare la pagina, oppure chiudere/riaprire la PWA. Il profilo reale resta intatto.

**Vincoli rispettati**:
- M1 reale (s1-s7 + 5 nuovi step) intatto per utenti veri.
- M2 non toccato.
- `test-user-001` invariato (è un'altra modalità, complementare ma separata).
- Routing/auth/bootstrap intatti — la flag agisce SOLO sui due punti dichiarati (loadAndStart + saveOnboarding).
- Nessuna dipendenza nuova.

**Nuove righe**: `ST.previewOnboarding: false`, helper `_exitOnboardingPreview(toastMsg)`, branch in `loadAndStart()`, guard in `saveOnboarding()`, banner HTML + 3 righe CSS, classList toggle in `showScreen()`, parser URL in cima al bootstrap.

### 25 maggio 2026 (sera) — Nuovi step onboarding M1: interruttore + blocco training ✅

Implementazione dei 5 nuovi step nell'onboarding M1, design approvato il 25 mag mattina. La nuova sequenza M1 ora copre l'interruttore "Come vuoi che il coach ti accompagni?" + 4 step del blocco Training (dove · attrezzatura · giorni · tempo) — il tutto con navigazione **dinamica** e progress bar **dinamica** in base alle scelte dell'utente.

**Nuovi step aggiunti** (5):
- **Step A — `m1-s-coach` "Come vuoi che il coach<br>ti accompagni?"**: 2 card a selezione singola con eyebrow "PIANO BASE" / "PIANO COMPLETO". Salva → `profiles.usa_training` (true=completo, false=solo nutrition).
- **Step B — `m1-s-where` "Dove ti alleni?"** (visibile solo se `usa_training=true`): 3 card (Casa SPAZIO·INDOOR · Palestra SPAZIO·ATTREZZATO · All'aperto SPAZIO·OUTDOOR). Salva → `profiles.tipo_allenamento`.
- **Step C — `m1-s-gear` "Cosa hai a disposizione?"** (visibile solo se `tipo_allenamento='casa'`): chip statico "✓ CORPO LIBERO · SEMPRE INCLUSO" + 2 gruppi di pillole multi-select (Attrezzi 8 voci + Accessori elastici 4 voci). **RITOCCO 2 implementato**: il gruppo "Accessori elastici" è visibile SOLO se "Elastici a tubo" è acceso; spegnerlo deseleziona anche gli accessori già scelti (no fantasmi). Salva → `profiles.attrezzatura` (text[]).
- **Step D — `m1-s-days` "Quanti giorni a settimana?"**: 4 tile numeriche grandi (2·3·4·5) + card descrittiva dinamica sotto. **RITOCCO 3 applicato**: "3 giorni" non ha più sigla tecnica ("full-body+"), solo "3 giorni" + descrizione. Salva → `profiles.giorni_allenamento`.
- **Step E — `m1-s-time` "Quanto tempo per allenarti?"**: 3 tile (30·45·60 MIN) + card descrittiva dinamica sotto. Salva → `profiles.durata_sessione`.

**Architettura — sequenza dinamica + progress bar dinamica**

- I 5 nuovi step usano slug non-numerici (`s-coach`, `s-where`, `s-gear`, `s-days`, `s-time`) per non rompere la logica legacy `parseInt(stepId.slice(1))` degli step esistenti `s1`..`s7`.
- Nuova funzione `getM1Sequence()` (~riga 3584): ritorna l'array ordinato di step ID in base allo stato corrente di `ST.m1Data`. Tre possibili lunghezze:
  - **8 step** se `usa_training=false`: `[s1,s2,s3,s-coach,s4,s5,s6,s7]`
  - **11 step** se `usa_training=true` e `tipo_allenamento ∈ {palestra,aperto}`: `[s1,s2,s3,s-coach,s4,s-where,s-days,s-time,s5,s6,s7]`
  - **12 step** se `usa_training=true` e `tipo_allenamento='casa'`: `[s1,s2,s3,s-coach,s4,s-where,s-gear,s-days,s-time,s5,s6,s7]`
- `m1GoStep(stepId)`, `m1Back()`, `m1NextFrom(stepId)` **refattorizzate** per consultare `getM1Sequence()` invece di `parseInt` aritmetico. La validazione step-by-step resta nei singoli rami `if/else` di `m1NextFrom`.
- **Progress bar dinamica**: i 7 segmenti `<span>` hardcoded sono stati rimossi dall'HTML e ora `m1GoStep` rigenera runtime N segmenti in base a `getM1Sequence().length`. Label "Passo X di N" calcolata dinamicamente. Quando l'utente sceglie `usa_training=false` sullo step A, alla pressione di "Continua" la sequenza si accorcia da 11 a 8 e il totale visibile diventa "Passo 5 di 8" (scatto onesto, non camuffato).
- **`<br>` nel titolo Step A**: per onorare il RITOCCO 1 ("Come vuoi che il coach<br>ti accompagni?"), `m1GoStep` ora usa `titleEl.innerHTML = title` invece di `textContent`. I titoli sono stringhe statiche definite in `M1_HEADERS`, non input utente → nessun rischio XSS.

**Nuovi campi `ST.m1Data`**: `usa_training` (bool|null) · `tipo_allenamento` (string|null) · `attrezzatura` (array) · `giorni_allenamento` (int|null) · `durata_sessione` (int|null).

**Nuove costanti**: `M1_DAYS_DESC`, `M1_TIME_DESC` (mappe descrittive per le card explainer dinamiche sotto le tile numeriche), `M1_GEAR_ELASTIC_ACCESSORIES` (slug accessori elastici per cleanup automatico).

**Nuovi handler globali**: `m1SelectUsaTraining`, `m1SelectTipoAllenamento`, `m1ToggleAttrezzatura` (con cleanup automatico accessori), `m1GearApplyVisibility`, `m1SelectGiorni`, `m1DaysApplyExplainer`, `m1SelectDurata`, `m1TimeApplyExplainer`.

**`m1ApplySelections()` esteso**: ripristina visualmente i 5 nuovi step se l'utente torna indietro durante l'onboarding (card selezionata, pillole accese, explainer popolato, visibilità accessori).

**`saveOnboarding()` esteso**: 5 nuovi campi nel payload `profileData` con regole NULL coerenti:
- `usa_training`: default `true` se non scelto esplicitamente
- Se `usa_training=false` → tutti i 4 campi training salvati come `null` (no rumore nel DB)
- Se `usa_training=true`:
  - `tipo_allenamento` sempre salvato
  - `attrezzatura` salvato come `text[]` SOLO se `tipo_allenamento='casa'` (per palestra/aperto = `null`, il coach interpreta dal `tipo_allenamento`)
  - `giorni_allenamento` + `durata_sessione` sempre salvati

**Nuove classi CSS**: `.m1-card-level-eyebrow`, `.m1-gear-bodyweight-chip`, `.m1-num-grid` (+ `.m1-num-grid-3` per 3 colonne), `.m1-tile-num` (+ `-value`, `-unit`), `.m1-explainer-card` (+ `-title`, `-desc`). Riuso completo di `.m1-card-level` (con eyebrow opzionale) per Step A e Step B → coerenza visiva con onboarding esistente, niente font nuovi (Syne + JetBrains Mono già attivi).

**Stato DB**: le 5 colonne `profiles.usa_training/tipo_allenamento/attrezzatura/giorni_allenamento/durata_sessione` erano già state create da Ignazio il 25 mag mattina (vedi sezione "ONBOARDING M1 — BLOCCO TRAINING"). Questa implementazione popola tali colonne — nessuna migration applicata in questa sessione.

**Vincoli rispettati**: M1 esistente intatto (s1-s7 funzionano identicamente per chi sceglie "solo Alimentazione"); M2 non toccato; routing/auth/saveOnboarding test-mode (`test-user-001`) preservati; nessuna nuova dipendenza.

**Cosa NON è stato fatto** (volutamente fuori scope di questa sessione):
- Mini-onboarding training all'attivazione tardiva da Impostazioni (per utenti che hanno scelto "Alimentazione" in onboarding e poi cambiano idea).
- Cascata dell'interruttore `usa_training=false` sulla home (tile Training nascosto) — quando il modulo Training arriverà come blocco di prossima implementazione, dovrà rispettare questo flag.
- Marcatore esplicito per Palestra/Aperto in `attrezzatura` (oggi `null`, da definire quando il coach Training inizierà a leggere il campo).

### 25 maggio 2026 (post-chiusura) — Tab Oggi allineato al piano vero del coach ✅

Rifinitura mirata sul tab Oggi. La riga "PIANIFICATO · DAL COACH" della timeline mostrava un pasto **diverso** da quello del tab Piano per lo stesso giorno (esempio: tab Piano → CENA "Zuppa di lenticchie 580 kcal", tab Oggi → "Branzino 582 kcal"). Due fonti, due verità — finché non venivano allineate.

**Causa**: `getTodayPianoMeals()` ([zona-tracker.html:9917](zona-tracker.html:9917)) leggeva da `ST.pianoAI` (= `profiles.piano_ai`, colonna dormiente e datata, **non aggiornata** da F.2a v2 — i pasti veri del coach vivono in `weekly_plan_meals`). Il tab Piano era già stato collegato a `weekly_plan_meals` (Passo 2, `85c0554`), il tab Oggi era rimasto sul vecchio binario.

**Fix**: `getTodayPianoMeals()` riscritta per leggere dalla **stessa cache** `ST.pianoV4RealPlanCache` del tab Piano (single source of truth). Settimana derivata da `ST.activeDay` (rispetta day-nav: se l'utente naviga a un giorno passato/futuro, il pasto mostrato è quello della SUA settimana, non quella di oggi). `day_of_week` ISO calcolato come `((js + 6) % 7) + 1`. Restituisce solo `pranzo` e `cena` (gli unici slot generati da F.2a v2 — colazione/spuntino/merenda non vengono mai mostrati come "pianificati dal coach", coerentemente col disclaimer del tab Piano).

Nuovo helper `_pianoV4WeekStartIsoForDate(dateStr)`: ritorna l'ISO del lunedì della settimana che contiene una data arbitraria (necessario perché `ST.activeDay` non è sempre = oggi reale).

`reRenderIfVisible()` nel loader del passo 2 esteso: ora re-renderizza anche `renderOggi()` quando `ST.page === 'oggi'`, così appena la cache si popola async il tab Oggi aggiorna la riga pianificata senza interventi manuali.

**Caso "nessun piano vero"**: `getTodayPianoMeals()` ritorna `null` → la timeline tab Oggi non mostra alcuna riga "PIANIFICATO · DAL COACH" inventata. Coerente con la decisione product: niente demo nel tab Oggi se il coach non ha generato.

**Mapping campo per campo** (compatibilità col consumatore esistente in `renderOggi`):
- `pianoToday[slot].piatto` ← `realMeal.name` (= `description` DB)
- `pianoToday[slot].ingredienti` ← `realMeal.ingredients.join(', ')` (stringa pronta per pre-fill `freeText` del form Smart Ingredient se l'utente tappa "REGISTRA ›")
- `pianoToday[slot].kcal` ← `realMeal.kcal`

**Cleanup**: `ST.pianoAI` (= `profiles.piano_ai`) resta usata SOLO dal tab Piano legacy (`renderPiano` legacy + `generaPianoAI`), non più dal tab Oggi. La colonna `piano_ai` resta dormiente come documentato — non vengono fatte letture nuove da quella fonte.

**Vincoli rispettati**: tab Piano intatto (commit `85c0554`/`a7e87aa`/`04a2048`), generazione F.2a v2 intatta, pasti registrati / gruppi integratori / donut kcal / card macro tab Oggi intatti. Solo la riga "pianificato dal coach" cambia fonte. Schema DB invariato.

**Collaudo**: profilo Ignazio, lunedì 25 mag 2026, piano vero `a5dd98d2-…` con cena "Zuppa di lenticchie con crostini di pane integrale" (580 kcal). Tab Oggi → timeline → ora mostra "Zuppa di lenticchie..." invece di "Branzino", stesso pasto del tab Piano → dettaglio LUNEDÌ → CENA. Tap su REGISTRA ›: il form Smart Ingredient si pre-compila con la lista ingredienti reali (`Lenticchie 80g (peso secco), Crostini di pane integrale 40g, Olio EVO 8g, ...`) pronti per l'analisi AI o l'edit.

### 25 maggio 2026 (chiusura giornata) — Nutrition completo end-to-end ✅

Riassunto della giornata di pomeriggio/sera (entry singole dettagliate sotto, qui solo il quadro consolidato).

**Punto di arrivo**: il modulo Nutrition copre adesso **l'intero ciclo coach** in modo **coerente su tutti i tab**: il piano vero del coach si **genera** (postino F.1 → riga-madre `weekly_plans`; F.2a v2 → 14 pasti `weekly_plan_meals` con ingredienti+dosi+orario+spiegazione obbligatoria), si **salva** correttamente con tutte le colonne nuove popolate, e si **vede in modo identico** sia nel tab Piano (card giorno con anteprima pranzo+cena, overlay dettaglio con ingredienti reali e "PERCHÉ TI PROPONGO QUESTO" pieno, disclaimer "colazione/merenda gestisci tu", banner "ESEMPIO DIMOSTRATIVO" condizionale che sparisce) sia nel tab Oggi (riga "PIANIFICATO · DAL COACH" della timeline che mostra LO STESSO pasto del tab Piano per lo stesso giorno). Verificato dal vivo sul profilo Ignazio (settimana `2026-05-25`, piano `a5dd98d2-…`).

**Catena dei 7 commit della giornata**:
- `47a7542` — **F.2a v2**: il coach ora genera pasti COMPLETI (ingredienti con dosi precise + meal_time + macro coerenti). Nuove colonne `weekly_plan_meals.ingredients (jsonb)` + `meal_time (text)` — ALTER TABLE eseguito manualmente in Supabase prima del deploy codice. Validatore + INSERT estesi.
- `85c0554` — **Passo 2**: il tab Piano legge davvero da `weekly_plan_meals` (loader async + cache `ST.pianoV4RealPlanCache`, mapper riga DB → card UI, banner condizionale, card giorno con anteprima compatta pranzo+cena, totalizzatore senza judgment in modalità piano vero perché copre solo il 60% kcal).
- `a7e87aa` — **Fix `ai_explanation` NULL** + disclaimer colazione/merenda. Causa: il prompt marcava `explanation` opzionale → l'AI lo ometteva → DB salvava NULL. Fix: regola 10 OBBLIGATORIA + framing UX esplicito + fallback non-vuoto nel validatore. Disclaimer "COLAZIONE & MERENDA" aggiunto in fondo all'overlay dettaglio giorno, solo in modalità piano vero.
- `04a2048` — **Fix cache negativa sticky**: le entries `{state:'loaded', plan:null}` non sono più trattate come verità durevoli. Si rifà la query al prossimo trigger. + Invalidazione `ST.pianoV4RealPlanCache = {}` in `refreshInBackground` per cross-device sync.
- `3991322` — **Log diagnostici `[piano-diag]` temporanei** lungo tutta la catena, per la diagnosi del bug "tab Piano mostra demo nonostante piano in DB".
- `d3dc5ef` — **Rimozione log diagnostici** post-diagnosi. Cleanup (-97 righe nette).
- `9bda61a` — **Tab Oggi allineato al piano vero**: `getTodayPianoMeals()` non legge più dalla colonna dormiente `profiles.piano_ai` (era la causa del "Branzino" stale visibile nella timeline) ma dalla stessa fonte del tab Piano (`weekly_plan_meals` via `ST.pianoV4RealPlanCache`). **Single source of truth a 2 tab**: una sola fonte, un loader, una cache → i due tab non possono più divergere.

**Lezioni strutturali aggiunte** (vedi Lezioni di metodo):
- **Punto 6**: quando il sintomo è "vedo il fallback X invece del valore Y", la prima verifica è che Y sia stato SCRITTO in DB, non che la pipeline di lettura sia rotta. Il bug "tab Piano mostra demo" del pomeriggio ci ha portato fuori strada con 2 fix legittimi ma non risolutivi (status filter, cache negativa) prima di scoprire che era un `?genera=1` precedente con generazione pasti fallita silenziosamente (Opzione A: madre senza figli) — i 14 pasti semplicemente non esistevano in DB.
- **Punto 7**: quando il dato vero migra di sede, **schiantare proattivamente la vecchia fonte**. Il fix tab Oggi della sera ha rivelato che, completando F.2a + Passo 2, avevamo spostato la fonte da `profiles.piano_ai` a `weekly_plan_meals` per il tab Piano ma lasciato il tab Oggi a leggere dalla colonna dormiente. Esiste un solo `getTodayPianoMeals()` ed è facile da trovare con `grep ST.pianoAI` — ma è stato fatto solo dopo che il sintomo è arrivato visibile all'utente.

**Stato moduli Nutrition aggiornato**: tutte e 4 le tab (Oggi, Integratori, Analisi, Piano v4) production-ready, e ora coerenti tra loro sulla fonte dei pasti del coach. Tasti ACCETTA/SOSTITUISCI/SALTO sui pasti veri restano ghost disabilitati — la logica reale (registrazione in Tab Oggi + tabella `weekly_plan_acceptance` + integrazione bidirezionale) è un blocco futuro Nutrition non prioritario. Contatore "N/7 GIORNI CON PASTI" è un proxy semplice; la versione acceptance-based arriva insieme ai tasti reali.

**Prossimo grande filone**: Modulo Training (punto di partenza preciso da scegliere a inizio sessione). Resta in agenda parallela (non schedulato) il blocco tasti acceptance pasti.

### 25 maggio 2026 (tarda notte) — Fix: tab Piano non leggeva piano in stato `draft` ✅

**Causa esatta**: la SELECT di `_pianoV4LoadRealPlanForWeek` su `weekly_plans` NON filtrava per status (confermato — qualsiasi status va bene). Il bug viveva nella **gestione cache**: a riga 14271 `if (existing) return;` trattava come stabile anche la cache NEGATIVA (`{state:'loaded', plan:null}`) salvata in un'apertura precedente quando il piano non esisteva ancora.

Sequenza riproducibile:
1. Utente apre l'app prima che il piano venga creato → SELECT 0 righe → cache popolata come `{state:'loaded', plan:null, mealsByDay:{}}`
2. Postino crea il piano `draft` (creato oggi per `2026-05-25`)
3. Utente naviga al tab Piano nello stesso device senza forzare svuotamento cache → `existing` esiste → loader **non ricarica mai** → `_pianoV4GetRealMealsForDay` ritorna `null` → `isRealPlan=false` → demo + banner

Quando in passato il piano era `active`, l'utente apriva l'app DOPO che era stato attivato → cache popolata positivamente subito → tab Piano mostrava i pasti. Il bug era cache-related, non status-related — ma siccome la cache negativa si crea quando la SELECT torna 0 righe (= piano non ancora esistente), il sintomo combaciava con la transizione `assente → draft → active`.

**Fix in 2 punti**:

1. [_pianoV4LoadRealPlanForWeek](zona-tracker.html:14267): rivisto early-return. Ora distingue 3 stati:
   - `state:'loading'` → return (evita race tra chiamate concorrenti)
   - `state:'loaded'` con `plan` trovato → return (cache positiva stabile, niente refetch)
   - `state:'loaded'` con `plan:null` → **fall-through**, ri-tenta la SELECT. Le entries negative non sono verità durevoli: un piano potrebbe essere stato creato meanwhile dal postino o sincronizzato da un altro device.

2. [refreshInBackground](zona-tracker.html:5294): aggiunta invalidazione difensiva `ST.pianoV4RealPlanCache = {}` prima del `renderPage`. Quando l'utente torna foreground (cross-device sync già esistente lo richiama via visibility-change throttle 30s), la cache si svuota e al prossimo render del tab Piano i dati si ricaricano. Costo: piccola fetch extra per ogni settimana visualizzata; beneficio: coerenza cross-device garantita.

**NON toccati**: la generazione coach/F.2a, il banner condizionale (`renderPianoV4DemoBanner`), il mapping pasti (`_pianoV4MapRealMealToCard`), il disclaimer colazione/merenda, schema DB, altri tab.

**Nessuna invalidazione manuale richiesta lato utente.** Il fix garantisce che:
- Una semplice riapertura del tab Piano (tap su PIANO) forza il loader, che ora supera l'early return negativo e fa la SELECT fresca.
- Un return foreground (riapertura PWA dopo un periodo in background) svuota tutta la cache via `refreshInBackground`.

**Collaudo** (piano test esiste già):
1. Chiudi e riapri l'app (per scaricare la nuova build)
2. Tab Nutrition → Piano → card stato deve mostrare contatore `7/7 GIORNI CON PASTI`, hint "Piano del coach pronto · pranzi e cene generati per 7 giorni"
3. Le 7 card giorno mostrano lista compatta `PRANZO 13:00 — ...` / `CENA 20:00 — ...` (non "Nessun pasto pianificato")
4. Tap su LUNEDÌ → 2 card pasto veri con ingredienti, orario, "PERCHÉ TI PROPONGO QUESTO" pieno + disclaimer "COLAZIONE & MERENDA"; banner "ESEMPIO DIMOSTRATIVO" **ASSENTE**

### 25 maggio 2026 (notte) — Fix spiegazioni pasto + disclaimer colazione/merenda ✅

Due rifiniture rapide dopo Passo 2.

**Parte 1 — `ai_explanation` non più NULL.** Diagnosi: il mapping INSERT (`ai_explanation: m.explanation || null`) e il validatore funzionano, ma il **prompt marcava `explanation` come "opzionale"** e il **self-check finale non lo menzionava**. Il modello AI lo ometteva spesso → DB salvava NULL → "PERCHÉ TI PROPONGO QUESTO" vuoto nel dettaglio giorno.

Fix in 3 punti:
- **Regola 10 del prompt** riscritta: da "opzionale, max 15 parole" a **OBBLIGATORIO per ogni pasto** (mai vuoto, mai placeholder generico), 1-2 frasi voce coach personalizzate al profilo+ingredienti+slot, con chiamata esplicita a "è il testo che l'utente leggerà sotto PERCHÉ TI PROPONGO QUESTO" per dare al modello il framing UX.
- **Self-check finale** del prompt esteso: include ora "ogni pasto ha la sua 'explanation' personalizzata e specifica (NON vuota, NON generica, NON uguale tra pasti diversi)".
- **Validatore** ([_pianoV4F2aParseAndValidate](zona-tracker.html:13108)): aggiunto paracadute. Se l'AI omette comunque `explanation` (o lo lascia vuoto) → fallback non vuoto in voce coach, differenziato per slot. Pranzo: "Pranzo bilanciato secondo il tuo profilo e la dispensa ammessa, calibrato sui bersagli Zona del coach." Cena: "Cena calibrata sul tuo target serale, costruita con ingredienti coerenti col tuo regime alimentare." NON blocca la generazione: meglio fallback neutro che 14 NULL.

**INSERT mapping invariato**: `ai_explanation: (m.explanation && String(m.explanation).trim()) || null`. Dopo il validatore `m.explanation` è sempre stringa popolata, quindi `ai_explanation` non sarà mai più NULL sui pasti generati dopo questo deploy.

NON toccati: dispensa, regole 1-9 + 11-12, varietà di struttura, ripartizione 35/25, Opzione A, anti-doppione, hook postino.

**Parte 2 — Disclaimer colazione/merenda nel dettaglio giorno** (solo modalità piano vero).

In `renderPianoV4DayOverlay`, **dopo** le 2 card pranzo+cena, condizionale a `isRealPlan=true`:

```
COLAZIONE & MERENDA
Colazione e merenda le gestisci tu: questo spazio è lasciato libero per le tue
preferenze. Il coach pensa a pranzo e cena, i due pasti principali della giornata.
```

Stile coerente col coach card: sfondo sand `#FDF7E8`, border-left 3px `var(--mod-nutrition)` `#FAC775`, eyebrow Mono caps `#8B6B1E` warm gold, testo Syne italic. 3 nuove classi: `.pianov4-day-free-meals-note`, `.pianov4-day-free-meals-eyebrow`, `.pianov4-day-free-meals-text`. Non un toast, niente CTA — è una nota informativa pacata in voce coach.

**Mostrato SOLO se `isRealPlan=true`**: in modalità demo (5 pasti coprono la giornata completa colazione/spuntino/pranzo/merenda/cena) non avrebbe senso.

**Collaudo**:
1. Liberare la settimana di Ignazio:
   ```sql
   DELETE FROM weekly_plan_meals WHERE plan_id IN (
     SELECT id FROM weekly_plans WHERE user_id='bb6fa499-1364-4d8d-8ce6-774c8e392306' AND week_start='2026-05-25'
   );
   DELETE FROM weekly_plans WHERE user_id='bb6fa499-1364-4d8d-8ce6-774c8e392306' AND week_start='2026-05-25';
   ```
2. Aprire app con `?genera=1` → postino + F.2a generano nuova draft + 14 pasti
3. SELECT `ai_explanation FROM weekly_plan_meals` → tutte le righe popolate, NON più NULL
4. Tab Nutrition → Piano → tap su un giorno → box "PERCHÉ TI PROPONGO QUESTO" pieno con testo personalizzato; disclaimer "COLAZIONE & MERENDA" visibile in fondo
5. Tap freccia › verso settimana futura senza piano → torna modalità demo → disclaimer NON visibile, banner "ESEMPIO DIMOSTRATIVO" e judgment range come prima

### 25 maggio 2026 (sera) — Passo 2: il tab Piano legge i pasti VERI dal DB ✅

Chiusura del TODO mai completato in `renderPianoV4DayOverlay` ("Step F TODO: qui andrà query weekly_plan_meals"). Da oggi il tab Piano interroga davvero il database: se per la settimana visualizzata esiste un piano vero con pasti (`weekly_plans` + `weekly_plan_meals`) → mostra quelli, fa sparire il banner "ESEMPIO DIMOSTRATIVO" e adatta hint/contatore/totalizzatore. Altrimenti → fallback ai 5 demo + banner (comportamento Step C.3 invariato).

NON tocca la generazione coach/F.2a (già completa) né lo schema DB.

**Distinzione "piano vero" vs "demo"**
- Cache in-memory `ST.pianoV4RealPlanCache` keyed su `week_start` ISO. Stati per chiave: `undefined` (mai caricato), `{state:'loading'}` (in flight), `{state:'loaded', plan:{...}|null, mealsByDay:{1:[...], 2:[...]}}` (caricato).
- Loader async `_pianoV4LoadRealPlanForWeek(weekStartIso)` ([zona-tracker.html](zona-tracker.html)):
  1. SELECT `weekly_plans` WHERE `user_id` AND `week_start` (no filter su `status` — qualsiasi piano vero esistente vale, draft/active/archived)
  2. Se row trovata → SELECT `weekly_plan_meals` WHERE `plan_id` ORDER BY `day_of_week, sort_order`
  3. Raggruppa per `day_of_week` (1..7 ISO) → popola cache → re-render automatico (`renderPianoV4` se tab attiva, `renderPianoV4DayOverlay` se overlay aperto)
- Fire-and-forget: agganciato a `openPianoV4DayOverlay`, `renderPianoV4DayOverlay`, `renderPianoV4`. Mai bloccante. Skip per `test-user-001`.
- Helper sincroni: `_pianoV4GetRealMealsForDay(weekOffset, dayOfWeek)` → array (vuoto se nessun pasto per quel giorno) o null (cache non popolata); `_pianoV4HasRealPlanForWeek(weekOffset)`; `_pianoV4CountDaysWithRealMeals(weekOffset)`.
- `isRealPlan` calcolato a runtime in `renderPianoV4DayOverlay` come `Array.isArray(realMeals) && realMeals.length > 0`. Propagato ai 3 renderer figli.

**Mapper DB → card**
Nuovo helper `_pianoV4MapRealMealToCard(row)`: trasforma una riga `weekly_plan_meals` nel formato già consumato da `renderPianoV4MealsList` / `renderPianoV4DayTotals` (preesistenti per i demo). Mapping:
- `id` ← `'real-' + row.id` (prefisso anti-collisione con id demo `'demo-N'` / alt `'alt-XXX-N'`)
- `realId` ← `row.id` uuid (riservato a futura logica acceptance reale)
- `slot` ← `row.slot` (`pranzo`/`cena`)
- `time` ← `row.meal_time` con default `'13:00'`/`'20:00'` per slot se NULL (per righe pre-F.2a v2)
- `name` ← `row.description`
- `kcal/carbs/protein/fat` ← omonimi (Number coercion)
- `ingredients` ← `row.ingredients` (parse JSON difensivo se string; filter stringhe non vuote)
- `reasoning` ← `row.ai_explanation`
- `sort_order` ← `row.sort_order` (per render ordinato pranzo→cena)

**Pasti veri = solo pranzo + cena (2 card, non 5)**
Quando `isRealPlan=true`, l'overlay del giorno mostra le **2 card reali** (pranzo + cena ordinate per `sort_order`), niente card vuote/inventate per colazione/spuntino/merenda. Coerente con la decisione product F.2a (coach genera solo il 60% kcal della giornata; colazione+merenda lasciate alla gestione libera dell'utente).

**Banner demo condizionale**
[renderPianoV4DemoBanner(isRealPlan)](zona-tracker.html:14393): ritorna stringa vuota quando `isRealPlan=true`. Il banner "ESEMPIO DIMOSTRATIVO · Questi sono pasti di esempio... il tuo piano personalizzato arriverà domenica sera." resta visibile **solo** se non c'è piano vero.

**Totalizzatore in modalità piano vero**
[renderPianoV4DayTotals(meals, isRealPlan)](zona-tracker.html:14343): se `isRealPlan=true`, **niente judgment in/sotto/sopra** rispetto al target intero (sarebbe sempre "SOTTO TARGET", perché 2 pasti coprono solo il 60% kcal). Eyebrow esplicito `"TOTALE PRANZO + CENA · 60% DELLA GIORNATA"`, somma kcal + macro, label `"su X totali"` invece di `"/ X target"`. In modalità demo (5 pasti coprono ~100% target) il judgment ±10% resta invariato.

In più, **i flag demo `skipped`/`substituted` da localStorage vengono ignorati** in modalità piano vero (paranoia anti-leak: se un utente aveva flag skip sullo slot 'pranzo' da una sessione demo precedente, non devono ora escludere un pasto vero dal totale).

**Card stato settimana (renderPianoV4)**
- **Hint contestuale**: se `hasRealPlan=true` → `"Piano del coach pronto · pranzi e cene generati per N giorni"`. Altrimenti hint originali (offset 0 / passato / futuro / "arriverà domenica").
- **Contatore N/7**: in Passo 2 mostra **numero di giorni con pasti veri presenti** (semplice e intuitivo). Logica "giorni effettivamente seguiti" (acceptance reale sui pasti veri) arriva in sessione dedicata futura quando verrà costruita l'integrazione bidirezionale Tab Oggi ↔ piano. Label cambiata da `GIORNI SEGUITI` → `GIORNI CON PASTI`.
- **Badge `ATTIVO`**: in modalità piano vero il badge perde la classe `pianov4-status-badge-empty` (passa da attenuato grigio a chip evergreen pieno).
- **Barra 7 segmenti**: i segmenti dei giorni con pasti veri vengono colorati ambra (`var(--mod-nutrition)` `#FAC775`) tramite nuova classe `.pianov4-status-seg-real`. I giorni senza pasti veri restano grigio neutro.

**Card giorno**
- Se per quel giorno esistono pasti veri → la card NON dice più "Nessun pasto pianificato". Mostra invece una **lista compatta** dei pasti veri (es. `PRANZO 13:00 — Pasta integrale...` / `CENA 20:00 — Branzino al cartoccio...`). Nuova classe `.pianov4-day-card-real` (background `var(--s1)`, border-left 3px ambra `var(--mod-nutrition)`).
- Se nessun pasto vero → comportamento originale (card dashed grigio "Nessun pasto pianificato").
- Tap sulla card resta `openPianoV4DayOverlay(dow)` come prima.

**ACCETTA / SOSTITUISCI / SALTO sui pasti veri**
**Soluzione più sicura scelta: ghost disabilitato in modalità piano vero.** I 3 bottoni vengono renderizzati come `pianov4-meal-btn pianov4-meal-btn-ghost` disabilitati con `title="Azione disponibile presto sui pasti del coach"`. Nessuna nuova logica di accettazione/sostituzione/salto implementata (fuori scope come da brief). Il render dei bottoni in modalità demo resta invariato (verde solid ACCETTA, secondary SOSTITUISCI, skip SALTO).

Inoltre, in modalità piano vero la funzione `_pianoV4GetMealForCard` viene **bypassata** (il pasto vero non ha alternative localStorage). Stati `isAccepted/isSubstituted/isSkipped` sempre false in piano vero (le chiavi localStorage demo non matchano gli id `'real-…'`).

**Cleanup logout**
`logout()` ora resetta `ST.pianoV4RealPlanCache = {}` prima di tornare alla schermata auth, evitando leak della cache tra utenti diversi sullo stesso device.

**Nessun nuovo schema DB · Nessuna nuova dipendenza · Nessuna nuova chiamata AI · Altri tab (Oggi/Integratori/Analisi) e Training: intatti.**

**Collaudo**
1. Apri https://ignaziof321621.github.io/benessere-forma/zona-tracker.html (Ignazio account principale)
2. Tab Nutrition → PIANO
3. Verifica card stato settimana: hint "Piano del coach pronto · pranzi e cene generati per 7 giorni", contatore `7/7`, barra 7 segmenti ambra
4. Le 7 card giorno mostrano lista compatta pranzo+cena (NON "Nessun pasto pianificato")
5. Tap su un giorno (es. LUNEDÌ) → overlay si apre
   - **Banner "ESEMPIO DIMOSTRATIVO" deve essere SPARITO**
   - Solo 2 card pasto: PRANZO + CENA, ingredienti reali, orari `13:00`/`20:00`
   - "PERCHÉ TI PROPONGO QUESTO" valorizzato da `ai_explanation`
   - Totalizzatore in alto: eyebrow `"TOTALE PRANZO + CENA · 60% DELLA GIORNATA"`, somma kcal + macro, no judgment SOTTO/SOPRA TARGET
   - I 3 bottoni ACCETTA/SOSTITUISCI/SALTO sono ghost disabilitati con tooltip "Azione disponibile presto sui pasti del coach"
6. Tap freccia ‹/› per navigare a settimana futura senza piano (es. settimana successiva al 25 mag) → l'hint torna a "Piano in arrivo · sarà generato domenica sera", le card giorno tornano "Nessun pasto pianificato"
7. Tap su un giorno della settimana senza piano → overlay mostra di nuovo banner demo + 5 pasti esempio + judgment range come prima
8. Logout + login con altro account (es. test mode `?test=1`) → la cache si svuota e si riparte da zero (no leak cross-user)

**Cosa NON è stato fatto** (volutamente fuori scope, segnalato come da brief):
- Logica reale di **acceptance** sui pasti veri (scrittura su `weekly_plan_acceptance` + match con `meals` tab Oggi). I 3 bottoni restano ghost disabilitati. Sessione dedicata futura — coordinata con l'integrazione bidirezionale Tab Oggi ↔ piano vero.
- **Logica "X/7 giorni seguiti" reale** (basata su acceptance, non su presenza pasti). Contatore mostra ora "giorni con pasti veri" come proxy semplice e onesto; la versione reale arriva quando arriverà l'acceptance.
- **Logica di sostituzione/salto** sui pasti veri (richiede tabella `weekly_plan_acceptance.status` + UI dedicata; non si appoggia più a localStorage demo).

### 25 maggio 2026 (pomeriggio) — F.2a v2: pasti completi con ingredienti + dosi + orario ✅

Estensione di F.2a (Step 7 del Tab Piano v4) per portare ogni pasto generato dal coach al livello di dettaglio delle card demo: lista ingredienti con dosi precise in grammi + orario indicativo. NON tocca la generazione (dispensa, 10 regole esistenti, varietà di struttura, ripartizione 35/25, Opzione A, anti-doppione, hook in `_pianoV4MaybePostino`) né il rendering Tab Piano (passo 2 separato).

**Migration DB** (eseguita manualmente in SQL Editor prima del deploy codice):
```sql
ALTER TABLE public.weekly_plan_meals
  ADD COLUMN IF NOT EXISTS ingredients jsonb,
  ADD COLUMN IF NOT EXISTS meal_time text;
```
Le righe pre-migration mantengono NULL su entrambe (retrocompat). Niente CHECK constraint nuovo — la validazione vive lato app nel validatore JSON.

**Estensione `_pianoV4F2aBuildPrompt`** ([zona-tracker.html:13033](zona-tracker.html:13033)) — aggiunte 2 regole in coda alle 10 esistenti, senza riscriverle:
- **Regola 11 INGREDIENTI CON DOSI PRECISE**: ogni pasto include `ingredients` array di 3-5 voci formato `'NomeIngrediente NUMEROg'`. Dosi realistiche (multipli di 5/10g), coerenti coi macro dichiarati. Riferimenti di coerenza nel prompt (es. 150g salmone ≈ 30g proteine + 15g grassi + ~270 kcal; 70g quinoa secca ≈ 53g carboidrati + ~250 kcal) per dare al modello ancore numeriche. `(peso secco)` / `(peso a crudo)` su cereali e legumi dove ha senso. Vincoli 1-5 (DISPENSA, intolleranze, anti-invenzione, anti-mascheramento) ribaditi come validi anche dentro la lista ingredients.
- **Regola 12 ORARIO PASTO**: ogni pasto include `time` fissa `'13:00'` per i pranzi / `'20:00'` per le cene. Sempre questi due valori.

**Schema JSON risposta esteso**:
```json
{"meals":[{"day":1,"slot":"pranzo","time":"13:00","description":"...","ingredients":["...","..."],"kcal":N,"protein":N,"carbs":N,"fat":N,"explanation":"..."}, ...]}
```

**Self-check finale del prompt esteso** per includere il controllo "ogni pasto ha 3-5 ingredienti con dosi in grammi e i macro tornano coi totali dichiarati, e 'time' = '13:00' pranzi / '20:00' cene".

**`_pianoV4F2aParseAndValidate` esteso** ([zona-tracker.html:13108](zona-tracker.html:13108)): dopo la verifica `description` per ogni pasto:
- Validazione `ingredients`: deve essere array. Filtraggio voci non-stringa o vuote, normalizzazione `.trim()` in-place. Se voci valide < 2 → `{ok:false, reason:'too-few-ingredients', idx, count}`. Se non-array → `{ok:false, reason:'missing-ingredients', idx}`.
- Normalizzazione `time`: se mancante o non valido (non-stringa, vuoto, solo spazi) → default per slot (`'13:00'` pranzo, `'20:00'` cena). Altrimenti `.trim()`. MAI fallisce la validazione su `time` mancante — è un campo "best-effort" col default a copertura.

**`_pianoV4GenerateAndInsertMeals` esteso** ([zona-tracker.html:13153](zona-tracker.html:13153)): payload INSERT batch ora include 2 colonne nuove dopo `description`:
- `ingredients: m.ingredients` (jsonb, già validato/normalizzato dal validator)
- `meal_time: m.time` (text HH:MM, default applicato dal validator se l'AI lo omette)

Resto del payload identico (plan_id, user_id, day_of_week, slot, kcal, protein, carbs, fat, ai_explanation, sort_order). Nessuna rottura di compat: l'INSERT continua a funzionare anche se queste 2 colonne sono NULL nel DB (sono nullable per design).

**Vincoli rispettati**:
- Dispensa `_pianoV4F2aBuildPantry`: intatta
- 10 regole ferree esistenti: intatte (regole 11 e 12 aggiunte in coda)
- Varietà di struttura: intatta
- Ripartizione 35/25: intatta (i bersagli pasto restano calcolati su pranzo 35% + cena 25%)
- Opzione A: intatta (riga-madre F.1 creata SEMPRE; F.2a può ancora fallire senza rollback)
- Anti-doppione (guard `plan_id` pre-INSERT): intatto
- Hook in `_pianoV4MaybePostino`: intatto
- Tab Piano / `renderPianoV4DayOverlay`: NON toccato (le card demo continuano a leggere da array hardcoded; quando il piano AI verrà disponibile, il rendering reale è un passo separato)
- Nessuna dipendenza nuova
- Nessuna chiamata AI aggiuntiva: resta una sola `callAI(prompt, 2000)` per tutti i 14 pasti

**Collaudo**:
1. Liberare la settimana di prova in DB:
   ```sql
   DELETE FROM weekly_plan_meals WHERE plan_id IN (SELECT id FROM weekly_plans WHERE user_id='bb6fa499-1364-4d8d-8ce6-774c8e392306' AND week_start='2026-05-25');
   DELETE FROM weekly_plans WHERE user_id='bb6fa499-1364-4d8d-8ce6-774c8e392306' AND week_start='2026-05-25';
   ```
2. Aprire l'app con `?genera=1` (forza il postino bypassando il guard giorno, mantenendo l'anti-doppione)
3. Verificare in `weekly_plan_meals`:
   ```sql
   SELECT day_of_week, slot, meal_time, description, ingredients, kcal, protein, carbs, fat
   FROM weekly_plan_meals
   WHERE plan_id=(SELECT id FROM weekly_plans WHERE user_id='bb6fa499-1364-4d8d-8ce6-774c8e392306' AND week_start='2026-05-25')
   ORDER BY day_of_week, sort_order;
   ```
   Ogni riga deve avere: `meal_time` = `'13:00'` o `'20:00'`, `ingredients` array di 3-5 stringhe con dosi in grammi, e somme macro degli ingredienti coerenti coi totali kcal/protein/carbs/fat della riga.

**Conseguenza per Tab Piano**: il rendering attuale (`renderPianoV4MealsList` che usa `_pianoV4GetDemoMeals` con array hardcoded) non viene toccato in questa sessione. Quando il rendering Tab Piano sarà migrato a leggere da `weekly_plan_meals` reali (passo 2 separato), troverà `ingredients` e `meal_time` già popolati per le settimane generate da oggi in avanti. Sulle righe pre-25 mag (NULL) il render dovrà ricadere su un fallback (es. derivare ingredients da `description` con disclaimer, o nascondere la sezione INGREDIENTI). Decisione di rendering rinviata al passo dedicato.

### 25 maggio 2026 — Design onboarding M1: blocco Training + interruttore (solo decisioni)
Sessione chat di sole decisioni di prodotto (no codice). Definito come l'onboarding raccoglierà
attrezzatura (imbuto Dove→pillole-casa), giorni (2/3/4/5), tempo-base (30/45/60) e l'interruttore
Nutrition-only / Nutrition+Training. Adottate 3 colonne `profiles` storiche (`tipo_allenamento`,
`giorni_allenamento`, `durata_sessione`) e create 2 nuove colonne (`attrezzatura` text[], `usa_training`
boolean default true). Vedi sezione "ONBOARDING M1 — BLOCCO TRAINING + INTERRUTTORE". Prossimo:
Claude Design disegna i nuovi step, poi Claude Code implementa.

### 24 maggio 2026 — Sessione 8: Sicurezza + chiusura modulo Nutrition ✅

Tre fix di sicurezza/coerenza chiusi in una sola sessione (5 commit totali). Con questi, il modulo Nutrition è considerato **CHIUSO per questa fase**: piano settimanale automatico + obiettivo coerente ovunque + guard-rail salute attivo. APP_VERSION finale `2026.05.24 · 16:35`.

#### Fix A1 — Onboarding obiettivo SINGOLO ✅ (commit `2d07127` + `e69992a`)

- **Onboarding M1 step 3**: scelta obiettivo passata da "fino a 2" a **esattamente 1** (radio-like). `m1ToggleObiettivo` riscritta (replace, non push), contatore "X di 2 selezionati" rimosso completamente (DOM + JS + CSS), validazione s3 cambiata da `length === 0` a `length !== 1` ("Scegli il tuo obiettivo." al singolare), `m1ApplySelections` aggiornata (niente più logica `.disabled`/contatore). L'array `obiettivi` resta per minimo impatto ma con invariante `length ≤ 1`; il salvataggio `join(',')` produce sempre stringa singola — mai più CSV.
- **Toast informativo** alla selezione (durata 5000ms, anti-fastidio con no-op su ritap stesso obiettivo): *"Obiettivo impostato. Il coach userà questo per costruire i tuoi pasti e i tuoi piani 📋"*.
- **Sottotitolo step 3 corretto** (commit rifinitura `e69992a`): da *"Scegli fino a 2 obiettivi. Possono essere combinati."* a *"Scegli il tuo obiettivo. Potrai cambiarlo più avanti."* (la seconda frase rassicura sull'irreversibilità — coerente con Fix A2 sotto).
- **Causa radice**: caso reale Ornella (`obiettivo='ipertrofia,ricomposizione'` → target nutrizionali assurdi 1060 kcal). Due obiettivi opposti insieme = internamente contraddittori. `calcAdaptedTargets` già usava solo il primo, ignorando il secondo silenziosamente. Dati esistenti già sistemati a mano (solo Ornella aveva il doppio obiettivo).
- **Convenzione toast generale** documentata inline: la durata va proporzionata alla lunghezza del testo (toast lunghi/importanti 5000ms+, toast brevi default 2500ms). Da seguire nei prossimi interventi; nessun cambio globale al default.

#### Fix B — Guard-rail calorie minime ✅ (commit `9c16d4e`)

- **Costanti soglia** (zona-tracker.html ~riga 3193, vicino ad `ACTIVITY_MULT`/`calcTDEE`): `KCAL_MIN_F = 1200` (donne), `KCAL_MIN_M = 1500` (uomini). Sesso 'Altro'/'O'/null → usa la soglia più PRUDENTE (1200). Commento esplicito: **valori indicativi DA VALIDARE con un nutrizionista prima del rilascio pubblico**. Punto unico di modifica.
- **3 helper nuovi**:
  - `_kcalMinForSex(sex)` → ritorna 1500 per 'M', 1200 per tutto il resto.
  - `showLowKcalWarning(targetKcal, sex)` → crea e appende il modal d'avviso al DOM. Idempotente.
  - `checkLowKcalAndWarn(targetKcal, sex)` → invocato post-calcolo nei 3 punti; mostra il modal se `kcal > 0 && kcal < soglia`.
- **Pattern UI scelto**: `info-modal-overlay` + `info-modal` (stesso pattern di `showInfoModal`, `trainDeleteSetConfirm`, ecc.). Modal centrale con scrim, NON un toast. Bottone "Ho capito" che rimuove l'elemento. Testo:
  > **⚠️ Valori molto bassi**
  > I valori calcolati sono molto bassi (**X kcal**, sotto la soglia di sicurezza di Y kcal).
  > Ti consigliamo di **confrontarti con un medico o un nutrizionista** prima di seguire un piano basato su questi numeri. L'app continuerà a funzionare normalmente.
- **Hook nei 3 punti di calcolo target** (post-`calcTDEE`):
  1. `saveOnboarding` (~riga 4109): onboarding finale nuovo iscritto, DOPO upsert profilo PRIMA di m2Skip/loadAndStart_thenM2Entry.
  2. `saveWeight` (~riga 4651): modal "Aggiorna peso" pillolino header, DOPO closeWeightModal + renderPage.
  3. `saveSettings` (~riga 18270): modal Impostazioni profilo, DOPO closeSettingsModal + renderPage.
- **NON blocca**: l'avviso informa e raccomanda, il profilo viene salvato comunque, l'onboarding prosegue, l'app funziona normalmente. Solo informazione visibile, non muro. Eventuale blocco lato coach/postino è un fix separato (non in scope).
- **Logica calcolo invariata**: `calcTDEE`, `calcAdaptedTargets`, `OBJ_ADAPT`, `ACTIVITY_MULT`, formula Mifflin-St Jeor → tutto invariato. Solo controllo post-calcolo aggiunto.
- **Test smoke Node** (8 scenari, tutti OK): Ornella 1060/F scatta, borderline 1199/F scatta, 1200/F NON scatta (= soglia, off-by-one corretto), 1500/M NON scatta, 2326/M (Ignazio) NON scatta, sesso 'O'/null usa soglia 1200 prudente, kcal=0/null non scatta (dato mancante ≠ avviso).
- **Collaudo**: aspetto modal verificato via console (`showLowKcalWarning(945,'F')`); scatto automatico nei 3 punti dal vivo **ancora da verificare sul campo** (replica caso Ornella).

#### Fix A2 — Cambio obiettivo unificato nelle Impostazioni ✅ (commit `49a53bd`)

- **L'obiettivo si gestisce ora in UN SOLO posto: le Impostazioni profilo** (scelta singola, `selectSetObiettivo` era già radio-like dalla v.1 — nessuna modifica al pattern di selezione, solo all'orchestrazione del salvataggio).
- **`saveSettings` refattorata** in due funzioni per supportare conferma asincrona:
  - `saveSettings()` wrapper — legge `oldObiettivo` (con `migrateObiettivo + split(',')[0]` per gestire residui CSV legacy) e `newObiettivo` dal form. Calcola `isGoalChange = (oldObiettivo && newObiettivo && oldObiettivo !== newObiettivo)`. Se cambia → mostra modal conferma; altrimenti chiama `_saveSettingsExecute(false)` diretto.
  - `_saveSettingsExecute(goalChanged)` — esecuzione vera (preserva 1:1 ricalcolo TDEE/macro + update DB + applyProfile + saveCache + closeSettingsModal + renderPage + guard-rail Fix B). Se `goalChanged=true` → toast annuncio post-save (5000ms).
- **Nuova `_saveSettingsShowGoalChangeConfirm(oldKey, newKey)`** — modal di conferma pattern `info-modal-overlay` (z-index 1000, sopra al `weight-modal` z-index 500 del Settings sottostante). Testo:
  > **Cambiare obiettivo?**
  > Vuoi cambiare obiettivo da «X» a «Y»?
  > Il coach userà il nuovo obiettivo per i **prossimi piani settimanali**. I piani già generati restano invariati.
  > [Annulla] [Sì, cambia]
  - "Annulla" → ripristina pill su oldKey (`selectSetObiettivo`) + chiude modal conferma. Modal Settings sotto resta aperto, bottone Salva ancora abilitato.
  - "Sì, cambia" → chiude modal conferma + chiama `_saveSettingsExecute(true)`.
- **Toast annuncio post-cambio confermato** (5000ms): *"🎯 Obiettivo aggiornato. Da ora il coach userà «Y» per costruire i tuoi prossimi piani."*
- **Tab Piano**: rimossa la possibilità di cambiare obiettivo. La griglia 6 pill cliccabili in `renderPiano` è stata sostituita da un blocco read-only (label dell'obiettivo corrente + CTA Mono caps **"GESTISCI NELLE IMPOSTAZIONI →"** che chiama `openSettingsModal()`). Eyebrow "(uno o più)" rimosso.
- **`togglePianoObiettivo` resa no-op deprecata** (toast informativo + apertura Impostazioni). Mantenuta per safety contro DOM in cache PWA stale che potrebbe ancora avere `onclick="togglePianoObiettivo(...)"`. Da rimuovere in cleanup successivo.
- **`togglePianoIntol`** (dieta/intolleranze tab Piano) **NON toccato** — fuori scope del fix.
- **Piani esistenti NON rigenerati** (Opzione 1): `weekly_plans` + `weekly_plan_meals` restano intatti. Il nuovo obiettivo vale dalla prossima generazione del coach (postino F.1/F.2a domenica successiva).
- **Guard-rail Fix B preservato** in `_saveSettingsExecute` (il `checkLowKcalAndWarn` continua a scattare se il ricalcolo post-cambio porta sotto soglia).
- **`obiettivo` salvato SEMPRE come valore singolo** (mai CSV). Dati legacy normalizzati in lettura tramite `migrateObiettivo(...).split(',')[0]`. Schema DB invariato.
- **Logica `isGoalChange` verificata su 6 scenari** (test Node): prima scelta (old vuoto) → no conferma; stesso obiettivo → no conferma; cambio normale → conferma; CSV legacy "ipertrofia,ricomposizione" → conferma (legge primo); CSV legacy + new = primo del CSV → no conferma; new vuoto → no conferma.
- **Collaudo dal vivo positivo**: conferma appare correttamente al cambio reale, "Annulla" ripristina pill + lascia modal Settings aperto, "Sì, cambia" salva con toast annuncio, tab Piano mostra solo lettura con richiamo Impostazioni funzionante.

#### Stato modulo Nutrition al 24 mag 2026 sera

Il modulo Nutrition è **CHIUSO per questa fase**. Riassunto di cosa c'è e funziona:
- ✅ Piano settimanale automatico: postino F.1 (riga-madre `weekly_plans` con obiettivi) + coach genera pranzo+cena 7×2 = 14 pasti (F.2a).
- ✅ Colazione/merenda gestite liberamente dall'utente (F.2b in stand by — riattivabile da onboarding futuro).
- ✅ Tema obiettivo completo e coerente (A1+A2): scelta singola in onboarding, gestione in un posto solo (Impostazioni), conferma sul cambio, tab Piano read-only.
- ✅ Guard-rail calorie (Fix B): avviso modale sotto-soglia in 3 punti di calcolo.
- ✅ Tab Oggi, Integratori, Analisi: production-ready v3.

#### Rifiniture Nutrition rimaste (NON bloccanti, da riprendere quando si vuole)

- **Disclaimer "consulta un esperto" ricorrente** (idea Ignazio): oltre al guard-rail sotto-soglia, mostrare ogni tanto (anche con numeri normali) un promemoria gentile di confrontarsi con un professionista. Dove/quando mostrarlo = scelta di design a sé.
- **Validare soglie calorie 1200/1500 con un nutrizionista** prima del rilascio fuori dai 4 tester (compito esterno di Ignazio; costanti `KCAL_MIN_F`/`KCAL_MIN_M` già pronte da modificare in un solo punto).
- **Debito ordine macro card Piano legacy** (`renderPiano` ~13251 e `updatePianoTargetCard` ~13371): ordine Proteine→Carbo→Grassi invece di Carbo→Proteine→Grassi (Zona). Cosmetico, da uniformare nel redesign Nutrition.
- **Test recupero "giorno dopo" welcome overlay**: ancora mai eseguito dal vivo (nodo aperto da Step E + F.1).
- **F.2b colazione + merenda**: in stand by. Riattivabile se in onboarding M1 esteso l'utente sceglierà "voglio che il coach pensi anche a colazione/merenda".
- **Collaudo Fix B dal campo**: verificare scatto automatico nei 3 punti di calcolo (onboarding + saveWeight + saveSettings) replicando profilo tipo Ornella (donna 64 anni sedentaria dimagrimento).
- **Cleanup `togglePianoObiettivo`**: la funzione è ora orfana no-op deprecata. Rimuovere quando si avrà certezza che nessun DOM in cache PWA la chiami più.

### 23 maggio 2026 (sera) — Sessione 7 / Step F.2a: Generazione pasti pranzo+cena ✅ STEP F.2a CHIUSO

Subito dopo il postino F.1 (riga-madre `weekly_plans` con i 4 target), il postino genera ora anche i **pasti figli** in `weekly_plan_meals` — SOLO **pranzo + cena** per 7 giorni (14 pasti). Colazione e merenda restano fuori da F.2a (= sessione F.2b separata). Catena 4 commit: scheletro + 3 giri di irrobustimento prompt dal vivo + ritocchi toast voce coach. APP_VERSION finale `2026.05.23 · 21:56`.

**Ripartizione calorica standard per TUTTI gli utenti** (decisa, non personalizzata per ora):
- Colazione 25% · Merenda/barretta 15% · **Pranzo 35%** · **Cena 25%**
- F.2a genera pranzo + cena (= 60% del totale); il 40% restante (colazione+merenda) è "spazio riservato" alle fasi future. Il coach NON deve usarlo.
- I bersagli per pasto sono calcolati a runtime dai `target_kcal/protein/carbs/fat` del profilo dell'utente: helper `_pianoV4F2aTargets(targets)`. Proporzioni uguali per tutti, numeri diversi per ciascuno. Esempio Ignazio (2326/198/221/72): pranzo bersaglio 814/69/77/25, cena 582/50/55/18. Sono indicativi (oscillazioni ragionevoli ammesse).

**Come funziona la generazione**
- **Una sola chiamata** `callAI(prompt, 2000)` al Worker Groq per tutti i 14 pasti. Il coach legge dal profilo `first_name/age/sex/dieta/intolleranze (ARRAY)/obiettivo` + i bersagli.
- **JSON rigido** in risposta. Schema:
  ```
  {"meals":[{"day":1-7,"slot":"pranzo|cena","description":"...","kcal":N,"protein":N,"carbs":N,"fat":N,"explanation":"..."}, ...]}
  ```
- **Parser + validatore robusto** `_pianoV4F2aParseAndValidate(text)`: strip backtick → try/catch `JSON.parse` → verifica array `meals` presente, 14 oggetti, copertura completa `1..7 × {pranzo,cena}` senza duplicati, campi obbligatori (`day` intero 1-7, `slot` ∈ {pranzo,cena}, `description` non vuoto). MAI throw — sempre `{ok:true,meals}` o `{ok:false,reason}`. Se l'AI risponde malformata/incompleta → NON scrive pasti, ritorna `reason` leggibile per diagnostica.

**Opzione A — decisione presa**
- La riga-madre F.1 viene creata SEMPRE, indipendentemente dall'esito dei pasti.
- I pasti sono un add-on: se generazione/validazione/INSERT fallisce → la riga-madre resta senza pasti (il welcome overlay la annuncia comunque), nessun rollback.
- L'INSERT dei 14 pasti è batch, DOPO la creazione della riga-madre. Se l'INSERT pasti fallisce a metà → log + toast informativo, app prosegue.

**Funzioni nuove** (tutte in `zona-tracker.html`, blocco `// PIANO V4 Step F.2a`):
- `_pianoV4F2aTargets(targets)` — calcola bersagli pranzo (35%) + cena (25%) dai target del profilo
- `_pianoV4F2aBuildPantry(dieta, intolleranze)` — costruisce la "DISPENSA AMMESSA" (whitelist categorie ingredienti) per il profilo. Detection regime: pescetariano/vegetariano/vegano/onnivoro (string match permissivo). Sottrae intolleranze: `noLatticini`, `noGlutine`, `noUova`, `noFrutSecca`, `noSoia`.
- `_pianoV4F2aBuildPrompt(profile, targets, perMeal)` — assembla il prompt italiano con profilo + bersagli + dispensa + 10 regole ferree + tavolozza varietà struttura + formato JSON rigido + self-check finale
- `_pianoV4F2aParseAndValidate(text)` — parser + validatore robusto (vedi sopra)
- `_pianoV4GenerateAndInsertMeals(planId, profile, targets, opts)` — orchestratore: guard anti-doppione `plan_id` → `callAI(prompt, 2000)` → validazione → INSERT batch in `weekly_plan_meals`. MAI throw.

**Hook integrazione**: dentro `_pianoV4MaybePostino` subito dopo l'INSERT riuscito della riga-madre F.1. I pasti vengono generati SOLO se la riga-madre è stata appena creata in QUESTA esecuzione (il branch skip-existing/race-conflict di F.1 ritorna prima di arrivare al blocco F.2a). Guard pre-INSERT su `plan_id` come paranoia anti-race.

**Convenzioni DB rispettate**
- `day_of_week` `1=LUN..7=DOM ISO` (coerente con riga 13998 e CHECK constraint)
- `slot` ∈ `{'pranzo','cena'}` (CHECK constraint ammette `colazione/spuntino/pranzo/merenda/cena`)
- `sort_order`: pranzo=1, cena=2

**Prompt irrobustito in 3 giri di collaudo dal vivo** — lezione chiave: il coach AI va affinato iterativamente guardando i dati reali, non con una sola passata "perfetta" a tavolino.

- **Giro 1** (commit `4bc94eb`, scheletro F.2a): funziona meccanicamente — 14 pasti, conti corretti, JSON valido — ma il coach INVENTA quando in difficoltà ("Pollo di mare" per un pescetariano: nome inventato per mascherare il pollo, che è carne) e RIPETE identici i piatti del giorno 7.
- **Giro 2** (commit `76cb793`, irrobustimento contenuto): aggiunte **10 regole ferree** numerate per priorità + nuovo helper `_pianoV4F2aBuildPantry` che genera la "DISPENSA AMMESSA" per il regime alimentare dell'utente (whitelist categorie, sottrae intolleranze). Regole chiave: (1) DIVIETO INVENZIONE — solo ingredienti reali con nome corretto italiano. (2) DIVIETO MASCHERAMENTO — esempio negativo esplicito "pollo di mare NON ESISTE, il pollo è carne". (3) PRUDENZA — se difficile, scegli piatto più semplice dalla dispensa. (4) DUBBIO=NO — nel dubbio non usare. (5) INTOLLERANZE precedenza assoluta. (6) VARIETÀ INGREDIENTI con attenzione esplicita al giorno 7. (7-10) cucina italiana, bersagli macro, description, explanation. + self-check finale prima del JSON. Risolto: ingredienti veri, no latticini, 7 giorni con ingredienti diversi.
- **Giro 3** (commit `8ae2dda`, varietà di struttura): secondo difetto sottile — ingredienti diversi ma stessa STRUTTURA ripetuta tutta la settimana ("carbo+pesce" a pranzo, "pesce+contorno" a cena, sempre "al forno"/"in padella"). Aggiunta sezione **VARIETÀ DI STRUTTURA** con tavolozza 4 punti:
  - **A) Piatti unici completi** (zuppe ricche, insalatone, bowl) accanto ai "primo+secondo"
  - **B) Metodi cottura pesce variati** (forno, padella, cartoccio, vapore, umido/zuppa, marinato, griglia). **VIETATO pesce CRUDO o TARTARE** (escluso per scelta).
  - **C) Schema pranzo/cena variabile** — invertire o rompere lo stampo "carbo a pranzo + pesce a cena"
  - **D) Proteine protagoniste varie** — legumi (zuppa/polpette/hummus/dahl/vellutate) e uova (frittata, shakshuka) protagonisti di alcuni pasti, non solo pesce
  - Self-check finale esteso per includere varietà di struttura. Risolto: niente più formula unica ripetuta.

**Toast = voce del coach** (commit `e966956`, ritocchi finali UX): rimossi termini interni "Postino"/"draft"/"INSERT" da tutti i 7 toast user-facing del postino. Linguaggio umano e comprensibile. Testi finali:
- Creazione piano OK → **"Il coach ha generato il tuo piano per la settimana del DD/MM/YYYY 📋"** (5500ms)
- Pasti generati OK → **"Il coach ha preparato pranzi e cene della settimana 🍽️"** (7500ms — più lungo, è la notizia principale)
- Piano già esistente → **"Hai già un piano del coach per questa settimana"** (5500ms)
- Pasti NON generati → **"Piano pronto, ma il coach non è riuscito a preparare i pasti — riprova"** (7500ms)
- Errori DB / exception → frasi umane generiche ("Qualcosa è andato storto..."), niente più stringhe di errore tecnico visibili
- Termini tecnici restano SOLO in `console.log [postino]` / `[postino-meals]` per diagnostica DevTools
- `showToast(msg, emoji, duration)` invariato: SOLO i 7 toast del postino passano `duration` esplicita (5500/7500); tutti gli altri toast dell'app restano sul default storico 2500ms.

**Collaudo dal vivo positivo** su profilo Ignazio (pescetariano, no lattosio/latticini, ricomposizione, 2326 kcal): 14 pasti, pranzi ~800-830 / cene ~570-600 kcal, ingredienti reali, intolleranze rispettate, varietà piena di ingredienti E struttura. DB pulito a fine sessione: solo la draft di test originale `2026-05-25` con target `2200/187/209/68` resta come banco prova.

**Catena commit Step F.2a**:
- `4bc94eb` — feat(piano-v4): Step F.2a — generazione 14 pasti (pranzo+cena × 7gg)
- `76cb793` — fix(piano-v4): Step F.2a — irrobustimento prompt coach (no invenzione + varietà ingredienti)
- `8ae2dda` — fix(piano-v4): Step F.2a — varietà di STRUTTURA dei pasti nel prompt
- `e966956` — fix(piano-v4): toast postino in voce del coach (no termini tecnici utente)
- Branch `main`. APP_VERSION finale `2026.05.23 · 21:56`.

**Nodi aperti per F.2b e oltre** (vedi sezione "Note/scoperte" e "TODO Step F.2b" sotto):
- Step F.2b = colazione + merenda (sessione separata). Tendenzialmente colazione standardizzata per utente, merenda spesso = barretta energetica.
- Filosofia target futura: ricettario "pasti già approvati" che il coach pesca; apprendimento dallo storico; (F.2d) il coach corregge squilibri suggerendo cibo o integratore Nutrilite. Costruzione strada facendo.
- Vincolo "un solo obiettivo alla volta" da imporre nell'onboarding (vedi Note/scoperte).
- Guard-rail sicurezza kcal minime prima del rilascio pubblico (vedi Note/scoperte).
- Test recupero "giorno dopo" del welcome overlay ancora da eseguire dal vivo (vedi TODO Step F.2b).

### 23 maggio 2026 — Sessione 6 / Step F.1: Postino generazione draft `weekly_plans` ✅ STEP F.1 CHIUSO

Prima metà dello Step F. F.1 = solo riga-madre del piano (obiettivi). I pasti figli arrivano in F.2 (sessione successiva). Catena: 1 commit principale (postino) + 1 commit di rifinitura (toast). Deploy + collaudo dal vivo positivo. APP_VERSION finale `2026.05.23 · 15:08`.

**Cosa fa il postino**
- Alla **prima apertura dell'app di domenica** (giorno corrispondente a `profiles.plan_generation_day`, con recupero "giorno dopo" `(planDow + 1) % 7` se l'utente non ha aperto l'app nel giorno-piano), genera la riga-madre del piano settimanale in `weekly_plans` con `status='draft'` per la settimana che sta per iniziare. `week_start` = lunedì ISO successivo via `_pianoV4NextWeekStartIso()` (helper nuovo: se oggi è lunedì → settimana corrente; altrimenti → settimana prossima).
- Niente cron server. Il postino gira **all'apertura app**, agganciato nei 3 rami di `loadAndStart` (cache-hit, errore-rete, cache-miss) **PRIMA** delle chiamate welcome (`_pianoV4MaybeForceWelcomeFromUrl` + `_pianoV4MaybeAutoWelcome`). Sequenza nei 3 rami: `await _pianoV4MaybePostino({})` → forzature URL → welcome auto. Garantisce che la draft esista quando l'overlay la cerca subito dopo.

**Modo 1 — "obiettivi invariati"**
- Copia i 4 target dal profilo (`target_kcal/target_protein/target_carbs/target_fat`) senza adattarli. L'adattamento AI dei numeri (Modo 2, ricalcolo target su trend peso / aderenza piano) è **rinviato a fase futura** (Step G memoria AI + adattamento).
- Guard: se uno qualunque dei 4 target è null o 0 → `decision='skip-no-targets'`, nessun INSERT.

**`ai_reasoning` — voce del coach via AI**
- Scritto dal coach AI via `callAI(prompt, 200)`. Prompt italiano, prima persona plurale ("questa settimana confermiamo..."), tono caldo, max 2-3 frasi, niente preamboli, niente elenchi puntati, niente nome proprio (l'app non dà un nome al coach), niente ripetizione numerica dei target uno per uno.
- **Fallback robusto**: costante `_PIANOV4_POSTINO_FALLBACK_REASONING` usata se `callAI` lancia errore o ritorna stringa vuota → la draft viene creata COMUNQUE. Il postino non deve mai fallire per colpa dell'AI.

**Anti-doppione (critico)**
- SELECT preventiva su `weekly_plans` per `(user_id, week_start)`. Se esiste già una riga di **qualunque status** (draft/active/archived) → `decision='skip-existing'`, nessun INSERT.
- Doppia protezione: error handling su `unique_violation` (codice 23505) all'INSERT, gestito come `skip-existing` senza crash (race condition con un altro device).

**Forzature collaudo**
- `?genera=1` URL flag — bypassa solo il guard "giorno", mantiene anti-doppione.
- `window.ztTestGenera()` — equivalente console.
- `?generaDebug=1` — `console.log [postino] status:` dietro ogni esecuzione (auto + force).
- `window.ztGeneraWhy()` — diagnostica `console.table` esito di ogni guard senza effetti DB. `decision ∈ {create, skip-no-user, skip-no-profile, skip-day, skip-existing, skip-no-targets}`.

**Funzioni nuove** (tutte in `zona-tracker.html`, blocco `// PIANO V4 Step F.1`):
- `_pianoV4MondayToIso(monday)` — Date → `'YYYY-MM-DD'` DST-safe
- `_pianoV4NextWeekStartIso()` — lunedì della settimana che STA per iniziare
- `_pianoV4IsoToItDate(iso)` — `'YYYY-MM-DD'` → `'DD/MM/YYYY'` per toast (SOLO testi utente, MAI per DB/confronti)
- `_pianoV4ComputePostinoStatus({force})` — calcola guard, ritorna `{decision, ...details}`
- `_pianoV4GenerateReasoning(targets)` — chiamata AI con fallback robusto
- `_pianoV4MaybePostino({force, toastOnSkip})` — entry-point: status → AI → INSERT con error-handling
- `_pianoV4MaybeForcePostinoFromUrl()` — handler `?genera=1`
- `window.ztTestGenera`, `window.ztGeneraWhy` — diagnostica esposta
- Costante `_PIANOV4_POSTINO_FALLBACK_REASONING`

**Modifica collegata al welcome overlay (Step E)** — coerenza "domenica senza orario"
- In `_pianoV4ComputeAutoWelcomeStatus()` il blocco "3) Ora" ora forza `out.timeOk = true`. La `decision='skip-time'` non scatta più: il welcome overlay si apre in base a giorno + draft + flag, senza aspettare un'ora soglia.
- `nowHHMM`/`planTimeNorm` restano calcolati per la diagnostica.
- **`profiles.plan_generation_time` resta in DB, dormiente, per le future notifiche push V2.** NON rimuovere la colonna né la sua lettura.

**Ritocchi cosmetici post-collaudo** (commit separato `74c51c5`):
- Helper `_pianoV4IsoToItDate(iso)` applicato ai 3 toast del postino che mostrano `week_start` (race conflict, skip-existing, draft creata) → formato italiano `DD/MM/YYYY`. Il valore in DB resta ISO.
- `showToast(msg, emoji, duration)` esteso con terzo parametro opzionale (default 2500ms, retro-compatibile). I 5 toast del postino passano `5500` per dare tempo di leggere; **nessun altro toast dell'app è stato toccato** (tutti restano sul default storico).

**Collaudo dal vivo (esito positivo)**
- `?genera=1` con settimana 25 mag occupata dalla draft di test → toast `ℹ️ Postino: piano già esistente per la settimana 25/05/2026` (formato IT) + decision `skip-existing` su `ztGeneraWhy()`.
- Spostata temporaneamente la draft di test al `2026-06-01` via SQL → postino ha creato una NUOVA draft `25/05/2026` con target `2326/198/221/72` e `ai_reasoning` AI reale (NON fallback).
- Dati di test ripristinati a fine sessione: la draft test originale `2026-05-25` con `status='draft'` resta in DB come banco di prova per future sessioni (vedi sezione "weekly_plans"). DB pulito a fine sessione.

**Commit + branch**
- `0fbbe86` — feat(piano-v4): Step F.1 — postino generazione draft weekly_plans
- `74c51c5` — fix(piano-v4): Step F.1 ritocchi — data IT nei toast postino + durata 5500ms
- Branch `main`. APP_VERSION finale `2026.05.23 · 15:08`.

**Nodi aperti per F.2** — vedi sezione "TODO Step F.2 (quando arriverà)" sotto, in particolare:
- Test dal vivo del recupero "giorno dopo" (`(planDow + 1) % 7`) ancora **non eseguito** — F.1 ha cambiato il day-check ma il recupero giorno-dopo va testato un lunedì (con plan_generation_day='sun')
- Nodo logico "giorno dopo vs lunedì" (collisione `week_start+1`) **ancora aperto** — decisione rinviata quando il piano avrà pasti veri (F.2)
- R1 dedup integratori, R3b `generaPianoAI`, ordine macro card legacy Piano (vedi debito tecnico)

### 22 maggio 2026 sera — Sessione 5 / Step E: Welcome overlay domenicale ✅ STEP E CHIUSO

Chiusura completa dello Step E del Tab Piano v4 in 2 commit incrementali sullo stesso branch `main`, con deploy + smoke test dal vivo + collaudo positivo. Sessione doppia (UI prima, trigger automatico dopo) per validare prima la cosmetica e poi la logica invisibile.

**PARTE 1 — UI overlay fullscreen + lettura dati reali** (commit `c23deeb`, APP_VERSION `v2026.05.22 · 17:17`)
- Nuovo overlay fullscreen bone pieno (NON scrim semitrasparente — cartello a tutto schermo) che annuncia il piano nutrizionale della settimana successiva. Render via `openPianoV4WelcomeOverlay(mode)` / `renderPianoV4WelcomeOverlay()` / `closePianoV4WelcomeOverlay()`.
- Lettura DB: `_pianoV4LoadDraftPlan()` interroga `weekly_plans` WHERE `user_id=ST.user.id` AND `status='draft'` ORDER BY `week_start DESC` LIMIT 1. Se nessuna draft → return silenzioso (overlay non si apre, nessun errore visibile).
- Confronto target draft vs `ST.TARGET` via `_pianoV4WelcomeComputeDiff(draft)` che ritorna `{kcal,protein,carbs,fat,anyDiff}` con `dir: 'up'|'down'|'same'` per ogni macro.
- **2 varianti card centrale** scelte automaticamente in base ad `anyDiff`:
  - **VARIANTE A "ADATTAMENTO PROPOSTO"** (almeno un target differisce): KCAL dominante con vecchio striked + freccia + nuovo Mono 700 38px + pill delta evergreen `↓ −N KCAL` (terracotta se up). Poi 3 macro in riga **nell'ordine canonico Carbo→Prot→Grassi** (logica Zona 40-30-30) colorati con `var(--carb)/--prot/--fat`, ognuno con vecchio striked + freccia + nuovo + pill delta.
  - **VARIANTE B "OBIETTIVI INVARIATI"** (tutti uguali): check evergreen + titolo "Gli obiettivi restano invariati" + tile compatto coi 4 target attuali nello stesso ordine.
- Voce del coach: tile mint `var(--acc-lt)` con icona ✦ + label Mono caps "VOCE DEL COACH" + testo `draft.ai_reasoning` in italic Syne 13.5.
- 2 CTA in fondo:
  - **"Vedi piano →"** evergreen fill 52px: `pianoV4WelcomeConfirmAndOpen()` → UPDATE `weekly_plans SET status='active' WHERE id=draft.id AND user_id=ST.user.id` → `showPage('piano')` → `renderPianoV4()`. Disabilita CTA durante submit, gestisce errori con toast.
  - **"Più tardi"** testo grigio centrato: `pianoV4WelcomeLater()` → chiude e basta. **NESSUNA mutation DB** (status resta `'draft'`).
- **Forzatura collaudo** (essenziale per testing senza aspettare il trigger reale):
  - `window.ztTestWelcome()` da console
  - `?welcome=1` in URL → `_pianoV4MaybeForceWelcomeFromUrl()` apre overlay con `mode='force-test'` 250ms dopo `showPage('home')` nei 3 rami di `loadAndStart`
- State nuovo: `ST.pianoV4WelcomeOverlay = { draft, diff, submitting, mode } | null`.
- Design system: solo token esistenti — `var(--bg)` bone, `var(--acc)` evergreen, `var(--acc-lt)` mint, `var(--carb)/--prot/--fat` per macro. Syne 700/600 titoli, JetBrains Mono 700/500 numeri + label caps tracking .18-.25em.

**PARTE 2 — Trigger automatico (giorno + ora + flag)** (commit `f8e3064`, APP_VERSION `v2026.05.22 · 19:27`)
- Regola del trigger concordata con utente, implementata in `_pianoV4MaybeAutoWelcome()` (entry-point) + `_pianoV4ComputeAutoWelcomeStatus()` (computazione). L'overlay si apre AUTOMATICAMENTE se e solo se TUTTE vere:
  1. Esiste una draft in `weekly_plans` (stessa fetch della Parte 1)
  2. **GIORNO**: oggi (`Date.getDay()`) === `plan_generation_day` del profilo, OPPURE è `(planDow + 1) % 7` (recupero "giorno dopo" se l'utente non ha aperto l'app nel giorno-piano)
  3. **ORA**: orario device (HH:MM) >= `plan_generation_time` del profilo
  4. **FLAG**: localStorage `'zt_welcome_ack_<week_start>'` NON presente
- Costante `_PLAN_DAY_MAP` mappa abbreviazioni 3 lettere → `Date.getDay()` (sun=0..sat=6). Estesa coi 7 giorni anche se CHECK DB ammette solo `fri/sat/sun` (vedi nota tecnica sotto).
- **Prima volta che `plan_generation_day` e `plan_generation_time` vengono letti dal codice** (grep restituiva zero prima di questa sessione). Letti direttamente da `ST.profile.plan_generation_day` / `ST.profile.plan_generation_time` (riga grezza da Supabase).
- **Scrittura del flag "visto"** (`_pianoV4WelcomeAckSet(weekStart)`):
  - Avviene SOLO al click di un CTA (Vedi piano OR Più tardi)
  - **E SOLO se `mode === 'auto'`** — le forzature collaudo (`mode='force-test'`) NON scrivono il flag → bypass totale, non sporca lo stato di produzione
  - Se l'utente vede l'overlay e chiude l'app senza premere → flag NON scritto → riapparirà al prossimo trigger valido (volere esplicito: "premuto = visto")
- Guard anti-doppio-render: `_pianoV4MaybeAutoWelcome` controlla `document.getElementById('pianov4-welcome-overlay')` prima di aprire. Se la forzatura ha già montato l'overlay, l'auto NON ri-apre.
- **Diagnostica** (la logica è invisibile, un bug si manifesta come "overlay non appare" o "appare quando non dovrebbe"):
  - `?welcomeDebug=1` → console.log `[welcome-auto] status: {…}` con esito di ogni condizione
  - `window.ztWelcomeWhy()` esposto: chiamabile da console come `await ztWelcomeWhy()` → console.table + return dell'oggetto stato con campo `decision ∈ {open, skip-no-user, skip-no-profile, skip-no-draft, skip-day, skip-time, skip-ack}`
- Aggancio bootstrap: `_pianoV4MaybeAutoWelcome()` chiamata nei 3 rami di `loadAndStart` (cache-hit, errore-rete-con-cache, cache-miss) subito dopo `_pianoV4MaybeForceWelcomeFromUrl`.

**Collaudo dal vivo** (Ignazio + DB Supabase, esito positivo)
- Variante A con dati reali: KCAL `2326 → 2200` (pill `↓ −126 KCAL`) + macro Carbo `221→209 ↓−12G` + Prot `198→187 ↓−11G` + Grassi `72→68 ↓−4G` + voce coach reale dal DB.
- Forzatura `?welcome=1`: overlay si apre subito, "Più tardi" NON tocca il DB, "Vedi piano →" porta status a `active` e naviga al tab Piano.
- Trigger automatico: con `plan_generation_day` impostato manualmente al giorno corrente + `plan_generation_time` ad un orario già passato + flag azzerato → overlay appare da solo all'avvio app.
- Anti-nag: dopo click su CTA in modalità `auto`, flag scritto → riapertura app stesso giorno NON riapre l'overlay (decision = `skip-ack`).
- Forzatura `?welcome=1` continua a funzionare ANCHE col flag presente (bypass totale).

**Lezione 1 — Vincolo DB scoperto durante il collaudo**
La tabella `profiles` ha un CHECK constraint `profiles_plan_day_check` che ammette per `plan_generation_day` SOLO i valori `'fri','sat','sun'`. Qualsiasi altro giorno (es. `'thu'`) viene rifiutato dal DB con errore. La documentazione design 19 mag prevedeva un quarto valore `'custom'` (per scelta libera del giorno via UI futura) ma il vincolo in produzione **non lo include**. Conseguenze:
1. I test del trigger vanno fatti solo con `fri/sat/sun`.
2. L'onboarding M1 esteso (priorità #6) dovrà offrire solo questi 3 giorni come scelta, OPPURE estendere il vincolo DB prima di esporre l'UI.
3. Il TEST del recupero "giorno dopo" NON è stato eseguito (con `plan_generation_day='thu'` il DB rifiuta) — da verificare dal vivo un sabato (piano=ven) o una domenica (piano=sab).

**Lezione 2 — Nodo logico aperto: "giorno dopo" vs lunedì**
Con giorni-piano ammessi solo `ven/sab/dom`, il "giorno dopo" calcolato dal recupero può cadere di **lunedì** — che è anche `week_start` della settimana ISO. Va chiarito in Step F l'incrocio tra "recupero del welcome della settimana che sta per iniziare" e "passaggio alla settimana nuova". Esempi: piano=ven → giorno-dopo=sab (ok, stessa settimana); piano=sab → giorno-dopo=dom (ok, stessa settimana); piano=dom → giorno-dopo=lun (collisione con `week_start+1`). Decisione rinviata a Step F quando il piano prende vita coi pasti veri.

**Dati di test preservati**: la riga draft di `weekly_plans` (user Ignazio, week_start `2026-05-25`, target `2200/187/209/68`, ai_reasoning popolato) **non va cancellata** — è il banco di prova del welcome overlay e il modello-contratto per Step F (vedi sezione `weekly_plans` aggiornata).

**File toccati**: solo `zona-tracker.html` (+621 righe nette su 2 commit). Niente nuove dipendenze, niente modifiche schema DB, niente Worker AI ancora coinvolto.

**Prossimo step**: Step F — generazione AI del piano settimanale. Originariamente progettato come Cloudflare Worker schedulato (cron su `plan_generation_day`+`plan_generation_time`). [Update 23 mag 2026: split in F.1 = postino app-side per la riga-madre `weekly_plans`, scadenza originale 24 mag rispettata; F.2 = pasti figli `weekly_plan_meals` da fare in sessione successiva. Scelta architetturale: niente cron server — il postino gira all'apertura app.]

### 22 maggio 2026 pomeriggio — Step D.2 banner reminder + Step D.3 loadExtras robusto + R3a getAdvice ✅

Catena di 3 commit per chiudere Step D nel modulo Nutrition.

**Step D.2 — Banner reminder pesata + selettore frequenza** (commit `1be5048`, APP_VERSION `v2026.05.22 · 15:01`)
- Banner reminder in tab Oggi (sopra timeline) basato su soglia frequenza (daily=1, every3=3, weekly=7, flexible=14 giorni) vs giorni dall'ultima pesata
- Copy variabile: "Sono passati X giorni dall'ultima pesata" / "Non hai ancora registrato una pesata"
- 2 CTA: "Pesati ora" → `openWeighInSheet()` (D.1) · "Più tardi" → dismiss anti-nag
- Silenzio progressivo via localStorage: 48h → 7gg → 28gg (chiavi `zt_weight_reminder_dismiss_count` + `zt_weight_reminder_dismissed_at`)
- Reset count al successivo upsert pesata (`confirmWeighIn` chiama `_weightReminderResetDismiss`)
- Banner SOLO tab Oggi, mai tab Piano
- Selettore frequenza standalone (componente riusabile per onboarding M1 futuro): `openWeightFreqSheet / renderWeightFreqSheet / closeWeightFreqSheet / selectWeightFreq` — bottom sheet 4 opzioni, optimistic update su `profiles.weight_tracking_mode` + rollback su errore
- Link discreto "Promemoria: <label> ›" sotto bottone Conferma del modal peso D.1
- Pattern bottom-sheet riusa keyframes `pianov4SubstSlideUp/Down`. Banner stile coerente (bone bg + evergreen left-border 3px). z-index 1660 (sopra modal peso 1650)
- Tester immediato: console `localStorage.removeItem('zt_weight_reminder_dismiss_count')` + setta modalità a `daily` + simula pesata di ieri per vedere banner subito

**Step D.3 — Migration colonne supplements_log + loadExtras robusto + Fix R3a getAdvice** (commit `b4259f5`, APP_VERSION `v2026.05.22 · 15:26`)

**Migration DB** (eseguita manualmente da Ignazio nel SQL Editor Supabase pomeriggio 22 mag):
```sql
ALTER TABLE supplements_log
  ADD COLUMN supplement_codice text,
  ADD COLUMN dose numeric,
  ADD COLUMN dose_unit text,
  ADD COLUMN kcal numeric,
  ADD COLUMN carbo numeric,
  ADD COLUMN proteine numeric,
  ADD COLUMN grassi numeric,
  ADD COLUMN costo numeric;
```
Righe extras pre-migration: hanno tutte le 8 nuove colonne a NULL.
Righe extras post-migration: snapshot completo immutabile salvato da `dbInsertExtraLog`.

**`loadExtras` robusto** ([riga 4600](zona-tracker.html:4600)):
- SELECT 16 colonne ora funziona nativamente (no più error 400)
- Aggiunto fallback macro runtime: SE snapshot NULL → lookup `ST.catalog` (per `supplement_codice` → `supplement_name` esatto → nome normalizzato lowercase trim) → calcolo `cat.X × (dose / cat.dose_die)`. Default `dose=1` se NULL (perché perso col refresh pre-migration). Default `costo=catalog.costo_dose_partner × mult`
- Marker `_fromFallback: true` su righe ricostruite via catalog (utile per UI diagnostiche future)
- Catalogo come RETE DI SICUREZZA, mai fonte primaria → storico onesto se il catalogo cambia

**`dbInsertExtraLog` confermato OK**: salva già snapshot completo (kcal/carbo/proteine/grassi/dose/dose_unit/supplement_codice/costo) calcolato da `confirmExtraScreenSubmit` con ratio dose. Nessuna modifica necessaria.

**Verifica no-duplicato pre-commit (CRITICA)**: la barretta `is_extra=true` di oggi appare 1 SOLA volta in timeline (case `'extra'` mint card), conta 1 SOLA volta in `dayTotals` (via `_extrasV3Totals`). Il filtro `loadTodaySuppLog .eq('is_extra', false)` del commit `c32f141` mattutino chiude il path duplicato. Nessuna regressione.

**Fix R3a `getAdvice`** ([riga 3642](zona-tracker.html:3642)):
- Nuovo blocco opzionale `INTEGRATORI ASSUNTI OGGI (già contati nei macro rimanenti)` nel prompt
- Fonte: stesse 3 strutture di `dayTotals` per coerenza qualitativo↔numerico: `ST.extras` (con fallback) + `day.suppsTaken` (mirror `suppTotalsForIds`) + `day.rawSuppLogs` filtrati nomi NON in ST.supps (mirror `extraSuppsTotals`)
- Formato riga: `- <nome>: <kcal> kcal · <P>g P · <C>g C · <G>g G`
- Blocco omesso se 0 integratori assunti
- Istruzione AI estesa: "Se ha già assunto integratori (es. shake o barrette proteiche), tieni conto dell'apporto: non raccomandare proteine extra se già coperte."
- Token budget alzato da 250 → 300 per coprire la sezione extra senza tagliare i suggerimenti
- `generaPianoAI` (R3b) NON toccato → Step F

**Cosa cambia visivamente per Ignazio dopo deploy D.3**:
1. Barretta XS High Protein Energy Bar Cioccolato — invisibile dopo `c32f141` mattutino — torna a comparire in tab Oggi come card mint compact tag EXTRA, slot 10:00
2. Macro mostrate via fallback runtime su catalog: ~203 kcal · 22g C · 15g P · 7g G (dose=1 default — il "0.5" originale è stato perso col refresh ben prima della migration; impossibile da recuperare)
3. Totali kcal/macro giornalieri aumentano di ~203 kcal (Home + Nutrition card hero)
4. Premendo "Analizza & suggerisci" dal coach: il prompt AI ora include riga `- High Protein Energy Bar Cioccolato: 203 kcal · 15g P · 22g C · 7g G` e l'istruzione di non raccomandare proteine extra inutilmente

### 22 maggio 2026 — Step D.1 modal pesata + Fix triplo conteggio integratori ✅

Due interventi nello stesso ciclo:

**1. Step D.1 — Modal "Pesati ora"** (commit `5280f9b`, APP_VERSION `v2026.05.22 · 10:19`)
- Bottom sheet slide-up collegato al CTA card peso Piano V4 (prima era disabled tratteggiato)
- Stepper `−/+` 0.1 kg + tap su numero → keyboard iOS via `<input type="number">` invisibile sopra il display (combinazione, non XOR)
- Default value smart: `ST.weightLogs[0]` → `getLatestBodyData()` → `profile.weight_kg` → 70.0
- Conferma → upsert su `weight_logs` (`onConflict: 'user_id,date'`) + toast `⚖️ Pesata salvata · XX.X kg` + refresh card peso
- Card peso Piano V4 ora legge prima da `ST.weightLogs` (cache locale), fallback `getLatestBodyData`. Cache caricata lazy al primo render Piano + refresh dopo ogni pesata.
- Riusa keyframes `pianov4SubstSlideUp/Down` esistenti; scrim warm-black `rgba(20,15,5,0.46)`; banda evergreen 3px + radius 16px alto; CTA evergreen fill "Conferma".
- NON tocca `body_logs`/`body_measurements` (separati per modulo Body e check M2).

**2. Fix triplo conteggio integratori** (in coda allo stesso commit del 22 mag — vedi nuova entry post-deploy)
Diagnosi DB su utente Ignazio: 1 sola riga `supplements_log` (slot 10:00, is_extra=true, taken=false) appare 3 volte in UI ("INTEGRATORI EXTRA · 10:00 · 203 kcal" + "0.5 barretta · 102 kcal · EXTRA" espansa + "GRUPPO SNACK · 17:00 · 203 kcal"). Causa: `loadTodaySuppLog` ([riga 4664](zona-tracker.html:4664)) leggeva tutte le righe `supplements_log` del giorno **senza filtrare `is_extra`** → le righe Step 2 (is_extra=true, già gestite via `loadExtras` → `ST.extras`) finivano anche in `day.rawSuppLogs` + `day.suppsTaken` → doppio render (`case 'supp_log'` + `case 'supp'` gruppo) + collisione con eventuali pacchetti standard che includono lo stesso nome.

**Fix mirato**: aggiunto `.eq('is_extra', false)` alla query di `loadTodaySuppLog`. Le righe extras vivono ora **esclusivamente** in `ST.extras` (canale dedicato) e sono renderizzate dal solo case `'extra'`. Le righe standard (`is_extra=false`) continuano a vivere in `rawSuppLogs`/`suppsTaken` e a essere renderizzate da `'supp'` (gruppo) o `'supp_log'` (legacy fuori gruppo).

**Schemi DB CLAUDE.md corretti**: aggiornate sezioni `meals` e `supplements_log` con schemi reali verificati via SQL Editor. La `meals.description` è la colonna autoritativa per il nome (NON `name`/`food_name`). `supplements_log` ha SOLO 8 colonne (`id, user_id, date, slot, supplement_name, taken, is_extra, created_at`) — le "9 colonne estese Step 2" descritte nella sezione "Flusso Registra Extra Step 2" (18 mag 2026) **NON sono state applicate in produzione**. Lo snapshot immutabile macro/dose/costo non esiste in DB → le macro extras vengono derivate runtime via lookup `nutrilite_catalog`/`supplements`. Diagnostica completa in [`DIAGNOSTICA_TRIPLO_CONTEGGIO_REPORT.md`](DIAGNOSTICA_TRIPLO_CONTEGGIO_REPORT.md).

**Conseguenza UX per utente Ignazio dopo deploy**: la barretta "High Protein Energy Bar Cioccolato" (registrata come extra slot 10:00) **diventa invisibile** in tab Oggi finché lo schema `supplements_log` non viene esteso con le colonne macro/dose o finché `loadExtras` non viene reso robusto al lookup catalog (fix collaterale opzionale, vedi TODO post-D.1). Comportamento atteso e accettabile: meglio "0 render" che "3 render dello stesso evento". L'utente può sempre registrare la barretta tramite il pacchetto SNACK 17:00 (case `'supp'` standard) che continua a funzionare.

### 21 maggio 2026 — Sessione 3 / Step C: Overlay Dettaglio Giorno completo ✅

Chiusura completa della 3ª sessione roadmap Tab Piano v4 in **8 commit sequenziali** sullo stesso branch worktree `claude/loving-tu-e5fe3e` (catena `5384085`→`2f041f7`), distribuita su 20-21 mag con deploy progressivi + smoke test tester. Workflow design+code in catena con iterazione visiva immediata + 1 diagnostica intermedia (C.4.1, no commit).

**Catena 8 sotto-step**:

| Sub-step | Commit | APP_VERSION | Sintesi |
|---|---|---|---|
| C.1 | `5384085` | `v2026.05.20 · 17:39` | Scaffolding overlay slide-up 240ms (riusa pattern `daydetail-overlay` Analisi v3, prefix `.pianov4-day-*` parallelo) + tap card giorno → apertura + close × + backdrop dismiss + helper `_pianoV4FormatDayHeader/CalculateDate` |
| C.2 | `ef91e3d` | `v2026.05.20 · 17:54` | Empty state strutturato (emoji 📅 + titolo Syne 600 + sottotitolo Mono caps 10.5px) + fix safe-area iPhone notch (`padding-top: max(20px, env(safe-area-inset-top))`) |
| C.2.1 | `dcd9a42` | `v2026.05.20 · 19:10` | Rimozione emoji 📅 (rendering Apple troppo "icona realistica colorata", stonava col design minimal Syne+Mono). Decisione: icon system Zona Tracker custom rimandato a sessione dedicata post-I (lettering Syne ingrandito + SVG monocromatici geometrici) |
| C.3 | `dd9ad07` | `v2026.05.20 · 20:24` | 5 pasti demo always-on visibili a tutti i tester (no flag mock, decisione product) + banner "ESEMPIO DIMOSTRATIVO" sand+giallino + card pasto con macro + ingredienti + box italic "PERCHÉ TI PROPONGO QUESTO" + tono consulenza commerciale Nutrilite/XS educata |
| C.4 | `9d862c9` | `v2026.05.20 · 20:40` | Bottone ACCETTA funzionante via `dbAddMeal()` + persistenza localStorage `zona_pianov4_demo_accept_*` + badge "✓ ACCETTATO" + bordo evergreen + bottone disabled post-azione. Guard "solo oggi" perché `dbAddMeal` hardcoda `date:ST.activeDay` |
| C.4.1 | (no commit) | — | **Diagnostica bug**: pasto accettato contribuiva ai totali ma non appariva in timeline tab Oggi. Causa identificata: mismatch slot demo (`spuntino`/`merenda`) vs slot legacy `meals` (`snack_mattina`/`snack_pomeriggio`) — render timeline filtra solo per slot legacy. Schema `meals` permissivo (no CHECK) → INSERT riesce ma visibilità rotta |
| C.4.2 | `8efbfac` | `v2026.05.20 · 21:47` | Fix via costante globale `SLOT_MAP_DEMO_TO_LEGACY` (riusabile in Step F per writer AI→meals) + script SQL `cleanup-c42.sql` per recover pasti test scritti male (eseguito da Ignazio manualmente in Supabase, residui=0) |
| C.5 | `430df2a` | `v2026.05.21 · 10:55` | Bottone SOSTITUISCI funzionante + bottom sheet 240ms con 3 alternative dimostrative per slot (15 totali tramite `_pianoV4GetAlternatives`) + totalizzatore giorno in cima overlay con feedback range ±10% (3 stati in-range/under/over) + fix ortografico `pescatariano → pescetariano` (10 occorrenze) |
| C.6 | `2f041f7` | `v2026.05.21 · 11:15` | Bottone SALTO funzionante (toggle reversibile via "↺ ANNULLA") + card barrata opacity 0.65 + badge "✕ SALTATO" + escluso da calcolo totalizzatore + counter "· N saltato/i" in eyebrow + precedenza badge accepted > skipped > substituted |

**APP_VERSION finale Step C**: `v2026.05.21 · 11:15`

#### Decisioni di design Step C

1. **Pasti demo always-on (no flag mock)**: tutti i tester (Ignazio, Ginevra, Isabella, Pesce) vedono i 5 pasti demo dal login, senza setup. Banner chiarisce sono esempi dimostrativi. Motivazione: tester capiscono immediatamente cosa aspettarsi dal piano AI Step F.
2. **Box "PERCHÉ TI PROPONGO QUESTO"** come strumento di consulenza commerciale educata: spiega all'utente perché un prodotto Nutrilite/XS ha senso per LUI in QUEL momento, non in astratto. Principio: proposta sempre genuinamente utile, mai promozionale a forza.
3. **3 alternative dimostrative per slot (15 totali) generiche, NON personalizzate**. La personalizzazione vera arriva in Step F con AI che legge `ST.profile` (intolleranze, obiettivo, preferenze).
4. **Totalizzatore giorno con feedback range ±10%**: utente vede in tempo reale se le sostituzioni lo portano dentro/fuori target (es. 1905 KCAL / 2326 target → SOTTO TARGET arancio). Macro split ignorato per ora (solo confronto kcal totali).
5. **Salto reversibile**: card saltata mostra "↺ ANNULLA" al posto di SALTO → tap riattiva slot. Persistenza localStorage.
6. **Precedenza badge**: ACCEPTED > SKIPPED > SUBSTITUTED. Un pasto accettato non può essere sostituito né saltato (è già in DB tab Oggi, sostituirlo creerebbe duplicato).
7. **Card stato "0/7 GIORNI SEGUITI" NON SI TOCCA**: resta a 0 finché AI vera non genera piano in Step F. I pasti demo non contano come "piano seguito".
8. **"pescetariano" (forma corretta etimologica italiana)** ovunque nei reasoning. Era "pescatariano" (anglicismo) nei mock C.3.
9. **Icon system custom rimandato a sessione dedicata post-I**: emoji classiche (📅 ecc.) non funzionano col design minimal Syne+Mono. Da rifare con SVG monocromatici geometrici + lettering tipografico Syne ingrandito.
10. **`dbAddMeal()` accetta solo data corrente** (`ST.activeDay` hardcoded): pasti demo accettabili solo per il giorno corrente. Tap ACCETTA su giorno futuro/passato → toast informativo. **TODO Step F**: helper `dbAddMealForDate(meal, date)` o override temporaneo `ST.activeDay`.
11. **Bottom sheet alternative vs modal full-screen**: pattern iOS standard con max-height 85vh e handle bar visibile, sale dal basso 240ms cubic-bezier `.16,1,.3,1`. Coerente con overlay principale ma più piccolo per non bloccare contesto.
12. **Opzione A SALTO** (card visibile barrata vs nascondere): card resta visibile con line-through + opacity 0.65 + badge. Motivazione: utente continua a vedere cosa avrebbe dovuto mangiare, no confusione "il pasto è sparito".

#### Nuove costanti globali introdotte Step C

```javascript
// Mappatura slot demo (Step A schema weekly_plan_meals CHECK) → slot legacy UI meals
const SLOT_MAP_DEMO_TO_LEGACY = {
  colazione: 'colazione',
  spuntino:  'snack_mattina',
  pranzo:    'pranzo',
  merenda:   'snack_pomeriggio',
  cena:      'cena',
};
// Esposta globalmente per riuso Step F (writer AI piano → meals)
```

#### Nuove funzioni globali Piano V4 Step C

| Funzione | Scopo |
|---|---|
| `_pianoV4GetDemoMeals(dayOfWeek)` | 5 pasti demo hardcoded (uguali per ogni giorno in C.3, differenziati in Step F) |
| `_pianoV4GetAlternatives(originalSlot)` | 3 alternative dimostrative per slot (15 totali) |
| `_pianoV4GetMealForCard(originalMeal, weekOffset, dayOfWeek)` | Ritorna pasto effettivo (originale o alternativa scelta) |
| `_pianoV4CalculateDate(weekOffset, dayOfWeek)` | ISO YYYY-MM-DD DST-safe (`setHours(12)` + `toISOString().slice(0,10)`) |
| `_pianoV4FormatDayHeader(weekOffset, dayOfWeek)` | "LUN 18 MAG 2026" caps Mono + numero + mese + anno |
| `renderPianoV4DayOverlay()` | Render overlay completo (header + banner + totalizer + meals list) |
| `renderPianoV4DemoBanner()` | Banner "ESEMPIO DIMOSTRATIVO" sand+giallino |
| `renderPianoV4DayTotals(meals)` | Totalizzatore giorno con feedback range ±10% + counter saltati |
| `renderPianoV4MealsList(meals)` | 5 card pasto con badge condizionali + bottoni stato-aware |
| `openPianoV4DayOverlay(dayOfWeek)` | Apertura overlay con snapshot weekOffset |
| `closePianoV4DayOverlay()` | Dismissing 200ms + cleanup state + DOM remove |
| `acceptPianoV4DemoMeal(mealId)` | ACCETTA: dbAddMeal + cache + localStorage + re-render. Cerca in demo originali poi in alternative |
| `openPianoV4SubstituteSheet(slot)` | Apertura bottom sheet alternative |
| `closePianoV4SubstituteSheet()` | Dismissing bottom sheet |
| `renderPianoV4SubstituteSheet()` | Render bottom sheet con 3 alternative + reset button |
| `applyPianoV4Substitution(altId)` | Apply: localStorage + toast + re-render (sentinel `'__reset__'` per torna-originale) |
| `togglePianoV4SkipMeal(originalSlot)` | Toggle salto con guard accettato |
| `_pianoV4IsDemoAccepted(...)` / `_pianoV4MarkDemoAccepted(...)` | Read/write localStorage stato accettazione |
| `_pianoV4GetActiveSubstitution(...)` / `_pianoV4SetActiveSubstitution(...)` | Read/write sostituzione attiva (null = removeItem) |
| `_pianoV4IsSlotSkipped(...)` / `_pianoV4SetSlotSkipped(...)` | Read/write stato salto (false = removeItem) |

#### Schema namespace localStorage Piano V4

```
zona_pianov4_demo_accept_{userId}_w{N}_d{N}_{demoMealId}  // '1' se accettato
zona_pianov4_demo_subst_{userId}_w{N}_d{N}_{slot}         // altId scelto
zona_pianov4_demo_skip_{userId}_w{N}_d{N}_{slot}          // '1' se saltato
```

Scope: per `userId + weekOffset + dayOfWeek + slot/mealId`. Indipendente tra giorni e settimane. Persistenza locale solo per pasti demo; in Step F migra a `weekly_plan_acceptance.status` Supabase quando AI vera genera piano.

#### Stato persistenza azioni demo

- **ACCETTA**: scrittura `meals` Supabase (slot tradotto via `SLOT_MAP_DEMO_TO_LEGACY`) + cache locale `getDay().meals.push` + `saveCache()` + flag localStorage `accept`
- **SOSTITUISCI**: solo flag localStorage `subst` (altId per slot)
- **SALTO**: solo flag localStorage `skip` (boolean per slot)
- **Step F TODO**: migrazione a `weekly_plan_acceptance.status` Supabase quando AI vera genera piani reali

#### Bug fix conoscitivi Step C

- **C.4.1 / C.4.2** (root cause documentato): schema `meals` Supabase NON ha CHECK constraint su `slot`, quindi accetta qualsiasi stringa. `weekly_plan_meals` (Step A) ha invece CHECK rigoroso. **In Step F la mappatura slot demo→legacy va applicata ovunque si scriva su `meals` partendo da dati `weekly_plan_meals`**.
- **C.5**: target kcal letto da `ST.TARGET?.kcal` con fallback 2326. Macro split ignorato (solo confronto kcal). **Step F potrà aggiungere feedback range anche su macro singoli** (es. carbo sotto target).
- **C.6**: `togglePianoV4SkipMeal` ha guard pasto accettato. **Step F TODO**: valutare se salto deve avere reasoning utente ("perché lo salti?") per allenare l'AI a non riproporre.

### 20 maggio 2026 pomeriggio — Sessione 2 / Step B: UI Tab Piano v4 vista principale ✅

Chiusura completa della 2ª sessione roadmap Tab Piano v4 in **7 commit sequenziali** sullo stesso branch worktree (`claude/loving-tu-e5fe3e`), ognuno con push diretto a `origin/main` + sync repo Mac + smoke test telefono. Workflow design+code in catena con iterazione visiva immediata sul feedback Ignazio.

**Catena commit Sessione 2 / Step B**:
- `272e375` — B.1 scaffolding (feature flag + routing + header v3 + nav settimane + helper data) · APP_VERSION `v2026.05.20 · 14:49`
- `d03c0fa` — B.2 card stato `ATTIVO 0/7` + barra 7 segmenti + 7 card giorno dashed + badge OGGI · `v2026.05.20 · 15:06`
- `f160a1b` — B.2.1 polish (card stato sand `#FDF7E8` + badge OGGI sinistra ingrandito + min-height card giorno 64px) · `v2026.05.20 · 15:16`
- `649502f` — B.3 card Memoria AI paper-cream + card peso sparkline placeholder + CTA disabled · `v2026.05.20 · 15:26`
- `24b300f` — B.3.1 source peso unificata `getLatestBodyData()` + disabled tratteggiato grigio + Memoria AI bone + bordo top giallino `var(--mod-nutrition)` · `v2026.05.20 · 15:37`
- `bcd3d42` — B.4 profile compatto grid 2×2 + hint contestuali card stato (corrente/passata/futura) · `v2026.05.20 · 15:53`
- `2984704` — B.4.1 fix tipografico classe modifier `.pianov4-profile-value--mono` su TARGET e MACRO · `v2026.05.20 · 16:01`

**Architettura introdotta**:
- **Feature flag `ST.pianoV4Enabled: true`** per rollback istantaneo da console: `ST.pianoV4Enabled = false; renderPage('piano')` → torna la vecchia tab Piano legacy intatta. Pattern di safety net per validazione tester progressiva
- **Routing branching** `renderPage('piano')`: `if(ST.pianoV4Enabled) renderPianoV4() else renderPiano()`. `renderPiano` legacy resta invariata e funzionante — rename a `renderPianoLegacy` rimandata a Step I (Sessione 9)
- **Nuova funzione `renderPianoV4()`** (~250 righe HTML+CSS+logica) parallela a `renderPiano` legacy. State sessione: `ST.pianoV4WeekOffset: 0` (in-memory, non persistito tra reload)
- **3 helper utility nuovi**: `getPianoV4WeekStart(offset)` (Date lunedì ISO + offset settimane), `formatPianoV4WeekLabel(date)` ("Settimana del DD mmm YYYY"), `getPianoV4Days(weekStart)` (array 7 oggetti `{name, dateLabel, isToday}`)

**6 blocchi visivi della vista principale** (top→bottom):
1. **Accent bar `#FAC775` + header v3** (eyebrow data Mono caps + Syne 800 "Nutrition" + avatar IF) + **sub-nav pillole** con PIANO attiva (riusa classi `.oggi-v3-*` esistenti, coerenza con Oggi/Integratori/Analisi)
2. **Nav settimane `‹ ›`** con label `Settimana del DD mmm YYYY` in formato italiano, frecce cliccabili che modificano `ST.pianoV4WeekOffset` (positivo futuro, negativo passato, nessun limite di range in B.x)
3. **Card stato** sand `#FDF7E8` (riuso "spazio coach" da `.oggi-v3-coach-card` Oggi) con badge `ATTIVO` attenuato (grigio chiaro con bordo, no bugia visiva "verde pieno" con piano vuoto), contatore `0/7`, barra 7 segmenti grigi (classi `.filled`/`.partial`/`.missed` predisposte per Step F futuro), **hint contestuale 3 stati**: offset 0 → "Il tuo primo piano arriverà domenica sera.", offset <0 → "Settimana archiviata · nessun piano registrato.", offset >0 → "Piano in arrivo · sarà generato domenica sera."
4. **7 card giorno dashed** `LUNEDÌ→DOMENICA` con data sotto formato "DD mmm" + **badge OGGI** evergreen `#2A7A6F` a sinistra del nome (font 10px tabular-nums, padding 3/7px) solo se il giorno corrente è incluso nella settimana visualizzata. Non cliccabili in B.x (tap arriva Step C). `min-height: 64px` per respiro
5. **Card Memoria AI** bone con `border-top: 2px var(--mod-nutrition)` (filo conduttore visivo che lega accent bar in cima e Memoria AI in fondo), eyebrow warm gold `#8B6B1E` (riuso colore `.oggi-v3-coach-eb`), CTA `VEDI TUTTE ›` placeholder grigio cursor:default, messaggio italic invitante "Il coach inizierà a memorizzare..." (empty state non sembra rotto, comunica comportamento atteso)
6. **Card peso flessibile** `PESO · FLESSIBILE` + modalità tracking inline (mappa `daily/every3/weekly/flexible` → `OGNI GIORNO/3 GIORNI/SETTIMANA/LIBERO`), numero JetBrains Mono 32px tabular da `getLatestBodyData()` con fallback `ST.profile.weight_kg` (stessa source dell'header globale → coerenza source-of-truth verificata su screenshot), `.toFixed(1)` (header `.XX`, card hero v4 `.X`), sparkline SVG `viewBox="0 0 120 40"` con linea tratteggiata grigia placeholder + testo "Inizia a pesarti per vedere il trend", CTA `+ PESATI ORA` outline tratteggiato grigio chiaramente disabilitato (bordo dashed `var(--b1)` + color `var(--t3)` + opacity 0.4 — pattern più chiaro di solo opacity su iOS Safari)
7. **Profile compatto** grid 2×2 con eyebrow `IMPOSTAZIONI · PIANO` + CTA `MODIFICA ›` evergreen che apre `openSettingsModal()` **esistente** (no nuovo modal), 4 celle: OBIETTIVO (mapping leggibile primo valore CSV `profile.obiettivo` — es. "Ricomposizione"), TARGET (`fmtNum(ST.TARGET.kcal) + ' kcal'`), MACRO % (preferisce `ST.TARGET.pCarbo/pProt/pFat` dinamici, fallback calcolo grammi 4/4/9), PESO modalità (riuso mappa card peso B.3). Overflow ellipsis su value per gestire stringhe lunghe

**Stato D1 (settimana 1 onboarding, no dati reali)**:
- Nessun fetch Supabase su `weekly_plans` / `ai_memory` / `weight_logs` (tabelle Step A esistono ma vuote — sarebbe spreco network)
- Contatore `0/7` hardcoded, badge `ATTIVO` attenuato, sparkline placeholder, CTA peso disabled
- Logica reale arriva in Step C (interazioni), D (modal peso), F (Worker AI piano generation), G (memoria + adattamento), H (integrazione bidirezionale Oggi)

**Regola tipografica v2 rispettata**:
- Numeri in **JetBrains Mono**: contatore stato `0/7`, peso card 32px, TARGET `2.326 kcal`, MACRO `38·34·28` (mod fix B.4.1 con classe modifier `.pianov4-profile-value--mono`)
- Testi in **Syne**: titolo "Nutrition", OBIETTIVO "Ricomposizione", PESO "Libero", hint contestuali, empty state Memoria AI
- Pattern modifier `--mono` riusabile per futuri valori numerici

**Workflow di sessione (lezione operativa)**:
- 7 commit progressivi con deploy istantaneo + smoke test telefono dopo ognuno + iterazione sul feedback visivo Ignazio
- Card Memoria AI ridisegnata 3 volte: paper-cream `#F8F4EB` (B.3) → confusione visiva con card stato sand → bone + bordo top giallino (B.3.1 fix definitivo)
- Card peso ricontrollata su screenshot iPhone (B.3.1): mostrava `71.8` mentre header globale `71.55` → unificata source via `getLatestBodyData()`
- Disabled state: opacity 0.45 (B.3) → percepito "ancora attivo" su iOS Safari → pattern tratteggiato grigio (B.3.1)
- Hint card stato: messaggio fisso "primo piano domenica sera" (B.2) → fuorviante navigando settimane future → branching contestuale 3 stati (B.4)
- Tipografia 4 celle profile: tutte Syne (B.4) → numeri non allineati con resto app → classe modifier `--mono` su TARGET/MACRO (B.4.1)

**Decisioni di design emerse durante la sessione** (oltre alle 12 Round 1+2 design):
- Sand `#FDF7E8` card stato = riuso "colore spazio coach" `.oggi-v3-coach-card` per coerenza visiva
- Paper-cream `#F8F4EB` Memoria AI scartato per confusione → bone + accent giallino top
- Badge OGGI: sinistra + 10px (vs 9px iniziale) + padding 3/7px per scansione veloce
- Disabled state pattern: tratteggiato grigio (`var(--b1)` dashed + color `var(--t3)`) invece di opacity attenuata — più chiaro su iOS Safari
- Hint contestuale settimana: 3 stati per `ST.pianoV4WeekOffset` (0/<0/>0)
- Source-of-truth peso: SEMPRE `getLatestBodyData()` come header globale (no `ST.profile.weight_kg` diretto — disallineato in caso di pesate body più recenti)
- Filo conduttore visivo `var(--mod-nutrition)` `#FAC775`: accent bar header + bordo top Memoria AI

**Vincoli rispettati**:
- Schema Supabase invariato (no modifiche post Step A)
- `renderPiano` legacy intatta e funzionante (rollback console testato)
- Tab Oggi/Integratori/Analisi nessuna regressione visiva
- `getLatestBodyData()`, `openSettingsModal()`, `fmtNum()`, `esc()` riusate esistenti
- Nessuna fetch Supabase aggiunta (stato D1 hardcoded come da design)

**APP_VERSION finale Sessione 2 / Step B**: `v2026.05.20 · 16:01`

**Prossima sessione — Step C**: Overlay Dettaglio Giorno (slide-up 240ms `cubic-bezier(.16,1,.3,1)` riusando pattern `daydetail-overlay` di Analisi v3). Tap su card giorno → overlay fullscreen con pasti proposti AI per quel giorno + box italic "PERCHÉ TI PROPONGO QUESTO" sotto ogni pasto + 3 azioni ACCETTA (scrive in `meals` tab Oggi via `dbAddMeal`) / SOSTITUISCI (placeholder V1) / SALTO (marca `weekly_plan_acceptance.status='skipped'`). Pausa per validazione tester prima di iniziare.

### 20 maggio 2026 mattina — Sessione 1 / Step A: Fondazione dati Supabase Tab Piano v4 ✅

Prima sessione di implementazione del Tab Piano v4 dopo la chiusura design 19 mag. Sessione interamente lato Supabase (zero modifiche a `zona-tracker.html`), eseguita manualmente da Ignazio nello SQL Editor in 7 blocchi sequenziali con verifica visiva post-ogni-blocco e smoke test finale.

**5 nuove tabelle create**:
- `weight_logs` — pesate flessibili Livello 1, UNIQUE (user_id, date), upsert mattutino, alimenta sparkline 30gg
- `ai_memory` — memoria AI con confidence/evidence_count/last_observed/active per soft-expire preferenze stale >90gg, CHECK su category
- `weekly_plans` — contenitore piano settimanale, snapshot target nutrizionali, status draft→active→archived
- `weekly_plan_meals` — pasti veri proposti dall'AI, day_of_week 1-7 ISO, CHECK su slot allineato tab Oggi, user_id denormalizzato per RLS perf
- `weekly_plan_acceptance` — tracking azioni utente, status 4 valori, actual_meal_id ON DELETE SET NULL (relazione laterale preserva storico), notes per debug AI

**Update `profiles`**: 3 colonne NOT NULL DEFAULT auto-applicate a tutti i tester esistenti:
- `plan_generation_day` default `'sun'`
- `plan_generation_time` default `'20:00'`
- `weight_tracking_mode` default `'flexible'`

**Asset totali Step A**: 5 tabelle nuove · 6 indici · 25 policy RLS (4 `own_*` + 1 `admin_read_all_*` per ognuna) · 6 CHECK constraint · 3 colonne aggiunte a `profiles`.

**Decisioni architetturali documentate**:
1. `weight_logs` separata da `body_logs` — pesate frequenti vs check M2 mesociclo (un evento ≠ una tabella, query sparkline più pulite, dati senza rumore)
2. `ai_memory` schema completo (non minimale) — decisioni DB-side ordinabili senza chiamare AI a ogni open di Piano tab, last_observed per soft-expire
3. `weekly_plan_acceptance` status unico 4 valori (non 2 campi user_action+outcome separati) — query contatore semplici, principio "non risolvere problemi non ancora esistenti"
4. `actual_meal_id` ON DELETE SET NULL invece di CASCADE — relazione laterale non figlio-padre stretta, preserva storico contatore settimana se utente elimina pasto in tab Oggi
5. `NOT NULL DEFAULT` ovunque possibile su profiles — invariant difesi al livello più basso (DB) anziché spalmati nel codice JS
6. CHECK constraint su tutti i set finiti di valori — guard rail contro typo Worker AI (es. "Pranzo" vs "pranzo", "snack" inventato)

**Verifica finale eseguita** via `step-a-07-verify.sql` (smoke test riusabile in futuro):
- ✅ 5 tabelle presenti in `information_schema.tables`
- ✅ `rowsecurity = true` su tutte e 5 in `pg_tables`
- ✅ 5 policy per tabella in `pg_policies` (25 totali)
- ✅ 3 nuovi campi `profiles` con default applicati

**Prossima sessione — Step B**: UI Tab Piano vista principale v4 (refresh `renderPiano` legacy → `renderPianoV4` design system v3, card stato "X/7 giorni seguiti", 7 card giorno, sezione Memoria AI, card peso flessibile con sparkline, navigazione settimane).

### 19 maggio 2026 — Design completo Tab Piano v4 Coach Attivo (2 round Claude Design) ✅

Sessione di design completa per il refresh dell'ultima tab Nutrition ancora legacy. **Nessun codice scritto oggi** — sessione interamente di design + decisioni architetturali. Implementazione pianificata in 9 sessioni sequenziali a partire dal prossimo task (Sessione 1 — Step A: fondazione dati Supabase).

- **Cambio di paradigma**: da pagina "consultazione setup statica" (legacy: target 40·30·30, piano AI textarea, priorità cliniche) → **coach attivo settimanale evolutivo**. Il piano gira UNA volta a settimana, l'AI propone, l'utente decide. Memoria progressiva delle preferenze, trend peso flessibile per piccole correzioni, check M2 ogni 4 settimane per adattamenti sostanziali.
- **5 schermate hi-fi chiuse** con Claude Design:
  1. Tab Piano vista principale (header settimana + card stato X/7 + 7 card giorno + Memoria AI scheda paper-cream + card peso + profile compatto)
  2. Dettaglio Giorno overlay (pasti proposti + box italic "PERCHÉ TI PROPONGO QUESTO" + 3 azioni ACCETTA/SOSTITUISCI/SALTO)
  3. Welcome overlay domenicale (sostituisce notifica push iOS — diff card "Adattamento proposto")
  4. Modal "Pesati ora" (bottom sheet stepper +/−0.1kg + tap numero per keyboard iOS)
  5. Banner reminder pesata (solo tab Oggi, ≥14gg, anti-nag 48h/7gg/28gg)
- **12 decisioni di design chiuse** (Round 1: 6 + Round 2: 6):
  1. Giorno generazione piano: switch VEN/SAB/DOM + PERSONALIZZATO (default DOM 20:00)
  2. Contatore "X/7 giorni seguiti": premia aderenza nutrizionale (zona macro), non obbedienza letterale
  3. Memoria AI: top 4-5 preferenze più salde + CTA "VEDI TUTTE ›" per lista completa
  4. Bottone RIGENERA: solo giorni futuri, passato fisso come riferimento storico
  5. Settimana 1 onboarding: piano AI subito al termine M1 + tag "Costruito su M1, si raffinerà"
  6. Card peso D1: visibile con sparkline vuota + messaggio invito (no nascondere)
  7. Modal peso: stepper +/−0.1kg + tap numero per keyboard iOS (combinazione)
  8. Trend chart sparkline: statico in V1, no interattività
  9. Banner reminder pesata: solo tab Oggi (anti-invadenza, Piano resta "calmo")
  10. Adattamento AI nutrition: inserito in welcome overlay domenicale come diff card
  11. Onboarding M1 estensione 2 nuove preferenze: TRATTENUTO per sessione dedicata futura
  12. Notifiche push iOS PWA: NON in V1 (Opzione 3 scelta, welcome overlay domenicale sufficiente)
- **Architettura "check fisici a 2 livelli"** introdotta:
  - **Livello 1 — Peso flessibile on-demand**: utente sceglie modalità (giorno/3gg/settimana/libero), trend peso entra in `weight_logs` Supabase, AI legge trend per piccole correzioni settimanali, reminder gentile banner se ≥14gg senza pesata
  - **Livello 2 — M2 check completo ogni 4 settimane (mesociclo)**: già esistente, guida adattamento sostanziale piano nutrition + training mesociclo successivo
- **Decisione implementazione**: **Opzione 3** scelta da Ignazio = tutto tranne notifiche push iOS. Welcome overlay domenicale al primo apertura app nel giorno scelto sostituisce la notifica push (taglio strategico per evitare complessità PWA push su iOS Safari).
- **Roadmap 9 sessioni sequenziali pianificate** (Step A→I): deploy in produzione tra ogni sessione per validazione progressiva con tester. Vedi sezione "Tab Piano v4 — Visione + Roadmap" per dettaglio completo.
- **Onboarding M1 estensione 2 nuove preferenze** (giorno+ora generazione piano + modalità tracking peso): TRATTENUTO per sessione dedicata futura DOPO Tab Piano v4 v1. Per ora default DOM 20:00 + tracking flessibile 14gg, modificabili dal modal impostazioni profilo.

### 18 maggio 2026 pomeriggio — Refresh tab Storico → Analisi v3 (dashboard analitica) ✅

Refresh totale della 3ª tab Nutrition con cambio di paradigma e cambio di nome. Mockup hi-fi chiuso con Claude Design (3 schermate: Vista Settimana, Vista 6 Mesi, Dettaglio Giorno drilldown). Implementazione completa in catena con Claude Code. Deploy live `v2026.05.18 · 17:04`. Commit `09a2775`.

- **Cambio di paradigma**: da lista cronologica passiva ("Storico") a dashboard analitica di tendenze nutrizionali ("Analisi"). Il dettaglio giornaliero ora vive nel drilldown overlay invece di occupare la pagina principale.
- **Cambio di nome**: Storico → Analisi (sub-nav Nutrition: OGGI · INTEGRATORI · ANALISI · PIANO). DOM `#page-storico` → `#page-analisi`, alias retrocompat in routing per cache PWA stale.
- **Switch finestra temporale 4 pillole sticky**: SETTIMANA · MESE · 3 MESI · 6 MESI (ANNO scartato in chiusura design come troppo lungo per il caso uso reale).
- **3 stat card grandi**: media kcal/die, giorni in zona, pasti media/die. Confronto "vs prec." SOLO in SETTIMANA (su finestre lunghe è poco informativo).
- **3 grafici SVG custom scritti a mano** (decisione "B" chiusa in design: no librerie esterne tipo Chart.js/Recharts):
  - Chart kcal: area gradient evergreen + linea reale + linea target tratteggiata + dot cliccabili + dot vuoto+dashed su "oggi" + asta terracotta su giorni con extras
  - Heatmap status zona: verde/ambra/terracotta/grigio. Layout SETTIMANA 7 in riga, MESE 7×5 calendario, 3M/6M mini-griglie mensili impilate verticalmente (NON affiancate — più leggibili su mobile)
  - Macro bars: 3 barre orizzontali C/P/G con valori grammi + percentuali reale vs target + tick tratteggiato sul target
- **Target macro percentuali letti DINAMICAMENTE dal profilo utente** (fix critico in chiusura): es. Ignazio 38/34/28, non più hardcoded 40/30/30. Fallback 40/30/30 Zone classica se profilo manca. Tolleranza "in zona" ±2% (severa per dashboard), "quasi zona" ±5%.
- **Drilldown "Dettaglio Giorno"** overlay slide-up 240ms `cubic-bezier(.16,1,.3,1)`: header banda `#FAC775` + back + titolo data + kebab `···` SOLO per giorni settimana corrente. Sezioni: riepilogo status zona + kcal + delta target + macro bars; timeline read-only riusando pattern tab Oggi v3 senza interazioni. Tap "Modifica giorno" da kebab → `goToDay(date)` (naviga tab Oggi per editing).
- **Dati**: tutti calcolati client-side da `ST.db.days` cache locale (decisione "B" chiusa in design — nessuna query Supabase nuova).
- **Refresh strategy**: ridisegno totale dei grafici a ogni interazione (decisione "A" chiusa in design — no cache complessa, no invalidazione granulare).
- **Empty state onesto**: nota "DATI PARZIALI · N/X GIORNI" sopra le stat card quando giorni con dati < giorni della finestra (decisione "A" chiusa in design — mostra sempre tutto, non nasconde la realtà).
- **4 dubbi residui chiusi in design**: heatmap 6 MESI mini-griglie impilate verticalmente, dati parziali con nota onesta, linea target con marker "TGT 2326", kebab modifica visibile solo settimana corrente.
- **5 cambi finali rispetto al mockup iniziale**: 6 MESI invece di ANNO; target dinamici invece hardcoded; "vs prec." solo in SETTIMANA; heatmap 3M/6M impilate verticali; tolleranza zona ±2/±5 (più stretta di tab Oggi v3 per appropriatezza dashboard).
- **18 funzioni nuove**: `_analisiGetWindowRange`, `_analisiGetWindowLabel`, `_zoneStatusForDayKey`, `_analisiCollectDays`, `_analisiAggregate`, `_analisiRenderAreaChart`, `_analisiRenderHeatmap`, `_analisiRenderMacroBars`, `renderAnalisi`, `renderAnalisiShell`, `renderAnalisiContent`, `setAnalisiWindow`, `setAnalisiDateOffset`, `openDayDetailScreen`, `renderDayDetailScreen`, `closeDayDetailScreen`, `dayDetailToggleMenu`, `dayDetailModifyTap`.
- **Funzioni marcate legacy `[LEGACY-STORICO-V3]`** (preservate fino a verifica produzione, rimuovere in cleanup separato): `renderStorico` → `renderStoricoLegacy`, `setReportRange` no-op, CSS `.storico-extra-tag`, alias `'storico'` in routing.
- **State esteso**: `ST.analisi = { window:'SETTIMANA', dateOffset:0 }`, `ST.dayDetailScreen = null`.
- **+985 righe nette** (zona-tracker.html da 14.392 → 15.362 righe).
- **Testato su iPhone**: switch finestra, nav date, drilldown giorni passati read-only (kebab nascosto), drilldown giorno settimana corrente con kebab "Modifica" funzionante. Tutto produzione-ready.

### 18 maggio 2026 — Step 2 modulo Integratori: flusso "Registra Extra" ridisegnato come eventi mordi-e-fuggi ✅

Sostituzione architetturale completa del flusso "Registra Extra". Stato precedente (deploy `v2026.05.16 · 21:56`): gli extras vivevano come righe persistenti in `supplements` con `slot` valorizzato → bug "gruppi fantasma" 08:00 nel bottom sheet `+ Registra integratori` e in timeline tab Oggi. Stato nuovo: gli extras sono EVENTI MORDI-E-FUGGI in `supplements_log` con flag `is_extra=true`, niente persistenza in `supplements`. **APP_VERSION**: `v2026.05.18 · 15:06`. **Commit**: `306defe`.

Pacchetti e extras sono ora mondi separati e indipendenti (decisione architetturale confermata 16 mag sera, implementata 18 mag).

**SQL Migrazione** (eseguito su Supabase prima del codice):
- `supplements_log` esteso con 9 colonne: `is_extra boolean default false`, `supplement_codice text`, `dose numeric`, `dose_unit text`, `kcal numeric default 0`, `carbo`, `proteine`, `grassi`, `costo`
- 2 indici: `idx_supplements_log_extra` su `(user_id, is_extra)` parziale `WHERE is_extra=true`, `idx_supplements_log_date_extra` su `(user_id, date, is_extra)` per query timeline
- Cleanup totale fantasmi: `DELETE FROM supplements WHERE id NOT IN (SELECT supplement_id FROM supplement_package_items)` — globale per tutti gli utenti, sicuro perché i pacchetti reali sopravvivono e lo storico assunzioni in `supplements_log` referenzia `supplement_name` (text) non `supplements.id`
- Snapshot fields immutabili: macro/dose/costo salvati nella riga `supplements_log` al momento dell'insert (no JOIN runtime su `nutrilite_catalog`, storico onesto anche se il catalogo cambia in futuro)

**Schermata Conferma Extra fullscreen** (nuova):
- Entry: bottom sheet `+ Registra integratori` tab Oggi → tap card `Singolo · Fuori schema` → `openCatalogForRegisterExtra()` apre catalogo in modalità `registerExtra` → seleziona N prodotti → CTA `Aggiungi N prodotti` → `openConfirmExtraScreen(codici)` slide-up
- Header banda `#FAC775`: `‹ INDIETRO` + `"Registra extra"` + `REGISTRA` disabled se 0 prodotti
- Eyebrow mint `"EVENTO MORDI-E-FUGGI · NESSUNA CONFIG. SALVATA"` (claim ontologico)
- Titolo Syne 800 24px `"Conferma dose & orario"` + sub Syne 13px + counter Mono caps `"N PRODOTTI SELEZIONATI"`
- Card per prodotto: thumb 48×48 tinted via `getCatalogTint`, nome Syne 600, meta caps `"CATEGORIA · dose default"`, stepper DOSE `−/+` + select unità (cps/stick/barretta/misurino), ORARIO Mono 700 24px + `MODIFICA ›` chip, bottone `× RIMUOVI` rosso `#C44434` in fondo card
- Default smart: dose = `dose_die` del catalogo, orario = ora corrente al momento apertura
- Pattern Mail iOS undo 4s per rimozione card: card sparisce, strip nero `"Rimosso · ANNULLA"` 36px per 4s, poi commit definitivo
- Empty state: emoji 📦 + `"Nessun prodotto da registrare"` + CTA `"‹ Torna al catalogo"`
- Back con conferma se dirty (dose/orario modificati o card rimosse), silent se pulito. Selezione catalogo preservata
- CTA sticky bottom evergreen `"REGISTRA N EXTRA"` invariabile (decisione design — riduce rumore plurale/singolare)
- Submit: insert N righe in `supplements_log` con macro/costo scalati per ratio `dose / dose_die catalogo` (snapshot immutabile). Reset catalog selection + close screens + reload `ST.extras` + re-render tab Oggi
- Toast undo Mail iOS 4s post-submit (`#cextra-undo-toast` z-index 2100): `"N EXTRA REGISTRATI · ANNULLA"` → tap entro 4s → DELETE cascade su tutti gli ID inseriti

**Timeline tab Oggi ridisegnata** (case `extra` in `renderOggi`):
- Eyebrow: `"PIANIFICATI · REGISTRATI"` → `"PASTI · PACCHETTI · EXTRA · IN ORDINE CRONOLOGICO"`
- `tlExtraEvents` da `ST.extras.filter(x => x.date === ST.activeDay)` mergiati con pasti + pacchetti, sort cronologico per slot
- Card extra `.oggi-v3-event`: thumb 36×36 tinted via `getCatalogTint` (lookup catalogo via `supplement_codice` o `supplement_name`), nome Syne 600 14px, meta Mono 10px `"{kcal} KCAL · {dose} {UNIT}"` + macro inline `kcal → C → P → G` ("tutte o nessuna" se ≥1 > 0), tag `EXTRA` Mono caps 9.5px mint `#E6F4F2` evergreen `#2A7A6F`
- Niente check ✓ (l'evento È la registrazione)
- Tap card → modal conferma elimina (info-modal-overlay z-index 1600) → DELETE riga `supplements_log`
- Macro extras conteggiate in `dayTotals` via `_extrasV3Totals(day)` (limitato a `ST.activeDay`)

**Tab Storico minimal patch** (decisione esplicita design):
- Tag `EXTRA ×N` Mono caps 8.5px tracking 1.4 mint+evergreen accanto alla data della card giorno attivo (today) se `ST.extras.length > 0`
- Niente restyle tab Storico — refresh completo Storico v3 in giro futuro

**Animazioni transizione catalogo → conferma extra**:
- Slide-up overlay 280ms `cubic-bezier(.16,1,.3,1)` via `@keyframes cextraSlideUp`
- Card prodotto stagger 40ms `animation-delay` × `@keyframes cextraCardIn` 240ms (prime 3 visibili)
- Banda `#FAC775` persistente continuità modulo Nutrition (catalog → conferma)
- Back: slide-down 220ms `@keyframes cextraSlideDown` via `.dismissing` class
- CTA REGISTRA `:active` scale .98 100ms

**Pattern undo Mail iOS in 3 punti**:
1. Rimozione card singola in Conferma Extra (4s)
2. Registrazione post-submit (4s toast bottom)
3. Eliminazione extra dalla timeline (modal conferma esplicito, non undo timer)

**Decisioni in autonomia**:
- Schema colonne `date`/`slot` (NON `log_date`/`log_time` come SQL del brief) — adattato Step 1 prima di mostrare SQL
- `_extrasV3Totals` limitato a `ST.activeDay` (storico passato non carica `ST.extras` per ogni giorno, futuro estendibile)
- Tag Storico solo su card giorno attivo (layout legacy aggrega, no point di drop per righe individuali)
- Funzioni legacy "Singolo" (`setSuppSheetMode('singolo')` + render legacy + search/save) restano dormienti — non più chiamate, da pulire in cleanup separato

**Numeri finali**:
- +590 righe nette
- 22 funzioni nuove (`loadExtras`, `dbInsertExtraLog`, `dbDeleteExtraLog`, `openConfirmExtraScreen`, `closeConfirmExtraScreen`, `cextraBack`, `_cextraIsDirty`, `renderConfirmExtraScreen`, `_renderCextraCard`, `confirmExtraScreenSet`, `confirmExtraScreenAdjust`, `confirmExtraScreenEditTime`, `confirmExtraScreenRemove`, `confirmExtraScreenUndoRemove`, `confirmExtraScreenSubmit`, `_cextraShowUndoToast`, `_cextraDismissUndoToast`, `cextraUndoToastClick`, `confirmDeleteExtraFromTimeline`, `cancelDeleteExtraFromTimeline`, `doDeleteExtraFromTimeline`, `openCatalogForRegisterExtra`, `_extrasV3Totals`)
- Modifiche a 6 funzioni esistenti (`dayTotals`, `goToCatalogStep2`, `renderOggi`, `renderStorico`, `openSuppSheet` HTML card "Singolo", `loadAndStart`+`refreshInBackground` bootstrap hooks)
- Nuovo blocco CSS "CONFERMA EXTRA V3" + classi `.cextra-*`, `.oggi-v3-event*`, `.storico-extra-tag`

**Modulo Integratori v3 ora completo in tutte le sue parti** (Blocco 1 pacchetti + Blocco 2 catalogo + Step 2 extras). Tab Integratori + flusso Conferma Extra + timeline tab Oggi tutti production-ready su design system v3 (Syne + JetBrains Mono + bone `#F5F3EE` + accent `#FAC775`).

### 16 maggio 2026 sera (post 20:31) — Refinement Integratori v3 + cleanup legacy ✅

Tre commit incrementali di rifinitura/pulizia dopo la chiusura del primo round documentale (`b9ecd32`). Tutti su `zona-tracker.html`, nessuna modifica DB. **APP_VERSION finale**: `v2026.05.16 · 21:56`.

**Fix A — Bottone ELIMINA pacchetto vuoto persistito** (commit `73d141b`, `v2026.05.16 · 21:14`)

Bug: il bottone `ELIMINA PACCHETTO` era condizionato a `if(!isCreate)` E annidato dentro l'else di `itemsCount === 0`, quindi non compariva per pacchetti già persistiti in DB ma svuotati di tutti i prodotti (es. pacchetto "Prova" residuo da test 16 mag, o pacchetti migrati senza item). Workaround forzato via SQL diretto.

Fix:
- CTA estratta dall'else branch di `itemsCount === 0`, posizionata dopo l'intero if/else
- Condizione cambiata da `!isCreate` a `e.packageId` — la presenza dell'id DB è la source-of-truth, non il mode CREATE/EDIT o il numero items
- L'empty state "PACCHETTO VUOTO" della lista prodotti resta invariato (cosa diversa: lista vuota vs pacchetto eliminabile)
- Commento esplicativo lasciato inline nel codice

**Cleanup legacy Blocco 1+2** (commit `0724a63`, `v2026.05.16 · 21:33`)

Pulizia metodica del codice marcato legacy dai commit del Blocco 1 + Blocco 2, dopo verifica produzione stabile. Stop su dipendenze inaspettate confermato dall'utente prima di procedere. **−366 righe nette**, **14 simboli rimossi**.

Rimossi (Blocco 1):
- `renderIntegratoriLegacy` (~177 righe del vecchio render)
- `setSuppFilter`, `suppDragStart` / `suppDragOver` / `suppDrop` / `suppDragEnd`, `toggleSuppExpand`
- `openAddSuppModal` / `closeAddSuppModal` / `saveNewSupp`
- HTML `<div id="add-supp-modal">` (~29 righe)
- Campi ST: `suppFilter`, `suppExpanded`
- Tutti i marker commento `// [LEGACY-INTEGRATORI-V3]`

Rimossi (Blocco 2):
- `toggleCatalogRemove`, `selectAllCatalog`
- Campo ST: `catalogToRemove`
- Guard `if(ST.catalogToRemove.includes(id)) return;` in `toggleCatalogItem`
- Reset in `openCatalogModal`
- Branch `hasRem` completo in `goToCatalogStep2` (~20 righe: check + filter toRemove + sezione "Da rimuovere" rendering)
- Blocco delete in `importFromCatalog` (~10 righe: confirm alert + loop `dbDeleteSupp`)
- Tutti i marker commento `// [LEGACY-CATALOGO-V3-BLOCCO2]`

**Conseguenza Opzione A**: `importFromCatalog()` è ora puramente additivo. Le eliminazioni di supplements vivono SOLO in Editor Pacchetto (`× Rimuovi dal pacchetto`) e Extra Editor (`Elimina dalla libreria`). Coerente con design v3 approvato dai mockup Claude Design.

**Falsi positivi salvati dall'audit pre-rimozione** (marker errati apposti al Blocco 1, NON cancellati):
- `updateSuppSlotTime` — è viva, chiamata da `renderOggi()` timeline tab Oggi v3 (input `type="time"` dell'header gruppo integratori per bulk update slot). Marker rimosso, sostituito con commento descrittivo.
- `ST.suppSheet` — è vivo, è lo state del bottom sheet `+ Registra integratori` tab Oggi v3 (`openSuppSheet` / `closeSuppSheet` + render del body con ~14 occorrenze attive).

**Bug fix eliminazione pacchetto in cascata** (commit `c28ef45`, `v2026.05.16 · 21:56`)

Bug rilevato post-deploy `v21:33`: eliminando un pacchetto via `ELIMINA PACCHETTO`, la riga `supplement_packages` veniva cancellata (CASCADE rimuoveva `supplement_package_items`), ma i record `supplements` linkati restavano in DB con `slot` valorizzato. Conseguenza: integratori fantasma raggruppati per slot nel bottom sheet `+ Registra integratori` della tab Oggi + extra fantasma in timeline.

Decisione architetturale confermata dall'utente: pacchetti e extra sono mondi separati e indipendenti. **Eliminare un pacchetto cancella anche TUTTI i suoi integratori dalla libreria**. Gli extras (ora `supplements_log` events con `is_extra=true`, Step 2 completato 18 mag) restano completamente intoccati — non vivono in `supplements`.

Fix `pkgEditorDoDelete()`:
- Raccoglie `suppIds` da `ST.packageEditor.items.map(it => it.supplement_id).filter(Boolean)`
- Bulk DELETE: `supa.from('supplements').delete().in('id', suppIds).eq('user_id', ST.user.id)` con error handling esplicito + toast warning + early return se fallisce (evita stati inconsistenti)
- Procede con DELETE `supplement_packages` (CASCADE rimuove `supplement_package_items` via FK)
- Error handling separato sulla seconda delete
- Sync in-memory: filtro `ST.supps` via `Set(suppIds)` + filtro `ST.packages`
- Re-fetch `loadSupps() + loadPackages()` per coerenza cross-device + ricalcolo totali (`suppMonthlyCost`, tile Home Nutrition)
- `saveCache()` prima della chiusura editor
- Toast con conteggio: `"Pacchetto eliminato (N integratori)"` se N>0, altrimenti `"Pacchetto eliminato"`

Cosa NON tocca:
- `supplements_log` (referenzia `supplement_name` text, no FK su `supplements.id` — lo storico assunzioni resta intatto)
- Gli extra (supplements non in nessun pacchetto, fuori dal blast radius)

### 16 maggio 2026 — Modulo Integratori v3: refresh hi-fi in 2 blocchi (production-ready) ✅

Refresh completo del modulo Integratori (Nutrition) coordinato da Claude Design ed eseguito da Claude Code in 2 blocchi sequenziali. Sostituisce la grafica legacy (lista raggruppata per slot + editing inline + bottoni custom) con un'architettura a **pacchetti** + un nuovo modal catalogo Nutrilite design-driven. La tab passa da 🟡 grafica legacy a ✅ production-ready.

**Blocco 1 — Tab Integratori + Editor Pacchetto + migrazione DB** (commit `7dc35c9`)

Database (eseguito su Supabase pre-commit via SQL manuale):
- Nuove tabelle `supplement_packages` + `supplement_package_items` con RLS + admin policy (vedi sezione "Schema Supabase")
- Migrazione one-shot DO block: 11 pacchetti / 28 items creati raggruppando supplements per slot. Account Ignazio: 6 pacchetti 06:30/08:45/11:00/14:30/17:00/22:15 con 3/8/1/4/1/2 prodotti

Frontend:
- Nuovo `renderIntegratori()` v3 (design system Syne+JetBrains Mono, bone+ambra Nutrition) con sezione "I miei pacchetti" (card 72px con tile emoji + chevron + stock warn) e sezione "Integratori extra" (righe 44px con orario + nome + ···)
- CTA `+ Nuovo pacchetto` / `+ Singolo integratore` con tag NUTRILITE
- `openPackageEditor` fullscreen overlay `#package-editor-overlay`:
  - Meta card 3 righe (orario big mono + emoji tile 56px + nome dashed underline)
  - Lista item con vista collassata/espansa (pattern accordion: solo uno espanso alla volta)
  - Macro chips read-only (kcal sempre, C/P/G solo se ≥1 > 0)
  - `× Rimuovi dal pacchetto` con toast undo 4s (Mail iOS pattern)
  - `Elimina pacchetto` con modal conferma (CASCADE su FK)
  - CREATE mode: persiste pacchetto solo dopo primo `+ Aggiungi prodotto`
  - EDIT mode: edits live (name/emoji/time debounce-save, item fields via existing helpers)
- Editor extra (stesso overlay, `mode='extra'`): item card singolo sempre espanso, edit orario + elimina dalla libreria
- Integrazione catalogo: `ST.catalogContext = { mode:'addToPackage'|'addExtra', ... }`
  - `goToCatalogStep2` pre-fill slot inputs con `package.time` se `addToPackage`
  - `importFromCatalog` post-insert linka via `supplement_package_items.insert`
  - `closeCatalogModal` ripristina overlay editor se chiuso senza importare

Helpers nuovi: `loadPackages`, `_suppDaysLeft`, `_extraSupps`, `_suppIdsInAnyPackage`, `_renderPkgItemCard`, `_renderExtraEditor`, `openPackageEditor`, `closePackageEditor`, `savePackageEditor`, `renderPackageEditor`, `pkgEditorChangeName/Flush/EditTime/EditEmoji`, `pkgEditorToggleItem`, `pkgItemSet/Adjust`, `pkgEditorRemoveItem/UndoRemove`, `pkgEditorConfirmDelete/CancelDelete/DoDelete`, `pkgEditorAddProduct`, `openCatalogForExtra`, `openExtraEditor`, `pkgEditorEditExtraTime`, `pkgEditorConfirmDeleteExtra/Do`.

CSS nuovo (block "INTEGRATORI V3" dopo `.oggi-v3-*`):
- `.int-v3-*` (scope-note, section, pkg-card, cta, extra-row, empty-section)
- `.pkg-editor-*` (overlay, accent, header, body, meta-card/row, emoji-tile, name-inp)
- `.pkg-item-*` (card, row, drag, body, meta, chev, stock-badge, expand, chips, field, stepper, unit-sel, mult-helper, days-left, cost, remove)
- `.pkg-undo-toast` (Mail iOS undo pattern)

Tab Oggi patch: `oggiSuppCardHTML` mostra badge `ESAURITO` terracotta accanto al nome se `_suppDaysLeft === 0`. Conserva badge `⚠ Ngg` per scorta ≤ 7. **NO auto-disable**: l'integratore esaurito resta visibile come segnale per riordinare.

ST esteso: `packages [], packageEditor null, catalogContext null, pkgRemoveItemConfirm null, pkgDeleteConfirm false, pkgExitConfirm false`.

**Blocco 1 hot-fix — RLS leak admin** (commit `1c2a295`)

Bug post-deploy `v2026.05.16 · 19:03`: la policy `admin_read_all_packages` (necessaria per `dashboardzona.html`) permetteva all'email `ignazio.f@me.com` di leggere tutte le righe di `supplement_packages`/`supplement_package_items` via RLS. Il client `loadPackages()` non filtrava per `user_id` e mostrava all'admin i pacchetti di tutti i tester (11 pacchetti misti invece dei 6 dell'account Ignazio).

Fix: `ST.packages = []` reset, early return se `ST.user.id` mancante, `.eq('user_id', uid)` esplicito su entrambe le SELECT. Altre operazioni già safe: INSERT (payload user_id esplicito), UPDATE/DELETE (RLS `own_*` policy auto-filtra per `auth.uid()`).

**Blocco 2 — Modal Catalogo Nutrilite hi-fi** (commit `fa75562`)

Riscrittura completa di `openCatalogModal()` + `renderCatalogList()`. HTML `<div id="catalog-modal">` resta come container, contenuto interno step1 completamente sostituito.

UI catalogo v3:
- Shell fullscreen `100dvh` bone con accent bar `#FAC775`, header con back button Mono caps + titolo Syne + contatore `N SELEZIONATI` (grigio→evergreen quando N≥1)
- Search bar `#ECE9E0` con icona 🔍 + clear `×`, font-size 16px (anti-zoom iOS)
- Pillole categoria scroll orizzontale: `TUTTI 64` + 1 per categoria reale ordinate per count desc, attiva fill `#FAC775`, inattiva outline 0.75px `#C8C3B8`. Fade gradient destro per "ce ne sono altre". Scroll orizzontale preservato su filter change (savedScroll)
- Eyebrow Mono caps "{FILTRO} · ORDINATO PER NOME · N RISULTATI [· AZZERA ›]"
- Card prodotto ~104px: thumb 56×56 tinted (`CATEGORY_TINT_MAP`) + emoji semantico (`CATEGORY_EMOJI_OVERRIDE`), nome Syne 600 con tag linea inline (BODYKEY mint / XS SPORTS terracotta), meta caps (categoria · porzione), macro Mono (regola: kcal sempre, C/P/G tutti o nessuno, ordine kcal→C→P→G), costo €/dose, check 26×26 con pop animation
- Stato "NEL PACCHETTO" per card già linkate al pacchetto sorgente (opacity .55 + tag evergreen + `pointer-events:none`) — legge `ST.catalogContext.alreadyInPackage`
- CTA sticky bottom evergreen full-width: "Seleziona prodotti" disabled → "Aggiungi {N} prodotti" abilitato (singolare/plurale, numero in Mono 700 inline)
- Empty states: nessun match (link "Azzera filtri") + catalogo vuoto (link "Riprova")

**Architettura render split** per UX search input persistente — decisione critica:
- `renderCatalogShell()` chiamata 1 volta da `openCatalogModal` — monta header/search/pills container/eyebrow/list/CTA come scheletro statico
- `renderCatalogList()` su ogni filter change — aggiorna solo counter/pills/eyebrow/list/CTA. **NON ricostruisce il search input**. Critico su iOS: il pattern legacy (innerHTML totale a ogni keypress) causava loss-of-focus e flicker della tastiera
- `onCatalogSearchInput(value)` handler oninput → solo trigger `renderCatalogList`

Costanti hardcoded (decisione "A" del brief — niente DB nuove):
- `CATEGORY_TINT_MAP`: 5 macro-tinte (ambra/terracotta/rosa/verde/beige)
- `CATEGORY_TO_TINT`: 15 mapping categoria reale → tinta (default beige)
- `CATEGORY_EMOJI_OVERRIDE`: emoji semantico per categoria (default da tinta)
- `getCatalogTint(item)`: helper unified `{bg, emoji}`

Estensione `ST.catalogContext` (Blocco 1 → Blocco 2):
- `pkgEditorAddProduct` setta `alreadyInPackage = e.items.map(it => it.supplement.codice)`. `renderCatalogList` legge il set e applica `.catalog-v3-card-disabled` + tag "NEL PACCHETTO"
- `packageName`, `packageTime` aggiunti al context (back-compat con `goToCatalogStep2` per pre-fill slot)
- ST nuovo: `catalogCategoryFilter: 'TUTTI'` — pill attiva

Marcate legacy `// [LEGACY-CATALOGO-V3-BLOCCO2]`:
- `toggleCatalogRemove`: design v3 puramente additivo
- `selectAllCatalog`: nessun bottone Seleziona/Deseleziona tutti
- Branch "Da rimuovere" in `goToCatalogStep2`: dead code path

CSS nuovo (block "CATALOGO NUTRILITE V3" dopo `.pkg-*`):
- Override `#catalog-modal > .weight-modal-inner` per fullscreen flush, height `100dvh`
- `.catalog-v3-shell/-accent/-header/-back/-title/-counter` (statico/dinamico)
- `.catalog-v3-search-wrap/-search-icon/-search-bar/-search-clear`
- `.catalog-v3-pills-wrap/-pills/-pill[.active]/-pill-fade`
- `.catalog-v3-eyebrow/-eyebrow-left/-right/-link`
- `.catalog-v3-list/-card[.disabled]/-thumb` (texture diagonale via `::after`)
- `.catalog-v3-info/-name/-line-tag[-bodykey|-xs]/-meta/-macro[-kcal|-c|-p|-g|-sep]`
- `.catalog-v3-cost/-in-package-tag/-check[.on]` (keyframes `catalogCheckPop`)
- `.catalog-v3-cta-bar` (fade gradient sopra) `/-cta-btn[.disabled]/-btn-count`
- `.catalog-v3-empty-state/-emoji/-title/-text/-link`

**APP_VERSION finale Integratori v3**: `v2026.05.16 · 20:31`

**Stato moduli Nutrition aggiornato**:
- Tab Oggi: ✅ production-ready (design + tipografia)
- Tab Integratori: ✅ production-ready (design + nuova architettura pacchetti)
- Tab Storico: 🟡 grafica legacy
- Tab Piano: 🟡 grafica legacy

**Prossimi step Nutrition**: ridisegno tab Storico (timeline 7gg pulita) + ridisegno tab Piano (textarea coach + macro). Mockup hi-fi su Claude Design in chat dedicate.

### 16 maggio 2026 — Giro tipografico globale: più respiro + numeri perfettamente allineati ✅

Dopo il deploy della tab OGGI production-ready, feedback unanime dei tester (Ignazio + altri): "il font ci sta ma è troppo schiacciato in altezza, sembra tutto attaccato, su smartphone si legge male." Tre interventi consecutivi sui token CSS scoped (mai globali, M1/M2 protetti dai loro scope espliciti).

**Commit `0e3079e` — Tipografia v1: respiro verticale e orizzontale**
- `body` line-height: default → 1.5
- Saluto Home V2 + titolo Nutrition (Syne 800 30px): 1.08-1.15 → 1.15
- Sezioni medie (`oggi-v3-timeline-title` 22px): nuovo 1.25
- Body Syne 500 paragrafi/descrizioni: 1.3 → 1.5
- Label Mono caps: 1 → 1.3-1.4
- Letter-spacing Mono caps 9-10px: 0.12-0.14em → 0.25em (~2.5px)
- Letter-spacing Mono caps 11px: 0.18em (~2px)
- Margin-bottom tra card principali: 14 → 20px
- Padding card coach/action: 16 → 18px
- Font-size `.oggi-v3-macro-sub` ("rimasti · 82/221g"): 9px → 11px (impatto leggibilità maggiore)
- Font-size `.oggi-v3-donut-summary`: 11px → 12px

**Commit `4728022` — Tipografia v2: titoli grandi più ariosi + numeri tabular-nums**
- Bump line-height titoli Syne 800 ≥22px da 1.15 → 1.25 (descender di "g", "p", "y" finalmente respirano)
- Aggiunto `font-variant-numeric: tabular-nums` su 5 classi Syne con numeri + 3 classi Mono per safety
- Training session card title: line-height inline 1.25 + mb 4→6px
- Risultato: titoli "pomeriggio, Ignazio." / "Nutrition" / "Recupero Mobilità" leggibili senza schiacciamento

**Commit `7119c2a` — Numeri grandi convertiti a JetBrains Mono**
- Diagnosi: `tabular-nums` su Syne non basta. Syne è display font, non ha glyph tabular nativi.
- Sostituzione font da Syne a JetBrains Mono SOLO sui numeri grandi:
  - `.home-v2-donut-num` (donut Home "1.509")
  - `.home-v2-macro-value` (macro Home "139/148/45")
  - `.home-v2-body-weight` (peso "71.55")
  - `.oggi-v3-donut-num` (donut Oggi "1.509")
  - `.oggi-v3-macro-value` (macro Oggi "139/148/45")
- Bump compensativo font-size +7-10% (Mono renderizza più stretto di Syne)
- Font-weight 800 → 700 (Mono 700 è già molto bold, mantiene impatto)
- Letter-spacing convertito da px negativi (-1.5px, -0.5px) a em conservativi (-0.02em a -0.04em)
- Risultato: tutti i numeri grandi ora con larghezza e baseline identiche, separatore mille stabile

**Cosa resta Syne** (decisione design):
- Tutti i titoli (saluto Home, "Nutrition", "Timeline di oggi", card Training "Upper A", "Recupero Mobilità", ecc.)
- Body text e descrizioni (paragrafi coach, descrizioni pasto)

**Cosa resta JetBrains Mono** (era già così):
- Label caps eyebrow (es. "COACH · RIEQUILIBRIO", "PIANIFICATO · DAL COACH", "CARB/PROT/FAT")
- Numeri piccoli timeline (kcal pasti)
- Riepiloghi numerici Zona Stats
- Dettagli "consumate · su X obiettivo"

**Stato sistema visivo (16 maggio 2026 v2)**:
- Carattere display Syne per titoli e prosa = identità visiva
- Carattere monospaced JetBrains Mono per TUTTI i numeri + label tecnici = leggibilità dashboard
- Vantaggio: coerenza visiva totale. Tutti i numeri (grandi e piccoli) appartengono alla stessa famiglia visiva.

**APP_VERSION finale giro tipografico**: `v2026.05.16 · 14:46`

**Vincoli rispettati**: nessun cambio di font-size titoli, font-weight nominali, colori, schema DB, flusso registrazione pasto. M1/M2 non toccati grazie agli scope CSS espliciti (`#m2-screen`, `#onboarding-screen`).

**Stato moduli Nutrition aggiornato**:
- Tab Oggi: ✅ production-ready (design + tipografia)
- Tab Integratori: 🟡 grafica legacy, prossima da ridisegnare
- Tab Storico: 🟡 grafica legacy
- Tab Piano: 🟡 grafica legacy

**Prossimo step**: ridisegno tab Integratori (gestore pacchetti orari + integratori extra + catalogo Nutrilite 25 prodotti). Mockup hi-fi su Claude Design in nuova chat dedicata.

### 16 maggio 2026 — Tab OGGI Nutrition production-ready ✅

Chiusura completa del restyling tab Oggi modulo Nutrition con design system v3 (Syne + JetBrains Mono, palette bone/evergreen, tinta Nutrition `#FAC775`).

**Funzionalità deployate:**
- Header v3 con accent bar `#FAC775` + eyebrow data + titolo Syne + avatar IF + sub-nav pillole (OGGI / INTEGRATORI / STORICO / PIANO)
- Donut hero "kcal rimaste" 200×200 con numero centrale Syne 800 adattivo (3/4/5 cifre), stato negativo rosso terracotta con minus U+2212
- Pillola Status Zona separata sotto donut (NELLA / QUASI / FUORI / DATI INSUFFICIENTI)
- 3 card macro orizzontali CARB/PROT/FAT con dot semantici (ambra/evergreen/terracotta), barre "rimaste", bordo 1px hairline
- CTA pair: Registra pasto (primary evergreen) / Registra integratori (outline)
- Timeline mista pasti pianificati + registrati:
  - Pasti registrati: card piene con freccia ▶/▼ espandibile, ingredienti dettagliati (Smart Ingredient), matita ✏️ edit, cestino 🗑️ delete, swipe mobile
  - Pasti pianificati: righe dashed con eyebrow "PIANIFICATO · DAL COACH", CTA "REGISTRA ›" → apre form Smart Ingredient pre-compilato dal piano AI
  - Gruppi integratori MAMI/COLAZIONE/PRANZO/ecc espandibili
- Card Coach Riequilibrio (sand + border-left ambra) con suggerimento AI, stato silente "Tutto in linea" se in target

**Bug fix risolti durante la sessione:**
- Commit `5a64cab` — restyling tab Oggi v3 (donut + macro + CTA + timeline iniziale)
- Commit `df20032` — ripristino `mealCardHTML` espandibile + `oggiSuppCardHTML` + `extraSuppCardHTML` (erano state perse nel restyling) + connector timeline + debug `getTodayPianoMeals`
- Commit `12c1e5b` — eager load `piano_ai` da Supabase in `applyProfile()` (era caricato solo in `renderPiano` lazy → tab Oggi non vedeva i pianificati)
- Commit `0e2ed37` — orario form registrazione: ora attuale all'apertura CTA, orario pianificato se da riga timeline, orario standard slot se cambio slot manualmente (no più memoria sessione)

**Workflow di sessione:**
- Wireframe panoramico 4 tab (Claude Design giro 1) → dubbi aperti risolti via chat
- Wireframe v2 (Claude Design giro 2) con modifiche strutturali: piano dentro Oggi · Integratori = gestore pacchetti · Storico solo timeline 7gg · textarea coach in Piano
- Hi-fi tab Oggi (Claude Design) → approvazione → prompt Claude Code → 4 iterazioni di fix → production-ready
- Strategia: una tab alla volta in produzione, test su browser desktop con DevTools per debug rapido

**Vincoli rispettati (non toccati):**
- `mealCardHTML`, `extraSuppCardHTML`, `oggiSuppCardHTML` e i rispettivi stati expansion
- Flusso Smart Ingredient (`renderRegistraPasto`, `smartAnalyze`, `smartAddEmptyRow`, `logMeal`)
- `dayTotals`, `kcalRimaste`, `macroRimasti`, `isOverTarget`, `OVER_COLOR`
- Schema DB Supabase, ramo digiuno, badge Giorno Perfetto, day-nav, detox

**APP_VERSION finale tab Oggi**: `v2026.05.16 · 10:49`

**Stato moduli Nutrition:**
- Tab Oggi: ✅ production-ready
- Tab Integratori: 🟡 grafica legacy, prossima da ridisegnare
- Tab Storico: 🟡 grafica legacy
- Tab Piano: 🟡 grafica legacy

**Prossimo step**: ridisegno tab Integratori (gestore pacchetti orari + integratori extra + catalogo Nutrilite 25 prodotti). La registrazione dell'assunzione resta in tab Oggi.

### 15 maggio 2026 — Nutrition Oggi restyling design system v3 + timeline mista pasti pianificati

Restyling completo della tab OGGI del modulo Nutrition (commit `5a64cab`) per allinearla al design system definitivo M1/M2/Home V2 (Syne + JetBrains Mono, palette bone+evergreen, tinta Nutrition `#FAC775`). Plus una funzionalità nuova: la timeline ora mostra anche i pasti pianificati dal piano coach come righe cliccabili dashed che pre-compilano il form di registrazione.

**Restyling visivo** (classi nuove prefisso `.oggi-v3-*`):
- **Banda modulo** `#FAC775` 3px (`.oggi-v3-accent`) in cima alla pagina, bleed full-width.
- **Header v3**: eyebrow data mono caps (es. "VEN 15 MAG · OGGI") + titolone Syne 800 30px "Nutrition" + bollino avatar evergreen 42px con iniziali (`first_name+last_name`) → `openSettingsModal()`.
- **Sub-nav pillole** (`.oggi-v3-pill`): OGGI attiva fondo `#FAC775` testo dark, INTEGRATORI/STORICO/PIANO inattive dashed outline grigio. Sostituisce `.nsn-pill` su tab OGGI (le altre 3 tab usano ancora `nutriSubNav()` legacy).
- **heroCard riscritta** ([zona-tracker.html:8806](zona-tracker.html:8806)): donut centrale **200×200** (era 170×170), SVG con viewBox 200×200, r=85, stroke-width 10, track `#E8E4DC`. Numero centrale Syne 800 **54px adattivo** (`.medium 46px` per 4 cifre, `.small 38px` per 5+ — gestisce `1.420` e `−1.800` senza overflow). Label sotto `KCAL RIMASTE` / `KCAL OLTRE` / `TARGET RAGGIUNTO` mono caps. Riga sotto donut `{X} consumate · su {Y} obiettivo` mono.
- **Pillola Status Zona separata** (`.oggi-v3-zona-pill`) sotto donut con 3 stati:
  - `NELLA ZONA` evergreen (tutti 3 macro nella fascia target ±5%)
  - `QUASI ZONA` ambra (tutti nella fascia ±10% ma non ±5%)
  - `FUORI ZONA` terracotta
  - `DATI INSUFFICIENTI` neutro (`tot < 5`)
  Mostra le 3 percentuali correnti vs target (es. `38 · 28 · 34 / 40·30·30`).
- **3 macro card orizzontali** (`.oggi-v3-macro-card`): CARB ambra `#C4880A`, PROT evergreen, FAT terracotta `#B84C2A`. Numero Syne 28px (rimasti), riga `rimasti · {X}/{Y}g` mono 9px, barra residua sotto. Stato over: prefisso `+`, colore `OVER_COLOR`.
- **Stato kcal in negativo**: numero `−180` prefisso (U+2212 minus), donut stroke `#B84C2A`, label "KCAL OLTRE". Decisione: NO `+180 oltre` come modulo legacy — il numero rappresenta kcal residue che sono andate sotto zero.
- **Coppia CTA** (`.oggi-v3-cta-row`): `+ Registra pasto` primario pieno evergreen, `+ Registra integratori` secondario outline 1.5px evergreen. Entrambi `h:48px`, `radius:12px`, font Syne 600. Wrapper con `id="registra-pasto-form"` per scroll target.
- **Card coach** (`.oggi-v3-coach-card`): tinta sand `#FDF7E8` + border-left 2px `#FAC775`. Eyebrow `COACH · RIEQUILIBRIO` (sinistra) + `PROSSIMO PASTO` (destra). Titolo Syne 18px (es. "Merenda · 16:30"). Testo Syne se `ST.advice` presente. CTA inline `ANALIZZA & SUGGERISCI →` mono caps evergreen (no più bottone pieno). **Stato silente**: se `zonaOk=true` E `cons.kcal > 40% target` E nessun advice → versione compatta `✓ Tutto in linea col piano`.

**Funzionalità nuova — Timeline mista pasti pianificati**:
- **Helper `getTodayPianoMeals()`** ([zona-tracker.html:8762](zona-tracker.html:8762)): mappa `ST.activeDay` (YYYY-MM-DD) → giorno italiano del piano coach (`ST.pianoAI.giorni[i].giorno`) con matching case+diacritici-insensitive (`normalize('NFD')` + strip U+0300–U+036F). Ritorna l'oggetto giorno o `null`.
- **Helper `openLogFromPlanned(idx)`** ([zona-tracker.html:8784](zona-tracker.html:8784)): pre-compila il form Smart Ingredient con slot, orario e `freeText` (= ingredienti del piano), apre il form (`ST.logOpen = true`) e scrolla a `#registra-pasto-form` con `scrollIntoView({block:'start', behavior:'smooth'})`. Indicizzato via `ST._plannedRows` per evitare HTML injection in onclick.
- **Build timeline** in `renderOggi()`: per ogni `MEAL_SLOT` principale (`colazione`/`snack_mattina`/`pranzo`/`snack_pomeriggio`/`cena`):
  - se ci sono pasti registrati di quello slot → riga registrata (UI esistente migrata a `.oggi-v3-meal-row`)
  - se NON registrato ma piano coach ha pasto previsto per quello slot → riga **pianificata** dashed (`.oggi-v3-planned-row`, `1.5px dashed var(--b1)`) con badge `PIANIFICATO · DAL COACH` e CTA `REGISTRA ›` evergreen. Tap sull'intera riga → `openLogFromPlanned(idx)`.
  - se non c'è né registrato né pianificato → slot skippato
- Pasti `extra` (slot fuori griglia) sempre visibili se registrati.
- Supps (gruppi standard e log extra) preservati con renderer esistenti, leggermente armonizzati su border/padding.
- Indicatore in alto a destra: `{nReg} / {nTot}` (pasti registrati su totale visibili incluso pianificati).

**Logica preservata** (vincoli rispettati):
- `dayTotals`, `consumedTotals`, `kcalRimaste`, `macroRimasti`, `isOverTarget`, `OVER_COLOR` — invariati
- Form Smart Ingredient: `renderRegistraPasto()`, `smartAnalyze()`, `smartAddEmptyRow()`, `logMeal()`, `setLogSlot()`, `smartUpdateField()`, ecc. — invariati
- Ramo `day.fasting` (digiuno), badge Giorno Perfetto, day-nav, detox button — invariati
- AI advice flow (`fetchAdvice()` + `ST.advice` + `ST.nextSlot` + `computeNextSlot()`) — invariato, solo riposizionato nel coach card v3
- Sub-nav navigation `showPage('integratori')`, ecc. — invariato
- Schema DB (`meals`, `meal_items`, `supplements_log`, `pianoAI`) — invariato

**Edge case noti**:
- Se `ST.pianoAI` è null (utente non ha mai generato il piano) → timeline mostra solo pasti registrati + supps + extra, nessuna riga pianificata. Comportamento atteso, no errori.
- Mappatura giorno: il piano usa nomi italiani (`Lunedì`/`Martedì`/...). Il match tollera `Lunedì`/`lunedi`/`LUNEDÌ`. Se il giorno corrente non è presente nel piano (es. piano parziale o piano per altri giorni) → nessuna riga pianificata.
- Form open con id duplicato risolto: il wrapper esterno non ha `id="registra-pasto-form"` quando il form interno (che lo ha già da `renderRegistraPasto()`) è in render. La CTA pair (form chiuso) ha l'id sul wrapper.

**Sezione "Design system" legacy in CLAUDE.md ora si applica solo ai sub-tab non ancora migrati** (Integratori, Storico, Piano). La tab OGGI usa interamente le classi `.oggi-v3-*` + le decisioni di design correnti del 15 maggio.

### 14 maggio 2026 — Mini-fix Tendenza: copy intervallo + precisione peso

Due rifiniture sulla tab Tendenza appena rilasciata. Solo `zona-tracker.html`, modifica minima.

**Fix 1 — Copy "negli ultimi {range}"**: con intervallo "Tutto" le card mostravano "negli ultimi **sempre**" (grammaticalmente errato). Nuovo helper `trendRangeSuffix(range, firstDateStr)`: `7d/30d/90d` → "negli ultimi N giorni"; `all` → "dal {data primo punto}" via `trendShortDate()`. Nella Sezione 2 il loop metriche ora costruisce `pts = filtered.filter(...)` (oltre a `vals = pts.map(...)`) per avere `pts[0].date` = primo punto **di quella metrica** (ogni metrica può iniziare in date diverse, es. BF% parte quando arriva la bilancia). Rimossa la costante `rangeLbl`. Copy "Invariato" adattato (`Invariato ${suffix}`). Card a 1 punto non coinvolte (nessun delta). Sezione 1 già usava `nDays` numerico reale, non toccata.

**Fix 2 — Precisione peso (2 decimali)**: la hero Tendenza mostrava `71.6` mentre pillolino header e tab Misure mostrano `71.55`. Nuovo helper `fmtMeasure(v)` = `Number(v).toFixed(2).replace(/\.?0+$/, '')` (2 decimali, zeri finali rimossi: `71.55→71.55`, `71.50→71.5`, `72→72`). Applicato a: Sezione 1 hero (peso attuale, delta al target, stat complementare "Hai perso/guadagnato/Stabile X kg"); Sezione 2 card metriche **Peso/Vita/Fianchi/Petto** (flag `precise:true` in `metricDefs` → `def.precise ? fmtMeasure : fmtMetric` su valore corrente + delta + card-1-punto). BF%, massa magra/grassa, BMI, grasso viscerale restano su `fmtMetric` (1 decimale). **Sezione 3** (confronto check) lasciata volutamente su `fmtMetric`: i delta tra check a 1 decimale sono coerenti con la precisione reale degli strumenti (bilancia ±0.1 kg, metro ±0.5 cm) — il centesimo sarebbe pseudo-precisione.

### 14 maggio 2026 — Refactor tab Tendenza Body (versione funzionale intelligente)

La tab Tendenza era solo 2 grafici a barre (peso/vita). Sostituita con una pagina informativa a 3 sezioni + selettore intervallo. Versione funzionale (struttura + calcoli + UI ordinata); l'estetica fine sarà rifinita da Claude Design. Solo `zona-tracker.html`, nessuna tabella DB.

**Architettura**: nuova funzione `renderBodyTrend()` che ritorna una stringa HTML; in `renderBody()` il branch `tab==='tendenza'` ora fa `body = renderBodyTrend()` (sostituito ~55 righe di codice barre). Il selettore intervallo fa `ST.bodyTrendRange='Xd';renderBody()` → `innerHTML` sincrono, **nessun flicker/reload** (stesso pattern di tutta l'app).

**State nuovi**: `ST.bodyTrendRange` (`'7d'|'30d'|'90d'|'all'`, default `'30d'`), `ST.bodyChecks` (record `body_checks` id+status).

**`loadBodyLogs()`**: aggiunta una terza query al `Promise.all` esistente — `body_checks` (`id, status`) → `ST.bodyChecks`. Serve per filtrare i check `completed` nella Sezione 3.

**`getUnifiedBodyTimeline()`**: esteso (additivo) con `hip_cm` e `chest_cm` (mapping `body_logs.hip_cm/chest_cm` ↔ `body_measurements.hips_cm/chest_cm`) — necessari per le card Fianchi/Petto.

**Helper nuovi**: `bodyTrendRangeDays(range)`, `filterTimelineByRange(tl, range)` (filtra `_ts >= Date.now() - days·86400000`), `sparklineSVG(values, color)` (SVG inline viewBox 100×40, `<path>` area + `<polyline>` linea, `vector-effect:non-scaling-stroke`), `fmtMetric(v)` (1 decimale, rimuove `.0`), `trendShortDate(s)` ("13 mag").

**Sezione A — Selettore intervallo**: switch 4 opzioni `7g · 30g · 90g · Tutto` (classe `.trend-range-switch`). Filtra solo la Sezione 2; Sezione 1 e 3 hanno logiche proprie.

**Sezione 1 — Progresso vs obiettivo** (`.trend-card`): hero stat peso attuale (`getLatestBodyData()`) → obiettivo + delta al target; barra progresso (start = peso più vecchio della timeline intera); statistica complementare "Hai perso/preso/guadagnato X kg in N giorni" calcolata su primo→ultimo punto peso *nell'intervallo* (N = diff date effettiva). Copy adattato a `ST.profile.obiettivo`: `ipertrofia`/`forza_performance` → "guadagnato"; altrimenti → "perso/preso"; |Δ|<0.05 → "Stabile". Edge: timeline ≤1 punto → "Inizia a tracciare…".

**Sezione 2 — Evoluzione del corpo** (griglia `.trend-metric-grid`, 1 col mobile / 2 col ≥720px): 9 card metriche — Peso, Vita, BF%, Massa magra (calc `peso×(1−BF/100)`), Massa grassa (calc `peso×BF/100`), Fianchi, Petto, Grasso viscerale, BMI (calc `peso/(h/100)²`, h da `getLatestBodyData().height_cm`). Metriche derivate calcolate **per-punto**. Card mostrata solo se ≥1 punto nell'intervallo: ≥2 punti → valore + delta colorato + sparkline; 1 punto → valore + nota "Aggiungi nuovi log…"; 0 punti → card assente. Colore delta: `goodDown` per metrica (diminuzione=verde), eccetto Massa magra (aumento=verde sempre) e Peso che inverte se obiettivo ipertrofia/forza.

**Sezione 3 — Confronto check fisici M2** (`.trend-card`): usa `ST.bodyMeasurements` filtrati per `check_id ∈ body_checks.status='completed'` (decisione: confronto solo tra check completati, gli `in_progress` sono potenzialmente incompleti). ≥2 check → "Tra il primo e l'ultimo check" + date + delta su peso/vita/fianchi/petto/BF%/massa magra/grassa/viscerale (solo metriche presenti in entrambi). Coppia: se range≠'all' usa primo/ultimo check *nel range* (≥2), altrimenti fallback ai 2 assoluti. 1 check → messaggio + CTA "Nuovo check fisico →" che chiama `m2EntryIntro()`. 0 check → card non renderizzata.

**Stato vuoto generale**: 0 log + 0 check → blocco unico "Nessun dato ancora…" + CTA "Vai a Misure →".

**Edge case gestiti**: intervallo troppo stretto → card metrica assente; BF in un solo punto → massa magra/grassa non calcolabili su quel punto (filtrate); altezza NULL → card BMI nascosta; cambio intervallo → re-render sincrono immediato.

**Non toccato**: tab Misure, M2, struttura `loadBodyLogs()` (solo estesa con 1 query al Promise.all), pillolino header.

### 14 maggio 2026 — Popup "Aggiorna peso" unificato + schermata dettaglio check fisico

Due rifiniture sul modulo Body. Solo `zona-tracker.html`, nessuna nuova tabella DB.

**Fix 1 — Popup "Aggiorna peso"**: il popup `#weight-modal` (apertura dal pillolino header) leggeva ancora `ST.profile.weight_kg` (incoerente: mostrava 71.8 invece di 71.55). Due punti aggiornati a `getLatestBodyData().weight_kg ?? ST.profile?.weight_kg`: `openWeightModal()` (precompila `#weight-inp`) e `renderWeightChart()` (`curr` per riga "Attuale: Xkg" + barra progresso).

**Fix 2 — Schermata dettaglio check fisico M2**: le righe `✓ CHECK` della lista "Ultimi log" sono ora cliccabili → aprono un dettaglio dedicato. I log veloci da `body_logs` restano non cliccabili (già mostrati per intero nella riga).
- **Architettura**: overlay full-screen `<div id="body-check-detail">` (`position:fixed;inset:0;z-index:1500`), NON una nuova entry di `showScreen()`. Motivo: zero contaminazione del routing, "← Indietro" chiude solo l'overlay e Body resta sotto già renderizzato.
- **State**: `ST.bodyCheckDetail` — oggetto `{checkId, status, createdAt, notes, meas, photos, blood}`.
- **`openBodyCheckDetail(checkId)`** (async): misure/composizione prese da `ST.bodyMeasurements` (già in memoria, no query); query `body_checks` per `status`/`created_at`; query `body_check_photos` + `createSignedUrl(path, 3600)` per le 4 foto (bucket privato → signed URL temporanei 1h); query `blood_tests` range ±30 giorni dalla `created_at` del check (LIMIT 1, più recente).
- **`renderBodyCheckDetail()`**: header (← Indietro + "Check fisico" + data "mer 13 mag · 16:12") → griglia foto 2×2 → Misure → Composizione → Esami del sangue. Sezioni Composizione/Esami nascoste se nessun campo popolato.
- **`openBodyCheckPhoto()` / `closeBodyCheckPhoto()`**: modal foto full-screen dedicato `#bcd-photo-modal` (riusa la classe `.m2-modal-photo-overlay` di M2).
- **Trigger**: riga check ha `onclick="openBodyCheckDetail(check_id)"` + `cursor:pointer`; il bottone `×` ha `event.stopPropagation()` per non aprire il dettaglio; freccia `→` discreta prima del `×` sulle righe check per segnalare la cliccabilità.
- **Conversione unità**: se `unit_system==='imperial'`, misure convertite da metrico per la visualizzazione (`kg×2.2046`, `cm÷2.54`) — formule copiate inline, non chiamate da `m2*` (disaccoppiamento moduli).
- **Foto mancanti/non caricate**: `<img onerror>` → placeholder grigio "Foto non disponibile" + label posa, griglia non si rompe.
- **Edge**: `status≠completed` → badge "Check fisico incompleto" nell'header, resto renderizzato coi dati disponibili.

### 14 maggio 2026 — Micro-fix: pillolino peso header unificato + eliminazione log Body

Due rifiniture post lettura-unificata Body. Solo `zona-tracker.html`, nessuna modifica DB.

**Fix 1 — Pillolino peso header**: il pillolino `#h-weight` in alto a destra mostrava ancora il vecchio `profile.weight_kg` (incoerente con tile Home e modulo Body, che dopo il fix unificato usano `getLatestBodyData()`). Nuova funzione `updateHeaderWeight()`: legge `getLatestBodyData().weight_kg` con fallback `ST.profile.weight_kg` (se Body non ancora caricato `getLatestBodyData` ritorna null e scatta il fallback). Chiamata in 2 punti: `applyProfile()` (sostituisce il vecchio set diretto) e in fondo a `loadBodyLogs()` — quest'ultimo copre **automaticamente** tutti gli scenari di refresh: salvataggio log peso (`saveBodyLog` chiama `loadBodyLogs`), completamento M2 (`m2Complete` → `showPage('home')` → `loadBodyLogs`), eliminazione log.

**Fix 2 — Eliminazione log Body**: bottone `×` discreto su ogni riga di "Ultimi log" (colore `var(--t3)`, azione secondaria). Elimina sia `body_logs` (log veloci) che `body_measurements` (check M2).
- **State**: `ST.bodyDeleteConfirm = { kind:'log'|'check', id, checkId, date }`.
- **`getUnifiedBodyTimeline()`**: aggiunti `id` (record id) a tutti i record + `check_id` ai record `source:'check'` — necessari per il delete.
- **`confirmDeleteBodyLog(kind, id, checkId, date)`**: setta lo state, re-render.
- **`deleteBodyLogConfirmed()`**:
  - `kind:'log'` → `DELETE FROM body_logs WHERE id`.
  - `kind:'check'` (cascade) → **prima** `SELECT storage_path FROM body_check_photos WHERE check_id` + `supa.storage.from('body-check-photos').remove(paths)`, **poi** `DELETE FROM body_checks WHERE id=check_id` (lo `ON DELETE CASCADE` dello schema rimuove automaticamente `body_check_photos` + `body_measurements`). Ordine critico: lo storage va svuotato prima di perdere i `storage_path` con il DELETE DB.
  - Storage remove è **best-effort**: se fallisce, `console.warn` e prosegue col DELETE DB. Errore DB invece → `showToast` errore e stop.
  - Dopo successo: `loadBodyLogs()` (ricarica + re-render + `updateHeaderWeight` + tile Home) + `showToast('Log eliminato'/'Check fisico eliminato')`.
- **Modal conferma**: riusa il pattern `info-modal-overlay` + `info-modal` già usato per `trainDeleteSetConfirm`. Testi differenziati log vs check, chiusura con *"L'operazione è definitiva."*, bottoni Annulla (grigio) / Elimina (rosso `#B84C2A`).

**Edge case**: cancellando l'unico check M2, la composizione torna ai valori `body_logs` (comportamento naturale di `getLatestBodyData`, nessuna gestione speciale). Test mode → liste vuote, delete mai raggiunto.

### 14 maggio 2026 — Modulo Body legge da body_logs + body_measurements (lettura unificata M2)

**Decisione strategica (Opzione A)**: le due tabelle coesistono. `body_logs` resta per i log peso veloci quotidiani (form "Log misure" del modulo Body — invariato). `body_measurements` accoglie i check fisici completi (M2 e futuri checkpoint). Il modulo Body ora **legge da entrambe** e mostra sempre il dato più recente per ogni metrica. Solo lettura — nessuna modifica DB, nessuna modifica al salvataggio.

**Problema**: M2 salvava correttamente su `body_measurements` ma il modulo Body leggeva solo da `body_logs`, quindi ignorava i dati del check fisico (schermata Body "vuota" sulla composizione).

**Modifiche** (tutte in `zona-tracker.html`):
- **State**: aggiunto `ST.bodyMeasurements` (parallelo a `ST.bodyLogs`).
- **`loadBodyLogs()`**: ora carica in parallelo (`Promise.all`) `body_logs` + `body_measurements` (ORDER BY `created_at` DESC, limit 90). Test mode → entrambi `[]`.
- **`getLatestBodyData()`** (nuovo helper): per ogni metrica scorre **tutti** i record di entrambe le tabelle e ritorna il valore non-null col timestamp più recente (`body_logs.date` vs `body_measurements.created_at`). Ritorna oggetto unificato `{weight_kg, waist_cm, hip_cm, chest_cm, bicep_cm, bf_pct, muscle_kg, body_age, visceral_fat, height_cm, _hasMeas}`.
- **`getUnifiedBodyTimeline()`** (nuovo helper): array normalizzato di record `{date, _ts, source:'log'|'check', weight_kg, waist_cm, bf_pct, visceral_fat, body_age}` ordinato per timestamp DESC. Usato da "Ultimi log" e dai grafici Tendenza.
- **Mapping campi** `body_logs` → `body_measurements`: `hip_cm`→`hips_cm`, `bicep_cm`→`biceps_cm`, `bf_pct`→`body_fat_pct`, `muscle_kg`→`muscle_mass_kg`, `body_age`→`metabolic_age`, `visceral_fat`→`visceral_fat` (identico), `weight_kg`/`waist_cm`/`chest_cm` identici. `height_cm`: solo da `body_measurements`, fallback `ST.profile.height_cm`.

**Punti di render aggiornati**:
- **Home tile Body**: peso + sub (BF/Vita) da `getLatestBodyData()`; trend dai 2 pesi più recenti della timeline unificata.
- **renderBody card peso/target**: `w`/`waist` da `getLatestBodyData()`; trend, progress, data mostrata derivati dalla timeline unificata (`uWeights`/`uWaists`).
- **renderBody card Composizione**: `cw, ch, cbf, cvisceral, cbodyAge` da `getLatestBodyData()`. BMI / massa magra / massa grassa restano **calcolate** (`cw/(ch/100)²`, `cw*cbf/100`, `cw*(1-cbf/100)`) ma sui valori unificati. `ch` ora usa `height_cm` da `body_measurements` con fallback profilo.
- **renderBody "Ultimi log"**: da `getUnifiedBodyTimeline().slice(0,8)`, righe da `body_measurements` marcate con tag `✓ CHECK` (mono uppercase, bordo evergreen).
- **renderBody tab Tendenza**: grafici peso/vita usano `getUnifiedBodyTimeline().slice(0,30)` — i check M2 appaiono come punti delle serie.
- **null-check render**: `if(ST.bodyLogs===null || ST.bodyMeasurements===null)` → loading.

**Cosa NON è stato toccato**: form "Log misure" + `saveBodyLog()` continuano a scrivere su `body_logs`. Pre-popolazione del form resta da `todayLog` (body_logs di oggi) — un log veloce non deve trovare preimpostati valori del check M2. Estetica/layout invariati.

**Edge case**: `body_logs.date` è solo data (no orario, → midnight UTC), `body_measurements.created_at` ha orario. Nello stesso giorno il check "vince" sul log veloce nel confronto timestamp. Imprecisione minore e accettabile (log veloci e check raramente lo stesso giorno).

**Verifica attesa** (account Ignazio, check M2 del 13 mag): BODY FAT 14.2% · MASSA GRASSA ~10.2 kg · MASSA MAGRA ~61.6 kg · GRASSO VISCERALE 7 · BODY AGE 53 · BMI ~24.3 (peso ~71.8 kg / altezza 172 cm).

### 13 maggio 2026 (sera) — UX refinements M2 schermate misure (s6/s7)

4 micro-fix UX da test reale, su schermate misure di M2. Nessuna modifica DB, nessun JS toccato (eccetto 1 riga show/hide nello switch).

- **Switch unità più visibile (s6)**: spostato lo switch KG·CM / LB·IN dal body s6 dentro l'**header verde di M2** (`onb-header`), con micro-label "Unità di misura" sopra. Show/hide dinamico in `m2GoStep`: visibile solo quando `stepId === 's6'`, nascosto sugli altri step. Aumentate dimensioni bottoni (padding `6px 12px` → `10px 20px`, font-size `11px` → `13px`). Variante CSS dedicata `.m2-unit-switch-onheader` con contrasto adattato a sfondo verde: container `rgba(255,255,255,.15)` + border `.25`, non-attivo testo `rgba(255,255,255,.8)`, attivo background `#fff` + color `var(--acc)` (inverte i ruoli per massimo contrasto).
- **Disclaimer bilateralità (s7)**: inserito `<p class="m2-bilat-tip">` dopo `.m2-divider`, prima del gruppo opzionali. Testo: "Per bicipite, polso, coscia e polpaccio: scegli un lato (destro o sinistro) e usa sempre lo stesso nelle misurazioni successive — così i dati sono confrontabili nel tempo." Stile italic 14px var(--t3) + micro-treatment "advice box" (`padding:10px 12px; background:var(--s1); border-left:3px solid var(--acc); border-radius:6px;`) per emergere senza essere invadente.
- **Spiegazione subito sotto label (s6/s7/s8)**: riposizionamento via **solo CSS con `order`**, zero edit HTML su 16 campi. Regole nuove `.onb-field .m2-meas-tip{order:1;margin-top:2px;margin-bottom:0;}` + `.onb-field .m2-meas-row{order:2;}`. L'ordine DOM resta `label → row → tip` ma il render visivo diventa `label → tip → row`. Coinvolge automaticamente s6 (2 campi), s7 (9 campi), s8 (5 campi) — quest'ultimo allineato per consistenza come anticipato nel piano.
- **Asterisco accorpato (s6/s7/s10)**: rimosso lo spazio HTML tra il nome del campo e `<span class="m2-required-asterisk">` su 6 punti (peso, altezza, vita, petto, fianchi, data esame). Il gap residuo viene solo dal `margin-left:2px` dello span — visivamente "PESO*" invece di "PESO &nbsp;*". Mantenuto colore evergreen `var(--acc)` e `font-weight:700`.

CLAUDE.md sezione M2 della voce di stamane resta intatta — questa è solo una passata di rifinitura UI.

### 13 maggio 2026 (pomeriggio) — Fix bug M2 da test reale (rename colonne DB + dropzone CSS)

Test M2 su iPhone con account reale ha trovato 2 bug bloccanti. Fix mirati, nessuna feature nuova.

**Bug A — Salvataggio `body_measurements` fallisce** con `Could not find the 'bf_pct' column ... in the schema cache`. Causa: 7 nomi di colonne nel codice JS non corrispondevano allo schema Supabase reale. Rename completo:

| Tabella | Codice vecchio | Schema DB |
|---|---|---|
| `body_measurements` | `hip_cm` | `hips_cm` |
| `body_measurements` | `bicep_cm` | `biceps_cm` |
| `body_measurements` | `bf_pct` | `body_fat_pct` |
| `body_measurements` | `muscle_kg` | `muscle_mass_kg` |
| `body_measurements` | `body_age` | `metabolic_age` |
| `body_measurements` | `water_pct` | `body_water_pct` |
| `blood_tests` | `cholesterol` | `cholesterol_tot` |

Verifica esaustiva delle altre tabelle M2 (`body_check_photos`, `body_checks`): tutti i nomi nel codice già coerenti con lo schema, nessun rename necessario.

**NB**: la tabella `body_logs` (modulo Body esistente, separata da M2) **continua a usare i nomi vecchi** `bf_pct`/`muscle_kg`/`body_age`/`hip_cm`/`bicep_cm` — schema diverso, non toccato. Il fix ha riguardato solo le funzioni M2 (`m2ContinueS7`, `m2ContinueS8`, `m2SaveMeasurementsAndSkipS8`, `m2SaveBloodTests`).

**Bug B — Schermate foto vuote (s1-s4) con dropzone collassata a L + titoli duplicati**:
- **Causa duplicazione**: il corpo di ogni step foto aveva `.onb-section-title` + `<p>` sottotitolo che ripetevano i contenuti già renderizzati dall'header dinamico `m2-title`/`m2-subtitle` (settati da `m2GoStep` via mappa `M2_HEADERS`). Rimossi dai 4 step.
- **Causa dropzone collassata**: la classe `.m2-photo-dropzone` era applicata a un `<label>` (default `display:inline`), quindi `padding` e `text-align:center` non bastavano e i `<div>` figli si disponevano in inline. Fix CSS: aggiunti `display:block; width:100%; box-sizing:border-box;` — ora il box occupa l'intera larghezza e i figli stanno in stack verticale centrato.

**Pulizia `m2Complete()`** (opzionale dalla brief): aggiunto reset di `ST.m2` dopo UPDATE riuscito su `body_checks` (status=completed). Resettati: `checkId`, `step`, `photos`, `photoUrls` (con `URL.revokeObjectURL` per evitare memory leak), `photosUploaded`, `reviewingPose`, `measurements`, `bloodTests`, `hasRecentBloodTests`, `retakeFromModal`. **Non** toccato `unitSystem` — resta preferenza utente per check fisici futuri.

### 13 maggio 2026 — M2 Check Fisico (versione funzionale)

Prima implementazione end-to-end del modulo M2 (check fisico) come da design session del 10 maggio. **Versione FUNZIONALE**: riusa pattern visivo dell'onboarding M1 esistente (classi `.onb-*`, font Manrope/legacy, palette evergreen accent). Il design refinement (font Syne, palette bone-caldo `#F5F3EE`, tipografia M2) arriverà in pass successivo via Claude Design.

**SQL prerequisito** (eseguito dall'utente prima del commit): aggiunta colonna `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS m2_skipped boolean DEFAULT false;` + backfill `UPDATE SET m2_skipped=false WHERE NULL`.

**4 tabelle Supabase** (già create con SQL fornito stamattina, RLS attive):
- `body_checks` (evento padre): `id` (uuid PK), `user_id`, `check_type`, `status` (`in_progress`|`completed`), `created_at`, `completed_at`
- `body_check_photos` (4 foto/check): `check_id` FK + `user_id` + `pose` (`front`|`right`|`left`|`back`) + `storage_path`. UNIQUE su `(check_id, pose)`
- `body_measurements` (1 riga/check): `check_id` UNIQUE + `user_id` + `unit_system` (`metric`|`imperial`) + colonne metriche (`weight_kg`, `height_cm`, `waist_cm`, `chest_cm`, `hip_cm`, `shoulders_cm`, `neck_cm`, `bicep_cm`, `wrist_cm`, `thigh_cm`, `calf_cm`, `bf_pct`, `muscle_kg`, `visceral_fat`, `body_age`, `water_pct`)
- `blood_tests` (storico indipendente, multi-row per user): `user_id`, `test_date`, parametri (`hemoglobin`, `ferritin`, `glucose`, `cholesterol`, `hdl`, `triglycerides`, `creatinine`, `alt`, `vitamin_d`, `vitamin_b12`, `tsh`)

**Bucket Supabase Storage**: `body-check-photos` (privato). Pattern path: `{user_id}/{check_id}/{pose}.jpg`. Upload con `upsert: true` per rifare foto.

**13 schermate state-machine** in singolo `<div id="m2-screen">` (riuso `showScreen('m2')` come 5° opzione del manager + classi `.m2-step.active` per show/hide):
- `intro` — entry point con 2 CTA "Inizia il check fisico →" / "Salta per ora"
- `resume` — prompt se `body_checks` `in_progress` trovato (cross-device)
- `s0` — istruzioni foto (abbigliamento/luce/postura)
- `s1`/`s2`/`s3`/`s4` — pose frontale/dx/sx/retro con dropzone tratteggiata + preview + retake
- `s5` — conferma griglia 2×2 + modal review full-screen
- `s6` — peso/altezza con switch unità KG·CM / LB·IN (solo qui, le altre 2 ereditano)
- `s7` — circonferenze (3 obbligatori VITA/PETTO/FIANCHI + 6 opzionali)
- `s8` — composizione bilancia (5 campi opzionali) — bottone "Salta" o "Continua →"
- `s9` — gate sì/no esami
- `s10` — compilazione esami (ramo Sì, 8 base + 3 opzionali, tutti singolarmente skippabili)
- `s11` — bridge (ramo No)
- `s12` — esito con riepilogo `✓ 4 foto · ✓ Misure registrate · Esami da fare/registrati`

**Stato runtime `ST.m2`** ([zona-tracker.html:1306](zona-tracker.html:1306)):
```js
{
  step: 'intro',                  // step corrente
  checkId: null,                   // uuid body_checks.id in corso
  unitSystem: 'metric',            // auto-detect: navigator.language.startsWith('en-us') → imperial, altrimenti metric
  photos: { front, right, left, back },        // File objects pre-upload
  photoUrls: {...},                // object URLs locali per preview (URL.createObjectURL)
  photosUploaded: {...},           // bool per posa
  reviewingPose: null,             // pose nel modal full-screen
  measurements: {},                // tutti i campi in metrico (DB sempre metrico)
  bloodTests: {},                  // parametri ematici compilati
  hasRecentBloodTests: null,       // true/false dal gate
  retakeFromModal: false,          // flag: se true post-upload torna a s5 invece di proseguire in cascata
  saving: false, error: null,
}
```

**Funzioni nuove** (zona-tracker.html, sezione "M2 CHECK FISICO"):
- `m2DetectUnit()` — auto-detect imperial/metric da `navigator.language`
- `m2LbToKg`, `m2KgToLb`, `m2InToCm`, `m2CmToIn` — conversioni unità (DB sempre metrico)
- `m2GoStep(stepId)` — cambio schermata + aggiorna header label dinamico + scroll top
- `m2EntryIntro()` — entry point: cerca `body_checks` in_progress → routa a resume o intro
- `m2Skip()` — UPDATE `profiles.m2_skipped=true`, va all'app
- `m2Start()` — INSERT `body_checks` (`status='in_progress'`, `check_type='initial'`), cattura `checkId`
- `m2ResumeContinue()` — heuristica step ripartenza in base a dati già salvati (foto/misure/esami)
- `m2ResumeDiscard()` — cleanup storage + cancellazione FK chain (body_check_photos + body_measurements + body_checks)
- `m2HandlePhotoSelect(pose, event)` — File object in memoria, preview locale via `URL.createObjectURL`, abilita CTA
- `m2RetakePhoto(pose)` — ripristina dropzone, revoca object URL, disabilita CTA
- `m2ContinuePhoto(pose, nextStep)` — upload Storage (path `{user_id}/{checkId}/{pose}.jpg`) + upsert `body_check_photos` con `onConflict:'check_id,pose'`
- `m2OpenPhotoReview`, `m2ModalKeep`, `m2ModalRetake` — modal full-screen review griglia s5
- `m2SetUnit(unit)` — switch KG·CM / LB·IN, aggiorna tutti i label dinamici
- `m2ContinueS6` — validazione peso/altezza con range realistici (30-250kg/66-550lb, 100-230cm/39-90in), conserva in `ST.m2.measurements` in metrico
- `m2ContinueS7` — validazione 3 obbligatori + 6 opzionali → metrico
- `m2ContinueS8` / `m2SaveMeasurementsAndSkipS8` — composizione opzionale, salva tutto in `body_measurements` con upsert su `check_id`
- `m2SaveMeasurements()` — upsert su `body_measurements` con `onConflict:'check_id'`
- `m2SetBloodGate(hasRecent)` — routa s10/s11, default test_date=oggi
- `m2SaveBloodTests()` — INSERT `blood_tests` (parametri vuoti = NULL)
- `m2Complete()` — UPDATE `body_checks` SET `status='completed', completed_at=now()`, popola summary, va all'app
- `m2ShouldShowEntry(profile)` — helper entry point: ritorna true se M1 completo + `m2_skipped !== true` + nessun `body_checks` completato esistente
- `loadAndStart_thenM2Entry()` — variante di `loadAndStart` chiamata dopo `saveOnboarding()` che instrada a `m2EntryIntro` invece di app

**Entry points hook**:
1. **`saveOnboarding()`** ([zona-tracker.html:2449](zona-tracker.html:2449)): al posto di `loadAndStart()` chiama `loadAndStart_thenM2Entry()`. In test mode (`test-user-001`) salta M2 e va dritto all'app.
2. **`loadAndStart()`** ([zona-tracker.html:3293](zona-tracker.html:3293)): nei 3 rami (cache-hit, errore-rete-con-cache-parziale, cache-miss) dopo `profileIsComplete(profile)`, controlla `m2ShouldShowEntry(profile)` → se true chiama `m2EntryIntro()` invece di `showScreen('app')`. Per utenti esistenti che hanno completato M1 ma non hanno mai fatto M2 (caso tester Ginevra/Isabella post-rollout).

**Casi edge gestiti**:
- **Resume cross-device**: `m2EntryIntro()` cerca `body_checks` `in_progress` su Supabase → mostra prompt resume con 2 CTA. "Riprendi →" usa heuristica `m2ResumeContinue` che legge foto/misure/esami già salvati e posiziona allo step coerente. "Ricomincia" elimina tutto (storage + 3 tabelle FK).
- **Foto rifatta dopo upload**: `upsert: true` su Storage sovrascrive il file. `body_check_photos` ha unique constraint su `(check_id, pose)` → upsert con `onConflict:'check_id,pose'`.
- **Conversione unità**: tutti gli input vengono convertiti a metrico prima di salvare. `unit_system` in `body_measurements` registra solo la preferenza utente per UI futura.
- **Validazione**: range realistici su s6 e obbligatori su s7 (3 campi). Tutti gli altri singolarmente skippabili.

**Test mode `?test=1`**: M2 SEMPRE skippato per `test-user-001`. Sia in `saveOnboarding` che in `m2ShouldShowEntry`. Quando vorrai testare M2, usa account reale.

**CSS nuove classi** (riuso pattern `.onb-*`, tutte prefissate `.m2-*`):
- `.m2-photo-dropzone` (box tratteggiato upload con instructions mono uppercase)
- `.m2-photo-thumb`, `.m2-photo-grid`, `.m2-photo-cell` (griglia conferma)
- `.m2-modal-photo-overlay` (modal full-screen review)
- `.m2-unit-switch` + `.m2-unit-btn` (toggle KG/LB)
- `.m2-meas-row` (label + input + unità inline)
- `.m2-meas-tip` (tip in corsivo sotto campo)
- `.m2-required-asterisk` (asterisco evergreen per obbligatori)
- `.m2-gate-btn` (bottoni grandi Sì/No s9)
- `.m2-divider` (separatore tra gruppi obbligatori/opzionali)

**Cosa NON è stato fatto** (volutamente fuori scope):
- Refactor M1 esistente (5 step legacy)
- Tinta viola Body — riservata ai checkpoint Body futuri
- Progress bar in M2 (decisione design 10 maggio: nessun conteggio numerico delle schermate)
- Illustrazioni dei punti di misurazione su s7 (icone ⓘ rimandate al design pass)
- Schermata 6b "vista grande" come componente full-screen separato — riusato modal generico `.m2-modal-photo-overlay` per review griglia s5
- Sezione "Crediti & attribuzioni" per M2 (non rilevante, no asset esterni)
- Lettura/visualizzazione dei check fisici passati nell'app (storico/timeline check)
- Notifica reminder esami sangue (TODO post-rollout)

**Roadmap aggiornata**:
- ✅ M2 Check Fisico (versione funzionale) — 13 maggio 2026
- 🔜 Design refinement M2 via Claude Design (font Syne, palette bone-caldo, illustrazioni ⓘ, gerarchia visiva rifinita)
- 🔜 Modulo Body — visualizzazione storico check fisici (timeline con foto + diff misure)
- 🔜 Reminder esami sangue (3-6 mesi dopo)

### 13 maggio 2026 — Recovery G3/G6: auto-collapse blocchi + micro-pause + stop blocco (UX post-uso reale)

Tre funzionalità basate su sessione reale del flow recupero. Commit `29eaac6`, versione `2026.05.13 · 15:10`. Solo flow recupero (recoveryUpper/recoveryLower) — flow attivazione 5 min, schema dati esercizi, `muscleImg`, modal AI: INTOCCATI.

- **Auto-collapse blocchi completati**: quando tutti gli esercizi di un blocco sono in `trainRecoveryDone`, dopo 2s il blocco si chiude automaticamente mostrando solo header compatto `▶ Nome ✓ — X.X min` (chevron + colore verde + tempo totale). Reset a `recoveryFlowStart` (nuova sessione = tutti espansi). Tap su header sempre cliccabile per toggle manuale (chevron `▶` chiuso / `▼` aperto). Stato `ST.trainRecoveryCollapsed: {blockName: true|false}` — `false` esplicito (intenzionalmente aperto) impedisce all'auto-collapse di richiudere quel blocco al prossimo tick.
- **Micro-pause smart tra esercizi (stesso blocco)** con logica detection su nome base:
  - `_stripSide(name)` rimuove suffisso ` dx`/` sx` case-insensitive
  - Se nomi base uguali (es. `Hip CARs dx` → `Hip CARs sx`) → pausa **5s**
  - Se nomi base diversi (es. `Hip CARs sx` → `90/90 hip switch`) → pausa **10s**
  - Hero card cambia palette: sfondo `#FFF7E0` + bordo `#D97706` (ambra), label mono `PROSSIMO ESERCIZIO TRA…`, countdown grande in ambra, nome prossimo esercizio sotto
  - Bottoni Skip/Back/Pause **disabilitati** (grigi `#DDD`, `cursor:not-allowed`, opacity .6) — la pausa non è interrompibile
  - Transizione automatica al countdown vero dell'esercizio al raggiungimento di 0
- **Stop automatico tra blocchi diversi**: il flow si mette in pausa autonomamente. Hero card mostra anteprima del prossimo blocco: label `PROSSIMO BLOCCO`, nome blocco grande, durata totale (`~N min`), lista compatta esercizi (nome + durata) scrollabile (max-height 280px). Solo 2 bottoni: ⏪ Indietro (torna a ultimo esercizio del blocco precedente, NO resume — `running=false`) + ▶ Riprendi (esistente `recoveryFlowResume`, no bottone dedicato). NO Skip durante stop blocco — forza l'utente a confermare il passaggio.

**Stato nuovo** in `ST.trainRecoveryFlow`:
```js
microPause: { active, remaining, total, nextExName }  // pausa 5s/10s tra esercizi stesso blocco
blockStop:  { active, nextBlockName, nextExStartIdx } // stop automatico tra blocchi diversi
```
+ `ST.trainRecoveryCollapsed: {blockName: true|false}` separato.

**Helper nuovi**: `_stripSide(name)`, `_allExercisesDoneInBlock(blockName, exs)`, `toggleRecoveryBlockCollapsed(blockName)`.

**Logica `_recoveryFlowAdvance` riscritta con priorità**:
1. Marca esercizio corrente come done (logica esistente)
2. Verifica se blocco corrente è completato → `setTimeout 2s` per auto-collapse (controlla `collapsed[name] !== false` per rispettare override manuale)
3. Se prossimo non esiste → fine sessione (logica esistente)
4. Se prossimo è in blocco diverso → attiva `blockStop`, ferma interval, NO avanzamento countdown
5. Se prossimo è in stesso blocco → attiva `microPause`, avanza `currentIdx` subito ma countdown è bloccato sul `microPause.remaining`

**Logica `_recoveryFlowTick`**: 2 branch — A) decrementa `microPause.remaining`, transizione automatica al countdown esercizio quando arriva a 0 / B) decrementa `flow.remaining` esercizio (esistente).

**Controlli sui pulsanti**:
- `recoveryFlowPause`: no-op durante microPause
- `recoveryFlowSkip`: no-op durante microPause e durante blockStop
- `recoveryFlowBack`: no-op durante microPause; durante blockStop torna a esercizio precedente con `running=false` (no auto-resume)
- `recoveryFlowResume`: se `blockStop.active`, resetta blockStop + setta `remaining` dal primo del nuovo blocco, poi riavvia interval

**Mutual exclusion** con flow attivazione invariata (la check su `trainActivationFlow.running` resta).

`closeTrainingSession()` resetta anche i nuovi sotto-stati (`microPause`, `blockStop`, `trainRecoveryCollapsed`).

### 12 maggio 2026 — muscleImg sugli esercizi recovery G3/G6 (riuso PNG esistenti)

- **Renderer modal AI `openExerciseAI`** ([zona-tracker.html:8071](zona-tracker.html:8071)): lettura prioritaria da `ex.muscleImg` (esplicito su esercizi recovery). Se `null` esplicito → no fallback a `EXERCISE_MEDIA[exName]`. Se `undefined` (esercizi forza Upper/Lower legacy) → fallback al vecchio percorso `EXERCISE_MEDIA[exName].muscleImg`. Retrocompat al 100% sui 20 esercizi forza esistenti.
- **G3 `recoveryUpper.exercises` (23)**: aggiunto campo `muscleImg` a tutti. 14 con immagine (riuso PNG da `assets/exercises/`: `shoulder-press-in-piedi`, `trazioni-sbarra`, `chest-press-orizzontale`, `row-inclinato`, `hip-thrust`, `bulgarian-split-squat`, `squat-talloni-rialzati`, `calf-raise`), 9 con `null` esplicito (Rotazione toracica seduto dx/sx, Circonduzioni caviglie dx/sx, Cat-Cow, World's greatest stretch dx/sx, Down dog→up dog).
- **G6 `recoveryLower.exercises` (28)**: aggiunto campo `muscleImg` a tutti. 19 con immagine (riuso `trazioni-sbarra`, `face-pull`, `chest-press-orizzontale`, `curl-bicipiti`, `hip-thrust`, `bulgarian-split-squat`, `squat-talloni-rialzati`, `romanian-deadlift`, `calf-raise`), 9 con `null` (collo dx/sx, Cobra pose, Knee-to-chest doppia, Savasana).
- **Totale**: **33 esercizi recovery con mappa muscolare visibile** + 18 con `null` esplicito (no immagine quando non c'è match anatomico ragionevole).
- **Nessun nuovo PNG aggiunto**: solo riuso degli 11 path già esistenti in `EXERCISE_MEDIA`.
- **`<img onerror="this.style.display='none'"/>`** già presente nel renderer (safety net per path errati). `hasMuscle = !!ai.muscleImg` condiziona il render dell'img.
- **Nessun task GIF/movimento** in questo round — solo `muscleImg`. GIF rimandate a task separato.

### 12 maggio 2026 — Blocco Attivazione 5 min con countdown ibrido + cleanup G3/G6

- **Rimossi** primi 2 esercizi (Respirazione diaframmatica + Vacuum addominale) dal Blocco 1 di entrambi G3 (`recoveryUpper.exercises` 25 → 23) e G6 (`recoveryLower.exercises` 28 → 26). Questi 2 esercizi sono già coperti dal Blocco Attivazione standard sopra (Respirazione 360° 120s + Vacuum 120s + Cat-Cow 60s).
- **Blocco Attivazione trasformato in flow countdown autonomo** identico al recovery: hero card con 3 stati (non avviato / in corso / completato) + lista 3 esercizi raggruppati. Si applica a TUTTE le 6 sessioni (upperA/upperB/lowerA/lowerB/recoveryUpper/recoveryLower).
- **Rimossi** dalla lista esercizi attivazione: tempo `MM:SS` per riga + bottone ▶ piccolo per riga. Mantengono solo checkbox + nome + durata in formato `60s/120s`. Il countdown grande è ora nella hero card.
- **Nuovo state** `ST.trainActivationFlow = {active, currentIdx, remaining, running, _iv}` parallelo a `trainRecoveryFlow`.
- **`ST.trainActivation`** (array booleani done per indice) riusato come done state — niente nuovo `trainActivationDone`. Bypass collisioni nomi tra attivazione e recovery.
- **Nuove funzioni globali**: `activationFlowStart/Pause/Resume/Skip/Back/End` + interne `_activationFlowTick`, `_activationFlowAdvance` (triple beep + vibration + auto-next), `_activationFlowClearInterval`, `_activationFlowCurrentExercise`. `checkActivationSessionDone()` mostra toast "Attivazione completata ✓" (no save workout — l'attivazione è preparatoria).
- **Mutual exclusion** via disable visivo: bottone "▶ Start" attivazione grigio + `cursor:not-allowed` + nota "Recupero in corso" se `trainRecoveryFlow.running`; specularmente bottone "▶ Start" recovery grigio + nota "Attivazione in corso" se `trainActivationFlow.running`. `activationFlowStart/Resume` e `recoveryFlowStart/Resume` controllano lo stato dell'altro flow e early-return se attivo.
- **Helper `_renderActivationSection()`** dedicato (analogo a `_renderRecoverySection`): produce wrapper card + hero + lista. Sostituisce il vecchio renderer inline di ~35 righe in `renderTraining`. Tinta blu (`#185FA5` + `#E8F0FA`) per distinguersi dal verde recupero (`#2A7A6F` + `#E6F4F2`).
- **Cleanup in `closeTrainingSession()`**: ferma anche `trainActivationFlow._iv` e azzera lo state.
- **Funzioni legacy timer per-esercizio attivazione DORMANTI**: `startActivationTimer`, `pauseActivationTimer`, `resetActivationTimer`, `editActivationTimer` (e `_ensureActivationTimers`, `_fmtMMSS`, `resetAllActivationTimers`) restano nel codice ma non più chiamate dalla UI. `toggleActivation(idx)` ancora usata per check manuale opzionale. Da rimuovere in housekeeping futuro insieme a `ST.trainActivationTimers` array.

### 12 maggio 2026 — Recovery G3/G6 ristrutturate: micro-esercizi + countdown ibrido

- **G3 `recoveryUpper`** ora "Recupero Mobilità — G3": 25 micro-esercizi in 5 blocchi (Attivazione · Spalle e colonna toracica · Anche · Caviglie e polpacci · Integrazione globale), totale ~20 min. Focus mobilità articolare dinamica full body.
- **G6 `recoveryLower`** ora "Recupero Stretching — G6": 28 micro-esercizi in 7 blocchi (Attivazione · Catena posteriore alta · Catena anteriore alta · Glutei e lombari · Catena anteriore gamba · Catena posteriore gamba · Chiusura), totale ~20 min. Focus allungamento statico full body.
- **Schema dati nuovo per esercizio recovery**: `{name, duration_sec, block, side?, muscles[], execution[], commonErrors[]}` — sostituisce il vecchio schema con `reps:'N min'` parsato via regex. Nomi univoci con suffisso `dx`/`sx` per le chiavi `trainRecoveryDone`.
- **UX countdown ibrido** (nuova): hero card con bottone "▶ Start sessione" + lista raggruppata per blocco. All'avvio: hero focalizzata con countdown grande (MM:SS), nome esercizio + side badge, controlli **⏪ Indietro** · **⏸/▶ Pausa/Riprendi** · **⏩ Skip**, barra progresso lineare. Al termine countdown → vibrazione + triple-beep + auto-advance al prossimo esercizio. All'ultimo esercizio: schermata 🎉 "Sessione completata" + salvataggio workout via `checkRecoverySessionDone`.
- **Stato nuovo `ST.trainRecoveryFlow`** = `{active, currentIdx, remaining, running, _iv}`. Default `active:false`. `closeTrainingSession()` ferma `_iv` e azzera lo state.
- **Nuove funzioni globali**: `recoveryFlowStart/Pause/Resume/Skip/Back/End` + interni `_recoveryFlowTick`, `_recoveryFlowAdvance`, `_recoveryFlowClearInterval`, `_recoveryFlowCurrentExercise`.
- **Render via helper dedicato** `_renderRecoverySection(s, sel)`: branching `s.type === 'Recupero'` prima del `s.exercises.map(...)` esistente. La logica non-recovery resta identica e intatta.
- **Funzioni legacy timer per-esercizio dormienti** (NON rimosse): `startRecoveryTimer / pauseRecoveryTimer / resumeRecoveryTimer / resetRecoveryTimer` non più chiamate dalla UI nuova. `toggleRecoveryDone` resta in uso per check manuale opzionale nella lista. State `ST.trainRecoveryTimers` resta inizializzato come `{}` ma non popolato.
- **Compatibilità preservata**: ID `recoveryUpper`/`recoveryLower` invariati, `type:'Recupero'`, `rir:null`, `rest:null`, `SESSION_CYCLE`, `SESSION_DAY_NUM`, `SESS_LABEL`/`SESS_COLOR` invariati. `checkRecoverySessionDone` lavora identico (itera `sess.exercises` e legge `trainRecoveryDone[ex.name]`). Modal scheda AI (`openExerciseAI`) continua a funzionare leggendo `execution/commonErrors/muscles`.
- **Attivazione 5 min iniziale** (Cat-Cow, diaframmatica, vacuum) preservata per OGNI sessione, inclusi recovery. Nei nuovi G3/G6 i primi due esercizi del Blocco "Attivazione" includono Respirazione diaframmatica 60s + Vacuum addominale 60s come ripetizione voluta (richiesta utente esplicita).

### 12 maggio 2026 — Fix integratori extra: kcal nel totale + card collassabile

- **Bug 1 (critico)**: extra integratori (es. `High Protein Energy Bar Cocco`, 203 kcal) loggati ma kcal/macro non sommati al totale giornaliero. Cause: `suppTotalsForIds()` somma solo gli integratori in `ST.supps` via `suppsTaken`, ignora i `rawSuppLogs` di catalogo non-standard. Effetto: anello kcal Home + barre macro Home + anello Nutrition Hero + grafico ANDAMENTO CALORIE mostravano "kcal fantasma" mancanti.
- **Fix**: nuovo helper `extraSuppsTotals(day)` ([zona-tracker.html:1500](zona-tracker.html:1500)) che somma kcal/macro dei `rawSuppLogs` con nome NON in `ST.supps`. Math coerente con `extraSuppCardHTML`: `mult = log.dose / supp.dose_die`. Filtro `standardNames.has(log.name)` evita doppi conteggi.
- **Helper unico `dayTotals(day)`** ([zona-tracker.html:1528](zona-tracker.html:1528)) introdotto come somma completa (pasti + standard + extra). Adottato in 5 punti che prima usavano combinazioni manuali:
  - Home `renderHome()` `cons`
  - Nutrition Oggi `renderOggi()` `cons`
  - `fetchAdvice()` `cons` (prompt AI suggerimenti)
  - Storico `renderStorico()`: avgKcal/Prot/Carbs/Fat, adherence rate, maxKcal grafico, barre giornaliere chart ANDAMENTO CALORIE
  - Storico card per giorno (col kcal totale + barre macro per pasti)
- **Card EXTRA in timeline collassabile** ([zona-tracker.html:6763-6779](zona-tracker.html:6763)) come gruppi MAMI/PRANZO/SNACK: freccia ▶/▼, etichetta da "+ EXTRA" a "Integratori extra", kcal totale visibile nell'header collassato (es. `203 kcal`), tap su × non triggera toggle (event.stopPropagation), tap su header espande la card dettagliata con dose editabile e chip macro
- **Stato nuovo** `ST.extraSuppExpanded` ([zona-tracker.html:1293](zona-tracker.html:1293)): chiave per riga `(name|time)` sanitizzata, default vuoto = tutte collassate, no persistenza tra reload
- **Handler** `window.toggleExtraSupp(extraKey)` parallelo a `toggleMealCard` / `toggleMealItem`

### 12 maggio 2026 — Fase 4 Smart Ingredient: edit pasto + orario inline

- Tap matita ✏️ in timeline apre lo stesso form Smart Ingredient pre-compilato con gli items esistenti (collassati di default come post-Analizza)
- Salvataggio in modalità edit: `UPDATE meals` + `DELETE meal_items WHERE meal_id=...` + `INSERT meal_items` (pattern robusto, evita delta complicati)
- Pasti vecchi monolitici (1 item da migrazione Fase 1) o pasti orfani senza items: editabili come 1 ingrediente preriempito dalla descrizione, "promossi" a strutturati al salvataggio
- Banner header dinamico: "✏️ Modifica pasto" con colore `var(--acc)` in modalità edit, "+ Registra pasto" con `var(--t2)` in modalità nuovo
- Bottone "← Annulla modifica" visibile solo in modalità edit → richiama `smartResetForm()` che azzera anche `editingMealId/Slot/Time/Description`
- `event.stopPropagation()` sul bottone matita per evitare che il tap espanda il pasto contemporaneamente
- Orario cliccabile direttamente nell'header collassato della card timeline (`<input type="time">` dentro la meta-riga `19:34 · 2 ingredienti`)
- Rimosso input orario duplicato dal corpo espanso (meno UI rumorosa)
- Nuovo state: `ST.smartForm.editingMealId/Slot/Time/Description` (null in modalità nuovo)
- Handler `window.smartOpenEdit(date, mealId)` pre-fetcha items da Supabase se non presenti in cache locale, scrolla automaticamente al form via `id="registra-pasto-form"`
- `setLogSlot()` e close-button reset includono ora anche i 4 nuovi campi edit per pulizia stato
- **Roadmap Smart Ingredient chiusa: Fasi 1-2-3-4 tutte completate** 🎉
- Funzioni legacy dormienti (non chiamate da UI, lasciate per housekeeping futuro): `openEditMealModal` ([zona-tracker.html:7685](zona-tracker.html:7685)), `saveEditMeal`, `closeEditMealModal`, modal HTML `#edit-meal-modal` ([zona-tracker.html:861](zona-tracker.html:861)), `logMeal` ([zona-tracker.html:8396](zona-tracker.html:8396)), `estimateMacrosLegacy`

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
- **Editor Pacchetto: emoji picker e time picker usano `prompt()` nativo** — UX scadente su mobile (il prompt iOS richiede tap doppio, no clipboard suggestion per emoji). Da sostituire con: `<input type="time">` nascosto + emoji-grid custom o sheet picker. Documentato come decisione in autonomia al Blocco 1.

## Note

- L'unico file da toccare normalmente è `zona-tracker.html`
- Il client Supabase si chiama `supa` (non `supabase`)
- La regola d'oro: un passo alla volta, Ignazio conferma con "ok/fatto" prima di procedere

### Debug cross-device

- **Versione attiva:** ogni device mostra in fondo a ogni tab principale `v${APP_VERSION}` nel formato `vYYYY.MM.DD · HH:mm`. Confronta i numeri sui device per capire chi ha la build vecchia.
- **Account loggato senza fare logout:** apri Impostazioni profilo (icona ⚙️ in alto a destra) — la prima card mostra l'email attiva (`ST.user.email`). Evita di consumare OTP per "vedere chi è loggato".
- **Web Inspector iPhone:** collegabile via cavo a Safari Mac (Sviluppo → nome iPhone → pagina). Utile per query diagnostiche dirette a Supabase quando i dati visualizzati non corrispondono al DB. Esempio: `await supa.from('meals').select('*').eq('user_id', ST.user.id).eq('date', '2026-05-04')` per controllare la realtà del DB confrontandola con `ST.db.days[...].meals`.
