#!/usr/bin/env python3
# Fix: re-render dopo cambio dose_die (aggiorna nota gr misurino)
# cd ~/benessere-forma && python3 fix_misurino2.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

OLD = """  s.dose_die = newDose;
  clearTimeout(s._saveTimer);
  s._saveTimer = setTimeout(() => {
    dbUpdateSupp(id, {dose_die: newDose, kcal: s.kcal, protein: s.protein, carbs: s.carbs, fat: s.fat});
    saveCache();
  }, 800);
}"""

NEW = """  s.dose_die = newDose;
  if(s.dose_unit === 'misurino') renderIntegratori();
  clearTimeout(s._saveTimer);
  s._saveTimer = setTimeout(() => {
    dbUpdateSupp(id, {dose_die: newDose, kcal: s.kcal, protein: s.protein, carbs: s.carbs, fat: s.fat});
    saveCache();
  }, 800);
}"""

if OLD not in c:
    print("❌ Stringa non trovata")
else:
    c = c.replace(OLD, NEW, 1)
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("✅ Fix applicato!")
    print("git add -A && git commit -m 'fix: nota gr misurino aggiornata al cambio dose' && git push origin main")
