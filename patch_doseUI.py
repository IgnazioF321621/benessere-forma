#!/usr/bin/env python3
# Patch: lista unità + nota gr quando misurino è selezionato
# Esegui con: cd ~/benessere-forma && python3 patch_doseUI.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# ── PATCH 1: aggiorna lista unità ────────────────────────────────────────────
OLD1 = "const doseUnitOptions = ['unità','gr','cpr','cps','stick','bustine','barrette','tavolette','misurino'];"
NEW1 = "const doseUnitOptions = ['unità','gr','cps','stick','barretta','misurino'];"
if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

# ── PATCH 2: cella Dose/die — aggiunge nota gr se misurino ───────────────────
OLD2 = """`<div class="macro-cell"><div class="macro-cell-lbl">Dose/die</div><div style="display:flex;gap:3px;align-items:center;"><input type="number" class="macro-cell-inp" style="width:44px;" value="${doseVal}" placeholder="—" step="0.5" onchange="updateSuppDose('${s.local_id}',+this.value)"/>${doseUnitSelect}</div></div>`"""
NEW2 = """`<div class="macro-cell"><div class="macro-cell-lbl">Dose/die</div><div style="display:flex;gap:3px;align-items:center;"><input type="number" class="macro-cell-inp" style="width:44px;" value="${doseVal}" placeholder="—" step="0.5" onchange="updateSuppDose('${s.local_id}',+this.value)"/>${doseUnitSelect}</div>${doseUnitCurrent==='misurino'&&catItem?.dose_die?`<div style="font-size:10px;color:var(--t3);margin-top:2px;">(≈ ${catItem.dose_die} gr)</div>`:''}</div>`"""
if OLD2 not in c: errors.append("P2")
else: c = c.replace(OLD2, NEW2, 1); print("P2 ok")

if errors:
    print("\n❌ ERRORI:", ', '.join(errors))
    print("Non ho modificato nulla.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Fatto! Ora esegui:")
    print("git add -A && git commit -m 'fix: lista unità + gr accanto a misurino' && git push origin main")
