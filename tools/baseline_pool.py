#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Baseline dei pool del generatore — replica di `_trainGenFilterPool`.

SOLA LETTURA su Supabase. Non scrive niente: stampa i numeri e basta.

------------------------------------------------------------------------------
PERCHE' QUESTO FILE ESISTE
------------------------------------------------------------------------------
La baseline si rimisura dopo ogni sync del Sheet [L17], e fino al 31 agosto 2026
la replica dei filtri veniva RISCRITTA A MANO ogni volta, letta dal sorgente e poi
buttata. Il risultato: il 22 agosto sera due repliche diverse davano `poolFinisher`
214 contro 208 sullo stesso catalogo, e nessuno poteva dire quale sbagliasse
perche' la prima non esisteva piu'. Uno scarto di poche unita' non provava niente.

Da qui in poi la replica e' UNA e sta su disco: se due misure divergono, la
differenza viene dal catalogo o dai filtri dell'app, non dallo strumento.

⚠️ RESTA UNA REPLICA, e la debolezza di fondo non sparisce: misurare una deriva
   nei filtri dell'app con una copia di quegli stessi filtri e' un cerchio che si
   chiude su se' stesso. La verita' e' `?schedaDebug=1` in app. Quando i due
   divergono, il sospettato e' QUESTO file — non l'app.

⚠️ QUANDO L'APP CAMBIA, QUESTO FILE VA CAMBIATO CON LEI. I punti portati:
     zona-tracker.html  _trainGenFilterPool        (i quattro filtri e i pool)
     zona-tracker.html  _normPattern               (lowercase + trim)
     zona-tracker.html  _TRAIN_GEN_CORE_BY_TYPE    (le funzioni core pescabili)
     zona-tracker.html  blocco ?schedaDebug=1      (come si contano i numeri)
     zona-tracker.html  _trainGenPickIsoByGruppoTarget (pattern iso|core)
     zona-tracker.html  _TRAIN_GEN_ISO_OBBLIGATORI_BY_TYPE (gli 8 gruppi chiesti)

Il profilo si legge DAL VIVO da `profiles`, non si scrive qui: il livello sta
dentro `note_salute` ("Esperienza: avanzato"), come fa _trainGenParseEsperienzaFromNote.

Uso:  python3 tools/baseline_pool.py                # profilo di Ignazio
      python3 tools/baseline_pool.py --profilo Ginevra
      python3 tools/baseline_pool.py --gruppi       # anche i gruppi degli slot iso
"""
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'biblioteca-nomi'))
from impronte import leggi_tutto  # noqa: E402

# --- costanti portate dal sorgente, verbatim ---------------------------------
APERTO_WHITELIST = {'corpo_libero', 'elastico', 'banda', 'sbarra', 'cavigliere', 'trx'}
LIVELLI_AMMESSI = {
    'principiante': {'principiante'},
    'intermedio':   {'principiante', 'intermedio'},
    'avanzato':     {'principiante', 'intermedio', 'avanzato'},
}
LUOGO_ALIASES = {'aperto': 'libero', 'libero': 'aperto'}
GEAR_ALIASES = {'elastici_tubo': 'elastico', 'cavigliere': 'cavigliera',
                'barra_corta': 'barra', 'barra_lunga': 'barra'}
EXPERIENCE_MAP = {'principiante': 'principiante', 'intermedio': 'intermedio',
                  'avanzato': 'avanzato', 'ritorno-allenamento': 'principiante'}
CORE_BY_TYPE = {
    'upper_forza':      ('core anti-rotazione',  'core rotazione'),
    'upper_ipertrofia': ('core anti-rotazione',  'core rotazione'),
    'upper_pump':       ('core anti-rotazione',  'core rotazione'),
    'push':             ('core anti-rotazione',  'core rotazione'),
    'pull':             ('core anti-rotazione',  'core rotazione'),
    'lower_forza':      ('core anti-estensione', 'core flessione'),
    'lower_ipertrofia': ('core anti-estensione', 'core flessione'),
    'legs':             ('core anti-estensione', 'core flessione'),
}
ISO_OBBLIGATORI_BY_TYPE = {
    'upper_forza':      ['deltoidi posteriori'],
    'upper_ipertrofia': ['deltoidi laterali', 'bicipiti', 'tricipiti'],
    'upper_pump':       ['deltoidi laterali', 'deltoidi posteriori', 'bicipiti',
                         'tricipiti', 'petto'],
    'lower_forza':      ['glutei'],
    'lower_ipertrofia': ['ischiocrurali', 'polpacci'],
    'fullbody':         ['deltoidi posteriori', 'polpacci'],
    'push':             ['deltoidi laterali', 'tricipiti'],
    'pull':             ['deltoidi posteriori', 'bicipiti'],
    'legs':             ['ischiocrurali', 'polpacci'],
}

norm_pattern = lambda s: str(s or '').lower().strip()
norm_attrezzo = lambda s: re.sub(r'\s+', '_', str(s or '').lower().strip())


def filtra(catalog, tipo_allen, attrezzatura, livello):
    """Porting fedele di _trainGenFilterPool. Ritorna i pool e le righe ammesse."""
    livelli_ok = LIVELLI_AMMESSI.get(livello, LIVELLI_AMMESSI['principiante'])

    attrezzatura_set = {norm_attrezzo(a) for a in (attrezzatura or [])}
    attrezzatura_set.add('corpo_libero')
    for slug in list(attrezzatura_set):
        if slug in GEAR_ALIASES:
            attrezzatura_set.add(GEAR_ALIASES[slug])

    attrezzi_catalogo = set()
    for ex in catalog:
        for a in norm_attrezzo(ex.get('attrezzo')).split(';'):
            if a.strip():
                attrezzi_catalogo.add(a.strip())
        for a in str(ex.get('surrogato_attrezzo') or '').lower().split('+'):
            if norm_attrezzo(a):
                attrezzi_catalogo.add(norm_attrezzo(a))
    inerti = [s for s in (norm_attrezzo(a) for a in (attrezzatura or []))
              if s and s != 'corpo_libero' and s not in attrezzi_catalogo
              and not (GEAR_ALIASES.get(s) in attrezzi_catalogo)]

    tipo = str(tipo_allen or '').lower().strip()
    alias = LUOGO_ALIASES.get(tipo)

    p = {'poolPrincipali': [], 'poolFinisher': [], 'poolFinisherTabata': [],
         'poolRiscaldamento': [], 'poolCarry': []}
    ammesse, surrogate = [], []

    for ex in catalog:
        # FILTRO 1 — luogo (con bypass surrogato per 'casa')
        luoghi = [x.strip() for x in str(ex.get('luogo') or '').lower().split(';') if x.strip()]
        has_sur = bool(str(ex.get('surrogato_attrezzo') or '').strip())
        if not ('qualsiasi' in luoghi or tipo in luoghi
                or (alias and alias in luoghi) or (tipo == 'casa' and has_sur)):
            continue

        # FILTRO 2 — attrezzo (con ramo surrogato per 'casa')
        nativi = [x.strip() for x in norm_attrezzo(ex.get('attrezzo')).split(';') if x.strip()]
        attrezzo_ok, is_sur = False, False
        if tipo == 'palestra':
            attrezzo_ok = True
        elif tipo == 'casa':
            attrezzo_ok = any(a in attrezzatura_set for a in nativi)
            if not attrezzo_ok and ex.get('surrogato_attrezzo'):
                surr = [norm_attrezzo(x) for x in
                        str(ex['surrogato_attrezzo']).lower().split('+') if x.strip()]
                if surr and all(a in attrezzatura_set for a in surr):
                    attrezzo_ok, is_sur = True, True
        elif tipo == 'aperto':
            attrezzo_ok = any(a in APERTO_WHITELIST for a in nativi)
        if not attrezzo_ok:
            continue

        # FILTRO 3 — livello (vuoto = ammesso a tutti)
        liv = [x.strip() for x in str(ex.get('livello') or '').lower().split(';') if x.strip()]
        if liv and not any(l in livelli_ok for l in liv):
            continue

        ammesse.append(ex)
        if is_sur:
            surrogate.append(ex)

        # FILTRO 4 — uso
        usi = [x.strip() for x in str(ex.get('uso') or '').lower().split(';') if x.strip()]
        if 'principale' in usi:    p['poolPrincipali'].append(ex)
        if 'finisher' in usi:      p['poolFinisher'].append(ex)
        if 'riscaldamento' in usi: p['poolRiscaldamento'].append(ex)
        if (norm_pattern(ex.get('pattern')) == 'loaded carry' and 'finisher' in usi
                and not re.search(r'get[\s-]?up', str(ex.get('nome') or ''), re.I)):
            p['poolCarry'].append(ex)
        if norm_pattern(ex.get('pattern')) == 'cardio_metabolico' and 'finisher' in usi:
            p['poolFinisherTabata'].append(ex)

    return p, ammesse, surrogate, sorted(attrezzatura_set), inerti


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--profilo', default='Ignazio')
    ap.add_argument('--gruppi', action='store_true',
                    help='anche i candidati pescabili per gli 8 gruppi degli slot iso')
    a = ap.parse_args()

    prof, err = leggi_tutto('profiles', 'first_name,tipo_allenamento,attrezzatura,note_salute',
                            'first_name')
    if err:
        print('ERRORE profiles:', err); return 1
    riga = next((r for r in prof if (r.get('first_name') or '') == a.profilo), None)
    if not riga:
        print('profilo non trovato: %s' % a.profilo); return 1

    # livello: sta in note_salute, come fa _trainGenParseEsperienzaFromNote
    m = re.search(r'Esperienza:\s*([a-z\-]+)', str(riga.get('note_salute') or ''), re.I)
    grezza = (m.group(1).lower() if m else 'principiante')
    livello = EXPERIENCE_MAP.get(grezza, 'principiante')

    catalog, err = leggi_tutto(
        'esercizi_catalog',
        'codice,nome,pattern,attrezzo,luogo,livello,uso,gruppo_target,surrogato_attrezzo',
        'codice')
    if err:
        print('ERRORE catalogo:', err); return 1

    pool, ammesse, surrogate, attrset, inerti = filtra(
        catalog, riga.get('tipo_allenamento'), riga.get('attrezzatura'), livello)

    # core: PESCABILI, non righe ammesse [L16]
    funzioni = set()
    for t, d in CORE_BY_TYPE.values():
        funzioni.add(t); funzioni.add(d)
    core_ammessi = [e for e in pool['poolPrincipali']
                    if str(e.get('pattern') or '').strip().lower() == 'core']
    core_pescabili = [e for e in core_ammessi
                      if str(e.get('gruppo_target') or '').strip() in funzioni]

    print('BASELINE POOL — replica di _trainGenFilterPool (SOLA LETTURA)')
    print('  profilo: %s · %s · %s · catalogo %d righe'
          % (a.profilo, riga.get('tipo_allenamento'), livello, len(catalog)))
    print('  attrezzatura: %s' % ', '.join(attrset))
    if inerti:
        print('  ⚠️ attrezzi dichiarati che non aprono nessun esercizio: %s' % ', '.join(inerti))
    print()
    print('  poolPrincipali %d · poolFinisher %d · poolRiscaldamento %d · '
          'core %d pescabili su %d ammessi · poolFinisherTabata %d · poolCarry %d'
          % (len(pool['poolPrincipali']), len(pool['poolFinisher']),
             len(pool['poolRiscaldamento']), len(core_pescabili), len(core_ammessi),
             len(pool['poolFinisherTabata']), len(pool['poolCarry'])))
    print('  righe ammesse dai tre filtri: %d su %d   (di cui dal ramo surrogato: %d)'
          % (len(ammesse), len(catalog), len(surrogate)))

    if len(core_pescabili) != len(core_ammessi):
        print('\n  ⚠️ righe core che nessuno slot puo pescare (gruppo_target da classificare):')
        for e in core_ammessi:
            if str(e.get('gruppo_target') or '').strip() not in funzioni:
                print('     %s %s → %r' % (e['codice'], e['nome'], e.get('gruppo_target') or ''))

    if a.gruppi:
        chiesti = sorted({g for v in ISO_OBBLIGATORI_BY_TYPE.values() for g in v})
        print('\n  candidati PESCABILI per gli slot di isolamento')
        print('  (_trainGenPickIsoByGruppoTarget: solo pattern isolamento o core)')
        for g in chiesti:
            righe = [e for e in pool['poolPrincipali']
                     if g in [x.strip() for x in
                              str(e.get('gruppo_target') or '').lower().split(';')]]
            pesc = [e for e in righe if norm_pattern(e.get('pattern')) in ('isolamento', 'core')]
            segno = ' ⚠️' if len(pesc) <= 2 else ''
            print('     %-22s %2d pescabili   (%d nel pool col gruppo giusto)%s'
                  % (g, len(pesc), len(righe), segno))
    return 0


if __name__ == '__main__':
    sys.exit(main())
