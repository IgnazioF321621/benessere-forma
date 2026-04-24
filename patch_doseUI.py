#!/usr/bin/env python3
# Patch: catItem ricerca fuzzy per nome in renderIntegratori
# Esegui con: cd ~/benessere-forma && python3 patch_doseUI.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

OLD1 = "const catItem = ST.catalog.find(c => (s.codice && c.codice === s.codice) || c.nome === s.name);"
NEW1 = "const catItem = ST.catalog.find(c => (s.codice && c.codice === s.codice) || c.nome === s.name || (c.nome||'').toLowerCase().trim() === (s.name||'').toLowerCase().trim());"
if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

if errors:
    print("\n❌ ERRORI:", ', '.join(errors))
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Fatto! Ora esegui:")
    print("git add -A && git commit -m 'fix: catItem ricerca fuzzy per nome' && git push origin main")
