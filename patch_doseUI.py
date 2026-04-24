#!/usr/bin/env python3
# Patch: nota gr inline nella cella quando unità = misurino
# Esegui con: cd ~/benessere-forma && python3 patch_doseUI.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

OLD1 = """${doseUnitSelect}</div>${doseUnitCurrent==='misurino'&&catItem?.dose_die?`<div style="font-size:10px;color:var(--t3);margin-top:2px;">(≈ ${catItem.dose_die} gr)</div>`:''}</div>`"""
NEW1 = """${doseUnitSelect}${doseUnitCurrent==='misurino'&&catItem?.dose_die?`<span style="font-size:10px;color:var(--t3);white-space:nowrap;">=&nbsp;${catItem.dose_die}&nbsp;gr</span>`:''}</div></div>`"""
if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

if errors:
    print("\n❌ ERRORI:", ', '.join(errors))
    print("Non ho modificato nulla.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Fatto! Ora esegui:")
    print("git add -A && git commit -m 'fix: nota gr inline accanto a misurino' && git push origin main")
