#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migrazione di una zona, guidata da lavoro/piano_<zona>.json.

Non decide nulla: esegue il piano. I nomi vengono dal pannello di conferma,
il piano li aggancia ai file per SHA-256. esercizi_catalog NON si tocca mai:
si aggiorna solo dal Google Sheet.

Ordine a righe doppie — non deve esistere un istante in cui una GIF e' irraggiungibile:

  backup  righe biblioteca_gif della zona + elenco del bucket        (nessuna scrittura)
  1       Storage: copia -> verifica SHA-256 -> aggiorna storage_path -> cancella la
          vecchia.  Slug INVARIATO: il Worker continua a risolvere per tutto il passo.
  2       biblioteca_gif: INSERISCE le righe con lo slug nuovo, stesso storage_path.
          Da qui vecchio e nuovo risolvono entrambi.
  --      Ignazio sincronizza il Sheet.  FERMATA OBBLIGATORIA.
  4       verifica di TUTTI i codici della zona via catena reale
  5       cancella le righe con lo slug vecchio, una per una e solo se orfane
  6       riga nuova del libero che aspettava uno slug occupato
  7       le altre righe nuove

Uso:  python3 migra_zona.py "Bicipiti e Braccia" <passo>
"""
import collections
import csv
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import (BUCKET, U, api, cache_impronte, chiave,  # noqa: E402
                      elenco_bucket, indice_locale, leggi_tutto, nfc,
                      stampa_consumo, verifica_oggetto)
from nomenclatura import slug as fslug  # noqa: E402

BASE = Path(__file__).parent
GIF_ROOT = Path(os.environ.get('BIBLIOTECA_ROOT',
                               '/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi'))


def carica(zona):
    p = BASE / 'lavoro' / '_piani' / ('piano_%s.json' % fslug(zona))
    if not p.exists():
        sys.exit('manca il piano: %s' % p)
    return json.loads(p.read_text(encoding='utf-8'))


def bk(zona):
    d = BASE / ('backup_migrazione_%s' % fslug(zona))
    d.mkdir(exist_ok=True)
    return d


def url_pubblico(path):
    return '%s/storage/v1/object/public/%s/%s' % (U, BUCKET, urllib.parse.quote(path))


def impronta_giusta(path, sha_atteso):
    """L'oggetto che sta ora in `path` ha l'impronta attesa? (True, nota) o (False, motivo).

    Fino al 7 agosto qui si RISCARICAVA l'oggetto appena copiato o caricato per
    ricalcolarne lo SHA-256: ~1 MB per ogni file toccato dalla migrazione. Ora si
    fa una HEAD, che restituisce l'`eTag` — cioe' l'MD5 del contenuto — e si risale
    allo SHA-256 dal file gemello sul Mac. Nessun byte di contenuto attraversa la rete.

    Un'impronta ignota NON e' un via libera: se il contenuto non si riconosce, la
    funzione dice di no e il chiamante non cancella niente [L10].
    """
    esito, dettaglio = verifica_oggetto(path, sha_atteso)
    return esito == 'ok', dettaglio


def oggetti_zona(zona):
    o, err = elenco_bucket(zona + '/')
    if err:
        sys.exit('elenco bucket fallito: %s' % err)
    return {nfc('%s/%s' % (zona, x['name'])) for x in o if x.get('id') is not None}


def log(zona, nome, dati):
    p = bk(zona) / nome
    p.write_text(json.dumps(dati, ensure_ascii=False, indent=1), encoding='utf-8')
    print('  log: %s' % p)


# ------------------------------------------------------------------ backup
def passo_backup(zona, piano):
    D = bk(zona)
    bib, e = leggi_tutto('biblioteca_gif', '*', 'slug')
    if e:
        sys.exit('biblioteca_gif: %s' % e)
    cat, e = leggi_tutto('esercizi_catalog', '*', 'codice')
    if e:
        sys.exit('esercizi_catalog: %s' % e)
    zona_rows = [b for b in bib if nfc(b.get('storage_path') or '').startswith(zona + '/')]
    json.dump(bib, open(D / 'biblioteca_gif_completa.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(zona_rows, open(D / 'biblioteca_gif_zona.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(cat, open(D / 'esercizi_catalog.json', 'w'), ensure_ascii=False, indent=1)
    ogg = sorted(oggetti_zona(zona))
    json.dump(ogg, open(D / 'bucket_zona.json', 'w'), ensure_ascii=False, indent=1)
    print('== BACKUP ==')
    print('  biblioteca_gif  : %d righe totali, %d della zona' % (len(bib), len(zona_rows)))
    print('  esercizi_catalog: %d righe' % len(cat))
    print('  bucket zona     : %d oggetti' % len(ogg))
    print('  in %s' % D)
    return len(zona_rows), len(ogg)


# ------------------------------------------------------------------ passo 1
def passo1(zona, piano):
    """Storage + storage_path, slug invariato.

    Copia -> verifica l'impronta della copia -> aggiorna l'indice -> cancella la
    vecchia. Mai invertire: se si cancellasse prima, un errore lascerebbe un buco.
    """
    da_fare = [r for r in piano['righe']
               if r['storage_path_attuale'] and r['percorso_cambia']]
    print('== PASSO 1: %d oggetti da rinominare (slug invariato) ==' % len(da_fare))
    presenti = oggetti_zona(zona)
    esiti = []
    for i, r in enumerate(da_fare, 1):
        src, dst = r['storage_path_attuale'], r['storage_path_dest']
        cod = ','.join(c['codice'] for c in r['codici']) or '-'
        e = {'codice': cod, 'slug': r['slug_attuale'], 'da': src, 'a': dst}

        if dst in presenti and src not in presenti:
            e['esito'] = 'gia fatto'
            esiti.append(e)
            continue
        if dst in presenti:
            e['esito'] = 'saltato'
            e['dettaglio'] = 'la destinazione esiste gia ed e un altro oggetto'
            esiti.append(e)
            print('  SALTATO %s: destinazione occupata' % cod)
            continue

        _, err = api('POST', '/storage/v1/object/copy',
                     {'bucketId': BUCKET, 'sourceKey': src, 'destinationKey': dst})
        if err:
            e.update(esito='errore', dettaglio='copia: %s' % err)
            esiti.append(e)
            print('  ERRORE copia %s: %s' % (cod, err))
            continue

        ok, nota = impronta_giusta(dst, r['sha256'])
        if not ok:
            e.update(esito='errore', dettaglio='impronta della copia: %s' % nota)
            esiti.append(e)
            print('  ERRORE impronta %s: %s — NON cancello nulla' % (cod, nota))
            continue

        _, err = api('PATCH', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(r['slug_attuale']),
                     {'storage_path': dst, 'nome_italiano': r['nome_finale'],
                      'storage_url': url_pubblico(dst)})
        if err:
            e.update(esito='errore', dettaglio='patch indice: %s' % err)
            esiti.append(e)
            print('  ERRORE indice %s: %s — la copia resta, la vecchia NON si cancella' % (cod, err))
            continue

        _, err = api('DELETE', '/storage/v1/object/%s/%s'
                     % (BUCKET, urllib.parse.quote(src)))
        if err:
            e.update(esito='fatto', dettaglio='vecchio file non cancellato: %s' % err)
        else:
            e['esito'] = 'fatto'
        esiti.append(e)
        presenti.add(dst)
        presenti.discard(src)
        if i % 10 == 0:
            print('  ... %d/%d' % (i, len(da_fare)), flush=True)

    c = collections.Counter(x['esito'] for x in esiti)
    print('  esiti: %s' % dict(c))
    log(zona, 'passo1.json', esiti)
    return c


# ------------------------------------------------------------------ passo 2
def passo2(zona, piano):
    """Righe doppie: inserisce lo slug nuovo accanto al vecchio, stesso file."""
    da_fare = [r for r in piano['righe'] if r['operazione'] == 'slug nuovo']
    print('== PASSO 2: %d righe con lo slug nuovo da inserire ==' % len(da_fare))
    bib, e = leggi_tutto('biblioteca_gif', '*', 'slug')
    if e:
        sys.exit(e)
    byslug = {b['slug']: b for b in bib}
    esiti = []
    for r in da_fare:
        cod = ','.join(c['codice'] for c in r['codici']) or '-'
        if r['slug_nuovo'] in byslug:
            esiti.append({'codice': cod, 'slug': r['slug_nuovo'], 'esito': 'gia presente'})
            continue
        base = byslug.get(r['slug_attuale'])
        if not base:
            esiti.append({'codice': cod, 'slug': r['slug_attuale'],
                          'esito': 'errore', 'dettaglio': 'riga vecchia non trovata'})
            print('  ERRORE %s: riga vecchia %s assente' % (cod, r['slug_attuale']))
            continue
        nuova = {k: v for k, v in base.items() if k not in ('id', 'created_at')}
        nuova.update(slug=r['slug_nuovo'], nome_italiano=r['nome_finale'],
                     storage_path=r['storage_path_dest'],
                     storage_url=url_pubblico(r['storage_path_dest']))
        _, err = api('POST', '/rest/v1/biblioteca_gif', nuova)
        if err:
            esiti.append({'codice': cod, 'slug': r['slug_nuovo'],
                          'esito': 'errore', 'dettaglio': err})
            print('  ERRORE insert %s (%s): %s' % (cod, r['slug_nuovo'], err))
            continue
        esiti.append({'codice': cod, 'slug_vecchio': r['slug_attuale'],
                      'slug': r['slug_nuovo'], 'esito': 'inserita'})
    c = collections.Counter(x['esito'] for x in esiti)
    print('  esiti: %s' % dict(c))
    log(zona, 'passo2.json', esiti)

    # TSV per il Sheet
    tsv = bk(zona) / 'sheet_gif_slug.tsv'
    with open(tsv, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, delimiter='\t', lineterminator='\r\n')
        w.writerow(['codice', 'nome_attuale_catalogo', 'nome_nuovo',
                    'gif_slug_attuale', 'gif_slug_nuovo'])
        for r in da_fare:
            for cc in r['codici']:
                w.writerow([cc['codice'], cc['nome_catalogo'], r['nome_finale'],
                            r['slug_attuale'], r['slug_nuovo']])
    print('  TSV per il Sheet: %s' % tsv)
    return c


# ------------------------------------------------------- zona senza codici
def _nessun_codice(zona):
    """Vero se NESSUN codice del catalogo punta a una riga di questa zona.

    E' la precondizione per aggiornare lo slug in place: senza codici non esiste
    la catena gif_slug -> slug da proteggere, quindi non serve la riga doppia.
    Se un solo codice puntasse qui, aggiornare lo slug lo lascerebbe orfano.
    """
    bib, e = leggi_tutto('biblioteca_gif', 'slug,storage_path', 'slug')
    if e:
        sys.exit(e)
    cat, e = leggi_tutto('esercizi_catalog', 'codice,gif_slug', 'codice')
    if e:
        sys.exit(e)
    slugs = {b['slug'] for b in bib
             if nfc(b.get('storage_path') or '').startswith(zona + '/')}
    punt = [c['codice'] for c in cat if c.get('gif_slug') in slugs]
    return punt


def passo_prova(zona, piano):
    """Prova a vuoto: stampa cosa farebbe, senza fare nulla."""
    R = piano['righe']
    punt = _nessun_codice(zona)
    print('== PROVA A VUOTO — nessuna scrittura ==')
    print('  codici del catalogo che puntano alla zona: %d %s' % (len(punt), punt or ''))
    if punt:
        print('  ATTENZIONE: con dei codici lo slug NON si aggiorna in place.')
    fermi = [r for r in R if not r['percorso_cambia'] and not r['slug_cambia']]
    mv = [r for r in R if r['percorso_cambia'] and r['storage_path_attuale']]
    sl = [r for r in R if r['slug_cambia']]
    nu = [r for r in R if r['operazione'] == 'nuova']
    print('\n  -- 0. righe che NON si toccano: %d --' % len(fermi))
    for r in fermi:
        print('     %s' % r['nome_finale'])
    print('\n  -- 1. bucket: rinomina + storage_path (slug invariato): %d --' % len(mv))
    for r in mv:
        print('     %s\n        -> %s' % (r['storage_path_attuale'], r['storage_path_dest']))
    print('\n  -- 2. slug aggiornato IN PLACE (nessuna riga doppia): %d --' % len(sl))
    for r in sl:
        print('     %-40s %s -> %s' % (r['nome_finale'][:40], r['slug_attuale'], r['slug_nuovo']))
    print('\n  -- 3. caricamento nel bucket + riga nuova: %d --' % len(nu))
    for r in nu:
        print('     %s  (%d byte)' % (r['storage_path_dest'], r['bytes']))
    print('\n  esercizi_catalog: non viene toccato. Sheet: nessun sync.')


def passo_slug(zona, piano):
    """Aggiorna slug e nome_italiano in place. Solo per zone senza codici."""
    punt = _nessun_codice(zona)
    if punt:
        sys.exit('%d codici puntano alla zona: lo slug NON si tocca in place. %s'
                 % (len(punt), punt))
    da_fare = [r for r in piano['righe'] if r['slug_cambia']]
    print('== SLUG IN PLACE: %d righe ==' % len(da_fare))
    bib, e = leggi_tutto('biblioteca_gif', 'slug', 'slug')
    if e:
        sys.exit(e)
    esistenti = {b['slug'] for b in bib}
    esiti = []
    for r in da_fare:
        if r['slug_nuovo'] in esistenti:
            esiti.append({'slug': r['slug_nuovo'], 'esito': 'saltata',
                          'dettaglio': 'lo slug nuovo esiste gia'})
            print('  SALTATA %s: slug gia presente' % r['slug_nuovo'])
            continue
        _, err = api('PATCH', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(r['slug_attuale']),
                     {'slug': r['slug_nuovo'], 'nome_italiano': r['nome_finale']})
        esiti.append({'da': r['slug_attuale'], 'slug': r['slug_nuovo'],
                      'esito': 'errore' if err else 'aggiornata', 'dettaglio': err or ''})
        if err:
            print('  ERRORE %s: %s' % (r['slug_attuale'], err))
    print('  esiti: %s' % dict(collections.Counter(x['esito'] for x in esiti)))
    log(zona, 'passo_slug.json', esiti)


# ------------------------------------------------------------------ passo 4
def passo4(zona, piano):
    """Verifica TUTTI i codici della zona: catalogo -> riga -> file reale."""
    cat, e = leggi_tutto('esercizi_catalog', 'codice,nome,gif_slug', 'codice')
    if e:
        sys.exit(e)
    bib, e = leggi_tutto('biblioteca_gif', 'slug,storage_path', 'slug')
    if e:
        sys.exit(e)
    byslug = {b['slug']: b for b in bib}
    bycod = {c['codice']: c for c in cat}
    presenti = oggetti_zona(zona)
    codici = sorted({c['codice'] for r in piano['righe'] for c in r['codici']})
    ko = []
    for cod in codici:
        gs = (bycod.get(cod) or {}).get('gif_slug')
        if not gs:
            ko.append((cod, 'gif_slug vuoto'))
            continue
        b = byslug.get(gs)
        if not b:
            ko.append((cod, 'gif_slug "%s" senza riga in biblioteca_gif' % gs))
            continue
        if nfc(b['storage_path']) not in presenti:
            ko.append((cod, 'file inesistente: %s' % b['storage_path']))
    print('== PASSO 4: verifica ==')
    print('  codici verificati : %d' % len(codici))
    print('  NON risolvono     : %d' % len(ko))
    for c, m in ko:
        print('     %s  %s' % (c, m))
    log(zona, 'passo4.json', {'codici': len(codici), 'ko': ko})
    return ko


# ------------------------------------------------------------------ passo 5
def passo5(zona, piano):
    """Cancella le righe con lo slug vecchio. Unico passo irreversibile.

    Precondizione: il passo 4 deve tornare pulito. La guardia e' comunque per riga:
    si cancella solo se NESSUN codice punta piu' a quello slug.
    """
    ko = passo4(zona, piano)
    if ko:
        sys.exit('\nIL PASSO 4 NON E PULITO: non cancello nulla.')
    cat, e = leggi_tutto('esercizi_catalog', 'codice,gif_slug', 'codice')
    if e:
        sys.exit(e)
    usati = {c['gif_slug'] for c in cat if c.get('gif_slug')}
    da_fare = [r for r in piano['righe'] if r['operazione'] == 'slug nuovo']
    print('\n== PASSO 5: cancellazione delle righe vecchie ==')
    esiti = []
    for r in da_fare:
        cod = ','.join(c['codice'] for c in r['codici'])
        if r['slug_attuale'] in usati:
            esiti.append({'codice': cod, 'slug': r['slug_attuale'], 'esito': 'saltata',
                          'dettaglio': 'un codice la punta ancora'})
            continue
        _, err = api('DELETE', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(r['slug_attuale']))
        esiti.append({'codice': cod, 'slug': r['slug_attuale'],
                      'esito': 'errore' if err else 'cancellata', 'dettaglio': err or ''})
    c = collections.Counter(x['esito'] for x in esiti)
    print('  esiti: %s' % dict(c))
    for x in esiti:
        if x['esito'] != 'cancellata':
            print('     %s %s — %s' % (x['codice'], x['slug'], x['dettaglio']))
    log(zona, 'passo5.json', esiti)
    return c


# ------------------------------------------------------------------ passo 6/7
def _carica_nuova(zona, r):
    """Carica il file dal Mac e inserisce la riga. Verifica l'impronta dopo il caricamento."""
    src = GIF_ROOT / zona / r['file_mac']
    dati = open(src, 'rb').read()
    k = chiave()
    req = urllib.request.Request(
        '%s/storage/v1/object/%s/%s' % (U, BUCKET, urllib.parse.quote(r['storage_path_dest'])),
        data=dati, method='POST',
        headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'image/gif'})
    try:
        urllib.request.urlopen(req, timeout=300)
    except Exception as ex:
        return 'errore', 'caricamento: %s' % str(ex)[:120]
    ok, nota = impronta_giusta(r['storage_path_dest'], r['sha256'])
    if not ok:
        return 'errore', 'impronta dopo il caricamento: %s' % nota
    riga = {'slug': r['slug_nuovo'], 'nome_italiano': r['nome_finale'],
            'nome_originale': None, 'categoria': zona,
            'gruppo_muscolare': None,
            'storage_path': r['storage_path_dest'],
            'storage_url': url_pubblico(r['storage_path_dest'])}
    _, err = api('POST', '/rest/v1/biblioteca_gif', riga)
    return ('errore', 'insert: %s' % err) if err else ('inserita', '')


def passo6(zona, piano):
    """Le righe nuove il cui slug era occupato da un codice vivo, ora liberato."""
    occupati = {x['slug'] for x in piano['collisioni_slug_esterne']}
    da_fare = [r for r in piano['righe']
               if r['operazione'] == 'nuova' and r['slug_nuovo'] in occupati]
    return _nuove(zona, piano, da_fare, 6)


def passo7(zona, piano):
    occupati = {x['slug'] for x in piano['collisioni_slug_esterne']}
    da_fare = [r for r in piano['righe']
               if r['operazione'] == 'nuova' and r['slug_nuovo'] not in occupati]
    return _nuove(zona, piano, da_fare, 7)


def _nuove(zona, piano, da_fare, n):
    bib, e = leggi_tutto('biblioteca_gif', 'slug', 'slug')
    if e:
        sys.exit(e)
    esistenti = {b['slug'] for b in bib}
    print('== PASSO %d: %d righe nuove ==' % (n, len(da_fare)))
    esiti = []
    for r in da_fare:
        if r['slug_nuovo'] in esistenti:
            esiti.append({'slug': r['slug_nuovo'], 'esito': 'saltata',
                          'dettaglio': 'slug gia occupato'})
            print('  SALTATA %s: slug gia occupato' % r['slug_nuovo'])
            continue
        esito, det = _carica_nuova(zona, r)
        esiti.append({'slug': r['slug_nuovo'], 'esito': esito, 'dettaglio': det})
        if esito != 'inserita':
            print('  ERRORE %s: %s' % (r['slug_nuovo'], det))
    print('  esiti: %s' % dict(collections.Counter(x['esito'] for x in esiti)))
    log(zona, 'passo%d.json' % n, esiti)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    Z, P = sys.argv[1], sys.argv[2]
    pia = carica(Z)
    # L'indice delle impronte si carica una volta sola, prima del passo: e' cio' che
    # permette alle verifiche di rispondere senza scaricare.
    indice_locale()
    cache_impronte()
    try:
        {'backup': passo_backup, 'prova': passo_prova, '1': passo1, '2': passo2,
         'slug': passo_slug, '4': passo4, '5': passo5, '6': passo6,
         '7': passo7}[P](Z, pia)
    finally:
        stampa_consumo('migra_zona passo %s' % P)
