# Il carico nell'attrezzo (28 ottobre 2026)

Dal Rilascio 57 l'app tratta un esercizio come «corpo libero» quando nel campo `attrezzo` non c'è una parola di carico (`_exACorpoLibero`, `_ATTREZZI_CARICO` in `app/training.js`). Queste 13 righe hanno un carico, ma nell'attrezzo era scritto solo l'appoggio. La lista l'ha chiesta la Regia e l'ha approvata; Ignazio ha dato il via con i pulsanti.

- **Forma «carico;appoggio»**, come le righe che c'erano già (`manubri;panca`, `bilanciere;panca inclinata`, `cavo;maniglie`). Le righe sono EX076, EX484, EX485, EX440, EX482, EX492, EX493, EX467, EX462, EX446, EX447 ed EX500. EX500 è il crossover e prende `cavi;maniglie`.
- **EX690** (piegamenti col disco) era `corpo libero;disco` e diventa `disco`. È solo palestra: lì `_trainGenPickEq` non trovava nessuno dei due attrezzi fra le priorità, quindi prendeva il primo scritto, «corpo libero».
- **Restano come sono EX357 ed EX512** (dip e trazioni zavorrate). Sono anche «casa», e nel filtro di casa «;» vuol dire «almeno uno»: col disco nell'attrezzo li riceverebbe chi non ha la sbarra o la dip station. La Regia li sistema nel codice.
- **Restano come sono anche EX505** (l'elastico è assistenza, la logga `isPullUpExercise`) **ed EX236 ed EX380** (il disco è solo un rialzo).
- Le righe miste con «corpo libero» (EX039 e le altre) le decide il codice, con le priorità di casa: è segnato per ZT-Training.

**Fatto il 28 ottobre 2026.** Passi, in ordine:
1. Foglio esportato e confrontato col database: 824 righe, 0 differenze.
2. Backup `2026-10-28_0657`.
3. `prepara.py`.
4. Incolla in A2.
5. Foglio riletto: 0 celle diverse dall'atteso, 13 differenze col database.
6. Sync 824.
7. `verifica_sync.py`: tutto a posto. Resta solo il debito di EX725, che c'era già.
8. Database confrontato col foglio: 0 differenze. Confronto col backup: 13 campi cambiati, tutti e solo quelli consegnati.
9. Baseline invariata: principali 417, finisher 253, riscaldamento 86, core 64. Per il profilo di Ignazio (panca, niente manubri) queste righe entrano ora dal surrogato `elastico+panca` invece che dalla sola panca.
