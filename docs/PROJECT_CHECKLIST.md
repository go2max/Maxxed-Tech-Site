# Maxxed Technical Systems Project Checklist

Last updated: June 23, 2026

This checklist is the current source of truth for the public website and the
planned private Maxxed Platform. A checked item means the work exists and has
been verified. A specification or design document does not count as an
implemented feature.

## Current Snapshot

- [x] Public multi-page website source is complete for the initial launch.
- [x] Website build and validation pass on Node.js without Bash or WSL.
- [x] Full source is restored on GitHub `main` at commit `7f2be00`.
- [ ] Public website is deployed to production hosting.
- [ ] `techmaxxed.com` is purchased, connected, and serving the site.
- [ ] Production support, privacy, and beta email addresses are active.
- [ ] Private admin, monitoring, QA, beta automation, and APK runner are built.

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
- [x] Focused tests proving unauthenticated rejection, role allow/deny behavior, role-header distrust, CSRF/origin rejection, and secret redaction.

### Not Yet Implemented

- [ ] Private identity provider integration.
- [ ] Owner MFA enrollment and recovery process.
- [ ] User and role administration.
- [ ] Append-only audit event store and integrity verification.
- [ ] Product and release database.
- [ ] QA assignment and test-result database.
- [ ] Bug and feature-request tracking.
- [ ] Security and product-health dashboards.
- [ ] Google Play Developer Reporting API synchronization.
- [ ] Uptime and certificate monitoring.
- [ ] Dependency and secret-scanning integration.
- [ ] Backup automation and restore testing.
- [ ] Internal knowledge base.
- [ ] Product Readiness Score calculation and evidence gates.

## Sequential APK Test Environment

### Phase 1: Next Engineering Milestone

- [ ] Create a Windows-friendly local runner and operator interface.
- [ ] Select an APK from local disk without executing it during inspection.
- [ ] Calculate and record SHA-256.
- [ ] Detect package name, version, and signing metadata.
- [ ] Reject package and application mismatches.
- [ ] Load only approved scripts for the detected application.
- [ ] Allow the operator to order scripts before execution.
- [ ] Execute exactly one job and one script step at a time.
- [ ] Lock the selected emulator or physical device for the job.
- [ ] Capture logcat, screenshots, video where enabled, performance, and failures.
- [ ] Apply per-step timeouts and guaranteed cleanup.
- [ ] Produce local HTML and JSON reports.
- [ ] Recover safely after runner or device interruption.
- [ ] Keep production signing keys and production secrets off the runner.

### Later Phases

- [ ] Phase 2: private read-only health and monitoring dashboard.
- [ ] Phase 3: hosted control plane, private artifact storage, and pull runners.
- [ ] Phase 4: beta enrollment and controlled release automation.
- [ ] Phase 5: multiple device pools, regression comparison, and scheduled reports.

## Immediate Next Actions

1. Purchase or recover `techmaxxed.com`.
2. Deploy the validated public site and connect DNS.
3. Activate the three public email addresses.
4. Run live desktop, mobile, security-header, SEO, and accessibility checks.
5. Begin Phase 2 of the private platform data and audit implementation.
6. Keep beta enrollment manual until authenticated approval and audit logging exist.

## Reference Documents

- `docs/CODEX_MASTER_BUILD_TASK.md`: phased implementation task for Codex.
- `docs/MAXXED_PLATFORM_V1_SPECIFICATION.md`: canonical platform requirements.
- `docs/PRIVATE_OPERATIONS_PLATFORM.md`: private dashboard and APK runner design.
- `docs/ADMIN_AND_BETA_AUTOMATION.md`: admin identity and beta automation plan.
