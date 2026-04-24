#!/usr/bin/env python3
# Patch: fix lista unità dose (cucchiai/porzioni → misurino)
# Esegui con: cd ~/benessere-forma && python3 patch_doseUI.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

OLD1 = "const doseUnitOptions = ['unità','gr','cpr','cps','stick','bustine','barrette','tavolette','cucchiai','porzioni'];"
NEW1 = "const doseUnitOptions = ['unità','gr','cpr','cps','stick','bustine','barrette','tavolette','misurino'];"
if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

if errors:
    print("\n❌ ERRORI:", ', '.join(errors))
    print("Non ho modificato nulla.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Fatto! Ora esegui:")
    print("git add -A && git commit -m 'fix: misurino in lista unità dose' && git push origin main")
