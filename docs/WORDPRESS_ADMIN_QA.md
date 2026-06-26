# WordPress Admin QA Checklist

Use this while testing plugin, theme, and app preview work in the local WordPress harness.

## Before testing

- Docker Desktop is running.
- `npm run wordpress:smoke` passes.
- Admin opens at `http://localhost:8080/wp-admin`.

## Admin areas

Check these after activating a plugin or theme:

- Dashboard
- Posts
- Pages
- Media
- Appearance
- Plugins
- Settings
- Product-specific admin pages

## Failure checks

- No white screen
- No visible runtime warning in admin UI
- No broken navigation
- No missing capability screen for administrator
- Public site still opens

## Finish

Record the artifact, branch, test date, and result in the related launch or product PR.
