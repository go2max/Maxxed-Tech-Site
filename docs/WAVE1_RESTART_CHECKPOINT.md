# Wave 1 Restart Checkpoint

Last updated: June 23, 2026

This document is a sanitized engineering checkpoint for resuming the Maxxed
Technical Systems website and private platform work. It intentionally excludes
chat transcripts, credentials, secrets, private identity data, and unpublished
operational details.

## Repository State

- Repository: `go2max/Maxxed-Tech-Site`
- Wave 1 foundation merged through PR #6.
- Post-merge hardening merged through PR #7.
- Recorded `main` checkpoint: `b6975f1`.
- Final Windows CI and tracked-file secret scanning passed.
- The public site and private platform remain separate deployment surfaces.

## Public Website

The launch-oriented public website is generated as static HTML under `site/`.
The validated build contains 23 HTML pages and 597 checked local references.

The public portfolio currently covers:

- Maxxed Remote
- Maxxed Compass
- Maxxed Measure
- Maxxed Gold Estimator
- Fishing Maxxed
- Rival Rush
- WordPress Bulk Content Cleanup

The site also includes product privacy pages, help and legal pages, an
Android-first beta application page, and an opt-in tester credits page.

For local review, build first and serve the generated directory:

```powershell
npm install
npm run check
py -m http.server 8080 --directory site
```

Then open `http://localhost:8080/`. The source entry is not a single root
`index.html`; the deployable home page is `site/index.html` after the build.

## Private Platform

Repository-controlled foundations exist for:

- authenticated private routes and deny-by-default role checks
- signed sessions, CSRF and origin enforcement, and security headers
- D1-oriented persistence, migrations, and prepared database operations
- append-only audit integrity
- operational dashboard routes and audited service mutations
- release gates, beta adapter contracts, and readiness calculations
- sequential APK test execution with package-bound script manifests
- restricted child processes, timeouts, leases, recovery, and local reports

These foundations do not mean the admin platform is live. Production identity,
MFA enrollment, database bindings, hosting, credentials, and operator
provisioning still have to be configured and verified.

## External Gates

The following remain outside the completed repository work:

- acquire or recover `techmaxxed.com`
- configure DNS, HTTPS, and production hosting
- activate support, privacy, and beta mailboxes
- configure the production identity-aware proxy and owner MFA
- provision production database and artifact storage bindings
- provide approved Google Workspace or Google Play credentials
- configure real local product package identifiers for APK testing
- perform physical Android and television validation
- authorize production deployment and release promotion

Beta enrollment remains manual until authenticated approval, consent,
auditability, and external credentials are operational.

## Resume Procedure

```powershell
cd C:\Users\max\Downloads\Maxxed-Tech-Site
git fetch origin
git switch main
git pull --ff-only
npm install
npm run check
node .\scripts\security-scan.mjs
```

Before beginning another implementation wave, review:

1. `docs/PROJECT_CHECKLIST.md`
2. `docs/IMPLEMENTATION_STATUS.md`
3. `docs/MAXXED_PLATFORM_V1_SPECIFICATION.md`
4. `docs/CODEX_MASTER_BUILD_TASK.md`
5. `docs/ENVIRONMENT_VARIABLES.md`

The next work should be selected from unchecked checklist items. Production
configuration and deployment must not be marked complete until verified against
the live environment.
