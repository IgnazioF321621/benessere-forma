#!/usr/bin/env python3
# Patch: estrai grammi da confezione per nota misurino
# Esegui con: cd ~/benessere-forma && python3 patch_doseUI.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# Sostituisci la nota gr: invece di catItem.dose_die, estrai g da confezione
OLD1 = """${doseUnitSelect}${doseUnitCurrent==='misurino'&&catItem?.dose_die?`<span style="font-size:10px;color:var(--t3);white-space:nowrap;">=&nbsp;${catItem.dose_die}&nbsp;gr</span>`:''}</div></div>`"""
NEW1 = """${doseUnitSelect}${(()=>{if(doseUnitCurrent!=='misurino') return ''; const conf=catItem?.confezione||''; const m=conf.match(/(\\d+)\\s*g/i); return m?`<span style="font-size:10px;color:var(--t3);white-space:nowrap;">=&nbsp;${m[1]}&nbsp;gr</span>`:'';})()}</div></div>`"""
if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

if errors:
    print("\n❌ ERRORI:", ', '.join(errors))
    print("Non ho modificato nulla.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Fatto! Ora esegui:")
    print("git add -A && git commit -m 'fix: grammi misurino da campo confezione' && git push origin main")
