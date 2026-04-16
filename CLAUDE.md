# Zona Tracker

App wellness single-file HTML, hostata su GitHub Pages.

## File principale

`zona-tracker.html` — tutta l'app è in questo unico file (HTML + CSS + JS).

## URL pubblico

https://ignaziof321621.github.io/benessere-forma/zona-tracker.html

## Repository

https://github.com/IgnazioF321621/benessere-forma

## Stack tecnico

- HTML/CSS/JavaScript puro
- Nessun framework, nessun build step
- Un solo file da modificare: `zona-tracker.html`

## Servizi esterni

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignaziof23.workers.dev` | Proxy verso Groq API (llama-3.3-70b-versatile) |
| Supabase | `https://qxiyeiahpoiliwpqslpr.supabase.co` | Database |

## Schema Supabase

### Tabella `meals`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` DEFAULT gen_random_uuid() PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users, ON DELETE CASCADE |
| `date` | `date` NOT NULL | formato YYYY-MM-DD |
| `time` | `text` | orario HH:MM |
| `slot` | `text` | colazione / pranzo / cena / snack |
| `description` | `text` NOT NULL | testo libero del pasto |
| `kcal` | `integer` | stimato dall'AI |
| `protein` | `integer` | grammi |
| `carbs` | `integer` | grammi |
| `fat` | `integer` | grammi |
| `notes` | `text` | nota breve AI, nullable |
| `created_at` | `timestamptz` DEFAULT now() | |

RLS abilitata — policy: `auth.uid() = user_id`.

### Tabella `nutrilite_catalog`
| Colonna | Tipo |
|---|---|
| `id` | `serial` PK |
| `sort_order` | `integer` |
| `name` | `text` |
| `slot` | `text` |
| `grp` | `text` |
| `kcal / protein / carbs / fat` | `integer` |
| `price` | `numeric(8,2)` |
| `doses` | `integer` |
| `note` | `text` |

25 prodotti Nutrilite pre-inseriti. RLS abilitata — policy SELECT pubblica (`USING (true)`), nessun `user_id`.

### Altre tabelle
- `profiles` — dati utente e target macro (target_kcal, target_protein, target_carbs, target_fat, weight_kg, goal_weight_kg, ecc.)
- `supplements` — integratori per user_id (editabili inline)
- `supplements_log` — tracciamento assunzioni giornaliere per data e nome integratore
- `fasting_days` — giorni di digiuno per user_id

## Funzionalità implementate

### Tab Oggi
- Navigazione tra giorni passati/oggi
- Ring progress calorie + barre macro (P/C/G)
- Sezione integratori del giorno con toggle assunto/non assunto
- Suggerimento AI per il pasto successivo (Cloudflare Worker → Groq)
- Registrazione pasto con stima AI dei macro
- Badge "Giorno Perfetto" se tutti i macro sono centrati
- Toggle digiuno giornaliero

### Tab Integratori
- Lista integratori personali raggruppati per orario
- Editing inline di tutti i campi (nome, slot, grp, nota, macro, prezzo, dosi)
- Toggle attivo/inattivo, eliminazione
- Bottone **+ Aggiungi** → modal form completo con tutti i campi
- Bottone **Catalogo Nutrilite** → modal 2-step:
  - Step 1: selezione prodotti (spunta verde = nel profilo, spunta rossa = da rimuovere)
  - Step 2: riepilogo con orari editabili per i nuovi prodotti + elenco rimozioni
  - Conferma rimozione con dialog nominativo
  - "Seleziona tutti" aggiunge solo i prodotti non ancora presenti
- Calcolo costo mensile/annuo integratori attivi

### Tab Storico
- Report 7/14/30 giorni con medie macro e aderenza al piano
- Mini grafico andamento calorie
- Elenco giorni con dettaglio macro

### Tab Piano
- Target 40·30·30 personalizzato (calcolato con Mifflin-St Jeor + TDEE)
- Timeline giornaliera integratori e pasti
- Priorità cliniche (ferritina, sistema immunitario, infiammazione)
- Regole fuori casa

## Fix applicati in questa sessione

- **`suppTotalsForIds`**: aggiunto `||0` come fallback su kcal/protein/carbs/fat per evitare NaN nel ring calorie
- **`dbToggleSuppTaken`**: ora salva lo slot reale dell'integratore invece della stringa vuota `''`
- **Bottone conferma catalogo**: reset di `disabled` in `closeCatalogModal()` e `goToCatalogStep2()` per evitare che rimanga bloccato dopo il primo uso

## Deploy

Per pubblicare le modifiche:

```bash
git add zona-tracker.html
git commit -m "Descrizione della modifica"
git push https://IgnazioF321621:TOKEN@github.com/IgnazioF321621/benessere-forma.git main
```

GitHub Pages si aggiorna automaticamente dopo il push (di solito in 1-2 minuti).

> Il push richiede un Personal Access Token GitHub (scope `repo`). Non usare la password.

## Prossimi step

- [ ] Testare tutto su dispositivo mobile (iOS Safari) — in particolare i modal, i touch event sui checkbox del catalogo e il layout
- [ ] Implementare Supabase Auth per supporto multi-utente (attualmente l'app usa magic link ma è pensata per utente singolo)
- [ ] Valutare aggiunta campo `supplement_id` (FK) in `supplements_log` al posto del match per nome, per evitare rottura dello storico quando si rinomina un integratore

## Note

- Non serve compilare niente, non serve installare niente.
- L'unico file da toccare normalmente è `zona-tracker.html`.
- Il branch di lavoro è `main`.
- Il catalogo Nutrilite vive su Supabase (`nutrilite_catalog`) — per aggiungere prodotti basta inserire righe nella tabella, zero codice.
