# Stato — fotografia automatica

*Generato da `tools/biblioteca-nomi/stato.py` il 2026-10-28 alle 07:00.* Sola lettura: nessuna modifica a database, Storage o Sheet.

**Non si aggiorna da solo.** Va rilanciato dopo ogni sync del Sheet e dopo ogni migrazione di zona — sono i due momenti in cui questi numeri si spostano.

## In una riga

✅ **Nessuna anomalia**: nessuna riga arenata, nessuna catena rotta, nessuno slug condiviso da più codici.

## Catalogo esercizi (`esercizi_catalog`)

| | valore | nota |
|---|---|---|
| Righe totali | 824 |  |
| Ultimo sync | 2026-10-28 05:59 | istante in cui il foglio ha riscritto le righe |
| Righe arenate | 0 | nessuna: foglio e database allineati |
| Prossimo codice libero | EX838 | da allocare al momento della scrittura, mai in anticipo |
| Codici con GIF | 768 |  |
| Codici senza GIF | 56 | cantiere 2 |
| Catene rotte | 0 | gif_slug che non trova riga in biblioteca_gif |
| Slug su più codici | 0 | guardia "1 codice per slug" |

### Gap permanenti

Codici bruciati, **mai renumerare**: EX107, EX110, EX139, EX151, EX170, EX176, EX178, EX228, EX229, EX322, EX323, EX408, EX528

### Ripartizione

**Per uso**: carry 2 · carry;finisher 2 · finisher 149 · finisher;recupero 1 · finisher;riscaldamento 5 · principale 340 · principale;finisher 149 · principale;finisher;recupero 3 · principale;finisher;riscaldamento 3 · principale;recupero 2 · principale;riscaldamento 17 · recupero 3 · recupero;mobilita 69 · recupero;mobilita;riscaldamento 5 · riscaldamento 56 · riscaldamento;finisher 2 · skill 16

**Per livello**: (vuoto) 2 · avanzato 73 · intermedio 267 · intermedio;avanzato 45 · principiante 258 · principiante;intermedio 154 · principiante;intermedio;avanzato 25

## Indice delle GIF (`biblioteca_gif`)

Ogni riga sta in una di quattro caselle, secondo due domande: la punta un codice? il file esiste nel bucket?

| casella | righe | cosa significa |
|---|---|---|
| **Viva** | 768 | un codice la punta e il file c'è — è ciò che l'app mostra |
| **Rotta** | 0 | un codice la punta ma il file non c'è — **l'app mostra `missing`** |
| **Libera** | 29 | la GIF c'è ma nessun codice la usa — cantiere 16 |
| **Morta** | 918 | nessun codice e nessun file — cantiere 3E |
| TOTALE | 1715 | |

## Bucket Storage (`biblioteca-gif`)

| zona | oggetti |
|---|---|
| Addominali e Core | 77 |
| Bicipiti e Braccia | 73 |
| Cardio e Conditioning | 31 |
| Gambe e Glutei | 169 |
| Mobilita e Stretching | 114 |
| Pettorali | 82 |
| Polpacci | 19 |
| Schiena e Trapezio | 113 |
| Spalle e Cuffia | 63 |
| Tricipiti | 59 |
| **TOTALE** | **800** |

File nel bucket che nessuna riga indicizza: **3**

- `Addominali e Core/Crunch farfalla toe touch (Butterfly Toe-Touch Crunch).gif`
- `Addominali e Core/Plank frontale.gif`
- `Addominali e Core/Plank su fitball.gif`

---

*Per rigenerare: `python3 tools/biblioteca-nomi/stato.py`*
