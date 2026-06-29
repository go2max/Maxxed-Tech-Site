# Local Business Lead Scanner

Review a public local business website for visible lead-readiness signals.

This utility is intentionally review-first. It extracts public-page signals and creates a deterministic report that can be inspected by a human before any outreach, sales workflow, support ticket, or website update.

## What it checks

- Visible emails and phone numbers, including common human-readable obfuscation such as `name [at] domain [dot] com`
- Contact links and contact forms
- Local business language, hours, map/address cues, and service-area phrases
- LocalBusiness or Organization JSON-LD
- Page titles, meta descriptions, and noindex robots signals
- Calls to action such as call, text, book, schedule, quote, and contact

## What it does not do

- It does not send automated outreach.
- It does not bypass authentication, paywalls, robots intent, admin areas, cart/checkout flows, or private content.
- It does not guarantee local rankings.
- It does not verify ownership of a business.
- It does not prove that contact details are correct; it only reports what was visible in scanned public pages.

## Basic usage

```js
import { scanWebsite } from "./scanner.mjs";
import { buildLeadScannerReport, toCsv } from "./report.mjs";

const htmlByUrl = new Map([
  ["https://example.com/", "<title>Example</title><a href='/contact'>Contact</a>"],
  ["https://example.com/contact", "Call (916) 555-1212 or email hello@example.com"],
]);

const scan = await scanWebsite("https://example.com", {
  fetchPage: async (url) => htmlByUrl.get(url) || "",
  pageCap: 10,
});

const report = buildLeadScannerReport(scan, {
  businessName: "Example",
  cityStateOrServiceArea: "Sacramento",
});

console.log(report.summary);
console.log(toCsv(report));
```

## Data contract

- Tool ID: `local-business-lead-scanner`
- Input schema: `1.0.0`
- Report schema: `1.0.0`
- Default page cap: 10
- Hard page cap: 25

## Report shape

```json
{
  "toolId": "local-business-lead-scanner",
  "inputSchemaVersion": "1.0.0",
  "reportSchemaVersion": "1.0.0",
  "scannedUrl": "https://example.com/",
  "overallScore": 78,
  "componentScores": {
    "contactability": 25,
    "napConsistency": 16,
    "localSeoBasics": 14,
    "trustReadiness": 11,
    "conversionPaths": 7,
    "technicalReadability": 5
  },
  "found": {
    "emails": ["hello@example.com"],
    "phones": ["(916) 555-1212"],
    "contactUrls": ["https://example.com/contact"],
    "socialUrls": [],
    "ctas": ["call", "contact"]
  },
  "missing": [],
  "warnings": [],
  "improvements": [],
  "bestContactUrl": "https://example.com/contact",
  "summary": "https://example.com/ scored 78/100 for local lead readiness..."
}
```

## Production operations

See [`OPERATIONS.md`](OPERATIONS.md) before connecting this scanner to an admin runner, queue, or hosted endpoint. The pure scanner accepts an injected fetch layer; the caller is responsible for request timeouts, rate limits, same-origin enforcement, credential exclusion, and retention policy.

## Test fixtures

The tests use offline HTML fixtures only. A future network-enabled admin runner should inject its own fetch layer and enforce timeouts, same-origin limits, and queue caps outside the pure extraction/report modules.
