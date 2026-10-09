#!/usr/bin/env bash
# Run from app/SonaDeckPrototype after build-app.sh; not an XCTest runner.
set -euo pipefail
[[ "$(uname -s)" == Darwin ]] || { echo 'Requires macOS'; exit 1; }
[[ $# == 1 && -f "$1" ]] || { echo 'Pass the generated portable-checks.swift path'; exit 1; }
bin_dir="$(swift build -c debug --show-bin-path)"
sdk="$(xcrun --sdk macosx --show-sdk-path)"
developer="$(xcode-select -p)"
objects=("$bin_dir/ProfileDomain.build/"*.o "$bin_dir/PrototypeModel.build/"*.o)
for object in "${objects[@]}"; do test -f "$object"; done
swiftc -parse-as-library -swift-version 6 -g -enable-testing -D SWIFT_PACKAGE -D DEBUG \
  -target "$(uname -m)-apple-macosx15.0" -sdk "$sdk" \
  -I "$bin_dir/Modules" -F "$developer/Library/Developer/Frameworks" \
  -module-cache-path "$bin_dir/ModuleCache" "$1" "${objects[@]}" \
  -o "$bin_dir/portable-checks"
"$bin_dir/portable-checks"
