#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Carica nel bucket una zona ricompressa, con l'header cache-control. Egress zero.

    python3 tools/biblioteca-nomi/carica_480.py "Polpacci" --prova   # non scrive
    python3 tools/biblioteca-nomi/carica_480.py "Polpacci"

Legge il piano scritto da ricomprimi.py. Caricare NON consuma egress: il traffico
si paga in uscita, non in entrata. L'unico costo sono le intestazioni delle HEAD
di verifica, qualche centinaio di byte l'una, e il contatore lo dimostra a fine giro.

------------------------------------------------------------------------------
PERCHE' NON SERVONO LE RIGHE DOPPIE
------------------------------------------------------------------------------
L'ordine a righe doppie di CLAUDE.md protegge la catena quando cambia uno SLUG:
`esercizi_catalog.gif_slug` -> `biblioteca_gif.slug` -> `storage_path` -> file.
Qui non cambia nessuno dei tre. Cambiano solo i BYTE all'indirizzo di sempre e
un'intestazione: `biblioteca_gif` non si tocca, il Sheet non si tocca, non esiste
finestra di disallineamento fra due fonti da coprire.

Quello che va garantito e' un'altra cosa — che non esista un istante in cui la
GIF e' irraggiungibile — e qui lo garantisce il caricamento stesso: e' una
sostituzione, non una cancellazione seguita da una scrittura. Se fallisce, quello
che c'era resta dov'era.

------------------------------------------------------------------------------
IL BACKUP
------------------------------------------------------------------------------
E' la biblioteca sul Mac, e il piano lo dimostra riga per riga: per ogni oggetto
registra md5, sha256 e dimensione di CIO' CHE STA NEL BUCKET ORA, e il file locale
da cui quei byte provengono. Prima di scrivere si ricontrolla oggetto per oggetto
che il bucket sia ancora in quello stato (HEAD, zero byte di contenuto): se anche
uno solo e' cambiato da quando il piano e' stato fatto, ci si ferma senza scrivere.

Un oggetto senza gemello sul Mac non e' ripristinabile e quindi non viene toccato:
ricomprimi.py lo ha gia' escluso dal piano.

Se la verifica dopo il caricamento non torna, il file originale viene rimesso
subito dal Mac e il giro si ferma.
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))
import impronte as I                                    # noqa: E402

PIANI = BASE / 'lavoro' / '_480'
CACHE_NUOVA = I.CACHE_IMMUTABILE
ESITI = BASE / 'lavoro' / '_esiti_480'


def _url(storage_path):
    return '%s/storage/v1/object/%s/%s' % (
        I.U, I.BUCKET, urllib.parse.quote(storage_path))


# Lo scrittore e' uno solo e vive in impronte.py: e' cio' che impedisce a un
# secondo strumento di rimettere byte nel bucket senza cache-control o con un
# mimetype scritto fisso. Qui si riesporta con il nome di prima, perche' la
# firma e' cambiata (il content_type e' diventato obbligatorio) e i chiamanti
# devono accorgersene passando da qui.
carica_bytes = I.carica_bytes


def stato_zona(zona):
    """storage_path -> (etag, byte, cacheControl) per tutta la zona. (dato, errore).

    Adattatore sulla forma a tupla usata qui e da ripara_cache.py; la lettura
    vera e' I.stato_bucket, che e' anche l'unico posto in cui il cache-control
    si vede davvero: la HEAD autenticata risponde SEMPRE `no-cache` qualunque
    cosa sia memorizzata, e verificare li' fa sembrare fallito un caricamento
    perfettamente riuscito [L29].
    """
    d, err = I.stato_bucket(zona)
    if err:
        return None, err
    return {sp: (v['etag'], v['byte'], v['cache']) for sp, v in d.items()}, None


def mimetype_zona(zona):
    """storage_path -> mimetype gia' registrato. Si rimanda uguale al caricamento [L33]."""
    d, err = I.stato_bucket(zona)
    if err:
        return {}, err
    return {sp: v['mimetype'] for sp, v in d.items()}, None


def verifica_pubblico(storage_url):
    """Il cache-control servito davvero all'app. Costa 1 byte, contato."""
    req = urllib.request.Request(storage_url, headers={'Range': 'bytes=0-0'})
    try:
        r = urllib.request.urlopen(req, timeout=60)
        I.conta_download(len(r.read()))
        return r.headers.get('cache-control'), None
    except Exception as e:
        return None, str(e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    ap.add_argument('--prova', action='store_true',
                    help='controlla tutto e non scrive niente')
    args = ap.parse_args()

    piano_p = PIANI / ('%s.json' % args.zona.lower().replace(' ', '-'))
    if not piano_p.exists():
        sys.exit('manca il piano: %s\nlancia prima ricomprimi.py "%s"'
                 % (piano_p, args.zona))
    piano = json.loads(piano_p.read_text(encoding='utf-8'))
    voci = piano['voci']
    print('zona "%s": %d oggetti nel piano (generato %s)\n'
          % (piano['zona'], len(voci), piano['generato']))

    # ---------------------------------------------------------- 1. pre-volo
    # Il bucket e' ancora nello stato in cui il piano l'ha trovato? Se no, il
    # piano parla di byte che non ci sono piu' e non si scrive niente.
    print('1. controllo che il bucket sia come il piano lo ha lasciato...')
    stato, err = stato_zona(piano['zona'])
    if err:
        sys.exit('elenco del bucket fallito: %s' % err)
    guasti = []
    gia_fatti = []
    for v in voci:
        s = stato.get(v['storage_path'])
        if not s:
            guasti.append((v['storage_path'], 'non e piu nel bucket'))
            continue
        etag, dim, cc = s
        # "Gia' fatto" vuol dire due cose insieme: i byte giusti E l'intestazione
        # giusta. Sui 371 oggetti gia' sotto i 480px i byte non cambiano affatto —
        # guardare solo quelli li farebbe passare per fatti, e resterebbero con
        # il `no-cache` che questo giro esiste proprio per togliere.
        if etag == v['md5_nuovo'] and dim == v['byte_nuovo'] and cc == CACHE_NUOVA:
            gia_fatti.append(v['storage_path'])       # giro gia' fatto: idempotente
            continue
        if etag != v['md5_bucket'] or dim != v['byte_bucket']:
            guasti.append((v['storage_path'],
                           'atteso %s/%d, trovato %s/%s'
                           % (v['md5_bucket'][:10], v['byte_bucket'],
                              (etag or '?')[:10], dim)))
    if guasti:
        print('\n   MI FERMO: %d oggetti non sono come il piano li descrive.' % len(guasti))
        for sp, d in guasti[:10]:
            print('     %s — %s' % (sp, d))
        print('\n   Niente e stato scritto. Rilancia ricomprimi.py per rifare il piano.')
        I.stampa_consumo()
        sys.exit(1)
    print('   tutti e %d a posto%s' % (len(voci),
          ' (%d gia caricati in un giro precedente)' % len(gia_fatti) if gia_fatti else ''))

    # verifica che il ripristino sia possibile: il file sorgente deve esserci
    mancanti = [v['storage_path'] for v in voci if not Path(v['file_480']).exists()
                or not Path(v['origine_mac']).exists()]
    if mancanti:
        print('\n   MI FERMO: mancano file sul Mac (%d), il ripristino non sarebbe'
              ' possibile:' % len(mancanti))
        for m in mancanti[:10]:
            print('     %s' % m)
        sys.exit(1)
    print('2. backup: ogni oggetto ha il suo originale sul Mac, ripristinabile.')

    if args.prova:
        da_fare = [v for v in voci if v['storage_path'] not in gia_fatti]
        print('\nPROVA: caricherei %d oggetti (%.1f MB), ne lascerei %d gia a posto.'
              % (len(da_fare), sum(v['byte_nuovo'] for v in da_fare) / 1048576,
                 len(gia_fatti)))
        print('       cache-control: %s' % CACHE_NUOVA)
        I.stampa_consumo()
        return

    # ------------------------------------------------------- 3. caricamento
    da_fare = [v for v in voci if v['storage_path'] not in gia_fatti]
    mime, err = mimetype_zona(piano['zona'])
    if err:
        sys.exit('lettura dei mimetype fallita: %s' % err)
    diversi = {sp: m for sp, m in mime.items() if m and m != 'image/gif'}
    if diversi:
        print('   %d oggetti non sono dichiarati image/gif: il tipo si rimanda'
              ' uguale, non si corregge.' % len(diversi))
        for sp, m in sorted(diversi.items()):
            print('     %-52.52s %s' % (sp.split('/')[-1], m))

    print('3. carico %d oggetti...' % len(da_fare))
    esiti = {v['storage_path']: {'storage_path': v['storage_path'],
                                 'esito': 'gia fatto'} for v in voci}
    t0 = time.time()
    falliti_subito = 0
    for i, v in enumerate(da_fare, 1):
        err = carica_bytes(v['storage_path'], Path(v['file_480']).read_bytes(),
                           mime.get(v['storage_path']) or 'image/gif',
                           CACHE_NUOVA)
        if err:
            # Un caricamento fallito non lascia un buco: quello che c'era prima
            # e' ancora li'. Si annota e si tira dritto; la verifica dira' come sta.
            esiti[v['storage_path']] = {'storage_path': v['storage_path'],
                                        'esito': 'errore', 'dettaglio': err}
            falliti_subito += 1
            print('   ERRORE %-44.44s %s' % (v['storage_path'].split('/')[-1], err))
        if i % 10 == 0 or i == len(da_fare):
            print('   %d/%d' % (i, len(da_fare)))

    # ------------------------------------------------------- 4. verifica vera
    # Un solo elenco per tutta la zona: da' impronta, dimensione e cache-control
    # insieme, ed e' l'unico posto in cui il cache-control si legge per davvero.
    print('\n4. verifica: rileggo lo stato della zona dal bucket...')
    stato2, err = stato_zona(piano['zona'])
    if err:
        sys.exit('rilettura fallita: %s — controlla a mano prima di proseguire' % err)

    caricati = ripristinati = 0
    for v in voci:
        sp = v['storage_path']
        if esiti[sp]['esito'] == 'errore':
            continue
        s = stato2.get(sp)
        etag, dim, cc = s if s else (None, None, None)
        if etag == v['md5_nuovo'] and dim == v['byte_nuovo'] and cc == CACHE_NUOVA:
            if sp not in gia_fatti:          # gia' a posto da prima: non e' un caricamento di oggi
                caricati += 1
            esiti[sp] = {'storage_path': sp, 'esito': 'fatto',
                         'byte_prima': v['byte_bucket'], 'byte_dopo': v['byte_nuovo'],
                         'cache_control': cc}
            continue
        # Non e' quello che doveva essere: rimetto l'originale dal Mac.
        print('   NON CORRISPONDE %-40.40s atteso %s/%d, trovato %s/%s cc=%r'
              % (sp.split('/')[-1], v['md5_nuovo'][:10], v['byte_nuovo'],
                 (etag or '?')[:10], dim, cc))
        e2 = carica_bytes(sp, Path(v['origine_mac']).read_bytes(),
                          mime.get(sp) or 'image/gif', 'no-cache')
        ripristinati += 1
        esiti[sp] = {'storage_path': sp, 'esito': 'ripristinato',
                     'dettaglio': 'verifica fallita; ripristino: %s' % (e2 or 'riuscito')}

    # Controllo a campione su cio' che l'app chiede davvero: l'URL pubblico.
    # metadata.cacheControl dice cosa e' memorizzato, questo cosa viene servito.
    campione = [v for v in voci if esiti[v['storage_path']]['esito'] == 'fatto'][:3]
    if campione:
        print('\n5. controllo sull URL pubblico (1 byte a oggetto):')
        righe, e = I.leggi_tutto('biblioteca_gif', 'storage_path,storage_url',
                                 'storage_path')
        per_path = {r['storage_path']: r.get('storage_url') for r in (righe or [])}
        for v in campione:
            u = per_path.get(v['storage_path'])
            if not u:
                continue
            cc, e = verifica_pubblico(u)
            segno = 'ok' if cc == CACHE_NUOVA else 'DIVERSO'
            print('   %-46.46s %s %r' % (v['storage_path'].split('/')[-1], segno,
                                         cc or e))

    # ------------------------------------------------------------ 6. esito
    esiti = list(esiti.values())
    fatti = [e for e in esiti if e['esito'] == 'fatto']
    risp = sum(e['byte_prima'] - e['byte_dopo'] for e in fatti)
    print('\n%d caricati adesso, %d gia a posto da prima, %d ripristinati, %d errori'
          ' — in %.0fs'
          % (caricati, len(gia_fatti), ripristinati,
             sum(1 for e in esiti if e['esito'] == 'errore'), time.time() - t0))
    print('%d oggetti su %d verificati: byte giusti e cache-control giusto.'
          % (len(fatti), len(voci)))
    if fatti:
        print('la zona pesa %.1f MB in meno di prima del cantiere.' % (risp / 1048576))

    ESITI.mkdir(parents=True, exist_ok=True)
    fp = ESITI / ('%s_%s.json' % (args.zona.lower().replace(' ', '-'),
                                  time.strftime('%Y%m%dT%H%M%S')))
    fp.write_text(json.dumps({'zona': args.zona, 'cache_control': CACHE_NUOVA,
                              'esiti': esiti}, ensure_ascii=False, indent=1),
                  encoding='utf-8')
    print('esiti: %s' % fp)
    I.stampa_consumo('caricamento: il traffico si paga in uscita, non in entrata')


if __name__ == '__main__':
    main()
