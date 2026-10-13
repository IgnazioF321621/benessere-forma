-- Training 060 (14 ottobre 2026): a fine allenamento la persona dice com'è andata (facile · giusta · dura)
-- e può lasciare una nota. La sensazione sta sulla riga dell'allenamento (workouts), accanto alla nota
-- libera che già c'è (`note`): è un dato per Pirsi (regole del lunedì, Pirsi 080) e per il diario.
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi. Si esegue PRIMA del rilascio
-- del codice che la scrive, con copia di sicurezza. Idempotente.
alter table public.workouts
  add column if not exists sensazione text;

alter table public.workouts
  drop constraint if exists workouts_sensazione_chk;
alter table public.workouts
  add constraint workouts_sensazione_chk
  check (sensazione is null or sensazione in ('facile', 'giusta', 'dura'));

comment on column public.workouts.sensazione is 'Com''è andata la seduta, detto dalla persona a fine allenamento: facile · giusta · dura (Training 060).';
