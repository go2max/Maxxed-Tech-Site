# Plugin Catalog and Hosted Lab Archive

Date: June 26, 2026

## Summary

The public Maxxed Technical Systems catalog was expanded beyond the initial
42 release-track products. The generated 1,000-app inventory and 1,500-item
backlog/module inventory were intentionally skipped for public listing. Repo
backed products that exist as actual repositories were included.

## Public Catalog Scope

Included in the public product catalog:

- 6 Android app products
- 36 WordPress plugin products
- 44 standalone top-level repo products
- 100 materialized powerhouse repo products

Total public catalog entries: 186.

Skipped by design:

- `MAXXED_1000_APP_INVENTORY.json`
- `SOURCE_1500_MODULE_BACKLOG.json`
- Other generated backlog/inventory-only entries that are not materialized repos

## WordPress Plugin Lab

The local WordPress plugin lab artifact contains:

- 36 individual plugin ZIP packages in `local-artifacts/wordpress/plugin-zips/`
- 36 expanded plugin folders in `local-artifacts/wordpress/wp-content/plugins/`

Each individual plugin ZIP was verified to contain a valid plugin root folder
and a main plugin file with a `Plugin Name:` header.

The hosted plugin lab at `plugins.techmaxxed.com` was installed using the
individual plugin ZIP packages through WordPress Admin upload.

Important install distinction:

- Individual ZIPs in `local-artifacts/wordpress/plugin-zips/` are valid for
  `Plugins -> Add New -> Upload Plugin`.
- `maxxed-plugin-lab-wp-content-plugins.zip` is a bulk filesystem extraction
  bundle for Hostinger File Manager or SSH only. WordPress Admin rejects it
  because it contains a `wp-content/plugins` tree rather than a single plugin
  package at the ZIP root.
- `maxxed-plugin-lab-individual-upload-zips.zip` is a convenience wrapper that
  contains the 36 individual uploadable ZIPs. It should be extracted locally;
  the contained ZIPs should then be uploaded one at a time.

## Validation

Local site validation passed after the catalog expansion:

- `npm run build`
- `npm run validate`

Generated catalog checks:

- `/apps/`: 186 product cards
- `/plugins/`: 36 WordPress plugin cards
- Homepage: curated preview with 186-product count and repo-backed product
  library preview

## Remaining Follow-Up

- Confirm hosted activation state for all 36 WordPress plugins in WordPress
  Admin after the next admin review.
- Push the local catalog/checklist/archive changes to GitHub when the push path
  is available.
