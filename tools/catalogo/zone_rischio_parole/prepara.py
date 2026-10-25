#!/usr/bin/env python3
"""
Parole di zone_rischio uguali ai tasti delle limitazioni (25 ottobre 2026, Regia; ok di Ignazio).
Il generatore confronta le parole tal quali: «lombari» non incontra il tasto «lombare».
Cambia solo la forma della parola (singolare/plurale), mai il significato; toglie un
doppione nella stessa cella se la sostituzione lo crea. Non scrive su DB o foglio.
Uso: python3 prepara.py foglio.csv uscita_dir   -> foglio_da_incollare_A2.tsv + modifiche.tsv
"""
import csv, io, sys
from pathlib import Path

QUI = Path(__file__).parent
PAROLE = {'lombari': 'lombare', 'anca': 'anche', 'polso': 'polsi', 'gomito': 'gomiti',
          'spalla': 'spalle', 'caviglia': 'caviglie'}

foglio, out = sys.argv[1], Path(sys.argv[2])
rows = list(csv.reader(io.open(foglio, encoding='utf-8-sig', newline='')))
h = rows[0]
assert len(h) == 26 and h[0] == 'codice' and h[-1] == 'zona', h
i = h.index('zone_rischio')
registro = []
for r in rows[1:]:
    prima = r[i]
    nuove = []
    for t in (x.strip() for x in prima.split(';')):
        if t and PAROLE.get(t, t) not in nuove:
            nuove.append(PAROLE.get(t, t))
    dopo = ';'.join(nuove)
    if dopo != prima:
        registro.append([r[0], 'zone_rischio', prima, dopo])
        r[i] = dopo
out.mkdir(parents=True, exist_ok=True)
with open(out / 'foglio_da_incollare_A2.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    for r in rows[1:]:
        w.writerow([c.replace('\t', ' ').replace('\n', ' ') for c in r])
with open(QUI / 'modifiche.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    w.writerow(['codice', 'campo', 'prima', 'dopo'])
    w.writerows(registro)
print('righe cambiate: %d su %d' % (len(registro), len(rows) - 1))
