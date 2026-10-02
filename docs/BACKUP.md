# Copia di sicurezza dei dati delle persone

*(dal 2 ottobre 2026 — Fondamenta 020)*

Supabase, nel piano Free, **non conserva copie scaricabili** (verificato il 2 ottobre: `supabase backups list` → nessuna copia, ripristino a un istante spento). La copia la facciamo noi.

## Cosa si copia e dove

`python3 tools/backup_dati.py` legge **tutte le tabelle** (30 il 2 ottobre, 12.890 righe), l'elenco degli account e le foto dei check, e scrive **fuori dal repo**, che è pubblico:

| | |
|---|---|
| `~/zt-backup/dati/AAAA-MM-GG_HHMM/` | un file per tabella + `auth_users.json` + `MANIFEST.json` (righe lette, righe dichiarate dal DB, impronta di ogni file) |
| `~/zt-backup/foto_check/` | le foto del bucket privato `body-check-photos`, scaricate una volta sola |

Sola lettura su Supabase. Se per una tabella le righe lette non coincidono col conteggio del database, la copia è **dichiarata non valida** e lo script esce con errore.

⚠️ **`~/zt-backup` contiene dati di salute e foto del corpo.** Non entra in git, non si carica da nessuna parte senza deciderlo.

## Ogni settimana, da sola

`bash tools/installa_backup_settimanale.sh` — una volta: da lì la copia parte ogni domenica alle 21:00 (al primo risveglio se il Mac dorme). Esito in `~/zt-backup/backup.log`. Si spegne con `--togli`.

## La prova di ripristino

```bash
python3 tools/backup_dati.py --verifica ~/zt-backup/dati/<cartella>   # i file sono integri?
node tools/banco/prova_ripristino.js ~/zt-backup/dati/<cartella>      # l'app ci ritrova tutto?
```

La seconda carica l'app vera due volte — sui file della copia e sul database vero — e confronta ciò che vede: profilo, giorni, pasti con i loro ingredienti, integratori, pesate, misure. **Fatta il 2 ottobre 2026**: 119 giorni, 328 pasti, 893 ingredienti, 20 pesate, tutto uguale; su una copia a cui erano stati tolti 300 ingredienti ha dato KO, come deve.

**Cosa questa prova non copre**: il ricaricamento vero dei file dentro un database vuoto. Serve un secondo progetto Supabase su cui provare e lo [schema in git](SCHEMA.md) per ricrearne le tabelle; i due progetti del piano Free sono già occupati (zona-tracker e mb21).
