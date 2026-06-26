#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
# shellcheck source=tools/wordpress/lib.sh
source tools/wordpress/lib.sh
wp_load_env

artifact="${1:-}"
activate_flag="${2:-}"
wp_require_artifact "$artifact"

./tools/wordpress/bootstrap.sh >/dev/null

args=(plugin install "/workspace/$artifact" --force)
if [[ "$activate_flag" == "--activate" ]]; then
  args+=(--activate)
fi

wp_cli "${args[@]}"
echo "Installed plugin artifact: $artifact"
