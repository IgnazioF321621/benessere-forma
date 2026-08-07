#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nomenclatura v2 — proposta del nome e generazione dello slug.

Modulo condiviso da prepara.py e server.py, cosi' la regola sta in un posto solo.
Il nome proposto e' una PROPOSTA: decide Ignazio guardando la GIF.
"""
import re
import unicodedata

# Regola 3 — lista chiusa dei nomi propri ammessi (12 voci)
NOMI_PROPRI = ['Scott', 'Zottman', 'Arnold', 'Pendlay', 'Bulgarian', 'Jefferson',
               'Svend', 'Larsen', 'Kelso', 'Russian', 'Yates', 'Bosu']

# Regola 3 — sigle e designazioni tecniche nella forma canonica
SIGLE = ['EZ', 'TRX', 'IT', 'Y-W', 'V', 'T', 'X']

# Regola 2 — i default si omettono
DEFAULT_OMESSI = ['bilaterale', 'simultaneo', 'simultanea']


def nfc(s):
    return unicodedata.normalize('NFC', s or '')


def senza_accenti(s):
    """Toglie i segni diacritici, lasciando intatto tutto il resto.

    E' l'UNICO traslitteratore del cantiere: lo usano sia slug() sia la
    costruzione dei percorsi in pianifica.py. Due traslitteratori con regole
    diverse sarebbero un difetto peggiore di quello che questo chiude.

    NFC prima di decomporre: i nomi file macOS sono in forma decomposta e
    tagliare byte per byte lascia il segno diacritico orfano.
    Non tocca punteggiatura, spazi o maiuscole: l'apostrofo resta apostrofo,
    perche' nel percorso e' ammesso. Nello slug lo converte slug() stesso.
    """
    s = unicodedata.normalize('NFD', nfc(s))
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def percorso_ascii(nome):
    """Nome file ASCII per il bucket. L'accento resta in nome_italiano e sul Mac.

    Storage rifiuta le chiavi NFD con 400 InvalidKey e nessuna delle righe
    esistenti ha caratteri non-ASCII nel percorso: la regola si tiene alla fonte.
    """
    return senza_accenti(nome)


def slug(nome):
    """Regola 6 — kebab-case ASCII dal solo nome unico.

    L'apostrofo diventa trattino, mai eliminato.
    """
    s = senza_accenti(nfc(nome).replace("'", '-').replace('’', '-'))
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def proponi(nome_file_senza_estensione):
    """Costruisce la proposta di nome canonico partendo dal nome file attuale.

    Fa solo cio' che si puo' dedurre dal testo senza guardare la GIF:
      - toglie la parte in inglese fra parentesi
      - scrive "gradi" per esteso al posto del simbolo
      - toglie i default (bilaterale, simultaneo)
      - sentence case, con nomi propri e sigle rimessi in forma canonica

    NON riordina i termini in [Movimento][Attrezzo][Variante][Posizione]:
    quello richiede di sapere cosa mostra la GIF, e lo decide Ignazio.
    """
    s = nfc(nome_file_senza_estensione)

    # la parte in inglese fra parentesi: si tiene la versione italiana
    s = re.sub(r'\s*\([^)]*\)\s*', ' ', s)

    # Regola 5 — il simbolo grado e' abolito nel nome
    s = re.sub(r'\s*°', ' gradi', s)

    # separatori residui e spazi multipli
    s = s.replace('_', ' ')
    s = re.sub(r'\s+', ' ', s).strip(' -')

    # Regola 2 — default omessi
    for d in DEFAULT_OMESSI:
        s = re.sub(r'(?i)\b%s\b' % re.escape(d), '', s)
    s = re.sub(r'\s+', ' ', s).strip(' -')

    if not s:
        return ''

    # Regola 3 — tutto minuscolo, poi la prima lettera, poi le eccezioni
    s = s.lower()
    s = s[0].upper() + s[1:]
    for np in NOMI_PROPRI:
        s = re.sub(r'(?i)\b%s\b' % re.escape(np), np, s)
    for sg in SIGLE:
        s = re.sub(r'(?i)(?<![a-z0-9])%s(?![a-z0-9])' % re.escape(sg.lower()), sg, s)

    return s.strip()
