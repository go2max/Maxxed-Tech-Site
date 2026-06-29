# Web Launch QA Pro Readiness

## Current state

Status: production-ready repository slice pending PR review and live deployment.

Web Launch QA Pro is now a public, dependency-free static utility with a weighted launch checklist, local autosave, JSON import/export, Markdown export, print support, example data, support routing, and validation coverage.

## Done

- Public route: `/tools/web-launch-qa-pro/`
- SEO-safe title, description, canonical, and index robots metadata
- 100-point checklist grouped by SEO/crawlability, content/conversion, trust/legal/accessibility, and launch operations
- Live readiness score and verdict
- Priority blockers sorted by score impact
- Copy report action
- Download Markdown report action
- Export JSON action
- Import JSON action
- Browser-local autosave using `localStorage`
- Print-friendly report styling
- Example review loader
- Fixture report
- Dedicated validation script
- Included in the main `npm run check` path
- Separate package script: `npm run web-launch-qa:check`

## Manual QA before merge

- Run `npm run check`.
- Open `/tools/web-launch-qa-pro/` after `npm run build`.
- Tap through the checklist on mobile width.
- Confirm autosave restores after refresh.
- Confirm Copy report works in the target browser.
- Confirm Download Markdown creates `web-launch-qa-report.md`.
- Confirm Export JSON creates `web-launch-qa-audit.json`.
- Confirm Import JSON restores a saved audit.
- Confirm Print opens a readable report layout.
- Confirm reset clears selected checks and saved state.

## Known limitation

The static page is copied into the generated build through the existing `public/` copy step. It is reachable at the production route after build. A future cleanup can add first-class sitemap registration in `scripts/build.mjs` if we want the route emitted in generated `sitemap.xml` rather than relying on direct public route deployment and canonical metadata.

## Stop point

Stop here for the first production PR. Continue only if you want multi-template launch profiles, saved audit lists, PDF export, or integration with the admin dashboard before merge.
