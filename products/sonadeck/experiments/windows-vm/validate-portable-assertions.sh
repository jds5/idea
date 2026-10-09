#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
test_dir="$(mktemp -d)"
trap 'rm -f "$test_dir/probe" "$test_dir/output"; rmdir "$test_dir"' EXIT
ulimit -c 0
swiftc -parse-as-library -swift-version 6 portable-assertions.swift portable-assertions-probe.swift -o "$test_dir/probe"
"$test_dir/probe" positive
for mode in equal not-equal true false nil throws unexpected-error; do
  set +e
  SWIFT_BACKTRACE=disable "$test_dir/probe" "$mode" > "$test_dir/output" 2>&1
  result=$?
  set -e
  if [[ "$result" == 0 ]]; then
    echo "ERROR: negative control $mode was silently accepted"
    exit 1
  fi
  echo "Expected rejection: $mode (exit $result)"
done
echo 'All 7 negative assertion controls were rejected.'
