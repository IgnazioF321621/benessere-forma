#!/bin/bash
# Installa gli hook del repo nella cartella hooks comune (vale per tutte le worktree).
set -e
TOPLEVEL=$(git rev-parse --show-toplevel)
HOOKS=$(git rev-parse --git-common-dir)/hooks
mkdir -p "$HOOKS"
cp "$TOPLEVEL/tools/hooks/pre-commit" "$HOOKS/pre-commit"
chmod +x "$HOOKS/pre-commit"
echo "✓ pre-commit installato in $HOOKS"
