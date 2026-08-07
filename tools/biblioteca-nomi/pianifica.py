#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Piano di migrazione di una zona — SOLA LETTURA.

Non scrive nulla su Storage, biblioteca_gif, esercizi_catalog o Sheet: produce
soltanto lavoro/piano_<zona>.json e un TSV leggibile.

L'aggancio file -> riga -> codice si fa per IMPRONTA SHA-256, mai per nome.

Tre tipi di operazione:
  nuova          il file non e' nel bucket: oggetto nuovo + riga nuova, nessun codice
  slug invariato il percorso cambia ma lo slug no: rinomina nel bucket + storage_path
  slug nuovo     lo slug cambia: ordine a righe doppie, perche' esercizi_catalog.gif_slug
                 si aggiorna dal Sheet a mano e la finestra fra i due va coperta

Uso:  python3 pianifica.py "Bicipiti e Braccia"
"""
import argparse
import collections
import csv
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import impronte_zona, leggi_tutto, nfc, sha_file  # noqa: E402
from nomenclatura import percorso_ascii, slug  # noqa: E402

BASE = Path(__file__).parent
GIF_ROOT = Path(os.environ.get('BIBLIOTECA_ROOT',
                               '/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi'))

# I nomi hanno UNA sola fonte: il pannello di conferma, cioe' l'unico posto in cui
# il nome e' stato scelto guardando la GIF. Nessun nome entra qui per altre strade.


def registro_ultimo():
    """Registro append-only: per ogni impronta vale l'ultima riga scritta."""
    p = BASE / 'esiti' / 'registro_decisioni.tsv'
    out = {}
    with open(p, encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh, delimiter='\t'):
            if r.get('sha256'):
                out[r['sha256']] = r
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    args = ap.parse_args()
    Z = args.zona
    cartella = GIF_ROOT / Z

    per_sha, falliti, err = impronte_zona(
        Z, BASE / 'lavoro' / '_impronte' / (slug(Z) + '.json'), verbose=False)
    if err:
        sys.exit('bucket non raggiungibile: %s' % err)
    if falliti:
        sys.exit('%d oggetti senza impronta: piano non costruibile' % len(falliti))

    bib, e = leggi_tutto('biblioteca_gif', 'slug,nome_italiano,categoria,storage_path', 'slug')
    if e:
        sys.exit('biblioteca_gif: %s' % e)
    cat, e = leggi_tutto('esercizi_catalog', 'codice,nome,gruppo_target,gif_slug', 'codice')
    if e:
        sys.exit('esercizi_catalog: %s' % e)

    per_path = collections.defaultdict(list)
    for b in bib:
        if b.get('storage_path'):
            per_path[nfc(b['storage_path'])].append(b)
    per_slug_bib = collections.defaultdict(list)
    for b in bib:
        per_slug_bib[b['slug']].append(b)
    per_slug_cod = collections.defaultdict(list)
    for c in cat:
        if c.get('gif_slug'):
            per_slug_cod[c['gif_slug']].append(c)

    reg = registro_ultimo()

    righe = []
    for f in sorted((nfc(x) for x in os.listdir(cartella) if x.lower().endswith('.gif')),
                    key=str.lower):
        sha = sha_file(cartella / f)
        paths = per_sha.get(sha, [])
        bib_rows = [r for p in paths for r in per_path.get(p, [])]
        codici = []
        for r in bib_rows:
            for c in per_slug_cod.get(r['slug'], []):
                if c['codice'] not in [x['codice'] for x in codici]:
                    codici.append(c)

        dec = reg.get(sha, {})
        nome = dec.get('nome_confermato', '').strip()
        origine_nome = 'pannello'
        if not nome:
            sys.exit('riga senza nome confermato: %s' % f)

        slug_nuovo = slug(nome)
        slug_attuale = bib_rows[0]['slug'] if bib_rows else None
        path_attuale = paths[0] if paths else None
        # Il percorso nel bucket e' ASCII; l'accento resta in nome_italiano e
        # nel file sul Mac. Traslitterato alla fonte, non a mano riga per riga.
        path_dest = '%s/%s.gif' % (Z, percorso_ascii(nome))

        if not paths:
            op = 'nuova'
        elif slug_nuovo != slug_attuale:
            op = 'slug nuovo'
        else:
            op = 'slug invariato'

        righe.append({
            'file_mac': f, 'sha256': sha, 'bytes': (cartella / f).stat().st_size,
            'nome_finale': nome, 'origine_nome': origine_nome,
            'slug_attuale': slug_attuale, 'slug_nuovo': slug_nuovo,
            'slug_cambia': bool(slug_attuale) and slug_nuovo != slug_attuale,
            'codici': [{'codice': c['codice'], 'nome_catalogo': c['nome'],
                        'gruppo_target': c.get('gruppo_target'),
                        'gif_slug': c.get('gif_slug')} for c in codici],
            'storage_path_attuale': path_attuale,
            'storage_path_dest': path_dest,
            'percorso_cambia': path_attuale != path_dest,
            'nome_file_mac_allineato': f == '%s.gif' % nome,
            'operazione': op,
        })

    # ---- controlli di coerenza -------------------------------------------
    per_slug_nuovo = collections.defaultdict(list)
    for r in righe:
        per_slug_nuovo[r['slug_nuovo']].append(r)
    collisioni_interne = {s: [r['nome_finale'] for r in v]
                          for s, v in per_slug_nuovo.items() if len(v) > 1}

    # uno slug nuovo che esiste gia' in biblioteca_gif e non e' la riga stessa
    collisioni_esterne = []
    for s, v in per_slug_nuovo.items():
        miei = {r['slug_attuale'] for r in v}
        for b in per_slug_bib.get(s, []):
            if s not in miei:
                collisioni_esterne.append({'slug': s, 'nome_finale': v[0]['nome_finale'],
                                           'riga_esistente': b['storage_path']})

    per_dest = collections.defaultdict(list)
    for r in righe:
        per_dest[r['storage_path_dest']].append(r['nome_finale'])
    collisioni_percorso = {p: v for p, v in per_dest.items() if len(v) > 1}

    # un percorso di destinazione che oggi e' occupato da un ALTRO oggetto
    sovrascritture = []
    occupati = {p: r for r in righe for p in ([r['storage_path_attuale']]
                                              if r['storage_path_attuale'] else [])}
    for r in righe:
        alt = occupati.get(r['storage_path_dest'])
        if alt is not None and alt['sha256'] != r['sha256']:
            sovrascritture.append({'dest': r['storage_path_dest'],
                                   'chi_scrive': r['nome_finale'],
                                   'chi_occupa_ora': alt['nome_finale'],
                                   'codice_occupante': [c['codice'] for c in alt['codici']]})

    # Codici che perderebbero la GIF.
    # Un codice del piano NON e' orfano: il suo slug vecchio sparisce, ma la riga nuova
    # con lo slug nuovo esiste gia' e il Sheet lo riallinea. Orfano e' il codice che
    # punta a uno slug in via di cancellazione senza essere quello della riga: tipico
    # di un codice di un'altra zona che condivideva lo slug.
    slug_vecchi = {r['slug_attuale'] for r in righe if r['slug_cambia']}
    codici_del_piano = {c['codice'] for r in righe for c in r['codici']}
    orfani = []
    for s in slug_vecchi:
        riga = next(r for r in righe if r['slug_attuale'] == s)
        suoi = {c['codice'] for c in riga['codici']}
        for c in per_slug_cod.get(s, []):
            if c['codice'] not in suoi:
                orfani.append({'codice': c['codice'], 'nome': c['nome'],
                               'slug_che_sparisce': s,
                               'anche_nel_piano': c['codice'] in codici_del_piano})

    non_ascii = [{'nome': r['nome_finale'], 'percorso': r['storage_path_dest']}
                 for r in righe if any(ord(ch) > 127 for ch in r['storage_path_dest'])]

    piano = {'zona': Z, 'aggancio': 'sha256', 'righe': righe,
             'percorsi_non_ascii': non_ascii,
             'collisioni_slug_interne': collisioni_interne,
             'collisioni_slug_esterne': collisioni_esterne,
             'collisioni_percorso': collisioni_percorso,
             'sovrascritture_percorso': sovrascritture,
             'codici_senza_gif': orfani}
    piani = BASE / 'lavoro' / '_piani'
    piani.mkdir(parents=True, exist_ok=True)
    dest = piani / ('piano_%s.json' % slug(Z))
    dest.write_text(json.dumps(piano, ensure_ascii=False, indent=1), encoding='utf-8')

    tsv = piani / ('piano_%s.tsv' % slug(Z))
    col = ['operazione', 'codice', 'nome_finale', 'slug_attuale', 'slug_nuovo',
           'slug_cambia', 'storage_path_attuale', 'storage_path_dest', 'sha256']
    with open(tsv, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, delimiter='\t', lineterminator='\r\n')
        w.writerow(col)
        for r in righe:
            w.writerow([r['operazione'], ','.join(c['codice'] for c in r['codici']) or '-',
                        r['nome_finale'], r['slug_attuale'] or '-', r['slug_nuovo'],
                        'SI' if r['slug_cambia'] else 'no',
                        r['storage_path_attuale'] or '-', r['storage_path_dest'],
                        r['sha256'][:12]])

    c = collections.Counter(r['operazione'] for r in righe)
    print('PIANO "%s"  —  %d righe' % (Z, len(righe)))
    for k in ('slug invariato', 'slug nuovo', 'nuova'):
        print('  %-15s %3d' % (k, c[k]))
    print('  %-15s %3d' % ('TOTALE', sum(c.values())))
    print('  percorso che cambia : %d' % sum(1 for r in righe if r['percorso_cambia']))
    print('  slug che cambia     : %d' % sum(1 for r in righe if r['slug_cambia']))
    print('\n  collisioni slug fra le righe del piano : %s' % (collisioni_interne or 'nessuna'))
    print('  collisioni slug con righe esistenti    : %s' % (collisioni_esterne or 'nessuna'))
    print('  collisioni di percorso fra le righe    : %s' % (collisioni_percorso or 'nessuna'))
    print('  destinazioni oggi occupate da altri    : %d' % len(sovrascritture))
    for s in sovrascritture:
        print('     %s  <- "%s"  occupato da "%s" %s'
              % (s['dest'], s['chi_scrive'], s['chi_occupa_ora'], s['codice_occupante']))
    print('  percorsi NON ASCII (devono essere 0)   : %d' % len(non_ascii))
    for x in non_ascii:
        print('     %s' % x['percorso'])
    print('  codici che resterebbero senza GIF      : %d' % len(orfani))
    for o in orfani:
        print('     %s %s (slug %s)' % (o['codice'], o['nome'], o['slug_che_sparisce']))
    print('\n  scritto: %s\n           %s' % (dest, tsv))


if __name__ == '__main__':
    main()
