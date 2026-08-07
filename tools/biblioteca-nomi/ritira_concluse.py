#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ritira dal registro pendente le righe che descrivono lavoro gia' concluso.

PROVA A VUOTO di default: senza --applica non scrive niente.
SOLA LETTURA verso Supabase. Nessun download dal bucket: il contatore chiude a
zero e lo dimostra.

Perche' serve
-------------
Il registro `cantiere_96_pendente.tsv` serve a una cosa sola: dire quali file sono
gia' impegnati, per non liberarne il nome. Una riga il cui esercizio e' gia' a
catalogo con la sua GIF non risponde piu' a quella domanda — descrive lavoro fatto.

Misurato il 7 agosto: su 96 righe, **89 erano concluse**. Un registro che per il
93% parla del passato fa lavorare a vuoto chi lo legge e conserva dati vecchi che
col tempo diventano sbagliati (vedi le 20 righe con impronta dedotta, [L25]).

Le righe ritirate NON si buttano: finiscono in backup/ in un TSV loro, con la data.

Come si decide che una riga e' conclusa
---------------------------------------
**Dall'IMPRONTA del suo file, mai dal codice.**

Una riga e' conclusa quando il file che descrive e' arrivato nel bucket ed e'
puntato da un codice vivo: impronta -> oggetto nel bucket -> riga di
biblioteca_gif -> codice. Se quella catena si chiude, quel file e' servito
dall'app e il registro non deve piu' proteggerne il nome.

Il criterio ovvio — "il codice della riga ha un gif_slug" — e' SBAGLIATO, ed e'
stato scartato dopo averlo misurato: **23 righe su 89** avrebbero superato quel
test pur avendo il file ancora da migrare. Succede perche' il codice scritto nel
registro punta a un esercizio che ha si' la sua GIF, ma un'ALTRA: il codice non
descrive la riga accanto a cui e' scritto [L23]. Fidarsi del codice avrebbe tolto
la protezione a 23 file ancora da lavorare, 8 dei quali in Spalle e Cuffia, che e'
la prossima zona da aprire.

Il nome a catalogo si guarda solo come conferma da stampare, mai come criterio.

Uso:  python3 ritira_concluse.py            prova a vuoto
      python3 ritira_concluse.py --applica  scrive, con backup
"""
import argparse
import collections
import csv
import datetime
import shutil
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import impronte_zona, leggi_tutto, nfc, stampa_consumo  # noqa: E402

BASE = Path(__file__).parent
TSV = BASE / 'cantiere_96_pendente.tsv'
BACKUP = BASE / 'backup'
OGGI = datetime.date.today().isoformat()

# Marcatura delle righe la cui impronta non e' stata verificata ma dedotta dal
# codice del registro — un dato che [L25] ha dimostrato non reggere.
DA_RIVERIFICARE = 'da riverificare: impronta dedotta dal codice, non verificata'


def norm(s):
    return ' '.join(unicodedata.normalize('NFC', s or '')
                    .lower().replace("'", ' ').replace('-', ' ').split())


def leggi(p):
    with open(p, encoding='utf-8-sig', newline='') as fh:
        r = csv.DictReader(fh, delimiter='\t')
        return list(r), list(r.fieldnames or [])


def scrivi(p, colonne, righe):
    with open(p, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, delimiter='\t', lineterminator='\r\n')
        w.writerow(colonne)
        for r in righe:
            w.writerow([str(r.get(c, '')).replace('\t', ' ').replace('\n', ' ')
                        for c in colonne])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--applica', action='store_true')
    args = ap.parse_args()

    if not TSV.exists():
        sys.exit('manca %s' % TSV)
    righe, colonne = leggi(TSV)
    print('Ritiro dal registro le righe gia\' concluse')
    print('  registro: %s' % TSV.name)
    print('  righe   : %d\n' % len(righe))

    cat, err = leggi_tutto('esercizi_catalog', 'codice,nome,gif_slug', 'codice')
    if err:
        sys.exit('  lettura catalogo fallita: %s' % err)
    bib, err = leggi_tutto('biblioteca_gif', 'slug,storage_path', 'slug')
    if err:
        sys.exit('  lettura biblioteca_gif fallita: %s' % err)
    per_cod = {c['codice']: c for c in cat}
    nomi = {norm(c['nome']) for c in cat if (c.get('gif_slug') or '').strip()}
    print('  catalogo: %d codici, %d con GIF' % (len(cat), len(nomi)))

    # --- impronta -> codici vivi: la catena che decide -------------------
    per_slug_cod = collections.defaultdict(list)
    for c in cat:
        if (c.get('gif_slug') or '').strip():
            per_slug_cod[c['gif_slug']].append(c['codice'])
    per_path = collections.defaultdict(list)
    for b in bib:
        if b.get('storage_path'):
            per_path[nfc(b['storage_path'])].append(b['slug'])

    zone = sorted({r['cartella_mac'] for r in righe if r.get('cartella_mac')})
    print('  leggo le impronte del bucket in %d zone (nessun download)…' % len(zone))
    sha_a_codici = {}
    for z in zone:
        ps, falliti, e = impronte_zona(z, None, verbose=False)
        if e:
            sys.exit('  bucket "%s" non leggibile: %s — mi fermo, non ritiro niente' % (z, e))
        if falliti:
            # Un'impronta non determinabile rende INDETERMINATO lo stato: non si
            # puo' dire "conclusa" per silenzio [L10]. Meglio fermarsi.
            sys.exit('  %d oggetti senza impronta in "%s": non ritiro niente' % (len(falliti), z))
        for sha, paths in ps.items():
            cod = [c for p in paths for s in per_path.get(nfc(p), [])
                   for c in per_slug_cod.get(s, [])]
            if cod:
                sha_a_codici[sha] = cod
    print('  %d impronte del bucket risultano puntate da un codice vivo\n'
          % len(sha_a_codici))

    concluse, restano = [], []
    conta = collections.Counter()
    for r in righe:
        cod = (r.get('codice_reale') or '').strip() or (r.get('codice_registro') or '').strip()
        per_nome = norm(r.get('nome_in_decisioni')) in nomi

        # IL criterio: il file di questa riga e' servito dall'app?
        codici_vivi = sha_a_codici.get(r.get('sha256') or '')

        # Solo per il resoconto: quante righe avrebbero superato il criterio
        # sbagliato (il codice ha un gif_slug) pur avendo il file da migrare.
        c = per_cod.get(cod) if cod else None
        if bool(c and (c.get('gif_slug') or '').strip()) and not codici_vivi:
            conta['salvate dal criterio giusto'] += 1

        if codici_vivi:
            conta['conclusa'] += 1
            conta['conclusa+nome' if per_nome else 'conclusa senza riscontro nome'] += 1
            r2 = dict(r)
            r2['ritirata_il'] = OGGI
            r2['ritirata_perche'] = ('impronta servita dal codice %s%s'
                                     % (','.join(codici_vivi),
                                        '; nome confermato dal catalogo' if per_nome
                                        else '; nome non trovato a catalogo'))
            concluse.append(r2)
        else:
            conta['resta'] += 1
            r2 = dict(r)
            # La riga resta perche' il suo file NON e' ancora servito dall'app:
            # e' pendente, qualunque cosa dicesse la colonna `stato` prima. Quella
            # colonna era una fotografia del giorno della conversione, e per 23
            # righe diceva "sincronizzato" basandosi sul codice invece che sul file.
            r2['stato'] = 'pendente'
            # Se poi l'impronta era stata DEDOTTA dal codice, non e' verificata e
            # non va creduta: la riga si marca, non si tiene in silenzio.
            if r.get('impronta_da') == 'catena catalogo->bucket':
                conta['sopravvive con impronta dedotta'] += 1
                r2['stato'] = 'da riverificare'
                if DA_RIVERIFICARE not in (r2.get('nota') or ''):
                    r2['nota'] = (DA_RIVERIFICARE + ' | ' + (r2.get('nota') or '')).strip(' |')
            restano.append(r2)

    if conta['salvate dal criterio giusto']:
        print('  ⚠️  %d righe hanno il codice con gif_slug MA il file ancora da migrare:'
              % conta['salvate dal criterio giusto'])
        print('      restano protette. Il criterio sul codice le avrebbe ritirate.\n')
    print('  RIGHE CONCLUSE DA RITIRARE : %d' % conta['conclusa'])
    print('     di cui col nome confermato anche dal catalogo : %d'
          % conta['conclusa+nome'])
    print('     di cui senza riscontro sul nome               : %d'
          % conta['conclusa senza riscontro nome'])
    print('\n  RIGHE CHE RESTANO          : %d' % conta['resta'])
    for r in restano:
        print('     %-14s %s/%s' % (r.get('stato', ''), r['cartella_mac'],
                                    r['nome_in_decisioni']))
    if conta['sopravvive con impronta dedotta']:
        print('\n  ⚠️  %d righe rimaste hanno impronta DEDOTTA: marcate "da riverificare"'
              % conta['sopravvive con impronta dedotta'])
    else:
        print('\n  Nessuna riga rimasta ha impronta dedotta: niente da marcare.')

    if not args.applica:
        print('\n  PROVA A VUOTO: non ho scritto niente.')
        print('  Per applicare:  python3 ritira_concluse.py --applica')
        stampa_consumo()
        return

    BACKUP.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S')
    copia = BACKUP / ('cantiere_96_pendente_prima_del_ritiro_%s.tsv' % stamp)
    shutil.copy2(TSV, copia)
    archivio = BACKUP / ('cantiere_96_concluse_%s.tsv' % stamp)
    scrivi(archivio, colonne + ['ritirata_il', 'ritirata_perche'], concluse)
    scrivi(TSV, colonne, restano)

    # rilettura di controllo: la somma deve tornare, e nessuna impronta sparire
    ric, _ = leggi(TSV)
    arc, _ = leggi(archivio)
    if len(ric) + len(arc) != len(righe):
        sys.exit('  ERRORE: %d + %d != %d — ripristina da %s'
                 % (len(ric), len(arc), len(righe), copia))
    persi = ({r['sha256'] for r in righe if r.get('sha256')}
             - {r['sha256'] for r in ric + arc if r.get('sha256')})
    if persi:
        sys.exit('  ERRORE: %d impronte perse — ripristina da %s' % (len(persi), copia))
    print('\n  backup del registro intero : %s' % copia)
    print('  righe concluse archiviate  : %s (%d righe)' % (archivio, len(arc)))
    print('  registro ora               : %d righe' % len(ric))
    print('  controllo: %d + %d = %d, nessuna impronta persa.'
          % (len(ric), len(arc), len(righe)))
    stampa_consumo()


if __name__ == '__main__':
    main()
