-- ═══════════════════════════════════════════════════════════
-- Training 360 · Più pause, una dopo l'altra (3 novembre 2026)
-- Da eseguire al rilascio, con copia di sicurezza (la Regia), PRIMA di pubblicare l'app e il Worker. Idempotente.
-- ═══════════════════════════════════════════════════════════
-- Il caso vero: una malattia aperta (fine da decidere) e un viaggio già programmato. Il profilo teneva una pausa
-- sola (pausa_inizio, pausa_fine, pausa_motivo, pausa_moduli); adesso tiene un elenco di periodi:
--
--   profiles.pause  jsonb, un array di { id, inizio 'YYYY-MM-DD', fine 'YYYY-MM-DD' | null (aperta), motivo
--                   (codici separati da virgola, come pausa_motivo) | null, moduli text[] fra allenamento, cibo,
--                   pesate (vuoto o nullo = tutti) }. Al massimo uno aperto (lo controlla l'app).
--                   Nulla = vale ancora la pausa sola dei campi di prima (ripiego della regola, shared/quadro.js
--                   pausaPeriodi). [] = nessuna pausa: non si torna ai campi di prima.
--
-- La regola sta in shared/quadro.js (pausaPeriodi, pausaInfo, pausaAttivaIl, pausaGiorniNel) e la leggono l'app, il
-- Worker (calendario, promemoria dei pasti, Pirsi propone) e il quadro. I campi di prima restano (nessuno li toglie
-- qui) ma l'app non li scrive più.
-- La tabella esiste già: niente GRANT nuovi, RLS e regole invariate (la persona scrive la sua riga).
-- Prima e dopo: supabase/verifiche/360_pause_fotografia.sql.
-- Dopo: si rifotografa docs/SCHEMA_TABELLE.md (tools/schema_fotografia.py).
-- ═══════════════════════════════════════════════════════════

-- 1. La colonna, con il controllo che sia un array
alter table public.profiles
  add column if not exists pause jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_pause_chk') then
    alter table public.profiles add constraint profiles_pause_chk
      check (pause is null or jsonb_typeof(pause) = 'array');
  end if;
end $$;

comment on column public.profiles.pause is
  'Training 360: i periodi di pausa, [{id, inizio, fine|null, motivo|null, moduli[]}]. Nulla = vale la pausa sola di pausa_inizio/pausa_fine/pausa_motivo/pausa_moduli; [] = nessuna pausa.';

-- 2. La pausa di adesso passa nell'elenco: lo stato del momento in cui si esegue (anche una malattia segnata stasera
--    col foglio di prima). Solo per chi ha una pausa nei campi di prima e non ha ancora l'elenco.
update public.profiles
   set pause = jsonb_build_array(jsonb_build_object(
         'id', 'pausa',
         'inizio', to_char(pausa_inizio, 'YYYY-MM-DD'),
         'fine', case when pausa_fine is null then null else to_char(greatest(pausa_fine, pausa_inizio), 'YYYY-MM-DD') end,
         'motivo', pausa_motivo,
         'moduli', coalesce(to_jsonb(pausa_moduli), '[]'::jsonb)))
 where pause is null
   and pausa_inizio is not null;
