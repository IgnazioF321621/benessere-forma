#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migrazione Addominali e Core — bucket, biblioteca_gif, TSV per il Sheet.

La chiave di servizio viene letta da worker/.dev.vars e non viene MAI stampata,
ne' scritta nei backup, nei log o negli esiti.

Ordine a righe doppie, per non avere nessun istante in cui una GIF non si trova:
  fase 1  backup + controllo inverso        (nessuna scrittura remota)
  fase 2  prova a vuoto                     (nessuna scrittura remota)
  fase 3  Storage: rinomina file            slug invariato -> app intatta
          biblioteca_gif: storage_path, nome_italiano, categoria
  fase 4  biblioteca_gif: INSERISCE le righe con lo slug nuovo
  fase 5  verifica di tutti i codici
  fase 6  TSV per il Google Sheet
  fase 7  cancella le righe con lo slug vecchio  (solo dopo il sync del Sheet)

Uso:  python3 migra.py <fase>
"""
import csv
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = Path(__file__).parent
REPO = BASE.parent.parent
SC = Path('/private/tmp/claude-501/-Users-ignaziofiorito-benessere-forma/'
          '0066c50d-22f2-42e1-8c2b-110eba2f1b09/scratchpad')
BK = BASE / 'backup_migrazione'
U = 'https://qxiyeiahpoiliwpqslpr.supabase.co'
BUCKET = 'biblioteca-gif'


def chiave():
    """Legge la service role key dal .dev.vars del Worker. Non la restituisce mai a video."""
    p = REPO / 'worker' / '.dev.vars'
    if not p.exists():
        sys.exit('manca %s' % p)
    for riga in p.read_text(encoding='utf-8').splitlines():
        riga = riga.strip()
        if riga.startswith('SUPABASE_SERVICE_ROLE_KEY'):
            v = riga.split('=', 1)[1].strip().strip('"').strip("'")
            if v:
                return v
    sys.exit('SUPABASE_SERVICE_ROLE_KEY non trovata in .dev.vars')


K = chiave()
H = {'apikey': K, 'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}


def api(metodo, percorso, corpo=None, extra=None):
    """Chiamata REST. Restituisce (dato, errore): l'errore va SEMPRE controllato."""
    h = dict(H)
    if extra:
        h.update(extra)
    dati = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(U + percorso, data=dati, headers=h, method=metodo)
    try:
        r = urllib.request.urlopen(req, timeout=90)
        raw = r.read()
        return (json.loads(raw) if raw else None), None
    except urllib.error.HTTPError as e:
        return None, '%s %s: %s' % (e.code, e.reason, e.read().decode()[:300])
    except Exception as e:
        return None, str(e)


def leggi_tutto(tabella, select='*', ordine='id'):
    """PostgREST tronca a 1.000 righe: si pagina sempre."""
    out, off = [], 0
    while True:
        d, err = api('GET', '/rest/v1/%s?select=%s&order=%s&offset=%d&limit=1000'
                     % (tabella, select, ordine, off))
        if err:
            sys.exit('lettura %s fallita: %s' % (tabella, err))
        out += d
        if len(d) < 1000:
            return out
        off += 1000


def elenco_bucket(prefisso=''):
    """Elenca gli oggetti del bucket, paginando."""
    out, off = [], 0
    while True:
        d, err = api('POST', '/storage/v1/object/list/' + BUCKET,
                     {'prefix': prefisso, 'limit': 1000, 'offset': off,
                      'sortBy': {'column': 'name', 'order': 'asc'}})
        if err:
            sys.exit('elenco bucket fallito: %s' % err)
        out += d
        if len(d) < 1000:
            return out
        off += 1000


def nfc(s):
    return unicodedata.normalize('NFC', s or '')


def pulisci(v):
    """TSV senza quoting: tab, a capo e virgolette non possono passare.

    Sui backup e' una resa leggibile e basta — la copia autorevole e' il JSON.
    Sul TSV del Sheet il controllo e' a monte: si verifica che nessun campo
    contenga questi caratteri prima di consegnarlo.
    """
    s = '' if v is None else str(v)
    return (s.replace('\t', ' ').replace('\r', ' ').replace('\n', ' ')
             .replace('"', "'"))


def scrivi_tsv(path, colonne, righe):
    with open(path, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, delimiter='\t', lineterminator='\r\n',
                       quoting=csv.QUOTE_NONE, escapechar=None)
        w.writerow(colonne)
        for r in righe:
            w.writerow([pulisci(r.get(c, '') if isinstance(r, dict)
                                else r[colonne.index(c)]) for c in colonne])


# ---------------------------------------------------------------- fase 1
def fase1():
    BK.mkdir(exist_ok=True)
    print('== verifica credenziali ==')
    d, err = api('GET', '/rest/v1/biblioteca_gif?select=slug&limit=1')
    if err:
        sys.exit('  la chiave non legge biblioteca_gif: %s' % err)
    print('  ok, biblioteca_gif leggibile')

    print('\n== backup ==')
    bib = leggi_tutto('biblioteca_gif', ordine='slug')
    json.dump(bib, open(BK / 'biblioteca_gif.json', 'w'), ensure_ascii=False, indent=1)
    scrivi_tsv(BK / 'biblioteca_gif.tsv', list(bib[0].keys()), bib)
    print('  biblioteca_gif : %d righe' % len(bib))

    cat = leggi_tutto('esercizi_catalog', ordine='codice')
    json.dump(cat, open(BK / 'esercizi_catalog.json', 'w'), ensure_ascii=False, indent=1)
    scrivi_tsv(BK / 'esercizi_catalog.tsv', list(cat[0].keys()), cat)
    print('  esercizi_catalog: %d righe' % len(cat))

    ogg = []
    for pre in sorted({b['storage_path'].split('/')[0] for b in bib if b.get('storage_path')}):
        lst = elenco_bucket(pre)
        for o in lst:
            o['_prefisso'] = pre
        ogg += lst
    json.dump(ogg, open(BK / 'bucket.json', 'w'), ensure_ascii=False, indent=1)
    print('  bucket         : %d oggetti elencati' % len(ogg))

    print('\n== controllo inverso: file nel bucket senza riga in biblioteca_gif ==')
    nel_bib = {nfc(b['storage_path']) for b in bib if b.get('storage_path')}
    orfani = []
    for o in ogg:
        p = nfc('%s/%s' % (o['_prefisso'], o['name']))
        if o.get('name') and p not in nel_bib:
            orfani.append(p)
    print('  oggetti nel bucket : %d' % len(ogg))
    print('  righe con path     : %d' % len(nel_bib))
    print('  ORFANI (file senza riga): %d' % len(orfani))
    for p in sorted(orfani)[:40]:
        print('     ' + p)
    if len(orfani) > 40:
        print('     … e altri %d' % (len(orfani) - 40))
    json.dump(sorted(orfani), open(BK / 'bucket_orfani.json', 'w'), ensure_ascii=False, indent=1)

    manca = [b['storage_path'] for b in bib
             if b.get('storage_path') and nfc(b['storage_path']) not in
             {nfc('%s/%s' % (o['_prefisso'], o['name'])) for o in ogg}]
    print('  righe che puntano a un file INESISTENTE: %d' % len(manca))
    json.dump(manca, open(BK / 'righe_senza_file.json', 'w'), ensure_ascii=False, indent=1)
    print('\n  backup in %s' % BK)


# ------------------------------------------------------- piano condiviso
FERME = {'Sit-up farfalla', 'Plank avambracci', 'Russian twist'}
ZONA_NUOVA = {'EX577': ('Pettorali', 'Pettorali', 'petto'),
              'EX574': ('Schiena e Trapezio', 'tirata verticale', 'dorsali')}


def piano():
    """Costruisce il piano dalle sorgenti autorevoli. Non scrive nulla."""
    bib = json.load(open(BK / 'biblioteca_gif.json'))
    righe = json.load(open(SC / 'tab_def.json'))
    byslug = {b['slug']: b for b in bib}
    out = []
    for r in righe:
        if r['nuovo'] in FERME:
            continue
        b = byslug.get(r['slug_vecchio'])
        if not b:
            continue
        ext = os.path.splitext(b['storage_path'])[1]
        cart, categ, _gt = ZONA_NUOVA.get(
            r['codice'], (b['storage_path'].split('/')[0], b['categoria'], None))
        out.append({
            'codice': r['codice'], 'nome': r['nuovo'],
            'slug_v': b['slug'], 'slug_n': r['slug_nuovo'],
            'path_v': b['storage_path'], 'path_n': '%s/%s%s' % (cart, r['nuovo'], ext),
            'nome_it_v': b['nome_italiano'], 'categoria_v': b['categoria'],
            'categoria_n': categ, 'riga': b,
        })
    return out


def fase2():
    p = piano()
    print('== PROVA A VUOTO — nessuna scrittura ==\n')
    mv = [x for x in p if x['path_v'] != x['path_n']]
    sl = [x for x in p if x['slug_v'] != x['slug_n']]
    ct = [x for x in p if x['categoria_v'] != x['categoria_n']]
    print('righe nel piano                  : %d' % len(p))
    print('file da spostare/rinominare      : %d' % len(mv))
    print('righe con slug nuovo da INSERIRE : %d' % len(sl))
    print('righe con categoria da cambiare  : %d  %s' % (len(ct), [x['codice'] for x in ct]))
    print('\n-- 1. STORAGE: sposta --')
    for x in mv:
        print('   %-6s %-58s\n          -> %s' % (x['codice'], x['path_v'][:58], x['path_n']))
    print('\n-- 2. biblioteca_gif: aggiorna la riga esistente (slug INVARIATO) --')
    for x in p:
        cambi = []
        if x['path_v'] != x['path_n']:
            cambi.append('storage_path')
        if x['nome_it_v'] != x['nome']:
            cambi.append('nome_italiano "%s" -> "%s"' % (x['nome_it_v'], x['nome']))
        if x['categoria_v'] != x['categoria_n']:
            cambi.append('categoria "%s" -> "%s"' % (x['categoria_v'], x['categoria_n']))
        if cambi:
            print('   %-6s slug=%-42s %s' % (x['codice'], x['slug_v'], '; '.join(cambi)))
    print('\n-- 3. biblioteca_gif: INSERISCE la riga con lo slug nuovo --')
    for x in sl:
        print('   %-6s %-42s -> %s' % (x['codice'], x['slug_v'], x['slug_n']))
    print('\n-- 4. TSV per il Sheet: gif_slug da cambiare --')
    print('   %d codici' % len(sl))
    print('\n-- 5. dopo il sync: cancella le righe con lo slug vecchio --')
    print('   %d righe' % len(sl))
    json.dump([{k: v for k, v in x.items() if k != 'riga'} for x in p],
              open(BK / 'piano.json', 'w'), ensure_ascii=False, indent=1)
    print('\npiano salvato in %s' % (BK / 'piano.json'))


def fase3():
    """Storage + biblioteca_gif, senza toccare lo slug delle righe con codice.

    Le righe SENZA codice non hanno nessun gif_slug che le punti: per quelle lo
    slug si applica subito, e' il binario libero.
    """
    p = piano()
    log = []
    print('== FASE 3: sposta i file e aggiorna le righe ==')
    for x in p:
        libera = not x['codice']
        if x['path_v'] != x['path_n']:
            _, err = api('POST', '/storage/v1/object/move',
                         {'bucketId': BUCKET, 'sourceKey': x['path_v'],
                          'destinationKey': x['path_n']})
            if err:
                print('  ERRORE spostamento %s: %s' % (x['codice'] or x['slug_v'], err))
                log.append({'slug': x['slug_v'], 'fase': 'move', 'esito': 'errore', 'err': err})
                continue
        campi = {'storage_path': x['path_n'], 'nome_italiano': x['nome'],
                 'categoria': x['categoria_n'],
                 'storage_url': '%s/storage/v1/object/public/%s/%s'
                                % (U, BUCKET, urllib.parse.quote(x['path_n']))}
        if libera:
            campi['slug'] = x['slug_n']
        _, err = api('PATCH', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(x['slug_v']), campi,
                     {'Prefer': 'return=minimal'})
        if err:
            print('  ERRORE update %s: %s' % (x['slug_v'], err))
            log.append({'slug': x['slug_v'], 'fase': 'patch', 'esito': 'errore', 'err': err})
            continue
        log.append({'slug': x['slug_v'], 'fase': 'ok', 'esito': 'fatto',
                    'path': x['path_n'], 'slug_applicato': campi.get('slug', '')})
    ok = sum(1 for l in log if l['esito'] == 'fatto')
    print('  righe completate: %d su %d' % (ok, len(p)))
    json.dump(log, open(BK / 'log_fase3.json', 'w'), ensure_ascii=False, indent=1)


def fase4():
    """Inserisce le righe con lo slug NUOVO: da qui risolvono vecchio e nuovo."""
    p = [x for x in piano() if x['codice'] and x['slug_v'] != x['slug_n']]
    print('== FASE 4: righe doppie, %d da inserire ==' % len(p))
    fatte = 0
    for x in p:
        b = dict(x['riga'])
        for k in ('id', 'created_at'):
            b.pop(k, None)
        b.update(slug=x['slug_n'], nome_italiano=x['nome'], storage_path=x['path_n'],
                 categoria=x['categoria_n'],
                 storage_url='%s/storage/v1/object/public/%s/%s'
                             % (U, BUCKET, urllib.parse.quote(x['path_n'])))
        _, err = api('POST', '/rest/v1/biblioteca_gif', b, {'Prefer': 'return=minimal'})
        if err:
            print('  ERRORE insert %s: %s' % (x['slug_n'], err))
            continue
        fatte += 1
    print('  inserite: %d su %d' % (fatte, len(p)))


def fase5():
    """Verifica: ogni codice del piano deve risolvere a un file esistente."""
    p = piano()
    bib = leggi_tutto('biblioteca_gif', ordine='slug')
    byslug = {b['slug']: b for b in bib}
    cat = {c['codice']: c for c in leggi_tutto('esercizi_catalog', ordine='codice')}
    ogg = set()
    for c in ('Addominali e Core', 'Pettorali', 'Schiena e Trapezio'):
        for o in elenco_bucket(c):
            if o.get('id') is not None:
                ogg.add(nfc('%s/%s' % (c, o['name'])))
    ko = []
    for x in p:
        if not x['codice']:
            continue
        gs = cat[x['codice']].get('gif_slug')
        b = byslug.get(gs)
        if not b:
            ko.append((x['codice'], 'gif_slug %s senza riga' % gs))
        elif nfc(b['storage_path']) not in ogg:
            ko.append((x['codice'], 'file mancante: %s' % b['storage_path']))
    print('== FASE 5: verifica ==')
    print('  codici verificati : %d' % sum(1 for x in p if x['codice']))
    print('  NON risolvono     : %d' % len(ko))
    for c, m in ko:
        print('     %s  %s' % (c, m))
    # anche gli slug NUOVI devono gia' risolvere (righe doppie)
    kn = [x['codice'] for x in p if x['codice'] and x['slug_v'] != x['slug_n']
          and x['slug_n'] not in byslug]
    print('  slug nuovi non ancora presenti: %d %s' % (len(kn), kn))
    return ko, kn


def fase7():
    """Cancella le righe con lo slug vecchio, una per una e solo se orfane.

    La guardia e' per riga, non per lotto: si cancella soltanto se NESSUN codice
    del catalogo punta ancora a quello slug. Cosi' un sync parziale del Sheet non
    puo' portarsi via una GIF viva.
    """
    cat = leggi_tutto('esercizi_catalog', ordine='codice')
    usati = {c['gif_slug'] for c in cat if c.get('gif_slug')}
    p = [x for x in piano() if x['codice'] and x['slug_v'] != x['slug_n']]
    print('== FASE 7: cancella le righe con lo slug vecchio ==')
    print('  candidate: %d' % len(p))
    fatte, saltate = 0, []
    for x in p:
        if x['slug_v'] in usati:
            saltate.append((x['codice'], x['slug_v']))
            continue
        _, err = api('DELETE', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(x['slug_v']), None, {'Prefer': 'return=minimal'})
        if err:
            saltate.append((x['codice'], 'errore: %s' % err))
            continue
        fatte += 1
    print('  cancellate: %d' % fatte)
    print('  saltate   : %d' % len(saltate))
    for c, m in saltate:
        print('     %s %s' % (c, m))


if __name__ == '__main__':
    f = sys.argv[1] if len(sys.argv) > 1 else '1'
    {'1': fase1, '2': fase2, '3': fase3, '4': fase4, '5': fase5,
     '7': fase7}.get(f, fase1)()
