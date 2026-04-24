#!/usr/bin/env python3
# Fix: re-render card quando cambia dose_unit (per mostrare nota gr misurino)
# cd ~/benessere-forma && python3 fix_rerender.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

OLD = "function updateSupp(id,key,val){\n  const s=ST.supps.find(s=>s.local_id===id);\n  if(s){s[key]=val;clearTimeout(s._saveTimer);s._saveTimer=setTimeout(()=>{dbUpdateSupp(id,{[key]:val});saveCache();},800);"
NEW = "function updateSupp(id,key,val){\n  const s=ST.supps.find(s=>s.local_id===id);\n  if(s){s[key]=val;clearTimeout(s._saveTimer);s._saveTimer=setTimeout(()=>{dbUpdateSupp(id,{[key]:val});saveCache();},800);\n  if(key==='dose_unit') renderIntegratori();"

if OLD not in c:
    print("❌ Stringa non trovata")
else:
    c = c.replace(OLD, NEW, 1)
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("✅ Fix applicato!")
    print("git add -A && git commit -m 'fix: re-render su cambio dose_unit' && git push origin main")
