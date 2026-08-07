#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Impronte del bucket — l'aggancio file→riga si fa per SHA-256, mai per nome.

Perche' esiste questo modulo: nel bucket i nomi sono gia' stati normalizzati da
cantieri precedenti, mentre sul Mac sono ancora quelli originali. Lo stesso identico
contenuto ha quindi due nomi diversi sui due lati. Confrontare i nomi classifica come
"libera" una GIF viva nell'app: su "Bicipiti e Braccia" succedeva a 58 file su 75.

SOLA LETTURA su Storage e database: elenca, scarica per calcolare l'impronta, legge.
La chiave di servizio arriva da worker/.dev.vars e non viene mai stampata ne' scritta.
"""
import hashlib
import json
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = Path(__file__).parent
REPO = BASE.parent.parent
U = 'https://qxiyeiahpoiliwpqslpr.supabase.co'
BUCKET = 'biblioteca-gif'

_K = None


def nfc(s):
    return unicodedata.normalize('NFC', s or '')


def chiave():
    """Service role key da worker/.dev.vars. None se non c'e': il chiamante decide.

    Lettura pigra: prepara.py deve poter partire anche senza, per dire con chiarezza
    che senza accesso al bucket l'aggancio non e' determinabile.
    """
    global _K
    if _K is None:
        p = REPO / 'worker' / '.dev.vars'
        if not p.exists():
            return None
        for riga in p.read_text(encoding='utf-8').splitlines():
            riga = riga.strip()
            if riga.startswith('SUPABASE_SERVICE_ROLE_KEY'):
                v = riga.split('=', 1)[1].strip().strip('"').strip("'")
                if v:
                    _K = v
    return _K


def _testa(k, json_body=False):
    h = {'apikey': k, 'Authorization': 'Bearer ' + k}
    if json_body:
        h['Content-Type'] = 'application/json'
    return h


def api(metodo, percorso, corpo=None):
    """Restituisce (dato, errore). L'errore va SEMPRE controllato dal chiamante."""
    k = chiave()
    if not k:
        return None, 'manca SUPABASE_SERVICE_ROLE_KEY in worker/.dev.vars'
    dati = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(U + percorso, data=dati,
                                 headers=_testa(k, corpo is not None), method=metodo)
    try:
        r = urllib.request.urlopen(req, timeout=120)
        raw = r.read()
        return (json.loads(raw) if raw else None), None
    except urllib.error.HTTPError as e:
        return None, '%s %s: %s' % (e.code, e.reason, e.read().decode()[:200])
    except Exception as e:
        return None, str(e)


def leggi_tutto(tabella, select, ordine):
    """PostgREST tronca al limite default: si pagina sempre."""
    out, off = [], 0
    while True:
        d, err = api('GET', '/rest/v1/%s?select=%s&order=%s&offset=%d&limit=1000'
                     % (tabella, select, ordine, off))
        if err:
            return None, err
        out += d
        if len(d) < 1000:
            return out, None
        off += 1000


def elenco_bucket(prefisso):
    out, off = [], 0
    while True:
        d, err = api('POST', '/storage/v1/object/list/' + BUCKET,
                     {'prefix': prefisso, 'limit': 1000, 'offset': off,
                      'sortBy': {'column': 'name', 'order': 'asc'}})
        if err:
            return None, err
        out += d
        if len(d) < 1000:
            return out, None
        off += 1000


def sha_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for b in iter(lambda: fh.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def _scarica_sha(storage_path):
    k = chiave()
    url = '%s/storage/v1/object/%s/%s' % (U, BUCKET, urllib.parse.quote(storage_path))
    req = urllib.request.Request(url, headers=_testa(k))
    return hashlib.sha256(urllib.request.urlopen(req, timeout=300).read()).hexdigest()


def impronte_zona(zona, cache_path, verbose=True):
    """Impronta SHA-256 di ogni oggetto del bucket nella cartella della zona.

    Restituisce (sha -> [storage_path], falliti, errore_globale).
    `falliti` non e' un dettaglio: un oggetto di cui non conosciamo l'impronta rende
    INDETERMINATO lo stato dei file che non hanno trovato riscontro altrove, perche'
    potrebbero essere proprio quello. Mai dedurne "libero".

    La cache e' indicizzata per (storage_path, eTag, size): se l'oggetto cambia,
    l'impronta si ricalcola.
    """
    oggetti, err = elenco_bucket(zona + '/')
    if err:
        return {}, [], err
    oggetti = [o for o in oggetti if o.get('id') is not None]

    cache = {}
    if cache_path and Path(cache_path).exists():
        try:
            cache = json.load(open(cache_path))
        except Exception:
            cache = {}

    per_sha, falliti, nuovi = {}, [], 0
    for i, o in enumerate(oggetti, 1):
        sp = nfc('%s/%s' % (zona, o['name']))
        meta = o.get('metadata') or {}
        firma = '%s|%s' % (meta.get('eTag'), meta.get('size'))
        voce = cache.get(sp)
        if voce and voce.get('firma') == firma and voce.get('sha256'):
            sha = voce['sha256']
        else:
            try:
                sha = _scarica_sha(sp)
            except Exception as e:
                falliti.append({'storage_path': sp, 'errore': str(e)[:120]})
                continue
            cache[sp] = {'firma': firma, 'sha256': sha}
            nuovi += 1
            if verbose and nuovi % 20 == 0:
                print('    impronte calcolate: %d' % nuovi, flush=True)
        per_sha.setdefault(sha, []).append(sp)

    if cache_path:
        Path(cache_path).parent.mkdir(parents=True, exist_ok=True)
        json.dump(cache, open(cache_path, 'w'), ensure_ascii=False, indent=1)

    if verbose:
        print('  bucket "%s": %d oggetti, %d impronte nuove, %d non calcolabili'
              % (zona, len(oggetti), nuovi, len(falliti)))
    return per_sha, falliti, None


if __name__ == '__main__':
    z = sys.argv[1]
    per_sha, falliti, err = impronte_zona(z, BASE / 'lavoro' / '_impronte' / (z + '.json'))
    print('errore:', err)
    print('impronte distinte:', len(per_sha), ' falliti:', len(falliti))
