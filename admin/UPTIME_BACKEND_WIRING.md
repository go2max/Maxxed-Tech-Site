# Admin uptime board backend wiring

The admin dashboard currently renders a static-safe uptime board with seeded data. This keeps the Hostinger export usable before a Worker/admin API is mounted.

Security boundary: the admin subsite must remain static/read-only until access control is in place. Do not expose live probe endpoints, check history, incidents, tokens, server paths, private IPs, runner metadata, or backend diagnostics to unauthenticated browsers.

## Sites currently tracked

| Site | URL | Support route |
| --- | --- | --- |
| NorCal Cash For Cars | https://norcalcashforcars.com | support@techmaxxed.com |
| Maxxed Pix | https://maxxedpix.com | support@techmaxxed.com |
| TechMaxxed | https://techmaxxed.com | support@techmaxxed.com |
| A. Bunch Mobile Notary | https://bunchsigning.com | support@bunchsigning.com |

## API shape to mount later

Only mount this after authentication/IP allowlisting exists.

Recommended read endpoint:

```http
GET /api/admin/uptime/sites
```

Recommended response shape:

```json
{
  "checked_at": "2026-06-30T19:00:00Z",
  "sites": [
    {
      "site": "TechMaxxed",
      "url": "https://techmaxxed.com",
      "status": "online",
      "http": 200,
      "responseMs": 172,
      "uptime24": 100,
      "uptime7": 99.99,
      "uptime30": 99.98,
      "sslDays": 90,
      "sslExpiresAt": "2026-09-28T00:00:00Z",
      "dns": "production host",
      "support": "support@techmaxxed.com",
      "incident": "None recorded"
    }
  ]
}
```

## Poller requirements

- Run checks on a schedule, not directly from the browser.
- Record HTTP status, redirect outcome, response time, SSL expiration, DNS target, and checked timestamp.
- Keep a rolling history table so 24h, 7d, and 30d uptime are computed from real checks.
- Mark sites as:
  - `online` when the expected HTTP response succeeds.
  - `degraded` when response is slow, redirected unexpectedly, or SSL is near expiration.
  - `offline` when DNS, TLS, timeout, or HTTP failure thresholds are exceeded.
- Surface incidents separately from raw check history so the admin board can show the latest meaningful outage.
- Keep the frontend sortable/searchable table contract stable so additional admin tables can reuse the same table pattern.
- Redact raw errors before returning them to the browser.
- Never include secrets, worker tokens, private backend URLs, or infrastructure identifiers in the JSON response.

## Next frontend handoff

Replace the seeded `uptimeSites` array in `admin/index.html` with a safe authenticated async fetch. On failure, keep seeded fallback rows and show a non-blocking status message rather than blanking the dashboard.
