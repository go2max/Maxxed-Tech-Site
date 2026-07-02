# Hosted WordPress Plugin Install

Target site: `plugins.techmaxxed.com`

This runbook installs the 36 Maxxed WordPress plugin lab packages onto the hosted WordPress subsite.

For WordPress Admin -> Plugins -> Add New -> Upload Plugin, use the individual ZIP files in:

`local-artifacts/wordpress/plugin-zips/`

Do not upload `maxxed-plugin-lab-wp-content-plugins.zip` through the WordPress plugin uploader. That file is a filesystem extraction bundle for Hostinger File Manager or SSH only. WordPress will reject it with "No valid plugins were found" because it contains many plugin folders instead of one plugin at the package root.

## Expected Count

- Plugin ZIP packages: 36
- Installed plugin folders: 36
- Main plugin files: 36

## WordPress Admin Upload Path

Use this when installing from `Plugins -> Add New -> Upload Plugin`.

1. Open WordPress Admin for `plugins.techmaxxed.com`.
2. Go to `Plugins -> Add New -> Upload Plugin`.
3. Upload one ZIP from `local-artifacts/wordpress/plugin-zips/`.
4. Click `Install Now`.
5. Click `Activate` if you want it active immediately, or return to the plugin installer.
6. Repeat for all 36 individual ZIP files listed below.

Each individual ZIP has a valid plugin folder and main plugin file at the package root, for example:

`post-purge-pro.zip -> post-purge-pro/post-purge-pro.php`

## Hostinger File Manager Bulk Path

1. Open Hostinger File Manager for the WordPress install behind `plugins.techmaxxed.com`.
2. Go to that site's WordPress root. It should contain `wp-admin`, `wp-content`, and `wp-includes`.
3. Upload `local-artifacts/wordpress/maxxed-plugin-lab-wp-content-plugins.zip`.
4. Extract the zip from the WordPress root.
5. Confirm the extracted folders land under `wp-content/plugins/`.
6. In WordPress Admin, open `Plugins`.
7. Confirm all 36 Maxxed plugins appear.
8. Activate them if the lab site is intended to run the full plugin set at once.

## SSH Bulk Path

Upload the bundle to the hosted WordPress root, then run:

```bash
unzip -o maxxed-plugin-lab-wp-content-plugins.zip
find wp-content/plugins -maxdepth 2 -name '*.php' | wc -l
```

If WP-CLI is available:

```bash
wp plugin list --path="$PWD" --fields=name,status,version
```

To activate the full lab set:

```bash
wp plugin activate accessibility-task-tracker affiliate-disclosure-manager broken-shortcode-finder bulk-price-update-planner client-content-approval client-maintenance-portal contractor-before-after-gallery database-cleanup-planner duplicate-media-finder form-delivery-checker fraud-review-checklist image-alt-text-audit legal-page-update-reminder local-business-schema-manager low-stock-digest nap-consistency-checker order-export-builder orphan-page-finder plugin-license-inventory post-purge-pro product-compliance-expiration product-data-cleanup product-image-audit redirect-manager-pro returns-request-portal scheduled-content-expiration security-header-audit service-area-page-builder shipping-rule-auditor stale-content-detector stale-inventory-reporter supplier-tracker-for-woocommerce uptime-digest-plugin website-maintenance-reporter woocommerce-margin-calculator wordpress-role-auditor --path="$PWD"
```

Then verify:

```bash
wp plugin list --path="$PWD" --fields=name,status | grep -E 'accessibility-task-tracker|wordpress-role-auditor|post-purge-pro'
wp plugin list --path="$PWD" --status=active --format=count
```

## Plugin Folders

- `accessibility-task-tracker`
- `affiliate-disclosure-manager`
- `broken-shortcode-finder`
- `bulk-price-update-planner`
- `client-content-approval`
- `client-maintenance-portal`
- `contractor-before-after-gallery`
- `database-cleanup-planner`
- `duplicate-media-finder`
- `form-delivery-checker`
- `fraud-review-checklist`
- `image-alt-text-audit`
- `legal-page-update-reminder`
- `local-business-schema-manager`
- `low-stock-digest`
- `nap-consistency-checker`
- `order-export-builder`
- `orphan-page-finder`
- `plugin-license-inventory`
- `post-purge-pro`
- `product-compliance-expiration`
- `product-data-cleanup`
- `product-image-audit`
- `redirect-manager-pro`
- `returns-request-portal`
- `scheduled-content-expiration`
- `security-header-audit`
- `service-area-page-builder`
- `shipping-rule-auditor`
- `stale-content-detector`
- `stale-inventory-reporter`
- `supplier-tracker-for-woocommerce`
- `uptime-digest-plugin`
- `website-maintenance-reporter`
- `woocommerce-margin-calculator`
- `wordpress-role-auditor`
