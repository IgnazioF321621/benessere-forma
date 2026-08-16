# Stato — fotografia automatica

*Generato da `tools/biblioteca-nomi/stato.py` il 2026-08-16 alle 12:06.* Sola lettura: nessuna modifica a database, Storage o Sheet.

**Non si aggiorna da solo.** Va rilanciato dopo ogni sync del Sheet e dopo ogni migrazione di zona — sono i due momenti in cui questi numeri si spostano.

## In una riga

✅ **Nessuna anomalia**: nessuna riga arenata, nessuna catena rotta, nessuno slug condiviso da più codici.

## Catalogo esercizi (`esercizi_catalog`)

| | valore | nota |
|---|---|---|
| Righe totali | 667 |  |
| Ultimo sync | 2026-08-06 20:24 | istante in cui il foglio ha riscritto le righe |
| Righe arenate | 0 | nessuna: foglio e database allineati |
| Prossimo codice libero | EX676 | da allocare al momento della scrittura, mai in anticipo |
| Codici con GIF | 602 |  |
| Codici senza GIF | 65 | cantiere 2 |
| Catene rotte | 0 | gif_slug che non trova riga in biblioteca_gif |
| Slug su più codici | 0 | guardia "1 codice per slug" |

### Gap permanenti

Codici bruciati, **mai renumerare**: EX107, EX110, EX151, EX170, EX228, EX229, EX323, EX528

### Ripartizione

**Per uso**: accessorio 72 · accessorio;finisher 18 · accessorio;riscaldamento 5 · accessorio;riscaldamento;attivazione 1 · carry 2 · carry;finisher 2 · finisher 33 · finisher;recupero 1 · isolamento 16 · principale 317 · principale;accessorio 6 · principale;finisher 135 · principale;finisher;recupero 3 · principale;recupero 2 · principale;riscaldamento 17 · recupero 3 · recupero;mobilita 7 · riscaldamento 18 · riscaldamento;attivazione 3 · riscaldamento;finisher 2 · skill 4

**Per livello**: (vuoto) 2 · avanzato 55 · intermedio 256 · intermedio;avanzato 38 · principiante 162 · principiante;intermedio 129 · principiante;intermedio;avanzato 25

## Indice delle GIF (`biblioteca_gif`)

Ogni riga sta in una di quattro caselle, secondo due domande: la punta un codice? il file esiste nel bucket?

| casella | righe | cosa significa |
|---|---|---|
| **Viva** | 602 | un codice la punta e il file c'è — è ciò che l'app mostra |
| **Rotta** | 0 | un codice la punta ma il file non c'è — **l'app mostra `missing`** |
| **Libera** | 46 | la GIF c'è ma nessun codice la usa — cantiere 16 |
| **Morta** | 922 | nessun codice e nessun file — cantiere 3E |
| TOTALE | 1570 | |

## Bucket Storage (`biblioteca-gif`)

| zona | oggetti |
|---|---|
| Addominali e Core | 77 |
| Bicipiti e Braccia | 73 |
| Cardio e Conditioning | 31 |
| Gambe e Glutei | 169 |
| Pettorali | 60 |
| Polpacci | 19 |
| Schiena e Trapezio | 96 |
| Spalle e Cuffia | 63 |
| Tricipiti | 59 |
| **TOTALE** | **647** |

File nel bucket che nessuna riga indicizza: **0**

---

*Per rigenerare: `python3 tools/biblioteca-nomi/stato.py`*
