#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Collaudo di una zona ricompressa, dal lato dell'app. Costa 1 byte per GIF.

    python3 tools/biblioteca-nomi/verifica_480.py "Polpacci"

Fa la stessa domanda che fa l'app — `?code=EX###` al Worker — e poi controlla che
l'indirizzo restituito serva davvero i byte ricompressi con l'intestazione giusta.
E' l'unica verifica che attraversa tutta la catena:

    esercizi_catalog.gif_slug -> biblioteca_gif.slug -> storage_path -> file -> CDN

Perche' non basta guardare il bucket: il bucket dice che il file e' quello giusto,
non che il Worker ci arrivi [L8]. E perche' non basta il Worker: il Worker dice
che l'indirizzo esiste, non che dietro ci sia il file ricompresso.

------------------------------------------------------------------------------
DUE TRAPPOLE, ENTRAMBE COSTATE UN GIRO
------------------------------------------------------------------------------
1. Cloudflare risponde 403 allo User-Agent di urllib. Serve un UA da browser:
   non e' un aggiramento, e' la stessa richiesta che fa il telefono.
2. Il `cached_url` del Worker torna con gli SPAZI NON CODIFICATI. Passato cosi'
   a urllib solleva InvalidURL. Il percorso va ricodificato prima dell'uso.

------------------------------------------------------------------------------
IL COSTO
------------------------------------------------------------------------------
`Range: bytes=0-0` chiede un byte solo: l'eTag e il cache-control arrivano nelle
intestazioni, il contenuto no. Una zona intera costa qualche decina di byte di
egress, e il contatore lo stampa a fine giro anche quando e' zero [L24].
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))
import impronte as I                                    # noqa: E402

PIANI = BASE / 'lavoro' / '_480'
WORKER = 'https://zona-ai.ignazio-f.workers.dev/exercise-media?code=%s'
CACHE_ATTESA = 'public, max-age=31536000, immutable'
# Cloudflare rifiuta lo User-Agent di urllib con un 403.
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) verifica-cantiere'}


def enc(url):
    """Ricodifica il percorso: il Worker restituisce gli spazi in chiaro."""
    p = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(
        (p.scheme, p.netloc, urllib.parse.quote(p.path), p.query, p.fragment))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    args = ap.parse_args()

    piano_p = PIANI / ('%s.json' % args.zona.lower().replace(' ', '-'))
    if not piano_p.exists():
        sys.exit('manca il piano: %s' % piano_p)
    piano = json.loads(piano_p.read_text(encoding='utf-8'))
    atteso = {v['storage_path']: v for v in piano['voci']}

    righe, err = I.leggi_tutto('biblioteca_gif', 'slug,storage_path', 'slug')
    if err:
        sys.exit('biblioteca_gif: %s' % err)
    cat, err = I.leggi_tutto('esercizi_catalog', 'codice,nome,gif_slug', 'codice')
    if err:
        sys.exit('esercizi_catalog: %s' % err)

    per_slug = {r['slug']: r['storage_path'] for r in righe}
    della_zona = {r['slug'] for r in righe
                  if (r.get('storage_path') or '').startswith(args.zona + '/')}
    codici = [c for c in cat if c.get('gif_slug') in della_zona]

    print('zona "%s": %d codici la puntano\n' % (args.zona, len(codici)))
    ko = 0
    for c in sorted(codici, key=lambda x: x['codice']):
        try:
            d = json.loads(urllib.request.urlopen(
                urllib.request.Request(WORKER % urllib.parse.quote(c['codice']),
                                       headers=UA), timeout=60).read())
        except Exception as e:
            print('  %-7s ERRORE dal Worker: %s' % (c['codice'], e))
            ko += 1
            continue

        url = d.get('cached_url')
        if not url:
            print('  %-7s %-34.34s status=%s NESSUN URL'
                  % (c['codice'], c['nome'][:34], d.get('status')))
            ko += 1
            continue

        try:
            r = urllib.request.urlopen(
                urllib.request.Request(enc(url),
                                       headers=dict(UA, Range='bytes=0-0')),
                timeout=60)
            I.conta_download(len(r.read()))
        except Exception as e:
            print('  %-7s %-34.34s NON RAGGIUNGIBILE: %s'
                  % (c['codice'], c['nome'][:34], e))
            ko += 1
            continue

        v = atteso.get(per_slug.get(c['gif_slug']))
        etag = (r.headers.get('etag') or '').strip('"')
        cc = r.headers.get('cache-control')
        ok_b = bool(v) and etag == v['md5_nuovo']
        ok_c = cc == CACHE_ATTESA
        if not (ok_b and ok_c):
            ko += 1
        print('  %-7s %-34.34s byte %-3s cache %-3s'
              % (c['codice'], c['nome'][:34],
                 'ok' if ok_b else 'NO', 'ok' if ok_c else 'NO'))

    print()
    if ko == 0:
        print('ESITO: tutti e %d i codici arrivano alla GIF ricompressa, '
              'con la cache giusta.' % len(codici))
    else:
        print('ESITO: %d codici su %d NON tornano.' % (ko, len(codici)))
    I.stampa_consumo('collaudo: 1 byte a GIF, il resto sono intestazioni')
    return 1 if ko else 0


if __name__ == '__main__':
    sys.exit(main())
