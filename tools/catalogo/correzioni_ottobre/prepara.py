#!/usr/bin/env python3
"""
Correzioni di testi del 20 ottobre 2026 (Catalogo 090 e 110, Training 360).
Legge il foglio esportato (CSV), applica SOLO le modifiche approvate da Ignazio
guardando la GIF e scrive: il foglio intero da incollare in A2 e il registro
codice/campo/prima/dopo. Nome e riga di EX117 vengono da esiti/correzioni_ottobre.tsv
(pagina locale), non da qui. Non scrive su DB o foglio.
Uso: python3 prepara.py foglio.csv esiti.tsv uscita_dir
"""
import csv, io, sys
from pathlib import Path

foglio, esiti, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
rows = list(csv.reader(io.open(foglio, encoding='utf-8-sig', newline='')))
h = rows[0]
assert len(h) == 25 and h[0] == 'codice', h
nome117 = {r['campo']: r['valore'] for r in csv.DictReader(open(esiti, encoding='utf-8'), delimiter='\t')
           if r['codice'] == 'EX117'}

RIPETIZIONE = 'Una ripetizione = un cambio completo: sale la destra, poi la sinistra'
NS_PRIMA = 'Elastico sotto i piedi con petto in appoggio sulla panca inclinata: riproduce il rematore chest supported senza carico lombare'
NS_DOPO = 'Elastico ancorato in basso davanti alla panca, petto in appoggio sulla panca inclinata: lo stesso rematore senza carico sulla schiena'
ES_PRIMA = 'elastico ancorato basso o sotto i piedi'
ES_DOPO = 'elastico ancorato in basso davanti alla panca'

FISSE = {
    'EX120': {
        'setup': 'In piedi, piedi alla larghezza delle anche, mani unite davanti al petto',
        'esecuzione': "Fai un passo avanti e scendi in affondo, ginocchio dietro vicino al pavimento;"
                      "Ruota il busto verso la gamba davanti, mani sempre davanti al petto;"
                      "Torna al centro e risali in piedi;Ripeti con l'altra gamba",
        'errori': "Ginocchio davanti che cade verso l'interno;Girare solo le braccia e non il busto;"
                  "Busto che si piega in avanti"},
    'EX117': {
        'nome': nome117['nome'], 'spiegazione': nome117['spiegazione'],
        'setup': 'In affondo basso, gamba dietro distesa, mani a terra ai lati del piede davanti',
        'esecuzione': "Porta il bacino indietro e in alto distendendo la gamba davanti;"
                      "Mani sempre a terra: senti l'allungamento dietro la coscia;"
                      "Torna in affondo basso;Finite le ripetizioni, cambia gamba",
        'errori': 'Movimento a scatti;Schiena curva;Forzare la gamba tesa oltre il fastidio',
        'muscoli': 'anca;ischiocrurali;flessori',
        'zone_rischio': 'ginocchia',
        'adattamento': "ginocchia: affondo meno profondo se dà fastidio; ischiocrurali: gamba davanti un po' piegata"},
    'EX191': {
        'esecuzione': "Mantieni la posizione a V: le gambe tese si incrociano, una sopra e una sotto, poi si scambiano;"
                      "Addome sempre in tensione;"
                      "Una ripetizione = un cambio completo: sopra la destra, poi sopra la sinistra"},
}

registro, conto = [], {'rematori': 0}
for r in rows[1:]:
    d = dict(zip(h, r))
    k, nuovo = d['codice'], {}
    nuovo.update(FISSE.get(k, {}))
    if k == 'EX136':
        es = d['esecuzione'].replace('sforbiciata continua incrociandosi',
                                     "sforbiciata continua: una gamba sale mentre l'altra scende, poi si scambiano")
        assert es != d['esecuzione']
        nuovo['esecuzione'] = es + ';' + RIPETIZIONE
    if k == 'EX149':
        nuovo['esecuzione'] = d['esecuzione'] + ';' + RIPETIZIONE
    if k == 'EX604':
        nuovo['esecuzione'] = d['esecuzione'] + ';Una ripetizione = un cambio completo: destra avanti, poi sinistra avanti'
    if d['nota_surrogato'] == NS_PRIMA:
        assert ES_PRIMA in d['esecuzione_surrogato'], k
        nuovo['nota_surrogato'] = NS_DOPO
        nuovo['esecuzione_surrogato'] = d['esecuzione_surrogato'].replace(ES_PRIMA, ES_DOPO)
        conto['rematori'] += 1
    for campo, v in nuovo.items():
        if d[campo] != v:
            registro.append([k, campo, d[campo], v])
            r[h.index(campo)] = v
assert conto['rematori'] == 8, conto
out.mkdir(parents=True, exist_ok=True)
with open(out / 'foglio_da_incollare_A2.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    for r in rows[1:]:
        w.writerow([c.replace('\t', ' ').replace('\n', ' ') for c in r])
with open(out / 'modifiche.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    w.writerow(['codice', 'campo', 'prima', 'dopo'])
    w.writerows(registro)
print(len(rows) - 1, 'righe ·', len(registro), 'campi cambiati ·', len({x[0] for x in registro}), 'codici')
