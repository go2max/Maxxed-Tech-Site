# Site Finish Handoff

Last updated: June 25, 2026

## Completed in this branch

- Expanded app-specific privacy source data for all six active Android products.
- Added app privacy review matrix for Play Data safety and signed-build checks.
- Added privacy launch review for website deployment and product release gating.

## Important follow-up before merge or deploy

Run the repository checks locally or in CI:

```powershell
npm run check
```

The build should regenerate static files under `site/` from `content/privacy-data.mjs`. If the regenerated app privacy pages differ from the committed static output, commit the generated site files before deployment.

## External launch gates

- Deploy `site/` to production hosting.
- Connect `techmaxxed.com` with HTTPS.
- Activate support, privacy, and beta email addresses.
- Confirm app privacy pages and Play Data safety answers against each signed release build.
