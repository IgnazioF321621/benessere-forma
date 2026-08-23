#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Piano di migrazione di una zona — SOLA LETTURA.

Non scrive nulla su Storage, biblioteca_gif, esercizi_catalog o Sheet: produce
soltanto lavoro/piano_<zona>.json e un TSV leggibile.

L'aggancio file -> riga -> codice si fa per IMPRONTA SHA-256, mai per nome.

Quattro tipi di operazione:
  nuova                    il file non e' nel bucket: oggetto nuovo + riga nuova
  slug invariato           il percorso cambia ma lo slug no: rinomina + storage_path
  slug nuovo, righe doppie lo slug cambia E un codice punta alla riga
  slug nuovo, in place     lo slug cambia e NESSUN codice punta alla riga

------------------------------------------------------------------------------
PERCHE' I DUE "SLUG NUOVO" SONO ETICHETTE DIVERSE
------------------------------------------------------------------------------
Erano un'etichetta sola, `slug nuovo`, e coprivano due operazioni che non hanno
niente in comune se non il fatto che lo slug cambia:

  con codici    serve l'ordine a righe doppie — si inserisce la riga nuova, si
                aspetta il sync manuale del Sheet, si verifica, si cancella la
                vecchia. Quattro passi e una fermata, perche' fra il cambio qui e
                il Sheet passano ore e in mezzo `gif_slug` punterebbe nel vuoto.
  senza codici  non c'e' nessuna catena da proteggere: si aggiorna lo slug sulla
                riga e basta. Un passo, nessuna fermata.

Un'etichetta sola per due operazioni ha sbagliato TRE volte in tre punti che la
leggevano — passo2 avrebbe inserito 24 righe doppie invece di 22 occupando lo
slug che la fase 3 doveva prendere, passo5 avrebbe contato 24 cancellazioni
invece di 22, e passo_prova le mostrava mescolate. Ogni volta la riparazione era
di due righe e sembrava locale. Alla terza si corregge il nome → [L35].

⚠️ L'ETICHETTA E' UNA PREVISIONE, NON UN PERMESSO. Dice quale operazione era
prevista quando il piano e' stato scritto, non chi punta a quella riga adesso:
il piano non e' il verbale di cio' che e' stato fatto [L34]. Chi esegue rilegge
VIVO il catalogo e si ferma se non coincide. Le due cose non si sostituiscono —
l'etichetta toglie l'ambiguita' su cosa fare, la lettura viva dice se e' ancora
lecito farlo.

Uso:  python3 pianifica.py "Bicipiti e Braccia"
"""
import argparse
import collections
import csv
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import impronte_zona, leggi_tutto, nfc, sha_file  # noqa: E402
from nomenclatura import percorso_ascii, slug  # noqa: E402

BASE = Path(__file__).parent
GIF_ROOT = Path(os.environ.get('BIBLIOTECA_ROOT',
                               '/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi'))

# Il vocabolario delle operazioni vive qui, dove viene scritto, e i lettori lo
# importano invece di ripetere la stringa. Una stringa ripetuta in cinque punti
# e' un'etichetta che nessuno puo' rinominare senza dimenticarne uno.
OP_NUOVA = 'nuova'
OP_SLUG_INVARIATO = 'slug invariato'
OP_SLUG_DOPPIE = 'slug nuovo, righe doppie'      # un codice punta alla riga
OP_SLUG_IN_PLACE = 'slug nuovo, in place'        # nessun codice punta alla riga
OP_SLUG = (OP_SLUG_DOPPIE, OP_SLUG_IN_PLACE)     # tutte quelle in cui lo slug cambia

# I nomi hanno UNA sola fonte: il pannello di conferma, cioe' l'unico posto in cui
# il nome e' stato scelto guardando la GIF. Nessun nome entra qui per altre strade.


def registro_ultimo():
    """Registro append-only: per ogni impronta vale l'ultima riga scritta."""
    p = BASE / 'esiti' / 'registro_decisioni.tsv'
    out = {}
    with open(p, encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh, delimiter='\t'):
            if r.get('sha256'):
                out[r['sha256']] = r
    return out


def ponte_480(zona, presenti):
    """percorso del file sul Mac -> storage_path del suo oggetto RIDOTTO nel bucket.

    Senza questo, un file gia' migrato risulta «mai caricato». L'aggancio storico
    e' per SHA-256: si prende l'impronta del file sul Mac e la si cerca fra quelle
    degli oggetti del bucket. Dal 15 agosto 2026 quel confronto non puo' piu'
    riuscire — nel bucket ci sono i byte RIDOTTI, che hanno un'impronta diversa
    per definizione, ed e' il punto della regola dei 480px. Misurato su Pettorali
    a migrazione conclusa: 0 impronte del Mac su 82 presenti nel bucket, 82 su 82
    quelle ridotte. Ogni riga usciva `nuova`, con 82 collisioni di slug.

    E' la QUARTA comparsa dello stesso difetto — dopo passo1, _carica_nuova e
    verifica_worker — e la stessa causa: due artefatti per lo stesso esercizio,
    e un aggancio che non dice di quale dei due parla → [L35].

    Il legame fra i due artefatti e' scritto in un posto solo, il piano dei 480px,
    che infatti non si cancella mai: `origine_mac` dice da quale file del Mac
    provengono i byte che stanno all'indirizzo `storage_path`. Qui si legge di li'.

    Si tengono solo le voci il cui oggetto e' DAVVERO nel bucket: il piano dei
    480px elenca anche cio' che si deve ancora caricare, e quelle righe devono
    continuare a risultare `nuova`, perche' lo sono.

    DUE INDICI, non uno (22 agosto 2026)
    ------------------------------------
    `origine_mac` e' un PERCORSO, e il primo lavoro del cantiere e' rinominare i
    file sul Mac: appena il pannello applica le rinomine, quel percorso non esiste
    piu'. Misurato su Spalle e Cuffia subito dopo le 62 rinomine: 3 origine_mac
    valide su 63, e 61 righe uscite `nuova` con 33 collisioni di slug. E' la stessa
    causa gia' scritta per le cache delle impronte — «mai indicizzare sul percorso:
    il cantiere rinomina» — che qui era rimasta.

    Il ripiego e' l'impronta: `sha256_bucket_ora` e' l'impronta del file PRIMA
    della riduzione, cioe' quella che il file sul Mac ha ancora, perche' la
    rinomina cambia il nome e non i byte.

    I due indici servono entrambi e non si sostituiscono:
      - il percorso e' esatto quando e' valido, e disambigua due oggetti che hanno
        lo stesso contenuto (Addominali ne ha 8, Gambe 3);
      - i piani piu' vecchi non hanno `sha256_bucket_ora` — Pettorali, 82 voci su
        82 — perche' quella zona e' entrata nel bucket gia' ridotta e un "bucket
        ora" non c'era: li' funziona solo il percorso.

    Un'impronta che porta a DUE storage_path diversi non aggancia niente: nel
    dubbio la riga resta `nuova` e la si guarda, che e' il ripiego prudente di
    [L10], non quello silenzioso.
    """
    p = BASE / 'lavoro' / '_480' / ('%s.json' % zona.lower().replace(' ', '-'))
    if not p.exists():
        return {}, {}, 0
    voci = json.loads(p.read_text(encoding='utf-8'))['voci']
    ponte, per_impronta, ambigue = {}, {}, set()
    for v in voci:
        sp = nfc(v['storage_path'])
        if sp not in presenti:
            continue
        if v.get('origine_mac'):
            ponte[nfc(v['origine_mac'])] = sp
        s = v.get('sha256_bucket_ora')
        if s:
            if s in per_impronta and per_impronta[s] != sp:
                ambigue.add(s)
            per_impronta[s] = sp
    for s in ambigue:
        per_impronta.pop(s, None)
    return ponte, per_impronta, len(set(ponte.values()) | set(per_impronta.values()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zona')
    args = ap.parse_args()
    Z = args.zona
    cartella = GIF_ROOT / Z

    per_sha, falliti, err = impronte_zona(
        Z, BASE / 'lavoro' / '_impronte' / (slug(Z) + '.json'), verbose=False)
    if err:
        sys.exit('bucket non raggiungibile: %s' % err)
    if falliti:
        sys.exit('%d oggetti senza impronta: piano non costruibile' % len(falliti))
    presenti = {p for lista in per_sha.values() for p in lista}
    ponte, ponte_sha, quanti = ponte_480(Z, presenti)
    if ponte or ponte_sha:
        print('  ponte dal piano dei 480px: %d file del Mac collegati al loro'
              ' oggetto ridotto' % quanti)

    bib, e = leggi_tutto('biblioteca_gif', 'slug,nome_italiano,categoria,storage_path', 'slug')
    if e:
        sys.exit('biblioteca_gif: %s' % e)
    cat, e = leggi_tutto('esercizi_catalog', 'codice,nome,gruppo_target,gif_slug', 'codice')
    if e:
        sys.exit('esercizi_catalog: %s' % e)

    per_path = collections.defaultdict(list)
    for b in bib:
        if b.get('storage_path'):
            per_path[nfc(b['storage_path'])].append(b)
    per_slug_bib = collections.defaultdict(list)
    for b in bib:
        per_slug_bib[b['slug']].append(b)
    per_slug_cod = collections.defaultdict(list)
    for c in cat:
        if c.get('gif_slug'):
            per_slug_cod[c['gif_slug']].append(c)

    reg = registro_ultimo()

    righe = []
    for f in sorted((nfc(x) for x in os.listdir(cartella) if x.lower().endswith('.gif')),
                    key=str.lower):
        sha = sha_file(cartella / f)
        # Prima l'aggancio per impronta, che resta il criterio [L9]. Se non trova
        # nulla, il file puo' essere gia' nel bucket in forma RIDOTTA, con
        # un'impronta diversa: allora lo dice il piano dei 480px, che e' l'unico
        # posto in cui il legame fra i due artefatti resta scritto.
        paths = per_sha.get(sha, [])
        if not paths:
            # percorso prima (esatto quando vale, e disambigua i contenuti gemelli),
            # impronta come ripiego dopo che il pannello ha rinominato i file
            sp = ponte.get(nfc(str(cartella / f))) or ponte_sha.get(sha)
            if sp:
                paths = [sp]
        bib_rows = [r for p in paths for r in per_path.get(p, [])]
        codici = []
        for r in bib_rows:
            for c in per_slug_cod.get(r['slug'], []):
                if c['codice'] not in [x['codice'] for x in codici]:
                    codici.append(c)

        dec = reg.get(sha, {})
        nome = dec.get('nome_confermato', '').strip()
        origine_nome = 'pannello'
        if not nome:
            sys.exit('riga senza nome confermato: %s' % f)

        slug_nuovo = slug(nome)
        slug_attuale = bib_rows[0]['slug'] if bib_rows else None
        path_attuale = paths[0] if paths else None
        # Il percorso nel bucket e' ASCII; l'accento resta in nome_italiano e
        # nel file sul Mac. Traslitterato alla fonte, non a mano riga per riga.
        path_dest = '%s/%s.gif' % (Z, percorso_ascii(nome))

        if not paths:
            op = OP_NUOVA
        elif slug_nuovo != slug_attuale:
            # La discriminante e' se un codice punta alla riga: e' cio' che decide
            # se serve l'ordine a righe doppie o basta l'aggiornamento in place.
            op = OP_SLUG_DOPPIE if codici else OP_SLUG_IN_PLACE
        else:
            op = OP_SLUG_INVARIATO

        righe.append({
            'file_mac': f, 'sha256_mac': sha, 'bytes': (cartella / f).stat().st_size,
            'nome_finale': nome, 'origine_nome': origine_nome,
            'slug_attuale': slug_attuale, 'slug_nuovo': slug_nuovo,
            'slug_cambia': bool(slug_attuale) and slug_nuovo != slug_attuale,
            'codici': [{'codice': c['codice'], 'nome_catalogo': c['nome'],
                        'gruppo_target': c.get('gruppo_target'),
                        'gif_slug': c.get('gif_slug')} for c in codici],
            'storage_path_attuale': path_attuale,
            'storage_path_dest': path_dest,
            'percorso_cambia': path_attuale != path_dest,
            'nome_file_mac_allineato': f == '%s.gif' % nome,
            'operazione': op,
        })

    # ---- controlli di coerenza -------------------------------------------
    per_slug_nuovo = collections.defaultdict(list)
    for r in righe:
        per_slug_nuovo[r['slug_nuovo']].append(r)
    collisioni_interne = {s: [r['nome_finale'] for r in v]
                          for s, v in per_slug_nuovo.items() if len(v) > 1}

    # uno slug nuovo che esiste gia' in biblioteca_gif e non e' la riga stessa
    collisioni_esterne = []
    for s, v in per_slug_nuovo.items():
        miei = {r['slug_attuale'] for r in v}
        for b in per_slug_bib.get(s, []):
            if s not in miei:
                collisioni_esterne.append({'slug': s, 'nome_finale': v[0]['nome_finale'],
                                           'riga_esistente': b['storage_path']})

    per_dest = collections.defaultdict(list)
    for r in righe:
        per_dest[r['storage_path_dest']].append(r['nome_finale'])
    collisioni_percorso = {p: v for p, v in per_dest.items() if len(v) > 1}

    # un percorso di destinazione che oggi e' occupato da un ALTRO oggetto
    sovrascritture = []
    occupati = {p: r for r in righe for p in ([r['storage_path_attuale']]
                                              if r['storage_path_attuale'] else [])}
    for r in righe:
        alt = occupati.get(r['storage_path_dest'])
        if alt is not None and alt['sha256_mac'] != r['sha256_mac']:
            sovrascritture.append({'dest': r['storage_path_dest'],
                                   'chi_scrive': r['nome_finale'],
                                   'chi_occupa_ora': alt['nome_finale'],
                                   'codice_occupante': [c['codice'] for c in alt['codici']]})

    # Codici che perderebbero la GIF.
    # Un codice del piano NON e' orfano: il suo slug vecchio sparisce, ma la riga nuova
    # con lo slug nuovo esiste gia' e il Sheet lo riallinea. Orfano e' il codice che
    # punta a uno slug in via di cancellazione senza essere quello della riga: tipico
    # di un codice di un'altra zona che condivideva lo slug.
    slug_vecchi = {r['slug_attuale'] for r in righe if r['slug_cambia']}
    codici_del_piano = {c['codice'] for r in righe for c in r['codici']}
    orfani = []
    for s in slug_vecchi:
        riga = next(r for r in righe if r['slug_attuale'] == s)
        suoi = {c['codice'] for c in riga['codici']}
        for c in per_slug_cod.get(s, []):
            if c['codice'] not in suoi:
                orfani.append({'codice': c['codice'], 'nome': c['nome'],
                               'slug_che_sparisce': s,
                               'anche_nel_piano': c['codice'] in codici_del_piano})

    non_ascii = [{'nome': r['nome_finale'], 'percorso': r['storage_path_dest']}
                 for r in righe if any(ord(ch) > 127 for ch in r['storage_path_dest'])]

    piano = {'zona': Z, 'aggancio': 'sha256_mac', 'righe': righe,
             'percorsi_non_ascii': non_ascii,
             'collisioni_slug_interne': collisioni_interne,
             'collisioni_slug_esterne': collisioni_esterne,
             'collisioni_percorso': collisioni_percorso,
             'sovrascritture_percorso': sovrascritture,
             'codici_senza_gif': orfani}
    piani = BASE / 'lavoro' / '_piani'
    piani.mkdir(parents=True, exist_ok=True)
    dest = piani / ('piano_%s.json' % slug(Z))
    dest.write_text(json.dumps(piano, ensure_ascii=False, indent=1), encoding='utf-8')

    tsv = piani / ('piano_%s.tsv' % slug(Z))
    col = ['operazione', 'codice', 'nome_finale', 'slug_attuale', 'slug_nuovo',
           'slug_cambia', 'storage_path_attuale', 'storage_path_dest', 'sha256_mac']
    with open(tsv, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, delimiter='\t', lineterminator='\r\n')
        w.writerow(col)
        for r in righe:
            w.writerow([r['operazione'], ','.join(c['codice'] for c in r['codici']) or '-',
                        r['nome_finale'], r['slug_attuale'] or '-', r['slug_nuovo'],
                        'SI' if r['slug_cambia'] else 'no',
                        r['storage_path_attuale'] or '-', r['storage_path_dest'],
                        r['sha256_mac'][:12]])

    c = collections.Counter(r['operazione'] for r in righe)
    print('PIANO "%s"  —  %d righe' % (Z, len(righe)))
    for k in (OP_SLUG_INVARIATO, OP_SLUG_DOPPIE, OP_SLUG_IN_PLACE, OP_NUOVA):
        print('  %-15s %3d' % (k, c[k]))
    print('  %-15s %3d' % ('TOTALE', sum(c.values())))
    print('  percorso che cambia : %d' % sum(1 for r in righe if r['percorso_cambia']))
    print('  slug che cambia     : %d' % sum(1 for r in righe if r['slug_cambia']))
    print('\n  collisioni slug fra le righe del piano : %s' % (collisioni_interne or 'nessuna'))
    print('  collisioni slug con righe esistenti    : %s' % (collisioni_esterne or 'nessuna'))
    print('  collisioni di percorso fra le righe    : %s' % (collisioni_percorso or 'nessuna'))
    print('  destinazioni oggi occupate da altri    : %d' % len(sovrascritture))
    for s in sovrascritture:
        print('     %s  <- "%s"  occupato da "%s" %s'
              % (s['dest'], s['chi_scrive'], s['chi_occupa_ora'], s['codice_occupante']))
    print('  percorsi NON ASCII (devono essere 0)   : %d' % len(non_ascii))
    for x in non_ascii:
        print('     %s' % x['percorso'])
    print('  codici che resterebbero senza GIF      : %d' % len(orfani))
    for o in orfani:
        print('     %s %s (slug %s)' % (o['codice'], o['nome'], o['slug_che_sparisce']))
    print('\n  scritto: %s\n           %s' % (dest, tsv))


if __name__ == '__main__':
    main()
