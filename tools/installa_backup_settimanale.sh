#!/bin/bash
# Fondamenta 020 — attiva la copia di sicurezza automatica dei dati, ogni domenica alle 21:00.
# Scrive un solo file: ~/Library/LaunchAgents/com.zonatracker.backup.plist
# Se a quell'ora il Mac dorme, la copia parte al primo risveglio.
# Esito di ogni giro in ~/zt-backup/backup.log · Per spegnerla: bash tools/installa_backup_settimanale.sh --togli
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.zonatracker.backup.plist"
if [ "$1" = "--togli" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "copia automatica spenta"
  exit 0
fi
mkdir -p "$HOME/zt-backup" "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.zonatracker.backup</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/python3</string>
    <string>$REPO/tools/backup_dati.py</string>
  </array>
  <key>StartCalendarInterval</key><dict>
    <key>Weekday</key><integer>0</integer>
    <key>Hour</key><integer>21</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>$HOME/zt-backup/backup.log</string>
  <key>StandardErrorPath</key><string>$HOME/zt-backup/backup.log</string>
</dict></plist>
PLIST
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "copia automatica attiva: ogni domenica alle 21:00 → ~/zt-backup/dati/"
