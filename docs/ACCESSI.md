# Chi può leggere e toccare cosa

*(dal 2 ottobre 2026 — Fondamenta 040)*

La chiave scritta nella pagina è quella pubblica: **tutta la protezione dei dati sta nelle regole di accesso di ogni tabella**. Le regole sono in git ([fotografia zero](../supabase/migrations/20261002_fotografia_zero.sql)) e si provano dal vivo con un comando:

```bash
python3 tools/prova_accessi.py
```

Per ogni persona vera e per chi non è entrato prova, tabella per tabella, che non si leggono, non si modificano, non si cancellano e non si inseriscono righe di un altro; che i cataloghi comuni non si scrivono dall'app; che le foto del bucket privato si vedono solo dalla propria cartella. **Niente resta scritto**: ogni tentativo è annullato subito e l'intera prova finisce con un annullamento generale; a fine giro lo strumento ricontrolla che i conteggi di tutte le tabelle siano identici. Non legge dati: conta righe.

⚠️ **Si rilancia dopo ogni tabella nuova e dopo ogni modifica alle regole.** Una tabella senza proprietario che non è fra i cataloghi dichiarati viene segnalata.

## Esito del 2 ottobre 2026

4 account + chi non è entrato, 121 prove a testa.

| | |
|---|---|
| **26 tabelle con i dati delle persone** | ✅ nessuno legge, modifica, cancella o inserisce righe di un altro; chi non è entrato non vede niente |
| **Foto dei check** (bucket privato, 20 foto) | ✅ visibili solo dalla propria cartella |
| `esercizi_catalog`, `biblioteca_gif` | ✅ sola lettura dall'app (`biblioteca_gif` solo dopo l'accesso) |
| `nutrilite_catalog` | ❌ **chiunque, anche senza entrare, può modificare, cancellare e inserire** |
| `exercise_media` | ❌ **chiunque, anche senza entrare, può modificare e inserire** |

La correzione dei due cataloghi è pronta e **non eseguita**: [`20261002_chiudi_scrittura_cataloghi.sql`](../supabase/migrations/20261002_chiudi_scrittura_cataloghi.sql). Toglie tre regole; l'app e il Worker non le usano.

Lettura non dimostrabile perché la tabella è vuota: `ai_memory`, `blood_tests`, `weekly_plan_acceptance` (le scritture sono provate comunque). Per `blood_tests` la prova diventa piena al primo esame registrato.

## La regola «admin»

La dashboard legge i dati di tutti grazie a una regola di **sola lettura** legata all'email dentro il gettone di accesso (`auth.jwt() ->> 'email' = 'ignazio.f@me.com'`), presente su 13 tabelle: `profiles`, `meals`, `workouts`, `body_logs`, `weight_logs`, `supplements_log`, `supplement_packages`, `supplement_package_items`, `schede_utente`, `weekly_plans`, `weekly_plan_meals`, `weekly_plan_acceptance`, `ai_memory`.

**L'admin non vede**: foto e misure dei check, letture AI dei check, esami del sangue, ingredienti dei pasti, serie di allenamento, note di allenamento, quadri settimanali, proposte di Pirsi, integratori in libreria, digiuni. E **non può scrivere** sulle righe di nessun altro: provato.

L'email è scritta dentro 13 regole: cambiarla o aggiungere un secondo admin vuol dire riscriverle tutte.
