# Banco di prova — l'app vera, senza rete

Carica `zona-tracker.html` **così com'è** dentro [jsdom](https://github.com/jsdom/jsdom) e gli mette accanto un finto client Supabase che serve righe scritte a mano. Serve a verificare una modifica **eseguendola**, anche quando il DB, il Worker e la CDN non sono raggiungibili → [L46](../../docs/LEZIONI.md#l46--quando-la-rete-è-chiusa-il-banco-di-prova-si-costruisce-sul-file-vero).

```bash
npm install jsdom          # unica dipendenza, fuori dal repo
node tools/banco/prova_trazioni.js
node tools/banco/prova_storico.js
node tools/banco/prova_body_cta.js
node tools/banco/prova_esami.js
node tools/banco/prova_quadro_peso.js   # peso attuale: 0/1/3 pesate, obiettivo, tab Body
node tools/banco/prova_lettura_foto.js  # lettura delle foto del check: card, pulsante, errori, quadro
node tools/banco/prova_body_tendenza.js # Tendenza e «Ultimi log» con le pesate rapide (cantiere 35)
node worker/test/prova_vision_check.mjs # il Worker /vision-check con fetch finto (niente jsdom)
```

## Cosa è finto e cosa no

| | |
|---|---|
| finto | `window.supabase` (catena `.select/.eq/.in/.lt/.order/.range`, **troncamento a 1000 righe compreso**), `AudioContext`, `matchMedia`, `scrollTo` |
| vero | tutto il resto: render, stato, helper, il file byte per byte |

⚠️ **Il confronto prima/dopo è il punto.** Il file di prima si carica nello stesso banco e con le stesse fixture:

```js
const { boot } = require('./banco');
// git show HEAD:zona-tracker.html > /tmp/prima.html
boot(fixture, { file: '/tmp/prima.html' });
```

Se la prova che sul nuovo dà OK non dà **KO** sul vecchio, non sta misurando quello che si crede.

⚠️ **Non sostituisce la prova sul telefono.** Dice che la logica fa ciò che deve con quei dati; non dice come si legge a 375 px, né cosa risponde il DB vero.

## Appigli utili

- l'orologio si ferma con `boot(fixture, { now: '2026-09-13T09:00:00' })`: `new Date()` e `Date.now()` danno sempre quell'istante, le date esplicite restano vere. Serve quando la prova dipende dal giorno della settimana (`prova_quadro_peso.js`)
- lo stato dell'app si prende con `win.eval('ST')` (le `const` di un classic script non stanno su `window`, le `function` sì)
- un giorno di Training diventa loggabile con `ST.trainAnticipato = 'upperA'`, senza toccare rotazione e debito
- una funzione globale si può sostituire per la durata della prova: `win.getCycleWeekInfo = () => ({ isScarico:true, … })`
