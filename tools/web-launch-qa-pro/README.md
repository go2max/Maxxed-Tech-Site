# Web Launch QA Pro

Web Launch QA Pro is a static launch-readiness utility for fast website, product-page, and client-site reviews.

## MVP scope

- Public static page at `/tools/web-launch-qa-pro/`
- 16 weighted launch checks totaling 100 points
- Readiness verdict bands:
  - 90–100: launch-ready
  - 75–89: near-ready
  - 55–74: needs work
  - 0–54: launch blocked
- Priority blocker list sorted by remaining item weight
- Project profile fields for site name, URL, owner, and launch notes
- Copyable Markdown report
- Downloadable Markdown report
- Example data loader
- Support routing to `support@techmaxxed.com`

## Validation

Run:

```bash
npm run web-launch-qa:check
```

The validator confirms the public page exists, core UX controls are present, fixture coverage exists, there are exactly 16 weighted checks, and the checklist weights total 100.

## Product fit

This is intentionally lighter than a crawler. It is a repeatable go/no-go launch gate that pairs with heavier utilities such as Maxxed SEO Checker, Local Business Lead Scanner, GBP Audit Tracker, and future client/admin workflows.

## Next expansion batch

- Add import/export JSON for repeatable client reviews.
- Add named review templates for local business, SaaS landing page, WordPress site, and static app page.
- Add localStorage saved audits.
- Add printable report styling.
- Add a combined dashboard card on the public tools index when that index is formalized.
