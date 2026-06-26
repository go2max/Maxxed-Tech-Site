# Build Admin Platform v1 skeleton

## Summary

- Adds a separate private admin app intended for `admin.techmaxxed.com`.
- Seeds the admin product catalog from repo-owned product data and roadmap entries.
- Adds RBAC, Cloudflare Access-compatible identity adapter, mutation helpers, audit-event requirements, D1/SQLite schema, admin build output, boundary validation, and docs.
- Keeps the public `site/` bundle free of admin code and private references.

## Product seed source

Seed source: `content/site-data.mjs` apps + roadmap.

Active/queued products:

- Maxxed Remote
- Maxxed Compass
- Maxxed Measure
- Maxxed Gold Estimator
- Fishing Maxxed
- Rival Rush
- WordPress Bulk Content Cleanup

## Validation

Run before merge:

```bash
npm run admin:check
npm run check:admin-boundary
npm run check
```

## Remaining external setup

- DNS for `admin.techmaxxed.com`
- Cloudflare Access policy
- D1 production database
- R2 evidence bucket
- Google Play API credentials
- Google Workspace/Groups credentials
- Mailbox activation
- Android runner credentials
