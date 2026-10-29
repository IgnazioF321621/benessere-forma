# Stile di Zona Tracker

Il documento unico della grafica: caratteri, colori, regole. *(nato il 6 ottobre 2026, Stile 010)*

**Tutto lo stile vive in un file: [`app/stile.css`](../app/stile.css).** I colori e i caratteri hanno un nome, dichiarato una volta sola in `:root` in cima al file; le regole sotto usano solo i nomi (`var(--acc)`, `var(--font-mono)`). Per cambiare un colore in tutta l'app si cambia il suo valore in `:root`, e basta.

## Le regole

- **Fuori da `:root` nessun colore scritto a mano** in `app/stile.css`: niente `#2A7A6F`, niente `rgba(42,122,111,.25)`. Si usa il nome; se il nome non c'è, si aggiunge in `:root` nel gruppo giusto
- **Le trasparenze usano i canali**: `rgba(var(--acc-rgb),.25)`. Il colore ha il nome, la quantità resta accanto
- **I caratteri si chiamano per nome**: `var(--font-sans)` (Syne) e `var(--font-mono)` (JetBrains Mono). **Mai Manrope** sulle schermate nuove
- **I nomi si dichiarano solo in `:root`**: nessuna regola li ridefinisce più in basso, e il codice delle pagine non li cambia
- **I nomi che c'erano prima non si rinominano**: il codice delle pagine li usa negli stili scritti dentro l'HTML (`var(--t3)`, `var(--mod-training)`, …)

Lo controlla `node tools/banco/prova_stile.js`. Con lo stile di prima accanto controlla anche che una modifica non abbia cambiato l'aspetto:

```bash
git show main:app/stile.css > /tmp/stile_prima.css
```

```bash
node tools/banco/prova_stile.js /tmp/stile_prima.css
```

Con lo stile di prima la prova sostituisce ogni nome col suo valore e confronta le regole una per una (i colori come colori: `#fff` è `#FFFFFF`); poi disegna nel banco 15 schermate dell'app (informativa, accesso, onboarding, benvenuto del Piano, Home, i quattro tab di Nutrition, Programma e Progressione, i tre tab di Body, le Impostazioni), le apre in Chrome vero con lo stile di prima e con il nuovo e confronta i pixel e lo stile calcolato di ogni elemento. Una controprova con un colore cambiato di un punto deve risultare diversa. Con `FOTO=/una/cartella` tiene le foto, prima e dopo: servono al cambio di grafica.

## Caratteri

| Nome | Valore | Per |
|---|---|---|
| `--font-sans` | `'Syne',sans-serif` | titoli, testi, pulsanti |
| `--font-mono` | `'JetBrains Mono',monospace` | numeri, etichette, sopratitoli maiuscoli |

## Colori

### La base (c'era già)

| Nome | Valore | Per |
|---|---|---|
| `--bg` | `#F5F3EE` | fondo dell'app (bone) |
| `--s1` `--s2` `--s3` | `#FFFFFF` `#F0EDE6` `#E8E4DC` | superfici: card, pillole, binari delle barre |
| `--b1` `--b2` | `#DDD9D0` `#C8C3B8` | bordi |
| `--t1` `--t2` `--t3` | `#1A1A1A` `#555047` `#9A9388` | testo: principale, secondario, spento |
| `--acc` `--acc-lt` `--acc2` | `#2A7A6F` `#E6F4F2` `#235F56` | accento evergreen, il suo velo, il suo scuro |
| `--carb` `--prot` `--fat` (+ `-lt`) | `#C4880A` `#2D5016` `#B84C2A` | i tre macro |
| `--ok` `--warn` `--err` `--err-lt` | `#2A7A6F` `#C4880A` `#B84C2A` `#FCEEE9` | stati |
| `--mod-nutrition` `--mod-training` `--mod-body` | `#FAC775` `#B5D4F4` `#AFA9EC` | tinte dei moduli |

### I nomi nuovi (Stile 010)

Erano scritti a mano dentro le regole. I valori sono **identici a prima**, uno per uno.

| Gruppo | Nome | Valore | Dove si usa |
|---|---|---|---|
| Neutri | `--bianco` | `#fff` | testo sull'accento, fondi bianchi (70 regole) |
| | `--carta` · `--carta-2` | `#FFFCF6` · `#FAF8F2` | card della Home · voce aperta di un pacchetto |
| | `--grigio-1` … `--grigio-4` | `#f8f8f8` `#F5F5F5` `#f0f0f0` `#eee` | fondi delle GIF, scheletro di caricamento, parametri |
| | `--grigio-caldo` · `--grigio-caldo-2` | `#6B6557` · `#5A5147` | testi del catalogo · kcal del pacchetto |
| | `--inchiostro-caldo` | `#1A1814` | nomi nel catalogo e negli extra |
| | `--scuro-toast` | `#262626` | strisce «annulla» |
| | `--info-testo` | `#5A6B65` | testo delle finestre «i» |
| | `--ricerca` · `--ricerca-fuoco` | `#ECE9E0` · `#E5E1D6` | barra di ricerca del catalogo |
| Accento | `--acc-lt-2` | `#E6F4F1` | scelta attiva nel foglio integratori |
| | `--acc-lt-hover` · `--acc-velo` | `#D4ECE7` · `#F0F7F5` | GIF del recupero · sezione coach della finestra |
| | `--acc-scuro` · `--acc-premuto` | `#1F5C53` · `#226158` | testo sul velo · pulsante «Accetto» premuto |
| Rosso e oltre | `--elimina` | `#C44434` | togli, elimina, in calo (11 regole) |
| | `--err-scuro` | `#7A2E10` | etichetta di una riga del catalogo |
| | `--over` · `--over-lt` | `#B45309` · `#FBF0E0` | oltre l'obiettivo (come `OVER_COLOR`), prodotto sospeso |
| | `--ambra` | `#D97706` | totali del giorno sotto/sopra nel Piano |
| Nutrition | `--crema` · `--crema-bordo` · `--ocra` | `#FDF7E8` · `#E8D9A8` · `#8B6B1E` | card del coach e del Piano, sopratitoli |
| | `--macro-c` `--macro-p` `--macro-g` (+ `-lt`) | `#A0490A` `#1A6B35` `#7A5500` | etichette dei macro nel catalogo, nei pacchetti, in Analisi |
| | `--zona-testo` · `--zona-testo-2` · `--carb-lt-2` | `#3A2C12` · `#3A2D10` · `#FFF3DC` | pillole «zona» attive, giorno quasi in zona |
| | `--saltato` · `--sostituito` | `#8B6F6F` · `#8B6F2A` | pasto saltato · sostituito nel Piano |
| | `--badge-testo` `--badge-sub` `--oro` `--arancio` | `#7A4000` `#A05000` `#FFD700` `#FFA500` | badge «Giorno perfetto» |
| Avvisi | `--prio-gialla` | `#8A9A2A` | priorità gialla |
| | `--surrogato` (+ `-bordo`, `-testo`) | `#FFF8E0` `#F5E2A3` `#8A6500` | striscia dell'esercizio fatto con un altro attrezzo |
| | `--allerta` · `--allerta-testo` | `#FFF4E5` · `#7A3A1A` | avviso dentro una finestra |
| | `--anteprima` · `--anteprima-bordo` | `#FFF7E0` · `#E8D8A8` | striscia dell'anteprima dell'onboarding |
| Body | `--mod-body-forte` | `#5E4A7A` | checkpoint |
| | `--body-velo` · `--body-testo` | `#EDE9F8` · `#3F3155` | consigli del check |

### Canali per le trasparenze

`--nero-rgb` (ombre e veli) · `--bianco-rgb` (testi e veli sull'accento) · `--ombra-rgb` `20,15,5` (ombre calde di Nutrition) · `--t1-rgb` · `--bg-rgb` · `--acc-rgb` · `--err-rgb` · `--warn-rgb` · `--ambra-rgb` · `--arancio-rgb` · `--mod-nutrition-rgb` · `--saltato-rgb` · `--badge-testo-rgb`.

## La veste nuova (Giro 1, dal 29 ottobre 2026)

Scelte di Ignazio sul Passo 0 (tavola in `docs/prototipi/passo0/` sul ramo `claude/giro1-seduta-disegno`, con il disegno della Seduta in `docs/prototipi/giro1_seduta/`): **veste A**, colori pieni con le scritte bianche; **campi di testo a 16 px**; si costruisce dietro un interruttore, una pagina alla volta.

- **L'interruttore è la classe `v5` su `<html>`.** **Dal 29 ottobre 2026 sera è accesa per tutti** (Ignazio): lo script in testa a `zona-tracker.html` la mette sempre, tranne se sul telefono c'è `zt_v5 = 0`; `?v5=0` la spegne e lo ricorda, `?v5=1` la riaccende; il banco parte a veste spenta (`zt_v5 = 0` in `banco.js`), chi la vuole passa `zt_v5:'1'`; in Impostazioni › Crediti c'è «Veste nuova» (`vesteNuova()`). Spenta, l'app è quella di prima al pixel.
- **Ogni regola della veste comincia con `html.v5`** (l'interruttore delle Impostazioni con `.set-veste`). `prova_stile.js` le mette da parte e vuole tutto il resto uguale a prima; `prova_veste.js` prova l'interruttore e, in Chrome, la Home accesa (`FOTO=` tiene le foto a 390 px).
- **Colori di zona**: `--z-home` `#2A7A6F` · `--z-nutrition` `#A35F00` · `--z-training` `#2E6DA4` · `--z-body` `#6A55A0`, con `--z-testo` bianco sopra (contrasto da 5,01:1 a 6,14:1). Per la voce accesa della barra e le scritte di zona su fondo chiaro: `--z-…-velo` e `--z-…-scuro` (da 6,85:1 a 8,38:1). Le tinte `--mod-*` restano dove sono.
- **Cosa fa oggi la veste**: barra in basso a ogni larghezza, con la voce aperta nel colore della sua zona e le altre in `--t2`; insetto del feedback sopra la barra; campi a 16 px (il ripiego vale solo dove non c'è un'altra regola, le classi piccole misurate il 29/10 si alzano una per una, e anche le misure scritte nell'HTML da 10 a 15 px); la Home con la testata della zona Home, i gruppi bianchi e Nutrition · Training · Body come riquadri pieni.
- **Giro 1 della Home** (schizzo in `docs/prototipi/giro1_home/`, sì di Ignazio il 29/10/2026): a veste accesa l'ordine è Adesso (la prossima azione) · Le tue zone · Come stai oggi · Pirsi propone · La tua settimana, con `order` dentro `.home-v2-wrap`; un solo tipo di titolo di sezione (mono 11 px, maiuscolo, `--t2`, fuori dai riquadri). La settimana a righe la disegna `_wpHomeRigheV5` in `app/home.js` solo con `html.v5`, con gli stessi dati della card; per questo «Veste nuova» ridisegna la Home quando si tocca.

## Quasi doppioni: decisioni per il cambio di grafica

Dare i nomi non ha cambiato niente, quindi anche i colori quasi uguali sono rimasti due. Sono candidati a diventare uno solo nel cambio di grafica (Stile 020), **con una decisione di Ignazio**, perché lì l'aspetto cambia davvero, anche se di poco:

- `--acc-lt-2` `#E6F4F1` e `--acc-lt` `#E6F4F2`
- `--carb-lt-2` `#FFF3DC` e `--carb-lt` `#FEF3DC`
- `--zona-testo` `#3A2C12` e `--zona-testo-2` `#3A2D10`
- `--anteprima-bordo` `#E8D8A8` e `--crema-bordo` `#E8D9A8`; `--anteprima` `#FFF7E0` e `--surrogato` `#FFF8E0`
- `--ocra` `#8B6B1E` e `--sostituito` `#8B6F2A`
- `--inchiostro-caldo` `#1A1814` e `--t1` `#1A1A1A`
- `--bianco` e `--s1`: stesso valore, ruoli diversi (testo sull'accento / superficie)
- quattro grigi freddi (`--grigio-1` … `--grigio-4`) in una tavolozza tutta calda
- `--ok` = `--acc`, `--warn` = `--carb`, `--err` = `--fat`: stesso valore, nomi diversi; restano così finché il cambio non li separa

## Cosa resta fuori da questo file

**I colori scritti dentro il codice delle pagine.** Molti stili sono scritti direttamente nell'HTML che il codice disegna (`style="color:#854F0B"`); quelli non passano da qui, e un cambio di grafica fatto solo in `app/stile.css` non li tocca. Misurati il 6 ottobre 2026 (esadecimali · `rgba` · caratteri per esteso):

| File | Colori | Trasparenze | Caratteri |
|---|---|---|---|
| `app/training.js` | 181 | 37 | 2 |
| `app/nutrition.js` | 127 | 7 | 63 |
| `app/body.js` | 55 | — | 3 |
| `app/home.js` | 16 | — | — |
| `app/pirsi.js` | 16 | — | — |
| `zona-tracker.html` | 10 | 2 | 22 |
| `app/comune.js` | 3 | — | — |
| `app/impostazioni.js` | 1 | — | 1 |

La sessione Stile non tocca il codice delle pagine: per ognuno c'è una nota nel taccuino della pagina, con la richiesta di passare ai nomi di qui (o a una classe in `app/stile.css`). Finché non sono fatte, il cambio di grafica non è un lavoro in un file solo.
