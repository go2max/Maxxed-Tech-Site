# Privacy Launch Review

Last updated: June 25, 2026

This review keeps the website launch tied to the actual app behavior before any public release.

## Before deploying the public site

- Confirm `support@techmaxxed.com`, `privacy@techmaxxed.com`, and `beta@techmaxxed.com` are active.
- Confirm every app privacy URL opens from the app product page and from the company privacy page.
- Confirm no website analytics, ad pixels, or account scripts are added unless the privacy page is updated first.
- Confirm the final static site build is regenerated after any change to `content/privacy-data.mjs`.

## Before publishing each app

- Compare the public privacy page to the signed app build.
- Compare the policy to the manifest permissions.
- Compare the policy to the dependency and SDK inventory.
- Confirm Google Play Data safety answers match actual runtime behavior.
- Confirm local deletion, export behavior, and retention wording are accurate.

## App-specific review focus

- Maxxed Remote: saved TVs, pairing credentials, local network discovery, and TV manufacturer pairing behavior.
- Maxxed Compass: location, background trip tracking, camera preview, sensors, notifications, and no unintended network behavior.
- Maxxed Measure: camera captures, calibration data, annotated history, document exports, and local deletion.
- Maxxed Gold Estimator: sample photos, material masks, user corrections, CSV exports, and no assay or valuation claims.
- Fishing Maxxed: catch photos, exact location handling, region redaction, exports, and regulation disclaimers.
- Rival Rush: local profiles, progress, internal-test logs, advertising ID posture, analytics path, ad-provider flags, Google Play Games status, age targeting, and family-policy review.
