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
- File principali: `zona-tracker.html`, `auth-callback.html`

## Servizi esterni

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignaziof23.workers.dev` | Proxy verso Groq API (llama-3.3-70b-versatile) |
| Supabase | `https://qxiyeiahpoiliwpqslpr.supabase.co` | Database + Auth |

## Autenticazione

**Metodo attuale: OTP a 6 cifre via email** (da aprile 2026)

Flusso:
1. Utente inserisce email → `signInWithOtp({ email, options: { shouldCreateUser: true } })`
2. Supabase invia email con codice a 6 cifre (NON un link)
3. Utente inserisce il codice nella PWA → `verifyOtp({ email, token, type: 'email' })`
4. Login completato direttamente nella PWA, senza uscire dall'app ✅

**Perché OTP e non Magic Link:**
- I Magic Link aprono il browser di sistema (Safari su iOS), che ha localStorage isolato dalla PWA
- Su iOS non esiste modo di aprire una PWA installata tramite link esterno
- L'OTP funziona su iOS PWA, Android PWA, Safari, Chrome, Arc — qualsiasi scenario

**`auth-callback.html`** rimane nel repo come fallback (supporta sia flusso implicito con hash token che PKCE con `?code=`), ma non viene più usato nel flusso principale.

**Redirect URLs autorizzati in Supabase** (Authentication → URL Configuration):
- `https://ignaziof321621.github.io/benessere-forma/zona-tracker.html`
- `https://ignaziof321621.github.io/benessere-forma/auth-callback.html`

**Rate limit Supabase:** durante i test intensivi si può raggiungere il limite OTP. Aspettare 1 ora per il reset.

## Bootstrap auth (`zona-tracker.html`)

Il bootstrap (in fondo al file, dentro `setTimeout(..., 1800)`) gestisce questi casi in ordine:
1. `?test=1` → modalità test locale
2. Hash con `#access_token=...&refresh_token=...` → flusso implicito (da auth-callback.html)
3. Query param `?code=...` → flusso PKCE
4. `getSession()` → sessione esistente (cookie/localStorage)
5. Nessuna sessione → mostra schermata auth
6. `onAuthStateChange` → ascolta eventi SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
7. `visibilitychange` → polling sessione quando la PWA torna in foreground

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

### Auth
- OTP a 6 cifre via email (schermata a 2 step: email → codice)
- Onboarding 5 step per nuovi utenti → calcolo TDEE automatico (Mifflin-St Jeor)
- Modal impostazioni profilo con esami del sangue
- Modal peso con ricalcolo TDEE

### Tab Oggi
- Navigazione tra giorni passati/oggi
- Hero ring SVG con calorie e percentuale — colore dinamico: teal `#2A7A6F` se macro In Zona, rosso `#B84C2A` se fuori, ambra se dati insufficienti
- Label "In Zona / Fuori Zona" dentro il ring sotto la percentuale
- Frasi motivazionali a due assi: fascia kcal% × stato zona macro (verde/rosso/neutro)
- Barre macro (P/C/G) con pill percentuale
- Zona row in fondo all'hero: C% · P% · G% vs 40·30·30 con badge
- Timeline cronologica unificata pasti + integratori + voci EXTRA
  - Evento `meal`: card pasto con badge "In Zona / Fuori Zona" per quel pasto
  - Evento `supp`: gruppo integratori collassabile con orario editabile
  - Evento `supp_log`: voce EXTRA (integratore preso fuori gruppo) con dose indipendente
- Registrazione pasto con stima AI dei macro (slot: ☕🥗🫕🥜)
- Registrazione integratori: flusso Gruppo (spunta da lista) + flusso Singolo (da catalogo, orario libero)
- Più assunzioni dello stesso integratore in momenti diversi: ogni voce è indipendente nella timeline
- Suggerimento AI per il pasto successivo ("Analizza e suggerisci")
- Badge "Giorno Perfetto" (gradiente oro, confetti, animazione pop):
  - Appare sotto l'hero, sopra la timeline
  - Oggi: solo se orario ≥ 21:00 E macro In Zona E kcal > 800
  - Giorni passati: se il giorno ha qualificato (flag `day.giornoPerfetto` salvato in cache)
  - Retroattivo: per giorni passati già qualificati il flag viene impostato al primo accesso
- Toggle digiuno giornaliero
- Integratori visibili e spuntabili anche nei giorni di digiuno

### Tab Integratori
- Lista integratori personali raggruppati per orario
- Editing inline di tutti i campi
- Toggle attivo/inattivo, eliminazione, drag & drop
- Modal "+ Aggiungi" con form completo
- Modal "Catalogo Nutrilite" 2-step con slot editabili
- Cost banner mensile/annuale
- Slot filter chips

### Tab Storico
- Report 7/14/30 giorni con medie macro e aderenza
- Mini grafico andamento calorie

### Tab Piano
- Target 40·30·30 personalizzato
- Piano AI settimanale + suggerimento singolo con ↻ Rigenera
- Priorità cliniche dinamiche (da esami del sangue)

## Deploy

```bash
cd ~/benessere-forma
git add -A
git commit -m "Descrizione della modifica"
git push origin main
```

GitHub Pages si aggiorna automaticamente dopo il push (1-2 minuti).

## Architettura stato locale (localStorage)

`ST.db.days[YYYY-MM-DD]` contiene per ogni giorno:
- `meals[]` — pasti registrati
- `suppsTaken[]` — local_id integratori spuntati (per gruppo)
- `rawSuppLogs[]` — `{name, time, dose}` per ogni voce in supplements_log (ricaricato da Supabase)
- `fasting` — boolean digiuno
- `giornoPerfetto` — boolean, impostato quando badge guadagnato, persiste nei giorni passati

`loadTodaySuppLog()` → ricarica supplements_log da Supabase e ricostruisce `rawSuppLogs` + `suppsTaken` per oggi.
`refreshTimeline()` → `loadTodaySuppLog()` + `renderOggi()` + `saveCache()`.

### Logica zona macro
Soglie: Carbo 35–45% · Proteine 25–35% · Grassi 25–35% delle kcal totali.
Usata in: hero ring color, zona label nel ring, frasi motivazionali, badge pasto, badge Giorno Perfetto.
Sempre con `Math.round()` prima del confronto per coerenza tra tutti i punti.

## Prossimi step

- [ ] Pannello admin — vista separata per gestire utenti, catalogo, statistiche
- [ ] Modalità test `?test=1` — completare e verificare il flusso completo
- [ ] Redesign restante — completare avvicinamento al mockup Claude Design
- [ ] Distribuzione via Glide — esplorazione futura per altri utenti
- [ ] Fix backfill macro integratori vecchi (query SQL su supplements con join nutrilite_catalog per codice)
- [ ] Dose integratore EXTRA non persiste al reload (supplements_log non ha colonna `dose`) — aggiungere `dose numeric default 1` su Supabase

## Bug noti

- Alcuni integratori vecchi in `supplements` mostrano macro a `—` perché inseriti prima del fix del join con `codice` — risolvibile con query SQL di backfill
- La funzione `updateSuppSlotTime` è presente nel codice ma non ancora testata in produzione

## Note

- Non serve compilare niente, non serve installare niente.
- L'unico file da toccare normalmente è `zona-tracker.html`.
- Il branch di lavoro è `main`.
- Il catalogo Nutrilite vive su Supabase (`nutrilite_catalog`) — per aggiungere prodotti basta inserire righe nella tabella, zero codice.
- La regola d'oro è: un passo alla volta, Ignazio conferma con "ok/fatto" prima di procedere.
