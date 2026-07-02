# Plugin Catalog and Hosted Lab Archive

Date: June 26, 2026

## Summary

The public Maxxed Technical Systems catalog was expanded beyond the initial
42 release-track products. The generated 1,000-app inventory and 1,500-item
backlog/module inventory were intentionally skipped for public listing. Products
that exist as actual repositories were included.

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

Hosted lab status captured from the related `plug-ins setup and updates` chat:

- `plugins.techmaxxed.com` WordPress plugin testing lab is live.
- DNS points `plugins.techmaxxed.com` to `89.117.9.243`.
- The hosted WordPress runtime is on PHP 8.3.
- The MU guard is installed at
  `wp-content/mu-plugins/maxxed-plugin-lab-guard.php`.
- Site docs for the plugin lab were merged in `go2max/Maxxed-Tech-Site`
  PR #52 at commit `af285ea6c60f...`.

Hosted WordPress setup details captured from the related `setting up sub
domain` chat:

- Primary WordPress plugin lab URL:
  `https://plugins.techmaxxed.com/wp-admin`.
- The plugin lab should run entirely server-side; it should not depend on
  localhost, tunnels, or Docker Desktop.
- Hostinger DNS record:
  - Type: `A`
  - Host: `plugins`
  - Target: `89.117.9.243`
  - TTL: `300`
- WordPress was installed at the root of `plugins.techmaxxed.com`.
- Recommended install settings:
  - PHP 8.3
  - WordPress 7.0 app version
  - English language
  - New database
  - Admin user `williamuland12`; password stored privately, not in repo.
- Post-install settings:
  - Discourage search engines for the plugin lab.
  - Permalinks should use `Post name`.
- Plugin testing flow:
  `Plugins -> Add New -> Upload Plugin`, then upload each individual plugin
  ZIP separately.

`admin.techmaxxed.com` setup notes from the same subdomain thread:

- In Hostinger hPanel, add the subdomain under
  `Domains -> techmaxxed.com -> DNS records`.
- Use `admin` as the DNS host.
- Use the same target pattern as the working plugin subdomain, either CNAME or
  A record depending on the final hosting target.
- Remove duplicate or conflicting `admin` DNS records before verification.
- Add `admin.techmaxxed.com` in the hosting/app side as a custom domain.
- Complete verification and SSL provisioning.
- DNS propagation can take up to 24 hours.
- A previous 403 check showed DNS resolving but the server returning
  `Forbidden. Calls to this URL via the terminal are not allowed.`
- Likely 403 causes listed in that thread:
  - Custom domain not added on the app or hosting side.
  - Wrong DNS target.
  - WAF or security rule.
  - Folder permission, missing index file, or wrong document root.

Current public-site decision:

- The public `techmaxxed.com` site should not link to the admin portal.
- The public `site/` export should not include `site/admin/`.
- The separate `admin/` export/subsite is still generated and preserved.

The local WordPress plugin lab artifact contains:

- 36 individual plugin ZIP packages in `local-artifacts/wordpress/plugin-zips/`
- 36 expanded plugin folders in `local-artifacts/wordpress/wp-content/plugins/`

Each individual plugin ZIP was verified to contain a valid plugin root folder
and a main plugin file with a `Plugin Name:` header.

The hosted plugin lab at `plugins.techmaxxed.com` was installed using the
individual plugin ZIP packages through WordPress Admin upload.

## Plugin Setup and Update Work

`go2max/Post-Purge-Pro` PR #1 merged on June 25, 2026 at merge commit
`45ee1c4...`. That plugin includes the admin cleanup UI, filters, preview,
CSV backup/export, and review-first batch move-to-Trash workflow.

The related chat also completed local profile/settings updates across all 36
WordPress plugin repositories:

- First pass added editable admin `Test profile` settings to five plugins:
  - Broken Shortcode Finder
  - Duplicate Media Finder
  - Image Alt Text Audit
  - Post Purge Pro
  - Stale Content Detector
- Local commits recorded for those five plugin repos:
  - `6426cc6`
  - `916b9c7`
  - `aa49a60`
  - `7195305`
  - `c9fe080`
- Second pass audited all 36 local WordPress plugin repos and added the same
  dedicated Settings profile class to the remaining 31.
- All 36 plugin ZIPs were rebuilt locally after the profile/settings work.
- All 36 plugin ZIPs now include profile/settings text.
- Pushes were blocked from that environment because the individual plugin repos
  had no `origin` remotes configured.

Current site integration:

- Public `/plugins/` now links each of the 36 WordPress tools to a detail page.
- Each plugin has a generated public detail page under `/plugins/{slug}/`.
- Each plugin has a generated public README under `/plugins/{slug}/readme/`.
- Plugin support routes through `support@techmaxxed.com`.
- The public sitemap includes all 36 plugin detail pages and all 36 plugin
  README pages.

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
- `/plugins/{slug}/`: 36 generated plugin detail pages
- `/plugins/{slug}/readme/`: 36 generated plugin README pages
- Homepage: curated preview with 186-product count and repository-backed product
  library preview

## Remaining Follow-Up

- Confirm hosted activation state for all 36 WordPress plugins in WordPress
  Admin after the next admin review.
- Push the local catalog/checklist/archive changes to GitHub when the push path
  is available.
