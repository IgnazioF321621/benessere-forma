-- Metodo 210 (14 ottobre 2026): una pausa sola per tutti i moduli. Accanto a pausa_inizio, pausa_fine e
-- pausa_motivo (Training 350) il profilo dice QUALI moduli sono fermi: 'allenamento', 'cibo', 'pesate'.
-- Nulla o vuoto = tutti e tre (gli interruttori sono accesi di default). La legge l'app (ZTQuadro.pausaModuli)
-- e il cron del lunedì. Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi.
-- Si esegue PRIMA del rilascio del codice che la scrive, con copia di sicurezza. Idempotente.
alter table public.profiles
  add column if not exists pausa_moduli text[];

alter table public.profiles
  drop constraint if exists profiles_pausa_moduli_chk;
alter table public.profiles
  add constraint profiles_pausa_moduli_chk
  check (pausa_moduli is null or pausa_moduli <@ array['allenamento', 'cibo', 'pesate']::text[]);

comment on column public.profiles.pausa_moduli is 'I moduli fermi durante la pausa (Metodo 210): allenamento · cibo · pesate. Nulla = tutti e tre.';
