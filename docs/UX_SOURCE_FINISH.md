# UX Source Finish

Date: June 25, 2026

## Purpose

This pass finishes the visible UX gaps left after the global style overhaul was merged.

## What changed

- The shared site script now adds the Product Lineup link to generated navigation when the static generator does not include it directly.
- The same script adds Product Lineup to the Products footer column.
- The Product Lineup link is marked active on `/portfolio/` pages.
- Changes are mirrored in both `public/assets/site.js` and `site/assets/site.js` so source-copy builds and committed static deploys behave consistently.

## Why this bridge exists

The current static generator is a large single-file renderer. Patching every generated source fragment through the connector is higher risk than using the existing shared asset layer for a small navigation bridge. This preserves the current live-site behavior without changing product claims, routes, forms, privacy pages, or build behavior.

## Future cleanup

When doing a local repo pass, move this bridge into `scripts/build.mjs` directly:

- Add `Product Lineup` to the `header()` nav array.
- Add `Product Lineup` to the footer Products list.
- Add `portfolio/` and `portfolio/request.html` to the generated `indexedPaths` sitemap list.
- Link `ux-overhaul.css` directly from `layout()` instead of loading it via `site.js`.
