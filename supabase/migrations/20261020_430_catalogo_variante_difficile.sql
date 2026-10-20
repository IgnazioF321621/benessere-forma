-- Training 430 (20 ottobre 2026): una colonna nuova di esercizi_catalog.
-- Quando la via di progressione è «variante più difficile» il coach nomina quale. Scelta di Ignazio:
-- intanto una regola (ZTCoachRules.varianteDifficile: stessa famiglia, livello sopra), e una colonna nel
-- foglio dove scrivere a mano la variante giusta (un codice EX###): quando c'è, vince sulla regola.
-- L'app la legge con select('*') sulla riga dell'esercizio, quindi funziona anche prima di questa migrazione.
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi. Si esegue PRIMA del sync
-- che porta i valori dal foglio Google (la colonna `variante_difficile` va aggiunta in fondo al foglio).
-- Idempotente. NON eseguita: la esegue la Regia, con copia di sicurezza.
alter table public.esercizi_catalog
  add column if not exists variante_difficile text;

comment on column public.esercizi_catalog.variante_difficile is 'Codice EX### della variante più difficile da proporre quando progressione = «variante più difficile» (Training 430). Fonte: foglio Google. Vuota: decide la regola ZTCoachRules.varianteDifficile.';
