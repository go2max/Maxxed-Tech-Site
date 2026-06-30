# Admin subsite security notes

The admin portal is deployed as a subsite/static export. Treat it as an operations surface, not as a trusted backend.

## Current safe posture

- The admin page uses `noindex,nofollow` metadata.
- Admin-specific headers are configured to request `noindex`, `nofollow`, and `noarchive`.
- The static dashboard contains seeded status data only.
- No secrets, API tokens, device credentials, server paths, shell commands, or executable runner arguments should be committed to this repo.
- Browser controls for upload, test, and logs remain disabled until an authenticated backend is mounted.
- The frontend should only submit approved IDs to backend endpoints after authentication exists.

## Do not add yet

- Live uptime probe endpoints without authentication.
- Raw job logs or stack traces.
- Device lease IDs, runner hostnames, private IPs, or cloud account IDs.
- Admin API URLs that expose unauthenticated data.
- Secrets in JavaScript, HTML, CSS, JSON, Markdown, or comments.

## Required before real backend wiring

1. Put the admin subsite behind authentication or IP allowlisting.
2. Use server-side secrets only; never expose secrets to browser JavaScript.
3. Add CSRF protection or same-site session protections for state-changing actions.
4. Keep upload/test/log actions disabled by default unless authenticated and authorized.
5. Make uptime checks run from a scheduled backend worker, not from visitor browsers.
6. Store uptime history in backend storage with least-privilege access.
7. Redact logs and artifacts before displaying them in the admin portal.
8. Keep admin pages out of public sitemaps and public navigation.

## Current allowed static data

The uptime board may show public site names, public website URLs, support routing inboxes, and placeholder status metadata. Real uptime history, incident logs, and backend diagnostics should only appear after the admin subsite is access controlled.
