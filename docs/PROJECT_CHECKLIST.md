# Maxxed Technical Systems Project Checklist

Last updated: June 26, 2026

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
- [ ] Private admin, monitoring, QA, beta automation, and general APK runner are built.
- [x] Maxxed Remote full UX/connection PowerShell script pack and admin catalog manifest are defined.
- [x] `plugins.techmaxxed.com` plugin lab has the 36 individual Maxxed WordPress plugins installed from uploadable ZIP packages.

## Public Website

### Complete

- [x] Home page and searchable application directory.
- [x] Public product catalog includes six Android apps, 36 WordPress plugins, 44 standalone repo products, and 100 powerhouse repo products.
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
- [x] Validation of 26 HTML pages and 780 local references.
- [x] Validation guards the 186-card public product catalog and 36-card WordPress plugin catalog.

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
- [x] Add privacy-respecting analytics after privacy disclosure update and CSP
      allowlist approval.

## Product Pages

These are website display states, not final Play Console approvals.

- [x] Product directory: 186 public catalog entries.
- [x] Maxxed Remote: listed as Release verification.
- [x] Maxxed Compass: listed as Release verification.
- [x] Maxxed Measure: listed as Active development.
- [x] Maxxed Gold Estimator: listed as Release verification.
- [x] Fishing Maxxed: listed as Release verification.
- [x] Rival Rush: listed as Internal testing.
- [x] WordPress Bulk Content Cleanup: retained as the seventh planned product.
- [ ] Connect product status to verified release evidence instead of manual copy.
- [ ] Add Play Store URLs, current versions, and release notes as products launch.

## WordPress Plugin Lab

- [x] 36 WordPress plugin repos have uploadable individual ZIP packages.
- [x] Each individual plugin ZIP has a valid root plugin folder and plugin header.
- [x] Hosted `plugins.techmaxxed.com` install completed through individual plugin uploads.
- [x] Hosted install handoff documents the difference between individual WP upload ZIPs and the bulk filesystem extraction bundle.
- [ ] Confirm hosted activation state for all 36 plugins after the next WordPress admin review.

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

### Not Yet Implemented

- [ ] Private identity provider integration.
- [ ] Owner MFA enrollment and recovery process.
- [ ] Server-enforced RBAC permission checks.
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

- [x] Add main-page quick runs for each current app.
- [x] Add individual app testing with single and multi-script selection.
- [x] Restrict job creation to server-owned approved app and script IDs.
- [x] Store immutable script order and job-creation audit events in D1.
- [x] Add executable app-specific runner packs for all six current apps.

### Phase 1: Next Engineering Milestone

- [x] Create a Windows-friendly local runner and operator interface.
- [x] Select an APK from local disk without executing it during inspection.
- [x] Calculate and record SHA-256.
- [x] Detect package name, version, and signing metadata.
- [x] Reject package and application mismatches.
- [x] Load only approved scripts for the selected application in the admin console.
- [x] Preserve operator-selected script order in each queued job.
- [x] Execute exactly one job and one script step at a time.
- [x] Lock the selected emulator or physical device for the job.
- [ ] Capture logcat, screenshots, video where enabled, performance, and failures.
- [x] Apply per-step timeouts and guaranteed cleanup.
- [x] Produce local HTML and JSON reports.
- [x] Recover safely after runner or device interruption.
- [x] Keep production signing keys and production secrets off the runner.

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
5. Begin Phase 1 of the local sequential APK runner.
6. Keep beta enrollment manual until authenticated approval and audit logging exist.

## Archived Completed Notes

- June 26, 2026: Fixed PR #53 for the public Tech Site 404 page. The 404
  page now uses root-relative CSS, JavaScript, manifest, favicon, navigation,
  and CTA links so deep missing routes render with site styling. CI failures
  were traced to brittle HTML validation: first an exact generated-page count,
  then a copied Google site-verification token being treated as a semantic
  webpage. `scripts/validate-site.mjs` now allows the current static HTML
  output count and skips Google verification-token files while keeping the
  real page metadata, landmark, canonical, local-reference, sitemap, manifest,
  and JavaScript checks. Latest GitHub Actions run #836 passed, and PR #53 was
  marked ready for review.
- June 26, 2026: Added Google Analytics measurement ID `G-FPG9XJHGHK`
  to the Tech Site, updated the Content Security Policy allowlist for Google
  Tag Manager and Google Analytics, updated the website privacy disclosure, and
  verified the generated site with `npm run build` and `npm run validate`.
- June 26, 2026: Expanded the public catalog to include all repo-backed
  ready products while excluding generated 1,000/1,500 item backlog inventories.
  The catalog now covers six Android apps, 36 WordPress plugins, 44 standalone
  repo products, and 100 powerhouse repo products. The hosted WordPress plugin
  lab install was completed on `plugins.techmaxxed.com` using the 36 individual
  uploadable plugin ZIP packages; the bulk `wp-content/plugins` bundle remains
  documented as File Manager/SSH only.

## Reference Documents

- `docs/CODEX_MASTER_BUILD_TASK.md`: phased implementation task for Codex.
- `docs/MAXXED_PLATFORM_V1_SPECIFICATION.md`: canonical platform requirements.
- `docs/PRIVATE_OPERATIONS_PLATFORM.md`: private dashboard and APK runner design.
- `docs/ADMIN_AND_BETA_AUTOMATION.md`: admin identity and beta automation plan.
- `docs/HOSTED_WORDPRESS_PLUGIN_INSTALL.md`: hosted WordPress plugin lab install notes.
- `docs/CHAT_ARCHIVE_2026-06-26_PLUGIN_CATALOG_AND_LAB.md`: archive note for the expanded catalog and hosted plugin lab install.
