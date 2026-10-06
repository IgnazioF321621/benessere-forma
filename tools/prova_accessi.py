#!/usr/bin/env python3
"""Chi può leggere e toccare cosa, tabella per tabella — prova dal vivo (Fondamenta 040).

Per ogni persona vera del database, per una persona finta che non ha righe e per chi non è entrato, prova sul database vero che:
  - non LEGGE le righe di un altro            (conteggio delle righe altrui = 0)
  - non MODIFICA e non CANCELLA righe altrui  (righe toccate = 0)
  - non INSERISCE righe a nome di un altro    (rifiutato dalle regole di accesso)
  - chi non è entrato non vede niente dei dati delle persone
  - i cataloghi comuni non si possono scrivere dall'app
  - i file dei bucket privati (foto dei check, screenshot di «Invia Feedback») si vedono e si scrivono solo nella propria cartella

NIENTE RESTA SCRITTO. Ogni persona è provata dentro una transazione che finisce con
ROLLBACK, e in più ogni tentativo di scrittura è annullato subito, uno per uno, da un
punto di ripristino. La riga usata per l'inserimento è finta (solo il proprietario,
il resto vuoto): nessun dato vero viene copiato o letto — si contano righe, non si guardano.

Come funziona: via `supabase db query` (Management API) si prende il ruolo che l'app usa
(`authenticated` o `anon`) e l'identità della persona (`request.jwt.claims`), cioè
esattamente ciò che le regole di accesso vedono quando arriva una richiesta dal telefono.

    python3 tools/prova_accessi.py            # prova tutto, exit 1 se c'è almeno un KO
    python3 tools/prova_accessi.py --json f   # salva anche gli esiti grezzi

Un esito che non si riesce a determinare è «??» e conta come KO: mai «a posto» per silenzio (L10).
"""
import argparse
import json
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = 'qxiyeiahpoiliwpqslpr'
# Bucket privati con una cartella per persona (nome della cartella = id della persona). Un bucket che non esiste ancora
# (migrazione non eseguita) si salta e si dice.
BUCKET_PRIVATI = ['body-check-photos', 'segnalazioni']
# La persona finta: un id che non è in auth.users e un'email che non è dell'amministratore. Per le regole è una persona entrata
# come un'altra, con zero righe sue: tutte le righe che esistono sono «di un altro». Così la prova funziona anche con una persona
# sola nel database (dopo la pulizia dei tester) e la lettura di righe altrui è dimostrata davvero, non a vuoto.
PERSONA_FINTA = {'id': '00000000-0000-4000-8000-0000000000aa', 'email': 'estranea@prova.invalid'}
# Cataloghi comuni: nessun proprietario, l'app li legge soltanto. Si scrivono dal foglio o dal Worker (chiave di servizio).
# True = leggibile anche da chi non è entrato (deciso: nomi di esercizi e prodotti non sono dati personali).
CATALOGHI = {'esercizi_catalog': True, 'nutrilite_catalog': True, 'exercise_media': True, 'biblioteca_gif': False}


def leggi(sql):
    r = subprocess.run(['supabase', 'db', 'query', '--linked', '--project-ref', REF, '-o', 'json', sql],
                       capture_output=True, text=True)
    if r.returncode != 0 or '{' not in r.stdout:
        sys.exit('✗ lettura fallita: ' + (r.stderr or r.stdout)[-600:])
    return json.JSONDecoder().raw_decode(r.stdout[r.stdout.index('{'):])[0].get('rows', [])


def tabelle_personali():
    """Tabelle di public con un proprietario: colonna user_id, oppure profiles (dove il proprietario è id)."""
    righe = leggi("""select c.relname t, bool_or(a.attname='user_id') ha_user_id
      from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
      where n.nspname='public' and c.relkind='r' group by 1 order by 1""")
    out = {}
    for r in righe:
        if r['ha_user_id']:
            out[r['t']] = 'user_id'
        elif r['t'] == 'profiles':
            out[r['t']] = 'id'
        elif r['t'] not in CATALOGHI:
            out[r['t']] = None      # né personale né catalogo dichiarato: va guardata
    return out


def colonne_cataloghi():
    """Per ogni catalogo una colonna qualunque che si possa riscrivere su sé stessa (non generata)."""
    nomi = ', '.join("'" + t + "'" for t in CATALOGHI)
    righe = leggi(f"""select table_name t, (array_agg(column_name::text order by ordinal_position))[1] c from information_schema.columns
      where table_schema='public' and table_name in ({nomi}) and is_identity='NO' and is_generated='NEVER' group by 1""")
    return {r['t']: r['c'] for r in righe}


def sql_attore(ruolo, uid, email, altro, personali, col_cat, buckets):
    """Una transazione sola: prende ruolo e identità, prova tutto, restituisce gli esiti, ROLLBACK."""
    claims = json.dumps({'sub': uid, 'role': ruolo, 'email': email} if uid else {'role': ruolo})
    b = []
    for t, col in personali.items():
        altrui = f'"{col}" <> \'{uid}\'' if uid else 'true'
        b.append(f"""
  -- {t}
  begin
    execute 'select count(*) from public."{t}" where {altrui.replace("'", "''")}' into n;
    insert into _esiti values ('{t}', 'legge', n::text);
  exception when insufficient_privilege then insert into _esiti values ('{t}', 'legge', 'negato');
            when others then insert into _esiti values ('{t}', 'legge', '?? ' || sqlstate);
  end;
  begin
    execute 'update public."{t}" set "{col}" = "{col}" where {altrui.replace("'", "''")}';
    get diagnostics n = row_count;
    raise exception using errcode = 'ZT001', message = n::text;
  exception when sqlstate 'ZT001' then insert into _esiti values ('{t}', 'modifica', sqlerrm);
            when insufficient_privilege then insert into _esiti values ('{t}', 'modifica', 'negato');
            when others then insert into _esiti values ('{t}', 'modifica', '?? ' || sqlstate);
  end;
  begin
    execute 'delete from public."{t}" where {altrui.replace("'", "''")}';
    get diagnostics n = row_count;
    raise exception using errcode = 'ZT001', message = n::text;
  exception when sqlstate 'ZT001' then insert into _esiti values ('{t}', 'cancella', sqlerrm);
            when insufficient_privilege then insert into _esiti values ('{t}', 'cancella', 'negato');
            when others then insert into _esiti values ('{t}', 'cancella', '?? ' || sqlstate);
  end;
  begin
    insert into public."{t}" select * from jsonb_populate_record(null::public."{t}", jsonb_build_object('{col}', '{altro}'));
    raise exception using errcode = 'ZT001', message = 'INSERITA';
  exception when sqlstate 'ZT001' then insert into _esiti values ('{t}', 'inserisce', sqlerrm);
            when insufficient_privilege then insert into _esiti values ('{t}', 'inserisce', 'negato');
            -- l'id usato può non essere in auth.users: arrivare al vincolo vuol dire aver passato le regole di accesso (si controllano prima)
            when foreign_key_violation then insert into _esiti values ('{t}', 'inserisce', 'aperto');
            when others then insert into _esiti values ('{t}', 'inserisce', '?? ' || sqlstate);
  end;""")
    for t in CATALOGHI:
        b.append(f"""
  -- catalogo {t}
  begin
    execute 'select count(*) from public."{t}"' into n;
    insert into _esiti values ('{t}', 'legge', n::text);
  exception when insufficient_privilege then insert into _esiti values ('{t}', 'legge', 'negato');
            when others then insert into _esiti values ('{t}', 'legge', '?? ' || sqlstate);
  end;
  begin
    execute 'update public."{t}" set "{col_cat[t]}" = "{col_cat[t]}"';
    get diagnostics n = row_count;
    raise exception using errcode = 'ZT001', message = n::text;
  exception when sqlstate 'ZT001' then insert into _esiti values ('{t}', 'modifica', sqlerrm);
            when insufficient_privilege then insert into _esiti values ('{t}', 'modifica', 'negato');
            when others then insert into _esiti values ('{t}', 'modifica', '?? ' || sqlstate);
  end;
  begin
    execute 'delete from public."{t}"';
    get diagnostics n = row_count;
    raise exception using errcode = 'ZT001', message = n::text;
  exception when sqlstate 'ZT001' then insert into _esiti values ('{t}', 'cancella', sqlerrm);
            when insufficient_privilege then insert into _esiti values ('{t}', 'cancella', 'negato');
            when others then insert into _esiti values ('{t}', 'cancella', '?? ' || sqlstate);
  end;
  begin
    -- riga di soli valori predefiniti: una colonna «sempre generata» rifiuterebbe un valore esplicito
    -- prima ancora di arrivare alle regole di accesso, e sembrerebbe un catalogo aperto
    insert into public."{t}" default values;
    raise exception using errcode = 'ZT001', message = 'INSERITA';
  exception when sqlstate 'ZT001' then insert into _esiti values ('{t}', 'inserisce', sqlerrm);
            when insufficient_privilege then insert into _esiti values ('{t}', 'inserisce', 'negato');
            -- le regole di accesso si controllano PRIMA dei vincoli: arrivare a un errore di vincolo vuol dire averle passate
            when others then insert into _esiti values ('{t}', 'inserisce', 'aperto');
  end;""")
    cartella = f"and (storage.foldername(name))[1] <> ''{uid}''" if uid else ''
    for bk in buckets:
        etichetta = 'bucket ' + bk
        b.append(f"""
  begin
    execute 'select count(*) from storage.objects where bucket_id = ''{bk}'' {cartella}' into n;
    insert into _esiti values ('{etichetta}', 'legge', n::text);
  exception when insufficient_privilege then insert into _esiti values ('{etichetta}', 'legge', 'negato');
            when others then insert into _esiti values ('{etichetta}', 'legge', '?? ' || sqlstate);
  end;
  begin
    -- un file nella cartella di un altro: le regole del bucket devono rifiutarlo (la cancellazione diretta in storage.objects la blocca Supabase da sé, non si prova)
    insert into storage.objects (bucket_id, name) values ('{bk}', '{altro}/prova-accessi.jpg');
    raise exception using errcode = 'ZT001', message = 'INSERITA';
  exception when sqlstate 'ZT001' then insert into _esiti values ('{etichetta}', 'inserisce', sqlerrm);
            when insufficient_privilege then insert into _esiti values ('{etichetta}', 'inserisce', 'negato');
            when others then insert into _esiti values ('{etichetta}', 'inserisce', '?? ' || sqlstate);
  end;""")
    return f"""begin;
create temp table _esiti (tabella text, prova text, esito text) on commit drop;
grant all on _esiti to anon, authenticated;
set local role {ruolo};
select set_config('request.jwt.claims', '{claims}', true);
do $prova$
declare n bigint;
begin{''.join(b)}
end
$prova$;
select tabella, prova, esito from _esiti;
rollback;"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--json', metavar='FILE', help='salva gli esiti grezzi')
    a = ap.parse_args()

    tutte = tabelle_personali()
    ignote = [t for t, c in tutte.items() if c is None]
    personali = {t: c for t, c in tutte.items() if c}
    utenti = leggi("select id, email from auth.users order by created_at")
    # Chi è «admin» per le regole, e su quali tabelle: lo si legge dalle regole stesse, non lo si suppone.
    regole_admin = leggi("""select tablename t, qual from pg_policies where schemaname='public' and cmd='SELECT' and qual like '%auth.jwt()%email%'""")
    tab_admin = {r['t'] for r in regole_admin}
    # Dove la regola dice che l'amministratore può anche aggiornare (letta_il, risolta_il, risposta di segnalazioni): è dichiarato, non è un buco.
    tab_admin_aggiorna = {r['t'] for r in leggi("""select tablename t from pg_policies where schemaname='public' and cmd in ('UPDATE','ALL') and qual like '%auth.jwt()%email%'""")}
    presenti = {r['id'] for r in leggi("select id from storage.buckets")}
    buckets = [b for b in BUCKET_PRIVATI if b in presenti]
    mancanti = [b for b in BUCKET_PRIVATI if b not in presenti]
    email_admin = {u['email'] for u in utenti if any(("'" + u['email'] + "'") in r['qual'] for r in regole_admin)}
    # Quante righe NON sue esistono per ognuno: una lettura a 0 dove non c'è niente da vedere non prova niente.
    conta = ' union all '.join(f"""select '{t}' t, "{c}"::text u, count(*) n from public."{t}" group by 2""" for t, c in personali.items())
    per_tabella = {}
    for r in leggi(conta):
        per_tabella.setdefault(r['t'], {})[r['u']] = r['n']
    foto_per_cartella = {r['u']: r['n'] for r in leggi(f"select (storage.foldername(name))[1] u, count(*) n from storage.objects where bucket_id='{BUCKET_PRIVATI[0]}' group by 1")}

    print(f"{len(personali)} tabelle con i dati delle persone · {len(CATALOGHI)} cataloghi · {len(utenti)} account · admin per le regole: {len(email_admin)} · tabelle con regola admin: {len(tab_admin)}")
    if mancanti:
        print('bucket non ancora creato (migrazione non eseguita), saltato: ' + ', '.join(mancanti))
    if ignote:
        print('⚠️ tabelle senza proprietario e non dichiarate come catalogo (da guardare): ' + ', '.join(ignote))

    attori = [('persona ' + str(i + 1) + (' (admin)' if u['email'] in email_admin else ''), 'authenticated', u) for i, u in enumerate(utenti)]
    attori.append(('persona finta (estranea)', 'authenticated', PERSONA_FINTA))
    attori.append(('non entrato', 'anon', None))
    ids = [u['id'] for u in utenti] + [PERSONA_FINTA['id']]
    col_cat = colonne_cataloghi()
    ko, grezzi, vuote = [], {}, set()
    for nome, ruolo, u in attori:
        uid = u['id'] if u else None
        altro = next(x for x in ids if x != uid)
        esiti = leggi(sql_attore(ruolo, uid, u['email'] if u else None, altro, personali, col_cat, buckets))
        grezzi[nome] = esiti
        admin = bool(u and u['email'] in email_admin)
        problemi = []
        for e in esiti:
            t, prova, esito = e['tabella'], e['prova'], e['esito']
            catalogo = t in CATALOGHI
            if esito.startswith('??'):
                problemi.append(f'{t}: {prova} non determinabile ({esito})')
            elif prova == 'legge':
                if t.startswith('bucket'):
                    if esito not in ('0', 'negato'):
                        problemi.append(f'{t}: vede {esito} file non suoi')
                elif catalogo:
                    atteso_visibile = ruolo == 'authenticated' or CATALOGHI[t]
                    if not atteso_visibile and esito not in ('0', 'negato'):
                        problemi.append(f'{t}: leggibile senza essere entrati ({esito} righe)')
                elif admin and t in tab_admin:
                    pass                                      # l'admin legge tutto su queste tabelle: è la regola dichiarata
                elif esito not in ('0', 'negato'):
                    problemi.append(f'{t}: LEGGE {esito} righe non sue')
            elif prova in ('modifica', 'cancella'):
                if prova == 'modifica' and admin and t in tab_admin_aggiorna:
                    pass                                      # l'admin aggiorna qui per regola dichiarata (segnalazioni: letta, risolta, risposta)
                elif esito not in ('0', 'negato'):
                    problemi.append(f"{t}: può {'MODIFICARE' if prova == 'modifica' else 'CANCELLARE'} {esito} righe {'del catalogo' if catalogo else 'non sue'}")
            elif prova == 'inserisce':
                if esito != 'negato':
                    problemi.append(f"{t}: può INSERIRE {'nel catalogo' if catalogo else 'a nome di un altro'} ({esito})")
        prove = len(esiti)
        print(f"  {'KO' if problemi else 'OK'}  {nome:<22} {prove - len(problemi)} prove su {prove} a posto")
        for p in problemi:
            print('        ✗ ' + p)
        ko += [(nome, p) for p in problemi]

    # Prove a vuoto: tabelle dove nessuno ha righe (la lettura a 0 non dimostra niente; le scritture sì).
    for t in personali:
        if not per_tabella.get(t):
            vuote.add(t)
    if vuote:
        print(f"\nlettura non dimostrabile, tabella vuota ({len(vuote)}): " + ', '.join(sorted(vuote)) + ' — scritture provate comunque')
    con_foto = [u for u in foto_per_cartella if foto_per_cartella[u]]
    print(f"foto nel bucket privato {BUCKET_PRIVATI[0]}: {sum(foto_per_cartella.values())} in {len(con_foto)} cartelle")
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            json.dump({'esiti': grezzi, 'ko': ko}, f, ensure_ascii=False, indent=1)
    # Controprova: dopo tutto questo, il numero di righe non è cambiato (niente è rimasto scritto).
    dopo = {}
    for r in leggi(conta):
        dopo.setdefault(r['t'], {})[r['u']] = r['n']
    if dopo != per_tabella:
        print('⚠️ i conteggi sono cambiati durante la prova (qualcuno sta usando l\'app, oppure qualcosa è rimasto scritto): ricontrollare')
    else:
        print('conteggi di tutte le tabelle identici prima e dopo: niente è rimasto scritto')
    print(f"\n{len(ko)} KO" if ko else '\ntutto OK')
    sys.exit(1 if ko else 0)


if __name__ == '__main__':
    main()
