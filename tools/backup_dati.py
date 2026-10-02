#!/usr/bin/env python3
"""Copia di sicurezza dei dati delle persone (Fondamenta 020).

Esporta TUTTE le tabelle di `public`, l'elenco degli account e le foto dei check
in una cartella con la data, FUORI dal repo (che è pubblico):

    ~/zt-backup/dati/AAAA-MM-GG_HHMM/
        <tabella>.json      una per tabella, righe ordinate per chiave
        auth_users.json     id, email e date degli account (serve a ricollegare i dati)
        MANIFEST.json       righe lette, righe contate dal DB, impronta di ogni file
    ~/zt-backup/foto_check/ le foto del bucket privato, una volta sola (incrementale)

Sola lettura sul database e sul bucket: non scrive niente in Supabase.
Solo libreria standard, nessuna installazione.

    python3 tools/backup_dati.py                 # copia completa
    python3 tools/backup_dati.py --senza-foto    # solo le tabelle
    python3 tools/backup_dati.py --verifica ~/zt-backup/dati/2026-10-02_0700
    python3 tools/backup_dati.py --tieni 12      # dopo la copia, tiene le 12 più recenti

Regole che rispetta:
- L13: ogni tabella si legge a pagine, ordinata sulla chiave primaria.
- Il conteggio letto si confronta col conteggio esatto dichiarato dal DB:
  se non coincidono la copia è dichiarata NON valida (exit 1), mai «a posto» per silenzio.
- La chiave di servizio si legge da worker/.dev.vars e non si stampa mai.
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co'
BUCKET_FOTO = 'body-check-photos'
RADICE = os.path.expanduser('~/zt-backup')
PAGINA = 1000


def chiave():
    with open(os.path.join(REPO, 'worker', '.dev.vars'), encoding='utf-8') as f:
        for riga in f:
            if riga.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                return riga.split('=', 1)[1].strip().strip('"')
    sys.exit('✗ SUPABASE_SERVICE_ROLE_KEY non trovata in worker/.dev.vars')


def chiama(percorso, key, metodo='GET', corpo=None, intestazioni=None, grezzo=False):
    h = {'apikey': key, 'Authorization': 'Bearer ' + key}
    if corpo is not None:
        h['Content-Type'] = 'application/json'
        corpo = json.dumps(corpo).encode()
    h.update(intestazioni or {})
    req = urllib.request.Request(URL + percorso, data=corpo, method=metodo, headers=h)
    with urllib.request.urlopen(req, timeout=120) as r:
        dati = r.read()
        return (dati, r.headers) if grezzo else (json.loads(dati), r.headers)


def sha256(percorso):
    h = hashlib.sha256()
    with open(percorso, 'rb') as f:
        for pezzo in iter(lambda: f.read(1 << 20), b''):
            h.update(pezzo)
    return h.hexdigest()


def tabelle_e_chiavi(key):
    """Le tabelle esposte e, per ognuna, le colonne della chiave primaria (dall'OpenAPI di PostgREST)."""
    spec, _ = chiama('/rest/v1/', key)
    out = {}
    for nome, d in sorted(spec.get('definitions', {}).items()):
        props = d.get('properties', {})
        pk = [c for c, p in props.items() if '<pk/>' in (p.get('description') or '')]
        out[nome] = {'pk': pk, 'colonne': list(props)}
    return out


def esporta_tabella(nome, info, key, cartella):
    ordine = info['pk'] or (['id'] if 'id' in info['colonne'] else info['colonne'])
    q = 'select=*&order=' + ','.join(urllib.parse.quote(c) for c in ordine)
    righe, dichiarate = [], None
    da = 0
    while True:
        blocco, h = chiama(f'/rest/v1/{nome}?{q}', key,
                           intestazioni={'Range-Unit': 'items', 'Range': f'{da}-{da + PAGINA - 1}', 'Prefer': 'count=exact'})
        cr = h.get('Content-Range') or ''
        if '/' in cr and cr.split('/')[1].isdigit():
            dichiarate = int(cr.split('/')[1])
        righe.extend(blocco)
        if len(blocco) < PAGINA:
            break
        da += PAGINA
    file = os.path.join(cartella, nome + '.json')
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(righe, f, ensure_ascii=False, indent=0)
    return {'righe': len(righe), 'righe_db': dichiarate, 'ordine': ordine, 'chiave_primaria': info['pk'],
            'sha256': sha256(file), 'byte': os.path.getsize(file)}


def esporta_account(key, cartella):
    utenti, pagina = [], 1
    while True:
        r, _ = chiama(f'/auth/v1/admin/users?page={pagina}&per_page=200', key)
        blocco = r.get('users', [])
        utenti.extend({'id': u.get('id'), 'email': u.get('email'), 'created_at': u.get('created_at'),
                       'last_sign_in_at': u.get('last_sign_in_at')} for u in blocco)
        if len(blocco) < 200:
            break
        pagina += 1
    utenti.sort(key=lambda u: u['id'] or '')
    file = os.path.join(cartella, 'auth_users.json')
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(utenti, f, ensure_ascii=False, indent=0)
    return {'righe': len(utenti), 'sha256': sha256(file), 'byte': os.path.getsize(file)}


def elenco_bucket(key, prefisso=''):
    """Elenco ricorsivo degli oggetti del bucket privato (le cartelle hanno id nullo)."""
    out, da = [], 0
    while True:
        voci, _ = chiama(f'/storage/v1/object/list/{BUCKET_FOTO}', key, metodo='POST',
                         corpo={'prefix': prefisso, 'limit': 1000, 'offset': da, 'sortBy': {'column': 'name', 'order': 'asc'}})
        for v in voci:
            percorso = (prefisso + '/' if prefisso else '') + v['name']
            if v.get('id') is None:
                out.extend(elenco_bucket(key, percorso))
            else:
                out.append({'percorso': percorso, 'byte': (v.get('metadata') or {}).get('size')})
        if len(voci) < 1000:
            break
        da += 1000
    return out


def esporta_foto(key):
    dest = os.path.join(RADICE, 'foto_check')
    os.makedirs(dest, mode=0o700, exist_ok=True)
    oggetti = elenco_bucket(key)
    nuove = gia = 0
    errori = []
    for o in oggetti:
        locale = os.path.join(dest, *o['percorso'].split('/'))
        if os.path.exists(locale) and (o['byte'] is None or os.path.getsize(locale) == o['byte']):
            gia += 1
            continue
        os.makedirs(os.path.dirname(locale), mode=0o700, exist_ok=True)
        try:
            dati, _ = chiama(f'/storage/v1/object/{BUCKET_FOTO}/' + urllib.parse.quote(o['percorso']), key, grezzo=True)
        except urllib.error.HTTPError as e:
            errori.append(f"{o['percorso']}: HTTP {e.code}")
            continue
        if o['byte'] is not None and len(dati) != o['byte']:
            errori.append(f"{o['percorso']}: {len(dati)} byte scaricati, {o['byte']} dichiarati")
            continue
        with open(locale + '.parziale', 'wb') as f:
            f.write(dati)
        os.replace(locale + '.parziale', locale)
        nuove += 1
    presenti = sum(1 for o in oggetti if os.path.exists(os.path.join(dest, *o['percorso'].split('/'))))
    return {'nel_bucket': len(oggetti), 'scaricate_ora': nuove, 'gia_presenti': gia, 'sul_mac': presenti,
            'byte_bucket': sum(o['byte'] or 0 for o in oggetti), 'errori': errori,
            'oggetti': [o['percorso'] for o in oggetti]}


def verifica(cartella):
    with open(os.path.join(cartella, 'MANIFEST.json'), encoding='utf-8') as f:
        m = json.load(f)
    ko = 0
    voci = dict(m['tabelle'])
    voci['auth_users'] = m['auth_users']
    for nome, v in sorted(voci.items()):
        file = os.path.join(cartella, nome + '.json')
        if not os.path.exists(file):
            print(f'  KO  {nome}: file mancante'); ko += 1; continue
        with open(file, encoding='utf-8') as f:
            n = len(json.load(f))
        ok = sha256(file) == v['sha256'] and n == v['righe']
        ko += 0 if ok else 1
        print(f"  {'OK' if ok else 'KO'}  {nome}: {n} righe")
    if m.get('foto'):
        dest = os.path.join(RADICE, 'foto_check')
        mancanti = [p for p in m['foto']['oggetti'] if not os.path.exists(os.path.join(dest, *p.split('/')))]
        print(f"  {'OK' if not mancanti else 'KO'}  foto: {len(m['foto']['oggetti']) - len(mancanti)} su {len(m['foto']['oggetti'])} sul Mac")
        ko += 1 if mancanti else 0
    print('copia integra' if not ko else f'{ko} KO')
    return ko


def main():
    ap = argparse.ArgumentParser(description='Copia di sicurezza dei dati di Zona Tracker (sola lettura su Supabase).')
    ap.add_argument('--senza-foto', action='store_true', help='non scarica le foto dei check')
    ap.add_argument('--verifica', metavar='CARTELLA', help='ricontrolla una copia già fatta, senza rete')
    ap.add_argument('--tieni', type=int, metavar='N', help='dopo una copia valida, tiene solo le N cartelle più recenti')
    a = ap.parse_args()
    if a.verifica:
        sys.exit(1 if verifica(os.path.expanduser(a.verifica)) else 0)

    key = chiave()
    quando = datetime.now()
    cartella = os.path.join(RADICE, 'dati', quando.strftime('%Y-%m-%d_%H%M'))
    os.makedirs(cartella, mode=0o700, exist_ok=True)
    os.chmod(RADICE, 0o700)

    problemi = []
    manifest = {'quando': quando.isoformat(timespec='seconds'), 'progetto': URL, 'tabelle': {}}
    for nome, info in tabelle_e_chiavi(key).items():
        v = esporta_tabella(nome, info, key, cartella)
        manifest['tabelle'][nome] = v
        segno = 'OK'
        if v['righe_db'] is None or v['righe'] != v['righe_db']:
            segno = 'KO'
            problemi.append(f"{nome}: lette {v['righe']}, il DB ne dichiara {v['righe_db']}")
        print(f"  {segno}  {nome:<28} {v['righe']:>6} righe")
    manifest['auth_users'] = esporta_account(key, cartella)
    print(f"  OK  {'auth_users':<28} {manifest['auth_users']['righe']:>6} account")
    if not a.senza_foto:
        f = esporta_foto(key)
        manifest['foto'] = f
        if f['errori'] or f['sul_mac'] != f['nel_bucket']:
            problemi.append(f"foto: {f['sul_mac']} sul Mac su {f['nel_bucket']} nel bucket · " + '; '.join(f['errori'][:5]))
        print(f"  {'KO' if f['errori'] else 'OK'}  foto dei check: {f['nel_bucket']} nel bucket, {f['scaricate_ora']} scaricate ora, {f['gia_presenti']} già sul Mac")
    manifest['valida'] = not problemi
    manifest['problemi'] = problemi
    with open(os.path.join(cartella, 'MANIFEST.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    tot = sum(v['righe'] for v in manifest['tabelle'].values())
    print(f"\n{len(manifest['tabelle'])} tabelle, {tot} righe → {cartella}")
    if problemi:
        print('✗ COPIA NON VALIDA:\n  - ' + '\n  - '.join(problemi))
        sys.exit(1)
    if a.tieni:
        base = os.path.join(RADICE, 'dati')
        vecchie = sorted(d for d in os.listdir(base) if os.path.isfile(os.path.join(base, d, 'MANIFEST.json')))[:-a.tieni]
        for d in vecchie:
            shutil.rmtree(os.path.join(base, d))
        if vecchie:
            print(f'tolte {len(vecchie)} copie vecchie, restano le {a.tieni} più recenti')
    print('✓ copia valida')


if __name__ == '__main__':
    main()
