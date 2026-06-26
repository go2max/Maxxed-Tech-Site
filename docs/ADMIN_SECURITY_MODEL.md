# Admin Security Model

## Authentication

Admin v1 does not implement a custom username/password database. Production authentication comes from Cloudflare Access or an equivalent identity-aware proxy. The app reads trusted identity headers from the access layer and denies requests without identity.

## Authorization

Authorization is server-side and deny-by-default. Roles are:

- Owner
- Administrator
- Developer
- QA Lead
- Beta Manager
- Support
- Documentation Editor
- Analytics Viewer

Privileged mutations require explicit permissions. Sensitive operations such as product archive, release approval, access changes, export, and integration changes must write audit events.

## Audit

Audit events are append-only and include actor email, role, action, target type, target ID, before/after summary, reason, request ID/source, and timestamp.

## Secrets

Secret values must never appear in browser code, logs, screenshots, generated public files, or test evidence. UI may display credential source names only.
