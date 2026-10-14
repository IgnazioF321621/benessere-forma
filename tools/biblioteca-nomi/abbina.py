#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Abbina — pagina locale per decidere quale GIF va a un codice di catalogo.

Terzo lavoro di una zona (catalogo), primo mucchio: i codici che esistono gia'
a catalogo senza gif_slug e che potrebbero avere una GIF della zona.
La proposta sta in mobilita_abbinamenti_proposta.json; la decide Ignazio
guardando la GIF. Ogni scelta si salva nell'istante in cui si fa (L21) in
esiti/mobilita_abbinamenti.tsv, per impronta (L9), una riga in coda: l'ultima
riga di un codice e' quella che vale.

NON scrive su Supabase, Storage o foglio. Lancio:  python3 abbina.py  (porta 8769)
"""
import csv
import datetime
import hashlib
import html
import http.server
import json
import os
import socketserver
import urllib.parse
from pathlib import Path

PORT = 8769
BASE = Path(__file__).parent
ZONA = 'Mobilita e Stretching'
GIF_DIR = Path(os.environ.get('BIBLIOTECA_ROOT',
                              '/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi')) / ZONA
PROPOSTA = BASE / 'mobilita_abbinamenti_proposta.json'
ESITO = BASE / 'esiti' / 'mobilita_abbinamenti.tsv'
COL = ['quando', 'codice', 'scelta', 'file', 'sha256']
# Secondo mucchio (/catalogo): le righe di catalogo da rivedere guardando la GIF.
BOZZE = BASE / 'mobilita_catalogo_bozze.json'
ESITO_RIGHE = BASE / 'esiti' / 'mobilita_catalogo_righe.tsv'
COL_RIGHE = ['quando', 'sha256', 'codice', 'decisione', 'nota', 'riga']
DECISIONI = ('va_bene', 'non_entra', 'da_rivedere')
MODIFICABILI = ['attrezzo', 'luogo', 'muscoli', 'livello', 'uso', 'zone_rischio', 'adattamento',
                'alternativa', 'setup', 'esecuzione', 'errori', 'nota_sicurezza',
                'unilaterale', 'progressione']


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def scelte():
    if not ESITO.exists():
        return {}
    with open(ESITO, encoding='utf-8-sig', newline='') as f:
        return {r['codice']: r for r in csv.DictReader(f, delimiter='\t')}


def esiti_righe():
    if not ESITO_RIGHE.exists():
        return {}
    with open(ESITO_RIGHE, encoding='utf-8-sig', newline='') as f:
        return {r['sha256']: r for r in csv.DictReader(f, delimiter='\t')}


def salva(riga, dove=None, col=None):
    dove, col = dove or ESITO, col or COL
    nuovo = not dove.exists()
    with open(dove, 'a', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, col, delimiter='\t')
        if nuovo:
            w.writeheader()
        w.writerow(riga)
        f.flush()
        os.fsync(f.fileno())


def pagina():
    voci = json.loads(PROPOSTA.read_text(encoding='utf-8'))['voci']
    fatte = scelte()
    e = html.escape
    out = ['<!doctype html><meta charset=utf-8><title>Abbina GIF e codici</title>',
           '<style>body{font:15px -apple-system,sans-serif;background:#F5F3EE;margin:16px}'
           '.v{background:#fff;border-radius:10px;padding:14px;margin:0 0 18px}'
           '.c{display:inline-block;vertical-align:top;margin:8px 12px 0 0;text-align:center}'
           '.c img{width:260px;height:260px;object-fit:contain;border:1px solid #ddd;background:#fff}'
           'button{font-size:15px;padding:6px 12px;margin-top:6px;border-radius:6px;border:1px solid #2A7A6F;background:#fff;cursor:pointer}'
           '.si{background:#2A7A6F;color:#fff}.no{border-color:#999}.ok{color:#2A7A6F;font-weight:600}'
           'small{color:#555}</style>',
           '<h2>Esercizi a catalogo senza GIF</h2><p>Per ogni esercizio: è una di queste GIF? '
           'Se nessuna va bene, «Nessuna». La scelta si salva subito.</p>']
    for v in voci:
        k = v['codice']
        f = fatte.get(k)
        stato = ('<span class=ok>Scelto: %s</span>' % e(f['scelta'])) if f else ''
        out.append('<div class=v id=%s><b>%s · %s</b> %s<br><small>Attrezzo: %s · Uso: %s<br>'
                   'Posizione: %s<br>Esecuzione: %s</small><br>'
                   % (k, k, e(v['nome']), stato, e(v['attrezzo'] or ''), e(v['uso'] or ''),
                      e(v['setup'] or ''), e((v['esecuzione'] or '').replace(';', ' · '))))
        for n in v['candidati']:
            cls = 'si' if f and f['scelta'] == n else ''
            out.append('<div class=c><img src="/gif/%s"><br>%s<br>'
                       '<button class="%s" onclick="sc(\'%s\',this.dataset.n)" data-n="%s">È questa</button></div>'
                       % (urllib.parse.quote(n + '.gif'), e(n), cls, k, e(n)))
        cls = 'si' if f and f['scelta'] == 'nessuna' else ''
        out.append('<div><button class="no %s" onclick="sc(\'%s\',\'nessuna\')">Nessuna di queste</button></div></div>'
                   % (cls, k))
    out.append('<script>async function sc(k,n){const r=await fetch("/api/scelta",{method:"POST",'
               'body:JSON.stringify({codice:k,scelta:n})});if(r.ok){location.hash=k;location.reload()}'
               'else alert(await r.text())}</script>')
    return '\n'.join(out)


class H(http.server.BaseHTTPRequestHandler):
    def _manda(self, code, corpo, tipo='text/html; charset=utf-8'):
        b = corpo if isinstance(corpo, bytes) else corpo.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        p = urllib.parse.unquote(self.path.split('?')[0])
        if p == '/':
            return self._manda(200, pagina())
        if p == '/catalogo':
            return self._manda(200, (BASE / 'abbina_catalogo.html').read_bytes())
        if p == '/api/bozze':
            d = json.loads(BOZZE.read_text(encoding='utf-8'))
            fatti = esiti_righe()
            for v in d['voci']:
                e = fatti.get(v['sha256'])
                if e:
                    v['esito'] = {'decisione': e['decisione'], 'nota': e['nota'], 'quando': e['quando']}
                    v['riga'] = json.loads(e['riga'])
            return self._manda(200, json.dumps(d, ensure_ascii=False), 'application/json')
        if p.startswith('/gif/'):
            f = GIF_DIR / Path(p[5:]).name
            if f.exists():
                return self._manda(200, f.read_bytes(), 'image/gif')
        self._manda(404, 'non trovato')

    def do_POST(self):
        if self.path == '/api/riga':
            return self._riga()
        if self.path != '/api/scelta':
            return self._manda(404, 'non trovato')
        d = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        voci = {v['codice']: v for v in json.loads(PROPOSTA.read_text(encoding='utf-8'))['voci']}
        k, s = d.get('codice'), d.get('scelta')
        if k not in voci or (s != 'nessuna' and s not in voci[k]['candidati']):
            return self._manda(400, 'scelta non prevista')
        riga = {'quando': datetime.datetime.now().isoformat(timespec='seconds'),
                'codice': k, 'scelta': s, 'file': '', 'sha256': ''}
        if s != 'nessuna':
            f = GIF_DIR / (s + '.gif')
            riga['file'], riga['sha256'] = f.name, sha(f)
        salva(riga)
        self._manda(200, 'ok', 'text/plain')

    def _riga(self):
        d = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        voci = {v['sha256']: v for v in json.loads(BOZZE.read_text(encoding='utf-8'))['voci']}
        v = voci.get(d.get('sha256'))
        if not v or d.get('decisione') not in DECISIONI:
            return self._manda(400, 'scelta non prevista')
        riga = dict(v['riga'])
        for k in MODIFICABILI:   # nome, spiegazione e gif_slug vengono dal pannello: qui non si toccano
            if k in d.get('riga', {}):
                riga[k] = ' '.join(str(d['riga'][k]).replace('\t', ' ').split()) if k not in (
                    'esecuzione', 'errori') else ';'.join(
                    x.strip() for x in str(d['riga'][k]).replace('\t', ' ').split('\n') if x.strip())
        salva({'quando': datetime.datetime.now().isoformat(timespec='seconds'),
               'sha256': v['sha256'], 'codice': v.get('codice') or '',
               'decisione': d['decisione'], 'nota': ' '.join(str(d.get('nota', '')).split()),
               'riga': json.dumps(riga, ensure_ascii=False)}, ESITO_RIGHE, COL_RIGHE)
        self._manda(200, 'ok', 'text/plain')

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), H) as s:
        print('Abbina: http://localhost:%d' % PORT)
        s.serve_forever()
