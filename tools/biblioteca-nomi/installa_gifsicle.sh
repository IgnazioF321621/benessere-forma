#!/bin/bash
# Compila gifsicle in tools/bin/. Si lancia una volta sola, dalla radice del repo:
#
#     bash tools/biblioteca-nomi/installa_gifsicle.sh
#
# Perche' esiste: sul Mac non c'e' Homebrew, ne' ffmpeg, ne' ImageMagick. gifsicle
# e' l'unico strumento che ridimensiona una GIF animata conservando la codifica
# fra un fotogramma e l'altro — Pillow da sola rifa' i fotogrammi da capo e il
# file finisce per pesare di piu' dell'originale (misurato: +89% su due file su sei).
#
# Il binario NON sta nel repo: e' compilato per questo Mac e non varrebbe altrove.
# Sta in tools/bin/, che e' fuori da git. Questo script e' la parte che resta.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="$REPO/tools/bin"
VER="1.96"
# Impronta del sorgente, verificata il 15 agosto 2026. Se non combacia lo script
# si ferma: meglio nessun gifsicle che un gifsicle che non sappiamo da dove viene.
SHA="fd23d279681a6dfe3c15264e33f344045b3ba473da4d19f49e67a50994b077fb"

if [ -x "$DEST/gifsicle" ]; then
  echo "gia' presente: $("$DEST/gifsicle" --version | head -1)"
  echo "per rifarlo da zero: rm -rf '$DEST'"
  exit 0
fi

LAV="$(mktemp -d)"
trap 'rm -rf "$LAV"' EXIT

echo "scarico gifsicle $VER..."
curl -sL --max-time 180 -o "$LAV/gifsicle.tar.gz" \
  "https://www.lcdf.org/gifsicle/gifsicle-$VER.tar.gz"

echo "verifico l'impronta del sorgente..."
TROVATA="$(shasum -a 256 "$LAV/gifsicle.tar.gz" | cut -d' ' -f1)"
if [ "$TROVATA" != "$SHA" ]; then
  echo "IMPRONTA DIVERSA — mi fermo."
  echo "  attesa:  $SHA"
  echo "  trovata: $TROVATA"
  exit 1
fi

echo "compilo (un paio di minuti)..."
tar xzf "$LAV/gifsicle.tar.gz" -C "$LAV"
cd "$LAV/gifsicle-$VER"
# Si compila e basta: `make install` con --prefix=tools/ spargerebbe anche
# share/man/ dentro il repo. Serve un binario, si copia quello.
./configure --prefix="$LAV/prefisso" >/dev/null 2>&1
make -j"$(sysctl -n hw.ncpu)" >/dev/null 2>&1
mkdir -p "$DEST"
cp src/gifsicle "$DEST/gifsicle"
chmod +x "$DEST/gifsicle"

echo "fatto: $("$DEST/gifsicle" --version | head -1)"
echo "       $DEST/gifsicle"
