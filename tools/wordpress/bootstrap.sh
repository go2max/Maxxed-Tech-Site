#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
# shellcheck source=tools/wordpress/lib.sh
source tools/wordpress/lib.sh
wp_load_env

wp_compose up -d db wordpress phpmyadmin

echo "Waiting for WordPress to become reachable..."
installed=0
for _ in {1..60}; do
  if wp_cli core is-installed >/dev/null 2>&1; then
    installed=1
    break
  fi
  if wp_cli core version >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [[ "$installed" != "1" ]]; then
  wp_cli core install \
    --url="$(wp_url)" \
    --title="${WP_SITE_TITLE:-Maxxed Apps WordPress Test}" \
    --admin_user="${WP_ADMIN_USER:-admin}" \
    --admin_password="${WP_ADMIN_PASSWORD:-adminpass123}" \
    --admin_email="${WP_ADMIN_EMAIL:-admin@example.test}" \
    --skip-email
fi

echo "WordPress: $(wp_url)"
echo "Admin: $(wp_admin_url)"
echo "Login: ${WP_ADMIN_USER:-admin} / ${WP_ADMIN_PASSWORD:-adminpass123}"
echo "phpMyAdmin: http://localhost:${WP_PMA_PORT:-8081}"
