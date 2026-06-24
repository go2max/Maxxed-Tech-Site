# Codex Master Build Task: Maxxed Platform v1

Use this task from the root of a fresh clone of
`https://github.com/go2max/Maxxed-Tech-Site`.

## Objective

Build every repository-controlled part of Maxxed Platform v1 while preserving
the existing public website. Deliver a secure private operations platform, a
Windows-friendly sequential APK test runner, beta operations, product health,
QA, release management, audit logging, and readiness scoring.

This is one Codex task, but it must execute in phases with independent commits,
tests, and recovery checkpoints. Continue through phases automatically when
their acceptance gates pass. Stop only for a real external dependency,
credential, irreversible action, or security decision that cannot be resolved
from the repository.

## First Principle

Security First. Every feature, API, administrative page, automation, and
integration must use least privilege, auditability, and secure defaults.
Convenience never overrides security.

## Read Before Editing

Read these files completely and treat them as requirements:

1. `docs/MAXXED_PLATFORM_V1_SPECIFICATION.md`
2. `docs/PRIVATE_OPERATIONS_PLATFORM.md`
3. `docs/ADMIN_AND_BETA_AUTOMATION.md`
4. `docs/PROJECT_CHECKLIST.md`
5. `README.md`
6. `.openai/hosting.json`
7. `package.json`
8. All existing build and validation scripts

Inspect the repository, current branch, status, history, and existing tests
before making changes. Preserve user changes and the validated public site.

## Non-Negotiable Boundaries

- Keep the public website, private control plane, and local APK runner as
  separate trust boundaries.
- Do not expose administrative routes through the public website Worker.
- Do not add a custom username/password authentication system.
- Enforce authorization server-side. Never trust a role, email, approval, or
  ownership claim supplied by browser JavaScript.
- Require trusted identity headers in deployed private environments. Any local
  development identity override must be explicit, development-only, disabled
  by default, impossible in production, and visibly identified in the UI.
- Do not store secrets, tokens, credentials, signing keys, APKs, or private
  tester data in Git.
- Do not place production signing keys on the runner.
- Do not execute uploaded or operator-provided arbitrary commands.
- Test scripts must come from an allowlisted, versioned script catalog.
- APK inspection must not install or execute the APK.
- APK test jobs and their steps must never run in parallel on the same runner
  or device. Enforce this invariant in code, persistence, and tests.
- Every sensitive state change must produce an append-only audit event.
- Missing external integration data must display as unavailable or stale, never
  as a fabricated zero or success.
- No automatic production deployment, release promotion, tester enrollment,
  destructive deletion, or billing action.
- Do not weaken CSP, CSRF protection, validation, logging, or approval gates to
  make a test pass.
- Do not claim an external integration works without a credentialed test.

## Repository Shape

Preserve the current root public-site build. Add separate, clearly documented
areas for the private platform and runner. Prefer the repository's existing
patterns after inspection. A reasonable target is:

```text
platform/        private control-plane Worker, UI, migrations, and tests
runner/          local Windows-friendly sequential APK runner
packages/        genuinely shared contracts and validation only
docs/            architecture, setup, threat model, runbooks, and status
```

Do not perform a broad public-site refactor merely to create this structure.
Keep independent deployment configuration for the public and private services.

## Required Roles

Implement the canonical roles and server-side permissions:

- Owner
- Administrator
- Developer
- QA Lead
- QA Tester
- Beta Manager
- Beta Tester
- Support
- Documentation Editor
- Analytics Viewer

Owner-only operations must remain owner-only. QA approval and production
promotion must be separate actions. A QA Lead cannot directly deploy a
production release. Record all role and permission changes in the audit log.

## Execution Rules

For every phase:

1. Inspect the relevant existing code and requirements.
2. Write or update the phase plan in `docs/IMPLEMENTATION_STATUS.md`.
3. Implement the smallest production-quality vertical slice.
4. Add focused tests, including authorization and negative-path tests.
5. Run formatting, linting, type checking, unit tests, integration tests, and
   existing public-site validation that apply.
6. Run `npm run check` from the repository root before every phase commit.
7. Update documentation and the project checklist only for verified work.
8. Commit the phase with a concise message.
9. Record the commit, tests, limitations, and next phase in the status file.

Do not combine all work into one final commit. Do not mark an item complete
because a schema, mock, placeholder, or design document exists.

## Phase 0: Baseline and Architecture

Deliver:

- Clean baseline verification of the existing public site.
- `docs/IMPLEMENTATION_STATUS.md` with phase state, commands, and evidence.
- An architecture decision record covering public/private/runner boundaries.
- A concise threat model covering identity spoofing, privilege escalation,
  CSRF, XSS, SQL injection, SSRF, malicious APKs, arbitrary script execution,
  artifact leakage, runner compromise, replay, queue races, audit tampering,
  and secret exposure.
- A data classification and retention matrix.
- Root commands that validate all implemented work without requiring Bash or
  WSL on Windows.

Gate:

- Existing 23-page website validation remains green.
- Architecture does not place private functionality in the public Worker.

Commit: `Establish Maxxed platform implementation baseline`

## Phase 1: Private Platform Foundation

Build a deployable private control-plane skeleton with:

- ESM Worker entry and independent hosting configuration.
- Server-rendered or progressively enhanced operational UI.
- Trusted identity extraction performed only on the server.
- Deny-by-default route authorization.
- Canonical RBAC permission matrix.
- Production-safe session handling and expiration model.
- CSRF protection for state-changing browser requests.
- Strict input schemas, output encoding, request size limits, and safe errors.
- CSP, HSTS where applicable, frame protection, referrer policy, MIME sniffing
  protection, and restrictive permissions policy.
- Authentication and public API rate-limit interfaces.
- Structured request IDs and redacted actionable logs.
- Health endpoint that exposes no sensitive configuration.
- Local development setup that cannot silently impersonate production.

Add tests proving:

- Unauthenticated requests are rejected.
- Every role is allowed and denied the correct representative actions.
- Client-supplied identity and role headers cannot override trusted identity.
- CSRF and invalid-origin requests fail.
- Sensitive values are absent from responses and logs.

Gate: all security tests and root validation pass.

Commit: `Build private platform security foundation`

## Phase 2: Persistence, Audit, and Core Records

Implement migrations, repositories, services, validation, and tests for:

- Users, roles, permissions, and role assignments.
- Products and lifecycle status.
- Builds, artifacts, versions, hashes, and signing metadata.
- Releases, stages, approvals, blockers, and release notes.
- QA plans, assignments, test cases, executions, and evidence references.
- Bugs, severity, priority, status, ownership, and verification.
- Beta applications, testers, devices, interests, status, credits, and consent.
- Automation jobs, ordered steps, devices, leases, results, and evidence.
- Incidents, monitors, integration state, and data freshness.
- Knowledge-base entries and publication state.
- Readiness criteria, evidence, score snapshots, and mandatory gates.

Use prepared statements and transactional service boundaries. Add migration
and repository tests. Use application-enforced append-only audit records with
hash chaining or an equivalently verifiable integrity mechanism. Prevent normal
application paths from updating or deleting audit events.

Every administrative mutation must record actor, trusted identity, role,
timestamp, request ID, action, target, outcome, and safe before/after data.
Redact secrets and minimize personal data.

Gate: fresh migration, repeat migration, rollback strategy documentation,
authorization tests, audit-integrity tests, and root validation pass.

Commit: `Add platform data model and verifiable audit log`

## Phase 3: Operational Dashboard

Build usable, responsive, WCAG 2.2 AA-targeted private pages for:

- Portfolio overview.
- Per-product health dashboard.
- Releases and explicit promotion approvals.
- QA plans, assignments, execution results, and evidence.
- Bug tracking and fix verification.
- Beta applications, testers, groups, assignments, and credits.
- Automation jobs and ordered step results.
- Incidents, uptime, certificates, dependencies, backups, and integrations.
- Security events and audit-log inspection.
- Internal knowledge base.
- User and role administration where authorized.
- Product Readiness Score with missing evidence and blocking gates.

Requirements:

- Operationally dense, restrained, and scannable interface.
- Clear loading, empty, stale, unavailable, denied, validation, and failure
  states.
- Destructive and security-sensitive actions require explicit confirmation.
- Owner-only controls are absent or disabled for unauthorized users and still
  rejected server-side.
- Do not display secrets, raw tokens, full private IP addresses, or unnecessary
  tester personal data.
- Add keyboard and automated accessibility coverage for critical workflows.

Gate: representative end-to-end tests pass for each role and critical flow.

Commit: `Build private operations dashboard`

## Phase 4: Sequential APK Runner

Build a Windows-first local runner that works from PowerShell without WSL.

Required workflow:

1. Select an APK from local disk.
2. Stream or read it with configured size limits.
3. Calculate SHA-256.
4. Inspect package, version, SDK, and signing metadata without execution.
5. Match the package to an approved product.
6. Load only compatible allowlisted script packs.
7. Let the operator select and order approved steps.
8. Acquire a durable runner and device lease.
9. Execute one job and one step at a time.
10. Capture stdout, stderr, logcat, screenshots, optional video, performance,
    memory, battery, crash evidence, timings, and final status where supported.
11. Apply timeouts, cancellation, required-step failure policy, cleanup, and
    lease release.
12. Produce deterministic local JSON and HTML reports.
13. Recover interrupted jobs as interrupted or failed, never passed.

Provide app-specific script-pack manifests for the six current Android apps.
Use non-destructive starter checks only when a product-specific command is not
already documented. Never invent package IDs or release credentials; mark them
as required configuration.

Add tests for:

- Package mismatch and invalid APK rejection.
- Malformed and oversized file handling.
- Script allowlisting and argument escaping.
- Sequential ordering and concurrency attempts.
- Duplicate runner, device, and job lease contention.
- Required versus optional step failure.
- Timeout, cancellation, restart recovery, and cleanup.
- Secret and personal-data redaction.
- Report completeness and integrity.

Gate: fixture-based tests prove no two steps execute concurrently and a local
dry run completes without a connected device.

Commit: `Build sequential APK test runner`

## Phase 5: Beta Operations and Credits

Build the private beta application workflow and public-safe integration points:

- Server-side application submission with validation, rate limiting, abuse
  controls, consent versioning, and minimal retention.
- Beta Manager review, approve, reject, waitlist, suspend, and remove actions.
- App-interest and device matching.
- Testing assignments and completion status.
- Feedback, bug reports, feature suggestions, and evidence attachments.
- Explicit, revocable public-credit consent.
- Public credits output containing only approved display names and categories.
- Data export, correction, deletion, and retention workflows.

Create disabled-by-default Google Workspace and Google Play adapters. Enrollment
must always follow authenticated human approval. Support Google Groups where the
Play API does not support individual email-list automation. Use separate service
accounts and least scopes by integration purpose.

Without credentials, provide contract tests, fixtures, setup documentation, and
an `unavailable` integration state. Do not claim live enrollment works.

Gate: approval, consent, revocation, privacy, and adapter contract tests pass.

Commit: `Build secure beta operations workflow`

## Phase 6: Monitoring, Health, and Readiness

Implement ingestion interfaces and dashboards for:

- Website and API synthetic uptime.
- Play Developer Reporting crash, ANR, and performance data.
- Failed authentication and suspicious request summaries.
- Certificate expiration.
- Dependency and secret-scanning results.
- Backup age, success, and restore-test evidence.
- Integration failures and credential-age metadata.
- Current version, Play track, crash-free users, crash rate, downloads, rating,
  open bugs, testers, last build, automation status, and release readiness.

Implement the canonical 100-point Product Readiness Score and mandatory gate
overrides. Preserve score snapshots and evidence provenance. A high score must
never bypass a failed mandatory gate.

External API clients must use narrow scopes, timeouts, bounded retries with
jitter, pagination, quota handling, safe caching, freshness metadata, and
redacted errors. Prevent SSRF by allowlisting destinations and rejecting
operator-controlled arbitrary URLs.

Gate: fixture-based integration, stale-data, error, readiness, and mandatory
gate tests pass.

Commit: `Add product health monitoring and readiness scoring`

## Phase 7: Hardening and Release Preparation

Complete:

- Cross-role authorization audit.
- OWASP-focused negative tests for API and browser surfaces.
- Dependency, license, and secret scans.
- Backup and restore runbook plus a tested local restore procedure.
- Incident response, credential rotation, account recovery, data deletion,
  runner compromise, and audit-integrity runbooks.
- Performance budgets and accessibility checks.
- CI that runs deterministic checks without production secrets.
- Windows PowerShell setup and validation commands.
- Deployment documentation for separate public and private services.
- Environment-variable inventory with safe example values only.
- Final implementation status and remaining external gates.

Run the complete test suite twice from a clean state. Inspect generated output
and repository status. Remove generated secrets, temporary APKs, reports, test
artifacts, and machine-specific files from tracking.

Gate: all repository-controlled acceptance criteria pass with no known critical
or high-severity security defect.

Commit: `Harden Maxxed platform v1 implementation`

## External Gates Codex Must Not Fake

Record these as blocked external setup until an authorized operator completes
and verifies them:

- Purchase or recovery of `techmaxxed.com`.
- DNS changes and certificate activation.
- Creation of support, privacy, and beta mailboxes.
- Cloudflare or other production identity configuration.
- Production database and artifact-storage provisioning.
- Google Workspace service accounts, scopes, and administrator consent.
- Google Play Console access and API credentials.
- Real tester enrollment and email delivery.
- Physical Android device and television testing.
- Production signing material.
- Legal review of public policies.
- Production deployment and release promotion authorization.

## Final Acceptance

The task is complete only when:

- Existing public-site validation still passes.
- Private platform and runner have documented one-command Windows validation.
- RBAC is enforced server-side and covered by tests.
- Audit logging covers every implemented administrative mutation.
- The runner proves strict sequential execution under concurrency tests.
- Readiness scores cannot override mandatory gates.
- External integrations fail closed and report unavailable without credentials.
- No secret or private artifact is committed.
- `docs/PROJECT_CHECKLIST.md` reflects verified implementation truth.
- `docs/IMPLEMENTATION_STATUS.md` lists commits, tests, known limitations, and
  exact operator actions still required.
- The working tree is clean.

At completion, provide a concise report containing:

1. Phase and commit summary.
2. Commands and results for all validation gates.
3. Implemented security controls.
4. Unimplemented or externally blocked items.
5. Required environment configuration without secret values.
6. The next operator actions in order.

Do not deploy production, enroll real testers, change DNS, or promote a release
without explicit authorization after the final report.
