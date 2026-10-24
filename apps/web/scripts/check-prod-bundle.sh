#!/usr/bin/env bash
# Fails if the production bundle contains dev-only code or secret names (plan 26 review focus).
set -euo pipefail
dist="$(dirname "$0")/../dist"
[ -d "$dist" ] || { echo "no dist/: run the web build first" >&2; exit 2; }
status=0
for needle in SandboxScene __dh SUPABASE_SECRET keydown-F6 keydown-F8 keydown-F9 dh.telemetry; do
  if grep -rqF "$needle" "$dist"; then
    echo "production bundle contains: $needle" >&2
    status=1
  fi
done
[ "$status" = 0 ] && echo "production bundle clean"
exit "$status"
