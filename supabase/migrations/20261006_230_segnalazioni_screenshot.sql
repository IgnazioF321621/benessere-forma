-- ═══════════════════════════════════════════════════════════
-- «Invia Feedback»: lo screenshot allegato (Fondamenta 230)
-- 6 ottobre 2026 — da eseguire al rilascio, con copia di sicurezza (la Regia).
-- ═══════════════════════════════════════════════════════════
-- La persona fa lo screenshot come sempre e lo sceglie dalle foto nel foglio «Invia Feedback»;
-- l'app lo riduce sul telefono (lato lungo 1200 px, JPEG qualità 0,7: circa 200 KB) e lo carica
-- nel bucket PRIVATO `segnalazioni` al percorso `<user_id>/<id segnalazione>.jpg`, PRIMA di
-- scrivere la riga; nella riga resta solo il percorso (`immagine`). Chi legge (l'amministratore,
-- la Regia) apre l'immagine con un link firmato a tempo (createSignedUrl). Copiato da MB21
-- (migrazione 20261006090000_segnalazioni_screenshot.sql) e adattato: qui la cartella è
-- auth.uid() (come per body-check-photos, vedi docs/ACCESSI.md) e l'amministratore è la
-- stessa condizione sull'email delle altre tabelle.
--
-- Non tocca la migrazione della 220 né righe esistenti. Idempotente.
-- Costo zero: lo spazio file gratuito è 1 GB, contato insieme a MB21. Con circa 200 KB a
-- immagine ci stanno circa 5.000 screenshot; il bucket lascia entrare solo JPEG fino a 1 MB.
-- Dopo: python3 tools/prova_accessi.py e si rifotografa docs/SCHEMA_TABELLE.md
-- (tools/schema_fotografia.py).
-- ═══════════════════════════════════════════════════════════

-- il campo nuovo, facoltativo: i permessi di tabella della 220 coprono già le colonne nuove
alter table public.segnalazioni add column if not exists immagine text;
comment on column public.segnalazioni.immagine is 'Fondamenta 230: percorso dello screenshot nel bucket privato segnalazioni (<user_id>/<id>.jpg), null se non allegato';

-- il bucket: privato, solo JPEG, al massimo 1 MB a file (l'app li manda a circa 200 KB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('segnalazioni', 'segnalazioni', false, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

-- Le regole del bucket (storage.objects ha già la sicurezza accesa): la cartella è l'id della
-- persona che segnala. Chi non è entrato (anon) non ha regole, quindi non vede e non carica niente.
-- La persona legge, scrive e riscrive solo nella sua cartella; l'amministratore legge e cancella tutto.
-- La persona può togliere i file della sua cartella: serve a non lasciare uno screenshot senza
-- riga quando l'invio non va a buon fine, e a «Elimina account», che le toglie insieme alle foto dei check.
drop policy if exists "segnalazioni_img_leggi" on storage.objects;
create policy "segnalazioni_img_leggi" on storage.objects for select to authenticated
  using (bucket_id = 'segnalazioni' and ((auth.uid())::text = (storage.foldername(name))[1] or (auth.jwt() ->> 'email') = 'ignazio.f@me.com'));

drop policy if exists "segnalazioni_img_scrivi" on storage.objects;
create policy "segnalazioni_img_scrivi" on storage.objects for insert to authenticated
  with check (bucket_id = 'segnalazioni' and (auth.uid())::text = (storage.foldername(name))[1]);

-- il caricamento con `upsert` (la persona tocca «Invia» di nuovo dopo una rete caduta) passa da update
drop policy if exists "segnalazioni_img_rifai" on storage.objects;
create policy "segnalazioni_img_rifai" on storage.objects for update to authenticated
  using (bucket_id = 'segnalazioni' and (auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'segnalazioni' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "segnalazioni_img_cancella" on storage.objects;
create policy "segnalazioni_img_cancella" on storage.objects for delete to authenticated
  using (bucket_id = 'segnalazioni' and ((auth.uid())::text = (storage.foldername(name))[1] or (auth.jwt() ->> 'email') = 'ignazio.f@me.com'));
