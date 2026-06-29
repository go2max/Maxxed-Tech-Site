# GBP Audit Tracker Readiness

## Build target

GBP Audit Tracker is a standalone static MVP under `tools/gbp-audit-tracker/` with a deployable public mirror at `public/tools/gbp-audit-tracker/`. It is intentionally manual-first: no Google APIs, no scraping, no backend, no accounts, and no payment logic.

## Public route

After the normal site build, the tool is available at:

```text
/tools/gbp-audit-tracker/
```

The source-of-truth implementation lives under `tools/gbp-audit-tracker/`. The public single-file route exists because the current site builder automatically copies `public/` into the deploy artifact.

## Acceptance gate status

| Gate | Status | Notes |
| --- | --- | --- |
| App runs locally without API keys | Ready for smoke test | Static browser module served from `tools/gbp-audit-tracker/`; deployable mirror served from `public/tools/gbp-audit-tracker/`. |
| New audit can be completed end-to-end | Implemented | Business basics, weighted section checklist, notes, score, recommendations, and report all update from the form. |
| Score updates from inputs | Implemented | `calculateAudit()` recomputes score and section breakdown on input/change. |
| Recommendations appear correctly | Implemented | Weak/missing fields generate title, why, fix, priority, effort, and task status. |
| Saved audit can be loaded and deleted | Implemented | Uses `localStorage` key `maxxed.gbpAuditTracker.v1`. |
| Report copy/download works | Implemented | Clipboard copy with fallback and markdown download are wired in both the source app and deployable mirror. |
| Mobile viewport remains usable | Implemented | CSS collapses forms, score grid, saved audits, and recommendation panels below 850px. |
| Deploy artifact includes the tool | Implemented | `public/tools/gbp-audit-tracker/index.html` is copied by the existing build process. |
| No secrets or vendor files committed | Implemented | Static source, docs, fixture, public route, and tests only. |
| Build/test/lint commands pass | Pending runner verification | `npm run gbp:check` was added and should be run locally/CI. |

## Validation commands

```bash
npm run gbp:check
```

Manual source smoke test:

```bash
python3 -m http.server 4173
# open http://localhost:4173/tools/gbp-audit-tracker/
```

Manual deploy-route smoke test:

```bash
python3 -m http.server 4173
# open http://localhost:4173/public/tools/gbp-audit-tracker/
```

After `npm run build`, smoke the generated artifact:

```bash
python3 -m http.server 4173 --directory site
# open http://localhost:4173/tools/gbp-audit-tracker/
```

## Manual smoke checklist

1. Open the tool page.
2. Click **Load sample audit**.
3. Confirm score and recommendations populate.
4. Toggle several checklist items and confirm score changes.
5. Change a recommendation status to In Progress or Done.
6. Save the audit locally.
7. Load the saved audit.
8. Delete the saved audit.
9. Copy the report.
10. Download the markdown report.
11. Check mobile width around 390px and confirm the form remains usable.

## Out of scope for v1

- Google Business Profile API integration.
- Scraping Google search, maps, profile pages, or competitor data.
- Rank tracking.
- Multi-user login.
- Payments.
- PDF generation.
- Backend database.

## Product page integration notes

Potential public listing copy:

> GBP Audit Tracker gives local SEO freelancers, agencies, and business owners a manual checklist for reviewing a Google Business Profile. Score profile completeness, category fit, services, reviews, photos, posts, Q&A, website alignment, NAP consistency, and conversion readiness, then export a prioritized client-ready report.

Suggested catalog metadata:

- Category: Business / Local SEO
- Status: MVP smoke test
- CTA: Open tool
- Support: `support@techmaxxed.com`
- Privacy: browser-local storage only in v1
- Public route: `/tools/gbp-audit-tracker/`

## Known limitations

- localStorage is device/browser-specific and can be cleared by the browser.
- Scores are checklist-based and should be treated as operational guidance, not ranking prediction.
- Manual entry is required; this avoids API and scraping dependencies for v1.
- The public route is a static mirror until the site builder supports first-class standalone tools as generated catalog products.
