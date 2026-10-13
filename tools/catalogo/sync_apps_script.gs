/**
 * ZonaTracker-Sync-Esercizi (v4: la chiave non sta più nel codice)
 * ──────────────────────────────────────────────────────────────
 * Menu "Sync Esercizi" nel foglio Google: un clic manda il catalogo a Supabase.
 *
 * Novità v4 (13 ottobre 2026): la chiave segreta di Supabase NON è scritta qui.
 * Sta nelle «Proprietà dello script» (Apps Script → Impostazioni progetto →
 * Proprietà dello script), con il nome SUPABASE_SECRET_KEY. Le chiavi vecchie
 * (service_role in formato JWT) sono state disattivate il 4 ottobre 2026.
 *
 * Il sync NON cancella nulla: manda tutte le righe del foglio e Supabase le
 * aggiorna per codice. Le colonne sono quelle della prima riga del foglio:
 * ogni intestazione deve essere una colonna vera di esercizi_catalog
 * (dal 13 ottobre anche `unilaterale` e `progressione`).
 *
 * AGGIORNAMENTO: Estensioni > Apps Script > cancella tutto > incolla questo > Salva.
 * ──────────────────────────────────────────────────────────────
 */

var SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';
var SHEET_ID   = '1kEaq1SNsd5pY66p2JkFJCfBaPLtCMCk-2an3z4w9mo8';
var SHEET_NAME = 'esercizi_catalog';
var TABLE      = 'esercizi_catalog';

function chiaveSegreta_() {
  return PropertiesService.getScriptProperties().getProperty('SUPABASE_SECRET_KEY');
}

/**
 * Crea il menu personalizzato quando il foglio viene aperto.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Sync Esercizi')
    .addItem('Esegui sync', 'syncEsercizi')
    .addToUi();
}

function syncEsercizi() {
  var chiave = chiaveSegreta_();
  if (!chiave) {
    SpreadsheetApp.getUi().alert('Manca la chiave. Apps Script > Impostazioni progetto > Proprietà dello script > aggiungi SUPABASE_SECRET_KEY.');
    return;
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Scheda "' + SHEET_NAME + '" non trovata.');
    return;
  }

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) {
    SpreadsheetApp.getUi().alert('Nessun dato da sincronizzare.');
    return;
  }

  var headers = [];
  for (var h = 0; h < rows[0].length; h++) {
    headers.push(String(rows[0][h]).trim());
  }

  var records = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];

    var vuota = true;
    for (var c = 0; c < row.length; c++) {
      if (String(row[c]).trim() !== '') { vuota = false; break; }
    }
    if (vuota) continue;

    var rec = {};
    for (var k = 0; k < headers.length; k++) {
      var val = row[k];
      if (val === '' || val === null || val === undefined) {
        val = null;
      } else {
        val = String(val).trim();
      }
      rec[headers[k]] = val;
    }

    if (!rec.codice) continue;
    rec.updated_at = new Date().toISOString();
    records.push(rec);
  }

  if (records.length === 0) {
    SpreadsheetApp.getUi().alert('Nessun record valido (manca la colonna codice?).');
    return;
  }

  var url = SUPABASE_URL + '/rest/v1/' + TABLE + '?on_conflict=codice';
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': chiave,
      'Authorization': 'Bearer ' + chiave,
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    payload: JSON.stringify(records),
    muteHttpExceptions: true
  };

  var resp = UrlFetchApp.fetch(url, options);
  var code = resp.getResponseCode();
  if (code >= 200 && code < 300) {
    SpreadsheetApp.getUi().alert('✅ Sync riuscito: ' + records.length + ' esercizi sincronizzati.');
  } else {
    SpreadsheetApp.getUi().alert('❌ Errore ' + code + '\n\n' + resp.getContentText());
  }
}
