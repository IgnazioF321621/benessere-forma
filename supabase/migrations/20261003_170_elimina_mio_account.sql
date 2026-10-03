-- ═══════════════════════════════════════════════════════════
-- «Elimina account» dal profilo (Fondamenta 170) · 3 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Una funzione sola, che la persona entrata chiama dall'app (Impostazioni → Elimina account,
-- dopo aver scritto ELIMINA). Cancella l'utente di accesso (auth.users): tutte le tabelle
-- della persona hanno user_id → auth.users ON DELETE CASCADE, quindi cadono con lui.
-- Le foto nel bucket privato le toglie PRIMA l'app, coi permessi della persona
-- (regola body_photos_delete_own, via API di Storage). La funzione NON cancella da
-- storage.objects: Supabase blocca le cancellazioni dirette in quelle tabelle, e la
-- funzione fallirebbe prima di toccare l'account (REGIA, 3 ottobre 2026).
--
-- Serve `security definer` perche' cancellare in auth.users richiede i poteri del
-- proprietario della funzione, che l'app non ha e non deve avere. Puo' chiamarla solo chi e'
-- entrato (authenticated) e solo su se stesso: l'id lo prende da auth.uid(), non da un parametro.
-- Copia di sicurezza prima di eseguire. Idempotente.
-- ═══════════════════════════════════════════════════════════

create or replace function public.elimina_mio_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nessuna persona entrata';
  end if;
  -- tutto il resto cade col cascade
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.elimina_mio_account() from public;
revoke all on function public.elimina_mio_account() from anon;
grant execute on function public.elimina_mio_account() to authenticated;

select proname as funzione, prosecdef as security_definer from pg_proc where proname = 'elimina_mio_account';
