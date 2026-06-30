# Maxxed Admin portal architecture

The admin area is a multi-page operations portal. The homepage should stay as an overview, not the only workspace.

## Portal sections

| Section | Purpose | Initial path |
| --- | --- | --- |
| Home | Executive snapshot and quick links | `/admin/` |
| Operations | Uptime, domains, release readiness, and support routing summaries | `/admin/operations/` |
| Support | Contact form routing checks and support intake QA | `/admin/support-verification/` |
| Products | App, plugin, and site launch readiness | `/admin/products/` |
| Testing | APK/AAB intake, test plans, and runner status shells | `/admin/testing-functions/` |
| Billing | Plan, seat, usage, and shutoff planning after secure backend | `/admin/billing/` |
| Customers | Future customer/account management after secure backend | `/admin/customers/` |
| System | Access checks, backend contracts, hosting notes, and security checklist | `/admin/system/` |
| Docs | Internal admin documentation index | `/admin/docs/` |

## Build rules

- Add a new page when a section needs its own workflow.
- Keep the homepage lightweight.
- Keep static pages read-only until the admin access layer is verified.
- Put reusable planning data in `admin/data/`.
- Put implementation notes in `admin/docs/`.
- Put future API contracts in `admin/contracts/`.

## Page template requirements

Every admin page should include:

- `noindex,nofollow`
- link back to dashboard
- short page purpose
- clear empty state or next action
- static-safe content only unless backed by authorized backend data

## Expansion order

1. Product/release pages
2. Support verification pages
3. Domain and uptime pages
4. Testing pages
5. Billing and usage pages after secure backend
6. Customer/account pages after secure backend
