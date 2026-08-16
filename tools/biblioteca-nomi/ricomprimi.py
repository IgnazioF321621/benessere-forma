#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ricompressione a 480px di una zona, sul Mac. Nessuna scrittura su Storage o DB.

    python3 tools/biblioteca-nomi/ricomprimi.py "Polpacci"     # zona gia' migrata
    python3 tools/biblioteca-nomi/ricomprimi.py "Pettorali"    # zona in migrazione

Cosa fa, in ordine:
  1. costruisce l'elenco delle unita' di lavoro (vedi sotto)
  2. per ognuna trova il file di origine sul Mac
  3. i file sopra i 480px li ricomprime, gli altri li riscrive con -O3
  4. scrive il piano in lavoro/_480/<zona>.json, che e' anche il riferimento
     per la verifica e per il rientro dopo il caricamento

------------------------------------------------------------------------------
L'UNITA' DI LAVORO E' IL PERCORSO DI DESTINAZIONE, NON L'OGGETTO NEL BUCKET
------------------------------------------------------------------------------
Fino al 16 agosto lo strumento era indicizzato sugli oggetti del bucket: elencava
la cartella, trovava il gemello sul Mac per eTag e lavorava su quelli. Andava bene
per le otto zone gia' migrate, dove ogni file era gia' dentro e al suo posto.

Non regge le zone che devono ancora migrare, ed e' un difetto strutturale, non un
caso particolare di Pettorali: li' i percorsi CAMBIANO (il file esce con un nome
nuovo) e 22 file su 82 nel bucket non ci sono ancora. Su Mobilita' saranno 214 su
214. Indicizzando sul bucket, i file nuovi non entrano mai nel piano — e sono
esattamente quelli per cui la regola dei 480px e' stata scritta.

Quindi l'unita' e' «questo file del Mac, destinato a questo percorso», e le
sorgenti sono due, con la stessa forma in uscita:

  zona CON piano di migrazione (lavoro/_piani/piano_<zona>.json)
      le righe del piano danno file di origine, percorso di destinazione e, se
      c'e', percorso attuale. Copre anche i file mai caricati.
  zona SENZA piano (le otto gia' migrate)
      si elenca il bucket e si risale al gemello per impronta, come prima.
      Destinazione = percorso attuale: nessun file si sposta.

Il piano prodotto ha la stessa forma nei due casi, cosi' carica_480.py e
verifica_480.py non sanno nemmeno da quale delle due sorgenti viene.

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
import shutil
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


# ---------------------------------------------------------------- formati
# Il bucket NON contiene solo GIF: ci sono anche immagini ferme, per gli esercizi
# per cui una GIF non esisteva. Misurato il 15 agosto su tutti e 647 gli oggetti:
# 645 GIF, 1 PNG, 1 JPEG, questi ultimi due entrambi in "Addominali e Core" ed
# entrambi puntati da un codice vivo (EX156, EX037). gifsicle non li apre, e prima
# di questa versione lo strumento moriva sul primo che incontrava.
SENZA_PERDITA = {'GIF', 'PNG'}     # si possono riscrivere senza toccare i pixel


def formato_di(path):
    """Il formato VERO, letto dal contenuto: l'estensione non fa fede."""
    try:
        return Image.open(path).format
    except Exception:
        return None


def ricomprimi_file(src, dst, ridimensiona, formato):
    """Sopra i 480px si ridimensiona; sotto si riscrive soltanto la codifica."""
    dst.parent.mkdir(parents=True, exist_ok=True)

    if formato == 'GIF':
        cmd = [str(GIFSICLE)]
        if ridimensiona:
            cmd += ['--resize-fit', '%dx%d' % (LATO, LATO),
                    '--resize-method', 'mix']
        cmd += ['-O3', str(src), '-o', str(dst)]
        r = subprocess.run(cmd, capture_output=True)
        if r.returncode != 0:
            return 'gifsicle: %s' % r.stderr.decode()[:160]
        if not dst.exists() or dst.stat().st_size == 0:
            return 'gifsicle non ha prodotto nulla'
        return None

    if formato == 'PNG':
        # PNG e' senza perdita per definizione: riscriverlo con optimize cambia
        # solo come i pixel sono impacchettati, mai quali sono.
        im = Image.open(src)
        if ridimensiona:
            w, h = im.size
            s = LATO / max(w, h)
            im = im.resize((max(1, round(w * s)), max(1, round(h * s))),
                           Image.LANCZOS)
        im.save(dst, 'PNG', optimize=True)
        return None

    # Formati con perdita (oggi: un JPEG). Non si riscrivono MAI in automatico:
    # ogni riscrittura sposta i pixel, e su un file gia' molto compresso il
    # ridimensionamento lo fa pure CRESCERE. Si copia identico e si dichiara.
    shutil.copy2(src, dst)
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


def piano_migrazione(zona):
    """Il piano di pianifica.py, se la zona ne ha uno. None altrimenti."""
    from nomenclatura import slug as fslug
    p = BASE / 'lavoro' / '_piani' / ('piano_%s.json' % fslug(zona))
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding='utf-8'))


def unita_di_lavoro(zona, stato, idx, migrazione=False):
    """[{origine_mac, dest, attuale}] piu' l'elenco di cio' che si salta.

    `dest` e' dove i byte andranno, `attuale` dove stanno ora (None se il file
    nel bucket non c'e' ancora). Nelle zone gia' migrate i due coincidono.

    Quale delle due sorgenti si usa lo DICE IL CHIAMANTE, non lo si indovina.
    La tentazione era dedurlo: se il piano di migrazione descrive ancora il
    bucket allora la zona sta migrando, altrimenti no. Non regge sui fatti — il
    piano di "Gambe e Glutei" ha 3 righe che indicano ancora da spostare file
    che invece sono vivi da settimane sotto un altro nome, con la loro riga e il
    loro codice: durante quella migrazione si e' deciso diverso dal piano, e il
    piano su disco non e' il verbale di cio' che e' stato fatto. Una deduzione
    da quello stato avrebbe rimesso in movimento file a posto [L8].
    """
    mig = piano_migrazione(zona) if migrazione else None
    if migrazione and not mig:
        sys.exit('nessun piano di migrazione per "%s": lancia prima pianifica.py'
                 % zona)

    if mig:
        unita, saltati = [], []
        for r in mig['righe']:
            src = GIF_ROOT / zona / r['file_mac']
            if not src.exists():
                saltati.append('%s — file del piano assente sul Mac' % r['file_mac'])
                continue
            att = I.nfc(r['storage_path_attuale']) if r.get('storage_path_attuale') else None
            dst = I.nfc(r['storage_path_dest'])
            # Dove stanno i byte ADESSO: all'indirizzo vecchio se c'e' ancora,
            # altrimenti a quello nuovo se la riga e' gia' passata. Senza questo,
            # rilanciare lo strumento a migrazione iniziata farebbe sembrare "mai
            # caricate" tutte le righe gia' spostate.
            ora = att if (att and att in stato) else (dst if dst in stato else None)
            unita.append({'origine_mac': src, 'dest': dst, 'attuale': ora})
        # Un oggetto nel bucket che il piano non nomina non e' un dettaglio: il
        # piano dovrebbe coprire la zona intera, e cio' che resta fuori resta
        # anche a piena risoluzione senza che nessuno se ne accorga.
        coperti = {u['attuale'] for u in unita if u['attuale']}
        for sp in sorted(set(stato) - coperti):
            saltati.append('%s — nel bucket ma fuori dal piano di migrazione' % sp)
        return unita, saltati, 'piano di migrazione (%d righe)' % len(mig['righe'])

    # Zona gia' migrata: l'unita' e' l'oggetto che sta nel bucket, e non si sposta.
    unita, saltati = [], []
    for sp, s in sorted(stato.items()):
        gem = idx.get(I.firma(s['etag'], s['byte']))
        if not gem:
            # Senza gemello sul Mac non sappiamo che cosa stiamo sostituendo:
            # non entra nel piano e resta esattamente com'e' [L10].
            saltati.append('%s — nessun gemello sul Mac' % sp)
            continue
        unita.append({'origine_mac': Path(gem['percorso']), 'dest': sp, 'attuale': sp})
    return unita, saltati, 'elenco del bucket'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    ap.add_argument('--rifai', action='store_true',
                    help='ricomprime anche cio che e gia in _480/')
    ap.add_argument('--migrazione', action='store_true',
                    help='la zona sta migrando: le unita vengono dal piano di '
                         'pianifica.py, percorsi di destinazione compresi')
    args = ap.parse_args()
    zona = args.zona

    if not GIFSICLE.exists():
        sys.exit('manca %s — lancia prima:\n  bash tools/biblioteca-nomi/'
                 'installa_gifsicle.sh' % GIFSICLE)

    stato, err = I.stato_bucket(zona)
    if err:
        sys.exit('elenco del bucket fallito: %s' % err)

    idx = I.indice_locale(verbose=True)
    if not args.migrazione and piano_migrazione(zona):
        print('\n  NOTA: per "%s" esiste un piano di migrazione, e non lo sto'
              ' usando.\n        Se la zona sta migrando rilancia con'
              ' --migrazione, o i file\n        nuovi e i percorsi di'
              ' destinazione restano fuori dal piano.' % zona)
    unita, senza_gemello, sorgente = unita_di_lavoro(zona, stato, idx,
                                                     migrazione=args.migrazione)
    if not unita:
        print('\nnessuna unita di lavoro per la zona "%s".' % zona)
        if senza_gemello:
            print('%d oggetti saltati — tipicamente una zona gia ridotta, i cui'
                  ' byte nel bucket\nnon hanno piu un gemello sul Mac perche'
                  ' _480/ e stata sgomberata:' % len(senza_gemello))
            for s in senza_gemello[:5]:
                print('   %s' % s)
            if len(senza_gemello) > 5:
                print('   ... e altri %d' % (len(senza_gemello) - 5))
        I.stampa_consumo()
        return
    nuovi = sum(1 for u in unita if u['attuale'] is None)
    print('\nzona "%s": %d unita da %s — %d gia nel bucket, %d da caricare\n'
          % (zona, len(unita), sorgente, len(unita) - nuovi, nuovi))

    voci = []
    t0 = time.time()
    print('%-50s %7s %7s %6s  %s' % ('file', 'prima', 'dopo', 'ris.', 'esito'))
    for u in sorted(unita, key=lambda x: x['dest']):
        sp = u['dest']
        nome_dest = sp.split('/')[-1]
        # Stato di CIO' CHE STA NEL BUCKET ORA: per una rinomina e' all'indirizzo
        # vecchio, per un file mai caricato non c'e' niente.
        s_ora = stato.get(u['attuale']) if u['attuale'] else None
        byte_bucket = s_ora['byte'] if s_ora else 0

        src = u['origine_mac']
        lato, fotogrammi, durata = misura(src)
        dst = DEST_ROOT / zona / nome_dest

        if lato is None:
            senza_gemello.append('%s — non si apre: %s' % (sp, src))
            print('%-50.50s %7.0fk %7s %6s  SALTATO: non si apre'
                  % (nome_dest, byte_bucket / 1024, '-', '-'))
            continue

        # Dal 15 agosto 2026 NESSUN file entra nel bucket con i byte di prima:
        # sopra i 480px si ridimensiona, sotto si riscrive la sola codifica con
        # -O3. Ricaricare byte identici lascia l'ETag invariato, e la CDN puo'
        # restare bloccata sull'intestazione vecchia — cosa che dipende dal fatto
        # che l'oggetto fosse in cache o no, cioe' dalla fortuna [L30].
        formato = formato_di(src)
        ridimensiona = lato > LATO
        riscrivibile = formato in SENZA_PERDITA
        if not riscrivibile:
            # Immagine ferma con perdita: entra identica, per scelta dichiarata.
            azione = 'fermo-non-riscrivibile'
            ridimensiona = False
        else:
            azione = 'ricompresso' if ridimensiona else 'riottimizzato'
        rifare = args.rifai or not dst.exists()

        if rifare:
            e = ricomprimi_file(src, dst, ridimensiona, formato)
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
        # Le immagini ferme con perdita restano alla loro dimensione per scelta:
        # ridimensionarle le farebbe crescere invece che calare.
        if lato_n > LATO and riscrivibile:
            sys.exit('ERRORE: %s e ancora a %dpx' % (sp, lato_n))
        fusi = fotogrammi - fotogrammi_n

        media, massimo = confronta(src, dst, ridimensiona)
        # Senza ridimensionamento il confronto e' esatto: un solo pixel diverso
        # vuol dire che la riscrittura ha fatto qualcosa che non doveva.
        if not ridimensiona and massimo != 0:
            sys.exit('ERRORE: la riscrittura ha cambiato i pixel di %s'
                     ' (differenza %d)' % (sp, massimo))
        if ridimensiona and media > 5.0:
            sys.exit('ERRORE: %s si discosta troppo dall originale (media %.2f)'
                     % (sp, media))

        md5_n, sha_n = md5_sha(dst)
        byte_n = dst.stat().st_size
        # Il mimetype si rilegge dall'oggetto e si rimanda uguale [L33]. Se
        # l'oggetto non esiste ancora non c'e' niente da rileggere e lo si
        # deduce dal CONTENUTO del file, mai dall'estensione [L32].
        s_dest = stato.get(sp)
        mimetype = ((s_dest or s_ora or {}).get('mimetype')
                    or I.mimetype_da_contenuto(src))
        voci.append({
            'storage_path': sp,
            'storage_path_attuale': u['attuale'],
            'percorso_cambia': u['attuale'] != sp,
            'origine_mac': str(src),
            'lato_prima': lato, 'lato_dopo': lato_n,
            'fotogrammi': fotogrammi, 'fotogrammi_dopo': fotogrammi_n,
            'durata_ms': durata, 'durata_ms_dopo': durata_n,
            'fotogrammi_fusi': fusi,
            'diff_media': round(media, 3), 'diff_massima': massimo,
            'formato': formato, 'mimetype': mimetype,
            'md5_bucket': s_ora['etag'] if s_ora else None,
            'byte_bucket': byte_bucket or None,
            'cache_bucket': s_ora['cache'] if s_ora else None,
            'file_480': str(dst), 'md5_nuovo': md5_n, 'sha256_nuovo': sha_n,
            'byte_nuovo': byte_n,
            'azione': azione,
        })
        ris = 100 - 100.0 * byte_n / byte_bucket if byte_bucket else 0
        nota = azione
        if u['attuale'] is None:
            nota += ' (mai caricato)'
        elif u['attuale'] != sp:
            nota += ' (cambia percorso)'
        if fusi:
            nota += ' (%d fotogrammi doppi fusi, durata invariata)' % fusi
        if not ridimensiona and byte_bucket and byte_n >= byte_bucket:
            nota += ' (byte nuovi, peso invariato)'
        print('%-50.50s %7s %7.0fk %5s  %s'
              % (nome_dest,
                 '%.0fk' % (byte_bucket / 1024) if byte_bucket else '-',
                 byte_n / 1024,
                 '%.0f%%' % ris if byte_bucket else '-', nota))

    prima = sum(v['byte_bucket'] or 0 for v in voci)
    dopo = sum(v['byte_nuovo'] for v in voci)
    n_ric = sum(1 for v in voci if v['azione'] == 'ricompresso')
    n_fermi = sum(1 for v in voci if v['azione'] == 'fermo-non-riscrivibile')
    print('\n%d file: %d ridimensionati a 480px, %d riscritti senza perdita,'
          ' %d fermi non riscrivibili, %d saltati'
          % (len(voci), n_ric, len(voci) - n_ric - n_fermi, n_fermi,
             len(senza_gemello)))
    # Il confronto "prima -> dopo" vale solo per chi nel bucket c'e' gia': i file
    # mai caricati non hanno un prima, e sommarli al totale farebbe sembrare la
    # riduzione peggiore di quello che e'. Il peso in ingresso si dichiara a parte.
    sostituiti = [v for v in voci if v['byte_bucket']]
    dopo_sost = sum(v['byte_nuovo'] for v in sostituiti)
    print('peso di cio che e gia nel bucket: %.1f MB -> %.1f MB  (%.0f%% in meno)'
          ' in %.0fs'
          % (prima / 1048576, dopo_sost / 1048576,
             100 - 100.0 * dopo_sost / prima if prima else 0, time.time() - t0))
    mai = [v for v in voci if not v['byte_bucket']]
    if mai:
        grezzo = sum(Path(v['origine_mac']).stat().st_size for v in mai)
        print('mai caricati: %d file, %.1f MB sul Mac -> %.1f MB in ingresso'
              '  (%.0f%% in meno)'
              % (len(mai), grezzo / 1048576,
                 sum(v['byte_nuovo'] for v in mai) / 1048576,
                 100 - 100.0 * sum(v['byte_nuovo'] for v in mai) / grezzo))

    if senza_gemello:
        print('\nSaltati, restano intatti nel bucket:')
        for s in senza_gemello:
            print('   %s' % s)

    # Scostamento dall'originale. Sui riottimizzati deve essere 0 su ogni pixel:
    # -O3 riscrive la codifica, non i colori. Sui ridimensionati resta il solo
    # rumore di ricampionamento, e si guarda la media a tempi uguali.
    ric = [v for v in voci if v['azione'] == 'ricompresso']
    rio = [v for v in voci if v['azione'] == 'riottimizzato']
    fermi = [v for v in voci if v['azione'] == 'fermo-non-riscrivibile']
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

    if fermi:
        print('\n%d immagini ferme con perdita: entrano IDENTICHE, per scelta.'
              % len(fermi))
        print('  Riscriverle sposterebbe i pixel senza far calare il peso.')
        print('  Prendono comunque il cache-control; se una restasse bloccata')
        print('  sulla CDN lo direbbe ripara_cache.py.')
        for v in fermi:
            print('     %-50.50s %s  %d byte'
                  % (v['storage_path'].split('/')[-1], v['formato'],
                     v['byte_nuovo']))

    # La proprieta' che tiene in piedi la regola: nessun file entra con i byte
    # di prima, o la CDN puo' restare bloccata sull'intestazione vecchia [L30].
    #
    # La guardia vale per chi finisce SULLO STESSO indirizzo: e' li' che una voce
    # di cache vecchia puo' sopravvivere. Un file che cambia percorso arriva a un
    # URL che la CDN non ha mai visto, quindi non c'e' nessuna voce da sostituire
    # e byte uguali non fanno danno — la riduzione, quando serve, la garantisce
    # comunque il controllo sul lato lungo.
    #
    # Byte uguali a quelli gia' nel bucket vogliono dire due cose opposte, e le
    # distingue l'intestazione. Se l'oggetto ha gia' il cache-control giusto, quel
    # file e' semplicemente GIA' STATO FATTO — rilanciare lo strumento dopo aver
    # caricato una parte della zona e' normale, e non deve fermare il giro. Se
    # invece serve ancora `no-cache`, allora e' il caso pericoloso: si riscriverebbe
    # senza cambiare l'ETag e la CDN potrebbe tenersi l'intestazione vecchia [L30].
    gia_fatti = [v for v in voci if v['md5_bucket']
                 and v['md5_nuovo'] == v['md5_bucket']
                 and not v['percorso_cambia']
                 and v.get('cache_bucket') == I.CACHE_IMMUTABILE]
    if gia_fatti:
        print('\n%d file sono gia nel bucket con questi byte e l intestazione'
              ' giusta: gia fatti.' % len(gia_fatti))
        for v in gia_fatti[:5]:
            print('   %s' % v['storage_path'].split('/')[-1])
        if len(gia_fatti) > 5:
            print('   ... e altri %d' % (len(gia_fatti) - 5))

    identici = [v for v in voci if v['md5_bucket']
                and v['md5_nuovo'] == v['md5_bucket']
                and not v['percorso_cambia']
                and v.get('cache_bucket') != I.CACHE_IMMUTABILE
                and v['azione'] != 'fermo-non-riscrivibile']
    if identici:
        sys.exit('ERRORE: %d file avrebbero i byte identici a quelli gia nel '
                 'bucket, la CDN non si sbloccherebbe:\n   %s'
                 % (len(identici),
                    '\n   '.join(v['storage_path'] for v in identici[:10])))

    # -O3 non sempre migliora un file gia' ottimizzato: su quelli serve l'ETag
    # nuovo, non il peso, quindi un aumento si accetta — ma si dice.
    # Solo per chi nel bucket c'e' gia': per un file mai caricato non esiste un
    # "prima" con cui confrontarsi.
    piu_pesanti = [v for v in voci
                   if v['byte_bucket'] and v['byte_nuovo'] > v['byte_bucket']]
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
