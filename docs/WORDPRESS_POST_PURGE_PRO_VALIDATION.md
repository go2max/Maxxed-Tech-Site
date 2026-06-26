# Post Purge Pro WordPress Validation

Post Purge Pro is the first plugin artifact for proving the WordPress product harness.

## Artifact

Expected local artifact path:

```text
local-artifacts/wordpress/post-purge-pro.zip
```

The committed product manifest already points at this path through `wordpress/products.example.json`.

## Plugin-side validation

Run these from the Post Purge Pro repo before copying the ZIP into this site repo:

```bash
find . -name '*.php' -not -path './dist/*' -print0 | xargs -0 -n1 php -l
php tests/test-rules.php
php tests/test-export.php
bash scripts/package.sh
unzip -t dist/post-purge-pro.zip
```

## Website harness validation

Run these from this repo after copying the ZIP:

```bash
mkdir -p local-artifacts/wordpress
cp /path/to/Post-Purge-Pro/dist/post-purge-pro.zip local-artifacts/wordpress/post-purge-pro.zip
npm run wordpress:manifest -- wordpress/products.example.json
npm run wordpress:smoke
npm run wordpress:report
```

## Acceptance checks

- Plugin installs from ZIP.
- Plugin activates cleanly.
- WordPress admin remains usable.
- Public site remains usable.
- `http://localhost:8080/wp-json/maxxed/v1/health` responds.
- Tools > Post Purge Pro loads for an administrator.
- Preview does not mutate posts.
- CSV backup downloads before cleanup.
- CSV export hardens formula-looking title, excerpt, and content cells.
- Cleanup requires typed `PURGE` and moves posts to Trash only.

## Current workspace note

The first product polish pass rebuilt the ZIP and verified archive integrity. PHP and Docker were unavailable in that workspace, so the PHP tests and Docker WordPress harness remain the final machine-level validation step.
