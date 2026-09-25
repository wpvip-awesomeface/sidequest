#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(node -p 'process.platform + "-" + process.arch')" != "darwin-arm64" ]; then
  echo "Build on an Apple Silicon Mac with native arm64 Node.js (not Rosetta)." >&2
  exit 1
fi
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)' || { echo "Node.js 22+ is required." >&2; exit 1; }
xcrun --find swiftc >/dev/null
APP="$PWD/dist/Sidequest.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/app/public"
cp LICENSE "$APP/Contents/Resources/LICENSE-sidequest.txt"
bash native/build-icon.sh
cp assets/Sidequest.icns "$APP/Contents/Resources/Sidequest.icns"
swiftc -target arm64-apple-macos14.0 native/Sidequest.swift native/Calendars.swift -o "$APP/Contents/MacOS/Sidequest.next" -framework Cocoa -framework WebKit -framework EventKit -O
mv -f "$APP/Contents/MacOS/Sidequest.next" "$APP/Contents/MacOS/Sidequest"
cp google-calendar.mjs credentials.mjs server.mjs engine.mjs providers.mjs settings.mjs campaign.mjs squad.mjs lore.mjs calendar.mjs "$APP/Contents/Resources/app/"
cp public/google-calendar-ui.js public/boot.js public/index.html public/app.js public/linear-link.js public/calendar-ui.js public/art.js public/character.js public/setup.js public/connection.js public/favicon.png public/world-data.js public/scenes.js public/journey.js public/character-depth.js public/lore-ui.js public/atlas.js public/squad-data.js public/squad-ui.js public/squad-art.js public/pet-art.js public/style.css "$APP/Contents/Resources/app/public/"
# Ship the existing standalone runtime and its redistribution notices.
NODE_BINARY="$(node -p 'process.execPath')"
NODE_ROOT="$(dirname "$(dirname "$NODE_BINARY")")"
test -f "$NODE_ROOT/LICENSE" || { echo "Node license missing; cannot package runtime."; exit 1; }
mkdir -p "$APP/Contents/Resources/runtime"
cp "$NODE_BINARY" "$APP/Contents/Resources/runtime/node.next"
cp "$NODE_ROOT/LICENSE" "$APP/Contents/Resources/runtime/LICENSE-node.txt"
chmod 755 "$APP/Contents/Resources/runtime/node.next"
rm -f "$APP/Contents/Resources/node-path"
codesign --force --sign - "$APP/Contents/Resources/runtime/node.next"
mv -f "$APP/Contents/Resources/runtime/node.next" "$APP/Contents/Resources/runtime/node"
swiftc -target arm64-apple-macos14.0 native/ConnectionKeys.swift -framework Security -O -o "$APP/Contents/Resources/runtime/connection-keys.next"
codesign --force --sign - "$APP/Contents/Resources/runtime/connection-keys.next"
mv -f "$APP/Contents/Resources/runtime/connection-keys.next" "$APP/Contents/Resources/runtime/connection-keys"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Sidequest</string>
<key>CFBundleIdentifier</key><string>local.sidequest.app</string>
<key>CFBundleName</key><string>Sidequest</string>
<key>CFBundleDisplayName</key><string>Sidequest</string>
<key>CFBundleIconFile</key><string>Sidequest</string>
<key>CFBundleVersion</key><string>2</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>NSCalendarsFullAccessUsageDescription</key><string>Show events from the calendars you choose in your Sidequest agenda. Sidequest only reads events; it never edits your calendars.</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
codesign --force --deep --sign - "$APP"
echo "Built $APP"
