-- Training 280 (13 ottobre 2026): negli esercizi a un lato per volta (`esercizi_catalog.unilaterale = 'si'`)
-- la serie si registra con due numeri, destro e sinistro. In `reps` resta il lato più debole (è quello su
-- cui si misura la progressione: «Ultima volta», PROSSIMA e il grafico di Progressione lo leggono come
-- prima); i due valori veri stanno qui. Nulle per le serie bilaterali e per quelle di prima.
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi. Si esegue PRIMA del rilascio
-- del codice che le scrive, con copia di sicurezza. Idempotente.
alter table public.training_logs
  add column if not exists reps_dx integer,
  add column if not exists reps_sx integer;

alter table public.training_logs
  drop constraint if exists training_logs_reps_lati_chk;
alter table public.training_logs
  add constraint training_logs_reps_lati_chk
  check ((reps_dx is null and reps_sx is null) or (reps_dx >= 0 and reps_sx >= 0));

comment on column public.training_logs.reps_dx is 'Ripetizioni del lato destro negli esercizi per lato (Training 280). Nulla se la serie è bilaterale.';
comment on column public.training_logs.reps_sx is 'Ripetizioni del lato sinistro negli esercizi per lato (Training 280). Nulla se la serie è bilaterale. In reps resta il minore dei due.';
