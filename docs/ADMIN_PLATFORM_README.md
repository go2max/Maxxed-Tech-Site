# Admin Platform README

The Maxxed Admin Platform v1 is the private operating console for Maxxed Technical Systems. It is intentionally separate from the public `techmaxxed.com` static site and is designed for `admin.techmaxxed.com` behind Cloudflare Access or an equivalent identity-aware proxy.

## Modules

- Overview
- Products
- Product Detail
- Add Product
- Archived Products
- Beta Applications
- Tester Enrollments
- Releases
- Release Detail
- Support Cases
- Known Issues
- Monitoring
- Readiness
- Integrations
- Audit Log
- Access Directory
- Settings

## Source of truth

The first seed pass reads repo-owned product data from `content/site-data.mjs` and the roadmap. The current seeded product set is:

- Maxxed Remote
- Maxxed Compass
- Maxxed Measure
- Maxxed Gold Estimator
- Fishing Maxxed
- Rival Rush
- WordPress Bulk Content Cleanup

Missing live integration fields are stored as `null` and marked `not_configured`, `unavailable`, `insufficient_data`, or `not_run`. They must not be displayed as zero.
