# WordPress Next Artifact Queue

Use this after Post Purge Pro passes the harness.

## Candidate order

1. Post Purge Pro final validation
2. WordPress Role Auditor
3. Broken Shortcode Finder
4. Stale Content Detector
5. Redirect Manager Pro
6. Uptime Digest Plugin

## Artifact contract

Each product should provide:

- Main plugin file with a valid WordPress plugin header.
- `readme.txt`.
- `scripts/package.sh`.
- Standalone PHP fixture tests for isolated business logic.
- `release/READINESS.json`.
- `release/VALIDATION_REPORT.md`.
- ZIP artifact copied to `local-artifacts/wordpress/<product-id>.zip`.
- Manifest entry in `wordpress/products.example.json` or a local manifest override.

## Harness flow

```bash
npm run wordpress:manifest -- wordpress/products.example.json
npm run wordpress:smoke
npm run wordpress:report
```

## Quality floor

- Installs from ZIP.
- Activates cleanly.
- Public site remains usable.
- WordPress admin remains usable.
- Product admin screen loads for an administrator.
- Destructive actions require preview, confirmation, and recovery where relevant.
- User-controlled spreadsheet exports harden formula-looking cells.
