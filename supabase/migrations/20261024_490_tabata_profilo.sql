-- Training 490 · Il Tabata spento di default (24 ottobre 2026): due colonne nuove di profiles.
-- Decisioni di Ignazio: «non l'ho mai fatto, le sedute sono già lunghe» → il Tabata è SPENTO di default e si
-- riaccende nelle Impostazioni › Allenamento: in fondo a ogni seduta, in fondo solo in certi giorni della
-- settimana, oppure «a parte», un tasto nel Programma per farlo quando si vuole (solo il timer: non si salva
-- niente, non conta come seduta e non crea debito). Nessuno storico da toccare: il Tabata non è mai stato
-- fatto, e il finisher resta nel jsonb delle schede (quando è spento l'app lo ignora).
--   tabata         text: 'spento' · 'coda' · 'giorni' · 'a_parte'; nulla = spento
--   tabata_giorni  smallint[]: i giorni per 'giorni', 1 = lunedì … 7 = domenica; nulla altrimenti
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi (RLS e regole di profiles invariate).
-- L'app legge il profilo con select('*') e scrive le due colonne in una scrittura a parte, solo quando la
-- persona cambia il Tabata: finché la migrazione non c'è, tutto il resto funziona e il Tabata resta spento.
-- Idempotente. NON eseguita: la esegue la Regia, con copia di sicurezza.
alter table public.profiles
  add column if not exists tabata text,
  add column if not exists tabata_giorni smallint[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_tabata_chk') then
    alter table public.profiles add constraint profiles_tabata_chk
      check (tabata is null or tabata in ('spento', 'coda', 'giorni', 'a_parte'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_tabata_giorni_chk') then
    alter table public.profiles add constraint profiles_tabata_giorni_chk
      check (tabata_giorni is null or tabata_giorni <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);
  end if;
end $$;

comment on column public.profiles.tabata is 'Training 490: il Tabata. spento (anche nulla, di default) · coda (in fondo a ogni seduta) · giorni (in fondo solo nei giorni di tabata_giorni) · a_parte (tasto nel Programma, fuori dalla seduta, solo timer).';
comment on column public.profiles.tabata_giorni is 'Training 490: i giorni della settimana del Tabata quando tabata = giorni (1 = lunedì … 7 = domenica).';
