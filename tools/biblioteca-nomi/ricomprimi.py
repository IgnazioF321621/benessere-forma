#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ricompressione a 480px di una zona, sul Mac. Nessuna scrittura su Storage o DB.

    python3 tools/biblioteca-nomi/ricomprimi.py "Polpacci"

Cosa fa, in ordine:
  1. elenca gli oggetti della zona nel bucket (poche decine di kB, zero download)
  2. per ognuno trova il gemello sul Mac per impronta (eTag = MD5) -> [L24]
  3. i file sopra i 480px li ricomprime, gli altri li copia identici
  4. scrive il piano in lavoro/_480/<zona>.json, che e' anche il riferimento
     per la verifica e per il rientro dopo il caricamento

------------------------------------------------------------------------------
MASSIMO 480px, MAI INGRANDIRE
------------------------------------------------------------------------------
Nel bucket 371 oggetti su 647 sono gia' a 360px o meno. Portarli a 480 li
ingrandirebbe: file piu' pesanti e piu' sfocati. Il ridimensionamento e' un
tetto, non una misura: chi sta sotto non si tocca.

------------------------------------------------------------------------------
PALETTE INTATTA
------------------------------------------------------------------------------
Deciso il 15 agosto 2026: si ridimensiona e basta, `--colors` non si usa.
Misurato su 54 file presi a caso nelle 9 zone: il solo 480px toglie il 49% del
peso del bucket; ridurre anche i colori ne toglierebbe un altro 6% (128 colori)
o 22% (64 colori), ma introduce banding permanente sulle sfumature. Con la sola
riduzione di dimensione la biblioteca completa — Pettorali e Mobilita' comprese —
sta a meta' del piano Free, quindi il margine non serve comprarlo con la qualita'.

Verificato: su queste GIF `--colors 256` produce un file IDENTICO byte per byte
al solo ridimensionamento. Hanno gia' 256 colori esatti: non c'e' niente da ridurre.

------------------------------------------------------------------------------
PERCHE' gifsicle E NON Pillow
------------------------------------------------------------------------------
Pillow rifa' i fotogrammi da capo e perde la codifica differenziale fra l'uno e
l'altro: misurato, due file su sei uscivano PIU' PESANTI dell'originale (+89%).
gifsicle la conserva. Sta in tools/bin/, si rifa' con installa_gifsicle.sh.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageChops, ImageSequence

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))
import impronte as I                                    # noqa: E402

REPO = BASE.parent.parent
GIFSICLE = REPO / 'tools' / 'bin' / 'gifsicle'
GIF_ROOT = Path('/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi')
# Sotto la biblioteca: e' gia' fuori da git, e impronte.py fa rglob sulla radice,
# quindi i file ricompressi entrano nell'indice delle impronte da soli.
DEST_ROOT = GIF_ROOT / '_480'
PIANI = BASE / 'lavoro' / '_480'
LATO = 480


def md5_sha(path):
    m, s = hashlib.md5(), hashlib.sha256()
    with open(path, 'rb') as fh:
        for b in iter(lambda: fh.read(1 << 20), b''):
            m.update(b)
            s.update(b)
    return m.hexdigest(), s.hexdigest()


def misura(path):
    """(lato lungo, fotogrammi, durata totale in ms). (None, None, None) se non si apre.

    La durata e' la grandezza che conta davvero: `-O3` fonde i fotogrammi
    consecutivi identici sommandone i ritardi, quindi il CONTEGGIO cala mentre
    l'animazione resta la stessa. Misurato su `Burpee navy seal`: 279 -> 241
    fotogrammi, durata 9300 ms prima e 9300 ms dopo.
    """
    try:
        im = Image.open(path)
        durata = 0
        n = 0
        for f in ImageSequence.Iterator(im):
            durata += f.info.get('duration', 0)
            n += 1
        return max(im.size), n, durata
    except Exception:
        return None, None, None


def ricomprimi_file(src, dst, ridimensiona):
    """Sopra i 480px si ridimensiona; sotto si riscrive soltanto la codifica."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [str(GIFSICLE)]
    if ridimensiona:
        cmd += ['--resize-fit', '%dx%d' % (LATO, LATO), '--resize-method', 'mix']
    cmd += ['-O3', str(src), '-o', str(dst)]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        return 'gifsicle: %s' % r.stderr.decode()[:160]
    if not dst.exists() or dst.stat().st_size == 0:
        return 'gifsicle non ha prodotto nulla'
    return None


def _linea(path):
    """[(istante in ms, fotogramma)] piu' la durata totale."""
    im = Image.open(path)
    out, t = [], 0
    for f in ImageSequence.Iterator(im):
        out.append((t, f.convert('RGB').copy()))
        t += f.info.get('duration', 0)
    return out, t


def _a_tempo(linea, istante):
    scelto = linea[0][1]
    for tt, img in linea:
        if tt <= istante:
            scelto = img
        else:
            break
    return scelto


def confronta(src, dst, ridimensionato):
    """Quanto il file prodotto si discosta dall'originale. (media, massimo).

    Il confronto e' a TEMPI uguali, non a indici uguali: `-O3` fonde i fotogrammi
    consecutivi identici, quindi gli indici non si corrispondono piu' mentre gli
    istanti si'. E' il confronto che ha distinto una fusione benigna da una
    perdita vera su `Burpee navy seal`.

    Senza ridimensionamento il confronto e' esatto, fotogramma per fotogramma, e
    il massimo DEVE essere 0: `-O3` riscrive la codifica, non i colori.
    """
    A, ta = _linea(src)
    B, tb = _linea(dst)
    dim = B[0][1].size
    if not ridimensionato:
        if len(A) != len(B):
            # -O3 ha fuso fotogrammi: si confronta a tempi, non a indici
            istanti = [ta * f for f in (0.1, 0.3, 0.5, 0.7, 0.9)]
            coppie = [(_a_tempo(A, i), _a_tempo(B, i)) for i in istanti]
        else:
            coppie = [(a, b) for (_, a), (_, b) in zip(A, B)]
    else:
        istanti = [ta * f for f in (0.15, 0.45, 0.75)]
        coppie = [(_a_tempo(A, i).resize(dim, Image.LANCZOS), _a_tempo(B, i))
                  for i in istanti]

    somma, massimo = 0.0, 0
    for fa, fb in coppie:
        h = ImageChops.difference(fa, fb).convert('L').histogram()
        somma += sum(k * c for k, c in enumerate(h)) / sum(h)
        massimo = max(massimo, max((k for k, c in enumerate(h) if c), default=0))
    return somma / len(coppie), massimo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    ap.add_argument('--rifai', action='store_true',
                    help='ricomprime anche cio che e gia in _480/')
    args = ap.parse_args()
    zona = args.zona

    if not GIFSICLE.exists():
        sys.exit('manca %s — lancia prima:\n  bash tools/biblioteca-nomi/'
                 'installa_gifsicle.sh' % GIFSICLE)

    oggetti, err = I.elenco_bucket(zona + '/')
    if err:
        sys.exit('elenco del bucket fallito: %s' % err)
    oggetti = [o for o in oggetti if o.get('id') is not None]
    if not oggetti:
        sys.exit('nessun oggetto nel bucket per la zona "%s"' % zona)

    idx = I.indice_locale(verbose=True)
    print('\nzona "%s": %d oggetti nel bucket\n' % (zona, len(oggetti)))

    voci, senza_gemello = [], []
    t0 = time.time()
    print('%-50s %7s %7s %6s  %s' % ('file', 'prima', 'dopo', 'ris.', 'esito'))
    for o in sorted(oggetti, key=lambda x: x['name']):
        sp = I.nfc('%s/%s' % (zona, o['name']))
        meta = o.get('metadata') or {}
        byte_bucket = meta.get('size', 0)
        f = I.firma(meta.get('eTag'), byte_bucket)
        gem = idx.get(f)

        if not gem:
            # Senza gemello sul Mac non sappiamo che cosa stiamo sostituendo:
            # non entra nel piano e resta esattamente com'e' [L10].
            senza_gemello.append(sp)
            print('%-50.50s %7.0fk %7s %6s  SALTATO: nessun gemello sul Mac'
                  % (o['name'], byte_bucket / 1024, '-', '-'))
            continue

        src = Path(gem['percorso'])
        lato, fotogrammi, durata = misura(src)
        dst = DEST_ROOT / zona / o['name']

        if lato is None:
            senza_gemello.append(sp)
            print('%-50.50s %7.0fk %7s %6s  SALTATO: non si apre'
                  % (o['name'], byte_bucket / 1024, '-', '-'))
            continue

        # Dal 15 agosto 2026 NESSUN file entra nel bucket con i byte di prima:
        # sopra i 480px si ridimensiona, sotto si riscrive la sola codifica con
        # -O3. Ricaricare byte identici lascia l'ETag invariato, e la CDN puo'
        # restare bloccata sull'intestazione vecchia — cosa che dipende dal fatto
        # che l'oggetto fosse in cache o no, cioe' dalla fortuna [L30].
        ridimensiona = lato > LATO
        azione = 'ricompresso' if ridimensiona else 'riottimizzato'
        rifare = args.rifai or not dst.exists()

        if rifare:
            e = ricomprimi_file(src, dst, ridimensiona)
            if e:
                sys.exit('ERRORE su %s: %s' % (sp, e))

        # Guardia: la ricompressione non deve accorciare l'animazione ne' rompere
        # il file. Si controlla la DURATA, non il conteggio dei fotogrammi: `-O3`
        # fonde i consecutivi identici sommandone i ritardi, e il conteggio cala
        # mentre cio' che si vede resta identico.
        lato_n, fotogrammi_n, durata_n = misura(dst)
        if lato_n is None:
            sys.exit('ERRORE: il file prodotto non si apre: %s' % dst)
        if abs(durata_n - durata) > max(100, 0.02 * durata):
            sys.exit('ERRORE: durata %d ms -> %d ms su %s'
                     % (durata, durata_n, sp))
        if fotogrammi_n > fotogrammi:
            sys.exit('ERRORE: fotogrammi aumentati %d -> %d su %s'
                     % (fotogrammi, fotogrammi_n, sp))
        if lato_n > LATO:
            sys.exit('ERRORE: %s e ancora a %dpx' % (sp, lato_n))
        fusi = fotogrammi - fotogrammi_n

        media, massimo = confronta(src, dst, ridimensiona)
        # Senza ridimensionamento il confronto e' esatto: un solo pixel diverso
        # vuol dire che -O3 ha fatto qualcosa che non doveva, e ci si ferma.
        if not ridimensiona and massimo != 0:
            sys.exit('ERRORE: -O3 ha cambiato i pixel di %s (differenza %d)'
                     % (sp, massimo))
        if ridimensiona and media > 5.0:
            sys.exit('ERRORE: %s si discosta troppo dall originale (media %.2f)'
                     % (sp, media))

        md5_n, sha_n = md5_sha(dst)
        byte_n = dst.stat().st_size
        voci.append({
            'storage_path': sp,
            'origine_mac': str(src),
            'lato_prima': lato, 'lato_dopo': lato_n,
            'fotogrammi': fotogrammi, 'fotogrammi_dopo': fotogrammi_n,
            'durata_ms': durata, 'durata_ms_dopo': durata_n,
            'fotogrammi_fusi': fusi,
            'diff_media': round(media, 3), 'diff_massima': massimo,
            'md5_bucket': f.split('|')[0], 'byte_bucket': byte_bucket,
            'sha256_bucket': gem['sha256'],
            'file_480': str(dst), 'md5_nuovo': md5_n, 'sha256_nuovo': sha_n,
            'byte_nuovo': byte_n,
            'azione': azione,
        })
        ris = 100 - 100.0 * byte_n / byte_bucket if byte_bucket else 0
        nota = azione
        if fusi:
            nota += ' (%d fotogrammi doppi fusi, durata invariata)' % fusi
        if not ridimensiona and byte_n >= byte_bucket:
            nota += ' (byte nuovi, peso invariato)'
        print('%-50.50s %7.0fk %7.0fk %5.0f%%  %s'
              % (o['name'], byte_bucket / 1024, byte_n / 1024, ris, nota))

    prima = sum(v['byte_bucket'] for v in voci)
    dopo = sum(v['byte_nuovo'] for v in voci)
    n_ric = sum(1 for v in voci if v['azione'] == 'ricompresso')
    print('\n%d file: %d ridimensionati a 480px, %d riottimizzati -O3, %d saltati'
          % (len(voci), n_ric, len(voci) - n_ric, len(senza_gemello)))
    print('peso: %.1f MB -> %.1f MB  (%.0f%% in meno) in %.0fs'
          % (prima / 1048576, dopo / 1048576,
             100 - 100.0 * dopo / prima if prima else 0, time.time() - t0))

    if senza_gemello:
        print('\nSaltati, restano intatti nel bucket:')
        for s in senza_gemello:
            print('   %s' % s)

    # Scostamento dall'originale. Sui riottimizzati deve essere 0 su ogni pixel:
    # -O3 riscrive la codifica, non i colori. Sui ridimensionati resta il solo
    # rumore di ricampionamento, e si guarda la media a tempi uguali.
    ric = [v for v in voci if v['azione'] == 'ricompresso']
    rio = [v for v in voci if v['azione'] == 'riottimizzato']
    print('\nSCOSTAMENTO DALL ORIGINALE (0 = identico, 255 = opposto)')
    if rio:
        peggio = max(v['diff_massima'] for v in rio)
        print('  %d riottimizzati -O3: differenza massima su qualsiasi pixel %d — %s'
              % (len(rio), peggio, 'identici' if peggio == 0 else 'DA GUARDARE'))
    if ric:
        medie = sorted(v['diff_media'] for v in ric)
        print('  %d ridimensionati: media a tempi uguali — mediana %.2f, massimo %.2f'
              % (len(ric), medie[len(medie) // 2], medie[-1]))
        fuori = [v for v in ric if v['diff_media'] > 3.0]
        if fuori:
            print('     %d sopra 3.0, guardali:' % len(fuori))
            for v in fuori:
                print('       %-50.50s %.2f'
                      % (v['storage_path'].split('/')[-1], v['diff_media']))
        else:
            print('     nessuno sopra 3.0')

    # La proprieta' che tiene in piedi la regola: nessun file entra con i byte
    # di prima, o la CDN puo' restare bloccata sull'intestazione vecchia [L30].
    identici = [v for v in voci if v['md5_nuovo'] == v['md5_bucket']]
    if identici:
        sys.exit('ERRORE: %d file avrebbero i byte identici a quelli gia nel '
                 'bucket, la CDN non si sbloccherebbe:\n   %s'
                 % (len(identici),
                    '\n   '.join(v['storage_path'] for v in identici[:10])))

    # -O3 non sempre migliora un file gia' ottimizzato: su quelli serve l'ETag
    # nuovo, non il peso, quindi un aumento si accetta — ma si dice.
    piu_pesanti = [v for v in voci if v['byte_nuovo'] > v['byte_bucket']]
    if piu_pesanti:
        print('\n%d file sono diventati piu pesanti (accettabile: li si riscrive'
              ' per l ETag, non per il peso):' % len(piu_pesanti))
        for v in piu_pesanti:
            print('   %-50.50s %6.0fk -> %6.0fk  (+%.0f%%)'
                  % (v['storage_path'].split('/')[-1], v['byte_bucket'] / 1024,
                     v['byte_nuovo'] / 1024,
                     100.0 * v['byte_nuovo'] / v['byte_bucket'] - 100))

    # Riepilogo delle anomalie. Su una zona da 169 file le righe singole si
    # perdono: cio' che non e' andato liscio va ripetuto in fondo, dove si legge.
    fusi_l = [v for v in voci if v.get('fotogrammi_fusi')]
    deriva = [v for v in voci if v['durata_ms_dopo'] != v['durata_ms']]
    if fusi_l or deriva:
        print('\nDA GUARDARE:')
        if fusi_l:
            print('  %d file con fotogrammi doppi fusi da -O3 (durata invariata):'
                  % len(fusi_l))
            for v in fusi_l:
                print('     %-52.52s %d -> %d fotogrammi, %d ms invariati'
                      % (v['storage_path'].split('/')[-1], v['fotogrammi'],
                         v['fotogrammi_dopo'], v['durata_ms']))
        if deriva:
            print('  %d file con la durata cambiata (dentro la tolleranza, ma'
                  ' guardali):' % len(deriva))
            for v in deriva:
                print('     %-52.52s %d -> %d ms'
                      % (v['storage_path'].split('/')[-1], v['durata_ms'],
                         v['durata_ms_dopo']))
    else:
        print('\nNessuna anomalia: durata e fotogrammi invariati su tutti i file.')

    PIANI.mkdir(parents=True, exist_ok=True)
    piano = PIANI / ('%s.json' % zona.lower().replace(' ', '-'))
    piano.write_text(json.dumps({
        'zona': zona, 'lato': LATO, 'palette': 'intatta',
        'generato': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'byte_prima': prima, 'byte_dopo': dopo,
        'senza_gemello': senza_gemello, 'voci': voci,
    }, ensure_ascii=False, indent=1), encoding='utf-8')
    print('\npiano: %s' % piano)
    I.stampa_consumo()


if __name__ == '__main__':
    main()
