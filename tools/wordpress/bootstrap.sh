#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.wordpress.yml}"
ENV_FILE="${ENV_FILE:-.env.wordpress}"

if [[ ! -f "$ENV_FILE" ]]; then
  cp .env.wordpress.example "$ENV_FILE"
fi

mkdir -p wordpress/plugins wordpress/themes wordpress/uploads

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d db wordpress phpmyadmin

echo "Waiting for WordPress to become reachable..."
installed=0
for _ in {1..60}; do
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm wpcli core is-installed >/dev/null 2>&1; then
    installed=1
    break
  fi
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm wpcli core version >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [[ "$installed" != "1" ]]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm wpcli core install \
    --url="${WP_SITE_URL:-http://localhost:8080}" \
    --title="${WP_SITE_TITLE:-Maxxed Apps WordPress Test}" \
    --admin_user="${WP_ADMIN_USER:-admin}" \
    --admin_password="${WP_ADMIN_PASSWORD:-adminpass123}" \
    --admin_email="${WP_ADMIN_EMAIL:-admin@example.test}" \
    --skip-email
fi

echo "WordPress: ${WP_SITE_URL:-http://localhost:8080}"
echo "Admin: ${WP_SITE_URL:-http://localhost:8080}/wp-admin"
echo "Login: ${WP_ADMIN_USER:-admin} / ${WP_ADMIN_PASSWORD:-adminpass123}"
echo "phpMyAdmin: http://localhost:${WP_PMA_PORT:-8081}"
