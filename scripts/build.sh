#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
find "$project_root/public" -mindepth 1 ! -path "$project_root/public/assets" ! -path "$project_root/public/assets/*" -exec rm -rf {} +
node "$project_root/scripts/build.mjs"
rm -rf "$project_root/public"
cp -R "$project_root/site" "$project_root/public"
