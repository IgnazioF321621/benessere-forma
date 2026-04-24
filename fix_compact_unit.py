#!/usr/bin/env python3
# Fix: tendina dose_unit visibile nella vista compatta
# cd ~/benessere-forma && python3 fix_compact_unit.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# Sostituisci il doseLabel testuale con numero + tendina + nota gr
OLD1 = """              <span style="font-size:11px;color:var(--t3);font-family:'JetBrains Mono',monospace;">${doseLabel}</span>"""
NEW1 = """              <div style="display:flex;align-items:center;gap:3px;">
                <input type="number" style="width:36px;font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid var(--b2);border-radius:4px;padding:1px 3px;background:var(--s1);color:var(--t1);text-align:center;" value="${parseFloat(s.dose_die)||1}" step="0.5" min="0.5" onchange="updateSuppDose('${s.local_id}',+this.value)" onclick="event.stopPropagation()"/>
                ${doseUnitSelect}
                ${doseUnitCurrent==='misurino'&&catItem?.confezione?(()=>{const conf=catItem.confezione;const mP=conf.match(/(\d+(?:[.,]\d+)?)\s*g/i);const mD=conf.match(/[≈~(]\s*(\d+)/);if(!mP)return '';const gPM=mD?Math.round(parseFloat(mP[1])/parseFloat(mD[1])*10)/10:parseFloat(mP[1]);return `<span style="font-size:10px;color:var(--t3);">= ${Math.round(gPM*(parseFloat(s.dose_die)||1)*10)/10} gr</span>`;})():''}
              </div>"""

if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

if errors:
    print("❌ ERRORI:", errors)
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("✅ Fix applicato!")
    print("git add -A && git commit -m 'fix: tendina dose_unit in vista compatta' && git push origin main")
