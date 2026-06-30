# Admin Worker backend skeleton

This is a planning skeleton only. Do not deploy live admin API routes until the admin subsite has verified access control.

## Suggested modules

1. `auth-gate`
   - verifies the request is allowed to read admin data
   - rejects all writes by default

2. `uptime-poller`
   - runs scheduled public website checks
   - stores summarized status windows
   - returns redacted uptime summaries to the admin UI

3. `support-routing-verifier`
   - stores manual verification status for public forms and support inboxes
   - never stores private message contents in static files

4. `release-readiness`
   - stores high-level product release readiness
   - separates public planning rows from private artifact records

5. `billing-usage`
   - backend-only module
   - requires role checks before any data is returned

## Read endpoints to add later

- `GET /api/admin/uptime/sites`
- `GET /api/admin/support/routes`
- `GET /api/admin/domains`
- `GET /api/admin/releases`
- `GET /api/admin/testing/programs`

## Write endpoints to add later

Add writes only after role checks exist.

- `POST /api/admin/support/routes/:id/verify`
- `POST /api/admin/releases/:id/status`
- `POST /api/admin/testing/:id/note`

## Frontend behavior

- Show static fallback rows when the backend is unavailable.
- Show a non-blocking warning instead of a blank dashboard.
- Keep risky actions disabled until backend authorization is active.

## Storage notes

Start with simple tables for summaries and verification states. Keep raw evidence, artifacts, payment records, and private tester details outside static hosting.
