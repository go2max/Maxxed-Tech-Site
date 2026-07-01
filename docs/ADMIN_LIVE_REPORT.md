# Admin Live Operations Report

The admin report at `/report/` is live-only. It expects:

```text
GET /api/report/live
```

The endpoint is implemented in the private platform Worker and should be protected by the same admin access controls as the rest of the platform.

## Current live checks

- Public site HTTP status, response time, and expected marker text.
- Public support route expectation for each tracked site.
- Product public page status and marker text.
- Product privacy page status and marker text.
- Integration connection state based on configured health URL environment variables.

Missing private integration variables are reported as `not_connected`, not as passing.

## Required validation

```powershell
npm run admin:check
npm run platform:check
```
