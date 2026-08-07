#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Server locale per la vista di conferma dei nomi dell'intera biblioteca.

Pagina locale sul Mac. Non fa parte dell'app, non entra nel repo come pagina
pubblicata, non parla con Supabase, con Storage o con il Google Sheet.

L'unica scrittura che fa e' sul disco del Mac, e solo su cio' che Ignazio ha
confermato:
  - rinomina il file .gif nella sua cartella
  - appende su registro/log/lista slug

Endpoint:
  GET  /                       la pagina
  GET  /api/stato?zona=slug    righe + avanzamento gia' registrato
  GET  /gif/<path>             le GIF, in sola lettura
  POST /api/prova              prova a vuoto di un blocco: non scrive niente
  POST /api/applica            backup, rinomina, registra

Avvio:  python3 server.py   ->  http://localhost:8767
"""
import csv
import datetime
import hashlib
import http.server
import json
import os
import posixpath
import sys
import unicodedata
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from nomenclatura import nfc, slug  # noqa: E402

PORT = 8767
BASE = Path(__file__).parent
GIF_ROOT = Path(os.environ.get('BIBLIOTECA_ROOT',
                              '/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi'))
LAVORO = BASE / 'lavoro'
ESITI = BASE / 'esiti'
BACKUP = BASE / 'backup'

REGISTRO = ESITI / 'registro_decisioni.tsv'
MIGRARE = ESITI / 'slug_da_migrare.tsv'
LOG = ESITI / 'log_rinomine.tsv'

COL_REGISTRO = ['quando', 'zona', 'sha256', 'nome_vecchio', 'nome_nuovo',
                'slug', 'stato_binario', 'azione', 'slug_applicato', 'nota']
COL_MIGRARE = ['quando', 'zona', 'codice', 'nome_catalogo', 'slug_vecchio',
               'slug_nuovo', 'nome_file_nuovo', 'sha256']
COL_LOG = ['quando', 'zona', 'da', 'a', 'sha256', 'esito', 'dettaglio']

MIME = {'.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg'}
# lo slug non si applica mai da solo su queste: finiscono nella lista a parte
SOLO_REGISTRATO = ('collegato', 'pendente')


def ora():
    return datetime.datetime.now().isoformat(timespec='seconds')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for blk in iter(lambda: fh.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


def appendi(path, colonne, righe):
    """Append TSV, UTF-8 con BOM e CRLF, intestazione solo alla creazione."""
    nuovo = not path.exists()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'a', encoding='utf-8-sig' if nuovo else 'utf-8',
              newline='') as fh:
        w = csv.writer(fh, delimiter='\t', lineterminator='\r\n',
                       quoting=csv.QUOTE_NONE, escapechar=None)
        if nuovo:
            w.writerow(colonne)
        for r in righe:
            w.writerow([str(r.get(c, '')).replace('\t', ' ').replace('\n', ' ')
                        for c in colonne])


def leggi_registro():
    """Avanzamento gia' salvato. Chiave = SHA-256: sopravvive alla rinomina."""
    if not REGISTRO.exists():
        return {}
    out = {}
    with open(REGISTRO, encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh, delimiter='\t'):
            out[r['sha256']] = r
    return out


def valuta(riga, nome_nuovo):
    """Cosa succederebbe a questa riga. Nessuna scrittura: serve alla prova a vuoto."""
    zona = riga['cartella']
    cartella = GIF_ROOT / zona
    src = cartella / riga['file']
    nome_nuovo = nfc(nome_nuovo).strip()
    esito = {'i': riga['i'], 'file': riga['file'], 'nome_nuovo': nome_nuovo,
             'slug': slug(nome_nuovo), 'stato_binario': riga['stato_binario']}

    if not nome_nuovo:
        return dict(esito, azione='salta', nota='nome vuoto')
    if not src.is_file():
        return dict(esito, azione='salta', nota='file non trovato sul disco')
    if sha256(src) != riga['sha256']:
        return dict(esito, azione='salta',
                    nota='contenuto cambiato dalla preparazione: rigenera il file di lavoro')

    dest_nome = nome_nuovo + '.gif'
    dest = cartella / dest_nome
    if nfc(dest_nome) == nfc(riga['file']):
        return dict(esito, azione='nessuna rinomina', dest=dest_nome,
                    nota='il file si chiama gia' + "'" + ' cosi')
    if dest.exists():
        return dict(esito, azione='salta', dest=dest_nome,
                    nota='esiste gia un file con quel nome nella cartella')
    if any(ord(c) > 127 for c in unicodedata.normalize('NFC', dest_nome)):
        # accenti ammessi nel nome file sul Mac, ma lo segnalo: Storage li rifiuta
        return dict(esito, azione='rinomina', dest=dest_nome,
                    nota='nome con caratteri non ASCII: sul Mac va, in Storage no')
    return dict(esito, azione='rinomina', dest=dest_nome, nota='')


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if '/gif/' not in (args[0] if args else ''):
            print('  ' + fmt % args)

    def _send(self, body, ctype=None, status=200):
        if isinstance(body, (dict, list)):
            body, ctype = json.dumps(body, ensure_ascii=False), 'application/json; charset=utf-8'
        ctype = ctype or 'text/plain; charset=utf-8'
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(n).decode('utf-8'))

    # ---------------------------------------------------------------- GET
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)
        q = urllib.parse.parse_qs(parsed.query)

        if path in ('/', '/index.html'):
            return self._send((BASE / 'index.html').read_bytes(), 'text/html; charset=utf-8')

        if path == '/api/zone':
            return self._send(sorted(p.stem for p in LAVORO.glob('*.json')
                                     if not p.stem.startswith('_')))

        if path == '/api/stato':
            z = (q.get('zona') or [''])[0]
            f = LAVORO / (z + '.json')
            if not f.exists():
                return self._send({'error': 'zona non preparata: %s' % z}, '', 404)
            dati = json.loads(f.read_text(encoding='utf-8'))
            fatti = leggi_registro()
            for r in dati['righe']:
                d = fatti.get(r['sha256'])
                r['gia_deciso'] = d if d else None
            dati['decise'] = sum(1 for r in dati['righe'] if r['gia_deciso'])
            return self._send(dati)

        if path.startswith('/gif/'):
            target = (GIF_ROOT / path[len('/gif/'):]).resolve()
            try:
                target.relative_to(GIF_ROOT.resolve())
            except ValueError:
                return self._send('forbidden', 'text/plain', 403)
            if not target.is_file():
                return self._send('not found', 'text/plain', 404)
            ext = posixpath.splitext(target.name)[1].lower()
            return self._send(target.read_bytes(), MIME.get(ext, 'application/octet-stream'))

        return self._send('not found', 'text/plain', 404)

    # --------------------------------------------------------------- POST
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        try:
            body = self._body()
        except Exception as e:
            return self._send({'error': 'json non valido: %s' % e}, '', 400)

        zona_slug = body.get('zona', '')
        f = LAVORO / (zona_slug + '.json')
        if not f.exists():
            return self._send({'error': 'zona non preparata'}, '', 404)
        dati = json.loads(f.read_text(encoding='utf-8'))
        per_i = {r['i']: r for r in dati['righe']}
        scelte = body.get('scelte', [])

        # ------------------------------------------------------ prova a vuoto
        if path == '/api/prova':
            esiti = [valuta(per_i[s['i']], s['nome']) for s in scelte if s['i'] in per_i]
            return self._send({'prova': True, 'esiti': esiti})

        if path != '/api/applica':
            return self._send('not found', 'text/plain', 404)

        # ------------------------------------------------------------ applica
        esiti = [valuta(per_i[s['i']], s['nome']) for s in scelte if s['i'] in per_i]
        if not esiti:
            return self._send({'error': 'niente da applicare'}, '', 400)

        # backup della mappa completa PRIMA di toccare qualunque file
        BACKUP.mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S')
        mappa = {
            'quando': ora(), 'zona': dati['zona'],
            'mappa': [{'nome_vecchio': e['file'], 'nome_nuovo': e.get('dest', ''),
                       'slug': e['slug'], 'sha256': per_i[e['i']]['sha256'],
                       'azione_prevista': e['azione']} for e in esiti],
            'tutta_la_cartella': [{'file': r['file'], 'sha256': r['sha256']}
                                  for r in dati['righe']],
        }
        bpath = BACKUP / ('mappa_%s_%s.json' % (zona_slug, stamp))
        bpath.write_text(json.dumps(mappa, ensure_ascii=False, indent=1), encoding='utf-8')

        cartella = GIF_ROOT / dati['zona']
        reg, mig, log = [], [], []
        for e in esiti:
            r = per_i[e['i']]
            if e['azione'] == 'salta':
                log.append({'quando': ora(), 'zona': dati['zona'], 'da': e['file'],
                            'a': e.get('dest', ''), 'sha256': r['sha256'],
                            'esito': 'saltato', 'dettaglio': e['nota']})
                reg.append({'quando': ora(), 'zona': dati['zona'], 'sha256': r['sha256'],
                            'nome_vecchio': e['file'], 'nome_nuovo': '', 'slug': '',
                            'stato_binario': r['stato_binario'], 'azione': 'saltato',
                            'slug_applicato': 'no', 'nota': e['nota']})
                continue

            if e['azione'] == 'rinomina':
                src, dest = cartella / e['file'], cartella / e['dest']
                try:
                    if dest.exists():
                        raise FileExistsError('destinazione comparsa nel frattempo')
                    os.rename(src, dest)
                    esito_log = 'rinominato'
                except Exception as ex:
                    log.append({'quando': ora(), 'zona': dati['zona'], 'da': e['file'],
                                'a': e['dest'], 'sha256': r['sha256'],
                                'esito': 'errore', 'dettaglio': str(ex)})
                    reg.append({'quando': ora(), 'zona': dati['zona'], 'sha256': r['sha256'],
                                'nome_vecchio': e['file'], 'nome_nuovo': '', 'slug': '',
                                'stato_binario': r['stato_binario'], 'azione': 'errore',
                                'slug_applicato': 'no', 'nota': str(ex)})
                    continue
            else:
                esito_log = 'gia con quel nome'

            solo_reg = r['stato_binario'] in SOLO_REGISTRATO
            log.append({'quando': ora(), 'zona': dati['zona'], 'da': e['file'],
                        'a': e.get('dest', e['file']), 'sha256': r['sha256'],
                        'esito': esito_log, 'dettaglio': e['nota']})
            reg.append({'quando': ora(), 'zona': dati['zona'], 'sha256': r['sha256'],
                        'nome_vecchio': e['file'], 'nome_nuovo': e.get('dest', e['file']),
                        'slug': e['slug'], 'stato_binario': r['stato_binario'],
                        'azione': 'confermato',
                        'slug_applicato': 'no' if solo_reg else 'libero',
                        'nota': e['nota']})

            # doppio binario: GIF viva -> lo slug nuovo si registra e basta.
            # In lista finisce solo cio' che cambia davvero: se lo slug resta
            # identico non c'e' niente da migrare nel bucket e nel database.
            if solo_reg:
                cod = r['codici'][0] if r['codici'] else {}
                vecchio = cod.get('gif_slug') or ';'.join(r['slug_indice'])
                if e['slug'] != vecchio:
                    mig.append({'quando': ora(), 'zona': dati['zona'],
                                'codice': cod.get('codice') or (r['cantiere'] or ['', ''])[0],
                                'nome_catalogo': cod.get('nome') or (r['cantiere'] or ['', ''])[1],
                                'slug_vecchio': vecchio,
                                'slug_nuovo': e['slug'],
                                'nome_file_nuovo': e.get('dest', e['file']),
                                'sha256': r['sha256']})

        appendi(REGISTRO, COL_REGISTRO, reg)
        appendi(LOG, COL_LOG, log)
        if mig:
            appendi(MIGRARE, COL_MIGRARE, mig)

        fatte = sum(1 for e in esiti if e['azione'] == 'rinomina')
        print('  blocco applicato: %d rinominate, %d saltate, %d slug in lista'
              % (fatte, sum(1 for e in esiti if e['azione'] == 'salta'), len(mig)))
        return self._send({'ok': True, 'esiti': esiti, 'backup': bpath.name,
                           'rinominate': fatte, 'in_lista_slug': len(mig)})


if __name__ == '__main__':
    if not (BASE / 'index.html').exists():
        sys.exit('manca index.html in %s' % BASE)
    if not LAVORO.exists() or not any(LAVORO.glob('*.json')):
        sys.exit('nessuna zona preparata: lancia prima  python3 prepara.py "<cartella>"')
    ESITI.mkdir(exist_ok=True)
    print('Conferma nomi biblioteca  ->  http://localhost:%d' % PORT)
    print('  GIF da   : %s' % GIF_ROOT)
    print('  esiti in : %s' % ESITI)
    print('  backup in: %s' % BACKUP)
    print('  Ctrl+C per chiudere.\n')
    try:
        http.server.HTTPServer(('localhost', PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print('\nchiuso.')
