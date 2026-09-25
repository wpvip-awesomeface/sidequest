#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist/icon-work dist/Sidequest.iconset assets
swift native/make-icon.swift "$PWD/dist/icon-work"
for size in 16 32 128 256 512; do
  cp "dist/icon-work/icon-$size.png" "dist/Sidequest.iconset/icon_${size}x${size}.png"
  double=$((size * 2))
  cp "dist/icon-work/icon-$double.png" "dist/Sidequest.iconset/icon_${size}x${size}@2x.png"
done
iconutil -c icns dist/Sidequest.iconset -o assets/Sidequest.icns
cp dist/icon-work/icon-512.png assets/Sidequest.png
cp dist/icon-work/icon-32.png public/favicon.png
