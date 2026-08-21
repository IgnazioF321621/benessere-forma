#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lavoro 3 di Polpacci: la riga nuova, piu' due `luogo` da correggere.

    python3 tools/biblioteca-nomi/piano_polpacci_l3.py            # prova, non scrive
    python3 tools/biblioteca-nomi/piano_polpacci_l3.py --applica  # fase 1, con backup

Tre cose, decise da Ignazio guardando la GIF:

  1. una riga nuova a catalogo, EX676 `Calf raise cavo basso dietro`, per la GIF
     che finora era indicizzata e non usata da nessun esercizio
  2. EX065: `luogo` da `palestra` a `casa;libero;palestra`
  3. EX568: `luogo` da `palestra` a `casa;libero;palestra`

Le ultime due non sono rifiniture: sono due esercizi eseguibili in casa marcati
palestra, e finche' lo restano il pool casalingo dei polpacci ne ha due in meno.

------------------------------------------------------------------------------
DUE FASI, PERCHE' IL CATALOGO NON SI SCRIVE
------------------------------------------------------------------------------
  fase 1 (adesso)   biblioteca_gif: slug e nome_italiano · nome del file sul Mac
  --- sync del Sheet, a mano: EX676 nuova, EX065 e EX568 corrette ---
  fase 2 (dopo)     verifica che la catena regga e che EX676 risponda

Lo slug si aggiorna IN PLACE e non servono righe doppie: verificato che nessun
codice punti `calf-raise-elastico-maniglie-in-piedi`, e senza un codice che la
punti non esiste catena da proteggere. La verifica si rifa' viva a ogni
esecuzione, non si fida del piano [L34].

L'ordine conta: lo slug nuovo deve esistere in `biblioteca_gif` PRIMA che il
sync porti dentro EX676, o per la finestra fra i due il Worker risponderebbe
`missing` sul codice nuovo.

------------------------------------------------------------------------------
CIO' CHE NON SI DEDUCE NON SI SCRIVE
------------------------------------------------------------------------------
Le colonne che descrivono il movimento — `zone_rischio`, `adattamento`, `setup`,
`esecuzione`, `errori`, `nota_sicurezza`, e i tre campi del surrogato — si
riempiono guardando la GIF. Qui restano vuote e dichiarate DA GUARDARE: una
colonna riempita a occhio ha lo stesso aspetto di una verificata, ed e' la
differenza che non si vede piu' dopo.
"""
import argparse
import json
import sys
import unicodedata
import urllib.parse
from pathlib import Path

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))
import impronte as I                                    # noqa: E402
from nomenclatura import slug as fai_slug               # noqa: E402

BIB = Path('/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi/Polpacci')
PIANO = BASE / 'lavoro' / '_polpacci_l3.json'
BACKUP = BASE / 'backup'

SLUG_VECCHIO = 'calf-raise-elastico-maniglie-in-piedi'
NOME = 'Calf raise cavo basso dietro'
LUOGO_NUOVO = 'casa;libero;palestra'
CORREZIONI = {'EX065': LUOGO_NUOVO, 'EX568': LUOGO_NUOVO}

# Colonne del catalogo, ordine fisico della tabella (23). NON e' l'ordine del
# foglio: qui serve solo a non dimenticarne nessuna, e infatti la consegna e'
# un elenco per nome di colonna, non un TSV posizionale [L5].
COLONNE = ['codice', 'nome', 'pattern', 'attrezzo', 'luogo', 'muscoli', 'livello',
           'zone_rischio', 'adattamento', 'alternativa', 'setup', 'esecuzione',
           'errori', 'nota_sicurezza', 'updated_at', 'uso', 'surrogato_attrezzo',
           'nota_surrogato', 'gruppo_target', 'esecuzione_surrogato',
           'errori_surrogato', 'gif_slug', 'nome_en']

# Cio' che si sa senza guardare la GIF: la decisione presa, e le convenzioni che
# tutte e 18 le righe della zona seguono all'unanimita'.
NOTI = {'nome': NOME, 'attrezzo': 'cavo basso', 'luogo': 'casa;palestra',
        'surrogato_attrezzo': 'elastico', 'gif_slug': fai_slug(NOME),
        'pattern': 'isolamento', 'gruppo_target': 'polpacci', 'uso': 'principale',
        'muscoli': 'polpacci'}
SCRITTE_DAL_SYNC = {'updated_at'}
DEPRECATE = {'nome_en'}


def nfc(s):
    return unicodedata.normalize('NFC', s or '')


def raccogli():
    cat, e1 = I.leggi_tutto('esercizi_catalog', '*', 'codice')
    bg, e2 = I.leggi_tutto('biblioteca_gif', '*', 'slug')
    if e1 or e2:
        raise SystemExit('lettura fallita: %s %s' % (e1, e2))
    allarmi = []

    riga = next((r for r in bg if r['slug'] == SLUG_VECCHIO), None)
    if riga is None:
        allarmi.append('FERMARSI — la riga %s non c e piu' % SLUG_VECCHIO)
        return None, None, None, allarmi

    # la domanda si rifa' viva: il piano dice chi non aveva codici quando e'
    # stato scritto, non chi non ne ha adesso [L34]
    punt = [r['codice'] for r in cat if r.get('gif_slug') == SLUG_VECCHIO]
    if punt:
        allarmi.append('FERMARSI — %s e puntato da %s: serve l ordine a righe doppie'
                       % (SLUG_VECCHIO, punt))
    cita = [r['codice'] for r in cat
            if any(isinstance(v, str) and SLUG_VECCHIO in v for v in r.values())]
    if cita:
        allarmi.append('FERMARSI — lo slug vecchio e nominato da %s' % cita)

    nuovo_slug = fai_slug(NOME)
    if any(r['slug'] == nuovo_slug for r in bg):
        allarmi.append('FERMARSI — lo slug %s e gia di un altra riga' % nuovo_slug)
    if any(nfc(r['nome']) == nfc(NOME) for r in cat):
        allarmi.append('FERMARSI — "%s" e gia il nome di un altro codice' % NOME)

    n = sorted(int(r['codice'][2:]) for r in cat)
    codice = 'EX%03d' % (n[-1] + 1)          # mai un gap, mai un codice riusato
    if any(r['codice'] == codice for r in cat):
        allarmi.append('FERMARSI — %s esiste gia' % codice)

    # il file sul Mac si trova per IMPRONTA, non per nome: la zona e' stata
    # rinominata due ore fa e un ponte sul percorso sarebbe gia' scaduto
    prep = json.loads((BASE / 'lavoro' / 'polpacci.json').read_text(encoding='utf-8'))
    sha = next((r['sha256'] for r in prep['righe']
                if nfc(riga['storage_path']) in [nfc(x) for x in r['storage_paths']]), None)
    vivo = next((v['percorso'] for v in I.indice_locale(verbose=False).values()
                 if v['sha256'] == sha), None) if sha else None
    if vivo is None:
        allarmi.append('FERMARSI — nessun file sul Mac con l impronta di quella riga')
        file_da = file_a = None
    else:
        file_da = Path(vivo)
        file_a = file_da.with_name(NOME + file_da.suffix)
        if file_a.exists() and nfc(file_a.name) != nfc(file_da.name):
            allarmi.append('FERMARSI — esiste gia "%s" sul Mac' % file_a.name)

    ops = [
        dict(fase=1, tabella='biblioteca_gif', chiave='slug=%s' % SLUG_VECCHIO,
             campo='slug', prima=riga['slug'], dopo=nuovo_slug),
        dict(fase=1, tabella='biblioteca_gif', chiave='slug=%s' % SLUG_VECCHIO,
             campo='nome_italiano', prima=riga['nome_italiano'], dopo=NOME),
    ]
    if file_da is not None:
        ops.append(dict(fase=1, tabella='file sul Mac', chiave='Polpacci',
                        campo='nome file', prima=file_da.name, dopo=file_a.name,
                        da=str(file_da), a=str(file_a), sha256_mac=sha))

    # cio' che non cambia, e va detto: il basename nel bucket resta quello di
    # prima perche' allinearlo vorrebbe dire toccare storage_path, e la regola
    # dice che il nome del file nel bucket e' cosmesi
    resta = dict(storage_path=riga['storage_path'], categoria=riga['categoria'],
                 gruppo_muscolare=riga['gruppo_muscolare'],
                 nome_originale=riga['nome_originale'])

    nuova = {}
    for c in COLONNE:
        if c == 'codice':
            nuova[c] = codice
        elif c in NOTI:
            nuova[c] = NOTI[c]
        elif c in SCRITTE_DAL_SYNC:
            nuova[c] = '(la scrive il sync)'
        elif c in DEPRECATE:
            nuova[c] = '(deprecata dal 19/07/2026 — si lascia vuota)'
        else:
            nuova[c] = 'DA GUARDARE'
    return ops, nuova, resta, allarmi


def stampa(ops, nuova, resta, allarmi, cat):
    print('\n=== FASE 1 — cosa cambia adesso ===')
    print('%-16s %-40.40s %-16s %-40.40s %s'
          % ('tabella', 'chiave', 'campo', 'prima', 'dopo'))
    for o in ops:
        print('%-16s %-40.40s %-16s %-40.40s %s'
              % (o['tabella'], o['chiave'], o['campo'], o['prima'], o['dopo']))

    print('\n=== NON CAMBIA, ED E VOLUTO ===')
    for k, v in resta.items():
        print('  %-18s %s' % (k, v))
    print('  il basename nel bucket resta quello di prima: allinearlo vorrebbe dire')
    print('  toccare storage_path, e il nome del file nel bucket e cosmesi.')

    print('\n=== CATALOGO — riga nuova %s, per nome di colonna ===' % nuova['codice'])
    for c in COLONNE:
        v = nuova[c]
        segno = '  ' if v not in ('DA GUARDARE',) else '⚠ '
        print('  %s%-22s %s' % (segno, c, v))

    print('\n=== CATALOGO — le due correzioni di `luogo` ===')
    per = {r['codice']: r for r in cat}
    for cod, nuovo in CORREZIONI.items():
        r = per.get(cod)
        if r is None:
            print('  ⚠ %s non e a catalogo' % cod)
            continue
        print('  %-7s %-42.42s luogo: %r -> %r'
              % (cod, r['nome'], r['luogo'], nuovo))
        if nfc(r['luogo']) == nfc(nuovo):
            print('        (gia cosi: niente da fare)')

    print('\n=== STORICO ===')
    for cod in CORREZIONI:
        r = per.get(cod)
        if not r:
            continue
        n = [len(I.api('GET', '/rest/v1/%s?select=id&exercise_name=eq.%s&limit=100000'
                       % (t, urllib.parse.quote(r['nome'], safe='')))[0] or [])
             for t in ('training_logs', 'workout_sets')]
        print('  %-7s %-42.42s training_logs=%-3d workout_sets=%-3d  → non si tocca: '
              'cambia `luogo`, non il nome' % (cod, r['nome'], n[0], n[1]))
    print('  %s: riga nuova, nessuno storico da spostare.' % nuova['codice'])

    print('\n=== DA GUARDARE ===')
    for a in allarmi:
        print('  ⚠ %s' % a)
    mancanti = [c for c in COLONNE if nuova[c] == 'DA GUARDARE']
    print('  %d colonne di %s richiedono di guardare la GIF: %s'
          % (len(mancanti), nuova['codice'], ', '.join(mancanti)))
    if not allarmi:
        print('  nessun allarme bloccante.')


def applica(ops):
    marca = I.time.strftime('%Y%m%dT%H%M%S')
    BACKUP.mkdir(parents=True, exist_ok=True)
    d, e = I.leggi_tutto('biblioteca_gif', '*', 'slug')
    if e:
        raise SystemExit('backup fallito: %s — non si scrive niente' % e)
    f = BACKUP / ('polpacci_l3_biblioteca_gif_%s.json' % marca)
    f.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
    print('\n=== BACKUP ===\n  biblioteca_gif (%d righe) -> %s' % (len(d), f.name))
    rin = [o for o in ops if o['tabella'] == 'file sul Mac']
    if rin:
        g = BACKUP / ('polpacci_l3_annulla_%s.json' % marca)
        g.write_text(json.dumps([{'da': o['a'], 'a': o['da'],
                                  'sha256_mac': o['sha256_mac']} for o in rin],
                                ensure_ascii=False, indent=1), encoding='utf-8')
        print('  annullamento della rinomina -> %s' % g.name)

    print('\n=== FASE 1 ===')
    tutto = True
    campi = {o['campo']: o['dopo'] for o in ops if o['tabella'] == 'biblioteca_gif'}
    if campi:
        _, e = I.api('PATCH', '/rest/v1/biblioteca_gif?slug=eq.%s'
                     % urllib.parse.quote(SLUG_VECCHIO, safe=''), campi)
        letto, e2 = I.api('GET', '/rest/v1/biblioteca_gif?select=slug,nome_italiano'
                          '&slug=eq.%s' % urllib.parse.quote(campi['slug'], safe=''))
        ok = (not e) and (not e2) and letto and nfc(letto[0]['nome_italiano']) == nfc(NOME)
        tutto = tutto and ok
        print('  %-9s biblioteca_gif  slug=%s · nome_italiano=%s'
              % ('scritto' if ok else 'ERRORE', campi.get('slug'), campi.get('nome_italiano')))
    for o in rin:
        src, dst = Path(o['da']), Path(o['a'])
        if not src.exists() or dst.exists():
            print('  NON FATTO %s' % o['prima'])
            tutto = False
            continue
        src.rename(dst)
        ok = dst.exists() and I.sha_file(dst) == o['sha256_mac']
        tutto = tutto and ok
        print('  %-9s file sul Mac    %s -> %s'
              % ('fatto' if ok else 'IMPRONTA CAMBIATA', o['prima'], o['dopo']))
    return tutto


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--applica', action='store_true')
    args = ap.parse_args()
    cat, _ = I.leggi_tutto('esercizi_catalog', '*', 'codice')

    if args.applica:
        if not PIANO.exists():
            raise SystemExit('manca il piano confermato: %s' % PIANO)
        d = json.loads(PIANO.read_text(encoding='utf-8'))
        ops, allarmi = d['ops'], d['allarmi']
        print('piano confermato del %s' % d['generato'])
    else:
        ops, nuova, resta, allarmi = raccogli()
        if ops is None:
            for a in allarmi:
                print('⚠ %s' % a)
            raise SystemExit(1)
        stampa(ops, nuova, resta, allarmi, cat)
        if PIANO.exists():
            print('\n⚠ %s esiste gia: NON lo sovrascrivo — ricostruzione da confrontare.'
                  % PIANO.name)
        else:
            PIANO.write_text(json.dumps(
                {'generato': I.time.strftime('%Y-%m-%dT%H:%M:%S'), 'ops': ops,
                 'riga_nuova': nuova, 'correzioni_luogo': CORREZIONI,
                 'non_cambia': resta, 'allarmi': allarmi},
                ensure_ascii=False, indent=1), encoding='utf-8')
            print('\npiano: %s' % PIANO)

    if any(a.startswith('FERMARSI') for a in allarmi):
        raise SystemExit('\nAllarmi bloccanti: non si scrive niente.')
    if not args.applica:
        print('\nProva soltanto: non e stato scritto niente.')
    elif applica(ops):
        print('\nFase 1 conclusa. Ora il sync del Sheet, poi la verifica.')
    else:
        raise SystemExit('\nQualcosa non e andato: guarda le righe qui sopra.')
    I.stampa_consumo('piano Polpacci L3')


if __name__ == '__main__':
    main()
