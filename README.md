# Maxxed Technical Systems Website

Production-oriented multi-page company and app catalog for Maxxed Technical Systems. The public website is ordinary static HTML, CSS, JavaScript, and image files under `site/`.

## Website Summary

Use this copy when referencing the project from a portfolio, admin board, or product catalog:

> Maxxed-Tech-Site is the canonical public website for Maxxed Technical Systems. It contains the company homepage, app directory, active app pages, privacy policies, beta tester funnel, release queue, support/legal pages, sitemap, robots rules, manifest, security headers, and static deployment artifacts.

## Readiness

Current repository readiness is tracked in [`READINESS.md`](READINESS.md). Treat the source as launch-oriented, but do not mark the site publicly launched until the production domain, hosting, mailboxes, legal/support links, and final audit gates are verified.

## Pages

- Home and searchable app directory
- Dedicated pages and detailed privacy policies for all six active apps
- Seven-product release queue, About, Support, Terms, Privacy, and Accessibility
- Android beta application and opt-in beta tester credits
- Custom 404 page
- Sitemap, robots rules, web manifest, and security headers

## Validation

```powershell
npm run check
```

The command uses Node only. Bash and WSL are not required.

<!-- ADMIN_ACCESS_START -->
## Admin Access

The public website does not expose an admin login or admin routes. Admin work is handled through the separate private admin application.

Production admin URL:

- `https://admin.techmaxxed.com`

Access requirements:

- The admin hostname must be protected by Cloudflare Access or an equivalent identity-aware proxy.
- The signed-in identity must be included in the `ADMIN_ALLOWED_EMAILS` environment allowlist.
- Missing identity headers, missing allowlist configuration, or an email outside the allowlist must fail closed.
- Admin code, private data, release controls, beta review tools, and monitoring views must stay out of the public `site/` build.

Validation commands:

- `npm run admin:deployment:check`
- `npm run admin:check`
- `npm run check:admin-boundary`
- `npm run check`

Related docs:

- `docs/ADMIN_DEPLOYMENT_HARDENING.md`
- `docs/ADMIN_D1_MIGRATIONS.md`
- `docs/ADMIN_IDENTITY_GATE.md`
- `docs/ADMIN_AND_BETA_AUTOMATION.md`
- `docs/PRIVATE_OPERATIONS_PLATFORM.md`
<!-- ADMIN_ACCESS_END -->
## Deployment

Upload the contents of `site/` to any static host. `index.html` must remain at the root of the uploaded files. The same build also creates a validated Sites Worker artifact under `dist/`.

Current delivery status and remaining work are tracked in `docs/PROJECT_CHECKLIST.md`. The public site source is validated and present on GitHub, but production hosting, domain configuration, email activation, and the private operations platform remain separate unfinished work.

Before production launch, purchase the domain and activate these company-wide mailboxes or aliases:

- Domain: `https://techmaxxed.com`
- Support: `support@techmaxxed.com`
- Privacy: `privacy@techmaxxed.com`
- Beta program: `beta@techmaxxed.com`

## Public/Private Boundary

The public website intentionally does not include the private admin platform. The first release has no custom admin login. See `docs/ADMIN_AND_BETA_AUTOMATION.md` for the identity-gated admin and Google Play tester automation design.

The proposed private monitoring, release, help, and strictly sequential APK test system is specified in `docs/PRIVATE_OPERATIONS_PLATFORM.md`. It is a separate private application and is not included in the public deployment.

## Operations Documentation

- `docs/MAXXED_PLATFORM_V1_SPECIFICATION.md`: canonical security-first platform specification.
- `docs/MAXXED_REMOTE_OPERATIONS.md`: Maxxed Remote admin-to-runner checklist and recovery procedures.
- `docs/PORTFOLIO_TESTING_CONTROL_PLANE.md`: six-app batch testing console, package inventory, runner capability model, and lease protocol.
- `docs/RUNNER_FLEET_OPERATIONS.md`: runner identity, health monitoring, credential rotation, and exports.
- `docs/PRIVATE_TEST_EVIDENCE.md`: R2-backed private test evidence, retention, and incident handling.
- `docs/REGRESSION_SCHEDULING.md`: scheduled portfolio regressions and prior-run comparisons.
- `docs/AUTOMATIC_DEVICE_POOLS.md`: compatible-device routing and per-device capacity.
- `docs/ACCESS_DIRECTORY_OPERATIONS.md`: D1-backed user roles, bootstrap, last-Owner protection, and recovery.
- `docs/ENCRYPTED_BACKUP_OPERATIONS.md`: encrypted backup automation and disaster recovery.
- `docs/KNOWLEDGE_BASE_OPERATIONS.md`: knowledge-base draft, review, publication, archive, and audit procedures.
- `docs/READINESS_SECURITY_MONITORING.md`: evidence-based readiness scoring, release gates, security findings, and monitoring freshness.
- `docs/BETA_ENROLLMENT_OPERATIONS.md`: beta approval, Google Groups, Play track sync boundaries, tester events, public credits, and privacy request handling.
- `docs/FINAL_REPOSITORY_AUDIT.md`: final repository-owned completion audit and remaining external launch gates.

## Launch Gate

Mark the public website ready only after `npm run check` passes on the launch commit, the deployed site is live on the production domain, company mailboxes work, policy/support links resolve correctly, and `docs/FINAL_REPOSITORY_AUDIT.md` has no unresolved repository-owned blockers.

