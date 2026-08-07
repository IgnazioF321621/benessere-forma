#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fotografia dello stato -> docs/STATO.md + docs/STATO.json

SOLA LETTURA su Supabase e Storage. Scrive due soli file, dentro docs/.

Perche' esiste: i numeri di riferimento (righe a catalogo, slug che risolvono,
oggetti nel bucket, prossimo codice libero) venivano rimisurati a mano a ogni
sessione, con il rischio di ripartire da un numero vecchio scritto in CLAUDE.md.
Qui si misurano una volta, si salvano nel repo e si aggiornano quando servono.

  STATO.json  per gli strumenti: verifica_sync.py lo usa come termine di paragone
  STATO.md    per leggerlo

Uso:  python3 stato.py            scrive i due file
      python3 stato.py --mostra   stampa e basta, non scrive
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fotografia import REPO, fotografa  # noqa: E402

DOCS = REPO / 'docs'


def riga_tabella(etichetta, valore, nota=''):
    return '| %s | %s | %s |' % (etichetta, valore, nota)


def scrivi_md(a):
    c, b, k = a['catalogo'], a['biblioteca_gif'], a['bucket']

    arenate = c['righe_arenate']
    rotti = c['slug_senza_riga_in_biblioteca']
    condivisi = c['slug_condivisi_da_piu_codici']

    r = []
    r.append('# Stato — fotografia automatica')
    r.append('')
    r.append('*Generato da `tools/biblioteca-nomi/stato.py` il %s.* Sola lettura: '
             'nessuna modifica a database, Storage o Sheet.' % a['quando'][:16].replace('T', ' alle '))
    r.append('')
    r.append('**Non si aggiorna da solo.** Va rilanciato dopo ogni sync del Sheet e dopo '
             'ogni migrazione di zona — sono i due momenti in cui questi numeri si spostano.')
    r.append('')

    # --- semaforo -------------------------------------------------------
    problemi = []
    if arenate:
        problemi.append('%d righe arenate nel catalogo' % len(arenate))
    if rotti:
        problemi.append('%d gif_slug senza riga in biblioteca_gif' % len(rotti))
    if b['rotta']:
        problemi.append('%d righe che puntano a un file mancante' % b['rotta'])
    if condivisi:
        problemi.append('%d slug puntati da più di un codice' % len(condivisi))
    if c.get('righe_senza_data'):
        problemi.append('%d righe senza data di modifica' % len(c['righe_senza_data']))
    r.append('## In una riga')
    r.append('')
    if problemi:
        r.append('⚠️ **Da guardare**: ' + ' · '.join(problemi) + '.')
    else:
        r.append('✅ **Nessuna anomalia**: nessuna riga arenata, nessuna catena rotta, '
                 'nessuno slug condiviso da più codici.')
    r.append('')

    # --- catalogo -------------------------------------------------------
    r.append('## Catalogo esercizi (`esercizi_catalog`)')
    r.append('')
    r.append('| | valore | nota |')
    r.append('|---|---|---|')
    r.append(riga_tabella('Righe totali', c['righe'], ''))
    r.append(riga_tabella('Ultimo sync', (c['ultimo_sync'] or '—').replace('T', ' ')[:16],
                          'istante in cui il foglio ha riscritto le righe'))
    r.append(riga_tabella('Righe arenate', len(arenate),
                          'tolte dal foglio, ferme su Supabase' if arenate
                          else 'nessuna: foglio e database allineati'))
    r.append(riga_tabella('Prossimo codice libero', c['prossimo_codice_libero'] or '—',
                          'da allocare al momento della scrittura, mai in anticipo'))
    r.append(riga_tabella('Codici con GIF', c['con_gif_slug'], ''))
    r.append(riga_tabella('Codici senza GIF', c['senza_gif_slug'], 'cantiere 2'))
    r.append(riga_tabella('Catene rotte', len(rotti),
                          'gif_slug che non trova riga in biblioteca_gif'))
    r.append(riga_tabella('Slug su più codici', len(condivisi),
                          'guardia "1 codice per slug"'))
    r.append('')

    if arenate:
        r.append('### ⚠️ Righe arenate')
        r.append('')
        r.append("Sono state tolte dal foglio ma sono ancora su Supabase. **È l'unico caso "
                 "in cui cancellare direttamente da Supabase è sicuro**: il foglio non le ha "
                 "più, quindi nessun sync futuro può riportarle indietro.")
        r.append('')
        r.append('| codice | nome | fermo dal |')
        r.append('|---|---|---|')
        for x in arenate:
            r.append('| %s | %s | %s |' % (x['codice'], x['nome'] or '—',
                                           (x['updated_at'] or '—').replace('T', ' ')[:16]))
        r.append('')

    if rotti:
        r.append('### ⚠️ Catene rotte')
        r.append('')
        r.append("Il codice ha un `gif_slug` che non esiste in `biblioteca_gif`: "
                 "il Worker risponde `missing` e l'app non mostra la GIF.")
        r.append('')
        for s in rotti:
            r.append('- `%s`' % s)
        r.append('')

    if condivisi:
        r.append('### ⚠️ Slug puntati da più di un codice')
        r.append('')
        for s, codici in sorted(condivisi.items()):
            r.append('- `%s` ← %s' % (s, ', '.join(codici)))
        r.append('')

    r.append('### Gap permanenti')
    r.append('')
    r.append('Codici bruciati, **mai renumerare**: %s'
             % (', '.join(c['gap_permanenti']) if c['gap_permanenti'] else 'nessuno'))
    r.append('')
    r.append('### Ripartizione')
    r.append('')
    r.append('**Per uso**: ' + ' · '.join('%s %d' % (k, v)
                                          for k, v in sorted(c['per_uso'].items())))
    r.append('')
    r.append('**Per livello**: ' + ' · '.join('%s %d' % (k, v)
                                              for k, v in sorted(c['per_livello'].items())))
    r.append('')

    # --- biblioteca -----------------------------------------------------
    r.append('## Indice delle GIF (`biblioteca_gif`)')
    r.append('')
    r.append('Ogni riga sta in una di quattro caselle, secondo due domande: '
             'la punta un codice? il file esiste nel bucket?')
    r.append('')
    r.append('| casella | righe | cosa significa |')
    r.append('|---|---|---|')
    r.append("| **Viva** | %d | un codice la punta e il file c'è — è ciò che l'app mostra |"
             % b['viva'])
    r.append("| **Rotta** | %d | un codice la punta ma il file non c'è — **l'app mostra `missing`** |"
             % b['rotta'])
    r.append("| **Libera** | %d | la GIF c'è ma nessun codice la usa — cantiere 16 |"
             % b['libera'])
    r.append('| **Morta** | %d | nessun codice e nessun file — cantiere 3E |' % b['morta'])
    r.append('| TOTALE | %d | |' % b['righe'])
    r.append('')
    if b['rotta']:
        r.append('⚠️ **%d righe rotte**: %s'
                 % (b['rotta'], ', '.join('`%s`' % s for s in b['elenco_rotte'][:20])))
        r.append('')

    # --- bucket ---------------------------------------------------------
    r.append('## Bucket Storage (`biblioteca-gif`)')
    r.append('')
    r.append('| zona | oggetti |')
    r.append('|---|---|')
    for z, n in sorted(k['per_zona'].items()):
        r.append('| %s | %d |' % (z, n))
    r.append('| **TOTALE** | **%d** |' % k['oggetti'])
    r.append('')
    senza_riga = k['file_senza_riga']
    r.append('File nel bucket che nessuna riga indicizza: **%d**%s'
             % (len(senza_riga), '' if not senza_riga else ''))
    if senza_riga:
        r.append('')
        for p in senza_riga[:40]:
            r.append('- `%s`' % p)
        if len(senza_riga) > 40:
            r.append('- … e altri %d' % (len(senza_riga) - 40))
    r.append('')
    r.append('---')
    r.append('')
    r.append('*Per rigenerare: `python3 tools/biblioteca-nomi/stato.py`*')
    r.append('')
    return '\n'.join(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mostra', action='store_true',
                    help='stampa soltanto, non scrive i file')
    args = ap.parse_args()

    print('Lettura di catalogo, indice GIF e bucket… (sola lettura)')
    a, err = fotografa()
    if err:
        sys.exit('lettura fallita: %s' % err)

    c, b, k = a['catalogo'], a['biblioteca_gif'], a['bucket']
    print('')
    print('  catalogo        : %d righe, ultimo sync %s'
          % (c['righe'], (c['ultimo_sync'] or '—').replace('T', ' ')))
    print('  righe arenate   : %d' % len(c['righe_arenate']))
    print('  con GIF         : %d   senza GIF: %d' % (c['con_gif_slug'], c['senza_gif_slug']))
    print('  catene rotte    : %d' % len(c['slug_senza_riga_in_biblioteca']))
    print('  slug condivisi  : %d' % len(c['slug_condivisi_da_piu_codici']))
    print('  prossimo libero : %s' % c['prossimo_codice_libero'])
    print('  biblioteca_gif  : %d righe — vive %d, rotte %d, libere %d, morte %d'
          % (b['righe'], b['viva'], b['rotta'], b['libera'], b['morta']))
    print('  bucket          : %d oggetti, %d senza riga'
          % (k['oggetti'], len(k['file_senza_riga'])))

    if args.mostra:
        print('\n(--mostra: nessun file scritto)')
        return

    DOCS.mkdir(exist_ok=True)
    (DOCS / 'STATO.json').write_text(
        json.dumps(a, ensure_ascii=False, indent=1), encoding='utf-8')
    (DOCS / 'STATO.md').write_text(scrivi_md(a), encoding='utf-8')
    print('\n  scritto: %s' % (DOCS / 'STATO.md'))
    print('           %s' % (DOCS / 'STATO.json'))


if __name__ == '__main__':
    main()
