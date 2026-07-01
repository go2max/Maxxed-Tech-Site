# Website Contact Extractor

## Product position

Website Contact Extractor is a small business utility for extracting public contact and support details from a website URL into a clean, reviewable lead/contact record. It is designed for operators, agencies, local-service researchers, and internal portfolio workflows that need fast contact discovery without turning into a spam or scraping platform.

## Why this is the next viable option

This product is high leverage because it can ship as a lightweight web utility first, then become reusable infrastructure for admin lead intake, SEO audits, client-site checks, notary/customer prospecting, and app-support QA. It does not require mobile hardware, app-store review, camera permissions, or private account data to prove value.

## MVP scope

The MVP should accept one URL at a time and return a structured contact profile. The first release should not crawl deeply or send outreach.

### Inputs

- Website URL
- Optional business name override
- Optional notes/tags
- Optional page-depth setting limited to homepage only or homepage plus likely contact pages

### Extraction targets

- Business/site title
- Canonical URL and resolved domain
- Contact page URL candidates
- Public email addresses
- Public phone numbers
- Mailing or street address candidates
- Social profile URLs
- Contact form URL candidates
- Support, privacy, terms, and booking links
- Confidence notes and raw source snippets

### Output formats

- On-screen summary
- Copy-friendly contact card
- CSV export
- JSON export
- Manual correction fields before export

## Safety and abuse boundaries

- Extract only public information visible from user-supplied websites.
- Do not bypass login walls, paywalls, robots restrictions, CAPTCHAs, or rate limits.
- Do not provide bulk spam tooling, automated outreach, inbox warming, or cold-email sequence generation.
- Label extracted data as unverified until the user reviews it.
- Preserve source URLs for auditability.
- Prefer conservative results over hallucinated or inferred contact data.

## Suggested architecture

### Web utility first

- Static UI hosted under the Maxxed site or admin tools surface.
- Serverless extraction endpoint only if same-origin browser fetching is blocked.
- Local/session storage for recent runs until an authenticated admin workspace exists.

### Reusable modules

- URL normalization
- HTML fetch adapter
- Link classifier
- Email/phone/address candidate parser
- Social URL detector
- Contact confidence scorer
- CSV/JSON export writer
- Safe result renderer

## UI flow

1. User enters a website URL.
2. App validates and normalizes the URL.
3. App checks homepage and a small allowlisted set of likely contact pages.
4. App shows extracted candidates grouped by type.
5. User reviews, edits, deletes false positives, and adds notes.
6. User exports or copies the cleaned contact card.

## Acceptance checklist

- Valid URL handling, including missing scheme and trailing slash normalization.
- Clear error states for invalid URLs, unreachable sites, blocked requests, and no contact data found.
- Extracted values always show the source page.
- Duplicate emails, phone numbers, and links are deduplicated.
- Contact page discovery is bounded and deterministic.
- Export includes reviewed values plus source metadata.
- No automated messaging or bulk-send features.
- Support link points to `support@techmaxxed.com` / site support.
- Privacy copy explains that submitted URLs and extracted public page content may be processed to provide the result.

## Build prompt for Codex

Implement Website Contact Extractor as a launchable Maxxed utility without disturbing existing app pages.

Constraints:

- Work on a new branch from `main`.
- Do not touch Spray Foam Front or any archived/quarantined project.
- Keep the public/private boundary intact: no admin secrets, no private data, no hidden admin routes.
- Use existing site styling/classes where possible.
- Add a public product page, privacy/support copy, and a guarded utility UI if the repo already has a tools pattern.
- Add deterministic extraction logic with tests where the repo supports tests.
- Keep network fetching bounded to one submitted site and a small set of likely contact pages.
- Do not build bulk outreach, spam tooling, or automated email sending.

Implementation targets:

1. Add product metadata for `website-contact-extractor`.
2. Add `site/tools/website-contact-extractor/` or equivalent static page.
3. Add a reusable parser module if scripts/assets already have a JS module pattern.
4. Add fixtures for representative HTML pages.
5. Add tests for URL normalization, email extraction, phone extraction, social link detection, contact page classification, dedupe, and export formatting.
6. Update sitemap and product/app listing if the build system owns those files.
7. Run `npm run check` and fix repository-owned failures.

Done when:

- The utility page is reachable from the catalog or tools area.
- The extractor can parse fixture HTML and render a reviewed contact profile.
- Export works for CSV and JSON.
- Privacy/support links resolve.
- `npm run check` passes.
