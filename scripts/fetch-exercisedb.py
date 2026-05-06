import json
import time
import urllib.request
import urllib.parse

BASE = "https://oss.exercisedb.dev/api/v1/exercises"
OUT = "/Users/ignaziofiorito/benessere-forma/scripts/exercisedb-catalog.json"

all_exercises = []
cursor = None
page = 0
t0 = time.time()

while True:
    params = {"limit": 100}
    if cursor:
        params["cursor"] = cursor
    url = f"{BASE}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=20) as resp:
        body = json.loads(resp.read())

    page += 1
    chunk = body.get("data", [])
    all_exercises.extend(chunk)
    meta = body.get("meta", {})
    cursor = meta.get("nextCursor")
    has_next = meta.get("hasNextPage", False)
    print(f"Page {page}: +{len(chunk)} (total so far: {len(all_exercises)} / {meta.get('total','?')})")
    if not has_next or not cursor:
        break

print(f"\nDone in {time.time()-t0:.1f}s. Total: {len(all_exercises)} exercises")

with open(OUT, "w") as f:
    json.dump(all_exercises, f, indent=2)

print(f"Saved to {OUT}")
