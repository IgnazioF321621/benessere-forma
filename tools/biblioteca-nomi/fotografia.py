#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fotografia dello stato — modulo di lettura condiviso da stato.py e verifica_sync.py.

SOLA LETTURA. Non scrive nulla su Supabase, Storage o Sheet.

Perche' esiste: i numeri di riferimento del progetto (quante righe a catalogo,
quanti slug risolvono, quanti oggetti nel bucket) venivano rimisurati a mano a
ogni sessione. Qui si misurano una volta e si salvano nel repo.

Due strumenti lo usano e devono vedere le STESSE cose:
  stato.py        fotografa e salva docs/STATO.md + docs/STATO.json
  verifica_sync.py confronta il vivo contro l'ultima fotografia

Regole che questo modulo tiene per conto di chi lo chiama:
  - paginazione sempre (PostgREST tronca a 1.000 righe)
  - ogni errore torna al chiamante, mai ingoiato
  - la chiave di servizio non viene mai stampata ne' scritta
"""
import collections
import datetime
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from impronte import elenco_bucket, leggi_tutto, nfc  # noqa: E402

BASE = Path(__file__).parent
REPO = BASE.parent.parent

# Le 9 zone del bucket. Cartelle legacy eliminate il 18/07/2026.
ZONE = ['Addominali e Core', 'Bicipiti e Braccia', 'Cardio e Conditioning',
        'Gambe e Glutei', 'Pettorali', 'Polpacci', 'Schiena e Trapezio',
        'Spalle e Cuffia', 'Tricipiti']

# Campi del catalogo su cui una regressione del sync fa danno visibile.
# nome     -> cambia cio' che l'utente legge e rompe lo storico (indicizzato per nome)
# gif_slug -> svuotato = la GIF non si trova piu'
# livello  -> perso = l'esercizio esce dai filtri del pool senza che nessuno lo sappia
CAMPI_SORVEGLIATI = ['nome', 'gif_slug', 'livello']


def ora():
    return datetime.datetime.now().isoformat(timespec='seconds')


# --------------------------------------------------------------- letture
def leggi_catalogo():
    return leggi_tutto(
        'esercizi_catalog',
        'codice,nome,gif_slug,livello,pattern,gruppo_target,uso,updated_at',
        'codice')


def leggi_biblioteca():
    return leggi_tutto('biblioteca_gif', 'slug,nome_italiano,categoria,storage_path', 'slug')


def leggi_bucket():
    """Elenco degli oggetti per zona. Non scarica i file: qui servono solo i nomi."""
    per_zona, tutti = {}, set()
    for z in ZONE:
        o, err = elenco_bucket(z + '/')
        if err:
            return None, None, 'bucket "%s": %s' % (z, err)
        nomi = {nfc('%s/%s' % (z, x['name'])) for x in o if x.get('id') is not None}
        per_zona[z] = len(nomi)
        tutti |= nomi
    return per_zona, tutti, None


# --------------------------------------------------------------- analisi
def quando(s):
    """Timestamp PostgREST -> datetime. None se non interpretabile.

    Serve un parser esplicito per due motivi:

    1. sul timestamp si fa ARITMETICA (ultimo - tolleranza), che sul testo non si fa;
    2. Postgres restituisce i decimali di secondo a precisione VARIABILE — nello
       stesso lotto convivono '...20:24:00.81+00:00' e '...20:24:00.821+00:00' — e
       datetime.fromisoformat() su alcune versioni non li accetta.

    Sul confronto puro il testo se la caverebbe: con questo formato l'ordine
    lessicografico coincide con quello temporale. Il difetto che ha prodotto
    "661 righe arenate su 667" non era il confronto, era prendere come riferimento
    il singolo massimo invece del lotto. Vedi righe_arenate().
    """
    if not s:
        return None
    t = s.strip().replace('Z', '+00:00')
    m = re.match(r'^(.*?)(?:\.(\d+))?([+-]\d{2}:?\d{2})?$', t)
    if not m:
        return None
    base, frazione, fuso = m.group(1), m.group(2) or '', m.group(3) or '+00:00'
    micro = (frazione + '000000')[:6]          # .81 -> 810000, non 81
    try:
        return datetime.datetime.fromisoformat('%s.%s%s' % (base, micro, fuso))
    except ValueError:
        return None


# Due righe scritte a meno di questo intervallo l'una dall'altra appartengono allo
# stesso lotto di sync. Misurato sul catalogo reale: le 667 righe di un sync stanno
# in 11 millisecondi. Due sync distinti sono lontani ore. Mezz'ora e' larghissima
# per non spezzare un lotto e stretta abbastanza per distinguerne due.
TOLLERANZA_LOTTO = datetime.timedelta(minutes=30)


def righe_arenate(catalogo, tolleranza=TOLLERANZA_LOTTO):
    """Righe non toccate dall'ultimo sync: sono state tolte dal foglio.

    Il sync fa upsert e riscrive OGNI riga presente nel foglio, tutte nello stesso
    lotto. Una riga tolta dal foglio smette semplicemente di essere riscritta:
    resta su Supabase con il suo updated_at vecchio mentre le altre avanzano.

    Il confronto e' con il LOTTO, non con il singolo massimo: dentro un sync i
    timestamp differiscono di millisecondi, e prenderli alla lettera farebbe
    risultare arenate 661 righe su 667 appena sincronizzate.

    E' l'unico caso in cui cancellare direttamente da Supabase e' sicuro:
    il foglio non le ha piu', quindi nessun sync futuro puo' riportarle indietro.
    """
    coppie = [(quando(r.get('updated_at')), r) for r in catalogo]
    validi = [(t, r) for t, r in coppie if t is not None]
    if not validi:
        return None, [], []
    ultimo = max(t for t, _ in validi)
    soglia = ultimo - tolleranza
    arenate = [r for t, r in validi if t < soglia]
    # una riga senza updated_at non e' databile: si segnala a parte, non si ignora
    non_databili = [r for t, r in coppie if t is None]
    return ultimo.isoformat(), sorted(arenate, key=lambda r: r['codice']), non_databili


def prossimo_libero(codici):
    """Primo EX### libero sopra il massimo. I gap sotto restano permanenti."""
    numeri = sorted(int(c[2:]) for c in codici if re.fullmatch(r'EX\d{3,}', c))
    if not numeri:
        return None, []
    massimo = numeri[-1]
    presenti = set(numeri)
    gap = ['EX%03d' % n for n in range(1, massimo) if n not in presenti]
    return 'EX%03d' % (massimo + 1), gap


def analizza(catalogo, biblioteca, bucket_per_zona, bucket_oggetti):
    """Tutti i conteggi di riferimento, in un colpo solo.

    Nessuna scrittura, nessun effetto: si puo' chiamare quante volte si vuole.
    """
    per_slug_bib = collections.defaultdict(list)
    for b in biblioteca:
        if b.get('slug'):
            per_slug_bib[b['slug']].append(b)

    con_slug = [c for c in catalogo if (c.get('gif_slug') or '').strip()]
    senza_slug = [c for c in catalogo if not (c.get('gif_slug') or '').strip()]

    # uno slug puntato da piu' codici: guardia "1 codice per slug"
    per_slug_cod = collections.defaultdict(list)
    for c in con_slug:
        per_slug_cod[c['gif_slug']].append(c['codice'])
    condivisi = {s: v for s, v in per_slug_cod.items() if len(v) > 1}

    # slug del catalogo senza riga in biblioteca_gif: la catena si spezza qui
    slug_rotti = sorted({c['gif_slug'] for c in con_slug if c['gif_slug'] not in per_slug_bib})

    # Le righe di biblioteca_gif in quattro caselle: puntata da un codice o no,
    # file presente nel bucket o no. Un solo numero aggregato non direbbe niente —
    # "orfano" da solo confonde una GIF viva che nessun codice usa (materia del
    # cantiere 16) con una voce morta che punta al vuoto (cantiere 3E).
    def ha_file(b):
        return nfc(b.get('storage_path') or '') in bucket_oggetti

    viva = [b for b in biblioteca if b['slug'] in per_slug_cod and ha_file(b)]
    rotta = [b for b in biblioteca if b['slug'] in per_slug_cod and not ha_file(b)]
    libera = [b for b in biblioteca if b['slug'] not in per_slug_cod and ha_file(b)]
    morta = [b for b in biblioteca if b['slug'] not in per_slug_cod and not ha_file(b)]

    # file nel bucket che nessuna riga indicizza
    path_indicizzati = {nfc(b.get('storage_path') or '') for b in biblioteca}
    file_senza_riga = sorted(bucket_oggetti - path_indicizzati)

    ultimo_sync, arenate, non_databili = righe_arenate(catalogo)
    prossimo, gap = prossimo_libero([c['codice'] for c in catalogo])

    return {
        'quando': ora(),
        # Dettaglio riga per riga dei soli campi sorvegliati: e' il termine di
        # paragone di verifica_sync.py, che senza questo non puo' accorgersi di un
        # valore riportato indietro. Poche decine di KB, e sono il dato che serve.
        '_catalogo_righe': [{'codice': c['codice'],
                             **{k: c.get(k) for k in CAMPI_SORVEGLIATI}}
                            for c in sorted(catalogo, key=lambda x: x['codice'])],
        'catalogo': {
            'righe': len(catalogo),
            'ultimo_sync': ultimo_sync,
            'righe_arenate': [{'codice': r['codice'], 'nome': r.get('nome'),
                               'updated_at': r.get('updated_at')} for r in arenate],
            'righe_senza_data': sorted(r['codice'] for r in non_databili),
            'prossimo_codice_libero': prossimo,
            'gap_permanenti': gap,
            'con_gif_slug': len(con_slug),
            'senza_gif_slug': len(senza_slug),
            'codici_senza_gif_slug': sorted(c['codice'] for c in senza_slug),
            'slug_condivisi_da_piu_codici': condivisi,
            'slug_senza_riga_in_biblioteca': slug_rotti,
            'per_uso': dict(collections.Counter((c.get('uso') or '(vuoto)') for c in catalogo)),
            'per_livello': dict(collections.Counter(
                (c.get('livello') or '(vuoto)') for c in catalogo)),
        },
        'biblioteca_gif': {
            'righe': len(biblioteca),
            'slug_distinti': len(per_slug_bib),
            # le quattro caselle, che sommate fanno il totale
            'viva': len(viva),              # un codice la punta e il file c'e'
            'rotta': len(rotta),            # un codice la punta ma il file non c'e' -> app rotta
            'libera': len(libera),          # GIF nel bucket che nessun codice usa -> cantiere 16
            'morta': len(morta),            # nessun codice e nessun file -> cantiere 3E
            'elenco_rotte': sorted(b['slug'] for b in rotta),
            'elenco_libere': sorted(b['slug'] for b in libera),
        },
        'bucket': {
            'oggetti': sum(bucket_per_zona.values()),
            'per_zona': bucket_per_zona,
            'file_senza_riga': file_senza_riga,
        },
    }


def fotografa():
    """Legge le tre fonti e restituisce (analisi, errore). Sola lettura."""
    cat, err = leggi_catalogo()
    if err:
        return None, 'esercizi_catalog: %s' % err
    bib, err = leggi_biblioteca()
    if err:
        return None, 'biblioteca_gif: %s' % err
    per_zona, oggetti, err = leggi_bucket()
    if err:
        return None, err
    return analizza(cat, bib, per_zona, oggetti), None
