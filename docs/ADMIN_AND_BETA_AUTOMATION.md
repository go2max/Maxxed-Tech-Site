# Admin and Beta Automation Decision

> **Security First.** Every feature, API, administrative page, automation, and
> integration must be designed with least privilege, auditability, and secure
> defaults. Convenience never overrides security.

## Decision

Do not add a public custom-password admin login to the first website release.
The current content remains Git-managed and every change is reviewable. A custom
login, password reset flow, session store, and public write API would add attack
surface before the site needs it.

When frequent non-code updates justify an admin interface, place a separate
`admin.techmaxxed.com` application behind Cloudflare Access or an equivalent
identity-aware proxy. Allow only approved Maxxed Technical Systems accounts.
Do not store site-specific passwords.

## Implemented Testing Console

The private `platform/` Worker now provides app-specific testing controls for
all six current apps. Its main page includes quick smoke and full-suite runs,
and its Testing Functions section can queue one approved script or an ordered
selection of scripts for a single app.

The server expands named suites and validates every selected script against its
version-controlled catalog. The browser cannot submit commands, executable
paths, or shell arguments. Ordered jobs and creation audit events are stored in
D1. Access requires both the hosted identity header and membership in the
`ADMIN_ALLOWED_EMAILS` environment allowlist; a missing allowlist denies access.

The console queues jobs. Android execution and result ingestion require the
isolated local runner described in `PRIVATE_OPERATIONS_PLATFORM.md`; queued
work must never be represented as passed before the runner records a result.

The broader monitoring, release, help, and sequential APK testing design is in
`PRIVATE_OPERATIONS_PLATFORM.md`.

The canonical platform-wide requirements and role model are defined in
`MAXXED_PLATFORM_V1_SPECIFICATION.md`.

## Beta Program: Current Phase

The public beta form prepares an email to `beta@techmaxxed.com`. The website
does not store the application. A person reviews the request before sending any
Google Play opt-in link or adding a tester to a group.

This phase requires these mailboxes or aliases after the domain is active:

- `beta@techmaxxed.com`
- `support@techmaxxed.com`
- `privacy@techmaxxed.com`

## Beta Program: Recommended Automation

1. A public form submits to a narrowly scoped Cloudflare Worker endpoint.
2. Turnstile, rate limits, input validation, and duplicate checks block common abuse.
3. The application is written to a D1 review queue with consent timestamps.
4. An email verification link confirms control of the Google Account address.
5. An approved Maxxed administrator reviews the selected apps and device details.
6. After approval, a server-side integration adds the address to the appropriate Google Group.
7. The Google Group is attached to the corresponding Play testing track.
8. The tester receives the correct opt-in link and feedback instructions.
9. Removal requests revoke group membership and future beta contact. Public credit is managed independently because it requires separate consent.

## Google API Boundaries

The Android Publisher `edits.testers` resource can attach Google Group email
addresses to a testing track. It does not support individual Play Console email
lists through the API:

- https://developers.google.com/android-publisher/api-ref/rest/v3/edits.testers

The Google Workspace Admin SDK Directory API can add an approved address to a
Workspace group when the caller has the required administrator authorization:

- https://developers.google.com/admin-sdk/directory/reference/rest/v1/members/insert

Before implementation, create the intended Google Workspace or Google Groups
structure and confirm each group address is accepted by the target Play track.
Do not assume that an arbitrary mailing list is a valid Play tester group.

## Security Requirements

- Never place Google service-account keys, OAuth refresh tokens, Play credentials, or Workspace administrator credentials in source control.
- Use hosted secret storage and narrowly scoped service identities.
- Require administrator approval before group membership is created.
- Record who approved, added, removed, or credited each tester.
- Keep beta eligibility consent separate from public credit consent.
- Provide removal, export, and correction workflows.
- Rate-limit public endpoints and do not reveal whether an email is already enrolled.
- Keep the admin application on a separate hostname and deny access by default.

## Why Manual Approval Stays

Automatically granting Play access from an unverified public form would allow
spam, typo enrollment, unwanted group membership, and abuse of limited internal
test slots. Automation should reduce administrative work after verification;
it should not remove the approval gate.
