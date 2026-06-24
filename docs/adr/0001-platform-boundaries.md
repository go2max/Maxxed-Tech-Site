# ADR 0001: Preserve Public, Private, and Runner Trust Boundaries

Date: June 23, 2026

## Status

Accepted

## Context

The repository already contains a validated public website that acts as a low-risk
static catalog. The Maxxed Platform v1 task adds a private operations platform
and a local Windows-friendly sequential APK runner. The new systems handle
trusted identity, administrative mutations, beta data, private evidence,
integration credentials, and local Android-device control. Those concerns carry
materially different risk than the public website.

## Decision

We will preserve three explicit trust boundaries in the repository and in the
deployed architecture:

1. `site/`, `public/`, `content/`, and the existing root Worker remain the
   public website boundary.
2. `platform/` will contain a separate private control-plane Worker, server-side
   authorization, storage contracts, private UI, migrations, and tests.
3. `runner/` will contain a local Windows-first sequential APK runner that never
   executes inside the public or private Worker runtime.

The private platform will trust identity only from a deployed identity-aware
proxy and only on the server. Browser JavaScript may not assert identity,
roles, ownership, or approval state. The public Worker will not host
administrative routes, private metrics, beta-review state, or APK execution.

The runner will remain least-privilege and isolated:

- no production signing keys
- no arbitrary command execution
- versioned allowlisted script packs only
- explicit runner and device leases
- one job and one step at a time

## Consequences

Positive:

- The validated public website can continue shipping independently.
- Identity, authorization, and administrative mutations stay out of the public
  static bundle.
- The runner can adopt operating-system and device-specific controls without
  weakening the web surfaces.
- Failure or compromise in one boundary has less blast radius.

Tradeoffs:

- We must maintain separate validation and deployment flows.
- Shared code must remain limited to safe contracts and validation helpers.
- Some data exchange between `platform/` and `runner/` must be explicit and
  versioned rather than implicit through shared runtime state.

## Rejected Alternatives

- Adding admin routes to the existing public Worker
- Implementing a custom username/password store
- Executing APK jobs inside a Cloudflare Worker
- Allowing the browser to submit raw runner commands or script bodies
