# SEO and Visual Review

Date: June 25, 2026

## Goals

- Make the site read less like an internal tracker and more like a focused product storefront.
- Improve search clarity without overstating release status.
- Add a better branded visual direction without relying on external stock imagery.
- Keep privacy, measurement, fishing, navigation, and visual-estimation claims conservative.

## SEO updates applied

- Tightened the top-level site description to include core product search terms: Android apps, TV control, navigation, camera measurement, outdoor records, visual estimating, and local party games.
- Updated product summaries to include clearer user-facing keywords while preserving release-stage accuracy.
- Added `llms.txt` in both `public/` and `site/` so AI/search systems can understand product scope, canonical pages, and wording guardrails.

## Visual updates applied

- Added `product-suite-hero.svg`, a branded product-suite hero artwork replacing the stale screenshot-only hero treatment through CSS.
- Added `final-polish.css` for final visual tightening without risking generator rewrites.
- Mirrored visual files into committed `site/` output for static-deploy safety.

## Wording guardrails preserved

- Release-prep and internal-test products are not called publicly released.
- Camera measurement is described as estimated and reference-calibrated, not exact or survey-grade.
- Gold estimating remains visual and conservative, not an assay, appraisal, valuation, or chemistry result.
- Fishing records do not claim to authorize legal harvest.
- Local-first privacy language remains tied to explicit user exports/sharing.

## Remaining ideal local cleanup

A local repo pass should still move the bridged CSS and navigation behavior into `scripts/build.mjs` directly:

- Link `ux-overhaul.css` and `final-polish.css` directly in generated HTML.
- Render Product Lineup directly in the generator nav and footer.
- Add portfolio URLs directly to generated sitemap paths.
- Rebuild committed `site/` output from source after the generator changes.
