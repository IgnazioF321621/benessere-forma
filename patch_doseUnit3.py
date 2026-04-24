#!/usr/bin/env python3
# Patch P1+P2+P3: dose_unit tendina + dose_multiplier in loadSupps e renderIntegratori
# Esegui con: cd ~/benessere-forma && python3 patch_doseUnit3.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# ── PATCH 1: loadSupps — mappa dose_unit e dose_multiplier dal DB ────────────
OLD1 = """      // dosi e costi dal catalogo
      doses:    cat?.dosi_conf      ?? s.doses    ?? 0,
      dose_die: cat?.dose_die       ?? s.dose_die ?? 1,
      price:    cat?.prezzo_partner ?? s.price    ?? 0,
    };"""
NEW1 = """      // dosi e costi dal catalogo
      doses:    cat?.dosi_conf      ?? s.doses    ?? 0,
      dose_die: cat?.dose_die       ?? s.dose_die ?? 1,
      price:    cat?.prezzo_partner ?? s.price    ?? 0,
      // unità e moltiplicatore dose (personalizzabili dall'utente)
      dose_unit:       s.dose_unit       ?? null,
      dose_multiplier: s.dose_multiplier != null ? parseFloat(s.dose_multiplier) : 1,
    };"""
if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

# ── PATCH 2: renderIntegratori — calcola doseUnitCurrent e select ────────────
OLD2 = """      const doseUnit    = suppUnitFromConfezione(catItem?.confezione, catItem?.linea);
      const doseVal = s.dose_die != null ? s.dose_die : (catItem?.dose_die || '');
      const doseUnitLabel = (() => {
        const n = (s.name||'').toLowerCase();
        if(n.includes('protein') || n.includes('whey') || n.includes('plant') || n.includes('shake')) return 'gr';
        return doseUnit;
      })();"""
NEW2 = """      const doseUnitDefault = (() => {
        const n = (s.name||'').toLowerCase();
        if(n.includes('protein') || n.includes('whey') || n.includes('plant') || n.includes('shake')) return 'g';
        return suppUnitFromConfezione(catItem?.confezione, catItem?.linea);
      })();
      const doseUnitCurrent = s.dose_unit || doseUnitDefault;
      const doseVal = s.dose_die != null ? s.dose_die : (catItem?.dose_die || '');
      const doseMultiplier = s.dose_multiplier != null ? s.dose_multiplier : 1;
      const doseUnitOptions = ['unità','g','cpr','cps','stick','bustine','barrette','tavolette','cucchiai','porzioni'];
      if(!doseUnitOptions.includes(doseUnitCurrent)) doseUnitOptions.unshift(doseUnitCurrent);
      const doseUnitSelect = `<select class="macro-cell-inp" style="font-size:11px;padding:2px 4px;" onchange="updateSupp('${s.local_id}','dose_unit',this.value)">${doseUnitOptions.map(u=>`<option value="${u}"${u===doseUnitCurrent?' selected':''}>${u}</option>`).join('')}</select>`;"""
if OLD2 not in c: errors.append("P2")
else: c = c.replace(OLD2, NEW2, 1); print("P2 ok")

# ── PATCH 3: cella Dose/die → tendina + moltiplicatore ───────────────────────
OLD3 = """      + `<div class="macro-cell"><div class="macro-cell-lbl">Dose/die<br><span style="font-size:9px;font-weight:600;color:var(--acc);">${doseUnitLabel||'unità'}</span></div><input type="number" class="macro-cell-inp" value="${doseVal}" placeholder="—" step="0.5" onchange="updateSuppDose('${s.local_id}',+this.value)"/></div>`
      + `<div class="macro-cell"><div class="macro-cell-lbl">Dosi/conf<br><span style="font-size:9px;font-weight:600;color:var(--t3);">pezzi</span></div><input type="number" class="macro-cell-inp" value="${s.doses||''}" placeholder="—" onchange="updateSupp('${s.local_id}','doses',+this.value)"/></div>`;"""
NEW3 = """      + `<div class="macro-cell"><div class="macro-cell-lbl">Dose/die</div><div style="display:flex;gap:3px;align-items:center;">${doseUnitSelect}<input type="number" class="macro-cell-inp" style="width:44px;" value="${doseVal}" placeholder="—" step="0.5" onchange="updateSuppDose('${s.local_id}',+this.value)"/></div></div>`
      + `<div class="macro-cell"><div class="macro-cell-lbl">Moltiplicatore<br><span style="font-size:9px;color:var(--t3);">es. 0.5 = mezza dose</span></div><input type="number" class="macro-cell-inp" value="${doseMultiplier}" placeholder="1" step="0.25" min="0.25" max="4" onchange="updateSuppMultiplier('${s.local_id}',+this.value)"/></div>`
      + `<div class="macro-cell"><div class="macro-cell-lbl">Dosi/conf<br><span style="font-size:9px;font-weight:600;color:var(--t3);">pezzi</span></div><input type="number" class="macro-cell-inp" value="${s.doses||''}" placeholder="—" onchange="updateSupp('${s.local_id}','doses',+this.value)"/></div>`;"""
if OLD3 not in c: errors.append("P3")
else: c = c.replace(OLD3, NEW3, 1); print("P3 ok")

if errors:
    print("\n❌ ERRORI:", ', '.join(errors))
    print("Non ho modificato nulla.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Fatto! Ora esegui:")
    print("git add -A && git commit -m 'feat: dose_unit tendina + moltiplicatore dose' && git push origin main")
