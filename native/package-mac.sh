#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash native/build.sh
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/sidequest-share.XXXXXX")"
trap 'rm -rf "$STAGE"; rm -f "$STAGE.dmg"' EXIT
ditto dist/Sidequest.app "$STAGE/Sidequest.app"
cp native/distribution/START-HERE.html "$STAGE/Start Here.html"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "Sidequest" -srcfolder "$STAGE" -ov -format UDZO "$STAGE.dmg"
mv -f "$STAGE.dmg" dist/Sidequest-Apple-Silicon.dmg
shasum -a 256 dist/Sidequest-Apple-Silicon.dmg > dist/Sidequest-Apple-Silicon.dmg.sha256
