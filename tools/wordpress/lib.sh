#!/usr/bin/env bash
set -euo pipefail

WP_COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.wordpress.yml}"
WP_ENV_FILE="${ENV_FILE:-.env.wordpress}"

wp_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

wp_cd_root() {
  cd "$(wp_repo_root)"
}

wp_ensure_env() {
  if [[ ! -f "$WP_ENV_FILE" ]]; then
    cp .env.wordpress.example "$WP_ENV_FILE"
  fi

  mkdir -p \
    local-artifacts/wordpress \
    wordpress/mu-plugins \
    wordpress/plugins \
    wordpress/reports \
    wordpress/themes \
    wordpress/uploads
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

wp_public_health_url() {
  echo "$(wp_url)/wp-json/maxxed/v1/health"
}

wp_require_artifact() {
  local artifact="$1"
  if [[ -z "$artifact" ]]; then
    echo "Artifact path is required." >&2
    return 2
  fi
  if [[ ! -f "$artifact" ]]; then
    echo "Artifact not found: $artifact" >&2
    return 2
  fi
}
