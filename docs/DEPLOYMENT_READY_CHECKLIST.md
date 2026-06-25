# Deployment Ready Checklist

Date: June 25, 2026

## Repository status

The public website source is ready for static deployment from the committed `site/` directory. CI validates the generated static site with `npm run check`.

This pass adds `.github/workflows/pages.yml`, a GitHub Pages deployment workflow that:

- Runs on pushes to `main` and manual workflow dispatch.
- Runs `npm run check` before deployment.
- Uploads the validated `site/` directory as the Pages artifact.
- Deploys with GitHub Pages actions.

## Required GitHub setting

Before the workflow can publish, enable GitHub Pages for the repository and set the source to GitHub Actions.

Suggested path:

1. Open repository Settings.
2. Open Pages.
3. Set Build and deployment source to GitHub Actions.
4. Save.
5. Run the `deploy-pages` workflow manually or merge this workflow and let the next `main` push trigger it.

## DNS and domain

The repository cannot purchase or connect DNS by itself. After Pages is publishing, connect the custom domain:

- `techmaxxed.com`
- `www.techmaxxed.com` if desired

Then verify:

- HTTPS certificate is issued.
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

## Post-deploy verification

After DNS is live, run a manual pass on desktop and mobile:

- Home page hero and product cards render correctly.
- Product Lineup appears in nav and footer.
- All app pages and privacy pages open.
- Beta form mailto behavior opens with expected content.
- Support mailto links use the correct inbox.
- Security headers are present on the host.
- Sitemap and robots reference the production domain.
- Search Console and Bing Webmaster Tools are connected.
