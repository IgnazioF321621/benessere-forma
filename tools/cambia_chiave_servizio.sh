#!/bin/bash
# Cambia la chiave di servizio di Supabase nei tre posti che la usano:
#   .env  ·  worker/.dev.vars  ·  il Worker su Cloudflare (secret SUPABASE_SERVICE_ROLE_KEY)
# La chiave si legge dagli appunti: non si incolla, non finisce nella cronologia né in chat.
# Prima di scrivere controlla che la chiave apra davvero il database; se no non tocca niente.
# Tocca SOLO la riga SUPABASE_SERVICE_ROLE_KEY=, le altre righe dei file restano come sono.
#   bash ~/benessere-forma/tools/cambia_chiave_servizio.sh
set -euo pipefail
cd "$(dirname "$0")/.."
URL='https://qxiyeiahpoiliwpqslpr.supabase.co'

# La chiave si prende dagli appunti del Mac (Cmd+C sulla chiave in Supabase, poi lancia lo script):
# niente da incollare, niente ritorni a capo spezzati. Alla fine gli appunti vengono svuotati.
KEY=$(pbpaste | tr -d '[:space:]')
[ -n "${KEY:-}" ] || { echo "✗ gli appunti sono vuoti: copia la chiave da Supabase e rilancia"; exit 1; }
case "$KEY" in sb_secret_*) ;; *) echo "✗ negli appunti non c'è una chiave sb_secret_: non faccio niente"; exit 1;; esac
echo "Chiave letta dagli appunti: sb_secret_… (${#KEY} caratteri)"

echo "1/3 controllo che la chiave apra il database, nei due modi in cui la usa il Worker..."
SOLO=$(curl -s -o /dev/null -w '%{http_code}' "$URL/rest/v1/profiles?select=id&limit=1" -H "apikey: $KEY")
BEARER=$(curl -s -o /dev/null -w '%{http_code}' "$URL/rest/v1/profiles?select=id&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY")
echo "    solo apikey: $SOLO · apikey + Authorization: $BEARER"
if [ "$SOLO" != 200 ] || [ "$BEARER" != 200 ]; then
  echo "✗ non ho scritto niente (serve 200 in entrambi i casi)"; exit 1
fi
echo "    ✓ funziona"

echo "2/3 aggiorno i file sul Mac..."
for F in .env worker/.dev.vars; do
  KEY="$KEY" python3 - "$F" << 'PY'
import os, sys
p, k = sys.argv[1], os.environ['KEY']
righe = open(p, encoding='utf-8').read().splitlines()
pos = [i for i, r in enumerate(righe) if r.startswith('SUPABASE_SERVICE_ROLE_KEY=')]
if len(pos) != 1:
    sys.exit(f'✗ {p}: trovate {len(pos)} righe SUPABASE_SERVICE_ROLE_KEY, non scrivo')
righe[pos[0]] = 'SUPABASE_SERVICE_ROLE_KEY=' + k
open(p, 'w', encoding='utf-8').write('\n'.join(righe) + '\n')
PY
  chmod 600 "$F"
  echo "    ✓ $F"
done

echo "3/3 aggiorno il Worker su Cloudflare..."
(cd worker && printf '%s' "$KEY" | npx --yes wrangler secret put SUPABASE_SERVICE_ROLE_KEY)
unset KEY
pbcopy < /dev/null
echo "Appunti svuotati."
echo
echo "✓ Fatto. La chiave vecchia funziona ancora finché non la disattivi su Supabase."
