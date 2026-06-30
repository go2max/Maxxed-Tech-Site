# Admin scaffolding roadmap

This admin subsite is being shaped as the operating console for TechMaxxed/Maxxed work. Keep the implementation modular, secure-by-default, and easy to expand.

## Immediate security gate

Before using this as a real admin portal, protect the subsite at the host/proxy layer:

- Preferred immediate option: Hostinger password-protected directory on the admin document root.
- Preferred medium-term option: Cloudflare Access on `admin.techmaxxed.com/*`.
- Acceptable fallback: Apache Basic Auth with `.htpasswd` outside the public web root.

Do not use a JavaScript-only login form as the security layer.

## Current scaffolded boards

| Board | Current state | Notes |
| --- | --- | --- |
| Modules | Static/config-driven | Pulls from `admin/data/admin-boards.json` with fallback data. |
| Website uptime | Static-safe seeded data | Real checks wait for authenticated backend. |
| Launch readiness | Static/config-driven | Easy to add products and next actions. |
| App testing | Static shell | Buttons intentionally disabled until backend auth exists. |
| Support routing | Config scaffold | Support inboxes can be mapped centrally. |
| Billing and usage | Planned secure-only | Do not implement before authentication. |

## Add-stuff-fast workflow

For safe, static additions:

1. Edit `admin/data/admin-boards.json`.
2. Add a module object for a new board.
3. Add launch rows or support route rows as needed.
4. Keep values public or low-risk.
5. Do not add live customer, payment, device, runner, or infrastructure data.

For real admin functionality:

1. Confirm the subsite is behind login.
2. Add authenticated API endpoints.
3. Keep browser requests read-only until role checks exist.
4. Add one board at a time behind server-side authorization.
5. Log actions server-side, not in static files.

## Next boards to build

1. **Support routing audit**
   - property
   - domain/page
   - form endpoint
   - expected inbox
   - verified status
   - last checked

2. **Domain and SSL inventory**
   - domain
   - registrar
   - hosting target
   - DNS status
   - SSL status
   - renewal window

3. **Release artifacts**
   - product
   - platform
   - latest APK/AAB/build
   - signed status
   - Play Console status
   - blockers

4. **Pre-release testing**
   - product
   - tester request count
   - invite status
   - test notes
   - launch decision

5. **Billing and usage**
   - secure-only board
   - Stripe/account data must never be static
   - needs authenticated backend and role checks

## Polish standard

Every admin board should use the same baseline:

- Search box
- Stage/status filter when useful
- Sortable columns
- Clear empty state
- Mobile-friendly horizontal table scroll
- Consistent support route column when applicable
- No raw secrets, logs, private IDs, or customer data
