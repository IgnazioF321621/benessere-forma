#!/usr/bin/env python3
"""Ondata 3, Sessione F (11 ottobre 2026) — prepara per il foglio Google le due colonne nuove del
catalogo (Catalogo e GIF 040, Training 280 e 320) e il testo corretto di EX647 (Catalogo 080).

SOLA LETTURA del database (chiave pubblica della pagina): niente si scrive su Supabase. Il catalogo si
scrive solo dal foglio: Ignazio incolla, poi sync e verifica_sync.py.

Uscite, in tools/catalogo/ondata3/ (TSV con intestazione, UTF-8 con BOM, CRLF — L5, L14):
  unilaterale_progressione.tsv  tutte le righe del catalogo in ordine di codice: codice · nome · unilaterale · progressione
  da_rivedere.tsv               le sole righe con unilaterale = si o alternato, per il controllo di Ignazio
  ex647.tsv                     la riga di EX647 pronta, nelle 22 colonne del foglio nel suo ordine
  ex647_verticale.txt           la stessa riga come elenco colonna → valore (immune allo sfasamento)

Valori di `unilaterale`:  si (un lato per volta: le ripetizioni si contano per lato) · alternato (i lati si
alternano dentro la serie) · no.
Valori di `progressione` (una frase, come la dice il coach quando si arriva in cima alle ripetizioni):
  carico · elastico più duro · meno assistenza · carico in mano · ritmo più lento · variante più difficile ·
  più ripetizioni · tenuta più lunga.
Le regole stanno in classifica_unilaterale() e classifica_progressione(): si leggono e si correggono qui,
mai a mano nel TSV.

  python3 tools/catalogo/ondata3_prepara.py [--da-file catalogo.json]
"""
import json, re, sys, os, urllib.request

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.abspath(os.path.join(QUI, '..', '..'))
USCITA = os.path.join(QUI, 'ondata3')
URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co'
COLONNE_FOGLIO = ['codice','nome','nome_en','pattern','gruppo_target','attrezzo','luogo','muscoli','livello','uso',
                  'zone_rischio','adattamento','alternativa','setup','esecuzione','errori','nota_sicurezza',
                  'surrogato_attrezzo','nota_surrogato','esecuzione_surrogato','errori_surrogato','gif_slug']

def chiave_pubblica():
    with open(os.path.join(RADICE, 'zona-tracker.html'), encoding='utf-8') as f:
        m = re.search(r"const SUPABASE_KEY = '([^']+)'", f.read())
    return m.group(1)

def leggi_catalogo(da_file=None):
    if da_file:
        return json.load(open(da_file, encoding='utf-8'))
    k = chiave_pubblica()
    req = urllib.request.Request(URL + '/rest/v1/esercizi_catalog?select=*&order=codice&limit=2000',
                                 headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Range': '0-1999'})
    return json.load(urllib.request.urlopen(req, timeout=60))

def t(r, k): return str(r.get(k) or '').strip()
def nome_l(r): return t(r, 'nome').lower()
def attrezzi(r): return [a.strip() for a in t(r, 'attrezzo').lower().split(';') if a.strip()]
def ha(r, *parole): return any(p in nome_l(r) for p in parole)

# ── unilaterale ──────────────────────────────────────────────────────────────
SI = ['un braccio', 'una gamba', 'un solo braccio', 'una sola gamba', 'single-leg', 'single leg', 'monopodal',
      'pistol', 'bulgaro', 'cosacco', 'hawaiano', 'shrimp', 'archer', 'suitcase', 'calcio laterale',
      'step-up', 'step up', 'clamshell', 'decubito laterale', 'plank laterale', 'side bend', 'flessione laterale busto',
      'wood chop', 'pallof', 'thread the needle', 'slanci gamba', 'kickback', 'donkey kick',
      'affondo', 'affondi', 'skater', 'calcio circolare', 'stretch flessori anca', 'stretch ischiocrurali seduto',
      'abduzione anca', 'adduzione anca', 'estensione anca', 'leg curl macchina in piedi', 'rotazione diagonale busto',
      'curl concentrato', 'piegamenti gamba sollevata', 'turkish', 'get-up',
      'world s greatest', 'foam roll']
ALTERNATO = ['alternat', 'camminat', 'mountain climber', 'renegade', 'bear crawl', 'bicicletta', 'forbice',
             'knee drive', 'skip', 'corsa', 'battle rope', 'boxe', 'dead bug', 'bird dog', 'sforbiciata',
             'windshield', 'russian twist', 'tocco caviglie', 'spostamento laterale', 'skater laterale']
# bilaterali che le parole sopra prenderebbero per sbaglio (un manubrio a due mani, landmine a due mani, camminate col carico)
NO_SEMPRE = ['macchina seduto', 'macchina spinta posteriore', 'alzate laterali manubri', 'alzate laterali macchina',
             'alzate laterali cavi', 'croci', 'frog pump', 'ponte glutei piedi', 'camminata laterale elastico',
             'mani unite', 'camminata manubri', 'camminata verticale', 'camminata kettlebell']

def classifica_unilaterale(r):
    n = nome_l(r)
    if any(p in n for p in NO_SEMPRE) and not any(p in n for p in ['un braccio', 'una gamba']): return 'no'
    if ha(r, *ALTERNATO) and not ha(r, 'un braccio', 'una gamba'): return 'alternato'
    if ha(r, *SI): return 'si'
    # bilaterale che si fa su un lato solo per via dell'attrezzo (un manubrio solo in mano): no, salvo nome esplicito
    return 'no'

# ── progressione ────────────────────────────────────────────────────────────
CON_CARICO = {'manubri','manubrio','bilanciere','kettlebell','palla medica','cavo','cavi','cavo basso','cavo alto',
              'macchina','multipower','zavorra','disco','landmine'}   # barra/maniglie/trx/sacco non sono un carico che cresce
TENUTE = ['plank', 'hold', 'tenuta', 'isometric', 'wall sit', 'hollow', 'dead bug', 'bird dog', 'l-sit', 'carry',
          'camminata', 'stretch', 'foam roll', 'pallof', 'superman', 'sospensione', 'ponte glutei isometrico']
def classifica_progressione(r, scelta_corpo_libero):
    n, att, pat = nome_l(r), set(attrezzi(r)), t(r, 'pattern').lower()
    if 'trazion' in n and ('assistit' in n or 'gravitron' in n): return 'meno assistenza'
    if 'trazion' in n and pat == 'tirata verticale': return 'carico in mano'          # trazioni libere: zavorra
    if pat in ('mobilita',) or 'stretch' in n or 'foam roll' in n: return 'tenuta più lunga'
    if any(p in n for p in TENUTE) and pat in ('core', 'isolamento', 'loaded carry'): return 'tenuta più lunga'
    if pat == 'cardio_metabolico': return 'più ripetizioni'
    # l'attrezzo nominato dopo «appoggio» regge, non carica (EX660 Estensione anca in piedi appoggio bilanciere)
    carico = att & CON_CARICO
    if carico and 'appoggio' in n and not any(a in n.split('appoggio')[0] for a in carico): carico = set()
    if carico: return 'carico'
    if 'elastico' in att or 'banda' in att or 'elastico' in n or 'elastico' in t(r, 'surrogato_attrezzo').lower(): return 'elastico più duro'
    # corpo libero
    if pat in ('core', 'isolamento'): return 'più ripetizioni'
    if classifica_unilaterale(r) in ('si', 'alternato'): return scelta_corpo_libero
    return 'variante più difficile'

# ── EX647 (Catalogo 080: la GIF è giusta, il testo no) ───────────────────────
def ex647_corretto(r):
    r = dict(r)
    passi = [p.strip() for p in t(r, 'esecuzione').split(';')]
    passi[1] = "Nel punto basso porta la mano verso il piede della gamba d'appoggio, busto fermo (non ruota)"
    r['esecuzione'] = ';'.join(passi)
    errori = [e.strip() for e in t(r, 'errori').split(';')]
    errori = [("Schiena arrotondata per arrivare con la mano al piede d'appoggio: si scende meno e si tocca più in alto"
               if e.startswith('Schiena arrotondata') else e) for e in errori]
    if not any('ruota' in e for e in errori): errori.append('Busto che ruota verso la gamba tesa invece di restare fermo')
    r['errori'] = ';'.join(errori)
    r['nota_sicurezza'] = ("Il tocco del piede d'appoggio e la conseguenza della discesa, non il suo obiettivo: "
                           "se per arrivarci la schiena si arrotonda, si scende meno e si tocca piu in alto")
    return r

def scrivi_tsv(nome, intestazione, righe):
    os.makedirs(USCITA, exist_ok=True)
    p = os.path.join(USCITA, nome)
    with open(p, 'w', encoding='utf-8-sig', newline='') as f:
        f.write('\t'.join(intestazione) + '\r\n')
        for r in righe: f.write('\t'.join(str(c) for c in r) + '\r\n')
    return p

def main():
    da_file = sys.argv[sys.argv.index('--da-file') + 1] if '--da-file' in sys.argv else None
    scelta = sys.argv[sys.argv.index('--corpo-libero') + 1] if '--corpo-libero' in sys.argv else 'ritmo più lento'
    cat = sorted(leggi_catalogo(da_file), key=lambda r: r['codice'])
    righe, rivedere = [], []
    for r in cat:
        u = classifica_unilaterale(r); p = classifica_progressione(r, scelta)
        righe.append([r['codice'], t(r, 'nome'), u, p])
        if u != 'no': rivedere.append([r['codice'], t(r, 'nome'), t(r, 'pattern'), u, p])
    p1 = scrivi_tsv('unilaterale_progressione.tsv', ['codice', 'nome', 'unilaterale', 'progressione'], righe)
    p2 = scrivi_tsv('da_rivedere.tsv', ['codice', 'nome', 'pattern', 'unilaterale', 'progressione'], rivedere)
    e = next(r for r in cat if r['codice'] == 'EX647')
    e2 = ex647_corretto(e)
    p3 = scrivi_tsv('ex647.tsv', COLONNE_FOGLIO, [[t(e2, c) for c in COLONNE_FOGLIO]])
    with open(os.path.join(USCITA, 'ex647_verticale.txt'), 'w', encoding='utf-8') as f:
        for c in COLONNE_FOGLIO:
            segno = ' ← cambia' if t(e2, c) != t(e, c) else ''
            f.write(f"{c} → {t(e2, c)}{segno}\n")
    da = {}
    for r in righe: da[(r[2], r[3])] = da.get((r[2], r[3]), 0) + 1
    print(f"righe catalogo: {len(cat)} · unilaterale si: {sum(1 for r in righe if r[2]=='si')} · alternato: {sum(1 for r in righe if r[2]=='alternato')} · no: {sum(1 for r in righe if r[2]=='no')}")
    from collections import Counter
    print('progressione:', dict(Counter(r[3] for r in righe)))
    print('scritti:', p1, p2, p3)

if __name__ == '__main__':
    main()
