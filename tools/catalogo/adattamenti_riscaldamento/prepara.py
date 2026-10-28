#!/usr/bin/env python3
"""
Adattamenti nel formato «zona: …» per le righe del riscaldamento (25 ottobre 2026, Regia; ok di Ignazio).
_trainGenAdattamentoCopre tiene una riga in conflitto solo se l'adattamento ha un tratto per ogni zona
a rischio che tocca le limitazioni. Qui si aggiunge solo il tratto che manca (EX101: cambia l'inizio).
Uso: python3 prepara.py foglio.csv uscita_dir  -> foglio_da_incollare_A2.tsv + modifiche.tsv
"""
import csv, io, sys
from pathlib import Path

QUI = Path(__file__).parent
SOSTITUISCI = {
    'EX101': ('salute della spalla: carichi leggerissimi, movimento lento e controllato',
              'spalle: carichi leggerissimi, movimento lento e controllato'),
    'EX547': ('in piedi contro il muro, carico ridotto',
              'spalle: in piedi contro il muro, carico ridotto; polsi: mani più in alto sul muro o appoggio sui pugni'),
}
AGGIUNGI = {
    'EX503': 'spalle: tira solo fin dove la spalla non dà fastidio, elastico leggero',
    'EX647': 'ginocchia: scendi meno, il ginocchio segue la punta del piede',
    'EX649': 'lombare: costole chiuse, non inarcare la schiena con le braccia in alto',
    'EX670': 'ginocchia: squat meno profondo',
    'EX693': 'spalle: riduci la discesa del petto; polsi: appoggio sui pugni',
}
foglio, out = sys.argv[1], Path(sys.argv[2])
rows = list(csv.reader(io.open(foglio, encoding='utf-8-sig', newline='')))
h = rows[0]
assert len(h) == 26 and h[0] == 'codice', h
i = h.index('adattamento')
registro = []
for r in rows[1:]:
    k, prima = r[0], r[i]
    if k in SOSTITUISCI:
        assert prima == SOSTITUISCI[k][0], (k, prima)
        r[i] = SOSTITUISCI[k][1]
    elif k in AGGIUNGI:
        r[i] = prima.rstrip('; ') + '; ' + AGGIUNGI[k]
    if r[i] != prima:
        registro.append([k, 'adattamento', prima, r[i]])
assert len(registro) == 7, registro
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
