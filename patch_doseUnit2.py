#!/usr/bin/env python3
# Patch P4+P5 corrette per dose_unit/dose_multiplier
# Esegui con: cd ~/benessere-forma && python3 patch_doseUnit2.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# ── PATCH 4: inserisci updateSuppMultiplier prima di updateSupp ──────────────
OLD4 = "function updateSupp(id,key,val){\n  const s=ST.supps.find(s=>s.local_id===id);\n  if(s){s[key]=val;clearTimeout(s._saveTimer);s._saveTimer=setTimeout(()=>{dbUpdateSupp(id,{[key]:val});saveCache();},800);}\n}"
NEW4 = """function updateSuppMultiplier(id, newMultiplier) {
  const s = ST.supps.find(s => s.local_id === id);
  if(!s) return;
  newMultiplier = Math.max(0.25, Math.min(4, parseFloat(newMultiplier) || 1));
  s.dose_multiplier = newMultiplier;
  clearTimeout(s._saveTimer);
  s._saveTimer = setTimeout(() => {
    dbUpdateSupp(id, {dose_multiplier: newMultiplier});
    saveCache();
  }, 800);
}

function updateSupp(id,key,val){
  const s=ST.supps.find(s=>s.local_id===id);
  if(s){s[key]=val;clearTimeout(s._saveTimer);s._saveTimer=setTimeout(()=>{dbUpdateSupp(id,{[key]:val});saveCache();},800);}
}"""
if OLD4 not in c: errors.append("P4")
else: c = c.replace(OLD4, NEW4, 1); print("P4 ok")

# ── PATCH 5: suppMonthlyCost applica dose_multiplier ────────────────────────
OLD5 = "function suppMonthlyCost(s){return(s.price&&s.doses)?(s.price/s.doses)*30:0;}"
NEW5 = """function suppMonthlyCost(s){
  const multiplier = s.dose_multiplier != null ? parseFloat(s.dose_multiplier) : 1;
  return (s.price&&s.doses) ? (s.price/s.doses)*30*multiplier : 0;
}"""
if OLD5 not in c: errors.append("P5")
else: c = c.replace(OLD5, NEW5, 1); print("P5 ok")

if errors:
    print("\n❌ ERRORI nelle patch:", ', '.join(errors))
    print("Non ho modificato nulla.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Patch applicate! Ora esegui:")
    print("git add -A && git commit -m 'fix: dose_multiplier su costo + updateSuppMultiplier' && git push origin main")
