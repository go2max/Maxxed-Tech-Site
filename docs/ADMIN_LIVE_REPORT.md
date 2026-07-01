# Admin Live Operations Report

The admin report is a live-only page at `/report/`. It expects the private admin Worker endpoint:

```text
GET /api/report/live
```

The report must not fall back to `admin/data/admin-seed.json`. Static seed data is useful for layout checks, but it is not operational evidence.

## What the endpoint checks

- Public website availability for TechMaxxed, NorCal Cash For Cars, Maxxed Pix, and A. Bunch Mobile Notary.
- Expected text markers on each public site.
- Expected support route labels for each public site.
- Product public page availability.
- Product privacy page availability.
- Private integration connection state from Worker environment variables.

## Deployment requirements

Deploy the private Worker from `platform/` and route the endpoint through the protected admin host:

```text
admin.techmaxxed.com/api/report/live
```

The endpoint should sit behind the same admin authentication as the rest of the admin portal. Do not expose it on the public marketing host.

## Optional integration health bindings

The first live endpoint version performs public HTTP checks without credentials. These optional environment variables can later point at narrow health endpoints:

```text
GITHUB_ACTIONS_HEALTH_URL
PLAY_CONSOLE_HEALTH_URL
MAILBOX_HEALTH_URL
CLOUDFLARE_ACCESS_HEALTH_URL
RUNNER_HEALTH_URL
```

If a variable is missing, the integration appears as `not_connected`. That is deliberate; the report should show unknowns instead of pretending they are passing.
