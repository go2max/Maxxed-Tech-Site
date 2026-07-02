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
- #116: Public-site readiness handoff.
- #117: Shared public-redesign helper utilities.
- #118: Visual consistency pass migrated to shared helpers.
- #119: Conversion-flow pass migrated to shared helpers.

## Build-chain notes

The public build is now consolidated behind one npm build entrypoint:

1. `npm run build`
2. `scripts/build-public-site.mjs`
3. `scripts/build.mjs`
4. `scripts/apply-public-redesign.mjs`
5. Ordered public redesign passes:
   - `scripts/apply-homepage-presence-redesign.mjs`
   - `scripts/apply-sectioned-catalog-redesign.mjs`
   - `scripts/apply-product-page-conversion-redesign.mjs`
   - `scripts/apply-order-about-polish.mjs`
   - `scripts/apply-support-mobile-polish.mjs`
   - `scripts/apply-conversion-flow-polish.mjs`
   - `scripts/apply-visual-consistency-polish.mjs`
6. Copy generated `site/` output into `public/`

The old long `package.json` shell chain has been replaced with a Node build wrapper and a single public-redesign orchestrator. This keeps `package.json` stable and gives validation one ordered entrypoint to inspect.

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

The main remaining technical debt is moving stable public page rendering into shared rendering modules or the primary generator. The build entrypoint itself is now consolidated, so future work should migrate internals carefully instead of adding more top-level build steps.

Recommended next maintenance work:

- Keep migrating duplicated helper logic into `scripts/public-redesign-utils.mjs`.
- Migrate full stable page templates into reusable rendering modules only after visual approval.
- Consider moving durable public pages into `scripts/build.mjs` once the generated output has been manually reviewed.
- Keep generated public output separate from admin output.

## Do not touch

Spray Foam Front remains read-only/quarantined. Do not edit, patch, merge, reformat, or clean it as part of public-site work.
