#!/usr/bin/env python3
import http.server
import json
import os
import urllib.request
from pathlib import Path

SUPABASE_URL = "https://qxiyeiahpoiliwpqslpr.supabase.co"
TABLE = "biblioteca_gif"
SELECT = "slug,nome_italiano,categoria,gruppo_muscolare,storage_path"
PORT = 8765
BASE_DIR = Path(__file__).parent

def load_env():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        env_path = Path("/Users/ignaziofiorito/benessere-forma/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()

def fetch_all_gifs():
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY not set")
    rows, offset, page = [], 0, 1000
    while True:
        url = (f"{SUPABASE_URL}/rest/v1/{TABLE}"
               f"?select={SELECT}&limit={page}&offset={offset}&order=categoria,gruppo_muscolare,slug")
        req = urllib.request.Request(url, headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
        })
        with urllib.request.urlopen(req) as r:
            batch = json.loads(r.read())
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} {fmt % args}")

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/gifs":
            try:
                rows = fetch_all_gifs()
                self.send_json({"rows": rows, "total": len(rows)})
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
        elif self.path in ("/", "/index.html"):
            html = (BASE_DIR / "index.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", len(html))
            self.end_headers()
            self.wfile.write(html)
        else:
            self.send_json({"error": "not found"}, 404)

if __name__ == "__main__":
    server = http.server.HTTPServer(("localhost", PORT), Handler)
    print(f"GIF Mapper → http://localhost:{PORT}")
    server.serve_forever()
