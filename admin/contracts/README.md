# Admin backend contracts

This folder is for safe planning notes for future authenticated admin APIs.

The admin subsite must be protected by a real hosting/proxy login before these contracts are implemented.

## Contract rules

- Keep contracts high-level until the backend exists.
- Do not put environment values, credentials, infrastructure details, or account-specific values here.
- Browser code should show safe fallback data if an authenticated request fails.
- Server-side code should decide what each role may access.

## Planned contracts

### Uptime board

Purpose: provide authenticated uptime summaries for public websites.

Fields to expose later:

- public site name
- public URL
- status
- response time bucket or measured response time
- uptime windows
- SSL renewal window
- support inbox
- redacted incident summary

### Support routing board

Purpose: verify each public form and contact route points to the correct inbox.

Fields to expose later:

- property
- domain
- route type
- expected inbox
- verification status
- last checked time
- next action

### Release artifacts board

Purpose: show high-level build and store readiness.

Fields to expose later:

- product
- platform
- artifact type
- signed status
- store status
- blocker
- next action

### Billing and usage board

Purpose: show subscription and capacity risk after authentication and authorization exist.

This board must stay backend-only. Static files should contain only board shape and placeholder planning data.
