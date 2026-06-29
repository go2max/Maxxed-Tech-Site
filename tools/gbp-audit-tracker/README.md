# GBP Audit Tracker

GBP Audit Tracker is a manual local SEO utility for reviewing a Google Business Profile without API access, scraping, accounts, payments, or a backend. It is designed for freelancers, agencies, local-service businesses, and TechMaxxed support workflows.

## What it does

- Captures business basics and profile checklist items.
- Calculates a transparent 0-100 score using weighted sections.
- Shows score bands: Strong, Good but improvable, Needs work, or High-priority cleanup.
- Generates prioritized recommendations with issue, why it matters, suggested fix, priority, effort, and task status.
- Saves, loads, and deletes audit history through browser localStorage.
- Generates a client-ready markdown report.
- Supports copy-to-clipboard and markdown download.
- Includes a support CTA for `support@techmaxxed.com`.

## Run locally

Open the source app directly in a browser:

```bash
open tools/gbp-audit-tracker/index.html
```

Because the source app uses browser modules, a local static server is the most reliable smoke-test path:

```bash
python3 -m http.server 4173
# then open http://localhost:4173/tools/gbp-audit-tracker/
```

## Public/deploy route

The deployable route is mirrored as a static single-file page under `public/` because the current site builder automatically copies that directory into the generated site.

Source mirror smoke path:

```bash
python3 -m http.server 4173
# then open http://localhost:4173/public/tools/gbp-audit-tracker/
```

After a normal site build:

```bash
npm run build
python3 -m http.server 4173 --directory site
# then open http://localhost:4173/tools/gbp-audit-tracker/
```

## Check

```bash
npm run gbp:check
```

That command runs:

```bash
node tools/gbp-audit-tracker/tests/scoring.test.mjs
node scripts/validate-gbp-audit-tracker.mjs
```

## Scoring model

The score uses these section weights:

| Section | Weight |
| --- | ---: |
| Core profile completeness | 20 |
| Category fit | 15 |
| Services/products | 10 |
| Reviews | 15 |
| Photos/media | 10 |
| Posts/updates | 5 |
| Q&A | 5 |
| Website/local SEO alignment | 10 |
| NAP/contact consistency | 5 |
| Conversion readiness | 5 |

## Product copy

**Name:** GBP Audit Tracker

**Short summary:** Manual Google Business Profile audit tracker with scoring, prioritized fixes, saved audit history, and client-ready report export.

**Long description:** GBP Audit Tracker helps local SEO freelancers, agencies, and small-business owners review a Google Business Profile from manually entered data. It scores profile completeness, categories, services, reviews, media, posts, Q&A, website alignment, NAP consistency, and conversion readiness. The app turns weak areas into prioritized tasks and exports a markdown report that can be shared with a client or used as an internal follow-up checklist.

**Best for:** Local SEO audits, small-business cleanup plans, agency discovery calls, service-area business reviews, notary/contractor/home-service website support.

**Public route:** `/tools/gbp-audit-tracker/`

**Disclaimer:** This is a manual audit helper from Maxxed Technical Systems. It is not affiliated with Google. Rankings, traffic, calls, and leads are not guaranteed.

## V1 limitations

- No Google Business Profile API integration.
- No scraping of Google pages.
- No rank tracking.
- No multi-user accounts.
- No backend database.
- No payments.
- No PDF rendering in v1.

## Suggested next increments

1. Add a first-class generated catalog card with a direct `Open tool` CTA.
2. Add import/export JSON for moving audits between devices.
3. Add white-label report branding fields.
4. Add a Chrome extension wrapper for manual GBP tab-side audits.
5. Add optional PDF export after the markdown flow is stable.
