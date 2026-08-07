#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Server locale per la vista di conferma visiva del cantiere Cardio e Conditioning.

Serve tre cose e basta:
  GET  /                  la pagina
  GET  /proposte.json     il file di lavoro con le proposte
  GET  /decisioni.json    le decisioni gia' prese (404 alla prima apertura)
  GET  /gif/<path>        le GIF lette dal Mac, in sola lettura
  POST /decisioni.json    salva le decisioni su file

Non parla con Supabase, non tocca Storage, non rinomina e non sposta nulla sul Mac.
Le GIF sono aperte in sola lettura.

Avvio:  python3 server.py     ->  http://localhost:8766
"""
import http.server, json, os, posixpath, sys, urllib.parse
from pathlib import Path

PORT = 8766
BASE = Path(__file__).parent
GIF_ROOT = Path('/Users/ignaziofiorito/benessere-forma/Biblioteca di esercizi')
DECISIONI = BASE / 'decisioni.json'

MIME = {'.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json'}


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if '/gif/' not in (args[0] if args else ''):
            print(f'  {fmt % args}')

    def _send(self, body, ctype, status=200):
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urllib.parse.unquote(self.path.split('?')[0])

        if path in ('/', '/index.html'):
            return self._send((BASE / 'index.html').read_bytes(), 'text/html; charset=utf-8')

        if path == '/proposte.json':
            return self._send((BASE / 'proposte.json').read_bytes(), 'application/json; charset=utf-8')

        if path == '/decisioni.json':
            if not DECISIONI.exists():
                return self._send('{}', 'application/json; charset=utf-8', 404)
            return self._send(DECISIONI.read_bytes(), 'application/json; charset=utf-8')

        if path.startswith('/gif/'):
            rel = path[len('/gif/'):]
            # niente traversal: il file deve stare dentro GIF_ROOT
            target = (GIF_ROOT / rel).resolve()
            try:
                target.relative_to(GIF_ROOT.resolve())
            except ValueError:
                return self._send('forbidden', 'text/plain', 403)
            if not target.is_file():
                return self._send('not found', 'text/plain', 404)
            ext = posixpath.splitext(target.name)[1].lower()
            return self._send(target.read_bytes(), MIME.get(ext, 'application/octet-stream'))

        return self._send('not found', 'text/plain', 404)

    def do_POST(self):
        if self.path.split('?')[0] != '/decisioni.json':
            return self._send('not found', 'text/plain', 404)
        n = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(n)
        try:
            data = json.loads(raw.decode('utf-8'))
        except Exception as e:
            return self._send(json.dumps({'error': f'json non valido: {e}'}), 'application/json', 400)

        # scrittura atomica: prima il file temporaneo, poi il rename
        tmp = DECISIONI.with_suffix('.json.tmp')
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
        os.replace(tmp, DECISIONI)
        conf = sum(1 for v in data.values() if v.get('stato') == 'confermato')
        print(f'  salvate {len(data)} decisioni ({conf} confermate) -> {DECISIONI.name}')
        return self._send(json.dumps({'ok': True, 'salvate': len(data), 'confermate': conf}),
                          'application/json')


if __name__ == '__main__':
    for f in ('index.html', 'proposte.json'):
        if not (BASE / f).exists():
            sys.exit(f'manca {f} in {BASE}')
    print(f'Conferma visiva cardio  ->  http://localhost:{PORT}')
    print(f'  GIF da      : {GIF_ROOT}')
    print(f'  decisioni in: {DECISIONI}')
    print('  Ctrl+C per chiudere.\n')
    try:
        http.server.HTTPServer(('localhost', PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print('\nchiuso.')
