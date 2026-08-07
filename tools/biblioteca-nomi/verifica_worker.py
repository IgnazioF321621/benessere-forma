#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verifica di una zona dal punto di vista dell'app: si interroga il Worker, non il DB.

Il DB puo' essere coerente con se stesso e l'app vedere comunque un'altra cosa.
Qui si segue la stessa strada del client: /exercise-media?code=EX###, poi si scarica
l'URL restituito e se ne confronta lo SHA-256 con quello del piano.

Tre condizioni per dire "risolve":
  1. status = cached e source = biblioteca  (non il fallback ExerciseDB)
  2. l'oggetto all'URL esiste davvero
  3. la sua impronta e' quella attesa per quel codice

SOLA LETTURA.
"""
import hashlib
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from nomenclatura import slug as fslug  # noqa: E402

BASE = Path(__file__).parent
WORKER = 'https://zona-ai.ignazio-f.workers.dev/exercise-media?code=%s'
# Senza uno User-Agent da browser il Worker risponde 403: non e' un problema di dati.
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) verifica-cantiere'}


def main(zona):
    piano = json.loads((BASE / 'lavoro' / '_piani' / ('piano_%s.json' % fslug(zona)))
                       .read_text(encoding='utf-8'))
    atteso = {}
    for r in piano['righe']:
        for c in r['codici']:
            atteso[c['codice']] = (r['sha256'], r['storage_path_dest'], r['nome_finale'])

    print('== verifica via Worker: %d codici ==' % len(atteso))
    ko, ok = [], 0
    for i, cod in enumerate(sorted(atteso), 1):
        sha, path, nome = atteso[cod]
        try:
            req = urllib.request.Request(WORKER % cod, headers=UA)
            d = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            ko.append((cod, 'worker non risponde: %s' % str(e)[:60]))
            continue
        if d.get('source') != 'biblioteca':
            ko.append((cod, 'source=%s (fallback), status=%s'
                       % (d.get('source'), d.get('status'))))
            continue
        url = d.get('cached_url')
        if not url:
            ko.append((cod, 'nessun cached_url'))
            continue
        try:
            # Il Worker restituisce l'URL con gli spazi in chiaro: il browser li
            # codifica da solo, urllib no. La codifica e' del client, non del dato.
            pz = urllib.parse.urlsplit(url)
            url_ok = urllib.parse.urlunsplit(
                (pz.scheme, pz.netloc, urllib.parse.quote(pz.path), pz.query, pz.fragment))
            dati = urllib.request.urlopen(
                urllib.request.Request(url_ok, headers=UA), timeout=180).read()
        except Exception as e:
            ko.append((cod, 'oggetto non scaricabile: %s' % str(e)[:60]))
            continue
        vero = hashlib.sha256(dati).hexdigest()
        if vero != sha:
            ko.append((cod, 'impronta diversa: attesa %s, ricevuta %s'
                       % (sha[:12], vero[:12])))
            continue
        if not url.endswith(urllib.parse.quote(path.split('/')[-1])) and \
                path.split('/')[-1] not in urllib.parse.unquote(url):
            ko.append((cod, 'percorso inatteso: %s' % url[-70:]))
            continue
        ok += 1
        if i % 20 == 0:
            print('  ... %d/%d' % (i, len(atteso)), flush=True)

    print('  risolvono pienamente : %d' % ok)
    print('  NON risolvono        : %d' % len(ko))
    for c, m in ko:
        print('     %s  %s' % (c, m))
    (BASE / ('backup_migrazione_%s' % fslug(zona)) / 'verifica_worker.json').write_text(
        json.dumps({'ok': ok, 'ko': ko}, ensure_ascii=False, indent=1), encoding='utf-8')
    return ko


if __name__ == '__main__':
    sys.exit(1 if main(sys.argv[1]) else 0)
