#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
# shellcheck source=tools/wordpress/lib.sh
source tools/wordpress/lib.sh
wp_load_env

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
report="wordpress/reports/local-health-$stamp.md"

core_version="not installed"
siteurl="not installed"
plugins="not available"
themes="not available"
health="not checked"

if wp_cli core is-installed >/dev/null 2>&1; then
  core_version="$(wp_cli core version)"
  siteurl="$(wp_cli option get siteurl)"
  plugins="$(wp_cli plugin list --format=csv || true)"
  themes="$(wp_cli theme list --format=csv || true)"
  if command -v curl >/dev/null 2>&1; then
    health="$(curl -fsS "$(wp_public_health_url)" || true)"
  fi
fi

cat > "$report" <<REPORT
# WordPress Local Health Report

Generated: $stamp

## Core

- WordPress version: $core_version
- Site URL: $siteurl
- Admin URL: $(wp_admin_url)
- Health URL: $(wp_public_health_url)

## Health

\`\`\`json
$health
\`\`\`

## Plugins

\`\`\`csv
$plugins
\`\`\`

## Themes

\`\`\`csv
$themes
\`\`\`
REPORT

echo "$report"
