#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Allinea i nomi dei file di Polpacci sul Mac a `biblioteca_gif.nome_italiano`.

    python3 tools/biblioteca-nomi/rinomina_polpacci.py            # prova, non scrive
    python3 tools/biblioteca-nomi/rinomina_polpacci.py --applica  # rinomina, con annullamento

Strada A: `biblioteca_gif` e il Sheet sono gia' puliti e concordi su tutte e 19
le righe della zona; e' il Mac che si adegua. Conseguenza voluta: il nome a
catalogo non cambia mai, quindi `esercizi_catalog`, `training_logs`,
`workout_sets`, il Sheet e gli oggetti nel bucket non si toccano, e le 78
occorrenze di storico di EX028, EX065 ed EX066 restano dove sono.

------------------------------------------------------------------------------
L'APPAIAMENTO E' PER IMPRONTA, E QUI NON E' UN VEZZO
------------------------------------------------------------------------------
I nomi stanno cambiando proprio adesso: una chiave sul nome decade a meta'
esecuzione. Il file si lega alla sua riga per SHA-256, tramite il piano di
`prepara.py` (`lavoro/polpacci.json`), che e' indicizzato sull'impronta e non
sul percorso. Rinominare non tocca i byte, quindi quel piano resta valido
attraverso questa rinomina e attraverso quella di fase 1 che l'ha preceduto.

Il piano dei 480 NON si usa come ponte: le sue voci `origine_mac` sono percorsi,
e una di quelle e' gia' invecchiata con la rinomina di EX563 [L34]. Serve solo
come riscontro incrociato, e se i due ponti non dicono la stessa cosa ci si ferma.

------------------------------------------------------------------------------
IL PIANO SI CONGELA
------------------------------------------------------------------------------
Senza argomenti costruisce, stampa e — se il piano non c'e' ancora — lo scrive.
Se c'e' gia', NON lo sovrascrive: quella e' una ricostruzione da confrontare.
`--applica` legge il piano confermato e non ricostruisce niente [L40].
"""
import argparse
import json
import sys
import unicodedata
from pathlib import Path

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))
import impronte as I                                    # noqa: E402

ZONA = 'Polpacci'
# Fuori dal lotto: il suo nome non e' ancora deciso. E' l'unica riga della zona
# senza codice a catalogo, Mac e biblioteca_gif divergono nell'ordine delle
# parole, e `nome_italiano` porta ancora "in piedi" — che con la decisione presa
# sui calf raise non si scrive piu'. Adeguare il Mac a quel nome scriverebbe sul
# disco una cosa che stiamo togliendo dappertutto: passa dal pannello, e la
# stessa scelta chiude anche il lavoro 3 della zona.
FUORI_LOTTO = {'calf-raise-elastico-maniglie-in-piedi': 'va al pannello: nome non ancora deciso'}
BIB = Path('/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi') / ZONA
PIANO = BASE / 'lavoro' / '_rinomina_polpacci.json'
BACKUP = BASE / 'backup'


def nfc(s):
    return unicodedata.normalize('NFC', s or '')


def costruisci():
    prep = json.loads((BASE / 'lavoro' / ('%s.json' % ZONA.lower())).read_text(encoding='utf-8'))
    per_sha = {r['sha256']: r for r in prep['righe']}

    bg, e = I.leggi_tutto('biblioteca_gif', 'slug,nome_italiano,storage_path', 'slug')
    if e:
        raise SystemExit('lettura biblioteca_gif fallita: %s' % e)
    per_sp = {nfc(r['storage_path']): r for r in bg if r.get('storage_path')}

    # riscontro incrociato: il piano dei 480 lega gli stessi due estremi per un'altra strada
    p480 = json.loads((BASE / 'lavoro' / '_480' / ('%s.json' % ZONA.lower())).read_text(encoding='utf-8'))
    sp_di_mac = {nfc(Path(v['origine_mac']).name): nfc(v['storage_path']) for v in p480['voci']}

    voci, allarmi = [], []
    for f in sorted(p for p in BIB.iterdir() if p.is_file() and not p.name.startswith('.')):
        sha = I.sha_file(f)
        r = per_sha.get(sha)
        if r is None:
            allarmi.append('FERMARSI — %s: impronta %s non e nel piano per impronta'
                           % (f.name, sha[:12]))
            continue
        sps = [nfc(x) for x in r['storage_paths']]
        if len(sps) != 1:
            allarmi.append('FERMARSI — %s: %d storage_path per una riga' % (f.name, len(sps)))
            continue
        riga = per_sp.get(sps[0])
        if riga is None:
            allarmi.append('FERMARSI — %s: nessuna riga biblioteca_gif per %s' % (f.name, sps[0]))
            continue
        # il secondo ponte deve dire lo stesso, quando conosce ancora il nome
        altro = sp_di_mac.get(nfc(f.name))
        if altro is not None and altro != sps[0]:
            allarmi.append('FERMARSI — %s: i due ponti non concordano (%s contro %s)'
                           % (f.name, sps[0], altro))
            continue
        nuovo = riga['nome_italiano'] + f.suffix
        fuori = FUORI_LOTTO.get(riga['slug'])
        voci.append(dict(sha256_mac=sha, da=f.name, a=nuovo, slug=riga['slug'],
                         storage_path=riga['storage_path'],
                         codici=[c['codice'] for c in r['codici']],
                         fuori_lotto=fuori,
                         cambia=(not fuori) and nfc(f.name) != nfc(nuovo)))

    # una rinomina non deve poter far collidere due nomi, nemmeno di passaggio
    finali = {}
    for v in voci:
        finali.setdefault(nfc(v['a']), []).append(v['da'])
    for nome, da in finali.items():
        if len(da) > 1:
            allarmi.append('FERMARSI — collisione su "%s": ci arriverebbero %s' % (nome, da))
    fermi = {nfc(v['da']) for v in voci if not v['cambia']}   # inclusi i fuori lotto
    for v in voci:
        if v['cambia'] and nfc(v['a']) in fermi:
            allarmi.append('FERMARSI — "%s" e gia il nome di un file che non si tocca' % v['a'])
    return voci, allarmi


def stampa(voci, allarmi):
    da_fare = [v for v in voci if v['cambia']]
    print('\n=== LE RINOMINE, RIGA PER RIGA ===')
    print('%-8s %-62.62s %s' % ('codice', 'prima', 'dopo'))
    for v in sorted(da_fare, key=lambda x: x['da']):
        print('%-8s %-62.62s %s' % (','.join(v['codici']) or '—', v['da'], v['a']))
    fermi = [v for v in voci if not v['cambia']]
    print('\n=== FILE CHE NON SI TOCCANO ===')
    for v in fermi:
        print('  %-8s %-58.58s %s' % (','.join(v['codici']) or '—', v['da'],
                                      v.get('fuori_lotto') or 'gia a posto'))
    print('\n=== DA GUARDARE ===')
    for a in allarmi:
        print('  ⚠ %s' % a)
    if not allarmi:
        print('  niente: nessuna collisione, i due ponti concordano su tutti i file.')
    print('\nfile nella cartella: %d · da rinominare: %d · gia a posto: %d'
          % (len(voci), len(da_fare), len(fermi)))


def applica(voci):
    da_fare = [v for v in voci if v['cambia']]
    marca = I.time.strftime('%Y%m%dT%H%M%S')
    BACKUP.mkdir(parents=True, exist_ok=True)
    f = BACKUP / ('rinomina_polpacci_annulla_%s.json' % marca)
    f.write_text(json.dumps([{'da': v['a'], 'a': v['da'], 'sha256_mac': v['sha256_mac']}
                             for v in da_fare], ensure_ascii=False, indent=1), encoding='utf-8')
    print('\n=== BACKUP ===\n  annullamento delle %d rinomine -> %s' % (len(da_fare), f.name))

    print('\n=== RINOMINE ===')
    tutto = True
    for v in sorted(da_fare, key=lambda x: x['da']):
        src, dst = BIB / v['da'], BIB / v['a']
        if not src.exists():
            print('  NON FATTO %-58.58s il file di partenza non c e' % v['da'])
            tutto = False
            continue
        if dst.exists():
            print('  NON FATTO %-58.58s esiste gia "%s"' % (v['da'], v['a']))
            tutto = False
            continue
        src.rename(dst)
        # i byte non devono essersi mossi: e' una rinomina, non una riscrittura
        ok = dst.exists() and I.sha_file(dst) == v['sha256_mac']
        tutto = tutto and ok
        print('  %-9s %-58.58s -> %s' % ('fatto' if ok else 'IMPRONTA CAMBIATA', v['da'], v['a']))
    return tutto


def verifica():
    print('\n=== VERIFICA ===')
    n = len([p for p in BIB.iterdir() if p.is_file() and not p.name.startswith('.')])
    print('  file nella cartella: %d' % n)
    I._INDICE = None
    _per_sha, falliti, err = I.impronte_zona(ZONA, verbose=True)
    if err:
        print('  errore: %s' % err)
        return False
    print('  ignoti: %d' % len(falliti))
    return n == 19 and not falliti


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--applica', action='store_true')
    args = ap.parse_args()

    if args.applica:
        if not PIANO.exists():
            raise SystemExit('manca il piano confermato: %s' % PIANO)
        d = json.loads(PIANO.read_text(encoding='utf-8'))
        voci, allarmi = d['voci'], d['allarmi']
        print('piano confermato del %s' % d['generato'])
    else:
        voci, allarmi = costruisci()
        stampa(voci, allarmi)
        if PIANO.exists():
            print('\n⚠ %s esiste gia: NON lo sovrascrivo — ricostruzione da confrontare.'
                  % PIANO.name)
        else:
            PIANO.write_text(json.dumps(
                {'zona': ZONA, 'generato': I.time.strftime('%Y-%m-%dT%H:%M:%S'),
                 'strada': 'A — prevalgono biblioteca_gif e Sheet, il Mac si adegua',
                 'voci': voci, 'allarmi': allarmi}, ensure_ascii=False, indent=1),
                encoding='utf-8')
            print('\npiano: %s' % PIANO)

    if allarmi:
        raise SystemExit('\nAllarmi bloccanti: non si rinomina niente.')
    if not args.applica:
        print('\nProva soltanto: non e stato rinominato niente.')
    elif applica(voci) and verifica():
        print('\nFatto.')
    else:
        raise SystemExit('\nQualcosa non e andato: guarda le righe qui sopra.')
    I.stampa_consumo('rinomina Polpacci')


if __name__ == '__main__':
    main()
