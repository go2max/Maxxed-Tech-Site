#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
# shellcheck source=tools/wordpress/lib.sh
source tools/wordpress/lib.sh
wp_load_env

./tools/wordpress/bootstrap.sh

wp_cli core version
wp_cli option get siteurl
wp_cli plugin list
wp_cli theme list

if command -v curl >/dev/null 2>&1; then
  curl -fsS "$(wp_public_health_url)" >/dev/null
fi

echo "WordPress website smoke test passed."
