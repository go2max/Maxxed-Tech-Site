# Local Business Lead Scanner

## Decision

Build **Local Business Lead Scanner** as the next viable App Suite option.

This is the best next product because it reuses the SEO Checker and Website Contact Extractor direction already in progress, creates a practical business-facing lead magnet for TechMaxxed, and can ship first as a web/admin utility before becoming a WordPress plugin or standalone desktop/mobile tool.

## Product summary

Local Business Lead Scanner reviews a public business website and produces a review-first report for:

- Contact details found on the site
- NAP consistency signals: name, address, phone, email
- Missing or weak contact paths
- Service-area and local SEO clues
- Basic trust indicators
- Follow-up notes for outreach, support, or site improvement

The tool must not scrape gated/private content, bypass robots, harvest at abusive scale, or send automated outreach. It is a review and organization tool.

## Primary user

A small business operator, agency owner, or TechMaxxed admin who wants to quickly inspect whether a local business website has the basic public signals needed to receive leads and rank locally.

## MVP scope

### Inputs

- Public website URL
- Optional expected business name
- Optional expected phone
- Optional expected email
- Optional expected city/state/service area
- Optional notes field

### Crawl limits

- Same-origin pages only
- Default page cap: 10
- Hard page cap: 25
- Timeout per request
- Skip binary assets, downloads, admin paths, login paths, cart/checkout paths, and obvious private paths
- Respect noindex/nofollow signals in scoring notes

### Extraction

Extract and normalize:

- Emails
- Phone numbers
- Physical addresses where obvious
- Contact page URLs
- Social profile URLs
- Service area phrases
- Schema.org LocalBusiness / Organization JSON-LD where present
- Page titles and meta descriptions
- Forms detected by `<form>` tags
- CTA phrases such as call, text, book, schedule, quote, contact

### Scoring

Create a transparent 100-point score with component scores:

- Contactability: 25
- NAP consistency: 20
- Local SEO basics: 20
- Trust/readiness: 15
- Conversion paths: 10
- Technical crawl/readability: 10

Scores must include reasons, not just numbers.

### Output

Return:

- Overall score
- Component scores
- Found contact data
- Missing data checklist
- Best contact URL
- NAP mismatch warnings
- Local SEO improvement list
- CSV export row shape
- JSON report shape
- Human-readable summary

## Public site integration

Add a product/catalog entry under TechMaxxed as a repo-backed or business utility product.

Suggested public copy:

- Name: Local Business Lead Scanner
- Category: Business utility
- Status: In development
- Summary: Review a public local business website for visible contact paths, NAP consistency, local SEO clues, trust signals, and lead-readiness issues.
- Facts: Public URL review, Contact extraction, NAP signals, Review-first report
- Limitation: Public-page signals only. It does not guarantee rankings, verify business ownership, or send outreach.

## Admin/sub-site integration

Add an admin-ready route or data contract for future admin portal use:

- `toolId`: `local-business-lead-scanner`
- `inputSchemaVersion`: `1.0.0`
- `reportSchemaVersion`: `1.0.0`
- Export formats: JSON and CSV
- Intended placement: Admin tools / Business tools / SEO tools

## Suggested implementation files

Codex should inspect the current repo structure first, then place files in matching existing locations. Likely targets:

- `content/repo-products.mjs` or equivalent catalog source
- `scripts/build.mjs` only if page generation needs product route support
- `admin/src/` for admin data/tool registration when present
- `tools/local-business-lead-scanner/` for reusable scanner core
- `tools/local-business-lead-scanner/README.md`
- `tools/local-business-lead-scanner/schema.mjs`
- `tools/local-business-lead-scanner/scanner.mjs`
- `tools/local-business-lead-scanner/report.mjs`
- `tools/local-business-lead-scanner/fixtures/`
- `tools/local-business-lead-scanner/tests/`

## Reusable module design

### `schema.mjs`

Exports:

- `TOOL_ID`
- `INPUT_SCHEMA_VERSION`
- `REPORT_SCHEMA_VERSION`
- `defaultScanOptions`
- `scoreWeights`
- `csvColumns`

### `scanner.mjs`

Exports pure helpers where possible:

- `normalizeUrl(input)`
- `isAllowedPageUrl(url, origin)`
- `extractEmails(html)`
- `extractPhones(text)`
- `extractJsonLd(html)`
- `extractMeta(html)`
- `extractLinks(html, baseUrl)`
- `detectContactSignals(page)`
- `buildCrawlPlan(seedUrl, pages)`

Network fetch should be isolated behind an injected fetch function for testability.

### `report.mjs`

Exports:

- `scoreLeadReadiness(scan)`
- `buildLeadScannerReport(scan, expected = {})`
- `toCsvRow(report)`
- `summarizeReport(report)`

## Safety and compliance guardrails

- No automated outreach
- No credentialed crawling
- No bypass of authentication, paywalls, robots intent, or rate limits
- No background mass harvesting
- No enrichment from private sources
- No claim that extracted contacts are verified unless a validator actually verifies them
- Do not store scanned websites by default without explicit admin workflow

## Acceptance checklist

- Product appears in the public catalog and is filterable under business/repo/tooling categories
- Tool docs exist with input/output examples
- Reusable scanner/report modules exist
- Fixtures cover a good local business page, weak contact page, and NAP mismatch page
- Unit tests cover normalization, extraction, scoring, CSV output, and guardrails
- `npm run check` or current repo check command can include the tests without network access
- Reports are deterministic from fixture HTML
- No app release code is touched

## Future extensions

- WordPress plugin variant for agency/client review
- Admin portal batch queue with strict caps
- PDF report export
- Screenshot evidence capture
- Service-area page recommendations
- Google Business Profile checklist, manually filled by user
- CRM/contact export after explicit review
