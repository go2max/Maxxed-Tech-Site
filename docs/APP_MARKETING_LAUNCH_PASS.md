# App Marketing Launch Pass

Date: June 25, 2026
Canonical repository: `go2max/Maxxed-Tech-Site`
Deprecated scratch repository: `go2max/Maxxed-Apps-Site`

## Purpose

This pass merges the useful marketing/tester-funnel planning from the scratch app-site repository into the canonical Maxxed Technical Systems website repository. `Maxxed-Tech-Site` remains the source of truth for public website content, app catalog pages, beta program copy, privacy pages, roadmap pages, SEO files, and deployment artifacts.

## Current public lineup

| App | Marketing state | Public positioning |
| --- | --- | --- |
| Maxxed Remote | Release verification | Best first utility marketing target. Promote as early access until public Play listing is live. |
| Maxxed Compass | Release verification | Outdoor/navigation content target. Keep accuracy and battery claims conservative until final field validation. |
| Maxxed Measure | Active beta candidate | Market as measurement assistance with uncertainty, not certified precision. |
| Fishing Maxxed | Release verification | Seasonal tester funnel for anglers. Keep regulation/measurement language conservative. |
| Maxxed Gold Estimator | Beta prototype | Market as visual estimates only. Good for prospecting feedback and sample-validation content. |
| Rival Rush | Internal testing | Use for social clips and tester recruitment until Play Console/internal testing link is stable. |

## Marketing order

1. **Lead with Maxxed Remote** because the pain point is obvious: lost remotes, frustrating TV controls, and cleaner living-room control.
2. **Use Maxxed Compass for outdoor reach** with camping, hiking, and field-use posts while avoiding unsupported precision claims.
3. **Recruit testers by category** instead of treating the whole app suite as one audience. TV, hiking, fishing, prospecting, DIY, and party-game users should each get their own hook.
4. **Track interest manually first** using email or a lightweight form before adding automation. Capture app interest, Android model, feedback quality, and opt-in credit preference.

## Beta funnel copy

Suggested subject line: `Maxxed Apps Beta Request`

Ask testers to include:

- Apps they want to test
- Android device model
- Whether they want public beta credit
- Short notes about the use case they care about

## Immediate website tasks

- Keep all public app pages in `site/apps/` inside `Maxxed-Tech-Site`.
- Add public Play Store links as listings become available.
- Add product screenshots or short video thumbnails per app.
- Add QR code assets for local flyers and tester outreach.
- Add per-app marketing/SEO copy only after the app has a stable test or release route.
- Keep status labels conservative until release checks are complete.

## Repository cleanup plan

`go2max/Maxxed-Apps-Site` should not be used for production. After this PR is merged, archive or delete that repository from GitHub settings. If deletion is not immediately performed, leave only a deprecation README that points back to `go2max/Maxxed-Tech-Site`.
