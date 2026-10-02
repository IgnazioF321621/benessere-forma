#!/usr/bin/env python3
"""Fotografia dello schema vero del database (Fondamenta 030).

Legge i cataloghi di Postgres con sole SELECT (via `supabase db query`, che passa
dalla Management API: niente Docker, niente password del database) e scrive:

    supabase/migrations/<data>_fotografia_zero.sql   lo schema `public` + bucket e regole di Storage
    supabase/schema.json                             lo stesso, in forma leggibile dagli strumenti
    docs/SCHEMA_TABELLE.md                           l'elenco di tabelle e colonne, per chi scrive una query

    python3 tools/schema_fotografia.py                  # scrive i due file
    python3 tools/schema_fotografia.py --confronta      # non scrive: dice se il DB è cambiato rispetto a schema.json

Non scrive niente in Supabase. Richiede la CLI `supabase` già autenticata sul Mac.
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import date

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = 'qxiyeiahpoiliwpqslpr'
JSON_OUT = os.path.join(REPO, 'supabase', 'schema.json')
MD_OUT = os.path.join(REPO, 'docs', 'SCHEMA_TABELLE.md')
# Tabelle che esistono ma che il codice non nomina mai (misurato il 2 ottobre 2026 su app, admin, Worker e shared/).
MORTE = {'ai_memory', 'weekly_plan_acceptance'}

Q = {
 'estensioni': """select e.extname nome, n.nspname schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace order by 1""",
 'tipi': """select t.typname nome, array_agg(e.enumlabel order by e.enumsortorder) valori from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' group by 1 order by 1""",
 'sequenze': """select sequencename nome, data_type::text tipo, start_value, increment_by from pg_sequences where schemaname='public' order by 1""",
 'tabelle': """select c.relname tabella, c.relrowsecurity rls, c.relforcerowsecurity rls_forzata, obj_description(c.oid) commento from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1""",
 'colonne': """select c.relname tabella, a.attnum pos, a.attname colonna, format_type(a.atttypid,a.atttypmod) tipo, a.attnotnull non_nullo, pg_get_expr(d.adbin,d.adrelid) predefinito, a.attidentity identita, a.attgenerated generata from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped order by 1,2""",
 'vincoli': """select c.relname tabella, k.conname nome, k.contype tipo, pg_get_constraintdef(k.oid) definizione from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1, case k.contype when 'p' then 0 when 'u' then 1 when 'c' then 2 else 3 end, 2""",
 'indici': """select t.relname tabella, i.relname nome, pg_get_indexdef(x.indexrelid) definizione from pg_index x join pg_class i on i.oid=x.indexrelid join pg_class t on t.oid=x.indrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and not exists (select 1 from pg_constraint k where k.conindid=x.indexrelid) order by 1,2""",
 'regole': """select schemaname schema, tablename tabella, policyname nome, permissive, roles::text[] ruoli, cmd comando, qual usando, with_check controllo from pg_policies where schemaname='public' or (schemaname='storage' and tablename='objects') order by 1,2,3""",
 'funzioni': """select p.proname nome, pg_get_function_identity_arguments(p.oid) argomenti, pg_get_functiondef(p.oid) definizione from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e') order by 1,2""",
 'trigger': """select n.nspname schema, c.relname tabella, t.tgname nome, pg_get_triggerdef(t.oid) definizione from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid join pg_namespace pn on pn.oid=p.pronamespace where not t.tgisinternal and (n.nspname='public' or pn.nspname='public') order by 1,2,3""",
 'viste': """select viewname nome, definition definizione from pg_views where schemaname='public' order by 1""",
 'permessi': """select table_name tabella, grantee ruolo, array_agg(privilege_type::text order by privilege_type) permessi from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') group by 1,2 order by 1,2""",
 'bucket': """select id, name, public pubblico, file_size_limit limite_byte, allowed_mime_types tipi_ammessi from storage.buckets order by 1""",
 'righe': """select c.relname tabella, (xpath('/row/n/text()', query_to_xml(format('select count(*) n from public.%I', c.relname), false, true, '')))[1]::text::int righe from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1""",
}


def leggi(sql):
    r = subprocess.run(['supabase', 'db', 'query', '--linked', '--project-ref', REF, '-o', 'json', sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit('✗ lettura fallita: ' + (r.stderr or r.stdout)[-400:])
    testo = r.stdout[r.stdout.index('{'):]
    return json.JSONDecoder().raw_decode(testo)[0]['rows']


def fotografa():
    return {nome: leggi(sql) for nome, sql in Q.items()}


def struttura(s):
    """La fotografia senza ciò che cambia da solo (il numero di righe)."""
    return {k: v for k, v in s.items() if k != 'righe'}


def sql(s, oggi):
    o = []
    righe = {r['tabella']: r['righe'] for r in s['righe']}
    npol = {}
    for p in s['regole']:
        if p['schema'] == 'public':
            npol[p['tabella']] = npol.get(p['tabella'], 0) + 1
    o += ['-- ═══════════════════════════════════════════════════════════',
          f'-- Zona Tracker — fotografia zero dello schema ({oggi})',
          '-- ═══════════════════════════════════════════════════════════',
          f'-- Generata da tools/schema_fotografia.py leggendo i cataloghi di Postgres del progetto {REF}.',
          '-- NON è stata scritta a mano e NON va eseguita sul database vero: descrive ciò che c\'è già.',
          '-- Serve a ricostruire il database da zero e a vedere cosa cambia: da qui in avanti',
          '-- ogni modifica di struttura è un file datato in questa cartella.',
          '-- Comprende anche le tre tabelle dei file di settembre (weekly_pictures, body_check_ai, coach_proposals).',
          '--',
          f"-- {len(s['tabelle'])} tabelle · {len(s['colonne'])} colonne · {len(s['vincoli'])} vincoli · {len(s['indici'])} indici · "
          f"{sum(npol.values())} regole di accesso · {len(s['funzioni'])} funzioni · {len(s['trigger'])} trigger · {len(s['bucket'])} bucket",
          '--',
          '-- Fuori da questa fotografia: gli schemi gestiti da Supabase (auth, storage, realtime…),',
          '-- di cui si riportano solo i bucket e le regole su storage.objects.',
          '-- ═══════════════════════════════════════════════════════════', '']
    if s['estensioni']:
        o.append('-- Estensioni attive: ' + ', '.join(f"{e['nome']} ({e['schema']})" for e in s['estensioni']))
        o.append('')
    for t in s['tipi']:
        o.append(f"create type public.{t['nome']} as enum (" + ', '.join("'" + v.replace("'", "''") + "'" for v in t['valori']) + ');')
    for q in s['sequenze']:
        o.append(f"create sequence if not exists public.{q['nome']} as {q['tipo']} start {q['start_value']} increment {q['increment_by']};")
    if s['tipi'] or s['sequenze']:
        o.append('')

    o += ['-- ───────────────────────────────────────────────────────────', '-- FUNZIONI', '-- ───────────────────────────────────────────────────────────', '']
    for f in s['funzioni']:
        o += [f['definizione'].rstrip() + ';', '']

    o += ['-- ───────────────────────────────────────────────────────────', '-- TABELLE', '-- ───────────────────────────────────────────────────────────', '']
    esterni = []
    for t in s['tabelle']:
        nome = t['tabella']
        o.append(f"-- {nome} · {righe.get(nome, '?')} righe il {oggi} · accesso per riga: {'attivo' if t['rls'] else 'SPENTO'} · {npol.get(nome, 0)} regole")
        if t.get('commento'):
            o.append('-- ' + t['commento'].replace('\n', ' '))
        corpo = []
        for c in [c for c in s['colonne'] if c['tabella'] == nome]:
            r = f'  "{c["colonna"]}" {c["tipo"]}'
            if c['identita'] in ('a', 'd'):
                r += ' generated ' + ('always' if c['identita'] == 'a' else 'by default') + ' as identity'
            elif c['generata'] == 's':
                r += f" generated always as ({c['predefinito']}) stored"
            elif c['predefinito'] is not None:
                r += ' default ' + c['predefinito']
            if c['non_nullo']:
                r += ' not null'
            corpo.append(r)
        for k in [k for k in s['vincoli'] if k['tabella'] == nome]:
            if k['tipo'] == 'f':
                esterni.append(f'alter table public."{nome}" add constraint "{k["nome"]}" {k["definizione"]};')
            else:
                corpo.append(f'  constraint "{k["nome"]}" {k["definizione"]}')
        o.append(f'create table public."{nome}" (')
        o.append(',\n'.join(corpo))
        o.append(');')
        for i in [i for i in s['indici'] if i['tabella'] == nome]:
            o.append(i['definizione'] + ';')
        if t['rls']:
            o.append(f'alter table public."{nome}" enable row level security;')
        if t['rls_forzata']:
            o.append(f'alter table public."{nome}" force row level security;')
        o.append('')

    o += ['-- ───────────────────────────────────────────────────────────', '-- COLLEGAMENTI FRA TABELLE (chiavi esterne)', '-- ───────────────────────────────────────────────────────────', '']
    o += esterni + ['']

    def regola(p):
        r = f'create policy "{p["nome"]}" on {p["schema"]}."{p["tabella"]}"'
        if p['permissive'] != 'PERMISSIVE':
            r += ' as restrictive'
        r += f"\n  for {p['comando'].lower()} to {', '.join(p['ruoli'])}"
        if p['usando'] is not None:
            r += f"\n  using ({p['usando']})"
        if p['controllo'] is not None:
            r += f"\n  with check ({p['controllo']})"
        return r + ';'

    o += ['-- ───────────────────────────────────────────────────────────', '-- REGOLE DI ACCESSO (chi può leggere e scrivere cosa)', '-- ───────────────────────────────────────────────────────────', '']
    ultima = None
    for p in [p for p in s['regole'] if p['schema'] == 'public']:
        if p['tabella'] != ultima:
            o.append(f"-- {p['tabella']}")
            ultima = p['tabella']
        o.append(regola(p))
    senza = [t['tabella'] for t in s['tabelle'] if t['rls'] and not npol.get(t['tabella'])]
    if senza:
        o += ['', '-- Accesso per riga attivo e NESSUNA regola (dall\'app non si legge né si scrive, solo con la chiave di servizio): ' + ', '.join(senza)]
    spente = [t['tabella'] for t in s['tabelle'] if not t['rls']]
    if spente:
        o += ['', '-- ⚠️ Accesso per riga SPENTO (chiunque abbia la chiave pubblica passa dai permessi di tabella): ' + ', '.join(spente)]
    o.append('')

    o += ['-- Permessi di tabella per i ruoli dell\'app (anon = non entrato, authenticated = entrato).',
          '-- Le regole di accesso qui sopra restringono ulteriormente, riga per riga.']
    for g in s['permessi']:
        o.append(f"grant {', '.join(p.lower() for p in g['permessi'])} on public.\"{g['tabella']}\" to {g['ruolo']};")
    o.append('')

    if s['trigger']:
        o += ['-- ───────────────────────────────────────────────────────────', '-- TRIGGER', '-- ───────────────────────────────────────────────────────────', '']
        o += [t['definizione'] + ';' for t in s['trigger']] + ['']
    if s['viste']:
        o += ['-- VISTE', '']
        o += [f"create view public.\"{v['nome']}\" as\n{v['definizione']}" for v in s['viste']] + ['']

    o += ['-- ───────────────────────────────────────────────────────────', '-- STORAGE: bucket e regole sugli oggetti', '-- ───────────────────────────────────────────────────────────', '']
    for b in s['bucket']:
        tipi = 'null' if b['tipi_ammessi'] is None else "array[" + ', '.join("'" + x + "'" for x in b['tipi_ammessi']) + ']'
        o.append(f"insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('{b['id']}', '{b['name']}', {str(b['pubblico']).lower()}, {b['limite_byte'] if b['limite_byte'] is not None else 'null'}, {tipi});")
    o.append('')
    o += [regola(p) for p in s['regole'] if p['schema'] == 'storage'] + ['']
    return '\n'.join(o)


def markdown(s, oggi):
    righe = {r['tabella']: r['righe'] for r in s['righe']}
    o = ['# Tabelle e colonne — lo schema vero', '',
         f'*Generato da `tools/schema_fotografia.py` il {oggi} leggendo il database. **Non si modifica a mano**: si rigenera.*', '',
         f"{len(s['tabelle'])} tabelle, {len(s['colonne'])} colonne. Le regole d'uso (cosa significa un campo, cosa non fare) restano in [`SCHEMA.md`](SCHEMA.md); "
         'la struttura completa, con regole di accesso e bucket, in [`supabase/migrations/`](../supabase/migrations/).', '',
         '| Tabella | Righe | Regole di accesso | Chiave | Una riga sola per |', '|---|---:|---:|---|---|']
    npol = {}
    for p in s['regole']:
        if p['schema'] == 'public':
            npol[p['tabella']] = npol.get(p['tabella'], 0) + 1
    def vinc(t, tipo):
        return ' · '.join(k['definizione'].split('(', 1)[1].rsplit(')', 1)[0] for k in s['vincoli'] if k['tabella'] == t and k['tipo'] == tipo)
    for t in s['tabelle']:
        n = t['tabella']
        o.append(f"| [`{n}`](#{n}){' — **non usata dal codice**' if n in MORTE else ''} | {righe.get(n, '?')} | {npol.get(n, 0)} | {vinc(n, 'p') or '—'} | {vinc(n, 'u') or '—'} |")
    for t in s['tabelle']:
        n = t['tabella']
        o += ['', f'### `{n}`', '']
        if n in MORTE:
            o += ['⚠️ **Tabella morta**: esiste nel database ma il codice non la nomina mai.', '']
        o += ['| Colonna | Tipo | Obbligatoria | Predefinito |', '|---|---|---|---|']
        for c in [c for c in s['colonne'] if c['tabella'] == n]:
            pre = (c['predefinito'] or '').replace('|', '\\|')
            o.append(f"| `{c['colonna']}` | {c['tipo']} | {'sì' if c['non_nullo'] else ''} | {('`' + pre + '`') if pre else ''} |")
        altri = [k for k in s['vincoli'] if k['tabella'] == n and k['tipo'] in ('f', 'c')]
        if altri:
            o += ['', 'Vincoli:'] + [f"- `{k['nome']}` — `{k['definizione']}`" for k in altri]
    return '\n'.join(o) + '\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--confronta', action='store_true', help='non scrive: confronta il DB con supabase/schema.json')
    a = ap.parse_args()
    s = fotografa()
    if a.confronta:
        with open(JSON_OUT, encoding='utf-8') as f:
            prima = json.load(f)
        diversi = [k for k in struttura(s) if json.dumps(s[k], sort_keys=True) != json.dumps(prima['schema'].get(k), sort_keys=True)]
        if not diversi:
            print(f"✓ il database coincide con la fotografia del {prima['quando']}")
            return
        for k in diversi:
            chiave = lambda r: json.dumps(r, sort_keys=True, ensure_ascii=False)
            a_, b_ = set(map(chiave, prima['schema'].get(k) or [])), set(map(chiave, s[k]))
            print(f'✗ {k}: {len(b_ - a_)} voci nuove o cambiate, {len(a_ - b_)} sparite o cambiate')
            for v in sorted(b_ - a_)[:10]:
                print('   + ' + v[:200])
            for v in sorted(a_ - b_)[:10]:
                print('   − ' + v[:200])
        sys.exit(1)
    oggi = date.today().isoformat()
    file_sql = os.path.join(REPO, 'supabase', 'migrations', oggi.replace('-', '') + '_fotografia_zero.sql')
    with open(file_sql, 'w', encoding='utf-8') as f:
        f.write(sql(s, oggi))
    with open(JSON_OUT, 'w', encoding='utf-8') as f:
        json.dump({'quando': oggi, 'progetto': REF, 'schema': struttura(s), 'righe': s['righe']}, f, ensure_ascii=False, indent=1, sort_keys=True)
    with open(MD_OUT, 'w', encoding='utf-8') as f:
        f.write(markdown(s, oggi))
    print(f"{len(s['tabelle'])} tabelle · {len(s['colonne'])} colonne · {len(s['vincoli'])} vincoli · {len(s['indici'])} indici · "
          f"{len([p for p in s['regole'] if p['schema']=='public'])} regole · {len(s['funzioni'])} funzioni · {len(s['trigger'])} trigger · {len(s['bucket'])} bucket")
    print('→', os.path.relpath(file_sql, REPO), '·', os.path.relpath(JSON_OUT, REPO), '·', os.path.relpath(MD_OUT, REPO))


if __name__ == '__main__':
    main()
