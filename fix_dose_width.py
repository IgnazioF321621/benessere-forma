#!/usr/bin/env python3
# Fix: allarga input dose a 58px per mostrare decimali tipo 1.5
# cd ~/benessere-forma && python3 fix_dose_width.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

OLD = "width:46px;font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid var(--b2);border-radius:4px;padding:1px 4px;background:var(--s1);color:var(--t1);text-align:center;"
NEW = "width:58px;font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid var(--b2);border-radius:4px;padding:1px 4px;background:var(--s1);color:var(--t1);text-align:center;"

if OLD not in c:
    print("❌ Non trovato")
else:
    c = c.replace(OLD, NEW, 1)
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("✅ Fix applicato!")
    print("git add -A && git commit -m 'fix: campo dose più largo per decimali' && git push origin main")
