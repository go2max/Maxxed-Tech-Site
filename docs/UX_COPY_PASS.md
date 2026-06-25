# UX Copy Pass

Date: June 25, 2026

## Goal

Make the public site feel more like a useful product storefront and less like an internal project tracker, while keeping availability, privacy, and product-limit claims conservative.

## Applied wording rules

- Lead with what the user can do, not the internal build state.
- Replace heavy project labels such as `Release verification` with softer public labels such as `Release prep`, `In development`, and `Internal testing`.
- Keep exactness claims conservative for camera, measurement, navigation, fishing, and visual-estimation products.
- Use `requestable` only for demand capture. Do not imply those products are shipped.
- Keep privacy and local-first claims tied to the documented product behavior.

## Product wording changes

- Maxxed Remote now emphasizes local-network TV control, compatible Samsung Tizen and LG webOS support, saved devices, and no server-routed TV commands.
- Maxxed Compass now emphasizes offline field use, true north, trip recovery, sky guidance, and local data handling.
- Maxxed Measure now emphasizes known-reference calibration, draggable endpoints, persistent review, uncertainty, and explicit export.
- Gold Estimator now emphasizes conservative offline visual estimates and avoids assay, appraisal, or valuation claims.
- Fishing Maxxed now emphasizes offline catch journaling, known-reference measurement, local records, coordinate redaction, and official regulation verification.
- Rival Rush now emphasizes quick local competition and internal testing without overpromising final art, balance, or feature state.

## Launch board wording changes

- Renamed the public-facing framing from `Launch Board` to `Product Lineup`.
- Reworked the hero to explain ready-to-evaluate, release-prep, internal-testing, and requestable categories.
- Replaced internal-sounding labels with clearer user-facing labels.
- Added stronger guardrails around requestable products and full-catalog import.

## Follow-up UX work

- Rework the generated homepage hero and app directory layout in `scripts/build.mjs`.
- Add more visual hierarchy to product cards and category sections.
- Consider making `/apps/` the main public storefront and keeping `/portfolio/` as a secondary lineup/status page.
- Add stronger screenshots and product-specific CTA blocks after each app reaches signed-build readiness.
