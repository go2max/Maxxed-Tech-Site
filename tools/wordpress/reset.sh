#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.wordpress.yml}"
ENV_FILE="${ENV_FILE:-.env.wordpress}"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans

echo "Local WordPress website test environment reset complete."
