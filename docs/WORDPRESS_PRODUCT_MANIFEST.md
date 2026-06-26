# WordPress Product Manifest

The WordPress product manifest describes plugin and theme artifacts that should be tested in the local website harness.

Default example:

```text
wordpress/products.example.json
```

Local override location:

```text
local-artifacts/wordpress/products.local.json
```

## Fields

- `id`: stable product identifier
- `name`: human-readable product name
- `type`: `plugin` or `theme`
- `source`: local ZIP path
- `activate`: whether the artifact should be activated after install
- `acceptance`: checklist for manual or automated validation

## Standard flow

1. Stage ZIP artifacts under `local-artifacts/wordpress/`.
2. Copy `wordpress/products.example.json` to `local-artifacts/wordpress/products.local.json`.
3. Update paths and activation settings.
4. Run the matching install helper for each artifact.
5. Run the WordPress smoke test.
6. Export a report.

## Commands

```bash
npm run wordpress:smoke
npm run wordpress:report
```
