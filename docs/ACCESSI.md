# Chi può leggere e toccare cosa

*(dal 2 ottobre 2026 — Fondamenta 040)*

La chiave scritta nella pagina è quella pubblica: **tutta la protezione dei dati sta nelle regole di accesso di ogni tabella**. Le regole sono in git ([fotografia zero](../supabase/migrations/20261002_000_fotografia_zero.sql)) e si provano dal vivo con un comando:

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

**Corretto lo stesso giorno**, con l'ok di Ignazio: [`20261002_chiudi_scrittura_cataloghi.sql`](../supabase/migrations/20261002_chiudi_scrittura_cataloghi.sql) ha tolto le tre regole che lasciavano scrivere chiunque. Dopo: **129 prove su 129 a posto per tutti e cinque**, i due cataloghi si leggono come prima (66 e 57 righe anche senza entrare) e il servizio continua a scriverli. Le tre regole tolte restano scritte nella fotografia zero.

Lettura non dimostrabile perché la tabella è vuota: `ai_memory`, `blood_tests`, `weekly_plan_acceptance` (le scritture sono provate comunque). Per `blood_tests` la prova diventa piena al primo esame registrato.

**Dopo `app_errors`** (tabella nuova dello stesso giorno, [Fondamenta 060](../supabase/migrations/20261002_app_errors.sql)): 27 tabelle personali, 125 prove a testa, le 4 in più tutte a posto. Chi è entrato inserisce solo errori a proprio nome e non li rilegge; li legge solo l'admin (la regola admin sale così a 14 tabelle).

**Dopo `daily_log`** (il diario del giorno, [Fondamenta 050](../supabase/migrations/20261002_daily_log.sql)): 28 tabelle personali, 129 prove a testa, le 4 in più tutte a posto. Ognuno legge e scrive solo le proprie giornate; **nessuna regola admin**: sonno, energia e stress non si vedono dalla dashboard.

**Dopo la pulizia dei tester** (6 ottobre 2026, Fondamenta 230): nel database c'è un solo account, e la prova si fermava cercando «un'altra persona» da usare come intrusa. Ora `tools/prova_accessi.py` aggiunge sempre una **persona finta**: un id che non è in `auth.users`, un'email che non è dell'amministratore, zero righe sue. Per le regole è una persona entrata come un'altra, e tutte le righe che esistono sono «di un altro»: la lettura di righe altrui è dimostrata davvero (prima, con un solo account, restava a vuoto). Esito: 3 attori (l'account, la persona finta, chi non è entrato), **134 prove su 134 a posto** per tutti e tre, 29 tabelle personali, conteggi identici prima e dopo. Le scritture dell'amministratore sono ammesse solo dove la regola lo dice (`segnalazioni`: letta, risolta, risposta); l'elenco si legge dalle regole, non si suppone.

**Dopo «Invia Feedback»** (tabella `segnalazioni`, migrazione `20261006_220`, e bucket privato `segnalazioni`, migrazione `20261006_230_segnalazioni_screenshot.sql`): la tabella è provata dal vivo come le altre. Il bucket si prova da solo quando esiste (la prova lo salta e lo dice finché la migrazione non è stata eseguita): per ogni bucket privato conta i file non suoi e tenta di scrivere nella cartella di un altro. **La migrazione 230 è stata provata prima di eseguirla, dentro una transazione annullata** (niente è rimasto: bucket, campo e regole a zero dopo): la persona scrive e riscrive solo nella sua cartella, non scrive in quella di un altro, non vede i suoi file; l'amministratore legge i file di tutti e aggiorna letta/risolta/risposta; chi non è entrato non scrive e non legge niente; il bucket è privato, 1 MB, solo JPEG. La cancellazione diretta in `storage.objects` la blocca Supabase da sé: non si prova.

## La regola «admin»

La dashboard legge i dati di tutti grazie a una regola di **sola lettura** legata all'email dentro il gettone di accesso (`auth.jwt() ->> 'email' = 'ignazio.f@me.com'`), presente su 13 tabelle: `profiles`, `meals`, `workouts`, `body_logs`, `weight_logs`, `supplements_log`, `supplement_packages`, `supplement_package_items`, `schede_utente`, `weekly_plans`, `weekly_plan_meals`, `weekly_plan_acceptance`, `ai_memory`.

**L'admin non vede**: foto e misure dei check, letture AI dei check, esami del sangue, ingredienti dei pasti, serie di allenamento, note di allenamento, quadri settimanali, proposte di Pirsi, integratori in libreria, digiuni. E **non può scrivere** sulle righe di nessun altro: provato.

L'email è scritta dentro 13 regole: cambiarla o aggiungere un secondo admin vuol dire riscriverle tutte.
