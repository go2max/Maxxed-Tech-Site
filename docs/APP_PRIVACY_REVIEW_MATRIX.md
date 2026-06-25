# App Privacy Review Matrix

Last updated: June 25, 2026

This document is the repository-owned checklist for app-specific privacy pages and Google Play Data safety review. It is not legal advice. It exists so each public privacy policy is checked against the exact signed build before release.

## Required pre-release checks

For every app, confirm:

- Android manifest permissions match the public app privacy page.
- Dependency inventory confirms whether advertising, analytics, crash reporting, cloud sync, purchases, Google Play Games, or account services are enabled.
- Google Play Data safety answers match actual runtime behavior.
- Local storage, user exports, deletion controls, and retention statements are accurate.
- Support, beta, and privacy mailboxes are active before public launch.
- Store copy does not claim unavailable privacy behavior or final availability.

## Product checklist

### Maxxed Remote

Local-network TV remote. Check saved TV records, pairing credentials, local discovery permissions, secure local storage, TV manufacturer pairing behavior, and absence of unintended telemetry.

### Maxxed Compass

Offline navigation utility. Check location, background location, trip history, camera preview, sensor data, notifications, reboot recovery, and absence of network behavior unless separately disclosed.

### Maxxed Measure

Camera-assisted measurement utility. Check camera captures, known-reference calibration data, annotated history, document export behavior, backup behavior, and local deletion controls.

### Maxxed Gold Estimator

Offline visual estimator. Check sample photographs, material masks, user corrections, batch notes, CSV export behavior, and that the app does not claim assay, chemistry, valuation, or laboratory-grade verification.

### Fishing Maxxed

Offline-first catch journal. Check camera photos, exact location handling, region redaction, measurement data, exports, local ranking behavior, and non-authoritative regulation wording.

### Rival Rush

Local party game. Check player profiles, avatars, progress, gameplay counters, internal-test logs, advertising ID posture, ad provider flags, analytics provider behavior, Google Play Games status, age targeting, and family-policy posture.

## Release rule

A privacy page is not final until it has been compared to the signed build, manifest, dependency inventory, SDK flags, and Play Console Data safety answers. If a later build enables ads, analytics, cloud sync, sign-in, purchases, remote diagnostics, or a new export destination, update the app policy and Play declarations before publishing that build.
