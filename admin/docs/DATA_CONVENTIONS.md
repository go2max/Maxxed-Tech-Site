# Admin data conventions

Static data files under `admin/data/` are used for planning views and manual dashboards.

## File rules

- Use JSON for structured page data.
- Include `version` and `updatedAt` at the top level.
- Prefer arrays of records with stable `id` fields.
- Keep record fields plain and predictable.
- Do not store private user records, payment records, credentials, private links, or raw logs in static files.

## Naming rules

- Use lowercase kebab-case file names.
- Use lowercase kebab-case ids.
- Use readable display names in `label` or `name` fields.

## Page mapping

When a data file powers a page, the page should show the source file path in a small note. This makes future maintenance easier when the portal grows.
