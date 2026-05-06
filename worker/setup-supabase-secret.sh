#!/bin/bash
# Setup sicuro della SUPABASE_SERVICE_ROLE_KEY:
#   - input silenzioso (no echo, no shell history)
#   - scrittura .dev.vars chmod 600
#   - push a Cloudflare via stdin (no argv leak)
# Da lanciare manualmente:
#   bash ~/benessere-forma/worker/setup-supabase-secret.sh

set -euo pipefail

cd "$(dirname "$0")"

# -- 1. Read secret silently --
printf 'SUPABASE_SERVICE_ROLE_KEY (input nascosto, premi invio quando finito): '
IFS= read -rs KEY
echo
if [ -z "${KEY:-}" ]; then
  echo "ERROR: input vuoto, abort." >&2
  exit 1
fi
echo "  -> Letti ${#KEY} caratteri."

# -- 2. Write to .dev.vars (chmod 600) --
umask 077
cat > .dev.vars <<EOF
# Local-only secrets per \`wrangler dev\`. NON committare (gitignored).
API_KEY=__SET_VIA_DASHBOARD_OR_OVERRIDE__
SUPABASE_SERVICE_ROLE_KEY=$KEY
EOF
chmod 600 .dev.vars
echo "  -> .dev.vars aggiornato (chmod 600)."

# -- 3. Wrangler auth check --
echo
echo "Step: verifico autenticazione wrangler..."
if ! npx --yes wrangler@latest whoami > /tmp/wrangler-whoami.log 2>&1; then
  echo "  Non autenticato. Lancio 'wrangler login' (si aprira il browser)."
  npx --yes wrangler@latest login
else
  echo "  Gia autenticato come:"
  grep -E "email|account" /tmp/wrangler-whoami.log || cat /tmp/wrangler-whoami.log | tail -5
fi
rm -f /tmp/wrangler-whoami.log

# -- 4. Push secret to Cloudflare (via stdin, no argv) --
echo
echo "Step: push secret SUPABASE_SERVICE_ROLE_KEY su Cloudflare..."
printf '%s' "$KEY" | npx --yes wrangler@latest secret put SUPABASE_SERVICE_ROLE_KEY

# -- 5. Clear from this shell --
unset KEY

# -- 6. Verify --
echo
echo "Step: verifica secret list..."
npx --yes wrangler@latest secret list

echo
echo "OK. Setup completato."
echo "Prossimo step: deploy del Worker con 'npx wrangler deploy' (lo facciamo dopo aver"
echo "esteso src/index.js con l'endpoint /exercise-media)."
