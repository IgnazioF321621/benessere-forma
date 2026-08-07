#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Riconcilia il diario del pannello con il piano di migrazione — SOLA LETTURA.

Il difetto che chiude
---------------------
Le righe da migrare venivano da due derivazioni diverse:

  slug_da_migrare.tsv   scritto da conferma.py nell'istante della conferma, riga per
                        riga, e solo per gli stati 'collegato'/'pendente'/'indeterminato'
  piano_<zona>.json     costruito da pianifica.py per impronta, guardando tutto

Su "Addominali e Core" sei righe erano nel piano e NON nel diario: si salvarono
perche' migra.py lavora sul piano. E' una rete, non un progetto, e non regge volumi
grandi: su Mobilita' (215 file) la stessa rete non basterebbe.

La regola, da qui in avanti
---------------------------
**Il piano di `pianifica.py` e' l'unica fonte di cio' che si migra.**
Il diario del pannello resta quello che deve essere — la prova che una conferma e'
stata salvata nell'istante in cui e' stata data — ma non decide piu' cosa migrare.

Questo strumento confronta i due, entrambi indicizzati per SHA-256, e dice dove
divergono PRIMA che la migrazione parta. Se il diario ha righe che il piano non ha,
o viceversa, si vede qui invece che scoprirlo a migrazione fatta.

Uso:  python3 riconcilia.py "Spalle e Cuffia"
"""
import argparse
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import leggi_tutto, stampa_consumo  # noqa: E402
from nomenclatura import slug as fslug  # noqa: E402

BASE = Path(__file__).parent
PIANI = BASE / 'lavoro' / '_piani'
DIARIO = BASE / 'esiti' / 'slug_da_migrare.tsv'
REGISTRO = BASE / 'esiti' / 'registro_decisioni.tsv'

# Gli stati in cui la GIF e' viva (o potrebbe esserlo) e lo slug si puo' soltanto
# registrare: sono gli unici che conferma.py scrive nel diario. Stessa tupla di
# conferma.py — se cambia li', va cambiata qui.
SOLO_REGISTRATO = ('collegato', 'pendente', 'indeterminato')


def _slug_vivi():
    """Slug che oggi esistono in biblioteca_gif. Sola lettura, nessun download."""
    bib, err = leggi_tutto('biblioteca_gif', 'slug', 'slug')
    if err:
        return None, err
    return {b['slug'] for b in bib}, None


def leggi_tsv(p):
    if not Path(p).exists():
        return []
    with open(p, encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh, delimiter='\t'))


def per_impronta(righe, zona=None):
    """Indicizza per SHA-256, tenendo l'ultima riga di ogni impronta.

    Registri append-only: vale l'ultima parola, come in tutto il cantiere.
    """
    out = {}
    for r in righe:
        if not r.get('sha256'):
            continue
        if zona and r.get('zona') and r['zona'] != zona:
            continue
        out[r['sha256']] = r
    return out


def plur(n, singolare, plurale):
    return '%d %s' % (n, singolare if n == 1 else plurale)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    args = ap.parse_args()
    Z = args.zona

    pfile = PIANI / ('piano_%s.json' % fslug(Z))
    if not pfile.exists():
        sys.exit('manca il piano: %s\n  lancia prima: python3 pianifica.py "%s"' % (pfile, Z))
    piano = json.loads(pfile.read_text(encoding='utf-8'))

    tutte_piano = {r['sha256']: r for r in piano['righe']}
    diario = per_impronta(leggi_tsv(DIARIO), zona=Z)
    registro = per_impronta(leggi_tsv(REGISTRO), zona=Z)

    # Quali righe DEVONO stare nel diario.
    #
    # Non tutte quelle con lo slug che cambia: conferma.py scrive in
    # slug_da_migrare.tsv solo per gli stati 'collegato'/'pendente'/'indeterminato',
    # cioe' quelli in cui la GIF e' viva (o potrebbe esserlo) e lo slug si puo'
    # soltanto registrare. Una riga 'indicizzato' cambia slug IN PLACE e nel diario
    # non ci entra per costruzione: pretenderla li' era un falso allarme, ed e'
    # quello che questo strumento segnalava su Cardio al primo giro.
    #
    # Il registro delle decisioni porta gia' la risposta in `slug_applicabile`:
    # 'no' = solo registrato = deve stare nel diario.
    def deve_stare_nel_diario(sha):
        d = registro.get(sha)
        if not d:
            return False
        if d.get('slug_applicabile'):
            return d['slug_applicabile'].strip().lower() == 'no'
        return (d.get('stato_binario') or '') in SOLO_REGISTRATO

    # Righe gia' migrate: lo slug vecchio non esiste piu' in biblioteca_gif e il
    # nuovo si'. Il piano di una zona chiusa e' un reperto storico, non un lavoro
    # da fare: segnalarlo come anomalia sarebbe rumore.
    slug_vivi, err = _slug_vivi()
    if err:
        print('  (biblioteca_gif non leggibile: %s — non posso dire cosa e gia migrato)\n' % err)
        slug_vivi = None

    def gia_migrata(r):
        if slug_vivi is None or not r.get('slug_cambia'):
            return False
        return r.get('slug_attuale') not in slug_vivi and r.get('slug_nuovo') in slug_vivi

    da_migrare, migrate = {}, {}
    for sha, r in tutte_piano.items():
        if not r.get('slug_cambia'):
            continue
        (migrate if gia_migrata(r) else da_migrare)[sha] = r

    print('Riconciliazione "%s"' % Z)
    print('  piano             : %d righe, di cui %d con slug che cambia'
          % (len(tutte_piano), len(da_migrare) + len(migrate)))
    if migrate:
        print('                      %d gia migrate (slug vecchio morto, nuovo vivo)'
              % len(migrate))
    print('  ancora da migrare : %d' % len(da_migrare))
    print('  diario pannello   : %d righe per questa zona' % len(diario))
    print('  registro decisioni: %d righe per questa zona\n' % len(registro))

    # Si pretende nel diario solo cio' che nel diario ci deve stare, e che non
    # sia gia' stato migrato.
    attese = {s for s in da_migrare if deve_stare_nel_diario(s)}
    solo_piano = sorted(attese - set(diario))
    solo_diario = sorted(set(diario) - set(tutte_piano))
    problemi = 0

    in_place = [s for s in da_migrare if not deve_stare_nel_diario(s)]
    if in_place:
        print('  %s slug in place: nel diario non ci deve stare.' % plur(len(in_place),
              'riga cambia', 'righe cambiano') if len(in_place) == 1 else
              '  %d righe cambiano slug in place: nel diario non ci devono stare.'
              % len(in_place))
        for s in in_place[:10]:
            print('      %s' % da_migrare[s]['nome_finale'][:56])
        print('')

    if solo_piano:
        problemi += len(solo_piano)
        print('  ⚠️  NEL PIANO MA NON NEL DIARIO: %s' % plur(len(solo_piano), 'riga', 'righe'))
        print('      Sono righe da migrare che il diario del pannello non ha registrato.')
        print('      È esattamente il caso delle sei righe di "Addominali e Core".')
        print('      Vale il PIANO: vanno migrate.\n')
        for s in solo_piano:
            r = da_migrare[s]
            print('      %-7s %-40s %s -> %s'
                  % (','.join(c['codice'] for c in r['codici']) or '-',
                     r['nome_finale'][:40], r['slug_attuale'], r['slug_nuovo']))
        print('')

    if solo_diario:
        problemi += len(solo_diario)
        print('  ⚠️  NEL DIARIO MA NON NEL PIANO: %s' % plur(len(solo_diario), 'riga', 'righe'))
        print('      Il file non è più in questa cartella, o è stato tolto dal cantiere.')
        print('      Da guardare prima di migrare: il piano non le tocchera.\n')
        for s in solo_diario:
            r = diario[s]
            print('      %-7s %-40s %s -> %s'
                  % (r.get('codice') or '-', (r.get('nome_catalogo') or '')[:40],
                     r.get('slug_vecchio'), r.get('slug_nuovo')))
        print('')

    # Ogni riga del piano deve avere una decisione presa guardando la GIF:
    # e' la regola che non si negozia.
    senza_decisione = sorted(s for s in tutte_piano if s not in registro)
    if senza_decisione:
        problemi += len(senza_decisione)
        print('  ⚠️  RIGHE DEL PIANO SENZA DECISIONE REGISTRATA: %d' % len(senza_decisione))
        print('      Nessun esercizio si rinomina senza che Ignazio ne abbia visto la GIF.\n')
        for s in senza_decisione[:20]:
            print('      %s  (%s)' % (tutte_piano[s]['file_mac'][:52], s[:10]))
        print('')

    # gli slug proposti dai due lati devono coincidere
    discordi = []
    for s, r in da_migrare.items():
        d = diario.get(s)
        if d and d.get('slug_nuovo') and d['slug_nuovo'] != r['slug_nuovo']:
            discordi.append((s, r, d))
    if discordi:
        problemi += len(discordi)
        print('  ⚠️  SLUG DIVERSO FRA PIANO E DIARIO: %s' % plur(len(discordi), 'riga', 'righe'))
        for s, r, d in discordi:
            print('      %-40s piano "%s"  diario "%s"'
                  % (r['nome_finale'][:40], r['slug_nuovo'], d['slug_nuovo']))
        print('')

    print('─' * 68)
    if problemi:
        print('ESITO: %s da guardare prima di migrare.' % plur(problemi, 'cosa', 'cose'))
        print('       Ricorda: comanda il piano, non il diario.')
        stampa_consumo()
        return 1
    print('ESITO: le due liste coincidono. Il piano copre tutto il diario')
    print('       e ogni riga ha la sua decisione registrata.')
    stampa_consumo()
    return 0


if __name__ == '__main__':
    sys.exit(main())
