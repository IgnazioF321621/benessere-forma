#!/usr/bin/env python3
# Patch: card integratori compatta con espansione on tap
# cd ~/benessere-forma && python3 patch_card.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# ── PATCH 1: sostituisci il blocco supp-card con nuovo layout ────────────────
OLD1 = """html+=`<div class="supp-card ${s.active?'':'inactive'}" draggable="true"
        ondragstart="suppDragStart(event,'${s.local_id}')"
        ondragover="suppDragOver(event)"
        ondrop="suppDrop(event,'${s.local_id}')"
        ondragend="suppDragEnd(event)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
            <span style="color:var(--t3);font-size:18px;cursor:grab;flex-shrink:0;touch-action:none;">⠿</span>
            <input class="supp-name-inp" value="${esc(s.name)}" onchange="updateSupp('${s.local_id}','name',this.value)" style="font-weight:700;font-size:14px;"/>
          </div>
          <div style="display:flex;gap:7px;align-items:center;margin-left:10px;flex-shrink:0;">
            <div class="check-box ${s.active?'on':''}" onclick="toggleSuppActive('${s.local_id}')">${s.active?'<span class="check-mark">✓</span>':''}</div>
            <button onclick="deleteSupp('${s.local_id}')" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:20px;line-height:1;padding:0;" onmouseover="this.style.color='var(--err)'" onmouseout="this.style.color='var(--t3)'">×</button>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
          <input class="supp-slot-inp" value="${esc(s.slot)}" onchange="updateSupp('${s.local_id}','slot',this.value)"/>
          <input class="supp-grp-inp" value="${esc(s.grp||'')}" placeholder="gruppo..." onchange="updateSupp('${s.local_id}','grp',this.value)"/>
          <input class="supp-note-inp" value="${esc(s.note||'')}" placeholder="nota..." onchange="updateSupp('${s.local_id}','note',this.value)"/>
        </div>
        <div class="macro-grid">${macroCells}</div>
        <div style="margin-top:6px;text-align:right;"><span style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace;">${s.price&&s.doses?`€${(s.price/s.doses).toFixed(2)}/dose · `:''}€${suppMonthlyCost(s).toFixed(2)}/mese</span></div>
      </div>`;\n    });\n    html+=`</div>`;\n  })"""

NEW1 = """// ── Badge stock ──────────────────────────────────────────────────
      const dosePerDay = (parseFloat(s.dose_die)||1) * (parseFloat(s.dose_multiplier)||1);
      const totalDoses = parseFloat(s.doses) || 0;
      const daysLeft   = totalDoses > 0 && dosePerDay > 0 ? Math.floor(totalDoses / dosePerDay) : null;
      const stockBadge = (() => {
        if(daysLeft === null) return '';
        if(daysLeft <= 7)  return `<span style="font-size:10px;font-weight:700;background:#FFE5E5;color:var(--err);border-radius:4px;padding:1px 6px;">⚠ ${daysLeft}gg</span>`;
        if(daysLeft <= 20) return `<span style="font-size:10px;font-weight:700;background:#FFF3CD;color:#B07D00;border-radius:4px;padding:1px 6px;">~ ${daysLeft}gg</span>`;
        return `<span style="font-size:10px;font-weight:700;background:#E6F9F0;color:#1A7F4B;border-radius:4px;padding:1px 6px;">✓ ${daysLeft}gg</span>`;
      })();

      // ── Macro pillole ────────────────────────────────────────────────────
      const macroPills = [
        s.kcal    ? `<span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--acc);">${s.kcal}kcal</span>` : '',
        s.protein ? `<span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--prot);">${s.protein}g P</span>` : '',
        s.carbs   ? `<span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--carb);">${s.carbs}g C</span>` : '',
        s.fat     ? `<span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--fat);">${s.fat}g G</span>` : '',
      ].filter(Boolean).join('<span style="color:var(--b2);margin:0 2px;">·</span>');

      const isExpanded = (ST.suppExpanded||new Set()).has(s.local_id);
      const doseLabel  = `${parseFloat(s.dose_die)||1} ${doseUnitCurrent}${doseUnitCurrent==='misurino'&&catItem?.confezione?(()=>{const conf=catItem.confezione;const mP=conf.match(/(\d+(?:[.,]\d+)?)\s*g/i);const mD=conf.match(/[≈~(]\s*(\d+)/);if(!mP)return '';const gPM=mD?Math.round(parseFloat(mP[1])/parseFloat(mD[1])*10)/10:parseFloat(mP[1]);return ' = '+(Math.round(gPM*(parseFloat(s.dose_die)||1)*10)/10)+' gr';})():''}`;

      html+=`<div class="supp-card ${s.active?'':'inactive'}" draggable="true"
        ondragstart="suppDragStart(event,'${s.local_id}')"
        ondragover="suppDragOver(event)"
        ondrop="suppDrop(event,'${s.local_id}')"
        ondragend="suppDragEnd(event)">

        <!-- VISTA COMPATTA -->
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:var(--t3);font-size:18px;cursor:grab;flex-shrink:0;touch-action:none;">⠿</span>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
              <span style="font-weight:700;font-size:14px;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.name)}</span>
              ${s.grp?`<span style="font-size:10px;background:var(--s3);color:var(--t2);border-radius:4px;padding:1px 6px;">${esc(s.grp)}</span>`:''}
              ${stockBadge}
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-size:11px;color:var(--t3);font-family:'JetBrains Mono',monospace;">${doseLabel}</span>
              ${macroPills?`<span style="color:var(--b2);">·</span>${macroPills}`:''}
              <span style="color:var(--b2);">·</span>
              <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--t3);">€${suppMonthlyCost(s).toFixed(2)}/mese</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
            <button onclick="event.stopPropagation();toggleSuppExpand('${s.local_id}')" style="background:none;border:1px solid var(--b2);border-radius:6px;cursor:pointer;color:var(--t3);font-size:13px;padding:3px 7px;line-height:1;" title="Modifica">${isExpanded?'▲':'✏️'}</button>
            <div class="check-box ${s.active?'on':''}" onclick="toggleSuppActive('${s.local_id}')">${s.active?'<span class="check-mark">✓</span>':''}</div>
            <button onclick="deleteSupp('${s.local_id}')" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:20px;line-height:1;padding:0;" onmouseover="this.style.color='var(--err)'" onmouseout="this.style.color='var(--t3)'">×</button>
          </div>
        </div>

        <!-- VISTA ESPANSA -->
        ${isExpanded?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--b1);">
          <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
            <input class="supp-name-inp" value="${esc(s.name)}" onchange="updateSupp('${s.local_id}','name',this.value)" style="font-weight:700;font-size:13px;flex:1;min-width:120px;"/>
            <input class="supp-slot-inp" value="${esc(s.slot)}" onchange="updateSupp('${s.local_id}','slot',this.value)"/>
            <input class="supp-grp-inp" value="${esc(s.grp||'')}" placeholder="gruppo..." onchange="updateSupp('${s.local_id}','grp',this.value)"/>
            <input class="supp-note-inp" value="${esc(s.note||'')}" placeholder="nota..." onchange="updateSupp('${s.local_id}','note',this.value)"/>
          </div>
          <div class="macro-grid">${macroCells}</div>
          <div style="margin-top:6px;text-align:right;"><span style="font-size:10px;color:var(--t3);font-family:'JetBrains Mono',monospace;">${s.price&&s.doses?`€${(s.price/s.doses).toFixed(2)}/dose · `:''}€${suppMonthlyCost(s).toFixed(2)}/mese</span></div>
        </div>`:''}

      </div>`;
    });
    html+=`</div>`;
  })"""

if OLD1 not in c: errors.append("P1-card")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

# ── PATCH 2: aggiungi funzione toggleSuppExpand ──────────────────────────────
OLD2 = "function toggleSuppActive(id){"
NEW2 = """function toggleSuppExpand(id) {
  if(!ST.suppExpanded) ST.suppExpanded = new Set();
  if(ST.suppExpanded.has(id)) ST.suppExpanded.delete(id);
  else ST.suppExpanded.add(id);
  renderIntegratori();
}

function toggleSuppActive(id){"""

if OLD2 not in c: errors.append("P2-expand")
else: c = c.replace(OLD2, NEW2, 1); print("P2 ok")

if errors:
    print("\n❌ ERRORI:", ', '.join(errors))
    print("Nessuna modifica salvata.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Patch applicate!")
    print("git add -A && git commit -m 'feat: card integratori compatta con espansione' && git push origin main")
