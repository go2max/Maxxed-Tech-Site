# Web Launch QA Pro Readiness

## Current state

Status: MVP ready for repository review.

The first pass is a public, dependency-free static utility with a weighted launch checklist, report export, example loader, and validation coverage.

## Done

- Public route: `/tools/web-launch-qa-pro/`
- SEO-safe title, description, canonical, and index robots metadata
- 100-point checklist grouped by SEO/crawlability, content/conversion, trust/legal/accessibility, and launch operations
- Live readiness score and verdict
- Priority blockers sorted by score impact
- Copy report action
- Download Markdown report action
- Example review loader
- Fixture report
- Dedicated validation script
- Package script entry
- Build sitemap registration

## Manual QA before merge

- Open `/tools/web-launch-qa-pro/` after `npm run build`.
- Tap through the checklist on mobile width.
- Confirm Copy report works in the target browser.
- Confirm Download Markdown creates `web-launch-qa-report.md`.
- Confirm reset clears selected checks.

## Stop point

Stop after this MVP if the goal is a mergeable first product slice. Continue only if you want saved audits, JSON import/export, print styling, and multiple review templates before the first PR merge.
