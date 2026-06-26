# Maxxed Admin Platform v1

This is the private admin-platform skeleton for Maxxed Technical Systems. It is intentionally separated from the public static `site/` bundle and is intended for `admin.techmaxxed.com` behind Cloudflare Access or an equivalent identity-aware proxy.

## Local commands

```bash
npm run admin:seed
npm run admin:build
npm run admin:test
npm run admin:check
npm run check:admin-boundary
```

## Boundary

The public website remains a static product catalog. Admin code, credentials, write APIs, private metrics, APK uploads, internal runbooks, and test evidence must never be emitted into `site/`.

## Local identity

Production mode requires trusted identity headers from the access layer. A local mock identity can be enabled only with `ADMIN_ALLOW_MOCK_IDENTITY=true`; this must never be enabled for production deployment.
