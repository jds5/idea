#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(uname -s)" != Darwin ]]; then
  echo 'Native app packaging requires macOS.' >&2
  exit 1
fi
swift build -c debug -j 4
bin_dir="$(swift build -c debug --show-bin-path)"
app="$PWD/.build/SonaDeckPrototype.app"
mkdir -p "$app/Contents/MacOS"
cp "$bin_dir/SonaDeckPrototype" "$app/Contents/MacOS/SonaDeckPrototype"
cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>SonaDeckPrototype</string>
<key>CFBundleIdentifier</key><string>local.sonadeck.prototype</string>
<key>CFBundleName</key><string>SonaDeck Prototype</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>LSMinimumSystemVersion</key><string>15.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>
PLIST
codesign --force --sign - "$app"
codesign --verify --deep --strict "$app"
printf 'Local ad-hoc signed test app: %s\n' "$app"
