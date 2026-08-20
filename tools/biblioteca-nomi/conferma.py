#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Conferma nomi biblioteca — seconda versione.

Il principio, da cui discende tutto il resto:
una conferma data e' una conferma salvata. Nell'istante in cui arriva, la
decisione e' scritta su disco e sincronizzata (fsync). Non a fine blocco, non
premendo un bottone, non quando il server e' contento.

Conseguenze di progetto:
  - /api/decidi appende UNA riga e fa fsync prima di rispondere. Nessuna
    precondizione: la registrazione non dipende da prova a vuoto, da backup
    o da qualunque altra cosa.
  - anche le BOZZE (testo digitato e non ancora confermato) vanno su disco,
    cosi' nessuno stato vive solo nella memoria della pagina.
  - registrare e rinominare sono endpoint diversi. Se una rinomina fallisce,
    la decisione registrata resta valida.
  - il contatore mostrato a schermo viene sempre riletto dal disco.

Server a thread: una GIF da 5 MB in corso di caricamento non deve mai
ritardare il salvataggio di una decisione.

Avvio:  python3 conferma.py   ->  http://localhost:8768
"""
import csv
import datetime
import hashlib
import http.server
import json
import os
import posixpath
import re
import socketserver
import sys
import threading
import traceback
import unicodedata
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from nomenclatura import DEFAULT_OMESSI, nfc, slug  # noqa: E402

PORT = 8768
BASE = Path(__file__).parent
GIF_ROOT = Path(os.environ.get('BIBLIOTECA_ROOT',
                               '/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi'))
LAVORO = BASE / 'lavoro'
ESITI = BASE / 'esiti'
BACKUP = BASE / 'backup'

REGISTRO = ESITI / 'registro_decisioni.tsv'
BOZZE = ESITI / 'bozze.tsv'
MIGRARE = ESITI / 'slug_da_migrare.tsv'
LOG = ESITI / 'log_rinomine.tsv'

COL_REGISTRO = ['quando', 'zona', 'sha256', 'nome_vecchio', 'nome_confermato', 'slug',
                'stato_binario', 'origine', 'slug_applicabile', 'codice', 'nome_catalogo']
COL_BOZZE = ['quando', 'zona', 'sha256', 'nome_vecchio', 'testo']
COL_MIGRARE = ['quando', 'zona', 'codice', 'nome_catalogo', 'slug_vecchio', 'slug_nuovo',
               'nome_file_nuovo', 'sha256']
COL_LOG = ['quando', 'zona', 'da', 'a', 'sha256', 'esito', 'dettaglio']

# Lavoro 3: registro append-only delle decisioni "entra a catalogo / resta libera".
# Stesso principio del registro dei nomi: una decisione data e' una decisione
# scritta, con fsync, nell'istante in cui arriva [L21]. `chiave` identifica il
# passo (una GIF, o una coppia GIF+codice), non il file: un confronto puo'
# ripetere la stessa GIF contro codici diversi ed e' una decisione per ciascuno.
L3_REGISTRO = ESITI / 'lavoro3_pettorali.tsv'
COL_L3 = ['quando', 'zona', 'chiave', 'sezione', 'slug', 'file', 'confronto',
          'scelta', 'nota']

# Tre fonti: registro append-only delle scelte sui nomi che divergono fra Mac,
# biblioteca_gif e catalogo. Stesso principio degli altri registri: una scelta
# data e' una scelta scritta, con fsync, nell'istante in cui arriva [L21].
# Registra e basta: non applica niente su Mac, bucket, DB o TSV di sync.
TF_PIANO = LAVORO / '_tre_fonti.json'
TF_REGISTRO = ESITI / 'tre_fonti.tsv'
COL_TF = ['quando', 'codice', 'zona', 'sha256_mac', 'nome_mac', 'nome_supabase',
          'nome_sheet', 'nome_scelto', 'slug_scelto', 'condivide_gif_con']

MIME = {'.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg'}
# GIF viva, o di cui non sappiamo se e' viva: slug mai applicato.
# "indeterminato" arriva da prepara.py quando l'impronta di un oggetto del bucket non
# e' calcolabile: nel dubbio si tratta come viva, mai come libera.
SOLO_REGISTRATO = ('collegato', 'pendente', 'indeterminato')

_scrittura = threading.Lock()


def ora():
    return datetime.datetime.now().isoformat(timespec='seconds')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for blk in iter(lambda: fh.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


def appendi(path, colonne, righe):
    """Append TSV con fsync: quando questa funzione torna, il dato e' sul disco.

    Senza fsync il contenuto resta nella cache del sistema e una chiusura brusca
    puo' perderlo. Qui non e' un'ipotesi teorica: e' il caso che si e' verificato.
    """
    with _scrittura:
        path.parent.mkdir(parents=True, exist_ok=True)
        nuovo = not path.exists()
        buf = []
        if nuovo:
            buf.append('﻿' + '\t'.join(colonne))
        for r in righe:
            buf.append('\t'.join(str(r.get(c, '')).replace('\t', ' ').replace('\n', ' ')
                                 for c in colonne))
        dati = ('\r\n'.join(buf) + '\r\n').encode('utf-8')
        with open(path, 'ab') as fh:
            fh.write(dati)
            fh.flush()
            os.fsync(fh.fileno())


def leggi_tsv(path):
    if not path.exists():
        return []
    with open(path, encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh, delimiter='\t'))


def stato_corrente(nome_file=REGISTRO, chiave='sha256'):
    """Registro append-only: vale l'ultima riga per ogni chiave.

    Tenere lo storico invece di sovrascrivere significa che un ripensamento non
    cancella la traccia di cosa era stato deciso prima.
    """
    out = {}
    for r in leggi_tsv(nome_file):
        if r.get(chiave):
            out[r[chiave]] = r
    return out


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):
        msg = args[0] if args else ''
        if '/gif/' not in msg and '/api/bozza' not in msg:
            sys.stdout.write('  ' + fmt % args + '\n')
            sys.stdout.flush()          # niente buffering: il log deve essere leggibile subito

    def _send(self, body, ctype=None, status=200):
        if isinstance(body, (dict, list)):
            body, ctype = json.dumps(body, ensure_ascii=False), 'application/json; charset=utf-8'
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', ctype or 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    # ---------------------------------------------------------------- GET
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)
        q = urllib.parse.parse_qs(parsed.query)

        if path in ('/', '/index.html', '/conferma.html'):
            return self._send((BASE / 'conferma.html').read_bytes(), 'text/html; charset=utf-8')

        if path == '/api/zone':
            return self._send(sorted(p.stem for p in LAVORO.glob('*.json')
                                     if not p.stem.startswith('_')))

        if path == '/api/stato':
            z = (q.get('zona') or [''])[0]
            f = LAVORO / (z + '.json')
            if not f.exists():
                return self._send({'error': 'zona non preparata: %s' % z}, status=404)
            dati = json.loads(f.read_text(encoding='utf-8'))
            decise = stato_corrente(REGISTRO)
            bozze = stato_corrente(BOZZE)
            rinominati = {r['sha256']: r for r in leggi_tsv(LOG) if r.get('esito') in
                          ('rinominato', 'gia con quel nome')}
            for r in dati['righe']:
                r['decisione'] = decise.get(r['sha256'])
                r['bozza'] = (bozze.get(r['sha256']) or {}).get('testo')
                r['rinominato'] = r['sha256'] in rinominati
            dati['decise'] = sum(1 for r in dati['righe'] if r['decisione'])
            dati['rinominate'] = sum(1 for r in dati['righe'] if r['rinominato'])
            return self._send(dati)

        # Oggetti che stanno SOLO nel bucket: non esiste un file sul Mac da servire.
        # La copia locale vive in lavoro/_bucket/ ed e' stata verificata per impronta
        # al momento del download. Saltarli non e' un'opzione: due dei tre sono
        # puntati da codici vivi e vanno confermati come gli altri.
        if path.startswith('/oggetto/'):
            nome = posixpath.basename(path[len('/oggetto/'):])
            radice = (LAVORO / '_bucket').resolve()
            trovati = [p for p in radice.rglob(nome)] if radice.exists() else []
            if not trovati:
                return self._send('oggetto non in cache: %s' % nome, status=404)
            target = trovati[0].resolve()
            try:
                target.relative_to(radice)
            except ValueError:
                return self._send('forbidden', status=403)
            ext = posixpath.splitext(target.name)[1].lower()
            return self._send(target.read_bytes(), MIME.get(ext, 'application/octet-stream'))

        # ---- Lavoro 3: si guardano le GIF per decidere se entrano a catalogo.
        # Rotte AGGIUNTIVE: il pannello dei nomi qui sopra non e' toccato.
        if path in ('/lavoro3', '/lavoro3.html'):
            return self._send((BASE / 'lavoro3.html').read_bytes(),
                              'text/html; charset=utf-8')

        if path == '/api/lavoro3':
            f = LAVORO / '_lavoro3_pettorali.json'
            if not f.exists():
                return self._send({'error': 'manca %s' % f}, status=404)
            dati = json.loads(f.read_text(encoding='utf-8'))
            # Le decisioni gia' prese si rileggono SEMPRE dal disco, mai da uno
            # stato tenuto in memoria: e' il principio del registro append-only.
            prese = stato_corrente(L3_REGISTRO, chiave='chiave')
            for p in dati['passi']:
                p['decisione'] = prese.get(p['chiave'])
            dati['decise'] = sum(1 for p in dati['passi'] if p['decisione'])
            return self._send(dati)

        # ---- Tre fonti: i casi in cui il nome non e' lo stesso nei tre posti.
        # Rotte AGGIUNTIVE, come quelle del lavoro 3: il pannello dei nomi non e' toccato.
        if path in ('/tre-fonti', '/tre_fonti.html'):
            return self._send((BASE / 'tre_fonti.html').read_bytes(),
                              'text/html; charset=utf-8')

        if path == '/api/tre-fonti':
            if not TF_PIANO.exists():
                return self._send(
                    {'error': 'manca %s — lancia costruisci_tre_fonti.py' % TF_PIANO},
                    status=404)
            dati = json.loads(TF_PIANO.read_text(encoding='utf-8'))
            prese = stato_corrente(TF_REGISTRO, chiave='codice')
            for c in dati['casi']:
                c['decisione'] = prese.get(c['codice'])
            dati['decise'] = sum(1 for c in dati['casi'] if c['decisione'])
            return self._send(dati)

        if path.startswith('/gif/'):
            target = (GIF_ROOT / path[len('/gif/'):]).resolve()
            try:
                target.relative_to(GIF_ROOT.resolve())
            except ValueError:
                return self._send('forbidden', status=403)
            if not target.is_file():
                return self._send('not found', status=404)
            ext = posixpath.splitext(target.name)[1].lower()
            return self._send(target.read_bytes(), MIME.get(ext, 'application/octet-stream'))

        return self._send('not found', status=404)

    # --------------------------------------------------------------- POST
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        try:
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n).decode('utf-8'))
        except Exception as e:
            return self._send({'error': 'json non valido: %s' % e}, status=400)

        # Nessuna eccezione puo' morire qui dentro: se qualcosa esplode, la pagina
        # deve ricevere un messaggio leggibile invece che una risposta mancante.
        try:
            if path == '/api/decidi':
                return self.decidi(body)
            if path == '/api/lavoro3/decidi':
                return self.lavoro3_decidi(body)
            if path == '/api/tre-fonti/decidi':
                return self.tre_fonti_decidi(body)
            if path == '/api/bozza':
                return self.bozza(body)
            if path in ('/api/rinomina/prova', '/api/rinomina/applica'):
                return self.rinomina(body, prova=path.endswith('prova'))
            return self._send({'error': 'endpoint sconosciuto: %s' % path}, status=404)
        except Exception as ex:
            traccia = traceback.format_exc()
            sys.stdout.write(traccia + '\n')
            sys.stdout.flush()
            return self._send({'ok': False,
                               'error': '%s: %s' % (type(ex).__name__, ex),
                               'traccia': traccia.splitlines()[-3:]}, status=500)

    # -- Lavoro 3: una scelta arrivata e' una scelta su disco, subito ------
    def lavoro3_decidi(self, body):
        f = LAVORO / '_lavoro3_pettorali.json'
        if not f.exists():
            return self._send({'error': 'manca il piano del lavoro 3'}, status=404)
        passi = {p['chiave']: p for p in
                 json.loads(f.read_text(encoding='utf-8'))['passi']}
        p = passi.get(body.get('chiave'))
        if not p:
            return self._send({'error': 'passo sconosciuto: %r'
                               % body.get('chiave')}, status=404)
        scelta = (body.get('scelta') or '').strip()
        if scelta not in p['scelte']:
            return self._send({'error': 'scelta non ammessa per questo passo: %r'
                               % scelta}, status=400)
        appendi(L3_REGISTRO, COL_L3, [{
            'quando': ora(), 'zona': 'Pettorali', 'chiave': p['chiave'],
            'sezione': p['sezione'], 'slug': p['sinistra']['slug'],
            'file': p['sinistra']['file'],
            'confronto': (p.get('destra') or {}).get('codice', ''),
            'scelta': scelta, 'nota': (body.get('nota') or '').strip()}])
        prese = stato_corrente(L3_REGISTRO, chiave='chiave')
        return self._send({'ok': True, 'decise': len(prese),
                           'totale': len(passi)})

    # -- Tre fonti: la scelta si registra, non si applica ------------------
    def tre_fonti_decidi(self, body):
        """Registra il nome scelto per un caso. Nessun effetto altrove.

        Le regole che si possono leggere nel testo si controllano qui e non
        solo nella pagina: un controllo che vive solo nel browser non e' una
        regola, e' un promemoria. Ordine dei termini e scelta della lingua non
        si controllano da soli — quelli li decide Ignazio guardando la GIF.
        """
        if not TF_PIANO.exists():
            return self._send({'error': 'manca il piano delle tre fonti'}, status=404)
        casi = {c['codice']: c for c in
                json.loads(TF_PIANO.read_text(encoding='utf-8'))['casi']}
        c = casi.get(body.get('chiave'))
        if not c:
            return self._send({'error': 'caso sconosciuto: %r'
                               % body.get('chiave')}, status=404)

        nome = nfc((body.get('nome') or '').strip())
        problemi = []
        if not nome:
            problemi.append('il nome e vuoto')
        if '(' in nome or ')' in nome:
            problemi.append('un nome solo: niente parentesi con la traduzione')
        if '\u00b0' in nome:
            problemi.append('"gradi" per esteso, mai il simbolo grado')
        for d in DEFAULT_OMESSI:
            if re.search(r'(?i)\b%s\b' % re.escape(d), nome):
                problemi.append('"%s" e un valore di default: non si scrive' % d)
        # Regola 1 — il nome e' unico: non puo' essere gia' di un altro codice.
        for col in c.get('collisioni_nome', []):
            if nfc(col['nome']).lower() == nome.lower():
                problemi.append('"%s" e gia il nome di %s' % (nome, col['codice']))
        if problemi:
            return self._send({'error': ' · '.join(problemi)}, status=400)

        appendi(TF_REGISTRO, COL_TF, [{
            'quando': ora(), 'codice': c['codice'], 'zona': c['zona'],
            'sha256_mac': c['sha256_mac'],
            'nome_mac': c['nomi']['mac'], 'nome_supabase': c['nomi']['supabase'],
            'nome_sheet': c['nomi']['sheet'],
            'nome_scelto': nome, 'slug_scelto': slug(nome),
            'condivide_gif_con': ','.join(
                x['codice'] or x['slug'] for x in c.get('condivide_gif_con', []))}])
        prese = stato_corrente(TF_REGISTRO, chiave='codice')
        return self._send({'ok': True, 'decise': len(prese), 'totale': len(casi)})

    # -- registrazione: nessuna precondizione, scrittura immediata ---------
    def decidi(self, body):
        zona_slug = body.get('zona', '')
        f = LAVORO / (zona_slug + '.json')
        if not f.exists():
            return self._send({'error': 'zona non preparata'}, status=404)
        dati = json.loads(f.read_text(encoding='utf-8'))
        per_sha = {r['sha256']: r for r in dati['righe']}
        r = per_sha.get(body.get('sha256'))
        if not r:
            return self._send({'error': 'riga sconosciuta'}, status=404)

        nome = nfc(body.get('nome', '')).strip()
        if not nome:
            return self._send({'error': 'nome vuoto'}, status=400)

        # La pagina puo' rispedire la stessa conferma (sendBeacon di riserva quando
        # la scheda si chiude prima della risposta). Un doppione identico non
        # aggiunge nulla: lo scarto, ma rispondo ok, perche' il dato E' su disco.
        ultima = stato_corrente(REGISTRO).get(r['sha256'])
        if ultima and ultima.get('nome_confermato') == nome:
            decise = len([1 for x in dati['righe'] if x['sha256'] in stato_corrente(REGISTRO)])
            return self._send({'ok': True, 'salvata': True, 'gia_presente': True,
                               'slug': slug(nome), 'decise': decise})

        cod = r['codici'][0] if r['codici'] else {}
        appendi(REGISTRO, COL_REGISTRO, [{
            'quando': ora(), 'zona': dati['zona'], 'sha256': r['sha256'],
            'nome_vecchio': r['file'], 'nome_confermato': nome, 'slug': slug(nome),
            'stato_binario': r['stato_binario'],
            'origine': 'come proposto' if nome == nfc(r['nome_proposto']) else 'corretto a mano',
            'slug_applicabile': 'no' if r['stato_binario'] in SOLO_REGISTRATO else 'si',
            'codice': cod.get('codice') or (r['cantiere'] or ['', ''])[0],
            'nome_catalogo': cod.get('nome') or (r['cantiere'] or ['', ''])[1],
        }])

        # doppio binario: GIF viva -> lo slug nuovo si registra e basta,
        # e solo se cambia davvero rispetto a quello in uso
        if r['stato_binario'] in SOLO_REGISTRATO:
            vecchio = cod.get('gif_slug') or ';'.join(r['slug_indice'])
            if slug(nome) != vecchio:
                appendi(MIGRARE, COL_MIGRARE, [{
                    'quando': ora(), 'zona': dati['zona'],
                    'codice': cod.get('codice') or (r['cantiere'] or ['', ''])[0],
                    'nome_catalogo': cod.get('nome') or (r['cantiere'] or ['', ''])[1],
                    'slug_vecchio': vecchio, 'slug_nuovo': slug(nome),
                    'nome_file_nuovo': nome + '.gif', 'sha256': r['sha256']}])

        # il contatore torna sempre riletto dal disco, mai contato in memoria
        decise = len([1 for x in dati['righe'] if x['sha256'] in stato_corrente(REGISTRO)])
        print('  decisa: %s -> %s  (su disco: %d/%d)'
              % (r['file'][:44], nome[:44], decise, len(dati['righe'])))
        return self._send({'ok': True, 'salvata': True, 'slug': slug(nome), 'decise': decise})

    # -- bozze: anche il testo non confermato non vive solo in memoria -----
    def bozza(self, body):
        zona_slug = body.get('zona', '')
        f = LAVORO / (zona_slug + '.json')
        if not f.exists():
            return self._send({'ok': False}, status=404)
        dati = json.loads(f.read_text(encoding='utf-8'))
        per_sha = {r['sha256']: r for r in dati['righe']}
        r = per_sha.get(body.get('sha256'))
        if not r:
            return self._send({'ok': False}, status=404)
        appendi(BOZZE, COL_BOZZE, [{'quando': ora(), 'zona': dati['zona'],
                                    'sha256': r['sha256'], 'nome_vecchio': r['file'],
                                    'testo': nfc(body.get('testo', ''))}])
        return self._send({'ok': True})

    # -- rinomina: separata, con prova a vuoto e backup --------------------
    def rinomina(self, body, prova):
        zona_slug = body.get('zona', '')
        f = LAVORO / (zona_slug + '.json')
        if not f.exists():
            return self._send({'error': 'zona non preparata'}, status=404)
        dati = json.loads(f.read_text(encoding='utf-8'))
        per_sha = {r['sha256']: r for r in dati['righe']}
        decise = stato_corrente(REGISTRO)
        cartella = GIF_ROOT / dati['zona']

        # Il file va ritrovato per IDENTITA', non per il nome registrato in
        # preparazione. Dopo la prima rinomina quel nome non esiste piu': cercarlo
        # ancora faceva classificare come "file non trovato" righe che erano
        # semplicemente gia' a posto, e rendeva irraggiungibile qualunque
        # ripensamento su una riga gia' rinominata.
        sul_disco = {nfc(f) for f in os.listdir(cartella) if f.lower().endswith('.gif')}
        ultimo_nome = {}                       # sha -> ultimo nome scritto dal log
        for x in leggi_tsv(LOG):
            if x.get('esito') in ('rinominato', 'gia con quel nome') and x.get('sha256'):
                ultimo_nome[x['sha256']] = x['a']

        per_impronta = None                    # calcolata solo se serve davvero

        def trova(sha, r, dest_nome):
            """Nome attuale del file, cercandolo in ordine di costo crescente."""
            nonlocal per_impronta
            for cand in (dest_nome, ultimo_nome.get(sha), r['file']):
                if cand and nfc(cand) in sul_disco:
                    if sha256(cartella / nfc(cand)) == sha:
                        return nfc(cand)
            if per_impronta is None:           # ultima risorsa: impronta di tutti i file
                per_impronta = {}
                for f in sul_disco:
                    per_impronta.setdefault(sha256(cartella / f), f)
            return per_impronta.get(sha)

        # si rinomina SOLO cio' che risulta gia' deciso: nessuna proposta nuova
        lavoro = []
        for sha, d in decise.items():
            r = per_sha.get(sha)
            if not r or d['zona'] != dati['zona']:
                continue
            dest_nome = d['nome_confermato'] + '.gif'
            # riga che esiste solo nel bucket: non c'e' nessun file sul Mac da
            # rinominare, e cercarlo produrrebbe un falso "non trovato".
            if r.get('fonte_immagine') == 'bucket':
                lavoro.append({'sha256': sha, 'da': r['file'], 'a': dest_nome,
                               'cartella': dati['zona'], 'azione': 'solo bucket',
                               'nota': 'nessun file sul Mac: si rinomina in migrazione'})
                continue
            attuale = trova(sha, r, dest_nome)
            e = {'sha256': sha, 'da': attuale or r['file'], 'a': dest_nome,
                 'cartella': dati['zona']}

            if attuale is None:
                e.update(azione='non trovato',
                         nota='non e in questa cartella con nessun nome: forse spostato altrove')
            elif nfc(attuale) == nfc(dest_nome):
                e.update(azione='gia a posto', nota='il file si chiama gia cosi')
            elif nfc(dest_nome) in sul_disco:
                e.update(azione='salta',
                         nota='esiste gia un altro file con quel nome: non sovrascrivo')
            else:
                e.update(azione='rinomina', nota='')
            lavoro.append(e)

        if prova:
            return self._send({'prova': True, 'esiti': lavoro})

        BACKUP.mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S')
        bpath = BACKUP / ('mappa_%s_%s.json' % (zona_slug, stamp))
        bpath.write_text(json.dumps({
            'quando': ora(), 'zona': dati['zona'], 'previsto': lavoro,
            'tutta_la_cartella': [{'file': r['file'], 'sha256': r['sha256']}
                                  for r in dati['righe']]}, ensure_ascii=False, indent=1),
            encoding='utf-8')

        log = []
        for e in lavoro:
            if e['azione'] == 'rinomina':
                try:
                    if (cartella / e['a']).exists():
                        raise FileExistsError('destinazione comparsa nel frattempo')
                    os.rename(cartella / e['da'], cartella / e['a'])
                    e['esito'] = 'rinominato'
                except Exception as ex:
                    e['esito'], e['nota'] = 'errore', str(ex)
            elif e['azione'] == 'gia a posto':
                e['esito'] = 'gia con quel nome'
            elif e['azione'] == 'non trovato':
                e['esito'] = 'non trovato'
            elif e['azione'] == 'solo bucket':
                e['esito'] = 'niente da fare sul Mac'
            else:
                e['esito'] = 'saltato'
            log.append({'quando': ora(), 'zona': dati['zona'], 'da': e['da'], 'a': e['a'],
                        'sha256': e['sha256'], 'esito': e['esito'], 'dettaglio': e['nota']})

        # verifica rileggendo il disco: non ci si fida dell'esito di os.rename
        adesso = {nfc(x) for x in os.listdir(cartella)}
        for e in lavoro:
            if e['esito'] in ('rinominato', 'gia con quel nome'):
                e['verificato'] = nfc(e['a']) in adesso
                if not e['verificato']:
                    e['nota'] = (e['nota'] + ' — ATTENZIONE: dopo l\'operazione il file '
                                             'non risulta sul disco con il nome nuovo').strip()

        if log:
            appendi(LOG, COL_LOG, log)
        fatte = sum(1 for e in lavoro if e['esito'] == 'rinominato')
        conteggi = {k: sum(1 for e in lavoro if e['esito'] == k)
                    for k in ('rinominato', 'gia con quel nome', 'saltato', 'non trovato', 'errore')}
        print('  rinomina: %s, backup %s' % (conteggi, bpath.name))
        return self._send({'ok': True, 'esiti': lavoro, 'backup': bpath.name,
                           'rinominate': fatte, 'conteggi': conteggi})


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    if not (BASE / 'conferma.html').exists():
        sys.exit('manca conferma.html in %s' % BASE)
    if not LAVORO.exists() or not any(p for p in LAVORO.glob('*.json')
                                      if not p.stem.startswith('_')):
        sys.exit('nessuna zona preparata: lancia prima  python3 prepara.py "<cartella>"')
    ESITI.mkdir(exist_ok=True)
    decise = len(stato_corrente(REGISTRO))
    print('Conferma nomi v2  ->  http://localhost:%d' % PORT)
    print('  GIF da       : %s' % GIF_ROOT)
    print('  decisioni in : %s  (%d gia registrate)' % (REGISTRO, decise))
    print('  Ctrl+C per chiudere.\n')
    sys.stdout.flush()
    try:
        Server(('localhost', PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print('\nchiuso.')
