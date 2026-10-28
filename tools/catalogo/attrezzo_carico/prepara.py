#!/usr/bin/env python3
"""
Il carico nell'attrezzo (28 ottobre 2026, Regia dopo il Rilascio 57; ok di Ignazio).
_exACorpoLibero tratta un esercizio come «corpo libero» se nell'attrezzo non c'è una parola di carico:
qui il carico si aggiunge alle righe che avevano scritto solo l'appoggio, nella forma «carico;appoggio»
che il catalogo usa già (manubri;panca). EX690 è solo palestra: resta il solo disco.
EX357 ed EX512 restano come sono (anche «casa»: col disco nell'attrezzo il filtro di casa li darebbe a chi
non ha la sbarra o la dip station; la Regia li sistema nel codice).
Uso: python3 prepara.py foglio.csv uscita_dir  -> foglio_da_incollare_A2.tsv + modifiche.tsv
"""
import csv, io, sys
from pathlib import Path

QUI = Path(__file__).parent
ATTREZZO = {
    'EX076': ('panca', 'manubri;panca'),
    'EX484': ('panca', 'manubri;panca'),
    'EX485': ('panca', 'manubri;panca'),
    'EX440': ('panca inclinata', 'manubri;panca inclinata'),
    'EX482': ('panca inclinata', 'manubri;panca inclinata'),
    'EX492': ('panca inclinata', 'manubri;panca inclinata'),
    'EX493': ('panca inclinata', 'manubri;panca inclinata'),
    'EX467': ('panca inclinata', 'bilanciere;panca inclinata'),
    'EX462': ('panca inclinata', 'cavo;panca inclinata'),
    'EX446': ('panca romana', 'disco;panca romana'),
    'EX447': ('panca romana', 'manubri;panca romana'),
    'EX500': ('maniglie', 'cavi;maniglie'),
    'EX690': ('corpo libero;disco', 'disco'),
}
foglio, out = sys.argv[1], Path(sys.argv[2])
rows = list(csv.reader(io.open(foglio, encoding='utf-8-sig', newline='')))
h = rows[0]
assert len(h) == 26 and h[0] == 'codice', h
i, il = h.index('attrezzo'), h.index('luogo')
assert rows[[r[0] for r in rows].index('EX690')][il] == 'palestra'
registro = []
for r in rows[1:]:
    if r[0] in ATTREZZO:
        prima, dopo = ATTREZZO[r[0]]
        assert r[i] == prima, (r[0], r[i])
        r[i] = dopo
        registro.append([r[0], 'attrezzo', prima, dopo])
assert len(registro) == len(ATTREZZO), registro
out.mkdir(parents=True, exist_ok=True)
with open(out / 'foglio_da_incollare_A2.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    for r in rows[1:]:
        w.writerow([c.replace('\t', ' ').replace('\n', ' ') for c in r])
with open(QUI / 'modifiche.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    w.writerow(['codice', 'campo', 'prima', 'dopo'])
    w.writerows(registro)
print('righe cambiate: %d' % len(registro))
