#!/usr/bin/env bash
set -euo pipefail

WP_COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.wordpress.yml}"
WP_ENV_FILE="${ENV_FILE:-.env.wordpress}"

wp_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

wp_ensure_env() {
  if [[ ! -f "$WP_ENV_FILE" ]]; then
    cp .env.wordpress.example "$WP_ENV_FILE"
  fi
  mkdir -p wordpress/plugins wordpress/themes wordpress/uploads wordpress/mu-plugins wordpress/reports local-artifacts/wordpress
}

wp_load_env() {
  wp_ensure_env
  set -a
  # shellcheck disable=SC1090
  source "$WP_ENV_FILE"
  set +a
}

wp_compose() {
  docker compose -f "$WP_COMPOSE_FILE" --env-file "$WP_ENV_FILE" "$@"
}

wp_cli() {
  wp_compose run --rm wpcli "$@"
}

wp_url() {
  echo "${WP_SITE_URL:-http://localhost:8080}"
}

wp_admin_url() {
  echo "$(wp_url)/wp-admin"
}
