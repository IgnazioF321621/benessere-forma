#!/bin/bash
# Mette APP_VERSION in zona-tracker.html con l'ora di Roma. Lo lancia SOLO la sessione «Rilascio»,
# subito prima di pubblicare. Non fa `git add`: il file si mette in stage a mano, per nome.
set -e
TOPLEVEL=$(git rev-parse --show-toplevel)
FILE="$TOPLEVEL/zona-tracker.html"
VERSION=$(TZ=Europe/Rome date +"%Y.%m.%d · %H:%M")
sed -i.bak -E "s|const APP_VERSION = '[^']*';|const APP_VERSION = '$VERSION';|" "$FILE"
rm -f "$FILE.bak"
grep -n "const APP_VERSION" "$FILE"
