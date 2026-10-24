-- Training 480 · Riscaldamento Upper completo (24 ottobre 2026): una colonna nuova di esercizi_catalog.
-- Decisioni di Ignazio: la zona del corpo su cui lavora un esercizio di riscaldamento sta in una
-- colonna sua, non in gruppo_target (che resta per i muscoli: volume, iso obbligatori, «Cambia per
-- oggi»); il riscaldamento specifico prende un esercizio per zona — Upper: colonna toracica, scapole,
-- spalle, polsi; Lower: anche, ginocchia, caviglie — solo a corpo libero o con l'elastico (i quattro
-- esercizi al cavo restano con zona vuota).
-- Vocabolario chiuso, lista separata da ';' come gli altri campi: spalle · scapole · colonna toracica ·
-- polsi · anche · caviglie · ginocchia. Vuota = la riga non entra nel riscaldamento specifico.
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi. Si esegue PRIMA del sync
-- che porta i valori dal foglio Google (la colonna `zona` va aggiunta in fondo al foglio).
-- Idempotente. NON eseguita: la esegue la Regia, con copia di sicurezza.
alter table public.esercizi_catalog
  add column if not exists zona text;

comment on column public.esercizi_catalog.zona is 'Zona del corpo del riscaldamento specifico (Training 480), lista con ";": spalle, scapole, colonna toracica, polsi, anche, caviglie, ginocchia. Il generatore pesca un esercizio per zona fra le righe con uso=riscaldamento. Fonte: foglio Google.';
