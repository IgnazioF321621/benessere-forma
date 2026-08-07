#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Libera dai registri i codici PRENOTATI e mai scritti a catalogo.

PROVA A VUOTO di default: senza --applica non scrive niente.
Con --applica riscrive il registro, dopo averne salvato una copia.

SOLA LETTURA verso Supabase (elenco codici). Nessun download dal bucket:
il contatore dei byte chiude a zero e lo dimostra.

Perche' serve
-------------
Un codice scritto in un registro prima di esistere a catalogo non e' una
prenotazione: e' una collisione che aspetta. Quando il codice viene poi assegnato
davvero — dal foglio, a qualcun altro — le due cose si scontrano e qualcuno viene
rinumerato. E' gia' successo con EX609/EX611/EX613/EX614, rinumerati da EX615 in
su dopo il sync di Cardio del 2 agosto.

Questo strumento toglie il codice dalle righe che lo prenotano senza averlo.
**La riga resta**, con la sua impronta e il nome deciso: quello che si perde e'
solo la prenotazione. Il codice si assegna al momento della scrittura, guardando
qual e' il primo libero in quel momento.

Uso:  python3 libera_prenotati.py            prova a vuoto
      python3 libera_prenotati.py --applica  scrive, con backup
"""
import argparse
import csv
import datetime
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import leggi_tutto, stampa_consumo  # noqa: E402

BASE = Path(__file__).parent
TSV = BASE / 'cantiere_96_pendente.tsv'
BACKUP = BASE / 'backup'
OGGI = datetime.date.today().isoformat()


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
    print('Libero i codici prenotati e mai scritti')
    print('  registro: %s' % TSV.name)
    print('  righe   : %d\n' % len(righe))

    cat, err = leggi_tutto('esercizi_catalog', 'codice', 'codice')
    if err:
        sys.exit('  lettura catalogo fallita: %s' % err)
    esistono = {c['codice'] for c in cat}
    print('  catalogo: %d codici\n' % len(esistono))

    # Una riga prenota se il codice scritto nel registro non esiste a catalogo e
    # non ne e' stato ricavato uno vero dall'impronta.
    da_liberare = [r for r in righe
                   if (r.get('codice_registro') or '').strip()
                   and r['codice_registro'] not in esistono
                   and not (r.get('codice_reale') or '').strip()]

    if not da_liberare:
        print('  Nessun codice prenotato: niente da fare.')
        stampa_consumo()
        return

    print('  CODICI PRENOTATI DA LIBERARE: %d\n' % len(da_liberare))
    for r in da_liberare:
        print('     %-7s  %s/%s' % (r['codice_registro'], r['cartella_mac'],
                                    r['nome_in_decisioni']))
    print('\n  La riga resta: si perde solo il codice, non il nome ne l\'impronta.')

    nuove = []
    for r in righe:
        r2 = dict(r)
        if r in da_liberare:
            vecchio = r2['codice_registro']
            r2['codice_registro'] = ''
            r2['codici_concordano'] = '-'
            nota = ('codice %s liberato il %s: era prenotato e mai scritto a catalogo; '
                    'si assegna al momento della scrittura' % (vecchio, OGGI))
            r2['nota'] = (nota + ' | ' + (r2.get('nota') or '')).strip(' |')
        nuove.append(r2)

    if not args.applica:
        print('\n  PROVA A VUOTO: non ho scritto niente.')
        print('  Per applicare:  python3 libera_prenotati.py --applica')
        stampa_consumo()
        return

    BACKUP.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S')
    copia = BACKUP / ('cantiere_96_pendente_prima_di_liberare_%s.tsv' % stamp)
    shutil.copy2(TSV, copia)
    scrivi(TSV, colonne, nuove)

    # rilettura di controllo: stesso numero di righe, stesse impronte, nessuno stato perso
    ric, _ = leggi(TSV)
    prima_sha = [r.get('sha256') for r in righe]
    dopo_sha = [r.get('sha256') for r in ric]
    if len(ric) != len(righe):
        sys.exit('  ERRORE: riletto %d righe invece di %d — ripristina da %s'
                 % (len(ric), len(righe), copia))
    if prima_sha != dopo_sha:
        sys.exit('  ERRORE: le impronte non coincidono piu — ripristina da %s' % copia)
    liberati = sum(1 for r in ric if not (r.get('codice_registro') or '').strip()
                   and not (r.get('codice_reale') or '').strip())
    print('\n  backup: %s' % copia)
    print('  scritto: %s' % TSV)
    print('  riletto: %d righe, %d impronte identiche a prima, %d righe senza codice'
          % (len(ric), sum(1 for a, b in zip(prima_sha, dopo_sha) if a == b), liberati))
    stampa_consumo()


if __name__ == '__main__':
    main()
