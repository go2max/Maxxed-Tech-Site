# Admin Deployment Hardening

This prepares the private admin platform for a separate admin.techmaxxed.com deployment.

## Production requirements

- Cloudflare Access protects every admin route.
- ADMIN_ALLOW_MOCK_IDENTITY=false in production.
- ADMIN_REQUIRE_ACCESS=true in production.
- Production host is admin.techmaxxed.com.
- D1 is bound as ADMIN_DB.
- Private evidence storage is bound separately from public assets.
- Secrets stay in hosted secret storage, never source.

## Validation

`npm run admin:deployment:check`
