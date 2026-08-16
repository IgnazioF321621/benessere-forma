#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sblocca gli oggetti a cui la CDN serve ancora l'intestazione vecchia.

    python3 tools/biblioteca-nomi/ripara_cache.py "Gambe e Glutei" --prova
    python3 tools/biblioteca-nomi/ripara_cache.py "Gambe e Glutei"

------------------------------------------------------------------------------
IL PROBLEMA
------------------------------------------------------------------------------
Il caricamento fissa `cache-control` nel bucket, e per quasi tutti gli oggetti
finisce li'. Ma Cloudflare tiene le sue copie indicizzate per URL e le convalida
per **ETag**: se i byte non cambiano, l'ETag non cambia, e la voce vecchia resta
al suo posto con l'intestazione vecchia. Nemmeno forzando la rivalidazione si
sposta (misurato: `cf-cache-status: HIT` e l'eta' che continua a crescere).

Colpisce solo gli oggetti che soddisfano DUE condizioni insieme:
  - erano gia' sotto i 480px, quindi il cantiere li ha ricaricati identici
  - erano in cache sul bordo della CDN nel momento del caricamento

Misurato sulle prime tre zone: **2 oggetti su 219**. I 128 ricompressi non lo
hanno mai avuto — i loro byte cambiano, quindi la voce viene sostituita da se'.

------------------------------------------------------------------------------
IL RIMEDIO, E PERCHE' E' LECITO
------------------------------------------------------------------------------
`gifsicle -O3` senza ridimensionare **non tocca un solo pixel**: riscrive come i
fotogrammi sono codificati fra loro, non cosa mostrano. Verificato sui due file
di Gambe e Glutei: differenza massima su qualsiasi pixel **0**, stesso numero di
fotogrammi, stessa durata. I byte pero' cambiano, quindi cambia l'ETag e la CDN
e' costretta a sostituire la voce. Come effetto secondario calano del 6-7%.

Non e' uno strappo alla regola «solo ridimensionamento, palette intatta»: quella
riguarda i colori, e `-O3` e' gia' dentro il comando con cui ogni file ricompresso
viene prodotto. Qui si applica agli unici che ne erano rimasti fuori.

La verifica pixel per pixel e' dentro lo strumento e blocca: se anche un solo
pixel cambia, quel file non viene caricato.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageSequence, ImageChops

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))
import impronte as I                                    # noqa: E402
from carica_480 import (carica_bytes, mimetype_zona, stato_zona,  # noqa: E402
                        CACHE_NUOVA)

REPO = BASE.parent.parent
GIFSICLE = REPO / 'tools' / 'bin' / 'gifsicle'
PIANI = BASE / 'lavoro' / '_480'
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) verifica-cantiere'}


def md5_sha(path):
    m, s = hashlib.md5(), hashlib.sha256()
    with open(path, 'rb') as fh:
        for b in iter(lambda: fh.read(1 << 20), b''):
            m.update(b)
            s.update(b)
    return m.hexdigest(), s.hexdigest()


def fotogrammi(path):
    im = Image.open(path)
    out = []
    for f in ImageSequence.Iterator(im):
        out.append((f.convert('RGB').copy(), f.info.get('duration', 0)))
    return out


def identici(a, b):
    """(esito, motivo). Confronto pixel per pixel, non a campione."""
    A, B = fotogrammi(a), fotogrammi(b)
    if len(A) != len(B):
        return False, 'fotogrammi %d -> %d' % (len(A), len(B))
    if sum(d for _, d in A) != sum(d for _, d in B):
        return False, 'durata %d -> %d ms' % (sum(d for _, d in A),
                                              sum(d for _, d in B))
    for i, ((fa, _), (fb, _)) in enumerate(zip(A, B)):
        h = ImageChops.difference(fa, fb).convert('L').histogram()
        peggio = max((k for k, c in enumerate(h) if c), default=0)
        if peggio:
            return False, 'fotogramma %d differisce di %d' % (i, peggio)
    return True, 'pixel identici su %d fotogrammi' % len(A)


def cache_servita(url):
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(url, headers=dict(UA, Range='bytes=0-0')),
            timeout=60)
        I.conta_download(len(r.read()))
        return r.headers.get('cache-control'), r.headers.get('cf-cache-status')
    except Exception as e:
        return 'errore: %s' % e, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    ap.add_argument('--prova', action='store_true', help='controlla e non scrive')
    args = ap.parse_args()

    piano_p = PIANI / ('%s.json' % args.zona.lower().replace(' ', '-'))
    if not piano_p.exists():
        sys.exit('manca il piano: %s' % piano_p)
    piano = json.loads(piano_p.read_text(encoding='utf-8'))

    righe, err = I.leggi_tutto('biblioteca_gif', 'storage_path,storage_url',
                               'storage_path')
    if err:
        sys.exit('biblioteca_gif: %s' % err)
    url_di = {r['storage_path']: r['storage_url'] for r in righe}

    print('zona "%s": controllo cosa serve la CDN su %d oggetti...'
          % (args.zona, len(piano['voci'])))
    da_riparare = []
    for v in piano['voci']:
        u = url_di.get(v['storage_path'])
        if not u:
            continue
        cc, cf = cache_servita(u)
        if cc != CACHE_NUOVA:
            da_riparare.append((v, cc, cf))

    if not da_riparare:
        print('   niente da riparare: tutti servono l intestazione giusta.')
        I.stampa_consumo()
        return 0

    print('\n%d oggetti servono ancora l intestazione vecchia:' % len(da_riparare))
    for v, cc, cf in da_riparare:
        print('   %-52.52s %r (cf=%s, %s)'
              % (v['storage_path'].split('/')[-1], cc, cf, v['azione']))

    if args.prova:
        print('\nPROVA: li riottimizzerei con -O3 e li ricaricherei.')
        I.stampa_consumo()
        return 0

    print('\nriottimizzo e ricarico:')
    # Il tipo dichiarato si rilegge dall'oggetto e si rimanda uguale [L33].
    mime, err = mimetype_zona(args.zona)
    if err:
        sys.exit('lettura dei mimetype fallita: %s' % err)
    riparati = 0
    for v, _cc, _cf in da_riparare:
        src = Path(v['origine_mac'])
        tmp = Path(tempfile.mktemp(suffix='.gif'))
        r = subprocess.run([str(GIFSICLE), '-O3', str(src), '-o', str(tmp)],
                           capture_output=True)
        if r.returncode != 0 or not tmp.exists():
            print('   ERRORE gifsicle su %s' % v['storage_path'])
            continue

        ok, motivo = identici(src, tmp)
        if not ok:
            print('   SALTATO %-46.46s l immagine cambierebbe: %s'
                  % (v['storage_path'].split('/')[-1], motivo))
            tmp.unlink(missing_ok=True)
            continue

        md5_n, sha_n = md5_sha(tmp)
        if md5_n == v['md5_nuovo']:
            # Gia' ottimizzato al massimo: i byte non cambiano, quindi l'ETag
            # non cambia e la CDN non mollerebbe comunque la voce.
            print('   SALTATO %-46.46s i byte non cambiano, la CDN non si sblocca'
                  % (v['storage_path'].split('/')[-1]))
            tmp.unlink(missing_ok=True)
            continue

        dati = tmp.read_bytes()
        # Il mimetype si rilegge dall'oggetto e si rimanda uguale [L33]: qui si
        # riscrivono i byte per sbloccare la CDN, non il tipo dichiarato. Prima
        # del 16 agosto questa chiamata si affidava al vecchio default
        # `image/gif`, che su un PNG ne avrebbe riscritto il tipo.
        err = carica_bytes(v['storage_path'], dati,
                           mime.get(v['storage_path']) or 'image/gif', CACHE_NUOVA)
        if err:
            tmp.unlink(missing_ok=True)
            print('   ERRORE caricamento %s: %s' % (v['storage_path'], err))
            continue
        # _480/ deve restare specchio di cio' che sta nel bucket: se resta il
        # file vecchio, un giro successivo lo ricaricherebbe disfando la riparazione.
        f480 = Path(v['file_480'])
        if f480.parent.exists():
            f480.write_bytes(dati)
        tmp.unlink(missing_ok=True)

        prima = v['byte_nuovo']
        v['md5_nuovo'], v['sha256_nuovo'] = md5_n, sha_n
        v['byte_nuovo'] = len(dati)
        v['azione'] = 'riottimizzato'
        v['nota'] = 'riscritto con -O3 per sbloccare la cache della CDN; %s' % motivo
        riparati += 1
        print('   %-46.46s %6.0fk -> %6.0fk  %s'
              % (v['storage_path'].split('/')[-1], prima / 1024,
                 len(dati) / 1024, motivo))

    piano_p.write_text(json.dumps(piano, ensure_ascii=False, indent=1),
                       encoding='utf-8')

    print('\nverifica: %d oggetti riparati, ricontrollo nel bucket e sulla CDN'
          % riparati)
    stato, err = stato_zona(args.zona)
    if err:
        sys.exit('rilettura fallita: %s' % err)
    ko = 0
    for v, _cc, _cf in da_riparare:
        if v['azione'] != 'riottimizzato':
            continue
        etag, dim, cc_meta = stato.get(v['storage_path'], (None, None, None))
        cc_cdn, cf = cache_servita(url_di[v['storage_path']])
        ok = (etag == v['md5_nuovo'] and dim == v['byte_nuovo']
              and cc_meta == CACHE_NUOVA and cc_cdn == CACHE_NUOVA)
        if not ok:
            ko += 1
        print('   %-46.46s bucket %-3s cdn %-3s (cf=%s)'
              % (v['storage_path'].split('/')[-1],
                 'ok' if etag == v['md5_nuovo'] else 'NO',
                 'ok' if cc_cdn == CACHE_NUOVA else 'NO', cf))

    print('\npiano aggiornato: %s' % piano_p)
    if ko:
        print('ATTENZIONE: %d non tornano ancora.' % ko)
    else:
        print('Tutti a posto. Ora si puo rilanciare verifica_480.py.')
    I.stampa_consumo('1 byte a oggetto per leggere le intestazioni')
    return 1 if ko else 0


if __name__ == '__main__':
    sys.exit(main())
