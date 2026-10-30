-- Training 540 · Le sedute nel Calendario Apple (30 ottobre 2026): tre colonne nuove di profiles.
-- Ignazio: «collegare i passi che ci sono già (workout) impostando un orario direttamente sul calendario Apple».
-- L'app non scrive nel Calendario: l'iPhone si iscrive a un calendario (feed iCalendar) che scrive il Worker,
-- GET /calendario?t=<calendario_token>, con le sedute delle prossime 4 settimane: una per ogni giorno scelto, solo
-- sedute di lavoro («solo sedute vere»), all'ora scelta, con l'avviso 15 minuti prima.
--   train_orario      text 'HH:MM': l'ora delle sedute (es. 07:30)
--   train_giorni      smallint[]: i giorni della settimana delle sedute, 1 = lunedì … 7 = domenica; [] = nessuno,
--                     nulla = mai scelti (l'app mostra la partenza lun-mar-gio-ven e la scrive al primo «Salva»)
--   calendario_token  uuid scelto dall'app, unico: è l'indirizzo del calendario. «Rinnova il collegamento» lo cambia
--                     e il vecchio indirizzo smette di rispondere. Non è un token di accesso: apre solo il calendario.
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi (RLS e regole di profiles invariate: la
-- persona scrive la propria riga, il Worker legge con la chiave di servizio cercando per token).
-- L'app legge il profilo con select('*') e scrive le colonne in una scrittura a parte, solo quando la persona le
-- cambia: finché la migrazione non c'è, tutto il resto funziona e il tasto del calendario resta spento.
-- Idempotente. NON eseguita: la esegue la Regia, con copia di sicurezza, leggendo prima e dopo
-- supabase/verifiche/540_calendario_fotografia.sql.
alter table public.profiles
  add column if not exists train_orario text,
  add column if not exists train_giorni smallint[],
  add column if not exists calendario_token uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_train_orario_chk') then
    alter table public.profiles add constraint profiles_train_orario_chk
      check (train_orario is null or train_orario ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_train_giorni_chk') then
    alter table public.profiles add constraint profiles_train_giorni_chk
      check (train_giorni is null or train_giorni <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_calendario_token_key') then
    alter table public.profiles add constraint profiles_calendario_token_key unique (calendario_token);
  end if;
end $$;

comment on column public.profiles.train_orario is 'Training 540: l''ora delle sedute nel calendario dell''iPhone, HH:MM.';
comment on column public.profiles.train_giorni is 'Training 540: i giorni della settimana delle sedute (1 = lunedì … 7 = domenica); in quei giorni l''app propone solo sedute di lavoro. [] = nessuno, nulla = mai scelti.';
comment on column public.profiles.calendario_token is 'Training 540: l''indirizzo del calendario (GET /calendario?t=<token> sul Worker). Scelto dall''app, rigenerabile; non è un token di accesso.';
