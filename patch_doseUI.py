#!/usr/bin/env python3
# Patch UI: fix etichette dose_unit, moltiplicatore, Dosi/conf
# Esegui con: cd ~/benessere-forma && python3 patch_doseUI.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# ── PATCH 1: 'g' → 'gr' nella lista opzioni tendina ─────────────────────────
OLD1 = "const doseUnitOptions = ['unità','g','cpr','cps','stick','bustine','barrette','tavolette','cucchiai','porzioni'];"
NEW1 = "const doseUnitOptions = ['unità','gr','cpr','cps','stick','bustine','barrette','tavolette','cucchiai','porzioni'];"
if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

# ── PATCH 2: 'g' → 'gr' nel default per proteine/shake ──────────────────────
OLD2 = "        if(n.includes('protein') || n.includes('whey') || n.includes('plant') || n.includes('shake')) return 'g';"
NEW2 = "        if(n.includes('protein') || n.includes('whey') || n.includes('plant') || n.includes('shake')) return 'gr';"
if OLD2 not in c: errors.append("P2")
else: c = c.replace(OLD2, NEW2, 1); print("P2 ok")

# ── PATCH 3: cella Dose/die — tendina DOPO il numero ─────────────────────────
OLD3 = """      + `<div class="macro-cell"><div class="macro-cell-lbl">Dose/die</div><div style="display:flex;gap:3px;align-items:center;">${doseUnitSelect}<input type="number" class="macro-cell-inp" style="width:44px;" value="${doseVal}" placeholder="—" step="0.5" onchange="updateSuppDose('${s.local_id}',+this.value)"/></div></div>`"""
NEW3 = """      + `<div class="macro-cell"><div class="macro-cell-lbl">Dose/die</div><div style="display:flex;gap:3px;align-items:center;"><input type="number" class="macro-cell-inp" style="width:44px;" value="${doseVal}" placeholder="—" step="0.5" onchange="updateSuppDose('${s.local_id}',+this.value)"/>${doseUnitSelect}</div></div>`"""
if OLD3 not in c: errors.append("P3")
else: c = c.replace(OLD3, NEW3, 1); print("P3 ok")

# ── PATCH 4: Moltiplicatore — esempio tra parentesi ──────────────────────────
OLD4 = """<div class="macro-cell-lbl">Moltiplicatore<br><span style="font-size:9px;color:var(--t3);">es. 0.5 = mezza dose</span></div>"""
NEW4 = """<div class="macro-cell-lbl">Moltiplicatore<br><span style="font-size:9px;color:var(--t3);">(0.5 = mezza dose)</span></div>"""
if OLD4 not in c: errors.append("P4")
else: c = c.replace(OLD4, NEW4, 1); print("P4 ok")

# ── PATCH 5: Dosi/conf — rimuovi "pezzi" ─────────────────────────────────────
OLD5 = """<div class="macro-cell-lbl">Dosi/conf<br><span style="font-size:9px;font-weight:600;color:var(--t3);">pezzi</span></div>"""
NEW5 = """<div class="macro-cell-lbl">Dosi/conf</div>"""
if OLD5 not in c: errors.append("P5")
else: c = c.replace(OLD5, NEW5, 1); print("P5 ok")

if errors:
    print("\n❌ ERRORI:", ', '.join(errors))
    print("Non ho modificato nulla.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Fatto! Ora esegui:")
    print("git add -A && git commit -m 'fix: UI dose unit etichette' && git push origin main")
