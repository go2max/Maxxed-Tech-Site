# Admin Operations Checklist

## Before deployment

- [ ] Confirm public site builds and validates.
- [ ] Confirm admin app builds separately.
- [ ] Confirm `site/` contains no admin bundle or private references.
- [ ] Configure Cloudflare Access for `admin.techmaxxed.com`.
- [ ] Require MFA for privileged roles.
- [ ] Create production D1 database.
- [ ] Apply `admin/db/schema.sql`.
- [ ] Configure hosted secrets.
- [ ] Set up R2 evidence bucket if APK/test evidence is enabled.
- [ ] Configure Google Play API only with least privilege.
- [ ] Configure Google Workspace/Groups only after group addresses are accepted by Play tracks.
- [ ] Activate support, beta, and privacy mailboxes.

## Validation

```bash
npm run admin:check
npm run check:admin-boundary
npm run check
```

## Release rule

Passing tests can prepare a release, but production promotion requires explicit authorized approval and a complete release gate.
