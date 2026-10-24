#!/usr/bin/env python3
"""
Training 480 (24 ottobre 2026): la zona del corpo di ogni esercizio di riscaldamento.
Fonti: le conferme di Ignazio nella pagina locale (esiti/zone_480.tsv, l'ultima per
codice vince) e, per le righe che non ha confermato, la proposta (proposta_480.tsv):
Ignazio ha detto «vedi tu, sistemiamo coi feedback». Regola sua con i pulsanti:
nel riscaldamento specifico solo corpo libero ed elastico, quindi i 4 esercizi al cavo
restano senza zona anche dove nella pagina ne aveva data una.

Senza argomenti scrive zone_480.tsv (codice, zona, entra_nel_riscaldamento: il file
per ZT-Training) e decisioni_480.tsv (da dove viene ogni valore).
Con un foglio esportato (CSV) e una cartella scrive anche il foglio intero da
incollare in A1, con la colonna nuova `zona` in fondo, e il registro delle modifiche.
Non scrive su DB o foglio.
Uso: python3 prepara.py [foglio.csv uscita_dir]
"""
import csv, io, sys
from pathlib import Path

QUI = Path(__file__).parent
ESITI = QUI.parent.parent / 'biblioteca-nomi' / 'esiti' / 'zone_480.tsv'
ZONE = {'spalle', 'scapole', 'colonna toracica', 'polsi', 'anche', 'caviglie', 'ginocchia'}
CAVI = {'EX058', 'EX101', 'EX416', 'EX500'}

def tsv(p):
    return list(csv.DictReader(io.open(p, encoding='utf-8-sig', newline=''), delimiter='\t'))

proposta = {r['codice']: r for r in tsv(QUI / 'proposta_480.tsv')}
assert len(proposta) == 88, len(proposta)
ignazio = {}
for r in tsv(ESITI):
    ignazio[r['codice']] = r

finale = {}
for c, p in sorted(proposta.items()):
    if c in ignazio:
        zona, sp, fonte = ignazio[c]['zona'], ignazio[c]['spiegazione'], 'Ignazio'
    else:
        zona, sp, fonte = p['zona_proposta'], p['spiegazione_proposta'], 'proposta'
    if c in CAVI and zona:
        zona, fonte = '', fonte + ', poi regola dei cavi'
    z = zona.split(';') if zona else []
    assert len(z) <= 2 and set(z) <= ZONE and len(set(z)) == len(z), (c, zona)
    entra = 'si' if (p['gruppo'] == 'candidate' and z) else ''
    finale[c] = {'nome': p['nome'], 'zona': zona, 'spiegazione': sp, 'entra': entra, 'fonte': fonte}

with open(QUI / 'zone_480.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    w.writerow(['codice', 'zona', 'entra_nel_riscaldamento'])
    for c, v in finale.items():
        w.writerow([c, v['zona'], v['entra']])
with open(QUI / 'decisioni_480.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    w.writerow(['codice', 'nome', 'zona', 'spiegazione_nuova', 'entra_nel_riscaldamento', 'fonte'])
    for c, v in finale.items():
        w.writerow([c, v['nome'], v['zona'], v['spiegazione'], v['entra'], v['fonte']])

conto = {}
for v in finale.values():
    for z in (v['zona'].split(';') if v['zona'] else []):
        conto[z] = conto.get(z, 0) + 1
print('zone_480.tsv: %d righe, %d con zona, %d entrano nel riscaldamento · %s · da Ignazio %d'
      % (len(finale), sum(1 for v in finale.values() if v['zona']),
         sum(1 for v in finale.values() if v['entra']), conto,
         sum(1 for v in finale.values() if v['fonte'].startswith('Ignazio'))))

if len(sys.argv) < 3:
    sys.exit(0)

foglio, out = sys.argv[1], Path(sys.argv[2])
rows = list(csv.reader(io.open(foglio, encoding='utf-8-sig', newline='')))
h = rows[0]
assert len(h) == 25 and h[0] == 'codice' and 'zona' not in h, h
h.append('zona')
registro, visti = [], set()
for r in rows[1:]:
    assert len(r) == 25, r[:1]
    d = dict(zip(h, r))
    k = d['codice']
    v = finale.get(k)
    r.append(v['zona'] if v else '')
    if not v:
        continue
    visti.add(k)
    if v['zona']:
        registro.append([k, 'zona', '', v['zona']])
    if v['spiegazione'] and not d['spiegazione']:
        r[h.index('spiegazione')] = v['spiegazione']
        registro.append([k, 'spiegazione', '', v['spiegazione']])
    if v['entra']:
        assert 'riscaldamento' not in d['uso'].split(';'), k
        nuovo = d['uso'] + ';riscaldamento'
        r[h.index('uso')] = nuovo
        registro.append([k, 'uso', d['uso'], nuovo])
assert visti == set(finale), sorted(set(finale) - visti)
out.mkdir(parents=True, exist_ok=True)
with open(out / 'foglio_da_incollare_A1.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    for r in rows:
        w.writerow([c.replace('\t', ' ').replace('\n', ' ') for c in r])
with open(QUI / 'modifiche.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t', lineterminator='\n')
    w.writerow(['codice', 'campo', 'prima', 'dopo'])
    w.writerows(registro)
print('foglio: %d righe + intestazione, 26 colonne · modifiche: %d campi su %d codici'
      % (len(rows) - 1, len(registro), len({x[0] for x in registro})))
