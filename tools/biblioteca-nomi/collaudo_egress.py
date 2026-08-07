#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Collaudo del cantiere "strumenti a consumo zero" (7 agosto 2026).

Risponde a una domanda sola, e la risponde con i dati che ci sono gia' sul disco:

    l'impronta ricavata dall'eTag senza scaricare e' la stessa che si otteneva
    scaricando il file?

Il metro di paragone sono le vecchie cache per zona (lavoro/_impronte/<zona>.json):
quelle impronte furono calcolate scaricando ogni oggetto per intero, quindi sono
la verita' misurata sul byte. Se le due coincidono su tutti gli oggetti, la strada
nuova non ha perso nulla.

Il confronto vale solo dove l'impronta nuova arriva DAL MAC: se arrivasse dalla
cache assorbita, si confronterebbe un numero con se stesso. Il conteggio delle due
provenienze e' stampato apposta.

Verifica anche il secondo pezzo del cantiere: che `verifica_oggetto` (HEAD+eTag)
dia lo stesso verdetto del confronto SHA-256 pieno, su un campione.

SOLA LETTURA. Non scarica nulla: senza `--campione-sha` non esce un byte dal bucket.

Uso:  python3 collaudo_egress.py ["<zona>"] [--campione-sha N]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import (BASE, cache_impronte, elenco_bucket, firma,  # noqa: E402
                      indice_locale, nfc, scarica_oggetto, stampa_consumo,
                      testa_oggetto, verifica_oggetto)
import hashlib  # noqa: E402

ZONE = ['Addominali e Core', 'Bicipiti e Braccia', 'Cardio e Conditioning',
        'Gambe e Glutei', 'Pettorali', 'Polpacci', 'Schiena e Trapezio',
        'Spalle e Cuffia', 'Tricipiti']
DIR_IMPRONTE = BASE / 'lavoro' / '_impronte'


def vecchia_cache():
    """percorso -> sha256, dalle cache per zona costruite scaricando i file."""
    out = {}
    for p in sorted(DIR_IMPRONTE.glob('*.json')):
        if p.name.startswith('_'):
            continue
        try:
            d = json.load(open(p, encoding='utf-8'))
        except Exception:
            continue
        for percorso, v in d.items():
            if v.get('sha256'):
                out[nfc(percorso)] = v['sha256']
    return out


def main():
    zone = [a for a in sys.argv[1:] if not a.startswith('--')] or ZONE
    n_sha = 0
    if '--campione-sha' in sys.argv:
        i = sys.argv.index('--campione-sha')
        n_sha = int(sys.argv[i + 1]) if len(sys.argv) > i + 1 else 1

    print('== COLLAUDO strumenti a consumo zero ==\n')
    loc = indice_locale()
    cache = cache_impronte()
    storiche = vecchia_cache()
    print('  impronte storiche disponibili come metro: %d percorsi\n' % len(storiche))

    tot = uguali = diverse = senza_metro = ignote = 0
    da_mac = da_cache = 0
    problemi = []

    for z in zone:
        oggetti, err = elenco_bucket(z + '/')
        if err:
            print('  %-24s ERRORE elenco: %s' % (z, err))
            continue
        oggetti = [o for o in oggetti if o.get('id') is not None]
        zu = zd = zm = 0
        for o in oggetti:
            sp = nfc('%s/%s' % (z, o['name']))
            meta = o.get('metadata') or {}
            f = firma(meta.get('eTag'), meta.get('size'))
            tot += 1
            voce = loc.get(f)
            if voce:
                sha, dove = voce['sha256'], 'mac'
                da_mac += 1
            elif f in cache:
                sha, dove = cache[f], 'cache'
                da_cache += 1
            else:
                ignote += 1
                problemi.append((sp, 'impronta ignota: ne file locale ne cache'))
                continue
            atteso = storiche.get(sp)
            if atteso is None:
                senza_metro += 1
                zm += 1
                continue
            if atteso == sha:
                uguali += 1
                zu += 1
                if dove == 'cache':
                    pass  # confronto circolare: contato ma non probante
            else:
                diverse += 1
                zd += 1
                problemi.append((sp, 'DIVERSA: storica %s, nuova %s (%s)'
                                 % (atteso[:12], sha[:12], dove)))
        print('  %-24s %3d oggetti — %3d coincidono, %d divergono, %d senza metro'
              % (z, len(oggetti), zu, zd, zm))

    print('\n  --- impronte ---')
    print('  oggetti esaminati        : %d' % tot)
    print('  risolti dal Mac          : %d  (confronto indipendente)' % da_mac)
    print('  risolti dalla cache      : %d  (confronto circolare, non probante)' % da_cache)
    print('  coincidono con lo storico: %d' % uguali)
    print('  DIVERGONO                : %d' % diverse)
    print('  senza impronta storica   : %d  (oggetti mai scaricati prima)' % senza_metro)
    print('  impronta ignota          : %d' % ignote)

    # --- secondo pezzo: HEAD+eTag da' lo stesso verdetto del download? ---
    print('\n  --- verdetto di verifica_oggetto (HEAD, 0 byte) ---')
    campione = []
    for z in zone[:1]:
        oggetti, err = elenco_bucket(z + '/')
        if not err:
            campione = [nfc('%s/%s' % (z, o['name']))
                        for o in oggetti if o.get('id') is not None][:5]
    for sp in campione:
        atteso = storiche.get(sp)
        if not atteso:
            continue
        esito, det = verifica_oggetto(sp, atteso)
        print('    %-58s %-8s %s' % (sp.split('/')[-1][:56], esito, det))
        if esito != 'ok':
            problemi.append((sp, 'verifica_oggetto: %s — %s' % (esito, det)))
    # controprova: un'impronta sbagliata deve essere respinta
    if campione and storiche.get(campione[0]):
        esito, det = verifica_oggetto(campione[0], '0' * 64)
        print('    controprova impronta falsa%s-> %s (%s)' % (' ' * 33, esito, det[:40]))
        if esito != 'diverso':
            problemi.append((campione[0], 'controprova: atteso "diverso", ottenuto %s' % esito))

    # --- opzionale: SHA-256 pieno su N oggetti, con conferma ---
    if n_sha:
        print('\n  --- controprova SHA-256 piena su %d oggetti (SCARICA) ---' % n_sha)
        for sp in campione[:n_sha]:
            vero = hashlib.sha256(scarica_oggetto(sp)).hexdigest()
            atteso = storiche.get(sp)
            ok = 'OK' if vero == atteso else 'DIVERSA'
            print('    %-58s %s' % (sp.split('/')[-1][:56], ok))
            if vero != atteso:
                problemi.append((sp, 'SHA pieno diverso dallo storico'))

    print('\n  --- esito ---')
    if problemi:
        print('  %d PROBLEMI:' % len(problemi))
        for sp, m in problemi[:30]:
            print('     %s — %s' % (sp, m))
    else:
        print('  Nessun problema: la strada senza download da\' gli stessi numeri.')
    stampa_consumo('collaudo')
    return 1 if problemi else 0


if __name__ == '__main__':
    sys.exit(main())
