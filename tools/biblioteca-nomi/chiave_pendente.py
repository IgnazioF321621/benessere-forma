#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Porta cantiere_96_pendente.tsv dalla chiave "nome file" alla chiave SHA-256.

PROVA A VUOTO di default: senza --applica non scrive niente.
Con --applica scrive il TSV nuovo, dopo aver salvato una copia del vecchio.

Perche' serve
-------------
Il registro indicizza le righe per `nome_file_mac`. Ma il cantiere dei nomi
RINOMINA i file: appena un file cambia nome, la chiave non corrisponde piu' e
prepara.py smette di vedere quella riga come "pendente" — cioe' la tratta come
libera e ne libera il nome, che invece e' impegnato.

Misurato il 7 agosto, prima della conversione: **44 righe su 96 avevano gia' perso
lo stato**, il 46%. Su una zona grande come Mobilita' (215 file) lo stesso difetto
costerebbe la ri-conferma di decine di righe.

L'impronta SHA-256 non cambia quando il file viene rinominato: e' l'unica chiave
che sopravvive al cantiere. Il codice per calcolarla c'era gia' in impronte.py.

Come ritrova i file gia' rinominati
-----------------------------------
Tre tentativi, in ordine di costo crescente:
  1. nome originale in `nome_file_mac`
  2. `nome_in_decisioni` + .gif — il nome che il cantiere gli ha dato
  3. la catena: codice -> gif_slug -> biblioteca_gif.storage_path -> oggetto nel
     bucket -> impronta, e poi si cerca quell'impronta fra i file sul Mac

Nessuna riga viene persa: quelle irrisolte restano nel TSV senza impronta, con il
motivo scritto accanto. Sparire in silenzio sarebbe il difetto che si sta chiudendo.

Uso:  python3 chiave_pendente.py            prova a vuoto
      python3 chiave_pendente.py --applica  scrive, con backup
"""
import argparse
import collections
import csv
import datetime
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import impronte_zona, leggi_tutto, nfc, sha_file  # noqa: E402
from nomenclatura import slug as fslug  # noqa: E402

BASE = Path(__file__).parent
GIF_ROOT = Path(os.environ.get('BIBLIOTECA_ROOT',
                               '/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi'))
TSV = BASE / 'cantiere_96_pendente.tsv'
BACKUP = BASE / 'backup'

COL_NUOVE = ['sha256', 'codice_reale', 'codice_registro', 'codici_concordano',
             'nome_file_mac', 'cartella_mac', 'nome_in_decisioni', 'nome_catalogo',
             'stato', 'impronta_da', 'nota']


def leggi(path):
    with open(path, encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh, delimiter='\t'))


def scrivi(path, colonne, righe):
    """TSV con intestazione, UTF-8 con BOM e CRLF: stesso formato degli altri registri."""
    with open(path, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, delimiter='\t', lineterminator='\r\n')
        w.writerow(colonne)
        for r in righe:
            w.writerow([str(r.get(c, '')).replace('\t', ' ').replace('\n', ' ')
                        for c in colonne])


def impronte_mac(cartelle):
    """sha -> [percorsi] di tutti i .gif nelle cartelle indicate. Lettura locale."""
    per_sha = collections.defaultdict(list)
    for c in sorted(cartelle):
        d = GIF_ROOT / c
        if not d.is_dir():
            print('   cartella assente sul Mac: %s' % c)
            continue
        for f in os.listdir(d):
            if f.lower().endswith('.gif'):
                per_sha[sha_file(d / nfc(f))].append('%s/%s' % (c, nfc(f)))
    return per_sha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--applica', action='store_true',
                    help='scrive davvero il TSV nuovo (con backup del vecchio)')
    args = ap.parse_args()

    if not TSV.exists():
        sys.exit('manca %s' % TSV)
    righe = leggi(TSV)
    print('Conversione del registro pendente alla chiave SHA-256')
    print('  righe nel registro: %d\n' % len(righe))

    # --- lo stato reale di ogni codice ------------------------------------
    cat, err = leggi_tutto('esercizi_catalog', 'codice,nome,gif_slug', 'codice')
    if err:
        sys.exit('esercizi_catalog: %s' % err)
    per_cod = {c['codice']: c for c in cat}

    bib, err = leggi_tutto('biblioteca_gif', 'slug,storage_path', 'slug')
    if err:
        sys.exit('biblioteca_gif: %s' % err)
    per_slug = {}
    for b in bib:
        per_slug.setdefault(b['slug'], b)

    # --- impronte dei file sul Mac ----------------------------------------
    cartelle = sorted({r['cartella_mac'] for r in righe if r.get('cartella_mac')})
    print('  calcolo le impronte dei file sul Mac in %d cartelle…' % len(cartelle))
    mac = impronte_mac(cartelle)
    print('  %d impronte distinte sul Mac\n' % len(mac))

    # --- impronte del bucket, solo per le zone che servono ----------------
    bucket_cache = {}

    def carica_zona(zona):
        if zona not in bucket_cache:
            per_sha, falliti, e = impronte_zona(
                zona, BASE / 'lavoro' / '_impronte' / (fslug(zona) + '.json'), verbose=False)
            if e:
                print('   bucket "%s" non leggibile: %s' % (zona, e))
                bucket_cache[zona] = {}
            else:
                bucket_cache[zona] = {p: s for s, ps in per_sha.items() for p in ps}
        return bucket_cache[zona]

    def sha_da_bucket(storage_path):
        """Impronta dell'oggetto del bucket, riusando la cache per zona."""
        return carica_zona(storage_path.split('/')[0]).get(nfc(storage_path))

    # --- impronta -> codice, ricavata dalla catena autorevole -------------
    # E' la direzione giusta: file -> riga -> codice, per SHA-256.
    # La colonna `codice` del registro NON e' affidabile — misurato: su 96 righe
    # solo 24 concordano col catalogo, 21 sono spostate di una o piu' posizioni
    # (un TSV incollato disallineato, la stessa cosa che costo' tre giri di sync
    # su EX015). Qui il codice si RICAVA, non si crede.
    print('  ricavo il codice dall\'impronta (catena file -> riga -> codice)…')
    zone_bib = {(b.get('storage_path') or '').split('/')[0]
                for b in bib if b.get('storage_path')}
    per_slug_cod = {}
    for c in cat:
        if (c.get('gif_slug') or '').strip():
            per_slug_cod.setdefault(c['gif_slug'], c)
    sha_a_codice = {}
    for z in sorted(z for z in zone_bib if z):
        mappa = carica_zona(z)
        for b in bib:
            sp = nfc(b.get('storage_path') or '')
            if not sp.startswith(z + '/'):
                continue
            s = mappa.get(sp)
            c = per_slug_cod.get(b['slug'])
            if s and c:
                sha_a_codice.setdefault(s, c)
    print('  %d impronte agganciate a un codice\n' % len(sha_a_codice))

    # --- risoluzione riga per riga ----------------------------------------
    fuori = []
    conta = collections.Counter()
    for r in righe:
        cart, nome_v = r.get('cartella_mac', ''), nfc(r.get('nome_file_mac', ''))
        deciso = nfc(r.get('nome_in_decisioni', ''))
        sha, via, nota = None, '', ''

        p1 = GIF_ROOT / cart / nome_v
        p2 = GIF_ROOT / cart / (deciso + '.gif')
        if p1.exists():
            sha, via = sha_file(p1), 'nome originale'
        elif p2.exists():
            sha, via = sha_file(p2), 'nome deciso'
            nota = 'file gia rinominato in "%s.gif"' % deciso
        else:
            cod = per_cod.get(r['codice'])
            gslug = (cod or {}).get('gif_slug')
            riga_bib = per_slug.get(gslug) if gslug else None
            if riga_bib and riga_bib.get('storage_path'):
                sb = sha_da_bucket(riga_bib['storage_path'])
                if sb:
                    if sb in mac:
                        sha, via = sb, 'catena catalogo->bucket'
                        nota = 'sul Mac ora si chiama "%s"' % os.path.basename(mac[sb][0])
                    else:
                        sha, via = sb, 'bucket (non sul Mac)'
                        nota = 'impronta dal bucket; sul Mac il file non c\'e\' piu\''
                else:
                    nota = 'oggetto del bucket non leggibile'
            else:
                nota = ('codice non a catalogo' if not cod else 'codice senza gif_slug')

        # Il codice VERO si ricava dall'impronta. Quello del registro si conserva
        # accanto, per poter vedere dove i due divergono invece di perdere il dato.
        vero = sha_a_codice.get(sha) if sha else None
        cod_reale = vero['codice'] if vero else ''
        nome_cat = vero['nome'] if vero else ''
        concordano = 'si' if (cod_reale and cod_reale == r['codice']) else 'NO'
        if not cod_reale:
            concordano = '?'

        # E' ancora pendente? Lo dice il catalogo tramite il codice ricavato.
        if cod_reale:
            stato = 'sincronizzato'          # ha impronta, riga e codice: la catena c'e'
        elif r['codice'] not in per_cod:
            stato = 'codice inesistente'
        elif (per_cod[r['codice']].get('gif_slug') or '').strip():
            stato = 'sincronizzato'
        else:
            stato = 'pendente'

        conta[via or 'non risolta'] += 1
        conta['stato:' + stato] += 1
        conta['concordano:' + concordano] += 1
        fuori.append({
            'sha256': sha or '', 'codice_reale': cod_reale, 'codice_registro': r['codice'],
            'codici_concordano': concordano, 'nome_file_mac': r['nome_file_mac'],
            'cartella_mac': cart, 'nome_in_decisioni': r['nome_in_decisioni'],
            'nome_catalogo': nome_cat, 'stato': stato, 'impronta_da': via,
            'nota': (nota + ' ' + (r.get('nota') or '')).strip()})

    # --- resoconto --------------------------------------------------------
    risolte = [x for x in fuori if x['sha256']]
    irrisolte = [x for x in fuori if not x['sha256']]
    print('  IMPRONTA TROVATA: %d righe su %d' % (len(risolte), len(fuori)))
    for k in ('nome originale', 'nome deciso', 'catena catalogo->bucket', 'bucket (non sul Mac)'):
        if conta[k]:
            print('     %-26s %3d' % (k, conta[k]))
    if irrisolte:
        print('\n  SENZA IMPRONTA: %d righe — restano nel registro, con il motivo scritto'
              % len(irrisolte))
        for x in irrisolte:
            print('     %-7s %-38s %s' % (x['codice'], x['nome_in_decisioni'][:38], x['nota']))

    print('\n  Stato reale delle righe (lo dice il catalogo, non il registro):')
    print('     ancora pendenti  %3d' % conta['stato:pendente'])
    print('     sincronizzate    %3d   (il codice ha gia il suo gif_slug)'
          % conta['stato:sincronizzato'])
    print('     codice assente   %3d' % conta['stato:codice inesistente'])

    # --- il codice del registro contro quello vero ------------------------
    print('\n  IL CODICE SCRITTO NEL REGISTRO E QUELLO VERO:')
    print('     concordano       %3d' % conta['concordano:si'])
    print('     DIVERGONO        %3d   <- il registro punta a un altro codice'
          % conta['concordano:NO'])
    print('     non ricavabile   %3d   (nessun codice punta a quell\'impronta)'
          % conta['concordano:?'])
    diverse = [x for x in fuori if x['codici_concordano'] == 'NO']
    if diverse:
        print('\n     Il registro era stato incollato disallineato: il nome giusto sta')
        print('     su un codice diverso da quello scritto accanto. Da qui in avanti')
        print('     vale il codice ricavato dall\'impronta.\n')
        for x in diverse[:12]:
            print('     "%s"' % x['nome_in_decisioni'][:44])
            print('        registro: %-7s   vero: %-7s (%s)'
                  % (x['codice_registro'], x['codice_reale'], x['nome_catalogo'][:34]))
        if len(diverse) > 12:
            print('     … e altre %d' % (len(diverse) - 12))

    # doppioni di impronta: due righe che puntano allo stesso file
    per_sha_out = collections.defaultdict(list)
    for x in risolte:
        per_sha_out[x['sha256']].append(x['codice_reale'] or x['codice_registro'])
    doppi = {s: c for s, c in per_sha_out.items() if len(set(c)) > 1}
    if doppi:
        print('\n  ⚠️  stessa impronta su piu righe:')
        for s, c in doppi.items():
            print('     %s… ← %s' % (s[:12], ', '.join(sorted(set(c)))))

    # codici allocati in anticipo e mai scritti: pronti a scontrarsi (lezione L6)
    inesistenti = sorted({x['codice_registro'] for x in fuori
                          if x['stato'] == 'codice inesistente'})
    if inesistenti:
        print('\n  ⚠️  CODICI ALLOCATI IN ANTICIPO E MAI SCRITTI: %s' % ', '.join(inesistenti))
        print('      Non sono a catalogo. Se qualcuno li alloca per altro, si scontrano.')
        print('      Vanno riallocati al momento della scrittura, mai tenuti prenotati.')

    if not args.applica:
        print('\n  PROVA A VUOTO: non ho scritto niente.')
        print('  Per applicare:  python3 chiave_pendente.py --applica')
        return

    BACKUP.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S')
    copia = BACKUP / ('cantiere_96_pendente_prima_di_sha256_%s.tsv' % stamp)
    shutil.copy2(TSV, copia)
    scrivi(TSV, COL_NUOVE, fuori)

    # rilettura di controllo: il file appena scritto deve tornare identico
    ric = leggi(TSV)
    if len(ric) != len(righe):
        sys.exit('  ERRORE: riletto %d righe invece di %d — controlla %s'
                 % (len(ric), len(righe), copia))
    con_sha = sum(1 for x in ric if x.get('sha256'))
    print('\n  backup del vecchio: %s' % copia)
    print('  scritto: %s' % TSV)
    print('  riletto: %d righe, %d con impronta — nessuna riga persa.' % (len(ric), con_sha))


if __name__ == '__main__':
    main()
