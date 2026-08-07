#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verifica dopo il sync Sheet -> Supabase.

SOLA LETTURA. Non scrive niente, da nessuna parte: si puo' lanciare quando si vuole.

Da lanciare SEMPRE dopo aver sincronizzato il Google Sheet. Risponde a tre domande
che sono gia' costate giri a vuoto:

  1. E' rimasta indietro qualche riga?
     Il sync fa upsert e riscrive ogni riga del foglio. Una riga TOLTA dal foglio non
     sparisce: resta su Supabase con il suo updated_at vecchio. Si e' scambiata due
     volte per un sync fallito, e si e' provato a rimetterci mano nel foglio — dove
     pero' la riga non c'era piu'.

  2. Il sync ha riportato indietro qualcosa?
     L'upsert riscrive OGNI riga presente nel foglio. Se il foglio porta ancora i
     valori vecchi, una modifica fatta prima viene annullata. E' successo il 2 agosto
     su EX049/EX053/EX114: nomi tornati indietro, gif_slug svuotati, un livello perso.
     Qui si confronta il vivo contro l'ultima fotografia (docs/STATO.json).

  3. I conteggi tornano?
     Righe attese contro righe reali, e le catene che l'app usa davvero.

Uso:  python3 verifica_sync.py
      python3 verifica_sync.py --attese 695     righe che ti aspetti a catalogo
      python3 verifica_sync.py --da docs/STATO.json
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fotografia import (CAMPI_SORVEGLIATI, REPO, leggi_biblioteca,  # noqa: E402
                        leggi_bucket, leggi_catalogo, analizza, righe_arenate)

VUOTI = ('', None)


def carica_fotografia(percorso):
    p = Path(percorso)
    if not p.is_absolute():
        p = REPO / percorso
    if not p.exists():
        return None, ('manca la fotografia %s — lancia prima: '
                      'python3 tools/biblioteca-nomi/stato.py' % p)
    try:
        return json.loads(p.read_text(encoding='utf-8')), None
    except Exception as e:
        return None, 'fotografia illeggibile (%s): %s' % (p, e)


def confronta_campi(prima_per_codice, catalogo):
    """Cosa e' cambiato nei campi sorvegliati fra la fotografia e adesso.

    Distingue due gravita':
      REGRESSIONE  un campo che aveva un valore ora e' vuoto. E' il danno tipico del
                   sync: gif_slug svuotato = GIF che non si trova; livello perso =
                   esercizio che esce dai pool senza che nessuno se ne accorga.
      cambiato     valore diverso ma non vuoto. Puo' essere una modifica voluta:
                   si elenca perche' la si guardi, non perche' sia un errore.
    """
    regressioni, cambiati = [], []
    for c in catalogo:
        vecchia = prima_per_codice.get(c['codice'])
        if not vecchia:
            continue
        for campo in CAMPI_SORVEGLIATI:
            era, ora = vecchia.get(campo), c.get(campo)
            if era == ora:
                continue
            voce = {'codice': c['codice'], 'campo': campo, 'era': era, 'ora': ora,
                    'nome_attuale': c.get('nome')}
            if era not in VUOTI and ora in VUOTI:
                regressioni.append(voce)
            else:
                cambiati.append(voce)
    return regressioni, cambiati


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--da', default='docs/STATO.json',
                    help='fotografia con cui confrontare (default docs/STATO.json)')
    ap.add_argument('--attese', type=int, default=None,
                    help='righe che ti aspetti a catalogo dopo questo sync')
    args = ap.parse_args()

    print('Verifica dopo il sync — sola lettura, non modifico niente.\n')

    prima, err = carica_fotografia(args.da)
    if err:
        sys.exit('  ' + err)
    quando_prima = prima.get('quando', '?')
    prima_cat = prima.get('_catalogo_righe') or []
    print('  confronto con la fotografia del %s' % quando_prima[:16].replace('T', ' alle '))

    catalogo, e = leggi_catalogo()
    if e:
        sys.exit('  lettura catalogo fallita: %s' % e)
    biblioteca, e = leggi_biblioteca()
    if e:
        sys.exit('  lettura biblioteca_gif fallita: %s' % e)
    per_zona, oggetti, e = leggi_bucket()
    if e:
        sys.exit('  lettura bucket fallita: %s' % e)

    adesso = analizza(catalogo, biblioteca, per_zona, oggetti)
    c_ora, c_pri = adesso['catalogo'], prima.get('catalogo', {})
    b_ora, b_pri = adesso['biblioteca_gif'], prima.get('biblioteca_gif', {})

    anomalie = []

    # ---------------------------------------------------- 1. righe arenate
    _, arenate, non_databili = righe_arenate(catalogo)
    print('\n1. RIGHE RIMASTE INDIETRO')
    if arenate:
        anomalie.append('%d righe arenate' % len(arenate))
        print('   ⚠️  %d righe non toccate da questo sync: sono state tolte dal foglio.'
              % len(arenate))
        print('       È l\'unico caso in cui cancellarle da Supabase è sicuro:')
        print('       il foglio non le ha più, nessun sync futuro può riportarle indietro.\n')
        for r in arenate:
            print('       %-7s %-44s ferma dal %s'
                  % (r['codice'], (r.get('nome') or '')[:44],
                     (r.get('updated_at') or '')[:16].replace('T', ' ')))
    else:
        print('   ✅ nessuna: ogni riga del catalogo è stata riscritta da questo sync.')
    if non_databili:
        anomalie.append('%d righe senza data' % len(non_databili))
        print('   ⚠️  %d righe senza data di modifica: %s'
              % (len(non_databili), ', '.join(r['codice'] for r in non_databili[:10])))

    # ------------------------------------------------- 2. regressioni sync
    print('\n2. VALORI RIPORTATI INDIETRO')
    if not prima_cat:
        print('   (la fotografia non contiene il dettaglio riga per riga:')
        print('    rilancia stato.py per averlo al prossimo confronto)')
    else:
        prima_per_codice = {r['codice']: r for r in prima_cat}
        regressioni, cambiati = confronta_campi(prima_per_codice, catalogo)
        if regressioni:
            anomalie.append('%d regressioni' % len(regressioni))
            print('   ⚠️  %d campi che avevano un valore e ora sono VUOTI:\n' % len(regressioni))
            for x in regressioni:
                print('       %-7s %-12s era "%s"  →  ora vuoto   (%s)'
                      % (x['codice'], x['campo'], (x['era'] or '')[:40],
                         (x['nome_attuale'] or '')[:34]))
            print('\n       Questo è il danno tipico del sync: il foglio portava ancora')
            print('       il valore vecchio e ha annullato una modifica fatta prima.')
        else:
            print('   ✅ nessun campo svuotato fra nome, gif_slug e livello.')
        if cambiati:
            print('\n   %d valori cambiati (non vuoti) — da guardare, non per forza errori:'
                  % len(cambiati))
            for x in cambiati[:25]:
                print('       %-7s %-12s "%s"  →  "%s"'
                      % (x['codice'], x['campo'], (x['era'] or '')[:32], (x['ora'] or '')[:32]))
            if len(cambiati) > 25:
                print('       … e altri %d' % (len(cambiati) - 25))

        nuovi = sorted(set(r['codice'] for r in catalogo) - set(prima_per_codice))
        spariti = sorted(set(prima_per_codice) - set(r['codice'] for r in catalogo))
        if nuovi:
            print('\n   codici nuovi rispetto alla fotografia: %d  (%s%s)'
                  % (len(nuovi), ', '.join(nuovi[:12]), ' …' if len(nuovi) > 12 else ''))
        if spariti:
            anomalie.append('%d codici spariti' % len(spariti))
            print('\n   ⚠️  codici presenti nella fotografia e ora ASSENTI: %s'
                  % ', '.join(spariti))

    # --------------------------------------------------------- 3. conteggi
    print('\n3. CONTEGGI')
    def confronta(etichetta, ora_v, pri_v, atteso=None):
        segno = ''
        if pri_v is not None and ora_v != pri_v:
            segno = '   (era %s, %+d)' % (pri_v, ora_v - pri_v)
        riga = '   %-34s %6s%s' % (etichetta, ora_v, segno)
        if atteso is not None and ora_v != atteso:
            anomalie.append('%s: %s invece di %s' % (etichetta, ora_v, atteso))
            riga += '   ⚠️  atteso %s' % atteso
        print(riga)

    confronta('righe a catalogo', c_ora['righe'], c_pri.get('righe'), args.attese)
    confronta('codici con GIF', c_ora['con_gif_slug'], c_pri.get('con_gif_slug'))
    confronta('codici senza GIF', c_ora['senza_gif_slug'], c_pri.get('senza_gif_slug'))
    confronta('righe in biblioteca_gif', b_ora['righe'], b_pri.get('righe'))
    confronta('GIF vive (codice + file)', b_ora['viva'], b_pri.get('viva'))
    confronta('prossimo codice libero',
              c_ora['prossimo_codice_libero'], c_pri.get('prossimo_codice_libero'))

    # --------------------------------------------- 4. catene che l'app usa
    print('\n4. CATENE CHE L\'APP USA DAVVERO')
    rotti = c_ora['slug_senza_riga_in_biblioteca']
    if rotti:
        anomalie.append('%d catene rotte' % len(rotti))
        print('   ⚠️  %d gif_slug non trovano riga in biblioteca_gif' % len(rotti))
        print('       (il Worker risponde "missing": la GIF non si vede)')
        for s in rotti[:20]:
            print('       %s' % s)
    else:
        print('   ✅ tutti i %d gif_slug trovano la loro riga.' % c_ora['con_gif_slug'])

    if b_ora['rotta']:
        anomalie.append('%d righe senza file' % b_ora['rotta'])
        print('   ⚠️  %d righe puntate da un codice ma senza file nel bucket'
              % b_ora['rotta'])
    else:
        print('   ✅ ogni riga puntata da un codice ha il suo file nel bucket.')

    condivisi = c_ora['slug_condivisi_da_piu_codici']
    if condivisi:
        anomalie.append('%d slug condivisi' % len(condivisi))
        print('   ⚠️  %d slug puntati da più di un codice:' % len(condivisi))
        for s, cod in sorted(condivisi.items()):
            print('       %s ← %s' % (s, ', '.join(cod)))
    else:
        print('   ✅ nessuno slug puntato da più di un codice.')

    # ----------------------------------------------------------- esito
    print('\n' + '─' * 68)
    if anomalie:
        print('ESITO: %s — %s'
              % ('1 cosa da guardare' if len(anomalie) == 1
                 else '%d cose da guardare' % len(anomalie), ' · '.join(anomalie)))
        print('\nQuando le hai sistemate, rilancia questo comando.')
        print('Poi aggiorna la fotografia:  python3 tools/biblioteca-nomi/stato.py')
        return 1
    print('ESITO: tutto a posto. Il sync non ha lasciato righe indietro,')
    print('       non ha riportato indietro nessun valore e le catene reggono.')
    print('\nAggiorna la fotografia:  python3 tools/biblioteca-nomi/stato.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
