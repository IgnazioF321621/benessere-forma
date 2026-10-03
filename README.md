# Zona Tracker

App per il telefono (PWA) di benessere e forma: nutrizione, allenamento, misure del corpo e un coach, Pirsi. Un solo utente attivo oggi, altri tester su Nutrition e Body. È pubblicata su GitHub Pages:
https://ignaziof321621.github.io/benessere-forma/zona-tracker.html

Le regole di lavoro, lo stato e le lezioni stanno in [`CLAUDE.md`](CLAUDE.md) e in `docs/`. Questo file dice solo dove sono le cose e come si provano.

## Dove stanno i file

| Cosa | Dove |
|---|---|
| La pagina dell'app: configurazione, versione, avvio e accesso, navigazione | `zona-tracker.html` |
| Il codice dell'app, un file per sezione: stile, comune, Home, Nutrition, Training, Body, Pirsi, onboarding, impostazioni | `app/` |
| I moduli condivisi fra app e Worker: totali della giornata, quadro settimanale, regole del coach, ritratto | `shared/` |
| Il service worker: salva l'app sul telefono, rete prima con un tempo massimo | `sw.js` |
| Installazione sul telefono: manifest e icone (`node tools/icone/genera.js` le ridisegna) | `manifest.webmanifest`, `assets/icone/` |
| Il Worker su Cloudflare: proxy del coach, GIF, lettura delle foto, cron del lunedì | `worker/` |
| Lo schema del database Supabase e le migrazioni | `supabase/`, `docs/SCHEMA.md`, `docs/SCHEMA_TABELLE.md` |
| Il pannello di amministrazione, sola lettura | `dashboardzona.html` |
| Il banco di prova e gli strumenti | `tools/banco/`, `tools/` |
| Cantieri aperti, lezioni, nomenclatura degli esercizi, media, coach, training | `docs/` |

L'app usa Supabase (dati, accesso, foto), un Worker Cloudflare (Groq per i testi del coach, Gemini per le foto dei check) e GitHub Pages. Tutto nei piani gratuiti.

## Come si prova

Il banco gira senza rete e senza server: carica la pagina vera in jsdom con un finto Supabase e fixture in memoria. Serve Node 22 e `jsdom` (`NODE_PATH` deve vederlo).

```sh
node tools/banco/prova_pagina_divisa.js        # la pagina divisa in file resta intera, elenco del service worker
node tools/banco/prova_ordine_caricamento.js   # niente usa al caricamento un nome che arriva dopo
node tools/moduli.js                           # i moduli di shared/ sono richiamati una volta, senza copie
node tools/banco/prova_<nome>.js               # una prova per ogni comportamento: elenco in tools/banco/README.md
node tools/banco/conta_richieste.js            # quante richieste a Supabase fanno apertura, rientro e giro dei tab
node tools/banco/funzioni_morte.js             # funzioni dichiarate e mai chiamate (deve dare 4, tutte volute)
node tools/banco/prova_browser.js              # Chrome vero, in locale
```

Prima di salvare passano tutte. Il Worker ha le sue prove in `worker/test/`.

## Chi pubblica

Ogni sessione di lavoro fa commit sul proprio ramo, aggiungendo i file per nome, e spinge solo su quel ramo. **Solo la sessione «REGIA [Audit/Rilascio]» unisce in `main`**, mette la versione (`bash tools/rilascio/versione.sh`) e pubblica: GitHub Pages pubblica `main`, il Worker si pubblica a parte con `wrangler deploy` da `worker/`. La lista dei lavori è in Evernote, spazio «Zona-Tracker», un taccuino per titolo. La fonte è GitHub: il Mac è una copia come le altre, aggiornata con `git pull` dopo ogni unione.
