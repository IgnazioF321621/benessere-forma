#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Passo di preparazione — costruisce il file di lavoro di una cartella.

SOLA LETTURA. Non rinomina, non sposta, non scrive su Supabase/Storage/Sheet.
Legge:
  - i file .gif reali della cartella (nomi NFC, SHA-256, dimensione)
  - gli oggetti del bucket nella cartella della zona, con la loro impronta SHA-256
  - biblioteca_gif  (live; ripiego sull'export CSV)
  - esercizi_catalog (live via PostgREST; ripiego su una copia locale)
  - il cantiere 96 righe pendente, se presente, per non liberare nomi gia' impegnati

L'aggancio file -> riga -> codice si fa per IMPRONTA SHA-256, mai per nome file.
Nel bucket i nomi sono gia' normalizzati da cantieri precedenti mentre sul Mac sono
ancora quelli originali: confrontare i nomi dichiarava "libere" GIF vive nell'app
(58 file su 75 in "Bicipiti e Braccia"). Il nome non entra piu' nella classificazione.

Scrive un solo file: lavoro/<zona>.json

Le impronte del bucket arrivano dai file gemelli sul Mac, non da un download:
l'`eTag` che Storage dichiara nell'elenco e' l'MD5 del contenuto, e per 647 oggetti
su 647 quel contenuto e' gia' sul disco. Con `--scarica` si riaprono i download per
gli oggetti che sul Mac non hanno gemello; senza, quegli oggetti restano
"non determinabili" e la zona resta INDETERMINATA, che e' la risposta prudente [L10].

Uso:  python3 prepara.py "Addominali e Core" [--bib percorso.csv] [--scarica]
"""
import argparse
import collections
import csv
import hashlib
import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import impronte_zona, stampa_consumo  # noqa: E402
from impronte import leggi_tutto as leggi_tutto_supa  # noqa: E402
from nomenclatura import nfc, proponi, slug  # noqa: E402

BASE = Path(__file__).parent
GIF_ROOT = Path(os.environ.get('BIBLIOTECA_ROOT',
                              '/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi'))
LAVORO = BASE / 'lavoro'
SUPA_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co/rest/v1/'
SUPA_KEY = 'sb_publishable_cuyDYC3WzaNGqGRs_J-JnQ_7kZ2B4to'


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for blk in iter(lambda: fh.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


def leggi_catalogo(copia_locale):
    """esercizi_catalog live, paginato. PostgREST tronca al limite default."""
    out, off, page = [], 0, 1000
    try:
        while True:
            url = ('%sesercizi_catalog?select=codice,nome,gruppo_target,gif_slug'
                   '&order=codice&offset=%d&limit=%d' % (SUPA_URL, off, page))
            req = urllib.request.Request(url, headers={'apikey': SUPA_KEY,
                                                       'Authorization': 'Bearer ' + SUPA_KEY})
            d = json.load(urllib.request.urlopen(req, timeout=60))
            out += d
            if len(d) < page:
                break
            off += page
        print('  esercizi_catalog: %d righe (live)' % len(out))
        return out, 'live'
    except Exception as e:
        print('  esercizi_catalog live non raggiungibile (%s)' % e)
        if copia_locale and Path(copia_locale).exists():
            out = json.load(open(copia_locale))
            print('  esercizi_catalog: %d righe (copia locale %s)' % (len(out), copia_locale))
            return out, 'copia locale'
        sys.exit('  nessuna fonte per esercizi_catalog: mi fermo')


def leggi_cantiere_pendente():
    """Il cantiere 96 righe non ancora sincronizzato sullo Sheet.

    I suoi file sono gia' impegnati: non vanno trattati come liberi.

    Chiave = SHA-256, non il nome file. Il cantiere dei nomi RINOMINA i file:
    con la chiave sul nome, appena un file veniva rinominato la riga smetteva di
    risultare impegnata e il suo nome tornava disponibile. Misurato prima della
    conversione: 44 righe su 96 avevano gia' perso lo stato.

    Restituisce due mappe, sha -> (codice, nome) e nome -> (codice, nome).
    La seconda e' solo un ripiego per eventuali righe senza impronta: la chiave
    portante e' la prima.
    """
    cens = BASE / 'cantiere_96_pendente.tsv'
    if not cens.exists():
        return {}, {}
    per_sha, per_nome = {}, {}
    with open(cens, encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh, delimiter='\t'):
            # il codice vero e' quello ricavato dall'impronta; quello scritto a mano
            # nel registro e' risultato sfasato su 22 righe su 96
            codice = (r.get('codice_reale') or r.get('codice_registro')
                      or r.get('codice') or '')
            voce = (codice, r.get('nome_in_decisioni', ''))
            if r.get('sha256'):
                per_sha[r['sha256']] = voce
            if r.get('nome_file_mac'):
                per_nome[nfc(r['nome_file_mac'])] = voce
    return per_sha, per_nome


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    ap.add_argument('--bib', default=str(Path.home() / 'Downloads' / 'Biblioteca GIF Rows.csv'))
    ap.add_argument('--catalogo-copia', default=str(BASE / 'lavoro' / '_catalogo.json'))
    ap.add_argument('--scarica', action='store_true',
                    help='consenti il download degli oggetti senza gemello sul Mac')
    args = ap.parse_args()

    cartella = GIF_ROOT / args.zona
    if not cartella.is_dir():
        sys.exit('cartella inesistente: %s' % cartella)
    LAVORO.mkdir(exist_ok=True)

    print('Preparazione "%s"' % args.zona)

    # --- biblioteca_gif ---------------------------------------------------
    # Live per prima scelta: l'export sul disco invecchia a ogni migrazione, e una
    # riga il cui storage_path e' cambiato non si riconoscerebbe piu'.
    bib, err = leggi_tutto_supa('biblioteca_gif',
                                'slug,nome_italiano,categoria,storage_path', 'slug')
    if err:
        print('  biblioteca_gif live non raggiungibile (%s)' % err)
        if not Path(args.bib).exists():
            sys.exit('  e manca anche l\'export: %s' % args.bib)
        with open(args.bib, encoding='utf-8-sig', newline='') as fh:
            bib = list(csv.DictReader(fh))
        fonte_bib = 'export ' + os.path.basename(args.bib)
        print('  biblioteca_gif: %d righe (export, potenzialmente vecchio)' % len(bib))
    else:
        fonte_bib = 'live'
        print('  biblioteca_gif: %d righe (live)' % len(bib))

    catalogo, fonte_cat = leggi_catalogo(args.catalogo_copia)
    json.dump(catalogo, open(args.catalogo_copia, 'w'), ensure_ascii=False)

    pendente, pendente_per_nome = leggi_cantiere_pendente()
    if pendente or pendente_per_nome:
        print('  cantiere 96 pendente: %d file impegnati (chiave SHA-256)' % len(pendente))

    # indice slug -> codici (guardia "1 codice per slug")
    per_slug = collections.defaultdict(list)
    for c in catalogo:
        if c.get('gif_slug'):
            per_slug[c['gif_slug']].append(c)

    # indice storage_path -> righe biblioteca_gif
    per_path = collections.defaultdict(list)
    for b in bib:
        sp = nfc(b.get('storage_path'))
        if sp:
            per_path[sp].append(b)

    # --- impronte del bucket ----------------------------------------------
    # Questo e' l'aggancio: SHA-256 dell'oggetto nel bucket contro SHA-256 del file
    # sul Mac. Il nome dei due lati non c'entra e non deve entrarci.
    per_sha_bucket, falliti, err_bucket = impronte_zona(
        args.zona, LAVORO / '_impronte' / (slug(args.zona) + '.json'),
        consenti_download=args.scarica)
    if err_bucket:
        print('  ATTENZIONE: bucket non raggiungibile (%s)' % err_bucket)
        print('  senza impronte l\'aggancio NON e\' determinabile: nessuna riga sara'
              ' dichiarata libera.')
    if falliti:
        print('  ATTENZIONE: %d oggetti del bucket senza impronta calcolabile'
              % len(falliti))
        for f in falliti[:10]:
            print('     %s — %s' % (f['storage_path'], f['errore']))
        if not args.scarica:
            print('     (rilanciare con --scarica per risolverli scaricandoli)')

    # Se anche una sola impronta manca, "non ho trovato riscontro" non equivale piu' a
    # "non c'e' riscontro": il file potrebbe corrispondere proprio all'oggetto mancante.
    incerto = bool(err_bucket) or bool(falliti)

    # --- i file reali sul disco -------------------------------------------
    files = sorted((nfc(f) for f in os.listdir(cartella) if f.lower().endswith('.gif')),
                   key=str.lower)
    print('  file .gif sul disco: %d' % len(files))

    righe = []
    for i, f in enumerate(files):
        p = cartella / f
        sha = sha256(p)
        paths = per_sha_bucket.get(sha, [])
        hits = [r for sp in paths for r in per_path.get(sp, [])]
        codici = []
        visti = set()
        for h in hits:
            for c in per_slug.get(h['slug'], []):
                if c['codice'] not in visti:
                    visti.add(c['codice'])
                    codici.append(c)

        if codici:
            stato = 'collegato'          # GIF viva nell'app -> slug SOLO registrato
        elif sha in pendente or nfc(f) in pendente_per_nome:
            stato = 'pendente'           # impegnato dal cantiere 96 non sincronizzato
        elif hits:
            stato = 'indicizzato'        # riga in biblioteca_gif ma nessun codice
        elif paths:
            stato = 'indicizzato'        # nel bucket ma senza riga: comunque non libero
        elif incerto:
            stato = 'indeterminato'      # impronte incomplete: non si puo' dire "libero"
        else:
            stato = 'libero'

        # Da dove parte la proposta, in ordine di autorevolezza:
        #  - cantiere pendente: il nome lo ha gia' scelto Ignazio guardando la GIF
        #  - collegato: il nome a catalogo e' gia' passato per il cantiere v2
        #  - resto: si deduce dal nome file, che e' la fonte piu' debole
        dedotto = proponi(os.path.splitext(f)[0])
        if stato == 'pendente':
            voce = pendente.get(sha) or pendente_per_nome.get(nfc(f))
            nome_prop, origine = voce[1], 'cantiere 96'
        elif codici and codici[0].get('nome'):
            nome_prop, origine = codici[0]['nome'], 'catalogo'
        else:
            nome_prop, origine = dedotto, 'nome file'

        righe.append({
            'i': i,
            'file': f,
            'cartella': args.zona,
            'sha256': sha,
            'bytes': p.stat().st_size,
            'stato_binario': stato,
            'codici': [{'codice': c['codice'], 'nome': c['nome'],
                        'gif_slug': c.get('gif_slug')} for c in codici],
            'storage_paths': paths,
            'slug_indice': [h['slug'] for h in hits],
            'condiviso': max([len(per_slug.get(h['slug'], [])) for h in hits], default=0) > 1,
            'cantiere': list(pendente.get(sha) or pendente_per_nome.get(nfc(f)) or ()) or None,
            'nome_proposto': nome_prop,
            'origine_proposta': origine,
            'nome_dedotto': dedotto,
            'slug_proposto': slug(nome_prop),
        })

    # doppioni di contenuto dentro la cartella (guardia 3)
    per_hash = collections.defaultdict(list)
    for r in righe:
        per_hash[r['sha256']].append(r['file'])
    for r in righe:
        gemelli = [x for x in per_hash[r['sha256']] if x != r['file']]
        r['stesso_contenuto_di'] = gemelli

    dati = {
        'zona': args.zona,
        'generato': __import__('datetime').datetime.now().isoformat(timespec='seconds'),
        'fonte_catalogo': fonte_cat,
        'fonte_biblioteca_gif': fonte_bib,
        'aggancio': 'sha256',
        'bucket_errore': err_bucket,
        'bucket_impronte_fallite': falliti,
        'righe': righe,
    }
    dest = LAVORO / (slug(args.zona) + '.json')
    dest.write_text(json.dumps(dati, ensure_ascii=False, indent=1), encoding='utf-8')

    c = collections.Counter(r['stato_binario'] for r in righe)
    print('\n  doppio binario:')
    print('    collegato   %3d  -> slug solo registrato, nessuna applicazione' % c['collegato'])
    print('    pendente    %3d  -> impegnato dal cantiere 96, slug solo registrato' % c['pendente'])
    print('    indicizzato %3d  -> rinomina e slug liberi' % c['indicizzato'])
    print('    libero      %3d  -> rinomina e slug liberi' % c['libero'])
    if c['indeterminato']:
        print('    INDETERMINATO %3d  -> impronte del bucket incomplete: da NON trattare'
              % c['indeterminato'])
    gt = {c2['codice']: c2.get('gruppo_target') for c2 in catalogo}
    print('    gruppo_target dei collegati: %s'
          % dict(collections.Counter(gt.get(cc['codice']) for r in righe
                                     for cc in r['codici'])))
    cond = [r['file'] for r in righe if r['condiviso']]
    print('    slug condiviso da piu codici: %s' % (', '.join(cond) if cond else 'nessuno'))
    dop = sorted({tuple(sorted([r['file']] + r['stesso_contenuto_di']))
                  for r in righe if r['stesso_contenuto_di']})
    print('    doppioni di contenuto (SHA-256): %s' % (dop if dop else 'nessuno'))
    print('\n  scritto: %s' % dest)
    stampa_consumo('prepara "%s"' % args.zona)


if __name__ == '__main__':
    main()
