#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Impronte del bucket — l'aggancio file->riga si fa per SHA-256, mai per nome.

Perche' esiste questo modulo: nel bucket i nomi sono gia' stati normalizzati da
cantieri precedenti, mentre sul Mac sono ancora quelli originali. Lo stesso identico
contenuto ha quindi due nomi diversi sui due lati. Confrontare i nomi classifica come
"libera" una GIF viva nell'app: su "Bicipiti e Braccia" succedeva a 58 file su 75.

------------------------------------------------------------------------------
A CONSUMO ZERO (7 agosto 2026)
------------------------------------------------------------------------------
Fino al 7 agosto questo modulo scaricava OGNI oggetto della zona per calcolarne
l'impronta: ~1 MB a file, ~700 MB per un giro completo del bucket. Era la voce piu'
grossa dell'egress che ha portato il piano Free al 171%.

Non serve. Supabase espone l'`eTag` di ogni oggetto gia' nell'elenco, e l'eTag
E' L'MD5 DEL CONTENUTO: misurato il 7 agosto su tutti e 647 gli oggetti del bucket,
640 combaciavano con l'MD5 di un file sul Mac, dimensione compresa. Quindi:

    elenco del bucket (pochi kB)  ->  eTag = MD5  ->  file locale con quell'MD5
                                                   ->  il suo SHA-256, gia' calcolato

Il download resta possibile ma non e' piu' la strada normale: si apre solo con
`consenti_download=True`, e ogni byte che esce finisce nel contatore.

Copertura misurata il 7 agosto: 647 oggetti su 647 risolti senza scaricare nulla
(644 da file locale, 3 dalla cache storica).

------------------------------------------------------------------------------
DUE CACHE, ENTRAMBE INDICIZZATE PER IMPRONTA
------------------------------------------------------------------------------
  lavoro/_impronte/_locale.json       percorso -> mtime, bytes, md5, sha256
  lavoro/_impronte/_per_impronta.json "md5|bytes" -> sha256

La seconda e' la cache del bucket, e la chiave e' il CONTENUTO, non il percorso.
Prima era il percorso: il cantiere rinomina i file, e ogni rinomina faceva ripartire
il download da zero. Misurato: 797 voci in cache per 647 oggetti reali, cioe' 150
file scaricati due volte per il solo fatto di essere stati rinominati.

SOLA LETTURA su Storage e database: elenca, legge, all'occorrenza scarica.
La chiave di servizio arriva da worker/.dev.vars e non viene mai stampata ne' scritta.
"""
import hashlib
import json
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = Path(__file__).parent
REPO = BASE.parent.parent
U = 'https://qxiyeiahpoiliwpqslpr.supabase.co'
BUCKET = 'biblioteca-gif'

LAVORO = BASE / 'lavoro'
DIR_IMPRONTE = LAVORO / '_impronte'
CACHE_LOCALE = DIR_IMPRONTE / '_locale.json'
CACHE_IMPRONTE = DIR_IMPRONTE / '_per_impronta.json'

# Radici da cui si legge il contenuto senza toccare la rete. La prima e' la
# biblioteca sul Mac; la seconda le copie di oggetti che sul Mac non esistono,
# scaricate una volta sola nei cantieri passati.
RADICI_LOCALI = [
    Path('/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi'),
    LAVORO / '_bucket',
]

_K = None

# ------------------------------------------------------------------ contatore
# Ogni byte che esce dal bucket passa da qui. Serve a poter dire un numero invece
# di una stima: fino al 7 agosto nessuno strumento sapeva quanto aveva scaricato,
# ed e' il motivo per cui la ricognizione dei consumi ha dovuto scrivere "stima"
# su una voce da 3 GB.
_CONSUMO = {'oggetti': 0, 'byte': 0}


def conta_download(n_byte):
    _CONSUMO['oggetti'] += 1
    _CONSUMO['byte'] += n_byte
    return n_byte


def byte_scaricati():
    return _CONSUMO['oggetti'], _CONSUMO['byte']


def stampa_consumo(etichetta=''):
    """Da chiamare in fondo a OGNI strumento che puo' scaricare. Anche a zero."""
    n, b = byte_scaricati()
    if b == 0:
        print('\n  Scaricato dal bucket: 0 byte (nessun oggetto)%s'
              % (' — ' + etichetta if etichetta else ''))
    else:
        print('\n  Scaricato dal bucket: %d oggetti, %.1f MB%s'
              % (n, b / 1048576.0, ' — ' + etichetta if etichetta else ''))
    return n, b


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


def _md5_sha_file(path):
    """Le due impronte in una passata sola: il file si legge una volta."""
    m, s = hashlib.md5(), hashlib.sha256()
    with open(path, 'rb') as fh:
        for b in iter(lambda: fh.read(1 << 20), b''):
            m.update(b)
            s.update(b)
    return m.hexdigest(), s.hexdigest()


# ------------------------------------------------------------------ impronte
def firma(etag, dimensione):
    """Chiave unica di un contenuto: MD5 + dimensione, entrambi dati dal server.

    L'MD5 da solo non basterebbe come garanzia: e' rotto contro chi costruisce
    apposta due file diversi con la stessa impronta. Qui i file sono i nostri e
    la dimensione fa da secondo riscontro. Dove serve la certezza SHA-256 piena
    esiste `scarica_oggetto`, che pero' va chiesta a voce.
    """
    e = (etag or '').strip().strip('"').lower()
    return '%s|%s' % (e, dimensione)


def _carica_json(p, default):
    if not p.exists():
        return default
    try:
        return json.load(open(p, encoding='utf-8'))
    except Exception:
        return default


def _salva_json(p, dati):
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + '.tmp')
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump(dati, fh, ensure_ascii=False, indent=1)
        fh.flush()
        import os
        os.fsync(fh.fileno())
    tmp.replace(p)


_INDICE = None


def indice_locale(verbose=True, radici=None):
    """firma(md5, bytes) -> {'sha256', 'percorso'} per ogni file sotto le radici locali.

    Il costo vero e' leggere ~1 GB di GIF: si fa una volta e si tiene in
    lavoro/_impronte/_locale.json, rinfrescando solo i file cambiati (mtime+dimensione).

    I percorsi si registrano in forma NFC: macOS li consegna decomposti (NFD) e due
    stringhe che l'occhio legge uguali non collidono in un dizionario -> [L15].
    """
    global _INDICE
    if _INDICE is not None and radici is None:
        return _INDICE

    cache = _carica_json(CACHE_LOCALE, {})
    nuova, ricalcolati, riusati = {}, 0, 0
    t0 = time.time()
    for radice in (radici if radici is not None else RADICI_LOCALI):
        radice = Path(radice)
        if not radice.exists():
            continue
        for p in sorted(radice.rglob('*')):
            if not p.is_file() or p.name.startswith('.'):
                continue
            chiave_p = nfc(str(p))
            st = p.stat()
            voce = cache.get(chiave_p)
            if voce and voce.get('mtime') == int(st.st_mtime) \
                    and voce.get('bytes') == st.st_size and voce.get('md5'):
                nuova[chiave_p] = voce
                riusati += 1
                continue
            md5, sha = _md5_sha_file(p)
            nuova[chiave_p] = {'mtime': int(st.st_mtime), 'bytes': st.st_size,
                               'md5': md5, 'sha256': sha}
            ricalcolati += 1

    if nuova != cache:
        _salva_json(CACHE_LOCALE, nuova)

    per_firma = {}
    for percorso, v in nuova.items():
        per_firma.setdefault(firma(v['md5'], v['bytes']),
                             {'sha256': v['sha256'], 'percorso': percorso})

    if verbose:
        print('  indice locale: %d file (%d riletti, %d dalla cache) in %.1fs'
              % (len(nuova), ricalcolati, riusati, time.time() - t0))
    if radici is None:
        _INDICE = per_firma
    return per_firma


_CACHE_BUCKET = None


def cache_impronte():
    """firma -> sha256 degli oggetti gia' incontrati. Chiave sul contenuto.

    Al primo avvio assorbe le vecchie cache per zona (chiave sul percorso): le loro
    impronte sono buone, era la chiave a essere sbagliata. Nessun download.
    """
    global _CACHE_BUCKET
    if _CACHE_BUCKET is not None:
        return _CACHE_BUCKET

    c = _carica_json(CACHE_IMPRONTE, {})
    assorbite = 0
    for vecchia in sorted(DIR_IMPRONTE.glob('*.json')):
        if vecchia.name.startswith('_'):
            continue
        for _percorso, v in _carica_json(vecchia, {}).items():
            f = v.get('firma') or ''
            if not v.get('sha256') or '|' not in f:
                continue
            etag, _sep, dim = f.rpartition('|')
            k = firma(etag, dim)
            if k not in c:
                c[k] = v['sha256']
                assorbite += 1
    if assorbite:
        _salva_json(CACHE_IMPRONTE, c)
        print('  cache impronte: assorbite %d voci dalle vecchie cache per percorso'
              % assorbite)
    _CACHE_BUCKET = c
    return c


def scarica_oggetto(storage_path):
    """Scarica un oggetto per intero. Ogni chiamata finisce nel contatore.

    Da usare solo quando la firma non basta e serve lo SHA-256 vero del byte
    che sta nel bucket. Mai a tappeto.
    """
    k = chiave()
    if not k:
        raise RuntimeError('manca SUPABASE_SERVICE_ROLE_KEY in worker/.dev.vars')
    url = '%s/storage/v1/object/%s/%s' % (U, BUCKET, urllib.parse.quote(storage_path))
    req = urllib.request.Request(url, headers=_testa(k))
    dati = urllib.request.urlopen(req, timeout=300).read()
    conta_download(len(dati))
    return dati


def testa_oggetto(storage_path):
    """HEAD su un oggetto: (etag, dimensione, errore). NON scarica il contenuto.

    Costa qualche centinaio di byte di intestazioni invece di ~1 MB di GIF. E'
    la strada normale per rispondere a "il byte che sta li' e' quello deciso?".
    """
    k = chiave()
    if not k:
        return None, None, 'manca SUPABASE_SERVICE_ROLE_KEY in worker/.dev.vars'
    url = '%s/storage/v1/object/%s/%s' % (U, BUCKET, urllib.parse.quote(storage_path))
    req = urllib.request.Request(url, headers=_testa(k), method='HEAD')
    try:
        r = urllib.request.urlopen(req, timeout=60)
        etag = (r.headers.get('etag') or '').strip('"')
        dim = r.headers.get('content-length')
        return etag, (int(dim) if dim is not None else None), None
    except urllib.error.HTTPError as e:
        return None, None, '%s %s' % (e.code, e.reason)
    except Exception as e:
        return None, None, str(e)


def sha_di_firma(f, consenti_download=False, storage_path=None):
    """SHA-256 di un contenuto data la sua firma. (sha, provenienza) o (None, motivo).

    Ordine: file locale -> cache -> download (solo se aperto esplicitamente).
    """
    voce = indice_locale(verbose=False).get(f)
    if voce:
        return voce['sha256'], 'mac'
    c = cache_impronte()
    if f in c:
        return c[f], 'cache'
    if not consenti_download:
        return None, 'ignota'
    if not storage_path:
        return None, 'ignota'
    sha = hashlib.sha256(scarica_oggetto(storage_path)).hexdigest()
    c[f] = sha
    _salva_json(CACHE_IMPRONTE, c)
    return sha, 'scaricato'


def verifica_oggetto(storage_path, sha_atteso, consenti_download=False):
    """L'oggetto nel bucket ha lo SHA-256 atteso? (esito, dettaglio).

    esito: 'ok' | 'diverso' | 'assente' | 'ignoto' | 'errore'
    Con HEAD e basta: 0 byte di contenuto. 'ignoto' non e' 'ok' — un oggetto di cui
    non conosciamo l'impronta non diventa mai "a posto" per silenzio [L10].
    """
    etag, dim, err = testa_oggetto(storage_path)
    if err:
        return ('assente', err) if err.startswith('404') else ('errore', err)
    f = firma(etag, dim)
    sha, dove = sha_di_firma(f, consenti_download, storage_path)
    if sha is None:
        return 'ignoto', 'impronta %s mai vista: nessun file locale, niente in cache' % f[:12]
    if sha != sha_atteso:
        return 'diverso', 'attesa %s, trovata %s (%s)' % (sha_atteso[:12], sha[:12], dove)
    return 'ok', '%s via %s' % (sha[:12], dove)


def impronte_zona(zona, cache_path=None, verbose=True, consenti_download=False):
    """Impronta SHA-256 di ogni oggetto del bucket nella cartella della zona.

    Restituisce (sha -> [storage_path], falliti, errore_globale).

    `falliti` non e' un dettaglio: un oggetto di cui non conosciamo l'impronta rende
    INDETERMINATO lo stato dei file che non hanno trovato riscontro altrove, perche'
    potrebbero essere proprio quello. Mai dedurne "libero" [L10]. Con i download
    chiusi, un oggetto senza riscontro locale finisce qui — non viene inventato.

    `cache_path` resta accettato per non rompere i chiamanti: la cache vera e' ora
    unica e indicizzata per impronta, non per zona e non per percorso.
    """
    oggetti, err = elenco_bucket(zona + '/')
    if err:
        return {}, [], err
    oggetti = [o for o in oggetti if o.get('id') is not None]

    indice_locale(verbose=verbose)
    cache_impronte()

    per_sha, falliti = {}, []
    conta = {'mac': 0, 'cache': 0, 'scaricato': 0}
    for o in oggetti:
        sp = nfc('%s/%s' % (zona, o['name']))
        meta = o.get('metadata') or {}
        f = firma(meta.get('eTag'), meta.get('size'))
        try:
            sha, dove = sha_di_firma(f, consenti_download, sp)
        except Exception as e:
            falliti.append({'storage_path': sp, 'errore': str(e)[:120]})
            continue
        if sha is None:
            falliti.append({'storage_path': sp,
                            'errore': 'impronta ignota (%s): serve --scarica' % f[:12]})
            continue
        conta[dove] = conta.get(dove, 0) + 1
        per_sha.setdefault(sha, []).append(sp)

    if verbose:
        print('  bucket "%s": %d oggetti — %d dal Mac, %d dalla cache, %d scaricati,'
              ' %d non determinabili'
              % (zona, len(oggetti), conta['mac'], conta['cache'], conta['scaricato'],
                 len(falliti)))
    return per_sha, falliti, None


if __name__ == '__main__':
    argomenti = [a for a in sys.argv[1:] if not a.startswith('--')]
    scarica = '--scarica' in sys.argv
    if not argomenti:
        sys.exit('uso: python3 impronte.py "<zona>" [--scarica]')
    z = argomenti[0]
    per_sha, falliti, err = impronte_zona(z, consenti_download=scarica)
    print('errore:', err)
    print('impronte distinte:', len(per_sha), ' non determinabili:', len(falliti))
    for f in falliti:
        print('   %s — %s' % (f['storage_path'], f['errore']))
    stampa_consumo()
