# Public Site Readiness Handoff

This document tracks the redesigned Maxxed Technical Systems public site after the July 2026 public-site batching work.

## Current public structure

The public site is now organized around visitor intent instead of one large mixed catalog:

- Home: public positioning, featured apps, direct ordering, founder attribution, and product/service routing.
- Apps: app-only catalog grouped by product lane.
- Plugins: WordPress plugins grouped by workflow lane.
- Tools: focused software/tool concepts that can become scoped builds.
- Custom Orders: direct path for custom apps, plugins, automations, dashboards, MVPs, landing pages, and cleanup work.
- Beta Testing: tester request path, including pre-release/development app requests.
- Support: routing hub for app issues, beta access, plugin help, pricing questions, and custom-work routing.
- Pricing and Checkout: product/package checkout with custom-work diversion before checkout.
- About: Maxxed Technical Systems positioned as a builder-led software studio by Max Uland.

## Merged redesign batches

- #106: Homepage presence and direct-order path.
- #107: Sectioned Apps, Plugins, and Tools catalogs.
- #108: Product detail conversion panels.
- #109: Custom Orders and About positioning.
- #110: Support routing and mobile polish.
- #111: Validation updated for redesigned architecture.
- #112: Standalone public redesign build-chain validator.
- #113: Pricing and Checkout conversion-flow polish.
- #114: Visual consistency polish.
- #115: Build-chain validator updated for the latest polish passes.

## Build-chain notes

The public build currently runs the base generator, then a set of post-build public-site passes:

1. `scripts/build.mjs`
2. `scripts/apply-homepage-presence-redesign.mjs`
3. `scripts/apply-sectioned-catalog-redesign.mjs`
4. `scripts/apply-product-page-conversion-redesign.mjs`
5. `scripts/apply-order-about-polish.mjs`
6. `scripts/apply-support-mobile-polish.mjs`
7. `scripts/apply-conversion-flow-polish.mjs`
8. `scripts/apply-visual-consistency-polish.mjs`
9. Copy generated `site/` output into `public/`

This is acceptable for short-term batching, but it should not stay this layered forever. Once the redesigned direction is accepted, consolidate the durable pieces into the main generator or shared rendering helpers.

## Validation commands

Run these before deploying or after any future public-site edit:

```bash
npm run check:public
node scripts/validate-public-redesign-chain.mjs
```

Run the broader repo check when touching admin/platform/build-runner code:

```bash
npm run check
```

## Manual review checklist

When a PC is available, review the generated public pages in a browser:

- Home loads and routes to Apps, Plugins, Tools, Custom Orders, Beta, Pricing, Checkout, Support, and About.
- Header and footer do not expose admin routes.
- Footer attribution is subtle: `Developed by Max Uland under Maxxed Technical Systems.`
- Apps page shows the six Android apps only.
- Plugins page shows the 36 WordPress plugins only.
- Tools page shows focused software/tool concepts.
- Custom Orders clearly explains what can be ordered and how to submit a useful request.
- Support page routes app issues, plugin help, beta requests, custom work, and pricing questions cleanly.
- Pricing page separates checkout, custom work, beta/testing, and support paths.
- Checkout page warns that custom software should start through Custom Orders first.
- Beta page makes it clear that development/pre-release app testing can be requested.
- Product pages include conversion panels for beta, support, pricing, and related custom work.
- Mobile widths around 390px, 430px, 768px, and desktop widths around 1280px and 1440px look clean.

## Known follow-up

The main technical debt is consolidation. The redesign was intentionally layered as post-build passes to move quickly and avoid destabilizing the generator. The next maintenance task should reduce duplicated helper functions and move stable rendering into the primary generator once the visual direction is approved.

Recommended next batch:

- Consolidate shared helper functions used across redesign passes.
- Add `validate-public-redesign-chain.mjs` into the normal `validate` script if the package update is allowed.
- Replace repeated meta-rewrite helpers with a shared utility.
- Move stable page templates into `scripts/build.mjs` or a public rendering module.
- Keep generated public output separate from admin output.

## Do not touch

Spray Foam Front remains read-only/quarantined. Do not edit, patch, merge, reformat, or clean it as part of public-site work.
