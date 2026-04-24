#!/usr/bin/env python3
# Fix: nota gr misurino = grammi_per_misurino × dose_die
# cd ~/benessere-forma && python3 fix_misurino.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# Fix 1: calcola grammi_per_misurino da confezione (peso_totale / num_dosi)
# es. "450 g (≈45 cucchiai)" → 450/45 = 10g per misurino
OLD1 = "${(()=>{if(doseUnitCurrent!=='misurino') return ''; const conf=catItem?.confezione||''; const m=conf.match(/(\\d+)\\s*g/i); return m?`<span style=\"font-size:10px;color:var(--t3);white-space:nowrap;\">=&nbsp;${m[1]}&nbsp;gr</span>`:'';})()}"
NEW1 = "${(()=>{ if(doseUnitCurrent!=='misurino') return ''; const conf=catItem?.confezione||''; const mPeso=conf.match(/(\\d+(?:[.,]\\d+)?)\\s*g/i); const mDosi=conf.match(/[≈~(]\\s*(\\d+)/); if(!mPeso) return ''; const grTot=parseFloat(mPeso[1]); const nDosi=mDosi?parseFloat(mDosi[1]):null; const grPerMisurino=nDosi&&nDosi>0?Math.round(grTot/nDosi*10)/10:grTot; const grTotale=Math.round(grPerMisurino*(parseFloat(doseVal)||1)*10)/10; return `<span style=\"font-size:10px;color:var(--t3);white-space:nowrap;\">=\\u00a0${grTotale}\\u00a0gr</span>`; })()}"

if OLD1 not in c: errors.append("F1")
else: c = c.replace(OLD1, NEW1, 1); print("F1 ok")

if errors:
    print("❌ ERRORI:", errors)
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("✅ Fix applicato!")
    print("git add -A && git commit -m 'fix: grammi misurino calcolati per dose' && git push origin main")
