#!/usr/bin/env python3
"""
auditor_nomenclatura.py — audit del catalogo contro le regole di nomenclatura v2
(CLAUDE.md, sezione "Nomenclatura esercizi — regole normative (19 luglio 2026, v2)").

SOLA LETTURA. Non scrive mai su DB, Storage, Sheet o cartella Mac.
Produce un piano di analisi: markdown su stdout + JSON su file.

Uso:
    python3 tools/auditor_nomenclatura.py [--json out.json] [--no-hash]

--no-hash salta il download delle GIF (molto piu veloce, ma la sezione
COLLISIONI non potra distinguere collisione di soli nomi da collisione
anche di contenuto).
"""
import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

# --------------------------------------------------------------------------
# Config / credenziali
# --------------------------------------------------------------------------
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')


def load_env(path=ENV_PATH):
    env = {}
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                env[k] = v
    return env


ENV = load_env()
URL = ENV['SUPABASE_URL'].rstrip('/')
KEY = ENV['SUPABASE_SERVICE_ROLE_KEY']


def req(path, raw=False, hdrs=None):
    h = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'}
    if hdrs:
        h.update(hdrs)
    r = urllib.request.Request(URL + path, headers=h, method='GET')
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            data = resp.read()
            return resp.status, (data if raw else data.decode('utf-8', 'replace'))
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def page(query):
    """SELECT paginata: PostgREST tronca a 1000 righe."""
    out, off = [], 0
    while True:
        status, body = req(query, hdrs={'Range': '%d-%d' % (off, off + 999)})
        if status not in (200, 206):
            sys.exit('ERRORE query %s: HTTP %s' % (query, status))
        rows = json.loads(body)
        out += rows
        if len(rows) < 1000:
            break
        off += 1000
    return out


# --------------------------------------------------------------------------
# Regole v2
# --------------------------------------------------------------------------
# Regola 3, categoria 2: lista CHIUSA dei nomi propri (9 voci).
# 'Hack' NON e in lista: hack squat e termine di sala, non eponimo.
# 'Bulgarian' e l'unica voce non-cognome: aggettivo di luogo inglese lessicalizzato.
NOMI_PROPRI = ['Scott', 'Zottman', 'Arnold', 'Pendlay', 'Bulgarian',
               'Jefferson', 'Svend', 'Larsen', 'Kelso']
NOMI_PROPRI_LOW = {n.lower(): n for n in NOMI_PROPRI}

# Regola 3, categoria 3: sigle e designazioni tecniche. Regola APERTA, non lista:
# si rispetta la forma canonica di qualunque acronimo/sigla scritto in maiuscolo.
# Il seed serve a normalizzare le forme note; il riconoscimento generale sotto
# copre anche le sigle future (i ~600 esercizi che entreranno).
SIGLE_NOTE = ['EZ', 'TRX', 'IT', 'Y-W', 'V', 'W', 'GHD', 'HIIT', 'RDL', 'KB', 'DB', 'BB', 'T-spine']
SIGLE_LOW = {s.lower(): s for s in SIGLE_NOTE}


def is_sigla(token_core, original):
    """Riconosce una sigla/designazione tecnica dalla forma canonica.

    Criterio aperto: e sigla se nel nome corrente e scritta tutta in maiuscolo
    (eventualmente con trattini/punti) ed e corta, oppure se e fra le note.
    Cosi vale anche per acronimi mai visti prima.
    """
    if token_core.lower() in SIGLE_LOW:
        return SIGLE_LOW[token_core.lower()]
    letters = re.sub(r'[^A-Za-z]', '', original)
    if letters and letters.isupper() and 1 <= len(letters) <= 5:
        return original
    return None

# Regola 4: vocabolario panche chiuso a 5 voci (campo Posizione).
PANCHE_OK = ['panca piana', 'panca inclinata', 'panca declinata',
             'panca verticale', 'panca Scott']
# forme assorbite da "panca verticale"
PANCA_ASSORBITE = ['panca 90 gradi', 'panca 90', 'panca con schienale',
                   'panca schienale alto', 'panca a 90 gradi']

# Falsi positivi noti da preservare (vincolo esplicito del brief)
LEX_MOVIMENTI = ['stacco da terra', 'stacco rumeno']   # "da terra" non e Posizione
APPOGGIO_ARTI = re.compile(
    r'(piedi su panca|piede posteriore panca|gamba tesa panca|gambe su panca|tallone su panca|'
    r'ginocchio su panca|mano su panca|appoggio su panca|appoggio panca|mani elevate panca|'
    r'piedi a terra|piedi rialzati)',
    re.I)

# La panca regge un arto o e il bersaglio del movimento, NON l'assetto del busto:
# il vocabolario chiuso delle 5 panche non si applica per costruzione.
# Stessa famiglia di "piedi su panca", gia preservata negli audit precedenti.
# Elenco ratificato da Ignazio (19/07/2026) — backstop esplicito oltre al regex sopra.
PANCA_APPOGGIO_CODICI = {
    'EX041',  # Step-up alto su panca — bersaglio del passo
    'EX063',  # Dip panca piedi a terra
    'EX338',  # Flessione polsi bilanciere appoggio su panca
    'EX339',  # Flessione polsi inversa bilanciere in ginocchio su panca
    'EX379',  # Piegamenti declinati panca — piedi elevati
    'EX383',  # Piegamenti mani elevate panca
    'EX484',  # Rematore manubrio un braccio ginocchio su panca
    'EX485',  # Rematore manubrio un braccio mano su panca
    'EX514',  # Dip panca piedi rialzati
    'EX543',  # Kickback manubrio un braccio busto flesso appoggio panca
    'EX274',  # Squat su panca manubri — box squat, la panca e il bersaglio
}

# Attrezzo dedicato, non posizione del busto: postazioni a se stanti che il
# vocabolario delle 5 panche non puo assorbire. Restano da lavorare a mano.
PANCA_ATTREZZO_DEDICATO = {
    'EX238',  # Iperestensione inversa panca — supporto del bacino
    'EX445',  # Estensione dorsale panca romana 45 gradi
    'EX446',  # Estensione dorsale panca romana 45 gradi con disco
    'EX447',  # Estensione dorsale panca romana 45 gradi con manubrio
}


def strip_accents(s):
    s = unicodedata.normalize('NFKD', s or '')
    return ''.join(c for c in s if not unicodedata.combining(c))


def gradi_expand(s):
    """Regola 5: il simbolo ° e abolito ovunque, si scrive 'gradi'."""
    s = re.sub(r'\s*°', ' gradi', s or '')
    return re.sub(r'\s+', ' ', s).strip()


def panche_normalize(s):
    """Regola 4: 'panca verticale' assorbe ogni forma preesistente."""
    out = s
    for form in PANCA_ASSORBITE:
        out = re.sub(re.escape(form), 'panca verticale', out, flags=re.I)
    # "panca 90 gradi" puo essere emerso dopo gradi_expand
    out = re.sub(r'panca\s+90\s+gradi', 'panca verticale', out, flags=re.I)
    return out


def capitalize_v2(s):
    """Regola 3: maiuscola su prima lettera + nomi propri (lista chiusa)
    + sigle e designazioni tecniche (regola aperta, forma canonica)."""
    tokens = s.split(' ')
    out = []
    for tok in tokens:
        core = re.sub(r'[^A-Za-zÀ-ÿ\-]', '', tok)
        low = core.lower()
        if low in NOMI_PROPRI_LOW:                       # categoria 2
            out.append(re.sub(re.escape(core), NOMI_PROPRI_LOW[low], tok, flags=re.I))
            continue
        sig = is_sigla(core, core)                        # categoria 3
        if sig:
            out.append(tok.replace(core, sig) if core else tok)
            continue
        out.append(tok.lower())
        # la posizione nel nome e irrilevante: nessun trattamento speciale per i==0
    res = ' '.join(out)
    # maiuscola alla prima lettera del nome
    for i, ch in enumerate(res):
        if ch.isalpha():
            res = res[:i] + ch.upper() + res[i + 1:]
            break
    return res


def nome_v2(nome):
    """Nome unico v2 a partire dal nome corrente."""
    s = gradi_expand(nome)
    s = panche_normalize(s)
    s = capitalize_v2(s)
    return re.sub(r'\s+', ' ', s).strip()


def slug_v2(nome_v2_str):
    """Regola 6: slug monolingue, kebab-case ASCII, dal solo nome unico."""
    s = strip_accents(nome_v2_str).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return re.sub(r'-+', '-', s).strip('-')


# --------------------------------------------------------------------------
# Rilevazione violazioni
# --------------------------------------------------------------------------
def violazioni(row, nv2, sv2):
    v = []
    nome = row.get('nome') or ''
    slug = row.get('gif_slug') or ''
    low = strip_accents(nome).lower()

    if '°' in nome:
        v.append('gradi: simbolo ° residuo (regola 5)')

    if nome != nv2:
        # distingui il perche
        if capitalize_v2(nome) != nome and gradi_expand(nome) == nome and panche_normalize(nome) == nome:
            v.append('maiuscole non conformi (regola 3)')
        else:
            v.append('nome da rigenerare (regole 3/4/5)')

    # maiuscole: segnalazione dedicata anche quando concorre ad altro.
    # Nomi propri (cat. 2) e sigle tecniche (cat. 3) NON sono violazioni.
    tokens = [t for t in nome.split(' ') if t]
    for i, tok in enumerate(tokens):
        core = re.sub(r'[^A-Za-zÀ-ÿ\-]', '', tok)
        if not core or i == 0:
            continue
        if (core[0].isupper()
                and core.lower() not in NOMI_PROPRI_LOW
                and not is_sigla(core, core)):
            v.append('maiuscola su termine comune: "%s" (regola 3)' % core)
            break

    # panche: forma fuori vocabolario (regola 4).
    # Esclusi per costruzione i casi in cui la panca regge un arto o e il bersaglio
    # del movimento: li il vocabolario chiuso non si applica.
    codice = row.get('codice')
    if ('panca' in low
            and not APPOGGIO_ARTI.search(nome)
            and codice not in PANCA_APPOGGIO_CODICI):
        ok = any(strip_accents(p).lower() in low for p in PANCHE_OK)
        if not ok:
            m = re.search(r'panca[a-z0-9 ]{0,20}', low)
            term = m.group(0).strip() if m else 'panca'
            if codice in PANCA_ATTREZZO_DEDICATO:
                v.append('panca fuori vocabolario [attrezzo dedicato]: "%s" (regola 4)' % term)
            else:
                v.append('panca fuori vocabolario [normalizzazione]: "%s" (regola 4)' % term)

    if slug and slug != sv2:
        v.append('slug da rigenerare: monolingue (regola 6)')
    if not slug:
        v.append('gif_slug assente')

    # nome_en: deprecata, si ignora — mai segnalata come violazione (regola 1)
    return v


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--json', default='auditor_nomenclatura_out.json')
    ap.add_argument('--no-hash', action='store_true')
    args = ap.parse_args()

    cat = page('/rest/v1/esercizi_catalog?select=codice,nome,nome_en,gif_slug,gruppo_target')
    bib = page('/rest/v1/biblioteca_gif?select=slug,storage_path')
    byslug = {b['slug']: b for b in bib}

    rows = []
    for c in sorted(cat, key=lambda x: x['codice']):
        nv2 = nome_v2(c.get('nome') or '')
        sv2 = slug_v2(nv2)
        rows.append({
            'codice': c['codice'],
            'nome': c.get('nome') or '',
            'nome_v2': nv2,
            'slug': c.get('gif_slug') or '',
            'slug_v2': sv2,
            'gruppo_target': c.get('gruppo_target') or '',
            'storage_path': (byslug.get(c.get('gif_slug')) or {}).get('storage_path'),
            'violazioni': violazioni(c, nv2, sv2),
        })

    conformi = [r for r in rows if not r['violazioni']]
    darigen = [r for r in rows if r['violazioni']]

    # --- COLLISIONI slug v2 (il dato che conta di piu) ---
    per_slug = defaultdict(list)
    for r in rows:
        per_slug[r['slug_v2']].append(r)
    collisioni = {k: v for k, v in per_slug.items() if len(v) > 1}

    # hash solo per i codici coinvolti in collisione
    if not args.no_hash:
        for k, group in collisioni.items():
            for r in group:
                sp = r['storage_path']
                if not sp:
                    r['sha256'] = None
                    continue
                st, body = req('/storage/v1/object/public/biblioteca-gif/' + urllib.parse.quote(sp), raw=True)
                r['sha256'] = hashlib.sha256(body).hexdigest() if st == 200 else None

    gradi_res = [r for r in rows if '°' in r['nome']]
    maiusc = [r for r in rows if any('maiuscol' in v for v in r['violazioni'])]
    panca_all = [r for r in rows if any('panca fuori vocabolario' in v for v in r['violazioni'])]
    panca_ded = [r for r in panca_all if any('[attrezzo dedicato]' in v for v in r['violazioni'])]
    panca_norm = [r for r in panca_all if any('[normalizzazione]' in v for v in r['violazioni'])]
    nome_cambia = [r for r in rows if r['nome'] != r['nome_v2']]

    # ---------------- output markdown ----------------
    P = print
    P('# Audit nomenclatura v2 — catalogo completo')
    P('')
    P('| Metrica | Valore |')
    P('|---|---:|')
    P('| Righe catalogo | **%d** |' % len(rows))
    P('| Conformi v2 | **%d** |' % len(conformi))
    P('| Da rigenerare | **%d** |' % len(darigen))
    P('| **Collisioni slug v2** | **%d gruppi / %d codici** |'
      % (len(collisioni), sum(len(v) for v in collisioni.values())))
    P('| Nomi che cambiano (trascinano rimappatura storico) | **%d** |' % len(nome_cambia))
    P('| Nomi con `°` residuo | %d |' % len(gradi_res))
    P('| Maiuscole non conformi | %d |' % len(maiusc))
    P('| **Panca fuori vocabolario** | **%d** (%d attrezzo dedicato + %d normalizzazione) |'
      % (len(panca_all), len(panca_ded), len(panca_norm)))
    P('')

    P('## Panca fuori vocabolario — da lavorare a mano')
    P('')
    P('Esclusi per costruzione i casi in cui la panca regge un arto o e il bersaglio')
    P('del movimento (%d codici): li il vocabolario chiuso non si applica.' % len(PANCA_APPOGGIO_CODICI))
    P('')
    for label, group in (('Attrezzo dedicato (non e una posizione del busto)', panca_ded),
                         ('Normalizzazione (manca il qualificatore di vocabolario)', panca_norm)):
        P('**%s — %d**' % (label, len(group)))
        P('')
        P('| Codice | Nome attuale | Nome v2 |')
        P('|---|---|---|')
        for r in group:
            P('| %s | %s | %s |' % (r['codice'], r['nome'], r['nome_v2']))
        P('')

    P('## COLLISIONI SLUG v2')
    P('')
    if not collisioni:
        P('_Nessuna collisione._')
    else:
        P('Rimuovere l\'inglese dallo slug elimina il disambiguatore fra nomi simili.')
        P('`hash uguale` = stessa GIF bit-a-bit; `hash diverso` = esercizi distinti che collassano sullo stesso slug.')
        P('')
        for k, group in sorted(collisioni.items(), key=lambda x: -len(x[1])):
            hashes = [g.get('sha256') for g in group]
            real = [h for h in hashes if h]
            tipo = ('CONTENUTO IDENTICO' if len(set(real)) == 1 and len(real) > 1
                    else 'solo nomi' if len(real) > 1 else 'non confrontabile')
            P('### `%s`  — %d codici — %s' % (k, len(group), tipo))
            P('')
            P('| Codice | Nome attuale | Nome v2 | SHA-256 |')
            P('|---|---|---|---|')
            for g in group:
                P('| %s | %s | %s | `%s` |' % (
                    g['codice'], g['nome'], g['nome_v2'],
                    (g.get('sha256') or '—')[:16]))
            P('')

    P('## Nomi con `°` residuo (regola 5)')
    P('')
    if not gradi_res:
        P('_Nessuno._')
    else:
        P('| Codice | Nome attuale | Nome v2 |')
        P('|---|---|---|')
        for r in gradi_res:
            P('| %s | %s | %s |' % (r['codice'], r['nome'], r['nome_v2']))
    P('')

    P('## Maiuscole non conformi (regola 3)')
    P('')
    P('Totale: **%d**. Primi 40:' % len(maiusc))
    P('')
    P('| Codice | Nome attuale | Nome v2 |')
    P('|---|---|---|')
    for r in maiusc[:40]:
        P('| %s | %s | %s |' % (r['codice'], r['nome'], r['nome_v2']))
    P('')

    P('## Tabella per riga (prime 60 non conformi)')
    P('')
    P('| Codice | Nome attuale | Nome v2 | Slug attuale | Slug v2 | Violazioni |')
    P('|---|---|---|---|---|---|')
    for r in darigen[:60]:
        P('| %s | %s | %s | `%s` | `%s` | %s |' % (
            r['codice'], r['nome'], r['nome_v2'],
            (r['slug'] or '—')[:44], r['slug_v2'][:44],
            ' · '.join(v.split('(')[0].strip() for v in r['violazioni'])))
    P('')
    P('_Tabella completa nel JSON._')

    with open(args.json, 'w', encoding='utf-8') as fh:
        json.dump({'totali': {'righe': len(rows), 'conformi': len(conformi),
                              'da_rigenerare': len(darigen),
                              'collisioni_gruppi': len(collisioni),
                              'collisioni_codici': sum(len(v) for v in collisioni.values())},
                   'rows': rows,
                   'collisioni': {k: [g['codice'] for g in v] for k, v in collisioni.items()}},
                  fh, ensure_ascii=False, indent=1)
    sys.stderr.write('\nJSON scritto in %s\n' % args.json)


if __name__ == '__main__':
    main()
