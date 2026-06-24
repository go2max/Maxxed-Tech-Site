# Maxxed Technical Systems Project Checklist

Last updated: June 23, 2026

This checklist is the current source of truth for the public website and the
planned private Maxxed Platform. A checked item means the work exists and has
been verified. A specification or design document does not count as an
implemented feature.

## Current Snapshot

- [x] Public multi-page website source is complete for the initial launch.
- [x] Website build and validation pass on Node.js without Bash or WSL.
- [x] Wave 1 platform foundation and post-merge hardening are merged on GitHub `main` through PRs #6 and #7 at commit `b6975f1`.
- [x] The final Wave 1 Windows CI gate and tracked-file secret scan passed.
- [x] A sanitized Wave 1 restart checkpoint is stored in `docs/WAVE1_RESTART_CHECKPOINT.md`.
- [ ] Public website is deployed to production hosting.
- [ ] `techmaxxed.com` is purchased, connected, and serving the site.
- [ ] Production support, privacy, and beta email addresses are active.
- [ ] Private admin, monitoring, QA, beta automation, and APK runner are production-configured and deployed.

## Public Website

### Complete

- [x] Home page and searchable application directory.
- [x] Dedicated pages for the six active products.
- [x] Detailed product-specific privacy pages.
- [x] About, Roadmap, Help, Privacy, Terms, and Accessibility pages.
- [x] Android-first beta tester application page.
- [x] Opt-in beta tester credits page.
- [x] Responsive navigation and mobile layouts.
- [x] Custom 404 page.
- [x] Canonical URLs and unique page titles and descriptions.
- [x] Open Graph, Twitter card, and organization metadata.
- [x] `robots.txt`, sitemap, web manifest, and favicon.
- [x] Generated security headers.
- [x] Static HTML output under `site/`.
- [x] Valid ESM Worker artifact with `default.fetch`.
- [x] Validation of 23 HTML pages and 597 local references.

### Production Launch

- [ ] Purchase or recover `techmaxxed.com`.
- [ ] Select production hosting and deploy the contents of `site/`.
- [ ] Connect DNS and verify HTTPS certificate issuance.
- [ ] Confirm security headers on the live domain.
- [ ] Activate `support@techmaxxed.com`.
- [ ] Activate `privacy@techmaxxed.com`.
- [ ] Activate `beta@techmaxxed.com`.
- [ ] Test every page, navigation path, email link, and form on desktop and mobile.
- [ ] Verify sitemap and robots files on the live domain.
- [ ] Register the domain with Google Search Console and Bing Webmaster Tools.
- [ ] Perform a final accessibility and performance review against the live site.
- [ ] Review legal and privacy text against the exact production app builds.

### Post-Launch Improvements

- [ ] Add final Play Store links only after each listing is public.
- [ ] Add approved screenshots and store artwork for the remaining applications.
- [ ] Replace email-preparation beta intake with a secure server-side workflow.
- [ ] Add an uptime monitor for the public website.
- [ ] Add privacy-respecting analytics only after the disclosure and consent model
      is approved.

## Product Pages

These are website display states, not final Play Console approvals.

- [x] Maxxed Remote: listed as Release verification.
- [x] Maxxed Compass: listed as Release verification.
- [x] Maxxed Measure: listed as Active development.
- [x] Maxxed Gold Estimator: listed as Release verification.
- [x] Fishing Maxxed: listed as Release verification.
- [x] Rival Rush: listed as Internal testing.
- [x] WordPress Bulk Content Cleanup: retained as the seventh planned product.
- [ ] Connect product status to verified release evidence instead of manual copy.
- [ ] Add Play Store URLs, current versions, and release notes as products launch.

## Beta Program

### Complete

- [x] Android-first recruitment page.
- [x] App-interest selection.
- [x] Device, Android version, experience, and credit-name fields.
- [x] Voluntary and unpaid participation disclosure.
- [x] Separate consent for public tester credit.
- [x] Beta credits page with no names published by default.
- [x] Manual approval is required before tester enrollment.

### Remaining

- [ ] Activate the beta mailbox.
- [ ] Document the manual application review procedure.
- [ ] Create approved Google Groups for application-specific testing tracks.
- [ ] Configure a Google Workspace service account with minimum required scope.
- [ ] Build an authenticated approval queue for the Beta Manager.
- [ ] Add approved testers to Google Groups only after explicit review.
- [ ] Synchronize groups with supported Google Play testing tracks.
- [ ] Record invitation, approval, enrollment, removal, and consent events.
- [ ] Provide tester data correction and deletion workflows.
- [ ] Publish opted-in credits after verification.

## Security-First Platform Specification

### Design Complete

- [x] Security-first principle and system boundaries.
- [x] Role-Based Access Control model and role definitions.
- [x] Separation-of-duties requirements.
- [x] MFA, session expiration, rate limiting, and secure-default requirements.
- [x] Immutable administrative audit-log requirements.
- [x] Release approval pipeline and mandatory promotion gates.
- [x] Product health and security dashboard requirements.
- [x] QA assignments, bug tracking, automation evidence, and tester records.
- [x] Product Readiness Score and mandatory gate model.
- [x] Internal knowledge-base requirements.
- [x] Backup, retention, secret-management, and incident requirements.
- [x] Sequential APK automation architecture.

### Foundation Complete

- [x] Separate private Worker boundary and independent hosting configuration for the private platform.
- [x] Trusted server-side identity extraction with an explicit development-only override gate.
- [x] Deny-by-default representative route authorization with canonical role and permission mappings.
- [x] Signed session-cookie model with expiry, origin checks, CSRF enforcement, and strict security headers.
- [x] Focused regression tests for unauthenticated rejection, role allow/deny behavior, role-header distrust, CSRF/origin rejection, stored-XSS escape paths, and secret redaction.

### Persistence Complete

- [x] Initial D1-oriented SQL migration catalog for users, roles, products, builds, releases, QA, bugs, beta records, automation jobs, incidents, integrations, knowledge-base entries, readiness snapshots, and audit events.
- [x] Deterministic transactional persistence harness for repository and service tests, including a D1-shaped adapter.
- [x] Append-only audit hash chaining with integrity verification.
- [x] Authorization-tested services covering the required record families.
- [x] Rollback strategy documentation for schema and data recovery.

### Dashboard Complete

- [x] Private portfolio overview route backed by persisted records.
- [x] Role-scoped routes for releases, QA, bugs, beta applications, automation, incidents, audit inspection, knowledge base, and readiness.
- [x] Dashboard route tests proving representative allow and deny flows.

### Runner Foundation Complete

- [x] Windows-first local runner command path using Node and PowerShell-friendly arguments.
- [x] APK dry-run inspection using streamed local bytes plus test-only sidecar metadata without installation or execution.
- [x] Product matching fails closed when real package IDs are not configured locally.
- [x] Allowlisted script-pack manifests bound to the detected application package ID.
- [x] Sequential step execution with durable runner and device lease state.
- [x] Deterministic JSON and HTML report generation.
- [x] Runner tests for dry run, mismatch rejection, allowlist enforcement, failure redaction, and lease contention.

### Not Yet Implemented

- [ ] Private identity provider integration.
- [ ] Owner MFA enrollment and recovery process.
- [ ] User and role administration mutations.
- [ ] Google Play Developer Reporting API synchronization.
- [ ] Uptime and certificate monitoring.
- [ ] Dependency and secret-scanning integration.
- [ ] Backup automation and restore testing.
- [ ] Internal knowledge base editing workflow.
- [ ] Product Readiness Score calculation and evidence gates in the dashboard.
- [ ] Full beta enrollment workflow and adapters.
- [x] Repository hardening and release-preparation runbooks.

## Sequential APK Test Environment

### Phase 1: Next Engineering Milestone

- [x] Create a Windows-friendly local runner and operator interface.
- [x] Select an APK from local disk without executing it during inspection.
- [x] Calculate and record SHA-256.
- [x] Detect package name, version, and signing metadata using sidecar-backed dry-run metadata.
- [x] Reject package and application mismatches.
- [x] Load only approved scripts for the detected application.
- [x] Allow the operator to order scripts before execution.
- [x] Execute exactly one job and one script step at a time.
- [x] Lock the selected emulator or physical device for the job.
- [ ] Capture logcat, screenshots, video where enabled, performance, and failures.
- [x] Apply per-step timeouts and hard child-process termination.
- [x] Produce local HTML and JSON reports.
- [x] Recover safely after stale runner or device interruption.
- [x] Keep production signing keys and production secrets off the runner.

### Later Phases

- [ ] Phase 2: private read-only health and monitoring dashboard.
- [ ] Phase 3: hosted control plane, private artifact storage, and pull runners.
- [ ] Phase 4: beta enrollment and controlled release automation.
- [ ] Phase 5: multiple device pools.
- [x] Phase 5: deterministic prior-run regression comparison and scheduled portfolio reports.

## Immediate Next Actions

1. Purchase or recover `techmaxxed.com`.
2. Deploy the validated public site and connect DNS.
3. Activate the three public email addresses.
4. Run live desktop, mobile, security-header, SEO, and accessibility checks.
5. Complete the remaining beta, monitoring, and hardening phases.
6. Keep beta enrollment manual until authenticated approval and audit logging exist.

## Reference Documents

- `docs/CODEX_MASTER_BUILD_TASK.md`: phased implementation task for Codex.
- `docs/MAXXED_PLATFORM_V1_SPECIFICATION.md`: canonical platform requirements.
- `docs/PRIVATE_OPERATIONS_PLATFORM.md`: private dashboard and APK runner design.
- `docs/ADMIN_AND_BETA_AUTOMATION.md`: admin identity and beta automation plan.
- `docs/PLATFORM_ROLLBACK_STRATEGY.md`: migration and recovery posture.
- `docs/WAVE1_RESTART_CHECKPOINT.md`: sanitized project state and restart instructions.
