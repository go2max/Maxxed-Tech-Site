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
