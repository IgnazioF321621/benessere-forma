#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Carica nel pannello i casi in cui le tre fonti del nome non coincidono.

    python3 tools/biblioteca-nomi/costruisci_tre_fonti.py

Legge e basta: catalogo, biblioteca_gif, i due registri dello storico e i file
sul Mac. Scrive un solo file, `lavoro/_tre_fonti.json`, che e' il piano che il
pannello mostra. Nessun UPDATE, nessuna rinomina, nessuna riga nel TSV di sync.

Il nome di un esercizio vive in tre posti — nome del file sul Mac, `nome_italiano`
in `biblioteca_gif`, `nome` a catalogo (specchio del Sheet) — e questi sono i casi
in cui i tre non dicono la stessa cosa. Il pannello non propone niente: la scelta
si fa guardando la GIF, che e' la sola cosa che stabilisce l'identita'.

⚠️ Un file solo sul Mac puo' servire DUE oggetti del bucket con due codici diversi:
sono doppioni per contenuto, e li stana l'impronta [L7]. Dove succede, la domanda
non e' piu' «quale nome» ma «sono due esercizi o uno». Il piano lo dichiara in
`condivide_gif_con` e il pannello lo mette in cima al caso, perche' cambiare il
nome di uno dei due senza decidere quello non risolve niente.
"""
import json
import sys
import unicodedata
import urllib.parse
from pathlib import Path

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))
import impronte as I                                    # noqa: E402
# Quali oggetti del bucket portano gli stessi byte lo dice il piano dei 480px, e
# quel piano si legge in un posto solo, accanto a ponte_480 -> [L35].
from pianifica import gemelli_480                       # noqa: E402

# Un caso e' un codice EX### oppure — quando l'esercizio a catalogo non c'e'
# ancora — lo slug della riga di `biblioteca_gif`. Il secondo caso non e' un
# ripiego: le righe senza codice sono quelle del lavoro 3, e la stessa scelta
# che ne fissa il nome decide anche se entrano a catalogo.
CASI = ['EX021', 'EX042', 'EX184', 'EX013', 'EX250', 'EX563',
        'calf-raise-elastico-maniglie-in-piedi']

# Parole che per QUESTO caso non si scrivono, oltre a quelle vietate sempre.
# Stanno nel piano e non nel codice del server: "in piedi" e' un default nella
# famiglia dei calf raise — dove "seduto" e' marcato e l'altra e' sottintesa —
# ma nel resto del catalogo compare 23 volte e distingue davvero. Una regola
# globale sarebbe sbagliata; una regola dichiarata sul caso e' giusta.
VIETATI = {'calf-raise-elastico-maniglie-in-piedi': ['in piedi']}
BIB = Path('/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi')
DEST = BASE / 'lavoro' / '_tre_fonti.json'


def nfc(s):
    return unicodedata.normalize('NFC', s or '')


def conta(tabella, nome):
    """Quante righe di storico portano questo nome testuale. 0 = rinomina indolore."""
    if not nome:
        return 0
    d, e = I.api('GET', '/rest/v1/%s?select=id&exercise_name=eq.%s&limit=100000'
                 % (tabella, urllib.parse.quote(nome, safe='')))
    if e:
        raise SystemExit('lettura %s fallita: %s' % (tabella, e))
    return len(d)


def sha256_mac(zona, storage_path, file_mac):
    """SHA-256 del file sul Mac, dal piano di pianifica.py se c'e'.

    Il campo si chiama `sha256_mac` e sta nel piano di `pianifica.py`, non nel
    piano dei 480: quello descrive i byte RIDOTTI del bucket, che dopo la
    riduzione sono altri byte per definizione [L35]. Dove il piano non esiste
    si legge il file, che e' la stessa cosa detta dalla stessa fonte.
    """
    p = BASE / 'lavoro' / '_piani' / ('piano_%s.json' % zona.lower().replace(' ', '-'))
    if p.exists():
        for r in json.loads(p.read_text(encoding='utf-8'))['righe']:
            if nfc(r.get('storage_path_dest')) == nfc(storage_path):
                return r['sha256_mac'], p.name
    f = BIB / zona / file_mac
    return I.sha_file(f), 'letto dal file sul Mac'


def main():
    bg, e1 = I.leggi_tutto('biblioteca_gif', 'slug,nome_italiano,storage_path', 'slug')
    cat, e2 = I.leggi_tutto('esercizi_catalog', 'codice,nome,gif_slug', 'codice')
    if e1 or e2:
        raise SystemExit('lettura fallita: %s %s' % (e1, e2))
    per_slug = {r['slug']: r for r in bg}
    per_cod = {r['codice']: r for r in cat}

    # Un oggetto del bucket -> il file del Mac da cui viene e gli altri oggetti
    # che ne portano gli stessi byte. Il legame Mac<->bucket si legge dal piano
    # dei 480: dopo la riduzione le due impronte sono diverse e un confronto
    # diretto non appaia piu' niente.
    #
    # Fino al 25 agosto 2026 il piano si leggeva qui, e solo per `origine_mac`.
    # Ma `origine_mac` e' un PERCORSO, e il primo lavoro del cantiere e' proprio
    # rinominare i file: appena il pannello applica le rinomine quel percorso non
    # esiste piu'. Il ripiego e' `sha256_bucket_ora`, l'impronta che il file sul
    # Mac ha ancora perche' la rinomina cambia il nome e non i byte — la stessa
    # riparazione portata in ponte_480 il 22 agosto. Qui si importa: una sola
    # implementazione, un solo lettore del piano.
    def riga_di(c):
        return per_slug[c] if c not in per_cod else per_slug[per_cod[c]['gif_slug']]

    gemelli = {}          # storage_path -> {origine_mac, sha256_bucket_ora, fratelli}
    for zona in {riga_di(c)['storage_path'].split('/')[0] for c in CASI}:
        stato, e = I.stato_bucket(zona)
        if e:
            raise SystemExit('elenco del bucket "%s" fallito: %s' % (zona, e))
        gemelli.update(gemelli_480(zona, set(stato)))

    per_sp = {nfc(r['storage_path']): r for r in bg if r.get('storage_path')}
    cod_di = {}
    for c in cat:
        if c.get('gif_slug'):
            cod_di.setdefault(c['gif_slug'], []).append(c)

    casi = []
    for cod in CASI:
        senza_codice = cod not in per_cod
        c = None if senza_codice else per_cod[cod]
        r = per_slug[cod] if senza_codice else per_slug[c['gif_slug']]
        sp = r['storage_path']
        zona = sp.split('/')[0]

        gem = gemelli.get(nfc(sp)) or {}
        origine = gem.get('origine_mac')
        # Il nome del file si chiede all'IMPRONTA, non al percorso registrato nel
        # piano dei 480: il cantiere rinomina, e quel piano tiene percorsi che
        # invecchiano — la voce di EX563 punta ancora al nome di prima della
        # rinomina di fase 1 [L34]. Rinominare non tocca i byte, quindi lo sha
        # del piano di prepara.py regge attraverso qualunque rinomina.
        file_mac = Path(sp).name
        prep = BASE / 'lavoro' / ('%s.json' % zona.lower())
        if prep.exists():
            for rr in json.loads(prep.read_text(encoding='utf-8'))['righe']:
                if nfc(sp) in [nfc(x) for x in rr['storage_paths']]:
                    vivo = next((v['percorso'] for v in
                                 I.indice_locale(verbose=False).values()
                                 if v['sha256'] == rr['sha256']), None)
                    if vivo:
                        file_mac = Path(vivo).name
                    break
        if not (BIB / zona / file_mac).is_file() and origine:
            file_mac = Path(origine).name
        # Ultimo ripiego, e quello che regge alle rinomine: l'impronta che
        # l'oggetto aveva prima della riduzione e' quella che il file sul Mac ha
        # ancora, quindi l'indice locale sa dove quel file sta ADESSO [L34].
        if not (BIB / zona / file_mac).is_file() and gem.get('sha256_bucket_ora'):
            vivo = next((v['percorso'] for v in I.indice_locale(verbose=False).values()
                         if v['sha256'] == gem['sha256_bucket_ora']), None)
            if vivo:
                file_mac = Path(vivo).name
        sul_mac = (BIB / zona / file_mac).is_file()

        # gli altri codici che mostrano ESATTAMENTE questa immagine
        condivisi = []
        for altro_sp in gem.get('fratelli', []):
            ar = per_sp.get(nfc(altro_sp))
            if not ar:
                continue
            for ac in cod_di.get(ar['slug'], []) or [None]:
                condivisi.append({
                    'codice': ac['codice'] if ac else None,
                    'nome_sheet': ac['nome'] if ac else None,
                    'nome_italiano': ar['nome_italiano'],
                    'slug': ar['slug'], 'storage_path': altro_sp})

        nomi = {'mac': Path(file_mac).stem,
                'supabase': r['nome_italiano'],
                'sheet': None if senza_codice else c['nome']}

        # lo stesso nome testuale usato da un altro codice: un UPDATE per nome
        # colpirebbe righe che non c'entrano, e due esercizi non possono chiamarsi uguale
        collisioni = []
        for etichetta, nome in nomi.items():
            if nome is None:
                continue
            for altro in cat:
                if altro['codice'] != cod and nfc(altro['nome']) == nfc(nome):
                    collisioni.append({'nome': nome, 'etichetta': etichetta,
                                       'codice': altro['codice']})

        sha, fonte = sha256_mac(zona, sp, file_mac)
        storico = {}
        for etichetta, nome in nomi.items():
            storico[etichetta] = {'nome': nome,
                                  'training_logs': conta('training_logs', nome),
                                  'workout_sets': conta('workout_sets', nome)}

        casi.append({
            'chiave': cod, 'codice': None if senza_codice else cod, 'zona': zona,
            'vietati': VIETATI.get(cod, []),
            'sha256_mac': sha, 'fonte_sha256': fonte,
            'file_mac': file_mac, 'cartella': zona, 'file_sul_mac': sul_mac,
            'nomi': nomi, 'gif_slug': r['slug'], 'storage_path': sp,
            'storico': storico, 'condivide_gif_con': condivisi,
            'collisioni_nome': collisioni})
        print('  %-38s %-22s mac="%s" supa="%s" sheet="%s"%s'
              % (cod, zona, nomi['mac'], nomi['supabase'],
                 nomi['sheet'] if nomi['sheet'] else '— nessun codice —',
                 '  ⚠ condivide la GIF con %s' % ', '.join(
                     x['codice'] or x['slug'] for x in condivisi) if condivisi else ''))

    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps({'titolo': 'Divergenze fra le tre fonti del nome',
                                'generato': I.time.strftime('%Y-%m-%dT%H:%M:%S'),
                                'casi': casi}, ensure_ascii=False, indent=1),
                    encoding='utf-8')
    print('\npiano: %s (%d casi)' % (DEST, len(casi)))
    I.stampa_consumo('costruzione piano')


if __name__ == '__main__':
    main()
