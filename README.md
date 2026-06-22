# Maxxed Technical Systems Website

Production-oriented multi-page company and app catalog for Maxxed Technical
Systems. The public website is ordinary static HTML, CSS, JavaScript, and image
files under `site/`.

## Pages

- Home and searchable app directory
- Dedicated pages for all six active apps
- Roadmap, About, Support, Privacy, and Accessibility
- Custom 404 page
- Sitemap, robots rules, web manifest, and security headers

## Windows, macOS, or Linux

```powershell
npm run check
```

The command uses Node only. Bash and WSL are not required.

## Deployment

Upload the contents of `site/` to any static host. `index.html` must remain at
the root of the uploaded files. The same build also creates a validated Sites
Worker artifact under `dist/`.

Before production launch, confirm that these company-wide values are active:

- Domain: `https://maxxedtechnicalsystems.com`
- Support email: `support@maxxedtechnicalsystems.com`
