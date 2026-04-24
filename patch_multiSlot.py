#!/usr/bin/env python3
# Patch: supporto multi-slot integratori
# Esegui con: cd ~/benessere-forma && python3 patch_multiSlot.py

with open('zona-tracker.html', 'r', encoding='utf-8') as f:
    c = f.read()

errors = []

# ── PATCH 1: rimuovi existingNames da renderCatalogList ──────────────────────
OLD1 = "  const existingNames = new Set(ST.supps.map(s => s.name));\n  const selAdd = new Set(ST.catalogSelected);"
NEW1 = "  const selAdd = new Set(ST.catalogSelected);"
if OLD1 not in c: errors.append("P1")
else: c = c.replace(OLD1, NEW1, 1); print("P1 ok")

# ── PATCH 2: blocco inProfile → logica multi-slot ────────────────────────────
OLD2 = """  document.getElementById('catalog-list').innerHTML = items.map(item => {
    const inProfile = existingNames.has(item.nome);
    const toAdd    = selAdd.has(item.codice);
    const toRemove = selRem.has(item.codice);
    let boxClass, boxContent, itemClass;
    if(inProfile) {
      if(toRemove) {
        boxClass   = 'check-box remove';
        boxContent = '<span class="check-mark" style="color:var(--err);">✕</span>';
        itemClass  = 'catalog-item to-remove';
      } else {
        boxClass   = 'check-box on';
        boxContent = '<span class="check-mark">✓</span>';
        itemClass  = 'catalog-item';
      }
    } else {
      boxClass   = toAdd ? 'check-box on' : 'check-box';
      boxContent = toAdd ? '<span class="check-mark">✓</span>' : '';
      itemClass  = 'catalog-item';
    }
    const prezzo = item.prezzo_partner != null ? `€${parseFloat(item.prezzo_partner).toFixed(2)}/conf` : '';
    const mensile = item.costo_mensile_partner != null ? `€${parseFloat(item.costo_mensile_partner).toFixed(2)}/mese` : '';
    return `<div class="${itemClass}" onclick="toggleCatalogItem('${esc(item.codice)}')">
      <div class="${boxClass}">${boxContent}</div>
      <div class="catalog-item-info">
        <div class="catalog-item-name">${esc(item.nome)}</div>
        <div class="catalog-item-slot" style="margin-top:2px;">${[item.linea, item.categoria].filter(Boolean).map(esc).join(' · ')}</div>
        <div class="catalog-item-slot">${[item.confezione, item.dose_die ? 'Dose: '+item.dose_die : ''].filter(Boolean).map(esc).join(' · ')}</div>
        <div class="catalog-item-slot" style="color:var(--acc);">${[prezzo, mensile].filter(Boolean).join(' · ')}</div>
      </div>
    </div>`;
  }).join('');
}"""
NEW2 = """  document.getElementById('catalog-list').innerHTML = items.map(item => {
    const instances = ST.supps.filter(s => (item.codice && s.codice === item.codice) || s.name === item.nome);
    const instanceCount = instances.length;
    const toAdd    = selAdd.has(item.codice);
    const toRemove = selRem.has(item.codice);
    let boxClass, boxContent, itemClass, instanceBadge = '';
    if(instanceCount > 0) {
      instanceBadge = `<span style="font-size:10px;font-family:'JetBrains Mono',monospace;background:var(--acc-lt);color:var(--acc);border-radius:4px;padding:1px 5px;font-weight:700;margin-left:4px;">×${instanceCount}</span>`;
    }
    if(toRemove) {
      boxClass   = 'check-box remove';
      boxContent = '<span class="check-mark" style="color:var(--err);">✕</span>';
      itemClass  = 'catalog-item to-remove';
    } else if(toAdd) {
      boxClass   = 'check-box on';
      boxContent = '<span class="check-mark">✓</span>';
      itemClass  = 'catalog-item';
    } else {
      boxClass   = 'check-box';
      boxContent = '';
      itemClass  = 'catalog-item';
    }
    const prezzo = item.prezzo_partner != null ? `€${parseFloat(item.prezzo_partner).toFixed(2)}/conf` : '';
    const mensile = item.costo_mensile_partner != null ? `€${parseFloat(item.costo_mensile_partner).toFixed(2)}/mese` : '';
    const removeBtn = instanceCount > 0 && !toAdd
      ? `<button onclick="event.stopPropagation();toggleCatalogRemove('${esc(item.codice)}')" style="background:none;border:1px solid var(--err);border-radius:5px;color:var(--err);font-size:10px;padding:2px 7px;cursor:pointer;flex-shrink:0;font-family:'Manrope',sans-serif;">${toRemove ? '↩ annulla' : '✕ rimuovi'}</button>`
      : '';
    return `<div class="${itemClass}" onclick="toggleCatalogItem('${esc(item.codice)}')">
      <div class="${boxClass}">${boxContent}</div>
      <div class="catalog-item-info" style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
          <span class="catalog-item-name">${esc(item.nome)}</span>${instanceBadge}
        </div>
        <div class="catalog-item-slot" style="margin-top:2px;">${[item.linea, item.categoria].filter(Boolean).map(esc).join(' · ')}</div>
        <div class="catalog-item-slot">${[item.confezione, item.dose_die ? 'Dose: '+item.dose_die : ''].filter(Boolean).map(esc).join(' · ')}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:3px;gap:8px;flex-wrap:wrap;">
          <div class="catalog-item-slot" style="color:var(--acc);">${[prezzo, mensile].filter(Boolean).join(' · ')}</div>
          ${removeBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}"""
if OLD2 not in c: errors.append("P2")
else: c = c.replace(OLD2, NEW2, 1); print("P2 ok")

# ── PATCH 3: toggleCatalogItem + nuova toggleCatalogRemove ───────────────────
OLD3 = """function toggleCatalogItem(id) {
  const item = ST.catalog.find(c => c.codice === id);
  if(!item) return;
  const inProfile = ST.supps.some(s => s.name === item.nome);
  if(inProfile) {
    const i = ST.catalogToRemove.indexOf(id);
    if(i < 0) ST.catalogToRemove.push(id);
    else ST.catalogToRemove.splice(i, 1);
  } else {
    const i = ST.catalogSelected.indexOf(id);
    if(i < 0) ST.catalogSelected.push(id);
    else ST.catalogSelected.splice(i, 1);
  }
  renderCatalogList();
}"""
NEW3 = """function toggleCatalogItem(id) {
  if(ST.catalogToRemove.includes(id)) return;
  const i = ST.catalogSelected.indexOf(id);
  if(i < 0) ST.catalogSelected.push(id);
  else ST.catalogSelected.splice(i, 1);
  renderCatalogList();
}

function toggleCatalogRemove(id) {
  const i = ST.catalogToRemove.indexOf(id);
  if(i < 0) ST.catalogToRemove.push(id);
  else ST.catalogToRemove.splice(i, 1);
  const j = ST.catalogSelected.indexOf(id);
  if(j >= 0) ST.catalogSelected.splice(j, 1);
  renderCatalogList();
}"""
if OLD3 not in c: errors.append("P3")
else: c = c.replace(OLD3, NEW3, 1); print("P3 ok")

# ── PATCH 4: goToCatalogStep2 — nota slot già esistenti ──────────────────────
OLD4 = """    html += toAdd.map(item => {
      const tip = SLOT_TIPS[item.nome] || DEFAULT_SLOT_TIP;
      return `<div class="catalog-s2-row">
        <div class="catalog-s2-name">${esc(item.nome)}</div>
        <input class="inp inp-sm" id="slot-${item.codice}" value="08:00" placeholder="08:00" style="width:110px;"/>
        <div class="slot-tip">💡 ${tip}</div>
      </div>`;
    }).join('');"""
NEW4 = """    html += toAdd.map(item => {
      const tip = SLOT_TIPS[item.nome] || DEFAULT_SLOT_TIP;
      const existingSlots = ST.supps
        .filter(s => (item.codice && s.codice === item.codice) || s.name === item.nome)
        .map(s => s.slot);
      const instanceNote = existingSlots.length > 0
        ? `<div style="font-size:10px;color:var(--t3);margin-top:2px;">Già presente: ${existingSlots.join(', ')}</div>`
        : '';
      return `<div class="catalog-s2-row">
        <div style="flex:1;min-width:0;">
          <div class="catalog-s2-name">${esc(item.nome)}</div>
          ${instanceNote}
        </div>
        <input class="inp inp-sm" id="slot-${item.codice}" value="08:00" placeholder="08:00" style="width:110px;"/>
        <div class="slot-tip">💡 ${tip}</div>
      </div>`;
    }).join('');"""
if OLD4 not in c: errors.append("P4")
else: c = c.replace(OLD4, NEW4, 1); print("P4 ok")

# ── PATCH 5: goToCatalogStep2 — dettaglio istanze da rimuovere ───────────────
OLD5 = """  if(hasRem) {
    html += `<div class="catalog-s2-section-lbl" style="color:var(--err);${hasAdd?'margin-top:16px;':''}">Da rimuovere (${toRemove.length})</div>
      <div class="catalog-s2-removals">${toRemove.map(item =>
        `<div style="font-size:13px;color:var(--err);padding:3px 0;">✕ ${esc(item.nome)}</div>`
      ).join('')}</div>`;
  }"""
NEW5 = """  if(hasRem) {
    html += `<div class="catalog-s2-section-lbl" style="color:var(--err);${hasAdd?'margin-top:16px;':''}">Da rimuovere (${toRemove.length})</div>`;
    html += toRemove.map(item => {
      const instances = ST.supps.filter(s => (item.codice && s.codice === item.codice) || s.name === item.nome);
      const instanceNote = instances.length > 1
        ? ` <span style="font-size:10px;color:var(--t3);">(tutte le ${instances.length} istanze: ${instances.map(s=>s.slot).join(', ')})</span>`
        : instances.length === 1 ? ` <span style="font-size:10px;color:var(--t3);">(${instances[0].slot})</span>` : '';
      return `<div style="font-size:13px;color:var(--err);padding:3px 0;">✕ ${esc(item.nome)}${instanceNote}</div>`;
    }).join('');
  }"""
if OLD5 not in c: errors.append("P5")
else: c = c.replace(OLD5, NEW5, 1); print("P5 ok")

# ── PATCH 6: importFromCatalog — rimuovi tutte le istanze ────────────────────
OLD6 = """    // Rimuovi
    for(const item of toRemove) {
      const supp = ST.supps.find(s => s.name === item.nome);
      if(supp) {
        await dbDeleteSupp(supp.local_id);
        ST.supps = ST.supps.filter(s => s.local_id !== supp.local_id);
      }
    }"""
NEW6 = """    // Rimuovi TUTTE le istanze del prodotto (supporto multi-slot)
    for(const item of toRemove) {
      const instances = ST.supps.filter(s => (item.codice && s.codice === item.codice) || s.name === item.nome);
      for(const supp of instances) {
        await dbDeleteSupp(supp.local_id);
      }
      ST.supps = ST.supps.filter(s => !instances.some(i => i.local_id === s.local_id));
    }"""
if OLD6 not in c: errors.append("P6")
else: c = c.replace(OLD6, NEW6, 1); print("P6 ok")

# ── Risultato ─────────────────────────────────────────────────────────────────
if errors:
    print("\n❌ ERRORI nelle patch:", ', '.join(errors))
    print("Non ho modificato nulla.")
else:
    with open('zona-tracker.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("\n✅ Patch applicate! Ora esegui:")
    print("git add -A && git commit -m 'feat: multi-slot integratori' && git push origin main")
