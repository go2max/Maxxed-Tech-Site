#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
# shellcheck source=tools/wordpress/lib.sh
source tools/wordpress/lib.sh
wp_load_env

echo "== WordPress local status =="
wp_compose ps

echo ""
echo "== WordPress core =="
if wp_cli core is-installed >/dev/null 2>&1; then
  wp_cli core version
  wp_cli option get siteurl
else
  echo "WordPress is not installed yet. Run npm run wordpress:bootstrap"
fi

echo ""
echo "== Plugins =="
wp_cli plugin list || true

echo ""
echo "== Themes =="
wp_cli theme list || true

echo ""
echo "WordPress: $(wp_url)"
echo "Admin: $(wp_admin_url)"
