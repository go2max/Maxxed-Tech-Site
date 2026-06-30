# Admin page template

Use this template for every new admin route.

## Required page pieces

- page title
- short purpose statement
- back link to the nearest parent page
- static empty state or next-action card
- source data pointer when the page is backed by JSON
- `noindex,nofollow` meta tag for HTML pages

## Layout guidance

Keep each page focused on one workflow. When a page needs multiple independent workflows, split it into child routes.

## Static-first rule

New pages should start as static planning views. Only connect live data after the admin access layer and backend authorization are confirmed.

## Minimal route checklist

1. Create `admin/<section>/<route>/index.html`.
2. Add the route to `admin/data/route-backlog.json` or mark it active in a follow-up.
3. Add any static data under `admin/data/`.
4. Link the page from its section index only when it is useful.
