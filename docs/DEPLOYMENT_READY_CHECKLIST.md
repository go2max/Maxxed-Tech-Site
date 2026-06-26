# Deployment Ready Checklist

Date: June 25, 2026

## Repository status

The public website source is ready for Hostinger Git auto update from the committed `site/` directory. CI validates the generated static site with `npm run check` before changes are merged.

Current repository cleanup status:

- `go2max/Maxxed-Tech-Site` remote branch cleanup is complete. The only remote branches should be `origin/HEAD -> origin/main` and `origin/main`.
- `go2max/Post-Purge-Pro` PR #3 (`Import generated Post Purge Pro release`) was merged by the owner after CI passed.
- `go2max/Post-Purge-Pro` branch cleanup should leave only `origin/HEAD -> origin/main` and `origin/main` after `codex/complete-safe-mvp` and any stale `import-generated-release` ref are pruned/deleted.
- Chat archive for the Maxxed Remote/admin testing control-plane build and branch cleanup is recorded in `docs/CHAT_ARCHIVE_2026-06-25_REMOTE_ADMIN_BRANCH_CLEANUP.md`.

## Canonical production path

Hostinger is the production host. The expected configuration is:

- Repository: `go2max/Maxxed-Tech-Site`
- Branch: `main`
- Public directory: `site`
- Entry file: `site/index.html`
- Auto update: enabled for pushes or merges to `main`

A merge to `main` should update Hostinger automatically as long as Hostinger continues to pull from `main` and serves the contents of `site/` as the document root.

## GitHub Actions note

GitHub Actions remains responsible for validation only. The workflow file `.github/workflows/pages.yml` is intentionally a manual note workflow and does not deploy GitHub Pages. This avoids creating a second production path while Hostinger is the canonical host.

## Live verification after each merge

After a merge to `main`, verify the Hostinger refresh by checking at least one recently changed page or asset:

- `https://techmaxxed.com/`
- `https://techmaxxed.com/apps/`
- `https://techmaxxed.com/portfolio/`
- `https://techmaxxed.com/llms.txt`
- `https://techmaxxed.com/sitemap.xml`
- `https://techmaxxed.com/robots.txt`

If content looks stale, check Hostinger deployment logs first, then confirm it is pulling `main` and serving `site/` rather than the repository root.

## DNS and domain

Hostinger should serve:

- `techmaxxed.com`
- `www.techmaxxed.com` if configured

Verify:

- HTTPS certificate is active.
- `https://techmaxxed.com/` serves the current home page.
- `https://techmaxxed.com/apps/` serves the product directory.
- `https://techmaxxed.com/portfolio/` serves the Product Lineup page.
- `https://techmaxxed.com/llms.txt` serves the AI/search discovery file.
- `https://techmaxxed.com/sitemap.xml` and `/robots.txt` are reachable.

## Email activation

Activate or alias these inboxes before public launch:

- `support@techmaxxed.com`
- `privacy@techmaxxed.com`
- `beta@techmaxxed.com`

## Post-update verification

After DNS is live, run a manual pass on desktop and mobile:

- Home page hero and product cards render correctly.
- Product Lineup appears in nav and footer.
- All app pages and privacy pages open.
- Beta form mailto behavior opens with expected content.
- Support mailto links use the correct inbox.
- Security headers are present on the host.
- Sitemap and robots reference the production domain.
- Search Console and Bing Webmaster Tools are connected.
