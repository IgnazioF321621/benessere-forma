#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Controllo inverso rigoroso: enumera il bucket dalla radice, non dai path noti.

Elencare solo i prefissi ricavati da biblioteca_gif lascerebbe fuori un'eventuale
cartella che nessuna riga nomina — che e' proprio il caso che il controllo cerca.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from migra import api, elenco_bucket, nfc, BK  # noqa: E402

radice, err = api('POST', '/storage/v1/object/list/biblioteca-gif',
                  {'prefix': '', 'limit': 1000, 'sortBy': {'column': 'name', 'order': 'asc'}})
if err:
    sys.exit('elenco radice fallito: %s' % err)

cartelle = [o['name'] for o in radice if o.get('id') is None]
file_radice = [o['name'] for o in radice if o.get('id') is not None]
print('cartelle nella radice del bucket: %d' % len(cartelle))
for c in cartelle:
    print('   ' + c)
print('file sciolti nella radice: %d' % len(file_radice))

tutti = [nfc(n) for n in file_radice]
for c in cartelle:
    for o in elenco_bucket(c):
        if o.get('id') is not None:
            tutti.append(nfc('%s/%s' % (c, o['name'])))
print('\noggetti totali nel bucket: %d' % len(tutti))

bib = json.load(open(BK / 'biblioteca_gif.json'))
nel_bib = {nfc(b['storage_path']) for b in bib if b.get('storage_path')}
orfani = sorted(set(tutti) - nel_bib)
print('righe con storage_path      : %d' % len(nel_bib))
print('ORFANI (file senza riga)    : %d' % len(orfani))
for p in orfani[:50]:
    print('   ' + p)
if len(orfani) > 50:
    print('   … e altri %d' % (len(orfani) - 50))
json.dump(orfani, open(BK / 'bucket_orfani.json', 'w'), ensure_ascii=False, indent=1)

manca = sorted(nel_bib - set(tutti))
print('righe che puntano a un file INESISTENTE: %d' % len(manca))
json.dump(manca, open(BK / 'righe_senza_file.json', 'w'), ensure_ascii=False, indent=1)
