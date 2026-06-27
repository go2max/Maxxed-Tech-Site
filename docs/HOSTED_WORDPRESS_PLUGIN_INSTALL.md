# Hosted WordPress Plugin Install

Target site: `plugins.techmaxxed.com`

This runbook installs the 36 Maxxed WordPress plugin lab packages onto the hosted WordPress subsite. The source bundle is:

`local-artifacts/wordpress/maxxed-plugin-lab-wp-content-plugins.zip`

That bundle contains:

`local-artifacts/wordpress/wp-content/plugins/<plugin-folder>/...`

## Expected Count

- Plugin ZIP packages: 36
- Installed plugin folders: 36
- Main plugin files: 36

## Hostinger File Manager Path

1. Open Hostinger File Manager for the WordPress install behind `plugins.techmaxxed.com`.
2. Go to that site's WordPress root. It should contain `wp-admin`, `wp-content`, and `wp-includes`.
3. Upload `local-artifacts/wordpress/maxxed-plugin-lab-wp-content-plugins.zip`.
4. Extract the zip from the WordPress root.
5. Confirm the extracted folders land under `wp-content/plugins/`.
6. In WordPress Admin, open `Plugins`.
7. Confirm all 36 Maxxed plugins appear.
8. Activate them if the lab site is intended to run the full plugin set at once.

## SSH Path

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
