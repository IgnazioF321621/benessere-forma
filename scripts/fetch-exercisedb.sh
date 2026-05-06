#!/bin/bash
set -euo pipefail

OUT=/Users/ignaziofiorito/benessere-forma/scripts/exercisedb-catalog.json
TMP=$(mktemp -d)
BASE="https://oss.exercisedb.dev/api/v1/exercises"

cursor=""
page=0

# Build a single combined JSON array progressively in a temp file
echo "[" > "$TMP/all.json"
first=1

while :; do
  page=$((page+1))
  if [ -z "$cursor" ]; then
    url="${BASE}?limit=100"
  else
    url="${BASE}?limit=100&cursor=${cursor}"
  fi

  resp=$(curl -s "$url")
  count=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('data',[])))")
  total=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('meta',{}).get('total','?'))")
  has_next=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print('1' if d.get('meta',{}).get('hasNextPage') else '0')")
  next=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('meta',{}).get('nextCursor','') or '')")

  echo "Page $page: +$count (total target: $total)"

  # Append data items into combined array
  echo "$resp" | python3 -c "
import json, sys
d = json.load(sys.stdin)
items = d.get('data', [])
print(','.join(json.dumps(x) for x in items))
" >> "$TMP/all.json"

  if [ "$has_next" = "1" ] && [ -n "$next" ]; then
    cursor="$next"
    # ensure comma between pages
    echo "," >> "$TMP/all.json"
  else
    break
  fi
done

echo "]" >> "$TMP/all.json"

# Re-emit cleanly with python (handles any stray commas)
python3 -c "
import json
text = open('$TMP/all.json').read()
# crude clean: collapse 'item,\n,\n' to 'item,\n' if present
parts = [p.strip() for p in text.strip().lstrip('[').rstrip(']').split(',') if p.strip() and p.strip()!=',']
items = [json.loads(p) for p in parts]
json.dump(items, open('$OUT','w'), indent=2)
print(f'Saved {len(items)} exercises to $OUT')
"

rm -rf "$TMP"
