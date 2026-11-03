// Prompt della lettura del referto delle analisi del sangue (Body 160). Un file per versione: una
// versione nuova è un file nuovo, e la data finisce in blood_tests.prompt_version.
//
// Non è un testo al coach per la persona: è un lavoro di trascrizione. Niente voce di Pirsi, niente
// ritratto, niente nome: il modello vede solo il referto (immagine o PDF, anche di più pagine) e deve
// copiare esame per esame il valore, l'unità e la fascia stampata. I dati anagrafici stampati sul
// referto (nome, cognome, data di nascita, codice fiscale, indirizzo, medico) non vanno letti né ripetuti.
import ZTEsami from '../../../shared/esami.js';

export const ESAMI_PROMPT_VERSION = '2026-11-02';

const vocabolario = ZTEsami.ESAMI.map(e => `- "${e.chiave}": ${e.label} (${e.nomi.join(', ')}; di solito in ${e.unita})`).join('\n');

export const ESAMI_SYSTEM_PROMPT = `Trascrivi i risultati di un referto di analisi del sangue (laboratorio italiano, immagine o PDF, anche di più pagine), in italiano.
Il referto ha righe «Esame · Risultato · Unità · Valori di riferimento». Leggi OGNI riga con un risultato numerico, su tutte le pagine.

Regole:
- "esami": una voce per ogni riga con un numero. "nome" è il nome dell'esame COME STAMPATO; "valore" il numero com'è scritto, senza unità e senza arrotondare (la virgola decimale diventa punto); "unita" l'unità COME STAMPATA (mg/dL, g/dL, ng/mL, µUI/mL, %, …), stringa vuota se non c'è.
- "chiave": se l'esame è uno di quelli dell'elenco qui sotto, la sua chiave; altrimenti null. Non forzare: «Colesterolo HDL» è "hdl", «Colesterolo totale» è "colesterolo_tot", una riga che non è nell'elenco resta null ma va trascritta lo stesso.
- "rif_min" e "rif_max": i valori di riferimento stampati sulla riga, come numeri (per «70 - 99» sono 70 e 99; per «< 200» rif_min null e rif_max 200; per «> 40» rif_min 40 e rif_max null); null se non stampati. Non inventarli mai.
- Una riga senza risultato numerico (positivo/negativo, assente, «vedi nota»), tagliata o illeggibile si salta. Non indovinare mai e non calcolare un valore da altri.
- "data_prelievo": la data del prelievo (o di accettazione, se è l'unica) stampata sul referto, nel formato YYYY-MM-DD; se manca, null.
- "riconosciuto": true solo se il file è davvero un referto di analisi di laboratorio; altrimenti false e "esami" vuoto.
- "note": una frase, solo se qualcosa non si è letto (pagina mancante, immagine sfocata, esami saltati); altrimenti stringa vuota.
- Sul referto ci sono nome, cognome, data di nascita, codice fiscale, indirizzo e medico della persona: non leggerli, non ripeterli da nessuna parte, nemmeno nelle note.
- Rispondi solo col JSON richiesto.

Elenco delle chiavi (chiave: esame; nomi con cui i laboratori lo stampano):
${vocabolario}`;
