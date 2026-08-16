#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verifica di una zona dal punto di vista dell'app: si interroga il Worker, non il DB.

Il DB puo' essere coerente con se stesso e l'app vedere comunque un'altra cosa.
Qui si segue la stessa strada del client: /exercise-media?code=EX###, poi si guarda
l'oggetto all'URL restituito e se ne confronta l'impronta con quella del piano.

Tre condizioni per dire "risolve":
  1. status = cached e source = biblioteca  (non il fallback ExerciseDB)
  2. l'oggetto all'URL esiste davvero
  3. la sua impronta e' quella attesa per quel codice

------------------------------------------------------------------------------
SENZA SCARICARE (7 agosto 2026)
------------------------------------------------------------------------------
Prima ogni codice costava il download della sua GIF: ~1 MB a codice, ~660 MB per
uno sweep dei 602 codici vivi. Ora si fa una richiesta HEAD, che restituisce l'`eTag`
senza il contenuto, e l'eTag e' l'MD5 del file: da li' si risale allo SHA-256 tramite
il file gemello sul Mac. Stesso verdetto, qualche centinaio di byte invece di un mega.

La domanda a cui questo strumento risponde non cambia: "l'oggetto che l'app riceve
e' quello deciso?". Cambia solo che per rispondere non serve tirarsi giu' il mega.

Dove serve la certezza SHA-256 piena su un caso specifico:
    python3 verifica_worker.py "<zona>" --sha EX123
scarica QUEL codice e basta, e lo dice nel contatore di fine esecuzione.

SOLA LETTURA.
"""
import hashlib
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import (cache_impronte, conta_download, firma,  # noqa: E402
                      indice_locale, nfc, sha_di_firma, stampa_consumo)
from nomenclatura import slug as fslug  # noqa: E402

BASE = Path(__file__).parent
WORKER = 'https://zona-ai.ignazio-f.workers.dev/exercise-media?code=%s'
# Senza uno User-Agent da browser il Worker risponde 403: non e' un problema di dati.
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) verifica-cantiere'}


def enc(url):
    """Il Worker restituisce l'URL con gli spazi in chiaro: il browser li codifica
    da solo, urllib no. La codifica e' del client, non del dato."""
    p = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(
        (p.scheme, p.netloc, urllib.parse.quote(p.path), p.query, p.fragment))


def testa_url(url):
    """HEAD sull'URL pubblico: (etag, dimensione, errore). Non scarica il contenuto."""
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(enc(url), headers=UA, method='HEAD'), timeout=60)
        dim = r.headers.get('content-length')
        return ((r.headers.get('etag') or '').strip('"'),
                int(dim) if dim is not None else None, None)
    except urllib.error.HTTPError as e:
        return None, None, '%s %s' % (e.code, e.reason)
    except Exception as e:
        return None, None, str(e)


def scarica_url(url):
    """Download pieno di un singolo oggetto. Conta nel contatore."""
    dati = urllib.request.urlopen(
        urllib.request.Request(enc(url), headers=UA), timeout=300).read()
    conta_download(len(dati))
    return dati


def _impronte_attese(zona, piano):
    """codice -> sha256 che l'oggetto nel bucket DEVE avere.

    Il piano di migrazione porta lo `sha256` del file com'e' sul Mac. Dal 15
    agosto 2026 pero' nel bucket non ci finiscono quei byte: ci finisce il file
    RIDOTTO a 480px, che ha per forza un'impronta diversa — e' il punto della
    regola. Confrontare con lo `sha256` del piano fa fallire ogni singolo codice
    di una zona perfettamente migrata: misurato su Pettorali, 57 KO su 57, tutti
    con l'impronta del file ridotto al posto di quella dell'originale.

    L'impronta buona sta nel piano dei 480px, in `sha256_nuovo`, indicizzata per
    percorso di destinazione. Se il piano non c'e' — zona mai passata dalla
    riduzione — si torna allo `sha256` del piano di migrazione, che li' e' ancora
    quello giusto.
    """
    p = BASE / 'lavoro' / '_480' / ('%s.json' % zona.lower().replace(' ', '-'))
    if not p.exists():
        return {}, 'piano di migrazione (file non ridotti)'
    voci = json.loads(p.read_text(encoding='utf-8'))['voci']
    return ({nfc(v['storage_path']): v['sha256_nuovo'] for v in voci},
            'piano dei 480px (byte ridotti)')


def main(zona, sha_per=()):
    piano = json.loads((BASE / 'lavoro' / '_piani' / ('piano_%s.json' % fslug(zona)))
                       .read_text(encoding='utf-8'))
    ridotti, fonte = _impronte_attese(zona, piano)
    atteso = {}
    for r in piano['righe']:
        sha = ridotti.get(nfc(r['storage_path_dest']), r['sha256'])
        for c in r['codici']:
            atteso[c['codice']] = (sha, r['storage_path_dest'], r['nome_finale'])
    print('  impronte attese da: %s' % fonte)

    indice_locale()
    cache_impronte()
    print('== verifica via Worker: %d codici (HEAD, nessun download) ==' % len(atteso))

    ko, ok, ignoti = [], 0, []
    for i, cod in enumerate(sorted(atteso), 1):
        sha, path, _nome = atteso[cod]
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

        if cod in sha_per:
            # certezza piena, chiesta a voce e solo per questo codice
            try:
                vero = hashlib.sha256(scarica_url(url)).hexdigest()
            except Exception as e:
                ko.append((cod, 'download fallito: %s' % str(e)[:60]))
                continue
            provenienza = 'SHA-256 scaricato'
        else:
            etag, dim, err = testa_url(url)
            if err:
                ko.append((cod, 'oggetto non raggiungibile: %s' % err))
                continue
            vero, dove = sha_di_firma(firma(etag, dim))
            if vero is None:
                # non e' "a posto" e non e' "rotto": e' non verificabile [L10]
                ignoti.append((cod, 'impronta %s mai vista sul Mac ne in cache'
                               % firma(etag, dim)[:12]))
                continue
            provenienza = dove

        if vero != sha:
            ko.append((cod, 'impronta diversa: attesa %s, ricevuta %s (%s)'
                       % (sha[:12], vero[:12], provenienza)))
            continue
        if not url.endswith(urllib.parse.quote(path.split('/')[-1])) and \
                path.split('/')[-1] not in urllib.parse.unquote(url):
            ko.append((cod, 'percorso inatteso: %s' % url[-70:]))
            continue
        ok += 1
        if i % 50 == 0:
            print('  ... %d/%d' % (i, len(atteso)), flush=True)

    print('  risolvono pienamente : %d' % ok)
    print('  NON risolvono        : %d' % len(ko))
    print('  non verificabili     : %d' % len(ignoti))
    for c, m in ko:
        print('     KO      %s  %s' % (c, m))
    for c, m in ignoti:
        print('     IGNOTO  %s  %s  -> rilanciare con --sha %s' % (c, m, c))
    d = BASE / ('backup_migrazione_%s' % fslug(zona))
    d.mkdir(exist_ok=True)
    (d / 'verifica_worker.json').write_text(
        json.dumps({'ok': ok, 'ko': ko, 'ignoti': ignoti}, ensure_ascii=False, indent=1),
        encoding='utf-8')
    stampa_consumo('verifica di "%s"' % zona)
    return ko or ignoti


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit('uso: python3 verifica_worker.py "<zona>" [--sha EX123 [EX456 ...]]')
    codici_sha = set()
    if '--sha' in sys.argv:
        codici_sha = {a for a in sys.argv[sys.argv.index('--sha') + 1:]
                      if a.upper().startswith('EX')}
        if not codici_sha:
            sys.exit('--sha vuole almeno un codice, es: --sha EX123')
        print('  download pieno richiesto per: %s' % ', '.join(sorted(codici_sha)))
    sys.exit(1 if main(args[0], codici_sha) else 0)
