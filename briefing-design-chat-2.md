# Briefing — Nuova chat design Zona Tracker

> Per consultare i mockup esistenti, vedere progetto Claude Design **"Zona Tracker"** (chat dedicata del 10 maggio 2026).

---

## Visione del prodotto

**Zona Tracker** è un assistente personalizzato per nutrizione + allenamento + progressi fisici. Single-page HTML hostata su GitHub Pages, niente framework.

L'AI è al centro, non un feature secondaria. Si manifesta in **3 momenti**:

1. **Onboarding** — raccolta dati utente per costruire il profilo
2. **Vita quotidiana** — guida l'utente giorno per giorno (cosa mangiare, quando allenarsi, quando prendere integratori)
3. **Checkpoint periodico** — rivede i piani in base ai progressi misurati

Da questi dati l'AI genera **2 piani collegati**:
- Piano nutrizione (Zone, supplementi Nutrilite dal catalogo)
- Piano allenamento

Il **modulo Body** è il punto di entrata e checkpoint del percorso AI: foto, misure, esami sangue. Tinta dedicata viola scuro `#5E4A7A`.

---

## Stato attuale del design (10 maggio 2026)

### ✅ Già progettato

**Onboarding Momento 1 (M1) — 9 schermate**
- Welcome screen
- Auth Step 1 (email → OTP, 2 stati fluidi)
- Step 2a (nome+cognome)
- Step 2b (anagrafica: età, sesso, altezza, peso attuale, peso obiettivo)
- Step 3 (obiettivo: 6 card 2×3, multi-select max 2)
- Step 4 (livello: 5 card attività + 4 card esperienza)
- Step 5 (alimentazione: 5 stili + 16 pillole intolleranze in 3 gruppi + Altro)
- Step 6 (limitazioni: 12 pillole in 3 gruppi Schiena/Articolazioni/Condizioni + Altro)
- Step 7 (esito caldo + bridge al check fisico)

Tono ~3 minuti, conversazionale. Coerente iOS + Android.

**Home post-onboarding — 1 schermata, 4 zone**
- Zona 1: saluto "Buongiorno, Ignazio" + data mono uppercase
- Zona 2: 3 card moduli asimmetriche (Nutrition alta con anello kcal+macro, Training compatta "Sessione Upper" + settimana, Body compatta "78,4 kg ↓ −0,6" + checkpoint)
- Zona 3: pannello **"PROSSIMA AZIONE"** dinamico AI-driven (titolo + descrizione + mini-box + CTA)
- Zona 4: tab bar pill 4 elementi (Home/Nutr/Train/Body) + avatar profilo IF

---

## Decisioni di prodotto chiave

### Sistema design

| Token | Valore |
|---|---|
| Font UI/display | **Syne** (NON Manrope — la legacy del codice) |
| Font numeri/label | **JetBrains Mono** |
| Background | bone caldo `#F5F3EE` |
| Accent globale | evergreen `#2A7A6F` |
| Allineamento testi | sinistra |

### Macro food-coded

| Macro | Colore |
|---|---|
| Carboidrati | amber `#BA7517` |
| Proteine | evergreen `#2A7A6F` |
| Grassi | terracotta `#B84C2A` |

### Tinte moduli (UI)

| Modulo | Tinta |
|---|---|
| Nutrition | ambra `#FAC775` |
| Training | azzurro `#B5D4F4` |
| Body | viola `#AFA9EC` |
| Body — checkpoint AI | viola scuro `#5E4A7A` |

### Auth

Migrazione confermata: **Magic Link → OTP via email** (più affidabile su iOS Safari).

### Pattern di onboarding (regole di coerenza)

- Tono variabile per step ma sempre con queste 6 regole: **tu** (mai "lei"), max 1 riga di domanda, niente esclamativi, niente emoji, riassicurazioni piccole sotto, nome solo step 2a + step 7
- Frasi di sistema in italics 14px (`--t3`) ad ogni step — mantra Zona Tracker, scritte da noi, da rinnovare nel tempo via dizionario centralizzato
- Progress bar a 7 segmenti che cresce step per step
- Stile conversazionale per tutto M1

### Logica "PROSSIMA AZIONE" (home)

- Cambia in base allo **stato logico** dell'utente, **non a orari hardcoded**
- L'AI legge: profilo orari utente + stato in tempo reale (cosa già fatto oggi) → decide cosa mostrare
- Linguaggio utente normale: workout, colazione, pranzo, cena, snack, integratori (NO "attivazione", NO "sessione DUP", NO "TDEE")
- 3 stati di riferimento già progettati: mattina pre-workout / pomeriggio integratori / sera riepilogo

---

## Cosa progettare in questa chat

L'utente sceglierà uno dei due fronti rimasti:

### Opzione A — **Onboarding Momento 2 (M2)**: check fisico
~5-7 min, stile form (più "denso" di M1 conversazionale).
Voci da coprire (annunciate nello step 7 di M1):
- **FOTO** — fronte/lato/retro? Indicazioni postura, illuminazione, abbigliamento? Storage privato?
- **MISURE** — vita, fianchi, petto, bicipite, peso, BF%, massa muscolare, grasso viscerale, body age (alcune già nel modulo Body in produzione)
- **ESAMI** — tipologia (sangue base? completo?), upload PDF? trascrizione manuale di parametri chiave (ferritina, vit D, B12, glicemia, colesterolo)?

Da definire: schermate, flusso, integrazione con modulo Body esistente, validazioni, possibilità di skip/rinvio.

### Opzione B — **Dentro i moduli** col nuovo sistema design
Le schermate interne di Nutrition / Training / Body al livello di dettaglio della home rifatta. Oggi in produzione sono in stile legacy (Manrope + vecchia palette verde-blu-marrone). Da rifare con Syne + bone `#F5F3EE` + tinte moduli nuove.

Sotto-fronti:
- **Nutrition**: Oggi (ring + macro + timeline) / Integratori / Storico / Piano
- **Training**: Sessione (lista + dettaglio esercizio + log serie + modal recupero) / Programma / Progressione (calendario + grafico)
- **Body**: Misure (form + composizione) / Tendenza (grafici)

---

## Risorse e contesto tecnico

- App single-file `zona-tracker.html` (HTML/CSS/JS puro, no build)
- Backend: Supabase (DB + Auth) + Cloudflare Worker `zona-ai` (proxy Groq + cache GIF esercizi)
- Il file `CLAUDE.md` nel repo contiene schema DB, lista funzioni, stato moduli
- Mockup esistenti: progetto Claude Design **"Zona Tracker"** (chat 10 maggio 2026)
