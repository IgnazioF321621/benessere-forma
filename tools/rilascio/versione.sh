#!/bin/bash
# Mette la versione in zona-tracker.html con l'ora di Roma. Lo lancia SOLO la sessione
# «REGIA [Audit/Rilascio]», subito prima di pubblicare. Non fa `git add`: il file si mette
# in stage a mano, per nome.
#
# Scrive due cose, con la stessa ora:
#  1. APP_VERSION (quella che si legge nell'app): AAAA.MM.GG · HH:MM
#  2. la coda ?v=AAAAMMGG-HHMM accanto a ogni file di app/ e di shared/ richiamato dalla pagina (href o src),
#     così pagina e file non si possono mischiare fra una versione e l'altra (Metodo 045 e 046).
set -e
TOPLEVEL=$(git rev-parse --show-toplevel)
FILE="$TOPLEVEL/zona-tracker.html"
VERSION=$(TZ=Europe/Rome date +"%Y.%m.%d · %H:%M")
CODA=$(TZ=Europe/Rome date +"%Y%m%d-%H%M")
sed -i.bak -E \
  -e "s|const APP_VERSION = '[^']*';|const APP_VERSION = '$VERSION';|" \
  -e "s#((href|src)=\"(app|shared)/[^\"?]+)(\?v=[^\"]*)?\"#\1?v=$CODA\"#g" \
  "$FILE"
rm -f "$FILE.bak"
grep -n "const APP_VERSION" "$FILE"
grep -nE "(href|src)=\"(app|shared)/" "$FILE"
