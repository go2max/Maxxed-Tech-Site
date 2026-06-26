#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.wordpress.yml}"
ENV_FILE="${ENV_FILE:-.env.wordpress}"

./tools/wordpress/bootstrap.sh

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm wpcli core version
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm wpcli option get siteurl
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm wpcli plugin list
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm wpcli theme list

echo "WordPress website smoke test passed."
