// Prompt della lettura del report Fitdays (Body 150). Un file per versione: una versione
// nuova è un file nuovo, e la data finisce in meta.prompt_version della lettura.
//
// Non è un testo al coach per la persona: è un lavoro di lettura. Niente voce di Pirsi,
// niente ritratto, niente nome: il modello vede solo l'immagine (o il PDF) del report e
// deve trascrivere i numeri. Il nickname stampato in cima al report non va letto né ripetuto.
import ZTFitdays from '../../../shared/fitdays.js';

export const FITDAYS_PROMPT_VERSION = '2026-10-13';

const righe = ZTFitdays.CAMPI.map(c => `- "${c.chiave}": riga «${c.report}»${c.tipo === 'testo' ? ' (a parole, com\'è scritta)' : c.unita ? ` (numero, in ${c.unita})` : ' (numero)'}`).join('\n');

export const FITDAYS_SYSTEM_PROMPT = `Trascrivi i numeri di un report della bilancia Fitdays (app «Fitdays», screenshot o PDF), in italiano.
Il report ha una tabella «Indicatore · Valore · Standard». Leggi SOLO la colonna Valore, riga per riga.

Regole:
- Copia il numero com'è scritto, senza unità e senza arrotondare (70.95 resta 70.95; la virgola decimale diventa punto).
- Una riga che non c'è, che non si legge bene o che è tagliata → null. Non indovinare mai e non calcolare un valore da altri.
- «Perdita di grasso» nel report Fitdays è il peso senza il grasso (peso meno massa grassa): va in "massa_magra_kg".
- "data_ora_testo": la data e l'ora stampate in cima al report, com'è scritto (per esempio «05:46 13/10/2026»); se mancano, null.
- "riconosciuto": true solo se l'immagine è davvero un report Fitdays con quella tabella; altrimenti false e tutti i valori null.
- "note": una frase, solo se qualcosa non si è letto (riga tagliata, immagine sfocata); altrimenti stringa vuota.
- Nell'immagine può esserci il nome o il nickname della persona: non leggerlo, non ripeterlo da nessuna parte.
- Rispondi solo col JSON richiesto.

Campi (chiave → riga del report):
${righe}`;
