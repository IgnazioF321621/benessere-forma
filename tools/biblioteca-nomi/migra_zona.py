#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migrazione di una zona, guidata da lavoro/piano_<zona>.json.

Non decide nulla: esegue il piano. I nomi vengono dal pannello di conferma,
il piano li aggancia ai file per SHA-256. esercizi_catalog NON si tocca mai:
si aggiorna solo dal Google Sheet.

Ordine a righe doppie — non deve esistere un istante in cui una GIF e' irraggiungibile:

  backup  righe biblioteca_gif della zona + elenco del bucket        (nessuna scrittura)
  1       Storage: carica i byte RIDOTTI al percorso di destinazione -> verifica
          l'impronta -> aggiorna storage_path -> cancella il vecchio oggetto.
          Slug INVARIATO: il Worker continua a risolvere per tutto il passo.
  2       biblioteca_gif: INSERISCE le righe con lo slug nuovo, stesso storage_path.
          Da qui vecchio e nuovo risolvono entrambi.
  --      Ignazio sincronizza il Sheet.  FERMATA OBBLIGATORIA.
  4       verifica di TUTTI i codici della zona via catena reale
  5       cancella le righe con lo slug vecchio, una per una e solo se orfane
  6       riga nuova del libero che aspettava uno slug occupato
  7       le altre righe nuove

  slug      slug in place per una zona in cui NESSUN codice entra (guardia di zona)
  slug-riga slug in place di UNA riga a cui nessun codice punta, in una zona che
            invece i codici ce li ha. Stessa domanda, posta alla riga.

I BYTE ARRIVANO SEMPRE DAL PIANO DEI 480px, MAI DAL MAC
Dal 15 agosto 2026 nessun file entra nel bucket con i byte di prima: si entra
ridotti a 480px e con `cache-control: immutable`. Questo strumento non ha nessuna
strada per scrivere byte che non passi da lavoro/_480/<zona>.json, quindi va
lanciato ricomprimi.py PRIMA, o il passo si ferma senza scrivere.

  python3 ricomprimi.py "<zona>"                    # prepara i byte ridotti
  python3 migra_zona.py "<zona>" prova              # dice cosa farebbe
  python3 migra_zona.py "<zona>" 1 --solo="<nome>"  # una riga sola, per collaudo

Uso:  python3 migra_zona.py "Bicipiti e Braccia" <passo> [--solo=<nome o percorso>]
"""
import collections
import csv
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import (BUCKET, CACHE_IMMUTABILE, U, api,  # noqa: E402
                      cache_impronte, carica_bytes, elenco_bucket,
                      indice_locale, leggi_tutto, nfc, stampa_consumo,
                      stato_bucket, verifica_oggetto)
from nomenclatura import slug as fslug  # noqa: E402

BASE = Path(__file__).parent
# Dal 16 agosto questo strumento NON legge piu' la biblioteca sul Mac: ogni byte
# che scrive arriva dal piano dei 480px, che e' l'unico posto in cui un file e'
# gia' stato ridotto e collaudato. Se qui ricomparisse una radice locale, sarebbe
# il segno che qualcuno ha riaperto una strada per caricare a piena risoluzione.


def carica(zona):
    p = BASE / 'lavoro' / '_piani' / ('piano_%s.json' % fslug(zona))
    if not p.exists():
        sys.exit('manca il piano: %s' % p)
    return json.loads(p.read_text(encoding='utf-8'))


def piano_480(zona):
    """Il piano di ricomprimi.py, indicizzato per percorso di DESTINAZIONE.

    E' obbligatorio, e non e' una comodita': dal 15 agosto 2026 nessun file entra
    nel bucket con i byte di prima, ridotto a 480px e con il cache-control. Questo
    strumento non ha piu' nessuna strada per scrivere byte che non passi di qui,
    quindi senza il piano si ferma invece di caricare a piena risoluzione.
    """
    p = BASE / 'lavoro' / '_480' / ('%s.json' % zona.lower().replace(' ', '-'))
    if not p.exists():
        sys.exit('manca il piano dei 480px: %s\nlancia prima:\n'
                 '  python3 tools/biblioteca-nomi/ricomprimi.py "%s"' % (p, zona))
    d = json.loads(p.read_text(encoding='utf-8'))
    return {nfc(v['storage_path']): v for v in d['voci']}


def scrivi_oggetto(p480, storage_path, stato):
    """Mette nel bucket i byte ridotti destinati a `storage_path`. (ok, nota).

    Sostituisce sia la copia server-side sia il caricamento grezzo che stavano
    qui prima del 16 agosto. La copia trasportava i byte di prima con
    l'intestazione di prima; il caricamento grezzo non mandava cache-control e
    dichiarava `image/gif` fisso [L33]. Entrambi erano nati prima della regola.

    L'impronta attesa e' quella del file RIDOTTO — `sha256_bucket_atteso` — non quella
    dell'originale sul Mac: sono byte diversi, ed e' il file ridotto quello che
    finisce nel bucket.

    `stato` e' la fotografia della zona letta dall'ELENCO, una volta sola per
    passo. Serve a ricontrollare, PRIMA di scrivere, che il bucket sia ancora
    nello stato che il piano ha registrato: se qualcosa e' cambiato da allora ci
    si ferma senza scrivere, perche' il piano non descrive piu' cio' che si sta
    sostituendo. Si legge dall'elenco e non con una HEAD o una GET perche' quelle
    andrebbero a toccare l'oggetto, e su un file che entra identico sarebbe il
    sondaggio stesso a creare la voce di cache che si vuole evitare [L31].
    """
    sp = nfc(storage_path)
    v = p480.get(sp)
    if not v:
        return False, 'nessuna voce nel piano dei 480px per %s' % storage_path
    f = Path(v['file_480'])
    if not f.exists():
        return False, ('manca il file ridotto %s — rilancia ricomprimi.py' % f)
    if not v.get('mimetype'):
        return False, 'mimetype non determinato per %s' % storage_path

    ora = stato.get(sp)
    gia_nostro = bool(ora) and ora['etag'] == v['md5_bucket_atteso'] \
        and ora['byte'] == v['byte_bucket_atteso']
    if gia_nostro and ora['cache'] == CACHE_IMMUTABILE:
        return True, 'gia a posto (byte ridotti e intestazione gia presenti)'

    if v['percorso_cambia']:
        # La destinazione deve essere libera. Se ospita gia' i nostri byte e'
        # un secondo giro sullo stesso passo e si prosegue; qualunque altra cosa
        # sarebbe una sovrascrittura di un oggetto che nessuno ha esaminato.
        if ora and not gia_nostro:
            return False, ('la destinazione e occupata da un altro oggetto'
                           ' (etag %s)' % ora['etag'][:12])
        att = stato.get(nfc(v['storage_path_attuale'])) \
            if v.get('storage_path_attuale') else None
        if att and v.get('md5_bucket_ora') and att['etag'] != v['md5_bucket_ora']:
            return False, ('l oggetto di partenza e cambiato dopo il piano:'
                           ' atteso %s, trovato %s'
                           % (v['md5_bucket_ora'][:12], att['etag'][:12]))
    elif ora and v.get('md5_bucket_ora') and not gia_nostro \
            and ora['etag'] != v['md5_bucket_ora']:
        return False, ('l oggetto e cambiato dopo il piano: atteso %s, trovato %s'
                       % (v['md5_bucket_ora'][:12], ora['etag'][:12]))

    err = carica_bytes(sp, f.read_bytes(), v['mimetype'])
    if err:
        return False, 'caricamento: %s' % err
    ok, nota = impronta_giusta(sp, v['sha256_bucket_atteso'])
    if not ok:
        return False, 'impronta dopo il caricamento: %s' % nota
    return True, nota


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
def passo1(zona, piano, solo=None):
    """Bucket: i byte ridotti al percorso di destinazione. Slug invariato.

    Carica il file ridotto -> verifica l'impronta -> aggiorna l'indice -> cancella
    il vecchio oggetto. Mai invertire: se si cancellasse prima, un errore
    lascerebbe un buco.

    Fino al 16 agosto questo passo faceva una COPIA server-side. Una copia porta
    i byte di prima al percorso nuovo: piena risoluzione, stesso ETag, `no-cache`
    conservato — cioe' tutte e tre le proprieta' obbligatorie mancate in un colpo
    solo. Ora la rinomina e' una scrittura, e i byte scritti sono quelli ridotti.

    Copre anche le righe che NON cambiano percorso. Prima erano fra le "righe che
    non si toccano", e per la sola migrazione era vero; con la regola dei 480px
    non lo e' piu': quei file stanno nel bucket a piena risoluzione e senza
    intestazione esattamente come gli altri. Per loro sorgente e destinazione
    coincidono, quindi non c'e' niente da cancellare dopo.
    """
    p480 = piano_480(zona)
    stato, err = stato_bucket(zona)
    if err:
        sys.exit('elenco del bucket fallito: %s' % err)
    da_fare = [r for r in piano['righe'] if r['storage_path_attuale']]
    if solo:
        da_fare = [r for r in da_fare
                   if solo in (r['storage_path_dest'], r['nome_finale'])]
        if not da_fare:
            sys.exit('nessuna riga corrisponde a "%s"' % solo)
    n_mv = sum(1 for r in da_fare if r['percorso_cambia'])
    print('== PASSO 1: %d oggetti — %d cambiano percorso, %d riscritti in place =='
          % (len(da_fare), n_mv, len(da_fare) - n_mv))
    presenti = oggetti_zona(zona)
    esiti = []
    for i, r in enumerate(da_fare, 1):
        src, dst = nfc(r['storage_path_attuale']), nfc(r['storage_path_dest'])
        cod = ','.join(c['codice'] for c in r['codici']) or '-'
        e = {'codice': cod, 'slug': r['slug_attuale'], 'da': src, 'a': dst}

        # Una destinazione gia' occupata da un ALTRO oggetto non si sovrascrive.
        # Se invece e' lo stesso oggetto (riscrittura in place) si procede: i byte
        # che ci mettiamo sono diversi da quelli che ci sono, ed e' il punto.
        if dst != src and dst in presenti:
            e.update(esito='saltato',
                     dettaglio='la destinazione esiste gia ed e un altro oggetto')
            esiti.append(e)
            print('  SALTATO %s: destinazione occupata' % cod)
            continue

        ok, nota = scrivi_oggetto(p480, dst, stato)
        if not ok:
            e.update(esito='errore', dettaglio=nota)
            esiti.append(e)
            print('  ERRORE %s (%s): %s — NON cancello nulla' % (cod, dst, nota))
            continue

        _, err = api('PATCH', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(r['slug_attuale']),
                     {'storage_path': dst, 'nome_italiano': r['nome_finale'],
                      'storage_url': url_pubblico(dst)})
        if err:
            e.update(esito='errore', dettaglio='patch indice: %s' % err)
            esiti.append(e)
            print('  ERRORE indice %s: %s — il nuovo resta, il vecchio NON si cancella'
                  % (cod, err))
            continue

        if dst == src:
            e.update(esito='fatto', dettaglio='riscritto in place: %s' % nota)
            esiti.append(e)
            presenti.add(dst)
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
    log(zona, 'passo1.json' if not solo else 'passo1_solo.json', esiti)
    return c


# ------------------------------------------------------------------ passo 2
def passo2(zona, piano):
    """Righe doppie: inserisce lo slug nuovo accanto al vecchio, stesso file.

    Riguarda SOLO le righe a cui punta almeno un codice. La riga doppia esiste
    per coprire la finestra fra il cambio di slug qui e il sync del Sheet, che e'
    manuale e puo' durare ore: senza, `esercizi_catalog.gif_slug` punterebbe a
    uno slug che non esiste piu' e il Worker risponderebbe `missing`. Dove nessun
    codice punta, quella finestra non esiste e la riga doppia non serve: si
    aggiorna lo slug in place con `slug-riga`, che e' la fase 3 del piano.

    Il filtro era `operazione == 'slug nuovo'`, che prende anche le righe senza
    codici: su Pettorali avrebbe inserito 24 righe invece di 22, e le 2 del
    gruppo D si sarebbero trovate lo slug nuovo gia' occupato quando la fase 3
    fosse arrivata a chiederlo. La domanda giusta e' la stessa di `slug-riga` —
    «questa riga ha codici?» — e si rilegge VIVA, perche' il piano dice chi
    aveva codici quando e' stato scritto, non chi ne ha adesso [L34].
    """
    punt = _codici_per_slug()
    da_fare = [r for r in piano['righe']
               if r['operazione'] == 'slug nuovo' and punt.get(r['slug_attuale'])]
    saltate = [r for r in piano['righe']
               if r['operazione'] == 'slug nuovo' and not punt.get(r['slug_attuale'])]
    print('== PASSO 2: %d righe con lo slug nuovo da inserire ==' % len(da_fare))
    if saltate:
        print('  %d righe con lo slug che cambia ma SENZA codici: non prendono la'
              ' riga doppia,' % len(saltate))
        print('  vanno in fase 3 con "slug-riga".')
        for r in saltate:
            print('     %-38.38s %s -> %s'
                  % (r['nome_finale'], r['slug_attuale'], r['slug_nuovo']))
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
    # Non esistono piu' "righe che non si toccano": una riga che resta al suo
    # percorso ha comunque i byte a piena risoluzione e l'intestazione vecchia,
    # quindi va riscritta come tutte le altre. Cambia solo che per lei non c'e'
    # un vecchio oggetto da cancellare dopo.
    inplace = [r for r in R if r['storage_path_attuale'] and not r['percorso_cambia']]
    mv = [r for r in R if r['percorso_cambia'] and r['storage_path_attuale']]
    sl = [r for r in R if r['slug_cambia']]
    nu = [r for r in R if r['operazione'] == 'nuova']
    p480 = piano_480(zona)
    print('\n  -- 0. riscritte in place, stesso percorso: %d --' % len(inplace))
    for r in inplace:
        print('     %s' % r['storage_path_dest'])
    print('\n  -- 1. bucket: rinomina + storage_path (slug invariato): %d --' % len(mv))
    for r in mv:
        print('     %s\n        -> %s' % (r['storage_path_attuale'], r['storage_path_dest']))
    # Il piano dei 480px deve coprire ogni riga che scrive byte, o il passo 1 si
    # ferma a meta' strada scoprendolo un file alla volta.
    scoperte = [r['storage_path_dest'] for r in R
                if nfc(r['storage_path_dest']) not in p480]
    print('\n  -- righe senza byte ridotti nel piano dei 480px: %d --' % len(scoperte))
    for s in scoperte:
        print('     %s' % s)
    print('\n  -- 2. slug aggiornato IN PLACE (nessuna riga doppia): %d --' % len(sl))
    for r in sl:
        print('     %-40s %s -> %s' % (r['nome_finale'][:40], r['slug_attuale'], r['slug_nuovo']))
    print('\n  -- 3. caricamento nel bucket + riga nuova: %d --' % len(nu))
    for r in nu:
        print('     %s  (%d byte)' % (r['storage_path_dest'], r['bytes']))
    print('\n  esercizi_catalog: non viene toccato. Sheet: nessun sync.')


def _codici_per_slug():
    """slug -> [codici che lo puntano]. Letto vivo, mai dal piano."""
    cat, e = leggi_tutto('esercizi_catalog', 'codice,gif_slug', 'codice')
    if e:
        sys.exit(e)
    out = {}
    for c in cat:
        if c.get('gif_slug'):
            out.setdefault(c['gif_slug'], []).append(c['codice'])
    return out


def passo_slug_riga(zona, piano, solo=None, prova=False):
    """Aggiorna lo slug di UNA riga, se nessun codice punta A QUELLA RIGA.

    `passo_slug` fa la stessa domanda alla zona intera e ha ragione a farlo: se
    un codice qualsiasi punta alla zona, aggiornare gli slug in blocco lo
    lascerebbe orfano, e la catena gif_slug -> slug va protetta con le righe
    doppie. Quella guardia non si tocca ed e' giusta per l'uso di zona.

    Ma «la zona ha codici» e «questa riga ha codici» non sono la stessa domanda.
    Su Pettorali 57 codici puntano alla zona, e le 2 righe del gruppo D — GIF
    indicizzate che nessun esercizio usa — non ne hanno nessuno. Per loro non
    esiste catena da proteggere, quindi non servono ne' righe doppie ne' sync:
    e' l'eccezione «zona senza codici» applicata alla singola riga, che CLAUDE.md
    gia' prevede ma che nessuno strumento sapeva eseguire.

    Una riga alla volta, e la verifica si rifa' VIVA a ogni chiamata: il piano
    dice chi non aveva codici quando e' stato scritto, non chi non ne ha adesso.
    """
    if not solo:
        sys.exit('serve --solo=<slug, nome o percorso> — questa operazione'
                 ' aggiorna una riga alla volta, di proposito')

    cand = [r for r in piano['righe'] if r['slug_cambia']
            and solo in (r['slug_attuale'], r['slug_nuovo'], r['nome_finale'],
                         r['storage_path_dest'])]
    if len(cand) != 1:
        sys.exit('"%s" corrisponde a %d righe con lo slug che cambia: serve'
                 ' esattamente una' % (solo, len(cand)))
    r = cand[0]

    bib, e = leggi_tutto('biblioteca_gif', 'slug,nome_italiano,storage_path', 'slug')
    if e:
        sys.exit(e)
    per_slug = {b['slug']: b for b in bib}
    punt = _codici_per_slug()

    riga = per_slug.get(r['slug_attuale'])
    print('== SLUG DI UNA RIGA ==')
    print('  nome        : %s' % r['nome_finale'])
    print('  slug        : %s -> %s' % (r['slug_attuale'], r['slug_nuovo']))
    print('  storage_path: %s' % (riga or {}).get('storage_path', '—'))

    if not riga:
        sys.exit('  FERMO: nessuna riga con slug "%s"' % r['slug_attuale'])
    if not nfc(riga.get('storage_path') or '').startswith(zona + '/'):
        sys.exit('  FERMO: la riga non appartiene alla zona "%s"' % zona)
    if r['slug_nuovo'] in per_slug:
        sys.exit('  FERMO: lo slug "%s" e gia occupato' % r['slug_nuovo'])

    # LA guardia: per riga, non per zona, e riletta viva.
    codici = punt.get(r['slug_attuale'], [])
    print('  codici che puntano a QUESTA riga: %s' % (codici or 'nessuno'))
    if codici:
        sys.exit('  FERMO: %d codici puntano a questa riga. Lo slug non si tocca'
                 ' in place:\n         serve l ordine a righe doppie (passo 2 ->'
                 ' sync del Sheet -> passo 4 -> passo 5).' % len(codici))

    if prova:
        print('\n  PROVA: nessuna scrittura. Aggiornerei slug e nome_italiano.')
        return

    _, err = api('PATCH', '/rest/v1/biblioteca_gif?slug=eq.%s'
                 % urllib.parse.quote(r['slug_attuale']),
                 {'slug': r['slug_nuovo'], 'nome_italiano': r['nome_finale']})
    if err:
        sys.exit('  ERRORE: %s' % err)
    print('\n  aggiornata.')
    log(zona, 'slug_riga_%s.json' % fslug(r['slug_nuovo']),
        {'da': r['slug_attuale'], 'a': r['slug_nuovo'],
         'nome': r['nome_finale'], 'codici_al_momento': codici})


def passo_slug(zona, piano):
    """Aggiorna slug e nome_italiano in place. Solo per zone senza codici.

    Guardia di ZONA, e resta tale: per aggiornare lo slug di una riga sola in una
    zona che invece dei codici ce li ha, esiste `slug-riga`, che pone la stessa
    domanda alla singola riga.
    """
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
def _carica_nuova(zona, r, p480, stato):
    """Carica il file RIDOTTO e inserisce la riga. Verifica l'impronta dopo.

    Prima del 16 agosto qui si spediva il file del Mac cosi' com'era: piena
    risoluzione, nessun cache-control, `Content-Type: image/gif` scritto fisso.
    Per una zona che entra da zero — Mobilita' sono 214 file — significava
    riempire il bucket esattamente di cio' che la regola dei 480px vieta.
    """
    ok, nota = scrivi_oggetto(p480, r['storage_path_dest'], stato)
    if not ok:
        return 'errore', nota
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
    p480 = piano_480(zona)
    stato, err = stato_bucket(zona)
    if err:
        sys.exit('elenco del bucket fallito: %s' % err)
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
        esito, det = _carica_nuova(zona, r, p480, stato)
        esiti.append({'slug': r['slug_nuovo'], 'esito': esito, 'dettaglio': det})
        if esito != 'inserita':
            print('  ERRORE %s: %s' % (r['slug_nuovo'], det))
    print('  esiti: %s' % dict(collections.Counter(x['esito'] for x in esiti)))
    log(zona, 'passo%d.json' % n, esiti)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    Z, P = sys.argv[1], sys.argv[2]
    # `--solo <percorso o nome>` restringe il passo 1 a una riga. Non e' una
    # scorciatoia: e' il modo di collaudare il giro completo su un file solo
    # prima di lanciarlo sugli altri.
    SOLO, PROVA = None, False
    for a in sys.argv[3:]:
        if a.startswith('--solo='):
            SOLO = a.split('=', 1)[1]
        elif a == '--prova':
            PROVA = True
    pia = carica(Z)
    # L'indice delle impronte si carica una volta sola, prima del passo: e' cio' che
    # permette alle verifiche di rispondere senza scaricare.
    indice_locale()
    cache_impronte()
    try:
        if P == '1':
            passo1(Z, pia, solo=SOLO)
        elif P == 'slug-riga':
            passo_slug_riga(Z, pia, solo=SOLO, prova=PROVA)
        else:
            {'backup': passo_backup, 'prova': passo_prova, '2': passo2,
             'slug': passo_slug, '4': passo4, '5': passo5, '6': passo6,
             '7': passo7}[P](Z, pia)
    finally:
        stampa_consumo('migra_zona passo %s' % P)
