#!/usr/bin/env python3
# Fix: catItem ricerca robusta — risolve nota gr con misurino
# Esegui: cd ~/benessere-forma && python3 fix_catItem.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

OLD = "const catItem = ST.catalog.find(c => (s.codice && c.codice === s.codice) || c.nome === s.name);"
NEW = "const catItem = ST.catalog.find(c => (s.codice && c.codice === s.codice) || c.nome === s.name || (c.nome||'').toLowerCase().trim() === (s.name||'').toLowerCase().trim());"

if OLD not in c:
    print("❌ Stringa non trovata — già patchata o file diverso")
else:
    c = c.replace(OLD, NEW, 1)
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("✅ Fix applicato!")
    print("git add -A && git commit -m 'fix: catItem ricerca robusta per nota gr misurino' && git push origin main")
