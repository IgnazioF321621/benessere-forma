#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fase 7: cancella le righe vecchie della migrazione a righe doppie.

Una per una, e ognuna solo dopo aver constatato NELL'ISTANTE PRIMA che il suo
codice risolve gia' sullo slug nuovo: si interroga il Worker, si scarica il file
che restituisce e se ne confronta l'impronta con quella dell'oggetto atteso.
Non basta che il DB sia coerente con se stesso.

Al primo controllo che non passa ci si ferma: le righe gia' cancellate restano
cancellate (sono quelle che avevano superato la verifica), nessuna altra viene
toccata.

Backup di TUTTE le righe candidate prima di cancellarne una sola.
SOLA LETTURA senza --esegui.
"""
import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent
SUPA = 'https://qxiyeiahpoiliwpqslpr.supabase.co'
WORKER = 'https://zona-ai.ignazio-f.workers.dev/exercise-media?code=%s'
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) verifica-cantiere'}
KEY = re.search(r'SUPABASE_SERVICE_ROLE_KEY\s*=\s*"?([^"\n]+)',
                (BASE.parent.parent / 'worker' / '.dev.vars').read_text()).group(1)
H = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY}
FASE1 = BASE / 'lavoro' / '_esiti_migrazione' / 'fase1_righe_doppie_20260804T223733.tsv'
# L'affondo resta fuori: EX015/EX323 risolvono ancora sull'oggetto che il piano
# vuole eliminare, quindi le loro righe non si toccano in questo giro.
FUORI = {'affondo-alternato-corpo-libero', 'affondo-unilaterale-corpo-libero',
         'affondo-corpo-libero-sul-posto'}


def api(metodo, percorso, corpo=None):
    h = dict(H)
    if corpo is not None:
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(SUPA + percorso, method=metodo, headers=h,
                                 data=json.dumps(corpo).encode() if corpo is not None else None)
    try:
        d = urllib.request.urlopen(req, timeout=60).read()
        return (json.loads(d) if d else None), None
    except Exception as e:
        det = e.read().decode('utf-8', 'replace')[:200] if hasattr(e, 'read') else ''
        return None, '%s %s' % (e, det)


def leggi_tutto(tab, sel, ordine):
    out, off = [], 0
    while True:
        d, e = api('GET', '/rest/v1/%s?select=%s&order=%s&limit=1000&offset=%d'
                   % (tab, urllib.parse.quote(sel), ordine, off))
        if e:
            sys.exit('lettura %s: %s' % (tab, e))
        out += d
        if len(d) < 1000:
            return out
        off += 1000


def enc(u):
    p = urllib.parse.urlsplit(u)
    return urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(p.path), p.query, p.fragment))


def scarica(u, headers):
    return urllib.request.urlopen(urllib.request.Request(enc(u), headers=headers), timeout=180).read()


def risolve(cod, slug_atteso, bib):
    """Constata via Worker. Torna (True, nota) solo se tutto torna."""
    riga = bib.get(slug_atteso)
    if not riga:
        return False, 'la riga %s non esiste' % slug_atteso
    try:
        d = json.load(urllib.request.urlopen(
            urllib.request.Request(WORKER % cod, headers=UA), timeout=60))
    except Exception as e:
        return False, 'worker non risponde: %s' % str(e)[:60]
    if d.get('source') != 'biblioteca':
        return False, 'source=%s status=%s (fallback)' % (d.get('source'), d.get('status'))
    url = d.get('cached_url')
    if not url:
        return False, 'nessun cached_url'
    try:
        # niente quote() qui: ci pensa enc() dentro scarica(), e quotare due
        # volte trasforma %20 in %2520 e Storage risponde 400.
        atteso = hashlib.sha256(scarica(
            SUPA + '/storage/v1/object/biblioteca-gif/' + riga['storage_path'], H)).hexdigest()
        vero = hashlib.sha256(scarica(url, UA)).hexdigest()
    except Exception as e:
        return False, 'download fallito: %s' % str(e)[:60]
    if atteso != vero:
        return False, 'impronta diversa: %s vs %s' % (atteso[:12], vero[:12])
    return True, vero[:12]


def main(esegui):
    import csv
    with open(FASE1, encoding='utf-8-sig', newline='') as fh:
        fase1 = list(csv.DictReader(fh, delimiter='\t'))
    bib = {b['slug']: b for b in leggi_tutto('biblioteca_gif', '*', 'slug')}
    cat = leggi_tutto('esercizi_catalog', 'codice,nome,gif_slug', 'codice')
    per_slug = {}
    for c in cat:
        if c.get('gif_slug'):
            per_slug.setdefault(c['gif_slug'], []).append(c['codice'])
    byc = {c['codice']: c for c in cat}

    cand, scarti = [], []
    for r in fase1:
        cod, sv, sn = r['codici'].strip(), r['slug_vecchio'], r['slug_nuovo']
        if sv in FUORI or sn in FUORI:
            scarti.append((cod, sv, 'fuori giro per decisione: affondo')); continue
        if r['esito'] != 'inserita':
            scarti.append((cod, sv, 'fase1 esito=%s' % r['esito'])); continue
        if sv not in bib:
            scarti.append((cod, sv, 'riga vecchia gia assente')); continue
        if (byc.get(cod, {}).get('gif_slug') or '') != sn:
            scarti.append((cod, sv, 'catalogo non punta a %s' % sn)); continue
        if per_slug.get(sv):
            scarti.append((cod, sv, 'ancora puntata da %s' % ','.join(per_slug[sv]))); continue
        cand.append((cod, sv, sn))

    print('== FASE 7 %s ==' % ('ESECUZIONE' if esegui else 'DRY-RUN'))
    print('  candidate alla cancellazione : %d' % len(cand))
    print('  fuori giro                   : %d' % len(scarti))
    for s in scarti:
        print('     %s  %s  (%s)' % s)
    if not esegui:
        for cod, sv, sn in cand:
            print('     %s  cancellerebbe %s  (vive su %s)' % (cod, sv, sn))
        print('\nNiente cancellato. Rilanciare con --esegui.')
        return 0

    ts = datetime.now().strftime('%Y%m%dT%H%M%S')
    bk = BASE / 'lavoro' / '_backup' / ('fase7_righe_vecchie_%s.json' % ts)
    bk.parent.mkdir(parents=True, exist_ok=True)
    bk.write_text(json.dumps([bib[sv] for _, sv, _ in cand], ensure_ascii=False, indent=1),
                  encoding='utf-8')
    print('\n  backup di tutte le %d righe: %s\n' % (len(cand), bk))

    esiti, fermato = [], None
    for i, (cod, sv, sn) in enumerate(cand, 1):
        ok, nota = risolve(cod, sn, bib)
        if not ok:
            fermato = (cod, sv, sn, nota)
            print('  %2d. %s  VERIFICA FALLITA (%s) -> STOP, non cancello' % (i, cod, nota))
            break
        _, err = api('DELETE', '/rest/v1/biblioteca_gif?slug=eq.%s' % urllib.parse.quote(sv))
        if err:
            fermato = (cod, sv, sn, 'delete fallito: %s' % err)
            print('  %2d. %s  DELETE FALLITO -> STOP' % (i, cod))
            break
        esiti.append({'codice': cod, 'slug_cancellato': sv, 'vive_su': sn, 'impronta': nota})
        print('  %2d. %s  risolve su %s (%s) -> cancellata %s' % (i, cod, sn, nota, sv))

    log = BASE / 'lavoro' / '_esiti_migrazione' / ('fase7_cancellate_%s.json' % ts)
    log.write_text(json.dumps({'cancellate': esiti, 'fermato': fermato, 'fuori_giro': scarti},
                              ensure_ascii=False, indent=1), encoding='utf-8')
    print('\n  cancellate : %d' % len(esiti))
    print('  esito      : %s' % ('FERMATO su %s' % fermato[0] if fermato else 'completo'))
    print('  log        : %s' % log)
    return 1 if fermato else 0


if __name__ == '__main__':
    sys.exit(main('--esegui' in sys.argv))
