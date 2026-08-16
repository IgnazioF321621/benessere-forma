#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Collaudo di una zona ricompressa e sgombero di _480/. Costa 1 byte per GIF.

    python3 tools/biblioteca-nomi/verifica_480.py "Polpacci"
    python3 tools/biblioteca-nomi/verifica_480.py "Polpacci" --tieni   # non sgombera

Due verifiche, e la seconda non basta da sola:

  1. TUTTI gli oggetti del piano, letti dall'elenco del bucket: impronta,
     dimensione e cache-control. Gratis, una richiesta per la zona.
  2. I CODICI che puntano alla zona, chiesti al Worker come fa l'app, e poi
     l'indirizzo restituito interrogato per un byte solo.

La seconda da sola lascerebbe scoperti gli oggetti che nessun codice punta —
i "liberi" del cantiere 16, che nel bucket ci sono comunque. La prima da sola
direbbe che il file e' giusto, non che il Worker ci arrivi [L8]. Insieme
coprono tutta la catena:

    esercizi_catalog.gif_slug -> biblioteca_gif.slug -> storage_path -> file -> CDN

------------------------------------------------------------------------------
_480/ E' UNA CARTELLA DI TRANSITO, NON UN ARCHIVIO
------------------------------------------------------------------------------
A zona verificata i ricompressi si cancellano: gli originali restano sul Mac e
`ricomprimi.py` li rigenera identici byte per byte (verificato su Polpacci, 4 su 4).
Tenerne due copie con il disco al 98% non ha motivo.

Prima di cancellare pero' si registra l'impronta di ogni file nella cache per
contenuto. Serve: nel bucket ora ci sono byte ricompressi, e nessun file sul Mac
ha piu' quell'impronta — senza registrarla, ogni strumento vedrebbe quegli
oggetti come "impronta ignota", che per [L10] blocca come "diverso". Con la
registrazione continuano a risolvere, dalla cache invece che dal Mac.

Il legame fra i byte nuovi e l'esercizio resta scritto nel piano della zona
(`lavoro/_480/<zona>.json`): storage_path, file di origine sul Mac, impronta
prima e impronta dopo. Il piano NON si cancella.
"""
import argparse
import json
import shutil
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


def stato_zona(zona):
    """storage_path -> (etag, byte, cacheControl). Dall'elenco: una richiesta.

    E' l'unico posto in cui il cache-control si legge davvero: la HEAD
    autenticata risponde sempre `no-cache` [L29].
    """
    ogg, err = I.elenco_bucket(zona + '/')
    if err:
        return None, err
    out = {}
    for o in ogg:
        if o.get('id') is None:
            continue
        m = o.get('metadata') or {}
        out[I.nfc('%s/%s' % (zona, o['name']))] = (
            (m.get('eTag') or '').strip('"'), m.get('size'), m.get('cacheControl'))
    return out, None


def registra_impronte(voci):
    """Insegna alla cache per contenuto le impronte dei file ricompressi.

    Da fare PRIMA di cancellare _480/, o gli oggetti del bucket restano senza
    riscontro possibile. La chiave e' il contenuto (md5|byte), mai il percorso:
    il cantiere rinomina, e una chiave sul percorso decade alla prima rinomina [L24].
    """
    c = I.cache_impronte()
    nuove = 0
    for v in voci:
        k = I.firma(v['md5_nuovo'], v['byte_nuovo'])
        if c.get(k) != v['sha256_nuovo']:
            c[k] = v['sha256_nuovo']
            nuove += 1
    if nuove:
        I._salva_json(I.CACHE_IMPRONTE, c)
    return nuove


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    ap.add_argument('--tieni', action='store_true',
                    help='non cancellare i ricompressi in _480/ a fine collaudo')
    args = ap.parse_args()

    piano_p = PIANI / ('%s.json' % args.zona.lower().replace(' ', '-'))
    if not piano_p.exists():
        sys.exit('manca il piano: %s' % piano_p)
    piano = json.loads(piano_p.read_text(encoding='utf-8'))
    voci = piano['voci']
    atteso = {v['storage_path']: v for v in voci}

    # Eccezioni dichiarate: casi in cui si e' deciso a voce che uno scostamento
    # resta. Non sono un lasciapassare — ognuna dice QUALE scostamento tollera e
    # PERCHE', e tutto il resto di quell'oggetto viene controllato come gli altri.
    # Senza questo, una zona con una decisione presa resterebbe bloccata per sempre.
    ecc = {e['storage_path']: e for e in piano.get('eccezioni', [])}
    if ecc:
        print('%d eccezioni dichiarate nel piano:' % len(ecc))
        for sp, e in ecc.items():
            print('   %s — tollera %s = %r (decisa il %s)'
                  % (sp.split('/')[-1], e['tollera'], e['valore_atteso'],
                     e.get('decisa', '?')))
        print()

    # ------------------------------------------------ 1. tutti gli oggetti
    print('zona "%s": %d oggetti nel piano\n' % (args.zona, len(voci)))
    print('1. stato nel bucket (impronta, dimensione, cache-control)...')
    stato, err = stato_zona(args.zona)
    if err:
        sys.exit('elenco del bucket fallito: %s' % err)
    ko_bucket = []
    for v in voci:
        s = stato.get(v['storage_path'])
        etag, dim, cc = s if s else (None, None, None)
        e = ecc.get(v['storage_path'])
        cc_ok = cc == CACHE_ATTESA or (e and e['tollera'] == 'cache_control')
        if etag == v['md5_nuovo'] and dim == v['byte_nuovo'] and cc_ok:
            continue
        ko_bucket.append((v['storage_path'],
                          'impronta %s dim %s cache %r'
                          % ('ok' if etag == v['md5_nuovo'] else 'NO',
                             'ok' if dim == v['byte_nuovo'] else 'NO', cc)))
    if ko_bucket:
        for sp, d in ko_bucket:
            print('   NO  %-52.52s %s' % (sp.split('/')[-1], d))
    print('   %d su %d a posto' % (len(voci) - len(ko_bucket), len(voci)))

    # ------------------------------------------------------- 2. via Worker
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

    print('\n2. i %d codici che puntano alla zona, chiesti al Worker come fa l app:'
          % len(codici))
    ko_worker = 0
    for c in sorted(codici, key=lambda x: x['codice']):
        try:
            d = json.loads(urllib.request.urlopen(
                urllib.request.Request(WORKER % urllib.parse.quote(c['codice']),
                                       headers=UA), timeout=60).read())
        except Exception as e:
            print('   %-7s ERRORE dal Worker: %s' % (c['codice'], e))
            ko_worker += 1
            continue
        url = d.get('cached_url')
        if not url:
            print('   %-7s %-34.34s status=%s NESSUN URL'
                  % (c['codice'], c['nome'][:34], d.get('status')))
            ko_worker += 1
            continue
        try:
            r = urllib.request.urlopen(
                urllib.request.Request(enc(url), headers=dict(UA, Range='bytes=0-0')),
                timeout=60)
            I.conta_download(len(r.read()))
        except Exception as e:
            print('   %-7s %-34.34s NON RAGGIUNGIBILE: %s'
                  % (c['codice'], c['nome'][:34], e))
            ko_worker += 1
            continue
        sp_v = per_slug.get(c['gif_slug'])
        v = atteso.get(sp_v)
        e = ecc.get(sp_v)
        etag = (r.headers.get('etag') or '').strip('"')
        cc = r.headers.get('cache-control')
        ok_b = bool(v) and etag == v['md5_nuovo']
        ok_c = cc == CACHE_ATTESA
        if ok_b and not ok_c and e and e['tollera'] == 'cache_control' \
                and cc == e['valore_atteso']:
            # Lo scostamento e' esattamente quello dichiarato: non blocca, ma si dice.
            print('   %-7s %-34.34s byte ok  cache %r — eccezione dichiarata'
                  % (c['codice'], c['nome'][:34], cc))
            continue
        if not (ok_b and ok_c):
            ko_worker += 1
            print('   %-7s %-34.34s byte %-3s cache %-3s'
                  % (c['codice'], c['nome'][:34],
                     'ok' if ok_b else 'NO', 'ok' if ok_c else 'NO'))
    print('   %d su %d a posto' % (len(codici) - ko_worker, len(codici)))

    # ------------------------------------------------------------ 3. esito
    tutto_ok = not ko_bucket and not ko_worker
    print()
    if not tutto_ok:
        print('ESITO: %d oggetti e %d codici NON tornano. _480/ resta dov e.'
              % (len(ko_bucket), ko_worker))
        I.stampa_consumo('collaudo: 1 byte a GIF, il resto sono intestazioni')
        return 1

    print('ESITO: tutti e %d gli oggetti e tutti e %d i codici a posto.'
          % (len(voci), len(codici)))

    # --------------------------------------------------------- 4. sgombero
    cartella = Path(piano['voci'][0]['file_480']).parent if voci else None
    if args.tieni:
        print('\n--tieni: %s resta dov e.' % cartella)
    elif cartella and cartella.exists():
        nuove = registra_impronte(voci)
        print('\nsgombero di _480/:')
        print('   %d impronte registrate nella cache per contenuto' % nuove)
        # Controprova: senza i file, gli oggetti devono comunque risolvere.
        I._INDICE = None
        _per_sha, falliti, e = I.impronte_zona(args.zona, verbose=False)
        peso = sum(p.stat().st_size for p in cartella.rglob('*') if p.is_file())
        shutil.rmtree(cartella)
        I._INDICE = None
        _per_sha, falliti2, e2 = I.impronte_zona(args.zona, verbose=False)
        if falliti2:
            print('   ATTENZIONE: dopo la cancellazione %d oggetti non hanno piu'
                  ' impronta determinabile:' % len(falliti2))
            for f in falliti2[:5]:
                print('     %s' % f['storage_path'])
        else:
            print('   %d oggetti risolvono ancora, dalla cache' % len(voci))
        print('   liberati %.1f MB sul Mac (%s)' % (peso / 1048576, cartella))
        print('   il piano resta: %s' % piano_p)
    else:
        print('\n_480/ gia sgombera.')

    I.stampa_consumo('collaudo: 1 byte a GIF, il resto sono intestazioni')
    return 0


if __name__ == '__main__':
    sys.exit(main())
