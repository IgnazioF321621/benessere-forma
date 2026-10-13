-- Training 350 (13 ottobre 2026): pausa programmata (vacanza, viaggio, lavoro: non un infortunio).
-- Un periodo con le date, dichiarato anche in anticipo, nel profilo: così lo vedono tutti e due i
-- telefoni e il cron del lunedì (Pirsi non propone cambi all'allenamento in una settimana di pausa).
-- pausa_fine vuota = pausa aperta («non lo so ancora»), la chiude la persona al ritorno.
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi. Si esegue PRIMA del rilascio
-- del codice che le scrive, con copia di sicurezza. Idempotente.
alter table public.profiles
  add column if not exists pausa_inizio date,
  add column if not exists pausa_fine   date,
  add column if not exists pausa_motivo text;

alter table public.profiles
  drop constraint if exists profiles_pausa_chk;
alter table public.profiles
  add constraint profiles_pausa_chk
  check (pausa_fine is null or pausa_inizio is null or pausa_fine >= pausa_inizio);

comment on column public.profiles.pausa_inizio is 'Primo giorno della pausa programmata (Training 350). Nulla = nessuna pausa.';
comment on column public.profiles.pausa_fine   is 'Ultimo giorno della pausa programmata; nulla = pausa aperta, la chiude la persona.';
comment on column public.profiles.pausa_motivo is 'vacanza · viaggio · lavoro · altro (solo per i testi).';
