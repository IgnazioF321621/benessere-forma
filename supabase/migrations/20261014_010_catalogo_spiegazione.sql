-- Catalogo e GIF 010 · Mobilità, terzo lavoro (14 ottobre 2026): una colonna nuova di esercizi_catalog.
-- Decisione di Ignazio: per Mobilità e stretching il nome è inglese breve, e sotto il nome l'app
-- mostra una riga in italiano di 5-10 parole che dice cosa si fa (Training 390).
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi. Si esegue PRIMA del sync
-- che porta i valori dal foglio Google (la colonna `spiegazione` va aggiunta in fondo al foglio).
-- Idempotente. NON eseguita: la esegue la Regia, con copia di sicurezza.
alter table public.esercizi_catalog
  add column if not exists spiegazione text;

comment on column public.esercizi_catalog.spiegazione is 'Riga in italiano di 5-10 parole mostrata sotto il nome (Mobilità e stretching, nome inglese). Fonte: foglio Google; testi confermati da Ignazio nel pannello (tools/biblioteca-nomi/esiti/spiegazioni_brevi.tsv).';
