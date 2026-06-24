# Maxxed Technical Systems Website

Production-oriented multi-page company and app catalog for Maxxed Technical
Systems. The public website is ordinary static HTML, CSS, JavaScript, and image
files under `site/`.

## Pages

- Home and searchable app directory
- Dedicated pages and detailed privacy policies for all six active apps
- Seven-product release queue, About, Support, Terms, Privacy, and Accessibility
- Android beta application and opt-in beta tester credits
- Custom 404 page
- Sitemap, robots rules, web manifest, and security headers

## Windows, macOS, or Linux

```powershell
npm run check
```

The command uses Node only. Bash and WSL are not required.

## Deployment

Upload the contents of `site/` to any static host. `index.html` must remain at
the root of the uploaded files. The same build also creates a validated Sites
Worker artifact under `dist/`.

Current delivery status and remaining work are tracked in
`docs/PROJECT_CHECKLIST.md`. The public site source is validated and present on
GitHub, but production hosting, domain configuration, email activation, and the
private operations platform remain separate unfinished work.

Before production launch, purchase the domain and activate these company-wide
mailboxes or aliases:

- Domain: `https://techmaxxed.com`
- Support: `support@techmaxxed.com`
- Privacy: `privacy@techmaxxed.com`
- Beta program: `beta@techmaxxed.com`

The first release intentionally has no custom admin login. See
`docs/ADMIN_AND_BETA_AUTOMATION.md` for the identity-gated admin and Google Play
tester automation design.

The proposed private monitoring, release, help, and strictly sequential APK
test system is specified in `docs/PRIVATE_OPERATIONS_PLATFORM.md`. It is a
separate private application and is not included in the public deployment.

`docs/MAXXED_PLATFORM_V1_SPECIFICATION.md` is the canonical security-first
platform specification. Supporting design documents must follow its RBAC,
audit, promotion, privacy, and readiness-gate requirements.

The production checklist and recovery procedures for the Maxxed Remote
admin-to-runner test are in `docs/MAXXED_REMOTE_OPERATIONS.md`.

The six-app batch testing console, package inventory, runner capability model,
and lease protocol are documented in
`docs/PORTFOLIO_TESTING_CONTROL_PLANE.md`.

Runner fleet identity, health monitoring, credential rotation, and result
exports are documented in `docs/RUNNER_FLEET_OPERATIONS.md`.

Private R2-backed test evidence, integrity checks, retention, and incident
handling are documented in `docs/PRIVATE_TEST_EVIDENCE.md`.

Scheduled portfolio regressions, cron dispatch, and prior-run comparisons are
documented in `docs/REGRESSION_SCHEDULING.md`.

Automatic compatible-device routing and server-enforced per-device capacity are
documented in `docs/AUTOMATIC_DEVICE_POOLS.md`.

Persistent D1-backed user roles, bootstrap, last-Owner protection, and recovery
are documented in `docs/ACCESS_DIRECTORY_OPERATIONS.md`.

Encrypted D1 backup automation, private storage, restore verification, retention,
and disaster recovery are documented in `docs/ENCRYPTED_BACKUP_OPERATIONS.md`.

Versioned knowledge-base drafts, review approval, publication, archiving, and
audit procedures are documented in `docs/KNOWLEDGE_BASE_OPERATIONS.md`.

Evidence-based readiness scoring, mandatory release gates, security findings,
and monitoring freshness are documented in `docs/READINESS_SECURITY_MONITORING.md`.

Beta approval, Google Groups and Play track sync boundaries, tester events,
public credits, and privacy request handling are documented in
`docs/BETA_ENROLLMENT_OPERATIONS.md`.
