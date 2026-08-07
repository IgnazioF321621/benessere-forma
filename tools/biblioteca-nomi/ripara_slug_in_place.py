#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Slug in place su singole righe di `biblioteca_gif`. Dry-run salvo --esegui.

Perche' non `migra_zona.py passo_slug`: la sua guardia e' di zona ("0 codici
puntano alla zona"), e Gambe e Glutei di codici ne ha in abbondanza. La regola
vera pero' e' per riga: se nessun codice punta a QUELLA riga non esiste la
catena gif_slug -> slug da proteggere, quindi lo slug si aggiorna sulla riga
esistente e non servono ne' la riga doppia ne' il sync del foglio. Qui la
guardia e' applicata riga per riga, non allentata.

`storage_path` non viene mai toccato: si riscrivono solo `slug` e
`nome_italiano`. L'impronta dell'oggetto e' letta prima e dopo e deve coincidere.

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
KEY = re.search(r'SUPABASE_SERVICE_ROLE_KEY\s*=\s*"?([^"\n]+)',
                (BASE.parent.parent / 'worker' / '.dev.vars').read_text()).group(1)
H = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY}

# codice -> (slug vecchio sulla riga di biblioteca_gif, slug nuovo gia' a catalogo)
LAVORO = {
    'EX015': ('affondo-alternato-corpo-libero', 'affondo-corpo-libero-sul-posto'),
    'EX247': ('leg-curl-macchina-ginocchio-rialzato',
              'leg-curl-una-gamba-macchina-ginocchio-rialzato'),
}


def api(metodo, percorso, corpo=None):
    h = dict(H)
    if corpo is not None:
        h['Content-Type'] = 'application/json'
        h['Prefer'] = 'return=representation'
    req = urllib.request.Request(SUPA + percorso, method=metodo, headers=h,
                                 data=json.dumps(corpo).encode() if corpo is not None else None)
    try:
        d = urllib.request.urlopen(req, timeout=60).read()
        return (json.loads(d) if d else None), None
    except Exception as e:
        det = ''
        if hasattr(e, 'read'):
            det = e.read().decode('utf-8', 'replace')[:200]
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


def impronta(path):
    u = SUPA + '/storage/v1/object/biblioteca-gif/' + urllib.parse.quote(path)
    d = urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=180).read()
    return hashlib.sha256(d).hexdigest(), len(d)


def main(esegui):
    bib = {b['slug']: b for b in leggi_tutto('biblioteca_gif', '*', 'slug')}
    cat = leggi_tutto('esercizi_catalog', 'codice,nome,gif_slug', 'codice')
    per_slug = {}
    for c in cat:
        if c.get('gif_slug'):
            per_slug.setdefault(c['gif_slug'], []).append(c['codice'])

    piano, blocchi = [], []
    for cod, (vecchio, nuovo) in sorted(LAVORO.items()):
        riga = bib.get(vecchio)
        p = {'codice': cod, 'slug_vecchio': vecchio, 'slug_nuovo': nuovo}
        if not riga:
            blocchi.append('%s: la riga %s non esiste' % (cod, vecchio)); continue
        p['storage_path'] = riga['storage_path']
        p['nome_italiano_da'] = riga.get('nome_italiano')
        p['nome_italiano_a'] = [c['nome'] for c in cat if c['codice'] == cod][0]
        # 1. nessun codice punta alla riga che stiamo per rinominare
        punt = per_slug.get(vecchio, [])
        if punt:
            blocchi.append('%s: %d codici puntano ancora a %s (%s): in place VIETATO'
                           % (cod, len(punt), vecchio, ','.join(punt)))
            continue
        # 2. lo slug nuovo non e' gia' occupato da un'altra riga
        if nuovo in bib:
            blocchi.append('%s: lo slug %s esiste gia' % (cod, nuovo)); continue
        # 3. lo slug nuovo e' atteso da questo codice e da nessun altro
        att = per_slug.get(nuovo, [])
        if att != [cod]:
            blocchi.append('%s: lo slug %s e atteso da %s' % (cod, nuovo, att or 'nessuno'))
            continue
        # 4. l'oggetto esiste
        try:
            p['sha_prima'], p['byte'] = impronta(riga['storage_path'])
        except Exception as e:
            blocchi.append('%s: oggetto non scaricabile: %s' % (cod, str(e)[:60])); continue
        piano.append(p)

    print('== DRY-RUN ==' if not esegui else '== ESECUZIONE ==')
    for p in piano:
        print('  %s  %s -> %s' % (p['codice'], p['slug_vecchio'], p['slug_nuovo']))
        print('      nome_italiano : %s -> %s' % (p['nome_italiano_da'], p['nome_italiano_a']))
        print('      storage_path  : %s  (INVARIATO)' % p['storage_path'])
        print('      impronta      : %s  %d byte' % (p['sha_prima'][:12], p['byte']))
    for b in blocchi:
        print('  BLOCCATO  %s' % b)
    if blocchi:
        sys.exit('\n%d righe bloccate: non si esegue niente.' % len(blocchi))
    if not esegui:
        print('\nNiente scritto. Rilanciare con --esegui.')
        return 0

    ts = datetime.now().strftime('%Y%m%dT%H%M%S')
    bkdir = BASE / 'lavoro' / '_backup'
    bkdir.mkdir(parents=True, exist_ok=True)
    bk = bkdir / ('bib_slug_in_place_%s.json' % ts)
    bk.write_text(json.dumps([bib[p['slug_vecchio']] for p in piano],
                             ensure_ascii=False, indent=1), encoding='utf-8')
    print('\nbackup righe intere: %s' % bk)

    esiti = []
    for p in piano:
        _, err = api('PATCH', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(p['slug_vecchio']),
                     {'slug': p['slug_nuovo'], 'nome_italiano': p['nome_italiano_a']})
        if err:
            esiti.append(dict(p, esito='ERRORE', dettaglio=err))
            print('  ERRORE %s: %s' % (p['codice'], err))
            continue
        dopo, _ = impronta(p['storage_path'])
        ok = dopo == p['sha_prima']
        esiti.append(dict(p, esito='fatto' if ok else 'IMPRONTA CAMBIATA', sha_dopo=dopo))
        print('  %s %s -> %s | oggetto %s' % (p['codice'], p['slug_vecchio'], p['slug_nuovo'],
                                              'intatto' if ok else 'CAMBIATO'))
    (bkdir / ('esito_slug_in_place_%s.json' % ts)).write_text(
        json.dumps(esiti, ensure_ascii=False, indent=1), encoding='utf-8')
    return 0


if __name__ == '__main__':
    sys.exit(main('--esegui' in sys.argv))
