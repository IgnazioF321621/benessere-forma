#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Allinea i sei nomi divergenti e fonde i tre doppioni. Prova, poi applica.

    python3 tools/biblioteca-nomi/allinea_sei.py            # dry-run, non scrive
    python3 tools/biblioteca-nomi/allinea_sei.py --applica  # scrive, con backup

Decisione di Ignazio: prevale il nome del file sul Mac, e dove due codici mostrano
la stessa GIF si fondono. Unica eccezione dichiarata: EX563, il cui nome sul Mac
viola due regole ferme (parentesi con la traduzione, simbolo grado) e prende il
nome gia' presente sullo Sheet.

------------------------------------------------------------------------------
CHI SOPRAVVIVE, E PERCHE' NON LO DECIDE QUESTO FILE
------------------------------------------------------------------------------
Sopravvive il codice con piu' storico (training_logs + workout_sets). A parita'
sopravvive il codice che GIA' PORTA il nome adottato: costa uguale, e cosi'
codice e nome restano in coppia invece di scambiarsi di posto. Se nessuno dei
due lo porta, vince il codice piu' basso.

Lo storico si CONTA a ogni esecuzione, non si scrive qui: un numero copiato in
un sorgente invecchia in silenzio, e la fusione sbagliata non si accorge di esserlo.

------------------------------------------------------------------------------
DUE FASI, E NON E' UNA COMPLICAZIONE GRATUITA
------------------------------------------------------------------------------
`esercizi_catalog` non si scrive: la sua fonte e' il Google Sheet, e questo
strumento produce il TSV da incollare. Quindi le modifiche al catalogo (nome,
gif_slug, alternativa, righe eliminate) arrivano SOLO dopo il sync manuale.

  fase 1 (adesso)      biblioteca_gif.nome_italiano · nome del file sul Mac
  --- sync del Sheet, a mano ---
  fase 2 (dopo)        training_logs · workout_sets
  fase 3 (dopo)        eliminazione delle righe biblioteca_gif rimaste orfane

L'ordine non e' invertibile, per due motivi diversi.

Lo storico sta in fase 2 e non in fase 1 perche' l'app aggancia le serie per
`exercise_name`: finche' il catalogo dice il nome vecchio, lo storico deve dire
il nome vecchio. Rinominarlo prima aprirebbe una finestra di durata indefinita —
quanto ci mette il sync a mano — in cui i badge delle serie non si agganciano.

Le righe orfane stanno in fase 3 perche' cancellarne una prima del sync
spezzerebbe la catena `gif_slug -> slug -> storage_path`, e il Worker
risponderebbe `missing`. Nella fase 1 nessuno slug resta scoperto: il superstite
punta ancora la riga vecchia, che c'e', e dopo il sync punta quella nuova, che
c'e' gia'.

L'oggetto nel bucket non si cancella in nessuna delle due fasi.
"""
import argparse
import json
import re
import sys
import unicodedata
import urllib.parse
from pathlib import Path

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))
import impronte as I                                    # noqa: E402
from nomenclatura import DEFAULT_OMESSI, slug           # noqa: E402

BIB = Path('/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi')
BACKUP = BASE / 'backup'
PIANI = BASE / 'lavoro' / '_piani'
LOG_TAB = ('training_logs', 'workout_sets')

# I tre casi senza fusione. Il nome si prende dal file sul Mac, tranne dove e'
# dichiarata un'eccezione: li' il nome del Mac viola una regola ferma.
SEMPLICI = {
    'EX013': None,
    'EX250': None,
    'EX563': 'Calf raise leg press 45 gradi',   # eccezione: niente parentesi, "gradi"
}
# Le tre coppie che mostrano gli stessi byte. Chi resta lo decide lo storico.
COPPIE = [('EX021', 'EX176'), ('EX042', 'EX178'), ('EX184', 'EX139')]


def nfc(s):
    return unicodedata.normalize('NFC', s or '')


def viola(nome):
    """Le regole che si leggono nel testo. L'ordine dei termini non e' fra queste."""
    p = []
    if '(' in nome or ')' in nome:
        p.append('parentesi con la traduzione')
    if '°' in nome:
        p.append('simbolo grado invece di "gradi"')
    for d in DEFAULT_OMESSI:
        if re.search(r'(?i)\b%s\b' % re.escape(d), nome):
            p.append('default "%s" scritto' % d)
    return p


def conta(tabella, nome):
    d, e = I.api('GET', '/rest/v1/%s?select=id&exercise_name=eq.%s&limit=100000'
                 % (tabella, urllib.parse.quote(nome, safe='')))
    if e:
        raise SystemExit('lettura %s fallita: %s' % (tabella, e))
    return len(d)


def file_mac(zona, storage_path, gemelli):
    """Il file del Mac da cui vengono i byte di quell'oggetto, dal piano dei 480."""
    for mac, sps in gemelli.items():
        if nfc(storage_path) in sps:
            return Path(mac)
    return BIB / zona / Path(storage_path).name


def raccogli():
    cat, e1 = I.leggi_tutto('esercizi_catalog', '*', 'codice')
    bg, e2 = I.leggi_tutto('biblioteca_gif', 'slug,nome_italiano,storage_path', 'slug')
    if e1 or e2:
        raise SystemExit('lettura fallita: %s %s' % (e1, e2))
    per_cod = {r['codice']: r for r in cat}
    per_slug = {r['slug']: r for r in bg}
    punta = {}
    for r in cat:
        if r.get('gif_slug'):
            punta.setdefault(r['gif_slug'], []).append(r['codice'])

    zone = {per_slug[per_cod[c]['gif_slug']]['storage_path'].split('/')[0]
            for c in list(SEMPLICI) + [x for p in COPPIE for x in p]}
    gemelli = {}
    for z in zone:
        p = BASE / 'lavoro' / '_480' / ('%s.json' % z.lower().replace(' ', '-'))
        if p.exists():
            for v in json.loads(p.read_text(encoding='utf-8'))['voci']:
                gemelli.setdefault(nfc(v['origine_mac']), []).append(nfc(v['storage_path']))
    return cat, per_cod, per_slug, punta, gemelli


def costruisci():
    cat, per_cod, per_slug, punta, gemelli = raccogli()
    ops, allarmi, tsv_cat, tsv_del = [], [], [], []

    def riga_bib(cod):
        return per_slug[per_cod[cod]['gif_slug']]

    def nome_dal_mac(cod):
        r = riga_bib(cod)
        z = r['storage_path'].split('/')[0]
        return file_mac(z, r['storage_path'], gemelli).stem, z

    # ------------------------------------------------------------ semplici
    for cod, forzato in SEMPLICI.items():
        c = per_cod[cod]
        r = riga_bib(cod)
        dal_mac, zona = nome_dal_mac(cod)
        nome = forzato or dal_mac
        if forzato:
            allarmi.append('%s: eccezione dichiarata — il Mac dice "%s" (%s), si adotta "%s"'
                           % (cod, dal_mac, ', '.join(viola(dal_mac)), nome))
        elif viola(nome):
            allarmi.append('FERMARSI — %s: il nome del Mac "%s" viola %s'
                           % (cod, nome, ', '.join(viola(nome))))

        if nfc(r['nome_italiano']) != nfc(nome):
            ops.append(dict(fase=1, tabella='biblioteca_gif', chiave='slug=%s' % r['slug'],
                            campo='nome_italiano', prima=r['nome_italiano'], dopo=nome,
                            slug=r['slug']))
        if nfc(c['nome']) != nfc(nome):
            tsv_cat.append(dict(codice=cod, campo='nome', prima=c['nome'], dopo=nome))
        s = slug(nome)
        if s != c['gif_slug']:
            allarmi.append('%s: cambia lo slug %s -> %s (codici sul vecchio: %s)'
                           % (cod, c['gif_slug'], s, punta.get(c['gif_slug'])))
            tsv_cat.append(dict(codice=cod, campo='gif_slug', prima=c['gif_slug'], dopo=s))

        # lo storico si tocca solo se cambia il NOME A CATALOGO: e' quello che
        # l'app scrive in exercise_name, non il nome del file
        for t in LOG_TAB:
            n = conta(t, c['nome'])
            if n and nfc(c['nome']) != nfc(nome):
                ops.append(dict(fase=2, tabella=t, chiave='exercise_name=%s' % c['nome'],
                                campo='exercise_name', prima=c['nome'], dopo=nome, righe=n))
            elif n:
                ops.append(dict(fase=0, tabella=t, chiave='exercise_name=%s' % c['nome'],
                                campo='exercise_name', prima=c['nome'], dopo=c['nome'],
                                righe=n, nota='nome a catalogo invariato: non si tocca'))

        f = file_mac(zona, r['storage_path'], gemelli)
        if f.stem != nome:
            ops.append(dict(fase=1, tabella='file sul Mac', chiave=str(f.parent.name),
                            campo='nome file', prima=f.name, dopo=nome + f.suffix,
                            da=str(f), a=str(f.with_name(nome + f.suffix))))
        b = Path(r['storage_path']).stem
        if b != nome:
            allarmi.append('%s: il basename nel bucket resta "%s" — allinearlo '
                           'richiederebbe di cambiare storage_path' % (cod, b))

    # ------------------------------------------------------------ fusioni
    for a, b in COPPIE:
        st = {}
        for cod in (a, b):
            st[cod] = sum(conta(t, per_cod[cod]['nome']) for t in LOG_TAB)
        nome, zona = nome_dal_mac(a)            # un file solo sul Mac: il nome e' uno
        if st[a] != st[b]:
            resta = a if st[a] > st[b] else b
            perche = 'piu storico (%d contro %d)' % (max(st.values()), min(st.values()))
        else:
            # a parita' vince chi il nome adottato ce l'ha gia': codice e nome
            # restano in coppia invece di scambiarsi di posto
            gia = [c for c in (a, b) if nfc(per_cod[c]['nome']) == nfc(nome)]
            resta = gia[0] if len(gia) == 1 else min(a, b)
            perche = ('parita a %d, porta gia il nome adottato' % st[a] if len(gia) == 1
                      else 'parita a %d, codice piu basso' % st[a])
        via = b if resta == a else a
        allarmi.append('%s resta (%s), assorbe %s' % (resta, perche, via))
        if viola(nome):
            allarmi.append('FERMARSI — %s: il nome del Mac "%s" viola %s'
                           % (resta, nome, ', '.join(viola(nome))))
        if nfc(per_cod[resta]['nome']) != nfc(nome):
            allarmi.append('%s cambia nome: "%s" -> "%s"'
                           % (resta, per_cod[resta]['nome'], nome))

        # la riga di biblioteca_gif che si tiene e' quella il cui slug e' gia'
        # lo slug del nome adottato: cosi' lo slug non deve essere inventato
        s = slug(nome)
        tieni = per_slug.get(s)
        if tieni is None:
            allarmi.append('FERMARSI — %s: nessuna riga biblioteca_gif con slug %s' % (resta, s))
            continue
        orfana = riga_bib(resta) if riga_bib(resta)['slug'] != s else riga_bib(via)

        if nfc(tieni['nome_italiano']) != nfc(nome):
            ops.append(dict(fase=1, tabella='biblioteca_gif', chiave='slug=%s' % tieni['slug'],
                            campo='nome_italiano', prima=tieni['nome_italiano'], dopo=nome,
                            slug=tieni['slug']))
        if per_cod[resta]['gif_slug'] != s:
            altri = [x for x in punta.get(per_cod[resta]['gif_slug'], []) if x != resta]
            if altri:
                allarmi.append('FERMARSI — lo slug %s e puntato anche da %s'
                               % (per_cod[resta]['gif_slug'], altri))
            tsv_cat.append(dict(codice=resta, campo='gif_slug',
                                prima=per_cod[resta]['gif_slug'], dopo=s))
        if nfc(per_cod[resta]['nome']) != nfc(nome):
            tsv_cat.append(dict(codice=resta, campo='nome',
                                prima=per_cod[resta]['nome'], dopo=nome))

        # lo storico dell'assorbito si ripunta sul superstite, e quello del
        # superstite lo segue se il suo nome a catalogo cambia
        for t in LOG_TAB:
            for cod in (via, resta):
                n = conta(t, per_cod[cod]['nome'])
                if n and nfc(per_cod[cod]['nome']) != nfc(nome):
                    ops.append(dict(fase=2, tabella=t,
                                    chiave='exercise_name=%s' % per_cod[cod]['nome'],
                                    campo='exercise_name', prima=per_cod[cod]['nome'],
                                    dopo=nome, righe=n,
                                    nota='storico di %s -> %s' % (cod, resta)))

        # alternativa: nessuna FK, si scandisce a regex su tutti i campi testuali.
        # `codice` si salta: e' l'identita' della riga, non un riferimento a un'altra.
        # Senza saltarlo, la riga assorbita si presenta come "rinomina il codice".
        for r in cat:
            for campo, val in r.items():
                if campo == 'codice' or not isinstance(val, str):
                    continue
                if re.search(r'\b%s\b' % via, val):
                    nuovo = re.sub(r'\b%s\b' % via, resta, val)
                    if r['codice'] == resta and nuovo.strip() == resta:
                        allarmi.append('FERMARSI — autoriferimento: %s.%s diventerebbe %s'
                                       % (r['codice'], campo, resta))
                    tsv_cat.append(dict(codice=r['codice'], campo=campo,
                                        prima=val, dopo=nuovo))

        tsv_del.append(dict(codice=via, nome=per_cod[via]['nome'],
                            motivo='assorbito da %s (stessa GIF)' % resta))
        altri_orfana = [x for x in punta.get(orfana['slug'], []) if x not in (resta, via)]
        if altri_orfana:
            allarmi.append('la riga %s NON si cancella: la puntano anche %s'
                           % (orfana['slug'], altri_orfana))
        else:
            ops.append(dict(fase=3, tabella='biblioteca_gif', chiave='slug=%s' % orfana['slug'],
                            campo='riga', prima=orfana['nome_italiano'], dopo='(eliminata)',
                            nota='orfana dopo il sync; oggetto nel bucket NON toccato'))

        f = file_mac(zona, tieni['storage_path'], gemelli)
        if f.stem != nome:
            ops.append(dict(fase=1, tabella='file sul Mac', chiave=f.parent.name,
                            campo='nome file', prima=f.name, dopo=nome + f.suffix,
                            da=str(f), a=str(f.with_name(nome + f.suffix))))
        bn = Path(tieni['storage_path']).stem
        if bn != nome:
            allarmi.append('%s: il basename nel bucket resta "%s" — allinearlo '
                           'richiederebbe di cambiare storage_path' % (resta, bn))

    return ops, allarmi, tsv_cat, tsv_del


def stampa(ops, allarmi, tsv_cat, tsv_del):
    print('\n=== MODIFICHE, RIGA PER RIGA ===')
    print('%-5s %-16s %-38s %-14s %-46.46s %-46.46s %s'
          % ('fase', 'tabella', 'chiave', 'campo', 'prima', 'dopo', 'righe'))
    for o in sorted(ops, key=lambda x: (x['fase'], x['tabella'])):
        print('%-5s %-16s %-38.38s %-14s %-46.46s %-46.46s %s'
              % (o['fase'] or '—', o['tabella'], o['chiave'], o['campo'],
                 o['prima'], o['dopo'], o.get('righe', '')))
        if o.get('nota'):
            print('      %s' % o['nota'])

    print('\n=== CATALOGO: va sul Sheet, non si scrive qui ===')
    for t in tsv_cat:
        print('  %-8s %-14s %-46.46s -> %s' % (t['codice'], t['campo'], t['prima'], t['dopo']))
    print('\n=== RIGHE DA CANCELLARE A MANO NEL SHEET ===')
    for t in tsv_del:
        print('  %-8s %-46.46s %s' % (t['codice'], t['nome'], t['motivo']))

    print('\n=== DA GUARDARE ===')
    for a in allarmi:
        print('  %s%s' % ('⚠ ' if a.startswith('FERMARSI') else '· ', a))
    if not allarmi:
        print('  niente.')
    print('\nscritture  fase 1: %d · fase 2: %d · fase 3: %d · '
          'righe di catalogo da sincronizzare: %d'
          % (sum(1 for o in ops if o['fase'] == 1), sum(1 for o in ops if o['fase'] == 2),
             sum(1 for o in ops if o['fase'] == 3), len(tsv_cat) + len(tsv_del)))


def salva_backup(ops):
    """Copia integrale delle due tabelle prima di toccarle, piu' l'annullamento
    della rinomina sul Mac. Il backup non e' la riga cambiata: e' la tabella
    intera, perche' l'errore che conta e' quello che non si e' previsto."""
    marca = I.time.strftime('%Y%m%dT%H%M%S')
    BACKUP.mkdir(parents=True, exist_ok=True)
    fatti = []
    for tab, sel in (('biblioteca_gif', '*'), ('esercizi_catalog', '*')):
        d, e = I.leggi_tutto(tab, sel, 'slug' if tab == 'biblioteca_gif' else 'codice')
        if e:
            raise SystemExit('backup di %s fallito: %s — non si scrive niente' % (tab, e))
        f = BACKUP / ('allinea_sei_%s_%s.json' % (tab, marca))
        f.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
        fatti.append('%s (%d righe) -> %s' % (tab, len(d), f.name))
    rin = [o for o in ops if o['tabella'] == 'file sul Mac']
    if rin:
        f = BACKUP / ('allinea_sei_rinomine_%s.json' % marca)
        f.write_text(json.dumps([{'da': o['a'], 'a': o['da']} for o in rin],
                                ensure_ascii=False, indent=1), encoding='utf-8')
        fatti.append('annullamento rinomine -> %s' % f.name)
    return fatti


def applica_fase1(ops):
    """Scrive le sole operazioni di fase 1, poi rilegge e confronta.

    supabase-js non lancia eccezioni e nemmeno questa `api`: l'errore torna nel
    risultato e va controllato a mano, riga per riga [L22]. Una PATCH che non
    trova la riga risponde 200 con lista vuota, quindi non basta l'assenza di
    errore: si rilegge il valore e si confronta.
    """
    fase1 = [o for o in ops if o['fase'] == 1]
    print('\n=== BACKUP ===')
    for r in salva_backup(fase1):
        print('  %s' % r)

    print('\n=== FASE 1 ===')
    esiti = []
    for o in fase1:
        if o['tabella'] == 'biblioteca_gif':
            d, e = I.api('PATCH', '/rest/v1/biblioteca_gif?slug=eq.%s'
                         % urllib.parse.quote(o['slug'], safe=''),
                         {'nome_italiano': o['dopo']})
            if e:
                esiti.append((o, 'ERRORE', e))
                continue
            r, e2 = I.api('GET', '/rest/v1/biblioteca_gif?select=nome_italiano&slug=eq.%s'
                          % urllib.parse.quote(o['slug'], safe=''))
            ok = (not e2) and r and nfc(r[0]['nome_italiano']) == nfc(o['dopo'])
            esiti.append((o, 'scritto' if ok else 'NON VERIFICATO',
                          '' if ok else (e2 or 'riletto: %r' % (r and r[0]))))
        elif o['tabella'] == 'file sul Mac':
            da, a = Path(o['da']), Path(o['a'])
            if a.exists():
                esiti.append((o, 'NON FATTO', 'esiste gia un file con quel nome'))
                continue
            if not da.exists():
                esiti.append((o, 'NON FATTO', 'il file di partenza non c e piu'))
                continue
            prima = I.sha_file(da)
            da.rename(a)
            dopo = I.sha_file(a) if a.exists() else None
            esiti.append((o, 'rinominato' if dopo == prima else 'IMPRONTA CAMBIATA',
                          'sha %s' % prima[:12]))
    for o, stato, det in esiti:
        print('  %-9s %-16s %-46.46s -> %-46.46s %s'
              % (stato, o['tabella'], o['prima'], o['dopo'], det))
    guasti = [x for x in esiti if x[1] not in ('scritto', 'rinominato')]
    print('\n  %d su %d a posto' % (len(esiti) - len(guasti), len(esiti)))
    return not guasti


def applica_fase2(ops):
    """Rinomina lo storico. Si fa DOPO il sync, mai prima.

    L'app aggancia le serie per `exercise_name`: finche' il catalogo dice il nome
    vecchio, lo storico deve dirlo. Qui il catalogo dice gia' quello nuovo, quindi
    e' lo storico a dover recuperare.
    """
    fase2 = [o for o in ops if o['fase'] == 2]
    if not fase2:
        print('\n=== FASE 2 === niente da fare.')
        return True
    print('\n=== BACKUP ===')
    marca = I.time.strftime('%Y%m%dT%H%M%S')
    BACKUP.mkdir(parents=True, exist_ok=True)
    for tab in LOG_TAB:
        d, e = I.leggi_tutto(tab, '*', 'id')
        if e:
            raise SystemExit('backup di %s fallito: %s — non si scrive niente' % (tab, e))
        f = BACKUP / ('allinea_sei_%s_%s.json' % (tab, marca))
        f.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
        print('  %s (%d righe) -> %s' % (tab, len(d), f.name))

    print('\n=== FASE 2 ===')
    tutto = True
    for o in fase2:
        prima_vecchio = conta(o['tabella'], o['prima'])
        prima_nuovo = conta(o['tabella'], o['dopo'])
        d, e = I.api('PATCH', '/rest/v1/%s?exercise_name=eq.%s'
                     % (o['tabella'], urllib.parse.quote(o['prima'], safe='')),
                     {'exercise_name': o['dopo']})
        if e:
            print('  ERRORE   %-16s %s' % (o['tabella'], e))
            tutto = False
            continue
        # non basta l'assenza di errore: si ricontano le due parti [L22]
        dopo_vecchio = conta(o['tabella'], o['prima'])
        dopo_nuovo = conta(o['tabella'], o['dopo'])
        ok = dopo_vecchio == 0 and dopo_nuovo == prima_nuovo + prima_vecchio
        tutto = tutto and ok
        print('  %-9s %-16s %-38.38s -> %-30.30s %d righe (restano %d sul vecchio, '
              '%d sul nuovo)' % ('spostate' if ok else 'DA GUARDARE', o['tabella'],
                                 o['prima'], o['dopo'], prima_vecchio,
                                 dopo_vecchio, dopo_nuovo))
    return tutto


def applica_fase3(ops, tsv_del):
    """Cancella le righe arenate a catalogo e le righe di biblioteca_gif orfane.

    Una riga tolta dal foglio non sparisce da Supabase: si arena, e si riconosce
    dall'`updated_at` piu' vecchio dell'ultimo lotto. E' l'UNICO caso in cui
    cancellare direttamente da Supabase e' sicuro, perche' il foglio non le ha
    piu' e nessun sync futuro puo' riportarle indietro [L3].

    L'ordine dentro la fase non e' libero: prima il catalogo, poi biblioteca_gif.
    Finche' la riga arenata esiste, il suo `gif_slug` punta ancora la riga che
    stiamo per togliere, e toglierla prima lascerebbe un codice senza immagine.
    """
    cat, e1 = I.leggi_tutto('esercizi_catalog', '*', 'codice')
    if e1:
        raise SystemExit('lettura catalogo fallita: %s' % e1)
    ultimo = max(r['updated_at'] for r in cat)
    per_cod = {r['codice']: r for r in cat}

    print('\n=== BACKUP ===')
    marca = I.time.strftime('%Y%m%dT%H%M%S')
    BACKUP.mkdir(parents=True, exist_ok=True)
    for tab, ord_ in (('esercizi_catalog', 'codice'), ('biblioteca_gif', 'slug')):
        d, e = I.leggi_tutto(tab, '*', ord_)
        if e:
            raise SystemExit('backup di %s fallito: %s — non si scrive niente' % (tab, e))
        f = BACKUP / ('allinea_sei_f3_%s_%s.json' % (tab, marca))
        f.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
        print('  %s (%d righe) -> %s' % (tab, len(d), f.name))

    print('\n=== FASE 3a — righe arenate a catalogo ===')
    tutto = True
    for r in tsv_del:
        cod = r['codice']
        riga = per_cod.get(cod)
        if riga is None:
            print('  gia via   %s' % cod)
            continue
        if riga['updated_at'] >= ultimo:
            print('  FERMO     %s: updated_at %s non e piu vecchio dell ultimo lotto %s — '
                  'non e arenata, il foglio potrebbe averla ancora'
                  % (cod, riga['updated_at'], ultimo))
            tutto = False
            continue
        # guardia 5: `alternativa` non ha FK, si scandisce a regex su tutto il testo
        cita = [x['codice'] for x in cat if x['codice'] != cod
                and any(isinstance(v, str) and campo != 'codice'
                        and re.search(r'\b%s\b' % cod, v)
                        for campo, v in x.items())]
        if cita:
            print('  FERMO     %s: lo nominano ancora %s' % (cod, cita))
            tutto = False
            continue
        _, e = I.api('DELETE', '/rest/v1/esercizi_catalog?codice=eq.%s' % cod)
        d2, _ = I.api('GET', '/rest/v1/esercizi_catalog?select=codice&codice=eq.%s' % cod)
        ok = (not e) and not d2
        tutto = tutto and ok
        print('  %-9s %-8s %-44.44s ferma dal %s'
              % ('tolta' if ok else 'ERRORE', cod, riga['nome'], riga['updated_at'][:10]))

    if not tutto:
        print('\n  qualcosa si e fermato in 3a: biblioteca_gif non si tocca.')
        return False

    cat2, _ = I.leggi_tutto('esercizi_catalog', 'codice,gif_slug', 'codice')
    punta = {}
    for r in cat2:
        if r.get('gif_slug'):
            punta.setdefault(r['gif_slug'], []).append(r['codice'])

    print('\n=== FASE 3b — righe biblioteca_gif rimaste orfane ===')
    for o in [x for x in ops if x['fase'] == 3]:
        s = o['chiave'].split('=', 1)[1]
        chi = punta.get(s)
        if chi:
            print('  FERMO     %s: la puntano ancora %s' % (s, chi))
            tutto = False
            continue
        _, e = I.api('DELETE', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(s, safe=''))
        d2, _ = I.api('GET', '/rest/v1/biblioteca_gif?select=slug&slug=eq.%s'
                      % urllib.parse.quote(s, safe=''))
        ok = (not e) and not d2
        tutto = tutto and ok
        print('  %-9s %-38s "%s" — oggetto nel bucket NON toccato'
              % ('tolta' if ok else 'ERRORE', s, o['prima']))
    return tutto


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--applica', action='store_true',
                    help='esegue la FASE 1 (biblioteca_gif + file sul Mac), con backup.')
    ap.add_argument('--fase2', action='store_true',
                    help='storico: training_logs + workout_sets. SOLO dopo il sync.')
    ap.add_argument('--fase3', action='store_true',
                    help='elimina le righe arenate a catalogo e le orfane in '
                         'biblioteca_gif. SOLO dopo il sync e dopo la fase 2.')
    args = ap.parse_args()

    piano = BASE / 'lavoro' / '_allinea_sei.json'

    # Applicare NON rigenera il piano: si esegue quello confermato.
    # Il piano descrive un mondo — quello del momento in cui e' stato guardato —
    # e dopo ogni fase quel mondo si muove. Ricostruirlo a meta' strada produce
    # un piano che parla di uno stato che non esiste piu': dopo il sync la
    # ricostruzione proponeva di cancellare proprio le righe che i superstiti
    # avevano appena cominciato a usare [L34]. Il piano si congela una volta e
    # si esegue; a rigenerarlo si ricomincia da capo, non si continua.
    if args.applica or args.fase2 or args.fase3:
        if not piano.exists():
            raise SystemExit('manca il piano confermato: %s' % piano)
        d = json.loads(piano.read_text(encoding='utf-8'))
        ops, allarmi, tsv_cat, tsv_del = (d['ops'], d.get('allarmi', []),
                                          d.get('catalogo', []), d['eliminare'])
        print('piano confermato del %s (congelato: %s)'
              % (d['generato'], d.get('congelato_il', '—')))
    else:
        ops, allarmi, tsv_cat, tsv_del = costruisci()
        stampa(ops, allarmi, tsv_cat, tsv_del)
        if piano.exists():
            print('\n⚠ %s esiste gia: NON lo sovrascrivo.\n'
                  '  Questa e una ricostruzione da confrontare, non il piano da eseguire.'
                  % piano.name)
        else:
            piano.write_text(json.dumps(
                {'ops': ops, 'allarmi': allarmi, 'catalogo': tsv_cat, 'eliminare': tsv_del,
                 'generato': I.time.strftime('%Y-%m-%dT%H:%M:%S')},
                ensure_ascii=False, indent=1), encoding='utf-8')
            print('piano: %s' % piano)

    if any(a.startswith('FERMARSI') for a in allarmi):
        raise SystemExit('\nCi sono allarmi bloccanti: non si applica niente.')
    if not any((args.applica, args.fase2, args.fase3)):
        print('\nProva soltanto: non e stato scritto niente.')
    else:
        fatto = (applica_fase1(ops) if args.applica else
                 applica_fase2(ops) if args.fase2 else
                 applica_fase3(ops, tsv_del))
        if not fatto:
            raise SystemExit('\nQualcosa non e andato: guarda le righe qui sopra.')
        print('\nFase conclusa.')
    I.stampa_consumo('allinea sei')


if __name__ == '__main__':
    main()
