# Admin Deployment

## Hostname

Deploy the private admin app to `admin.techmaxxed.com`. Do not deploy it inside the public `techmaxxed.com` static bundle.

## Cloudflare Access

1. Create an Access application for `admin.techmaxxed.com`.
2. Allow only approved Maxxed Technical Systems identities.
3. Require MFA for all privileged roles.
4. Pass authenticated identity headers to the admin worker/app.
5. Deny by default.

## Build

```bash
npm run admin:seed
npm run admin:build
npm run admin:test
npm run check:admin-boundary
```

The admin build output is `dist-admin/`. The public site output remains `site/`.

## Remaining external setup

- DNS for `admin.techmaxxed.com`
- Cloudflare Access policy
- D1 production database
- R2 evidence bucket
- Google Play Developer API credentials
- Google Play Developer Reporting API credentials
- Google Workspace / Groups credentials
- Mailbox activation for support, beta, and privacy
- Android runner credentials and lease configuration
